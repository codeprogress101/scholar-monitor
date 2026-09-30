# F03 — Reference Data and Academic Period Configuration

Release 0.4.0, implemented on 2026-09-29 using XAMPP MariaDB 10.4.32. F02 was accepted when the user requested proceeding. F03 is implemented and tested, awaiting user review; F04 scholar registry is next.

## What is available

The Configuration page provides academic years, semesters, barangays, schools, courses, and program settings. System Administrators can create, edit, archive, and restore records; Staff and Coordinators can read them. Academic periods also support locking. Search, pagination, archived-record visibility, clear error messages, and a reason field are included.

The real database starts with empty reference lists. No school, barangay, course, academic date, or program setting was invented or imported. Michael's account, password, sessions, and System Administrator assignment are preserved.

## Rules

- Codes are case-normalized, permanent, and unique within each list, including archived records. Semester codes are globally unique across years; use year-qualified codes.
- Academic years and semesters require valid calendar start/end dates, with start no later than end. Semesters belong permanently to an existing active, unlocked year and must fit within its dates.
- Year date changes must preserve the dates of all retained semesters, including archived ones. A year with a locked semester cannot change its dates.
- Archive retains identity and history; detail lookup can read archived records. Active lists omit them unless explicitly requested. A year cannot be archived with active semesters. Restore the parent year before restoring a semester.
- Locking blocks edits and archiving of that period. A year lock also prevents creating or changing its semesters. No unlock operation is exposed.
- Program settings store text or calendar dates. They are visible to the scholarship team and do not alter authentication/database configuration. Later workflows must explicitly consume relevant settings.
- Codes, IDs, created timestamps, and semester parent IDs are not mutable through the API or runtime UPDATE grants. No DELETE API or runtime DELETE privilege exists. Future scholar references must add restrictive foreign keys.

## API contract

All endpoints live under `/api/v1/configuration/:kind`, where kind is `academic-years`, `semesters`, `barangays`, `schools`, `courses`, or `settings`.

| Method / suffix | Behavior                                                                          |
| --------------- | --------------------------------------------------------------------------------- |
| GET collection  | List with `q`, `includeArchived`, `offset`, and `limit` (default 50, maximum 100) |
| GET /:id        | Read by permanent ID, including archived history                                  |
| POST collection | Create command; `expectedVersion: 0`                                              |
| POST /:id       | Update, archive, restore, or lock command; current expectedVersion                |

Reads require `configuration.read`; commands require `configuration.manage`. The HTTP guard and transactional service each enforce server-derived permissions. POST additionally requires the session CSRF token, allowed Origin, JSON, and an `Idempotency-Key` UUID.

Command body:

```json
{
  "action": "create",
  "expectedVersion": 0,
  "reason": "Approved reference configuration",
  "fields": {
    "code": "EXAMPLE-SCHOOL",
    "name": "Example school"
  }
}
```

The example is documentation only. Period fields add `startsOn` and `endsOn` in YYYY-MM-DD format; semesters also require `academicYearId`. Settings add `valueType` (text/date) and `value`. Update sends all applicable fields. Archive/restore/lock omit fields. Unknown fields and unknown list names are rejected.

List responses contain `items`, `total`, `offset`, and `limit`. Records expose `archived`, `locked`, and `parentUnavailable`. Future forms must check these flags when selecting usable academic periods. The semester selector already loads parent choices from the database and filters unavailable years.

Commands return the resulting record. Exact retries by the same actor return the original recorded result; different input with the same key yields `IDEMPOTENCY_CONFLICT`. After a retry, refresh the list for the latest record if another administrator has since changed it. Stale versions produce `VERSION_CONFLICT`. Other stable errors include `VALIDATION_FAILED`, `REFERENCE_NOT_FOUND`, `DUPLICATE_REFERENCE_CODE`, `RECORD_LOCKED`, `REFERENCE_IN_USE`, `PERIOD_OUTSIDE_YEAR`, and `INVALID_STATE_TRANSITION`.

## Persistence and concurrency

`20260929030000_f03_configuration.sql` adds six reference tables, a configuration lock row, and actor-scoped retry records. Previous migrations are unchanged. Dates use DATE columns; metadata uses UTC timestamps. Foreign keys restrict deletion of a year referenced by semesters.

Commands use the F02 authorization transaction, lock the actor, acquire the configuration lock, check the target's current version/state, validate parent/child periods, write the change, append a before/after audit event, record the retry result, and commit. An audit failure rolls back the full operation. The small configuration write lock serializes rare reference changes across administrators and avoids conflicting parent/child decisions.

Future scholar workflows must add their own domain guards and lock/check applicable periods and reference states in their transaction. F03 does not implement those future mutations or claim PostgreSQL RLS coverage.

## Validation performed

- `npm run check`: lint, 41 portable tests, client/server/tool/test typechecks, production build, and source/bundle secret scanning.
- `npm run test:configuration-db`: 13 isolated MariaDB scenarios covering six resource types, duplicate periods, history retention, date boundaries, parent protection, permissions, immutable codes, stale/concurrent edits, exact retries, failed-audit rollback, period locks, pagination/search, CSRF, and runtime grants.
- `npm run test:auth-db`: all 15 authentication scenarios still pass.
- `npm run test:rbac-db`: all 10 permission scenarios still pass, including 108 direct permission decisions.
- `npm run test:db`: real local database connectivity, four migration checksums, and restricted grants pass.
- Playwright browser checks use isolated synthetic accounts/data: academic-year creation, school editing, archive/restore and archived visibility, Staff read-only access, and responsive desktop/mobile layouts. Mobile width remains 390px without page-wide overflow; wide tables scroll within their panel.

Screenshots are saved locally under ignored `output/playwright/f03-configuration-desktop.png` and `f03-configuration-mobile.png`. Synthetic records are confined to a disposable test database; its stop endpoint exists only in the fixture process.

## Next checkpoint

Open `http://127.0.0.1:5173/#configuration` and enter the program's actual lists and academic periods. F04 will use these references to create scholar records and permanent scholar IDs.
