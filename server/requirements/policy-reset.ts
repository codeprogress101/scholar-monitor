import type { Connection, RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import {decodeStoredJson} from "../stored-json.js";
import { z } from "zod";
import { digest } from "../auth/crypto.js";
import { AuthError } from "../auth/service.js";

const schema = z.object({ database: z.string().regex(/^ldss_[a-zA-Z0-9_]+$/), actorId: z.uuid(), commandId: z.uuid(), definitionIds: z.array(z.uuid()).min(1).max(20).refine(v=>new Set(v).size===v.length), expectedHash: z.string().regex(/^[a-f0-9]{64}$/), reason: z.string().trim().min(5).max(500), reference: z.string().trim().min(3).max(300) }).strict();
export type PolicyResetInput = z.infer<typeof schema>;
const decode = <T>(v:string|T):T => typeof v === "string" ? JSON.parse(v) as T : v;

/** Local administrative tooling only. This function is deliberately not routed on the web. */
export async function policyResetManifest(db: Connection, ids: string[]) {
  if (!ids.length || ids.some(id=>!z.uuid().safeParse(id).success)) throw new AuthError(422,"VALIDATION_FAILED","Choose explicit policy IDs.");
  const marks=ids.map(()=>"?").join(",");
  const [definitions]=await db.execute<RowDataPacket[]>(`SELECT * FROM requirement_definitions WHERE id IN (${marks}) ORDER BY id FOR UPDATE`,ids);
  if(definitions.length!==ids.length)throw new AuthError(409,"POLICY_RESET_CHANGED","The policy list changed. Create a fresh manifest.");
  const [versions]=await db.execute<RowDataPacket[]>(`SELECT * FROM requirement_definition_versions WHERE definition_id IN (${marks}) ORDER BY id FOR UPDATE`,ids);
  const [links]=await db.execute<RowDataPacket[]>(`SELECT p.*,v.cycle_id,v.version,v.state FROM payout_requirements p JOIN payout_cycle_versions v ON v.id=p.cycle_version_id JOIN requirement_definition_versions d ON d.id=p.definition_version_id WHERE d.definition_id IN (${marks}) ORDER BY p.cycle_version_id,p.definition_version_id FOR UPDATE`,ids);
  const details={definitions,versions,links};
  return {...details,hash:digest(JSON.stringify(details))};
}

export async function resetUnusedPolicies(db: Connection, raw: unknown) {
  const parsed=schema.safeParse(raw);
  if(!parsed.success)throw new AuthError(422,"VALIDATION_FAILED","Provide the exact reset manifest, database, Administrator, reason and reference.");
  const input=parsed.data, payloadHash=digest(JSON.stringify({operation:"policies.reset_unused",input}));
  await db.beginTransaction();
  try{
    const [[identity]]=await db.query<RowDataPacket[]>("SELECT DATABASE() db,CURRENT_USER() account");
    if(identity.db!==input.database || String(identity.account).startsWith("ldss_production_app@") || String(identity.account).startsWith("ldss_monitor_local@"))throw new AuthError(403,"LOCAL_MAINTENANCE_REQUIRED","Policy deletion requires a local administrative connection to the explicitly named database.");
    const [[actor]]=await db.execute<RowDataPacket[]>("SELECT id FROM users WHERE id=? AND disabled_at IS NULL FOR UPDATE",[input.actorId]);
    const [[role]]=await db.execute<RowDataPacket[]>("SELECT id FROM user_roles WHERE user_id=? AND role_code='system_admin' AND revoked_at IS NULL LOCK IN SHARE MODE",[input.actorId]);
    if(!actor||!role)throw new AuthError(403,"PERMISSION_DENIED","An active Administrator must own this maintenance action.");
    await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
    const [[prior]]=await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE",[input.actorId,input.commandId]);
    if(prior){if(prior.payload_hash!==payloadHash)throw new AuthError(409,"IDEMPOTENCY_CONFLICT","The reset retry key belongs to another payload.");await db.commit();return decode<{deleted:string[]}>(prior.result);}
    const manifest=await policyResetManifest(db,input.definitionIds);
    if(manifest.hash!==input.expectedHash)throw new AuthError(409,"POLICY_RESET_CHANGED","Policy versions or payroll links changed. Review a fresh deletion manifest.");
    const versionIds=manifest.versions.map(v=>String(v.id)), marks=versionIds.map(()=>"?").join(",");
    if(!versionIds.length)throw new AuthError(409,"POLICY_RESET_CHANGED","No policy versions found.");
    const [[used]]=await db.execute<RowDataPacket[]>(`SELECT id FROM requirement_instances WHERE definition_version_id IN (${marks}) LIMIT 1 FOR UPDATE`,versionIds);
    if(used)throw new AuthError(409,"POLICY_IN_USE","A document instance uses this policy. Permanent deletion is blocked.");
    if(manifest.links.some(l=>l.state!=="draft"))throw new AuthError(409,"POLICY_IN_USE","An operational payroll version uses this policy.");
    for(const cycleId of new Set<string>(manifest.links.map(l=>String(l.cycle_id)))){
      const [[latest]]=await db.execute<RowDataPacket[]>("SELECT state FROM payout_cycle_versions WHERE cycle_id=? ORDER BY version DESC LIMIT 1 FOR UPDATE",[cycleId]);
      const [[batch]]=await db.execute<RowDataPacket[]>("SELECT id FROM ovr_batches WHERE cycle_id=? LIMIT 1 FOR UPDATE",[cycleId]);
      if(latest?.state!=="draft"||batch)throw new AuthError(409,"POLICY_IN_USE","A payroll cycle is operational or has batches; preserve its policy history.");
    }
    // JSON policy/evidence references do not all have foreign keys. Inspect them explicitly.
    for(const table of ["workflow_policy_versions","scholar_semester_revisions","semester_document_reconciliations","requirement_document_evidence","semester_entitlement_events","ovr_finalizations"]){
      const [rows]=await db.query<RowDataPacket[]>(`SELECT * FROM \`${table}\` LIMIT 100001 FOR UPDATE`);
      if(rows.length>100000)throw new AuthError(409,"POLICY_RESET_REVIEW_REQUIRED","Protected evidence exceeds the maintenance inspection limit.");
      const expanded=rows.map(r=>Object.fromEntries(Object.entries(r).map(([key,value])=>{
        if((typeof value==="string"&&value.includes('"encoding":"ldss-evidence-'))||(value&&typeof value==="object"&&"encoding" in value)){
          try{return [key,decodeStoredJson(value)];}catch{throw new AuthError(409,"POLICY_RESET_REVIEW_REQUIRED","Stored compressed evidence cannot be interpreted safely. Preserve the policies and review its integrity.");}
        }return [key,value];
      })));
      if(expanded.some(r=>versionIds.some(id=>JSON.stringify(r).includes(id))))throw new AuthError(409,"POLICY_IN_USE","Stored semester or payroll evidence refers to a selected policy.");
    }
    // FK enforcement stays enabled. Only manifest-listed links and entities can be deleted.
    await db.execute(`DELETE FROM payout_requirements WHERE definition_version_id IN (${marks})`,versionIds);
    await db.execute(`DELETE FROM requirement_definition_versions WHERE id IN (${marks})`,versionIds);
    await db.execute(`DELETE FROM requirement_definitions WHERE id IN (${input.definitionIds.map(()=>"?").join(",")})`,input.definitionIds);
    const result={deleted:input.definitionIds};
    await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'requirement.policy_reset','configuration',?,'purge_unused',?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),input.commandId,input.actorId,input.commandId,input.reason,JSON.stringify({reference:input.reference,manifest,idempotency_key:input.commandId})]);
    await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,'policies.reset_unused',?,?,UTC_TIMESTAMP(6))",[input.actorId,input.commandId,payloadHash,JSON.stringify(result)]);
    await db.commit();return result;
  }catch(e){await db.rollback();throw e;}
}
