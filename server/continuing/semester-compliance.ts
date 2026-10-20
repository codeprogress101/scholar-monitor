import { effectiveSemesterInstances } from "../requirements/reused-source.js";
import { priorApprovalForOwner, type PriorApproval } from "../requirements/prior-approval-source.js";
import { sharedDocumentReview } from "../requirements/shared-semester-documents.js";
import { policyDate } from "../requirements/semester-policy.js";
import { randomUUID } from "node:crypto";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { today } from "../scholars/validation.js";
import { available, scopeRows } from "./semester-receiving.js";
import { scopeAcceptsOwner } from "./scope-access.js";
import { unresolvedFindings, type RecordingCorrection, type CorrectionTarget } from "./finding-corrections.js";
import { gradingPeriodApplies } from "./compliance-period.js";
import { currentGradingPolicy, gradingHistory, gradingReplacementImpact, gradingRecoveryImpact, type GradingPolicyHistory } from "./grading-policy.js";
import { requirementState } from "../requirements/workflow-state.js";
import { requirementVerificationContext } from "../requirements/workflow-service.js";
import type { VerificationContext } from "../requirements/workflow-model.js";
import { assessAcademicCompliance, canClearIncomplete, emptyFindings, gradePattern, nativeGradingRule, validRule, type AcademicFindings, type ComplianceResult, type GradingRule } from "./compliance-engine.js";

const decode = <T>(v: T | string): T => typeof v === "string" ? JSON.parse(v) as T : v;
const text = (min: number, max: number) => z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
const decimal = z.string().regex(gradePattern);
const findingsSchema = z.object({ average: decimal.nullable(), enrolled: z.boolean().nullable(), fullLoad: z.boolean().nullable(), hasFailed: z.boolean().nullable(), hasDropped: z.boolean().nullable(), hasIncomplete: z.boolean().nullable() }).strict();
const ruleSchema = z.object({ label: text(3, 150), direction: z.enum(["lower", "higher"]), minimum: decimal, maximum: decimal, threshold: decimal, precision: z.number().int().min(0).max(4) }).strict().refine(validRule);
type DocumentSource = { id: string; version: number; eventId: string | null; coverageId: string | null; kind: string | null; status: string; verified: boolean; notRequired?: boolean; context: VerificationContext | null; issue: string | null };
type Policy = { id: string; rule: GradingRule; reference: string; authorityReference: string; schoolId: string };
type Review = { id: string; revision: number; result: ComplianceResult; findings: AcademicFindings; sourceHash: string; supersedesId: string | null; actorName: string; recordedAt: string; reason: string | null; blockers: string[]; documents: DocumentSource[]; gradingRule: Policy | null; academicOnly: boolean; correction: RecordingCorrection | null };
export type SemesterComplianceView = {
  priorApproval?: PriorApproval | null;
  sourceHash: string; revision: number; category: "unknown" | "degree" | "non_degree";
  documents: DocumentSource[]; gradingRule: Policy | null; gradingSchool: { id: string; name: string } | null;
  result: ComplianceResult; blockers: string[]; writeBlocker: string | null; stale: boolean; history: Review[];
  gradingHistory: GradingPolicyHistory[];
  ended: boolean;
  allocated: boolean;
  allocationReviewBlocker: string | null;
  endedReviewBlocker: string | null;
  correctionBlocker: string | null;
  unresolvedFindings: CorrectionTarget[];
};

