import { academicCurrent } from "../academic/changes-service.js";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { header, entries, validate, DraftValidationError } from "./service.js";
import {
  nextMasterlistState,
  parseWorkflow,
  workflowPermission,
} from "./workflow-validation.js";
import type {
  MasterlistAction,
  OfficialSnapshot,
  WorkflowView,
} from "./workflow-model.js";
const decode = <T>(value: string | T): T =>
  typeof value === "string" ? (JSON.parse(value) as T) : value;
export class MasterlistWorkflowService {
  constructor(private authorization: AuthorizationService) {}
  async view(actor: string, rawId: unknown): Promise<WorkflowView> {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "masterlists.prepare",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const row = await header(db, id);
        const [events] = await db.execute<RowDataPacket[]>(
          "SELECT *,DATE_FORMAT(occurred_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded_at FROM masterlist_workflow_events WHERE masterlist_id=? ORDER BY resulting_version",
          [id],
        );
        const [publications] = await db.execute<RowDataPacket[]>(
          "SELECT *,DATE_FORMAT(effective_on,'%Y-%m-%d') AS effective_date,DATE_FORMAT(published_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded_at FROM masterlist_publications WHERE masterlist_id=?",
          [id],
        );
        const publication = publications[0];
        return {
          status: row.status,
          version: row.version,
          periodUnavailable: Boolean(row.locked_at || row.archived_at),
          events: events.map((e) => ({
            id: e.id,
            action: e.action,
            fromStatus: e.from_status,
            toStatus: e.to_status,
            version: e.resulting_version,
            actorName: e.actor_name,
            reason: e.reason,
            reference: e.reference_text,
            occurredAt: e.recorded_at,
          })),
          publication: publication
            ? {
                snapshot: decode(publication.snapshot),
                hash: publication.snapshot_hash,
                effectiveOn: publication.effective_date,
                actorName: publication.actor_name,
                publishedAt: publication.recorded_at,
              }
            : null,
        };
      },
    );
  }
  async command(
    actor: string,
    rawId: unknown,
    action: MasterlistAction,
    rawKey: unknown,
    body: unknown,
    requestId: string,
  ) {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      input = parseWorkflow(action, body),
      hash = digest(JSON.stringify({ id, action, input }));
    return this.authorization.withPermission(
      actor,
      workflowPermission(action),
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,masterlist_id,resulting_version FROM masterlist_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "Request key already used for another command.",
            );
          return {
            id: prior[0].masterlist_id as string,
            version: prior[0].resulting_version as number,
          };
        }
        const row = await header(db, id);
        if (row.version !== input.expectedVersion)
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "Masterlist changed. Refresh before continuing.",
          );
        const next = nextMasterlistState(row.status, action);
        // Locking an already-published snapshot remains possible after the year closes.
        if (action !== "lock" && (row.locked_at || row.archived_at))
          throw new AuthError(
            423,
            "RECORD_LOCKED",
            "Academic year is locked or archived.",
          );
        const items = await entries(db, id);
        if (!["return-draft", "lock"].includes(action)) {
          const report = await validate(db, row, items);
          if (!report.valid) throw new DraftValidationError(report.issues);
        }
        if (action === "approve") {
          const [submissions] = await db.execute<RowDataPacket[]>(
            "SELECT actor_id FROM masterlist_workflow_events WHERE masterlist_id=? AND action='submit-approval' ORDER BY resulting_version DESC LIMIT 1 FOR UPDATE",
            [id],
          );
          if (!submissions.length || submissions[0].actor_id === actor)
            throw new AuthError(
              403,
              "SELF_APPROVAL_DENIED",
              "A different Coordinator must approve the submitted masterlist.",
            );
        }
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const version = row.version + 1;
        const snapshot: OfficialSnapshot = {
          masterlistId: id,
          title: row.title,
          academicYearId: row.academic_year_id,
          yearCode: row.year_code,
          publicationVersion: version,
          entries: items,
        };
        if (action === "publish") {
          for (const entry of items) {
            const [annual] = await db.execute<RowDataPacket[]>(
              "SELECT operational_status,status_version,DATE_FORMAT(last_effective_on,'%Y-%m-%d') AS last_date FROM scholarship_records WHERE id=? FOR UPDATE",
              [entry.snapshot.scholarshipId],
            );
            const [activated] = await db.execute<RowDataPacket[]>(
              "SELECT scholarship_id FROM masterlist_activations WHERE scholarship_id=? FOR UPDATE",
              [entry.snapshot.scholarshipId],
            );
            if (
              !annual.length ||
              annual[0].operational_status ||
              activated.length
            )
              throw new AuthError(
                409,
                "ALREADY_ACTIVATED",
                "A candidate is already activated through another official record. Use the amendment workflow.",
              );
            const academic = await academicCurrent(
              db,
              entry.snapshot.academicRecordId,
            );
            if (
              input.effectiveOn! < annual[0].last_date ||
              (academic.effectiveOn &&
                input.effectiveOn! < academic.effectiveOn)
            )
              throw new AuthError(
                409,
                "INVALID_EFFECTIVE_DATE",
                "Publication activation cannot precede the latest qualification or approved academic change.",
              );
          }
          const serialized = JSON.stringify(snapshot);
          await db.execute(
            "INSERT INTO masterlist_publications (masterlist_id,snapshot,snapshot_hash,effective_on,actor_id,actor_name,published_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            [
              id,
              serialized,
              digest(serialized),
              input.effectiveOn!,
              actor,
              users[0].full_name,
            ],
          );
          for (const entry of items) {
            const annualId = entry.snapshot.scholarshipId;
            await db.execute(
              "INSERT INTO masterlist_activations (scholarship_id,masterlist_id,effective_on,activated_at) VALUES (?,?,?,UTC_TIMESTAMP(6))",
              [annualId, id, input.effectiveOn!],
            );
            await db.execute(
              "UPDATE scholarship_records SET operational_status='active',status_version=1,status_effective_on=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
              [input.effectiveOn!, annualId],
            );
            await db.execute(
              "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,'scholarship.activated','scholarship_record',?,'activate',?,'user',UTC_TIMESTAMP(6),?,?,?)",
              [
                randomUUID(),
                annualId,
                actor,
                requestId,
                input.reason,
                JSON.stringify({
                  masterlistId: id,
                  effectiveOn: input.effectiveOn,
                  reference: input.reference,
                }),
              ],
            );
          }
        }
        await db.execute(
          "INSERT INTO masterlist_workflow_events (id,masterlist_id,action,from_status,to_status,resulting_version,actor_id,actor_name,reason,reference_text,snapshot,occurred_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            randomUUID(),
            id,
            action,
            row.status,
            next,
            version,
            actor,
            users[0].full_name,
            input.reason,
            input.reference,
            JSON.stringify(snapshot),
          ],
        );
        await db.execute(
          "UPDATE masterlist_versions SET status=?,version=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
          [next, version, id],
        );
        await db.execute(
          "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,?, 'masterlist',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            `masterlist.${action}`,
            id,
            action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              from: row.status,
              to: next,
              version,
              reference: input.reference,
              effectiveOn: input.effectiveOn ?? null,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO masterlist_commands (actor_id,command_id,payload_hash,masterlist_id,resulting_version) VALUES (?,?,?,?,?)",
          [actor, key, hash, id, version],
        );
        return { id, version };
      },
    );
  }
}
