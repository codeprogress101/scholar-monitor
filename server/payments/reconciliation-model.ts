import { z } from "zod";
import type { RecordingSummary } from "./recording-model.js";
import { today } from "../scholars/validation.js";
import { AuthError } from "../auth/service.js";
const text=(min:number,max:number)=>z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
const basis=z.string().regex(/^[a-f0-9]{64}$/),revision=z.number().int().positive();
const expected={expectedRevision:revision,expectedReconciliationRevision:z.number().int().nonnegative()};
const day=z.iso.date().refine(d=>d>="1900-01-01"&&d<=today());
export const reconciliationCommand=z.discriminatedUnion("action",[
 z.object({...expected,action:z.literal("verify"),sourceHash:basis,returnedAndCompared:z.literal(true)}).strict(),
 z.object({...expected,action:z.literal("report"),scholarshipId:z.uuid(),description:text(5,1000)}).strict(),
 z.object({...expected,action:z.literal("dismiss"),caseId:z.uuid(),reason:text(5,500)}).strict(),
 z.object({...expected,action:z.literal("correct"),sourceHash:basis,paymentId:z.uuid(),outcome:z.enum(["paid","unclaimed"]),actualPaidOn:day.nullable(),reason:text(5,500),confirmed:z.literal(true),caseId:z.uuid().optional()}).strict().refine(p=>p.outcome==="paid"?p.actualPaidOn!==null:p.actualPaidOn===null),
 z.object({...expected,action:z.literal("close"),sourceHash:basis,effectiveOn:day,reviewed:z.literal(true),overrideReason:text(5,500).optional()}).strict(),
]);
export function parseReconciliation(raw:unknown){const p=reconciliationCommand.safeParse(raw);if(!p.success)throw new AuthError(422,"VALIDATION_FAILED","Review the current payroll and complete the required confirmation or reason.");return p.data;}
export type ReconciliationCommand=z.infer<typeof reconciliationCommand>;
export type ReconciliationEvent={id:string;batchId:string;revision:number;batchRevision:number;kind:"verified"|"reported"|"dismissed"|"corrected"|"closed";actorId:string;actorName:string;recordedAt:string;caseId?:string;scholarshipId?:string;paymentId?:string|null;description?:string;reason?:string;humanId?:string;name?:string;sourceHash?:string;financialHash?:string;rosterHash?:string;transactionId?:string};
export type ReconciliationOverview={summary:RecordingSummary;sourceHash:string;reconciliationRevision:number;recordingComplete:boolean;unresolvedDiscrepancies:number;pendingCorrections:number;pendingHistoricalReceipts:number;verification:"Not verified"|"Verified"|"Re-verification Required"|"Verified at closure"|"Closed";verificationEvent:ReconciliationEvent|null;originalAvailable:boolean;updatedAvailable:boolean;canVerify:boolean;canClose:boolean;canOverrideVerification:boolean;blockers:string[]};
export type ClosureMember={position:number;scholarshipId:string;scholarId:string;humanId:string;name:string;school:string;course:string;yearLevel:number;academicYear:string;semester:string;amount:string;outcome:"paid"|"unclaimed";actualPaidOn:string|null;paymentId:string;paymentRevision:number};
export type ClosureEvidence=ReconciliationEvent&{kind:"closed";version:"payroll-closure/v1";rosterHash:string;sourceHash:string;financialHash:string;summary:RecordingSummary;memberHashes:string[];verification:ReconciliationEvent|null;overrideReason:string|null};
export function recordingComplete(s:RecordingSummary){return s.total>0&&s.pending===0&&s.needsReview===0&&s.paid+s.unclaimed===s.total&&Math.round(Number(s.paidAmount)*100)+Math.round(Number(s.unclaimedAmount)*100)===Math.round(Number(s.totalAmount)*100);}
