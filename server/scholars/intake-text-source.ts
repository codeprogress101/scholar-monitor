import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {digest} from '../auth/crypto.js';
import {AuthError} from '../auth/service.js';
import {canonicalIntakeValue} from './annual-intake-validation.js';
import type {AnnualIntake} from './annual-intake-model.js';
import {absentText,blankSuppliedText,validSuppliedText,type SuppliedText,type TextState,type TextEvent} from './intake-text-model.js';
export const textFailure=():never=>{throw new AuthError(409,'INTAKE_TEXT_INTEGRITY','Supplied text history needs controlled investigation.');};
const decode=(v:unknown):Record<string,unknown>=>typeof v==='string'?JSON.parse(v):v as Record<string,unknown>;
export const textHash=(v:unknown)=>digest(JSON.stringify(canonicalIntakeValue(v)));
export function textSnapshot(intake:AnnualIntake,before:TextState,text:SuppliedText,action:TextEvent['action'],sourceReference:string,reason:string){
 return {format:'intake-supplied-text/v1' as const,intakeId:intake.id,scholarId:intake.scholarId,academicYearId:intake.academicYearId,revision:before.revision+1,previousRevision:before.revision||null,beforeHash:before.snapshotHash,action,...text,basisIntakeRevision:intake.revision,basisIntakeHash:intake.snapshotHash,sourceReference,reason};
}
export function validateTextTransition(before:TextState,after:SuppliedText,action:TextEvent['action']){
 if(![after.schoolText,after.courseText].every(v=>validSuppliedText(v)&&blankSuppliedText(v)===v))return false;
 const changed=after.schoolText!==before.schoolText||after.courseText!==before.courseText;
 if(action==='registered')return before.revision===0;
 if(!changed)return false;
 return action==='corrected'||action==='completed'&&(['schoolText','courseText'] as const).every(k=>before[k]===null||before[k]===after[k]);
}
export function decodeTextEvent(root:RowDataPacket,row:RowDataPacket):TextEvent {
 try {
  const expected={format:'intake-supplied-text/v1',intakeId:root.id,scholarId:root.scholar_id,academicYearId:root.academic_year_id,revision:row.revision,previousRevision:row.previous_revision,beforeHash:row.before_hash,action:row.action,schoolText:row.school_text,courseText:row.course_text,basisIntakeRevision:row.basis_intake_revision,basisIntakeHash:row.basis_intake_hash,sourceReference:row.source_reference,reason:row.reason};
  if(root.origin_kind!=='manual'||textHash(expected)!==row.snapshot_hash||textHash(decode(row.snapshot))!==row.snapshot_hash||row.revision<1||row.basis_intake_revision<1||!['registered','completed','corrected'].includes(row.action)||!/^\P{Cc}{3,300}$/u.test(row.source_reference)||!/^\P{Cc}{5,500}$/u.test(row.reason)||!Object.values({schoolText:row.school_text,courseText:row.course_text}).every(v=>validSuppliedText(v)&&blankSuppliedText(v)===v))textFailure();
  if(row.revision===1?(row.previous_revision!==null||row.before_hash!==null):(row.previous_revision!==row.revision-1||!/^[a-f0-9]{64}$/.test(row.before_hash)))textFailure();
  return {intakeId:root.id,revision:row.revision,snapshotHash:row.snapshot_hash,schoolText:row.school_text,courseText:row.course_text,action:row.action,basisIntakeRevision:row.basis_intake_revision,basisIntakeHash:row.basis_intake_hash,sourceReference:row.source_reference,reason:row.reason,actorId:row.actor_id,recordedAt:row.recorded_at instanceof Date?row.recorded_at.toISOString():String(row.recorded_at)};
 }catch{return textFailure();}
}
/** At most initial/head/predecessor per root for page/preview reads; full chain only on explicit history. */
export async function textStates(db:PoolConnection,ids:string[],full=false,pins:{id:string;revision:number}[]=[]){
 const result=new Map<string,{state:TextState;initial:TextEvent|null;events:TextEvent[];root:RowDataPacket}>();
 for(let offset=0;offset<ids.length;offset+=1500){const part=[...new Set(ids.slice(offset,offset+1500))];if(!part.length)continue;
  const marks=part.map(()=>'?').join(','),[roots]=await db.execute<RowDataPacket[]>(`SELECT id,scholar_id,academic_year_id,origin_kind,supplied_details FROM scholar_intakes WHERE id IN (${marks})`,part);
  const selected=pins.filter(p=>part.includes(p.id)&&p.revision>0).flatMap(p=>[{id:p.id,revision:p.revision},...(p.revision>1?[{id:p.id,revision:p.revision-1}]:[])]);
  const sql=`SELECT t.* FROM scholar_intake_text_events t WHERE t.intake_id IN (${marks}) ${full?'':"AND (t.revision=1 OR t.revision >= (SELECT MAX(h.revision)-1 FROM scholar_intake_text_events h WHERE h.intake_id=t.intake_id))"} ${!full&&selected.length?`OR (t.intake_id,t.revision) IN (${selected.map(()=>'(?,?)').join(',')})`:""} ORDER BY t.intake_id,t.revision`,args=[...part,...(!full?selected.flatMap(p=>[p.id,p.revision]):[])],rows:RowDataPacket[]=[];
  if(full){for(let cursor=0;;cursor+=500){const [chunk]=await db.execute<RowDataPacket[]>(sql+' LIMIT ? OFFSET ?',[...args,500,cursor]);rows.push(...chunk);if(chunk.length<500)break;}}
  else rows.push(...(await db.execute<RowDataPacket[]>(sql,args))[0]);
  for(const root of roots){const own=rows.filter(r=>r.intake_id===root.id),events=own.map(row=>decodeTextEvent(root,row));let previous:TextState=absentText();
   for(let n=0;n<events.length;n++){const event=events[n],row=own[n];if(n===0&&event.revision!==1)textFailure();if(event.revision===previous.revision+1){if(row.before_hash!==previous.snapshotHash||!validateTextTransition(previous,event,event.action))textFailure();}else if(full||event.action==='registered')textFailure();previous=event;}
   const head=events.at(-1);if(head&&head.revision>1){const predecessor=events.find(e=>e.revision===head.revision-1);if(!predecessor||own.at(-1)!.before_hash!==predecessor.snapshotHash||!validateTextTransition(predecessor,head,head.action))textFailure();}
   const details=(()=>{if(root.origin_kind!=='manual')return {};try{const value=decode(root.supplied_details);if(!value||typeof value!=='object'||!['manual-intake/v1','manual-intake/v2'].includes(String(value.format)))return textFailure();return value;}catch{return textFailure();}})();
   if(details.format==='manual-intake/v2'){const marker=details.suppliedText as {format?:string;initialRevision?:number;initialHash?:string}|undefined;if(marker?.format!=='intake-supplied-text/v1'||marker.initialRevision!==1||events[0]?.action!=='registered'||marker.initialHash!==events[0]?.snapshotHash)textFailure();}
   else if(events[0]?.action==='registered')textFailure();
   result.set(root.id,{state:head?{revision:head.revision,snapshotHash:head.snapshotHash,schoolText:head.schoolText,courseText:head.courseText}:absentText(),initial:events[0]??null,events,root});
  }
 }
 return result;
}
export async function appendText(db:PoolConnection,actor:string,key:string,requestId:string,intake:AnnualIntake,before:TextState,text:SuppliedText,action:TextEvent['action'],source:string,reason:string){
 if(!validateTextTransition(before,text,action))throw new AuthError(409,'INTAKE_TEXT_NO_CHANGE','Complete missing wording or use the reviewed correction action.');
 const snapshot=textSnapshot(intake,before,text,action,source,reason),hash=textHash(snapshot);
 await db.execute('INSERT INTO scholar_intake_text_events(intake_id,revision,previous_revision,before_hash,action,school_text,course_text,basis_intake_revision,basis_intake_hash,source_reference,reason,snapshot,snapshot_hash,actor_id,command_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[intake.id,snapshot.revision,snapshot.previousRevision,snapshot.beforeHash,action,text.schoolText,text.courseText,intake.revision,intake.snapshotHash,source,reason,JSON.stringify(canonicalIntakeValue(snapshot)),hash,actor,key]);
 await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(UUID(),?,'scholar_intake',?,? ,?,'user',UTC_TIMESTAMP(6),?,?,?)",[action==='corrected'?'scholar.intake.supplied-text.corrected':'scholar.intake.supplied-text.recorded',intake.id,action,actor,requestId,reason,JSON.stringify({before,after:snapshot,textHash:hash,commandId:key})]);
 return {revision:snapshot.revision,snapshotHash:hash,...text};
}
