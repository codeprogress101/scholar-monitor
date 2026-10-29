import {retainPriorCommand,masterlistResultUncertain} from "./prior-command";
import type {OperationFeedback} from "./ActionProgress";
import MasterlistConflictTable, { type ConflictTableProps } from "./MasterlistConflictTable";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { ActivationConflictPage } from "../server/masterlists/selection-model";
import type { ConflictRemovalReview, ConflictRemovalResult, ConflictRemovalScope } from "../server/masterlists/conflict-removal-model";

export default function MasterlistConflictRemoval({ id, page, session, onProgress, onPending, onRemoved, table }: {
  onProgress:(value:OperationFeedback|null)=>void;
  id: string; page: ActivationConflictPage; session: Session;
  onPending: (value: boolean) => void; onRemoved: (value: ConflictRemovalResult) => void;
  table: ConflictTableProps;
}) {
  const [selected, setSelected] = useState<string[]>([]), [all, setAll] = useState<ConflictRemovalReview | null>(null), [review, setReview] = useState<ConflictRemovalReview | null>(null);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [uncertain, setUncertain] = useState(false), [stale, setStale] = useState(false), [error, setError] = useState("");
  const [fields, setFields] = useState({ reason: "", reference: "", confirm: false });
  const pending = useRef<{ key: string; body: object } | null>(null), busy = useRef(false), heading = useRef<HTMLHeadingElement>(null), reviewButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (review) heading.current?.focus(); }, [review]);
  function choose(ids: string[]) {
    if (busy.current || uncertain) return;
    if (ids.length > 200) { setError("Select at most 200 conflicts per operation. Your previous selection is unchanged."); return; }
    setSelected(ids); setAll(null); setError("");
  }
  async function load(scope: ConflictRemovalScope, selectAll = false, offset = 0) {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError(""); onPending(true);
    try {
      const params = new URLSearchParams({ mode: scope.mode, ids: scope.scholarIds.join(","), offset: String(offset), limit: "25" });
      const value = await request<ConflictRemovalReview>(`masterlists/${id}/conflict-removal-review?${params}`);
      if ((offset && review && review.fingerprint !== value.fingerprint) || (!selectAll && all && all.fingerprint !== value.fingerprint)) {
        setStale(true); throw new Error("The reviewed conflict scope changed. Clear the selection and review again.");
      }
      if (selectAll) { setAll(value); setSelected(value.selectedIds); }
      else { setReview(value); setStale(false); if (!offset) { pending.current = null; setFields({ reason: "", reference: "", confirm: false }); } }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to review conflict removal."); }
    finally { busy.current = false; setLoading(false); onPending(false); }
  }
  function cancelReview() { setReview(null); setError(""); setStale(false); pending.current = null; requestAnimationFrame(() => reviewButton.current?.focus()); }
  async function submit(event?: FormEvent) {
    event?.preventDefault(); if (!review || busy.current || stale) return;
    if (!pending.current) pending.current = { key: crypto.randomUUID(), body: { expectedVersion: review.version, expectedRemovals: review.selectedCount, expectedRemaining: review.remainingCount,
      selection: review.scope, fingerprint: review.fingerprint, confirm: fields.confirm, reason: fields.reason, reference: fields.reference } };
    const retrying=uncertain;
    retainPriorCommand(session.user.id,{path:`masterlists/${id}/remove-conflicts`,key:pending.current.key,body:pending.current.body as Record<string,unknown>,route:"masterlists"});
    busy.current = true; setSaving(true); setError(""); onPending(true);
    const feedback=(pending:boolean,uncertain=false,error="")=>onProgress({operation:"Removing selected conflicts",identity:`${review.title} / ${id}`,count:review.selectedCount,pending,uncertain,error,retry:()=>void submit()});
    feedback(true);
    try {
      const result = await request<ConflictRemovalResult>(`masterlists/${id}/remove-conflicts`, { body: pending.current.body, key: pending.current.key, csrf: session.csrfToken });
      if (result.id !== id || result.version !== review.version + 1 || result.removedCount !== review.selectedCount || result.remainingCount !== review.remainingCount) throw new Error("Result could not be confirmed. Retry the exact removal.");
      retainPriorCommand(session.user.id,null); pending.current = null; setUncertain(false); onPending(false); onProgress(null); onRemoved(result);
    } catch (e) {
      const unknown = masterlistResultUncertain(e,retrying);
      setUncertain(unknown); setStale(!unknown);
      if(unknown)feedback(false,true,e instanceof Error?e.message:"Result not confirmed.");else onProgress(null);
      if (!unknown) { retainPriorCommand(session.user.id,null); pending.current = null; onPending(false); }
      setError(e instanceof Error ? e.message : "Result unconfirmed. Retry the exact removal.");
    } finally { busy.current = false; setSaving(false); }
  }
  return <>
    {!review && <>
      <div className="candidate-selection-bar ml-conflict-selection" role="region" aria-label="Conflict selection">
        <strong role="status">{selected.length.toLocaleString()} selected{all ? " across all pages" : ""}</strong>
        <button type="button" className="btn btn-outline-secondary" disabled={loading || !page.items.length} onClick={() => choose([...new Set([...selected, ...page.items.map(i => i.scholarId)])])}>Select This Page</button>
        <button type="button" className="btn btn-outline-secondary" disabled={loading || !page.total} onClick={() => void load({ mode: "all", scholarIds: [] }, true)}>Select All Conflicts</button>
        <button type="button" className="btn btn-outline-secondary" disabled={loading || !selected.length} onClick={() => choose([])}>Clear Selection</button>
        <button ref={reviewButton} type="button" className="btn configuration-primary" disabled={loading || !selected.length} onClick={() => void load(all ? all.scope : { mode: "selected", scholarIds: selected })}>Review Removal</button>
      </div>
      <p>Select specific draft memberships, up to 200 per operation. Changes require resubmission and approval. The individual removal option remains available.</p>
      <MasterlistConflictTable {...table} selection={{ selected, toggle: id => choose(selected.includes(id) ? selected.filter(i => i !== id) : [...selected, id]), busy: loading }} />
    </>}
    {review && <section aria-label="Review Removal" className="ml-conflict-confirmation">
      <h3 ref={heading} tabIndex={-1}>Review Removal</h3>
      <p><strong>{review.title}</strong> · {review.yearCode} · Draft version {review.version}<small className="permanent-id">{review.draftId}</small></p>
      <dl className="ml-selection-counts">
        <div><dt>Selected members</dt><dd>{review.selectedCount.toLocaleString()}</dd></div>
        <div><dt>Confirmed selected conflicts</dt><dd>{review.selectedCount.toLocaleString()}</dd></div>
        <div><dt>All current conflicts</dt><dd>{review.conflictCount.toLocaleString()}</dd></div>
        <div><dt>Expected remaining membership</dt><dd>{review.remainingCount.toLocaleString()} of {review.membershipCount.toLocaleString()}</dd></div>
      </dl>
      <p>Only these draft memberships will be removed. Existing official Masterlists, activations, Scholar Registry, annual records and source documents remain unchanged. This list stays Draft and requires resubmission and approval.</p>
      <div className="table-responsive" role="region" aria-label="Reviewed removal scholars" tabIndex={0}><table className="table compact-table ml-review-table"><thead><tr><th scope="col">Scholar</th><th scope="col">Confirmed conflict</th><th scope="col">Existing official record</th></tr></thead><tbody>{review.items.map(i => <tr key={i.scholarId}><td>{i.name}<small className="permanent-id">{i.humanId}</small></td><td>{i.reason}</td><td>{i.official?.title ?? "Review scholarship standing"}<small>{i.official?.yearCode}</small></td></tr>)}</tbody></table></div>
      <div className="ml-review-pager"><button type="button" className="btn btn-outline-secondary" disabled={loading || saving || uncertain || !review.offset} onClick={() => void load(review.scope, false, Math.max(0, review.offset - review.pageSize))}>Previous removal page</button><span>{review.offset + 1}–{Math.min(review.offset + review.pageSize, review.total)} of {review.total}</span><button type="button" className="btn btn-outline-secondary" disabled={loading || saving || uncertain || review.offset + review.pageSize >= review.total} onClick={() => void load(review.scope, false, review.offset + review.pageSize)}>Next removal page</button></div>
      <form onSubmit={submit} className="ml-add-confirmation">
        <label>Reason<input className="form-control" required minLength={5} maxLength={500} disabled={loading || saving || uncertain || stale} value={fields.reason} onChange={e => setFields({ ...fields, reason: e.target.value })} /></label>
        <label>Reference<input className="form-control" required minLength={3} maxLength={300} disabled={loading || saving || uncertain || stale} value={fields.reference} onChange={e => setFields({ ...fields, reference: e.target.value })} /></label>
        <label className="ml-confirm-check"><input type="checkbox" required disabled={loading || saving || uncertain || stale} checked={fields.confirm} onChange={e => setFields({ ...fields, confirm: e.target.checked })} />Remove only these {review.selectedCount.toLocaleString()} confirmed conflicting memberships from this draft.</label>
        <div className="d-flex flex-wrap gap-2"><button className="btn btn-outline-danger" disabled={loading || saving || stale}>{saving ? "Removing..." : uncertain ? "Retry Exact Removal" : "Remove Selected from Draft"}</button><button type="button" className="btn btn-outline-secondary" disabled={loading || saving || uncertain} onClick={cancelReview}>{stale ? "Back to Selection" : "Cancel Removal"}</button></div>
        {uncertain && <p role="status">The result is unconfirmed. Keep this draft open and retry the exact removal. Selection and evidence are locked until the result is confirmed.</p>}
      </form>
    </section>}
    {loading && <p role="status">Reviewing current conflict evidence...</p>}
    {error && <p role="alert" className="alert alert-danger">{error}</p>}
  </>;
}
