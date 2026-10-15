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

export async function managedCandidates(db: PoolConnection, batch: OvrBatch, cycle: PayoutCycle) {
  const [[window]] = await db.execute<RowDataPacket[]>("SELECT w.batch_number,v.revision,DATE_FORMAT(v.opens_on,'%Y-%m-%d') AS opens,DATE_FORMAT(v.cutoff_on,'%Y-%m-%d') AS cutoff,p.term_number,y.code AS year FROM payroll_submission_windows w JOIN payroll_submission_window_versions v ON v.batch_id=w.batch_id JOIN regular_payout_periods p ON p.cycle_id=w.cycle_id JOIN academic_years y ON y.id=p.academic_year_id WHERE w.batch_id=? ORDER BY v.revision DESC LIMIT 1 LOCK IN SHARE MODE", [batch.id]);
  if (!window) return null;
  db = await cohortReads(db, cycle.academicYearId, cycle.semesterId, cycle.id);
  const [[clock]] = await db.query<RowDataPacket[]>("SELECT DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR),'%Y-%m-%d') AS day");
  const [records] = await db.execute<RowDataPacket[]>("SELECT id FROM scholarship_records WHERE academic_year_id=? ORDER BY id LOCK IN SHARE MODE", [cycle.academicYearId]);
  const items = [];
  for (const r of records) {
    const view = await eligibilityView(db, cycle, r.id, batch.id), issues = ovrEligibilityIssues(view), evidence = ovrEvidence(view), sources = view.current.sources.semesterPayroll!;
    const claim = await semesterClaim(db, r.id, cycle.semesterId);
    if (claim.paid) issues.push({code:"STIPEND_ALREADY_PAID",message:"Paid this semester"});
    if (claim.pending.length) issues.push({code:"PAYMENT_CORRECTION_PENDING",message:"Resolve the pending payment correction before release."});
    const deferral = await draftDeferral(db, batch.id, r.id);
    if ((await claimDeadline(db, cycle.semesterId)).expired) issues.push({code:"CLAIM_PERIOD_ENDED",message:"The semester claim period has ended."});
    const eligible = issues.length === 0;
    const pending = !eligible && !sources.allocated && sources.onTimeSubmission && !deferral?.current;
    items.push({ scholarshipId: String(r.id), evidence, eligible, pending, deferred: deferral, issues, row: sources.formRow ?? null });
  }
  for (const retry of await retryCandidates(db, batch, cycle)) {
    const index = items.findIndex(i => i.scholarshipId === retry.scholarshipId);
    const item = {scholarshipId:retry.scholarshipId, evidence:retry.evidence, eligible:true, pending:false, deferred:await draftDeferral(db,batch.id,retry.scholarshipId), issues:[], row:retry.row};
    if (index < 0) items.push(item); else items[index] = item;
  }
  const signatoryConfig = await currentSignatories(db);
  const sourceHash = digest(JSON.stringify({ signatoryConfig, window: { revision: window.revision, opens: window.opens, cutoff: window.cutoff }, items: items.map(i => ({ id: i.scholarshipId, fingerprint: i.evidence.fingerprint, deferral: i.deferred })) }));
  const form: PayrollForm = { template: "daet-sample-v1", year: String(window.year).replace(/^AY\s*/i, ""), term: Number(window.term_number), batchNumber: Number(window.batch_number), rows: items.filter(i => i.eligible && !i.deferred?.current).map(i => i.row!).sort((a,b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName) || a.scholarId.localeCompare(b.scholarId)), ...signatoryConfig };
  return { sourceHash, items, form, cutoffOn: String(window.cutoff), opensOn: String(window.opens), cutoffReached: clock.day > window.cutoff, opened: clock.day >= window.opens, pendingCount: items.filter(i => i.pending).length };
}
export type ManagedCandidates = NonNullable<Awaited<ReturnType<typeof managedCandidates>>>;

export async function allocatePayroll(db: PoolConnection, frozen: OvrFinalization, actor: string) {
  for (const entry of frozen.entries) {
    if (entry.evidence.reprocessing) continue;
    const s = entry.evidence.current.sources, m = s.semesterPayroll;
    if (!m?.ownerId || !m.reviewId || !m.authorityId || !m.formRow) throw new AuthError(409, "PAYROLL_EVIDENCE_REQUIRED", "Current semester evidence is required.");
    const id = randomUUID(), event = randomUUID();
    // The existing unique semester-benefit constraint is the final concurrency fence.
    await db.execute("INSERT INTO semester_entitlements(id,scholar_semester_id,scholar_id,semester_id,benefit_type,amount_centavos,currency,actor_id,recorded_at) VALUES(?,?,?,?,'degree_stipend',500000,'PHP',?,UTC_TIMESTAMP(6))", [id, m.ownerId, s.scholarship.scholarId, s.cycle.semesterId, actor]);
    await db.execute("INSERT INTO semester_entitlement_events(id,entitlement_id,scholar_semester_id,revision,action,review_event_id,authority_version_id,snapshot,reason,actor_id,recorded_at) VALUES(?,?,?,1,'approved',?,?,?,?,?,UTC_TIMESTAMP(6))", [event, id, m.ownerId, m.reviewId, m.authorityId, JSON.stringify({ batchId: frozen.batchId, finalizationRevision: frozen.revision, evidence: entry.evidence }), "Coordinator finalized ordinary semester payroll", actor]);
    await db.execute("INSERT INTO payroll_allocations(entitlement_id,batch_id,scholarship_id,approved_event_id,actor_id,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [id, frozen.batchId, entry.scholarshipId, event, actor]);
  }
}

export function candidateEntries(candidates: ManagedCandidates, revision: number): OvrEntry[] {
  return candidates.items.filter(i => i.eligible && !i.deferred?.current).map(i => ({ scholarshipId: i.scholarshipId, addedRevision: revision, evidence: i.evidence }));
}
