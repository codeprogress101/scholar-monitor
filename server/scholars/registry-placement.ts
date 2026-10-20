import { ADMISSION_LABELS, type AdmissionStage } from "../qualification/model.js";
import { OPERATIONAL_LABELS, type OperationalStatus } from "../status/model.js";
import type { RowDataPacket } from "mysql2/promise";
import type { RegistryPlacement } from "./model.js";
// Latest approved placement has the same precedence as academicCurrent.
export const placementJoins = `
 LEFT JOIN system_settings wy ON wy.code='LDSS_WORKING_ACADEMIC_YEAR' AND wy.archived_at IS NULL
 LEFT JOIN academic_records a ON a.scholar_id=s.id AND a.academic_year_id=wy.setting_value
 LEFT JOIN academic_change_decisions ad ON ad.academic_record_id=a.id AND ad.decision='approve' AND ad.resulting_version=(SELECT MAX(ad2.resulting_version) FROM academic_change_decisions ad2 WHERE ad2.academic_record_id=a.id AND ad2.decision='approve')
 LEFT JOIN academic_changes ac ON ac.id=ad.request_id
 LEFT JOIN scholar_intakes si ON si.scholar_id=s.id AND si.academic_year_id=wy.setting_value
 LEFT JOIN schools ins ON ins.id=si.school_id
 LEFT JOIN courses inc ON inc.id=si.course_id
 LEFT JOIN scholarship_records sr ON sr.scholar_id=s.id AND sr.academic_year_id=wy.setting_value`;
export const school = "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ac.after_value,'$.school.name')),a.school_name,ins.name)";
export const yearLevel = "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ac.after_value,'$.yearLevel')),a.year_level,si.year_level)";
export const classification = "CASE WHEN sr.status='continuing' THEN 'continuing' WHEN si.id IS NOT NULL THEN si.classification WHEN EXISTS(SELECT 1 FROM participations bp WHERE bp.scholar_id=s.id AND bp.entry_basis='continuing_baseline') THEN 'continuing' WHEN sr.id IS NOT NULL THEN 'new' ELSE NULL END";
export const placementColumns = `wy.setting_value AS working_year_id,sr.status AS admission_status,sr.operational_status AS operational_status,a.id AS authoritative_academic_id,${school} AS placement_school,${yearLevel} AS placement_year,${classification} AS intake_classification,
 COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ac.after_value,'$.schoolId')),a.school_id,si.school_id) AS placement_school_id,
 COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ac.after_value,'$.courseId')),a.course_id,si.course_id) AS placement_course_id,
 COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ac.after_value,'$.course.name')),a.course_name,inc.name,CASE WHEN a.course_pending_exception_id IS NOT NULL THEN 'Course pending' END) AS placement_course`;
export function registryPlacement(row: RowDataPacket): RegistryPlacement | null {
 if (!row.working_year_id) return null;
 return { scholarshipStanding: OPERATIONAL_LABELS[row.operational_status as OperationalStatus] ?? ADMISSION_LABELS[row.admission_status as AdmissionStage] ?? "Not recorded", academicYearId: row.working_year_id, schoolId: row.placement_school_id ?? null, school: row.placement_school ?? null, courseId: row.placement_course_id ?? null, course: row.placement_course ?? null, yearLevel: row.placement_year ?? null, classification: row.intake_classification ?? null, provisional: !row.authoritative_academic_id && !!row.placement_school_id };
}

export const yearLevelSort = `CASE
 WHEN LOWER(TRIM(${yearLevel})) IN ('1','1st year','first year','first') THEN '1'
 WHEN LOWER(TRIM(${yearLevel})) IN ('2','2nd year','second year','second') THEN '2'
 WHEN LOWER(TRIM(${yearLevel})) IN ('3','3rd year','third year','third') THEN '3'
 WHEN LOWER(TRIM(${yearLevel})) IN ('4','4th year','fourth year','fourth') THEN '4'
 WHEN LOWER(TRIM(${yearLevel})) IN ('5','5th year','fifth year','fifth') THEN '5'
 WHEN LOWER(TRIM(${yearLevel})) IN ('6','6th year','sixth year','sixth') THEN '6'
 ELSE ${yearLevel} END`;

export function placementJoinsForYear(year?: string) {
 return year ? placementJoins.replace("LEFT JOIN system_settings wy ON wy.code='LDSS_WORKING_ACADEMIC_YEAR' AND wy.archived_at IS NULL", "LEFT JOIN (SELECT ? AS setting_value) wy ON 1=1") : placementJoins;
}
