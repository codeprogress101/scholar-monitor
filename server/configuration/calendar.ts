import { rolloverSummary } from "./rollover.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import { requireReconciledBatches } from "../payouts/closure.js";
import { parseId } from "./validation.js";
import type { ConfigCommand, ConfigKind, ConfigRecord } from "./model.js";

export const WORKING_YEAR = "LDSS_WORKING_ACADEMIC_YEAR";
export async function workingYear(db: PoolConnection) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT id,version,setting_value FROM system_settings WHERE code=? AND archived_at IS NULL LOCK IN SHARE MODE", [WORKING_YEAR]);
  return rows[0] ? { id: String(rows[0].id), version: Number(rows[0].version), yearId: String(rows[0].setting_value) } : null;
}
// Caller holds configuration_guard, shared by calendar and payout writers.
export async function calendarState(db: PoolConnection) {
  const setting = await workingYear(db);
  if (!setting) return { setting: null, semesters: [], readyForNext: false, rollover: null };
  const [semesters] = await db.execute<RowDataPacket[]>("SELECT id,code FROM semesters WHERE academic_year_id=? ORDER BY starts_on,id LOCK IN SHARE MODE", [setting.yearId]);
  const results = [];
  for (const semester of semesters) {
    const [cycles] = await db.execute<RowDataPacket[]>("SELECT c.id,c.code,v.state FROM payout_cycles c JOIN payout_cycle_versions v ON v.cycle_id=c.id WHERE c.semester_id=? ORDER BY c.id,v.version DESC LOCK IN SHARE MODE", [semester.id]);
    const seen = new Set<string>();
    const latest = cycles.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    results.push({ id: String(semester.id), code: String(semester.code), cycles: latest.map(c => ({ id: String(c.id), code: String(c.code), state: String(c.state) })), complete: latest.length > 0 && latest.every(c => c.state === "closed") });
  }
  return { setting, rollover: await rolloverSummary(db, setting.yearId), semesters: results, readyForNext: results.length === 2 && results.every(s => s.complete) };
}
export async function requireCompletedYear(db: PoolConnection) {
  const state = await calendarState(db);
  if (!state.readyForNext) throw new AuthError(409, "ACADEMIC_YEAR_UNFINISHED", "Complete both semesters and formally close every payroll cycle before starting another academic year.");
  for (const semester of state.semesters) for (const cycle of semester.cycles) await requireReconciledBatches(db, cycle.id);
}
export async function guardCalendar(db: PoolConnection, kind: ConfigKind, input: ConfigCommand, before: ConfigRecord | null) {
  const current = await workingYear(db);
  const settingCommand = kind === "settings" && (before?.code ?? input.fields?.code) === WORKING_YEAR;
  if (settingCommand) {
    if (!["create", "update"].includes(input.action) || input.fields?.valueType !== "text") throw new AuthError(409, "CALENDAR_SETTING_PROTECTED", "The working-year setting cannot be archived or disabled.");
    const yearId = parseId(input.fields.value);
    const [years] = await db.execute<RowDataPacket[]>("SELECT id,locked_at,archived_at,DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts_on FROM academic_years WHERE id=? LOCK IN SHARE MODE", [yearId]);
    if (!years[0] || years[0].locked_at || years[0].archived_at) throw new AuthError(409, "CALENDAR_YEAR_UNAVAILABLE", "Choose an existing unlocked, unarchived academic year.");
    const [semesters] = await db.execute<RowDataPacket[]>("SELECT id FROM semesters WHERE academic_year_id=? LOCK IN SHARE MODE", [yearId]);
    if (semesters.length > 2) throw new AuthError(409, "CALENDAR_SEMESTER_LIMIT", "Review this year's semester setup before selecting it; two semesters are supported.");
    if (current && current.yearId !== yearId) {
      await requireCompletedYear(db);
      await requireLaterYear(db, current.yearId, years[0].starts_on);
      return current;
    }
  }
  if (!current) return null; // Explicit one-time adoption preserves legacy installations and historical fixtures.
  if (kind === "academic-years" && input.action === "create") {
    await requireCompletedYear(db);
    await requireLaterYear(db, current.yearId, input.fields!.startsOn!);
    return current;
  }
  if (kind === "academic-years" && before?.id === current.yearId && ["archive", "lock"].includes(input.action)) await requireCompletedYear(db);
  if (kind === "semesters" && ["create", "restore"].includes(input.action)) {
    const yearId = before?.academicYearId ?? input.fields!.academicYearId;
    if (yearId !== current.yearId) throw new AuthError(409, "WORKING_YEAR_REQUIRED", "Add semesters only to the working academic year.");
    const [rows] = await db.execute<RowDataPacket[]>("SELECT id FROM semesters WHERE academic_year_id=? LOCK IN SHARE MODE", [yearId]);
    if (input.action === "create" && rows.length >= 2) throw new AuthError(409, "CALENDAR_SEMESTER_LIMIT", "This academic year already has its two semesters. Retain them for history.");
  }
  return null;
}
async function requireLaterYear(db: PoolConnection, yearId: string, startsOn: string) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends_on FROM academic_years WHERE id=? LOCK IN SHARE MODE", [yearId]);
  if (!rows[0] || startsOn <= rows[0].ends_on) throw new AuthError(409, "ACADEMIC_YEAR_OVERLAP", "The next academic year must start after the working year's end date.");
}
