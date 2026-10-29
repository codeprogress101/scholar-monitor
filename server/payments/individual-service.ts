import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {digest} from '../auth/crypto.js';
import {parseId,parseKey} from '../configuration/validation.js';
import {cachedReads} from '../read-cache.js';
import {decodeStoredJson} from '../stored-json.js';
import {effectiveRoster} from '../ovr/amendment-state.js';
import {managedRelease} from '../ovr/managed-release.js';
import {assertNoPaidClaim,claimDeadline,requireClaimOpen} from '../ovr/reprocessing.js';
import {individualPage,individualSource,individualHistory,individualRow,sourceBlockers} from './individual-reads.js';
import {parseIndividual,individualTransition,type IndividualInput} from './individual-model.js';
import {appendIndividualEvent,individualAudit,releaseIndividualRoute} from './individual-writes.js';

export class IndividualPaymentService{
 constructor(private authorization:AuthorizationService,private enabled=false){}
 availability(actor:string){return this.authorization.readSnapshot(actor,'ovr.process',async()=>({enabled:this.enabled}));}
 private requireEnabled(){if(!this.enabled)throw new AuthError(423,'INDIVIDUAL_PAYMENTS_DISABLED','Individual Payments awaits local compatibility verification and explicit activation. Existing payroll tools remain available.');}
 page(actor:string,raw:unknown){this.requireEnabled();return this.authorization.readSnapshot(actor,'ovr.process',db=>individualPage(db,raw));}
 history(actor:string,rawId:unknown,raw:unknown){this.requireEnabled();const id=parseId(rawId);return this.authorization.readSnapshot(actor,'ovr.process',db=>individualHistory(db,id,raw));}
 detail(actor:string,rawId:unknown){this.requireEnabled();const id=parseId(rawId);return this.authorization.readSnapshot(actor,'ovr.process',async connection=>{const db=cachedReads(connection),r=await individualSource(db,id);return {...individualRow(r),blockers:await this.blockers(db,r)};});}
 private async blockers(db:PoolConnection,r:RowDataPacket,exceptPaymentId?:string){
  const reasons=sourceBlockers(r);
  try{
   await assertNoPaidClaim(db,r.scholarship_id,r.semester_id,exceptPaymentId);
   const roster=await effectiveRoster(db,r.batch_id),root=r.root_batch_id===r.batch_id?roster:await effectiveRoster(db,r.root_batch_id);
   if(!roster?.snapshot.entries.some(e=>e.scholarshipId===r.scholarship_id)||!root?.snapshot.entries.some(e=>e.evidence.current.sources.scholarship.scholarId===r.scholar_id))reasons.push('The original frozen membership requires review.');
   const release=(await managedRelease(db,r.root_batch_id,r.scholarship_id))?.find(e=>e.entitlementId===r.entitlement_id);
   if(!release)reasons.push('The approved original allocation is unavailable.');else{reasons.push(...release.reasons);if(release.held)reasons.push('The Coordinator has held this stipend.');}
  }catch(e){if(!(e instanceof AuthError))throw e;reasons.push(e.message);}
  return [...new Set(reasons)];
 }
 /** P06 reuses the same consequential source checks; no separate eligibility engine. */
 async documentReview(db:PoolConnection,transaction:RowDataPacket){
  this.requireEnabled();
  const r=await individualSource(db,transaction.source_payment_id);
  if(r.action==='forwarded'){const [[prepared]]=await db.execute<RowDataPacket[]>("SELECT action,revision FROM individual_payment_events WHERE transaction_id=? AND action<>'forwarded' ORDER BY revision DESC LIMIT 1",[r.transaction_id]);if(prepared){r.action=prepared.action;r.revision=prepared.revision;}}
  if(r.transaction_id!==transaction.id||!['prepared','cancel_rejected'].includes(r.action))throw new AuthError(409,'DOCUMENT_UNAVAILABLE','Prepare the current unpaid DV before generating documents. Resolve any cancellation first.');
  const blockers=await this.blockers(db,r);if(blockers.length)throw new AuthError(409,'DOCUMENT_UNAVAILABLE',blockers.join(' '),{blockers});
  await requireClaimOpen(db,r.semester_id);
  const {day:ignoredDay,...basis}=r;void ignoredDay;
  return {version:'p04-document-review/v1',basis};
 }
 /** P07 retains the P04 authoritative release/compliance checks. A single
  * validated discrepancy may be excluded only while its Coordinator resolves it. */
 async settlementReview(db:PoolConnection,transaction:RowDataPacket,resolveCaseId?:string,exceptPaymentId?:string,loadedSource?:RowDataPacket){
  this.requireEnabled();const r=loadedSource??await individualSource(db,transaction.source_payment_id);
  if(r.payment_id!==transaction.source_payment_id||r.entitlement_id!==transaction.entitlement_id||r.scholarship_id!==transaction.scholarship_id)throw new AuthError(409,'SETTLEMENT_EVIDENCE_INVALID','The original stipend identity requires review.');
  if(resolveCaseId){const [[other]]=await db.execute<RowDataPacket[]>("SELECT id FROM payroll_reconciliation_events d WHERE d.batch_id=? AND d.scholarship_id=? AND d.kind='reported' AND d.id<>? AND NOT EXISTS(SELECT 1 FROM payroll_reconciliation_events n WHERE n.case_id=d.id AND n.case_version>1) LIMIT 1",[r.batch_id,r.scholarship_id,resolveCaseId]);r.disputed=Boolean(other);}
  // The shared claim guard still checks every OTHER pending/paid claim.
  if(exceptPaymentId)r.pending_correction=false;
  const blockers=await this.blockers(db,r,exceptPaymentId);if(blockers.length)throw new AuthError(409,'SETTLEMENT_BLOCKED',blockers.join(' '),{blockers});
  await requireClaimOpen(db,r.semester_id);
  const {day:ignoredDay,...basis}=r;void ignoredDay;return basis;
 }
 command(actor:string,rawKey:unknown,raw:unknown,requestId:string){
  this.requireEnabled();const key=parseKey(rawKey),input=parseIndividual(raw),hash=digest(JSON.stringify({version:'p04/v1',input}));
  const permission=input.action==='approve-cancellation'||input.action==='reject-cancellation'?'payments.corrections.approve':'ovr.process';
  return this.authorization.withPermission(actor,permission,async connection=>{
   const db=cachedReads(connection);
   const [[retry]]=await db.execute<RowDataPacket[]>('SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=? FOR UPDATE',[actor,key]);
   if(retry){if(retry.payload_hash!==hash)throw new AuthError(409,'IDEMPOTENCY_CONFLICT','Retry the exact saved request.');return decodeStoredJson(retry.result);}
   const r=await individualSource(db,input.paymentId);
   // Lock order: global configuration guard, actor, then the original entitlement.
   await db.execute('SELECT id FROM semester_entitlements WHERE id=? FOR UPDATE',[r.entitlement_id]);
   let result:object;
   if(input.action==='request'){
    if(r.effective_outcome!=='not_paid'||r.unpaid_reason!=='did_not_claim'||r.paid_elsewhere)throw new AuthError(409,'UNCLAIMED_REQUIRED','Only an effective unpaid Unclaimed stipend can receive this request.');
    const [[existing]]=await db.execute<RowDataPacket[]>("SELECT id FROM individual_payment_transactions WHERE entitlement_id=? AND replacement_of IS NULL AND source_kind='unclaimed'",[r.entitlement_id]);
    if(existing){result={transactionId:existing.id,alreadyRecorded:true};}
    else{
     const blockers=await this.blockers(db,r),id=await this.header(db,r,actor);
     await appendIndividualEvent(db,id,1,'request_recorded',actor,{version:'individual-payment/v1',sourcePaymentId:r.payment_id,sourceBatchId:r.batch_id,entitlementId:r.entitlement_id,batchRevision:Number(r.batch_revision),amountCentavos:Number(r.amount_centavos),claimability:{...await claimDeadline(db,r.semester_id),semesterRevision:Number(r.semester_revision),rule:'existing-semester-end-inclusive'},blockers,remarks:input.reason});
     // A conflict-free request selects the DV-only route. A blocked request is
     // still honest evidence, but cannot take ownership from an existing route.
     if(!blockers.length){
      const [[route]]=await db.execute<RowDataPacket[]>('SELECT transaction_id FROM entitlement_payment_routes WHERE entitlement_id=? FOR UPDATE',[r.entitlement_id]);
      if(route?.transaction_id)throw new AuthError(409,'INDIVIDUAL_ROUTE_ACTIVE','An individual route already reserves this entitlement.');
      if(route)await db.execute('UPDATE entitlement_payment_routes SET transaction_id=?,event_transaction_id=?,event_revision=1 WHERE entitlement_id=?',[id,id,r.entitlement_id]);
      else await db.execute('INSERT INTO entitlement_payment_routes(entitlement_id,transaction_id,event_transaction_id,event_revision) VALUES(?,?,?,1)',[r.entitlement_id,id,id]);
     }
     result={transactionId:id,revision:1,status:'Request Recorded',blockers};
     await individualAudit(db,id,actor,'request_recorded',requestId,'Scholar payment request recorded at server time.',{...result,key,paymentId:r.payment_id});
    }
   }else result=await this.transition(db,actor,r,input,requestId,key);
   await db.execute('INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)',[actor,key,hash,JSON.stringify(result)]);
   return result;
  });
 }
 private async header(db:PoolConnection,r:RowDataPacket,actor:string,previous?:RowDataPacket){
  const id=randomUUID(),reference='LDSS-DV-'+id.toUpperCase();
  await db.execute('INSERT INTO individual_payment_transactions(id,entitlement_id,source_payment_id,source_batch_id,request_transaction_id,replacement_of,internal_reference,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[id,r.entitlement_id,r.payment_id,r.batch_id,previous?.request_transaction_id??previous?.id??null,previous?.id??null,reference,actor]);return id;
 }
 private async transition(db:PoolConnection,actor:string,r:RowDataPacket,input:IndividualInput,requestId:string,key:string){
  const [[tx]]=await db.execute<RowDataPacket[]>(`SELECT t.*,e.action,e.revision,e.snapshot,e.snapshot_hash FROM individual_payment_transactions t JOIN individual_payment_events e ON e.transaction_id=t.id WHERE t.id=? AND t.entitlement_id=? AND NOT EXISTS(SELECT 1 FROM individual_payment_events n WHERE n.transaction_id=e.transaction_id AND n.revision>e.revision) FOR UPDATE`,[input.transactionId!,r.entitlement_id]);
  if(!tx||tx.id!==r.transaction_id||Number(tx.revision)!==input.expectedRevision||tx.source_payment_id!==r.payment_id)throw new AuthError(409,'INDIVIDUAL_STATE_CHANGED','This request or DV changed. Refresh before continuing.');
  const snapshot=typeof tx.snapshot==='string'?JSON.parse(tx.snapshot):tx.snapshot;
  if(digest(JSON.stringify(snapshot))!==tx.snapshot_hash)throw new AuthError(409,'INDIVIDUAL_EVIDENCE_INVALID','Preserve this record for technical review.');
  let id=String(tx.id),revision=Number(tx.revision)+1,action,routeExists=false;
  const preparing=input.action==='prepare'||input.action==='replace';
   const [[paid]]=await db.execute<RowDataPacket[]>('SELECT id FROM payment_records WHERE individual_transaction_id=?',[tx.id]);
   if(paid)throw new AuthError(409,'INDIVIDUAL_EXTERNAL_CONFLICT','This transaction has payment history. Use the controlled payment review instead of cancellation or replacement.');
   const [[forwarded]]=await db.execute<RowDataPacket[]>("SELECT revision FROM individual_payment_events WHERE transaction_id=? AND action='forwarded' LIMIT 1",[tx.id]);
   if(forwarded&&input.action==='approve-cancellation'&&!input.externalUnpaidConfirmed)throw new AuthError(409,'FORWARDED_PAYMENT_REVIEW_REQUIRED','A Coordinator must confirm the forwarded transaction remains unpaid before internal cancellation. LDSS cannot cancel an external cheque.');
   if(forwarded&&input.action==='replace'&&snapshot.externalUnpaidConfirmed!==true)throw new AuthError(409,'FORWARDED_PAYMENT_REVIEW_REQUIRED','Resolve the financial-office status of the forwarded original before preparing a replacement.');
  if(preparing){
   const blockers=await this.blockers(db,r);
   if(blockers.length)throw new AuthError(409,'INDIVIDUAL_BLOCKED',blockers.join(' '),{blockers});
   await requireClaimOpen(db,r.semester_id);
   const [[active]]=await db.execute<RowDataPacket[]>('SELECT transaction_id FROM entitlement_payment_routes WHERE entitlement_id=? FOR UPDATE',[r.entitlement_id]);
   routeExists=Boolean(active);
   if(active?.transaction_id&&active.transaction_id!==tx.id)throw new AuthError(409,'INDIVIDUAL_ROUTE_ACTIVE','An active DV already exists for this entitlement.');
   if(input.action==='replace'){
    if(!['cancelled','original_paid_cancelled'].includes(tx.action))throw new AuthError(409,'REPLACEMENT_UNAVAILABLE','A Coordinator-confirmed cancellation and currently unpaid source are required before replacement.');
    id=await this.header(db,r,actor,tx);revision=1;action='prepared' as const;
   }else action=individualTransition(tx.action,input.action);
  }else action=individualTransition(tx.action,input.action);
  const evidence={version:'individual-payment/v1',sourcePaymentId:r.payment_id,sourceBatchId:r.batch_id,entitlementId:r.entitlement_id,amountCentavos:Number(r.amount_centavos),previousTransactionId:tx.id,previousRevision:Number(tx.revision),reason:input.reason,claimability:{...await claimDeadline(db,r.semester_id),semesterRevision:Number(r.semester_revision),rule:'existing-semester-end-inclusive'},...(forwarded&&input.action==='replace'?{originalForwarded:true,originalExternalUnpaidConfirmed:true,externalStatus:'Replacement prepared; not forwarded'}:forwarded?{forwarded:true,externalUnpaidConfirmed:input.externalUnpaidConfirmed===true,externalCancellation:'Internal LDSS cancellation only; financial-office forwarding history remains'}:{externalStatus:'Not recorded by P04'})};
  await appendIndividualEvent(db,id,revision,action,actor,evidence);
  if(preparing){
   if(routeExists)await db.execute('UPDATE entitlement_payment_routes SET transaction_id=?,event_transaction_id=?,event_revision=? WHERE entitlement_id=?',[id,id,revision,r.entitlement_id]);
   else await db.execute('INSERT INTO entitlement_payment_routes(entitlement_id,transaction_id,event_transaction_id,event_revision) VALUES(?,?,?,?)',[r.entitlement_id,id,id,revision]);
  }
  else if(action==='cancelled')await releaseIndividualRoute(db,r.entitlement_id,id,revision);
  await individualAudit(db,id,actor,action,requestId,input.reason||'Unclaimed stipend DV prepared in LDSS; no document or payment generated.',{...evidence,revision,key});
  return {transactionId:id,revision,status:action==='cancelled'?'Cancelled':action==='cancel_requested'?'Cancellation Requested':'DV Prepared'};
 }
}