export async function loadSemesterCompliance(db: PoolConnection, scholar: string, semester: string, retainedRelease = false) {
  const [owners] = await db.execute<RowDataPacket[]>("SELECT ss.*,w.cohort_code,(SELECT action FROM participation_events WHERE participation_id=ss.participation_id ORDER BY revision DESC LIMIT 1) AS participation_action FROM scholar_semesters ss JOIN workflow_scope_versions w ON w.id=ss.scope_version_id WHERE ss.scholar_id=? AND ss.semester_id=? FOR UPDATE", [scholar, semester]);
  const owner = owners[0];
  if (!owner) throw new AuthError(404, "SEMESTER_NOT_PREPARED", "Open semester receiving first.");
  const scope = (await scopeRows(db, owner.cohort_code)).find((s) => s.semester_id === semester);
  const [revisions] = await db.execute<RowDataPacket[]>("SELECT * FROM scholar_semester_revisions WHERE scholar_semester_id=? ORDER BY revision DESC LIMIT 1 FOR UPDATE", [owner.id]);
  const latest = revisions[0];
  if (!scope || !latest) throw new AuthError(409, "SEMESTER_REVIEW_REQUIRED", "Semester ownership and academic context need review.");
  const placement = decode<{ version?: number; placement?: { schoolId: string; courseId: string } }>(latest.placement_snapshot);
  const instances = await effectiveSemesterInstances(db, owner.id);
  const documents: DocumentSource[] = [];
  for (const instance of instances) {
    const [coverages] = await db.execute<RowDataPacket[]>("SELECT id,document_kind FROM requirement_coverage WHERE scholar_semester_id=? AND requirement_instance_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE", [owner.id, instance.id]);
    const state = await requirementState(db, instance.id);
    let context: VerificationContext | null = null, issue: string | null = null;
    try { context = await requirementVerificationContext(db, instance.id, retainedRelease); }
    catch (e) { if (!(e instanceof AuthError)) throw e; issue = e.message; }
    const verification = state.history.at(-1)?.details.verification;
    // An added calendar check must not invent a new physical receipt. Preserve an
    // older exact document verification when current coverage is still valid;
    // the calendar evidence remains in sourceHash and makes the academic review stale.
    const verified = state.status === "verified" && (Boolean(state.priorApproval?.valid) || Boolean(context && verification && Object.entries(context).every(([k, value]) =>
      (k === "predecessorSourceHash" && verification.predecessorSourceHash === undefined) || JSON.stringify(value) === JSON.stringify(verification[k as keyof VerificationContext]))));
    if(state.priorApproval?.valid)issue=null;
    if (state.status === "verified" && !verified && !issue) issue = "Document verification is stale. Recheck its identity, placement and coverage.";
    documents.push({ id: instance.id, version: state.version, eventId: state.latestEventId, coverageId: coverages[0]?.id ?? null, kind: coverages[0]?.document_kind ?? null, status: state.status, verified, notRequired:context?.entrantCard?.mode==='initial_requirements', context, issue });
  }
  const cor = documents.find((d) => d.kind === "cor"), cog = documents.find((d) => d.kind === "cog");
  const school = cog?.context?.schoolId ? { id: cog.context.schoolId, name: cog.context.schoolName } : null;
  const [policies] = school ? await db.execute<RowDataPacket[]>(`SELECT p.id,p.code,p.revision,p.rules,p.source_reference,a.reference_text,a.issuer,DATE_FORMAT(p.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded,DATE_FORMAT(p.effective_from,'%Y-%m-%d') AS starts,DATE_FORMAT(p.effective_until,'%Y-%m-%d') AS ends,DATE_FORMAT(a.valid_from,'%Y-%m-%d') AS authority_from,DATE_FORMAT(a.valid_until,'%Y-%m-%d') AS authority_until
    FROM workflow_policy_versions p JOIN workflow_authority_versions a ON a.id=p.authority_version_id
    WHERE JSON_UNQUOTE(JSON_EXTRACT(p.rules,'$.purpose'))='semester_academic_grading'
    AND JSON_UNQUOTE(JSON_EXTRACT(p.rules,'$.semesterId'))=? AND JSON_UNQUOTE(JSON_EXTRACT(p.rules,'$.rosterBatchId'))=?
    AND JSON_UNQUOTE(JSON_EXTRACT(p.rules,'$.schoolId'))=? ORDER BY p.id LOCK IN SHARE MODE`, [semester, owner.cohort_code, school.id]) : [[]];
  const row = currentGradingPolicy(policies as (RowDataPacket & { id: string; code: string; revision: number; rules: unknown })[]);
  const rule = row ? decode<{ rule: GradingRule }>(row.rules as string).rule : null;
  const policy: Policy | null = row && rule && validRule(rule) && gradingPeriodApplies({ starts: row.starts, ends: row.ends }, { starts: scope.starts, ends: scope.ends }, today()) && row.authority_from <= today() && (!row.authority_until || row.authority_until >= today())
    ? { id: row.id, rule, reference: row.source_reference, authorityReference: row.reference_text, schoolId: school!.id } : null;
  const sharedDocuments = await sharedDocumentReview(db, scholar, semester);
  const issues: string[] = [];
  const initialAdmissionApproved = Boolean(cog?.notRequired && cog.context?.entrantCard?.admissionAssessmentReference);
  if(cog?.notRequired && !initialAdmissionApproved) issues.push('Review and link the approved initial admission assessment in the first-semester exception.');
  else if(!cog?.notRequired && cog?.context?.entrantCard) issues.push("Senior-high-school grading card accepted as document evidence. A supported entrant academic assessment policy is required; college grading rules cannot be applied automatically.");
  if (!retainedRelease && sharedDocuments.unresolved.length) issues.push("Needs reconciliation: review existing semester and payout document histories before using shared evidence.");
  const [checklists] = await db.execute<RowDataPacket[]>("SELECT semester_version FROM requirement_checklists WHERE scholar_semester_id=? LOCK IN SHARE MODE", [owner.id]);
  if (checklists.length !== 1 || checklists[0].semester_version !== scope.semester_version || scope.policy_from !== policyDate(scope.rules, scope.starts))
    issues.push("The receiving semester changed after preparation. Coordinator review of its recorded setup is required.");
  if (documents.length !== 2 || !cor || !cog) issues.push("Separate current enrollment (COR or Certificate of Enrollment) and preceding-semester COG coverage is required.");
  for (const d of documents) if (d.issue) issues.push(d.issue);
  if (!cor?.context || !placement.placement || latest.academic_record_id === null || placement.version !== cor.context.academicVersion || placement.placement.schoolId !== cor.context.schoolId || (placement.placement.courseId || null) !== cor.context.courseId)
    issues.push("Record current semester academic details from the authoritative academic record.");
  const [entitlements] = await db.execute<RowDataPacket[]>("SELECT id FROM semester_entitlements WHERE scholar_semester_id=? LIMIT 1 LOCK IN SHARE MODE", [owner.id]);
  const ended = scope.ends < today();
  const unavailable = owner.participation_action !== "accepted" || !available(scope, false) || scope.starts > today() || !scopeAcceptsOwner(scope, owner.scope_version_id);
  const allocationReviewBlocker = !entitlements.length ? "No frozen semester allocation exists." : unavailable ? "Semester unavailable or locked." : !policy || !cor?.verified || !cog?.verified ? "Verified COR/COG and an approved grading rule are required." : issues[0] ?? null;
  const baseBlocker = unavailable ? "This semester is unavailable or locked. History remains readable."
    : entitlements.length ? "An entitlement depends on this semester. Controlled reconciliation is required before another review."
    : issues.length ? issues[0] : latest.program_category === "unknown" ? "Record the semester program category before reviewing findings." : null;
  const writeBlocker = baseBlocker ?? (ended ? "This semester has ended. Ask the Coordinator to record an academic-only review of verified evidence." : null);
  const endedReviewBlocker = baseBlocker ?? (!ended ? "Use the normal review while the semester is current." : !policy ? "An approved grading rule covering the entire semester is required." : !cor?.verified || !cog?.verified ? "Verify both covered COR and COG documents before an ended-semester review." : null);
  if (unavailable) issues.push("Semester workflow is unavailable; no current compliance approval can be used.");
  if (policies.length && !policy) issues.push("The grading policy is conflicting, expired or unavailable. Coordinator review is required.");
  const source = { ...(sharedDocuments.legacy.length ? { documentReconciliationHash: sharedDocuments.sourceHash } : {}), ownerId: owner.id as string, scopeId: scope.id as string, documentPolicyId: scope.policy_version_id as string, period: { id: semester, version: Number(scope.semester_version), starts: scope.starts as string, ends: scope.ends as string }, semesterRevision: Number(latest.revision), placement, category: latest.program_category as SemesterComplianceView["category"], documents, gradingRule: policy, participation: owner.participation_action as string, available: !unavailable };
  const sourceHash = digest(JSON.stringify(source));
  // Lock evidence, not historical authors: another authorized request may already
  // hold its own user row while waiting for the configuration guard.
  const [rows] = await db.execute<RowDataPacket[]>("SELECT r.*,DATE_FORMAT(r.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded FROM semester_review_events r WHERE scholar_semester_id=? ORDER BY revision DESC LOCK IN SHARE MODE", [owner.id]);
  const actorIds = [...new Set(rows.map((r) => r.actor_id as string))];
  const [actors] = actorIds.length ? await db.execute<RowDataPacket[]>(`SELECT id,full_name FROM users WHERE id IN (${actorIds.map(() => "?").join(",")})`, actorIds) : [[]];
  const history: Review[] = rows.map((r) => {
    const s = decode<{ findings: AcademicFindings; reason: string | null; blockers: string[]; source: typeof source; academicOnly?: boolean; correction?: RecordingCorrection }>(r.source_snapshot);
    return { id: r.id, revision: r.revision, result: r.result, findings: s.findings, sourceHash: r.source_hash, supersedesId: r.supersedes_id, actorName: actors.find((a) => a.id === r.actor_id)?.full_name ?? "Recorded user", recordedAt: r.recorded, reason: s.reason, blockers: s.blockers, documents: s.source.documents, gradingRule: s.source.gradingRule, academicOnly: s.academicOnly === true, correction: s.correction ?? null };
  });
  const stale = Boolean(history[0] && history[0].sourceHash !== sourceHash);
  const assessmentInput = { category: source.category, corVerified: cor?.verified ?? false, cogVerified: cog?.verified ?? false, cogNotRequired:cog?.notRequired ?? false, initialAdmissionApproved, rule: policy?.rule ?? null, reviewIssues: issues };
  const assessment = assessAcademicCompliance({ ...assessmentInput, findings: !stale && history[0] ? history[0].findings : emptyFindings });
  if (stale) { assessment.blockers.unshift("Evidence changed since the last review. Review the current documents again."); if (assessment.result === "compliant") assessment.result = "pending"; }
  const unresolved = unresolvedFindings(history);
  const correctionBlocker = baseBlocker ?? (!policy ? "An approved grading rule is required." : !cor?.verified || !cog?.verified ? "Verify both COR and COG before correcting recorded findings." : !history[0] || stale ? "Review the current evidence before correcting recorded findings." : !unresolved.length ? "No unresolved failed or dropped findings are recorded." : null);
  const view: SemesterComplianceView = { allocated: entitlements.length > 0, allocationReviewBlocker, sourceHash, revision: history[0]?.revision ?? 0, category: source.category, documents, gradingRule: policy, gradingSchool: school, ...assessment, writeBlocker, stale, history, gradingHistory: gradingHistory(policies), ended, endedReviewBlocker, correctionBlocker, unresolvedFindings: unresolved };
  const priorApproval = await priorApprovalForOwner(db, owner.id);
  view.priorApproval = priorApproval;
  if(priorApproval?.valid && history[0]?.id===priorApproval.reviewId && !unavailable && !unresolved.length){
    view.result="compliant"; view.blockers=[]; view.stale=false; view.category="degree";
    view.sourceHash=digest(JSON.stringify({basis:"prior_batch_approval",approval:priorApproval,sourceHash}));
    view.writeBlocker="Prior batch assessment recorded. Use a fresh controlled review when its sources change.";
  }else if(priorApproval&&!priorApproval.valid){view.blockers.unshift(priorApproval.issue!);}
  return { owner, scope, source, sharedDocuments, view, assessmentInput, policyCount: policies.length, policyRow: row, policies, baseBlocker };
}

