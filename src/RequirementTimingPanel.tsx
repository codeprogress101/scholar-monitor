import { useRef, useState, type FormEvent } from "react";
import type { RequirementTimingView } from "../server/requirements/timing-service";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import ErrorNotice from "./ErrorNotice";

export default function RequirementTimingPanel({ instanceId, session, canDecide }: { instanceId: string; session: Session; canDecide: boolean }) {
  const [view, setView] = useState<RequirementTimingView | null>(null), [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | ApiError>(""), [notice, setNotice] = useState("");
  const [form, setForm] = useState({ decision: "approve", evidenceKind: "receiving_log", evidenceReference: "", reason: "" });
  const pending = useRef<{ signature: string; key: string } | null>(null), working = useRef(false);
  const path = `requirement-instances/${instanceId}/timing`;
  async function load() {
    setError("");
    try { setView(await request<RequirementTimingView>(path)); }
    catch (e) { setError(e instanceof ApiError ? e : "Could not load receipt timing. Retry."); }
  }
  async function save(e: FormEvent) {
    e.preventDefault(); const window = view?.windows.find(w => w.batchId === selected);
    if (!window || working.current) return;
    working.current = true; setBusy(true); setError(""); setNotice("");
    const body = { ...form, batchId: window.batchId, expectedSourceHash: window.sourceHash, expectedRevision: window.decisionRevision }, signature = JSON.stringify(body);
    if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    try {
      await request(path + "/decide", { body, csrf: session.csrfToken, key: pending.current.key });
      setSelected(null); setNotice("Timing decision recorded. Document verification and payout approval remain separate."); await load();
    } catch (e) { setError(e instanceof ApiError ? e : "Result unconfirmed. Retry the same decision safely."); }
    finally { working.current = false; setBusy(false); }
  }
  return <details className="my-2" onToggle={e => { if (e.currentTarget.open && !view) void load(); }}>
    <summary>Receipt timing by payroll batch</summary>
    <p>Current document compared with recorded cutoffs. Finalized payroll is unchanged.</p>
    <ErrorNotice error={error} />
    {notice && <p role="status">{notice}</p>}
    <button type="button" className="btn btn-sm btn-outline-secondary my-2" disabled={busy} onClick={() => { setSelected(null); void load(); }}>Refresh timing</button>
    {view?.issue && <p role="alert">{view.issue}</p>}
    {view?.mode === "legacy" && <p>No managed semester timing applies to this record. Existing records are preserved.</p>}
    {view?.mode === "managed" && !view.windows.length && <p>No payroll submission window is configured. Receipt custody does not establish cutoff eligibility.</p>}
    {view?.windows.map(w => <div key={w.batchId} className="border rounded p-2 mb-2">
      <strong>{w.batchCode} — cutoff {w.cutoffOn} ({w.cutoffPolicy === "whole_day_v1" ? "whole Manila day" : `${w.cutoffLocalTime} PHT / UTC+8`})</strong><p>{w.message}</p>
      {canDecide && w.canDecide && <button type="button" className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => { setSelected(w.batchId); setNotice(""); setForm({ decision: "approve", evidenceKind: "receiving_log", evidenceReference: "", reason: "" }); }}>Review late encoding for {w.batchCode}</button>}
      {selected === w.batchId && <form aria-label="Receipt timing decision" onSubmit={e => void save(e)}><fieldset disabled={busy}>
        <label className="form-label d-block">Timing decision<select className="form-select" value={form.decision} onChange={e => setForm({ ...form, decision: e.target.value })}><option value="approve">Approve evidenced on-time receipt</option><option value="reject">Reject on-time receipt claim</option></select></label>
        <label className="form-label d-block">Evidence type<select className="form-select" value={form.evidenceKind} onChange={e => setForm({ ...form, evidenceKind: e.target.value })}><option value="receiving_log">Receiving log</option><option value="dated_acknowledgment">Dated acknowledgment</option></select></label>
        <label className="form-label d-block">Evidence reference<input className="form-control" required minLength={5} maxLength={500} value={form.evidenceReference} onChange={e => setForm({ ...form, evidenceReference: e.target.value })} /></label>
        <label className="form-label d-block">Decision reason<textarea className="form-control" required minLength={5} maxLength={500} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label>
        <button className="btn btn-primary">Save timing decision</button>{" "}<button type="button" className="btn btn-outline-secondary" onClick={() => setSelected(null)}>Cancel</button>
      </fieldset></form>}
      {w.history.length > 0 && <details><summary>Timing decision history ({w.history.length})</summary>{w.history.map(h => <p key={h.id}>Revision {h.revision}: {h.decision === "approve" ? "Approved" : "Rejected"} by {h.actorName}. {h.evidenceReference} — {h.reason}. Recorded {new Date(h.recordedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} (Asia/Manila).</p>)}</details>}
    </div>)}
  </details>;
}
