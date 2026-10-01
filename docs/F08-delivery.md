# F08 - Academic Records per Academic Year

Release 0.9.0, completed 2026-09-30 on XAMPP MariaDB. F00 through F07 are accepted. F08 is implemented and tested, pending review; F09 is next.

## Delivered behavior

Staff and Coordinators can add an academic record from a scholar profile. Each scholar has one authoritative initial entry per academic year, containing required school, course, and year level. A new year preserves previous years and the permanent scholar ID. School, course, and academic year come from Configuration; creation rejects archived references and locked years. System Administrators maintain configuration without receiving academic-edit or scholarship-approval authority.

History retains reference codes and names as recorded, the actor, timestamp, reason, and physical-record reference. Renaming or archiving a reference does not rewrite past entries. Year level is required text (1-60 characters); no unsupported numeric progression or grading policy is invented.

Coordinator qualification now requires a complete academic record for the same scholar and academic year. Applicant and Exam Passed records can be prepared first. Existing qualification decisions remain intact. This prerequisite does not implement future payout eligibility or masterlist activation.

Initial records are append-only in F08. Explicit school transfer, course shift, and year-level correction commands belong to F09. No generic PATCH or DELETE is exposed.

## API and consistency

| Endpoint | Permission |
| --- | --- |
| GET /api/v1/scholars/:id/academic-records | scholars.read |
| POST /api/v1/scholars/:id/academic-records | academic.edit |

POST accepts `academicYearId`, `schoolId`, `courseId`, `yearLevel`, `reason`, and `reference`. IDs must be UUIDs. Reason is 5-500 characters; reference is 3-300 characters. Unknown fields and control characters are rejected. Mutations require a session, allowed Origin, CSRF token, JSON body, and UUID Idempotency-Key. Successful creation returns `{ id }`; GET returns `{ items }`.

The database enforces scholar/year uniqueness and restrictive reference foreign keys. Permission validation, reference checks, creation, audit event, and retry receipt share one transaction. The shared configuration writer lock serializes changes with reference archival and period locking. Identical retries return the original result; reusing a key for another payload fails. Missing academic data blocks qualification with `ACADEMIC_RECORD_REQUIRED`.

Migration `20260930080000_f08_academic_records.sql` is applied locally. It adds `academic_records` and `academic_commands`, with SELECT/INSERT runtime grants only. Earlier migrations are unchanged. No real academic records, account changes, or reference seed data were introduced for testing.

## Validation

- `npm run check`: lint, 75 portable tests, typechecking, production build, and secret scan passed.
- Database suites: 81 scenarios passed across authentication (15), roles (10), configuration (13), scholars (16), qualification (10), status (9), and academic records (8).
- Academic scenarios cover authorization, required data, qualification dependency, history preservation, uniqueness, retained snapshots, concurrency, retries, audit rollback, period/reference guards, and immutable grants.
- `npm run test:db`: all eight local migration checksums and restricted runtime grants passed.
- Browser checks passed using an isolated synthetic database: create a new-year entry, retain prior-year history, and render at desktop and mobile widths without horizontal overflow. Screenshots are in `output/playwright/f08-academic-desktop.png` and `output/playwright/f08-academic-mobile.png`.

The disposable browser fixture was stopped after verification. F09 remains unimplemented.
