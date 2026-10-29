import type {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {parseId,parseKey} from '../configuration/validation.js';
import {intakeHistory} from './annual-intake-source.js';
import {intakeQuerySchema,parseIntake} from './annual-intake-validation.js';
import {textCompletionSchema,textCorrectionSchema} from './intake-text-validation.js';
import {textStates,appendText,textHash,textFailure} from './intake-text-source.js';
import {working,established,retry} from './annual-intake-service.js';
export class IntakeTextService {
 constructor(private authorization:Pick<AuthorizationService,'withPermission'|'readSnapshot'>){}
 revise(actor:string,rawId:unknown,rawKey:unknown,raw:unknown,correction:boolean,requestId:string){
  const id=parseId(rawId),key=parseKey(rawKey),input=correction?parseIntake(textCorrectionSchema,raw):parseIntake(textCompletionSchema,raw),operation=correction?'correct_supplied_text':'record_supplied_text',hash=textHash({format:'intake-supplied-text-command/v1',operation,target:id,input});
  return this.authorization.withPermission(actor,correction?'scholars.intakes.correct':'scholars.update',async(db,access)=>{
   if(!correction&&!access.permissions.some(p=>p.code==='academic.edit'))throw new AuthError(403,'PERMISSION_DENIED','Missing academic edit permission.');
   const prior=await retry<Record<string,unknown>>(db,actor,key,operation,hash);if(prior)return prior;
   const bases=await intakeHistory(db,id,true),intake=bases.at(-1)!.snapshot;
   if(intake.sourceKind!=='manual')throw new AuthError(409,'INITIAL_DETAILS_PROTECTED','Imported wording remains in its original workbook evidence.');
   await working(db,intake.academicYearId,input.workingContext);
   const loaded=(await textStates(db,[id],true)).get(id)!;for(const event of loaded.events)if(!bases.some(b=>b.revision===event.basisIntakeRevision&&b.snapshot.snapshotHash===event.basisIntakeHash))textFailure();const before=loaded.state;
   if(intake.revision!==input.expectedIntakeRevision||intake.snapshotHash!==input.expectedIntakeHash||before.revision!==input.expectedTextRevision||before.snapshotHash!==input.expectedTextHash)throw new AuthError(409,'VERSION_CONFLICT','Intake or supplied wording changed. Read the current source before retrying.');
   const context=await established(db,intake.scholarId,intake.academicYearId);
   if(!correction&&Object.values(context).some(Boolean))throw new AuthError(409,'INITIAL_DETAILS_PROTECTED','Established records require reviewed supplied-text correction.');
   const after=await appendText(db,actor,key,requestId,intake,before,input.suppliedText,correction?'corrected':'completed',input.sourceReference,input.reason);
   const result={intakeId:id,basisIntakeRevision:intake.revision,basisIntakeHash:intake.snapshotHash,textRevision:after.revision,suppliedText:after,established:context};
   await db.execute('INSERT INTO annual_intake_commands(actor_id,command_id,operation,payload_hash,intake_id,resulting_revision,result,recorded_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[actor,key,operation,hash,id,after.revision,JSON.stringify(result)]);return result;
  });
 }
 history(actor:string,rawId:unknown,raw:unknown){const id=parseId(rawId),q=parseIntake(intakeQuerySchema,raw);return this.authorization.readSnapshot(actor,'scholars.read',async db=>{
  const intake=await intakeHistory(db,id);if(q.academicYearId&&q.academicYearId!==intake[0].snapshot.academicYearId)throw new AuthError(409,'WRONG_ACADEMIC_YEAR','Wrong selected year.');
  const loaded=(await textStates(db,[id],true)).get(id)!;
  for(const event of loaded.events)if(!intake.some(i=>i.revision===event.basisIntakeRevision&&i.snapshot.snapshotHash===event.basisIntakeHash))textFailure();
  return {items:loaded.events.slice(q.offset,q.offset+q.limit),total:loaded.events.length,offset:q.offset,limit:q.limit,current:loaded.state,initial:loaded.initial};
 });}
}
