# F11 - Official Masterlist Workflow

Release 0.12.0, completed 2026-09-30 on XAMPP MariaDB. F10 is accepted. F11 is implemented and tested, pending review; F12 amendments and versioning is next.

## Workflow and permissions

The enforced sequence is Draft -> For Verification -> Submitted for Approval -> Approved -> Published -> Locked. Staff/Coordinators record verification and submissions using `masterlists.prepare`. Approval and return-to-Draft require `masterlists.approve`; publication requires `masterlists.publish`; locking requires `masterlists.lock`. The approver must differ from the actor who submitted for approval. Technical System Administrators do not receive operational approval rights.

Every transition requires the expected revision, reason and decision/verification reference. Actors and timestamps are server-derived. Only Draft entries are editable. Coordinators can return For Verification, Submitted for Approval or Approved records to Draft with a reason; previous events and snapshots remain retained. Published/Locked records cannot be reopened.

Submission, approval and publication revalidate the same-year Selected scholarship state, academic record and saved candidate snapshot. Source revisions cause a structured `SOURCE_CHANGED` error and require explicit return/review/refresh. A stale masterlist revision returns 409 `VERSION_CONFLICT`; locked entry writes return 423 `RECORD_LOCKED`.

## Publication, activation and immutable history

Publication creates an append-only official JSON snapshot and SHA-256 fingerprint. Its title, year identity, candidate count, award numbers and source snapshots are preserved. The authenticated UI provides a downloadable JSON copy; publication does not post externally or send messages.

Publication also activates each included Selected scholarship record, recording its effective date and initial operational-status version, an immutable activation link and an audit event. Snapshot, activations, workflow state, audit and retry receipt commit together or all roll back. The effective date must be no later than today and no earlier than any candidate's latest qualification decision or approved academic change. A previously activated scholar cannot be activated again through another masterlist. Qualification's direct activation endpoint remains blocked; publication is the supported path.

Locking preserves the exact publication bytes and permanently closes the masterlist. An already-published snapshot may still be locked after its academic year closes. Later source-data comparisons do not rewrite the official snapshot or undo activation. F09 blocks new or pending direct academic changes when approved, published or locked membership exists, as well as for already-activated records. Official corrections must wait for the F12 amendment workflow.

## API and storage

| Endpoint | Behavior |
| --- | --- |
| GET /api/v1/masterlists/:id/workflow | State, revision, attributed history and preserved publication |
| GET /api/v1/masterlists/:id/publication | Authenticated official JSON download; 404 before publication |
| POST /api/v1/masterlists/:id/submit-verification | Draft to For Verification |
| POST /api/v1/masterlists/:id/submit-approval | Record verified submission for approval |
| POST /api/v1/masterlists/:id/approve | Separate Coordinator approval |
| POST /api/v1/masterlists/:id/return-draft | Reasoned return of an unpublished record |
| POST /api/v1/masterlists/:id/publish | Snapshot and activation transaction |
| POST /api/v1/masterlists/:id/lock | Permanently lock a published record |

Commands accept `{ expectedVersion, reason, reference }`; publication additionally requires `effectiveOn` in YYYY-MM-DD format. Mutations require JSON, allowed Origin, CSRF and UUID Idempotency-Key. Exact retries return the original `{ id, version }`; changed payloads reusing a key fail. Validation errors include structured candidate issues. Additional errors include `SELF_APPROVAL_DENIED`, `INVALID_STATE_TRANSITION`, `ALREADY_ACTIVATED`, and `INVALID_EFFECTIVE_DATE`.

Migration `20260930110000_f11_official_masterlists.sql` is applied locally and expands status values and adds immutable `masterlist_workflow_events`, `masterlist_publications`, and `masterlist_activations`. All eleven migration checksums and runtime grants passed; the API reports F11 ready. Unique keys prevent duplicate workflow revisions/publications/activations. Narrow grants deny update/delete of official snapshots, workflow history and activation links. Triggers reject entry writes outside Draft, locked-record changes, and reopening a published record. Shared configuration locking coordinates source reads, official decisions and academic changes. Earlier migrations and role assignments remain unchanged.

## Verification

- `npm run check`: lint, 84 portable tests, typechecks, production build and secret scan passed.
- All 107 MariaDB scenarios passed: authentication 15, roles 10, configuration 13, scholars 16, qualification 10, status 9, academics 8, academic changes 8, drafts 9, official workflow 9.
- F11 covers permission denial, forged actors, ordered transitions, stale revisions/sources, self-approval, safe retries, database entry protection, publication/activation rollback, date ordering, approved membership protection, repeat activation denial, authenticated download, concurrent locks and unchanged official bytes.
- Browser verification used separate synthetic Staff and Coordinator accounts for verification submission, approval, publication, JSON download and locking. Locked edit buttons were disabled. Desktop/mobile layouts passed overflow checks; screenshots are `output/playwright/f11-official-desktop.png` and `output/playwright/f11-official-mobile.png`.

All workflow tests use disposable databases. The browser fixture was stopped and its database/user removed. No real masterlist was published and no real scholar activated for testing. F12 is not implemented.
