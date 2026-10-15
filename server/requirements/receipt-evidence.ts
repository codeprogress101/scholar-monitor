import type { RequirementReceipt } from "./instances-model.js";
import type { RequirementWorkflowEvent } from "./workflow-model.js";

export type PhysicalReceiptEvidence = {
  source: "initial_receipt" | "resubmission";
  sourceId: string;
  version: number;
  receivedOn: string;
  physicalPrecision: "date";
  recordedAt: string;
  recordedBy: string;
  documentType?: RequirementReceipt["documentType"];
};
export type ReceiptEvidence = { current: PhysicalReceiptEvidence | null; issue: string | null };

// Read evidence only: verification/waiver dates are never physical receipt dates.
// Incomplete replacement evidence must not borrow the original receipt's timing.
export function currentReceiptEvidence(receipt: RequirementReceipt | null, history: RequirementWorkflowEvent[]): ReceiptEvidence {
  const replacement = history.filter((e) => e.action === "resubmit").reduce<RequirementWorkflowEvent | undefined>((latest, e) => !latest || e.version > latest.version ? e : latest, undefined);
  if (!replacement && !receipt) return { current: null, issue: null };
  const paper = replacement ? replacement.details.receipt : receipt;
  const recordedAt = replacement ? replacement.recordedAt : receipt?.recordedAt;
  const receivedOn = paper?.receivedOn;
  if (!receivedOn || !/^\d{4}-\d{2}-\d{2}$/.test(receivedOn) || !Number.isFinite(Date.parse(`${receivedOn}T00:00:00Z`)) || new Date(`${receivedOn}T00:00:00Z`).toISOString().slice(0, 10) !== receivedOn || !recordedAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(recordedAt) || !Number.isFinite(Date.parse(recordedAt)))
    return { current: null, issue: "Receipt timing evidence is incomplete. Review the original record; an earlier receipt or decision date cannot replace it." };
  return { current: {
    source: replacement ? "resubmission" : "initial_receipt",
    sourceId: replacement ? replacement.id : receipt!.id,
    version: replacement ? replacement.version : 1,
    receivedOn, physicalPrecision: "date", recordedAt,
    recordedBy: replacement ? replacement.actorName : receipt!.receiverName,
    ...(paper?.documentType ? { documentType: paper.documentType } : {}),
  }, issue: null };
}
