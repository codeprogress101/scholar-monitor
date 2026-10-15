import type { ReceivingPeriod } from "../server/requirements/instances-model";
import type { ConfigRecord } from "../server/configuration/model";
import type { ScholarshipRecord } from "../server/qualification/model";

export function defaultReceivingYear(
  records: Pick<ScholarshipRecord, "id" | "academicYearId">[],
  years: Pick<ConfigRecord, "id" | "locked" | "archived" | "startsOn" | "endsOn" | "working">[],
  registrationYearId: string,
  day: string,
): string {
  const current = years.filter(y => y.working !== false && !y.locked && !y.archived && y.startsOn && y.endsOn && y.startsOn <= day && y.endsOn >= day);
  // Registration context resolves overlapping training/live calendars only when
  // it is current. Never fall back to a past registration year or arbitrary row.
  const year = current.length === 1 ? current[0] : current.find(y => y.id === registrationYearId);
  return records.find(r => r.academicYearId === year?.id)?.id ?? "";
}
// An explicit choice must never silently redirect receiving to another period.
export function openReceivingPeriods(periods: ReceivingPeriod[]): ReceivingPeriod[] {
  // Both receiving APIs mark current, unlocked receiving scopes as preferred.
  // canProvision is not an availability flag: existing checklists may be open.
  return periods.filter((period) => period.preferred);
}
export function resolveReceivingPeriod(periods: ReceivingPeriod[], selected: string): string {
  return selected
    ? openReceivingPeriods(periods).find((period) => period.id === selected)?.id ?? ""
    : defaultReceivingPeriod(periods);
}
export function defaultReceivingPeriod(periods: ReceivingPeriod[]): string {
  const openPayouts = periods.filter((p) => p.preferred && p.payoutCycleId);
  if (openPayouts.length)
    return openPayouts.length === 1 ? openPayouts[0].id : "";
  const current = periods.filter((p) => p.preferred);
  return current.length === 1 ? current[0].id : "";
}
export const receivingToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());


export type ReceivingContext = {
  annualId?: string; periodId?: string; academicYearId?: string; semesterId?: string; payoutCycleId?: string;
};
export function receivingContextFromRoute(route: URLSearchParams): ReceivingContext | undefined {
  const result = { annualId: route.get("receivingYear") ?? undefined, periodId: route.get("period") ?? undefined,
    academicYearId: route.get("receivingAcademicYear") ?? route.get("academicYear") ?? undefined, semesterId: route.get("semester") ?? undefined,
    payoutCycleId: route.get("payrollCycle") ?? undefined };
  return Object.values(result).some(Boolean) ? result : undefined;
}
export function resolveReceivingContext(periods: ReceivingPeriod[], selected: string, context: ReceivingContext | undefined, ownerId: string, semesterOwned: boolean): string {
  if (selected) return resolveReceivingPeriod(periods, selected);
  if (!context) return defaultReceivingPeriod(periods);
  if (context.annualId && context.annualId !== ownerId) return "";
  const matches = openReceivingPeriods(periods).filter(p =>
    (!context.periodId || p.id === context.periodId) &&
    (!context.academicYearId || p.academicYearId === context.academicYearId) &&
    (!context.semesterId || p.semesterId === context.semesterId) &&
    (!context.payoutCycleId || p.payoutCycleId === context.payoutCycleId || (semesterOwned && !!context.semesterId && p.payoutCycleId === null)));
  return matches.length === 1 ? matches[0].id : "";
}

export function selectedReceivingContext(ownerId: string, scholarId: string, period: ReceivingPeriod, previous?: ReceivingContext, explicit = false): ReceivingContext {
  return {annualId: ownerId === scholarId ? undefined : ownerId, periodId: period.id,
    academicYearId: period.academicYearId, semesterId: period.semesterId,
    payoutCycleId: period.payoutCycleId ?? (!explicit && previous?.semesterId === period.semesterId ? previous.payoutCycleId : undefined)};
}
