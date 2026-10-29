# R03 Dashboard Optimization — 21 October 2026

**Result: memory stability passed; R03 implemented and validated locally. Stop at R03. LAN/production records and configuration were untouched. No deployment occurred; all test mutations were confined to disposable acceptance fixtures.**

Dashboard median service latency fell from **21612.74 ms to 5288.30 ms (75.5% lower)**. SELECTs fell from **56451 to 620 (98.9% fewer)**. All seven cards' totals, status counts, labels, scope and cycle context match the frozen R02 baseline. Bulk reads increase memory; this is not a memory-reduction claim or an instant-loading claim.

## Scope, baseline and isolation

- Windows host with 15.92 GiB visible physical RAM, about 3.10 GiB free at initial inspection; XAMPP/MariaDB and existing services remained running.
- Node v22.21.0; MariaDB 10.4.32-MariaDB; default measured V8 heap limit 4144 MiB. Same machine, localhost database and restricted runtime grants before/after.
- Existing 835-scholar archived fixture restored into an owned isolated database. Its actual candidate path is managed automatic generation; legacy automaticDraft correctly returns null for this submission-window fixture. No guard was bypassed to manufacture a legacy draft.
- Archive SHA-256: `b47d49cb585d302b76fd5359d0412eba1804950cb5305d516e83680018305e05`. Existing encrypted archive and protected key were reused; no live backup or LAN change was required for this task.
- Before editing R03, verified all **553 R02 source inputs and 205 build artifacts** against the successful R02 acceptance manifest, then copied that compiled baseline outside the web root.
- Three sequential samples per benchmark, fresh authorized repeatable-read transaction per sample. Dashboard samples use explicit GC before each measured sample. SQL/OS buffers were not flushed; these are not cold-start measurements. Final before/after dashboard measurements ran without concurrent test/build processes. Earlier exploratory prototypes are retained separately and excluded from the final table.
- Elapsed time covers DashboardService, authorization, database reads and domain computation. It excludes HTTP/TLS/browser rendering and JSON serialization. Database time is accumulated client-observed SELECT round-trip time, not isolated database-engine CPU time. Memory peaks are sampled every 10 ms plus the final sample and may miss shorter peaks.

## R02 memory-stability gate — passed before R03 edits

One warm-up, then **20 sequential, unmodified 835-scholar candidate generations in one Node process**. No explicit GC between the 20 measured runs; GC only establishes warm and final retained-heap checkpoints. No result bodies were accumulated between runs. The same full JSON digest was asserted on every run.

Criteria recorded in the harness before execution: final post-GC retained-heap growth below 16 MiB; last five runs' median post-run RSS growth versus preceding five below 128 MiB; stable idle connection count, zero queued/checked-out connections; identical 835 eligible results with no OOM/errors. This is a focused sequential diagnostic, not proof of unbounded uptime or concurrent capacity.

- Post-GC retained heap: **26.63 → 27.25 MiB**, growth **0.62 MiB**.
- Natural final heap before diagnostic collection: 240.70 MiB; final post-GC RSS 462.86 MiB. RSS need not return to its initial level because V8/allocators retain committed pages.
- Largest sampled RSS: **870.55 MiB**; largest sampled heap: **380.31 MiB**. Last-five versus prior-five median RSS changed **-48.59 MiB**. Natural allocation/collection cycles did not show continuous growth.
- Median generation 5883.27 ms; 4,712 SELECTs and 3,666,760 response bytes per run; 835 eligible and zero pending every time.
- Runtime pool limit 2; actual count remained **1 total, 1 free, 0 queued**, with the runtime server connection sleeping after each run. After pool closure, the server reported **zero** remaining runtime connections. Admin observation used a separate connection.
- No OOM, rejected command or connection leak occurred. Read-only business inventory matched the restored baseline.

