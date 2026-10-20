import { rolloverAdmission } from "../masterlists/continuing-admission.js";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId } from "../configuration/validation.js";
import { today } from "../scholars/validation.js";
import { loadSemesterCompliance } from "./semester-compliance.js";
import { assessSemesterEligibility, type SemesterEligibilitySources } from "./semester-eligibility-engine.js";
import { currentPayout } from "../payouts/service.js";
import { eligibilityView } from "../eligibility/service.js";

export class SemesterEligibilityPreviewService {
  private authorization: AuthorizationService;
  constructor(pool: Pool | undefined) { this.authorization = new AuthorizationService(pool); }
  read(actor: string, rawScholar: string, rawSemester: string, rawQuery: unknown) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester), query = z.object({ cycleId: z.uuid().optional() }).strict().safeParse(rawQuery);
    if (!query.success) throw new AuthError(422, "VALIDATION_FAILED", "Choose a payout cycle from this semester, or leave it blank.");
    return this.authorization.withPermission(actor, "scholars.read", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const ctx = await loadSemesterCompliance(db, scholar, semester), { view } = ctx;
      const [[participation]] = await db.execute<RowDataPacket[]>("SELECT p.id,p.entry_basis,e.id AS event_id,e.revision,e.action FROM participations p JOIN participation_events e ON e.participation_id=p.id WHERE p.id=? ORDER BY e.revision DESC LIMIT 1 LOCK IN SHARE MODE", [ctx.owner.participation_id]);
      if (!participation) throw new AuthError(409, "PARTICIPATION_REVIEW_REQUIRED", "Participation history is unavailable.");
      const [annuals] = await db.execute<RowDataPacket[]>("SELECT id,academic_year_id,operational_status,status_version,DATE_FORMAT(status_effective_on,'%Y-%m-%d') AS effective_on FROM scholarship_records WHERE scholar_id=? ORDER BY id LOCK IN SHARE MODE", [scholar]);
      const [cycleRows] = await db.execute<RowDataPacket[]>("SELECT c.id,c.code,v.id AS version_id,v.state FROM payout_cycles c JOIN payout_cycle_versions v ON v.cycle_id=c.id WHERE c.semester_id=? AND NOT EXISTS(SELECT 1 FROM payout_cycle_versions newer WHERE newer.cycle_id=c.id AND newer.version>v.version) ORDER BY c.code,c.id LOCK IN SHARE MODE", [semester]);
      if (query.data.cycleId && !cycleRows.some((c) => c.id === query.data.cycleId)) throw new AuthError(409, "WRONG_SEMESTER", "Choose a payout cycle belonging to this receiving semester.");
      const [entitlements] = await db.execute<RowDataPacket[]>("SELECT id FROM semester_entitlements WHERE scholar_id=? AND semester_id=? ORDER BY id LOCK IN SHARE MODE", [scholar, semester]);
      const [payments] = await db.execute<RowDataPacket[]>("SELECT p.id FROM payment_records p JOIN scholarship_records r ON r.id=p.scholarship_id JOIN payout_cycles c ON c.id=p.cycle_id WHERE r.scholar_id=? AND c.semester_id=? ORDER BY p.id LOCK IN SHARE MODE", [scholar, semester]);
      const [batches] = await db.execute<RowDataPacket[]>("SELECT DISTINCT b.id FROM ovr_entries e JOIN ovr_batches b ON b.id=e.batch_id JOIN payout_cycles c ON c.id=b.cycle_id JOIN scholarship_records r ON r.id=e.scholarship_id WHERE r.scholar_id=? AND c.semester_id=? ORDER BY b.id LOCK IN SHARE MODE", [scholar, semester]);
      const sources: SemesterEligibilitySources = {
        ...(view.priorApproval?.valid?{priorApproval:view.priorApproval}:{}),
        scholarId: scholar, semesterId: semester, semesterOwnerId: ctx.owner.id, academicYearId: ctx.scope.academic_year_id,
        participation: { rollover: await rolloverAdmission(db, scholar, ctx.scope.academic_year_id), id: participation.id, basis: participation.entry_basis, eventId: participation.event_id, revision: participation.revision, action: participation.action },
        period: { starts: ctx.scope.starts, ends: ctx.scope.ends, available: ctx.source.available, asOf: today() }, category: view.category,
        compliance: { result: view.result, reviewId: view.history[0]?.id ?? null, sourceHash: view.sourceHash, stale: view.stale, academicOnly: view.history[0]?.academicOnly ?? false, unresolvedFindings: view.unresolvedFindings.length, blockers: view.blockers },
        standing: annuals.filter((r) => r.operational_status !== null).map((r) => ({ annualId: r.id, academicYearId: r.academic_year_id, status: r.operational_status, version: r.status_version, effectiveOn: r.effective_on })),
        financial: { entitlementIds: entitlements.map((r) => r.id), paymentIds: payments.map((r) => r.id), batchIds: batches.map((r) => r.id), cycles: cycleRows.map((r) => ({ id: r.id, code: r.code, state: r.state, versionId: r.version_id })) },
      };
      const proposed = assessSemesterEligibility(sources), annual = annuals.find((r) => r.academic_year_id === ctx.scope.academic_year_id);
      const selectedCycleId = query.data.cycleId ?? (cycleRows.length === 1 ? cycleRows[0].id as string : null);
      const legacy = annual && selectedCycleId ? await eligibilityView(db, await currentPayout(db, selectedCycleId), annual.id) : null;
      const comparison = legacy ? {
        kind: proposed.candidate === legacy.current.eligible ? "matches" as const : "differs" as const,
        message: "Compare the semester's initial-entitlement conditions with legacy normal and override results. Neither result here authorizes payment.",
        normalEligible: legacy.current.eligible, normalReasons: legacy.current.reasons, effective: legacy.effective,
        sourceHash: legacy.current.sourceHash, engineVersion: legacy.current.engineVersion, annualId: annual!.id,
        cycleId: selectedCycleId!, cycleState: legacy.current.sources.cycle.state, canCalculate: legacy.canCalculate,
        saved: legacy.latest ? { id: legacy.latest.id, eligible: legacy.latest.eligible, sourceHash: legacy.latest.sourceHash, calculatedAt: legacy.latest.calculatedAt, stale: legacy.stale } : null,
      } : {
        kind: "not_comparable" as const,
        message: !annual ? "This continuing scholar has no legacy annual record for this year. Accepted baseline participation is used by the new path; no admission history is invented."
          : !cycleRows.length ? "No legacy payout cycle exists for this semester." : "Select a legacy payout cycle to compare its existing calculation.",
      };
      const sourceHash = digest(JSON.stringify({ engineVersion: proposed.engineVersion, sources, comparison }));
      const [[mapped]] = await db.execute<RowDataPacket[]>("SELECT cycle_id FROM regular_payout_periods WHERE semester_id=? LOCK IN SHARE MODE", [semester]);
      return { ...proposed, sourceHash, sources, comparison, selectedCycleId, managedPayroll: Boolean(mapped) };
    });
  }
}
export type SemesterEligibilityPreview = Awaited<ReturnType<SemesterEligibilityPreviewService["read"]>>;
