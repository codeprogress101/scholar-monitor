import { validationDetails } from "../validation-details.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { currentPayout } from "../payouts/service.js";
import { today } from "../scholars/validation.js";
import { ovrHistory } from "./service.js";
import { paymentRecords } from "./processing-state.js";
import {
  paymentCorrections,
  type PaymentCorrection,
} from "./payment-correction-state.js";
import type { OvrBatch } from "./model.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const common = {
  expectedRevision: z.number().int().positive(),
  reason: text(5, 500),
  reference: text(3, 300),
};
const change = z
  .object({
    ...common,
    paymentId: z.string().uuid(),
    outcome: z.enum(["paid", "not_paid"]),
    amount: z.string().regex(/^(0|[1-9][0-9]{0,9})\.[0-9]{2}$/),
    effectiveOn: z.iso.date().refine((d) => d >= "1900-01-01" && d <= today()),
    remarks: text(0, 1000),
  })
  .strict()
  .refine((p) =>
    p.outcome === "paid"
      ? /^(0|[1-9][0-9]{0,9})\.[0-9]{2}$/.test(p.amount) &&
        BigInt(p.amount.replace(".", "")) > 0n
      : p.amount === "0.00" && p.remarks.length >= 5,
  );
const decision = z
  .object({ ...common, correctionId: z.string().uuid() })
  .strict();
export type PaymentCorrectionAction =
  "correct" | "request" | "approve" | "reject";
