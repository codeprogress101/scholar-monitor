# R06 — Notifications Performance Optimization

Date: 21 October 2026 (Asia/Manila). Scope: R06 only; local validation. No LAN/production deployment, scholarship-rule changes, schema changes, or R07 work.

## Result

Notification reads now load only their requested projection. Exact output comparisons passed across role audiences, complete history traversal, pending work, personal read state and workflow changes. The frozen R05 implementation remains the comparison baseline. Final acceptance status is recorded below.

## Confirmed bottlenecks

- `App.tsx` used the complete notification-center response to display one unread number on every page. Home selected pending mode, while `DashboardPage.tsx` independently loaded the same complete pending response to display three records.
- Each legacy center read separately rebuilt the full source union for unread count, pending groups, filtered total, 25 detailed records and available periods. Pending workflow decisions, labels, ownership and other source expressions could be evaluated before the selected page was known.
- Type/period filters and event identity were applied outside the source union. Detail fields were materialized for unrelated records. Marking one event also joined the complete detailed union.
- The original already used SQL LIMIT/OFFSET and had no application-level per-scholar N+1 loop here. The confirmed problem was repeated broad source projections and unneeded calculations, not a missing eligibility cache.

## Implementation and files

| File | Change |
|---|---|
| `server/notifications/queries.ts` (new) | Builds purpose-specific SQL from the original source definitions; pushes audience/type/source/year/semester predicates into readable branches. |
| `server/notifications/sources.ts` | Exports the existing definitions for reuse. Their generated legacy SQL is byte-for-byte equal to the frozen oracle. |
| `server/notifications/service.ts` | Adds count, page, pending-group and period projections. Pages select bounded chronological keys before hydrating only those records. Mark authorization uses a minimal projection of the same visibility rules. Legacy complete DTO remains supported. |
| `server/notifications/routes.ts` | Four additive authenticated read routes; no-store/Vary Cookie preserved. Existing list and personal read-state POST remain. |
| `src/App.tsx` | Stable independent badge hook; page fetch enabled only inside the notification center. |
| `src/Notifications.tsx` | Independent resources, 25/50/100 pagination, unread filter, scoped read-state refresh, bounded waits, retry/error states and keyboard focus restoration. |
| `src/DashboardPage.tsx` | Requests only three pending records and their authoritative total; does not request unread/groups/period catalogs. R03 dashboard service and totals unchanged. |
| `scripts/test-notification-parity.ts` (new), `scripts/test-notifications-db.ts` | Frozen-oracle comparisons; filters, pages, concurrency, fresh source reads and permissions. |
| `scripts/test-eligibility-db.ts` | Adds notification parity checkpoints to the existing report lifecycle fixture paths, covering payroll, overrides, corrections and reprocessing. Business commands unchanged. |
| `tests/notification-queries.test.ts` (new) | Nine focused projection/validation/source-rule/deep-link regressions. |
| `tests/fixtures/legacy-notifications.ts`, `tests/fixtures/legacy-notification-sources.ts` (new) | Independent pre-R06 oracle, unavailable to application imports. |

No dependencies, database tables, indexes, migrations, grants, row locks, audit capture triggers or business commands were changed. EXPLAIN uses existing `ix_notice_source` and personal-read primary keys; query shape was the demonstrated bottleneck. Small lookup scans and the sorts/aggregations necessary for accurate totals remain. [Query plans](../../output/r06-notifications-20261021/query-plans.json).

## API and consistency

| Route | Response/work |
|---|---|
| `GET /api/v1/notifications/count` | Global authoritative personal unread count only. |
| `GET /api/v1/notifications/page` | Filtered `items,total,offset,limit`; default 25, validated 1–100. Existing update-descending/pending-oldest ordering and tie-breaker preserved; additive `unread=true` for updates. |
| `GET /api/v1/notifications/pending` | Global pending total and type groups under original live source/owner permissions. |
| `GET /api/v1/notifications/periods?mode=...` | Exactly the visible period catalog for that mode, independently of current list filters, as before. |
| Existing `GET /api/v1/notifications` | Original complete response fields and default behavior, in one snapshot. Additive limit/unread filters; old clients remain compatible. |
| Existing `POST /api/v1/notifications/:id/read` | Same request, ownership/visibility, transaction guard and idempotent personal-state semantics. No audit-event rewrite. |

