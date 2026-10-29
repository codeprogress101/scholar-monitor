import type { OvrBatch, OvrDetail, OvrEntry } from "./model.js";
export type OvrBase = Pick<OvrDetail, "batch" | "cycle" | "canEdit">;
export type OvrSummary = OvrBase & {
  managedBatch: boolean;
  annualScopeCount: number;
  savedEntryCount: number;
  frozen: { count: number | null; originalCount: number; hash: string; finalizedAt: string | null; finalizedByName: string | null } | null;
  sourceValidation: "not_loaded";
  actions: { submitReview: boolean; finalize: boolean; process: boolean; close: boolean };
};
export type OvrSections = {
  candidates: OvrBase & Pick<OvrDetail, "managed" | "automatic" | "entries" | "finalization">;
  processing: OvrBase & Pick<OvrDetail, "effectiveFinalization" | "releases" | "amendments" | "payments" | "reconciliation" | "claimDeadline" | "treasuryEvidence" | "historicalReceipts" | "semesterPayments">;
  corrections: OvrBase & Pick<OvrDetail, "effectiveFinalization" | "payments" | "originalPayments" | "paymentCorrections" | "reconciliation" | "claimDeadline"> & { managedRelease: boolean };
  amendments: OvrBase & Pick<OvrDetail, "effectiveFinalization" | "amendments">;
  reconciliation: OvrBase & Pick<OvrDetail, "reconciliation">;
  reprocessing: OvrBase & Pick<OvrDetail, "entries" | "automatic" | "managed" | "deferrals" | "payments" | "reprocessing">;
  validation: OvrBase & Pick<OvrDetail, "entries" | "validation">;
};
export type OvrCandidatePage = {
  batchRevision: number; items: NonNullable<OvrDetail["managed"]>["items"];
  total: number; offset: number; limit: number; scope: "annual_records";
  // Legacy annual pages are partial and contain no whole-batch hash. Included /
  // excluded views assess the complete scope before paging. Every financial
  // command still performs its own fresh full validation.
  fullReviewRequired: boolean;
  review?: { sourceHash: string; includedCount: number; pendingCount: number; excludedCount: number; deferredCount: number; matchingCount: number; cutoffOn: string; cutoffPolicy?: string;cutoffLocalTime?:string|null;cutoffAtUtc?:string;finalizationFromUtc?:string; cutoffReached: boolean; reviewBlocker: {code:string;message:string}|null; finalizeBlocker: {code:string;message:string}|null; };
  view?: "included" | "excluded";
};
export type OvrEntryPage = { entries: OvrEntry[]; total: number; offset: number; limit: number; frozenHash: string | null };
export type OvrHistoryRow = Omit<OvrBatch, "validation"> & { validation?: Pick<NonNullable<OvrBatch["validation"]>, "valid" | "checkedAt"> };
