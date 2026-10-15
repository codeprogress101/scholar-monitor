import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";

export type CoverageYear = { id: string; version: number; starts: string; ends: string };
export type CoverageTerm = CoverageYear & { yearId: string; name: string; termKind?: "first" | "second" | "other" | null };
export type CoverageMapping = { cycleId: string; semesterId: string; yearId: string; term: number; semesterVersion: number; yearVersion: number };
export type RegularCoverage = { predecessorId: string; predecessorName: string; sourceHash: string };
function review(message: string): never { throw new AuthError(409, "PREDECESSOR_REVIEW_REQUIRED", message); }

/** Regular term identity determines sequence. Dates only validate that sequence. */
export function resolveRegularCoverage(currentId: string, terms: CoverageTerm[], years: CoverageYear[], mappings: CoverageMapping[]): RegularCoverage | null {
  mappings = calendarMappings(terms, years, mappings);
  const mapped = mappings.find((m) => m.semesterId === currentId);
  if (!mapped) return null; // Compatibility path; never silently assign regular term identities.
  const current = terms.find((t) => t.id === currentId), year = years.find((y) => y.id === mapped.yearId);
  const valid = (mapping: CoverageMapping, term: CoverageTerm | undefined, parent: CoverageYear | undefined) => Boolean(term && parent && term.yearId === parent.id && mapping.yearId === parent.id && term.version === mapping.semesterVersion && parent.version === mapping.yearVersion && term.starts >= parent.starts && term.ends <= parent.ends);
  if (!valid(mapped, current, year) || !current || !year) review("Regular semester configuration changed. Ask the Coordinator to review its payout-period mapping before using COG coverage.");
  let priorYear = year;
  if (mapped.term === 1) {
    if (years.some((y) => y.id !== year.id && y.starts < year.starts && y.ends >= year.starts)) review("Academic years overlap. Review the calendar before selecting the preceding semester.");
    const earlier = years.filter((y) => y.ends < year.starts).sort((a, b) => b.ends.localeCompare(a.ends));
    if (!earlier[0] || earlier[1]?.ends === earlier[0].ends) review("Configure an unambiguous preceding academic year and its regular second semester. Earlier dates alone do not establish COG coverage.");
    priorYear = earlier[0];
  } else if (mapped.term !== 2) review("Only configured regular first and second semesters support this coverage path.");
  const expectedNumber = mapped.term === 2 ? 1 : 2;
  const candidates = mappings.filter((m) => m.yearId === priorYear.id && m.term === expectedNumber);
  const priorMap = candidates[0], prior = priorMap && terms.find((t) => t.id === priorMap.semesterId);
  if (candidates.length !== 1 || !priorMap || !valid(priorMap, prior, priorYear) || !prior)
    review("Map the immediately preceding regular semester first. Missing or changed mappings require Coordinator review; do not choose an arbitrary earlier semester.");
  if (mapped.term === 1 && Number(year.starts.slice(0, 4)) - Number(priorYear.starts.slice(0, 4)) !== 1)
    review("The configured academic years are not consecutive. Review the missing or irregular calendar before using prior-year COG coverage.");
  if (prior.ends >= current.starts) review("The mapped preceding semester is not completed before this semester starts. Review the academic calendar.");
  if (terms.some((t) => t.id !== current.id && t.id !== prior.id && t.starts < current.starts && t.ends >= prior.starts))
    review("Another semester overlaps or intervenes in the required COG coverage. Summer, irregular or conflicting calendars need explicit review before this regular-semester path can be used.");
  const sourceHash = digest(JSON.stringify({ rule: "regular-predecessor-v1", current, year, mapping: mapped, predecessor: prior, predecessorYear: priorYear, predecessorMapping: priorMap }));
  return { predecessorId: prior.id, predecessorName: prior.name, sourceHash };
}

