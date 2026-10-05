# Simplified requirement receiving

Completed 2026-10-04 within F26. No later implementation function was started.

## 1. Files modified

- `server/requirements/instances-model.ts`: receiving period response type.
- `server/requirements/instances-service.ts`: discover applicable periods and automatically provision through the existing F14 generation transaction.
- `server/requirements/instances-routes.ts`: period discovery and automatic provisioning endpoints.
- `server/requirements/receipt-validation.ts`: strict batch request validation.
- `server/requirements/receipt-service.ts`: shared initial-receipt operation, reused by single and transactional batch receiving.
- `server/requirements/receipt-routes.ts`: batch receiving endpoint.
- `src/ScholarRequirements.tsx`: default to the unique current academic year, retain explicit year selection, and mount the simplified receiving screen.
- `src/ScholarsPage.tsx`: pass scholar identity to receiving.
- `package.json`: `test:receiving-db` command.
- `README.md`: revised receiving instructions.

## 2. Files created

- `src/ReceivingRequirements.tsx`: automatic provisioning, period selection, document checkboxes, shared receipt fields, and separate verification/history controls.
- `src/receiving-selection.ts`: deterministic default-period selection and Manila receipt date.
- `tests/receiving.test.ts`: batch validation and default-period unit tests.
- `scripts/test-receiving-db.ts`: disposable MariaDB integration tests and optional browser fixture.
- `docs/receiving-workflow-refactor.md`: this report.

Local browser evidence is in `output/playwright/receiving-before.png`, `receiving-after.png`, and `receiving-mobile.png`. No personal account or demo record was changed by these tests.

## 3. Database changes

None. No migration, grants, or role changes. Existing immutable checklist, instance, receipt, command, and audit tables are reused. Optional batch storage is represented by an empty string (not a fabricated location) in the existing non-null column. The original single-receipt contract still requires storage and a reason.

## 4. Backend/API changes

- `GET /api/v1/scholarships/:id/requirements/receiving-periods` discovers current semesters with applicable definitions, open payouts, and existing historical periods. Requires `scholars.read`.
- `POST /api/v1/scholarships/:id/requirements/provision` accepts only `{ periodId }`, with CSRF and idempotency key. Requires `requirements.generate`. The server derives versions and audit evidence, then calls F14 generation with its existing configuration lock, frozen definitions, duplicate prevention, and period restrictions. Open payout configuration is authoritative. No definitions are invented or silently substituted.
- `POST /api/v1/requirement-checklists/:id/receive` accepts distinct `{ id, expectedVersion }` items, receipt date, nullable physical reference, storage location, and remarks. Requires `requirements.receive`, CSRF and idempotency key. Every item must belong to that checklist. A single transaction saves each immutable receipt, each audit entry, and the batch retry result; any failure rolls all of them back.

Both receiving endpoints derive actor identity exclusively from the session. Original generation and single-receipt APIs remain available. Verification, correction, rejection, waiver, masterlist, qualification and eligibility rules are unchanged.

## 5. Frontend changes

Open Scholar > Receive requirements. The unique current academic year is selected when available; ambiguous years remain explicit choices. The unique open payout takes precedence over semester requirements. Multiple open payouts require a choice. Existing historical periods remain accessible; closed/locked periods disable receiving and controlled mutations.

The selected writable period automatically provisions missing instances and reuses existing ones. Staff no longer see generation buttons, reasons or references in this screen. They select Not Submitted documents and click **Receive Selected Requirements**. Date defaults to today in Manila; physical reference, location and remarks are optional. Successful receipt refreshes statuses immediately to Submitted, never Verified. Verification, resubmission, waiver and history remain in a separate expandable section using their existing permission-controlled components.

## 6. Tests added

Five unit tests cover optional receipt fields, invalid/forged inputs, duplicate selections, payout precedence, ambiguous periods, semester defaults and historical access.

Seven integration scenario groups cover automatic provisioning and concurrent reopening, exact pinned definitions and historical IDs, configured payout membership, role/session attribution, atomic rollback after a stale second item or injected second-insert failure, retry safety, Submitted status, cross-checklist rejection, multiple periods, and locked/closed payouts and academic years.

Browser acceptance checks cover actual tab-open provisioning, COR/COG appearance, repeated opening, removal of manual generation, batch submission, immediate Submitted statuses, mobile overflow, closed-period controls and recovery from a simulated load error.

## 7. Test results

- 139 unit tests passed across 29 files.
- 7 new receiving integration scenario groups passed.
- All 62 existing F13-F18 integration scenarios passed: definitions 11, generation 12, receipts 9, verification 9, waivers 10, payout cycles 11.
- Browser checks passed on desktop and at 390px width.

## 8. Build result

TypeScript checks and production build passed. ESLint and secret scan passed.

## 9. Unresolved issues

None identified in this refactor. Automatic setup requires an annual scholarship record and configured applicable semester policies or an open payout. Missing setup produces guidance; it does not fabricate obligations or establish eligibility.

## 10. Functional status

The simplified receiving workflow is functional. Existing domain behavior and history are preserved. Work stops at this refactor pending approval for a later function.

Follow-up simplification: physical reference, storage location and remarks now sit under a collapsed **Additional details (optional)** section. Document selection, date and the receive button remain visible. Browser checks confirmed submission with the section untouched and preservation of entered optional details after collapsing it. TypeScript, production build, component lint and the seven receiving integration scenarios passed.
