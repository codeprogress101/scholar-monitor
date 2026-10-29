import type { PoolConnection,RowDataPacket } from "mysql2/promise";
import { digest } from "../auth/crypto.js";
import { AuthError } from "../auth/service.js";
import { cachedReads } from "../read-cache.js";
import { batchMetadata } from "../ovr/detail-reads.js";
import { recordingSummary,recordingPage } from "./recording-reads.js";
import { treasuryEvidence,historicalReceipts } from "../ovr/treasury-state.js";
import { decodeStoredJson } from "../stored-json.js";
import { parseRequirementList } from "../requirements/validation.js";
import { recordingComplete,type ReconciliationEvent,type ReconciliationOverview,type ClosureEvidence,type ClosureMember } from "./reconciliation-model.js";

export function verifiedEvent<T>(r:RowDataPacket):T {
 const value=decodeStoredJson<T>(r.snapshot);
 if(digest(JSON.stringify(value))!==r.snapshot_hash)throw new AuthError(409,"RECONCILIATION_INTEGRITY_FAILED","Reconciliation evidence could not be verified. Preserve the record for technical review.");
 return value;
}
export async function reconciliationRevision(db:PoolConnection,id:string){const [[r]]=await db.execute<RowDataPacket[]>("SELECT COALESCE(MAX(revision),0) AS n FROM payroll_reconciliation_events WHERE batch_id=?",[id]);return Number(r.n);}
export async function latestReconciliationEvent<T extends ReconciliationEvent>(db:PoolConnection,id:string,kind:"verified"|"closed"):Promise<T|null>{
 const [[r]]=await db.execute<RowDataPacket[]>("SELECT snapshot,snapshot_hash FROM payroll_reconciliation_events WHERE batch_id=? AND kind=? ORDER BY revision DESC LIMIT 1",[id,kind]);
 if(!r)return null;
 const value=verifiedEvent<T>(r);
 if(kind==="closed"){const closure=value as unknown as ClosureEvidence;if(closure.version!=="payroll-closure/v1"||!Array.isArray(closure.memberHashes)||!Number.isSafeInteger(closure.summary?.total)||closure.summary.total<1||closure.memberHashes.length!==closure.summary.total)throw new AuthError(409,"RECONCILIATION_INTEGRITY_FAILED","The original closure format or membership could not be verified. Preserve its evidence for technical review.");}
 return value;
}
export const openCasesSql="FROM payroll_reconciliation_events e WHERE e.batch_id=? AND e.kind='reported' AND NOT EXISTS(SELECT 1 FROM payroll_reconciliation_events n WHERE n.case_id=e.id AND n.case_version>1)";

/** A cheap snapshot token, not payment authority. Every canonical outcome,
 * correction/classification writer advances the batch revision. Treasury and
 * historical receipt writers are independently pinned here. P03 evidence does
 * NOT advance that revision, so verification cannot stale itself. Consequential
 * verification/closure also rebuild the complete P01 financial basis. */
