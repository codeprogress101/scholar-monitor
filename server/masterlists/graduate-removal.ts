import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { workingYear } from "../configuration/calendar.js";

/** Called within the graduation approval transaction and configuration guard. */
export async function removeGraduateFromDrafts(db: PoolConnection, scholar: string, actor: string, requestId: string, effectiveOn: string) {
  const calendar = await workingYear(db);
  const [lists] = await db.execute<RowDataPacket[]>(`SELECT m.id,m.version FROM masterlist_versions m
    JOIN academic_years y ON y.id=m.academic_year_id JOIN masterlist_entries e ON e.masterlist_id=m.id
    WHERE e.scholar_id=? AND e.removed_at IS NULL AND m.status='draft' AND y.locked_at IS NULL AND y.archived_at IS NULL
    AND NOT EXISTS(SELECT 1 FROM masterlist_consolidations c WHERE c.draft_id=m.id)
    AND y.ends_on>=? AND (? IS NULL OR y.starts_on>=(SELECT starts_on FROM academic_years WHERE id=?))
    ORDER BY m.id FOR UPDATE`, [scholar,effectiveOn,calendar?.yearId ?? null,calendar?.yearId ?? null]);
  for (const list of lists) {
    await db.execute("UPDATE masterlist_entries SET removed_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6) WHERE masterlist_id=? AND scholar_id=? AND removed_at IS NULL", [list.id,scholar]);
    await db.execute("UPDATE masterlist_versions SET version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?", [list.id]);
    await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'masterlist.graduate-removed','masterlist',?,'remove',?,'user',UTC_TIMESTAMP(6),?,'Graduated scholar removed from editable draft',?)", [randomUUID(),list.id,actor,requestId,JSON.stringify({scholarId:scholar,version:list.version+1,automatic:true,effectiveOn})]);
  }
  return lists.map(list => String(list.id));
}