| Run | Time ms | Heap after MiB | Peak heap MiB | RSS after MiB | Peak RSS MiB | Server / free / queued |
|---|---:|---:|---:|---:|---:|---|
| 1 | 5883.27 | 165.45 | 197.26 | 444.00 | 504.88 | 1 / 1 / 0 |
| 2 | 5708.75 | 248.68 | 254.84 | 625.97 | 625.97 | 1 / 1 / 0 |
| 3 | 6097.18 | 132.26 | 376.68 | 505.18 | 849.99 | 1 / 1 / 0 |
| 4 | 5926.11 | 242.28 | 243.15 | 734.11 | 734.11 | 1 / 1 / 0 |
| 5 | 5979.25 | 189.72 | 380.31 | 631.76 | 870.55 | 1 / 1 / 0 |
| 6 | 5682.85 | 160.82 | 204.59 | 624.35 | 659.05 | 1 / 1 / 0 |
| 7 | 5616.85 | 248.77 | 254.89 | 755.93 | 755.93 | 1 / 1 / 0 |
| 8 | 6421.96 | 236.85 | 333.96 | 736.89 | 781.17 | 1 / 1 / 0 |
| 9 | 5828.58 | 126.93 | 357.78 | 633.88 | 825.89 | 1 / 1 / 0 |
| 10 | 5937.45 | 149.73 | 211.92 | 641.54 | 651.71 | 1 / 1 / 0 |
| 11 | 5839.56 | 249.17 | 252.99 | 755.47 | 755.47 | 1 / 1 / 0 |
| 12 | 5645.11 | 198.73 | 377.52 | 674.83 | 862.47 | 1 / 1 / 0 |
| 13 | 5811.42 | 257.37 | 257.37 | 755.59 | 755.59 | 1 / 1 / 0 |
| 14 | 5758.78 | 128.19 | 267.49 | 642.97 | 755.59 | 1 / 1 / 0 |
| 15 | 6029.34 | 235.52 | 237.49 | 732.05 | 732.05 | 1 / 1 / 0 |
| 16 | 5842.14 | 236.82 | 322.38 | 738.60 | 761.21 | 1 / 1 / 0 |
| 17 | 5908.57 | 115.04 | 261.78 | 683.46 | 750.58 | 1 / 1 / 0 |
| 18 | 5967.67 | 150.90 | 206.68 | 672.02 | 683.60 | 1 / 1 / 0 |
| 19 | 5885.07 | 123.92 | 238.69 | 497.86 | 732.52 | 1 / 1 / 0 |
| 20 | 5847.09 | 240.63 | 241.78 | 737.29 | 737.29 | 1 / 1 / 0 |

Full candidate output SHA-256 (all runs): `f40b2032a8c11a327526bedf3e107fc3d47d660d9dee41738e5d5a12fa9c44d9`. Source fingerprint: `938db0c7c4a5521cb5c1b722ff8e1a37039d72543c4baea9831a7cfa371b92dd`.

## Confirmed dashboard bottlenecks

1. Dashboard called seven complete operational-report readers with limit=1. Report pagination only trimmed the returned rows after full calculations and full-row hashing.
2. Scholar identity/placement rows were fetched repeatedly for reports which only supplied counts. Masterlist entry counts and payroll reconciliation details were calculated despite not being displayed on their cards.
3. EligibilityViews were retained for the entire cohort. The old dashboard already reused a Map between three report kinds; it did not calculate eligibility three times, and R03 does not claim otherwise. Its remaining source reads were still predominantly per scholar.
4. The first R03 bulk prototype reduced calls but repeated shared policy/calendar reads due to per-ID cache churn. An additional bounded-page raw-read cache below the existing adapter reduces this repetition without retaining anything across requests.
5. Existing frozen-roster and payment corrections cannot safely be replaced with naive SQL counts of raw payment rows.

## Implementation

- Added a dedicated summary reader. Scholar standing, masterlist-version status and latest payroll-event state use GROUP BY/COUNT aggregate queries with the existing scope limits.
- Scholar status still applies corrected graduation through the existing graduation service, adjusting only the applicable annual record. It does not infer graduation from a different year's record.
- Missing, verification and eligibility cards share **one** pass of the existing eligibilityView/ovrEligibilityIssues services. Raw sources use R02 candidateReads and existing cohortReads in **pages of 200 annual IDs**. No full candidate list, form, complete report-row array or cohort-wide EligibilityView Map is constructed for Home.
- Added optional annual-ID scoping to cohortReads. Existing four-argument Registry/payroll/finalization callers retain the original SQL and behavior; an empty explicit scope does not accidentally load the entire year.
- Reused cachedReads inside each bounded page, beneath the per-ID source adapter. Caches are request/page local and discarded; clocks remain live. No eligibility output or cross-request cache was introduced.
- Shared the exact requirementWorkload status/initial-exception predicate between operational reports and Dashboard. Submitted remains distinct from Verified; overrides, reviewed historical approvals and exceptions still pass through the original services.
- Payroll status comes from latest event state, not creation state. No candidate generation or reconciliation calculation is invoked to count batch states.
- Payment counts use existing effectiveRoster and paymentRecords, including approved roster/payment corrections and pending outcomes. Frozen hashes are still validated; conflicting evidence fails closed. First effective payment per scholar preserves the report's existing lookup behavior.
- Permissions remain filtered per card inside the original authorized readSnapshot, including the post-read revocation check. Snapshot isolation, configuration guard, audits, mutations and finalization locking remain unchanged. Reading counts never provisions or approves records.

