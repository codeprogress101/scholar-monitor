// Types shared by retained synthetic UAT helpers; no runtime policy or commands.
import type {LightMyRequestResponse} from 'fastify';
import type {RecordingSummary} from '../server/payments/recording-model.js';

export type UatRequest=(role:string,url:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;
export type HttpOk=<T=unknown>(response:Promise<LightMyRequestResponse>)=>Promise<T>;
export type FixtureBatch={number:number;count:number;classification:string;importId:string;masterlistId:string;priorApproval:unknown;reference:string;scholarIds:string[];batchId?:string;state?:string;summary?:RecordingSummary;frozenHash?:string;guard?:{code?:string;message?:string;attemptedAt?:string;earliestSubmitDay?:string;historicalSecondSetupCode?:string;at?:string;submission?:unknown;secondHistoricalSetup?:unknown;sourceIssue?:string;sourceIssueCount?:number;candidateRows?:number;sourceIssueMeaning?:string}};
export type TwoBatchManifest={database:string;runtimeUser:string;ownerId:string;ownerToken:string;state:string;synthetic:boolean;createdAt:string;yearId:string;semesterId:string;day:string;batches:FixtureBatch[];cycleId:string;cycleVersion:number};
export type ExtendedWorkflows={synthetic:boolean;scholars:{index:number;scholarId:string;annualId:string;academicId:string}[];documents:{scholarId:string;intended:string}[];masterlists:{id:string;state:string}[];status:{scholarshipId:string;status:string;requestId:string}[];academicChanges:unknown[]};
