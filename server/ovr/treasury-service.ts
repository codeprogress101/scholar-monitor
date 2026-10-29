import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { today } from "../scholars/validation.js";
import { ovrHistory } from "./service.js";
import { requireNumberedPayroll } from "./legacy-boundary.js";
import { paymentRecords } from "./processing-state.js";
import { treasuryEvidence } from "./treasury-state.js";
import { effectiveRoster } from "./amendment-state.js";
import { currentPayout } from "../payouts/service.js";
import { assertNoPaidClaim, claimDeadline } from "./reprocessing.js";
import { assertNoIndividualRoute } from "../payments/individual-writes.js";
import { OvrProcessingService, parseProcessing } from "./processing-service.js";

const schema = z.object({expectedRevision: z.number().int().min(0),
  payrollReference: z.string().trim().min(3).max(300),
  officeReceivedOn: z.iso.date().refine(d => d >= "1900-01-01" && d <= today()),
  reason: z.string().trim().min(5).max(500),
}).strict();
export class TreasuryService {
  constructor(private authorization: AuthorizationService) {}
  async historical(actor: string, rawId: unknown, action: "request" | "approve" | "reject", rawKey: unknown, raw: unknown, requestId: string) {
    const id=parseId(rawId), key=parseKey(rawKey);
    const requestSchema=z.object({expectedRevision:z.number().int().positive(),scholarshipId:z.uuid(),evidenceRevision:z.number().int().positive(),actualPaidOn:z.iso.date().nullable(),beforeDeadlineEvidence:z.string().trim().min(20).max(1000),receiptConfirmed:z.literal(true)}).strict();
    const decisionSchema=z.object({expectedRevision:z.number().int().positive(),receiptId:z.uuid(),reason:z.string().trim().min(5).max(500),verifiedBeforeDeadline:z.literal(true).optional()}).strict();
    const parsed=(action === "request" ? requestSchema : decisionSchema).safeParse(raw);
    if(!parsed.success)throw new AuthError(422,"VALIDATION_FAILED","Provide the selected scholar, current evidence and documentary proof of receipt before expiry, or a current reviewed decision.");
    const input=parsed.data,hash=digest(JSON.stringify({id,action:`historical-${action}`,input}));
    return this.authorization.withPermission(actor,action === "request" ? "ovr.process" : "payments.corrections.approve",async db=>{
      const [[retry]]=await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=?",[actor,key]);
      if(retry){if(retry.payload_hash!==hash)throw new AuthError(409,"IDEMPOTENCY_CONFLICT","This key was already used.");return typeof retry.result === "string" ? JSON.parse(retry.result) : retry.result;}
      await requireNumberedPayroll(db,id);
      const batch=(await ovrHistory(db,id))[0],cycle=await currentPayout(db,batch.cycleId),deadline=await claimDeadline(db,cycle.semesterId),frozen=await effectiveRoster(db,id),evidence=await treasuryEvidence(db,id);
      if(batch.revision!==input.expectedRevision)throw new AuthError(409,"VERSION_CONFLICT","The payroll changed. Refresh before reviewing the receipt.");
      if(!frozen || !evidence)throw new AuthError(409,"TREASURY_EVIDENCE_REQUIRED","A frozen payroll and batch Treasury evidence are required.");
      type Receipt={id:string;scholarshipId:string;evidenceRevision:number;actualPaidOn:string|null;beforeDeadlineEvidence:string;requestedBy:string;frozenHash:string;endsOn:string;state:string;version:number};
      let receipt:Receipt;
      if("scholarshipId" in input){
        if(!deadline.expired || !deadline.endsOn)throw new AuthError(409,"HISTORICAL_RECONCILIATION_ONLY","Use ordinary confirmation during the open claim period.");
        if(input.evidenceRevision!==evidence.revision)throw new AuthError(409,"VERSION_CONFLICT","Treasury evidence changed.");
        if(!frozen.snapshot.entries.some(e=>e.scholarshipId===input.scholarshipId))throw new AuthError(409,"PAYMENT_NOT_IN_ROSTER","Select a member of this frozen payroll.");
        if(input.actualPaidOn && (input.actualPaidOn>deadline.endsOn || input.actualPaidOn>evidence.officeReceivedOn))throw new AuthError(422,"INVALID_PAYMENT_DATE","Historical receipt must precede expiry and receipt of the signed evidence.");
        await assertNoPaidClaim(db,input.scholarshipId,cycle.semesterId);
        await assertNoIndividualRoute(db,input.scholarshipId,cycle.semesterId);
        if ((await paymentRecords(db,id)).some(p=>p.scholarshipId===input.scholarshipId))throw new AuthError(409,"PAYMENT_CORRECTION_REQUIRED","This attempt already has an outcome. Use its controlled payment correction workflow.");
        receipt={id:randomUUID(),scholarshipId:input.scholarshipId,evidenceRevision:input.evidenceRevision,actualPaidOn:input.actualPaidOn,beforeDeadlineEvidence:input.beforeDeadlineEvidence,requestedBy:actor,frozenHash:frozen.hash,endsOn:deadline.endsOn,state:"pending",version:1};
      }else{
        const [[row]]=await db.execute<RowDataPacket[]>("SELECT snapshot FROM payroll_historical_receipts WHERE id=? AND batch_id=? ORDER BY version DESC LIMIT 1",[input.receiptId,id]);
        if(!row)throw new AuthError(404,"RECEIPT_NOT_FOUND","Historical receipt request not found.");
        receipt=typeof row.snapshot === "string" ? JSON.parse(row.snapshot) : row.snapshot;
        if(receipt.state!=="pending")throw new AuthError(409,"RECEIPT_NOT_PENDING","The receipt has already been decided.");
        if(action === "approve"){
          if(!input.verifiedBeforeDeadline)throw new AuthError(422,"PRIOR_RECEIPT_CONFIRMATION_REQUIRED","Verify the documentary evidence establishes actual receipt before expiry. Approval does not authorize collection.");
          if(receipt.frozenHash!==frozen.hash || receipt.evidenceRevision!==evidence.revision || receipt.endsOn!==deadline.endsOn)throw new AuthError(409,"SOURCE_CHANGED","Roster, evidence or deadline changed. Reject this request and submit updated evidence.");
          const payment=parseProcessing("record-payment",{expectedRevision:batch.revision,scholarshipId:receipt.scholarshipId,treasuryEvidenceRevision:evidence.revision,effectiveOn:receipt.actualPaidOn,outcome:"paid",amount:"5000.00",reason:input.reason,reference:evidence.payrollReference,remarks:receipt.beforeDeadlineEvidence,receiptConfirmed:true});
          await new OvrProcessingService(this.authorization).execute(db,actor,id,"record-payment",key,payment,hash,requestId,receipt.id);
        }
        receipt={...receipt,state:action === "approve" ? "approved" : "rejected",version:receipt.version+1};
      }
      await db.execute("INSERT INTO payroll_historical_receipts(id,version,batch_id,scholarship_id,state,snapshot,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",[receipt.id,receipt.version,id,receipt.scholarshipId,receipt.state,JSON.stringify(receipt),actor]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'treasury.historical','ovr_batches',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),id,action,actor,requestId,"reason" in input ? input.reason : "Historical receipt submitted for review",JSON.stringify({receipt,input,idempotency_key:key})]);
      await db.execute("INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",[actor,key,hash,JSON.stringify(receipt)]);
      return receipt;
    });
  }
  async record(actor: string, rawId: unknown, rawKey: unknown, raw: unknown, requestId: string) {
    const id = parseId(rawId), key = parseKey(rawKey), parsed = schema.safeParse(raw);
    if (!parsed.success) throw new AuthError(422,"VALIDATION_FAILED","Provide a payroll reference, office receipt date and evidence revision reason.");
    const input = parsed.data, hash = digest(JSON.stringify({id, action:"treasury-evidence", input}));
    return this.authorization.withPermission(actor,"ovr.process",async (db, access) => {
      const [[retry]] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=?",[actor,key]);
      if (retry) {
        if (retry.payload_hash !== hash) throw new AuthError(409,"IDEMPOTENCY_CONFLICT","This key was used for different evidence.");
        return typeof retry.result === "string" ? JSON.parse(retry.result) : retry.result;
      }
      await requireNumberedPayroll(db,id);
      const batch = (await ovrHistory(db,id))[0];
      if (!["finalized","submitted","processed","closed"].includes(batch.state)) throw new AuthError(409,"OVR_FINALIZATION_REQUIRED","Select a finalized payroll.");
      const previous = await treasuryEvidence(db,id);
      if ((previous?.revision ?? 0) !== input.expectedRevision) throw new AuthError(409,"VERSION_CONFLICT","Treasury evidence changed. Review it again.");
      // Corrections to evidence are controlled even before it is used, so Staff cannot replace an office record silently.
      if (previous && !access.permissions.some(p => p.code === "ovr.close")) throw new AuthError(403,"TREASURY_REVISION_REQUIRES_COORDINATOR","A Coordinator must record a reasoned correction to existing Treasury evidence.");
      const revision = input.expectedRevision + 1;
      await db.execute("INSERT INTO payroll_treasury_evidence(batch_id,revision,payroll_reference,office_received_on,reason,actor_id,recorded_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",[id,revision,input.payrollReference,input.officeReceivedOn,input.reason,actor]);
      const result = await treasuryEvidence(db,id);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'treasury.evidence','ovr_batches',?,'record',?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),id,actor,requestId,input.reason,JSON.stringify({before:previous,after:result,idempotency_key:key})]);
      await db.execute("INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",[actor,key,hash,JSON.stringify(result)]);
      return result;
    });
  }
}
