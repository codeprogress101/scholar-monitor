import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {fail,decode,fingerprint} from './commands.js';
import type {Basis,MonitoringSnapshot,MonitoringView,ProgramContext} from './monitoring-model.js';
import {LEVEL_LABELS} from '../scholars/graduation-monitoring-model.js';
export function monitoringView(row:RowDataPacket):MonitoringView {
 const snapshot=decode<MonitoringSnapshot>(row.snapshot);
 if(!snapshot||snapshot.format!=='graduation-monitoring/v1'||snapshot.id!==row.case_id||snapshot.revision!==Number(row.revision)||fingerprint(snapshot)!==row.snapshot_hash||snapshot.assessment?.revision!==(row.assessment_revision??undefined)&&!(snapshot.assessment===null&&row.assessment_revision===null)||Boolean(snapshot.reviewRequired)!==Boolean(row.review_required))fail('GRADUATION_HISTORY_INTEGRITY','Monitoring evidence requires integrity investigation.');
 const a=snapshot.assessment,b=a?.basis,d=b?.duration,c=snapshot.context;
 if(row.assessment_kind!==(a?.facts.kind??(snapshot.reviewRequired?'needs_review':'none'))||row.pending_review_revision!==(snapshot.pending?.revision??null)||row.program_context_state!==(c?.state??'none')||row.program_context_revision!==(c?.revision??null)||row.curriculum_code!==(c?.curriculumCode??null)||row.cohort_code!==(c?.cohortCode??null)||row.placement_hash!==(b?.placementHash??null)||row.duration_reference_id!==(d?.id??null)||row.duration_revision!==(d?.revision??null)||row.duration_snapshot_hash!==(d?.hash??null))fail('GRADUATION_HISTORY_INTEGRITY','Queryable evidence differs from its immutable snapshot.');
 return {snapshot,snapshotHash:row.snapshot_hash,beforeHash:row.before_hash,actorId:row.actor_id,recordedAt:String(row.recorded_at),reason:row.reason,action:row.event_kind};
}
export async function monitoringHead(db:PoolConnection,id:string){const [[r]]=await db.execute<RowDataPacket[]>('SELECT * FROM graduation_monitoring_events WHERE case_id=? ORDER BY revision DESC LIMIT 1',[id]);if(!r)fail('GRADUATION_CASE_NOT_FOUND','Monitoring case was not found.');const view=monitoringView(r);if(r.revision>1){const [[p]]=await db.execute<RowDataPacket[]>('SELECT snapshot_hash,snapshot FROM graduation_monitoring_events WHERE case_id=? AND revision=?',[id,r.revision-1]);if(!p||fingerprint(decode(p.snapshot))!==p.snapshot_hash||p.snapshot_hash!==r.before_hash)fail('GRADUATION_HISTORY_INTEGRITY','Monitoring predecessor does not match.');}
 const pointers=[r.assessment_revision,r.pending_review_revision,r.program_context_revision].filter((n):n is number=>typeof n==='number'&&n!==r.revision);
 if(pointers.length){const [rows]=await db.query<RowDataPacket[]>('SELECT * FROM graduation_monitoring_events WHERE case_id=? AND revision IN (?)',[id,pointers]);for(const n of pointers){const linked=rows.find(x=>Number(x.revision)===n);if(!linked)fail('GRADUATION_HISTORY_INTEGRITY','A linked origin is missing.');const origin=monitoringView(linked);if(n===r.assessment_revision&&origin.snapshot.assessment?.revision!==n||n===r.pending_review_revision&&origin.action!=='propose_correction'||n===r.program_context_revision&&!['record_program_context','review_program_context'].includes(origin.action))fail('GRADUATION_HISTORY_INTEGRITY','A linked origin has the wrong semantic ownership.');}}
 return view;}
