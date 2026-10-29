import { randomUUID } from "node:crypto";
import type { PoolConnection,RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId,parseKey } from "../configuration/validation.js";
import { cachedReads,primeRead } from "../read-cache.js";
import { candidateReads } from "../ovr/candidate-reads.js";
import { semesterClaims } from "../ovr/detail-reads.js";
import { ovrHistory } from "../ovr/service.js";
import { effectiveRoster,amendments } from "../ovr/amendment-state.js";
import { currentPayout } from "../payouts/service.js";
import { managedRelease,managedAllocationIds,managedEntitlementEventsSql } from "../ovr/managed-release.js";
import { paymentRecords,reconcilePayments } from "../ovr/processing-state.js";
import { OvrProcessingService,parseProcessing,type PaymentRecordingContext } from "../ovr/processing-service.js";
import { requireNumberedPayroll } from "../ovr/legacy-boundary.js";
import { treasuryEvidence,historicalReceipts } from "../ovr/treasury-state.js";
import { claimDeadline,requireClaimOpen } from "../ovr/reprocessing.js";
import { decodeStoredJson } from "../stored-json.js";
import { existingFinancialBasis } from "./financial-basis.js";
import { paymentCorrections } from "../ovr/payment-correction-state.js";
import { recordingPage,recordingSummary } from "./recording-reads.js";
import { recordingParse,recordingInput,recordingCommit,centsText,type RecordingInput,type RecordingPreview } from "./recording-model.js";

