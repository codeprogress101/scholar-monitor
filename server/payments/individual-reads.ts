import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {AuthError} from '../auth/service.js';
import {digest} from '../auth/crypto.js';
import {parseRequirementList} from '../requirements/validation.js';
import {claimPeriodEnded} from '../ovr/claim-deadline.js';
import {effectiveOutcomeSql,effectiveUnpaidReasonSql,effectivePaymentJoinsSql} from './effective-payment-sql.js';
import {individualState,type IndividualAction,type IndividualRow} from './individual-model.js';

// Relational identity and effective outcomes only. No eligibility/cohort graph,
// frozen JSON decoding, or per-row service calls on queue/search/pagination.
// Drive the paid-elsewhere subquery from the indexed permanent-scholar aliases.
// After source-index DDL or a bulk import, stale statistics otherwise permit a
// cohort-wide payment scan for each scholar. STRAIGHT_JOIN changes only the plan.
export const individualSourcesSql=`SELECT p.id AS payment_id,p.batch_id,p.scholarship_id,r.scholar_id,
 e.id AS entitlement_id,e.semester_id,e.amount_centavos,t.version AS semester_revision,a.batch_id AS root_batch_id,
 b.code AS batch_code,y.code AS academic_year,t.name AS semester,
 DATE_FORMAT(t.ends_on,'%Y-%m-%d') AS ends_on,DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR),'%Y-%m-%d') AS day,
 i.human_id,CONCAT_WS(' ',s.last_name,s.first_name,NULLIF(s.middle_name,''),NULLIF(s.suffix,'')) AS name,
 ${effectiveOutcomeSql} AS effective_outcome,${effectiveUnpaidReasonSql} AS unpaid_reason,
 EXISTS(SELECT 1 FROM scholarship_records paid_annual STRAIGHT_JOIN payment_records p ON p.scholarship_id=paid_annual.id STRAIGHT_JOIN payout_cycles paid_cycle ON paid_cycle.id=p.cycle_id
 ${effectivePaymentJoinsSql} WHERE paid_annual.scholar_id=r.scholar_id AND paid_cycle.semester_id=e.semester_id AND ${effectiveOutcomeSql}='paid') AS paid_elsewhere,
 (SELECT revision FROM ovr_batch_events be WHERE be.batch_id=p.batch_id ORDER BY revision DESC LIMIT 1) AS batch_revision,
 (SELECT state FROM ovr_batch_events be WHERE be.batch_id=p.batch_id ORDER BY revision DESC LIMIT 1) AS batch_state,
 EXISTS(SELECT 1 FROM ovr_amendments am WHERE am.batch_id=p.batch_id AND am.state='approved') AS amended,
 tx.id AS transaction_id,tx.internal_reference,ev.revision,ev.action,
 EXISTS(SELECT 1 FROM payment_corrections pc JOIN payment_records pp ON pp.id=pc.payment_id JOIN scholarship_records rr ON rr.id=pp.scholarship_id JOIN payout_cycles cc ON cc.id=pp.cycle_id
 WHERE rr.scholar_id=r.scholar_id AND cc.semester_id=e.semester_id AND pc.state='pending' AND NOT EXISTS(SELECT 1 FROM payment_corrections nx WHERE nx.id=pc.id AND nx.version>pc.version)) AS pending_correction,
 EXISTS(SELECT 1 FROM payroll_historical_receipts h JOIN scholarship_records rr ON rr.id=h.scholarship_id JOIN ovr_batches hb ON hb.id=h.batch_id JOIN payout_cycles hc ON hc.id=hb.cycle_id
 WHERE rr.scholar_id=r.scholar_id AND hc.semester_id=e.semester_id AND h.state='pending' AND NOT EXISTS(SELECT 1 FROM payroll_historical_receipts hn WHERE hn.id=h.id AND hn.version>h.version)) AS pending_receipt,
 EXISTS(SELECT 1 FROM payroll_reconciliation_events d WHERE d.batch_id=p.batch_id AND d.scholarship_id=p.scholarship_id AND d.kind='reported' AND NOT EXISTS(SELECT 1 FROM payroll_reconciliation_events dn WHERE dn.case_id=d.id AND dn.case_version>1)) AS disputed,
 EXISTS(SELECT 1 FROM payroll_reprocessing q LEFT JOIN payroll_reprocessing_attempts atp ON atp.reprocessing_id=q.id
 WHERE q.entitlement_id=e.id AND (atp.batch_id IS NOT NULL OR EXISTS(SELECT 1 FROM payroll_reprocessing_events qe WHERE qe.reprocessing_id=q.id AND qe.destination_batch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM payroll_reprocessing_events qn WHERE qn.reprocessing_id=qe.reprocessing_id AND qn.revision>qe.revision)))) AS other_route
 FROM payment_records p JOIN scholarship_records r ON r.id=p.scholarship_id
 JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id
 JOIN payout_cycles pc ON pc.id=p.cycle_id JOIN semesters t ON t.id=pc.semester_id JOIN academic_years y ON y.id=t.academic_year_id
 JOIN semester_entitlements e ON e.scholar_id=r.scholar_id AND e.semester_id=t.id
 JOIN payroll_allocations a ON a.entitlement_id=e.id
 JOIN ovr_batches b ON b.id=p.batch_id JOIN ovr_finalizations f ON f.batch_id=p.batch_id
 ${effectivePaymentJoinsSql}
 LEFT JOIN individual_payment_transactions tx ON tx.entitlement_id=e.id AND tx.source_kind='unclaimed' AND NOT EXISTS(SELECT 1 FROM individual_payment_transactions nt WHERE nt.entitlement_id=tx.entitlement_id AND nt.source_kind='unclaimed' AND (nt.recorded_at>tx.recorded_at OR nt.recorded_at=tx.recorded_at AND nt.id>tx.id))
 LEFT JOIN individual_payment_events ev ON ev.transaction_id=tx.id AND NOT EXISTS(SELECT 1 FROM individual_payment_events ne WHERE ne.transaction_id=ev.transaction_id AND ne.revision>ev.revision)
 WHERE (p.batch_id=a.batch_id OR EXISTS(SELECT 1 FROM payroll_reprocessing_attempts pa JOIN payroll_reprocessing pq ON pq.id=pa.reprocessing_id WHERE pa.batch_id=p.batch_id AND pa.scholarship_id=p.scholarship_id AND pq.entitlement_id=e.id))`;
