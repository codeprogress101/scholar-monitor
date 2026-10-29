import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {owned,save,folder} from './uat-environment.mjs';
const {db,metadata}=await owned('A');
const before=Number((await db.query('SELECT COUNT(*) n FROM scholars'))[0][0].n);
await db.end();
await assert.rejects(owned('../ldss_scholar_monitor_dev'));
await assert.rejects(owned('Z'));
const run=args=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/uat-environment.mjs',...args],{windowsHide:true,stdio:'ignore'});child.on('error',reject);child.on('exit',resolve);});
assert.equal(await run(['cleanup','A']),1);
assert.equal(await run(['cleanup','A','--confirm-drop=ldss_scholar_monitor_dev']),1);
assert.equal(await run(['create','A']),1);
const after=await owned('A');
try {assert.equal(Number((await after.db.query('SELECT COUNT(*) n FROM scholars'))[0][0].n),before);assert.equal(after.metadata.ownerId,metadata.ownerId);}finally{await after.db.end();}
await save(folder+'/guard-checks.json',{unknownScenarioRejected:true,pathTraversalRejected:true,missingConfirmationRejected:true,developmentNameConfirmationRejected:true,existingManifestCreateRejected:true,ownedSchemaAndScholarCountPreserved:true,destructiveResetExecuted:false});
console.log('PASS UAT ownership and destructive confirmation guards; no reset executed');
