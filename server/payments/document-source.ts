import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {AuthError} from '../auth/service.js';
import {digest} from '../auth/crypto.js';
import type {IndividualPaymentService} from './individual-service.js';
import type {OmissionPaymentService} from './omission-service.js';
import type {DocumentSource} from './document-model.js';

export type DocumentReviewServices={individual:IndividualPaymentService;omitted:OmissionPaymentService};
export async function documentHeader(db:PoolConnection,id:string){
 const [[r]]=await db.execute<RowDataPacket[]>(`SELECT t.*,ev.revision transaction_revision,ev.action,ev.snapshot event_snapshot,ev.snapshot_hash event_hash,
 ent.scholar_id,ent.scholar_semester_id,ent.amount_centavos,ent.currency,
 (SELECT MAX(revision) FROM semester_entitlement_events ee WHERE ee.entitlement_id=ent.id) entitlement_revision,
 annual.id scholarship_id,i.human_id,CONCAT_WS(' ',s.last_name,s.first_name,NULLIF(s.middle_name,''),NULLIF(s.suffix,'')) name,
 sem.id semester_id,sem.version semester_revision,sem.name semester,y.code academic_year,b.code batch_code,
 route.transaction_id active_transaction,route.event_revision route_revision
 FROM individual_payment_transactions t JOIN individual_payment_events ev ON ev.transaction_id=t.id
 JOIN semester_entitlements ent ON ent.id=t.entitlement_id
 LEFT JOIN payment_records original_payment ON original_payment.id=t.source_payment_id LEFT JOIN payroll_omissions omission ON omission.id=t.omission_id
 JOIN scholarship_records annual ON annual.id=COALESCE(original_payment.scholarship_id,omission.scholarship_id) AND annual.scholar_id=ent.scholar_id
 JOIN scholars s ON s.id=ent.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id
 JOIN semesters sem ON sem.id=ent.semester_id JOIN academic_years y ON y.id=sem.academic_year_id
 JOIN ovr_batches b ON b.id=t.source_batch_id LEFT JOIN entitlement_payment_routes route ON route.entitlement_id=ent.id
 WHERE t.id=? AND NOT EXISTS(SELECT 1 FROM individual_payment_events n WHERE n.transaction_id=ev.transaction_id AND n.revision>ev.revision) LOCK IN SHARE MODE`,[id]);
 if(!r)throw new AuthError(404,'DOCUMENT_TRANSACTION_NOT_FOUND','This individual transaction is unavailable to your account.');return r;
}
export async function preparedDocumentSource(db:PoolConnection,id:string,services:DocumentReviewServices,header?:RowDataPacket){
 const r={...(header??await documentHeader(db,id))};
 // Forwarding records an external handoff, not a document-source revision.
 // Retain the precise prepared basis so forwarding does not invalidate files.
 if(r.action==='forwarded'){const [[prepared]]=await db.execute<RowDataPacket[]>("SELECT action,revision,snapshot,snapshot_hash FROM individual_payment_events WHERE transaction_id=? AND action<>'forwarded' ORDER BY revision DESC LIMIT 1",[id]);if(prepared){r.action=prepared.action;r.transaction_revision=prepared.revision;r.event_snapshot=prepared.snapshot;r.event_hash=prepared.snapshot_hash;}}
 if(r.active_transaction!==r.id||!['prepared','cancel_rejected'].includes(r.action))throw new AuthError(409,'DOCUMENT_UNAVAILABLE','Documents require the current prepared unpaid transaction. Review its route or cancellation.');
 const event=typeof r.event_snapshot==='string'?JSON.parse(r.event_snapshot):r.event_snapshot;
 if(digest(JSON.stringify(event))!==r.event_hash)throw new AuthError(409,'DOCUMENT_EVIDENCE_INVALID','Preserve this transaction for technical review.');
 if(r.currency!=='PHP'||Number(r.amount_centavos)!==500000)throw new AuthError(409,'DOCUMENT_EVIDENCE_INVALID','The approved stipend entitlement requires review.');
 const reviewed=r.source_kind==='unclaimed'?await services.individual.documentReview(db,r):await services.omitted.documentReview(db,r);
 const source:DocumentSource={version:'individual-document-source/v1',transactionId:r.id,sourceKind:r.source_kind,reference:r.internal_reference,entitlementId:r.entitlement_id,scholarId:r.scholar_id,scholarshipId:r.scholarship_id,humanId:r.human_id,name:r.name,academicYear:r.academic_year,semester:r.semester,amountCentavos:Number(r.amount_centavos),currency:'PHP',sourceBatchId:r.source_batch_id,batchCode:r.batch_code,
 basis:{transactionRevision:Number(r.transaction_revision),eventHash:r.event_hash,routeRevision:Number(r.route_revision),entitlementRevision:Number(r.entitlement_revision),semesterRevision:Number(r.semester_revision),reviewedHash:digest(JSON.stringify(reviewed)),approvalRevision:r.approval_revision??null}};
 return {source,hash:digest(JSON.stringify(source))};
}
