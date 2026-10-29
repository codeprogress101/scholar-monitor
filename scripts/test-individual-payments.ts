import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
import {AuthorizationService} from '../server/authorization/service.js';
import {IndividualPaymentService} from '../server/payments/individual-service.js';
import {PayrollReconciliationService} from '../server/payments/reconciliation-service.js';
import {PaymentRecordingService} from '../server/payments/recording-service.js';
import type {IndividualInput,IndividualRow} from '../server/payments/individual-model.js';
import type {ReconciliationOverview} from '../server/payments/reconciliation-model.js';
import {today} from '../server/scholars/validation.js';
import {effectiveRoster} from '../server/ovr/amendment-state.js';
import {paymentRecords} from '../server/ovr/processing-state.js';
import {queueUnclaimed} from '../server/ovr/reprocessing.js';

export async function testIndividualPayments(c:{runtime:Pool;admin:Pick<Pool,'query'|'execute'>;request:(role:string,path:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;batch:string;total:number}){
 const base='/api/v1/individual-payments',payroll=`/api/v1/ovr-batches/${c.batch}`;
 const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body);return r;};
 const page=async(q='')=>(await ok(c.request('staff',`${base}/queue?q=${encodeURIComponent(q)}&limit=25`))).json<{items:IndividualRow[];total:number}>();
 const detail=async(id:string)=>(await ok(c.request('staff',`${base}/payments/${id}`))).json<IndividualRow>();
 const counts=async()=>({...((await c.admin.query<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM individual_payment_transactions) t,(SELECT COUNT(*) FROM individual_payment_events) e,(SELECT COUNT(*) FROM entitlement_payment_routes WHERE transaction_id IS NOT NULL) r,(SELECT COUNT(*) FROM ovr_commands) j,(SELECT COUNT(*) FROM audit_logs) a'))[0][0])});
 const [[actor]]=await c.runtime.query<RowDataPacket[]>("SELECT id FROM users WHERE email='staff@example.invalid'"),[[coordinator]]=await c.runtime.query<RowDataPacket[]>("SELECT id FROM users WHERE email='coordinator@example.invalid'");
 let selects=0,dbMs=0;
 const pool=new Proxy(c.runtime,{get(target,k){if(k!=='getConnection'){const v=Reflect.get(target,k);return typeof v==='function'?v.bind(target):v;}return async()=>{const db=await target.getConnection();return new Proxy(db,{get(t,m){if(m!=='query'&&m!=='execute'){const v=Reflect.get(t,m);return typeof v==='function'?v.bind(t):v;}return async(sql:string,args?:unknown[])=>{const start=performance.now(),v=await (t[m].bind(t) as (s:string,a?:unknown[])=>Promise<unknown>)(sql,args);if(/^\s*SELECT/i.test(sql)){selects++;dbMs+=performance.now()-start;}return v;};}});};}});
 const service=new IndividualPaymentService(new AuthorizationService(pool),true),runs:object[]=[];
 async function measure<T>(name:string,run:()=>Promise<T>){global.gc?.();selects=0;dbMs=0;const start=performance.now(),before=process.memoryUsage();let peakRss=before.rss,peakHeap=before.heapUsed;const timer=setInterval(()=>{const m=process.memoryUsage();peakRss=Math.max(peakRss,m.rss);peakHeap=Math.max(peakHeap,m.heapUsed);},10);try{const value=await run();const after=process.memoryUsage();runs.push({name,ms:performance.now()-start,selects,dbMs,bytes:Buffer.byteLength(JSON.stringify(value)),before,after,peakRss:Math.max(after.rss,peakRss),peakHeap:Math.max(after.heapUsed,peakHeap)});return value;}finally{clearInterval(timer);}}
 const initial=await service.page(String(actor.id),{q:'',limit:25,offset:0});assert.deepEqual(await page(),{items:initial.items,total:initial.total,offset:initial.offset,limit:initial.limit});assert.equal(initial.total,c.total===2?1:10);assert.ok(initial.items.every(r=>r.outcome==='Unclaimed'));
 await (await import('./test-individual-query-plan.js')).testIndividualQueryPlan(c.admin,c.total);
 const originalPayments=(await c.admin.query<RowDataPacket[]>('SELECT * FROM payment_records ORDER BY id'))[0];
 const [[frozen]]=await c.admin.query<RowDataPacket[]>('SELECT snapshot_hash FROM ovr_finalizations WHERE batch_id=?',[c.batch]);
 for(let i=0;i<3;i++){
  await measure('queue',()=>service.page(String(actor.id),{q:'',offset:0,limit:25}));
  await measure('search',()=>service.page(String(actor.id),{q:initial.items[0].humanId,offset:0,limit:25}));
  await measure('next_page',()=>service.page(String(actor.id),{q:'',offset:25,limit:25}));
  await measure('p02_summary',()=>new PaymentRecordingService(new AuthorizationService(pool)).summary(String(actor.id),c.batch));
  await measure('p03_reconciliation',()=>new PayrollReconciliationService(new AuthorizationService(pool)).summary(String(actor.id),c.batch));
 }
 const source=initial.items[0];
 if(initial.total>=10){
  const first=await service.page(String(actor.id),{q:'',offset:0,limit:5}),second=await measure('nonempty_next_page',()=>service.page(String(actor.id),{q:'',offset:5,limit:5}));
  assert.equal(first.items.length,5);assert.equal(second.items.length,5);assert.ok(second.items.every(r=>!first.items.some(p=>p.paymentId===r.paymentId)));
 }
 assert.equal((await c.request('system_admin',base+'/queue')).statusCode,403);
 assert.equal((await c.request('unassigned',base+'/queue')).statusCode,403);
 assert.throws(()=>new IndividualPaymentService(new AuthorizationService(c.runtime)).page(String(actor.id),{}),e=>Boolean(e&&typeof e==='object'&&'code'in e&&e.code==='INDIVIDUAL_PAYMENTS_DISABLED'));
 const input=(action:IndividualInput['action'],r:IndividualRow,reason='')=>({action,paymentId:r.paymentId,expectedRevision:r.revision,...(r.transactionId?{transactionId:r.transactionId}:{}),reason});
 const command=(role:string,body:object,key=randomUUID())=>c.request(role,base+'/commands',body,key);
 const before=await counts();
 await c.admin.query("CREATE TRIGGER p04_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='individual.payment' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic P04 audit rollback'; END IF; END");
 try{assert.equal((await command('staff',input('request',source))).statusCode,500);}finally{await c.admin.query('DROP TRIGGER p04_fail_audit');}
 assert.deepEqual(await counts(),before);
 const [[semester]]=await c.admin.query<RowDataPacket[]>('SELECT t.id,DATE_FORMAT(t.ends_on,\'%Y-%m-%d\') ends FROM semesters t JOIN semester_entitlements e ON e.semester_id=t.id WHERE e.id=?',[source.entitlementId]);
 const yesterday=new Date(Date.parse(today()+'T00:00:00Z')-86400000).toISOString().slice(0,10),requestKey=randomUUID();
 let requested;
 try{
  await c.admin.execute('UPDATE semesters SET ends_on=? WHERE id=?',[yesterday,semester.id]);
  requested=await measure('request_expired_retained',()=>service.command(String(actor.id),requestKey,input('request',source),'p04-request'));
  assert.ok((requested as {blockers:string[]}).blockers.some(b=>b.includes('ended')));
  const blocked=await detail(source.paymentId);assert.equal((await command('staff',input('prepare',blocked))).json().error.code,'INDIVIDUAL_BLOCKED');
 }finally{await c.admin.execute('UPDATE semesters SET ends_on=? WHERE id=?',[semester.ends,semester.id]);}
 const afterRequest=await counts();assert.deepEqual(await service.command(String(actor.id),requestKey,input('request',source),'lost-response'),requested);assert.deepEqual(await counts(),afterRequest);
 assert.equal((await command('staff',{...input('request',source),reason:'Different payload'},requestKey)).json().error.code,'IDEMPOTENCY_CONFLICT');
 const [[stamp]]=await c.admin.query<RowDataPacket[]>('SELECT recorded_at,actor_id FROM individual_payment_transactions WHERE id=?',[(requested as {transactionId:string}).transactionId]);assert.equal(stamp.actor_id,actor.id);assert.ok(Math.abs(new Date(stamp.recorded_at).getTime()-Date.now())<60000);
 assert.equal((await command('staff',{...input('request',source),requestedAt:'2026-01-01'})).statusCode,422);
 let current=await detail(source.paymentId);assert.deepEqual(current.blockers,[]);
 const prepareBody=input('prepare',current),prepareKey=randomUUID();
 const races=await Promise.all([command('staff',prepareBody,prepareKey),command('staff',prepareBody)]);assert.equal(races.filter(r=>r.statusCode===200).length,1,races.map(r=>r.body).join('\n'));
 current=await detail(source.paymentId);assert.equal(current.status,'DV Prepared');
 // A retry uses the winning key, including when the other concurrent key won.
 const winner=races[0].statusCode===200?prepareKey:null;if(winner){const n=await counts();await ok(command('staff',prepareBody,winner));assert.deepEqual(await counts(),n);}
 const beforeDv=(await c.admin.query<RowDataPacket[]>('SELECT * FROM semester_entitlements ORDER BY id'))[0];
 const firstId=current.transactionId!,firstRef=current.internalReference;
 if(process.argv.includes('--settlement-browser')){
  for(const remaining of initial.items.slice(1)){const requested=(await ok(command('staff',input('request',remaining)))).json();const pending=await detail(remaining.paymentId);await ok(command('staff',{...input('prepare',pending),transactionId:requested.transactionId}));}
  console.log('P07 prepared browser fixture '+JSON.stringify({transactionId:firstId,paymentId:source.paymentId,sourceKind:'unclaimed',prepared:initial.items.length}));return;
 }
 if(process.argv.includes('--individual-settlement')){await mkdir((process.env.LDSS_P07_OUTPUT??'output/p07-settlement-20261022'),{recursive:true});await writeFile(`${process.env.LDSS_P07_OUTPUT??'output/p07-settlement-20261022'}/existing-p04-${c.total}.json`,JSON.stringify({total:c.total,runs},null,2));await (await import('./test-individual-settlement.js')).testIndividualSettlement({request:c.request,admin:c.admin,runtime:c.runtime,transactionId:firstId,sourceKind:'unclaimed',total:c.total});return;}
 if(process.argv.includes('--documents-browser')){console.log('P06 prepared browser fixture '+JSON.stringify({transactionId:firstId,paymentId:source.paymentId,sourceKind:'unclaimed'}));return;}
 if(process.argv.includes('--individual-documents'))await (await import('./test-individual-documents.js')).testIndividualDocuments({request:c.request,admin:c.admin,runtime:c.runtime,transactionId:firstId,sourceKind:'unclaimed'});
 await measure('request_cancellation',()=>service.command(String(actor.id),randomUUID(),input('request-cancellation',current,'Scholar asked to correct the internal request'),'p04-cancel'));
 current=await detail(source.paymentId);
 assert.equal((await command('staff',input('approve-cancellation',current,'Staff cannot approve cancellation'))).statusCode,403);
 await ok(command('coordinator',input('reject-cancellation',current,'The prepared request remains correct')));current=await detail(source.paymentId);assert.equal(current.status,'DV Prepared');
 await ok(command('staff',input('request-cancellation',current,'Supporting details need replacement')));current=await detail(source.paymentId);
 await measure('approve_cancellation',()=>service.command(String(coordinator.id),randomUUID(),input('approve-cancellation',current,'Reviewed the unpaid internal request'),'p04-cancel-approve'));current=await detail(source.paymentId);assert.equal(current.status,'Cancelled');
 if(process.argv.includes('--individual-documents'))assert.equal((await c.request('staff',`${base}/transactions/${firstId}/documents/DV/word`)).statusCode,409);
 await measure('replacement',()=>service.command(String(actor.id),randomUUID(),input('replace',current),'p04-replace'));current=await detail(source.paymentId);assert.equal(current.status,'DV Prepared');assert.notEqual(current.transactionId,firstId);assert.notEqual(current.internalReference,firstRef);
 assert.deepEqual((await c.admin.query<RowDataPacket[]>('SELECT * FROM semester_entitlements ORDER BY id'))[0],beforeDv);
 const [[links]]=await c.admin.query<RowDataPacket[]>('SELECT replacement_of,request_transaction_id FROM individual_payment_transactions WHERE id=?',[current.transactionId]);assert.equal(links.replacement_of,firstId);assert.equal(links.request_transaction_id,firstId);
 await assert.rejects(c.admin.execute('INSERT INTO entitlement_payment_routes(entitlement_id,transaction_id,event_transaction_id,event_revision) SELECT entitlement_id,transaction_id,event_transaction_id,event_revision FROM entitlement_payment_routes WHERE entitlement_id=?',[source.entitlementId]),e=>Boolean(e&&typeof e==='object'&&'code'in e&&e.code==='ER_DUP_ENTRY'));
 assert.equal((await command('staff',input('prepare',current))).statusCode,409);
 // P03 remains the only outcome-correction authority; an actual original Paid
 // confirmation atomically cancels the unpaid internal route, without reopening.
 const summary=async()=>(await ok(c.request('staff',payroll+'/reconciliation-summary'))).json<ReconciliationOverview>();
 const correct=async(outcome:'paid'|'unclaimed')=>{const o=await summary();return {action:'correct',expectedRevision:o.summary.revision,expectedReconciliationRevision:o.reconciliationRevision,sourceHash:o.sourceHash,paymentId:source.paymentId,outcome,actualPaidOn:outcome==='paid'?today():null,reason:'Coordinator reviewed the original signed payroll evidence',confirmed:true};};
 const paidInput=await correct('paid');
 await c.admin.query("CREATE TRIGGER p04_correction_fail BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payment.correction' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic original Paid cancellation rollback'; END IF; END");
 const beforeCorrection=await counts();try{assert.equal((await c.request('coordinator',payroll+'/reconciliation-commands',paidInput)).statusCode,500);}finally{await c.admin.query('DROP TRIGGER p04_correction_fail');}assert.deepEqual(await counts(),beforeCorrection);assert.equal((await detail(source.paymentId)).status,'DV Prepared');
 await ok(c.request('coordinator',payroll+'/reconciliation-commands',paidInput));assert.equal((await page(source.humanId)).total,0);
 const history=(await ok(c.request('staff',`${base}/entitlements/${source.entitlementId}/history?limit=100`))).json<{items:{action:string}[]}>();assert.ok(history.items.some(e=>e.action==='original_paid_cancelled'));assert.ok(history.items.some(e=>e.action==='cancelled'));assert.ok(history.items.some(e=>e.action==='cancel_rejected'));
 const cancelledHistory=await service.page(String(actor.id),{view:'cancelled',q:source.humanId,offset:0,limit:25});assert.equal(cancelledHistory.total,1);assert.equal(cancelledHistory.items[0].outcome,'Paid');assert.equal(cancelledHistory.items[0].status,'Cancelled');
 assert.equal((await counts()).r,0);
 await ok(c.request('coordinator',payroll+'/reconciliation-commands',await correct('unclaimed')));assert.equal((await page(source.humanId)).total,1);
 // Construct an existing compatibility queue from the real frozen synthetic
 // source, using the existing queue writer. Never relabel it as a DV.
 await new AuthorizationService(c.runtime).withPermission(String(coordinator.id),'ovr.finalize',async db=>{const roster=await effectiveRoster(db,c.batch);assert.ok(roster);await queueUnclaimed(db,roster.snapshot,(await paymentRecords(db,c.batch)).filter(p=>p.id===source.paymentId),String(coordinator.id));});
 const [[destination]]=await c.admin.query<RowDataPacket[]>(`SELECT b.id,e.revision FROM ovr_batches b JOIN ovr_batch_events e ON e.batch_id=b.id JOIN ovr_batches original ON original.cycle_id=b.cycle_id WHERE original.id=? AND b.id<>original.id AND e.state='draft' AND NOT EXISTS(SELECT 1 FROM ovr_batch_events n WHERE n.batch_id=e.batch_id AND n.revision>e.revision) ORDER BY b.created_at LIMIT 1`,[c.batch]);
 if(destination){
  const [[q]]=await c.admin.query<RowDataPacket[]>('SELECT id FROM payroll_reprocessing WHERE payment_id=?',[source.paymentId]);assert.ok(q);
  current=await detail(source.paymentId);
  const start=performance.now(),routeRace=await Promise.all([
   command('staff',input('replace',current)),
   c.request('coordinator',`/api/v1/ovr-batches/${destination.id}/assign-reprocessing`,{expectedRevision:Number(destination.revision),reprocessingId:q.id,expectedQueueRevision:0,reason:'Synthetic existing payroll route competes with DV preparation'}),
  ]);
  runs.push({name:'concurrent_payroll_vs_dv',ms:performance.now()-start,results:routeRace.map(r=>({status:r.statusCode,code:r.json().error?.code??'OK'}))});
  assert.equal(routeRace.filter(r=>r.statusCode===200).length,1,routeRace.map(r=>r.body).join('\n'));
  if(routeRace[0].statusCode===200){current=await detail(source.paymentId);await ok(command('staff',input('request-cancellation',current,'End synthetic concurrency test without a live DV')));current=await detail(source.paymentId);await ok(command('coordinator',input('approve-cancellation',current,'Reviewed unpaid concurrency test cleanup')));}
  else{
   const held=await detail(source.paymentId);assert.ok(held.blockers.some(b=>b.includes('reprocessing')));
   assert.equal((await command('staff',input('replace',held))).json().error.code,'INDIVIDUAL_BLOCKED');
   // Explicit withdrawal evidence ONLY in the disposable compatibility fixture;
   // P04 never implicitly transfers/cancels an office's existing assignment.
   await c.admin.execute("INSERT INTO payroll_reprocessing_events(id,reprocessing_id,revision,destination_batch_id,reason,actor_id,recorded_at) SELECT ?,?,MAX(revision)+1,NULL,'Synthetic reviewed withdrawal after concurrency assertion',?,UTC_TIMESTAMP(6) FROM payroll_reprocessing_events WHERE reprocessing_id=?",[randomUUID(),q.id,coordinator.id,q.id]);
  }
 }
 assert.deepEqual((await c.admin.query<RowDataPacket[]>('SELECT * FROM payment_records ORDER BY id'))[0],originalPayments);
 assert.equal((await c.admin.query<RowDataPacket[]>('SELECT snapshot_hash FROM ovr_finalizations WHERE batch_id=?',[c.batch]))[0][0].snapshot_hash,frozen.snapshot_hash);
 await assert.rejects(c.runtime.query('UPDATE individual_payment_events SET snapshot=snapshot WHERE 1=0'));await assert.rejects(c.runtime.query('DELETE FROM individual_payment_transactions WHERE 1=0'));await assert.rejects(c.runtime.query('DELETE FROM entitlement_payment_routes WHERE 1=0'));
 const [[role]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM user_roles WHERE user_id=? AND role_code='staff' AND revoked_at IS NULL LIMIT 1",[actor.id]);try{await c.admin.execute('UPDATE user_roles SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?',[role.id]);await assert.rejects(service.command(String(actor.id),requestKey,input('request',source),'revoked'),e=>Boolean(e&&typeof e==='object'&&'code'in e&&e.code==='PERMISSION_DENIED'));}finally{await c.admin.execute('UPDATE user_roles SET revoked_at=NULL WHERE id=?',[role.id]);}
 const memory=[];for(let i=0;i<20;i++){await service.page(String(actor.id),{q:'',limit:25,offset:0});global.gc?.();const p=(c.runtime as unknown as {pool:{_allConnections:{length:number};_freeConnections:{length:number};_connectionQueue:{length:number}}}).pool;assert.equal(p._allConnections.length,p._freeConnections.length);assert.equal(p._connectionQueue.length,0);memory.push({iteration:i+1,...process.memoryUsage(),connections:p._allConnections.length});}
 await mkdir((process.env.LDSS_P04_OUTPUT??'output/p04-unclaimed-20261022'),{recursive:true});await writeFile(`${process.env.LDSS_P04_OUTPUT??'output/p04-unclaimed-20261022'}/after-${c.total}.json`,JSON.stringify({total:c.total,conditions:'Disposable authorized existing payroll and entitlements; restricted runtime; warm buffers; fresh authorization/snapshot per call; SQL ms is client-observed roundtrip; sampled memory; no production writes',runs,memory,paymentRowsUnchanged:true,frozenHashUnchanged:true},null,2));
 console.log(`PASS P04 ${c.total}: queue, truthful expired request, server timestamp, Staff preparation, exact retry, concurrent one-winner, cancellation/replacement, Coordinator original Paid synchronization, audit rollback, entitlement/payment/frozen preservation and permissions`);
}