Each read uses the existing repeatable-read authorized snapshot and post-read role/disablement recheck. Count, page keys and detail hydration within a page share that snapshot. The new resources are separate snapshots: a concurrently changed record can briefly make independently displayed counters and page content differ until their next refresh; the original combined route still provides a single-snapshot DTO. No cross-request result cache or manually maintained count was introduced.

## Method and fixture

The 835-scholar encrypted archive was verified against SHA256 `b47d49cb585d302b76fd5359d0412eba1804950cb5305d516e83680018305e05` and restored to one isolated database. Restricted runtime grants and three synthetic individual role accounts were used. Thirty-five owned synthetic standing requests supplied additional pending work without changing annual standing. Native role audiences contained 1 Staff update, 875 Coordinator updates/36 pending sources and 16 Administrator technical updates. The small native Staff audience is not a large-history Staff capacity claim; the expanded-history test below addresses that separately.

All 571 source files and 210 artifacts from the passing R05 gate were rehashed before editing, and the compiled baseline was frozen outside the web root. Three sequential samples per measurement cell use the same restored data, runtime grants, 835 scholars and localhost HTTP listener. Requests include authentication, authorization/revocation checks, serialization and response transfer. SQL counts include those controls. Memory is sampled with explicit GC before list samples; database/OS buffers are not flushed. DB milliseconds below are client-observed SELECT round-trip time, not engine CPU/execution instrumentation. Payload sizes are UTF-8 response-body bytes, excluding HTTP headers.

## Native 835-scholar HTTP measurements

Medians; milliseconds. Badge/pending-count baselines are the legacy full-center response because no lightweight endpoints existed. The new first-page response intentionally omits unrequested global catalogs/counters.

| Role | Operation | HTTP before → after | SELECT before → after | DB round-trip before → after | Bytes before → after |
|---|---|---:|---:|---:|---:|
| staff | Header unread count | 271.42 → 25.28 | 14 → 10 | 266.68 → 20.03 | 586 → 12 |
| staff | Latest 25 | 219.95 → 44.91 | 14 → 12 | 214.99 → 39.59 | 586 → 458 |
| staff | Pending first 25 | 154.88 → 76.48 | 14 → 11 | 149.46 → 71.67 | 105 → 44 |
| staff | Pending total/groups | 151.88 → 29.17 | 14 → 10 | 147.67 → 25.23 | 105 → 25 |
| staff | Type=document | 193.46 → 23.78 | 14 → 11 | 189.41 → 19.77 | 172 → 44 |
| staff | Academic-year filter | 237.67 → 44.84 | 14 → 12 | 233.01 → 40.15 | 586 → 458 |
| staff | Offset 25 | 249.28 → 34.62 | 14 → 11 | 244.61 → 30.55 | 173 → 45 |
| staff | Mark read | 69.62 → 9.18 | 8 → 8 | 64.71 → 5.17 | 14 → 14 |
| staff | Mark unread | 66.56 → 7.96 | 8 → 8 | 60.91 → 4.35 | 14 → 14 |
| coordinator | Header unread count | 254.97 → 25.50 | 14 → 10 | 249.87 → 21.99 | 12838 → 14 |
| coordinator | Latest 25 | 238.42 → 47.50 | 14 → 12 | 233.41 → 41.95 | 12838 → 12645 |
| coordinator | Pending first 25 | 161.96 → 78.92 | 14 → 12 | 157.73 → 73.85 | 12838 → 12645 |
| coordinator | Pending total/groups | 175.33 → 29.86 | 14 → 10 | 170.26 → 25.71 | 12838 → 88 |
| coordinator | Type=document | 223.81 → 23.87 | 14 → 11 | 218.48 → 19.53 | 237 → 44 |
| coordinator | Academic-year filter | 249.93 → 48.27 | 14 → 12 | 244.49 → 42.63 | 12838 → 12645 |
| coordinator | Offset 25 | 243.41 → 47.28 | 14 → 12 | 238.49 → 42.26 | 12441 → 12248 |
| coordinator | Mark read | 61.95 → 10.17 | 8 → 8 | 57.59 → 5.82 | 14 → 14 |
| coordinator | Mark unread | 63.47 → 9.91 | 8 → 8 | 58.71 → 5.54 | 14 → 14 |
| system_admin | Header unread count | 30.44 → 6.78 | 14 → 10 | 26.13 → 3.51 | 6172 → 13 |
| system_admin | Latest 25 | 29.06 → 9.67 | 14 → 12 | 24.60 → 5.78 | 6172 → 6110 |
| system_admin | Pending first 25 | 25.85 → 6.21 | 14 → 9 | 21.56 → 2.59 | 106 → 44 |
| system_admin | Pending total/groups | 24.97 → 6.46 | 14 → 9 | 20.68 → 2.90 | 106 → 25 |
| system_admin | Type=document | 31.08 → 8.25 | 14 → 11 | 27.02 → 4.19 | 106 → 44 |
| system_admin | Academic-year filter | 28.95 → 7.31 | 14 → 11 | 24.27 → 3.70 | 106 → 44 |
| system_admin | Offset 25 | 30.05 → 8.80 | 14 → 11 | 25.48 → 4.46 | 108 → 46 |
| system_admin | Mark read | 12.12 → 5.40 | 8 → 8 | 7.70 → 2.22 | 14 → 14 |
| system_admin | Mark unread | 10.40 → 5.65 | 8 → 8 | 6.18 → 2.23 | 14 → 14 |

