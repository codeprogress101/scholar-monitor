import {encodeStoredJson,decodeStoredJson} from "../stored-json.js";
import { effectiveRoster } from "./amendment-state.js";
import { assertNoPaidClaim, claimDeadline, queueUnclaimed } from "./reprocessing.js";
import { validationDetails } from "../validation-details.js";
import { checkManagedPayment, entitlementEvent, linkManagedOutcome } from "./managed-release.js";
import { randomUUID } from "node:crypto";
import { originalPaymentCancelsDv } from "../payments/individual-writes.js";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { currentPayout } from "../payouts/service.js";
import { today } from "../scholars/validation.js";
import { cachedReads } from "../read-cache.js";
import { parseReconciliation } from "../payments/reconciliation-model.js";
import { reconciliationOverview,openCase } from "../payments/reconciliation-reads.js";
import { resolveCorrectedCase } from "../payments/reconciliation-writes.js";
import { ovrHistory } from "./service.js";
import { paymentRecords } from "./processing-state.js";
import {
  paymentCorrections,
  type PaymentCorrection,
} from "./payment-correction-state.js";
import type { OvrBatch } from "./model.js";
import type { PaymentRecord } from "./processing-model.js";
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
    unpaidReason: z.enum(["did_not_claim","withheld","review"]).optional(),
    amount: z.string().regex(/^(0|[1-9][0-9]{0,9})\.[0-9]{2}$/),
    effectiveOn: z.iso.date().refine((d) => d >= "1900-01-01" && d <= today()).nullable(),
    remarks: text(0, 1000),
    priorReceiptConfirmed: z.boolean().optional(),
    priorReceiptEvidence: text(20,1000).optional(),
  })
  .strict()
  .refine((p) =>
    p.outcome === "paid"
      ? p.amount === "5000.00"
      : p.amount === "0.00" && p.remarks.length >= 5,
  );
const decision = z
  .object({ ...common, correctionId: z.string().uuid() })
  .strict();
const dateChange=z.object({...common,paymentId:z.uuid(),effectiveOn:z.iso.date().refine(d=>d>="1900-01-01"&&d<=today())}).strict();
export type PaymentCorrectionAction =
  "correct" | "request" | "approve" | "reject" | "date-only" | "coordinator-outcome";
