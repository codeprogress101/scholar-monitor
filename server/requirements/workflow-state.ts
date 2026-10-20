import type { RequirementWaiver } from "./waiver-model.js";
import { priorApprovalForDocument } from "./prior-approval-source.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type {
  RequirementStatus,
  RequirementWorkflowEvent,
} from "./workflow-model.js";
import { satisfiesNormalRequirement } from "./workflow-model.js";
export async function requirementState(db: PoolConnection, id: string) {
  const [receipts] = await db.execute<RowDataPacket[]>(
    "SELECT DATE_FORMAT(received_on,'%Y-%m-%d') AS effective_on FROM requirement_receipts WHERE instance_id=? LOCK IN SHARE MODE",
    [id],
  );
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT *,DATE_FORMAT(effective_on,'%Y-%m-%d') AS effective_date,DATE_FORMAT(recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded FROM requirement_workflow_events WHERE instance_id=? ORDER BY version LOCK IN SHARE MODE",
    [id],
  );
  const history: RequirementWorkflowEvent[] = rows.map((r) => ({
    id: r.id,
    version: r.version,
    action: r.action,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    effectiveOn: r.effective_date,
    reason: r.reason,
    reference: r.reference_text,
    remarks: r.remarks,
    correctionOf: r.correction_of,
    actorName: r.actor_name,
    recordedAt: r.recorded,
    details: typeof r.details === "string" ? JSON.parse(r.details) : r.details,
  }));
  const [waivers] = await db.execute<RowDataPacket[]>(
    "SELECT *,DATE_FORMAT(effective_on,'%Y-%m-%d') AS effective_date,DATE_FORMAT(recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded FROM requirement_waivers WHERE instance_id=? LOCK IN SHARE MODE",
    [id],
  );
  const w = waivers[0];
  const waiver: RequirementWaiver | null = w
    ? {
        id: w.id,
        version: w.version,
        fromStatus: w.from_status,
        effectiveOn: w.effective_date,
        reason: w.reason,
        authorityReference: w.authority_reference,
        remarks: w.remarks,
        actorId: w.actor_id,
        actorName: w.actor_name,
        recordedAt: w.recorded,
      }
    : null;
  const priorApproval = await priorApprovalForDocument(db, id);
  const [[correction]] = waiver ? await db.execute<RowDataPacket[]>("SELECT approval_id FROM prior_batch_waiver_corrections WHERE waiver_id=?",[waiver.id]) : [[]];
  const activeWaiver = waiver && !correction;
  const latest = history.at(-1);
  const status: RequirementStatus = priorApproval?.valid && (receipts.length || latest) ? "verified" : activeWaiver
    ? "waived"
    : (latest?.toStatus ?? (receipts.length ? "submitted" : "not_submitted"));
  return {
    priorApproval,
    waiverCorrected: Boolean(correction),
    status,
    version: Math.max(priorApproval?.decisionVersion??0, activeWaiver ? waiver!.version : latest?.version ?? (receipts.length ? 1 : 0)),
    lastEffectiveOn:
      (activeWaiver ? waiver!.effectiveOn : null) ??
      latest?.effectiveOn ??
      receipts[0]?.effective_on ??
      null,
    latestEventId: activeWaiver && !priorApproval?.valid ? waiver!.id : latest?.id ?? null,
    history,
    waiver,
    satisfiesNormalRequirement: satisfiesNormalRequirement(status),
  };
}
