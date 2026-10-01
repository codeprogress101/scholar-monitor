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
  entries: DraftEntry[];
  validation: DraftValidation;
};
