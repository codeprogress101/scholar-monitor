import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import type { Placement } from "../academic/changes-model.js";
import type { DraftCandidate } from "./model.js";

export const MAX_SCOPE_MATCHES = 5000;
export const MAX_SCOPE_ADDITIONS = 1500;
export type CandidateSources = {
  person?: RowDataPacket;
  annual?: RowDataPacket;
  baseline?: RowDataPacket | null;
  rollover?: { scholarshipId: string; auditId: string } | null;
  academic?: { id: string; version: number; placement: Placement } | null;
  graduated: boolean;
  sourceIssue?: string;
};

/** Same eligibility/snapshot projection for the existing point reader and ML-1. */
export function projectCandidate(id: string, source: CandidateSources): DraftCandidate {
  const { person, annual, baseline, rollover, academic } = source;
  if (!person) return { scholarId: id, humanId: null, name: "Unknown scholar", snapshot: null,
    issues: [{ scholarId: id, code: "SCHOLAR_NOT_FOUND", message: "Scholar does not exist." }] };
  const issues: DraftCandidate["issues"] = [];
  const issue = (code: string, message: string) => issues.push({ scholarId: id, code, message });
  const name = [person.last_name, person.first_name, person.middle_name, person.suffix].filter(Boolean).join(" ");
  if (source.graduated) issue("PRIOR_GRADUATE", "Graduated scholar. Keep the historical record; do not add to a new masterlist. Any approved final stipend remains on its existing payroll.");
  if (!/^LDSS-\d{4}-\d{5}$/.test(person.human_id ?? "")) issue("SCHOLAR_ID_REQUIRED", "A valid permanent Scholar ID is required.");
  if (!annual && !baseline) issue("SCHOLARSHIP_RECORD_REQUIRED", "A scholarship record for the draft academic year is required.");
  else if (annual && annual.status !== "selected" && !(annual.status === "continuing" && (baseline?.id === annual.continuing_participation_id || rollover)))
    issue("SELECTION_REQUIRED", "Scholar must be Selected for the draft academic year.");
  if (source.sourceIssue) issue("SOURCE_REVIEW_REQUIRED", source.sourceIssue);
  if (!academic || !academic.placement.schoolId || (!academic.placement.courseId && !academic.placement.coursePending) || !academic.placement.yearLevel.trim())
    issue("ACADEMIC_RECORD_REQUIRED", "Complete school, course and year level for the draft academic year are required.");
  return { scholarId: id, humanId: person.human_id, name, issues, snapshot: issues.length ? null : {
    scholarId: id, humanId: person.human_id, name, personVersion: person.version,
    scholarshipId: annual?.id ?? baseline!.id, scholarshipVersion: annual?.version ?? 0,
    ...(baseline && (!annual || annual.status === "continuing") ? { continuingAdmission: { participationId: baseline.id as string, eventId: baseline.event_id as string } } : {}),
    ...(rollover ? { continuingRollover: rollover } : {}),
    academicRecordId: academic!.id, academicVersion: academic!.version, placement: academic!.placement,
  } };
}

const json = <T>(value: string | T): T => typeof value === "string" ? JSON.parse(value) as T : value;
const bounded = (rows: RowDataPacket[]) => {
  if (rows.length > MAX_SCOPE_MATCHES || Buffer.byteLength(JSON.stringify(rows)) > 32 * 1024 * 1024)
    throw new AuthError(409, "SELECTION_CAPACITY", "Selection sources exceed the supported review capacity. Narrow the search.");
  return rows;
};

