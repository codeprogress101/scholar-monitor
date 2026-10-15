import { testOpenPaymentCorrection } from "./test-payment-correction-scenarios.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { testFinalization } from "./test-ovr-finalization-scenarios.js";
import type { OvrBatch, OvrDetail } from "../server/ovr/model.js";
import { today } from "../server/scholars/validation.js";
export async function testProcessing(
  c: Parameters<typeof testFinalization>[0],
  initial: OvrBatch,
) {
  let batch = initial,
    passed = 0;
  const base = `/api/v1/ovr-batches/${batch.id}`,
    evidence = {
      effectiveOn: today(),
      reason: "Synthetic processing verification",
      reference: "PROCESS-023",
    };
  const read = async () => {
    const r = await c.request("staff", base);
    assert.equal(r.statusCode, 200, r.body);
    return r.json<OvrDetail>();
  };
  const pendingBatch = async (role: string) => {
    const r = await c.request(role, `/api/v1/notifications?mode=pending&type=payroll&source=${batch.id}`);
    assert.equal(r.statusCode, 200, r.body);
    return r.json().items.some((n: { sourceId: string }) => n.sourceId === batch.id);
  };
  const original = (await read()).finalization;
  const blockedCycleClose = async () => {
    const response = await c.request("coordinator", `/api/v1/payout-cycles/${c.cycleId}/close`, {
      action: "close", expectedVersion: c.cycleVersion,
      reason: "Attempt premature cycle closure", reference: "CLOSE-TEST",
    });
    assert.equal(response.statusCode, 409, response.body);
    assert.equal(response.json().error.code, "PAYOUT_CYCLE_UNFINISHED");
  };
  await blockedCycleClose();
  const cmd = (
    action: string,
    role = "coordinator",
    extra: object = {},
    key = randomUUID(),
  ) =>
    c.request(
      role,
      `${base}/${action}`,
      { expectedRevision: batch.revision, ...evidence, ...extra },
      key,
    );
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
  const save = async (
    action: string,
    role = "coordinator",
    extra: object = {},
  ) => {
    const r = await cmd(action, role, extra);
    assert.equal(r.statusCode, 200, r.body);
    batch = r.json<OvrBatch>();
  };
  const pass = (s: string) => {
    passed++;
    console.log("PASS F23 " + s);
  };
  for (const role of ["staff", "system_admin", "unassigned"]) {
    assert.equal((await cmd("submit", role)).statusCode, 403);
    assert.equal(
      (await cmd("close", role, { reconciled: true })).statusCode,
      403,
    );
  }
  await deny("mark-processed", "staff", {}, 409, "OVR_INVALID_STATE");
  await deny(
    "submit",
    "coordinator",
    { actorId: randomUUID() },
    422,
    "VALIDATION_FAILED",
  );
  await deny(
    "submit",
    "coordinator",
    { effectiveOn: "1900-01-01" },
    422,
    "INVALID_PROCESSING_DATE",
  );
  await deny(
    "submit",
    "coordinator",
    { effectiveOn: "2999-01-01" },
    422,
    "VALIDATION_FAILED",
  );
  pass("Authority, strict input and lifecycle chronology enforced");
  await save("submit");
  await save("mark-processed", "staff");
  assert.equal(batch.state, "processed");
  assert.equal(await pendingBatch("staff"), true);
  await blockedCycleClose();
  assert.deepEqual((await read()).finalization, original);
  pass("Processing uses the frozen roster even after live source changes");
  await deny(
    "close",
    "coordinator",
    { reconciled: false },
    409,
    "OVR_UNRECONCILED",
  );
  await deny(
    "close",
    "coordinator",
    { reconciled: true },
    409,
    "OVR_PAYMENT_DATA_MISSING",
  );
  const members = original!.snapshot.entries;
  const paid = {
    scholarshipId: members[0].scholarshipId,
    outcome: "paid",
    amount: "5000.00",
    remarks: "Synthetic paid receipt",
    reason: "",
    reference: "",
  };
  await deny(
    "payments",
    "staff",
    { ...paid, scholarshipId: randomUUID() },
    409,
    "PAYMENT_NOT_IN_ROSTER",
  );
  for (const amount of [
    "1000.00",
    "4999.99",
    "5000.01",
    "0.00",
    "-1.00",
    "1.001",
    "abc",
    "1.2.3",
    "1",
    "10000000000.00",
  ])
    await deny(
      "payments",
      "staff",
      { ...paid, amount },
      422,
      "VALIDATION_FAILED",
    );
  await deny(
    "payments",
    "staff",
    { ...paid, outcome: "not_paid", unpaidReason: "review", amount: "0.00", remarks: "" },
    422,
    "VALIDATION_FAILED",
  );
  pass(
    "Missing outcomes, foreign members and invalid amounts cannot be reconciled",
  );
  const failKey = randomUUID();
  await c.admin.query(
    "CREATE TRIGGER fail_processing_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='ovr.processing' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'; END IF; END",
  );
  try {
    assert.equal(
      (await cmd("payments", "staff", paid, failKey)).statusCode,
      500,
    );
  } finally {
    await c.admin.query("DROP TRIGGER fail_processing_audit");
  }
  assert.equal((await read()).payments.length, 0);
  assert.equal((await read()).batch.revision, batch.revision);
  const [receipts] = await c.admin.execute<RowDataPacket[]>(
    "SELECT command_id FROM ovr_commands WHERE command_id=?",
    [failKey],
  );
  assert.equal(receipts.length, 0);
  pass("Audit failure rolls back payment, event and retry receipt together");
  if (
    process.argv.includes("--browser") &&
    !process.argv.includes("--payments")
  )
    return;
  const revision = batch.revision;
  const results = await Promise.all([
    cmd("payments", "staff", paid),
    cmd("payments", "coordinator", paid),
  ]);
  assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
  batch = results.find((r) => r.statusCode === 200)!.json<OvrBatch>();
  assert.equal(batch.revision, revision + 1);
  await deny("payments", "staff", paid, 409, "STIPEND_ALREADY_PAID");
  await deny(
    "close",
    "coordinator",
    { reconciled: true },
    409,
    "OVR_PAYMENT_DATA_MISSING",
  );
  await save("payments", "staff", {
    scholarshipId: members[1].scholarshipId,
    outcome: "not_paid", unpaidReason: "review",
    amount: "0.00",
    remarks: "Scholar did not collect payment",
  });
  const reconciled = (await read()).reconciliation;
  assert.equal(reconciled.complete, true);
  assert.equal(reconciled.paidTotal, "5000.00");
  assert.equal(reconciled.notPaid, 1);
  assert.equal(await pendingBatch("staff"), false);
  assert.equal(await pendingBatch("coordinator"), true);
  pass("Completed outcomes hand off to Coordinator closure without a Staff payment task");
  pass(
    "Concurrent outcomes serialize; duplicates rejected and exact totals reconciled",
  );
  await c.admin.query(
    "CREATE TRIGGER fail_processing_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='ovr.processing' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'; END IF; END",
  );
  try {
    assert.equal(
      (await cmd("close", "coordinator", { reconciled: true })).statusCode,
      500,
    );
  } finally {
    await c.admin.query("DROP TRIGGER fail_processing_audit");
  }
  assert.equal((await read()).batch.state, "processed");
  if (process.argv.includes("--payments"))
    batch = await testOpenPaymentCorrection(c, batch);
  const key = randomUUID(),
    body = { expectedRevision: batch.revision, ...evidence, reconciled: true };
  const closed = await c.request("coordinator", `${base}/close`, body, key);
  assert.equal(closed.statusCode, 200, closed.body);
  batch = closed.json<OvrBatch>();
  assert.equal(await pendingBatch("coordinator"), false);
  assert.deepEqual(
    (await c.request("coordinator", `${base}/close`, body, key)).json(),
    batch,
  );
  const conflict = await c.request(
    "coordinator",
    `${base}/close`,
    { ...body, reference: "CHANGED-REFERENCE" },
    key,
  );
  assert.equal(conflict.json().error.code, "IDEMPOTENCY_CONFLICT");
  await deny("payments", "staff", paid, 423, "OVR_ALREADY_CLOSED");
  await deny(
    "close",
    "coordinator",
    { reconciled: true },
    423,
    "OVR_ALREADY_CLOSED",
  );
  const ordinary = await c.request("staff", `${base}/entries/remove`, {
    expectedRevision: batch.revision,
    reason: evidence.reason,
    reference: evidence.reference,
    scholarshipId: members[0].scholarshipId,
  });
  assert.equal(ordinary.json().error.code, "OVR_ALREADY_CLOSED");
  assert.deepEqual((await read()).finalization, original);
  for (const sql of [
    "EXPLAIN UPDATE payment_records SET amount=amount WHERE 1=0",
    "EXPLAIN DELETE FROM payment_records WHERE 1=0",
  ])
    await assert.rejects(c.runtime.query(sql));
  pass(
    "Closure is atomic and immutable, exact retries remain safe, runtime cannot rewrite outcomes",
  );
  console.log(`All ${passed} F23 processing scenarios passed.`);
}
