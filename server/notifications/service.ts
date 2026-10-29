import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { pendingAction } from "./pending-action.js";
import { notificationQuery, type NoticeFilters } from "./queries.js";

const querySchema = z.object({ mode: z.enum(["updates", "pending"]).default("updates"), offset: z.coerce.number().int().min(0).max(100000).default(0), limit: z.coerce.number().int().min(1).max(100).default(25), type: z.string().max(40).optional(), source: z.uuid().optional(), year: z.uuid().optional(), semester: z.uuid().optional(), unread: z.enum(["true", "false"]).transform(v => v === "true").optional() }).strict();
export function parseNoticeFilters(raw: unknown): NoticeFilters {
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Choose valid notification filters.");
  return parsed.data;
}
export type Notice = { id: string; kind: string; sourceId: string; title: string; state: string; action: string | null; nextAction?: string | null; occurredAt: string; read: boolean; year: string | null; semester: string | null; href: string; revision: number | null };
export type NoticeList = { items: Notice[]; total: number; unread: number; pending: number; groups: { type: string; count: number }[]; years: { id: string; label: string }[]; semesters: { id: string; label: string }[]; offset: number; limit: number };
export type NoticePage = Pick<NoticeList, "items" | "total" | "offset" | "limit">;
export type NoticePending = Pick<NoticeList, "pending" | "groups">;
export type NoticePeriods = Pick<NoticeList, "years" | "semesters">;
export function noticeLink(r: Record<string, unknown>, pending = false) {
  const params = new URLSearchParams({ request: String(r.source_id), ...(r.revision == null ? {} : { version: String(r.revision) }) });
  let page = "scholars";
  if (r.kind === "account" || r.kind === "export") return `#notifications?type=${r.kind}&source=${r.source_id}`;
  else if (r.kind === "masterlist" || r.kind === "masterlist-amendment") { page = "masterlists"; params.set("draft", String(r.kind === "masterlist" ? r.source_id : r.batch_id)); if(pending && r.kind === "masterlist" && r.state === "published")params.set("workflow","1"); }
  else if (r.kind === "roster") { params.set("roster", String(r.source_id)); page = "continuing"; }
  else if (["payroll", "payroll-amendment", "payment-correction", "override"].includes(String(r.kind))) { page = "payouts"; params.set("cycle", String(r.cycle_id)); if (r.batch_id) params.set("batch", String(r.batch_id)); if (r.kind === "override") { params.set("view","eligibility"); params.set("annual",String(r.annual_id)); } }
  else if (r.kind === "import") params.set("importJob", String(r.source_id));
  else {
    params.set("scholar", String(r.scholar_id));
    params.set("section", r.kind === "academic" ? "academic" : r.kind === "document" ? "requirements" : "scholarship");
    if (r.year_id) params.set("academicYear", String(r.year_id));
    if (r.kind === "document") { params.set("document", String(r.source_id)); }
  }
  if(pending && r.kind === "payroll") {
    if(r.state === "processed" && Number(r.managed_batch))params.set("view",r.pending_permission === "ovr.close"?"reconciliation":"recording");
    else if(["finalized","submitted","processed"].includes(String(r.state)))params.set("task","processing");
  }
  return `#${page}?${params}`;
}

