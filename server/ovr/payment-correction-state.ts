import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { PaymentRecord } from "./processing-model.js";
export type PaymentCorrection = {
  id: string;
  version: number;
  paymentId: string;
  batchId: string;
  revision: number;
  state: "pending" | "applied" | "approved" | "rejected";
  before: PaymentRecord;
  proposed: PaymentRecord;
  after?: PaymentRecord;
  reason: string;
  reference: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: string;
  decisionReason?: string;
  decisionReference?: string;
};
export async function paymentCorrections(
  db: PoolConnection,
  batchId: string,
): Promise<PaymentCorrection[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT snapshot FROM payment_corrections WHERE batch_id=? ORDER BY batch_revision DESC LOCK IN SHARE MODE",
    [batchId],
  );
  const seen = new Set<string>();
  return rows
    .map(
      (r) =>
        (typeof r.snapshot === "string"
          ? JSON.parse(r.snapshot)
          : r.snapshot) as PaymentCorrection,
    )
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
}
export function effectivePayments(
  original: PaymentRecord[],
  corrections: PaymentCorrection[],
): PaymentRecord[] {
  return original.map((p) => {
    const latest = corrections
      .filter((c) => c.paymentId === p.id && c.after)
      .sort((a, b) => b.revision - a.revision)[0];
    return latest?.after ?? p;
  });
}
