import { sharedDocumentReview } from "../requirements/shared-semester-documents.js";
import { savedVerificationContext } from "../requirements/workflow-service.js";
import { verificationMatches } from "../requirements/workflow-model.js";
import { readChecklists } from "../requirements/instances-service.js";
import { registryDrafts, type RegistryAnnual } from "./registry-drafts.js";
import { semesterClaim, reprocessingQueue, claimDeadline } from "../ovr/reprocessing.js";
import { academicCurrent } from "../academic/changes-service.js";
import { payrollYear } from "../ovr/payroll-form.js";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";

import { currentPayout } from "../payouts/service.js";
import { ovrEligibilityIssues } from "../ovr/rules.js";
import { effectiveRoster } from "../ovr/amendment-state.js";
import { ovrHistory } from "../ovr/service.js";
import { cachedReads } from "../read-cache.js";
import {primeIndividualClaims} from '../payments/settlement-reads.js';
import type {EligibilityReason} from '../eligibility/model.js';
import {historicalBatch} from '../payouts/historical-context.js';

export type RequirementSummary = { status: "complete" | "missing" | "review" | "unavailable"; label: string; total: number; satisfied: number };
export type RegistryEligibility = {
 semesters?: {id:string;name:string;academicYearId:string}[]; semesterId?:string|null;
 periods: { id: string; name: string; semesterId: string; academicYearId: string }[];
 periodId: string | null;
 items: { scholarId: string; requirements?: RequirementSummary; payout?: {status:string; eligible:boolean; reasons?:EligibilityReason[];publishedActive?:boolean;context?:{semester:string;year:string;batchId:string|null;batchCode:string|null}}; eligible: boolean; reasons: EligibilityReason[]; payment: string | null; inclusion: string | null; academicEligible?: boolean; academicBasis?: "current" | "payroll_approval"; links?: {label:string;href:string}[] }[];
};
export async function registryEligibility(connection: PoolConnection, raw: unknown): Promise<RegistryEligibility> {
 const parsed = z.object({ ids: z.string().max(3700).transform(s => s ? s.split(",") : []).pipe(z.array(z.uuid()).max(100)), periodId: z.uuid().optional(), semesterId: z.uuid().optional(), academicYearId: z.uuid().optional() }).strict().safeParse(raw);
 if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Request eligibility for at most 100 displayed scholars and a valid period.");
 await connection.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
 const db = cachedReads(connection);
 const result: RegistryEligibility = { periods: [], periodId: null, items: [] };

 const [cycles] = await db.execute<RowDataPacket[]>("SELECT c.id FROM payout_cycles c JOIN semesters s ON s.id=c.semester_id ORDER BY s.starts_on DESC,c.code,c.id", []);
 for (const c of cycles) { const cycle = await currentPayout(db, c.id); result.periods.push({ id: cycle.id, name: cycle.name, semesterId: cycle.semesterId, academicYearId: cycle.academicYearId }); }
 const [semesterRows] = await db.execute<RowDataPacket[]>("SELECT id,name,academic_year_id FROM semesters WHERE (? IS NULL OR academic_year_id=?) ORDER BY starts_on DESC,id", [parsed.data.academicYearId ?? null,parsed.data.academicYearId ?? null]);
 result.semesters=semesterRows.map(r=>({id:r.id,name:r.name,academicYearId:r.academic_year_id}));
 if(parsed.data.academicYearId) result.periods=result.periods.filter(p=>p.academicYearId===parsed.data.academicYearId);
 if(parsed.data.semesterId) result.periods=result.periods.filter(p=>p.semesterId===parsed.data.semesterId);
 const period = parsed.data.periodId ? result.periods.find(p => p.id === parsed.data.periodId) : result.periods.length === 1 ? result.periods[0] : null;
 const semesterId=period?.semesterId ?? parsed.data.semesterId ?? (result.semesters.length===1 ? result.semesters[0].id : null);
 result.semesterId=semesterId;
 const ids=[...new Set(parsed.data.ids)];
 if (period) result.periodId=period.id;
 if (!ids.length) return result;
 const annuals: RegistryAnnual[]=[];
 let regularPeriod: RowDataPacket | undefined;
 if (period) {
  const [rows]=await db.execute<RowDataPacket[]>(`SELECT r.id,r.scholar_id,a.id AS academic_id FROM scholarship_records r LEFT JOIN academic_records a ON a.scholar_id=r.scholar_id AND a.academic_year_id=r.academic_year_id WHERE r.academic_year_id=? AND r.scholar_id IN (${ids.map(()=>"?").join(",")})`,[period.academicYearId,...ids]);
  annuals.push(...rows.map(r=>({id:String(r.id),scholar_id:String(r.scholar_id),academic_id:r.academic_id ?? null})));
  [[regularPeriod]]=await db.execute<RowDataPacket[]>("SELECT cycle_id FROM regular_payout_periods WHERE cycle_id=?",[period.id]);
 }
 const annualByScholar=new Map(annuals.map(a=>[a.scholar_id,a]));
 const summaries=new Map<string,RequirementSummary>();
 // Regular payroll already resolves its authoritative document sources below.
 // Keep standalone summaries for no-period and missing-annual records.
 const summaryIds=ids.filter(id=>!regularPeriod || !annualByScholar.has(id));
 if(semesterId && result.semesters.some(s=>s.id===semesterId) && summaryIds.length) {
  const ids=summaryIds;
  const [rows]=await db.execute<RowDataPacket[]>(`SELECT c.*,COALESCE(sr.scholar_id,ss.scholar_id) AS owner_id,s.academic_year_id,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived,DATE_FORMAT(c.policy_date,'%Y-%m-%d') AS policy_on FROM requirement_checklists c LEFT JOIN scholarship_records sr ON sr.id=c.scholarship_record_id LEFT JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=s.academic_year_id WHERE c.semester_id=? AND COALESCE(sr.scholar_id,ss.scholar_id) IN (${ids.map(()=>"?").join(",")}) AND (c.payout_cycle_id IS NULL OR c.payout_cycle_id=?)`,[semesterId,...ids,period?.id ?? null]);
  for(const id of ids) {
   const saved=(await readChecklists(db,rows.filter(r=>r.owner_id===id))).items;
   const shared=rows.some(r=>r.owner_id===id && r.scholar_semester_id) ? await sharedDocumentReview(db,id,semesterId) : null;
   const items=[...new Map(saved.flatMap(c=>c.items).map(i=>[i.id,i])).values()].filter(i=>!shared?.unusedPlaceholderIds.includes(i.id)).filter(i=>!shared?.links.some(l=>l.valid && l.legacyId===i.id && l.sourceId!==l.legacyId));
   let satisfied=0;
   for(const item of items) {
    let accepted=Boolean(item.notRequired || (item.satisfiesPayoutRequirement ?? item.satisfiesNormalRequirement));
    if(accepted && item.status==="verified" && !item.priorApproval?.valid) {
     try { accepted=verificationMatches(await savedVerificationContext(db,item.id),item.history.at(-1)?.details.verification); }
     catch(error) { if(!(error instanceof AuthError)) throw error; accepted=false; }
    }
    if(accepted) satisfied++;
   }
   const status=shared?.unresolved.length?"review":!items.length?"unavailable":satisfied===items.length?"complete":items.some(i=>i.status==="not_submitted")?"missing":"review";
   summaries.set(id,{status,label:shared?.unresolved.length?"Needs reconciliation":status==="unavailable"?"Not prepared / unconfigured":status==="complete"?"Complete":status==="missing"?"Missing documents":"Needs verification / review",total:items.length,satisfied});
  }
 }
 if (!period) {
  result.items=[...new Set(parsed.data.ids)].map(scholarId=>({scholarId,eligible:false,requirements:summaries.get(scholarId),payout:{status:result.periods.length?"Choose payroll period":"No payroll period",eligible:false},reasons:[],payment:null,inclusion:null}));
  return result;
 }
 result.periodId = period.id;
 const cycle = await currentPayout(db, period.id);
 const [batchRows] = await db.execute<RowDataPacket[]>("SELECT id FROM ovr_batches WHERE cycle_id=? ORDER BY created_at DESC,id", [period.id]);
 const batches = [];
 for (const row of batchRows) batches.push((await ovrHistory(db, row.id))[0]);
 const drafts = batches.filter(b=>b.state === "draft");
 const assessmentDrafts=[];
 for(const draft of drafts)if(!regularPeriod||!await historicalBatch(db,cycle.id,draft.id))assessmentDrafts.push(draft);
 await primeIndividualClaims(db,annuals.map(a=>a.id),cycle.semesterId);
 const queues=await reprocessingQueue(db,cycle,annuals.map(a=>a.id)), deadline=await claimDeadline(db,cycle.semesterId);
 const projections=registryDrafts(db,cycle,annuals,drafts,queues,deadline.expired);
 await projections.read();
 const included = new Map<string,typeof batches[number]>();
 for(const batch of batches) for(const entry of (await effectiveRoster(db,batch.id))?.snapshot.entries ?? []) included.set(entry.scholarshipId,batch);
 for (const scholarId of [...new Set(parsed.data.ids)]) {
  const annual = annualByScholar.get(scholarId);
  if (!annual) { result.items.push({ scholarId, requirements:summaries.get(scholarId), payout:{status:"Scholarship review needed",eligible:false}, eligible: false, reasons: [{ code: "SCHOLARSHIP_RECORD_REQUIRED", message: "Current annual scholarship record or continuing review is needed." }], payment: null, inclusion: null }); continue; }
  const view = await projections.viewFor(annual.id, assessmentDrafts.length === 1 ? assessmentDrafts[0].id : undefined);
  const obligations=view.current.sources.requirements;
  const satisfied=obligations.filter(r=>r.satisfied && (r.status!=="waived" || r.allowWaiver)).length;
  const sourceReview=view.current.reasons.some(r=>["COVERED_DOCUMENT_UNVERIFIED","VERIFICATION_STALE"].includes(r.code));
  const requirementStatus=!obligations.length?"unavailable":satisfied===obligations.length&&!sourceReview?"complete":obligations.some(r=>!r.instanceId||r.status==="not_submitted")?"missing":"review";
  const hasSharedDocuments = !regularPeriod && (summaries.get(scholarId)?.total ?? 0) > 0;
  if (!hasSharedDocuments) summaries.set(scholarId,{status:requirementStatus,label:requirementStatus==="unavailable"?"Unconfigured":requirementStatus==="complete"?"Complete":requirementStatus==="missing"?"Missing documents":"Needs verification / review",total:obligations.length,satisfied});
  const issues = ovrEligibilityIssues(view);
  if (!view.current.sources.semesterPayroll) {
    const [[academic]] = await db.execute<RowDataPacket[]>("SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=?", [scholarId, period.academicYearId]);
    if (!academic || !payrollYear((await academicCurrent(db, academic.id)).placement.yearLevel)) issues.push({ code: "PAYROLL_PLACEMENT_REQUIRED", message: "Complete school, course and a supported year level for the payroll form." });
  }
  const reasons = [...view.current.reasons.filter(r => !hasSharedDocuments || !["CHECKLIST_MISSING", "PAYOUT_POLICY_EMPTY"].includes(r.code)), ...issues,
    ...(hasSharedDocuments ? [{code:"PAYROLL_PERIOD_SETUP_REQUIRED",message:"Semester documents already exist. A Coordinator must configure this payroll's regular semester and approved submission deadline in Payroll. Do not generate a duplicate document checklist."}] : [])];
  const links: {label:string;href:string}[]=[];
  const link=(label:string,batchId:string,cycleId:string) => links.push({label,href:`#payouts?${new URLSearchParams({cycle:cycleId,batch:batchId})}`});
  const claim=await semesterClaim(db,annual.id,cycle.semesterId);
  const retries=queues.filter(q=>q.scholarshipId === annual.id);
  const retry=retries.find(q=>q.status === "assigned") ?? retries.find(q=>q.status === "review") ?? retries.find(q=>q.status === "queued");
  const deferred=projections.deferred.get(annual.id) ?? [], destinations=projections.destinations.get(annual.id) ?? [];
  let inclusion: string | null=null;
  if(claim.paid) {inclusion="Paid this semester";if(claim.paid.batchId)link("View payment",claim.paid.batchId,claim.paid.cycleId);else if('individualTransactionId' in claim.paid)links.push({label:'View individual payment',href:'#individual-payments?transaction='+claim.paid.individualTransactionId});}
  else if(deadline.expired) inclusion="Claim period ended";
  else if(claim.pending.length) inclusion="Needs review";
  else if(retry?.status === "review") inclusion="Needs review";
  else if(retry?.status === "assigned") {inclusion="Reprocessing"; if(retry.destinationBatchId) {const target=(await ovrHistory(db,retry.destinationBatchId))[0];link(target.code,target.id,target.cycleId);}}
  else if(destinations.length) {inclusion=destinations.length === 1 ? "Included in draft" : "Eligible for multiple drafts - select a batch"; for(const batch of destinations) link(batch.code,batch.id,batch.cycleId);}
  else if(retry?.status === "queued") inclusion="Unclaimed \u2014 for reprocessing";
  else if(deferred.length) {inclusion="Deferred from this batch";for(const batch of deferred) link(batch.code,batch.id,batch.cycleId);}
  else if(included.has(annual.id)) inclusion="Already on payroll";
  if(retry) link("Previous attempt",retry.sourceBatchId,retry.sourceCycleId);
  const operational = new Set(["SEMESTER_ALREADY_ALLOCATED","EXISTING_PAYROLL_ALLOCATION","PAYMENT_ALREADY_RECORDED","CLAIM_PERIOD_ENDED","DRAFT_ENTRY_DEFERRED","BATCH_REVIEW_REQUIRED","RECEIPT_TIMING_REQUIRED","SEMESTER_UNAVAILABLE","ENDED_SEMESTER_REVIEW","CYCLE_NOT_OPEN","PERIOD_UNAVAILABLE"]);
  const academicReasons=reasons.filter(r=>!operational.has(r.code) && !(r.code === "NOT_ELIGIBLE" && view.current.reasons.length > 0 && view.current.reasons.every(r=>operational.has(r.code))));
  const paidEvidence=claim.paid?.batchId ? (await effectiveRoster(db,claim.paid.batchId))?.snapshot.entries.find(e=>e.evidence.current.sources.scholarship.scholarId === scholarId)?.evidence : undefined;
  const academicBasis=paidEvidence ? "payroll_approval" as const : "current" as const;
  const academicEligible=paidEvidence ? paidEvidence.effective.eligible : academicReasons.length === 0;
  const displayedReasons=paidEvidence ? paidEvidence.current.reasons : academicReasons;
  const effectiveBatch=batches.find(b=>b.id===(claim.paid?.batchId??view.current.sources.semesterPayroll?.batchId))??included.get(annual.id);
  const unassigned=Boolean(regularPeriod&&!effectiveBatch&&!inclusion);
  const unique=(values:EligibilityReason[])=>values.filter((r,i)=>values.findIndex(x=>x.code===r.code&&x.requirementCode===r.requirementCode)===i);
  result.items.push({scholarId,requirements:summaries.get(scholarId),payout:{status:claim.paid?"Paid this semester":inclusion ?? (unassigned?"Not yet assigned to a new payroll":view.effective.eligible && !issues.length?"Eligible":"Needs review"),eligible:!unassigned&&view.effective.eligible && !issues.length,reasons:unique(reasons),...(regularPeriod?{publishedActive:view.current.sources.official.valid&&view.current.sources.scholarship.status==='active',context:{year:cycle.yearCode,semester:cycle.semesterCode,batchId:effectiveBatch?.id??null,batchCode:effectiveBatch?.code??null}}:{})},eligible:academicEligible,academicEligible,academicBasis,reasons:unique(displayedReasons),payment:claim.paid ? "Paid" : claim.attempts.length ? "Not paid" : null,inclusion,links});

 }
 return result;
}
