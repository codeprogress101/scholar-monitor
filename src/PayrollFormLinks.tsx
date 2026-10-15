export default function PayrollFormLinks({ batchId, draft }: { batchId: string; draft: boolean }) {
  const url = `/api/v1/ovr-batches/${batchId}/payroll-form?draft=${draft}`;
  return <div className="d-flex flex-wrap gap-2">
    <a className="btn configuration-primary" href={url} target="_blank" rel="noreferrer">{draft ? "Preview payroll (draft)" : "Open official payroll"}</a>
    <a className="btn btn-outline-secondary" href={`${url}&format=docx`}>Download Word</a>
  </div>;
}
