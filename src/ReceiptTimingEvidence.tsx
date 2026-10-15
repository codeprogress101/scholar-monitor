import type { ReceiptEvidence } from "../server/requirements/receipt-evidence";
import { documentLabels } from "./document-labels";

export default function ReceiptTimingEvidence({ evidence }: { evidence?: ReceiptEvidence }) {
  if (!evidence) return null;
  if (evidence.issue) return <p role="alert">{evidence.issue}</p>;
  const receipt = evidence.current;
  if (!receipt) return null;
  const recorded = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "medium" }).format(new Date(receipt.recordedAt));
  return <div className="border rounded p-2 mb-2" aria-label="Current receipt evidence">
    <strong>{receipt.source === "resubmission" ? "Latest replacement received" : "Initial document received"}{receipt.documentType ? `: ${documentLabels[receipt.documentType]}` : ""}</strong>
    <div>Physical receipt: {receipt.receivedOn} (date only; time not recorded).</div>
    <div>Entered in system: {recorded} (Asia/Manila), by {receipt.recordedBy}.</div>
    <small>These dates record receipt and entry, not deadline eligibility or verification.</small>
  </div>;
}
