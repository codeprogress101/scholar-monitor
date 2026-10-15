import { describe, expect, it } from "vitest";
import { assessAcademicCompliance as assess, canClearIncomplete, emptyFindings, gradeUnits, nativeGradingRule, validRule, type AcademicFindings } from "../server/continuing/compliance-engine";
const clean: AcademicFindings = { average: "2.50", enrolled: true, fullLoad: true, hasFailed: false, hasDropped: false, hasIncomplete: false };
const base = { category: "degree" as const, findings: clean, corVerified: true, cogVerified: true, rule: nativeGradingRule };

describe("INC clearance evidence", () => {
  const known = { findings: { hasIncomplete: true }, documents: [{ id: "cog", kind: "cog", version: 4 }] };
  const verified = { id: "cog", verified: true };
  const replacement = { action: "resubmit", version: 6, details: { receipt: { receivedOn: "2026-10-07" } } };
  it("requires a newly received and verified replacement; re-verification alone cannot clear INC", () => {
    expect(canClearIncomplete([known], verified, [replacement], false)).toBe(true);
    expect(canClearIncomplete([known], verified, [{ action: "verify", version: 8, details: {} }], false)).toBe(false);
    expect(canClearIncomplete([known], verified, [{ ...replacement, version: 3 }], false)).toBe(false);
    expect(canClearIncomplete([known], verified, [{ ...replacement, details: {} }], false)).toBe(false);
    expect(canClearIncomplete([known], { id: "other-cog", verified: true }, [replacement], false)).toBe(false);
  });
  it("rejects waived, unverified and unchecked replacements while retaining existing INC", () => {
    expect(canClearIncomplete([known], { ...verified, verified: false }, [replacement], false)).toBe(false);
    expect(canClearIncomplete([known], undefined, [], false)).toBe(false);
    expect(canClearIncomplete([known], verified, [replacement], null)).toBe(false);
    expect(canClearIncomplete([known], verified, [], true)).toBe(true);
  });
  it("preserves a legitimate clearance and requires another replacement for a later INC", () => {
    const cleared = { ...known, findings: { hasIncomplete: false } };
    expect(canClearIncomplete([cleared, known], verified, [replacement], false)).toBe(true);
    const recurrence = { ...known, documents: [{ id: "cog", kind: "cog", version: 7 }] };
    expect(canClearIncomplete([recurrence, cleared, known], verified, [replacement], false)).toBe(false);
    expect(canClearIncomplete([], verified, [], null)).toBe(true);
  });
});
describe("semester academic compliance", () => {
  it.each(["1", "2.4999", "2.50", "2.5000"])("accepts the inclusive native boundary %s", (average) => expect(assess({ ...base, findings: { ...clean, average } }).result).toBe("compliant"));
  it.each(["2.5001", "3", "5"])("blocks a worse average without rounding %s", (average) => expect(assess({ ...base, findings: { ...clean, average } }).result).toBe("noncompliant"));
  it.each(["0.9", "5.1", "2.50001", "NaN", "-1", "1e0"])("does not accept out-of-scale/malformed grade %s", (average) => expect(assess({ ...base, findings: { ...clean, average } }).result).toBe("review_required"));
  it.each(["hasFailed", "hasDropped", "hasIncomplete"] as const)("blocks verified %s without altering scholarship standing", (key) => expect(assess({ ...base, findings: { ...clean, [key]: true } }).result).toBe("noncompliant"));
  it.each(["enrolled", "fullLoad"] as const)("blocks unmet %s", (key) => expect(assess({ ...base, findings: { ...clean, [key]: false } }).result).toBe("noncompliant"));
  it("unverified documents and unknown findings never imply compliance", () => {
    expect(assess({ ...base, cogVerified: false }).result).toBe("pending");
    expect(assess({ ...base, corVerified: false }).result).toBe("pending");
    expect(assess({ ...base, findings: emptyFindings }).result).toBe("pending");
    expect(assess({ ...base, findings: { ...clean, hasIncomplete: null } }).result).toBe("pending");
  });
  it("retains all blockers and puts verified failure ahead of missing policy/evidence", () => {
    const result = assess({ ...base, rule: null, corVerified: false, findings: { ...clean, hasIncomplete: true, fullLoad: null } });
    expect(result.result).toBe("noncompliant"); expect(result.blockers.length).toBe(4);
  });
  it("unknown grading and category require review; TESDA is not silently assessed as degree", () => {
    expect(assess({ ...base, rule: null }).result).toBe("review_required");
    expect(assess({ ...base, category: "unknown" }).result).toBe("review_required");
    expect(assess({ ...base, category: "non_degree", findings: { ...clean, hasFailed: true, average: "4" } }).result).toBe("review_required");
  });
  it("uses approved native equivalent bounds, direction and precision", () => {
    const rule = { label: "Approved percentage", direction: "higher" as const, minimum: "0", maximum: "100", threshold: "85", precision: 2 };
    expect(validRule(rule)).toBe(true);
    expect(assess({ ...base, rule, findings: { ...clean, average: "85" } }).result).toBe("compliant");
    expect(assess({ ...base, rule, findings: { ...clean, average: "84.99" } }).result).toBe("noncompliant");
    expect(assess({ ...base, rule, findings: { ...clean, average: "85.001" } }).result).toBe("review_required");
    expect(validRule({ ...rule, threshold: "101" })).toBe(false);
    expect(validRule({ ...rule, minimum: "100" })).toBe(false);
    expect(gradeUnits("2.5001")).toBe(25001);
  });
});


describe("approved freshman admission basis", () => {
 const freshman = { ...base, cogVerified: false, cogNotRequired: true, rule: null, initialAdmissionApproved: true, findings: { ...emptyFindings, enrolled: true, fullLoad: true } };
 it("uses approved admission instead of fabricated college grades", () => expect(assess(freshman).result).toBe("compliant"));
 it("requires the approved admission reference, verified COR and actual enrollment/load findings", () => {
  expect(assess({...freshman, initialAdmissionApproved: false}).result).toBe("review_required");
  expect(assess({...freshman, corVerified: false}).result).toBe("pending");
  expect(assess({...freshman, findings: {...freshman.findings, fullLoad: null}}).result).toBe("pending");
  expect(assess({...freshman, findings: {...freshman.findings, enrolled: false}}).result).toBe("noncompliant");
 });
 it("cannot bypass a review blocker or replace ordinary COG assessment", () => {
  expect(assess({...freshman, reviewIssues: ["Coverage changed"]}).result).toBe("review_required");
  expect(assess({...freshman, cogNotRequired: false}).result).toBe("review_required");
 });
});
