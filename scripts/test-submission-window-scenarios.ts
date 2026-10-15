import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket, Pool } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { SubmissionWindowView } from "../server/payouts/submission-service.js";
import { AuthorizationService } from "../server/authorization/service.js";
import { today } from "../server/scholars/validation.js";

export async function testSubmissionWindows({ admin, runtime, actor, staffId, request }: {
  admin: Connection; runtime: Pool; actor: string; staffId: string;
  request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
}) {
  const ok = async (r: Promise<LightMyRequestResponse>) => { const v = await r; assert.equal(v.statusCode, 200, v.body); return v; };
  const later = (n: number) => new Date(Date.parse(today() + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
  const config = async (kind: string, fields: object) => (await ok(request("system_admin", `/api/v1/configuration/${kind}`, { action: "create", expectedVersion: 0, reason: "Synthetic submission periods", fields }))).json();
  const year = await config("academic-years", { code: "WINDOW-YEAR", name: "Submission window year", startsOn: later(-2), endsOn: later(365) });
  const terms = await Promise.all([0, 1].map((n) => config("semesters", { code: `WINDOW-SEM-${n + 1}`, name: `Window semester ${n + 1}`, academicYearId: year.id, startsOn: later(n * 101), endsOn: later(n * 101 + 100) })));
  const cycles: string[] = [];
  for (const [n, term] of terms.entries()) {
    const cycle = randomUUID(); cycles.push(cycle);
    await admin.execute("INSERT INTO payout_cycles(id,code,semester_id) VALUES(?,?,?)", [cycle, `WINDOW-CYCLE-${n + 1}`, term.id]);
    await admin.execute("INSERT INTO payout_cycle_versions(id,cycle_id,version,name,target_date,state,action,reason,reference_text,actor_id,actor_name,recorded_at) VALUES(?,?,1,?,?,'open','open','Synthetic fixture','TEST-WINDOW',?,'Synthetic Coordinator',UTC_TIMESTAMP(6))", [randomUUID(), cycle, `Window cycle ${n + 1}`, later(n * 101), actor]);
  }
  const path = (i = 0) => `/api/v1/payout-cycles/${cycles[i]}/submission-windows`;
  const read = async (i = 0) => (await ok(request("staff", path(i)))).json<SubmissionWindowView>();
  const configure = (n: number) => ({ expectedCycleVersion: 1, termNumber: n + 1, expectedSemesterVersion: 1, expectedYearVersion: 1, deadlineOn: later(n * 101 + 80) });
  for (const role of ["staff", "system_admin", "unassigned"]) assert.equal((await request(role, path() + "/configure", configure(0))).statusCode, 403);
  assert.equal((await request("coordinator", path() + "/configure", { ...configure(0), termNumber: 3 })).statusCode, 422);
  const key = randomUUID(), mapped = await ok(request("coordinator", path() + "/configure", configure(0), key));
  assert.deepEqual((await ok(request("coordinator", path() + "/configure", configure(0), key))).json(), mapped.json());
  assert.equal((await request("coordinator", path() + "/configure", { ...configure(0), deadlineOn: later(90) }, key)).statusCode, 409);
  const window = { expectedCycleVersion: 1, expectedDeadlineRevision: 1, expectedSequence: 0, opensOn: later(0), cutoffOn: later(6) };
  assert.equal((await request("coordinator", path() + "/open-window", window)).json().error.code, "REGULAR_PERIODS_INCOMPLETE");
  assert.equal((await request("coordinator", path(1) + "/configure", { ...configure(1), termNumber: 1 })).statusCode, 409);
  await ok(request("coordinator", path(1) + "/configure", configure(1)));
  assert.equal((await read()).mappedTerms.length, 2);
  assert.equal((await read(1)).deadlines[0].deadlineOn, later(181));
  const legacy = randomUUID();
  await admin.execute("INSERT INTO ovr_batches(id,cycle_id,code,name,created_by,created_at) VALUES(?,?,'PAY-001','Earlier legacy batch',?,UTC_TIMESTAMP(6))", [legacy, cycles[0], actor]);
  await admin.execute("INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,1,'draft','create','{}',?,UTC_TIMESTAMP(6))", [legacy, actor]);
  const races = await Promise.all([request("coordinator", path() + "/open-window", window), request("coordinator", path() + "/open-window", window)]);
  assert.deepEqual(races.map((r) => r.statusCode).sort(), [200, 409]);
  let view = await read(); const first = view.windows[0];
  assert.equal(first.code, "PAY-002"); assert.equal(first.submissionState, "open"); assert.equal(first.processingState, "draft");
  assert.equal(view.legacyBatchesWithUnknownDeadline, 1); assert.equal(view.financialActivationEnabled, true); assert.equal(view.receiptDeadlineEnforcementEnabled, true);
  assert.equal((await request("coordinator", path() + "/open-window", { ...window, expectedSequence: 2, opensOn: later(7), cutoffOn: later(81) })).statusCode, 422);
  assert.equal((await request("staff", path() + "/open-window", window)).statusCode, 403);
  const extend = { expectedCycleVersion: 1, expectedDeadlineRevision: 1, batchId: first.batchId, expectedRevision: 1, cutoffOn: later(8), reason: "Synthetic authorized extension" };
  for (const role of ["staff", "system_admin"]) assert.equal((await request(role, path() + "/extend-window", extend)).statusCode, 403);
  const extensionKey = randomUUID(); await ok(request("coordinator", path() + "/extend-window", extend, extensionKey));
  await ok(request("coordinator", path() + "/extend-window", extend, extensionKey));
  view = await read(); assert.equal(view.windows[0].history.length, 2); assert.equal(view.windows[0].history[1].cutoffOn, later(6));
  assert.equal((await request("coordinator", path() + "/open-window", { ...window, expectedSequence: 2, opensOn: later(8), cutoffOn: later(10) })).statusCode, 409);
  const secondBody = { ...window, expectedSequence: 2, opensOn: later(9), cutoffOn: later(15) };
  const second = (await ok(request("coordinator", path() + "/open-window", secondBody))).json();
  assert.equal((await request("coordinator", path() + "/extend-window", { ...extend, expectedRevision: 2, cutoffOn: later(9) })).statusCode, 409);
  const semesterExtend = { expectedCycleVersion: 1, expectedRevision: 1, deadlineOn: later(90), reason: "Synthetic final deadline extension" };
  const semRace = await Promise.all([request("coordinator", path() + "/extend-semester", semesterExtend), request("coordinator", path() + "/extend-semester", { ...semesterExtend, deadlineOn: later(95) })]);
  assert.deepEqual(semRace.map((r) => r.statusCode).sort(), [200, 409]);
  assert.equal((await read()).deadlines[1].deadlineOn, later(80));
  assert.equal((await read(1)).deadlines.length, 1);
  assert.equal((await request("coordinator", path() + "/extend-window", { ...extend, expectedRevision: 2 })).statusCode, 409);
  const before = await read();
  await admin.query("CREATE TRIGGER reject_window_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payroll.submission' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  const thirdBody = { ...window, expectedDeadlineRevision: 2, expectedSequence: 3, opensOn: later(16), cutoffOn: later(22) };
  try { assert.equal((await request("coordinator", path() + "/open-window", thirdBody)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_window_audit"); }
  assert.deepEqual((await read()).windows, before.windows);
  const third = (await ok(request("coordinator", path() + "/open-window", thirdBody))).json();
  assert.equal((await read()).windows[2].code, "PAY-004");
  for (const role of ["staff", "coordinator"]) {
    assert.equal((await request(role, `/api/v1/payout-cycles/${cycles[0]}/ovr-batches`, { expectedRevision: 0, expectedCycleVersion: 1, code: "BYPASS", name: "Bypass draft", reason: "Synthetic bypass test", reference: "TEST-WINDOW" })).json().error.code, "MANAGED_PAYROLL_SETUP_ONLY");
    assert.equal((await request(role, `/api/v1/ovr-batches/${first.batchId}/submit-review`, { expectedRevision: 1, reason: "Synthetic bypass test", reference: "TEST-WINDOW" })).json().error.code, "SOURCE_CHANGED");
  }
  await admin.execute("INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,2,'submitted','submit','{}',?,UTC_TIMESTAMP(6))", [first.batchId, actor]);
  assert.equal((await request("coordinator", path() + "/extend-window", { ...extend, expectedRevision: 2, expectedDeadlineRevision: 2 })).statusCode, 423);
  assert.equal((await read()).windows[1].submissionState, "scheduled");
  const preserved = JSON.stringify((await admin.execute<RowDataPacket[]>("SELECT * FROM ovr_batch_events WHERE batch_id=? ORDER BY revision", [first.batchId]))[0]);
  await admin.execute("UPDATE payroll_submission_window_versions SET opens_on=?,cutoff_on=?,previous_cutoff_on=CASE WHEN revision=1 THEN NULL ELSE ? END WHERE batch_id=?", [later(-10), later(-1), later(-2), first.batchId]);
  try {
    assert.equal((await read()).windows[0].submissionState, "cutoff_reached");
    assert.equal((await read()).windows[0].processingState, "submitted");
    assert.equal(JSON.stringify((await admin.execute<RowDataPacket[]>("SELECT * FROM ovr_batch_events WHERE batch_id=? ORDER BY revision", [first.batchId]))[0]), preserved);
  } finally {
    await admin.execute("UPDATE payroll_submission_window_versions SET opens_on=?,cutoff_on=?,previous_cutoff_on=NULL WHERE batch_id=? AND revision=1", [later(0), later(6), first.batchId]);
    await admin.execute("UPDATE payroll_submission_window_versions SET opens_on=?,cutoff_on=?,previous_cutoff_on=CASE WHEN revision=1 THEN NULL ELSE ? END WHERE batch_id=? AND revision=2", [later(0), later(8), later(6), first.batchId]);
  }
  await admin.execute("UPDATE semesters SET version=version+1 WHERE id=?", [terms[0].id]);
  try { assert.equal((await request("coordinator", path() + "/extend-semester", { ...semesterExtend, expectedRevision: 2, deadlineOn: later(99) })).json().error.code, "PERIOD_MAPPING_REVIEW"); }
  finally { await admin.execute("UPDATE semesters SET version=version-1 WHERE id=?", [terms[0].id]); }
  await new AuthorizationService(runtime).withPermission(staffId, "configuration.read", async (db) => {
    for (const table of ["regular_payout_periods", "semester_submission_versions", "payroll_submission_windows", "payroll_submission_window_versions"])
      for (const sql of [`EXPLAIN DELETE FROM ${table} WHERE 1=0`, `EXPLAIN UPDATE ${table} SET cycle_id=cycle_id WHERE 1=0`]) await assert.rejects(db.query(sql));
  });
  assert.notEqual(second.id, third.id);
  console.log("PASS Checkpoint A: two mapped terms, Manila windows, roles, sequential numbering/cutoffs, explicit extensions, retries/races, stale mapping, audit rollback, legacy unknown timing and independent processing state");
}
