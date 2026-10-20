import type { VerificationContext, RequirementStatus } from "./workflow-model.js";

export type HistoricalPlacementReview = {
  sourceHash: string;
  academicYearId: string;
  yearCode: string;
  schoolId: string;
  schoolName: string;
  courseId: string;
  courseName: string;
};
export type BatchDocument = {
  id: string;
  scholarId: string;
  humanId: string;
  name: string;
  kind: "cor" | "cog";
  coverage: string;
  coverageYearId: string;
  status: RequirementStatus;
  version: number;
  receivedOn: string | null;
  outcome: "ready" | "blocked" | "current" | "not_required";
  issue?: { code: string; message: string };
  context?: VerificationContext;
  contextHash?: string;
  historicalPlacement?: HistoricalPlacementReview;
};
export type DocumentBatchPreview = {
  importId: string;
  semesterId: string;
  scopeHash: string;
  scholarCount: number;
  missingScholarCount: number;
  documents: BatchDocument[];
};
