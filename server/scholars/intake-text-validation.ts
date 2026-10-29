import {z} from 'zod';
import {intakeText,suppliedTextSchema,workingContextSchema} from './annual-intake-validation.js';
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const common={format:z.literal('intake-supplied-text-command/v1'),expectedTextRevision:z.number().int().min(0),expectedTextHash:hash.nullable(),expectedIntakeRevision:z.number().int().positive(),expectedIntakeHash:hash,workingContext:workingContextSchema,suppliedText:suppliedTextSchema,sourceReference:intakeText(3,300),reason:intakeText(5,500)};
const consistent=(v:{expectedTextRevision:number;expectedTextHash:string|null})=>(v.expectedTextRevision===0)===(v.expectedTextHash===null);
export const textCompletionSchema=z.object(common).strict().refine(consistent,{message:'Text revision and hash must agree.'});
export const textCorrectionSchema=z.object({...common,reviewed:z.literal(true)}).strict().refine(consistent,{message:'Text revision and hash must agree.'});
