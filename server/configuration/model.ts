export const CONFIG_KINDS = [
  "academic-years",
  "semesters",
  "barangays",
  "schools",
  "courses",
  "settings",
] as const;
export type ConfigKind = (typeof CONFIG_KINDS)[number];
export const CONFIG_LABELS: Record<ConfigKind, string> = {
  "academic-years": "Academic years",
  semesters: "Semesters",
  barangays: "Barangays",
  schools: "Schools",
  courses: "Courses",
  settings: "Program settings",
};
export type ConfigRecord = {
  id: string;
  code: string;
  name: string;
  version: number;
  archived: boolean;
  locked: boolean;
  parentUnavailable: boolean;
  startsOn: string | null;
  endsOn: string | null;
  academicYearId: string | null;
  valueType: "text" | "date" | null;
  value: string | null;
};
export type ConfigList = {
  items: ConfigRecord[];
  total: number;
  offset: number;
  limit: number;
};
export type ConfigFields = {
  code: string;
  name: string;
  startsOn?: string;
  endsOn?: string;
  academicYearId?: string;
  valueType?: "text" | "date";
  value?: string;
};
export type ConfigCommand = {
  action: "create" | "update" | "archive" | "restore" | "lock";
  expectedVersion: number;
  reason: string;
  fields?: ConfigFields;
};
export const isPeriod = (kind: ConfigKind) =>
  kind === "academic-years" || kind === "semesters";
