export type ScholarFields = {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  birthDate: string | null;
  academicYearId: string;
  barangayId: string | null;
  contact: { email: string; phone: string; addressLine: string };
};
export type ScholarSummary = {
  id: string;
  scholarId: string;
  displayName: string;
  entryYear: number;
  academicYear: { id: string; code: string; name: string };
  barangay: { id: string; name: string } | null;
};
export type ScholarDetail = ScholarSummary &
  ScholarFields & { version: number; periodUnavailable: boolean };
export type ScholarList = {
  items: ScholarSummary[];
  total: number;
  offset: number;
  limit: number;
};
export type ScholarResult = { id: string; scholarId: string; version: number };
export type ScholarInput = {
  expectedVersion: number;
  reason: string;
  fields: ScholarFields;
};

export type DuplicateCandidate = {
  id: string;
  scholarId: string;
  displayName: string;
  version: number;
  likelihood: "likely" | "possible";
  reasons: string[];
};
export type DuplicateCheck = {
  candidates: DuplicateCandidate[];
  total: number;
  snapshot: string;
};
