import { createHash } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { cachedReads } from "../read-cache.js";
import type { PayoutCycle } from "../payouts/model.js";
import { REPORTS, type ReportKind } from "../reports/model.js";
import { requirementWorkload } from "../reports/requirement-workload.js";
import { graduationRecords } from "../status/graduation.js";
import { eligibilityView } from "../eligibility/service.js";
import { cohortReads } from "../eligibility/cohort-reads.js";
import { candidateReads } from "../ovr/candidate-reads.js";
import { ovrEligibilityIssues } from "../ovr/rules.js";
import { effectiveRoster } from "../ovr/amendment-state.js";
import { paymentRecords } from "../ovr/processing-state.js";

export const DASHBOARD_HASH_BASIS = "dashboard-summary-v1" as const;
type Summary = { total: number; counts: Record<string, number>; scope: string };
const scopes: Record<ReportKind, string> = {
  scholars: "All annual scholarship records in the cycle's academic year (including inactive and terminal statuses)",
  missing: "Payout requirements not generated, not submitted, returned for correction, or rejected; one row per document.",
  verification: "Received or resubmitted payout documents awaiting verification; one row per document.",
  eligibility: "Current F19 eligibility and the same eligibility checks used by Payroll validation. Batch duplicates, workflow locks, and frozen evidence are checked when preparing a Payroll.",
  ovr: "Selected payout cycle",
  payments: "",
  masterlists: "All masterlist versions in the cycle's academic year",
};
function bounded(n: number, maximum: number, unit = "source records") {
  if (n > maximum) throw new AuthError(422, "REPORT_SCOPE_TOO_LARGE",
    `This scope exceeds ${maximum.toLocaleString("en-US")} ${unit}. No partial report was returned. Narrow the reporting period.`);
}
function bump(summary: Summary, key: string, n = 1) {
  summary.counts[key] = (summary.counts[key] ?? 0) + n;
}

/** Caller owns the existing authorization snapshot/configuration guard. No cache
 * survives this call. Counts use aggregates; derived eligibility is evaluated
 * once per annual record, in bounded chunks through the existing domain reader.
 * We never prepare candidates, forms, reconciliation reports or report rows.
 */
