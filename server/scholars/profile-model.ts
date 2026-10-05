import type { ScholarDetail } from "./model.js";
export type ProfileItem = {
  id: string;
  category: string;
  label: string;
  detail: string;
  version: number;
  current: boolean;
  at: string | null;
};
export type ProfileEvent = {
  id: string;
  category: string;
  label: string;
  detail: string;
  at: string;
  actor: string;
  version: number | null;
};
export type ScholarProfile = {
  person: ScholarDetail;
  asOf: string;
  items: ProfileItem[];
  totals: {
    scholarshipYears: number;
    requirements: number;
    payments: number;
    paidTotal: string;
    notPaid: number;
  };
  timeline: {
    items: ProfileEvent[];
    total: number;
    offset: number;
    limit: number;
  };
  auditScope: "all" | "own" | "none";
};
