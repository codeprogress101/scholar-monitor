import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { academicCurrent } from "../academic/changes-service.js";
import { requirementState } from "./workflow-state.js";
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
    "SELECT i.definition_version_id,c.semester_id,c.semester_code,c.year_code,DATE_FORMAT(c.policy_date,'%Y-%m-%d') AS policy_date,r.scholar_id,r.academic_year_id,s.academic_year_id AS semester_year,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived,v.active,v.applies_to,v.semester_id AS definition_semester,DATE_FORMAT(v.effective_from,'%Y-%m-%d') AS effective_from,DATE_FORMAT(v.effective_until,'%Y-%m-%d') AS effective_until FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id JOIN scholarship_records r ON r.id=c.scholarship_record_id JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=r.academic_year_id JOIN requirement_definition_versions v ON v.id=i.definition_version_id WHERE i.id=? FOR UPDATE",
    [id],
  );
  if (!rows.length)
    throw new AuthError(
      404,
      "REQUIREMENT_NOT_FOUND",
      "Requirement instance not found.",
    );
  return rows[0];
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
    r.applies_to !== "semester" ||
    (r.definition_semester && r.definition_semester !== r.semester_id) ||
    r.effective_from > r.policy_date ||
    (r.effective_until && r.effective_until <= r.policy_date)
  )
    throw new AuthError(
      409,
      "REQUIREMENT_NOT_APPLICABLE",
      "The pinned requirement definition does not apply to this recorded period.",
    );
  const [people] = await db.execute<RowDataPacket[]>(
    "SELECT s.version,CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')) AS name,i.human_id FROM scholars s JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE s.id=? FOR UPDATE",
    [r.scholar_id],
  );
  const [records] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=? FOR UPDATE",
    [r.scholar_id, r.academic_year_id],
  );
  if (!records.length)
    throw new AuthError(
      409,
      "ACADEMIC_RECORD_REQUIRED",
      "Record the scholar school and course for this academic year before verification.",
    );
  const academic = await academicCurrent(db, records[0].id);
  return {
    scholarId: r.scholar_id,
    scholarVersion: people[0].version,
    humanId: people[0].human_id,
    scholarName: people[0].name,
    academicYearId: r.academic_year_id,
    yearCode: r.year_code,
    semesterId: r.semester_id,
    semesterCode: r.semester_code,
    schoolId: academic.placement.schoolId,
    schoolName: academic.placement.school.name,
    courseId: academic.placement.courseId,
    courseName: academic.placement.course.name,
    academicVersion: academic.version,
    definitionVersionId: r.definition_version_id,
    policyDate: r.policy_date,
    placementEffectiveOn: academic.effectiveOn,
  };
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
        const r = await base(db, id);
        openPeriod(r);
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
          details.verification = verified;
          details.checks = input.checks;
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
        if (input.action === "resubmit")
          details.receipt = {
            receivedOn: input.effectiveOn,
            physicalReference: input.physicalReference,
            storageLocation: input.storageLocation,
            remarks: input.remarks,
          };
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const eventId = randomUUID(),
          version = current.version + 1;
        await db.execute(
          "INSERT INTO requirement_workflow_events(id,instance_id,version,action,from_status,to_status,effective_on,reason,reference_text,remarks,correction_of,details,actor_id,actor_name,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            eventId,
            id,
            version,
            action,
            current.status,
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
        const result = { id: eventId, version, status: next };
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
            }),
          ],
        );
        await db.execute(
          "INSERT INTO requirement_workflow_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(result)],
        );
        return result;
      },
    );
  }
}
