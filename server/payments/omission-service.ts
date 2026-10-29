import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {digest} from '../auth/crypto.js';
import {parseId,parseKey} from '../configuration/validation.js';
import {cachedReads} from '../read-cache.js';
import {decodeStoredJson} from '../stored-json.js';
import {currentPayout,requireOpenPayout} from '../payouts/service.js';
import {preparationState,requirePreparationOpen} from '../payouts/preparation.js';
import {eligibilityView} from '../eligibility/service.js';
import {ovrEvidence,ovrEligibilityIssues} from '../ovr/rules.js';
import {effectiveRoster} from '../ovr/amendment-state.js';
import {ovrHistory} from '../ovr/service.js';
import {managedCandidates,approveSemesterEntitlement} from '../ovr/managed-payroll.js';
import {assertNoPaidClaim,requireClaimOpen} from '../ovr/reprocessing.js';
import {appendIndividualEvent,releaseIndividualRoute} from './individual-writes.js';
import {individualTransition,type IndividualAction} from './individual-model.js';
import {parseOmission,omissionLabels,type OmissionInput} from './omission-model.js';
import {omissionOptions,omissionOrigin,omissionPage,omissionCase,omissionHistory} from './omission-reads.js';
import {omissionReserved} from './omission-source.js';
import {individualClaims} from './settlement-reads.js';

