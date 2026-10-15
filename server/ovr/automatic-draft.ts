import { currentSignatories } from "../configuration/payroll-signatories.js";
import { claimDeadline, draftDeferral, retryCandidates, semesterClaim } from "./reprocessing.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { academicCurrent } from "../academic/changes-service.js";
import { digest } from "../auth/crypto.js";
import { cohortReads } from "../eligibility/cohort-reads.js";
import { eligibilityView } from "../eligibility/service.js";
import type { OfficialSnapshot } from "../masterlists/workflow-model.js";
import type { PayoutCycle } from "../payouts/model.js";
import type { OvrBatch, OvrEntry } from "./model.js";
import { payrollYear, type PayrollForm } from "./payroll-form.js";
import { ovrEligibilityIssues, ovrEvidence } from "./rules.js";

/** Live draft projection for pre-numbered payrolls. Reads never alter saved membership. */
export async function automaticDraft(db: PoolConnection, batch: OvrBatch, cycle: PayoutCycle) {
  if (batch.state !== "draft" && !(batch.state === "review" && batch.automaticSourceHash)) return null;
  if (cycle.state !== "open" || cycle.periodUnavailable) return null;
  const [windows] = await db.execute<RowDataPacket[]>("SELECT batch_id FROM payroll_submission_windows WHERE batch_id=?", [batch.id]);
  if (windows.length) return null;
  const [semesters] = await db.execute<RowDataPacket[]>("SELECT id FROM semesters WHERE academic_year_id=? ORDER BY starts_on,id", [cycle.academicYearId]);
  const term = semesters.findIndex(s => s.id === cycle.semesterId) + 1;
  if (term < 1 || term > 2) return null;
  const [batches] = await db.execute<RowDataPacket[]>("SELECT id FROM ovr_batches WHERE cycle_id=? ORDER BY created_at,id", [cycle.id]);
  const [reserved] = await db.execute<RowDataPacket[]>("SELECT e.batch_id,e.scholarship_id,e.action FROM ovr_entries e JOIN ovr_batches b ON b.id=e.batch_id WHERE b.cycle_id=? AND b.id<>? ORDER BY e.batch_revision DESC", [cycle.id, batch.id]);
  const seen = new Set<string>(), assigned = new Set<string>();
  for (const r of reserved) {
    const key = `${r.batch_id}:${r.scholarship_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (r.action === "add") assigned.add(r.scholarship_id);
  }
  const [records] = await db.execute<RowDataPacket[]>("SELECT r.id,r.scholar_id,a.id AS academic_id,s.first_name,s.middle_name,s.last_name,s.suffix FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id LEFT JOIN academic_records a ON a.scholar_id=r.scholar_id AND a.academic_year_id=r.academic_year_id WHERE r.academic_year_id=? ORDER BY s.last_name,s.first_name,r.id", [cycle.academicYearId]);
  db = await cohortReads(db, cycle.academicYearId, cycle.semesterId, cycle.id);
  const entries: OvrEntry[] = [];
  const form: PayrollForm = { template: "daet-sample-v1", year: cycle.yearCode.replace(/^AY\s*/i, ""), term, batchNumber: batches.findIndex(b => b.id === batch.id) + 1, rows: [], ...await currentSignatories(db) };
  const expired = (await claimDeadline(db, cycle.semesterId)).expired;
  for (const r of records) {
    if (expired || (await draftDeferral(db, batch.id, r.id))?.current) continue;
    if (assigned.has(r.id) || !r.academic_id) continue;
    const claim = await semesterClaim(db, r.id, cycle.semesterId);
    if (claim.paid || claim.pending.length) continue;
    const view = await eligibilityView(db, cycle, r.id, batch.id);
    if (ovrEligibilityIssues(view).length) continue;
    const { placement } = await academicCurrent(db, r.academic_id);
    const yearLevel = payrollYear(placement.yearLevel);
    if (!yearLevel) continue;
    const [[publication]] = await db.execute<RowDataPacket[]>("SELECT snapshot FROM masterlist_publications WHERE masterlist_id=?", [view.current.sources.official.masterlistId]);
    const published: OfficialSnapshot | null = publication ? (typeof publication.snapshot === "string" ? JSON.parse(publication.snapshot) : publication.snapshot) : null;
    entries.push({ scholarshipId: r.id, addedRevision: batch.revision, evidence: ovrEvidence(view) });
    form.rows.push({ scholarshipId: r.id, scholarId: r.scholar_id, humanId: view.current.sources.scholarship.humanId, awardNumber: published?.entries.find(e => e.snapshot.scholarshipId === r.id)?.awardNumber ?? "", lastName: [r.last_name,r.suffix].filter(Boolean).join(" "), firstName: r.first_name, middleName: r.middle_name ?? "", school: placement.school.name, course: placement.course.name, yearLevel, amountCentavos: 500000 });
  }
  for (const retry of await retryCandidates(db, batch, cycle)) {
    if (entries.some(e => e.scholarshipId === retry.scholarshipId)) continue;
    entries.push({scholarshipId:retry.scholarshipId, addedRevision:batch.revision, evidence:retry.evidence});
    form.rows.push(retry.row!);
  }
  return { entries, form, sourceHash: digest(JSON.stringify({ entries: entries.map(e => ({ id: e.scholarshipId, fingerprint: e.evidence.fingerprint })), form })) };
}
export type AutomaticDraft = NonNullable<Awaited<ReturnType<typeof automaticDraft>>>;
