import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { academicCurrent } from "../academic/changes-service.js";
import { eligibilityView } from "../eligibility/service.js";
import { ovrEligibilityIssues } from "../ovr/rules.js";
import { payrollYear } from "../ovr/payroll-form.js";
import { draftDeferral, semesterClaim, type ReprocessingItem } from "../ovr/reprocessing.js";
import type { OvrBatch } from "../ovr/model.js";
import type { PayoutCycle } from "../payouts/model.js";

export type RegistryAnnual = { id: string; scholar_id: string; academic_id: string | null };

/** Registry membership only, never a payroll form or approval fingerprint.
 * Evaluate the same managed/automatic predicates for the requested annuals.
 * The complete payroll projections remain authoritative for their commands.
 */
export function registryDrafts(db: PoolConnection, cycle: PayoutCycle, annuals: RegistryAnnual[], drafts: OvrBatch[], queues: ReprocessingItem[], expired: boolean) {
  const views = new Map<string, ReturnType<typeof eligibilityView>>();
  const viewFor = (annualId: string, batchId?: string) => {
    const key = JSON.stringify([annualId, batchId]);
    let pending = views.get(key);
    if (!pending) { pending = eligibilityView(db, cycle, annualId, batchId); views.set(key, pending); }
    return pending;
  };
  const destinations = new Map<string, OvrBatch[]>(), deferred = new Map<string, OvrBatch[]>();
  const read = async () => {
    if (!annuals.length || !drafts.length) return;
    const ids = annuals.map(a => a.id), marks = ids.map(() => "?").join(",");
    for (const batch of drafts) {
      const [[managed]] = await db.execute<RowDataPacket[]>("SELECT w.batch_id FROM payroll_submission_windows w JOIN payroll_submission_window_versions v ON v.batch_id=w.batch_id JOIN regular_payout_periods p ON p.cycle_id=w.cycle_id JOIN academic_years y ON y.id=p.academic_year_id WHERE w.batch_id=? ORDER BY v.revision DESC LIMIT 1", [batch.id]);
      const [[window]] = managed ? [[managed]] : await db.execute<RowDataPacket[]>("SELECT batch_id FROM payroll_submission_windows WHERE batch_id=?", [batch.id]);
      let automatic = false;
      const assigned = new Set<string>();
      if (!window && cycle.state === "open" && !cycle.periodUnavailable) {
        const [semesters] = await db.execute<RowDataPacket[]>("SELECT id FROM semesters WHERE academic_year_id=? ORDER BY starts_on,id", [cycle.academicYearId]);
        const term = semesters.findIndex(s => s.id === cycle.semesterId) + 1;
        automatic = term >= 1 && term <= 2;
        if (automatic) {
          const [reserved] = await db.execute<RowDataPacket[]>(`SELECT e.batch_id,e.scholarship_id,e.action FROM ovr_entries e JOIN ovr_batches b ON b.id=e.batch_id WHERE b.cycle_id=? AND b.id<>? AND e.scholarship_id IN (${marks}) ORDER BY e.batch_revision DESC`, [cycle.id,batch.id,...ids]);
          const seen = new Set<string>();
          for (const entry of reserved) {
            const key = `${entry.batch_id}:${entry.scholarship_id}`;
            if (!seen.has(key)) { seen.add(key); if (entry.action === "add") assigned.add(entry.scholarship_id); }
          }
        }
      }
      for (const annual of annuals) {
        const deferral = await draftDeferral(db,batch.id,annual.id);
        if (deferral?.current) deferred.set(annual.id,[...deferred.get(annual.id) ?? [],batch]);
        if (!managed && !automatic) continue;
        const retry = queues.some(q=>q.scholarshipId===annual.id && q.status==="assigned" && q.destinationBatchId===batch.id && q.row);
        let included = retry && (!managed || !deferral?.current);
        if (!included && !expired && !deferral?.current && (managed || (!assigned.has(annual.id) && annual.academic_id))) {
          const claim = await semesterClaim(db,annual.id,cycle.semesterId);
          if (!claim.paid && !claim.pending.length) {
            const view = await viewFor(annual.id,batch.id);
            if (!ovrEligibilityIssues(view).length) {
              included = Boolean(managed || (annual.academic_id && payrollYear((await academicCurrent(db,annual.academic_id)).placement.yearLevel)));
            }
          }
        }
        if (included) destinations.set(annual.id,[...destinations.get(annual.id) ?? [],batch]);
      }
    }
  };
  return { read, viewFor, destinations, deferred };
}
