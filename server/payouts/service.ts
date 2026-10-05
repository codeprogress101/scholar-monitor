import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { applicableRequirements } from "../requirements/service.js";
import { parseRequirementList } from "../requirements/validation.js";
import { parsePayout, payoutTransition } from "./validation.js";
import type { PayoutCycle, PayoutRequirement } from "./model.js";
const select =
  "SELECT c.id,c.code,c.semester_id,s.academic_year_id,s.code AS semester_code,y.code AS year_code,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived,v.id AS version_id,v.version,v.name,DATE_FORMAT(v.target_date,'%Y-%m-%d') AS target_date,v.state,v.action,v.reason,v.reference_text,v.actor_name,DATE_FORMAT(v.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded FROM payout_cycles c JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=s.academic_year_id JOIN payout_cycle_versions v ON v.cycle_id=c.id";
const unavailable = (r: RowDataPacket) =>
  Boolean(r.locked_at || r.archived_at || r.year_locked || r.year_archived);
function openPeriod(r: RowDataPacket) {
  if (r.locked_at || r.year_locked)
    throw new AuthError(
      423,
      "RECORD_LOCKED",
      "The semester or academic year is locked.",
    );
  if (r.archived_at || r.year_archived)
    throw new AuthError(
      409,
      "REFERENCE_ARCHIVED",
      "The semester or academic year is archived.",
    );
}
async function view(
  db: PoolConnection,
  r: RowDataPacket,
): Promise<PayoutCycle> {
  const [requirements] = await db.execute<RowDataPacket[]>(
    "SELECT p.definition_version_id,p.allow_waiver,d.code,v.name,v.revision FROM payout_requirements p JOIN requirement_definition_versions v ON v.id=p.definition_version_id JOIN requirement_definitions d ON d.id=v.definition_id WHERE p.cycle_version_id=? ORDER BY d.code LOCK IN SHARE MODE",
    [r.version_id],
  );
  return {
    id: r.id,
    code: r.code,
    semesterId: r.semester_id,
    academicYearId: r.academic_year_id,
    semesterCode: r.semester_code,
    yearCode: r.year_code,
    versionId: r.version_id,
    version: r.version,
    name: r.name,
    targetDate: r.target_date,
    state: r.state,
    periodUnavailable: unavailable(r),
    requirements: requirements.map((p) => ({
      definitionVersionId: p.definition_version_id,
      code: p.code,
      name: p.name,
      revision: p.revision,
      allowWaiver: Boolean(p.allow_waiver),
    })),
    action: r.action,
    reason: r.reason,
    reference: r.reference_text,
    actorName: r.actor_name,
    recordedAt: r.recorded,
  };
}
export async function currentPayout(
  db: PoolConnection,
  id: string,
): Promise<PayoutCycle> {
  const [rows] = await db.execute<RowDataPacket[]>(
    select + " WHERE c.id=? ORDER BY v.version DESC LIMIT 1 FOR UPDATE",
    [id],
  );
  if (!rows.length)
    throw new AuthError(404, "PAYOUT_NOT_FOUND", "Payout cycle not found.");
  return view(db, rows[0]);
}
export function requireOpenPayout(cycle: PayoutCycle) {
  if (cycle.state !== "open")
    throw new AuthError(
      423,
      "PAYOUT_NOT_OPEN",
      "Requirement changes need an open payout cycle. Locked and closed cycles preserve their history.",
    );
  if (cycle.periodUnavailable)
    throw new AuthError(
      423,
      "RECORD_LOCKED",
      "The payout semester or academic year is unavailable.",
    );
}
export async function guardPayoutRequirement(
  db: PoolConnection,
  instanceId: string,
) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT c.payout_cycle_id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id WHERE i.id=? LOCK IN SHARE MODE",
    [instanceId],
  );
  if (rows[0]?.payout_cycle_id)
    requireOpenPayout(await currentPayout(db, rows[0].payout_cycle_id));
}
async function validateRequirements(
  db: PoolConnection,
  semesterId: string,
  targetDate: string,
  chosen: Pick<PayoutRequirement, "definitionVersionId" | "allowWaiver">[],
) {
  const available = await applicableRequirements(db, {
    semesterId,
    appliesTo: "payout",
    effectiveOn: targetDate,
  });
  if (
    !chosen.length ||
    chosen.some((r) => !available.some((a) => a.id === r.definitionVersionId))
  )
    throw new AuthError(
      409,
      "SOURCE_CHANGED",
      "Selected payout requirements must be the applicable versions on the target date. Reload the available policy before configuring or opening.",
    );
}
export class PayoutService {
  constructor(private authorization: AuthorizationService) {}
  async list(actor: string, raw: unknown) {
    const q = parseRequirementList(raw);
    return this.authorization.withPermission(
      actor,
      "configuration.read",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        // Locking reads include revisions committed while authorization waited.
        const [rows] = await db.execute<RowDataPacket[]>(
          select + " ORDER BY c.code,v.version DESC LOCK IN SHARE MODE",
        );
        const seen = new Set<string>();
        const latest = rows
          .filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          })
          .filter((r) =>
            `${r.code} ${r.name}`.toLowerCase().includes(q.q.toLowerCase()),
          )
          .sort(
            (a, b) =>
              b.target_date.localeCompare(a.target_date) ||
              a.code.localeCompare(b.code),
          );
        const items = [];
        for (const r of latest.slice(q.offset, q.offset + q.limit))
          items.push(await view(db, r));
        return {
          items,
          total: latest.length,
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
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        await currentPayout(db, id);
        const [rows] = await db.execute<RowDataPacket[]>(
          select + " WHERE c.id=? ORDER BY v.version LOCK IN SHARE MODE",
          [id],
        );
        const items = [];
        for (const row of rows) items.push(await view(db, row));
        return { items };
      },
    );
  }
  async command(
    actor: string,
    rawId: unknown,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const input = parsePayout(raw),
      key = parseKey(rawKey),
      id = input.action === "create" ? null : parseId(rawId);
    if ((rawId === null) !== (input.action === "create"))
      throw new AuthError(
        422,
        "VALIDATION_FAILED",
        "Use the explicit create or existing-cycle command endpoint.",
      );
    const hash = digest(JSON.stringify({ id, input }));
    return this.authorization.withPermission(
      actor,
      input.action === "create" || input.action === "configure"
        ? "configuration.manage"
        : "payouts.operate",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM payout_cycle_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This payout command key was already used with different data.",
            );
          return JSON.parse(prior[0].result) as PayoutCycle;
        }
        const before = id ? await currentPayout(db, id) : null;
        if (before && before.version !== input.expectedVersion)
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "Payout cycle changed. Refresh before continuing.",
          );
        const semesterId =
          input.action === "create" ? input.semesterId : before!.semesterId;
        const [periods] = await db.execute<RowDataPacket[]>(
          "SELECT s.version,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=? FOR UPDATE",
          [semesterId],
        );
        if (!periods.length)
          throw new AuthError(
            422,
            "REFERENCE_NOT_FOUND",
            "Select an existing semester.",
          );
        if (["create", "configure", "open"].includes(input.action))
          openPeriod(periods[0]);
        if (
          input.action === "create" &&
          periods[0].version !== input.expectedSemesterVersion
        )
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "Semester configuration changed. Refresh before creating a cycle.",
          );
        const state =
          input.action === "create"
            ? "draft"
            : payoutTransition(before!.state, input.action);
        const fields = "fields" in input ? input.fields : before!;
        if (["create", "configure", "open"].includes(input.action))
          await validateRequirements(
            db,
            semesterId,
            fields.targetDate,
            fields.requirements,
          );
        const cycleId = id ?? randomUUID();
        if (input.action === "create") {
          const [duplicate] = await db.execute<RowDataPacket[]>(
            "SELECT id FROM payout_cycles WHERE code=? FOR UPDATE",
            [input.code],
          );
          if (duplicate.length)
            throw new AuthError(
              409,
              "PAYOUT_CODE_EXISTS",
              "Use a distinct payout cycle code.",
            );
          await db.execute(
            "INSERT INTO payout_cycles(id,code,semester_id) VALUES(?,?,?)",
            [cycleId, input.code, semesterId],
          );
        }
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const versionId = randomUUID(),
          version = (before?.version ?? 0) + 1;
        await db.execute(
          "INSERT INTO payout_cycle_versions(id,cycle_id,version,name,target_date,state,action,reason,reference_text,actor_id,actor_name,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            versionId,
            cycleId,
            version,
            fields.name,
            fields.targetDate,
            state,
            input.action,
            input.reason,
            input.reference,
            actor,
            users[0].full_name,
          ],
        );
        for (const requirement of fields.requirements)
          await db.execute(
            "INSERT INTO payout_requirements(cycle_version_id,definition_version_id,allow_waiver) VALUES(?,?,?)",
            [
              versionId,
              requirement.definitionVersionId,
              requirement.allowWaiver,
            ],
          );
        const result = await currentPayout(db, cycleId);
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'payouts.cycle','payout_cycle',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            cycleId,
            input.action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({ before, after: result, idempotency_key: key }),
          ],
        );
        await db.execute(
          "INSERT INTO payout_cycle_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(result)],
        );
        return result;
      },
    );
  }
}
