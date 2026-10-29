import type {Session} from "./auth-api";
import FocusedDialog from "./FocusedDialog";
import {usePriorCommand} from "./prior-command";
export default function PayoutCommandRecovery({session,path,onResolved,workspace="payouts"}:{session:Session;path:string;onResolved:()=>void;workspace?:"payouts"|"masterlists"}){
 const job=usePriorCommand(session,path);
 const refresh=!job.uncertain&&!job.saving&&Boolean(job.error);
 async function retry(){if(await job.run({},workspace,true))onResolved();}
 return <FocusedDialog progress={refresh?undefined:{operation:workspace==="masterlists"?"Confirming saved Masterlist action":"Confirming saved payroll action",identity:`Command: ${path}`,pending:job.saving,uncertain:job.uncertain,error:job.error,retry:()=>void retry()}} title={workspace==="masterlists"?"Resolve Masterlist command":"Resolve payroll command"} busy={!refresh} onClose={()=>{if(refresh)onResolved();}}><p>{refresh?`The current ${workspace==="masterlists"?"Masterlist":"payroll"} state rejected this uncommitted command. Refresh before starting another action.`:"The result is not confirmed. The original command, payload and retry key are retained. Resolve it before replacing it or leaving this workspace."}</p>{job.error&&<p role="alert" className="alert alert-danger">{job.error}</p>}<button className="btn configuration-primary" disabled={job.saving} onClick={()=>refresh?onResolved():void retry()}>{refresh?workspace==="masterlists"?"Refresh Masterlist":"Refresh payroll":"Retry the same action"}</button></FocusedDialog>;
}
