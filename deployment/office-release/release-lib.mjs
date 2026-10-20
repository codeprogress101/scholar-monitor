import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdir, readFile} from 'node:fs/promises';
import {isAbsolute, relative, resolve} from 'node:path';

export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const expectedPending = [
  '20261013010000_f39_masterlist_additions.sql',
  '20261013020000_f40_masterlist_consolidation.sql',
  '20261014010000_f41_shared_semester_documents.sql',
  '20261014020000_f42_entrant_grading_cards.sql',
  '20261014030000_f43_policy_consistency.sql',
];
export const coursePendingMigration='20261020010000_f44_course_pending_import.sql';
export const priorBatchMigration='20261020020000_f45_prior_batch_approval.sql';
export function inside(root, path) {
  const part = relative(resolve(root), resolve(path));
  return part !== '' && part !== '..' && !part.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) && !isAbsolute(part);
}
export async function filesIn(folder, prefix = '') {
  const result = [];
  for (const item of await readdir(folder, {withFileTypes:true})) {
    assert(!item.isSymbolicLink(), 'Symlink in frozen artifact');
    const name = prefix + item.name;
    if (item.isDirectory()) result.push(...await filesIn(resolve(folder,item.name),name+'/'));
    else if (item.isFile()) result.push(name);
  }
  return result.sort();
}
export async function fingerprint(folder, names) {
  const result=[];
  for(let offset=0;offset<names.length;offset+=24) {
    result.push(...await Promise.all(names.slice(offset,offset+24).map(async path => ({path,sha256:sha(await readFile(resolve(folder,path)))}))));
  }
  return result;
}
export function assertMigrationHistory(applied, candidate) {
  assert([53,54,55].includes(candidate.length),'Unexpected candidate migration count');
  for (const row of applied) assert.equal(candidate.find(x=>x.version===row.version)?.checksum,row.checksum,'Migration history mismatch');
  const pending=candidate.filter(x=>!applied.some(a=>a.version===x.version)).map(x=>x.version);
  if(candidate.length===55) {
    assert([54,55].includes(applied.length),'Prior-batch release requires the installed 54-migration baseline');
    assert.deepEqual(pending,applied.length===55?[]:[priorBatchMigration],'Unexpected prior-batch migration set');
  } else if(candidate.length===54) {
    assert([53,54].includes(applied.length),'Course-pending release requires the installed 53-migration baseline');
    assert.deepEqual(pending,applied.length===54?[]:[coursePendingMigration],'Unexpected course-pending migration set');
  } else {
    assert.deepEqual(pending.length ? pending : [],applied.length===53 ? [] : expectedPending,'Unexpected pending migration set');
    assert([48,53].includes(applied.length),'Unexpected installed schema');
  }
  return pending;
}
export function assertLaunch(launch, manifestHash, now = Date.now()) {
  for(const key of ['coordinator','technicalOwner','pilotStaff']) assert(typeof launch[key]==='string' && launch[key].trim().length>=3 && !/PENDING|REPLACE/i.test(launch[key]),'Named operators required');
  assert(Array.isArray(launch.clientPCs)&&launch.clientPCs.length>=2&&new Set(launch.clientPCs).size===launch.clientPCs.length&&launch.clientPCs.every(x=>typeof x==='string'&&x.trim()&&!/PENDING|REPLACE/i.test(x)),'Two named client PCs required');
  assert.equal(launch.manifestSha256,manifestHash,'Approval belongs to another artifact');
  assert.equal(launch.maintenanceApproved,true,'Maintenance approval required');
  const start=Date.parse(launch.windowStart),end=Date.parse(launch.windowEnd);
  assert(Number.isFinite(start)&&Number.isFinite(end)&&end>start&&end-start<=2*3600000,'Maximum two-hour maintenance window');
  assert(now>=start&&now<end,'Outside approved maintenance window');
  // Philippine time; daytime work requires an explicit exception and sign-out evidence.
  const hour=new Date(start+8*3600000).getUTCHours();
  if(!(hour>=17||hour<8)) {
    assert.equal(launch.allowDaytimeMaintenance,true,'Explicit daytime maintenance approval required');
    assert.equal(launch.usersSignedOutConfirmed,true,'All LAN users must be signed out');
    assert(typeof launch.daytimeApprovalReference==='string'&&launch.daytimeApprovalReference.trim().length>=12&&!/PENDING|REPLACE/i.test(launch.daytimeApprovalReference),'Daytime approval evidence required');
  }
  assert.equal(launch.keepLANData,true,'LAN data remains authoritative');
}
export function backupHealth(status, proof, now=Date.now()) {
  const age=value=>Number.isFinite(Date.parse(value)) ? Math.max(0,now-Date.parse(value)) : Infinity;
  const localAge=age(status?.lastBackup);
  const validProof=proof?.sha256?.match(/^[a-f0-9]{64}$/)&&proof?.confirmedBy?.trim()&&proof?.offHostLocation?.trim()&&Number.isFinite(Date.parse(proof?.confirmedAt))&&Date.parse(proof.confirmedAt)<=now&&Date.parse(proof.confirmedAt)>=Date.parse(proof.backupCreatedAt);
  const remoteAge=age(validProof ? proof.backupCreatedAt : null);
  return {localAgeMinutes:Number.isFinite(localAge)?Math.round(localAge/60000):null,offHostAgeMinutes:Number.isFinite(remoteAge)?Math.round(remoteAge/60000):null,
    warning:localAge>=3*3600000||remoteAge>=3*3600000||!!status?.error,
    breached:localAge>=4*3600000||remoteAge>=4*3600000||!!status?.error,
    offHostDelivery:validProof?'operator-recorded; independently verify destination':'unverified'};
}
