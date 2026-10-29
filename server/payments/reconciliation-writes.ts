import { randomUUID } from "node:crypto";
import type { PoolConnection,RowDataPacket } from "mysql2/promise";
import { digest } from "../auth/crypto.js";
import { AuthError } from "../auth/service.js";
import { encodeStoredJson } from "../stored-json.js";
import { effectiveRoster,amendments } from "../ovr/amendment-state.js";
import { paymentRecords } from "../ovr/processing-state.js";
import { paymentCorrections } from "../ovr/payment-correction-state.js";
import { treasuryEvidence,historicalReceipts } from "../ovr/treasury-state.js";
import { semesterClaims } from "../ovr/detail-reads.js";
import type { OvrBatch } from "../ovr/model.js";
import { existingFinancialBasis } from "./financial-basis.js";
import { reconciliationOverview,reconciliationRevision,openCase } from "./reconciliation-reads.js";
import type { ReconciliationEvent,ClosureEvidence,ClosureMember } from "./reconciliation-model.js";

export async function completeFinancialBasis(db:PoolConnection,batch:OvrBatch){
 const frozen=await effectiveRoster(db,batch.id);
 if(!frozen)throw new AuthError(409,"OVR_FINALIZATION_REQUIRED","A verified finalized payroll is required.");
 const payments=await paymentRecords(db,batch.id);
 const basis=existingFinancialBasis({scope:"complete_batch",batch,finalization:frozen,effectiveFinalization:frozen,payments,originalPayments:await paymentRecords(db,batch.id,true),paymentCorrections:await paymentCorrections(db,batch.id),amendments:await amendments(db,batch.id),treasuryEvidence:await treasuryEvidence(db,batch.id),historicalReceipts:await historicalReceipts(db,batch.id)});
 return {frozen,payments,basis};
}
/** Caller owns withPermission's guard/transaction. P03 evidence is deliberately
 * separate from the financial batch revision; verifying does not stale itself. */