export async function regularCoverage(db: PoolConnection, semesterId: string) {
  const [terms] = await db.query<RowDataPacket[]>("SELECT id,name,term_kind AS termKind,academic_year_id AS yearId,version,DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends FROM semesters ORDER BY id LOCK IN SHARE MODE");
  const [years] = await db.query<RowDataPacket[]>("SELECT id,version,DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends FROM academic_years ORDER BY id LOCK IN SHARE MODE");
  const [mappings] = await db.query<RowDataPacket[]>("SELECT cycle_id AS cycleId,semester_id AS semesterId,academic_year_id AS yearId,term_number AS term,semester_version AS semesterVersion,year_version AS yearVersion FROM regular_payout_periods ORDER BY cycle_id LOCK IN SHARE MODE");
  return resolveRegularCoverage(semesterId, terms as CoverageTerm[], years as CoverageYear[], mappings as CoverageMapping[]);
}

export async function requireRegularCoverage(db: PoolConnection, semesterId: string, predecessorId: string) {
  const coverage = await regularCoverage(db, semesterId);
  if (coverage && predecessorId !== coverage.predecessorId) review(`COG must cover ${coverage.predecessorName}, the immediately preceding regular semester. Ask the Coordinator to review the saved coverage; existing documents will not be moved.`);
  return coverage;
}

export type CoverageOption = { mode: "legacy" | "regular"; predecessorId: string | null; predecessorName: string | null; sourceHash: string | null; issue: string | null };
export async function regularCoverageOption(db: PoolConnection, semesterId: string): Promise<CoverageOption> {
  try {
    const c = await regularCoverage(db, semesterId);
    return { mode: c ? "regular" : "legacy", predecessorId: c?.predecessorId ?? null, predecessorName: c?.predecessorName ?? null, sourceHash: c?.sourceHash ?? null, issue: null };
  } catch (e) {
    if (!(e instanceof AuthError) || e.code !== "PREDECESSOR_REVIEW_REQUIRED") throw e;
    return { mode: "regular", predecessorId: null, predecessorName: null, sourceHash: null, issue: e.message };
  }
}

/** Calendar identity is authoritative; legacy payout identities remain readable, never guessed from labels. */
export function calendarMappings(terms: CoverageTerm[], years: CoverageYear[], legacy: CoverageMapping[]): CoverageMapping[] {
  return terms.flatMap(t => {
    const rows = legacy.filter(m => m.semesterId === t.id);
    if (!t.termKind) return rows;
    const term = t.termKind === "first" ? 1 : t.termKind === "second" ? 2 : 0;
    if (rows.some(m => m.term !== term || m.yearId !== t.yearId)) review("Calendar semester identity conflicts with the payout mapping. Review the configuration before receiving or assessment.");
    const year = years.find(y => y.id === t.yearId);
    if (!year) review("The semester academic year is unavailable.");
    return [{ cycleId: `calendar:${t.id}`, semesterId: t.id, yearId: t.yearId, term, semesterVersion: t.version, yearVersion: year.version }];
  });
}

export async function semesterIdentity(db: PoolConnection, semesterId: string) {
  const [[s]] = await db.execute<RowDataPacket[]>("SELECT s.term_kind,s.version,s.academic_year_id,y.version AS year_version FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=? LOCK IN SHARE MODE", [semesterId]);
  const [rows] = await db.execute<RowDataPacket[]>("SELECT term_number,academic_year_id,semester_version,year_version FROM regular_payout_periods WHERE semester_id=? LOCK IN SHARE MODE", [semesterId]);
  const explicit = s?.term_kind === "first" ? 1 : s?.term_kind === "second" ? 2 : s?.term_kind === "other" ? 0 : null;
  const [peers] = s?.term_kind ? await db.execute<RowDataPacket[]>("SELECT id FROM semesters WHERE academic_year_id=? AND term_kind=? LOCK IN SHARE MODE", [s.academic_year_id, s.term_kind]) : [[]];
  const conflict = peers.length > 1 || explicit !== null && rows.some(r => r.term_number !== explicit || r.academic_year_id !== s.academic_year_id);
  const legacy = rows.length === 1 && rows[0].semester_version === s?.version && rows[0].year_version === s?.year_version ? rows[0].term_number as number : null;
  return { term: conflict ? null : explicit ?? legacy, conflict, source: { calendar: s ?? null, mappings: rows } };
}
