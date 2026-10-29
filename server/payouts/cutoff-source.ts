import {z} from 'zod';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {digest} from '../auth/crypto.js';
import {AuthError} from '../auth/service.js';
import {cutoffPolicy,windowTiming} from './cutoff-policy.js';

const localTime=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d:00$/);
const ruleSchema=z.object({revision:z.number().int().positive(),permittedTimes:z.array(localTime).min(1).max(48).refine(a=>new Set(a).size===a.length),validFrom:z.iso.date(),validThrough:z.iso.date(),authorityReference:z.string().min(5).max(500),sourceLocation:z.string().min(5).max(500),approvedBy:z.uuid(),approvedAt:z.string(),timeZone:z.literal('Asia/Manila'),boundaryRule:z.literal('inclusive_microsecond_v1')}).strict();
export async function cutoffRule(db:PoolConnection,cycle:string,revision?:number){
 const [rows]=await db.execute<RowDataPacket[]>("SELECT revision,permitted_times,DATE_FORMAT(valid_from,'%Y-%m-%d') validFrom,DATE_FORMAT(valid_through,'%Y-%m-%d') validThrough,authority_reference authorityReference,source_location sourceLocation,approved_by approvedBy,DATE_FORMAT(approved_at,'%Y-%m-%dT%H:%i:%s.%fZ') approvedAt,time_zone timeZone,boundary_rule boundaryRule FROM payroll_cutoff_rule_versions WHERE cycle_id=?"+(revision===undefined?' ORDER BY revision DESC LIMIT 1':' AND revision=?')+' LOCK IN SHARE MODE',revision===undefined?[cycle]:[cycle,revision]);
 if(!rows.length)return null;
 const {permitted_times,...row}=rows[0];let parsed:unknown;
 try{parsed=ruleSchema.parse({...row,permittedTimes:typeof permitted_times==='string'?JSON.parse(permitted_times):permitted_times});}catch{throw new AuthError(409,'CUTOFF_RULE_UNAVAILABLE','The recorded office cutoff rule requires source review.');}
 const rule=parsed as z.infer<typeof ruleSchema>;
 return {rule,hash:digest(JSON.stringify(rule))};
}
export const cutoffEvidenceColumns=(v='v')=>`${v}.cutoff_policy AS cutoffPolicy,TIME_FORMAT(${v}.cutoff_local_time,'%H:%i:%s') AS cutoffLocalTime,${v}.cutoff_time_zone AS cutoffTimeZone,DATE_FORMAT(${v}.cutoff_at_utc,'%Y-%m-%dT%H:%i:%s.%fZ') AS cutoffAtUtc,${v}.cutoff_rule_revision AS cutoffRuleRevision,${v}.cutoff_rule_hash AS cutoffRuleHash`;
export async function recordedWindowTiming(db:PoolConnection,cycle:string,row:{cutoffOn:string;cutoffPolicy:unknown;cutoffLocalTime?:string|null;cutoffTimeZone?:string;cutoffAtUtc?:string|null;cutoffRuleRevision?:number|null;cutoffRuleHash?:string|null}){
 const policy=cutoffPolicy(row.cutoffPolicy);
 if(policy==='whole_day_v1'){
  if(row.cutoffLocalTime||row.cutoffAtUtc||row.cutoffRuleRevision||row.cutoffRuleHash)throw new AuthError(409,'CUTOFF_SOURCE_CHANGED','Whole-day window evidence is inconsistent.');
  return {...windowTiming(row.cutoffOn,policy),cutoffLocalTime:null,cutoffTimeZone:'Asia/Manila' as const,cutoffRuleRevision:null,cutoffRuleHash:null};
 }
 const authority=row.cutoffRuleRevision?await cutoffRule(db,cycle,Number(row.cutoffRuleRevision)):null;
 if(!authority||authority.hash!==row.cutoffRuleHash||row.cutoffTimeZone!=='Asia/Manila'||!row.cutoffLocalTime||!authority.rule.permittedTimes.includes(row.cutoffLocalTime)||row.cutoffOn<authority.rule.validFrom||row.cutoffOn>authority.rule.validThrough)throw new AuthError(409,'CUTOFF_AUTHORITY_CHANGED','The window time does not match its recorded office authority.');
 const timing=windowTiming(row.cutoffOn,policy,row.cutoffLocalTime);
 if(timing.cutoffAtUtc!==row.cutoffAtUtc)throw new AuthError(409,'CUTOFF_SOURCE_CHANGED','The recorded cutoff boundary requires source review.');
 return {...timing,cutoffLocalTime:row.cutoffLocalTime,cutoffTimeZone:'Asia/Manila' as const,cutoffRuleRevision:Number(row.cutoffRuleRevision),cutoffRuleHash:authority.hash};
}
export type RecordedWindowTiming=Awaited<ReturnType<typeof recordedWindowTiming>>;
