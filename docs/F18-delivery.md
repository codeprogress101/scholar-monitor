# F18 delivery - Payout Cycle Configuration

Release 0.19.0, completed 2026-10-02 on XAMPP MariaDB. F00-F17 accepted; F18 implemented and tested, ready for acceptance. Next: F19 calculated payout eligibility.

## Delivered workflow

The **Payout cycles** page supports individual, explicitly dated semester payouts. System Administrators create and configure Draft cycles using `configuration.manage`. A cycle has a unique code, immutable semester association (and its academic year), name, target date, selected payout requirement versions, and a per-requirement waiver acceptance flag. No month, day, requirement or operational sample cycle is seeded. Multiple separately identified cycles can belong to a semester.

Loading applicable requirements evaluates the configured target date and semester. Only active, effective, payout-scoped versions may be selected; empty/duplicate selections and stale versions are rejected. Every configuration appends a revision with reason, authority reference, actor and timestamp. Changing a draft date preserves its previous revisions and all other cycles.

Coordinators receive the explicit `payouts.operate` permission for **open**, **lock** and **close**. Staff read cycles and operate scholar documents; System Administrators have no cycle-operation or document authority. Account role assignments remain unchanged.

- Draft can be configured or opened. Opening revalidates selected versions against current applicable policy, then freezes dates and policy.
- Open can be locked or closed. Locked can be closed. Locked/closed cycles reject new document mutations and generation.
- No reconfiguration after opening, reopening, deletion or cycle-void workflow is exposed. Closing or locking is allowed after a parent period becomes unavailable so records can still be sealed; creating/configuring/opening requires an available semester and academic year.

Cycle history displays every revision, saved date, requirement version, waiver rule, actor and authority reference. Exact completed retries return the recorded result even after closure; changed retries conflict.

## Payout checklist integration

In a scholar's annual record, **Payout checklist** offers open, available cycles from the same academic year. Generation pins the opened cycle version, its target date and selected document versions. Same-cycle retries return the existing checklist. Semester checklists and payout checklists remain independent; one cycle cannot silently reuse another cycle's documents.

Receiving, verification-context loading, verification/correction/resubmission/rejection, and waiver commands all check current cycle state under the common writer guard. Verification uses the pinned payout-scoped definition and recorded target date. The checklist identifies the cycle, policy date and lifecycle state; document actions disappear when locked/closed.

The existing normal requirement rule remains separate from `satisfiesPayoutRequirement`, which applies the pinned cycle's waiver acceptance flag. A recorded waiver can satisfy the normal rule while failing a cycle that requires verification. This is only a document-level result; scholarship status, official masterlist membership, aggregate eligibility and financial operations remain F19 and later work.

## API and storage

- `GET /api/v1/payout-cycles` supports pagination and search; `GET /api/v1/payout-cycles/:id/history` returns immutable revisions. Both require configuration read access.
- `POST /api/v1/payout-cycles` creates a draft. Existing cycles use explicit `/configure`, `/open`, `/lock`, `/close` command endpoints. Origin/CSRF, UUID Idempotency-Key, matching action, expected revision, reason and reference are required. Create additionally requires cycle code, semester and expected semester revision. Configuration fields are name, target date, and `{definitionVersionId, allowWaiver}` selections.
- Existing `POST /api/v1/scholarships/:id/requirements/generate` accepts paired `payoutCycleId` and `expectedPayoutVersion` alongside the semester revision and generation evidence. Cycle/year/semester identity is rechecked server-side; clients cannot supply pinned dates or cycle-version IDs.

Migration `20261001140000_f18_payout_cycles.sql` adds append-only `payout_cycles`, `payout_cycle_versions`, `payout_requirements`, and `payout_cycle_commands`. Runtime access is SELECT/INSERT only. Cycle revision uniqueness, state/action checks, restrictive foreign keys and unique cycle codes protect history.

The forward checklist alteration adds nullable payout cycle/version links and a generated context key: `S:` plus semester ID for existing checklists, or `P:` plus cycle ID. Unique annual-record/context preserves semester uniqueness and independently enforces payout uniqueness. Composite foreign keys enforce matching cycle/semester and cycle/version; null-pair checks reject partial contexts. Existing semester IDs, policy dates and document history are preserved. Earlier applied SQL files are unchanged.

Cycle revision, policy snapshot, audit and retry receipt commit atomically. Current locking reads after authorization avoid stale repeatable-read snapshots; the common writer guard serializes configuration, generation and document changes. Audit failure rolls back all writes. No broad UPDATE/DELETE grants are added.

Core files: `server/payouts/{model,validation,service,routes}.ts`, requirement generation/list and receipt/workflow/waiver integration, `src/PayoutCyclesPage.tsx`, `src/PayoutChecklistForm.tsx`, checklist and navigation changes, migration/grants/readiness updates. Tests: `tests/payout-cycles.test.ts` and `scripts/test-payout-cycles-db.ts`.

## Validation

- `npm run check`: lint, 106 portable tests in 21 files, complete client/server/tool/test typechecks, production build and secret scan passed.
- 61 isolated database scenarios passed: payout cycles 11, generation 12, receiving 9, verification 9, waivers 10, RBAC 10. Coverage includes role separation, explicit arbitrary dates, historical isolation, policy selection/staleness, independent contexts, cycle-specific waiver rules, full payout verification, idempotency, audit rollback, concurrent configuration/locking, old authorization snapshots, all document guards, closed parent periods, CSRF and immutable grants.
- Browser: Administrator created a cycle with two required documents and different waiver rules; Coordinator opened it, generated the payout checklist and locked it. History retained create/open/lock revisions. Staff had read-only cycle controls; locked checklist actions and generation choices were absent. Desktop (1440x1000) and mobile (390x844) screenshots visually checked with no horizontal overflow. A cycle-code HTML pattern issue found during browser testing was corrected. Ignored evidence: `output/playwright/f18-payout-{desktop,mobile}.png` and `f18-locked-checklist-mobile.png`.
- Local XAMPP migration applied; `npm run test:db` passed all 18 migration checksums and restricted grants. Health reports F18/0.19.0 with connected database; readiness passed. Tests used synthetic disposable records. Existing personal accounts and operational scholarship records were not edited.
