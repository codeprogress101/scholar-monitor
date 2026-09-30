export const QUALIFICATION_ACTIONS = [
  "exam-passed",
  "qualify",
  "select",
  "not-select",
  "activate",
] as const;
export type QualificationAction = (typeof QUALIFICATION_ACTIONS)[number];
export type QualificationStatus =
  "applicant" | "exam_passed" | "qualified" | "selected" | "not_selected";
export type ScholarshipRecord = {
  id: string;
  scholarId: string;
  academicYearId: string;
  yearCode: string;
  yearName: string;
  status: QualificationStatus;
  version: number;
  lastEffectiveOn: string;
  periodUnavailable: boolean;
};
export type QualificationEvent = {
  id: string;
  action: string;
  fromStatus: QualificationStatus | null;
  toStatus: QualificationStatus;
  version: number;
  actorName: string;
  effectiveOn: string;
  occurredAt: string;
  reason: string;
  reference: string;
};
export type QualificationDetail = ScholarshipRecord & {
  events: QualificationEvent[];
};
export type QualificationResult = {
  id: string;
  version: number;
  status: QualificationStatus;
};
export const STATUS_LABELS: Record<QualificationStatus, string> = {
  applicant: "Applicant",
  exam_passed: "Exam Passed",
  qualified: "Qualified",
  selected: "Selected",
  not_selected: "Not Selected",
};