export async function appendReconciliationEvent(db:PoolConnection,batch:OvrBatch,actor:string,kind:ReconciliationEvent["kind"],payload:object,requestId:string,key:string,caseSource?:ReconciliationEvent){
 const [[user]]=await db.execute<RowDataPacket[]>("SELECT full_name FROM users WHERE id=?",[actor]);
 const id=randomUUID(),revision=await reconciliationRevision(db,batch.id)+1;
 const event={...payload,id,batchId:batch.id,revision,batchRevision:batch.revision,kind,actorId:actor,actorName:String(user.full_name),recordedAt:new Date().toISOString(),...(kind==="reported"?{caseId:id}:caseSource?{caseId:caseSource.id}: {})} as ReconciliationEvent;
 await db.execute("INSERT INTO payroll_reconciliation_events(id,batch_id,revision,batch_revision,kind,case_id,case_version,scholarship_id,payment_id,snapshot,snapshot_hash,actor_id,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
 [id,batch.id,revision,batch.revision,kind,event.caseId??null,event.caseId?(kind==="reported"?1:2):null,event.scholarshipId??null,event.paymentId??null,encodeStoredJson(event),digest(JSON.stringify(event)),actor]);
 await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'payroll.reconciliation','ovr_batches',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
 [randomUUID(),batch.id,kind,actor,requestId,event.reason??(kind==="verified"?"Returned payroll received and manually compared":kind==="reported"?event.description??"Payment discrepancy reported":"Payroll reconciliation recorded"),JSON.stringify({eventId:id,revision,batchRevision:batch.revision,caseId:event.caseId??null,sourceHash:event.sourceHash??null,idempotency_key:key})]);
 return event;
}
export async function resolveCorrectedCase(db:PoolConnection,batch:OvrBatch,actor:string,caseId:string,paymentId:string,correctionId:string,reason:string,requestId:string,key:string){
 const original=await openCase(db,batch.id,caseId);
 if(original.paymentId&&original.paymentId!==paymentId)throw new AuthError(409,"DISCREPANCY_PAYMENT_CHANGED","Review the discrepancy against its current payment before correcting it.");
 return appendReconciliationEvent(db,batch,actor,"corrected",{scholarshipId:original.scholarshipId,paymentId,humanId:original.humanId,name:original.name,description:original.description,reason,correctionId,reportedBy:original.actorName,reportedAt:original.recordedAt},requestId,key,original);
}
export type CloseReview={financialBasis?:string;expectedReconciliationRevision?:number;verificationOverrideReason?:string};
export async function prepareClosure(db:PoolConnection,batch:OvrBatch,input:CloseReview){
 const overview=await reconciliationOverview(db,batch.id,["ovr.close"]);
 if(input.financialBasis&&input.financialBasis!==overview.sourceHash||input.expectedReconciliationRevision!==undefined&&input.expectedReconciliationRevision!==overview.reconciliationRevision)
  throw new AuthError(409,"RECONCILIATION_CHANGED","Payroll reconciliation changed. Refresh and review it again.");
 if(overview.unresolvedDiscrepancies)throw new AuthError(409,"DISCREPANCY_UNRESOLVED","Resolve every payment discrepancy before closing payroll. A verification override cannot bypass this.");
 if(overview.pendingCorrections||overview.pendingHistoricalReceipts)throw new AuthError(409,"PAYMENT_CORRECTION_PENDING","Resolve pending financial corrections and historical receipt evidence before closing payroll.");
 if(!overview.recordingComplete)throw new AuthError(409,"PAYMENT_RECORDING_INCOMPLETE","Every finalized scholar needs a valid Paid or Unclaimed outcome. Pending, Withheld and Review entries block closure.");
 const financial=await completeFinancialBasis(db,batch);
 const verified=overview.verificationEvent?.sourceHash===overview.sourceHash&&overview.verificationEvent?.financialHash===financial.basis.sourceHash;
 if(!verified&&!input.verificationOverrideReason)throw new AuthError(409,"RETURNED_VERIFICATION_REQUIRED","Verify the returned payroll or explicitly use the Coordinator verification-only override with a reason.");
 const ids=financial.frozen.snapshot.entries.map(e=>e.scholarshipId),claims=await semesterClaims(db,ids,financial.frozen.snapshot.cycle.semesterId);
 for(const id of ids){const claim=claims.get(id);if(!claim||claim.pending.length||claim.attempts.filter(p=>p.outcome==="paid").length>1)throw new AuthError(409,"FINANCIAL_CONFLICT","Resolve conflicting semester payment evidence before closing payroll.");}
 for(let offset=0;offset<ids.length;offset+=200){const selected=ids.slice(offset,offset+200);
  const [[pending]]=await db.execute<RowDataPacket[]>(`SELECT h.id FROM payroll_historical_receipts h JOIN ovr_batches b ON b.id=h.batch_id JOIN payout_cycles c ON c.id=b.cycle_id JOIN scholarship_records r ON r.id=h.scholarship_id JOIN scholarship_records target ON target.scholar_id=r.scholar_id WHERE target.id IN (${selected.map(()=>"?").join(",")}) AND c.semester_id=? AND h.state='pending' AND NOT EXISTS(SELECT 1 FROM payroll_historical_receipts n WHERE n.id=h.id AND n.version>h.version) LIMIT 1`,[...selected,financial.frozen.snapshot.cycle.semesterId]);
  if(pending)throw new AuthError(409,"HISTORICAL_RECEIPT_PENDING","Resolve the conflicting semester historical-receipt request before closing payroll. Verification override cannot bypass financial evidence.");
 }
 const form=financial.frozen.snapshot.payrollForm??financial.frozen.snapshot.legacyPayrollForm;
 if(!form||form.rows.length!==ids.length)throw new AuthError(409,"CLOSURE_ROSTER_UNAVAILABLE","Complete historical payroll identity and placement are required for the original closure snapshot.");
 const payments=new Map(financial.payments.map(p=>[p.scholarshipId,p]));
 const rows:ClosureMember[]=form.rows.map((row,i)=>{
  const p=payments.get(row.scholarshipId);
  if(!p||p.outcome!=="paid"&&p.unpaidReason!=="did_not_claim")throw new AuthError(409,"PAYMENT_RECORDING_INCOMPLETE","Resolve every payment outcome before closure.");
  return {position:i+1,scholarshipId:row.scholarshipId,scholarId:row.scholarId,humanId:row.humanId,name:[row.lastName,row.firstName,row.middleName].filter(Boolean).join(", "),school:row.school,course:row.course,yearLevel:row.yearLevel,academicYear:overview.summary.academicYear,semester:overview.summary.semester,amount:(row.amountCentavos/100).toFixed(2),outcome:p.outcome==="paid"?"paid":"unclaimed",actualPaidOn:p.outcome==="paid"?p.effectiveOn:null,paymentId:p.id,paymentRevision:p.revision};
 });
 if(new Set(rows.map(r=>r.scholarshipId)).size!==ids.length||rows.reduce((n,r)=>n+Math.round(Number(r.amount)*100),0)!==Math.round(Number(overview.summary.totalAmount)*100))throw new AuthError(409,"PAYROLL_ALLOCATION_MISMATCH","Reconcile the frozen payroll amounts and membership before closure.");
 return {rows,payload:{version:"payroll-closure/v1" as const,rosterHash:financial.frozen.hash,sourceHash:overview.sourceHash,financialHash:financial.basis.sourceHash,summary:overview.summary,memberHashes:rows.map(r=>digest(JSON.stringify(r))),verification:verified?overview.verificationEvent:null,overrideReason:verified?null:input.verificationOverrideReason??null}};
}
export async function persistClosure(db:PoolConnection,batch:OvrBatch,actor:string,prepared:Awaited<ReturnType<typeof prepareClosure>>,requestId:string,key:string){
 const event=await appendReconciliationEvent(db,batch,actor,"closed",{...prepared.payload,reason:prepared.payload.overrideReason??"Coordinator closed reconciled payroll with current returned verification",summary:{...prepared.payload.summary,state:"closed",revision:batch.revision,canRecord:false}},requestId,key) as ClosureEvidence;
 for(let offset=0;offset<prepared.rows.length;offset+=50){const rows=prepared.rows.slice(offset,offset+50);
  await db.execute(`INSERT INTO payroll_closure_members(closure_id,position,scholarship_id,payment_id,outcome,snapshot,snapshot_hash) VALUES ${rows.map(()=>"(?,?,?,?,?,?,?)").join(",")}`,rows.flatMap(row=>[event.id,row.position,row.scholarshipId,row.paymentId,row.outcome,JSON.stringify(row),digest(JSON.stringify(row))]));
 }
 return event;
}
