import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
import {
  OPERATIONAL_STATUSES,
  TERMINAL_STATUSES,
  type OperationalStatus,
} from "./model.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const detail = { reason: text(5, 500), reference: text(3, 300) };
function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const value = schema.safeParse(raw);
  if (!value.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      value.error.issues
        .map((issue) => issue.path.join(".") + ": " + issue.message)
        .join(" ")
        .slice(0, 800),
    );
  return value.data;
}
export const parseStatusRequest = (raw: unknown) =>
  parse(
    z
      .object({
        expectedVersion: z.number().int().min(1),
        toStatus: z.enum(OPERATIONAL_STATUSES),
        kind: z.enum(["change", "correction"]),
        correctsRequestId: z.uuid().optional(),
        effectiveOn: z.iso
          .date()
          .refine(
            (date) => date >= "1900-01-01" && date <= today(),
            "Use a date from 1900 through today.",
          ),
        reasonCode: text(2, 60).regex(/^[A-Z][A-Z0-9_]+$/),
        ...detail,
      })
      .strict()
      .refine(
        (value) =>
          value.kind === "correction"
            ? Boolean(value.correctsRequestId)
            : value.correctsRequestId === undefined,
        {
          path: ["correctsRequestId"],
          message: "Only corrections require the original approved request.",
        },
      ),
    raw,
  );
export const parseStatusDecision = (raw: unknown) =>
  parse(z.object(detail).strict(), raw);
export function validateStatusEdge(
  from: OperationalStatus | null,
  to: OperationalStatus,
  kind: "change" | "correction",
) {
  if (!from)
    throw new AuthError(
      409,
      "MASTERLIST_ACTIVATION_REQUIRED",
      "This annual record has not been activated through an official masterlist.",
    );
  const allowed =
    kind === "correction"
      ? TERMINAL_STATUSES.includes(from) &&
        ["active", "on_hold", "suspended"].includes(to)
      : from === "active"
        ? to !== "active"
        : ["on_hold", "suspended"].includes(from) &&
          (to === "active" || TERMINAL_STATUSES.includes(to));
  if (!allowed)
    throw new AuthError(
      409,
      "INVALID_STATE_TRANSITION",
      "Use an allowed status command. Terminal reversals require a linked correction request.",
    );
}
