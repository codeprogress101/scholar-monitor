import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {workingYear} from '../configuration/calendar.js';
import {cachedReads} from '../read-cache.js';
import {currentPayout} from '../payouts/service.js';
import {candidateReads} from '../ovr/candidate-reads.js';
import {cohortReads} from '../eligibility/cohort-reads.js';
import {eligibilityView} from '../eligibility/service.js';
import {ovrEligibilityIssues} from '../ovr/rules.js';
import {registryEligibility} from '../scholars/registry-eligibility.js';
import {effectiveOutcomeSql,effectivePaymentJoinsSql} from './effective-payment-sql.js';
import {discoveryQuery,type DiscoveryContext,type DiscoveryPage,type DiscoveryRow} from './discovery-model.js';

/** Count/page recorded identities first. Only the returned page receives domain assessment. */
export function boundedDiscovery(connection:PoolConnection):PoolConnection{
 return new Proxy(connection,{get(target,key){if(key!=='query'&&key!=='execute'){const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;}return async(...args:unknown[])=>{const result=await (target[key] as (...v:unknown[])=>Promise<[unknown,unknown]>).apply(target,args);if(Array.isArray(result[0])&&(result[0].length>5000||Buffer.byteLength(JSON.stringify(result[0]),'utf8')>32*1024*1024))throw new AuthError(503,'DISCOVERY_SOURCE_TOO_LARGE','Source evidence exceeds the bounded discovery reader. Narrow the search or review the source payroll.');return result;};}});
}
export class IndividualDiscoveryService{
 constructor(private authorization:AuthorizationService,private enabled=false){}
 context(actor:string){return this.authorization.readSnapshot(actor,'ovr.process',async db=>{
  const [[clock]]=await db.query<RowDataPacket[]>("SELECT DATE_FORMAT(UTC_TIMESTAMP()+INTERVAL 8 HOUR,'%Y-%m-%d') today");
  if(!this.enabled)return {enabled:false,today:String(clock.today),workingYearId:null,years:[],semesters:[]} satisfies DiscoveryContext;
  const [years]=await db.query<RowDataPacket[]>('SELECT id,code FROM academic_years ORDER BY starts_on DESC,id LIMIT 101'),[semesters]=await db.query<RowDataPacket[]>("SELECT id,academic_year_id,code,name,DATE_FORMAT(starts_on,'%Y-%m-%d') starts,DATE_FORMAT(ends_on,'%Y-%m-%d') ends FROM semesters ORDER BY starts_on DESC,id LIMIT 201");
  if(years.length>100||semesters.length>200)throw new AuthError(422,'DISCOVERY_PERIOD_SCOPE','The period inventory needs a separately bounded year search. No periods were truncated.');
  return {enabled:true,today:String(clock.today),workingYearId:(await workingYear(db))?.yearId??null,years:years.map(y=>({id:String(y.id),code:String(y.code)})),semesters:semesters.map(s=>({id:String(s.id),academicYearId:String(s.academic_year_id),code:String(s.code),name:String(s.name),startsOn:String(s.starts),endsOn:String(s.ends)}))} satisfies DiscoveryContext;
 });}
 page(actor:string,raw:unknown){if(!this.enabled)throw new AuthError(423,'INDIVIDUAL_PAYMENTS_DISABLED','Individual Payments requires existing compatibility verification and explicit activation.');const q=discoveryQuery(raw);return this.authorization.readSnapshot(actor,'ovr.process',async connection=>{
  let db=cachedReads(boundedDiscovery(connection));
  const [[period]]=await db.execute<RowDataPacket[]>('SELECT s.id,s.code,s.name,y.code year_code FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=? AND y.id=?',[q.semesterId,q.academicYearId]);
  if(!period)throw new AuthError(422,'DISCOVERY_PERIOD_INVALID','The selected semester does not belong to this academic year.');
  const [cycles]=await db.execute<RowDataPacket[]>('SELECT id FROM payout_cycles WHERE semester_id=? ORDER BY id LIMIT 3',[q.semesterId]);
  const cycle=cycles.length===1?await currentPayout(db,String(cycles[0].id)):null;
  const [batches]=await db.execute<RowDataPacket[]>(`SELECT b.id,b.code,c.id cycle_id,e.state,f.batch_id finalized,
   EXISTS(SELECT 1 FROM historical_payout_setups h WHERE h.batch_id=b.id) historical,
   EXISTS(SELECT 1 FROM payroll_submission_windows w JOIN regular_payout_periods p ON p.cycle_id=w.cycle_id WHERE w.batch_id=b.id) managed
   FROM ovr_batches b JOIN payout_cycles c ON c.id=b.cycle_id JOIN ovr_batch_events e ON e.batch_id=b.id
   LEFT JOIN ovr_finalizations f ON f.batch_id=b.id WHERE c.semester_id=? AND NOT EXISTS(SELECT 1 FROM ovr_batch_events n WHERE n.batch_id=e.batch_id AND n.revision>e.revision) ORDER BY b.code,b.id LIMIT 201`,[q.semesterId]);
  if(batches.length>200)throw new AuthError(422,'DISCOVERY_BATCH_SCOPE','More than 200 payrolls require a narrower source review. No payroll was omitted.');
  if(q.sourceBatchId&&!batches.some(b=>b.id===q.sourceBatchId))throw new AuthError(422,'DISCOVERY_SOURCE_INVALID','Choose an original payroll in the selected semester.');
  const drafts=batches.filter(b=>cycle&&b.cycle_id===cycle.id&&b.state==='draft'&&b.managed&&!b.historical);
  const defs=`
   SELECT d.batch_id,d.scholarship_id,d.reason,d.recorded_at FROM payroll_draft_deferrals d JOIN ovr_batches b ON b.id=d.batch_id JOIN payout_cycles c ON c.id=b.cycle_id WHERE c.semester_id=? AND d.action='defer' AND NOT EXISTS(SELECT 1 FROM payroll_draft_deferrals n WHERE n.batch_id=d.batch_id AND n.scholarship_id=d.scholarship_id AND n.revision>d.revision)
   UNION ALL SELECT d.batch_id,d.scholarship_id,d.reason,d.recorded_at FROM payroll_deferrals d JOIN ovr_batches b ON b.id=d.batch_id JOIN payout_cycles c ON c.id=b.cycle_id WHERE c.semester_id=? AND NOT EXISTS(SELECT 1 FROM payroll_draft_deferrals n WHERE n.batch_id=d.batch_id AND n.scholarship_id=d.scholarship_id) AND NOT EXISTS(SELECT 1 FROM payroll_deferrals n WHERE n.batch_id=d.batch_id AND n.scholarship_id=d.scholarship_id AND n.revision>d.revision)`;
  const activeDeferral=(batch:string,annual:string)=>`(EXISTS(SELECT 1 FROM payroll_draft_deferrals d WHERE d.batch_id=${batch} AND d.scholarship_id=${annual} AND d.action='defer' AND NOT EXISTS(SELECT 1 FROM payroll_draft_deferrals n WHERE n.batch_id=d.batch_id AND n.scholarship_id=d.scholarship_id AND n.revision>d.revision)) OR EXISTS(SELECT 1 FROM payroll_deferrals d WHERE d.batch_id=${batch} AND d.scholarship_id=${annual} AND NOT EXISTS(SELECT 1 FROM payroll_draft_deferrals m WHERE m.batch_id=d.batch_id AND m.scholarship_id=d.scholarship_id) AND NOT EXISTS(SELECT 1 FROM payroll_deferrals n WHERE n.batch_id=d.batch_id AND n.scholarship_id=d.scholarship_id AND n.revision>d.revision)))`;
  const reservation=`(EXISTS(SELECT 1 FROM semester_entitlements ent WHERE ent.scholar_id=r.scholar_id AND ent.semester_id=?) OR EXISTS(SELECT 1 FROM ovr_entries e JOIN scholarship_records a ON a.id=e.scholarship_id JOIN ovr_batches b ON b.id=e.batch_id JOIN payout_cycles c ON c.id=b.cycle_id WHERE a.scholar_id=r.scholar_id AND c.semester_id=? AND e.action='add' AND NOT (NOT EXISTS(SELECT 1 FROM ovr_finalizations f WHERE f.batch_id=e.batch_id) AND ${activeDeferral('e.batch_id','e.scholarship_id')}) AND NOT EXISTS(SELECT 1 FROM ovr_entries n WHERE n.batch_id=e.batch_id AND n.scholarship_id=e.scholarship_id AND n.batch_revision>e.batch_revision)))`;
  const deferred=`EXISTS(SELECT 1 FROM ovr_batches b JOIN payout_cycles c ON c.id=b.cycle_id WHERE c.semester_id=? AND ${activeDeferral('b.id','r.id')}${q.sourceBatchId?' AND b.id=?':''})`;
  const filter=q.filter==='deferred'?deferred:q.filter==='reserved'?reservation:`NOT ${reservation}`;
  const values:(string|number)[]=[q.academicYearId,q.q,q.q,...(q.filter==='deferred'?[q.semesterId,...(q.sourceBatchId?[q.sourceBatchId]:[])]:[q.semesterId,q.semesterId])];
  const base=`FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE r.academic_year_id=? AND ${['unassigned','review'].includes(q.filter)?"r.operational_status='active' AND EXISTS(SELECT 1 FROM masterlist_activations a JOIN masterlist_versions m ON m.id=a.masterlist_id WHERE a.scholarship_id=r.id AND m.academic_year_id=r.academic_year_id AND m.status IN ('published','locked')) AND ":''}(LOCATE(LOWER(?),LOWER(CONCAT_WS(' ',s.last_name,s.first_name,s.middle_name)))>0 OR LOCATE(LOWER(?),LOWER(i.human_id))>0) AND ${filter}`;
  const [[count]]=await db.execute<RowDataPacket[]>(`SELECT COUNT(*) n ${base}`,values);
  if(q.filter==='review'&&Number(count.n)>100)throw new AuthError(422,'DISCOVERY_REVIEW_SCOPE','Needs Review checks at most 100 matching unassigned scholars. Narrow the name or ID search; no matches were omitted.');
  const [records]=await db.execute<RowDataPacket[]>(`SELECT r.id,r.scholar_id,i.human_id,CONCAT_WS(' ',s.last_name,s.first_name,NULLIF(s.middle_name,''),NULLIF(s.suffix,'')) name ${base} ORDER BY i.human_id,r.id LIMIT ${q.filter==='review'?100:q.limit} OFFSET ${q.filter==='review'?0:q.offset}`,values);
  const ids=records.map(r=>String(r.id)),people=records.map(r=>String(r.scholar_id)),marks=ids.map(()=>'?').join(',');
  const deferrals:RowDataPacket[]=[],assignments:RowDataPacket[]=[],reservations:RowDataPacket[]=[],paid:RowDataPacket[]=[],omissions:RowDataPacket[]=[];
  if(ids.length){
   const [d]=await db.execute<RowDataPacket[]>(`SELECT a.scholar_id,d.batch_id,d.reason,DATE_FORMAT(d.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') recorded FROM (${defs}) d JOIN scholarship_records a ON a.id=d.scholarship_id WHERE a.scholar_id IN (${marks}) ORDER BY d.recorded_at DESC,d.batch_id LIMIT 201`,[q.semesterId,q.semesterId,...people]);if(d.length>200)throw new AuthError(422,'DISCOVERY_DEFERRAL_SCOPE','More than 200 active deferrals require a smaller page or source review.');deferrals.push(...d);
   const [a]=await db.execute<RowDataPacket[]>(`SELECT DISTINCT r.scholar_id,e.batch_id FROM ovr_entries e JOIN scholarship_records r ON r.id=e.scholarship_id JOIN ovr_batches b ON b.id=e.batch_id JOIN payout_cycles c ON c.id=b.cycle_id WHERE r.scholar_id IN (${marks}) AND c.semester_id=? AND e.action='add' AND NOT (NOT EXISTS(SELECT 1 FROM ovr_finalizations f WHERE f.batch_id=e.batch_id) AND ${activeDeferral('e.batch_id','e.scholarship_id')}) AND NOT EXISTS(SELECT 1 FROM ovr_entries n WHERE n.batch_id=e.batch_id AND n.scholarship_id=e.scholarship_id AND n.batch_revision>e.batch_revision)`,[...people,q.semesterId]);assignments.push(...a);
   const [ent]=await db.execute<RowDataPacket[]>(`SELECT e.scholar_id,a.batch_id FROM semester_entitlements e LEFT JOIN payroll_allocations a ON a.entitlement_id=e.id WHERE e.scholar_id IN (${marks}) AND e.semester_id=?`,[...people,q.semesterId]);reservations.push(...ent);
   const [p]=await db.execute<RowDataPacket[]>(`SELECT r.scholar_id,MAX(${effectiveOutcomeSql}='paid') paid FROM payment_records p JOIN scholarship_records r ON r.id=p.scholarship_id JOIN payout_cycles pc ON pc.id=p.cycle_id ${effectivePaymentJoinsSql} WHERE r.scholar_id IN (${marks}) AND pc.semester_id=? GROUP BY r.scholar_id`,[...people,q.semesterId]);paid.push(...p);
   const [o]=await db.execute<RowDataPacket[]>(`SELECT id,scholar_id,source_batch_id FROM payroll_omissions WHERE scholar_id IN (${marks}) AND semester_id=?`,[...people,q.semesterId]);omissions.push(...o);
  }
  // Existing domain readers retain official proof, source ownership, documents and overrides.
  if(cycle&&ids.length)db=await cohortReads(await candidateReads(db,ids,q.semesterId,false),q.academicYearId,q.semesterId,cycle.id,ids);
  const noCycle=cycle||!ids.length?null:await registryEligibility(db,{ids:people.join(','),academicYearId:q.academicYearId,semesterId:q.semesterId});
  const items:DiscoveryRow[]=[];
  for(const r of records){
   const deferredRows=deferrals.filter(d=>d.scholar_id===r.scholar_id),origin=batches.find(b=>b.id===(q.sourceBatchId??deferredRows[0]?.batch_id));
   const payrolls=batches.filter(b=>assignments.some(a=>a.scholar_id===r.scholar_id&&a.batch_id===b.id)||reservations.some(a=>a.scholar_id===r.scholar_id&&a.batch_id===b.id)).map(b=>({id:String(b.id),code:String(b.code),state:String(b.state)}));
   const reserved=reservations.some(a=>a.scholar_id===r.scholar_id)||payrolls.length>0,isPaid=paid.some(p=>p.scholar_id===r.scholar_id&&p.paid),omission=omissions.find(o=>o.scholar_id===r.scholar_id);
   const target=origin?.managed&&!origin.historical?String(origin.id):drafts.length===1?String(drafts[0].id):undefined;
   const view=cycle&&!reserved?await eligibilityView(db,cycle,String(r.id),target):null;
   const requirements=view?.current.sources.requirements,complete=Boolean(requirements?.length&&requirements.every(i=>i.satisfied&&(i.status!=='waived'||i.allowWaiver))&&!view?.current.reasons.some(i=>['COVERED_DOCUMENT_UNVERIFIED','VERIFICATION_STALE'].includes(i.code)));
   const issues=view?ovrEligibilityIssues(view):[],reviewReasons=[...new Set(issues.map(i=>i.message))];
   const status=isPaid?'Paid this semester':reserved?'Recorded payroll assignment / reservation':deferredRows.length?'Deferred from payroll':!cycle?'No applicable payroll available':!target?'No applicable payroll available':issues.length?'Additional review required':'Requirements complete; not assigned';
   const reviewHref=`#scholars?${new URLSearchParams({scholar:String(r.scholar_id),section:'requirements',academicYear:q.academicYearId,semester:q.semesterId,...(cycle?{payrollCycle:cycle.id}:{})})}`;
   const chosen=reserved?(batches.find(b=>b.id===payrolls[0]?.id)??origin):origin;
   const next:DiscoveryRow['next']=chosen?{label:deferredRows.length?'Review originating payroll':'Review payroll',href:`#payouts?${new URLSearchParams({cycle:String(chosen.cycle_id),batch:String(chosen.id)})}`}:{label:issues.length?'Review scholar':'Review payroll preparation',href:issues.length?reviewHref:cycle?'#payouts?cycle='+cycle.id:'#payouts'};
   if(!chosen&&target){const candidate=batches.find(b=>b.id===target);next.label='Review draft candidate';next.href='#payouts?'+new URLSearchParams({cycle:String(candidate!.cycle_id),batch:target});}
   if(origin?.finalized&&!reserved&&!omission){next.label='Review omission route';next.omissionReviewBatchId=String(origin.id);delete next.href;}
   if(omission){next.label='Review recorded omission';next.href='#individual-payments?'+new URLSearchParams({view:'omitted',sourceBatch:String(omission.source_batch_id),q:String(r.human_id)});delete next.omissionReviewBatchId;}
   if(origin&&!origin.finalized&&deferredRows.length)reviewReasons.unshift('The originating payroll is not finalized. Deferral does not authorize an individual payment or omission.');
   if(!target&&cycle&&!reserved)reviewReasons.unshift(drafts.length>1?'Choose the applicable draft in Payroll.':'No applicable ordinary draft is selected; cutoff eligibility is not established.');
   if(!cycle&&!reserved)reviewReasons.unshift(cycles.length>1?'Multiple cycles cover this semester. Review the applicable payroll context.':'No payroll cycle is configured for this semester.');
   items.push({scholarId:String(r.scholar_id),scholarshipId:String(r.id),name:String(r.name),humanId:String(r.human_id),status,requirements:reserved?'Use the original financial review':view?complete?'Complete':'Needs review':noCycle?.items.find(i=>i.scholarId===r.scholar_id)?.requirements?.label??'Not assessed',reviewReasons,payable:false,payrolls,deferrals:deferredRows.map(d=>{const b=batches.find(b=>b.id===d.batch_id);return {batchId:String(d.batch_id),code:String(b?.code??'Payroll'),state:String(b?.state??'unknown'),reason:String(d.reason),recordedAt:String(d.recorded)};}),omissionId:omission?.id??null,omissionSourceId:omission?.source_batch_id??null,next});
  }
  const reviewed=q.filter==='review'?items.filter(i=>i.reviewReasons.length||i.requirements!=='Complete'):items;
  return {items:q.filter==='review'?reviewed.slice(q.offset,q.offset+q.limit):items,total:q.filter==='review'?reviewed.length:Number(count.n),offset:q.offset,limit:q.limit,filter:q.filter,context:{academicYearId:q.academicYearId,academicYear:String(period.year_code),semesterId:q.semesterId,semester:String(period.name),cycleId:cycle?.id??null,cycleName:cycle?.name??null,ordinaryDraftCount:drafts.length},payrolls:batches.map(b=>({id:String(b.id),code:String(b.code),state:String(b.state)})),scope:'recorded_assignment',readOnly:true} satisfies DiscoveryPage;
 });}
}
