# R05 Reports and Pagination Optimization - 21 October 2026

**Passed locally; R05 complete. Stop at R05 and await approval.** LAN/production data and services were not changed. No deployment, application schema/index change, dependency update or R06/R07 work occurred. No working-record approvals or payments were recorded; synthetic payment scenarios ran only in disposable tests.

The actual loopback HTTP comparison for the 835-scholar eligibility report returned the same 25 rows and per-scholar source fingerprints. Median response time changed from **98582.68 ms to 269.37 ms**; SELECTs changed from **207769 to 117**. This is a measured local result, not a LAN/cold-start SLA.

## Baseline and measurement conditions

- Frozen R04 source: all **567 source inputs and 210 artifacts** matched its successful 56-suite acceptance manifest before R05 edits. Baseline manifest: [baseline-manifest.json](../../output/r05-reports-20261021/baseline-manifest.json). Original Git HEAD: `89cba417442219f3839e59766e19b62fa744b944`; pre-existing R01-R04 changes were retained.
- Existing encrypted 835-scholar archive SHA-256: `b47d49cb585d302b76fd5359d0412eba1804950cb5305d516e83680018305e05`. Restored into isolated owned databases using the protected existing recovery key; no dataset was copied into LAN or the working database.
- Annual reports use the unchanged archived Draft dataset. A separate copy was advanced through authorized review/finalization commands for 835 frozen payment-report rows, all pending outcomes. No stipend payments were recorded. A third copy hosted synthetic Staff/Coordinator/Administrator browser accounts.
- All seven report kinds, page sizes 25/50/100, three sequential samples per cell: **63 baseline reads saved before source edits**, followed by final-source complete-read and page-read comparisons. SQL/OS buffers were not flushed. GC ran before each measured service sample; memory sampled every 10 ms plus the final sample.
- Service tables include authorization snapshot/revocation checks and JSON serialization, but exclude HTTP, session middleware and browser rendering. Database milliseconds are accumulated client-observed SELECT round-trip times, not isolated engine CPU. Returned SQL rows are measured; **actual rows examined were unavailable**. EXPLAIN estimates are not presented as actual examined rows.
- Supplemental actual HTTP comparison: three before/after pairs, 25-row eligibility, localhost ports bound to 127.0.0.1, same restored dataset and synthetic Staff session. Includes session authentication, routing, serialization and response-body transfer. Both frozen/current server module graphs were loaded in that comparison process. Cookies and private bodies were withheld from public evidence.
- Node v22.21.0 on the existing Windows / 16 GB XAMPP-MariaDB host. No tests or builds ran concurrently with final benchmarks. Shared-host timing variation remains possible.

## Confirmed bottlenecks

1. Every legacy report collected all report rows before `slice(offset, offset + limit)`. Eligibility, missing and verification pages called full `eligibilityView` for all 835 scholars: 207,766 SELECTs even for an empty 25-row workload response.
2. Common workflow policies, semester owners, revisions, document/workflow evidence and masterlist publication sources were read repeatedly. A representative old workload sample repeated the same policy-scope query 7,965 times and a workflow-event query 5,845 times.
3. Missing/verification reports loaded saved eligibility and override histories although document workload classification uses current authoritative requirement sources.
4. Payroll reports decoded every historical batch event just to obtain the latest batch. Payments used repeated linear searches and calculated unused reconciliation details.
5. The Reports client could request before its initial permission/cycle context was ready. Its 60-second timeout was shorter than the measured old derived-report calculation. Increasing that timeout was not the fix.
6. The existing global report hash fingerprints all ordered rows; computing it from one page would silently change the contract. Frozen roster blobs must also be decoded and hash-verified before their financial contents can be trusted.

## Implementation and preserved rules

