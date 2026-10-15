import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import { lineage } from "./revisions.js";
import type { OfficialSnapshot } from "./workflow-model.js";
import type { DraftIssue, DraftEntry } from "./model.js";

export async function publicationSource(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT m.*,p.snapshot,p.snapshot_hash,DATE_FORMAT(p.effective_on,'%Y-%m-%d') AS effective_on FROM masterlist_versions m JOIN masterlist_publications p ON p.masterlist_id=m.id WHERE m.id=?",
    [id],
  );
  if (!rows.length || !["published", "locked"].includes(rows[0].status))
    throw new AuthError(
      409,
      "PUBLICATION_REQUIRED",
      "Select an official published or locked masterlist.",
    );
  return {
    id: rows[0].id as string,
    academic_year_id: rows[0].academic_year_id as string,
    version: rows[0].version as number,
    snapshot_hash: rows[0].snapshot_hash as string,
    effective_on: rows[0].effective_on as string,
    snapshot: JSON.parse(rows[0].snapshot) as OfficialSnapshot,
  };
}
export async function consolidationSource(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT c.*,m.title FROM masterlist_consolidations c JOIN masterlist_versions m ON m.id=c.source_id WHERE c.draft_id=?",
    [id],
  );
  return rows[0] ?? null;
}
export async function consolidationIssues(
  db: PoolConnection,
  row: RowDataPacket,
  items: DraftEntry[],
): Promise<DraftIssue[]> {
  const c = await consolidationSource(db, row.id);
  if (!c || ["published", "locked"].includes(row.status)) return [];
  const issues: DraftIssue[] = [];
  const issue = (
    code: string,
    message: string,
    scholarId: string | null = null,
  ) => issues.push({ code, message, scholarId });
  const source = await publicationSource(db, c.source_id),
    chain = await lineage(db, c.source_id);
  if (
    chain.latestId !== c.source_id ||
    source.version !== c.source_version ||
    source.snapshot_hash !== c.source_hash
  )
    issue(
      "CONSOLIDATION_STALE",
      "The source publication changed. Prepare a new consolidation proposal and obtain renewed review.",
    );
  if (source.academic_year_id !== row.academic_year_id)
    issue(
      "WRONG_ACADEMIC_YEAR",
      "Consolidation requires the same academic year.",
    );
  const comparable = (entries: DraftEntry[]) =>
    JSON.stringify(
      entries
        .map(({ scholarId, snapshot, awardNumber }) => ({
          scholarId,
          snapshot,
          awardNumber,
        }))
        .sort((a, b) => a.scholarId.localeCompare(b.scholarId)),
    );
  if (comparable(items) !== comparable(source.snapshot.entries))
    issue(
      "SOURCE_CHANGED",
      "The proposal must preserve the entire frozen source membership.",
    );
  const [targets] = await db.execute<RowDataPacket[]>(
    "SELECT target_id FROM masterlist_addition_events WHERE draft_id=? ORDER BY resulting_version DESC LIMIT 1",
    [row.id],
  );
  const target = targets[0]?.target_id
    ? await publicationSource(db, targets[0].target_id)
    : null;
  if (
    !target ||
    target.snapshot_hash !== c.target_hash ||
    target.version !== c.target_version
  )
    issue(
      "CONSOLIDATION_STALE",
      "The destination publication changed. Prepare a new consolidation proposal and obtain renewed review.",
    );
  for (const entry of [...items, ...(target?.snapshot.entries ?? [])]) {
    const expected = items.some((e) => e.scholarId === entry.scholarId)
      ? c.source_id
      : target!.id;
    const [active] = await db.execute<RowDataPacket[]>(
      "SELECT a.masterlist_id,r.scholar_id,r.academic_year_id FROM masterlist_activations a JOIN scholarship_records r ON r.id=a.scholarship_id WHERE a.scholarship_id=?",
      [entry.snapshot.scholarshipId],
    );
    if (
      !active.length ||
      active[0].scholar_id !== entry.scholarId ||
      active[0].academic_year_id !== row.academic_year_id ||
      (await lineage(db, active[0].masterlist_id)).latestId !== expected
    )
      issue(
        "ACTIVATION_PROVENANCE_INVALID",
        `Check activation provenance for ${entry.snapshot.humanId}.`,
        entry.scholarId,
      );
  }
  return issues;
}
