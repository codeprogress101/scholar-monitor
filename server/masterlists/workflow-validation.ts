import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
import type { PermissionCode } from "../authorization/policy.js";
import type { MasterlistAction } from "./workflow-model.js";
export const workflowPermission = (action: MasterlistAction): PermissionCode =>
  action === "approve" || action === "return-draft"
    ? "masterlists.approve"
    : action === "publish"
      ? "masterlists.publish"
      : action === "lock"
        ? "masterlists.lock"
        : "masterlists.prepare";
export function parseWorkflow(action: MasterlistAction, body: unknown) {
  const text = (min: number, max: number) =>
    z
      .string()
      .trim()
      .min(min)
      .max(max)
      .regex(/^\P{Cc}*$/u);
  const schema = z
    .object({
      expectedVersion: z.number().int().min(1),
      reason: text(5, 500),
      reference: text(3, 300),
      ...(action === "publish"
        ? {
            effectiveOn: z.iso
              .date()
              .refine(
                (d) => d >= "1900-01-01" && d <= today(),
                "Use a past or current effective date.",
              ),
          }
        : {}),
    })
    .strict();
  const value = schema.safeParse(body);
  if (!value.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current revision, reason, reference and a valid publication effective date where required.",
    );
  return value.data as {
    expectedVersion: number;
    reason: string;
    reference: string;
    effectiveOn?: string;
  };
}
export function nextMasterlistState(from: string, action: MasterlistAction) {
  const next =
    action === "submit-verification" && from === "draft"
      ? "for_verification"
      : action === "submit-approval" && from === "for_verification"
        ? "submitted_for_approval"
        : action === "approve" && from === "submitted_for_approval"
          ? "approved"
          : action === "publish" && from === "approved"
            ? "published"
            : action === "lock" && from === "published"
              ? "locked"
              : action === "return-draft" &&
                  [
                    "for_verification",
                    "submitted_for_approval",
                    "approved",
                  ].includes(from)
                ? "draft"
                : null;
  if (!next)
    throw new AuthError(
      from === "locked" ? 423 : 409,
      from === "locked" ? "RECORD_LOCKED" : "INVALID_STATE_TRANSITION",
      "Use the next workflow action. Published records require amendments, not a return to draft.",
    );
  return next;
}
