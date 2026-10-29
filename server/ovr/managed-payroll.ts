import {cutoffPolicy, utcMicroseconds} from "../payouts/cutoff-policy.js";
import {cutoffEvidenceColumns,recordedWindowTiming} from "../payouts/cutoff-source.js";
import { currentSignatories } from "../configuration/payroll-signatories.js";
import { claimDeadline, draftDeferral, retryCandidates, semesterClaim } from "./reprocessing.js";
import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { digest } from "../auth/crypto.js";
import { AuthError } from "../auth/service.js";
import { eligibilityView } from "../eligibility/service.js";
import type { PayoutCycle } from "../payouts/model.js";
import type { OvrBatch, OvrEntry, OvrFinalization } from "./model.js";
import { ovrEvidence, ovrEligibilityIssues } from "./rules.js";
import { type PayrollForm } from "./payroll-form.js";
import { cohortReads } from "../eligibility/cohort-reads.js";
import { currentPayrollTemplate } from "./payroll-form.js";
import { candidateReads } from "./candidate-reads.js";
import {preparationState} from '../payouts/preparation.js';
import {historicalRoster} from '../payouts/historical-context.js';

export async function managedCandidates(db: PoolConnection, batch: OvrBatch, cycle: PayoutCycle, annualIds?: readonly string[]) {
  const [[window]] = await db.execute<RowDataPacket[]>(`SELECT w.batch_number,v.revision,${cutoffEvidenceColumns()},DATE_FORMAT(v.opens_on,'%Y-%m-%d') AS opens,DATE_FORMAT(v.cutoff_on,'%Y-%m-%d') AS cutoff,p.term_number,y.code AS year FROM payroll_submission_windows w JOIN payroll_submission_window_versions v ON v.batch_id=w.batch_id JOIN regular_payout_periods p ON p.cycle_id=w.cycle_id JOIN academic_years y ON y.id=p.academic_year_id WHERE w.batch_id=? ORDER BY v.revision DESC LIMIT 1 LOCK IN SHARE MODE`, [batch.id]);
  if (!window) return null;
  const selected = annualIds ? ` AND id IN (${annualIds.length ? annualIds.map(() => "?").join(",") : "NULL"})` : "";
  const historical=await historicalRoster(db,cycle.id,batch.id),scope=historical?` AND scholar_id IN (${historical.map(()=>'?').join(',')})`:'';
  const [records] = await db.execute<RowDataPacket[]>(`SELECT id FROM scholarship_records WHERE academic_year_id=?${selected}${scope} ORDER BY id LOCK IN SHARE MODE`, [cycle.academicYearId, ...annualIds ?? [],...historical??[]]);
  db = await cohortReads(await candidateReads(db, records.map(r => String(r.id)), cycle.semesterId, false), cycle.academicYearId, cycle.semesterId, cycle.id, annualIds);
  const [[clock]] = await db.query<RowDataPacket[]>("SELECT DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR),'%Y-%m-%d') AS day,DATE_FORMAT(UTC_TIMESTAMP(6),'%Y-%m-%dT%H:%i:%s.%fZ') AS now");
  const policy=cutoffPolicy(window.cutoffPolicy),timing=await recordedWindowTiming(db,cycle.id,{...window,cutoffOn:String(window.cutoff),cutoffPolicy:policy});
  const items = [];
  for (const r of records) {
    const view = await eligibilityView(db, cycle, r.id, batch.id), issues = ovrEligibilityIssues(view), evidence = ovrEvidence(view), sources = view.current.sources.semesterPayroll!;
    const claim = await semesterClaim(db, r.id, cycle.semesterId);
    if (claim.paid) issues.push({code:"STIPEND_ALREADY_PAID",message:"Paid this semester"});
    if (claim.pending.length) issues.push({code:"PAYMENT_CORRECTION_PENDING",message:"Resolve the pending payment correction before release."});
    const deferral = await draftDeferral(db, batch.id, r.id);
    if ((await claimDeadline(db, cycle.semesterId)).expired) issues.push({code:"CLAIM_PERIOD_ENDED",message:"The semester claim period has ended."});
    const eligible = issues.length === 0;
    const pending = !eligible && !sources.allocated && (sources.onTimeSubmission || sources.receiptTimeUnresolved===true) && !deferral?.current;
    items.push({ scholarshipId: String(r.id), evidence, eligible, pending, deferred: deferral, issues, row: sources.formRow ?? null });
  }
  const positions = new Map(items.map((item, index) => [item.scholarshipId, index]));
  for (const retry of historical?[]:await retryCandidates(db, batch, cycle, annualIds)) {
    const index = positions.get(retry.scholarshipId) ?? -1;
    const item = {scholarshipId:retry.scholarshipId, evidence:retry.evidence, eligible:true, pending:false, deferred:await draftDeferral(db,batch.id,retry.scholarshipId), issues:[], row:retry.row};
    if (index < 0) { positions.set(retry.scholarshipId, items.length); items.push(item); } else items[index] = item;
  }
  const signatoryConfig = await currentSignatories(db);
  const preparation=await preparationState(db,cycle.id);
  const sourceHash = digest(JSON.stringify({ template: currentPayrollTemplate, signatoryConfig, window: { revision: window.revision, opens: window.opens, cutoff: window.cutoff, ...(policy === "whole_day_v1" ? {} : timing) }, items: items.map(i => ({ id: i.scholarshipId, fingerprint: i.evidence.fingerprint, deferral: i.deferred })),...(preparation.revision?{preparation}: {}) }));
  const form: PayrollForm = { template: currentPayrollTemplate, year: String(window.year).replace(/^AY\s*/i, ""), term: Number(window.term_number), batchNumber: Number(window.batch_number), rows: items.filter(i => i.eligible && !i.deferred?.current).map(i => i.row!).sort((a,b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName) || a.scholarId.localeCompare(b.scholarId)), ...signatoryConfig };
  return { sourceHash, items, form, cutoffOn: String(window.cutoff), opensOn: String(window.opens), cutoffPolicy:policy,cutoffLocalTime:timing.cutoffLocalTime,cutoffAtUtc:timing.cutoffAtUtc,finalizationFromUtc:timing.finalizationFromUtc, cutoffReached:utcMicroseconds(String(clock.now))>=utcMicroseconds(timing.finalizationFromUtc), opened: clock.day >= window.opens, pendingCount: items.filter(i => i.pending).length };
}
export type ManagedCandidates = NonNullable<Awaited<ReturnType<typeof managedCandidates>>>;

