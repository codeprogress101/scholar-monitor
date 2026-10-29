import type {PoolConnection, RowDataPacket} from "mysql2/promise";
import {AuthError} from "../auth/service.js";
import type {PayoutCycle} from "../payouts/model.js";
import {registryYearAssociation} from "../scholars/registry-year.js";
import {classification, placementJoinsForYear} from "../scholars/registry-placement.js";
import {canonicalLevel} from "../graduation/monitoring-source.js";
import {normalizedMonitoringLevel} from "../scholars/graduation-monitoring-model.js";
import {recordingSummary} from "../payments/recording-reads.js";

/** B1 annual discovery and its source-first classification, without hydration or
 * admission/standing inference. No first-entry-year fallback. */
export async function annualOverview(db:PoolConnection,cycle:PayoutCycle) {
 const level=`(CASE WHEN a.id IS NOT NULL THEN ${canonicalLevel} END) COLLATE utf8mb4_bin`;
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT (${classification}) AS classification,${level} AS academic_level,COUNT(*) AS n
 FROM scholars s JOIN scholar_identifiers i ON i.scholar_id=s.id
 ${placementJoinsForYear(cycle.academicYearId)} WHERE 1=1 ${registryYearAssociation}
 GROUP BY (${classification}),academic_level LIMIT 5001`,Array(5).fill(cycle.academicYearId));
 const counts={new:0,continuing:0,unknown:0},levels=Array<number>(8).fill(0);
 for(const row of rows){const key=row.classification==='new'?'new':row.classification==='continuing'?'continuing':'unknown';const n=Number(row.n);counts[key]+=n;const academicLevel=normalizedMonitoringLevel(row.academic_level);levels[academicLevel===null?7:Math.min(academicLevel,7)-1]+=n;}
 const total=counts.new+counts.continuing+counts.unknown;
 if(total>5000)throw new AuthError(422,"REPORT_SCOPE_TOO_LARGE","The Dashboard annual scope exceeds 5,000 associated scholars. Use a narrower authorized Registry view.");
 const [working]=await db.execute<RowDataPacket[]>("SELECT setting_value FROM system_settings WHERE code='LDSS_WORKING_ACADEMIC_YEAR' AND archived_at IS NULL");
 return {academicYearId:cycle.academicYearId,yearCode:cycle.yearCode,workingYear:working.length===1&&working[0].setting_value===cycle.academicYearId,total,...counts,academic:{known:total-levels[7],unknown:levels[7],levels:levels.map((count,index)=>({level:index===7?null:index+1,label:index===7?"Unknown / unrecognized":index===6?"Year 7+":`Year ${index+1}`,count}))}};
}

/** Compact finalized payroll summaries, with the exact Recording outcome reader.
 * Bound batch count and reject unsupported sources instead of partial charts.
 * A row is an approved payroll allocation/attempt, not a unique entitlement or
 * an individual DV settlement. No roster rows are returned or hydrated here. */
export async function payrollOverview(db:PoolConnection,cycle:PayoutCycle) {
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT b.id,b.cycle_id FROM ovr_batches b
 JOIN payout_cycles c ON c.id=b.cycle_id JOIN semesters s ON s.id=c.semester_id
 WHERE s.academic_year_id=? AND s.id=? AND EXISTS(SELECT 1 FROM ovr_finalizations f WHERE f.batch_id=b.id)
 ORDER BY b.code,b.id LIMIT 51`,[cycle.academicYearId,cycle.semesterId]);
 if(rows.length>50)throw new AuthError(422,"REPORT_SCOPE_TOO_LARGE","This Dashboard chart supports up to 50 finalized payroll batches. No partial totals were returned; use Payroll reports for this period.");
 const batches=[];
 const totals={total:0,paid:0,pending:0,unclaimed:0,needsReview:0};
 for(const row of rows){const summary=await recordingSummary(db,String(row.id));
  if(summary.paid+summary.pending+summary.unclaimed+summary.needsReview!==summary.total)throw new AuthError(409,"PAYROLL_ALLOCATION_MISMATCH","Payment outcome totals require reconciliation.");
  batches.push({batchId:summary.batchId,cycleId:String(row.cycle_id),code:summary.code,name:summary.name,state:summary.state,total:summary.total,paid:summary.paid,pending:summary.pending,unclaimed:summary.unclaimed,needsReview:summary.needsReview});
  for(const key of Object.keys(totals) as (keyof typeof totals)[])totals[key]+=summary[key];
 }
 return {academicYearId:cycle.academicYearId,semesterId:cycle.semesterId,yearCode:cycle.yearCode,semesterCode:cycle.semesterCode,batches,totals,
  scope:"Current effective outcomes of finalized numbered payroll rows in this academic year and semester, across payout cycles. Approved payroll corrections are included. Rows can represent repeated attempts; these are not unique entitlements, original closure outcomes or later individual settlements."};
}
export type AnnualOverview=Awaited<ReturnType<typeof annualOverview>>;
export type PayrollOverview=Awaited<ReturnType<typeof payrollOverview>>;
