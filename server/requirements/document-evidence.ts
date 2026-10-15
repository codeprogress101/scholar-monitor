import { randomUUID } from "node:crypto";
import type { PoolConnection } from "mysql2/promise";
import { z } from "zod";
import { AuthError } from "../auth/service.js";

export const documentTypeSchema = z.enum(["cor", "certificate_of_enrollment", "cog", "shs_grading_card"]);
export type ReceivedDocumentType = z.infer<typeof documentTypeSchema>;

/** Coverage owns the obligation; the receipt identifies the actual paper submitted. */
export function receivedDocumentType(kind: "cor" | "cog" | undefined, supplied?: ReceivedDocumentType, entrantApproved=false): ReceivedDocumentType | null {
  if (!kind) {
    if (supplied) throw new AuthError(409, "DOCUMENT_ALTERNATIVE_UNAVAILABLE", "Document alternatives require explicit semester coverage. Use the existing definition for this earlier annual record.");
    return null;
  }
  const type = supplied ?? (entrantApproved ? 'shs_grading_card' : kind);
  if(entrantApproved && kind==='cog') {
    if(type!=='shs_grading_card') throw new AuthError(422,'DOCUMENT_TYPE_CONFLICT','This reviewed coverage requires the approved senior-high-school grading card.');
    return type;
  }
  if ((kind === "cog" && type !== "cog") || (kind === "cor" && !["cor","certificate_of_enrollment"].includes(type)))
    throw new AuthError(422, "DOCUMENT_TYPE_CONFLICT", "Enrollment requires COR or Certificate of Enrollment. Grades require a separate COG.");
  return type;
}

export async function recordDocumentEvidence(db: PoolConnection, actor: string, instance: string, type: ReceivedDocumentType | null, source: { receiptId: string } | { eventId: string }, entrantReviewId?:string) {
  if (!type) return;
  await db.execute("INSERT INTO requirement_document_evidence(id,instance_id,receipt_id,workflow_event_id,document_type,entrant_review_id,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [randomUUID(), instance, "receiptId" in source ? source.receiptId : null, "eventId" in source ? source.eventId : null, type, entrantReviewId??null,actor]);
}
