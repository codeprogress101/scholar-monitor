# F19 delivery - Calculated Payout Eligibility

Release 0.20.0, completed 2026-10-02 on XAMPP MariaDB. F00-F18 accepted; F19 implemented and tested, ready for acceptance. Next: F20 eligibility overrides.

## Delivered workflow

Staff and Coordinators can inspect normal eligibility from an annual record's payout checklist or from **Payout cycles > Eligibility**. The cycle report includes all annual records for the cycle's academic year, including records without a checklist. Individual and report results use the same server assessment. System Administrators have no scholarship eligibility access or calculation authority; personal role assignments are unchanged.

Normal eligibility requires Active scholarship status, membership in the current published official masterlist lineage, and every pinned payout requirement satisfied. Verified satisfies a document obligation; Waived satisfies it only when the cycle policy accepts waivers. Missing checklists, empty policy, missing/unsatisfied documents, unavailable official membership and non-Active status produce explicit reason codes. Graduated, Dropped, Withdrawn, Disqualified and Not Renewed never normally qualify. Semester documents and another cycle's documents are not substituted.

The official membership check follows the activation root through the latest published amendment and matches both scholar and annual scholarship identity. Calculation evidence preserves the cycle version, scholarship/status versions, official publication hash and amendment revision, checklist, exact requirement definition versions, document state/event versions, waiver policy, engine version and source fingerprint.

Saving requires a reason and reference and appends an immutable, attributed snapshot. Source changes mark saved results stale; recalculation creates a new revision without rewriting earlier outcomes. The page distinguishes current assessment from saved history (latest 50 snapshots). Saving from the report refreshes both views. Current means current authoritative records, not historical reconstruction as of the target date; the cycle target date selects the pinned requirement policy.

New calculations require an open cycle and an available academic period. Locked/closed cycles retain read access, history and exact completed retries. Saving eligibility does not authorize payment. Overrides, OVR preparation and payment operations remain later checkpoints.

## API and storage

- `GET /api/v1/payout-cycles/:cycleId/eligibility` provides the paginated same-year report (`q`, `offset`, `limit`).
- `GET /api/v1/payout-cycles/:cycleId/scholarships/:id/eligibility` returns current assessment, latest saved result, staleness, calculation availability and history. Both reads require `scholars.read` and do not write snapshots.
- `POST /api/v1/payout-cycles/:cycleId/scholarships/:id/eligibility/calculate` requires `eligibility.calculate`, granted to Staff and Coordinator only. The strict body contains `expectedRevision`, `expectedSourceHash`, `reason`, and `reference`; a UUID Idempotency-Key, valid Origin and CSRF token are required. Client-supplied outcomes are rejected.

Migration `20261002090000_f19_payout_eligibility.sql` adds `payout_eligibility` and `payout_eligibility_commands`, each with SELECT/INSERT-only runtime grants. Unique cycle/scholarship/revision and actor/command keys, restrictive foreign keys and value constraints protect history. No operational sample data or account assignments are seeded. Earlier applied migrations remain unchanged.

The shared configuration guard and current locking reads serialize source inspection with source-changing workflows. The server recomputes before saving and rejects outdated revisions/fingerprints. Snapshot, audit (`eligibility.calculated`) and retry receipt commit together. Exact retries return the recorded result; changed retries conflict. Concurrent calculations have one revision winner and audit failure rolls back the entire command.

Core files: `server/eligibility/{model,engine,service,routes}.ts`, `src/EligibilityPanel.tsx`, `src/EligibilityReport.tsx`, payout/checklist integration, migration and runtime grants. Tests: `tests/eligibility.test.ts`, `scripts/test-eligibility-db.ts`.

## Validation

- `npm run check`: lint, 112 portable tests in 22 files, client/server/tool/test typechecks, production build and source/bundle secret scan passed.
- 76 isolated database scenarios passed across eligibility (11), payout cycles (11), requirement workflow (9), waivers (10), masterlist amendments and prerequisites (16), operational status (9), and RBAC (10). Eligibility coverage includes missing COG, accepted/excluded waivers, Dropped despite complete documents, controlled status correction, latest official amendments, document reopening, cross-year rejection, shared report results, stale-source conflicts, role denials, CSRF, audit rollback, concurrency, retries, immutable grants and locked cycles.
- Browser: Staff saved an Eligible result and both report and detail updated to the same revision. A separate waiver-excluding cycle showed Not Eligible. After COR reopening, both views showed Not Eligible and stale saved evidence; recalculation updated both to the same new revision. Desktop (1440x1000) and mobile (390x844) layouts were visually checked with no horizontal overflow. Ignored evidence: `output/playwright/f19-eligibility-{desktop,mobile}.png`.
- Local migration 19 is applied. `npm run test:db` passed all migration checksums and restricted grants. Health reports F19/0.20.0 with a connected database; readiness passed and the local app responds on port 5173. Disposable browser fixtures were removed. Tests use isolated synthetic records; real account credentials and scholarship records were not changed.

## Local XAMPP recovery

During final verification after services stopped, MariaDB refused startup because the Aria `mysql.db` privilege table was marked crashed. With MariaDB stopped, the original `db.frm`, `db.MAI` and `db.MAD` were backed up to `output/mysql-db-repair-20261002-082728/`, then repaired using the documented [MariaDB aria_chk procedure](https://mariadb.com/docs/server/clients-and-utilities/aria-clients-and-utilities/aria_chk). The data page had an invalid CRC; ordinary, safe and extended recovery could not recover its three database-level privilege rows. The originals are retained for recovery from a known-good backup if those grants are needed. No privileges were guessed or broadly regranted.

MariaDB starts again. The application's table-level grants remain intact and its full restricted-grant checks and eligibility database scenarios pass. Application data tables were not repaired or reset. This verifies the scholarship app; it does not establish that unrelated XAMPP applications retain their previous database-level grants.
