import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";

/** A reviewed roster is admission evidence, never an invented exam/selection event. */
export async function continuingAdmission(db: PoolConnection, scholar: string) {
  const [[row]] = await db.execute<RowDataPacket[]>(`SELECT p.id,e.id AS event_id,e.revision,
    DATE_FORMAT(e.effective_on,'%Y-%m-%d') AS effective_on,e.action
    FROM participations p JOIN participation_events e ON e.participation_id=p.id
    WHERE p.scholar_id=? AND p.entry_basis='continuing_baseline'
    ORDER BY e.revision DESC LIMIT 1 LOCK IN SHARE MODE`, [scholar]);
  return row?.action === "accepted" ? row : null;
}

/** Only called inside an authorized, guarded draft mutation; never from a read. */
export async function prepareContinuingAnnual(db: PoolConnection, scholar: string, year: string, actor: string, requestId: string) {
  const [[existing]] = await db.execute<RowDataPacket[]>("SELECT id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=? FOR UPDATE", [scholar, year]);
  if (existing) return;
  const admission = await continuingAdmission(db, scholar);
  if (!admission) return;
  const [standing] = await db.execute<RowDataPacket[]>("SELECT operational_status,DATE_FORMAT(status_effective_on,'%Y-%m-%d') AS day FROM scholarship_records WHERE scholar_id=? AND operational_status IS NOT NULL ORDER BY status_effective_on DESC FOR UPDATE", [scholar]);
  if (standing.some(row => row.day === standing[0].day && row.operational_status !== "active"))
    throw new AuthError(409, "STANDING_REVIEW_REQUIRED", "Review this scholar's current scholarship standing before preparing another annual record.");
  const id = randomUUID();
  await db.execute("INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,version,last_effective_on,continuing_participation_id,created_at,updated_at) VALUES(?,?,?,'continuing',1,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [id, scholar, year, admission.effective_on, admission.id]);
  await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'scholarship.continuing-prepared','scholarship_record',?,'prepare',?,'user',UTC_TIMESTAMP(6),?,'Accepted continuing roster used for annual masterlist review',?)", [randomUUID(), id, actor, requestId, JSON.stringify({ scholarId: scholar, academicYearId: year, participationId: admission.id, admissionEventId: admission.event_id })]);
}

/** A rollover keeps its original, append-only admission evidence; no roster is fabricated. */
export async function rolloverAdmission(db: PoolConnection, scholar: string, year: string) {
  const [[row]] = await db.execute<RowDataPacket[]>(`SELECT r.continuing_from_scholarship_id AS source_id,a.id AS audit_id
    FROM scholarship_records r JOIN scholarship_records prior ON prior.id=r.continuing_from_scholarship_id AND prior.scholar_id=r.scholar_id
    JOIN academic_years py ON py.id=prior.academic_year_id JOIN academic_years ny ON ny.id=r.academic_year_id
    JOIN audit_event_view a ON a.event_type='scholarship.annual-rollover' AND a.entity_id=prior.id
      AND JSON_UNQUOTE(JSON_EXTRACT(a.details,'$.destinationId'))=r.id
      AND JSON_UNQUOTE(JSON_EXTRACT(a.details,'$.outcome'))='created'
    WHERE r.scholar_id=? AND r.academic_year_id=? AND r.status='continuing' AND py.ends_on<ny.starts_on LIMIT 1 LOCK IN SHARE MODE`, [scholar, year]);
  return row ? { scholarshipId: String(row.source_id), auditId: String(row.audit_id) } : null;
}
