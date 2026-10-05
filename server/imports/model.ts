import type { ScholarFields } from "../scholars/model.js";
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
export type ImportColumn = (typeof IMPORT_COLUMNS)[number];
export type ImportRow = {
  row: number;
  cells: Record<ImportColumn, string>;
  errors: string[];
};
export type ImportPreviewRow = ImportRow & {
  warnings: string[];
  existingId?: string;
  existingVersion?: number;
  existingName?: string;
  fields?: ScholarFields;
  academic?: {
    academicYearId: string;
    schoolId: string;
    courseId: string;
    yearLevel: string;
  };
  references: { id: string; version: number }[];
};
export type ImportResult = {
  items: {
    row: number;
    id: string;
    scholarId: string;
    academicRecordId?: string;
  }[];
};
export type ImportPreview = {
  id: string;
  fileName: string;
  hash: string;
  rows: ImportPreviewRow[];
  ready: boolean;
  result: ImportResult | null;
};
