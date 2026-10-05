import {
  paymentCorrections,
  effectivePayments,
} from "./payment-correction-state.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { OvrFinalization } from "./model.js";
import type { PaymentRecord, Reconciliation } from "./processing-model.js";
export async function paymentRecords(
  db: PoolConnection,
  id: string,
  original = false,
): Promise<PaymentRecord[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT *,DATE_FORMAT(effective_on,'%Y-%m-%d') AS day,DATE_FORMAT(recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded FROM payment_records WHERE batch_id=? ORDER BY batch_revision LOCK IN SHARE MODE",
    [id],
  );
  const records: PaymentRecord[] = rows.map((r) => ({
    id: r.id,
    batchId: r.batch_id,
    revision: r.batch_revision,
    cycleId: r.cycle_id,
    scholarshipId: r.scholarship_id,
    outcome: r.outcome,
    amount: String(r.amount),
    effectiveOn: r.day,
    reference: r.reference_text,
    remarks: r.remarks,
    actorId: r.actor_id,
    actorName: r.actor_name,
    recordedAt: r.recorded,
  }));
  return original
    ? records
    : effectivePayments(records, await paymentCorrections(db, id));
}
export function reconcilePayments(
  frozen: OvrFinalization | null,
  payments: PaymentRecord[],
): Reconciliation {
  const members = frozen?.entries.map((e) => e.scholarshipId) ?? [],
    ids = new Set(payments.map((p) => p.scholarshipId)),
    missing = members.filter((id) => !ids.has(id));
  const cents = payments
    .filter((p) => p.outcome === "paid")
    .reduce((sum, p) => sum + BigInt(p.amount.replace(".", "")), 0n);
  return {
    complete:
      members.length > 0 &&
      missing.length === 0 &&
      payments.length === members.length &&
      payments.every((p) => members.includes(p.scholarshipId)),
    required: members.length,
    recorded: payments.length,
    missingScholarshipIds: missing,
    paidTotal: `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`,
    notPaid: payments.filter((p) => p.outcome === "not_paid").length,
  };
}