### Fingerprint compatibility

Dashboard cards now add **sourceHashBasis: dashboard-summary-v1**. Their sourceHash fingerprints the summary, cycle and relevant current derived evidence, rather than claiming to hash full report rows that were not generated. Therefore dashboard hashes intentionally differ from old full-report hashes. Summary hashes change when relevant live source validity changes, including when counts stay the same. **Operational report hashes and all payroll evidence/source fingerprints retain their original semantics.** No endpoint, request contract or frontend workflow changed.

## Dashboard measurements — full 835 scholars

Median of three samples; SELECT count and payload size were identical across each set.

| Metric | Frozen R02 before | R03 after |
|---|---:|---:|
| Response time (ms) | 21612.74 | 5288.30 |
| SELECTs | 56451.00 | 620.00 |
| SELECT round-trip time (ms) | 17959.32 | 1621.31 |
| Sampled peak heap (MiB) | 57.98 | 97.51 |
| Sampled peak RSS (MiB) | 139.98 | 240.61 |
| Response bytes | 2285.00 | 2572.00 |
| SQL rows returned | 50943.00 | 52527.00 |

The reduced round trips come from bounded bulk source reads; total returned raw rows did **not** decrease. Some existing authoritative readers still retrieve complete stored evidence blobs. Memory increased by about 100.64 MiB in median sampled peak RSS. This is the measured latency/memory tradeoff, not an omitted regression.

### Exact metric equivalence

| Card | Total | Status counts | Compared with baseline |
|---|---:|---|---|
| scholars | 835 | {"active":835} | Match |
| missing | 0 | {} | Match |
| verification | 0 | {} | Match |
| eligibility | 835 | {"eligible":835,"ovr_passed":835} | Match |
| ovr | 1 | {"draft":1} | Match |
| payments | 0 | {} | Match |
| masterlists | 1 | {"published":1} | Match |

All three before and after samples share normalized context/card metric digest `d9b938d1c841bac2a82b743eb4767a037c48eada544562f3f56904cfd0c79f8c`. Normalization excludes generatedAt, sourceHash and the explicitly added sourceHashBasis; it does not remove counts, labels, scope, totals or context. Dynamic database tests additionally compare with full reports after individual workflow changes, including nonzero missing, verification, blocked and payment states.

## R01 and R02 regression benchmarks

Fresh paired runs against the same 835-row restored database, frozen R02 versus R03, three sequential samples per size. Registry requests are bounded to 25/100 IDs. Candidate 25/100 figures use identical annual-result worksets over the 835-row database, not separate databases or new API parameters; 835 is the full unmodified generation. Candidate samples use explicit GC; Registry samples use natural GC as in the prior R02 regression harness.

| Reader | Size | Before ms | After ms | SELECTs before / after | Complete output |
|---|---:|---:|---:|---|---|
| R02 candidate generation | 25 | 399.23 | 398.27 | 244 / 244 | Identical |
| R02 candidate generation | 100 | 955.48 | 943.75 | 614 / 614 | Identical |
| R02 candidate generation | 835 | 6374.01 | 6279.02 | 4712 / 4712 | Identical |
| R01 Registry | 25 | 846.00 | 753.89 | 2059 / 2059 | Identical |
| R01 Registry | 100 | 2875.49 | 2862.41 | 8165 / 8165 | Identical |

Complete JSON, ordering, eligibility/reason fields, amounts, source fingerprints and links were compared, not just lengths. No R01/R02 speed improvement is claimed from small timing differences. Query counts stayed exactly unchanged.

## Files changed relative to validated R02

- `package.json`
- `scripts/test-dashboard-parity.ts`
- `scripts/test-dashboard-scenarios.ts`
- `scripts/test-eligibility-db.ts`
- `server/dashboard/service.ts`
- `server/dashboard/summary.ts`
- `server/eligibility/cohort-reads.ts`
- `server/reports/requirement-workload.ts`
- `server/reports/service.ts`
- `tests/cohort-reads.test.ts`
- `tests/dashboard-summary.test.ts`

