import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {parseId} from '../configuration/validation.js';
import {monitoringReadSql} from '../scholars/graduation-monitoring.js';
import {GraduationCommands,availablePeriod,fail,fingerprint} from './commands.js';
import {page,parse} from './duration-validation.js';
import {splitMonitoring} from './monitoring-validation.js';
import type {Assessment,Basis,MonitoringSnapshot,ReviewPanel} from './monitoring-model.js';
import type {EvidenceSource} from './duration-model.js';
import {authorizedMonitoringQuery,annualContextFromRow,basisFromRow,monitoringHead,monitoringView} from './monitoring-source.js';
const reviewOps=['review_correction','correct_assessment','revalidate_assessment','review_program_context'];
const firstOps=['record_expected','record_delayed','follow_up','flag_review','record_program_context'];
const panelQuery=z.object({academicYearId:z.uuid(),semesterId:z.uuid().optional()}).strict();
type Input=ReturnType<typeof splitMonitoring>;
function validated(raw:unknown,create:boolean){try{return splitMonitoring(raw,create);}catch(e){if(e instanceof AuthError)throw e;throw new AuthError(422,'VALIDATION_FAILED',e instanceof z.ZodError?e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join(' ').slice(0,800):'Use only the supported monitoring fields.');}}
const materialReady=(b:Basis)=>b.duration!==null&&!b.unresolved.some(r=>['ACADEMIC_CONTEXT_REQUIRED','DURATION_REFERENCE_REQUIRED','DURATION_REFERENCE_CONFLICT','PROGRAM_CONTEXT_REQUIRED','PROGRAM_CONTEXT_STALE','SEMESTER_CONTEXT_REQUIRED'].includes(r));
export const basisFingerprint=(b:Basis)=>fingerprint({...b,unresolved:[]});
const evidenceFingerprint=(source:EvidenceSource)=>fingerprint(source);
export class MonitoringEvidenceService {
 private commands:GraduationCommands;
 constructor(private auth:AuthorizationService,private enabled=false){this.commands=new GraduationCommands(auth,enabled);}
 private async panel(db:PoolConnection,person:string,year:string,semester:string|null):Promise<ReviewPanel>{
  const {sql,args}=monitoringReadSql({academicYearId:year,...(semester?{semesterId:semester}:{})},person);const [[row]]=await db.execute<RowDataPacket[]>(authorizedMonitoringQuery(sql,'SELECT * FROM monitoring'),args);if(!row)throw new AuthError(404,'SCHOLAR_CONTEXT_NOT_FOUND','No scholar association exists in this academic year.');
  const [[y]]=await db.execute<RowDataPacket[]>('SELECT version,locked_at,archived_at FROM academic_years WHERE id=?',[year]);let sem:RowDataPacket|undefined;
  if(semester){const [[r]]=await db.execute<RowDataPacket[]>('SELECT version,locked_at,archived_at FROM semesters WHERE id=? AND academic_year_id=?',[semester,year]);sem=r;if(!sem)throw new AuthError(422,'SEMESTER_YEAR_MISMATCH','The semester does not belong to this year.');}
  const [[root]]=await db.execute<RowDataPacket[]>('SELECT id FROM graduation_monitoring_cases WHERE scholar_id=? AND academic_year_id=? AND scope_key=?',[person,year,semester??'00000000-0000-0000-0000-000000000000']);
  const current=root?await monitoringHead(db,root.id):null,basis=basisFromRow(row),annualContext=annualContextFromRow(row);
  let materialTargetRevision=current?.snapshot.assessment?.revision??current?.snapshot.reviewFinding?.revision??null;
  if(materialTargetRevision===null&&current?.snapshot.reviewRequired){const [[flag]]=await db.execute<RowDataPacket[]>("SELECT revision FROM graduation_monitoring_events WHERE case_id=? AND event_kind='flag_review' ORDER BY revision DESC LIMIT 1",[current.snapshot.id]);materialTargetRevision=flag?Number(flag.revision):null;}
  return {scholarId:person,academicYearId:year,semesterId:semester,academicYearVersion:Number(y.version),semesterVersion:sem?Number(sem.version):null,periodUnavailable:Boolean(y.locked_at||y.archived_at||sem?.locked_at||sem?.archived_at),case:current,annualContext,basis,sourceHash:basisFingerprint(basis),writesEnabled:this.enabled,materialTargetRevision};
 }
 detail(actor:string,rawPerson:unknown,rawQuery:unknown){const person=parseId(rawPerson),q=parse(panelQuery,rawQuery);return this.auth.readSnapshot(actor,'scholars.read',db=>this.panel(db,person,q.academicYearId,q.semesterId??null));}
 history(actor:string,rawId:unknown,rawQuery:unknown){const id=parseId(rawId),q=parse(page,rawQuery);return this.auth.readSnapshot(actor,'scholars.read',async db=>{await monitoringHead(db,id);const [[count]]=await db.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM graduation_monitoring_events WHERE case_id=?',[id]);const [rows]=await db.execute<RowDataPacket[]>('SELECT * FROM graduation_monitoring_events WHERE case_id=? ORDER BY revision LIMIT ? OFFSET ?',[id,q.limit,q.offset]);return {...q,total:Number(count.n),items:rows.map(monitoringView)};});}
 write(actor:string,rawId:unknown,key:unknown,raw:unknown,requestId:string){const create=rawId===undefined,id=create?null:parseId(rawId),i=validated(raw,create),permission=reviewOps.includes(i.operation)?'graduation.monitoring.review':'graduation.monitoring.record';
  const owner=create?i as Input&{scholarId:string;academicYearId:string;semesterId:string|null}:null;
  if(create&&!firstOps.includes(i.operation))throw new AuthError(422,'VALIDATION_FAILED','This operation requires an existing case and earlier event.');
  const target=owner?{scholarId:owner.scholarId,academicYearId:owner.academicYearId,semesterId:owner.semesterId}:id;
  return this.commands.run(actor,key,permission,`monitoring.${create?'create':'event'}.${i.operation}`,target,i,requestId,async(db,_access,command)=>{
   let person=owner?.scholarId,year=owner?.academicYearId,semester=owner?.semesterId??null;
   if(id){const [[r]]=await db.execute<RowDataPacket[]>('SELECT * FROM graduation_monitoring_cases WHERE id=? FOR UPDATE',[id]);if(!r)fail('GRADUATION_CASE_NOT_FOUND','Monitoring case not found.');person=r.scholar_id;year=r.academic_year_id;semester=r.semester_id;}
   const p=await this.panel(db,person!,year!,semester),before=p.case;
   if(create&&before)fail('GRADUATION_CASE_EXISTS','This scholar already has a case in this scope. Open its existing history.');
   if(i.expectedRevision!==(before?.snapshot.revision??0)||i.expectedSnapshotHash!==(before?.snapshotHash??null))fail('GRADUATION_VERSION_CONFLICT','The case changed. Refresh its source and history.');
   await availablePeriod(db,year!,i.academicYearVersion,semester,i.semesterVersion);
   if(i.expectedSourceHash!==p.sourceHash)fail('MONITORING_SOURCE_CHANGED','Current placement, context or duration changed. Review the new source.');
   const caseId=id??randomUUID(),revision=(before?.snapshot.revision??0)+1;
   const source=this.inputSource(i,before?.snapshot.lastSource??null);
   const s:MonitoringSnapshot=before?structuredClone(before.snapshot):{format:'graduation-monitoring/v1',id:caseId,scholarId:person!,academicYearId:year!,semesterId:semester,revision,assessment:null,reviewRequired:false,pending:null,context:null,followUp:null,lastSource:source,effect:'needs_review'};
   s.revision=revision;s.lastSource=source;let corrects:number|null=null,reviews:number|null=null;
   const verifyTarget=async(targetRevision:number,kinds?:string[])=>{if(targetRevision>=revision)fail('GRADUATION_HISTORY_INTEGRITY','The target must be an earlier event in this case.');const [[r]]=await db.execute<RowDataPacket[]>('SELECT * FROM graduation_monitoring_events WHERE case_id=? AND revision=?',[caseId,targetRevision]);if(!r||kinds&&!kinds.includes(r.event_kind))fail('GRADUATION_HISTORY_INTEGRITY','The target does not belong to the required case/event kind.');return monitoringView(r);};
   const materialTarget=async()=>{if(s.assessment)return s.assessment.revision;if(!s.reviewRequired)return null;const [[flag]]=await db.execute<RowDataPacket[]>("SELECT revision FROM graduation_monitoring_events WHERE case_id=? AND event_kind='flag_review' ORDER BY revision DESC LIMIT 1",[caseId]);return flag?Number(flag.revision):null;};
   const accept=async(facts:Assessment)=>{await this.period(db,facts);const basis={...p.basis,unresolved:p.basis.unresolved.filter(code=>!['MONITORING_REVIEW_PENDING','MONITORING_SOURCE_CHANGED'].includes(code))};s.assessment={revision,facts,basis,sourceFingerprint:evidenceFingerprint(facts.source)};s.reviewFinding=null;s.reviewRequired=!materialReady(basis);s.effect=s.reviewRequired?'needs_review':'accepted';};
   switch(i.operation){
    case 'record_expected':case 'record_delayed': {
     if(s.pending||s.reviewRequired)fail('MONITORING_REVIEW_PENDING','Resolve the pending material review before recording a replacement assessment.');
     if(s.assessment&&s.assessment.sourceFingerprint===evidenceFingerprint(i.details.source))fail('MONITORING_CORRECTION_REQUIRED','This source already supports an earlier assessment. Use the linked correction/revalidation workflow.');
     await accept(i.details);break;
    }
    case 'follow_up':if(i.details.correctsRevision){await verifyTarget(i.details.correctsRevision,['follow_up']);corrects=i.details.correctsRevision;}s.followUp=i.details;break;
    case 'flag_review':s.reviewRequired=true;s.reviewFinding={revision,source:i.details.source,finding:i.details.finding};s.effect='needs_review';break;
    case 'propose_correction':
     if(s.pending)fail('MONITORING_REVIEW_PENDING','A material correction is already pending.');
     await verifyTarget(i.details.targetRevision);if(await materialTarget()!==i.details.targetRevision)fail('MONITORING_CORRECTION_REQUIRED','Select the current assessment or unresolved evidence-review origin.');
     await this.period(db,i.details.replacement);s.pending={revision,targetRevision:i.details.targetRevision,replacement:i.details.replacement};s.reviewRequired=true;s.effect='needs_review';corrects=i.details.targetRevision;break;
    case 'review_correction': {
     if(!s.pending||s.pending.revision!==i.details.targetRevision)fail('MONITORING_REVIEW_PENDING','Select the actual pending correction.');
     await verifyTarget(i.details.targetRevision,['propose_correction']);if(i.details.reviewSourceHash!==p.sourceHash)fail('MONITORING_SOURCE_CHANGED','Review source changed.');reviews=i.details.targetRevision;
     if(i.details.disposition==='apply_replacement')await accept(s.pending.replacement);
     else if(i.details.disposition==='retain_current_revalidated'){if(!s.assessment||!materialReady(p.basis))fail('MONITORING_SOURCE_CHANGED','Current facts cannot be retained without a resolved fresh basis.');await accept(s.assessment.facts);}
     else {s.reviewRequired=true;s.effect='needs_review';}s.pending=null;break;
    }
    case 'correct_assessment':
     if(s.pending)fail('MONITORING_REVIEW_PENDING','Use the pending correction review.');await verifyTarget(i.details.targetRevision);if(await materialTarget()!==i.details.targetRevision)fail('MONITORING_CORRECTION_REQUIRED','Select the current assessment or unresolved evidence-review origin.');corrects=i.details.targetRevision;await accept(i.details.replacement);break;
    case 'revalidate_assessment':
     if(s.pending)fail('MONITORING_REVIEW_PENDING','A pending correction requires its own disposition.');await verifyTarget(i.details.targetRevision);if(!s.assessment||s.assessment.revision!==i.details.targetRevision||i.details.reviewSourceHash!==p.sourceHash||!materialReady(p.basis))fail('MONITORING_SOURCE_CHANGED','Revalidation needs the unchanged assessment and resolved fresh source review.');reviews=i.details.targetRevision;await accept(s.assessment.facts);break;
    case 'record_program_context':
     if(semester)fail('PROGRAM_CONTEXT_ANNUAL_REQUIRED','Program context belongs to the annual case.');s.context={state:'proposed',revision,curriculumCode:i.details.curriculumCode,cohortCode:i.details.cohortCode,placementHash:p.basis.placementHash,source:i.details.source};if(s.assessment){s.reviewRequired=true;s.effect='needs_review';}break;
    case 'review_program_context':
     if(semester||!s.context||s.context.state!=='proposed'||s.context.revision!==i.details.targetRevision)fail('PROGRAM_CONTEXT_REQUIRED','Select the annual pending context proposal.');await verifyTarget(i.details.targetRevision,['record_program_context']);if(i.details.reviewSourceHash!==p.sourceHash||i.details.decision==='confirm'&&(s.context.placementHash!==p.basis.placementHash||p.basis.unresolved.includes('ACADEMIC_CONTEXT_REQUIRED')))fail('MONITORING_SOURCE_CHANGED','Academic context changed or remains unresolved.');reviews=i.details.targetRevision;s.context={...s.context,state:i.details.decision==='confirm'?'confirmed':'disputed',revision};break;
   }
   if(!id)await db.execute('INSERT INTO graduation_monitoring_cases(id,scholar_id,academic_year_id,semester_id,created_by,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))',[caseId,person!,year!,semester,actor]);
   const basis=s.assessment?.basis,duration=basis?.duration;
   await db.execute('INSERT INTO graduation_monitoring_events(case_id,revision,previous_revision,before_hash,snapshot_hash,event_kind,assessment_kind,assessment_revision,review_required,pending_review_revision,program_context_state,program_context_revision,curriculum_code,cohort_code,placement_hash,duration_reference_id,duration_revision,duration_snapshot_hash,corrects_revision,reviews_revision,snapshot,source_reference,reason,actor_id,command_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[caseId,revision,before?.snapshot.revision??null,before?.snapshotHash??null,fingerprint(s),i.operation,s.assessment?.facts.kind??(s.reviewRequired?'needs_review':'none'),s.assessment?.revision??null,s.reviewRequired?1:0,s.pending?.revision??null,s.context?.state??'none',s.context?.revision??null,s.context?.curriculumCode??null,s.context?.cohortCode??null,basis?.placementHash??null,duration?.id??null,duration?.revision??null,duration?.hash??null,corrects,reviews,JSON.stringify(s),source.reference,i.reason,actor,command]);
   const result=await monitoringHead(db,caseId);return {id:caseId,revision,result,reason:i.reason,before:before?.snapshot??null,after:s};
  },'monitoring',create);
 }
 private inputSource(i:Input,previous:EvidenceSource|null):EvidenceSource {if('source'in i.details)return i.details.source;if('replacement'in i.details)return i.details.replacement.source;if(previous)return previous;fail('MONITORING_SOURCE_REQUIRED','A supported source reference is required.');}
 private async period(db:PoolConnection,facts:Assessment){const p=facts.period;if(!p||p.precision==='date')return;if(p.academicYearId){const [[y]]=await db.execute<RowDataPacket[]>('SELECT id FROM academic_years WHERE id=?',[p.academicYearId]);if(!y)fail('MONITORING_SOURCE_CHANGED','The named expected academic year was not found. Keep unconfigured labels with unknown IDs.');}if(p.precision==='semester'&&p.semesterId){const [[s]]=await db.execute<RowDataPacket[]>('SELECT academic_year_id FROM semesters WHERE id=?',[p.semesterId]);if(!s||!p.academicYearId||s.academic_year_id!==p.academicYearId)fail('MONITORING_SOURCE_CHANGED','Expected semester/year must agree.');}}
}
