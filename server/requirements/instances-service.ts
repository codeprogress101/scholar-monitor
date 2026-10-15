import { savedVerificationContext } from "./workflow-service.js";
import { verificationMatches } from "./workflow-model.js";
import { effectiveSemesterInstances, legacyReceiptBlocker } from "./reused-source.js";
import { semesterDocumentSources } from "./semester-policy.js";
import { entrantCard, entrantCardContext } from "./entrant-grading-card.js";
import { validationDetails } from "../validation-details.js";
import { preventGraduateRenewal } from "../status/graduation.js";
import { currentReceiptEvidence } from "./receipt-evidence.js";
import { currentPayout, requireOpenPayout } from "../payouts/service.js";
import { satisfiesNormalRequirement } from "./workflow-model.js";
import { requirementState } from "./workflow-state.js";
import { randomUUID } from "node:crypto";
import { workingYear } from "../configuration/calendar.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { applicableRequirements } from "./service.js";
import { parseGeneration } from "./instances-validation.js";
import { z } from "zod";
import { today } from "../scholars/validation.js";
import type { ReceivingPeriod } from "./instances-model.js";
import type {
  RequirementChecklist,
  GenerationResult,
} from "./instances-model.js";
async function scholarship(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT r.scholar_id,r.academic_year_id,y.code,y.name,y.archived_at,y.locked_at FROM scholarship_records r JOIN academic_years y ON y.id=r.academic_year_id WHERE r.id=? LOCK IN SHARE MODE",
    [id],
  );
  if (!rows.length)
    throw new AuthError(
      404,
      "SCHOLARSHIP_NOT_FOUND",
      "Annual scholarship record not found.",
    );
  return rows[0];
}
export async function readChecklists(db: PoolConnection, rows: RowDataPacket[]): Promise<{ items: RequirementChecklist[] }> {
  const items: RequirementChecklist[] = [];
  for (const r of rows) {
    const payout = r.payout_cycle_id
      ? await currentPayout(db, r.payout_cycle_id)
      : null;
    const sourceBlocker = r.scholar_semester_id ? await legacyReceiptBlocker(db, r.scholar_semester_id) : null;
    const effective = r.scholar_semester_id ? await effectiveSemesterInstances(db, r.scholar_semester_id) : null;
    const [instances] = await db.execute<RowDataPacket[]>(
      `SELECT i.id,i.definition_version_id,i.status,p.allow_waiver,v.name,v.instructions,v.revision,d.code,r.id AS receipt_id,DATE_FORMAT(r.received_on,'%Y-%m-%d') AS received_on,r.physical_reference,r.storage_location,r.remarks,r.reason AS receipt_reason,r.actor_name AS receiver_name,DATE_FORMAT(r.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS receipt_recorded FROM requirement_instances i LEFT JOIN requirement_receipts r ON r.instance_id=i.id JOIN requirement_definition_versions v ON v.id=i.definition_version_id JOIN requirement_definitions d ON d.id=v.definition_id LEFT JOIN payout_requirements p ON p.cycle_version_id=? AND p.definition_version_id=i.definition_version_id WHERE ${effective ? "i.id IN (" + effective.map(() => "?").join(",") + ")" : "i.checklist_id=?"} ORDER BY d.code LOCK IN SHARE MODE`,
      [r.payout_version_id, ...(effective ? effective.map(i => i.id) : [r.id])],
    );
    items.push({
      id: r.id,
      payoutCycleId: r.payout_cycle_id,
      payoutVersionId: r.payout_version_id,
      payoutCode: payout?.code ?? null,
      payoutState: payout?.state ?? null,
      scholarshipRecordId: r.scholarship_record_id,
      semesterId: r.semester_id,
      policyDate: r.policy_on,
      yearCode: r.year_code,
      academicYearId: r.academic_year_id,
      yearName: r.year_name,
      semesterCode: r.semester_code,
      semesterName: r.semester_name,
      semesterVersion: r.semester_version,
      reason: r.reason,
      reference: r.reference_text,
      actorName: r.actor_name,
      createdAt: r.recorded,
      periodUnavailable: Boolean(
        r.scope_unavailable ||
        r.locked_at ||
        r.archived_at ||
        r.year_locked ||
        r.year_archived ||
        (payout && payout.state !== "open"),
      ),
      items: await Promise.all(
        instances.map(async (i) => {
          const state = await requirementState(db, i.id);
          const originalReused = Boolean(effective?.some(v => v.id === i.id && v.targetId !== i.id));
          let verificationNeedsReview = false;
          if (originalReused && state.status === "verified") {
            try { verificationNeedsReview = !verificationMatches(await savedVerificationContext(db, i.id), state.history.at(-1)?.details.verification); }
            catch (e) { if (!(e instanceof AuthError)) throw e; verificationNeedsReview = true; }
          }
          const card = r.scholar_semester_id ? await entrantCard(db,i.id) : null;
          const [document] = i.receipt_id ? await db.execute<RowDataPacket[]>("SELECT document_type FROM requirement_document_evidence WHERE receipt_id=? AND instance_id=? LOCK IN SHARE MODE", [i.receipt_id, i.id]) : [[]];
          const [coverage] = r.scholar_semester_id ? await db.execute<RowDataPacket[]>("SELECT rc.document_kind,s.name,s.academic_year_id FROM requirement_coverage rc JOIN semesters s ON s.id=rc.coverage_semester_id WHERE rc.scholar_semester_id=? AND rc.requirement_instance_id=? ORDER BY rc.revision DESC LIMIT 1 LOCK IN SHARE MODE", [r.scholar_semester_id, i.id]) : [[]];
          const exception = coverage[0]?.document_kind === 'cog' ? await entrantCardContext(db, i.id) : null;
          const firstSemesterExceptionAvailable = Boolean(exception?.firstSemester && exception.firstYear && !exception.blocker && !exception.editBlocker);
          const notRequired = Boolean(card?.decision === 'approved' && card.mode === 'initial_requirements' && exception?.firstSemester && exception.firstYear && !exception.collegeHistoryConflict);
          const receipt = i.receipt_id ? {
            id: i.receipt_id,
            ...(document[0] ? { documentType: document[0].document_type } : {}),
            receivedOn: i.received_on, physicalReference: i.physical_reference,
            storageLocation: i.storage_location, remarks: i.remarks, reason: i.receipt_reason,
            receiverName: i.receiver_name, recordedAt: i.receipt_recorded,
          } : null;
          return {
            receivingBlocked: !originalReused && state.status === "not_submitted" ? sourceBlocker : null,
            originalReused, verificationNeedsReview,
            firstSemesterExceptionAvailable,
            notRequired,
            coverageStatus: notRequired ? 'initial_requirements' as const : card?.decision==='approved' ? 'grading_card' as const : coverage[0] ? 'semester' as const : 'not_recorded' as const,
            ...(card?.decision==='approved' ? {entrantCard:card} : {}),
            ...(coverage[0] ? { coverage: { kind: coverage[0].document_kind as string, semesterName: coverage[0].name as string, academicYearId: coverage[0].academic_year_id as string } } : {}),
            id: i.id,
            definitionVersionId: i.definition_version_id,
            code: i.code,
            name: i.name,
            instructions: i.instructions,
            revision: i.revision,
            ...state,
            allowWaiver:
              i.allow_waiver === null ? true : Boolean(i.allow_waiver),
            satisfiesPayoutRequirement: payout
              ? satisfiesNormalRequirement(
                  state.status,
                  Boolean(i.allow_waiver),
                )
              : null,
            receipt,
            receiptEvidence: currentReceiptEvidence(receipt, state.history),
          };
        }),
      ),
    });
  }
  return { items };
}
export class RequirementInstancesService {
  constructor(private authorization: AuthorizationService) {}
  async receivingPeriods(
    actor: string,
    rawId: unknown,
  ): Promise<{ items: ReceivingPeriod[] }> {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "scholars.read",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const annual = await scholarship(db, id);
        const calendar = await workingYear(db);
        const [semesters] = await db.execute<RowDataPacket[]>(
          "SELECT s.*,DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS start_date,DATE_FORMAT(s.ends_on,'%Y-%m-%d') AS end_date FROM semesters s WHERE academic_year_id=? ORDER BY starts_on DESC,id",
          [annual.academic_year_id],
        );
        const [existing] = await db.execute<RowDataPacket[]>(
          "SELECT semester_id,payout_cycle_id FROM requirement_checklists WHERE scholarship_record_id=?",
          [id],
        );
        const items: ReceivingPeriod[] = [];
        for (const semester of semesters) {
          const available =
            !annual.locked_at &&
            !annual.archived_at &&
            !semester.locked_at &&
            !semester.archived_at;
          const current =
            (!calendar || calendar.yearId === annual.academic_year_id) && semester.start_date <= today() && semester.end_date >= today();
          const applicable =
            available && current
              ? await applicableRequirements(db, {
                  semesterId: semester.id,
                  appliesTo: "semester",
                  effectiveOn: semester.start_date,
                })
              : [];
          if (
            applicable.length ||
            existing.some(
              (e) => e.semester_id === semester.id && !e.payout_cycle_id,
            )
          )
            items.push({
              id: semester.id,
              academicYearId: annual.academic_year_id,
              semesterId: semester.id,
              semesterVersion: semester.version,
              payoutCycleId: null,
              payoutVersion: null,
              label: `${semester.name} — Semester documents`,
              preferred: Boolean(available && current),
              canProvision: Boolean(available && current && applicable.length),
            });
          const [cycles] = await db.execute<RowDataPacket[]>(
            "SELECT id FROM payout_cycles WHERE semester_id=? ORDER BY code",
            [semester.id],
          );
          for (const row of cycles) {
            const cycle = await currentPayout(db, row.id);
            const open = available && cycle.state === "open" && (!calendar || calendar.yearId === annual.academic_year_id);
            if (open || existing.some((e) => e.payout_cycle_id === cycle.id))
              items.push({
                id: cycle.id,
                academicYearId: annual.academic_year_id,
                semesterId: semester.id,
                semesterVersion: semester.version,
                payoutCycleId: cycle.id,
                payoutVersion: cycle.version,
                label: `${semester.name} — Payroll documents: ${cycle.name}${open ? "" : " (read only)"}`,
                preferred: Boolean(open && current),
                canProvision: Boolean(open),
              });
          }
        }
        return { items };
      },
    );
  }
  async provision(
    actor: string,
    rawId: unknown,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const input = z.object({ periodId: z.uuid() }).strict().safeParse(raw);
    if (!input.success)
      throw new AuthError(
        422,
        "VALIDATION_FAILED",
        "Select a receiving period.",
      validationDetails(input.error),
      );
    const period = (await this.receivingPeriods(actor, rawId)).items.find(
      (p) => p.id === input.data.periodId,
    );
    if (!period?.canProvision)
      throw new AuthError(
        423,
        "PERIOD_UNAVAILABLE",
        "This period is unavailable for automatic setup. Existing history remains viewable.",
      );
    return this.generate(
      actor,
      rawId,
      rawKey,
      {
        semesterId: period.semesterId,
        expectedSemesterVersion: period.semesterVersion,
        ...(period.payoutCycleId
          ? {
              payoutCycleId: period.payoutCycleId,
              expectedPayoutVersion: period.payoutVersion,
            }
          : {}),
        reason: "Automatic setup when receiving scholar requirements",
        reference: `Receiving period ${period.id}`,
      },
      requestId,
      true,
    );
  }
  async list(
    actor: string,
    rawId: unknown,
  ): Promise<{ items: RequirementChecklist[] }> {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "scholars.read",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        await scholarship(db, id);
        const [rows] = await db.execute<RowDataPacket[]>(
            "SELECT c.*,s.academic_year_id,DATE_FORMAT(c.policy_date,'%Y-%m-%d') AS policy_on,DATE_FORMAT(c.created_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived FROM requirement_checklists c JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=s.academic_year_id WHERE c.scholarship_record_id=? ORDER BY c.policy_date,c.id LOCK IN SHARE MODE",
          [id],
        );
        return readChecklists(db, rows);
      },
    );
  }
  async generate(
    actor: string,
    rawId: unknown,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
    automatic = false,
  ): Promise<GenerationResult> {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      input = parseGeneration(raw),
      hash = digest(
        JSON.stringify(
          automatic
            ? { id, receivingPeriod: input.payoutCycleId ?? input.semesterId }
            : { id, input },
        ),
      );
    return this.authorization.withPermission(
      actor,
      "requirements.generate",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM requirement_generation_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This command key was already used with different generation data.",
            );
          return JSON.parse(prior[0].result as string) as GenerationResult;
        }
        const annual = await scholarship(db, id);
        const shared = await semesterDocumentSources(db, input.semesterId);
        if (shared.length && !input.payoutCycleId) throw new AuthError(409, "SHARED_SEMESTER_DOCUMENTS_REQUIRED", "Use the semester Documents workspace. Do not generate duplicate COR/COG records for payout.");
        await preventGraduateRenewal(db, annual.scholar_id, input.semesterId);
        const [semesterOwners] = await db.execute<RowDataPacket[]>("SELECT ss.id FROM scholar_semesters ss JOIN scholarship_records r ON r.scholar_id=ss.scholar_id WHERE r.id=? AND ss.semester_id=? LIMIT 1 FOR UPDATE", [id, input.semesterId]);
        if (semesterOwners.length && !input.payoutCycleId) throw new AuthError(409, "SEMESTER_RECEIVING_EXISTS", "Use the scholar's semester receiving workspace; this period already has a semester record.");

        const [periods] = await db.execute<RowDataPacket[]>(
          "SELECT id,academic_year_id,code,name,version,archived_at,locked_at,DATE_FORMAT(starts_on,'%Y-%m-%d') AS policy_date,DATE_FORMAT(ends_on,'%Y-%m-%d') AS end_date FROM semesters WHERE id=? LOCK IN SHARE MODE",
          [input.semesterId],
        );
        if (!periods.length)
          throw new AuthError(
            422,
            "REFERENCE_NOT_FOUND",
            "Select an existing semester.",
          );
        const period = periods[0];
        if (
          automatic &&
          !input.payoutCycleId &&
          (period.policy_date > today() || period.end_date < today())
        )
          throw new AuthError(
            423,
            "PERIOD_UNAVAILABLE",
            "Automatic setup is limited to a current semester or open payout.",
          );
        if (period.academic_year_id !== annual.academic_year_id)
          throw new AuthError(
            409,
            "WRONG_ACADEMIC_YEAR",
            "Select a semester belonging to this annual scholarship record.",
          );
        if (period.locked_at || annual.locked_at)
          throw new AuthError(
            423,
            "RECORD_LOCKED",
            "The semester or academic year is locked.",
          );
        if (period.archived_at || annual.archived_at)
          throw new AuthError(
            409,
            "REFERENCE_ARCHIVED",
            "The semester or academic year is archived.",
          );
        const payout = input.payoutCycleId
          ? await currentPayout(db, input.payoutCycleId)
          : null;
        if (payout) {
          if (
            payout.semesterId !== period.id ||
            payout.academicYearId !== annual.academic_year_id
          )
            throw new AuthError(
              409,
              "WRONG_ACADEMIC_YEAR",
              "Select the payout cycle for this annual record and semester.",
            );
          requireOpenPayout(payout);
          if (shared.length || semesterOwners.length) {
            const [owned] = await db.execute<RowDataPacket[]>("SELECT i.definition_version_id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id WHERE ss.scholar_id=? AND ss.semester_id=?", [annual.scholar_id, input.semesterId]);
            const inherited = new Set([...shared.flatMap(s=>[s.corDefinitionVersionId,s.cogDefinitionVersionId]), ...owned.map(r=>r.definition_version_id)]);
            if (!payout.requirements.length || payout.requirements.some(r=>inherited.has(r.definitionVersionId))) throw new AuthError(409,"SHARED_SEMESTER_DOCUMENTS_REQUIRED","Use the semester Documents workspace for COR/COG. Only separately configured obligations can have a payout checklist.");
          }
        }
        const [existing] = await db.execute<RowDataPacket[]>(
          "SELECT c.id,COUNT(i.id) AS total FROM requirement_checklists c LEFT JOIN requirement_instances i ON i.checklist_id=c.id WHERE c.scholarship_record_id=? AND c.semester_id=? AND c.payout_cycle_id <=> ? GROUP BY c.id FOR UPDATE",
          [id, input.semesterId, payout?.id ?? null],
        );
        let result: GenerationResult;
        if (existing.length) {
          result = {
            id: existing[0].id,
            created: false,
            count: Number(existing[0].total),
          };
        } else {
          if (period.version !== input.expectedSemesterVersion)
            throw new AuthError(
              409,
              "VERSION_CONFLICT",
              "Semester configuration changed. Refresh and review its start date before generating.",
            );
          if (payout && payout.version !== input.expectedPayoutVersion)
            throw new AuthError(
              409,
              "VERSION_CONFLICT",
              "Payout cycle changed. Refresh before generation.",
            );
          const policyDate = payout?.targetDate ?? period.policy_date;
          const definitions = payout
            ? payout.requirements.map((r) => ({ id: r.definitionVersionId }))
            : await applicableRequirements(db, {
                semesterId: period.id,
                appliesTo: "semester",
                effectiveOn: policyDate,
              });
          if (!definitions.length)
            throw new AuthError(
              409,
              "NO_APPLICABLE_REQUIREMENTS",
              "No semester requirements apply on the semester start date. Ask a System Administrator to configure the policy before generation.",
            );
          const target = randomUUID();
          const [users] = await db.execute<RowDataPacket[]>(
            "SELECT full_name FROM users WHERE id=?",
            [actor],
          );
          await db.execute(
            "INSERT INTO requirement_checklists(id,scholarship_record_id,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,reason,reference_text,actor_id,actor_name,payout_cycle_id,payout_version_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            [
              target,
              id,
              period.id,
              policyDate,
              annual.code,
              annual.name,
              period.code,
              period.name,
              period.version,
              input.reason,
              input.reference,
              actor,
              users[0].full_name,
              payout?.id ?? null,
              payout?.versionId ?? null,
            ],
          );
          for (const v of definitions)
            await db.execute(
              "INSERT INTO requirement_instances(id,checklist_id,definition_version_id,status,created_at) VALUES(?,?,?,'not_submitted',UTC_TIMESTAMP(6))",
              [randomUUID(), target, v.id],
            );
          result = { id: target, created: true, count: definitions.length };
          await db.execute(
            "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'requirements.generated','requirement_checklist',?,'generate',?,'user',UTC_TIMESTAMP(6),?,?,?)",
            [
              randomUUID(),
              target,
              actor,
              requestId,
              input.reason,
              JSON.stringify({
                scholarshipRecordId: id,
                semesterId: period.id,
                semesterVersion: period.version,
                policyDate,
                payoutCycleId: payout?.id ?? null,
                payoutVersionId: payout?.versionId ?? null,
                definitionVersionIds: definitions.map((v) => v.id),
                reference: input.reference,
                idempotency_key: key,
              }),
            ],
          );
        }
        await db.execute(
          "INSERT INTO requirement_generation_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(result)],
        );
        return result;
      },
    );
  }
}
