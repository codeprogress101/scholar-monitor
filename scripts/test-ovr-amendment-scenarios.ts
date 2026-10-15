import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { testFinalization } from "./test-ovr-finalization-scenarios.js";
import type { OvrBatch, OvrDetail } from "../server/ovr/model.js";
import { today } from "../server/scholars/validation.js";
export async function testAmendments(
  c: Parameters<typeof testFinalization>[0],
  initial: OvrBatch,
  helpers: {
    ready: (id: string) => Promise<unknown>;
    reopen: (id: string) => Promise<void>;
  },
) {
  let batch = initial,
    passed = 0;
  const base = `/api/v1/ovr-batches/${batch.id}`,
    evidence = {
      reason: "Synthetic amendment evidence",
      reference: "AMEND-024",
    };
  const read = async () => {
    const r = await c.request("staff", base);
    assert.equal(r.statusCode, 200, r.body);
    return r.json<OvrDetail>();
  };
  const original = (await read()).finalization!;
  const cmd = (
    action: string,
    role = "staff",
    extra: object = {},
    key = randomUUID(),
  ) =>
    c.request(
      role,
      `${base}/amendments/${action}`,
      { expectedRevision: batch.revision, ...evidence, ...extra },
      key,
    );
  const save = async (action: string, role: string, extra: object) => {
    const r = await cmd(action, role, extra);
    assert.equal(r.statusCode, 200, r.body);
    batch = r.json<OvrBatch>();
  };
  const deny = async (
    action: string,
    role: string,
    extra: object,
    status: number,
    code: string,
  ) => {
    const r = await cmd(action, role, extra);
    assert.equal(r.statusCode, status, r.body);
    assert.equal(r.json().error.code, code);
  };
  const pass = (s: string) => {
    passed++;
    console.log("PASS F24 " + s);
  };
  const removal = { change: "remove", scholarshipId: c.annualId };
  assert.equal((await cmd("request", "system_admin", removal)).statusCode, 403);
  assert.equal(
    (await cmd("approve", "staff", { amendmentId: randomUUID() })).statusCode,
    403,
  );
  await deny(
    "request",
    "staff",
    { ...removal, approverId: randomUUID() },
    422,
    "VALIDATION_FAILED",
  );
  await deny(
    "request",
    "staff",
    { change: "add", scholarshipId: c.annualId },
    409,
    "OVR_DUPLICATE_ENTRY",
  );
  await deny(
    "request",
    "staff",
    { change: "remove", scholarshipId: randomUUID() },
    409,
    "OVR_ENTRY_NOT_FOUND",
  );
  pass(
    "Operational authority and strict input protect amendment requests and decisions",
  );
  await save("request", "coordinator", removal);
  let pending = (await read()).amendments[0];
  await deny(
    "approve",
    "staff",
    { amendmentId: pending.id },
    403,
    "PERMISSION_DENIED",
  );
  // Use another independently assigned Coordinator in this disposable fixture only.
  const [staff] = await c.admin.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE email='staff@example.invalid'",
  );
  await c.admin.execute(
    "INSERT INTO user_roles(id,user_id,role_code,granted_at) VALUES(?,?,'coordinator',UTC_TIMESTAMP(6))",
    [randomUUID(), staff[0].id],
  );
  try {
    await save("reject", "staff", { amendmentId: pending.id });
  } finally {
    await c.admin.execute(
      "UPDATE user_roles SET revoked_at=UTC_TIMESTAMP(6) WHERE user_id=? AND role_code='coordinator' AND revoked_at IS NULL",
      [staff[0].id],
    );
  }
  assert.deepEqual((await read()).effectiveFinalization, original);
  pass(
    "Self-approval denied and independent rejection preserves the effective roster",
  );
  await save("request", "staff", removal);
  pending = (await read()).amendments[0];
  await deny("request", "staff", removal, 409, "OVR_AMENDMENT_PENDING");
  const submission = await c.request("coordinator", `${base}/submit`, {
    expectedRevision: batch.revision,
    ...evidence,
    effectiveOn: today(),
  });
  assert.equal(submission.json().error.code, "OVR_AMENDMENT_PENDING");
  assert.deepEqual((await read()).finalization, original);
  pass("Pending request preserves membership and pauses processing");
  if (process.argv.includes("--browser")) return;
  const failedKey = randomUUID();
  await c.admin.query(
    "CREATE TRIGGER fail_amendment_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='ovr.amendment' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'; END IF; END",
  );
  try {
    assert.equal(
      (
        await cmd(
          "approve",
          "coordinator",
          { amendmentId: pending.id },
          failedKey,
        )
      ).statusCode,
      500,
    );
  } finally {
    await c.admin.query("DROP TRIGGER fail_amendment_audit");
  }
  assert.equal((await read()).amendments[0].state, "pending");
  assert.equal((await read()).entries.length, 2);
  const [receipts] = await c.admin.execute<RowDataPacket[]>(
    "SELECT command_id FROM ovr_commands WHERE command_id=?",
    [failedKey],
  );
  assert.equal(receipts.length, 0);
  pass("Audit failure rolls back approval, roster events and retry receipt");
  const approvalBody = {
      expectedRevision: batch.revision,
      ...evidence,
      amendmentId: pending.id,
    },
    keys = [randomUUID(), randomUUID()];
  const approvals = await Promise.all(
    keys.map((k) =>
      c.request("coordinator", `${base}/amendments/approve`, approvalBody, k),
    ),
  );
  assert.deepEqual(approvals.map((r) => r.statusCode).sort(), [200, 409]);
  const winner = approvals.findIndex((r) => r.statusCode === 200);
  batch = approvals[winner].json<OvrBatch>();
  assert.deepEqual(
    (
      await c.request(
        "coordinator",
        `${base}/amendments/approve`,
        approvalBody,
        keys[winner],
      )
    ).json(),
    batch,
  );
  const v = await read();
  assert.deepEqual(v.finalization, original);
  assert.equal(v.entries.length, 1);
  assert.equal(v.effectiveFinalization!.snapshot.entries.length, 1);
  assert.equal(v.reconciliation.required, 1);
  assert.equal(batch.state, "finalized");
  await deny(
    "request",
    "staff",
    { change: "add", scholarshipId: c.annualId },
    409,
    "OVR_VALIDATION_FAILED",
  );
  await deny(
    "request",
    "staff",
    { change: "remove", scholarshipId: v.entries[0].scholarshipId },
    409,
    "OVR_VALIDATION_FAILED",
  );
  pass(
    "Concurrent approval has one winner, original roster is reconstructable, amended reconciliation excludes the removed member",
  );
  await helpers.ready(c.annualId);
  await save("request", "staff", { change: "add", scholarshipId: c.annualId });
  pending = (await read()).amendments[0];
  await helpers.reopen(c.annualId);
  await deny(
    "approve",
    "coordinator",
    { amendmentId: pending.id },
    409,
    "OVR_VALIDATION_FAILED",
  );
  await save("reject", "coordinator", { amendmentId: pending.id });
  await helpers.ready(c.annualId);
  await save("request", "staff", { change: "add", scholarshipId: c.annualId });
  pending = (await read()).amendments[0];
  await save("approve", "coordinator", { amendmentId: pending.id });
  assert.equal((await read()).entries.length, 2);
  await save("request", "staff", removal);
  pending = (await read()).amendments[0];
  await save("approve", "coordinator", { amendmentId: pending.id });
  pass(
    "Additions require eligible current evidence at request and approval; stale proposals cannot be approved",
  );
  const processing = async (action: string, extra: object = {}) => {
    const r = await c.request("coordinator", `${base}/${action}`, {
      expectedRevision: batch.revision,
      ...evidence,
      effectiveOn: today(),
      ...extra,
    });
    assert.equal(r.statusCode, 200, r.body);
    batch = r.json<OvrBatch>();
  };
  await processing("submit");
  await save("request", "staff", {
    change: "rename",
    name: "Corrected OVR title",
  });
  pending = (await read()).amendments[0];
  await save("approve", "coordinator", { amendmentId: pending.id });
  assert.equal(batch.name, "Corrected OVR title");
  assert.equal(batch.state, "finalized");
  assert.equal(batch.administration, undefined);
  await processing("submit");
  await processing("mark-processed");
  await deny(
    "request",
    "staff",
    { change: "rename", name: "Cannot change now" },
    423,
    "RECORD_LOCKED",
  );
  await processing("payments", {
    scholarshipId: v.entries[0].scholarshipId,
    outcome: "paid",
    amount: "5000.00",
    remarks: "Amended roster payment",
  });
  await processing("close", { reconciled: true });
  await deny("request", "staff", removal, 423, "OVR_ALREADY_CLOSED");
  assert.deepEqual((await read()).finalization, original);
  for (const sql of [
    "EXPLAIN UPDATE ovr_amendments SET state=state WHERE 1=0",
    "EXPLAIN DELETE FROM ovr_amendments WHERE 1=0",
  ])
    await assert.rejects(c.runtime.query(sql));
  pass(
    "Submitted corrections require resubmission; processing uses the approved roster and blocks later membership edits",
  );
  console.log(`All ${passed} F24 amendment scenarios passed.`);
}
