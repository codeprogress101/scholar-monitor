import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { VerificationContext } from "../server/requirements/workflow-model.js";

export async function testSemesterCoverage(input: {
  admin: Connection;
  request: (role: string, url: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
  scholarId: string; semesterId: string; priorSemesterId: string; priorYearId: string;
  corDefinition: string; cogDefinition: string; actorId: string; day: string;
}) {
  const { admin, request, scholarId, semesterId, priorSemesterId, priorYearId, actorId, day } = input;
  const insert = async (table: string, fields: Record<string, string | number | null>) => {
    assert.ok(["participations", "participation_events", "workflow_authority_versions", "workflow_policy_versions", "workflow_scope_versions", "scholar_semesters", "scholar_semester_revisions", "requirement_checklists", "requirement_instances", "requirement_coverage"].includes(table));
    await admin.execute(`INSERT INTO ${table} (${Object.keys(fields).join(",")}) VALUES (${Object.keys(fields).map(() => "?").join(",")})`, Object.values(fields));
  };
  const audit = { actor_id: actorId, recorded_at: `${day} 00:00:00` };
  const authority = randomUUID(), policy = randomUUID(), scope = randomUUID(), participation = randomUUID(), term = randomUUID(), checklist = randomUUID();
  await insert("workflow_authority_versions", { id: authority, code: randomUUID(), revision: 1, issuer: "Synthetic only", reference_text: "TEST", scope: "{}", valid_from: day, source_location: "Disposable test", ...audit });
  await insert("workflow_policy_versions", { id: policy, code: randomUUID(), revision: 1, authority_version_id: authority, source_reference: "TEST", effective_from: day, rules: "{}", ...audit });
  await insert("workflow_scope_versions", { id: scope, semester_id: semesterId, cohort_code: "COVERAGE-TEST", revision: 1, mode: "enabled", policy_version_id: policy, ...audit });
  await insert("participations", { id: participation, scholar_id: scholarId, entry_basis: "new_applicant", ...audit });
  await insert("participation_events", { id: randomUUID(), participation_id: participation, revision: 1, action: "accepted", authority_version_id: authority, effective_on: day, snapshot: "{}", reason: "Synthetic only", ...audit });
  await insert("scholar_semesters", { id: term, scholar_id: scholarId, semester_id: semesterId, participation_id: participation, scope_version_id: scope, ...audit });
  await insert("scholar_semester_revisions", { scholar_semester_id: term, revision: 1, predecessor_semester_id: priorSemesterId, placement_snapshot: "{}", ...audit });
  await insert("requirement_checklists", { id: checklist, scholar_semester_id: term, scholarship_record_id: null, semester_id: semesterId, policy_date: day, year_code: "CURRENT", year_name: "Current test year", semester_code: "CURRENT", semester_name: "Current semester", semester_version: 1, reason: "Synthetic only", reference_text: "TEST", actor_id: actorId, actor_name: "Synthetic", created_at: audit.recorded_at });
  const cor = randomUUID(), cog = randomUUID();
  for (const [id, definition] of [[cor, input.corDefinition], [cog, input.cogDefinition]])
    await insert("requirement_instances", { id, checklist_id: checklist, definition_version_id: definition, status: "not_submitted", created_at: audit.recorded_at });
  const path = (id: string, action: string) => `/api/v1/requirement-instances/${id}/${action}`;
  const ok = async (promise: Promise<LightMyRequestResponse>) => { const r = await promise; assert.equal(r.statusCode, 200, r.body); return r; };
  const error = async (promise: Promise<LightMyRequestResponse>, status: number, code: string) => { const r = await promise; assert.equal(r.statusCode, status, r.body); assert.equal(r.json().error.code, code); };
  await error(request("staff", path(cog, "verification-context")), 409, "DOCUMENT_COVERAGE_REQUIRED");
  const coverage = async (id: string, kind: string, period: string, revision = 1) => {
    const coverageId = randomUUID();
    await insert("requirement_coverage", { id: coverageId, scholar_semester_id: term, requirement_instance_id: id, revision, document_kind: kind, coverage_semester_id: period, ...audit });
    return coverageId;
  };
  await coverage(cor, "cor", semesterId);
  await coverage(cog, "cog", semesterId);
  await error(request("staff", path(cog, "verification-context")), 409, "DOCUMENT_COVERAGE_CONFLICT");
  await coverage(cog, "cog", priorSemesterId, 2);
  const ctx = async (id: string) => (await ok(request("staff", path(id, "verification-context")))).json<VerificationContext>();
  const current = await ctx(cor), previous = await ctx(cog);
  assert.equal(current.semesterId, semesterId);
  assert.equal(previous.semesterId, priorSemesterId);
  assert.equal(previous.academicYearId, priorYearId);
  assert.equal(previous.receivingSemesterId, semesterId);
  assert.notEqual(previous.schoolId, current.schoolId, "Previous COG must use previous academic placement");
  await error(request("system_admin", path(cog, "verification-context")), 403, "PERMISSION_DENIED");
  const receipt = { expectedVersion: 0, receivedOn: day, physicalReference: null, storageLocation: "Synthetic cabinet", remarks: null, reason: "Synthetic receipt" };
  // This fixture deliberately keeps earlier annual workflow examples separate
  // from its explicit semester-coverage examples. Record that decision through
  // the same authorized command; an unresolved source must block duplicates.
  await error(request("staff", path(cog, "receive"), receipt), 409, "DOCUMENT_SOURCE_REVIEW_REQUIRED");
  const sourcesPath = `/api/v1/scholars/${scholarId}/semester-requirements/${semesterId}/shared-documents`;
  let sources = (await ok(request("coordinator", sourcesPath))).json();
  for (const old of sources.legacy) {
    await ok(request("coordinator", sourcesPath + "/reconcile", { sourceHash: sources.sourceHash, legacyId: old.id, sourceId: old.id, expectedRevision: 0, reviewed: true, reason: "Separate synthetic annual workflow obligation", reference: "TEST-INDEPENDENT-COVERAGE" }));
    sources = (await ok(request("coordinator", sourcesPath))).json();
  }
  await error(request("staff", path(cog, "receive"), { ...receipt, documentType: "certificate_of_enrollment" }), 422, "DOCUMENT_TYPE_CONFLICT");
  const batchReceipt = { items: [{ id: cor, expectedVersion: 0, documentType: "certificate_of_enrollment" }, { id: cog, expectedVersion: 0, documentType: "certificate_of_enrollment" }], receivedOn: day, physicalReference: null, storageLocation: null, remarks: null };
  await error(request("staff", `/api/v1/requirement-checklists/${checklist}/receive`, batchReceipt), 422, "DOCUMENT_TYPE_CONFLICT");
  assert.equal((await admin.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM requirement_receipts WHERE instance_id IN (?,?)", [cor, cog]))[0][0].n, 0, "Mixed invalid batch must roll back every receipt");
  assert.equal((await admin.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM requirement_document_evidence WHERE instance_id IN (?,?)", [cor, cog]))[0][0].n, 0);
  const enrollmentReceipt = { ...receipt, documentType: "certificate_of_enrollment" }, receiptKey = randomUUID();
  await admin.query("CREATE TRIGGER reject_document_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='requirements.received' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  try { assert.equal((await request("staff", path(cor, "receive"), enrollmentReceipt, receiptKey)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_document_audit"); }
  assert.equal((await admin.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM requirement_document_evidence WHERE instance_id=?", [cor]))[0][0].n, 0);
  const firstReceipt = (await ok(request("staff", path(cor, "receive"), enrollmentReceipt, receiptKey))).json();
  assert.deepEqual((await ok(request("staff", path(cor, "receive"), enrollmentReceipt, receiptKey))).json(), firstReceipt);
  await error(request("staff", path(cor, "receive"), { ...enrollmentReceipt, documentType: "cor" }, receiptKey), 409, "IDEMPOTENCY_CONFLICT");
  const evidence = async () => (await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_document_evidence WHERE instance_id=? ORDER BY receipt_id DESC", [cor]))[0];
  const original = await evidence(); assert.equal(original.length, 1); assert.equal(original[0].document_type, "certificate_of_enrollment");
  const [[other]] = await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM requirement_receipts WHERE instance_id=?", [cog]);
  assert.equal(Number(other.n), 0);
  await ok(request("staff", path(cog, "receive"), receipt));
  const command = (action: string, expectedVersion: number) => ({ action, expectedVersion, effectiveOn: day, reason: "Synthetic verification", reference: "TEST", remarks: null });
  await ok(request("staff", path(cor, "send-for-verification"), command("send-for-verification", 1)));
  await ok(request("staff", path(cor, "return-for-correction"), { ...command("return-for-correction", 2), correctionOf: null }));
  const replacement = { ...command("resubmit", 3), physicalReference: null, storageLocation: "Synthetic cabinet", documentType: "cor" };
  await error(request("system_admin", path(cor, "resubmit"), replacement), 403, "PERMISSION_DENIED");
  await error(request("staff", path(cor, "resubmit"), { ...replacement, documentType: "cog" }), 422, "DOCUMENT_TYPE_CONFLICT");
  const replacementKey = randomUUID();
  const results = await Promise.all([request("staff", path(cor, "resubmit"), replacement, replacementKey), request("staff", path(cor, "resubmit"), replacement, replacementKey)]);
  for (const r of results) assert.equal(r.statusCode, 200, r.body);
  assert.deepEqual(results[0].json(), results[1].json());
  const replaced = await evidence(); assert.equal(replaced.length, 2); assert.deepEqual(replaced.find((d) => d.receipt_id), original[0]);
  assert.equal(replaced.find((d) => d.workflow_event_id)?.document_type, "cor");
  const [[replacementEvent]] = await admin.execute<RowDataPacket[]>("SELECT details FROM requirement_workflow_events WHERE id=?", [results[0].json().id]);
  assert.equal(JSON.parse(replacementEvent.details).receipt.documentType, "cor");
  await ok(request("staff", path(cog, "send-for-verification"), command("send-for-verification", 1)));
  const document = { scholarId: previous.scholarId, scholarVersion: previous.scholarVersion, academicYearId: previous.academicYearId, semesterId: previous.semesterId, schoolId: previous.schoolId, courseId: previous.courseId, academicVersion: previous.academicVersion, definitionVersionId: previous.definitionVersionId, coverageId: previous.coverageId, semesterRevision: previous.semesterRevision };
  const verify = { ...command("verify", 2), document, checks: { identity: true, period: true, placement: true, applicability: true, validity: true } };
  await coverage(cog, "cog", priorSemesterId, 3);
  await error(request("staff", path(cog, "verify"), verify), 409, "SOURCE_CHANGED");
  const fresh = await ctx(cog);
  await ok(request("staff", path(cog, "verify"), { ...verify, document: { ...document, coverageId: fresh.coverageId } }));
  const [[event]] = await admin.query<RowDataPacket[]>("SELECT details FROM requirement_workflow_events WHERE instance_id=? AND action='verify'", [cog]);
  const snapshot = JSON.parse(event.details).verification;
  assert.equal(snapshot.semesterId, priorSemesterId);
  assert.equal(snapshot.receivingSemesterId, semesterId);
  assert.equal(snapshot.coverageId, fresh.coverageId);
  await insert("workflow_scope_versions", { id: randomUUID(), semester_id: semesterId, cohort_code: "COVERAGE-TEST", revision: 2, mode: "disabled", policy_version_id: policy, ...audit });
  await error(request("staff", path(cor, "verification-context")), 423, "SEMESTER_WORKFLOW_UNAVAILABLE");
  await error(request("staff", path(cor, "send-for-verification"), command("send-for-verification", 1)), 423, "SEMESTER_WORKFLOW_UNAVAILABLE");
  await error(request("staff", path(cor, "receive"), receipt), 423, "SEMESTER_WORKFLOW_UNAVAILABLE");
  await error(request("coordinator", path(cor, "waive"), { expectedVersion: 1, effectiveOn: day, reason: "Synthetic waiver", authorityReference: "TEST", remarks: null }), 423, "SEMESTER_WORKFLOW_UNAVAILABLE");
  console.log("PASS Semester coverage: separate COR/COG, prior-year placement, missing/wrong coverage, stale review, audit snapshots, Admin denial and disabled scope");
}

