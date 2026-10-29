import {useEffect,useState} from 'react';
import type {Session} from './auth-api';
import type {SubmissionWindowView} from '../server/payouts/submission-service';
import type {HistoricalAppendService} from '../server/payouts/historical-append';
import {configurationRequest as request} from './configuration-api';
import {usePriorCommand} from './prior-command';
import FocusedDialog from './FocusedDialog';
import {receivingToday} from './receiving-selection';
type Preview=Awaited<ReturnType<HistoricalAppendService['preview']>>;
export default function HistoricalPayrollAppend({data,session,onClose,onChanged}:{data:SubmissionWindowView;session:Session;onClose:()=>void;onChanged:()=>void}){
 const path=`payout-cycles/${data.cycle.id}/historical-append`,job=usePriorCommand(session,path);
 const [imports,setImports]=useState<{id:string;fileName:string}[]>([]),[importId,setImport]=useState(String(job.initial?.body.importId??'')),[preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[notice,setNotice]=useState('');
 const [opens,setOpens]=useState(String(job.initial?.body.opensOn??'')),[deadline,setDeadline]=useState(String(job.initial?.body.deadlineOn??'')),[release,setRelease]=useState(String(job.initial?.body.reportedReleaseOn??'')),[reference,setReference]=useState(String(job.initial?.body.reference??'')),[location,setLocation]=useState(String(job.initial?.body.sourceLocation??'')),[reason,setReason]=useState(String(job.initial?.body.reason??'')),[reviewed,setReviewed]=useState(false);
 useEffect(()=>{const c=new AbortController();request<{items:typeof imports}>('document-batches',{signal:c.signal}).then(r=>{if(!c.signal.aborted)setImports(r.items);}).catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'Could not read imports.');});return()=>c.abort();},[]);
 useEffect(()=>{if(!importId)return;const c=new AbortController();request<Preview>(`payout-cycles/${data.cycle.id}/historical-append-preview?${new URLSearchParams({importId})}`,{signal:c.signal}).then(r=>{if(!c.signal.aborted){setPreview(r);setLoading(false);}}).catch(e=>{if(!c.signal.aborted){setLoading(false);setError(e instanceof Error?e.message:'Could not review this source.');}});return()=>c.abort();},[importId,data.cycle.id]);
 const ready=!!preview&&preview.importId===importId&&!loading&&opens&&deadline&&release&&reference.trim().length>=3&&location.trim().length>=3&&reason.trim().length>=5&&reviewed&&!job.locked;
 async function save(retry=false){if(!retry&&!ready)return;const result=await job.run({expectedCycleVersion:data.cycle.version,expectedSemesterVersion:data.period.semesterVersion,expectedYearVersion:data.period.yearVersion,expectedHistoricalRevision:data.historicalRevision,expectedSequence:Math.max(...data.windows.map(w=>w.batchNumber)),expectedScopeHash:preview?.scopeHash,importId,opensOn:opens,deadlineOn:deadline,reportedReleaseOn:release,reference,sourceLocation:location,reason,reviewed},'payouts',retry);if(result){setNotice(`Additional historical Draft saved for ${result.scholarCount} scholars. Review and finalize it separately; no payments were recorded.`);setReviewed(false);onChanged();}}
 return <FocusedDialog title="Add a previously processed historical payroll" busy={job.locked} onClose={onClose}>
  <p>The original payroll stays unchanged. This new payroll needs its own confirmed import, current prior review, approved annual membership and supported historical dates.</p>
  {(error||job.error)&&<p role="alert" className="alert alert-danger">{error||job.error}</p>}{notice&&<p role="status">{notice}</p>}
  {job.uncertain&&<div role="alert"><p>Result unconfirmed. Retry the retained action with the same evidence and key.</p><button type="button" disabled={job.saving} onClick={()=>void save(true)}>Retry the same action</button></div>}
  <fieldset disabled={job.locked||!!notice}>
   <label className="d-block my-2">Separately confirmed historical import<select className="form-select" value={importId} onChange={e=>{setImport(e.target.value);setPreview(null);setReviewed(false);setError('');setLoading(!!e.target.value);}}><option value="">Choose import</option>{imports.filter(i=>!data.historicalBatches.some(h=>h.importId===i.id)).map(i=><option key={i.id} value={i.id}>{i.fileName}</option>)}</select></label>
   {loading&&<p role="status">Checking prior review and annual membership…</p>}
   {preview&&preview.importId===importId&&<div><p>{preview.members.length} scholars covered by current prior document, academic and annual membership evidence. Approved submission cutoff: {preview.deadlines[0]}.</p><p>Accepted prior review: {[...new Set(preview.reviews.map(r=>r.reference))].join('; ')}. No unresolved exceptions in this reviewed scope.</p></div>}
   <label className="d-block my-2">Supported historical opening date<input className="form-control" type="date" min={data.period.startsOn} max={receivingToday()} value={opens} onChange={e=>{setOpens(e.target.value);setReviewed(false);}}/></label>
   <label className="d-block my-2">Supported historical submission cutoff<input className="form-control" type="date" min={opens||data.period.startsOn} max={receivingToday()} value={deadline} onChange={e=>{setDeadline(e.target.value);setReviewed(false);}}/></label>
   <label className="d-block my-2">Supported reported batch release date (not individual payment)<input className="form-control" type="date" min={deadline||data.period.startsOn} max={receivingToday()} value={release} onChange={e=>{setRelease(e.target.value);setReviewed(false);}}/></label>
   <label className="d-block my-2">Authority / batch approval reference<input className="form-control" maxLength={300} value={reference} onChange={e=>{setReference(e.target.value);setReviewed(false);}}/></label>
   <label className="d-block my-2">Supporting evidence / location<input className="form-control" maxLength={500} value={location} onChange={e=>{setLocation(e.target.value);setReviewed(false);}}/></label>
   <label className="d-block my-2">Reason<textarea className="form-control" maxLength={500} value={reason} onChange={e=>{setReason(e.target.value);setReviewed(false);}}/></label>
   <label className="d-block my-3"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I reviewed this import’s source scope, prior approvals, official annual membership and supported historical dates. This creates a separate Draft and records no payments.</label>
   <button type="button" className="btn configuration-primary" disabled={!ready} onClick={()=>void save()}>Create additional historical Draft</button>
  </fieldset>
 </FocusedDialog>;
}
