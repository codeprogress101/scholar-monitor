# F12 delivery - Masterlist Amendment and Versioning

Release: 0.13.0. Completed 2026-10-01 on XAMPP MariaDB. F00-F11 accepted; F12 ready for acceptance. Next: F13 requirement definition versioning.

## Delivered behavior

Staff and Coordinators request one correction for one scholar on the latest locked official masterlist. Supported types: course shift, school transfer, both, year-level correction, award-number correction, and identity refresh from the authoritative registry. Identity changes must first be recorded in the registry; amendment requests cannot supply arbitrary names or actors. Permanent Scholar IDs and roster membership remain unchanged.

Requests preserve the original version, before/after values, effective date, reason, reference, and authenticated requester. A different Coordinator approves or rejects; requesters can cancel their own pending requests. Approval alone changes no official data. A Coordinator publishes an approved amendment to create the next locked official version (1.0 -> 1.1, etc.). Version navigation retains access to all originals and their exact downloadable JSON snapshots and SHA-256 fingerprints.

Academic amendment publication appends approved academic history and updates the derived current placement atomically with the new publication, lineage, audit and retry receipt. Original academic entries are preserved. Scholarship activation links and operational status are never reset, including On Hold records.

## Guards and boundaries

- Requests, approval and publication require the latest locked version and an active, unlocked academic year. Rejection/cancellation of pending requests remain available after year closure.
- Source revisions, placement and identity are rechecked at approval/publication. Changed source data or a newer official version blocks stale requests. Submit a fresh request against the latest version; final decisions cannot be overwritten.
- New school/course references must be active. Effective dates cannot be future dates or precede the original publication; academic changes must also respect placement chronology.
- Unique parent and root/revision keys prevent branching official history. Concurrent publication has one winner. Repeated identical command keys return their saved result; changed payloads conflict.
- No roster additions/removals, bulk amendments, arbitrary identity overwrites, automatic merging, or operational-status changes are exposed here. Use F07 for status and the registry for identity corrections.

## API and implementation

`GET /api/v1/masterlists/:id/amendments` returns version lineage and requests with decisions. `POST` to the same path requests an amendment. `POST /api/v1/masterlist-amendments/:id/{approve,reject,cancel,publish}` records subsequent commands. All writes require authentication, current permission, same-origin/CSRF protection, and an `Idempotency-Key`.

Request fields: `expectedVersion`, `scholarId`, `kind`, `effectiveOn`, `reason`, `reference`, plus only the selected type's fields (`schoolId`, `courseId`, `yearLevel`, or nullable `awardNumber`). Identity refresh accepts none of those correction fields. Invalid/extra fields are rejected. Actors and publication lineage are assigned server-side.

Implementation: `server/masterlists/amendment-{model,validation,service,routes}.ts`, `src/MasterlistAmendments.tsx`, masterlist page/workflow integration, and migration `20260930120000_f12_masterlist_amendments.sql`. New amendment, decision, version-lineage and retry tables have SELECT/INSERT-only runtime grants. Earlier applied SQL remains unchanged. Existing masterlist triggers protect original locked records.

## Verification and local rollout

- `npm run check`: lint, 87 portable tests, typechecks, production build and secret scan passed.
- Database suites: 123 scenarios passed across existing suites and F12. The 16-scenario F12 suite includes seven official-workflow prerequisites and covers rejected requests, distinct approvers, stale sources, archived references, rollback/retry, concurrent publication, all correction types, immutable originals, preserved On Hold status, period locks and denied history mutations.
- Browser: disposable Staff request -> Coordinator approval -> publication -> locked version 1.6, with corrected year level; original version 1.0 still displays the original entry. Desktop and mobile screenshots saved under ignored `output/playwright/f12-amendments-*.png`.
- Local migration applied; `npm run test:db` passed all twelve checksums and restricted grants. Real accounts and operational records were not changed by verification.

Use **Masterlists -> latest locked list -> Amendments and official versions**. System Administrator retains configuration/account responsibilities and has no scholarship approval authority.
