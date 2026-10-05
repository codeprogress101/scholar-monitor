import { describe, it, expect } from "vitest";
import {
  requireDraft,
  ovrEligibilityIssues,
  ovrWorkflowState,
} from "../server/ovr/rules.js";
import { parseOvr } from "../server/ovr/service.js";
import type { EligibilityView } from "../server/eligibility/model.js";
describe("OVR roster guard", () => {
  it("requires review before finalization and forbids reopening finalized batches", () => {
    expect(ovrWorkflowState("submit-review", "draft")).toBe("review");
    expect(ovrWorkflowState("return-to-draft", "review")).toBe("draft");
    expect(ovrWorkflowState("finalize", "review")).toBe("finalized");
    expect(() => ovrWorkflowState("finalize", "draft")).toThrow();
    for (const action of [
      "submit-review",
      "return-to-draft",
      "finalize",
    ] as const)
      expect(() => ovrWorkflowState(action, "finalized")).toThrow();
  });
  it("accepts only revision and decision evidence for finalization", () => {
    const command = {
      expectedRevision: 4,
      reason: "Coordinator review complete",
      reference: "OVR-FINAL-022",
    };
    expect(parseOvr("finalize", command)).toEqual(command);
    expect(() => parseOvr("finalize", { ...command, entries: [] })).toThrow();
    expect(() => parseOvr("finalize", { ...command, valid: true })).toThrow();
  });
  const view = (status = "active", satisfied = true) =>
    ({
      current: {
        sources: {
          scholarship: { id: "annual", status },
          official: { valid: true },
          checklist: { id: "checklist" },
          requirements: [{ satisfied }],
        },
      },
      effective: {
        eligible: true,
        overrideStale: false,
        label: "Eligible - Override Approved",
      },
      overrides: [],
    }) as unknown as EligibilityView;
  it("does not allow an exception to bypass mandatory status or document rules", () => {
    expect(ovrEligibilityIssues(view())).toEqual([]);
    for (const status of [
      "dropped",
      "graduated",
      "withdrawn",
      "disqualified",
      "not_renewed",
      "suspended",
      "on_hold",
    ])
      expect(ovrEligibilityIssues(view(status)).map((r) => r.code)).toContain(
        "INVALID_STATUS",
      );
    expect(
      ovrEligibilityIssues(view("active", false)).map((r) => r.code),
    ).toContain("INCOMPLETE_REQUIREMENTS");
  });
  it("blocks unresolved and stale overrides even when effective eligibility is true", () => {
    const v = view();
    v.effective.overrideStale = true;
    expect(ovrEligibilityIssues(v).map((r) => r.code)).toContain(
      "STALE_OVERRIDE",
    );
    for (const state of ["draft", "pending"] as const) {
      v.overrides = [
        { id: "request", state } as EligibilityView["overrides"][number],
      ];
      expect(ovrEligibilityIssues(v).map((r) => r.code)).toContain(
        "UNRESOLVED_OVERRIDE",
      );
    }
  });
  it("rejects every non-draft lifecycle state", () => {
    expect(() => requireDraft("draft")).not.toThrow();
    for (const state of [
      "review",
      "finalized",
      "submitted",
      "processed",
      "closed",
    ])
      expect(() => requireDraft(state)).toThrow("Only a Draft");
  });
  it("strictly validates roster commands without accepting browser-computed eligibility", () => {
    const input = {
      expectedRevision: 1,
      reason: "Roster preparation",
      reference: "OVR-021",
      scholarshipId: "f0edeb4b-d0ac-49ea-8473-d26ff57c8f1b",
    };
    expect(parseOvr("add", input)).toEqual(input);
    expect(() => parseOvr("add", { ...input, eligible: true })).toThrow();
    expect(() => parseOvr("create", input)).toThrow();
    expect(() =>
      parseOvr("remove", { ...input, expectedRevision: -1 }),
    ).toThrow();
  });
});
