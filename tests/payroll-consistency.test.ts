import {describe,it,expect} from "vitest";
import {parseSignatories} from "../server/configuration/payroll-signatories";
import {candidateGroup,matchesCandidateFilter} from "../src/payroll-candidate-filter";
import {receivingScholarAddress} from "../src/scholar-issue-navigation";
describe("payroll consistency",()=>{
 it("requires all four ordered names and designations",()=>{
  const slots=Array.from({length:4},(_,n)=>({name:`Name ${n}`,title:`Designation ${n}`}));
  expect(parseSignatories(JSON.stringify(slots))).toEqual(slots);
  for(const value of ["invalid",JSON.stringify(slots.slice(1)),JSON.stringify([...slots,slots[0]]),JSON.stringify([{name:" ",title:"X"},...slots.slice(1)]),JSON.stringify([{...slots[0],title:""},...slots.slice(1)])]) expect(()=>parseSignatories(value)).toThrow();
 });
 it("partitions candidates without losing academically eligible deferrals",()=>{
  const rows=[{eligible:true,pending:false},{eligible:true,pending:false,deferred:{current:true}},{eligible:false,pending:true},{eligible:false,pending:false}];
  expect(rows.map(candidateGroup)).toEqual(["included","deferred","review","other"]);
  expect(rows.filter(i=>matchesCandidateFilter(i,"all"))).toHaveLength(4);
  expect(["included","deferred","review","other"].flatMap(f=>rows.filter(i=>matchesCandidateFilter(i,f)))).toHaveLength(rows.length);
 });
 it("retains the complete receiving period in the URL",()=>{
  const route=receivingScholarAddress("scholar","year","semester","cycle");
  const p=new URLSearchParams(route.split("?")[1]);
  expect(Object.fromEntries(p)).toEqual({scholar:"scholar",section:"requirements",academicYear:"year",semester:"semester",payrollCycle:"cycle"});
 });
});
