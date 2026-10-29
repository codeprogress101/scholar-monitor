import {useRef,useState} from "react";
import {ApiError,type Session} from "./auth-api";
import {configurationRequest as request} from "./configuration-api";
import {definitiveIndividualConflict} from './individual-command-conflicts';
import {definitiveOmissionConflict} from './omission-command-conflicts';
import {definitiveDocumentConflict} from './document-command-conflicts';
import {definitiveSettlementConflict} from './settlement-command-conflicts';
// These workflow writers consult the actor/key ledger before checking state.
// A committed exact retry returns its stored result; a fresh state conflict
// therefore confirms that this key did not commit. Other commands stay locked.
export function definitivePayrollReviewConflict(error:unknown,path:string){
 return error instanceof ApiError&&error.status===409&&error.code==="OVR_INVALID_STATE"&&/^ovr-batches\/[a-f0-9-]{36}\/(submit-review|finalize)$/.test(path);
}
// Window policy conflicts follow the durable ledger lookup. An exact committed
// retry returns its stored result before these checks; other failures stay locked.
export function definitiveCutoffConflict(error:unknown,path:string){
 return /^payout-cycles\/[a-f0-9-]{36}\/submission-windows\/(open-window|extend-window)$/.test(path)&&error instanceof ApiError&&error.status===409&&["CUTOFF_RULE_UNAVAILABLE","CUTOFF_AUTHORITY_CHANGED","CUTOFF_SOURCE_CHANGED"].includes(error.code);
}
// These rejections follow the Masterlist ledger lookup, so a missing result is definitive.
export function definitiveMasterlistConflict(error:unknown,path:string){return /^masterlists\/[a-f0-9-]{36}\//.test(path)&&error instanceof ApiError&&error.status===409&&["VERSION_CONFLICT","SELECTION_CHANGED","CONFLICT_SELECTION_CHANGED"].includes(error.code);}
export function masterlistResultUncertain(error:unknown,retrying:boolean){return !(error instanceof ApiError)||error.status>=500||(retrying&&!(error.status===409&&["VERSION_CONFLICT","SELECTION_CHANGED","CONFLICT_SELECTION_CHANGED"].includes(error.code)));}
export type PriorCommand={path:string;key:string;body:Record<string,unknown>;route:"scholars"|"payouts"|"individual-payments"|"masterlists"};
const commands=new Map<string,PriorCommand>();
export function retainPriorCommand(actor:string,command:PriorCommand|null){if(command)commands.set(actor,structuredClone(command));else commands.delete(actor);}
export const pendingPrior=(actor:string)=>{const c=commands.get(actor);return c?structuredClone(c):null;};
if(typeof window!=="undefined")window.addEventListener("beforeunload",event=>{if(commands.size){event.preventDefault();event.returnValue="";}});
export function usePriorCommand(session:Session,path:string){
 const [initial]=useState(()=>{const c=pendingPrior(session.user.id);return c?.path===path?c:null;});
 const pending=useRef<PriorCommand|null>(initial),running=useRef(false);
 const [uncertain,setUncertain]=useState(Boolean(initial)),[saving,setSaving]=useState(false),[error,setError]=useState("");
 async function run(body:Record<string,unknown>,route:PriorCommand["route"],retry=false){
  if(running.current||(!retry&&pending.current))return null;
  if(!retry&&commands.has(session.user.id)){setError("Resolve your retained approval command before starting another action.");return null;}
  if(!retry)pending.current={path,key:crypto.randomUUID(),body:structuredClone(body),route};
  const command=pending.current;if(!command)return null;
  commands.set(session.user.id,structuredClone(command));running.current=true;setSaving(true);setError("");
  try{const result=await request<Record<string,unknown>>(command.path,{body:command.body,key:command.key,csrf:session.csrfToken,signal:AbortSignal.timeout(300000)});pending.current=null;commands.delete(session.user.id);setUncertain(false);return result;}
  catch(e){const unresolved=!(e instanceof ApiError)||e.status>=500||(retry&&!(e.status===409&&["BATCH_SOURCE_CHANGED","VERSION_CONFLICT","SOURCE_CHANGED","PAYROLL_REVIEW_STALE","HISTORICAL_SETUP_REVIEW_REQUIRED","PRIOR_BATCH_APPROVAL_REQUIRED"].includes(e.code)));
   const stalePayment=definitiveCutoffConflict(e,command.path)||definitiveMasterlistConflict(e,command.path)||definitivePayrollReviewConflict(e,command.path)||definitiveIndividualConflict(e)||definitiveOmissionConflict(e,command.path)||definitiveDocumentConflict(e,command.path)||definitiveSettlementConflict(e,command.path)||(e instanceof ApiError && e.status===409 && ["PAYMENT_REVIEW_CHANGED","RECONCILIATION_CHANGED","DISCREPANCY_RESOLVED","DISCREPANCY_PAYMENT_CHANGED"].includes(e.code));
   setUncertain(unresolved&&!stalePayment);if(!unresolved||stalePayment){pending.current=null;commands.delete(session.user.id);}setError(e instanceof Error?e.message:"Could not confirm this command. Retry the same action.");return null;
  }finally{running.current=false;setSaving(false);}
 }
 return {initial,run,error,saving,uncertain,locked:saving||uncertain};
}
