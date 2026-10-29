import {describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {recordingInput,recordingCommit,centsText} from "../server/payments/recording-model";
import {compactPaymentEvent,hydratePaymentEvents} from "../server/payments/processing-evidence";
import {parsePaymentCorrection} from "../server/ovr/payment-correction-service";
import {validateManagedOutcome,type ReleaseEntry} from "../server/ovr/managed-release";
import type {OvrBatch,OvrValidation} from "../server/ovr/model";
import {encodeStoredJson,decodeStoredJson} from "../server/stored-json";
import {checkNoPaidClaim,type semesterClaim} from "../server/ovr/reprocessing";

const selected=[randomUUID(),randomUUID()],input={mode:"selected",scholarshipIds:selected,outcome:"paid",actualPaidOn:"2026-10-06",reference:"SYNTHETIC",reason:"Actual receipts checked"};
const batch={id:randomUUID(),cycleId:randomUUID(),code:"PAY-001",name:"Synthetic",revision:3,state:"processed",action:"mark-processed",actorName:"Synthetic",recordedAt:"2026-10-22T01:00:00Z",reason:"Synthetic reason",reference:"TEST",validation:{valid:true,checkedAt:"2026-10-22T01:00:00Z",entries:[],issues:[]}} satisfies OvrBatch;
describe("P02 strict reviewed payment contracts",()=>{
  it("requires an exact selected set and cannot accept an amount from Staff",()=>{
    expect(recordingInput.safeParse(input).success).toBe(true);
    expect(recordingInput.safeParse({...input,amount:"1.00"}).success).toBe(false);
    expect(recordingInput.safeParse({...input,scholarshipIds:[selected[0],selected[0]]}).success).toBe(false);
    expect(recordingInput.safeParse({...input,scholarshipIds:[]}).success).toBe(false);
    expect(recordingInput.safeParse({...input,scholarshipIds:Array.from({length:1201},()=>randomUUID())}).success).toBe(false);
  });
  it("all remaining is server-derived and Paid only",()=>{
    expect(recordingInput.safeParse({...input,mode:"all_remaining_paid",scholarshipIds:[]}).success).toBe(true);
    expect(recordingInput.safeParse({...input,mode:"all_remaining_paid"}).success).toBe(false);
    expect(recordingInput.safeParse({...input,mode:"all_remaining_paid",scholarshipIds:[],outcome:"unclaimed",actualPaidOn:null}).success).toBe(false);
  });
  it("keeps Unclaimed without an invented payment date",()=>{
    expect(recordingInput.safeParse({...input,outcome:"unclaimed",actualPaidOn:null}).success).toBe(true);
    expect(recordingInput.safeParse({...input,outcome:"unclaimed"}).success).toBe(false);
    expect(recordingInput.safeParse({...input,actualPaidOn:null}).success).toBe(false);
    expect(recordingInput.safeParse({...input,actualPaidOn:"2999-01-01"}).success).toBe(false);
  });
  it("requires initially explicit receipt and review confirmations",()=>{
    const body={input,basis:"a".repeat(64),acceptedIds:selected,reviewed:true,receiptConfirmed:true};
    expect(recordingCommit.safeParse(body).success).toBe(true);
    for(const extra of [{reviewed:false},{receiptConfirmed:false},{acceptedIds:[]},{acceptedIds:[selected[0],selected[0]]},{basis:"short"}])expect(recordingCommit.safeParse({...body,...extra}).success).toBe(false);
  });
  it("date-only corrections cannot carry outcome, amount, eligibility or identity changes",()=>{
    const data={expectedRevision:5,paymentId:randomUUID(),effectiveOn:"2026-10-06",reason:"Actual date corrected from signed evidence",reference:"TEST"};
    expect(parsePaymentCorrection("date-only",data)).toEqual(data);
    for(const field of ["outcome","amount","scholarshipId","treasuryEvidenceRevision"])expect(()=>parsePaymentCorrection("date-only",{...data,[field]:"override"})).toThrow();
    expect(()=>parsePaymentCorrection("date-only",{...data,reason:""})).toThrow();
  });
  it("retains the existing current release restrictions",()=>{
    const release:ReleaseEntry={held:false,reasons:[],scholarshipId:randomUUID(),entitlementId:randomUUID(),state:"approved_for_release",sourceHash:"a".repeat(64),history:[]};
    expect(()=>validateManagedOutcome(release,"paid","5000.00")).not.toThrow();
    expect(()=>validateManagedOutcome({...release,held:true},"paid","5000.00")).toThrow();
    expect(()=>validateManagedOutcome({...release,reasons:["Missing COR"]},"paid","5000.00")).toThrow();
    expect(()=>validateManagedOutcome(release,"paid","2500.00")).toThrow();
    expect(()=>validateManagedOutcome({...release,held:true},"not_paid","0.00")).not.toThrow();
  });
  it("retains paid-claim, pending-correction and historical-receipt guards with bulk sources",()=>{
    const empty:Awaited<ReturnType<typeof semesterClaim>>={attempts:[],paid:null,pending:[]};
    expect(()=>checkNoPaidClaim(empty,[])).not.toThrow();
    expect(()=>checkNoPaidClaim(empty,["historical"])).toThrow(/historical receipt/);
    expect(()=>checkNoPaidClaim(empty,["historical"],undefined,"historical")).not.toThrow();
    const paid={id:"paid",outcome:"paid"} as unknown as typeof empty.attempts[number];
    expect(()=>checkNoPaidClaim({...empty,attempts:[paid]},[])).toThrow(/already paid/);
    expect(()=>checkNoPaidClaim({...empty,attempts:[paid]},[],"paid")).not.toThrow();
    const pending={paymentId:"pending"} as typeof empty.pending[number];
    expect(()=>checkNoPaidClaim({...empty,pending:[pending]},[])).toThrow(/payment correction/);
    expect(()=>checkNoPaidClaim({...empty,pending:[pending]},[],"pending")).not.toThrow();
  });
});
describe("P02 compact immutable processing events",()=>{
  it.each([1,19,20,25,100,835,1200])("keeps %i child revisions without multiplying validation graphs",count=>{
    // This encoder treats validation as opaque immutable JSON, not eligibility.
    const base={...batch,validation:{...batch.validation,entries:Array.from({length:count},(_,i)=>({scholarshipId:`synthetic-${i}`,evidence:{fingerprint:"test"},issues:[]}))} as unknown as OvrValidation};
    const original=structuredClone(base);
    const children=Array.from({length:count},(_,i)=>compactPaymentEvent({...base,revision:base.revision+i+1,action:"record-payment"},base)).reverse();
    const decoded=children.map(b=>decodeStoredJson<OvrBatch>(encodeStoredJson(b)));
    const history=hydratePaymentEvents([...decoded,base]);
    expect(history[0].validation).toEqual(base.validation);
    expect(history.slice(1,-1).every(b=>b.validation===undefined)).toBe(true);
    expect(children.every(b=>Buffer.byteLength(JSON.stringify(b))<1500)).toBe(true);
    expect(new Set(children.map(b=>b.revision)).size).toBe(count);
    expect(base).toEqual(original);
  });
  it("rejects missing, forward, tampered and unsupported evidence",()=>{
    const child=compactPaymentEvent({...batch,revision:4},batch);
    expect(()=>hydratePaymentEvents([child])).toThrow();
    expect(()=>hydratePaymentEvents([child,{...batch,validation:{...batch.validation,valid:false}}])).toThrow();
    expect(()=>hydratePaymentEvents([{...child,revision:2},batch])).toThrow();
    expect(hydratePaymentEvents([batch])).toEqual([batch]);
  });
  it("reuses the original base for the next bulk operation",()=>{
    const first=compactPaymentEvent({...batch,revision:4},batch);
    const second=compactPaymentEvent({...first,revision:5,validation:batch.validation},first);
    expect(second.processingEvidence).toEqual(first.processingEvidence);
    expect(hydratePaymentEvents([second,first,batch])[0].validation).toEqual(batch.validation);
  });
  it("formats entitlement amounts without floating point totals",()=>{
    expect(centsText(825*500000)).toBe("4125000.00");expect(centsText(10*500000)).toBe("50000.00");expect(centsText(0)).toBe("0.00");
  });
});
