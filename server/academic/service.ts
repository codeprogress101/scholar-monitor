import { academicCurrent } from "./changes-service.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import type { AcademicRecord } from "./model.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
export function parseAcademic(body: unknown) {
  const value = z
    .object({
      academicYearId: z.uuid(),
      schoolId: z.uuid(),
      courseId: z.uuid(),
      yearLevel: text(1, 60),
      reason: text(5, 500),
      reference: text(3, 300),
    })
    .strict()
    .safeParse(body);
  if (!value.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      value.error.issues
        .map((i) => i.path.join(".") + ": " + i.message)
        .join(" ")
        .slice(0, 800),
    );
  return value.data;
}
/** Call within the dependent workflow transaction, under the configuration guard. */
export async function requireAcademicRecord(
  db: PoolConnection,
  scholarId: string,
  academicYearId: string,
) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT id,school_id,course_id,year_level FROM academic_records WHERE scholar_id=? AND academic_year_id=? LOCK IN SHARE MODE",
    [scholarId, academicYearId],
  );
  if (
    !rows.length ||
    !rows[0].school_id ||
    !rows[0].course_id ||
    !rows[0].year_level.trim()
  )
    throw new AuthError(
      409,
      "ACADEMIC_RECORD_REQUIRED",
      "Record school, course and year level for this academic year before qualification.",
    );
  return rows[0].id as string;
}
export class AcademicService {
  constructor(private authorization: AuthorizationService) {}
  async list(
    actor: string,
    rawId: unknown,
  ): Promise<{ items: AcademicRecord[] }> {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "scholars.read",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [people] = await db.execute<RowDataPacket[]>(
          "SELECT id FROM scholars WHERE id=?",
          [id],
        );
        if (!people.length)
          throw new AuthError(404, "SCHOLAR_NOT_FOUND", "Scholar not found.");
        const [rows] = await db.execute<RowDataPacket[]>(
          "SELECT a.*,DATE_FORMAT(a.created_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded_at,y.locked_at,y.archived_at FROM academic_records a JOIN academic_years y ON y.id=a.academic_year_id WHERE a.scholar_id=? ORDER BY y.starts_on DESC,a.id",
          [id],
        );
        return {
          items: await Promise.all(
            rows.map(async (r) => {
              const current = await academicCurrent(db, r.id);
              return {
                id: r.id,
                scholarId: r.scholar_id,
                academicYearId: r.academic_year_id,
                schoolId: current.placement.schoolId,
                courseId: current.placement.courseId,
                yearLevel: current.placement.yearLevel,
                academicYear: { code: r.year_code, name: r.year_name },
                school: current.placement.school,
                course: current.placement.course,
                reason: r.reason,
                reference: r.reference_text,
                actorName: r.actor_name,
                createdAt: r.recorded_at,
                periodUnavailable: Boolean(r.locked_at || r.archived_at),
              };
            }),
          ),
        };
      },
    );
  }
  async create(
    actor: string,
    rawId: unknown,
    rawKey: unknown,
    body: unknown,
    requestId: string,
  ) {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      input = parseAcademic(body),
      hash = digest(JSON.stringify({ id, input }));
    return this.authorization.withPermission(
      actor,
      "academic.edit",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,academic_record_id FROM academic_commands WHERE actor_id=? AND request_id=?",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "Request key already used for different academic data.",
            );
          return { id: prior[0].academic_record_id as string };
        }
        const [people] = await db.execute<RowDataPacket[]>(
          "SELECT id FROM scholars WHERE id=? FOR UPDATE",
          [id],
        );
        if (!people.length)
          throw new AuthError(404, "SCHOLAR_NOT_FOUND", "Scholar not found.");
        const refs: RowDataPacket[] = [];
        for (const [table, refId] of [
          ["academic_years", input.academicYearId],
          ["schools", input.schoolId],
          ["courses", input.courseId],
        ]) {
          const [rows] = await db.execute<RowDataPacket[]>(
            `SELECT code,name,archived_at${table === "academic_years" ? ",locked_at" : ""} FROM ${table} WHERE id=? FOR UPDATE`,
            [refId],
          );
          if (!rows.length)
            throw new AuthError(
              422,
              "REFERENCE_NOT_FOUND",
              "Select an existing academic year, school and course.",
            );
          if (rows[0].locked_at)
            throw new AuthError(
              409,
              "RECORD_LOCKED",
              "Academic year is locked.",
            );
          if (rows[0].archived_at)
            throw new AuthError(
              409,
              "REFERENCE_ARCHIVED",
              "New academic records require active reference data.",
            );
          refs.push(rows[0]);
        }
        const [existing] = await db.execute<RowDataPacket[]>(
          "SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=? FOR UPDATE",
          [id, input.academicYearId],
        );
        if (existing.length)
          throw new AuthError(
            409,
            "DUPLICATE_ACADEMIC_YEAR",
            "This scholar already has an academic record for this year. Placement changes require the controlled academic-change workflow.",
          );
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const target = randomUUID();
        await db.execute(
          "INSERT INTO academic_records (id,scholar_id,academic_year_id,school_id,course_id,year_level,year_code,year_name,school_code,school_name,course_code,course_name,reason,reference_text,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            target,
            id,
            input.academicYearId,
            input.schoolId,
            input.courseId,
            input.yearLevel,
            refs[0].code,
            refs[0].name,
            refs[1].code,
            refs[1].name,
            refs[2].code,
            refs[2].name,
            input.reason,
            input.reference,
            actor,
            users[0].full_name,
          ],
        );
        await db.execute(
          "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,'academic.created','academic_record',?,'create',?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            target,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              scholarId: id,
              after: input,
              referenceSnapshots: refs.map((r) => ({
                code: r.code,
                name: r.name,
              })),
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO academic_commands (actor_id,request_id,payload_hash,academic_record_id) VALUES (?,?,?,?)",
          [actor, key, hash, target],
        );
        return { id: target };
      },
    );
  }
}
