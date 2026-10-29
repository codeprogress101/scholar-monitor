# D1.1 — Premium Dashboard visual polish

25 October 2026, Philippine time. **Implemented and verified in a new isolated candidate only. Primary 5173 remains on accepted D1, unchanged and not restarted. No promotion was performed.**

Review at [localhost:3024](http://127.0.0.1:3024/#dashboard). Candidate source: `C:/xampp/htdocs/ldss_d11_candidate_20261025`. Owned database: **`ldss_dashboard_polish_test_30740_0e9ac8b5`**, runtime **`ldss_dp_30740_0e9ac8b5@localhost`**, with the same **66 migrations**. Copied account identities/password hashes/roles remain available. No application migration, dependency, business permission, financial flag or data rule changed. Technical copy accounts follow the existing own-schema provisioning policy.

## Verified baseline and isolation

The seven accepted [D1 primary](D1_PRIMARY_UAT_PROMOTION_REPORT.md) source hashes matched. The actual dirty workspace supplied the baseline, including legitimate intervening files; Git HEAD was not substituted. A fresh checkpoint protects **1,304 existing main-workspace inputs**. Runtime verification confirmed **DESKTOP-BPLJKRP**, MariaDB **127.0.0.1:3306**, primary **`ldss_primary_test_12676_61497616`**, runtime **`ldss_primary_12676_61497616@localhost`**, synthetic profile, loopback **5173/3001**, and all **66 SQL checksums**. Controller/API/Vite commands and ancestry remain **49300 / 54124 / 2480**. [Preflight](../../output/d1-1-dashboard-20261025/preflight.json), [process evidence](../../output/d1-1-dashboard-20261025/primary-processes.json).

A fresh encrypted source checkpoint of **149 tables / 13,688,564 encrypted bytes** passed a newly owned isolated restoration, including data, definitions, indexes, foreign keys/checks, triggers, executable views and rejection probes. The temporary restore schema/account was removed. Existing backup bounds were retained. Copied sessions, reset tokens and rate limits were excluded from the new candidate. Keys and credentials remain restricted and are excluded from review archives. [Recovery verification](../../output/d1-1-dashboard-20261025/backup.json).

The current-state visual reference was the latest accepted D1 primary screenshot, `output/playwright/d1-primary/coordinator-after-1440.png`; no newer screenshot was attached to this request. The earlier approved `C:/Users/ADMIN/Downloads/download.png` was also inspected for visual direction. Its example figures and different charts were not adopted. The accepted [D1 implementation findings](D1_PREMIUM_DASHBOARD_IMPLEMENTATION_REPORT.md) supplied the data/performance boundary.

## Exact presentation changes

**Three existing UI files and one new presentation test**, entirely in the candidate:

| Candidate file | Change |
|---|---|
| `src/DashboardPage.tsx` | Concise cycle option labels, complete accessible cycle description/disclosure and native title; shorter secondary wording |
| `src/DashboardCharts.tsx` | Consistent outcome-count hooks, clearer effective-row headings, aligned total/legend and removal of repetitive prose |
| `src/styles.css` | Appended Dashboard-only card/banner/chart/work-section spacing, alignment, wrapping and contrast rules |
| `tests/dashboard-polish.test.tsx` — new | Complete cycle wording, Unicode-safe display shortening, exact zero/nonzero outcome counts and proportional geometry |

The complete original CSS prefix is byte-identical. Dashboard hooks, loading effects, state transitions, saved preference, event handlers, permission conditions and destinations are unchanged. Every other existing non-generated application/configuration/test file matches, except the candidate-only Apache access denial. Backend, SQL, schema manifest, financial/academic writers, registration, workbook/parser, recovery formats, fonts, package files and launchers remain exact. Generated builds and task-local verification helpers are separate from this four-file package. [Source boundary](../../output/d1-1-dashboard-20261025/source-preservation.json), [exact file hashes](../../output/d1-1-dashboard-20261025/candidate-files.json).

- **Summary cards:** smaller padding and restrained icons, aligned numeric baselines and full-width content. New/Continuing numbers now precede their labels. All four factual areas, Unknown handling, account scope, status counts and admission/payment distinctions remain.
- **Period banner:** tighter desktop proportions. Only the displayed cycle name is shortened to at most 24 Unicode scalar values; IDs and underlying names are untouched. Full original name/year/semester/state are available through `aria-describedby`, a native title and the keyboard-operable **Full cycle details** disclosure. Year, semester, actual cycle state, unavailable state and passed-target warning remain immediately visible.
- **Batch progress:** consistent 12-pixel bars, clear batch names/links, paired badge/count columns and stronger exact Paid numerals. Segment calculations and colors are unchanged. A Paid count of 2 out of 800 still receives exactly 2.5 SVG units in the 1,000-unit bar.
- **Outcome breakdown:** aligned donut and ruled legend rows, tabular figures, clear total and zero outcomes. The 2/1,000 Paid arc remains exactly 0.2%; there is no minimum slice, rounded-cap inflation or alternate total source.
- **Lower sections:** consistent panel spacing, tighter genuine task rows and existing Quick Actions. Detailed document & eligibility assessments remain an optional disclosure; its expensive reader is not requested on entry.

Manrope/DM Sans, green-and-white surfaces, light borders, restrained shadows and B2.5 badges remain. No gradient, animation, new icon family or chart dependency was added. Paid remains green, Pending gray, Unclaimed amber and Needs resolution red, always with visible text.

## Meaning and source preservation

Annual association remains B1 discovery evidence, not admission. New/Continuing remains the existing selected-year classification. Both charts consume the **same existing Recording summary response**: current effective outcomes of finalized numbered payroll rows in the selected year/semester, across cycles. Approved corrections retain their existing effect. These are payroll rows/attempts, not unique entitlements, original closure outcomes or later individual DV settlements. **On payroll and Masterlist membership are not Paid.** The full source explanation remains under What these outcomes mean.

The copied real data remains **1,000 associated scholars**, **250 New / 750 Continuing / 0 Unknown**; PAY-001 **2 Paid / 798 Pending**, PAY-002 **0 Paid / 200 Pending**. Aggregate outcomes are **2 / 998 / 0 / 0**. Account-authorized pending work remains **2 Staff / 4 Coordinator**, across periods. Both roles matched independent Registry classification totals and existing Recording batch summaries. Pure Administrator/unassigned summary reads remain denied. [Authoritative comparisons](../../output/d1-1-dashboard-20261025/summary-read-acceptance.json).

No endpoint, SQL query, data dependency, polling, authorization cache or financial-source shortcut was introduced. Existing 50-batch/5,000-associated guards, bounded metadata, R01–R07, complete outputs and fail-closed source validation remain in unchanged backend files.

## Matched screenshots and layout

Captures use the same copied data, role, period, 900-pixel height, default zoom, settled summaries, closed help/details and masked account banner. Before uses the accepted D1 compatible client; after uses the final D1.1 build. Primary was not reverted or used for browser authentication.

| CSS width | Staff before / after | Coordinator before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/d1-1/staff-before-1440.png) / [After](../../output/playwright/d1-1/staff-after-1440.png) | [Before](../../output/playwright/d1-1/coordinator-before-1440.png) / [After](../../output/playwright/d1-1/coordinator-after-1440.png) |
| 1024 | [Before](../../output/playwright/d1-1/staff-before-1024.png) / [After](../../output/playwright/d1-1/staff-after-1024.png) | [Before](../../output/playwright/d1-1/coordinator-before-1024.png) / [After](../../output/playwright/d1-1/coordinator-after-1024.png) |
| 820 | [Before](../../output/playwright/d1-1/staff-before-820.png) / [After](../../output/playwright/d1-1/staff-after-820.png) | [Before](../../output/playwright/d1-1/coordinator-before-820.png) / [After](../../output/playwright/d1-1/coordinator-after-820.png) |
| 375 | [Before](../../output/playwright/d1-1/staff-before-375.png) / [After](../../output/playwright/d1-1/staff-after-375.png) | [Before](../../output/playwright/d1-1/coordinator-before-375.png) / [After](../../output/playwright/d1-1/coordinator-after-375.png) |
| 320 | [Before](../../output/playwright/d1-1/staff-before-320.png) / [After](../../output/playwright/d1-1/staff-after-320.png) | [Before](../../output/playwright/d1-1/coordinator-before-320.png) / [After](../../output/playwright/d1-1/coordinator-after-320.png) |

