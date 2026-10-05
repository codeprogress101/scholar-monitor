import { describe, it, expect } from "vitest";
import {
  parseRequirementWaiver,
  waiverTransition,
} from "../server/requirements/waiver-validation.js";
import {
  REQUIREMENT_ACTIONS,
  satisfiesNormalRequirement,
} from "../server/requirements/workflow-model.js";
import { requirementTransition } from "../server/requirements/workflow-validation.js";
import { today } from "../server/scholars/validation.js";
describe("Requirement waiver rules", () => {
  const body = {
    expectedVersion: 0,
    effectiveOn: today(),
    reason: "Authorized exception",
    authorityReference: "MEMO-017",
    remarks: null,
  };
  it("requires explicit authority and reason and rejects forged attribution", () => {
    expect(parseRequirementWaiver(body)).toEqual(body);
    for (const extra of [
      { authorityReference: null },
      { authorityReference: undefined },
      { authorityReference: "  " },
      { reason: "" },
      { actorId: "forged" },
      { status: "verified" },
      { expectedVersion: -1 },
      { effectiveOn: "2999-01-01" },
    ])
      expect(() => parseRequirementWaiver({ ...body, ...extra })).toThrow();
  });
  it("waives unsatisfied states without replacing satisfied decisions", () => {
    for (const status of [
      "not_submitted",
      "submitted",
      "for_verification",
      "for_correction",
      "resubmitted",
      "rejected",
    ] as const)
      expect(waiverTransition(status)).toBe("waived");
    for (const status of ["verified", "waived"] as const)
      expect(() => waiverTransition(status)).toThrow();
    for (const action of REQUIREMENT_ACTIONS)
      expect(() => requirementTransition("waived", action)).toThrow();
  });
  it("satisfies the normal rule while allowing explicit server payout policy exclusion", () => {
    expect(satisfiesNormalRequirement("waived")).toBe(true);
    expect(satisfiesNormalRequirement("waived", false)).toBe(false);
    expect(satisfiesNormalRequirement("verified", false)).toBe(true);
    expect(satisfiesNormalRequirement("rejected")).toBe(false);
  });
});
