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
    "SELECT p.*,t.evidence_revision,DATE_FORMAT(t.confirmed_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS confirmed,DATE_FORMAT(effective_on,'%Y-%m-%d') AS day,DATE_FORMAT(recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded FROM payment_records p LEFT JOIN payroll_treasury_confirmations t ON t.payment_id=p.id WHERE p.batch_id=? ORDER BY batch_revision LOCK IN SHARE MODE",
    [id],
  );
  const records: PaymentRecord[] = rows.map((r) => ({
    treasuryEvidenceRevision: r.evidence_revision ?? undefined,
    confirmedAt: r.confirmed ?? undefined,
    id: r.id,
    batchId: r.batch_id,
    revision: r.batch_revision,
    cycleId: r.cycle_id,
    scholarshipId: r.scholarship_id,
    outcome: r.outcome,
    unpaidReason: r.unpaid_reason ?? null,
    amount: String(r.amount),
    effectiveOn: r.day,
    reference: r.reference_text,
    remarks: r.remarks,
    actorId: r.actor_id,
    actorName: r.actor_name,
    recordedAt: r.recorded,
  }));
  const result = original ? records : effectivePayments(records, await paymentCorrections(db, id));
  for (const p of result) {
    const [[classified]] = await db.execute<RowDataPacket[]>("SELECT unpaid_reason,recorded_at FROM payroll_unpaid_classifications WHERE payment_id=? ORDER BY revision DESC LIMIT 1", [p.id]);
    const classificationIsLatest = !original && classified && new Date(classified.recorded_at).getTime() >= new Date(p.recordedAt).getTime();
    p.unpaidReason = p.outcome === "not_paid" ? (classificationIsLatest ? classified.unpaid_reason : p.unpaidReason ?? null) : null;
  }
  return result;
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
    paid: payments.filter(p => members.includes(p.scholarshipId) && p.outcome === "paid").length,
    unpaid: members.filter(id => !payments.some(p => p.scholarshipId === id && (p.outcome === "paid" || p.unpaidReason === "did_not_claim"))).length,
    notPaid: payments.filter((p) => p.outcome === "not_paid").length,
    unclaimed: payments.filter(p => p.outcome === "not_paid" && p.unpaidReason === "did_not_claim").length,
    needsReview: payments.filter(p => p.outcome === "not_paid" && p.unpaidReason !== "did_not_claim").length,
  };
}