Maximum summary-card heights, in width order above, change **227→179 / 206→160 / 227→179 / 223→160 / 223→179 CSS pixels**. Desktop cards are about **21% shorter** without reducing KPI text. The banner changes **135→128 / 135→131 / 207→131 / 224→239 / 268→282 pixels**. The narrow banner intentionally spends about 14–15 additional pixels on accessible full-cycle access; a universal height reduction is not claimed. [Before measurements](../../output/d1-1-dashboard-20261025/coordinator-before.json), [final after measurements](../../output/d1-1-dashboard-20261025/coordinator-after-final.json), [complete Dashboard](../../output/playwright/d1-1/coordinator-after-full.png).

Both roles passed all five widths with no page-level horizontal overflow. Cards stack, batch names wrap and exact legend values remain visible. Refresh → cycle keyboard order, full-cycle disclosure, outcome scope disclosure, 3-pixel focus, period clearing/restoration, refresh and saved selection passed. Registration navigation/cancel and Recording links/date-pencil availability remain. Both roles opened all seven detailed assessments only on demand. [Staff checks](../../output/d1-1-dashboard-20261025/staff-controls.json), [Coordinator checks](../../output/d1-1-dashboard-20261025/coordinator-controls.json).

Candidate-only browser probes covered all four nonzero outcomes, a genuinely empty supported scope, unavailable/unsupported summary, metadata failure and stale saved preference. They demonstrate rendering, not committed financial examples. Delayed payroll and failed annual reads confirmed independent loading and no stale chart after clearing a period. Probes were removed and actual API data restored. Browser guards recorded **zero attempted business writes**. [State checks](../../output/d1-1-dashboard-20261025/states.json), [actual charts](../../output/playwright/d1-1/actual-payroll-charts.png).

