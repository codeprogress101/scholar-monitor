export type ProcessingStamp = {
  effectiveOn: string;
  reference: string;
  reason: string;
  actorId: string;
  actorName: string;
  recordedAt: string;
};
export type PaymentRecord = {
  id: string;
  batchId: string;
  revision: number;
  cycleId: string;
  scholarshipId: string;
  outcome: "paid" | "not_paid";
  amount: string;
  effectiveOn: string;
  reference: string;
  remarks: string;
  actorId: string;
  actorName: string;
  recordedAt: string;
};
export type Reconciliation = {
  complete: boolean;
  required: number;
  recorded: number;
  missingScholarshipIds: string[];
  paidTotal: string;
  notPaid: number;
};
