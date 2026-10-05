# F26 delivery — Scholar Profile Timeline

Release 0.27.0, completed 2026-10-03 on XAMPP MariaDB. F00–F25 accepted; F26 implemented and tested, ready for acceptance. Next: F27 Excel import staging and validation.

## Delivered

- Scholar profile combines personal information, current academic placement, annual qualification/operational status, published membership versions, requirement states, OVR membership and effective payment totals.
- Historical timeline includes academic requests/decisions, qualification/status changes, physical receipt/workflow/waiver events, publication versions, batch lifecycle metadata, original payments and corrections.
- Category filters and stable pagination separate historical events from current/effective record summaries. Prior payments remain visible after corrections.
- Uses existing authoritative academic, requirement and payment projections under the shared transaction guard. Reads do not mutate records or append audit events.
- `scholars.read` protects profile/PII. System Administrator-only and unassigned accounts are denied. Masterlist and payout sections honor their operational permissions. Staff audit metadata is limited to their own actions; Coordinator scope follows existing audit permissions.
- Full publication/batch rosters and raw audit payloads never leave this endpoint. Existing workflow panels retain their own mutation permissions; the new timeline adds no mutation controls.

## Files and migration

Added `server/scholars/profile-model.ts`, `profile-service.ts`, `src/ScholarTimeline.tsx`, query tests and isolated database scenarios. Integrated the profile route, scholar registry, release/readiness checks and documentation.

Migration `20261003120000_f26_profile_audit_view.sql` adds a narrow SQL SECURITY DEFINER view for scholar-related audit metadata only. Runtime receives SELECT on that view, with no raw audit SELECT or view write privileges. All 26 migration checksums and local grants verified. Existing data, individual account credentials and roles remain intact.

## Verification

- `npm run check`: lint, 134 portable tests in 28 files, full typechecking, production build and secret scan.
- `npm run test:profile-db`: 31 isolated scenarios, including 3 profile-specific scenarios checking source status/counts/effective payment totals, PII denial, cross-scholar isolation, own-audit visibility, stable pagination/filtering, restricted database grants and absence of read-side mutations.
- `npm run test:db`: local connectivity, all migration checksums and restricted grants.
- Browser: Staff opens the scholar profile, pages historical events and filters payouts. Original payment/correction history and effective totals display correctly. Reviewed desktop 1440×1000 and mobile 390×844 screenshots without horizontal overflow. Disposable fixture cleaned up.
- Local health reports F26/0.27.0 connected; readiness ready.

Access: **Scholar registry → Open profile → Profile and timeline**. API: GET `/api/v1/scholars/:id/profile?category=all&offset=0&limit=25`.

## Usability repair following screenshot review

Reproduced pool saturation: a fifth connection immediately failed with `No connections available` while the page loaded several sections concurrently. Enabled bounded queuing and made profile sections load on demand. Added direct Receive requirements navigation with year/checklist selectors; removed the repeated registry below an open profile. Collapsed checklist setup/metadata and kept eligibility tools outside the receiving screen. Failed reads no longer claim no records or missing configuration.

Validation: full check passed (134 tests); isolated profile scenarios now exercise the actual production pool, including queued checkout and eight concurrent section reads. Browser verified focused navigation, successful COR resubmission, empty-year setup guidance, injected load-error recovery, and desktop/mobile layouts. The inspected local scholar has one annual scholarship record but no academic placement; there are no active schools/courses. These factual setup gaps were reported without creating invented configuration or changing personal accounts.
