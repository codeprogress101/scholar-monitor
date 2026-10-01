import { requireAcademicRecord } from "../academic/service.js";
import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import type { PermissionCode } from "../authorization/policy.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { parseQualification, transition } from "./validation.js";
import type {
  QualificationAction,
  QualificationDetail,
  QualificationResult,
  ScholarshipRecord,
} from "./model.js";

export const qualificationPermission = (
  action: QualificationAction | "create",
): PermissionCode =>
  action === "create" || action === "exam-passed"
    ? "scholarship.status.request"
    : "scholarship.status.approve";
const columns =
  "r.id,r.scholar_id,r.academic_year_id,r.status,r.version,DATE_FORMAT(r.last_effective_on,'%Y-%m-%d') AS effective_on,y.code,y.name,y.archived_at,y.locked_at";
const join =
  "FROM scholarship_records r JOIN academic_years y ON y.id=r.academic_year_id";
function record(row: RowDataPacket): ScholarshipRecord {
  return {
    id: row.id,
    scholarId: row.scholar_id,
    academicYearId: row.academic_year_id,
    yearCode: row.code,
    yearName: row.name,
    status: row.status,
    version: row.version,
    lastEffectiveOn: row.effective_on,
    periodUnavailable: Boolean(row.archived_at || row.locked_at),
  };
}
async function scholarExists(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM scholars WHERE id=?",
    [id],
  );
  if (!rows.length)
    throw new AuthError(
      404,
      "SCHOLAR_NOT_FOUND",
      "The scholar record was not found.",
    );
}
export class QualificationService {
  constructor(private authorization: AuthorizationService) {}
  async list(actor: string, rawId: unknown) {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "scholars.read",
      async (db) => {
        await scholarExists(db, id);
        const [rows] = await db.execute<RowDataPacket[]>(
          `SELECT ${columns} ${join} WHERE r.scholar_id=? ORDER BY y.starts_on DESC,r.id`,
          [id],
        );
        return { items: rows.map(record) };
      },
    );
  }
  async detail(actor: string, rawId: unknown): Promise<QualificationDetail> {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "scholars.read",
      async (db) => {
        const [rows] = await db.execute<RowDataPacket[]>(
          `SELECT ${columns} ${join} WHERE r.id=?`,
          [id],
        );
        if (!rows.length)
          throw new AuthError(
            404,
            "SCHOLARSHIP_NOT_FOUND",
            "The annual scholarship record was not found.",
          );
        const [events] = await db.execute<RowDataPacket[]>(
          "SELECT id,action,from_status,to_status,resulting_version,actor_name,DATE_FORMAT(effective_on,'%Y-%m-%d') AS effective_on,DATE_FORMAT(occurred_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS occurred_at,reason,reference_text FROM qualification_events WHERE scholarship_id=? ORDER BY resulting_version",
          [id],
        );
        return {
          ...record(rows[0]),
          events: events.map((row) => ({
            id: row.id,
            action: row.action,
            fromStatus: row.from_status,
            toStatus: row.to_status,
            version: row.resulting_version,
            actorName: row.actor_name,
            effectiveOn: row.effective_on,
            occurredAt: row.occurred_at,
            reason: row.reason,
            reference: row.reference_text,
          })),
        };
      },
    );
  }
  async command(
    actor: string,
    rawId: unknown,
    action: QualificationAction | "create",
    rawKey: unknown,
    body: unknown,
    requestId: string,
  ): Promise<QualificationResult> {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      input = parseQualification(body, action === "create");
    const hash = digest(JSON.stringify({ id, action, input }));
    return this.authorization.withPermission(
      actor,
      qualificationPermission(action),
      async (db) => {
        // Same lock order as configuration/scholar writes; period changes cannot race commands.
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,scholarship_id,resulting_version,resulting_status FROM qualification_commands WHERE actor_id=? AND request_id=?",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This request key was used for a different qualification command.",
            );
          return {
            id: prior[0].scholarship_id,
            version: prior[0].resulting_version,
            status: prior[0].resulting_status,
          };
        }
        let before: ScholarshipRecord | null = null;
        let academicYearId = input.academicYearId;
        if (action === "create") await scholarExists(db, id);
        else {
          const [rows] = await db.execute<RowDataPacket[]>(
            `SELECT ${columns} ${join} WHERE r.id=? FOR UPDATE`,
            [id],
          );
          if (!rows.length)
            throw new AuthError(
              404,
              "SCHOLARSHIP_NOT_FOUND",
              "The annual scholarship record was not found.",
            );
          before = record(rows[0]);
          academicYearId = before.academicYearId;
          if (before.version !== input.expectedVersion)
            throw new AuthError(
              409,
              "VERSION_CONFLICT",
              "This annual record changed. Refresh and review its latest state.",
            );
          if (input.effectiveOn < before.lastEffectiveOn)
            throw new AuthError(
              409,
              "INVALID_EFFECTIVE_DATE",
              "Effective date cannot precede the last recorded qualification event.",
            );
        }
        if (!academicYearId)
          throw new AuthError(
            422,
            "VALIDATION_FAILED",
            "An academic year is required.",
          );
        const [years] = await db.execute<RowDataPacket[]>(
          "SELECT archived_at,locked_at FROM academic_years WHERE id=? FOR UPDATE",
          [academicYearId],
        );
        if (!years.length)
          throw new AuthError(
            422,
            "REFERENCE_NOT_FOUND",
            "Select an existing academic year.",
          );
        if (years[0].locked_at)
          throw new AuthError(
            409,
            "RECORD_LOCKED",
            "This academic year is locked.",
          );
        if (years[0].archived_at)
          throw new AuthError(
            409,
            "REFERENCE_ARCHIVED",
            "This academic year is archived.",
          );
        const target = action === "create" ? randomUUID() : id;
        const status =
          action === "create"
            ? "applicant"
            : transition(before!.status, action);
        if (action === "qualify")
          await requireAcademicRecord(db, before!.scholarId, academicYearId);
        const version = (before?.version ?? 0) + 1;
        if (action === "create") {
          const [existing] = await db.execute<RowDataPacket[]>(
            "SELECT id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=? FOR UPDATE",
            [id, academicYearId],
          );
          if (existing.length)
            throw new AuthError(
              409,
              "DUPLICATE_SCHOLARSHIP_YEAR",
              "This scholar already has an annual record for the selected academic year.",
            );
          await db.execute(
            "INSERT INTO scholarship_records (id,scholar_id,academic_year_id,status,version,last_effective_on,created_at,updated_at) VALUES (?,?,?,'applicant',1,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
            [target, id, academicYearId, input.effectiveOn],
          );
        } else
          await db.execute(
            "UPDATE scholarship_records SET status=?,version=?,last_effective_on=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
            [status, version, input.effectiveOn, target],
          );
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const result = { id: target, status, version };
        await db.execute(
          "INSERT INTO qualification_events (id,scholarship_id,action,from_status,to_status,resulting_version,actor_id,actor_name,effective_on,reason,reference_text,occurred_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            randomUUID(),
            target,
            action,
            before?.status ?? null,
            status,
            version,
            actor,
            users[0].full_name,
            input.effectiveOn,
            input.reason,
            input.reference,
          ],
        );
        await db.execute(
          "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,'qualification.changed','scholarship',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            target,
            action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              before,
              after: {
                ...result,
                scholarId: before?.scholarId ?? id,
                academicYearId,
                effectiveOn: input.effectiveOn,
              },
              reference: input.reference,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO qualification_commands (actor_id,request_id,payload_hash,scholarship_id,resulting_version,resulting_status) VALUES (?,?,?,?,?,?)",
          [actor, key, hash, target, version, status],
        );
        return result;
      },
    );
  }
}
