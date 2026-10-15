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
  | "rejected"
  | "waived";
export const REQUIREMENT_STATUS_LABELS: Record<RequirementStatus, string> = {
  not_submitted: "Not Submitted",
  submitted: "Submitted",
  for_verification: "For Verification",
  verified: "Verified",
  for_correction: "For Correction",
  resubmitted: "Resubmitted",
  rejected: "Rejected",
  waived: "Waived",
};
export type VerificationContext = {
  entrantCard?: import("./entrant-grading-card.js").EntrantCard;
  scholarId: string;
  scholarVersion: number;
  humanId: string;
  scholarName: string;
  academicYearId: string;
  yearCode: string;
  semesterId: string;
  semesterCode: string;
  schoolId: string | null;
  schoolName: string;
  courseId: string | null;
  courseName: string;
  academicVersion: number;
  definitionVersionId: string;
  placementEffectiveOn: string | null;
  policyDate: string;
  coverageId?: string;
  semesterRevision?: number;
  receivingSemesterId?: string;
  receivingSemesterCode?: string;
  documentKind?: "cor" | "cog";
  receivedDocumentType?: import("./document-evidence.js").ReceivedDocumentType;
  predecessorSourceHash?: string;
};
export function verificationMatches(current: VerificationContext, saved?: VerificationContext): boolean {
  return Boolean(saved && Object.entries(current).every(([key, value]) =>
    (key === "predecessorSourceHash" && saved.predecessorSourceHash === undefined) ||
    JSON.stringify(value) === JSON.stringify(saved[key as keyof VerificationContext])));
}
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
    automaticRouting?: boolean;
    decisionAction?: string;
    verification?: VerificationContext;
    checks?: Record<string, boolean>;
    attestation?: "all-five-checked";
    receipt?: {
      documentType?: import("./document-evidence.js").ReceivedDocumentType;
      receivedOn: string;
      physicalReference: string | null;
      storageLocation: string;
      remarks: string | null;
    };
  };
};
export const satisfiesNormalRequirement = (
  status: RequirementStatus,
  allowWaiver = true,
) => status === "verified" || (status === "waived" && allowWaiver);