export class PaymentRecordingService {
  constructor(private authorization:AuthorizationService) {}
  summary(actor:string,rawId:unknown) {const id=parseId(rawId);return this.authorization.readSnapshot(actor,"ovr.process",db=>recordingSummary(db,id));}
  page(actor:string,rawId:unknown,raw:unknown) {const id=parseId(rawId);return this.authorization.readSnapshot(actor,"ovr.process",db=>recordingPage(db,id,raw));}
  preview(actor:string,rawId:unknown,raw:unknown) {
    const id=parseId(rawId),input=recordingParse(recordingInput,raw);
    return this.authorization.readSnapshot(actor,"ovr.process",async db=>(await this.prepare(db,actor,id,input,"preview","preview")).preview);
  }
  /** Uses the existing authoritative processing engine, in validation-only mode.
   * No writes/keys are retained by preview; confirm rebuilds everything under
   * withPermission's configuration guard before invoking any child writer. */
  private async prepare(connection:PoolConnection,actor:string,id:string,input:RecordingInput,key:string,requestId:string) {
    let db=cachedReads(connection);
    await requireNumberedPayroll(db,id);
    const previous=(await ovrHistory(db,id))[0],cycle=await currentPayout(db,previous.cycleId),effective=await effectiveRoster(db,id);
    if(!effective)throw new AuthError(409,"OVR_FINALIZATION_REQUIRED","Finalize the payroll before recording payments.");
    if(previous.state!=="processed"||!["open","locked"].includes(cycle.state)||cycle.periodUnavailable)
      throw new AuthError(423,"RECORD_LOCKED","Payment Recording requires a processed payroll in an available financial period. Restricted historical cases use the existing reviewed tools.");
    const deadline=await claimDeadline(db,cycle.semesterId);
    if(deadline.expired||!deadline.endsOn)throw new AuthError(423,"CLAIM_PERIOD_ENDED","The financial period has expired or lacks an approved end date. Use the existing reviewed historical tools.");
    if(input.actualPaidOn&&input.actualPaidOn>deadline.endsOn)throw new AuthError(422,"INVALID_PAYMENT_DATE","Actual payment date must fall within the approved semester.");
    const payments=await paymentRecords(db,id),recorded=new Map(payments.map(p=>[p.scholarshipId,p]));
    const members=new Map(effective.snapshot.entries.map(e=>[e.scholarshipId,e]));
    const ids=input.mode==="all_remaining_paid" ? [...members.keys()].filter(id=>!recorded.has(id)) : input.scholarshipIds;
    if(ids.length>1200)throw new AuthError(422,"PAYMENT_OPERATION_TOO_LARGE","Review at most 1,200 scholars in one operation.");
    // Raw cohort batching reuses the established readers; no alternate eligibility engine.
    db=await candidateReads(db,ids,cycle.semesterId);
    const [amountRows]=await db.execute<RowDataPacket[]>(`SELECT a.scholarship_id,e.id,e.amount_centavos FROM semester_entitlements e JOIN payroll_allocations a ON a.entitlement_id=e.id WHERE a.batch_id=?
      UNION ALL SELECT t.scholarship_id,e.id,e.amount_centavos FROM payroll_reprocessing_attempts t JOIN payroll_reprocessing q ON q.id=t.reprocessing_id JOIN semester_entitlements e ON e.id=q.entitlement_id WHERE t.batch_id=?`,[id,id]);
    const selectedIds=new Set(ids),eventIds=[...new Set(amountRows.filter(r=>selectedIds.has(r.scholarship_id)).map(r=>String(r.id)))];
    for(let offset=0;offset<eventIds.length;offset+=200) {
      const chunk=eventIds.slice(offset,offset+200),marks=chunk.map(()=>"?").join(",");
      const [rows]=await db.execute<RowDataPacket[]>(managedEntitlementEventsSql.replace("entitlement_id=?",`entitlement_id IN (${marks})`),chunk);
      const groups=new Map<string,RowDataPacket[]>();for(const row of rows){const group=groups.get(row.entitlement_id)??[];group.push(row);groups.set(row.entitlement_id,group);}
      for(const entitlement of chunk)primeRead(db,managedEntitlementEventsSql,[entitlement],groups.get(entitlement)??[]);
    }
    const releases=await managedRelease(db,id,ids),allocationIds=await managedAllocationIds(db,id);
    const allocated=new Set(allocationIds);
    if(allocationIds.length>effective.snapshot.entries.length || effective.snapshot.entries.some(e=>!allocated.has(e.scholarshipId)&&!e.evidence.reprocessing))throw new AuthError(409,"PAYROLL_ALLOCATION_MISMATCH","Reconcile frozen membership with its reserved semester allocations before processing.");
    const compactBase={...previous,processingEvidence:previous.processingEvidence??{version:"payment-processing/v1" as const,baseRevision:previous.revision,validationHash:digest(JSON.stringify(previous.validation??null))}};
    const [[user]]=await db.execute<RowDataPacket[]>("SELECT full_name FROM users WHERE id=?",[actor]);
    const context:PaymentRecordingContext={previous,cycle,effective,payments,reconciliation:reconcilePayments(effective.snapshot,payments),compactBase,actorName:String(user.full_name),linkSources:new Map(),
      claims:input.outcome==="paid"?await semesterClaims(db,ids,cycle.semesterId):new Map(),pendingReceipts:new Map(ids.map(id=>[id,[]])),duplicates:new Map(),
      releases:new Map((releases??[]).map(r=>[r.scholarshipId,r])),allocationIds,writes:[],revision:previous.revision,operationId:key};
    // Preserve the same row locks and permanent-scholar aliases as the existing
    // guards, in bounded groups. No source survives this snapshot/transaction.
    for(let offset=0;offset<ids.length;offset+=200) {
      const chunk=ids.slice(offset,offset+200),marks=chunk.map(()=>"?").join(",");
      const [duplicates]=await db.execute<RowDataPacket[]>(`SELECT batch_id,scholarship_id FROM payment_records WHERE cycle_id=? AND scholarship_id IN (${marks}) LOCK IN SHARE MODE`,[cycle.id,...chunk]);
      for(const row of duplicates){const group=context.duplicates.get(row.scholarship_id)??[];group.push({batchId:String(row.batch_id)});context.duplicates.set(row.scholarship_id,group);}
      if(input.outcome==="paid") {
        const [pending]=await db.execute<RowDataPacket[]>(`SELECT target.id AS target_id,h.id FROM payroll_historical_receipts h JOIN ovr_batches b ON b.id=h.batch_id JOIN payout_cycles c ON c.id=b.cycle_id JOIN scholarship_records r ON r.id=h.scholarship_id JOIN scholarship_records target ON target.scholar_id=r.scholar_id WHERE target.id IN (${marks}) AND c.semester_id=? AND h.state='pending' AND NOT EXISTS(SELECT 1 FROM payroll_historical_receipts next WHERE next.id=h.id AND next.version>h.version)`,[...chunk,cycle.semesterId]);
        for(const row of pending)context.pendingReceipts.get(row.target_id)!.push(String(row.id));
      }
    }
    const entitlementIds=[...new Set((releases??[]).map(r=>r.entitlementId))];
    for(let offset=0;offset<entitlementIds.length;offset+=200){
      const chunk=entitlementIds.slice(offset,offset+200),marks=chunk.map(()=>"?").join(",");
      const [links]=await db.execute<RowDataPacket[]>(`SELECT a.entitlement_id,a.approved_event_id,l.payment_id FROM payroll_allocations a LEFT JOIN entitlement_release_links l ON l.entitlement_id=a.entitlement_id WHERE a.entitlement_id IN (${marks}) LOCK IN SHARE MODE`,chunk);
      for(const row of links)context.linkSources.set(row.entitlement_id,{approvedEventId:String(row.approved_event_id),existingPaymentId:row.payment_id??null});
    }
    const amounts=new Map(amountRows.map(r=>[String(r.id),Number(r.amount_centavos)]));
    const used=new Set<string>(),accepted:RecordingPreview["accepted"]=[],conflicts:RecordingPreview["conflicts"]=[];
    const processor=new OvrProcessingService(this.authorization);
    for(const scholarshipId of ids) {
      const member=members.get(scholarshipId),name=member?.evidence.current.sources.scholarship.name??"Scholar outside this payroll";
      try {
        if(!member)throw new AuthError(409,"PAYMENT_NOT_IN_ROSTER","This scholar is not in the frozen payroll.");
        const payment=recorded.get(scholarshipId);
        if(payment)throw new AuthError(409,"PAYMENT_ALREADY_RECORDED",payment.outcome==="paid"?"This scholar is already marked Paid.":payment.unpaidReason==="did_not_claim"?"This scholar is already marked Unclaimed.":"This scholar requires financial review.");
        const release=context.releases.get(scholarshipId),amount=release?amounts.get(release.entitlementId):undefined;
        if(!release||amount===undefined)throw new AuthError(409,"PAYROLL_ALLOCATION_REQUIRED","The approved entitlement requires financial review. Existing historical tools remain available.");
        if(used.has(release.entitlementId))throw new AuthError(409,"DUPLICATE_ENTITLEMENT","Two selected rows refer to the same entitlement. Resolve the roster conflict.");
        const command=parseProcessing("record-payment",{expectedRevision:previous.revision,effectiveOn:input.actualPaidOn,reason:input.reason,reference:input.reference,
          scholarshipId,outcome:input.outcome==="paid"?"paid":"not_paid",amount:input.outcome==="paid"?centsText(amount):"0.00",remarks:input.reason,
          ...(input.outcome==="paid"?{receiptConfirmed:true}:{unpaidReason:"did_not_claim"})});
        await processor.execute(db,actor,id,"record-payment",key,command,"",requestId,undefined,context);
        used.add(release.entitlementId);accepted.push({scholarshipId,name,amount:centsText(amount)});
      }catch(e){if(!(e instanceof AuthError))throw e;conflicts.push({scholarshipId,name,reason:e.message});}
    }
    const summary=await recordingSummary(db,id); // Also rejects amended historical membership.
    const financial=existingFinancialBasis({scope:"complete_batch",batch:previous,finalization:effective,effectiveFinalization:effective,
      payments,originalPayments:await paymentRecords(db,id,true),paymentCorrections:await paymentCorrections(db,id),amendments:await amendments(db,id),
      treasuryEvidence:await treasuryEvidence(db,id),historicalReceipts:await historicalReceipts(db,id)});
    // P01's basis is snapshot-only evidence, never payment authority. Confirmation
    // still rebuilds these sources and runs the existing guards under the lock.
    const sources={financial:financial.sourceHash,release:[...context.releases.values()].map(r=>[r.scholarshipId,r.sourceHash])};
    const count=accepted.length,amount=accepted.reduce((n,e)=>n+Math.round(Number(e.amount)*100),0);
    const preview:RecordingPreview={basis:digest(JSON.stringify({actor,id,input,sources,accepted,conflicts})),acceptedIds:accepted.map(e=>e.scholarshipId),accepted,conflicts,count,
      amount:input.outcome==="paid"?centsText(amount):"0.00",final:{paid:summary.paid+(input.outcome==="paid"?count:0),unclaimed:summary.unclaimed+(input.outcome==="unclaimed"?count:0),pending:summary.pending-count,needsReview:summary.needsReview}};
    return {db,preview,context};
  }
  commit(actor:string,rawId:unknown,rawKey:unknown,raw:unknown,requestId:string) {
    const id=parseId(rawId),key=parseKey(rawKey),input=recordingParse(recordingCommit,raw),hash=digest(JSON.stringify({id,action:"payment-operation/v1",input}));
    return this.authorization.withPermission(actor,"ovr.process",async connection=>{
      const [[retry]]=await connection.execute<RowDataPacket[]>("SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=? FOR UPDATE",[actor,key]);
      if(retry){if(retry.payload_hash!==hash)throw new AuthError(409,"IDEMPOTENCY_CONFLICT","This saved operation has different payment details. Retry its original request.");return decodeStoredJson(retry.result);}
      const {db,preview,context}=await this.prepare(connection,actor,id,input.input,key,requestId);
      if(preview.basis!==input.basis || JSON.stringify(preview.acceptedIds)!==JSON.stringify(input.acceptedIds) || preview.conflicts.length || !preview.count)
        throw new AuthError(409,"PAYMENT_REVIEW_CHANGED","Some selected scholars cannot be processed, or their records changed. Remove conflicts and review again.",{preview});
      await requireClaimOpen(connection,context.cycle.semesterId,input.input.actualPaidOn??undefined);
      for(const write of context.writes)await write();
      const result={operationId:key,recorded:preview.count,summary:await recordingSummary(db,id)};
      await db.execute("INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",[actor,key,hash,JSON.stringify(result)]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'payment.recording','ovr_batches',?,'bulk',?,'user',UTC_TIMESTAMP(6),?,?,?)",
        [randomUUID(),id,actor,requestId,input.input.reason,JSON.stringify({operationId:key,basis:input.basis,count:preview.count,outcome:input.input.outcome,amount:preview.amount,acknowledgement:input.receiptConfirmed,scholarshipIds:preview.acceptedIds})]);
      return result;
    });
  }
  recovery(actor:string,rawKey:unknown) {
    const key=parseKey(rawKey);return this.authorization.readSnapshot(actor,"ovr.process",async db=>{
      const [[row]]=await db.execute<RowDataPacket[]>("SELECT result FROM ovr_commands WHERE actor_id=? AND command_id=?",[actor,key]);
      if(!row)throw new AuthError(404,"PAYMENT_OPERATION_NOT_FOUND","No completed operation was found. Retry the saved request with its original key.");
      const result=decodeStoredJson<{operationId?:string}>(row.result);
      if(result.operationId!==key)throw new AuthError(404,"PAYMENT_OPERATION_NOT_FOUND","No payment operation was found.");return result;
    });
  }
}
