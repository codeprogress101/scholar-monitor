import { reusedOwner } from "./reused-source.js";
import { scopeAcceptsOwner } from "../continuing/scope-access.js";
import { requireRegularCoverage } from "../continuing/regular-coverage.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import { today } from "../scholars/validation.js";
import { entrantCard, entrantCardContext } from "./entrant-grading-card.js";

export function requireCoveredPlacement(kind: "cor" | "cog", effectiveOn: string | null, coveredEnd: string) {
  if (kind === "cog" && effectiveOn && effectiveOn > coveredEnd)
    throw new AuthError(409, "ACADEMIC_COVERAGE_REVIEW_REQUIRED", "The current school/course change took effect after these grades. Review the historical placement for the covered semester before verification.");
}

/** Resolve explicit document coverage; never infer COR/COG from editable names. */
export async function semesterRequirementContext(db: PoolConnection, instanceId: string, ownerId: string | null) {
  ownerId ??= await reusedOwner(db, instanceId);
  if (!ownerId) return null;
  const [owners] = await db.execute<RowDataPacket[]>(
    `SELECT ss.scholar_id,ss.semester_id,ss.participation_id,ss.scope_version_id,
      s.academic_year_id,s.code AS receiving_code,DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS starts_on,
      scope.mode,scope.cohort_code,
      DATE_FORMAT(policy.effective_from,'%Y-%m-%d') AS policy_from,DATE_FORMAT(policy.effective_until,'%Y-%m-%d') AS policy_until,
      DATE_FORMAT(authority.valid_from,'%Y-%m-%d') AS authority_from,DATE_FORMAT(authority.valid_until,'%Y-%m-%d') AS authority_until,
      (SELECT id FROM workflow_scope_versions WHERE semester_id=ss.semester_id AND cohort_code=scope.cohort_code ORDER BY revision DESC LIMIT 1) AS current_scope,
      (SELECT action FROM participation_events WHERE participation_id=ss.participation_id ORDER BY revision DESC LIMIT 1) AS participation_action
     FROM scholar_semesters ss JOIN semesters s ON s.id=ss.semester_id
     JOIN workflow_scope_versions scope ON scope.id=ss.scope_version_id
     JOIN workflow_policy_versions policy ON policy.id=scope.policy_version_id
     JOIN workflow_authority_versions authority ON authority.id=policy.authority_version_id WHERE ss.id=? FOR UPDATE`, [ownerId]);
  const owner = owners[0];
  const [current] = owner ? await db.execute<RowDataPacket[]>("SELECT w.id,w.mode,p.rules FROM workflow_scope_versions w JOIN workflow_policy_versions p ON p.id=w.policy_version_id WHERE w.id=? FOR UPDATE", [owner.current_scope]) : [[]];
  const day = today();
  if (!owner || owner.mode !== "enabled" || !current[0] || !scopeAcceptsOwner(current[0], owner.scope_version_id) || owner.policy_from > day || (owner.policy_until && owner.policy_until < day) || owner.authority_from > day || (owner.authority_until && owner.authority_until < day))
    throw new AuthError(423, "SEMESTER_WORKFLOW_UNAVAILABLE", "This semester workflow is not enabled for new document actions.");
  if (owner.participation_action !== "accepted")
    throw new AuthError(409, "PARTICIPATION_REVIEW_REQUIRED", "Review the scholar's participation decision before recording semester documents.");
  const [revisions] = await db.execute<RowDataPacket[]>(
    "SELECT revision,predecessor_semester_id FROM scholar_semester_revisions WHERE scholar_semester_id=? ORDER BY revision DESC LIMIT 1 FOR UPDATE", [ownerId]);
  const [coverageRows] = await db.execute<RowDataPacket[]>(
    `SELECT c.id,c.document_kind,c.coverage_semester_id,s.academic_year_id,s.code AS semester_code,y.code AS year_code,
      DATE_FORMAT(s.ends_on,'%Y-%m-%d') AS ends_on
     FROM requirement_coverage c LEFT JOIN semesters s ON s.id=c.coverage_semester_id
     LEFT JOIN academic_years y ON y.id=s.academic_year_id
     WHERE c.scholar_semester_id=? AND c.requirement_instance_id=? ORDER BY c.revision DESC LIMIT 1 FOR UPDATE`, [ownerId, instanceId]);
  const revision = revisions[0], coverage = coverageRows[0];
  if (!revision || !coverage || !["cor", "cog"].includes(coverage.document_kind))
    throw new AuthError(409, "DOCUMENT_COVERAGE_REQUIRED", "Record explicit COR or COG semester coverage before processing this document.");
  const card = coverage.document_kind === "cog" ? await entrantCard(db,instanceId) : null;
  if(card?.decision==='approved') {
    const checked=await entrantCardContext(db,instanceId);
    if(card.mode==='initial_requirements'&&(!checked.firstSemester||!checked.firstYear||checked.collegeHistoryConflict))throw new AuthError(409,'FIRST_SEMESTER_REVIEW_REQUIRED','The first-year, first-semester exception needs renewed review.');
    // Entitlements protect review edits, not reading already approved evidence.
    if(checked.blocker && !checked.blocker.startsWith('An entitlement')) throw new AuthError(409,'ENTRANT_REVIEW_BLOCKED',checked.blocker);
    return {scholarId:owner.scholar_id as string,receivingSemesterId:owner.semester_id as string,receivingSemesterCode:owner.receiving_code as string,receivingAcademicYearId:owner.academic_year_id as string,academicYearId:owner.academic_year_id as string,semesterId:owner.semester_id as string,semesterCode:card.gradingPeriod,yearCode:card.schoolYear,coveredEnd:card.periodEnd,coverageId:coverage.id as string,semesterRevision:Number(revision.revision),documentKind:'cog' as const,entrantCard:card};
  }
  if ((coverage.document_kind === "cor" && coverage.coverage_semester_id !== owner.semester_id) ||
      (coverage.document_kind === "cog" && (!revision.predecessor_semester_id || coverage.coverage_semester_id !== revision.predecessor_semester_id || !coverage.ends_on || coverage.ends_on >= owner.starts_on)))
    throw new AuthError(409, "DOCUMENT_COVERAGE_CONFLICT", "COR must cover the receiving semester; COG must cover its recorded preceding completed semester.");
  const regular = coverage.document_kind === "cog" ? await requireRegularCoverage(db, owner.semester_id, coverage.coverage_semester_id) : null;
  return {
    ...(regular ? { predecessorSourceHash: regular.sourceHash } : {}),
    scholarId: owner.scholar_id as string,
    receivingSemesterId: owner.semester_id as string,
    receivingSemesterCode: owner.receiving_code as string,
    receivingAcademicYearId: owner.academic_year_id as string,
    academicYearId: coverage.academic_year_id as string,
    semesterId: coverage.coverage_semester_id as string,
    semesterCode: coverage.semester_code as string,
    yearCode: coverage.year_code as string,
    coveredEnd: coverage.ends_on as string,
    coverageId: coverage.id as string,
    semesterRevision: Number(revision.revision),
    documentKind: coverage.document_kind as "cor" | "cog",
  };
}
