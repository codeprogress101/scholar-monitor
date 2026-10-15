import { reusedOwner, requireActiveDocument } from "./reused-source.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { currentReceiptEvidence } from "./receipt-evidence.js";
import { requirementState } from "./workflow-state.js";
import { classifyReceiptTiming, timingLabels, type ReceiptTimingStatus } from "./timing-rules.js";
import { semesterRequirementContext } from "./semester-context.js";
import { currentPayout } from "../payouts/service.js";

const decode = <T>(v: T | string): T => typeof v === "string" ? JSON.parse(v) as T : v;
const text = z.string().trim().min(5).max(500).regex(/^\P{Cc}*$/u);
const decisionSchema = z.object({ batchId: z.uuid(), expectedSourceHash: z.string().regex(/^[a-f0-9]{64}$/), expectedRevision: z.number().int().min(0), decision: z.enum(["approve", "reject"]), evidenceKind: z.enum(["receiving_log", "dated_acknowledgment"]), evidenceReference: text, reason: text }).strict();
type Decision = { id: string; revision: number; sourceHash: string; decision: "approve" | "reject"; evidenceKind: string; evidenceReference: string; reason: string; actorName: string; recordedAt: string };
export type TimingWindow = { batchId: string; batchCode: string; cutoffOn: string; revision: number; deadlineRevision: number; sourceHash: string; status: ReceiptTimingStatus; message: string; timingSatisfied: boolean; canDecide: boolean; decisionRevision: number; processingState: string; history: Decision[] };
export type RequirementTimingView = { mode: "legacy" | "managed"; receipt: ReturnType<typeof currentReceiptEvidence>; windows: TimingWindow[]; financialAuthorized: false; issue: string | null };

export async function loadRequirementTiming(db: PoolConnection, instanceId: string): Promise<RequirementTimingView> {
  const [[owner]] = await db.execute<RowDataPacket[]>("SELECT c.semester_id,c.scholar_semester_id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id WHERE i.id=? LOCK IN SHARE MODE", [instanceId]);
  if (!owner) throw new AuthError(404, "REQUIREMENT_NOT_FOUND", "Requirement not found.");
  owner.scholar_semester_id ??= await reusedOwner(db, instanceId);
  const [[original]] = await db.execute<RowDataPacket[]>("SELECT r.id,DATE_FORMAT(r.received_on,'%Y-%m-%d') AS receivedOn,DATE_FORMAT(r.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recordedAt,r.actor_name AS receiverName,r.physical_reference AS physicalReference,r.storage_location AS storageLocation,r.remarks,r.reason,e.document_type AS documentType FROM requirement_receipts r LEFT JOIN requirement_document_evidence e ON e.receipt_id=r.id WHERE r.instance_id=? LOCK IN SHARE MODE", [instanceId]);
  const state = await requirementState(db, instanceId);
  const receipt = currentReceiptEvidence(original ? { id: original.id, receivedOn: original.receivedOn, recordedAt: original.recordedAt, receiverName: original.receiverName, physicalReference: original.physicalReference, storageLocation: original.storageLocation, remarks: original.remarks, reason: original.reason, ...(original.documentType ? { documentType: original.documentType } : {}) } : null, state.history);
  const [[mapping]] = await db.execute<RowDataPacket[]>("SELECT p.*,s.version AS sv,y.version AS yv FROM regular_payout_periods p JOIN semesters s ON s.id=p.semester_id JOIN academic_years y ON y.id=p.academic_year_id WHERE p.semester_id=? LOCK IN SHARE MODE", [owner.semester_id]);
  if (!mapping || !owner.scholar_semester_id) return { mode: "legacy", receipt, windows: [], financialAuthorized: false, issue: mapping ? "Legacy annual requirements need explicit reconciliation before managed timing is used." : null };
  const [[deadline]] = await db.execute<RowDataPacket[]>("SELECT revision,DATE_FORMAT(deadline_on,'%Y-%m-%d') AS day FROM semester_submission_versions WHERE cycle_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE", [mapping.cycle_id]);
  if (!deadline) return { mode: "managed", receipt, windows: [], financialAuthorized: false, issue: "Configure the semester final deadline before assessing receipt timing." };
  const cycle = await currentPayout(db, mapping.cycle_id);
  const [[siblings]] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM payout_cycles WHERE semester_id=?", [owner.semester_id]);
  const issue = receipt.issue ?? (mapping.semester_version !== mapping.sv || mapping.year_version !== mapping.yv || Number(siblings.n) !== 1 || !deadline ? "Regular-period mapping or deadline needs review." : null);
  const [rows] = await db.execute<RowDataPacket[]>("SELECT w.batch_id,w.batch_number,b.code,v.revision,DATE_FORMAT(v.cutoff_on,'%Y-%m-%d') AS cutoffOn FROM payroll_submission_windows w JOIN ovr_batches b ON b.id=w.batch_id JOIN payroll_submission_window_versions v ON v.batch_id=w.batch_id WHERE w.cycle_id=? AND NOT EXISTS(SELECT 1 FROM payroll_submission_window_versions newer WHERE newer.batch_id=v.batch_id AND newer.revision>v.revision) ORDER BY w.batch_number LOCK IN SHARE MODE", [mapping.cycle_id]);
  const windows: TimingWindow[] = [];
  for (const row of rows) {
    const [[batch]] = await db.execute<RowDataPacket[]>("SELECT revision,state FROM ovr_batch_events WHERE batch_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE", [row.batch_id]);
    const [history] = await db.execute<RowDataPacket[]>("SELECT id,revision,source_hash AS sourceHash,decision,evidence_kind AS evidenceKind,evidence_reference AS evidenceReference,reason,actor_name AS actorName,DATE_FORMAT(recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recordedAt FROM requirement_timing_decisions WHERE instance_id=? AND batch_id=? ORDER BY revision DESC LOCK IN SHARE MODE", [instanceId, row.batch_id]);
    const sourceHash = digest(JSON.stringify({ instanceId, receipt: receipt.current, cycleId: cycle.id, cycleVersion: cycle.version, mapping: { semesterId: mapping.semester_id, semesterVersion: mapping.semester_version, yearVersion: mapping.year_version }, deadline: deadline ?? null, window: { batchId: row.batch_id, revision: row.revision, cutoffOn: row.cutoffOn } }));
    const base = issue || row.cutoffOn > deadline?.day ? "unavailable" : classifyReceiptTiming(receipt.current, row.cutoffOn);
    const latest = history[0];
    const decisionMatches = latest?.sourceHash === sourceHash;
    const status: ReceiptTimingStatus = base === "review_required" && decisionMatches ? latest.decision === "approve" ? "approved_late_encoding" : "rejected_late_encoding" : base;
    windows.push({ batchId: row.batch_id, batchCode: row.code, cutoffOn: row.cutoffOn, revision: row.revision, deadlineRevision: deadline?.revision ?? 0, sourceHash, status, message: timingLabels[status], timingSatisfied: ["on_time", "approved_late_encoding"].includes(status), canDecide: base === "review_required" && !cycle.periodUnavailable && cycle.state === "open" && ["draft", "review"].includes(batch?.state), decisionRevision: latest?.revision ?? 0, processingState: batch?.state ?? "unknown", history: history as Decision[] });
  }
  return { mode: "managed", receipt, windows, financialAuthorized: false, issue };
}

