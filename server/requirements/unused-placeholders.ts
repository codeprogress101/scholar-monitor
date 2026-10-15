import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { protectedDocumentEvidence } from "./protected-document-evidence.js";
import { documentPolicy } from "./semester-policy.js";

/** Only empty semester obligations represented by the approved policy qualify.
 * Payout-only policies and unknown kinds are deliberately not inferred by name. */
export async function classifyPlaceholders(db: PoolConnection, scholar: string, semester: string, rawPolicy: unknown) {
  const reviewReasons: Record<string, string> = {};
  const [[owner]] = await db.execute<RowDataPacket[]>(`SELECT p.rules FROM scholar_semesters ss
    JOIN workflow_scope_versions w ON w.id=ss.scope_version_id
    JOIN workflow_policy_versions p ON p.id=w.policy_version_id
    WHERE ss.scholar_id=? AND ss.semester_id=? LOCK IN SHARE MODE`, [scholar, semester]);
  const policy = documentPolicy(owner?.rules ?? rawPolicy);
  if (!policy || ![policy.corDefinitionVersionId, policy.cogDefinitionVersionId, policy.predecessorSemesterId].every(v => typeof v === "string" && v.length > 0)) return { ids: [] as string[], candidateIds: [] as string[], reviewReasons, issue: "Approved document policy is unavailable." };
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT i.id
    FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id
    JOIN scholarship_records a ON a.id=c.scholarship_record_id
    JOIN requirement_definition_versions v ON v.id=i.definition_version_id
    WHERE a.scholar_id=? AND c.semester_id=? AND c.payout_cycle_id IS NULL
    AND i.status='not_submitted' AND v.applies_to='semester'
    AND ((v.document_kind='enrollment' AND v.definition_id=(SELECT definition_id FROM requirement_definition_versions WHERE id=?))
      OR (v.document_kind='grades' AND v.definition_id=(SELECT definition_id FROM requirement_definition_versions WHERE id=?)))
    AND NOT EXISTS(SELECT 1 FROM requirement_coverage cov WHERE cov.requirement_instance_id=i.id
      AND NOT EXISTS(SELECT 1 FROM requirement_coverage newer WHERE newer.requirement_instance_id=i.id AND newer.revision>cov.revision)
      AND ((v.document_kind='enrollment' AND (cov.document_kind<>'cor' OR cov.coverage_semester_id<>c.semester_id))
        OR (v.document_kind='grades' AND (cov.document_kind<>'cog' OR cov.coverage_semester_id<>?))))
    AND NOT EXISTS(SELECT 1 FROM requirement_receipts x WHERE x.instance_id=i.id)
    AND NOT EXISTS(SELECT 1 FROM requirement_workflow_events x WHERE x.instance_id=i.id)
    AND NOT EXISTS(SELECT 1 FROM requirement_waivers x WHERE x.instance_id=i.id)
    AND NOT EXISTS(SELECT 1 FROM requirement_timing_decisions x WHERE x.instance_id=i.id)
    AND NOT EXISTS(SELECT 1 FROM semester_document_reconciliations x WHERE x.legacy_instance_id=i.id OR x.source_instance_id=i.id)
    ORDER BY i.id LOCK IN SHARE MODE`, [scholar, semester, policy.corDefinitionVersionId, policy.cogDefinitionVersionId, policy.predecessorSemesterId]);
  if (!rows.length) return { ids: [] as string[], candidateIds: [] as string[], reviewReasons, issue: null };
  const protectedEvidence = await protectedDocumentEvidence(db, scholar, semester);
  for (const row of rows) if (protectedEvidence.ids.has(row.id)) reviewReasons[row.id] = "This document is referenced by protected payroll evidence. Review its recorded history.";
  return { ids: protectedEvidence.issue ? [] : rows.map(r => String(r.id)).filter(id => !protectedEvidence.ids.has(id)), candidateIds: rows.map(r => String(r.id)), reviewReasons, issue: protectedEvidence.issue };
}

export async function unusedPlaceholders(db: PoolConnection, scholar: string, semester: string, rawPolicy: unknown): Promise<string[]> {
  return (await classifyPlaceholders(db, scholar, semester, rawPolicy)).ids;
}

export async function ownerUnusedPlaceholders(db: PoolConnection, ownerId: string): Promise<string[]> {
  const [[owner]] = await db.execute<RowDataPacket[]>(`SELECT ss.scholar_id,ss.semester_id,p.rules
    FROM scholar_semesters ss JOIN workflow_scope_versions w ON w.id=ss.scope_version_id
    JOIN workflow_policy_versions p ON p.id=w.policy_version_id WHERE ss.id=? LOCK IN SHARE MODE`, [ownerId]);
  return owner ? unusedPlaceholders(db, owner.scholar_id, owner.semester_id, owner.rules) : [];
}