const base: NoticeFilters = { mode: "updates", offset: 0, limit: 25 };
async function rows(db: PoolConnection, sql: string | null) { return sql ? (await db.query<RowDataPacket[]>(sql))[0] : []; }
async function count(db: PoolConnection, actor: string, permissions: string[], input: NoticeFilters) {
  const result = await rows(db, notificationQuery(db, actor, permissions, input, "count"));
  return Number(result[0]?.count ?? 0);
}
async function page(db: PoolConnection, actor: string, permissions: string[], input: NoticeFilters): Promise<NoticePage> {
  const total = await count(db, actor, permissions, input);
  const selected = await rows(db, notificationQuery(db, actor, permissions, input, "page"));
  const keys = selected.map(r => String(r.notice_id));
  const details = keys.length ? await rows(db, notificationQuery(db, actor, permissions, input, "details", keys)) : [];
  const byId = new Map(details.map(r => [String(r.notice_id), r]));
  return { items: keys.map(id => {
    const r = byId.get(id)!;
    return { id: r.notice_id, kind: r.kind, sourceId: r.source_id, title: r.title + (r.human_id ? ` / ${r.human_id}` : ""), state: r.state, action: r.event_action, occurredAt: r.event_time, read: Boolean(r.is_read), year: r.year_label ?? null, semester: r.semester_label ?? null, href: noticeLink(r, input.mode === "pending"), ...(input.mode === "pending" ? {nextAction: pendingAction(r.pending_permission,r.state)} : {}), revision: r.revision == null ? null : Number(r.revision) };
  }), total, offset: input.offset, limit: input.limit };
}
async function pending(db: PoolConnection, actor: string, permissions: string[]): Promise<NoticePending> {
  const groups = (await rows(db, notificationQuery(db, actor, permissions, { ...base, mode: "pending" }, "groups"))).map(r => ({ type: String(r.type), count: Number(r.count) }));
  return { pending: groups.reduce((sum, r) => sum + r.count, 0), groups };
}
async function periods(db: PoolConnection, actor: string, permissions: string[], input: NoticeFilters): Promise<NoticePeriods> {
  const result = await rows(db, notificationQuery(db, actor, permissions, { ...base, mode: input.mode }, "periods"));
  return { years: [...new Map(result.filter(r => r.year_id).map(r => [r.year_id, { id: String(r.year_id), label: String(r.code) }])).values()], semesters: [...new Map(result.filter(r => r.semester_id).map(r => [r.semester_id, { id: String(r.semester_id), label: String(r.name) }])).values()] };
}
export class NotificationService {
  constructor(private authorization: AuthorizationService) {}
  // Legacy clients retain the complete DTO and one consistent authorized snapshot.
  async read(actor: string, raw: unknown) {
    const input = parseNoticeFilters(raw);
    return this.authorization.readSnapshot(actor, null, async (db, access): Promise<NoticeList> => {
      const permissions = access.permissions.map(p => p.code);
      return { ...await page(db, actor, permissions, input), unread: await count(db, actor, permissions, { ...base, unread: true }), ...await pending(db, actor, permissions), ...await periods(db, actor, permissions, input) };
    });
  }
  async page(actor: string, raw: unknown) {
    const input = parseNoticeFilters(raw);
    return this.authorization.readSnapshot(actor, null, (db, access) => page(db, actor, access.permissions.map(p => p.code), input));
  }
  async count(actor: string) {
    return this.authorization.readSnapshot(actor, null, async (db, access) => ({ unread: await count(db, actor, access.permissions.map(p => p.code), { ...base, unread: true }) }));
  }
  async pending(actor: string) {
    return this.authorization.readSnapshot(actor, null, (db, access) => pending(db, actor, access.permissions.map(p => p.code)));
  }
  async periods(actor: string, raw: unknown) {
    const input = parseNoticeFilters(raw);
    return this.authorization.readSnapshot(actor, null, (db, access) => periods(db, actor, access.permissions.map(p => p.code), input));
  }
  async mark(actor: string, id: string, raw: unknown) {
    if (!z.uuid().safeParse(id).success || !z.object({ read: z.boolean() }).strict().safeParse(raw).success) throw new AuthError(422, "VALIDATION_FAILED", "Choose a notification and read state.");
    return this.authorization.withAccess(actor, async (db, access) => {
      const result = await rows(db, notificationQuery(db, actor, access.permissions.map(p => p.code), base, "count", [id]));
      if (!Number(result[0]?.count)) throw new AuthError(404, "NOTIFICATION_NOT_FOUND", "This notification is unavailable for your account.");
      if ((raw as { read: boolean }).read) await db.execute("INSERT INTO notification_reads(user_id,event_id,read_at) VALUES(?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE read_at=read_at", [actor,id]);
      else await db.execute("DELETE FROM notification_reads WHERE user_id=? AND event_id=?", [actor,id]);
      return { saved: true };
    });
  }
}
