import {z} from 'zod';
import type {RowDataPacket} from 'mysql2/promise';
import {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {cachedReads} from '../read-cache.js';
import {currentPayout} from '../payouts/service.js';
import {preparationState} from '../payouts/preparation.js';
import {ovrHistory} from '../ovr/service.js';
import {claimDeadline,draftDeferral} from '../ovr/reprocessing.js';
import {managedCandidates} from '../ovr/managed-payroll.js';
import {boundedDiscovery} from './discovery-service.js';

export const recoveryQuery=(raw:unknown)=>{
 const p=z.object({sourceBatchId:z.uuid(),scholarshipId:z.uuid()}).strict().safeParse(raw);
 if(!p.success)throw new AuthError(422,'VALIDATION_FAILED','Choose one original payroll and deferred scholar.');return p.data;
};
export type DeferredRecovery={source:{id:string;code:string;state:string;revision:number;academicYear:string;semester:string};restore:{label:string;href?:string;reason:string};destinations:{id:string;code:string;href:string;reasons:string[];included:boolean}[];anotherReason:string;individual:{sourceBatchId?:string;reason:string};readOnly:true;paymentAuthorized:false};
/** Navigation advice only. Every destination continues to use its original writer. */
export class DeferredRecoveryService{
 constructor(private authorization:AuthorizationService,private enabled=false){}
 review(actor:string,raw:unknown){
  if(!this.enabled)throw new AuthError(423,'INDIVIDUAL_PAYMENTS_DISABLED','Individual Payments requires explicit activation.');
  const q=recoveryQuery(raw);
  return this.authorization.readSnapshot(actor,'ovr.process',async(connection,access)=>{
   const db=cachedReads(boundedDiscovery(connection));
   // Navigation needs the latest state, not every historical roster snapshot.
   const [[record]]=await db.execute<RowDataPacket[]>(`SELECT b.id,b.code,b.cycle_id,e.state,e.revision FROM ovr_batches b JOIN ovr_batch_events e ON e.batch_id=b.id WHERE b.id=? AND NOT EXISTS(SELECT 1 FROM ovr_batch_events n WHERE n.batch_id=e.batch_id AND n.revision>e.revision)`,[q.sourceBatchId]);
   if(!record)throw new AuthError(404,'OVR_NOT_FOUND','Original payroll is unavailable.');
   const origin={id:String(record.id),code:String(record.code),cycleId:String(record.cycle_id),state:String(record.state),revision:Number(record.revision)};
   const cycle=await currentPayout(db,origin.cycleId),deferral=await draftDeferral(db,origin.id,q.scholarshipId);
   const [[person]]=await db.execute<RowDataPacket[]>('SELECT id FROM scholarship_records WHERE id=? AND academic_year_id=?',[q.scholarshipId,cycle.academicYearId]);
   if(!person||!deferral?.current)throw new AuthError(409,'DEFERRAL_CHANGED','This current deferral is no longer available. Refresh discovery.');
   const [[frozen]]=await db.execute<RowDataPacket[]>('SELECT batch_id FROM ovr_finalizations WHERE batch_id=?',[origin.id]);
   const preparation=await preparationState(db,cycle.id),claim=await claimDeadline(db,cycle.semesterId),canManage=access.permissions.some(p=>p.code==='ovr.finalize');
   const periodOpen=cycle.state==='open'&&!cycle.periodUnavailable&&!claim.expired&&preparation.state==='open';
   const href='#payouts?'+new URLSearchParams({cycle:cycle.id,batch:origin.id,recovery:'deferral',annual:q.scholarshipId});
   const restore:DeferredRecovery['restore']=frozen||!['draft','review'].includes(origin.state)?{label:'Restore to Original Payroll',reason:'The original roster is frozen or beyond Review. Direct restoration is unavailable.'}:!canManage?{label:'Restore to Original Payroll',reason:'A Coordinator must '+(origin.state==='review'?'return this payroll to Draft, then restore the deferral.':'review and restore this deferral in the original Draft.')} :!periodOpen?{label:'Restore to Original Payroll',reason:claim.expired?'The semester claim period ended.':preparation.state!=='open'?'Payroll preparation is closed.':'The payroll period is unavailable.'}:origin.state==='review'?{label:'Return Original Payroll to Draft',href,reason:'Use the existing Coordinator Return to Draft first, then review restoration.'}:{label:'Restore to Original Payroll',href,reason:'Open the existing restoration confirmation. Eligibility is rechecked; restoration does not allocate or pay.'};
   const [later]=await db.execute<RowDataPacket[]>(`SELECT b.id,b.code FROM ovr_batches b JOIN payroll_submission_windows w ON w.batch_id=b.id JOIN payroll_submission_windows original ON original.batch_id=? JOIN ovr_batch_events e ON e.batch_id=b.id WHERE b.cycle_id=? AND w.batch_number>original.batch_number AND e.state='draft' AND NOT EXISTS(SELECT 1 FROM ovr_batch_events n WHERE n.batch_id=e.batch_id AND n.revision>e.revision) AND NOT EXISTS(SELECT 1 FROM ovr_finalizations f WHERE f.batch_id=b.id) AND NOT EXISTS(SELECT 1 FROM historical_payout_setups h WHERE h.batch_id=b.id) ORDER BY w.batch_number,b.id LIMIT 11`,[origin.id,cycle.id]);
   if(later.length>10)throw new AuthError(422,'RECOVERY_DESTINATION_SCOPE','More than ten later drafts require review in Payroll. None were silently omitted.');
   const destinations:DeferredRecovery['destinations']=[];
   if(periodOpen)for(const row of later){
    const batch=(await ovrHistory(db,String(row.id)))[0],current=await managedCandidates(db,batch,cycle,[q.scholarshipId]),candidate=current?.items.find(i=>i.scholarshipId===q.scholarshipId);
    const reasons=candidate?[...new Set(candidate.issues.map(i=>i.message))]:['The existing source contract does not include this scholar.'];
    if(candidate?.deferred?.current)reasons.unshift('This scholar is also deferred from this destination.');
    if(current&&!current.opened)reasons.unshift('The destination window has not opened.');
    destinations.push({id:batch.id,code:batch.code,href:'#payouts?'+new URLSearchParams({cycle:cycle.id,batch:batch.id}),reasons,included:Boolean(current?.opened&&candidate?.eligible&&!candidate.deferred?.current)});
   }
   return {source:{id:origin.id,code:origin.code,state:origin.state,revision:origin.revision,academicYear:cycle.yearCode,semester:cycle.semesterCode},restore,destinations,anotherReason:!periodOpen?'Review the unavailable payroll period or preparation state first.':!later.length?'No later ordinary Draft exists in this cycle. No payroll was created.':'These are current candidate assessments, not transfers or payment authorizations.',individual:frozen?{sourceBatchId:origin.id,reason:'Check the original finalized source and existing omission/OR-DV prerequisites.'}:{reason:'A finalized numbered source is required. A Draft or Review deferral is not an omission authorization.'},readOnly:true,paymentAuthorized:false} satisfies DeferredRecovery;
  });
 }
}
