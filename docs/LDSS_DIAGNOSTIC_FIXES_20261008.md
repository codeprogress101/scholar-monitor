# Diagnostic fixes — 8 October 2026

Scope: defects from `output/diagnostics/qa-20261007T155932Z/REPORT.md`. This is a delivery record; the single active tracker remains [the workflow implementation plan](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md).

## Delivered behavior

| Finding | Change | Validation |
| --- | --- | --- |
| QA-01: accepted continuing scholars blocked from masterlist | Adding an eligible accepted-roster scholar prepares an audited annual record with an explicit continuing-admission link. No invented examination/selection events. Existing review, publication and activation remain required. Published scholars can use the shared official semester receiving setup, unless a dedicated roster setup overrides it. | Accepted/unaccepted roster, Admin denial, rollback, retry, publication, zero automatic entitlement; continuing scholar completes the main payroll integration flow. |
| QA-02: graduation falsely says stipend pending | Pending wording now requires an actual matching semester entitlement. Without one, the profile says no approved final stipend and asks for eligibility review. Actual final receipt still derives archival. | Graduation before/after payment, no-entitlement graduate, held/unclaimed benefits and historical records. |
| QA-03: changed academic context leaves verification unusable | Save semester academic details and program category before verification. Changed evidence shows a recheck prompt. Staff/Coordinator can reverify the same paper without manufacturing a new receipt. The new decision links the prior verification; unchanged documents reject duplicate verification. | Source changes, role denial, retry, receipt preservation, immutable previous events, closed-period protections. |
| QA-04: search control obstructed at medium width | Search controls wrap and fit the available width. | Ordinary pointer search at 933 px in Chrome; screenshot retained. |
| QA-06: navigation and old guidance | Reload restores the selected payroll cycle and batch. Home and the workflow guide describe prior-qualification validation followed by Coordinator selection. | Browser selected batch survives reload; no page errors in this check. |
| QA-05: slow aggregate screens | Transaction-local repeated-read reuse and bulk source loading for payroll and dashboard. No cross-request eligibility cache. Writes invalidate cached evidence; existing authoritative finalization checks remain. | Unit cache-isolation tests, main payroll concurrency/stale-source tests, dashboard/report reconciliation, bounded 1,000-scholar comparison. See performance results below. |

## Database and data preservation

- Migration 40 adds nullable continuing-admission provenance and permits a linked re-verification event. Earlier migrations and existing business rows remain unchanged.
- Applied locally after an encrypted backup and successful isolated restore check. Canonically sorted before/after grant hashes match. No existing users or grants were changed by this migration.
- Evidence: `output/workflow-fixes-20261008/local-migration.json`, `database-before.json`, `database-after.json`, backup and restore logs. Existing 50-scholar sample cohort was retained.
- New test users/databases are disposable. The ordinary database is not used for workflow write tests.
- Final cleanup verification confirms both owned browser/performance databases and users were removed, all 50 working scholars remain, and every pre-existing business-table/grant hash still matches (`final-preservation.json`). Normal API health/readiness and the frontend returned HTTP 200 after cleanup.

## Verification

- `npm run check`: lint, 309 unit tests in 57 files, type checks, production build and secrets scan passed. The existing bundle-size warning remains.
- Targeted database suites passed: continuing rosters, requirement workflow, main payroll/managed release, dashboard/reports and historical payment processing. This is targeted post-fix regression, not a claim that every earlier suite or every screen was rerun.
- Browser evidence and raw performance samples are in `output/workflow-fixes-20261008/`. Initial browser harness attempts used the wrong fixture cycle and heading locator; corrected scripts passed. Their failed attempts are retained.

## Using the repaired workflow

1. **Continuing scholar:** accept the reviewed roster, record current academic placement, add to the annual masterlist, complete Coordinator review/publication. Historical admission documents are not invented or requested again.
2. **Semester documents:** open the current semester receiving workspace, save academic details/category if requested, receive COR and COG separately, then verify each paper. Complete the academic compliance review. Receipt or verification alone does not authorize payment.
3. **If records changed after verification:** use the document's recheck action, then refresh/review compliance. Do not receive the same paper again just to fix the context.
4. **Payroll:** eligible scholars appear from authoritative records in the appropriate batch. Coordinator finalization reserves the stipend; Staff records actual full receipt using the accounting evidence. Reload keeps your selected payroll open.

## Remaining limits

Human operational acceptance is still required. No automatic year-level promotion, guessed historical admissions, automatic genuine-failure exceptions, or payment from a reconsideration letter was added. Policy questions already recorded in the tracker remain pending. Aggregate performance at 1,000 scholars remains a scalability concern even after the improvement; detailed measurements are recorded below.

## Performance results

Same local XAMPP host, production-built frontend and isolated 1,000-scholar mixed fixture; no application mocks. Three warm samples for each heavy endpoint; five authenticated sessions, but only three actual simultaneous requests for these sample groups. These are observed medians/maxima, not robust p95/p99 estimates.

| Endpoint | Earlier single-request median | After fix median | Earlier overlapping maximum | After fix maximum |
| --- | ---: | ---: | ---: | ---: |
| Payroll candidates | 7.84 s | 3.69 s | 23.85 s | 10.76 s |
| Dashboard | 7.70 s | 3.42 s | 22.67 s | 10.26 s |

All sampled HTTP requests succeeded. Individual eligibility remained 25–44 ms in the new warm samples. Cumulative measured load across the two fix iterations was 141 seconds within a 180-second cap; preparation and cold reads are separate. The earlier intermediate results and final raw samples remain available. Frozen export timing still covers a two-row form, not a 1,000-row export. No production-scale capacity claim is made.

Browser re-verification also passed for two existing papers after an identity change, persisted after reload, and a post-check confirmed both original receipts and all earlier decision events remained unchanged (`recheck-result.json`). The initial locator attempt targeted the collapsed verification area; using the visible **Review COR/COG documents** action completed the flow.
