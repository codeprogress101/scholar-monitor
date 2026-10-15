import { policyDate, pinnedSemesterDefinitions, validatePolicyDate } from "../requirements/semester-policy.js";
import { OFFICIAL_COHORT } from "./official-cohort.js";
import { randomUUID } from "node:crypto";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { applicableRequirements } from "../requirements/service.js";
import { validationDetails } from "../validation-details.js";
import { today } from "../scholars/validation.js";
import { validateRecovery } from "./semester-recovery.js";
import { regularCoverageOption, requireRegularCoverage, type CoverageOption } from "./regular-coverage.js";

const schema = z.object({
  semesterId: z.uuid(), expectedSemesterVersion: z.number().int().positive(),
  policyDate: z.iso.date().optional(),
  reuseScopeId: z.uuid().optional(), reuseScopeRevision: z.number().int().positive().optional(),
  expectedScopeId: z.uuid().optional(), expectedScopeRevision: z.number().int().positive().optional(),
  expectedCoverageHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  coverageReason: z.string().trim().min(5).max(500).optional(), predecessorSemesterId: z.uuid(), corDefinitionVersionId: z.uuid(), cogDefinitionVersionId: z.uuid(),
  issuer: z.string().trim().min(3).max(200), reference: z.string().trim().min(3).max(300),
  sourceReference: z.string().trim().min(3).max(500), reviewed: z.literal(true),
}).strict();
export type SemesterSetup = { policyDate?: string; setupRevision?: number; id: string; semesterId: string; semesterName: string; revision: number; mode: string; current: boolean; recordCount: number; predecessorSemesterId: string; corDefinitionVersionId: string; cogDefinitionVersionId: string; issuer: string; reference: string; sourceReference: string; coverage: CoverageOption };
export type ReusableSemesterSetup = { id: string; revision: number; semesterId: string; sourceReference: string; policyDate: string; predecessorSemesterId: string; corDefinitionVersionId: string; cogDefinitionVersionId: string };
export type SemesterSetupOptions = { reusableSetups?: ReusableSemesterSetup[]; periods: { id: string; name: string; startsOn: string; endsOn: string; version: number; available: boolean }[]; definitions: { id: string; code: string; name: string; documentKind?: string | null }[]; setups: SemesterSetup[]; coverage: CoverageOption | null };
const decode = <T>(v: string | T): T => typeof v === "string" ? JSON.parse(v) as T : v;
async function acceptedRoster(db: PoolConnection, batch: string) {
  if (batch === OFFICIAL_COHORT) return;
  const [rows] = await db.execute<RowDataPacket[]>("SELECT decision FROM continuing_roster_decisions WHERE batch_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE", [batch]);
  if (rows[0]?.decision !== "accepted") throw new AuthError(409, "ACCEPTED_ROSTER_REQUIRED", "Accept this continuing roster before preparing a semester setup.");
}
export class SemesterSetupService {
  private authorization: AuthorizationService;
  constructor(pool: Pool | undefined) { this.authorization = new AuthorizationService(pool); }
  options(actor: string, rawBatch: string, rawSemester?: string, rawDate?: string): Promise<SemesterSetupOptions> {
    const batch = parseId(rawBatch), selected = rawSemester ? parseId(rawSemester) : null;
    return this.authorization.withPermission(actor, "continuing.prepare", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      await acceptedRoster(db, batch);
      const [periods] = await db.query<RowDataPacket[]>("SELECT s.id,s.name,s.version,DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(s.ends_on,'%Y-%m-%d') AS ends,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id ORDER BY s.starts_on DESC,s.id");
      const items = periods.map((p) => ({ id: p.id as string, name: p.name as string, version: Number(p.version), startsOn: p.starts as string, endsOn: p.ends as string, available: !p.locked_at && !p.archived_at && !p.year_locked && !p.year_archived && p.ends >= today() }));
      const period = items.find((p) => p.id === selected && p.available);
      const parsedDate = z.iso.date().safeParse(rawDate ?? today());
      if (!parsedDate.success) throw new AuthError(422,"VALIDATION_FAILED","Choose a valid policy applicability date.");
      const selectedDate = parsedDate.data;
      const definitions = period && selectedDate >= period.startsOn && selectedDate <= period.endsOn ? await applicableRequirements(db, { semesterId: period.id, appliesTo: "semester", effectiveOn: selectedDate }) : [];
      const [setups] = await db.execute<RowDataPacket[]>("SELECT w.id,w.semester_id,s.name,DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS starts,w.revision,w.mode,(SELECT COUNT(*) FROM scholar_semesters ss JOIN workflow_scope_versions owned ON owned.id=ss.scope_version_id WHERE ss.semester_id=w.semester_id AND owned.cohort_code=w.cohort_code) AS record_count,p.rules,p.source_reference,a.issuer,a.reference_text FROM workflow_scope_versions w JOIN workflow_policy_versions p ON p.id=w.policy_version_id JOIN workflow_authority_versions a ON a.id=p.authority_version_id JOIN semesters s ON s.id=w.semester_id WHERE w.cohort_code=? ORDER BY w.recorded_at DESC,w.revision DESC", [batch]);
      // Existing cohort approval is not shared approval. Offer settings for explicit review only.
      const [reusable] = batch === OFFICIAL_COHORT && period ? await db.execute<RowDataPacket[]>(`SELECT w.id,w.revision,w.semester_id,p.rules,p.source_reference,DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS starts
        FROM workflow_scope_versions w JOIN workflow_policy_versions p ON p.id=w.policy_version_id JOIN semesters s ON s.id=w.semester_id
        WHERE w.semester_id=? AND w.cohort_code<>? AND w.mode='enabled' AND JSON_UNQUOTE(JSON_EXTRACT(p.rules,'$.purpose'))='continuing_semester_documents'
        AND NOT EXISTS(SELECT 1 FROM workflow_scope_versions n WHERE n.semester_id=w.semester_id AND n.cohort_code=w.cohort_code AND n.revision>w.revision)
        ORDER BY w.recorded_at DESC,w.id`, [period.id, OFFICIAL_COHORT]) : [[]];
      const reusableSetups: ReusableSemesterSetup[] = reusable.map(s => {
        const rules = decode<ReusableSemesterSetup>(s.rules);
        return { id: s.id, revision: s.revision, semesterId: s.semester_id, sourceReference: s.source_reference, policyDate: policyDate(s.rules, s.starts), predecessorSemesterId: rules.predecessorSemesterId, corDefinitionVersionId: rules.corDefinitionVersionId, cogDefinitionVersionId: rules.cogDefinitionVersionId };
      });
      const coverageBySemester = new Map<string, CoverageOption>();
      for (const id of new Set<string>([...(selected ? [selected] : []), ...setups.map((s) => String(s.semester_id))])) coverageBySemester.set(id, await regularCoverageOption(db, id));
      return { reusableSetups, coverage: selected ? coverageBySemester.get(selected)! : null, periods: items, definitions: definitions.map((d) => ({ id: d.id, code: d.code, name: d.name, documentKind: d.documentKind })), setups: setups.map((s) => ({ ...decode<{ predecessorSemesterId: string; corDefinitionVersionId: string; cogDefinitionVersionId: string }>(s.rules), policyDate: policyDate(s.rules, s.starts), id: s.id, semesterId: s.semester_id, semesterName: s.name, revision: s.revision, mode: s.mode, recordCount: Number(s.record_count), current: !setups.some((other) => other.semester_id === s.semester_id && other.revision > s.revision), issuer: s.issuer, reference: s.reference_text, sourceReference: s.source_reference, coverage: coverageBySemester.get(s.semester_id)! })) };
    });
  }
  command(actor: string, rawBatch: string, rawKey: unknown, raw: unknown, requestId: string) {
    const batch = parseId(rawBatch), key = parseKey(rawKey), parsed = schema.safeParse(raw);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Review the semester, document coverage and authorization evidence.", validationDetails(parsed.error));
    const input = parsed.data, hash = digest(JSON.stringify({ operation: "semester.setup", batch, input }));
    return this.authorization.withPermission(actor, "semesters.configure", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [prior] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (prior[0]) { if (prior[0].payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This retry key belongs to another action."); return decode<{ id: string; mode: string }>(prior[0].result); }
      await acceptedRoster(db, batch);
      const [existing] = await db.execute<RowDataPacket[]>("SELECT id,revision FROM workflow_scope_versions WHERE semester_id=? AND cohort_code=? ORDER BY revision DESC FOR UPDATE", [input.semesterId, batch]);
      if (existing.length && !input.expectedScopeId) throw new AuthError(409, "SEMESTER_SETUP_EXISTS", "This roster already has a setup for that semester. Refresh to review it.");
      if (input.expectedScopeId && (!existing[0] || existing[0].id !== input.expectedScopeId || existing[0].revision !== input.expectedScopeRevision)) throw new AuthError(409, "VERSION_CONFLICT", "The setup changed. Review its latest revision.");
      const [periods] = await db.execute<RowDataPacket[]>("SELECT id,version,DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends FROM semesters WHERE id IN (?,?) LOCK IN SHARE MODE", [input.semesterId, input.predecessorSemesterId]);
      const period = periods.find((p) => p.id === input.semesterId), previous = periods.find((p) => p.id === input.predecessorSemesterId);
      if (!period || period.version !== input.expectedSemesterVersion) throw new AuthError(409, "SOURCE_CHANGED", "Semester configuration changed. Refresh the setup.");
      if (!previous || previous.ends >= period.starts || previous.id === period.id) throw new AuthError(409, "DOCUMENT_COVERAGE_CONFLICT", "Choose the preceding completed semester for COG coverage.");
      if (period.ends < today()) throw new AuthError(423, "PERIOD_UNAVAILABLE", "New setup is unavailable for an ended semester.");
      const regular = await requireRegularCoverage(db, period.id, previous.id);
      if (regular && input.expectedCoverageHash !== regular.sourceHash) throw new AuthError(409, "SOURCE_CHANGED", "Regular COG coverage changed. Reload and review the proposed semester.");
      const applicabilityDate = input.policyDate ?? today();
      validatePolicyDate(applicabilityDate, period.starts, period.ends);
      const definitions = await applicableRequirements(db, { semesterId: period.id, appliesTo: "semester", effectiveOn: applicabilityDate });
      if (input.corDefinitionVersionId === input.cogDefinitionVersionId || ![input.corDefinitionVersionId, input.cogDefinitionVersionId].every((id) => definitions.some((d) => d.id === id))) throw new AuthError(409, "REQUIREMENT_NOT_APPLICABLE", "Choose two distinct applicable document definitions for COR and COG.");
      if (definitions.find(d => d.id === input.corDefinitionVersionId)?.documentKind !== "enrollment" || definitions.find(d => d.id === input.cogDefinitionVersionId)?.documentKind !== "grades") throw new AuthError(409, "DOCUMENT_KIND_REVIEW_REQUIRED", "COR requires an enrollment policy and COG requires a grades policy. Ask the Administrator to classify unreviewed definitions through a policy revision.");
      let reusedFrom: { scopeId: string; revision: number } | undefined;
      if (input.reuseScopeId || input.reuseScopeRevision) {
        if (batch !== OFFICIAL_COHORT || !input.reuseScopeId || !input.reuseScopeRevision) throw new AuthError(422, "VALIDATION_FAILED", "Choose an existing setup to review for shared use.");
        const [[source]] = await db.execute<RowDataPacket[]>(`SELECT w.id,w.revision,w.mode FROM workflow_scope_versions w JOIN workflow_policy_versions p ON p.id=w.policy_version_id
          WHERE w.id=? AND w.semester_id=? AND w.cohort_code<>? AND JSON_UNQUOTE(JSON_EXTRACT(p.rules,'$.purpose'))='continuing_semester_documents'
          AND NOT EXISTS(SELECT 1 FROM workflow_scope_versions n WHERE n.semester_id=w.semester_id AND n.cohort_code=w.cohort_code AND n.revision>w.revision) FOR UPDATE`, [input.reuseScopeId,input.semesterId,OFFICIAL_COHORT]);
        if (!source || source.revision !== input.reuseScopeRevision || source.mode !== 'enabled') throw new AuthError(409, "SOURCE_CHANGED", "The source setup changed. Reload and review its settings again.");
        reusedFrom = { scopeId: source.id, revision: source.revision };
      }
      const authority = randomUUID(), policy = randomUUID(), id = randomUUID();
      if (!regular && !input.coverageReason) throw new AuthError(409, "PREDECESSOR_REVIEW_REQUIRED", "Record why this completed semester is the correct predecessor, or configure the calendar semester identities first.");
      const rules = { version: 2, documentKindsReviewed: true, ...(input.coverageReason ? { coverageReason: input.coverageReason } : {}), ...(reusedFrom ? { reusedFrom } : {}), setupRevision: (existing[0]?.revision ?? 0) + 1, policyDate: applicabilityDate, retainedScopeIds: existing.map(s => String(s.id)), purpose: "continuing_semester_documents", rosterBatchId: batch, predecessorSemesterId: previous.id, corDefinitionVersionId: input.corDefinitionVersionId, cogDefinitionVersionId: input.cogDefinitionVersionId, ...(regular ? { regularCoverage: regular } : {}) };
      await db.execute("INSERT INTO workflow_authority_versions(id,code,revision,issuer,reference_text,scope,valid_from,source_location,actor_id,recorded_at) VALUES(?,?,1,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [authority, `SS-${id}`, input.issuer, input.reference, JSON.stringify({ semesterId: period.id, rosterBatchId: batch, purpose: "semester_setup" }), today(), input.sourceReference, actor]);
      await db.execute("INSERT INTO workflow_policy_versions(id,code,revision,authority_version_id,source_reference,effective_from,rules,actor_id,recorded_at) VALUES(?,?,1,?,?,?,?,?,UTC_TIMESTAMP(6))", [policy, `SS-${id}`, authority, input.sourceReference, applicabilityDate, JSON.stringify(rules), actor]);
      await db.execute("INSERT INTO workflow_scope_versions(id,semester_id,cohort_code,revision,mode,policy_version_id,actor_id,recorded_at) VALUES(?,?,?,?,'disabled',?,?,UTC_TIMESTAMP(6))", [id, period.id, batch, (existing[0]?.revision ?? 0) + 1, policy, actor]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'semester.setup','workflow_scope',?,'configure',?,'user',UTC_TIMESTAMP(6),?,'Authorized semester setup recorded',?)", [randomUUID(), id, actor, requestId, JSON.stringify({ ...rules, semesterId: period.id, authorityId: authority, policyId: policy, mode: "disabled", idempotency_key: key })]);
      const result = { id, mode: "disabled" };
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,'semester.setup',?,?,UTC_TIMESTAMP(6))", [actor, key, hash, JSON.stringify(result)]);
      return result;
    });
  }
  transition(actor: string, rawBatch: string, rawKey: unknown, raw: unknown, requestId: string, recovery = false) {
    const batch = parseId(rawBatch), key = parseKey(rawKey);
    const parsed = z.object({
      scopeId: z.uuid(), expectedRevision: z.number().int().positive(), mode: z.enum(["enabled", "disabled"]),
      expectedSemesterVersion: z.number().int().positive(), expectedPredecessorVersion: z.number().int().positive(),
      expectedCoverageHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
      reviewed: z.literal(true), reason: z.string().trim().max(500).default(""), expectedRecordCount: z.number().int().positive().optional(),
    }).strict().safeParse(raw);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Review the current setup before changing its availability.", validationDetails(parsed.error));
    const input = parsed.data, operation = recovery ? "semester.scope.recover" : "semester.scope", hash = digest(JSON.stringify({ operation, batch, input }));
    if ((recovery && (input.mode !== "enabled" || input.reason.length < 5 || !input.expectedRecordCount)) || (!recovery && input.expectedRecordCount !== undefined)) throw new AuthError(422, "VALIDATION_FAILED", "Review affected records and provide a recovery reason.");
    if (input.mode === "disabled" && input.reason.length < 5) throw new AuthError(422, "VALIDATION_FAILED", "Give a reason for disabling the setup.");
    return this.authorization.withPermission(actor, "semesters.configure", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [commands] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (commands[0]) { if (commands[0].payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This retry key belongs to another action."); return decode<{ id: string; mode: string; revision: number }>(commands[0].result); }
      const [rows] = await db.execute<RowDataPacket[]>("SELECT w.*,p.rules,p.authority_version_id,p.source_reference,p.effective_from,p.effective_until,DATE_FORMAT(p.effective_from,'%Y-%m-%d') AS policy_from,DATE_FORMAT(p.effective_until,'%Y-%m-%d') AS policy_until,DATE_FORMAT(a.valid_from,'%Y-%m-%d') AS authority_from,DATE_FORMAT(a.valid_until,'%Y-%m-%d') AS authority_until,a.scope AS authority_scope FROM workflow_scope_versions w JOIN workflow_policy_versions p ON p.id=w.policy_version_id JOIN workflow_authority_versions a ON a.id=p.authority_version_id WHERE w.id=? AND w.cohort_code=? FOR UPDATE", [input.scopeId, batch]);
      const scope = rows[0];
      if (!scope) throw new AuthError(404, "SEMESTER_SETUP_NOT_FOUND", "Semester setup not found for this roster.");
      if (recovery && scope.mode !== "disabled") throw new AuthError(409, "INVALID_STATE_TRANSITION", "Recovery requires a disabled setup.");
      const [latest] = await db.execute<RowDataPacket[]>("SELECT id FROM workflow_scope_versions WHERE semester_id=? AND cohort_code=? ORDER BY revision DESC LIMIT 1 FOR UPDATE", [scope.semester_id, batch]);
      if (latest[0].id !== scope.id || scope.revision !== input.expectedRevision) throw new AuthError(409, "VERSION_CONFLICT", "The semester setup changed. Reload it.");
      if (scope.mode === input.mode) throw new AuthError(409, "INVALID_STATE_TRANSITION", "This setup already has that availability.");
      const rules = decode<{ purpose: string; rosterBatchId: string; predecessorSemesterId: string; corDefinitionVersionId: string; cogDefinitionVersionId: string }>(scope.rules);
      let recovered: { scopeIds: string[]; recordCount: number } | null = null;
      if (input.mode === "enabled") {
        await acceptedRoster(db, batch);
        const authority = decode<{ semesterId: string; rosterBatchId: string; purpose: string }>(scope.authority_scope);
        if (rules.purpose !== "continuing_semester_documents" || rules.rosterBatchId !== batch || authority.purpose !== "semester_setup" || authority.rosterBatchId !== batch || authority.semesterId !== scope.semester_id || scope.authority_from > today() || (scope.authority_until && scope.authority_until < today())) throw new AuthError(409, "SETUP_AUTHORITY_INVALID", "The recorded authority does not cover this semester setup.");
        const [periods] = await db.execute<RowDataPacket[]>("SELECT id,version,DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends FROM semesters WHERE id IN (?,?) LOCK IN SHARE MODE", [scope.semester_id, rules.predecessorSemesterId]);
        const period = periods.find((p) => p.id === scope.semester_id), previous = periods.find((p) => p.id === rules.predecessorSemesterId);
        if (!period || !previous || period.version !== input.expectedSemesterVersion || previous.version !== input.expectedPredecessorVersion) throw new AuthError(409, "SOURCE_CHANGED", "Semester configuration changed. Reload and review coverage.");
        if (period.starts > today() || period.ends < today()) throw new AuthError(423, "PERIOD_UNAVAILABLE", "Enable receiving only during its current semester.");
        if (previous.ends >= period.starts || scope.policy_from !== policyDate(scope.rules, period.starts) || (scope.policy_until && scope.policy_until <= today())) throw new AuthError(409, "DOCUMENT_COVERAGE_CONFLICT", "Semester dates or document coverage no longer match this setup.");
        const regular = await requireRegularCoverage(db, period.id, previous.id);
        if (regular && input.expectedCoverageHash !== regular.sourceHash) throw new AuthError(409, "SOURCE_CHANGED", "Regular COG coverage changed. Reload and review the setup.");
        await pinnedSemesterDefinitions(db, period.id, scope.rules, period.starts, period.ends);
        const [used] = await db.execute<RowDataPacket[]>("SELECT ss.id FROM scholar_semesters ss JOIN workflow_scope_versions w ON w.id=ss.scope_version_id WHERE w.semester_id=? AND w.cohort_code=? LIMIT 1 FOR UPDATE", [scope.semester_id, batch]);
        if (recovery) recovered = await validateRecovery(db, scope, rules, period.version, input.expectedRecordCount);
        else if (used.length && decode<{ setupRevision?: number }>(scope.rules).setupRevision !== scope.revision) throw new AuthError(409, "SEMESTER_REACTIVATION_REVIEW_REQUIRED", "Existing semester records require a controlled recovery review before reactivation.");
      }
      const id = randomUUID(), revision = scope.revision + 1, reason = input.reason || "Authorized semester setup enabled";
      let policyId = scope.policy_version_id;
      if (recovered) {
        policyId = randomUUID();
        const restoredRules = { ...decode<Record<string, unknown>>(scope.rules), recovery: { kind: "resume_same_policy", sourcePolicyId: scope.policy_version_id, previousScopeId: scope.id, ...recovered } };
        await db.execute("INSERT INTO workflow_policy_versions(id,code,revision,authority_version_id,source_reference,effective_from,effective_until,rules,actor_id,recorded_at) VALUES(?,?,1,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [policyId, `REC-${id}`, scope.authority_version_id, scope.source_reference, scope.effective_from, scope.effective_until, JSON.stringify(restoredRules), actor]);
      }
      await db.execute("INSERT INTO workflow_scope_versions(id,semester_id,cohort_code,revision,mode,policy_version_id,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [id, scope.semester_id, batch, revision, input.mode, policyId, actor]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'workflow_scope',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), operation, id, input.mode, actor, requestId, reason, JSON.stringify({ recovery: recovered, previousScopeId: scope.id, revision, mode: input.mode, policyId, rosterBatchId: batch, expectedSemesterVersion: input.expectedSemesterVersion, expectedPredecessorVersion: input.expectedPredecessorVersion, idempotency_key: key })]);
      const result = { id, revision, mode: input.mode };
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [actor, key, operation, hash, JSON.stringify(result)]);
      return result;
    });
  }
}
