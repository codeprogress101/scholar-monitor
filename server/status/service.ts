import { randomUUID } from "node:crypto";
import { removeGraduateFromDrafts } from "../masterlists/graduate-removal.js";
import { graduationFor } from "./graduation.js";
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
  if (input.reasonCode === "GRADUATION" && (input.toStatus !== "graduated" || input.kind !== "change")) fail("STATUS_REASON_MISMATCH", "Graduation must change the status to Graduated, not reverse it.");
  if (input.toStatus === "graduated") {
    const [[person]] = await db.execute<RowDataPacket[]>("SELECT scholar_id FROM scholarship_records WHERE id=?", [scholarshipId]);
    if (person && await graduationFor(db, person.scholar_id)) fail("ALREADY_GRADUATED", "Graduation is already recorded. Review the existing decision instead of adding another graduation.");
  }
  // An activated record may have changed to a terminal state since this request.
  // Report its stale version before evaluating the transition against that new state.
  if (row.operational_status && row.status_version !== input.expectedVersion)
    fail(
      "VERSION_CONFLICT",
      "The operational status changed. Refresh and submit a new request.",
    );
  validateStatusEdge(row.operational_status, input.toStatus, input.kind);
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
        const [[annual]] = await db.execute<RowDataPacket[]>("SELECT scholar_id,academic_year_id FROM scholarship_records WHERE id=?", [id]);
        const [semesters] = await db.execute<RowDataPacket[]>("SELECT id,name FROM semesters WHERE academic_year_id=? ORDER BY starts_on", [annual.academic_year_id]);
        const [confirmations] = await db.execute<RowDataPacket[]>("SELECT request_id,semester_id FROM graduation_confirmations WHERE scholarship_id=?", [id]);
        return {
          graduation: await graduationFor(db, annual.scholar_id),
          semesters: semesters.map(s => ({ id: String(s.id), name: String(s.name) })),
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
                  finalSemesterId: confirmations.find(c => c.request_id === q.id)?.semester_id ?? null,
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
        let auditDetails: Record<string, unknown>;
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
          if (action === "cancel" && q.actor_id !== actor)
            throw new AuthError(
              403,
              "PERMISSION_DENIED",
              "Only the requester may cancel. Coordinators can reject requests.",
            );
          let version: number | null = null;
          const finalSemesterId = "finalSemesterId" in input ? input.finalSemesterId : undefined;
          if (finalSemesterId && (action !== "approve" || q.to_status !== "graduated")) fail("FINAL_SEMESTER_NOT_APPLICABLE", "Final funded semester belongs only to graduation approval.");
          if (action === "approve") {
            if (q.to_status === "graduated") {
              if (!finalSemesterId) fail("FINAL_SEMESTER_REQUIRED", "The Coordinator must explicitly confirm the final funded semester.");
              const [semesters] = await db.execute<RowDataPacket[]>("SELECT s.id FROM semesters s JOIN scholarship_records r ON r.academic_year_id=s.academic_year_id WHERE r.id=? AND s.id=? AND s.starts_on<=? LOCK IN SHARE MODE", [scholarshipId, finalSemesterId, q.effective_date]);
              if (!semesters.length) fail("INVALID_FINAL_SEMESTER", "Choose a semester of this annual record that has started by the graduation effective date.");
            }
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
            finalSemesterId: finalSemesterId ?? null,
            from: q.from_status,
            to: q.to_status,
            effectiveOn: q.effective_date,
            reasonCode: q.reason_code,
            kind: q.kind,
            correctsRequestId: q.corrects_request_id,
            resultingVersion: version,
            reference: input.reference,
          };
          if (action === "approve" && q.to_status === "graduated") await db.execute("INSERT INTO graduation_confirmations(request_id,scholarship_id,semester_id,actor_id,recorded_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))", [id, scholarshipId, finalSemesterId!, actor]);
          if (action === "approve" && q.to_status === "graduated") {
            const [[scholar]] = await db.execute<RowDataPacket[]>("SELECT scholar_id FROM scholarship_records WHERE id=?", [scholarshipId]);
            auditDetails.removedFromDrafts = await removeGraduateFromDrafts(db, scholar.scholar_id, actor, requestId, q.effective_date);
          }
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