export function parsePaymentCorrection(
  action: Exclude<PaymentCorrectionAction,"coordinator-outcome">,
  raw: unknown,
) {
  const p = (
    action === "date-only" ? dateChange : action === "correct" || action === "request" ? change : decision
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
/** Financial meaning includes the unpaid classification, not just not_paid. */
export function correctionChangesOutcome(
  before: Pick<PaymentRecord, "outcome" | "unpaidReason">,
  after: Pick<PaymentRecord, "outcome" | "unpaidReason">,
) {
  return before.outcome !== after.outcome ||
    before.outcome === "not_paid" &&
    (before.unpaidReason ?? null) !== (after.unpaidReason ?? null);
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
    const directCoordinator=action==="coordinator-outcome";
    const reviewed=directCoordinator?parseReconciliation(raw):null;
    if(reviewed&&reviewed.action!=="correct")throw new AuthError(422,"VALIDATION_FAILED","Use the reviewed Coordinator payment correction.");
    const direct=reviewed?.action==="correct"?reviewed:null;
    const id = parseId(rawId),
      key = parseKey(rawKey),
      parsed = parsePaymentCorrection(directCoordinator?"correct":action as Exclude<PaymentCorrectionAction,"coordinator-outcome">, direct?{expectedRevision:direct.expectedRevision,paymentId:direct.paymentId,reason:direct.reason,reference:"Reviewed payroll reconciliation",outcome:direct.outcome==="paid"?"paid":"not_paid",...(direct.outcome==="unclaimed"?{unpaidReason:"did_not_claim"}:{}),amount:direct.outcome==="paid"?"5000.00":"0.00",effectiveOn:direct.actualPaidOn,remarks:direct.reason}:raw),
      hash = digest(JSON.stringify({ id, action: "payment-" + action, input:direct??parsed }));
    const dateOnly=action==="date-only";
    if(dateOnly||directCoordinator)action="correct";
    return this.authorization.withPermission(
      actor,
      directCoordinator || action === "approve" || action === "reject"
        ? "payments.corrections.approve"
        : "payments.correct",
      async (connection,access) => {
        const db=dateOnly||directCoordinator?cachedReads(connection):connection;
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
          return decodeStoredJson<OvrBatch>(retry[0].result);
        }
        let input=parsed;
        if(dateOnly) {
          const data=parsed as z.infer<typeof dateChange>,before=(await paymentRecords(db,id)).find(p=>p.id===data.paymentId);
          if(!before || before.outcome!=="paid")throw new AuthError(409,"PAID_RECORD_REQUIRED","Date correction requires an existing Paid record. It cannot change the outcome or amount.");
          input={...data,outcome:before.outcome,amount:before.amount,remarks:before.remarks};
        }
        const [[managedPayroll]] = await db.execute<RowDataPacket[]>("SELECT batch_id FROM payroll_submission_windows WHERE batch_id=? LOCK IN SHARE MODE", [id]);
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
        if(direct){
          const overview=await reconciliationOverview(db,id);
          if(direct.sourceHash!==overview.sourceHash||direct.expectedReconciliationRevision!==overview.reconciliationRevision)throw new AuthError(409,"RECONCILIATION_CHANGED","Payment evidence changed. Refresh and review the correction again.");
          if(direct.caseId){const source=await openCase(db,id,direct.caseId);if(source.transactionId)throw new AuthError(409,'INDIVIDUAL_PAYMENT_REVIEW_REQUIRED','Use Review Individual Payment to correct this settlement. Its original payroll outcome remains separate.');if(source.paymentId&&source.paymentId!==direct.paymentId)throw new AuthError(409,"DISCREPANCY_PAYMENT_CHANGED","The selected discrepancy belongs to another payment.");}
        }
        const claimWindow = await claimDeadline(db, cycle.semesterId);
        if(directCoordinator&&(claimWindow.expired||cycle.state==="closed"||cycle.periodUnavailable||!["open","locked"].includes(cycle.state)))throw new AuthError(423,"PAYMENT_CORRECTION_APPROVAL_REQUIRED","Closed or expired financial periods retain the existing documented request and Coordinator approval workflow. This does not reopen the payroll or authorize late collection.");
        const correctingPaid = (action === "correct" || action === "request") && (input as z.infer<typeof change>).outcome === "not_paid" && (await paymentRecords(db,id)).some(p=>p.id === (input as z.infer<typeof change>).paymentId && p.outcome === "paid");
        const closed =
          correctingPaid ||
          claimWindow.expired ||
          (Boolean(managedPayroll) && !dateOnly) ||
          previous.state === "closed" ||
          cycle.state === "closed" ||
          cycle.periodUnavailable;
        if (
          action === "correct" &&
          !directCoordinator && (closed || !["open", "locked"].includes(cycle.state))
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
              "Payment is not part of this Payroll.",
            );
          const changesOutcome=correctionChangesOutcome(before,data);
          if(action==="correct"&&changesOutcome&&!access.permissions.some(p=>p.code==="payments.corrections.approve"))throw new AuthError(403,"PERMISSION_DENIED","Only a Coordinator may change an already recorded payment outcome or unpaid classification. Staff may report a discrepancy or correct an allowed payment date.");
          if(directCoordinator&&!(before.outcome==="paid"&&data.outcome==="not_paid"||before.outcome==="not_paid"&&before.unpaidReason==="did_not_claim"&&data.outcome==="paid"))throw new AuthError(409,"PAYMENT_OUTCOME_REVIEW_REQUIRED","This command only corrects Paid to Unclaimed or Unclaimed to Paid. Resolve Withheld/Review classifications through their existing reviewed workflow.");
          if(direct?.caseId&&(await openCase(db,id,direct.caseId)).scholarshipId!==before.scholarshipId)throw new AuthError(409,"DISCREPANCY_PAYMENT_CHANGED","The selected discrepancy belongs to another scholar.");
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
            (!dateOnly && !directCoordinator && data.effectiveOn !== null && data.effectiveOn < previous.processing.effectiveOn)
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
            priorReceiptConfirmed: dateOnly ? before.priorReceiptConfirmed : data.priorReceiptConfirmed,
            priorReceiptEvidence: dateOnly ? before.priorReceiptEvidence : data.priorReceiptEvidence,
            unpaidReason: data.outcome === "not_paid" ? data.unpaidReason ?? null : null,
            amount: data.amount,
            effectiveOn: data.effectiveOn,
            reference: dateOnly ? before.reference : data.reference,
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
        const proposedPayment = correction.after ?? correction.proposed;
        // A narrow direct reversal must not resolve competing release evidence
        // implicitly. Retain the established reviewed correction workflow for
        // another Paid attempt or pending historical/financial evidence.
        if(directCoordinator&&proposedPayment.outcome==="not_paid")await assertNoPaidClaim(db,proposedPayment.scholarshipId,cycle.semesterId,proposedPayment.id);
        if(dateOnly||directCoordinator&&proposedPayment.outcome==="paid") {
          const [[period]]=await db.execute<RowDataPacket[]>("SELECT DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts FROM semesters WHERE id=?",[cycle.semesterId]);
          if(!period?.starts || !proposedPayment.effectiveOn || proposedPayment.effectiveOn<period.starts)throw new AuthError(422,"INVALID_PAYMENT_DATE","Actual payment date must fall within the approved semester. Restricted historical cases retain Coordinator review.");
        }
        if (action !== "reject" && proposedPayment.outcome === "paid") {
          await assertNoPaidClaim(db, proposedPayment.scholarshipId, cycle.semesterId, proposedPayment.id);
          const deadline = await claimDeadline(db, cycle.semesterId);
          if (deadline.expired && !proposedPayment.priorReceiptConfirmed) throw new AuthError(422,"PRIOR_RECEIPT_CONFIRMATION_REQUIRED","Confirm documentary evidence that the scholar actually received payment before the deadline. A correction cannot authorize a late collection.");
          if (deadline.expired && !proposedPayment.effectiveOn && !proposedPayment.priorReceiptEvidence) throw new AuthError(422,"PRIOR_RECEIPT_EVIDENCE_REQUIRED","An unknown exact date requires documentary evidence establishing receipt before expiry.");
          if (!deadline.endsOn || (proposedPayment.effectiveOn !== null && proposedPayment.effectiveOn > deadline.endsOn)) throw new AuthError(409, "CLAIM_PERIOD_ENDED", "A correction can only document a verified payment made within the semester claim period.");
        }
        if (correction.after?.outcome === "paid") await originalPaymentCancelsDv(db,correction.paymentId,actor,access.permissions.some(p=>p.code==="payments.corrections.approve"),requestId,correction.id);
        if (managedPayroll) {
          const proposed = correction.after ?? correction.proposed;
          const entry = await checkManagedPayment(db, id, proposed.scholarshipId, action === "reject" ? "not_paid" : proposed.outcome, action === "reject" ? "0.00" : proposed.amount);
          if (correction.after && entry) {
            if (proposed.outcome === "paid") {
              const [linked] = await db.execute<RowDataPacket[]>("SELECT payment_id FROM entitlement_release_links WHERE entitlement_id=?", [entry.entitlementId]);
              if (!linked.length) await linkManagedOutcome(db, entry, proposed.id, actor, { correctionId: correction.id, amount: proposed.amount, reference: input.reference });
            }
            await entitlementEvent(db, entry, actor, "correction", input.reason, { correctionId: correction.id, outcome: proposed.outcome, reference: input.reference });
          }
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
            encodeStoredJson(batch),
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
        if(direct?.caseId)await resolveCorrectedCase(db,batch,actor,direct.caseId,correction.paymentId,correction.id,input.reason,requestId,key);
        if (correction.after?.outcome === "not_paid" && correction.after.unpaidReason === "did_not_claim" && previous.state === "closed") {
          const roster=await effectiveRoster(db,id);
          if(roster) await queueUnclaimed(db,roster.snapshot,[correction.after],actor);
        }
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
          [actor, key, hash, encodeStoredJson(batch)],
        );
        return batch;
      },
    );
  }
}
