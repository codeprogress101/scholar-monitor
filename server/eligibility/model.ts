import type {
  EligibilityOverride,
  EffectiveEligibility,
} from "./override-model.js";
import type { RequirementStatus } from "../requirements/workflow-model.js";
export const ELIGIBILITY_ENGINE = "normal-v1";
export type EligibilityReason = {
  code: string;
  message: string;
  requirementCode?: string;
  details?: string[];
};
export type EligibilitySources = {
  omission?: import('../payments/omission-source.js').OmissionSource & {reviewingOwn:boolean};
  archivedGraduate?: boolean;
  finalSemesterGraduation?: { requestId: string; semesterId: string };
  reservedSemester?: boolean;
  semesterPayroll?: import("./semester-sources.js").SemesterPayrollSources;
  cycle: {
    id: string;
    versionId: string;
    version: number;
    state: string;
    targetDate: string;
    academicYearId: string;
    semesterId: string;
    periodUnavailable: boolean;
  };
  scholarship: {
    id: string;
    scholarId: string;
    humanId: string;
    name: string;
    personVersion: number;
    qualification: string;
    qualificationVersion: number;
    status: string | null;
    statusVersion: number;
    statusEffectiveOn: string | null;
  };
  official: {
    rootId: string | null;
    masterlistId: string | null;
    version: number | null;
    amendmentRevision: number;
    snapshotHash: string | null;
    effectiveOn: string | null;
    valid: boolean;
  };
  checklist: { id: string; cycleVersionId: string; policyDate: string } | null;
  requirements: {
    definitionVersionId: string;
    code: string;
    policyRevision: number;
    allowWaiver: boolean;
    instanceId: string | null;
    version: number;
    status: RequirementStatus | null;
    latestEventId: string | null;
    satisfied: boolean;
    documentException?: import("../requirements/entrant-grading-card.js").EntrantCard;
  }[];
};
export type EligibilityAssessment = {
  engineVersion: string;
  eligible: boolean;
  reasons: EligibilityReason[];
  sourceHash: string;
  sources: EligibilitySources;
};
export type EligibilitySnapshot = EligibilityAssessment & {
  id: string;
  revision: number;
  calculatedAt: string;
  actorName: string;
  reason: string;
  reference: string;
};
export type EligibilityView = {
  overrides: EligibilityOverride[];
  effective: EffectiveEligibility;
  current: EligibilityAssessment;
  latest: EligibilitySnapshot | null;
  stale: boolean;
  canCalculate: boolean;
  history: EligibilitySnapshot[];
};
