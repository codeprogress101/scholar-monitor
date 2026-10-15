import { classifyPlaceholders } from "./unused-placeholders.js";
import { scopeAcceptsOwner } from "../continuing/scope-access.js";
import { participation, receivingScopes, available, provisionSemesterRecords } from "../continuing/semester-receiving.js";
import { documentPolicy, pinnedSemesterDefinitions } from "./semester-policy.js";
import { verificationMatches } from "./workflow-model.js";
import { reusedSources } from "./reused-source.js";
import { randomUUID } from "node:crypto";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { AuthorizationService } from "../authorization/service.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { requirementState } from "./workflow-state.js";
import { requirementVerificationContext, savedVerificationContext } from "./workflow-service.js";

export type SharedDocument = { id: string; name: string; definitionKind: string | null; definitionVersionId: string; kind: string | null; coverageSemesterId: string | null; coverageName: string | null; cycleId: string | null; version: number; status: string; contextHash: string; history: Awaited<ReturnType<typeof requirementState>>["history"] };
export type SourceOption = { kind: "cor" | "cog"; coverageSemesterId: string; coverageName: string; definitionVersionId: string };
export type SourceCheck = { id: string; kind: "cor" | "cog" | null; automatic: boolean; issues: string[] };
export type SharedDocumentReview = { unusedPlaceholderIds: string[]; options: SourceOption[]; checks: SourceCheck[]; setupIssue: string | null; ownerId: string | null; sourceHash: string; documents: SharedDocument[]; legacy: SharedDocument[]; links: { id: string; legacyId: string; sourceId: string; revision: number; valid: boolean; reused?: boolean }[]; unresolved: string[] };

