import type { PoolConnection,RowDataPacket } from "mysql2/promise";
import { batchMetadata } from "../ovr/detail-reads.js";
import { currentPayout } from "../payouts/service.js";
import { requireNumberedPayroll } from "../ovr/legacy-boundary.js";
import { parseRequirementList } from "../requirements/validation.js";
import { centsText,type RecordingRow,type RecordingSummary } from "./recording-model.js";
import { AuthError } from "../auth/service.js";
import {effectiveOutcomeSql,effectiveUnpaidReasonSql,effectivePaymentJoinsSql} from './effective-payment-sql.js';

// Numbered payroll allocations/attempts are append-only, finalized membership
// relations. Their FKs reference the frozen payroll. The numbered amendment
// command is intentionally unavailable; historical amended cases fail closed
// below and remain accessible through existing reviewed tools. Financial writes
// still verify the complete frozen hash and exact allocation membership.
export const recordingRowsSql=`SELECT roster.*,CASE WHEN payment_id IS NULL THEN 'pending' WHEN effective_outcome='paid' THEN 'paid'
 WHEN unpaid_reason='did_not_claim' THEN 'unclaimed' ELSE 'needs_review' END AS outcome FROM (
 SELECT r.id AS scholarship_id,r.scholar_id,i.human_id,
 COALESCE((SELECT ar.school_name FROM academic_records ar WHERE ar.scholar_id=r.scholar_id AND ar.academic_year_id=r.academic_year_id LIMIT 1),
 (SELECT sc.name FROM scholar_intakes intake JOIN schools sc ON sc.id=intake.school_id WHERE intake.scholar_id=r.scholar_id AND intake.academic_year_id=r.academic_year_id LIMIT 1)) AS school,
 CONCAT_WS(' ',s.last_name,CONCAT(s.first_name,IF(s.middle_name='','',CONCAT(' ',s.middle_name))),NULLIF(s.suffix,'')) AS name,
 e.amount_centavos, p.id AS payment_id,
 ${effectiveOutcomeSql} AS effective_outcome,
 IF(c.id IS NULL,p.amount,CAST(JSON_UNQUOTE(JSON_EXTRACT(c.snapshot,'$.after.amount')) AS DECIMAL(12,2))) AS paid_amount,
 IF(c.id IS NULL,DATE_FORMAT(p.effective_on,'%Y-%m-%d'),NULLIF(JSON_UNQUOTE(JSON_EXTRACT(c.snapshot,'$.after.effectiveOn')),'null')) AS paid_on,
 ${effectiveUnpaidReasonSql} AS unpaid_reason
 FROM ovr_finalizations f
 JOIN (SELECT batch_id,scholarship_id FROM payroll_allocations WHERE batch_id=? UNION SELECT batch_id,scholarship_id FROM payroll_reprocessing_attempts WHERE batch_id=?) membership ON membership.batch_id=f.batch_id
 JOIN scholarship_records r ON r.id=membership.scholarship_id JOIN scholars s ON s.id=r.scholar_id
 JOIN scholar_identifiers i ON i.scholar_id=s.id
 LEFT JOIN payroll_allocations allocation ON allocation.batch_id=f.batch_id AND allocation.scholarship_id=r.id
 LEFT JOIN payroll_reprocessing_attempts attempt ON attempt.batch_id=f.batch_id AND attempt.scholarship_id=r.id
 LEFT JOIN payroll_reprocessing retry ON retry.id=attempt.reprocessing_id
 LEFT JOIN semester_entitlements e ON e.id=COALESCE(allocation.entitlement_id,retry.entitlement_id)
 LEFT JOIN payment_records p ON p.batch_id=f.batch_id AND p.scholarship_id=r.id
 ${effectivePaymentJoinsSql}
 WHERE f.batch_id=?
) roster`;

