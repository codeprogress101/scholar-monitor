import {windowTiming} from "../server/payouts/cutoff-policy";
import {PayrollTimingContext} from "./payroll-progress";
import CommandProgressDialog from "./CommandProgressDialog";
import {usePriorCommand} from "./prior-command";
import {useActionForm} from "./use-action-form";
import ContinuingSemesterSetup from "./ContinuingSemesterSetup";
import { OFFICIAL_COHORT } from "../server/continuing/official-cohort";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import ErrorNotice from "./ErrorNotice";
import { configurationRequest as request } from "./configuration-api";
import type { SubmissionWindowView } from "../server/payouts/submission-service";

type Editor = "configure" | "extend-semester" | "open-window" | "extend-window";
export default function PayrollSubmissionWindows({ cycleId, session, canManage, actionFirst=false, compactDraft=false, children, context, administration }: { cycleId: string; session: Session; canManage: boolean; actionFirst?:boolean; compactDraft?:boolean; children?:ReactNode; context?:ReactNode; administration?:ReactNode }) {
  const [data, setData] = useState<SubmissionWindowView | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | ApiError>(""), [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null), [batchId, setBatchId] = useState("");
  const [selectedTime,setSelectedTime]=useState("17:00");
  const running = useRef(false);
  const [administrationLoaded,setAdministrationLoaded]=useState(false);
  const formFocus=useActionForm(editor);
  const createButton=useRef<HTMLButtonElement>(null);
  const path = `payout-cycles/${cycleId}/submission-windows`;
  const job=usePriorCommand(session,`${path}/${editor??"open-window"}`);
  const readTimingOnEntry=actionFirst||Boolean(children);
  useEffect(()=>{
    if(!readTimingOnEntry)return;
    const controller=new AbortController();
    request<SubmissionWindowView>(path,{signal:controller.signal}).then(setData).catch(e=>{if(!controller.signal.aborted)setError(e instanceof ApiError?e:"Could not load submission windows.");});
    return()=>controller.abort();
  },[readTimingOnEntry,path]);
  async function refresh() {
    if (running.current) return;
    running.current = true; setBusy(true); setError("");
    try { setData(await request<SubmissionWindowView>(path)); }
    catch (e) { setError(e instanceof ApiError ? e : "Could not load submission windows."); }
    finally { running.current = false; setBusy(false); }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!data || !editor || running.current || job.locked) return;
    const f = new FormData(e.currentTarget), base = { expectedCycleVersion: data.cycle.version };
    if(editor==="open-window"&&!data.cutoffRules){setError("Documented office cutoff rules are required for timed creation.");return;}
    const timedFields=editor!=="open-window"?{}:{cutoffLocalTime:selectedTime+":00",cutoffTimeZone:"Asia/Manila",expectedCutoffRuleRevision:data.cutoffRules?.rule.revision,expectedCutoffRuleHash:data.cutoffRules?.hash,expectedCutoffAtUtc:editor==="open-window"?windowTiming(String(f.get("cutoff")),"manila_time_v1",selectedTime+":00").cutoffAtUtc:undefined};
    const body = editor === "configure" ? { ...base, termNumber: Number(f.get("term")), expectedSemesterVersion: data.period.semesterVersion, expectedYearVersion: data.period.yearVersion, deadlineOn: f.get("deadline") }
      : editor === "extend-semester" ? { ...base, expectedRevision: data.deadlines[0].revision, deadlineOn: f.get("deadline"), reason: f.get("reason") }
      : editor === "open-window" ? { ...base, expectedDeadlineRevision: data.deadlines[0].revision, expectedSequence: Math.max(0, ...data.windows.map((w) => w.batchNumber)), opensOn: f.get("opens"), cutoffOn: f.get("cutoff"), cutoffPolicy: "manila_time_v1",...timedFields }
      : { ...base, expectedDeadlineRevision: data.deadlines[0].revision, batchId, expectedRevision: data.windows.find((w) => w.batchId === batchId)!.revision, cutoffOn: f.get("cutoff"), reason: f.get("reason") };
    setError("");setNotice("");
    const result=await job.run(body,"payouts");
    if(!result)return;
    setEditor(null);if(editor==="open-window")requestAnimationFrame(()=>createButton.current?.focus());setNotice("Submission setup saved. Existing documents and payment records retain their history.");
    try{setData(await request<SubmissionWindowView>(path));}catch{setError("Submission setup was saved. Retry the availability read to confirm current windows.");}
  }
  async function retrySetup(){
    const result=await job.run({},"payouts",true);if(!result)return;
    setEditor(null);if(editor==="open-window")requestAnimationFrame(()=>createButton.current?.focus());setNotice("Submission setup confirmed. Existing payment records retain their history.");
    try{setData(await request<SubmissionWindowView>(path));}catch{setError("Submission setup was saved. Retry the availability read to confirm current windows.");}
  }

  const editable = canManage && data && !data.mappingStale && !data.ambiguous && !data.cycle.periodUnavailable && ["draft", "open"].includes(data.cycle.state);
  const openEditor = (action: Editor, id = "") => { setEditor(action); if(action==="open-window"){setSelectedTime("17:00");} setBatchId(id); setError(""); setNotice(""); };
  const closeEditor=()=>{if(job.locked)return;setEditor(null);if(editor==='open-window')createButton.current?.focus();};
  const creation=<div className="pay-ui-create">{canManage?<><button ref={createButton} type="button" className="btn configuration-primary pay-new-draft-trigger" disabled={busy||!data||data.newDraft.blockers.length>0} aria-describedby={`new-payroll-draft-restrictions-${cycleId}`} onClick={()=>openEditor('open-window')}>Create New Payroll Draft</button></>:null}</div>;
  const restrictions=<div id={`new-payroll-draft-restrictions-${cycleId}`} className="pay-ui-restrictions">{!canManage?<p>Draft creation requires Coordinator access.</p>:data?.newDraft.blockers.length?<><p role="status">{data.newDraft.blockers[0]}</p>{data.newDraft.blockers.length>1&&<details><summary>All creation restrictions ({data.newDraft.blockers.length})</summary><ul>{data.newDraft.blockers.map(reason=><li key={reason}>{reason}</li>)}</ul></details>}</>:null}</div>;
  const form=data&&editor&&<form ref={formFocus} onKeyDown={e=>{if(e.key==="Escape"&&!busy){e.preventDefault();closeEditor();}}} className="border rounded p-3 my-2" onSubmit={save} key={`${editor}:${batchId}`} aria-label="Submission window form">
        <h5>{editor === "configure" ? "Map regular semester" : editor === "open-window" ? "Create New Payroll Draft" : editor === "extend-window" ? "Extend batch cutoff" : "Extend semester deadline"}</h5>
        {editor === "configure" && <label className="form-label d-block">Regular semester<select className="form-select" name="term" required><option value="">Choose first or second semester</option>{[1, 2].filter((n) => !data.mappedTerms.some((m) => m.termNumber === n)).map((n) => <option value={n} key={n}>{n === 1 ? "1st Semester" : "2nd Semester"}</option>)}</select></label>}
        {(editor === "configure" || editor === "extend-semester") && <label className="form-label d-block">Semester final submission deadline<input className="form-control" name="deadline" type="date" required min={data.today} defaultValue={data.deadlines[0]?.deadlineOn ?? ""} /></label>}
        {editor === "open-window" && <label className="form-label d-block">Submission opening date<input className="form-control" name="opens" type="date" required min={data.today} /></label>}
        {(editor === "open-window" || editor === "extend-window") && <label className="form-label d-block">Batch submission cutoff<input className="form-control" name="cutoff" type="date" required min={data.today} max={data.deadlines[0]?.deadlineOn} defaultValue={data.windows.find((w) => w.batchId === batchId)?.cutoffOn ?? ""} /></label>}
        {editor === "open-window" && <><label className="form-label d-block">Cutoff time (PHT / UTC+8)<input className="form-control" name="cutoffTime" type="time" step={60} value={selectedTime} onChange={e=>setSelectedTime(e.target.value)} required aria-describedby="payroll-cutoff-rule"/></label><p id="payroll-cutoff-rule" className="muted-line">{data.cutoffRules?`Permitted times: ${data.cutoffRules.rule.permittedTimes.map(t=>t.slice(0,5)).join(", ")} PHT. Rule: ${data.cutoffRules.rule.authorityReference}.`:"Documented office cutoff rules are required before timed creation."}</p></>}


        {editor.startsWith("extend") && <label className="form-label d-block">Extension reason<textarea className="form-control" name="reason" required minLength={5} maxLength={500} /></label>}
        <div className="d-flex gap-2"><button className="btn btn-primary" disabled={busy||(editor==="open-window"&&(!data.cutoffRules||!data.cutoffRules.rule.permittedTimes.includes(selectedTime+":00")))}>Save submission setup</button><button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={closeEditor}>Cancel</button></div>
      </form>;
  return <div className={actionFirst?"pay-ui-action-first":undefined}>
    <CommandProgressDialog operation={editor==="open-window"?"Creating payroll draft":"Saving submission setup"} identity={`${data?.cycle.code??"Payout cycle"} / ${cycleId}`} pending={job.saving} uncertain={job.uncertain} error={job.error} retry={()=>void retrySetup()}/>
    {job.error&&!job.locked&&<p role="alert" className="alert alert-danger">{job.error}</p>}
    {actionFirst&&!compactDraft&&<><header className="pay-ui-heading"><h1 id="payroll-title" tabIndex={-1}>Payroll Batches</h1>{creation}</header>{context}<p className="pay-ui-deadline"><strong>{data?data.deadlines[0]?`Submission deadline: ${data.deadlines[0].deadlineOn}`:"Submission deadline not configured.":error?"Submission deadline unavailable.":"Loading submission deadline..."}</strong> <span>Whole Manila day. Draft creation does not record payment.</span></p>{restrictions}<ErrorNotice error={error}/>{error&&!data&&<button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={()=>void refresh()}>Retry submission availability</button>}{notice&&<p role="status">{notice}</p>}{form}</>}
    <PayrollTimingContext.Provider value={{data,loading:busy||(readTimingOnEntry&&!data&&!error),unavailable:!data||Boolean(error)}}>{children}</PayrollTimingContext.Provider>
    <details className="border rounded p-3 mb-3 pay-ui-secondary" onToggle={e=>{if(e.currentTarget.open){setAdministrationLoaded(true);if(!data)void refresh();}}}>
      <summary>{actionFirst?"Payroll setup & history":"Semester submission windows"}</summary>
      {(!actionFirst||administrationLoaded)&&<>
      <button type="button" className="btn btn-outline-secondary my-2" disabled={busy} onClick={()=>void refresh()}>Refresh submission windows</button>
      {(!actionFirst||compactDraft)&&<>{compactDraft&&context}<ErrorNotice error={error}/>{notice&&<p role="status">{notice}</p>}{creation}{restrictions}{form}</>}
    {data && <>
      {data.historical&&<p className="alert alert-info">Previously approved batch. Submission deadline: {data.historical.deadlineOn}. Reported batch release: {data.historical.reportedReleaseOn}. Planned target: {data.cycle.targetDate}. Individual payment records are separate.</p>}
      {canManage && <ContinuingSemesterSetup compact batchId={OFFICIAL_COHORT} session={session} canConfigure />}
      <p>All dates use Philippine time (Asia/Manila). Each batch retains its recorded cutoff policy. Submission cutoff and financial processing are separate.</p>
      <p>{data.termNumber ? `Regular semester ${data.termNumber}` : "Regular payout period not mapped"}. {data.mappedTerms.length} of 2 regular semester periods mapped for this academic year.</p>
      {(data.mappingStale || data.ambiguous) && <p className="alert alert-warning">Academic configuration changed or multiple cycles cover this semester. Review the mapping before changing windows.</p>}
      {data.legacyBatchesWithUnknownDeadline > 0 && <p>{data.legacyBatchesWithUnknownDeadline} earlier payroll batch(es): historical submission deadline not recorded. Their processing remains separate.</p>}
      {(!actionFirst||compactDraft)&&data.deadlines[0] && <p><strong>Semester final deadline: {data.deadlines[0].deadlineOn}</strong> (whole Manila day).{data.deadlines[0].deadlineOn < data.today && " Ordinary submission cutoff reached."}</p>}
      {editable && <div className="d-flex gap-2 flex-wrap my-2">
        {!data.termNumber ? <button className="btn btn-primary" disabled={busy} onClick={() => openEditor("configure")}>Map regular semester</button> : <>
          <button className="btn btn-outline-secondary" disabled={busy} onClick={() => openEditor("extend-semester")}>Extend semester deadline</button>
        </>}
      </div>}
      {data.windows.map((w) => <article className="border rounded p-3 my-2" key={w.batchId}>
        <h5>{w.code}</h5><p>{w.opensOn} through {w.cutoffOn} ({w.cutoffPolicy !== "whole_day_v1" ? `${w.cutoffLocalTime} PHT, inclusive instant` : "whole Manila day"}).</p>
        <p>Submission: {w.submissionState.replaceAll("_", " ")}. Payroll processing: {w.processingState}.</p>
        {editable && w.processingState === "draft" && <button className="btn btn-outline-secondary" disabled={busy} onClick={() => openEditor("extend-window", w.batchId)}>Extend {w.code} cutoff</button>}
        <details><summary>Window history ({w.history.length})</summary>{w.history.map((h) => <p key={h.revision}>Revision {h.revision}: {h.previousCutoffOn ? `${h.previousCutoffOn} to ` : ""}{h.cutoffOn} ({h.cutoffPolicy !== "whole_day_v1" ? `${h.cutoffLocalTime} PHT` : "whole Manila day"}); {h.reason}. {new Date(h.recordedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}. Actor: {h.actorId}.</p>)}</details>
      </article>)}
      <details><summary>Semester deadline history ({data.deadlines.length})</summary>{data.deadlines.map((d) => <p key={d.revision}>Revision {d.revision}: {d.previousDeadlineOn ? `${d.previousDeadlineOn} to ` : ""}{d.deadlineOn}; {d.reason}. {new Date(d.recordedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}. Actor: {d.actorId}.</p>)}</details>
    </>}
      {administration}
      </>}
    </details>
  </div>;
}
