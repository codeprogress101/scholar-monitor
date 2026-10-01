import { requirementState } from "./workflow-state.js";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { parseReceipt } from "./receipt-validation.js";
export type ReceiptResult = {
  id: string;
  instanceId: string;
  version: 1;
  status: "submitted";
};
export class RequirementReceiptService {
  constructor(private authorization: AuthorizationService) {}
  async receive(
    actor: string,
    rawId: unknown,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ): Promise<ReceiptResult> {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      input = parseReceipt(raw),
      hash = digest(JSON.stringify({ id, input }));
    return this.authorization.withPermission(
      actor,
      "requirements.receive",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM requirement_receipt_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This receipt key was already used with different data.",
            );
          return JSON.parse(prior[0].result as string) as ReceiptResult;
        }
        const [rows] = await db.execute<RowDataPacket[]>(
          "SELECT i.status,i.definition_version_id,c.id AS checklist_id,c.scholarship_record_id,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=s.academic_year_id WHERE i.id=? FOR UPDATE",
          [id],
        );
        if (!rows.length)
          throw new AuthError(
            404,
            "REQUIREMENT_NOT_FOUND",
            "Requirement instance not found.",
          );
        const row = rows[0];
        if (row.locked_at || row.year_locked)
          throw new AuthError(
            423,
            "RECORD_LOCKED",
            "The semester or academic year is locked.",
          );
        if (row.archived_at || row.year_archived)
          throw new AuthError(
            409,
            "REFERENCE_ARCHIVED",
            "The semester or academic year is archived.",
          );
        const [receipts] = await db.execute<RowDataPacket[]>(
          "SELECT id FROM requirement_receipts WHERE instance_id=? FOR UPDATE",
          [id],
        );
        // Initial receipt only. F16 must use controlled verification/correction commands.
        if (
          (await requirementState(db, id)).status !== "not_submitted" ||
          row.status !== "not_submitted" ||
          receipts.length
        )
          throw new AuthError(
            409,
            "REQUIREMENT_ALREADY_RECEIVED",
            "This requirement is no longer Not Submitted. Its receipt cannot be overwritten or casually resubmitted. Refresh to view its history.",
          );
        if (input.expectedVersion !== 0)
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "Refresh the requirement before recording receipt.",
          );
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const receiptId = randomUUID();
        await db.execute(
          "INSERT INTO requirement_receipts(id,instance_id,received_on,physical_reference,storage_location,remarks,reason,actor_id,actor_name,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            receiptId,
            id,
            input.receivedOn,
            input.physicalReference,
            input.storageLocation,
            input.remarks,
            input.reason,
            actor,
            users[0].full_name,
          ],
        );
        const result: ReceiptResult = {
          id: receiptId,
          instanceId: id,
          version: 1,
          status: "submitted",
        };
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'requirements.received','requirement_instance',?,'receive',?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            id,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              before: { status: "not_submitted", version: 0 },
              after: {
                ...input,
                status: "submitted",
                version: 1,
                receiptId,
                receiverId: actor,
                receiverName: users[0].full_name,
              },
              checklistId: row.checklist_id,
              scholarshipRecordId: row.scholarship_record_id,
              definitionVersionId: row.definition_version_id,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO requirement_receipt_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(result)],
        );
        return result;
      },
    );
  }
}
