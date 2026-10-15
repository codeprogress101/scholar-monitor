import { classifyPlaceholders, ownerUnusedPlaceholders } from "./unused-placeholders.js";
import { AuthError } from "../auth/service.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

/** Append-only bindings retain the original instance, receipt and event history.
 * A source becoming stale never resurrects the empty replacement slot. */
export async function reusedSources(db: PoolConnection, ownerId: string) {
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT r.legacy_instance_id,r.source_instance_id,r.evidence
    FROM semester_document_reconciliations r WHERE r.scholar_semester_id=?
    AND NOT EXISTS(SELECT 1 FROM semester_document_reconciliations n WHERE n.legacy_instance_id=r.legacy_instance_id AND n.revision>r.revision)
    ORDER BY r.legacy_instance_id LOCK IN SHARE MODE`, [ownerId]);
  return rows.flatMap(r => {
    const e = typeof r.evidence === "string" ? JSON.parse(r.evidence) : r.evidence;
    return e.disposition === "reuse" && typeof e.targetId === "string"
      ? [{ targetId: e.targetId as string, sourceId: String(r.source_instance_id) }] : [];
  });
}
export async function reusedOwner(db: PoolConnection, instanceId: string): Promise<string | null> {
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT r.scholar_semester_id,r.evidence
    FROM semester_document_reconciliations r WHERE r.source_instance_id=?
    AND NOT EXISTS(SELECT 1 FROM semester_document_reconciliations n WHERE n.legacy_instance_id=r.legacy_instance_id AND n.revision>r.revision)
    ORDER BY r.id LOCK IN SHARE MODE`, [instanceId]);
  for (const r of rows) {
    const e = typeof r.evidence === "string" ? JSON.parse(r.evidence) : r.evidence;
    if (e.disposition === "reuse") return String(r.scholar_semester_id);
  }
  return null;
}
export async function effectiveSemesterInstances(db: PoolConnection, ownerId: string) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT i.id,i.definition_version_id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id WHERE c.scholar_semester_id=? ORDER BY i.id LOCK IN SHARE MODE", [ownerId]);
  const bindings = await reusedSources(db, ownerId);
  return rows.map(r => ({ id: bindings.find(b => b.targetId === r.id)?.sourceId ?? String(r.id), definition_version_id: String(r.definition_version_id), targetId: String(r.id) }));
}

export async function requireActiveDocument(db: PoolConnection, id: string, ownerId: string | null) {
  if (!ownerId) {
    const [[owner]] = await db.execute<RowDataPacket[]>(`SELECT ss.id,ss.scholar_id,ss.semester_id,c.id AS checklist_id FROM requirement_instances i
      JOIN requirement_checklists c ON c.id=i.checklist_id JOIN scholarship_records a ON a.id=c.scholarship_record_id
      JOIN scholar_semesters ss ON ss.scholar_id=a.scholar_id AND ss.semester_id=c.semester_id WHERE i.id=? LOCK IN SHARE MODE`, [id]);
    if (owner) {
      const classification = await classifyPlaceholders(db, owner.scholar_id, owner.semester_id, null);
      if (classification.issue && classification.candidateIds.includes(id)) throw new AuthError(409, "DOCUMENT_SOURCE_REVIEW_REQUIRED", classification.issue);
      if (classification.reviewReasons[id]) throw new AuthError(409, "DOCUMENT_SOURCE_REVIEW_REQUIRED", classification.reviewReasons[id]);
      if (classification.ids.includes(id))
        throw new AuthError(409, "DOCUMENT_SOURCE_REPLACED", "Open this scholar's Documents workspace and receive through the current semester checklist.", { scholarId: owner.scholar_id, semesterId: owner.semester_id, scholarSemesterId: owner.id });
    }
  }
  if (ownerId && (await reusedSources(db, ownerId)).some(b => b.targetId === id))
    throw new AuthError(409, "DOCUMENT_SOURCE_REUSED", "Use the linked original document. This empty preparation slot cannot receive another copy.");
}

export async function legacyReceiptBlocker(db: PoolConnection, ownerId: string): Promise<string | null> {
  const unused = await ownerUnusedPlaceholders(db, ownerId);
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT i.id FROM scholar_semesters ss
    JOIN scholarship_records a ON a.scholar_id=ss.scholar_id
    JOIN requirement_checklists c ON c.scholarship_record_id=a.id AND c.semester_id=ss.semester_id
    JOIN requirement_instances i ON i.checklist_id=c.id
    WHERE ss.id=? AND NOT EXISTS(SELECT 1 FROM semester_document_reconciliations r WHERE r.legacy_instance_id=i.id)
    LOCK IN SHARE MODE`, [ownerId]);
  return rows.some(r => !unused.includes(r.id)) ? "Review existing document sources before receiving another copy." : null;
}
