import {afterEach,describe,expect,it,vi} from "vitest";
import {today} from "../server/scholars/validation";
import {candidateReads} from "../server/ovr/candidate-reads";
import type {PoolConnection} from "mysql2/promise";

afterEach(()=>vi.useRealTimers());
describe("Live Manila dates with a reused formatter",()=>{
 it("changes at Manila midnight without retaining a previous date",()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-26T15:59:59.999Z"));expect(today()).toBe("2026-10-26");
  vi.setSystemTime(new Date("2026-10-26T16:00:00Z"));expect(today()).toBe("2026-10-27");
 });
});
describe("Request-local raw source batching",()=>{
 it("retains predicates and order, returns independent rows and invalidates after a write",async()=>{
  let runs=0;
  const execute=vi.fn(async(sql:string)=>{
   if(sql.startsWith("SELECT id,scholar_id FROM scholarship_records"))return [[{id:"a",scholar_id:"s1"},{id:"b",scholar_id:"s2"}],[]];
   if(sql.includes("FROM semester_entitlements")){runs++;expect(sql).toContain("scholar_id IN (?,?) AND semester_id=?");expect(sql).toContain("ORDER BY id LOCK IN SHARE MODE");return [[{id:"e1",__candidate_key_0:"s1"},{id:"e2",__candidate_key_0:"s2"}],[]];}
   return [[],[]];
  });
  const db=await candidateReads({execute,query:execute} as unknown as PoolConnection,["a","b"],"term");
  const sql="SELECT id FROM semester_entitlements WHERE scholar_id=? AND semester_id=? ORDER BY id LOCK IN SHARE MODE";
  const [first]=await db.execute(sql,["s1","term"]);expect(first).toEqual([{id:"e1"}]);(first as {id:string}[])[0].id="changed";
  expect((await db.execute(sql,["s1","term"]))[0]).toEqual([{id:"e1"}]);expect((await db.execute(sql,["s2","term"]))[0]).toEqual([{id:"e2"}]);expect(runs).toBe(1);
  await db.execute("UPDATE ignored SET version=version+1");await db.execute(sql,["s1","term"]);expect(runs).toBe(2);
 });
});
