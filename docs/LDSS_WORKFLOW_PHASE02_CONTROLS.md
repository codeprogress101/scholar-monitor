# Phase 02 — Small control repairs

Date: 2026-10-06. Technically complete; human production acceptance remains pending.

## Delivered behavior

- Closing a payout cycle checks its OVR batches inside the existing transaction and shared configuration lock. Populated drafts, review, finalized, submitted, and processed batches prevent closure. Missing batch history also prevents closure. Closed batches with pending payment corrections prevent closure. The response identifies blocking batch codes.
- An unused or emptied draft does not prevent closure: it has no outstanding payment obligation. It remains historical and becomes read-only with the cycle. A closed batch can contain reconciled unpaid outcomes; closing does not invent a payment or cancel an entitlement.
- Removing a scholar from a draft masterlist or OVR batch requires a reason. The existing minimum-length validation applies. Internal references remain automatic; no additional mandatory reference box was introduced. Ordinary additions and workflow actions retain automatic audit evidence. Existing exceptional decisions and external financial references retain their requirements.
- Saving an annual academic entry or completing an academic-change action refreshes the scholar's year-level summary. Refreshing academic history refreshes the summary too. Earlier academic records remain preserved.

## Changed implementation

| Area | Files |
| --- | --- |
| Atomic closure guard | `server/payouts/closure.ts`, `server/payouts/service.ts` |
| Routine versus exception evidence | `server/routine-evidence.ts`, `src/MasterlistsPage.tsx`, `src/OvrDrafts.tsx` |
| Visible academic summary refresh | `src/AcademicPanel.tsx`, `src/ScholarsPage.tsx` |
| Regression coverage | `tests/payout-closure.test.ts`, `tests/routine-evidence.test.tsx`, `scripts/test-masterlists-db.ts`, `scripts/test-ovr-scenarios.ts`, `scripts/test-ovr-processing-scenarios.ts`, `scripts/test-eligibility-db.ts` |

The eligibility fixture previously expected successful cycle closure with unfinished OVR batches. Its expectation now reflects the repaired guard; existing locked-cycle and retry checks remain.

## Validation

- Focused processing integration passed using a disposable database: finalized and processed batches reject premature cycle closure; subsequent batch operations still succeed.
- Browser validation used `scripts/test-academic-db.ts --browser` with synthetic Staff credentials and a disposable database. Selected an academic year without a record, saved school/course and Third year with routine evidence omitted, and waited for Third year in the profile summary without reloading or switching sections. Passed. Fixture stopped and cleaned up.
- Browser evidence: `output/playwright/phase02/academic-saved.yml`, `academic-saved.png`, and `save-academic.js`. The initial unauthenticated session probe returned the expected HTTP 401; no later browser errors appeared.
- Full `npm run test:uat` gate passed: 35 suites, including 188 unit tests across 38 files, lint, type/build checks, secret scanning, database workflows, concurrency, and encrypted backup/restore verification. Source/build hashes were verified after completion. Evidence preserved at `output/baselines/workflow-phase02-20261006/validated-uat/F36-report.json` and adjacent suite logs.
- Build succeeded with the existing bundle-size advisory (client JavaScript approximately 501 kB); no build error. `git diff --check` passed.

## Data safety and recovery

No migrations, role changes, or live business-data edits. Existing snapshots, COR/COG records, payments, and audit histories are retained. Tests create disposable databases. The Phase 01 preservation package remains the baseline recovery point.

For rollback, revert only the Phase 02 changes listed above, rebuild, and rerun the regression gate; preserve the separate Phase 01 fixes in status and qualification testing. No database downgrade or historical-data rewrite is needed.

## Limits and next phase

This phase does not introduce the new eligibility policy, semester entitlement model, or revised admission workflow. Existing payout locking remains irreversible through the UI; finish batch processing before locking. Any previously locked cycle with unfinished batches needs an explicitly designed recovery path in the later closing phase, not a silent historical overwrite.

Phase 03 will specify policy sources, separate status models, continuing-scholar onboarding, and unresolved policy restrictions before additive schema work. Automated validation is distinct from Coordinator and technical-owner production sign-off.
