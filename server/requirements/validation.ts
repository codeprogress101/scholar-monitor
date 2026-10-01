import { z } from "zod";
import { AuthError } from "../auth/service.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const date = z.iso.date().refine((d) => d >= "1900-01-01" && d <= "9999-12-31");
const fields = z
  .object({
    name: text(1, 160),
    instructions: text(1, 2000),
    appliesTo: z.enum(["semester", "payout"]),
    semesterId: z.uuid().nullable(),
    effectiveFrom: date,
    effectiveUntil: date.nullable(),
  })
  .strict()
  .refine((v) => !v.effectiveUntil || v.effectiveUntil > v.effectiveFrom, {
    message: "End date must follow the start date; end dates are exclusive.",
  });
const common = {
  expectedVersion: z.number().int().min(0),
  reason: text(5, 500),
  reference: text(3, 300),
};
const command = z.discriminatedUnion("action", [
  z
    .object({
      ...common,
      action: z.literal("create"),
      code: text(1, 40).regex(/^[A-Z][A-Z0-9_-]*$/),
      fields,
    })
    .strict(),
  z.object({ ...common, action: z.literal("revise"), fields }).strict(),
  z
    .object({ ...common, action: z.literal("archive"), effectiveFrom: date })
    .strict(),
]);
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      r.error.issues
        .map((i) => i.message)
        .join(" ")
        .slice(0, 800),
    );
  return r.data;
}
export const parseRequirement = (v: unknown) => parse(command, v);
export const parseRequirementList = (v: unknown) =>
  parse(
    z
      .object({
        q: z.string().trim().max(160).default(""),
        offset: z.coerce.number().int().min(0).max(100000).default(0),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      })
      .strict(),
    v,
  );
export const parseRequirementContext = (v: unknown) =>
  parse(
    z
      .object({
        semesterId: z.uuid(),
        appliesTo: z.enum(["semester", "payout"]),
        effectiveOn: date,
      })
      .strict(),
    v,
  );
