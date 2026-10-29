import {windowTiming, windowCutoffReached} from "../server/payouts/cutoff-policy";
import {createContext} from "react";
import type {SubmissionWindowView} from "../server/payouts/submission-service";

export const PayrollTimingContext=createContext<{data:SubmissionWindowView|null;loading:boolean;unavailable:boolean}>({data:null,loading:false,unavailable:true});
export const payrollStages=["draft","review","finalized","submitted","processed"] as const;
export function payrollSteps(state:string){
  const index=payrollStages.indexOf(state as typeof payrollStages[number]);
  if(index<0&&state!=="closed")return null;
  return payrollStages.map((stage,i)=>({stage,label:stage[0].toUpperCase()+stage.slice(1),status:state==="closed"||i<index?"Completed":i===index?"Current":"Pending"}));
}
const instant=(value:string|undefined)=>value&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
export function manilaTime(value:string|undefined,delta=0){
  const ms=instant(value);if(ms===null)return null;
  return new Intl.DateTimeFormat("en-PH",{timeZone:"Asia/Manila",year:"numeric",month:"long",day:"numeric",hour:"numeric",minute:"2-digit",...(delta?{second:"2-digit"}:{}),hour12:true}).format(new Date(ms+delta));
}
function manilaMicroTime(value:string){
  const text=new Intl.DateTimeFormat("en-PH",{timeZone:"Asia/Manila",year:"numeric",month:"long",day:"numeric",hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true}).format(new Date(value));
  return text.replace(/ (AM|PM)$/,`.${value.split(".")[1].slice(0,6)} $1`);
}
export function payrollTiming(data:SubmissionWindowView|null,batchId:string,cycleId:string){
  if(!data||data.cycle.id!==cycleId||data.timeZone!=="Asia/Manila")return null;
  const matches=data.windows.filter(w=>w.batchId===batchId);
  if(matches.length!==1)return null;
  const w=matches[0],policy=w.cutoffPolicy??"whole_day_v1";
  if(policy!=="whole_day_v1"&&policy!=="manila_1700_v1"&&policy!=="manila_time_v1")return null;
  try {
    const expected=windowTiming(w.cutoffOn,policy,w.cutoffLocalTime??undefined);
    if(w.cutoffExclusiveUtc!==expected.cutoffExclusiveUtc)return null;
    if(policy!=="whole_day_v1"&&(w.cutoffAtUtc!==expected.cutoffAtUtc||w.finalizationFromUtc!==expected.finalizationFromUtc))return null;
    const latest=data.deadlines.reduce<typeof data.deadlines[number]|null>((a,d)=>!a||d.revision>a.revision?d:a,null);
    const cutoff=policy==="whole_day_v1"?manilaTime(w.cutoffExclusiveUtc,-1000)!:manilaTime(expected.cutoffAtUtc)!;
    const normalFinalization=policy==="whole_day_v1"?manilaTime(w.cutoffExclusiveUtc)!:manilaMicroTime(expected.finalizationFromUtc);
    return {cutoff,normalFinalization,finalDeadline:latest?manilaTime(latest.cutoffExclusiveUtc,-1000):null,cutoffReached:windowCutoffReached(w.cutoffOn,policy,data.asOf,w.cutoffLocalTime??undefined),asOf:manilaTime(data.asOf)};
  }catch{return null;}
}
export function payoutTarget(day:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+"T00:00:00Z"))||new Date(day+"T00:00:00Z").toISOString().slice(0,10)!==day)return null;
  return new Intl.DateTimeFormat("en-PH",{timeZone:"Asia/Manila",year:"numeric",month:"long",day:"numeric"}).format(new Date(day+"T00:00:00+08:00"));
}
export function payrollNextAction(state:string,permissions:string[],available:boolean,cutoffReached:boolean|null,normalFinalization:string|null,blocker?:{code:string;message:string}|null){
  if(!available)return "Payroll period unavailable. Review the existing period restrictions.";
  if(state==="draft")return permissions.includes("ovr.prepare")?blocker?.message??"Submit for Coordinator Review after current roster checks.":"Awaiting authorized payroll preparation.";
  if(state==="review"){
    const role=permissions.includes("ovr.finalize")?"Finalize Payroll":"Awaiting Coordinator finalization";
    if(cutoffReached===false&&normalFinalization)return `${role} — available from ${normalFinalization}.`;
    return `${role}. ${blocker?.code!=="CUTOFF_NOT_REACHED"&&blocker?.message?blocker.message:cutoffReached===null?"Cutoff availability is unconfirmed; load current roster checks.":"Current source and roster checks are required."}`;
  }
  if(state==="finalized")return permissions.includes("ovr.submit")?"Submit Official Payroll using the existing submission controls.":"Awaiting Coordinator submission.";
  if(state==="submitted")return permissions.includes("ovr.process")?"Process Payroll after the existing evidence checks.":"Awaiting authorized payroll processing.";
  if(state==="processed")return permissions.includes("ovr.process")?"Record Payments in Payment Recording; confirm each actual outcome.":"Payment Recording requires payment-processing permission.";
  if(state==="closed")return "Payroll closed. View recorded payment outcomes and reconciliation.";
  return "Workflow status unavailable. Refresh the payroll.";
}
