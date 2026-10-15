import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import mysql from 'mysql2/promise';
import { createBackup, restoreBackup, loadKey } from './backup-lib.mjs';

// Explicit SAMPLE historical backfill. Rehearse lifecycles on a restored copy;
// import only NEW rows. Never unlock or overwrite live historical records.
const dir='output/graduate-history', source=process.env.DB_NAME;
assert.equal(source,'ldss_scholar_monitor_dev');
assert.ok(['127.0.0.1','localhost'].includes(process.env.DB_HOST));
await mkdir(dir,{recursive:true});
const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD||'',database:source,dateStrings:true});
const qi=s=>{assert.match(s,/^[a-zA-Z0-9_]+$/);return '`'+s+'`';};
const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');
const read=async(q,p=[]) => (await db.execute(q,p))[0];
let stage;
try {
  assert.equal((await read("SELECT GET_LOCK('ldss_demo_seed',0) AS ok"))[0].ok,1);
  const previous=JSON.parse(await readFile('output/continuing-history/manifest.json','utf8'));
  const cohort=JSON.parse(await readFile('output/sample-cohort-verification.json','utf8'));
  const people=cohort.people.filter(p=>p.group==='Graduate');assert.equal(people.length,5);
  const placeholders=people.map(()=>'?').join(',');
  const graduates=await read(`SELECT s.id,s.middle_name,c.email FROM scholars s JOIN scholar_contacts c ON c.scholar_id=s.id WHERE s.id IN (${placeholders})`,people.map(p=>p.id));
  assert.equal(graduates.length,5);assert.ok(graduates.every(p=>p.middle_name==='Sample Graduate' && /^sample\.student\.\d+@example\.invalid$/.test(p.email)));
  const exists=await read("SELECT id FROM payout_cycles WHERE code='SAMPLE-GRAD-PAY-1'");
  if(exists.length){
    const [paid]=await read("SELECT COUNT(*) AS n,SUM(p.amount) AS total FROM payment_records p JOIN payout_cycles c ON c.id=p.cycle_id WHERE c.code IN ('SAMPLE-GRAD-PAY-1','SAMPLE-GRAD-PAY-2') AND p.outcome='paid'");
    assert.equal(paid.n,10);assert.equal(Number(paid.total),50000);console.log('Graduate history already imported: 10 paid outcomes; no changes.');
  }else{
    const key=await loadKey(),backup=await createBackup(key);
    stage=await restoreBackup(backup.file,key,{keep:true});
    await writeFile(`${dir}/backup.json`,JSON.stringify({backup,stage},null,2));
    const tables=(await read('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=\'BASE TABLE\' ORDER BY TABLE_NAME',[source])).map(r=>r.name);
    const before={};for(const t of tables)before[t]=await read(`SELECT * FROM ${qi(t)}`);
    const manifest={...previous,database:stage.target,complete:false,imported:true,people:people.map(p=>({...p,annual:randomUUID()})),steps:{}};delete manifest.before;
    await writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2));
    // Staging only: reconstruct the synthetic pre-graduation period. The live
    // graduation decisions, calendar locks, and working-year settings stay intact.
    await db.execute(`UPDATE ${qi(stage.target)}.academic_years SET locked_at=NULL,version=1 WHERE id=?`,[previous.year.id]);
    await db.execute(`UPDATE ${qi(stage.target)}.semesters SET locked_at=NULL,version=1 WHERE academic_year_id=?`,[previous.year.id]);
    await db.execute(`UPDATE ${qi(stage.target)}.scholarship_records SET operational_status='active' WHERE scholar_id IN (${placeholders})`,people.map(p=>p.id));
    for(const p of manifest.people)await db.execute(`INSERT INTO ${qi(stage.target)}.scholarship_records(id,scholar_id,academic_year_id,status,version,last_effective_on,created_at,updated_at) VALUES(?,?,?,'selected',1,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[p.annual,p.id,previous.year.id,previous.year.start]);
    let script=await readFile('scripts/seed-continuing-history.mjs','utf8');
    script=script.replaceAll('"../server/','"../../server/').replace('"./backup-lib.mjs"','"../../scripts/backup-lib.mjs"')
      .replace('dir = "output/continuing-history"','dir = "output/graduate-history"')
      .replace('assert.equal(config.DB_NAME, "ldss_scholar_monitor_dev");','assert.match(config.DB_NAME, /^ldss_restore_[a-zA-Z0-9_]+$/);')
      .replace('p.group === "Continuing"','p.group === "Graduate"').replace('people.length, 20','people.length, 5')
      .replaceAll('"Sample Continuing"','"Sample Graduate"').replace("'Fourth year':'Third year'","'Fourth year':'Fourth year'")
      .replaceAll('ldss_demo_seed','ldss_graduate_stage').replaceAll('SAMPLE-HIST-','SAMPLE-GRAD-').replaceAll('SAMPLE-HISTORY-','SAMPLE-GRAD-HISTORY-')
      .replaceAll('SAMPLE Historical Continuing Scholars','SAMPLE Historical Graduate Scholars')
      .replaceAll("middle_name='Sample Continuing'", "middle_name='Sample Graduate'")
      .replaceAll('paid.n,40','paid.n,10').replaceAll('Number(paid.amount),200000','Number(paid.amount),50000');
    await writeFile(`${dir}/stage.mjs`,script);
    const run=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs',`${dir}/stage.mjs`],{encoding:'utf8',env:{...process.env,DB_NAME:stage.target,DB_USER:'root',DB_PASSWORD:process.env.LDSS_SETUP_ADMIN_PASSWORD||''}});
    await writeFile(`${dir}/stage.log`,run.stdout+run.stderr);assert.equal(run.status,0,run.stderr);
    const primary=await read("SELECT TABLE_NAME AS t,COLUMN_NAME AS c FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND CONSTRAINT_NAME='PRIMARY' ORDER BY ORDINAL_POSITION",[source]);
    const keys=t=>primary.filter(r=>r.t===t).map(r=>r.c),pk=(r,cols)=>JSON.stringify(cols.map(c=>r[c]));
    const additions={};
    const allowed=/^(academic_records|academic_commands|scholarship_records|masterlist_.*|requirement_.*|payout_.*|ovr_.*|payment_records|audit_logs)$/;
    for(const t of tables){
      if(!allowed.test(t))continue;
      const cols=keys(t);assert.ok(cols.length,t);
      const existing=new Set(before[t].map(r=>pk(r,cols)));
      const rows=(await read(`SELECT * FROM ${qi(stage.target)}.${qi(t)}`)).filter(r=>!existing.has(pk(r,cols)));
      if(rows.length)additions[t]=rows;
    }
    assert.equal(additions.payment_records.length,10);assert.equal(additions.academic_records.length,5);assert.equal(additions.scholarship_records.length,5);
    assert.ok(additions.scholarship_records.every(r=>people.some(p=>p.id===r.scholar_id)&&r.academic_year_id===previous.year.id));
    const fks=await read('SELECT TABLE_NAME AS t,REFERENCED_TABLE_NAME AS parent FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL',[source]);
    const order=[],pending=new Set(Object.keys(additions));
    while(pending.size){const ready=[...pending].filter(t=>!fks.some(f=>f.t===t&&f.parent!==t&&pending.has(f.parent)));assert.ok(ready.length,'Cyclic import dependencies require review');for(const t of ready){order.push(t);pending.delete(t);}}
    await writeFile(`${dir}/import-plan.json`,JSON.stringify({synthetic:true,year:previous.year.code,counts:Object.fromEntries(Object.entries(additions).map(([t,r])=>[t,r.length])),order},null,2));
    await db.beginTransaction();
    try{
      await db.query('SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE');
      for(const t of tables)if(!/^(sessions|password_reset_tokens|auth_rate_limits|users|audit_logs)$/.test(t))assert.equal(hash(await read(`SELECT * FROM ${qi(t)}`)),hash(before[t]),`Concurrent changes to ${t}; rerun from fresh backup`);
      for(const t of order)for(const row of additions[t]){
        const insert={...row};if(t==='masterlist_versions')insert.status='draft';
        const cols=Object.keys(insert);
        await db.execute(`INSERT INTO ${qi(t)} (${cols.map(qi).join(',')}) VALUES (${cols.map(()=>'?').join(',')})`,cols.map(c=>insert[c]));
      }
      for(const row of additions.masterlist_versions)await db.execute('UPDATE masterlist_versions SET status=? WHERE id=?',[row.status,row.id]);
      // Prove every pre-existing business row is untouched, including the locks,
      // earlier paid payrolls and the five current graduation corrections.
      for(const t of tables){
        if(/^(sessions|password_reset_tokens|auth_rate_limits|users|audit_logs)$/.test(t))continue;
        const cols=keys(t),existing=new Set(before[t].map(r=>pk(r,cols)));
        const retained=(await read(`SELECT * FROM ${qi(t)}`)).filter(r=>existing.has(pk(r,cols)));
        assert.equal(hash(retained),hash(before[t]),`Existing ${t} rows changed`);
      }
      const actor=await read("SELECT id FROM users WHERE email='payroll-demo-system_admin@example.invalid'");
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'sample.graduate-history.import','academic_year',?,'create',?,'user',UTC_TIMESTAMP(6),?,'SAMPLE historical backfill; no real money released',?)",[randomUUID(),previous.year.id,actor[0].id,randomUUID(),JSON.stringify({synthetic:true,scholars:people.map(p=>p.id),paidOutcomes:10,totalPesos:50000,existingRecordsUnchanged:true,stagedRestore:stage.target})]);
      await db.commit();
    }catch(e){await db.rollback();throw e;}
    await writeFile(`${dir}/verification.json`,JSON.stringify({passed:true,synthetic:true,year:previous.year.code,graduates:5,academicRecords:5,yearLevel:'Fourth year',payrolls:2,paidOutcomes:10,totalPesos:50000,existingRecordsUnchanged:true,graduatesRemainArchived:true,recordedPaymentDate:manifest.day},null,2));
    console.log('PASS: 5 sample graduates; prior academic records, 2 closed payrolls, 10 paid stipends. Existing rows preserved.');
  }
}finally{
  if(stage){assert.match(stage.target,/^ldss_restore_[a-zA-Z0-9_]+$/);const report=JSON.parse(await readFile(stage.reportFile,'utf8'));assert.match(report.definerAccount,/^ldss_r_[a-f0-9]+$/);await db.query(`DROP DATABASE ${qi(stage.target)}`);await db.query('DROP USER ?@\'localhost\'',[report.definerAccount]);}
  await db.query("SELECT RELEASE_LOCK('ldss_demo_seed')");await db.end();
}