/** Exact, explicit ownership and coverage only; names never classify documents. */
export async function sharedDocumentReview(db: PoolConnection, scholar: string, semester: string): Promise<SharedDocumentReview> {
  const [[owner]] = await db.execute<RowDataPacket[]>(`SELECT ss.id,ss.scope_version_id,p.rules,s.name,
    DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(s.ends_on,'%Y-%m-%d') AS ends
    FROM scholar_semesters ss JOIN workflow_scope_versions w ON w.id=ss.scope_version_id
    JOIN workflow_policy_versions p ON p.id=w.policy_version_id JOIN semesters s ON s.id=ss.semester_id
    WHERE ss.scholar_id=? AND ss.semester_id=? LOCK IN SHARE MODE`, [scholar, semester]);
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT i.id,i.definition_version_id,v.name,v.document_kind AS definition_kind,c.scholar_semester_id,c.payout_cycle_id,
    cov.document_kind,cov.coverage_semester_id,cov.id AS coverage_id,covered.name AS coverage_name
    FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id
    JOIN requirement_definition_versions v ON v.id=i.definition_version_id
    LEFT JOIN scholarship_records a ON a.id=c.scholarship_record_id
    LEFT JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id
    LEFT JOIN requirement_coverage cov ON cov.requirement_instance_id=i.id AND NOT EXISTS(SELECT 1 FROM requirement_coverage newer WHERE newer.requirement_instance_id=cov.requirement_instance_id AND newer.revision>cov.revision)
    LEFT JOIN semesters covered ON covered.id=cov.coverage_semester_id
    WHERE c.semester_id=? AND (a.scholar_id=? OR ss.scholar_id=?) ORDER BY i.id LOCK IN SHARE MODE`, [semester, scholar, scholar]);
  const documents: SharedDocument[] = [], legacy: SharedDocument[] = [];
  for (const r of rows) {
    const state = await requirementState(db, r.id);
    let contextHash: string;
    try { contextHash = digest(JSON.stringify(await savedVerificationContext(db, r.id))); }
    catch (e) { if (!(e instanceof AuthError)) throw e; contextHash = digest(JSON.stringify({code:e.code,message:e.message})); }
    const d: SharedDocument = { definitionKind: r.definition_kind ?? null, coverageName: r.coverage_name ?? null, contextHash, id: r.id, name: r.name, definitionVersionId: r.definition_version_id, kind: r.document_kind ?? null, coverageSemesterId: r.coverage_semester_id ?? null, cycleId: r.payout_cycle_id ?? null, version: state.version, status: state.status, history: state.history };
    (r.scholar_semester_id === owner?.id ? documents : legacy).push(d);
  }
  const [records] = owner ? await db.execute<RowDataPacket[]>("SELECT * FROM semester_document_reconciliations r WHERE scholar_semester_id=? AND NOT EXISTS(SELECT 1 FROM semester_document_reconciliations n WHERE n.legacy_instance_id=r.legacy_instance_id AND n.revision>r.revision) ORDER BY legacy_instance_id LOCK IN SHARE MODE", [owner.id]) : [[]];
  const links = records.map(r => {
    const evidence = typeof r.evidence === "string" ? JSON.parse(r.evidence) : r.evidence;
    const old = legacy.find(d => d.id === r.legacy_instance_id), source = documents.find(d => d.id === r.source_instance_id);
    if (evidence.disposition === "reuse") {
      const target = documents.find(d => d.id === evidence.targetId);
      return { id: String(r.id), legacyId: String(r.legacy_instance_id), sourceId: String(r.source_instance_id), revision: Number(r.revision), reused: true,
        valid: !!old && !!target && old.kind === evidence.kind && old.coverageSemesterId === evidence.coverageSemesterId && target.definitionVersionId === evidence.targetDefinitionVersionId && target.kind === old.kind && target.coverageSemesterId === old.coverageSemesterId };
    }
    return { id: String(r.id), legacyId: String(r.legacy_instance_id), sourceId: String(r.source_instance_id), revision: Number(r.revision), valid: !!old && old.version === evidence.legacyVersion && (evidence.disposition === "separate" || (!!source && source.definitionVersionId === evidence.sourceDefinitionVersionId && source.kind === evidence.kind && source.coverageSemesterId === evidence.coverageSemesterId)) };
  });
  // Legacy obligations with unrelated definitions remain separate until explicitly reviewed.
  let unresolved = legacy.filter(d => !links.some(l => l.legacyId === d.id && l.valid)).map(d => d.id);
  let unusedPlaceholderIds: string[] = [];
  let options: SourceOption[] = [], setupIssue: string | null = null, setupHash: string | null = null;
  let classificationIssue: string | null = null;
  let classificationReasons: Record<string, string> = {};
  // Classify existing evidence against its immutable owner even when receiving is disabled.
  const classify = async (source: RowDataPacket) => {
    const rules = documentPolicy(source.rules);
    const classification = await classifyPlaceholders(db, scholar, semester, source.rules);
    unusedPlaceholderIds = classification.ids;
    classificationIssue = classification.issue;
    classificationReasons = classification.reviewReasons;
    unresolved = unresolved.filter(id => !unusedPlaceholderIds.includes(id));
    if (!rules || ![rules.predecessorSemesterId, rules.corDefinitionVersionId, rules.cogDefinitionVersionId].every(id => typeof id === "string" && id.length > 0)) {
      setupIssue = "The pinned semester document policy is incomplete. Review its approved setup.";
      return;
    }
    const [[previous]] = await db.execute<RowDataPacket[]>("SELECT name FROM semesters WHERE id=?", [rules.predecessorSemesterId]);
    options = [{ kind: "cor", coverageSemesterId: semester, coverageName: source.name, definitionVersionId: rules.corDefinitionVersionId }, { kind: "cog", coverageSemesterId: rules.predecessorSemesterId, coverageName: previous?.name ?? "Unavailable", definitionVersionId: rules.cogDefinitionVersionId }];
  };
  if (owner) await classify(owner);
  try {
    const person = await participation(db, scholar), scope = (await receivingScopes(db, scholar, person.batch_id)).find(s => s.semester_id === semester);
    if (!scope || !available(scope, !owner)) throw new AuthError(409, "SETUP_REQUIRED", "Enable the approved semester document setup first.");
    if (owner && !scopeAcceptsOwner(scope, owner.scope_version_id)) throw new AuthError(409, "SEMESTER_REVIEW_REQUIRED", "Existing semester records need review under the current setup.");
    const source = owner ?? scope;
    const policy = documentPolicy(source.rules);
    if (!policy || ![policy.predecessorSemesterId, policy.corDefinitionVersionId, policy.cogDefinitionVersionId].every(id => typeof id === "string" && id.length > 0)) throw new AuthError(409, "SEMESTER_REVIEW_REQUIRED", "The pinned semester document policy is incomplete. Review its approved setup.");
    await pinnedSemesterDefinitions(db, semester, source.rules, source.starts, source.ends);
    setupHash = digest(JSON.stringify(scope));
    if (!owner) await classify(scope);
  } catch (e) { if (!(e instanceof AuthError)) throw e; setupIssue = e.message; }
  const checks: SourceCheck[] = legacy.filter(d => !unusedPlaceholderIds.includes(d.id)).map(d => {
    const option = options.find(o => o.kind === d.kind);
    const issues: string[] = [];
    if (classificationIssue) issues.push(classificationIssue);
    if (classificationReasons[d.id]) issues.push(classificationReasons[d.id]);
    if (!d.kind) issues.push("Document kind not recorded.");
    if (!d.coverageSemesterId) issues.push("Coverage not recorded.");
    if (option && d.coverageSemesterId && option.coverageSemesterId !== d.coverageSemesterId) issues.push("Coverage conflicts with the approved setup.");
    if (!option || option.definitionVersionId !== d.definitionVersionId) issues.push("Policy compatibility requires review.");
    if (legacy.filter(v => v.kind === d.kind && v.kind).length > 1) issues.push("Multiple sources for this document kind.");
    if (["waived", "rejected", "for_correction"].includes(d.status)) issues.push("Existing exception or correction requires review.");
    const target = documents.find(t => t.kind === d.kind);
    if (target && target.status !== "not_submitted") issues.push("The semester record already has evidence.");
    if (d.status === "verified") {
      const v = d.history.at(-1)?.details.verification;
      if (!v || v.documentKind !== d.kind || v.semesterId !== d.coverageSemesterId || v.receivingSemesterId !== semester) issues.push("Verification does not establish explicit coverage.");
    }
    if (setupIssue) issues.push(setupIssue);
    return { id: d.id, kind: d.kind === "cor" || d.kind === "cog" ? d.kind : null, automatic: !issues.length, issues };
  });
  return { unusedPlaceholderIds, options, checks, setupIssue, ownerId: owner?.id ?? null, sourceHash: digest(JSON.stringify({ owner, rows, documents, legacy, links, options, unusedPlaceholderIds, setupIssue, setupHash })), documents, legacy, links, unresolved };
}

export class SharedSemesterDocumentsService {
  private authorization: AuthorizationService;
  constructor(pool: Pool | undefined) { this.authorization = new AuthorizationService(pool); }
  read(actor: string, rawScholar: string, rawSemester: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester);
    return this.authorization.withPermission(actor, "scholars.read", db => sharedDocumentReview(db, scholar, semester));
  }
  reconcile(actor: string, rawScholar: string, rawSemester: string, rawKey: unknown, raw: unknown, requestId: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester), key = parseKey(rawKey);
    const parsed = z.object({ sourceHash: z.string().regex(/^[a-f0-9]{64}$/), legacyId: z.uuid(), sourceId: z.uuid(), expectedRevision: z.number().int().nonnegative(), reviewed: z.literal(true), reason: z.string().trim().min(5).max(500), reference: z.string().trim().min(3).max(300) }).strict().safeParse(raw);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Review both histories, document coverage and authority evidence.");
    const input = parsed.data, operation = "semester.documents.reconcile", hash = digest(JSON.stringify({ operation, scholar, semester, input }));
    return this.authorization.withPermission(actor, "semesters.configure", async db => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [[prior]] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (prior) { if (prior.payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This key belongs to another action."); return typeof prior.result === "string" ? JSON.parse(prior.result) : prior.result; }
      const review = await sharedDocumentReview(db, scholar, semester);
      if (review.sourceHash !== input.sourceHash) throw new AuthError(409, "SOURCE_CHANGED", "Document evidence changed. Review both histories again.");
      if (review.unusedPlaceholderIds.includes(input.legacyId)) throw new AuthError(409, "DOCUMENT_SOURCE_REPLACED", "No document evidence is recorded. Receive through the current semester checklist.");
      if (review.links.some(l => l.legacyId === input.legacyId && l.reused)) throw new AuthError(409, "SOURCE_ALREADY_REUSED", "This original document is already in use. Use its correction workflow.");
      const separate = input.sourceId === input.legacyId;
      const old = review.legacy.find(d => d.id === input.legacyId), source = separate ? review.legacy.find(d => d.id === input.legacyId) : review.documents.find(d => d.id === input.sourceId), previous = review.links.find(l => l.legacyId === input.legacyId);
      if (!review.ownerId || !old || !source || (!separate && (!source.kind || !source.coverageSemesterId))) throw new AuthError(409, "DOCUMENT_COVERAGE_REQUIRED", "Select a prepared semester document with explicit coverage. Legacy records without coverage cannot be selected as the authoritative source.");
      if (!separate && ((old.kind && old.kind !== source.kind) || (old.coverageSemesterId && old.coverageSemesterId !== source.coverageSemesterId))) throw new AuthError(409, "DOCUMENT_COVERAGE_CONFLICT", "These records have different recorded document kinds or coverage. Review the approved setup and original evidence before selecting a source.");
      if ((previous?.revision ?? 0) !== input.expectedRevision) throw new AuthError(409, "VERSION_CONFLICT", "Reconciliation changed. Refresh its history.");
      // Reconciliation never supplies missing verification, placement or coverage.
      if (!separate) await requirementVerificationContext(db, source.id);
      const [[period]] = await db.execute<RowDataPacket[]>("SELECT s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=?", [semester]);
      if (!period || period.locked_at || period.archived_at || period.year_locked || period.year_archived) throw new AuthError(423, "PERIOD_UNAVAILABLE", "This semester is read only.");
      const id = randomUUID(), revision = input.expectedRevision + 1;
      const evidence = { disposition: separate ? "separate" : "shared", scholarId: scholar, semesterId: semester, sourceDefinitionVersionId: source.definitionVersionId, legacyDefinitionVersionId: old.definitionVersionId, legacyVersion: old.version, sourceVersion: source.version, kind: source.kind, coverageSemesterId: source.coverageSemesterId, oldHistory: old.history, sourceHistory: source.history };
      await db.execute("INSERT INTO semester_document_reconciliations(id,scholar_semester_id,legacy_instance_id,source_instance_id,revision,source_hash,evidence,reason,reference_text,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [id, review.ownerId, old.id, source.id, revision, review.sourceHash, JSON.stringify(evidence), input.reason, input.reference, actor]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'scholar_semester',?,'reconcile',?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), operation, review.ownerId, actor, requestId, input.reason, JSON.stringify({ ...evidence, id, revision, reference: input.reference, idempotency_key: key })]);
      const result = { id, revision };
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [actor, key, operation, hash, JSON.stringify(result)]);
      return result;
    });
  }
  reuse(actor: string, rawScholar: string, rawSemester: string, rawKey: unknown, raw: unknown, requestId: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester), key = parseKey(rawKey);
    const input = z.discriminatedUnion("mode", [
      z.object({ mode: z.literal("automatic"), sourceHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
      z.object({ mode: z.literal("reviewed"), sourceHash: z.string().regex(/^[a-f0-9]{64}$/), legacyId: z.uuid(), kind: z.enum(["cor", "cog"]), reviewed: z.literal(true), reason: z.string().trim().min(5).max(500), reference: z.string().trim().min(3).max(300) }).strict(),
    ]).safeParse(raw);
    if (!input.success) throw new AuthError(422, "VALIDATION_FAILED", "Review the document kind, coverage and policy compatibility.");
    const operation = "semester.documents.reuse", hash = digest(JSON.stringify({ scholar, semester, input: input.data }));
    return this.authorization.withPermission(actor, "semesters.configure", async (db, access) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [[prior]] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (prior) { if (prior.payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "Retry the original request unchanged."); return typeof prior.result === "string" ? JSON.parse(prior.result) : prior.result; }
      let review = await sharedDocumentReview(db, scholar, semester);
      if (review.sourceHash !== input.data.sourceHash) throw new AuthError(409, "SOURCE_CHANGED", "Evidence changed. Refresh the document sources.");
      if (review.setupIssue) throw new AuthError(409, "SETUP_REQUIRED", review.setupIssue);
      const [[frozen]] = await db.execute<RowDataPacket[]>(`SELECT id FROM semester_entitlements WHERE scholar_id=? AND semester_id=? LIMIT 1`, [scholar, semester]);
      const [[legacyFrozen]] = await db.execute<RowDataPacket[]>(`SELECT e.batch_id FROM ovr_entries e JOIN scholarship_records r ON r.id=e.scholarship_id JOIN ovr_batches b ON b.id=e.batch_id JOIN payout_cycles c ON c.id=b.cycle_id WHERE r.scholar_id=? AND c.semester_id=? AND (EXISTS(SELECT 1 FROM ovr_finalizations f WHERE f.batch_id=b.id) OR EXISTS(SELECT 1 FROM payment_records p WHERE p.batch_id=b.id AND p.scholarship_id=r.id)) LIMIT 1`, [scholar, semester]);
      if (frozen || legacyFrozen) throw new AuthError(409, "FROZEN_EVIDENCE", "Frozen payroll evidence exists. Use controlled reconciliation; this action cannot replace its sources.");
      const command = input.data;
      if (command.mode === "reviewed" && review.unusedPlaceholderIds.includes(command.legacyId))
        throw new AuthError(409, "DOCUMENT_SOURCE_REPLACED", "No document evidence is recorded. Receive through the current semester checklist.");
      const selected = command.mode === "automatic" ? review.checks.filter(c => c.automatic && review.unresolved.includes(c.id)).map(c => ({ id: c.id, kind: c.kind! })) : [{ id: command.legacyId, kind: command.kind }];
      if (!selected.length) throw new AuthError(409, "NO_EXACT_MATCH", "No complete, unambiguous matches. Review the listed missing or conflicting evidence.");
      // Provision inside this same transaction. No separate browser write, no partial result.
      if (!review.ownerId) {
        if (!access.permissions.some(p => p.code === "requirements.generate")) throw new AuthError(403, "PERMISSION_DENIED", "Semester preparation permission is required.");
        await provisionSemesterRecords(db, access, actor, scholar, randomUUID(), { periodId: semester, legacyReviewHash: review.sourceHash }, requestId);
        review = await sharedDocumentReview(db, scholar, semester);
      }
      const result: { reused: string[] } = { reused: [] };
      for (const selection of selected) {
        const old = review.legacy.find(d => d.id === selection.id), option = review.options.find(o => o.kind === selection.kind), target = review.documents.find(d => d.kind === selection.kind);
        if (!old || !option || !target || !review.ownerId) throw new AuthError(409, "SOURCE_CHANGED", "The approved source is unavailable.");
        if (review.links.some(l => (l.legacyId === old.id && l.reused) || (l.valid && l.sourceId === target.id && l.legacyId !== old.id)) || (await reusedSources(db, review.ownerId)).some(b => b.targetId === target.id)) throw new AuthError(409, "SOURCE_ALREADY_REUSED", "This document already has an original source.");
        if (target.status !== "not_submitted" || target.history.length) throw new AuthError(409, "SOURCE_HAS_EVIDENCE", "Both records contain evidence. Review both histories through controlled reconciliation.");
        if (old.definitionKind && old.definitionKind !== (selection.kind === "cor" ? "enrollment" : "grades")) throw new AuthError(409, "DOCUMENT_KIND_CONFLICT", "This policy defines a different document kind. Select the matching original document.");
        if ((old.kind && old.kind !== selection.kind) || (old.coverageSemesterId && old.coverageSemesterId !== option.coverageSemesterId)) throw new AuthError(409, "DOCUMENT_COVERAGE_CONFLICT", "Recorded coverage conflicts with the approved setup. No evidence was changed.");
        const [[coverage]] = await db.execute<RowDataPacket[]>("SELECT * FROM requirement_coverage WHERE requirement_instance_id=? ORDER BY revision DESC LIMIT 1 FOR UPDATE", [old.id]);
        if (!coverage) await db.execute("INSERT INTO requirement_coverage(id,scholar_semester_id,requirement_instance_id,revision,document_kind,coverage_semester_id,actor_id,recorded_at) VALUES(?,?,?,1,?,?,?,UTC_TIMESTAMP(6))", [randomUUID(), review.ownerId, old.id, selection.kind, option.coverageSemesterId, actor]);
        else if (coverage.scholar_semester_id !== review.ownerId) throw new AuthError(409, "DOCUMENT_OWNER_CONFLICT", "Existing coverage belongs to another semester owner.");
        const revision = (review.links.find(l => l.legacyId === old.id)?.revision ?? 0) + 1, id = randomUUID();
        const reason = command.mode === "reviewed" ? command.reason : "Exact recorded identity, coverage and policy match", reference = command.mode === "reviewed" ? command.reference : "Automatic evidence check";
        const evidence = { disposition: "reuse", mode: command.mode, targetId: target.id, targetDefinitionVersionId: target.definitionVersionId, kind: selection.kind, coverageSemesterId: option.coverageSemesterId, legacyVersion: old.version, originalContextHash: old.contextHash, originalHistory: old.history, policyCompatibilityReviewed: command.mode === "reviewed" };
        await db.execute("INSERT INTO semester_document_reconciliations(id,scholar_semester_id,legacy_instance_id,source_instance_id,revision,source_hash,evidence,reason,reference_text,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [id, review.ownerId, old.id, old.id, revision, review.sourceHash, JSON.stringify(evidence), reason, reference, actor]);
        // Changes in context leave the old Verified history intact but unusable for
        // eligibility until reverified. Automatic reuse may never degrade evidence silently.
        if (command.mode === "automatic") {
          const context = await requirementVerificationContext(db, old.id);
          if (old.status === "verified" && !verificationMatches(context, old.history.at(-1)?.details.verification)) throw new AuthError(409, "VERIFICATION_REVIEW_REQUIRED", "Recorded verification is not sufficient for this coverage. Review the original document.");
        }
        await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'requirement_instance',?,'reuse',?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), operation, old.id, actor, requestId, reason, JSON.stringify({ ...evidence, reference, revision, idempotency_key: key })]);
        result.reused.push(old.id);
      }
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [actor, key, operation, hash, JSON.stringify(result)]);
      return result;
    });
  }

}
