import type { ConfigRecord } from "../server/configuration/model";
import type { ScholarshipRecord } from "../server/qualification/model";

export type ReceivingAvailability = {
  cohort?: string | null;
  graduation?: import("../server/status/graduation").Graduation | null;
  supported: boolean;
  semesterYears: string[];
  memberships: { academicYearId: string; published: boolean }[];
};

export function receivingYears(years: ConfigRecord[], registrationYearId: string, day: string) {
  const designated = years.filter(y => y.working === true);
  const dated = years.filter(y => y.working !== false && !y.archived && y.startsOn && y.endsOn && y.startsOn <= day && y.endsOn >= day);
  const current = designated.length === 1 ? designated[0] : dated.length === 1 ? dated[0] : dated.find(y => y.id === registrationYearId);
  const previous = current?.startsOn ? years.filter(y => y.id !== current.id && y.endsOn && y.endsOn < current.startsOn!).sort((a,b) => b.endsOn!.localeCompare(a.endsOn!)) : [];
  return { current, previous };
}

export function receivingAdmission(record: ScholarshipRecord | undefined, published: boolean) {
  if (published) return "Official masterlist membership confirmed.";
  if (record?.status === "selected") return "Coordinator selection complete. Masterlist publication pending.";
  if (record?.status === "continuing") return "Continuing admission accepted. Masterlist publication pending.";
  return null;
}
