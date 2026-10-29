import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { currentOverrides } from "../eligibility/override-state.js";
import type { EligibilityView } from "../eligibility/model.js";
import type { OvrIssue, OvrEvidence } from "./model.js";
export function ovrWorkflowState(
  action: "submit-review" | "return-to-draft" | "finalize",
  state: string,
) {
  if (action === "submit-review" && state === "draft") return "review";
  if (action === "return-to-draft" && state === "review") return "draft";
  if (action === "finalize" && state === "review") return "finalized";
  throw new AuthError(
    409,
    "OVR_INVALID_STATE",
    "Submit a Draft for review, or return/finalize a batch currently under review. Finalized batches are immutable.",
  );
}
/** Review is reversible; only finalization waits for all timely applicants. */
export function requireManagedReview(action: "submit-review" | "finalize", candidates: {opened:boolean;opensOn:string;cutoffReached:boolean;cutoffOn:string;cutoffPolicy?:string;pendingCount:number;form:{rows:readonly unknown[]}}) {
  if (!candidates.opened) throw new AuthError(409, "WINDOW_NOT_OPEN", `This payroll window opens on ${candidates.opensOn}.`);
  if (action === "finalize" && !candidates.cutoffReached) throw new AuthError(409, "CUTOFF_NOT_REACHED", `Finalization is available after ${candidates.cutoffPolicy && candidates.cutoffPolicy !== "whole_day_v1" ? "the recorded timed cutoff instant on" : "the whole-day cutoff"} ${candidates.cutoffOn} (Philippine time). Review may proceed now; the roster is not frozen.`);
  if (candidates.pendingCount) throw new AuthError(409, "PENDING_TIMELY_SUBMISSIONS", "Review or explicitly defer every unresolved on-time submission or uncertain receipt-time case before submitting for review or finalizing.");
  if (!candidates.form.rows.length) throw new AuthError(409, "EMPTY_PAYROLL", "No eligible included scholars are available. Review the excluded scholars.");
}
export function requireDraft(state: string) {
  if (state !== "draft")
    throw new AuthError(
      409,
      "OVR_NOT_DRAFT",
      "Only a Draft Payroll can change membership or record a draft validation.",
    );
}
export function ovrEvidence(view: EligibilityView): OvrEvidence {
  return {
    current: view.current,
    effective: view.effective,
    fingerprint: digest(
      JSON.stringify({
        sourceHash: view.current.sourceHash,
        effective: view.effective,
      }),
    ),
  };
}
export function ovrEligibilityIssues(view: EligibilityView): OvrIssue[] {
  const issues: OvrIssue[] = [],
    s = view.current.sources;
  const add = (code: string, message: string) =>
    issues.push({ code, message, scholarshipId: s.scholarship.id });
  if (s.reservedSemester) add("SEMESTER_ALREADY_ALLOCATED", "An ordinary allocation already reserves this scholar and semester.");
  for (const reason of s.semesterPayroll?.reasons ?? []) add(reason.code, reason.message);
  if (!view.effective.eligible) add("NOT_ELIGIBLE", view.effective.label);
  if (s.scholarship.status !== "active" && !(s.scholarship.status === "graduated" && s.finalSemesterGraduation && s.finalSemesterGraduation.semesterId === s.cycle.semesterId))
    add("INVALID_STATUS", "An Payroll entry requires Active scholarship status.");
  if (!s.official.valid)
    add(
      "OFFICIAL_MEMBERSHIP_REQUIRED",
      "Current official membership is required.",
    );
  if (
    !s.checklist ||
    !s.requirements.length ||
    s.requirements.some((r) => !r.satisfied)
  )
    add(
      "INCOMPLETE_REQUIREMENTS",
      "All required payout documents must be Verified or policy-accepted Waived.",
    );
  if (view.effective.overrideStale)
    add(
      "STALE_OVERRIDE",
      "The latest approved override has changed sources and must be resolved.",
    );
  if (
    currentOverrides(view.overrides).some(
      (r) => r.state === "draft" || r.state === "pending",
    )
  )
    add(
      "UNRESOLVED_OVERRIDE",
      "Resolve the Draft or Pending eligibility override first.",
    );
  return issues;
}
