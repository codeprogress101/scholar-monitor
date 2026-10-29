import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {digest} from '../auth/crypto.js';
import {AuthError} from '../auth/service.js';

export const omissionSourceSql=`SELECT o.id,o.scholar_id,o.scholarship_id,o.semester_id,o.source_batch_id,e.revision,e.action,e.state,e.destination_batch_id,e.entitlement_id,e.snapshot,e.snapshot_hash
 FROM payroll_omissions o JOIN payroll_omission_events e ON e.omission_id=o.id
 WHERE o.scholar_id=? AND o.semester_id=? AND NOT EXISTS(SELECT 1 FROM payroll_omission_events n WHERE n.omission_id=e.omission_id AND n.revision>e.revision) LOCK IN SHARE MODE`;
export const reservedOmissionStates=['requested','approved','prepared','cancel_requested'] as const;
export const omissionRouteSql=`SELECT o.id FROM scholarship_records r JOIN payroll_omissions o ON o.scholar_id=r.scholar_id
 JOIN payroll_omission_events e ON e.omission_id=o.id WHERE r.id=? AND o.semester_id=?
 AND e.state IN ('requested','approved','prepared','cancel_requested')
 AND NOT EXISTS(SELECT 1 FROM payroll_omission_events n WHERE n.omission_id=e.omission_id AND n.revision>e.revision)`;
export function omissionReserved(state:string){return (reservedOmissionStates as readonly string[]).includes(state);}
export type OmissionSource={id:string;revision:number;state:string;sourceBatchId:string;destinationBatchId:string|null;entitlementId:string|null;hash:string;approvalRevision:number|null;transactionId:string|null};
export async function omissionSource(db:PoolConnection,scholar:string,semester:string):Promise<OmissionSource|null>{
 const [[r]]=await db.execute<RowDataPacket[]>(omissionSourceSql,[scholar,semester]);if(!r)return null;
 const snapshot=typeof r.snapshot==='string'?JSON.parse(r.snapshot):r.snapshot;
 if(digest(JSON.stringify(snapshot))!==r.snapshot_hash)throw new AuthError(409,'OMISSION_EVIDENCE_INVALID','Preserve this omission history for technical review.');
 return {id:r.id,revision:Number(r.revision),state:r.state,sourceBatchId:r.source_batch_id,destinationBatchId:r.destination_batch_id??null,entitlementId:r.entitlement_id??null,hash:r.snapshot_hash,approvalRevision:snapshot.approvalRevision??null,transactionId:snapshot.transactionId??null};
}
export function mayReviewOwnOmission(source:OmissionSource|null,id:string|undefined,batch:string|undefined){return Boolean(source&&id===source.id&&batch===source.sourceBatchId);}
