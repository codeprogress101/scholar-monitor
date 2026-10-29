import {randomUUID,createHash} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {Access,PermissionCode} from '../authorization/policy.js';
import type {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {parseKey} from '../configuration/validation.js';
export function fail(code:string,message:string):never {throw new AuthError(409,code,message);}
export function canonical(value:unknown):unknown {if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));return value;}
export const fingerprint=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export function decode<T>(value:string|T):T{return typeof value==='string'?JSON.parse(value) as T:value;}
export function requirePermission(access:Access,permission:PermissionCode){if(!access.permissions.some(p=>p.code===permission))throw new AuthError(403,'PERMISSION_DENIED','This operation requires its current business permission and scholar-read access.');}
export type CommandResult<T>={status:200|201;result:T};
export class GraduationCommands {
 constructor(private authorization:AuthorizationService,private enabled:boolean){}
 run<T>(actor:string,rawKey:unknown,permission:PermissionCode,operation:string,target:unknown,input:unknown,requestId:string,work:(db:PoolConnection,access:Access,key:string)=>Promise<{id:string;revision:number;result:T;reason:string;before:unknown;after:unknown}>,domain:'duration'|'monitoring',create:boolean):Promise<CommandResult<T>> {
  const key=parseKey(rawKey),hash=fingerprint({format:'graduation-command/v1',operation,target,input});
  return this.authorization.withPermission(actor,permission,async(db,access)=>{
   requirePermission(access,'scholars.read');
   const [[prior]]=await db.execute<RowDataPacket[]>('SELECT * FROM graduation_commands WHERE actor_id=? AND command_id=? FOR UPDATE',[actor,key]);
   if(prior){if(prior.operation!==operation||prior.payload_hash!==hash)fail('IDEMPOTENCY_CONFLICT','This graduation request key belongs to different changes. Preserve it for investigation.');return {status:prior.response_status as 200|201,result:decode<T>(prior.result)};}
   if(!this.enabled)fail('GRADUATION_WRITES_DISABLED','Graduation evidence writing is disabled in this instance.');
   const result=await work(db,access,key),status=create?201:200;
   await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,?,?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),(domain==='duration'?'program.duration.':'graduation.monitoring.')+operation.split('.').at(-1),domain==='duration'?'program_duration':'graduation_monitoring',result.id,operation,actor,requestId,result.reason,JSON.stringify({before:result.before,after:result.after,commandId:key})]);
   await db.execute('INSERT INTO graduation_commands(actor_id,command_id,operation,payload_hash,duration_reference_id,monitoring_case_id,resulting_revision,result,response_status,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[actor,key,operation,hash,domain==='duration'?result.id:null,domain==='monitoring'?result.id:null,result.revision,JSON.stringify(result.result),status]);
   return {status,result:result.result};
  });
 }
}
export async function availablePeriod(db:PoolConnection,year:string,version?:number,semester:string|null=null,semesterVersion?:number|null){
 const [[y]]=await db.execute<RowDataPacket[]>('SELECT id,version,locked_at,archived_at,DATE_FORMAT(starts_on,\'%Y-%m-%d\') starts,DATE_FORMAT(ends_on,\'%Y-%m-%d\') ends FROM academic_years WHERE id=?',[year]);
 if(!y||y.locked_at||y.archived_at)fail('GRADUATION_PERIOD_UNAVAILABLE','The selected year is unavailable or read-only.');
 if(version!==undefined&&Number(y.version)!==version)fail('GRADUATION_VERSION_CONFLICT','Academic-year configuration changed. Refresh.');
 if(semester){const [[s]]=await db.execute<RowDataPacket[]>('SELECT * FROM semesters WHERE id=? AND academic_year_id=?',[semester,year]);if(!s||s.locked_at||s.archived_at)fail('GRADUATION_PERIOD_UNAVAILABLE','The semester must be available and belong to this year.');if(semesterVersion!==undefined&&Number(s.version)!==semesterVersion)fail('GRADUATION_VERSION_CONFLICT','Semester configuration changed. Refresh.');}
 return y;
}
