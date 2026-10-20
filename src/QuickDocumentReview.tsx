import { useEffect, useRef, useState } from "react";
import type { RequirementInstance } from "../server/requirements/instances-model";
import type { VerificationContext } from "../server/requirements/workflow-model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import { receivingToday } from "./receiving-selection";

export default function QuickDocumentReview({instance,session,canReceive,canVerify,closed,disabled,onBusy,onChanged,onAcademicSetup,allowReceiveOnly=true}:{instance:RequirementInstance;session:Session;canReceive:boolean;canVerify:boolean;closed:boolean;disabled:boolean;onBusy:(busy:boolean)=>void;onChanged:()=>void;onAcademicSetup?:(year?:string)=>void;allowReceiveOnly?:boolean}) {
 const [context,setContext]=useState<VerificationContext|null>(null),[checked,setChecked]=useState(false),[error,setError]=useState(""),[contextError,setContextError]=useState(""),[refresh,setRefresh]=useState(0),[saving,setSaving]=useState(false),[uncertain,setUncertain]=useState(false);
 const [receivedOn,setReceivedOn]=useState(""),[effectiveOn,setEffectiveOn]=useState(""),[notes,setNotes]=useState(""),[reference,setReference]=useState(""),[storage,setStorage]=useState(""),[documentType,setDocumentType]=useState("cor");
 const [missingYear,setMissingYear]=useState<string>();
 const busy=useRef(false),pending=useRef<{path:string;body:object;key:string}|null>(null);
 useEffect(()=>{if(context && sessionStorage.getItem("document-focus")===instance.id){document.querySelector<HTMLInputElement>(`[data-document-id="${instance.id}"]`)?.focus();sessionStorage.removeItem("document-focus");}},[context,instance.id]);
 const initial=instance.status==="not_submitted";
 useEffect(()=>{
  const abort=new AbortController();
  if(canVerify&&!closed)request<VerificationContext>(`requirement-instances/${instance.id}/verification-context`,{signal:abort.signal}).then(c=>{if(!abort.signal.aborted){setContext(c);setChecked(false);setContextError("");}}).catch(e=>{if(!abort.signal.aborted){setContext(null);setChecked(false);setContextError(e instanceof Error?e.message:"Could not load document context.");if(e instanceof ApiError&&e.code==="ACADEMIC_RECORD_REQUIRED")setMissingYear((e.details as {academicYearId?:string})?.academicYearId);}});
  return()=>abort.abort();
 },[instance.id,instance.version,canVerify,closed,refresh]);
 if(closed || (!instance.verificationNeedsReview && !["not_submitted","submitted","resubmitted","for_verification"].includes(instance.status)))return null;
 async function send(mode:"receive"|"verify"|"combined"|"retry"){
  if(busy.current)return;
  if(mode!=="retry"){
   if(pending.current)return;
   if(mode!=="receive"&&(!checked||!context))return;
   const receipt={expectedVersion:instance.version,...(instance.entrantCard?{entrantCardId:instance.entrantCard.id,documentType:"shs_grading_card"}:{}),...(receivedOn?{receivedOn}:{}),physicalReference:reference.trim()||null,storageLocation:storage,remarks:notes.trim()||null,...(instance.coverage?.kind==="cor"?{documentType}:{})};
   const c=context;
   const verification={action:"verify",expectedVersion:initial?1:instance.version,...(effectiveOn?{effectiveOn}:{}),reason:c?.coursePending?"Physical document checked; course comparison deferred under approved exception":"Physical document checked against all five verification criteria",reference:reference.trim()||"Physical document reviewed at scholarship office",remarks:notes.trim()||null,attestation:c?.coursePending?"course-comparison-deferred":"all-five-checked",document:c?{...(c.coursePending?{coursePendingId:c.coursePending.id,coursePendingRevision:c.coursePending.revision}:{}),...(c.entrantCard?{entrantCardId:c.entrantCard.id}:{}),scholarId:c.scholarId,scholarVersion:c.scholarVersion,academicYearId:c.academicYearId,semesterId:c.semesterId,schoolId:c.schoolId,courseId:c.courseId,academicVersion:c.academicVersion,definitionVersionId:c.definitionVersionId,...(c.coverageId?{coverageId:c.coverageId,semesterRevision:c.semesterRevision}:{}),...(c.predecessorSourceHash?{predecessorSourceHash:c.predecessorSourceHash}:{})}:null};
   pending.current={path:`requirement-instances/${instance.id}/${mode==="combined"?"receive-and-verify":mode}`,body:mode==="combined"?{receipt,verification}:mode==="receive"?receipt:verification,key:crypto.randomUUID()};
  }
  if(!pending.current)return;
  busy.current=true;setSaving(true);onBusy(true);setError("");
  let unknown=false;
  try{await request(pending.current.path,{body:pending.current.body,key:pending.current.key,csrf:session.csrfToken});pending.current=null;setUncertain(false);setChecked(false);onChanged();}
  catch(e){unknown=!(e instanceof ApiError)||e.status>=500;setUncertain(unknown);if(!unknown){pending.current=null;setChecked(false);setContext(null);setRefresh(n=>n+1);}setError(e instanceof Error?e.message:"Result unknown. Retry the same command.");}
  finally{busy.current=false;setSaving(false);onBusy(unknown);}
 }
 return <div className="quick-document-review">
  {context&&<p><strong>{context.humanId} — {context.scholarName}</strong><br/>Coverage: {context.yearCode} / {context.semesterCode}<br/>{context.schoolName} / {context.courseName}</p>}
  {instance.receipt&&<p>Received {instance.receipt.receivedOn} by {instance.receipt.receiverName}</p>}
  {contextError&&<div role="alert">{contextError} {missingYear&&onAcademicSetup&&<button type="button" className="btn btn-outline-secondary" onClick={()=>onAcademicSetup(missingYear)}>Add academic record</button>} <button type="button" className="btn btn-outline-secondary" disabled={uncertain} onClick={()=>{setChecked(false);setContext(null);setRefresh(n=>n+1);}}>Reload context</button></div>}
  <fieldset disabled={disabled||saving||uncertain}>
   {initial&&instance.coverage?.kind==="cor"&&<label>Enrollment document<select className="form-select" value={documentType} onChange={e=>{setDocumentType(e.target.value);setChecked(false);}}><option value="cor">Certificate of Registration (COR)</option><option value="certificate_of_enrollment">Certificate of Enrollment</option></select></label>}
   {canVerify&&context&&<><ul className="document-checks"><li>Belongs to this scholar.</li><li>{context.entrantCard?"Covers the approved latest completed school year and grading period.":"Covers the required academic year and semester."}</li><li>{context.coursePending?"School and known placement match; course comparison is deferred under the approved exception.":context.entrantCard?"Issuing school matches the reviewed senior-high-school evidence.":"School/course match the academic record."}</li><li>The pinned requirement policy applies.</li><li>Valid, complete and legible physical document.</li></ul><label className="d-block my-2"><input data-document-attestation data-document-id={instance.id} type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> {context.coursePending?"I checked identity, coverage, school, policy and validity; course comparison remains deferred under the approved exception.":"I checked all five items against this document."}</label></>}
   <details className="my-2"><summary>Additional details</summary><p>Routine dates use today in the Philippines. Enter a date only for historical recording.</p>   <div className="row g-2">
    {initial&&<label className="col-sm-6">Received date<input className="form-control" type="date" max={receivingToday()} value={receivedOn} onChange={e=>setReceivedOn(e.target.value)}/></label>}
    {canVerify&&<label className="col-sm-6">Decision date<input className="form-control" type="date" max={receivingToday()} value={effectiveOn} onChange={e=>setEffectiveOn(e.target.value)}/></label>}
   </div>
<label className="d-block">Reference<input className="form-control" maxLength={300} value={reference} onChange={e=>setReference(e.target.value)}/></label>{initial&&<label className="d-block">Storage location<input className="form-control" maxLength={300} value={storage} onChange={e=>setStorage(e.target.value)}/></label>}<label className="d-block">Notes<textarea className="form-control" maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)}/></label></details>
   <div className="d-flex gap-2 my-2">{canVerify&&(!initial||canReceive)&&<button type="button" className="btn configuration-primary" disabled={!checked||!context} onClick={()=>void send(initial?"combined":"verify")}>{saving?"Saving…":initial?"Receive and verify":"Verify document"}</button>}{allowReceiveOnly&&initial&&canReceive&&<button type="button" className="btn btn-outline-secondary" onClick={()=>void send("receive")}>Receive only</button>}</div>
  </fieldset>
  {error&&<p role="alert">{error}</p>}{uncertain&&<button type="button" className="btn configuration-primary" disabled={saving} onClick={()=>void send("retry")}>Retry the same action</button>}
 </div>;
}
