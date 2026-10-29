import {describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import type {PoolConnection} from "mysql2/promise";
import {reconciliationCommand,recordingComplete} from "../server/payments/reconciliation-model";
import {paymentRecords} from "../server/ovr/processing-state";
import {reconcilePayments} from "../server/ovr/processing-state";
import type {OvrFinalization} from "../server/ovr/model";
import type {RecordingSummary} from "../server/payments/recording-model";
import {verifiedEvent} from "../server/payments/reconciliation-reads";
import {digest} from "../server/auth/crypto";
import type {RowDataPacket} from "mysql2/promise";

const common={expectedRevision:4,expectedReconciliationRevision:0},sourceHash="a".repeat(64),id=randomUUID();
describe("P03 explicit reviewed financial contracts",()=>{
 it("does not infer returned-document receipt or permit edited attribution",()=>{
  const body={...common,action:"verify",sourceHash,returnedAndCompared:true};
  expect(reconciliationCommand.safeParse(body).success).toBe(true);
  for(const delta of [{returnedAndCompared:false},{returnedAndCompared:undefined},{recordedAt:"2020-01-01"},{actorId:id},{sourceHash:"bad"}])expect(reconciliationCommand.safeParse({...body,...delta}).success).toBe(false);
 });
 it("requires a report, reasoned resolution and narrowly scoped Coordinator correction",()=>{
  expect(reconciliationCommand.safeParse({...common,action:"report",scholarshipId:id,description:"Signed evidence differs"}).success).toBe(true);
  expect(reconciliationCommand.safeParse({...common,action:"dismiss",caseId:id,reason:""}).success).toBe(false);
  const correction={...common,action:"correct",sourceHash,paymentId:id,outcome:"paid",actualPaidOn:"2026-10-06",reason:"Signed receipt reviewed",confirmed:true};
  expect(reconciliationCommand.safeParse(correction).success).toBe(true);
  for(const delta of [{amount:"1.00"},{outcome:"withheld"},{confirmed:false},{actualPaidOn:null},{actualPaidOn:"2999-01-01"}])expect(reconciliationCommand.safeParse({...correction,...delta}).success).toBe(false);
  expect(reconciliationCommand.safeParse({...correction,outcome:"unclaimed",actualPaidOn:null}).success).toBe(true);
  expect(reconciliationCommand.safeParse({...correction,outcome:"unclaimed"}).success).toBe(false);
 });
 it("requires explicit closure review and a nonempty verification-only override reason",()=>{
  const close={...common,action:"close",sourceHash,effectiveOn:"2026-10-22",reviewed:true};
  expect(reconciliationCommand.safeParse(close).success).toBe(true);
  expect(reconciliationCommand.safeParse({...close,overrideReason:"Reviewed office exception"}).success).toBe(true);
  expect(reconciliationCommand.safeParse({...close,overrideReason:""}).success).toBe(false);
  expect(reconciliationCommand.safeParse({...close,reviewed:false}).success).toBe(false);
 });
 it("distinguishes completion from legacy all-outcomes-recorded semantics",()=>{
  const s={total:835,paid:825,unclaimed:10,pending:0,needsReview:0,totalAmount:"4175000.00",paidAmount:"4125000.00",unclaimedAmount:"50000.00"} as RecordingSummary;
  expect(recordingComplete(s)).toBe(true);
  for(const delta of [{pending:1},{needsReview:1},{paid:824},{totalAmount:"4175000.01"},{total:0}])expect(recordingComplete({...s,...delta})).toBe(false);
 });
 it("detects changed immutable event content",()=>{
  const event={id,kind:"verified",actorId:"original"},snapshot=JSON.stringify(event),row={snapshot,snapshot_hash:digest(snapshot)} as RowDataPacket;
  expect(verifiedEvent(row)).toEqual(event);
  expect(()=>verifiedEvent({...row,snapshot:JSON.stringify({...event,actorId:"other"})})).toThrow(/could not be verified/);
 });
});
describe("P03 bounded classification reads preserve pre-P03 outcomes",()=>{
 it.each([0,1,25,100,835])("matches the original reader for %i payments, corrections and classification precedence",async n=>{
  const original=Array.from({length:n},(_,i)=>({id:`p-${i}`,batch_id:"batch",batch_revision:i+1,cycle_id:"cycle",scholarship_id:`s-${i}`,outcome:i%3===0?"paid":"not_paid",unpaid_reason:i%2?"did_not_claim":"review",amount:i%3===0?"5000.00":"0.00",day:i%3===0?"2026-10-06":null,reference_text:"Signed original",remarks:"Original remarks",actor_id:"staff",actor_name:"Staff",recorded:"2026-10-22T00:00:00.000000Z"}));
  const classes=original.filter((_,i)=>i%2===0).map((r,i)=>({payment_id:r.id,unpaid_reason:i%2?"withheld":"did_not_claim",recorded_at:new Date(i%3===0?"2026-10-21T23:00:00Z":"2026-10-22T00:00:01Z")}));
  let reads=0;
  const db={execute:async(sql:string,values:unknown[])=>{reads++;if(sql.includes("FROM payment_records p"))return [original.map(r=>({...r}))];if(sql.includes("FROM payment_corrections"))return [[]];if(sql.includes("FROM payroll_unpaid_classifications c"))return [classes.filter(r=>values.includes(r.payment_id))];throw new Error(sql);}} as unknown as PoolConnection;
  const actual=await paymentRecords(db,"batch"),expected=original.map(r=>{
   const c=classes.find(c=>c.payment_id===r.id);
   return {treasuryEvidenceRevision:undefined,confirmedAt:undefined,id:r.id,batchId:r.batch_id,revision:r.batch_revision,cycleId:r.cycle_id,scholarshipId:r.scholarship_id,outcome:r.outcome,unpaidReason:r.outcome==="not_paid"?(c&&new Date(c.recorded_at).getTime()>=new Date(r.recorded).getTime()?c.unpaid_reason:r.unpaid_reason??null):null,amount:r.amount,effectiveOn:r.day,reference:r.reference_text,remarks:r.remarks,actorId:r.actor_id,actorName:r.actor_name,recordedAt:r.recorded};
  });
  expect(actual).toEqual(expected);
  expect(reads).toBe(2+Math.ceil(n/200));
  const frozen={entries:expected.map(p=>({scholarshipId:p.scholarshipId}))} as OvrFinalization;
  expect(reconcilePayments(frozen,actual)).toEqual(reconcilePayments(frozen,expected as typeof actual));
  reads=0;const raw=await paymentRecords(db,"batch",true);expect(reads).toBe(1);expect(raw.every(p=>p.unpaidReason===(p.outcome==="not_paid"?original.find(r=>r.id===p.id)!.unpaid_reason:null))).toBe(true);
 });
});
