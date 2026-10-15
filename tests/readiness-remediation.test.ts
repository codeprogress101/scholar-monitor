import { describe,it,expect } from "vitest";
import { readFile,readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { schemaManifest } from "../server/schema-manifest";
import { schemaReady } from "../server/schema-readiness";
import { payrollSignatories, type PayrollForm } from "../server/ovr/payroll-form";
import { amendFrozenForm,assertPayrollRoster } from "../server/ovr/amended-form";
import type { OvrFinalization } from "../server/ovr/model";
import { validatePlacementPolicy,type PlacementPolicyEvidence } from "../server/academic/placement-policy";
import { snapshotConnection } from "../server/authorization/read-snapshot";
import type { PoolConnection } from "mysql2/promise";
import { reconcilePayments } from "../server/ovr/processing-state";
import type { PaymentRecord } from "../server/ovr/processing-model";

describe("office readiness remediation",()=>{
  const settings=[{code:"PAYROLL_SIGNATORIES",setting_value:JSON.stringify(payrollSignatories)}];
  it("pins every release migration and rejects missing, unknown, duplicate and mismatched schema",async()=>{
    const names=(await readdir("db/migrations")).filter(n=>/^\d{14}_f\d{2}_[a-z_]+\.sql$/.test(n)).sort();
    expect(schemaManifest.map(r=>r.version)).toEqual(names);
    for(const m of schemaManifest)expect(m.checksum).toBe(createHash("sha256").update(await readFile(`db/migrations/${m.version}`,"utf8")).digest("hex"));
    expect(schemaReady([...schemaManifest],settings)).toBe(true);
    for(const rows of [schemaManifest.slice(1),[...schemaManifest,{version:"unknown",checksum:"x"}],schemaManifest.map((m,i)=>i===0 ? {...m,checksum:"x"} : m),schemaManifest.map((m,i)=>i===0 ? schemaManifest[1] : m)])expect(schemaReady(rows,settings)).toBe(false);
    expect(schemaReady([...schemaManifest],[])).toBe(false);
    expect(schemaReady([...schemaManifest],[{code:"PAYROLL_SIGNATORIES",setting_value:"[]"}])).toBe(false);
  });
  const before={schoolId:"s",courseId:"c",yearLevel:"Second year",school:{name:"School",code:"S"},course:{name:"Course",code:"C"}};
  const target={...before,courseId:"other"};
  const evidence:PlacementPolicyEvidence={priorShiftCount:0,secondYearBoundaryOn:"2026-06-01",permissionGrantedOn:"2026-05-01",permissionReference:"Committee permission 1",historyReference:"Reviewed lifetime academic history",sourceCategory:"degree",destinationCategory:"degree"};
  it("enforces lifetime shift, unknown-history review, boundary, prior permission and category",()=>{
    expect(()=>validatePlacementPolicy(before,target,"2026-06-01",evidence)).not.toThrow();
    for(const patch of [{priorShiftCount:null},{priorShiftCount:1},{secondYearBoundaryOn:null},{secondYearBoundaryOn:"2026-05-31"},{permissionGrantedOn:"2026-06-02"},{sourceCategory:"non_degree" as const}])expect(()=>validatePlacementPolicy(before,target,"2026-06-01",{...evidence,...patch})).toThrow();
    expect(()=>validatePlacementPolicy({...before,yearLevel:"Fourth year"},target,"2026-06-01",evidence)).toThrow();
    expect(()=>validatePlacementPolicy(before,{...before,schoolId:"other"},"2026-06-01",{...evidence,priorShiftCount:5,secondYearBoundaryOn:null})).not.toThrow();
  });
  it("rebuilds amended rows without rewriting original evidence or current signatories",()=>{
    const form={rows:[{scholarshipId:"a",scholarId:"A",amountCentavos:500000},{scholarshipId:"b",scholarId:"B",amountCentavos:500000}],signatories:[{name:"Historical",title:"Historical designation"}]} as PayrollForm;
    const snapshot={entries:[{scholarshipId:"b"}],legacyPayrollForm:form} as OvrFinalization;
    const copy=structuredClone(snapshot),amended=amendFrozenForm(snapshot);
    expect(amended.legacyPayrollForm!.rows.map(r=>r.scholarshipId)).toEqual(["b"]);
    expect(amended.legacyPayrollForm!.signatories).toEqual(form.signatories);
    expect(snapshot).toEqual(copy);
    expect(()=>assertPayrollRoster(form,snapshot)).toThrow();
    expect(()=>amendFrozenForm({...snapshot,entries:[{scholarshipId:"missing"}]} as OvrFinalization)).toThrow();
  });
  it("keeps missing and withheld outcomes in Unpaid without marking them reconciled",()=>{
    const frozen={entries:["a","b","c","d"].map(scholarshipId=>({scholarshipId}))} as OvrFinalization;
    const payments=[{scholarshipId:"a",outcome:"paid",amount:"5000.00",effectiveOn:null},{scholarshipId:"b",outcome:"not_paid",unpaidReason:"did_not_claim",amount:"0.00"},{scholarshipId:"c",outcome:"not_paid",unpaidReason:"withheld",amount:"0.00"}] as PaymentRecord[];
    expect(reconcilePayments(frozen,payments)).toMatchObject({paid:1,unpaid:2,unclaimed:1,required:4,complete:false,paidTotal:"5000.00"});
  });
  it("snapshot projection removes row locks and refuses writes or transaction control",async()=>{
    const statements:string[]=[];
    const connection=snapshotConnection({query:async(sql:string)=>{statements.push(sql);return [[],[]];}} as unknown as PoolConnection);
    await connection.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
    expect(statements).toEqual(["SELECT id FROM configuration_guard WHERE id=1"]);
    expect(()=>connection.query("UPDATE users SET version=1")).toThrow();
    expect(()=>connection.query("SELECT 1; DELETE FROM users")).toThrow();
    expect(()=>connection.commit()).toThrow();
  });
});
