import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {AuthError} from '../auth/service.js';
import {decodeStoredJson} from '../stored-json.js';
import {parseRequirementList} from '../requirements/validation.js';
import {effectivePayments} from '../ovr/payment-correction-state.js';
import {verifiedEvent} from './reconciliation-reads.js';
import {primeRead} from '../read-cache.js';
import type {ReconciliationEvent} from './reconciliation-model.js';
import type {IndividualCorrection,IndividualSettlement,SettlementRow} from './settlement-model.js';

// Canonical individual attempts, bounded by permanent scholar aliases. Payroll
// readers remain payroll-only so an original Unclaimed outcome stays unchanged.
export const individualClaimsSql=`SELECT target.id target_id,p.*,t.source_batch_id,t.source_kind individual_source_kind,
 DATE_FORMAT(p.effective_on,'%Y-%m-%d') paid_on,DATE_FORMAT(p.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') recorded,
 c.snapshot correction,c.state correction_state,c.individual_revision correction_revision
 FROM payment_records p JOIN individual_payment_transactions t ON t.id=p.individual_transaction_id
 JOIN semester_entitlements ent ON ent.id=p.entitlement_id AND ent.semester_id=p.semester_id AND ent.scholar_id=p.scholar_id
 JOIN scholarship_records target ON target.scholar_id=ent.scholar_id
 LEFT JOIN payment_corrections c ON c.payment_id=p.id AND c.state IN ('applied','approved')
 AND NOT EXISTS(SELECT 1 FROM payment_corrections n WHERE n.payment_id=c.payment_id AND n.state IN ('applied','approved') AND n.individual_revision>c.individual_revision)
 WHERE target.id=? AND p.semester_id=? AND p.source_kind='individual' ORDER BY p.recorded_at,p.id LOCK IN SHARE MODE`;
export const individualPendingClaimsSql=`SELECT target.id target_id,c.snapshot FROM payment_corrections c JOIN payment_records p ON p.id=c.payment_id JOIN semester_entitlements ent ON ent.id=p.entitlement_id AND ent.semester_id=p.semester_id AND ent.scholar_id=p.scholar_id JOIN scholarship_records target ON target.scholar_id=ent.scholar_id WHERE target.id=? AND p.semester_id=? AND p.source_kind='individual' AND c.state='pending' AND NOT EXISTS(SELECT 1 FROM payment_corrections n WHERE n.id=c.id AND n.version>c.version) ORDER BY c.individual_revision LOCK IN SHARE MODE`;
export function individualPaymentRow(r:RowDataPacket):IndividualSettlement{
 const original:IndividualSettlement={id:r.id,batchId:null,sourceKind:'individual',individualTransactionId:r.individual_transaction_id,entitlementId:r.entitlement_id,sourceBatchId:r.source_batch_id,sourceKindDetail:r.individual_source_kind,revision:Number(r.individual_revision),cycleId:r.cycle_id,scholarshipId:r.scholarship_id,outcome:r.outcome,amount:String(r.amount),effectiveOn:r.paid_on,reference:r.reference_text,remarks:r.remarks,actorId:r.actor_id,actorName:r.actor_name,recordedAt:r.recorded,releaseEvidence:decodeStoredJson(r.release_evidence)};
 if(!r.correction)return original;
 const correction=decodeStoredJson<IndividualCorrection>(r.correction);
 if(correction.paymentId!==original.id||correction.individualTransactionId!==original.individualTransactionId||!correction.after||correction.after.id!==original.id||correction.after.entitlementId!==original.entitlementId||correction.after.batchId!==null||correction.after.individualTransactionId!==original.individualTransactionId)throw new AuthError(409,'SETTLEMENT_EVIDENCE_INVALID','Preserve the payment correction for technical review.');
 const after=correction.after,mutable=new Set(['revision','outcome','amount','effectiveOn']);
 if(!Number.isInteger(after.revision)||after.revision<=original.revision||after.revision!==correction.revision||!['paid','not_paid'].includes(after.outcome)||after.amount!==(after.outcome==='paid'?'5000.00':'0.00')||(after.outcome==='paid'?typeof after.effectiveOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(after.effectiveOn):after.effectiveOn!==null)||Object.keys(original).some(k=>!mutable.has(k)&&JSON.stringify(original[k as keyof IndividualSettlement])!==JSON.stringify(after[k as keyof IndividualSettlement])))throw new AuthError(409,'SETTLEMENT_EVIDENCE_INVALID','Preserve the payment correction for technical review.');
 return effectivePayments([original],[{...correction,after:{...original,revision:after.revision,outcome:after.outcome,amount:after.amount,effectiveOn:after.effectiveOn}}])[0];
}
export async function individualClaims(db:PoolConnection,ids:readonly string[],semester:string){
 const attempts=new Map<string,IndividualSettlement[]>(ids.map(id=>[id,[]])),pending=new Map<string,IndividualCorrection[]>(ids.map(id=>[id,[]]));
 const selected=[...new Set(ids)].sort();
 for(let offset=0;offset<selected.length;offset+=200){const chunk=selected.slice(offset,offset+200),marks=chunk.map(()=>'?').join(',');if(!chunk.length)continue;
  const [rows]=await db.execute<RowDataPacket[]>(chunk.length===1?individualClaimsSql:individualClaimsSql.replace('target.id=?',`target.id IN (${marks})`),[...chunk,semester]);
  for(const r of rows)attempts.get(r.target_id)!.push(individualPaymentRow(r));
  const [corrections]=await db.execute<RowDataPacket[]>(chunk.length===1?individualPendingClaimsSql:individualPendingClaimsSql.replace('target.id=?',`target.id IN (${marks})`),[...chunk,semester]);
  for(const r of corrections)pending.get(r.target_id)!.push(decodeStoredJson<IndividualCorrection>(r.snapshot));
 }
 return {attempts,pending};
}
/** Only callers that actually need point claim reads request this preload.
 * Registry's displayed annuals are bounded; Dashboard/document-only counts do
 * not load payment sources. The existing cache clears these on every write. */
