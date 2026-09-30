import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import {
  isPeriod,
  type ConfigKind,
  type ConfigRecord,
  type ConfigList,
} from "./model.js";
import {
  parseCommand,
  parseId,
  parseKey,
  parseKind,
  parseQuery,
} from "./validation.js";

const tables: Record<ConfigKind, string> = {
  "academic-years": "academic_years",
  semesters: "semesters",
  barangays: "barangays",
  schools: "schools",
  courses: "courses",
  settings: "system_settings",
};
function selection(kind: ConfigKind) {
  return `r.*${isPeriod(kind) ? ",DATE_FORMAT(r.starts_on,'%Y-%m-%d') AS start_date,DATE_FORMAT(r.ends_on,'%Y-%m-%d') AS end_date" : ""}${kind === "semesters" ? ",(SELECT (y.locked_at IS NOT NULL OR y.archived_at IS NOT NULL) FROM academic_years y WHERE y.id=r.academic_year_id) AS parent_unavailable" : ""}`;
}
function record(row: RowDataPacket): ConfigRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    version: row.version,
    archived: Boolean(row.archived_at),
    locked: Boolean(row.locked_at),
    parentUnavailable: Boolean(row.parent_unavailable),
    startsOn: row.start_date ?? null,
    endsOn: row.end_date ?? null,
    academicYearId: row.academic_year_id ?? null,
    valueType: row.value_type ?? null,
    value: row.setting_value ?? null,
  };
}
async function get(
  db: PoolConnection,
  kind: ConfigKind,
  id: string,
  lock = false,
) {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT ${selection(kind)} FROM ${tables[kind]} r WHERE r.id=?${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  if (!rows[0])
    throw new AuthError(
      404,
      "REFERENCE_NOT_FOUND",
      "This reference record was not found.",
    );
  return record(rows[0]);
}
function available(item: ConfigRecord) {
  if (item.locked)
    throw new AuthError(
      409,
      "RECORD_LOCKED",
      "This academic period is locked.",
    );
  if (item.archived)
    throw new AuthError(
      409,
      "INVALID_STATE_TRANSITION",
      "Restore the archived record before using or editing it.",
    );
}
export class ConfigurationService {
  constructor(private authorization: AuthorizationService) {}
  async list(
    actorId: string,
    rawKind: unknown,
    rawQuery: unknown,
  ): Promise<ConfigList> {
    const kind = parseKind(rawKind),
      query = parseQuery(rawQuery);
    return this.authorization.withPermission(
      actorId,
      "configuration.read",
      async (db) => {
        const search =
          "%" + query.q.replace(/[!%_]/g, (value) => "!" + value) + "%";
        const where = `${query.includeArchived ? "1=1" : "r.archived_at IS NULL"} AND (r.code LIKE ? ESCAPE '!' OR r.name LIKE ? ESCAPE '!')`;
        const [count] = await db.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS total FROM ${tables[kind]} r WHERE ${where}`,
          [search, search],
        );
        const [rows] = await db.execute<RowDataPacket[]>(
          `SELECT ${selection(kind)} FROM ${tables[kind]} r WHERE ${where} ORDER BY r.code,r.id LIMIT ? OFFSET ?`,
          [search, search, query.limit, query.offset],
        );
        return {
          items: rows.map(record),
          total: Number(count[0].total),
          offset: query.offset,
          limit: query.limit,
        };
      },
    );
  }
  async detail(actorId: string, rawKind: unknown, rawId: unknown) {
    const kind = parseKind(rawKind),
      id = parseId(rawId);
    return this.authorization.withPermission(
      actorId,
      "configuration.read",
      (db) => get(db, kind, id),
    );
  }
  async command(
    actorId: string,
    rawKind: unknown,
    rawId: unknown,
    rawKey: unknown,
    rawInput: unknown,
    requestId: string,
  ) {
    const kind = parseKind(rawKind),
      key = parseKey(rawKey),
      input = parseCommand(kind, rawInput);
    const id = rawId === undefined ? undefined : parseId(rawId);
    if ((input.action === "create") !== (id === undefined))
      throw new AuthError(
        422,
        "VALIDATION_FAILED",
        "Create records on the collection; use the record address for other actions.",
      );
    const hash = digest(JSON.stringify({ kind, id: id ?? null, input }));
    try {
      return await this.authorization.withPermission(
        actorId,
        "configuration.manage",
        async (db) => {
          // The user lock serializes retries for one actor; this small configuration mutex
          // serializes parent/child validation across administrators.
          await db.query(
            "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
          );
          const [prior] = await db.execute<RowDataPacket[]>(
            "SELECT payload_hash,result FROM configuration_commands WHERE actor_id=? AND request_id=?",
            [actorId, key],
          );
          if (prior[0]) {
            if (prior[0].payload_hash !== hash)
              throw new AuthError(
                409,
                "IDEMPOTENCY_CONFLICT",
                "This request key was already used for different changes.",
              );
            return JSON.parse(prior[0].result) as ConfigRecord;
          }
          const before = id ? await get(db, kind, id, true) : null;
          if (before && before.version !== input.expectedVersion)
            throw new AuthError(
              409,
              "VERSION_CONFLICT",
              "This record changed. Refresh and review the latest version before saving.",
            );
          if (before?.locked)
            throw new AuthError(
              409,
              "RECORD_LOCKED",
              "This academic period is locked and cannot be changed.",
            );
          if (
            before &&
            input.fields?.code !== undefined &&
            input.fields.code !== before.code
          )
            throw new AuthError(
              422,
              "VALIDATION_FAILED",
              "Reference codes are permanent. Change the name or archive the record instead.",
            );
          if (before && input.action !== "restore" && before.archived)
            throw new AuthError(
              409,
              "INVALID_STATE_TRANSITION",
              "Restore this record before editing it.",
            );
          if (before && input.action === "restore" && !before.archived)
            throw new AuthError(
              409,
              "INVALID_STATE_TRANSITION",
              "This record is already active.",
            );
          if (kind === "semesters") {
            const parentId =
              before?.academicYearId ?? input.fields!.academicYearId!;
            if (
              before &&
              input.fields?.academicYearId &&
              input.fields.academicYearId !== parentId
            )
              throw new AuthError(
                422,
                "VALIDATION_FAILED",
                "A semester cannot be moved to another academic year.",
              );
            const parent = await get(db, "academic-years", parentId, true);
            available(parent);
            const start = input.fields?.startsOn ?? before!.startsOn!,
              end = input.fields?.endsOn ?? before!.endsOn!;
            if (start < parent.startsOn! || end > parent.endsOn!)
              throw new AuthError(
                422,
                "PERIOD_OUTSIDE_YEAR",
                "Semester dates must fall within the academic year.",
              );
          }
          if (kind === "academic-years" && before) {
            const [children] = await db.execute<RowDataPacket[]>(
              "SELECT id,archived_at,locked_at,DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts_on,DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends_on FROM semesters WHERE academic_year_id=? FOR UPDATE",
              [before.id],
            );
            if (
              input.action === "archive" &&
              children.some((child) => !child.archived_at)
            )
              throw new AuthError(
                409,
                "REFERENCE_IN_USE",
                "Archive the active semesters before archiving their academic year.",
              );
            if (input.action === "update") {
              const datesChanged =
                input.fields!.startsOn !== before.startsOn ||
                input.fields!.endsOn !== before.endsOn;
              if (datesChanged && children.some((child) => child.locked_at))
                throw new AuthError(
                  409,
                  "RECORD_LOCKED",
                  "Year dates cannot change after a semester is locked.",
                );
              if (
                children.some(
                  (child) =>
                    child.starts_on < input.fields!.startsOn! ||
                    child.ends_on > input.fields!.endsOn!,
                )
              )
                throw new AuthError(
                  422,
                  "PERIOD_OUTSIDE_YEAR",
                  "Academic year dates must include all retained semesters.",
                );
            }
          }
          const targetId = id ?? randomUUID(),
            table = tables[kind];
          if (input.action === "create" || input.action === "update") {
            const fields = input.fields!;
            const columns = ["name"],
              values: (string | number)[] = [fields.name];
            if (isPeriod(kind)) {
              columns.push("starts_on", "ends_on");
              values.push(fields.startsOn!, fields.endsOn!);
            }
            if (kind === "settings") {
              columns.push("value_type", "setting_value");
              values.push(fields.valueType!, fields.value!);
            }
            if (input.action === "create") {
              columns.push("id", "code");
              values.push(targetId, fields.code);
              if (kind === "semesters") {
                columns.push("academic_year_id");
                values.push(fields.academicYearId!);
              }
              await db.execute(
                `INSERT INTO ${table} (${columns.join(",")},created_at,updated_at) VALUES (${columns.map(() => "?").join(",")},UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
                values,
              );
            } else
              await db.execute(
                `UPDATE ${table} SET ${columns.map((column) => column + "=?").join(",")},version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?`,
                [...values, targetId],
              );
          } else {
            const change =
              input.action === "lock"
                ? "locked_at=UTC_TIMESTAMP(6)"
                : input.action === "archive"
                  ? "archived_at=UTC_TIMESTAMP(6)"
                  : "archived_at=NULL";
            await db.execute(
              `UPDATE ${table} SET ${change},version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?`,
              [targetId],
            );
          }
          const after = await get(db, kind, targetId);
          await db.execute(
            "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,'configuration.changed',?,?,?,?, 'user',UTC_TIMESTAMP(6),?,?,?)",
            [
              randomUUID(),
              kind,
              targetId,
              input.action,
              actorId,
              requestId,
              input.reason,
              JSON.stringify({ before, after, idempotency_key: key }),
            ],
          );
          await db.execute(
            "INSERT INTO configuration_commands (actor_id,request_id,payload_hash,result,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))",
            [actorId, key, hash, JSON.stringify(after)],
          );
          return after;
        },
      );
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ER_DUP_ENTRY"
      )
        throw new AuthError(
          409,
          "DUPLICATE_REFERENCE_CODE",
          "This code already exists, including archived records. Use another code or restore the existing record.",
        );
      throw error;
    }
  }
}
