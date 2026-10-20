import { validationDetails } from "../validation-details.js";
import {decodeStoredJson} from "../stored-json.js";
import type { Access } from "../authorization/policy.js";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { parseAuditExport } from "../exports/validation.js";
import { parseId } from "../configuration/validation.js";
export function parseAuditQuery(raw: unknown) {
  const text = z
    .string()
    .trim()
    .max(80)
    .regex(/^\P{Cc}*$/u)
    .default("");
  const parsed = z
    .object({
      from: z.string(),
      to: z.string(),
      eventType: text,
      action: text,
      entityId: z.union([z.uuid(), z.literal("")]).default(""),
      actorId: z.union([z.uuid(), z.literal("")]).default(""),
      requestId: text,
      limit: z.coerce.number().int().min(1).max(100).default(25),
      offset: z.coerce.number().int().min(0).max(100000).default(0),
    })
    .strict()
    .safeParse(raw);
  if (!parsed.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Use valid audit filters and a page size from 1 to 100.",
      validationDetails(parsed.error),
    );
  parseAuditExport({ from: parsed.data.from, to: parsed.data.to });
  return parsed.data;
}
const decode = (v: unknown): unknown => decodeStoredJson(v);
export function redactAuditDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAuditDetails);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        /password|token|secret|cookie|authorization|session.?id/i.test(key)
          ? "[redacted]"
          : redactAuditDetails(v),
      ]),
    );
  return value;
}
function summary(row: RowDataPacket) {
  return {
    id: row.id as string,
    eventType: row.event_type as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    action: row.action as string,
    actorId: row.actor_id as string | null,
    actorKind: row.actor_kind as string,
    actorRoles:
      row.actor_roles === null ? null : (decode(row.actor_roles) as string[]),
    occurredAt: row.occurred as string,
    requestId: row.request_id as string,
  };
}
export function auditContext(raw: unknown) {
  const object = (v: unknown): Record<string, unknown> =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  const d = object(raw),
    before = object(d.before),
    after = object(d.after);
  const cycle = object(object(object(d.calculation).sources).cycle);
  const text = (...values: unknown[]) =>
    values.find((v): v is string => typeof v === "string") ?? null;
  return {
    fromState: text(d.fromState, d.fromStatus, before.state, before.status),
    toState: text(d.toState, d.toStatus, d.state, after.state, after.status),
    academicYearId: text(
      d.academicYearId,
      after.academicYearId,
      cycle.academicYearId,
    ),
    semesterId: text(d.semesterId, after.semesterId, cycle.semesterId),
    payoutCycleId: text(d.cycleId, d.payoutCycleId, cycle.id),
    reference: text(d.reference, d.authorityReference),
    remarks: text(d.remarks, after.remarks),
  };
}
const fields =
  "id,event_type,entity_type,entity_id,action,actor_id,actor_kind,actor_roles,DATE_FORMAT(occurred_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS occurred,request_id";
export class AuditService {
  constructor(private authorization: AuthorizationService) {}
  private async scoped<T>(
    actor: string,
    run: (db: PoolConnection, access: Access) => Promise<T>,
  ) {
    const access = await this.authorization.access(actor);
    const permission = access.permissions.some(
      (p) => p.code === "audit.view_all",
    )
      ? "audit.view_all"
      : "audit.view_limited";
    return this.authorization.withPermission(actor, permission, run);
  }
  async list(actor: string, raw: unknown) {
    const q = parseAuditQuery(raw);
    return this.scoped(actor, async (db, access) => {
      const all = access.permissions.some((p) => p.code === "audit.view_all");
      const where = [
        "occurred_at>=DATE_SUB(?,INTERVAL 8 HOUR)",
        "occurred_at<DATE_ADD(DATE_SUB(?,INTERVAL 8 HOUR),INTERVAL 1 DAY)",
      ];
      const params: (string | number)[] = [
        q.from + " 00:00:00",
        q.to + " 00:00:00",
      ];
      if (!all) {
        where.push("actor_id=?");
        params.push(actor);
      }
      for (const [column, value] of [
        ["event_type", q.eventType],
        ["action", q.action],
        ["entity_id", q.entityId],
        ["actor_id", q.actorId],
        ["request_id", q.requestId],
      ])
        if (value) {
          where.push(`${column}=?`);
          params.push(value);
        }
      const filter = where.join(" AND ");
      const [counts] = await db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS n FROM audit_event_view WHERE ${filter}`,
        params,
      );
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT ${fields} FROM audit_event_view WHERE ${filter} ORDER BY occurred_at DESC,id DESC LIMIT ? OFFSET ?`,
        [...params, q.limit, q.offset],
      );
      return {
        items: rows.map(summary),
        total: Number(counts[0].n),
        offset: q.offset,
        limit: q.limit,
        scope: all ? "all" : "own",
        from: q.from,
        to: q.to,
      };
    });
  }
  async detail(actor: string, rawId: unknown) {
    const id = parseId(rawId);
    return this.scoped(actor, async (db, access) => {
      const all = access.permissions.some((p) => p.code === "audit.view_all");
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT ${fields},reason,details FROM audit_event_view WHERE id=?${all ? "" : " AND actor_id=?"}`,
        [id, ...(all ? [] : [actor])],
      );
      if (!rows.length)
        throw new AuthError(
          404,
          "AUDIT_EVENT_NOT_FOUND",
          "Audit event not found in your scope.",
        );
      const details = redactAuditDetails(decode(rows[0].details));
      return {
        ...summary(rows[0]),
        reason: rows[0].reason as string | null,
        context: auditContext(details),
        details,
      };
    });
  }
}
export type AuditList = Awaited<ReturnType<AuditService["list"]>>;
export type AuditDetail = Awaited<ReturnType<AuditService["detail"]>>;
