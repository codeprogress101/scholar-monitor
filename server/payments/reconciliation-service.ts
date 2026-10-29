import { digest } from "../auth/crypto.js";
import { AuthError } from "../auth/service.js";
import { AuthorizationService } from "../authorization/service.js";
import { parseId,parseKey } from "../configuration/validation.js";
import { cachedReads } from "../read-cache.js";
import { decodeStoredJson } from "../stored-json.js";
import type { RowDataPacket } from "mysql2/promise";
import { batchMetadata } from "../ovr/detail-reads.js";
import { requireNumberedPayroll } from "../ovr/legacy-boundary.js";
import { OvrProcessingService } from "../ovr/processing-service.js";
import { PaymentCorrectionService } from "../ovr/payment-correction-service.js";
import { parseReconciliation } from "./reconciliation-model.js";
import { reconciliationOverview,reconciliationPage,discrepancyPage,reconciliationHistory,openCase } from "./reconciliation-reads.js";
import { appendReconciliationEvent,completeFinancialBasis } from "./reconciliation-writes.js";

export class PayrollReconciliationService {
 constructor(private authorization:AuthorizationService){}
 summary(actor:string,rawId:unknown){const id=parseId(rawId);return this.authorization.readSnapshot(actor,"ovr.process",(db,access)=>reconciliationOverview(db,id,access.permissions.map(p=>p.code)));}
 page(actor:string,rawId:unknown,raw:unknown){const id=parseId(rawId);return this.authorization.readSnapshot(actor,"ovr.process",(db,access)=>reconciliationPage(db,id,raw,access.permissions.map(p=>p.code)));}
 cases(actor:string,rawId:unknown,raw:unknown){const id=parseId(rawId);return this.authorization.readSnapshot(actor,"ovr.process",async db=>{await requireNumberedPayroll(db,id);return discrepancyPage(db,id,raw);});}
 history(actor:string,rawId:unknown,raw:unknown){const id=parseId(rawId);return this.authorization.readSnapshot(actor,"ovr.process",async db=>{await requireNumberedPayroll(db,id);return reconciliationHistory(db,id,raw);});}
 async command(actor:string,rawId:unknown,rawKey:unknown,raw:unknown,requestId:string){
  const id=parseId(rawId),key=parseKey(rawKey),input=parseReconciliation(raw);
  if(input.action==="correct"){
   const result=await new PaymentCorrectionService(this.authorization).command(actor,id,"coordinator-outcome",key,input,requestId);
   return {batchId:id,revision:result.revision};
  }
  if(input.action==="close"){
   const result=await new OvrProcessingService(this.authorization).command(actor,id,"close",key,{expectedRevision:input.expectedRevision,effectiveOn:input.effectiveOn,reason:"Coordinator reviewed payroll reconciliation",reference:"Reviewed payroll reconciliation",reconciled:input.reviewed,financialBasis:input.sourceHash,expectedReconciliationRevision:input.expectedReconciliationRevision,...(input.overrideReason?{verificationOverrideReason:input.overrideReason}:{})},requestId);
   return {batchId:id,revision:result.revision,state:result.state};
  }
  const hash=digest(JSON.stringify({id,action:"payroll-reconciliation/v1",input}));
  return this.authorization.withPermission(actor,input.action==="dismiss"?"payments.corrections.approve":"ovr.process",async connection=>{
   const [[retry]]=await connection.execute<RowDataPacket[]>("SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=? FOR UPDATE",[actor,key]);
   if(retry){if(retry.payload_hash!==hash)throw new AuthError(409,"IDEMPOTENCY_CONFLICT","Retry the exact saved reconciliation request. This key has different details.");return decodeStoredJson(retry.result);}
   const db=cachedReads(connection),batch=await batchMetadata(db,id),overview=await reconciliationOverview(db,id);
   if(batch.revision!==input.expectedRevision||overview.reconciliationRevision!==input.expectedReconciliationRevision)throw new AuthError(409,"RECONCILIATION_CHANGED","Payroll reconciliation changed. Refresh and review the action again.");
   if(!["finalized","submitted","processed","closed"].includes(batch.state))throw new AuthError(423,"RECORD_LOCKED","A finalized payroll is required for financial discrepancy review.");
   let event;
   if(input.action==="verify"){
    if(batch.state==="closed")throw new AuthError(423,"OVR_ALREADY_CLOSED","Returned Payroll Verification is not available after closure. Original closure evidence remains unchanged.");
    if(batch.state!=="processed")throw new AuthError(423,"RECORD_LOCKED","Mark the payroll Processed before verifying its returned payment records.");
    if(input.sourceHash!==overview.sourceHash)throw new AuthError(409,"RECONCILIATION_CHANGED","Payment evidence changed. Refresh before verifying the returned payroll.");
    const financial=await completeFinancialBasis(db,batch);
    event=await appendReconciliationEvent(db,batch,actor,"verified",{sourceHash:overview.sourceHash,financialHash:financial.basis.sourceHash,rosterHash:financial.frozen.hash,returnedAndCompared:true},requestId,key);
   }else if(input.action==="report"){
    const [[row]]=await db.execute<RowDataPacket[]>("SELECT r.id,i.human_id,CONCAT_WS(' ',s.last_name,s.first_name,NULLIF(s.middle_name,''),NULLIF(s.suffix,'')) AS name,p.id AS payment_id FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id LEFT JOIN payment_records p ON p.scholarship_id=r.id AND p.batch_id=? WHERE r.id=? AND (EXISTS(SELECT 1 FROM payroll_allocations a WHERE a.batch_id=? AND a.scholarship_id=r.id) OR EXISTS(SELECT 1 FROM payroll_reprocessing_attempts t WHERE t.batch_id=? AND t.scholarship_id=r.id))",[id,input.scholarshipId,id,id]);
    if(!row)throw new AuthError(409,"PAYMENT_NOT_IN_ROSTER","Choose a scholar from this finalized payroll.");
    event=await appendReconciliationEvent(db,batch,actor,"reported",{scholarshipId:input.scholarshipId,paymentId:row.payment_id??null,description:input.description,humanId:row.human_id,name:row.name},requestId,key);
   }else{
    const original=await openCase(db,id,input.caseId);
    event=await appendReconciliationEvent(db,batch,actor,"dismissed",{scholarshipId:original.scholarshipId,paymentId:original.paymentId,humanId:original.humanId,name:original.name,description:original.description,reason:input.reason,reportedBy:original.actorName,reportedAt:original.recordedAt},requestId,key,original);
   }
   const result={batchId:id,eventId:event.id,reconciliationRevision:event.revision,kind:event.kind};
   await db.execute("INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",[actor,key,hash,JSON.stringify(result)]);
   return result;
  });
 }
}
