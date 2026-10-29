# B1 AP1 — Primary UAT promotion

25 October 2026, Philippine time. **Completed and verified at [localhost:5173](http://127.0.0.1:5173/#scholars). Stopped after B1 promotion.** The primary runs the accepted B1 UI and API together. No migration, grant, permission, feature flag or business-data change was made. The freshly inventoried two Paid records and their actual dates remain exact.

This operation follows the explicit B1 primary-promotion authorization and the [accepted isolated implementation](B1_REGISTRY_WORKING_YEAR_IMPLEMENTATION_REPORT.md). It promotes that package unchanged; it does not implement B2 or another enhancement.

## Target, source and maintenance

| Item | Freshly verified result |
|---|---|
| Database server | **DESKTOP-BPLJKRP**, MariaDB on **127.0.0.1:3306** |
| Primary database / runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Selected profile / listeners | **synthetic**, frontend **127.0.0.1:5173**, API **127.0.0.1:3001** |
| Schema | **65 migrations**, all SQL checksums and applied timestamps unchanged |
| Before controller / API / Vite | **43348 / 29804 / 36944**, verified commands, ancestry and loopback ownership |
| After controller / API / Vite | **29536 / 30132 / 48428**, verified commands, ancestry and loopback ownership |

All **1,258 files** protected by the B1 candidate checkpoint still matched, as did all nine candidate source hashes and all three review-archive/patch hashes. `git apply --check` passed against the actual dirty main workspace. The intervening B1 completion report was retained; no unrelated edit was overwritten. A fresh checkpoint protected **1,259 existing files** before this promotion. [Preflight](../../output/b1-primary-20261025/preflight.json), [starting file inventory](../../output/b1-primary-20261025/files-before.json).

Only the verified primary controller tree was stopped. While both primary ports were quiet, a fresh encrypted backup of all **148 tables** passed a new isolated restore, including table values, definitions, indexes, foreign keys/checks, triggers, executable views and rejection probes. The temporary restore schema/account was removed. The archive is **13,681,913 bytes**; the existing **64 MiB SQL / 96 MiB archive / 100,000 rows per table** limits remain unchanged. Credentials, archive and key remain restricted; their contents are not in this report. [Recovery checkpoint](../../output/b1-primary-20261025/recovery.json).

B1 source was applied only after recovery passed. The complete normal build passed before activation. The new compatible build was archived, and the starting shared static client was restored byte-for-byte for older retained servers. Primary 5173 uses current Vite source with the matching API. Listeners at **3011/3012/3013/3015/3016/3018** retain their original owning PIDs; none was restarted. [Build preservation](../../output/b1-primary-20261025/build-preservation.json), [final process/package checks](../../output/b1-primary-20261025/delivery.json).

## Exact files promoted

The nine files below match the accepted candidate hashes exactly. No promotion-specific application change was added.

| File | Accepted B1 purpose |
|---|---|
| [server/scholars/service.ts](../../server/scholars/service.ts) | Shared annual-association COUNT/page predicate and selected-year placement filters |
| [server/scholars/validation.ts](../../server/scholars/validation.ts) | Strict `registryYearId` and compatible filter/context validation |
| [server/scholars/registry-placement.ts](../../server/scholars/registry-placement.ts) | Existing placement-ID expressions for filters |
| [server/scholars/registry-year.ts](../../server/scholars/registry-year.ts) — new | Annual evidence predicate without first-entry fallback |
| [src/ScholarsPage.tsx](../../src/ScholarsPage.tsx) | Working/historical modes, compact filters, scoped navigation and keyboard scrolling |
| [src/registry-view.ts](../../src/registry-view.ts) — new | Saved preferences and conservative working-year resolution |
| [src/styles.css](../../src/styles.css) | Accepted scoped filter/reflow/focus styles |
| [tests/registry-working-year.test.ts](../../tests/registry-working-year.test.ts) — new | Preference, metadata, year-change and strict query contracts |
| [scripts/test-registry-working-year-db.ts](../../scripts/test-registry-working-year-db.ts) — new | Owned-copy acceptance driver; primary targets remain rejected |

Five existing source files changed; four source/test/helper files are additions. Normal compilation changed three existing server outputs and added the compiled annual-predicate module. **1,251 of 1,259 existing files remain exact**, with no missing file. Task-local verification tools/evidence and this report are additional deliverables. No migration, dependency, workbook parser, financial writer, launch configuration or earlier report changed. [Promoted package](../../output/b1-primary-20261025/promoted-files.json), [file comparison](../../output/b1-primary-20261025/preservation.json).

## Registry behavior on primary

Before B1, a fresh Registry could open without an annual selector. It now resolves the configured working year before its initial list request and displays **Current academic year**, name/permanent-ID search, **Scholar status**, **More filters** and **All Years / Historical**. Explicit saved historical choices remain supported.

Membership requires an existing selected-year **intake root, academic record, annual scholarship record, or scholar-semester record belonging to that year**. Indexed EXISTS predicates avoid duplicate people. An approved import is represented through its recorded annual owners, including A2.1 bindings to manual roots. First-entry year, ID year, classification, staged workbooks or global participation alone do not establish membership. Association remains discovery evidence, not approval or payment readiness. The legacy `associatedYearId` contract remains unchanged.

| Actual primary read | Staff | Coordinator |
|---|---:|---:|
| Working year **TWO-BATCH-YEAR** | **1,000** | **1,000** |
| Explicit All Years | **1,000** | **1,000** |
| Earlier **TWO-PRIOR-YEAR** | **0** | **0** |

Both roles' complete paged results matched the annual SQL membership set exactly, with no repeated identities. All **1,000 current roots are import-owned**. Primary currently has **zero manual intakes, zero incomplete manual-intake examples and zero earlier-year-only examples**. Those positive edge cases cannot honestly be claimed as newly exercised primary records. Their accepted isolated B1 evidence covers nullable manual New/Continuing, registration-only exclusion and earlier-year academic ownership; it remains linked in the implementation report. **No candidate example was copied or created on primary.** Existing imported Course pending cases remain readable. [Current primary reads and case coverage](../../output/b1-primary-20261025/primary-reads.json).

Bounded reads retain 25/50/100 pages, strict maximum 100 and stable ordering. Three sequential authorized service samples per role/page returned exact expected sizes; elapsed ranges were **38–118 ms** across these local samples. These are service observations, not a speedup, HTTP/concurrency benchmark or LAN certification. The accepted set-based query shape and R01–R07 safeguards are unchanged by promotion.

## Browser and permissions

Existing synthetic Staff and Coordinator accounts authenticated through the ordinary endpoint without account/password/role changes. Each role passed current-year entry, exact ID search, New classification filtering (**250**), school filtering, pagination, explicit profile year, Back/Forward, reload, All Years and the honest empty earlier-year view. Each fresh default issued **one scoped list request**, without an all-year flash. Primary calendar configuration was not changed; working-year transition/closure checks ran in the disposable configuration driver.

Both roles passed **1440/1024/820/375/320 CSS-pixel** checks at 900-pixel viewport height. Search and native More filters keyboard access worked. Table focus had a **3-pixel outline**, stayed visible through local horizontal scrolling at narrow widths, and produced no page-level overflow. Screenshots exclude the account banner. Narrow tables retain their accepted scrolling and name disclosure behavior.

| Width | Staff | Coordinator |
|---|---|---|
| 1440 | [Registry](../../output/playwright/b1-primary/staff-1440.png) | [Registry](../../output/playwright/b1-primary/coordinator-1440.png) |
| 1024 | [Registry](../../output/playwright/b1-primary/staff-1024.png) | [Registry](../../output/playwright/b1-primary/coordinator-1024.png) |
| 820 | [Registry](../../output/playwright/b1-primary/staff-820.png) | [Registry](../../output/playwright/b1-primary/coordinator-820.png) |
| 375 | [Registry](../../output/playwright/b1-primary/staff-375.png) | [Registry](../../output/playwright/b1-primary/coordinator-375.png) |
| 320 | [Registry](../../output/playwright/b1-primary/staff-320.png) | [Registry](../../output/playwright/b1-primary/coordinator-320.png) |

Staff can open/import-review UI, but its already-approved-list option remains disabled. Coordinator's option is available and initially unchecked. No upload was staged or confirmed. Pure Administrator/unassigned reads remained denied in direct authorized-service checks. Browser guards blocked non-GET business requests during Registry acceptance; none was attempted. Both test sessions were signed out; the user's separate session was not signed out. [Staff results](../../output/b1-primary-20261025/staff-browser.log), [Coordinator results](../../output/b1-primary-20261025/coordinator-browser.log), [Staff import authority](../../output/b1-primary-20261025/staff-import-finish.log), [Coordinator import authority](../../output/b1-primary-20261025/coordinator-import.log).

Additional screenshots: [All Years](../../output/playwright/b1-primary/coordinator-all-years.png), [earlier year](../../output/playwright/b1-primary/coordinator-historical.png), [year-scoped profile](../../output/playwright/b1-primary/coordinator-profile.png), [Staff import](../../output/playwright/b1-primary/staff-import.png), [Coordinator import](../../output/playwright/b1-primary/coordinator-import.png), [PAY-001](../../output/playwright/b1-primary/PAY-001.png), [PAY-002](../../output/playwright/b1-primary/PAY-002.png).

## Tests and preservation

All final commands below exited **0** against the promoted source. Mutation drivers created their own new disposable schemas, not primary or retained candidates.

| Check | Result |
|---|---|
| `npm run lint` / `npm run typecheck` | No lint/type errors |
| `npm run build` | Complete normal command passed; existing Vite chunk-size warning remains |
| `npm test` | **113 files / 710 tests passed** |
| `npm run check:secrets` | Passed |
| `npm run test:import-intake-bindings-db` | **13 import scenario groups plus binding assertions**: manual registration/reuse, immutable source history, guards, rollback, exact/concurrent retry and downstream import/publication/historical integration |
| `npm run test:configuration-db` | **15 disposable scenarios**, including guarded actual working-year transitions, closure, concurrency/retry and audit rollback |
| Registry parity / Payment Recording / reconciliation / financial reports | Four existing drivers passed, including R01/R07 output parity, financial retry/atomicity, Original/current evidence and complete API/XLSX/PDF checks |
| Primary read-only checks | SQL/result membership parity, roles, historical context, search/profile/filter/page behavior and unchanged full payment previews |

[Normal command exits](../../output/b1-primary-20261025/checks-main.json), [unit log](../../output/b1-primary-20261025/test-main.log), [import/calendar commands](../../output/b1-primary-20261025/integration/results.json), [four regression commands/exits](../../output/b1-primary-20261025/regressions-registry-primary/results.json).

Fresh starting inventories established the current financial state instead of assuming the prior report was still current. Final comparison passed for **all business table values/counts, schema objects, 65 migration rows, accounts/password hashes/roles and runtime grants**. This covers permanent IDs, contact/academic data, annual New/Continuing sources, approved imports, Masterlists, frozen payroll/source evidence, entitlements/allocations, payments/dates and individual/closure history.

| Primary fact | Fresh before → after |
|---|---|
| Scholars / accounts | **1,000 / 14 → unchanged** |
| Intake roots / academic records | **1,000 / 1,000 → unchanged** |
| Entitlements / allocations | **1,000 / 1,000 → unchanged** |
| Payments | **2 Paid → 2 Paid**, complete original rows/evidence exact; both actual dates **2026-10-24** |
| PAY-001 | **2 Paid / 798 Pending**, `canRecord:true` |
| PAY-002 | **200 Pending**, `canRecord:true` |
| Import bindings | **0 → 0** |

Full read-only payment previews still accept **798 / 200**, with zero conflicts. Neither preview was committed. All **10,386 pre-existing audit rows** match; only **two login and two logout events** were appended by the role checks (**10,390** total). Session rows increased **18 → 20**, with ordinary revocation/last-seen and rate-limit activity. This is qualified authentication activity, not zero database writes. [Preservation](../../output/b1-primary-20261025/preservation.json), [before financial reads](../../output/b1-primary-20261025/readiness-before.json), [after financial reads](../../output/b1-primary-20261025/readiness-after.json), [payroll browser checks](../../output/b1-primary-20261025/payrolls-browser.log).

## Recovery, limitations and stop

The saved 65-compatible A2.1 source/build is under `output/b1-primary-20261025/baseline/`; the new B1 build is [archived separately](../../output/b1-primary-20261025/compatible-build.zip). If rollback becomes necessary, coordinate a return of the reviewed source and frontend/API together, preserving unrelated later edits. No database restore, F55 downgrade, association backfill or record deletion is needed. A stale archive must never replace later valid data. The normal launch command remains `node scripts/localhost-5173-profile.mjs synthetic`.

Working-year metadata refreshes on Refresh/re-entry rather than polling. All Years uses working-year placement/classification unless a specific year is selected. No primary manual or earlier-year-only examples were added to fill acceptance gaps. Native 200% zoom, full assistive-technology/WCAG acceptance and office/LAN certification are not claimed. The existing bundle warning, narrow-table behavior and earlier unrelated payment-preview focus limitation remain.

Task helpers initially passed a boolean instead of the configuration validator's string query value and passed a NULL optional course filter; strict validation correctly rejected both. A timestamp comparison initially compared live Date objects with saved JSON strings; normalized serialization passed. Browser helpers initially used a corrupted pagination dash and incorrectly expected the entire Staff Import Excel button to be disabled; corrected checks test the actual approved-list control. These were helper/assertion issues; no application guard or accepted B1 byte was changed.

**Stopped after B1 promotion, verification and this report.** Primary 5173 is running the accepted B1 source. No B2, school/course textbox change, payment-status color change, Dashboard refinement, A4, migration, feature activation, retained-environment reset, LAN/production operation or unrelated enhancement was performed.
