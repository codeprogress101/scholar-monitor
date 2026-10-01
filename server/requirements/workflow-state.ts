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
  const latest = history.at(-1);
  const status: RequirementStatus =
    latest?.toStatus ?? (receipts.length ? "submitted" : "not_submitted");
  return {
    status,
    version: latest?.version ?? (receipts.length ? 1 : 0),
    lastEffectiveOn: latest?.effectiveOn ?? receipts[0]?.effective_on ?? null,
    latestEventId: latest?.id ?? null,
    history,
    satisfiesNormalRequirement: satisfiesNormalRequirement(status),
  };
}
