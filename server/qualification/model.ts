export const QUALIFICATION_ACTIONS = [
  "validate",
  "exam-passed",
  "qualify",
  "select",
  "not-select",
  "activate",
] as const;
export type QualificationAction = (typeof QUALIFICATION_ACTIONS)[number];
export type QualificationStatus =
  "applicant" | "exam_passed" | "qualified" | "selected" | "not_selected" | "continuing";
export type AdmissionStage = QualificationStatus | "for_validation";
export const ADMISSION_LABELS: Record<AdmissionStage, string> = {
  continuing: "Continuing",
  for_validation: "For validation", applicant: "For validation", exam_passed: "For validation",
  qualified: "Validated / for selection", selected: "Selected", not_selected: "Not selected",
};
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
  continuingFromScholarshipId?: string | null;
};
export type AdmissionReviewRow = ScholarshipRecord & { humanId: string; name: string };
export type AdmissionReviewPage = { items: AdmissionReviewRow[]; total: number; offset: number; limit: number };
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
  continuing: "Continuing",
  applicant: "Applicant",
  exam_passed: "Exam Passed",
  qualified: "Qualified",
  selected: "Selected",
  not_selected: "Not Selected",
};