- SQL COUNT plus LIMIT/OFFSET for scholar, eligibility, masterlist and OVR detail pages. Same filters and order: annual human ID + annual ID; masterlist title/version/ID; batch code/ID. Payment entry order and authoritative document-requirement order remain unchanged.
- Reuse existing request-local `candidateReads`, `cohortReads`, `eligibilityView`, `eligibilitySources`, `requirementWorkload`, `effectiveRoster`, payment and graduation readers. No second eligibility engine or simplified payout calculation.
- Bounded 200-record source windows for full derived reports; scoped windows for eligibility pages. Skip only eager saved-eligibility/override preload in requirement-only reports. The new optional preload flag defaults to the old behavior, and unexpected history reads fall through to the database rather than fabricated empty cache entries.
- Stream the exact old whole-report JSON SHA-256 and retain only requested output rows. Original full-report responses, counts, scopes and fingerprints remain compatible.
- Decode the latest batch event only; frozen original/approved-amendment hash validation remains in the existing reader. Use a first-match payment map, preserving historical `find` behavior. Payment-only reports do not calculate unused reconciliation totals.
- Reuse unchanged R03 authoritative aggregate readers for optional summaries. Summary hashes deliberately identify aggregate evidence rather than unseen detail rows.
- Existing consistent read-only snapshots, permission-specific authorization, post-read revocation checks and transaction ownership remain unchanged. No new cross-request cache, audit removal, row-lock change or database-constraint change. Finalization and payment commands still perform their existing fresh checks.
- Scholarship standing, official membership, COR/COG policy, waiver acceptance, overrides, historical placement, Course pending provenance, deferrals, reprocessing and one-claim rules remain unchanged. Financial command/rendering/eligibility/authorization preservation evidence: [financial-preservation.json](../../output/r05-reports-20261021/financial-preservation.json).

## API and frontend changes

| Interface | Behavior |
| --- | --- |
| Existing GET `/api/v1/reports/operational` | Existing strict query/response contract; full-scope counts and exact original whole-row hash retained. |
| New GET `/api/v1/reports/operational/page` | Same validated report/cycle/offset/limit inputs and permissions. SQL page where possible. `countsScope: page` with `report-page-v1` identifies page-only counts/hash. Inherent full-scope reports use `countsScope: report`, `report-content-v1`. |
| New GET `/api/v1/reports/operational/summary` | Current authoritative totals/status groups, cycle/year/semester context; no detail rows/columns. Explicit `dashboard-summary-v1` aggregate hash basis, reused from R03. |

All responses retain `Cache-Control: no-store` and `Vary: Cookie`. Page and summary are separate consistent reads; the UI states that records may change between them. The aggregate/page hashes cannot be substituted for financial review fingerprints or the legacy whole-report hash.

Reports now offer 25/50/100 rows, correct page counts, scoped loading/errors, page-context retry, startup metadata retry, safe invalid-cycle selection, and keyboard focus restoration after both paging directions and page-size changes. Full summaries are explicitly requested; one page does not secretly calculate all scholars' eligibility. Initially loading permissions/cycles no longer causes an unnecessary report request. Existing cycle/year scoping and supported filters were preserved; no new search/sort/business filters were invented. Existing complete Excel export commands remain separate from pagination.

## Measured detail response time and SELECTs

Three samples per cell; medians in ms. Before is the original full-scope request; after is the new page endpoint. Missing/verification still resolve full-scope document workload. Financial measurements use the finalized 835-row copy.

| Report | Size | Before ms | After ms | Before SELECT | After SELECT | Evaluated before / after |
| --- | --- | --- | --- | --- | --- | --- |
| scholars | 25 | 16.64 | 14.48 | 15 | 13 | 0 / 0 |
| scholars | 50 | 16.68 | 13.95 | 15 | 13 | 0 / 0 |
| scholars | 100 | 16.02 | 14.72 | 15 | 13 | 0 / 0 |
| missing | 25 | 90058.34 | 6677.8 | 207766 | 604 | 835 / 835 |
| missing | 50 | 91172.99 | 6706.1 | 207766 | 604 | 835 / 835 |
| missing | 100 | 91559.73 | 6638.81 | 207766 | 604 | 835 / 835 |
| verification | 25 | 95650.47 | 6176.59 | 207766 | 604 | 835 / 835 |
| verification | 50 | 92314.78 | 5798.01 | 207766 | 604 | 835 / 835 |
| verification | 100 | 94817.35 | 5780.63 | 207766 | 604 | 835 / 835 |
| eligibility | 25 | 92049.76 | 527.66 | 207766 | 114 | 835 / 25 |
| eligibility | 50 | 90395.69 | 698.79 | 207766 | 116 | 835 / 50 |
| eligibility | 100 | 94401.59 | 966.31 | 207766 | 119 | 835 / 100 |
| ovr | 25 | 133.71 | 115.3 | 16 | 17 | 0 / 0 |
| ovr | 50 | 141.31 | 110.25 | 16 | 17 | 0 / 0 |
| ovr | 100 | 148.08 | 107.19 | 16 | 17 | 0 / 0 |
| payments | 25 | 139.89 | 113.26 | 16 | 16 | 0 / 0 |
| payments | 50 | 133.11 | 109.4 | 16 | 16 | 0 / 0 |
| payments | 100 | 154.52 | 107.85 | 16 | 16 | 0 / 0 |
| masterlists | 25 | 8.16 | 8.08 | 11 | 12 | 0 / 0 |
| masterlists | 50 | 8.64 | 7.79 | 11 | 12 | 0 / 0 |
| masterlists | 100 | 12.16 | 8.09 | 11 | 12 | 0 / 0 |

