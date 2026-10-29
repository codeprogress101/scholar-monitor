import { digest } from "../../server/auth/crypto.js";
import type { OvrFinalization } from "../../server/ovr/model.js";
import type { PaymentRecord } from "../../server/ovr/processing-model.js";
import type { ExistingFinancialEvidence } from "../../server/payments/contracts.js";

/** Synthetic existing evidence; never represents a newly authorized payment. */
export function paymentEvidence(count = 3): ExistingFinancialEvidence {
  const payments: PaymentRecord[] = Array.from({ length: count }, (_, i) => ({
    id: `payment-${i}`, batchId: "batch", cycleId: "cycle", revision: i + 4,
    scholarshipId: `annual-${i}`, outcome: i < 10 ? "not_paid" : "paid",
    unpaidReason: i < 10 ? "did_not_claim" : null,
    amount: i < 10 ? "0.00" : "5000.00", effectiveOn: i < 10 ? null : "2026-10-06",
    reference: "Synthetic reference", remarks: "", actorId: "staff", actorName: "Synthetic Staff",
    recordedAt: "2026-10-21T01:00:00.000000Z",
  }));
  const snapshot = {
    batchId: "batch", entries: payments.map(p => ({ scholarshipId: p.scholarshipId })),
  } as OvrFinalization;
  const frozen = { snapshot, hash: digest(JSON.stringify(snapshot)) };
  return {
    scope: "complete_batch", batch: { id: "batch", cycleId: "cycle", revision: count + 4, state: "processed" },
    finalization: frozen, effectiveFinalization: frozen, payments,
    originalPayments: structuredClone(payments), paymentCorrections: [], amendments: [],
    treasuryEvidence: null, historicalReceipts: [],
  };
}
