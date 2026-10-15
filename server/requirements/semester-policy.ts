import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";

export type SemesterDocumentPolicy = {
  documentKindsReviewed?: boolean;
  version?: number; purpose?: string; rosterBatchId?: string;
  policyDate?: string; predecessorSemesterId: string;
  corDefinitionVersionId: string; cogDefinitionVersionId: string;
  retainedScopeIds?: string[];
};
export function documentPolicy(raw: unknown): SemesterDocumentPolicy {
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as SemesterDocumentPolicy;
}
export function policyDate(raw: unknown, semesterStart: string): string {
  return documentPolicy(raw).policyDate ?? semesterStart;
}
export function validatePolicyDate(day: string, start: string, end: string) {
  if (day < start || day > end) throw new AuthError(422, "POLICY_DATE_OUTSIDE_SEMESTER", "Choose a policy applicability date within the receiving semester.");
}
/** Validate immutable approved versions, not whichever revision is newest today. */
export async function pinnedSemesterDefinitions(db: PoolConnection, semesterId: string, raw: unknown, start: string, end: string) {
  const [[period]] = await db.execute<RowDataPacket[]>("SELECT s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=? LOCK IN SHARE MODE", [semesterId]);
  if (!period || period.locked_at || period.archived_at || period.year_locked || period.year_archived) throw new AuthError(423, "PERIOD_UNAVAILABLE", "The semester or academic year is locked or archived.");
  const rules = documentPolicy(raw), day = policyDate(raw, start);
  validatePolicyDate(day, start, end);
  const ids = [rules.corDefinitionVersionId, rules.cogDefinitionVersionId];
  if (!ids[0] || !ids[1] || ids[0] === ids[1]) throw new AuthError(409, "REQUIREMENT_NOT_APPLICABLE", "Choose distinct COR and COG definitions.");
  const [rows] = await db.execute<RowDataPacket[]>("SELECT v.id,v.document_kind,v.active,v.applies_to,v.semester_id,DATE_FORMAT(v.effective_from,'%Y-%m-%d') AS starts,DATE_FORMAT(v.effective_until,'%Y-%m-%d') AS ends FROM requirement_definition_versions v WHERE v.id IN (?,?) LOCK IN SHARE MODE", ids);
  if (rows.length !== 2 || rows.some(r => !r.active || r.applies_to !== "semester" || (r.semester_id && r.semester_id !== semesterId) || r.starts > day || (r.ends && r.ends <= day)))
    throw new AuthError(409, "REQUIREMENT_NOT_APPLICABLE", "The approved document versions must apply to this semester on its pinned policy date.");
  if (rules.documentKindsReviewed && (rows.find(r=>r.id===ids[0])?.document_kind!=="enrollment" || rows.find(r=>r.id===ids[1])?.document_kind!=="grades")) throw new AuthError(409,"DOCUMENT_KIND_REVIEW_REQUIRED","The pinned COR and COG policies do not match their approved document kinds.");
  return { rules, day, ids };
}

export async function semesterDocumentSources(db: PoolConnection, semesterId: string) {
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT w.id,w.cohort_code,w.mode,p.rules,
    DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(s.ends_on,'%Y-%m-%d') AS ends
    FROM workflow_scope_versions w JOIN workflow_policy_versions p ON p.id=w.policy_version_id JOIN semesters s ON s.id=w.semester_id
    WHERE w.semester_id=? AND NOT EXISTS(SELECT 1 FROM workflow_scope_versions n WHERE n.semester_id=w.semester_id AND n.cohort_code=w.cohort_code AND n.revision>w.revision)
    ORDER BY w.cohort_code LOCK IN SHARE MODE`, [semesterId]);
  return rows.filter(r => documentPolicy(r.rules).version === 2).map(r => ({ scopeId: String(r.id), cohort: String(r.cohort_code), mode: String(r.mode), policyDate: policyDate(r.rules, r.starts), corDefinitionVersionId: documentPolicy(r.rules).corDefinitionVersionId, cogDefinitionVersionId: documentPolicy(r.rules).cogDefinitionVersionId }));
}