Five report kinds met the sub-second target in these warm local median samples. Missing and verification remained about six seconds because correct membership/status classification requires resolving every applicable requirement. Their 835-scholar fixture results were empty because its documents were already approved; nonempty missing/verification cases are covered by the permanent mixed-state/capacity fixtures. No instant-loading claim is made for full derived summaries.

## Database time, returned rows and payloads

| Report | Size | DB ms before / after | SQL rows before / after | Body bytes before / after |
| --- | --- | --- | --- | --- |
| scholars | 25 | 13.8 / 12.05 | 916 / 107 | 3571 / 3626 |
| scholars | 50 | 13.87 / 11.72 | 916 / 132 | 6609 / 6664 |
| scholars | 100 | 13.16 / 12.36 | 916 / 182 | 12716 / 12772 |
| missing | 25 | 80804.39 / 2764.69 | 172465 / 52524 | 518 / 579 |
| missing | 50 | 82072.99 / 2821.88 | 172465 / 52524 | 518 / 579 |
| missing | 100 | 82435.83 / 2787.82 | 172465 / 52524 | 519 / 580 |
| verification | 25 | 86296.68 / 2675.98 | 172465 / 52524 | 499 / 560 |
| verification | 50 | 83327.78 / 2552.1 | 172465 / 52524 | 499 / 560 |
| verification | 100 | 85490.32 / 2536.16 | 172465 / 52524 | 500 / 561 |
| eligibility | 25 | 83221.54 / 408.93 | 172465 / 1687 | 6703 / 6757 |
| eligibility | 50 | 81594.83 / 473.27 | 172465 / 3254 | 12741 / 12795 |
| eligibility | 100 | 85264.69 / 547.92 | 172465 / 6388 | 24848 / 24904 |
| ovr | 25 | 10.31 / 14.32 | 86 / 85 | 613 / 669 |
| ovr | 50 | 18.94 / 9.92 | 86 / 85 | 613 / 669 |
| ovr | 100 | 24.64 / 8.57 | 86 / 85 | 614 / 670 |
| payments | 25 | 19.93 / 13.05 | 86 / 84 | 5894 / 5955 |
| payments | 50 | 11.32 / 8.46 | 86 / 84 | 11117 / 11178 |
| payments | 100 | 11.34 / 8.29 | 86 / 84 | 21545 / 21606 |
| masterlists | 25 | 6.28 / 6.25 | 82 / 83 | 562 / 618 |
| masterlists | 50 | 6.92 / 6.12 | 82 / 83 | 562 / 618 |
| masterlists | 100 | 9.54 / 6.25 | 82 / 83 | 563 / 619 |

The old endpoint already returned a page-sized body; the main gains are database/computation work, not a large reduction in detail payload. Additive scope/hash metadata slightly increases page payloads. No indexes/schema changes were necessary: existing scope/foreign-key/primary-key access was sufficient for the measured workload. Plans: [Draft](../../output/r05-reports-20261021/index-evidence-draft.json), [Finalized](../../output/r05-reports-20261021/index-evidence-finalized.json). Whole-scope sorting/metadata reads remain bounded; EXPLAIN does not prove actual rows examined.

## Actual HTTP and memory

| 835-scholar eligibility, first 25 rows | Before | After |
| --- | --- | --- |
| Median actual HTTP ms | 98582.68 | 269.37 |
| SELECTs | 207769 | 117 |
| Median DB round-trip ms | 88958.89 | 125.33 |
| SQL rows returned | 172434 | 1656 |
| Response body bytes | 6703 | 6757 |
| Median sampled peak heap MiB | 64.04 | 66.83 |
| Median sampled peak process RSS MiB | 173.1 | 166.89 |

