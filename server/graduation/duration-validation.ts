import {z} from 'zod';
import {AuthError} from '../auth/service.js';
export const text=(min:number,max:number)=>z.string().trim().normalize('NFC').min(min).max(max).regex(/^\P{Cc}*$/u);
export const code=text(1,80), hash=z.string().regex(/^[0-9a-f]{64}$/),date=z.iso.date();
export const source=z.object({type:z.enum(['official_curriculum','official_program_notice','official_school_confirmation']),issuer:text(2,160),reference:text(3,300),location:text(1,300).nullable().default(null),issuedOn:date.nullable().default(null)}).strict();
export const reviewContext=z.object({academicYearId:z.uuid(),academicYearVersion:z.number().int().positive(),workingSettingId:z.uuid(),workingSettingVersion:z.number().int().positive()}).strict();
export const durationFacts=z.object({scopeKind:z.enum(['all','curriculum','cohort','curriculum_cohort']),curriculumCode:code.nullable().default(null),cohortCode:code.nullable().default(null),appliesFromYearId:z.uuid(),appliesThroughYearId:z.uuid().nullable().default(null),durationYears:z.string().regex(/^(?:[0-9]|[1-9][0-9])(?:\.[0-9]{1,2})?$/).refine(v=>Number(v)>0&&Number(v)<=99.99).transform(v=>Number(v).toFixed(2)).nullable(),finalYearLevel:z.number().int().min(1).max(100).nullable().default(null),levelBasis:z.enum(['annual_year_number','no_annual_mapping']),source}).strict().superRefine((v,c)=>{
 if(Boolean(v.curriculumCode)!==['curriculum','curriculum_cohort'].includes(v.scopeKind)||Boolean(v.cohortCode)!==['cohort','curriculum_cohort'].includes(v.scopeKind))c.addIssue({code:'custom',message:'Supply exactly the curriculum/cohort codes declared by the source scope.'});
 if((v.levelBasis==='annual_year_number')!==(v.finalYearLevel!==null))c.addIssue({code:'custom',message:'An annual mapping requires the evidenced final year; no mapping requires an unknown final year.'});
});
export const durationCreate=z.object({schoolId:z.uuid(),courseId:z.uuid(),reviewContext,facts:durationFacts,reason:text(5,500)}).strict();
const base={expectedRevision:z.number().int().positive(),expectedSnapshotHash:hash,reviewContext,reason:text(5,500)};
export const durationAppend=z.discriminatedUnion('action',[
 z.object({...base,action:z.literal('propose_correction'),facts:durationFacts}).strict(),
 z.object({...base,action:z.literal('dispute'),facts:durationFacts}).strict(),
 z.object({...base,action:z.literal('confirm'),reviewSourceHash:hash,reviewed:z.literal(true)}).strict(),
 ...(['reject','withdraw','retire'] as const).map(action=>z.object({...base,action:z.literal(action),sourceReference:text(3,300)}).strict()),
]);
export const page=z.object({offset:z.coerce.number().int().min(0).max(1000000).default(0),limit:z.coerce.number().int().min(1).max(100).default(25)}).strict();
export const durationQuery=page.extend({schoolId:z.uuid().optional(),courseId:z.uuid().optional(),academicYearId:z.uuid().optional(),state:z.enum(['proposed','confirmed','rejected','withdrawn','disputed','retired']).optional(),q:text(0,160).default('')}).strict();
export function parse<T>(schema:z.ZodType<T>,raw:unknown):T {const r=schema.safeParse(raw);if(!r.success)throw new AuthError(422,'VALIDATION_FAILED',r.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join(' ').slice(0,800));return r.data;}
