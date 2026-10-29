import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { OfficialSnapshot } from "../masterlists/workflow-model.js";
import { indexedRead } from "../read-cache.js";

const decode = (value: string | OfficialSnapshot): OfficialSnapshot => typeof value === "string" ? JSON.parse(value) : value;

export async function publicationAward(db: PoolConnection, masterlistId: string | null, annualId: string, locking: boolean) {
  return await indexedRead(db, `publication-awards:${locking}:${masterlistId}`, annualId, async () => {
    const [[row]] = await db.execute<RowDataPacket[]>(`SELECT snapshot FROM masterlist_publications WHERE masterlist_id=?${locking ? " LOCK IN SHARE MODE" : ""}`, [masterlistId]);
    const index = new Map<string, string>();
    for (const entry of row ? decode(row.snapshot).entries : []) {
      // Preserve Array.find's first occurrence even for malformed duplicates.
      if (!index.has(entry.snapshot.scholarshipId)) index.set(entry.snapshot.scholarshipId, entry.awardNumber ?? "");
    }
    return index;
  }) ?? "";
}

export async function publicationMember(db: PoolConnection, masterlistId: string, scholarId: string, annualId: string, academicYearId: string) {
  const readIndex = async () => {
    const [[p]] = await db.execute<RowDataPacket[]>("SELECT m.id,m.academic_year_id,m.status,m.version,p.snapshot,p.snapshot_hash,DATE_FORMAT(p.effective_on,'%Y-%m-%d') AS effective_on FROM masterlist_versions m JOIN masterlist_publications p ON p.masterlist_id=m.id WHERE m.id=? LOCK IN SHARE MODE", [masterlistId]);
    const index = new Map<string, { version: number; snapshotHash: string; year: string; snapshotYear: string; snapshotId: string; status: string; member:boolean }>();
    if (p) {
      const snapshot = decode(p.snapshot);
      const value = { version: p.version, snapshotHash: p.snapshot_hash, year: p.academic_year_id, snapshotYear: snapshot.academicYearId, snapshotId: snapshot.masterlistId, status: p.status, member:false };
      // Missing membership must still return publication metadata, as before.
      index.set("metadata", value);
      // Match the authoritative reader's short circuit: an unusable publication
      // still supplies metadata, without inspecting its membership array.
      if (["published","locked"].includes(p.status) && p.academic_year_id===academicYearId && snapshot.academicYearId===academicYearId && snapshot.masterlistId===masterlistId)
        for (const e of snapshot.entries) index.set(JSON.stringify([e.scholarId, e.snapshot.scholarshipId]), { ...value, member:true });
    }
    return index;
  };
  const key = `publication-members:${masterlistId}:${academicYearId}`;
  return indexedRead(db, key, JSON.stringify([scholarId, annualId]), readIndex, "metadata");
}
