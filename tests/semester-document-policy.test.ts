import { describe, expect, it } from "vitest";
import { policyDate, validatePolicyDate } from "../server/requirements/semester-policy";
import { scopeAcceptsOwner } from "../server/continuing/scope-access";

describe("shared semester document policy", () => {
  it("preserves historical semester-start pins and supports a later explicit date", () => {
    expect(policyDate("{}", "2026-06-01")).toBe("2026-06-01");
    expect(policyDate({ policyDate: "2026-10-14" }, "2026-06-01")).toBe("2026-10-14");
  });
  it("accepts semester boundaries but not outside policy dates", () => {
    for (const day of ["2026-06-01", "2026-10-14", "2026-12-31"]) expect(() => validatePolicyDate(day, "2026-06-01", "2026-12-31")).not.toThrow();
    for (const day of ["2026-05-31", "2027-01-01"]) expect(() => validatePolicyDate(day, "2026-06-01", "2026-12-31")).toThrow();
  });
  it("retains only explicitly reviewed owners and never enables a disabled revision", () => {
    const scope = { id: "new", mode: "enabled", rules: { retainedScopeIds: ["original"] } };
    expect(scopeAcceptsOwner(scope, "original")).toBe(true);
    expect(scopeAcceptsOwner(scope, "another-cohort")).toBe(false);
    expect(scopeAcceptsOwner({ ...scope, mode: "disabled" }, "original")).toBe(false);
  });
});
