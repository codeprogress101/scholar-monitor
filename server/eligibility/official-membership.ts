import { lineage } from "../masterlists/revisions.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import type { PayoutCycle } from "../payouts/model.js";
import type { OfficialSnapshot } from "../masterlists/workflow-model.js";
import type { EligibilitySources } from "./model.js";
const decode = <T>(v: string | T): T => typeof v === "string" ? JSON.parse(v) as T : v;
export async function officialMembership(db: PoolConnection, cycle: Pick<PayoutCycle, "academicYearId">, annualId: string) {
  const [records] = await db.execute<RowDataPacket[]>(
    "SELECT r.*,s.version AS person_version,CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')) AS name,i.human_id,DATE_FORMAT(r.status_effective_on,'%Y-%m-%d') AS status_on FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE r.id=? FOR UPDATE",
    [annualId],
  );
  if (!records.length)
    throw new AuthError(
      404,
      "SCHOLARSHIP_NOT_FOUND",
      "Annual scholarship record not found.",
    );
  const r = records[0];
  if (r.academic_year_id !== cycle.academicYearId)
    throw new AuthError(
      409,
      "WRONG_ACADEMIC_YEAR",
      "Payout cycle and scholarship record must belong to the same academic year.",
    );
  const [activations] = await db.execute<RowDataPacket[]>(
    "SELECT masterlist_id,DATE_FORMAT(effective_on,'%Y-%m-%d') AS activation_date FROM masterlist_activations WHERE scholarship_id=? LOCK IN SHARE MODE",
    [annualId],
  );
  const chain = activations[0] ? await lineage(db, activations[0].masterlist_id) : null;
  const rootId = chain?.rootId ?? null;
  let official: EligibilitySources["official"] = {
    rootId,
    masterlistId: null,
    version: null,
    amendmentRevision: 0,
    snapshotHash: null,
    effectiveOn: null,
    valid: false,
  };
  if (rootId) {
    const latestId = chain!.latestId;
    const [publications] = await db.execute<RowDataPacket[]>(
      "SELECT m.id,m.academic_year_id,m.status,m.version,p.snapshot,p.snapshot_hash,DATE_FORMAT(p.effective_on,'%Y-%m-%d') AS effective_on FROM masterlist_versions m JOIN masterlist_publications p ON p.masterlist_id=m.id WHERE m.id=? LOCK IN SHARE MODE",
      [latestId],
    );
    if (publications.length) {
      const p = publications[0],
        snapshot = decode<OfficialSnapshot>(p.snapshot);
      official = {
        rootId,
        masterlistId: latestId,
        version: p.version,
        amendmentRevision: Number(chain!.versions[0]?.revision ?? 0),
        snapshotHash: p.snapshot_hash,
        effectiveOn: activations[0].activation_date,
        valid:
          ["published", "locked"].includes(p.status) &&
          p.academic_year_id === cycle.academicYearId &&
          snapshot.academicYearId === cycle.academicYearId &&
          snapshot.masterlistId === latestId &&
          snapshot.entries.some(
            (e) =>
              e.scholarId === r.scholar_id &&
              e.snapshot.scholarshipId === annualId,
          ),
      };
    }
  }
  return { r, official };
}