The HTTP response-time reduction is about 99.7%. Its row values and per-scholar source fingerprints match exactly. The old request combined the page with full-scope counts/hash; the new page labels its page-only counts/hash explicitly. Whole-cohort eligibility summaries remain a separate approximately six-second read; the page timing does not mean all 835 assessments were calculated in 269 ms. Separate service and HTTP series were collected at different times; do not compare their absolute timings as a network-overhead estimate.

Service-process memory below is the median sampled peak per case, not per-call incremental allocation or isolated total application memory. The same long-lived process runs successive kinds; RSS can retain capacity from earlier heavier requests. Module graphs also differ from a complete deployed application.

| Report | Size | Peak heap MiB before / after | Peak RSS MiB before / after |
| --- | --- | --- | --- |
| scholars | 25 | 22.19 / 17.52 | 103.82 / 104.06 |
| scholars | 50 | 22.28 / 17.61 | 103.59 / 104.11 |
| scholars | 100 | 22.35 / 17.73 | 104.11 / 104.12 |
| missing | 25 | 39.95 / 97.74 | 128.7 / 246.76 |
| missing | 50 | 40.17 / 102.24 | 130.21 / 256.37 |
| missing | 100 | 40.81 / 99.91 | 129.23 / 256.94 |
| verification | 25 | 40.71 / 113.92 | 119.75 / 264.78 |
| verification | 50 | 40.79 / 117.81 | 112.73 / 282.23 |
| verification | 100 | 40.8 / 125.93 | 110.11 / 294.02 |
| eligibility | 25 | 40.82 / 46.45 | 109.94 / 283.69 |
| eligibility | 50 | 41.01 / 51.52 | 109.64 / 222.63 |
| eligibility | 100 | 41.07 / 63.68 | 109.49 / 235.32 |
| ovr | 25 | 58.78 / 42.43 | 143.71 / 114.26 |
| ovr | 50 | 46.59 / 42.5 | 133.71 / 118.23 |
| ovr | 100 | 46.63 / 42.57 | 133.89 / 118.0 |
| payments | 25 | 47.65 / 43.41 | 134.05 / 118.21 |
| payments | 50 | 47.7 / 43.48 | 134.29 / 118.9 |
| payments | 100 | 47.72 / 43.57 | 134.55 / 119.05 |
| masterlists | 25 | 22.9 / 25.21 | 104.89 / 235.14 |
| masterlists | 50 | 22.81 / 25.16 | 104.65 / 235.14 |
| masterlists | 100 | 22.8 / 25.17 | 104.65 / 235.14 |

Bulk source reuse trades additional retained working memory for far fewer SQL calls; **uniform memory reduction was not achieved**. Windows/Node RSS need not fall immediately after collection. Source windows are bounded; no OOM or retained checked-out connection was observed. Both HTTP apps and the browser fixture were closed. An initial diagnostic asserted zero server connections immediately after pool QUIT; it saw one transient closing connection. The harness now observes a bounded drain, and subsequent checks confirmed closure. An initial resume helper also needed UTF-16 PowerShell-log decoding; these were test-harness corrections, not application fixes. Cleanup verification also needed a non-reserved SQL alias; the exact owned targets were rechecked and cleanup completed.

## Full compatibility reads and summaries

| Kind | Legacy-compatible complete-read median ms, size 25 | SELECTs |
| --- | --- | --- |
| scholars | 21.95 | 15 |
| missing | 6474.9 | 604 |
| verification | 6503.84 | 604 |
| eligibility | 6186.64 | 614 |
| ovr | 117.81 | 16 |
| payments | 124.96 | 16 |
| masterlists | 9.03 | 11 |

Optional aggregate summaries below are new endpoints; there was no previous summary endpoint to compare as an identical API. Counts match the original reports and aggregate hashes match the frozen R04/R03 reader for the same kind/snapshot.

| Summary kind | Median ms | SELECTs | Body bytes | Total |
| --- | --- | --- | --- | --- |
| scholars | 10.38 | 12 | 608 | 835 |
| missing | 6093.49 | 615 | 600 | 0 |
| verification | 5996.24 | 615 | 581 | 0 |
| eligibility | 5954.83 | 615 | 703 | 835 |
| ovr | 102.02 | 14 | 521 | 1 |
| payments | 89.57 | 16 | 700 | 835 |
| masterlists | 6.71 | 11 | 560 | 1 |

## Equivalence and regression verification

