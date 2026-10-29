import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { DraftCandidate } from "./model.js";
import { MAX_SCOPE_MATCHES } from "./candidate-source.js";
import { AuthError } from "../auth/service.js";

/** Never apply new-activation exclusions to frozen carry-forward workflows. */
export async function ordinaryNewActivation(db: PoolConnection, row: RowDataPacket) {
  if (["published", "locked"].includes(row.status)) return false;
  const [[kind]] = await db.execute<RowDataPacket[]>(`SELECT
    (SELECT target_id FROM masterlist_addition_events WHERE draft_id=? ORDER BY resulting_version DESC LIMIT 1) target_id,
    EXISTS(SELECT 1 FROM masterlist_consolidations WHERE draft_id=?) consolidation`, [row.id, row.id]);
  return !kind.target_id && !kind.consolidation;
}

export async function activationReferences(db: PoolConnection, year: string, ids: string[]) {
  const result = new Map<string, NonNullable<DraftCandidate["activationConflict"]>>();
  if (!ids.length) return result;
  if (ids.length > MAX_SCOPE_MATCHES) throw new AuthError(409, "SELECTION_CAPACITY", "Narrow the scholar selection before reviewing activations.");
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT r.scholar_id,a.masterlist_id,m.title,y.code year_code,DATE_FORMAT(a.effective_on,'%Y-%m-%d') effective_on
    FROM scholarship_records r JOIN academic_years y ON y.id=r.academic_year_id
    LEFT JOIN masterlist_activations a ON a.scholarship_id=r.id LEFT JOIN masterlist_versions m ON m.id=a.masterlist_id
    WHERE r.academic_year_id=? AND r.scholar_id IN (${ids.map(() => "?").join(",")}) AND (r.operational_status IS NOT NULL OR a.scholarship_id IS NOT NULL)`, [year, ...ids]);
  for (const r of rows) result.set(r.scholar_id, { masterlistId: r.masterlist_id ?? null, title: r.title ?? null, yearCode: r.year_code, effectiveOn: r.effective_on ?? null });
  return result;
}

export function excludeActivation(candidate: DraftCandidate, conflict?: DraftCandidate["activationConflict"]): DraftCandidate {
  if (!conflict) return candidate;
  return { ...candidate, activationConflict: conflict, issues: [...candidate.issues, {
    scholarId: candidate.scholarId,
    code: conflict.masterlistId ? "ALREADY_ACTIVATED" : "OPERATIONAL_STANDING_REVIEW",
    message: conflict.masterlistId ? `Already activated through ${conflict.title} (${conflict.yearCode}). Review the existing official Masterlist; do not activate again.` : "Existing operational standing requires review before a new activation.",
  }] };
}

export const candidateFrom = `FROM scholars s LEFT JOIN scholar_identifiers i ON i.scholar_id=s.id
  WHERE CONCAT_WS(' ',i.human_id,s.first_name,s.middle_name,s.last_name) LIKE ? ESCAPE '!'
  AND (s.academic_year_id=? OR EXISTS(SELECT 1 FROM scholarship_records r WHERE r.scholar_id=s.id AND r.academic_year_id=?)
    OR EXISTS(SELECT 1 FROM academic_records a WHERE a.scholar_id=s.id AND a.academic_year_id=?)
    OR EXISTS(SELECT 1 FROM scholar_intakes t WHERE t.scholar_id=s.id AND t.academic_year_id=?)
    OR EXISTS(SELECT 1 FROM scholar_semesters ss JOIN semesters sem ON sem.id=ss.semester_id WHERE ss.scholar_id=s.id AND sem.academic_year_id=?))`;
export const candidateParams = (q: string, year: string) => [`%${q.replace(/[!%_]/g, "!$&")}%`, year, year, year, year, year];
