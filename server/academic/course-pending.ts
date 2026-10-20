import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import type { Placement } from "./changes-model.js";

/** Shared exception evidence. A checklist, classification or blank field never grants it. */
export async function coursePendingForRecord(db: PoolConnection, academicId: string): Promise<NonNullable<Placement["coursePending"]>> {
  const [[row]] = await db.execute<RowDataPacket[]>(`SELECT e.*,v.revision,v.action
    FROM academic_records a JOIN course_pending_exceptions e ON e.id=a.course_pending_exception_id
    AND e.scholar_id=a.scholar_id AND e.academic_year_id=a.academic_year_id
    JOIN course_pending_events v ON v.exception_id=e.id
    WHERE a.id=? ORDER BY v.revision DESC LIMIT 1 FOR UPDATE`, [academicId]);
  if (!row || row.action !== "authorized") throw new AuthError(409,"COURSE_PENDING_REVIEW_REQUIRED","The missing course requires valid approved-import exception evidence.");
  return {id:row.id,revision:row.revision,importId:row.import_job_id,sourceRow:row.source_row,approvalReference:row.approval_reference};
}

/** Only the approved-import transaction calls this after explicit Coordinator confirmation. */
export async function createCoursePending(db: PoolConnection, actor: string, requestId: string, input: {
  scholarId:string; academicYearId:string; schoolId:string; yearLevel:string; importId:string; sourceRow:number; reference:string; effectiveOn:string;
}) {
  const id=randomUUID(), recordId=randomUUID();
  const [[year]]=await db.execute<RowDataPacket[]>("SELECT code,name FROM academic_years WHERE id=?",[input.academicYearId]);
  const [[school]]=await db.execute<RowDataPacket[]>("SELECT code,name FROM schools WHERE id=?",[input.schoolId]);
  const [[user]]=await db.execute<RowDataPacket[]>("SELECT full_name FROM users WHERE id=?",[actor]);
  await db.execute("INSERT INTO course_pending_exceptions(id,scholar_id,academic_year_id,import_job_id,source_row,approval_reference,effective_on,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",[id,input.scholarId,input.academicYearId,input.importId,input.sourceRow,input.reference,input.effectiveOn,actor]);
  await db.execute("INSERT INTO course_pending_events(exception_id,revision,action,evidence,actor_id,recorded_at) VALUES(?,1,'authorized',?,?,UTC_TIMESTAMP(6))",[id,JSON.stringify(input),actor]);
  await db.execute(`INSERT INTO academic_records(id,scholar_id,academic_year_id,school_id,course_id,year_level,year_code,year_name,school_code,school_name,course_code,course_name,reason,reference_text,actor_id,actor_name,created_at,course_pending_exception_id)
    VALUES(?,?,?,?,NULL,?,?,?,?,?,NULL,NULL,?,?,?,?,UTC_TIMESTAMP(6),?)`,[recordId,input.scholarId,input.academicYearId,input.schoolId,input.yearLevel,year.code,year.name,school.code,school.name,"Approved import: course pending",input.reference,actor,user.full_name,id]);
  await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'academic.course_pending','academic_record',?,'authorize',?,'user',UTC_TIMESTAMP(6),?,'Coordinator confirmed missing-course exception for approved import',?)",[randomUUID(),recordId,actor,requestId,JSON.stringify({exceptionId:id,...input})]);
  return {id:recordId};
}

export async function completeCoursePending(db:PoolConnection,academicId:string,actor:string,requestId:string,evidence:object) {
  const pending=await coursePendingForRecord(db,academicId);
  await db.execute("INSERT INTO course_pending_events(exception_id,revision,action,evidence,actor_id,recorded_at) VALUES(?,?,'completed',?,?,UTC_TIMESTAMP(6))",[pending.id,pending.revision+1,JSON.stringify(evidence),actor]);
  await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'academic.course_pending','academic_record',?,'complete',?,'user',UTC_TIMESTAMP(6),?,'Course completed from reviewed supporting evidence',?)",[randomUUID(),academicId,actor,requestId,JSON.stringify({exceptionId:pending.id,...evidence})]);
}
