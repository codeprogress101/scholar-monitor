# F06 - Scholarship Record and Qualification Workflow

Release 0.7.0, completed 2026-09-30 on XAMPP MariaDB. F05 is accepted; F06 is implemented and tested, pending review. F07 status changes remain next.

## Workflow

Open a scholar profile, then Qualification records. Staff and Coordinators create an Applicant record for an active, unlocked academic year and record Exam Passed. Coordinators confirm qualification, selection, or Not Selected decisions. System Administrators have no access to these operations; Michael's role and account remain unchanged.

| Command     | Allowed source                    | Result                               | Permission                 |
| ----------- | --------------------------------- | ------------------------------------ | -------------------------- |
| create      | No record for scholar/year        | Applicant                            | scholarship.status.request |
| exam-passed | Applicant                         | Exam Passed                          | scholarship.status.request |
| qualify     | Exam Passed                       | Qualified                            | scholarship.status.approve |
| select      | Qualified                         | Selected                             | scholarship.status.approve |
| not-select  | Applicant, Exam Passed, Qualified | Not Selected                         | scholarship.status.approve |
| activate    | Selected                          | Rejected pending official masterlist | scholarship.status.approve |

Not Selected is terminal for that academic year. Selected cannot be demoted through these commands. No generic status PATCH, deletion, or history correction is provided. A Coordinator may also perform preparation; this checkpoint enforces role authority rather than a separate two-person approval requirement, which the plan does not specify for qualification.

Each command requires a reason, physical-record/decision reference, and effective date. Effective dates must be from 1900 through today in Asia/Manila and cannot precede the previous event. They may fall outside the academic year's dates to support pre-year examinations and late recording. Qualification is a referenced Coordinator decision; no unsupported exam cutoff, quota, or eligibility rule is invented.

Selection is not Active and does not establish payout eligibility. The activation endpoint always rejects Selected with `409 MASTERLIST_ACTIVATION_REQUIRED` until the authoritative masterlist integration is implemented. F06's database state constraint also excludes Active. Subsequent masterlist work must add the actual activation condition through a forward migration and guarded service.

## API contract

| Endpoint                                             | Behavior                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| GET /api/v1/scholars/:id/scholarships                | Annual record list; scholars.read                             |
| POST /api/v1/scholars/:id/scholarships               | Create annual Applicant record                                |
| GET /api/v1/scholarships/:id                         | Annual state and ordered qualification history; scholars.read |
| POST /api/v1/scholarships/:id/qualification/:command | Explicit command from the table above                         |

Creation body:

```json
{
  "academicYearId": "<configured academic-year UUID>",
  "expectedVersion": 0,
  "effectiveOn": "2026-09-30",
  "reason": "Verified annual application",
  "reference": "Physical applicant register entry 01"
}
```

Transition bodies omit academicYearId and use the current positive expectedVersion. All mutations require JSON, an allowed Origin, CSRF, and a UUID Idempotency-Key. Client status, approval identity, and other unknown fields are rejected. Successful commands return `{ id, status, version }`; reload detail to obtain current history.

Errors include `INVALID_STATE_TRANSITION`, `DUPLICATE_SCHOLARSHIP_YEAR`, `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `INVALID_EFFECTIVE_DATE`, `RECORD_LOCKED`, `REFERENCE_ARCHIVED`, `REFERENCE_NOT_FOUND`, and `SCHOLARSHIP_NOT_FOUND`. Unauthorized Staff approvals and System Administrator access return 403.

## Persistence and concurrency

Migration `20260930060000_f06_qualification.sql` is applied to the real local database. It adds scholarship_records, qualification_events, and qualification_commands. There are six migrations; F05 required none. A unique scholar/year key enforces annual uniqueness; restrictive foreign keys preserve person/year references. State and event-edge checks restrict qualification values and transitions. Permanent scholar ID and registration year are unaffected by annual records.

The shared configuration writer lock serializes commands against year archive/lock changes. Current row reads and expected versions prevent stale overwrites. Current-state projection, append-only events, audit records, and idempotency results commit together; audit failure rolls them all back. Exact retries return the original result, even after later state changes or a period lock, without performing a new mutation.

Events preserve actor ID and name at the time, effective date, UTC recording time, from/to state, version, reason, and reference. Runtime can update only the current record's state/version/effective date/timestamp. It cannot change annual person/year identity, rewrite/delete events or command history, or delete annual records. MariaDB does not provide PostgreSQL RLS; API permissions remain the authorization boundary supported by narrow grants and constraints.

## Changed files and verification

- `server/qualification/`: model, validation, transition service, and command routes; wired through server/app.ts.
- `src/QualificationPanel.tsx` and ScholarsPage.tsx: annual creation, permitted commands, history, stale-error feedback, and safe retries.
- New F06 migration; migration grants, readiness, local database checks, release metadata, and plan/docs updated.
- `tests/qualification.test.ts`: all 25 state/action combinations, permissions, and command validation within eight tests.
- `scripts/test-qualification-db.ts`: ten real MariaDB scenarios covering authorization, uniqueness, transitions, activation denial, concurrency, idempotency, rollback, dates, periods, and immutable-history grants.

`npm run check` passed lint, 66 portable tests, typechecking, production build, and secret scanning. Database suites passed 15 authentication, 10 RBAC, 13 configuration, 16 scholar/duplicate, and 10 qualification scenarios (64 total). `npm run test:db` passed connectivity, six migration checksums, and restricted grants.

Browser checks used isolated synthetic accounts: Staff created an annual Applicant record and recorded Exam Passed without approval controls; Coordinator confirmed Qualified and Selected. History retained both actors and references, and the activation limitation remained visible. Desktop and mobile layouts were checked. Fixture records are removed after testing; no synthetic scholars or annual records are inserted into the real database.

Local operation remains at http://127.0.0.1:5173. Official masterlists, Active-status workflows, payout eligibility, academic history, and controlled corrections are later checkpoints.
