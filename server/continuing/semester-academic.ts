import { scopeAcceptsOwner } from "./scope-access.js";
import { randomUUID } from "node:crypto";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { academicCurrent } from "../academic/changes-service.js";
import { today } from "../scholars/validation.js";
import { available, participation, receivingScopes } from "./semester-receiving.js";
import type { Placement } from "../academic/changes-model.js";

type Category = "unknown" | "degree" | "non_degree";
type Snapshot = { placement?: Placement; version?: number; effectiveOn?: string | null; categorySource?: { scholarSemesterId: string; revision: number }; categoryCorrection?: { previousRevision: number; previousCategory: Category; reason: string; reference: string } };
export type SemesterAcademicView = {
  academicYearId: string;
  revision: number;
  category: Category;
  saved: Snapshot;
  current: { id: string; version: number; placement: Placement; effectiveOn: string | null } | null;
  blocker: string | null;
  correctionBlocker: string | null;
  history: { revision: number; category: Category; snapshot: Snapshot; actorName: string; recordedAt: string }[];
};
const decode = <T>(v: T | string): T => typeof v === "string" ? JSON.parse(v) as T : v;
async function context(db: PoolConnection, scholar: string, semester: string) {
  const person = await participation(db, scholar);
  const scope = (await receivingScopes(db, scholar, person.batch_id)).find((s) => s.semester_id === semester);
  const [terms] = await db.execute<RowDataPacket[]>("SELECT * FROM scholar_semesters WHERE scholar_id=? AND semester_id=? FOR UPDATE", [scholar, semester]);
  if (!terms[0] || !scope) throw new AuthError(404, "SEMESTER_NOT_PREPARED", "Open semester receiving before recording academic details.");
  const term = terms[0];
  const [revisions] = await db.execute<RowDataPacket[]>("SELECT r.*,u.full_name,DATE_FORMAT(r.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded FROM scholar_semester_revisions r JOIN users u ON u.id=r.actor_id WHERE scholar_semester_id=? ORDER BY revision DESC FOR UPDATE", [term.id]);
  if (!revisions[0]) throw new AuthError(409, "SEMESTER_REVIEW_REQUIRED", "The semester revision needs review.");
  const [academics] = await db.execute<RowDataPacket[]>("SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=?", [scholar, scope.academic_year_id]);
  const academic = academics[0] ? await academicCurrent(db, academics[0].id) : null;
  const saved = decode<Snapshot>(revisions[0].placement_snapshot);
  const [used] = await db.execute<RowDataPacket[]>("SELECT id FROM semester_review_events WHERE scholar_semester_id=? UNION ALL SELECT id FROM semester_entitlements WHERE scholar_semester_id=? LIMIT 1", [term.id, term.id]);
  const blocker = !available(scope, false) || !scopeAcceptsOwner(scope, term.scope_version_id)
    ? "This semester setup is unavailable or locked. Saved academic history remains readable."
    : used.length ? "This semester already has an academic review or entitlement. A controlled review is required before changing its details."
    : !academic ? "Add the academic record for this year first."
    : revisions[0].program_category !== "unknown" && saved.placement && saved.placement.courseId !== academic.placement.courseId
      ? "The approved course has changed. Coordinator review of the program category is required before updating this semester."
    : academic.effectiveOn && (academic.effectiveOn > scope.ends || academic.effectiveOn > today())
      ? "The latest placement takes effect after this semester or in the future. Review the historical academic record first." : null;
  const [dependents] = await db.execute<RowDataPacket[]>("SELECT scholar_semester_id FROM scholar_semester_revisions WHERE scholar_semester_id<>? AND JSON_UNQUOTE(JSON_EXTRACT(placement_snapshot,'$.categorySource.scholarSemesterId'))=? LIMIT 1", [term.id, term.id]);
  const correctionBlocker = blocker ?? (revisions[0].program_category === "unknown" ? "Record the missing program category through the normal form first."
    : latestPlacementChanged(revisions[0], saved, academic, academics[0]?.id) ? "The academic placement has changed. Resolve the academic context before correcting its category."
    : dependents.length ? "A later semester already used this category. Its dependent records require coordinated review before correction." : null);
  const view: SemesterAcademicView = {
    academicYearId: scope.academic_year_id, revision: revisions[0].revision, category: revisions[0].program_category,
    saved,
    current: academic ? { id: academics[0].id, version: academic.version, placement: academic.placement, effectiveOn: academic.effectiveOn } : null,
    blocker, correctionBlocker,
    history: revisions.map((r) => ({ revision: r.revision, category: r.program_category, snapshot: decode<Snapshot>(r.placement_snapshot), actorName: r.full_name, recordedAt: r.recorded })),
  };
  return { term, latest: revisions[0], view };
}

