import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {AuthError} from '../auth/service.js';
import {digest} from '../auth/crypto.js';
import {cachedReads} from '../read-cache.js';
import {batchMetadata} from '../ovr/detail-reads.js';
import {effectiveRoster} from '../ovr/amendment-state.js';
import {currentPayout} from '../payouts/service.js';
import {requireNumberedPayroll} from '../ovr/legacy-boundary.js';
import {recordingRowsSql} from './recording-reads.js';
import {latestReconciliationEvent,verifiedEvent,reconciliationOverview} from './reconciliation-reads.js';
import type {ClosureEvidence,ClosureMember} from './reconciliation-model.js';
import {individualPaymentRow} from './settlement-reads.js';
import {effectiveOutcomeSql,effectivePaymentJoinsSql} from './effective-payment-sql.js';
import {reportCents,reportRows,reportSections,uniqueSettlement,reportTitle,type FinancialReport,type ReportRow,type ReportBasis} from './report-model.js';
const cap=5000;
const invalid=(message:string):never=>{throw new AuthError(409,'REPORT_EVIDENCE_INVALID',message);};
async function laterFinancialChange(db:PoolConnection,id:string,closure:ClosureEvidence){const [[r]]=await db.execute<RowDataPacket[]>(`SELECT EXISTS(SELECT 1 FROM individual_payment_transactions t JOIN payment_records p ON p.individual_transaction_id=t.id WHERE t.source_batch_id=? OR EXISTS(SELECT 1 FROM payroll_allocations a WHERE a.batch_id=? AND a.entitlement_id=t.entitlement_id) OR EXISTS(SELECT 1 FROM payroll_reprocessing_attempts a JOIN payroll_reprocessing q ON q.id=a.reprocessing_id WHERE a.batch_id=? AND q.entitlement_id=t.entitlement_id)) OR EXISTS(SELECT 1 FROM payment_corrections WHERE batch_id=? AND batch_revision>? AND state IN ('applied','approved')) OR EXISTS(SELECT 1 FROM ovr_batch_events WHERE batch_id=? AND revision>? AND action='classify-unpaid') changed`,[id,id,id,id,closure.batchRevision,id,closure.batchRevision]);return Boolean(r.changed);}
async function closureRows(db:PoolConnection,closure:ClosureEvidence){
 if(closure.summary.total>cap)throw new AuthError(422,'REPORT_TOO_LARGE','This report exceeds the supported 5,000-row export boundary. No rows were omitted.');
 const result:ClosureMember[]=[];
 for(let offset=0;offset<closure.summary.total;offset+=200){const [rows]=await db.execute<RowDataPacket[]>('SELECT position,snapshot,snapshot_hash FROM payroll_closure_members WHERE closure_id=? ORDER BY position LIMIT 200 OFFSET ?',[closure.id,offset]);
  for(const r of rows){const position=result.length+1;if(Number(r.position)!==position||closure.memberHashes[position-1]!==r.snapshot_hash)invalid('Original closure membership cannot be verified. Preserve its evidence.');const member=verifiedEvent<ClosureMember>(r);if(member.position!==position)invalid('Original closure positions cannot be verified.');result.push(member);}}
 if(result.length!==closure.summary.total||new Set(result.map(r=>r.scholarshipId)).size!==result.length)invalid('Original detailed closure evidence is incomplete. It will not be reconstructed from current records.');return result;
}
function memberRow(r:ClosureMember,code:string):ReportRow{return {key:r.scholarshipId,entitlementId:r.scholarId,scholarshipId:r.scholarshipId,humanId:r.humanId,name:r.name,lastName:r.name.split(',')[0],firstName:r.name.split(',')[1]??'',school:r.school,course:r.course,yearLevel:r.yearLevel,academicYear:r.academicYear,semester:r.semester,batchCode:code,member:true,amountCentavos:reportCents(r.amount),originalOutcome:r.outcome,payrollOutcome:r.outcome,payrollPaidOn:r.actualPaidOn,payrollPaidCentavos:r.outcome==='paid'?reportCents(r.amount):0,laterStatus:'Not included in original closure',laterPaidOn:null,laterPaidCentavos:0,settlement:'Closure-time facts only',references:[],conflict:false};}
/** Read-only projection: no eligibility calculations, Registry cohort, or new
 * financial truth table. Compact frozen form/closure identities are joined to
 * the existing effective-payment readers. All reads share one RR snapshot. */
