import {validateConfirmedScope} from "../imports/confirmed-scope.js";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { indexedRead } from "../read-cache.js";
import { AuthError } from "../auth/service.js";
import {digest} from '../auth/crypto.js';
import {decodeImportRows} from '../imports/storage.js';
import type {ImportPreviewRow,ImportResult} from '../imports/model.js';

const hash=z.string().regex(/^[a-f0-9]{64}$/);
export const historicalMemberSchema=z.object({ownerId:z.uuid(),scholarId:z.uuid(),scholarshipId:z.uuid(),approvalId:z.uuid(),approvalRevision:z.number().int().positive(),sourceHash:hash,masterlistId:z.uuid(),publicationHash:hash,publicationVersion:z.number().int().positive()}).strict();
export type HistoricalMember=z.infer<typeof historicalMemberSchema>;
export const historicalScopeSchema=z.object({format:z.literal("historical-multibatch/v1"),semesterId:z.uuid(),importHash:hash,scopeHash:hash,members:z.array(historicalMemberSchema).min(1).max(1500)});
export type HistoricalScope=z.infer<typeof historicalScopeSchema>;
export type HistoricalBatch={cycleId:string;batchId:string;importId:string;revision:number;deadlineOn:string;bound:boolean;scopeHash:string|null};
const sql="SELECT cycle_id,batch_id,import_job_id,revision,DATE_FORMAT(deadline_on,'%Y-%m-%d') deadline,snapshot FROM historical_payout_setups WHERE cycle_id=? ORDER BY revision";
function scope(raw:unknown):HistoricalScope|null{
 const input=typeof raw==='string'?JSON.parse(raw):raw;
 if(!input||typeof input!=='object'||!('format' in input))return null;
 const p=historicalScopeSchema.safeParse(input);if(!p.success)throw new AuthError(409,'HISTORICAL_SCOPE_INVALID','The historical batch source scope needs controlled review.');return p.data;
}
async function rows(db:PoolConnection,cycleId:string){const [r]=await db.execute<RowDataPacket[]>(sql,[cycleId]);return r;}
export async function historicalBatch(db:PoolConnection,cycleId:string,batchId?:string){
 return indexedRead(db,`historical-batches:${cycleId}`,batchId??'root',async()=>{
  const index=new Map<string,HistoricalBatch>();for(const row of await rows(db,cycleId)){const s=scope(row.snapshot),meta={cycleId:String(row.cycle_id),batchId:String(row.batch_id),importId:String(row.import_job_id),revision:Number(row.revision),deadlineOn:String(row.deadline),bound:!!s,scopeHash:s?.scopeHash??null};index.set(meta.batchId,meta);if(!index.has('root'))index.set('root',meta);}return index;
 });
}
export async function historicalMember(db:PoolConnection,cycleId:string,batchId:string,ownerId:string){
 return indexedRead(db,`historical-members:${cycleId}`,`${batchId}:${ownerId}`,async()=>{
  const index=new Map<string,HistoricalMember>();for(const r of await rows(db,cycleId))for(const m of scope(r.snapshot)?.members??[])index.set(`${r.batch_id}:${m.ownerId}`,m);return index;
 });
}
export async function historicalOwnerBatch(db:PoolConnection,cycleId:string,ownerId:string){
 return indexedRead(db,`historical-owner-batches:${cycleId}`,ownerId,async()=>{
  const index=new Map<string,string>();for(const r of await rows(db,cycleId))for(const m of scope(r.snapshot)?.members??[]){if(index.has(m.ownerId))throw new AuthError(409,'HISTORICAL_SCOPE_CONFLICT','A scholar appears in competing historical source scopes.');index.set(m.ownerId,String(r.batch_id));}return index;
 });
}
/** Only one array per candidate projection; per-member decisions use the indexed member reader. */
export async function historicalRoster(db:PoolConnection,cycleId:string,batchId:string):Promise<string[]|undefined>{
 return indexedRead(db,`historical-rosters:${cycleId}`,batchId,async()=>{const index=new Map<string,string[]>();for(const r of await rows(db,cycleId)){const s=scope(r.snapshot);if(s)index.set(String(r.batch_id),s.members.map(m=>m.scholarId));}return index;});
}
/** Validate pinned confirmed source once per batch/read snapshot, never per scholar SQL. */
export async function historicalSourceCurrent(db:PoolConnection,cycleId:string,batchId:string,semesterId:string){
 return indexedRead(db,`historical-source:${cycleId}:${semesterId}`,batchId,async()=>{
  const [imports]=await db.execute<RowDataPacket[]>('SELECT h.batch_id,j.file_hash,j.preview,c.result FROM historical_payout_setups h JOIN import_jobs j ON j.id=h.import_job_id JOIN import_confirmations c ON c.job_id=j.id WHERE h.cycle_id=?',[cycleId]);
  const index=new Map<string,boolean>();for(const r of await rows(db,cycleId)){const s=scope(r.snapshot);const actual=imports.find(i=>i.batch_id===r.batch_id);if(!s){if(actual){const result=(typeof actual.result==='string'?JSON.parse(actual.result):actual.result) as ImportResult;await validateConfirmedScope(db,String(r.import_job_id),decodeImportRows<ImportPreviewRow>(actual.preview),result);}index.set(String(r.batch_id),true);continue;}const result=actual?(typeof actual.result==='string'?JSON.parse(actual.result):actual.result) as ImportResult:null;const importHash=actual&&result?digest(JSON.stringify({fileHash:actual.file_hash,rows:decodeImportRows<ImportPreviewRow>(actual.preview),result})):null;
   if(actual&&result)await validateConfirmedScope(db,String(r.import_job_id),decodeImportRows<ImportPreviewRow>(actual.preview),result);
   index.set(String(r.batch_id),s.semesterId===semesterId&&s.importHash===importHash&&s.scopeHash===digest(JSON.stringify({importId:r.import_job_id,semesterId:s.semesterId,importHash:s.importHash,members:s.members})));
  }return index;
 });
}