No migration, index, schema, RBAC, audit, payment or eligibility-rule change. Eleven R01/R02 implementation files identified in source-freeze.json are byte-for-byte unchanged. The shared cohort preloader has only additive Dashboard scoping, covered by unscoped/scoped/empty-scope tests and full-output regressions.

## Tests and acceptance

- Focused unit tests and first database workflow comparison passed before the gate; final gate reran the final frozen source.
- **454 unit tests in 81 files passed**, including workload status matrix, initial-requirements exceptions, bounded single-pass assessment, aggregate-only cards, latest batch state, corrected/pending payments, corruption failure, scope limits, fresh source validity and scoped/unscoped preload compatibility.
- Extended test:dashboard-db compares seven permitted summaries to full reports at fixture workflow checkpoints, while also running Registry and automatic/managed candidate parity. Existing authorization, no-store, invalid scope, document reopening, finalization and corrected-payment checks remain. Successful Dashboard reads leave audit counts unchanged.
- Complete configured gate: **55/55 suites passed**, sequentially, on unchanged source. Includes lint, all unit tests, all three TypeScript configurations, production build, secret scan, Registry, payroll, academic, masterlist, waivers, overrides, reprocessing, payment/correction, audit, concurrency, imports, migration and backup/recovery suites.
- Build retains the pre-existing frontend chunk-size warning; build succeeds. No bundle splitting or unrelated frontend change was included.
- Gate UTC: 2026-10-21T03:30:14.086Z to 2026-10-21T03:56:41.103Z. Gate status automated_passed_awaiting_signoff; productionAuthorized=false.
- Final fingerprint verification: **558 source files, 207 artifacts, 55 unchanged migrations**. Gate report SHA-256: `c1deb163816faa796fb0f03d875853c0627a0d3802e8c9c09462e6590399b40f`.

| Configured suite | Result | Seconds |
|---|---|---:|
| check | Passed | 48.89 |
| test:db | Passed | 0.40 |
| test:receiving-db | Passed | 7.93 |
| test:auth-db | Passed | 13.85 |
| test:rbac-db | Passed | 7.80 |
| test:configuration-db | Passed | 8.31 |
| test:academic-db | Passed | 7.42 |
| test:status-db | Passed | 7.76 |
| test:qualification-db | Passed | 7.79 |
| test:scholars-db | Passed | 14.03 |
| test:academic-changes-db | Passed | 8.43 |
| test:masterlists-db | Passed | 8.34 |
| test:masterlist-workflow-db | Passed | 9.84 |
| test:masterlist-amendments-db | Passed | 8.99 |
| test:requirements-db | Passed | 7.42 |
| test:requirement-instances-db | Passed | 7.54 |
| test:requirement-receipts-db | Passed | 7.62 |
| test:ovr-amendments-db | Passed | 13.41 |
| test:profile-db | Passed | 17.98 |
| test:payments-db | Passed | 18.64 |
| test:ovr-processing-db | Passed | 14.76 |
| test:ovr-finalization-db | Passed | 17.67 |
| test:ovr-db | Passed | 13.61 |
| test:overrides-db | Passed | 8.92 |
| test:eligibility-db | Passed | 8.11 |
| test:payout-cycles-db | Passed | 8.29 |
| test:requirement-waivers-db | Passed | 7.64 |
| test:requirement-workflow-db | Passed | 9.73 |
| test:course-pending-db | Passed | 18.17 |
| test:registry-db | Passed | 25.09 |
| test:candidates-db | Passed | 28.66 |
| test:imports-db | Passed | 397.63 |
| test:concurrency-db | Passed | 462.46 |
| test:audit-db | Passed | 8.34 |
| test:dashboard-db | Passed | 54.85 |
| test:reports-db | Passed | 18.37 |
| test:exports-db | Passed | 7.36 |
| test:backup-db | Passed | 13.28 |
| test:notifications-db | Passed | 17.53 |
| test:workflow-foundation-db | Passed | 7.32 |
| test:continuing-rosters-db | Passed | 20.33 |
| test:semester-checklist-db | Passed | 7.30 |
| test:submission-windows-migration-db | Passed | 7.21 |
| test:requirement-timing-migration-db | Passed | 7.16 |
| test:document-evidence-migration-db | Passed | 6.59 |
| test:automatic-payroll-db | Passed | 13.00 |
| test:reprocessing-db | Passed | 18.64 |
| test:shared-documents-db | Passed | 21.68 |
| test:main-payroll-db | Passed | 18.06 |
| test:managed-release-migration-db | Passed | 7.06 |
| test:payroll-workflow-migration-db | Passed | 7.04 |
| test:drive-backup-db | Passed | 11.46 |
| test:treasury-db | Passed | 15.16 |
| test:legacy-containment-db | Passed | 13.47 |
| test:snapshot-db | Passed | 26.68 |

