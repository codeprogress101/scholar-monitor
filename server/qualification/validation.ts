import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
import type { QualificationAction, QualificationStatus } from "./model.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
export function parseQualification(body: unknown, create: boolean) {
  const result = z
    .object({
      expectedVersion: create ? z.literal(0) : z.number().int().min(1),
      academicYearId: z.uuid().optional(),
      effectiveOn: z.iso
        .date()
        .refine(
          (value) => value >= "1900-01-01" && value <= today(),
          "Effective date must be from 1900 through today.",
        ),
      reason: text(5, 500),
      reference: text(3, 300),
    })
    .strict()
    .refine(
      (value) =>
        create
          ? Boolean(value.academicYearId)
          : value.academicYearId === undefined,
      {
        path: ["academicYearId"],
        message:
          "Academic year is required on creation and immutable afterward.",
      },
    )
    .safeParse(body);
  if (!result.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      result.error.issues
        .map((issue) => issue.path.join(".") + ": " + issue.message)
        .join(" ")
        .slice(0, 800),
    );
  return result.data;
}
export function transition(
  from: QualificationStatus,
  action: QualificationAction,
): QualificationStatus {
  if (action === "exam-passed" && from === "applicant") return "exam_passed";
  if (action === "qualify" && from === "exam_passed") return "qualified";
  if (action === "select" && from === "qualified") return "selected";
  if (
    action === "not-select" &&
    ["applicant", "exam_passed", "qualified"].includes(from)
  )
    return "not_selected";
  if (action === "activate" && from === "selected")
    throw new AuthError(
      409,
      "MASTERLIST_ACTIVATION_REQUIRED",
      "Activation requires an authoritative official masterlist. This workflow is not available yet.",
    );
  throw new AuthError(
    409,
    "INVALID_STATE_TRANSITION",
    "This command is not allowed from the current annual qualification state.",
  );
}
