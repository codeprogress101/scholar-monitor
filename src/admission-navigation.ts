import type { AdmissionStage } from "../server/qualification/model";

const statuses: AdmissionStage[] = ["for_validation", "applicant", "exam_passed", "qualified", "selected", "not_selected"];
export function admissionRoute(hash: string) {
  const params = new URLSearchParams(hash.split("?")[1] ?? "");
  const status = params.get("stage");
  const rawOffset = Number(params.get("offset") ?? 0);
  return {
    year: params.get("year") ?? "",
    stage: statuses.includes(status as AdmissionStage) ? status as AdmissionStage : undefined,
    search: (params.get("q") ?? "").slice(0, 100),
    offset: Number.isInteger(rawOffset) && rawOffset >= 0 && rawOffset <= 1000000 ? Math.floor(rawOffset / 25) * 25 : 0,
  };
}
export function admissionAddress(year: string, stage: AdmissionStage, search: string, offset: number) {
  const params = new URLSearchParams({ stage });
  if (year) params.set("year", year);
  if (search) params.set("q", search);
  if (offset) params.set("offset", String(offset));
  return `#admissions?${params}`;
}
