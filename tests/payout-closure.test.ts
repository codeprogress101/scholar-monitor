import { expect, it, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import { requireReconciledBatches } from "../server/payouts/closure";

function connection(state: string | undefined, entries: object[] = [], corrections: object[] = []) {
  const execute = vi.fn(async (sql: string) => {
    if (sql.includes("FROM ovr_batches")) return [[{ id: "batch", code: "PAY-01" }]];
    if (sql.includes("FROM ovr_batch_events")) return [state ? [{ state }] : []];
    if (sql.includes("FROM ovr_entries")) return [entries];
    if (sql.includes("FROM payment_corrections")) return [corrections];
    throw new Error("Unexpected query");
  });
  return { execute } as unknown as PoolConnection;
}
it.each(["review", "finalized", "submitted", "processed", undefined])("blocks unreconciled batch %s", async (state) => {
  await expect(requireReconciledBatches(connection(state), "cycle")).rejects.toMatchObject({ code: "PAYOUT_CYCLE_UNFINISHED" });
});
it("blocks a populated draft but permits an unused or emptied draft", async () => {
  await expect(requireReconciledBatches(connection("draft", [{ scholarship_id: "s", action: "add" }]), "cycle")).rejects.toMatchObject({ code: "PAYOUT_CYCLE_UNFINISHED" });
  await expect(requireReconciledBatches(connection("draft"), "cycle")).resolves.toBeUndefined();
  await expect(requireReconciledBatches(connection("draft", [{ scholarship_id: "s", action: "remove" }, { scholarship_id: "s", action: "add" }]), "cycle")).resolves.toBeUndefined();
});
it("permits reconciled batches only when no latest correction is pending", async () => {
  await expect(requireReconciledBatches(connection("closed", [], [{ id: "c", state: "pending" }]), "cycle")).rejects.toMatchObject({ code: "PAYOUT_CYCLE_UNFINISHED" });
  await expect(requireReconciledBatches(connection("closed", [], [{ id: "c", state: "rejected" }, { id: "c", state: "pending" }]), "cycle")).resolves.toBeUndefined();
});
