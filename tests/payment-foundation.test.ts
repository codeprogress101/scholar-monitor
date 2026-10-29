import { describe, expect, expectTypeOf, it } from "vitest";
import { reconcilePayments } from "../server/ovr/processing-state.js";
import { effectivePayments, type PaymentCorrection } from "../server/ovr/payment-correction-state.js";
import { paymentFoundation, payrollState, financialBasis, type IndividualPaymentOrigin, type ExistingFinancialEvidence, type PaymentDateFacts } from "../server/payments/contracts.js";
import { existingFinancialBasis, existingPaymentProjection } from "../server/payments/financial-basis.js";
import { paymentEvidence } from "./fixtures/payment-foundation.js";

function hash(e: ExistingFinancialEvidence) { return existingFinancialBasis(e).sourceHash; }
describe("inactive P01 payment foundation", () => {
  it("has no activation switch or payment authority in its evidence contract", () => {
    expect(paymentFoundation).toEqual({ phase: "P01", newActionsEnabled: false });
    expect(Object.isFrozen(paymentFoundation)).toBe(true);
    const basis = existingFinancialBasis(paymentEvidence());
    expect(basis).toMatchObject({ scope: "complete_batch", freshness: "snapshot_only", authorizesPayment: false });
    for (const value of [{ ...basis, authorizesPayment: true }, { ...basis, scope: "page" }, { ...basis, sourceHash: "bad" }, { ...basis, batchRevision: 0 }, { ...basis, approval: true }]) {
      expect(financialBasis.safeParse(value).success).toBe(false);
    }
  });
  it("keeps future DV-only and omitted OR/DV origins distinct without implementing transitions", () => {
    expectTypeOf<Extract<IndividualPaymentOrigin, { kind: "unclaimed" }>["documents"]>().toEqualTypeOf<"dv_only">();
    expectTypeOf<Extract<IndividualPaymentOrigin, { kind: "omitted" }>["documents"]>().toEqualTypeOf<"or_and_dv">();
    expectTypeOf<PaymentDateFacts["effectiveOn"]>().toEqualTypeOf<string | null>();
    for (const state of ["draft", "review", "finalized", "submitted", "processed", "closed"]) expect(payrollState.safeParse(state).success).toBe(true);
    expect(payrollState.safeParse("paid").success).toBe(false);
  });
  it.each([0, 1, 19, 20, 25, 100, 835, 1200])("preserves complete reconciliation and payment order for %i rows", count => {
    const e = paymentEvidence(count), before = structuredClone(e), result = existingPaymentProjection(e);
    expect(result.reconciliation).toEqual(reconcilePayments(e.effectiveFinalization!.snapshot, e.payments));
    expect(result.payments).toBe(e.payments); expect(result.originalPayments).toBe(e.originalPayments);
    expect(result.paymentCorrections).toBe(e.paymentCorrections); expect(e).toEqual(before);
    if (count === 835) expect(result.reconciliation).toMatchObject({ required: 835, paid: 825, unclaimed: 10, paidTotal: "4125000.00" });
  });
  it("preserves missing, withheld/review and unknown historical-date behavior instead of activating P03 completion", () => {
    const e = paymentEvidence();
    e.payments[0].unpaidReason = "withheld"; e.payments[1].unpaidReason = "review";
    expect(existingPaymentProjection(e).reconciliation).toMatchObject({ complete: true, needsReview: 2 });
    expect(existingPaymentProjection(e).payments[0].effectiveOn).toBeNull();
    e.payments.pop(); e.originalPayments.pop();
    expect(existingPaymentProjection(e).reconciliation).toMatchObject({ complete: false, missingScholarshipIds: ["annual-2"] });
  });
  it("reuses existing correction precedence and never promotes a pending proposal", () => {
    const e = paymentEvidence(1), original = e.originalPayments[0];
    const applied = { id: "correction", version: 2, batchId: "batch", paymentId: original.id, revision: 8, state: "approved", before: original, proposed: { ...original, outcome: "paid", amount: "5000.00" }, after: { ...original, outcome: "paid", amount: "5000.00" } } as PaymentCorrection;
    const pending = { ...applied, id: "pending", version: 1, revision: 9, state: "pending", after: undefined, proposed: { ...original, amount: "0.00" } } as PaymentCorrection;
    e.paymentCorrections = [pending, applied]; e.payments = effectivePayments(e.originalPayments, e.paymentCorrections);
    expect(existingPaymentProjection(e).reconciliation.paidTotal).toBe("5000.00");
    expect(e.originalPayments[0].amount).toBe("0.00");
  });
  it("is deterministic across object-key/history ordering, while preserving frozen member order", () => {
    const e = paymentEvidence();
    const changed = structuredClone(e);
    changed.batch = { state: e.batch.state, revision: e.batch.revision, cycleId: e.batch.cycleId, id: e.batch.id };
    expect(hash(changed)).toBe(hash(e));
    changed.effectiveFinalization!.snapshot.entries.reverse();
    expect(hash(changed)).not.toBe(hash(e));
  });
  it("changes basis for actual payment, correction, classification revision, treasury, historical and frozen sources", () => {
    const e = paymentEvidence(), baseline = hash(e);
    const variations: ((v: ExistingFinancialEvidence) => void)[] = [
      v => { v.payments[0].effectiveOn = "2026-09-28"; },
      v => { v.payments[0].unpaidReason = "review"; },
      // Existing classify-unpaid writes advance the batch event even if reason is unchanged.
      v => { v.batch.revision++; },
      v => { v.originalPayments[0].reference = "Another original source"; },
      v => { v.paymentCorrections.push({ id: "pending", version: 1, batchId: "batch", paymentId: v.payments[0].id, revision: 9, state: "pending", proposed: v.payments[0], before: v.payments[0] } as PaymentCorrection); },
      v => { v.historicalReceipts.push({ id: "historical", scholarshipId: "annual-0", version: 1, state: "pending", actualPaidOn: null, beforeDeadlineEvidence: "Synthetic prior receipt" }); },
      v => { v.treasuryEvidence = { revision: 1, payrollReference: "Returned evidence", officeReceivedOn: "2026-10-06", actorId: "staff", recordedAt: "2026-10-21T01:00:00Z", reason: "Synthetic" }; },
      v => { v.effectiveFinalization = { ...v.effectiveFinalization!, hash: "a".repeat(64) }; },
      v => { v.finalization = { ...v.finalization!, hash: "b".repeat(64) }; },
    ];
    for (const change of variations) { const changed = structuredClone(e); change(changed); expect(hash(changed)).not.toBe(baseline); }
  });
  it("pins approved/rejected historical versions and pending amendments without loading their cohort snapshots", () => {
    const e = paymentEvidence();
    e.historicalReceipts = [{ id: "h", scholarshipId: "annual-0", actualPaidOn: null, beforeDeadlineEvidence: "Synthetic", state: "pending", version: 1 }];
    const before = hash(e); e.historicalReceipts[0] = { ...e.historicalReceipts[0], state: "approved", version: 2 };
    expect(hash(e)).not.toBe(before);
    const historical = hash(e);
    e.amendments = [{ id: "amendment", batchId: "batch", version: 1, revision: 10, state: "pending", beforeHash: "c".repeat(64) } as ExistingFinancialEvidence["amendments"][number]];
    expect(hash(e)).not.toBe(historical);
  });
  it("does not acquire incidental UI/download fields or copy full validation/cohort graphs into the hash", () => {
    const e = paymentEvidence(), before = hash(e);
    Object.assign(e.batch, { downloadedAt: "today", actorName: "Display name", validation: { get entries() { throw Error("Do not expand eligibility"); } } });
    expect(hash(e)).toBe(before);
  });
  it("rejects partial/missing sources and cross-batch evidence instead of issuing a misleading full basis", () => {
    const e = paymentEvidence();
    for (const field of ["scope", "payments", "originalPayments", "paymentCorrections", "amendments", "historicalReceipts", "treasuryEvidence", "finalization", "effectiveFinalization"] as const) {
      const partial = { ...e }; delete (partial as Partial<ExistingFinancialEvidence>)[field];
      expect(() => existingFinancialBasis(partial)).toThrow();
    }
    const other = paymentEvidence(); other.payments[0].batchId = "other";
    expect(() => existingFinancialBasis(other)).toThrow(/different batches/);
    const duplicate = paymentEvidence(); duplicate.payments[1] = duplicate.payments[0];
    expect(() => existingFinancialBasis(duplicate)).toThrow(/different batches/);
  });
  it("neither mutates frozen inputs nor retains a cross-call result after source changes", () => {
    const e = paymentEvidence();
    const freeze = (v: object) => { for (const child of Object.values(v)) if (child && typeof child === "object") freeze(child); Object.freeze(v); };
    freeze(e); expect(() => existingPaymentProjection(e)).not.toThrow();
    const changed = structuredClone(e); changed.payments[0].remarks = "New evidence";
    expect(hash(changed)).not.toBe(hash(e));
  });
});
