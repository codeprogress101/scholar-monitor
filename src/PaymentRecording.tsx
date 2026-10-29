import CommandProgressDialog from "./CommandProgressDialog";
import { useEffect,useRef,useState,type FormEvent } from "react";
import { ApiError,type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import { pendingPrior,retainPriorCommand,usePriorCommand,type PriorCommand } from "./prior-command";
import ErrorNotice from "./ErrorNotice";
import CompactEditButton from "./CompactEditButton";
import PaymentStatusBadge from "./PaymentStatusBadge";
import FocusedDialog from "./FocusedDialog";
import { useActionForm } from "./use-action-form";
import type { RecordingInput,RecordingPreview,RecordingRow,RecordingSummary } from "../server/payments/recording-model";

type Page={items:RecordingRow[];total:number;offset:number;limit:number};
const day=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const money=(value:string)=>`PHP ${Number(value).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export default function PaymentRecording({batchId,session,onSaved,onBusyChange,onReconcile}:{batchId:string;session:Session;onSaved:()=>void;onBusyChange?:(busy:boolean)=>void;onReconcile?:()=>void}) {
  const path=`ovr-batches/${batchId}/payment-operations`,storage=`ldss-payment-command:${session.user.id}`;
  // Retain only the exact command, never credentials or a whole cohort graph.
  const [retained]=useState(()=>{try{const saved=JSON.parse(sessionStorage.getItem(storage)??"null") as PriorCommand|null;
    if(saved?.route==="payouts"&&/^ovr-batches\/[a-f0-9-]+\/(payment-operations|payment-corrections\/date-only)$/.test(saved.path)&&!pendingPrior(session.user.id))retainPriorCommand(session.user.id,saved);}catch{/* A corrupt local retry cannot authorize a payment. */}return pendingPrior(session.user.id);});
  const [pendingLocation]=useState(()=>window.location.hash);
  const command=usePriorCommand(session,path);
  const dateCommand=usePriorCommand(session,`ovr-batches/${batchId}/payment-corrections/date-only`);
  const [summary,setSummary]=useState<RecordingSummary|null>(null),[page,setPage]=useState<Page|null>(null),[query,setQuery]=useState(""),[search,setSearch]=useState(""),[offset,setOffset]=useState(0),[refresh,setRefresh]=useState(0);
  const [selected,setSelected]=useState<Map<string,RecordingRow>>(new Map()),[review,setReview]=useState<{input:RecordingInput;preview:RecordingPreview}|null>(null),[preparing,setPreparing]=useState(false),[error,setError]=useState<string|ApiError>(""),[notice,setNotice]=useState("");
  const [paidOn,setPaidOn]=useState(day),[reference,setReference]=useState(""),[reason,setReason]=useState("Actual payroll outcome confirmed by Staff");
  const [dateTarget,setDateTarget]=useState<RecordingRow|null>(null);
  const [storageIssue,setStorageIssue]=useState(false);
  const dateForm=useActionForm(dateTarget?.paymentId);
  const busy=useRef(false),paidDateEdited=useRef(false);
  const locked=command.locked||dateCommand.locked||preparing||Boolean(retained&&!retained.path.startsWith(`ovr-batches/${batchId}/`));
  useEffect(()=>{onBusyChange?.(command.locked||dateCommand.locked);},[command.locked,dateCommand.locked,onBusyChange]);
  useEffect(()=>{
    const updated=()=>{if(!pendingPrior(session.user.id))setRefresh(n=>n+1);};
    window.addEventListener("workflow-updated",updated);
    return()=>window.removeEventListener("workflow-updated",updated);
  },[session.user.id]);
  useEffect(()=>{
    const controller=new AbortController();
    request<RecordingSummary>(`ovr-batches/${batchId}/payment-summary`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])})
      .then(s=>{if(!controller.signal.aborted){setSummary(s);setReference(value=>value||s.code);}})
      .catch(e=>{if(!controller.signal.aborted)setError(e instanceof ApiError?e:"Could not load the payment summary. Refresh and try again.");});
    return()=>controller.abort();
  },[batchId,refresh]);
  useEffect(()=>{
    const controller=new AbortController();
    request<Page>(`ovr-batches/${batchId}/payment-roster?q=${encodeURIComponent(search)}&offset=${offset}&limit=25`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])})
      .then(p=>{if(!controller.signal.aborted)setPage(p);})
      .catch(e=>{if(!controller.signal.aborted)setError(e instanceof ApiError?e:"Could not load payments. Refresh and try again.");});
    return()=>controller.abort();
  },[batchId,search,offset,refresh]);
  function closeReview(){if(locked)return;setReview(null);}
  async function prepare(outcome:RecordingInput["outcome"],all=false,ids?:string[]) {
    if(locked||busy.current||pendingPrior(session.user.id)){setError("Resolve the saved payment command before starting another action.");return;}
    busy.current=true;setPreparing(true);setError("");setNotice("");
    const actualPaidOn=paidDateEdited.current?paidOn:day();if(!paidDateEdited.current)setPaidOn(actualPaidOn);
    const input:RecordingInput={mode:all?"all_remaining_paid":"selected",scholarshipIds:all?[]:ids??[...selected.keys()],outcome,actualPaidOn:outcome==="paid"?actualPaidOn:null,reason,reference};
    try{const preview=await request<RecordingPreview>(`${path}/preview`,{body:input,csrf:session.csrfToken,notify:false,signal:AbortSignal.timeout(300000)});setReview({input,preview});}
    catch(e){setError(e instanceof ApiError?e:"Could not prepare the review. No payment was submitted. Try again.");}
    finally{busy.current=false;setPreparing(false);}
  }
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!review)return;const form=new FormData(e.currentTarget);
    await save({input:review.input,basis:review.preview.basis,acceptedIds:review.preview.acceptedIds,reviewed:form.get("reviewed")==="on",receiptConfirmed:form.get("receiptConfirmed")==="on"});
  }
  async function save(body:Record<string,unknown>,retry=false,dateOnly=false){
    const promise=(dateOnly?dateCommand:command).run(body,"payouts",retry),saved=pendingPrior(session.user.id);
    if(saved){try{sessionStorage.setItem(storage,JSON.stringify(saved));}catch{setStorageIssue(true);}}
    const result=await promise;
    if(!pendingPrior(session.user.id)){try{sessionStorage.removeItem(storage);}catch{/* The resolved command is already cleared from memory. */}setStorageIssue(false);}
    if(result){setReview(null);setDateTarget(null);setSelected(new Map());setNotice(dateOnly?"Actual payment date corrected. Original date history is preserved.":`${result.recorded} payment outcomes recorded. No other outcomes were changed.`);setRefresh(n=>n+1);onSaved();}
  }
  function searchSubmit(e:FormEvent){
    e.preventDefault();
    // Identical filters do not rerun the read effect. Keep their loaded rows.
    if(query===search&&offset===0)return;
    setError("");setPage(null);setOffset(0);setSearch(query);
  }
  return <section aria-label="Payment Recording" className="payment-recording-content" data-pending-location={command.locked||dateCommand.locked?pendingLocation:undefined}>
    <CommandProgressDialog operation="Correcting payment date" identity={`${summary?.code??"Payroll"} / ${batchId}`} count={1} pending={dateCommand.saving} uncertain={dateCommand.uncertain} error={dateCommand.error} retry={()=>void save({},true,true)}/><ErrorNotice error={error||command.error||dateCommand.error}/>{notice&&<p role="status" className="alert alert-success">{notice}</p>}
    {storageIssue&&<p role="alert" className="alert alert-warning">Keep this tab open: the browser could not save the retry request. Confirm the result or use the saved-request retry here before closing.</p>}
    {command.uncertain&&<div role="alert" className="alert alert-warning"><p>The response was not confirmed. Your exact payment request is saved. Resolve it before changing payrolls.</p><button className="btn configuration-primary" disabled={command.saving} onClick={()=>void save({},true)}>Retry saved payment request</button></div>}
    {dateCommand.uncertain&&<div role="alert" className="alert alert-warning"><p>The date correction response was not confirmed. Retry the saved request.</p><button className="btn configuration-primary" disabled={dateCommand.saving} onClick={()=>void save({},true,true)}>Retry saved date correction</button></div>}
    {!summary&&!error&&<p role="status">Loading payment summary...</p>}

    {summary&&<>
      <dl className="payment-summary" aria-label="Payment summary">
        <div><dt>Total scholars</dt><dd><strong>{summary.total}</strong><small>Approved total: {money(summary.totalAmount)}</small></dd></div>
        <div><dt><PaymentStatusBadge outcome="paid"/></dt><dd><strong>{summary.paid}</strong><small>Paid amount: {money(summary.paidAmount)}</small></dd></div>
        <div><dt><PaymentStatusBadge outcome="unclaimed"/></dt><dd><strong>{summary.unclaimed}</strong><small>Unclaimed value: {money(summary.unclaimedAmount)}</small></dd></div>
        <div><dt><PaymentStatusBadge outcome="pending"/></dt><dd><strong>{summary.pending}</strong><small>Pending amount: {money(summary.pendingAmount)}</small></dd></div>
        <div><dt><PaymentStatusBadge outcome="needs_review"/></dt><dd><strong>{summary.needsReview}</strong></dd></div>
      </dl>
      {summary.total>0&&summary.pending===0&&summary.needsReview===0&&<p role="status"><strong>Payment Recording Complete.</strong> Review the returned payroll, then ask the Coordinator to close payroll.</p>}

      {!!summary.needsReview&&<p className="alert alert-warning">{summary.needsReview} Withheld or Review outcomes require financial resolution. They will not be included in Mark All Remaining Paid.</p>}
      {!summary.canRecord&&<p className="alert alert-info">Payment recording is available after the payroll is Processed, within an available financial period. Existing historical and correction tools remain available under Payroll details.</p>}
      <form onSubmit={searchSubmit} className="recording-search"><label>Search Scholar<input className="form-control" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Scholar ID or name"/></label><button className="btn btn-outline-secondary" disabled={locked}>Search</button></form>
      <p className="recording-guidance">Select Pending rows, then review an outcome.</p>
      <fieldset className="recording-actions" disabled={locked||!summary.canRecord}>
        <div className="recording-action-fields"><label>Actual Payment Date<input type="date" className="form-control" value={paidOn} max={day()} onChange={e=>{paidDateEdited.current=true;setPaidOn(e.target.value);setReview(null);}}/></label>
          <details><summary>Additional Details</summary><label className="d-block my-2">Payment reference<input className="form-control" value={reference} maxLength={300} onChange={e=>setReference(e.target.value)}/></label>
          <label className="d-block my-2">Recording note<input className="form-control" value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></label></details></div>
        <div className="recording-outcomes"><button className="btn btn-outline-primary" disabled={!selected.size} onClick={()=>void prepare("paid")}>Mark Paid</button><button className="btn btn-outline-secondary" disabled={!selected.size} onClick={()=>void prepare("unclaimed")}>Mark Unclaimed</button><button className="btn btn-outline-secondary" disabled={!summary.pending} onClick={()=>void prepare("paid",true)}>Mark All Remaining Paid</button><span role="status">{selected.size} selected</span></div>
      </fieldset>


      {!!selected.size&&<details><summary>Review selected scholars ({selected.size})</summary><ul>{[...selected.values()].map(row=><li key={row.scholarshipId}>{row.humanId} — {row.name} <button type="button" className="btn btn-sm btn-outline-secondary" disabled={locked} onClick={()=>setSelected(current=>{const next=new Map(current);next.delete(row.scholarshipId);return next;})}>Remove {row.humanId}</button></li>)}</ul></details>}
      {!page&&!error&&<p role="status">Loading payroll scholars...</p>}
      {page&&<><p className="recording-scroll-hint" id="recording-scroll-hint">Scroll sideways for dates and row actions.</p><div className="table-responsive" tabIndex={0} role="region" aria-label="Payroll scholars" aria-describedby="recording-scroll-hint" onFocusCapture={e=>{if(e.target!==e.currentTarget)e.target.scrollIntoView({block:"nearest",inline:"nearest"});}}><table className="table payment-recording-table"><colgroup>{[6,33,20,16,10,15].map((width,i)=><col key={i} style={{width:`${width}%`}}/>)}</colgroup><thead><tr><th scope="col">Select</th><th scope="col">Scholar / permanent ID</th><th scope="col">School</th><th scope="col" className="recording-money">Approved stipend</th><th scope="col">Outcome</th><th scope="col">Actual payment date</th></tr></thead><tbody>
        {page.items.map(row=><tr key={row.scholarshipId}><td><input type="checkbox" aria-label={`Select ${row.humanId}`} disabled={locked||!summary.canRecord||row.outcome!=="pending"} checked={selected.has(row.scholarshipId)} onChange={e=>{const checked=e.target.checked;setSelected(current=>{const next=new Map(current);if(checked)next.set(row.scholarshipId,row);else next.delete(row.scholarshipId);return next;});}}/></td>
          <th scope="row"><strong>{row.name}</strong><small>{row.humanId}</small></th><td>{row.school??"—"}</td><td className="recording-money">{row.amount==="Unavailable"?row.amount:money(row.amount)}</td><td><PaymentStatusBadge outcome={row.outcome}/></td><td><div className="recording-date">{row.actualPaidOn??"—"}{row.outcome==="paid"&&summary.canRecord&&<CompactEditButton label={`Edit payment date for ${row.humanId}`} disabled={locked} onClick={()=>setDateTarget(row)}/>}</div></td></tr>)}
      </tbody></table></div>{!page.items.length&&<p>No matching scholars in this payroll.</p>}
      <nav aria-label="Payroll scholar pages" className="d-flex gap-2 align-items-center"><button className="btn btn-outline-secondary" disabled={locked||!offset} onClick={()=>{setPage(null);setOffset(n=>Math.max(0,n-25));}}>Previous</button><span>{page.total?offset+1:0}–{Math.min(offset+25,page.total)} of {page.total}</span><button className="btn btn-outline-secondary" disabled={locked||offset+25>=page.total} onClick={()=>{setPage(null);setOffset(n=>n+25);}}>Next</button></nav></>}
    </>}
    <div className="recording-secondary" aria-label="Payment review and refresh">
      {summary&&onReconcile&&<button type="button" className="btn configuration-primary my-2" disabled={locked} onClick={onReconcile}>{summary.state==="closed"?"Review Payments":"Verify Returned Payroll"}</button>}
    <button type="button" className="btn btn-outline-secondary" disabled={locked} onClick={()=>{setError("");setRefresh(n=>n+1);}}>Refresh payments</button>
    </div>
    {dateTarget&&summary&&<form ref={dateForm} aria-label="Correct actual payment date" className="border rounded p-3 my-3" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);void save({expectedRevision:summary.revision,paymentId:dateTarget.paymentId,effectiveOn:String(data.get("effectiveOn")),reason:String(data.get("reason")),reference:summary.code},false,true);}}>
      <h4>Correct actual payment date — {dateTarget.name}</h4><p>Original date: {dateTarget.actualPaidOn??"Not recorded"}. Paid outcome and approved amount remain unchanged. Closed or expired financial periods retain Coordinator review.</p>
      <label className="d-block">Actual Payment Date<input type="date" name="effectiveOn" className="form-control" defaultValue={dateTarget.actualPaidOn??""} required max={day()} disabled={locked}/></label>
      <label className="d-block">Reason<input name="reason" className="form-control" minLength={5} maxLength={500} required disabled={locked}/></label>
      <button className="btn configuration-primary my-2" disabled={locked}>Save date correction</button> <button type="button" className="btn btn-outline-secondary" disabled={locked} onClick={()=>setDateTarget(null)}>Cancel date correction</button>
    </form>}
    {preparing&&<p role="status">Checking the selected payments against current financial records...</p>}
    {review&&<FocusedDialog progress={{operation:"Recording payment outcomes",identity:`${summary?.code??"Payroll"} / ${batchId}`,count:review.preview.count,pending:command.saving,uncertain:command.uncertain,error:command.error,retry:()=>void save({},true),retryLabel:"Retry saved payment request"}} title="Review Payments" className="payment-review-dialog" busy={locked} onClose={closeReview}>
      <form key={review.preview.basis} onSubmit={submit}><p>Scholars to mark {review.input.outcome==="paid"?"Paid":"Unclaimed"}: <strong>{review.preview.count}</strong><br/>Amount to record Paid: <strong>{money(review.preview.amount)}</strong></p>
      <p>Final Paid: {review.preview.final.paid} · Final Unclaimed: {review.preview.final.unclaimed} · Final Pending: {review.preview.final.pending} · Needs resolution: {review.preview.final.needsReview}</p>
      {!!review.preview.conflicts.length&&<div className="alert alert-warning"><p>Some selected scholars cannot be processed. Nothing has been recorded.</p><ul>{review.preview.conflicts.map(c=><li key={c.scholarshipId}>{c.name}: {c.reason}</li>)}</ul><button type="button" className="btn btn-outline-secondary" disabled={locked||!review.preview.count} onClick={()=>{setReview(null);void prepare(review.input.outcome,false,review.preview.acceptedIds);}}>Remove conflicts and refresh review</button></div>}
      <details><summary>Scholars in this review</summary><ul>{review.preview.accepted.map(row=><li key={row.scholarshipId}>{row.name} — {money(row.amount)}</li>)}</ul></details>
      {review.input.outcome==="paid"&&<label className="d-block my-3"><input name="receiptConfirmed" type="checkbox" required disabled={locked}/> I confirm actual receipt of the approved stipend by every scholar in this review, on {review.input.actualPaidOn}.</label>}
      <label className="d-block my-3"><input name="reviewed" type="checkbox" required disabled={locked}/> I reviewed these {review.preview.count} outcomes and confirm they are correct.</label>
      <ErrorNotice error={command.error}/>{command.uncertain&&<button type="button" className="btn configuration-primary" disabled={command.saving} onClick={()=>void save({},true)}>Retry saved payment request</button>}
      <div className="d-flex gap-2"><button className="btn configuration-primary" disabled={locked||!review.preview.count||!!review.preview.conflicts.length}>Confirm {review.preview.count} {review.input.outcome==="paid"?"Paid":"Unclaimed"}</button><button type="button" className="btn btn-outline-secondary" disabled={locked} onClick={closeReview}>Cancel</button></div>
      </form></FocusedDialog>}
  </section>;
}
