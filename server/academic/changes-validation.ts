import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
import type { Placement } from "./changes-model.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
export const CHANGE_KINDS = [
  "course_shift",
  "school_transfer",
  "both",
  "year_level_correction",
] as const;
export function parseAcademicChange(raw: unknown) {
  const parsed = z
    .object({
      expectedVersion: z.number().int().min(0),
      kind: z.enum(CHANGE_KINDS),
      schoolId: z.uuid(),
      courseId: z.uuid(),
      yearLevel: text(1, 60),
      effectiveOn: z.iso
        .date()
        .refine(
          (d) => d >= "1900-01-01" && d <= today(),
          "Use a date from 1900 through today.",
        ),
      reason: text(5, 500),
      reference: text(3, 300),
      remarks: text(0, 1000),
    })
    .strict()
    .safeParse(raw);
  if (!parsed.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide a valid placement, effective date, reason, reference and remarks.",
    );
  return parsed.data;
}
export function validatePlacementChange(
  before: Placement,
  input: ReturnType<typeof parseAcademicChange>,
) {
  const school = before.schoolId !== input.schoolId,
    course = before.courseId !== input.courseId,
    level = before.yearLevel !== input.yearLevel;
  const valid =
    input.kind === "course_shift"
      ? course && !school && !level
      : input.kind === "school_transfer"
        ? school && !course && !level
        : input.kind === "both"
          ? school && course && !level
          : level && !school && !course;
  if (!valid)
    throw new AuthError(
      409,
      "INVALID_ACADEMIC_CHANGE",
      "Change only the fields allowed by the selected type. Record year-level corrections separately.",
    );
}
