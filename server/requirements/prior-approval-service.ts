import {validateConfirmedScope} from "../imports/confirmed-scope.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseKey } from "../configuration/validation.js";
import { cachedReads } from "../read-cache.js";
import { today } from "../scholars/validation.js";
import type { ImportPreviewRow, ImportResult } from "../imports/model.js";
import {decodeImportRows} from "../imports/storage.js";
import { sharedDocumentReview } from "./shared-semester-documents.js";
import { semesterRequirementContext } from "./semester-context.js";
import { emptyFindings } from "../continuing/compliance-engine.js";
import {protectedDocumentEvidence} from "./protected-document-evidence.js";
import { decodePrior, priorApprovalForOwner, priorMemberSource, type PriorApproval } from "./prior-approval-source.js";

const text = (min:number,max:number) => z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const scopeSchema = z.object({ importId:z.uuid(), semesterId:z.uuid() }).strict();
export const priorApprovalSchema = scopeSchema.extend({
 scopeHash:hash, items:z.array(z.object({id:z.uuid(),sourceHash:hash}).strict()).min(1).max(1500).refine(a=>new Set(a.map(i=>i.id)).size===a.length),
 approvalOn:z.iso.date().nullable(), deadlineOn:z.iso.date(), reference:text(3,300), sourceLocation:text(3,500), reason:text(5,500),
 documentsPreviouslyVerified:z.literal(true), academicEligibilityPreviouslyApproved:z.literal(true), deadlineCompliancePreviouslyApproved:z.literal(true),
 correctMistakenWaivers:z.boolean(),
}).strict();
function parse<T>(schema:z.ZodType<T>, raw:unknown):T {
 const p=schema.safeParse(raw); if(!p.success)throw new AuthError(422,"VALIDATION_FAILED","Review the prior approval source, dates, selected scholars and explicit confirmations.");return p.data;
}
export type PriorBatchMember = {id:string;scholarId:string;humanId:string;name:string;sourceHash:string;issues:string[];waiverCount:number;coursePending:boolean;documents:{id:string;kind:string;coverage:string;status:string;notRequired?:boolean}[];approval:PriorApproval|null};
export type PriorBatchPreview = {importId:string;semesterId:string;scopeHash:string;scholarCount:number;members:PriorBatchMember[]};