export function sourceBlockers(r:RowDataPacket){
 const reasons:string[]=[];
 if(r.effective_outcome!=='not_paid'||r.unpaid_reason!=='did_not_claim')reasons.push('The effective outcome is no longer Unclaimed.');
 if(!['processed','closed'].includes(r.batch_state)||r.amended)reasons.push('The original payroll requires financial review.');
 if(claimPeriodEnded(r.ends_on,r.day))reasons.push(r.ends_on?'The semester claiming period has ended. No late-payment authority is recorded.':'The semester end date is unavailable.');
 if(r.pending_correction)reasons.push('Resolve the pending payment correction.');
 if(r.pending_receipt)reasons.push('Resolve the pending historical receipt.');
 if(r.disputed)reasons.push('Resolve the reported payment discrepancy.');
 if(r.other_route)reasons.push('An existing payroll reprocessing route must be resolved first.');
 return reasons;
}
export function individualRow(r:RowDataPacket):IndividualRow{
 const blockers=sourceBlockers(r);
 const cancelled=['cancelled','original_paid_cancelled'].includes(r.action);
 return {paymentId:r.payment_id,entitlementId:r.entitlement_id,scholarshipId:r.scholarship_id,humanId:r.human_id,name:r.name,academicYear:r.academic_year,semester:r.semester,batchCode:r.batch_code,amount:(Number(r.amount_centavos)/100).toFixed(2),outcome:r.effective_outcome==='paid'||r.paid_elsewhere?'Paid':r.effective_outcome==='not_paid'&&r.unpaid_reason==='did_not_claim'?'Unclaimed':'Needs Review',transactionId:r.transaction_id??null,internalReference:r.internal_reference??null,revision:Number(r.revision??0),status:cancelled?'Cancelled':blockers.length?'Needs Review':r.action?individualState(r.action):'Awaiting Request',blockers};
}
export async function individualPage(db:PoolConnection,raw:unknown){
 const {view='unclaimed',...filters}=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 if(!['unclaimed','cancelled'].includes(String(view)))throw new AuthError(422,'VALIDATION_FAILED','Choose Unclaimed stipends or cancelled history.');
 const q=parseRequirementList(filters),scope=view==='cancelled'?"action IN ('cancelled','original_paid_cancelled')":"effective_outcome='not_paid' AND unpaid_reason='did_not_claim' AND paid_elsewhere=0";
 const where=scope+" AND (LOCATE(LOWER(?),LOWER(name))>0 OR LOCATE(LOWER(?),LOWER(human_id))>0)";
 const [[count]]=await db.execute<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM (${individualSourcesSql}) src WHERE ${where}`,[q.q,q.q]);
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT * FROM (${individualSourcesSql}) src WHERE ${where} ORDER BY human_id,payment_id LIMIT ${q.limit} OFFSET ${q.offset}`,[q.q,q.q]);
 return {items:rows.map(individualRow),total:Number(count.n),offset:q.offset,limit:q.limit};
}
export async function individualSource(db:PoolConnection,paymentId:string){
 const [[r]]=await db.execute<RowDataPacket[]>(`SELECT * FROM (${individualSourcesSql}) src WHERE payment_id=?`,[paymentId]);
 if(!r)throw new AuthError(409,'UNCLAIMED_SOURCE_UNAVAILABLE','A reliable original payroll payment and semester entitlement are required. Legacy or omitted records need their existing reviewed procedure.');return r;
}
export async function individualHistory(db:PoolConnection,entitlementId:string,raw:unknown){
 const q=parseRequirementList(raw);
 const [[count]]=await db.execute<RowDataPacket[]>('SELECT COUNT(*) AS n FROM individual_payment_events e JOIN individual_payment_transactions t ON t.id=e.transaction_id WHERE t.entitlement_id=?',[entitlementId]);
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT e.*,t.internal_reference,t.replacement_of,u.full_name FROM individual_payment_events e JOIN individual_payment_transactions t ON t.id=e.transaction_id JOIN users u ON u.id=e.actor_id WHERE t.entitlement_id=? ORDER BY e.recorded_at DESC,e.transaction_id,e.revision DESC LIMIT ${q.limit} OFFSET ${q.offset}`,[entitlementId]);
 return {items:rows.map(r=>{const snapshot=typeof r.snapshot==='string'?JSON.parse(r.snapshot):r.snapshot;if(digest(JSON.stringify(snapshot))!==r.snapshot_hash)throw new AuthError(409,'INDIVIDUAL_EVIDENCE_INVALID','Preserve this record for technical review.');return {transactionId:r.transaction_id,revision:Number(r.revision),action:r.action as IndividualAction,reference:r.internal_reference,replacementOf:r.replacement_of,actor:r.full_name,recordedAt:new Date(r.recorded_at).toISOString(),snapshot};}),total:Number(count.n),offset:q.offset,limit:q.limit};
}
