# F05 - Duplicate Detection and Safe Scholar Creation

Release 0.6.0, implemented on 2026-09-30 using the existing XAMPP MariaDB database. F04 was accepted by the request for the next checkpoint. F05 is implemented and tested, pending review. F06 qualification remains next.

## Workflow and rules

The scholar creation form checks existing people before saving. It presents possible matches with names, permanent IDs, likelihood labels, and matching evidence. Staff or Coordinators can cancel, cancel and open an existing profile, or confirm a separate person with a reason of 10-500 characters. No record is merged or replaced. Michael remains System Administrator only; this release grants no operational authority.

The matching rules are deterministic and advisory:

- Names normalize Unicode accents, case, spaces, and punctuation. Equal first/last names warn even when middle names, suffixes, or birth dates differ.
- Similar first/last names allow one insertion, deletion, substitution, or adjacent transposition. Names shorter than four characters require equality.
- Matching nonempty email or phone warns even without a matching name, since contacts can be shared. Philippine mobile numbers normalize local `09...` and international `+639...` formats.
- Birth date with matching first name, surname, or address warns. Birth date or barangay alone does not trigger a candidate. Matching barangay/address adds supporting evidence.
- Name similarity plus matching birth date or contact is labeled likely; other candidates are possible. Missing values never count as matches.

Candidates span all registration years, including locked/archived periods. Candidate lists omit raw birth dates, email, phone, and address. Authorized full profiles remain available separately. More than 100 candidates blocks creation; users must check the entered details and consult the Coordinator rather than acknowledge an incomplete list.

## API and transaction guarantees

`POST /api/v1/scholars/duplicate-check` requires `scholars.create`, an active session, allowed Origin, JSON, and CSRF. Body: `{ "fields": <complete F04 profile fields> }`. The response contains `candidates` (at most 100), `total`, and `snapshot`.

When POST `/api/v1/scholars` finds candidates, include this additional field in the usual creation command:

```json
{
  "duplicateResolution": {
    "snapshot": "<snapshot returned by duplicate-check>",
    "decision": "create_separate",
    "reason": "Physical records confirm these are two distinct people"
  }
}
```

The snapshot is a freshness fingerprint of normalized validated input, every candidate's ID/version/evidence, and algorithm version `f05-v1`. It is not an authorization credential or proof of manual investigation. Authorization is enforced independently; resolution is an explicit, accountable operator decision.

Creation always rechecks inside the existing transaction under the shared configuration writer lock, using current locking reads. Concurrent identical submissions yield one creation and one review warning. A stale or missing resolution returns `409 DUPLICATE_REVIEW_REQUIRED`; too many candidates returns `409 DUPLICATE_REVIEW_LIMIT`. Candidate changes and changed input invalidate the reviewed snapshot. Empty or invalid resolution reasons return validation errors. PATCH rejects resolution metadata and retains F04 edit behavior.

Successful overrides append `duplicate_resolution` to the existing `scholar.changed` create audit event, including algorithm, snapshot, candidate IDs/versions, evidence, decision, and separate-person reason. Actor, request, and time are recorded by the existing audit envelope. Scholar, contact, sequence, audit, and retry history commit together. Failed audit insertion rolls everything back. Exact idempotent retries return the original acknowledgment without a second person or audit event. Unique permanent-ID constraints remain unchanged regardless of warning resolution.

No migration or runtime privilege changes are needed. There are still five immutable schema migrations. Preview and cancellation do not create business/audit records; decisions to create despite a warning are audited atomically.

## Changed files

- `server/scholars/duplicates.ts`: reusable matching and candidate-check service.
- `server/scholars/service.ts`, `routes.ts`, `validation.ts`, `model.ts`: guarded check endpoint, command validation, freshness enforcement, and audit metadata.
- `src/ScholarsPage.tsx`: candidate review, cancellation/open-existing action, confirmation and reason, safe retries, and stale-review refresh.
- `tests/duplicates.test.ts`, `scripts/test-scholars-db.ts`: matcher coverage and real database workflow/concurrency/rollback checks.
- Release metadata, overview/status labels, README, and implementation checklist updated to F05.

## Verification and limitations

`npm run check` passed lint, 58 portable tests, client/server/tool/test typechecks, production build, and secret scanning. `npm run test:scholars-db` passed 16 scenarios including the F04 regression cases and five F05 workflow groups. `npm run test:db` verifies real local connectivity, all five migration checksums, and restricted grants.

Browser checks use synthetic Staff accounts in a disposable database: a warning appears before creation, opening an existing profile cancels the entry, a reason plus explicit confirmation permits a separate record, and the review works at desktop and mobile widths. Test fixtures are removed afterward; no synthetic records are added to the real database.

Matching is heuristic: it can produce false positives and miss aliases, major spelling changes, or incorrect/missing data. Operators must still verify physical records. The initial implementation scans the registry and serializes checks with configuration writes; this favors correctness for the local MVP and needs profiling/indexed candidate retrieval before large-scale imports. Future F27 imports must use the guarded creation service rather than direct inserts. Qualification, merges, bulk import, and retroactive duplicate cleanup are outside F05.
