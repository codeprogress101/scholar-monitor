import type { OvrDetail } from "../server/ovr/model";
import { PagedTable, StatusBadge } from "./WorkspaceUI";

/** Historical membership comes from the effective frozen roster, never today's eligibility. */
export default function SavedPayrollTable({ detail }: { detail: OvrDetail }) {
  const snapshot = detail.effectiveFinalization?.snapshot ?? detail.finalization?.snapshot;
  if (!snapshot) return null;
  const money = (value: string) => Number(value).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
  return <section aria-label="Saved payroll" className="my-3">
    <h4>Payroll</h4>
    <p>{snapshot.entries.length} scholars · Paid: {money(detail.reconciliation.paidTotal)} · {detail.batch.state === "closed" ? "Closed" : "Payment processing"}</p>
    <PagedTable items={snapshot.entries} label="Payroll scholars" columns={["Scholar", "Scholar ID", "Payment status", "Amount paid", "Payment date"]}
      searchText={entry => `${entry.evidence.current.sources.scholarship.name} ${entry.evidence.current.sources.scholarship.humanId}`}
      row={entry => {
        const scholar = entry.evidence.current.sources.scholarship;
        const payment = detail.payments.find(p => p.scholarshipId === entry.scholarshipId);
        return <tr key={entry.scholarshipId}><td>{scholar.name}{entry.evidence.reprocessing && <small>Reprocessing - from <a href={`#payouts?cycle=${entry.evidence.reprocessing.sourceCycleId}&batch=${entry.evidence.reprocessing.sourceBatchId}`}>{entry.evidence.reprocessing.sourceCode}</a></small>}</td><td>{scholar.humanId}</td>
          <td><StatusBadge tone={payment?.outcome === "paid" ? "success" : "warning"}>{payment ? payment.outcome === "paid" ? "Paid" : payment.unpaidReason === "did_not_claim" ? detail.claimDeadline?.expired ? "Unclaimed - claim period ended" : "Did not claim" : "Not paid - needs review" : detail.claimDeadline?.expired ? "Claim period ended" : "Pending"}</StatusBadge></td>
          <td>{payment ? money(payment.amount) : "—"}</td><td>{payment?.effectiveOn ?? "—"}</td></tr>;
      }} />
  </section>;
}
