import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {hostname} from 'node:os';
import {inventory} from './backup-lib.mjs';
import {preflightPrimaryGraduation} from './primary-graduation-preflight.mjs';
export const graduationTables=['program_duration_references','program_duration_events','graduation_monitoring_cases','graduation_monitoring_events','graduation_commands'];
const digest=v=>createHash('sha256').update(v).digest('hex');
/** The explicit AP5 proof admits only the reviewed synthetic primary. A populated candidate requires a fresh,
 * independently restored encrypted checkpoint bound to its exact inventory. */
export async function preflightGraduationMonitoring(db,proof){
 const [[actual]]=await db.query('SELECT DATABASE() name,@@hostname hostname,@@port port');
 const primary=proof?.authorization==='A6_2_AP5_PRIMARY_20261024';
 if(primary)await preflightPrimaryGraduation(db,proof);
 else assert.match(actual.name,new RegExp(`^ldss_[a-z0-9_]+_test_${process.pid}_[a-f0-9]{8}$`),'F54 accepts only a new PID-owned isolated candidate or the exact reviewed AP5 primary');
 assert.equal(actual.hostname.toLowerCase(),hostname().toLowerCase());
 const [existing]=await db.query('SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
 assert.ok(!existing.some(t=>graduationTables.includes(t.name)),'Partial F54 DDL found: stop for reviewed forward recovery; never blindly rerun');
 const [[count]]=await db.query('SELECT COUNT(*) n FROM scholars');
 if(Number(count.n)>0){
  assert.ok(proof,'Populated F54 requires a fresh verified recovery proof');
  assert.equal(proof.database,actual.name);assert.equal(proof.serverHostname,actual.hostname);assert.equal(proof.port,actual.port);assert.equal(proof.pid,process.pid);assert.equal(proof.authorization,primary?'A6_2_AP5_PRIMARY_20261024':'A6_2_AP1_AP4_ISOLATED');
  assert.equal(proof.temporaryRestoreRemoved,true);assert.equal(proof.verified,true);assert.ok(Date.now()-Date.parse(proof.verifiedAt)<3600000,'Recovery proof expired');
  assert.equal(digest(await readFile(proof.backupFile)),proof.backupSha256);
  const reportBytes=await readFile(proof.restoreReport);assert.equal(digest(reportBytes),proof.restoreReportSha256);const report=JSON.parse(reportBytes);assert.equal(report.verified,true);assert.equal(report.retained,false);assert.equal(report.backupSha256,proof.backupSha256);
  assert.equal(digest(JSON.stringify(await inventory(db))),proof.inventorySha256,'Data changed after backup; take and verify a new checkpoint');
 }
 const [permissions]=await db.query("SELECT code FROM permissions WHERE code IN('program.duration.prepare','program.duration.confirm','graduation.monitoring.record','graduation.monitoring.review')");assert.equal(permissions.length,0,'Unexplained permission seed conflict');
 return {database:actual.name,scholars:Number(count.n),verified:true,populatedRecovery:Number(count.n)>0};
}
