import { describe, expect, it, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import { registryEligibility } from "../server/scholars/registry-eligibility";
const period="12345678-1234-4234-8234-123456789012",year="12345678-1234-4234-8234-123456789013",semester="12345678-1234-4234-8234-123456789014";
vi.mock("../server/payouts/service.js",()=>({currentPayout:vi.fn(async()=>({id:period,name:"Synthetic payroll",academicYearId:year,semesterId:semester}))}));
vi.mock("../server/scholars/registry-drafts.js",()=>({registryDrafts:()=>{throw new Error("Empty requests must not project candidates");}}));
describe("Registry metadata fast path",()=>{
 it("returns matching context without reading candidates, checklists or annuals",async()=>{
  const execute=vi.fn(async(sql:string)=>{
   if(sql.includes("FROM payout_cycles"))return [[{id:period}]];
   if(sql.includes("FROM semesters"))return [[{id:semester,name:"Synthetic semester",academic_year_id:year}]];
   throw new Error("Unbounded work on an empty Registry request");
  });const query=vi.fn(async()=>[[]]);
  const result=await registryEligibility({execute,query} as unknown as PoolConnection,{ids:"",periodId:period});
  expect(result).toMatchObject({periodId:period,semesterId:semester,items:[],periods:[{id:period,name:"Synthetic payroll"}]});expect(execute).toHaveBeenCalledTimes(2);
 });
 it("continues rejecting malformed and oversized requests",async()=>{
  const db={} as PoolConnection;
  for(const raw of [{ids:"bad"},{ids:Array(101).fill(period).join(",")},{ids:"",unknown:"x"}])await expect(registryEligibility(db,raw)).rejects.toMatchObject({status:422,code:"VALIDATION_FAILED"});
 });
});
