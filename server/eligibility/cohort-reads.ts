import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { cachedReads, primeRead } from "../read-cache.js";
import {omissionSourceSql} from '../payments/omission-source.js';

const chunkSize = 200;
function groupBy(rows: RowDataPacket[], key: string) {
  const groups = new Map<unknown, RowDataPacket[]>();
  for (const row of rows) {
    const group = groups.get(row[key]);
    if (group) group.push(row); else groups.set(row[key], [row]);
  }
  return groups;
}

/** Bulk-load the same locking source reads used by individual assessment.
 * No result cache survives this guarded transaction. Missing rows are explicit
 * empty results, never inferred eligibility. Finalization uses the same reader.
 * Exact SQL cache keys intentionally fall back to live reads if a reader changes.
 */
export async function cohortReads(connection: PoolConnection, year: string, semester: string, cycle: string, annualIds?: readonly string[], includeEligibilityHistory = true) {
  const db = cachedReads(connection);
  // Home processes bounded pages, not a full-year eligibility cohort. Existing
  // Registry/payroll callers retain their original unscoped behavior.
  if (annualIds && !annualIds.length) return db;
  const annualSql = "SELECT r.*,s.version AS person_version,CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')) AS name,i.human_id,DATE_FORMAT(r.status_effective_on,'%Y-%m-%d') AS status_on FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE r.id=? FOR UPDATE";
  // Explicit caller scopes are split without widening the academic year. The
  // existing unscoped annual discovery read retains its SQL and lock semantics.
  const annuals: RowDataPacket[] = [];
  if (annualIds) {
    const selected = [...new Set(annualIds)];
    for (let offset = 0; offset < selected.length; offset += chunkSize) {
      const ids = selected.slice(offset, offset + chunkSize);
      const scope = ` AND r.id IN (${ids.map(() => "?").join(",")})`;
      const [rows] = await connection.execute<RowDataPacket[]>(annualSql.replace("r.id=?", "r.academic_year_id=?" + scope), [year, ...ids]);
      annuals.push(...rows);
    }
  } else {
    const [rows] = await connection.execute<RowDataPacket[]>(annualSql.replace("r.id=?", "r.academic_year_id=?"), [year]);
    for (const row of rows) annuals.push(row);
  }
  for (const row of annuals) primeRead(db, annualSql, [row.id], [row]);
  // Keep every cohort size on the same preload path. Each source query has at
  // most 200 keys; grouping is linear and preserves each key's database order.
  // Raw groups live only for this guarded projection and writes invalidate them.
  for (let offset = 0; offset < annuals.length; offset += chunkSize) {
    const page = annuals.slice(offset, offset + chunkSize);
    const ids = page.map(r => r.id), scholars = page.map(r => r.scholar_id), marks = ids.map(() => "?").join(",");
    const [omissions]=await connection.execute<RowDataPacket[]>(omissionSourceSql.replace('o.scholar_id=?',`o.scholar_id IN (${marks})`),[...scholars,semester]);
    const omissionsByKey=groupBy(omissions,'scholar_id');
    for(const scholar of scholars)primeRead(db,omissionSourceSql,[scholar,semester],omissionsByKey.get(scholar)??[]);
    const activationSql = "SELECT masterlist_id,DATE_FORMAT(effective_on,'%Y-%m-%d') AS activation_date FROM masterlist_activations WHERE scholarship_id=? LOCK IN SHARE MODE";
    const [activations] = await connection.execute<RowDataPacket[]>(`SELECT scholarship_id,masterlist_id,DATE_FORMAT(effective_on,'%Y-%m-%d') AS activation_date FROM masterlist_activations WHERE scholarship_id IN (${marks}) LOCK IN SHARE MODE`, ids);
    const activationsByKey = groupBy(activations, "scholarship_id");
    for (const id of ids) primeRead(db, activationSql, [id], (activationsByKey.get(id) ?? []).map(r => ({ masterlist_id: r.masterlist_id, activation_date: r.activation_date })));
    const checklistSql = "SELECT id,payout_version_id,DATE_FORMAT(policy_date,'%Y-%m-%d') AS policy_date FROM requirement_checklists WHERE scholarship_record_id=? AND payout_cycle_id=? LOCK IN SHARE MODE";
    const [checklists] = await connection.execute<RowDataPacket[]>(`SELECT scholarship_record_id,id,payout_version_id,DATE_FORMAT(policy_date,'%Y-%m-%d') AS policy_date FROM requirement_checklists WHERE scholarship_record_id IN (${marks}) AND payout_cycle_id=? LOCK IN SHARE MODE`, [...ids, cycle]);
    const checklistsByKey = groupBy(checklists, "scholarship_record_id");
    for (const id of ids) primeRead(db, checklistSql, [id, cycle], (checklistsByKey.get(id) ?? []).map(r => ({ id: r.id, payout_version_id: r.payout_version_id, policy_date: r.policy_date })));
    const reserveSql = "SELECT a.batch_id FROM semester_entitlements e LEFT JOIN payroll_allocations a ON a.entitlement_id=e.id WHERE e.scholar_id=? AND e.semester_id=? LOCK IN SHARE MODE";
    const allocationSql = "SELECT e.id,a.batch_id FROM semester_entitlements e LEFT JOIN payroll_allocations a ON a.entitlement_id=e.id WHERE e.scholar_id=? AND e.semester_id=? LOCK IN SHARE MODE";
    const [allocations] = await connection.execute<RowDataPacket[]>(`SELECT e.scholar_id,e.id,a.batch_id FROM semester_entitlements e LEFT JOIN payroll_allocations a ON a.entitlement_id=e.id WHERE e.scholar_id IN (${marks}) AND e.semester_id=? LOCK IN SHARE MODE`, [...scholars, semester]);
    const allocationsByKey = groupBy(allocations, "scholar_id");
    for (const scholar of scholars) {
      const rows = (allocationsByKey.get(scholar) ?? []);
      primeRead(db, reserveSql, [scholar, semester], rows.map(r => ({ batch_id: r.batch_id })));
      primeRead(db, allocationSql, [scholar, semester], rows.map(r => ({ id: r.id, batch_id: r.batch_id })));
    }
    const ownerSql = "SELECT ss.*,w.cohort_code,(SELECT action FROM participation_events WHERE participation_id=ss.participation_id ORDER BY revision DESC LIMIT 1) AS participation_action FROM scholar_semesters ss JOIN workflow_scope_versions w ON w.id=ss.scope_version_id WHERE ss.scholar_id=? AND ss.semester_id=? FOR UPDATE";
    const [owners] = await connection.execute<RowDataPacket[]>(ownerSql.replace("ss.scholar_id=?", `ss.scholar_id IN (${marks})`), [...scholars, semester]);
    const ownersByKey = groupBy(owners, "scholar_id");
    for (const scholar of scholars) primeRead(db, ownerSql, [scholar, semester], (ownersByKey.get(scholar) ?? []));
    const standingSql = "SELECT operational_status AS status,DATE_FORMAT(status_effective_on,'%Y-%m-%d') AS day FROM scholarship_records WHERE scholar_id=? AND operational_status IS NOT NULL ORDER BY status_effective_on DESC LOCK IN SHARE MODE";
    const [standing] = await connection.execute<RowDataPacket[]>(standingSql.replace("SELECT operational_status", "SELECT scholar_id,operational_status").replace("scholar_id=?", `scholar_id IN (${marks})`), scholars);
    const standingByKey = groupBy(standing, "scholar_id");
    for (const scholar of scholars) primeRead(db, standingSql, [scholar], (standingByKey.get(scholar) ?? []).map(r => ({ status: r.status, day: r.day })));
    // Requirement-only reports need current document sources, not saved F19
    // assessments/overrides. This skips eager preload only: an unexpected later
    // history read still falls through to the database, never a fabricated empty.
    if (includeEligibilityHistory) {
      const historySql = "SELECT *,DATE_FORMAT(calculated_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded FROM payout_eligibility WHERE cycle_id=? AND scholarship_id=? ORDER BY revision DESC LIMIT 50 LOCK IN SHARE MODE";
      const [history] = await connection.execute<RowDataPacket[]>(historySql.replace("scholarship_id=?", `scholarship_id IN (${marks})`).replace(" LIMIT 50", ""), [cycle, ...ids]);
      const historyByKey = groupBy(history, "scholarship_id");
      for (const id of ids) primeRead(db, historySql, [cycle, id], (historyByKey.get(id) ?? []).slice(0, 50));
      const overridesSql = "SELECT e.snapshot FROM eligibility_overrides o JOIN eligibility_override_events e ON e.override_id=o.id WHERE o.cycle_id=? AND o.scholarship_id=? ORDER BY e.sequence DESC LOCK IN SHARE MODE";
      const [overrides] = await connection.execute<RowDataPacket[]>(overridesSql.replace("SELECT e.snapshot", "SELECT o.scholarship_id,e.snapshot").replace("o.scholarship_id=?", `o.scholarship_id IN (${marks})`), [cycle, ...ids]);
      const overridesByKey = groupBy(overrides, "scholarship_id");
      for (const id of ids) primeRead(db, overridesSql, [cycle, id], (overridesByKey.get(id) ?? []).map(r => ({ snapshot: r.snapshot })));
    }
  }
  return db;
}
