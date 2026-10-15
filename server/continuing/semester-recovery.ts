import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";

type Rules = { purpose: string; rosterBatchId: string; predecessorSemesterId: string; corDefinitionVersionId: string; cogDefinitionVersionId: string };
const decode = <T>(value: string | T): T => typeof value === "string" ? JSON.parse(value) as T : value;
export async function validateRecovery(db: PoolConnection, scope: RowDataPacket, rules: Rules, semesterVersion: number, expectedCount?: number) {
  const [owners] = await db.execute<RowDataPacket[]>(`SELECT ss.id,ss.scope_version_id,w.mode,w.semester_id,w.cohort_code,p.rules,p.authority_version_id,
    (SELECT action FROM participation_events WHERE participation_id=ss.participation_id ORDER BY revision DESC LIMIT 1) AS participation_action
    FROM scholar_semesters ss JOIN workflow_scope_versions w ON w.id=ss.scope_version_id JOIN workflow_policy_versions p ON p.id=w.policy_version_id
    WHERE ss.semester_id=? AND w.cohort_code=? FOR UPDATE`, [scope.semester_id, scope.cohort_code]);
  const fail = (message: string): never => { throw new AuthError(409, "SEMESTER_RECOVERY_REVIEW_REQUIRED", message); };
  if (!owners.length || owners.length !== expectedCount) fail("The affected record count changed. Reload and review recovery.");
  for (const owner of owners) {
    const prior = decode<Rules>(owner.rules);
    if (owner.mode !== "enabled" || owner.authority_version_id !== scope.authority_version_id || owner.participation_action !== "accepted" ||
        (["purpose", "rosterBatchId", "predecessorSemesterId", "corDefinitionVersionId", "cogDefinitionVersionId"] as const).some((key) => prior[key] !== rules[key]))
      fail("Existing records do not match the current authority, participation or document policy. Coordinated review is required.");
    const [used] = await db.execute<RowDataPacket[]>("SELECT id FROM semester_review_events WHERE scholar_semester_id=? UNION ALL SELECT id FROM semester_entitlements WHERE scholar_semester_id=? LIMIT 1", [owner.id, owner.id]);
    if (used.length) fail("An affected semester has an academic review or entitlement. Review those dependent records before recovery.");
    const [revisions] = await db.execute<RowDataPacket[]>("SELECT predecessor_semester_id FROM scholar_semester_revisions WHERE scholar_semester_id=? ORDER BY revision DESC LIMIT 1", [owner.id]);
    const [checklists] = await db.execute<RowDataPacket[]>("SELECT id,semester_version FROM requirement_checklists WHERE scholar_semester_id=?", [owner.id]);
    if (revisions[0]?.predecessor_semester_id !== rules.predecessorSemesterId || checklists.length !== 1 || checklists[0].semester_version !== semesterVersion)
      fail("Existing semester or checklist configuration has changed. Review its historical coverage before recovery.");
    const [documents] = await db.execute<RowDataPacket[]>(`SELECT i.definition_version_id,c.document_kind,c.coverage_semester_id FROM requirement_instances i
      LEFT JOIN requirement_coverage c ON c.requirement_instance_id=i.id AND c.scholar_semester_id=? AND c.revision=(SELECT MAX(newer.revision) FROM requirement_coverage newer WHERE newer.requirement_instance_id=i.id AND newer.scholar_semester_id=?)
      WHERE i.checklist_id=?`, [owner.id, owner.id, checklists[0].id]);
    if (documents.length !== 2 || !documents.some((d) => d.document_kind === "cor" && d.definition_version_id === rules.corDefinitionVersionId && d.coverage_semester_id === scope.semester_id) ||
        !documents.some((d) => d.document_kind === "cog" && d.definition_version_id === rules.cogDefinitionVersionId && d.coverage_semester_id === rules.predecessorSemesterId))
      fail("An affected scholar's individual COR/COG coverage does not match the saved policy.");
  }
  return { scopeIds: [...new Set(owners.map((o) => o.scope_version_id as string))].sort(), recordCount: owners.length };
}
