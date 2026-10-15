export type ComplianceResult = "pending" | "review_required" | "compliant" | "noncompliant";
export type AcademicFindings = {
  average: string | null;
  enrolled: boolean | null;
  fullLoad: boolean | null;
  hasFailed: boolean | null;
  hasDropped: boolean | null;
  hasIncomplete: boolean | null;
};
export type GradingRule = {
  label: string;
  direction: "lower" | "higher";
  minimum: string;
  maximum: string;
  threshold: string;
  precision: number;
};
export const emptyFindings: AcademicFindings = { average: null, enrolled: null, fullLoad: null, hasFailed: null, hasDropped: null, hasIncomplete: null };
// INC resolution needs replacement paper, not merely another workflow version
// or a waiver. History is newest first; clearing INC cannot clear other findings.
export function canClearIncomplete(
  history: readonly { findings: Pick<AcademicFindings, "hasIncomplete">; documents: readonly { id: string; kind: string | null; version: number }[] }[],
  document: { id: string; verified: boolean } | undefined,
  events: readonly { action: string; version: number; details: { receipt?: unknown } }[],
  next: boolean | null,
): boolean {
  const known = history.find((r) => r.findings.hasIncomplete === true);
  if (!known || next === true) return true;
  const original = known.documents.find((d) => d.kind === "cog");
  return next === false && Boolean(document?.verified && original && document.id === original.id &&
    events.some((e) => e.action === "resubmit" && e.version > original.version && e.details.receipt));
}
export const nativeGradingRule: GradingRule = { label: "1.00 best / 2.50 maximum passing average", direction: "lower", minimum: "1", maximum: "5", threshold: "2.5", precision: 4 };
export const gradePattern = /^(?:0|[1-9]\d{0,5})(?:\.\d{1,4})?$/;
// Exact decimal comparison; never round a borderline grade into compliance.
export function gradeUnits(value: string): number | null {
  if (typeof value !== "string" || !gradePattern.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 10000 + Number(fraction.padEnd(4, "0"));
}
export function validRule(rule: GradingRule) {
  const min = gradeUnits(rule.minimum), max = gradeUnits(rule.maximum), threshold = gradeUnits(rule.threshold);
  return ["lower", "higher"].includes(rule.direction) && min !== null && max !== null && threshold !== null && min < max && threshold >= min && threshold <= max &&
    Number.isInteger(rule.precision) && rule.precision >= 0 && rule.precision <= 4 &&
    [rule.minimum, rule.maximum, rule.threshold].every((n) => (n.split(".")[1]?.length ?? 0) <= rule.precision);
}
export function assessAcademicCompliance(input: {
  category: "unknown" | "degree" | "non_degree";
  findings: AcademicFindings;
  corVerified: boolean;
  cogVerified: boolean;
  cogNotRequired?: boolean;
  initialAdmissionApproved?: boolean;
  rule: GradingRule | null;
  reviewIssues?: string[];
}): { result: ComplianceResult; blockers: string[] } {
  const { findings: f, rule } = input;
  const failures: string[] = [], review = [...(input.reviewIssues ?? [])], pending: string[] = [];
  if (input.category !== "degree") review.push(input.category === "unknown" ? "Record the program category." : "Non-degree/TESDA academic rules require a separate approved policy.");
  if (!input.corVerified) pending.push("Verify the current-semester enrollment document (COR or Certificate of Enrollment).");
  if (!input.cogVerified && !input.cogNotRequired) pending.push("Verify the preceding completed semester's COG.");
  if (input.corVerified) {
    if (f.enrolled === false) failures.push("Not enrolled for the receiving semester.");
    if (f.fullLoad === false) failures.push("Required full course load is not met.");
  }
  if (input.cogVerified && input.category === "degree") {
    if (f.hasFailed) failures.push("A failed subject is recorded.");
    if (f.hasDropped) failures.push("A dropped subject is recorded.");
    if (f.hasIncomplete) failures.push("An unresolved incomplete subject is recorded.");
  }
  if (input.cogNotRequired && (f.average !== null || [f.hasFailed, f.hasDropped, f.hasIncomplete].some(v => v !== null))) review.push("College-grade findings cannot be recorded under an initial-admission academic basis. Review conflicting evidence.");
  if (input.cogNotRequired && !input.initialAdmissionApproved) review.push("Review the approved initial admission assessment.");
  if (!input.cogNotRequired && (!rule || !validRule(rule))) review.push("The Coordinator must record the school's approved grading rule.");
  if (f.average === null && !input.cogNotRequired) pending.push("Record the average shown on the COG.");
  else if (f.average !== null && rule && validRule(rule)) {
    const value = gradeUnits(f.average);
    if (value === null || value < gradeUnits(rule.minimum)! || value > gradeUnits(rule.maximum)! || (f.average.split(".")[1]?.length ?? 0) > rule.precision)
      review.push("The average is outside the approved scale or precision; no rounding was applied.");
    else if (input.cogVerified && input.category === "degree" && (rule.direction === "lower" ? value > gradeUnits(rule.threshold)! : value < gradeUnits(rule.threshold)!)) failures.push("The average does not meet the approved threshold.");
  }
  if ((input.cogNotRequired ? [f.enrolled, f.fullLoad] : [f.enrolled, f.fullLoad, f.hasFailed, f.hasDropped, f.hasIncomplete]).some((v) => v === null)) pending.push("Complete the enrollment, load and subject findings.");
  return { result: failures.length ? "noncompliant" : review.length ? "review_required" : pending.length ? "pending" : "compliant", blockers: [...new Set([...failures, ...review, ...pending])] };
}
