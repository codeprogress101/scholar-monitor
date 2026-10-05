import { validationDetails } from "../validation-details.js";
import { paymentCorrections } from "./payment-correction-state.js";
import { amendments, effectiveRoster } from "./amendment-state.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { today } from "../scholars/validation.js";
import { currentPayout } from "../payouts/service.js";
import { ovrHistory } from "./service.js";
import type { OvrBatch } from "./model.js";
import { paymentRecords, reconcilePayments } from "./processing-state.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const common = {
  expectedRevision: z.number().int().positive(),
  effectiveOn: z.iso.date().refine((d) => d >= "1900-01-01" && d <= today()),
  reason: text(5, 500),
  reference: text(3, 300),
};
const basic = z.object(common).strict();
const payment = z
  .object({
    ...common,
    scholarshipId: z.string().uuid(),
    outcome: z.enum(["paid", "not_paid"]),
    amount: z.string().regex(/^(0|[1-9][0-9]{0,9})\.[0-9]{2}$/),
    remarks: text(0, 1000),
  })
  .strict()
  .refine((p) =>
    p.outcome === "paid"
      ? /^(0|[1-9][0-9]{0,9})\.[0-9]{2}$/.test(p.amount) &&
        BigInt(p.amount.replace(".", "")) > 0n
      : p.amount === "0.00" && p.remarks.length >= 5,
  );
const close = z.object({ ...common, reconciled: z.boolean() }).strict();
export type ProcessingAction =
  "submit" | "mark-processed" | "record-payment" | "close";
export function processingPermission(action: ProcessingAction) {
  return action === "submit"
    ? "ovr.submit"
    : action === "close"
      ? "ovr.close"
      : "ovr.process";
}
export function parseProcessing(action: ProcessingAction, raw: unknown) {
  const parsed = (
    action === "record-payment" ? payment : action === "close" ? close : basic
  ).safeParse(raw);
  if (!parsed.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current revision, valid non-future date, reason and reference. Paid amounts require two decimals and must be positive; Not paid requires 0.00 and an explanation.",
      validationDetails(parsed.error),
    );
  return parsed.data;
}
export function processingTransition(action: ProcessingAction, state: string) {
  if (state === "closed")
    throw new AuthError(
      423,
      "OVR_ALREADY_CLOSED",
      "This OVR is closed. Ordinary changes are not permitted.",
    );
  if (action === "submit" && state === "finalized") return "submitted";
  if (action === "mark-processed" && state === "submitted") return "processed";
  if (action === "record-payment" && state === "processed") return "processed";
  if (action === "close" && state === "processed") return "closed";
  throw new AuthError(
    409,
    "OVR_INVALID_STATE",
    "Submit a finalized OVR, mark a submitted OVR processed, then record every outcome and reconcile before closure.",
  );
}
const decode = <T>(value: string | T): T =>
  typeof value === "string" ? JSON.parse(value) : value;
