import {randomUUID} from "node:crypto";
import {z} from "zod";
import type {PoolConnection, RowDataPacket} from "mysql2/promise";
import {AuthError} from "../auth/service.js";

export const placementReferences = {
  schoolId: z.union([z.uuid(), z.literal("")]).default(""),
  courseId: z.union([z.uuid(), z.literal("")]).default(""),
  schoolName: z.string().trim().min(2).max(160).regex(/^\P{Cc}*$/u).optional(),
  courseName: z.string().trim().min(2).max(160).regex(/^\P{Cc}*$/u).optional(),
};
export function hasPlacementReferences(value: {schoolId:string;courseId:string;schoolName?:string;courseName?:string}) {
  return Boolean(value.schoolId !== "" || value.schoolName) && Boolean(value.courseId !== "" || value.courseName)
    && !(value.schoolId && value.schoolName) && !(value.courseId && value.courseName);
}
/** Caller holds configuration_guard inside its authorized academic transaction. */
export async function resolvePlacementReferences(db:PoolConnection, input:{schoolId:string;courseId:string;schoolName?:string;courseName?:string}, actor:string, requestId:string) {
  const result={schoolId:input.schoolId,courseId:input.courseId};
  for(const [table,key,name] of [["schools","schoolId",input.schoolName],["courses","courseId",input.courseName]] as const){
    if(result[key] || !name) continue;
    const normalized=name.trim().replace(/\s+/gu," ");
    const [rows]=await db.query<RowDataPacket[]>(`SELECT id,name,archived_at FROM ${table} FOR UPDATE`);
    const matches=rows.filter(r=>String(r.name).trim().replace(/\s+/gu," ").toLocaleLowerCase("en")===normalized.toLocaleLowerCase("en"));
    if(matches.length>1) throw new AuthError(422,"AMBIGUOUS_REFERENCE","More than one school/course matches this name. Select the existing entry.");
    if(matches[0]?.archived_at) throw new AuthError(409,"REFERENCE_ARCHIVED","This school/course is archived. Review it before reuse.");
    if(matches.length){result[key]=String(matches[0].id);continue;}
    const id=randomUUID(),code=`ENTRY-${id}`;
    await db.execute(`INSERT INTO ${table} (id,code,name,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[id,code,normalized]);
    await db.execute("INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,'academic.reference_created',?,?,'create',?,'user',UTC_TIMESTAMP(6),?,'School/course entered with scholar academic details',?)",[randomUUID(),table,id,actor,requestId,JSON.stringify({code,name:normalized})]);
    result[key]=id;
  }
  return result;
}
