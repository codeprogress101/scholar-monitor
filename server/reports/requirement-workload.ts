import type { EligibilitySources } from "../eligibility/model.js";

/** One definition for document rows in operational reports and Home counts. */
export function requirementWorkload(requirement: EligibilitySources["requirements"][number]) {
  if (requirement.satisfied && requirement.documentException?.mode === "initial_requirements") return null;
  const status = requirement.status ?? "not_generated";
  if (["not_generated", "not_submitted", "for_correction", "rejected"].includes(status))
    return { kind: "missing" as const, status };
  if (["submitted", "resubmitted", "for_verification"].includes(status))
    return { kind: "verification" as const, status };
  return null;
}
