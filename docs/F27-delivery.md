# F27 delivery: Excel Import Staging and Validation

Release 0.28.0, completed 2026-10-04 on XAMPP MariaDB. F00-F26 accepted. F27 is implemented and tested, pending acceptance. F28 remains unimplemented.

## User workflow

**Scholar registry > Import Excel > Download Excel template > Review import > Confirm import**.

Staff and Coordinators can stage their own files. The screen displays each Excel row number, intended action, scholar identity, year/placement, errors and possible duplicate warnings. Optional instructions and row details are collapsed. Confirmation requires an explicit checked acknowledgement and a clean preview. No operational records are created during staging.

Supported scope: new scholar profiles with optional initial academic records; existing Scholar IDs can add missing annual academic records. Permanent IDs are assigned by the original registry logic. Existing identity/contact data and academic history cannot be overwritten. No annual qualification, masterlist, activation, eligibility or payment decision is imported.

## Validation and transaction behavior

- Strict template headers, a single Scholars worksheet, 200 data rows, 2 MB compressed and 10 MB expanded archive limits. Bounded ZIP entry inspection precedes parsing. Macros, embedded objects, external workbook links, formulas, hyperlinks, merged cells and extra sheets are rejected.
- Excel dates or ISO date text are supported; malformed/future birth dates are reported. Identifier/contact columns use text formatting to preserve leading zeros.
- Required names/year, missing or archived references, locked academic years, incomplete academic placement, duplicate Scholar IDs, existing academic slots and attempted overwrites are reported before confirmation.
- Existing-person and within-file duplicate warnings reuse F05 matching. Warnings block bulk confirmation; resolve the identity in the registry or correct the file instead of bulk-bypassing duplicate review.
- Confirmation binds to the stored preview fingerprint and revalidates current references and duplicate candidates under the same configuration guard. Changed data requires a fresh review.
- F04/F05 scholar creation and F08 academic creation run on one authorized transaction connection. Any failure rolls back every imported row, generated identifier/counter, contact, academic record, command receipt and operational audit event.
- Staging/confirmation history is append-only. Confirmation results survive server restarts; exact retries and concurrent confirmations cannot duplicate a job. PII previews are accessible only to their uploading account with current permission.
- Generated template cells are plain text and formula-prefixed generated text is neutralized. No PII export function was added.

## Files

Created:

- `server/imports/model.ts`, `workbook.ts`, `service.ts`, `routes.ts`
- `src/ScholarImport.tsx`
- `db/migrations/20261004090000_f27_excel_import.sql`
- `tests/imports.test.ts`, `scripts/test-import-db.ts`
- `docs/F27-delivery.md`

Modified:

- `server/scholars/service.ts`, `server/academic/service.ts`: accept the same permission interface bound to an existing transaction; original behavior and validation remain intact.
- `server/app.ts`, `server/database.ts`: register import APIs and F27 readiness/release.
- `src/ScholarsPage.tsx`, `src/App.tsx`: import entry point and release status.
- `package.json`, `package-lock.json`: ExcelJS, yauzl and types; test command; release 0.28.0. ExcelJS's CommonJS-compatible uuid dependency is overridden to patched 11.x; dependency audit reports no vulnerabilities.
- `scripts/migration-lib.mjs`, `scripts/migrate.mjs`, `scripts/check-database.mjs`: restricted import grants and migration checks. Existing database fixture scripts now expect 27 migrations.
- `tests/app.test.ts`, README, migration documentation and implementation plan: current checkpoint and operating instructions.

## Database and API

Migration adds `import_jobs` (normalized source rows, immutable preview/errors/fingerprint, uploader and file hash) and `import_confirmations` (one durable result per job). Runtime has SELECT/INSERT only on both tables. Applied locally; all 27 checksums and protected grants verified. Personal accounts and existing local records were preserved.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/imports/template` | Download blank .xlsx template |
| POST | `/api/v1/imports/stage` | Parse/validate and persist private preview |
| GET | `/api/v1/imports/:id` | Read own immutable preview and completed result |
| POST | `/api/v1/imports/:id/confirm` | Explicit atomic import using preview hash |

All routes require `scholars.create`; academic writes additionally enforce `academic.edit`. Mutations require the authenticated session, CSRF/origin checks and an idempotency key. Browser-supplied actor IDs are rejected.

## Verification

- Full check: 146 unit tests in 30 files, ESLint, TypeScript, production build and secret scan passed.
- F27: 6 isolated integration groups cover invalid/mixed rows, duplicate warnings, permissions and owner isolation, CSRF, explicit confirmation, stale previews, transaction rollback, durable retry, authenticated attribution, protected grants and concurrent confirmation.
- Existing F04/F05 scholar integration: 16 scenarios passed; F08 academic integration: 8 scenarios passed.
- Browser: template download, invalid-file errors with no confirm button, clean preview, explicit acknowledgement, successful registry update, duplicate warning after re-upload, desktop and 390px layouts. Screenshots: `output/playwright/f27-preview.png` and `f27-mobile.png`. Disposable fixture cleaned up.
- Local XAMPP migration/connectivity/grant checks passed; no imported test scholars were written to the development database.

Known scope limits: .xlsx only, supplied column layout, 200 rows per job; duplicate resolution and corrections use existing individual workflows. No unresolved implementation issue identified. Stop before F28 pending acceptance.

Parser references: [ExcelJS](https://github.com/exceljs/exceljs), [yauzl](https://github.com/thejoshwolfe/yauzl).