export async function primeIndividualClaims(db:PoolConnection,annuals:readonly string[],semester:string){
 const selected=[...new Set(annuals)].sort();for(let offset=0;offset<selected.length;offset+=200){const ids=selected.slice(offset,offset+200),marks=ids.map(()=>'?').join(',');
  for(const sql of [individualClaimsSql,individualPendingClaimsSql]){const [rows]=await db.execute<RowDataPacket[]>(sql.replace('target.id=?',`target.id IN (${marks})`),[...ids,semester]),groups=new Map<string,RowDataPacket[]>();
   for(const row of rows){const group=groups.get(row.target_id)??[];group.push(row);groups.set(row.target_id,group);}for(const id of ids)primeRead(db,sql,[id,semester],groups.get(id)??[]);
  }
 }
}
export async function individualPayment(db:PoolConnection,transactionId:string){
 const [[r]]=await db.execute<RowDataPacket[]>(`SELECT p.*,t.source_batch_id,t.source_kind individual_source_kind,DATE_FORMAT(p.effective_on,'%Y-%m-%d') paid_on,DATE_FORMAT(p.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') recorded,c.snapshot correction
 FROM payment_records p JOIN individual_payment_transactions t ON t.id=p.individual_transaction_id LEFT JOIN payment_corrections c ON c.payment_id=p.id AND c.state IN ('applied','approved') AND NOT EXISTS(SELECT 1 FROM payment_corrections n WHERE n.payment_id=c.payment_id AND n.state IN ('applied','approved') AND n.individual_revision>c.individual_revision) WHERE p.individual_transaction_id=? LOCK IN SHARE MODE`,[transactionId]);
 return r?individualPaymentRow(r):null;
}
export async function settlementCases(db:PoolConnection,scholarshipId:string,batchId:string){
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT e.snapshot,e.snapshot_hash FROM payroll_reconciliation_events e WHERE e.batch_id=? AND e.scholarship_id=? AND e.kind='reported' AND NOT EXISTS(SELECT 1 FROM payroll_reconciliation_events n WHERE n.case_id=e.id AND n.case_version>1) ORDER BY e.revision DESC`,[batchId,scholarshipId]);
 return rows.map(r=>verifiedEvent<ReconciliationEvent&{transactionId?:string;discoveredPaidOn?:string;acknowledgedRelease?:boolean}>(r));
}
export const settlementQueueSql=`FROM individual_payment_transactions t JOIN semester_entitlements e ON e.id=t.entitlement_id
 LEFT JOIN payment_records origin ON origin.id=t.source_payment_id LEFT JOIN payroll_omissions o ON o.id=t.omission_id
 JOIN scholarship_records r ON r.id=COALESCE(origin.scholarship_id,o.scholarship_id) AND r.scholar_id=e.scholar_id
 JOIN scholars s ON s.id=e.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id
 JOIN semesters sem ON sem.id=e.semester_id JOIN academic_years y ON y.id=sem.academic_year_id
 JOIN individual_payment_events ev ON ev.transaction_id=t.id AND NOT EXISTS(SELECT 1 FROM individual_payment_events n WHERE n.transaction_id=ev.transaction_id AND n.revision>ev.revision)
 LEFT JOIN payment_records p ON p.individual_transaction_id=t.id
 LEFT JOIN payment_corrections c ON c.payment_id=p.id AND c.state IN ('applied','approved') AND NOT EXISTS(SELECT 1 FROM payment_corrections n WHERE n.payment_id=c.payment_id AND n.state IN ('applied','approved') AND n.individual_revision>c.individual_revision)`;
export async function settlementPage(db:PoolConnection,raw:unknown){
 const {view='pending',...filters}=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};if(!['pending','paid','cancelled','review','all'].includes(String(view)))throw new AuthError(422,'VALIDATION_FAILED','Choose Pending Payment, Paid, Needs Review or history.');
 const q=parseRequirementList(filters),paid="IF(c.id IS NULL,p.outcome,JSON_UNQUOTE(JSON_EXTRACT(c.snapshot,'$.after.outcome')))='paid'",cancelled="ev.action IN ('cancelled','original_paid_cancelled')";
 const disputed="EXISTS(SELECT 1 FROM payroll_reconciliation_events d WHERE d.batch_id=t.source_batch_id AND d.scholarship_id=r.id AND d.kind='reported' AND NOT EXISTS(SELECT 1 FROM payroll_reconciliation_events n WHERE n.case_id=d.id AND n.case_version>1))";
 const review=`(${disputed} OR ev.action='cancel_requested' OR (p.id IS NOT NULL AND NOT(${paid})) OR EXISTS(SELECT 1 FROM payment_corrections pending WHERE pending.individual_transaction_id=t.id AND pending.state='pending' AND NOT EXISTS(SELECT 1 FROM payment_corrections decided WHERE decided.id=pending.id AND decided.version>pending.version)))`;
 const scope=view==='paid'?paid:view==='cancelled'?cancelled:view==='review'?review:view==='pending'?`NOT(${cancelled}) AND p.id IS NULL AND ev.action IN ('prepared','forwarded','cancel_rejected','cancel_requested')`:'1=1';
 const where=`WHERE ${scope} AND (LOCATE(LOWER(?),LOWER(CONCAT_WS(' ',s.last_name,s.first_name,s.middle_name)))>0 OR LOCATE(LOWER(?),LOWER(i.human_id))>0)`;
 const [[count]]=await db.execute<RowDataPacket[]>(`SELECT COUNT(*) n ${settlementQueueSql} ${where}`,[q.q,q.q]);
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT t.id,t.entitlement_id,t.source_kind,t.internal_reference,r.id scholarship_id,i.human_id,CONCAT_WS(' ',s.last_name,s.first_name,s.middle_name) name,sem.name semester,y.code academic_year,e.amount_centavos,ev.revision,ev.action,p.id payment_id,${paid} is_paid,${review} needs_review,
 EXISTS(SELECT 1 FROM individual_payment_events f WHERE f.transaction_id=t.id AND f.action='forwarded') forwarded,
 (SELECT COUNT(*) FROM individual_document_contents dc WHERE dc.transaction_id=t.id) documents
 ${settlementQueueSql} ${where} ORDER BY i.human_id,t.recorded_at,t.id LIMIT ${q.limit} OFFSET ${q.offset}`,[q.q,q.q]);
 return {items:rows.map(r=>({transactionId:r.id,entitlementId:r.entitlement_id,scholarshipId:r.scholarship_id,humanId:r.human_id,name:r.name,semester:r.semester,academicYear:r.academic_year,amount:(Number(r.amount_centavos)/100).toFixed(2),sourceKind:r.source_kind,reference:r.internal_reference,revision:Number(r.revision),status:['cancelled','original_paid_cancelled'].includes(r.action)?'Cancelled':r.needs_review?'Needs Review':r.is_paid?'Paid':r.forwarded?'Forwarded':r.documents?'Documents Ready':'Pending Payment',originalPayrollOutcome:r.source_kind==='unclaimed'?'Unclaimed':'Omitted',settlement:null,paymentRecorded:Boolean(r.payment_id),forwarded:Boolean(r.forwarded),blockers:[]} satisfies SettlementRow)),total:Number(count.n),offset:q.offset,limit:q.limit};
}
export async function settlementSummary(db:PoolConnection){
 const paid="IF(c.id IS NULL,p.outcome,JSON_UNQUOTE(JSON_EXTRACT(c.snapshot,'$.after.outcome')))='paid'";
 const [[r]]=await db.execute<RowDataPacket[]>(`SELECT COUNT(DISTINCT e.id) entitlements,COUNT(DISTINCT IF(${paid},e.id,NULL)) paid,COUNT(DISTINCT IF(t.source_kind='unclaimed',e.id,NULL)) original_unclaimed,COUNT(DISTINCT IF(t.source_kind='omitted',e.id,NULL)) omitted,COUNT(IF(${paid},p.id,NULL)) paid_attempts ${settlementQueueSql}`);
 return {entitlements:Number(r.entitlements),paidEntitlements:Number(r.paid),paidAmount:(Number(r.paid)*5000).toFixed(2),paidAttempts:Number(r.paid_attempts),financialConflict:Number(r.paid_attempts)!==Number(r.paid),originalUnclaimedEntitlements:Number(r.original_unclaimed),omittedEntitlements:Number(r.omitted),basis:'Original payroll outcomes are retained; individual settlement counts each entitlement once.'};
}
export async function settlementCorrectionHistory(db:PoolConnection,id:string,raw:unknown){
 const q=parseRequirementList(raw),[[count]]=await db.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM payment_corrections WHERE individual_transaction_id=?',[id]);
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT c.snapshot,c.occurred_at,u.full_name FROM payment_corrections c JOIN users u ON u.id=c.actor_id WHERE c.individual_transaction_id=? ORDER BY c.individual_revision DESC LIMIT ${q.limit} OFFSET ${q.offset}`,[id]);
 return {items:rows.map(r=>{const c=decodeStoredJson<IndividualCorrection>(r.snapshot);if(c.individualTransactionId!==id||c.batchId!==null||c.before.id!==c.paymentId||c.proposed.id!==c.paymentId)throw new AuthError(409,'SETTLEMENT_EVIDENCE_INVALID','Preserve this correction history for technical review.');return {id:c.id,version:c.version,state:c.state,before:{outcome:c.before.outcome,amount:c.before.amount,actualPaidOn:c.before.effectiveOn},proposed:{outcome:c.proposed.outcome,amount:c.proposed.amount,actualPaidOn:c.proposed.effectiveOn},after:c.after?{outcome:c.after.outcome,amount:c.after.amount,actualPaidOn:c.after.effectiveOn}:null,reason:c.decisionReason??c.reason,requestReason:c.reason,actor:r.full_name,recordedAt:new Date(r.occurred_at).toISOString()};}),total:Number(count.n),offset:q.offset,limit:q.limit};
}
