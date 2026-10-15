import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { ConfigRecord } from "../server/configuration/model.js";

export async function testRegularCoverage({ admin, request, config, scholar, setupPath, actor }: {
  admin: Connection; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
  config: (kind: string, fields: object) => Promise<ConfigRecord>; scholar: string; setupPath: string; actor: string;
}) {
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const error = async (p: Promise<LightMyRequestResponse>, code: string) => { const r = await p; assert.equal(r.statusCode, 409, r.body); assert.equal(r.json().error.code, code); };
  const [terms] = await admin.query<RowDataPacket[]>("SELECT id,academic_year_id,version,code FROM semesters WHERE code IN ('SETUP-CURRENT','SETUP-NEXT','SETUP-PRIOR') ORDER BY starts_on");
  const previous = terms.find((t) => t.code === "SETUP-CURRENT")!, current = terms.find((t) => t.code === "SETUP-NEXT")!, older = terms.find((t) => t.code === "SETUP-PRIOR")!;
  assert.ok(previous && current && older);
  const cycles: string[] = [];
  const map = async (id: string, year: string, number: number) => {
    const cycle = randomUUID(); cycles.push(cycle);
    await admin.execute("INSERT INTO payout_cycles(id,code,semester_id) VALUES(?,?,?)", [cycle, `COV-${cycle}`, id]);
    await admin.execute("INSERT INTO regular_payout_periods(cycle_id,semester_id,academic_year_id,term_number,semester_version,year_version,actor_id,recorded_at) SELECT ?,s.id,y.id,?,s.version,y.version,?,UTC_TIMESTAMP(6) FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=? AND y.id=?", [cycle, number, actor, id, year]);
  };
  const listPath = `/api/v1/scholars/${scholar}/semester-requirements`;
  const list = async () => (await ok(request("staff", listPath))).json().items.find((c: {semesterId:string}) => c.semesterId === current.id);
  const initial = await list(), cog = initial.items.find((i: {coverage:{kind:string}}) => i.coverage.kind === "cog");
  const docPath = `/api/v1/requirement-instances/${cog.id}`;
  const context = async () => (await ok(request("staff", docPath + "/verification-context"))).json();
  assert.equal((await context()).predecessorSourceHash, undefined);
  const historyBefore = (await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_workflow_events WHERE instance_id=? ORDER BY version", [cog.id]))[0];
  const [coverageBefore] = await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_coverage WHERE requirement_instance_id=? ORDER BY revision DESC", [cog.id]);
  const coverage = coverageBefore[0];
  const [[owner]] = await admin.execute<RowDataPacket[]>("SELECT scholar_semester_id FROM requirement_checklists WHERE id=?", [initial.id]);
  const [[revision]] = await admin.execute<RowDataPacket[]>("SELECT revision FROM scholar_semester_revisions WHERE scholar_semester_id=? ORDER BY revision DESC LIMIT 1", [owner.scholar_semester_id]);
  try {
    await map(previous.id, previous.academic_year_id, 1); await map(current.id, current.academic_year_id, 2);
    const regular = (await ok(request("coordinator", `${setupPath}?semesterId=${current.id}`))).json().coverage;
    assert.equal(regular.predecessorId, previous.id); assert.equal(regular.issue, null);
    assert.equal((await context()).predecessorSourceHash, regular.sourceHash);
    const compliance = (await ok(request("staff", `${listPath}/${current.id}/compliance`))).json();
    assert.equal(compliance.stale, true); assert.equal(compliance.documents.find((d: {id:string}) => d.id === cog.id).verified, true, "A valid old paper does not require a fabricated new receipt just to attach calendar evidence");
    await admin.execute("UPDATE scholar_semester_revisions SET predecessor_semester_id=? WHERE scholar_semester_id=? AND revision=?", [older.id, owner.scholar_semester_id, revision.revision]);
    await admin.execute("UPDATE requirement_coverage SET coverage_semester_id=? WHERE id=?", [older.id, coverage.id]);
    try {
      await error(request("staff", docPath + "/verification-context"), "PREDECESSOR_REVIEW_REQUIRED");
      const receipt = { expectedVersion: 0, receivedOn: "2026-10-07", physicalReference: null, storageLocation: "Synthetic cabinet", remarks: null, reason: "Synthetic receipt" };
      await error(request("staff", docPath + "/receive", receipt), "PREDECESSOR_REVIEW_REQUIRED");
      await error(request("staff", `/api/v1/requirement-checklists/${initial.id}/receive`, { items: [{ id: cog.id, expectedVersion: 0 }], receivedOn: receipt.receivedOn, physicalReference: null, storageLocation: null, remarks: null }), "PREDECESSOR_REVIEW_REQUIRED");
      await error(request("staff", docPath + "/resubmit", { action: "resubmit", expectedVersion: cog.version, effectiveOn: receipt.receivedOn, physicalReference: null, storageLocation: "Synthetic cabinet", remarks: null, reason: "Synthetic replacement", reference: "TEST" }), "PREDECESSOR_REVIEW_REQUIRED");
      await error(request("coordinator", docPath + "/waive", { expectedVersion: cog.version, effectiveOn: receipt.receivedOn, reason: "Synthetic waiver", authorityReference: "TEST", remarks: null }), "PREDECESSOR_REVIEW_REQUIRED");
    } finally {
      await admin.execute("UPDATE scholar_semester_revisions SET predecessor_semester_id=? WHERE scholar_semester_id=? AND revision=?", [previous.id, owner.scholar_semester_id, revision.revision]);
      await admin.execute("UPDATE requirement_coverage SET coverage_semester_id=? WHERE id=?", [coverage.coverage_semester_id, coverage.id]);
    }
    await admin.execute("UPDATE semesters SET version=version+1 WHERE id=?", [previous.id]);
    try { await error(request("staff", docPath + "/verification-context"), "PREDECESSOR_REVIEW_REQUIRED"); }
    finally { await admin.execute("UPDATE semesters SET version=version-1 WHERE id=?", [previous.id]); }
    assert.deepEqual((await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_workflow_events WHERE instance_id=? ORDER BY version", [cog.id]))[0], historyBefore);
    assert.deepEqual((await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_coverage WHERE requirement_instance_id=? ORDER BY revision DESC", [cog.id]))[0], coverageBefore);
    const [[scope]] = await admin.execute<RowDataPacket[]>("SELECT w.* FROM workflow_scope_versions w JOIN scholar_semesters ss ON ss.semester_id=w.semester_id JOIN workflow_scope_versions owned ON owned.id=ss.scope_version_id AND owned.cohort_code=w.cohort_code WHERE ss.id=? ORDER BY w.revision DESC LIMIT 1", [owner.scholar_semester_id]);
    const [[policy]] = await admin.execute<RowDataPacket[]>("SELECT rules FROM workflow_policy_versions WHERE id=?", [scope.policy_version_id]);
    await admin.execute("UPDATE workflow_policy_versions SET rules=JSON_SET(rules,'$.predecessorSemesterId',?) WHERE id=?", [older.id, scope.policy_version_id]);
    try { await error(request("staff", listPath + "/provision", { periodId: current.id }), "PREDECESSOR_REVIEW_REQUIRED"); }
    finally { await admin.execute("UPDATE workflow_policy_versions SET rules=? WHERE id=?", [policy.rules, scope.policy_version_id]); }
    const disabledScope = randomUUID();
    await admin.execute("INSERT INTO workflow_scope_versions(id,semester_id,cohort_code,revision,mode,policy_version_id,actor_id,recorded_at) VALUES(?,?,?,?,'disabled',?,?,UTC_TIMESTAMP(6))", [disabledScope, current.id, scope.cohort_code, scope.revision + 1, scope.policy_version_id, actor]);
    try {
      const resume = { scopeId: disabledScope, expectedRevision: scope.revision + 1, mode: "enabled", expectedSemesterVersion: current.version, expectedPredecessorVersion: previous.version, expectedRecordCount: 1, reviewed: true, reason: "Synthetic calendar recovery review" };
      await error(request("coordinator", setupPath + "/recover", resume), "SOURCE_CHANGED");
      await error(request("coordinator", setupPath + "/recover", { ...resume, expectedCoverageHash: regular.sourceHash }), "SEMESTER_RECOVERY_REVIEW_REQUIRED");
    } finally { await admin.execute("DELETE FROM workflow_scope_versions WHERE id=?", [disabledScope]); }
    // An explicit correction/reverification pins calendar evidence without replacing older events.
    const common = { effectiveOn: "2026-10-07", reason: "Synthetic regular coverage re-review", reference: "TEST-COVERAGE", remarks: null };
    const act = async (action: string, version: number, fields: object = {}) => ok(request("staff", `${docPath}/${action}`, { ...common, action, expectedVersion: version, ...fields }));
    await act("return-for-correction", cog.version, { correctionOf: cog.history.at(-1).id });
    await act("resubmit", cog.version + 1, { physicalReference: null, storageLocation: "Synthetic cabinet", documentType: "cog" });
    await act("send-for-verification", cog.version + 2);
    const c = await context();
    const document = { scholarId: c.scholarId, scholarVersion: c.scholarVersion, academicYearId: c.academicYearId, semesterId: c.semesterId, schoolId: c.schoolId, courseId: c.courseId, academicVersion: c.academicVersion, definitionVersionId: c.definitionVersionId, coverageId: c.coverageId, semesterRevision: c.semesterRevision, predecessorSourceHash: c.predecessorSourceHash };
    const verify = { ...common, action: "verify", expectedVersion: cog.version + 3, document, checks: { identity: true, period: true, placement: true, applicability: true, validity: true } };
    await error(request("staff", docPath + "/verify", { ...verify, document: { ...document, predecessorSourceHash: "0".repeat(64) } }), "SOURCE_CHANGED");
    await ok(request("staff", docPath + "/verify", verify));
    const [after] = await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_workflow_events WHERE instance_id=? ORDER BY version", [cog.id]);
    assert.deepEqual(after.slice(0, historyBefore.length), historyBefore);
    assert.equal(JSON.parse(after.at(-1)!.details).verification.predecessorSourceHash, regular.sourceHash);
  } finally {
    for (const cycle of cycles) {
      await admin.execute("DELETE FROM regular_payout_periods WHERE cycle_id=?", [cycle]);
      await admin.execute("DELETE FROM payout_cycles WHERE id=?", [cycle]);
    }
    cycles.length = 0;
  }

  // Clean future calendar exercises setup commands and provides a browser review fixture.
  const year = await config("academic-years", { code: "COV-2030", name: "Coverage test year", startsOn: "2030-01-01", endsOn: "2030-12-31" });
  const first = await config("semesters", { code: "COV-FIRST", name: "Coverage first semester", academicYearId: year.id, startsOn: "2030-01-01", endsOn: "2030-06-30" });
  const second = await config("semesters", { code: "COV-SECOND", name: "Coverage second semester", academicYearId: year.id, startsOn: "2030-07-01", endsOn: "2030-12-31" });
  await map(first.id, year.id, 1); await map(second.id, year.id, 2);
  for (const code of ["COV-COR", "COV-COG"]) await ok(request("system_admin", "/api/v1/requirement-definitions", { action: "create", code, expectedVersion: 0, reason: "Synthetic coverage definitions", reference: "TEST", fields: { documentKind: code.endsWith("COR") ? "enrollment" : "grades", name: code, instructions: "Synthetic only", appliesTo: "semester", semesterId: second.id, effectiveFrom: "2030-07-01", effectiveUntil: null } }));
  const options = async () => (await ok(request("coordinator", `${setupPath}?semesterId=${second.id}&policyDate=2030-07-01`))).json();
  const available = await options(); assert.equal(available.coverage.predecessorId, first.id);
  const body = { policyDate: "2030-07-01", semesterId: second.id, expectedSemesterVersion: second.version, coverageReason: "Synthetic explicitly reviewed predecessor calendar", predecessorSemesterId: first.id, expectedCoverageHash: available.coverage.sourceHash, corDefinitionVersionId: available.definitions.find((d: {code:string}) => d.code === "COV-COR").id, cogDefinitionVersionId: available.definitions.find((d: {code:string}) => d.code === "COV-COG").id, issuer: "Synthetic committee", reference: "TEST", sourceReference: "Synthetic regular calendar", reviewed: true };
  await error(request("coordinator", setupPath, { ...body, coverageReason: "Synthetic explicitly reviewed predecessor calendar", predecessorSemesterId: older.id }), "PREDECESSOR_REVIEW_REQUIRED");
  await error(request("coordinator", setupPath, { ...body, expectedCoverageHash: "0".repeat(64) }), "SOURCE_CHANGED");
  await admin.query("CREATE TRIGGER reject_coverage_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.setup' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  const key = randomUUID();
  try { assert.equal((await request("coordinator", setupPath, body, key)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_coverage_audit"); }
  assert.equal((await options()).setups.some((s: {semesterId:string}) => s.semesterId === second.id), false);
  const saved = (await ok(request("coordinator", setupPath, body, key))).json();
  assert.deepEqual((await ok(request("coordinator", setupPath, body, key))).json(), saved);
  const [[policy]] = await admin.execute<RowDataPacket[]>("SELECT p.rules FROM workflow_scope_versions w JOIN workflow_policy_versions p ON p.id=w.policy_version_id WHERE w.id=?", [saved.id]);
  assert.equal(JSON.parse(policy.rules).regularCoverage.sourceHash, available.coverage.sourceHash);
  // An additional period cannot be silently ignored or treated as a regular predecessor.
  await config("semesters", { code: "COV-SUMMER", name: "Unresolved summer calendar", academicYearId: year.id, startsOn: "2030-06-01", endsOn: "2030-06-15" });
  assert.match((await options()).coverage.issue, /overlaps or intervenes/);
  if (process.argv.includes("--browser")) {
    const browserYear = await config("academic-years", { code: "COV-2031", name: "Coverage browser year", startsOn: "2031-01-01", endsOn: "2031-12-31" });
    const browserFirst = await config("semesters", { code: "COV-DEMO-FIRST", name: "Browser first semester", academicYearId: browserYear.id, startsOn: "2031-01-01", endsOn: "2031-06-30" });
    const browserSecond = await config("semesters", { code: "COV-DEMO-SECOND", name: "Browser second semester", academicYearId: browserYear.id, startsOn: "2031-07-01", endsOn: "2031-12-31" });
    await map(browserFirst.id, browserYear.id, 1); await map(browserSecond.id, browserYear.id, 2);
    for (const code of ["DEMO-COR", "DEMO-COG"]) await ok(request("system_admin", "/api/v1/requirement-definitions", { action: "create", code, expectedVersion: 0, reason: "Synthetic browser definitions", reference: "TEST", fields: { documentKind: code.endsWith("COR") ? "enrollment" : "grades", name: code, instructions: "Synthetic only", appliesTo: "semester", semesterId: browserSecond.id, effectiveFrom: "2031-07-01", effectiveUntil: null } }));
  }
  console.log("PASS Regular predecessor: canonical term mapping, wrong earlier COG and stale mapping blocked across receive/resubmit/verify/waiver, stale compliance, immutable history, setup source hashes, retries/audit rollback and ambiguous calendar review");
}
