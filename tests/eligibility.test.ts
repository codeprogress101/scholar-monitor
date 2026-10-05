import { describe, it, expect } from "vitest";
import { evaluateEligibility } from "../server/eligibility/engine.js";
import { parseCalculation } from "../server/eligibility/service.js";
import type { EligibilitySources } from "../server/eligibility/model.js";
const sources: EligibilitySources = {
  cycle: {
    id: "cycle",
    versionId: "version",
    version: 2,
    state: "open",
    targetDate: "2026-10-02",
    academicYearId: "year",
    semesterId: "semester",
    periodUnavailable: false,
  },
  scholarship: {
    id: "annual",
    scholarId: "person",
    humanId: "LDSS-2026-00001",
    name: "Synthetic Scholar",
    personVersion: 1,
    qualification: "selected",
    qualificationVersion: 4,
    status: "active",
    statusVersion: 1,
    statusEffectiveOn: "2026-10-02",
  },
  official: {
    rootId: "root",
    masterlistId: "root",
    version: 6,
    amendmentRevision: 0,
    snapshotHash: "hash",
    effectiveOn: "2026-10-02",
    valid: true,
  },
  checklist: {
    id: "checklist",
    cycleVersionId: "version",
    policyDate: "2026-10-02",
  },
  requirements: ["COR", "COG"].map((code) => ({
    definitionVersionId: code,
    code,
    policyRevision: 1,
    allowWaiver: true,
    instanceId: code,
    version: 3,
    status: "verified",
    latestEventId: code,
    satisfied: true,
  })),
};
describe("Normal payout eligibility", () => {
  it("requires both satisfied documents, Active status and official membership", () => {
    expect(evaluateEligibility(sources).eligible).toBe(true);
    const missing = structuredClone(sources);
    missing.requirements[1].status = "not_submitted";
    expect(evaluateEligibility(missing)).toMatchObject({
      eligible: false,
      reasons: [{ code: "REQUIREMENT_UNSATISFIED", requirementCode: "COG" }],
    });
  });
  it("blocks every terminal and non-active status regardless of complete documents", () => {
    for (const status of [
      null,
      "on_hold",
      "suspended",
      "graduated",
      "dropped",
      "withdrawn",
      "disqualified",
      "not_renewed",
    ]) {
      const s = structuredClone(sources);
      s.scholarship.status = status;
      expect(
        evaluateEligibility(s).reasons.some(
          (r) => r.code === "STATUS_NOT_ACTIVE",
        ),
      ).toBe(true);
    }
  });
  it("honors cycle waiver policy without treating unsatisfied states as verified", () => {
    for (const status of [
      "submitted",
      "for_verification",
      "for_correction",
      "resubmitted",
      "rejected",
    ] as const) {
      const s = structuredClone(sources);
      s.requirements[1].status = status;
      expect(evaluateEligibility(s).eligible).toBe(false);
    }
    const s = structuredClone(sources);
    s.requirements[1].status = "waived";
    expect(evaluateEligibility(s).eligible).toBe(true);
    s.requirements[1].allowWaiver = false;
    expect(evaluateEligibility(s).reasons[0].code).toBe("WAIVER_EXCLUDED");
  });
  it("fails closed for missing official membership, checklist, instance or empty policy", () => {
    const s = structuredClone(sources);
    s.official.valid = false;
    s.checklist = null;
    s.requirements[1].instanceId = null;
    expect(evaluateEligibility(s).reasons.map((r) => r.code)).toEqual([
      "OFFICIAL_MEMBERSHIP_REQUIRED",
      "CHECKLIST_MISSING",
      "REQUIREMENT_MISSING",
    ]);
    s.requirements = [];
    expect(
      evaluateEligibility(s).reasons.some(
        (r) => r.code === "PAYOUT_POLICY_EMPTY",
      ),
    ).toBe(true);
  });
  it("is deterministic and source revisions change its fingerprint even if outcome stays eligible", () => {
    expect(evaluateEligibility(sources)).toEqual(
      evaluateEligibility(structuredClone(sources)),
    );
    const changed = structuredClone(sources);
    changed.official.amendmentRevision++;
    expect(evaluateEligibility(changed).eligible).toBe(true);
    expect(evaluateEligibility(changed).sourceHash).not.toBe(
      evaluateEligibility(sources).sourceHash,
    );
  });
  it("rejects client-owned results, reasons, sources and actor fields", () => {
    const body = {
      expectedRevision: 0,
      expectedSourceHash: "a".repeat(64),
      reason: "Review current sources",
      reference: "CALC-001",
    };
    expect(parseCalculation(body)).toEqual(body);
    for (const extra of [
      { eligible: true },
      { sources: {} },
      { reasonCodes: [] },
      { actorId: "fake" },
      { expectedRevision: -1 },
      { expectedSourceHash: "invalid" },
    ])
      expect(() => parseCalculation({ ...body, ...extra })).toThrow();
  });
});
