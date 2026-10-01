import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
import type { RequirementStatus, RequirementAction } from "./workflow-model.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const common = {
  expectedVersion: z.number().int().min(1),
  effectiveOn: z.iso.date().refine((d) => d >= "1900-01-01" && d <= today()),
  reason: text(5, 500),
  reference: text(3, 300),
  remarks: z.string().trim().min(1).max(1000).nullable(),
};
const schemas = {
  "send-for-verification": z
    .object({ ...common, action: z.literal("send-for-verification") })
    .strict(),
  verify: z
    .object({
      ...common,
      action: z.literal("verify"),
      document: z
        .object({
          scholarId: z.uuid(),
          scholarVersion: z.number().int().min(1),
          academicYearId: z.uuid(),
          semesterId: z.uuid(),
          schoolId: z.uuid(),
          courseId: z.uuid(),
          academicVersion: z.number().int().min(0),
          definitionVersionId: z.uuid(),
        })
        .strict(),
      checks: z
        .object({
          identity: z.literal(true),
          period: z.literal(true),
          placement: z.literal(true),
          applicability: z.literal(true),
          validity: z.literal(true),
        })
        .strict(),
    })
    .strict(),
  "return-for-correction": z
    .object({
      ...common,
      action: z.literal("return-for-correction"),
      correctionOf: z.uuid().nullable(),
    })
    .strict(),
  resubmit: z
    .object({
      ...common,
      action: z.literal("resubmit"),
      physicalReference: text(1, 300).nullable(),
      storageLocation: text(1, 300),
    })
    .strict(),
  reject: z.object({ ...common, action: z.literal("reject") }).strict(),
};
export function parseRequirementWorkflow(
  action: RequirementAction,
  raw: unknown,
) {
  const result = z
    .discriminatedUnion("action", [
      schemas["send-for-verification"],
      schemas.verify,
      schemas["return-for-correction"],
      schemas.resubmit,
      schemas.reject,
    ])
    .safeParse(raw);
  if (!result.success || result.data.action !== action)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current revision, effective date, reason, reference and the fields required for this action. Verification requires all five document checks.",
    );
  return result.data;
}
export function requirementTransition(
  from: RequirementStatus,
  action: RequirementAction,
): RequirementStatus {
  if (
    action === "send-for-verification" &&
    ["submitted", "resubmitted"].includes(from)
  )
    return "for_verification";
  if (action === "verify" && from === "for_verification") return "verified";
  if (
    action === "return-for-correction" &&
    ["for_verification", "verified"].includes(from)
  )
    return "for_correction";
  if (action === "resubmit" && from === "for_correction") return "resubmitted";
  if (action === "reject" && from === "for_verification") return "rejected";
  throw new AuthError(
    409,
    "INVALID_STATE_TRANSITION",
    "This requirement action is not allowed from its current state.",
  );
}
