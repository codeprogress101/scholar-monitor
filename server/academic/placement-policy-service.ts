import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { academicCurrent } from "./changes-service.js";
import { placementPolicySource, placementProposalHash, validatePlacementPolicy } from "./placement-policy.js";
import { placementReferences, hasPlacementReferences, resolvePlacementReferences } from "./references.js";
import { today } from "../scholars/validation.js";

const schema=z.object({expectedVersion:z.number().int().min(0),...placementReferences,yearLevel:z.string().trim().min(1).max(60),effectiveOn:z.iso.date().refine(d=>d<=today()),priorShiftCount:z.number().int().min(0).max(100).nullable(),secondYearBoundaryOn:z.iso.date().nullable(),permissionGrantedOn:z.iso.date(),permissionReference:z.string().trim().min(3).max(300),historyReference:z.string().trim().min(5).max(500),sourceCategory:z.enum(["degree","non_degree"]),destinationCategory:z.enum(["degree","non_degree"]),reviewed:z.literal(true)}).strict().refine(hasPlacementReferences);
export class PlacementPolicyService {
  constructor(private authorization:AuthorizationService){}
  async record(actor:string,rawId:unknown,rawKey:unknown,raw:unknown,requestId:string){
    const id=parseId(rawId),key=parseKey(rawKey),parsed=schema.safeParse(raw);
    if(!parsed.success)throw new AuthError(422,"VALIDATION_FAILED","Provide the exact placement proposal and reviewed permission, category, historical count and boundary evidence. Unknown history cannot authorize a shift.");
    const input=parsed.data,hash=digest(JSON.stringify({id,input,action:"placement-policy-review"}));
    return this.authorization.withPermission(actor,"academic.changes.approve",async db=>{
      const [[retry]]=await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=?",[actor,key]);
      if(retry){if(retry.payload_hash!==hash)throw new AuthError(409,"IDEMPOTENCY_CONFLICT","This review key was already used.");return typeof retry.result === "string" ? JSON.parse(retry.result) : retry.result;}
      const state=await academicCurrent(db,id);
      if(state.version!==input.expectedVersion)throw new AuthError(409,"VERSION_CONFLICT","The placement changed. Review the current record.");
      if(state.row.locked_at || state.row.archived_at)throw new AuthError(423,"RECORD_LOCKED","The academic year is unavailable for placement changes.");
      const source=await placementPolicySource(db,state.row.scholar_id,state.placement);
      if(input.priorShiftCount!==null && input.priorShiftCount<source.recordedShifts)throw new AuthError(409,"SHIFT_HISTORY_CONFLICT","Reviewed history cannot omit recorded approved course shifts.");
      const proposal={...input,...await resolvePlacementReferences(db,input,actor,requestId)};
      validatePlacementPolicy(state.placement,proposal,input.effectiveOn,input);
      const result={id:randomUUID(),academicRecordId:id,sourceHash:source.hash,proposalHash:placementProposalHash(proposal,input.effectiveOn)};
      await db.execute("INSERT INTO placement_policy_reviews(id,academic_record_id,source_hash,proposal_hash,snapshot,actor_id,recorded_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",[result.id,id,result.sourceHash,result.proposalHash,JSON.stringify(input),actor]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'academic.policy_review','academic_records',?,'review',?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),id,actor,requestId,input.historyReference,JSON.stringify({result,input,idempotency_key:key})]);
      await db.execute("INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",[actor,key,hash,JSON.stringify(result)]);
      return result;
    });
  }
}
