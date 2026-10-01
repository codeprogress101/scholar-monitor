# F09 - Course Shift and School Transfer Workflow

Release 0.10.0, completed 2026-09-30 on XAMPP MariaDB. F08 is accepted. F09 is implemented and tested, pending review; F10 masterlist draft generation is next.

## Workflow

Staff and Coordinators request course shifts, school transfers, combined school/course changes, or year-level corrections from each annual academic record. Every request requires an effective date, reason and physical-record reference; remarks are optional. Year-level corrections are separate commands and cannot silently alter school/course. No-op requests, unrelated field changes, future dates and dates preceding the latest approved change are rejected.

All changes require approval by a different Coordinator. Requests do not affect current placement until approved. Coordinators can reject pending requests; only the requester can cancel. Rejection/cancellation remains available after a period is locked or a request becomes stale. System Administrators cannot read operational records or approve placement changes through their technical role.

Before/after placement snapshots, requester, recorded time, effective date, approver, decision time and supporting references remain readable. Initial F08 entries are immutable; current placement is derived from the latest approved revision. The scholar's permanent LDSS ID and earlier academic years remain unchanged. Renaming reference data does not rewrite history. A changed destination must remain active at approval; retaining an archived historical reference is allowed when it is not the field being changed.

## Official-record boundary

Locked or archived academic years block requests and approvals. Any activated annual scholarship record, including terminal operational states, requires a masterlist amendment and cannot be changed directly. No real masterlist publishing or amendment route exists yet, so F09 blocks that operation rather than pretending to amend an official record.

Before F11 introduces publication/activation, its implementation must extend this guard to actual official masterlist membership (including locked/published snapshots before activation) and use the same transaction locking convention. Future amendment commands must explicitly link approved placement revisions to amended official snapshots. This integration is a dependency, not a completed amendment feature.

## API

| Endpoint | Permission |
| --- | --- |
| GET /api/v1/academic-records/:id/changes | scholars.read |
| POST /api/v1/academic-records/:id/changes | academic.edit |
| POST /api/v1/academic-changes/:id/approve | academic.changes.approve; different actor |
| POST /api/v1/academic-changes/:id/reject | academic.changes.approve |
| POST /api/v1/academic-changes/:id/cancel | academic.edit; requester only |

Request fields: `expectedVersion` (initially 0), `kind` (`course_shift`, `school_transfer`, `both`, `year_level_correction`), `schoolId`, `courseId`, `yearLevel`, `effectiveOn`, `reason`, `reference`, `remarks`. Send unchanged placement fields as their current values. Decisions accept only `{ reason, reference }`. Actors and timestamps are server-derived.

Mutations require an authenticated session, allowed Origin, CSRF, JSON, and UUID Idempotency-Key. Results are `{ requestId, outcome }`. Identical retries return the original result; altered payloads using the same key fail. GET provides current placement, revision, effective date, availability and full request/decision history. The existing scholar academic-record list also returns approved current placement.

Important errors include `VERSION_CONFLICT`, `SELF_APPROVAL_DENIED`, `INVALID_ACADEMIC_CHANGE`, `INVALID_EFFECTIVE_DATE`, `REFERENCE_ARCHIVED`, `RECORD_LOCKED`, `MASTERLIST_AMENDMENT_REQUIRED`, and `IDEMPOTENCY_CONFLICT`. There is no generic PATCH or DELETE.

## Storage and validation

Migration `20260930090000_f09_academic_changes.sql` adds three append-only tables with SELECT/INSERT runtime grants and a Coordinator-only approval permission. Existing migrations and individual role assignments remain unchanged. Commands serialize with reference/period changes through the configuration guard; locking reads ensure competing Coordinators see current revisions. Request/decision, audit and retry receipts commit together. Database unique keys prevent multiple decisions or duplicate approved revision numbers.

- `npm run check`: lint, 78 portable tests, typechecks, production build and secret scan passed.
- All 89 MariaDB scenarios passed: authentication 15, roles 10, configuration 13, scholars 16, qualification 10, status 9, academic records 8, academic changes 8.
- New scenarios cover all four types, permissions, self-approval, immutable initial records and permanent IDs, separate-Coordinator concurrent approvals, stale requests, retries, reference renames/archival, audit rollback, locked/activated records, CSRF and restricted grants.
- Browser verification completed a Staff request and separate Coordinator approval, confirmed updated profile/history, and checked desktop and mobile layouts without horizontal overflow. Screenshots: `output/playwright/f09-academic-desktop.png` and `output/playwright/f09-academic-mobile.png`.

Tests used disposable databases and synthetic accounts; the browser fixture was stopped and removed. No real scholars, passwords or account role assignments were altered by testing.
