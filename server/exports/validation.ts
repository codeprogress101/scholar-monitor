import { validationDetails } from "../validation-details.js";
import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const value = schema.safeParse(body);
  if (!value.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Choose a registration academic year for registry export, or an audit date range of at most 31 days through today. Only the documented report fields are accepted.",
      validationDetails(value.error),
    );
  return value.data;
}
export const parseScholarExport = (body: unknown) =>
  parse(
    z
      .object({
        academicYearId: z.uuid(),
        q: z
          .string()
          .trim()
          .max(160)
          .regex(/^\P{Cc}*$/u)
          .default(""),
      })
      .strict(),
    body,
  );
const date = z.iso.date().refine((d) => d >= "1900-01-01" && d <= today());
export const parseAuditExport = (body: unknown) =>
  parse(
    z
      .object({ from: date, to: date })
      .strict()
      .refine(
        (v) =>
          v.from <= v.to &&
          (Date.parse(v.to) - Date.parse(v.from)) / 86400000 < 31,
      ),
    body,
  );
