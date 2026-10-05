import { describe, it, expect } from "vitest";
import {
  parseOverride,
  overrideTransition,
} from "../server/eligibility/override-service.js";
import { effectiveEligibility } from "../server/eligibility/override-state.js";
import type { EligibilityAssessment } from "../server/eligibility/model.js";
import type { EligibilityOverride } from "../server/eligibility/override-model.js";
describe("eligibility override decisions", () => {
  it("requires separate review even for a requester with approval permission", () => {
    for (const action of ["approve", "reject"] as const)
      expect(() => overrideTransition(action, "pending", true)).toThrow(
        "separate Coordinator",
      );
    expect(() => overrideTransition("submit-review", "draft", false)).toThrow(
      "Only the requester",
    );
  });
  it("requires resubmission after re-evaluation and makes terminal decisions immutable", () => {
    expect(overrideTransition("reevaluate", "pending", true)).toBe("draft");
    expect(() => overrideTransition("approve", "draft", false)).toThrow();
    for (const state of ["approved", "rejected", "cancelled"] as const)
      for (const action of [
        "reevaluate",
        "submit-review",
        "approve",
        "reject",
        "cancel",
      ] as const)
        expect(() => overrideTransition(action, state, false)).toThrow();
  });
  it("validates mandatory justification and rejects forged decision fields", () => {
    const body = {
      expectedRevision: 0,
      reason: "Test request",
      reference: "REF-020",
      calculationId: "f0edeb4b-d0ac-49ea-8473-d26ff57c8f1b",
      expectedSourceHash: "a".repeat(64),
      requestedEligible: true,
      reasonCode: "EXCEPTION",
      justification: "Authorized exception",
      authorityReference: "AUTH-020",
    };
    expect(parseOverride("request", body)).toEqual(body);
    expect(() =>
      parseOverride("request", { ...body, approved: true }),
    ).toThrow();
    expect(() =>
      parseOverride("request", { ...body, justification: "" }),
    ).toThrow();
    expect(() => parseOverride("approve", body)).toThrow();
  });
  it("never resurrects an older approval when the newest approval is stale", () => {
    const current = {
      eligible: false,
      sourceHash: "current",
    } as EligibilityAssessment;
    const approval = (hash: string, eligible: boolean) =>
      ({
        id: hash,
        state: "approved",
        calculation: { sourceHash: hash },
        requestedEligible: eligible,
      }) as EligibilityOverride;
    expect(
      effectiveEligibility(current, [approval("current", true)]).label,
    ).toBe("Eligible - Override Approved");
    expect(
      effectiveEligibility(current, [
        approval("stale", true),
        approval("current", true),
      ]),
    ).toMatchObject({ eligible: false, overrideStale: true });
    expect(
      effectiveEligibility({ ...current, eligible: true }, [
        approval("current", false),
      ]).label,
    ).toBe("Not Eligible - Override Approved");
  });
});
