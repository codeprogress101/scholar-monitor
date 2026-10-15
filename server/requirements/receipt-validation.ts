import { validationDetails } from "../validation-details.js";
import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
import { documentTypeSchema } from "./document-evidence.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
export function parseBatchReceipt(raw: unknown) {
  const r = z
    .object({
      items: z
        .array(
          z
            .object({ id: z.uuid(), expectedVersion: z.number().int().min(0), documentType: documentTypeSchema.optional(), entrantCardId: z.uuid().optional() })
            .strict(),
        )
        .min(1)
        .max(100)
        .refine(
          (items) => new Set(items.map((i) => i.id)).size === items.length,
        ),
      receivedOn: z.iso.date().refine((d) => d >= "1900-01-01" && d <= today()).optional(),
      physicalReference: text(1, 300).nullable(),
      storageLocation: text(1, 300).nullable(),
      remarks: text(1, 1000).nullable(),
    })
    .strict()
    .safeParse(raw);
  if (!r.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Select distinct documents and a valid received date. Reference, storage location and remarks are optional. Receiver identity comes from your account.",
      validationDetails(r.error),
    );
  return r.data;
}
export function parseReceipt(raw: unknown) {
  const r = z
    .object({
      expectedVersion: z.number().int().min(0),
      documentType: documentTypeSchema.optional(),
      entrantCardId: z.uuid().optional(),
      receivedOn: z.iso.date().refine((d) => d >= "1900-01-01" && d <= today()).optional(),
      physicalReference: text(1, 300).nullable(),
      storageLocation: text(0, 300).nullish().transform((value) => value ?? ""),
      remarks: z.string().trim().min(1).max(1000).nullable(),
      reason: z.preprocess(
        (value) => value === undefined || (typeof value === "string" && !value.trim()) ? "Physical document received" : value,
        text(5, 500),
      ),
    })
    .strict()
    .safeParse(raw);
  if (!r.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current revision and receipt date (not in the future). Storage, notes and reference are optional. Receiver identity is assigned from your account.",
      validationDetails(r.error),
    );
  return r.data;
}
