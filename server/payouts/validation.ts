import { validationDetails } from "../validation-details.js";
import { z } from "zod";
import { AuthError } from "../auth/service.js";
import type { PayoutState } from "./model.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const common = {
  expectedVersion: z.number().int().min(0),
  reason: text(5, 500),
  reference: text(3, 300),
};
const fields = z
  .object({
    name: text(2, 160),
    targetDate: z.iso.date().refine((d) => d >= "1900-01-01"),
    requirements: z
      .array(
        z
          .object({ definitionVersionId: z.uuid(), allowWaiver: z.boolean() })
          .strict(),
      )
      .min(1)
      .max(100)
      .refine(
        (items) =>
          new Set(items.map((i) => i.definitionVersionId)).size ===
          items.length,
      ),
  })
  .strict();
const schema = z.discriminatedUnion("action", [
  z
    .object({
      ...common,
      action: z.literal("create"),
      expectedVersion: z.literal(0),
      code: text(2, 60).regex(/^[A-Z0-9][A-Z0-9_-]*$/),
      semesterId: z.uuid(),
      expectedSemesterVersion: z.number().int().min(1),
      fields,
    })
    .strict(),
  z.object({ ...common, action: z.literal("configure"), fields }).strict(),
  z.object({ ...common, action: z.enum(["open", "lock", "close"]) }).strict(),
]);
export function parsePayout(raw: unknown) {
  const result = schema.safeParse(raw);
  if (!result.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current revision, reason and reference. Configuration requires a target date and distinct payout requirement versions with a waiver policy.",
      validationDetails(result.error),
    );
  return result.data;
}
export function payoutTransition(
  state: PayoutState,
  action: "configure" | "open" | "lock" | "close",
): PayoutState {
  if (state === "draft" && action === "configure") return "draft";
  if (state === "draft" && action === "open") return "open";
  if (state === "open" && action === "lock") return "locked";
  if ((state === "open" || state === "locked") && action === "close")
    return "closed";
  throw new AuthError(
    409,
    "INVALID_STATE_TRANSITION",
    "Cycle configuration is limited to Draft. Only an open cycle can be locked; an open or locked cycle can be closed.",
  );
}
