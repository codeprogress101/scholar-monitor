import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import type { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId,parseKey } from "../configuration/validation.js";
import { today } from "../scholars/validation.js";
import { semesterIdentity } from "../continuing/regular-coverage.js";
import { currentPayout } from "./service.js";
import {requirePreparationOpen} from './preparation.js';
import { decodePrior,priorApprovalForOwner } from "../requirements/prior-approval-source.js";
const text=(min:number,max:number)=>z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
export const historicalSetupSchema=z.object({expectedCycleVersion:z.number().int().positive(),expectedSemesterVersion:z.number().int().positive(),expectedYearVersion:z.number().int().positive(),importId:z.uuid(),deadlineOn:z.iso.date(),reportedReleaseOn:z.iso.date(),reference:text(3,300),sourceLocation:text(3,500),reason:text(5,500),reviewed:z.literal(true)}).strict();
export class HistoricalPayoutSetupService {
 constructor(private authorization:AuthorizationService){}
 record(actor:string,rawId:unknown,rawKey:unknown,raw:unknown,requestId:string){
  const id=parseId(rawId),key=parseKey(rawKey),parsed=historicalSetupSchema.safeParse(raw);
  if(!parsed.success)throw new AuthError(422,"VALIDATION_FAILED","Review historical payroll dates, source, calendar revisions and confirmation.");
  const input=parsed.data,operation="payroll.historical-setup",payloadHash=digest(JSON.stringify({id,operation,input}));
  return this.authorization.withPermission(actor,"payroll.windows.manage",async(db,access)=>{
   if(!access.permissions.some(p=>p.code==="payouts.operate"))throw new AuthError(403,"PERMISSION_DENIED","Coordinator payout operation permission is required.");
   const [[retry]]=await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE",[actor,key]);
   if(retry){if(retry.payload_hash!==payloadHash)throw new AuthError(409,"IDEMPOTENCY_CONFLICT","This key belongs to another historical setup.");return decodePrior<Record<string,unknown>>(retry.result);}
   const cycle=await currentPayout(db,id);
   await requirePreparationOpen(db,id);
   if(cycle.version!==input.expectedCycleVersion)throw new AuthError(409,"VERSION_CONFLICT","The cycle changed. Refresh first.");
   if(cycle.periodUnavailable||!["draft","open"].includes(cycle.state))throw new AuthError(423,"PERIOD_UNAVAILABLE","Use an available Draft or Open cycle.");
   const [[period]]=await db.execute<RowDataPacket[]>("SELECT s.version,s.academic_year_id,y.version year_version,DATE_FORMAT(s.starts_on,'%Y-%m-%d') starts,DATE_FORMAT(s.ends_on,'%Y-%m-%d') ends FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=?",[cycle.semesterId]);
   if(period.version!==input.expectedSemesterVersion||period.year_version!==input.expectedYearVersion)throw new AuthError(409,"VERSION_CONFLICT","The calendar changed. Review its latest revisions.");
   if(input.deadlineOn<period.starts||input.deadlineOn>period.ends||input.deadlineOn>today()||input.reportedReleaseOn<input.deadlineOn||input.reportedReleaseOn>period.ends||input.reportedReleaseOn>today())throw new AuthError(422,"INVALID_HISTORICAL_DATE","Historical deadline and release must be within the semester, ordered and not future dates.");
   const identity=await semesterIdentity(db,cycle.semesterId);
   if(identity.conflict||!identity.term)throw new AuthError(409,"PERIOD_MAPPING_REVIEW","Confirm this calendar's regular semester identity first.");
   const [[existing]]=await db.execute<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM regular_payout_periods WHERE cycle_id=? OR semester_id=? OR (academic_year_id=? AND term_number=?)) mappings,(SELECT COUNT(*) FROM ovr_batches WHERE cycle_id=?) batches,(SELECT COUNT(*) FROM payout_cycles WHERE semester_id=?) cycles",[id,cycle.semesterId,cycle.academicYearId,identity.term,id,cycle.semesterId]);
   if(existing.mappings||existing.batches||Number(existing.cycles)!==1)throw new AuthError(409,"HISTORICAL_SETUP_REVIEW_REQUIRED","Existing mapping, batches or competing cycles require controlled review. They will not be replaced.");
   const [members]=await db.execute<RowDataPacket[]>("SELECT DISTINCT m.scholar_semester_id FROM prior_batch_members m JOIN prior_batch_approvals a ON a.id=m.approval_id WHERE a.import_job_id=? AND a.semester_id=?",[input.importId,cycle.semesterId]);
   if(!members.length)throw new AuthError(409,"PRIOR_BATCH_APPROVAL_REQUIRED","Record the import's prior document and academic approval first.");
   for(const member of members){const approval=await priorApprovalForOwner(db,member.scholar_semester_id);if(!approval?.valid||approval.importId!==input.importId||approval.deadlineOn!==input.deadlineOn)throw new AuthError(409,"PRIOR_BATCH_APPROVAL_REQUIRED","Review current batch approvals against the same historical submission deadline.");}
   const batchId=randomUUID(),[[operator]]=await db.execute<RowDataPacket[]>("SELECT full_name FROM users WHERE id=?",[actor]);
   await db.execute("INSERT INTO regular_payout_periods(cycle_id,semester_id,academic_year_id,term_number,semester_version,year_version,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",[id,cycle.semesterId,cycle.academicYearId,identity.term,period.version,period.year_version,actor]);
   await db.execute("INSERT INTO semester_submission_versions(cycle_id,revision,deadline_on,action,reason,actor_id,recorded_at) VALUES(?,1,?,'configure',?,?,UTC_TIMESTAMP(6))",[id,input.deadlineOn,input.reason,actor]);
   const snapshot={id:batchId,cycleId:id,code:"PAY-001",name:"Previously approved payroll batch 1",revision:1,state:"draft",action:"create",actorId:actor,actorName:operator.full_name,recordedAt:new Date().toISOString(),reason:input.reason,reference:input.reference};
   await db.execute("INSERT INTO ovr_batches(id,cycle_id,code,name,created_by,created_at) VALUES(?,?,'PAY-001',?,?,UTC_TIMESTAMP(6))",[batchId,id,snapshot.name,actor]);
   await db.execute("INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,1,'draft','create',?,?,UTC_TIMESTAMP(6))",[batchId,JSON.stringify(snapshot),actor]);
   await db.execute("INSERT INTO payroll_submission_windows(batch_id,cycle_id,batch_number,actor_id,recorded_at) VALUES(?,?,1,?,UTC_TIMESTAMP(6))",[batchId,id,actor]);
   await db.execute("INSERT INTO payroll_submission_window_versions(batch_id,cycle_id,revision,semester_deadline_revision,opens_on,cutoff_on,previous_cutoff_on,action,reason,actor_id,recorded_at) VALUES(?,?,1,1,?,?,NULL,'open',?,?,UTC_TIMESTAMP(6))",[batchId,id,period.starts,input.deadlineOn,input.reason,actor]);
   await db.execute("INSERT INTO historical_payout_setups(cycle_id,revision,import_job_id,batch_id,deadline_on,reported_release_on,snapshot,actor_id,recorded_at) VALUES(?,1,?,?,?,?,?,?,UTC_TIMESTAMP(6))",[id,input.importId,batchId,input.deadlineOn,input.reportedReleaseOn,JSON.stringify(input),actor]);
   const result={id,revision:1,batchId,state:cycle.state,plannedTarget:cycle.targetDate,reportedReleaseOn:input.reportedReleaseOn,paymentsRecorded:false};
   await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'payout_cycle',?,'configure',?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),operation,id,actor,requestId,input.reason,JSON.stringify({input,result,idempotency_key:key})]);
   await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",[actor,key,operation,payloadHash,JSON.stringify(result)]);
   return result;
  });
 }
}