const j=(alias:string,path:string)=>`(CONVERT(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${alias},'$.${path}')),'null') USING utf8mb4) COLLATE utf8mb4_bin)`;
const nullable=(value:string)=>`NULLIF(${value},'')`;
export const canonicalSchool=`CASE WHEN ac.id IS NOT NULL THEN ${nullable(j('ac.after_value','schoolId'))} ELSE a.school_id END`;
export const canonicalCourse=`CASE WHEN ac.id IS NOT NULL THEN ${nullable(j('ac.after_value','courseId'))} ELSE a.course_id END`;
export const canonicalLevel=`CASE WHEN ac.id IS NOT NULL THEN ${j('ac.after_value','yearLevel')} ELSE a.year_level END`;
export const canonicalColumns=`a.id academic_id,ac.id approved_change_id,COALESCE(ad.resulting_version,0) approved_revision,
 CASE WHEN ac.id IS NULL THEN a.id IS NOT NULL ELSE JSON_TYPE(ac.after_value)='OBJECT' AND JSON_TYPE(JSON_EXTRACT(ac.after_value,'$.schoolId'))='STRING' AND JSON_TYPE(JSON_EXTRACT(ac.after_value,'$.yearLevel'))='STRING' AND CHAR_LENGTH(TRIM(${canonicalLevel})) BETWEEN 1 AND 60 END placement_valid,
 ${canonicalSchool} canonical_school,${canonicalCourse} canonical_course,${canonicalLevel} canonical_level,
 CASE WHEN ac.id IS NULL THEN a.course_pending_exception_id ELSE ${j('ac.after_value','coursePending.id')} END pending_id,
 CASE WHEN ac.id IS NULL THEN (SELECT MAX(cp.revision) FROM course_pending_events cp WHERE cp.exception_id=a.course_pending_exception_id) ELSE ${j('ac.after_value','coursePending.revision')} END pending_revision,
 my.starts_on year_starts,my.ends_on year_ends,
 SHA2(JSON_ARRAY(my.id,DATE_FORMAT(my.starts_on,'%Y-%m-%d'),DATE_FORMAT(my.ends_on,'%Y-%m-%d'),NULL,NULL,NULL),256) annual_calendar_hash,
 SHA2(JSON_ARRAY(my.id,DATE_FORMAT(my.starts_on,'%Y-%m-%d'),DATE_FORMAT(my.ends_on,'%Y-%m-%d'),ms.id,DATE_FORMAT(ms.starts_on,'%Y-%m-%d'),DATE_FORMAT(ms.ends_on,'%Y-%m-%d')),256) calendar_hash`;
