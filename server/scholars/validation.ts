import { z } from "zod";
import { AuthError } from "../auth/service.js";
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^\P{Cc}*$/u, "Control characters are not allowed.");
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const scholarFieldsSchema = z
  .object({
    firstName: text(100).min(1),
    middleName: text(100).default(""),
    lastName: text(100).min(1),
    suffix: text(30).default(""),
    birthDate: z.iso
      .date()
      .refine(
        (date) => date >= "1900-01-01" && date <= today(),
        "Enter a birth date from 1900 through today.",
      )
      .nullable()
      .default(null),
    academicYearId: z.uuid(),
    barangayId: z.uuid().nullable().default(null),
    contact: z
      .object({
        email: z.union([z.literal(""), z.email().max(254)]).default(""),
        phone: text(40)
          .regex(/^[0-9+(). -]*$/, "Enter a valid phone number.")
          .default(""),
        addressLine: text(300).default(""),
      })
      .strict(),
  })
  .strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
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
export const parseScholarInput = (value: unknown, create: boolean) =>
  parse(
    z
      .object({
        expectedVersion: create ? z.literal(0) : z.number().int().min(1),
        reason: text(500).min(5),
        fields: scholarFieldsSchema,
        duplicateResolution: z
          .object({
            snapshot: z.string().regex(/^[a-f0-9]{64}$/),
            decision: z.literal("create_separate"),
            reason: text(500).min(10),
          })
          .strict()
          .optional()
          .refine(
            (value) => create || value === undefined,
            "Duplicate resolution applies only to creation.",
          ),
      })
      .strict(),
    value,
  );
export const parseScholarQuery = (value: unknown) =>
  parse(
    z
      .object({
        q: text(160).default(""),
        academicYearId: z.uuid().optional(),
        offset: z.coerce.number().int().min(0).max(1000000).default(0),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      })
      .strict(),
    value,
  );

export const parseDuplicateCheck = (value: unknown) =>
  parse(z.object({ fields: scholarFieldsSchema }).strict(), value);
