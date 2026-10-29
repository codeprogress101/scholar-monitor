import {IntakeTextService} from './intake-text-service.js';
import {absentText} from './intake-text-model.js';
import {appendText,textSnapshot,textHash,textStates} from './intake-text-source.js';
import {randomUUID} from "node:crypto";
import type {PoolConnection,RowDataPacket} from "mysql2/promise";
import type {AuthorizationService} from "../authorization/service.js";
import {AuthError} from "../auth/service.js";
import {digest} from "../auth/crypto.js";
import {parseId,parseKey} from "../configuration/validation.js";
import {workingYear} from "../configuration/calendar.js";
import {continuingAdmission} from "../masterlists/continuing-admission.js";
import {officialMembership} from "../eligibility/official-membership.js";
import {ScholarService} from "./service.js";
import {finishIntake,intakeColumns,intakeHistory,intakeRevisionJoin,projectedIntake} from "./annual-intake-source.js";
import {canonicalIntakeValue,classificationCorrectionSchema,intakeQuerySchema,parseIntake,registrationSchema,registrationV2Schema,supplementSchema} from "./annual-intake-validation.js";
import type {AnnualIntake,InitialPlacement,IntakeView,RegistrationContext,RegistrationResult} from "./annual-intake-model.js";

function fail(code:string,message:string,details?:unknown):never {throw new AuthError(409,code,message,details);}
const decode=<T>(v:string|T):T=>typeof v==="string"?JSON.parse(v) as T:v;
type Working=RegistrationContext["workingContext"];
async function year(db:PoolConnection,id:string,expected?:number) {
 const [[y]]=await db.execute<RowDataPacket[]>("SELECT id,code,name,version,locked_at,archived_at,DATE_FORMAT(starts_on,'%Y-%m-%d') starts FROM academic_years WHERE id=? FOR UPDATE",[id]);
 if(!y||y.locked_at||y.archived_at)fail("ANNUAL_YEAR_UNAVAILABLE","Select an available academic year; locked or archived years remain read-only.");
 if(expected!==undefined&&y.version!==expected)fail("VERSION_CONFLICT","The academic year changed. Refresh before recording annual information.");
 return y;
}
export async function working(db:PoolConnection,id:string,expected:Working) {
 const current=await workingYear(db);
 if(!current||current.yearId!==id||current.id!==expected.settingId||current.version!==expected.settingVersion)fail("SOURCE_CHANGED","The working academic year changed. Review the current context.");
 return year(db,id,expected.academicYearVersion);
}
async function initialReferences(db:PoolConnection,p:InitialPlacement) {
 for(const [table,id] of [["schools",p.schoolId],["courses",p.courseId]] as const)if(id){const [[r]]=await db.execute<RowDataPacket[]>(`SELECT id,archived_at FROM ${table} WHERE id=? LOCK IN SHARE MODE`,[id]);if(!r||r.archived_at)fail("REFERENCE_UNAVAILABLE","Choose an existing active school/course or leave genuinely unknown information blank.");}
}
async function classConflict(db:PoolConnection,person:string,className:string,starts:string) {
 if(className!=="new")return;
 const baseline=await continuingAdmission(db,person);
 if(baseline)fail("ANNUAL_CLASSIFICATION_REVIEW_REQUIRED","Reviewed prior-beneficiary evidence conflicts with New. Refer the source for review.",{source:{kind:"continuing_baseline",id:baseline.id,eventId:baseline.event_id}});
 const [previous]=await db.execute<RowDataPacket[]>("SELECT r.id,r.academic_year_id FROM scholarship_records r JOIN academic_years y ON y.id=r.academic_year_id JOIN masterlist_activations a ON a.scholarship_id=r.id WHERE r.scholar_id=? AND y.ends_on<? ORDER BY y.starts_on,r.id",[person,starts]);
 // Reuse authoritative publication/lineage validation, never prior-year eligibility.
 for(const r of previous){const {official}=await officialMembership(db,{academicYearId:r.academic_year_id},r.id);if(official.valid)fail("ANNUAL_CLASSIFICATION_REVIEW_REQUIRED","Earlier official membership conflicts with first-time beneficiary classification.",{source:{kind:"official_membership",annualId:r.id,masterlistId:official.masterlistId}});}
}
export async function retry<T>(db:PoolConnection,actor:string,key:string,operation:string,hash:string):Promise<T|null> {
 const [[prior]]=await db.execute<RowDataPacket[]>("SELECT operation,payload_hash,result FROM annual_intake_commands WHERE actor_id=? AND command_id=? FOR UPDATE",[actor,key]);
 if(!prior)return null;
 if(prior.operation!==operation||prior.payload_hash!==hash)fail("IDEMPOTENCY_CONFLICT","This annual request key belongs to different changes.");
 return decode<T>(prior.result);
}
const commandHash=(operation:string,target:string|null,input:unknown)=>digest(JSON.stringify({format:input&&typeof input==="object"&&"format" in input?"annual-intake-command/v2":"annual-intake-command/v1",operation,target,input:canonicalIntakeValue(input)}));
export async function established(db:PoolConnection,person:string,yearId:string) {
 const [[r]]=await db.execute<RowDataPacket[]>(`SELECT
 (SELECT COUNT(*) FROM academic_records WHERE scholar_id=? AND academic_year_id=?) academicRecords,
 (SELECT COUNT(*) FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?) annualRecords,
 (SELECT COUNT(*) FROM masterlist_entries e JOIN masterlist_versions m ON m.id=e.masterlist_id WHERE e.scholar_id=? AND m.academic_year_id=? AND m.status IN ('approved','published','locked')) publications,
 (SELECT COUNT(*) FROM semester_entitlements e JOIN semesters s ON s.id=e.semester_id WHERE e.scholar_id=? AND s.academic_year_id=?) entitlements`,[person,yearId,person,yearId,person,yearId,person,yearId]);
 return {academicRecords:Number(r.academicRecords),annualRecords:Number(r.annualRecords),publications:Number(r.publications),entitlements:Number(r.entitlements)};
}
async function receipt(db:PoolConnection,actor:string,key:string,operation:string,hash:string,intake:AnnualIntake,result:unknown,reason:string,requestId:string,before:AnnualIntake|null,context:unknown=null) {
 await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'scholar_intake',?,? ,?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),before?operation==="correct_classification"?"scholar.intake.classification-corrected":"scholar.intake.supplemented":"scholar.intake.registered",intake.id,operation,actor,requestId,reason,JSON.stringify({before,after:intake,established:context,...(result&&typeof result==="object"&&"suppliedText" in result?{suppliedText:result.suppliedText}:{}),idempotency_key:key})]);
 await db.execute("INSERT INTO annual_intake_commands(actor_id,command_id,operation,payload_hash,intake_id,resulting_revision,result,recorded_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",[actor,key,operation,hash,intake.id,intake.revision,JSON.stringify(result)]);
}
export class AnnualIntakeService {
 readonly text:IntakeTextService;
 constructor(private authorization:Pick<AuthorizationService,"withPermission"|"readSnapshot">){this.text=new IntakeTextService(authorization);}
 context(actor:string):Promise<RegistrationContext> {
  return this.authorization.readSnapshot(actor,"scholars.create",async db=>{const current=await workingYear(db);if(!current)fail("WORKING_YEAR_REQUIRED","An explicit working academic year is required before annual registration.");const y=await year(db,current.yearId);return {workingContext:{settingId:current.id,settingVersion:current.version,academicYearVersion:y.version},academicYear:{id:y.id,code:y.code,name:y.name}};});
 }
 register(actor:string,rawKey:unknown,raw:unknown,requestId:string):Promise<RegistrationResult> {
  const v2=Boolean(raw&&typeof raw==='object'&&'format' in raw);const input=v2?parseIntake(registrationV2Schema,raw):parseIntake(registrationSchema,raw),key=parseKey(rawKey),operation=input.identity.mode==="new"?"register_new_identity":"register_existing_identity",target=input.identity.mode==="reuse"?input.identity.scholarId:null,hash=commandHash(operation,target,input);
  return this.authorization.withPermission(actor,"scholars.create",async(db,access)=>{
   const prior=await retry<RegistrationResult>(db,actor,key,operation,hash);if(prior)return prior;
   const y=await working(db,input.annualIntake.academicYearId,input.workingContext);await initialReferences(db,input.annualIntake.initialPlacement);
   let person:{id:string;scholarId:string;version:number};
   if(input.identity.mode==="new") {
    const scoped:Pick<AuthorizationService,"withPermission"|"readSnapshot">={withPermission:async(user,permission,run)=>{if(user!==actor||!access.permissions.some(p=>p.code===permission))throw new AuthError(403,"PERMISSION_DENIED","Your account cannot perform this registration step.");return run(db,access);},readSnapshot:async(user,permission,run)=>{if(user!==actor||permission&&!access.permissions.some(p=>p.code===permission))throw new AuthError(403,"PERMISSION_DENIED","Read permission required.");return run(db,access);}};
    person=await new ScholarService(scoped).write(actor,undefined,randomUUID(),{expectedVersion:0,reason:input.reason,fields:input.identity.fields,...(input.identity.duplicateResolution?{duplicateResolution:input.identity.duplicateResolution}:{})},requestId);
   }else {
    const [[p]]=await db.execute<RowDataPacket[]>("SELECT s.id,s.version,i.human_id FROM scholars s JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE s.id=? FOR UPDATE",[input.identity.scholarId]);
    if(!p)throw new AuthError(404,"SCHOLAR_NOT_FOUND","The selected existing scholar was not found.");
    if(p.version!==input.identity.expectedVersion)fail("VERSION_CONFLICT","The selected identity changed. Review it again.");person={id:p.id,scholarId:p.human_id,version:p.version};
   }
   const [[existing]]=await db.execute<RowDataPacket[]>("SELECT id FROM scholar_intakes WHERE scholar_id=? AND academic_year_id=? FOR UPDATE",[person.id,input.annualIntake.academicYearId]);
   if(existing)fail("ANNUAL_INTAKE_EXISTS","This person already has annual intake evidence. Open its history instead of replacing it.",{intake:(await intakeHistory(db,existing.id)).at(-1)!.snapshot});
   await classConflict(db,person.id,input.annualIntake.classification,y.starts);
   const id=randomUUID(),a=input.annualIntake,p=a.initialPlacement;
   const supplied=v2?parseIntake(registrationV2Schema,raw).annualIntake.suppliedText:undefined;
   const predicted=finishIntake({id,scholarId:person.id,academicYearId:a.academicYearId,revision:1,classification:a.classification,originalClassification:a.classification,sourceKind:'manual',sourceReference:a.sourceReference,rootSourceReference:a.sourceReference,importJobId:null,sourceRow:null,initialPlacement:p,actorId:actor,recordedAt:''});
   const initial=supplied?textSnapshot(predicted,absentText(),supplied,'registered',a.sourceReference,input.reason):null;
   await db.execute("INSERT INTO scholar_intakes(id,scholar_id,academic_year_id,school_id,course_id,year_level,classification,supplied_details,import_job_id,source_row,actor_id,recorded_at,origin_kind,source_reference) VALUES(?,?,?,?,?,?,?,?,NULL,NULL,?,UTC_TIMESTAMP(6),'manual',?)",[id,person.id,a.academicYearId,p.schoolId,p.courseId,p.yearLevel,a.classification,JSON.stringify({format:supplied?"manual-intake/v2":"manual-intake/v1",academicYearId:a.academicYearId,classification:a.classification,sourceReference:a.sourceReference,initialPlacement:p,...(initial?{suppliedText:{format:"intake-supplied-text/v1",initialRevision:1,initialHash:textHash(initial)}}:{}),identityReview:input.identity.mode==="reuse"?input.identity.identityReference:null}),actor,a.sourceReference]);
   const intake=(await intakeHistory(db,id,true))[0].snapshot,result:RegistrationResult={...person,annualIntake:intake,registrationOnly:true,...(supplied?{suppliedText:await appendText(db,actor,key,requestId,intake,absentText(),supplied,"registered",a.sourceReference,input.reason)}:{})};
   await receipt(db,actor,key,operation,hash,intake,result,input.reason,requestId,null);return result;
  });
 }
 revise(actor:string,rawId:unknown,rawKey:unknown,raw:unknown,correction:boolean,requestId:string) {
  const id=parseId(rawId),key=parseKey(rawKey),input=correction?parseIntake(classificationCorrectionSchema,raw):parseIntake(supplementSchema,raw),operation=correction?"correct_classification":"supplement_initial_details",hash=commandHash(operation,id,input);
  return this.authorization.withPermission(actor,correction?"scholars.intakes.correct":"scholars.update",async(db,access)=>{
   if(!correction&&!access.permissions.some(p=>p.code==="academic.edit"))throw new AuthError(403,"PERMISSION_DENIED","Initial supplements require scholar update and academic edit permissions.");
   const prior=await retry<AnnualIntake>(db,actor,key,operation,hash);if(prior)return prior;
   const before=(await intakeHistory(db,id,true)).at(-1)!.snapshot;
   if(before.revision!==input.expectedRevision||before.snapshotHash!==input.expectedSnapshotHash)fail("VERSION_CONFLICT","Annual information changed. Refresh its source and history.");
   const y=await year(db,before.academicYearId,input.academicYearVersion),context=await established(db,before.scholarId,before.academicYearId);
   let placement=before.initialPlacement,className=before.classification;
   if("classification" in input){
    if(input.classification===className)fail("ANNUAL_INTAKE_NO_CHANGE","The supplied classification is unchanged.");
    await classConflict(db,before.scholarId,input.classification,y.starts);className=input.classification;
   }else {
    await working(db,before.academicYearId,input.workingContext);
    if(before.sourceKind!=="manual"||context.academicRecords||context.annualRecords||context.publications||context.entitlements)fail("INITIAL_DETAILS_PROTECTED","Use the controlled academic workflow; initial supplements cannot change established academic or annual evidence.");
    placement=input.initialPlacement;
    if(Object.entries(before.initialPlacement).some(([k,v])=>v!==null&&placement[k as keyof InitialPlacement]!==v))fail("INITIAL_DETAILS_PROTECTED","Only genuinely missing initial fields can be supplemented. Known placement needs its controlled workflow.");
    if(JSON.stringify(placement)===JSON.stringify(before.initialPlacement))fail("ANNUAL_INTAKE_NO_CHANGE","No missing initial information was added.");
    await initialReferences(db,placement);
   }
   await db.execute("INSERT INTO scholar_intake_revisions(intake_id,revision,action,classification,school_id,course_id,year_level,before_hash,reason,source_reference,actor_id,command_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",[id,before.revision+1,operation,className,placement.schoolId,placement.courseId,placement.yearLevel,before.snapshotHash,input.reason,input.sourceReference,actor,key]);
   const after=(await intakeHistory(db,id,true)).at(-1)!.snapshot;
   await receipt(db,actor,key,operation,hash,after,after,input.reason,requestId,before,context);return after;
  });
 }
 list(actor:string,rawPerson:unknown,raw:unknown) {
  const person=parseId(rawPerson),q=parseIntake(intakeQuerySchema,raw);
  return this.authorization.readSnapshot(actor,"scholars.read",async db=>{
   const where="si.scholar_id=?"+(q.academicYearId?" AND si.academic_year_id=?":""),args=[person,...(q.academicYearId?[q.academicYearId]:[])];
   const [[count]]=await db.execute<RowDataPacket[]>(`SELECT COUNT(*) n FROM scholar_intakes si WHERE ${where}`,args);
   const [rows]=await db.execute<RowDataPacket[]>(`SELECT ${intakeColumns},y.version year_version,y.locked_at,y.archived_at FROM scholar_intakes si ${intakeRevisionJoin} JOIN academic_years y ON y.id=si.academic_year_id WHERE ${where} ORDER BY y.starts_on DESC,si.id LIMIT ? OFFSET ?`,[...args,q.limit,q.offset]);
   const texts=await textStates(db,rows.map(r=>String(r.annual_intake_id)));
   const items:IntakeView[]=[];
   for(const r of rows){const intake=projectedIntake(r)!,context=await established(db,person,intake.academicYearId);items.push({intake,suppliedText:texts.get(intake.id)!.state,initialSuppliedText:texts.get(intake.id)!.initial,academicYearVersion:r.year_version,periodUnavailable:Boolean(r.locked_at||r.archived_at),canSupplement:intake.sourceKind==="manual"&&!r.locked_at&&!r.archived_at&&!Object.values(context).some(Boolean),established:context});}
   return {items,total:Number(count.n),offset:q.offset,limit:q.limit};
  });
 }
 history(actor:string,rawId:unknown,raw:unknown) {
  const id=parseId(rawId),q=parseIntake(intakeQuerySchema,raw);
  return this.authorization.readSnapshot(actor,"scholars.read",async db=>{const rows=await intakeHistory(db,id);if(q.academicYearId&&rows[0].snapshot.academicYearId!==q.academicYearId)fail("WRONG_ACADEMIC_YEAR","The intake belongs to another academic year.");const [links]=await db.execute<RowDataPacket[]>("SELECT b.id,b.import_job_id,j.file_name,b.source_row,b.intake_revision,b.intake_hash,b.binding_hash,b.identity_reference,b.actor_id,b.recorded_at FROM import_intake_bindings b JOIN import_jobs j ON j.id=b.import_job_id WHERE b.intake_id=? ORDER BY b.recorded_at,b.id LIMIT ? OFFSET ?",[id,q.limit,q.offset]);const [[count]]=await db.execute<RowDataPacket[]>("SELECT COUNT(*) n FROM import_intake_bindings WHERE intake_id=?",[id]);return {items:rows.slice(q.offset,q.offset+q.limit),total:rows.length,offset:q.offset,limit:q.limit,linkedImports:{items:links,total:Number(count.n)}};});
 }
}
