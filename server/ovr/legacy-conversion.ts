import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolConnection,RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId,parseKey } from "../configuration/validation.js";
import { ovrHistory } from "./service.js";
import { effectiveRoster } from "./amendment-state.js";
import { paymentRecords } from "./processing-state.js";
import { paymentCorrections } from "./payment-correction-state.js";
import { currentPayout,requireOpenPayout } from "../payouts/service.js";
import { queueUnclaimed,requireClaimOpen,assertNoPaidClaim,semesterClaim } from "./reprocessing.js";

export async function legacyConversionReview(db:PoolConnection,id:string){
  const batch=(await ovrHistory(db,id))[0],frozen=await effectiveRoster(db,id),cycle=await currentPayout(db,batch.cycleId);
  const [[mapped]]=await db.execute<RowDataPacket[]>("SELECT batch_id FROM payroll_submission_windows WHERE batch_id=?",[id]);
  if(mapped)throw new AuthError(409,"LEGACY_BATCH_REQUIRED","This payroll already uses numbered allocations.");
  if(!frozen)throw new AuthError(409,"FROZEN_LEGACY_REQUIRED","Unfinalized legacy drafts remain read-only. Prepare a new numbered draft from current compliance rather than converting unapproved membership.");
  const payments=await paymentRecords(db,id),corrections=await paymentCorrections(db,id);
  const [allocations]=await db.execute<RowDataPacket[]>("SELECT entitlement_id,scholarship_id FROM payroll_allocations WHERE batch_id=? ORDER BY scholarship_id",[id]);
  const [destinations]=await db.execute<RowDataPacket[]>("SELECT b.id,b.code FROM ovr_batches b JOIN payroll_submission_windows w ON w.batch_id=b.id JOIN payout_cycles c ON c.id=b.cycle_id WHERE c.semester_id=? AND (SELECT e.state FROM ovr_batch_events e WHERE e.batch_id=b.id ORDER BY e.revision DESC LIMIT 1)='draft' ORDER BY b.code",[cycle.semesterId]);
  const [[converted]]=await db.execute<RowDataPacket[]>("SELECT snapshot FROM payroll_legacy_conversions WHERE source_batch_id=?",[id]);
  return {batch,frozen,cycle,payments,corrections,allocations,destinations:destinations.map(d=>({id:String(d.id),code:String(d.code)})),converted:converted ? (typeof converted.snapshot === "string" ? JSON.parse(converted.snapshot) : converted.snapshot) : null,sourceHash:digest(JSON.stringify({revision:batch.revision,frozenHash:frozen.hash,payments,corrections,allocations}))};
}
const schema=z.object({sourceHash:z.string().regex(/^[a-f0-9]{64}$/),destinationBatchId:z.uuid(),reviewed:z.literal(true),reason:z.string().trim().min(5).max(500),dispositions:z.array(z.object({scholarshipId:z.uuid(),disposition:z.enum(["preserve_paid","retain_unpaid","reprocess_unclaimed"])}).strict()).min(1).max(1000)}).strict();
export class LegacyConversionService{
  constructor(private authorization:AuthorizationService){}
  read(actor:string,id:unknown){return this.authorization.readSnapshot(actor,"ovr.finalize",db=>legacyConversionReview(db,parseId(id)));}
  async convert(actor:string,rawId:unknown,rawKey:unknown,raw:unknown,requestId:string){
    const id=parseId(rawId),key=parseKey(rawKey),parsed=schema.safeParse(raw);
    if(!parsed.success)throw new AuthError(422,"VALIDATION_FAILED","Review the source mapping, selected destination and every member's disposition.");
    const input=parsed.data,hash=digest(JSON.stringify({id,input,action:"legacy-conversion"}));
    return this.authorization.withPermission(actor,"ovr.finalize",async db=>{
      const [[retry]]=await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=?",[actor,key]);
      if(retry){if(retry.payload_hash!==hash)throw new AuthError(409,"IDEMPOTENCY_CONFLICT","This conversion key was already used.");return typeof retry.result === "string" ? JSON.parse(retry.result) : retry.result;}
      const view=await legacyConversionReview(db,id);
      if(view.converted)throw new AuthError(409,"LEGACY_ALREADY_CONVERTED","Conversion provenance already exists. Use controlled correction or reprocessing assignment for subsequent changes.");
      if(view.sourceHash!==input.sourceHash)throw new AuthError(409,"SOURCE_CHANGED","Legacy roster, outcomes or pending corrections changed. Review again.");
      if(view.corrections.some(c=>c.state==="pending"))throw new AuthError(409,"PAYMENT_CORRECTION_PENDING","Resolve pending payment corrections before conversion.");
      if(!view.destinations.some(d=>d.id===input.destinationBatchId))throw new AuthError(409,"CONVERSION_DESTINATION_REQUIRED","Select a numbered draft in the original semester.");
      const destination=(await ovrHistory(db,input.destinationBatchId))[0],cycle=await currentPayout(db,destination.cycleId);
      requireOpenPayout(cycle);
      const members=view.frozen.snapshot.entries;
      if(input.dispositions.length!==members.length || new Set(input.dispositions.map(d=>d.scholarshipId)).size!==members.length || input.dispositions.some(d=>!members.some(m=>m.scholarshipId===d.scholarshipId)))throw new AuthError(409,"CONVERSION_MEMBERSHIP_MISMATCH","Provide exactly one disposition for every frozen member.");
      for(const d of input.dispositions){
        const claim=await semesterClaim(db,d.scholarshipId,cycle.semesterId);
        if(claim.attempts.filter(p=>p.outcome === "paid").length>1 || claim.pending.length)throw new AuthError(409,"CONVERSION_HISTORY_REVIEW_REQUIRED","Resolve conflicting semester payments or pending corrections before conversion.");
        const p=view.payments.find(p=>p.scholarshipId===d.scholarshipId);
        if((p?.outcome === "paid") !== (d.disposition === "preserve_paid"))throw new AuthError(409,"PRESERVE_PAID_HISTORY","Existing paid outcomes must be retained without another entitlement.");
        if(d.disposition === "reprocess_unclaimed"){
          if(p?.outcome!=="not_paid" || p.unpaidReason!=="did_not_claim")throw new AuthError(409,"EXPLICIT_UNCLAIMED_REQUIRED","Only an explicit did-not-claim outcome may be reprocessed. Unknown and held outcomes stay in historical review.");
          await requireClaimOpen(db,cycle.semesterId);
          await assertNoPaidClaim(db,d.scholarshipId,cycle.semesterId);
        }
      }
      const result={id:randomUUID(),sourceBatchId:id,destinationBatchId:destination.id,sourceHash:view.sourceHash,originalSnapshotHash:view.frozen.hash,dispositions:input.dispositions,reviewedBy:actor,reason:input.reason};
      await db.execute("INSERT INTO payroll_legacy_conversions(id,source_batch_id,destination_batch_id,source_hash,snapshot,actor_id,recorded_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",[result.id,id,destination.id,view.sourceHash,JSON.stringify(result),actor]);
      const selected=new Set(input.dispositions.filter(d=>d.disposition === "reprocess_unclaimed").map(d=>d.scholarshipId));
      await queueUnclaimed(db,view.frozen.snapshot,view.payments.filter(p=>selected.has(p.scholarshipId)),actor);
      for(const p of view.payments.filter(p=>selected.has(p.scholarshipId))){
        const [[q]]=await db.execute<RowDataPacket[]>("SELECT id FROM payroll_reprocessing WHERE payment_id=?",[p.id]);
        const [[latest]]=await db.execute<RowDataPacket[]>("SELECT revision FROM payroll_reprocessing_events WHERE reprocessing_id=? ORDER BY revision DESC LIMIT 1",[q.id]);
        await db.execute("INSERT INTO payroll_reprocessing_events(id,reprocessing_id,revision,destination_batch_id,reason,actor_id,recorded_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",[randomUUID(),q.id,Number(latest?.revision??0)+1,destination.id,input.reason,actor]);
      }
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'payroll.legacy_conversion','ovr_batches',?,'review',?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),id,actor,requestId,input.reason,JSON.stringify(result)]);
      await db.execute("INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",[actor,key,hash,JSON.stringify(result)]);
      return result;
    });
  }
}
