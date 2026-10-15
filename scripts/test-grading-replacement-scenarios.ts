import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { SemesterComplianceView } from "../server/continuing/semester-compliance.js";
import type { GradingReplacementContext } from "../server/continuing/grading-policy.js";

export async function testGradingReplacement({ admin, request, path, semesterId, actor }: {
  admin: Connection; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
  path: string; semesterId: string; actor: string;
}) {
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const error = async (p: Promise<LightMyRequestResponse>, status: number, code: string) => { const r = await p; assert.equal(r.statusCode, status, r.body); assert.equal(r.json().error.code, code); };
  const view = async () => (await ok(request("staff", path))).json<SemesterComplianceView>();
  const context = async () => (await ok(request("coordinator", path + "/grading-rule/replacement-context"))).json<GradingReplacementContext>();
  const endpoint = path + "/grading-rule/replace", original = await view(), initial = await context();
  assert.equal(original.stale, false); assert.equal(initial.recordCount, 1); assert.equal(initial.reviewedCount, 1); assert.equal(initial.policy.revision, 1);
  const [[policyBefore]] = await admin.execute<RowDataPacket[]>("SELECT * FROM workflow_policy_versions WHERE id=?", [initial.policy.id]);
  const body = (c: GradingReplacementContext) => ({ expectedPolicyId: c.policy.id, expectedRevision: c.policy.revision, impactHash: c.impactHash, kind: "equivalent", rule: { label: "Approved school equivalent", direction: "higher", minimum: "0", maximum: "100", threshold: "85", precision: 2 }, issuer: c.policy.issuer, authorityReference: c.policy.authorityReference, sourceReference: "Synthetic approved school percentage rule", reason: "Synthetic correction of the recorded school scale", reviewed: true });
  for (const role of ["staff", "system_admin", "unassigned"]) {
    await error(request(role, path + "/grading-rule/replacement-context"), 403, "PERMISSION_DENIED");
    await error(request(role, endpoint, body(initial)), 403, "PERMISSION_DENIED");
  }
  for (const override of [{ reason: "" }, { reviewed: false }, { impactHash: "wrong" }, { rule: null }]) await error(request("coordinator", endpoint, { ...body(initial), ...override }), 422, "VALIDATION_FAILED");
  await error(request("coordinator", endpoint, { ...body(initial), expectedRevision: 99 }), 409, "VERSION_CONFLICT");
  await error(request("coordinator", endpoint, { ...body(initial), kind: "native", rule: null, sourceReference: initial.policy.sourceReference }), 409, "NO_GRADING_POLICY_CHANGE");
  await ok(request("staff", path, { sourceHash: original.sourceHash, expectedRevision: original.revision, findings: original.history[0].findings, reviewed: true }));
  await error(request("coordinator", endpoint, body(initial)), 409, "SOURCE_CHANGED");
  const current = await context();
  await admin.execute("UPDATE semesters SET locked_at=UTC_TIMESTAMP(6) WHERE id=?", [semesterId]);
  try { await error(request("coordinator", endpoint, body(current)), 409, "GRADING_POLICY_REVIEW_REQUIRED"); }
  finally { await admin.execute("UPDATE semesters SET locked_at=NULL WHERE id=?", [semesterId]); }

  // Another accepted scholar's synthetic semester owner proves the dependency check is cohort-wide.
  const [[other]] = await admin.execute<RowDataPacket[]>("SELECT p.id,p.scholar_id FROM participations p WHERE p.scholar_id<>(SELECT scholar_id FROM scholar_semesters WHERE id=(SELECT scholar_semester_id FROM semester_review_events WHERE policy_version_id=? LIMIT 1)) LIMIT 1", [initial.policy.id]);
  assert.ok(other, "Fixture requires a second accepted participation");
  const [[owner]] = await admin.execute<RowDataPacket[]>("SELECT ss.* FROM scholar_semesters ss JOIN semester_review_events r ON r.scholar_semester_id=ss.id WHERE r.policy_version_id=? LIMIT 1", [initial.policy.id]);
  const otherOwner = randomUUID(), entitlement = randomUUID();
  await admin.execute("INSERT INTO scholar_semesters(id,scholar_id,semester_id,participation_id,scope_version_id,actor_id,recorded_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))", [otherOwner, other.scholar_id, semesterId, other.id, owner.scope_version_id, actor]);
  try {
    await error(request("coordinator", endpoint, body(current)), 409, "SOURCE_CHANGED");
    await admin.execute("INSERT INTO semester_entitlements(id,scholar_semester_id,scholar_id,semester_id,benefit_type,amount_centavos,currency,actor_id,recorded_at) VALUES(?,?,?,?,'degree_stipend',500000,'PHP',?,UTC_TIMESTAMP(6))", [entitlement, otherOwner, other.scholar_id, semesterId, actor]);
    const affected = await context(); assert.equal(affected.recordCount, 2); assert.match(affected.blocker!, /entitlement/);
    await error(request("coordinator", endpoint, body(affected)), 409, "GRADING_REPLACEMENT_BLOCKED");
  } finally {
    await admin.execute("DELETE FROM semester_entitlements WHERE id=?", [entitlement]);
    await admin.execute("DELETE FROM scholar_semesters WHERE id=?", [otherOwner]);
  }
  const reviewBefore = (await view()).history, currentBody = body(await context()), key = randomUUID();
  const count = async () => (await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM workflow_policy_versions"))[0][0].n;
  const countBefore = await count();
  await admin.query("CREATE TRIGGER reject_grade_replace BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.grading.replace' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  try { assert.equal((await request("coordinator", endpoint, currentBody, key)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_grade_replace"); }
  assert.equal(await count(), countBefore); assert.equal((await view()).gradingRule!.id, initial.policy.id); assert.equal((await view()).stale, false);
  const otherKey = randomUUID(), race = await Promise.all([request("coordinator", endpoint, currentBody, key), request("reviewer", endpoint, currentBody, otherKey)]);
  assert.deepEqual(race.map((r) => r.statusCode).sort(), [200, 409]);
  const winner = race[0].statusCode === 200 ? "coordinator" : "reviewer", winningKey = winner === "coordinator" ? key : otherKey;
  const replacement = (await ok(request(winner, endpoint, currentBody, winningKey))).json();
  assert.equal(replacement.revision, 2); assert.equal(await count(), countBefore + 1);
  await error(request(winner, endpoint, { ...currentBody, reason: "Changed replacement justification" }, winningKey), 409, "IDEMPOTENCY_CONFLICT");
  const replaced = await view(); assert.equal(replaced.stale, true); assert.notEqual(replaced.result, "compliant");
  assert.equal(replaced.gradingRule!.id, replacement.id); assert.equal(replaced.gradingRule!.rule.direction, "higher");
  assert.equal(replaced.gradingHistory.length, 2); assert.equal(replaced.gradingHistory[0].replacesId, initial.policy.id);
  assert.deepEqual(replaced.history, reviewBefore);
  assert.deepEqual((await admin.execute<RowDataPacket[]>("SELECT * FROM workflow_policy_versions WHERE id=?", [initial.policy.id]))[0][0], policyBefore);
  await error(request("staff", path, { sourceHash: original.sourceHash, expectedRevision: replaced.revision, findings: original.history[0].findings, reviewed: true }), 409, "SOURCE_CHANGED");
  // Policy replacement cannot erase failed/dropped evidence or bypass ordinary correction authority.
  const findings = { ...replaced.history[0].findings, average: "85" };
  await error(request("staff", path, { sourceHash: replaced.sourceHash, expectedRevision: replaced.revision, findings, reviewed: true }), 409, "FINDINGS_CORRECTION_REQUIRES_REVIEW");
  await ok(request("coordinator", path, { sourceHash: replaced.sourceHash, expectedRevision: replaced.revision, findings, reason: "Synthetic average transcribed from percentage COG", reviewed: true }));
  assert.equal((await view()).stale, false); assert.equal((await view()).result, "noncompliant");
  const second = await context();
  await ok(request("coordinator", endpoint, { ...body(second), rule: { ...body(second).rule, threshold: "86" }, reason: "Synthetic second approved equivalent threshold" }));
  assert.equal((await view()).gradingHistory.length, 3); assert.equal((await view()).stale, true);
  console.log("PASS Grading replacement: immutable lineage, role/review controls, cohort-wide dependencies, audit rollback, stale sources and concurrent retries");
}
