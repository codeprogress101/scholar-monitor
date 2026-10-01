import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import {
  parseStatusRequest,
  parseStatusDecision,
  validateStatusEdge,
} from "./validation.js";
import {
  statusAllowsPayout,
  type StatusView,
  type StatusResult,
} from "./model.js";
const fail = (code: string, message: string): never => {
  throw new AuthError(409, code, message);
};
async function current(db: PoolConnection, id: string, lock = false) {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT r.operational_status,r.status_version,DATE_FORMAT(r.status_effective_on,'%Y-%m-%d') AS effective_on,y.locked_at,y.archived_at FROM scholarship_records r JOIN academic_years y ON y.id=r.academic_year_id WHERE r.id=?${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  if (!rows.length)
    throw new AuthError(
      404,
      "SCHOLARSHIP_NOT_FOUND",
      "Annual record not found.",
    );
  return rows[0];
}
function usable(row: RowDataPacket) {
  if (row.locked_at) fail("RECORD_LOCKED", "Academic year is locked.");
  if (row.archived_at) fail("REFERENCE_ARCHIVED", "Academic year is archived.");
}
async function validate(
  db: PoolConnection,
  row: RowDataPacket,
  input: ReturnType<typeof parseStatusRequest>,
  scholarshipId: string,
) {
  usable(row);
  validateStatusEdge(row.operational_status, input.toStatus, input.kind);
  if (row.status_version !== input.expectedVersion)
    fail(
      "VERSION_CONFLICT",
      "The operational status changed. Refresh and submit a new request.",
    );
  if (input.effectiveOn < row.effective_on)
    fail(
      "INVALID_EFFECTIVE_DATE",
      "Effective date cannot precede the latest status event.",
    );
  if (input.kind === "correction") {
    const [original] = await db.execute<RowDataPacket[]>(
      "SELECT q.from_status,q.to_status,q.scholarship_id,d.resulting_version,d.decision FROM status_change_requests q JOIN status_change_decisions d ON d.request_id=q.id WHERE q.id=?",
      [input.correctsRequestId!],
    );
    const prior = original[0];
    if (
      !prior ||
      prior.scholarship_id !== scholarshipId ||
      prior.decision !== "approve" ||
      prior.resulting_version !== row.status_version ||
      prior.to_status !== row.operational_status ||
      prior.from_status !== input.toStatus
    )
      fail(
        "INVALID_CORRECTION",
        "Correction must restore the prior state of the latest approved terminal decision for this annual record.",
      );
  }
}
export class StatusService {
  constructor(private authorization: AuthorizationService) {}
  async view(actor: string, rawId: unknown): Promise<StatusView> {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "scholars.read",
      async (db) => {
        const row = await current(db, id);
        const [rows] = await db.execute<RowDataPacket[]>(
          "SELECT q.*,DATE_FORMAT(q.effective_on,'%Y-%m-%d') AS effective_date,DATE_FORMAT(q.created_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS created_time,d.decision,d.actor_name AS decider,d.reason AS decision_reason,d.reference_text AS decision_reference,d.resulting_version,DATE_FORMAT(d.occurred_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS decision_time FROM status_change_requests q LEFT JOIN status_change_decisions d ON d.request_id=q.id WHERE q.scholarship_id=? ORDER BY q.created_at DESC,q.id",
          [id],
        );
        return {
          status: row.operational_status,
          version: row.status_version,
          effectiveOn: row.effective_on,
          periodUnavailable: Boolean(row.locked_at || row.archived_at),
          statusAllowsPayout: statusAllowsPayout(row.operational_status),
          requests: rows.map((q) => ({
            id: q.id,
            fromStatus: q.from_status,
            toStatus: q.to_status,
            expectedVersion: q.expected_version,
            kind: q.kind,
            correctsRequestId: q.corrects_request_id,
            effectiveOn: q.effective_date,
            reasonCode: q.reason_code,
            reason: q.reason,
            reference: q.reference_text,
            actorId: q.actor_id,
            actorName: q.actor_name,
            createdAt: q.created_time,
            decision: q.decision
              ? {
                  action: q.decision,
                  actorName: q.decider,
                  reason: q.decision_reason,
                  reference: q.decision_reference,
                  occurredAt: q.decision_time,
                  resultingVersion: q.resulting_version,
                }
              : null,
          })),
        };
      },
    );
  }
  async command(
    actor: string,
    rawId: unknown,
    action: "request" | "approve" | "reject" | "cancel",
    rawKey: unknown,
    body: unknown,
    requestId: string,
  ): Promise<StatusResult> {
    const id = parseId(rawId),
      key = parseKey(rawKey);
    const proposal = action === "request" ? parseStatusRequest(body) : null;
    const input = proposal ?? parseStatusDecision(body);
    const hash = digest(JSON.stringify({ id, action, input }));
    return this.authorization.withPermission(
      actor,
      action === "approve" || action === "reject"
        ? "scholarship.status.approve"
        : "scholarship.status.request",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,request_id,outcome FROM status_change_commands WHERE actor_id=? AND command_id=?",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            fail(
              "IDEMPOTENCY_CONFLICT",
              "Request key already used for different input.",
            );
          return { requestId: prior[0].request_id, outcome: prior[0].outcome };
        }
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        let target = id;
        let scholarshipId = id;
        let auditDetails: object;
        if (proposal) {
          const row = await current(db, id, true);
          await validate(db, row, proposal, id);
          target = randomUUID();
          await db.execute(
            "INSERT INTO status_change_requests (id,scholarship_id,expected_version,from_status,to_status,kind,corrects_request_id,effective_on,reason_code,reason,reference_text,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            [
              target,
              id,
              proposal.expectedVersion,
              row.operational_status,
              proposal.toStatus,
              proposal.kind,
              proposal.correctsRequestId ?? null,
              proposal.effectiveOn,
              proposal.reasonCode,
              proposal.reason,
              proposal.reference,
              actor,
              users[0].full_name,
            ],
          );
          auditDetails = { from: row.operational_status, proposal };
        } else {
          const [requests] = await db.execute<RowDataPacket[]>(
            "SELECT q.*,DATE_FORMAT(q.effective_on,'%Y-%m-%d') AS effective_date FROM status_change_requests q WHERE q.id=? FOR UPDATE",
            [id],
          );
          const q = requests[0];
          if (!q)
            throw new AuthError(
              404,
              "STATUS_REQUEST_NOT_FOUND",
              "Status request not found.",
            );
          scholarshipId = q.scholarship_id;
          const [decisions] = await db.execute<RowDataPacket[]>(
            "SELECT request_id FROM status_change_decisions WHERE request_id=? FOR UPDATE",
            [id],
          );
          if (decisions.length)
            fail(
              "INVALID_STATE_TRANSITION",
              "This request already has a final decision.",
            );
          if (action === "approve" && q.actor_id === actor)
            throw new AuthError(
              403,
              "SELF_APPROVAL_DENIED",
              "A different Coordinator must approve this request.",
            );
          if (action === "cancel" && q.actor_id !== actor)
            throw new AuthError(
              403,
              "PERMISSION_DENIED",
              "Only the requester may cancel. Coordinators can reject requests.",
            );
          let version: number | null = null;
          if (action === "approve") {
            const row = await current(db, scholarshipId, true);
            await validate(
              db,
              row,
              {
                expectedVersion: q.expected_version,
                toStatus: q.to_status,
                kind: q.kind,
                correctsRequestId: q.corrects_request_id ?? undefined,
                effectiveOn: q.effective_date,
                reasonCode: q.reason_code,
                reason: q.reason,
                reference: q.reference_text,
              },
              scholarshipId,
            );
            if (row.operational_status !== q.from_status)
              fail("VERSION_CONFLICT", "The source status changed.");
            version = row.status_version + 1;
            await db.execute(
              "UPDATE scholarship_records SET operational_status=?,status_version=?,status_effective_on=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
              [q.to_status, version, q.effective_date, scholarshipId],
            );
          }
          await db.execute(
            "INSERT INTO status_change_decisions (request_id,decision,actor_id,actor_name,reason,reference_text,resulting_version,occurred_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            [
              id,
              action,
              actor,
              users[0].full_name,
              input.reason,
              input.reference,
              version,
            ],
          );
          auditDetails = {
            from: q.from_status,
            to: q.to_status,
            effectiveOn: q.effective_date,
            reasonCode: q.reason_code,
            kind: q.kind,
            correctsRequestId: q.corrects_request_id,
            resultingVersion: version,
            reference: input.reference,
          };
        }
        const outcome = action === "request" ? "pending" : action;
        await db.execute(
          "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,'scholarship.status','status_request',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            target,
            action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              scholarshipId,
              ...auditDetails,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO status_change_commands (actor_id,command_id,payload_hash,request_id,outcome) VALUES (?,?,?,?,?)",
          [actor, key, hash, target, outcome],
        );
        return { requestId: target, outcome };
      },
    );
  }
}
