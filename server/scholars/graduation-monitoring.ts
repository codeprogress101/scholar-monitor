import {authorizedMonitoringQuery,canonicalColumns,monitoringProjection} from '../graduation/monitoring-source.js';
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import { AuthorizationService } from "../authorization/service.js";
import { placementJoinsForYear, placementColumns, yearLevel } from "./registry-placement.js";
import { LEVEL_LABELS, type MonitoringContext, type MonitoringList, type MonitoringRow } from "./graduation-monitoring-model.js";

export const querySchema = z.object({
  academicYearId: z.uuid(), semesterId: z.uuid().optional(),
  q: z.string().trim().max(160).regex(/^\P{Cc}*$/u).default(""),
  filter: z.enum(["all", "final_year_review", "potentially_graduating", "expected", "delayed", "graduated", "cannot_determine", "needs_review", "unknown_duration", "follow_up"]).default("final_year_review"),
  schoolId: z.uuid().optional(), courseId: z.uuid().optional(),
  sort: z.enum(["name", "scholarId", "yearLevel"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();
export function parseMonitoringQuery(raw: unknown) {
  const result = querySchema.safeParse(raw);
  if (!result.success) throw new AuthError(422, "VALIDATION_FAILED", "Choose a valid academic year, semester, monitoring filter and page size (1–100).");
  return result.data;
}
const levelSql = `CASE LOWER(TRIM(${yearLevel})) ${LEVEL_LABELS.flatMap((labels, index) => labels.map(label => `WHEN '${label}' THEN ${index + 1}`)).join(" ")} ELSE NULL END`;

// Mirrors the approved-request / no-outstanding correction source selection in
// status/graduation.ts, without its financial settlement/history hydration.
// Limit the source to years/effective dates within the explicitly selected year.
const formalSource = `(SELECT q.id FROM scholarship_records gr
 JOIN academic_years gy ON gy.id=gr.academic_year_id
 JOIN status_change_requests q ON q.scholarship_id=gr.id AND q.to_status='graduated'
 JOIN status_change_decisions d ON d.request_id=q.id AND d.decision='approve'
 LEFT JOIN graduation_record_corrections gc ON gc.request_id=q.id
 WHERE gr.scholar_id=s.id AND gy.starts_on<=my.ends_on AND q.effective_on<=my.ends_on
 AND (gr.operational_status='graduated' OR gc.no_outstanding_stipend=1)
 AND (d.resulting_version=gr.status_version OR (gc.no_outstanding_stipend=1 AND EXISTS(
 SELECT 1 FROM status_change_requests cq JOIN status_change_decisions cd ON cd.request_id=cq.id
 WHERE cq.scholarship_id=gr.id AND cq.reason_code='GRADUATION' AND cq.to_status<>'graduated'
 AND cd.decision='approve' AND cd.resulting_version=gr.status_version)))
 ORDER BY gr.status_effective_on DESC,gr.id,q.id LIMIT 1)`;
const columns = `s.id,i.human_id,s.last_name sort_last,s.first_name sort_first,CONCAT_WS(' ',s.first_name,s.middle_name,s.last_name,s.suffix) search_forward,CONCAT_WS(' ',s.last_name,s.first_name,s.middle_name,s.suffix) search_backward,CONCAT_WS(' ',CONCAT(s.last_name,','),s.first_name,NULLIF(s.middle_name,''),NULLIF(s.suffix,'')) AS display_name,
 ${placementColumns},${levelSql} AS normalized_level,${formalSource} AS graduation_request_id`;

export class GraduationMonitoringService {
  constructor(private authorization: AuthorizationService,private writesEnabled=false) {}
  async context(actor: string): Promise<MonitoringContext> {
    return this.authorization.readSnapshot(actor, "scholars.read", async db => {
      const [working] = await db.query<RowDataPacket[]>("SELECT setting_value FROM system_settings WHERE code='LDSS_WORKING_ACADEMIC_YEAR' AND archived_at IS NULL");
      const [years] = await db.query<RowDataPacket[]>("SELECT id,CONCAT(code,' — ',name) name FROM academic_years ORDER BY starts_on DESC,id LIMIT 101");
      const [semesters] = await db.query<RowDataPacket[]>("SELECT id,name,academic_year_id academicYearId FROM semesters ORDER BY starts_on DESC,id LIMIT 101");
      const [schools] = await db.query<RowDataPacket[]>("SELECT id,name FROM schools ORDER BY name,id LIMIT 101");
      const [courses] = await db.query<RowDataPacket[]>("SELECT id,name FROM courses ORDER BY name,id LIMIT 101");
      const choices = (rows: RowDataPacket[]) => rows.slice(0,100).map(r => ({id: r.id as string,name:r.name as string}));
      return {workingYearId:working[0]?.setting_value ?? null,years:choices(years),semesters:semesters.slice(0,100).map(r=>({id:r.id as string,name:r.name as string,academicYearId:r.academicYearId as string})),schools:choices(schools),courses:choices(courses),choicesLimited:[years,semesters,schools,courses].some(r=>r.length>100),graduationWritesEnabled:this.writesEnabled};
    });
  }
  async list(actor: string, raw: unknown): Promise<MonitoringList> {
    const q=parseMonitoringQuery(raw);
    return this.authorization.readSnapshot(actor,'scholars.read',async db=>{
      const [[year]]=await db.execute<RowDataPacket[]>('SELECT id,code,name FROM academic_years WHERE id=?',[q.academicYearId]);
      if(!year)throw new AuthError(422,'REFERENCE_NOT_FOUND','Choose an existing academic year.');
      let semester=null;if(q.semesterId){const [[r]]=await db.execute<RowDataPacket[]>('SELECT id,name FROM semesters WHERE id=? AND academic_year_id=?',[q.semesterId,q.academicYearId]);if(!r)throw new AuthError(422,'SEMESTER_YEAR_MISMATCH','Choose a semester belonging to this year.');semester={id:String(r.id),name:String(r.name)};}
      const {sql,args}=monitoringReadSql(q),where=['1=1'],values=[...args];
      if(q.q){const term='%'+q.q.replace(/[=%_]/g,c=>'='+c)+'%';where.push("(display_name LIKE ? ESCAPE '=' OR human_id LIKE ? ESCAPE '=' OR search_forward LIKE ? ESCAPE '=' OR search_backward LIKE ? ESCAPE '=')");values.push(term,term,term,term);}
      if(q.schoolId){where.push('placement_school_id=?');values.push(q.schoolId);}if(q.courseId){where.push('placement_course_id=?');values.push(q.courseId);}
      if(q.filter==='final_year_review')where.push('normalized_level IN(4,5)');
      else if(q.filter==='needs_review')where.push("unresolved_reason IN('PROGRAM_CONTEXT_REQUIRED','PROGRAM_CONTEXT_STALE','MONITORING_REVIEW_PENDING','MONITORING_SOURCE_CHANGED','SEMESTER_CONTEXT_REQUIRED','DURATION_REFERENCE_CONFLICT')");
      else if(q.filter==='unknown_duration')where.push('duration_count<>1');
      else if(q.filter==='follow_up')where.push("JSON_EXTRACT(follow_up_snapshot,'$.followUp') IS NOT NULL AND JSON_TYPE(JSON_EXTRACT(follow_up_snapshot,'$.followUp'))<>'NULL'");
      else if(q.filter!=='all'){where.push('indicator=?');values.push(q.filter);}
      const predicate=' WHERE '+where.join(' AND '),[[count]]=await db.execute<RowDataPacket[]>(authorizedMonitoringQuery(sql,'SELECT COUNT(*) total FROM monitoring'+predicate),values);
      const sort={name:'sort_last',scholarId:'human_id',yearLevel:'normalized_level'}[q.sort],direction=q.direction==='desc'?'DESC':'ASC';
      const [rows]=await db.execute<RowDataPacket[]>(authorizedMonitoringQuery(sql,'SELECT * FROM monitoring'+predicate+' ORDER BY ('+sort+' IS NULL),'+sort+' '+direction+',sort_last '+direction+',sort_first '+direction+',id ASC LIMIT ? OFFSET ?'),[...values,q.limit,q.offset]);
      const items:MonitoringRow[]=rows.map(r=>({id:r.id,scholarId:r.human_id,name:r.display_name,school:r.placement_school??null,course:r.placement_course??null,yearLevel:r.placement_year??null,provisional:!r.authoritative_academic_id,durationYears:r.duration_years===null?null:String(r.duration_years),indicator:r.indicator,explanation:r.graduation_request_id?'Approved formal graduation evidence; standing and benefits remain separate.':r.unresolved_reason?monitoringReason(r.unresolved_reason):r.indicator==='cannot_determine'?'Final-year mapping or recognized placement level requires review.':r.indicator==='not_final_year'?'Current approved level is below the evidenced final year.':'Current source-backed monitoring evidence.',graduationRequestId:r.graduation_request_id??null}));
      return {items,total:Number(count.total),offset:q.offset,limit:q.limit,academicYear:{id:year.id,name:year.code+' — '+year.name},semester,durationSourceAvailable:true,reviewSourceAvailable:true};
    });
  }
}
export function monitoringReadSql(q:{academicYearId:string;semesterId?:string},person?:string){
 const args:(string|number)[]=[q.academicYearId,q.semesterId??'',q.academicYearId];
 const base='SELECT '+columns+',my.id selected_year,'+canonicalColumns+' FROM scholars s JOIN scholar_identifiers i ON i.scholar_id=s.id JOIN academic_years my ON my.id=? LEFT JOIN semesters ms ON ms.id=? AND ms.academic_year_id=my.id '+placementJoinsForYear(q.academicYearId)+' WHERE (a.id IS NOT NULL OR si.id IS NOT NULL OR sr.id IS NOT NULL OR s.academic_year_id=my.id)'+(person?' AND s.id=?':'');if(person)args.push(person);
 return {sql:monitoringProjection(base,q.semesterId??null),args};
}
export function monitoringReason(code:string){return ({ACADEMIC_CONTEXT_REQUIRED:'Approved academic school/course is missing or pending.',SEMESTER_CONTEXT_REQUIRED:'Choose a semester to review its separate evidence.',DURATION_REFERENCE_REQUIRED:'An applicable confirmed duration reference is needed.',DURATION_REFERENCE_CONFLICT:'Conflicting duration references require Coordinator review.',PROGRAM_CONTEXT_REQUIRED:'Program curriculum/cohort context needs Coordinator review.',PROGRAM_CONTEXT_STALE:'Approved placement changed; review the program context.',MONITORING_REVIEW_PENDING:'A material evidence review remains unresolved.',MONITORING_SOURCE_CHANGED:'Recorded evidence is retained; changed sources require revalidation.'} as Record<string,string>)[code]??'Source integrity requires review.';}
