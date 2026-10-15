import { useRef, useState, type FormEvent } from "react";
import type { OvrDetail } from "../server/ovr/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest } from "./configuration-api";

export default function PayrollReprocessing({detail, session, canManage, onSaved}: {detail: OvrDetail; session: Session; canManage: boolean; onSaved: () => void}) {
  const [action,setAction] = useState(""), [target,setTarget] = useState(""), [busy,setBusy] = useState(false), [error,setError] = useState("");
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
  function open(next:string,id:string) {setAction(next);setTarget(id);setError("");}
  return <section aria-label="Deferrals and unclaimed stipends" className="my-3">
    {canManage && detail.canEdit && !detail.managed && entries.length > 0 && <label className="form-label">Defer to later batch<select className="form-select" value="" onChange={e=>open("defer",e.target.value)}><option value="">Choose a scholar</option>{entries.map(e=><option key={e.scholarshipId} value={e.scholarshipId}>{e.evidence.current.sources.scholarship.name}</option>)}</select></label>}
    {!!detail.deferrals?.length && <details open><summary>Deferred from this batch ({detail.deferrals.length})</summary>{detail.deferrals.map(d=><p key={d.scholarshipId}><strong>{d.name}</strong> — Deferred from this batch; eligibility is assessed separately. {d.reason} {canManage && detail.canEdit && <button className="btn btn-sm btn-outline-secondary" onClick={()=>open("restore",d.scholarshipId)}>Restore to this draft</button>}</p>)}</details>}
    {!!queues.length && <details open><summary>Unclaimed stipend processing</summary>{queues.map(q=><div key={q.id} className="border-bottom py-2"><strong>{q.name}</strong><p>{q.status === "paid" ? "Stipend paid - no further collection" : q.status === "expired" ? "Unclaimed - claim period ended" : q.status === "review" ? "Needs review" : q.status === "processed" ? "Reprocessing attempt recorded" : q.status === "assigned" ? "Reprocessing" : "Unclaimed - for reprocessing"} — from <a href={`#payouts?cycle=${q.sourceCycleId}&batch=${q.sourceBatchId}`}>{q.sourceCode}</a>. Claim deadline: {q.deadline}.</p>{q.reasons.map(r=><p key={r}>{r}</p>)}{canManage && detail.canEdit && ["queued","assigned"].includes(q.status) && q.destinationBatchId !== detail.batch.id && q.destinations.some(d=>d.id === detail.batch.id) && <button className="btn btn-sm btn-outline-secondary" onClick={()=>open("assign-reprocessing",q.id)}>Assign to this draft</button>}{q.status === "queued" && <p>{q.destinations.length ? "Coordinator must select a destination draft." : "Waiting for a suitable draft in this semester."}</p>}</div>)}</details>}
    {canManage && detail.payments.filter(p=>p.outcome === "not_paid" && !p.unpaidReason).map(p=><p key={p.id}>Historical unpaid outcome requires classification. <button className="btn btn-sm btn-outline-secondary" onClick={()=>open("classify-unpaid",p.id)}>Classify unpaid outcome</button></p>)}
    {error && <p role="alert" className="alert alert-danger">{error}</p>}
    {action && <form onSubmit={submit} className="border rounded p-3"><fieldset disabled={busy}><legend>{action === "defer" ? "Defer to later batch" : action === "restore" ? "Restore to this draft" : action === "classify-unpaid" ? "Classify unpaid outcome" : "Assign reprocessing"}</legend>{action === "classify-unpaid" && <label className="form-label d-block">Unpaid reason<select name="unpaidReason" className="form-select"><option value="did_not_claim">Did not claim</option><option value="withheld">Payment withheld</option><option value="review">Other / needs review</option></select></label>}<label className="form-label d-block">Reason<textarea className="form-control" name="reason" required minLength={5} maxLength={500}/></label><button className="btn configuration-primary">Confirm</button> <button className="btn btn-outline-secondary" type="button" onClick={()=>setAction("")}>Cancel</button></fieldset></form>}
  </section>;
}
