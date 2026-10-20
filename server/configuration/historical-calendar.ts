import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import type { AuthorizationService } from "../authorization/service.js";
import { workingYear } from "./calendar.js";
import { parseKey } from "./validation.js";

const period = z.object({ code: z.string().regex(/^[A-Z0-9][A-Z0-9_-]{1,59}$/), name: z.string().trim().min(2).max(160), startsOn: z.iso.date(), endsOn: z.iso.date() });
export const historicalCalendarSchema = z.object({
  workingYearId: z.uuid(), expectedWorkingYearVersion: z.number().int().positive(), expectedSettingVersion: z.number().int().positive(),
  year: period.strict(), semester: period.extend({ termKind: z.enum(["first", "second"]) }).strict(),
  reviewed: z.literal(true), reason: z.string().trim().min(5).max(500), reference: z.string().trim().min(3).max(300),
}).strict();

/** Explicit historical coverage creation; never an academic-year rollover. */
export function historicalCalendar(authorization: AuthorizationService, actor: string, rawKey: unknown, raw: unknown, requestId: string) {
  const key = parseKey(rawKey), parsed = historicalCalendarSchema.safeParse(raw);
  if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Review the historical dates, regular semester identity, working-year revision and authority reference.");
  const input = parsed.data, hash = digest(JSON.stringify({ operation: "calendar.historical", input }));
  return authorization.withPermission(actor, "configuration.manage", async (db, access) => {
    if (!access.roles.some(r => r.code === "system_admin")) throw new AuthError(403, "PERMISSION_DENIED", "Historical calendar configuration requires an Administrator.");
    await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
    const [[prior]] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
    if (prior) {
      if (prior.payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This key belongs to another historical-calendar command.");
      return (typeof prior.result === "string" ? JSON.parse(prior.result) : prior.result) as { yearId: string; semesterId: string };
    }
    const working = await workingYear(db);
    const [[current]] = await db.execute<RowDataPacket[]>("SELECT version,DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts FROM academic_years WHERE id=? FOR UPDATE", [input.workingYearId]);
    if (!working || working.yearId !== input.workingYearId || working.version !== input.expectedSettingVersion || current?.version !== input.expectedWorkingYearVersion)
      throw new AuthError(409, "VERSION_CONFLICT", "The working calendar changed. Refresh before adding historical coverage.");
    const y = input.year, s = input.semester;
    if (y.startsOn < "1900-01-01" || y.startsOn > y.endsOn || y.endsOn >= current.starts || s.startsOn < y.startsOn || s.endsOn > y.endsOn || s.startsOn > s.endsOn)
      throw new AuthError(422, "HISTORICAL_PERIOD_INVALID", "Historical coverage must end before the working year and its semester must fall within the historical year.");
    const [years] = await db.query<RowDataPacket[]>("SELECT id,code,name,version,archived_at,locked_at,DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends FROM academic_years FOR UPDATE");
    const sameYear = years.find(r => r.code === y.code);
    if (sameYear && (sameYear.name !== y.name || sameYear.starts !== y.startsOn || sameYear.ends !== y.endsOn || sameYear.archived_at || sameYear.locked_at))
      throw new AuthError(409, "HISTORICAL_CALENDAR_CONFLICT", "The existing historical year differs. Review it without replacing it.");
    if (years.some(r => r.id !== sameYear?.id && r.starts <= y.endsOn && r.ends >= y.startsOn))
      throw new AuthError(409, "ACADEMIC_YEAR_OVERLAP", "Historical dates overlap an existing academic year.");
    const yearId = sameYear?.id ?? randomUUID();
    const [semesters] = await db.query<RowDataPacket[]>("SELECT id,code,name,academic_year_id,term_kind,archived_at,locked_at,DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends FROM semesters FOR UPDATE");
    const sameSemester = semesters.find(r => r.code === s.code);
    if (sameSemester && (sameSemester.academic_year_id !== yearId || sameSemester.name !== s.name || sameSemester.term_kind !== s.termKind || sameSemester.starts !== s.startsOn || sameSemester.ends !== s.endsOn || sameSemester.archived_at || sameSemester.locked_at))
      throw new AuthError(409, "HISTORICAL_CALENDAR_CONFLICT", "The existing historical semester differs. Review it without replacing it.");
    if (semesters.some(r => r.id !== sameSemester?.id && (r.starts <= s.endsOn && r.ends >= s.startsOn || r.academic_year_id === yearId && r.term_kind === s.termKind)))
      throw new AuthError(409, "SEMESTER_IDENTITY_CONFLICT", "Historical semester coverage overlaps or duplicates an existing regular term.");
    const semesterId = sameSemester?.id ?? randomUUID();
    if (!sameYear) await db.execute("INSERT INTO academic_years(id,code,name,starts_on,ends_on,version,created_at,updated_at) VALUES(?,?,?,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [yearId,y.code,y.name,y.startsOn,y.endsOn]);
    if (!sameSemester) await db.execute("INSERT INTO semesters(id,code,name,academic_year_id,term_kind,starts_on,ends_on,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [semesterId,s.code,s.name,yearId,s.termKind,s.startsOn,s.endsOn]);
    const result = { yearId: String(yearId), semesterId: String(semesterId) };
    await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'configuration.historical_calendar','semester',?,'create_historical',?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(),semesterId,actor,requestId,input.reason,JSON.stringify({input,result,reusedYear:Boolean(sameYear),reusedSemester:Boolean(sameSemester),workingYearUnchanged:true,idempotency_key:key})]);
    await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,'calendar.historical',?,?,UTC_TIMESTAMP(6))",[actor,key,hash,JSON.stringify(result)]);
    return result;
  });
}
