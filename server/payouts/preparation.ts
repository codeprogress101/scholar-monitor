import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {digest} from '../auth/crypto.js';
import {parseId,parseKey} from '../configuration/validation.js';
import {currentPayout,requireOpenPayout} from './service.js';
import {requireClaimOpen} from '../ovr/reprocessing.js';
import {decodeStoredJson} from '../stored-json.js';

export async function preparationState(db:PoolConnection,cycle:string){
 const [[r]]=await db.execute<RowDataPacket[]>('SELECT revision,state,reason,actor_id,recorded_at FROM payroll_preparation_versions WHERE cycle_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE',[cycle]);
 return r?{revision:Number(r.revision),state:r.state as 'open'|'closed',reason:String(r.reason),actorId:String(r.actor_id),recordedAt:new Date(r.recorded_at).toISOString()}:{revision:0,state:'open' as const,reason:'Existing preparation workflow',actorId:null,recordedAt:null};
}
export async function requirePreparationOpen(db:PoolConnection,cycle:string){if((await preparationState(db,cycle)).state!=='open')throw new AuthError(409,'PREPARATION_CLOSED','Semester payroll preparation is closed. A Coordinator may reopen it; existing payment and reconciliation remain available.');}
const input=z.object({state:z.enum(['open','closed']),expectedRevision:z.number().int().nonnegative(),expectedCycleVersion:z.number().int().positive(),reason:z.string().trim().min(5).max(500)}).strict();
export class PayrollPreparationService{
 constructor(private authorization:AuthorizationService,private enabled=false){}
 read(actor:string,rawId:unknown){const id=parseId(rawId);return this.authorization.readSnapshot(actor,'ovr.process',async db=>{const cycle=await currentPayout(db,id);return {cycleId:id,cycleVersion:cycle.version,...await preparationState(db,id)};});}
 command(actor:string,rawId:unknown,rawKey:unknown,raw:unknown,requestId:string){
  if(!this.enabled)throw new AuthError(423,'OMITTED_PAYMENTS_DISABLED','Omitted Scholar processing awaits compatibility verification and explicit activation.');
  const cycleId=parseId(rawId),key=parseKey(rawKey),parsed=input.safeParse(raw);if(!parsed.success)throw new AuthError(422,'VALIDATION_FAILED','Review the current preparation state and provide a reason.');const v=parsed.data,hash=digest(JSON.stringify({version:'p05-preparation/v1',cycleId,...v}));
  return this.authorization.withPermission(actor,'payroll.windows.manage',async db=>{
   const [[retry]]=await db.execute<RowDataPacket[]>('SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=? FOR UPDATE',[actor,key]);
   if(retry){if(retry.payload_hash!==hash)throw new AuthError(409,'IDEMPOTENCY_CONFLICT','Retry the exact saved request.');return decodeStoredJson(retry.result);}
   const cycle=await currentPayout(db,cycleId);requireOpenPayout(cycle);const before=await preparationState(db,cycleId);
   if(cycle.version!==v.expectedCycleVersion||before.revision!==v.expectedRevision)throw new AuthError(409,'VERSION_CONFLICT','The semester or preparation state changed. Refresh first.');
   const [[mapping]]=await db.execute<RowDataPacket[]>('SELECT cycle_id FROM regular_payout_periods WHERE cycle_id=?',[cycleId]);if(!mapping)throw new AuthError(409,'PERIOD_NOT_MAPPED','Configure the regular semester before changing preparation.');
   if(before.state===v.state)throw new AuthError(409,'PREPARATION_UNCHANGED','The requested preparation state is already current.');
   if(v.state==='open')await requireClaimOpen(db,cycle.semesterId);
   const result={cycleId,revision:before.revision+1,state:v.state};
   await db.execute('INSERT INTO payroll_preparation_versions(cycle_id,revision,state,reason,actor_id,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))',[cycleId,result.revision,v.state,v.reason,actor]);
   await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'payroll.preparation','payout_cycles',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),cycleId,v.state,actor,requestId,v.reason,JSON.stringify({before,after:result,key})]);
   await db.execute('INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)',[actor,key,hash,JSON.stringify(result)]);return result;
  });
 }
}
