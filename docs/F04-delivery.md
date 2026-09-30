# F04 - Scholar Registry and Permanent Scholar ID

Release 0.5.0, completed on 2026-09-30 using XAMPP MariaDB 10.4.32. F03 was accepted by the request to proceed. F04 is implemented and tested, awaiting review. F05 duplicate detection remains next.

## Available workflow

Staff and Coordinators can create, search, view, and edit scholars at `/#scholars`. The form records names, optional birth date, a required registration academic year, optional barangay, and optional email, phone, and address. References come from Configuration. Every mutation requires a reason.

Michael retains only System Administrator. His account can configure references but cannot read or mutate scholar profiles. No account, password, or role assignment was changed, and no synthetic scholar was inserted in the real database.

Search supports names and permanent IDs, a registration-year filter, and pagination. List results expose the UUID, permanent ID, display name, first-entry year, academic year, and barangay. Birth date and contact details are available only through authorized profile detail. Desktop and mobile layouts are included.

## Identity and history

- Every scholar has a UUID primary key and a unique human ID such as `LDSS-2026-00001`.
- First-entry year means the start year of the academic year selected when the scholar is created. It is stored with the identifier. Reassigning the registration year or changing configured academic dates never changes the existing identifier or first-entry year.
- Each year has a separate sequence, limited to 99999. The server allocates it transactionally; browser-supplied identifiers are rejected. Database unique constraints also reject duplicates.
- Profile/contact changes, before/after audit records, sequence allocation, and retry history commit together. An audit failure rolls back the whole mutation.
- Stale edits fail with `VERSION_CONFLICT`. An identical retry by the same actor returns the original acknowledgment; different input with the same key fails with `IDEMPOTENCY_CONFLICT`.
- There is no delete, ID rewrite, or automatic merge. Registration year does not represent qualification or annual academic history.

## API contract

| Method / endpoint          | Permission      | Result                                                |
| -------------------------- | --------------- | ----------------------------------------------------- |
| GET /api/v1/scholars       | scholars.read   | Paginated summaries; q, academicYearId, offset, limit |
| GET /api/v1/scholars/:id   | scholars.read   | Profile, contact, version, period availability        |
| POST /api/v1/scholars      | scholars.create | Create acknowledgment                                 |
| PATCH /api/v1/scholars/:id | scholars.update | Update acknowledgment                                 |

List defaults to 25 items, maximum 100. Both HTTP guards and transactional services enforce permissions derived from the session. Writes require JSON, an allowed Origin, the session CSRF token, and an `Idempotency-Key` UUID.

Example body, using actual configured UUIDs in place of the reference placeholders:

```json
{
  "expectedVersion": 0,
  "reason": "Initial registry entry from verified records",
  "fields": {
    "firstName": "Example",
    "middleName": "",
    "lastName": "Scholar",
    "suffix": "",
    "birthDate": null,
    "academicYearId": "<configured academic-year UUID>",
    "barangayId": null,
    "contact": {
      "email": "",
      "phone": "",
      "addressLine": ""
    }
  }
}
```

POST requires version 0. PATCH requires the current positive version and the complete editable profile; optional values can be cleared with empty strings or null as appropriate. Unknown fields are rejected. Birth dates must be valid dates from 1900 through today in Asia/Manila.

Writes return `{ id, scholarId, version }`. The browser then reloads the full profile. Retry acknowledgments retain the original version, so consumers should reload detail for current state. A failed detail reload after a successful write is reported as saved with a refresh needed.

Stable errors also include `VALIDATION_FAILED`, `SCHOLAR_NOT_FOUND`, `REFERENCE_NOT_FOUND`, `REFERENCE_ARCHIVED`, `RECORD_LOCKED`, and `SCHOLAR_ID_EXHAUSTED`.

## Reference and persistence rules

New records require an active, unlocked academic year. Both the current and destination year must be available for edits; moving a profile cannot bypass a locked or archived year. Existing profiles remain readable. An unchanged archived barangay remains valid historical context but cannot be newly assigned.

Migration `20260929040000_f04_scholars.sql` adds scholars, scholar_identifiers, scholar_contacts, scholar_id_sequences, and scholar_commands. It is applied to the local database. Runtime grants allow only needed reads/inserts and mutable profile/contact/counter columns; identifiers and retry records cannot be updated, and none of these tables can be deleted through runtime credentials.

The service uses the F03 configuration guard row to serialize writes against reference changes, then locks profile/counter rows as needed. This coarse write serialization favors correctness for the initial local deployment; higher throughput may justify a narrower locking design later. MariaDB provides no PostgreSQL row-level security here: the API enforces authorization, supported by restricted grants and constraints. Audit records retain sensitive before/after fields; an audit-viewing workflow remains a later checkpoint.

## Verification

- `npm run check`: lint, 51 portable tests, client/server/tool/test typechecks, production build, and secret scan.
- `npm run test:db`: connectivity, all five migration checksums, and restricted grants against local XAMPP.
- Real MariaDB suites: 15 authentication, 10 authorization, 13 configuration, and 11 scholar scenarios passed in disposable databases (49 total).
- Scholar cases include concurrent allocation and edits across users, duplicate-ID rejection, search privacy, immutable identity after year changes, safe retries, audit rollback, period/reference guards, sequence exhaustion, CSRF, and restricted grants.
- Browser checks covered Staff creation, editing, permanent-ID search, desktop/mobile layouts, and System Administrator denial. Synthetic fixtures are separate from the real database and removed after checks.

Duplicate-person warnings (F05), qualification (F06), and annual academic records (F08) are not part of this release. The registry asks operators to check existing records before creating a person.
