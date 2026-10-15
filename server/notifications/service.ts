import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { sourceSql, reviewerSql } from "./sources.js";

const querySchema = z.object({ mode: z.enum(["updates", "pending"]).default("updates"), offset: z.coerce.number().int().min(0).max(100000).default(0), type: z.string().max(40).optional(), source: z.uuid().optional(), year: z.uuid().optional(), semester: z.uuid().optional() }).strict();
export type Notice = { id: string; kind: string; sourceId: string; title: string; state: string; action: string | null; occurredAt: string; read: boolean; year: string | null; semester: string | null; href: string; revision: number | null };
export type NoticeList = { items: Notice[]; total: number; unread: number; pending: number; groups: { type: string; count: number }[]; years: { id: string; label: string }[]; semesters: { id: string; label: string }[]; offset: number; limit: number };
export function noticeLink(r: Record<string, unknown>) {
  const params = new URLSearchParams({ request: String(r.source_id), ...(r.revision == null ? {} : { version: String(r.revision) }) });
  let page = "scholars";
  if (r.kind === "account" || r.kind === "export") return `#notifications?type=${r.kind}&source=${r.source_id}`;
  else if (r.kind === "masterlist" || r.kind === "masterlist-amendment") { page = "masterlists"; params.set("draft", String(r.kind === "masterlist" ? r.source_id : r.batch_id)); }
  else if (r.kind === "roster") { params.set("roster", String(r.source_id)); page = "continuing"; }
  else if (["payroll", "payroll-amendment", "payment-correction", "override"].includes(String(r.kind))) { page = "payouts"; params.set("cycle", String(r.cycle_id)); if (r.batch_id) params.set("batch", String(r.batch_id)); if (r.kind === "override") { params.set("view","eligibility"); params.set("annual",String(r.annual_id)); } }
  else if (r.kind === "import") params.set("importJob", String(r.source_id));
  else {
    params.set("scholar", String(r.scholar_id));
    params.set("section", r.kind === "academic" ? "academic" : r.kind === "document" ? "requirements" : "scholarship");
    if (r.year_id) params.set("academicYear", String(r.year_id));
    if (r.kind === "document") { params.set("document", String(r.source_id)); }
  }
  return `#${page}?${params}`;
}
export class NotificationService {
  constructor(private authorization: AuthorizationService) {}
  async read(actor: string, raw: unknown) {
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Choose valid notification filters.");
    const input = parsed.data;
    return this.authorization.readSnapshot(actor, null, async (db, access): Promise<NoticeList> => {
      const permissions = access.permissions.map(p => p.code);
      const allowed = permissions.length ? permissions.map(p => db.escape(p)).join(",") : "NULL";
      const user = db.escape(actor);
      const readable = `s.read_permission IN (${allowed})`;
      const pending = `${readable} AND s.pending_permission IN (${allowed}) AND (s.owner_only=0 OR s.owner_id=${user})`;
      const visible = `${readable} AND ((n.owner_id=${user} AND (n.actor_id IS NULL OR n.actor_id<>${user} OR n.kind IN ('import','export'))) OR (${reviewerSql}) IN (${allowed}))`;
      const sources = `(${sourceSql}) s`;
      const events = `notification_events n JOIN ${sources} ON s.kind=n.kind AND s.source_id=n.source_id LEFT JOIN notification_reads nr ON nr.event_id=n.id AND nr.user_id=${user}`;
      const [unread] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM ${events} WHERE ${visible} AND nr.event_id IS NULL`);
      const [groups] = await db.query<RowDataPacket[]>(`SELECT s.kind,COUNT(*) AS count FROM ${sources} WHERE ${pending} GROUP BY s.kind`);
      const filter = `${input.source ? ` AND s.source_id=${db.escape(input.source)}` : ""}${input.type ? ` AND s.kind=${db.escape(input.type)}` : ""}${input.year ? ` AND s.year_id=${db.escape(input.year)}` : ""}${input.semester ? ` AND s.semester_id=${db.escape(input.semester)}` : ""}`;
      const isPending = input.mode === "pending";
      const from = `${isPending ? sources : events} LEFT JOIN academic_years y ON y.id=s.year_id LEFT JOIN semesters sem ON sem.id=s.semester_id LEFT JOIN scholar_identifiers ident ON ident.scholar_id=s.scholar_id`;
      const where = `${isPending ? pending : visible}${filter}`;
      const [totals] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM ${from} WHERE ${where}`);
      const [rows] = await db.query<RowDataPacket[]>(`SELECT s.*,ident.human_id,y.code AS year_label,sem.name AS semester_label,${isPending ? "CONCAT(s.kind,':',s.source_id)" : "n.id"} AS notice_id,${isPending ? "NULL" : "n.action"} AS event_action,${isPending ? "0" : "nr.event_id IS NOT NULL"} AS is_read,DATE_FORMAT(${isPending ? "s.source_time" : "n.occurred_at"},'%Y-%m-%dT%H:%i:%s.%fZ') AS event_time FROM ${from} WHERE ${where} ORDER BY ${isPending ? "s.source_time ASC" : "n.occurred_at DESC"},notice_id LIMIT 25 OFFSET ${input.offset}`);
      const [periods] = await db.query<RowDataPacket[]>(`SELECT DISTINCT s.year_id,y.code,s.semester_id,sem.name FROM ${from} WHERE ${isPending ? pending : visible} ORDER BY y.code,sem.name`);
      return { items: rows.map(r => ({ id: r.notice_id, kind: r.kind, sourceId: r.source_id, title: r.title + (r.human_id ? ` / ${r.human_id}` : ""), state: r.state, action: r.event_action, occurredAt: r.event_time, read: Boolean(r.is_read), year: r.year_label ?? null, semester: r.semester_label ?? null, href: noticeLink(r), revision: r.revision == null ? null : Number(r.revision) })), total: Number(totals[0].count), unread: Number(unread[0].count), pending: groups.reduce((sum, r) => sum + Number(r.count), 0), groups: groups.map(r => ({ type: r.kind, count: Number(r.count) })), years: [...new Map(periods.filter(r => r.year_id).map(r => [r.year_id, { id: r.year_id, label: r.code }])).values()], semesters: [...new Map(periods.filter(r => r.semester_id).map(r => [r.semester_id, { id: r.semester_id, label: r.name }])).values()], offset: input.offset, limit: 25 };
    });
  }
  async mark(actor: string, id: string, raw: unknown) {
    if (!z.uuid().safeParse(id).success || !z.object({ read: z.boolean() }).strict().safeParse(raw).success) throw new AuthError(422, "VALIDATION_FAILED", "Choose a notification and read state.");
    return this.authorization.withAccess(actor, async (db, access) => {
      const allowed = access.permissions.length ? access.permissions.map(p => db.escape(p.code)).join(",") : "NULL";
      const [rows] = await db.query<RowDataPacket[]>(`SELECT n.id FROM notification_events n JOIN (${sourceSql}) s ON s.kind=n.kind AND s.source_id=n.source_id WHERE n.id=? AND s.read_permission IN (${allowed}) AND ((n.owner_id=? AND (n.actor_id IS NULL OR n.actor_id<>? OR n.kind IN ('import','export'))) OR (${reviewerSql}) IN (${allowed}))`, [id, actor, actor]);
      if (!rows.length) throw new AuthError(404, "NOTIFICATION_NOT_FOUND", "This notification is unavailable for your account.");
      if ((raw as { read: boolean }).read) await db.execute("INSERT INTO notification_reads(user_id,event_id,read_at) VALUES(?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE read_at=read_at", [actor,id]);
      else await db.execute("DELETE FROM notification_reads WHERE user_id=? AND event_id=?", [actor,id]);
      return { saved: true };
    });
  }
}
