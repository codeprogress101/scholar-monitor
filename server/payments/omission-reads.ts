import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {AuthError} from '../auth/service.js';
import {digest} from '../auth/crypto.js';
import {parseRequirementList} from '../requirements/validation.js';
import {omissionLabels,type OmissionRow} from './omission-model.js';

export async function omissionOptions(db:PoolConnection){
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT b.id,b.code,b.cycle_id,y.code academic_year,s.name semester,
 COALESCE((SELECT p.state FROM payroll_preparation_versions p WHERE p.cycle_id=c.id ORDER BY revision DESC LIMIT 1),'open') preparation
 FROM ovr_batches b JOIN ovr_finalizations f ON f.batch_id=b.id JOIN payroll_submission_windows w ON w.batch_id=b.id
 JOIN payout_cycles c ON c.id=b.cycle_id JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=s.academic_year_id
 ORDER BY b.created_at DESC,b.id LIMIT 100`);
 return {items:rows.map(r=>({id:String(r.id),code:String(r.code),cycleId:String(r.cycle_id),academicYear:String(r.academic_year),semester:String(r.semester),preparation:String(r.preparation)}))};
}
export async function omissionOrigin(db:PoolConnection,batchId:string){
 const [[r]]=await db.execute<RowDataPacket[]>(`SELECT b.id,b.cycle_id,b.code,w.batch_number,f.snapshot_hash,f.entry_count,s.academic_year_id,c.semester_id,y.code academic_year,s.name semester
 FROM ovr_batches b JOIN ovr_finalizations f ON f.batch_id=b.id JOIN payroll_submission_windows w ON w.batch_id=b.id
 JOIN payout_cycles c ON c.id=b.cycle_id JOIN semesters s ON s.id=c.semester_id JOIN academic_years y ON y.id=s.academic_year_id WHERE b.id=?`,[batchId]);
 if(!r)throw new AuthError(409,'OMISSION_SOURCE_INVALID','Select an actual finalized numbered payroll in this semester.');return r;
}
export async function omissionPage(db:PoolConnection,batchId:string,raw:unknown){
 const origin=await omissionOrigin(db,batchId),q=parseRequirementList(raw);
 const base=`FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=r.scholar_id
 LEFT JOIN payroll_omissions o ON o.scholar_id=r.scholar_id AND o.semester_id=?
 LEFT JOIN payroll_omission_events e ON e.omission_id=o.id AND NOT EXISTS(SELECT 1 FROM payroll_omission_events n WHERE n.omission_id=e.omission_id AND n.revision>e.revision)
 WHERE r.academic_year_id=? AND (o.id IS NULL OR o.source_batch_id=?)
 AND (o.id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM semester_entitlements ent WHERE ent.scholar_id=r.scholar_id AND ent.semester_id=?))
 AND (LOCATE(LOWER(?),LOWER(CONCAT_WS(' ',s.last_name,s.first_name,s.middle_name)))>0 OR LOCATE(LOWER(?),LOWER(i.human_id))>0)`;
 const values=[origin.semester_id,origin.academic_year_id,batchId,origin.semester_id,q.q,q.q];
 const [[n]]=await db.execute<RowDataPacket[]>(`SELECT COUNT(*) n ${base}`,values);
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT r.id scholarship_id,i.human_id,CONCAT_WS(' ',s.last_name,s.first_name,NULLIF(s.middle_name,''),NULLIF(s.suffix,'')) name,o.id omission_id,e.revision,e.state,e.entitlement_id ${base} ORDER BY i.human_id,r.id LIMIT ${q.limit} OFFSET ${q.offset}`,values);
 return {items:rows.map(r=>({scholarshipId:r.scholarship_id,humanId:r.human_id,name:r.name,sourceBatchId:batchId,sourceCode:origin.code,academicYear:origin.academic_year,semester:origin.semester,omissionId:r.omission_id??null,revision:Number(r.revision??0),state:r.state??'unreviewed',status:omissionLabels[r.state]??'Eligibility not yet assessed',entitlementId:r.entitlement_id??null,amount:'5000.00',route:['requested','approved','prepared','cancel_requested'].includes(r.state)?'Individual OR + DV':r.state==='payroll'?'Payroll review':'Not assigned'} satisfies OmissionRow)),total:Number(n.n),offset:q.offset,limit:q.limit};
}
export async function omissionCase(db:PoolConnection,id:string){
 const [[r]]=await db.execute<RowDataPacket[]>(`SELECT o.*,e.revision,e.action,e.state,e.destination_batch_id,e.entitlement_id,e.snapshot,e.snapshot_hash
 FROM payroll_omissions o JOIN payroll_omission_events e ON e.omission_id=o.id WHERE o.id=? AND NOT EXISTS(SELECT 1 FROM payroll_omission_events n WHERE n.omission_id=e.omission_id AND n.revision>e.revision) LOCK IN SHARE MODE`,[id]);
 if(!r)throw new AuthError(409,'OMISSION_UNAVAILABLE','Refresh and select the recorded omission.');
 r.data=typeof r.snapshot==='string'?JSON.parse(r.snapshot):r.snapshot;
 if(digest(JSON.stringify(r.data))!==r.snapshot_hash)throw new AuthError(409,'OMISSION_EVIDENCE_INVALID','Preserve this omission history for technical review.');return r;
}
export async function omissionHistory(db:PoolConnection,id:string,raw:unknown){
 const q=parseRequirementList(raw);const [[n]]=await db.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM payroll_omission_events WHERE omission_id=?',[id]);
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT e.*,u.full_name FROM payroll_omission_events e JOIN users u ON u.id=e.actor_id WHERE e.omission_id=? ORDER BY revision DESC LIMIT ${q.limit} OFFSET ${q.offset}`,[id]);
 return {items:rows.map(r=>{const snapshot=typeof r.snapshot==='string'?JSON.parse(r.snapshot):r.snapshot;if(digest(JSON.stringify(snapshot))!==r.snapshot_hash)throw new AuthError(409,'OMISSION_EVIDENCE_INVALID','Preserve this history for technical review.');return {revision:Number(r.revision),action:String(r.action),state:String(r.state),reason:String(r.reason),actor:String(r.full_name),recordedAt:new Date(r.recorded_at).toISOString(),snapshot:{approvalRevision:snapshot.approvalRevision??null,transactionId:snapshot.transactionId??null,reference:snapshot.reference??null}};}),total:Number(n.n),offset:q.offset,limit:q.limit};
}
