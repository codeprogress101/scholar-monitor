import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
import { validationDetails } from "../validation-details.js";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const text = (min: number, max: number) => z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
export const batchScopeSchema = z.object({ importId: z.uuid(), semesterId: z.uuid() }).strict();
const common = {
  importId: z.uuid(), semesterId: z.uuid(), scopeHash: hash,
  reference: text(3, 300), reason: text(5, 500),
};
const distinct = <T extends { id: string }>(rows: T[]) => new Set(rows.map(r => r.id)).size === rows.length;
const verify = z.object({
  ...common,
  effectiveOn: z.iso.date().refine(d => d >= "1900-01-01" && d <= today()),
  items: z.array(z.object({ id: z.uuid(), version: z.number().int().positive(), contextHash: hash }).strict()).min(1).max(3000).refine(distinct, "Select each document only once."),
  ordinaryChecksConfirmed: z.boolean(), deferredCourseChecksConfirmed: z.boolean(),
}).strict();
const placement = z.object({
  ...common,
  items: z.array(z.object({ id: z.uuid(), sourceHash: hash,
    // Unknown year level stays explicitly unknown. School/course must be known.
    yearLevel: text(1, 60).nullable(),
  }).strict()).min(1).max(1500).refine(distinct, "Select each COG only once."),
  coveredPlacementConfirmed: z.literal(true),
}).strict();
function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new AuthError(422, "VALIDATION_FAILED", "Review the batch selection, source revisions, reference and confirmations.", validationDetails(result.error));
  return result.data;
}
export const parseBatchScope = (raw: unknown) => parse(batchScopeSchema, raw);
export const parseBatchVerification = (raw: unknown) => parse(verify, raw);
export const parseBatchPlacement = (raw: unknown) => parse(placement, raw);
