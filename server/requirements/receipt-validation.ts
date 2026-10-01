import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
export function parseReceipt(raw: unknown) {
  const r = z
    .object({
      expectedVersion: z.number().int().min(0),
      receivedOn: z.iso.date().refine((d) => d >= "1900-01-01" && d <= today()),
      physicalReference: text(1, 300).nullable(),
      storageLocation: text(1, 300),
      remarks: z.string().trim().min(1).max(1000).nullable(),
      reason: text(5, 500),
    })
    .strict()
    .safeParse(raw);
  if (!r.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current revision, receipt date (not in the future), physical storage location and reason. Reference and remarks may be null. Receiver identity is assigned from your account.",
    );
  return r.data;
}
