import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
import {AuthorizationService} from '../server/authorization/service.js';
import {IndividualPaymentService} from '../server/payments/individual-service.js';
import {PaymentRecordingService} from '../server/payments/recording-service.js';
import {PayrollReconciliationService} from '../server/payments/reconciliation-service.js';
import {IndividualSettlementService} from '../server/payments/settlement-service.js';
import {OmissionPaymentService} from '../server/payments/omission-service.js';
import {semesterClaim} from '../server/ovr/reprocessing.js';
import {today} from '../server/scholars/validation.js';
import {individualClaimsSql,individualPendingClaimsSql} from '../server/payments/settlement-reads.js';
import {managedRelease} from '../server/ovr/managed-release.js';
import {registryEligibility} from '../server/scholars/registry-eligibility.js';
import type {SettlementPreview,SettlementInput} from '../server/payments/settlement-model.js';
import type {settlementDetail} from '../server/payments/settlement-source.js';
type Detail=Awaited<ReturnType<typeof settlementDetail>>;
type Context={runtime:Pool;admin:Pick<Pool,'execute'|'query'>;request:(role:string,path:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;transactionId:string;sourceKind:'unclaimed'|'omitted';total:number};
const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export async function testIndividualSettlement(c:Context){
 if(process.argv.includes('--settlement-races')){await (await import('./test-individual-settlement-races.js')).testSettlementRaces(c);return;}
 const folder=process.env.LDSS_P07_OUTPUT??'output/p07-settlement-20261022',base='/api/v1/individual-payments/settlement';await mkdir(folder,{recursive:true});
 const [[name]]=await c.admin.query<RowDataPacket[]>('SELECT DATABASE() name');assert.match(name.name,/^ldss_(?:f19|import)_test_\d+_[a-f\d]{8}$/);
 const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body.slice(0,2500));return r;};
 const detail=async(id=c.transactionId)=>(await ok(c.request('staff',`${base}/transactions/${id}`))).json<Detail>();
 const action=async(role:string,id:string,data:object,key:string=randomUUID())=>{const d=await detail(id);return c.request(role,base+'/commands',{transactionId:id,expectedRevision:d.revision,...data},key);};
 const single=(id:string,representative=false):SettlementInput=>({mode:'single',transactionIds:[id],actualPaidOn:today(),...(representative?{authorizationDocumentsVerified:true}:{})});
 const preview=async(input:SettlementInput)=>(await ok(c.request('staff',base+'/preview',input))).json<SettlementPreview>();
 const body=async(input:SettlementInput)=>({input,basis:(await preview(input)).basis,acknowledgedRelease:true});
 const protectedTables=['ovr_finalizations','payroll_closure_members','payroll_allocations','semester_entitlements'];
 const protectedHash=async()=>{const r:Record<string,string>={};for(const t of protectedTables){const [rows]=await c.admin.query<RowDataPacket[]>(`SELECT * FROM ${t}`);r[t]=sha(rows.map(r=>JSON.stringify(r)).sort());}return r;};
 const original=await protectedHash(),[payrollRows]=await c.admin.query<RowDataPacket[]>("SELECT * FROM payment_records WHERE source_kind='payroll' ORDER BY id"),[[staff]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM users WHERE email='staff@example.invalid'");
 const start=await detail(),[[header]]=await c.admin.query<RowDataPacket[]>('SELECT * FROM individual_payment_transactions WHERE id=?',[c.transactionId]);
 const beforeState=async()=>{const r:Record<string,string>={};for(const t of ['payment_records','payment_corrections','individual_payment_events','entitlement_payment_routes','ovr_commands','audit_logs']){const [rows]=await c.admin.query<RowDataPacket[]>(`SELECT * FROM ${t}`);r[t]=sha(rows.map(r=>JSON.stringify(r)).sort());}return r;};
 const oldGet=c.runtime.getConnection.bind(c.runtime);let selects=0,sqlMs=0;
 c.runtime.getConnection=async()=>{const connection=await oldGet();return new Proxy(connection,{get(t,k){if(k!=='execute'&&k!=='query'){const v=Reflect.get(t,k);return typeof v==='function'?v.bind(t):v;}return async(...args:unknown[])=>{const read=typeof args[0]==='string'&&/^\s*SELECT\b/i.test(args[0]),begin=performance.now();if(read)selects++;try{return await (t[k] as (...a:unknown[])=>Promise<unknown>).apply(t,args);}finally{if(read)sqlMs+=performance.now()-begin;}};}}) as PoolConnection;};
 const runs:object[]=[],memory:object[]=[];
 const responseBytes=(v:unknown):number=>Array.isArray(v)?v.reduce((n,item)=>n+responseBytes(item),0):v&&typeof v==='object'&&'rawPayload'in v?(v.rawPayload as Buffer).length:Buffer.byteLength(JSON.stringify(v));
 async function measure<T>(operation:string,fn:()=>Promise<T>){global.gc?.();selects=0;sqlMs=0;const before=process.memoryUsage(),begin=performance.now();let peakRss=before.rss;const timer=setInterval(()=>{peakRss=Math.max(peakRss,process.memoryUsage().rss);},10);try{const v=await fn(),after=process.memoryUsage();runs.push({operation,ms:performance.now()-begin,selects,sqlMs,bytes:responseBytes(v),before,after,peakRss:Math.max(peakRss,after.rss)});return v;}finally{clearInterval(timer);}}
 const auth=new AuthorizationService(c.runtime),p04=new IndividualPaymentService(auth,true),service=new IndividualSettlementService(auth,{individual:p04,omitted:new OmissionPaymentService(auth,true)},true);
 try{
  assert.equal((await ok(c.request('staff',base+'/availability'))).json().enabled,true);
  assert.throws(()=>new IndividualSettlementService(auth,{individual:p04,omitted:new OmissionPaymentService(auth,true)}).page(staff.id,{}));
  for(const path of ['/queue',`/transactions/${c.transactionId}`])assert.equal((await c.request('system_admin',base+path)).statusCode,403);
  assert.equal((await c.request('system_admin',base+'/preview',single(c.transactionId))).statusCode,403);
  for(let i=0;i<3;i++){
   await ok(measure('queue',()=>c.request('staff',base+'/queue?limit=25')));
   await ok(measure('detail',()=>c.request('staff',`${base}/transactions/${c.transactionId}`)));
   await ok(measure('settlement_summary',()=>c.request('staff',base+'/summary')));
   if(c.sourceKind==='unclaimed')await measure('existing_p04_queue',()=>p04.page(staff.id,{q:'',limit:25,offset:0}));
   await measure('existing_p02_summary',()=>new PaymentRecordingService(auth).summary(staff.id,header.source_batch_id));
   await measure('existing_p03_summary',()=>new PayrollReconciliationService(auth).summary(staff.id,header.source_batch_id));
  }
  assert.equal((await detail()).settlement,null);
  const docBase=`/api/v1/individual-payments/transactions/${c.transactionId}/documents`,doc=(await ok(c.request('staff',docBase))).json();
  await ok(c.request('staff',docBase+'/generate',{transactionId:c.transactionId,sourceKind:c.sourceKind,sourceHash:doc.sourceHash,expectedRevision:doc.revision,templateVersion:doc.templates[0].version,fields:doc.fields}));
  if(process.argv.includes('--settlement-upgrade'))await (await import('./test-individual-settlement-upgrade.js')).testSettlementPopulatedUpgrade(c.admin,c.sourceKind,c.total);
  assert.equal((await detail()).settlement,null,'Word generation is not payment');await ok(c.request('staff',docBase+'/DV/word'));
  const forwardDetail=await detail(),forwardBody={action:'forward',transactionId:c.transactionId,expectedRevision:forwardDetail.revision,sourceHash:forwardDetail.sourceHash},forwardKey=randomUUID();
  await ok(measure('forward',()=>c.request('staff',base+'/commands',forwardBody,forwardKey)));await ok(c.request('staff',base+'/commands',forwardBody,forwardKey));
  assert.equal((await detail()).settlement,null,'Forwarding is not payment');assert.equal((await detail()).forwarded,true);await ok(c.request('staff',docBase+'/DV/word'));
  if(process.argv.includes('--financial-reports')){const report=(await ok(c.request('staff',`/api/v1/ovr-batches/${header.source_batch_id}/financial-report?basis=settlement`))).json();assert.equal(report.settlementTotals.paidEntitlements,0);assert.ok(report.items.every((r:{laterPaidCentavos:number;laterPaidOn:string|null;settlement:string})=>r.laterPaidCentavos===0&&r.laterPaidOn===null&&r.settlement==='Unpaid'),'Preparing, generating, downloading and forwarding never appear as Paid in P08');}
  assert.equal((await action('staff',c.transactionId,{action:'forward',sourceHash:(await detail()).sourceHash})).statusCode,409);
  await ok(action('staff',c.transactionId,{action:'report',description:'Synthetic pre-payment issue must block a cheque release'}));
  const blockedDetail=await detail();assert.equal((await preview(single(c.transactionId))).conflicts.length,1);
  await ok(action('coordinator',c.transactionId,{action:'dismiss',caseId:blockedDetail.issues[0].id,reason:'Reviewed synthetic issue; no competing release exists'}));
  const input=single(c.transactionId,c.sourceKind==='omitted'),paidBody=await body(input);
  assert.equal((await c.request('staff',base+'/paid',{...paidBody,acknowledgedRelease:false})).statusCode,422);
  assert.equal((await c.request('staff',base+'/preview',{...input,amount:'1.00'})).statusCode,422);
  assert.equal((await c.request('staff',base+'/preview',{mode:'bulk',transactionIds:[c.transactionId],actualPaidOn:today(),authorizationDocumentsVerified:true})).statusCode,422);
  assert.equal((await c.request('staff',base+'/preview',{...input,representativeName:'Do not store personal data'})).statusCode,422);
  const invalidDay={...input,actualPaidOn:'1900-01-01'};assert.equal((await preview(invalidDay)).conflicts.length,1);
  const before=await beforeState();await c.admin.query("CREATE TRIGGER p07_audit_fail BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='individual.payment' AND NEW.action='cheque_paid' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic P07 atomic rollback'; END IF; END");
  try{assert.equal((await c.request('staff',base+'/paid',paidBody)).statusCode,500);}finally{await c.admin.query('DROP TRIGGER p07_audit_fail');}assert.deepEqual(await beforeState(),before);
  const keys=[randomUUID(),randomUUID()],races=await measure('single_concurrent_payment',()=>Promise.all(keys.map(key=>c.request('staff',base+'/paid',paidBody,key))));assert.equal(races.filter(r=>r.statusCode===200).length,1,races.map(r=>r.body).join('\n'));
  const winner=races.findIndex(r=>r.statusCode===200),paid=races[winner].json(),afterPaid=await beforeState();assert.deepEqual((await ok(c.request('staff',base+'/paid',paidBody,keys[winner]))).json(),paid);assert.deepEqual(await beforeState(),afterPaid);
  const [[role]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM user_roles WHERE user_id=? AND role_code='staff' AND revoked_at IS NULL LIMIT 1",[staff.id]);
  try{await c.admin.execute('UPDATE user_roles SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?',[role.id]);assert.equal((await c.request('staff',base+'/paid',paidBody,keys[winner])).statusCode,403);}finally{await c.admin.execute('UPDATE user_roles SET revoked_at=NULL WHERE id=?',[role.id]);}
  assert.equal((await c.request('staff',base+'/paid',{...paidBody,input:{...input,actualPaidOn:'1900-01-01'}},keys[winner])).statusCode,409);
  let current=await detail();assert.equal(current.status,'Paid');assert.equal(current.settlement?.amount,'5000.00');assert.equal(current.settlement?.effectiveOn,today());assert.ok(current.settlement?.recordedAt);assert.equal(current.settlement?.batchId,null);assert.equal(current.originalPayrollOutcome,c.sourceKind==='unclaimed'?'Unclaimed':'Omitted');assert.equal((await c.request('staff',docBase+'/DV/word')).statusCode,409);
  const [[entitlement]]=await c.admin.query<RowDataPacket[]>('SELECT semester_id,scholar_id FROM semester_entitlements WHERE id=?',[header.entitlement_id]);
  const plans=[];for(const sql of [individualClaimsSql,individualPendingClaimsSql]){const [plan]=await c.admin.query<RowDataPacket[]>('EXPLAIN '+sql,[start.scholarshipId,entitlement.semester_id]);plans.push({queryHash:sha(sql),plan});}await writeFile(`${folder}/query-plans-${c.sourceKind}-${c.total}.json`,JSON.stringify({at:new Date().toISOString(),plans},null,2));
  const claim=await auth.readSnapshot(staff.id,'ovr.process',db=>semesterClaim(db,start.scholarshipId,entitlement.semester_id));assert.equal(claim.paid?.id,current.settlement?.id);assert.equal(claim.attempts.filter(p=>p.outcome==='paid').length,1);
  const registry=await measure('registry_after_settlement',()=>auth.readSnapshot(staff.id,'ovr.process',db=>registryEligibility(db,{ids:entitlement.scholar_id,periodId:current.settlement!.cycleId})));assert.equal(registry.items[0].payment,'Paid');assert.ok(registry.items[0].links?.some(l=>l.href.includes('transaction='+c.transactionId)));
  if(c.sourceKind==='unclaimed'){const release=await auth.readSnapshot(staff.id,'ovr.process',db=>managedRelease(db,header.source_batch_id,[start.scholarshipId]));assert.equal(release?.find(r=>r.entitlementId===header.entitlement_id)?.state,'released');assert.equal(release?.find(r=>r.entitlementId===header.entitlement_id)?.individualSettlement?.paymentId,current.settlement?.id);}
  const [[period]]=await c.admin.query<RowDataPacket[]>("SELECT DATE_FORMAT(s.starts_on,'%Y-%m-%d') starts,DATE_FORMAT(s.ends_on,'%Y-%m-%d') ends,s.id FROM semesters s JOIN semester_entitlements e ON e.semester_id=s.id WHERE e.id=?",[header.entitlement_id]);
  const previousDay=new Date(Date.parse(today()+'T00:00:00Z')-86400000).toISOString().slice(0,10);
  if(previousDay>=period.starts){await ok(measure('staff_date_correction',()=>action('staff',c.transactionId,{action:'correct-date',actualPaidOn:previousDay,reason:'Correct synthetic acknowledged release date'})));const corrected=await detail();assert.equal(corrected.settlement?.effectiveOn,previousDay);assert.equal(corrected.settlement?.recordedAt,current.settlement?.recordedAt);}
  if(c.sourceKind==='unclaimed'){
   const d=(await ok(c.request('staff',`/api/v1/individual-payments/payments/${header.source_payment_id}`))).json();assert.equal((await c.request('staff','/api/v1/individual-payments/commands',{action:'request-cancellation',paymentId:header.source_payment_id,transactionId:c.transactionId,expectedRevision:d.revision,reason:'Do not cancel an actual paid cheque'})).statusCode,409);
   const overview=(await ok(c.request('staff',`/api/v1/ovr-batches/${header.source_batch_id}/reconciliation-summary`))).json();assert.equal((await c.request('coordinator',`/api/v1/ovr-batches/${header.source_batch_id}/reconciliation-commands`,{action:'correct',expectedRevision:overview.summary.revision,expectedReconciliationRevision:overview.reconciliationRevision,sourceHash:overview.sourceHash,paymentId:header.source_payment_id,outcome:'paid',actualPaidOn:today(),reason:'Synthetic duplicate payroll versus individual settlement rejection',confirmed:true})).json().error.code,'STIPEND_ALREADY_PAID');
  }
  await ok(action('staff',c.transactionId,{action:'report',description:'Synthetic post-payment discrepancy for Coordinator review'}));
  current=await detail();const issue=current.issues.find(i=>i.transactionId===c.transactionId);assert.ok(issue);assert.equal((await action('staff',c.transactionId,{action:'dismiss',caseId:issue.id,reason:'Staff cannot decide financial disputes'})).statusCode,403);
  await ok(action('coordinator',c.transactionId,{action:'dismiss',caseId:issue.id,reason:'Reviewed synthetic release evidence; no financial correction required'}));
  if(c.sourceKind==='unclaimed'&&c.total===835)await volumeRemainder(c,base,detail,preview,measure);
  if(c.sourceKind==='unclaimed'&&c.total===2)await conflictResolution(c,base,header.source_batch_id,detail,preview,measure);
  await corrections(c,base,detail,action,period);
  const correctionHistory=(await ok(c.request('staff',`${base}/transactions/${c.transactionId}/corrections?limit=2`))).json();assert.equal(correctionHistory.items.length,2);assert.ok(correctionHistory.total>=4);assert.equal((await c.request('system_admin',`${base}/transactions/${c.transactionId}/corrections`)).statusCode,403);
  const stable=await detail();for(let i=0;i<20;i++){await service.page(staff.id,{q:'',limit:25,view:'paid',offset:0});await service.detail(staff.id,c.transactionId);global.gc?.();const p=c.runtime.pool as unknown as {_allConnections:{length:number};_freeConnections:{length:number};_connectionQueue:{length:number}};assert.equal(p._allConnections.length,p._freeConnections.length);assert.equal(p._connectionQueue.length,0);memory.push({run:i+1,...process.memoryUsage(),connections:p._allConnections.length});}assert.equal((await detail()).settlement?.recordedAt,stable.settlement?.recordedAt);
  assert.deepEqual((await c.admin.query<RowDataPacket[]>("SELECT * FROM payment_records WHERE source_kind='payroll' ORDER BY id"))[0],payrollRows,'Original payroll outcomes remain byte-for-byte unchanged');assert.deepEqual(await protectedHash(),original);
  for(const sql of ['UPDATE payment_records SET amount=amount WHERE 1=0','DELETE FROM payment_records WHERE 1=0','UPDATE payment_corrections SET snapshot=snapshot WHERE 1=0','DELETE FROM individual_payment_events WHERE 1=0'])await assert.rejects(c.runtime.query(sql));
  const [[paidStored]]=await c.admin.query<RowDataPacket[]>("SELECT * FROM payment_records WHERE individual_transaction_id=?",[c.transactionId]);assert.equal(paidStored.batch_id,null);assert.equal(paidStored.batch_revision,null);assert.equal(paidStored.actor_id,staff.id);assert.equal(paidStored.source_kind,'individual');
  const evidence=JSON.stringify(paidStored.release_evidence);assert.ok(!/representativeName|recipientType|idNumber/.test(evidence));if(c.sourceKind==='omitted')assert.ok(evidence.includes('authorizationDocumentsVerified'));
  await assert.rejects(c.admin.query('INSERT INTO payment_records SET ?',[{...paidStored,id:randomUUID(),amount:'1.00'}]));
  await assert.rejects(c.admin.query('INSERT INTO payment_records SET ?',[{...paidStored,id:randomUUID(),batch_id:header.source_batch_id}]));
  if(c.sourceKind==='unclaimed')await postClosure(c,base,header.source_batch_id,detail,action,period);
  if(process.argv.includes('--financial-reports'))await (await import('./test-financial-reports.js')).testFinancialReports({...c,batch:header.source_batch_id},c.sourceKind+'-settled');
  await (await import('./test-individual-documents-backup.js')).testDocumentBackup(c.admin,c.transactionId,{directory:folder+'/recovery',verify:async db=>{
   const [rows]=await db.query<RowDataPacket[]>("SELECT * FROM payment_records WHERE source_kind='individual' ORDER BY id"),[expected]=await c.admin.query<RowDataPacket[]>("SELECT * FROM payment_records WHERE source_kind='individual' ORDER BY id");assert.deepEqual(rows,expected);
   const [corrections]=await db.query<RowDataPacket[]>('SELECT * FROM payment_corrections WHERE individual_transaction_id IS NOT NULL ORDER BY id,version'),[expectedCorrections]=await c.admin.query<RowDataPacket[]>('SELECT * FROM payment_corrections WHERE individual_transaction_id IS NOT NULL ORDER BY id,version');assert.deepEqual(corrections,expectedCorrections);
   await assert.rejects(db.execute("UPDATE payment_records SET amount=1.00 WHERE individual_transaction_id=?",[c.transactionId]),e=>Boolean(e&&typeof e==='object'&&'errno'in e&&e.errno===4025));
   if(payrollRows.length)await assert.rejects(db.query("UPDATE payment_records SET batch_id=NULL WHERE source_kind='payroll' LIMIT 1"),e=>Boolean(e&&typeof e==='object'&&'errno'in e&&e.errno===4025));
   else await assert.rejects(db.query('INSERT INTO payment_records SET ?',[{...rows[0],id:randomUUID(),source_kind:'payroll',batch_id:null,batch_revision:null,individual_transaction_id:null,individual_revision:null,entitlement_id:null,scholar_id:null,semester_id:null,release_evidence:null}]),e=>Boolean(e&&typeof e==='object'&&'errno'in e&&e.errno===4025));
  }});
  await writeFile(`${folder}/${c.sourceKind}-${c.total}-metrics.json`,JSON.stringify({at:new Date().toISOString(),cohort:c.total,conditions:'Disposable authorized HTTP and labelled existing service observations; warm read samples; single writes/races; SELECT client time; forced-GC 20-read samples',runs,memory,originalPayrollRowsUnchanged:true,protectedHashes:original,noRepresentativePII:true},null,2));
  console.log(`PASS P07 ${c.sourceKind}/${c.total}: canonical cheque settlement, forwarding, no inferred payment, representative/bulk boundaries, exact retries, concurrency, atomic audit rollback, corrections, financial preservation and bounded memory reads`);
 }finally{c.runtime.getConnection=oldGet;}
}
async function postClosure(c:Context,base:string,batch:string,detail:(id?:string)=>Promise<Detail>,action:(role:string,id:string,data:object,key?:string)=>Promise<LightMyRequestResponse>,period:RowDataPacket){
 const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body.slice(0,2500));return r;};
 const summary=async()=>(await ok(c.request('staff',`/api/v1/ovr-batches/${batch}/reconciliation-summary`))).json();
 let overview=await summary();await ok(c.request('staff',`/api/v1/ovr-batches/${batch}/reconciliation-commands`,{action:'verify',expectedRevision:overview.summary.revision,expectedReconciliationRevision:overview.reconciliationRevision,sourceHash:overview.sourceHash,returnedAndCompared:true}));
 await ok(action('staff',c.transactionId,{action:'report',description:'Unresolved individual settlement issue must block closure even with verification override'}));overview=await summary();
 const blockedClose=await c.request('coordinator',`/api/v1/ovr-batches/${batch}/reconciliation-commands`,{action:'close',expectedRevision:overview.summary.revision,expectedReconciliationRevision:overview.reconciliationRevision,sourceHash:overview.sourceHash,effectiveOn:today(),reviewed:true,overrideReason:'Synthetic verification-only override cannot bypass financial disputes'});assert.equal(blockedClose.json().error.code,'DISCREPANCY_UNRESOLVED');
 const openIssue=(await detail()).issues.find(i=>i.transactionId===c.transactionId);assert.ok(openIssue);await ok(action('coordinator',c.transactionId,{action:'dismiss',caseId:openIssue.id,reason:'Reviewed and resolved before original payroll closure'}));overview=await summary();
 await ok(c.request('coordinator',`/api/v1/ovr-batches/${batch}/reconciliation-commands`,{action:'close',expectedRevision:overview.summary.revision,expectedReconciliationRevision:overview.reconciliationRevision,sourceHash:overview.sourceHash,effectiveOn:today(),reviewed:true}));
 const [closed]=await c.admin.query<RowDataPacket[]>("SELECT snapshot,snapshot_hash FROM payroll_reconciliation_events WHERE batch_id=? AND kind='closed'",[batch]),[members]=await c.admin.query<RowDataPacket[]>('SELECT * FROM payroll_closure_members WHERE closure_id=? ORDER BY position',[(closed[0] as RowDataPacket).id??(await c.admin.query<RowDataPacket[]>("SELECT id FROM payroll_reconciliation_events WHERE batch_id=? AND kind='closed'",[batch]))[0][0].id]);
 const date=new Date(Date.parse(today()+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 assert.equal((await action('staff',c.transactionId,{action:'correct-date',actualPaidOn:date,reason:'Closed-period correction must require Coordinator review'})).statusCode,423);
 if(date>=period.starts){await ok(action('staff',c.transactionId,{action:'request-correction',outcome:'paid',actualPaidOn:date,reason:'Synthetic actual date correction after original payroll closure'}));const correction=(await detail()).pendingCorrections[0];await ok(action('coordinator',c.transactionId,{action:'approve-correction',correctionId:correction.id,reason:'Reviewed actual receipt evidence; original payroll remains closed'}));}
 await ok(action('staff',c.transactionId,{action:'report',description:'Staff can report an individual settlement issue after original payroll closure'}));const issue=(await detail()).issues.find(i=>i.transactionId===c.transactionId);assert.ok(issue);await ok(action('coordinator',c.transactionId,{action:'dismiss',caseId:issue.id,reason:'Reviewed post-closure individual settlement issue without reopening payroll'}));
 assert.equal((await summary()).summary.state,'closed');assert.deepEqual((await c.admin.query<RowDataPacket[]>("SELECT snapshot,snapshot_hash FROM payroll_reconciliation_events WHERE batch_id=? AND kind='closed'",[batch]))[0],closed);
 const [[closure]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM payroll_reconciliation_events WHERE batch_id=? AND kind='closed'",[batch]);assert.deepEqual((await c.admin.query<RowDataPacket[]>('SELECT * FROM payroll_closure_members WHERE closure_id=? ORDER BY position',[closure.id]))[0],members);
 const s=(await ok(c.request('staff',base+'/summary'))).json();assert.equal(s.financialConflict,false);assert.ok(s.paidEntitlements>0);assert.equal(s.paidAmount,(s.paidEntitlements*5000).toFixed(2));
}
async function conflictResolution(c:Context,base:string,batch:string,detail:(id?:string)=>Promise<Detail>,preview:(input:SettlementInput)=>Promise<SettlementPreview>,measure:<T>(name:string,fn:()=>Promise<T>)=>Promise<T>){
 const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body.slice(0,2500));return r;};
 const [[other]]=await c.admin.query<RowDataPacket[]>("SELECT id,scholarship_id FROM payment_records WHERE batch_id=? AND outcome='paid'",[batch]);assert.ok(other);
 const recon=(await ok(c.request('staff',`/api/v1/ovr-batches/${batch}/reconciliation-summary`))).json();
 await ok(c.request('coordinator',`/api/v1/ovr-batches/${batch}/reconciliation-commands`,{action:'correct',expectedRevision:recon.summary.revision,expectedReconciliationRevision:recon.reconciliationRevision,sourceHash:recon.sourceHash,paymentId:other.id,outcome:'unclaimed',actualPaidOn:null,reason:'Synthetic second source for cancellation and discovery testing',confirmed:true}));
 let row=(await ok(c.request('staff',`/api/v1/individual-payments/payments/${other.id}`))).json();let r=(await ok(c.request('staff','/api/v1/individual-payments/commands',{action:'request',paymentId:other.id,expectedRevision:row.revision}))).json();row=(await ok(c.request('staff',`/api/v1/individual-payments/payments/${other.id}`))).json();await ok(c.request('staff','/api/v1/individual-payments/commands',{action:'prepare',paymentId:other.id,transactionId:r.transactionId,expectedRevision:row.revision}));
 const originalId=r.transactionId;let d=await detail(originalId);
 await ok(c.request('staff',base+'/commands',{action:'forward',transactionId:originalId,expectedRevision:d.revision,sourceHash:d.sourceHash}));
 row=(await ok(c.request('staff',`/api/v1/individual-payments/payments/${other.id}`))).json();await ok(c.request('staff','/api/v1/individual-payments/commands',{action:'request-cancellation',paymentId:other.id,transactionId:originalId,expectedRevision:row.revision,reason:'Replace the synthetic forwarded unpaid DV'}));row=(await ok(c.request('staff',`/api/v1/individual-payments/payments/${other.id}`))).json();
 const cancel={action:'approve-cancellation',paymentId:other.id,transactionId:originalId,expectedRevision:row.revision,reason:'Coordinator checked financial-office status; no payment recorded'};
 assert.equal((await c.request('coordinator','/api/v1/individual-payments/commands',cancel)).json().error.code,'FORWARDED_PAYMENT_REVIEW_REQUIRED');await ok(c.request('coordinator','/api/v1/individual-payments/commands',{...cancel,externalUnpaidConfirmed:true}));
 d=await detail(originalId);assert.equal(d.status,'Cancelled');assert.ok(d.warnings.length);assert.equal((await preview({mode:'single',transactionIds:[originalId],actualPaidOn:today()})).conflicts.length,1);
 row=(await ok(c.request('staff',`/api/v1/individual-payments/payments/${other.id}`))).json();r=(await ok(c.request('staff','/api/v1/individual-payments/commands',{action:'replace',paymentId:other.id,transactionId:originalId,expectedRevision:row.revision}))).json();const replacementId=r.transactionId;
 d=await detail(originalId);const report=(await ok(measure('conflict_detection',()=>c.request('staff',base+'/commands',{action:'report',transactionId:originalId,expectedRevision:d.revision,description:'Original cancelled cheque was discovered already released and acknowledged',discoveredPaidOn:today(),acknowledgedRelease:true})))).json();
 const blocked=await preview({mode:'single',transactionIds:[replacementId],actualPaidOn:today()});assert.equal(blocked.conflicts.length,1);
 d=await detail(originalId);const input={action:'confirm-original',transactionId:originalId,expectedRevision:d.revision,caseId:report.caseId,sourceHash:d.sourceHash,reason:'Reviewed acknowledged original release; replacement remains unpaid and is voided internally',acknowledgedRelease:true,voidReplacement:true};assert.equal((await c.request('staff',base+'/commands',input)).statusCode,403);
 await ok(measure('coordinator_conflict_resolution',()=>c.request('coordinator',base+'/commands',input)));
 assert.equal((await detail(originalId)).status,'Paid');assert.equal((await detail(replacementId)).status,'Cancelled');assert.equal((await detail(originalId)).issues.length,0);
 const [[paid]]=await c.admin.query<RowDataPacket[]>("SELECT COUNT(*) n FROM payment_records WHERE individual_transaction_id IN (?,?)",[originalId,replacementId]);assert.equal(Number(paid.n),1);
}
async function corrections(c:Context,base:string,detail:(id?:string)=>Promise<Detail>,action:(role:string,id:string,data:object,key?:string)=>Promise<LightMyRequestResponse>,period:RowDataPacket){
 const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body.slice(0,2000));return r;};
 await ok(action('staff',c.transactionId,{action:'request-correction',outcome:'not_paid',actualPaidOn:null,reason:'Synthetic disputed receipt requires Coordinator correction'}));
 let d=await detail(),pending=d.pendingCorrections[0];assert.ok(pending);assert.equal((await action('staff',c.transactionId,{action:'approve-correction',correctionId:pending.id,reason:'Staff cannot approve outcome changes'})).statusCode,403);
 await ok(action('coordinator',c.transactionId,{action:'approve-correction',correctionId:pending.id,reason:'Reviewed synthetic financial correction without reopening payroll'}));d=await detail();assert.equal(d.settlement?.outcome,'not_paid');assert.equal(d.status,'Needs Review');
 await ok(action('staff',c.transactionId,{action:'request-correction',outcome:'paid',actualPaidOn:today(),reason:'Restore documented actual receipt after synthetic correction',priorReceiptConfirmed:true,priorReceiptEvidence:'Synthetic signed acknowledged receipt'}));pending=(await detail()).pendingCorrections[0];await ok(action('coordinator',c.transactionId,{action:'approve-correction',correctionId:pending.id,reason:'Verified original acknowledged receipt and no competing payment'}));assert.equal((await detail()).settlement?.outcome,'paid');
 const oldEnds=period.ends,yesterday=new Date(Date.parse(today()+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 try{await c.admin.execute('UPDATE semesters SET ends_on=? WHERE id=?',[yesterday,period.id]);const p=(await ok(c.request('staff',base+'/preview',{mode:'single',transactionIds:[c.transactionId],actualPaidOn:today()}))).json<SettlementPreview>();assert.equal(p.conflicts.length,1);assert.equal((await action('staff',c.transactionId,{action:'correct-date',actualPaidOn:yesterday,reason:'Expired period must retain reviewed correction workflow'})).statusCode,423);}finally{await c.admin.execute('UPDATE semesters SET ends_on=? WHERE id=?',[oldEnds,period.id]);}
}
async function volumeRemainder(c:Context,base:string,detail:(id?:string)=>Promise<Detail>,preview:(input:SettlementInput)=>Promise<SettlementPreview>,measure:<T>(name:string,fn:()=>Promise<T>)=>Promise<T>){
 const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body.slice(0,2500));return r;};
 const queue=(await ok(c.request('staff','/api/v1/individual-payments/queue?limit=25'))).json<{items:{paymentId:string;revision:number;transactionId:string|null}[]}>();assert.equal(queue.items.length,9);
 const ids:string[]=[];for(const row of queue.items){let r=(await ok(c.request('staff','/api/v1/individual-payments/commands',{action:'request',paymentId:row.paymentId,expectedRevision:row.revision}))).json();const current=(await ok(c.request('staff',`/api/v1/individual-payments/payments/${row.paymentId}`))).json();r=(await ok(c.request('staff','/api/v1/individual-payments/commands',{action:'prepare',paymentId:row.paymentId,transactionId:r.transactionId,expectedRevision:current.revision}))).json();ids.push(r.transactionId);}
 const conflictId=ids[0],row=queue.items[0],d=await detail(conflictId);await ok(c.request('staff','/api/v1/individual-payments/commands',{action:'request-cancellation',paymentId:row.paymentId,transactionId:conflictId,expectedRevision:d.revision,reason:'Synthetic conflict retained for bulk preview'}));
 const input:SettlementInput={mode:'bulk',transactionIds:ids,actualPaidOn:today()},first=await measure('bulk_conflict_preview',()=>preview(input));assert.equal(first.conflicts.length,1);assert.equal(first.accepted.length,8);
 const reviewed:SettlementInput={...input,transactionIds:ids.slice(1)},p=await measure('bulk_accepted_preview',()=>preview(reviewed));assert.equal(p.count,8);assert.deepEqual(p.conflicts,[]);
 const financialState=async()=>{const state:Record<string,string>={};for(const table of ['payment_records','payment_corrections','individual_payment_events','entitlement_payment_routes','ovr_commands','audit_logs']){const [rows]=await c.admin.query<RowDataPacket[]>(`SELECT * FROM ${table}`);state[table]=sha(rows.map(r=>JSON.stringify(r)).sort());}return state;};
 const failLast=[...reviewed.transactionIds].sort().at(-1)!;
 await c.admin.query("CREATE TRIGGER p07_bulk_fail BEFORE INSERT ON payment_records FOR EACH ROW BEGIN IF NEW.individual_transaction_id='"+failLast+"' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic partial bulk failure'; END IF; END");
 const before=await financialState();
 try{assert.equal((await c.request('staff',base+'/paid',{input:reviewed,basis:p.basis,acknowledgedRelease:true,scholarPersonalReleaseConfirmed:true})).statusCode,500);}finally{await c.admin.query('DROP TRIGGER p07_bulk_fail');}assert.deepEqual(await financialState(),before,'A late child failure rolls back every canonical payment, event, route, journal and audit');
 const key=randomUUID(),body={input:reviewed,basis:p.basis,acknowledgedRelease:true,scholarPersonalReleaseConfirmed:true},result=(await ok(measure('bulk_commit_8',()=>c.request('staff',base+'/paid',body,key)))).json();assert.equal(result.count,8);assert.deepEqual((await ok(c.request('staff',base+'/paid',body,key))).json(),result);
 const current=(await ok(c.request('staff',`/api/v1/individual-payments/payments/${row.paymentId}`))).json();await ok(c.request('coordinator','/api/v1/individual-payments/commands',{action:'reject-cancellation',paymentId:row.paymentId,transactionId:conflictId,expectedRevision:current.revision,reason:'Resume the valid synthetic unpaid DV after review'}));
 const representative:SettlementInput={mode:'single',transactionIds:[conflictId],actualPaidOn:today(),authorizationDocumentsVerified:true},rep=await preview(representative);await ok(measure('representative_release',()=>c.request('staff',base+'/paid',{input:representative,basis:rep.basis,acknowledgedRelease:true})));
 assert.equal(Number((await c.admin.query<RowDataPacket[]>("SELECT COUNT(*) n FROM payment_records WHERE source_kind='individual'"))[0][0].n),10);
 const [original]=await c.admin.query<RowDataPacket[]>("SELECT outcome,COUNT(*) n FROM payment_records WHERE source_kind='payroll' GROUP BY outcome");assert.equal(Number(original.find(r=>r.outcome==='not_paid')?.n),10);assert.equal(Number(original.find(r=>r.outcome==='paid')?.n),825);
}
