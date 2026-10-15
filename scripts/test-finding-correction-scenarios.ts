import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { SemesterComplianceView } from "../server/continuing/semester-compliance.js";
import type { RequirementAction } from "../server/requirements/workflow-model.js";
import type { AdverseField } from "../server/continuing/finding-corrections.js";

export async function testFindingCorrection({ admin, request, path, semesterId, scholar, actor, act, verify }: {
  admin: Connection; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
  path: string; semesterId: string; scholar: string; actor: string;
  act: (id: string, action: RequirementAction, extra?: object) => Promise<LightMyRequestResponse>; verify: (id: string) => Promise<void>;
}) {
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const error = async (p: Promise<LightMyRequestResponse>, status: number, code: string) => { const r = await p; assert.equal(r.statusCode, status, r.body); assert.equal(r.json().error.code, code); };
  const view = async () => (await ok(request("staff", path))).json<SemesterComplianceView>(), endpoint = path + "/correct-recording";
  const body = async (fields: AdverseField[] = ["hasFailed"]) => { const v = await view(); return { sourceHash: v.sourceHash, expectedRevision: v.revision, fields, reason: "Synthetic checked COG: subject finding was entered incorrectly", recordingErrorConfirmed: true, academicOnly: v.ended }; };
  const record = async (findings: SemesterComplianceView["history"][number]["findings"]) => {
    const v = await view(); return ok(request("coordinator", path + (v.ended ? "/ended-review" : ""), { sourceHash: v.sourceHash, expectedRevision: v.revision, findings, reviewed: true, reason: "Synthetic review of the recorded COG findings", ...(v.ended ? { academicOnly: true } : {}) }));
  };
  assert.equal((await view()).stale, true);
  await error(request("coordinator", endpoint, await body()), 409, "FINDING_CORRECTION_BLOCKED");
  await record({ ...(await view()).history[0].findings, average: "90" });
  const current = await view(), cog = current.documents.find((d) => d.kind === "cog")!;
  await act(cog.id, "return-for-correction", { correctionOf: cog.eventId });
  await error(request("coordinator", endpoint, await body()), 409, "FINDING_CORRECTION_BLOCKED");
  await act(cog.id, "resubmit", { physicalReference: null, storageLocation: "Synthetic checked COG evidence" });
  await verify(cog.id);
  await error(request("coordinator", endpoint, await body()), 409, "FINDING_CORRECTION_BLOCKED");
  await record(current.history[0].findings);
  const before = await view(), initial = await body();
  const [[owner]] = await admin.execute<RowDataPacket[]>("SELECT id FROM scholar_semesters WHERE scholar_id=? AND semester_id=?", [scholar, semesterId]);
  const originals = (await admin.execute<RowDataPacket[]>("SELECT * FROM semester_review_events WHERE scholar_semester_id=? ORDER BY revision", [owner.id]))[0];
  const financial = async () => (await admin.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM semester_entitlements) AS entitlements,(SELECT COUNT(*) FROM payment_records) AS payments,(SELECT COUNT(*) FROM scholarship_records) AS annuals"))[0];
  const financialBefore = await financial();
  for (const role of ["staff", "system_admin", "unassigned"]) await error(request(role, endpoint, initial), 403, "PERMISSION_DENIED");
  for (const change of [{ fields: [] }, { fields: ["hasIncomplete"] }, { fields: ["hasFailed", "hasFailed"] }, { reason: "" }, { recordingErrorConfirmed: false }, { result: "compliant" }, { findings: before.history[0].findings }])
    await error(request("coordinator", endpoint, { ...initial, ...change }), 422, "VALIDATION_FAILED");
  await error(request("coordinator", endpoint, { ...initial, expectedRevision: initial.expectedRevision - 1 }), 409, "VERSION_CONFLICT");
  await error(request("coordinator", endpoint, { ...initial, sourceHash: "0".repeat(64) }), 409, "SOURCE_CHANGED");
  await error(request("coordinator", endpoint, { ...initial, academicOnly: true }), 409, "SOURCE_CHANGED");
  await admin.execute("UPDATE semesters SET locked_at=UTC_TIMESTAMP(6) WHERE id=?", [semesterId]);
  try { await error(request("coordinator", endpoint, await body()), 409, "FINDING_CORRECTION_BLOCKED"); }
  finally { await admin.execute("UPDATE semesters SET locked_at=NULL WHERE id=?", [semesterId]); }
  const entitlement = randomUUID();
  await admin.execute("INSERT INTO semester_entitlements(id,scholar_semester_id,scholar_id,semester_id,benefit_type,amount_centavos,currency,actor_id,recorded_at) VALUES(?,?,?,?,'degree_stipend',500000,'PHP',?,UTC_TIMESTAMP(6))", [entitlement, owner.id, scholar, semesterId, actor]);
  try { await error(request("coordinator", endpoint, await body()), 409, "FINDING_CORRECTION_BLOCKED"); }
  finally { await admin.execute("DELETE FROM semester_entitlements WHERE id=?", [entitlement]); }
  const key = randomUUID(), otherKey = randomUUID();
  await admin.query("CREATE TRIGGER reject_finding_correction BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.compliance.correct_recording' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  try { assert.equal((await request("coordinator", endpoint, initial, key)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_finding_correction"); }
  assert.deepEqual((await view()).history, before.history);
  const race = await Promise.all([request("coordinator", endpoint, initial, key), request("reviewer", endpoint, initial, otherKey)]);
  assert.deepEqual(race.map((r) => r.statusCode).sort(), [200, 409]);
  const winner = race[0].statusCode === 200 ? "coordinator" : "reviewer", winningKey = winner === "coordinator" ? key : otherKey;
  const saved = (await ok(request(winner, endpoint, initial, winningKey))).json();
  assert.equal(saved.result, "noncompliant");
  assert.deepEqual((await ok(request(winner, endpoint, initial, winningKey))).json(), saved);
  await error(request(winner, endpoint, { ...initial, reason: "Changed justification" }, winningKey), 409, "IDEMPOTENCY_CONFLICT");
  const partial = await view();
  assert.deepEqual(partial.history[0].findings, { ...before.history[0].findings, hasFailed: false });
  assert.equal(partial.unresolvedFindings.some((t) => t.field === "hasFailed"), false);
  assert.ok(partial.unresolvedFindings.some((t) => t.field === "hasDropped"));
  assert.deepEqual(partial.history[0].correction!.targets, before.unresolvedFindings.filter((t) => t.field === "hasFailed"));
  await error(request("coordinator", endpoint, await body()), 409, "NO_FINDING_TO_CORRECT");
  await error(request("staff", path, { sourceHash: partial.sourceHash, expectedRevision: partial.revision, findings: { ...partial.history[0].findings, hasDropped: false }, reviewed: true }), 409, "CORRECTED_COG_REQUIRED");
  assert.equal((await ok(request("coordinator", endpoint, await body(["hasDropped"])))).json().result, "compliant");
  const clear = await view(); assert.equal(clear.unresolvedFindings.length, 0);
  await ok(request("staff", path, { sourceHash: clear.sourceHash, expectedRevision: clear.revision, findings: clear.history[0].findings, reviewed: true }));
  // A new adverse recording is independent of every earlier correction.
  await record({ ...clear.history[0].findings, hasFailed: true });
  const recurring = await view(); assert.equal(recurring.unresolvedFindings.length, 1);
  await error(request("coordinator", path, { sourceHash: recurring.sourceHash, expectedRevision: recurring.revision, findings: clear.history[0].findings, reviewed: true, reason: "Attempt to reuse prior correction" }), 409, "CORRECTED_COG_REQUIRED");
  const [[period]] = await admin.execute<RowDataPacket[]>("SELECT DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends FROM semesters WHERE id=?", [semesterId]);
  await admin.execute("UPDATE semesters SET ends_on='2026-10-06' WHERE id=?", [semesterId]);
  try {
    await error(request("coordinator", endpoint, await body()), 409, "FINDING_CORRECTION_BLOCKED");
    await record(recurring.history[0].findings);
    const ended = await body();
    await error(request("coordinator", endpoint, { ...ended, academicOnly: false }), 409, "SOURCE_CHANGED");
    await ok(request("coordinator", endpoint, ended));
    const corrected = await view(); assert.equal(corrected.history[0].academicOnly, true); assert.equal(corrected.result, "compliant");
  } finally { await admin.execute("UPDATE semesters SET ends_on=? WHERE id=?", [period.ends, semesterId]); }
  assert.deepEqual((await admin.execute<RowDataPacket[]>("SELECT * FROM semester_review_events WHERE scholar_semester_id=? AND revision<=? ORDER BY revision", [owner.id, before.revision]))[0], originals);
  assert.deepEqual(await financial(), financialBefore);
  const [[audit]] = await admin.execute<RowDataPacket[]>("SELECT details FROM audit_logs WHERE entity_id=? AND event_type='semester.compliance.correct_recording' ORDER BY occurred_at DESC LIMIT 1", [owner.id]);
  const details = typeof audit.details === "string" ? JSON.parse(audit.details) : audit.details;
  assert.equal(details.correction.kind, "recording_error"); assert.equal(details.academicOnly, true); assert.ok(details.correction.targets.length);
  // Keep one current synthetic recording available for the browser correction check.
  await record({ ...clear.history[0].findings, hasFailed: true });
  console.log("PASS Recording-error correction: exact review/field reconciliation, roles, immutable history, fresh evidence, locks/entitlements, atomic audit, races/retries, ended marker and independent later adverse findings");
}
