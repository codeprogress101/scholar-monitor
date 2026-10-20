import { effectiveSemesterInstances } from "../requirements/reused-source.js";
import { documentPolicy } from "../requirements/semester-policy.js";
import { academicCurrent } from "../academic/changes-service.js";
import type { OfficialSnapshot } from "../masterlists/workflow-model.js";
import { payrollYear, type PayrollRow } from "../ovr/payroll-form.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import { loadSemesterCompliance } from "../continuing/semester-compliance.js";
import { loadRequirementTiming } from "../requirements/timing-service.js";
import { today } from "../scholars/validation.js";
import type { EligibilityReason, EligibilitySources } from "./model.js";

export type SemesterPayrollSources = {
  formRow?: PayrollRow;
  ownerId: string | null; reviewId: string | null; authorityId: string | null;
  complianceHash: string | null; batchId: string | null; amountCentavos: 500000;
  reasons: EligibilityReason[]; onTimeSubmission: boolean; allocated: boolean;
  priorApproval?: import("../requirements/prior-approval-source.js").PriorApproval;
  timing: { instanceId: string; sourceHash: string; status: string; decisionRevision: number }[];
};
/** Extend the existing authoritative assessment; never writes eligibility or payment. */
export async function semesterSources(db: PoolConnection, s: EligibilitySources, batchId?: string): Promise<SemesterPayrollSources | undefined> {
  const [[mapped]] = await db.execute<RowDataPacket[]>("SELECT cycle_id FROM regular_payout_periods WHERE cycle_id=? LOCK IN SHARE MODE", [s.cycle.id]);
  if (!mapped) return undefined;
  const result: SemesterPayrollSources = { ownerId: null, reviewId: null, authorityId: null, complianceHash: null, batchId: batchId ?? null, amountCentavos: 500000, reasons: [], onTimeSubmission: false, allocated: false, timing: [] };
  const add = (code: string, message: string) => result.reasons.push({ code, message });
  const [[historical]] = await db.execute<RowDataPacket[]>("SELECT batch_id,import_job_id FROM historical_payout_setups WHERE cycle_id=? ORDER BY revision DESC LIMIT 1",[s.cycle.id]);
  if(!batchId && historical)batchId=historical.batch_id;
  result.batchId=batchId??null;
  if (!batchId) add("BATCH_REVIEW_REQUIRED", "Open a numbered payroll batch to assess its cutoff.");
  try {
    const c = await loadSemesterCompliance(db, s.scholarship.scholarId, s.cycle.semesterId), v = c.view;
    if(v.priorApproval?.valid)result.priorApproval=v.priorApproval;
    if(historical && (!v.priorApproval?.valid || v.priorApproval.importId!==historical.import_job_id || batchId!==historical.batch_id))add("HISTORICAL_BATCH_APPROVAL_REQUIRED","This historical batch requires current prior approval for the same confirmed import.");
    const [[academic]] = await db.execute<RowDataPacket[]>("SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=? LOCK IN SHARE MODE", [s.scholarship.scholarId, s.cycle.academicYearId]);
    const placement = academic ? (await academicCurrent(db, academic.id)).placement : null;
    const year = placement ? payrollYear(placement.yearLevel) : null;
    if (!year || !placement) add("PAYROLL_PLACEMENT_REQUIRED", "Record a current school/course and a year level from I through V supported by the supplied form.");
    else {
      const [[person]] = await db.execute<RowDataPacket[]>("SELECT first_name,middle_name,last_name,suffix FROM scholars WHERE id=? LOCK IN SHARE MODE", [s.scholarship.scholarId]);
      const [[publication]] = await db.execute<RowDataPacket[]>("SELECT snapshot FROM masterlist_publications WHERE masterlist_id=? LOCK IN SHARE MODE", [s.official.masterlistId]);
      const published: OfficialSnapshot | null = publication ? (typeof publication.snapshot === "string" ? JSON.parse(publication.snapshot) : publication.snapshot) : null;
      result.formRow = { scholarshipId: s.scholarship.id, scholarId: s.scholarship.scholarId, humanId: s.scholarship.humanId, awardNumber: published?.entries.find(e => e.snapshot.scholarshipId === s.scholarship.id)?.awardNumber ?? "", lastName: [person.last_name,person.suffix].filter(Boolean).join(" "), firstName: person.first_name, middleName: person.middle_name ?? "", school: placement.school.name, course: placement.course.name, yearLevel: year, amountCentavos: 500000 };
    }
    result.ownerId = c.owner.id; result.reviewId = v.history[0]?.id ?? null; result.complianceHash = v.sourceHash;
    const [[policy]] = await db.execute<RowDataPacket[]>("SELECT authority_version_id FROM workflow_policy_versions WHERE id=? LOCK IN SHARE MODE", [c.scope.policy_version_id]);
    result.authorityId = policy?.authority_version_id ?? null;
    if(v.priorApproval?.valid)result.authorityId=v.priorApproval.authorityId;
    if (!c.source.available || c.scope.starts > today() || s.cycle.periodUnavailable || s.cycle.state !== "open") add("SEMESTER_UNAVAILABLE", "Semester receiving and payout must be open and available.");
    if (v.category !== "degree") add("DEGREE_POLICY_REQUIRED", "This payroll supports the approved full PHP 5,000 degree stipend; record a degree program category.");
    if (!v.history[0] || v.stale || v.result !== "compliant") add("ACADEMIC_COMPLIANCE_REQUIRED", v.blockers.join(" ") || "Review the semester academic findings; a current Compliant result is required.");
    if (v.unresolvedFindings.length) add("ADVERSE_FINDING_UNRESOLVED", "Resolve recorded failed/dropped findings through the authorized decision process.");
    if (v.history[0]?.academicOnly || (v.ended && !(historical && v.priorApproval?.valid))) add("ENDED_SEMESTER_REVIEW", "An ended-semester academic review cannot authorize a new retroactive allocation.");
    const [[checklist]] = await db.execute<RowDataPacket[]>("SELECT id,DATE_FORMAT(policy_date,'%Y-%m-%d') AS policy_date FROM requirement_checklists WHERE scholar_semester_id=? LOCK IN SHARE MODE", [c.owner.id]);
    s.checklist = checklist ? { id: checklist.id, policyDate: checklist.policy_date, cycleVersionId: s.cycle.versionId } : null;
    // Preserve all configured obligations. Match only the explicitly covered definition.
    const instances = await effectiveSemesterInstances(db, c.owner.id);
    if (c.sharedDocuments.unresolved.length) add("DOCUMENT_RECONCILIATION_REQUIRED", "Needs reconciliation: open the scholar's Documents workspace to review both histories.");
    const sharedPolicy = documentPolicy(c.scope.rules);
    if (sharedPolicy.version === 2) {
      for (const d of c.sharedDocuments.documents) if (!s.requirements.some(r => r.definitionVersionId === d.definitionVersionId)) {
        const [[definition]] = await db.execute<RowDataPacket[]>("SELECT v.revision,d.code FROM requirement_definition_versions v JOIN requirement_definitions d ON d.id=v.definition_id WHERE v.id=?", [d.definitionVersionId]);
        s.requirements.push({ definitionVersionId: d.definitionVersionId, code: definition.code, policyRevision: definition.revision, allowWaiver: false, instanceId: null, version: 0, status: null, latestEventId: null, satisfied: false });
      }
    }
    for (const rule of s.requirements) {
      const direct = instances.find(i => i.definition_version_id === rule.definitionVersionId);
      const old = c.sharedDocuments.legacy.filter(d => d.definitionVersionId === rule.definitionVersionId && (!d.cycleId || d.cycleId === s.cycle.id));
      const links = c.sharedDocuments.links.filter(l => l.valid && (l.reused || l.sourceId !== l.legacyId) && old.some(d => d.id === l.legacyId));
      const sourceIds = [...new Set(links.map(l => l.sourceId))];
      const instanceId = direct?.id ?? (sourceIds.length === 1 ? sourceIds[0] : null);
      const doc = v.documents.find(d => d.id === instanceId);
      // Other payout obligations keep their own existing assessment; a shared source
      // can replace one only after an explicit Coordinator reconciliation.
      if (instanceId) Object.assign(rule, { instanceId, version: doc?.version ?? 0, status: doc?.status ?? null, latestEventId: doc?.eventId ?? null, satisfied: Boolean(doc?.verified || doc?.notRequired), ...(doc?.notRequired ? {documentException:doc.context?.entrantCard} : {}) });
    }
    for (const d of v.documents) {
      if(d.notRequired) continue;
      if (!d.verified) add("COVERED_DOCUMENT_UNVERIFIED", `${d.kind?.toUpperCase() ?? "Document"}: verify its current identity, placement and semester coverage.`);
      const timing = await loadRequirementTiming(db, d.id), w = timing.windows.find(w => w.batchId === batchId);
      if (w) {
        result.timing.push({ instanceId: d.id, sourceHash: w.sourceHash, status: w.status, decisionRevision: w.decisionRevision });
        if (timing.receipt.current && timing.receipt.current.receivedOn <= w.cutoffOn) result.onTimeSubmission = true;
      }
      if (!w?.timingSatisfied) add("RECEIPT_TIMING_REQUIRED", `${d.kind?.toUpperCase() ?? "Document"}: ${timing.issue ?? w?.message ?? "batch timing unavailable"}`);
    }
  } catch (e) {
    if (!(e instanceof AuthError)) throw e;
    add(e.code, e.message);
  }
  const [standing] = await db.execute<RowDataPacket[]>("SELECT operational_status AS status,DATE_FORMAT(status_effective_on,'%Y-%m-%d') AS day FROM scholarship_records WHERE scholar_id=? AND operational_status IS NOT NULL ORDER BY status_effective_on DESC LOCK IN SHARE MODE", [s.scholarship.scholarId]);
  if (standing.some(r => !r.day || r.day > today()) || standing.filter(r => r.day === standing[0]?.day).some(r => r.status !== "active" && !(r.status === "graduated" && s.finalSemesterGraduation?.semesterId === s.cycle.semesterId))) add("STANDING_REVIEW_REQUIRED", "Current scholarship standing requires an authorized review.");
  const [allocations] = await db.execute<RowDataPacket[]>("SELECT e.id,a.batch_id FROM semester_entitlements e LEFT JOIN payroll_allocations a ON a.entitlement_id=e.id WHERE e.scholar_id=? AND e.semester_id=? LOCK IN SHARE MODE", [s.scholarship.scholarId, s.cycle.semesterId]);
  if (allocations.some(r => r.batch_id !== batchId)) { result.allocated = true; add("SEMESTER_ALREADY_ALLOCATED", "An ordinary entitlement already exists for this scholar and semester."); }
  // Old payments/finalizations also reserve the semester even without a new allocation link.
  const [legacy] = await db.execute<RowDataPacket[]>("SELECT DISTINCT b.id FROM ovr_batches b JOIN payout_cycles p ON p.id=b.cycle_id JOIN ovr_entries e ON e.batch_id=b.id JOIN scholarship_records r ON r.id=e.scholarship_id WHERE p.semester_id=? AND r.scholar_id=? AND b.id<>? AND (EXISTS(SELECT 1 FROM ovr_finalizations f WHERE f.batch_id=b.id) OR EXISTS(SELECT 1 FROM payment_records paid WHERE paid.batch_id=b.id AND paid.scholarship_id=r.id)) AND e.action='add' LOCK IN SHARE MODE", [s.cycle.semesterId, s.scholarship.scholarId, batchId ?? ""]);
  if (legacy.length) { result.allocated = true; add("EXISTING_PAYROLL_ALLOCATION", "Existing finalized payroll/payment history reserves this semester; reconcile it before another allocation."); }
  return result;
}