export async function reconciliationOverview(connection:PoolConnection,id:string,permissions:readonly string[]=[]):Promise<ReconciliationOverview>{
 const db=cachedReads(connection),summary=await recordingSummary(db,id),batch=await batchMetadata(db,id);
 const [[frozen]]=await db.execute<RowDataPacket[]>("SELECT snapshot_hash,entry_count FROM ovr_finalizations WHERE batch_id=?",[id]);
 const treasury=await treasuryEvidence(db,id),historical=await historicalReceipts(db,id);
 const sourceHash=digest(JSON.stringify({version:"reconciliation-source/v1",batch:id,revision:batch.revision,state:batch.state,frozen:frozen?.snapshot_hash??null,count:Number(frozen?.entry_count??0),treasury,historical}));
 const [[flags]]=await db.execute<RowDataPacket[]>(`SELECT (SELECT COUNT(*) ${openCasesSql}) AS cases,
 (SELECT COUNT(*) FROM payment_corrections c WHERE c.batch_id=? AND c.state='pending' AND NOT EXISTS(SELECT 1 FROM payment_corrections n WHERE n.id=c.id AND n.version>c.version)) AS corrections`,[id,id]);
 const verificationEvent=await latestReconciliationEvent<ReconciliationEvent>(db,id,"verified"),closed=await latestReconciliationEvent<ClosureEvidence>(db,id,"closed");
 const complete=recordingComplete(summary),unresolvedDiscrepancies=Number(flags.cases),pendingCorrections=Number(flags.corrections),pendingHistoricalReceipts=historical.filter(h=>h.state==="pending").length;
 const current=verificationEvent?.sourceHash===sourceHash,otherClear=complete&&!unresolvedDiscrepancies&&!pendingCorrections&&!pendingHistoricalReceipts;
 const [[changed]]=closed?await db.execute<RowDataPacket[]>(`SELECT EXISTS(SELECT 1 FROM payment_corrections WHERE batch_id=? AND batch_revision>? AND state IN ('applied','approved')) OR EXISTS(SELECT 1 FROM ovr_batch_events WHERE batch_id=? AND revision>? AND action='classify-unpaid') AS changed`,[id,closed.batchRevision,id,closed.batchRevision]):[[{changed:0}]];
 const blockers:string[]=[];
 if(!complete)blockers.push("Every finalized scholar needs a valid Paid or Unclaimed outcome and reconciled amounts. Resolve Pending, Withheld and Review entries.");
 if(unresolvedDiscrepancies)blockers.push("Resolve all reported payment discrepancies before closing payroll.");
 if(pendingCorrections)blockers.push("Resolve pending payment corrections before closing payroll.");
 if(pendingHistoricalReceipts)blockers.push("Resolve pending historical receipt evidence before closing payroll.");
 if(!current&&summary.state!=="closed")blockers.push("Verify the returned payroll, or use the Coordinator verification-only override with a reason.");
 return {summary,sourceHash,reconciliationRevision:await reconciliationRevision(db,id),recordingComplete:complete,unresolvedDiscrepancies,pendingCorrections,pendingHistoricalReceipts,
 verification:summary.state==="closed"?(closed?.verification?"Verified at closure":"Closed"):current?"Verified":verificationEvent?"Re-verification Required":"Not verified",verificationEvent,
 originalAvailable:Boolean(closed),updatedAvailable:Boolean(changed.changed),canVerify:permissions.includes("ovr.process")&&summary.state==="processed",
 canClose:permissions.includes("ovr.close")&&summary.state==="processed"&&summary.canRecord&&otherClear&&current,
 canOverrideVerification:permissions.includes("ovr.close")&&summary.state==="processed"&&summary.canRecord&&otherClear,blockers};
}
export async function discrepancyPage(db:PoolConnection,id:string,raw:unknown){
 const q=parseRequirementList(raw),[[count]]=await db.execute<RowDataPacket[]>(`SELECT COUNT(*) AS n ${openCasesSql}`,[id]);
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT e.snapshot,e.snapshot_hash ${openCasesSql} ORDER BY e.revision DESC LIMIT ${q.limit} OFFSET ${q.offset}`,[id]);
 return {items:rows.map(r=>verifiedEvent<ReconciliationEvent>(r)),total:Number(count.n),offset:q.offset,limit:q.limit};
}
export async function reconciliationHistory(db:PoolConnection,id:string,raw:unknown){
 const q=parseRequirementList(raw),[[count]]=await db.execute<RowDataPacket[]>("SELECT COUNT(*) n FROM payroll_reconciliation_events WHERE batch_id=?",[id]);
 const [rows]=await db.execute<RowDataPacket[]>(`SELECT snapshot,snapshot_hash FROM payroll_reconciliation_events WHERE batch_id=? ORDER BY revision DESC LIMIT ${q.limit} OFFSET ${q.offset}`,[id]);
 return {items:rows.map(r=>{const e=verifiedEvent<ReconciliationEvent>(r);return {id:e.id,kind:e.kind,actorName:e.actorName,recordedAt:e.recordedAt,caseId:e.caseId??null,humanId:e.humanId??null,name:e.name??null,description:e.description??null,reason:e.reason??null};}),total:Number(count.n),offset:q.offset,limit:q.limit};
}
export async function openCase(db:PoolConnection,id:string,caseId:string){
 const [[row]]=await db.execute<RowDataPacket[]>(`SELECT e.snapshot,e.snapshot_hash ${openCasesSql} AND e.id=? LOCK IN SHARE MODE`,[id,caseId]);
 if(!row)throw new AuthError(409,"DISCREPANCY_RESOLVED","This discrepancy is no longer unresolved. Refresh the payroll.");return verifiedEvent<ReconciliationEvent>(row);
}
export async function reconciliationPage(connection:PoolConnection,id:string,raw:unknown,permissions:readonly string[]){
 const db=cachedReads(connection),input=raw as Record<string,unknown>;
 let basis=input?.basis??"auto";
 if(!["auto","provisional","original","updated","current"].includes(String(basis)))throw new AuthError(422,"VALIDATION_FAILED","Choose Provisional, Original or Updated Reconciliation.");
 const {basis:_basis,...rest}=input??{};void _basis;
 const q=parseRequirementList(rest),overview=await reconciliationOverview(db,id,permissions);
 if(basis==="auto")basis=overview.summary.state==="closed"?(overview.originalAvailable?"original":"current"):"provisional";
 if(basis==="original"){
  const closure=await latestReconciliationEvent<ClosureEvidence>(db,id,"closed");
  if(!closure)throw new AuthError(409,"ORIGINAL_RECONCILIATION_UNAVAILABLE","No complete original closure snapshot was recorded for this payroll. Historical totals remain in the existing history; closure-time rows will not be invented.");
  if(q.q)throw new AuthError(422,"VALIDATION_FAILED","Original Reconciliation preserves closure order. Clear the search to page through its immutable rows.");
  const [rows]=await db.execute<RowDataPacket[]>(`SELECT position,snapshot,snapshot_hash FROM payroll_closure_members WHERE closure_id=? ORDER BY position LIMIT ${q.limit} OFFSET ${q.offset}`,[closure.id]);
  if(rows.length!==Math.min(q.limit,Math.max(0,closure.summary.total-q.offset))||rows.some((r,i)=>Number(r.position)!==q.offset+i+1))throw new AuthError(409,"RECONCILIATION_INTEGRITY_FAILED","The original closure report is incomplete. Preserve its evidence for technical review.");
  const items=rows.map(r=>{if(closure.memberHashes[Number(r.position)-1]!==r.snapshot_hash)throw new AuthError(409,"RECONCILIATION_INTEGRITY_FAILED","The original closure membership could not be verified.");return verifiedEvent<ClosureMember>(r);});
  // Original identity and placement are immutable; filtering is intentionally
  // absent from this paged historical basis, never silently applied to current names.
  return {basis,overview,summary:closure.summary,items,total:closure.summary.total,offset:q.offset,limit:q.limit,generatedAt:closure.recordedAt,closedBy:closure.actorName};
 }
 if(basis==="provisional"&&overview.summary.state==="closed")throw new AuthError(409,"RECONCILIATION_BASIS_CHANGED","Payroll is closed. Choose Original or Updated Reconciliation.");
 if(basis==="updated"&&(!overview.originalAvailable||!overview.updatedAvailable))throw new AuthError(409,"UPDATED_RECONCILIATION_UNAVAILABLE","An updated reconciliation is available after an authorized post-closure financial change.");
 const page=await recordingPage(db,id,q);
 return {basis,overview,summary:overview.summary,...page,generatedAt:new Date().toISOString()};
}
