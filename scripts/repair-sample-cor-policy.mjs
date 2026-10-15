import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { loadConfig } from '../server/config.js';
import { AuthorizationService } from '../server/authorization/service.js';
import { RequirementService } from '../server/requirements/service.js';
import { createBackup, restoreBackup, loadKey } from './backup-lib.mjs';

// Narrow local SAMPLE repair, rehearsed first. No general permission to rewrite
// open policies: finalized cycles, real scholars and unexpected data are refused.
const config=loadConfig(process.env),dir='output/workflow-repair';
assert.equal(config.APP_ENV,'development');assert.equal(config.DB_NAME,'ldss_scholar_monitor_dev');assert.ok(['127.0.0.1','localhost'].includes(config.DB_HOST));
await mkdir(dir,{recursive:true});
const options={host:config.DB_HOST,port:config.DB_PORT,user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD||'',timezone:'Z'};
const digest=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');
async function repair(database) {
  const pool=mysql.createPool({...options,database}),db=await pool.getConnection();
  const query=async(sql,p=[]) => (await db.execute(sql,p))[0];
  try {
    const [cycle]=await query("SELECT c.id,c.semester_id,v.*,DATE_FORMAT(v.target_date,'%Y-%m-%d') AS day FROM payout_cycles c JOIN payout_cycle_versions v ON v.cycle_id=c.id WHERE c.code='AY2026-2027-1ST-PAYOUT' ORDER BY v.version DESC LIMIT 1");assert.ok(cycle);const cycleId=cycle.cycle_id;
    const requirements=await query('SELECT p.*,d.code FROM payout_requirements p JOIN requirement_definition_versions v ON v.id=p.definition_version_id JOIN requirement_definitions d ON d.id=v.definition_id WHERE p.cycle_version_id=?',[cycle.id]);
    if(requirements.some(r=>r.code==='COR'))return {alreadyRepaired:true};
    assert.equal(cycle.state,'open');assert.equal(requirements.length,1);assert.equal(requirements[0].code,'COG');
    const [finalized]=await query('SELECT COUNT(*) AS n FROM ovr_finalizations f JOIN ovr_batches b ON b.id=f.batch_id WHERE b.cycle_id=?',[cycleId]);assert.equal(finalized.n,0,'A finalized payroll requires a formal policy amendment, not this sample repair');
    const owners=await query('SELECT s.middle_name,c.id FROM requirement_checklists c JOIN scholarship_records r ON r.id=c.scholarship_record_id JOIN scholars s ON s.id=r.scholar_id WHERE c.payout_cycle_id=?',[cycleId]);assert.ok(owners.length);assert.ok(owners.every(r=>/^Sample (New|Continuing|Graduate)$/.test(r.middle_name)));
    const [actor]=await query("SELECT id,full_name FROM users WHERE email='payroll-demo-system_admin@example.invalid'");
    const before={receipts:digest(await query('SELECT * FROM requirement_receipts')),decisions:digest(await query('SELECT * FROM requirement_workflow_events')),payments:digest(await query('SELECT * FROM payment_records'))};
    const existing=await query("SELECT v.id FROM requirement_definitions d JOIN requirement_definition_versions v ON v.definition_id=d.id WHERE d.code='COR' ORDER BY v.revision DESC LIMIT 1");
    const cor=existing[0] ?? await new RequirementService(new AuthorizationService(pool)).command(actor.id,undefined,randomUUID(),{action:'create',code:'COR',expectedVersion:0,fields:{name:'Certificate of Registration',instructions:'Receive and verify the current semester enrollment document separately from the COG.',appliesTo:'payout',semesterId:cycle.semester_id,effectiveFrom:cycle.day,effectiveUntil:null},reason:'Correct incomplete SAMPLE payout document setup',reference:'SAMPLE-COR-REPAIR-20261008'},randomUUID());
    await db.beginTransaction();
    try{
      await db.query('SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE');
      const [latest]=await query('SELECT id FROM payout_cycle_versions WHERE cycle_id=? ORDER BY version DESC LIMIT 1 FOR UPDATE',[cycleId]);assert.equal(latest.id,cycle.id,'Policy changed during rehearsal');
      const [frozen]=await query('SELECT COUNT(*) AS n FROM ovr_finalizations f JOIN ovr_batches b ON b.id=f.batch_id WHERE b.cycle_id=?',[cycleId]);assert.equal(frozen.n,0);
      const versionId=randomUUID();
      await db.execute("INSERT INTO payout_cycle_versions(id,cycle_id,version,name,target_date,state,action,reason,reference_text,actor_id,actor_name,recorded_at) VALUES(?,?,?,?,?,'open','open',?,?,?,?,UTC_TIMESTAMP(6))",[versionId,cycleId,cycle.version+1,cycle.name,cycle.day,'Reissued SAMPLE open-cycle policy to include missing COR; existing COG receipt and verification preserved','SAMPLE-COR-REPAIR-20261008',actor.id,actor.full_name]);
      await db.execute('INSERT INTO payout_requirements(cycle_version_id,definition_version_id,allow_waiver) VALUES(?,?,?),(?,?,0)',[versionId,requirements[0].definition_version_id,requirements[0].allow_waiver,versionId,cor.id]);
      for(const owner of owners){
        await db.execute('UPDATE requirement_checklists SET payout_version_id=? WHERE id=? AND payout_version_id=?',[versionId,owner.id,cycle.id]);
        await db.execute("INSERT INTO requirement_instances(id,checklist_id,definition_version_id,status,created_at) VALUES(?,?,?,'not_submitted',UTC_TIMESTAMP(6))",[randomUUID(),owner.id,cor.id]);
      }
      const evidence={synthetic:true,cycleId,oldVersion:cycle.id,newVersion:versionId,checklists:owners.map(r=>r.id),addedDefinition:cor.id,existingEvidencePreserved:true};
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'sample.payout-policy.repair','payout_cycle',?,'reissue',?,'user',UTC_TIMESTAMP(6),?,'Add omitted COR to SAMPLE period without repeating COG receiving or verification',?)",[randomUUID(),cycleId,actor.id,randomUUID(),JSON.stringify(evidence)]);
      assert.equal(digest(await query('SELECT * FROM requirement_receipts')),before.receipts);assert.equal(digest(await query('SELECT * FROM requirement_workflow_events')),before.decisions);assert.equal(digest(await query('SELECT * FROM payment_records')),before.payments);
      await db.commit();return {...evidence,addedCorRecords:owners.length};
    }catch(e){await db.rollback();throw e;}
  }finally{db.release();await pool.end();}
}
const key=await loadKey(),backup=await createBackup(key),stage=await restoreBackup(backup.file,key,{keep:true});
try{
  const rehearsal=await repair(stage.target);await writeFile(`${dir}/cor-rehearsal.json`,JSON.stringify({backup,stage,rehearsal},null,2));
  const applied=await repair(config.DB_NAME);await writeFile(`${dir}/cor-applied.json`,JSON.stringify(applied,null,2));console.log(JSON.stringify(applied));
}finally{
  assert.match(stage.target,/^ldss_restore_[a-zA-Z0-9_]+$/);const report=JSON.parse(await readFile(stage.reportFile,'utf8'));assert.match(report.definerAccount,/^ldss_r_[a-f0-9]+$/);
  const db=await mysql.createConnection(options);try{await db.query('DROP DATABASE `'+stage.target+'`');await db.query("DROP USER ?@'localhost'",[report.definerAccount]);}finally{await db.end();}
}
