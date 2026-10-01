# F07 - Scholarship Status Change Workflow

Release 0.8.0, completed 2026-09-30 on XAMPP MariaDB. F06 is accepted; F07 is implemented and tested, pending review. F08 academic records remain next.

## Workflow and policy

Qualification remains separate from operational status. Existing annual records start with no operational status, version 0, and no effective date. F07 does not activate records: official-masterlist activation remains a future dependency. Only disposable tests seed Active states; no real accounts or records are changed for testing.

Staff and Coordinators request status changes. A different Coordinator must approve before current status changes. Coordinators can reject pending requests; only the original requester can cancel. Every request requires an effective date, reason code, explanation, and physical-record/decision reference. Decisions require their own explanation and reference. Server-derived actors and UTC timestamps are retained.

| Source              | Normal approved destinations                                                 |
| ------------------- | ---------------------------------------------------------------------------- |
| Active              | On Hold, Suspended, Graduated, Dropped, Withdrawn, Disqualified, Not Renewed |
| On Hold / Suspended | Active, Graduated, Dropped, Withdrawn, Disqualified, Not Renewed             |
| Any terminal status | None through normal commands                                                 |

Graduated, Dropped, Withdrawn, Disqualified, and Not Renewed are terminal. A correction must reference the latest approved terminal request for the same annual record, match its resulting version, and restore exactly its immediately preceding status. It appends a new request/decision, leaving the original intact. Correction approval also requires a different Coordinator. This prevents corrections from becoming an activation shortcut or arbitrary status rewrite.

Effective dates cannot be future dates or precede the latest status event. Reason codes are required uppercase identifiers (2-60 characters); the plan supplies no official code catalog, so none is invented. Explanation is 5-500 characters and reference is 3-300 characters. No document upload is involved.

Locked/archived years block requests and approvals. Rejection/cancellation remains available to close outstanding requests without changing scholarship state. Multiple requests may be pending, but after one wins approval, stale requests cannot be approved and must be rejected or cancelled.

Only Active passes `statusAllowsPayout`, a necessary status condition exposed by the service. Dropped and all other non-Active states fail it. This is not a complete eligibility engine or payout authorization; F19 must combine this guard with authoritative academic, requirement, and payout records.

## API contract

| Endpoint                                      | Permission                                          |
| --------------------------------------------- | --------------------------------------------------- |
| GET /api/v1/scholarships/:id/status           | scholars.read                                       |
| POST /api/v1/scholarships/:id/status/requests | scholarship.status.request                          |
| POST /api/v1/status-requests/:id/approve      | scholarship.status.approve                          |
| POST /api/v1/status-requests/:id/reject       | scholarship.status.approve                          |
| POST /api/v1/status-requests/:id/cancel       | scholarship.status.request, original requester only |

Request example:

```json
{
  "expectedVersion": 1,
  "toStatus": "dropped",
  "kind": "change",
  "effectiveOn": "2026-09-30",
  "reasonCode": "VERIFIED_DROPOUT",
  "reason": "Verified physical records support the requested change",
  "reference": "Physical status register entry 01"
}
```

Corrections use `kind: "correction"` and add `correctsRequestId`. Decisions accept only `{ reason, reference }`. Mutations require JSON, allowed Origin, CSRF, and a UUID Idempotency-Key. Return values are `{ requestId, outcome }`; refresh status history afterward. There is no generic status PATCH or hard-delete route.

Errors include `MASTERLIST_ACTIVATION_REQUIRED`, `INVALID_STATE_TRANSITION`, `INVALID_CORRECTION`, `VERSION_CONFLICT`, `INVALID_EFFECTIVE_DATE`, `IDEMPOTENCY_CONFLICT`, `SELF_APPROVAL_DENIED`, `RECORD_LOCKED`, and `REFERENCE_ARCHIVED`.

## Persistence and files

Migration `20260930070000_f07_status_changes.sql` is applied locally. It adds three operational projection columns to scholarship_records and three append-only tables: status_change_requests, status_change_decisions, status_change_commands. Earlier qualification constraints and migrations remain unchanged. The operational constraint requires qualification Selected for activated states. Request-edge constraints restrict supported transitions; one decision per request is enforced by its primary key.

The existing configuration writer lock serializes commands against period changes. Approval rechecks current state/version, chronology, and correction linkage inside the transaction. Status projection, decision/request history, audit, and retry records commit together. Audit failure rolls everything back; exact retries return their recorded outcome without a second transition. Runtime cannot rewrite/delete request, decision, or retry history, nor change person/year identity. MariaDB has no PostgreSQL RLS; server permission checks and narrow grants remain the authorization design.

Changed files: `server/status/` (model, validation, service, routes); `src/StatusPanel.tsx` and QualificationPanel.tsx; migration/grant/readiness scripts; release metadata and docs; `tests/status.test.ts` and `scripts/test-status-db.ts`. No role assignments or passwords were changed.

## Verification

- `npm run check`: lint, 71 portable tests, typechecks, production build, and secret scan passed.
- Real MariaDB suites: 15 authentication, 10 RBAC, 13 configuration, 16 scholar/duplicate, 10 qualification, and 9 status scenarios passed (73 total).
- `npm run test:db`: local connectivity, all seven migration checksums, and restricted grants passed.
- Browser: Staff submitted Active-to-Dropped; current state stayed Active while pending. Coordinator approval changed it to Dropped, displayed payout-status exclusion, and retained request/decision attribution. Desktop and mobile layouts were inspected.
- Disposable fixtures were removed. The real database has no seeded Active scholars, status requests, or decisions.

Actual masterlist activation, full payout eligibility, and academic history remain later checkpoints. F07 cannot be exercised on real unactivated annual records until that masterlist integration exists; the UI explains this rather than offering a bypass.
