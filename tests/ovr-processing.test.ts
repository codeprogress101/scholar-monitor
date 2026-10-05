import { describe, it, expect } from "vitest";
import {
  parseProcessing,
  processingTransition,
} from "../server/ovr/processing-service.js";
import { reconcilePayments } from "../server/ovr/processing-state.js";
import type { OvrFinalization } from "../server/ovr/model.js";
import type { PaymentRecord } from "../server/ovr/processing-model.js";
describe("OVR processing", () => {
  const input = {
    expectedRevision: 1,
    effectiveOn: "2026-01-01",
    reason: "Processing evidence",
    reference: "REF-023",
    scholarshipId: "11111111-1111-4111-8111-111111111111",
    outcome: "paid",
    amount: "1.00",
    remarks: "",
  };
  it("rejects malformed money as validation errors", () => {
    for (const amount of [
      "abc",
      "1e3",
      "NaN",
      "1.2.3",
      "0.00",
      "-1.00",
      "10000000000.00",
    ])
      expect(() =>
        parseProcessing("record-payment", { ...input, amount }),
      ).toThrow(expect.objectContaining({ code: "VALIDATION_FAILED" }));
  });
  it("requires explicit explained not-paid outcomes", () => {
    expect(() =>
      parseProcessing("record-payment", {
        ...input,
        outcome: "not_paid",
        amount: "0.00",
      }),
    ).toThrow();
    expect(
      parseProcessing("record-payment", {
        ...input,
        outcome: "not_paid",
        amount: "0.00",
        remarks: "Not collected",
      }),
    ).toBeTruthy();
  });
  it("enforces sequence and terminal closure", () => {
    expect(processingTransition("submit", "finalized")).toBe("submitted");
    expect(processingTransition("mark-processed", "submitted")).toBe(
      "processed",
    );
    expect(processingTransition("close", "processed")).toBe("closed");
    for (const action of [
      "submit",
      "mark-processed",
      "record-payment",
      "close",
    ] as const)
      expect(() => processingTransition(action, "closed")).toThrow(
        expect.objectContaining({ code: "OVR_ALREADY_CLOSED" }),
      );
    expect(() => processingTransition("close", "finalized")).toThrow();
  });
  it("reconciles exact cents against every frozen member", () => {
    const frozen = {
      entries: [{ scholarshipId: "a" }, { scholarshipId: "b" }],
    } as OvrFinalization;
    const records = [
      { scholarshipId: "a", outcome: "paid", amount: "0.10" },
      { scholarshipId: "b", outcome: "paid", amount: "0.20" },
    ] as PaymentRecord[];
    expect(reconcilePayments(frozen, records)).toMatchObject({
      complete: true,
      paidTotal: "0.30",
    });
    expect(reconcilePayments(frozen, records.slice(0, 1))).toMatchObject({
      complete: false,
      missingScholarshipIds: ["b"],
    });
    expect(reconcilePayments(frozen, [records[0], records[0]])).toMatchObject({
      complete: false,
    });
    expect(reconcilePayments(null, []).complete).toBe(false);
  });
});
