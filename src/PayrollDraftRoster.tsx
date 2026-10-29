import {ActionButton} from "./ActionProgress";
import {useEffect,useRef,useState,type FormEvent} from "react";
import type {OvrCandidatePage,OvrSummary} from "../server/ovr/detail-model";
import type {Session} from "./auth-api";
import {ApiError} from "./auth-api";
import {configurationRequest as request} from "./configuration-api";
import {usePriorCommand} from "./prior-command";
import FocusedDialog from "./FocusedDialog";
import ErrorNotice from "./ErrorNotice";
import PayrollFormLinks from "./PayrollFormLinks";
import ScholarIssueAction from "./ScholarIssueAction";
import {receivingScholarAddress} from "./scholar-issue-navigation";
export type DraftReview=NonNullable<OvrCandidatePage["review"]> & {batchRevision:number};
type Item=OvrCandidatePage["items"][number];
export default function PayrollDraftRoster({detail,session,permissions,onReview,onSaved,onBusyChange,primaryAction}:{detail:OvrSummary;session:Session;permissions:string[];onReview:(review:DraftReview)=>void;onSaved:()=>void;onBusyChange:(busy:boolean)=>void;primaryAction:React.ReactNode}){
 const [view,setView]=useState<"included"|"excluded">("included"),[query,setQuery]=useState(""),[search,setSearch]=useState(""),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
 const [response,setResponse]=useState<{key:string;data:OvrCandidatePage}|null>(null),[failure,setFailure]=useState<{key:string;error:string|ApiError}|null>(null);
 const job=usePriorCommand(session,`ovr-batches/${detail.batch.id}/defer`);
 const [selected,setSelected]=useState<Item|null>(null),[reason,setReason]=useState(""),[confirmed,setConfirmed]=useState(false);
 const key=`${detail.batch.id}:${detail.batch.revision}:${view}:${search}:${offset}:${retry}`,data=response?.key===key?response.data:null,error=failure?.key===key?failure.error:"";
 const reasonField=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{if(!selected)return;const frame=requestAnimationFrame(()=>reasonField.current?.focus());return()=>cancelAnimationFrame(frame);},[selected]);
 const callback=useRef(onReview),busyCallback=useRef(onBusyChange);
 useEffect(()=>{callback.current=onReview;busyCallback.current=onBusyChange;});
 useEffect(()=>{busyCallback.current(job.locked);return()=>busyCallback.current(false);},[job.locked]);
 useEffect(()=>{
  const c=new AbortController();
  const scheduled=setTimeout(()=>void request<OvrCandidatePage>(`ovr-batches/${detail.batch.id}/candidates?view=${view}&q=${encodeURIComponent(search)}&offset=${offset}&limit=25`,{signal:AbortSignal.any([c.signal,AbortSignal.timeout(120000)])})
   .then(data=>{if(c.signal.aborted)return;if(data.batchRevision!==detail.batch.revision||!data.review)throw new Error("Payroll changed. Refresh the batch before continuing.");setResponse({key,data});callback.current({...data.review,batchRevision:data.batchRevision});})
   .catch(e=>{if(!c.signal.aborted)setFailure({key,error:e instanceof ApiError?e:e instanceof Error?e.message:"Could not load the payroll roster. Retry this read."});}),0);
  return()=>{clearTimeout(scheduled);c.abort();};
 },[detail.batch.id,detail.batch.revision,view,search,offset,key]);
 function find(e:FormEvent){e.preventDefault();setOffset(0);setSearch(query.trim());}
 function close(){if(job.locked)return;setSelected(null);setReason("");setConfirmed(false);}
 async function defer(e?:FormEvent,retryExact=false){e?.preventDefault();if(!retryExact&&(!data?.review||!selected))return;
  const result=await job.run({expectedRevision:detail.batch.revision,expectedSourceHash:data?.review?.sourceHash,scholarshipId:selected?.scholarshipId,reason,reference:"Coordinator batch deferral"},"payouts",retryExact);
  if(result){setSelected(null);setReason("");setConfirmed(false);onSaved();}
 }
 const review=data?.review;
 const knownReview=review??response?.data.review;
 const loading=!data&&!error;
 const currentUnavailable=!data;

 return <section className="payroll-draft-roster" aria-label="Included payroll roster" aria-busy={loading}>
  <div className="payroll-draft-context"><span>{detail.cycle.yearCode} / {detail.cycle.semesterCode}</span>{knownReview&&<><strong>{knownReview.includedCount} included</strong><span>{knownReview.pendingCount} awaiting review</span>{!review&&<span className="muted-line">Last loaded summary; current counts unconfirmed.</span>}</>}</div>
  <div className="payroll-draft-actions"><fieldset className="payroll-current-actions" disabled={currentUnavailable||job.locked}>{primaryAction}</fieldset>{review?<PayrollFormLinks batchId={detail.batch.id} draft/>:<button type="button" className="btn configuration-primary" disabled>Preview payroll (draft)</button>}</div>
  <div className="payroll-roster-heading"><h2>{view==="included"?"Included scholars":"Excluded scholars"}</h2><button type="button" className="btn btn-outline-secondary" disabled={job.locked} onClick={()=>{setView(view==="included"?"excluded":"included");setOffset(0);setSearch("");setQuery("");}}>{view==="included"?"Review Excluded Scholars":"Back to Included Scholars"}{review&&view==="included"?` (${review.excludedCount})`:""}</button></div>
  {view==="excluded"&&review&&<p>{review.excludedCount} excluded: {review.excludedCount-review.deferredCount-review.pendingCount} blocked, {review.deferredCount} deferred, {review.pendingCount} awaiting review. Existing allocations, source restrictions and review reasons remain below.</p>}
  <form onSubmit={find} className="u11-roster-search payroll-roster-search" role="search" aria-label="Search payroll scholars"><label>Find scholar<input className="form-control" maxLength={160} value={query} disabled={job.locked} placeholder="Search scholar name or ID" onChange={e=>setQuery(e.target.value)}/></label><button className="btn btn-outline-secondary" disabled={job.locked||loading}>Search</button></form>
  {loading&&<div className="payroll-roster-loading"><p role="status"><span className="payroll-loading-spinner" aria-hidden="true"/>Loading {view==="included"?"included":"excluded"} scholars... <span className="visually-hidden">Assessing current payroll sources and loading 25 scholars.</span></p><div className="payroll-skeleton" aria-hidden="true">{Array.from({length:5},(_,i)=><div className="payroll-skeleton-row" key={i}><span><i className="skeleton-name"/><i className="skeleton-id"/></span><span><i className="skeleton-year"/><i className="skeleton-status"/></span><span><i className="skeleton-action"/></span></div>)}</div></div>}
  <ErrorNotice error={error}/>{error&&<button type="button" className="btn btn-outline-secondary" onClick={()=>setRetry(n=>n+1)}>Retry roster</button>}
  {data&&<><p role="status">{data.total?`${offset+1}-${Math.min(offset+25,data.total)} of ${data.total}`:"No matching scholars"}</p><div className="table-responsive" role="region" aria-label="Payroll scholars" tabIndex={0}><table className="table compact-table"><thead><tr><th scope="col">Scholar</th><th scope="col">School / year</th><th scope="col">Actions{view==="excluded"?" / reason":""}</th></tr></thead><tbody>{data.items.map(item=>{
   const person=item.evidence.current.sources.scholarship;
   return <tr key={item.scholarshipId}><td><strong>{person.name}</strong><small className="d-block">{person.humanId}</small></td><td>{item.row?.school??"Academic details need review"}<small className="d-block">{item.row?`Year ${item.row.yearLevel} / ${item.row.course}`:""}</small></td><td><a className="btn btn-sm btn-outline-secondary" onClick={()=>sessionStorage.setItem(`payroll-return-${detail.cycle.id}`,window.location.hash)} href={receivingScholarAddress(person.scholarId,detail.cycle.academicYearId,detail.cycle.semesterId,detail.cycle.id)}>Review Scholar</a>
   {permissions.includes("ovr.finalize")&&detail.canEdit&&(!item.evidence.current.sources.semesterPayroll?.allocated||item.evidence.reprocessing)&&!item.deferred?.current&&<button type="button" className="btn btn-sm btn-outline-secondary" disabled={job.locked} onClick={()=>{setSelected(item);setReason("");setConfirmed(false);}}>Defer</button>}
   {view==="excluded"&&<details><summary>{item.deferred?.current?"Deferred: view reason":item.pending?"Needs review: view reason":"Blocked: view reason"}</summary>{item.deferred?.current&&<p>{item.deferred.reason}</p>}<ul>{item.issues.map((issue,n)=><li key={n}>{issue.message}<ScholarIssueAction permissions={permissions} code={issue.code} scholarId={person.scholarId} yearId={detail.cycle.academicYearId} semesterId={detail.cycle.semesterId} payoutCycleId={detail.cycle.id}/></li>)}</ul></details>}</td></tr>;
  })}</tbody></table></div><nav className="list-pagination" aria-label="Payroll roster pages"><button type="button" className="btn btn-outline-secondary" disabled={job.locked||!offset} onClick={()=>setOffset(n=>Math.max(0,n-25))}>Previous</button><span>Page {Math.floor(offset/25)+1} of {Math.max(1,Math.ceil(data.total/25))}</span><button type="button" className="btn btn-outline-secondary" disabled={job.locked||offset+25>=data.total} onClick={()=>setOffset(n=>n+25)}>Next</button></nav></>}
  {(selected||job.uncertain)&&<FocusedDialog title="Defer scholar from this draft" busy={job.locked} onClose={close} className="payroll-defer-dialog"><form onSubmit={e=>void defer(e)}><p><strong>{selected?.evidence.current.sources.scholarship.name??"Retained deferral command"}</strong><span className="d-block">{selected?.evidence.current.sources.scholarship.humanId??String(job.initial?.body.scholarshipId??"")}</span></p><p>This excludes this scholar from this draft. Documents remain available for later eligibility review; it does not authorize an individual payment.</p><fieldset disabled={job.locked}><label>Deferral reason<textarea ref={reasonField} className="form-control" required minLength={5} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><label className="payroll-defer-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} required/> I confirm this scholar should be deferred from this batch.</label></fieldset>{job.error&&<p role="alert" className="alert alert-danger">{job.error}</p>}{job.uncertain?<><p role="status">The response is uncertain. The exact command and key are retained. Retry to confirm its original result.</p><ActionButton type="button" className="btn configuration-primary" pending={job.saving} activeLabel="Checking deferral..." onClick={()=>void defer(undefined,true)}>Retry Exact Deferral</ActionButton></>:<ActionButton className="btn configuration-primary" pending={job.saving} activeLabel="Deferring..." disabled={!confirmed}>Record deferral</ActionButton>} <button type="button" className="btn btn-outline-secondary" disabled={job.locked} onClick={close}>Cancel</button></form></FocusedDialog>}
 </section>;
}
