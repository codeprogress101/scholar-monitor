import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {digest} from '../auth/crypto.js';
import {parseId,parseKey} from '../configuration/validation.js';
import {cachedReads} from '../read-cache.js';
import {decodeStoredJson} from '../stored-json.js';
import {currentPayout} from '../payouts/service.js';
import {claimDeadline,assertNoPaidClaim} from '../ovr/reprocessing.js';
import {batchMetadata} from '../ovr/detail-reads.js';
import {candidateReads} from '../ovr/candidate-reads.js';
import {appendReconciliationEvent} from './reconciliation-writes.js';
import {openCase} from './reconciliation-reads.js';
import {appendIndividualEvent,individualAudit,releaseIndividualRoute} from './individual-writes.js';
import type {DocumentReviewServices} from './document-source.js';
import {settlementPage,settlementSummary,settlementCorrectionHistory,individualPayment,settlementCases} from './settlement-reads.js';
import {settlementHeader,settlementDetail,reviewSettlement,availableDocumentVersions,forwardingEvidence} from './settlement-source.js';
import {individualSourcesSql} from './individual-reads.js';
import {settlementInput,settlementCommit,settlementCommand,settlementParse,type SettlementInput,type SettlementPreview,type IndividualCorrection,type SettlementCommand} from './settlement-model.js';

