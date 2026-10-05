import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { LightMyRequestResponse } from "fastify";
import type { Connection, Pool, RowDataPacket } from "mysql2/promise";
import type {
  EligibilityView,
  EligibilitySnapshot,
} from "../server/eligibility/model.js";
import type { EligibilityOverride } from "../server/eligibility/override-model.js";
export async function testOverrideScenarios(c: {
  request: (
    role: string,
    url: string,
    body?: object,
    key?: string,
  ) => Promise<LightMyRequestResponse>;
  path: string;
  view: () => Promise<EligibilityView>;
  save: () => Promise<EligibilitySnapshot>;
  changeSource: () => Promise<void>;
  changeSourceAgain: () => Promise<void>;
  admin: Connection;
  runtime: Pool;
}) {
  const { request, path, view, save, admin, runtime } = c,
    base = path + "/overrides";
  let passed = 0;
  const pass = (s: string) => {
    passed++;
    console.log("PASS F20 " + s);
  };
  const ok = async (p: Promise<LightMyRequestResponse>) => {
    const r = await p;
    assert.equal(r.statusCode, 200, r.body);
    return r.json<EligibilityOverride>();
  };
  const denied = (r: LightMyRequestResponse, status: number, code: string) => {
    assert.equal(r.statusCode, status, r.body);
    assert.equal(r.json().error.code, code);
  };
  const evidence = {
    reason: "Synthetic authorized override review",
    reference: "OVERRIDE-020",
  };
  const createBody = (v: EligibilityView) => ({
    expectedRevision: 0,
    calculationId: v.latest!.id,
    expectedSourceHash: v.current.sourceHash,
    requestedEligible: true,
    reasonCode: "DOCUMENT_EXCEPTION",
    justification:
      "Exceptional document condition authorized for synthetic validation",
    authorityReference: "AUTHORITY-020",
    ...evidence,
  });
  const command = (
    r: EligibilityOverride,
    action: string,
    role = "staff",
    extra: object = {},
    key = randomUUID(),
  ) =>
    request(
      role,
      `${base}/${r.id}/${action}`,
      { expectedRevision: r.revision, ...evidence, ...extra },
      key,
    );
  // F19 fixture ends with an eligible saved snapshot invalidated by reopening COR.
  const stale = await view();
  denied(
    await request("staff", base, createBody(stale)),
    409,
    "ELIGIBILITY_DATA_CHANGED",
  );
  await save();
  const original = (await view()).latest!;
  const body = createBody(await view());
  for (const role of ["system_admin", "unassigned"])
    denied(await request(role, base, body), 403, "PERMISSION_DENIED");
  denied(
    await request("staff", base, { ...body, approved: true }),
    422,
    "VALIDATION_FAILED",
  );
  denied(
    await request("staff", base, { ...body, justification: "x" }),
    422,
    "VALIDATION_FAILED",
  );
  pass(
    "Fresh saved evidence, strict input and operational authority are required",
  );
  await admin.query(
    "CREATE TRIGGER fail_override_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='eligibility.override' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  const key = randomUUID();
  try {
    assert.equal((await request("staff", base, body, key)).statusCode, 500);
  } finally {
    await admin.query("DROP TRIGGER fail_override_audit");
  }
  const [empty] = await admin.query<RowDataPacket[]>(
    "SELECT id FROM eligibility_overrides",
  );
  assert.equal(empty.length, 0);
  const first = await ok(request("staff", base, body, key));
  assert.deepEqual(await ok(request("staff", base, body, key)), first);
  denied(
    await request(
      "staff",
      base,
      { ...body, reason: "Different request evidence" },
      key,
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  denied(await request("coordinator", base, body), 409, "OVERRIDE_PENDING");
  assert.equal((await view()).effective.eligible, false);
  pass(
    "Audit failure rolls back all writes; exact retries are stable and unresolved requests cannot overlap",
  );
  denied(
    await command(first, "submit-review", "coordinator"),
    403,
    "REQUEST_OWNER_REQUIRED",
  );
  denied(await command(first, "approve", "staff"), 403, "PERMISSION_DENIED");
  denied(
    await command(first, "approve", "coordinator"),
    409,
    "INVALID_OVERRIDE_STATE",
  );
  let pending = await ok(command(first, "submit-review"));
  await c.changeSource();
  denied(
    await command(pending, "approve", "coordinator"),
    409,
    "ELIGIBILITY_DATA_CHANGED",
  );
  await save();
  // Merely recalculating does not rebind the pending request.
  denied(
    await command(pending, "approve", "coordinator"),
    409,
    "ELIGIBILITY_DATA_CHANGED",
  );
  let fresh = await view();
  const reeval = await ok(
    command(pending, "reevaluate", "staff", {
      calculationId: fresh.latest!.id,
      expectedSourceHash: fresh.current.sourceHash,
    }),
  );
  assert.equal(reeval.state, "draft");
  assert.deepEqual(reeval.originalCalculation, original);
  assert.notEqual(reeval.calculation.id, original.id);
  denied(
    await command(reeval, "approve", "coordinator"),
    409,
    "INVALID_OVERRIDE_STATE",
  );
  pending = await ok(command(reeval, "submit-review"));
  const approved = await ok(command(pending, "approve", "coordinator"));
  fresh = await view();
  assert.equal(fresh.current.eligible, false);
  assert.equal(fresh.effective.label, "Eligible - Override Approved");
  assert.deepEqual(
    fresh.history.find((r) => r.id === original.id),
    original,
  );
  const report = await request(
    "staff",
    `/api/v1/payout-cycles/${approved.cycleId}/eligibility`,
  );
  assert.equal(report.statusCode, 200);
  assert.deepEqual(report.json().items[0].effective, fresh.effective);
  denied(await command(approved, "cancel"), 409, "INVALID_OVERRIDE_STATE");
  pass(
    "Changed sources block approval until explicit re-evaluation and resubmission; approval preserves normal result and matches reports",
  );
  await c.changeSourceAgain();
  fresh = await view();
  assert.equal(fresh.effective.overrideStale, true);
  assert.equal(fresh.effective.eligible, false);
  await save();
  let second = await ok(request("staff", base, createBody(await view())));
  second = await ok(command(second, "submit-review"));
  const historyBefore = (await view()).history;
  second = await ok(command(second, "reject", "coordinator"));
  assert.equal(second.state, "rejected");
  assert.equal((await view()).effective.eligible, false);
  assert.deepEqual((await view()).history, historyBefore);
  pass(
    "Source changes invalidate approved exceptions; rejection leaves normal calculations intact",
  );
  let self = await ok(request("coordinator", base, createBody(await view())));
  self = await ok(command(self, "submit-review", "coordinator"));
  denied(
    await command(self, "approve", "coordinator"),
    403,
    "SEPARATE_APPROVER_REQUIRED",
  );
  denied(
    await command(self, "reject", "coordinator"),
    403,
    "SEPARATE_APPROVER_REQUIRED",
  );
  await ok(command(self, "cancel", "coordinator"));
  pass(
    "Even a Coordinator cannot approve or reject their own request; cancellation preserves history",
  );
  let concurrent = await ok(request("staff", base, createBody(await view())));
  concurrent = await ok(command(concurrent, "submit-review"));
  const responses = await Promise.all([
    command(concurrent, "approve", "coordinator"),
    command(concurrent, "reject", "coordinator"),
  ]);
  assert.deepEqual(responses.map((r) => r.statusCode).sort(), [200, 409]);
  const [events] = await admin.execute<RowDataPacket[]>(
    "SELECT revision FROM eligibility_override_events WHERE override_id=?",
    [concurrent.id],
  );
  assert.equal(events.length, 3);
  pass(
    "Concurrent decisions have one winner and cannot duplicate decision revisions",
  );
  for (const table of [
    "eligibility_overrides",
    "eligibility_override_events",
    "eligibility_override_commands",
  ]) {
    await assert.rejects(
      runtime.query(`EXPLAIN DELETE FROM ${table} WHERE 1=0`),
    );
    const field =
      table === "eligibility_overrides"
        ? "id"
        : table === "eligibility_override_events"
          ? "revision"
          : "result";
    await assert.rejects(
      runtime.query(`EXPLAIN UPDATE ${table} SET ${field}=${field} WHERE 1=0`),
    );
  }
  const [audit] = await admin.query<RowDataPacket[]>(
    "SELECT id FROM audit_logs WHERE event_type='eligibility.override'",
  );
  const [allEvents] = await admin.query<RowDataPacket[]>(
    "SELECT sequence FROM eligibility_override_events",
  );
  assert.equal(audit.length, allEvents.length);
  pass(
    "Every immutable event is audited and runtime credentials cannot update or delete override history",
  );
  // Leave a submitted request for browser review and closed-cycle checks.
  let review = await ok(request("staff", base, createBody(await view())));
  review = await ok(command(review, "submit-review"));
  console.log(`All ${passed} F20 override scenarios passed.`);
  return { review, body, key, first };
}
