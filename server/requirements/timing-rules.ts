import {utcMicroseconds, windowTiming, type CutoffPolicy} from "../payouts/cutoff-policy.js";
import { deadlineBoundary } from "../payouts/submission-rules.js";
import type { PhysicalReceiptEvidence } from "./receipt-evidence.js";

export type ReceiptTimingStatus = "physical_time_review_required" | "missing_receipt" | "on_time" | "late" | "review_required" | "approved_late_encoding" | "rejected_late_encoding" | "unavailable" | "prior_batch_approved";
export function classifyReceiptTiming(receipt: PhysicalReceiptEvidence | null, cutoffOn: string, policy: CutoffPolicy = "whole_day_v1", localTime?:string): ReceiptTimingStatus {
  if (!receipt) return "missing_receipt";
  if (receipt.receivedOn > cutoffOn) return "late";
  if (policy !== "whole_day_v1") {
    if (receipt.receivedOn === cutoffOn) return "physical_time_review_required";
    return utcMicroseconds(receipt.recordedAt) <= utcMicroseconds(windowTiming(cutoffOn,policy,localTime).cutoffAtUtc) ? "on_time" : "review_required";
  }
  // Compare UTC timestamps only after preserving physical date-only precision.
  return Date.parse(receipt.recordedAt) < Date.parse(deadlineBoundary(cutoffOn)) ? "on_time" : "review_required";
}
export const timingLabels: Record<ReceiptTimingStatus, string> = {
  physical_time_review_required: "Physical receipt time is unknown for the selected timed cutoff; a separately authorized source-evidence decision is required",
  prior_batch_approved: "Deadline compliance accepted from reviewed prior batch approval; recorded receipt dates unchanged",
  missing_receipt: "No physical receipt recorded",
  on_time: "Received and entered by cutoff",
  late: "Received after cutoff; consider a later batch where permitted",
  review_required: "Claimed on-time receipt entered late; Coordinator evidence review needed",
  approved_late_encoding: "Late encoding approved for this document and cutoff",
  rejected_late_encoding: "Late-encoding claim rejected for this document and cutoff",
  unavailable: "Timing requires review of receipt or period configuration",
};
