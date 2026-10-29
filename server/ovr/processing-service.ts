import {encodeStoredJson,decodeStoredJson} from "../stored-json.js";
import { treasuryEvidence } from "./treasury-state.js";
import { requireNumberedPayroll } from "./legacy-boundary.js";
import { requireClaimOpen, assertNoPaidClaim, checkNoPaidClaim, queueUnclaimed, reprocessingQueue, type semesterClaim } from "./reprocessing.js";
import { assertNoIndividualRoute } from "../payments/individual-writes.js";
import { validationDetails } from "../validation-details.js";
import { managedRelease, managedAllocationIds, checkManagedPayment, validateManagedOutcome, entitlementEvent, linkManagedOutcome, type ReleaseEntry,type ReleaseLinkSource } from "./managed-release.js";
import { compactPaymentEvent } from "../payments/processing-evidence.js";
import { prepareClosure,persistClosure } from "../payments/reconciliation-writes.js";
import { paymentCorrections } from "./payment-correction-state.js";
import { amendments, effectiveRoster } from "./amendment-state.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
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
    effectiveOn: common.effectiveOn.nullable(),
    treasuryEvidenceRevision: z.number().int().positive().optional(),
    scholarshipId: z.string().uuid(),
    outcome: z.enum(["paid", "not_paid"]),
    unpaidReason: z.enum(["did_not_claim","withheld","review"]).optional(),
    amount: z.string().regex(/^(0|[1-9][0-9]{0,9})\.[0-9]{2}$/),
    remarks: text(0, 1000),
    receiptConfirmed: z.literal(true).optional(),
  })
  .strict()
  .refine((p) =>
    p.outcome === "paid"
      ? p.amount === "5000.00"
      : p.amount === "0.00" && !!p.unpaidReason && (p.unpaidReason === "did_not_claim" || p.remarks.length >= 5),
  );
