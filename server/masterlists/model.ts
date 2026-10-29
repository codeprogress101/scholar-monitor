import type { Placement } from "../academic/changes-model.js";
export type DraftIssue = {
  scholarId: string | null;
  code: string;
  message: string;
};
export type CandidateSnapshot = {
  scholarId: string;
  humanId: string;
  name: string;
  personVersion: number;
  scholarshipId: string;
  scholarshipVersion: number;
  continuingRollover?: { scholarshipId: string; auditId: string };
  continuingAdmission?: { participationId: string; eventId: string };
  academicRecordId: string;
  academicVersion: number;
  placement: Placement;
};
export type DraftCandidate = {
  scholarId: string;
  humanId: string | null;
  name: string;
  snapshot: CandidateSnapshot | null;
  issues: DraftIssue[];
  activationConflict?: {
    masterlistId: string | null;
    title: string | null;
    yearCode: string;
    effectiveOn: string | null;
  };
};
export type Masterlist = {
  id: string;
  academicYearId: string;
  yearCode: string;
  title: string;
  status: string;
  version: number;
  count: number;
  unavailable: boolean;
  revisionKind?: string;
  latestId?: string;
};
export type DraftEntry = {
  id: string;
  scholarId: string;
  awardNumber: string | null;
  snapshot: CandidateSnapshot;
};
export type DraftValidation = {
  version: number;
  count: number;
  valid: boolean;
  issues: DraftIssue[];
};
export type DraftDetail = Masterlist & {
  proposalKind?: "standalone" | "addition" | "consolidation";
  entries: DraftEntry[];
  validation: DraftValidation;
};
