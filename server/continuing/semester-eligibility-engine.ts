import type { ComplianceResult } from "./compliance-engine.js";

export const SEMESTER_ELIGIBILITY_ENGINE = "semester-preview-v1";
export type PreviewReason = { code: string; message: string };
export type SemesterEligibilitySources = {
  scholarId: string; semesterId: string; semesterOwnerId: string; academicYearId: string;
  participation: { rollover?: { scholarshipId: string; auditId: string } | null; id: string; basis: string; eventId: string; revision: number; action: string };
  period: { starts: string; ends: string; available: boolean; asOf: string };
  category: "unknown" | "degree" | "non_degree";
  compliance: { result: ComplianceResult; reviewId: string | null; sourceHash: string; stale: boolean; academicOnly: boolean; unresolvedFindings: number; blockers: string[] };
  standing: { annualId: string; academicYearId: string; status: string; version: number; effectiveOn: string | null }[];
  financial: { entitlementIds: string[]; paymentIds: string[]; batchIds: string[]; cycles: { id: string; code: string; state: string; versionId: string }[] };
};
/** Read-only candidate assessment, never a payment authorization or an entitlement balance. */
export function assessSemesterEligibility(s: SemesterEligibilitySources) {
  const reasons: PreviewReason[] = [], add = (code: string, message: string) => reasons.push({ code, message });
  if ((s.participation.basis !== "continuing_baseline" && !s.participation.rollover) || s.participation.action !== "accepted") add("ACCEPTED_PARTICIPATION_REQUIRED", "Accepted continuing admission or prior-year rollover is required for this preview.");
  if (!s.period.available) add("PERIOD_UNAVAILABLE", "The semester setup or its authority is unavailable, locked or archived.");
  if (s.period.starts > s.period.asOf) add("FUTURE_SEMESTER", "The semester has not started.");
  if (s.period.ends < s.period.asOf) add("ENDED_SEMESTER_REVIEW", "This semester has ended. Preserve existing earned entitlements; a new entitlement needs period-specific reconciliation.");
  if (s.category !== "degree") add("DEGREE_POLICY_REQUIRED", s.category === "unknown" ? "Record the program category." : "Non-degree benefits require a separate approved policy.");
  if (!s.compliance.reviewId) add("ACADEMIC_REVIEW_REQUIRED", "Review the semester's academic findings first.");
  if (s.compliance.stale) add("STALE_ACADEMIC_REVIEW", "Evidence or policy changed. Review the current COR/COG and academic findings again.");
  if (s.compliance.result !== "compliant") add("ACADEMIC_CONDITIONS_UNMET", "The current academic assessment is not Compliant.");
  if (s.compliance.unresolvedFindings) add("ADVERSE_FINDING_UNRESOLVED", "Unresolved failed/dropped findings require an authorized decision; earlier corrections do not cover later findings.");
  if (s.compliance.academicOnly) add("ACADEMIC_ONLY_REVIEW", "This review records academic findings only and does not authorize retroactive entitlement or payment.");
  const unknown = s.standing.some((r) => !r.effectiveOn || r.effectiveOn > s.period.asOf);
  const latestDate = s.standing.filter((r) => r.effectiveOn && r.effectiveOn <= s.period.asOf).map((r) => r.effectiveOn!).sort().at(-1);
  const latest = s.standing.filter((r) => r.effectiveOn === latestDate);
  if (unknown || new Set(latest.map((r) => r.status)).size > 1) add("STANDING_REVIEW_REQUIRED", "Recorded standing has unknown/future dates or conflicting decisions. Reconcile it before entitlement creation.");
  else if (latest.some((r) => r.status === "graduated")) add("FINAL_SEMESTER_REVIEW_REQUIRED", "Graduation does not cancel an earned final-semester entitlement. Reconcile the relevant semester evidence before creating a new one.");
  else if (latest.some((r) => r.status !== "active")) add("STANDING_BLOCKED", `Recorded standing is ${latest.map((r) => r.status).join(" / ")}. An authorized standing review is required.`);
  if (s.financial.entitlementIds.length) add("ENTITLEMENT_ALREADY_EXISTS", "A semester entitlement already exists. Review that record instead of creating another; this preview does not cancel it.");
  if (s.financial.paymentIds.length || s.financial.batchIds.length) add("LEGACY_FINANCIAL_RECONCILIATION", "Legacy Payroll/payment history exists for this scholar and semester. Reconcile it to prevent duplicate entitlement or payment.");
  if (s.financial.cycles.some((c) => c.state === "closed" || c.state === "locked")) add("PROTECTED_PAYROLL", "A locked or closed payroll covers this semester. Its history must be reconciled before new entitlement creation.");
  return { engineVersion: SEMESTER_ELIGIBILITY_ENGINE, candidate: reasons.length === 0, reasons, proposedAmountCentavos: s.category === "degree" ? 500000 : null, currency: "PHP" as const, paymentAuthorized: false as const, entitlementCreationEnabled: false as const };
}
