import { continuingAdmission } from "../masterlists/continuing-admission.js";
import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { officialMembership } from "../eligibility/official-membership.js";
import { graduationRecords } from "../status/graduation.js";
import { today } from "../scholars/validation.js";

export type RolloverOutcome = "created" | "alreadyPresent" | "excluded" | "needsReview";
export type RolloverSummary = {
  fromYearId: string; toYearId: string;
  totals: Record<RolloverOutcome, number>;
  scholars: { scholarId: string; humanId: string; name: string; sourceId: string; destinationId: string | null; outcome: RolloverOutcome; reason: string }[];
};

/** Caller holds configuration_guard inside the year-advance transaction. No activation or academic copying. */
export async function rolloverYear(db: PoolConnection, from: string, to: string, actor: string, requestId: string): Promise<RolloverSummary> {
  const [[year]] = await db.execute<RowDataPacket[]>("SELECT DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts FROM academic_years WHERE id=? LOCK IN SHARE MODE", [to]);
  const [annuals] = await db.execute<RowDataPacket[]>(`SELECT r.*,i.human_id,CONCAT_WS(' ',s.last_name,s.first_name,s.middle_name) AS name
    FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id
    WHERE r.academic_year_id=? ORDER BY r.scholar_id FOR UPDATE`, [from]);
  const graduates = await graduationRecords(db);
  const summary: RolloverSummary = { fromYearId: from, toYearId: to, totals: { created: 0, alreadyPresent: 0, excluded: 0, needsReview: 0 }, scholars: [] };
  for (const source of annuals) {
    const { official } = await officialMembership(db, { academicYearId: from }, source.id);
    const [standing] = await db.execute<RowDataPacket[]>(`SELECT id,operational_status,status_version,DATE_FORMAT(status_effective_on,'%Y-%m-%d') AS day
      FROM scholarship_records WHERE scholar_id=? AND operational_status IS NOT NULL ORDER BY status_effective_on DESC,id FOR UPDATE`, [source.scholar_id]);
    const effective = standing.filter(s => s.day <= today());
    const latest = effective.filter(s => s.day === effective[0]?.day);
    const status = latest[0]?.operational_status ?? null;
    const [[existing]] = await db.execute<RowDataPacket[]>("SELECT id,status,continuing_from_scholarship_id,continuing_participation_id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=? FOR UPDATE", [source.scholar_id, to]);
    const [participations] = await db.execute<RowDataPacket[]>("SELECT (SELECT action FROM participation_events e WHERE e.participation_id=p.id ORDER BY revision DESC LIMIT 1) AS action FROM participations p WHERE p.scholar_id=? LOCK IN SHARE MODE", [source.scholar_id]);
    let outcome: RolloverOutcome, reason: string, destinationId: string | null = existing?.id ?? null;
    if (graduates.has(source.scholar_id) || ["graduated", "dropped", "disqualified", "not_renewed"].includes(status)) {
      outcome = "excluded"; reason = "Graduated or terminal scholarship standing; not renewed.";
    } else if (participations.some(p => p.action !== "accepted") || standing.some(s => s.day > today()) || latest.some(s => s.operational_status !== status) || status !== "active") {
      outcome = "needsReview"; reason = "Standing is restricted, missing, conflicting or future-effective; Coordinator review required.";
    } else if (!official.valid || !["selected", "continuing"].includes(source.status)) {
      outcome = "excluded"; reason = "No valid outgoing official membership and admitted annual record.";
    } else if (existing) {
      const roster = existing.continuing_participation_id ? await continuingAdmission(db, source.scholar_id) : null;
      const compatible = existing.status === "continuing" && (existing.continuing_from_scholarship_id === source.id || (roster && roster.id === existing.continuing_participation_id));
      outcome = compatible ? "alreadyPresent" : "needsReview";
      reason = compatible ? "Continuing record already exists; preserved." : "Existing next-year record preserved; review its admission source.";
    } else {
      destinationId = randomUUID(); outcome = "created"; reason = "Continuing record prepared; current academic details and official approval still required.";
      await db.execute("INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,version,last_effective_on,continuing_from_scholarship_id,created_at,updated_at) VALUES(?,?,?,'continuing',1,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [destinationId, source.scholar_id, to, year.starts, source.id]);
    }
    const item = { scholarId: String(source.scholar_id), humanId: String(source.human_id), name: String(source.name), sourceId: String(source.id), destinationId, outcome, reason };
    summary.totals[outcome]++; summary.scholars.push(item);
    await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'scholarship.annual-rollover','scholarship_record',?,'rollover',?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), source.id, actor, requestId, reason, JSON.stringify({ ...item, fromYearId: from, toYearId: to, official, effectiveStanding: latest, graduation: graduates.get(source.scholar_id) ?? null })]);
  }
  await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'academic-year.rollover','academic_year',?,'rollover',?,'user',UTC_TIMESTAMP(6),?,'Automatic annual Continuing classification',?)", [randomUUID(), to, actor, requestId, JSON.stringify(summary)]);
  return summary;
}

export async function rolloverSummary(db: PoolConnection, year: string): Promise<RolloverSummary | null> {
  const [[row]] = await db.execute<RowDataPacket[]>("SELECT details FROM audit_event_view WHERE event_type='academic-year.rollover' AND entity_id=? ORDER BY occurred_at DESC,id DESC LIMIT 1", [year]);
  return row ? (typeof row.details === "string" ? JSON.parse(row.details) : row.details) as RolloverSummary : null;
}
