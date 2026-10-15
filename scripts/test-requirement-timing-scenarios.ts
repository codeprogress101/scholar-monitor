import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, Pool, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { RequirementTimingView } from "../server/requirements/timing-service.js";
import { today } from "../server/scholars/validation.js";

export async function testRequirementTiming({ admin, runtime, request, actor, scholar }: { admin: Connection; runtime: Pool; actor: string; scholar: string; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse> }) {
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const day = today(), offset = (n: number) => new Date(Date.parse(day + "T00:00:00Z") + n * 86400000).toISOString().slice(0,10);
  const [[sourceTerm]] = await admin.query<RowDataPacket[]>("SELECT * FROM semesters WHERE code='SETUP-NEXT'");
  const [[sourceChecklist]] = await admin.execute<RowDataPacket[]>("SELECT c.* FROM requirement_checklists c JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id WHERE ss.scholar_id=? AND ss.semester_id=?", [scholar, sourceTerm.id]);
  // A separate semester-owned fixture avoids the deliberately ambiguous legacy cycles.
  const clone = async(table: string, row: RowDataPacket, changes: object) => {
    assert.ok(["semesters","workflow_scope_versions","scholar_semesters","scholar_semester_revisions","requirement_checklists"].includes(table));
    const value={...row,...changes}; await admin.query(`INSERT INTO ${table} SET ?`,[value]); return value;
  };
  const term=await clone("semesters",sourceTerm,{id:randomUUID(),code:"TIMING-SEMESTER",name:"Timing receiving semester"});
  const [[sourceOwner]]=await admin.execute<RowDataPacket[]>("SELECT * FROM scholar_semesters WHERE id=?",[sourceChecklist.scholar_semester_id]);
  const [[sourceScope]]=await admin.execute<RowDataPacket[]>("SELECT * FROM workflow_scope_versions WHERE id=?",[sourceOwner.scope_version_id]);
  const scope=await clone("workflow_scope_versions",sourceScope,{id:randomUUID(),semester_id:term.id,revision:1});
  const owner=await clone("scholar_semesters",sourceOwner,{id:randomUUID(),semester_id:term.id,scope_version_id:scope.id});
  const [[sourceRevision]]=await admin.execute<RowDataPacket[]>("SELECT * FROM scholar_semester_revisions WHERE scholar_semester_id=? ORDER BY revision DESC LIMIT 1",[sourceOwner.id]);
  await clone("scholar_semester_revisions",sourceRevision,{scholar_semester_id:owner.id,revision:1});
  const checklist=await clone("requirement_checklists",sourceChecklist,{id:randomUUID(),scholar_semester_id:owner.id,semester_id:term.id,semester_code:term.code,semester_name:term.name});
  const cycle = randomUUID();
  await admin.execute("INSERT INTO payout_cycles(id,code,semester_id) VALUES(?,?,?)", [cycle, "TIMING-CYCLE", term.id]);
  await admin.execute("INSERT INTO payout_cycle_versions(id,cycle_id,version,name,target_date,state,action,reason,reference_text,actor_id,actor_name,recorded_at) VALUES(?,?,1,'Synthetic timing cycle',?,'open','open','Synthetic fixture','TEST',?,'Synthetic Coordinator',UTC_TIMESTAMP(6))", [randomUUID(), cycle, day, actor]);
  await admin.execute("INSERT INTO regular_payout_periods(cycle_id,semester_id,academic_year_id,term_number,semester_version,year_version,actor_id,recorded_at) SELECT ?,s.id,y.id,2,s.version,y.version,?,UTC_TIMESTAMP(6) FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=?", [cycle, actor, term.id]);
  await admin.execute("INSERT INTO semester_submission_versions(cycle_id,revision,deadline_on,action,reason,actor_id,recorded_at) VALUES(?,1,?,'configure','Synthetic cutoff fixture',?,UTC_TIMESTAMP(6))", [cycle, offset(10), actor]);
  const batches = [randomUUID(), randomUUID()];
  for (const [i,id] of batches.entries()) {
    await admin.execute("INSERT INTO ovr_batches(id,cycle_id,code,name,created_by,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [id, cycle, `TIMING-${i+1}`, `Synthetic timing ${i+1}`, actor]);
    await admin.execute("INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,1,'draft','create','{}',?,UTC_TIMESTAMP(6))", [id, actor]);
    await admin.execute("INSERT INTO payroll_submission_windows(batch_id,cycle_id,batch_number,actor_id,recorded_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))", [id, cycle, i+1, actor]);
    await admin.execute("INSERT INTO payroll_submission_window_versions(batch_id,cycle_id,revision,semester_deadline_revision,opens_on,cutoff_on,action,reason,actor_id,recorded_at) VALUES(?,?,1,1,?,?,'open','Synthetic past/future cutoff',?,UTC_TIMESTAMP(6))", [id, cycle, offset(i === 0 ? -5 : 0), offset(i === 0 ? -1 : 5), actor]);
  }
  const make = async(code: string) => {
    await ok(request("system_admin", "/api/v1/requirement-definitions", { action: "create", code, expectedVersion: 0, reason: "Synthetic timing requirement", reference: "TEST", fields: { name: code, instructions: "Synthetic timing test only", appliesTo: "semester", semesterId: term.id, effectiveFrom: "2026-10-01", effectiveUntil: null } }));
    const [[definition]] = await admin.execute<RowDataPacket[]>("SELECT v.id FROM requirement_definitions d JOIN requirement_definition_versions v ON v.definition_id=d.id WHERE d.code=?", [code]);
    const id = randomUUID();
    await admin.execute("INSERT INTO requirement_instances(id,checklist_id,definition_version_id,status,created_at) VALUES(?,?,?,'not_submitted',UTC_TIMESTAMP(6))", [id, checklist.id, definition.id]);
    await admin.execute("INSERT INTO requirement_coverage(id,scholar_semester_id,requirement_instance_id,revision,document_kind,coverage_semester_id,actor_id,recorded_at) VALUES(?,?,?,1,'cor',?,?,UTC_TIMESTAMP(6))", [randomUUID(), checklist.scholar_semester_id, id, term.id, actor]);
    return id;
  };
  const first = await make("TIMING-ENROLLMENT"), second = await make("TIMING-BATCH");
  const path = (id=first) => `/api/v1/requirement-instances/${id}`;
  const view = async(id=first) => (await ok(request("staff", path(id)+"/timing"))).json<RequirementTimingView>();
  assert.equal((await view()).windows[0].status, "missing_receipt");
  const receipt = { expectedVersion: 0, receivedOn: offset(-2), physicalReference: null, storageLocation: "Synthetic cabinet", remarks: null, reason: "Synthetic late encoding", documentType: "cor" };
  const receiveKey = randomUUID();
  const received = (await ok(request("staff", path()+"/receive", receipt, receiveKey))).json();
  assert.equal(received.timing.windows[0].status, "review_required"); assert.equal(received.timing.windows[0].timingSatisfied, false);
  assert.equal(received.timing.windows[1].status, "on_time");
  assert.deepEqual((await ok(request("staff", path()+"/receive", receipt, receiveKey))).json(), received);
  const batchReceived = (await ok(request("staff", `/api/v1/requirement-checklists/${checklist.id}/receive`, { items: [{id:second,expectedVersion:0,documentType:"cor"}], receivedOn: day, physicalReference:null,storageLocation:null,remarks:null }))).json();
  assert.equal(batchReceived.items[0].timing.windows[0].status, "late");
  const decision = async(id=first) => {const w=(await view(id)).windows[0];return {batchId:w.batchId,expectedSourceHash:w.sourceHash,expectedRevision:w.decisionRevision,decision:"approve",evidenceKind:"receiving_log",evidenceReference:"Synthetic log page 1",reason:"Dated entry confirms physical custody"};};
  const body=await decision(), decidePath=path()+"/timing/decide";
  for(const role of ["staff","system_admin","unassigned"]) assert.equal((await request(role,decidePath,body)).statusCode,403);
  assert.equal((await request("coordinator",decidePath,{...body,evidenceReference:""})).statusCode,422);
  assert.equal((await request("coordinator",path(second)+"/timing/decide",await decision(second))).statusCode,409);
  assert.equal((await request("coordinator",decidePath,{...body,expectedSourceHash:"0".repeat(64)})).statusCode,409);
  const before=(await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_receipts WHERE instance_id=?",[first]))[0];
  await admin.query("CREATE TRIGGER reject_timing_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='requirements.timing' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  const key=randomUUID();
  try {assert.equal((await request("coordinator",decidePath,body,key)).statusCode,500);} finally {await admin.query("DROP TRIGGER reject_timing_audit");}
  assert.equal((await view()).windows[0].history.length,0);
  const saved=(await ok(request("coordinator",decidePath,body,key))).json();
  assert.deepEqual((await ok(request("coordinator",decidePath,body,key))).json(),saved);
  assert.equal((await view()).windows[0].status,"approved_late_encoding");
  assert.equal((await view()).financialAuthorized,false);
  assert.deepEqual((await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_receipts WHERE instance_id=?",[first]))[0],before);
  const reject={...await decision(),decision:"reject",reason:"Evidence was subsequently found insufficient"};
  const race=await Promise.all([request("coordinator",decidePath,reject),request("coordinator",decidePath,reject)]);
  assert.deepEqual(race.map(r=>r.statusCode).sort(),[200,409]);
  assert.equal((await view()).windows[0].status,"rejected_late_encoding");
  const beforeExtension=await decision();
  await admin.execute("INSERT INTO semester_submission_versions(cycle_id,revision,deadline_on,previous_deadline_on,action,reason,actor_id,recorded_at) VALUES(?,2,?,?,'extend','Synthetic semester extension',?,UTC_TIMESTAMP(6))",[cycle,offset(11),offset(10),actor]);
  assert.equal((await request("coordinator",decidePath,beforeExtension)).statusCode,409);
  assert.equal((await view()).windows[0].status,"review_required");
  await ok(request("coordinator",decidePath,await decision()));
  const [[receiptAudit]]=await admin.execute<RowDataPacket[]>("SELECT details FROM audit_logs WHERE event_type='requirements.received' AND entity_id=?",[first]);
  assert.equal(JSON.parse(receiptAudit.details).after.timing.windows[0].status,"review_required");
  const decisionBefore=(await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_timing_decisions WHERE instance_id=? ORDER BY revision",[first]))[0];
  await admin.execute("INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,2,'finalized','finalize','{}',?,UTC_TIMESTAMP(6))",[batches[0],actor]);
  assert.equal((await request("coordinator",decidePath,await decision())).statusCode,409);
  assert.deepEqual((await ok(request("coordinator",decidePath,body,key))).json(),saved);
  const common={effectiveOn:day,reason:"Synthetic document replacement",reference:"TEST",remarks:null};
  await ok(request("staff",path()+"/send-for-verification",{...common,action:"send-for-verification",expectedVersion:1}));
  await ok(request("staff",path()+"/return-for-correction",{...common,action:"return-for-correction",expectedVersion:2,correctionOf:null}));
  const replaced=(await ok(request("staff",path()+"/resubmit",{...common,action:"resubmit",expectedVersion:3,physicalReference:null,storageLocation:"Synthetic cabinet",documentType:"certificate_of_enrollment"}))).json();
  assert.equal(replaced.timing.windows[0].status,"late"); assert.equal(replaced.timing.windows[0].timingSatisfied,false);
  assert.equal(replaced.timing.windows[1].status,"on_time");
  assert.notEqual(replaced.timing.windows[0].sourceHash,body.expectedSourceHash);
  assert.deepEqual((await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_timing_decisions WHERE instance_id=? ORDER BY revision",[first]))[0],decisionBefore);
  for(const sql of ["UPDATE requirement_timing_decisions SET reason=reason WHERE 1=0","DELETE FROM requirement_timing_decisions WHERE 1=0"]) await assert.rejects(runtime.query(sql), (e: {code?:string})=>e.code==="ER_TABLEACCESS_DENIED_ERROR");
  // An unfinalized extension changes source versions, without rewriting old observations.
  await admin.execute("INSERT INTO payroll_submission_window_versions(batch_id,cycle_id,revision,semester_deadline_revision,opens_on,cutoff_on,previous_cutoff_on,action,reason,actor_id,recorded_at) VALUES(?,?,2,1,?,?,?,'extend','Synthetic extension',?,UTC_TIMESTAMP(6))",[batches[1],cycle,day,offset(6),offset(5),actor]);
  assert.equal((await view()).windows[1].revision,2);
  assert.equal((await view()).windows[1].status,"on_time");
  if(process.argv.includes("--browser")) {
    const browser=await make("TIMING-REVIEW");
    await ok(request("staff",path(browser)+"/receive",receipt));
    // Separate unfinalized historical fixture batch for the Coordinator browser review.
    await admin.execute("DELETE FROM ovr_batch_events WHERE batch_id=? AND revision=2",[batches[0]]);
  }
  console.log("PASS Receipt timing: custody after cutoff, date-only claims, initial/batch/replacement classification, Coordinator-only scoped decisions, evidence, stale sources, audit rollback, races/retries, finalized protection and immutable history");
}
