import { beforeEach, expect, it, vi } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import type { PayoutCycle } from "../server/payouts/model.js";
import type { EligibilityView, EligibilitySources } from "../server/eligibility/model.js";
import { dashboardCards, DASHBOARD_HASH_BASIS } from "../server/dashboard/summary.js";
import { requirementWorkload } from "../server/reports/requirement-workload.js";
import { eligibilityView } from "../server/eligibility/service.js";
import { candidateReads } from "../server/ovr/candidate-reads.js";
import { graduationRecords } from "../server/status/graduation.js";
import { effectiveRoster } from "../server/ovr/amendment-state.js";
import { paymentRecords } from "../server/ovr/processing-state.js";
vi.mock("../server/eligibility/service.js", () => ({ eligibilityView: vi.fn() }));
vi.mock("../server/ovr/candidate-reads.js", () => ({ candidateReads: vi.fn(async db => db) }));
vi.mock("../server/eligibility/cohort-reads.js", () => ({ cohortReads: vi.fn(async db => db) }));
vi.mock("../server/status/graduation.js", () => ({ graduationRecords: vi.fn(async () => new Map()) }));
vi.mock("../server/ovr/amendment-state.js", () => ({ effectiveRoster: vi.fn() }));
vi.mock("../server/ovr/processing-state.js", () => ({ paymentRecords: vi.fn() }));
vi.mock("../server/ovr/rules.js", () => ({ ovrEligibilityIssues: (v: EligibilityView) => v.effective.eligible ? [] : [{ code: "BLOCKED" }] }));
const cycle = { id: "cycle", version: 1, academicYearId: "year", semesterId: "semester" } as PayoutCycle;
type Requirement = EligibilitySources["requirements"][number];
const requirement = (status: Requirement["status"], extra = {}) => ({ status, ...extra } as Requirement);
beforeEach(() => { vi.clearAllMocks(); });
const connection = (run: (sql: string, values: unknown[]) => unknown[]) => {
  const execute = vi.fn(async (sql: string, values: unknown[]) => [run(sql, values), []]);
  return { db: { execute } as unknown as PoolConnection, execute };
};
it("uses the same document workload definition for every status and the reviewed initial exception", () => {
  for (const status of [null, "not_submitted", "for_correction", "rejected"] as const)
    expect(requirementWorkload(requirement(status))).toEqual({ kind: "missing", status: status ?? "not_generated" });
  for (const status of ["submitted", "resubmitted", "for_verification"] as const)
    expect(requirementWorkload(requirement(status))?.kind).toBe("verification");
  for (const status of ["verified", "waived"] as const) expect(requirementWorkload(requirement(status))).toBeNull();
  expect(requirementWorkload(requirement(null, { satisfied: true, documentException: { mode: "initial_requirements" } }))).toBeNull();
  expect(requirementWorkload(requirement(null, { satisfied: false, documentException: { mode: "initial_requirements" } }))?.kind).toBe("missing");
});
it("aggregates simple cards without loading the annual cohort, masterlist entries or eligibility", async () => {
  const { db, execute } = connection(sql => {
    expect(sql).toContain("COUNT(*)");
    return sql.includes("masterlist_versions") ? [{ status: "published", n: 2 }] : [{ status: "active", n: 835 }, { status: null, n: 1 }];
  });
  const cards = await dashboardCards(db, cycle, ["scholars", "masterlists"]);
  expect(cards.map(c => [c.total, c.counts])).toEqual([[836, { active: 835, not_assigned: 1 }], [2, { published: 2 }]]);
  expect(execute).toHaveBeenCalledTimes(2); expect(eligibilityView).not.toHaveBeenCalled();
  expect(cards.every(c => c.sourceHashBasis === DASHBOARD_HASH_BASIS)).toBe(true);
});
it("applies corrected graduation only to the matching annual record using aggregate adjustments", async () => {
  vi.mocked(graduationRecords).mockResolvedValueOnce(new Map([["person", { scholarshipId: "old", requestId: null, semesterId: null, semesterName: null, archived: true, label: "Graduated" }]]));
  const { db } = connection(sql => sql.includes("r.id IN") ? [{ status: "active", n: 1 }] : [{ status: "active", n: 1 }]);
  expect((await dashboardCards(db, cycle, ["scholars"]))[0].counts).toEqual({ graduated: 1 });
});
it("evaluates each annual record once in bounded pages and reuses it for all three derived counts", async () => {
  const { db } = connection(sql => /OFFSET 0 /.test(sql) ? Array.from({ length: 200 }, (_, i) => ({ id: String(i) })) : [{ id: "last" }]);
  vi.mocked(eligibilityView).mockImplementation(async (_db, _cycle, id) => ({
    current: { sourceHash: id, sources: { requirements: [requirement("submitted"), requirement(null)] } }, effective: { eligible: id !== "last" },
  }) as EligibilityView);
  const cards = await dashboardCards(db, cycle, ["missing", "verification", "eligibility"]);
  expect(eligibilityView).toHaveBeenCalledTimes(201);
  expect(vi.mocked(candidateReads).mock.calls.map(c => c[1].length)).toEqual([200, 1]);
  expect(cards.map(c => c.total)).toEqual([201, 201, 201]);
  expect(cards[2].counts).toEqual({ eligible: 200, ovr_passed: 200, ineligible: 1, ovr_blocked: 1 });
});
it("reads fresh aggregates on every call and rejects oversized scopes instead of returning partial totals", async () => {
  let n = 1; const { db } = connection(() => [{ status: "published", n }]);
  const first = (await dashboardCards(db, cycle, ["masterlists"]))[0]; n = 2;
  const next = (await dashboardCards(db, cycle, ["masterlists"]))[0];
  expect(next.total).toBe(2); expect(next.sourceHash).not.toBe(first.sourceHash);
  n = 1001; await expect(dashboardCards(db, cycle, ["masterlists"])).rejects.toMatchObject({ code: "REPORT_SCOPE_TOO_LARGE" });
});
it("refreshes derived source validity even when aggregate counts do not change", async () => {
  const { db } = connection(() => [{ id: "a" }]);
  let hash = "before";
  vi.mocked(eligibilityView).mockImplementation(async () => ({ current: { sourceHash: hash, sources: { requirements: [] } }, effective: { eligible: true } }) as unknown as EligibilityView);
  const first = (await dashboardCards(db, cycle, ["eligibility"]))[0]; hash = "after";
  const second = (await dashboardCards(db, cycle, ["eligibility"]))[0];
  expect(second.counts).toEqual(first.counts); expect(second.sourceHash).not.toBe(first.sourceHash);
});
it("counts latest payroll states and effective corrected payments without candidate generation", async () => {
  const { db } = connection(sql => sql.includes("GROUP BY status") ? [{ status: "finalized", n: 1, missing: 0 }] : [{ id: "batch" }]);
  vi.mocked(effectiveRoster).mockResolvedValueOnce({ hash: "validated", snapshot: { entries: [{ scholarshipId: "a" }, { scholarshipId: "b" }] } } as Awaited<ReturnType<typeof effectiveRoster>>);
  vi.mocked(paymentRecords).mockResolvedValueOnce([{ scholarshipId: "a", outcome: "not_paid" }] as Awaited<ReturnType<typeof paymentRecords>>);
  const cards = await dashboardCards(db, cycle, ["ovr", "payments"]);
  expect(cards[0].counts).toEqual({ finalized: 1 }); expect(cards[1].counts).toEqual({ not_paid: 1, pending: 1 });
  expect(cards[1].total).toBe(2); expect(cards[1].scope).toContain("unique semester stipends: 2");
  expect(eligibilityView).not.toHaveBeenCalled();
});
it("preserves frozen evidence failures and missing payroll history errors", async () => {
  const { db } = connection(sql => sql.includes("GROUP BY status") ? [{ status: "finalized", n: 1, missing: 0 }] : [{ id: "batch" }]);
  vi.mocked(effectiveRoster).mockRejectedValueOnce(new Error("OVR_SNAPSHOT_MISMATCH"));
  await expect(dashboardCards(db, cycle, ["ovr"])).rejects.toThrow("OVR_SNAPSHOT_MISMATCH");
  const missing = connection(() => [{ status: null, n: 1, missing: 1 }]);
  await expect(dashboardCards(missing.db, cycle, ["ovr"])).rejects.toMatchObject({ code: "OVR_NOT_FOUND" });
});