export class IndividualSettlementService{
 constructor(private authorization:AuthorizationService,private reviews:DocumentReviewServices,private enabled=false){}
 private active(){if(!this.enabled)throw new AuthError(423,'INDIVIDUAL_SETTLEMENT_DISABLED','Individual cheque recording awaits explicit activation. Existing payment tools remain available.');}
 availability(actor:string){return this.authorization.readSnapshot(actor,'ovr.process',async()=>({enabled:this.enabled}));}
 page(actor:string,raw:unknown){this.active();return this.authorization.readSnapshot(actor,'ovr.process',db=>settlementPage(db,raw));}
 summary(actor:string){this.active();return this.authorization.readSnapshot(actor,'ovr.process',db=>settlementSummary(db));}
 detail(actor:string,rawId:unknown){this.active();const id=parseId(rawId);return this.authorization.readSnapshot(actor,'ovr.process',db=>settlementDetail(cachedReads(db),id,this.reviews));}
 corrections(actor:string,rawId:unknown,raw:unknown){this.active();const id=parseId(rawId);return this.authorization.readSnapshot(actor,'ovr.process',async db=>{await settlementHeader(db,id);return settlementCorrectionHistory(db,id,raw);});}
 private async retry(db:PoolConnection,actor:string,key:string,hash:string){const [[r]]=await db.execute<RowDataPacket[]>('SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=? FOR UPDATE',[actor,key]);if(!r)return null;if(r.payload_hash!==hash)throw new AuthError(409,'IDEMPOTENCY_CONFLICT','Retry the exact saved payment request.');return decodeStoredJson<Record<string,unknown>>(r.result);}
 private async journal(db:PoolConnection,actor:string,key:string,hash:string,result:object){await db.execute('INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)',[actor,key,hash,JSON.stringify(result)]);}
 private async prepare(connection:PoolConnection,input:SettlementInput,locking=false){
  let db=cachedReads(connection);const headers:RowDataPacket[]=[];
  for(const id of [...input.transactionIds].sort())headers.push(await settlementHeader(db,id));
  if(locking){const ids=[...new Set(headers.map(h=>String(h.entitlement_id)))].sort();await db.execute(`SELECT id FROM semester_entitlements WHERE id IN (${ids.map(()=>'?').join(',')}) ORDER BY id FOR UPDATE`,ids);}
  // Same raw-source adapter as automatic payroll; eligibility remains in P04/P05.
  if(headers.length){const semesters=[...new Set(headers.map(h=>h.semester_id))];if(semesters.length!==1)throw new AuthError(422,'SETTLEMENT_SCOPE_REQUIRED','Review one receiving semester at a time.');db=await candidateReads(db,headers.map(h=>String(h.scholarship_id)),semesters[0]);}
  const unclaimed=new Map<string,RowDataPacket>(),paymentIds=headers.filter(h=>h.source_kind==='unclaimed').map(h=>String(h.source_payment_id));
  for(let offset=0;offset<paymentIds.length;offset+=200){const ids=paymentIds.slice(offset,offset+200);const [rows]=await db.execute<RowDataPacket[]>(`SELECT * FROM (${individualSourcesSql}) src WHERE payment_id IN (${ids.map(()=>'?').join(',')})`,ids);for(const row of rows)unclaimed.set(row.payment_id,row);}
  const accepted:SettlementPreview['accepted']=[],conflicts:SettlementPreview['conflicts']=[],pins:{h:RowDataPacket;source:Awaited<ReturnType<typeof reviewSettlement>>}[]=[],seen=new Set<string>();
  for(const h of headers){try{
   if(seen.has(h.entitlement_id))throw new AuthError(409,'SETTLEMENT_DUPLICATE_ENTITLEMENT','Select only the current transaction for this stipend.');seen.add(h.entitlement_id);
   const source=await reviewSettlement(db,h,this.reviews,input.actualPaidOn,undefined,unclaimed.get(h.source_payment_id));pins.push({h,source});accepted.push({transactionId:h.id,name:h.name,amount:'5000.00'});
  }catch(e){if(!(e instanceof AuthError)||e.status>=500)throw e;conflicts.push({transactionId:h.id,name:h.name,reason:e.message});}}
  const basis=digest(JSON.stringify({version:'individual-settlement-preview/v1',input,pins:pins.map(p=>p.source),conflicts}));
  return {db,pins,preview:{basis,accepted,conflicts,count:accepted.length,amount:(accepted.length*5000).toFixed(2)} satisfies SettlementPreview};
 }
 preview(actor:string,raw:unknown){this.active();const input=settlementParse(settlementInput,raw);return this.authorization.readSnapshot(actor,'ovr.process',async db=>(await this.prepare(db,input)).preview);}
 commit(actor:string,rawKey:unknown,raw:unknown,requestId:string){
  this.active();const key=parseKey(rawKey),input=settlementParse(settlementCommit,raw),hash=digest(JSON.stringify({version:'individual-settlement-commit/v1',input}));
  return this.authorization.withPermission(actor,'ovr.process',async connection=>{
   let db=cachedReads(connection);const retry=await this.retry(db,actor,key,hash);if(retry)return retry;
   const prepared=await this.prepare(db,input.input,true);db=prepared.db;
   if(prepared.preview.conflicts.length||prepared.preview.basis!==input.basis||prepared.pins.length!==input.input.transactionIds.length)throw new AuthError(409,'SETTLEMENT_REVIEW_CHANGED','Payment evidence changed. Remove any conflicting entries and review the remaining selection again.',{conflicts:prepared.preview.conflicts});
   const results=[];for(const p of prepared.pins)results.push(await this.pay(db,p.h,p.source,actor,input.input.actualPaidOn,requestId,key,'authorizationDocumentsVerified' in input.input&&input.input.authorizationDocumentsVerified===true,input.input.mode==='bulk'&&input.scholarPersonalReleaseConfirmed===true));
   const result={count:results.length,amount:prepared.preview.amount,payments:results,status:'Paid'};await this.journal(db,actor,key,hash,result);return result;
  });
 }
 private async pay(db:PoolConnection,h:RowDataPacket,source:Awaited<ReturnType<typeof reviewSettlement>>,actor:string,actualPaidOn:string,requestId:string,key:string,authorizationDocumentsVerified=false,scholarPersonalReleaseConfirmed=false){
  const id=randomUUID(),revision=Number(h.transaction_revision)+1,[[user]]=await db.execute<RowDataPacket[]>('SELECT full_name FROM users WHERE id=?',[actor]);
  const evidence={version:'individual-cheque-release/v1',acknowledgedRelease:true,...(authorizationDocumentsVerified?{authorizationDocumentsVerified:true}:{}),...(scholarPersonalReleaseConfirmed?{scholarPersonalReleaseConfirmed:true}:{}),actualPaidOn,transactionId:h.id,entitlementId:h.entitlement_id,sourceKind:h.source_kind,sourceBatchId:h.source_batch_id,originalPaymentId:h.source_payment_id??null,omissionId:h.omission_id??null,approvalRevision:h.approval_revision??null,sourceHash:digest(JSON.stringify(source)),validatedSource:source,documents:source.documents};
  await appendIndividualEvent(db,h.id,revision,'paid',actor,{...evidence,paymentId:id});
  await db.execute("INSERT INTO payment_records(id,batch_id,batch_revision,cycle_id,scholarship_id,outcome,amount,effective_on,reference_text,remarks,actor_id,actor_name,unpaid_reason,recorded_at,source_kind,individual_transaction_id,individual_revision,entitlement_id,scholar_id,semester_id,release_evidence) VALUES(?,NULL,NULL,?,?,'paid',5000.00,?,?,?, ?,?,NULL,UTC_TIMESTAMP(6),'individual',?,?,?,?,?,?)",[id,source.cycleId,h.scholarship_id,actualPaidOn,h.internal_reference,'Acknowledged individual cheque release',actor,user.full_name,h.id,revision,h.entitlement_id,h.scholar_id,h.semester_id,JSON.stringify(evidence)]);
  const [[first]]=await db.execute<RowDataPacket[]>('SELECT payment_id FROM entitlement_release_links WHERE entitlement_id=?',[h.entitlement_id]);
  if(!first){const [[approval]]=await db.execute<RowDataPacket[]>("SELECT id FROM semester_entitlement_events WHERE entitlement_id=? AND action='approved' ORDER BY revision DESC LIMIT 1",[h.entitlement_id]);if(!approval)throw new AuthError(409,'OMISSION_APPROVAL_REQUIRED','A valid approved stipend entitlement is required.');await db.execute('INSERT INTO entitlement_release_links(entitlement_id,payment_id,approved_event_id,release_evidence,actor_id,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))',[h.entitlement_id,id,approval.id,JSON.stringify(evidence),actor]);}
  await db.execute('UPDATE entitlement_payment_routes SET transaction_id=?,event_transaction_id=?,event_revision=? WHERE entitlement_id=?',[h.id,h.id,revision,h.entitlement_id]);
  await individualAudit(db,h.id,actor,'cheque_paid',requestId,'Actual cheque released and receipt acknowledged.',{...evidence,paymentId:id,revision,key});
  return {transactionId:String(h.id),paymentId:id,revision};
 }
 command(actor:string,rawKey:unknown,raw:unknown,requestId:string){
  this.active();const input=settlementParse(settlementCommand,raw),key=parseKey(rawKey),hash=digest(JSON.stringify({version:'individual-settlement-command/v1',input}));
  const permission=['confirm-original','dismiss','approve-correction','reject-correction'].includes(input.action)?'payments.corrections.approve':['correct-date','request-correction'].includes(input.action)?'payments.correct':'ovr.process';
  return this.authorization.withPermission(actor,permission,async connection=>{
   const db=cachedReads(connection),retry=await this.retry(db,actor,key,hash);if(retry)return retry;
   const h=await settlementHeader(db,input.transactionId);await db.execute('SELECT id FROM semester_entitlements WHERE id=? FOR UPDATE',[h.entitlement_id]);
   if(Number(h.transaction_revision)!==input.expectedRevision)throw new AuthError(409,'SETTLEMENT_REVIEW_CHANGED','This transaction changed. Refresh and review it again.');
   let result:object;
   if(input.action==='forward'){
    const source=await reviewSettlement(db,h,this.reviews);if(digest(JSON.stringify(source))!==input.sourceHash)throw new AuthError(409,'SETTLEMENT_REVIEW_CHANGED','Documents or financial evidence changed. Review before forwarding.');
    if((await forwardingEvidence(db,h.id)).length)throw new AuthError(409,'SETTLEMENT_ALREADY_FORWARDED','Forwarding is already recorded. Review its history.');
    const revision=Number(h.transaction_revision)+1,evidence={version:'individual-forwarding/v1',documents:await availableDocumentVersions(db,h.id),sourceHash:input.sourceHash,externalAcceptance:'Not established by this internal forwarding record'};
    await appendIndividualEvent(db,h.id,revision,'forwarded',actor,evidence);await individualAudit(db,h.id,actor,'forwarded',requestId,'Staff confirmed physical forwarding; no external acceptance or payment is implied.',{...evidence,revision,key});result={transactionId:h.id,revision,status:'Forwarded'};
   }else if(input.action==='report'){
    const batch=await batchMetadata(db,h.source_batch_id),event=await appendReconciliationEvent(db,batch,actor,'reported',{transactionId:h.id,scholarshipId:h.scholarship_id,paymentId:(await individualPayment(db,h.id))?.id??null,humanId:h.human_id,name:h.name,description:input.description,...(input.discoveredPaidOn?{discoveredPaidOn:input.discoveredPaidOn,acknowledgedRelease:true}:{})},requestId,key);
    result={transactionId:h.id,caseId:event.id,status:'Needs Review'};
   }else if(input.action==='dismiss'){
    const batch=await batchMetadata(db,h.source_batch_id),original=await openCase(db,batch.id,input.caseId) as Awaited<ReturnType<typeof openCase>>&{transactionId?:string};
    if(original.transactionId!==h.id)throw new AuthError(409,'DISCREPANCY_PAYMENT_CHANGED','Select this individual transaction’s payment issue.');
    await appendReconciliationEvent(db,batch,actor,'dismissed',{...original,id:undefined,caseId:undefined,reason:input.reason},requestId,key,original);result={transactionId:h.id,caseId:original.id,status:'Issue resolved'};
   }else if(input.action==='confirm-original')result=await this.confirmOriginal(db,h,input,actor,key,requestId);
   else result=await this.correction(db,h,input,actor,key,requestId);
   await this.journal(db,actor,key,hash,result);return result;
  });
 }
 private async confirmOriginal(db:PoolConnection,h:RowDataPacket,input:Extract<SettlementCommand,{action:'confirm-original'}>,actor:string,key:string,requestId:string){
  const detail=await settlementDetail(db,h.id,this.reviews);
  if(detail.sourceHash!==input.sourceHash)throw new AuthError(409,'SETTLEMENT_REVIEW_CHANGED','The payment issue or transaction changed. Review it again.');
  const issue=(await settlementCases(db,h.scholarship_id,h.source_batch_id)).find(i=>i.id===input.caseId&&i.transactionId===h.id);
  if(!issue?.discoveredPaidOn||issue.acknowledgedRelease!==true||!['cancelled','original_paid_cancelled'].includes(h.action))throw new AuthError(409,'SETTLEMENT_CONFLICT_REQUIRED','A reported acknowledged payment against this cancelled original is required.');
  if(!h.active_transaction||h.active_transaction===h.id)throw new AuthError(409,'SETTLEMENT_CONFLICT_REQUIRED','Review the conflicting original and its active replacement together.');
  const replacement=await settlementHeader(db,h.active_transaction);
  let ancestor:RowDataPacket=replacement;const visited=new Set<string>();
  while(ancestor.replacement_of&&ancestor.replacement_of!==h.id){if(visited.has(ancestor.id)||visited.size>=200)throw new AuthError(409,'SETTLEMENT_EVIDENCE_INVALID','Replacement lineage requires technical review.');visited.add(ancestor.id);ancestor=await settlementHeader(db,ancestor.replacement_of);}
  const replacementPayment=await individualPayment(db,replacement.id);
  if(ancestor.replacement_of!==h.id||replacement.entitlement_id!==h.entitlement_id||replacementPayment?.outcome==='paid')throw new AuthError(409,'SETTLEMENT_CONFLICT_REQUIRED','A related unpaid replacement is required. An effective Paid replacement cannot be automatically voided.');
  const source=await reviewSettlement(db,h,this.reviews,issue.discoveredPaidOn,issue.id),revision=Number(replacement.transaction_revision)+1;
  await appendIndividualEvent(db,replacement.id,revision,'cancelled',actor,{version:'individual-conflict-resolution/v1',reason:input.reason,originalTransactionId:h.id,caseId:issue.id,replacementUnpaidConfirmed:true,forwarded:(await forwardingEvidence(db,replacement.id)).length>0,externalCancellation:'LDSS internal void only; retain financial-office history'});
  await releaseIndividualRoute(db,h.entitlement_id,replacement.id,revision);
  await individualAudit(db,replacement.id,actor,'replacement_voided',requestId,input.reason,{caseId:issue.id,originalTransactionId:h.id,revision,key,replacementUnpaidConfirmed:true});
  const result=await this.pay(db,h,source,actor,issue.discoveredPaidOn,requestId,key,input.authorizationDocumentsVerified===true);
  const batch=await batchMetadata(db,h.source_batch_id);
  await appendReconciliationEvent(db,batch,actor,'corrected',{transactionId:h.id,scholarshipId:h.scholarship_id,paymentId:result.paymentId,humanId:h.human_id,name:h.name,description:issue.description,reason:input.reason,replacementTransactionId:replacement.id},requestId,key,issue);
  return {...result,status:'Paid',replacementStatus:'Cancelled',caseId:issue.id};
 }
 private async correction(db:PoolConnection,h:RowDataPacket,input:Exclude<SettlementCommand,{action:'forward'|'report'|'dismiss'|'confirm-original'}>,actor:string,key:string,requestId:string){
  const payment=await individualPayment(db,h.id);if(!payment)throw new AuthError(409,'PAID_RECORD_REQUIRED','An existing individual payment record is required.');
  const [[pending]]=await db.execute<RowDataPacket[]>("SELECT snapshot FROM payment_corrections c WHERE individual_transaction_id=? AND state='pending' AND NOT EXISTS(SELECT 1 FROM payment_corrections n WHERE n.id=c.id AND n.version>c.version) ORDER BY individual_revision DESC LIMIT 1",[h.id]);
  const cycle=await currentPayout(db,payment.cycleId),deadline=await claimDeadline(db,h.semester_id),batch=await batchMetadata(db,h.source_batch_id);
  const open=!deadline.expired&&!!deadline.endsOn&&['open','locked'].includes(cycle.state)&&!cycle.periodUnavailable&&batch.state!=='closed';
  let correction:IndividualCorrection;
  if(input.action==='correct-date'||input.action==='request-correction'){
   if(pending)throw new AuthError(409,'PAYMENT_CORRECTION_PENDING','Resolve the pending correction before another change.');
   if(input.action==='correct-date'&&(!open||payment.outcome!=='paid'))throw new AuthError(423,'PAYMENT_CORRECTION_APPROVAL_REQUIRED','Closed or expired periods require a correction request and separate Coordinator review. The payroll stays closed.');
   const after={...payment,revision:Number(h.transaction_revision)+1,effectiveOn:input.actualPaidOn,...(input.action==='request-correction'?{outcome:input.outcome,amount:input.outcome==='paid'?'5000.00':'0.00'}:{})};
   if(after.outcome===payment.outcome&&after.effectiveOn===payment.effectiveOn)throw new AuthError(409,'PAYMENT_NO_CHANGE','The payment outcome and actual date are unchanged.');
   if(after.outcome==='paid')await this.validateCorrectedReceipt(db,h,after,deadline,input.action==='request-correction'&&input.priorReceiptConfirmed,input.action==='request-correction'?input.priorReceiptEvidence:'');
   correction={id:randomUUID(),version:1,paymentId:payment.id,batchId:null,individualTransactionId:h.id,revision:Number(h.transaction_revision)+1,state:input.action==='correct-date'?'applied':'pending',before:payment,proposed:after,...(input.action==='correct-date'?{after}:{}),reason:input.reason,requestedBy:actor,requestedAt:new Date().toISOString()};
   if(input.action==='request-correction')Object.assign(correction,{priorReceiptConfirmed:input.priorReceiptConfirmed,priorReceiptEvidence:input.priorReceiptEvidence});
  }else{
   if(!pending)throw new AuthError(409,'PAYMENT_CORRECTION_PENDING','This correction is no longer pending.');
   const original=decodeStoredJson<IndividualCorrection&{priorReceiptConfirmed?:boolean;priorReceiptEvidence?:string}>(pending.snapshot);
   if(original.id!==input.correctionId||original.requestedBy===actor)throw new AuthError(409,'SEPARATE_APPROVAL_REQUIRED','A different Coordinator must review the pending correction.');
   if(original.before.revision!==payment.revision)throw new AuthError(409,'SETTLEMENT_REVIEW_CHANGED','The effective payment changed after this request.');
   const approving=input.action==='approve-correction',after={...original.proposed,revision:Number(h.transaction_revision)+1};
   if(approving&&after.outcome==='paid')await this.validateCorrectedReceipt(db,h,after,deadline,original.priorReceiptConfirmed===true,original.priorReceiptEvidence??'');
   correction={...original,version:2,revision:Number(h.transaction_revision)+1,state:approving?'approved':'rejected',...(approving?{after}:{}),decidedBy:actor,decisionReason:input.reason};
  }
  await appendIndividualEvent(db,h.id,correction.revision,'payment_corrected',actor,{version:'individual-correction/v1',correctionId:correction.id,correctionState:correction.state,paymentId:payment.id,reason:input.reason});
  await db.execute('INSERT INTO payment_corrections(id,version,payment_id,batch_id,batch_revision,state,snapshot,actor_id,occurred_at,individual_transaction_id,individual_revision) VALUES(?,?,?,NULL,NULL,?,?,?,UTC_TIMESTAMP(6),?,?)',[correction.id,correction.version,payment.id,correction.state,JSON.stringify(correction),actor,h.id,correction.revision]);
  await individualAudit(db,h.id,actor,'payment_correction',requestId,input.reason,{key,correction});
  return {transactionId:h.id,correctionId:correction.id,revision:correction.revision,correctionState:correction.state,status:correction.after?.outcome==='not_paid'?'Needs Review':'Paid'};
 }
 private async validateCorrectedReceipt(db:PoolConnection,h:RowDataPacket,after:{id:string;effectiveOn:string|null;outcome:string},deadline:Awaited<ReturnType<typeof claimDeadline>>,priorReceiptConfirmed:boolean,priorReceiptEvidence:string){
  const [[period]]=await db.execute<RowDataPacket[]>("SELECT DATE_FORMAT(starts_on,'%Y-%m-%d') starts FROM semesters WHERE id=?",[h.semester_id]);
  if(!period?.starts||!after.effectiveOn||after.effectiveOn<period.starts||!deadline.endsOn||after.effectiveOn>deadline.endsOn)throw new AuthError(422,'INVALID_PAYMENT_DATE','Actual payment date must be within the approved semester.');
  if(deadline.expired&&!priorReceiptConfirmed)throw new AuthError(422,'PRIOR_RECEIPT_CONFIRMATION_REQUIRED','Confirm documentary evidence of acknowledged receipt before expiry. A correction cannot authorize late collection.');
  await assertNoPaidClaim(db,h.scholarship_id,h.semester_id,after.id);
  const current=await individualPayment(db,h.id);
  if(current?.outcome!=='paid'){
   if(!priorReceiptConfirmed||current?.releaseEvidence.acknowledgedRelease!==true)throw new AuthError(422,'PRIOR_RECEIPT_CONFIRMATION_REQUIRED','Confirm the existing acknowledged receipt evidence before restoring a Paid outcome.');
   // Restoring an outcome uses the existing release/compliance engine, never a
   // new eligibility calculation or a cached earlier approval.
   if(h.source_kind==='unclaimed')await this.reviews.individual.settlementReview(db,h,undefined,after.id);
   else await this.reviews.omitted.settlementReview(db,h,undefined,after.id);
  }
  void priorReceiptEvidence;
 }
}
