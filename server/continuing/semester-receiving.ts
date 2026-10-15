import { unusedPlaceholders } from "../requirements/unused-placeholders.js";
import { sharedDocumentReview } from "../requirements/shared-semester-documents.js";
import { rolloverAdmission } from "../masterlists/continuing-admission.js";
import { graduationFor, preventGraduateRenewal } from "../status/graduation.js";
import { OFFICIAL_COHORT } from "./official-cohort.js";
import { workingYear } from "../configuration/calendar.js";
import { officialMembership } from "../eligibility/official-membership.js";
import { scopeAcceptsOwner } from "./scope-access.js";
import { requireRegularCoverage } from "./regular-coverage.js";
import { randomUUID } from "node:crypto";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { today } from "../scholars/validation.js";
import { policyDate, pinnedSemesterDefinitions } from "../requirements/semester-policy.js";
import { readChecklists } from "../requirements/instances-service.js";
import { academicCurrent } from "../academic/changes-service.js";
import type { ReceivingPeriod } from "../requirements/instances-model.js";

const decode = <T>(v: string | T): T => typeof v === "string" ? JSON.parse(v) as T : v;
type Rules = { purpose: string; rosterBatchId: string; predecessorSemesterId: string; corDefinitionVersionId: string; cogDefinitionVersionId: string };
export async function participation(db: PoolConnection, scholar: string) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT p.id,p.entry_basis,e.batch_id,(SELECT action FROM participation_events WHERE participation_id=p.id ORDER BY revision DESC LIMIT 1) AS action FROM participations p LEFT JOIN continuing_roster_entries e ON e.id=p.roster_entry_id WHERE p.scholar_id=? LOCK IN SHARE MODE", [scholar]);
  if (rows[0]) {
    if (rows[0].action !== "accepted") throw new AuthError(409, "PARTICIPATION_REVIEW_REQUIRED", "Review the existing participation decision.");
    return { id: rows[0].id as string, entry_basis: rows[0].entry_basis as string, batch_id: rows[0].batch_id ?? OFFICIAL_COHORT, action: "accepted" };
  }
  const [annuals] = await db.execute<RowDataPacket[]>("SELECT id,academic_year_id FROM scholarship_records WHERE scholar_id=? LOCK IN SHARE MODE", [scholar]);
  for (const a of annuals) {
    const { official } = await officialMembership(db, { academicYearId: a.academic_year_id }, a.id);
    if (official.valid) return { id: null, entry_basis: "official_masterlist", batch_id: OFFICIAL_COHORT, action: "accepted" };
  }
  const [[selected]] = await db.execute<RowDataPacket[]>("SELECT id FROM scholarship_records WHERE scholar_id=? AND status='selected' LIMIT 1 LOCK IN SHARE MODE", [scholar]);
  if (selected) return { id: null, entry_basis: "new_applicant", batch_id: OFFICIAL_COHORT, action: "accepted" };
  throw new AuthError(409, "ACCEPTED_BASELINE_REQUIRED", "Published official membership or an accepted continuing baseline is required.");
}
export async function scopeRows(db: PoolConnection, batch: string) {
  return (await db.execute<RowDataPacket[]>(`SELECT w.*,p.rules,DATE_FORMAT(p.effective_from,'%Y-%m-%d') AS policy_from,
    DATE_FORMAT(p.effective_until,'%Y-%m-%d') AS policy_until,DATE_FORMAT(a.valid_from,'%Y-%m-%d') AS authority_from,DATE_FORMAT(a.valid_until,'%Y-%m-%d') AS authority_until,
    s.code,s.name,s.version AS semester_version,s.academic_year_id,y.code AS year_code,y.name AS year_name,
    DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(s.ends_on,'%Y-%m-%d') AS ends,
    s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived
    FROM workflow_scope_versions w JOIN workflow_policy_versions p ON p.id=w.policy_version_id JOIN workflow_authority_versions a ON a.id=p.authority_version_id
    JOIN semesters s ON s.id=w.semester_id JOIN academic_years y ON y.id=s.academic_year_id
    WHERE w.cohort_code=? AND NOT EXISTS(SELECT 1 FROM workflow_scope_versions newer WHERE newer.semester_id=w.semester_id AND newer.cohort_code=w.cohort_code AND newer.revision>w.revision)
    ORDER BY s.starts_on DESC,w.id LOCK IN SHARE MODE`, [batch]))[0];
}
export function available(row: RowDataPacket, preparing = true) {
  const day = today();
  return row.mode === "enabled" && !row.locked_at && !row.archived_at && !row.year_locked && !row.year_archived && (!preparing || (row.starts <= day && row.ends >= day)) && row.policy_from <= day && (!row.policy_until || row.policy_until >= day) && row.authority_from <= day && (!row.authority_until || row.authority_until >= day);
}
export async function receivingScopes(db: PoolConnection, _scholar: string, batch: string) {
  const scopes = await scopeRows(db, batch);
  if (batch === OFFICIAL_COHORT) return scopes;
  // Keep dedicated roster scopes (and their disabled/closed decisions) intact.
  // Accepted continuing members can use the shared receiving setup too.
  const officialScopes = await scopeRows(db, OFFICIAL_COHORT);
  for (const scope of officialScopes) {
    if (scopes.some(s => s.semester_id === scope.semester_id)) continue;
    // An accepted continuing roster can receive before masterlist publication.
    // Official membership remains an independent payout eligibility check.
    scopes.push(scope);
  }
  return scopes;
}
export class SemesterReceivingService {
  private authorization: AuthorizationService;
  constructor(pool: Pool | undefined) { this.authorization = new AuthorizationService(pool); }
  availability(actor: string, raw: string) {
    const scholar = parseId(raw);
    return this.authorization.withPermission(actor, "scholars.read", async db => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      let person: Awaited<ReturnType<typeof participation>> | null = null;
      try { person = await participation(db, scholar); }
      catch (e) { if (!(e instanceof AuthError && e.code === "ACCEPTED_BASELINE_REQUIRED")) throw e; }
      const [annuals] = await db.execute<RowDataPacket[]>("SELECT id,academic_year_id,status FROM scholarship_records WHERE scholar_id=? LOCK IN SHARE MODE", [scholar]);
      const memberships = [];
      for (const annual of annuals) memberships.push({ academicYearId: String(annual.academic_year_id), published: (await officialMembership(db, { academicYearId: annual.academic_year_id }, annual.id)).official.valid });
      const scopes = person ? await receivingScopes(db, scholar, person.batch_id) : [];
      // Existing annual documents retain their owner. A disabled semester setup
      // still selects that route, so the UI cannot bypass it via the older path.
      const semesterYears = [...new Set(scopes.filter(s => s.starts <= today() && s.ends >= today()).map(s => String(s.academic_year_id)))];
      return { supported: Boolean(person), cohort: person?.batch_id ?? null, semesterYears, memberships, graduation: await graduationFor(db, scholar) };
    });
  }
  periods(actor: string, raw: string): Promise<{ items: ReceivingPeriod[] }> {
    const scholar = parseId(raw);
    return this.authorization.withPermission(actor, "scholars.read", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const person = await participation(db, scholar), scopes = await receivingScopes(db, scholar, person.batch_id);
      const calendar = await workingYear(db);
      const [terms] = await db.execute<RowDataPacket[]>("SELECT semester_id,scope_version_id FROM scholar_semesters WHERE scholar_id=?", [scholar]);
      return { items: scopes.filter((s) => available(s) || terms.some((t) => t.semester_id === s.semester_id)).map((s) => {
        const existing = terms.find((t) => t.semester_id === s.semester_id);
        const open = (!calendar || calendar.yearId === s.academic_year_id) && available(s, !existing) && (!existing || scopeAcceptsOwner(s, existing.scope_version_id));
        return { id: s.semester_id, semesterId: s.semester_id, semesterVersion: s.semester_version, payoutCycleId: null, payoutVersion: null, label: `${s.year_code} / ${s.name}${open ? "" : " (read only)"}`, preferred: open && available(s), canProvision: open && !existing, academicYearId: s.academic_year_id };
      }) };
    });
  }
  list(actor: string, raw: string) {
    const scholar = parseId(raw);
    return this.authorization.withPermission(actor, "scholars.read", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const person = await participation(db, scholar), scopes = await receivingScopes(db, scholar, person.batch_id);
      const [rows] = await db.execute<RowDataPacket[]>("SELECT c.*,s.academic_year_id,ss.scope_version_id,DATE_FORMAT(c.policy_date,'%Y-%m-%d') AS policy_on,DATE_FORMAT(c.created_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived FROM requirement_checklists c JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=s.academic_year_id WHERE ss.scholar_id=? ORDER BY s.starts_on,c.id LOCK IN SHARE MODE", [scholar]);
      for (const row of rows) row.scope_unavailable = !scopes.some((s) => s.semester_id === row.semester_id && scopeAcceptsOwner(s, row.scope_version_id) && available(s, false));
      return readChecklists(db, rows);
    });
  }
  provision(actor: string, raw: string, rawKey: unknown, body: unknown, requestId: string) {
    const scholar = parseId(raw), key = parseKey(rawKey), input = z.object({ periodId: z.uuid(), legacyReviewHash: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict().safeParse(body);
    if (!input.success) throw new AuthError(422, "VALIDATION_FAILED", "Choose a receiving semester.");
    return this.authorization.withPermission(actor, "requirements.generate", async (db, access) => {
      return provisionSemesterRecords(db, access, actor, scholar, key, input.data, requestId);
    });
  }
}

export async function provisionSemesterRecords(db: PoolConnection, access: import("../authorization/policy.js").Access, actor: string, scholar: string, key: string, input: { periodId: string; legacyReviewHash?: string }, requestId: string) {
  const periodId = input.periodId, hash = digest(JSON.stringify({ operation: "semester.provision", scholar, periodId, ...(input.legacyReviewHash ? { legacyReviewHash: input.legacyReviewHash } : {}) }));
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [commands] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (commands[0]) { if (commands[0].payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This retry key belongs to another action."); return decode<{ id: string; created: boolean; count: number }>(commands[0].result); }
      const person = await participation(db, scholar), scopes = await receivingScopes(db, scholar, person.batch_id), scope = scopes.find((s) => s.semester_id === periodId);
      if (!scope || !available(scope)) throw new AuthError(423, "SEMESTER_WORKFLOW_UNAVAILABLE", "Ask the Coordinator to enable a current semester setup for this accepted roster.");
      await requireRegularCoverage(db, periodId, decode<Rules>(scope.rules).predecessorSemesterId);
      const [existing] = await db.execute<RowDataPacket[]>("SELECT ss.id AS owner_id,ss.scope_version_id,c.id FROM scholar_semesters ss LEFT JOIN requirement_checklists c ON c.scholar_semester_id=ss.id WHERE ss.scholar_id=? AND ss.semester_id=? FOR UPDATE", [scholar, periodId]);
      let result: { id: string; created: boolean; count: number };
      if (existing[0]) {
        if (!existing[0].id || !scopeAcceptsOwner(scope, existing[0].scope_version_id)) throw new AuthError(409, "SEMESTER_REVIEW_REQUIRED", "Existing semester records need review; no replacement was created.");
        result = { id: existing[0].id, created: false, count: 2 };
      } else {
        await preventGraduateRenewal(db, scholar, periodId);
        const [legacy] = await db.execute<RowDataPacket[]>("SELECT i.id FROM requirement_checklists c JOIN scholarship_records r ON r.id=c.scholarship_record_id JOIN requirement_instances i ON i.checklist_id=c.id WHERE r.scholar_id=? AND c.semester_id=? FOR UPDATE", [scholar, periodId]);
        const excludedPlaceholderIds = await unusedPlaceholders(db, scholar, periodId, scope.rules);
        if (legacy.some(r => !excludedPlaceholderIds.includes(r.id))) {
          if (!input.legacyReviewHash) throw new AuthError(409, "LEGACY_RECEIVING_EXISTS", "Needs reconciliation: existing documents are preserved. Ask the Coordinator to prepare shared semester records for review.");
          if (!access.permissions.some(p => p.code === "semesters.configure")) throw new AuthError(403, "PERMISSION_DENIED", "Coordinator review is required.");
          const review = await sharedDocumentReview(db, scholar, periodId);
          if (review.sourceHash !== input.legacyReviewHash) throw new AuthError(409, "SOURCE_CHANGED", "Legacy evidence changed. Review it again.");
        }
        const [standing] = await db.execute<RowDataPacket[]>("SELECT operational_status,DATE_FORMAT(status_effective_on,'%Y-%m-%d') AS effective_on FROM scholarship_records WHERE scholar_id=? AND operational_status IS NOT NULL AND status_effective_on<=? ORDER BY status_effective_on DESC,status_version DESC LIMIT 1 LOCK IN SHARE MODE", [scholar, today()]);
        const status = standing[0];
        if (status && status.operational_status !== "active" && !(status.operational_status === "graduated" && scope.starts < status.effective_on)) throw new AuthError(409, "PARTICIPATION_REVIEW_REQUIRED", "The recorded scholarship status requires review before preparing another semester.");
        const rules = decode<Rules>(scope.rules);
        if (rules.purpose !== "continuing_semester_documents" || rules.rosterBatchId !== scope.cohort_code || scope.policy_from !== policyDate(scope.rules, scope.starts)) throw new AuthError(409, "SEMESTER_POLICY_CHANGED", "Review semester setup before preparing records.");
        const [previous] = await db.execute<RowDataPacket[]>("SELECT id,DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends FROM semesters WHERE id=? LOCK IN SHARE MODE", [rules.predecessorSemesterId]);
        if (!previous[0] || previous[0].ends >= scope.starts) throw new AuthError(409, "DOCUMENT_COVERAGE_CONFLICT", "Review previous-semester COG coverage.");
        await pinnedSemesterDefinitions(db, periodId, scope.rules, scope.starts, scope.ends);
        const [academics] = await db.execute<RowDataPacket[]>("SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=? LOCK IN SHARE MODE", [scholar, scope.academic_year_id]);
        const academic = academics[0] ? await academicCurrent(db, academics[0].id) : null;
        const [priorContexts] = await db.execute<RowDataPacket[]>("SELECT r.* FROM scholar_semesters ss JOIN scholar_semester_revisions r ON r.scholar_semester_id=ss.id WHERE ss.scholar_id=? AND ss.semester_id=? ORDER BY r.revision DESC LIMIT 1 LOCK IN SHARE MODE", [scholar, rules.predecessorSemesterId]);
        const prior = priorContexts[0];
        const priorPlacement = prior ? decode<{ placement?: { courseId: string } }>(prior.placement_snapshot).placement : null;
        const reuseCategory = academic && priorPlacement?.courseId === academic.placement.courseId && prior.program_category !== "unknown";
        const placementSnapshot = academic ? { placement: academic.placement, version: academic.version, effectiveOn: academic.effectiveOn,
          ...(reuseCategory ? { categorySource: { scholarSemesterId: prior.scholar_semester_id, revision: prior.revision } } : {}) } : {};
        const [users] = await db.execute<RowDataPacket[]>("SELECT full_name FROM users WHERE id=?", [actor]);
        let participationId: string | null = person.id ?? null;
        let annualId: string | null = null;
        if (scope.cohort_code === OFFICIAL_COHORT) {
          const [[annual]] = await db.execute<RowDataPacket[]>("SELECT id,status FROM scholarship_records WHERE scholar_id=? AND academic_year_id=? LOCK IN SHARE MODE", [scholar, scope.academic_year_id]);
          const official = annual ? (await officialMembership(db, { academicYearId: scope.academic_year_id }, annual.id)).official : null;
          const continuing = person.entry_basis === "continuing_baseline" || Boolean(await rolloverAdmission(db, scholar, scope.academic_year_id));
          if (!continuing && annual?.status !== "selected" && !official?.valid) throw new AuthError(409, "SELECTION_REQUIRED", "Coordinator selection or accepted continuing admission is required for semester receiving.");
          annualId = annual?.id ?? null;
          if (!participationId) {
            participationId = randomUUID();
            const [[policy]] = await db.execute<RowDataPacket[]>("SELECT authority_version_id FROM workflow_policy_versions WHERE id=?", [scope.policy_version_id]);
            const basis = official?.valid ? "official_masterlist" : "new_applicant";
            await db.execute("INSERT INTO participations(id,scholar_id,entry_basis,actor_id,recorded_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))", [participationId, scholar, basis, actor]);
            await db.execute("INSERT INTO participation_events(id,participation_id,revision,action,authority_version_id,effective_on,snapshot,reason,actor_id,recorded_at) VALUES(?,?,1,'accepted',?,?,?,?,?,UTC_TIMESTAMP(6))", [randomUUID(), participationId, policy.authority_version_id, today(), JSON.stringify({ basis, annualId, official, purpose: "document_receiving" }), "Existing admission decision linked for receiving; payroll approval remains separate", actor]);
          }
        }
        const owner = randomUUID(), checklist = randomUUID();
        await db.execute("INSERT INTO scholar_semesters(id,scholar_id,semester_id,participation_id,scope_version_id,scholarship_record_id,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [owner, scholar, periodId, participationId, scope.id, annualId, actor]);
        await db.execute("INSERT INTO scholar_semester_revisions(scholar_semester_id,revision,academic_record_id,placement_snapshot,predecessor_semester_id,year_level,program_category,actor_id,recorded_at) VALUES(?,1,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [owner, academics[0]?.id ?? null, JSON.stringify(placementSnapshot), rules.predecessorSemesterId, academic?.placement.yearLevel ?? null, reuseCategory ? prior.program_category : "unknown", actor]);
        await db.execute("INSERT INTO requirement_checklists(id,scholarship_record_id,scholar_semester_id,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,reason,reference_text,actor_id,actor_name,created_at) VALUES(?,NULL,?,?,?,?,?,?,?,?,'Automatic continuing semester receiving',?,?,?,UTC_TIMESTAMP(6))", [checklist, owner, periodId, policyDate(scope.rules, scope.starts), scope.year_code, scope.year_name, scope.code, scope.name, scope.semester_version, `Authorized scope ${scope.id}`, actor, users[0].full_name]);
        for (const [kind, definition, coverage] of [["cor", rules.corDefinitionVersionId, periodId], ["cog", rules.cogDefinitionVersionId, rules.predecessorSemesterId]]) {
          const instance = randomUUID();
          await db.execute("INSERT INTO requirement_instances(id,checklist_id,definition_version_id,status,created_at) VALUES(?,?,?,'not_submitted',UTC_TIMESTAMP(6))", [instance, checklist, definition]);
          await db.execute("INSERT INTO requirement_coverage(id,scholar_semester_id,requirement_instance_id,revision,document_kind,coverage_semester_id,actor_id,recorded_at) VALUES(?,?,?,1,?,?,?,UTC_TIMESTAMP(6))", [randomUUID(), owner, instance, kind, coverage, actor]);
        }
        await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'semester.provision','scholar_semester',?,'prepare',?,'user',UTC_TIMESTAMP(6),?,'Automatic continuing semester receiving',?)", [randomUUID(), owner, actor, requestId, JSON.stringify({ scholarId: scholar, semesterId: periodId, scopeId: scope.id, checklistId: checklist, predecessorSemesterId: rules.predecessorSemesterId, excludedPlaceholderIds, idempotency_key: key })]);
        result = { id: checklist, created: true, count: 2 };
      }
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,'semester.provision',?,?,UTC_TIMESTAMP(6))", [actor, key, hash, JSON.stringify(result)]);
      return result;
}
