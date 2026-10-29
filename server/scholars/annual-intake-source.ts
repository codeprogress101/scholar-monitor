import type {PoolConnection,RowDataPacket} from "mysql2/promise";
import {digest} from "../auth/crypto.js";
import {AuthError} from "../auth/service.js";
import type {AnnualIntake,IntakeHistory,InitialPlacement} from "./annual-intake-model.js";

export function intakeHash(i:Omit<AnnualIntake,"snapshotHash"|"missingInitialFields"|"basis">) {
 return digest(JSON.stringify({format:"annual-intake/v1",intakeId:i.id,scholarId:i.scholarId,academicYearId:i.academicYearId,originKind:i.sourceKind,revision:i.revision,classification:i.classification,initialPlacement:{schoolId:i.initialPlacement.schoolId,courseId:i.initialPlacement.courseId,yearLevel:i.initialPlacement.yearLevel},source:{rootReference:i.rootSourceReference,currentReference:i.sourceReference,importJobId:i.importJobId,sourceRow:i.sourceRow}}));
}
export function finishIntake(i:Omit<AnnualIntake,"snapshotHash"|"missingInitialFields"|"basis">):AnnualIntake {
 return {...i,snapshotHash:intakeHash(i),missingInitialFields:(Object.keys(i.initialPlacement) as (keyof InitialPlacement)[]).filter(k=>i.initialPlacement[k]===null),basis:"supplied"};
}
const recorded=(v:unknown)=>v instanceof Date?v.toISOString():String(v);
export function rootIntake(r:RowDataPacket):AnnualIntake {
 return finishIntake({id:r.id,scholarId:r.scholar_id,academicYearId:r.academic_year_id,revision:1,classification:r.classification,originalClassification:r.classification,sourceKind:r.origin_kind,sourceReference:r.source_reference??null,rootSourceReference:r.source_reference??null,importJobId:r.import_job_id??null,sourceRow:r.source_row??null,initialPlacement:{schoolId:r.school_id??null,courseId:r.course_id??null,yearLevel:r.year_level??null},actorId:r.actor_id,recordedAt:recorded(r.recorded_at)});
}
export function nextIntake(before:AnnualIntake,r:RowDataPacket):AnnualIntake {
 if(r.revision!==before.revision+1||r.before_hash!==before.snapshotHash)throw new AuthError(409,"ANNUAL_INTAKE_INTEGRITY","Annual intake history needs controlled investigation.");
 if(!["supplement_initial_details","correct_classification"].includes(r.action))throw new AuthError(409,"ANNUAL_INTAKE_INTEGRITY","Unsupported intake history.");
 const placement={schoolId:r.school_id??null,courseId:r.course_id??null,yearLevel:r.year_level??null};
 const samePlacement=JSON.stringify(placement)===JSON.stringify(before.initialPlacement);
 if(r.action==="correct_classification"?(samePlacement===false||r.classification===before.classification):(before.sourceKind!=="manual"||r.classification!==before.classification||samePlacement||Object.entries(before.initialPlacement).some(([k,v])=>v!==null&&placement[k as keyof InitialPlacement]!==v)))throw new AuthError(409,"ANNUAL_INTAKE_INTEGRITY","Intake revision exceeds its recorded scope.");
 return finishIntake({...before,revision:r.revision,classification:r.classification,initialPlacement:placement,sourceReference:r.source_reference,actorId:r.actor_id,recordedAt:recorded(r.recorded_at)});
}
export async function intakeHistory(db:PoolConnection,id:string,lock=false):Promise<IntakeHistory[]> {
 const [[root]]=await db.execute<RowDataPacket[]>(`SELECT * FROM scholar_intakes WHERE id=?${lock?" FOR UPDATE":""}`,[id]);
 if(!root)throw new AuthError(404,"ANNUAL_INTAKE_NOT_FOUND","Annual intake was not found.");
 const result:IntakeHistory[]=[{revision:1,action:"registered",snapshot:rootIntake(root),reason:null,actorId:root.actor_id,recordedAt:recorded(root.recorded_at)}];
 const [rows]=await db.execute<RowDataPacket[]>("SELECT * FROM scholar_intake_revisions WHERE intake_id=? ORDER BY revision"+(lock?" FOR UPDATE":""),[id]);
 for(const row of rows){const current=nextIntake(result.at(-1)!.snapshot,row);result.push({revision:current.revision,action:row.action,snapshot:current,reason:row.reason,actorId:current.actorId,recordedAt:current.recordedAt});}
 return result;
}

// One selected head per annual root, shared by bounded list/count/sort projections.
export const intakeRevisionJoin="LEFT JOIN scholar_intake_revisions sir ON sir.intake_id=si.id AND sir.revision=(SELECT MAX(sir2.revision) FROM scholar_intake_revisions sir2 WHERE sir2.intake_id=si.id)";
export const intakeColumns=`si.id AS annual_intake_id,si.scholar_id AS annual_intake_person,si.academic_year_id AS annual_intake_year,si.origin_kind AS annual_intake_origin,si.classification AS annual_original_class,
 COALESCE(sir.classification,si.classification) AS annual_effective_class,COALESCE(sir.revision,1) AS annual_intake_revision,
 si.source_reference AS annual_root_reference,CASE WHEN sir.revision IS NULL THEN si.source_reference ELSE sir.source_reference END AS annual_current_reference,
 si.import_job_id AS annual_import_id,si.source_row AS annual_source_row,COALESCE(sir.actor_id,si.actor_id) AS annual_actor,
 DATE_FORMAT(COALESCE(sir.recorded_at,si.recorded_at),'%Y-%m-%dT%H:%i:%s.%fZ') AS annual_recorded_at,
 COALESCE(sir.school_id,si.school_id) AS annual_initial_school,COALESCE(sir.course_id,si.course_id) AS annual_initial_course,COALESCE(sir.year_level,si.year_level) AS annual_initial_year`;
export function projectedIntake(r:RowDataPacket):AnnualIntake|null {
 if(!r.annual_intake_id)return null;
 return finishIntake({id:r.annual_intake_id,scholarId:r.annual_intake_person,academicYearId:r.annual_intake_year,revision:Number(r.annual_intake_revision),classification:r.annual_effective_class,originalClassification:r.annual_original_class,sourceKind:r.annual_intake_origin,sourceReference:r.annual_current_reference??null,rootSourceReference:r.annual_root_reference??null,importJobId:r.annual_import_id??null,sourceRow:r.annual_source_row??null,initialPlacement:{schoolId:r.annual_initial_school??null,courseId:r.annual_initial_course??null,yearLevel:r.annual_initial_year??null},actorId:r.annual_actor,recordedAt:r.annual_recorded_at});
}