[Raw HTTP samples](../../output/r06-notifications-20261021/before-http.json), [optimized samples](../../output/r06-notifications-20261021/after-http.json), [summary](../../output/r06-notifications-20261021/performance-summary.json). The type=document cell is an empty-result benchmark on this archive, not a large document-notice claim. Workflow database tests additionally exercise document visibility/calculations through the unchanged source definitions.

A complete center now starts three distinct reads (page, pending groups and periods), plus the independently polled badge. This can total more SELECT statements than the legacy combined response because each endpoint independently authorizes and rechecks revocation. For Coordinator, page/pending/period resources require 12+10+10 SELECTs; badge is another 10. **Per-request reductions do not mean fewer total SELECT statements for a fully opened center.** The gain is less source computation, bounded hydration, independent loading and no full-center work for a header or Home preview. No duplicate identical requests appeared in the observed initial center load.

## Additional filtering/pagination and Home preview

The legacy API offered only 25 rows and no unread-only filter. Before values for 50/100 concatenate two/four real legacy requests; unread gathers the full legacy list then filters it. These are equivalent user workloads, not a claim that an old unread endpoint existed. Home previously sliced its full pending response to three.

| Role | Workload | HTTP before → after (ms) | SELECT before → after | Bytes before → after |
|---|---|---:|---:|---:|
| staff | unread | 265.20 → 86.89 | 14 → 12 | 586 → 458 |
| staff | periods | 215.30 → 19.19 | 14 → 10 | 586 → 94 |
| staff | semester | 212.42 → 36.60 | 14 → 12 | 586 → 458 |
| staff | limit50 | 216.66 → 31.71 | 14 → 12 | 586 → 458 |
| staff | limit100 | 216.21 → 31.14 | 14 → 12 | 586 → 459 |
| staff | home-pending3 | 152.05 → 53.45 | 14 → 11 | 105 → 43 |
| coordinator | unread | 7963.84 → 80.08 | 490 → 12 | 453947 → 12645 |
| coordinator | periods | 223.68 → 18.86 | 14 → 10 | 12838 → 94 |
| coordinator | semester | 234.54 → 38.45 | 14 → 12 | 12838 → 12645 |
| coordinator | limit50 | 440.34 → 57.53 | 28 → 12 | 25279 → 24847 |
| coordinator | limit100 | 919.61 → 44.20 | 56 → 12 | 51257 → 50348 |
| coordinator | home-pending3 | 173.29 → 69.09 | 14 → 12 | 12838 → 1468 |
| system_admin | unread | 38.39 → 9.37 | 14 → 12 | 6172 → 6110 |
| system_admin | periods | 26.61 → 7.19 | 14 → 10 | 6172 → 27 |
| system_admin | semester | 27.12 → 8.90 | 14 → 12 | 6172 → 6110 |
| system_admin | limit50 | 26.86 → 9.54 | 14 → 12 | 6172 → 6110 |
| system_admin | limit100 | 26.91 → 9.24 | 14 → 12 | 6172 → 6111 |
| system_admin | home-pending3 | 23.61 → 8.73 | 14 → 9 | 106 → 43 |

