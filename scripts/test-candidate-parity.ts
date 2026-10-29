import assert from "node:assert/strict";
import type { Pool } from "mysql2/promise";
import { AuthorizationService } from "../server/authorization/service.js";
import { cachedReads } from "../server/read-cache.js";
import { currentPayout } from "../server/payouts/service.js";
import { ovrHistory } from "../server/ovr/service.js";
import { automaticDraft } from "../server/ovr/automatic-draft.js";
import { managedCandidates } from "../server/ovr/managed-payroll.js";
import { legacyAutomaticDraft } from "../tests/fixtures/legacy-automatic-draft.js";
import { legacyManagedCandidates } from "../tests/fixtures/legacy-managed-payroll.js";
import { cohortReads } from "../server/eligibility/cohort-reads.js";
import { legacyCohortReads } from "../tests/fixtures/legacy-cohort-reads.js";
import { eligibilityView } from "../server/eligibility/service.js";

const counts={managed:0,automatic:0,checks:0,cohort:0};
process.once("beforeExit",()=>{if(counts.checks && !process.exitCode)console.log(`PASS R02 complete-output comparisons: ${counts.checks} states, ${counts.managed} managed and ${counts.automatic} non-null legacy automatic projections; R07 ${counts.cohort} complete eligibility views`);});

/** Complete candidates, evidence, issues, ordering, amounts and source hashes
 * must match inside one authorized snapshot. Caches are independent per reader.
 */
export async function assertCandidateParity(pool:Pool, actor:string, batchId:string) {
  await new AuthorizationService(pool).readSnapshot(actor,"ovr.prepare",async connection=>{
    await connection.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
    const batch=(await ovrHistory(connection,batchId))[0],cycle=await currentPayout(connection,batch.cycleId);
    const managed=await managedCandidates(cachedReads(connection),batch,cycle),automatic=await automaticDraft(cachedReads(connection),batch,cycle);
    assert.deepEqual(managed,await legacyManagedCandidates(cachedReads(connection),batch,cycle),"R02 changed managed candidate evidence/ordering/amounts/fingerprints");
    assert.deepEqual(automatic,await legacyAutomaticDraft(cachedReads(connection),batch,cycle),"R02 changed legacy automatic candidate evidence/ordering/amounts/fingerprints");
    // Independent pre-R07 preload oracle, across the same financial lifecycle:
    // history/overrides, document outcomes, standing and reservation sources.
    const currentReads=await cohortReads(cachedReads(connection),cycle.academicYearId,cycle.semesterId,cycle.id);
    const previousReads=await legacyCohortReads(cachedReads(connection),cycle.academicYearId,cycle.semesterId,cycle.id);
    for(const item of managed?.items ?? automatic?.entries ?? []) {
      assert.deepEqual(await eligibilityView(currentReads,cycle,item.scholarshipId,batch.id),await eligibilityView(previousReads,cycle,item.scholarshipId,batch.id),"R07 changed complete eligibility evidence/history/reasons");
      counts.cohort++;
    }
    counts.checks++;if(managed)counts.managed++;if(automatic)counts.automatic++;
  });
}
