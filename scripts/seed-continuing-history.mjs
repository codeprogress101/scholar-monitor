import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import mysql from "mysql2/promise";
import { createBackup, restoreBackup, loadKey } from "./backup-lib.mjs";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { createDatabase } from "../server/database.js";
import { AuthService } from "../server/auth/service.js";
import { today } from "../server/scholars/validation.js";

// User-requested synthetic history only. Never import arbitrary students or
// change the working calendar. API lifecycle dates truthfully reflect seeding;
// semester coverage is historical. No fake real-world payment dates are inferred.
const config = loadConfig(process.env), dir = "output/continuing-history", file = `${dir}/manifest.json`;
assert.equal(config.APP_ENV, "development"); assert.equal(config.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["localhost", "127.0.0.1"].includes(config.DB_HOST));
await mkdir(dir, { recursive: true });
const db = mysql.createPool({ host: config.DB_HOST, port: config.DB_PORT, user: "root", password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "", database: config.DB_NAME, timezone: "Z", connectionLimit: 2 });
const lock = await db.getConnection(); let app;
const row = async (sql, values = []) => (await db.execute(sql, values))[0][0];
const evidence = { reason: "SAMPLE historical stipend simulation; no real money released", reference: "SAMPLE-HISTORY-2025" };
try {
  assert.equal((await lock.query("SELECT GET_LOCK('ldss_demo_seed',0) AS ok"))[0][0].ok, 1);
  const cohort = JSON.parse(await readFile("output/sample-cohort-verification.json", "utf8"));
  const people = cohort.people.filter(p => p.group === "Continuing"); assert.equal(people.length, 20);
  const working = await row("SELECT y.id,y.code,DATE_FORMAT(y.starts_on,'%Y-%m-%d') AS starts FROM academic_years y JOIN system_settings s ON s.setting_value=y.id WHERE s.code='LDSS_WORKING_ACADEMIC_YEAR'");
  assert.equal(working.code, "AY2026-2027");
  for (const p of people) {
    const s = await row("SELECT s.middle_name,c.email FROM scholars s JOIN scholar_contacts c ON c.scholar_id=s.id WHERE s.id=?", [p.id]);
    assert.equal(s.middle_name, "Sample Continuing"); assert.match(s.email, /^sample\.student\.\d+@example\.invalid$/);
  }
  let manifest;
  try { manifest = JSON.parse(await readFile(file, "utf8")); } catch (e) { if (e.code !== "ENOENT") throw e; }
  const persist = async () => { await writeFile(file + ".tmp", JSON.stringify(manifest, null, 2)); await rename(file + ".tmp", file); };
  if (!manifest) {
    assert.equal((await db.query("SELECT id FROM academic_years WHERE code='AY2025-2026'"))[0].length, 0, "Historical year already exists; review before adding sample data");
    const key = await loadKey(), backup = await createBackup(key), restore = await restoreBackup(backup.file, key);
    await writeFile(`${dir}/backup.json`, JSON.stringify({ backup, restore }, null, 2));
    const end = new Date(Date.parse(working.starts + "T00:00:00Z") - 86400000).toISOString().slice(0,10);
    const start = `${Number(working.starts.slice(0,4))-1}${working.starts.slice(4)}`;
    const split = new Date((Date.parse(start+"T00:00:00Z") + Date.parse(end+"T00:00:00Z"))/2).toISOString().slice(0,10);
    const next = new Date(Date.parse(split+"T00:00:00Z")+86400000).toISOString().slice(0,10);
    manifest = { database: config.DB_NAME, day: today(), complete: false, year: { id: randomUUID(), code: "AY2025-2026", start, end }, terms: [{ id: randomUUID(), code: "SAMPLE-2025-1", start, end: split },{ id: randomUUID(), code: "SAMPLE-2025-2", start: next, end }], people: people.map(p => ({ ...p, annual: randomUUID() })), steps: {} };
    await persist();
  }
  assert.equal(manifest.database, config.DB_NAME);
  assert.deepEqual(manifest.people.map(p=>p.id).sort(), people.map(p=>p.id).sort());
  if (manifest.complete) {
    const paid = await row("SELECT COUNT(*) AS n,SUM(p.amount) AS amount FROM payment_records p JOIN scholarship_records r ON r.id=p.scholarship_id WHERE r.academic_year_id=? AND p.outcome='paid' AND r.scholar_id IN (SELECT id FROM scholars WHERE middle_name='Sample Continuing')", [manifest.year.id]);
    assert.equal(paid.n,40);assert.equal(Number(paid.amount),200000);
    console.log("Existing sample history verified: 20 continuing scholars, 40 paid semester stipends; no changes.");
  } else {
    app = buildApp({ ...config, LOG_LEVEL: "silent" }, { database: createDatabase(config) });
    const auth = new AuthService(db), sessions = new Map(), actors = new Map();
    const origin = config.APP_ORIGIN ?? "http://127.0.0.1:5173";
    for (const role of ["system_admin", "staff", "coordinator"]) {
      const email = `payroll-demo-${role}@example.invalid`, found = await row("SELECT id,disabled_at FROM users WHERE email=?", [email]);
      assert.ok(found && !found.disabled_at, "Only existing synthetic actors may be used"); actors.set(role, found.id);
      const token = await auth.issueReset(email, "sample-history", evidence.reason), password = randomBytes(32).toString("base64url") + "Aa1!";
      await auth.resetPassword(token, password, "127.0.0.1", randomUUID());
      const r = await app.inject({ method: "POST", url: "/api/v1/auth/login", headers: { origin }, payload: { email, password } });
      assert.equal(r.statusCode,200); sessions.set(role, { cookie: String(r.headers["set-cookie"]).split(";")[0], csrf:r.json().csrfToken });
    }
    const read = async (url) => { const r = await app.inject({ method:"GET",url,headers:{origin,cookie:sessions.get("staff").cookie} });assert.equal(r.statusCode,200,r.body);return r.json(); };
    const command = async (name, role, url, body) => {
      const step = manifest.steps[name] ??= { key:randomUUID(), role,url,body };assert.equal(step.url,url);assert.equal(step.role,role);
      if(step.result!==undefined)return step.result;
      await persist();const s=sessions.get(role),r=await app.inject({method:"POST",url,payload:step.body,headers:{origin,cookie:s.cookie,"x-csrf-token":s.csrf,"idempotency-key":step.key}});
      assert.equal(r.statusCode,200,`${name}: ${r.body}`);step.result=r.json();await persist();return step.result;
    };
    const digest = rows => createHash("sha256").update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest("hex");
    async function currentEvidence() {
      const result={};
      for(const [name,sql] of Object.entries({
        scholars:"SELECT * FROM scholars", contacts:"SELECT * FROM scholar_contacts", year:"SELECT * FROM academic_years WHERE id=?", settings:"SELECT * FROM system_settings",
        annuals:"SELECT * FROM scholarship_records WHERE academic_year_id=?", academics:"SELECT * FROM academic_records WHERE academic_year_id=?",
        receipts:"SELECT x.* FROM requirement_receipts x JOIN requirement_instances i ON i.id=x.instance_id JOIN requirement_checklists c ON c.id=i.checklist_id JOIN semesters s ON s.id=c.semester_id WHERE s.academic_year_id=?",
        decisions:"SELECT x.* FROM requirement_workflow_events x JOIN requirement_instances i ON i.id=x.instance_id JOIN requirement_checklists c ON c.id=i.checklist_id JOIN semesters s ON s.id=c.semester_id WHERE s.academic_year_id=?"
      }))result[name]=digest((await db.execute(sql,sql.includes('?')?[working.id]:[]))[0]);
      return result;
    }
    if(!manifest.before){manifest.before=await currentEvidence();await persist();}
    if(!manifest.imported){
      await lock.beginTransaction();
      try {
        await lock.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
        const existing=(await lock.execute("SELECT id FROM academic_years WHERE id=?",[manifest.year.id]))[0];
        if(!existing.length){
          await lock.execute("INSERT INTO academic_years(id,code,name,starts_on,ends_on,created_at,updated_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[manifest.year.id,manifest.year.code,"SAMPLE Historical Academic Year 2025–2026",manifest.year.start,manifest.year.end]);
          for(const [i,t] of manifest.terms.entries())await lock.execute("INSERT INTO semesters(id,code,name,academic_year_id,starts_on,ends_on,created_at,updated_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[t.id,t.code,`SAMPLE ${i+1===1?'1st':'2nd'} Semester AY2025–2026`,manifest.year.id,t.start,t.end]);
          for(const p of manifest.people){
            const [[participation]]=await lock.execute("SELECT id FROM participations WHERE scholar_id=? AND entry_basis='continuing_baseline'",[p.id]);assert.ok(participation);
            await lock.execute("INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,version,last_effective_on,continuing_participation_id,created_at,updated_at) VALUES(?,?,?,'continuing',1,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[p.annual,p.id,manifest.year.id,manifest.year.start,participation.id]);
          }
          await lock.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'sample.history.import','academic_year',?,'create',?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),manifest.year.id,actors.get('system_admin'),randomUUID(),evidence.reason,JSON.stringify({synthetic:true,scope:'historical year, two semesters and accepted continuing annual records only',scholars:manifest.people.map(p=>p.id),workingYearUnchanged:working.id})]);
        }
        await lock.commit();manifest.imported=true;await persist();
      }catch(e){await lock.rollback();throw e;}
    }
    for(const [i,p] of manifest.people.entries()){
      const current=await row("SELECT school_id,course_id,year_level FROM academic_records WHERE scholar_id=? AND academic_year_id=?",[p.id,working.id]);assert.ok(current);
      const levels={'Second year':'First year','Third year':'Second year','Fourth year':'Third year'};
      assert.ok(levels[current.year_level], 'Unexpected sample year level; review manually');
      await command(`academic-${i}`,'staff',`/api/v1/scholars/${p.id}/academic-records`,{academicYearId:manifest.year.id,schoolId:current.school_id,courseId:current.course_id,yearLevel:levels[current.year_level],...evidence});
    }
    let master=await command('master','staff','/api/v1/masterlists',{academicYearId:manifest.year.id,title:'SAMPLE Historical Continuing Scholars AY2025–2026',...evidence});
    for(const [i,p] of manifest.people.entries())master=await command(`member-${i}`,'staff',`/api/v1/masterlists/${master.id}/entries`,{action:'add',expectedVersion:master.version,scholarId:p.id,awardNumber:null,...evidence});
    for(const [action,role] of [['submit-verification','staff'],['submit-approval','staff'],['approve','coordinator'],['publish','coordinator'],['lock','coordinator']])master=await command('master-'+action,role,`/api/v1/masterlists/${master.id}/${action}`,{expectedVersion:master.version,...evidence,...(action==='publish'?{effectiveOn:manifest.year.start}:{})});
    for(const [n,t] of manifest.terms.entries()){
      if(manifest.steps[`term-${n}-lock`]?.result!==undefined)continue;
      const definitions=[];
      for(const code of ['COR','COG'])definitions.push((await command(`definition-${n}-${code}`,'system_admin','/api/v1/requirement-definitions',{action:'create',code:`SAMPLE-HIST-${n+1}-${code}`,expectedVersion:0,fields:{name:`SAMPLE historical ${code}`,instructions:'Synthetic historical evidence for demo only; not an actual submitted document.',appliesTo:'payout',semesterId:t.id,effectiveFrom:t.start,effectiveUntil:null},...evidence})).id);
      let cycle=await command(`cycle-${n}`,'system_admin','/api/v1/payout-cycles',{action:'create',code:`SAMPLE-HIST-PAY-${n+1}`,semesterId:t.id,expectedSemesterVersion:1,expectedVersion:0,fields:{name:`SAMPLE AY2025–2026 Semester ${n+1} — paid history`,targetDate:t.end,requirements:definitions.map(definitionVersionId=>({definitionVersionId,allowWaiver:false}))},...evidence});
      cycle=await command(`open-${n}`,'coordinator',`/api/v1/payout-cycles/${cycle.id}/open`,{action:'open',expectedVersion:cycle.version,...evidence});
      for(const [i,p] of manifest.people.entries()){
        await command(`docs-${n}-${i}`,'staff',`/api/v1/scholarships/${p.annual}/requirements/generate`,{semesterId:t.id,expectedSemesterVersion:1,payoutCycleId:cycle.id,expectedPayoutVersion:cycle.version,...evidence});
        const c=(await read(`/api/v1/scholarships/${p.annual}/requirements`)).items.find(c=>c.payoutCycleId===cycle.id);assert.equal(c.items.length,2);
        await command(`receive-${n}-${i}`,'staff',`/api/v1/requirement-checklists/${c.id}/receive`,{items:c.items.map(i=>({id:i.id,expectedVersion:0})),receivedOn:t.end,physicalReference:'SAMPLE historical papers — synthetic',storageLocation:'SAMPLE training archive',remarks:evidence.reason});
        for(const item of c.items){
          const path=`/api/v1/requirement-instances/${item.id}`,context=await read(path+'/verification-context');
          const document=Object.fromEntries(Object.entries(context).filter(([k])=>['scholarId','scholarVersion','academicYearId','semesterId','schoolId','courseId','academicVersion','definitionVersionId','coverageId','semesterRevision','predecessorSourceHash'].includes(k)));
          await command(`verify-${n}-${i}-${item.code}`,'staff',path+'/verify',{action:'verify',expectedVersion:1,effectiveOn:t.end,remarks:evidence.reason,...evidence,document,checks:{identity:true,period:true,placement:true,applicability:true,validity:true}});
        }
      }
      let batch=await command(`batch-${n}`,'staff',`/api/v1/payout-cycles/${cycle.id}/ovr-batches`,{expectedRevision:0,expectedCycleVersion:cycle.version,code:`SAMPLE-HISTORY-${n+1}`,name:`SAMPLE historical paid payroll — Semester ${n+1}`,...evidence});
      for(const [i,p] of manifest.people.entries())batch=await command(`entry-${n}-${i}`,'staff',`/api/v1/ovr-batches/${batch.id}/entries/add`,{expectedRevision:batch.revision,scholarshipId:p.annual,...evidence});
      for(const [action,role] of [['submit-review','staff'],['finalize','coordinator'],['submit','coordinator'],['mark-processed','staff']])batch=await command(`batch-${n}-${action}`,role,`/api/v1/ovr-batches/${batch.id}/${action}`,{expectedRevision:batch.revision,...evidence,...(['submit','mark-processed'].includes(action)?{effectiveOn:manifest.day}:{})});
      for(const [i,p] of manifest.people.entries())batch=await command(`paid-${n}-${i}`,'staff',`/api/v1/ovr-batches/${batch.id}/payments`,{expectedRevision:batch.revision,scholarshipId:p.annual,outcome:'paid',amount:'5000.00',effectiveOn:manifest.day,remarks:'SAMPLE: historical stipend shown as paid for training; no real disbursement.',receiptConfirmed:true,...evidence});
      await command(`batch-${n}-close`,'coordinator',`/api/v1/ovr-batches/${batch.id}/close`,{expectedRevision:batch.revision,effectiveOn:manifest.day,reconciled:true,...evidence});
      await command(`cycle-${n}-close`,'coordinator',`/api/v1/payout-cycles/${cycle.id}/close`,{action:'close',expectedVersion:cycle.version,...evidence});
      await command(`term-${n}-lock`,'system_admin',`/api/v1/configuration/semesters/${t.id}`,{action:'lock',expectedVersion:1,reason:evidence.reason});
      console.log(`SAMPLE semester ${n+1}: 20 paid outcomes recorded and payroll closed.`);
    }
    await command('year-lock','system_admin',`/api/v1/configuration/academic-years/${manifest.year.id}`,{action:'lock',expectedVersion:1,reason:evidence.reason});
    const after=await currentEvidence();assert.deepEqual(after,manifest.before,'Existing current-year records changed; inspect before further work');
    const paid=await row("SELECT COUNT(*) AS n,SUM(p.amount) AS amount FROM payment_records p JOIN scholarship_records r ON r.id=p.scholarship_id WHERE r.academic_year_id=? AND p.outcome='paid' AND r.scholar_id IN (SELECT id FROM scholars WHERE middle_name='Sample Continuing')",[manifest.year.id]);assert.equal(paid.n,40);assert.equal(Number(paid.amount),200000);
    manifest.complete=true;await persist();
    await writeFile(`${dir}/verification.json`,JSON.stringify({passed:true,synthetic:true,year:manifest.year.code,continuing:20,payrolls:2,paidOutcomes:40,totalPesos:200000,currentYearUnchanged:true,currentDocumentsAndDecisionsUnchanged:true,recordedPaymentDate:manifest.day,coverage:'Previous academic year; payment lifecycle is simulated on the seed date, not backdated as a real disbursement.'},null,2));
    await writeFile(`${dir}/README.md`, `# SAMPLE continuing-scholar history\n\n20 continuing sample scholars now have AY2025–2026 academic records, a published historical sample masterlist, separate COR/COG evidence, and two closed payrolls with 20 paid entries each (PHP 5,000 each; PHP 200,000 total). All history is synthetic. Payment processing dates show ${manifest.day}, the simulation date; semester coverage is 2025–2026. No actual cash was released.\n\nOpen Scholar registry → continuing scholar → Receive requirements → Earlier academic years → AY2025–2026. Academic records and profile History also include the prior year. For paid rosters use Payroll → Past periods & batches → SAMPLE AY2025–2026 Semester 1 or 2. Current AY2026–2027 records remain unchanged.\n\nKeep manifest.json for safe retries and future scoped cleanup. Rerunning scripts/seed-continuing-history.mjs through tsx verifies a completed seed without duplicating history.\n`);
    console.log('PASS: 20 historical academic records, 2 closed sample payrolls, 40 paid entries; current year preserved.');
  }
}finally{if(app)await app.close();await lock.query("SELECT RELEASE_LOCK('ldss_demo_seed')");lock.release();await db.end();}
