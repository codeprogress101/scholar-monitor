import {validateConfirmedScope} from "../imports/confirmed-scope.js";
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {digest} from '../auth/crypto.js';
import {parseId,parseKey} from '../configuration/validation.js';
import {today} from '../scholars/validation.js';
import {currentPayout} from './service.js';
import {requirePreparationOpen} from './preparation.js';
import {cachedReads} from '../read-cache.js';
import {loadPriorBatch} from '../requirements/prior-approval-service.js';
import {officialMembership} from '../eligibility/official-membership.js';
import {decodePrior} from '../requirements/prior-approval-source.js';
import {decodeImportRows} from '../imports/storage.js';
import type {ImportPreviewRow,ImportResult} from '../imports/model.js';
import {candidateReads} from '../ovr/candidate-reads.js';
import {cohortReads} from '../eligibility/cohort-reads.js';
import type {HistoricalMember} from './historical-context.js';

const text=(min:number,max:number)=>z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
export const historicalAppendSchema=z.object({expectedCycleVersion:z.number().int().positive(),expectedSemesterVersion:z.number().int().positive(),expectedYearVersion:z.number().int().positive(),expectedHistoricalRevision:z.number().int().positive(),expectedSequence:z.number().int().positive(),expectedScopeHash:z.string().regex(/^[a-f0-9]{64}$/),importId:z.uuid(),opensOn:z.iso.date(),deadlineOn:z.iso.date(),reportedReleaseOn:z.iso.date(),reference:text(3,300),sourceLocation:text(3,500),reason:text(5,500),reviewed:z.literal(true)}).strict();
export function validateHistoricalDates(input:{opensOn:string;deadlineOn:string;reportedReleaseOn:string},starts:string,ends:string,previousCutoff:string,day:string){
 if(input.opensOn<starts||input.opensOn<=previousCutoff||input.opensOn>input.deadlineOn||input.deadlineOn>ends||input.deadlineOn>day||input.reportedReleaseOn<input.deadlineOn||input.reportedReleaseOn>ends||input.reportedReleaseOn>day)throw new AuthError(422,'INVALID_HISTORICAL_DATE','Supply evidenced, ordered historical opening/cutoff and reported release dates within this semester, after previous cutoffs and no later than today.');
}
export async function appendScope(connection:PoolConnection,cycle:Awaited<ReturnType<typeof currentPayout>>,importId:string){
 const [[imported]]=await connection.execute<RowDataPacket[]>('SELECT j.file_hash,j.preview,c.result FROM import_jobs j JOIN import_confirmations c ON c.job_id=j.id WHERE j.id=?',[importId]);
 if(!imported)throw new AuthError(404,'IMPORT_NOT_CONFIRMED','Choose a confirmed import with current prior batch approval.');
 const decoded=decodeImportRows<ImportPreviewRow>(imported.preview),result=decodePrior<ImportResult>(imported.result);
 await validateConfirmedScope(connection,importId,decoded,result);
 if(!result.selectedCount||!decoded.length||decoded.some(r=>!r.approvedSelection))throw new AuthError(409,'APPROVED_IMPORT_REQUIRED','Choose an already-approved confirmed import.');
 const people=[...new Set(result.items.map(p=>p.id))];if(!people.length||people.length>1500||people.length!==result.items.length)throw new AuthError(409,'BATCH_SCOPE_REVIEW_REQUIRED','Review the confirmed import scope.');
 const [annuals]=await connection.execute<RowDataPacket[]>(`SELECT id,scholar_id FROM scholarship_records WHERE academic_year_id=? AND scholar_id IN (${people.map(()=>'?').join(',')})`,[cycle.academicYearId,...people]);
 if(annuals.length!==people.length)throw new AuthError(409,'ANNUAL_MEMBERSHIP_REQUIRED','Every imported scholar needs the applicable annual record and approved membership.');
 const db=await cohortReads(await candidateReads(cachedReads(connection),annuals.map(r=>String(r.id)),cycle.semesterId),cycle.academicYearId,cycle.semesterId,cycle.id,annuals.map(r=>String(r.id)));
 const preview=await loadPriorBatch(db,{importId,semesterId:cycle.semesterId}),members:HistoricalMember[]=[];
 for(const m of preview.members){
  if(m.issues.length||!m.approval?.valid||m.approval.importId!==importId)throw new AuthError(409,'PRIOR_BATCH_APPROVAL_REQUIRED',`${m.humanId}: ${m.issues[0]??m.approval?.issue??'A current prior document, academic and deadline approval for this import is required.'}`);
  const annual=annuals.find(r=>r.scholar_id===m.scholarId)!;const {official}=await officialMembership(db,cycle,String(annual.id));
  if(!official.valid||!official.masterlistId||!official.snapshotHash||!official.version)throw new AuthError(409,'OFFICIAL_MEMBERSHIP_REQUIRED',`${m.humanId}: approved annual Masterlist membership is required.`);
  members.push({ownerId:m.id,scholarId:m.scholarId,scholarshipId:String(annual.id),approvalId:m.approval.id,approvalRevision:m.approval.revision,sourceHash:m.approval.sourceHash,masterlistId:official.masterlistId,publicationHash:official.snapshotHash,publicationVersion:official.version});
 }
 const importHash=digest(JSON.stringify({fileHash:imported.file_hash,rows:decoded,result}));
 return {members,importHash,scopeHash:digest(JSON.stringify({importId,semesterId:cycle.semesterId,importHash,members})),deadlines:preview.members.map(m=>m.approval!.deadlineOn),reviews:[...new Map(preview.members.map(m=>[m.approval!.id,{id:m.approval!.id,reference:m.approval!.reference,sourceLocation:m.approval!.sourceLocation}])).values()]};
}
export class HistoricalAppendService{
 constructor(private authorization:AuthorizationService,private enabled=false){}
 preview(actor:string,rawId:unknown,rawImport:unknown){const id=parseId(rawId),importId=parseId(rawImport);return this.authorization.readSnapshot(actor,'payroll.windows.manage',async(db,access)=>{if(!access.permissions.some(p=>p.code==='payouts.operate'))throw new AuthError(403,'PERMISSION_DENIED','Coordinator authority is required.');if(!this.enabled)throw new AuthError(423,'HISTORICAL_APPEND_DISABLED','Additional historical payroll setup is not enabled in this instance.');const c=await currentPayout(db,id);const s=await appendScope(cachedReads(db),c,importId);return {importId,semesterId:c.semesterId,...s};});}
 record(actor:string,rawId:unknown,rawKey:unknown,raw:unknown,requestId:string){
  const id=parseId(rawId),key=parseKey(rawKey),p=historicalAppendSchema.safeParse(raw);if(!p.success)throw new AuthError(422,'VALIDATION_FAILED','Provide current source/calendar revisions, the historical dates including supported reported release, authority reference and reviewed confirmation.');
  const input=p.data,operation='payroll.historical-append',payloadHash=digest(JSON.stringify({id,operation,input}));
  return this.authorization.withPermission(actor,'payroll.windows.manage',async(connection,access)=>{
   if(!access.permissions.some(p=>p.code==='payouts.operate'))throw new AuthError(403,'PERMISSION_DENIED','Coordinator payout authority is required.');
   if(!this.enabled)throw new AuthError(423,'HISTORICAL_APPEND_DISABLED','Additional historical payroll setup is not enabled in this instance.');
   const db=cachedReads(connection);const [[retry]]=await db.execute<RowDataPacket[]>('SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE',[actor,key]);if(retry){if(retry.payload_hash!==payloadHash)throw new AuthError(409,'IDEMPOTENCY_CONFLICT','This key belongs to a different historical append.');return decodePrior<Record<string,unknown>>(retry.result);}
   const cycle=await currentPayout(db,id);await requirePreparationOpen(db,id);
   if(cycle.version!==input.expectedCycleVersion)throw new AuthError(409,'VERSION_CONFLICT','The payout cycle changed. Refresh and review.');if(cycle.periodUnavailable||!['draft','open'].includes(cycle.state))throw new AuthError(423,'PERIOD_UNAVAILABLE','An available draft/open cycle is required.');
   const [[period]]=await db.execute<RowDataPacket[]>("SELECT s.version,s.academic_year_id,y.version year_version,DATE_FORMAT(s.starts_on,'%Y-%m-%d') starts,DATE_FORMAT(s.ends_on,'%Y-%m-%d') ends FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=?",[cycle.semesterId]);
   if(period.version!==input.expectedSemesterVersion||period.year_version!==input.expectedYearVersion)throw new AuthError(409,'VERSION_CONFLICT','Calendar revisions changed.');
   const [history]=await db.execute<RowDataPacket[]>('SELECT * FROM historical_payout_setups WHERE cycle_id=? ORDER BY revision FOR UPDATE',[id]);
   const [[mapping]]=await db.execute<RowDataPacket[]>('SELECT p.*, (SELECT COUNT(*) FROM payout_cycles c WHERE c.semester_id=p.semester_id) siblings FROM regular_payout_periods p WHERE cycle_id=?',[id]);
   const [[root]]=history.length?await db.execute<RowDataPacket[]>('SELECT batch_id FROM ovr_finalizations WHERE batch_id=?',[history[0].batch_id]):[[]];
   if(!mapping||!root||Number(mapping.siblings)!==1||mapping.semester_id!==cycle.semesterId||mapping.academic_year_id!==cycle.academicYearId||mapping.semester_version!==period.version||mapping.year_version!==period.year_version)throw new AuthError(409,'HISTORICAL_SETUP_REVIEW_REQUIRED','Use the existing finalized historical root and current canonical semester mapping.');
   if(Number(history.at(-1)!.revision)!==input.expectedHistoricalRevision)throw new AuthError(409,'VERSION_CONFLICT','The historical ledger changed. Refresh first.');
   if(history.some(r=>r.import_job_id===input.importId))throw new AuthError(409,'HISTORICAL_IMPORT_ALREADY_BOUND','This import already belongs to a historical payroll; open its existing source.');
   const [windows]=await db.execute<RowDataPacket[]>("SELECT w.batch_id,w.batch_number,DATE_FORMAT(v.cutoff_on,'%Y-%m-%d') cutoff FROM payroll_submission_windows w JOIN payroll_submission_window_versions v ON v.batch_id=w.batch_id WHERE w.cycle_id=? AND NOT EXISTS(SELECT 1 FROM payroll_submission_window_versions n WHERE n.batch_id=v.batch_id AND n.revision>v.revision) ORDER BY w.batch_number",[id]);
   if(!windows.length||Number(windows.at(-1)!.batch_number)!==input.expectedSequence)throw new AuthError(409,'VERSION_CONFLICT','The numbered payroll sequence changed.');
   validateHistoricalDates(input,String(period.starts),String(period.ends),windows.map(w=>String(w.cutoff)).sort().at(-1)!,today());
   const scope=await appendScope(db,cycle,input.importId);if(scope.scopeHash!==input.expectedScopeHash)throw new AuthError(409,'SOURCE_CHANGED','Import, prior approval or official membership changed. Review the scope again.');
   if(scope.deadlines.some(d=>d!==input.deadlineOn))throw new AuthError(409,'HISTORICAL_DEADLINE_MISMATCH','Every prior approval must support this exact historical cutoff.');
   const [reserved]=await db.execute<RowDataPacket[]>(`SELECT e.id FROM semester_entitlements e WHERE e.semester_id=? AND e.scholar_id IN (${scope.members.map(()=>'?').join(',')}) LIMIT 1`,[cycle.semesterId,...scope.members.map(m=>m.scholarId)]);if(reserved.length)throw new AuthError(409,'SEMESTER_ALREADY_ALLOCATED','An imported scholar already has a semester entitlement. Preserve its original route.');
   const [legacy]=await db.execute<RowDataPacket[]>(`SELECT e.scholarship_id FROM ovr_entries e JOIN scholarship_records s ON s.id=e.scholarship_id JOIN ovr_batches b ON b.id=e.batch_id JOIN payout_cycles c ON c.id=b.cycle_id WHERE c.semester_id=? AND s.scholar_id IN (${scope.members.map(()=>'?').join(',')}) AND (EXISTS(SELECT 1 FROM ovr_finalizations f WHERE f.batch_id=b.id) OR EXISTS(SELECT 1 FROM payment_records p WHERE p.batch_id=b.id AND p.scholarship_id=s.id)) LIMIT 1`,[cycle.semesterId,...scope.members.map(m=>m.scholarId)]);if(legacy.length)throw new AuthError(409,'EXISTING_PAYROLL_ALLOCATION','Existing payroll or payment history reserves an imported scholar.');
   const [[deadline]]=await db.execute<RowDataPacket[]>("SELECT revision,DATE_FORMAT(deadline_on,'%Y-%m-%d') day FROM semester_submission_versions WHERE cycle_id=? ORDER BY revision DESC LIMIT 1",[id]);if(!deadline)throw new AuthError(409,'PERIOD_MAPPING_REVIEW','The semester deadline is unavailable.');let deadlineRevision=Number(deadline.revision);
   if(input.deadlineOn>deadline.day){deadlineRevision++;await db.execute("INSERT INTO semester_submission_versions(cycle_id,revision,deadline_on,previous_deadline_on,action,reason,actor_id,recorded_at) VALUES(?,?,?,?,'extend',?,?,UTC_TIMESTAMP(6))",[id,deadlineRevision,input.deadlineOn,deadline.day,`${input.reason} [${input.reference}]`,actor]);}
   const batchId=randomUUID(),number=input.expectedSequence+1,code=`PAY-${String(number).padStart(3,'0')}`,revision=input.expectedHistoricalRevision+1;const [[operator]]=await db.execute<RowDataPacket[]>('SELECT full_name FROM users WHERE id=?',[actor]);
   const snapshot={id:batchId,cycleId:id,code,name:`Previously approved payroll batch ${number}`,revision:1,state:'draft',action:'create',actorId:actor,actorName:operator.full_name,recordedAt:new Date().toISOString(),reason:input.reason,reference:input.reference};
   await db.execute('INSERT INTO ovr_batches(id,cycle_id,code,name,created_by,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))',[batchId,id,code,snapshot.name,actor]);await db.execute("INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,1,'draft','create',?,?,UTC_TIMESTAMP(6))",[batchId,JSON.stringify(snapshot),actor]);await db.execute('INSERT INTO payroll_submission_windows(batch_id,cycle_id,batch_number,actor_id,recorded_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))',[batchId,id,number,actor]);
   await db.execute("INSERT INTO payroll_submission_window_versions(batch_id,cycle_id,revision,semester_deadline_revision,opens_on,cutoff_on,previous_cutoff_on,action,reason,actor_id,recorded_at) VALUES(?,?,1,?,?,?,NULL,'open',?,?,UTC_TIMESTAMP(6))",[batchId,id,deadlineRevision,input.opensOn,input.deadlineOn,input.reason,actor]);
   const source={...input,format:'historical-multibatch/v1',semesterId:cycle.semesterId,importHash:scope.importHash,scopeHash:scope.scopeHash,members:scope.members};await db.execute('INSERT INTO historical_payout_setups(cycle_id,revision,import_job_id,batch_id,deadline_on,reported_release_on,snapshot,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[id,revision,input.importId,batchId,input.deadlineOn,input.reportedReleaseOn,JSON.stringify(source),actor]);
   const result={id,revision,batchId,importId:input.importId,scholarCount:scope.members.length,state:'draft',paymentsRecorded:false};await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,?,'payout_cycle',?,'configure',?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),operation,id,actor,requestId,input.reason,JSON.stringify({input,result,scopeHash:scope.scopeHash,idempotency_key:key})]);await db.execute('INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))',[actor,key,operation,payloadHash,JSON.stringify(result)]);return result;
  });
 }
}
