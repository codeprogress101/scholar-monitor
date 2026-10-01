import type { DraftEntry } from "./model.js";
export const AMENDMENT_KINDS = [
  "course_shift",
  "school_transfer",
  "both",
  "year_level_correction",
  "award_number",
  "identity_refresh",
] as const;
export type AmendmentKind = (typeof AMENDMENT_KINDS)[number];
export type AmendmentView = {
  versionLabel: string;
  rootId: string;
  latestId: string;
  canRequest: boolean;
  versions: { id: string; label: string; publishedAt: string }[];
  requests: {
    id: string;
    scholarId: string;
    kind: AmendmentKind;
    before: DraftEntry;
    after: DraftEntry;
    effectiveOn: string;
    reason: string;
    reference: string;
    actorId: string;
    actorName: string;
    createdAt: string;
    decision: null | {
      action: string;
      actorName: string;
      reason: string;
      reference: string;
      occurredAt: string;
    };
    publishedId: string | null;
  }[];
};
export type AmendmentResult = {
  amendmentId: string;
  masterlistId: string | null;
  outcome: string;
};
