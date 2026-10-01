# F10 - Masterlist Draft Generation

Release 0.11.0, completed 2026-09-30 on XAMPP MariaDB. F09 is accepted; F10 is implemented and tested, pending review. F11 official verification, approval, publication and locking is next.

## Delivered workflow

Staff and Coordinators can create a named draft for an active, unlocked academic year, search candidates, add/remove entries, review current source information, refresh saved snapshots, and inspect draft validation. The System Administrator role does not grant access to operational draft data.

Candidate inclusion requires a valid permanent Scholar ID, an annual scholarship record in Selected state, and complete academic data for the same year. Academic placement includes the latest approved F09 revision. Candidate search uses names or permanent IDs and is paginated; it does not confuse the scholar's registration year with the draft year.

Counts come from active entries, with no hard-coded historical total or editable count. A scholar can appear only once per draft. Award numbers are separate from permanent Scholar IDs, optional at draft stage, and unique within that draft. Removal clears the award number for reuse, marks the entry removed, and retains its snapshot and audit history. Re-adding restores the same entry identity with a freshly validated snapshot.

Drafts retain source snapshots. Identity, qualification or approved academic revisions are detected during validation, producing `SOURCE_CHANGED` rather than silently rewriting the draft. Review/refresh explicitly saves current source data and records the prior snapshot in audit history. Every mutation requires a reason and physical-record reference.

Creating a draft does not grant a scholarship, assign a permanent ID, activate an annual record or publish an official masterlist. Multiple named drafts per year are allowed; the revision counter tracks edits, not official publication numbering.

## API

All endpoints require `masterlists.prepare` and an authenticated session.

| Endpoint | Behavior |
| --- | --- |
| GET /api/v1/masterlists | Paginated draft list with derived counts; optional title query |
| POST /api/v1/masterlists | Create draft |
| GET /api/v1/masterlists/:id | Draft metadata, active entry snapshots and current validation |
| GET /api/v1/masterlists/:id/candidates | Paginated candidate search with per-scholar issues and eligible snapshots |
| GET /api/v1/masterlists/:id/validation | Current revision, count, validity and structured issues |
| POST /api/v1/masterlists/:id/entries | Add, remove or refresh one candidate |

Create body: `{ academicYearId, title, reason, reference }`. Entry body: `{ action, expectedVersion, scholarId, awardNumber, reason, reference }`, where action is `add`, `remove`, or `refresh`; `scholarId` is the internal UUID and `awardNumber` is a string or null. Send null for removal. Commands return `{ id, version }`.

Mutations require JSON, allowed Origin, CSRF and UUID Idempotency-Key. Exact retries return the original acknowledgement; conflicting reuse returns `IDEMPOTENCY_CONFLICT`. Stale draft edits return `VERSION_CONFLICT`. Duplicate entries and awards return distinct 409 errors. Locked years return 423 `RECORD_LOCKED`; archived years block mutations. No PATCH, DELETE, approval, publication, locking or activation route is exposed.

Validation reports `{ version, count, valid, issues }`; each issue contains `{ scholarId, code, message }`. Candidate issues include `SCHOLAR_ID_REQUIRED`, `SCHOLARSHIP_RECORD_REQUIRED`, `SELECTION_REQUIRED`, and `ACADEMIC_RECORD_REQUIRED`. Draft-level issues include `EMPTY_DRAFT` and `PERIOD_UNAVAILABLE`. Invalid inclusion returns 422 `CANDIDATE_INVALID` with structured `error.issues`. Validation is a point-in-time result, not an approval token.

## Persistence and future integration

Migration `20260930100000_f10_masterlist_drafts.sql` is applied to local XAMPP and adds draft versions, entries and command receipts. All ten migration checksums and runtime grants passed verification; the API reports F10 ready. Database unique keys enforce scholar/draft and award/draft uniqueness. Restricted grants preserve identities, command history and status; no DELETE grants are added. Earlier migrations and role assignments are unchanged.

Mutations use the shared configuration guard and locking source reads. Revision checks, snapshot changes, counts derived from entries, audit insertion and retry receipts are atomic. Cross-user concurrent edits cannot both commit against the same draft revision. Failed audit insertion rolls back the entire command.

F11 must revalidate source information within its approval/publication transaction, add official states and immutable snapshots, and extend the F09 amendment guard to actual official masterlist membership before enabling publication. F10 has no official state to bypass that guard.

## Verification

- `npm run check`: lint, 81 portable tests, typechecks, production build and secret scan passed.
- All 98 database scenarios passed: authentication 15, roles 10, configuration 13, scholars 16, qualification 10, status 9, academic records 8, academic changes 8, masterlists 9.
- New scenarios cover private access, structured same-year validation, Selected status, duplicate prevention at API/database levels, derived counts, permanent IDs, cross-user edit conflicts, F09 source changes, explicit refresh, award uniqueness, pagination/literal search, audit rollback, year locks, CSRF and restricted grants.
- Browser checks created a draft, added a candidate, reviewed/refreshed its source data, removed it and verified the count/validation changes. A different-year draft displayed precise missing-record errors and disabled invalid inclusion. Desktop/mobile rendering was checked using disposable fixture data.

Screenshots are stored in `output/playwright/f10-masterlist-desktop.png` and `output/playwright/f10-masterlist-mobile.png`. The browser fixture was stopped and its disposable database/user removed. Real accounts and scholarship data were not used for testing.