export class OvrProcessingService {
  constructor(private authorization: AuthorizationService) {}
  async command(
    actor: string,
    rawId: unknown,
    action: ProcessingAction,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      input = parseProcessing(action, raw),
      hash = digest(JSON.stringify({ id, action, input }));
    return this.authorization.withPermission(
      actor,
      processingPermission(action),
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
              "This command key was used with different processing evidence.",
            );
          return decode<OvrBatch>(retry[0].result);
        }
        const previous = (await ovrHistory(db, id))[0],
          state = processingTransition(action, previous.state),
          cycle = await currentPayout(db, previous.cycleId);
        if (
          !["open", "locked"].includes(cycle.state) ||
          cycle.periodUnavailable
        )
          throw new AuthError(
            423,
            "RECORD_LOCKED",
            "The payout cycle or academic period is closed or unavailable.",
          );
        if (input.expectedRevision !== previous.revision)
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "OVR processing changed. Refresh before recording another action.",
          );
        if ((await amendments(db, id)).some((a) => a.state === "pending"))
          throw new AuthError(
            409,
            "OVR_AMENDMENT_PENDING",
            "Resolve the pending amendment before processing.",
          );
        const effective = await effectiveRoster(db, id);
        if (!effective)
          throw new AuthError(
            409,
            "OVR_FINALIZATION_REQUIRED",
            "A frozen roster is required.",
          );
        const frozen = effective.snapshot;
        const priorDate =
          action === "submit"
            ? new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Manila",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(frozen.finalizedAt))
            : action === "mark-processed"
              ? previous.administration?.effectiveOn
              : previous.processing?.effectiveOn;
        if (!priorDate || input.effectiveOn < priorDate)
          throw new AuthError(
            422,
            "INVALID_PROCESSING_DATE",
            "This action date cannot precede the preceding lifecycle action.",
          );
        const payments = await paymentRecords(db, id),
          reconciliation = reconcilePayments(frozen, payments);
        const data = input as z.infer<typeof payment>;
        if (action === "record-payment") {
          if (
            !frozen.entries.some((e) => e.scholarshipId === data.scholarshipId)
          )
            throw new AuthError(
              409,
              "PAYMENT_NOT_IN_ROSTER",
              "Only members of this frozen OVR can receive an outcome.",
            );
          const [duplicate] = await db.execute<RowDataPacket[]>(
            "SELECT id FROM payment_records WHERE cycle_id=? AND scholarship_id=? LOCK IN SHARE MODE",
            [cycle.id, data.scholarshipId],
          );
          if (duplicate.length)
            throw new AuthError(
              409,
              "PAYMENT_ALREADY_RECORDED",
              "A payment outcome already exists for this scholarship and cycle.",
            );
        }
        if (action === "close") {
          if (
            (await paymentCorrections(db, id)).some(
              (c) => c.state === "pending",
            )
          )
            throw new AuthError(
              409,
              "PAYMENT_CORRECTION_PENDING",
              "Resolve pending payment corrections before closure.",
            );
          if (!(input as z.infer<typeof close>).reconciled)
            throw new AuthError(
              409,
              "OVR_UNRECONCILED",
              "Confirm reconciliation before closing the OVR.",
            );
          if (!reconciliation.complete)
            throw new AuthError(
              409,
              "OVR_PAYMENT_DATA_MISSING",
              "Every frozen member requires a recorded payment outcome before closure.",
              { reconciliation },
            );
          if (payments.some((p) => p.effectiveOn > input.effectiveOn))
            throw new AuthError(
              422,
              "INVALID_PROCESSING_DATE",
              "Closure cannot precede a recorded payment outcome.",
            );
        }
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const now = new Date().toISOString(),
          stamp = {
            effectiveOn: input.effectiveOn,
            reference: input.reference,
            reason: input.reason,
            actorId: actor,
            actorName: users[0].full_name,
            recordedAt: now,
          };
        const batch: OvrBatch = {
          ...previous,
          revision: previous.revision + 1,
          state,
          action,
          actorId: actor,
          actorName: stamp.actorName,
          recordedAt: now,
          reason: input.reason,
          reference: input.reference,
        };
        if (action === "submit") batch.administration = stamp;
        if (action === "mark-processed") batch.processing = stamp;
        if (action === "close")
          batch.closure = { ...stamp, reconciled: true, reconciliation };
        if (action === "record-payment")
          batch.payment = {
            scholarshipId: data.scholarshipId,
            outcome: data.outcome,
            amount: data.amount,
            effectiveOn: data.effectiveOn,
          };
        else delete batch.payment;
        await db.execute(
          "INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [id, batch.revision, state, action, JSON.stringify(batch), actor],
        );
        if (action === "record-payment")
          await db.execute(
            "INSERT INTO payment_records(id,batch_id,batch_revision,cycle_id,scholarship_id,outcome,amount,effective_on,reference_text,remarks,actor_id,actor_name,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            [
              randomUUID(),
              id,
              batch.revision,
              cycle.id,
              data.scholarshipId,
              data.outcome,
              data.amount,
              data.effectiveOn,
              data.reference,
              data.remarks,
              actor,
              stamp.actorName,
            ],
          );
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'ovr.processing','ovr_batches',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            id,
            action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              revision: batch.revision,
              state,
              effectiveOn: input.effectiveOn,
              reference: input.reference,
              payment: batch.payment ?? null,
              reconciliation: action === "close" ? reconciliation : null,
              finalizationHash: effective.hash,
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
