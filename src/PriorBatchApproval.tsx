import {useEffect,useState} from "react";
import type {Session} from "./auth-api";
import type {PriorBatchPreview} from "../server/requirements/prior-approval-service";
import {configurationRequest as request} from "./configuration-api";
import FocusedDialog from "./FocusedDialog";
import {usePriorCommand} from "./prior-command";
import {receivingToday} from "./receiving-selection";
import {scholarAddress} from "./scholar-navigation";
export default function PriorBatchApproval({session,semesters,initialSemester,onClose,onChanged}:{session:Session;semesters:{id:string;name:string}[];initialSemester:string;onClose:()=>void;onChanged:()=>void}){
 const job=usePriorCommand(session,"document-batches/prior-approval");
 const [imports,setImports]=useState<{id:string;fileName:string;scholarCount:number}[]>([]),[importId,setImport]=useState(String(job.initial?.body.importId??"")),[semesterId,setSemester]=useState(String(job.initial?.body.semesterId??initialSemester));
 const [data,setData]=useState<PriorBatchPreview|null>(null),[selected,setSelected]=useState<string[]>([]),[error,setError]=useState(""),[notice,setNotice]=useState(""),[reload,setReload]=useState(0),[loading,setLoading]=useState(false),[offset,setOffset]=useState(0);
 const [reference,setReference]=useState(String(job.initial?.body.reference??"")),[location,setLocation]=useState(String(job.initial?.body.sourceLocation??"")),[reason,setReason]=useState(String(job.initial?.body.reason??"")),[approvalOn,setApproval]=useState(String(job.initial?.body.approvalOn??"")),[deadlineOn,setDeadline]=useState(String(job.initial?.body.deadlineOn??""));
 const [documents,setDocuments]=useState(false),[academic,setAcademic]=useState(false),[timing,setTiming]=useState(false),[waivers,setWaivers]=useState(false);
 const reset=()=>{setDocuments(false);setAcademic(false);setTiming(false);setWaivers(false);};
 useEffect(()=>{const abort=new AbortController();request<{items:typeof imports}>("document-batches",{signal:abort.signal}).then(v=>setImports(v.items)).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:"Could not load imports.");});return()=>abort.abort();},[]);
 useEffect(()=>{if(!importId||!semesterId||job.uncertain)return;const abort=new AbortController();
  request<PriorBatchPreview>(`document-batches/prior-approval-preview?${new URLSearchParams({importId,semesterId})}`,{signal:abort.signal}).then(v=>{if(!abort.signal.aborted){setData(v);setLoading(false);}}).catch(e=>{if(!abort.signal.aborted){setError(e instanceof Error?e.message:"Could not load prior approval preview.");setLoading(false);}});return()=>abort.abort();
 },[importId,semesterId,reload,job.uncertain]);
 const change=()=>{reset();setSelected([]);setData(null);setOffset(0);setLoading(true);setError("");};
 const members=data?.members??[],ready=members.filter(m=>!m.issues.length&&!m.approval?.valid),chosen=members.filter(m=>selected.includes(m.id)),waiverCount=chosen.reduce((n,m)=>n+m.waiverCount,0);
 const canSave=chosen.length>0&&documents&&academic&&timing&&(!waiverCount||waivers)&&reference.trim().length>=3&&location.trim().length>=3&&reason.trim().length>=5&&Boolean(deadlineOn)&&!job.locked;
 async function save(retry=false){if(!retry&&(!canSave||!data))return;const result=await job.run({importId,semesterId,scopeHash:data?.scopeHash,items:chosen.map(m=>({id:m.id,sourceHash:m.sourceHash})),approvalOn:approvalOn||null,deadlineOn,reference,sourceLocation:location,reason,documentsPreviouslyVerified:documents,academicEligibilityPreviouslyApproved:academic,deadlineCompliancePreviouslyApproved:timing,correctMistakenWaivers:waivers},"scholars",retry);if(result){setNotice(`${result.scholarCount} scholars: prior document and academic approval recorded. ${result.correctedWaivers} mistaken waivers corrected with history retained. No payments recorded.`);reset();setSelected([]);setData(null);setReload(n=>n+1);onChanged();}}
 return <FocusedDialog title="Record prior batch approval" busy={job.locked} onClose={onClose} className="batch-document-dialog">
  <p>Record a document and academic review already completed outside LDSS. No grades, historical courses or receipt dates will be invented. Individual payment remains separate.</p>
  {(error||job.error)&&<p role="alert" className="alert alert-danger">{error||job.error}</p>}{notice&&<p role="status" className="alert alert-success">{notice}</p>}
  {job.uncertain&&<div role="alert" className="alert alert-warning"><p>Result not confirmed. The exact payload and retry key are retained. Resolve this request before leaving.</p><button className="btn configuration-primary" disabled={job.saving} onClick={()=>void save(true)}>Retry the same action</button></div>}
  <fieldset disabled={job.locked}>
   <label className="d-block my-2">Confirmed Already-approved import<select className="form-select" value={importId} onChange={e=>{change();setImport(e.target.value);}}><option value="">Choose import</option>{imports.map(i=><option key={i.id} value={i.id}>{i.fileName} / {i.scholarCount} scholars</option>)}</select></label>
   <label className="d-block my-2">Receiving semester<select className="form-select" value={semesterId} onChange={e=>{change();setSemester(e.target.value);}}><option value="">Choose semester</option>{semesters.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   {loading&&importId&&semesterId&&<p role="status">Checking the batch's authoritative sources...</p>}
   {data&&<><p>{data.scholarCount} scholars; {ready.length} ready; {members.filter(m=>m.issues.length).length} blocked; {members.filter(m=>m.approval?.valid).length} already approved.</p>
    <button type="button" className="btn btn-outline-secondary" disabled={!ready.length} onClick={()=>{setSelected(ready.map(m=>m.id));reset();}}>Select all ready scholars ({ready.length})</button>{" "}<button type="button" className="btn btn-outline-secondary" onClick={()=>{setSelected([]);reset();}}>Clear selection</button><p>{chosen.length} selected; {waiverCount} recorded waivers require explicit correction.</p>
    <div className="table-responsive batch-document-table"><table className="table"><thead><tr><th>Select / scholar</th><th>Documents / coverage</th><th>Review</th></tr></thead><tbody>{members.slice(offset,offset+25).map(m=><tr key={m.id}><td><label><input type="checkbox" disabled={Boolean(m.issues.length||m.approval?.valid)} checked={selected.includes(m.id)} onChange={e=>{setSelected(old=>e.target.checked?[...old,m.id]:old.filter(id=>id!==m.id));reset();}}/> {m.humanId}<br/>{m.name}</label></td><td>{m.documents.map(d=><p key={d.id}>{d.kind.toUpperCase()}: {d.coverage}<br/>{d.status}</p>)}{m.coursePending&&<span>Course pending remains recorded</span>}</td><td>{m.issues.join(" ")||(m.approval?.valid?"Prior batch approval current":"Ready to record existing approval")}{m.issues.length>0&&<p><a href={scholarAddress(m.scholarId,"requirements")} onClick={onClose}>Review scholar</a></p>}</td></tr>)}</tbody></table></div>
    <div className="d-flex gap-2 my-2"><button type="button" className="btn btn-outline-secondary" disabled={!offset} onClick={()=>setOffset(n=>Math.max(0,n-25))}>Previous</button><span>{offset+1}-{Math.min(offset+25,members.length)} of {members.length}</span><button type="button" className="btn btn-outline-secondary" disabled={offset+25>=members.length} onClick={()=>setOffset(n=>n+25)}>Next</button></div>
   </>}
   <label className="d-block my-2">Approval reference<input className="form-control" value={reference} maxLength={300} onChange={e=>{setReference(e.target.value);reset();}}/></label>
   <label className="d-block my-2">Supporting approval source / location<input className="form-control" value={location} maxLength={500} onChange={e=>{setLocation(e.target.value);reset();}}/></label>
   <label className="d-block my-2">Historical approval date (leave empty if not recorded)<input className="form-control" type="date" max={receivingToday()} value={approvalOn} onChange={e=>{setApproval(e.target.value);reset();}}/></label>
   <label className="d-block my-2">Approved submission deadline<input className="form-control" type="date" max={receivingToday()} value={deadlineOn} onChange={e=>{setDeadline(e.target.value);reset();}}/></label>
   <label className="d-block my-2">Reason<textarea className="form-control" maxLength={500} value={reason} onChange={e=>{setReason(e.target.value);reset();}}/></label>
   <label className="d-block my-3"><input type="checkbox" checked={documents} onChange={e=>setDocuments(e.target.checked)}/> The applicable documents for every selected scholar were previously verified for identity, coverage, placement, policy and validity under the referenced batch review.</label>
   <label className="d-block my-3"><input type="checkbox" checked={academic} onChange={e=>setAcademic(e.target.checked)}/> Academic eligibility for the degree stipend, including grades, enrollment and required load, was previously approved for every selected scholar.</label>
   <label className="d-block my-3"><input type="checkbox" checked={timing} onChange={e=>setTiming(e.target.checked)}/> The referenced prior review confirms every selected scholar met the approved document submission deadline. LDSS receipt dates remain unchanged.</label>
   {waiverCount>0&&<label className="d-block my-3"><input type="checkbox" checked={waivers} onChange={e=>setWaivers(e.target.checked)}/> These {waiverCount} waivers were entered by mistake for documents already submitted and verified. Record their correction and retain their original history.</label>}
   <button type="button" className="btn configuration-primary" disabled={!canSave||loading} onClick={()=>void save()}>Record prior approval for {chosen.length} scholars</button>
  </fieldset>
 </FocusedDialog>;
}
