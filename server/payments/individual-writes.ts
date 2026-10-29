import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {digest} from '../auth/crypto.js';
import {AuthError} from '../auth/service.js';
import type {IndividualAction} from './individual-model.js';
import {omissionRouteSql} from './omission-source.js';

export const individualRouteSql=`SELECT route.transaction_id FROM scholarship_records r JOIN semester_entitlements e ON e.scholar_id=r.scholar_id
 JOIN entitlement_payment_routes route ON route.entitlement_id=e.id WHERE r.id=? AND e.semester_id=? AND route.transaction_id IS NOT NULL`;
export async function assertNoIndividualRoute(db:PoolConnection,annual:string,semester:string){
 const [[omitted]]=await db.execute<RowDataPacket[]>(omissionRouteSql,[annual,semester]);
 if(omitted)throw new AuthError(409,'INDIVIDUAL_ROUTE_ACTIVE','An omitted-scholar OR + DV request is active for this stipend. Resolve its cancellation before another payroll route.');
 const [[route]]=await db.execute<RowDataPacket[]>(individualRouteSql,[annual,semester]);
 if(route)throw new AuthError(409,'INDIVIDUAL_ROUTE_ACTIVE','An unpaid individual DV is active for this semester stipend. Resolve its cancellation before using another payroll route.');
}
export async function appendIndividualEvent(db:PoolConnection,id:string,revision:number,action:IndividualAction,actor:string,snapshot:object){
 await db.execute('INSERT INTO individual_payment_events(transaction_id,revision,action,snapshot,snapshot_hash,actor_id,recorded_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))',[id,revision,action,JSON.stringify(snapshot),digest(JSON.stringify(snapshot)),actor]);
}
export async function individualAudit(db:PoolConnection,id:string,actor:string,action:string,requestId:string,reason:string,evidence:object){
 await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'individual.payment','individual_payment_transactions',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),id,action,actor,requestId,reason,JSON.stringify(evidence)]);
}
export async function releaseIndividualRoute(db:PoolConnection,entitlementId:string,id:string,revision:number){
 await db.execute('UPDATE entitlement_payment_routes SET transaction_id=NULL,event_transaction_id=?,event_revision=? WHERE entitlement_id=? AND transaction_id=?',[id,revision,entitlementId,id]);
}
/** Invoked only inside the existing correction transaction, before its audit.
 * A confirmed original payment may cancel an unpaid internal DV; it cannot
 * silently cancel a different/frozen payroll route or external payment. */
export async function originalPaymentCancelsDv(db:PoolConnection,paymentId:string,actor:string,coordinator:boolean,requestId:string,correctionId:string){
 const [[r]]=await db.execute<RowDataPacket[]>(`SELECT route.entitlement_id,s.scholar_id,t.id,t.source_payment_id,t.source_batch_id,e.revision,e.snapshot
 FROM payment_records p JOIN scholarship_records s ON s.id=p.scholarship_id JOIN payout_cycles c ON c.id=p.cycle_id
 JOIN semester_entitlements ent ON ent.scholar_id=s.scholar_id AND ent.semester_id=c.semester_id
 JOIN entitlement_payment_routes route ON route.entitlement_id=ent.id AND route.transaction_id IS NOT NULL
 JOIN individual_payment_transactions t ON t.id=route.transaction_id JOIN individual_payment_events e ON e.transaction_id=t.id
 WHERE p.id=? AND NOT EXISTS(SELECT 1 FROM individual_payment_events n WHERE n.transaction_id=e.transaction_id AND n.revision>e.revision) FOR UPDATE`,[paymentId]);
 if(!r)return;
 if(!coordinator||r.source_payment_id!==paymentId)throw new AuthError(409,'INDIVIDUAL_ROUTE_CONFLICT','An active DV conflicts with this payment evidence. A Coordinator must review the original payment and its route.');
 const snapshot=typeof r.snapshot==='string'?JSON.parse(r.snapshot):r.snapshot;
 const [[settled]]=await db.execute<RowDataPacket[]>('SELECT id FROM payment_records WHERE individual_transaction_id=?',[r.id]);
 const [[conflict]]=await db.execute<RowDataPacket[]>("SELECT d.id FROM payroll_reconciliation_events d JOIN scholarship_records a ON a.id=d.scholarship_id WHERE a.scholar_id=? AND d.batch_id=? AND d.kind='reported' AND JSON_VALUE(d.snapshot,'$.discoveredPaidOn') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM payroll_reconciliation_events n WHERE n.case_id=d.id AND n.case_version>1) LIMIT 1",[r.scholar_id,r.source_batch_id]);
 if(settled||conflict||snapshot.paymentRecorded)throw new AuthError(409,'INDIVIDUAL_EXTERNAL_CONFLICT','Conflicting payment evidence requires controlled financial review.');
 const [[forwarded]]=await db.execute<RowDataPacket[]>("SELECT revision FROM individual_payment_events WHERE transaction_id=? AND action='forwarded' LIMIT 1",[r.id]);
 const revision=Number(r.revision)+1,evidence={version:'individual-payment/v1',reason:'Coordinator confirmed the original payroll was actually Paid.',correctionId,paymentId,previousRevision:Number(r.revision),...(forwarded?{forwarded:true,externalCancellation:'LDSS cancelled the internal route only; forwarded financial-office documents remain in history'}:{externalStatus:'Not recorded by P04'})};
 await appendIndividualEvent(db,r.id,revision,'original_paid_cancelled',actor,evidence);
 await releaseIndividualRoute(db,r.entitlement_id,r.id,revision);
 await individualAudit(db,r.id,actor,'original_paid_cancelled',requestId,evidence.reason,evidence);
}
