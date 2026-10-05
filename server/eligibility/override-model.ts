import type { EligibilitySnapshot } from "./model.js";
export type OverrideAction =
  "request" | "submit-review" | "reevaluate" | "approve" | "reject" | "cancel";
export type OverrideState =
  "draft" | "pending" | "approved" | "rejected" | "cancelled";
export type EligibilityOverride = {
  id: string;
  cycleId: string;
  scholarshipId: string;
  requesterId: string;
  requesterName: string;
  requestedEligible: boolean;
  reasonCode: string;
  justification: string;
  authorityReference: string;
  originalCalculation: EligibilitySnapshot;
  calculation: EligibilitySnapshot;
  revision: number;
  state: OverrideState;
  action: OverrideAction;
  actorId: string;
  actorName: string;
  occurredAt: string;
  reason: string;
  reference: string;
};
export type EffectiveEligibility = {
  eligible: boolean;
  label: string;
  overrideId: string | null;
  overrideStale: boolean;
};
