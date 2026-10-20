import type {Session} from "./auth-api";
import FocusedDialog from "./FocusedDialog";
import {usePriorCommand} from "./prior-command";
export default function PayoutCommandRecovery({session,path,onResolved}:{session:Session;path:string;onResolved:()=>void}){
 const job=usePriorCommand(session,path);
 async function retry(){if(await job.run({},"payouts",true))onResolved();}
 return <FocusedDialog title="Resolve payroll command" busy onClose={()=>{}}><p>The result is not confirmed. The original command, payload and retry key are retained. Resolve it before replacing it or leaving this workspace.</p>{job.error&&<p role="alert" className="alert alert-danger">{job.error}</p>}<button className="btn configuration-primary" disabled={job.saving} onClick={()=>void retry()}>Retry the same action</button></FocusedDialog>;
}
