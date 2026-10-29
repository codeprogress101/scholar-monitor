import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {hostname} from 'node:os';
import {inventory} from './backup-lib.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
export async function intakeTextGrants(db,user){
 const result={};for(const view of ['USER_PRIVILEGES','SCHEMA_PRIVILEGES','TABLE_PRIVILEGES','COLUMN_PRIVILEGES'])result[view]=(await db.query(`SELECT * FROM information_schema.${view} WHERE GRANTEE=?`,["'"+user+"'@'localhost'"]))[0].map(r=>JSON.stringify(r)).sort();return result;
}
export async function preflightIntakeText(db,proof){
 const [[actual]]=await db.query('SELECT DATABASE() name,@@hostname hostname,@@port port');
 assert.ok(!actual.name.startsWith('ldss_primary_'),'Primary promotion requires separate exact-target authorization and adapter');assert.equal(actual.hostname.toLowerCase(),hostname().toLowerCase());assert.equal(Number(actual.port),3306);
 const own=new RegExp(`^ldss_[a-z0-9_]+_test_${process.pid}_[a-f0-9]{8}$`);
 const [[count]]=await db.query('SELECT COUNT(*) n FROM scholars');
 if(!Number(count.n))assert.match(actual.name,own,'F56 accepts only a new PID-owned synthetic schema');
 else {
  assert.match(actual.name,/^ldss_intake_text_test_[0-9]+_[a-f0-9]{8}$/,'F56 rejects retained/primary targets');
  assert.ok(proof,'Populated F56 requires fresh verified recovery and explicit owned-copy handoff');
  for(const [k,v] of Object.entries({database:actual.name,serverHostname:actual.hostname,port:actual.port,pid:process.pid,authorization:'B2_2_ISOLATED_20261025',verified:true,temporaryRestoreRemoved:true}))assert.equal(proof[k],v);
  const manifestBytes=await readFile(proof.ownershipFile),manifest=JSON.parse(manifestBytes);assert.equal(hash(manifestBytes),proof.ownershipSha256);assert.equal(manifest.database,actual.name);assert.equal(manifest.pid,Number(actual.name.match(/_test_([0-9]+)_/)[1]));assert.equal(manifest.source,'ldss_primary_test_12676_61497616');assert.equal(manifest.candidate,'C:/xampp/htdocs/ldss_b22_candidate_20261025');assert.equal(manifest.port,3020);assert.equal(manifest.state,'copied');assert.equal(manifest.runtimeUser,'ldss_it_'+actual.name.split('_test_')[1]);
  const [[principal]]=await db.query("SELECT COUNT(*) n FROM mysql.user WHERE User=? AND Host='localhost'",[manifest.runtimeUser]);assert.equal(Number(principal.n),1,'Owned runtime identity missing');const grants=await intakeTextGrants(db,manifest.runtimeUser);assert.ok(grants.TABLE_PRIVILEGES.length,'Owned runtime table grants missing');assert.equal(hash(JSON.stringify(grants)),proof.grantsSha256,'Runtime grants changed since checkpoint');assert.equal(grants.SCHEMA_PRIVILEGES.length,0);for(const value of grants.USER_PRIVILEGES){const row=JSON.parse(value);assert.equal(row.PRIVILEGE_TYPE,'USAGE');assert.equal(row.IS_GRANTABLE,'NO');}for(const view of ['TABLE_PRIVILEGES','COLUMN_PRIVILEGES'])for(const value of grants[view]){const row=JSON.parse(value);assert.equal(row.TABLE_SCHEMA,actual.name);assert.equal(row.IS_GRANTABLE,'NO');}
  assert.ok(Date.now()-Date.parse(proof.verifiedAt)>=0&&Date.now()-Date.parse(proof.verifiedAt)<3600000,'Recovery proof expired');
  assert.equal(hash(await readFile(proof.backupFile)),proof.backupSha256);const bytes=await readFile(proof.restoreReport);assert.equal(hash(bytes),proof.restoreReportSha256);const report=JSON.parse(bytes);assert.equal(report.verified,true);assert.equal(report.retained,false);assert.equal(report.backupSha256,proof.backupSha256);assert.equal(hash(JSON.stringify(await inventory(db))),proof.inventorySha256);
 }
 const [partial]=await db.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='scholar_intake_text_events'");assert.equal(partial.length,0,'Partial F56 found: stop for reviewed forward recovery');
 const [[column]]=await db.query("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='annual_intake_commands' AND COLUMN_NAME='operation'");assert.ok(column&&!column.COLUMN_TYPE.includes('record_supplied_text'),'Partial receipt DDL: stop');
 const [[permission]]=await db.query("SELECT label FROM permissions WHERE code='scholars.intakes.correct'");assert.equal(permission.label,'Correct supplied annual intake classification','Unexpected permission metadata: stop');
 return {database:actual.name,verified:true};
}
