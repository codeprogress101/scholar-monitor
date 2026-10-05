import type { ReceivingPeriod } from "../server/requirements/instances-model";
export function defaultReceivingPeriod(periods: ReceivingPeriod[]): string {
  const openPayouts = periods.filter((p) => p.preferred && p.payoutCycleId);
  if (openPayouts.length)
    return openPayouts.length === 1 ? openPayouts[0].id : "";
  const current = periods.filter((p) => p.preferred);
  return current.length === 1
    ? current[0].id
    : periods.length === 1
      ? periods[0].id
      : "";
}
export const receivingToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
