export const ROLE_CODES = ["staff", "coordinator", "system_admin"] as const;
export type RoleCode = (typeof ROLE_CODES)[number];
export const PERMISSION_CODES = [
  "scholars.read",
  "scholars.create",
  "scholars.update",
  "academic.edit",
  "academic.changes.approve",
  "requirements.generate",
  "requirements.receive",
  "requirements.verify",
  "requirements.waive",
  "masterlists.prepare",
  "masterlists.approve",
  "masterlists.publish",
  "masterlists.lock",
  "masterlists.amendments.request",
  "masterlists.amendments.approve",
  "scholarship.status.request",
  "scholarship.status.approve",
  "eligibility.overrides.request",
  "eligibility.overrides.approve",
  "ovr.prepare",
  "ovr.finalize",
  "ovr.close",
  "users.manage",
  "roles.manage",
  "configuration.read",
  "configuration.manage",
  "audit.view_limited",
  "audit.view_all",
  "audit.export",
] as const;
export type PermissionCode = (typeof PERMISSION_CODES)[number];
export const isPermission = (value: unknown): value is PermissionCode =>
  typeof value === "string" &&
  (PERMISSION_CODES as readonly string[]).includes(value);
export type Permission = {
  code: PermissionCode;
  label: string;
  category: string;
};
export type Role = { code: RoleCode; label: string; description: string };
export type Access = {
  userId: string;
  version: number;
  roles: Role[];
  permissions: Permission[];
};
