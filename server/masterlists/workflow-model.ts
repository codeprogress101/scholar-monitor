import type { DraftEntry } from "./model.js";
export const MASTERLIST_ACTIONS = [
  "submit-verification",
  "submit-approval",
  "approve",
  "return-draft",
  "publish",
  "lock",
] as const;
export type MasterlistAction = (typeof MASTERLIST_ACTIONS)[number];
export type OfficialSnapshot = {
  lineage?: {
    rootId: string;
    parentId: string;
    amendmentId: string;
    versionLabel: string;
  };
  masterlistId: string;
  title: string;
  academicYearId: string;
  yearCode: string;
  publicationVersion: number;
  entries: DraftEntry[];
};
export type WorkflowView = {
  status: string;
  version: number;
  periodUnavailable: boolean;
  events: {
    id: string;
    action: string;
    fromStatus: string;
    toStatus: string;
    version: number;
    actorName: string;
    reason: string;
    reference: string;
    occurredAt: string;
  }[];
  publication: null | {
    snapshot: OfficialSnapshot;
    hash: string;
    effectiveOn: string;
    actorName: string;
    publishedAt: string;
  };
};
