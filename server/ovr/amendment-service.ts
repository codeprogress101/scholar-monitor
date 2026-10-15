import { amendFrozenForm } from "./amended-form.js";
import { validationDetails } from "../validation-details.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { paymentRecords } from "./processing-state.js";
import { ovrHistory } from "./service.js";
import type { OvrBatch, OvrFinalization } from "./model.js";
import {
  amendments,
  effectiveRoster,
  requireAmendable,
  type OvrAmendment,
} from "./amendment-state.js";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const common = {
  expectedRevision: z.number().int().positive(),
  reason: text(5, 500),
  reference: text(3, 300),
};
const requestSchema = z.discriminatedUnion("change", [
  z
    .object({
      ...common,
      change: z.literal("add"),
      scholarshipId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      ...common,
      change: z.literal("remove"),
      scholarshipId: z.string().uuid(),
    })
    .strict(),
  z
    .object({ ...common, change: z.literal("rename"), name: text(2, 160) })
    .strict(),
]);
const decisionSchema = z
  .object({ ...common, amendmentId: z.string().uuid() })
  .strict();
export type AmendmentAction = "request" | "approve" | "reject";
export function parseAmendment(action: AmendmentAction, raw: unknown) {
  const p = (action === "request" ? requestSchema : decisionSchema).safeParse(
    raw,
  );
  if (!p.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current revision, amendment change, reason and reference.",
      validationDetails(p.error),
    );
  return p.data;
}
export class OvrAmendmentService {
  constructor(private authorization: AuthorizationService) {}
  async command(
    actor: string,
    rawId: unknown,
    action: AmendmentAction,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      input = parseAmendment(action, raw),
      hash = digest(
        JSON.stringify({ id, action: "amendment-" + action, input }),
      );
    return this.authorization.withPermission(
      actor,
      action === "request"
        ? "ovr.amendments.request"
        : "ovr.amendments.approve",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [retry] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (retry.length) {
          if (retry[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This command key was used for different evidence.",
            );
          return typeof retry[0].result === "string"
            ? JSON.parse(retry[0].result)
            : retry[0].result;
        }
        const [[managedPayroll]] = await db.execute<RowDataPacket[]>("SELECT batch_id FROM payroll_submission_windows WHERE batch_id=? LOCK IN SHARE MODE", [id]);
        if (managedPayroll) throw new AuthError(409, "MANAGED_RELEASE_REVIEW_REQUIRED", "This numbered payroll has a frozen ordinary semester allocation. Release or amendment needs the corresponding controlled allocation workflow; generating the Payroll Form does not record payment.");
        const previous = (await ovrHistory(db, id))[0];
        requireAmendable(previous.state);

        if (previous.revision !== input.expectedRevision)
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "The Payroll changed. Refresh before continuing.",
          );
        const frozen = await effectiveRoster(db, id);
        if (!frozen)
          throw new AuthError(
            409,
            "OVR_FINALIZATION_REQUIRED",
            "A frozen roster is required.",
          );
        const all = await amendments(db, id),
          pending = all.find((a) => a.state === "pending");
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const now = new Date().toISOString(),
          actorName = String(users[0].full_name),
          revision = previous.revision + 1;
        let amendment: OvrAmendment;
        if (action === "request") {
          if (pending)
            throw new AuthError(
              409,
              "OVR_AMENDMENT_PENDING",
              "Resolve the pending amendment first.",
            );
          if ("change" in input && input.change === "add") throw new AuthError(409, "LEGACY_PAYROLL_READ_ONLY", "Adding a legacy financial entitlement requires reviewed conversion. Historical removal and name corrections remain available.");
          const change = input as z.infer<typeof requestSchema>,
            proposed: OvrFinalization = structuredClone(frozen.snapshot);
          if (change.change === "rename") {
            if (change.name === proposed.name)
              throw new AuthError(
                409,
                "OVR_AMENDMENT_NO_CHANGE",
                "The proposed name is unchanged.",
              );
            proposed.name = change.name;
          } else {
            const index = proposed.entries.findIndex(
              (e) => e.scholarshipId === change.scholarshipId,
            );
            if (change.change === "remove") {
              if (index < 0)
                throw new AuthError(
                  409,
                  "OVR_ENTRY_NOT_FOUND",
                  "Member is not in the effective roster.",
                );
              proposed.entries.splice(index, 1);
            } else {
              if (index >= 0)
                throw new AuthError(
                  409,
                  "OVR_DUPLICATE_ENTRY",
                  "Member is already in this roster.",
                );
              throw new AuthError(409,"LEGACY_PAYROLL_READ_ONLY","New membership requires reviewed conversion.");
            }
          }
          if(!proposed.entries.length)throw new AuthError(409,"EMPTY_PAYROLL","An effective payroll must retain at least one member. Preserve the original and reconcile cancellation separately.");
          if(change.change === "remove" && (await paymentRecords(db,id)).some(p=>p.scholarshipId===change.scholarshipId))throw new AuthError(409,"PAYMENT_HISTORY_PRESENT","A member with payment history cannot be removed from its financial roster. Use controlled payment correction.");
          proposed.validation={...frozen.snapshot.validation,entries:frozen.snapshot.validation.entries.filter(e=>proposed.entries.some(p=>p.scholarshipId===e.scholarshipId)),issues:frozen.snapshot.validation.issues.filter(i=>!i.scholarshipId || proposed.entries.some(p=>p.scholarshipId===i.scholarshipId))};
          proposed.legacyPayrollForm=amendFrozenForm(proposed).legacyPayrollForm;

          if (!proposed.validation.valid)
            throw new AuthError(
              409,
              "OVR_VALIDATION_FAILED",
              "The proposed roster is not eligible.",
              { validation: proposed.validation },
            );
          amendment = {
            id: randomUUID(),
            version: 1,
            batchId: id,
            revision,
            state: "pending",
            change: change.change,
            ...("scholarshipId" in change
              ? { scholarshipId: change.scholarshipId }
              : { name: change.name }),
            reason: input.reason,
            reference: input.reference,
            requestedBy: actor,
            requestedByName: actorName,
            requestedAt: now,
            before: frozen.snapshot,
            beforeHash: frozen.hash,
            proposed,
          };
        } else {
          const decision = input as z.infer<typeof decisionSchema>;
          if (!pending || pending.id !== decision.amendmentId)
            throw new AuthError(
              409,
              "OVR_AMENDMENT_NOT_PENDING",
              "This amendment is no longer pending.",
            );
          amendment = {
            ...pending,
            version: 2,
            revision,
            state: action === "approve" ? "approved" : "rejected",
            decidedBy: actor,
            decidedByName: actorName,
            decidedAt: now,
            decisionReason: input.reason,
            decisionReference: input.reference,
          };
          if (action === "approve") {
            if (pending.beforeHash !== frozen.hash)
              throw new AuthError(
                409,
                "VERSION_CONFLICT",
                "The effective roster changed.",
              );
            if(pending.change === "add")throw new AuthError(409,"LEGACY_PAYROLL_READ_ONLY","Reject pending legacy additions and use reviewed conversion.");
            if(pending.change === "remove" && (await paymentRecords(db,id)).some(p=>p.scholarshipId===pending.scholarshipId))throw new AuthError(409,"PAYMENT_HISTORY_PRESENT","Payment history now exists for this member; removal is blocked.");
            const validation=pending.proposed.validation;
            amendment.after = {
              ...amendFrozenForm(pending.proposed),
              revision,
              validation,
              finalizedAt: now,
              finalizedBy: actor,
              finalizedByName: actorName,
              reason: input.reason,
              reference: input.reference,
            };
            amendment.afterHash = digest(JSON.stringify(amendment.after));
          }
        }
        const batch: OvrBatch = {
          ...previous,
          revision,
          action: "amendment-" + action,
          actorId: actor,
          actorName,
          recordedAt: now,
          reason: input.reason,
          reference: input.reference,
        };
        if (action === "approve") {
          batch.state = "finalized";
          batch.name = amendment.after!.name;
          delete batch.administration;
          delete batch.processing;
          delete batch.closure;
          delete batch.payment;
        }
        await db.execute(
          "INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            id,
            revision,
            batch.state,
            batch.action,
            JSON.stringify(batch),
            actor,
          ],
        );
        if (action === "approve" && amendment.change !== "rename") {
          const entry = (
            amendment.change === "add" ? amendment.after! : amendment.before
          ).entries.find((e) => e.scholarshipId === amendment.scholarshipId)!;
          await db.execute(
            "INSERT INTO ovr_entries(batch_id,batch_revision,scholarship_id,action,evidence) VALUES(?,?,?,?,?)",
            [
              id,
              revision,
              entry.scholarshipId,
              amendment.change,
              JSON.stringify(entry.evidence),
            ],
          );
        }
        await db.execute(
          "INSERT INTO ovr_amendments(id,version,batch_id,batch_revision,state,snapshot,actor_id,occurred_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            amendment.id,
            amendment.version,
            id,
            revision,
            amendment.state,
            JSON.stringify(amendment),
            actor,
          ],
        );
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'ovr.amendment','ovr_batches',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            id,
            action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              amendmentId: amendment.id,
              revision,
              reference: input.reference,
              before: amendment.before,
              after: amendment.after ?? null,
              beforeHash: amendment.beforeHash,
              afterHash: amendment.afterHash ?? null,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(batch)],
        );
        return batch;
      },
    );
  }
}
