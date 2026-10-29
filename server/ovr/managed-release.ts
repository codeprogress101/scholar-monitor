import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { loadSemesterCompliance } from "../continuing/semester-compliance.js";
import { graduationFor } from "../status/graduation.js";
import { paymentRecords } from "./processing-state.js";
import {individualClaims} from '../payments/settlement-reads.js';
import {historicalBatch,historicalMember,historicalSourceCurrent} from '../payouts/historical-context.js';
import {currentPayout} from '../payouts/service.js';
import {officialMembership} from '../eligibility/official-membership.js';
import {cohortReads} from '../eligibility/cohort-reads.js';

export type ReleaseEntry = { scholarshipId: string; entitlementId: string; state: "approved_for_release" | "withheld" | "unclaimed" | "released"; held: boolean; reasons: string[]; sourceHash: string; individualSettlement?:{paymentId:string;transactionId:string;actualPaidOn:string|null}; history: { action: string; reason: string; reference: string | null; actor: string; recordedAt: string }[] };
const decode = <T>(v: string | T): T => typeof v === "string" ? JSON.parse(v) : v;
export const managedEntitlementEventsSql="SELECT e.*,u.full_name FROM semester_entitlement_events e JOIN users u ON u.id=e.actor_id WHERE entitlement_id=? ORDER BY revision DESC LOCK IN SHARE MODE";
async function managedAllocations(db:PoolConnection,batchId:string){
  return (await db.execute<RowDataPacket[]>("SELECT a.*,e.scholar_id,e.semester_id,e.scholar_semester_id FROM payroll_allocations a JOIN semester_entitlements e ON e.id=a.entitlement_id WHERE a.batch_id=? UNION ALL SELECT a.*,e.scholar_id,e.semester_id,e.scholar_semester_id FROM payroll_reprocessing_attempts t JOIN payroll_reprocessing q ON q.id=t.reprocessing_id JOIN payroll_allocations a ON a.entitlement_id=q.entitlement_id JOIN semester_entitlements e ON e.id=a.entitlement_id WHERE t.batch_id=? ORDER BY scholarship_id", [batchId,batchId]))[0];
}
/** Full reservation membership remains a separate invariant even when checking
 * current release findings for just one scholar. Preserve duplicates for the
 * caller's cardinality check. */
