import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
import { AMENDMENT_KINDS } from "./amendment-model.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
export function parseAmendment(body: unknown) {
  const result = z
    .object({
      expectedVersion: z.number().int().min(1),
      scholarId: z.uuid(),
      kind: z.enum(AMENDMENT_KINDS),
      schoolId: z.uuid().optional(),
      courseId: z.uuid().optional(),
      yearLevel: text(1, 60).optional(),
      awardNumber: text(1, 60).nullable().optional(),
      effectiveOn: z.iso
        .date()
        .refine((d) => d >= "1900-01-01" && d <= today()),
      reason: text(5, 500),
      reference: text(3, 300),
    })
    .strict()
    .superRefine((v, ctx) => {
      const supplied = [
        "schoolId",
        "courseId",
        "yearLevel",
        "awardNumber",
      ].filter((k) => Object.hasOwn(v, k) && Reflect.get(v, k) !== undefined);
      const expected =
        v.kind === "both"
          ? ["schoolId", "courseId"]
          : v.kind === "school_transfer"
            ? ["schoolId"]
            : v.kind === "course_shift"
              ? ["courseId"]
              : v.kind === "year_level_correction"
                ? ["yearLevel"]
                : v.kind === "award_number"
                  ? ["awardNumber"]
                  : [];
      if (
        supplied.length !== expected.length ||
        supplied.some((k) => !expected.includes(k))
      )
        ctx.addIssue({
          code: "custom",
          message: "Provide only the fields required by the amendment type.",
        });
    })
    .safeParse(body);
  if (!result.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the original revision, scholar, specific amendment fields, effective date, reason and reference. Identity refresh uses the registry name automatically.",
    );
  return result.data;
}
