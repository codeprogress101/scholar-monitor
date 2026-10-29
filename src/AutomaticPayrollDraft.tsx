import PayrollFormLinks from "./PayrollFormLinks";
import type { OvrSections } from "../server/ovr/detail-model";
type OvrDetail = OvrSections["candidates"];
import { PagedTable } from "./WorkspaceUI";

export default function AutomaticPayrollDraft({ detail }: { detail: OvrDetail }) {
  const form = detail.automatic?.form;
  if (!form) return null;
  return <section aria-label="Current payroll draft">
    <div className="card-heading">
      <div><h4>Current payroll draft</h4><p>Eligible scholars appear automatically. Submit the draft when ready for Coordinator approval.</p></div>
      {!!form.rows.length && <PayrollFormLinks batchId={detail.batch.id} draft />}
    </div>
    <p><strong>{form.rows.length} scholars</strong> · ₱{(form.rows.reduce((n, r) => n + r.amountCentavos, 0) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
    {!form.rows.length && <p>No eligible scholars yet. Verify the required documents and check official masterlist membership. Scholars already assigned to another batch are excluded.</p>}
    <PagedTable items={form.rows} label="Current draft scholars" columns={["Scholar", "School / year", "Amount"]} searchText={r => `${r.lastName} ${r.firstName} ${r.humanId}`} row={r => <tr key={r.scholarshipId}>
      <td><strong>{r.lastName}, {r.firstName} {r.middleName}</strong><small>{r.humanId}</small>{r.reprocessingNote && <small>{r.reprocessingNote}</small>}</td>
      <td>{r.school}<small>Year {r.yearLevel}</small></td>
      <td>₱{(r.amountCentavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
    </tr>} />
  </section>;
}
