import { reusedOwner, requireActiveDocument, legacyReceiptBlocker } from "./reused-source.js";
import { today } from "../scholars/validation.js";
import { semesterRequirementContext } from "./semester-context.js";
import { loadRequirementTiming, type RequirementTimingView } from "./timing-service.js";
import { receivedDocumentType, recordDocumentEvidence } from "./document-evidence.js";
import { guardPayoutRequirement } from "../payouts/service.js";
import { requirementState } from "./workflow-state.js";
import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { parseBatchReceipt, parseReceipt } from "./receipt-validation.js";
export type ReceiptResult = {
  timing?: RequirementTimingView;
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
        const result = await this.record(db, actor, id, input, requestId, key);
        await db.execute(
          "INSERT INTO requirement_receipt_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(result)],
        );
        return result;
      },
    );
  }
  async receiveBatch(
    actor: string,
    rawId: unknown,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const checklistId = parseId(rawId),
      key = parseKey(rawKey),
      input = parseBatchReceipt(raw);
    const hash = digest(JSON.stringify({ batch: checklistId, input }));
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
          return JSON.parse(prior[0].result as string) as {
            items: ReceiptResult[];
          };
        }
        const receivedOn = input.receivedOn ?? today();
        const results: ReceiptResult[] = [];
        for (const item of [...input.items].sort((a, b) =>
          a.id.localeCompare(b.id),
        )) {
          const [rows] = await db.execute<RowDataPacket[]>(
            "SELECT checklist_id FROM requirement_instances WHERE id=? FOR UPDATE",
            [item.id],
          );
          const [[target]] = await db.execute<RowDataPacket[]>("SELECT scholar_semester_id FROM requirement_checklists WHERE id=?", [checklistId]);
          const reuse = target?.scholar_semester_id ? await reusedOwner(db, item.id) : null;
          if (rows[0]?.checklist_id !== checklistId && (!reuse || reuse !== target?.scholar_semester_id))
            throw new AuthError(
              422,
              "WRONG_CHECKLIST",
              "All selected documents must belong to the selected period.",
            );
          results.push(
            await this.record(
              db,
              actor,
              item.id,
              {
                expectedVersion: item.expectedVersion,
                documentType: item.documentType,
                entrantCardId: item.entrantCardId,
                receivedOn,
                physicalReference: input.physicalReference,
                storageLocation: input.storageLocation ?? "",
                remarks: input.remarks,
                reason: "Physical documents received together",
              },
              requestId,
              key,
            ),
          );
        }
        const result = { items: results };
        await db.execute(
          "INSERT INTO requirement_receipt_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, JSON.stringify(result)],
        );
        return result;
      },
    );
  }
  /** Caller must hold mutation authorization and transaction. */
  async record(
    db: PoolConnection,
    actor: string,
    id: string,
    rawInput: ReturnType<typeof parseReceipt>,
    requestId: string,
    key: string,
  ): Promise<ReceiptResult> {
    const input = { ...rawInput, receivedOn: rawInput.receivedOn ?? today() };
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT i.status,i.definition_version_id,c.id AS checklist_id,c.scholarship_record_id,c.scholar_semester_id,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=s.academic_year_id WHERE i.id=? FOR UPDATE",
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
    await requireActiveDocument(db, id, row.scholar_semester_id);
    const sourceBlocker = row.scholar_semester_id ? await legacyReceiptBlocker(db, row.scholar_semester_id) : null;
    if (sourceBlocker) throw new AuthError(409, "DOCUMENT_SOURCE_REVIEW_REQUIRED", sourceBlocker);
    row.scholar_semester_id ??= await reusedOwner(db, id);
    const coverage = await semesterRequirementContext(db, id, row.scholar_semester_id);
    if(coverage?.entrantCard?.mode==='initial_requirements')throw new AuthError(409,'DOCUMENT_NOT_REQUIRED','COG is not required under the approved first-semester exception. Receive the current COR only.');
    if(input.entrantCardId!==coverage?.entrantCard?.id) throw new AuthError(409,'SOURCE_CHANGED','The approved grading-card coverage changed. Reload before receiving.');
    const documentType = receivedDocumentType(coverage?.documentKind, input.documentType, Boolean(coverage?.entrantCard));
    await guardPayoutRequirement(db, id);
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
    await recordDocumentEvidence(db, actor, id, documentType, { receiptId },coverage?.entrantCard?.id);
    const timing = row.scholar_semester_id ? await loadRequirementTiming(db, id) : null;
    const result: ReceiptResult = {
      ...(timing?.mode === "managed" ? { timing } : {}),
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
            ...(timing?.mode === "managed" ? { timing } : {}),
            ...input,
            documentType,
            status: "submitted",
            version: 1,
            receiptId,
            receiverId: actor,
            receiverName: users[0].full_name,
          },
          checklistId: row.checklist_id,
          scholarshipRecordId: row.scholarship_record_id,
          ...(row.scholar_semester_id ? { scholarSemesterId: row.scholar_semester_id } : {}),
          definitionVersionId: row.definition_version_id,
          idempotency_key: key,
        }),
      ],
    );
    return result;
  }
}
