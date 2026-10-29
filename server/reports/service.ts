import { dashboardCards } from "../dashboard/summary.js";
import { createHash } from "node:crypto";
import { cachedReads } from "../read-cache.js";
import { cohortReads } from "../eligibility/cohort-reads.js";
import { candidateReads } from "../ovr/candidate-reads.js";
import { decodeStoredJson } from "../stored-json.js";
import type { OvrBatch } from "../ovr/model.js";
import { graduationRecords, annualOperationalStatus } from "../status/graduation.js";
import { validationDetails } from "../validation-details.js";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { currentPayout } from "../payouts/service.js";
import { eligibilitySources, eligibilityView } from "../eligibility/service.js";
import type { EligibilityView } from "../eligibility/model.js";
import { ovrEligibilityIssues } from "../ovr/rules.js";
import { effectiveRoster } from "../ovr/amendment-state.js";
import { paymentRecords, reconcilePayments } from "../ovr/processing-state.js";
import { requirementWorkload } from "./requirement-workload.js";
import {
  REPORTS,
  type ReportKind,
  type OperationalReport,
  type ReportRow,
  type ReportPage,
} from "./model.js";

// Decode and validate the latest event only; reports do not need every prior
// review's expanded cohort evidence. Frozen roster integrity is still checked
// independently by effectiveRoster, including approved amendments.
async function latestBatch(db: PoolConnection, id: string): Promise<OvrBatch> {
  const [[row]] = await db.execute<RowDataPacket[]>("SELECT snapshot FROM ovr_batch_events WHERE batch_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE", [id]);
  if (!row) throw new AuthError(404, "OVR_NOT_FOUND", "Payroll batch not found.");
  return decodeStoredJson<OvrBatch>(row.snapshot);
}

export function parseReport(raw: unknown) {
  const result = z
    .object({
      kind: z.enum([
        "scholars",
        "missing",
        "verification",
        "eligibility",
        "ovr",
        "payments",
        "masterlists",
      ]),
      cycleId: z.uuid(),
      offset: z.coerce.number().int().min(0).max(100000).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    })
    .strict()
    .safeParse(raw);
  if (!result.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Choose a report and payout cycle, with a valid page size (1-100).",
      validationDetails(result.error),
    );
  return result.data;
}
export class ReportService {
  constructor(private authorization: AuthorizationService) {}
  async page(actor: string, raw: unknown): Promise<ReportPage> {
    const q = parseReport(raw);
    return this.authorization.readSnapshot<ReportPage>(actor, REPORTS[q.kind].permission, async db => {
      const report = await readOperationalReport(db, q, undefined, true);
      const paged = ["scholars", "eligibility", "masterlists", "ovr"].includes(q.kind);
      return { ...report, sourceHashBasis: paged ? "report-page-v1" : "report-content-v1", countsScope: paged ? "page" : "report" };
    });
  }
  async summary(actor: string, raw: unknown) {
    const q = parseReport(raw);
    return this.authorization.readSnapshot(actor, REPORTS[q.kind].permission, async db => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const cycle = await currentPayout(db, q.cycleId);
      // Reuse R03's authoritative aggregates and domain readers. A summary
      // fingerprint identifies aggregate evidence, never unseen detail rows.
      const [{ label: _label, ...summary }] = await dashboardCards(db, cycle, [q.kind]);
      void _label;
      return { ...summary, generatedAt: new Date().toISOString(),
        cycle: { id: cycle.id, code: cycle.code, version: cycle.version, academicYearId: cycle.academicYearId },
        period: { semesterId: cycle.semesterId, semesterCode: cycle.semesterCode, academicYearCode: cycle.yearCode } };

    });
  }
  async read(actor: string, raw: unknown): Promise<OperationalReport> {
    const q = parseReport(raw);
    return this.authorization.readSnapshot(
      actor,
      REPORTS[q.kind].permission,
      async (db) => {
        return readOperationalReport(db, q);
      },
    );
  }
}

