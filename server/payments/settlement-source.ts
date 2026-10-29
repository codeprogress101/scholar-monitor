import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {AuthError} from '../auth/service.js';
import {digest} from '../auth/crypto.js';
import {currentPayout} from '../payouts/service.js';
import {requireClaimOpen,assertNoPaidClaim} from '../ovr/reprocessing.js';
import {documentHeader,type DocumentReviewServices} from './document-source.js';
import {individualPayment,settlementCases} from './settlement-reads.js';
import {decodeStoredJson} from '../stored-json.js';
import type {SettlementRow,IndividualCorrection} from './settlement-model.js';

export async function settlementHeader(db:PoolConnection,id:string){
 const h=await documentHeader(db,id),snapshot=decodeStoredJson<Record<string,unknown>>(h.event_snapshot);
 if(digest(JSON.stringify(snapshot))!==h.event_hash)throw new AuthError(409,'SETTLEMENT_EVIDENCE_INVALID','Preserve this transaction for technical review.');
 return h;
}
export async function forwardingEvidence(db:PoolConnection,id:string){
 const [rows]=await db.execute<RowDataPacket[]>("SELECT revision,snapshot,snapshot_hash,recorded_at FROM individual_payment_events WHERE transaction_id=? AND action='forwarded' ORDER BY revision DESC LIMIT 25",[id]);
 return rows.map(r=>{const snapshot=decodeStoredJson<Record<string,unknown>>(r.snapshot);if(digest(JSON.stringify(snapshot))!==r.snapshot_hash)throw new AuthError(409,'SETTLEMENT_EVIDENCE_INVALID','Preserve the forwarding history for review.');return {revision:Number(r.revision),recordedAt:new Date(r.recorded_at).toISOString(),snapshot};});
}
export async function availableDocumentVersions(db:PoolConnection,id:string){
 const [rows]=await db.execute<RowDataPacket[]>('SELECT document_kind,revision,document_hash,generation_id FROM individual_document_contents c JOIN individual_document_versions v USING(transaction_id,document_kind,revision,document_hash) WHERE transaction_id=? ORDER BY document_kind',[id]);
 return rows.map(r=>({kind:String(r.document_kind),revision:Number(r.revision),hash:String(r.document_hash),generationId:String(r.generation_id)}));
}
export async function reviewSettlement(db:PoolConnection,h:RowDataPacket,reviews:DocumentReviewServices,actualPaidOn?:string,resolveCaseId?:string,loadedSource?:RowDataPacket){
 if(!resolveCaseId&&(!['prepared','cancel_rejected','forwarded'].includes(h.action)||h.active_transaction!==h.id))throw new AuthError(409,'SETTLEMENT_BLOCKED','Use the current prepared, unpaid transaction. Resolve cancellation or replacement first.');
 if(h.currency!=='PHP'||Number(h.amount_centavos)!==500000)throw new AuthError(409,'FULL_STIPEND_REQUIRED','The fixed approved stipend requires review.');
 const [[cycleRow]]=await db.execute<RowDataPacket[]>('SELECT cycle_id FROM ovr_batches WHERE id=?',[h.source_batch_id]),cycle=await currentPayout(db,cycleRow.cycle_id);
 if(!['open','locked'].includes(cycle.state)||cycle.periodUnavailable)throw new AuthError(423,'PAYMENT_PERIOD_UNAVAILABLE','The financial period is closed or unavailable. Use the reviewed historical correction procedure.');
 const [[period]]=await db.execute<RowDataPacket[]>("SELECT DATE_FORMAT(starts_on,'%Y-%m-%d') starts FROM semesters WHERE id=?",[h.semester_id]);
 if(actualPaidOn&&(!period?.starts||actualPaidOn<period.starts))throw new AuthError(422,'INVALID_PAYMENT_DATE','Actual payment date must fall within the approved semester.');
 await requireClaimOpen(db,h.semester_id,actualPaidOn);
 await assertNoPaidClaim(db,h.scholarship_id,h.semester_id);
 const [[dispute]]=await db.execute<RowDataPacket[]>(`SELECT d.id FROM payroll_reconciliation_events d JOIN scholarship_records r ON r.id=d.scholarship_id JOIN ovr_batches b ON b.id=d.batch_id JOIN payout_cycles c ON c.id=b.cycle_id WHERE r.scholar_id=? AND c.semester_id=? AND d.kind='reported' AND d.id<>? AND NOT EXISTS(SELECT 1 FROM payroll_reconciliation_events n WHERE n.case_id=d.id AND n.case_version>1) LIMIT 1`,[h.scholar_id,h.semester_id,resolveCaseId??'']);
 if(dispute)throw new AuthError(409,'SETTLEMENT_DISPUTED','Resolve the reported payment issue before recording another release.');
 const reviewed=h.source_kind==='unclaimed'?await reviews.individual.settlementReview(db,h,resolveCaseId,undefined,loadedSource):await reviews.omitted.settlementReview(db,h,resolveCaseId);
 const payment=await individualPayment(db,h.id);if(payment)throw new AuthError(409,'SETTLEMENT_ALREADY_RECORDED','This transaction already has a payment. Review its retained history and corrections.');
 const [[reconciliation]]=await db.execute<RowDataPacket[]>('SELECT COALESCE(MAX(revision),0) revision FROM payroll_reconciliation_events WHERE batch_id=?',[h.source_batch_id]);
 const [[review]]=await db.execute<RowDataPacket[]>('SELECT id,revision,source_hash FROM semester_review_events WHERE scholar_semester_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE',[h.scholar_semester_id]);
 if(!review)throw new AuthError(409,'SETTLEMENT_BLOCKED','An authoritative semester review is required before recording release.');
 return {version:'individual-settlement-source/v1',transactionId:String(h.id),entitlementId:String(h.entitlement_id),revision:Number(h.transaction_revision),eventHash:String(h.event_hash),route:h.active_transaction??null,routeRevision:Number(h.route_revision),entitlementRevision:Number(h.entitlement_revision),cycleId:cycle.id,cycleVersion:cycle.version,reconciliationRevision:Number(reconciliation.revision),semesterReview:{id:String(review.id),revision:Number(review.revision),sourceHash:String(review.source_hash)},reviewedHash:digest(JSON.stringify(reviewed)),documents:await availableDocumentVersions(db,h.id)};
}
export async function settlementDetail(db:PoolConnection,id:string,reviews:DocumentReviewServices){
 const h=await settlementHeader(db,id),payment=await individualPayment(db,id),forwarding=await forwardingEvidence(db,id),issues=await settlementCases(db,h.scholarship_id,h.source_batch_id),documents=await availableDocumentVersions(db,id),blockers:string[]=[];
 let source:Awaited<ReturnType<typeof reviewSettlement>>|null=null;
 if(!payment)try{source=await reviewSettlement(db,h,reviews);}catch(e){if(!(e instanceof AuthError)||e.status>=500)throw e;blockers.push(e.message);}
 const [pending]=await db.execute<RowDataPacket[]>("SELECT snapshot FROM payment_corrections WHERE individual_transaction_id=? AND state='pending' AND NOT EXISTS(SELECT 1 FROM payment_corrections n WHERE n.id=payment_corrections.id AND n.version>payment_corrections.version) ORDER BY individual_revision DESC",[id]);
 const status=['cancelled','original_paid_cancelled'].includes(h.action)?'Cancelled':issues.length||pending.length?'Needs Review':payment?.outcome==='paid'?'Paid':payment||blockers.length?'Needs Review':forwarding.length?'Forwarded':documents.length?'Documents Ready':'Pending Payment';
 const row:SettlementRow={transactionId:id,entitlementId:h.entitlement_id,scholarshipId:h.scholarship_id,humanId:h.human_id,name:h.name,semester:h.semester,academicYear:h.academic_year,amount:(Number(h.amount_centavos)/100).toFixed(2),sourceKind:h.source_kind,reference:h.internal_reference,revision:Number(h.transaction_revision),status,originalPayrollOutcome:h.source_kind==='unclaimed'?'Unclaimed':'Omitted',settlement:payment,forwarded:forwarding.length>0,blockers};
 return {...row,sourceHash:source?digest(JSON.stringify(source)):digest(JSON.stringify({header:h,eventHash:h.event_hash,payment,issues:issues.map(v=>v.id)})),documents,forwarding,issues,pendingCorrections:pending.map(r=>decodeStoredJson<IndividualCorrection>(r.snapshot)),warnings:forwarding.length&&status==='Cancelled'?['LDSS cancellation did not cancel the forwarded document or cheque at the financial office.']:[]};
}
