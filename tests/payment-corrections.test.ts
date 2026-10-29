import { describe, it, expect } from "vitest";
import { correctionChangesOutcome, parsePaymentCorrection } from "../server/ovr/payment-correction-service.js";
import {
  effectivePayments,
  type PaymentCorrection,
} from "../server/ovr/payment-correction-state.js";
import type { PaymentRecord } from "../server/ovr/processing-model.js";
describe("payment corrections", () => {
  it("treats unpaid classification changes as outcome changes while preserving date-only authority", () => {
    const paid = { outcome: "paid" as const };
    const unclaimed = { outcome: "not_paid" as const, unpaidReason: "did_not_claim" as const };
    const withheld = { outcome: "not_paid" as const, unpaidReason: "withheld" as const };
    const review = { outcome: "not_paid" as const, unpaidReason: "review" as const };
    const unspecified = { outcome: "not_paid" as const };
    for (const [before, after] of [
      [paid, unclaimed], [unclaimed, paid], [unclaimed, withheld],
      [withheld, unclaimed], [review, unclaimed], [unclaimed, review],
      [unspecified, unclaimed], [unclaimed, unspecified],
    ]) expect(correctionChangesOutcome(before, after)).toBe(true);
    for (const before of [paid, unclaimed, withheld, review, unspecified])
      expect(correctionChangesOutcome(before, { ...before })).toBe(false);
  });
  const input = {
    expectedRevision: 1,
    paymentId: "11111111-1111-4111-8111-111111111111",
    reason: "Correct receipt evidence",
    reference: "PAY-025",
    outcome: "paid",
    amount: "5000.00",
    effectiveOn: "2026-01-01",
    remarks: "",
  };
  it("rejects malformed money, future dates and forged actors", () => {
    for (const amount of ["1000.00", "4999.99", "5000.01", "abc", "1.2.3", "0.00", "-1.00", "1e3"])
      expect(() =>
        parsePaymentCorrection("correct", { ...input, amount }),
      ).toThrow();
    expect(() =>
      parsePaymentCorrection("request", {
        ...input,
        effectiveOn: "2999-01-01",
      }),
    ).toThrow();
    expect(() =>
      parsePaymentCorrection("correct", { ...input, actorId: input.paymentId }),
    ).toThrow();
  });
  it("requires explained not-paid corrections", () => {
    expect(() =>
      parsePaymentCorrection("correct", {
        ...input,
        outcome: "not_paid", unpaidReason: "review",
        amount: "0.00",
      }),
    ).toThrow();
    expect(
      parsePaymentCorrection("correct", {
        ...input,
        outcome: "not_paid", unpaidReason: "review",
        amount: "0.00",
        remarks: "Receipt was reversed",
      }),
    ).toBeTruthy();
  });
  it("applies the latest approved correction, never a pending or rejected proposal", () => {
    const original = { id: "p", amount: "1.00" } as PaymentRecord;
    const applied = {
      paymentId: "p",
      revision: 2,
      after: { ...original, amount: "2.00" },
    } as PaymentCorrection;
    const approved = {
      paymentId: "p",
      revision: 4,
      after: { ...original, amount: "3.00" },
    } as PaymentCorrection;
    const pending = {
      paymentId: "p",
      revision: 5,
      proposed: { ...original, amount: "4.00" },
    } as PaymentCorrection;
    expect(
      effectivePayments([original], [applied, pending, approved])[0].amount,
    ).toBe("3.00");
    expect(original.amount).toBe("1.00");
    expect(effectivePayments([original], [pending])[0]).toEqual(original);
  });
});