export async function dashboardCards(db: PoolConnection, cycle: PayoutCycle, kinds: readonly ReportKind[]) {
  const summaries = new Map(kinds.map(kind => [kind, { total: 0, counts: {}, scope: scopes[kind] } as Summary]));
  const evidence = new Map<ReportKind, string>();
  const annualFrom = "FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE r.academic_year_id=?";
  if (summaries.has("scholars")) {
    const summary = summaries.get("scholars")!;
    const [groups] = await db.execute<RowDataPacket[]>(`SELECT r.operational_status AS status,COUNT(*) AS n ${annualFrom} GROUP BY r.operational_status`, [cycle.academicYearId]);
    for (const g of groups) { bump(summary, g.status ?? "not_assigned", Number(g.n)); summary.total += Number(g.n); }
    bounded(summary.total, 5000, "annual scholar records");
    // Reports use the latest corrected graduation, including an archived
    // graduation on an annual row whose stored operational status differs.
    const ids = [...(await graduationRecords(db)).values()].flatMap(g => g.scholarshipId ? [g.scholarshipId] : []);
    for (let offset = 0; offset < ids.length; offset += 200) {
      const chunk = ids.slice(offset, offset + 200);
      const [adjustments] = await db.execute<RowDataPacket[]>(`SELECT r.operational_status AS status,COUNT(*) AS n ${annualFrom} AND r.id IN (${chunk.map(() => "?").join(",")}) GROUP BY r.operational_status`, [cycle.academicYearId, ...chunk]);
      for (const g of adjustments) {
        const old = g.status ?? "not_assigned", n = Number(g.n);
        if (old === "graduated") continue;
        bump(summary, old, -n); if (!summary.counts[old]) delete summary.counts[old]; bump(summary, "graduated", n);
      }
    }
  }
  if (summaries.has("masterlists")) {
    const summary = summaries.get("masterlists")!;
    const [groups] = await db.execute<RowDataPacket[]>("SELECT status,COUNT(*) AS n FROM masterlist_versions WHERE academic_year_id=? GROUP BY status", [cycle.academicYearId]);
    for (const g of groups) { bump(summary, g.status, Number(g.n)); summary.total += Number(g.n); }
    bounded(summary.total, 1000);
  }
  if (["missing", "verification", "eligibility"].some(kind => summaries.has(kind as ReportKind))) {
    const source = createHash("sha256");
    let evaluated = 0;
    for (let offset = 0; ; offset += 200) {
      // Only IDs are loaded here. Raw sources/derived indexes are discarded at
      // each page boundary instead of retaining 835 full EligibilityViews.
      const [annuals] = await db.execute<RowDataPacket[]>(`SELECT r.id ${annualFrom} ORDER BY i.human_id,r.id LIMIT 200 OFFSET ${offset} LOCK IN SHARE MODE`, [cycle.academicYearId]);
      evaluated += annuals.length; bounded(evaluated, 5000, "annual scholar records");
      const ids = annuals.map(r => String(r.id));
      // Cache the bounded bulk SQL below the per-scholar adapter too: common
      // policy/calendar reads must not compete with thousands of per-ID keys.
      const reads = await cohortReads(await candidateReads(cachedReads(db), ids, cycle.semesterId), cycle.academicYearId, cycle.semesterId, cycle.id, ids);
      for (const annual of annuals) {
        const view = await eligibilityView(reads, cycle, annual.id);
        const issues = ovrEligibilityIssues(view);
        source.update(JSON.stringify([annual.id, view.current.sourceHash, view.effective, issues]));
        const eligible = summaries.get("eligibility");
        if (eligible) { eligible.total++; bump(eligible, view.effective.eligible ? "eligible" : "ineligible"); bump(eligible, issues.length ? "ovr_blocked" : "ovr_passed"); }
        for (const requirement of view.current.sources.requirements) {
          const workload = requirementWorkload(requirement);
          const summary = workload && summaries.get(workload.kind);
          if (summary && workload) { summary.total++; bump(summary, workload.status); bounded(summary.total, 50000, "report rows"); }
        }
      }
      if (annuals.length < 200) break;
    }
    const hash = source.digest("hex");
    for (const kind of ["missing", "verification", "eligibility"] as const) evidence.set(kind, hash);
  }
  if (summaries.has("ovr") || summaries.has("payments")) {
    // Latest event, not the batch table's creation state. Do not load all event
    // histories or call the managed/automatic candidate generators for a count.
    const [groups] = await db.execute<RowDataPacket[]>(`SELECT JSON_UNQUOTE(JSON_EXTRACT(e.snapshot,'$.state')) AS status,COUNT(*) AS n,SUM(e.batch_id IS NULL) AS missing
      FROM ovr_batches b LEFT JOIN ovr_batch_events e ON e.batch_id=b.id
        AND NOT EXISTS(SELECT 1 FROM ovr_batch_events newer WHERE newer.batch_id=e.batch_id AND newer.revision>e.revision)
      WHERE b.cycle_id=? GROUP BY status`, [cycle.id]);
    const total = groups.reduce((n, g) => n + Number(g.n), 0); bounded(total, 1000);
    if (groups.some(g => Number(g.missing))) throw new AuthError(404, "OVR_NOT_FOUND", "Payroll batch not found.");
    const ovr = summaries.get("ovr");
    if (ovr) { ovr.total = total; for (const g of groups) bump(ovr, g.status ?? "undefined", Number(g.n)); }
    const [batches] = await db.execute<RowDataPacket[]>("SELECT b.id FROM ovr_batches b WHERE b.cycle_id=? AND EXISTS(SELECT 1 FROM ovr_finalizations f WHERE f.batch_id=b.id) ORDER BY b.code,b.id LOCK IN SHARE MODE", [cycle.id]);
    const stipends = new Set<string>(), source = createHash("sha256");
    for (const batch of batches) {
      // Hash validation and approved roster/payment corrections remain in the
      // existing readers. SQL JSON counts must not bypass frozen integrity.
      const roster = await effectiveRoster(db, batch.id);
      source.update(JSON.stringify([batch.id, roster?.hash]));
      const summary = summaries.get("payments");
      if (!summary) continue;
      const payments = await paymentRecords(db, batch.id);
      const byScholar = new Map<string, (typeof payments)[number]>();
      for (const payment of payments) if (!byScholar.has(payment.scholarshipId)) byScholar.set(payment.scholarshipId, payment);
      source.update(JSON.stringify(payments));
      for (const entry of roster?.snapshot.entries ?? []) {
        summary.total++; stipends.add(entry.scholarshipId);
        bump(summary, byScholar.get(entry.scholarshipId)?.outcome ?? "pending");
      }
      bounded(summary.total, 50000, "report rows");
    }
    const payments = summaries.get("payments");
    if (payments) payments.scope = `Processing attempts: ${payments.total}; unique semester stipends: ${stipends.size}. Amounts are actual recorded payments, not additional entitlements. Pending means no recorded outcome. Approved corrections are included.`;
    const hash = source.digest("hex"); evidence.set("ovr", hash); evidence.set("payments", hash);
  }
  return kinds.map(kind => {
    const summary = summaries.get(kind)!;
    return { kind, label: REPORTS[kind].label, ...summary,
      // A summary hash deliberately does not claim to fingerprint unseen report
      // rows. Reports retain their original full-row fingerprints unchanged.
      sourceHash: digest(JSON.stringify({ basis: DASHBOARD_HASH_BASIS, kind, cycle: { id: cycle.id, version: cycle.version, academicYearId: cycle.academicYearId }, ...summary, evidence: evidence.get(kind) })),
      sourceHashBasis: DASHBOARD_HASH_BASIS };
  });
}
