import {z} from 'zod';
import {AuthError} from '../auth/service.js';
export const omissionInput=z.object({
 action:z.enum(['record','add-to-payroll','request','approve','reject','prepare','request-cancellation','approve-cancellation','reject-cancellation']),
 sourceBatchId:z.uuid(),scholarshipId:z.uuid(),omissionId:z.uuid().optional(),expectedRevision:z.number().int().nonnegative(),
 destinationBatchId:z.uuid().optional(),expectedSourceHash:z.string().regex(/^[a-f0-9]{64}$/).optional(),reason:z.string().trim().max(500).default(''),
 externalUnpaidConfirmed:z.literal(true).optional(),
}).strict().superRefine((v,c)=>{
 if(v.action!=='record'&&!v.omissionId)c.addIssue({code:'custom',message:'Select the recorded omission.'});
 if(v.action==='add-to-payroll'&&!v.destinationBatchId)c.addIssue({code:'custom',message:'Select a later editable payroll.'});
 if(['approve','reject','request-cancellation','approve-cancellation','reject-cancellation'].includes(v.action)&&v.reason.length<5)c.addIssue({code:'custom',message:'Provide a decision reason.'});
 if(['approve','prepare'].includes(v.action)&&!v.expectedSourceHash)c.addIssue({code:'custom',message:'Review current eligibility first.'});
});
export type OmissionInput=z.infer<typeof omissionInput>;
export function parseOmission(raw:unknown){const v=omissionInput.safeParse(raw);if(!v.success)throw new AuthError(422,'VALIDATION_FAILED','Select the omission, review current eligibility and provide any required decision reason.');return v.data;}
export const omissionLabels:Record<string,string>={recorded:'Omission Recorded',payroll:'Review in Payroll',requested:'Awaiting Coordinator',approved:'OR + DV Authorized',rejected:'Authorization Rejected',prepared:'OR + DV Prepared',cancel_requested:'Cancellation Requested',cancelled:'Cancelled'};
export type OmissionRow={scholarshipId:string;humanId:string;name:string;sourceBatchId:string;sourceCode:string;academicYear:string;semester:string;omissionId:string|null;revision:number;state:string;status:string;entitlementId:string|null;amount:string;route:string};
