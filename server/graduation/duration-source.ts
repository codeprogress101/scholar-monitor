import {createHash} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {workingYear} from '../configuration/calendar.js';
import type {DurationFacts,DurationSnapshot,DurationView,ReviewContext} from './duration-model.js';
import {scopesOverlap} from './duration-model.js';
import {availablePeriod,decode,fail,fingerprint} from './commands.js';
export const durationHeadJoin=`JOIN program_duration_events e ON e.reference_id=r.id AND e.revision=(SELECT MAX(h.revision) FROM program_duration_events h WHERE h.reference_id=r.id)`;
export function durationView(row:RowDataPacket):DurationView {
 const snapshot=decode<DurationSnapshot>(row.snapshot);
 if(snapshot.format!=='program-duration/v1'||snapshot.id!==row.reference_id||snapshot.revision!==Number(row.revision)||fingerprint(snapshot)!==row.snapshot_hash||snapshot.state!==row.state||snapshot.scopeDatesHash!==row.scope_dates_hash)fail('GRADUATION_HISTORY_INTEGRITY','Duration evidence integrity requires investigation.');
 const f=snapshot.facts;
 if(row.scope_kind!==f.scopeKind||row.curriculum_code!==f.curriculumCode||row.cohort_code!==f.cohortCode||row.applies_from_year_id!==f.appliesFromYearId||row.applies_through_year_id!==f.appliesThroughYearId||row.duration_years!==f.durationYears||row.final_year_level!==f.finalYearLevel||row.level_basis!==f.levelBasis||row.source_type!==f.source.type||row.source_issuer!==f.source.issuer||row.source_reference!==(snapshot.decisionReference??f.source.reference))fail('GRADUATION_HISTORY_INTEGRITY','Queryable duration facts differ from their immutable snapshot.');
 return {snapshot,snapshotHash:row.snapshot_hash,beforeHash:row.before_hash,actorId:row.actor_id,recordedAt:String(row.recorded_at),reason:row.reason,action:row.action};
}
export async function durationHead(db:PoolConnection,id:string):Promise<DurationView> {
 const [[r]]=await db.execute<RowDataPacket[]>(`SELECT e.*,r.created_by FROM program_duration_references r ${durationHeadJoin} WHERE r.id=?`,[id]);
 if(!r)fail('DURATION_NOT_FOUND','The program-duration source was not found.');
 const view=durationView(r);
 if(r.revision>1){const [[p]]=await db.execute<RowDataPacket[]>('SELECT snapshot_hash,snapshot FROM program_duration_events WHERE reference_id=? AND revision=?',[id,r.revision-1]);if(!p||fingerprint(decode(p.snapshot))!==p.snapshot_hash||p.snapshot_hash!==r.before_hash)fail('GRADUATION_HISTORY_INTEGRITY','Duration predecessor does not match its immutable history.');}
 return view;
}
export async function scopeDates(db:PoolConnection,f:DurationFacts){
 const [rows]=await db.execute<RowDataPacket[]>('SELECT id,DATE_FORMAT(starts_on,\'%Y-%m-%d\') starts,DATE_FORMAT(ends_on,\'%Y-%m-%d\') ends FROM academic_years WHERE id IN (?,?)',[f.appliesFromYearId,f.appliesThroughYearId??f.appliesFromYearId]);
 const start=rows.find(r=>r.id===f.appliesFromYearId),end=f.appliesThroughYearId?rows.find(r=>r.id===f.appliesThroughYearId):null;
 if(!start||f.appliesThroughYearId&&!end||end&&end.ends<start.starts)fail('DURATION_SOURCE_CHANGED','Select a valid ordered applicability interval.');
 return {hash:createHash('sha256').update([start.id,start.starts,start.ends,end?.id??'',end?.starts??'',end?.ends??''].join('|')).digest('hex'),start:String(start.starts),end:end?String(end.ends):'9999-12-31',curriculum:f.curriculumCode,cohort:f.cohortCode};
}
export async function catalogContext(db:PoolConnection,c:ReviewContext){const w=await workingYear(db);if(!w||w.id!==c.workingSettingId||w.version!==c.workingSettingVersion||w.yearId!==c.academicYearId)fail('DURATION_SOURCE_CHANGED','The working review year changed. Refresh the catalog.');await availablePeriod(db,c.academicYearId,c.academicYearVersion);}
export async function durationPreview(db:PoolConnection,current:DurationView){
 const s=current.snapshot,scope=await scopeDates(db,s.facts),conflicts:string[]=[];
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT e.*,DATE_FORMAT(fy.starts_on,'%Y-%m-%d') start_on,DATE_FORMAT(fy.ends_on,'%Y-%m-%d') start_end,DATE_FORMAT(ty.starts_on,'%Y-%m-%d') through_start,DATE_FORMAT(ty.ends_on,'%Y-%m-%d') through_end FROM program_duration_references r ${durationHeadJoin} JOIN academic_years fy ON fy.id=e.applies_from_year_id LEFT JOIN academic_years ty ON ty.id=e.applies_through_year_id WHERE r.school_id=? AND r.course_id=? AND r.id<>? AND e.state='confirmed' ORDER BY r.id`,[s.schoolId,s.courseId,s.id]);
 const peers=[];for(const row of rows){const other=durationView(row),dates={hash:createHash('sha256').update([row.applies_from_year_id,row.start_on,row.start_end,row.applies_through_year_id??'',row.through_start??'',row.through_end??''].join('|')).digest('hex'),start:String(row.start_on),end:row.through_end?String(row.through_end):'9999-12-31',curriculum:other.snapshot.facts.curriculumCode,cohort:other.snapshot.facts.cohortCode};if(dates.hash!==other.snapshot.scopeDatesHash)fail('DURATION_SOURCE_CHANGED','An overlapping source has stale calendar evidence. Review it first.');peers.push({id:other.snapshot.id,hash:other.snapshotHash,dates:dates.hash});if(scopesOverlap(scope,dates))conflicts.push(other.snapshot.id);}
 const [[refs]]=await db.execute<RowDataPacket[]>('SELECT sc.archived_at school_archived,co.archived_at course_archived FROM schools sc JOIN courses co ON co.id=? WHERE sc.id=?',[s.courseId,s.schoolId]);
 if(!refs||refs.school_archived||refs.course_archived)fail('DURATION_SOURCE_CHANGED','Archived or missing school/course sources cannot be confirmed.');
 const w=await workingYear(db);if(!w)fail('DURATION_SOURCE_CHANGED','Set an available working review year first.');const y=await availablePeriod(db,w.yearId);
 const reviewContext={academicYearId:w.yearId,academicYearVersion:Number(y.version),workingSettingId:w.id,workingSettingVersion:w.version};
 const [[usage]]=await db.execute<RowDataPacket[]>('SELECT COUNT(DISTINCT case_id) n FROM graduation_monitoring_events WHERE duration_reference_id=?',[s.id]);
 const [usageRows]=await db.execute<RowDataPacket[]>('SELECT c.id caseId,c.scholar_id scholarId,i.human_id permanentId,c.academic_year_id academicYearId,c.semester_id semesterId FROM graduation_monitoring_cases c JOIN scholar_identifiers i ON i.scholar_id=c.scholar_id WHERE EXISTS(SELECT 1 FROM graduation_monitoring_events e WHERE e.case_id=c.id AND e.duration_reference_id=?) ORDER BY c.academic_year_id,c.scholar_id,c.id LIMIT 25',[s.id]);
 return {current,conflicts,reviewContext,usageCount:Number(usage.n),usagePreview:usageRows.map(r=>({caseId:String(r.caseId),scholarId:String(r.scholarId),permanentId:String(r.permanentId),academicYearId:String(r.academicYearId),semesterId:r.semesterId as string|null})),reviewSourceHash:fingerprint({head:current.snapshotHash,scope:scope.hash,peers,reviewContext})};
}
