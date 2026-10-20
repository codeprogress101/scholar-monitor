import { z } from "zod";
import { validationDetails } from "../validation-details.js";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
import { documentTypeSchema } from "./document-evidence.js";
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
      effectiveOn: common.effectiveOn.optional(),
      attestation: z.enum(["all-five-checked","course-comparison-deferred"]).optional(),
      document: z
        .object({
          scholarId: z.uuid(),
          scholarVersion: z.number().int().min(1),
          academicYearId: z.uuid(),
          semesterId: z.uuid(),
          schoolId: z.uuid().nullable(),
          courseId: z.uuid().nullable(),
          academicVersion: z.number().int().min(0),
          definitionVersionId: z.uuid(),
          coverageId: z.uuid().optional(),
          entrantCardId: z.uuid().optional(),
          coursePendingId: z.uuid().optional(),
          coursePendingRevision: z.number().int().positive().optional(),
          semesterRevision: z.number().int().positive().optional(),
          predecessorSourceHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
        })
        .strict(),
      checks: z
        .object({
          identity: z.literal(true),
          period: z.literal(true),
          placement: z.boolean(),
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
      documentType: documentTypeSchema.optional(),
      entrantCardId: z.uuid().optional(),
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
  if (action === "verify" && raw && typeof raw === "object" && "attestation" in raw && raw.attestation === "all-five-checked" && !("checks" in raw)) {
    raw = { ...raw, checks: {identity:true,period:true,placement:true,applicability:true,validity:true} };
  }
  if (action === "verify" && raw && typeof raw === "object" && "attestation" in raw && raw.attestation === "course-comparison-deferred" && !("checks" in raw)) raw={...raw,checks:{identity:true,period:true,placement:false,applicability:true,validity:true}};
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
      result.success
        ? {
            issues: [
              {
                path: ["action"],
                code: "invalid_value",
                message: "The action must match the requested operation.",
              },
            ],
          }
        : validationDetails(result.error),
    );
  if(result.data.action==='verify') {
    const deferred=result.data.attestation==='course-comparison-deferred';
    if(deferred === result.data.checks.placement || (deferred && (!result.data.document.coursePendingId || !result.data.document.coursePendingRevision))) throw new AuthError(422,'VERIFICATION_ATTESTATION_CONFLICT','Confirm the ordinary checks or explicitly defer course comparison against a current approved exception.');
  }
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
  if (action === "verify" && ["submitted", "resubmitted", "for_verification", "verified"].includes(from)) return "verified";
  if (
    action === "return-for-correction" &&
    ["submitted", "resubmitted", "for_verification", "verified"].includes(from)
  )
    return "for_correction";
  if (action === "resubmit" && from === "for_correction") return "resubmitted";
  if (action === "reject" && ["submitted", "resubmitted", "for_verification"].includes(from)) return "rejected";
  throw new AuthError(
    409,
    "INVALID_STATE_TRANSITION",
    "This requirement action is not allowed from its current state.",
  );
}