export class RequirementTimingService {
  constructor(private authorization: AuthorizationService) {}
  read(actor: string, rawId: unknown) {
    const id = parseId(rawId);
    return this.authorization.withPermission(actor, "scholars.read", async db => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      return loadRequirementTiming(db, id);
    });
  }
  decide(actor: string, rawId: unknown, rawKey: unknown, raw: unknown, requestId: string) {
    const id = parseId(rawId), key = parseKey(rawKey), parsed = decisionSchema.safeParse(raw);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Review the current document and cutoff, select evidence, and provide its reference and decision reason.");
    const input = parsed.data, hash = digest(JSON.stringify({ id, input, command: "receipt-timing" }));
    // Existing Coordinator-only cutoff authority; no technical-admin elevation.
    return this.authorization.withPermission(actor, "payroll.windows.manage", async db => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [[prior]] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (prior) {
        if (prior.payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This decision key was already used with different evidence.");
        return decode<{ id: string; revision: number }>(prior.result);
      }
      const [[source]] = await db.execute<RowDataPacket[]>("SELECT c.scholar_semester_id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id WHERE i.id=?", [id]);
      if (source) await requireActiveDocument(db, id, source.scholar_semester_id);
      const view = await loadRequirementTiming(db, id), window = view.windows.find(w => w.batchId === input.batchId);
      if (!window || window.sourceHash !== input.expectedSourceHash || window.decisionRevision !== input.expectedRevision) throw new AuthError(409, "SOURCE_CHANGED", "Document, deadline or prior timing decision changed. Reload before deciding.");
      if (!window.canDecide) throw new AuthError(409, "TIMING_DECISION_UNAVAILABLE", "Only an on-time receipt claim entered late in an available, unfinalized batch can be reviewed. This action cannot reopen payroll or approve late physical receipt.");
      const [[owner]] = await db.execute<RowDataPacket[]>("SELECT c.scholar_semester_id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id WHERE i.id=?", [id]);
      await semesterRequirementContext(db, id, owner.scholar_semester_id);
      const [[user]] = await db.execute<RowDataPacket[]>("SELECT full_name FROM users WHERE id=?", [actor]);
      const result = { id: randomUUID(), revision: window.decisionRevision + 1 };
      const snapshot = { receipt: view.receipt.current, batchId: window.batchId, cutoffOn: window.cutoffOn, windowRevision: window.revision, deadlineRevision: window.deadlineRevision, sourceHash: window.sourceHash };
      await db.execute("INSERT INTO requirement_timing_decisions(id,instance_id,batch_id,revision,source_hash,decision,evidence_kind,evidence_reference,reason,snapshot,actor_id,actor_name,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [result.id, id, window.batchId, result.revision, window.sourceHash, input.decision, input.evidenceKind, input.evidenceReference, input.reason, JSON.stringify(snapshot), actor, user.full_name]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'requirements.timing','requirement_instance',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), id, input.decision, actor, requestId, input.reason, JSON.stringify({ before: window.history[0] ?? null, after: { ...result, ...input, snapshot }, idempotency_key: key })]);
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)", [actor, key, hash, JSON.stringify(result)]);
      return result;
    });
  }
}
