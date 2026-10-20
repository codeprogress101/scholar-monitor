import { requireActiveDocument } from "./reused-source.js";
import { today } from "../scholars/validation.js";
import { RequirementReceiptService } from "./receipt-service.js";
import { parseReceipt } from "./receipt-validation.js";
import { z } from "zod";
import { semesterRequirementContext, requireCoveredPlacement } from "./semester-context.js";
import { loadRequirementTiming } from "./timing-service.js";
import { receivedDocumentType, recordDocumentEvidence } from "./document-evidence.js";
import { guardPayoutRequirement } from "../payouts/service.js";
import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { academicCurrent } from "../academic/changes-service.js";
import { requirementState } from "./workflow-state.js";
import { verificationMatches } from "./workflow-model.js";
import {
  parseRequirementWorkflow,
  requirementTransition,
} from "./workflow-validation.js";
import type {
  RequirementAction,
  VerificationContext,
  RequirementWorkflowEvent,
} from "./workflow-model.js";
export const workflowPermission = (action: RequirementAction) =>
  action === "resubmit"
    ? ("requirements.receive" as const)
    : ("requirements.verify" as const);
async function base(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT i.id AS instance_id,c.scholar_semester_id,c.payout_cycle_id,c.payout_version_id,i.definition_version_id,c.semester_id,c.semester_code,c.year_code,DATE_FORMAT(c.policy_date,'%Y-%m-%d') AS policy_date,r.scholar_id,r.academic_year_id,s.academic_year_id AS semester_year,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived,v.active,v.applies_to,v.semester_id AS definition_semester,DATE_FORMAT(v.effective_from,'%Y-%m-%d') AS effective_from,DATE_FORMAT(v.effective_until,'%Y-%m-%d') AS effective_until FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id LEFT JOIN scholarship_records r ON r.id=c.scholarship_record_id JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=s.academic_year_id JOIN requirement_definition_versions v ON v.id=i.definition_version_id WHERE i.id=? FOR UPDATE",
    [id],
  );
  if (!rows.length)
    throw new AuthError(
      404,
      "REQUIREMENT_NOT_FOUND",
      "Requirement instance not found.",
    );
  const row = rows[0];
  await requireActiveDocument(db, id, row.scholar_semester_id);
  const coverage = await semesterRequirementContext(db, id, row.scholar_semester_id);
  if (coverage) {
    row.scholar_id = coverage.scholarId;
    row.academic_year_id = coverage.receivingAcademicYearId;
    row.coverage = coverage;
  }
  return row;
}
function openPeriod(r: RowDataPacket) {
  if (r.locked_at || r.year_locked)
    throw new AuthError(
      423,
      "RECORD_LOCKED",
      "Semester or academic year is locked.",
    );
  if (r.archived_at || r.year_archived)
    throw new AuthError(
      409,
      "REFERENCE_ARCHIVED",
      "Semester or academic year is archived.",
    );
}
async function context(
  db: PoolConnection,
  r: RowDataPacket,
): Promise<VerificationContext> {
  if (r.semester_year !== r.academic_year_id)
    throw new AuthError(
      409,
      "REQUIREMENT_WRONG_PERIOD",
      "Requirement and annual academic period do not match.",
    );
  if (
    !r.active ||
    r.applies_to !== (r.payout_cycle_id ? "payout" : "semester") ||
    (r.definition_semester && r.definition_semester !== r.semester_id) ||
    r.effective_from > r.policy_date ||
    (r.effective_until && r.effective_until <= r.policy_date)
  )
    throw new AuthError(
      409,
      "REQUIREMENT_NOT_APPLICABLE",
      "The pinned requirement definition does not apply to this recorded period.",
    );
  const coverage = r.coverage as Awaited<ReturnType<typeof semesterRequirementContext>>;
  const academicYearId = coverage?.academicYearId ?? r.academic_year_id;
  const [people] = await db.execute<RowDataPacket[]>(
    "SELECT s.version,CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')) AS name,i.human_id FROM scholars s JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE s.id=? FOR UPDATE",
    [r.scholar_id],
  );
  const [records] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=? FOR UPDATE",
    [r.scholar_id, academicYearId],
  );
  if (coverage?.entrantCard) {
    const card=coverage.entrantCard;
    return {scholarId:r.scholar_id,scholarVersion:people[0].version,humanId:people[0].human_id,scholarName:people[0].name,academicYearId:r.academic_year_id,yearCode:card.schoolYear,semesterId:r.semester_id,semesterCode:card.gradingPeriod,schoolId:null,schoolName:card.issuingSchool,courseId:null,courseName:'Senior high school',academicVersion:card.revision,definitionVersionId:r.definition_version_id,placementEffectiveOn:null,policyDate:r.policy_date,coverageId:coverage.coverageId,semesterRevision:coverage.semesterRevision,receivingSemesterId:coverage.receivingSemesterId,receivingSemesterCode:coverage.receivingSemesterCode,documentKind:'cog' as const,entrantCard:card};
  }
  if (!records.length)
    throw new AuthError(
      409,
      "ACADEMIC_RECORD_REQUIRED",
      "Record the scholar school and course for this academic year before verification.",
      { academicYearId },
    );
  const academic = await academicCurrent(db, records[0].id);
  if(academic.placement.coursePending && !coverage) throw new AuthError(409,'HISTORICAL_PLACEMENT_REVIEW_REQUIRED','Record explicit covered-semester placement before using a course-pending exception for verification.',{academicYearId});
  if (coverage) requireCoveredPlacement(coverage.documentKind, academic.effectiveOn, coverage.coveredEnd);
  const [evidence] = coverage ? await db.execute<RowDataPacket[]>("SELECT d.document_type FROM requirement_document_evidence d LEFT JOIN requirement_workflow_events e ON e.id=d.workflow_event_id WHERE d.instance_id=? ORDER BY COALESCE(e.version,1) DESC LIMIT 1 LOCK IN SHARE MODE", [r.instance_id]) : [[]];
  return {
    ...(academic.placement.coursePending ? {coursePending:academic.placement.coursePending}:{}),
    ...(evidence[0] ? { receivedDocumentType: evidence[0].document_type } : {}),
    ...(coverage?.predecessorSourceHash ? { predecessorSourceHash: coverage.predecessorSourceHash } : {}),
    ...(coverage ? { coverageId: coverage.coverageId, semesterRevision: coverage.semesterRevision,
      receivingSemesterId: coverage.receivingSemesterId, receivingSemesterCode: coverage.receivingSemesterCode, documentKind: coverage.documentKind } : {}),
    scholarId: r.scholar_id,
    scholarVersion: people[0].version,
    humanId: people[0].human_id,
    scholarName: people[0].name,
    academicYearId,
    yearCode: coverage?.yearCode ?? r.year_code,
    semesterId: coverage?.semesterId ?? r.semester_id,
    semesterCode: coverage?.semesterCode ?? r.semester_code,
    schoolId: academic.placement.schoolId,
    schoolName: academic.placement.school.name,
    courseId: academic.placement.courseId || null,
    courseName: academic.placement.course.name,
    academicVersion: academic.version,
    definitionVersionId: r.definition_version_id,
    policyDate: r.policy_date,
    placementEffectiveOn: academic.effectiveOn,
  };
}
/** Shared authoritative verification context for semester academic reviews. */
export async function requirementVerificationContext(db: PoolConnection, id: string, retainedRelease = false) {
  const row = await base(db, id);
  // Retained release reads still validate document identity/coverage; they do
  // not reopen a period or authorize any receipt/verification mutation.
  if (!retainedRelease) { openPeriod(row); await guardPayoutRequirement(db, id); }
  return context(db, row);
}
/** Read projection for saved evidence, including closed-period history. No provisioning. */
export async function savedVerificationContext(db: PoolConnection, id: string) {
  return context(db, await base(db,id));
}
export class RequirementWorkflowService {
  constructor(private authorization: AuthorizationService) {}
  async context(actor: string, rawId: unknown) {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "requirements.verify",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const r = await base(db, id);
        openPeriod(r);
        if((r.coverage as Awaited<ReturnType<typeof semesterRequirementContext>>)?.entrantCard?.mode==='initial_requirements')throw new AuthError(409,'DOCUMENT_NOT_REQUIRED','The approved first-semester exception requires no new COG receipt or verification.');
        await guardPayoutRequirement(db, id);
        return context(db, r);
      },
    );
  }
  async command(
    actor: string,
    rawId: unknown,
    action: RequirementAction,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      input = parseRequirementWorkflow(action, raw),
      hash = digest(JSON.stringify({ id, input }));
    return this.authorization.withPermission(
      actor,
      workflowPermission(action),
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM requirement_workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This workflow key was already used with different data.",
            );
          return JSON.parse(prior[0].result as string) as {
            id: string;
            version: number;
            status: string;
          };
        }
        const result = await this.record(db, actor, id, input, requestId, key);
        await db.execute(
          "INSERT INTO requirement_workflow_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(result)],
        );
        return result;
      },
    );
  }
  /** Transaction-aware operation shared by ordinary and combined commands. */
  async record(db: PoolConnection, actor: string, id: string, rawInput: ReturnType<typeof parseRequirementWorkflow>, requestId: string, key: string) {
    const input = { ...rawInput, effectiveOn: rawInput.effectiveOn ?? today() };
    const action = input.action;
        const r = await base(db, id);
        openPeriod(r);
        if((r.coverage as Awaited<ReturnType<typeof semesterRequirementContext>>)?.entrantCard?.mode==='initial_requirements')throw new AuthError(409,'DOCUMENT_NOT_REQUIRED','The approved first-semester exception requires no new COG receipt or verification.');
        await guardPayoutRequirement(db, id);
        const current = await requirementState(db, id);
        if (input.expectedVersion !== current.version)
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "Requirement changed. Refresh its history before recording another decision.",
          );
        const next = requirementTransition(current.status, action);
        if (
          current.lastEffectiveOn &&
          input.effectiveOn < current.lastEffectiveOn
        )
          throw new AuthError(
            409,
            "INVALID_EFFECTIVE_DATE",
            "Effective date cannot precede the latest receipt or workflow decision.",
          );
        const details: RequirementWorkflowEvent["details"] = {};
        let correctionOf: string | null = null;
        if (input.action === "verify") {
          const verified = await context(db, r),
            document = input.document;
          if (current.status === "verified") {
            if (verificationMatches(verified, current.history.at(-1)?.details.verification))
              throw new AuthError(409, "VERIFICATION_CURRENT", "This document is already verified against the current records.");
            correctionOf = current.latestEventId;
          }
          if (document.entrantCardId !== verified.entrantCard?.id || document.coverageId !== verified.coverageId || document.semesterRevision !== verified.semesterRevision || document.predecessorSourceHash !== verified.predecessorSourceHash)
            throw new AuthError(409, "SOURCE_CHANGED", "Document coverage or semester details changed. Reload verification context.");
          if (
            document.academicYearId !== verified.academicYearId ||
            document.semesterId !== verified.semesterId
          )
            throw new AuthError(
              409,
              "REQUIREMENT_WRONG_PERIOD",
              "Document academic year or semester does not match this requirement.",
            );
          if (document.scholarId !== verified.scholarId)
            throw new AuthError(
              409,
              "REQUIREMENT_WRONG_SCHOLAR",
              "Document scholar does not match this requirement.",
            );
          if (
            document.schoolId !== verified.schoolId ||
            document.courseId !== verified.courseId
          )
            throw new AuthError(
              409,
              "REQUIREMENT_WRONG_PLACEMENT",
              "Document school/course does not match the current annual academic record.",
            );
          if (document.definitionVersionId !== verified.definitionVersionId)
            throw new AuthError(
              409,
              "REQUIREMENT_NOT_APPLICABLE",
              "Review the pinned requirement policy version.",
            );
          if (
            document.scholarVersion !== verified.scholarVersion ||
            document.academicVersion !== verified.academicVersion
          )
            throw new AuthError(
              409,
              "SOURCE_CHANGED",
              "Identity or academic placement changed. Reload verification context and review the document again.",
            );
          if (
            verified.placementEffectiveOn &&
            input.effectiveOn < verified.placementEffectiveOn
          )
            throw new AuthError(
              409,
              "INVALID_EFFECTIVE_DATE",
              "Verification cannot predate the placement being verified.",
            );
          if(verified.coursePending) {
            if(input.attestation!=='course-comparison-deferred' || input.checks.placement || input.document.coursePendingId!==verified.coursePending.id || input.document.coursePendingRevision!==verified.coursePending.revision) throw new AuthError(409,'COURSE_PENDING_REVIEW_REQUIRED','Confirm the deferred course comparison against the current approved-import exception.');
          } else if(input.attestation==='course-comparison-deferred' || !input.checks.placement || input.document.coursePendingId) throw new AuthError(409,'SOURCE_CHANGED','Course-pending exception changed; reload verification context.');
          details.verification = verified;
          details.checks = input.checks;
          if(input.attestation) details.attestation = input.attestation;
        }
        if (input.action === "return-for-correction") {
          if (current.status === "verified") {
            if (
              !input.correctionOf ||
              input.correctionOf !== current.latestEventId
            )
              throw new AuthError(
                409,
                "CORRECTION_REFERENCE_REQUIRED",
                "Link this controlled correction to the latest verification event.",
              );
            correctionOf = input.correctionOf;
          } else if (input.correctionOf !== null)
            throw new AuthError(
              422,
              "VALIDATION_FAILED",
              "Only reopening a verified requirement accepts a verification event link.",
            );
        }
        if(input.action==='resubmit' && input.entrantCardId !== (r.coverage as Awaited<ReturnType<typeof semesterRequirementContext>>)?.entrantCard?.id) throw new AuthError(409,'SOURCE_CHANGED','Reload the approved grading-card coverage.');
        const documentType = input.action === "resubmit" ? receivedDocumentType((r.coverage as Awaited<ReturnType<typeof semesterRequirementContext>>)?.documentKind, input.documentType, Boolean((r.coverage as Awaited<ReturnType<typeof semesterRequirementContext>>)?.entrantCard)) : null;
        if (input.action === "resubmit")
          details.receipt = {
            ...(documentType ? { documentType } : {}),
            receivedOn: input.effectiveOn,
            physicalReference: input.physicalReference,
            storageLocation: input.storageLocation,
            remarks: input.remarks,
          };
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        // Keep the existing persisted transition contract while removing the
        // separate desk action. Both events and the audit commit atomically.
        const routeAutomatically = ["submitted", "resubmitted"].includes(current.status) &&
          ["verify", "return-for-correction", "reject"].includes(action);
        const routingId = routeAutomatically ? randomUUID() : null;
        if (routingId) await db.execute(
          "INSERT INTO requirement_workflow_events(id,instance_id,version,action,from_status,to_status,effective_on,reason,reference_text,remarks,correction_of,details,actor_id,actor_name,recorded_at) VALUES(?,?,?,'send-for-verification',?,'for_verification',?,?,?,?,NULL,?,?,?,UTC_TIMESTAMP(6))",
          [routingId, id, current.version + 1, current.status, input.effectiveOn,
            "Review started automatically with the document decision", input.reference, null,
            JSON.stringify({ automaticRouting: true, decisionAction: action }), actor, users[0].full_name],
        );
        const eventId = randomUUID(),
          version = current.version + (routeAutomatically ? 2 : 1);
        await db.execute(
          "INSERT INTO requirement_workflow_events(id,instance_id,version,action,from_status,to_status,effective_on,reason,reference_text,remarks,correction_of,details,actor_id,actor_name,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            eventId,
            id,
            version,
            action,
            routeAutomatically ? "for_verification" : current.status,
            next,
            input.effectiveOn,
            input.reason,
            input.reference,
            input.remarks,
            correctionOf,
            JSON.stringify(details),
            actor,
            users[0].full_name,
          ],
        );
        if (input.action === "resubmit") await recordDocumentEvidence(db, actor, id, documentType, { eventId },(r.coverage as Awaited<ReturnType<typeof semesterRequirementContext>>)?.entrantCard?.id);
        const timing = input.action === "resubmit" && r.scholar_semester_id ? await loadRequirementTiming(db, id) : null;
        const result = { id: eventId, version, status: next, ...(timing?.mode === "managed" ? { timing } : {}) };
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'requirements.workflow','requirement_instance',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            id,
            action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              before: { status: current.status, version: current.version },
              after: result,
              effectiveOn: input.effectiveOn,
              reference: input.reference,
              correctionOf,
              details,
              idempotency_key: key,
              ...(routingId ? { automaticRoutingEventId: routingId } : {}),
            }),
          ],
        );

    return result;
  }

  async receiveAndVerify(actor: string, rawId: unknown, rawKey: unknown, raw: unknown, requestId: string) {
    const id = parseId(rawId), key = parseKey(rawKey);
    const parsed = z.object({receipt:z.unknown(),verification:z.unknown()}).strict().safeParse(raw);
    if (!parsed.success) throw new AuthError(422,"VALIDATION_FAILED","Provide receipt and verification details.");
    const receipt = parseReceipt(parsed.data.receipt), verification = parseRequirementWorkflow("verify",parsed.data.verification);
    if (receipt.expectedVersion !== 0 || verification.expectedVersion !== 1 || verification.action !== "verify" || !verification.attestation)
      throw new AuthError(422,"VALIDATION_FAILED","Confirm all five checks for a new receipt and its verification.");
    const hash = digest(JSON.stringify({operation:"receive-and-verify",id,receipt,verification}));
    return this.authorization.withAccess(actor,async(db,access)=>{
      if (!["requirements.receive","requirements.verify"].every(code=>access.permissions.some(p=>p.code===code)))
        throw new AuthError(403,"PERMISSION_DENIED","Receiving and verification permissions are both required.");
      const [prior] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM requirement_receipt_commands WHERE actor_id=? AND command_id=? FOR UPDATE",[actor,key]);
      if(prior.length){
        if(prior[0].payload_hash!==hash)throw new AuthError(409,"IDEMPOTENCY_CONFLICT","This command key was used with different data.");
        return JSON.parse(prior[0].result);
      }
      const routineDay = today();
      const received = await new RequirementReceiptService(this.authorization).record(db,actor,id,{...receipt,receivedOn:receipt.receivedOn ?? routineDay},requestId,key);
      const verified = await this.record(db,actor,id,{...verification,effectiveOn:verification.effectiveOn ?? routineDay},requestId,key);
      const result = {receipt:received,...verified};
      await db.execute("INSERT INTO requirement_receipt_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",[actor,key,hash,JSON.stringify(result)]);
      return result;
    });
  }

}
