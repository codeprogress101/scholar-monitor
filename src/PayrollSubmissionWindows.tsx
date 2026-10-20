import ContinuingSemesterSetup from "./ContinuingSemesterSetup";
import { OFFICIAL_COHORT } from "../server/continuing/official-cohort";
import { useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import ErrorNotice from "./ErrorNotice";
import { configurationRequest as request } from "./configuration-api";
import type { SubmissionWindowView } from "../server/payouts/submission-service";

type Editor = "configure" | "extend-semester" | "open-window" | "extend-window";
export default function PayrollSubmissionWindows({ cycleId, session, canManage }: { cycleId: string; session: Session; canManage: boolean }) {
  const [data, setData] = useState<SubmissionWindowView | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | ApiError>(""), [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null), [batchId, setBatchId] = useState("");
  const pending = useRef<{ signature: string; key: string } | null>(null), running = useRef(false);
  const path = `payout-cycles/${cycleId}/submission-windows`;
  async function refresh() {
    if (running.current) return;
    running.current = true; setBusy(true); setError("");
    try { setData(await request<SubmissionWindowView>(path)); }
    catch (e) { setError(e instanceof ApiError ? e : "Could not load submission windows."); }
    finally { running.current = false; setBusy(false); }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!data || !editor || running.current) return;
    const f = new FormData(e.currentTarget), base = { expectedCycleVersion: data.cycle.version };
    const body = editor === "configure" ? { ...base, termNumber: Number(f.get("term")), expectedSemesterVersion: data.period.semesterVersion, expectedYearVersion: data.period.yearVersion, deadlineOn: f.get("deadline") }
      : editor === "extend-semester" ? { ...base, expectedRevision: data.deadlines[0].revision, deadlineOn: f.get("deadline"), reason: f.get("reason") }
      : editor === "open-window" ? { ...base, expectedDeadlineRevision: data.deadlines[0].revision, expectedSequence: Math.max(0, ...data.windows.map((w) => w.batchNumber)), opensOn: f.get("opens"), cutoffOn: f.get("cutoff") }
      : { ...base, expectedDeadlineRevision: data.deadlines[0].revision, batchId, expectedRevision: data.windows.find((w) => w.batchId === batchId)!.revision, cutoffOn: f.get("cutoff"), reason: f.get("reason") };
    const signature = JSON.stringify({ editor, body });
    if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    running.current = true; setBusy(true); setError(""); setNotice("");
    try {
      await request(`${path}/${editor}`, { body, csrf: session.csrfToken, key: pending.current.key });
      pending.current = null; setEditor(null); setNotice("Submission setup saved. Existing documents and payment records retain their history.");
      setData(await request<SubmissionWindowView>(path));
    } catch (e) { setError(e instanceof ApiError ? e : "Could not confirm the result. Retry safely or refresh."); }
    finally { running.current = false; setBusy(false); }
  }
  const editable = canManage && data && !data.mappingStale && !data.ambiguous && !data.cycle.periodUnavailable && ["draft", "open"].includes(data.cycle.state);
  const openEditor = (action: Editor, id = "") => { setEditor(action); setBatchId(id); setError(""); setNotice(""); };
  return <details className="border rounded p-3 mb-3" onToggle={(e) => { if (e.currentTarget.open && !data) void refresh(); }}>
    <summary>Semester submission windows</summary>
    <p className="alert alert-info">Open a numbered batch here, then review its automatic candidates in Payroll batches below. Finalization reserves the full semester stipend; printing does not record payment.</p>
    <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => void refresh()}>Refresh submission windows</button>
    <ErrorNotice error={error} />{notice && <p role="status">{notice}</p>}
    {data && <>
      {data.historical&&<p className="alert alert-info">Previously approved batch. Submission deadline: {data.historical.deadlineOn}. Reported batch release: {data.historical.reportedReleaseOn}. Planned target: {data.cycle.targetDate}. Individual payment records are separate.</p>}
      {canManage && <ContinuingSemesterSetup compact batchId={OFFICIAL_COHORT} session={session} canConfigure />}
      <p>All dates use Philippine time (Asia/Manila). The cutoff includes the whole selected day. Submission cutoff and financial processing are separate.</p>
      <p>{data.termNumber ? `Regular semester ${data.termNumber}` : "Regular payout period not mapped"}. {data.mappedTerms.length} of 2 regular semester periods mapped for this academic year.</p>
      {(data.mappingStale || data.ambiguous) && <p className="alert alert-warning">Academic configuration changed or multiple cycles cover this semester. Review the mapping before changing windows.</p>}
      {data.legacyBatchesWithUnknownDeadline > 0 && <p>{data.legacyBatchesWithUnknownDeadline} earlier payroll batch(es): historical submission deadline not recorded. Their processing remains separate.</p>}
      {data.deadlines[0] && <p><strong>Semester final deadline: {data.deadlines[0].deadlineOn}</strong> (whole Manila day).{data.deadlines[0].deadlineOn < data.today && " Ordinary submission cutoff reached."}</p>}
      {editable && <div className="d-flex gap-2 flex-wrap my-2">
        {!data.termNumber ? <button className="btn btn-primary" disabled={busy} onClick={() => openEditor("configure")}>Map regular semester</button> : <>
          <button className="btn btn-outline-secondary" disabled={busy} onClick={() => openEditor("extend-semester")}>Extend semester deadline</button>
          <button className="btn btn-primary" disabled={busy || data.mappedTerms.length !== 2 || data.cycle.state !== "open"} onClick={() => openEditor("open-window")}>Open next batch window</button>
        </>}
      </div>}
      {editor && <form className="border rounded p-3 my-2" onSubmit={save} key={`${editor}:${batchId}`} aria-label="Submission window form">
        <h5>{editor === "configure" ? "Map regular semester" : editor === "open-window" ? "Open next batch window" : editor === "extend-window" ? "Extend batch cutoff" : "Extend semester deadline"}</h5>
        {editor === "configure" && <label className="form-label d-block">Regular semester<select className="form-select" name="term" required><option value="">Choose first or second semester</option>{[1, 2].filter((n) => !data.mappedTerms.some((m) => m.termNumber === n)).map((n) => <option value={n} key={n}>{n === 1 ? "1st Semester" : "2nd Semester"}</option>)}</select></label>}
        {(editor === "configure" || editor === "extend-semester") && <label className="form-label d-block">Semester final submission deadline<input className="form-control" name="deadline" type="date" required min={data.today} defaultValue={data.deadlines[0]?.deadlineOn ?? ""} /></label>}
        {editor === "open-window" && <label className="form-label d-block">Submission opening date<input className="form-control" name="opens" type="date" required min={data.today} /></label>}
        {(editor === "open-window" || editor === "extend-window") && <label className="form-label d-block">Batch submission cutoff<input className="form-control" name="cutoff" type="date" required min={data.today} max={data.deadlines[0]?.deadlineOn} defaultValue={data.windows.find((w) => w.batchId === batchId)?.cutoffOn ?? ""} /></label>}
        {editor.startsWith("extend") && <label className="form-label d-block">Extension reason<textarea className="form-control" name="reason" required minLength={5} maxLength={500} /></label>}
        <div className="d-flex gap-2"><button className="btn btn-primary" disabled={busy}>Save submission setup</button><button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => setEditor(null)}>Cancel</button></div>
      </form>}
      {data.windows.map((w) => <article className="border rounded p-3 my-2" key={w.batchId}>
        <h5>{w.code}</h5><p>{w.opensOn} through {w.cutoffOn} (inclusive, Manila).</p>
        <p>Submission: {w.submissionState.replaceAll("_", " ")}. Payroll processing: {w.processingState}.</p>
        {editable && w.processingState === "draft" && <button className="btn btn-outline-secondary" disabled={busy} onClick={() => openEditor("extend-window", w.batchId)}>Extend {w.code} cutoff</button>}
        <details><summary>Window history ({w.history.length})</summary>{w.history.map((h) => <p key={h.revision}>Revision {h.revision}: {h.previousCutoffOn ? `${h.previousCutoffOn} to ` : ""}{h.cutoffOn}; {h.reason}. {new Date(h.recordedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}. Actor: {h.actorId}.</p>)}</details>
      </article>)}
      <details><summary>Semester deadline history ({data.deadlines.length})</summary>{data.deadlines.map((d) => <p key={d.revision}>Revision {d.revision}: {d.previousDeadlineOn ? `${d.previousDeadlineOn} to ` : ""}{d.deadlineOn}; {d.reason}. {new Date(d.recordedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}. Actor: {d.actorId}.</p>)}</details>
    </>}
  </details>;
}
