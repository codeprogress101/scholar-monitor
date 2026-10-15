export function philippineDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Manila", year:"numeric", month:"2-digit", day:"2-digit"}).format(now);
}
export function claimPeriodEnded(endsOn: string | null, currentDay: string): boolean {
  return !endsOn || currentDay > endsOn;
}
