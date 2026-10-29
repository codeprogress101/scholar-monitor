import {useEffect,useState} from "react";
import type {Session} from "./auth-api";
import type {SubmissionWindowView} from "../server/payouts/submission-service";
import {configurationRequest as request} from "./configuration-api";
import FocusedDialog from "./FocusedDialog";
import {pendingPrior,usePriorCommand} from "./prior-command";
import {receivingToday} from "./receiving-selection";
import HistoricalPayrollAppend from './HistoricalPayrollAppend';
export default function HistoricalPayrollSetup({cycleId,session,onChanged}:{cycleId:string;session:Session;onChanged:()=>void}){
 const path=`payout-cycles/${cycleId}/historical-setup`;
 const [open,setOpen]=useState(()=>[path,`payout-cycles/${cycleId}/historical-append`].includes(pendingPrior(session.user.id)?.path??''));
 return <><button className="btn btn-outline-secondary my-2" onClick={()=>setOpen(true)}>Set up previously approved payroll batch</button>{open&&<HistoricalSetupDialog cycleId={cycleId} session={session} onClose={()=>setOpen(false)} onChanged={onChanged}/>}</>;
}
function HistoricalSetupDialog({cycleId,session,onClose,onChanged}:{cycleId:string;session:Session;onClose:()=>void;onChanged:()=>void}){
 const job=usePriorCommand(session,`payout-cycles/${cycleId}/historical-setup`);
 const [data,setData]=useState<SubmissionWindowView|null>(null),[imports,setImports]=useState<{id:string;fileName:string}[]>([]);
 const [importId,setImport]=useState(String(job.initial?.body.importId??"")),[deadline,setDeadline]=useState(String(job.initial?.body.deadlineOn??"")),[release,setRelease]=useState(String(job.initial?.body.reportedReleaseOn??"")),[reference,setReference]=useState(String(job.initial?.body.reference??"")),[location,setLocation]=useState(String(job.initial?.body.sourceLocation??"")),[reason,setReason]=useState(String(job.initial?.body.reason??"")),[reviewed,setReviewed]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{const abort=new AbortController();Promise.all([request<SubmissionWindowView>(`payout-cycles/${cycleId}/submission-windows`,{signal:abort.signal}),request<{items:typeof imports}>("document-batches",{signal:abort.signal})]).then(([v,i])=>{if(!abort.signal.aborted){setData(v);setImports(i.items);}}).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:"Could not load payroll setup.");});return()=>abort.abort();},[cycleId]);
 const ready=data&&!data.termNumber&&data.legacyBatchesWithUnknownDeadline===0&&!data.ambiguous&&!data.mappingStale&&importId&&deadline&&release&&reference.trim().length>=3&&location.trim().length>=3&&reason.trim().length>=5&&reviewed&&!job.locked;
 async function save(retry=false){if(!retry&&!ready)return;const result=await job.run({expectedCycleVersion:data?.cycle.version,expectedSemesterVersion:data?.period.semesterVersion,expectedYearVersion:data?.period.yearVersion,importId,deadlineOn:deadline,reportedReleaseOn:release,reference,sourceLocation:location,reason,reviewed},"payouts",retry);if(result){setNotice("Historical setup and Draft batch saved. Open the payout cycle explicitly, then review/finalize the payroll. No individual payments were recorded.");setReviewed(false);setData(null);onChanged();}}
 if(data?.termNumber&&data.historical&&data.historicalAppendEnabled)return <HistoricalPayrollAppend data={data} session={session} onClose={onClose} onChanged={onChanged}/>;
 return <FocusedDialog title="Set up previously approved payroll batch" busy={job.locked} onClose={onClose}>
  <p>Record the actual historical submission deadline and reported batch release. The planned payout target and all recorded receipt/payment dates stay unchanged.</p>
  {(error||job.error)&&<p role="alert" className="alert alert-danger">{error||job.error}</p>}{notice&&<p role="status" className="alert alert-success">{notice}</p>}
  {job.uncertain&&<div role="alert" className="alert alert-warning"><p>Result not confirmed. Exact payload and retry key retained; resolve this request before leaving.</p><button disabled={job.saving} className="btn configuration-primary" onClick={()=>void save(true)}>Retry the same action</button></div>}
  <fieldset disabled={job.locked||!data}>
   {data&&<p>{data.cycle.name}. State: {data.cycle.state}. Planned target: {data.cycle.targetDate}.</p>}
   {data?.termNumber&&<p role="alert">This cycle already has a regular mapping. Its existing configuration will not be replaced.</p>}
   <label className="d-block my-2">Import with recorded prior batch approval<select className="form-select" value={importId} onChange={e=>{setImport(e.target.value);setReviewed(false);}}><option value="">Choose approved import</option>{imports.map(i=><option key={i.id} value={i.id}>{i.fileName}</option>)}</select></label>
   <label className="d-block my-2">Approved historical submission deadline<input type="date" className="form-control" min={data?.period.startsOn} max={receivingToday()} value={deadline} onChange={e=>{setDeadline(e.target.value);setReviewed(false);}}/></label>
   <label className="d-block my-2">Reported batch release date (not individual payment)<input type="date" className="form-control" min={deadline||data?.period.startsOn} max={receivingToday()} value={release} onChange={e=>{setRelease(e.target.value);setReviewed(false);}}/></label>
   <label className="d-block my-2">Authority / batch approval reference<input className="form-control" maxLength={300} value={reference} onChange={e=>{setReference(e.target.value);setReviewed(false);}}/></label>
   <label className="d-block my-2">Supporting source / location<input className="form-control" maxLength={500} value={location} onChange={e=>{setLocation(e.target.value);setReviewed(false);}}/></label>
   <label className="d-block my-2">Reason<textarea className="form-control" maxLength={500} value={reason} onChange={e=>{setReason(e.target.value);setReviewed(false);}}/></label>
   <label className="d-block my-3"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I reviewed this import's prior approval, regular semester, historical deadline and reported release. This creates a Draft payroll batch and does not record claims or open the cycle.</label>
   <button type="button" className="btn configuration-primary" disabled={!ready} onClick={()=>void save()}>Save historical payroll setup</button>
  </fieldset>
 </FocusedDialog>;
}