- All 63 complete-read before/after DTO comparisons passed, excluding only live generated/checked timestamps. Rows, scope, columns, totals, counts and original whole-report SHA-256 match.
- Every page was traversed at 25/50/100 for all seven kinds. Concatenated row hashes reproduce all original global hashes; unique IDs equal totals, including final remainders and empty boundary pages: [all-pages.json](../../output/r05-reports-20261021/all-pages.json).
- Independent permanent frozen-R04 oracle: **6798 kind/offset/limit comparisons across 203 checkpoints** in the final targeted run, across separate Treasury, override and reprocessing fixtures. Includes source reopening, accepted/excluded waivers, approved/stale overrides, membership changes, holds/standing, corrected paid/unpaid records, historical receipts and frozen/reprocessing states.
- Capacity fixture adds 235 scholars, ensuring first/middle/last pages and nonempty document workload beyond 100 rows. Its filtered Excel export contains all 235 unique scholars. A separate archived-fixture export contains **all 835 unique scholars**, not 25/50/100: [export-835.json](../../output/r05-reports-20261021/export-835.json). Existing export audit remains intact.
- Concurrent edit/annual insertion: one in-flight page retained consistent count and rows; the next request saw the committed change; temporary identities were removed/restored. No stale cross-request projection was used.
- New route checks cover all seven kinds, Staff/Coordinator access, Administrator/unassigned denial, strict invalid pagination/extra fields, unknown cycles, no-store headers and summary count semantics. Existing finalization, command retry, audit-rollback and payment constraints remain covered by the configured gate.

## R01-R04 regression benchmarks

| Reader | Workset | Before median ms | After median ms | SELECTs before / after | Equivalence |
| --- | --- | --- | --- | --- | --- |
| R01 Registry | 25 | 746.04 | 937.17 | 2059 / 2059 | Exact full JSON / fingerprint match |
| R01 Registry | 100 | 3101.75 | 3583.26 | 8165 / 8165 | Exact full JSON / fingerprint match |
| R02 candidates | 25 | 470.95 | 612.46 | 244 / 244 | Exact full JSON / fingerprint match |
| R02 candidates | 100 | 1061.48 | 1181.44 | 614 / 614 | Exact full JSON / fingerprint match |
| R02 candidates | 835 | 6528.36 | 6163.17 | 4712 / 4712 | Exact full JSON / fingerprint match |
| R03 Dashboard | 835 | 5002.6 | 5337.51 | 620 / 620 | Exact cards or summary / fingerprints |
| R04 initial summary | 835 | 8.35 | 7.71 | 14 / 14 | Exact cards or summary / fingerprints |

Sequential Registry timing varied despite identical queries/output. A follow-up control alternated frozen/current implementations in one Node process on the same database, excluded warm-up, and used the same conditions for both. It did not show a material code-specific difference; timing is not a strict SLA or a statistically powered result.

| Registry workset | Frozen median ms | Current median ms | SELECTs each | Result |
| --- | --- | --- | --- | --- |
| 25 | 1453.52 | 1430.27 | 2059 | Exact output SHA-256 match |
| 100 | 5762.36 | 5779.21 | 8165 | Exact output SHA-256 match |

## Browser results and evidence

Passed on the final Reports client: Staff 25/50/100 sizes; correct page counts; keyboard Next/Previous including return to first page; focus after size changes; disjoint adjacent identities; explicit summary and truthful page counts; one request per initial link/reload; synthetic 503 page retry; startup-cycle metadata retry; invalid-cycle deep links without permanent loader; reload/Back/Forward; desktop and 800px tablet containment; empty scopes; Coordinator summary; Administrator direct-link/API denial. Encoding and focus defects found during review were corrected and retested. Native Word printing, LAN TLS/network behavior and native 200% zoom were not re-executed for this report-only change.

Evidence: [Staff desktop](../../output/playwright/r05/staff-eligibility-25-desktop.png), [tablet](../../output/playwright/r05/staff-eligibility-tablet.png), [Coordinator summary](../../output/playwright/r05/coordinator-eligibility-summary.png), [startup retry](../../output/playwright/r05/startup-error-retry.png), [Administrator denial](../../output/playwright/r05/administrator-denied.png). Screenshots and raw private fixture bodies remain local QA evidence, excluded from publication.

## Executed commands and acceptance

