import { useEffect, useRef, useState, type FormEvent } from "react";
import type { OvrSections } from "../server/ovr/detail-model";
type OvrDetail = OvrSections["reprocessing"];
import {usePriorCommand,pendingPrior} from "./prior-command";
import FocusedDialog from "./FocusedDialog";
import {ActionButton} from "./ActionProgress";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest } from "./configuration-api";

export default function PayrollReprocessing({detail, session, canManage, onSaved, onBusyChange, managedBatch = false}: {onBusyChange?:(busy:boolean)=>void; managedBatch?: boolean; detail: OvrDetail; session: Session; canManage: boolean; onSaved: () => void}) {
  const [action,setAction] = useState(""), [target,setTarget] = useState(""), [busy,setBusy] = useState(false), [error,setError] = useState("");
  const restoreJob=usePriorCommand(session,`ovr-batches/${detail.batch.id}/restore`),[restoreReason,setRestoreReason]=useState("");
  const restoreField=useRef<HTMLTextAreaElement>(null),restoreTrigger=useRef<HTMLButtonElement|null>(null);
  const busyCallback=useRef(onBusyChange);useEffect(()=>{busyCallback.current=onBusyChange;});
  useEffect(()=>{busyCallback.current?.(restoreJob.locked);return()=>busyCallback.current?.(false);},[restoreJob.locked]);
  useEffect(()=>{if(action==="restore"){const frame=requestAnimationFrame(()=>restoreField.current?.focus());return()=>cancelAnimationFrame(frame);}},[action]);
  useEffect(()=>{const p=new URLSearchParams(location.hash.split('?')[1]);if(p.get('recovery')!=='deferral')return;const button=document.getElementById('restore-deferral-'+p.get('annual'));if(button instanceof HTMLButtonElement){button.focus();button.scrollIntoView({block:'center'});}},[detail]);
  function closeRestore(){if(restoreJob.locked)return;setAction("");setRestoreReason("");requestAnimationFrame(()=>restoreTrigger.current?.focus());}
  async function restore(e?:FormEvent,retry=false){e?.preventDefault();const result=await restoreJob.run({expectedRevision:detail.batch.revision,reason:restoreReason,scholarshipId:target,...(detail.managed?{expectedSourceHash:detail.managed.sourceHash}:{})},'payouts',retry);if(result){setAction("");setRestoreReason("");onSaved();}}
  const pending = useRef<{signature:string;key:string} | null>(null);
  const entries = detail.automatic?.entries ?? detail.entries;
  const queues = detail.reprocessing ?? [];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(busy) return;
    const f = new FormData(e.currentTarget);
    const body = {expectedRevision:detail.batch.revision, reason:String(f.get("reason")),
      ...(action === "assign-reprocessing" ? {reprocessingId:target,expectedQueueRevision:queues.find(q => q.id === target)!.revision} : action === "classify-unpaid" ? {paymentId:target,unpaidReason:String(f.get("unpaidReason"))} : {scholarshipId:target, ...(detail.managed ? {expectedSourceHash:detail.managed.sourceHash} : {})})};
    const signature=JSON.stringify({action,body});
    if(pending.current?.signature !== signature) pending.current={signature,key:crypto.randomUUID()};
    setBusy(true);setError("");
    try { await configurationRequest(`ovr-batches/${detail.batch.id}/${action}`,{body,key:pending.current.key,csrf:session.csrfToken});pending.current=null;setAction("");onSaved(); }
    catch(e) {setError(e instanceof ApiError ? e.message : "Could not confirm the result. Retry safely.");} finally {setBusy(false);}
  }
  function open(next:string,id:string) {if(pendingPrior(session.user.id))return;setAction(next);setTarget(id);setError("");}
  return <section aria-label="Deferrals and unclaimed stipends" className="my-3">
    {!detail.deferrals?.length && !queues.length && !detail.payments.some(p=>p.outcome === "not_paid" && !p.unpaidReason) && <p>No deferred scholars or unclaimed stipends to review.</p>}
    {canManage && detail.canEdit && !detail.managed && !managedBatch && entries.length > 0 && <label className="form-label">Defer to later batch<select className="form-select" value="" onChange={e=>open("defer",e.target.value)}><option value="">Choose a scholar</option>{entries.map(e=><option key={e.scholarshipId} value={e.scholarshipId}>{e.evidence.current.sources.scholarship.name}</option>)}</select></label>}
    {!!detail.deferrals?.length && <details open><summary>Deferred from this batch ({detail.deferrals.length})</summary>{detail.deferrals.map(d=><p key={d.scholarshipId}><strong>{d.name}</strong> — Deferred from this batch; eligibility is assessed separately. {d.reason} {canManage && detail.canEdit && <button type="button" id={"restore-deferral-"+d.scholarshipId} className="btn btn-sm btn-outline-secondary" disabled={restoreJob.locked} onClick={e=>{restoreTrigger.current=e.currentTarget;setRestoreReason("");open("restore",d.scholarshipId);}}>Restore to this draft</button>}</p>)}</details>}
    {!!queues.length && <details open><summary>Unclaimed stipend processing</summary>{queues.map(q=><div key={q.id} className="border-bottom py-2"><strong>{q.name}</strong><p>{q.status === "paid" ? "Stipend paid - no further collection" : q.status === "expired" ? "Unclaimed - claim period ended" : q.status === "review" ? "Needs review" : q.status === "processed" ? "Reprocessing attempt recorded" : q.status === "assigned" ? "Reprocessing" : "Unclaimed - for reprocessing"} — from <a href={`#payouts?cycle=${q.sourceCycleId}&batch=${q.sourceBatchId}`}>{q.sourceCode}</a>. Claim deadline: {q.deadline}.</p>{q.reasons.map(r=><p key={r}>{r}</p>)}{canManage && detail.canEdit && ["queued","assigned"].includes(q.status) && q.destinationBatchId !== detail.batch.id && q.destinations.some(d=>d.id === detail.batch.id) && <button className="btn btn-sm btn-outline-secondary" onClick={()=>open("assign-reprocessing",q.id)}>Assign to this draft</button>}{q.status === "queued" && <p>{q.destinations.length ? "Coordinator must select a destination draft." : "Waiting for a suitable draft in this semester."}</p>}</div>)}</details>}
    {canManage && detail.payments.filter(p=>p.outcome === "not_paid" && !p.unpaidReason).map(p=><p key={p.id}>Historical unpaid outcome requires classification. <button className="btn btn-sm btn-outline-secondary" onClick={()=>open("classify-unpaid",p.id)}>Classify unpaid outcome</button></p>)}
    {error && <p role="alert" className="alert alert-danger">{error}</p>}
    {action && action!=="restore" && <form onSubmit={submit} className="border rounded p-3"><fieldset disabled={busy}><legend>{action === "defer" ? "Defer to later batch" : action === "restore" ? "Restore to this draft" : action === "classify-unpaid" ? "Classify unpaid outcome" : "Assign reprocessing"}</legend>{action === "classify-unpaid" && <label className="form-label d-block">Unpaid reason<select name="unpaidReason" className="form-select"><option value="did_not_claim">Did not claim</option><option value="withheld">Payment withheld</option><option value="review">Other / needs review</option></select></label>}<label className="form-label d-block">Reason<textarea className="form-control" name="reason" required minLength={5} maxLength={500}/></label><button className="btn configuration-primary">Confirm</button> <button className="btn btn-outline-secondary" type="button" onClick={()=>setAction("")}>Cancel</button></fieldset></form>}
    {(action==="restore"||restoreJob.uncertain)&&<FocusedDialog title="Restore deferral to original payroll" className="payroll-restore-dialog" busy={restoreJob.locked} onClose={closeRestore}><form onSubmit={e=>void restore(e)}><p><strong>{detail.batch.code} / revision {detail.batch.revision}</strong><span className="d-block">{detail.deferrals?.find(d=>d.scholarshipId===target)?.name??"Retained restoration command"}</span></p><p>Restore this deferral in the original Draft. Current eligibility determines inclusion; this does not finalize, allocate or pay.</p><fieldset disabled={restoreJob.locked}><label>Restoration reason<textarea ref={restoreField} className="form-control" required minLength={5} maxLength={500} value={restoreReason} onChange={e=>setRestoreReason(e.target.value)}/></label></fieldset>{restoreJob.error&&<p role="alert" className="alert alert-danger">{restoreJob.error}</p>}{restoreJob.uncertain?<><p role="status">The result is uncertain. The exact command and key are retained.</p><ActionButton type="button" className="btn configuration-primary" pending={restoreJob.saving} activeLabel="Checking restoration..." onClick={()=>void restore(undefined,true)}>Retry Exact Restoration</ActionButton></>:<ActionButton className="btn configuration-primary" pending={restoreJob.saving} activeLabel="Restoring...">Confirm restoration</ActionButton>} <button type="button" className="btn btn-outline-secondary" disabled={restoreJob.locked} onClick={closeRestore}>Cancel</button></form></FocusedDialog>}
  </section>;
}
