import { REQUIREMENT_STATUS_LABELS, type RequirementStatus } from "../server/requirements/workflow-model";
import { useEffect, useRef, useState } from "react";
import type { SharedDocumentReview } from "../server/requirements/shared-semester-documents";
import { configurationRequest as request } from "./configuration-api";
import { ApiError, type Session } from "./auth-api";
import ErrorNotice from "./ErrorNotice";
import FocusedDialog from "./FocusedDialog";

export default function SharedSemesterDocuments({ scholarId, semesterId, session, canReview, onSaved }: { scholarId: string; semesterId: string; session: Session; canReview: boolean; onSaved: () => void }) {
  const [data, setData] = useState<SharedDocumentReview | null>(null), [open, setOpen] = useState(false);
  const [error, setError] = useState<string | ApiError>(""), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  const [legacyId, setLegacy] = useState(""), [kind, setKind] = useState(""), [reason, setReason] = useState(""), [reference, setReference] = useState(""), [reviewed, setReviewed] = useState(false);
  const [sourceId, setSource] = useState("");
  const pending = useRef<{ path: string; body: object; key: string } | null>(null), running = useRef(false);
  const path = `scholars/${scholarId}/semester-requirements/${semesterId}/shared-documents`;
  useEffect(() => { const c = new AbortController(); request<SharedDocumentReview>(path, { signal: c.signal }).then(v => { if (!c.signal.aborted) setData(v); }).catch(e => { if (!c.signal.aborted) setError(e instanceof ApiError ? e : "Document sources unavailable."); }); return () => c.abort(); }, [path]);
  async function save(mode: "automatic" | "reviewed" | "reconcile") {
    if (!data || running.current) return;
    if (!pending.current) pending.current = { path: `${path}/${mode === "reconcile" ? "reconcile" : "reuse"}`, key: crypto.randomUUID(), body: mode === "automatic" ? { mode, sourceHash: data.sourceHash } : mode === "reviewed" ? { mode, sourceHash: data.sourceHash, legacyId, kind, reviewed, reason, reference } : { sourceHash: data.sourceHash, legacyId, sourceId, expectedRevision: data.links.find(l => l.legacyId === legacyId)?.revision ?? 0, reviewed, reason, reference } };
    running.current = true; setBusy(true); setError("");
    try {
      await request(pending.current.path, { body: pending.current.body, key: pending.current.key, csrf: session.csrfToken });
      pending.current = null; setUncertain(false); setReviewed(false);
      setData(await request<SharedDocumentReview>(path)); setLegacy(""); setKind(""); setReason(""); setReference(""); setOpen(false); onSaved();
    } catch (e) { const unknown = pending.current !== null && (!(e instanceof ApiError) || e.status >= 500); setUncertain(unknown); if (!unknown) pending.current = null; setError(e instanceof ApiError ? e : "Result unconfirmed. Retry the same action."); }
    finally { running.current = false; setBusy(false); }
  }
  if (!data) return <ErrorNotice error={error} />;
  if (!data.legacy.some(d => !data.unusedPlaceholderIds.includes(d.id))) return <p className="small">Uses semester documents for receiving and payroll.</p>;
  const automatic = data.checks.filter(c => c.automatic && data.unresolved.includes(c.id));
  const option = data.options.find(o => o.kind === kind);
  const reset = () => { setReviewed(false); setLegacy(""); setKind(""); setSource(""); setReason(""); setReference(""); };
  const complete = reviewed && legacyId && reason.trim().length >= 5 && reference.trim().length >= 3;
  return <section className="border rounded p-2 my-2" aria-label="Shared document sources">
    <strong>{data.unresolved.length ? "Document sources need review" : data.links.some(l => l.reused) ? "Existing document reused" : "Document histories reconciled"}</strong>{" "}
    <button className="btn btn-sm btn-outline-secondary" onClick={() => { reset(); setOpen(true); }}>Review document sources</button>
    {open && <FocusedDialog title="Review document sources" busy={busy || uncertain} onClose={() => { setOpen(false); reset(); }}>
      <ErrorNotice error={error} />
      {data.setupIssue && <p role="alert">{data.setupIssue}</p>}
      <fieldset disabled={busy || uncertain}>
        {data.legacy.filter(d => !data.unusedPlaceholderIds.includes(d.id)).map(d => <div key={d.id} className="border-bottom py-2">
          <strong>{d.name}</strong><p className="mb-1">Coverage: {d.coverageName ?? "Not recorded"}</p>
          {data.unresolved.includes(d.id) && data.checks.find(c => c.id === d.id)?.issues.map(issue => <p className="small mb-1" key={issue}>{issue}</p>)}
          <details><summary>History - {d.name} - {REQUIREMENT_STATUS_LABELS[d.status as RequirementStatus] ?? d.status}{data.links.some(l => l.legacyId === d.id && l.reused) ? " | Existing document reused" : ""}</summary>
          <ul>{d.history.map(h => <li key={h.id}>{h.effectiveOn}: {h.action} - {h.actorName}<br />{h.reason}{h.reference && <> | {h.reference}</>}</li>)}</ul>
          {!d.history.length && <p>No workflow decisions recorded.</p>}
          <details><summary>Technical details</summary><p>Instance: {d.id}<br />Policy version: {d.definitionVersionId}</p><pre className="text-wrap">{JSON.stringify(d.history, null, 2)}</pre></details>
        </details></div>)}
        {canReview && automatic.length > 0 && <div className="my-3"><p>{automatic.length} exact recorded match(es). No human attestation will be recorded.</p><button className="btn configuration-primary" onClick={() => void save("automatic")}>Reuse exact matches</button></div>}
        {canReview && data.unresolved.length > 0 ? <div className="mt-3">
          <h3>Review coverage</h3>
          <div className="row g-2"><label className="form-label col-sm-6">Existing document<select className="form-select" value={legacyId} onChange={e => { setLegacy(e.target.value); setKind(""); setSource(""); setReviewed(false); }}><option value="">Choose document</option>{data.legacy.filter(d => data.unresolved.includes(d.id)).map(d => <option key={d.id} value={d.id}>{d.name} | {REQUIREMENT_STATUS_LABELS[d.status as RequirementStatus] ?? d.status} | {d.id.slice(0,8)}</option>)}</select></label>
          <label className="form-label col-sm-6">Document submitted<select className="form-select" value={kind} onChange={e => { setKind(e.target.value); setReviewed(false); }}><option value="">Choose kind</option>{data.options.map(o => <option key={o.kind} value={o.kind}>{o.kind.toUpperCase()} - {o.coverageName}</option>)}</select></label></div>
          {option && <p><strong>Actual coverage:</strong> {option.coverageName}</p>}
          <div className="row g-2"><label className="form-label col-sm-6">Reason<input className="form-control" minLength={5} maxLength={500} value={reason} onChange={e => { setReason(e.target.value); setReviewed(false); }} /></label>
          <label className="form-label col-sm-6">Supporting reference<input className="form-control" minLength={3} maxLength={300} value={reference} onChange={e => { setReference(e.target.value); setReviewed(false); }} /></label></div>
          <label className="d-block my-2"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> I checked this document's identity, actual coverage and compatibility with the approved policy.</label>
          <p className="small">Keeps the original receipt and history. Verification must be reviewed again if its recorded context no longer matches.</p>
          <button className="btn configuration-primary" disabled={!complete || !option || !!data.setupIssue} onClick={() => void save("reviewed")}>Save coverage and reuse document</button>
          {data.ownerId && <details className="mt-3"><summary>Other reconciliation</summary>
            <details><summary>Semester document histories</summary>{data.documents.map(d => <details className="my-2" key={d.id}><summary>{d.name} | {d.coverageName ?? "Coverage not recorded"} | {REQUIREMENT_STATUS_LABELS[d.status as RequirementStatus] ?? d.status}</summary>
              {d.history.length ? <ul>{d.history.map(h => <li key={h.id}>{h.effectiveOn}: {h.action} - {h.actorName}<br />{h.reason} | {h.reference}</li>)}</ul> : <p>No workflow decisions recorded.</p>}
              <details><summary>Technical details</summary><p>Instance: {d.id}<br />Policy version: {d.definitionVersionId}</p><pre className="text-wrap">{JSON.stringify(d.history,null,2)}</pre></details>
            </details>)}</details>
            <label className="form-label d-block">Use another source<select className="form-select" value={sourceId} onChange={e => { setSource(e.target.value); setReviewed(false); }}><option value="">Choose source</option>{data.documents.map(d => <option key={d.id} value={d.id}>{d.name} | {d.coverageName} | {REQUIREMENT_STATUS_LABELS[d.status as RequirementStatus] ?? d.status}</option>)}{legacyId && <option value={legacyId}>Keep as a separate obligation</option>}</select></label>
            <button className="btn btn-outline-secondary" disabled={!complete || !sourceId} onClick={() => void save("reconcile")}>Record reconciliation</button>
          </details>}
        </div> : !canReview && data.unresolved.length > 0 ? <p>Coordinator review required.</p> : null}
      </fieldset>
      {uncertain && <button className="btn configuration-primary" disabled={busy} onClick={() => void save("automatic")}>Retry the same action</button>}
    </FocusedDialog>}
  </section>;
}
