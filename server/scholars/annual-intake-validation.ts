import {validSuppliedText,blankSuppliedText} from './intake-text-model.js';
import {z} from "zod";
import {AuthError} from "../auth/service.js";
import {validationDetails} from "../validation-details.js";
import {scholarFieldsSchema} from "./validation.js";
export const intakeText=(min:number,max:number)=>z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
const optionalId=z.preprocess(v=>v===""?null:v,z.uuid().nullable().default(null));
export const initialPlacementSchema=z.object({schoolId:optionalId,courseId:optionalId,yearLevel:z.preprocess(v=>v===""?null:v,intakeText(1,60).nullable().default(null))}).strict();
export const workingContextSchema=z.object({settingId:z.uuid(),settingVersion:z.number().int().positive(),academicYearVersion:z.number().int().positive()}).strict();
const duplicateResolution=z.object({snapshot:z.string().regex(/^[a-f0-9]{64}$/),decision:z.literal("create_separate"),reason:intakeText(10,500)}).strict();
export const registrationSchema=z.object({
 identity:z.discriminatedUnion("mode",[
  z.object({mode:z.literal("new"),fields:scholarFieldsSchema,duplicateResolution:duplicateResolution.optional()}).strict(),
  z.object({mode:z.literal("reuse"),scholarId:z.uuid(),expectedVersion:z.number().int().positive(),identityConfirmed:z.literal(true),identityReference:intakeText(3,300)}).strict(),
 ]),
 workingContext:workingContextSchema,
 annualIntake:z.object({academicYearId:z.uuid(),classification:z.enum(["new","continuing"]),sourceReference:intakeText(3,300),initialPlacement:initialPlacementSchema.default({schoolId:null,courseId:null,yearLevel:null})}).strict(),
 reason:intakeText(5,500),
}).strict().refine(v=>v.identity.mode!=="new"||v.identity.fields.academicYearId===v.annualIntake.academicYearId,{message:"Identity and annual intake must use the selected working year."});
const revisionBase={expectedRevision:z.number().int().positive(),expectedSnapshotHash:z.string().regex(/^[a-f0-9]{64}$/),academicYearVersion:z.number().int().positive(),sourceReference:intakeText(3,300),reason:intakeText(5,500)};
export const supplementSchema=z.object({...revisionBase,workingContext:workingContextSchema,initialPlacement:initialPlacementSchema}).strict();
export const classificationCorrectionSchema=z.object({...revisionBase,classification:z.enum(["new","continuing"]),reviewed:z.literal(true)}).strict();
export const intakeQuerySchema=z.object({academicYearId:z.uuid().optional(),offset:z.coerce.number().int().min(0).max(1000000).default(0),limit:z.coerce.number().int().min(1).max(100).default(25)}).strict();
export function parseIntake<T>(schema:z.ZodType<T>,raw:unknown):T {const p=schema.safeParse(raw);if(!p.success)throw new AuthError(422,"VALIDATION_FAILED","Review the selected year, classification, source and initial information.",validationDetails(p.error));return p.data;}
/** Fixed construction order, independent of incoming JSON property order. */
export function canonicalIntakeValue(value:unknown):unknown {
 if(Array.isArray(value))return value.map(canonicalIntakeValue);
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b,"en")).map(([key,v])=>[key,canonicalIntakeValue(v)]));
 return value;
}

export const suppliedTextScalar=z.preprocess(blankSuppliedText,z.union([z.null(),z.string().refine(validSuppliedText,{message:'Use at most 300 characters, without controls or directional overrides.'})]));
export const suppliedTextSchema=z.object({schoolText:suppliedTextScalar,courseText:suppliedTextScalar}).strict();
export const registrationV2Schema=registrationSchema.safeExtend({format:z.literal('scholar-registration/v2'),annualIntake:z.object({academicYearId:z.uuid(),classification:z.enum(['new','continuing']),sourceReference:intakeText(3,300),initialPlacement:initialPlacementSchema.refine(p=>p.schoolId===null&&p.courseId===null,{message:'Text registration cannot also select reference IDs.'}),suppliedText:suppliedTextSchema}).strict()});