**Native 200% Chrome** passed a focused Coordinator review in a task-only normal browser profile, with viewport emulation disabled: **712×424 CSS pixels, DPR 2**. Overview, long-cycle disclosure, bars, donut, actions and scope text passed reflow/keyboard checks with no page overflow. Captures use the rendered browser view without resizing. Zoom was restored to 100%, task sessions signed out and task browser windows closed. This is not full assistive-technology/WCAG or office/LAN certification. [Native proof](../../output/d1-1-dashboard-20261025/native-zoom-review.json), [200% overview](../../output/playwright/d1-1/native-200-overview.png), [200% donut](../../output/playwright/d1-1/native-200-donut.png). The ui-ux-pro-max and Playwright skills were used.

## Comparable performance and bundle impact

Final samples alternate accepted D1 and final D1.1 clients against the **same candidate API/database**, actor, selected period and 1440×900 viewport, cache disabled, with no build/regression work running concurrently. Before static assets were replayed through candidate-browser interception; markup checks verified which client was delivered. All four-card readiness includes the attention count, independently of annual/payroll readiness. Both graphs share payroll readiness. The current-list read is included in full-page readiness.

| Role / measurement | Before, three samples ms | After, three samples ms |
|---|---|---|
| Staff, all four cards / full initial Dashboard | 384 / 280 / 392 | **260 / 252 / 378** |
| Staff, both graphs | 274 / 280 / 282 | **259 / 252 / 267** |
| Coordinator, all four cards / full initial Dashboard | 398 / 392 / 378 | **267 / 268 / 253** |
| Coordinator, both graphs | 287 / 283 / 271 | **267 / 268 / 253** |

Both clients issue **10 API requests** and return the same measured API bytes: **9,009 Staff / 13,424 Coordinator**. Every measured response succeeded; the detailed reader was absent. Annual/payroll bodies remain **156 / 1,052 bytes**. No meaningful loading regression was observed; timing variation is not proof of a backend speedup. The D1 improvement is preserved. These are local compiled-client observations, not actual-primary Vite, HTTP capacity, concurrency or LAN measurements. Earlier exploratory samples remain in task logs; the alternating final pass is the comparison above. [Structured measurements](../../output/d1-1-dashboard-20261025/performance.json).

Client asset bytes change **1,452,375→1,456,893**, an increase of **4,518 bytes**. JavaScript changes **1,033,682→1,034,005**; CSS **312,532→316,727**; observed CSS gzip **47,020→47,660**. Fonts and dependencies are unchanged. [Bundle comparison](../../output/d1-1-dashboard-20261025/bundle-impact.json).

## Tests and fresh preservation

| Final candidate check | Result |
|---|---|
| `npm run lint`, `npm run typecheck` | Exit 0, no errors |
| `npm run build` | Complete normal command, exit 0 |
| `npm test` | **120 files / 765 tests passed** |
| `npm run check:secrets` | Exit 0 |
| Dashboard, Payment Recording, reconciliation, individual settlement, financial reports | **All five disposable integration suites exit 0** |
| Registry/Recording source oracles and full payment previews | Passed on exact copy/current primary read scopes; no preview committed |

Regression coverage retains retry/atomicity, source distinctions, R01–R07 checks and full API/XLSX/PDF outputs. Mutating suites provisioned new owned disposable databases. No retained fixture was reset or migrated. [Normal exits](../../output/d1-1-dashboard-20261025/checks-main.json), [unit log](../../output/d1-1-dashboard-20261025/test-final.log), [five exact commands/exits](../../output/d1-1-dashboard-20261025/regressions-d-one-polish/results.json), [fresh financial reads](../../output/d1-1-dashboard-20261025/readiness.json).