export async function financialReport(connection:PoolConnection,id:string,requested:string='auto'):Promise<FinancialReport>{
 const db=cachedReads(connection);await requireNumberedPayroll(db,id);
 const batch=await batchMetadata(db,id),cycle=await currentPayout(db,batch.cycleId),closure=await latestReconciliationEvent<ClosureEvidence>(db,id,'closed');
 const closed=closure?await closureRows(db,closure):null;
 const base={sourceRevision:{batch:batch.revision,closureId:closure?.id??null},batchId:id,batchCode:batch.code,batchName:batch.name,academicYear:cycle.yearCode,semester:cycle.semesterCode,generatedAt:new Date().toISOString(),closure:closure?{recordedAt:closure.recordedAt,actorName:closure.actorName,verification:closure.verification?`Verified by ${closure.verification.actorName} on ${closure.verification.recordedAt}`:`Coordinator override: ${closure.overrideReason??'Not recorded'}`} :null};
 const changed=closure?await laterFinancialChange(db,id,closure):false;
 if(requested==='auto'&&batch.state==='closed'&&closure)requested=changed?'updated':'original';
 if(requested==='original'){
  if(!closure||!closed)throw new AuthError(409,'ORIGINAL_RECONCILIATION_UNAVAILABLE','No supported original detailed closure snapshot exists. Historical totals remain available in reconciliation history; missing rows will not be invented.');
  const s=closure.summary,rows=reportRows(closed.map(r=>memberRow(r,s.code)),'all');
  if(rows.reduce((n,r)=>n+r.amountCentavos,0)!==reportCents(s.totalAmount)||rows.reduce((n,r)=>n+r.payrollPaidCentavos,0)!==reportCents(s.paidAmount)||rows.filter(r=>r.payrollOutcome==='unclaimed').reduce((n,r)=>n+r.amountCentavos,0)!==reportCents(s.unclaimedAmount))invalid('Original closure rows and financial totals disagree.');
  return {...base,sourceRevision:{batch:closure.batchRevision,closureId:closure.id},batchCode:s.code,batchName:s.name,academicYear:s.academicYear,semester:s.semester,basis:'original',title:reportTitle.original,sourceHash:digest(JSON.stringify({version:'financial-report/v1',closure})),rows,sections:reportSections(rows),settlementTotals:null,payrollTotals:{count:s.total,approvedCentavos:reportCents(s.totalAmount),paidCentavos:reportCents(s.paidAmount),unclaimedCentavos:reportCents(s.unclaimedAmount),pendingCentavos:reportCents(s.pendingAmount),reviewCentavos:reportCents(s.needsReviewAmount)},available:['original',...(changed?['updated' as const]:[]),'settlement'],notices:['Immutable closure-time facts. Later corrections and individual settlements are excluded.']};
 }
 const overview=await reconciliationOverview(db,id);
 const [[count]]=await db.execute<RowDataPacket[]>('SELECT entry_count FROM ovr_finalizations WHERE batch_id=?',[id]);
 if(!count||Number(count.entry_count)>cap)throw new AuthError(422,'REPORT_TOO_LARGE','A finalized payroll of at most 5,000 members is required. No financial evidence limit is bypassed.');
 // Existing compressed finalizations have no independently stored form rows.
 // Decode/verify once in this request, retain only the compact immutable form.
 const frozen=await effectiveRoster(db,id),form=frozen?.snapshot.payrollForm??frozen?.snapshot.legacyPayrollForm;
 if(!form||form.rows.length!==overview.summary.total)invalid('Complete frozen payroll identity and placement are unavailable. Use the existing historical review tools.');
 base.academicYear=closure?.summary.academicYear??frozen!.snapshot.cycle.yearCode;
 base.semester=closure?.summary.semester??frozen!.snapshot.cycle.semesterCode;
 // Project only financial fields. MariaDB can prune the existing reader's
 // current-name/school subqueries; those are not historical report sources.
 const [financialRows]=await db.execute<RowDataPacket[]>(`SELECT scholarship_id,scholar_id,amount_centavos,payment_id,outcome,paid_amount,paid_on,unpaid_reason FROM (${recordingRowsSql}) financial`,[id,id,id]);
 // The source token represents financial values, not an unordered SQL plan's
 // output sequence. Keep every field; only canonicalize the unique member order.
 const financial=[...financialRows].sort((a,b)=>String(a.scholarship_id)<String(b.scholarship_id)?-1:String(a.scholarship_id)>String(b.scholarship_id)?1:0);
 const values=new Map(financial.map(r=>[String(r.scholarship_id),r]));
 const [members]=await db.execute<RowDataPacket[]>(`SELECT a.scholarship_id,a.entitlement_id FROM payroll_allocations a WHERE a.batch_id=? UNION SELECT t.scholarship_id,q.entitlement_id FROM payroll_reprocessing_attempts t JOIN payroll_reprocessing q ON q.id=t.reprocessing_id WHERE t.batch_id=?`,[id,id]);
 const entitlement=new Map(members.map(r=>[String(r.scholarship_id),String(r.entitlement_id)])),originals=new Map(closed?.map(r=>[r.scholarshipId,r]));
 const rows:ReportRow[]=form!.rows.map(r=>{const f=values.get(r.scholarshipId),e=entitlement.get(r.scholarshipId);if(!f||!e||r.amountCentavos!==Number(f.amount_centavos))return invalid('Frozen roster, allocation and approved amounts disagree. Preserve the evidence.');return {key:r.scholarshipId,entitlementId:e,scholarshipId:r.scholarshipId,humanId:r.humanId,name:[r.lastName+',',r.firstName,r.middleName].filter(Boolean).join(' '),lastName:r.lastName,firstName:r.firstName,school:r.school,course:r.course,yearLevel:r.yearLevel,academicYear:base.academicYear,semester:base.semester,batchCode:batch.code,member:true,amountCentavos:r.amountCentavos,originalOutcome:originals.get(r.scholarshipId)?.outcome??'Not closed',payrollOutcome:f.outcome,payrollPaidOn:f.outcome==='paid'?f.paid_on:null,payrollPaidCentavos:f.outcome==='paid'?reportCents(f.paid_amount):0,laterStatus:'No payment recorded',laterPaidOn:null,laterPaidCentavos:0,settlement:'Unpaid',references:[],conflict:false};});
 if(new Set(rows.map(r=>r.scholarshipId)).size!==financial.length||rows.length!==financial.length)invalid('Frozen roster and financial membership differ.');
 const [transactions]=await db.execute<RowDataPacket[]>(`SELECT t.id,t.entitlement_id,t.source_kind,t.internal_reference,t.source_batch_id,ev.revision,ev.action,ev.snapshot event_snapshot,ev.snapshot_hash,
 COALESCE(p.scholarship_id,origin.scholarship_id,o.scholarship_id) scholarship_id,approved.snapshot approval_snapshot,approved.snapshot_hash approval_hash,
 e.amount_centavos,e.scholar_id,i.human_id,s.last_name,s.first_name,
 CONCAT_WS(' ',s.last_name,s.first_name,s.middle_name) name,
 p.id,p.individual_transaction_id,p.individual_revision,p.cycle_id,p.outcome,p.amount,p.reference_text,p.remarks,p.actor_id,p.actor_name,p.release_evidence,
 t.id transaction_id,t.source_kind individual_source_kind,DATE_FORMAT(p.effective_on,'%Y-%m-%d') paid_on,DATE_FORMAT(p.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') recorded,c.snapshot correction
 FROM individual_payment_transactions t JOIN semester_entitlements e ON e.id=t.entitlement_id
 JOIN scholars s ON s.id=e.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id
 JOIN individual_payment_events ev ON ev.transaction_id=t.id AND NOT EXISTS(SELECT 1 FROM individual_payment_events n WHERE n.transaction_id=ev.transaction_id AND n.revision>ev.revision)
 LEFT JOIN payment_records origin ON origin.id=t.source_payment_id LEFT JOIN payroll_omissions o ON o.id=t.omission_id LEFT JOIN payroll_omission_events approved ON approved.omission_id=o.id AND approved.revision=t.approval_revision
 LEFT JOIN payment_records p ON p.individual_transaction_id=t.id
 LEFT JOIN payment_corrections c ON c.payment_id=p.id AND c.state IN ('applied','approved') AND NOT EXISTS(SELECT 1 FROM payment_corrections n WHERE n.payment_id=c.payment_id AND n.state IN ('applied','approved') AND n.individual_revision>c.individual_revision)
 WHERE t.source_batch_id=? OR EXISTS(SELECT 1 FROM payroll_allocations a WHERE a.batch_id=? AND a.entitlement_id=t.entitlement_id) OR EXISTS(SELECT 1 FROM payroll_reprocessing_attempts a JOIN payroll_reprocessing q ON q.id=a.reprocessing_id WHERE a.batch_id=? AND q.entitlement_id=t.entitlement_id)
 ORDER BY t.recorded_at,t.id LIMIT 5001`,[id,id,id]);
 if(transactions.length>cap)throw new AuthError(422,'REPORT_TOO_LARGE','More than 5,000 linked individual attempts require a separately reviewed report scope. No rows were omitted.');
 // SQL aliases p.* may be null for an unpaid transaction. The transaction identity
 // has its own alias; the canonical reader receives payment identity unchanged.
 const byEntitlement=new Map<string,typeof transactions>();
 for(const t of transactions){verifiedEvent({snapshot:t.event_snapshot,snapshot_hash:t.snapshot_hash} as RowDataPacket);const list=byEntitlement.get(t.entitlement_id)??[];list.push(t);byEntitlement.set(t.entitlement_id,list);
  if(t.individual_source_kind==='omitted'&&t.source_batch_id===id&&!rows.some(r=>r.entitlementId===t.entitlement_id)){
   const approval=verifiedEvent<{evidence?:{current?:{sources?:{scholarship?:{name:string;humanId:string};semesterPayroll?:{formRow?:import('../ovr/payroll-form.js').PayrollRow}}}}}>({snapshot:t.approval_snapshot,snapshot_hash:t.approval_hash} as RowDataPacket),person=approval.evidence?.current?.sources?.scholarship,placement=approval.evidence?.current?.sources?.semesterPayroll?.formRow;
   rows.push({key:t.entitlement_id,entitlementId:t.entitlement_id,scholarshipId:t.scholarship_id,humanId:person?.humanId??t.human_id,name:person?.name??t.name,lastName:placement?.lastName??t.last_name,firstName:placement?.firstName??t.first_name,school:placement?.school??'Not recorded in approved omission evidence',course:placement?.course??'Not recorded in approved omission evidence',yearLevel:placement?.yearLevel??null,academicYear:base.academicYear,semester:base.semester,batchCode:batch.code,member:false,amountCentavos:Number(t.amount_centavos),originalOutcome:'Omitted — source reference only',payrollOutcome:'omitted',payrollPaidOn:null,payrollPaidCentavos:0,laterStatus:'No payment recorded',laterPaidOn:null,laterPaidCentavos:0,settlement:'Unpaid',references:[],conflict:false});
  }}
 const attempts=new Map<string,{paid:number;amount:number}>(),pins:unknown[]=[];
 const ids=[...new Set(rows.map(r=>r.entitlementId))].sort();
 for(let offset=0;offset<ids.length;offset+=200){const chunk=ids.slice(offset,offset+200),marks=chunk.map(()=>'?').join(',');
  const [payments]=await db.execute<RowDataPacket[]>(`SELECT e.id entitlement_id,p.id,p.batch_id,p.individual_transaction_id,${effectiveOutcomeSql} effective_outcome,IF(c.id IS NULL,p.amount,JSON_UNQUOTE(JSON_EXTRACT(c.snapshot,'$.after.amount'))) effective_amount,c.snapshot correction,cl.unpaid_reason,
 (SELECT COUNT(*) FROM payment_corrections pending WHERE pending.payment_id=p.id AND pending.state='pending' AND NOT EXISTS(SELECT 1 FROM payment_corrections n WHERE n.id=pending.id AND n.version>pending.version)) pending
 FROM semester_entitlements e JOIN scholarship_records annual ON annual.scholar_id=e.scholar_id JOIN payment_records p ON p.scholarship_id=annual.id JOIN payout_cycles cycle ON cycle.id=p.cycle_id AND cycle.semester_id=e.semester_id ${effectivePaymentJoinsSql} WHERE e.id IN (${marks}) ORDER BY e.id,p.id`,chunk);
  pins.push(...payments);for(const p of payments){if(p.effective_outcome!=='paid')continue;const a=attempts.get(p.entitlement_id)??{paid:0,amount:0};a.paid++;a.amount+=reportCents(p.effective_amount);attempts.set(p.entitlement_id,a);}
 }
 for(const r of rows){const linked=byEntitlement.get(r.entitlementId)??[],paid=linked.filter(t=>t.id).map(t=>({t,payment:individualPaymentRow(t)})).filter(p=>p.payment.outcome==='paid');
  r.references=linked.map(t=>t.internal_reference);r.laterPaidCentavos=paid.reduce((n,p)=>n+reportCents(p.payment.amount),0);r.laterPaidOn=paid.length===1?paid[0].payment.effectiveOn:null;
  r.laterStatus=paid.length===1?(paid[0].t.individual_source_kind==='unclaimed'?'Paid via DV':'Paid via OR + DV'):paid.length>1?'Conflicting Paid attempts':linked.length?linked.every(t=>['cancelled','original_paid_cancelled'].includes(t.action))?'Cancelled — no payment recorded':linked.some(t=>t.id)?'Not Paid after correction':'No payment recorded':'No payment recorded';
  const a=attempts.get(r.entitlementId);r.conflict=Boolean(a&&(a.paid>1||a.amount!==r.amountCentavos));r.settlement=r.conflict?'Conflicting evidence — review required':a?.paid?'Paid':'Unpaid';
 }
 const laterChanged=transactions.some(t=>t.id),available:ReportBasis[]=batch.state==='closed'?[...(closure?['original' as const]:[]),...(closure&&(overview.updatedAvailable||laterChanged)?['updated' as const]:[]),'settlement']:['provisional','settlement'];
 const basis=(requested==='auto'?(available.includes('updated')?'updated':available.includes('original')?'original':batch.state==='closed'?'settlement':'provisional'):requested) as ReportBasis;
 if(basis==='original')return financialReport(connection,id,'original');
 if(!available.includes(basis))throw new AuthError(409,'REPORT_BASIS_UNAVAILABLE',batch.state==='closed'?'Choose an available closure or individual settlement report. Updated Reconciliation requires a recorded post-closure financial change.':'Original and Updated Reconciliation require a supported payroll closure.');
 const selected=basis==='settlement'?rows.filter(r=>byEntitlement.has(r.entitlementId)):rows.filter(r=>r.member),summary=overview.summary;
 const sourceHash=digest(JSON.stringify({version:'financial-report/v1',basis,batch:id,revision:batch.revision,closure:closure??null,frozen:frozen!.hash,financial,pins,transactions,rows:selected,unresolvedDiscrepancies:overview.unresolvedDiscrepancies,pendingCorrections:overview.pendingCorrections,pendingHistoricalReceipts:overview.pendingHistoricalReceipts}));
 const notices=[closure?'Original closure totals remain unchanged. Later settlement is separate from payroll outcome.':batch.state==='closed'?'Historical payroll is closed. Later settlement is separate from payroll outcome.':'Payroll has not been formally closed. Current payroll outcomes are provisional; individual settlements remain separate.', 'Paid Only and Unclaimed Only filter the effective payroll outcome; later DV payment does not change that outcome.'];
 if(basis==='settlement')notices[1]='Paid Only selects current Paid entitlement settlements. Unclaimed Only retains original Unclaimed payroll rows, including later DV settlement. Omitted rows are never original payroll members.';
 if(!closure&&batch.state==='closed')notices.push('Original detailed closure evidence is unavailable. This report does not reconstruct it.');
 if(overview.unresolvedDiscrepancies||overview.pendingCorrections||overview.pendingHistoricalReceipts)notices.push(`Requires financial review: ${overview.unresolvedDiscrepancies} unresolved discrepancies; ${overview.pendingCorrections} pending payroll corrections; ${overview.pendingHistoricalReceipts} pending historical receipts. This report does not resolve them.`);
 if(rows.some(r=>!r.member))notices.push('Omitted scholars appear only in Individual Payment Settlement Information. The source payroll is an omission reference, not membership. Historical placement absent from the frozen payroll is shown as not recorded.');
 const settlementTotals=uniqueSettlement(selected,attempts);if(settlementTotals.conflicts)notices.push('Conflicting Paid evidence exists. Distinct-entitlement totals do not certify reconciliation or cancel conflicting attempts.');
 return {...base,basis,title:reportTitle[basis],sourceHash,available,notices,rows:reportRows(selected,'all'),sections:reportSections(selected),settlementTotals,payrollTotals:{count:summary.total,approvedCentavos:reportCents(summary.totalAmount),paidCentavos:reportCents(summary.paidAmount),unclaimedCentavos:reportCents(summary.unclaimedAmount),pendingCentavos:reportCents(summary.pendingAmount),reviewCentavos:reportCents(summary.needsReviewAmount)}};
}
