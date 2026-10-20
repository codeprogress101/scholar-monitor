import { claimPeriodEnded } from "./claim-deadline.js";
import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { eligibilityView } from "../eligibility/service.js";
import { currentPayout } from "../payouts/service.js";
import type { PayoutCycle } from "../payouts/model.js";
import { effectiveRoster } from "./amendment-state.js";
import { paymentRecords } from "./processing-state.js";
import { paymentCorrections } from "./payment-correction-state.js";
import { managedRelease } from "./managed-release.js";
import type { OvrBatch, OvrEntry, OvrEvidence, OvrFinalization } from "./model.js";
import type { PayrollRow } from "./payroll-form.js";
import type { PaymentRecord } from "./processing-model.js";

export const UNPAID_REASONS = { did_not_claim: "Did not claim", withheld: "Payment withheld", review: "Other / needs review" } as const;
export type UnpaidReason = keyof typeof UNPAID_REASONS;
const decode = <T>(value: T | string): T => typeof value === "string" ? JSON.parse(value) : value;
export async function claimDeadline(db: PoolConnection, semesterId: string) {
  const [[row]] = await db.execute<RowDataPacket[]>("SELECT DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends,DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR),'%Y-%m-%d') AS day FROM semesters WHERE id=?", [semesterId]);
  return { endsOn: row?.ends ? String(row.ends) : null, expired: claimPeriodEnded(row?.ends ? String(row.ends) : null,String(row?.day ?? "")) };
}
export async function requireClaimOpen(db: PoolConnection, semesterId: string, effectiveOn?: string) {
  const deadline = await claimDeadline(db, semesterId);
  if (deadline.expired || (effectiveOn && effectiveOn > deadline.endsOn!)) throw new AuthError(409, "CLAIM_PERIOD_ENDED", "The semester claim period has ended. No new stipend may be released.");
  return deadline;
}
export async function draftDeferral(db: PoolConnection, batchId: string, scholarshipId: string) {
  const [[event]] = await db.execute<RowDataPacket[]>("SELECT revision,action,reason,actor_id,recorded_at FROM payroll_draft_deferrals WHERE batch_id=? AND scholarship_id=? ORDER BY revision DESC LIMIT 1", [batchId, scholarshipId]);
  const [[old]] = event ? [[]] : await db.execute<RowDataPacket[]>("SELECT revision,reason,actor_id,recorded_at FROM payroll_deferrals WHERE batch_id=? AND scholarship_id=? ORDER BY revision DESC LIMIT 1", [batchId, scholarshipId]);
  const row = event ?? old;
  return row ? { revision: Number(row.revision), reason: String(row.reason), actorId: String(row.actor_id), recordedAt: new Date(row.recorded_at).toISOString(), current: row.action !== "restore" } : null;
}
export async function writeDeferral(db: PoolConnection, batchId: string, scholarshipId: string, action: "defer" | "restore", actor: string, reason: string) {
  const old = await draftDeferral(db, batchId, scholarshipId);
  if (action === "restore" && !old?.current) throw new AuthError(409, "DEFERRAL_NOT_FOUND", "This scholar is not deferred from this draft.");
  await db.execute("INSERT INTO payroll_draft_deferrals(id,batch_id,scholarship_id,revision,action,reason,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [randomUUID(), batchId, scholarshipId, (old?.revision ?? 0) + 1, action, reason, actor]);
}
async function semesterBatches(db: PoolConnection, semesterId: string) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT DISTINCT b.id FROM ovr_batches b JOIN payout_cycles c ON c.id=b.cycle_id JOIN ovr_finalizations f ON f.batch_id=b.id WHERE c.semester_id=?", [semesterId]);
  return rows.map(r => String(r.id));
}
export async function semesterClaim(db: PoolConnection, scholarshipId: string, semesterId: string) {
  const [identities] = await db.execute<RowDataPacket[]>("SELECT r.id FROM scholarship_records r JOIN scholarship_records origin ON origin.scholar_id=r.scholar_id WHERE origin.id=?",[scholarshipId]);
  const ids = new Set(identities.map(r=>String(r.id)));
  const attempts = [];
  const pending = [];
  for (const batchId of await semesterBatches(db, semesterId)) {
    const [[batch]]=await db.execute<RowDataPacket[]>("SELECT cycle_id,code FROM ovr_batches WHERE id=?",[batchId]);
    for(const payment of await paymentRecords(db,batchId)) if(ids.has(payment.scholarshipId)) attempts.push({...payment,batchId,cycleId:String(batch.cycle_id),batchCode:String(batch.code)});
    for(const correction of await paymentCorrections(db,batchId)) if(correction.state === "pending" && ids.has(correction.before.scholarshipId)) pending.push(correction);
  }
  return {attempts, paid:attempts.find(p=>p.outcome === "paid") ?? null, pending};
}
export async function assertNoPaidClaim(db: PoolConnection, scholarshipId: string, semesterId: string, exceptPaymentId?: string, exceptHistoricalRequestId?: string) {
  const [pendingReceipts] = await db.execute<RowDataPacket[]>("SELECT h.id FROM payroll_historical_receipts h JOIN ovr_batches b ON b.id=h.batch_id JOIN payout_cycles c ON c.id=b.cycle_id JOIN scholarship_records r ON r.id=h.scholarship_id JOIN scholarship_records target ON target.scholar_id=r.scholar_id WHERE target.id=? AND c.semester_id=? AND h.state='pending' AND NOT EXISTS(SELECT 1 FROM payroll_historical_receipts next WHERE next.id=h.id AND next.version>h.version)",[scholarshipId,semesterId]);
  if (pendingReceipts.some(r => r.id !== exceptHistoricalRequestId)) throw new AuthError(409,"HISTORICAL_RECEIPT_PENDING","Resolve the pending historical receipt before another payment.");
  const claim=await semesterClaim(db,scholarshipId,semesterId);
  if(claim.attempts.some(p=>p.outcome === "paid" && p.id !== exceptPaymentId)) throw new AuthError(409,"STIPEND_ALREADY_PAID","This scholar's semester stipend is already paid. Review its payment history.");
  if(claim.pending.some(p=>p.paymentId !== exceptPaymentId)) throw new AuthError(409,"PAYMENT_CORRECTION_PENDING","Resolve the semester payment correction before recording another payment.");
}
export type RetryProvenance = { id: string; rootBatchId: string; sourceBatchId: string; sourceCode: string; sourceCycleId: string; paymentId: string; entitlementId: string | null };
export type ReprocessingItem = RetryProvenance & { scholarshipId: string; name: string; deadline: string | null; status: "queued" | "assigned" | "review" | "expired" | "processed" | "paid"; reasons: string[]; destinationBatchId: string | null; destinations: {id: string; code: string}[]; revision: number; evidence: OvrEvidence; row: PayrollRow | null };
export async function queueUnclaimed(db: PoolConnection, frozen: OvrFinalization, payments: PaymentRecord[], actor: string) {
  for (const p of payments.filter(p => p.outcome === "not_paid" && p.unpaidReason === "did_not_claim")) {
    const [[exists]] = await db.execute<RowDataPacket[]>("SELECT id FROM payroll_reprocessing WHERE payment_id=?", [p.id]);
    if (exists) continue;
    const entry = frozen.entries.find(e => e.scholarshipId === p.scholarshipId);
    if (!entry) throw new AuthError(409, "PAYMENT_NOT_IN_ROSTER", "Reconcile the frozen membership first.");
    const prior = entry.evidence.reprocessing;
    const [[allocation]] = await db.execute<RowDataPacket[]>("SELECT entitlement_id FROM payroll_allocations WHERE batch_id=? AND scholarship_id=?", [prior?.rootBatchId ?? frozen.batchId, p.scholarshipId]);
    const row = (frozen.payrollForm ?? frozen.legacyPayrollForm)?.rows.find(r => r.scholarshipId === p.scholarshipId) ?? null;
    await db.execute("INSERT INTO payroll_reprocessing(id,payment_id,root_batch_id,source_batch_id,scholarship_id,semester_id,entitlement_id,snapshot,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [randomUUID(), p.id, prior?.rootBatchId ?? frozen.batchId, frozen.batchId, p.scholarshipId, frozen.cycle.semesterId, allocation?.entitlement_id ?? null, JSON.stringify({entry, row}), actor]);
  }
}
export async function reprocessingQueue(db: PoolConnection, cycle: PayoutCycle): Promise<ReprocessingItem[]> {
  const deadline = await claimDeadline(db, cycle.semesterId);
  const [rows] = await db.execute<RowDataPacket[]>("SELECT q.*,b.code,b.cycle_id FROM payroll_reprocessing q JOIN ovr_batches b ON b.id=q.source_batch_id WHERE q.semester_id=? ORDER BY q.recorded_at,q.id", [cycle.semesterId]);
  const [batches] = await db.execute<RowDataPacket[]>("SELECT b.id,b.code,b.cycle_id FROM ovr_batches b JOIN payout_cycles c ON c.id=b.cycle_id WHERE c.semester_id=? ORDER BY b.created_at,b.id", [cycle.semesterId]);
  const drafts: {id: string; code: string}[] = [];
  for (const b of batches) {
    const [[event]] = await db.execute<RowDataPacket[]>("SELECT state FROM ovr_batch_events WHERE batch_id=? ORDER BY revision DESC LIMIT 1", [b.id]);
    const target = await currentPayout(db, b.cycle_id);
    const [[window]] = await db.execute<RowDataPacket[]>("SELECT opens_on FROM payroll_submission_window_versions WHERE batch_id=? ORDER BY revision DESC LIMIT 1", [b.id]);
    const [[clock]] = await db.query<RowDataPacket[]>("SELECT DATE(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR)) AS day");
    if (event?.state === "draft" && target.state === "open" && !target.periodUnavailable && (!window || new Date(window.opens_on) <= new Date(clock.day))) drafts.push({id: b.id, code: b.code});
  }
  const result: ReprocessingItem[] = [];
  for (const q of rows) {
    const snapshot = decode<{entry: OvrEntry; row: PayrollRow | null}>(q.snapshot);
    const [[event]] = await db.execute<RowDataPacket[]>("SELECT revision,destination_batch_id FROM payroll_reprocessing_events WHERE reprocessing_id=? ORDER BY revision DESC LIMIT 1", [q.id]);
    const [[attempt]] = await db.execute<RowDataPacket[]>("SELECT batch_id FROM payroll_reprocessing_attempts WHERE reprocessing_id=?", [q.id]);
    const reasons: string[] = [];
    if(rows.some(other=>other.scholarship_id === q.scholarship_id && other.root_batch_id !== q.root_batch_id)) reasons.push("Conflicting original unpaid claims exist for this semester. Resolve their payment history before reprocessing.");
    const sourcePayments = await paymentRecords(db, q.source_batch_id), payment = sourcePayments.find(p => p.id === q.payment_id);
    if (!payment || payment.outcome !== "not_paid" || payment.unpaidReason !== "did_not_claim") reasons.push("The original outcome was corrected or requires classification.");
    for (const batchId of await semesterBatches(db, cycle.semesterId)) {
      if ((await paymentCorrections(db, batchId)).some(c => c.state === "pending" && c.proposed.scholarshipId === q.scholarship_id)) reasons.push("Resolve the pending payment correction.");
    }
    let paid = false;
    try { await assertNoPaidClaim(db, q.scholarship_id, cycle.semesterId); } catch (e) { if (e instanceof AuthError) {paid=e.code === "STIPEND_ALREADY_PAID";reasons.push(e.message);} else throw e; }
    const root = await effectiveRoster(db, q.root_batch_id);
    if (!root?.snapshot.entries.some(e => e.scholarshipId === q.scholarship_id)) reasons.push("The original official entry changed; review its amendment.");
    let currentHash = "";
    if (q.entitlement_id) {
      const [[released]] = await db.execute<RowDataPacket[]>("SELECT payment_id FROM entitlement_release_links WHERE entitlement_id=?",[q.entitlement_id]);
      if(released && (await semesterClaim(db,q.scholarship_id,cycle.semesterId)).paid) reasons.push("A prior release is recorded for this entitlement. Review its payment corrections before any further collection.");
      const release = (await managedRelease(db, q.root_batch_id,q.scholarship_id))?.find(r => r.entitlementId === q.entitlement_id);
      if (!release) reasons.push("Original stipend allocation is unavailable.");
      else { reasons.push(...release.reasons); if (release.held) reasons.push("The Coordinator has held this stipend."); currentHash = release.sourceHash; }
    } else if (root) {
      const [[conversion]] = await db.execute<RowDataPacket[]>("SELECT snapshot,destination_batch_id FROM payroll_legacy_conversions WHERE source_batch_id=?",[q.root_batch_id]);
      const mapping=conversion ? decode<{dispositions:{scholarshipId:string;disposition:string}[]}>(conversion.snapshot) : null;
      if(!mapping?.dispositions.some(d=>d.scholarshipId===q.scholarship_id && d.disposition === "reprocess_unclaimed"))reasons.push("Coordinator-reviewed legacy conversion is required before reprocessing.");
      const destinationId=event?.destination_batch_id ?? conversion?.destination_batch_id;
      const [[destinationBatch]]=destinationId ? await db.execute<RowDataPacket[]>("SELECT b.cycle_id FROM ovr_batches b JOIN payroll_submission_windows w ON w.batch_id=b.id WHERE b.id=?",[destinationId]) : [[]];
      if(!destinationBatch)reasons.push("Select a numbered destination for current semester compliance review.");
      const originalCycle = await currentPayout(db, destinationBatch?.cycle_id ?? root.snapshot.cycle.id);
      const view = await eligibilityView(db, originalCycle, q.scholarship_id, destinationId ?? q.root_batch_id);
      reasons.push(...view.current.reasons.filter(r => !["SEMESTER_ALREADY_ALLOCATED", "EXISTING_PAYROLL_ALLOCATION"].includes(r.code)).map(r => r.message));
      if (view.effective.overrideStale) reasons.push("Eligibility correction needs review.");
      currentHash = view.current.sourceHash;
    }
    if (!snapshot.row) reasons.push("Original payroll form details are unavailable; review this legacy entry.");
    const destinations = [];
    for (const d of drafts) if (d.id !== q.source_batch_id && !(await draftDeferral(db, d.id, q.scholarship_id))?.current) destinations.push(d);
    // Review submissions retain their selected destination until returned to draft.
    let destination: string | null = attempt?.batch_id ?? event?.destination_batch_id ?? null;
    if (destination && !attempt) {
      const [[state]] = await db.execute<RowDataPacket[]>("SELECT state FROM ovr_batch_events WHERE batch_id=? ORDER BY revision DESC LIMIT 1", [destination]);
      if (state?.state !== "review" && !destinations.some(d => d.id === destination)) destination = null;
    }
    if (!destination && destinations.length === 1) destination = destinations[0].id;
    const provenance: RetryProvenance = {id: q.id, rootBatchId: q.root_batch_id, sourceBatchId: q.source_batch_id, sourceCode: q.code, sourceCycleId:q.cycle_id, paymentId: q.payment_id, entitlementId: q.entitlement_id};
    const evidence: OvrEvidence = {...snapshot.entry.evidence, reprocessing: provenance, fingerprint: digest(JSON.stringify({id:q.id, currentHash, payment, deadline:deadline.endsOn, reasons}))};
    result.push({...provenance, scholarshipId:q.scholarship_id, name:evidence.current.sources.scholarship.name, deadline:deadline.endsOn, status:paid ? "paid" : deadline.expired ? "expired" : attempt ? "processed" : reasons.length ? "review" : destination ? "assigned" : "queued", reasons:paid ? [] : [...new Set(reasons)], destinationBatchId:destination, destinations, revision:Number(event?.revision ?? 0), evidence, row:snapshot.row ? {...snapshot.row, reprocessingNote:`Reprocessing from ${q.code}`} : null});
  }
  return result;
}
export async function retryCandidates(db: PoolConnection, batch: OvrBatch, cycle: PayoutCycle) {
  return (await reprocessingQueue(db, cycle)).filter(q => q.status === "assigned" && q.destinationBatchId === batch.id && q.row);
}
export async function assignRetry(db: PoolConnection, item: ReprocessingItem, destination: string, actor: string, reason: string) {
  if (!["queued","assigned"].includes(item.status) || !item.destinations.some(d => d.id === destination)) throw new AuthError(409, "REPROCESSING_UNAVAILABLE", "Choose an available draft in the same semester after resolving review findings.");
  await db.execute("INSERT INTO payroll_reprocessing_events(id,reprocessing_id,revision,destination_batch_id,reason,actor_id,recorded_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))", [randomUUID(), item.id, item.revision+1, destination, reason, actor]);
}
export async function retryEvidence(db: PoolConnection, batch: OvrBatch, cycle: PayoutCycle, entry: OvrEntry) {
  const item = (await reprocessingQueue(db, cycle)).find(q => q.id === entry.evidence.reprocessing?.id && q.scholarshipId === entry.scholarshipId);
  if (!item || item.status !== "assigned" || item.destinationBatchId !== batch.id) throw new AuthError(409, "REPROCESSING_UNAVAILABLE", "Reprocessing changed or the claim period ended. Return the draft for review.");
  return item;
}
