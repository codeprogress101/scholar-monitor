import type { PermissionCode } from "../authorization/policy.js";
export const REPORTS = {
  scholars: { label: "Scholar status", permission: "scholars.read" },
  missing: { label: "Missing requirements", permission: "scholars.read" },
  verification: { label: "For verification", permission: "scholars.read" },
  eligibility: { label: "Eligibility", permission: "scholars.read" },
  ovr: { label: "Payroll status", permission: "ovr.prepare" },
  payments: { label: "Paid and unpaid", permission: "ovr.prepare" },
  masterlists: {
    label: "Masterlist versions",
    permission: "masterlists.prepare",
  },
} satisfies Record<string, { label: string; permission: PermissionCode }>;
export type ReportKind = keyof typeof REPORTS;
export type ReportRow = { id: string; values: string[] };
export type OperationalReport = {
  kind: ReportKind;
  generatedAt: string;
  sourceHash: string;
  cycle: { id: string; code: string; version: number; academicYearId: string };
  scope: string;
  columns: string[];
  items: ReportRow[];
  total: number;
  counts: Record<string, number>;
  offset: number;
  limit: number;
};

/** A page fingerprint never claims to identify unrequested rows. */
export type ReportPage = OperationalReport & {
  sourceHashBasis: "report-page-v1" | "report-content-v1";
  countsScope: "page" | "report";
};
export type ReportSummary = Omit<OperationalReport, "items" | "offset" | "limit" | "columns"> & {
  sourceHashBasis: "dashboard-summary-v1";
  period: { semesterId: string; semesterCode: string; academicYearCode: string };
};
