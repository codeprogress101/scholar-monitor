# F28 delivery: Excel Export and PII Controls

Release 0.29.0, completed 2026-10-04 on XAMPP MariaDB. F27 accepted for continuation with user testing deferred. F28 implemented and tested; F29 remains unimplemented.

## Delivered

- Staff/Coordinator registry export: registration academic year required, optional existing registry search, all matches up to 5,000. Only Scholar ID, name and registration academic year appear. Excludes contacts, birth dates, addresses and workflow decisions. Archived/locked historical years remain readable.
- System Administrator audit export: at most 31 inclusive Manila dates and 10,000 events. A narrow database view returns event IDs/types, entity types, actions, actor IDs, UTC timestamps and request IDs. No raw audit payloads, reasons or personal contact information. Operational roles have no audit export grant.
- Reports are explicit `.xlsx` schemas; callers cannot request arbitrary columns, actor IDs, PII flags or unrestricted date ranges. Over-limit requests fail rather than silently truncate.
- Every generated file is recorded in `audit_logs` as `data.exported`, with authenticated actor, timestamp, purpose, report/format, scope/filter, columns, row count and SHA-256 digest. File bytes are generated before the audit write and released only after transaction commit. Audit failure yields JSON error and no attachment.
- Generated file metadata provides export ID, purpose, requester ID, UTC generation time, scope and count. Formula-like values are escaped as plain text. Responses use `Cache-Control: no-store`; no workbook is stored server-side.
- Export audit records describe generation, not confirmed delivery to disk. Each request/retry creates its own disclosure record. No extra purpose/reason text box is required; report purpose is determined by the endpoint.

## Usage

**Scholar registry > choose academic year > Export registry to Excel > Download Excel**.

**My access > Export audit metadata > choose dates > Download Excel** for System Administrator. Controls are collapsed initially and hidden without their required permission. The server independently enforces current permissions, session identity and CSRF/origin checks.

## Changes

Created `server/exports/validation.ts`, `workbook.ts`, `service.ts`, `routes.ts`; `src/ExcelExport.tsx`; `tests/exports.test.ts`; `scripts/test-export-db.ts`; migration `20261004093000_f28_excel_exports.sql`; this report.

Modified server app registration/readiness, permission catalog, scholar registry, My access and application checkpoint UI, package versions/test command, role-matrix tests, migration runner/grants/checks and fixture migration counts, README and implementation plan.

The migration adds `scholars.export` for Staff/Coordinator and a SELECT-only `export_audit_metadata` view. Existing `audit.export` remains System Administrator-only. No existing scholar records/accounts were changed, no raw audit SELECT privilege was added, and no historical migration was edited. Applied locally; all 28 migration checksums and grants verified.

## API

- `POST /api/v1/exports/scholars`: `{ academicYearId, q? }`; requires `scholars.export` and `scholars.read`.
- `POST /api/v1/exports/audit`: `{ from, to }`; requires `audit.export` and `audit.view_all`.

Both return `.xlsx` attachments with an export ID header, after successful auditing. Both require session authentication and CSRF protection. There is no generic/raw audit export or unrestricted PII export endpoint.

## Verification

- 149 unit tests across 31 files passed; new tests cover strict scope validation, inclusive date bounds and formula-safe worksheet/metadata cells.
- Four isolated export integration groups passed: exact permission denial/revocation and CSRF; workbook parsing and omitted PII; scope/search and disclosure metadata; restricted audit exports; injected audit failure with no attachment; narrow view/runtime grants.
- Complete RBAC regression passed: 148 direct permission decisions and 10 scenario groups. F27 import regression: 6 groups passed.
- Desktop browser downloaded the scoped Staff registry workbook, kept download disabled without a year, hid audit export from Staff, and downloaded System Administrator audit metadata. Mobile 390px layout had no page overflow. Artifacts in `output/playwright/f28-*`; disposable database/browser cleaned up.
- TypeScript, production build, ESLint, secret scan and local migration/grant checks passed. Local service reports F28/0.29.0 with database connected.

Scope: registry and technical audit exports only. Operational calculations/reports remain F29. No unresolved issue identified. Stop here for acceptance before F29.