This archive has no visible semester catalog for these synthetic notification audiences. The semester cell therefore measures its unfiltered fallback; it does **not** establish a nonempty semester-filter performance result. Valid semester filtering is checked by generated SQL predicates and parity where a fixture has visible semester sources. [Extended measurements](../../output/r06-notifications-20261021/extended-after.json).

## History growth and complete equivalence

An isolated stress extension added 5,000 synthetic captured audit events to the same 35 synthetic requests (request/reject event density, not 5,000 actual business decisions). Total stored notification events grew from 2,565 to 7,565. Existing source outcomes were unchanged. This increased visible Staff updates to 2,501 and Coordinator updates to 3,375; pending stayed 0/36. Administrator still had 16 technical notices and no pending operational work.

| Role | Operation | Before → after median ms |
|---|---|---:|
| staff | badge | 264.94 → 32.67 |
| staff | latest25 | 259.62 → 59.70 |
| staff | pending | 165.36 → 54.64 |
| coordinator | badge | 265.93 → 27.33 |
| coordinator | latest25 | 267.22 → 59.57 |
| coordinator | pending | 162.40 → 70.15 |
| system_admin | badge | 25.84 → 7.52 |
| system_admin | latest25 | 25.82 → 9.68 |
| system_admin | pending | 25.14 → 6.15 |

Complete legacy-25 versus optimized-100 traversals matched every visible update and pending item for all three roles, in order, including source IDs, event IDs, timestamps, revisions, current outcomes, titles, read flags and deep links. Complete unread traversals, global pending groups and catalogs matched too. Native HTTP cases and all complete legacy DTOs checked in the permanent scenarios matched; no approximate counters or event rewrites were used. [Traversal hashes and totals](../../output/r06-notifications-20261021/full-output-equivalence.json), [growth fixture](../../output/r06-notifications-20261021/history-growth.json), [growth samples](../../output/r06-notifications-20261021/growth/after-http.json).

## Memory and connections

Coordinator native median sampled peak heap: badge 38.84 → 38.78 MiB, first-page 38.85 → 39.76 MiB. Median sampled peak RSS: badge 123.10 → 121.96 MiB, first-page 123.16 → 122.05 MiB. These differences are small and do not establish a uniform memory reduction.

Twenty consecutive Coordinator sequences each loaded count, first 25 and pending groups over real HTTP. Retained heap after explicit GC stayed 38.35–38.45 MiB; last-five versus runs 6–10 median growth was 58,816 bytes. Highest sampled RSS was 122.50 MiB. All acquired pool connections were free after every sequence, queue length zero, with no OOM or connection leak observed. This short sequential test does not establish multi-day stability or office concurrency capacity. Windows/16 GB also includes MariaDB/XAMPP and other applications whose RSS is not included. Sampling can miss brief peaks. [Per-run memory](../../output/r06-notifications-20261021/memory-stability.json).

## Regression verification

- Nine new unit tests passed. Lint, TypeScript validation and production build passed before source freeze; the configured gate reruns them.
- Fourteen notification database scenarios passed, including original durable/personal read state, pre-feature pending discovery, requester/reviewer visibility, revoked/disabled accounts, administrator restriction, audit rollback, exact workflow retry identity, concurrent decisions and returned/resubmitted masterlists.
- New checks compare complete old/new DTOs, groups, periods, types, source filters, page sizes 25/50/100, first/middle/last/empty pages, unread lists and deep links. Type comparisons retain the database collation, including uppercase, accents and trailing spaces, rather than using JavaScript equality. Nonempty semester filters are compared during the existing financial lifecycle checkpoints. Forged role/recipient filters are rejected on list/page routes; split global counts ignore client audience claims and remain server-authorized. Administrator cannot retrieve restricted operational items.
- Concurrent read/read leaves one row and the original read timestamp. Concurrent read/unread uses the unchanged shared transaction guard. Personal read state does not change pending workload or another account’s state.
- A deterministic intervening source decision is committed between page count and key selection: the in-flight page retains its original consistent pending result, while the next request sees resolution immediately.
- The three existing report lifecycle fixtures now also compare notification outputs throughout main payroll/treasury, overrides and reprocessing. Their targeted run passed. The full gate reruns those checks with all financial, masterlist, eligibility, audit, permission and concurrency suites.

