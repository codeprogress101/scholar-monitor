import { reusedOwner, requireActiveDocument } from "./reused-source.js";
import { semesterIdentity } from '../continuing/regular-coverage.js';
import { payrollYear } from '../ovr/payroll-form.js';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { AuthorizationService } from '../authorization/service.js';
import { AuthError } from '../auth/service.js';
import { digest } from '../auth/crypto.js';
import { parseId, parseKey } from '../configuration/validation.js';
import { today } from '../scholars/validation.js';
import { requirementState } from './workflow-state.js';
import { academicCurrent } from '../academic/changes-service.js';

export type EntrantCard = { id:string; revision:number; decision:'approved'|'revoked'; mode:'grading_card'|'initial_requirements'; issuingSchool:string; schoolYear:string; gradingPeriod:string; periodEnd:string; reference:string; reason:string; admissionAssessmentReference?:string };
export async function entrantCard(db:PoolConnection, instance:string):Promise<EntrantCard|null> {
 const [[r]]=await db.execute<RowDataPacket[]>("SELECT *,DATE_FORMAT(period_end,'%Y-%m-%d') AS day FROM entrant_grading_card_reviews WHERE instance_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE",[instance]);
 return r?{id:r.id,revision:r.revision,decision:r.decision,mode:(typeof r.evidence==='string'?JSON.parse(r.evidence):r.evidence).mode??'grading_card',issuingSchool:r.issuing_school,schoolYear:r.school_year,gradingPeriod:r.grading_period,periodEnd:r.day,reference:r.reference_text,reason:r.reason,admissionAssessmentReference:(typeof r.evidence==='string'?JSON.parse(r.evidence):r.evidence).admissionAssessmentReference}:null;
}
export async function entrantCardContext(db:PoolConnection,instance:string) {
 const reused = await reusedOwner(db, instance);
 const [[owner]]=await db.execute<RowDataPacket[]>(`SELECT ss.id,ss.scholar_id,ss.semester_id,s.version,s.academic_year_id,s.locked_at,s.archived_at,y.version AS year_version,y.locked_at AS year_locked,y.archived_at AS year_archived,DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(s.ends_on,'%Y-%m-%d') AS ends
 FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id JOIN scholar_semesters ss ON ss.id=COALESCE(c.scholar_semester_id,?) JOIN semesters s ON s.id=ss.semester_id JOIN academic_years y ON y.id=s.academic_year_id WHERE i.id=? LOCK IN SHARE MODE`,[reused,instance]);
 if(!owner) throw new AuthError(409,'SEMESTER_DOCUMENT_REQUIRED','Prepare shared semester documents before reviewing a grading-card alternative.');
 await requireActiveDocument(db,instance,owner.id);
 const [[coverage]]=await db.execute<RowDataPacket[]>('SELECT * FROM requirement_coverage WHERE requirement_instance_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE',[instance]);
 if(coverage?.document_kind!=='cog') throw new AuthError(422,'DOCUMENT_TYPE_CONFLICT','The grading card can satisfy only the grades requirement.');
 const [previous]=await db.execute<RowDataPacket[]>(`SELECT ss.id FROM scholar_semesters ss JOIN semesters s ON s.id=ss.semester_id WHERE ss.scholar_id=? AND s.ends_on<? LOCK IN SHARE MODE`,[owner.scholar_id,owner.starts]);
 const [grades]=await db.execute<RowDataPacket[]>(`SELECT e.id FROM requirement_document_evidence e JOIN requirement_instances i ON i.id=e.instance_id JOIN requirement_checklists c ON c.id=i.checklist_id LEFT JOIN scholarship_records a ON a.id=c.scholarship_record_id LEFT JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id LEFT JOIN requirement_coverage ec ON ec.requirement_instance_id=e.instance_id AND ec.revision=(SELECT MAX(x.revision) FROM requirement_coverage x WHERE x.requirement_instance_id=e.instance_id) LEFT JOIN semesters covered ON covered.id=ec.coverage_semester_id WHERE COALESCE(a.scholar_id,ss.scholar_id)=? AND e.document_type='cog' AND (covered.ends_on<? OR ec.id IS NULL) LOCK IN SHARE MODE`,[owner.scholar_id,owner.starts]);
 const [academic]=await db.execute<RowDataPacket[]>('SELECT * FROM academic_records WHERE scholar_id=? ORDER BY id LOCK IN SHARE MODE',[owner.scholar_id]);
 const placements:Awaited<ReturnType<typeof academicCurrent>>[]=[];
 for(const record of academic) placements.push(await academicCurrent(db,record.id));
 const mapping=await semesterIdentity(db,owner.semester_id);
 const firstYear=academic.some((record,index)=>record.academic_year_id===owner.academic_year_id&&payrollYear(placements[index].placement.yearLevel)===1);
 const collegeHistoryConflict=previous.length>0||grades.length>0;
 const firstSemester=mapping.term===1;
 const document=await requirementState(db,instance);
 const [history]=await db.execute<RowDataPacket[]>('SELECT * FROM entrant_grading_card_reviews WHERE instance_id=? ORDER BY revision DESC LOCK IN SHARE MODE',[instance]);
 const [allocations]=await db.execute<RowDataPacket[]>('SELECT id FROM semester_entitlements WHERE scholar_id=? AND semester_id=? LOCK IN SHARE MODE',[owner.scholar_id,owner.semester_id]);
 const revocationBlocker=allocations.length?'An entitlement depends on this evidence; controlled review is required.':owner.locked_at||owner.archived_at||owner.year_locked||owner.year_archived?'Unlock or restore the period through the authorized configuration process before revoking.':null;
 const blocker=owner.locked_at||owner.archived_at||owner.year_locked||owner.year_archived||owner.ends<today()?'This receiving semester is read only.':allocations.length?'An entitlement depends on this evidence; controlled review is required.':previous.length||grades.length?'Recorded college-semester or COG evidence conflicts with first-time entrant status. Review that history; a grading card cannot replace it.':null;
 const editBlocker=document.version>0?'Received evidence cannot be relabelled. Use controlled document correction and reconciliation.':null;
 return {owner,coverage,firstSemester,firstYear,collegeHistoryConflict,sourceHash:digest(JSON.stringify({owner,coverage,mapping,previous,grades,academic,placements,document,history,allocations})),blocker,editBlocker,revocationBlocker,card:await entrantCard(db,instance),history};
}
export class EntrantGradingCardService {
 private authorization:AuthorizationService;
 constructor(pool:Pool|undefined){this.authorization=new AuthorizationService(pool);}
 read(actor:string,raw:string){const id=parseId(raw);return this.authorization.withPermission(actor,'scholars.read',db=>entrantCardContext(db,id));}
 command(actor:string,raw:string,rawKey:unknown,body:unknown,requestId:string){
  const id=parseId(raw),key=parseKey(rawKey);
  const text=(min:number,max:number)=>z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
  const approval=z.object({expectedRevision:z.number().int().nonnegative(),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),decision:z.literal('approved'),mode:z.enum(['grading_card','initial_requirements']).optional(),admissionAssessmentReference:text(3,300).optional(),admissionAssessmentReviewed:z.literal(true).optional(),initialRequirementsReviewed:z.literal(true).optional(),firstYearFirstSemester:z.literal(true).optional(),issuingSchool:text(2,200),schoolYear:text(3,80),gradingPeriod:text(2,100),periodEnd:z.iso.date(),reference:text(3,300),reason:text(5,500),firstTimeEntrant:z.literal(true),noCompletedCollegeSemester:z.literal(true),latestCompletedPeriod:z.literal(true),reviewed:z.literal(true)}).strict();
  const revocation=z.object({decision:z.literal('revoked'),expectedRevision:z.number().int().positive(),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),reference:text(3,300),reason:text(5,500),reviewed:z.literal(true)}).strict();
  const p=z.union([approval,revocation]).safeParse(body);
  if(!p.success)throw new AuthError(422,'VALIDATION_FAILED','Review entrant history, issuing school, latest completed grading period and authority evidence.');
  const parsed=p.data,operation='documents.entrant-card',hash=digest(JSON.stringify({id,input:parsed}));
  return this.authorization.withPermission(actor,'semesters.configure',async db=>{
   await db.query('SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE');
   const [[prior]]=await db.execute<RowDataPacket[]>('SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE',[actor,key]);
   if(prior){if(prior.payload_hash!==hash)throw new AuthError(409,'IDEMPOTENCY_CONFLICT','This key belongs to another action.');return typeof prior.result==='string'?JSON.parse(prior.result):prior.result;}
   const ctx=await entrantCardContext(db,id);
   if(ctx.sourceHash!==parsed.sourceHash||(ctx.card?.revision??0)!==parsed.expectedRevision)throw new AuthError(409,'SOURCE_CHANGED','Review the updated document and entrant history.');
   if(parsed.decision==='revoked' && (!ctx.card || ctx.card.decision!=='approved'))throw new AuthError(409,'ENTRANT_REVIEW_BLOCKED','Only an approved exception can be revoked.');
   if(parsed.decision==='revoked' && ctx.revocationBlocker)throw new AuthError(409,'ENTRANT_REVIEW_BLOCKED',ctx.revocationBlocker);
   const input=parsed.decision==='revoked' ? {...ctx.card!,...parsed} : parsed;
   if(parsed.decision==='approved') {
   if(parsed.mode==='initial_requirements'&&(!ctx.firstSemester||!ctx.firstYear||!parsed.initialRequirementsReviewed||!parsed.firstYearFirstSemester))throw new AuthError(409,'FIRST_SEMESTER_REVIEW_REQUIRED','Review the first regular semester mapping and the first-year entrant initial requirements.');
   if(parsed.mode==='initial_requirements'&&(!parsed.admissionAssessmentReference||!parsed.admissionAssessmentReviewed))throw new AuthError(422,'ADMISSION_ASSESSMENT_REQUIRED','Review the approved initial admission assessment and record its reference.');
   if(ctx.blocker)throw new AuthError(409,'ENTRANT_REVIEW_BLOCKED',ctx.blocker);
   if(ctx.editBlocker)throw new AuthError(409,'ENTRANT_REVIEW_BLOCKED',ctx.editBlocker);
   if(parsed.periodEnd>=ctx.owner.starts||parsed.periodEnd>today()||parsed.periodEnd<'1900-01-01')throw new AuthError(422,'DOCUMENT_COVERAGE_CONFLICT','The grading period must end before the receiving semester.');
   }
   const result={id:randomUUID(),revision:input.expectedRevision+1};
   await db.execute('INSERT INTO entrant_grading_card_reviews(id,instance_id,revision,decision,issuing_school,school_year,grading_period,period_end,reference_text,reason,source_hash,evidence,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[result.id,id,result.revision,input.decision,input.issuingSchool,input.schoolYear,input.gradingPeriod,input.periodEnd,input.reference,input.reason,ctx.sourceHash,JSON.stringify(input),actor]);
   await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'requirement_instance',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),operation,id,input.decision,actor,requestId,input.reason,JSON.stringify({...input,...result,idempotency_key:key})]);
   await db.execute('INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))',[actor,key,operation,hash,JSON.stringify(result)]);
   return result;
  });
 }
}
