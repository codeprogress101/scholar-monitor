import { guardPayoutRequirement } from "../payouts/service.js";
import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { requirementState } from "./workflow-state.js";
import {
  parseRequirementWaiver,
  waiverTransition,
} from "./waiver-validation.js";
async function base(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=s.academic_year_id WHERE i.id=? FOR UPDATE",
    [id],
  );
  if (!rows.length)
    throw new AuthError(
      404,
      "REQUIREMENT_NOT_FOUND",
      "Requirement instance not found.",
    );
  return rows[0];
}
function openPeriod(r: RowDataPacket) {
  if (r.locked_at || r.year_locked)
    throw new AuthError(
      423,
      "RECORD_LOCKED",
      "Semester or academic year is locked.",
    );
  if (r.archived_at || r.year_archived)
    throw new AuthError(
      409,
      "REFERENCE_ARCHIVED",
      "Semester or academic year is archived.",
    );
}
export class RequirementWaiverService {
  constructor(private authorization: AuthorizationService) {}
  async command(
    actor: string,
    rawId: unknown,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      input = parseRequirementWaiver(raw),
      hash = digest(JSON.stringify({ id, input }));
    return this.authorization.withPermission(
      actor,
      "requirements.waive",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM requirement_waiver_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This waiver key was already used with different data.",
            );
          return JSON.parse(prior[0].result as string) as {
            id: string;
            version: number;
            status: string;
          };
        }
        const r = await base(db, id);
        openPeriod(r);
        await guardPayoutRequirement(db, id);
        const current = await requirementState(db, id);
        if (input.expectedVersion !== current.version)
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "Requirement changed. Refresh its history before recording another decision.",
          );
        const next = waiverTransition(current.status);
        if (
          current.lastEffectiveOn &&
          input.effectiveOn < current.lastEffectiveOn
        )
          throw new AuthError(
            409,
            "INVALID_EFFECTIVE_DATE",
            "Effective date cannot precede the latest receipt or workflow decision.",
          );
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const eventId = randomUUID(),
          version = current.version + 1;
        await db.execute(
          "INSERT INTO requirement_waivers(id,instance_id,version,from_status,effective_on,reason,authority_reference,remarks,actor_id,actor_name,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            eventId,
            id,
            version,
            current.status,
            input.effectiveOn,
            input.reason,
            input.authorityReference,
            input.remarks,
            actor,
            users[0].full_name,
          ],
        );
        const result = { id: eventId, version, status: next };
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'requirements.waiver','requirement_instance',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            id,
            "waive",
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              before: { status: current.status, version: current.version },
              after: result,
              effectiveOn: input.effectiveOn,
              authorityReference: input.authorityReference,
              remarks: input.remarks,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO requirement_waiver_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(result)],
        );
        return result;
      },
    );
  }
}
