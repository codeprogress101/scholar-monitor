import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AcademicService } from "../academic/service.js";
import { academicCurrent } from "../academic/changes-service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseKey } from "../configuration/validation.js";
import { cachedReads } from "../read-cache.js";
import type { ImportResult } from "../imports/model.js";
import { requirementState } from "./workflow-state.js";
import { requirementVerificationContext, RequirementWorkflowService } from "./workflow-service.js";
import { semesterRequirementContext } from "./semester-context.js";
import { verificationMatches, type VerificationContext } from "./workflow-model.js";
import { parseRequirementWorkflow } from "./workflow-validation.js";
import { parseBatchScope, parseBatchVerification, parseBatchPlacement } from "./batch-validation.js";
import type { BatchDocument, DocumentBatchPreview, HistoricalPlacementReview } from "./batch-model.js";

const json = <T>(value: T | string): T => typeof value === "string" ? JSON.parse(value) : value;
type Scope = Awaited<ReturnType<typeof loadScope>>;
async function loadScope(db: PoolConnection, input: { importId: string; semesterId: string }) {
  const [[imported]] = await db.execute<RowDataPacket[]>("SELECT c.result,j.file_name FROM import_confirmations c JOIN import_jobs j ON j.id=c.job_id WHERE c.job_id=?", [input.importId]);
  if (!imported) throw new AuthError(404, "IMPORT_NOT_CONFIRMED", "Choose a confirmed import batch.");
  const result = json<ImportResult>(imported.result);
  const ids = [...new Set(result.items.map(i => i.id))].sort();
  if (!ids.length || ids.length > 1500) throw new AuthError(409, "BATCH_SCOPE_REVIEW_REQUIRED", "This import cannot be safely reviewed as one batch.");
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT i.id,ss.id AS owner_id,ss.scholar_id,ss.semester_id,
    s.academic_year_id AS receiving_year_id,identifier.human_id,
    CONCAT_WS(' ',p.last_name,p.first_name,NULLIF(p.middle_name,''),NULLIF(p.suffix,'')) AS scholar_name,
    cov.document_kind,covered.academic_year_id AS covered_year_id,covered.name AS covered_name,y.code AS covered_year_code,
    DATE_FORMAT(receipt.received_on,'%Y-%m-%d') AS received_on
    FROM scholar_semesters ss JOIN scholars p ON p.id=ss.scholar_id JOIN scholar_identifiers identifier ON identifier.scholar_id=p.id
    JOIN semesters s ON s.id=ss.semester_id JOIN requirement_checklists c ON c.scholar_semester_id=ss.id
    JOIN requirement_instances i ON i.checklist_id=c.id
    JOIN requirement_coverage cov ON cov.requirement_instance_id=i.id AND NOT EXISTS(SELECT 1 FROM requirement_coverage newer WHERE newer.requirement_instance_id=i.id AND newer.revision>cov.revision)
    JOIN semesters covered ON covered.id=cov.coverage_semester_id JOIN academic_years y ON y.id=covered.academic_year_id
    LEFT JOIN requirement_receipts receipt ON receipt.instance_id=i.id
    WHERE ss.semester_id=? AND ss.scholar_id IN (${ids.map(() => "?").join(",")}) AND cov.document_kind IN ('cor','cog')
    ORDER BY identifier.human_id,cov.document_kind,i.id`, [input.semesterId, ...ids]);
  if (rows.length > 3000 || new Set(rows.map(r => `${r.scholar_id}:${r.document_kind}`)).size !== rows.length)
    throw new AuthError(409, "BATCH_SCOPE_REVIEW_REQUIRED", "Duplicate shared document sources require individual reconciliation.");
  return { ids, rows, hash: digest(JSON.stringify({ ...input, ids, documents: rows.map(r => r.id).sort() })) };
}

/** Current placement is only a review suggestion. No historical data is inferred or written here. */
async function historicalSuggestion(db: PoolConnection, row: RowDataPacket, state: Awaited<ReturnType<typeof requirementState>>): Promise<HistoricalPlacementReview | undefined> {
  if (row.document_kind !== "cog" || row.covered_year_id === row.receiving_year_id || !row.received_on || !["submitted", "resubmitted", "for_verification"].includes(state.status)) return;
  const coverage = await semesterRequirementContext(db, row.id, row.owner_id);
  if (!coverage || coverage.entrantCard) return;
  const [[historical]] = await db.execute<RowDataPacket[]>("SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=?", [row.scholar_id, coverage.academicYearId]);
  if (historical) return; // Never overwrite an existing historical placement.
  const [[record]] = await db.execute<RowDataPacket[]>("SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=?", [row.scholar_id, row.receiving_year_id]);
  if (!record) return;
  const current = await academicCurrent(db, record.id);
  if (!current.placement.schoolId || !current.placement.courseId || current.placement.coursePending) return;
  return {
    sourceHash: digest(JSON.stringify({ id: row.id, coverage, state, current })),
    academicYearId: coverage.academicYearId, yearCode: coverage.yearCode,
    schoolId: current.placement.schoolId, schoolName: current.placement.school.name,
    courseId: current.placement.courseId, courseName: current.placement.course.name,
  };
}
async function documentRow(db: PoolConnection, r: RowDataPacket): Promise<BatchDocument> {
  const state = await requirementState(db, r.id);
  const item: BatchDocument = { id: r.id, scholarId: r.scholar_id, humanId: r.human_id, name: r.scholar_name,
    kind: r.document_kind, coverage: r.covered_name, coverageYearId: r.covered_year_id, status: state.status,
    version: state.version, receivedOn: r.received_on, outcome: "blocked" };
  try {
    if(state.priorApproval?.valid)return {...item,outcome:"current"};
    const context = await requirementVerificationContext(db, r.id);
    if (context.entrantCard?.mode === "initial_requirements") return { ...item, outcome: "not_required", coverage: context.semesterCode };
    if (!["submitted", "resubmitted", "for_verification", "verified"].includes(state.status)) return { ...item, issue: { code: "DOCUMENT_NOT_READY", message: "Receive this document or complete its existing correction/review workflow first." } };
    if (state.status === "verified" && verificationMatches(context, state.history.at(-1)?.details.verification)) return { ...item, outcome: "current" };
    return { ...item, outcome: "ready", context, contextHash: digest(JSON.stringify({ state, context })) };
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    item.issue = { code: error.code, message: error.message };
    if (error.code === "ACADEMIC_RECORD_REQUIRED") item.historicalPlacement = await historicalSuggestion(db, r, state);
    return item;
  }
}
export function verificationDocument(c: VerificationContext) {
  return { scholarId: c.scholarId, scholarVersion: c.scholarVersion, academicYearId: c.academicYearId,
    semesterId: c.semesterId, schoolId: c.schoolId, courseId: c.courseId, academicVersion: c.academicVersion,
    definitionVersionId: c.definitionVersionId,
    ...(c.coverageId ? { coverageId: c.coverageId, semesterRevision: c.semesterRevision } : {}),
    ...(c.predecessorSourceHash ? { predecessorSourceHash: c.predecessorSourceHash } : {}),
    ...(c.entrantCard ? { entrantCardId: c.entrantCard.id } : {}),
    ...(c.coursePending ? { coursePendingId: c.coursePending.id, coursePendingRevision: c.coursePending.revision } : {}),
  };
}
export class DocumentBatchService {
  constructor(private authorization: AuthorizationService) {}
  batches(actor: string) {
    return this.authorization.readSnapshot(actor, "requirements.verify", async db => {
      const [rows] = await db.execute<RowDataPacket[]>("SELECT j.id,j.file_name,DATE_FORMAT(c.confirmed_at,'%Y-%m-%dT%H:%i:%sZ') AS confirmed_at,JSON_LENGTH(c.result,'$.items') AS scholar_count FROM import_jobs j JOIN import_confirmations c ON c.job_id=j.id ORDER BY c.confirmed_at DESC,j.id LIMIT 100");
      return { items: rows.map(r => ({ id: r.id as string, fileName: r.file_name as string, confirmedAt: r.confirmed_at as string, scholarCount: Number(r.scholar_count) })) };
    });
  }
  preview(actor: string, raw: unknown): Promise<DocumentBatchPreview> {
    const input = parseBatchScope(raw);
    return this.authorization.readSnapshot(actor, "requirements.verify", async connection => {
      const db = cachedReads(connection), scope = await loadScope(db, input), documents: BatchDocument[] = [];
      for (const row of scope.rows) documents.push(await documentRow(db, row));
      return { ...input, scopeHash: scope.hash, scholarCount: scope.ids.length,
        missingScholarCount: scope.ids.filter(id => !scope.rows.some(r => r.scholar_id === id)).length, documents };
    });
  }
  verify(actor: string, rawKey: unknown, raw: unknown, requestId: string) {
    const input = parseBatchVerification(raw), key = parseKey(rawKey), operation = "documents.batch-verify", hash = digest(JSON.stringify({ operation, input }));
    return this.authorization.withPermission(actor, "requirements.verify", async db => {
      const prior = await this.prior(db, actor, key, hash);
      if (prior) return prior;
      const scope = await this.checkedScope(db, input);
      const workflow = new RequirementWorkflowService(this.authorization), results = [];
      for (const selected of [...input.items].sort((a, b) => a.id.localeCompare(b.id))) {
        const row = scope.rows.find(r => r.id === selected.id);
        if (!row) throw new AuthError(409, "BATCH_SOURCE_CHANGED", "A selected document is no longer in this import's shared requirements. Refresh the batch.");
        const item = await documentRow(db, row), c = item.context;
        if (item.outcome !== "ready" || !c || item.version !== selected.version || item.contextHash !== selected.contextHash)
          throw new AuthError(409, "BATCH_SOURCE_CHANGED", `Review ${item.humanId} ${item.kind.toUpperCase()} again: ${item.issue?.message ?? "the document or its source changed"}. No batch decisions were saved.`, { instanceId: item.id });
        if (c.coursePending ? !input.deferredCourseChecksConfirmed : !input.ordinaryChecksConfirmed)
          throw new AuthError(422, "BATCH_ATTESTATION_REQUIRED", "Explicitly confirm the document checks for every selected verification context.");
        results.push({ instanceId: item.id, ...await workflow.record(db, actor, item.id, parseRequirementWorkflow("verify", {
          action: "verify", expectedVersion: item.version, effectiveOn: input.effectiveOn, reason: input.reason,
          reference: input.reference, remarks: null,
          attestation: c.coursePending ? "course-comparison-deferred" : "all-five-checked", document: verificationDocument(c),
        }), requestId, key) });
      }
      return this.complete(db, actor, key, operation, hash, input, { verifiedCount: results.length, items: results }, requestId);
    });
  }
  reviewHistoricalPlacement(actor: string, rawKey: unknown, raw: unknown, requestId: string) {
    const input = parseBatchPlacement(raw), key = parseKey(rawKey), operation = "documents.batch-historical-placement", hash = digest(JSON.stringify({ operation, input }));
    return this.authorization.withPermission(actor, "semesters.configure", async (db, access) => {
      if (!access.permissions.some(p => p.code === "academic.edit") || !access.permissions.some(p => p.code === "requirements.verify"))
        throw new AuthError(403, "PERMISSION_DENIED", "Historical COG review requires Coordinator setup, academic editing and document verification permissions.");
      const prior = await this.prior(db, actor, key, hash);
      if (prior) return prior;
      const scope = await this.checkedScope(db, input);
      const academic = new AcademicService({ withPermission: async (user, permission, run) => {
        if (user !== actor || !access.permissions.some(p => p.code === permission)) throw new AuthError(403, "PERMISSION_DENIED", "Academic editing is unavailable.");
        return run(db, access);
      } });
      const results = [];
      for (const selected of [...input.items].sort((a, b) => a.id.localeCompare(b.id))) {
        const row = scope.rows.find(r => r.id === selected.id);
        if (!row) throw new AuthError(409, "BATCH_SOURCE_CHANGED", "A selected COG no longer belongs to this batch.");
        const item = await documentRow(db, row), placement = item.historicalPlacement;
        if (!placement || placement.sourceHash !== selected.sourceHash) throw new AuthError(409, "BATCH_SOURCE_CHANGED", `Review the historical placement for ${item.humanId} again. No records were saved.`, { instanceId: item.id });
        const result = await academic.create(actor, item.scholarId, randomUUID(), {
          academicYearId: placement.academicYearId, schoolId: placement.schoolId, courseId: placement.courseId,
          yearLevel: selected.yearLevel ?? "Not recorded", reason: input.reason, reference: input.reference,
        }, requestId);
        results.push({ instanceId: item.id, ...result, placement, yearLevel: selected.yearLevel, yearLevelRecorded: selected.yearLevel !== null });
      }
      return this.complete(db, actor, key, operation, hash, input, { reviewedCount: results.length, items: results }, requestId);
    });
  }
  private async checkedScope(db: PoolConnection, input: { importId: string; semesterId: string; scopeHash: string }): Promise<Scope> {
    const scope = await loadScope(db, { importId: input.importId, semesterId: input.semesterId });
    if (scope.hash !== input.scopeHash) throw new AuthError(409, "BATCH_SOURCE_CHANGED", "The batch's shared requirements changed. Refresh and review the selection again.");
    return scope;
  }
  private async prior(db: PoolConnection, actor: string, key: string, hash: string) {
    const [[prior]] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
    if (!prior) return null;
    if (prior.payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This request key was already used for different data.");
    return json<Record<string, unknown>>(prior.result);
  }
  private async complete(db: PoolConnection, actor: string, key: string, operation: string, hash: string, input: { importId: string; semesterId: string; reason: string }, result: object, requestId: string) {
    await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'import_job',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
      [randomUUID(), operation, input.importId, operation, actor, requestId, input.reason, JSON.stringify({ input, result, idempotency_key: key })]);
    await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [actor, key, operation, hash, JSON.stringify(result)]);
    return result;
  }
}
