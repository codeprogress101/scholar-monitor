import { requirementState } from "./workflow-state.js";
import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { applicableRequirements } from "./service.js";
import { parseGeneration } from "./instances-validation.js";
import type {
  RequirementChecklist,
  GenerationResult,
} from "./instances-model.js";
async function scholarship(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT r.academic_year_id,y.code,y.name,y.archived_at,y.locked_at FROM scholarship_records r JOIN academic_years y ON y.id=r.academic_year_id WHERE r.id=? LOCK IN SHARE MODE",
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
export class RequirementInstancesService {
  constructor(private authorization: AuthorizationService) {}
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
          "SELECT c.*,DATE_FORMAT(c.policy_date,'%Y-%m-%d') AS policy_on,DATE_FORMAT(c.created_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived FROM requirement_checklists c JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=s.academic_year_id WHERE c.scholarship_record_id=? ORDER BY c.policy_date,c.id LOCK IN SHARE MODE",
          [id],
        );
        const items: RequirementChecklist[] = [];
        for (const r of rows) {
          const [instances] = await db.execute<RowDataPacket[]>(
            "SELECT i.id,i.definition_version_id,i.status,v.name,v.instructions,v.revision,d.code,r.id AS receipt_id,DATE_FORMAT(r.received_on,'%Y-%m-%d') AS received_on,r.physical_reference,r.storage_location,r.remarks,r.reason AS receipt_reason,r.actor_name AS receiver_name,DATE_FORMAT(r.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS receipt_recorded FROM requirement_instances i LEFT JOIN requirement_receipts r ON r.instance_id=i.id JOIN requirement_definition_versions v ON v.id=i.definition_version_id JOIN requirement_definitions d ON d.id=v.definition_id WHERE i.checklist_id=? ORDER BY d.code LOCK IN SHARE MODE",
            [r.id],
          );
          items.push({
            id: r.id,
            scholarshipRecordId: r.scholarship_record_id,
            semesterId: r.semester_id,
            policyDate: r.policy_on,
            yearCode: r.year_code,
            yearName: r.year_name,
            semesterCode: r.semester_code,
            semesterName: r.semester_name,
            semesterVersion: r.semester_version,
            reason: r.reason,
            reference: r.reference_text,
            actorName: r.actor_name,
            createdAt: r.recorded,
            periodUnavailable: Boolean(
              r.locked_at || r.archived_at || r.year_locked || r.year_archived,
            ),
            items: await Promise.all(
              instances.map(async (i) => ({
                id: i.id,
                definitionVersionId: i.definition_version_id,
                code: i.code,
                name: i.name,
                instructions: i.instructions,
                revision: i.revision,
                ...(await requirementState(db, i.id)),
                receipt: i.receipt_id
                  ? {
                      id: i.receipt_id,
                      receivedOn: i.received_on,
                      physicalReference: i.physical_reference,
                      storageLocation: i.storage_location,
                      remarks: i.remarks,
                      reason: i.receipt_reason,
                      receiverName: i.receiver_name,
                      recordedAt: i.receipt_recorded,
                    }
                  : null,
              })),
            ),
          });
        }
        return { items };
      },
    );
  }
  async generate(
    actor: string,
    rawId: unknown,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ): Promise<GenerationResult> {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      input = parseGeneration(raw),
      hash = digest(JSON.stringify({ id, input }));
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
        const [periods] = await db.execute<RowDataPacket[]>(
          "SELECT id,academic_year_id,code,name,version,archived_at,locked_at,DATE_FORMAT(starts_on,'%Y-%m-%d') AS policy_date FROM semesters WHERE id=? LOCK IN SHARE MODE",
          [input.semesterId],
        );
        if (!periods.length)
          throw new AuthError(
            422,
            "REFERENCE_NOT_FOUND",
            "Select an existing semester.",
          );
        const period = periods[0];
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
        const [existing] = await db.execute<RowDataPacket[]>(
          "SELECT c.id,COUNT(i.id) AS total FROM requirement_checklists c LEFT JOIN requirement_instances i ON i.checklist_id=c.id WHERE c.scholarship_record_id=? AND c.semester_id=? GROUP BY c.id FOR UPDATE",
          [id, input.semesterId],
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
          const definitions = await applicableRequirements(db, {
            semesterId: period.id,
            appliesTo: "semester",
            effectiveOn: period.policy_date,
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
            "INSERT INTO requirement_checklists(id,scholarship_record_id,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,reason,reference_text,actor_id,actor_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            [
              target,
              id,
              period.id,
              period.policy_date,
              annual.code,
              annual.name,
              period.code,
              period.name,
              period.version,
              input.reason,
              input.reference,
              actor,
              users[0].full_name,
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
                policyDate: period.policy_date,
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
