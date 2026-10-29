import { z } from "zod";
import { today } from "../scholars/validation.js";
import { AuthError } from "../auth/service.js";

const note=(min:number,max:number)=>z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
export const recordingInput=z.object({
  mode:z.enum(["selected","all_remaining_paid"]), scholarshipIds:z.array(z.uuid()).max(1200).default([]),
  outcome:z.enum(["paid","unclaimed"]), actualPaidOn:z.iso.date().refine(d=>d>="1900-01-01"&&d<=today()).nullable(),
  reference:note(3,300), reason:note(5,500),
}).strict().refine(v=>new Set(v.scholarshipIds).size===v.scholarshipIds.length &&
  (v.mode==="selected" ? v.scholarshipIds.length>0 : v.outcome==="paid" && !v.scholarshipIds.length) &&
  (v.outcome==="paid" ? v.actualPaidOn!==null : v.actualPaidOn===null));
export const recordingCommit=z.object({input:recordingInput,basis:z.string().regex(/^[a-f0-9]{64}$/),
  acceptedIds:z.array(z.uuid()).min(1).max(1200),reviewed:z.literal(true),receiptConfirmed:z.boolean(),
}).strict().refine(v=>new Set(v.acceptedIds).size===v.acceptedIds.length && (v.input.outcome!=="paid" || v.receiptConfirmed));
export function recordingParse<T>(schema:z.ZodType<T>,raw:unknown):T {
  const result=schema.safeParse(raw);
  if(!result.success)throw new AuthError(422,"VALIDATION_FAILED","Provide the payment date, reference, reason and reviewed confirmation. Unclaimed has no payment date.");
  return result.data;
}
export type RecordingInput=z.infer<typeof recordingInput>;
export type RecordingRow={scholarshipId:string;humanId:string;name:string;school:string|null;amount:string;outcome:"paid"|"unclaimed"|"pending"|"needs_review";actualPaidOn:string|null;paymentId:string|null};
export type RecordingSummary={batchId:string;revision:number;code:string;name:string;academicYear:string;semester:string;state:string;canRecord:boolean;
  total:number;paid:number;unclaimed:number;pending:number;needsReview:number;totalAmount:string;paidAmount:string;unclaimedAmount:string;pendingAmount:string;needsReviewAmount:string};
export type RecordingPreview={basis:string;acceptedIds:string[];accepted:{scholarshipId:string;name:string;amount:string}[];conflicts:{scholarshipId:string;name:string;reason:string}[];
  count:number;amount:string;final:{paid:number;unclaimed:number;pending:number;needsReview:number}};
export const centsText=(cents:number)=>`${Math.floor(cents/100)}.${String(cents%100).padStart(2,"0")}`;
