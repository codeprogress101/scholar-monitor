import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { SemesterComplianceView } from "../server/continuing/semester-compliance.js";
import type { GradingRecoveryContext } from "../server/continuing/grading-policy.js";

export async function testGradingRecovery({ admin, request, path, semesterId, scholar, actor }: {
  admin: Connection; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
  path: string; semesterId: string; scholar: string; actor: string;
}) {
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const error = async (p: Promise<LightMyRequestResponse>, status: number, code?: string) => { const r = await p; assert.equal(r.statusCode, status, r.body); if (code) assert.equal(r.json().error.code, code); };
  const view = async () => (await ok(request("staff", path))).json<SemesterComplianceView>();
  const endpoint = path + "/grading-rule/recover", contextPath = path + "/grading-rule/recovery-context";
  const context = async () => (await ok(request("coordinator", contextPath))).json<GradingRecoveryContext>();
  const body = (c: GradingRecoveryContext) => ({ impactHash: c.impactHash, kind: "equivalent", rule: { label: "Recovered approved school scale", direction: "higher", minimum: "0", maximum: "100", threshold: "86", precision: 2 }, issuer: "Synthetic current approving authority", authorityReference: "TEST-RENEWED-AUTHORITY", authorityUntil: "2026-12-31", sourceReference: "Synthetic currently approved school rule", reason: "Synthetic expiry and conflicting policy reconciliation", reviewed: true, academicOnly: c.ended });
  const original = await view(), initial = await context(); assert.ok(initial.blocker);
  await error(request("coordinator", endpoint, body(initial)), 409, "GRADING_RECOVERY_NOT_REQUIRED");
  const expire = async (policyId: string) => admin.execute("UPDATE workflow_authority_versions a JOIN workflow_policy_versions p ON p.authority_version_id=a.id SET a.valid_from='2026-10-01',a.valid_until='2026-10-06' WHERE p.id=?", [policyId]);
  await expire(original.gradingRule!.id);
  assert.equal((await view()).gradingRule, null);
  const expired = await context(); assert.equal(expired.blocker, null); assert.equal(expired.recordCount, 1); assert.equal(expired.reviewedCount, 1);
  for (const role of ["staff", "system_admin", "unassigned"]) {
    await error(request(role, contextPath), 403, "PERMISSION_DENIED");
    await error(request(role, endpoint, body(expired)), 403, "PERMISSION_DENIED");
  }
  for (const change of [{ reason: "" }, { reviewed: false }, { authorityUntil: "2026-10-06" }, { rule: null }, { recoveryOf: [] }]) await error(request("coordinator", endpoint, { ...body(expired), ...change }), 422, "VALIDATION_FAILED");
  // A second root mimics conflicting historical/imported policy records in this disposable fixture only.
  const conflict = randomUUID();
  await admin.execute("INSERT INTO workflow_policy_versions(id,code,revision,authority_version_id,source_reference,effective_from,effective_until,rules,actor_id,recorded_at) SELECT ?,?,1,authority_version_id,source_reference,effective_from,effective_until,JSON_REMOVE(rules,'$.replacesPolicyId','$.recoveryOf'),actor_id,UTC_TIMESTAMP(6) FROM workflow_policy_versions WHERE id=?", [conflict, `SYNTHETIC-${conflict}`, original.gradingRule!.id]);
  await error(request("coordinator", endpoint, body(expired)), 409, "SOURCE_CHANGED");
  const conflicting = await context(); assert.equal(conflicting.policies.length, 4);
  const beforePolicies = (await admin.query<RowDataPacket[]>("SELECT * FROM workflow_policy_versions ORDER BY id"))[0];
  const beforeReviews = (await view()).history;
  await admin.execute("UPDATE semesters SET locked_at=UTC_TIMESTAMP(6) WHERE id=?", [semesterId]);
  try { await error(request("coordinator", endpoint, body(conflicting)), 409); }
  finally { await admin.execute("UPDATE semesters SET locked_at=NULL WHERE id=?", [semesterId]); }
  const [[owner]] = await admin.execute<RowDataPacket[]>("SELECT * FROM scholar_semesters WHERE scholar_id=? AND semester_id=?", [scholar, semesterId]);
  const [[other]] = await admin.execute<RowDataPacket[]>("SELECT id,scholar_id FROM participations WHERE scholar_id<>? LIMIT 1", [scholar]);
  const otherOwner = randomUUID(), entitlement = randomUUID();
  await admin.execute("INSERT INTO scholar_semesters(id,scholar_id,semester_id,participation_id,scope_version_id,actor_id,recorded_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))", [otherOwner, other.scholar_id, semesterId, other.id, owner.scope_version_id, actor]);
  try {
    await error(request("coordinator", endpoint, body(conflicting)), 409, "SOURCE_CHANGED");
    await admin.execute("INSERT INTO semester_entitlements(id,scholar_semester_id,scholar_id,semester_id,benefit_type,amount_centavos,currency,actor_id,recorded_at) VALUES(?,?,?,?,'degree_stipend',500000,'PHP',?,UTC_TIMESTAMP(6))", [entitlement, otherOwner, other.scholar_id, semesterId, actor]);
    const dependent = await context(); assert.match(dependent.blocker!, /entitlement/);
    await error(request("coordinator", endpoint, body(dependent)), 409, "GRADING_RECOVERY_BLOCKED");
  } finally {
    await admin.execute("DELETE FROM semester_entitlements WHERE id=?", [entitlement]);
    await admin.execute("DELETE FROM scholar_semesters WHERE id=?", [otherOwner]);
  }
  const payload = body(await context()), key = randomUUID(), otherKey = randomUUID();
  const count = async () => (await admin.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM workflow_policy_versions) AS policies,(SELECT COUNT(*) FROM workflow_authority_versions) AS authorities"))[0];
  const counts = await count();
  await admin.query("CREATE TRIGGER reject_grading_recovery BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.grading.recover' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  try { assert.equal((await request("coordinator", endpoint, payload, key)).statusCode, 500); }
  finally { await admin.query("DROP TRIGGER reject_grading_recovery"); }
  assert.deepEqual(await count(), counts); assert.equal((await view()).gradingRule, null);
  const race = await Promise.all([request("coordinator", endpoint, payload, key), request("reviewer", endpoint, payload, otherKey)]);
  assert.deepEqual(race.map((r) => r.statusCode).sort(), [200, 409]);
  const winner = race[0].statusCode === 200 ? "coordinator" : "reviewer", winningKey = winner === "coordinator" ? key : otherKey;
  const saved = (await ok(request(winner, endpoint, payload, winningKey))).json();
  await error(request(winner, endpoint, { ...payload, reason: "Different reason" }, winningKey), 409, "IDEMPOTENCY_CONFLICT");
  const recovered = await view(); assert.equal(recovered.gradingRule!.id, saved.id); assert.equal(recovered.stale, true); assert.notEqual(recovered.result, "compliant");
  assert.deepEqual(recovered.history, beforeReviews);
  const olderIds = beforePolicies.map((p) => p.id);
  assert.deepEqual((await admin.execute<RowDataPacket[]>("SELECT * FROM workflow_policy_versions WHERE id IN (" + olderIds.map(() => "?").join(",") + ") ORDER BY id", olderIds))[0], beforePolicies);
  const recovery = recovered.gradingHistory.find((p) => p.id === saved.id)!; assert.deepEqual([...recovery.recoveryOf].sort(), conflicting.policies.map((p) => p.id).sort());
  const review = async () => { const v = await view(); await ok(request(v.ended ? "coordinator" : "staff", path + (v.ended ? "/ended-review" : ""), { sourceHash: v.sourceHash, expectedRevision: v.revision, findings: v.history[0].findings, reviewed: true, ...(v.ended ? { academicOnly: true, reason: "Synthetic ended-period review after recovery" } : {}) })); };
  await review(); assert.equal((await view()).result, "noncompliant");
  // Recovered policy accepts ordinary versioned replacements.
  const replacement = (await ok(request("coordinator", path + "/grading-rule/replacement-context"))).json();
  await ok(request("coordinator", path + "/grading-rule/replace", { expectedPolicyId: saved.id, expectedRevision: 1, impactHash: replacement.impactHash, kind: "equivalent", rule: { ...payload.rule, threshold: "87" }, issuer: payload.issuer, authorityReference: payload.authorityReference, sourceReference: payload.sourceReference, reason: "Synthetic approved successor after recovery", reviewed: true }));
  const successor = (await view()).gradingRule!.id; assert.notEqual(successor, saved.id);
  assert.equal((await view()).gradingHistory.find((p) => p.id === successor)!.authorityUntil, payload.authorityUntil);
  await expire(successor);
  const [[period]] = await admin.execute<RowDataPacket[]>("SELECT DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends FROM semesters WHERE id=?", [semesterId]);
  await admin.execute("UPDATE semesters SET ends_on='2026-10-06' WHERE id=?", [semesterId]);
  try {
    const ended = await context(); assert.equal(ended.ended, true);
    await error(request("coordinator", endpoint, { ...body(ended), academicOnly: false }), 409, "SOURCE_CHANGED");
    await ok(request("coordinator", endpoint, body(ended)));
    await review(); assert.equal((await view()).history[0].academicOnly, true);
  } finally { await admin.execute("UPDATE semesters SET ends_on=? WHERE id=?", [period.ends, semesterId]); }
  await ok(request("coordinator", endpoint, body(await context())));
  await review();
  const [[financial]] = await admin.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM semester_entitlements) AS entitlements,(SELECT COUNT(*) FROM payment_records) AS payments,(SELECT COUNT(*) FROM scholarship_records) AS annuals");
  assert.deepEqual({ ...financial }, { entitlements: 0, payments: 0, annuals: 0 });
  if (process.argv.includes("--browser-recovery")) await expire((await view()).gradingRule!.id);
  console.log("PASS Grading recovery: expired/conflicting lineage, immutable history, cohort dependencies, roles, stale context, audit rollback, concurrent retry, replacement and ended-period recovery");
}
