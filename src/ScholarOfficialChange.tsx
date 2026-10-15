import {useEffect,useState} from "react";
import type {Session} from "./auth-api";
import {ApiError} from "./auth-api";
import type {Access} from "../server/authorization/policy";
import type {DraftDetail} from "../server/masterlists/model";
import {configurationRequest as request} from "./configuration-api";
import MasterlistWorkflow from "./MasterlistWorkflow";
import MasterlistAmendments from "./MasterlistAmendments";
export default function ScholarOfficialChange({masterlistId,scholarId,session,access,onSaved}:{masterlistId:string;scholarId:string;session:Session;access:Access;onSaved:()=>void}) {
  const [openInitialRequest,setOpenInitialRequest]=useState(true),[notice,setNotice]=useState("");
  const [selected,setSelected]=useState(masterlistId),[revision,setRevision]=useState(0),[detail,setDetail]=useState<DraftDetail|null>(null),[error,setError]=useState("");
  useEffect(()=>{const controller=new AbortController();request<DraftDetail>(`masterlists/${selected}`,{signal:controller.signal}).then(setDetail).catch(e=>{if(!controller.signal.aborted)setError(e instanceof ApiError?e.message:"Unable to load the official change workflow.");});return()=>controller.abort();},[selected,revision]);
  const refresh=()=>{setDetail(null);setError("");setRevision(n=>n+1);onSaved();};
  return <section aria-label="Scholar transfer or course shift" className="border rounded p-3 my-3"><h4>Record transfer / course shift</h4><p>This scholar is on an official masterlist. The correction follows its amendment workflow; earlier academic and payroll snapshots remain in history.</p>{notice && <p role="status" className="alert alert-success">{notice}</p>}{error && <p role="alert">{error}</p>}{!detail && !error && <p role="status">Loading official record...</p>}{detail && <>
    {!detail.entries.some(e=>e.scholarId===scholarId) ? <p>This version does not contain the scholar. Refresh the profile to review current membership.</p> : <>
      {detail.status!=="locked" && <><p>Complete the official publication and lock step below before requesting the amendment. This locks the masterlist, not the academic year. Only authorized actions are shown.</p><MasterlistWorkflow id={detail.id} version={detail.version} session={session} access={access} disabled={false} validation={detail.validation} onChanged={refresh}/></>}
      {["published","locked"].includes(detail.status) && <MasterlistAmendments key={`${detail.id}-${detail.version}`} detail={detail} session={session} access={access} initialScholarId={scholarId} openInitialRequest={openInitialRequest} onSaved={onSaved} onPublished={id=>{setOpenInitialRequest(false);setNotice("Academic change published. The updated official version is shown below.");setSelected(id);setDetail(null);setError("");}} onOpen={id=>{setOpenInitialRequest(false);setNotice("");setSelected(id);setDetail(null);setError("");setRevision(n=>n+1);}}/>}
    </>}
  </>}</section>;
}
