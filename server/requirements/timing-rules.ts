import { deadlineBoundary } from "../payouts/submission-rules.js";
import type { PhysicalReceiptEvidence } from "./receipt-evidence.js";

export type ReceiptTimingStatus = "missing_receipt" | "on_time" | "late" | "review_required" | "approved_late_encoding" | "rejected_late_encoding" | "unavailable";
export function classifyReceiptTiming(receipt: PhysicalReceiptEvidence | null, cutoffOn: string): ReceiptTimingStatus {
  if (!receipt) return "missing_receipt";
  if (receipt.receivedOn > cutoffOn) return "late";
  // Compare UTC timestamps only after preserving physical date-only precision.
  return Date.parse(receipt.recordedAt) < Date.parse(deadlineBoundary(cutoffOn)) ? "on_time" : "review_required";
}
export const timingLabels: Record<ReceiptTimingStatus, string> = {
  missing_receipt: "No physical receipt recorded",
  on_time: "Received and entered by cutoff",
  late: "Received after cutoff; consider a later batch where permitted",
  review_required: "Claimed on-time receipt entered late; Coordinator evidence review needed",
  approved_late_encoding: "Late encoding approved for this document and cutoff",
  rejected_late_encoding: "Late-encoding claim rejected for this document and cutoff",
  unavailable: "Timing requires review of receipt or period configuration",
};
