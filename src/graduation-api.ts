import {useRef,useState,useEffect} from 'react';
import {ApiError,type Session} from './auth-api';
import {configurationRequest} from './configuration-api';
import {pendingPrior,retainPriorCommand,type PriorCommand} from './prior-command';
const namespace=(actor:string)=>'ldss-graduation-command:'+actor;
const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
export const graduationCommandPath=(path:string)=>new RegExp(`^(program-duration-references|graduation-monitoring-cases)(/${uuid}/events)?$`,'i').test(path);
type Saved={command:PriorCommand;location:string};
export function restoreGraduationCommand(actor:string):Saved|null {try{const raw=sessionStorage.getItem(namespace(actor));if(!raw)return null;const s=JSON.parse(raw) as Saved;if(!s.command||!graduationCommandPath(s.command.path)||s.command.route!=='scholars'||!/^[0-9a-f-]{36}$/.test(s.command.key)||!s.command.body||typeof s.location!=='string')return null;const p=pendingPrior(actor);if(p&&(p.path!==s.command.path||p.key!==s.command.key))return null;retainPriorCommand(actor,s.command);return s;}catch{return null;}}
export function useGraduationCommand(session:Session){
 const [saved]=useState(()=>restoreGraduationCommand(session.user.id)),command=useRef(saved?.command??null),busy=useRef(false);
 const [saving,setSaving]=useState(false),[uncertain,setUncertain]=useState(Boolean(saved)),[error,setError]=useState(''),[storageIssue,setStorageIssue]=useState(false);
 const locked=saving||uncertain||Boolean(pendingPrior(session.user.id));
 useEffect(()=>{if(!locked)return;const handler=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[locked]);
 async function run<T>(path:string,body:Record<string,unknown>,retry=false):Promise<T|null>{
  if(busy.current||!graduationCommandPath(path)||!retry&&(command.current||pendingPrior(session.user.id)))return null;
  if(!retry)command.current={path,key:crypto.randomUUID(),body:structuredClone(body),route:'scholars'};
  const current=command.current;if(!current)return null;
  retainPriorCommand(session.user.id,current);busy.current=true;setSaving(true);setError('');
  try{sessionStorage.setItem(namespace(session.user.id),JSON.stringify({command:current,location:saved?.location??window.location.hash}));}catch{setStorageIssue(true);}
  const clear=()=>{command.current=null;retainPriorCommand(session.user.id,null);setUncertain(false);try{sessionStorage.removeItem(namespace(session.user.id));}catch{setStorageIssue(true);}};
  try{const result=await configurationRequest<T>(current.path,{body:current.body,key:current.key,csrf:session.csrfToken,signal:AbortSignal.timeout(300000)});clear();return result;}
  catch(e){const sourceConflict=e instanceof ApiError&&e.status===409&&!['IDEMPOTENCY_CONFLICT','GRADUATION_HISTORY_INTEGRITY'].includes(e.code);if(e instanceof ApiError&&e.status<500&&(!retry||sourceConflict)&&!['IDEMPOTENCY_CONFLICT','GRADUATION_HISTORY_INTEGRITY'].includes(e.code))clear();else setUncertain(true);setError(e instanceof Error?e.message:'Response was not confirmed. Retry the saved request.');return null;}
  finally{busy.current=false;setSaving(false);}
 }
 return {run,locked,saving,uncertain,error,storageIssue,initial:saved,async retry<T>(){return command.current?run<T>(command.current.path,command.current.body,true):null;}};
}
