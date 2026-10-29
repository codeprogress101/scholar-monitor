import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Pool, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { DocumentBatchPreview } from "../server/requirements/batch-model.js";

type Request = (role: string, url: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
export async function testDocumentBatches(request: Request, pool: Pool, importId: string, semesterId: string, day: string, count=835) {
  const historicalCount=count-380;
  const previewPath = `/api/v1/document-batches/preview?importId=${importId}&semesterId=${semesterId}`;
  const ok = async <T>(r: Promise<LightMyRequestResponse>): Promise<T> => { const response = await r; assert.equal(response.statusCode, 200, response.body); return response.json<T>(); };
  const preview = () => ok<DocumentBatchPreview>(request("staff", previewPath));
  const start = performance.now();
  let current = await preview();
  assert.equal(current.scholarCount, count); assert.equal(current.missingScholarCount, 0);
  assert.equal(current.documents.length, count*2);
  assert.equal(current.documents.filter(d => d.outcome === "ready").length, count);
  assert.equal(current.documents.filter(d => d.historicalPlacement).length, historicalCount);
  assert.ok(current.documents.filter(d => d.kind === "cog").every(d => d.issue?.code === "ACADEMIC_RECORD_REQUIRED"));
  assert.equal((await request("system_admin", previewPath)).statusCode, 403);
  const makeVerify = (p: DocumentBatchPreview, ids: string[]) => ({ importId, semesterId, scopeHash: p.scopeHash,
    effectiveOn: day, reason: "Synthetic per-document paper verification", reference: "TEST-HELD-PAPERS",
    ordinaryChecksConfirmed: true, deferredCourseChecksConfirmed: true,
    items: p.documents.filter(d => ids.includes(d.id)).map(d => ({ id: d.id, version: d.version, contextHash: d.contextHash! })),
  });
  const cors = current.documents.filter(d => d.kind === "cor");
  const verifyBody = makeVerify(current, cors.map(d => d.id)), verifyKey = randomUUID();
  const setupPath = "/api/v1/continuing-rosters/00000000-0000-4000-8000-000000000001/semester-setup";
  const [[scope]] = await pool.query<RowDataPacket[]>("SELECT w.*,s.version semester_version,previous.version predecessor_version FROM workflow_scope_versions w JOIN semesters s ON s.id=w.semester_id JOIN workflow_policy_versions p ON p.id=w.policy_version_id JOIN semesters previous ON previous.id=JSON_UNQUOTE(JSON_EXTRACT(p.rules,'$.predecessorSemesterId')) WHERE w.semester_id=? AND w.cohort_code='00000000-0000-4000-8000-000000000001' ORDER BY w.revision DESC LIMIT 1", [semesterId]);
  const disabled = await ok<{ id: string; revision: number }>(request("coordinator", `${setupPath}/availability`, { scopeId: scope.id, expectedRevision: scope.revision, mode: "disabled", expectedSemesterVersion: scope.semester_version, expectedPredecessorVersion: scope.predecessor_version, reason: "Synthetic batch disablement check", reviewed: true }));
  const unavailable = await preview();
  assert.ok(unavailable.documents.every(d => d.outcome === "blocked" && !d.historicalPlacement));
  assert.equal((await request("staff", "/api/v1/document-batches/verify", verifyBody)).statusCode, 409);
  const [[owners]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM scholar_semesters ss JOIN workflow_scope_versions w ON w.id=ss.scope_version_id WHERE ss.semester_id=? AND w.cohort_code='00000000-0000-4000-8000-000000000001'", [semesterId]);
  await ok(request("coordinator", `${setupPath}/recover`, { scopeId: disabled.id, expectedRevision: disabled.revision, mode: "enabled", expectedSemesterVersion: scope.semester_version, expectedPredecessorVersion: scope.predecessor_version, expectedRecordCount: Number(owners.n), reason: "Reviewed same-policy batch receiving recovery", reviewed: true }));
  assert.equal((await request("staff", "/api/v1/document-batches/verify", { ...verifyBody, ordinaryChecksConfirmed: false })).statusCode, 422);
  assert.equal((await request("staff", "/api/v1/document-batches/verify", { ...verifyBody, deferredCourseChecksConfirmed: false })).statusCode, 422);
  await pool.query("CREATE TRIGGER fail_batch_verify BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='documents.batch-verify' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic batch verification audit rollback'; END IF; END");
  // Exercise rollback of the final batch audit after individual events have been written.
  const smallBody = makeVerify(current, cors.slice(0, 3).map(d => d.id));
  assert.equal((await request("staff", "/api/v1/document-batches/verify", smallBody)).statusCode, 500);
  const [[rolled]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM requirement_workflow_events WHERE instance_id IN (?,?,?)", cors.slice(0, 3).map(d => d.id));
  assert.equal(Number(rolled.n), 0);
  await pool.query("DROP TRIGGER fail_batch_verify");
  const results = await Promise.all([request("staff", "/api/v1/document-batches/verify", verifyBody, verifyKey), request("staff", "/api/v1/document-batches/verify", verifyBody, verifyKey)]);
  assert.equal(results[0].statusCode, 200, results[0].body); assert.equal(results[1].statusCode, 200, results[1].body);
  assert.deepEqual(results[0].json(), results[1].json()); assert.equal(results[0].json().verifiedCount, count);
  assert.deepEqual(await ok(request("staff", "/api/v1/document-batches/verify", verifyBody, verifyKey)), results[0].json());
  assert.equal((await request("staff", "/api/v1/document-batches/verify", { ...verifyBody, reference: "Changed" }, verifyKey)).statusCode, 409);
  assert.equal((await request("staff", "/api/v1/document-batches/verify", smallBody)).statusCode, 409);
  const [[deferred]] = await pool.query<RowDataPacket[]>("SELECT details FROM requirement_workflow_events WHERE instance_id=? AND action='verify'", [cors.find(d => d.context?.coursePending)!.id]);
  const deferredEvidence = typeof deferred.details === "string" ? JSON.parse(deferred.details) : deferred.details;
  assert.equal(deferredEvidence.checks.placement, false); assert.equal(deferredEvidence.attestation, "course-comparison-deferred");
  const [[beforeReceipt]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) n,SUM(UNIX_TIMESTAMP(recorded_at)) timestamps FROM requirement_receipts");
  current = await preview(); assert.equal(current.documents.filter(d => d.outcome === "current").length, count);
  const placements = current.documents.filter(d => d.historicalPlacement);
  const placementBody = { importId, semesterId, scopeHash: current.scopeHash, reason: "Held COGs reviewed for past-semester school and course", reference: "TEST-HISTORICAL-PAPERS", coveredPlacementConfirmed: true,
    items: placements.map(d => ({ id: d.id, sourceHash: d.historicalPlacement!.sourceHash, yearLevel: null })),
  };
  assert.equal((await request("staff", "/api/v1/document-batches/historical-placement", placementBody)).statusCode, 403);
  assert.equal((await request("system_admin", "/api/v1/document-batches/historical-placement", placementBody)).statusCode, 403);
  const bad = { ...placementBody, items: [{ ...placementBody.items[0], sourceHash: "0".repeat(64) }] };
  assert.equal((await request("coordinator", "/api/v1/document-batches/historical-placement", bad)).statusCode, 409);
  await pool.query("CREATE TRIGGER fail_batch_placement BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='documents.batch-historical-placement' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic historical review rollback'; END IF; END");
  const smallPlacement = { ...placementBody, items: placementBody.items.slice(0, 2) };
  assert.equal((await request("coordinator", "/api/v1/document-batches/historical-placement", smallPlacement)).statusCode, 500);
  const [[absent]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM academic_records WHERE scholar_id IN (?,?) AND academic_year_id=?", [placements[0].scholarId, placements[1].scholarId, placements[0].historicalPlacement!.academicYearId]);
  assert.equal(Number(absent.n), 0);
  await pool.query("DROP TRIGGER fail_batch_placement");
  const placementKey = randomUUID(), reviewed = await ok<{ reviewedCount: number }>(request("coordinator", "/api/v1/document-batches/historical-placement", placementBody, placementKey));
  assert.equal(reviewed.reviewedCount, historicalCount);
  assert.deepEqual(await ok(request("coordinator", "/api/v1/document-batches/historical-placement", placementBody, placementKey)), reviewed);
  const [[historical]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM academic_records WHERE academic_year_id=? AND year_level='Not recorded'", [placements[0].historicalPlacement!.academicYearId]);
  assert.equal(Number(historical.n), historicalCount);
  const [[scholarships]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM scholarship_records WHERE academic_year_id=?", [placements[0].historicalPlacement!.academicYearId]);
  assert.equal(Number(scholarships.n), 0);
  current = await preview();
  const cogs = current.documents.filter(d => d.kind === "cog" && d.outcome === "ready");
  assert.equal(cogs.length, historicalCount); assert.equal(current.documents.filter(d => d.outcome === "blocked").length, 380);
  const cogBody = makeVerify(current, cogs.map(d => d.id));
  assert.equal((await ok<{ verifiedCount: number }>(request("coordinator", "/api/v1/document-batches/verify", cogBody))).verifiedCount, historicalCount);
  const [[afterReceipt]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) n,SUM(UNIX_TIMESTAMP(recorded_at)) timestamps FROM requirement_receipts");
  assert.deepEqual(afterReceipt, beforeReceipt);
  const [[waivers]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM requirement_waivers"); assert.equal(Number(waivers.n), 0);
  const [[semester]] = await pool.query<RowDataPacket[]>("SELECT version FROM semesters WHERE id=?", [semesterId]);
  const cycle = await ok<{ id: string }>(request("system_admin", "/api/v1/payout-cycles", { action: "create", code: "BATCH-UNMAPPED", semesterId, expectedSemesterVersion: semester.version, expectedVersion: 0, fields: { name: "Unmapped payroll with existing semester papers", targetDate: day, requirements: [] } }));
  const registry = await ok<{ items: { requirements: { label: string; total: number }; payout: { reasons: { code: string }[] } }[] }>(request("staff", `/api/v1/scholars/eligibility?ids=${cors[0].scholarId}&semesterId=${semesterId}&periodId=${cycle.id}`));
  assert.equal(registry.items[0].requirements.total, 2); assert.notEqual(registry.items[0].requirements.label, "Unconfigured");
  assert.ok(registry.items[0].payout.reasons.some(r => r.code === "PAYROLL_PERIOD_SETUP_REQUIRED"));
  assert.ok(!registry.items[0].payout.reasons.some(r => ["CHECKLIST_MISSING", "PAYOUT_POLICY_EMPTY"].includes(r.code)));
  console.log(`PASS Batch verification: ${count} COR + ${historicalCount} COG verified; 380 unknown historical courses unresolved; Coordinator historical review; truthful deferred checks; concurrent exact retry; stale revisions; audit rollback; no receipt changes or historical scholarship creation; elapsed=${Math.round(performance.now() - start)}ms`);
}