export const normalizedLevelSql=(value:string)=>`CASE LOWER(TRIM(${value})) ${LEVEL_LABELS.flatMap((labels,n)=>labels.map(label=>`WHEN '${label}' THEN ${n+1}`)).join(' ')} ELSE NULL END`;
// Base is a bounded-query source expression supplied by the existing Registry
// association reader. Every filter/count/page consumes this same projection.
export function monitoringProjection(base:string,semester:string|null){
 const semesterMaterial='(se.assessment_revision IS NOT NULL OR se.review_required=1 OR se.pending_review_revision IS NOT NULL)';
 const head=semester?`CASE WHEN ${semesterMaterial} THEN se.snapshot ELSE ann.snapshot END`:'ann.snapshot';
 const material=`(e.assessment_revision IS NOT NULL OR e.review_required=1 OR e.pending_review_revision IS NOT NULL)`;
 return `WITH base AS (${base}), cases AS (
 SELECT mc.*,e.snapshot,e.snapshot_hash,e.assessment_revision,e.review_required,e.pending_review_revision,e.program_context_state,e.program_context_revision
 FROM graduation_monitoring_cases mc JOIN graduation_monitoring_events e ON e.case_id=mc.id AND e.revision=(SELECT MAX(x.revision) FROM graduation_monitoring_events x WHERE x.case_id=mc.id)),
 placed AS (SELECT b.*,${normalizedLevelSql('b.canonical_level')} canonical_normalized,
 SHA2(JSON_ARRAY(b.academic_id,b.approved_change_id,b.approved_revision,b.canonical_school,b.canonical_course,b.canonical_level,b.pending_id,b.pending_revision),256) placement_hash,
 ann.id annual_case_id,ann.snapshot annual_snapshot,ann.snapshot_hash annual_snapshot_hash,
 CASE WHEN ${j('ann.snapshot','context.state')}='confirmed' THEN ${j('ann.snapshot','context.placementHash')} END context_placement_hash,
 CASE WHEN ${j('ann.snapshot','context.state')}='confirmed' THEN SHA2(CAST(JSON_EXTRACT(ann.snapshot,'$.context') AS CHAR),256) END context_hash,
 ${j('ann.snapshot','context.curriculumCode')} curriculum_code,${j('ann.snapshot','context.cohortCode')} cohort_code,
 ${head} effective_snapshot,${semester?`CASE WHEN ${semesterMaterial} THEN se.id ELSE ann.id END`:'ann.id'} effective_case_id,${semester?'COALESCE(se.snapshot,ann.snapshot)':'ann.snapshot'} follow_up_snapshot,
 ${semester?'0':`EXISTS(SELECT 1 FROM cases e WHERE e.scholar_id=b.id AND e.academic_year_id=b.selected_year AND e.semester_id IS NOT NULL AND ${material})`} context_needed
 FROM base b LEFT JOIN cases ann ON ann.scholar_id=b.id AND ann.academic_year_id=b.selected_year AND ann.semester_id IS NULL
 ${semester?`LEFT JOIN cases se ON se.scholar_id=b.id AND se.academic_year_id=b.selected_year AND se.semester_id='${semester}'`:''}),
 references_current AS (SELECT r.school_id,r.course_id,e.*,fy.starts_on applies_start,ty.ends_on applies_end,
 SHA2(CONCAT(fy.id,'|',DATE_FORMAT(fy.starts_on,'%Y-%m-%d'),'|',DATE_FORMAT(fy.ends_on,'%Y-%m-%d'),'|',COALESCE(ty.id,''),'|',COALESCE(DATE_FORMAT(ty.starts_on,'%Y-%m-%d'),''),'|',COALESCE(DATE_FORMAT(ty.ends_on,'%Y-%m-%d'),'')),256) current_scope_hash,
 sc.archived_at school_archived,co.archived_at course_archived
 FROM program_duration_references r JOIN program_duration_events e ON e.reference_id=r.id AND e.revision=(SELECT MAX(x.revision) FROM program_duration_events x WHERE x.reference_id=r.id)
 JOIN academic_years fy ON fy.id=e.applies_from_year_id LEFT JOIN academic_years ty ON ty.id=e.applies_through_year_id JOIN schools sc ON sc.id=r.school_id JOIN courses co ON co.id=r.course_id),
 matched AS (SELECT p.*, (SELECT COUNT(*) FROM references_current r WHERE BINARY r.school_id=BINARY p.canonical_school AND BINARY r.course_id=BINARY p.canonical_course AND r.state='confirmed' AND BINARY r.current_scope_hash=BINARY r.scope_dates_hash AND r.school_archived IS NULL AND r.course_archived IS NULL AND r.applies_start<=p.year_ends AND (r.applies_end IS NULL OR r.applies_end>=p.year_starts)
 AND (r.curriculum_code IS NULL OR (BINARY r.curriculum_code=BINARY p.curriculum_code AND BINARY p.context_placement_hash=BINARY p.placement_hash)) AND (r.cohort_code IS NULL OR (BINARY r.cohort_code=BINARY p.cohort_code AND BINARY p.context_placement_hash=BINARY p.placement_hash))) duration_count,
 (SELECT r.reference_id FROM references_current r WHERE BINARY r.school_id=BINARY p.canonical_school AND BINARY r.course_id=BINARY p.canonical_course AND r.state='confirmed' AND BINARY r.current_scope_hash=BINARY r.scope_dates_hash AND r.school_archived IS NULL AND r.course_archived IS NULL AND r.applies_start<=p.year_ends AND (r.applies_end IS NULL OR r.applies_end>=p.year_starts)
 AND (r.curriculum_code IS NULL OR (BINARY r.curriculum_code=BINARY p.curriculum_code AND BINARY p.context_placement_hash=BINARY p.placement_hash)) AND (r.cohort_code IS NULL OR (BINARY r.cohort_code=BINARY p.cohort_code AND BINARY p.context_placement_hash=BINARY p.placement_hash)) ORDER BY r.reference_id LIMIT 1) matched_reference FROM placed p),
 resolved AS (SELECT p.*,r.revision duration_revision,r.snapshot_hash duration_hash,r.duration_years,r.final_year_level,
 CASE WHEN COALESCE(p.placement_valid,0)<>1 OR p.academic_id IS NULL OR p.canonical_school IS NULL OR p.canonical_course IS NULL OR p.canonical_school NOT REGEXP '^[0-9a-f-]{36}$' OR p.canonical_course NOT REGEXP '^[0-9a-f-]{36}$' THEN 'ACADEMIC_CONTEXT_REQUIRED'
 WHEN p.context_needed THEN 'SEMESTER_CONTEXT_REQUIRED'
 WHEN ${j('p.annual_snapshot','context.state')} IN ('proposed','disputed') THEN 'PROGRAM_CONTEXT_REQUIRED'
 WHEN ${j('p.annual_snapshot','context.state')}='confirmed' AND BINARY p.context_placement_hash<>BINARY p.placement_hash THEN 'PROGRAM_CONTEXT_STALE'
 WHEN p.duration_count=0 AND p.context_hash IS NULL AND EXISTS(SELECT 1 FROM references_current sr WHERE BINARY sr.school_id=BINARY p.canonical_school AND BINARY sr.course_id=BINARY p.canonical_course AND sr.state='confirmed' AND BINARY sr.current_scope_hash=BINARY sr.scope_dates_hash AND (sr.curriculum_code IS NOT NULL OR sr.cohort_code IS NOT NULL) AND sr.applies_start<=p.year_ends AND (sr.applies_end IS NULL OR sr.applies_end>=p.year_starts)) THEN 'PROGRAM_CONTEXT_REQUIRED'
 WHEN p.duration_count<>1 THEN IF(p.duration_count>1,'DURATION_REFERENCE_CONFLICT','DURATION_REFERENCE_REQUIRED')
 WHEN ${j('p.annual_snapshot','context.state')} IN ('proposed','disputed') THEN 'PROGRAM_CONTEXT_REQUIRED'
 WHEN ${j('p.annual_snapshot','context.state')}='confirmed' AND BINARY p.context_placement_hash<>BINARY p.placement_hash THEN 'PROGRAM_CONTEXT_STALE'
 WHEN ${j('p.effective_snapshot','reviewRequired')}='true' OR ${j('p.effective_snapshot','pending.revision')} IS NOT NULL THEN 'MONITORING_REVIEW_PENDING'
 WHEN ${j('p.effective_snapshot','assessment.revision')} IS NOT NULL AND (
 NOT (${j('p.effective_snapshot','assessment.basis.placementHash')} <=> p.placement_hash) OR NOT (${j('p.effective_snapshot','assessment.basis.calendarHash')} <=> IF(${j('p.effective_snapshot','semesterId')} IS NULL,p.annual_calendar_hash,p.calendar_hash))
 OR NOT (${j('p.effective_snapshot','assessment.basis.duration.id')} <=> r.reference_id) OR NOT (${j('p.effective_snapshot','assessment.basis.duration.revision')} <=> CAST(r.revision AS CHAR))
 OR NOT (${j('p.effective_snapshot','assessment.basis.duration.hash')} <=> r.snapshot_hash) OR NOT (${j('p.effective_snapshot','assessment.basis.contextHash')} <=> p.context_hash)) THEN 'MONITORING_SOURCE_CHANGED'
 ELSE NULL END unresolved_reason
 FROM matched p LEFT JOIN references_current r ON r.reference_id=p.matched_reference AND p.duration_count=1),
 monitoring AS (SELECT x.*,CASE WHEN graduation_request_id IS NOT NULL THEN 'graduated' WHEN unresolved_reason IS NOT NULL THEN 'cannot_determine'
 WHEN ${j('effective_snapshot','assessment.facts.kind')} IN ('expected','delayed') THEN ${j('effective_snapshot','assessment.facts.kind')}
 WHEN final_year_level IS NULL OR canonical_normalized IS NULL OR canonical_normalized>final_year_level THEN 'cannot_determine'
 WHEN canonical_normalized=final_year_level THEN 'potentially_graduating' ELSE 'not_final_year' END indicator FROM resolved x)`;
}
export function basisFromRow(row:RowDataPacket):Basis {return {placementHash:row.placement_hash,duration:Number(row.duration_count)===1&&row.duration_years!==null?{id:row.matched_reference,revision:Number(row.duration_revision),hash:row.duration_hash,years:String(row.duration_years),finalYear:row.final_year_level===null?null:Number(row.final_year_level)}:null,contextHash:row.context_hash??null,calendarHash:row.calendar_hash,unresolved:row.unresolved_reason?[row.unresolved_reason]:[]};}
export function authorizedMonitoringQuery(sql:string,tail:string){return tail.replace('FROM monitoring',()=> 'FROM ('+sql+' SELECT * FROM monitoring) graduation_projection');}
export function annualContextFromRow(row:RowDataPacket):ProgramContext|null {return row.annual_snapshot?decode<MonitoringSnapshot>(row.annual_snapshot).context:null;}