export async function managedAllocationIds(db:PoolConnection,batchId:string){
  return (await managedAllocations(db,batchId)).map(a=>String(a.scholarship_id));
}
export async function managedRelease(db: PoolConnection, batchId: string, scholarshipId?:string|readonly string[]): Promise<ReleaseEntry[] | null> {
  const [[managed]] = await db.execute<RowDataPacket[]>("SELECT batch_id FROM payroll_submission_windows WHERE batch_id=?", [batchId]);

  const allocations = await managedAllocations(db,batchId);
  if (!managed && !allocations.length) return null;
  const payments = await paymentRecords(db, batchId), result: ReleaseEntry[] = [];
  const selected=scholarshipId ? new Set(typeof scholarshipId === "string" ? [scholarshipId] : scholarshipId) : null;
  const scoped=allocations.filter(a=>!selected||selected.has(a.scholarship_id)),individualBySemester=new Map<string,Awaited<ReturnType<typeof individualClaims>>>();
  const [[batch]]=managed?await db.execute<RowDataPacket[]>('SELECT cycle_id FROM ovr_batches WHERE id=?',[batchId]):[[]];
  const historical=batch?await historicalBatch(db,String(batch.cycle_id),batchId):undefined;
  const cycle=historical?.bound?await currentPayout(db,String(batch!.cycle_id)):null;
  if(cycle)db=await cohortReads(db,cycle.academicYearId,cycle.semesterId,cycle.id,scoped.map(a=>String(a.scholarship_id)));
  for(const semester of new Set(scoped.map(a=>String(a.semester_id))))individualBySemester.set(semester,await individualClaims(db,scoped.filter(a=>a.semester_id===semester).map(a=>String(a.scholarship_id)),semester));
  for (const a of scoped) {
    const reasons: string[] = [];
    const [events] = await db.execute<RowDataPacket[]>(managedEntitlementEventsSql, [a.entitlement_id]);
    const hold = events.map(e => decode<{ releaseHold?: boolean }>(e.snapshot)).find(e => typeof e.releaseHold === "boolean");
    const held = hold?.releaseHold === true;
    let evidence: unknown = null;
    try {
      const ctx = await loadSemesterCompliance(db, a.scholar_id, a.semester_id, true), { view } = ctx;
      if(historical?.bound&&cycle){
        const pin=await historicalMember(db,cycle.id,batchId,ctx.owner.id),{official}=await officialMembership(db,cycle,String(a.scholarship_id)),prior=view.priorApproval;
        if(!await historicalSourceCurrent(db,cycle.id,batchId,cycle.semesterId)||!pin||pin.scholarId!==a.scholar_id||pin.scholarshipId!==a.scholarship_id||!prior?.valid||prior.importId!==historical.importId||prior.id!==pin.approvalId||prior.revision!==pin.approvalRevision||prior.sourceHash!==pin.sourceHash||!official.valid||official.masterlistId!==pin.masterlistId||official.snapshotHash!==pin.publicationHash||official.version!==pin.publicationVersion)reasons.push('The historical payroll source, prior approval or annual membership changed. Coordinator source review is required before release.');
      }
      evidence = { hash: view.sourceHash, revision: view.revision, findings: view.history[0]?.findings };
      // Compare
      // the retained assessment with current immutable evidence, not write access.
      const [[review]] = await db.execute<RowDataPacket[]>("SELECT source_snapshot FROM semester_review_events WHERE scholar_semester_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE", [a.scholar_semester_id]);
      const recorded = review ? decode<{ source: typeof ctx.source }>(review.source_snapshot).source : null;
      const [[person]] = await db.execute<RowDataPacket[]>("SELECT version FROM scholars WHERE id=?", [a.scholar_id]);
      const lockedOrExpired = Boolean(ctx.scope.locked_at || ctx.scope.year_locked || ctx.scope.archived_at || ctx.scope.year_archived || !ctx.source.available || !view.gradingRule);
      const stableHistorical = lockedOrExpired && recorded && ctx.scope.mode === "enabled" && view.history[0]?.result === "compliant" && view.unresolvedFindings.length === 0 &&
        ["ownerId", "scopeId", "documentPolicyId", "semesterRevision", "placement", "category", "participation"].every(k => JSON.stringify(recorded[k as keyof typeof recorded]) === JSON.stringify(ctx.source[k as keyof typeof ctx.source])) &&
        recorded.period.id === ctx.source.period.id && recorded.period.starts === ctx.source.period.starts && recorded.period.ends === ctx.source.period.ends &&
        recorded.gradingRule?.id === ctx.policyRow?.id && view.documents.length === 2 && view.documents.every(d => {
          const old = recorded.documents.find(v => v.id === d.id);
          return d.verified && old?.verified && d.status === "verified" && d.version === old.version && d.eventId === old.eventId && d.coverageId === old.coverageId && old.context?.scholarVersion === person.version;
        });
      if (!stableHistorical && (view.stale || view.result !== "compliant" || view.unresolvedFindings.length)) reasons.push(...view.blockers, "Current academic compliance requires Coordinator review before release.");
      if (!stableHistorical && (view.documents.length !== 2 || view.documents.some(d => !d.verified))) reasons.push("Current COR and COG must remain verified.");
    } catch (e) { if (!(e instanceof AuthError)) throw e; reasons.push(e.message); }
    const graduation = await graduationFor(db, a.scholar_id);
    const [standing] = await db.execute<RowDataPacket[]>("SELECT operational_status,status_version,DATE_FORMAT(status_effective_on,'%Y-%m-%d') AS day FROM scholarship_records WHERE scholar_id=? AND operational_status IS NOT NULL ORDER BY status_effective_on DESC LOCK IN SHARE MODE", [a.scholar_id]);
    const latest = standing.filter(s => s.day === standing[0]?.day);
    if (!latest.length || latest.some(s => s.operational_status !== "active" && !(s.operational_status === "graduated" && graduation?.semesterId === a.semester_id))) reasons.push("Scholarship standing requires authorized review. Earlier benefits remain reserved; they are not cancelled.");
    const p = payments.find(p => p.scholarshipId === a.scholarship_id);
    const individual=individualBySemester.get(a.semester_id)?.attempts.get(a.scholarship_id)?.find(p=>p.outcome==='paid'&&p.amount==='5000.00');
    const sourceHash = digest(JSON.stringify({ evidence, standing, graduation, eventRevision: events[0]?.revision, payment: p ?? null,...(individual?{individualSettlement:individual}:{}) }));
    result.push({ scholarshipId: a.scholarship_id, entitlementId: a.entitlement_id, held, reasons: [...new Set(reasons)], sourceHash,...(individual?{individualSettlement:{paymentId:individual.id,transactionId:individual.individualTransactionId,actualPaidOn:individual.effectiveOn}}:{}),
      state: individual||p?.outcome === "paid" && p.amount === "5000.00" ? "released" : held || reasons.length ? "withheld" : p?.outcome === "not_paid" && p.unpaidReason === "did_not_claim" ? "unclaimed" : p?.outcome === "not_paid" ? "withheld" : "approved_for_release",
      history: events.map(e => ({ action: String(e.action), reason: String(e.reason), reference: decode<{ reference?: string }>(e.snapshot).reference ?? null, actor: String(e.full_name), recordedAt: new Date(e.recorded_at).toISOString() })) });
  }
  return result;
}
export async function checkManagedPayment(db: PoolConnection, batchId: string, scholarshipId: string, outcome: string, amount: string) {
  const entries = await managedRelease(db, batchId, scholarshipId);
  if (!entries) return null;
  const entry = entries.find(e => e.scholarshipId === scholarshipId);
  if (!entry) {
    const [[legacy]] = await db.execute<RowDataPacket[]>("SELECT t.reprocessing_id FROM payroll_reprocessing_attempts t JOIN payroll_reprocessing q ON q.id=t.reprocessing_id WHERE t.batch_id=? AND t.scholarship_id=? AND q.entitlement_id IS NULL", [batchId,scholarshipId]);
    if (legacy) return null;
    throw new AuthError(409, "PAYROLL_ALLOCATION_REQUIRED", "A matching frozen semester allocation is required.");
  }
  validateManagedOutcome(entry,outcome,amount);
  return entry;
}
export function validateManagedOutcome(entry: ReleaseEntry, outcome: string, amount: string) {
  if (outcome === "paid") {
    if (amount !== "5000.00") throw new AuthError(422, "FULL_STIPEND_REQUIRED", "Record the full PHP 5,000 stipend; partial payments are not authorized.");
    if (entry.held || entry.reasons.length) throw new AuthError(409, "PAYROLL_ENTRY_WITHHELD", "Payment is held for review. Resolve the recorded restrictions and any Coordinator hold before recording actual receipt.", { reasons: entry.reasons });
  }
}
export async function entitlementEvent(db: PoolConnection, entry: ReleaseEntry, actor: string, action: "withheld" | "approved" | "unclaimed" | "correction", reason: string, snapshot: object) {
  const [[allocation]] = await db.execute<RowDataPacket[]>("SELECT e.scholar_semester_id,v.review_event_id,v.authority_version_id FROM payroll_allocations a JOIN semester_entitlements e ON e.id=a.entitlement_id JOIN semester_entitlement_events v ON v.id=a.approved_event_id WHERE a.entitlement_id=?", [entry.entitlementId]);
  const [[latest]] = await db.execute<RowDataPacket[]>("SELECT revision FROM semester_entitlement_events WHERE entitlement_id=? ORDER BY revision DESC LIMIT 1 FOR UPDATE", [entry.entitlementId]);
  await db.execute("INSERT INTO semester_entitlement_events(id,entitlement_id,scholar_semester_id,revision,action,review_event_id,authority_version_id,snapshot,reason,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [randomUUID(), entry.entitlementId, allocation.scholar_semester_id, Number(latest.revision)+1, action, allocation.review_event_id, allocation.authority_version_id, JSON.stringify({ ...snapshot, sourceHash: entry.sourceHash }), reason, actor]);
}
export type ReleaseLinkSource={existingPaymentId:string|null;approvedEventId:string};
export async function linkManagedOutcome(db: PoolConnection, entry: ReleaseEntry, paymentId: string, actor: string, evidence: object, source?:ReleaseLinkSource) {
  const [[existing]] = source ? [[source.existingPaymentId ? {payment_id:source.existingPaymentId}:null]] : await db.execute<RowDataPacket[]>("SELECT payment_id FROM entitlement_release_links WHERE entitlement_id=?", [entry.entitlementId]);
  // Keep the original immutable release link; effective corrections and later attempts remain in payment history.
  if (existing) return;
  const [[a]] = source ? [[{approved_event_id:source.approvedEventId}]] : await db.execute<RowDataPacket[]>("SELECT approved_event_id FROM payroll_allocations WHERE entitlement_id=?", [entry.entitlementId]);
  await db.execute("INSERT INTO entitlement_release_links(entitlement_id,payment_id,approved_event_id,release_evidence,actor_id,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [entry.entitlementId, paymentId, a.approved_event_id, JSON.stringify(evidence), actor]);
}
