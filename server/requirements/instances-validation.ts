import { z } from "zod";
import { AuthError } from "../auth/service.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
export function parseGeneration(raw: unknown) {
  const r = z
    .object({
      semesterId: z.uuid(),
      expectedSemesterVersion: z.number().int().min(1),
      reason: text(5, 500),
      reference: text(3, 300),
    })
    .strict()
    .safeParse(raw);
  if (!r.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the semester, its current revision, a reason and physical policy reference. Policy dates and definition versions are assigned by the server.",
    );
  return r.data;
}