/** Fixed set-based reads: current evidence only, never per-person history calls. */
export async function loadCandidateSources(db: PoolConnection, ids: string[], year: string) {
  if (ids.length > MAX_SCOPE_MATCHES) throw new AuthError(409, "SELECTION_CAPACITY", "Review at most 5,000 matching scholars. Narrow the search.");
  const sources = new Map<string, CandidateSources>();
  if (!ids.length) return sources;
  const marks = ids.map(() => "?").join(",");
  const read = async (sql: string, args: string[]) => bounded((await db.execute<RowDataPacket[]>(sql, args))[0]);
  const people = await read(`SELECT s.id,s.first_name,s.middle_name,s.last_name,s.suffix,s.version,i.human_id FROM scholars s LEFT JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE s.id IN (${marks}) ORDER BY s.id`, ids);
  for (const person of people) sources.set(person.id, { person, graduated: false });
  const annuals = await read(`SELECT id,scholar_id,status,version,continuing_participation_id,operational_status,DATE_FORMAT(status_effective_on,'%Y-%m-%d') status_on FROM scholarship_records WHERE academic_year_id=? AND scholar_id IN (${marks}) ORDER BY scholar_id`, [year, ...ids]);
  for (const row of annuals) sources.get(row.scholar_id)!.annual = row;
  const baselines = await read(`SELECT p.scholar_id,p.id,e.id event_id,e.action,DATE_FORMAT(e.effective_on,'%Y-%m-%d') effective_on
    FROM participations p JOIN participation_events e ON e.participation_id=p.id AND e.revision=(SELECT MAX(v.revision) FROM participation_events v WHERE v.participation_id=p.id)
    WHERE p.entry_basis='continuing_baseline' AND p.scholar_id IN (${marks}) ORDER BY p.scholar_id`, ids);
  for (const row of baselines) if (row.action === "accepted") sources.get(row.scholar_id)!.baseline = row;
  const rollovers = await read(`SELECT r.scholar_id,r.continuing_from_scholarship_id source_id,a.id audit_id
    FROM scholarship_records r JOIN scholarship_records prior ON prior.id=r.continuing_from_scholarship_id AND prior.scholar_id=r.scholar_id
    JOIN academic_years py ON py.id=prior.academic_year_id JOIN academic_years ny ON ny.id=r.academic_year_id
    JOIN audit_event_view a ON a.event_type='scholarship.annual-rollover' AND a.entity_id=prior.id
      AND JSON_UNQUOTE(JSON_EXTRACT(a.details,'$.destinationId'))=r.id AND JSON_UNQUOTE(JSON_EXTRACT(a.details,'$.outcome'))='created'
    WHERE r.academic_year_id=? AND r.status='continuing' AND py.ends_on<ny.starts_on AND r.scholar_id IN (${marks}) ORDER BY r.scholar_id,a.id`, [year, ...ids]);
  for (const row of rollovers) {
    const source = sources.get(row.scholar_id)!;
    if (source.rollover) source.sourceIssue = "Multiple rollover sources require review.";
    source.rollover = { scholarshipId: row.source_id, auditId: row.audit_id };
  }
  const academics = await read(`SELECT a.id,a.scholar_id,a.school_id,a.course_id,a.year_level,a.school_code,a.school_name,a.course_code,a.course_name,
    d.resulting_version,CASE WHEN OCTET_LENGTH(q.after_value)<=4096 THEN q.after_value END after_value,
    (OCTET_LENGTH(q.after_value)>4096) oversized_placement,e.id exception_id,e.import_job_id,e.source_row,e.approval_reference,v.revision exception_revision,v.action exception_action
    FROM academic_records a
    LEFT JOIN academic_change_decisions d ON d.academic_record_id=a.id AND d.decision='approve' AND d.resulting_version=(SELECT MAX(x.resulting_version) FROM academic_change_decisions x WHERE x.academic_record_id=a.id AND x.decision='approve')
    LEFT JOIN academic_changes q ON q.id=d.request_id
    LEFT JOIN course_pending_exceptions e ON e.id=a.course_pending_exception_id AND e.scholar_id=a.scholar_id AND e.academic_year_id=a.academic_year_id
    LEFT JOIN course_pending_events v ON v.exception_id=e.id AND v.revision=(SELECT MAX(x.revision) FROM course_pending_events x WHERE x.exception_id=e.id)
    WHERE a.academic_year_id=? AND a.scholar_id IN (${marks}) ORDER BY a.scholar_id`, [year, ...ids]);
  for (const row of academics) {
    const source = sources.get(row.scholar_id)!;
    if (row.oversized_placement || (row.resulting_version !== null && !row.after_value)) { source.sourceIssue = "Approved academic source requires review."; continue; }
    const placement: Placement = row.after_value ? json(row.after_value) : { schoolId: row.school_id, courseId: row.course_id ?? "", yearLevel: row.year_level,
      school: { code: row.school_code, name: row.school_name }, course: { code: row.course_code ?? "", name: row.course_name ?? "Course pending" } };
    if (!row.after_value && !row.course_id) {
      if (row.exception_action !== "authorized") source.sourceIssue = "The missing course requires valid approved-import exception evidence.";
      else placement.coursePending = { id: row.exception_id, revision: row.exception_revision, importId: row.import_job_id, sourceRow: row.source_row, approvalReference: row.approval_reference };
    }
    source.academic = { id: row.id, version: row.resulting_version ?? 0, placement };
  }
  // Same graduation identity predicate as graduationRecords; payment rendering
  // and stipend histories cannot affect whether candidate() rejects a graduate.
  const graduates = await read(`SELECT DISTINCT r.scholar_id FROM scholarship_records r
    LEFT JOIN status_change_requests q ON q.scholarship_id=r.id AND q.to_status='graduated'
      AND EXISTS(SELECT 1 FROM status_change_decisions d WHERE d.request_id=q.id AND d.decision='approve'
        AND (d.resulting_version=r.status_version OR EXISTS(SELECT 1 FROM graduation_record_corrections gc WHERE gc.request_id=q.id AND gc.no_outstanding_stipend=1 AND EXISTS(SELECT 1 FROM status_change_requests cq JOIN status_change_decisions cd ON cd.request_id=cq.id WHERE cq.scholarship_id=r.id AND cq.reason_code='GRADUATION' AND cq.to_status<>'graduated' AND cd.decision='approve' AND cd.resulting_version=r.status_version))))
    LEFT JOIN graduation_confirmations g ON g.request_id=q.id LEFT JOIN graduation_record_corrections x ON x.request_id=g.request_id
    WHERE (r.operational_status='graduated' OR x.no_outstanding_stipend=1) AND r.scholar_id IN (${marks})`, ids);
  for (const row of graduates) sources.get(row.scholar_id)!.graduated = true;
  const standing = await read(`SELECT r.scholar_id,MAX(r.operational_status<>'active') adverse,MAX(r.status_effective_on IS NULL) undated
    FROM scholarship_records r WHERE r.scholar_id IN (${marks}) AND r.operational_status IS NOT NULL
      AND (r.status_effective_on IS NULL OR r.status_effective_on=(SELECT MAX(x.status_effective_on) FROM scholarship_records x WHERE x.scholar_id=r.scholar_id AND x.operational_status IS NOT NULL))
    GROUP BY r.scholar_id`, ids);
  for (const row of standing) {
    const source = sources.get(row.scholar_id)!;
    if (!source.annual && source.baseline && (row.adverse || row.undated)) source.sourceIssue = "Review current scholarship standing before preparing another annual record.";
  }
  return sources;
}
