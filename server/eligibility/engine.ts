import { digest } from "../auth/crypto.js";
import { statusAllowsPayout, type OperationalStatus } from "../status/model.js";
import { satisfiesNormalRequirement } from "../requirements/workflow-model.js";
import {
  ELIGIBILITY_ENGINE,
  type EligibilitySources,
  type EligibilityAssessment,
  type EligibilityReason,
} from "./model.js";
/** Shared server-owned rule for snapshots, live reads and payout reports. */
export function evaluateEligibility(
  sources: EligibilitySources,
): EligibilityAssessment {
  const reasons: EligibilityReason[] = [...(sources.semesterPayroll?.reasons ?? [])];
  if (sources.archivedGraduate) reasons.push({ code: "GRADUATE_ARCHIVED", message: "Graduated and archived; no outstanding stipend. Historical paid payrolls remain unchanged." });
  if (sources.reservedSemester) reasons.push({ code: "SEMESTER_ALREADY_ALLOCATED", message: "An ordinary allocation already reserves this scholar and semester." });
  if (sources.cycle.state === "draft")
    reasons.push({
      code: "CYCLE_NOT_OPEN",
      message: "The payout cycle has not been opened.",
    });
  if (
    !statusAllowsPayout(sources.scholarship.status as OperationalStatus | null) && !(sources.scholarship.status === "graduated" && sources.finalSemesterGraduation && sources.finalSemesterGraduation.semesterId === sources.cycle.semesterId)
  )
    reasons.push({
      code: "STATUS_NOT_ACTIVE",
      message: `Scholarship status is ${sources.scholarship.status ?? "not activated"}; normal eligibility requires Active.`,
    });
  if (!sources.official.valid)
    reasons.push({
      code: "OFFICIAL_MEMBERSHIP_REQUIRED",
      message:
        "No valid membership in the current official masterlist for this annual record.",
    });
  if (!sources.checklist)
    reasons.push({
      code: "CHECKLIST_MISSING",
      message:
        "Generate the payout checklist for this annual record and cycle.",
    });
  if (!sources.requirements.length)
    reasons.push({
      code: "PAYOUT_POLICY_EMPTY",
      message: "The cycle has no required document policy.",
    });
  for (const requirement of sources.requirements) {
    if (!requirement.instanceId || !requirement.status)
      reasons.push({
        code: "REQUIREMENT_MISSING",
        requirementCode: requirement.code,
        message: `${requirement.code}: required payout instance is missing.`,
      });
    else if (requirement.status === "waived" && !requirement.allowWaiver)
      reasons.push({
        code: "WAIVER_EXCLUDED",
        requirementCode: requirement.code,
        message: `${requirement.code}: this payout policy requires verification and excludes waivers.`,
      });
    else if (
      !satisfiesNormalRequirement(requirement.status, requirement.allowWaiver)
    )
      reasons.push({
        code: "REQUIREMENT_UNSATISFIED",
        requirementCode: requirement.code,
        message: `${requirement.code}: ${requirement.status.replaceAll("_", " ")} does not satisfy the requirement.`,
      });
  }
  return {
    engineVersion: ELIGIBILITY_ENGINE,
    eligible: reasons.length === 0,
    reasons,
    sourceHash: digest(
      JSON.stringify({ engineVersion: ELIGIBILITY_ENGINE, sources }),
    ),
    sources,
  };
}