export class SemesterComplianceService {
  private authorization: AuthorizationService;
  constructor(pool: Pool | undefined) { this.authorization = new AuthorizationService(pool); }
  get(actor: string, rawScholar: string, rawSemester: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester);
    return this.authorization.withPermission(actor, "scholars.read", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      return (await loadSemesterCompliance(db, scholar, semester)).view;
    });
  }
  replacementContext(actor: string, rawScholar: string, rawSemester: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester);
    return this.authorization.withPermission(actor, "semesters.configure", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const ctx = await loadSemesterCompliance(db, scholar, semester);
      if (!ctx.policyRow || !ctx.view.gradingRule) throw new AuthError(409, "GRADING_POLICY_REVIEW_REQUIRED", "A current, unambiguous grading policy is required before replacement.");
      return gradingReplacementImpact(db, ctx.owner.cohort_code, semester, ctx.policyRow, ctx.view.sourceHash, ctx.view.writeBlocker);
    });
  }
  replacePolicy(actor: string, rawScholar: string, rawSemester: string, rawKey: unknown, raw: unknown, requestId: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester), key = parseKey(rawKey);
    const parsed = z.object({ expectedPolicyId: z.uuid(), expectedRevision: z.number().int().positive(), impactHash: z.string().regex(/^[a-f0-9]{64}$/), kind: z.enum(["native", "equivalent"]), rule: ruleSchema.nullable(), issuer: text(3, 200), authorityReference: text(3, 300), sourceReference: text(3, 500), reason: text(5, 500), reviewed: z.literal(true) }).strict().safeParse(raw);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Review the affected records, approved rule, authority and reason for replacement.");
    const input = parsed.data, operation = "semester.grading.replace", hash = digest(JSON.stringify({ operation, scholar, semester, input }));
    return this.authorization.withPermission(actor, "semesters.configure", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [commands] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (commands[0]) { if (commands[0].payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This retry key belongs to another action."); return decode<{ id: string; revision: number }>(commands[0].result); }
      const ctx = await loadSemesterCompliance(db, scholar, semester), policy = ctx.policyRow;
      if (!policy || !ctx.view.gradingRule) throw new AuthError(409, "GRADING_POLICY_REVIEW_REQUIRED", "A current, unambiguous grading policy is required before replacement.");
      if (input.expectedPolicyId !== policy.id || input.expectedRevision !== policy.revision) throw new AuthError(409, "VERSION_CONFLICT", "The grading policy changed. Reload its history and affected records.");
      const impact = await gradingReplacementImpact(db, ctx.owner.cohort_code, semester, policy, ctx.view.sourceHash, ctx.view.writeBlocker);
      if (impact.blocker) throw new AuthError(409, "GRADING_REPLACEMENT_BLOCKED", impact.blocker);
      if (impact.impactHash !== input.impactHash) throw new AuthError(409, "SOURCE_CHANGED", "The affected records changed. Reload and review the replacement context.");
      if ((input.kind === "native" && input.rule !== null) || (input.kind === "equivalent" && !input.rule)) throw new AuthError(422, "VALIDATION_FAILED", "Use the fixed native scale or provide the approved equivalent scale.");
      const rule = input.kind === "native" ? nativeGradingRule : input.rule!;
      if (JSON.stringify(rule) === JSON.stringify(ctx.view.gradingRule.rule) && input.sourceReference === policy.source_reference && input.issuer === policy.issuer && input.authorityReference === policy.reference_text)
        throw new AuthError(409, "NO_GRADING_POLICY_CHANGE", "The rule and its authority/source are already recorded.");
      const id = randomUUID(), authority = randomUUID(), revision = Number(policy.revision) + 1;
      const scope = { purpose: "semester_academic_grading", semesterId: semester, rosterBatchId: ctx.owner.cohort_code as string, schoolId: ctx.view.gradingSchool!.id };
      await db.execute("INSERT INTO workflow_authority_versions(id,code,revision,issuer,reference_text,scope,valid_from,valid_until,source_location,actor_id,recorded_at) VALUES(?,?,1,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [authority, `GR-${id}`, input.issuer, input.authorityReference, JSON.stringify(scope), today(), policy.authority_until, input.sourceReference, actor]);
      await db.execute("INSERT INTO workflow_policy_versions(id,code,revision,authority_version_id,source_reference,effective_from,effective_until,rules,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [id, policy.code, revision, authority, input.sourceReference, ctx.scope.starts, ctx.scope.ends, JSON.stringify({ ...scope, kind: input.kind, rule, replacesPolicyId: policy.id, replacementReason: input.reason, reviewedImpact: { hash: impact.impactHash, recordCount: impact.recordCount, reviewedCount: impact.reviewedCount } }), actor]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'workflow_policy',?,'replace',?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), operation, id, actor, requestId, input.reason, JSON.stringify({ ...scope, previousPolicyId: policy.id, revision, authorityId: authority, rule, recordCount: impact.recordCount, reviewedCount: impact.reviewedCount, impactHash: impact.impactHash, idempotency_key: key })]);
      const result = { id, revision };
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [actor, key, operation, hash, JSON.stringify(result)]);
      return result;
    });
  }
  recoveryContext(actor: string, rawScholar: string, rawSemester: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester);
    return this.authorization.withPermission(actor, "semesters.configure", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const ctx = await loadSemesterCompliance(db, scholar, semester);
      if (!ctx.policies.length) throw new AuthError(409, "GRADING_POLICY_REQUIRED", "Record the initial approved grading rule first.");
      return gradingRecoveryImpact(db, ctx.owner.cohort_code, semester, ctx.policies, ctx.view.sourceHash, ctx.baseBlocker ?? (ctx.view.gradingRule ? "Use grading-rule replacement for a current, unambiguous policy." : null), ctx.view.ended);
    });
  }
  recoverPolicy(actor: string, rawScholar: string, rawSemester: string, rawKey: unknown, raw: unknown, requestId: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester), key = parseKey(rawKey);
    const parsed = z.object({ impactHash: z.string().regex(/^[a-f0-9]{64}$/), kind: z.enum(["native", "equivalent"]), rule: ruleSchema.nullable(), issuer: text(3, 200), authorityReference: text(3, 300), authorityUntil: z.iso.date().nullable(), sourceReference: text(3, 500), reason: text(5, 500), reviewed: z.literal(true), academicOnly: z.boolean() }).strict().safeParse(raw);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Review the policy history, renewed authority, approved rule and recovery reason.");
    const input = parsed.data, operation = "semester.grading.recover", hash = digest(JSON.stringify({ operation, scholar, semester, input }));
    return this.authorization.withPermission(actor, "semesters.configure", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [commands] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (commands[0]) { if (commands[0].payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This retry key belongs to another action."); return decode<{ id: string; revision: number }>(commands[0].result); }
      const ctx = await loadSemesterCompliance(db, scholar, semester);
      if (!ctx.policies.length || ctx.view.gradingRule) throw new AuthError(409, "GRADING_RECOVERY_NOT_REQUIRED", "Use initial setup or ordinary replacement for an available grading rule.");
      const impact = await gradingRecoveryImpact(db, ctx.owner.cohort_code, semester, ctx.policies, ctx.view.sourceHash, ctx.baseBlocker, ctx.view.ended);
      if (impact.blocker) throw new AuthError(409, "GRADING_RECOVERY_BLOCKED", impact.blocker);
      if (input.impactHash !== impact.impactHash || input.academicOnly !== ctx.view.ended) throw new AuthError(409, "SOURCE_CHANGED", "The affected records or policy history changed. Reload and review recovery again.");
      if ((input.authorityUntil && input.authorityUntil < today()) || (input.kind === "native" && input.rule !== null) || (input.kind === "equivalent" && !input.rule)) throw new AuthError(422, "VALIDATION_FAILED", "Use a currently valid authority and the approved native or equivalent rule.");
      const id = randomUUID(), authority = randomUUID(), rule = input.kind === "native" ? nativeGradingRule : input.rule!;
      const recoveryOf = ctx.policies.map((p) => p.id as string).sort();
      const scope = { purpose: "semester_academic_grading", semesterId: semester, rosterBatchId: ctx.owner.cohort_code as string, schoolId: ctx.view.gradingSchool!.id };
      await db.execute("INSERT INTO workflow_authority_versions(id,code,revision,issuer,reference_text,scope,valid_from,valid_until,source_location,actor_id,recorded_at) VALUES(?,?,1,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [authority, `GR-${id}`, input.issuer, input.authorityReference, JSON.stringify(scope), today(), input.authorityUntil, input.sourceReference, actor]);
      await db.execute("INSERT INTO workflow_policy_versions(id,code,revision,authority_version_id,source_reference,effective_from,effective_until,rules,actor_id,recorded_at) VALUES(?,?,1,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [id, `GR-${id}`, authority, input.sourceReference, ctx.scope.starts, ctx.scope.ends, JSON.stringify({ ...scope, kind: input.kind, rule, recoveryOf, replacementReason: input.reason, reviewedImpact: { hash: impact.impactHash, recordCount: impact.recordCount, reviewedCount: impact.reviewedCount }, academicOnly: ctx.view.ended }), actor]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'workflow_policy',?,'recover',?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), operation, id, actor, requestId, input.reason, JSON.stringify({ ...scope, recoveryOf, authorityId: authority, academicOnly: ctx.view.ended, impactHash: impact.impactHash, idempotency_key: key })]);
      const result = { id, revision: 1 };
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [actor, key, operation, hash, JSON.stringify(result)]);
      return result;
    });
  }
  correctRecording(actor: string, rawScholar: string, rawSemester: string, rawKey: unknown, raw: unknown, requestId: string) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester), key = parseKey(rawKey);
    const parsed = z.object({ sourceHash: z.string().regex(/^[a-f0-9]{64}$/), expectedRevision: z.number().int().positive(), fields: z.array(z.enum(["hasFailed", "hasDropped"])).min(1).max(2).refine((v) => new Set(v).size === v.length), reason: text(5, 500), recordingErrorConfirmed: z.literal(true), academicOnly: z.boolean() }).strict().safeParse(raw);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Select the incorrectly recorded findings, explain the error and confirm review of the affected evidence.");
    const input = parsed.data, operation = "semester.compliance.correct_recording", hash = digest(JSON.stringify({ operation, scholar, semester, input }));
    return this.authorization.withPermission(actor, "academic.changes.approve", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [commands] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (commands[0]) { if (commands[0].payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This retry key belongs to another action."); return decode<{ id: string; revision: number; result: ComplianceResult }>(commands[0].result); }
      const ctx = await loadSemesterCompliance(db, scholar, semester), { view } = ctx;
      if (view.correctionBlocker) throw new AuthError(409, "FINDING_CORRECTION_BLOCKED", view.correctionBlocker);
      if (input.sourceHash !== view.sourceHash || input.academicOnly !== view.ended) throw new AuthError(409, "SOURCE_CHANGED", "Evidence, policy or period changed. Reload before correcting findings.");
      if (input.expectedRevision !== view.revision) throw new AuthError(409, "VERSION_CONFLICT", "Another review was saved. Review the affected history again.");
      const targets = view.unresolvedFindings.filter((t) => input.fields.includes(t.field));
      if (input.fields.some((f) => !targets.some((t) => t.field === f))) throw new AuthError(409, "NO_FINDING_TO_CORRECT", "A selected finding has no unresolved recording to correct.");
      const findings = { ...view.history[0].findings };
      for (const field of input.fields) findings[field] = false;
      const correction: RecordingCorrection = { kind: "recording_error", targets };
      const assessment = assessAcademicCompliance({ ...ctx.assessmentInput, findings });
      const id = randomUUID(), revision = view.revision + 1, previous = view.history[0];
      const metadata = { correction, academicOnly: view.ended, ...(view.ended ? { reviewPurpose: "academic_only_after_period", endedOn: ctx.scope.ends } : {}) };
      await db.execute("INSERT INTO semester_review_events(id,scholar_semester_id,revision,semester_revision,policy_version_id,average_value,grading_rule_key,has_failed,has_dropped,has_incomplete,result,source_snapshot,source_hash,supersedes_id,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [id, ctx.owner.id, revision, ctx.source.semesterRevision, view.gradingRule!.id, findings.average, view.gradingRule!.id, findings.hasFailed, findings.hasDropped, findings.hasIncomplete, assessment.result, JSON.stringify({ source: ctx.source, findings, reason: input.reason, blockers: assessment.blockers, ...metadata }), view.sourceHash, previous.id, actor]);
      const result = { id, revision, result: assessment.result };
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'scholar_semester',?,'record',?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), operation, ctx.owner.id, actor, requestId, input.reason, JSON.stringify({ ...result, ...metadata, findings, sourceHash: view.sourceHash, supersedesId: previous.id, idempotency_key: key })]);
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [actor, key, operation, hash, JSON.stringify(result)]);
      return result;
    });
  }
  command(actor: string, rawScholar: string, rawSemester: string, rawKey: unknown, raw: unknown, requestId: string, configure = false, endedReview = false, allocatedReview = false) {
    const scholar = parseId(rawScholar), semester = parseId(rawSemester), key = parseKey(rawKey);
    const reviewSchema = z.object({ sourceHash: z.string().regex(/^[a-f0-9]{64}$/), expectedRevision: z.number().int().nonnegative(), findings: findingsSchema, reviewed: z.literal(true), reason: text(5, 500).nullable().default(null) }).strict();
    const policySchema = z.object({ sourceHash: z.string().regex(/^[a-f0-9]{64}$/), kind: z.enum(["native", "equivalent"]), rule: ruleSchema.nullable(), issuer: text(3, 200), authorityReference: text(3, 300), sourceReference: text(3, 500), reviewed: z.literal(true) }).strict();
    const endedSchema = reviewSchema.extend({ reason: text(5, 500), academicOnly: z.literal(true) }).strict();
    const allocatedSchema = reviewSchema.extend({ reason: text(5, 500) }).strict();
    const parsed = allocatedReview ? allocatedSchema.safeParse(raw) : configure ? policySchema.safeParse(raw) : endedReview ? endedSchema.safeParse(raw) : reviewSchema.safeParse(raw);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", configure ? "Record the approved grading rule, its source and authority, then confirm review." : "Record the academic findings and confirm that you reviewed the supporting documents.");
    const operation = allocatedReview ? "semester.compliance.allocated_review" : configure ? "semester.grading.configure" : endedReview ? "semester.compliance.ended_review" : "semester.compliance.review", hash = digest(JSON.stringify({ operation, scholar, semester, input: parsed.data }));
    return this.authorization.withPermission(actor, configure ? "semesters.configure" : endedReview || allocatedReview ? "academic.changes.approve" : "requirements.verify", async (db, access) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [commands] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (commands[0]) { if (commands[0].payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This retry key belongs to another action."); return decode<{ id: string; revision?: number; result?: ComplianceResult }>(commands[0].result); }
      const ctx = await loadSemesterCompliance(db, scholar, semester), { view } = ctx;
      const blocker = allocatedReview ? view.allocationReviewBlocker : endedReview ? view.endedReviewBlocker : view.writeBlocker;
      if (blocker) throw new AuthError(409, "COMPLIANCE_REVIEW_BLOCKED", blocker);
      if (parsed.data.sourceHash !== view.sourceHash) throw new AuthError(409, "SOURCE_CHANGED", "Evidence or policy changed. Reload and review before saving.");
      const id = randomUUID();
      let result: { id: string; revision?: number; result?: ComplianceResult }, reason: string, details: object;
      if (configure) {
        const input = policySchema.parse(parsed.data);
        if (ctx.policyCount || !view.gradingSchool) throw new AuthError(409, "GRADING_POLICY_REVIEW_REQUIRED", "The school needs review or already has a grading policy. Existing policy cannot be overwritten.");
        if ((input.kind === "native" && input.rule !== null) || (input.kind === "equivalent" && !input.rule)) throw new AuthError(422, "VALIDATION_FAILED", "Use the fixed native scale or provide the approved equivalent scale.");
        const rule = input.kind === "native" ? nativeGradingRule : input.rule!;
        const authority = randomUUID(), scope = { purpose: "semester_academic_grading", semesterId: semester, rosterBatchId: ctx.owner.cohort_code as string, schoolId: view.gradingSchool.id };
        await db.execute("INSERT INTO workflow_authority_versions(id,code,revision,issuer,reference_text,scope,valid_from,source_location,actor_id,recorded_at) VALUES(?,?,1,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [authority, `GR-${id}`, input.issuer, input.authorityReference, JSON.stringify(scope), today(), input.sourceReference, actor]);
        await db.execute("INSERT INTO workflow_policy_versions(id,code,revision,authority_version_id,source_reference,effective_from,effective_until,rules,actor_id,recorded_at) VALUES(?,?,1,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [id, `GR-${id}`, authority, input.sourceReference, ctx.scope.starts, ctx.scope.ends, JSON.stringify({ ...scope, kind: input.kind, rule }), actor]);
        result = { id }; reason = "Approved school grading rule recorded once for this cohort and semester"; details = { ...scope, rule, authorityId: authority, sourceReference: input.sourceReference };
      } else {
        const input = endedReview ? endedSchema.parse(parsed.data) : reviewSchema.parse(parsed.data), previous = view.history[0];
        if (input.expectedRevision !== view.revision) throw new AuthError(409, "VERSION_CONFLICT", "Another review was saved. Reload its findings.");
        const cog = view.documents.find((d) => d.kind === "cog");
        const cogEvents = cog ? (await requirementState(db, cog.id)).history : [];
        if (!canClearIncomplete(view.history, cog, cogEvents, input.findings.hasIncomplete))
          throw new AuthError(409, "CORRECTED_COG_REQUIRED", "Receive and verify an updated COG, then confirm that no INC remains. A waiver or an unchecked answer cannot clear a recorded INC.");
        if (view.history.some((r) => r.documents.some((d) => d.id === cog?.id && d.version === cog?.version) && (["hasFailed", "hasDropped", "hasIncomplete"] as const).some((k) => r.findings[k] === true && input.findings[k] === false && (k === "hasIncomplete" || view.unresolvedFindings.some((t) => t.reviewId === r.id && t.field === k)))))
          throw new AuthError(409, "CORRECTED_COG_REQUIRED", "Receive and verify corrected grade evidence before clearing an adverse subject finding.");
        if (view.history.some((r) => r.documents.some((d) => d.kind === "cog" && d.verified) && (["hasFailed", "hasDropped"] as const).some((k) => r.findings[k] === true && input.findings[k] !== true && view.unresolvedFindings.some((t) => t.reviewId === r.id && t.field === k))))
          throw new AuthError(409, "FORMAL_ACADEMIC_REVIEW_REQUIRED", "A verified failed or dropped finding requires a controlled authorized decision. A later grade document cannot automatically grant an exception or erase that finding.");
        const changesKnownFinding = previous && (Object.keys(input.findings) as (keyof AcademicFindings)[]).some((k) => {
          const kind = k === "enrolled" || k === "fullLoad" ? "cor" : "cog";
          const now = view.documents.find((d) => d.kind === kind), before = previous.documents.find((d) => d.kind === kind);
          return now?.id === before?.id && now?.version === before?.version && previous.findings[k] !== null && previous.findings[k] !== input.findings[k];
        });
        if (changesKnownFinding && (!access.permissions.some((p) => p.code === "academic.changes.approve") || !input.reason))
          throw new AuthError(409, "FINDINGS_CORRECTION_REQUIRES_REVIEW", "Changing findings against the same evidence requires Coordinator review and a correction reason.");
        const assessment = assessAcademicCompliance({ ...ctx.assessmentInput, findings: input.findings });
        const revision = view.revision + 1;
        await db.execute("INSERT INTO semester_review_events(id,scholar_semester_id,revision,semester_revision,policy_version_id,average_value,grading_rule_key,has_failed,has_dropped,has_incomplete,result,source_snapshot,source_hash,supersedes_id,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [id, ctx.owner.id, revision, ctx.source.semesterRevision, view.gradingRule?.id ?? ctx.scope.policy_version_id, input.findings.average, view.gradingRule?.id ?? null, input.findings.hasFailed, input.findings.hasDropped, input.findings.hasIncomplete, assessment.result, JSON.stringify({ postFinalization: allocatedReview, source: ctx.source, findings: input.findings, reason: input.reason, blockers: assessment.blockers, ...(endedReview ? { academicOnly: true, reviewPurpose: "academic_only_after_period", endedOn: ctx.scope.ends } : {}) }), view.sourceHash, previous?.id ?? null, actor]);
        result = { id, revision, result: assessment.result }; reason = input.reason ?? "Academic findings reviewed against recorded semester evidence"; details = { postFinalization: allocatedReview, ...result, sourceHash: view.sourceHash, supersedesId: previous?.id ?? null, findings: input.findings, blockers: assessment.blockers, ...(endedReview ? { academicOnly: true, endedOn: ctx.scope.ends } : {}) };
      }
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?, 'scholar_semester',?,'record',?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), operation, ctx.owner.id, actor, requestId, reason, JSON.stringify({ ...details, idempotency_key: key })]);
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [actor, key, operation, hash, JSON.stringify(result)]);
      return result;
    });
  }
}
