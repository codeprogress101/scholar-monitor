import { mkdir, writeFile } from "node:fs/promises";
import { NotificationService } from "../server/notifications/service.js";
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { applyMigrations, grantAuthRuntime } from "./migration-lib.mjs";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { AuthService } from "../server/auth/service.js";
import { newToken } from "../server/auth/crypto.js";
import { AuthorizationService } from "../server/authorization/service.js";
import type { ScholarResult } from "../server/scholars/model.js";
import type { StatusView } from "../server/status/model.js";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_notice_test_${suffix}`,
  runtimeUser = `ldss_test_${suffix}`,
  runtimePassword = newToken();
const origin = "http://127.0.0.1:3003",
  password = "A long synthetic testing passphrase!";
const adminConfig = {
  host: "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: "root",
  password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "",
  timezone: "Z",
};
const admin = await mysql.createConnection(adminConfig);
let root: mysql.Pool | undefined,
  runtime: mysql.Pool | undefined,
  app: ReturnType<typeof buildApp> | undefined;
let createdDatabase = false,
  createdUser = false,
  passed = 0;
const pass = (name: string) => {
  passed++;
  console.log("PASS " + name);
};
try {
  await admin.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  createdDatabase = true;
  await admin.changeUser({ database });
  assert.equal((await applyMigrations(admin)).length, 55);
  assert.deepEqual(await applyMigrations(admin), []);
  await admin.query(
    `CREATE USER ${admin.escape(runtimeUser)}@'localhost' IDENTIFIED BY ${admin.escape(runtimePassword)}`,
  );
  createdUser = true;
  await grantAuthRuntime(admin, database, runtimeUser);
  root = mysql.createPool({ ...adminConfig, database, connectionLimit: 4 });
  runtime = mysql.createPool({
    ...adminConfig,
    database,
    user: runtimeUser,
    password: runtimePassword,
    connectionLimit: 8,
  });
  const auth = new AuthService(root),
    roles = new AuthorizationService(root);
  const db = {
    pool: runtime,
    check: async () => "connected" as const,
    close: async () => {},
  };
  app = buildApp(
    loadConfig({ APP_ENV: "test", PORT: "3003", APP_ORIGIN: origin }),
    { database: db },
  );
  const accounts = new Map<
    string,
    { id: string; cookie: string; csrf: string }
  >();
  for (const role of [
    "system_admin",
    "staff",
    "coordinator",
    "unassigned",
  ] as const) {
    const email = role + "@example.invalid",
      id = await auth.createAccount(
        "Synthetic " + role,
        email,
        "test-operator",
      );
    const reset = await auth.issueReset(
      email,
      "test-operator",
      "Synthetic fixture activation",
    );
    await auth.resetPassword(reset, password, "127.0.0.1", randomUUID());
    if (role !== "unassigned")
      await roles.setRoles({
        email,
        roles: [role],
        expectedVersion: 2,
        requestId: randomUUID(),
        operator: "test-operator",
        reason: "Synthetic fixture role",
      });
    const response: LightMyRequestResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin, "content-type": "application/json" },
      payload: { email, password },
    });
    assert.equal(response.statusCode, 200);
    accounts.set(role, {
      id,
      cookie: String(response.headers["set-cookie"]).split(";")[0],
      csrf: response.json().csrfToken,
    });
  }
  const request = (
    role: string,
    url: string,
    body?: object,
    key: string = randomUUID(),
    method: "GET" | "POST" | "PATCH" = body ? "POST" : "GET",
  ) => {
    const account = accounts.get(role)!;
    return app!.inject({
      method,
      url,
      headers: {
        cookie: account.cookie,
        origin,
        "x-role": "coordinator",
        ...(body
          ? {
              "content-type": "application/json",
              "x-csrf-token": account.csrf,
              "idempotency-key": key,
            }
          : {}),
      },
      ...(body ? { payload: body } : {}),
    });
  };
  const expectError = (
    response: LightMyRequestResponse,
    status: number,
    code: string,
  ) => {
    assert.equal(response.statusCode, status, response.body);
    assert.equal(response.json().error.code, code);
  };
  const config = async (kind: string, fields: object) => {
    const response = await request(
      "system_admin",
      "/api/v1/configuration/" + kind,
      {
        action: "create",
        expectedVersion: 0,
        reason: "Synthetic scholar fixture",
        fields,
      },
    );
    assert.equal(response.statusCode, 200, response.body);
    return response.json<ConfigRecord>();
  };
  const year = await config("academic-years", {
    code: "STATUS-2026",
    name: "Status workflow fixture",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
  });
  const response = await request("staff", "/api/v1/scholars", {
    expectedVersion: 0,
    reason: "Synthetic status fixture",
    fields: {
      firstName: "Test",
      lastName: "Status",
      academicYearId: year.id,
      contact: {},
    },
  });
  assert.equal(response.statusCode, 200, response.body);
  const person = response.json<ScholarResult>();
  const academicSchool = await config("schools", {
    code: "ACADEMIC-SCHOOL",
    name: "Synthetic academic school",
  });
  const academicCourse = await config("courses", {
    code: "ACADEMIC-COURSE",
    name: "Synthetic academic course",
  });
  const addAcademic = async (academicYearId: string) => {
    const response = await request(
      "staff",
      `/api/v1/scholars/${person.id}/academic-records`,
      {
        academicYearId,
        schoolId: academicSchool.id,
        courseId: academicCourse.id,
        yearLevel: "First year",
        reason: "Verified fixture academic record",
        reference: "Synthetic COR 01",
      },
    );
    assert.equal(response.statusCode, 200, response.body);
  };
  await addAcademic(year.id);

  const annual = await request(
    "staff",
    `/api/v1/scholars/${person.id}/scholarships`,
    {
      academicYearId: year.id,
      expectedVersion: 0,
      effectiveOn: "2026-09-01",
      reason: "Synthetic application",
      reference: "Fixture 01",
    },
  );
  assert.equal(annual.statusCode, 200, annual.body);
  let record = annual.json();
  for (const action of ["exam-passed", "qualify", "select"]) {
    const result = await request(
      "coordinator",
      `/api/v1/scholarships/${record.id}/qualification/${action}`,
      {
        expectedVersion: record.version,
        effectiveOn: "2026-09-01",
        reason: "Verified fixture decision",
        reference: "Fixture decision 02",
      },
    );
    assert.equal(result.statusCode, 200, result.body);
    record = result.json();
  }
  const path = `/api/v1/scholarships/${record.id}/status`;
  const view = async () => {
    const result = await request("staff", path);
    assert.equal(result.statusCode, 200, result.body);
    return result.json<StatusView>();
  };
  const proposal = (
    version: number,
    toStatus = "dropped",
    extra: object = {},
  ) => ({
    expectedVersion: version,
    toStatus,
    kind: "change",
    effectiveOn: "2026-09-02",
    reasonCode: "VERIFIED_CHANGE",
    reason: "Physical record verified",
    reference: "Status register 01",
    ...extra,
  });
  const send = (body: object, role = "staff", key = randomUUID()) =>
    request(role, path + "/requests", body, key);
  const decide = (
    id: string,
    action = "approve",
    role = "coordinator",
    key = randomUUID(),
  ) =>
    request(
      role,
      `/api/v1/status-requests/${id}/${action}`,
      { reason: "Reviewed status decision", reference: "Decision register 02" },
      key,
    );
  expectError(await send(proposal(1)), 409, "MASTERLIST_ACTIVATION_REQUIRED");
  assert.equal((await view()).statusAllowsPayout, false);
  for (const role of ["system_admin", "unassigned"]) {
    expectError(await request(role, path), 403, "PERMISSION_DENIED");
    expectError(await send(proposal(1), role), 403, "PERMISSION_DENIED");
  }
  assert.equal((await app.inject(path)).statusCode, 401);
  pass(
    "Private status endpoints deny technical/unassigned roles and cannot bypass official masterlist activation",
  );
  // ONLY this disposable fixture seeds activation; no production API or seed does this.
  await admin.execute(
    "UPDATE scholarship_records SET operational_status='active',status_version=1,status_effective_on='2026-09-01' WHERE id=?",
    [record.id],
  );

  const list = async (role: string, mode = "updates", extra = "") => {
    const r = await request(role, `/api/v1/notifications?mode=${mode}${extra}`);
    assert.equal(r.statusCode,200,r.body);
    return r.json<import("../server/notifications/service.js").NoticeList>();
  };
  // Submit while the Coordinator has no active login session.
  assert.equal((await request("coordinator","/api/v1/auth/logout",{})).statusCode,204);
  const submitted = await send(proposal(1,"on_hold"));
  assert.equal(submitted.statusCode,200,submitted.body);
  const requestId = submitted.json().requestId;
  const login = await app.inject({method:"POST",url:"/api/v1/auth/login",headers:{origin},payload:{email:"coordinator@example.invalid",password}});
  assert.equal(login.statusCode,200,login.body);
  accounts.set("coordinator",{id:accounts.get("coordinator")!.id,cookie:login.headers["set-cookie"]!.toString().split(";")[0],csrf:login.json().csrfToken});
  const pending = await list("coordinator","pending");
  assert.equal(pending.total,pending.pending);
  assert.ok(pending.items.some(n=>n.sourceId===requestId));
  const initialUpdates=await list("coordinator");
  assert.equal(initialUpdates.unread,initialUpdates.items.filter(n=>!n.read).length);
  assert.equal((await request("coordinator","/api/v1/notifications?recipientId="+accounts.get("staff")!.id)).statusCode,422);
  const notice=initialUpdates.items.find(n=>n.sourceId===requestId)!;
  assert.equal((await request("coordinator",`/api/v1/notifications/${notice.id}/read`,{read:true,userId:accounts.get("staff")!.id})).statusCode,422);
  assert.ok(notice.href.includes(person.id) && notice.href.includes(year.id) && notice.href.includes(requestId));
  pass("Offline submission appears at login with exact scholar/year/request link and consistent counts");
  assert.equal((await request("coordinator",`/api/v1/notifications/${notice.id}/read`,{read:true})).statusCode,200);
  assert.equal((await list("coordinator","pending")).pending,pending.pending);
  await app.close();
  app=buildApp(loadConfig({APP_ENV:"test",PORT:"3003",APP_ORIGIN:origin}),{database:db});
  assert.equal((await list("coordinator")).items.find(n=>n.id===notice.id)?.read,true);
  await assert.rejects(()=>runtime!.query("DELETE FROM notification_events WHERE 1=0"),(e:unknown)=>(e as {code?:string}).code==="ER_TABLEACCESS_DENIED_ERROR");
  const restarted = new NotificationService(new AuthorizationService(runtime));
  assert.equal((await restarted.read(accounts.get("coordinator")!.id,{})).items.find(n=>n.id===notice.id)?.read,true);
  const secondEmail="second-coordinator@example.invalid";
  const secondId=await auth.createAccount("Second synthetic Coordinator",secondEmail,"test-operator");
  await roles.setRoles({requestId:randomUUID(),email:secondEmail,roles:["coordinator"],expectedVersion:1,operator:"test-operator",reason:"Notification review test"});
  const second=await restarted.read(secondId,{});
  assert.equal(second.items.find(n=>n.id===notice.id)?.read,false);
  assert.ok((await restarted.read(secondId,{mode:"pending"})).items.some(n=>n.sourceId===requestId));
  pass("Read state is durable and personal; a newly authorized second Coordinator sees outstanding work");
  const key=randomUUID();
  const decision=await decide(requestId,"reject","coordinator",key);
  assert.equal(decision.statusCode,200,decision.body);
  assert.equal((await decide(requestId,"reject","coordinator",key)).statusCode,200);
  assert.ok(!(await restarted.read(secondId,{mode:"pending"})).items.some(n=>n.sourceId===requestId));
  const outcome=(await list("staff")).items.filter(n=>n.sourceId===requestId && n.action==="reject");
  assert.equal(outcome.length,1);
  expectError(await decide(requestId,"approve","staff"),403,"PERMISSION_DENIED");
  pass("Committed rejection notifies requester once; retries preserve identity and shared pending is resolved");
  const before=(await list("coordinator")).total;
  await admin.query("CREATE TRIGGER notification_test_failure BEFORE INSERT ON status_change_commands FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'");
  assert.equal((await send(proposal(1,"suspended"))).statusCode,500);
  await admin.query("DROP TRIGGER notification_test_failure");
  assert.equal((await list("coordinator")).total,before);
  pass("Failed workflow transaction creates no success notification");
  // A pre-feature request has no captured notification; source discovery must still find it.
  const [triggers] = await admin.query<mysql.RowDataPacket[]>("SHOW CREATE TRIGGER notification_event_capture");
  const capture=String(triggers[0]["SQL Original Statement"]);
  await admin.query("DROP TRIGGER notification_event_capture");
  const old = await send(proposal(1,"suspended"));
  assert.equal(old.statusCode,200,old.body);
  await admin.query(capture);
  assert.ok((await list("coordinator","pending")).items.some(n=>n.sourceId===old.json().requestId));
  assert.ok(!(await list("coordinator")).items.some(n=>n.sourceId===old.json().requestId));
  pass("Pre-feature pending request is discovered without replaying historical notices");
  const fresh=await send(proposal(1,"on_hold"));
  const winner=await Promise.all([decide(fresh.json().requestId),decide(fresh.json().requestId)]);
  assert.equal(winner.filter(r=>r.statusCode===200).length,1);
  assert.equal((await list("staff")).items.filter(n=>n.sourceId===fresh.json().requestId && n.action==="approve").length,1);
  pass("Concurrent decisions retain one authoritative winner and one outcome notice");
  const info=await roles.inspectByEmail(secondEmail);
  await roles.setRoles({requestId:randomUUID(),email:secondEmail,roles:[],expectedVersion:info.version,operator:"test-operator",reason:"Revoke synthetic reviewer access"});
  assert.equal((await restarted.read(secondId,{})).total,0);
  await assert.rejects(()=>restarted.mark(secondId,notice.id,{read:true}),{code:"NOTIFICATION_NOT_FOUND"});
  await auth.setDisabled(secondEmail,true,"test-operator","Disable synthetic reviewer");
  await assert.rejects(()=>restarted.read(secondId,{}),{code:"ACCOUNT_DISABLED"});
  assert.ok((await list("system_admin")).items.every(n=>n.kind==="account"));
  assert.equal((await list("system_admin","pending")).total,0);
  pass("Revoked and disabled reviewers lose list/read access; Administrator has technical notices only");
  // Restore fixture standing for the real masterlist workflow below (isolated synthetic record only).
  await admin.execute("UPDATE scholarship_records SET operational_status='active' WHERE id=?",[record.id]);
  const evidence={reason:"Synthetic notifications workflow",reference:"NOTICE-FIXTURE"};
  const draft=await request("staff","/api/v1/masterlists",{academicYearId:year.id,title:"Notifications review roster",...evidence});
  assert.equal(draft.statusCode,200,draft.body);
  const draftId=draft.json().id;
  const added=await request("staff",`/api/v1/masterlists/${draftId}/entries`,{action:"add",expectedVersion:1,scholarId:person.id,awardNumber:null,...evidence});
  assert.equal(added.statusCode,200,added.body);
  const transition=async(action:string,role="coordinator")=>{
    const view=await request(role,`/api/v1/masterlists/${draftId}`);
    const version=view.json().draft?.version ?? view.json().version;
    const result=await request(role,`/api/v1/masterlists/${draftId}/${action}`,{expectedVersion:version,...evidence});
    assert.equal(result.statusCode,200,result.body);return result;
  };
  await transition("submit-verification","staff");
  await transition("return-draft");
  assert.ok((await list("staff","pending")).items.some(n=>n.sourceId===draftId && n.state==="returned"));
  await transition("submit-verification","staff");
  assert.equal((await list("coordinator")).items.filter(n=>n.sourceId===draftId && n.action==="submit-verification").length,2);
  await transition("submit-approval","staff");
  await transition("approve");
  assert.ok((await list("coordinator","pending")).items.some(n=>n.sourceId===draftId && n.state==="approved"));
  assert.ok(!(await list("staff","pending")).items.some(n=>n.sourceId===draftId));
  pass("Returned masterlist remains preparer work; resubmission produces new notice; approved list still awaits publication");
  await transition("return-draft");
  await transition("submit-verification","coordinator");
  assert.ok((await list("staff")).items.some(n=>n.sourceId===draftId && n.action==="return-draft"));
  pass("Earlier outcome ownership survives a later submission by a different preparer");
  if (process.argv.includes("--browser")) {
    await transition("return-draft");
    await transition("submit-verification","staff");
    await transition("submit-approval","staff");
    const fixture=buildApp(loadConfig({APP_ENV:"test",PORT:"3003",APP_ORIGIN:origin}),{database:db,clientRoot:resolve("dist/client")});
    let stop:()=>void=()=>{};const done=new Promise<void>(r=>{stop=r;});
    fixture.get("/__fixture/stop",async()=>{setTimeout(stop,50);return {stopping:true};});
    await fixture.listen({host:"127.0.0.1",port:3003});
    console.log("Notification browser fixture ready: staff@example.invalid / coordinator@example.invalid / system_admin@example.invalid");
    await done;await fixture.close();
  } else {
    // Performance fixture: real schema, synthetic pending requests and committed audit events.
    // No production records or eligibility calculations are involved.
    const annualIds:string[]=[];
    for(let i=0;i<250;i++) {
      const scholarId=randomUUID();
      await admin.execute("INSERT INTO scholars(id,first_name,last_name,academic_year_id,version,created_at,updated_at) VALUES(?,?,'Synthetic',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[scholarId,`Benchmark ${i}`,year.id]);
      await admin.execute("INSERT INTO scholar_identifiers(scholar_id,entry_year,sequence_no) VALUES(?,2026,?)",[scholarId,10000+i]);
      const annualId=randomUUID();annualIds.push(annualId);
      await admin.execute("INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,version,last_effective_on,operational_status,status_version,status_effective_on,created_at,updated_at) VALUES(?,?,?,'selected',4,'2026-09-01','active',1,'2026-09-01',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[annualId,scholarId,year.id]);
    }
    await admin.beginTransaction();
    for(let i=0;i<3000;i++) {
      const id=randomUUID();
      await admin.execute("INSERT INTO status_change_requests(id,scholarship_id,expected_version,from_status,to_status,kind,effective_on,reason_code,reason,reference_text,actor_id,actor_name,created_at) VALUES(?,?,1,'active','on_hold','change','2026-09-02','VERIFIED_CHANGE','Synthetic benchmark request','BENCH',?,'Synthetic Staff',UTC_TIMESTAMP(6))",[id,annualIds[i%250],accounts.get("staff")!.id]);
      await admin.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,details) VALUES(?,'scholarship.status','status_request',?,'request',?,'user',UTC_TIMESTAMP(6),?,'{}')",[randomUUID(),id,accounts.get("staff")!.id,randomUUID()]);
      if(i>=1000) {
        await admin.execute("INSERT INTO status_change_decisions(request_id,decision,actor_id,actor_name,reason,reference_text,resulting_version,occurred_at) VALUES(?,'reject',?,'Synthetic Coordinator','Synthetic benchmark decision','BENCH',NULL,UTC_TIMESTAMP(6))",[id,accounts.get("coordinator")!.id]);
        await admin.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,details) VALUES(?,'scholarship.status','status_request',?,'reject',?,'user',UTC_TIMESTAMP(6),?,'{}')",[randomUUID(),id,accounts.get("coordinator")!.id,randomUUID()]);
      }
    }
    await admin.commit();
    const timings:number[]=[];
    for(let i=0;i<12;i++){const start=performance.now();const response=await list("coordinator",i%2?"updates":"pending");assert.ok(response.total>=1000);timings.push(performance.now()-start);}
    await mkdir("output/notifications-20261008",{recursive:true});
    const report={syntheticScholars:250,syntheticPendingRequests:1000,syntheticCompletedRequests:2000,syntheticEvents:5000,samples:timings.length,timingsMs:timings,minMs:Math.min(...timings),maxMs:Math.max(...timings),meanMs:timings.reduce((a,b)=>a+b,0)/timings.length,scope:"Local sequential Fastify API calls including authorization and all list/count queries; 250 synthetic scholars; not production capacity certification"};
    await writeFile("output/notifications-20261008/performance.json",JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
    pass("Bounded list/count benchmark completed against 1000 pending requests, 2000 completed requests and 5000 events");
  }
  console.log(`All ${passed} notification scenarios passed in an isolated disposable database.`);
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_notice_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