Browser checks used the Playwright skill on final built local source: Home count+three-item preview only; one request each for center page/pending/periods; pagination 25/50/100; keyboard Enter and restored pager focus; unread/type/empty/pending states; read/unread badge changes without pending/catalog reload; 503 with explicit retry; lost committed-read response followed by same-action retry; source/version/year deep link, browser Back and reload; Staff/Administrator visibility. Desktop and 820px tablet screenshots were visually inspected. Native 200% zoom and a second physical office PC were not tested. The existing narrow header is tight at 820px; notification filters/content wrap without page overflow. No unrelated layout redesign was made.

Screenshots: [Coordinator updates](../../output/r06-notifications-20261021/coordinator-updates-desktop.png), [pending](../../output/r06-notifications-20261021/coordinator-pending-desktop.png), [tablet](../../output/r06-notifications-20261021/coordinator-tablet.png), [Staff empty pending](../../output/r06-notifications-20261021/staff-empty-pending.png), [Administrator restricted filter](../../output/r06-notifications-20261021/administrator-restricted.png). [Browser flow log](../../output/r06-notifications-20261021/browser-flows.log), [recovery/navigation log](../../output/r06-notifications-20261021/browser-errors.log), [role log](../../output/r06-notifications-20261021/browser-roles-r2.log).

## R01–R05 benchmarks

All outputs/source fingerprints and SELECT counts matched the frozen R05 implementation exactly. Medians below are authorized service benchmarks, not HTTP, except notification measurements above. Small R01/R02 cohorts are 25/100 selected annual rows over the same physical 835-scholar database. These timings are regression observations, not new R01–R05 optimization claims. Database scheduling and CPU variation affect sequential samples.

| Stage/workset | Before → after ms | SELECTs (unchanged) |
|---|---:|---:|
| R01 Registry, 25 | 1044.47 → 935.54 | 2059 |
| R01 Registry, 100 | 4000.07 → 3543.04 | 8165 |
| R02 candidates, 25 | 459.89 → 447.43 | 244 |
| R02 candidates, 100 | 1323.05 → 1321.44 | 614 |
| R02 candidates, 835 | 8113.05 → 7845.59 | 4712 |
| R03 Dashboard, 835 | 7085.91 → 5600.58 | 620 |
| R04 initial summary | 9.36 → 12.59 | 14 |
| R05 scholars page 25 | 15.02 → 15.28 | 13 |
| R05 scholars page 50 | 16.38 → 15.27 | 13 |
| R05 scholars page 100 | 14.93 → 14.31 | 13 |
| R05 eligibility page 25 | 392.96 → 330.88 | 114 |
| R05 eligibility page 50 | 726.70 → 568.48 | 116 |
| R05 eligibility page 100 | 1045.80 → 859.08 | 119 |

R04 moved by about 3 ms with identical work and output; three samples do not establish a meaningful regression or improvement. R03 still takes multiple seconds: expensive authoritative dashboard/report source work remains outside R06. Existing R05 full requirement-report and deep-offset workloads remain unchanged. [Final read-only regression log](../../output/r06-notifications-20261021/regression-final-after.log), [source preservation](../../output/r06-notifications-20261021/source-preservation.json).

## Commands and acceptance gate

Executed from `C:\xampp\htdocs\scholar_monitor`. Private configuration files contain credentials and are not copied into the report or repository. All output scripts/measurement bodies and screenshots are local QA evidence.

