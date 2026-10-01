export const REQUIREMENT_ACTIONS = [
  "send-for-verification",
  "verify",
  "return-for-correction",
  "resubmit",
  "reject",
] as const;
export type RequirementAction = (typeof REQUIREMENT_ACTIONS)[number];
export type RequirementStatus =
  | "not_submitted"
  | "submitted"
  | "for_verification"
  | "verified"
  | "for_correction"
  | "resubmitted"
  | "rejected";
export const REQUIREMENT_STATUS_LABELS: Record<RequirementStatus, string> = {
  not_submitted: "Not Submitted",
  submitted: "Submitted",
  for_verification: "For Verification",
  verified: "Verified",
  for_correction: "For Correction",
  resubmitted: "Resubmitted",
  rejected: "Rejected",
};
export type VerificationContext = {
  scholarId: string;
  scholarVersion: number;
  humanId: string;
  scholarName: string;
  academicYearId: string;
  yearCode: string;
  semesterId: string;
  semesterCode: string;
  schoolId: string;
  schoolName: string;
  courseId: string;
  courseName: string;
  academicVersion: number;
  definitionVersionId: string;
  placementEffectiveOn: string | null;
  policyDate: string;
};
export type RequirementWorkflowEvent = {
  id: string;
  version: number;
  action: RequirementAction;
  fromStatus: RequirementStatus;
  toStatus: RequirementStatus;
  effectiveOn: string;
  reason: string;
  reference: string;
  remarks: string | null;
  correctionOf: string | null;
  actorName: string;
  recordedAt: string;
  details: {
    verification?: VerificationContext;
    checks?: Record<string, boolean>;
    receipt?: {
      receivedOn: string;
      physicalReference: string | null;
      storageLocation: string;
      remarks: string | null;
    };
  };
};
export const satisfiesNormalRequirement = (status: RequirementStatus) =>
  status === "verified";
