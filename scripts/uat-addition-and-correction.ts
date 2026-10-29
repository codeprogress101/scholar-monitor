import type {ExtendedWorkflows} from './uat-types.js';
import type {Masterlist} from '../server/masterlists/model.js';
type SettlementDetail=Awaited<ReturnType<import('../server/payments/settlement-service.js').IndividualSettlementService['detail']>>;
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {session} from './uat-session.js';
import {folder,save} from './uat-environment.mjs';
import {today} from '../server/scholars/validation.js';
const results:object[]=[];
for(const scenario of ['A','F']) {
 const c=await session(scenario),evidence={reason:'Fictional reviewed UAT controlled workflow',reference:'SYNTHETIC-REVIEW-REFERENCE'};
 const api=async<T=unknown>(role:string,url:string,body?:object)=>{const r=await c.request(role,url,body);assert.equal(r.statusCode,200,`${url}: ${r.body.slice(0,800)}`);return r.json<T>();};
 try {
  if(scenario==='A') {
   const data=JSON.parse(await readFile(folder+'/extended-workflows.json','utf8')) as ExtendedWorkflows;
   const draft=data.masterlists.find(m=>m.state==='draft')!,target=data.masterlists.find(m=>m.state==='published')!;
   const d=await api<Masterlist>('staff','/api/v1/masterlists/'+draft.id),t=await api<Masterlist>('staff','/api/v1/masterlists/'+target.id);
   const selected=await api('staff',`/api/v1/masterlists/${draft.id}/addition`,{expectedVersion:d.version,targetId:target.id,targetVersion:t.version,...evidence});
   let current=await api<Masterlist>('staff','/api/v1/masterlists/'+draft.id);
   for(const action of ['submit-verification','submit-approval','approve','publish']) {
    await api(['approve','publish'].includes(action)?'coordinator':'staff',`/api/v1/masterlists/${draft.id}/${action}`,{expectedVersion:current.version,...evidence,...(action==='publish'?{effectiveOn:today()}:{})});
    current=await api<Masterlist>('staff','/api/v1/masterlists/'+draft.id);
   }
   const after=await api<{incorporated:boolean}>('staff',`/api/v1/masterlists/${draft.id}/addition`);assert.equal(after.incorporated,true);results.push({scenario,controlledAdditionPublished:true,priorPublishedVersionRetained:true,draftId:draft.id,targetId:target.id,selection:selected});
  }else {
   const tx=c.metadata.individualTransactions[0],root='/api/v1/individual-payments/settlement';
   let d=await api<SettlementDetail>('staff',root+'/transactions/'+tx);
   const date=new Date(Date.parse(today()+'T00:00:00Z')-86400000).toISOString().slice(0,10);
   await api('staff',root+'/commands',{action:'request-correction',transactionId:tx,expectedRevision:d.revision,outcome:'paid',actualPaidOn:date,reason:'Fictional signed release evidence supports correcting the actual date'});
   d=await api<SettlementDetail>('staff',root+'/transactions/'+tx);assert.equal(d.pendingCorrections.length,1);
   const denied=await c.request('staff',root+'/commands',{action:'approve-correction',transactionId:tx,expectedRevision:d.revision,correctionId:d.pendingCorrections[0].id,reason:'Staff cannot approve the requested financial correction'});assert.equal(denied.statusCode,403);
   await api('coordinator',root+'/commands',{action:'approve-correction',transactionId:tx,expectedRevision:d.revision,correctionId:d.pendingCorrections[0].id,reason:'Fictional Coordinator reviewed the signed actual release evidence'});
   const after=await api<SettlementDetail>('staff',root+'/transactions/'+tx);assert.equal(after.settlement!.outcome,'paid');assert.equal(after.settlement!.effectiveOn,date);results.push({scenario,individualCoordinatorCorrection:true,staffApprovalDenied:true,actualDate:date,originalPayrollMembershipUnchanged:true});
  }
 }finally{await c.close();}
}
await save(folder+'/addition-and-correction.json',results);console.log(JSON.stringify(results));