```powershell
node output/r06-notifications-20261021/fixture.mjs restore
node --expose-gc output/r06-notifications-20261021/notifications.mjs setup
node --expose-gc output/r06-notifications-20261021/notifications.mjs before
npx vitest run tests/notification-queries.test.ts
npm run test:notifications-db
npm run typecheck
npm run lint
npm run build
node --expose-gc output/r06-notifications-20261021/notifications.mjs after
node --expose-gc output/r06-notifications-20261021/extended.mjs before
node --expose-gc output/r06-notifications-20261021/extended.mjs after
npm run test:report-pagination-db
node output/r06-notifications-20261021/growth-seed.mjs
node --expose-gc output/r06-notifications-20261021/growth.mjs before
node --expose-gc output/r06-notifications-20261021/growth.mjs after
node output/r06-notifications-20261021/full-parity.mjs
node output/r06-notifications-20261021/cleanup.mjs
$env:LDSS_UAT_OUTPUT = 'output/qa-r06-notifications-20261021/uat-r2'
npm run test:uat
```

Regression harnesses additionally ran `fixture.mjs before --reuse --controlled` / `after --keep --controlled`, then the same with `--registry`; `dashboard.mjs before/after`, `r04-summary.mjs before/after`, and `report-page.mjs before/after`. Browser CLI commands and executed scripts are retained in the linked browser logs. Final service-only comparisons were rerun after all logins/browser actions stopped so inventory comparison excludes expected authentication writes; the final runs preserved the full inventory.

Final gate **passed: 57/57 suites**, including **478 unit tests in 84 files**, lint, all TypeScript checks, production build, secret scan and every configured database suite. The accepted run started `2026-10-21T09:53:30.133Z` and finished `2026-10-21T10:25:45.515Z` (1935.4 seconds). Source fingerprints (576 inputs), 211 build artifacts and all 55 migration hashes were checked again after the final HTTP measurement pass and cleanup. Measured build artifacts match the accepted build exactly.

[Accepted gate](../../output/qa-r06-notifications-20261021/uat-r2/F36-report.json), [final verification](../../output/r06-notifications-20261021/final-verification.json). Gate SHA256: `adf3abdf94d4b659490228902adff5021baf6e5846b8500fa662d02cc58bfb47`.

The first R06 gate was deliberately interrupted during payroll-detail validation after discovering database type-filter collation compatibility needed an additional regression. It is not accepted evidence. Its owned interrupted worker fixture was removed; uppercase/accent/trailing-space filters and financial semester filters passed in the final run. [Interruption/cleanup record](../../output/r06-notifications-20261021/interrupted-run.json). The final timing pass ran after acceptance on unchanged source/build, sequentially on a fresh disposable restore; its timer stops before local evidence-file writes or oracle-file reads. Client and server share the measured Node process, so its heap/RSS includes the benchmark client/harness as well as the application.

## Remaining limits and disposition

- Header under 200 ms and first 25 under 500 ms were achieved in the measured localhost role/history samples. This is not a LAN latency or office concurrency SLA; no LAN deployment was performed.
- Accurate unread/pending totals still depend on visible history and current source state. Necessary JSON roster reconciliation and latest-event lookups for pending payroll remain. Deep offsets still perform offset sorting; 100,000-history-offset and multi-day growth were not benchmarked.
- Separate resource authorization increases total center request/SELECT count, as quantified above. Metadata is polled while the center is visible; read-state changes refresh only page and badge. Existing polling/backoff, hidden-tab pause, abort and permission-revocation behavior remain.
- No global database profiling was enabled; row-examined/engine CPU measurements are unavailable. EXPLAIN estimates are not actual execution counts.
- The deployment’s MariaDB configuration, old hardware, simultaneous users and backup workload can affect timing. The 20-run memory test is sequential.
- The existing production bundle-size advisory remains; no unrelated bundle splitting or R07 work was attempted.

Cleanup: the owned restored database and its runtime/definer users were removed after all tests; six pre-existing test databases were retained. Owned listeners 3137–3139 were stopped. The original encrypted archive, recovery key, LAN records, dependencies, private evidence and unrelated working-tree files were preserved. [Cleanup record](../../output/r06-notifications-20261021/cleanup.json).

R06 is ready for review subject to the recorded final automated gate result. Await user approval before deployment or another optimization stage.
