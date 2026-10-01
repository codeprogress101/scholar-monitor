export const OPERATIONAL_STATUSES = [
  "active",
  "on_hold",
  "suspended",
  "graduated",
  "dropped",
  "withdrawn",
  "disqualified",
  "not_renewed",
] as const;
export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];
export const TERMINAL_STATUSES: readonly OperationalStatus[] = [
  "graduated",
  "dropped",
  "withdrawn",
  "disqualified",
  "not_renewed",
];
export const OPERATIONAL_LABELS: Record<OperationalStatus, string> = {
  active: "Active",
  on_hold: "On Hold",
  suspended: "Suspended",
  graduated: "Graduated",
  dropped: "Dropped",
  withdrawn: "Withdrawn",
  disqualified: "Disqualified",
  not_renewed: "Not Renewed",
};
// Necessary status condition only. F19 must still evaluate all authoritative eligibility requirements.
export const statusAllowsPayout = (status: OperationalStatus | null) =>
  status === "active";
export type StatusRequest = {
  id: string;
  fromStatus: OperationalStatus;
  toStatus: OperationalStatus;
  expectedVersion: number;
  kind: "change" | "correction";
  correctsRequestId: string | null;
  effectiveOn: string;
  reasonCode: string;
  reason: string;
  reference: string;
  actorId: string;
  actorName: string;
  createdAt: string;
  decision: null | {
    action: "approve" | "reject" | "cancel";
    actorName: string;
    reason: string;
    reference: string;
    occurredAt: string;
    resultingVersion: number | null;
  };
};
export type StatusView = {
  status: OperationalStatus | null;
  version: number;
  effectiveOn: string | null;
  periodUnavailable: boolean;
  statusAllowsPayout: boolean;
  requests: StatusRequest[];
};
export type StatusResult = {
  requestId: string;
  outcome: "pending" | "approve" | "reject" | "cancel";
};