Fresh comparisons prove **all 1,304 protected main-workspace inputs exact**, all primary business values/counts, schema objects, 66 journal entries, account/password/role data and runtime grants unchanged. This covers identities, registrations/classifications, academic/standing data, supplied text/import sources/bindings, Masterlists, entitlements, allocations, frozen payroll evidence, actual dates and individual/closure history.

| Current primary fact | Fresh before → after |
|---|---|
| Scholars / accounts | **1,000 / 14**, unchanged |
| Intake roots / academic records | **1,000 / 1,000**, unchanged |
| Entitlements / allocations | **1,000 / 1,000**, unchanged |
| Every payment | **2 Paid → 2 Paid**, exact complete rows/evidence, both actual dates **2026-10-24** |
| PAY-001 / PAY-002 | **2 Paid / 798 Pending** and **200 Pending**, both recordable |

Full fresh previews accept **798 / 200**, zero conflicts; none was committed. All **10,414 starting primary audit rows** remain exact, with **zero appended audit events**. Only the existing `auth_sessions` checksum changed, with **34 rows before and after**. This task performed no primary login or business command; existing session activity is qualified rather than claiming zero database activity. Primary PIDs/profile and retained listeners through 3023 remain unchanged. This is not an exhaustive new inventory of every retained database.

The candidate's original business/source/payment rows also remain exact. Only its two ordinary task logins and two logouts added audit events (**10,414→10,418**), with sessions/rate limits excluded initially and then created by authentication. No candidate registration, payment, correction, import or calendar command was sent. [Preservation](../../output/d1-1-dashboard-20261025/preservation.json).

## Review package, limits and primary proposal

[Four-file inventory](../../output/d1-1-dashboard-20261025/candidate-files.json), [review patch](../../output/d1-1-dashboard-20261025/D1_1_CANDIDATE.patch), [source archive](../../output/d1-1-dashboard-20261025/candidate-source.zip), [compatible build](../../output/d1-1-dashboard-20261025/compatible-build.zip). Archives exclude credentials, keys, `.env`, task fixtures and the candidate isolation rule. Patch check passed against the actual dirty main baseline with automatic line-ending conversion disabled; a separate apply round trip reproduced every reviewed hash. **The patch was not applied to primary.**

The owned candidate remains running on **3024**, PID **18528**, with compatible frontend/API and 66-entry readiness. Served client assets match the reviewed build, and primary/retained process checks pass. [Delivery verification](../../output/d1-1-dashboard-20261025/delivery.json). Restart only from its candidate directory with `node --import tsx output/d1-1-dashboard-20261025/serve.ts`; it performs no startup migration/reset.

Initial task setup used the wrong working directory for one file-only helper; it stopped before launching a server. Initial unit tests caught a shell-transferred ellipsis encoding error and a locale-format expectation; final source and tests were corrected. Layout inspection then corrected inherited paragraph margins and disclosure color. No business safeguard, permission, test bound or financial validator was weakened.

Remaining limits: narrow layouts still require ordinary vertical scrolling; long native option text is deliberately abbreviated, with the full exact value in accessible details/title. Mobile banner height is slightly greater to retain this access and visible warnings. Genuine Unclaimed/Needs resolution counts are zero in this copy, so positive colored examples are explicitly browser-only simulations. One-cycle/manual-example limits, costly optional detailed assessments, native platform rendering, the existing Vite chunk warning and earlier unrelated focus qualifications remain. No production/LAN or full AT/WCAG claim follows.

After separate primary authorization:

1. Recheck the exact synthetic host/runtime/profile/listeners, all 66 checksums and then-current dirty source against this four-file inventory. Review newer edits and preserve all legitimate current transactions.
2. Capture fresh file/business/account/grant/audit/frozen-source inventories and a current recovery checkpoint verified through a new isolated restore. Do not transfer candidate data, sessions or credentials.
3. Promote only the three reviewed UI files and presentation test, rebuild/verify the compatible client, and preserve retained static/server artifacts. No API, SQL, grant, permission, flag or launcher change is needed; coordinate only necessary verified frontend maintenance.
4. Check both roles read-only, actual badges/counts, cycle details/warnings, responsive/keyboard/zoom behavior and current data/payment/source preservation. Keep mutations in disposable copies.
5. If presentation activation fails, return to the saved **66-compatible D1 frontend/source**, preserving later legitimate edits. No database restore, migration downgrade or history deletion is appropriate.

**Stopped after isolated D1.1 implementation, testing and reporting.** Primary 5173 remains on accepted D1. No promotion, D2, new data source, financial/academic rule, rollover, Dashboard feature, retained-environment restart, LAN/production operation or unrelated change occurred.
