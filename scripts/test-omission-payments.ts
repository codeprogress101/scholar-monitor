import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import type {Connection,Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
import type {PayoutCycle} from '../server/payouts/model.js';
import {digest} from '../server/auth/crypto.js';
import {today} from '../server/scholars/validation.js';
type Context={request:(role:string,path:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;admin:Connection;runtime:Pool;source:string;destination:string;cycle:PayoutCycle;semester:string;people:{id:string;annual:string}[]};
type Detail={id:string;revision:number;sourceHash:string;state:string;blockers:string[];entitlementId:string|null;transactionId:string|null};
export async function testOmissionPayments(c:Context){
 const base='/api/v1/individual-payments/omissions',person=c.people[1],folder=process.env.LDSS_P05_OUTPUT??'output/p05-omitted-20261022';await mkdir(folder,{recursive:true});
 const volume=process.argv.includes('--omitted-volume');
 if(volume){
  const [[template]]=await c.admin.execute<RowDataPacket[]>('SELECT * FROM scholars WHERE id=?',[person.id]);
  const [[annual]]=await c.admin.execute<RowDataPacket[]>('SELECT * FROM scholarship_records WHERE id=?',[person.annual]);
  for(let i=0;i<832;i++){
   const id=randomUUID();await c.admin.query('INSERT INTO scholars SET ?',{...template,id,first_name:'Volume '+String(i).padStart(4,'0'),last_name:'Queue Fixture',middle_name:''});
   await c.admin.execute('INSERT INTO scholar_identifiers(scholar_id,entry_year,sequence_no) VALUES(?,2026,?)',[id,20000+i]);
   await c.admin.query('INSERT INTO scholarship_records SET ?',{...annual,id:randomUUID(),scholar_id:id});
  }
  // These extra search rows deliberately have no invented document or academic
  // approval. Only the real omitted fixture scholar undergoes financial review.
 }
 if(process.argv.includes('--omitted-browser')){console.log('P05 browser fixture '+JSON.stringify({source:c.source,destination:c.destination,cycle:c.cycle.id,scholar:person.id,annual:person.annual,semester:c.semester}));return;}
 const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body);return r;};
 const reject=async(p:Promise<LightMyRequestResponse>,code:string,status=409)=>{const r=await p;assert.equal(r.statusCode,status,r.body);assert.equal(r.json().error.code,code,r.body);};
 const sourceBefore=(await ok(c.request('staff',`/api/v1/ovr-batches/${c.source}`))).json(),frozenHash=digest(JSON.stringify(sourceBefore.finalization));
 const [[paymentCount]]=await c.admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM payment_records');
 const [[entitlementCount]]=await c.admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM semester_entitlements');
 let selects=0,dbMs=0;const rawGet=c.runtime.getConnection.bind(c.runtime);
 c.runtime.getConnection=async()=>{
  const connection=await rawGet();return new Proxy(connection,{get(target,prop){if(prop!=='execute'&&prop!=='query'){const v=Reflect.get(target,prop);return typeof v==='function'?v.bind(target):v;}return async(...args:unknown[])=>{const start=performance.now();if(typeof args[0]==='string'&&/^\s*SELECT\b/i.test(args[0]))selects++;try{return await (target[prop] as (...v:unknown[])=>Promise<unknown>).apply(target,args);}finally{dbMs+=performance.now()-start;}};}}) as PoolConnection;
 };
 const runs:object[]=[];
 async function measure(name:string,run:()=>Promise<LightMyRequestResponse>){global.gc?.();selects=0;dbMs=0;const start=performance.now(),before=process.memoryUsage();let peakRss=before.rss,peakHeap=before.heapUsed;const interval=setInterval(()=>{const m=process.memoryUsage();peakRss=Math.max(peakRss,m.rss);peakHeap=Math.max(peakHeap,m.heapUsed);},10);try{const r=await run(),after=process.memoryUsage();runs.push({name,ms:performance.now()-start,selects,dbMs,bytes:Buffer.byteLength(r.body),status:r.statusCode,before,after,peakRss:Math.max(peakRss,after.rss),peakHeap:Math.max(peakHeap,after.heapUsed)});return r;}finally{clearInterval(interval);}}
 const record={action:'record',sourceBatchId:c.source,scholarshipId:person.annual,expectedRevision:0};
 try{
  for(let i=0;i<3;i++){await ok(measure('open',()=>c.request('staff',base+'/sources')));await ok(measure('search',()=>c.request('staff',`${base}?sourceBatchId=${c.source}&q=Beatrice&limit=25`)));}
  if(volume){
   for(let i=0;i<3;i++){const first=await ok(measure('page_835',()=>c.request('staff',`${base}?sourceBatchId=${c.source}&limit=25`)));assert.equal(first.json().total,833);assert.equal(first.json().items.length,25);await ok(measure('next_page_835',()=>c.request('staff',`${base}?sourceBatchId=${c.source}&limit=25&offset=25`)));}
   const first=(await ok(c.request('staff',`${base}?sourceBatchId=${c.source}&limit=25`))).json(),second=(await ok(c.request('staff',`${base}?sourceBatchId=${c.source}&limit=25&offset=25`))).json();
   assert.ok(!first.items.some((a:{scholarshipId:string})=>second.items.some((b:{scholarshipId:string})=>a.scholarshipId===b.scholarshipId)));
   assert.equal((await c.request('staff',base+'/commands',{...record,scholarshipId:second.items[0].scholarshipId})).statusCode,409,'Search absence never manufactures eligibility');
  }
  await reject(c.request('system_admin',base+'/sources'),'PERMISSION_DENIED',403);
  await reject(c.request('staff',base+'/commands',{...record,sourceBatchId:randomUUID()}),'OMISSION_SOURCE_INVALID');
  await reject(c.request('staff',base+'/commands',{...record,scholarshipId:c.people[0].annual}),'OMISSION_BLOCKED');
  const recordKey=randomUUID(),saved=await ok(measure('record_omission',()=>c.request('staff',base+'/commands',record,recordKey))),id=saved.json().id as string;
  assert.deepEqual((await ok(c.request('staff',base+'/commands',record,recordKey))).json(),saved.json());
  const [[staffRole]]=await c.admin.query<RowDataPacket[]>("SELECT ur.id FROM user_roles ur JOIN users u ON u.id=ur.user_id WHERE ur.role_code='staff' AND ur.revoked_at IS NULL LIMIT 1");
  try{await c.admin.execute('UPDATE user_roles SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?',[staffRole.id]);await reject(c.request('staff',base+'/commands',record,recordKey),'PERMISSION_DENIED',403);}finally{await c.admin.execute('UPDATE user_roles SET revoked_at=NULL WHERE id=?',[staffRole.id]);}
  await reject(c.request('staff',base+'/commands',{...record,reason:'Changed payload'},recordKey),'IDEMPOTENCY_CONFLICT');
  const detail=async()=>(await ok(c.request('staff',`${base}/${id}`))).json<Detail>();
  const input=async(action:string,extra:object={})=>{const d=await detail();return {...record,action,omissionId:id,expectedRevision:d.revision,expectedSourceHash:d.sourceHash,...extra};};
  const command=async(action:string,role='staff',extra:object={},key=randomUUID())=>c.request(role,base+'/commands',await input(action,extra),key);
  await ok(measure('add_to_payroll',()=>command('add-to-payroll','staff',{destinationBatchId:c.destination})));
  const [[notInserted]]=await c.admin.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM ovr_entries WHERE batch_id=? AND scholarship_id=?',[c.destination,person.annual]);assert.equal(Number(notInserted.n),0,'Metadata is not manual roster insertion');
  await reject(command('add-to-payroll','staff',{destinationBatchId:c.source}),'OMISSION_DESTINATION_INVALID');
  await reject(command('request'),'PAYROLL_FIRST_REQUIRED');
  await reject(command('prepare'),'OMISSION_APPROVAL_REQUIRED');
  const offset=(n:number)=>new Date(Date.parse(today()+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
  // Advance only this owned fixture's sequential windows, then obtain a real
  // Staff review before racing financial routes at the preparation boundary.
  await c.admin.execute('UPDATE payroll_submission_window_versions SET cutoff_on=? WHERE batch_id=?',[offset(-2),c.source]);
  await c.admin.execute('UPDATE payroll_submission_window_versions SET opens_on=?,cutoff_on=? WHERE batch_id=?',[offset(-1),offset(-1),c.destination]);
  const reviewed=(await ok(c.request('staff',`/api/v1/ovr-batches/${c.destination}`))).json();
  await ok(c.request('staff',`/api/v1/ovr-batches/${c.destination}/submit-review`,{expectedRevision:reviewed.batch.revision,expectedSourceHash:reviewed.managed.sourceHash,reason:'Staff reviewed ordinary omitted candidate',reference:'P05-RACE-REVIEW'}));
  const prepPath=`/api/v1/payout-cycles/${c.cycle.id}/preparation`,prep=async()=>(await ok(c.request('staff',prepPath))).json<{revision:number;state:string;cycleVersion:number}>();
  const prepBody=async(state:string)=>({state,expectedRevision:(await prep()).revision,expectedCycleVersion:c.cycle.version,reason:'Synthetic reviewed preparation boundary'});
  await reject(c.request('staff',prepPath,await prepBody('closed')),'PERMISSION_DENIED',403);
  await ok(measure('close_preparation',async()=>c.request('coordinator',prepPath,await prepBody('closed'))));
  await reject(c.request('coordinator',`/api/v1/payout-cycles/${c.cycle.id}/submission-windows/open-window`,{expectedCycleVersion:c.cycle.version,expectedDeadlineRevision:1,expectedSequence:2,opensOn:today(),cutoffOn:today()}),'PREPARATION_CLOSED');
  const destinationView=(await ok(c.request('staff',`/api/v1/ovr-batches/${c.destination}`))).json();
  await reject(c.request('staff',`/api/v1/ovr-batches/${c.destination}/submit-review`,{expectedRevision:destinationView.batch.revision,expectedSourceHash:destinationView.managed.sourceHash,reason:'Synthetic existing review',reference:'P05-TEST'}),'PREPARATION_CLOSED');
  await ok(measure('concurrent_payroll_vs_individual',async()=>{
   const pair=await Promise.all([command('request'),c.request('coordinator',`/api/v1/ovr-batches/${c.destination}/finalize`,{expectedRevision:destinationView.batch.revision,expectedSourceHash:destinationView.managed.sourceHash,reason:'Concurrent reviewed payroll finalization',reference:'P05-RACE'})]);
   assert.equal(pair[0].statusCode,200,pair[0].body);assert.equal(pair[1].statusCode,409,pair[1].body);assert.equal(pair[1].json().error.code,'PREPARATION_CLOSED');return pair[0];
  }));await reject(command('approve','staff',{reason:'Staff cannot authorize'}),'PERMISSION_DENIED',403);
  await ok(command('reject','coordinator',{reason:'Synthetic rejection preserves history'}));
  await ok(command('request','coordinator'));
  await reject(command('approve','staff',{reason:'Staff cannot authorize this request'}),'PERMISSION_DENIED',403);
  await ok(command('request-cancellation','staff',{reason:'Cancel synthetic self-request'}));await ok(command('approve-cancellation','coordinator',{reason:'Reviewed cancellation before authorization'}));
  await ok(measure('request_or_dv',()=>command('request')));
  const pendingCandidates=(await ok(c.request('staff',`/api/v1/ovr-batches/${c.destination}`))).json();assert.equal(pendingCandidates.managed.items.find((i:{scholarshipId:string})=>i.scholarshipId===person.annual).eligible,false);
  const approvalBody=await input('approve',{reason:'Coordinator reviewed eligible omitted stipend'}),approvalKey=randomUUID();
  await c.admin.query("CREATE TRIGGER p05_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payroll.omission' AND NEW.action='approved' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic P05 audit rollback'; END IF; END");
  try{assert.equal((await c.request('coordinator',base+'/commands',approvalBody,approvalKey)).statusCode,500);}finally{await c.admin.query('DROP TRIGGER p05_fail_audit');}
  const [[afterFailure]]=await c.admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM semester_entitlements');assert.equal(Number(afterFailure.n),Number(entitlementCount.n));assert.equal((await detail()).state,'requested');
  await ok(measure('authorize_or_dv',()=>c.request('coordinator',base+'/commands',approvalBody,approvalKey)));
  const approved=(await detail()).entitlementId;assert.ok(approved);
  const [[approvedCaseEvent]]=await c.admin.execute<RowDataPacket[]>("SELECT * FROM payroll_omission_events WHERE omission_id=? AND action='approved' ORDER BY revision DESC LIMIT 1",[id]);
  const [[otherEntitlement]]=await c.admin.execute<RowDataPacket[]>('SELECT id FROM semester_entitlements WHERE id<>? LIMIT 1',[approved]);
  // CHECK must reject NULL explicitly; the composite FK also rejects an
  // otherwise-valid entitlement belonging to another scholar/semester owner.
  for(const malformed of [{entitlement_id:null},{entitlement_id:otherEntitlement.id,authorized_entitlement_id:otherEntitlement.id}])await assert.rejects(c.admin.query('INSERT INTO payroll_omission_events SET ?',{...approvedCaseEvent,revision:999999,...malformed}),(e:{errno?:number})=>[4025,1452].includes(e.errno??0));
  // The existing entitlement hold remains authoritative for omitted approvals.
  const [[approvalEvent]]=await c.admin.execute<RowDataPacket[]>('SELECT * FROM semester_entitlement_events WHERE entitlement_id=? ORDER BY revision DESC LIMIT 1',[approved]);
  await c.admin.query('INSERT INTO semester_entitlement_events SET ?',{...approvalEvent,id:randomUUID(),revision:Number(approvalEvent.revision)+1,action:'withheld',snapshot:JSON.stringify({releaseHold:true}),reason:'Synthetic Coordinator hold retained'});
  await reject(command('prepare'),'OMISSION_BLOCKED');
  await c.admin.query('INSERT INTO semester_entitlement_events SET ?',{...approvalEvent,id:randomUUID(),revision:Number(approvalEvent.revision)+2,snapshot:JSON.stringify({releaseHold:false}),reason:'Synthetic reviewed hold release'});
  await ok(measure('reopen_reserved',async()=>c.request('coordinator',prepPath,await prepBody('open'))));
  await reject(command('add-to-payroll','staff',{destinationBatchId:c.destination}),'INDIVIDUAL_ROUTE_ACTIVE');await reject(command('prepare'),'PAYROLL_FIRST_REQUIRED');
  await ok(c.request('coordinator',prepPath,await prepBody('closed')));
  const prepareBody=await input('prepare'),keys=[randomUUID(),randomUUID()];
  const pair=await Promise.all(keys.map(key=>c.request('staff',base+'/commands',prepareBody,key)));assert.deepEqual(pair.map(r=>r.statusCode).sort(),[200,409]);
  const winner=pair.findIndex(r=>r.statusCode===200);assert.deepEqual((await ok(c.request('staff',base+'/commands',prepareBody,keys[winner]))).json(),pair[winner].json());
  const documentTransaction=(await detail()).transactionId;
  if(process.argv.includes('--settlement-browser')){console.log('P07 prepared browser fixture '+JSON.stringify({transactionId:documentTransaction,sourceKind:'omitted'}));return;}
  if(process.argv.includes('--individual-settlement')){await (await import('./test-individual-settlement.js')).testIndividualSettlement({request:c.request,admin:c.admin,runtime:c.runtime,transactionId:documentTransaction!,sourceKind:'omitted',total:3});return;}
  if(process.argv.includes('--documents-browser')){console.log('P06 prepared browser fixture '+JSON.stringify({transactionId:documentTransaction,omissionId:id,sourceKind:'omitted'}));return;}
  if(process.argv.includes('--individual-documents'))await (await import('./test-individual-documents.js')).testIndividualDocuments({request:c.request,admin:c.admin,runtime:c.runtime,transactionId:documentTransaction!,sourceKind:'omitted'});
  await ok(command('request-cancellation','staff',{reason:'Synthetic whole OR + DV cancellation'}));await reject(command('approve-cancellation','staff',{reason:'Staff may not decide'}),'PERMISSION_DENIED',403);
  await ok(command('reject-cancellation','coordinator',{reason:'Preserve authorized transaction for review'}));assert.equal((await detail()).state,'prepared');
  await ok(command('request-cancellation','staff',{reason:'Cancel before payroll route transfer'}));await ok(measure('cancel_route',()=>command('approve-cancellation','coordinator',{reason:'Reviewed unpaid internal route release'})));
  if(process.argv.includes('--individual-documents'))assert.equal((await c.request('staff',`/api/v1/individual-payments/transactions/${documentTransaction}/documents/DV/word`)).statusCode,409);
  const [[route]]=await c.admin.execute<RowDataPacket[]>('SELECT transaction_id FROM entitlement_payment_routes WHERE entitlement_id=?',[approved]);assert.equal(route.transaction_id,null);
  // A new authorization and replacement preserve the original cancellation.
  await ok(command('request'));await ok(command('approve','coordinator',{reason:'Reviewed replacement authorization'}));await ok(measure('prepare_or_dv',()=>command('prepare')));
  const [headers]=await c.admin.execute<RowDataPacket[]>('SELECT id,source_kind,source_payment_id,replacement_of FROM individual_payment_transactions WHERE omission_id=? ORDER BY recorded_at,id',[id]);assert.equal(headers.length,2);assert.equal(headers[1].replacement_of,headers[0].id);assert.ok(headers.every(h=>h.source_kind==='omitted'&&h.source_payment_id===null));
  await ok(command('request-cancellation','staff',{reason:'Final cancellation to return to payroll'}));await ok(command('approve-cancellation','coordinator',{reason:'Reviewed unpaid replacement cancellation'}));
  await ok(measure('reopen_preparation',async()=>c.request('coordinator',prepPath,await prepBody('open'))));
  const staleReview=(await ok(c.request('staff',`/api/v1/ovr-batches/${c.destination}`))).json();
  await ok(c.request('coordinator',`/api/v1/ovr-batches/${c.destination}/return-to-draft`,{expectedRevision:staleReview.batch.revision,reason:'Return superseded financial route review to Draft',reference:'P05-REFRESH'}));
  await ok(command('add-to-payroll','staff',{destinationBatchId:c.destination}));
  let view=(await ok(c.request('staff',`/api/v1/ovr-batches/${c.destination}`))).json();
  await ok(c.request('staff',`/api/v1/ovr-batches/${c.destination}/submit-review`,{expectedRevision:view.batch.revision,expectedSourceHash:view.managed.sourceHash,reason:'Review automatic omitted candidate',reference:'P05-REVIEW'}));
  view=(await ok(c.request('staff',`/api/v1/ovr-batches/${c.destination}`))).json();
  const finalize={expectedRevision:view.batch.revision,expectedSourceHash:view.managed.sourceHash,reason:'Coordinator finalization retains unique entitlement',reference:'P05-FINAL'};
  await reject(c.request('staff',`/api/v1/ovr-batches/${c.destination}/finalize`,finalize),'PERMISSION_DENIED',403);await ok(c.request('coordinator',`/api/v1/ovr-batches/${c.destination}/finalize`,finalize));
  const [[allocation]]=await c.admin.execute<RowDataPacket[]>('SELECT entitlement_id FROM payroll_allocations WHERE batch_id=? AND scholarship_id=?',[c.destination,person.annual]);assert.equal(allocation.entitlement_id,approved);
  const [[afterEntitlements]]=await c.admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM semester_entitlements');assert.equal(Number(afterEntitlements.n),Number(entitlementCount.n)+1);
  assert.equal(digest(JSON.stringify((await ok(c.request('staff',`/api/v1/ovr-batches/${c.source}`))).json().finalization)),frozenHash);
  const [[afterPayments]]=await c.admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM payment_records');assert.equal(Number(afterPayments.n),Number(paymentCount.n));
  // Preparation closure must not disable lawful existing batch processing.
  await ok(c.request('coordinator',prepPath,await prepBody('closed')));
  const payroll=`/api/v1/ovr-batches/${c.destination}`,readPayroll=async()=>(await ok(c.request('staff',payroll))).json();
  const processing=async(action:string,role:string,extra:object={})=>c.request(role,payroll+'/'+action,{expectedRevision:(await readPayroll()).batch.revision,effectiveOn:today(),reason:'Synthetic existing payroll after preparation closure',reference:'P05-COMPAT',...extra});
  await ok(processing('submit','coordinator'));await ok(processing('mark-processed','staff'));
  await ok(processing('payments','staff',{scholarshipId:person.annual,outcome:'not_paid',unpaidReason:'did_not_claim',amount:'0.00',remarks:'Synthetic genuine original payroll Unclaimed outcome'}));
  const [[unclaimed]]=await c.admin.execute<RowDataPacket[]>('SELECT id FROM payment_records WHERE batch_id=? AND scholarship_id=?',[c.destination,person.annual]);
  const p04='/api/v1/individual-payments',p04request=await ok(c.request('staff',p04+'/commands',{action:'request',paymentId:unclaimed.id,expectedRevision:0}));
  const p04detail=(await ok(c.request('staff',p04+'/payments/'+unclaimed.id))).json();assert.deepEqual(p04detail.blockers,[]);
  await ok(c.request('staff',p04+'/commands',{action:'prepare',paymentId:unclaimed.id,expectedRevision:p04detail.revision,transactionId:p04request.json().transactionId}));
  const [[finalCount]]=await c.admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM payment_records');assert.equal(Number(finalCount.n),Number(paymentCount.n)+1,'Only the explicit payroll Unclaimed action adds its original outcome; document preparation creates none');
  for(const table of ['payroll_omissions','payroll_omission_events','payroll_preparation_versions'])for(const sql of [`UPDATE ${table} SET actor_id=actor_id WHERE 1=0`,`DELETE FROM ${table} WHERE 1=0`])await assert.rejects(c.runtime.query(sql),(e:{code?:string})=>e.code==='ER_TABLEACCESS_DENIED_ERROR');
  const memory=[];for(let i=0;i<20;i++){
   await ok(c.request('staff',`${base}?sourceBatchId=${c.source}&limit=25`));global.gc?.();const p=(c.runtime as unknown as {pool:{_allConnections:{length:number};_freeConnections:{length:number};_connectionQueue:{length:number}}}).pool;
   assert.equal(p._allConnections.length,p._freeConnections.length);assert.equal(p._connectionQueue.length,0);memory.push({iteration:i+1,...process.memoryUsage(),connections:p._allConnections.length});
  }
  await writeFile(folder+(volume?'/after-835.json':'/after-small.json'),JSON.stringify({at:new Date().toISOString(),conditions:`Actual authorized HTTP injection, disposable managed source, ${volume?835:3} scholars; 3 read samples, single writes; SQL client roundtrip and sampled memory; extra volume rows are explicitly unassessed`,runs,memory,preservedOriginalFrozen:true,documentPreparationCreatedNoPayments:true,explicitOriginalPayrollUnclaimedRowsAdded:1,existingPaymentRowsUnchanged:true,oneEntitlementReused:true},null,2));
  console.log('PASS P05 omission source, automatic payroll integration, Coordinator finalization, preparation control, OR + DV approval, Staff authorization denial, concurrent preparation, audit rollback, exact retry, cancellation/replacement and original frozen/payment preservation');
 }finally{c.runtime.getConnection=rawGet;}
}
