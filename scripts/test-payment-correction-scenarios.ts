import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { testFinalization } from "./test-ovr-finalization-scenarios.js";
import type { OvrBatch, OvrDetail } from "../server/ovr/model.js";
type Context = Parameters<typeof testFinalization>[0];
function fixture(c: Context, id: string) {
  const base = `/api/v1/ovr-batches/${id}`,
    evidence = {
      reason: "Synthetic payment correction",
      reference: "PAYMENT-025",
    };
  const read = async () => {
    const r = await c.request("staff", base);
    assert.equal(r.statusCode, 200, r.body);
    return r.json<OvrDetail>();
  };
  const cmd = async (
    action: string,
    role: string,
    extra: object,
    key = randomUUID(),
    revision?: number,
  ) => {
    const v = await read();
    return c.request(
      role,
      `${base}/payment-corrections/${action}`,
      { expectedRevision: revision ?? v.batch.revision, ...evidence, ...extra },
      key,
    );
  };
  const save = async (action: string, role: string, extra: object) => {
    const r = await cmd(action, role, extra);
    assert.equal(r.statusCode, 200, r.body);
    return r.json<OvrBatch>();
  };
  return { base, evidence, read, cmd, save };
}
export async function testOpenPaymentCorrection(c: Context, batch: OvrBatch) {
  const { read, cmd, save } = fixture(c, batch.id),
    v = await read(),
    p = v.payments[0];
  const data = {
    paymentId: p.id,
    outcome: "paid",
    amount: "5000.00",
    effectiveOn: p.effectiveOn,
    remarks: "Corrected disbursement receipt",
  };
  assert.equal((await cmd("correct", "system_admin", data)).statusCode, 403);
  for (const amount of ["abc", "1.2.3", "0.00", "-1.00"])
    assert.equal(
      (await cmd("correct", "staff", { ...data, amount })).statusCode,
      422,
    );
  assert.equal(
    (await cmd("correct", "staff", { ...data, paymentId: randomUUID() })).json()
      .error.code,
    "PAYMENT_NOT_FOUND",
  );
  assert.equal(
    (await cmd("request", "staff", data)).json().error.code,
    "PAYMENT_USE_DIRECT_CORRECTION",
  );
  await c.admin.query(
    "CREATE TRIGGER fail_payment_correction BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payment.correction' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'; END IF; END",
  );
  try {
    assert.equal((await cmd("correct", "staff", data)).statusCode, 500);
  } finally {
    await c.admin.query("DROP TRIGGER fail_payment_correction");
  }
  assert.deepEqual((await read()).payments, v.payments);
  assert.equal((await read()).batch.revision, batch.revision);
  await save("correct", "staff", data);
  assert.equal((await read()).reconciliation.paidTotal, "5000.00");
  assert.deepEqual((await read()).originalPayments, v.originalPayments);
  assert.equal((await cmd("correct", "staff", {...data,outcome:"not_paid",amount:"0.00",remarks:"No receipt occurred"})).statusCode,423);
  await save("request", "staff", {
    ...data,
    outcome: "not_paid", unpaidReason: "review",
    amount: "0.00",
    remarks: "Reversed erroneous paid status",
  });
  assert.equal((await read()).reconciliation.paidTotal, "5000.00", "Pending reversal leaves the paid outcome effective");
  await save("approve", "coordinator", {correctionId:(await read()).paymentCorrections[0].id});
  assert.equal((await read()).reconciliation.paidTotal, "0.00");
  const result = await save("correct", "staff", data);
  assert.equal((await read()).paymentCorrections.length, 3);
  console.log(
    "PASS F25 Pre-closure corrections preserve original outcomes, reconcile status/amount changes and roll back on audit failure",
  );
  return result;
}
export async function testClosedPaymentCorrection(c: Context, id: string) {
  const { base, evidence, read, cmd, save } = fixture(c, id),
    v = await read(),
    p = v.payments[0];
  const data = {
    paymentId: p.id,
    outcome: "paid",
    amount: "5000.00",
    effectiveOn: p.effectiveOn,
    remarks: "Approved additional receipt evidence",
  };
  assert.equal(v.batch.state, "closed");
  assert.equal(
    (await cmd("correct", "staff", data)).json().error.code,
    "PAYMENT_CORRECTION_APPROVAL_REQUIRED",
  );
  await save("request", "coordinator", data);
  let pending = (await read()).paymentCorrections[0];
  assert.equal(
    (await cmd("approve", "staff", { correctionId: pending.id })).json()
      .error.code,
    "PERMISSION_DENIED",
  );
  const [staff] = await c.admin.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE email='staff@example.invalid'",
  );
  await c.admin.execute(
    "INSERT INTO user_roles(id,user_id,role_code,granted_at) VALUES(?,?,'coordinator',UTC_TIMESTAMP(6))",
    [randomUUID(), staff[0].id],
  );
  try {
    await save("reject", "staff", { correctionId: pending.id });
  } finally {
    await c.admin.execute(
      "UPDATE user_roles SET revoked_at=UTC_TIMESTAMP(6) WHERE user_id=? AND role_code='coordinator' AND revoked_at IS NULL",
      [staff[0].id],
    );
  }
  assert.deepEqual((await read()).payments, v.payments);
  await save("request", "staff", data);
  pending = (await read()).paymentCorrections[0];
  assert.equal(
    (await cmd("request", "staff", data)).json().error.code,
    "PAYMENT_CORRECTION_PENDING",
  );
  assert.equal(
    (await cmd("approve", "staff", { correctionId: pending.id })).statusCode,
    403,
  );
  assert.equal(
    (await cmd("approve", "system_admin", { correctionId: pending.id }))
      .statusCode,
    403,
  );
  assert.deepEqual((await read()).payments, v.payments);
  console.log(
    "PASS F25 Closed-period requests require independent approval; rejection and pending proposals leave effective outcomes unchanged",
  );
  if (process.argv.includes("--browser")) return;
  await c.admin.query(
    "CREATE TRIGGER fail_payment_correction BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payment.correction' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'; END IF; END",
  );
  const failedKey = randomUUID();
  try {
    assert.equal(
      (
        await cmd(
          "approve",
          "coordinator",
          { correctionId: pending.id },
          failedKey,
        )
      ).statusCode,
      500,
    );
  } finally {
    await c.admin.query("DROP TRIGGER fail_payment_correction");
  }
  assert.deepEqual((await read()).payments, v.payments);
  const [receipts] = await c.admin.execute<RowDataPacket[]>(
    "SELECT command_id FROM ovr_commands WHERE command_id=?",
    [failedKey],
  );
  assert.equal(receipts.length, 0);
  const revision = (await read()).batch.revision,
    keys = [randomUUID(), randomUUID()],
    body = {
      expectedRevision: revision,
      ...evidence,
      correctionId: pending.id,
    };
  const results = await Promise.all(
    keys.map((key) =>
      c.request(
        "coordinator",
        `${base}/payment-corrections/approve`,
        body,
        key,
      ),
    ),
  );
  assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
  const winner = results.findIndex((r) => r.statusCode === 200);
  assert.deepEqual(
    (
      await c.request(
        "coordinator",
        `${base}/payment-corrections/approve`,
        body,
        keys[winner],
      )
    ).json(),
    results[winner].json(),
  );
  assert.equal(
    (
      await c.request(
        "coordinator",
        `${base}/payment-corrections/approve`,
        { ...body, reference: "CHANGED" },
        keys[winner],
      )
    ).json().error.code,
    "IDEMPOTENCY_CONFLICT",
  );
  const final = await read();
  assert.equal(final.reconciliation.paidTotal, "5000.00");
  assert.deepEqual(final.batch.closure, v.batch.closure);
  assert.deepEqual(final.originalPayments, v.originalPayments);
  assert.deepEqual(final.finalization, v.finalization);
  assert.equal(final.batch.state, "closed");
  for (const sql of [
    "EXPLAIN DELETE FROM payment_corrections WHERE 1=0",
    "EXPLAIN UPDATE payment_corrections SET state=state WHERE 1=0",
  ])
    await assert.rejects(c.runtime.query(sql));
  console.log(
    "PASS F25 Concurrent approval has one winner; corrections are atomic and retry-safe while original payments, roster and closure totals stay immutable",
  );
}
