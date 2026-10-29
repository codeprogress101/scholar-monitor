import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import type {Pool,RowDataPacket} from "mysql2/promise";
import type {LightMyRequestResponse} from "fastify";
import {AuthorizationService} from "../server/authorization/service.js";
import {PaymentRecordingService} from "../server/payments/recording-service.js";
import {OvrService} from "../server/ovr/service.js";
import {today} from "../server/scholars/validation.js";
import type {RecordingInput} from "../server/payments/recording-model.js";
import {assertPaymentFoundation} from "./test-payment-foundation.js";
import {testPayrollReconciliation} from "./test-payroll-reconciliation.js";

export async function testPaymentRecordingLarge(c:{runtime:Pool;root:Pool;request:(role:string,path:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;batch:string;total:number}) {
  const [[actor]]=await c.runtime.query<RowDataPacket[]>("SELECT u.id FROM users u JOIN user_roles r ON r.user_id=u.id WHERE r.role_code='staff' AND r.revoked_at IS NULL LIMIT 1");
  let selects=0,writes=0,dbMs=0;
  const pool=new Proxy(c.runtime,{get(t,p){if(p!=="getConnection"){const v=Reflect.get(t,p);return typeof v==="function"?v.bind(t):v;}return async()=>{const connection=await t.getConnection();return new Proxy(connection,{get(db,m){if(m!=="execute"&&m!=="query"){const v=Reflect.get(db,m);return typeof v==="function"?v.bind(db):v;}return async(sql:string,values?:unknown[])=>{const start=performance.now(),invoke=db[m].bind(db) as (s:string,v?:unknown[])=>Promise<unknown>;const result=await invoke(sql,values);dbMs+=performance.now()-start;if(/^\s*SELECT/i.test(sql))selects++;else if(/^\s*(INSERT|UPDATE|DELETE)/i.test(sql))writes++;return result;};}});};}});
  const service=new PaymentRecordingService(new AuthorizationService(pool)),runs:unknown[]=[];
  async function measure<T>(name:string,run:()=>Promise<T>):Promise<T>{global.gc?.();selects=0;writes=0;dbMs=0;const start=performance.now(),initial=process.memoryUsage();let peakRss=initial.rss,peakHeap=initial.heapUsed;
    const timer=setInterval(()=>{const m=process.memoryUsage();peakRss=Math.max(peakRss,m.rss);peakHeap=Math.max(peakHeap,m.heapUsed);},20);
    try{const value=await run();const after=process.memoryUsage();const row={name,total:c.total,ms:performance.now()-start,selects,writes,dbMs,bytes:Buffer.byteLength(JSON.stringify(value)),initial,after,peakRss:Math.max(peakRss,after.rss),peakHeap:Math.max(peakHeap,after.heapUsed)};runs.push(row);console.log("P02 measured",JSON.stringify(row));return value;}finally{clearInterval(timer);}}
  const base=`/api/v1/ovr-batches/${c.batch}`,ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body);return r;};
  const [[frozen]]=await c.root.execute<RowDataPacket[]>("SELECT snapshot_hash FROM ovr_finalizations WHERE batch_id=?",[c.batch]);
  if(process.argv.includes("--payment-recording-browser")) {
    const [[batch]]=await c.root.execute<RowDataPacket[]>("SELECT cycle_id FROM ovr_batches WHERE id=?",[c.batch]);
    console.log(`P02 browser fixture: #payouts?cycle=${batch.cycle_id}&batch=${c.batch}&view=recording (${c.total} pending)`);return;
  }
  for(let i=0;i<3;i++)await measure("existing_full_detail",()=>new OvrService(new AuthorizationService(pool)).read(String(actor.id),c.batch));
  for(let i=0;i<3;i++) {
    const summary=await measure("summary",()=>service.summary(String(actor.id),c.batch));assert.equal(summary.total,c.total);assert.equal(summary.pending,c.total);
    const page=await measure("roster_page",()=>service.page(String(actor.id),c.batch,{q:"",limit:25,offset:0}));assert.equal(page.items.length,25);
    await measure("search",()=>service.page(String(actor.id),c.batch,{q:page.items[0].humanId,limit:25,offset:0}));
    const next=await measure("next_page",()=>service.page(String(actor.id),c.batch,{q:"",limit:25,offset:25}));assert.equal(next.items.length,25);assert.ok(next.items.every(r=>!page.items.some(p=>p.scholarshipId===r.scholarshipId)));
  }
  const rows=await service.page(String(actor.id),c.batch,{q:"",limit:25,offset:0});
  const input:RecordingInput={mode:"selected",scholarshipIds:rows.items.slice(0,10).map(r=>r.scholarshipId),outcome:"unclaimed",actualPaidOn:null,reference:"P02 SYNTHETIC RECEIPTS",reason:"Synthetic payroll outcomes confirmed by Staff"};
  const unclaimed=await measure("preview_10_unclaimed",()=>service.preview(String(actor.id),c.batch,input));assert.equal(unclaimed.conflicts.length,0,JSON.stringify(unclaimed.conflicts));
  const unclaimedBody={input,basis:unclaimed.basis,acceptedIds:unclaimed.acceptedIds,reviewed:true,receiptConfirmed:false};
  const ledgerCounts=async()=>{const [[row]]=await c.root.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM payment_records) AS payments,(SELECT COUNT(*) FROM ovr_batch_events) AS events,(SELECT COUNT(*) FROM semester_entitlement_events) AS entitlements,(SELECT COUNT(*) FROM ovr_commands) AS commands");return {...row};};
  const originalLedger=await ledgerCounts();
  await c.root.query("CREATE TRIGGER p02_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payment.recording' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic P02 parent audit failure after all child writes'; END IF; END");
  try{assert.equal((await c.request("staff",base+"/payment-operations",unclaimedBody)).statusCode,500);}finally{await c.root.query("DROP TRIGGER p02_fail_audit");}
  assert.equal((await service.summary(String(actor.id),c.batch)).pending,c.total,"Audit failure must roll back the entire accepted set");
  assert.deepEqual(await ledgerCounts(),originalLedger,"Parent audit failure rolls back every child and the operation journal");
  const key=randomUUID(),unclaimedResult=await measure("commit_10_unclaimed",()=>service.commit(String(actor.id),c.batch,key,unclaimedBody,"synthetic-unclaimed"));
  assert.equal((unclaimedResult as {recorded:number}).recorded,10);
  const paidInput:RecordingInput={...input,mode:"all_remaining_paid",scholarshipIds:[],outcome:"paid",actualPaidOn:today()};
  const paid=await measure("preview_all_remaining",()=>service.preview(String(actor.id),c.batch,paidInput));
  assert.equal(paid.count,c.total-10,JSON.stringify(paid.conflicts));assert.equal(paid.conflicts.length,0,JSON.stringify(paid.conflicts));
  const body={input:paidInput,basis:paid.basis,acceptedIds:paid.acceptedIds,reviewed:true,receiptConfirmed:true},paidKey=randomUUID();
  const result=await measure("commit_all_remaining",()=>service.commit(String(actor.id),c.batch,paidKey,body,"synthetic-paid"));
  // Ignore the initial response and retry the identical payload/key: one committed set.
  assert.deepEqual(await service.commit(String(actor.id),c.batch,paidKey,body,"synthetic-lost-response-retry"),result);
  const summary=await measure("refresh_summary",()=>service.summary(String(actor.id),c.batch));
  assert.equal(summary.paid,c.total-10);assert.equal(summary.unclaimed,10);assert.equal(summary.pending,0);assert.equal(summary.needsReview,0);
  assert.equal(summary.paidAmount,`${(c.total-10)*5000}.00`);assert.equal(summary.unclaimedAmount,"50000.00");
  {
  const full=await new OvrService(new AuthorizationService(pool)).read(String(actor.id),c.batch);
  assertPaymentFoundation(full);assert.equal(full.reconciliation.paid,summary.paid);assert.equal(full.reconciliation.unclaimed,summary.unclaimed);assert.equal(full.reconciliation.paidTotal,summary.paidAmount);assert.equal(full.reconciliation.complete,true);
  }
  if(process.argv.includes('--individual-settlement')){await mkdir((process.env.LDSS_P07_OUTPUT??'output/p07-settlement-20261022'),{recursive:true});await writeFile(`${process.env.LDSS_P07_OUTPUT??'output/p07-settlement-20261022'}/existing-p02-${c.total}.json`,JSON.stringify({total:c.total,runs,summary},null,2));}
  if(process.argv.includes('--individual-payments'))await (await import('./test-individual-payments.js')).testIndividualPayments({runtime:c.runtime,admin:c.root,request:c.request,batch:c.batch,total:c.total});
  if(process.argv.includes('--individual-settlement'))return;
  if(process.argv.includes("--payroll-reconciliation")){await testPayrollReconciliation({runtime:c.runtime,admin:c.root,request:c.request,batch:c.batch,total:c.total});return;}
  const stability=[];
  for(let i=0;i<20;i++) {
    await service.summary(String(actor.id),c.batch);await service.page(String(actor.id),c.batch,{q:"",limit:25,offset:(i%2)*25});global.gc?.();
    const inner=(c.runtime as unknown as {pool:{_allConnections:{length:number};_freeConnections:{length:number};_connectionQueue:{length:number}}}).pool;
    const state={iteration:i+1,...process.memoryUsage(),poolConnections:inner._allConnections.length,poolFree:inner._freeConnections.length,poolQueue:inner._connectionQueue.length};
    assert.equal(state.poolQueue,0);assert.equal(state.poolConnections,state.poolFree);stability.push(state);
  }
  const [[counts]]=await c.root.execute<RowDataPacket[]>("SELECT COUNT(*) AS n,COUNT(DISTINCT batch_revision) AS revisions,SUM(outcome='paid') AS paid,SUM(outcome='not_paid' AND effective_on IS NULL) AS unclaimed FROM payment_records WHERE batch_id=?",[c.batch]);
  assert.equal(Number(counts.n),c.total);assert.equal(Number(counts.revisions),c.total);assert.equal(Number(counts.paid),c.total-10);assert.equal(Number(counts.unclaimed),10);
  const [[same]]=await c.root.execute<RowDataPacket[]>("SELECT snapshot_hash FROM ovr_finalizations WHERE batch_id=?",[c.batch]);assert.equal(same.snapshot_hash,frozen.snapshot_hash);
  const [[compact]]=await c.root.execute<RowDataPacket[]>("SELECT COUNT(*) AS n,MAX(OCTET_LENGTH(snapshot)) AS max_bytes FROM ovr_batch_events WHERE batch_id=? AND JSON_UNQUOTE(JSON_EXTRACT(snapshot,'$.processingEvidence.version'))='payment-processing/v1'",[c.batch]);assert.equal(Number(compact.n),c.total);assert.ok(Number(compact.max_bytes)<12000);
  await ok(c.request("staff",base+"/payment-roster?q=ReceiptVolume&limit=25"));
  await mkdir((process.env.LDSS_P02_OUTPUT??'output/p02-payment-recording-20261022'),{recursive:true});await writeFile(`${process.env.LDSS_P02_OUTPUT??'output/p02-payment-recording-20261022'}/large-${c.total}.json`,JSON.stringify({conditions:"Synthetic authorized import, prior approval, masterlist, finalization and entitlements; restricted runtime grants; warm buffers; fresh authorization each operation. DB ms is client-observed SQL roundtrip, not MariaDB CPU. 20ms sampled peaks; explicit GC before measured runs and after stability reads when --expose-gc is supplied. No comparable old bulk command exists.",explicitGc:typeof global.gc==="function",runs,stability,summary,counts,compact,frozenHashUnchanged:true},null,2));
  console.log(`PASS P02 ${c.total}/10/${c.total-10}: atomic audit rollback, compact unique child revisions, exact lost-response retry, immutable roster and authoritative totals`);
}