function latestPlacementChanged(latest: RowDataPacket, saved: Snapshot, academic: Awaited<ReturnType<typeof academicCurrent>> | null, id?: string) {
  return !academic || latest.academic_record_id !== id || saved.version !== academic.version || JSON.stringify(saved.placement) !== JSON.stringify(academic.placement);
}

export class SemesterAcademicService {
  private authorization: AuthorizationService;
  constructor(pool: Pool | undefined) { this.authorization = new AuthorizationService(pool); }
  get(actor: string, rawScholar: string, rawSemester: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester);
    return this.authorization.withPermission(actor, "scholars.read", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      return (await context(db, scholar, semester)).view;
    });
  }
  correctCategory(actor: string, rawScholar: string, rawSemester: string, rawKey: unknown, body: unknown, requestId: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester), key = parseKey(rawKey);
    const text = (min: number, max: number) => z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
    const parsed = z.object({ expectedRevision: z.number().int().positive(), academicRecordId: z.uuid(), expectedAcademicVersion: z.number().int().nonnegative(), category: z.enum(["degree", "non_degree"]), reason: text(5, 500), reference: text(3, 300), reviewed: z.literal(true) }).strict().safeParse(body);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Choose the corrected category, explain the recording error, cite its evidence and confirm review.");
    const input = parsed.data, hash = digest(JSON.stringify({ operation: "semester.category.correct", scholar, semester, ...input }));
    return this.authorization.withPermission(actor, "academic.changes.approve", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [commands] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (commands[0]) {
        if (commands[0].payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This retry key belongs to another action.");
        return decode<{ revision: number; changed: boolean }>(commands[0].result);
      }
      const { term, latest, view } = await context(db, scholar, semester);
      if (view.correctionBlocker || !view.current) throw new AuthError(409, "CATEGORY_CORRECTION_REVIEW_REQUIRED", view.correctionBlocker ?? "Academic details need review.");
      if (view.revision !== input.expectedRevision || view.current.id !== input.academicRecordId || view.current.version !== input.expectedAcademicVersion)
        throw new AuthError(409, "VERSION_CONFLICT", "Academic details changed. Reload and review before correcting.");
      if (input.category === view.category) throw new AuthError(409, "NO_CATEGORY_CHANGE", "The selected category is already recorded.");
      const revision = view.revision + 1;
      const snapshot: Snapshot = { placement: view.saved.placement, version: view.saved.version, effectiveOn: view.saved.effectiveOn,
        categoryCorrection: { previousRevision: view.revision, previousCategory: view.category, reason: input.reason, reference: input.reference } };
      await db.execute("INSERT INTO scholar_semester_revisions(scholar_semester_id,revision,academic_record_id,academic_change_id,placement_snapshot,predecessor_semester_id,program_category,year_level,normalized_year_level,enrolled,full_load,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [term.id, revision, latest.academic_record_id, latest.academic_change_id, JSON.stringify(snapshot), latest.predecessor_semester_id, input.category, latest.year_level, latest.normalized_year_level, latest.enrolled, latest.full_load, actor]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'semester.category.correct','scholar_semester',?,'correct',?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), term.id, actor, requestId, input.reason, JSON.stringify({ revision, previousRevision: view.revision, previousCategory: view.category, category: input.category, reference: input.reference, academicRecordId: view.current.id, academicVersion: view.current.version, idempotency_key: key })]);
      const result = { revision, changed: true };
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,'semester.category.correct',?,?,UTC_TIMESTAMP(6))", [actor, key, hash, JSON.stringify(result)]);
      return result;
    });
  }
  save(actor: string, rawScholar: string, rawSemester: string, rawKey: unknown, body: unknown, requestId: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester), key = parseKey(rawKey);
    const parsed = z.object({ expectedRevision: z.number().int().positive(), academicRecordId: z.uuid(), expectedAcademicVersion: z.number().int().nonnegative(), category: z.enum(["unknown", "degree", "non_degree"]) }).strict().safeParse(body);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Reload semester academic details and choose a program category.");
    const input = parsed.data, hash = digest(JSON.stringify({ operation: "semester.academic", scholar, semester, ...input }));
    return this.authorization.withPermission(actor, "academic.edit", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [commands] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (commands[0]) {
        if (commands[0].payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This retry key belongs to another action.");
        return decode<{ revision: number; changed: boolean }>(commands[0].result);
      }
      const { term, latest, view } = await context(db, scholar, semester);
      if (view.blocker || !view.current) throw new AuthError(409, "SEMESTER_ACADEMIC_REVIEW_REQUIRED", view.blocker ?? "Academic details need review.", { academicYearId: view.academicYearId });
      if (view.revision !== input.expectedRevision || view.current.id !== input.academicRecordId || view.current.version !== input.expectedAcademicVersion)
        throw new AuthError(409, "VERSION_CONFLICT", "Academic details changed. Reload and review before saving.");
      if (view.category !== "unknown" && input.category !== view.category)
        throw new AuthError(409, "CATEGORY_REVIEW_REQUIRED", "A recorded program category cannot be changed here. Request Coordinator review of the course/category change.");
      const snapshot = { placement: view.current.placement, version: view.current.version, effectiveOn: view.current.effectiveOn, ...(view.saved.categorySource ? { categorySource: view.saved.categorySource } : {}), ...(view.saved.categoryCorrection ? { categoryCorrection: view.saved.categoryCorrection } : {}) };
      const changed = input.category !== view.category || latest.academic_record_id !== view.current.id || JSON.stringify(view.saved) !== JSON.stringify(snapshot);
      const revision = view.revision + (changed ? 1 : 0);
      if (changed) {
        const [changes] = await db.execute<RowDataPacket[]>("SELECT request_id FROM academic_change_decisions WHERE academic_record_id=? AND decision='approve' AND resulting_version=?", [view.current.id, view.current.version]);
        await db.execute("INSERT INTO scholar_semester_revisions(scholar_semester_id,revision,academic_record_id,academic_change_id,placement_snapshot,predecessor_semester_id,program_category,year_level,normalized_year_level,enrolled,full_load,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [term.id, revision, view.current.id, changes[0]?.request_id ?? null, JSON.stringify(snapshot), latest.predecessor_semester_id, input.category, snapshot.placement.yearLevel, latest.year_level === snapshot.placement.yearLevel ? latest.normalized_year_level : null, latest.enrolled, latest.full_load, actor]);
        await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'semester.academic','scholar_semester',?,'record',?,'user',UTC_TIMESTAMP(6),?,'Semester academic details recorded from authoritative placement',?)", [randomUUID(), term.id, actor, requestId, JSON.stringify({ revision, previousRevision: view.revision, academicRecordId: view.current.id, academicVersion: view.current.version, category: input.category, idempotency_key: key })]);
      }
      const result = { revision, changed };
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,'semester.academic',?,?,UTC_TIMESTAMP(6))", [actor, key, hash, JSON.stringify(result)]);
      return result;
    });
  }
}