export async function loadPriorBatch(db:PoolConnection,input:{importId:string;semesterId:string}):Promise<PriorBatchPreview> {
 const scope={importId:input.importId,semesterId:input.semesterId};
 const [[row]]=await db.execute<RowDataPacket[]>("SELECT c.result,j.preview FROM import_confirmations c JOIN import_jobs j ON j.id=c.job_id WHERE c.job_id=?",[input.importId]);
 if(!row)throw new AuthError(404,"IMPORT_NOT_CONFIRMED","Choose a confirmed Already-approved import.");
 const rows=decodeImportRows<ImportPreviewRow>(row.preview), result=decodePrior<ImportResult>(row.result);
 await validateConfirmedScope(db,input.importId,rows,result);
 if(!result.selectedCount || !rows.length || rows.some(r=>!r.approvedSelection))throw new AuthError(409,"APPROVED_IMPORT_REQUIRED","Prior batch approval is restricted to confirmed Already-approved imports.");
 const ids=[...new Set(result.items.map(i=>i.id))].sort();
 if(!ids.length||ids.length>1500)throw new AuthError(409,"BATCH_SCOPE_REVIEW_REQUIRED","Review the confirmed import membership.");
 const [owners]=await db.execute<RowDataPacket[]>(`SELECT id,scholar_id FROM scholar_semesters WHERE semester_id=? AND scholar_id IN (${ids.map(()=>"?").join(",")}) ORDER BY scholar_id`,[input.semesterId,...ids]);
 const members:PriorBatchMember[]=[];
 for(const id of ids){
  const owner=owners.find(o=>o.scholar_id===id), source=owner?await priorMemberSource(db,owner.id):null;
  if(!source){members.push({id,scholarId:id,humanId:"Not prepared",name:"Shared semester requirements not prepared",sourceHash:digest(id),issues:["Prepare requirements using the enabled semester setup first."],waiverCount:0,coursePending:false,documents:[],approval:null});continue;}
  const issues=[...source.issues];
  for(const d of source.docs)try{await semesterRequirementContext(db,d.id,owner!.id);}catch(e){if(!(e instanceof AuthError))throw e;issues.push(e.message);}
  const reconciliation=await sharedDocumentReview(db,id,input.semesterId);
  if(reconciliation.unresolved.length)issues.push("Review genuine conflicting document histories before adopting prior approval.");
  const approval=await priorApprovalForOwner(db,owner!.id);
  const notRequired=(instance:string)=>{const card=source.snapshot.entrant.filter(e=>e.instance_id===instance).at(-1);return card?.decision==="approved"&&decodePrior<{mode?:string}>(card.evidence).mode==="initial_requirements";};
  if(!approval?.valid){const protectedEvidence=await protectedDocumentEvidence(db,id,input.semesterId);if(protectedEvidence.issue)issues.push(protectedEvidence.issue);else if(source.docs.some(d=>protectedEvidence.ids.has(d.id)))issues.push("Frozen payroll or payment evidence protects these documents. Use controlled reconciliation.");}
  const [correctedWaivers]=await db.execute<RowDataPacket[]>("SELECT w.instance_id FROM prior_batch_waiver_corrections w JOIN requirement_instances i ON i.id=w.instance_id JOIN requirement_checklists c ON c.id=i.checklist_id WHERE c.scholar_semester_id=?",[owner!.id]);
  const [[frozen]]=await db.execute<RowDataPacket[]>("SELECT id FROM semester_entitlements WHERE scholar_semester_id=? LIMIT 1",[owner!.id]);
  if(frozen&&!approval?.valid)issues.push("A frozen allocation protects this scholar. Use controlled reconciliation instead of replacing its evidence.");
  members.push({id:owner!.id,scholarId:id,humanId:source.owner.human_id,name:source.owner.name,sourceHash:source.hash,issues:[...new Set(issues)],waiverCount:source.docs.filter(d=>d.waiver_id&&!correctedWaivers.some(w=>w.instance_id===d.id)).length,coursePending:source.snapshot.academic.some(a=>a.course_pending_exception_id),documents:source.docs.map(d=>({id:d.id,kind:d.document_kind,notRequired:notRequired(d.id),coverage:notRequired(d.id)?"Reviewed first-semester entrant exception":d.coverage_name+" / "+String(d.coverage_start).slice(0,10)+" to "+String(d.coverage_end).slice(0,10),status:notRequired(d.id)?"Not required":approval?.valid?(d.event_status==="verified"?"Verified - individual review retained":"Verified - prior batch approval"):d.waiver_id&&!correctedWaivers.some(w=>w.instance_id===d.id)?"waived":d.event_status??(d.receipt_id?"submitted":"not_submitted")})),approval});
 }
 return {...scope,scholarCount:ids.length,members,scopeHash:digest(JSON.stringify({input:scope,ids,members:members.map(m=>({id:m.id,sourceHash:m.sourceHash,issues:m.issues}))}))};
}

