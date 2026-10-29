import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import type { Pool,Connection,RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { AuthorizationService } from "../server/authorization/service.js";
import { OvrService } from "../server/ovr/service.js";
import { randomUUID } from "node:crypto";
import { today } from "../server/scholars/validation.js";
import type { RecordingPreview,RecordingSummary } from "../server/payments/recording-model.js";
import type { RecordingRow } from "../server/payments/recording-model.js";
import { PaymentRecordingService } from "../server/payments/recording-service.js";
import { testPayrollReconciliation,verifyReturnedPayroll } from "./test-payroll-reconciliation.js";

export async function testPaymentRecording(c: {runtime: Pool; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>; batch: string;admin:Connection;semester:string}) {
  const [[actor]] = await c.runtime.query<import("mysql2/promise").RowDataPacket[]>("SELECT u.id FROM users u JOIN user_roles r ON r.user_id=u.id WHERE r.role_code='staff' AND r.revoked_at IS NULL LIMIT 1");
  let selects = 0, dbMs = 0;
  const measured = new Proxy(c.runtime, {get(pool, prop) {
    if(prop !== "getConnection") {const value=Reflect.get(pool,prop);return typeof value === "function" ? value.bind(pool) : value;}
    return async () => {const connection=await pool.getConnection();return new Proxy(connection,{get(target,method) {
      if(method !== "execute" && method !== "query") {const value=Reflect.get(target,method);return typeof value === "function" ? value.bind(target) : value;}
      return async (sql:string, values?:unknown[]) => {const start=performance.now();const invoke=target[method].bind(target) as (sql:string,values?:unknown[])=>Promise<unknown>;const result=await invoke(sql,values);if(/^\s*SELECT/i.test(sql)){selects++;dbMs+=performance.now()-start;}return result;};
    }});};
  }});
  const runs=[];
  for(let i=0;i<3;i++) {
    selects=0;dbMs=0;const memory=process.memoryUsage(),start=performance.now();
    const value=await new OvrService(new AuthorizationService(measured)).read(String(actor.id),c.batch);
    assert.equal(value.payments.length,0);
    runs.push({ms:performance.now()-start,selects,dbMs,bytes:Buffer.byteLength(JSON.stringify(value)),before:memory,after:process.memoryUsage(),members:value.finalization?.snapshot.entries.length});
  }
  await mkdir((process.env.LDSS_P02_OUTPUT??'output/p02-payment-recording-20261022'),{recursive:true});
  await writeFile(`${process.env.LDSS_P02_OUTPUT??'output/p02-payment-recording-20261022'}/baseline.json`,JSON.stringify({conditions:"Synthetic processed 2-member managed payroll; warm DB buffers; fresh authorized service snapshot each run; DB time is SELECT roundtrip, not server CPU",runs},null,2));
  console.log("PASS P02 existing full-detail baseline recorded");
  if(process.argv.includes("--p02-baseline"))return;
  const path=`/api/v1/ovr-batches/${c.batch}`;
  const service=new PaymentRecordingService(new AuthorizationService(measured)),light=[];
  for(let i=0;i<3;i++)for(const kind of ["summary","page","search"] as const) {
    selects=0;dbMs=0;const initial=process.memoryUsage(),start=performance.now();
    const value=kind==="summary"?await service.summary(String(actor.id),c.batch):await service.page(String(actor.id),c.batch,{q:kind==="search"?"Alexandra":"",limit:25,offset:0});
    light.push({kind,ms:performance.now()-start,selects,dbMs,bytes:Buffer.byteLength(JSON.stringify(value)),initial,after:process.memoryUsage()});
  }
  await writeFile(`${process.env.LDSS_P02_OUTPUT??'output/p02-payment-recording-20261022'}/after-2.json`,JSON.stringify({runs:light},null,2));
  const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body);return r;};
  const summary=async()=>(await ok(c.request("staff",path+"/payment-summary"))).json<RecordingSummary>();
  assert.equal((await summary()).pending,2);
  if(process.argv.includes('--financial-reports'))await (await import('./test-financial-reports.js')).testFinancialReports({runtime:c.runtime,admin:c.admin,request:c.request,batch:c.batch,total:2},'pending');
  const page=(await ok(c.request("staff",path+"/payment-roster?limit=1"))).json<{items:RecordingRow[];total:number}>();
  assert.equal(page.items.length,1);assert.equal(page.total,2);
  assert.equal((await c.request("system_admin",path+"/payment-summary")).statusCode,403);
  const previewInput={mode:"all_remaining_paid",scholarshipIds:[],outcome:"paid",actualPaidOn:today(),reference:"SYNTHETIC-P02",reason:"Synthetic acknowledged payroll receipts"};
  let original=(await ok(c.request("staff",path+"/payment-operations/preview",previewInput))).json<RecordingPreview>();
  assert.equal(original.count,2,JSON.stringify(original));assert.equal(original.conflicts.length,0);
  let full=(await ok(c.request("staff",path))).json();
  const holdBody=(detail:typeof full)=>({expectedRevision:detail.batch.revision,scholarshipId:page.items[0].scholarshipId,sourceHash:detail.releases.find((r:{scholarshipId:string})=>r.scholarshipId===page.items[0].scholarshipId).sourceHash,effectiveOn:today(),reason:"Synthetic current payment hold",reference:"P02-HOLD"});
  await ok(c.request("coordinator",path+"/hold",holdBody(full)));
  const held=(await ok(c.request("staff",path+"/payment-operations/preview",previewInput))).json<RecordingPreview>();assert.equal(held.count,1);assert.equal(held.conflicts.length,1);
  assert.equal((await c.request("staff",path+"/payment-operations",{input:previewInput,basis:held.basis,acceptedIds:held.acceptedIds,reviewed:true,receiptConfirmed:true})).statusCode,409,"Cannot silently skip the held scholar");
  const accepted=(await ok(c.request("staff",path+"/payment-operations/preview",{...previewInput,mode:"selected",scholarshipIds:held.acceptedIds}))).json<RecordingPreview>();assert.equal(accepted.conflicts.length,0);assert.equal(accepted.count,1);
  full=(await ok(c.request("staff",path))).json();await ok(c.request("coordinator",path+"/release-hold",holdBody(full)));
  original=(await ok(c.request("staff",path+"/payment-operations/preview",previewInput))).json<RecordingPreview>();assert.equal(original.count,2);
  const outside=(await ok(c.request("staff",path+"/payment-operations/preview",{...previewInput,mode:"selected",scholarshipIds:[randomUUID()]}))).json<RecordingPreview>();assert.equal(outside.count,0);assert.equal(outside.conflicts.length,1);
  const unclaimedInput={...previewInput,mode:"selected",scholarshipIds:[page.items[0].scholarshipId],outcome:"unclaimed",actualPaidOn:null};
  const unclaimed=(await ok(c.request("staff",path+"/payment-operations/preview",unclaimedInput))).json<RecordingPreview>();
  const body={input:unclaimedInput,basis:unclaimed.basis,acceptedIds:unclaimed.acceptedIds,reviewed:true,receiptConfirmed:false},key=randomUUID();
  const saved=await ok(c.request("staff",path+"/payment-operations",body,key));
  assert.equal(saved.json().summary.unclaimed,1);assert.equal(saved.json().summary.pending,1);
  assert.deepEqual((await ok(c.request("staff",path+"/payment-operations",body,key))).json(),saved.json());
  assert.deepEqual((await ok(c.request("staff",`/api/v1/payment-operations/${key}`))).json(),saved.json());
  assert.equal((await c.request("staff",path+"/payment-operations",{...body,receiptConfirmed:true},key)).statusCode,409);
  const stale=await c.request("staff",path+"/payment-operations",{input:previewInput,basis:original.basis,acceptedIds:original.acceptedIds,reviewed:true,receiptConfirmed:true});
  assert.equal(stale.statusCode,409,stale.body);
  assert.equal((await summary()).paid,0);
  const paid=(await ok(c.request("staff",path+"/payment-operations/preview",previewInput))).json<RecordingPreview>();
  assert.equal(paid.count,1);assert.equal(paid.amount,"5000.00");
  const paidBody={input:previewInput,basis:paid.basis,acceptedIds:paid.acceptedIds,reviewed:true,receiptConfirmed:true};
  const race=await Promise.all([c.request("staff",path+"/payment-operations",paidBody),c.request("staff",path+"/payment-operations",paidBody)]);
  assert.equal(race.filter(r=>r.statusCode===200).length,1,race.map(r=>r.body).join("\n"));
  const final=await summary();assert.equal(final.paid,1);assert.equal(final.unclaimed,1);assert.equal(final.pending,0);assert.equal(final.paidAmount,"5000.00");assert.equal(final.unclaimedAmount,"5000.00");
  full=(await ok(c.request("staff",path))).json();assert.equal(full.payments.length,2);assert.equal(full.payments.find((p:{outcome:string})=>p.outcome==="not_paid").effectiveOn,null);
  const unclaimedRecord=full.payments.find((p:{outcome:string})=>p.outcome==="not_paid");
  for(const unpaidReason of ["withheld","review","did_not_claim"]) {
    await ok(c.request("coordinator",path+"/classify-unpaid",{expectedRevision:(await summary()).revision,paymentId:unclaimedRecord.id,unpaidReason,reason:"Synthetic unpaid classification compatibility"}));
    const projected=await summary();assert.equal(projected.needsReview,unpaidReason==="did_not_claim"?0:1);assert.equal(projected.unclaimed,unpaidReason==="did_not_claim"?1:0);
    const again=(await ok(c.request("staff",path+"/payment-operations/preview",previewInput))).json<RecordingPreview>();assert.equal(again.count,0,"Mark All Remaining must never overwrite a recorded outcome");
  }
  full=(await ok(c.request("staff",path))).json();
  let paidRecord=full.payments.find((p:{outcome:string})=>p.outcome==="paid");
  const proof={expectedRevision:full.batch.revision,paymentId:paidRecord.id,outcome:"paid",amount:paidRecord.amount,effectiveOn:paidRecord.effectiveOn,
    remarks:"Synthetic retained receipt provenance",reason:"Record supported prior receipt provenance",reference:"P02-RECEIPT-PROOF",priorReceiptConfirmed:true,priorReceiptEvidence:"Synthetic signed receipt held with the approved payroll"};
  await ok(c.request("staff",path+"/payment-corrections/request",proof));
  full=(await ok(c.request("staff",path))).json();
  await ok(c.request("coordinator",path+"/payment-corrections/approve",{expectedRevision:full.batch.revision,correctionId:full.paymentCorrections.find((p:{state:string})=>p.state==="pending").id,reason:"Synthetic receipt provenance independently checked",reference:"P02-PROOF-APPROVED"}));
  full=(await ok(c.request("staff",path))).json();paidRecord=full.payments.find((p:{outcome:string})=>p.outcome==="paid");assert.equal(paidRecord.priorReceiptConfirmed,true);
  const yesterday=new Date(Date.parse(today()+"T00:00:00Z")-86400000).toISOString().slice(0,10);
  const dateBody={expectedRevision:full.batch.revision,paymentId:paidRecord.id,effectiveOn:yesterday,reason:"Correct actual date from acknowledged evidence",reference:"DATE-CORRECTION"},dateKey=randomUUID();
  await ok(c.request("staff",path+"/payment-corrections/date-only",dateBody,dateKey));
  await ok(c.request("staff",path+"/payment-corrections/date-only",dateBody,dateKey));
  full=(await ok(c.request("staff",path))).json();
  assert.equal(full.payments.find((p:{id:string})=>p.id===paidRecord.id).effectiveOn,yesterday);
  assert.equal(full.originalPayments.find((p:{id:string})=>p.id===paidRecord.id).effectiveOn,today());
  assert.equal(full.payments.find((p:{id:string})=>p.id===paidRecord.id).amount,"5000.00");
  assert.equal(full.payments.find((p:{id:string})=>p.id===paidRecord.id).reference,paidRecord.reference);
  assert.equal(full.payments.find((p:{id:string})=>p.id===paidRecord.id).priorReceiptConfirmed,true);
  assert.equal(full.payments.find((p:{id:string})=>p.id===paidRecord.id).priorReceiptEvidence,paidRecord.priorReceiptEvidence);
  const [[period]]=await c.admin.execute<RowDataPacket[]>("SELECT DATE_FORMAT(ends_on,'%Y-%m-%d') AS ends FROM semesters WHERE id=?",[c.semester]);
  try {
    await c.admin.execute("UPDATE semesters SET ends_on=? WHERE id=?",[yesterday,c.semester]);
    assert.equal((await c.request("staff",path+"/payment-corrections/date-only",{...dateBody,expectedRevision:full.batch.revision,effectiveOn:today()})).statusCode,423);
    assert.equal((await c.request("staff",path+"/payment-operations/preview",previewInput)).statusCode,423);
  }finally{await c.admin.execute("UPDATE semesters SET ends_on=? WHERE id=?",[period.ends,c.semester]);}
  if(process.argv.includes('--individual-payments'))await (await import('./test-individual-payments.js')).testIndividualPayments({...c,total:2});
  if(process.argv.includes('--individual-settlement'))return; // P07 owns its changed synthetic financial scenario; ordinary P02 still runs separately.
  if(process.argv.includes('--omitted-upgrade'))await (await import('./test-omission-upgrade.js')).testOmissionPopulatedUpgrade(c.admin);
  if(process.argv.includes("--payroll-reconciliation")){await testPayrollReconciliation({...c,total:2});return;}
  await verifyReturnedPayroll(c.request,c.batch);
  await ok(c.request("coordinator",path+"/close",{expectedRevision:(await summary()).revision,effectiveOn:today(),reason:"Synthetic existing closure compatibility",reference:"P02-CLOSE",reconciled:true}));
  assert.equal((await c.request("staff",path+"/payment-corrections/date-only",{...dateBody,expectedRevision:(await summary()).revision,effectiveOn:today()})).statusCode,423);
  assert.deepEqual((await ok(c.request("staff",path+"/payment-operations",body,key))).json(),saved.json(),"Completed retry survives closure");
  console.log("PASS P02 bounded roster, pure Admin denial, pre-return acknowledged Paid, Unclaimed without dates, stale review, exact retry/recovery, changed-key conflict, concurrent one-winner and complete-detail compatibility");
}