export async function allocatePayroll(db: PoolConnection, frozen: OvrFinalization, actor: string) {
  for (const entry of frozen.entries) {
    if (entry.evidence.reprocessing) continue;
    const reusable=entry.evidence.current.sources.omission?.entitlementId??undefined;
    const {id,event}=await approveSemesterEntitlement(db,entry.evidence,actor,{batchId:frozen.batchId,finalizationRevision:frozen.revision,evidence:entry.evidence},'Coordinator finalized ordinary semester payroll',reusable);
    await db.execute("INSERT INTO payroll_allocations(entitlement_id,batch_id,scholarship_id,approved_event_id,actor_id,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [id, frozen.batchId, entry.scholarshipId, event, actor]);
  }
}

/** One entitlement writer for fresh Coordinator payroll/omission approval. The
 * caller validates the current route under the existing configuration guard. */
export async function approveSemesterEntitlement(db:PoolConnection,evidence:OvrEntry['evidence'],actor:string,snapshot:object,reason:string,existingId?:string){
 const s=evidence.current.sources,m=s.semesterPayroll;
 if(!m?.ownerId||!m.reviewId||!m.authorityId||!m.formRow)throw new AuthError(409,'PAYROLL_EVIDENCE_REQUIRED','Current semester evidence is required.');
 const id=existingId??randomUUID(),event=randomUUID();let revision=1;
 if(existingId){
  const [[old]]=await db.execute<RowDataPacket[]>("SELECT e.* FROM semester_entitlements e WHERE e.id=? AND e.scholar_id=? AND e.semester_id=? AND e.scholar_semester_id=? AND e.benefit_type='degree_stipend' AND e.amount_centavos=500000 AND e.currency='PHP' AND NOT EXISTS(SELECT 1 FROM payroll_allocations a WHERE a.entitlement_id=e.id) FOR UPDATE",[id,s.scholarship.scholarId,s.cycle.semesterId,m.ownerId]);
  const [[route]]=await db.execute<RowDataPacket[]>('SELECT transaction_id FROM entitlement_payment_routes WHERE entitlement_id=? AND transaction_id IS NOT NULL',[id]);
  if(!old||route||s.omission?.entitlementId!==id)throw new AuthError(409,'ENTITLEMENT_RESERVED','The existing entitlement requires financial route review.');
  const [[latest]]=await db.execute<RowDataPacket[]>('SELECT revision FROM semester_entitlement_events WHERE entitlement_id=? ORDER BY revision DESC LIMIT 1 FOR UPDATE',[id]);revision=Number(latest?.revision??0)+1;
 }else await db.execute("INSERT INTO semester_entitlements(id,scholar_semester_id,scholar_id,semester_id,benefit_type,amount_centavos,currency,actor_id,recorded_at) VALUES(?,?,?,?,'degree_stipend',500000,'PHP',?,UTC_TIMESTAMP(6))",[id,m.ownerId,s.scholarship.scholarId,s.cycle.semesterId,actor]);
 await db.execute("INSERT INTO semester_entitlement_events(id,entitlement_id,scholar_semester_id,revision,action,review_event_id,authority_version_id,snapshot,reason,actor_id,recorded_at) VALUES(?,?,?,?,'approved',?,?,?,?,?,UTC_TIMESTAMP(6))",[event,id,m.ownerId,revision,m.reviewId,m.authorityId,JSON.stringify(snapshot),reason,actor]);return {id,event};
}

export function candidateEntries(candidates: ManagedCandidates, revision: number): OvrEntry[] {
  return candidates.items.filter(i => i.eligible && !i.deferred?.current).map(i => ({ scholarshipId: i.scholarshipId, addedRevision: revision, evidence: i.evidence }));
}