export class PriorBatchApprovalService {
 constructor(private authorization:AuthorizationService){}
 preview(actor:string,raw:unknown){const input=parse(scopeSchema,raw);return this.authorization.readSnapshot(actor,"academic.changes.approve",db=>loadPriorBatch(cachedReads(db),input));}
 record(actor:string,rawKey:unknown,raw:unknown,requestId:string){
  const input=parse(priorApprovalSchema,raw),key=parseKey(rawKey),operation="documents.prior-batch-approval",payloadHash=digest(JSON.stringify({operation,input}));
  return this.authorization.withPermission(actor,"academic.changes.approve",async(db,access)=>{
   if(!access.permissions.some(p=>p.code==="requirements.verify")||!access.permissions.some(p=>p.code==="semesters.configure"))throw new AuthError(403,"PERMISSION_DENIED","Coordinator academic approval, verification and semester permissions are required.");
   const [[retry]]=await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE",[actor,key]);
   if(retry){if(retry.payload_hash!==payloadHash)throw new AuthError(409,"IDEMPOTENCY_CONFLICT","This retry key belongs to another approval.");return decodePrior<Record<string,unknown>>(retry.result);}
   if(input.deadlineOn>today()||input.deadlineOn<"1900-01-01"||(input.approvalOn&&(input.approvalOn>today()||input.approvalOn<"1900-01-01")))throw new AuthError(422,"INVALID_HISTORICAL_DATE","Use supported historical dates; an unknown approval date stays unrecorded.");
   const view=await loadPriorBatch(cachedReads(db),input);
   if(view.scopeHash!==input.scopeHash)throw new AuthError(409,"BATCH_SOURCE_CHANGED","The batch changed. Refresh and confirm its current sources.");
   const selected=input.items.map(i=>{const m=view.members.find(m=>m.id===i.id);if(!m||m.sourceHash!==i.sourceHash||m.issues.length||m.approval?.valid)throw new AuthError(409,"BATCH_SOURCE_CHANGED","A selected scholar is blocked, already approved or changed. No approvals were recorded.");return m;});
   if(selected.some(m=>m.waiverCount)&&(!input.correctMistakenWaivers||!access.permissions.some(p=>p.code==="requirements.waive")))throw new AuthError(422,"WAIVER_CORRECTION_CONFIRMATION_REQUIRED","Explicitly confirm correction of the listed mistaken waivers. Their original histories will remain.");
   const id=randomUUID(),authority=randomUUID();
   const [[last]]=await db.execute<RowDataPacket[]>("SELECT MAX(revision) n FROM prior_batch_approvals WHERE import_job_id=? AND semester_id=?",[input.importId,input.semesterId]);
   const revision=Number(last.n??0)+1;
   const [[operator]]=await db.execute<RowDataPacket[]>("SELECT full_name FROM users WHERE id=?",[actor]);
   await db.execute("INSERT INTO workflow_authority_versions(id,code,revision,issuer,reference_text,scope,valid_from,valid_until,source_location,actor_id,recorded_at) VALUES(?,?,1,?,?,?,?,NULL,?,?,UTC_TIMESTAMP(6))",[authority,`PB-${id}`,operator.full_name,input.reference,JSON.stringify({purpose:"prior_batch_approval",importId:input.importId,semesterId:input.semesterId}),today(),input.sourceLocation,actor]);
   await db.execute("INSERT INTO prior_batch_approvals(id,import_job_id,semester_id,revision,authority_version_id,approval_on,deadline_on,reference_text,source_location,reason,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",[id,input.importId,input.semesterId,revision,authority,input.approvalOn,input.deadlineOn,input.reference,input.sourceLocation,input.reason,actor]);
   let documents=0,correctedWaivers=0,notRequiredCount=0;
   for(const member of selected){
    const source=await priorMemberSource(db,member.id);if(!source||source.hash!==member.sourceHash||source.issues.length)throw new AuthError(409,"BATCH_SOURCE_CHANGED","Sources changed during batch review.");
    if(input.deadlineOn<source.owner.starts||input.deadlineOn>source.owner.ends)throw new AuthError(422,"INVALID_HISTORICAL_DATE","The approved submission deadline must be inside the receiving semester.");
    const reviewId=randomUUID();
    const [[lastReview]]=await db.execute<RowDataPacket[]>("SELECT id,revision FROM semester_review_events WHERE scholar_semester_id=? ORDER BY revision DESC LIMIT 1",[member.id]);
    const [docContexts]=await db.execute<RowDataPacket[]>("SELECT id FROM requirement_instances WHERE checklist_id IN (SELECT id FROM requirement_checklists WHERE scholar_semester_id=?) ORDER BY id",[member.id]);
    const snapshot={priorBatchApproval:{id,revision,reference:input.reference,sourceLocation:input.sourceLocation,approvalOn:input.approvalOn,deadlineOn:input.deadlineOn},source:{documents:docContexts.map(d=>({id:d.id,kind:source.docs.find(x=>x.id===d.id)?.document_kind,version:Number(source.docs.find(x=>x.id===d.id)?.event_version??1)})),gradingRule:null},findings:emptyFindings,reason:input.reason,blockers:[],academicOnly:false};
    await db.execute("INSERT INTO semester_review_events(id,scholar_semester_id,revision,semester_revision,policy_version_id,average_value,grading_rule_key,has_failed,has_dropped,has_incomplete,result,source_snapshot,source_hash,supersedes_id,actor_id,recorded_at) VALUES(?,?,?,?,?,NULL,NULL,NULL,NULL,NULL,'compliant',?,?,?,?,UTC_TIMESTAMP(6))",[reviewId,member.id,Number(lastReview?.revision??0)+1,source.revision!.revision,source.owner.policy_version_id,JSON.stringify(snapshot),source.hash,lastReview?.id??null,actor]);
    await db.execute("INSERT INTO prior_batch_members(approval_id,scholar_semester_id,source_hash,review_event_id,snapshot) VALUES(?,?,?,?,?)",[id,member.id,source.hash,reviewId,JSON.stringify(source.snapshot)]);
    for(const d of source.docs){
     const [[lastEvent]]=await db.execute<RowDataPacket[]>("SELECT id,version,to_status,details FROM requirement_workflow_events WHERE instance_id=? ORDER BY version DESC LIMIT 1",[d.id]);
     const details=lastEvent?decodePrior<{priorBatchApproval?:unknown}>(lastEvent.details):null;
     const retained=Boolean(!d.receipt_id || (lastEvent?.to_status==="verified"&&!details?.priorBatchApproval&&!d.waiver_id));
     const baseVersion=Math.max(Number(lastEvent?.version??(d.receipt_id?1:0)),Number(d.waiver_version??0));
     const from=lastEvent?.to_status??"submitted",route=!retained&&["submitted","resubmitted"].includes(from);
     const version=baseVersion+(retained?0:route?2:1);
     await db.execute("INSERT INTO prior_batch_documents(approval_id,scholar_semester_id,instance_id,decision_version,retained_individual) VALUES(?,?,?,?,?)",[id,member.id,d.id,version,retained]);
     if(d.waiver_id){
      const [[corrected]]=await db.execute<RowDataPacket[]>("SELECT waiver_id FROM prior_batch_waiver_corrections WHERE waiver_id=?",[d.waiver_id]);
      if(!corrected){await db.execute("INSERT INTO prior_batch_waiver_corrections(approval_id,waiver_id,instance_id) VALUES(?,?,?)",[id,d.waiver_id,d.id]);correctedWaivers++;}
     }
     if(!retained){
      const evidence={basis:"prior_batch_approval",priorBatchApproval:{id,reference:input.reference,sourceLocation:input.sourceLocation},individualFindingsRecorded:false};
      if(route)await db.execute("INSERT INTO requirement_workflow_events(id,instance_id,version,action,from_status,to_status,effective_on,reason,reference_text,remarks,correction_of,details,actor_id,actor_name,recorded_at) VALUES(?,?,?,'send-for-verification',?,'for_verification',?,?,?,NULL,NULL,?,?,?,UTC_TIMESTAMP(6))",[randomUUID(),d.id,baseVersion+1,from,today(),input.reason,input.reference,JSON.stringify(evidence),actor,operator.full_name]);
      await db.execute("INSERT INTO requirement_workflow_events(id,instance_id,version,action,from_status,to_status,effective_on,reason,reference_text,remarks,correction_of,details,actor_id,actor_name,recorded_at) VALUES(?,?,?,'verify',?,'verified',?,?,?,NULL,?,?,?,?,UTC_TIMESTAMP(6))",[randomUUID(),d.id,version,route?"for_verification":from,today(),input.reason,input.reference,from==="verified"?lastEvent.id:null,JSON.stringify(evidence),actor,operator.full_name]);
     }
     if(d.receipt_id)documents++;else notRequiredCount++;
    }
   }
   const result={id,revision,scholarCount:selected.length,documentCount:documents,notRequiredCount,correctedWaivers};
   await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'import_job',?,'record',?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),operation,input.importId,actor,requestId,input.reason,JSON.stringify({input,result,idempotency_key:key})]);
   await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",[actor,key,operation,payloadHash,JSON.stringify(result)]);
   return result;
  });
 }
}
