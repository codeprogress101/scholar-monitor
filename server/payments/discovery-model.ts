import {z} from 'zod';
import {AuthError} from '../auth/service.js';
import {parseRequirementList} from '../requirements/validation.js';
export function discoveryQuery(raw:unknown){
 const parsed=z.object({academicYearId:z.uuid(),semesterId:z.uuid(),filter:z.enum(['unassigned','deferred','review','reserved']).default('unassigned'),sourceBatchId:z.uuid().optional(),q:z.string().optional(),offset:z.coerce.number().optional(),limit:z.coerce.number().optional()}).strict().safeParse(raw);
 if(!parsed.success)throw new AuthError(422,'VALIDATION_FAILED','Choose an academic year, semester and supported discovery filter.');
 const {q,offset,limit,...scope}=parsed.data;
 return {...scope,...parseRequirementList({...(q===undefined?{}:{q}),...(offset===undefined?{}:{offset}),...(limit===undefined?{}:{limit})})};
}
export type DiscoveryRow={scholarId:string;scholarshipId:string;name:string;humanId:string;status:string;requirements:string;reviewReasons:string[];payable:false;payrolls:{id:string;code:string;state:string}[];deferrals:{batchId:string;code:string;state:string;reason:string;recordedAt:string}[];omissionId:string|null;omissionSourceId:string|null;next:{label:string;href?:string;omissionReviewBatchId?:string}};
export type DiscoveryContext={enabled:boolean;today:string;workingYearId:string|null;years:{id:string;code:string}[];semesters:{id:string;academicYearId:string;code:string;name:string;startsOn:string;endsOn:string}[]};
export type DiscoveryPage={items:DiscoveryRow[];total:number;offset:number;limit:number;filter:'unassigned'|'deferred'|'review'|'reserved';context:{academicYearId:string;academicYear:string;semesterId:string;semester:string;cycleId:string|null;cycleName:string|null;ordinaryDraftCount:number};payrolls:{id:string;code:string;state:string}[];scope:'recorded_assignment';readOnly:true};
