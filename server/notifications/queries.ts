import type { PoolConnection } from "mysql2/promise";
import { notificationSources, reviewerSql } from "./sources.js";

export type NoticeFilters = { mode: "updates" | "pending"; offset: number; limit: number; type?: string; source?: string; year?: string; semester?: string; unread?: boolean };
type Projection = "count" | "page" | "periods" | "details" | "groups";
const fields = (s: typeof notificationSources[number]) => ({
  kind: `'${s.kind}'`, source_id: s.id ?? "q.id", owner_id: s.owner,
  read_permission: s.readExpression ?? `'${s.read}'`, pending_permission: s.permission,
  owner_only: `COALESCE(${s.ownerOnly ?? "0"},0)`, state: s.state, title: s.title,
  source_time: s.time, year_id: s.year ?? "NULL", semester_id: s.semester ?? "NULL",
  scholar_id: s.scholar ?? "NULL", cycle_id: s.cycle ?? "NULL", batch_id: s.batch ?? "NULL",
  revision: s.revision ?? "NULL", annual_id: s.annual ?? "NULL",
});

/** Push audience, source and period predicates into each existing source branch.
 * Count/period reads never project workflow details. Only selected page keys are
 * hydrated. No source outcome, event audience or ownership rule is duplicated.
 */
export function notificationQuery(db: PoolConnection, actor: string, permissions: string[], input: NoticeFilters, projection: Projection, keys?: string[]) {
  const allowed = permissions.length ? permissions.map(p => db.escape(p)).join(",") : "NULL", user = db.escape(actor), pending = input.mode === "pending";
  const branches = notificationSources.filter(s => (s.readExpression ? permissions.includes("scholars.export") || permissions.includes("audit.view_all") : permissions.includes(s.read)) && (!pending || s.permission !== "NULL")).map(s => {
    const f = fields(s), boundary = s.from.indexOf(" WHERE q."), source = boundary < 0 ? s.from : s.from.slice(0, boundary);
    const from = `${source}${pending ? "" : ` JOIN notification_events n ON n.kind='${s.kind}' AND n.source_id=${f.source_id} LEFT JOIN notification_reads nr ON nr.event_id=n.id AND nr.user_id=${user}`}`;
    const where = [boundary < 0 ? null : s.from.slice(boundary + 7), `${f.read_permission} IN (${allowed})`, pending
      ? `${s.permission} IN (${allowed}) AND (${f.owner_only}=0 OR ${s.owner}=${user})`
      : `((n.owner_id=${user} AND (n.actor_id IS NULL OR n.actor_id<>${user} OR n.kind IN ('import','export'))) OR (${reviewerSql}) IN (${allowed}))`,
      // Keep the database's original case/accent/trailing-space comparison. SQL
      // folds impossible literal branches before reading their source tables.
      input.type && `${f.kind}=${db.escape(input.type)}`,
      input.source && `${f.source_id}=${db.escape(input.source)}`, input.year && `${f.year_id}=${db.escape(input.year)}`, input.semester && `${f.semester_id}=${db.escape(input.semester)}`,
      !pending && input.unread && "nr.event_id IS NULL",
      keys && `${pending ? `CONCAT('${s.kind}',':',${f.source_id})` : "n.id"} IN (${keys.map(k => db.escape(k)).join(",") || "NULL"})`,
    ].filter(Boolean).join(" AND ");
    const id = pending ? `CONCAT('${s.kind}',':',${f.source_id})` : "n.id", time = pending ? s.time : "n.occurred_at";
    const select = projection === "count" ? "COUNT(*) AS count" : projection === "groups" ? `'${s.kind}' AS type,COUNT(*) AS count` : projection === "periods" ? `${f.year_id} AS year_id,${f.semester_id} AS semester_id` : projection === "page" ? `${id} AS notice_id,${time} AS sort_time` : `${Object.entries(f).map(([k,v]) => `${v} AS ${k}`).join(",")},${pending && s.kind === "payroll" ? "EXISTS(SELECT 1 FROM payroll_submission_windows w WHERE w.batch_id=q.id)" : "0"} AS managed_batch,${id} AS notice_id,${pending ? "NULL" : "n.action"} AS event_action,${pending ? "0" : "nr.event_id IS NOT NULL"} AS is_read,DATE_FORMAT(${time},'%Y-%m-%dT%H:%i:%s.%fZ') AS event_time`;
    // Each branch contributes at most offset+limit keys to the global sort.
    return `(SELECT ${projection === "periods" ? "DISTINCT " : ""}${select} FROM ${from} WHERE ${where}${projection === "page" ? ` ORDER BY sort_time ${pending ? "ASC" : "DESC"},notice_id LIMIT ${input.offset + input.limit}` : ""})`;
  });
  if (!branches.length) return null;
  const union = branches.join(" UNION ALL ");
  if (projection === "count") return `SELECT SUM(count) AS count FROM (${union}) counts`;
  if (projection === "groups") return `SELECT type,count FROM (${union}) groups_ WHERE count>0 ORDER BY type`;
  if (projection === "page") return `SELECT notice_id FROM (${union}) page_ ORDER BY sort_time ${pending ? "ASC" : "DESC"},notice_id LIMIT ${input.limit} OFFSET ${input.offset}`;
  if (projection === "periods") return `SELECT DISTINCT p.year_id,y.code,p.semester_id,sem.name FROM (${union}) p LEFT JOIN academic_years y ON y.id=p.year_id LEFT JOIN semesters sem ON sem.id=p.semester_id ORDER BY y.code,sem.name`;
  return `SELECT p.*,ident.human_id,y.code AS year_label,sem.name AS semester_label FROM (${union}) p LEFT JOIN academic_years y ON y.id=p.year_id LEFT JOIN semesters sem ON sem.id=p.semester_id LEFT JOIN scholar_identifiers ident ON ident.scholar_id=p.scholar_id`;
}
