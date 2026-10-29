import {z} from 'zod';
import {text,source,hash,code,date} from './duration-validation.js';
export const expectedPeriod=z.discriminatedUnion('precision',[
 z.object({precision:z.literal('academic_year'),academicYearId:z.uuid().nullable(),label:text(1,160)}).strict(),
 z.object({precision:z.literal('semester'),academicYearId:z.uuid().nullable(),semesterId:z.uuid().nullable(),label:text(1,160)}).strict(),
 z.object({precision:z.literal('date'),date,label:text(1,160).nullable().default(null)}).strict(),
]);
export const assessment=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('expected'),period:expectedPeriod,source,finding:text(3,500)}).strict(),
 z.object({kind:z.literal('delayed'),period:expectedPeriod.nullable().default(null),source,finding:text(3,500)}).strict(),
]);
export const eventDetails=z.discriminatedUnion('operation',[
 z.object({operation:z.literal('record_expected'),details:z.object({kind:z.literal('expected'),period:expectedPeriod,source,finding:text(3,500)}).strict()}).strict(),
 z.object({operation:z.literal('record_delayed'),details:z.object({kind:z.literal('delayed'),period:expectedPeriod.nullable().default(null),source,finding:text(3,500)}).strict()}).strict(),
 z.object({operation:z.literal('follow_up'),details:z.object({source,result:text(3,500),method:text(1,160).nullable().default(null),nextOn:date.nullable().default(null),correctsRevision:z.number().int().positive().nullable().default(null)}).strict()}).strict(),
 z.object({operation:z.literal('flag_review'),details:z.object({source,finding:text(3,500)}).strict()}).strict(),
 z.object({operation:z.literal('propose_correction'),details:z.object({targetRevision:z.number().int().positive(),replacement:assessment}).strict()}).strict(),
 z.object({operation:z.literal('review_correction'),details:z.object({targetRevision:z.number().int().positive(),disposition:z.enum(['apply_replacement','retain_current_revalidated','keep_needs_review']),source,reviewSourceHash:hash}).strict()}).strict(),
 z.object({operation:z.literal('correct_assessment'),details:z.object({targetRevision:z.number().int().positive(),replacement:assessment}).strict()}).strict(),
 z.object({operation:z.literal('revalidate_assessment'),details:z.object({targetRevision:z.number().int().positive(),source,reviewSourceHash:hash}).strict()}).strict(),
 z.object({operation:z.literal('record_program_context'),details:z.object({curriculumCode:code.nullable(),cohortCode:code.nullable(),source}).strict().refine(v=>v.curriculumCode!==null||v.cohortCode!==null,'Supply at least one supported code.')}).strict(),
 z.object({operation:z.literal('review_program_context'),details:z.object({targetRevision:z.number().int().positive(),decision:z.enum(['confirm','reject']),source,reviewSourceHash:hash}).strict()}).strict(),
]);
const common=z.object({expectedRevision:z.number().int().nonnegative(),expectedSnapshotHash:hash.nullable().default(null),academicYearVersion:z.number().int().positive(),semesterVersion:z.number().int().positive().nullable().default(null),expectedSourceHash:hash,reason:text(5,500),reviewed:z.literal(true)}).strict();
// Intersections above must reject fields unknown to both branches, rather than
// strict-object branches rejecting each other's valid common fields.
const keys=['expectedRevision','expectedSnapshotHash','academicYearVersion','semesterVersion','expectedSourceHash','reason','reviewed'];
export function splitMonitoring(raw:unknown,create:boolean){
 const input=z.record(z.string(),z.unknown()).parse(raw);const owner=create?['scholarId','academicYearId','semesterId']:[];
 const allowed=[...keys,...owner,'operation','details'];
 if(Object.keys(input).some(k=>!allowed.includes(k)))throw new Error('UNKNOWN_MONITORING_FIELD');
 const commonRaw=Object.fromEntries([...keys,...owner].filter(k=>k in input).map(k=>[k,input[k]]));
 const ownerSchema=common.extend(create?{scholarId:z.uuid(),academicYearId:z.uuid(),semesterId:z.uuid().nullable().default(null)}:{}).strict();
 return {...ownerSchema.parse(commonRaw),...eventDetails.parse({operation:input.operation,details:input.details})};
}
