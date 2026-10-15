import { describe, expect, it } from "vitest";
import { assessSemesterEligibility, type SemesterEligibilitySources } from "../server/continuing/semester-eligibility-engine";
const sources = (): SemesterEligibilitySources => ({ scholarId: "s", semesterId: "term", semesterOwnerId: "owner", academicYearId: "year", participation: { id: "p", basis: "continuing_baseline", eventId: "event", revision: 1, action: "accepted" }, period: { starts: "2026-10-01", ends: "2026-12-31", available: true, asOf: "2026-10-07" }, category: "degree", compliance: { result: "compliant", reviewId: "r", sourceHash: "h", stale: false, academicOnly: false, unresolvedFindings: 0, blockers: [] }, standing: [], financial: { entitlementIds: [], paymentIds: [], batchIds: [], cycles: [] } });
const codes = (s: SemesterEligibilitySources) => assessSemesterEligibility(s).reasons.map((r) => r.code);
describe("semester initial-entitlement preview", () => {
  it("uses accepted continuing admission without inventing an annual record", () => {
    expect(assessSemesterEligibility(sources())).toMatchObject({ candidate: true, proposedAmountCentavos: 500000, paymentAuthorized: false, entitlementCreationEnabled: false });
  });
  it.each(["pending", "review_required", "noncompliant"] as const)("blocks %s academic results", (result) => {
    const s = sources(); s.compliance.result = result; expect(codes(s)).toContain("ACADEMIC_CONDITIONS_UNMET");
  });
  it.each(["unknown", "non_degree"] as const)("does not apply degree benefits to %s category", (category) => {
    const s = sources(); s.category = category; expect(assessSemesterEligibility(s)).toMatchObject({ candidate: false, proposedAmountCentavos: null });
  });
  it("blocks missing, stale, academic-only and unresolved adverse reviews independently", () => {
    const s = sources(); Object.assign(s.compliance, { reviewId: null, stale: true, academicOnly: true, unresolvedFindings: 1 });
    expect(codes(s)).toEqual(expect.arrayContaining(["ACADEMIC_REVIEW_REQUIRED", "STALE_ACADEMIC_REVIEW", "ACADEMIC_ONLY_REVIEW", "ADVERSE_FINDING_UNRESOLVED"]));
  });
  it("blocks unaccepted participation and unavailable/future periods", () => {
    const s = sources(); s.participation.action = "revoked"; s.period.available = false; s.period.starts = "2026-11-01";
    expect(codes(s)).toEqual(expect.arrayContaining(["ACCEPTED_PARTICIPATION_REQUIRED", "PERIOD_UNAVAILABLE", "FUTURE_SEMESTER"]));
  });
  it("keeps ended-period creation separate from earned entitlement preservation", () => {
    const s = sources(); s.period.ends = "2026-10-06"; s.financial.entitlementIds = ["existing"];
    expect(codes(s)).toEqual(["ENDED_SEMESTER_REVIEW", "ENTITLEMENT_ALREADY_EXISTS"]);
    expect(s.financial.entitlementIds).toEqual(["existing"]);
  });
  it("treats graduation as final-semester reconciliation rather than forfeiture", () => {
    const s = sources(); s.standing = [{ annualId: "a", academicYearId: "year", status: "graduated", version: 1, effectiveOn: "2026-10-07" }];
    expect(codes(s)).toContain("FINAL_SEMESTER_REVIEW_REQUIRED");
  });
  it("requires reconciliation of tied standing decisions and unknown/future dates", () => {
    const s = sources(); s.standing = ["active", "suspended"].map((status) => ({ annualId: status, academicYearId: "year", status, version: 1, effectiveOn: "2026-10-01" }));
    expect(codes(s)).toContain("STANDING_REVIEW_REQUIRED");
    s.standing = [{ ...s.standing[0], effectiveOn: null }]; expect(codes(s)).toContain("STANDING_REVIEW_REQUIRED");
    s.standing[0].effectiveOn = "2026-10-08"; expect(codes(s)).toContain("STANDING_REVIEW_REQUIRED");
  });
  it("uses the latest dated standing and blocks any non-active decision", () => {
    const s = sources(); s.standing = [{ annualId: "old", academicYearId: "old-year", status: "suspended", version: 2, effectiveOn: "2026-09-01" }];
    expect(codes(s)).toContain("STANDING_BLOCKED");
    s.standing.push({ ...s.standing[0], annualId: "current", status: "active", effectiveOn: "2026-10-01" });
    expect(assessSemesterEligibility(s).candidate).toBe(true);
  });
  it("blocks duplicate/cross-path financial processing and closed payroll", () => {
    const s = sources(); s.financial.paymentIds = ["payment"]; s.financial.batchIds = ["batch"]; s.financial.cycles = [{ id: "c", code: "PAY", state: "closed", versionId: "cv" }];
    expect(codes(s)).toEqual(["LEGACY_FINANCIAL_RECONCILIATION", "PROTECTED_PAYROLL"]);
  });
});
