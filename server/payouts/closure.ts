import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";

/** Caller holds configuration_guard, as do batch and payment writers. */
export async function requireReconciledBatches(db: PoolConnection, cycleId: string) {
  const [batches] = await db.execute<RowDataPacket[]>(
    "SELECT id,code FROM ovr_batches WHERE cycle_id=? FOR UPDATE", [cycleId],
  );
  const blockers: { batchId: string; code: string; state: string }[] = [];
  for (const batch of batches) {
    // Current locking reads avoid a stale nested-MAX snapshot during concurrent closure.
    const [events] = await db.execute<RowDataPacket[]>(
      "SELECT state FROM ovr_batch_events WHERE batch_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE", [batch.id],
    );
    const state = events[0]?.state ?? "missing_history";
    if (state === "draft") {
      const [entries] = await db.execute<RowDataPacket[]>(
        "SELECT scholarship_id,action FROM ovr_entries WHERE batch_id=? ORDER BY batch_revision DESC LOCK IN SHARE MODE", [batch.id],
      );
      const seen = new Set<string>();
      const hasMembers = entries.some((entry) => {
        if (seen.has(entry.scholarship_id)) return false;
        seen.add(entry.scholarship_id);
        return entry.action === "add";
      });
      // An unused/emptied draft has no payment obligation; retain it read-only.
      if (!hasMembers) continue;
    }
    if (state !== "closed") {
      blockers.push({ batchId: batch.id, code: batch.code, state });
      continue;
    }
    const [corrections] = await db.execute<RowDataPacket[]>(
      "SELECT id,state FROM payment_corrections WHERE batch_id=? ORDER BY version DESC LOCK IN SHARE MODE", [batch.id],
    );
    const seen = new Set<string>();
    if (corrections.some((correction) => {
      if (seen.has(correction.id)) return false;
      seen.add(correction.id);
      return correction.state === "pending";
    })) blockers.push({ batchId: batch.id, code: batch.code, state: "pending_payment_correction" });
  }
  if (blockers.length) throw new AuthError(
    409, "PAYOUT_CYCLE_UNFINISHED",
    `Resolve payment corrections and reconcile/close unfinished Payroll batches before closing this payout: ${blockers.slice(0, 5).map((b) => b.code).join(", ")}${blockers.length > 5 ? " (and more)" : ""}.`,
    { blockers: blockers.slice(0, 100), total: blockers.length },
  );
}
