import {preflightPrimaryImportBindings} from './primary-import-intake-preflight.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {hostname} from 'node:os';
import {inventory} from './backup-lib.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
export async function preflightImportBindings(db,proof){
 const [[actual]]=await db.query('SELECT DATABASE() name,@@hostname hostname,@@port port');
 const primary=proof?.authorization==='A2_1_AP1_PRIMARY_20261025';
 if(primary)await preflightPrimaryImportBindings(db,proof);
 else assert.match(actual.name,new RegExp(`^ldss_[a-z0-9_]+_test_${process.pid}_[a-f0-9]{8}$`),'F55 accepts only a new PID-owned isolated schema; primary promotion needs separate authorization');
 assert.equal(actual.hostname.toLowerCase(),hostname().toLowerCase());
 const [partial]=await db.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='import_intake_bindings'");assert.equal(partial.length,0,'Partial F55 found: stop for reviewed forward recovery');
 const [[count]]=await db.query('SELECT COUNT(*) n FROM scholars');
 if(Number(count.n)){
  assert.ok(proof,'Populated F55 requires a fresh verified recovery checkpoint');
  for(const [key,value] of Object.entries({database:actual.name,serverHostname:actual.hostname,port:actual.port,pid:process.pid,authorization:primary?'A2_1_AP1_PRIMARY_20261025':'A2_1_ISOLATED_20261025',verified:true,temporaryRestoreRemoved:true}))assert.equal(proof[key],value);
  assert.ok(Date.now()-Date.parse(proof.verifiedAt)>=0&&Date.now()-Date.parse(proof.verifiedAt)<3600000,'Recovery proof expired');
  assert.equal(hash(await readFile(proof.backupFile)),proof.backupSha256);
  const bytes=await readFile(proof.restoreReport);assert.equal(hash(bytes),proof.restoreReportSha256);const report=JSON.parse(bytes);assert.equal(report.verified,true);assert.equal(report.retained,false);assert.equal(report.backupSha256,proof.backupSha256);
  assert.equal(hash(JSON.stringify(await inventory(db))),proof.inventorySha256,'Data changed since verified backup');
 }
 return {database:actual.name,scholars:Number(count.n),verified:true};
}