export function parsePaymentCorrection(
  action: PaymentCorrectionAction,
  raw: unknown,
) {
  const p = (
    action === "correct" || action === "request" ? change : decision
  ).safeParse(raw);
  if (!p.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current revision, valid payment outcome, date, reason and reference. Not paid requires zero and an explanation.",
      validationDetails(p.error),
    );
  return p.data;
}
export class PaymentCorrectionService {
  constructor(private authorization: AuthorizationService) {}
  async command(
    actor: string,
    rawId: unknown,
    action: PaymentCorrectionAction,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      input = parsePaymentCorrection(action, raw),
      hash = digest(JSON.stringify({ id, action: "payment-" + action, input }));
    return this.authorization.withPermission(
      actor,
      action === "approve" || action === "reject"
        ? "payments.corrections.approve"
        : "payments.correct",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [retry] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (retry.length) {
          if (retry[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This command key was used for different correction evidence.",
            );
          return typeof retry[0].result === "string"
            ? JSON.parse(retry[0].result)
            : retry[0].result;
        }
        const previous = (await ovrHistory(db, id))[0],
          cycle = await currentPayout(db, previous.cycleId);
        if (!["processed", "closed"].includes(previous.state))
          throw new AuthError(
            423,
            "RECORD_LOCKED",
            "Payment corrections require recorded processing.",
          );
        if (previous.revision !== input.expectedRevision)
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "Payment processing changed. Refresh before continuing.",
          );
        const closed =
          previous.state === "closed" ||
          cycle.state === "closed" ||
          cycle.periodUnavailable;
        if (
          action === "correct" &&
          (closed || !["open", "locked"].includes(cycle.state))
        )
          throw new AuthError(
            423,
            "PAYMENT_CORRECTION_APPROVAL_REQUIRED",
            "Closed-period corrections require a request and separate Coordinator approval.",
          );
        if (action === "request" && !closed)
          throw new AuthError(
            409,
            "PAYMENT_USE_DIRECT_CORRECTION",
            "Use an audited payment correction before closure.",
          );
        const all = await paymentCorrections(db, id),
          payments = await paymentRecords(db, id);
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const now = new Date().toISOString(),
          actorName = String(users[0].full_name),
          revision = previous.revision + 1;
        let correction: PaymentCorrection;
        if (action === "correct" || action === "request") {
          const data = input as z.infer<typeof change>,
            before = payments.find((p) => p.id === data.paymentId);
          if (!before)
            throw new AuthError(
              404,
              "PAYMENT_NOT_FOUND",
              "Payment is not part of this OVR.",
            );
          if (
            all.some((c) => c.paymentId === before.id && c.state === "pending")
          )
            throw new AuthError(
              409,
              "PAYMENT_CORRECTION_PENDING",
              "Resolve the pending correction for this payment first.",
            );
          if (
            !previous.processing ||
            data.effectiveOn < previous.processing.effectiveOn
          )
            throw new AuthError(
              422,
              "INVALID_PROCESSING_DATE",
              "Payment date cannot precede processing.",
            );
          const proposed = {
            ...before,
            revision,
            outcome: data.outcome,
            amount: data.amount,
            effectiveOn: data.effectiveOn,
            reference: data.reference,
            remarks: data.remarks,
            actorId: actor,
            actorName,
            recordedAt: now,
          };
          if (
            ["outcome", "amount", "effectiveOn", "reference", "remarks"].every(
              (k) =>
                before[k as keyof typeof before] ===
                proposed[k as keyof typeof proposed],
            )
          )
            throw new AuthError(
              409,
              "PAYMENT_NO_CHANGE",
              "The proposed payment outcome is unchanged.",
            );
          correction = {
            id: randomUUID(),
            version: 1,
            paymentId: before.id,
            batchId: id,
            revision,
            state: action === "correct" ? "applied" : "pending",
            before,
            proposed,
            ...(action === "correct" ? { after: proposed } : {}),
            reason: input.reason,
            reference: input.reference,
            requestedBy: actor,
            requestedByName: actorName,
            requestedAt: now,
          };
        } else {
          const data = input as z.infer<typeof decision>,
            pending = all.find(
              (c) => c.id === data.correctionId && c.state === "pending",
            );
          if (!pending)
            throw new AuthError(
              409,
              "PAYMENT_CORRECTION_NOT_PENDING",
              "This correction is no longer pending.",
            );
          if (pending.requestedBy === actor)
            throw new AuthError(
              403,
              "SEPARATE_APPROVER_REQUIRED",
              "A different Coordinator must decide this correction.",
            );
          const current = payments.find((p) => p.id === pending.paymentId);
          if (
            !current ||
            digest(JSON.stringify(current)) !==
              digest(JSON.stringify(pending.before))
          )
            throw new AuthError(
              409,
              "VERSION_CONFLICT",
              "The payment outcome changed after this request.",
            );
          correction = {
            ...pending,
            version: 2,
            revision,
            state: action === "approve" ? "approved" : "rejected",
            decidedBy: actor,
            decidedByName: actorName,
            decidedAt: now,
            decisionReason: input.reason,
            decisionReference: input.reference,
            ...(action === "approve"
              ? {
                  after: {
                    ...pending.proposed,
                    revision,
                    actorId: actor,
                    actorName,
                    recordedAt: now,
                  },
                }
              : {}),
          };
        }
        const batch: OvrBatch = {
          ...previous,
          revision,
          action: "payment-" + action,
          actorId: actor,
          actorName,
          recordedAt: now,
          reason: input.reason,
          reference: input.reference,
        };
        delete batch.payment;
        await db.execute(
          "INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            id,
            revision,
            batch.state,
            batch.action,
            JSON.stringify(batch),
            actor,
          ],
        );
        await db.execute(
          "INSERT INTO payment_corrections(id,version,payment_id,batch_id,batch_revision,state,snapshot,actor_id,occurred_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            correction.id,
            correction.version,
            correction.paymentId,
            id,
            revision,
            correction.state,
            JSON.stringify(correction),
            actor,
          ],
        );
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'payment.correction','ovr_batches',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            id,
            action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              correctionId: correction.id,
              paymentId: correction.paymentId,
              revision,
              reference: input.reference,
              before: correction.before,
              after: correction.after ?? null,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(batch)],
        );
        return batch;
      },
    );
  }
}