const close = z.object({ ...common, reconciled: z.boolean(),financialBasis:z.string().regex(/^[a-f0-9]{64}$/).optional(),expectedReconciliationRevision:z.number().int().nonnegative().optional(),verificationOverrideReason:text(5,500).optional() }).strict();
const hold = z.object({ ...common, scholarshipId: z.uuid(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export type ProcessingAction =
  "submit" | "mark-processed" | "record-payment" | "close" | "hold" | "release-hold";
export function processingPermission(action: ProcessingAction) {
  if (action === "hold" || action === "release-hold") return "ovr.finalize";
  return action === "submit"
    ? "ovr.submit"
    : action === "close"
      ? "ovr.close"
      : "ovr.process";
}
export function parseProcessing(action: ProcessingAction, raw: unknown) {
  const parsed = (
    action === "hold" || action === "release-hold" ? hold : action === "record-payment" ? payment : action === "close" ? close : basic
  ).safeParse(raw);
  if (!parsed.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current revision, valid non-future date, reason and reference. Paid degree stipends must be exactly 5000.00; Not paid requires 0.00 and an explanation.",
      validationDetails(parsed.error),
    );
  return parsed.data;
}
export function processingTransition(action: ProcessingAction, state: string) {
  if (["hold", "release-hold"].includes(action) && ["finalized", "submitted", "processed", "closed"].includes(state)) return state;
  if (state === "closed")
    throw new AuthError(
      423,
      "OVR_ALREADY_CLOSED",
      "This Payroll is closed. Ordinary changes are not permitted.",
    );
  if (action === "submit" && state === "finalized") return "submitted";
  if (action === "mark-processed" && state === "submitted") return "processed";
  if (action === "record-payment" && state === "processed") return "processed";
  if (action === "close" && state === "processed") return "closed";
  throw new AuthError(
    409,
    "OVR_INVALID_STATE",
    "Submit a finalized Payroll, mark a submitted Payroll processed, then record every outcome and reconcile before closure.",
  );
}
const decode = <T>(value: string | T): T =>
  decodeStoredJson<T>(value);
/** Server-only, one guarded transaction. Closures are invoked only after the
 * entire reviewed set has passed the ordinary authoritative payment guards. */
export type PaymentRecordingContext = {
  previous: OvrBatch; cycle: Awaited<ReturnType<typeof currentPayout>>;
  effective: NonNullable<Awaited<ReturnType<typeof effectiveRoster>>>;
  releases: Map<string,ReleaseEntry>; allocationIds: string[];
  payments: Awaited<ReturnType<typeof paymentRecords>>;
  reconciliation:ReturnType<typeof reconcilePayments>;
  compactBase: OvrBatch;
  actorName:string; linkSources:Map<string,ReleaseLinkSource>;
  claims:Map<string,Awaited<ReturnType<typeof semesterClaim>>>; pendingReceipts:Map<string,string[]>;
  duplicates:Map<string,{batchId:string}[]>;
  writes: (()=>Promise<OvrBatch>)[]; revision: number; operationId: string;
};
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
      db => this.execute(db,actor,id,action,key,input,hash,requestId),
    );
  }
  /** Internal transaction primitive. Callers must authorize on this connection before entering. */
  async execute(db: PoolConnection, actor: string, id: string, action: ProcessingAction, key: string,
    input: ReturnType<typeof parseProcessing>, hash: string, requestId: string, historicalRequestId?: string, recording?: PaymentRecordingContext) {
        if(recording && (action!=="record-payment" || historicalRequestId)) throw new Error("Invalid internal payment recording context");
        if(!recording) {
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
        }
        await requireNumberedPayroll(db, id);
        const [[managedPayroll]] = await db.execute<RowDataPacket[]>("SELECT batch_id FROM payroll_submission_windows WHERE batch_id=? LOCK IN SHARE MODE", [id]);
        const previous = recording?.previous ?? (await ovrHistory(db, id))[0],
          state = historicalRequestId && action === "record-payment" && ["finalized","submitted","processed","closed"].includes(previous.state) ? previous.state : processingTransition(action, previous.state),
          cycle = recording?.cycle ?? await currentPayout(db, previous.cycleId);
        const holding = action === "hold" || action === "release-hold";
        if (!historicalRequestId && !(holding && managedPayroll) && (
          !["open", "locked"].includes(cycle.state) ||
          cycle.periodUnavailable
        ))
          throw new AuthError(
            423,
            "RECORD_LOCKED",
            "The payout cycle or academic period is closed or unavailable.",
          );
        if (input.expectedRevision !== previous.revision)
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "Payroll processing changed. Refresh before recording another action.",
          );
        if ((await amendments(db, id)).some((a) => a.state === "pending"))
          throw new AuthError(
            409,
            "OVR_AMENDMENT_PENDING",
            "Resolve the pending amendment before processing.",
          );
        const effective = recording?.effective ?? await effectiveRoster(db, id);
        if (!effective)
          throw new AuthError(
            409,
            "OVR_FINALIZATION_REQUIRED",
            "A frozen roster is required.",
          );
        const frozen = effective.snapshot;
        // Submit/process/close never consumed release findings. Closure validates
        // frozen payments and conflicts below, without re-assessing a whole cohort.
        const releaseEntries = recording ? [...recording.releases.values()] : managedPayroll && (holding||action==="record-payment") ? await managedRelease(db, id, "scholarshipId" in input ? input.scholarshipId : undefined) : null;
        const allocationIds=recording?.allocationIds ?? (managedPayroll?await managedAllocationIds(db,id):null);
        const reserved=allocationIds?new Set(allocationIds):null;
        if (!recording && allocationIds && (allocationIds.length > frozen.entries.length || frozen.entries.some(e => !reserved!.has(e.scholarshipId) && !e.evidence.reprocessing))) throw new AuthError(409, "PAYROLL_ALLOCATION_MISMATCH", "Reconcile frozen membership with its reserved semester allocations before processing.");
        if (holding && !releaseEntries) throw new AuthError(409, "MANAGED_BATCH_REQUIRED", "Payment holds require a numbered payroll allocation.");
        const priorDate =
          holding && previous.closure ? previous.closure.effectiveOn : action === "submit" || holding
            ? new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Manila",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(frozen.finalizedAt))
            : action === "mark-processed"
              ? previous.administration?.effectiveOn
              : previous.processing?.effectiveOn;
        if (!historicalRequestId && !recording && (!priorDate || (input.effectiveOn !== null && input.effectiveOn < priorDate)))
          throw new AuthError(
            422,
            "INVALID_PROCESSING_DATE",
            "This action date cannot precede the preceding lifecycle action.",
          );
        const payments = recording?.payments ?? await paymentRecords(db, id),
          reconciliation = recording?.reconciliation ?? reconcilePayments(frozen, payments);
        const data = input as z.infer<typeof payment>;
        const treasury = !recording && action === "record-payment" && data.outcome === "paid" ? await treasuryEvidence(db,id) : null;
        if (!recording && action === "record-payment" && data.outcome === "paid" && (!treasury || data.treasuryEvidenceRevision !== treasury.revision))
          throw new AuthError(409,"TREASURY_EVIDENCE_REQUIRED","Record and review the current batch Treasury evidence before confirming actual receipt.");
        if (treasury) data.reference = treasury.payrollReference;
        if (treasury && data.effectiveOn && data.effectiveOn > treasury.officeReceivedOn)
          throw new AuthError(422,"INVALID_PAYMENT_DATE","A documented receipt date cannot follow the office receipt of its signed evidence.");
        if (managedPayroll && action === "record-payment" && data.outcome === "paid" && !data.receiptConfirmed) throw new AuthError(422, "ACTUAL_RECEIPT_CONFIRMATION_REQUIRED", "Confirm actual receipt using the signed payment evidence. Payroll preparation or processing alone is not payment.");
        const releaseEntry = recording ? recording.releases.get(data.scholarshipId) ?? null : action === "record-payment" ? await checkManagedPayment(db, id, data.scholarshipId, data.outcome, data.amount) : null;
        if(recording) {
          if(!releaseEntry) throw new AuthError(409,"PAYROLL_ALLOCATION_REQUIRED","A matching approved entitlement is required. Use the existing reviewed historical tools for legacy attempts.");
          validateManagedOutcome(releaseEntry,data.outcome,data.amount);
          if(data.outcome === "paid" && !data.receiptConfirmed) throw new AuthError(422,"ACTUAL_RECEIPT_CONFIRMATION_REQUIRED","Confirm actual payment receipt.");
          const [[period]]=await db.execute<RowDataPacket[]>("SELECT DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts FROM semesters WHERE id=?",[cycle.semesterId]);
          if(data.effectiveOn && (!period?.starts || data.effectiveOn<period.starts)) throw new AuthError(422,"INVALID_PAYMENT_DATE","Actual payment must fall within the approved semester. Use the historical receipt workflow for restricted cases.");
        }
        if (holding) {
          const h = input as z.infer<typeof hold>, entry = releaseEntries!.find(e => e.scholarshipId === h.scholarshipId);
          if (!entry || entry.state === "released") throw new AuthError(409, "UNPAID_ALLOCATION_REQUIRED", "Only an unpaid allocated entry may be held or cleared. Existing payments are preserved.");
          if (entry.sourceHash !== h.sourceHash) throw new AuthError(409, "SOURCE_CHANGED", "The entry changed. Reload its current restrictions before deciding.");
          if (action === "release-hold" && (!entry.held || entry.reasons.length)) throw new AuthError(409, "HOLD_RESTRICTIONS_UNRESOLVED", "Resolve the underlying academic and standing restrictions first. Clearing a hold is not an eligibility exception.");
          await entitlementEvent(db, entry, actor, action === "hold" ? "withheld" : "approved", input.reason, { releaseHold: action === "hold", reference: input.reference, effectiveOn: input.effectiveOn });
        }
        if (action === "record-payment") {
          if (
            !frozen.entries.some((e) => e.scholarshipId === data.scholarshipId)
          )
            throw new AuthError(
              409,
              "PAYMENT_NOT_IN_ROSTER",
              "Only members of this frozen Payroll can receive an outcome.",
            );
          const provenance = frozen.entries.find(e=>e.scholarshipId===data.scholarshipId)?.evidence.reprocessing;
          if (data.outcome === "paid") {
            await assertNoIndividualRoute(db,data.scholarshipId,cycle.semesterId);
            if (!historicalRequestId && !recording) await requireClaimOpen(db,cycle.semesterId,data.effectiveOn ?? undefined);
            if(recording) {
              const claim=recording.claims.get(data.scholarshipId);
              if(!claim)throw new Error("Missing current financial claim sources");
              checkNoPaidClaim(claim,recording.pendingReceipts.get(data.scholarshipId)??[]);
            } else await assertNoPaidClaim(db,data.scholarshipId,cycle.semesterId,undefined,historicalRequestId);
            if (provenance) {
              const retry=(await reprocessingQueue(db,cycle)).find(q=>q.id===provenance.id);
              if(!retry || retry.status!=="processed" || retry.destinationBatchId!==id || retry.reasons.length) throw new AuthError(409,"REPROCESSING_UNAVAILABLE","Reprocessing is held or its original outcome changed. Review the claim history.");
              if(!data.receiptConfirmed)throw new AuthError(422,"ACTUAL_RECEIPT_CONFIRMATION_REQUIRED","Confirm actual receipt of the reprocessed stipend.");
            }
          }
          const [duplicate] = recording ? [(recording.duplicates.get(data.scholarshipId)??[]).filter(p=>!provenance||p.batchId===id)] : await db.execute<RowDataPacket[]>(
            provenance ? "SELECT id FROM payment_records WHERE batch_id=? AND scholarship_id=? LOCK IN SHARE MODE" : "SELECT id FROM payment_records WHERE cycle_id=? AND scholarship_id=? LOCK IN SHARE MODE",
            [provenance ? id : cycle.id, data.scholarshipId],
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
              "Confirm reconciliation before closing the Payroll.",
            );
          if (!reconciliation.complete)
            throw new AuthError(
              409,
              "OVR_PAYMENT_DATA_MISSING",
              "Every frozen member requires a recorded payment outcome before closure.",
              { reconciliation },
            );
          if (payments.some((p) => p.effectiveOn && input.effectiveOn && p.effectiveOn > input.effectiveOn))
            throw new AuthError(
              422,
              "INVALID_PROCESSING_DATE",
              "Closure cannot precede a recorded payment outcome.",
            );
        }
        const closureReview=managedPayroll&&action==="close"?await prepareClosure(db,previous,input as z.infer<typeof close>):null;
        const persist = async () => {
        const [users] = recording ? [[{full_name:recording.actorName}]] : await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const now = new Date().toISOString(),
          stamp = {
            effectiveOn: input.effectiveOn ?? today(),
            reference: input.reference,
            reason: input.reason,
            actorId: actor,
            actorName: users[0].full_name,
            recordedAt: now,
          };
        const batch: OvrBatch = {
          ...previous,
          revision: recording ? ++recording.revision : previous.revision + 1,
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
        if(recording && data.outcome === "paid") batch.paymentAcknowledgement={basis:"staff_actual_receipt",operationId:recording.operationId,confirmed:true};
        else delete batch.paymentAcknowledgement;
        const stored = recording ? compactPaymentEvent(batch,recording.compactBase) : batch;
        await db.execute(
          "INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [id, batch.revision, state, action, encodeStoredJson(stored), actor],
        );
        const paymentId = randomUUID();
        if (action === "record-payment") {
          await db.execute(
            "INSERT INTO payment_records(id,batch_id,batch_revision,cycle_id,scholarship_id,outcome,amount,effective_on,reference_text,remarks,actor_id,actor_name,unpaid_reason,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            [
              paymentId,
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
              data.outcome === "not_paid" ? data.unpaidReason : null,
            ],
          );
          if (treasury) await db.execute("INSERT INTO payroll_treasury_confirmations(payment_id,batch_id,evidence_revision,actor_id,confirmed_at,historical_request_id) VALUES(?,?,?,?,UTC_TIMESTAMP(6),?)", [paymentId,id,treasury.revision,actor,historicalRequestId ?? null]);
          if (releaseEntry) {
            if (data.outcome === "paid") await linkManagedOutcome(db, releaseEntry, paymentId, actor, { outcome: data.outcome, amount: data.amount, effectiveOn: data.effectiveOn, reference: data.reference, sourceHash: releaseEntry.sourceHash },recording?.linkSources.get(releaseEntry.entitlementId));
            else await entitlementEvent(db, releaseEntry, actor, data.unpaidReason === "did_not_claim" ? "unclaimed" : "withheld", data.reason, { paymentId, reference: data.reference, outcome: "not_paid", amount: "0.00" });
          }
        }
        if(action === "close") {
          await queueUnclaimed(db,frozen,payments,actor);
          if(closureReview)await persistClosure(db,batch,actor,closureReview,requestId,key);
        }
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
              acknowledgement: batch.paymentAcknowledgement ?? null,
            }),
          ],
        );
        if (!historicalRequestId && !recording) await db.execute(
          "INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, encodeStoredJson(batch)],
        );
        return stored;
        };
        if(recording) {recording.writes.push(persist);return previous;}
        return persist();
  }
}
