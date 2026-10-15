import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { ConfigRecord } from "../server/configuration/model.js";
import type { SemesterComplianceView } from "../server/continuing/semester-compliance.js";
import type { VerificationContext, RequirementAction } from "../server/requirements/workflow-model.js";
import type { AcademicFindings } from "../server/continuing/compliance-engine.js";
import { testGradingReplacement } from "./test-grading-replacement-scenarios.js";
import { testEndedCompliance } from "./test-ended-compliance-scenarios.js";
import { testFindingCorrection } from "./test-finding-correction-scenarios.js";
import { testGradingRecovery } from "./test-grading-recovery-scenarios.js";
import { testSemesterEligibility } from "./test-semester-eligibility-scenarios.js";

export async function testSemesterCompliance(input: {
  admin: Connection; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
  base: string; setupPath: string; semester: ConfigRecord; previous: ConfigRecord; actor: string; scholar: string;
}) {
  const { admin, request, base, setupPath, semester, previous, actor, scholar } = input;
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const error = async (p: Promise<LightMyRequestResponse>, status: number, code: string) => { const r = await p; assert.equal(r.statusCode, status, r.body); assert.equal(r.json().error.code, code); };
  const path = `${base}/${semester.id}/compliance`, view = async () => (await ok(request("staff", path))).json<SemesterComplianceView>();
  assert.match((await view()).writeBlocker!, /unavailable/);
  const setup = (await ok(request("coordinator", setupPath))).json().setups.find((s: {current:boolean;semesterId:string}) => s.current && s.semesterId === semester.id);
  await ok(request("coordinator", setupPath + "/recover", { scopeId: setup.id, expectedRevision: setup.revision, mode: "enabled", expectedRecordCount: 1, expectedSemesterVersion: semester.version, expectedPredecessorVersion: previous.version, reason: "Synthetic compliance review setup recovery", reviewed: true }));
  const academicPath = `${base}/${semester.id}/academic-context`, academic = (await ok(request("staff", academicPath))).json();
  await ok(request("coordinator", academicPath + "/correct-category", { expectedRevision: academic.revision, academicRecordId: academic.current.id, expectedAcademicVersion: academic.current.version, category: "degree", reason: "Synthetic return to degree category for compliance", reference: "TEST-DEGREE-COR", reviewed: true }));
  const initial = await view(); assert.equal(initial.result, "review_required"); assert.equal(initial.gradingRule, null); assert.equal(initial.writeBlocker, null);
  const clean: AcademicFindings = { average: "2.50", enrolled: true, fullLoad: true, hasFailed: false, hasDropped: false, hasIncomplete: false };
  const body = async (findings = clean) => { const v = await view(); return { sourceHash: v.sourceHash, expectedRevision: v.revision, findings, reviewed: true }; };
  for (const role of ["system_admin", "unassigned"]) await error(request(role, path, await body()), 403, "PERMISSION_DENIED");
  await error(request("staff", path, { ...await body(), reviewed: false }), 422, "VALIDATION_FAILED");
  await error(request("staff", path, { ...await body(), result: "compliant" }), 422, "VALIDATION_FAILED");
  await error(request("staff", path, { ...await body(), findings: { ...clean, average: "2.50001" } }), 422, "VALIDATION_FAILED");
  // Unverified documents cannot produce compliance even with favorable recorded findings.
  assert.equal((await ok(request("staff", path, await body()))).json().result, "review_required");
  const draft = (await view()).history[0];
  const policyBody = { sourceHash: (await view()).sourceHash, kind: "native", rule: null, issuer: "Synthetic authorized Coordinator", authorityReference: "TEST-GRADING-AUTH", sourceReference: "Synthetic school approved 1-best scale", reviewed: true };
  for (const role of ["staff", "system_admin", "unassigned"]) await error(request(role, path + "/grading-rule", policyBody), 403, "PERMISSION_DENIED");
  await error(request("coordinator", path + "/grading-rule", { ...policyBody, kind: "equivalent" }), 422, "VALIDATION_FAILED");
  const policyKey = randomUUID();
  await admin.query("CREATE TRIGGER reject_grade_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.grading.configure' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  try { assert.equal((await request("coordinator", path + "/grading-rule", policyBody, policyKey)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_grade_audit"); }
  assert.equal((await view()).gradingRule, null);
  const otherPolicyKey = randomUUID(), policyRace = await Promise.all([request("coordinator", path + "/grading-rule", policyBody, policyKey), request("reviewer", path + "/grading-rule", policyBody, otherPolicyKey)]);
  assert.deepEqual(policyRace.map((r) => r.statusCode).sort(), [200, 409]);
  const policyWinner = policyRace[0].statusCode === 200 ? "coordinator" : "reviewer", winningPolicyKey = policyWinner === "coordinator" ? policyKey : otherPolicyKey;
  const policyResult = (await ok(request(policyWinner, path + "/grading-rule", policyBody, winningPolicyKey))).json();
  assert.deepEqual((await ok(request(policyWinner, path + "/grading-rule", policyBody, winningPolicyKey))).json(), policyResult);
  await error(request(policyWinner, path + "/grading-rule", { ...policyBody, sourceReference: "Changed" }, winningPolicyKey), 409, "IDEMPOTENCY_CONFLICT");
  assert.equal((await view()).stale, true);
  await error(request("coordinator", path + "/grading-rule", { ...policyBody, sourceHash: (await view()).sourceHash }), 409, "GRADING_POLICY_REVIEW_REQUIRED");
  await error(request("staff", path, { ...await body(), sourceHash: initial.sourceHash }), 409, "SOURCE_CHANGED");
  assert.equal((await ok(request("staff", path, await body()))).json().result, "pending");

  const list = async () => (await ok(request("staff", base))).json().items.find((c: {semesterId:string}) => c.semesterId === semester.id);
  const checklist = await list(), cor = checklist.items.find((d: {coverage:{kind:string}}) => d.coverage.kind === "cor"), cog = checklist.items.find((d: {coverage:{kind:string}}) => d.coverage.kind === "cog");
  await ok(request("staff", `/api/v1/requirement-checklists/${checklist.id}/receive`, { items: [{ id: cog.id, expectedVersion: 0 }], receivedOn: "2026-10-07", physicalReference: null, storageLocation: null, remarks: null }));
  const act = async (id: string, action: RequirementAction, extra: object = {}) => {
    const item = (await list()).items.find((d: {id:string}) => d.id === id);
    return ok(request("staff", `/api/v1/requirement-instances/${id}/${action}`, { action, expectedVersion: item.version, effectiveOn: "2026-10-07", reason: "Synthetic document review", reference: "TEST-SEMESTER", remarks: null, ...extra }));
  };
  const verify = async (id: string) => {
    await act(id, "send-for-verification");
    const c = (await ok(request("staff", `/api/v1/requirement-instances/${id}/verification-context`))).json<VerificationContext>();
    const { scholarId, scholarVersion, academicYearId, semesterId, schoolId, courseId, academicVersion, definitionVersionId, coverageId, semesterRevision } = c;
    await act(id, "verify", { document: { scholarId, scholarVersion, academicYearId, semesterId, schoolId, courseId, academicVersion, definitionVersionId, coverageId, semesterRevision }, checks: { identity: true, period: true, placement: true, applicability: true, validity: true } });
  };
  await verify(cor.id); await verify(cog.id);
  assert.equal((await view()).stale, true); assert.notEqual((await view()).result, "compliant");
  const inc = { ...clean, hasIncomplete: true }, incBody = await body(inc), key = randomUUID();
  await admin.query("CREATE TRIGGER reject_compliance_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.compliance.review' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  const before = await view();
  try { assert.equal((await request("staff", path, incBody, key)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_compliance_audit"); }
  assert.deepEqual((await view()).history, before.history);
  const races = await Promise.all([request("staff", path, incBody, key), request("coordinator", path, incBody)]);
  assert.deepEqual(races.map((r) => r.statusCode).sort(), [200, 409]);
  if (races[0].statusCode === 200) {
    assert.deepEqual((await ok(request("staff", path, incBody, key))).json(), races[0].json());
    await error(request("staff", path, { ...incBody, findings: clean }, key), 409, "IDEMPOTENCY_CONFLICT");
  }
  const incView = await view(); assert.equal(incView.result, "noncompliant"); assert.equal(incView.history[0].findings.hasIncomplete, true);
  for (const role of ["staff", "coordinator"]) await error(request(role, path, { ...await body(), reason: "Attempt to clear without corrected evidence" }), 409, "CORRECTED_COG_REQUIRED");
  await error(request("staff", path, { ...await body(inc), expectedRevision: 0 }), 409, "VERSION_CONFLICT");
  await error(request("staff", path, await body({ ...inc, average: "2" })), 409, "FINDINGS_CORRECTION_REQUIRES_REVIEW");
  // The documented correction path appends events; historical review and evidence survive.
  await act(cog.id, "return-for-correction", { correctionOf: incView.documents.find((d) => d.id === cog.id)!.eventId });
  assert.equal((await view()).stale, true); assert.notEqual((await view()).result, "compliant");
  for (const hasIncomplete of [false, null]) await error(request("coordinator", path, await body({ ...clean, hasIncomplete })), 409, "CORRECTED_COG_REQUIRED");
  await act(cog.id, "resubmit", { physicalReference: null, storageLocation: "Synthetic corrected COG" });
  await error(request("staff", path, await body()), 409, "CORRECTED_COG_REQUIRED");
  assert.deepEqual((await view()).history, incView.history);
  await verify(cog.id);
  assert.equal((await ok(request("staff", path, await body()))).json().result, "compliant");
  const compliant = await view(); assert.equal(compliant.result, "compliant"); assert.equal(compliant.stale, false);
  assert.deepEqual(compliant.history.find((r) => r.id === draft.id), draft);
  assert.deepEqual(compliant.history.find((r) => r.id === incView.history[0].id), incView.history[0]);
  assert.equal(compliant.history[0].supersedesId, incView.history[0].id);
  const [[owner]] = await admin.execute<RowDataPacket[]>("SELECT id FROM scholar_semesters WHERE scholar_id=? AND semester_id=?", [scholar, semester.id]);
  await admin.execute("UPDATE semesters SET locked_at=UTC_TIMESTAMP(6) WHERE id=?", [semester.id]);
  try { assert.notEqual((await view()).result, "compliant"); await error(request("staff", path, await body()), 409, "COMPLIANCE_REVIEW_BLOCKED"); }
  finally { await admin.execute("UPDATE semesters SET locked_at=NULL WHERE id=?", [semester.id]); }
  const entitlement = randomUUID();
  await admin.execute("INSERT INTO semester_entitlements(id,scholar_semester_id,scholar_id,semester_id,benefit_type,amount_centavos,currency,actor_id,recorded_at) VALUES(?,?,?,?,'degree_stipend',500000,'PHP',?,UTC_TIMESTAMP(6))", [entitlement, owner.id, scholar, semester.id, actor]);
  try { await error(request("staff", path, await body()), 409, "COMPLIANCE_REVIEW_BLOCKED"); }
  finally { await admin.execute("DELETE FROM semester_entitlements WHERE id=?", [entitlement]); }
  const [[financial]] = await admin.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM semester_entitlements) AS entitlements,(SELECT COUNT(*) FROM payment_records) AS payments,(SELECT COUNT(*) FROM scholarship_records) AS annuals");
  assert.deepEqual({ ...financial }, { entitlements: 0, payments: 0, annuals: 0 });
  await testEndedCompliance({ admin, request, path, semesterId: semester.id, actor, scholar, findings: clean, cogId: cog.id, act, verify });
  // A genuine failed/dropped finding has no automatic exception/reinstatement policy.
  const failed = { ...clean, hasFailed: true, hasDropped: true };
  await ok(request("coordinator", path, { ...await body({ ...failed, hasIncomplete: true }), reason: "Synthetic overlooked failed, dropped and INC findings" }));
  const adverse = await view(); assert.equal(adverse.result, "noncompliant");
  await act(cog.id, "return-for-correction", { correctionOf: adverse.documents.find((d) => d.id === cog.id)!.eventId });
  await act(cog.id, "resubmit", { physicalReference: null, storageLocation: "Synthetic later grade document" });
  await verify(cog.id);
  for (const role of ["staff", "coordinator"]) await error(request(role, path, { ...await body(), reason: "Attempt unauthorized exception with later grades" }), 409, "FORMAL_ACADEMIC_REVIEW_REQUIRED");
  await ok(request("staff", path, await body(failed)));
  const resolvedInc = await view();
  assert.equal(resolvedInc.result, "noncompliant");
  assert.deepEqual(resolvedInc.history[0].findings, failed);
  assert.deepEqual(resolvedInc.history.find((r) => r.id === adverse.history[0].id), adverse.history[0]);
  console.log("PASS Semester compliance: scoped grading, pending/INC/resolution, immutable evidence, roles, retries, races, audit rollback and lock/dependency controls");
  await testGradingReplacement({ admin, request, path, semesterId: semester.id, actor });
  await testFindingCorrection({ admin, request, path, semesterId: semester.id, actor, scholar, act, verify });
  await testGradingRecovery({ admin, request, path, semesterId: semester.id, actor, scholar });
  if (!process.argv.includes("--browser-recovery")) await testSemesterEligibility({ admin, request, path, semesterId: semester.id, actor, scholar });
  if (process.argv.includes("--browser-ended")) await admin.execute("UPDATE semesters SET ends_on='2026-10-06' WHERE id=?", [semester.id]);
}
