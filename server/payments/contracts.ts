import { z } from "zod";
import type { OvrBatch, OvrDetail } from "../ovr/model.js";
import type { PaymentRecord } from "../ovr/processing-model.js";
import type { processingTransition } from "../ovr/processing-service.js";

/** Internal contracts only. No permission, API, workflow activation or new ledger. */
export const paymentFoundation = Object.freeze({ phase: "P01", newActionsEnabled: false } as const);
export const payrollState = z.enum(["draft", "review", "finalized", "submitted", "processed", "closed"]);
export type PayrollState = z.infer<typeof payrollState>;
// Retain the existing transition function as the only implemented state machine.
export type ExistingProcessingAction = Parameters<typeof processingTransition>[0];
export type ExistingPaymentOutcome = PaymentRecord["outcome"];

/** Actual date and audit time remain different facts, including unknown legacy dates. */
export type PaymentDateFacts = Pick<PaymentRecord, "effectiveOn" | "recordedAt">;

/** Future origins are deliberately distinct. These types cannot reserve or pay. */
export type IndividualPaymentOrigin =
  | { kind: "unclaimed"; documents: "dv_only"; originalBatchId: string; originalPaymentId: string; entitlementId: string }
  | { kind: "omitted"; documents: "or_and_dv"; originalBatchId: string; scholarId: string; semesterId: string; entitlementId: string | null };

/** Supply complete, authorized evidence from ONE existing transaction/snapshot.
 * A page, cached browser detail or a revision alone is not this contract.
 * Missing sources must not silently mean empty history. No sources are loaded here.
 */
export type ExistingFinancialEvidence = Pick<OvrDetail,
  "payments" | "originalPayments" | "paymentCorrections" | "amendments" |
  "finalization" | "effectiveFinalization"
> & {
  scope: "complete_batch";
  batch: Pick<OvrBatch, "id" | "cycleId" | "revision" | "state">;
  treasuryEvidence: NonNullable<OvrDetail["treasuryEvidence"]> | null;
  historicalReceipts: NonNullable<OvrDetail["historicalReceipts"]>;
};

export const financialBasis = z.object({
  version: z.literal("payment-financial-basis/v1"),
  batchId: z.string().min(1),
  batchRevision: z.number().int().positive(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  scope: z.literal("complete_batch"),
  freshness: z.literal("snapshot_only"),
  authorizesPayment: z.literal(false),
}).strict();
export type FinancialBasis = z.infer<typeof financialBasis>;
