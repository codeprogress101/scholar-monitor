import { beforeEach, expect, it, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import type { Access } from "../server/authorization/policy.js";
import type { PayoutCycle } from "../server/payouts/model.js";
import type { PaymentRecord } from "../server/ovr/processing-model.js";
import type { PaymentCorrection } from "../server/ovr/payment-correction-state.js";
import { batchMetadata, payrollSummary, candidatePage, semesterClaims, draftDeferrals, detailConnection } from "../server/ovr/detail-reads.js";
import { candidateReads } from "../server/ovr/candidate-reads.js";
import { currentPayout } from "../server/payouts/service.js";
import { managedCandidates } from "../server/ovr/managed-payroll.js";
import { retryCandidates } from "../server/ovr/reprocessing.js";
import { paymentRecords } from "../server/ovr/processing-state.js";
import { paymentCorrections } from "../server/ovr/payment-correction-state.js";
vi.mock("../server/payouts/service.js", async load => ({ ...await load<object>(), currentPayout: vi.fn() }));
vi.mock("../server/ovr/managed-payroll.js", async load => ({ ...await load<object>(), managedCandidates: vi.fn() }));
vi.mock("../server/ovr/reprocessing.js", async load => ({ ...await load<object>(), retryCandidates: vi.fn() }));
vi.mock("../server/ovr/processing-state.js", async load => ({ ...await load<object>(), paymentRecords: vi.fn() }));
vi.mock("../server/ovr/payment-correction-state.js", async load => ({ ...await load<object>(), paymentCorrections: vi.fn() }));
vi.mock("../server/ovr/candidate-reads.js", async load => ({ ...await load<object>(), candidateReads: vi.fn() }));
const cycle = { id:"cycle", academicYearId:"year",semesterId:"term",state:"open",periodUnavailable:false } as PayoutCycle;
const batch = { id:"batch",cycleId:"cycle",code:"PAY-1",name:"Synthetic payroll",revision:1,state:"draft" };
const access = { permissions:[{code:"ovr.prepare"}] } as unknown as Access;
function connection(run:(sql:string,values:unknown[])=>unknown[]) {
  const execute=vi.fn(async(sql:string,values:unknown[]=[])=>[run(sql,values),[]]);
  return { db:{execute} as unknown as PoolConnection, execute };
}
beforeEach(()=>{vi.resetAllMocks();vi.mocked(currentPayout).mockResolvedValue(cycle);vi.mocked(retryCandidates).mockResolvedValue([]);vi.mocked(paymentRecords).mockResolvedValue([]);vi.mocked(paymentCorrections).mockResolvedValue([]);});
it("loads heading aggregates without eligibility, candidate generation or history expansion",async()=>{
  const {db,execute}=connection(sql=>{
    if(sql.includes("FROM ovr_batch_events")){expect(sql).toContain("JSON_REMOVE");expect(sql).toContain("'$.data'");expect(sql).toContain("LIMIT 1");return [{snapshot:batch}];}
    if(sql.includes("FROM payroll_submission_windows"))return [{batch_id:"batch"}];
    if(sql.includes("AS annuals"))return [{annuals:835,saved:0}];
    if(sql.includes("FROM ovr_finalizations"))return [];
    throw Error(sql);
  });
  const result=await payrollSummary(db,"batch",access);
  expect(result.annualScopeCount).toBe(835);expect(result.sourceValidation).toBe("not_loaded");expect(result.actions.finalize).toBe(false);
  for(const field of ["entries","validation","managed","history","payments"])expect(result).not.toHaveProperty(field);
  expect(managedCandidates).not.toHaveBeenCalled();expect(paymentRecords).not.toHaveBeenCalled();expect(execute).toHaveBeenCalledTimes(4);
});
it("hydrates reviewed submission metadata from its exact event, not current user names or a guessed date",async()=>{
  const submitted={...batch,revision:2,state:"review",actorId:"author",actorName:"Historical reviewer",recordedAt:"2026-10-01T10:00:00.000Z"};
  const {db}=connection(sql=>[{snapshot:sql.includes("action='submit-review'")?submitted:{...batch,revision:4,state:"finalized"}}]);
  expect((await batchMetadata(db,"batch")).submission).toEqual({actorId:"author",actorName:"Historical reviewer",submittedAt:submitted.recordedAt,revision:2});
});
it("reports a missing batch instead of an empty authorized-looking summary",async()=>{
  const {db}=connection(()=>[]);await expect(batchMetadata(db,"missing")).rejects.toMatchObject({code:"OVR_NOT_FOUND"});
});
it("restricts candidate evaluation to the database page and never exposes its partial hash as approval evidence",async()=>{
  const {db,execute}=connection(sql=>{
    if(sql.includes("FROM historical_payout_setups"))return [];
    if(sql.includes("FROM ovr_batch_events"))return [{snapshot:batch}];
    if(sql.includes("FROM payroll_submission_windows"))return [{batch_id:"batch"}];
    if(sql.includes("FROM ovr_finalizations"))return [];
    if(sql.includes("COUNT(*) AS n"))return [{n:835}];
    if(sql.startsWith("SELECT r.id")){expect(sql).toContain("LIMIT 2 OFFSET 25");return [{id:"a"},{id:"b"}];}
    if(sql.includes("FROM payroll_reprocessing"))return [];
    throw Error(sql);
  });
  const items=[] as NonNullable<Awaited<ReturnType<typeof managedCandidates>>>["items"];
  vi.mocked(managedCandidates).mockResolvedValue({items,sourceHash:"partial"} as NonNullable<Awaited<ReturnType<typeof managedCandidates>>>);
  const result=await candidatePage(db,"batch",{offset:25,limit:2});
  expect(vi.mocked(managedCandidates).mock.calls[0][3]).toEqual(["a","b"]);
  expect(result.total).toBe(835);expect(result.fullReviewRequired).toBe(true);expect(result).not.toHaveProperty("sourceHash");expect(result).not.toHaveProperty("form");
  expect(execute.mock.calls.some(([sql])=>sql.includes("LIMIT 2 OFFSET 25"))).toBe(true);
});
it("does not recalculate current candidates for a frozen payroll",async()=>{
  const {db}=connection(sql=>sql.includes("FROM ovr_batch_events")?[{snapshot:batch}]:[{batch_id:"batch"}]);
  await expect(candidatePage(db,"batch",{})).rejects.toMatchObject({code:"PAYROLL_FROZEN"});expect(managedCandidates).not.toHaveBeenCalled();
});
it("shares semester payment/correction reads while preserving cross-year identity and the first paid attempt",async()=>{
  const {db}=connection((sql,values)=>{
    if(sql.includes("p.source_kind='individual'"))return [];
    if(sql.includes("AS target_id")){expect(values).toEqual(["a","b"]);return [{target_id:"a",annual_id:"old-a"},{target_id:"a",annual_id:"a"},{target_id:"b",annual_id:"b"}];}
    if(sql.includes("SELECT DISTINCT b.id"))return [{id:"first"},{id:"second"}];
    if(sql.includes("SELECT cycle_id,code"))return [{cycle_id:"cycle",code:values[0]}];
    throw Error(sql);
  });
  vi.mocked(paymentRecords).mockImplementation(async(_db,id)=>id==="first"?[{id:"p1",scholarshipId:"old-a",outcome:"paid",amount:"5000.00"}] as PaymentRecord[]:[{id:"p2",scholarshipId:"a",outcome:"paid",amount:"5000.00"}] as PaymentRecord[]);
  vi.mocked(paymentCorrections).mockResolvedValue([{state:"pending",before:{scholarshipId:"a"}}] as PaymentCorrection[]);
  const claims=await semesterClaims(db,["a","a","b"],"term");
  expect(claims.get("a")?.attempts.map(p=>p.id)).toEqual(["p1","p2"]);expect(claims.get("a")?.paid?.id).toBe("p1");expect(claims.get("a")?.pending.length).toBe(2);
  expect(claims.get("b")?.attempts).toEqual([]);expect(paymentRecords).toHaveBeenCalledTimes(2);expect(paymentCorrections).toHaveBeenCalledTimes(2);
});
it("does not scan unrelated financial history for an empty roster",async()=>{
  const {db,execute}=connection(()=>{throw Error("Unexpected query");});expect((await semesterClaims(db,[],"term")).size).toBe(0);expect(execute).not.toHaveBeenCalled();
});
it("preserves modern Restore over legacy deferrals and uses the latest legacy decision only when no modern event exists",async()=>{
  const stamp="2026-10-21T02:00:00.000Z";
  const {db,execute}=connection((sql,values)=>{
    expect(values).toEqual(["batch","restored","legacy","empty"]);
    return sql.includes("payroll_draft_deferrals")?
      [{scholarship_id:"restored",revision:2,action:"restore",reason:"Restored",actor_id:"reviewer",recorded_at:stamp},{scholarship_id:"restored",revision:1,action:"defer",reason:"Older",actor_id:"reviewer",recorded_at:stamp}]:
      [{scholarship_id:"legacy",revision:3,reason:"Latest legacy",actor_id:"reviewer",recorded_at:stamp},{scholarship_id:"restored",revision:9,reason:"Legacy cannot override",actor_id:"reviewer",recorded_at:stamp},{scholarship_id:"legacy",revision:1,reason:"Older",actor_id:"reviewer",recorded_at:stamp}];
  });
  const rows=await draftDeferrals(db,"batch",["restored","legacy","empty","restored"]);
  expect(rows.get("restored")).toMatchObject({revision:2,current:false,reason:"Restored",recordedAt:stamp});
  expect(rows.get("legacy")).toMatchObject({revision:3,current:true,reason:"Latest legacy"});
  expect(rows.has("empty")).toBe(false);expect(execute).toHaveBeenCalledTimes(2);
});
it("keeps only one bounded full-detail source window and leaves unknown reads authoritative",async()=>{
  const rows=Array.from({length:235},(_,i)=>({id:`annual-${i}`,scholar_id:`person-${i}`}));
  const {db}=connection(sql=>sql.startsWith("SELECT id,scholar_id")?rows:[{fresh:true}]);
  vi.mocked(candidateReads).mockImplementation(async scoped=>scoped);
  const scoped=await detailConnection(db,cycle);
  expect(candidateReads).not.toHaveBeenCalled();
  await scoped.execute("SELECT evidence WHERE annual_id=?",["annual-0"]);
  await scoped.execute("SELECT evidence WHERE scholar_id=?",["person-99"]);
  expect(candidateReads).toHaveBeenCalledTimes(1);
  expect(vi.mocked(candidateReads).mock.calls[0][1]).toEqual(rows.slice(0,100).map(r=>r.id));
  await scoped.execute("SELECT evidence WHERE annual_id=?",["annual-234"]);
  expect(vi.mocked(candidateReads).mock.calls[1][1]).toEqual(rows.slice(200).map(r=>r.id));
  expect((await scoped.execute("SELECT fresh WHERE annual_id=?",["outside-year"]))[0]).toEqual([{fresh:true}]);
  expect(candidateReads).toHaveBeenCalledTimes(2);
});
