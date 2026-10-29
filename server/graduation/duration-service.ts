import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {AuthorizationService} from '../authorization/service.js';
import {parseId} from '../configuration/validation.js';
import {workingYear} from '../configuration/calendar.js';
import {availablePeriod} from './commands.js';
import {GraduationCommands,fail,fingerprint,requirePermission} from './commands.js';
import {durationAppend,durationCreate,durationQuery,page,parse} from './duration-validation.js';
import type {DurationSnapshot,DurationView,DurationFacts} from './duration-model.js';
import {durationTransition} from './duration-model.js';
import {catalogContext,durationHead,durationHeadJoin,durationPreview,durationView,scopeDates} from './duration-source.js';
async function insert(db:PoolConnection,s:DurationSnapshot,before:DurationView|null,action:string,actor:string,key:string,reason:string,reviewYear:string){const f=s.facts,source=f.source;
 await db.execute('INSERT INTO program_duration_events(reference_id,revision,previous_revision,before_hash,snapshot_hash,action,state,scope_kind,curriculum_code,cohort_code,applies_from_year_id,applies_through_year_id,review_academic_year_id,duration_years,final_year_level,level_basis,source_type,source_issuer,source_reference,source_location,source_issued_on,scope_dates_hash,snapshot,reason,actor_id,command_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[s.id,s.revision,before?.snapshot.revision??null,before?.snapshotHash??null,fingerprint(s),action,s.state,f.scopeKind,f.curriculumCode,f.cohortCode,f.appliesFromYearId,f.appliesThroughYearId,reviewYear,f.durationYears,f.finalYearLevel,f.levelBasis,source.type,source.issuer,s.decisionReference??source.reference,source.location,source.issuedOn,s.scopeDatesHash,JSON.stringify(s),reason,actor,key]);
 return durationHead(db,s.id);
}
export class DurationService {
 private commands:GraduationCommands;
 constructor(private auth:AuthorizationService,enabled=false){this.commands=new GraduationCommands(auth,enabled);}
 context(actor:string){return this.auth.readSnapshot(actor,'scholars.read',async db=>{const w=await workingYear(db);if(!w)fail('DURATION_SOURCE_CHANGED','An available working review year is required.');const y=await availablePeriod(db,w.yearId);return {academicYearId:w.yearId,academicYearVersion:Number(y.version),workingSettingId:w.id,workingSettingVersion:w.version};});}
 create(actor:string,key:unknown,raw:unknown,requestId:string){const i=parse(durationCreate,raw);return this.commands.run(actor,key,'program.duration.prepare','duration.create',{schoolId:i.schoolId,courseId:i.courseId},i,requestId,async(db,_access,command)=>{
  await catalogContext(db,i.reviewContext);for(const [table,id] of [['schools',i.schoolId],['courses',i.courseId]]){const [[ref]]=await db.execute<RowDataPacket[]>(`SELECT id,archived_at FROM ${table} WHERE id=?`,[id]);if(!ref||ref.archived_at)fail('DURATION_SOURCE_CHANGED','Choose an active school/course.');}
  const id=randomUUID(),scope=await scopeDates(db,i.facts);await db.execute('INSERT INTO program_duration_references(id,school_id,course_id,created_by,created_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))',[id,i.schoolId,i.courseId,actor]);
  const s:DurationSnapshot={format:'program-duration/v1',id,schoolId:i.schoolId,courseId:i.courseId,revision:1,state:'proposed',facts:i.facts,scopeDatesHash:scope.hash};const result=await insert(db,s,null,'submit',actor,command,i.reason,i.reviewContext.academicYearId);return {id,revision:1,result,reason:i.reason,before:null,after:s};
 },'duration',true);}
 append(actor:string,rawId:unknown,key:unknown,raw:unknown,requestId:string){const id=parseId(rawId),i=parse(durationAppend,raw),permission=['confirm','reject','retire'].includes(i.action)?'program.duration.confirm':'program.duration.prepare';return this.commands.run(actor,key,permission,'duration.'+i.action,id,i,requestId,async(db,access,command)=>{
  await catalogContext(db,i.reviewContext);const before=await durationHead(db,id),s=before.snapshot;
  if(s.revision!==i.expectedRevision||before.snapshotHash!==i.expectedSnapshotHash)fail('GRADUATION_VERSION_CONFLICT','The source changed. Refresh its current head.');
  const state=durationTransition(s.state,i.action);if(!state)fail('DURATION_TRANSITION_INVALID','This source state does not allow that action.');
  if(i.action==='withdraw'){const [[owner]]=await db.execute<RowDataPacket[]>('SELECT created_by FROM program_duration_references WHERE id=?',[id]);if(owner.created_by!==actor&&!access.permissions.some(p=>p.code==='program.duration.confirm'))fail('DURATION_OWNER_REQUIRED','Only the preparer or Coordinator can withdraw this proposal.');}
  const facts:DurationFacts='facts'in i?i.facts:s.facts,scope=await scopeDates(db,facts);
  if(i.action==='confirm'){const preview=await durationPreview(db,before);if(preview.reviewSourceHash!==i.reviewSourceHash||scope.hash!==s.scopeDatesHash)fail('DURATION_SOURCE_CHANGED','The reviewed source/calendar changed. Review it again.');if(preview.conflicts.length)fail('DURATION_SCOPE_CONFLICT','A confirmed source already covers this scope. Review/retire the conflict first.');if(facts.durationYears===null)fail('DURATION_SOURCE_REQUIRED','Confirmation needs an actual supported duration.');}
  const after:DurationSnapshot={...s,revision:s.revision+1,state,facts,scopeDatesHash:scope.hash,decisionReference:'sourceReference'in i?i.sourceReference:null};const result=await insert(db,after,before,i.action,actor,command,i.reason,i.reviewContext.academicYearId);return {id,revision:after.revision,result,reason:i.reason,before:s,after};
 },'duration',false);}
 detail(actor:string,id:unknown){return this.auth.readSnapshot(actor,'scholars.read',db=>durationHead(db,parseId(id)));}
 review(actor:string,id:unknown){return this.auth.readSnapshot(actor,'program.duration.confirm',async(db,access)=>{requirePermission(access,'scholars.read');return durationPreview(db,await durationHead(db,parseId(id)));});}
 history(actor:string,id:unknown,raw:unknown){const q=parse(page,raw),target=parseId(id);return this.auth.readSnapshot(actor,'scholars.read',async db=>{const [[count]]=await db.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM program_duration_events WHERE reference_id=?',[target]);const [rows]=await db.execute<RowDataPacket[]>('SELECT * FROM program_duration_events WHERE reference_id=? ORDER BY revision LIMIT ? OFFSET ?',[target,q.limit,q.offset]);return {...q,total:Number(count.n),items:rows.map(durationView)};});}
 list(actor:string,raw:unknown){const q=parse(durationQuery,raw);return this.auth.readSnapshot(actor,'scholars.read',async db=>{const filters=['1=1'],args:(number|string)[]=[];for(const [key,col]of [['schoolId','r.school_id'],['courseId','r.course_id'],['state','e.state']] as const)if(q[key]){filters.push(col+'=?');args.push(q[key]!);}if(q.q){filters.push("(e.source_reference LIKE ? ESCAPE '=' OR e.source_issuer LIKE ? ESCAPE '=')");const term='%'+q.q.replace(/[=%_]/g,c=>'='+c)+'%';args.push(term,term);}if(q.academicYearId){filters.push('fy.starts_on<=y.ends_on AND (ty.id IS NULL OR ty.ends_on>=y.starts_on)');}
 const from=`FROM program_duration_references r ${durationHeadJoin} JOIN academic_years fy ON fy.id=e.applies_from_year_id LEFT JOIN academic_years ty ON ty.id=e.applies_through_year_id ${q.academicYearId?'JOIN academic_years y ON y.id=?':''} WHERE ${filters.join(' AND ')}`;if(q.academicYearId)args.unshift(q.academicYearId);
 const [[c]]=await db.execute<RowDataPacket[]>('SELECT COUNT(*) n '+from,args);const [rows]=await db.execute<RowDataPacket[]>('SELECT e.* '+from+' ORDER BY r.id LIMIT ? OFFSET ?',[...args,q.limit,q.offset]);return {...q,total:Number(c.n),items:rows.map(durationView)};
 });}
}
