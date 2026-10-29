import {z} from "zod";
import {AuthError} from "../auth/service.js";
export const individualInput=z.object({
 action:z.enum(['request','prepare','request-cancellation','approve-cancellation','reject-cancellation','replace']),
 paymentId:z.uuid(),expectedRevision:z.number().int().nonnegative(),
 transactionId:z.uuid().optional(),reason:z.string().trim().max(500).default(''),
 externalUnpaidConfirmed:z.literal(true).optional(),
}).strict().superRefine((v,c)=>{
 if(v.action!=='request'&&!v.transactionId)c.addIssue({code:'custom',message:'Select the current request or DV.'});
 if(v.action.includes('cancellation')&&v.reason.length<5)c.addIssue({code:'custom',message:'Provide a cancellation decision reason.'});
});
export type IndividualInput=z.infer<typeof individualInput>;
export function parseIndividual(raw:unknown){const p=individualInput.safeParse(raw);if(!p.success)throw new AuthError(422,'VALIDATION_FAILED','Select the current record and provide a reason for cancellation decisions.');return p.data;}
export type IndividualAction='request_recorded'|'prepared'|'cancel_requested'|'cancel_rejected'|'cancelled'|'original_paid_cancelled'|'forwarded'|'paid'|'payment_corrected';
export function individualState(action:IndividualAction){return action==='paid'?'Paid':action==='payment_corrected'?'Needs Review':action==='forwarded'?'Forwarded':action==='request_recorded'?'Request Recorded':action==='cancel_requested'?'Cancellation Requested':action==='cancelled'||action==='original_paid_cancelled'?'Cancelled':'DV Prepared';}
export function individualTransition(previous:IndividualAction,action:IndividualInput['action']):IndividualAction{
 const next:Partial<Record<IndividualInput['action'],IndividualAction>>={prepare:'prepared','request-cancellation':'cancel_requested','approve-cancellation':'cancelled','reject-cancellation':'cancel_rejected'};
 const allowed=action==='prepare'?previous==='request_recorded':action==='request-cancellation'?['prepared','cancel_rejected','forwarded'].includes(previous):['approve-cancellation','reject-cancellation'].includes(action)?previous==='cancel_requested':false;
 if(!allowed)throw new AuthError(409,'INDIVIDUAL_STATE_CHANGED','This request or DV changed. Refresh before continuing.');return next[action]!;
}
export type IndividualRow={paymentId:string;entitlementId:string;scholarshipId:string;humanId:string;name:string;academicYear:string;semester:string;batchCode:string;amount:string;outcome:'Unclaimed'|'Paid'|'Needs Review';transactionId:string|null;internalReference:string|null;revision:number;status:string;blockers:string[]};
