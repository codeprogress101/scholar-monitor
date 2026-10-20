import { useEffect, useRef, useState } from "react";
import type { DocumentBatchPreview, BatchDocument } from "../server/requirements/batch-model";
import { type Session } from "./auth-api";
import { batchResultUncertain, retainedBatch, retainBatch, type PendingBatchCommand } from "./batch-result";
import { configurationRequest as request } from "./configuration-api";
import FocusedDialog from "./FocusedDialog";
import { receivingToday } from "./receiving-selection";
import { scholarAddress } from "./scholar-navigation";

type ImportChoice = { id: string; fileName: string; confirmedAt: string; scholarCount: number };
export default function BatchDocumentVerification({ session, semesters, initialSemester, canReviewPlacement, onClose, onChanged }: {
  session: Session; semesters: { id: string; name: string }[]; initialSemester: string; canReviewPlacement: boolean;
  onClose: () => void; onChanged: () => void;
}) {
  const [restored] = useState(() => retainedBatch(session.user.id));
  const [imports, setImports] = useState<ImportChoice[]>([]), [importId, setImportId] = useState(restored?.body.importId ?? "");
  const [semesterId, setSemesterId] = useState(restored?.body.semesterId ?? initialSemester), [preview, setPreview] = useState<DocumentBatchPreview | null>(null);
  const [mode, setMode] = useState<"verify" | "placement">(restored?.path.endsWith("historical-placement") ? "placement" : "verify"), [kind, setKind] = useState("both"), [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]), [yearLevels, setYearLevels] = useState<Record<string, string>>({});
  const [ordinary, setOrdinary] = useState(false), [deferred, setDeferred] = useState(false), [placement, setPlacement] = useState(false);
  const [reference, setReference] = useState(""), [reason, setReason] = useState(""), [effectiveOn, setEffectiveOn] = useState(receivingToday());
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [uncertain, setUncertain] = useState(Boolean(restored));
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [offset, setOffset] = useState(0), [reload, setReload] = useState(0);
  const pending = useRef<PendingBatchCommand | null>(restored), busy = useRef(false);
  const locked = saving || uncertain;
  function resetReview() { setSelected([]); setOrdinary(false); setDeferred(false); setPlacement(false); setOffset(0); }
  useEffect(() => {
    const abort = new AbortController();
    request<{ items: ImportChoice[] }>("document-batches", { signal: abort.signal }).then(data => {
      if (abort.signal.aborted) return;
      setImports(data.items);
      if (data.items.length === 1 && !restored) { setLoading(true); setImportId(data.items[0].id); }
    }).catch(e => { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Could not load imports."); });
    return () => abort.abort();
  }, [restored]);
  useEffect(() => {
    const abort = new AbortController();
    if (importId && semesterId && !uncertain) {
      request<DocumentBatchPreview>(`document-batches/preview?${new URLSearchParams({ importId, semesterId })}`, { signal: abort.signal }).then(data => {
        if (!abort.signal.aborted) setPreview(data);
      }).catch(e => { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Could not load the document batch."); })
        .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    }
    return () => abort.abort();
  }, [importId, semesterId, reload, uncertain]);
  function changeScope(change: () => void) {
    if (locked || busy.current) return;
    change(); setPreview(null); resetReview(); setError(""); setNotice(""); setLoading(true);
  }
  const documents = preview?.documents ?? [];
  const candidates = documents.filter(d => mode === "placement" ? Boolean(d.historicalPlacement) : d.outcome === "ready");
  const visible = documents.filter(d => (kind === "both" || d.kind === kind) && `${d.humanId} ${d.name}`.toLowerCase().includes(search.toLowerCase()));
  const selectable = visible.filter(d => mode === "placement" ? Boolean(d.historicalPlacement) : d.outcome === "ready");
  const chosen = candidates.filter(d => selected.includes(d.id));
  const hasOrdinary = chosen.some(d => !d.context?.coursePending), hasDeferred = chosen.some(d => d.context?.coursePending);
  const canSubmit = chosen.length > 0 && reference.trim().length >= 3 && reason.trim().length >= 5 &&
    (mode === "placement" || (/^\d{4}-\d{2}-\d{2}$/.test(effectiveOn) && effectiveOn <= receivingToday())) &&
    (mode === "placement" ? placement : (!hasOrdinary || ordinary) && (!hasDeferred || deferred));
  function selection(change: (old: string[]) => string[]) {
    setSelected(change); setOrdinary(false); setDeferred(false); setPlacement(false);
  }
  async function submit(retry = false) {
    if (busy.current || (!retry && (!preview || !canSubmit || pending.current))) return;
    if (!retry && preview) pending.current = { path: `document-batches/${mode === "placement" ? "historical-placement" : "verify"}`, key: crypto.randomUUID(), body: {
      importId, semesterId, scopeHash: preview.scopeHash, reference: reference.trim(), reason: reason.trim(),
      ...(mode === "placement" ? { coveredPlacementConfirmed: placement, items: chosen.map(d => ({ id: d.id, sourceHash: d.historicalPlacement!.sourceHash, yearLevel: yearLevels[d.id]?.trim() || null })) }
        : { effectiveOn, ordinaryChecksConfirmed: ordinary, deferredCourseChecksConfirmed: deferred, items: chosen.map(d => ({ id: d.id, version: d.version, contextHash: d.contextHash! })) }),
    } };
    if (!pending.current) return;
    retainBatch(session.user.id, pending.current);
    busy.current = true; setSaving(true); setError("");
    try {
      const result = await request<{ verifiedCount?: number; reviewedCount?: number }>(pending.current.path, { ...pending.current, csrf: session.csrfToken, signal: AbortSignal.timeout(120000) });
      setNotice(result.verifiedCount !== undefined ? `${result.verifiedCount} documents verified. Academic assessment and payroll authorization remain separate.` : `${result.reviewedCount} historical placements recorded from reviewed COGs. Review the documents again before verification.`);
      pending.current = null; retainBatch(session.user.id, null); setUncertain(false); resetReview(); setYearLevels({}); setPreview(null); setLoading(true); setReload(v => v + 1); onChanged();
    } catch (e) {
      const unknown = batchResultUncertain(e, retry);
      setUncertain(unknown);
      if (!unknown) { pending.current = null; retainBatch(session.user.id, null); resetReview(); setPreview(null); setLoading(true); setReload(v => v + 1); }
      setError(e instanceof Error ? e.message : "The result could not be confirmed.");
    } finally { busy.current = false; setSaving(false); }
  }
  function rowOutcome(d: BatchDocument) {
    if (mode === "placement" && d.historicalPlacement) return "Confirm against the held COG";
    return d.outcome === "ready" ? "Ready for verification" : d.outcome === "current" ? "Verified against current records" : d.outcome === "not_required" ? "Approved entrant exception - COG not required" : d.issue?.message ?? "Review required";
  }
  return <FocusedDialog className="batch-document-dialog" title={mode === "placement" ? "Review historical COG placement" : "Verify batch documents"} busy={locked} onClose={onClose}>
    <p>Use the papers already held. Receipt dates stay unchanged; verification records a separate decision for each selected document.</p>
    {error && <p role="alert" className="alert alert-danger">{error}</p>}
    {notice && <p role="status" className="alert alert-info">{notice}</p>}
    {uncertain && <div role="alert" className="alert alert-warning"><p>Result not confirmed. The exact selection ({restored?.body.items.length ?? chosen.length} documents), payload and retry key are retained. Resolve this request before leaving or replacing it.</p><button className="btn configuration-primary" disabled={saving} onClick={() => void submit(true)}>{saving ? "Checking..." : "Retry the same action"}</button></div>}
    <fieldset disabled={locked}>
      <div className="row g-3 mb-3">
        <label className="col-md-6">Confirmed import<select className="form-select" value={importId} onChange={e => changeScope(() => setImportId(e.target.value))}><option value="">Choose import</option>{imports.map(i => <option key={i.id} value={i.id}>{i.fileName} / {i.scholarCount} scholars / {new Date(i.confirmedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} / {i.id.slice(0, 8)}</option>)}</select></label>
        <label className="col-md-6">Receiving semester<select className="form-select" value={semesterId} onChange={e => changeScope(() => setSemesterId(e.target.value))}><option value="">Choose semester</option>{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      </div>
      {!imports.length && <p>No confirmed import batches are available.</p>}
      {loading && importId && semesterId && <p role="status">Loading document sources and current reviews...</p>}
      {preview && <>
        <p>{preview.scholarCount} scholars. {documents.filter(d => d.outcome === "ready").length} ready; {documents.filter(d => d.outcome === "blocked").length} blocked; {documents.filter(d => d.outcome === "current").length} already verified; {documents.filter(d => d.outcome === "not_required").length} approved exceptions.</p>
        {preview.missingScholarCount > 0 && <p role="alert" className="alert alert-warning">{preview.missingScholarCount} scholars have no shared requirements for this semester. Enable the approved Semester documents setup and prepare their requirements in Registry. No checklist is created by this review.</p>}
        {mode === "placement" ? <>
          <p>Only select rows whose held COG confirms the school and course shown below for its covered semester. These are current-placement suggestions until you confirm them. Unknown or different details must be resolved in the individual academic record.</p>
          <p>Year level may stay explicitly "Not recorded"; no previous scholarship, grades or academic assessment is created.</p>
          <button type="button" className="btn btn-outline-secondary mb-3" onClick={() => { setMode("verify"); resetReview(); }}>Back to document verification</button>
        </> : canReviewPlacement && <button type="button" className="btn btn-outline-secondary mb-3" onClick={() => { setMode("placement"); resetReview(); setKind("cog"); }}>Review historical COG placement ({documents.filter(d => d.historicalPlacement).length})</button>}
        <div className="row g-2 mb-2"><label className="col-md-8">Search scholar<input className="form-control" value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} /></label><label className="col-md-4">Document<select className="form-select" value={kind} onChange={e => { setKind(e.target.value); setOffset(0); }}><option value="both">COR and COG</option><option value="cor">COR</option><option value="cog">COG</option></select></label></div>
        <p>{chosen.length} selected. <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!selectable.length} onClick={() => selection(old => [...new Set([...old, ...selectable.map(d => d.id)])])}>Select all ready in this filter ({selectable.length})</button>{" "}<button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => selection(() => [])}>Clear selection</button></p>
        <div className="table-responsive batch-document-table"><table className="table"><thead><tr><th scope="col">Select / scholar</th><th scope="col">Document / coverage</th><th scope="col">Review</th></tr></thead><tbody>{visible.slice(offset, offset + 20).map(d => <tr key={d.id}>
          <td><label><input type="checkbox" checked={selected.includes(d.id)} disabled={mode === "placement" ? !d.historicalPlacement : d.outcome !== "ready"} onChange={e => selection(old => e.target.checked ? [...old, d.id] : old.filter(id => id !== d.id))} /> {d.humanId}<br />{d.name}</label></td>
          <td>{d.kind.toUpperCase()}<br />{d.context?.entrantCard ? `${d.context.schoolName} / ${d.context.yearCode} / ${d.context.semesterCode}` : d.coverage}<br /><small>Received: {d.receivedOn ?? "Not recorded"}</small></td>
          <td>{rowOutcome(d)}{mode === "placement" && d.historicalPlacement ? <><p>{d.historicalPlacement.schoolName} / {d.historicalPlacement.courseName}</p><label>Covered year level (if known)<input className="form-control" maxLength={60} value={yearLevels[d.id] ?? ""} placeholder="Not recorded" onChange={e => { setYearLevels(old => ({ ...old, [d.id]: e.target.value })); setPlacement(false); }} /></label></> : d.context ? <p>{d.context.schoolName} / {d.context.courseName}{d.context.coursePending && " - course comparison deferred under approved exception"}</p> : null}
            {d.outcome === "blocked" && <p><a href={scholarAddress(d.scholarId, "academic", d.coverageYearId)}>Review covered-year academic record</a></p>}
          </td>
        </tr>)}</tbody></table></div>
        {visible.length > 20 && <div className="d-flex gap-2 align-items-center my-2"><button type="button" className="btn btn-outline-secondary" disabled={!offset} onClick={() => setOffset(v => Math.max(0, v - 20))}>Previous</button><span>{offset + 1}-{Math.min(offset + 20, visible.length)} of {visible.length}</span><button type="button" className="btn btn-outline-secondary" disabled={offset + 20 >= visible.length} onClick={() => setOffset(v => v + 20)}>Next</button></div>}
        <label className="d-block my-2">Supporting reference / document location<input className="form-control" maxLength={300} value={reference} onChange={e => { setReference(e.target.value); setOrdinary(false); setDeferred(false); setPlacement(false); }} /></label>
        <label className="d-block my-2">Reason<textarea className="form-control" maxLength={500} value={reason} onChange={e => { setReason(e.target.value); setOrdinary(false); setDeferred(false); setPlacement(false); }} /></label>
        {mode === "verify" && <label className="d-block my-2">Verification effective date<input type="date" className="form-control" max={receivingToday()} value={effectiveOn} onChange={e => { setEffectiveOn(e.target.value); setOrdinary(false); setDeferred(false); }} /></label>}
        {mode === "placement" ? <label className="d-block my-3"><input type="checkbox" checked={placement} onChange={e => setPlacement(e.target.checked)} /> I reviewed each selected COG and confirm the shown school/course for its covered semester. Unknown year levels remain Not recorded. This saves historical placement only.</label> : <>
          {hasOrdinary && <label className="d-block my-3"><input type="checkbox" checked={ordinary} onChange={e => setOrdinary(e.target.checked)} /> For every selected document without a course-pending exception, I checked identity, actual coverage, school/course, approved policy and physical validity.</label>}
          {hasDeferred && <label className="d-block my-3"><input type="checkbox" checked={deferred} onChange={e => setDeferred(e.target.checked)} /> For every selected course-pending document, I checked identity, actual coverage, known school/placement, policy and physical validity. Course comparison is deferred under its recorded exception.</label>}
        </>}
        <button type="button" className="btn configuration-primary" disabled={!canSubmit || loading} onClick={() => void submit()}>{saving ? "Saving..." : mode === "placement" ? `Save ${chosen.length} reviewed placements` : `Verify ${chosen.length} selected documents`}</button>
      </>}
    </fieldset>
  </FocusedDialog>;
}
