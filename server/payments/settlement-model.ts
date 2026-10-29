import {z} from 'zod';
import {AuthError} from '../auth/service.js';
import {today} from '../scholars/validation.js';
import type {PaymentRecord} from '../ovr/processing-model.js';
const day=z.iso.date().refine(d=>d>='1900-01-01'&&d<=today());
const hash=z.string().regex(/^[a-f0-9]{64}$/),text=(min:number,max:number)=>z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
const ids=z.array(z.uuid()).min(1).max(200).refine(v=>new Set(v).size===v.length);
export const settlementInput=z.discriminatedUnion('mode',[
 z.object({mode:z.literal('single'),transactionIds:ids.refine(v=>v.length===1),actualPaidOn:day,authorizationDocumentsVerified:z.literal(true).optional()}).strict(),
 z.object({mode:z.literal('bulk'),transactionIds:ids,actualPaidOn:day}).strict(),
]);
export const settlementCommit=z.object({input:settlementInput,basis:hash,acknowledgedRelease:z.literal(true),scholarPersonalReleaseConfirmed:z.literal(true).optional()}).strict().refine(v=>v.input.mode==='bulk'?v.scholarPersonalReleaseConfirmed===true:v.scholarPersonalReleaseConfirmed===undefined);
const common={transactionId:z.uuid(),expectedRevision:z.number().int().positive()};
export const settlementCommand=z.discriminatedUnion('action',[
 z.object({...common,action:z.literal('forward'),sourceHash:hash}).strict(),
 z.object({...common,action:z.literal('report'),description:text(5,1000),discoveredPaidOn:day.optional(),acknowledgedRelease:z.literal(true).optional()}).strict().refine(v=>!v.discoveredPaidOn||v.acknowledgedRelease===true),
 z.object({...common,action:z.literal('dismiss'),caseId:z.uuid(),reason:text(5,500)}).strict(),
 z.object({...common,action:z.literal('confirm-original'),caseId:z.uuid(),sourceHash:hash,reason:text(5,500),acknowledgedRelease:z.literal(true),voidReplacement:z.literal(true),authorizationDocumentsVerified:z.literal(true).optional()}).strict(),
 z.object({...common,action:z.literal('correct-date'),actualPaidOn:day,reason:text(5,500)}).strict(),
 z.object({...common,action:z.literal('request-correction'),outcome:z.enum(['paid','not_paid']),actualPaidOn:day.nullable(),reason:text(5,500),priorReceiptConfirmed:z.boolean().default(false),priorReceiptEvidence:text(0,1000).default('')}).strict().refine(v=>v.outcome==='paid'?v.actualPaidOn!==null:v.actualPaidOn===null),
 z.object({...common,action:z.enum(['approve-correction','reject-correction']),correctionId:z.uuid(),reason:text(5,500)}).strict(),
]);
export function settlementParse<T>(schema:z.ZodType<T>,raw:unknown):T{const p=schema.safeParse(raw);if(!p.success)throw new AuthError(422,'VALIDATION_FAILED','Review the selected payments, actual payment date and required confirmation. Representative collection is recorded individually.');return p.data;}
export type SettlementInput=z.infer<typeof settlementInput>;
export type SettlementCommand=z.infer<typeof settlementCommand>;
export type IndividualSettlement=Omit<PaymentRecord,'batchId'>&{batchId:null;sourceKind:'individual';individualTransactionId:string;entitlementId:string;sourceBatchId:string;sourceKindDetail:'unclaimed'|'omitted';releaseEvidence:Record<string,unknown>};
export type IndividualCorrection={id:string;version:number;paymentId:string;batchId:null;individualTransactionId:string;revision:number;state:'pending'|'applied'|'approved'|'rejected';before:IndividualSettlement;proposed:IndividualSettlement;after?:IndividualSettlement;reason:string;requestedBy:string;requestedAt:string;decidedBy?:string;decisionReason?:string};
export type SettlementRow={transactionId:string;entitlementId:string;scholarshipId:string;humanId:string;name:string;semester:string;academicYear:string;amount:string;sourceKind:'unclaimed'|'omitted';reference:string;revision:number;status:string;originalPayrollOutcome:'Unclaimed'|'Omitted';settlement:IndividualSettlement|null;paymentRecorded?:boolean;forwarded:boolean;blockers:string[]};
export type SettlementPreview={basis:string;accepted:{transactionId:string;name:string;amount:string}[];conflicts:{transactionId:string;name:string;reason:string}[];count:number;amount:string};