export class OmissionPaymentService{
 constructor(private authorization:AuthorizationService,private enabled=false){}
 availability(actor:string){return this.authorization.readSnapshot(actor,'ovr.process',async()=>({enabled:this.enabled}));}
 private active(){if(!this.enabled)throw new AuthError(423,'OMITTED_PAYMENTS_DISABLED','Omitted Scholar processing awaits compatibility verification and explicit activation.');}
 options(actor:string){this.active();return this.authorization.readSnapshot(actor,'ovr.process',db=>omissionOptions(db));}
 page(actor:string,source:unknown,raw:unknown){this.active();const id=parseId(source);return this.authorization.readSnapshot(actor,'ovr.process',db=>omissionPage(db,id,raw));}
 /** Read-only discovery handoff: the original assessment remains the sole source of route blockers. */
 candidate(actor:string,source:unknown,annual:unknown){
  this.active();const batchId=parseId(source),annualId=parseId(annual);
  return this.authorization.readSnapshot(actor,'ovr.process',async connection=>{
   const db=cachedReads(connection),a=await this.assess(db,batchId,annualId),preparation=await preparationState(db,a.cycle.id);
   return {sourceBatchId:batchId,sourceCode:String(a.origin.code),scholarshipId:annualId,blockers:a.blockers,sourceHash:a.evidence.fingerprint,preparation:preparation.state,canRecord:a.blockers.length===0,route:preparation.state==='open'?'payroll_review':'coordinator_or_dv_review',paymentAuthorized:false};
  });
 }
 history(actor:string,rawId:unknown,raw:unknown){this.active();const id=parseId(rawId);return this.authorization.readSnapshot(actor,'ovr.process',db=>omissionHistory(db,id,raw));}
 detail(actor:string,rawId:unknown){
  this.active();const id=parseId(rawId);return this.authorization.readSnapshot(actor,'ovr.process',async connection=>{
   const db=cachedReads(connection),c=await omissionCase(db,id),assessment=await this.assess(db,c.source_batch_id,c.scholarship_id,c.id);
   const preparation=await preparationState(db,assessment.cycle.id);
   const [destinations]=await db.execute<RowDataPacket[]>(`SELECT w.batch_id id,b.code FROM payroll_submission_windows w JOIN ovr_batches b ON b.id=w.batch_id JOIN ovr_batch_events e ON e.batch_id=b.id
    WHERE w.cycle_id=? AND w.batch_number>? AND e.state='draft' AND NOT EXISTS(SELECT 1 FROM ovr_batch_events n WHERE n.batch_id=e.batch_id AND n.revision>e.revision) ORDER BY w.batch_number LIMIT 100`,[assessment.cycle.id,assessment.origin.batch_number]);
   const paid=c.entitlement_id?(await individualClaims(db,[c.scholarship_id],assessment.cycle.semesterId)).attempts.get(c.scholarship_id)?.some(p=>p.outcome==='paid'):false;
   return {id:c.id,scholarshipId:c.scholarship_id,sourceBatchId:c.source_batch_id,sourceCode:assessment.origin.code,revision:Number(c.revision),state:String(c.state),status:paid?'Paid — OR + DV':omissionLabels[c.state],entitlementId:c.entitlement_id??null,
    name:assessment.evidence.current.sources.scholarship.name,humanId:assessment.evidence.current.sources.scholarship.humanId,semesterId:assessment.cycle.semesterId,cycleId:assessment.cycle.id,cycleVersion:assessment.cycle.version,
    amount:'5000.00',preparation,blockers:assessment.blockers,sourceHash:assessment.evidence.fingerprint,approvalRevision:c.data.approvalRevision??null,transactionId:c.data.transactionId??null,destinations:preparation.state==='open'?destinations:[]};
  });
 }
 private async assess(db:PoolConnection,sourceBatchId:string,annual:string,caseId?:string,resolveCaseId?:string,exceptPaymentId?:string){
  const origin=await omissionOrigin(db,sourceBatchId),cycle=await currentPayout(db,origin.cycle_id),blockers:string[]=[];
  requireOpenPayout(cycle);
  const [[person]]=await db.execute<RowDataPacket[]>('SELECT id,scholar_id FROM scholarship_records WHERE id=? AND academic_year_id=? LOCK IN SHARE MODE',[annual,cycle.academicYearId]);
  if(!person)throw new AuthError(409,'OMISSION_IDENTITY_INVALID','Select a scholar from this payroll academic year.');
  const frozen=await effectiveRoster(db,sourceBatchId);
  if(!frozen)throw new AuthError(409,'OMISSION_SOURCE_INVALID','A verified finalized source payroll is required.');
  const belongs=(entry:typeof frozen.snapshot.entries[number])=>entry.scholarshipId===annual||entry.evidence.current.sources.scholarship.scholarId===person.scholar_id;
  if(frozen.snapshot.entries.some(belongs))blockers.push('This scholar belongs to the source frozen payroll. Use its existing payment tools.');
  const [[original]]=await db.execute<RowDataPacket[]>('SELECT snapshot FROM ovr_finalizations WHERE batch_id=?',[sourceBatchId]);
  const originalSnapshot=decodeStoredJson<typeof frozen.snapshot>(original.snapshot);
  if(originalSnapshot.entries.some(belongs))blockers.push('The scholar was included in the original frozen payroll; this is not an omission.');
  const view=await eligibilityView(db,cycle,annual,sourceBatchId,caseId),evidence=ovrEvidence(view);
  blockers.push(...ovrEligibilityIssues(view).map(i=>i.message));
  try{await requireClaimOpen(db,cycle.semesterId);await assertNoPaidClaim(db,annual,cycle.semesterId,exceptPaymentId);}catch(e){if(!(e instanceof AuthError))throw e;blockers.push(e.message);}
  const [[retry]]=await db.execute<RowDataPacket[]>(`SELECT q.id FROM payroll_reprocessing q JOIN scholarship_records r ON r.id=q.scholarship_id WHERE r.scholar_id=? AND q.semester_id=? LIMIT 1`,[person.scholar_id,cycle.semesterId]);
  if(retry)blockers.push('Existing Unclaimed or reprocessing history must use its original financial route.');
  const [[dispute]]=await db.execute<RowDataPacket[]>(`SELECT d.id FROM payroll_reconciliation_events d JOIN scholarship_records r ON r.id=d.scholarship_id JOIN ovr_batches b ON b.id=d.batch_id JOIN payout_cycles p ON p.id=b.cycle_id
   WHERE r.scholar_id=? AND p.semester_id=? AND d.kind='reported' AND d.id<>? AND NOT EXISTS(SELECT 1 FROM payroll_reconciliation_events n WHERE n.case_id=d.id AND n.case_version>1) LIMIT 1`,[person.scholar_id,cycle.semesterId,resolveCaseId??'']);
  if(dispute)blockers.push('Resolve the reported financial discrepancy before choosing another route.');
  const [[hold]]=await db.execute<RowDataPacket[]>(`SELECT v.snapshot FROM semester_entitlements e JOIN semester_entitlement_events v ON v.entitlement_id=e.id WHERE e.scholar_id=? AND e.semester_id=? AND JSON_EXTRACT(v.snapshot,'$.releaseHold') IS NOT NULL ORDER BY v.revision DESC LIMIT 1`,[person.scholar_id,cycle.semesterId]);
  if(hold&&(typeof hold.snapshot==='string'?JSON.parse(hold.snapshot):hold.snapshot).releaseHold===true)blockers.push('The Coordinator has held this stipend.');
  return {origin,cycle,person,evidence,blockers:[...new Set(blockers)]};
 }
 private requireEligible(a:Awaited<ReturnType<OmissionPaymentService['assess']>>,expected?:string){
  if(a.blockers.length)throw new AuthError(409,'OMISSION_BLOCKED',a.blockers.join(' '),{blockers:a.blockers});
  if(expected&&expected!==a.evidence.fingerprint)throw new AuthError(409,'SOURCE_CHANGED','Eligibility or financial evidence changed. Refresh and review before continuing.');
 }
 /** Documents consume the recorded authorization and fresh existing P05 assessment. */
 async documentReview(db:PoolConnection,transaction:RowDataPacket){
  this.active();const c=await omissionCase(db,transaction.omission_id);
  if(c.state!=='prepared'||c.data.transactionId!==transaction.id||c.entitlement_id!==transaction.entitlement_id||Number(c.data.approvalRevision)!==Number(transaction.approval_revision))throw new AuthError(409,'DOCUMENT_UNAVAILABLE','A current prepared OR + DV and its Coordinator authorization are required. Resolve any cancellation first.');
  const a=await this.assess(db,c.source_batch_id,c.scholarship_id,c.id);this.requireEligible(a);
  return {version:'p05-document-review/v1',caseId:c.id,caseRevision:Number(c.revision),caseHash:c.snapshot_hash,approvalRevision:Number(transaction.approval_revision),eligibilityHash:a.evidence.fingerprint,sourcePayrollHash:a.origin.snapshot_hash};
 }
 async settlementReview(db:PoolConnection,transaction:RowDataPacket,resolveCaseId?:string,exceptPaymentId?:string){
  this.active();const c=await omissionCase(db,transaction.omission_id);
  if(c.state!=='prepared'||c.entitlement_id!==transaction.entitlement_id||(!resolveCaseId&&c.data.transactionId!==transaction.id))throw new AuthError(409,'OMISSION_APPROVAL_REQUIRED','A current authorized prepared OR + DV is required.');
  const [[approval]]=await db.execute<RowDataPacket[]>("SELECT revision FROM payroll_omission_events WHERE omission_id=? AND revision=? AND action='approved' AND authorized_entitlement_id=?",[c.id,transaction.approval_revision,transaction.entitlement_id]);if(!approval)throw new AuthError(409,'OMISSION_APPROVAL_REQUIRED','The original Coordinator authorization requires review.');
  const a=await this.assess(db,c.source_batch_id,c.scholarship_id,c.id,resolveCaseId,exceptPaymentId);this.requireEligible(a);
  return {caseId:c.id,caseRevision:Number(c.revision),caseHash:c.snapshot_hash,approvalRevision:Number(approval.revision),eligibilityHash:a.evidence.fingerprint,sourcePayrollHash:a.origin.snapshot_hash};
 }
 command(actor:string,rawKey:unknown,raw:unknown,requestId:string){
  this.active();const input=parseOmission(raw),key=parseKey(rawKey),hash=digest(JSON.stringify({version:'p05/v1',input}));
  const coordinator=['approve','reject','approve-cancellation','reject-cancellation'].includes(input.action);
  return this.authorization.withPermission(actor,coordinator?'payroll.windows.manage':'ovr.process',async connection=>{
   const db=cachedReads(connection);
   const [[retry]]=await db.execute<RowDataPacket[]>('SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=? FOR UPDATE',[actor,key]);
   if(retry){if(retry.payload_hash!==hash)throw new AuthError(409,'IDEMPOTENCY_CONFLICT','Retry the exact saved request.');return decodeStoredJson(retry.result);}
   let result:object;
   if(input.action==='record'){
    const a=await this.assess(db,input.sourceBatchId,input.scholarshipId);this.requireEligible(a);
    const [[existing]]=await db.execute<RowDataPacket[]>('SELECT id,source_batch_id FROM payroll_omissions WHERE scholar_id=? AND semester_id=?',[a.person.scholar_id,a.cycle.semesterId]);
    if(existing){if(existing.source_batch_id!==input.sourceBatchId)throw new AuthError(409,'OMISSION_EXISTS','This semester already has an omission case. Open its original source history.');result={id:existing.id,alreadyRecorded:true};}
    else{
     if(input.expectedRevision!==0)throw new AuthError(409,'VERSION_CONFLICT','Refresh the scholar before recording the omission.');
     const id=randomUUID(),owner=a.evidence.current.sources.semesterPayroll?.ownerId;if(!owner)throw new AuthError(409,'PAYROLL_EVIDENCE_REQUIRED','Current semester ownership and review are required.');
     await db.execute('INSERT INTO payroll_omissions(id,scholarship_id,scholar_id,semester_id,source_batch_id,scholar_semester_id,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[id,input.scholarshipId,a.person.scholar_id,a.cycle.semesterId,input.sourceBatchId,owner,actor]);
     result=await this.event(db,{id,revision:0,entitlement_id:null,destination_batch_id:null,scholar_semester_id:owner,data:{}},'recorded','recorded',actor,requestId,key,input.reason||'Eligible scholar omitted from the identified finalized payroll.',{sourceHash:a.origin.snapshot_hash,evidence:a.evidence});
    }
   }else result=await this.transition(db,actor,input,key,requestId);
   await db.execute('INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)',[actor,key,hash,JSON.stringify(result)]);return result;
  });
 }
 private async event(db:PoolConnection,c:RowDataPacket|{id:string;revision:number;entitlement_id:null;destination_batch_id:null;scholar_semester_id:string;data:object},action:string,state:string,actor:string,requestId:string,key:string,reason:string,evidence:object={}){
  const revision=Number(c.revision)+1,snapshot={version:'omission/v1',...c.data as object,...evidence};
  await db.execute('INSERT INTO payroll_omission_events(omission_id,revision,scholar_semester_id,action,state,destination_batch_id,entitlement_id,authorized_entitlement_id,snapshot,snapshot_hash,reason,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[c.id,revision,c.scholar_semester_id,action,state,c.destination_batch_id??null,c.entitlement_id??null,action==='approved'?c.entitlement_id:null,JSON.stringify(snapshot),digest(JSON.stringify(snapshot)),reason,actor]);
  const result={id:String(c.id),revision,state,status:omissionLabels[state]};
  await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'payroll.omission','payroll_omissions',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),c.id,action,actor,requestId,reason,JSON.stringify({key,beforeRevision:Number(c.revision),after:result,snapshot})]);return result;
 }
 private async transition(db:PoolConnection,actor:string,input:OmissionInput,key:string,requestId:string){
  const c=await omissionCase(db,input.omissionId!);
  if(c.entitlement_id){const [[settled]]=await db.execute<RowDataPacket[]>('SELECT id FROM payment_records WHERE entitlement_id=? LIMIT 1',[c.entitlement_id]);if(settled)throw new AuthError(409,'INDIVIDUAL_EXTERNAL_CONFLICT','This stipend has individual payment history. Use Review Payment and its controlled financial corrections.');}
  if(c.source_batch_id!==input.sourceBatchId||c.scholarship_id!==input.scholarshipId||Number(c.revision)!==input.expectedRevision)throw new AuthError(409,'VERSION_CONFLICT','This omission changed. Refresh before continuing.');
  const origin=await omissionOrigin(db,c.source_batch_id),cycle=await currentPayout(db,origin.cycle_id);
  const preparation=await preparationState(db,cycle.id),reason=input.reason||'Omitted scholar processing reviewed in LDSS.';
  if(input.action==='add-to-payroll'){
   await requirePreparationOpen(db,cycle.id);
   if(omissionReserved(c.state))throw new AuthError(409,'INDIVIDUAL_ROUTE_ACTIVE','Cancel the existing OR + DV request before selecting payroll.');
   const target=(await ovrHistory(db,input.destinationBatchId!))[0];
   const [[window]]=await db.execute<RowDataPacket[]>('SELECT batch_number FROM payroll_submission_windows WHERE batch_id=? AND cycle_id=?',[input.destinationBatchId!,cycle.id]);
   if(!target||target.cycleId!==cycle.id||target.state!=='draft'||!window||Number(window.batch_number)<=Number(origin.batch_number))throw new AuthError(409,'OMISSION_DESTINATION_INVALID','Select a later editable numbered payroll in this same semester.');
   const a=await this.assess(db,c.source_batch_id,c.scholarship_id,c.id);this.requireEligible(a);
   c.destination_batch_id=target.id;
   const result=await this.event(db,c,'payroll_refreshed','payroll',actor,requestId,key,reason,{evidence:a.evidence,destinationRevision:target.revision});
   const candidates=await managedCandidates(db,target,cycle,[c.scholarship_id]),item=candidates?.items.find(i=>i.scholarshipId===c.scholarship_id);
   if(!item?.eligible||item.deferred?.current||!candidates?.opened)throw new AuthError(409,'OMISSION_DESTINATION_BLOCKED','The automatic destination candidate is blocked. Review its documents, timing, opening date and any Coordinator deferral.',{issues:item?.issues??[],deferred:item?.deferred??null});
   return {...result,destinationBatchId:target.id,includedInAutomaticDraft:true,finalized:false};
  }
  if(input.action==='request'){
   if(preparation.state!=='closed')throw new AuthError(409,'PAYROLL_FIRST_REQUIRED','Preparation is open. Use a later eligible same-semester payroll first.');
   if(omissionReserved(c.state))throw new AuthError(409,'INDIVIDUAL_ROUTE_ACTIVE','An OR + DV request is already active. Review its current history.');
   const a=await this.assess(db,c.source_batch_id,c.scholarship_id,c.id);this.requireEligible(a);
   return this.event(db,c,'requested','requested',actor,requestId,key,reason,{evidence:a.evidence,approvalRevision:null,preparationRevision:preparation.revision,requestedBy:actor});
  }
  if(input.action==='approve'||input.action==='reject'){
   if(c.state!=='requested')throw new AuthError(409,'OMISSION_STATE_CHANGED','Only a pending OR + DV request can be decided.');
   if(input.action==='reject')return this.event(db,c,'rejected','rejected',actor,requestId,key,reason,{approvalRevision:null});
   if(preparation.state!=='closed')throw new AuthError(409,'PAYROLL_FIRST_REQUIRED','Preparation reopened. Preserve this request; close preparation again or formally cancel before payroll transfer.');
   const a=await this.assess(db,c.source_batch_id,c.scholarship_id,c.id);this.requireEligible(a,input.expectedSourceHash);
   const approved=await approveSemesterEntitlement(db,a.evidence,actor,{version:'omission/v1',omissionId:c.id,sourceBatchId:c.source_batch_id,evidence:a.evidence,reason},reason,c.entitlement_id??undefined);
   c.entitlement_id=approved.id;
   return this.event(db,c,'approved','approved',actor,requestId,key,reason,{approvalRevision:Number(c.revision)+1,entitlementApprovalEventId:approved.event,evidence:a.evidence,approvedBy:actor,preparationRevision:preparation.revision});
  }
  if(input.action==='prepare'){
   if(c.state!=='approved'||!c.entitlement_id||!c.data.approvalRevision)throw new AuthError(409,'OMISSION_APPROVAL_REQUIRED','A recorded Coordinator authorization is required before preparing OR + DV.');
   if(preparation.state!=='closed')throw new AuthError(409,'PAYROLL_FIRST_REQUIRED','Preparation reopened. Preserve the authorization and reservation; close preparation again or formally cancel before payroll transfer.');
   const a=await this.assess(db,c.source_batch_id,c.scholarship_id,c.id);this.requireEligible(a,input.expectedSourceHash);
   const [[active]]=await db.execute<RowDataPacket[]>('SELECT transaction_id FROM entitlement_payment_routes WHERE entitlement_id=? FOR UPDATE',[c.entitlement_id]);
   if(active?.transaction_id)throw new AuthError(409,'INDIVIDUAL_ROUTE_ACTIVE','An individual transaction already reserves this entitlement.');
   const [[previous]]=await db.execute<RowDataPacket[]>("SELECT id,request_transaction_id FROM individual_payment_transactions WHERE omission_id=? AND source_kind='omitted' ORDER BY recorded_at DESC,id DESC LIMIT 1",[c.id]);
   const id=randomUUID(),reference='LDSS-OR-DV-'+id.toUpperCase();
   await db.execute("INSERT INTO individual_payment_transactions(id,entitlement_id,source_payment_id,source_batch_id,request_transaction_id,replacement_of,internal_reference,actor_id,recorded_at,source_kind,omission_id,approval_revision) VALUES(?,?,NULL,?,?,?,?,?,UTC_TIMESTAMP(6),'omitted',?,?)",[id,c.entitlement_id,c.source_batch_id,previous?.request_transaction_id??previous?.id??null,previous?.id??null,reference,actor,c.id,c.data.approvalRevision]);
   await appendIndividualEvent(db,id,1,'prepared',actor,{version:'omission/v1',omissionId:c.id,approvalRevision:c.data.approvalRevision,evidence:a.evidence,externalStatus:'Not generated or forwarded'});
   if(active)await db.execute('UPDATE entitlement_payment_routes SET transaction_id=?,event_transaction_id=?,event_revision=1 WHERE entitlement_id=?',[id,id,c.entitlement_id]);
   else await db.execute('INSERT INTO entitlement_payment_routes(entitlement_id,transaction_id,event_transaction_id,event_revision) VALUES(?,?,?,1)',[c.entitlement_id,id,id]);
   return {...await this.event(db,c,'prepared','prepared',actor,requestId,key,'Authorized unpaid OR + DV transaction prepared in LDSS; no documents or payment generated.',{transactionId:id,reference,evidence:a.evidence}),transactionId:id,internalReference:reference};
  }
  if(input.action.includes('cancellation')){
   const requesting=input.action==='request-cancellation';
   if(requesting?!['requested','approved','prepared'].includes(c.state):c.state!=='cancel_requested')throw new AuthError(409,'OMISSION_STATE_CHANGED','Refresh the current OR + DV cancellation state.');
   const previousState=requesting?c.state:c.data.beforeCancellationState;
   const [[ownedRoute]]=await db.execute<RowDataPacket[]>('SELECT transaction_id FROM entitlement_payment_routes WHERE entitlement_id=? FOR UPDATE',[c.entitlement_id??null]);
   if(ownedRoute?.transaction_id&&ownedRoute.transaction_id!==c.data.transactionId)throw new AuthError(409,'INDIVIDUAL_ROUTE_ACTIVE','A different active route must be reconciled before cancellation.');
   let state=requesting?'cancel_requested':input.action==='approve-cancellation'?'cancelled':previousState;
   if(!['requested','approved','prepared','cancelled','cancel_requested'].includes(state))throw new AuthError(409,'OMISSION_EVIDENCE_INVALID','Review the retained cancellation history.');
   if(c.data.transactionId){
    const [[tx]]=await db.execute<RowDataPacket[]>(`SELECT t.id,e.revision,e.action,e.snapshot FROM individual_payment_transactions t JOIN individual_payment_events e ON e.transaction_id=t.id WHERE t.id=? AND t.omission_id=? AND NOT EXISTS(SELECT 1 FROM individual_payment_events n WHERE n.transaction_id=e.transaction_id AND n.revision>e.revision) FOR UPDATE`,[c.data.transactionId,c.id]);
    // A prior cancelled transaction remains history when a new request awaits
    // authorization; do not resurrect it or attach cancellation to that old DV.
    if(tx&&!['cancelled','original_paid_cancelled'].includes(tx.action)){
     const snapshot=typeof tx.snapshot==='string'?JSON.parse(tx.snapshot):tx.snapshot;
     const [[paid]]=await db.execute<RowDataPacket[]>('SELECT id FROM payment_records WHERE individual_transaction_id=?',[tx.id]);
     if(paid||snapshot.paymentRecorded)throw new AuthError(409,'INDIVIDUAL_EXTERNAL_CONFLICT','Payment history requires controlled financial review.');
     const [[forwarded]]=await db.execute<RowDataPacket[]>("SELECT revision FROM individual_payment_events WHERE transaction_id=? AND action='forwarded' LIMIT 1",[tx.id]);
     if(forwarded&&input.action==='approve-cancellation'&&!input.externalUnpaidConfirmed)throw new AuthError(409,'FORWARDED_PAYMENT_REVIEW_REQUIRED','A Coordinator must confirm the forwarded transaction remains unpaid before internal cancellation. LDSS cannot cancel an external cheque.');
     const action=individualTransition(tx.action,input.action as 'request-cancellation'|'approve-cancellation'|'reject-cancellation') as IndividualAction,revision=Number(tx.revision)+1;
     await appendIndividualEvent(db,tx.id,revision,action,actor,{version:'omission/v1',omissionId:c.id,reason,previousRevision:Number(tx.revision),...(forwarded?{forwarded:true,externalUnpaidConfirmed:input.externalUnpaidConfirmed===true,externalCancellation:'Internal LDSS cancellation only'}:{externalStatus:'Not generated or forwarded'})});
     if(state==='cancelled')await releaseIndividualRoute(db,c.entitlement_id,tx.id,revision);
    }
   }
   if(input.action==='approve-cancellation'){
    // Never release a conflicting allocation, receipt or payment commitment.
    await assertNoPaidClaim(db,c.scholarship_id,cycle.semesterId);
    const [[allocation]]=await db.execute<RowDataPacket[]>('SELECT entitlement_id FROM payroll_allocations WHERE entitlement_id=?',[c.entitlement_id??null]);
    if(allocation)throw new AuthError(409,'ENTITLEMENT_RESERVED','An existing payroll allocation requires financial review before route release.');
   }
   if(input.action==='reject-cancellation')state=previousState;
   return this.event(db,c,requesting?'cancel_requested':input.action==='approve-cancellation'?'cancelled':'cancel_rejected',state,actor,requestId,key,reason,{beforeCancellationState:previousState});
  }
  throw new AuthError(422,'VALIDATION_FAILED','Choose an available omission action.');
 }
}
