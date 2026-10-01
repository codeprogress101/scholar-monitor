import { describe, it, expect } from "vitest";
import {
  OPERATIONAL_STATUSES,
  TERMINAL_STATUSES,
  statusAllowsPayout,
} from "../server/status/model.js";
import {
  validateStatusEdge,
  parseStatusRequest,
} from "../server/status/validation.js";
describe("Operational status boundaries", () => {
  it("only Active passes the necessary payout status condition", () => {
    for (const status of [...OPERATIONAL_STATUSES, null])
      expect(statusAllowsPayout(status)).toBe(status === "active");
  });
  it("does not activate a qualification record through status changes", () => {
    expect(() => validateStatusEdge(null, "active", "change")).toThrow(
      expect.objectContaining({ code: "MASTERLIST_ACTIVATION_REQUIRED" }),
    );
  });
  it("permits Active exits and controlled resumption from hold/suspension", () => {
    for (const target of OPERATIONAL_STATUSES.filter((s) => s !== "active"))
      expect(() =>
        validateStatusEdge("active", target, "change"),
      ).not.toThrow();
    for (const source of ["on_hold", "suspended"] as const)
      expect(() =>
        validateStatusEdge(source, "active", "change"),
      ).not.toThrow();
  });
  it("rejects normal terminal reversals and requires correction kinds", () => {
    for (const source of TERMINAL_STATUSES)
      for (const target of OPERATIONAL_STATUSES) {
        expect(() => validateStatusEdge(source, target, "change")).toThrow();
        if (["active", "on_hold", "suspended"].includes(target))
          expect(() =>
            validateStatusEdge(source, target, "correction"),
          ).not.toThrow();
        else
          expect(() =>
            validateStatusEdge(source, target, "correction"),
          ).toThrow();
      }
  });
  it("requires an effective date, reason code, reference and correction linkage", () => {
    const body = {
      expectedVersion: 1,
      toStatus: "dropped",
      kind: "change",
      effectiveOn: "2026-09-01",
      reasonCode: "VERIFIED_DROPOUT",
      reason: "Verified physical records",
      reference: "Register 01",
    };
    expect(parseStatusRequest(body).toStatus).toBe("dropped");
    for (const change of [
      { reasonCode: "" },
      { reason: "" },
      { reference: "" },
      { effectiveOn: "9999-01-01" },
      { kind: "correction" },
      { approvedBy: "forged" },
      { correctsRequestId: "00000000-0000-4000-8000-000000000001" },
    ])
      expect(() => parseStatusRequest({ ...body, ...change })).toThrow();
  });
});
