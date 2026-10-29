import {retainPriorCommand,masterlistResultUncertain} from "./prior-command";
import { useRef, useState, type FormEvent } from "react";
import FocusedDialog from "./FocusedDialog";
import { type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { DraftCandidate, DraftDetail } from "../server/masterlists/model";
import type { SelectionReview, SelectionResult, SelectionScope } from "../server/masterlists/selection-model";

export function SelectionCounts({ review }: { review: SelectionReview }) {
  const c = review.counts;
  return <><dl className="ml-selection-counts">
    <div><dt>Matching candidates</dt><dd>{c.matching.toLocaleString()}</dd></div>
    <div><dt>Eligible for new addition</dt><dd>{c.eligible.toLocaleString()}</dd></div>
    <div><dt>Already on this draft</dt><dd>{c.alreadyOnDraft.toLocaleString()}</dd></div>
    <div><dt>Activated outside this draft</dt><dd>{c.activated.toLocaleString()}</dd></div>
    <div><dt>Other blocked candidates</dt><dd>{c.blocked.toLocaleString()}</dd></div>
  </dl><p className="text-muted ml-selection-scope">Each match is counted once. Draft membership takes precedence over activation and other blockers.</p></>;
}

export default function MasterlistSelection({ detail, candidates, checkedIds, setCheckedIds, mode, setMode, q, disabled, session, onPending, onAdded }: {
  detail: DraftDetail; candidates: DraftCandidate[]; checkedIds: string[]; setCheckedIds: (ids: string[]) => void;
  mode: "all" | "page"; setMode: (mode: "all" | "page") => void; q: string; disabled: boolean; session: Session;
  onPending: (pending: boolean) => void; onAdded: (result: SelectionResult) => void;
}) {
  const [whole, setWhole] = useState<SelectionReview | null>(null), [review, setReview] = useState<SelectionReview | null>(null);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [uncertain, setUncertain] = useState(false), [stale, setStale] = useState(false), [error, setError] = useState("");
  const [fields, setFields] = useState({ reason: "", reference: "", confirm: false });
  const pending = useRef<{ key: string; body: object } | null>(null), busy = useRef(false);
  const selectable = candidates.filter(c => !c.issues.length && !detail.entries.some(e => e.scholarId === c.scholarId));
  async function load(scope: SelectionScope, offset = 0, open = true) {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError(""); onPending(true);
    try {
      const params = new URLSearchParams({ mode: scope.mode, q: scope.q, ids: scope.scholarIds.join(","), offset: String(offset), limit: "25" });
      const value = await request<SelectionReview>(`masterlists/${detail.id}/selection-review?${params}`);
      if (value.version !== detail.version) throw new Error("The draft changed. Refresh this Masterlist before reviewing again.");
      if (open) {
        if (offset && review && review.fingerprint !== value.fingerprint) { setStale(true); throw new Error("Selection sources changed while paging. Review the selection again."); }
        setReview(value); setStale(false);
      } else { setWhole(value); setMode("all"); setCheckedIds([]); }
      if (!offset && (!review || stale)) { pending.current = null; setFields({ reason: "", reference: "", confirm: false }); }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to review the selection."); }
    finally { busy.current = false; setLoading(false); onPending(false); }
  }
  const selectedScope = (): SelectionScope => ({ mode, q, scholarIds: mode === "page" ? [...checkedIds].sort() : [] });
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!review || busy.current || stale || !review.canAdd) return;
    if (!pending.current) pending.current = { key: crypto.randomUUID(), body: { expectedVersion: review.version, expectedAdditions: review.selectedAddable,
      selection: review.scope, fingerprint: review.fingerprint, confirm: fields.confirm, reason: fields.reason, reference: fields.reference } };
    const retrying=uncertain;
    retainPriorCommand(session.user.id,{path:`masterlists/${detail.id}/add-scope`,key:pending.current.key,body:pending.current.body as Record<string,unknown>,route:"masterlists"});
    busy.current = true; setSaving(true); setError(""); onPending(true);
    try {
      const result = await request<SelectionResult>(`masterlists/${detail.id}/add-scope`, { body: pending.current.body, key: pending.current.key, csrf: session.csrfToken });
      if (result.id !== detail.id || result.addedCount !== review.selectedAddable || result.version !== review.version + 1) throw new Error("Result could not be confirmed. Retry the exact operation.");
      retainPriorCommand(session.user.id,null); pending.current = null; setUncertain(false); setReview(null); setWhole(null); setMode("page"); setCheckedIds([]); onPending(false); onAdded(result);
    } catch (e) {
      const unknown = masterlistResultUncertain(e,retrying);
      setUncertain(unknown); setStale(!unknown); if (!unknown) { retainPriorCommand(session.user.id,null); pending.current = null; onPending(false); }
      setError(e instanceof Error ? e.message : "Result unconfirmed. Retry the exact operation.");
    } finally { busy.current = false; setSaving(false); }
  }
  return <>
    <div className="candidate-selection-bar ml-selection-bar" role="region" aria-label="Selected scholar actions">
      <span role="status"><strong>{mode === "all" && whole ? `${whole.selectedAddable.toLocaleString()} eligible selected` : `${checkedIds.length} selected`}</strong><small>{mode === "all" ? "All matching pages" : "This page"}</small></span>
      <button type="button" className="btn btn-outline-secondary" disabled={disabled || loading || !selectable.length} onClick={() => { setMode("page"); setWhole(null); setCheckedIds(selectable.map(c => c.scholarId)); }}>Select This Page</button>
      <button type="button" className="btn btn-outline-secondary" disabled={disabled || loading} onClick={() => void load({ mode: "all", q, scholarIds: [] }, 0, false)}>Select All Eligible</button>
      <button type="button" className="btn btn-outline-secondary" disabled={disabled || loading || (mode === "page" && !checkedIds.length)} onClick={() => { setMode("page"); setCheckedIds([]); setWhole(null); }}>Clear</button>
      <button type="button" className="btn configuration-primary" disabled={disabled || loading || (mode === "page" && !checkedIds.length) || (mode === "all" && !whole)} onClick={() => void load(selectedScope())}>Review Selection</button>
    </div>
    {loading && !review && <p role="status">Reviewing current selection sources...</p>}
    {error && !review && <p role="alert" className="alert alert-danger">{error}</p>}
    {review && <FocusedDialog progress={{operation:"Adding selected members",identity:`${detail.title} / ${detail.id}`,count:review.selectedAddable,pending:saving,uncertain,error,retry:()=>void submit()}} title="Review Selection" busy={saving || uncertain || loading} onClose={() => { setReview(null); setError(""); pending.current = null; }} className="ml-selection-dialog">
      <p><strong>{detail.yearCode}</strong> · {review.scope.mode === "all" ? "All matching pages" : "Selected scholars on this page"}{review.scope.q && <> · Search: <strong>{review.scope.q}</strong></>}</p>
      <SelectionCounts review={review} />
      <p><strong>{review.selectedAddable.toLocaleString()} will be added to this draft.</strong> Existing members and blocked candidates are excluded from this reviewed addition. Approval and publication are separate.</p>
      {!review.canAdd && <p className="alert alert-warning" role="status">{review.selectedAddable ? `Narrow the search: one atomic addition supports at most ${review.limits.additions.toLocaleString()} scholars.` : "No eligible scholars can be added in this selection."}</p>}
      <div className="table-responsive" role="region" aria-label="Selection review scholars" tabIndex={0}><table className="table compact-table ml-review-table"><thead><tr><th scope="col">Scholar</th><th scope="col">Review</th><th scope="col">Official record</th></tr></thead><tbody>{review.items.map(i => <tr key={i.scholarId}>
        <td>{i.name}<small className="permanent-id">{i.humanId ?? "No permanent ID"}</small></td><td>{i.category === "eligible" ? "Eligible for new addition" : i.category === "alreadyOnDraft" ? "Already on this draft" : i.category === "activated" ? "Already activated" : "Additional review required"}{i.reasons.length > 0 && <small>{i.reasons.join(" ")}</small>}</td>
        <td>{i.official?.masterlistId ? <a href={`#masterlists?draft=${i.official.masterlistId}`} onClick={event => { if (saving || uncertain || loading) event.preventDefault(); else setReview(null); }}>{i.official.title}<small>{i.official.yearCode}</small></a> : "—"}</td>
      </tr>)}</tbody></table></div>
      <div className="ml-review-pager"><button type="button" className="btn btn-outline-secondary" disabled={loading || saving || uncertain || review.offset === 0} onClick={() => void load(review.scope, Math.max(0, review.offset - review.limit))}>Previous review page</button><span>{review.total ? `${review.offset + 1}–${Math.min(review.offset + review.limit, review.total)} of ${review.total}` : "0 matches"}</span><button type="button" className="btn btn-outline-secondary" disabled={loading || saving || uncertain || review.offset + review.limit >= review.total} onClick={() => void load(review.scope, review.offset + review.limit)}>Next review page</button></div>
      {loading && <p role="status">Loading review page...</p>}
      {error && <p role="alert" className="alert alert-danger">{error}</p>}
      {stale && <button type="button" className="btn btn-outline-secondary" onClick={() => void load(review.scope)}>Review Again</button>}
      <form onSubmit={submit} className="ml-add-confirmation">
        <label>Reason<input className="form-control" required minLength={5} maxLength={500} disabled={saving || uncertain || stale} value={fields.reason} onChange={e => setFields({ ...fields, reason: e.target.value })} /></label>
        <label>Reference<input className="form-control" required minLength={3} maxLength={300} disabled={saving || uncertain || stale} value={fields.reference} onChange={e => setFields({ ...fields, reference: e.target.value })} /></label>
        <label className="ml-confirm-check"><input type="checkbox" required disabled={saving || uncertain || stale} checked={fields.confirm} onChange={e => setFields({ ...fields, confirm: e.target.checked })} />Add only these {review.selectedAddable.toLocaleString()} reviewed eligible scholars to this draft.</label>
        <div className="d-flex flex-wrap gap-2"><button className="btn configuration-primary" disabled={saving || loading || stale || !review.canAdd}>{saving ? "Adding..." : uncertain ? "Retry Exact Addition" : "Add to Draft"}</button><button type="button" className="btn btn-outline-secondary" disabled={saving || uncertain || loading} onClick={() => { setReview(null); setError(""); pending.current = null; }}>Cancel</button></div>
        {uncertain && <p role="status">The result is unconfirmed. Retry with the same request before leaving this draft.</p>}
      </form>
    </FocusedDialog>}
  </>;
}
