import type { PoolConnection, RowDataPacket } from "mysql2/promise";
export async function lineage(db: PoolConnection, id: string) {
  let latestId = id;
  const seen = new Set<string>();
  while (true) {
    if (seen.has(latestId))
      throw new Error("Invalid masterlist revision cycle");
    seen.add(latestId);
    const [next] = await db.execute<RowDataPacket[]>(
      "SELECT masterlist_id AS id FROM masterlist_revisions WHERE parent_id=? UNION ALL SELECT successor_id AS id FROM masterlist_consolidation_links WHERE source_id=?",
      [latestId, latestId],
    );
    if (next.length > 1) throw new Error("Invalid masterlist revision branch");
    if (!next.length) break;
    latestId = next[0].id;
  }
  const [own] = await db.execute<RowDataPacket[]>(
    "SELECT root_id,revision FROM masterlist_revisions WHERE masterlist_id=? LOCK IN SHARE MODE",
    [id],
  );
  const [latest] = await db.execute<RowDataPacket[]>(
    "SELECT root_id FROM masterlist_revisions WHERE masterlist_id=?",
    [latestId],
  );
  const rootId = (latest[0]?.root_id ?? latestId) as string;
  const [versions] = await db.execute<RowDataPacket[]>(
    "SELECT v.masterlist_id,v.revision,v.kind,DATE_FORMAT(p.published_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS published_at FROM masterlist_revisions v JOIN masterlist_publications p ON p.masterlist_id=v.masterlist_id WHERE v.root_id=? ORDER BY v.revision DESC LOCK IN SHARE MODE",
    [rootId],
  );
  return {
    rootId,
    historyRootId: (own[0]?.root_id ?? id) as string,
    revision: Number(own[0]?.revision ?? 0),
    latestId,
    versions,
  };
}