// Caller-owned transaction reader. Complete reports retain their original hash contract.
export async function readOperationalReport(
  db: PoolConnection,
  q: ReturnType<typeof parseReport>,
  assessments?: Map<string, EligibilityView>,
  pageOnly = false,
): Promise<OperationalReport> {
  // Same guard as operational writes: each report is one consistent transaction.
  await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
  const cycle = await currentPayout(db, q.cycleId);
  const context = { id: cycle.id, code: cycle.code, version: cycle.version, academicYearId: cycle.academicYearId };
  const pageScope = pageOnly && ["scholars", "eligibility", "masterlists", "ovr"].includes(q.kind);
  let total = 0, scopeTotal: number | undefined;
  const hash = createHash("sha256");
  let hashing = false;
  const rows: ReportRow[] = [],
    counts: Record<string, number> = {};
  const bump = (key: string) => {
    counts[key] = (counts[key] ?? 0) + 1;
  };
  let columns: string[],
    scope = "Selected payout cycle";
  const bounded = (items: unknown[] | number, maximum = 1000, unit = "source records") => {
    if ((typeof items === "number" ? items : items.length) > maximum)
      throw new AuthError(
        422,
        "REPORT_SCOPE_TOO_LARGE",
        `This scope exceeds ${maximum.toLocaleString("en-US")} ${unit}. No partial report was returned. Narrow the reporting period.`,
      );
  };
  // Stream the original JSON hash in exactly the original property/row order.
  // Retain only the requested page; the compatibility hash still covers all rows.
  const append = (row: ReportRow) => {
    if (!hashing) { hash.update(JSON.stringify({ kind: q.kind, cycle: context, columns, rows: [] }).slice(0, -2)); hashing = true; }
    if (total) hash.update(",");
    hash.update(JSON.stringify(row));
    if (pageScope || (total >= q.offset && total < q.offset + q.limit)) rows.push(row);
    total++;
    bounded(total, 50000, "report rows");
  };
  const countScope = async (sql: string, values: string[], maximum: number, unit?: string) => {
    const [[count]] = await db.execute<RowDataPacket[]>(sql, values);
    const n = Number(count.n); bounded(n, maximum, unit); return n;
  };
  if (q.kind === "masterlists") {
    scope = "All masterlist versions in the cycle's academic year";
    columns = ["Title", "Version", "Status", "Entries"];
    if (pageScope) scopeTotal = await countScope("SELECT COUNT(*) AS n FROM masterlist_versions WHERE academic_year_id=?", [cycle.academicYearId], 1000);
    const [items] = await db.execute<RowDataPacket[]>(
      `SELECT m.id,m.title,m.version,m.status,(SELECT COUNT(*) FROM masterlist_entries e WHERE e.masterlist_id=m.id AND e.removed_at IS NULL) AS n FROM masterlist_versions m WHERE m.academic_year_id=? ORDER BY m.title,m.version,m.id LIMIT ${pageScope ? `${q.limit} OFFSET ${q.offset}` : "1001"} LOCK IN SHARE MODE`,
      [cycle.academicYearId],
    );
    bounded(items);
    for (const m of items) {
      append({
        id: m.id,
        values: [m.title, String(m.version), m.status, String(m.n)],
      });
      bump(m.status);
    }
  } else if (q.kind === "ovr" || q.kind === "payments") {
    columns =
      q.kind === "ovr"
        ? [
            "Payroll",
            "Status",
            "Revision",
            "Final roster",
            "Recorded outcomes",
            "Paid total",
            "Not paid",
            "Pending outcomes",
          ]
        : ["Payroll", "Scholar ID", "Name", "Outcome", "Amount", "Effective date", "Attempt / unpaid reason"];
    if (pageScope) scopeTotal = await countScope("SELECT COUNT(*) AS n FROM ovr_batches WHERE cycle_id=?", [cycle.id], 1000);
    const [items] = await db.execute<RowDataPacket[]>(
      `SELECT id FROM ovr_batches WHERE cycle_id=? ORDER BY code,id LIMIT ${pageScope ? `${q.limit} OFFSET ${q.offset}` : "1001"} LOCK IN SHARE MODE`,
      [cycle.id],
    );
    bounded(items);
    const uniqueStipends = new Set<string>();
    for (const item of items) {
      const batch = await latestBatch(db, item.id),
        roster = await effectiveRoster(db, item.id),
        payments = await paymentRecords(db, item.id);
      const reconciliation = q.kind === "ovr" ? reconcilePayments(roster?.snapshot ?? null, payments) : null;
      // Same first matching outcome as the historical array.find projection.
      const paymentsByScholar = new Map<string, typeof payments[number]>();
      if (q.kind === "payments") for (const payment of payments) if (!paymentsByScholar.has(payment.scholarshipId)) paymentsByScholar.set(payment.scholarshipId, payment);
      if (q.kind === "ovr") {
        append({
          id: batch.id,
          values: [
            batch.code,
            batch.state,
            String(batch.revision),
            roster ? String(reconciliation!.required) : "Not finalized",
            String(reconciliation!.recorded),
            reconciliation!.paidTotal,
            String(reconciliation!.notPaid),
            String(reconciliation!.missingScholarshipIds.length),
          ],
        });
        bump(batch.state);
      } else {
        for (const entry of roster?.snapshot.entries ?? []) {
          uniqueStipends.add(entry.scholarshipId);
          const person = entry.evidence.current.sources.scholarship,
            payment = paymentsByScholar.get(entry.scholarshipId),
            outcome = payment?.outcome ?? "pending";
          append({
            id: `${batch.id}:${entry.scholarshipId}`,
            values: [
              batch.code,
              person.humanId,
              person.name,
              outcome,
              payment?.amount ?? "Not recorded",
              payment?.effectiveOn ?? "Not recorded",
              [entry.evidence.reprocessing ? `Reprocessing from ${entry.evidence.reprocessing.sourceCode}` : "Original attempt", payment?.unpaidReason ?? (outcome === "not_paid" ? "Needs classification" : "")].filter(Boolean).join("; "),
            ],
          });
          bump(outcome);
        }
      }
    }
    if (q.kind === "payments")
      scope = `Processing attempts: ${total}; unique semester stipends: ${uniqueStipends.size}. Amounts are actual recorded payments, not additional entitlements. Pending means no recorded outcome. Approved corrections are included.`;
  } else {
    const items: RowDataPacket[] = [];
    if (pageScope) scopeTotal = await countScope("SELECT COUNT(*) AS n FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE r.academic_year_id=?", [cycle.academicYearId], 5000, "annual scholar records");
    for (let offset = 0; ; offset += 250) {
      const [page] = await db.execute<RowDataPacket[]>(
        `SELECT r.id,r.scholar_id,i.human_id,CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')) AS name,r.status,r.operational_status FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE r.academic_year_id=? ORDER BY i.human_id,r.id LIMIT ${pageScope ? q.limit : 250} OFFSET ${pageScope ? q.offset : offset} LOCK IN SHARE MODE`, [cycle.academicYearId]);
      items.push(...page);
      bounded(items, 5000, "annual scholar records");
      if (pageScope || page.length < 250) break;
    }
    columns =
      q.kind === "scholars"
        ? ["Scholar ID", "Name", "Qualification", "Operational status"]
        : q.kind === "eligibility"
          ? [
              "Scholar ID",
              "Name",
              "Eligibility",
              "Payroll eligibility checks",
              "Reasons",
              "Source fingerprint",
            ]
          : ["Scholar ID", "Name", "Requirement", "Status"];
    if (q.kind === "scholars")
      scope =
        "All annual scholarship records in the cycle's academic year (including inactive and terminal statuses)";
    const graduates = q.kind === "scholars" ? await graduationRecords(db) : null;
    for (let start = 0; start < items.length; start += 200) {
      const chunk = items.slice(start, start + 200), ids = chunk.map(r => String(r.id));
      const reads = q.kind === "scholars" ? db : await cohortReads(await candidateReads(cachedReads(db), ids, cycle.semesterId), cycle.academicYearId, cycle.semesterId, cycle.id, ids, q.kind === "eligibility" || Boolean(assessments));
      for (const item of chunk) {
        if (q.kind === "scholars") {
          const status = annualOperationalStatus(item.id, item.operational_status, graduates?.get(item.scholar_id));
          append({
            id: item.id,
            values: [
              item.human_id,
              item.name,
              item.status,
              status ?? "Not assigned",
            ],
          });
          bump(status ?? "not_assigned");
          continue;
        }
        const cacheKey = `${cycle.id}:${item.id}`;
        if (q.kind === "eligibility") {
          const view = assessments?.get(cacheKey) ?? await eligibilityView(reads, cycle, item.id);
          assessments?.set(cacheKey, view);
          const issues = ovrEligibilityIssues(view);
          append({
            id: item.id,
            values: [
              item.human_id,
              item.name,
              view.current.sources.semesterPayroll?.priorApproval?.valid ? `${view.effective.label} - prior batch assessment (${view.current.sources.semesterPayroll.priorApproval.reference})` : view.effective.label,
              issues.length ? "Blocked" : "Passed",
              issues.map((i) => i.message).join(" "),
              view.current.sourceHash,
            ],
          });
          bump(view.effective.eligible ? "eligible" : "ineligible");
          bump(issues.length ? "ovr_blocked" : "ovr_passed");
        } else {
          // Requirement workload uses the same sources; saved eligibility and
          // override histories cannot change a document's workflow status.
          let sources = assessments?.get(cacheKey)?.current.sources;
          if (!sources && assessments) {
            const view = await eligibilityView(reads, cycle, item.id);
            assessments.set(cacheKey, view);
            sources = view.current.sources;
          }
          sources ??= await eligibilitySources(reads, cycle, item.id);
          for (const requirement of sources.requirements) {
            const workload = requirementWorkload(requirement);
            if (!workload || workload.kind !== q.kind) continue;
            const { status } = workload;
            append({
              id: `${item.id}:${requirement.definitionVersionId}`,
              values: [item.human_id, item.name, requirement.code, status],
            });
            bump(status);
          }
        }
      }
    }
    if (q.kind === "missing")
      scope =
        "Payout requirements not generated, not submitted, returned for correction, or rejected; one row per document.";
    if (q.kind === "verification")
      scope =
        "Received or resubmitted payout documents awaiting verification; one row per document.";
    if (q.kind === "eligibility")
      scope =
        "Current F19 eligibility and the same eligibility checks used by Payroll validation. Batch duplicates, workflow locks, and frozen evidence are checked when preparing a Payroll.";
  }
  bounded(rows, 50000, "report rows");
  if (!hashing) hash.update(JSON.stringify({ kind: q.kind, cycle: context, columns, rows: [] }).slice(0, -2));
  hash.update("]}");
  return {
    kind: q.kind as ReportKind,
    generatedAt: new Date().toISOString(),
    sourceHash: hash.digest("hex"),
    cycle: context,
    scope,
    columns,
    items: rows,
    total: scopeTotal ?? total,
    counts,
    offset: q.offset,
    limit: q.limit,
  };
}
