import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import mysql, { type RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { createBackup, restoreBackup, loadKey } from "./backup-lib.mjs";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { createDatabase } from "../server/database.js";
import { AuthService } from "../server/auth/service.js";
import { AuthorizationService } from "../server/authorization/service.js";
import { today } from "../server/scholars/validation.js";
import type { ConfigRecord } from "../server/configuration/model.js";
import type { ScholarResult } from "../server/scholars/model.js";

const config = loadConfig(process.env);
assert.equal(config.APP_ENV, "development"); assert.equal(config.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["localhost", "127.0.0.1"].includes(config.DB_HOST));
assert.ok(process.argv.slice(2).every(a => a === "--browser-state"));
const file = "output/sample-cohort-manifest.json";
type Step = { key: string; role: string; url: string; body: object; result?: unknown };
type Manifest = { database: string; day: string; complete: boolean; steps: Record<string, Step> };
type Person = { id: string; scholarId: string; name: string; group: string; yearLevel: string; annualId?: string };
await mkdir("output/sample-cleanup", { recursive: true });
const root = mysql.createPool({ host: config.DB_HOST, port: config.DB_PORT, user: "root", password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "", database: config.DB_NAME, timezone: "Z", connectionLimit: 2 });
const lock = await root.getConnection();
let app: ReturnType<typeof buildApp> | undefined;
try {
  assert.equal((await lock.query<RowDataPacket[]>("SELECT GET_LOCK('ldss_demo_seed',0) AS acquired"))[0][0].acquired, 1);
  const manifest: Manifest = existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : { database: config.DB_NAME, day: today(), complete: false, steps: {} };
  assert.equal(manifest.database, config.DB_NAME);
  const persist = async () => { await writeFile(file + ".tmp", JSON.stringify(manifest, null, 2)); await rename(file + ".tmp", file); };
  if (manifest.complete) {
    const [rows] = await root.query<RowDataPacket[]>("SELECT id FROM scholars");
    const recorded = Object.entries(manifest.steps).filter(([k]) => /^person-\d+$/.test(k)).map(([,s]) => (s.result as ScholarResult).id);
    assert.equal(recorded.length, 50); assert.ok(recorded.every(id => rows.some(r => r.id === id)), "Sample records were removed; do not replay a completed seed manifest");
    console.log("The 50-student sample cohort is already installed; testing changes preserved.");
  } else {
    if (!existsSync(file)) {
      assert.equal((await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM scholars"))[0][0].n, 0, "Start only after the authorized sample cleanup; never mix with unknown scholars");
      const key = await loadKey(), backup = await createBackup(key), restored = await restoreBackup(backup.file, key);
      await writeFile("output/sample-cleanup/before-cohort-backup.json", JSON.stringify({ backup, restored }, null, 2));
      await persist();
    }
    const [[year]] = await root.query<RowDataPacket[]>("SELECT y.id,y.code FROM academic_years y JOIN system_settings s ON s.setting_value=y.id AND s.code='LDSS_WORKING_ACADEMIC_YEAR' WHERE y.code='AY2026-2027' AND y.locked_at IS NULL AND y.archived_at IS NULL");
    assert.ok(year, "The designated working year must be AY2026-2027");
    const [terms] = await root.execute<RowDataPacket[]>("SELECT id,code,name FROM semesters WHERE academic_year_id=? AND starts_on<=? AND ends_on>=? AND locked_at IS NULL AND archived_at IS NULL", [year.id,manifest.day,manifest.day]);
    assert.equal(terms.length, 1, "One current semester is needed to explicitly confirm the synthetic graduates' final semester");
    const semester = terms[0], origin = config.APP_ORIGIN ?? "http://127.0.0.1:5173";
    app = buildApp({ ...config, LOG_LEVEL: "silent" }, { database: createDatabase(config) });
    const auth = new AuthService(root), authorization = new AuthorizationService(root);
    const sessions = new Map<string, { cookie: string; csrf: string }>();
    for (const role of ["system_admin", "staff", "coordinator"] as const) {
      const email = `payroll-demo-${role}@example.invalid`;
      const [[found]] = await root.execute<RowDataPacket[]>("SELECT id,disabled_at FROM users WHERE email=?", [email]);
      assert.ok(found && !found.disabled_at, "Expected existing, active synthetic seed actor; personal accounts must not be changed");
      const access = await authorization.access(found.id); assert.ok(access.roles.some(r => r.code === role));
      const reset = await auth.issueReset(email, "sample-cohort", "Activate existing synthetic actor for user-requested sample cohort");
      const password = randomBytes(32).toString("base64url") + "aA1!";
      await auth.resetPassword(reset, password, "127.0.0.1", randomUUID());
      const response: LightMyRequestResponse = await app.inject({ method: "POST", url: "/api/v1/auth/login", headers: { origin }, payload: { email, password } });
      assert.equal(response.statusCode, 200);
      sessions.set(role, { cookie: String(response.headers["set-cookie"]).split(";")[0], csrf: response.json().csrfToken });
    }
    async function read<T>(url: string, role = "staff"): Promise<T> {
      const r = await app!.inject({ method: "GET", url, headers: { cookie: sessions.get(role)!.cookie, origin } }); assert.equal(r.statusCode,200,r.body); return r.json<T>();
    }
    async function command<T = { id: string; version: number }>(name: string, role: string, url: string, body: object): Promise<T> {
      const step = manifest.steps[name] ??= { key: randomUUID(), role, url, body };
      assert.equal(step.role,role); assert.equal(step.url,url);
      if (step.result !== undefined) return step.result as T;
      await persist();
      const s = sessions.get(role)!;
      const r = await app!.inject({ method: "POST", url, payload: step.body, headers: { cookie: s.cookie, origin, "x-csrf-token": s.csrf, "idempotency-key": step.key } });
      assert.equal(r.statusCode,200,`${name}: ${r.body}`); step.result=r.json(); await persist(); return step.result as T;
    }
    const setup = (kind: string, code: string, name: string) => command<ConfigRecord>(code,"system_admin",`/api/v1/configuration/${kind}`,{action:"create",expectedVersion:0,fields:{code,name}});
    const schools = [await setup("schools","SAMPLE-COLLEGE-A","SAMPLE Training College A"), await setup("schools","SAMPLE-COLLEGE-B","SAMPLE Training College B")];
    const courses = [];
    for (const [code,name] of [["IT","Information Technology"],["BA","Business Administration"],["ED","Education"],["CRIM","Criminology"]]) courses.push(await setup("courses",`SAMPLE-${code}`,`SAMPLE Bachelor of ${name}`));
    const firstNames = ["Adrian","Bianca","Christian","Danielle","Ethan","Francesca","Gabriel","Hannah","Ivan","Julia","Kenneth","Lara","Marco","Nicole","Oliver","Patricia","Rafael","Sofia","Tristan","Vanessa","William","Ysabel","Zachary","Andrea","Brandon","Camille","Dominic","Elise","Francis","Grace","Harvey","Isabelle","Joshua","Katrina","Liam","Mikaela","Nathan","Olivia","Paolo","Queenie","Renz","Samantha","Theo","Valerie","Warren","Alyssa","Bryan","Celine","Diego","Erika"];
    const surnames = ["Santos","Reyes","Cruz","Garcia","Mendoza","Torres","Ramos","Flores","Castillo","Rivera"];
    const people: Person[] = [];
    for (let n=0; n<50; n++) {
      const group=n<25?"New":n<45?"Continuing":"Graduate", yearLevel=n<25?"First year":n<45?["Second year","Third year","Fourth year"][(n-25)%3]:"Fourth year";
      const firstName=firstNames[n], lastName=surnames[n%10], middleName=`Sample ${group}`;
      const p=await command<ScholarResult>(`person-${n}`,"staff","/api/v1/scholars",{expectedVersion:0,fields:{firstName,middleName,lastName,academicYearId:year.id,contact:{email:`sample.student.${String(n+1).padStart(2,"0")}@example.invalid`}}});
      await command(`academic-${n}`,"staff",`/api/v1/scholars/${p.id}/academic-records`,{academicYearId:year.id,schoolId:schools[n%2].id,courseId:courses[n%4].id,yearLevel});
      const person: Person={id:p.id,scholarId:p.scholarId,name:`${lastName}, ${firstName} ${middleName}`,group,yearLevel};
      if(group!=="Continuing") {
        const a=await command(`annual-${n}`,"staff",`/api/v1/scholars/${p.id}/scholarships`,{academicYearId:year.id,expectedVersion:0,effectiveOn:manifest.day}); person.annualId=a.id;
        if(group==="Graduate") for(const [j,action] of ["validate","select"].entries()) await command(`qualification-${n}-${j}`,j===0?"staff":"coordinator",`/api/v1/scholarships/${a.id}/qualification/${action}`,{expectedVersion:j+1,effectiveOn:manifest.day,...(action==="validate"?{priorQualificationConfirmed:true}:{}),reason:"Synthetic graduate lifecycle for testing only",reference:"SAMPLE-GRADUATE-LIFECYCLE"});
      }
      people.push(person);
    }
    const continuing=people.filter(p=>p.group==="Continuing");
    const roster=await command("continuing-roster","staff","/api/v1/continuing-rosters",{sourceReference:"SAMPLE 20-person continuing roster; synthetic testing data only",entries:continuing.map((p,i)=>({scholarId:p.id,version:1,sourceRow:i+1,originalName:p.name}))});
    await command("accept-roster","coordinator",`/api/v1/continuing-rosters/${roster.id}/decision`,{expectedRevision:0,decision:"accepted",effectiveOn:manifest.day,issuer:"SAMPLE Coordinator",reference:"SAMPLE-COHORT-20",reviewed:true,reason:"Synthetic continuing participation; historical admission documents unavailable"});
    const graduates=people.filter(p=>p.group==="Graduate");
    let master=await command("graduate-masterlist","staff","/api/v1/masterlists",{academicYearId:year.id,title:"SAMPLE Graduate Final-Semester Roster"});
    for(const [n,p] of graduates.entries()) master=await command(`graduate-member-${n}`,"staff",`/api/v1/masterlists/${master.id}/entries`,{action:"add",expectedVersion:master.version,scholarId:p.id,awardNumber:null});
    for(const [n,action] of ["submit-verification","submit-approval","approve","publish"].entries()) master=await command(`graduate-master-${action}`,n<2?"staff":"coordinator",`/api/v1/masterlists/${master.id}/${action}`,{expectedVersion:master.version,...(action==="publish"?{effectiveOn:manifest.day}:{})});
    for(const [n,p] of graduates.entries()) {
      const status=await read<{version:number}>(`/api/v1/scholarships/${p.annualId}/status`);
      const req=await command<{requestId:string}>(`graduate-request-${n}`,"staff",`/api/v1/scholarships/${p.annualId}/status/requests`,{expectedVersion:status.version,toStatus:"graduated",kind:"change",effectiveOn:manifest.day,reasonCode:"GRADUATION",reason:"Synthetic graduation for testing; no actual payment",reference:"SAMPLE-GRADUATION"});
      await command(`graduate-approve-${n}`,"coordinator",`/api/v1/status-requests/${req.requestId}/approve`,{reason:"Confirm synthetic final funded semester",reference:"SAMPLE-FINAL-SEMESTER",finalSemesterId:semester.id});
      // Historical sample classification supersedes the synthetic lifecycle's funding link.
      // Keep the original evidence; never invent an earlier date, payment or another working year.
      const c = await root.getConnection();
      try {
        await c.beginTransaction();
        const [prior] = await c.execute<RowDataPacket[]>("SELECT request_id FROM graduation_record_corrections WHERE request_id=? FOR UPDATE", [req.requestId]);
        if (!prior.length) {
          await c.execute("INSERT INTO graduation_record_corrections(request_id,graduated_before_year_id,no_outstanding_stipend,operator_reference,reason,recorded_at) VALUES(?,?,1,?,?,UTC_TIMESTAMP(6))", [req.requestId,year.id,"User-approved historical graduate sample", "Graduated before the working year; no stipend due. Supersedes synthetic lifecycle funding link."]);
          await c.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_kind,operator_reference,occurred_at,request_id,reason,details) VALUES(?,'graduation.sample_corrected','scholar',?,'correct','operator',?,UTC_TIMESTAMP(6),?,?,?)", [randomUUID(),p.id,"User-approved sample cohort",randomUUID(),"Historical graduate, no outstanding stipend",JSON.stringify({ originalRequestId:req.requestId,graduatedBeforeYearId:year.id })]);
        }
        await c.commit();
      } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
    }
    const list=await read<{total:number;items:{id:string;graduation:{archived:boolean}|null}[]}>("/api/v1/scholars?scope=all&limit=100");
    assert.equal(list.total,50); assert.equal(list.items.filter(p=>p.graduation).length,5); assert.ok(list.items.filter(p=>p.graduation).every(p=>p.graduation!.archived));
    assert.equal((await read<{total:number}>("/api/v1/scholars?scope=graduated&limit=100")).total,5);
    assert.equal((await read<{entries:unknown[];state:string}>(`/api/v1/continuing-rosters/${roster.id}`)).state,"accepted");
    const [[payments]]=await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM payment_records"); assert.equal(payments.n,0);
    const [[years]]=await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM academic_years"); assert.equal(years.n,1);
    await writeFile("output/sample-cohort-verification.json",JSON.stringify({passed:true,checkedAt:new Date().toISOString(),total:50,newApplicants:25,continuingAccepted:20,graduates:5,paid:0,academicYear:year.code,graduatedBeforeYear:year.code,finalSemester:null,rosterId:roster.id,people},null,2));
    await writeFile("output/demo-data-guide.md",["# Current 50-student sample cohort","",`Created ${manifest.day}; synthetic data only. Working year: ${year.code}.`,"","| Group | Count | Where to test |","| --- | --- | --- |","| New | 25 | Registry search: Sample New; Admission review: For validation |","| Continuing | 20 | Registry search: Sample Continuing; Continuing roster review: accepted roster |","| Graduates | 5 | Registry view: Graduated / Archived; no stipend due |","","All 50 have school, course and year-level records. New students are first year; continuing students span second through fourth year; graduates have fourth-year records. Email addresses use example.invalid. No personal accounts or roles were changed.","","Continuing records use accepted baseline participation without invented exam/admission history. Acceptance alone is not payroll eligibility. The five synthetic graduate lifecycle histories are explicitly marked as test evidence. They graduated before the working year and have no stipend due. They are archived; no receipt or payment is invented.","","No new academic year, semester dates, submission policy, payment, or payroll batch was created. Current receiving/payroll prerequisites still apply. The full receiving-to-payment smoke test uses a disposable database, which is deleted afterward.","","| Scholar ID | Name | Group | Year level |","| --- | --- | --- | --- |",...people.map(p=>`| ${p.scholarId} | ${p.name} | ${p.group} | ${p.yearLevel} |`),"","Keep output/sample-cohort-manifest.json for safe retries and future scoped removal. npm run demo:seed verifies the existing cohort and does not duplicate completed data.",""].join("\n"));
    manifest.complete=true; await persist();
    for(const [role,s] of sessions) {
      if(role==="staff" && process.argv.includes("--browser-state")) {
        const [name,...rest]=s.cookie.split("=");
        await writeFile("output/sample-cleanup/browser-state.json",JSON.stringify({cookies:[{name,value:rest.join("="),domain:"127.0.0.1",path:"/",expires:-1,httpOnly:true,secure:false,sameSite:"Strict"}],origins:[]}));
      } else {
        const logout: LightMyRequestResponse = await app.inject({method:"POST",url:"/api/v1/auth/logout",payload:{},headers:{cookie:s.cookie,origin,"x-csrf-token":s.csrf}});
        assert.equal(logout.statusCode,204);
      }
    }
    console.log("PASS Created and verified 50 samples: 25 applicants, 20 accepted continuing scholars, 5 prior graduates with no stipend due; one working year and zero payments.");
  }
} finally {
  if(app) await app.close(); await lock.query("SELECT RELEASE_LOCK('ldss_demo_seed')"); lock.release(); await root.end();
}
