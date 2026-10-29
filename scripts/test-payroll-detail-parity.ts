import assert from "node:assert/strict";
import type { Pool } from "mysql2/promise";
import { AuthorizationService } from "../server/authorization/service.js";
import { legacyOvrDetail } from "../tests/fixtures/legacy-ovr-detail.js";
import { readCompleteOvrDetail } from "../server/ovr/complete-detail.js";
import { payrollSummary, candidatePage, entryPage, historyPage, readOvrSection, semesterClaims } from "../server/ovr/detail-reads.js";
import { semesterClaim } from "../server/ovr/reprocessing.js";
import { paymentRecords } from "../server/ovr/processing-state.js";
import type { OvrDetail } from "../server/ovr/model.js";
import type { LightMyRequestResponse } from "fastify";
const withoutLiveClock = (v: OvrDetail) => { const { checkedAt, ...validation } = v.validation; void checkedAt; return { ...v, validation }; };
const states = new Map<string, number>();
const apiChecked = new Set<string>();
export async function assertPayrollReadApi(request: (role:string,path:string)=>Promise<LightMyRequestResponse>, batchId:string, cycleId:string) {
  if(apiChecked.has(batchId))return; apiChecked.add(batchId);
  const root=`/api/v1/ovr-batches/${batchId}`;
  const paths=[root+"/summary",root+"/candidates",root+"/roster",root+"/history",root+"/payment-history",...(["candidates","processing","corrections","amendments","reconciliation","reprocessing","validation"].map(s=>root+"/sections/"+s)),`/api/v1/payout-cycles/${cycleId}/ovr-batch-summaries`];
  for(const role of ["system_admin","unassigned"])for(const path of paths)assert.equal((await request(role,path)).statusCode,403,path);
  for(const path of [root+"/candidates?limit=101",root+"/roster?offset=-1",root+"/payment-history?sourceHash=forged",root+"/history?limit=0",root+"/sections/unknown"])assert.equal((await request("staff",path)).statusCode,422,path);
  const summary=await request("staff",root+"/summary");assert.equal(summary.statusCode,200);assert.equal(summary.headers["cache-control"],"no-store");
  assert.equal((await request("staff",root+"/payment-history?limit=1")).statusCode,200);
  console.log("PASS R04 read API: all new endpoints reject unauthorized roles and invalid/forged pages");
}
export async function assertPayrollDetailParity(pool: Pool, actor: string, batchId: string) {
  await new AuthorizationService(pool).readSnapshot(actor, "ovr.prepare", async (db, access) => {
    const before = await legacyOvrDetail(db, batchId), after = await readCompleteOvrDetail(db, batchId);
    assert.deepEqual(withoutLiveClock(after), withoutLiveClock(before), "R04 changed complete payroll membership/evidence/payment/history");
    const summary = await payrollSummary(db, batchId, access);
    for (const key of ["id", "cycleId", "code", "name", "revision", "state"] as const) assert.equal(summary.batch[key], before.batch[key]);
    assert.equal(summary.canEdit, before.canEdit); assert.deepEqual(summary.cycle, before.cycle); assert.equal(summary.sourceValidation, "not_loaded");
    for (const field of ["entries", "managed", "automatic", "payments", "history", "validation", "releases"]) assert.equal(Object.hasOwn(summary, field), false, "Heading must not contain full details");
    if (before.finalization) {
      assert.equal(summary.frozen?.hash, before.finalization.hash);
      assert.equal(summary.frozen?.count, before.entries.length);
      await assert.rejects(candidatePage(db, batchId, {}), { code: "PAYROLL_FROZEN" });
    } else {
      const expected = before.managed?.items;
      for (let offset = 0; offset < (expected?.length ?? 1); offset += 2) {
        const page = await candidatePage(db, batchId, { offset, limit: 2 });
        assert.equal(page.fullReviewRequired, true); assert.equal(Object.hasOwn(page, "sourceHash"), false);
        if (expected) { assert.equal(page.total, expected.length); assert.deepEqual(page.items, expected.slice(offset, offset + 2), "Paged evidence differs from complete candidate calculation"); }
      }
    }
    const rows = [];
    for (let offset = 0; offset < Math.max(1, before.entries.length); offset += 2) { const page = await entryPage(db, batchId, {offset,limit:2}); assert.equal(page.total,before.entries.length); rows.push(...page.entries); }
    assert.deepEqual(rows,before.entries);
    const history = await historyPage(db,batchId,{offset:0,limit:100});
    assert.equal(history.total,before.history.length);
    assert.deepEqual(history.items,before.history.slice(0,100).map(({validation,...batch})=>({...batch,...(validation?{validation:{valid:validation.valid,checkedAt:validation.checkedAt}}:{})})));
    const payments = await readOvrSection(db,batchId,"reconciliation"); assert.deepEqual(payments.reconciliation,before.reconciliation);
    const processing = await readOvrSection(db,batchId,"processing");
    for(const key of ["effectiveFinalization","payments","releases","amendments","reconciliation","claimDeadline","treasuryEvidence","historicalReceipts","semesterPayments"] as const) assert.deepEqual(processing[key],before[key],"Processing section changed "+key);
    const corrections = await readOvrSection(db,batchId,"corrections");
    for(const key of ["paymentCorrections","originalPayments","payments","reconciliation"] as const) assert.deepEqual(corrections[key],before[key],"Correction section changed "+key);
    assert.equal(corrections.managedRelease,Boolean(before.releases),"Correction approval mode changed");
    for(let offset=0;offset<before.payments.length;offset+=2){const page=before.payments.slice(offset,offset+2);assert.deepEqual(await paymentRecords(db,batchId,false,page.map(p=>p.scholarshipId)),page,"Paged payment corrections or unpaid classifications changed");}
    const claims=await semesterClaims(db,before.entries.map(e=>e.scholarshipId),before.cycle.semesterId);
    for(const e of before.entries)assert.deepEqual(claims.get(e.scholarshipId),await semesterClaim(db,e.scholarshipId,before.cycle.semesterId));
    states.set(before.batch.state,(states.get(before.batch.state)??0)+1);
    console.log(`PASS R04 complete/scoped parity: ${before.batch.state}, ${before.entries.length} saved members; states=${JSON.stringify(Object.fromEntries(states))}`);
  });
}
