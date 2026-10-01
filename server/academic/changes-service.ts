import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { parseStatusDecision } from "../status/validation.js";
import {
  parseAcademicChange,
  validatePlacementChange,
} from "./changes-validation.js";
import type { Placement, AcademicChangeView } from "./changes-model.js";
const fail = (code: string, message: string): never => {
  throw new AuthError(409, code, message);
};
const json = <T>(value: string | T): T =>
  typeof value === "string" ? (JSON.parse(value) as T) : value;
export async function academicCurrent(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT a.*,y.locked_at,y.archived_at,s.operational_status FROM academic_records a JOIN academic_years y ON y.id=a.academic_year_id LEFT JOIN scholarship_records s ON s.scholar_id=a.scholar_id AND s.academic_year_id=a.academic_year_id WHERE a.id=? FOR UPDATE",
    [id],
  );
  const row = rows[0];
  if (!row)
    throw new AuthError(
      404,
      "ACADEMIC_RECORD_NOT_FOUND",
      "Academic record not found.",
    );
  const [revisions] = await db.execute<RowDataPacket[]>(
    "SELECT q.after_value,d.resulting_version,DATE_FORMAT(q.effective_on,'%Y-%m-%d') AS effective_on FROM academic_change_decisions d JOIN academic_changes q ON q.id=d.request_id WHERE d.academic_record_id=? AND d.decision='approve' ORDER BY d.resulting_version DESC LIMIT 1 FOR UPDATE",
    [id],
  );
  const [official] = await db.execute<RowDataPacket[]>(
    "SELECT e.id FROM masterlist_entries e JOIN masterlist_versions m ON m.id=e.masterlist_id WHERE e.scholar_id=? AND m.academic_year_id=? AND e.removed_at IS NULL AND m.status IN ('approved','published','locked') LIMIT 1 FOR UPDATE",
    [row.scholar_id, row.academic_year_id],
  );
  row.official_membership = official.length > 0;
  const latest = revisions[0];
  const placement: Placement = latest
    ? json(latest.after_value)
    : {
        schoolId: row.school_id,
        courseId: row.course_id,
        yearLevel: row.year_level,
        school: { code: row.school_code, name: row.school_name },
        course: { code: row.course_code, name: row.course_name },
      };
  return {
    row,
    placement,
    version: (latest?.resulting_version ?? 0) as number,
    effectiveOn: (latest?.effective_on ?? null) as string | null,
  };
}
async function validate(
  db: PoolConnection,
  state: Awaited<ReturnType<typeof academicCurrent>>,
  input: ReturnType<typeof parseAcademicChange>,
) {
  if (state.row.locked_at)
    fail(
      "RECORD_LOCKED",
      "Academic year is locked. Official changes require a masterlist amendment.",
    );
  if (state.row.archived_at)
    fail("REFERENCE_ARCHIVED", "Academic year is archived.");
  // F11 activation is the existing official-record boundary. All activated states,
  // including terminal states, remain protected until the amendment workflow exists.
  if (state.row.operational_status || state.row.official_membership)
    fail(
      "MASTERLIST_AMENDMENT_REQUIRED",
      "This activated scholarship or approved masterlist membership requires an amendment. Direct placement changes are unavailable.",
    );
  if (state.version !== input.expectedVersion)
    fail(
      "VERSION_CONFLICT",
      "Placement changed. Refresh history and submit a new request.",
    );
  if (state.effectiveOn && input.effectiveOn < state.effectiveOn)
    fail(
      "INVALID_EFFECTIVE_DATE",
      "Effective date cannot precede the latest approved academic change.",
    );
  validatePlacementChange(state.placement, input);
  const after = { ...state.placement };
  for (const [table, key, snapshot] of [
    ["schools", "schoolId", "school"],
    ["courses", "courseId", "course"],
  ] as const) {
    // Retaining an archived historical reference is allowed; changing to one is not.
    if (input[key] === state.placement[key]) continue;
    const [refs] = await db.execute<RowDataPacket[]>(
      `SELECT code,name,archived_at FROM ${table} WHERE id=? FOR UPDATE`,
      [input[key]],
    );
    if (!refs.length)
      throw new AuthError(
        422,
        "REFERENCE_NOT_FOUND",
        "Choose an existing school and course.",
      );
    if (refs[0].archived_at)
      fail(
        "REFERENCE_ARCHIVED",
        "Choose active reference data for the new placement.",
      );
    after[key] = input[key];
    after[snapshot] = { code: refs[0].code, name: refs[0].name };
  }
  after.yearLevel = input.yearLevel;
  return after;
}
export class AcademicChangesService {
  constructor(private authorization: AuthorizationService) {}
  async view(actor: string, rawId: unknown): Promise<AcademicChangeView> {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "scholars.read",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const state = await academicCurrent(db, id);
        const [rows] = await db.execute<RowDataPacket[]>(
          "SELECT q.*,DATE_FORMAT(q.effective_on,'%Y-%m-%d') AS effective_date,DATE_FORMAT(q.created_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS created_time,d.decision,d.actor_name AS decider,d.reason AS decision_reason,d.reference_text AS decision_reference,DATE_FORMAT(d.occurred_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS decision_time FROM academic_changes q LEFT JOIN academic_change_decisions d ON d.request_id=q.id WHERE q.academic_record_id=? ORDER BY q.created_at DESC,q.id",
          [id],
        );
        return {
          current: state.placement,
          version: state.version,
          effectiveOn: state.effectiveOn,
          unavailable: Boolean(
            state.row.locked_at ||
            state.row.archived_at ||
            state.row.operational_status ||
            state.row.official_membership,
          ),
          requests: rows.map((q) => ({
            id: q.id,
            kind: q.kind,
            expectedVersion: q.expected_version,
            before: json(q.before_value),
            after: json(q.after_value),
            effectiveOn: q.effective_date,
            reason: q.reason,
            reference: q.reference_text,
            remarks: q.remarks,
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
  ) {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      proposal = action === "request" ? parseAcademicChange(body) : null;
    const input = proposal ?? parseStatusDecision(body),
      hash = digest(JSON.stringify({ id, action, input }));
    return this.authorization.withPermission(
      actor,
      action === "approve" || action === "reject"
        ? "academic.changes.approve"
        : "academic.edit",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,request_id,outcome FROM academic_change_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            fail(
              "IDEMPOTENCY_CONFLICT",
              "Request key was used for another command.",
            );
          return {
            requestId: prior[0].request_id as string,
            outcome: prior[0].outcome as string,
          };
        }
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        let target = id,
          recordId = id;
        let details: object;
        if (proposal) {
          const state = await academicCurrent(db, id),
            after = await validate(db, state, proposal);
          target = randomUUID();
          await db.execute(
            "INSERT INTO academic_changes (id,academic_record_id,expected_version,kind,before_value,after_value,school_id,course_id,effective_on,reason,reference_text,remarks,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            [
              target,
              id,
              proposal.expectedVersion,
              proposal.kind,
              JSON.stringify(state.placement),
              JSON.stringify(after),
              after.schoolId,
              after.courseId,
              proposal.effectiveOn,
              proposal.reason,
              proposal.reference,
              proposal.remarks,
              actor,
              users[0].full_name,
            ],
          );
          details = { before: state.placement, after, proposal };
        } else {
          const [requests] = await db.execute<RowDataPacket[]>(
            "SELECT q.*,DATE_FORMAT(q.effective_on,'%Y-%m-%d') AS effective_date FROM academic_changes q WHERE id=? FOR UPDATE",
            [id],
          );
          const q = requests[0];
          if (!q)
            throw new AuthError(
              404,
              "ACADEMIC_CHANGE_NOT_FOUND",
              "Academic change request not found.",
            );
          recordId = q.academic_record_id;
          const [decisions] = await db.execute<RowDataPacket[]>(
            "SELECT request_id FROM academic_change_decisions WHERE request_id=? FOR UPDATE",
            [id],
          );
          if (decisions.length)
            fail(
              "INVALID_STATE_TRANSITION",
              "This request already has a final decision.",
            );
          if (action === "approve" && actor === q.actor_id)
            throw new AuthError(
              403,
              "SELF_APPROVAL_DENIED",
              "A different Coordinator must approve this request.",
            );
          if (action === "cancel" && actor !== q.actor_id)
            throw new AuthError(
              403,
              "CANCEL_DENIED",
              "Only the requester can cancel this request.",
            );
          let resultingVersion: number | null = null;
          if (action === "approve") {
            const after = json<Placement>(q.after_value),
              state = await academicCurrent(db, recordId);
            await validate(
              db,
              state,
              parseAcademicChange({
                expectedVersion: q.expected_version,
                kind: q.kind,
                schoolId: after.schoolId,
                courseId: after.courseId,
                yearLevel: after.yearLevel,
                effectiveOn: q.effective_date,
                reason: q.reason,
                reference: q.reference_text,
                remarks: q.remarks,
              }),
            );
            // The reviewed request snapshots remain authoritative even if labels were renamed.
            resultingVersion = state.version + 1;
          }
          await db.execute(
            "INSERT INTO academic_change_decisions (request_id,academic_record_id,decision,resulting_version,actor_id,actor_name,reason,reference_text,occurred_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            [
              id,
              recordId,
              action,
              resultingVersion,
              actor,
              users[0].full_name,
              input.reason,
              input.reference,
            ],
          );
          details = { requestId: id, resultingVersion, decision: input };
        }
        await db.execute(
          "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,?, 'academic_record',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            `academic.change.${action}`,
            recordId,
            action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({ ...details, idempotency_key: key }),
          ],
        );
        await db.execute(
          "INSERT INTO academic_change_commands (actor_id,command_id,payload_hash,request_id,outcome) VALUES (?,?,?,?,?)",
          [actor, key, hash, target, action],
        );
        return { requestId: target, outcome: action };
      },
    );
  }
}
