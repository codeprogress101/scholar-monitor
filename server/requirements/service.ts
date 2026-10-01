import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { today } from "../scholars/validation.js";
import {
  parseRequirement,
  parseRequirementList,
  parseRequirementContext,
} from "./validation.js";
import type { RequirementVersion, RequirementList } from "./model.js";
const select = `SELECT v.*,d.code,DATE_FORMAT(v.effective_from,'%Y-%m-%d') AS starts,DATE_FORMAT(v.effective_until,'%Y-%m-%d') AS ends,DATE_FORMAT(v.created_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded FROM requirement_definition_versions v JOIN requirement_definitions d ON d.id=v.definition_id`;
function view(r: RowDataPacket): RequirementVersion {
  return {
    id: r.id,
    definitionId: r.definition_id,
    code: r.code,
    revision: r.revision,
    name: r.name,
    instructions: r.instructions,
    appliesTo: r.applies_to,
    semesterId: r.semester_id,
    semesterCode: r.semester_code,
    semesterName: r.semester_name,
    effectiveFrom: r.starts,
    effectiveUntil: r.ends,
    active: Boolean(r.active),
    reason: r.reason,
    reference: r.reference_text,
    actorName: r.actor_name,
    createdAt: r.recorded,
  };
}
async function semester(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT s.code,s.name,s.archived_at,s.locked_at,y.archived_at AS year_archived,y.locked_at AS year_locked FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=? LOCK IN SHARE MODE",
    [id],
  );
  if (!rows.length)
    throw new AuthError(
      422,
      "REFERENCE_NOT_FOUND",
      "Select an existing semester.",
    );
  if (rows[0].locked_at || rows[0].year_locked)
    throw new AuthError(
      423,
      "RECORD_LOCKED",
      "The semester or academic year is locked.",
    );
  if (rows[0].archived_at || rows[0].year_archived)
    throw new AuthError(
      409,
      "REFERENCE_ARCHIVED",
      "The semester or academic year is archived.",
    );
  return rows[0];
}
/** F14 must call within its generation transaction, holding configuration_guard.
 * Persist the returned immutable version id; never resolve an existing instance again.
 * effectiveOn is the authoritative period/payout policy date, not a browser-supplied override.
 */
