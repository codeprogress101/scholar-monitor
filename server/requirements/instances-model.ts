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
};
export type RequirementChecklist = {
  id: string;
  scholarshipRecordId: string;
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
