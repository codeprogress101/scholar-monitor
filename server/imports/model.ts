import type { ScholarFields } from "../scholars/model.js";
export const MAX_IMPORT_ROWS = 1500;
export const IMPORT_COLUMNS = [
  "scholarId",
  "firstName",
  "middleName",
  "lastName",
  "suffix",
  "birthDate",
  "academicYearCode",
  "barangayCode",
  "email",
  "phone",
  "addressLine",
  "schoolCode",
  "courseCode",
  "yearLevel",
] as const;
export const SIMPLE_COLUMNS = ["Last name", "First name", "Middle Name", "Name Extension", "School", "Year Level", "Status", "Course"] as const;
export type IntakeClassification = "new" | "continuing";
export type ReferenceMapping = { kind: "schools" | "courses"; supplied: string; id: string };
export type Intake = { schoolName?: string; courseName?: string; academicYearId: string; schoolId: string; courseId: string | null; yearLevel: string; classification: IntakeClassification };
export type ImportColumn = (typeof IMPORT_COLUMNS)[number];
export type ImportRow = {
  receipts?: { periodId: string; cor: boolean; cog: boolean; receivedOn?: string };
  row: number;
  cells: Record<ImportColumn, string>;
  errors: string[];
  format?: "simple";
  status?: string;
  working?: { id: string; version: number; yearId: string; code: string };
  mappings?: ReferenceMapping[];
  approvedSelection?: { reference: string; effectiveOn: string };
};
export type ImportPreviewRow = ImportRow & {
  receiptIssue?: { code: string; message: string };
  coursePending?: boolean;
  receiptContext?: { sourceHash:string; cor:string; cog:string; cogExempt?: boolean };
  warnings: string[];
  notices?: string[];
  intake?: Intake;
  existingId?: string;
  existingVersion?: number;
  existingName?: string;
  fields?: ScholarFields;
  academic?: {
    schoolName?: string;
    courseName?: string;
    academicYearId: string;
    schoolId: string;
    courseId: string;
    yearLevel: string;
  };
  references: { id: string; version: number }[];
};
export type ImportResult = {
  coursePendingCount?: number;
  receivedCount?: number;
  selectedCount?: number;
  continuingRosterId?: string;
  items: {
    row: number;
    id: string;
    scholarId: string;
    academicRecordId?: string;
  }[];
};
export type ImportPreview = {
  receiptBlockers?: { code: string; message: string; rows: number[] }[];
  receiptGroups?: { cor: string; cog: string; corCount: number; cogCount: number; exemptCount: number }[];
  id: string;
  fileName: string;
  hash: string;
  rows: ImportPreviewRow[];
  ready: boolean;
  workingYear?: string;
  unresolved?: { kind: "schools" | "courses"; supplied: string; choices: { id: string; code: string; name: string }[] }[];
  result: ImportResult | null;
};