async function frozenCount(db:PoolConnection,id:string) {
  const [[row]]=await db.execute<RowDataPacket[]>(`SELECT f.entry_count AS n,
    EXISTS(SELECT 1 FROM ovr_amendments a WHERE a.batch_id=f.batch_id AND a.state='approved') AS amended
    FROM ovr_finalizations f WHERE f.batch_id=?`,[id]);
  if(row?.amended)throw new AuthError(409,"HISTORICAL_PAYROLL_REVIEW_REQUIRED","This amended historical roster requires the existing reviewed processing tools.");
  return Number(row?.n??0);
}

export async function recordingSummary(db:PoolConnection,id:string):Promise<RecordingSummary> {
  await requireNumberedPayroll(db,id);
  const batch=await batchMetadata(db,id),cycle=await currentPayout(db,batch.cycleId);
  const [[r]]=await db.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total,COALESCE(SUM(amount_centavos),0) AS total_amount,
    COALESCE(SUM(outcome='paid'),0) AS paid,COALESCE(SUM(outcome='unclaimed'),0) AS unclaimed,
    COALESCE(SUM(outcome='pending'),0) AS pending,COALESCE(SUM(outcome='needs_review'),0) AS needs_review,
    COALESCE(SUM(IF(outcome='paid',paid_amount*100,0)),0) AS paid_amount,
    COALESCE(SUM(IF(outcome='unclaimed',amount_centavos,0)),0) AS unclaimed_amount,
    COALESCE(SUM(IF(outcome='pending',amount_centavos,0)),0) AS pending_amount,
    COALESCE(SUM(IF(outcome='needs_review',amount_centavos,0)),0) AS review_amount,
    SUM(amount_centavos IS NULL) AS missing_amount FROM (${recordingRowsSql}) outcomes`,[id,id,id]);
  if(Number(r.missing_amount)||Number(r.total)!==await frozenCount(db,id))throw new AuthError(409,"PAYROLL_ALLOCATION_MISMATCH","The frozen roster and approved entitlement amounts require reconciliation. Use the existing reviewed historical tools for legacy attempts.");
  return {batchId:id,revision:batch.revision,code:batch.code,name:batch.name,academicYear:cycle.yearCode,semester:cycle.semesterCode,state:batch.state,
    canRecord:batch.state==="processed"&&["open","locked"].includes(cycle.state)&&!cycle.periodUnavailable,
    total:Number(r.total),paid:Number(r.paid),unclaimed:Number(r.unclaimed),pending:Number(r.pending),needsReview:Number(r.needs_review),
    totalAmount:centsText(Number(r.total_amount)),paidAmount:centsText(Number(r.paid_amount)),unclaimedAmount:centsText(Number(r.unclaimed_amount)),pendingAmount:centsText(Number(r.pending_amount)),needsReviewAmount:centsText(Number(r.review_amount))};
}
export async function recordingPage(db:PoolConnection,id:string,raw:unknown) {
  await requireNumberedPayroll(db,id);
  await frozenCount(db,id);
  const q=parseRequirementList(raw),where="WHERE (LOCATE(LOWER(?),LOWER(name))>0 OR LOCATE(LOWER(?),LOWER(human_id))>0)";
  const [[count]]=await db.execute<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM (${recordingRowsSql}) outcomes ${where}`,[id,id,id,q.q,q.q]);
  const [rows]=await db.execute<RowDataPacket[]>(`SELECT scholarship_id,human_id,name,school,amount_centavos,payment_id,outcome,paid_on FROM (${recordingRowsSql}) outcomes ${where} ORDER BY human_id,scholarship_id LIMIT ${q.limit} OFFSET ${q.offset}`,[id,id,id,q.q,q.q]);
  const items:RecordingRow[]=rows.map(r=>({scholarshipId:r.scholarship_id,humanId:r.human_id,name:r.name,school:r.school??null,amount:r.amount_centavos===null?"Unavailable":centsText(Number(r.amount_centavos)),outcome:r.outcome,actualPaidOn:r.paid_on,paymentId:r.payment_id}));
  return {items,total:Number(count.n),offset:q.offset,limit:q.limit};
}
