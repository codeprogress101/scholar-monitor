import { useState } from "react";
import type { SemesterComplianceView } from "../server/continuing/semester-compliance";
import type { AdverseField } from "../server/continuing/finding-corrections";

const label = { hasFailed: "Failed subject", hasDropped: "Dropped subject" };
export default function SemesterFindingCorrection({ data, busy, onSave }: { data: SemesterComplianceView; busy: boolean; onSave: (body: object) => Promise<void> }) {
  const [fields, setFields] = useState<AdverseField[]>([]), [reason, setReason] = useState(""), [confirmed, setConfirmed] = useState(false);
  return <details className="my-2"><summary>Coordinator: correct a failed/dropped recording error</summary>
    <p>Use this only when findings were entered incorrectly. Review the recorded COG versions and confirm the error. A genuine failed or dropped subject requires a formal decision under approved policy.</p>
    {data.correctionBlocker && <p className="alert alert-info">{data.correctionBlocker}</p>}
    <form aria-label="Correct recorded subject findings" onSubmit={(e) => { e.preventDefault(); void onSave({ expectedRevision: data.revision, fields, reason, recordingErrorConfirmed: confirmed, academicOnly: data.ended }); }}>
      <fieldset disabled={busy || Boolean(data.correctionBlocker)}>
        {(["hasFailed", "hasDropped"] as const).filter((f) => data.unresolvedFindings.some((t) => t.field === f)).map((field) => <div key={field} className="my-2">
          <label><input type="checkbox" checked={fields.includes(field)} onChange={(e) => setFields(e.target.checked ? [...fields, field] : fields.filter((f) => f !== field))} /> {label[field]} was recorded incorrectly; correct to No</label>
          <ul>{data.unresolvedFindings.filter((t) => t.field === field).map((t) => {
            const review = data.history.find((r) => r.id === t.reviewId)!, cog = review.documents.find((d) => d.kind === "cog");
            return <li key={t.reviewId}>Review {review.revision}, {review.actorName}, {review.recordedAt}; COG version {cog?.version ?? "not recorded"}.</li>;
          })}</ul>
        </div>)}
        <label className="form-label d-block">Explain the recording error<textarea className="form-control" required minLength={5} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <label className="d-block my-2"><input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I checked the affected reviews and verified COG. These are recording errors, not exceptions for genuine failed or dropped subjects.{data.ended && " This academic-only correction does not authorize late payment."}</label>
        <button className="btn configuration-primary" disabled={!fields.length}>Save recording correction</button>
      </fieldset>
    </form>
  </details>;
}
