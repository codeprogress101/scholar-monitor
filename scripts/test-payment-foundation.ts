import assert from "node:assert/strict";
import type { OvrDetail } from "../server/ovr/model.js";
import { reconcilePayments } from "../server/ovr/processing-state.js";
import { existingPaymentProjection } from "../server/payments/financial-basis.js";

const counts = { snapshots: 0, payments: 0, corrections: 0, historicalReceipts: 0, closed: 0, adapterMs: 0 };
process.once("beforeExit", () => {
  if (counts.snapshots && !process.exitCode) console.log(`PASS P01 same-snapshot existing financial output equivalence: ${JSON.stringify(counts)}; adapter SELECTs=0, writes=0`);
});

/** The fixture's existing authorized full-detail GET has already loaded evidence.
 * Test only: no new requests, SQL, runtime loader or financial commands.
 */
export function assertPaymentFoundation(detail: OvrDetail) {
  const before = JSON.stringify(detail);
  assert.ok(Array.isArray(detail.historicalReceipts));
  assert.notEqual(detail.treasuryEvidence, undefined);
  const evidence = { ...detail, scope: "complete_batch" as const, historicalReceipts: detail.historicalReceipts!, treasuryEvidence: detail.treasuryEvidence! };
  const started = performance.now();
  const result = existingPaymentProjection(evidence);
  counts.adapterMs += performance.now() - started;
  assert.deepEqual(result.reconciliation, detail.reconciliation, "P01 changed the existing API reconciliation");
  assert.deepEqual(result.reconciliation, reconcilePayments(detail.effectiveFinalization?.snapshot ?? null, detail.payments));
  assert.deepEqual(result.payments, detail.payments);
  assert.deepEqual(result.originalPayments, detail.originalPayments);
  assert.deepEqual(result.paymentCorrections, detail.paymentCorrections);
  assert.equal(result.basis.authorizesPayment, false);
  assert.equal(result.basis.sourceHash, existingPaymentProjection(evidence).basis.sourceHash);
  assert.equal(JSON.stringify(detail), before, "P01 mutated original financial/history/evidence fields");
  counts.snapshots++; counts.payments += detail.payments.length;
  counts.corrections += detail.paymentCorrections.length;
  counts.historicalReceipts += detail.historicalReceipts!.length;
  if (detail.batch.state === "closed") counts.closed++;
}
