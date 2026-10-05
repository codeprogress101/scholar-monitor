import { validationDetails } from "../validation-details.js";
import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
import type { RequirementStatus } from "./workflow-model.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const schema = z
  .object({
    expectedVersion: z.number().int().min(0),
    effectiveOn: z.iso.date().refine((d) => d >= "1900-01-01" && d <= today()),
    reason: text(5, 500),
    authorityReference: text(3, 300),
    remarks: z.string().trim().min(1).max(1000).nullable(),
  })
  .strict();
export function parseRequirementWaiver(raw: unknown) {
  const result = schema.safeParse(raw);
  if (!result.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current revision, effective date, waiver reason and authority reference.",
      validationDetails(result.error),
    );
  return result.data;
}
export function waiverTransition(status: RequirementStatus): "waived" {
  if (
    [
      "not_submitted",
      "submitted",
      "for_verification",
      "for_correction",
      "resubmitted",
      "rejected",
    ].includes(status)
  )
    return "waived";
  throw new AuthError(
    409,
    "INVALID_STATE_TRANSITION",
    "Only an unsatisfied requirement can be waived. Existing verification and waiver decisions remain preserved.",
  );
}
