import { useRef, useState, type FormEvent } from "react";
import type { SemesterAcademicView } from "../server/continuing/semester-academic";
import { configurationRequest as request } from "./configuration-api";
import { ApiError, type Session } from "./auth-api";
import ErrorNotice from "./ErrorNotice";

export default function SemesterCategoryCorrection({ data, path, session, onSaved, onBusy }: {
  data: SemesterAcademicView; path: string; session: Session; onSaved: () => void; onBusy: (busy: boolean) => void;
}) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | ApiError>("");
  const [category, setCategory] = useState(data.category === "degree" ? "non_degree" : "degree"), [reason, setReason] = useState(""), [reference, setReference] = useState(""), [reviewed, setReviewed] = useState(false);
  const pending = useRef<{ signature: string; key: string } | null>(null), saving = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving.current || !data.current || data.correctionBlocker || !reviewed) return;
    saving.current = true; setBusy(true); onBusy(true); setError("");
    const body = { expectedRevision: data.revision, academicRecordId: data.current.id, expectedAcademicVersion: data.current.version, category, reason, reference, reviewed };
    const signature = JSON.stringify(body);
    if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    try {
      await request(path + "/correct-category", { body, key: pending.current.key, csrf: session.csrfToken });
      pending.current = null; setOpen(false); onSaved();
    } catch (e) { setError(e instanceof ApiError ? e : "Could not confirm correction. Retry safely or reload."); }
    finally { saving.current = false; setBusy(false); onBusy(false); }
  }
  return <section className="border-top mt-3 pt-3" aria-label="Coordinator category correction">
    {data.correctionBlocker ? <p>{data.correctionBlocker}</p> : <>
      <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => setOpen((v) => !v)}>Correct recorded category</button>
      {open && <form onSubmit={submit} className="mt-2" aria-label="Correct recorded category">
        <p>Use this only to correct a recording error for the same course. The original category stays in history.</p>
        <ErrorNotice error={error} />
        <fieldset disabled={busy}>
          <label className="form-label d-block">Correct category<select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="degree">Degree</option><option value="non_degree">Non-degree / technical-vocational</option>
          </select></label>
          <label className="form-label d-block">Reason for correction<input className="form-control" required minLength={5} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <label className="form-label d-block">Supporting evidence reference<input className="form-control" required minLength={3} maxLength={300} value={reference} onChange={(e) => setReference(e.target.value)} /></label>
          <label className="d-block my-2"><input type="checkbox" required checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> I checked the evidence and confirm this corrects a recording error, not a course shift.</label>
          <button className="btn configuration-primary" disabled={!reviewed || category === data.category}>{busy ? "Saving correction..." : "Confirm category correction"}</button>
        </fieldset>
      </form>}
    </>}
  </section>;
}
