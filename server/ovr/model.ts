import type { PaymentCorrection } from "./payment-correction-state.js";
import type { OvrAmendment } from "./amendment-state.js";
import type {
  ProcessingStamp,
  PaymentRecord,
  Reconciliation,
} from "./processing-model.js";
import type { EligibilityAssessment } from "../eligibility/model.js";
import type { EffectiveEligibility } from "../eligibility/override-model.js";
import type { PayoutCycle } from "../payouts/model.js";
export type OvrIssue = {
  code: string;
  message: string;
  scholarshipId?: string;
};
export type OvrEvidence = {
  reprocessing?: import("./reprocessing.js").RetryProvenance;
  current: EligibilityAssessment;
  effective: EffectiveEligibility;
  fingerprint: string;
};
export type OvrEntry = {
  scholarshipId: string;
  addedRevision: number;
  evidence: OvrEvidence;
};
export type OvrValidation = {
  valid: boolean;
  checkedAt: string;
  issues: OvrIssue[];
  entries: {
    scholarshipId: string;
    evidence: OvrEvidence;
    issues: OvrIssue[];
  }[];
};
export type OvrBatch = {
  automaticSourceHash?: string;
  id: string;
  cycleId: string;
  code: string;
  name: string;
  revision: number;
  state: string;
  action: string;
  actorName: string;
  actorId?: string;
  recordedAt: string;
  reason: string;
  reference: string;
  entry?: {
    scholarshipId: string;
    humanId: string;
    name: string;
    fingerprint: string;
  };
  validation?: OvrValidation;
  submission?: {
    actorId: string;
    actorName: string;
    submittedAt: string;
    revision: number;
  };
  finalizationHash?: string;
  administration?: ProcessingStamp;
  processing?: ProcessingStamp;
  closure?: ProcessingStamp & {
    reconciled: true;
    reconciliation: Reconciliation;
  };
  payment?: Pick<
    PaymentRecord,
    "scholarshipId" | "outcome" | "amount" | "effectiveOn"
  >;
};
export type OvrFinalization = {
  legacyPayrollForm?: import("./payroll-form.js").PayrollForm;
  payrollForm?: import("./payroll-form.js").PayrollForm;
  batchId: string;
  revision: number;
  code: string;
  name: string;
  cycle: PayoutCycle;
  entries: OvrEntry[];
  validation: OvrValidation;
  submission: NonNullable<OvrBatch["submission"]>;
  finalizedBy: string;
  finalizedByName: string;
  finalizedAt: string;
  reason: string;
  reference: string;
};
export type OvrDetail = {
  semesterPayments?: {scholarshipId:string;paidBatchId:string|null;paidCycleId:string|null;paymentId:string|null;pendingCorrection:boolean}[];
  historicalReceipts?: Awaited<ReturnType<typeof import("./treasury-state.js").historicalReceipts>>;
  treasuryEvidence?: import("./treasury-state.js").TreasuryEvidence | null;
  claimDeadline?: {endsOn: string | null; expired: boolean};
  reprocessing?: import("./reprocessing.js").ReprocessingItem[];
  deferrals?: {scholarshipId: string; name: string; reason: string}[];
  automatic?: import("./automatic-draft.js").AutomaticDraft | null;
  releases?: import("./managed-release.js").ReleaseEntry[] | null;
  managed?: import("./managed-payroll.js").ManagedCandidates | null;
  batch: OvrBatch;
  cycle: PayoutCycle;
  entries: OvrEntry[];
  validation: OvrValidation;
  history: OvrBatch[];
  canEdit: boolean;
  payments: PaymentRecord[];
  originalPayments: PaymentRecord[];
  paymentCorrections: PaymentCorrection[];
  amendments: OvrAmendment[];
  effectiveFinalization: { snapshot: OvrFinalization; hash: string } | null;
  reconciliation: Reconciliation;
  finalization: { snapshot: OvrFinalization; hash: string } | null;
};
