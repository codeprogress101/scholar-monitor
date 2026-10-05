import type { RequirementStatus } from "./workflow-model.js";
export type RequirementWaiver = {
  id: string;
  version: number;
  fromStatus: RequirementStatus;
  effectiveOn: string;
  reason: string;
  authorityReference: string;
  remarks: string | null;
  actorId: string;
  actorName: string;
  recordedAt: string;
};
