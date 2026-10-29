export type SelectionScope = { mode: "all" | "page"; q: string; scholarIds: string[] };
export type SelectionCounts = { matching: number; eligible: number; alreadyOnDraft: number; activated: number; blocked: number };
export type SelectionItem = {
  scholarId: string; humanId: string | null; name: string;
  category: "eligible" | "alreadyOnDraft" | "activated" | "blocked";
  reasons: string[];
  official: { masterlistId: string | null; title: string | null; yearCode: string; effectiveOn: string | null } | null;
};
export type SelectionReview = {
  draftId: string; academicYearId: string; yearCode: string; version: number;
  scope: SelectionScope; fingerprint: string; counts: SelectionCounts;
  selectedAddable: number; canAdd: boolean; items: SelectionItem[]; total: number; offset: number; limit: number;
  limits: { matching: number; additions: number };
};
export type SelectionResult = { id: string; version: number; addedCount: number };
export type ActivationConflictPage = {
  applicable: boolean; draftId: string; yearCode: string; total: number; offset: number; limit: number;
  items: { scholarId: string; humanId: string | null; name: string; official: SelectionItem["official"]; reason: string }[];
};
