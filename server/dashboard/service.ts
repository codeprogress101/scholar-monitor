import { validationDetails } from "../validation-details.js";
import { z } from "zod";
import type { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { REPORTS, type ReportKind } from "../reports/model.js";
import { currentPayout } from "../payouts/service.js";
import { dashboardCards } from "./summary.js";
import {annualOverview,payrollOverview} from "./overview.js";

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
  annual(actor:string,raw:unknown) {
    const q=parseDashboard(raw);
    return this.authorization.readSnapshot(actor,"configuration.read",async (db,access)=>{
      if(!access.permissions.some(p=>p.code==="scholars.read"))throw new AuthError(403,"PERMISSION_DENIED","Scholar summary requires scholar access.");
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      return annualOverview(db,await currentPayout(db,q.cycleId));
    });
  }
  payroll(actor:string,raw:unknown) {
    const q=parseDashboard(raw);
    return this.authorization.readSnapshot(actor,"configuration.read",async (db,access)=>{
      if(!access.permissions.some(p=>p.code==="ovr.process"))throw new AuthError(403,"PERMISSION_DENIED","Payroll outcome summary requires Payment Recording access.");
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      return payrollOverview(db,await currentPayout(db,q.cycleId));
    });
  }
  async read(actor: string, raw: unknown) {
    const q = parseDashboard(raw);
    return this.authorization.readSnapshot(
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
        const cards = await dashboardCards(db, cycle, kinds);
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
