import { validationDetails } from "../validation-details.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { currentPayout, requireOpenPayout } from "../payouts/service.js";
import { eligibilityView } from "./service.js";
import { overrideHistory, currentOverrides } from "./override-state.js";
import type {
  EligibilityOverride,
  OverrideAction,
  OverrideState,
} from "./override-model.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const evidence = {
  expectedRevision: z.number().int().min(0),
  reason: text(5, 500),
  reference: text(3, 300),
};
const baseline = {
  calculationId: z.string().uuid(),
  expectedSourceHash: z.string().regex(/^[a-f0-9]{64}$/),
};
const requestSchema = z
  .object({
    ...evidence,
    ...baseline,
    requestedEligible: z.boolean(),
    reasonCode: text(2, 60).regex(/^[A-Z][A-Z0-9_]+$/),
    justification: text(10, 2000),
    authorityReference: text(3, 300),
  })
  .strict();
const reviewSchema = z.object(evidence).strict();
const reevaluateSchema = z.object({ ...evidence, ...baseline }).strict();
export function parseOverride(action: OverrideAction, raw: unknown) {
  const result = (
    action === "request"
      ? requestSchema
      : action === "reevaluate"
        ? reevaluateSchema
        : reviewSchema
  ).safeParse(raw);
  if (!result.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current revision, reason, reference and all required override evidence.",
      validationDetails(result.error),
    );
  return result.data;
}
export function overrideTransition(
  action: OverrideAction,
  state: OverrideState | null,
  owner: boolean,
): OverrideState {
  if (action === "request" && state === null) return "draft";
  if ((action === "approve" || action === "reject") && owner)
    throw new AuthError(
      403,
      "SEPARATE_APPROVER_REQUIRED",
      "A separate Coordinator must review this request.",
    );
  if (["submit-review", "reevaluate", "cancel"].includes(action) && !owner)
    throw new AuthError(
      403,
      "REQUEST_OWNER_REQUIRED",
      "Only the requester can submit, re-evaluate or cancel this request.",
    );
  if (action === "submit-review" && state === "draft") return "pending";
  if (action === "reevaluate" && (state === "draft" || state === "pending"))
    return "draft";
  if (action === "cancel" && (state === "draft" || state === "pending"))
    return "cancelled";
  if (action === "approve" && state === "pending") return "approved";
  if (action === "reject" && state === "pending") return "rejected";
  throw new AuthError(
    409,
    "INVALID_OVERRIDE_STATE",
    "This override action is not available in the current state.",
  );
}
export class EligibilityOverrideService {
  constructor(private authorization: AuthorizationService) {}
  async command(
    actor: string,
    rawCycle: unknown,
    rawAnnual: unknown,
    rawId: unknown,
    action: OverrideAction,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const cycleId = parseId(rawCycle),
      annualId = parseId(rawAnnual),
      id = action === "request" ? null : parseId(rawId),
      key = parseKey(rawKey),
      input = parseOverride(action, raw);
    const hash = digest(
      JSON.stringify({ cycleId, annualId, id, action, input }),
    );
    return this.authorization.withPermission(
      actor,
      action === "approve" || action === "reject"
        ? "eligibility.overrides.approve"
        : "eligibility.overrides.request",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [retry] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM eligibility_override_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (retry.length) {
          if (retry[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This override command key was used with different data.",
            );
          return (
            typeof retry[0].result === "string"
              ? JSON.parse(retry[0].result)
              : retry[0].result
          ) as EligibilityOverride;
        }
        const cycle = await currentPayout(db, cycleId);
        requireOpenPayout(cycle);
        const view = await eligibilityView(db, cycle, annualId);
        const records = currentOverrides(
          await overrideHistory(db, cycleId, annualId),
        );
        const previous = id ? records.find((r) => r.id === id) : undefined;
        if (id && !previous)
          throw new AuthError(
            404,
            "OVERRIDE_NOT_FOUND",
            "Override request not found in this scholarship and payout cycle.",
          );
        if (input.expectedRevision !== (previous?.revision ?? 0))
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "The override changed. Refresh and review it again.",
          );
        const state = overrideTransition(
          action,
          previous?.state ?? null,
          previous?.requesterId === actor,
        );
        if (
          action === "request" &&
          records.some((r) => r.state === "draft" || r.state === "pending")
        )
          throw new AuthError(
            409,
            "OVERRIDE_PENDING",
            "Resolve the existing draft or pending override first.",
          );
        let calculation = previous?.calculation;
        if (action === "request" || action === "reevaluate") {
          const source = input as z.infer<typeof reevaluateSchema>;
          if (
            !view.latest ||
            view.stale ||
            view.latest.id !== source.calculationId ||
            source.expectedSourceHash !== view.current.sourceHash
          )
            throw new AuthError(
              409,
              "ELIGIBILITY_DATA_CHANGED",
              "Save a fresh normal calculation and re-evaluate the override against its current sources.",
            );
          calculation = view.latest;
        } else if (action === "submit-review" || action === "approve") {
          if (calculation?.sourceHash !== view.current.sourceHash)
            throw new AuthError(
              409,
              "ELIGIBILITY_DATA_CHANGED",
              "Eligibility sources changed. The requester must save a fresh calculation, re-evaluate, and submit for review again.",
            );
        }
        if (!calculation) throw new Error("Override calculation missing");
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const fields = input as z.infer<typeof requestSchema>;
        const result: EligibilityOverride = {
          ...(previous ?? {
            id: randomUUID(),
            cycleId,
            scholarshipId: annualId,
            requesterId: actor,
            requesterName: users[0].full_name,
            requestedEligible: fields.requestedEligible,
            reasonCode: fields.reasonCode,
            justification: fields.justification,
            authorityReference: fields.authorityReference,
            originalCalculation: calculation,
          }),
          calculation,
          revision: input.expectedRevision + 1,
          state,
          action,
          actorId: actor,
          actorName: users[0].full_name,
          occurredAt: new Date().toISOString(),
          reason: input.reason,
          reference: input.reference,
        };
        if (action === "request")
          await db.execute(
            "INSERT INTO eligibility_overrides(id,cycle_id,scholarship_id,requester_id,created_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))",
            [result.id, cycleId, annualId, actor],
          );
        await db.execute(
          "INSERT INTO eligibility_override_events(override_id,revision,action,state,calculation_id,actor_id,snapshot,occurred_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            result.id,
            result.revision,
            action,
            state,
            calculation.id,
            actor,
            JSON.stringify(result),
          ],
        );
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'eligibility.override','eligibility_overrides',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            result.id,
            action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              cycleId,
              scholarshipId: annualId,
              revision: result.revision,
              state,
              calculationId: calculation.id,
              sourceHash: calculation.sourceHash,
              requestedEligible: result.requestedEligible,
              fromState: previous?.state ?? null,
              toState: result.state,
              originalCalculation: result.originalCalculation,
              calculation: result.calculation,
              reasonCode: result.reasonCode,
              authorityReference: result.authorityReference,
              reference: input.reference,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO eligibility_override_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(result)],
        );
        return result;
      },
    );
  }
}
