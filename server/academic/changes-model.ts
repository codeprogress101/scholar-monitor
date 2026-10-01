export type Placement = {
  schoolId: string;
  courseId: string;
  yearLevel: string;
  school: { code: string; name: string };
  course: { code: string; name: string };
};
export type AcademicChange = {
  id: string;
  kind: string;
  expectedVersion: number;
  before: Placement;
  after: Placement;
  effectiveOn: string;
  reason: string;
  reference: string;
  remarks: string;
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
};
export type AcademicChangeView = {
  version: number;
  current: Placement;
  effectiveOn: string | null;
  unavailable: boolean;
  requests: AcademicChange[];
};
