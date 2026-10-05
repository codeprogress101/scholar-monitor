export type PayoutState = "draft" | "open" | "locked" | "closed";
export type PayoutRequirement = {
  definitionVersionId: string;
  code: string;
  name: string;
  revision: number;
  allowWaiver: boolean;
};
export type PayoutCycle = {
  id: string;
  code: string;
  semesterId: string;
  academicYearId: string;
  semesterCode: string;
  yearCode: string;
  versionId: string;
  version: number;
  name: string;
  targetDate: string;
  state: PayoutState;
  periodUnavailable: boolean;
  requirements: PayoutRequirement[];
  action: string;
  reason: string;
  reference: string;
  actorName: string;
  recordedAt: string;
};