```powershell
node --expose-gc output/r05-reports-20261021/reports.mjs before
node --expose-gc output/r05-reports-20261021/reports.mjs before --financial
python output/r05-reports-20261021/apply.py
npm run check
npm run test:report-pagination-db
node --expose-gc output/r05-reports-20261021/reports.mjs after
node --expose-gc output/r05-reports-20261021/reports.mjs after --financial
node --expose-gc output/r05-reports-20261021/report-page.mjs after
node --expose-gc output/r05-reports-20261021/report-page.mjs after --financial
node --expose-gc output/r05-reports-20261021/report-summary.mjs after
node --expose-gc output/r05-reports-20261021/report-summary.mjs after --financial
node --expose-gc output/r05-reports-20261021/all-pages.mjs
node --expose-gc output/r05-reports-20261021/all-pages.mjs --resume-financial
node --expose-gc output/r05-reports-20261021/registry-paired.mjs
node --expose-gc output/r05-reports-20261021/http-eligibility.mjs
node output/r05-reports-20261021/preservation.mjs
git diff --check
$env:LDSS_UAT_OUTPUT = 'output/r05-reports-20261021/uat-r1'
npm run test:uat
```

The R01/R02 reference commands used `fixture.mjs before|after --reuse --registry` and `--controlled --keep` (controlled samples use `--expose-gc`); R03 used `dashboard.mjs before|after`; R04 used `r04-summary.mjs before|after draft`. Playwright CLI session `r05` ran the saved `track.js`, `staff.js`, `history.js` and `roles.js` under `output/playwright/r05/`. The original baseline archive and failed/exploratory diagnostic logs are retained separately and excluded from final medians.

**Final unchanged-source gate: 57/57 suites passed**, with 469 unit tests / 83 files, lint, TypeScript, production build, secret scan and every configured database suite. No source edit or rebuild occurred alongside the gate. 571 source inputs, 210 artifacts and 55 migrations fingerprinted. Gate report SHA-256: `10cf404181d9c9852da49fc8c9af73829f39a20769f3fa9001b8f1050053f64c`. [Acceptance evidence](../../output/r05-reports-20261021/uat-r1/F36-report.json).

The production build retains the existing >500 kB bundle-size advisory. No R06 code splitting or unrelated redesign was introduced.

## Files modified and database changes

- `package.json`
- `scripts/test-eligibility-db.ts`
- `server/eligibility/cohort-reads.ts`
- `server/reports/model.ts`
- `server/reports/routes.ts`
- `server/reports/service.ts`
- `src/ReportsPage.tsx`
- `tests/cohort-reads.test.ts`
- `scripts/test-report-parity.ts`
- `scripts/test-report-pagination-db.mjs`
- `tests/report-pages.test.ts`
- `tests/fixtures/legacy-operational-report.ts`

`docs/performance/R05_OPTIMIZATION_REPORT.md` is this report. No migration, index, runtime-grant, authorization, scholarship-rule or payment-command changes were introduced. Existing R01-R04 files outside the listed R05 deltas were preserved. Measured server artifacts are checked against the final acceptance artifacts; client-only retry/focus/UTF-8 fixes were browser-tested after rebuilding.

## Cleanup and remaining limitations

Owned disposable database/runtime/definer cleanup passed; all three owned targets were removed and the six pre-existing test databases were preserved. [Cleanup evidence](../../output/r05-reports-20261021/cleanup-all.json). Existing archives, protected keys, local QA evidence, workflow PDF, credentials and unrelated working-tree changes remain in place.

- Missing/verification require full-scope authoritative requirement resolution, even when the result is empty. A safe faster projection would need versioned invalidation for every relevant document/policy/history change; no such cache or later-stage work was introduced.
- Legacy whole-report hashes and full aggregate eligibility require whole-scope computation. Use the fast detail page first and request a fresh summary when needed. Source snapshots can differ between requests; the UI says so.
- Financial pages retain full frozen-roster hash validation. High-volume **recorded** payment classifications still have per-payment reads in the existing reader. The 835-row performance fixture has pending outcomes; corrected/paid/unclaimed/reprocessing correctness was exercised on smaller permanent fixtures, not a paid 835-row load test.
- Bulk source windows increase peak working memory for full workloads. No uniform memory-reduction, long-uptime, cold-start or five-heavy-approved-cohort concurrency guarantee is made. The configured concurrent snapshot suites do not substitute for that workload.
- Actual rows examined/engine CPU were not available; returned rows and client-observed DB time are reported honestly. Three warm samples are modest evidence and host timing varied.
- This is a localhost validation, not an office-pilot or production rollout approval. **Stop after R05.**

Final verification: all source/artifact hashes rechecked; measured server bytes unchanged.