export async function applicableRequirements(
  db: PoolConnection,
  raw: unknown,
): Promise<RequirementVersion[]> {
  const context = parseRequirementContext(raw);
  await semester(db, context.semesterId);
  // Authorization reads may establish a repeatable-read snapshot before the writer
  // guard is acquired. Use current locking reads so generation sees committed policy.
  const [rows] = await db.execute<RowDataPacket[]>(
    `${select} WHERE v.effective_from<=? ORDER BY d.code,v.revision DESC LOCK IN SHARE MODE`,
    [context.effectiveOn],
  );
  const seen = new Set<string>();
  const items: RequirementVersion[] = [];
  for (const row of rows) {
    if (seen.has(row.definition_id)) continue;
    seen.add(row.definition_id);
    const v = view(row);
    if (
      v.active &&
      (!v.effectiveUntil || v.effectiveUntil > context.effectiveOn) &&
      v.appliesTo === context.appliesTo &&
      (!v.semesterId || v.semesterId === context.semesterId)
    )
      items.push(v);
  }
  return items;
}
export class RequirementService {
  constructor(private authorization: AuthorizationService) {}
  async list(actor: string, raw: unknown): Promise<RequirementList> {
    const q = parseRequirementList(raw);
    return this.authorization.withPermission(
      actor,
      "configuration.read",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const where =
          " WHERE NOT EXISTS(SELECT 1 FROM requirement_definition_versions n WHERE n.definition_id=v.definition_id AND n.revision>v.revision) AND (LOCATE(?,d.code)>0 OR LOCATE(?,v.name)>0)";
        const [counts] = await db.execute<RowDataPacket[]>(
          "SELECT COUNT(*) AS total FROM requirement_definition_versions v JOIN requirement_definitions d ON d.id=v.definition_id" +
            where,
          [q.q, q.q],
        );
        const [rows] = await db.query<RowDataPacket[]>(
          select + where + " ORDER BY d.code LIMIT ? OFFSET ?",
          [q.q, q.q, q.limit, q.offset],
        );
        return {
          items: rows.map(view),
          total: Number(counts[0].total),
          offset: q.offset,
          limit: q.limit,
        };
      },
    );
  }
  async history(actor: string, rawId: unknown) {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "configuration.read",
      async (db) => {
        const [rows] = await db.execute<RowDataPacket[]>(
          select + " WHERE d.id=? ORDER BY v.revision DESC",
          [id],
        );
        if (!rows.length)
          throw new AuthError(
            404,
            "REQUIREMENT_NOT_FOUND",
            "Requirement definition not found.",
          );
        return { items: rows.map(view) };
      },
    );
  }
  async applicable(actor: string, raw: unknown) {
    return this.authorization.withPermission(
      actor,
      "configuration.read",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        return { items: await applicableRequirements(db, raw) };
      },
    );
  }
  async command(
    actor: string,
    rawId: unknown,
    keyRaw: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const id = rawId === undefined ? undefined : parseId(rawId),
      key = parseKey(keyRaw),
      input = parseRequirement(raw);
    if ((input.action === "create") !== !id)
      throw new AuthError(
        422,
        "VALIDATION_FAILED",
        "Use the collection to create and a definition ID for subsequent versions.",
      );
    const hash = digest(JSON.stringify({ id, input }));
    return this.authorization.withPermission(
      actor,
      "configuration.manage",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [receipts] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM requirement_definition_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (receipts.length) {
          if (receipts[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "Command key already used with different data.",
            );
          return JSON.parse(receipts[0].result as string) as RequirementVersion;
        }
        let before: RequirementVersion | undefined;
        if (id) {
          const [rows] = await db.execute<RowDataPacket[]>(
            select +
              " WHERE d.id=? ORDER BY v.revision DESC LIMIT 1 FOR UPDATE",
            [id],
          );
          if (!rows.length)
            throw new AuthError(
              404,
              "REQUIREMENT_NOT_FOUND",
              "Requirement definition not found.",
            );
          before = view(rows[0]);
        }
        if (input.expectedVersion !== (before?.revision ?? 0))
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "Refresh the latest definition before saving.",
          );
        if (input.action === "archive" && !before!.active)
          throw new AuthError(
            409,
            "ALREADY_ARCHIVED",
            "The latest definition version is already archived.",
          );
        const fields =
          input.action === "archive"
            ? {
                name: before!.name,
                instructions: before!.instructions,
                appliesTo: before!.appliesTo,
                semesterId: before!.semesterId,
                effectiveFrom: input.effectiveFrom,
                effectiveUntil: null,
              }
            : input.fields;
        if (
          before &&
          (fields.effectiveFrom <= before.effectiveFrom ||
            fields.effectiveFrom < today())
        )
          throw new AuthError(
            409,
            "EFFECTIVE_DATE_CONFLICT",
            "New versions must start after the latest version and cannot be backdated.",
          );
        // Archiving only withdraws future availability; retaining a closed scope is safe.
        const ref =
          fields.semesterId && input.action !== "archive"
            ? await semester(db, fields.semesterId)
            : null;
        const code = input.action === "create" ? input.code : before!.code;
        if (!id) {
          const [duplicate] = await db.execute<RowDataPacket[]>(
            "SELECT id FROM requirement_definitions WHERE code=? FOR UPDATE",
            [code],
          );
          if (duplicate.length)
            throw new AuthError(
              409,
              "DUPLICATE_CODE",
              "This code already exists, including archived definitions.",
            );
        }
        const definitionId = id ?? randomUUID(),
          versionId = randomUUID();
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        if (!id)
          await db.execute(
            "INSERT INTO requirement_definitions(id,code,created_at) VALUES(?,?,UTC_TIMESTAMP(6))",
            [definitionId, code],
          );
        await db.execute(
          "INSERT INTO requirement_definition_versions(id,definition_id,revision,name,instructions,applies_to,semester_id,semester_code,semester_name,effective_from,effective_until,active,reason,reference_text,actor_id,actor_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            versionId,
            definitionId,
            (before?.revision ?? 0) + 1,
            fields.name,
            fields.instructions,
            fields.appliesTo,
            fields.semesterId,
            ref?.code ??
              (input.action === "archive" ? before!.semesterCode : null),
            ref?.name ??
              (input.action === "archive" ? before!.semesterName : null),
            fields.effectiveFrom,
            fields.effectiveUntil,
            input.action !== "archive",
            input.reason,
            input.reference,
            actor,
            users[0].full_name,
          ],
        );
        const [saved] = await db.execute<RowDataPacket[]>(
          select + " WHERE v.id=?",
          [versionId],
        );
        const after = view(saved[0]);
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'requirement.definition.changed','requirement_definition',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            definitionId,
            input.action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              before: before ?? null,
              after,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO requirement_definition_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(after)],
        );
        return after;
      },
    );
  }
}
