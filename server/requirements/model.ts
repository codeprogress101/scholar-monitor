export type RequirementVersion = {
  id: string;
  definitionId: string;
  code: string;
  revision: number;
  name: string;
  instructions: string;
  appliesTo: "semester" | "payout";
  semesterId: string | null;
  semesterCode: string | null;
  semesterName: string | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  active: boolean;
  reason: string;
  reference: string;
  actorName: string;
  createdAt: string;
};
export type RequirementList = {
  items: RequirementVersion[];
  total: number;
  offset: number;
  limit: number;
};
