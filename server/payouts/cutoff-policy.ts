/** Versioned window timing. UTC instants have microsecond precision, matching
 * MariaDB DATETIME(6). Never compare them through Date's truncated fractions. */
export const cutoffPolicies = ["whole_day_v1", "manila_1700_v1", "manila_time_v1"] as const;
export type CutoffPolicy = typeof cutoffPolicies[number];
export function cutoffPolicy(value: unknown): CutoffPolicy {
  if (value !== "whole_day_v1" && value !== "manila_1700_v1" && value !== "manila_time_v1") throw new Error("Unknown recorded cutoff policy");
  return value;
}
export function utcMicroseconds(value: string): bigint {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?Z$/.exec(value);
  const ms = m ? Date.parse(m[1] + "Z") : NaN;
  if (!m || !Number.isFinite(ms) || new Date(ms).toISOString().slice(0,19) !== m[1]) throw new Error("Invalid UTC microsecond instant");
  return BigInt(ms) * 1000n + BigInt((m[2] ?? "").padEnd(6,"0"));
}
function instant(micros: bigint) {
  let seconds=micros/1000000n,fraction=micros%1000000n;
  if(fraction<0n){seconds--;fraction+=1000000n;}
  return new Date(Number(seconds) * 1000).toISOString().slice(0,19) + "." + String(fraction).padStart(6,"0") + "Z";
}
export function windowTiming(day: string, policy: CutoffPolicy, localTime?: string) {
  cutoffPolicy(policy);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day+"T00:00:00Z")) || new Date(day+"T00:00:00Z").toISOString().slice(0,10)!==day) throw new Error("Invalid window cutoff date");
  if (policy !== "whole_day_v1" && (!localTime || !/^(?:[01]\d|2[0-3]):[0-5]\d:00$/.test(localTime) || (policy === "manila_1700_v1" && localTime !== "17:00:00"))) throw new Error("Invalid permitted local cutoff time");
  const midnight = new Date(Date.parse(day+"T00:00:00+08:00")+86400000).toISOString();
  const cutoffAtUtc = policy === "whole_day_v1" ? instant(utcMicroseconds(midnight)-1n) : new Date(day+"T"+localTime+"+08:00").toISOString().slice(0,19)+".000000Z";
  const finalizationFromUtc = policy === "whole_day_v1" ? midnight : instant(utcMicroseconds(cutoffAtUtc)+1n);
  return {cutoffPolicy:policy,cutoffAtUtc,finalizationFromUtc,cutoffExclusiveUtc:finalizationFromUtc};
}
export function windowCutoffReached(day: string, policy: CutoffPolicy, now: string, localTime?: string) {
  return utcMicroseconds(now) >= utcMicroseconds(windowTiming(day,policy,localTime).finalizationFromUtc);
}
