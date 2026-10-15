import type { ConfigRecord } from "../server/configuration/model";
import type { PayoutCycle } from "../server/payouts/model";

export type PayrollPeriodScope = "current" | "past" | "upcoming" | "all";
type SemesterDates = Pick<ConfigRecord, "id" | "startsOn" | "endsOn" | "working">;
export function payrollPeriodScope(semester: SemesterDates | undefined, day: string): PayrollPeriodScope {
  if (!semester?.startsOn || !semester.endsOn || semester.startsOn > semester.endsOn) return "all";
  if (semester.endsOn < day) return "past";
  if (semester.startsOn > day) return "upcoming";
  if (semester.working === false) return "all";
  return "current";
}

export function payrollPeriods<T extends Pick<PayoutCycle, "id" | "semesterId" | "targetDate" | "code">>(
  cycles: T[], semesters: SemesterDates[], scope: PayrollPeriodScope, day: string,
): T[] {
  const dates = new Map(semesters.map(s => [s.id, s]));
  return cycles.filter(c => scope === "all" || payrollPeriodScope(dates.get(c.semesterId), day) === scope)
    .sort((a, b) => (dates.get(b.semesterId)?.startsOn ?? "").localeCompare(dates.get(a.semesterId)?.startsOn ?? "")
      || b.targetDate.localeCompare(a.targetDate) || a.code.localeCompare(b.code) || a.id.localeCompare(b.id));
}
