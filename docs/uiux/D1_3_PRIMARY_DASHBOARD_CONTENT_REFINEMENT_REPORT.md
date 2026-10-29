# D1.3 — Final balanced Dashboard primary refinement

25 October 2026, Philippine time. **Completed and verified at [localhost:5173](http://127.0.0.1:5173/#dashboard). Primary runs combined D1.1 + D1.2 with the authorized D1.3 cleanup and Payment Status position amendment. Stopped after verification.** No permanent candidate was created. No migration, grant, permission, financial flag, business rule or business record changed.

The [accepted D1.1 presentation](D1_1_PREMIUM_DASHBOARD_VISUAL_POLISH_REPORT.md) and [D1.2 package](D1_2_BALANCED_SCHOLARSHIP_DASHBOARD_REPORT.md) were reused. New D1.3 work is limited to Dashboard presentation and focused tests. The accepted D1.2 annual aggregate is the only backend difference from the starting D1 primary, and matches its reviewed bytes exactly.

## Target, checkpoint and coordinated activation

| Item | Fresh verification |
|---|---|
| Host / database server | **DESKTOP-BPLJKRP**, MariaDB **127.0.0.1:3306** |
| Database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic**, **127.0.0.1:5173 / 3001** |
| Schema | **66 migrations**, all SQL checksums and applied timestamps unchanged |
| Before controller / API / Vite | **49300 / 54124 / 2480** |
| Final controller / API / Vite | **39004 / 50408 / 49416** |

All 1,305 inputs protected by the preceding D1.2 checkpoint matched. Its intervening report was retained; a fresh checkpoint protects **1,306 existing files**. Accepted D1, D1.1 and combined D1.2 source hashes, reviewed archives and patch hashes matched. The combined patch passed its check against the actual dirty primary workspace with automatic newline conversion disabled. No newer unrelated edit was overwritten. Current business, account, grant, audit and payment evidence was freshly inventoried. [Preflight](../../output/d1-3-primary-20261025/preflight.json), [starting files](../../output/d1-3-primary-20261025/files-before.json), [starting financial reads](../../output/d1-3-primary-20261025/readiness-before.json).

A fresh encrypted checkpoint passed a newly owned isolated restore **while primary source remained untouched**. A second current checkpoint passed another isolated restore with primary ports quiet before source installation. Both covered all **149 tables**, values, definitions, indexes, foreign keys/checks, triggers, executable views and rejection probes. Temporary restore schemas/accounts were removed. Encrypted sizes were **13,688,866 / 13,689,298 bytes**. Existing backup bounds remained unchanged; credentials, keys and archive contents remain restricted. Nothing was restored over primary. [First recovery](../../output/d1-3-primary-20261025/recovery.json), [activation recovery](../../output/d1-3-primary-20261025/activation-recovery.json).

Temporary staging at `C:/xampp/htdocs/ldss_d13_primary_stage_20261025` used the actual dirty baseline plus the exact reviewed package. The final source/build was tested there before installation. Only the reverified primary controller tree was stopped. Matching API and Vite source were activated through the unchanged primary launcher. The position amendment subsequently passed the complete normal checks/build before its single Dashboard page file was replaced atomically; it needed no additional API restart. No candidate database, people, account, session, fixture or credential was copied. [Maintenance](../../output/d1-3-primary-20261025/maintenance.json), [build verification](../../output/d1-3-primary-20261025/build-verification.json), [installed hashes](../../output/d1-3-primary-20261025/promoted-files.json).

All **310 starting distribution files** remain byte-identical, preserving the 33 shared static-client files and 277 server outputs used by retained environments. The new compatible build is archived separately. Primary uses current TypeScript API/Vite source. Retained listeners **3011/3012/3013/3015/3016/3018/3019/3020/3021/3022/3023/3024/3025** keep their starting PIDs; none was restarted. D1.1/D1.2 candidate source hashes also remain exact. Frontend and readiness return **200**, and all four served local font binaries match their source hashes. [Delivery verification](../../output/d1-3-primary-20261025/delivery.json).

## Final content and exact source boundary

The Dashboard order is now:

1. D1.1 compact period banner and **two** summaries: **Total Scholars** and **Pending Tasks**.
2. **One full-width Payment Status card**, immediately after the summaries and before both scholarship charts, as amended. It retains selected-year/semester scope, exact outcomes, Payroll navigation and batch details. Its four outcome cells form a horizontal row on desktop and reflow at narrow widths.
3. **Scholar classification** and **Scholars by year level** charts.
4. Matching compact **Graduation Monitoring** and **Admission & Requirements** cards, each with its existing icon, one short description and one action.
5. Compact **Needs attention**, permission-aware Quick Actions, Official Masterlists and collapsed detailed assessments.

Pending Tasks uses the real R06 count. **View pending tasks** moves focus and scrolls to the existing Needs attention heading without changing the application route. The list still shows up to three actual oldest tasks; its existing View all destination exposes the full authorized list. No urgency or task is invented.

Classification retains proportional geometry and exact New/Continuing/Unknown counts, with visible percentages to at most two decimal places. A one-in-5,000 share remains **0.02%**, not a fabricated minimum slice. The annual-classification/admission distinction remains visible.

Year levels **1–5** are visible by default on the same whole-cohort scale. When nonzero, Year 6, Year 7+ and Unknown/unrecognized counts appear in a closed **Other / Unknown levels** disclosure; they remain in the total and bar denominator. Zero supplementary groups do not create unnecessary default rows. Source details remain available on request. Neither registration wording nor initial provisional placement becomes an academic fact.

**View Monitoring** preserves selected academic year and semester and opens the existing final-year review entry; every detailed monitoring category remains in its unchanged module. **Open Admission Review** retains the selected year and existing validation-stage destination. Neither card invents totals or approval. Quick Actions remove duplicate Admission/Graduation links and retain Find/Add Scholar, Receive Documents, Payment Recording and Reports. A separate permission-aware Verify documents action uses the existing receiving/verification workspace. Receiving and verification remain distinct activities. Official Masterlists retain current-working-year titles, membership counts and authorized destinations.

| Final package file | Change |
|---|---|
| [server/dashboard/overview.ts](../../server/dashboard/overview.ts) | Exact accepted D1.2 read-only academic aggregate; **no D1.3 backend edit** |
| [src/DashboardPage.tsx](../../src/DashboardPage.tsx) | Combined layout, two cards, pending-list focus, single-action review cards, amended payment placement and concise daily navigation |
| [src/DashboardCharts.tsx](../../src/DashboardCharts.tsx) | Exact accepted D1.2 compact payment presentation |
| [src/DashboardScholarCharts.tsx](../../src/DashboardScholarCharts.tsx) — new | Accepted scholarship charts with visible percentages and supplementary levels disclosure |
| [src/styles.css](../../src/styles.css) | Byte-identical D1.2 prefix plus Dashboard-only compact layout/focus/wrapping rules |
| [tests/dashboard-overview.test.tsx](../../tests/dashboard-overview.test.tsx) | Exact accepted D1.2 source/authority/bounds tests |
| [tests/dashboard-polish.test.tsx](../../tests/dashboard-polish.test.tsx) — new | Exact accepted D1.1/D1.2 cycle and payment-presentation tests |
| [tests/dashboard-balanced.test.tsx](../../tests/dashboard-balanced.test.tsx) — new | Accepted academic/legacy/context tests; adapt default supplementary-zero display expectation |
| [tests/dashboard-content.test.tsx](../../tests/dashboard-content.test.tsx) — new | Nonzero supplementary/Unknown retention, whole-cohort scale, empty five-row chart and tiny percentage safeguards |

There are **five existing-file changes and four additions** relative to starting primary D1. **1,301 of 1,306 existing inputs remain exact**, with no missing file. The report and task-local evidence are additional deliverables. All other backend files, routes, writers, schema, migrations, role mappings, dependencies, fonts, configuration, launchers, flags and other pages remain exact. There is no new endpoint, SQL round trip, data dependency, polling or financial authorization cache. [Nine-file SHA-256 inventory](../../output/d1-3-primary-20261025/candidate-files.json), [source boundary](../../output/d1-3-primary-20261025/source-preservation.json).

## Actual source/count acceptance

Staff and Coordinator matched independent Registry classification, selected-year canonical academic projection and existing Payment Recording summaries. Original annual fields and complete payroll responses match the starting D1 reader, excluding the explicitly added academic metadata. Pure Administrator/unassigned summary access remains denied. [Primary read-only oracles](../../output/d1-3-primary-20261025/summary-read-acceptance.json).

| Actual primary area | Verified value and meaning |
|---|---|
| Period | **TWO-BATCH-YEAR / TWO-FIRST** |
| Total Scholars | **1,000** B1 associated people, all statuses; not admission approval |
| Classification | **250 New / 750 Continuing / 0 Unknown**, **25% / 75% / 0%** |
| Canonical year levels | **250 / 250 / 250 / 200 / 50** in Years 1–5; Year 6/7+/Unknown genuinely **0** |
| Pending Tasks | **2 Staff / 4 Coordinator**, account-authorized and across periods |
| Payment Status | **2 Paid / 998 Pending / 0 Unclaimed / 0 Needs resolution** |
| Official Masterlists | Existing current-year **800 / 200** members |

Payment Status retains **current effective outcomes of finalized numbered payroll rows in the selected year/semester, across cycles**, including approved corrections. Rows can represent attempts. They are not unique entitlements, original closure outcomes or later individual settlements. Paid is green, Pending gray, Unclaimed amber and Needs resolution red, with visible labels and exact counts. **On payroll and Masterlist inclusion are not Paid.** No financial reader or command changed.

Positive exceptional-level/Unknown, empty and legacy-response cases are covered by focused tests and the accepted D1.2 disposable evidence. Primary has one cycle and no manual intakes/text events; none was added to manufacture coverage. Graduation/requirements totals remain deliberately deferred. Detailed assessments remain costly, optional and absent from default loading.

## Screenshots, responsive and keyboard acceptance

Both roles passed **1440/1024/820/375/320 CSS pixels**, height 900, with no page-level horizontal overflow. Acceptance explicitly checks that the single Payment Status card immediately follows the summaries, precedes both charts and spans the summary width. Labels/counts remain visible as its cells reflow. Both review cards contain exactly one action; duplicate Quick Actions are absent.

Full-page captures below use the same primary records, role, period, settled content, default zoom and closed disclosures. Account banners are masked; pages were scrolled to the top before capture. **Every after image includes the position amendment.** Primary was not reverted for pictures.

| Width | Staff before / final | Coordinator before / final |
|---|---|---|
| 1440 | [Before](../../output/playwright/d1-3-primary/staff-before-1440.png) / [Final](../../output/playwright/d1-3-primary/staff-after-1440.png) | [Before](../../output/playwright/d1-3-primary/coordinator-before-1440.png) / [Final](../../output/playwright/d1-3-primary/coordinator-after-1440.png) |
| 1024 | [Before](../../output/playwright/d1-3-primary/staff-before-1024.png) / [Final](../../output/playwright/d1-3-primary/staff-after-1024.png) | [Before](../../output/playwright/d1-3-primary/coordinator-before-1024.png) / [Final](../../output/playwright/d1-3-primary/coordinator-after-1024.png) |
| 820 | [Before](../../output/playwright/d1-3-primary/staff-before-820.png) / [Final](../../output/playwright/d1-3-primary/staff-after-820.png) | [Before](../../output/playwright/d1-3-primary/coordinator-before-820.png) / [Final](../../output/playwright/d1-3-primary/coordinator-after-820.png) |
| 375 | [Before](../../output/playwright/d1-3-primary/staff-before-375.png) / [Final](../../output/playwright/d1-3-primary/staff-after-375.png) | [Before](../../output/playwright/d1-3-primary/coordinator-before-375.png) / [Final](../../output/playwright/d1-3-primary/coordinator-after-375.png) |
| 320 | [Before](../../output/playwright/d1-3-primary/staff-before-320.png) / [Final](../../output/playwright/d1-3-primary/staff-after-320.png) | [Before](../../output/playwright/d1-3-primary/coordinator-before-320.png) / [Final](../../output/playwright/d1-3-primary/coordinator-after-320.png) |

Desktop summary heights fall **226.6→153.8 px**. Final full-page heights for Staff are **1,991 / 2,391 / 2,632 / 3,600 / 3,963 px**; Coordinator **1,991 / 2,456 / 2,697 / 3,622 / 4,011 px**. The accepted D1.2 Coordinator reference is 2,363 px high at the same desktop width; the final 1,991 px design is 372 px shorter. This reference comparison is separate from the actual primary-before D1 captures: D1 desktop was 1,913 px, so the balanced overview is not universally shorter than the earlier payment-centered layout. Narrow primary layouts are shorter.

Refresh → cycle → full-cycle-details keyboard access, **3-pixel focus**, source disclosures, period clearing/restoration, exact cycle wording and the Pending Tasks focus action pass. Actual Graduation/Admission destinations preserve context. Find/Add Scholar cancels back to its trigger; receiving, verification, current Masterlists and Reports open their established destinations. Both existing date forms show **2026-10-24** and were cancelled. All seven detailed assessments load only on demand. Manrope/DM Sans remain. [Staff acceptance](../../output/d1-3-primary-20261025/controls-staff.json), [Coordinator acceptance](../../output/d1-3-primary-20261025/controls-coordinator.json), [daily navigation and failures](../../output/d1-3-primary-20261025/workflows.json).

Browser-only network-abort probes checked annual, payroll and pending-work failures. Unavailable never became fabricated zero or stale charts; normal reads were restored. **No primary API data was substituted.** Browser guards recorded zero attempted non-GET business requests.

Focused **native 200% Chrome** passed with viewport emulation disabled, **712×424 CSS pixels / DPR 2**. Upper payment placement, classification, levels, actions, source details and pending-list focus passed without page overflow. Captures use the browser's rendered view without resizing. Zoom returned to 100%; task windows closed and both task sessions signed out. The user's separate session/profile was not signed out. [Native proof](../../output/d1-3-primary-20261025/native-zoom-review.json), [200% upper payment card](../../output/playwright/d1-3-primary/native-200-payment.png), [200% pending focus](../../output/playwright/d1-3-primary/native-200-pending.png). The ui-ux-pro-max and Playwright workflows were used; this is not full AT/WCAG certification.

## Performance, build and tests

Initial actual-primary D1 locator samples measured full readiness **548/537/553 ms Staff**, **549/537/554 ms Coordinator**. Later locator waits sometimes overstated readiness near a polling boundary. The original logs remain; final comparison uses DOM MutationObserver timestamps at actual rendered content, avoiding that quantization.

The matched final comparison alternates the accepted compiled D1 client, final compiled D1.3 and actual primary Vite against the **same actual primary API/data/role**, 1440×900, cache disabled, one warm-up per delivery, three measured samples, no builds/regressions concurrently. Only static browser assets are replayed; neither primary source nor API responses are replaced. D1 now receives the additive compatible academic metadata too. Thus this comparison isolates presentation/delivery, rather than pretending to reconstruct the old API.

| Role / rendered readiness | Compiled D1, ms | Final compiled D1.3, ms | Final actual Vite, ms |
|---|---|---|---|
| Staff: cards / Pending Tasks / full initial page | 274 / 297 / 292 | **292 / 291 / 217** | **648 / 639 / 642** |
| Staff: both principal graphs | 195 / 194 / 203 | **214 / 219 / 183** | **575 / 567 / 584** |
| Coordinator: cards / Pending Tasks / full initial page | 273 / 273 / 281 | **206 / 302 / 279** | **636 / 632 / 659** |
| Coordinator: both principal graphs | 206 / 193 / 187 | **170 / 220 / 209** | **548 / 557 / 559** |

Cards include the task count; full readiness also waits for payment/current lists. Old graphs are payment graphs; new graphs are scholarship charts, so the content is not identical. The compiled comparison shows no consistent material rendering regression. Actual Vite remains slower than compiled delivery and is around 0.63–0.66 seconds in these final samples. It is not a claimed speedup over the differently timed original-primary observations.

Measured API requests remain **10**. Original annual payload **156→546 bytes**, payroll **1,052 unchanged**; total body bytes **9,009→9,399 Staff / 13,424→13,814 Coordinator**. D1.3 adds nothing beyond accepted D1.2 metadata. Service SELECTs remain **12 annual / 26 payroll**. Staff annual samples change **18.8/19.0/19.3→25.9/26.2/26.2 ms**; payroll **25.4/25.1/24.2→27.3/28.6/27.8 ms**. All responses succeeded and original annual/payroll values matched. First Coordinator service samples were slower on both versions and are retained. [Complete measurements and method](../../output/d1-3-primary-20261025/performance.json).

Client assets are **1,464,092 bytes**, versus **1,452,375 D1** and **1,464,161 D1.2**. Final JS/CSS are **1,035,911 / 322,020 bytes**; observed CSS gzip **48,427 bytes**. Fonts/dependencies are unchanged; no chart library was added. [Bundle comparison](../../output/d1-3-primary-20261025/bundle-impact.json).

| Final validation | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | All exit **0**, complete normal build after the position amendment |
| `npm test` | **122 files / 775 tests passed** |
| Dashboard, academic, approved academic changes, Registry, Payment Recording, reconciliation, individual settlement, financial reports | **All eight disposable integration suites exit 0** |
| Primary oracles, recovery, source/build/asset and browser checks | Passed |

The integration suites ran on the combined backend before the subsequent DOM-order-only amendment; that amendment then reran the complete lint/typecheck/build/unit/secret checks and actual layout acceptance. No backend or financial source changed between those runs. Mutations used newly owned disposable schemas. Retry/atomicity, source distinctions, R01–R07 and complete API/XLSX/PDF checks remain. No guard, limit or source pin was weakened. [Final commands](../../output/d1-3-primary-20261025/checks-main.json), [unit log](../../output/d1-3-primary-20261025/test-final.log), [eight exact commands/exits](../../output/d1-3-primary-20261025/regressions-d-one-final/results.json).

## Current-record preservation, recovery and stop

Fresh final comparison proves all business values/counts, schema objects, 66 migration rows, accounts/password hashes/roles, runtime grants and original audit rows exact. This covers permanent IDs, registrations/classifications, academic/standing evidence, supplied text, original Excel/import sources and bindings, Masterlists, entitlements/allocations, frozen payroll evidence, actual payment dates and individual/closure history.

| Fresh primary fact | Before → final |
|---|---|
| Scholars / accounts | **1,000 / 14**, unchanged |
| Intake roots / academic records | **1,000 / 1,000**, unchanged |
| Entitlements / allocations | **1,000 / 1,000**, unchanged |
| Every payment record | **2 Paid → 2 Paid**, complete original rows/evidence exact; both actual dates **2026-10-24** |
| PAY-001 / PAY-002 | **2 Paid / 798 Pending** and **200 Pending**, both recordable |
| Import bindings / text events | **0 / 0**, unchanged |

The current payment count was freshly established, not assumed from an older report. Full before/after previews include every current finalized batch and accept **798 / 200**, zero conflicts; neither was committed. All **10,415 starting audit rows** match. Only two task logins/two logouts were appended (**10,419** total); sessions **35→37**, with normal revocation/last-seen/rate-limit activity. This is qualified authentication activity, not zero database writes. [Final preservation](../../output/d1-3-primary-20261025/preservation.json), [final financial reads](../../output/d1-3-primary-20261025/readiness-after.json).

The first unchanged launcher attempt exceeded its existing API readiness timeout. No process from that attempt remained; a second ordinary invocation succeeded with unchanged source/configuration. No launcher, readiness threshold, grant or safeguard was relaxed. Performance tooling was refined to timestamp rendered content rather than overinterpret locator wait intervals. No acceptance-driven business repair was needed.

Remaining limits: positive Year 6+/Unknown and empty cases are not actual primary examples; supplementary disclosure behavior is covered by focused tests. Graduation/requirements counts remain deferred, optional detailed assessments remain costly, narrow screens retain ordinary vertical scrolling and existing local table scrolling in destination modules. Native platform rendering, the existing Vite chunk warning, cold-start/max-load, full AT/WCAG and office/LAN acceptance are not certified.

Final review/recovery artifacts: [exact source hashes](../../output/d1-3-primary-20261025/candidate-files.json), [combined final patch](../../output/d1-3-primary-20261025/D1_3_PRIMARY.patch), [nine-file source archive](../../output/d1-3-primary-20261025/candidate-source.zip), [compatible build](../../output/d1-3-primary-20261025/compatible-build.zip). Final patch round-trip reproduces the hashes against the saved exact starting baseline. Archives exclude credentials, keys, `.env`, fixtures and server PDF/template assets. Saved 66-compatible D1 source is under `output/d1-3-primary-20261025/baseline/`; its [accepted compatible build](../../output/d1-primary-20261025/compatible-build.zip) remains available. Rollback was not needed. Any future rollback must coordinate compatible source/UI/API and preserve later edits; no database restore, migration downgrade, history deletion or stale-data replacement is appropriate. Startup remains `node scripts/localhost-5173-profile.mjs synthetic`.

**Stopped after combined D1.1 + D1.2 + D1.3 primary implementation, the Payment Status position amendment, validation and reporting.** No D2, new workflow authority, academic/graduation/financial decision, schema/policy change, candidate-data transfer, other-page redesign, retained-environment restart or LAN/production operation occurred.
