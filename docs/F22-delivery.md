# F22 delivery - OVR Review and Atomic Finalization

Release 0.23.0, completed 2026-10-03 on XAMPP MariaDB. F00-F21 accepted; F22 implemented and tested, ready for acceptance. Next: F23 OVR Submission, Processing and Closure.

## Workflow

Open **Payout cycles > OVR drafts > Open OVR**. Staff and Coordinators with `ovr.prepare` can submit a Draft for review. Submission performs a fresh complete-roster validation and records the submitter, timestamp and revision. Empty or invalid rosters cannot enter review. Membership is read-only during review.

Coordinators with `ovr.finalize` can return a Review batch to Draft with a reason/reference, or finalize it. Finalization requires a different individual from the recorded submitter, including when the submitter is a Coordinator. System Administrators and Staff cannot finalize or return batches. No existing individual role assignments were changed.

Finalization checks every entry inside the same guarded transaction: current effective eligibility, Active status, current official membership, complete cycle-specific documents, no unresolved or stale overrides, no duplicate cycle membership, and matching admission source fingerprints. Approved positive overrides cannot bypass the mandatory OVR document/status rules. The cycle and academic period must be open and available. A stale but otherwise eligible entry must be returned to Draft, reviewed, removed and re-added before resubmission.

One invalid entry rejects the entire finalization. The response includes structured issues for the affected scholarships; no finalized state, snapshot, audit or retry receipt is partially committed. Previously recorded Draft validation is never trusted as permission to finalize.

Successful finalization freezes the entire roster, fresh normal/effective eligibility evidence, cycle context, validation, submission identity, finalizer identity, timestamp, reason and reference. A SHA-256 hash identifies the immutable snapshot. The UI displays the frozen roster separately from the current source check; subsequent source changes can affect the live check but cannot rewrite the finalized evidence. No reopening or membership commands are permitted after finalization. Finalization does not record payment or administrative processing; those remain F23.

## API and persistence

New endpoints under `/api/v1/ovr-batches/:id`:

- `POST /submit-review`: `ovr.prepare`, Draft to Review.
- `POST /return-to-draft`: `ovr.finalize`, Review to Draft.
- `POST /finalize`: `ovr.finalize`, Review to Finalized, separate submitter/finalizer.

All accept only `expectedRevision`, `reason`, and `reference`, with allowed Origin, CSRF and UUID Idempotency-Key. Client-supplied members, state or validation results are rejected. `OVR_INVALID_STATE` rejects invalid transitions; `SEPARATE_FINALIZER_REQUIRED` rejects self-finalization. `OVR_VALIDATION_FAILED` returns `error.details.validation`, including per-entry evidence and structured issue codes. The client renders those issues without parsing an error message. Other errors retain their existing response shape.

The existing detail endpoint now includes nullable `finalization: { snapshot, hash }`; live `validation` remains distinct. Batch history includes submission and finalization metadata, while existing Draft history remains readable.

Migration `20261002110000_f22_ovr_finalization.sql` adds append-only `ovr_finalizations`, one per batch, linked to its exact immutable batch revision and finalizer. Positive entry count and restrictive foreign keys protect metadata. Runtime grants are SELECT/INSERT only. Earlier migrations remain unchanged.

The shared configuration guard serializes workflow decisions against document, status, masterlist, override and roster changes. All source reads use current locking reads. The finalized state event, full snapshot, audit and retry receipt commit together. Audit failure rolls all of them back. Expected revisions and the unique batch snapshot prevent concurrent finalizations; exact completed retries return the same result, while changed retries conflict. The existing `ovr.draft` audit event family records workflow actions with state, submission metadata and finalization hash for compatibility.

Core changes: `server/ovr/{model,rules,service,routes}.ts`, structured AuthError details, `src/OvrDrafts.tsx`, migration/grants/readiness, release tracking. Tests extend `tests/ovr.test.ts`; `scripts/test-ovr-finalization-scenarios.ts` runs through the shared F19 fixture using `npm run test:ovr-finalization-db`.

## Verification

- `npm run check`: lint, 122 portable tests in 24 files, complete typechecks, production build and source/bundle secret scan passed.
- `test:ovr-finalization-db`: 20 isolated MariaDB scenarios (11 normal-eligibility prerequisites and 9 F22 cases). Two scholars are prepared through real qualification, masterlist publication and document APIs. Coverage includes one invalid member among two, structured issues, no partial snapshot, return/correction/resubmission, new pending overrides after submission, audit rollback after snapshot insertion, concurrency, exact/changed retries, immutable membership/evidence, self-finalization denial, restricted grants, CSRF and payout locks.
- Regression suites `test:ovr-db` (20 scenarios) and `test:overrides-db` (19) passed. These 59 scenario executions repeat the shared prerequisites in disposable databases.
- Browser: Coordinator returned a roster to Draft; Staff resubmitted it and had no finalization control; a separate Coordinator finalized both members. Finalized metadata, snapshot hash and roster are visible, with no membership-edit controls. Desktop 1440x1000 and mobile 390x844 screenshots were visually checked with no horizontal overflow. Evidence: ignored `output/playwright/f22-finalized-{desktop,mobile}.png`.
- Local migration 22 is applied. Database checksum and restricted-grant checks passed after XAMPP restarted normally on October 3. Health reports F22/0.23.0 with a connected database; readiness passed and the app responds on port 5173. Disposable fixtures, including the interrupted browser fixture, were cleaned up. Real account credentials and scholarship records were not changed.

The MVP validates a complete roster synchronously under the shared guard and loads per-batch history in full. Large-roster performance remains future scaling work. F23 must preserve this frozen snapshot and use separate administrative-processing/payment records.
