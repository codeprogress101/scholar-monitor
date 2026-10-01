import { describe, it, expect } from "vitest";
import {
  nextMasterlistState,
  parseWorkflow,
  workflowPermission,
} from "../server/masterlists/workflow-validation.js";
describe("official masterlist workflow", () => {
  it("requires ordered transitions and forbids reopening published or locked lists", () => {
    expect(nextMasterlistState("draft", "submit-verification")).toBe(
      "for_verification",
    );
    expect(nextMasterlistState("for_verification", "submit-approval")).toBe(
      "submitted_for_approval",
    );
    expect(nextMasterlistState("submitted_for_approval", "approve")).toBe(
      "approved",
    );
    expect(nextMasterlistState("approved", "publish")).toBe("published");
    expect(nextMasterlistState("published", "lock")).toBe("locked");
    for (const from of [
      "for_verification",
      "submitted_for_approval",
      "approved",
    ])
      expect(nextMasterlistState(from, "return-draft")).toBe("draft");
    for (const from of ["draft", "published", "locked"])
      expect(() => nextMasterlistState(from, "return-draft")).toThrow();
    expect(() => nextMasterlistState("draft", "publish")).toThrow();
  });
  it("rejects forged actors, missing evidence and invalid publication dates", () => {
    const body = {
      expectedVersion: 1,
      reason: "Verified official records",
      reference: "Decision 01",
    };
    expect(parseWorkflow("approve", body)).toEqual(body);
    expect(() =>
      parseWorkflow("approve", { ...body, actorId: "forged" }),
    ).toThrow();
    expect(() => parseWorkflow("publish", body)).toThrow();
    for (const effectiveOn of ["2099-01-01", "2026-02-30"])
      expect(() =>
        parseWorkflow("publish", { ...body, effectiveOn }),
      ).toThrow();
    expect(() =>
      parseWorkflow("return-draft", { ...body, reason: "" }),
    ).toThrow();
  });
  it("uses dedicated Coordinator permissions for official decisions", () => {
    expect(workflowPermission("submit-approval")).toBe("masterlists.prepare");
    expect(workflowPermission("approve")).toBe("masterlists.approve");
    expect(workflowPermission("return-draft")).toBe("masterlists.approve");
    expect(workflowPermission("publish")).toBe("masterlists.publish");
    expect(workflowPermission("lock")).toBe("masterlists.lock");
  });
});
