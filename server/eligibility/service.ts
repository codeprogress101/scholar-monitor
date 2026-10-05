import { validationDetails } from "../validation-details.js";
import { overrideHistory, effectiveEligibility } from "./override-state.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { parseRequirementList } from "../requirements/validation.js";
import { currentPayout, requireOpenPayout } from "../payouts/service.js";
import type { PayoutCycle } from "../payouts/model.js";
import { requirementState } from "../requirements/workflow-state.js";
import { satisfiesNormalRequirement } from "../requirements/workflow-model.js";
import type { OfficialSnapshot } from "../masterlists/workflow-model.js";
import { evaluateEligibility } from "./engine.js";
import type {
  EligibilitySources,
  EligibilitySnapshot,
  EligibilityView,
} from "./model.js";
const decode = <T>(v: string | T): T =>
  typeof v === "string" ? (JSON.parse(v) as T) : v;
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const schema = z
  .object({
    expectedRevision: z.number().int().min(0),
    expectedSourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    reason: text(5, 500),
    reference: text(3, 300),
  })
  .strict();
export function parseCalculation(raw: unknown) {
  const r = schema.safeParse(raw);
  if (!r.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Refresh the assessment and provide the saved revision, source hash, calculation reason and reference.",
      validationDetails(r.error),
    );
  return r.data;
}
/** Caller holds configuration_guard; all authoritative reads are current locking reads. */
export async function eligibilitySources(
  db: PoolConnection,
  cycle: PayoutCycle,
  annualId: string,
): Promise<EligibilitySources> {
  const [records] = await db.execute<RowDataPacket[]>(
    "SELECT r.*,s.version AS person_version,CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')) AS name,i.human_id,DATE_FORMAT(r.status_effective_on,'%Y-%m-%d') AS status_on FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE r.id=? FOR UPDATE",
    [annualId],
  );
  if (!records.length)
    throw new AuthError(
      404,
      "SCHOLARSHIP_NOT_FOUND",
      "Annual scholarship record not found.",
    );
  const r = records[0];
  if (r.academic_year_id !== cycle.academicYearId)
    throw new AuthError(
      409,
      "WRONG_ACADEMIC_YEAR",
      "Payout cycle and scholarship record must belong to the same academic year.",
    );
  const [activations] = await db.execute<RowDataPacket[]>(
    "SELECT masterlist_id FROM masterlist_activations WHERE scholarship_id=? LOCK IN SHARE MODE",
    [annualId],
  );
  const rootId = activations[0]?.masterlist_id ?? null;
  let official: EligibilitySources["official"] = {
    rootId,
    masterlistId: null,
    version: null,
    amendmentRevision: 0,
    snapshotHash: null,
    effectiveOn: null,
    valid: false,
  };
  if (rootId) {
    const [chain] = await db.execute<RowDataPacket[]>(
      "SELECT masterlist_id,revision FROM masterlist_amendment_versions WHERE root_id=? ORDER BY revision DESC LOCK IN SHARE MODE",
      [rootId],
    );
    const latestId = chain[0]?.masterlist_id ?? rootId;
    const [publications] = await db.execute<RowDataPacket[]>(
      "SELECT m.id,m.academic_year_id,m.status,m.version,p.snapshot,p.snapshot_hash,DATE_FORMAT(p.effective_on,'%Y-%m-%d') AS effective_on FROM masterlist_versions m JOIN masterlist_publications p ON p.masterlist_id=m.id WHERE m.id=? LOCK IN SHARE MODE",
      [latestId],
    );
    if (publications.length) {
      const p = publications[0],
        snapshot = decode<OfficialSnapshot>(p.snapshot);
      official = {
        rootId,
        masterlistId: latestId,
        version: p.version,
        amendmentRevision: chain[0]?.revision ?? 0,
        snapshotHash: p.snapshot_hash,
        effectiveOn: p.effective_on,
        valid:
          ["published", "locked"].includes(p.status) &&
          p.academic_year_id === cycle.academicYearId &&
          snapshot.academicYearId === cycle.academicYearId &&
          snapshot.masterlistId === latestId &&
          snapshot.entries.some(
            (e) =>
              e.scholarId === r.scholar_id &&
              e.snapshot.scholarshipId === annualId,
          ),
      };
    }
  }
  const [checklists] = await db.execute<RowDataPacket[]>(
    "SELECT id,payout_version_id,DATE_FORMAT(policy_date,'%Y-%m-%d') AS policy_date FROM requirement_checklists WHERE scholarship_record_id=? AND payout_cycle_id=? LOCK IN SHARE MODE",
    [annualId, cycle.id],
  );
  const checklist = checklists[0];
  const [instances] = await db.execute<RowDataPacket[]>(
    "SELECT id,definition_version_id FROM requirement_instances WHERE checklist_id=? ORDER BY definition_version_id LOCK IN SHARE MODE",
    [checklist?.id ?? null],
  );
  const requirements: EligibilitySources["requirements"] = [];
  for (const rule of cycle.requirements) {
    const instance = instances.find(
        (i) => i.definition_version_id === rule.definitionVersionId,
      ),
      state = instance ? await requirementState(db, instance.id) : null;
    requirements.push({
      definitionVersionId: rule.definitionVersionId,
      code: rule.code,
      policyRevision: rule.revision,
      allowWaiver: rule.allowWaiver,
      instanceId: instance?.id ?? null,
      version: state?.version ?? 0,
      status: state?.status ?? null,
      latestEventId: state?.latestEventId ?? null,
      satisfied: state
        ? satisfiesNormalRequirement(state.status, rule.allowWaiver)
        : false,
    });
  }
  return {
    cycle: {
      id: cycle.id,
      versionId: cycle.versionId,
      version: cycle.version,
      state: cycle.state,
      targetDate: cycle.targetDate,
      academicYearId: cycle.academicYearId,
      semesterId: cycle.semesterId,
      periodUnavailable: cycle.periodUnavailable,
    },
    scholarship: {
      id: annualId,
      scholarId: r.scholar_id,
      humanId: r.human_id,
      name: r.name,
      personVersion: r.person_version,
      qualification: r.status,
      qualificationVersion: r.version,
      status: r.operational_status,
      statusVersion: r.status_version,
      statusEffectiveOn: r.status_on,
    },
    official,
    checklist: checklist
      ? {
          id: checklist.id,
          cycleVersionId: checklist.payout_version_id,
          policyDate: checklist.policy_date,
        }
      : null,
    requirements,
  };
}
async function history(
  db: PoolConnection,
  cycleId: string,
  annualId: string,
): Promise<EligibilitySnapshot[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT *,DATE_FORMAT(calculated_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recorded FROM payout_eligibility WHERE cycle_id=? AND scholarship_id=? ORDER BY revision DESC LIMIT 50 LOCK IN SHARE MODE",
    [cycleId, annualId],
  );
  return rows.map((r) => ({
    ...decode<EligibilitySnapshot>(r.assessment),
    id: r.id,
    revision: r.revision,
    calculatedAt: r.recorded,
    actorName: r.actor_name,
    reason: r.reason,
    reference: r.reference_text,
  }));
}
export async function eligibilityView(
  db: PoolConnection,
  cycle: PayoutCycle,
  annualId: string,
): Promise<EligibilityView> {
  const current = evaluateEligibility(
      await eligibilitySources(db, cycle, annualId),
    ),
    saved = await history(db, cycle.id, annualId),
    latest = saved[0] ?? null,
    overrides = await overrideHistory(db, cycle.id, annualId);
  return {
    current,
    latest,
    overrides,
    effective: effectiveEligibility(current, overrides),
    stale: !!latest && latest.sourceHash !== current.sourceHash,
    canCalculate: cycle.state === "open" && !cycle.periodUnavailable,
    history: saved,
  };
}
export class EligibilityService {
  constructor(private authorization: AuthorizationService) {}
  async read(actor: string, rawCycle: unknown, rawAnnual: unknown) {
    const cycleId = parseId(rawCycle),
      annualId = parseId(rawAnnual);
    return this.authorization.withPermission(
      actor,
      "scholars.read",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        return eligibilityView(db, await currentPayout(db, cycleId), annualId);
      },
    );
  }
  async report(actor: string, rawCycle: unknown, rawQuery: unknown) {
    const id = parseId(rawCycle),
      q = parseRequirementList(rawQuery);
    return this.authorization.withPermission(
      actor,
      "scholars.read",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const cycle = await currentPayout(db, id);
        const [rows] = await db.execute<RowDataPacket[]>(
          "SELECT r.id FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE r.academic_year_id=? AND (LOCATE(?,i.human_id)>0 OR LOCATE(?,CONCAT_WS(' ',s.first_name,s.last_name))>0) ORDER BY i.human_id LOCK IN SHARE MODE",
          [cycle.academicYearId, q.q, q.q],
        );
        const items = [];
        for (const row of rows.slice(q.offset, q.offset + q.limit)) {
          const result = await eligibilityView(db, cycle, row.id);
          items.push({
            effective: result.effective,
            current: result.current,
            latest: result.latest,
            stale: result.stale,
          });
        }
        return {
          cycle,
          items,
          total: rows.length,
          offset: q.offset,
          limit: q.limit,
        };
      },
    );
  }
  async calculate(
    actor: string,
    rawCycle: unknown,
    rawAnnual: unknown,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const cycleId = parseId(rawCycle),
      annualId = parseId(rawAnnual),
      key = parseKey(rawKey),
      input = parseCalculation(raw),
      hash = digest(JSON.stringify({ cycleId, annualId, input }));
    return this.authorization.withPermission(
      actor,
      "eligibility.calculate",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM payout_eligibility_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This calculation key was already used with different data.",
            );
          return decode<EligibilitySnapshot>(prior[0].result);
        }
        const cycle = await currentPayout(db, cycleId);
        requireOpenPayout(cycle);
        const view = await eligibilityView(db, cycle, annualId);
        if (input.expectedRevision !== (view.latest?.revision ?? 0))
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "A newer calculation exists. Refresh before recalculating.",
          );
        if (input.expectedSourceHash !== view.current.sourceHash)
          throw new AuthError(
            409,
            "SOURCE_CHANGED",
            "Scholarship, official list or document sources changed. Refresh and review the new assessment.",
          );
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const id = randomUUID(),
          revision = input.expectedRevision + 1;
        await db.execute(
          "INSERT INTO payout_eligibility(id,cycle_id,scholarship_id,revision,engine_version,eligible,source_hash,assessment,reason,reference_text,actor_id,actor_name,calculated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            id,
            cycleId,
            annualId,
            revision,
            view.current.engineVersion,
            view.current.eligible,
            view.current.sourceHash,
            JSON.stringify(view.current),
            input.reason,
            input.reference,
            actor,
            users[0].full_name,
          ],
        );
        const result = (await history(db, cycleId, annualId))[0];
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'eligibility.calculated','payout_eligibility',?,'calculate',?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            id,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              cycleId,
              scholarshipId: annualId,
              revision,
              sourceHash: result.sourceHash,
              eligible: result.eligible,
              reasons: result.reasons,
              reference: input.reference,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO payout_eligibility_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(result)],
        );
        return result;
      },
    );
  }
}
