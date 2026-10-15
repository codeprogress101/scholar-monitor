import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { SemesterComplianceView } from "../server/continuing/semester-compliance.js";
import type { AcademicFindings } from "../server/continuing/compliance-engine.js";
import type { RequirementAction } from "../server/requirements/workflow-model.js";

export async function testEndedCompliance({ admin, request, path, semesterId, actor, scholar, findings, cogId, act, verify }: {
  admin: Connection; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
  path: string; semesterId: string; actor: string; scholar: string; findings: AcademicFindings; cogId: string;
  act: (id: string, action: RequirementAction, extra?: object) => Promise<LightMyRequestResponse>;
  verify: (id: string) => Promise<void>;
}) {
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const error = async (p: Promise<LightMyRequestResponse>, status: number, code: string) => { const r = await p; assert.equal(r.statusCode, status, r.body); assert.equal(r.json().error.code, code); };
  const view = async () => (await ok(request("staff", path))).json<SemesterComplianceView>(), endpoint = path + "/ended-review";
  const body = async (f = findings) => { const v = await view(); return { sourceHash: v.sourceHash, expectedRevision: v.revision, findings: f, reviewed: true, academicOnly: true, reason: "Synthetic academic review after the semester ended" }; };
  await error(request("coordinator", endpoint, await body()), 409, "COMPLIANCE_REVIEW_BLOCKED");
  const original = await view(), policyId = original.gradingRule!.id;
  const [[period]] = await admin.execute<RowDataPacket[]>("SELECT DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends,academic_year_id FROM semesters WHERE id=?", [semesterId]);
  const [[policy]] = await admin.execute<RowDataPacket[]>("SELECT DATE_FORMAT(effective_until,'%Y-%m-%d') AS ends,authority_version_id FROM workflow_policy_versions WHERE id=?", [policyId]);
  const [[owner]] = await admin.execute<RowDataPacket[]>("SELECT id,scope_version_id FROM scholar_semesters WHERE scholar_id=? AND semester_id=?", [scholar, semesterId]);
  // Only this disposable fixture's dates are adjusted to simulate the passage of time.
  await admin.execute("UPDATE semesters SET ends_on='2026-10-06' WHERE id=?", [semesterId]);
  await admin.execute("UPDATE workflow_policy_versions SET effective_until='2026-10-06' WHERE id=?", [policyId]);
  const cycle = randomUUID();
  await admin.execute("INSERT INTO payout_cycles(id,code,semester_id) VALUES(?,?,?)", [cycle, `ENDED-${cycle}`, semesterId]);
  await admin.execute("INSERT INTO payout_cycle_versions(id,cycle_id,version,name,target_date,state,action,reason,reference_text,actor_id,actor_name,recorded_at) VALUES(?,?,1,'Synthetic closed payroll','2026-10-06','closed','close','Synthetic fixture','TEST-CLOSED',?,'Synthetic Coordinator',UTC_TIMESTAMP(6))", [randomUUID(), cycle, actor]);
  const financialTables = ["payout_cycles", "payout_cycle_versions", "payout_eligibility", "semester_entitlements", "payment_records", "scholarship_records"];
  const financial = async () => Promise.all(financialTables.map(async (table) => (await admin.query<RowDataPacket[]>(`SELECT * FROM ${table} ORDER BY id`))[0]));
  const financialBefore = await financial();
  try {
    const ended = await view(); assert.equal(ended.ended, true); assert.equal(ended.endedReviewBlocker, null); assert.equal(ended.gradingRule!.id, policyId);
    for (const role of ["staff", "system_admin", "unassigned"]) await error(request(role, endpoint, await body()), 403, "PERMISSION_DENIED");
    for (const role of ["staff", "coordinator"]) {
      const b = await body(); const { academicOnly: _, ...normal } = b; void _;
      await error(request(role, path, normal), 409, "COMPLIANCE_REVIEW_BLOCKED");
    }
    for (const change of [{ academicOnly: false }, { reason: "" }, { reviewed: false }, { result: "compliant" }]) await error(request("coordinator", endpoint, { ...await body(), ...change }), 422, "VALIDATION_FAILED");
    await error(request("coordinator", endpoint, { ...await body(), sourceHash: original.sourceHash }), 409, "SOURCE_CHANGED");
    await error(request("coordinator", endpoint, { ...await body(), expectedRevision: 0 }), 409, "VERSION_CONFLICT");
    const blocked = async (set: string, restore: string, args: string[]) => {
      await admin.execute(set, args);
      try { assert.ok((await view()).endedReviewBlocker); await error(request("coordinator", endpoint, await body()), 409, "COMPLIANCE_REVIEW_BLOCKED"); }
      finally { await admin.execute(restore, args); }
    };
    await blocked("UPDATE semesters SET locked_at=UTC_TIMESTAMP(6) WHERE id=?", "UPDATE semesters SET locked_at=NULL WHERE id=?", [semesterId]);
    await blocked("UPDATE academic_years SET locked_at=UTC_TIMESTAMP(6) WHERE id=?", "UPDATE academic_years SET locked_at=NULL WHERE id=?", [period.academic_year_id]);
    await blocked("UPDATE semesters SET archived_at=UTC_TIMESTAMP(6) WHERE id=?", "UPDATE semesters SET archived_at=NULL WHERE id=?", [semesterId]);
    await blocked("UPDATE workflow_authority_versions SET valid_from='2026-10-01',valid_until='2026-10-06' WHERE id=?", "UPDATE workflow_authority_versions SET valid_from='2026-10-07',valid_until=NULL WHERE id=?", [policy.authority_version_id]);
    await blocked("UPDATE workflow_policy_versions SET effective_until='2026-10-05' WHERE id=?", "UPDATE workflow_policy_versions SET effective_until='2026-10-06' WHERE id=?", [policyId]);
    const [[scope]] = await admin.execute<RowDataPacket[]>("SELECT w.id FROM workflow_scope_versions w JOIN scholar_semesters ss ON ss.semester_id=w.semester_id JOIN workflow_scope_versions old ON old.id=ss.scope_version_id AND old.cohort_code=w.cohort_code WHERE ss.id=? ORDER BY w.revision DESC LIMIT 1", [owner.id]);
    await blocked("UPDATE workflow_scope_versions SET mode='disabled' WHERE id=?", "UPDATE workflow_scope_versions SET mode='enabled' WHERE id=?", [scope.id]);
    const entitlement = randomUUID();
    await admin.execute("INSERT INTO semester_entitlements(id,scholar_semester_id,scholar_id,semester_id,benefit_type,amount_centavos,currency,actor_id,recorded_at) VALUES(?,?,?,?,'degree_stipend',500000,'PHP',?,UTC_TIMESTAMP(6))", [entitlement, owner.id, scholar, semesterId, actor]);
    try { await error(request("coordinator", endpoint, await body()), 409, "COMPLIANCE_REVIEW_BLOCKED"); }
    finally { await admin.execute("DELETE FROM semester_entitlements WHERE id=?", [entitlement]); }

    const history = (await admin.execute<RowDataPacket[]>("SELECT * FROM semester_review_events WHERE scholar_semester_id=? ORDER BY revision", [owner.id]))[0];
    const inc = { ...findings, hasIncomplete: true }, input = await body(inc), key = randomUUID(), otherKey = randomUUID();
    await admin.query("CREATE TRIGGER reject_ended_review BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.compliance.ended_review' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
    try { assert.equal((await request("coordinator", endpoint, input, key)).statusCode, 500); }
    finally { await admin.query("DROP TRIGGER reject_ended_review"); }
    assert.equal((await view()).revision, original.revision);
    const race = await Promise.all([request("coordinator", endpoint, input, key), request("reviewer", endpoint, input, otherKey)]);
    assert.deepEqual(race.map((r) => r.statusCode).sort(), [200, 409]);
    const winner = race[0].statusCode === 200 ? "coordinator" : "reviewer", winningKey = winner === "coordinator" ? key : otherKey;
    const saved = (await ok(request(winner, endpoint, input, winningKey))).json();
    assert.equal(saved.result, "noncompliant"); assert.equal(saved.revision, original.revision + 1);
    await error(request(winner, endpoint, { ...input, reason: "Changed justification" }, winningKey), 409, "IDEMPOTENCY_CONFLICT");
    assert.equal((await view()).history[0].academicOnly, true);
    await error(request("coordinator", endpoint, await body()), 409, "CORRECTED_COG_REQUIRED");
    const correctionOf = (await view()).documents.find((d) => d.id === cogId)!.eventId;
    await act(cogId, "return-for-correction", { correctionOf });
    await error(request("coordinator", endpoint, await body()), 409, "COMPLIANCE_REVIEW_BLOCKED");
    await act(cogId, "resubmit", { physicalReference: null, storageLocation: "Synthetic INC resolution after semester end" });
    await verify(cogId);
    assert.equal((await ok(request("coordinator", endpoint, await body()))).json().result, "compliant");
    const after = await view(); assert.equal(after.stale, false); assert.equal(after.result, "compliant"); assert.equal(after.history[0].academicOnly, true);
    assert.equal(after.history.find((r) => r.id === saved.id)!.findings.hasIncomplete, true);
    const [[audit]] = await admin.execute<RowDataPacket[]>("SELECT details FROM audit_logs WHERE event_type='semester.compliance.ended_review' AND entity_id=? ORDER BY occurred_at DESC LIMIT 1", [owner.id]);
    const details = typeof audit.details === "string" ? JSON.parse(audit.details) : audit.details; assert.equal(details.academicOnly, true); assert.equal(details.endedOn, "2026-10-06");
    assert.deepEqual((await admin.execute<RowDataPacket[]>("SELECT * FROM semester_review_events WHERE scholar_semester_id=? AND revision<=? ORDER BY revision", [owner.id, original.revision]))[0], history);
    assert.deepEqual(await financial(), financialBefore);
  } finally {
    await admin.execute("DELETE FROM payout_cycle_versions WHERE cycle_id=?", [cycle]);
    await admin.execute("DELETE FROM payout_cycles WHERE id=?", [cycle]);
    await admin.execute("UPDATE semesters SET ends_on=? WHERE id=?", [period.ends, semesterId]);
    await admin.execute("UPDATE workflow_policy_versions SET effective_until=? WHERE id=?", [policy.ends, policyId]);
  }
  console.log("PASS Ended academic review: Coordinator-only INC resolution, verified evidence, covered rule, locks/dependencies, concurrent retry, rollback and closed payroll preservation");
}
