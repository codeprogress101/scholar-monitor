import { validationDetails } from "../validation-details.js";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { currentPayout } from "../payouts/service.js";
import { eligibilityView } from "../eligibility/service.js";
import type { EligibilityView } from "../eligibility/model.js";
import { ovrEligibilityIssues } from "../ovr/rules.js";
import { ovrHistory } from "../ovr/service.js";
import { effectiveRoster } from "../ovr/amendment-state.js";
import { paymentRecords, reconcilePayments } from "../ovr/processing-state.js";
import {
  REPORTS,
  type ReportKind,
  type OperationalReport,
  type ReportRow,
} from "./model.js";

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
  async read(actor: string, raw: unknown): Promise<OperationalReport> {
    const q = parseReport(raw);
    return this.authorization.withPermission(
      actor,
      REPORTS[q.kind].permission,
      async (db) => {
        return readOperationalReport(db, q);
      },
    );
  }
}

// Shared transaction reader for reports and the dashboard.
export async function readOperationalReport(
  db: PoolConnection,
  q: ReturnType<typeof parseReport>,
  assessments?: Map<string, EligibilityView>,
): Promise<OperationalReport> {
  // Same guard as operational writes: each report is one consistent transaction.
  await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
  const cycle = await currentPayout(db, q.cycleId);
  const rows: ReportRow[] = [],
    counts: Record<string, number> = {};
  const bump = (key: string) => {
    counts[key] = (counts[key] ?? 0) + 1;
  };
  let columns: string[],
    scope = "Selected payout cycle";
  const bounded = (items: unknown[]) => {
    if (items.length > 1000)
      throw new AuthError(
        422,
        "REPORT_SCOPE_TOO_LARGE",
        "This scope exceeds 1,000 source records. No partial report was returned.",
      );
  };
  if (q.kind === "masterlists") {
    scope = "All masterlist versions in the cycle's academic year";
    columns = ["Title", "Version", "Status", "Entries"];
    const [items] = await db.execute<RowDataPacket[]>(
      "SELECT m.id,m.title,m.version,m.status,(SELECT COUNT(*) FROM masterlist_entries e WHERE e.masterlist_id=m.id AND e.removed_at IS NULL) AS n FROM masterlist_versions m WHERE m.academic_year_id=? ORDER BY m.title,m.version,m.id LIMIT 1001 LOCK IN SHARE MODE",
      [cycle.academicYearId],
    );
    bounded(items);
    for (const m of items) {
      rows.push({
        id: m.id,
        values: [m.title, String(m.version), m.status, String(m.n)],
      });
      bump(m.status);
    }
  } else if (q.kind === "ovr" || q.kind === "payments") {
    columns =
      q.kind === "ovr"
        ? [
            "OVR",
            "Status",
            "Revision",
            "Final roster",
            "Recorded outcomes",
            "Paid total",
            "Not paid",
            "Pending outcomes",
          ]
        : ["OVR", "Scholar ID", "Name", "Outcome", "Amount", "Effective date"];
    const [items] = await db.execute<RowDataPacket[]>(
      "SELECT id FROM ovr_batches WHERE cycle_id=? ORDER BY code,id LIMIT 1001 LOCK IN SHARE MODE",
      [cycle.id],
    );
    bounded(items);
    for (const item of items) {
      const batch = (await ovrHistory(db, item.id))[0],
        roster = await effectiveRoster(db, item.id),
        payments = await paymentRecords(db, item.id);
      const reconciliation = reconcilePayments(
        roster?.snapshot ?? null,
        payments,
      );
      if (q.kind === "ovr") {
        rows.push({
          id: batch.id,
          values: [
            batch.code,
            batch.state,
            String(batch.revision),
            roster ? String(reconciliation.required) : "Not finalized",
            String(reconciliation.recorded),
            reconciliation.paidTotal,
            String(reconciliation.notPaid),
            String(reconciliation.missingScholarshipIds.length),
          ],
        });
        bump(batch.state);
      } else {
        for (const entry of roster?.snapshot.entries ?? []) {
          const person = entry.evidence.current.sources.scholarship,
            payment = payments.find(
              (p) => p.scholarshipId === entry.scholarshipId,
            ),
            outcome = payment?.outcome ?? "pending";
          rows.push({
            id: `${batch.id}:${entry.scholarshipId}`,
            values: [
              batch.code,
              person.humanId,
              person.name,
              outcome,
              payment?.amount ?? "Not recorded",
              payment?.effectiveOn ?? "Not recorded",
            ],
          });
          bump(outcome);
        }
      }
    }
    if (q.kind === "payments")
      scope =
        "Effective finalized rosters only; pending means no recorded outcome. Approved roster and payment corrections are included.";
  } else {
    const [items] = await db.execute<RowDataPacket[]>(
      "SELECT r.id,i.human_id,CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')) AS name,r.status,r.operational_status FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE r.academic_year_id=? ORDER BY i.human_id,r.id LIMIT 1001 LOCK IN SHARE MODE",
      [cycle.academicYearId],
    );
    bounded(items);
    columns =
      q.kind === "scholars"
        ? ["Scholar ID", "Name", "Qualification", "Operational status"]
        : q.kind === "eligibility"
          ? [
              "Scholar ID",
              "Name",
              "Eligibility",
              "OVR eligibility checks",
              "Reasons",
              "Source fingerprint",
            ]
          : ["Scholar ID", "Name", "Requirement", "Status"];
    if (q.kind === "scholars")
      scope =
        "All annual scholarship records in the cycle's academic year (including inactive and terminal statuses)";
    for (const item of items) {
      if (q.kind === "scholars") {
        rows.push({
          id: item.id,
          values: [
            item.human_id,
            item.name,
            item.status,
            item.operational_status ?? "Not assigned",
          ],
        });
        bump(item.operational_status ?? "not_assigned");
        continue;
      }
      const cacheKey = `${cycle.id}:${item.id}`;
      const view =
        assessments?.get(cacheKey) ??
        (await eligibilityView(db, cycle, item.id));
      assessments?.set(cacheKey, view);
      if (q.kind === "eligibility") {
        const issues = ovrEligibilityIssues(view);
        rows.push({
          id: item.id,
          values: [
            item.human_id,
            item.name,
            view.effective.label,
            issues.length ? "Blocked" : "Passed",
            issues.map((i) => i.message).join(" "),
            view.current.sourceHash,
          ],
        });
        bump(view.effective.eligible ? "eligible" : "ineligible");
        bump(issues.length ? "ovr_blocked" : "ovr_passed");
      } else {
        for (const requirement of view.current.sources.requirements) {
          const status = requirement.status ?? "not_generated";
          if (
            q.kind === "missing"
              ? ![
                  "not_generated",
                  "not_submitted",
                  "for_correction",
                  "rejected",
                ].includes(status)
              : status !== "for_verification"
          )
            continue;
          rows.push({
            id: `${item.id}:${requirement.definitionVersionId}`,
            values: [item.human_id, item.name, requirement.code, status],
          });
          bump(status);
        }
      }
    }
    if (q.kind === "missing")
      scope =
        "Payout requirements not generated, not submitted, returned for correction, or rejected; one row per document.";
    if (q.kind === "verification")
      scope =
        "Payout documents explicitly sent for verification; one row per document.";
    if (q.kind === "eligibility")
      scope =
        "Current F19 eligibility and the same eligibility checks used by OVR validation. Batch duplicates, workflow locks, and frozen evidence are checked when preparing an OVR.";
  }
  const context = {
    id: cycle.id,
    code: cycle.code,
    version: cycle.version,
    academicYearId: cycle.academicYearId,
  };
  return {
    kind: q.kind as ReportKind,
    generatedAt: new Date().toISOString(),
    sourceHash: digest(
      JSON.stringify({ kind: q.kind, cycle: context, columns, rows }),
    ),
    cycle: context,
    scope,
    columns,
    items: rows.slice(q.offset, q.offset + q.limit),
    total: rows.length,
    counts,
    offset: q.offset,
    limit: q.limit,
  };
}
