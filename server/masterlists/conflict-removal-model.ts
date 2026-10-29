import type { ActivationConflictPage } from "./selection-model.js";

export type ConflictRemovalScope = { mode: "all" | "selected"; scholarIds: string[] };
export type ConflictRemovalReview = {
  draftId: string; title: string; academicYearId: string; yearCode: string; version: number;
  scope: ConflictRemovalScope; fingerprint: string; membershipCount: number; conflictCount: number;
  selectedIds: string[]; selectedCount: number; remainingCount: number; limit: number;
  items: ActivationConflictPage["items"]; total: number; offset: number; pageSize: number;
};
export type ConflictRemovalResult = { id: string; version: number; removedCount: number; remainingCount: number };
