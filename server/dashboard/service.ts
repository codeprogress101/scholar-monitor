import { validationDetails } from "../validation-details.js";
import { z } from "zod";
import type { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { REPORTS, type ReportKind } from "../reports/model.js";
import { readOperationalReport } from "../reports/service.js";
import { currentPayout } from "../payouts/service.js";
import type { EligibilityView } from "../eligibility/model.js";

export function parseDashboard(raw: unknown) {
  const result = z.object({ cycleId: z.uuid() }).strict().safeParse(raw);
  if (!result.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Choose a payout cycle for the dashboard.",
      validationDetails(result.error),
    );
  return result.data;
}
export class DashboardService {
  constructor(private authorization: AuthorizationService) {}
  async read(actor: string, raw: unknown) {
    const q = parseDashboard(raw);
    return this.authorization.withPermission(
      actor,
      "configuration.read",
      async (db, access) => {
        const kinds = (Object.keys(REPORTS) as ReportKind[]).filter((kind) =>
          access.permissions.some((p) => p.code === REPORTS[kind].permission),
        );
        if (!kinds.length)
          throw new AuthError(
            403,
            "PERMISSION_DENIED",
            "Operational dashboard requires scholarship access.",
          );
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const cycle = await currentPayout(db, q.cycleId);
        const cards = [];
        const assessments = new Map<string, EligibilityView>();
        for (const kind of kinds) {
          const report = await readOperationalReport(
            db,
            {
              kind,
              cycleId: cycle.id,
              limit: 1,
              offset: 0,
            },
            assessments,
          );
          cards.push({
            kind,
            label: REPORTS[kind].label,
            total: report.total,
            counts: report.counts,
            scope: report.scope,
            sourceHash: report.sourceHash,
          });
        }
        return {
          generatedAt: new Date().toISOString(),
          context: {
            cycleId: cycle.id,
            cycleCode: cycle.code,
            cycleName: cycle.name,
            cycleVersion: cycle.version,
            state: cycle.state,
            academicYearId: cycle.academicYearId,
            yearCode: cycle.yearCode,
            semesterCode: cycle.semesterCode,
            targetDate: cycle.targetDate,
          },
          cards,
        };
      },
    );
  }
}
export type Dashboard = Awaited<ReturnType<DashboardService["read"]>>;
