import { z } from "zod";
import { AuthError } from "../auth/service.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const evidence = { reason: text(5, 500), reference: text(3, 300) };
function parse<T>(schema: z.ZodType<T>, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" ")
        .slice(0, 800),
    );
  return result.data;
}
export const parseDraft = (body: unknown) =>
  parse(
    z
      .object({ academicYearId: z.uuid(), title: text(1, 160), ...evidence })
      .strict(),
    body,
  );
export const parseEntry = (body: unknown) =>
  parse(
    z
      .object({
        action: z.enum(["add", "remove", "refresh"]),
        expectedVersion: z.number().int().min(1),
        scholarId: z.uuid(),
        awardNumber: text(1, 60).nullable(),
        ...evidence,
      })
      .strict(),
    body,
  );
export const parsePage = (query: unknown) =>
  parse(
    z
      .object({
        q: text(0, 100).default(""),
        offset: z.coerce.number().int().min(0).default(0),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      })
      .strict(),
    query,
  );
