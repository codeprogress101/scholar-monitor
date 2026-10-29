import {textStates,textHash} from '../scholars/intake-text-source.js';
import {absentText,type TextState} from '../scholars/intake-text-model.js';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {digest} from '../auth/crypto.js';
import {AuthError} from '../auth/service.js';
import {rootIntake,nextIntake} from '../scholars/annual-intake-source.js';
import type {AnnualIntake} from '../scholars/annual-intake-model.js';
import type {ImportPreviewRow,ImportRow} from './model.js';
import {normalizeYearLevel} from './normalization.js';

const identityV1Schema=z.object({row:z.number().int().min(2),scholarId:z.uuid(),expectedVersion:z.number().int().positive(),intakeId:z.uuid(),intakeRevision:z.number().int().positive(),intakeHash:z.string().regex(/^[a-f0-9]{64}$/),duplicateSnapshot:z.string().regex(/^[a-f0-9]{64}$/),samePerson:z.literal(true),reference:z.string().trim().min(3).max(300).regex(/^\P{Cc}+$/u)}).strict();
export const textDecisionSchema=z.union([z.object({decision:z.literal('not_supplied')}).strict(),z.object({decision:z.literal('literal_same')}).strict(),z.object({decision:z.literal('reviewed_correspondence'),reviewed:z.literal(true),sourceReference:z.string().trim().min(3).max(300).regex(/^\P{Cc}+$/u),reason:z.string().trim().min(5).max(500).regex(/^\P{Cc}+$/u)}).strict()]);
const textReviewSchema=z.object({textRevision:z.number().int().min(0),textHash:z.string().regex(/^[a-f0-9]{64}$/).nullable(),school:textDecisionSchema,course:textDecisionSchema}).strict().refine(r=>(r.textRevision===0)===(r.textHash===null));
export const identityV2Schema=identityV1Schema.extend({format:z.literal('intake-match/v2'),suppliedTextReview:textReviewSchema}).strict();
export const identityResolutionSchema=z.union([identityV2Schema,identityV1Schema]);
export type IdentityResolutionV2=z.infer<typeof identityV2Schema>;
export type TextTarget={kind:'existing_reference';id:string;version:number;name?:string;code?:string}|{kind:'named_reference';name:string}|{kind:'course_pending'};
export type TextContext={state:TextState;school:TextTarget;course:TextTarget};
export const targetFor=(row:ImportPreviewRow,key:'school'|'course'):TextTarget=>{
 const id=key==='school'?row.intake?.schoolId:row.intake?.courseId,name=key==='school'?row.intake?.schoolName:row.intake?.courseName;
 const reference=row.references.find(r=>r.id===id);return id?{kind:'existing_reference',id,version:reference?.version??0,...(reference?.name?{name:reference.name,code:reference.code}:{})}:name?{kind:'named_reference',name}:{kind:'course_pending'};
};
export function textReviewConflict(row:ImportPreviewRow,state:TextState):string|null {
 const resolution=row.identityResolution;if(!resolution)return null;
 if(!('format' in resolution))return state.revision||row.textReviewFormat?'Supplied wording requires a versioned review. Restage this match.':null;
 const review=resolution.suppliedTextReview;
 if(review.textRevision!==state.revision||review.textHash!==state.snapshotHash)return 'Supplied wording changed. Read and restage the identity match.';
 for(const key of ['school','course'] as const){const manual=key==='school'?state.schoolText:state.courseText,excel=key==='school'?row.cells.schoolCode:row.cells.courseCode,decision=review[key].decision;
  if(manual===null?decision!=='not_supplied':manual===excel?decision!=='literal_same':decision!=='reviewed_correspondence')return 'Review each supplied/Excel wording difference with its actual source; do not infer equivalence.';
 }
 return null;
}
export type IdentityResolution=z.infer<typeof identityResolutionSchema>;
export const rawRowHash=(r:ImportRow)=>digest(JSON.stringify({row:r.row,cells:r.cells,format:r.format??null,status:r.status??null,working:r.working??null}));
export async function intakeSnapshots(db:PoolConnection,ids:string[]) {
 const result=new Map<string,AnnualIntake[]>();if(!ids.length)return result;
 const placeholders=ids.map(()=>'?').join(',');
 const [roots]=await db.execute<RowDataPacket[]>(`SELECT * FROM scholar_intakes WHERE id IN (${placeholders}) ORDER BY id LOCK IN SHARE MODE`,ids);
 const [events]=await db.execute<RowDataPacket[]>(`SELECT * FROM scholar_intake_revisions WHERE intake_id IN (${placeholders}) ORDER BY intake_id,revision LOCK IN SHARE MODE`,ids);
 for(const root of roots){const history=[rootIntake(root)];for(const event of events.filter(e=>e.intake_id===root.id))history.push(nextIntake(history.at(-1)!,event));result.set(root.id,history);}return result;
}
export async function matchingIntakes(db:PoolConnection,people:string[],year:string){
 const result=new Map<string,AnnualIntake>();
 // F05 can expose up to 100 candidates per workbook row. Keep each new
 // metadata query within the import-sized set even when candidates differ.
 for(let offset=0;offset<people.length;offset+=1500){
  const part=people.slice(offset,offset+1500);
  const [roots]=await db.execute<RowDataPacket[]>(`SELECT id FROM scholar_intakes WHERE scholar_id IN (${part.map(()=>'?').join(',')}) AND academic_year_id=? ORDER BY id LOCK IN SHARE MODE`,[...part,year]);
  for(const history of (await intakeSnapshots(db,roots.map(r=>String(r.id)))).values())result.set(history[0].scholarId,history.at(-1)!);
 }
 return result;
}
export function bindingConflict(row:ImportPreviewRow,intake:AnnualIntake|undefined):string|null {
 const r=row.identityResolution;if(!r||!intake||!row.intake||!row.approvedSelection||row.format!=='simple')return 'Matching requires an approved simple import and an existing manual intake in this working year.';
 if(intake.sourceKind!=='manual'||intake.scholarId!==r.scholarId||intake.academicYearId!==row.intake.academicYearId||intake.id!==r.intakeId||intake.revision!==r.intakeRevision||intake.snapshotHash!==r.intakeHash)return 'The selected manual intake changed or belongs to another person/year. Review again.';
 if(intake.classification!==row.intake.classification)return 'Excel classification conflicts with the effective annual intake. Use controlled review; the import cannot reclassify it.';
 const p=intake.initialPlacement,i=row.intake;
 if((p.schoolId!==null&&p.schoolId!==i.schoolId)||(p.courseId!==null&&p.courseId!==i.courseId)||(p.yearLevel!==null&&normalizeYearLevel(p.yearLevel)!==i.yearLevel))return 'Excel placement conflicts with known initial intake details. Use the controlled academic workflow.';
 return null;
}
export function bindingSnapshot(job:string,row:ImportPreviewRow,resolved?:{schoolId:string;courseId:string|null}){
 const r=row.identityResolution!;
 const base={format:'import-intake-binding/v1' as 'import-intake-binding/v1'|'import-intake-binding/v2',importId:job,sourceRow:row.row,intakeId:r.intakeId,scholarId:r.scholarId,personVersion:r.expectedVersion,intakeRevision:r.intakeRevision,intakeHash:r.intakeHash,rawRowHash:rawRowHash(row),duplicateSnapshot:r.duplicateSnapshot,identityReference:r.reference};
 if(!('format' in r))return base;
 if(!row.suppliedTextContext||!resolved)sourceFailure();
 return {...base,format:'import-intake-binding/v2' as const,suppliedTextReview:{...r.suppliedTextReview,manual:row.suppliedTextContext.state,excel:{schoolText:row.cells.schoolCode,courseText:row.cells.courseCode},targets:{school:row.suppliedTextContext.school,course:row.suppliedTextContext.course},resolved,actorId:row.confirmingActor}};
}
export async function appendBinding(db:PoolConnection,job:string,row:ImportPreviewRow,actor:string){
 row.confirmingActor=actor;const snapshot=bindingSnapshot(job,row,{schoolId:row.intake!.schoolId,courseId:row.intake!.courseId}),hash=digest(JSON.stringify(snapshot)),id=randomUUID();
 await db.execute('INSERT INTO import_intake_bindings(id,import_job_id,source_row,intake_id,person_version,intake_revision,intake_hash,raw_row_hash,identity_reference,binding_hash,snapshot,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[id,job,row.row,snapshot.intakeId,snapshot.personVersion,snapshot.intakeRevision,snapshot.intakeHash,snapshot.rawRowHash,snapshot.identityReference,hash,JSON.stringify(snapshot),actor]);
 return {kind:'manual-binding' as const,intakeId:snapshot.intakeId,bindingId:id,bindingHash:hash};
}
export function sourceFailure():never{throw new AuthError(409,'IMPORT_BINDING_INVALID','Confirmed import identity/source links need controlled review. No source was replaced.');}

export async function enrichTextReviews(db:PoolConnection,preview:ImportPreviewRow[],intakes:Map<string,AnnualIntake>){
 const states=await textStates(db,[...intakes.values()].map(i=>i.id));
 for(const row of preview){
  if(row.textReviewFormat&&row.identityCandidates?.total&&row.intake)row.suppliedTextTargets={school:targetFor(row,'school'),course:targetFor(row,'course')};
  if(row.textReviewFormat&&row.identityCandidates)row.identityCandidates.candidates=row.identityCandidates.candidates.map(c=>({...c,...(c.intake?{suppliedText:states.get(c.intake.id)?.state??absentText()}:{})}));
  if(!row.identityResolution)continue;
  const intake=intakes.get(row.identityResolution.scholarId),state=intake?states.get(intake.id)?.state??absentText():absentText();
  const conflict=textReviewConflict(row,state);if(conflict)row.errors.push(conflict);
  if('format' in row.identityResolution&&row.intake)row.suppliedTextContext={state,school:targetFor(row,'school'),course:targetFor(row,'course')};
 }
}
export function verifyHistoricalText(row:ImportPreviewRow,loaded:Awaited<ReturnType<typeof textStates>> extends Map<string,infer T>?T:never,bases:AnnualIntake[]){
 if(!row.identityResolution||!('format' in row.identityResolution))return;
 const context=row.suppliedTextContext;if(!context||textReviewConflict(row,context.state))sourceFailure();
 if(context.state.revision===0){if(loaded.initial?.action==='registered'||context.state.snapshotHash!==null||context.state.schoolText!==null||context.state.courseText!==null)sourceFailure();}
 else {const pinned=loaded.events.find(e=>e.revision===context.state.revision);if(!pinned||!bases.some(b=>b.revision===pinned.basisIntakeRevision&&b.snapshotHash===pinned.basisIntakeHash)||textHash({revision:pinned.revision,snapshotHash:pinned.snapshotHash,schoolText:pinned.schoolText,courseText:pinned.courseText})!==textHash(context.state))sourceFailure();}
 if(textHash({school:targetFor(row,'school'),course:targetFor(row,'course')})!==textHash({school:context.school,course:context.course}))sourceFailure();
}
