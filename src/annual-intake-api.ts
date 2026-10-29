import {useEffect,useRef,useState} from "react";
import {ApiError,type Session} from "./auth-api";
import {configurationRequest} from "./configuration-api";
import {pendingPrior,retainPriorCommand,type PriorCommand} from "./prior-command";
export const annualPath=(path:string)=>path==="scholar-registrations"||/^scholar-intakes\/[a-f0-9-]{36}\/(supplements|classification-corrections|supplied-text\/(completions|corrections))$/.test(path);
const storage=(actor:string)=>`ldss-annual-intake-command:${actor}`;
type Saved={command:PriorCommand;location:string};
export function restoreAnnualCommand(actor:string):Saved|null {
 try {const raw=sessionStorage.getItem(storage(actor));if(!raw)return null;const v=JSON.parse(raw) as Saved;
  if(!v?.command||!annualPath(v.command.path)||v.command.route!=="scholars"||!v.command.key||!v.command.body||typeof v.location!=="string")return null;
  const pending=pendingPrior(actor);if(pending&&(pending.path!==v.command.path||pending.key!==v.command.key))return null;
  retainPriorCommand(actor,v.command);return v;
 }catch{return null;}
}
export function useAnnualCommand(session:Session,path:string) {
 const [saved]=useState(()=>restoreAnnualCommand(session.user.id));
 const command=useRef<PriorCommand|null>(saved?.command.path===path?saved.command:null);
 const [uncertain,setUncertain]=useState(saved?.command.path===path),[saving,setSaving]=useState(false),[error,setError]=useState<string|ApiError>("");
 const [storageIssue,setStorageIssue]=useState(false),busy=useRef(false);
 const [pendingLocation,setPendingLocation]=useState(saved?.location??window.location.hash);
 const foreign=pendingPrior(session.user.id);const blocked=Boolean(foreign&&foreign.path!==path);
 const locked=saving||uncertain||blocked;
 useEffect(()=>{const prevent=(e:BeforeUnloadEvent)=>{if(locked){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",prevent);return()=>window.removeEventListener("beforeunload",prevent);},[locked]);
 async function run<T>(body:Record<string,unknown>,retry=false):Promise<T|null> {
  if(busy.current||(!retry&&(command.current||pendingPrior(session.user.id))))return null;
  if(!retry){command.current={path,key:crypto.randomUUID(),body:structuredClone(body),route:"scholars"};setPendingLocation(window.location.hash);}
  const current=command.current;if(!current||current.path!==path)return null;
  retainPriorCommand(session.user.id,current);busy.current=true;setSaving(true);setError("");
  try {sessionStorage.setItem(storage(session.user.id),JSON.stringify({command:current,location:retry?pendingLocation:window.location.hash}));}catch{setStorageIssue(true);}
  try {
   const result=await configurationRequest<T>(current.path,{body:current.body,key:current.key,csrf:session.csrfToken,signal:AbortSignal.timeout(300000)});
   clear();return result;
  }catch(e){const definite=e instanceof ApiError&&e.status<500&&(!retry||e.status===409&&["VERSION_CONFLICT","SOURCE_CHANGED","ANNUAL_INTAKE_EXISTS","ANNUAL_CLASSIFICATION_REVIEW_REQUIRED","INITIAL_DETAILS_PROTECTED","ANNUAL_INTAKE_NO_CHANGE","ANNUAL_YEAR_UNAVAILABLE","INTAKE_TEXT_NO_CHANGE"].includes(e.code));
   if(definite&&!(e instanceof ApiError&&["IDEMPOTENCY_CONFLICT","ANNUAL_INTAKE_INTEGRITY","INTAKE_TEXT_INTEGRITY"].includes(e.code)))clear();else setUncertain(true);
   setError(e instanceof ApiError?e:"The annual registration response was not confirmed. Retry the saved request; do not create another record.");return null;
  }finally{busy.current=false;setSaving(false);}
 }
 function clear(){command.current=null;retainPriorCommand(session.user.id,null);setUncertain(false);try{sessionStorage.removeItem(storage(session.user.id));setStorageIssue(false);}catch{setStorageIssue(true);}}
 return {run,locked,uncertain,saving,error,storageIssue,pendingLocation,initialBody:saved?.command.path===path?saved.command.body:null};
}
