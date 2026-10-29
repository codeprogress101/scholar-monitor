import assert from "node:assert/strict";
import type { Pool } from "mysql2/promise";
import { AuthorizationService } from "../server/authorization/service.js";
import { currentPayout } from "../server/payouts/service.js";
import { REPORTS, type ReportKind } from "../server/reports/model.js";
import { readOperationalReport } from "../server/reports/service.js";
import { cohortReads } from "../server/eligibility/cohort-reads.js";
import type { EligibilityView } from "../server/eligibility/model.js";
import { dashboardCards, DASHBOARD_HASH_BASIS } from "../server/dashboard/summary.js";

/** Compare current live aggregates with the original full-report algorithm in
 * one authorized repeatable-read snapshot, after each fixture mutation. */
export async function assertDashboardParity(pool: Pool, actor: string, cycleId: string) {
  await new AuthorizationService(pool).readSnapshot(actor, "configuration.read", async (db, access) => {
    await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
    const cycle = await currentPayout(db, cycleId);
    const kinds = (Object.keys(REPORTS) as ReportKind[]).filter(kind => access.permissions.some(p => p.code === REPORTS[kind].permission));
    const reads = await cohortReads(db, cycle.academicYearId, cycle.semesterId, cycle.id);
    const assessments = new Map<string, EligibilityView>();
    const original = [];
    for (const kind of kinds) {
      const report = await readOperationalReport(reads, { kind, cycleId, limit: 1, offset: 0 }, assessments);
      original.push({ kind, label: REPORTS[kind].label, total: report.total, counts: report.counts, scope: report.scope });
    }
    const optimized = await dashboardCards(db, cycle, kinds);
    assert.deepEqual(optimized.map(({ sourceHash, sourceHashBasis, ...card }) => {
      assert.match(sourceHash, /^[a-f0-9]{64}$/); assert.equal(sourceHashBasis, DASHBOARD_HASH_BASIS); return card;
    }), original, "R03 changed dashboard totals, status counts, permissions or scope");
    console.log(`PASS R03 full-report parity: ${optimized.length} authorized cards, ${optimized.find(c => c.kind === "scholars")?.total ?? 0} annual records`);
  });
}
