import { digest } from "../auth/crypto.js";
import { reconcilePayments } from "../ovr/processing-state.js";
import { financialBasis, payrollState, type ExistingFinancialEvidence, type FinancialBasis } from "./contracts.js";

/** Stable JSON for these bounded evidence records, not a cache or command codec.
 * Object insertion order must not stale a review; array/roster order is significant.
 */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    }
    return item;
  });
}

function assertComplete(e: ExistingFinancialEvidence): void {
  if (e.scope !== "complete_batch" || !e.batch.id || !e.batch.cycleId ||
      !Number.isSafeInteger(e.batch.revision) || e.batch.revision < 1 ||
      !payrollState.safeParse(e.batch.state).success ||
      !Array.isArray(e.payments) || !Array.isArray(e.originalPayments) ||
      !Array.isArray(e.paymentCorrections) || !Array.isArray(e.amendments) ||
      !Array.isArray(e.historicalReceipts) || e.treasuryEvidence === undefined ||
      e.finalization === undefined || e.effectiveFinalization === undefined) {
    throw new Error("Complete same-snapshot financial evidence is required.");
  }
  const originalIds = new Set(e.originalPayments.map(p => p.id));
  if (originalIds.size !== e.originalPayments.length || e.payments.length !== originalIds.size ||
      new Set(e.payments.map(p => p.id)).size !== originalIds.size ||
      [...e.originalPayments, ...e.payments].some(p => p.batchId !== e.batch.id || p.cycleId !== e.batch.cycleId) ||
      e.payments.some(p => !originalIds.has(p.id)) ||
      e.paymentCorrections.some(c => c.batchId !== e.batch.id || !originalIds.has(c.paymentId)) ||
      e.amendments.some(a => a.batchId !== e.batch.id) ||
      [e.finalization, e.effectiveFinalization].some(f => f && f.snapshot.batchId !== e.batch.id)) {
    throw new Error("Financial sources belong to different batches or payment histories.");
  }
}

/** Dormant read adapter: no SQL, pool, cache, mutation or eligibility calculation.
 * Reuse the effective payment/classification outputs of paymentRecords(); do not
 * reimplement their ordering or correction precedence here. Callers must use
 * AuthorizationService.readSnapshot/withPermission and existing verified roster
 * readers. This fingerprint is NEVER sufficient authority for a financial write.
 */
export function existingFinancialBasis(e: ExistingFinancialEvidence): FinancialBasis {
  assertComplete(e);
  const sourceHash = digest(canonical({
    version: "payment-financial-basis/v1",
    batch: { id: e.batch.id, cycleId: e.batch.cycleId, revision: e.batch.revision, state: e.batch.state },
    frozen: e.finalization?.hash ?? null,
    effectiveFrozen: e.effectiveFinalization?.hash ?? null,
    // Stored/verified hashes pin full frozen evidence without copying the cohort.
    memberOrder: e.effectiveFinalization?.snapshot.entries.map(row => row.scholarshipId) ?? [],
    originals: e.originalPayments,
    effective: e.payments,
    corrections: [...e.paymentCorrections].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : a.version - b.version),
    amendments: e.amendments.map(a => ({ id: a.id, version: a.version, revision: a.revision, state: a.state, beforeHash: a.beforeHash, afterHash: a.afterHash ?? null }))
      .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : a.version - b.version),
    treasury: e.treasuryEvidence,
    historical: [...e.historicalReceipts].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : a.version - b.version),
  }));
  return financialBasis.parse({
    version: "payment-financial-basis/v1", batchId: e.batch.id,
    batchRevision: e.batch.revision, sourceHash, scope: e.scope,
    freshness: "snapshot_only", authorizesPayment: false,
  });
}

/** Compatibility projection only: retain current reconciliation semantics,
 * including old withheld/review completion. P03 changes are NOT enabled here.
 */
export function existingPaymentProjection(e: ExistingFinancialEvidence) {
  return {
    basis: existingFinancialBasis(e),
    payments: e.payments,
    originalPayments: e.originalPayments,
    paymentCorrections: e.paymentCorrections,
    reconciliation: reconcilePayments(e.effectiveFinalization?.snapshot ?? null, e.payments),
  };
}