## Reproduction and evidence

Commands executed from the repository root (no secrets on command lines):

```powershell
node output/r03-dashboard-20261021/fixture.mjs restore
node --expose-gc output/r03-dashboard-20261021/memory.mjs
node --expose-gc output/r03-dashboard-20261021/dashboard.mjs before
npm run typecheck
npx vitest run tests/dashboard-summary.test.ts tests/cohort-reads.test.ts tests/dashboard.test.ts tests/reports.test.ts
npm run lint
npm run build
npm run test:dashboard-db
node --expose-gc output/r03-dashboard-20261021/dashboard.mjs after
node --expose-gc output/r03-dashboard-20261021/fixture.mjs before --reuse --controlled
node --expose-gc output/r03-dashboard-20261021/fixture.mjs after --controlled --keep
node --expose-gc output/r03-dashboard-20261021/fixture.mjs before --reuse --registry
node --expose-gc output/r03-dashboard-20261021/fixture.mjs after --registry --keep
node output/r03-dashboard-20261021/fixture.mjs cleanup
node output/r03-dashboard-20261021/freeze.mjs
$env:LDSS_UAT_OUTPUT = 'output/r03-dashboard-20261021/uat-r1'
npm run test:uat
```

The evidence harnesses are local and parameter-free for this owned fixture. The memory and baseline benchmarks were executed before R03 edits; rerunning them later requires selecting the preserved frozen R02 build for a true R02 comparison. A repeat restore creates a fresh isolated database; credentials/raw bodies stay in an ACL-protected folder outside the web root, never the report or repository. Memory/harness logs contain measurements only. Current historical hashes are fixture-specific, not general constants.

Evidence: [memory summary](../../output/r03-dashboard-20261021/memory-summary.json), [per-run memory](../../output/r03-dashboard-20261021/memory-runs.json), [closed pool](../../output/r03-dashboard-20261021/memory-pool-closed.json), [dashboard comparison](../../output/r03-dashboard-20261021/dashboard-comparison.json), [before and top SQL](../../output/r03-dashboard-20261021/dashboard-before.json), [after and top SQL](../../output/r03-dashboard-20261021/dashboard-after.json), [R01/R02 comparison](../../output/r03-dashboard-20261021/regression-comparison.json), [source freeze](../../output/r03-dashboard-20261021/source-freeze.json), [gate](../../output/r03-dashboard-20261021/uat-r1/F36-report.json), [fixture cleanup](../../output/r03-dashboard-20261021/cleanup.json).

## Remaining limits and next approval boundary

- The measured 5.29-second full dashboard is faster, not immediate. Fresh eligibility/override/coverage/prior-approval validation and source cloning/hashing still take CPU; replacing these with raw status counts would change business meaning. No separate eligibility engine was introduced.
- Frozen masterlist/payroll evidence still requires decoding/validating complete stored snapshots through existing readers. Graduation counts still reuse the full corrected graduation service, including any necessary payment evidence. This protects correctness but can cost more on graduation/payment-heavy datasets.
- Existing global policy/calendar and school-policy reads remain; SQL details are retained for future review. No new index was justified solely by this fixture, and none was added.
- Other Home requests (metadata, pending notices, working-year official lists) and browser paint/network/PC2 latency were not timed or optimized. No LAN end-to-end loading claim or browser screenshot is presented for this backend-only change.
- The restored 835 fixture has prior-approved documents and no frozen payment entries. Nonzero payments, corrections and graduation are covered by disposable workflow tests, not a 835-paid-cohort benchmark.
- Twenty sequential runs do not establish concurrent multi-user memory capacity or a day-long soak. The approximately 871 MiB R02 peak and increased Dashboard peak require headroom alongside MariaDB/XAMPP and desktop applications on 16 GB hardware. No Node heap-limit increase or production tuning was applied.
- The isolated restored database and both owned accounts were dropped; runtime connections closed and business inventory was unchanged. Private raw evidence and the original encrypted archive are retained. Existing unrelated disposable databases and working-tree changes were preserved.
- **R03 ends here. No R04 work, GitHub push, LAN deployment, configuration approval, payment or real-batch action was performed. Await user approval for subsequent work.**
