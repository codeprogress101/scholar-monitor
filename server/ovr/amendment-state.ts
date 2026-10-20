import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { OvrFinalization } from "./model.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import {decodeStoredJson} from "../stored-json.js";
export type OvrAmendment = {
  id: string;
  version: number;
  batchId: string;
  revision: number;
  state: "pending" | "approved" | "rejected";
  change: "add" | "remove" | "rename";
  scholarshipId?: string;
  name?: string;
  reason: string;
  reference: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  before: OvrFinalization;
  proposed: OvrFinalization;
  beforeHash: string;
  after?: OvrFinalization;
  afterHash?: string;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: string;
  decisionReason?: string;
  decisionReference?: string;
};
const decode = <T>(v: string | T): T =>
  decodeStoredJson<T>(v);
export async function amendments(
  db: PoolConnection,
  id: string,
): Promise<OvrAmendment[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT snapshot FROM ovr_amendments WHERE batch_id=? ORDER BY batch_revision DESC LOCK IN SHARE MODE",
    [id],
  );
  const seen = new Set<string>();
  return rows
    .map((r) => decode<OvrAmendment>(r.snapshot))
    .filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
}
export async function effectiveRoster(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT snapshot,snapshot_hash FROM ovr_finalizations WHERE batch_id=? LOCK IN SHARE MODE",
    [id],
  );
  if (!rows.length) return null;
  const original = {
    snapshot: decode<OvrFinalization>(rows[0].snapshot),
    hash: String(rows[0].snapshot_hash),
  };
  if (digest(JSON.stringify(original.snapshot)) !== original.hash)
    throw new AuthError(
      409,
      "OVR_SNAPSHOT_MISMATCH",
      "Original frozen roster could not be verified.",
    );
  const [approved] = await db.execute<RowDataPacket[]>(
    "SELECT snapshot FROM ovr_amendments WHERE batch_id=? AND state='approved' ORDER BY batch_revision DESC LIMIT 1 LOCK IN SHARE MODE",
    [id],
  );
  if (!approved.length) return original;
  const a = decode<OvrAmendment>(approved[0].snapshot);
  if (!a.after || digest(JSON.stringify(a.after)) !== a.afterHash)
    throw new AuthError(
      409,
      "OVR_SNAPSHOT_MISMATCH",
      "Approved roster could not be verified.",
    );
  return { snapshot: a.after, hash: a.afterHash! };
}
export function requireAmendable(state: string) {
  if (state === "closed")
    throw new AuthError(
      423,
      "OVR_ALREADY_CLOSED",
      "Closed Payroll batches cannot be amended.",
    );
  if (!["finalized", "submitted"].includes(state))
    throw new AuthError(
      423,
      "RECORD_LOCKED",
      "Amendments require a finalized or submitted batch before processing starts.",
    );
}
