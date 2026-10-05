import type { RequirementWaiver } from "./waiver-model.js";
import type {
  RequirementStatus,
  RequirementWorkflowEvent,
} from "./workflow-model.js";
export type RequirementReceipt = {
  id: string;
  receivedOn: string;
  physicalReference: string | null;
  storageLocation: string;
  remarks: string | null;
  reason: string;
  receiverName: string;
  recordedAt: string;
};
export type RequirementInstance = {
  id: string;
  definitionVersionId: string;
  code: string;
  name: string;
  instructions: string;
  revision: number;
  status: RequirementStatus;
  history: RequirementWorkflowEvent[];
  satisfiesNormalRequirement: boolean;
  version: number;
  receipt: RequirementReceipt | null;
  allowWaiver: boolean;
  satisfiesPayoutRequirement: boolean | null;
  waiver: RequirementWaiver | null;
};
export type RequirementChecklist = {
  id: string;
  scholarshipRecordId: string;
  payoutCycleId: string | null;
  payoutVersionId: string | null;
  payoutCode: string | null;
  payoutState: import("../payouts/model.js").PayoutState | null;
  semesterId: string;
  policyDate: string;
  yearCode: string;
  yearName: string;
  semesterCode: string;
  semesterName: string;
  semesterVersion: number;
  reason: string;
  reference: string;
  actorName: string;
  createdAt: string;
  periodUnavailable: boolean;
  items: RequirementInstance[];
};
export type GenerationResult = { id: string; created: boolean; count: number };
export type ReceivingPeriod = {
  id: string;
  semesterId: string;
  semesterVersion: number;
  payoutCycleId: string | null;
  payoutVersion: number | null;
  label: string;
  preferred: boolean;
  canProvision: boolean;
};
