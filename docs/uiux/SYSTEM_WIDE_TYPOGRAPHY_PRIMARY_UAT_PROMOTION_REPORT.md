# System-wide typography — Primary UAT promotion

25 October 2026, Philippine time. **Completed and verified at [localhost:5173](http://127.0.0.1:5173/). Primary serves the accepted Manrope/DM Sans typography. Stopped after promotion and verification.** No schema, API, permission, financial or academic behavior changed.

This promotes the exact eight-file package in the [accepted isolated report](SYSTEM_WIDE_TYPOGRAPHY_IMPLEMENTATION_REPORT.md), without reimplementation. No candidate scholars, accounts, sessions, credentials or fixtures were transferred.

## Exact target, baseline and recovery

| Item | Freshly verified result |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP**, **127.0.0.1:3306** |
| Database | **`ldss_primary_test_12676_61497616`** |
| Runtime | **`ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic**, **127.0.0.1:5173 / 3001** |
| Schema | **66 migrations**, checksums and applied timestamps unchanged |
| Controller / API / Vite, before and after | **49912 / 32832 / 41884**, commands, ancestry and loopback ownership unchanged |

All **1,290 files** protected by the candidate checkpoint still matched. The intervening typography report was preserved. A fresh checkpoint protected **1,291 existing files** and current business/account/grant/audit/payment state. All eight source/asset hashes and reviewed patch/source/build archive hashes matched; `git apply --check` passed against the actual dirty workspace. No newer unrelated edit was overwritten. [Preflight](../../output/typography-primary-20261025/preflight.json), [starting file inventory](../../output/typography-primary-20261025/files-before.json), [starting financial reads](../../output/typography-primary-20261025/readiness-before.json).

A fresh encrypted primary checkpoint of **149 tables**, **13,686,630 encrypted bytes**, passed a newly owned isolated restore. Verification covered values/counts, definitions, indexes, foreign keys/checks, triggers, executable views and rejection probes. The temporary restore schema/account was removed. The existing backup tool used source-schema read locks while primary remained running; no primary restore or process stop occurred. Existing **64 MiB SQL / 96 MiB archive / 100,000 rows per table** limits remain. Archive and key contents remain restricted. [Verified recovery](../../output/typography-primary-20261025/recovery.json).

## Exact installed files and activation

| Installed file | Purpose |
|---|---|
| [src/styles.css](../../src/styles.css) | Shared body/heading/weight tokens, local font faces, approved hierarchy and tabular financial figures |
| [dm-sans-latin.woff2](../../public/fonts/ldss/dm-sans-latin.woff2) | DM Sans v17, normal variable **400–600**, 36,932 bytes |
| [dm-sans-latin-ext.woff2](../../public/fonts/ldss/dm-sans-latin-ext.woff2) | DM Sans Latin Extended, 18,228 bytes |
| [manrope-latin.woff2](../../public/fonts/ldss/manrope-latin.woff2) | Manrope v20, normal variable **600–700**, 24,836 bytes |
| [manrope-latin-ext.woff2](../../public/fonts/ldss/manrope-latin-ext.woff2) | Manrope Latin Extended, 15,120 bytes |
| [dmsans-OFL.txt](../../public/fonts/ldss/dmsans-OFL.txt) | Original copyright notice and SIL OFL 1.1 |
| [manrope-OFL.txt](../../public/fonts/ldss/manrope-OFL.txt) | Original copyright notice and SIL OFL 1.1 |
| [font README](../../public/fonts/ldss/README.md) | Reviewed distribution URLs, provenance, coverage and hashes |

Every installed file matches its accepted SHA-256. The complete font directory was staged outside `public`, then published atomically **before** replacing CSS atomically. **1,290 of 1,291 existing files remain exact**; the sole existing change is `src/styles.css`. The seven new reviewed assets/license/provenance files, this report and task-local evidence are additions. No existing file is missing. [Promoted hashes](../../output/typography-primary-20261025/promoted-files.json), [preservation](../../output/typography-primary-20261025/preservation.json).

Manrope now serves headings, section titles and major KPI/payment-summary totals. DM Sans serves body text, scholar names, tables, forms, buttons, navigation, badges and descriptions. Existing Segoe UI/Arial/sans-serif fallbacks, text sizes, layout, spacing, colors, labels and business meanings remain. Technical code formatting retains its existing monospace behavior. No component markup, handler, dialog implementation, dependency or business logic changed.

The fresh **complete normal build and checks ran in the verified candidate directory**, with **825 baseline application/configuration/test/assets matching the promoted primary** and all seven new assets independently hash-verified. All **294 distribution files** match the accepted build byte-for-byte. The fresh [compatible frontend archive](../../output/typography-primary-20261025/compatible-client.zip) contains only the 17 client files, excluding server/PDF assets. Primary's **33 shared static-client files and 277 server outputs were never replaced**, preserving older retained servers. [Build verification](../../output/typography-primary-20261025/build-verification.json).

Primary's existing Vite frontend loaded the promoted CSS/public assets with the unchanged compatible API. **No process restart was needed.** Frontend and exact 66-entry API readiness return **200**. HTTP reads of all seven newly served files match their source hashes. Retained listeners **3011/3012/3013/3015/3016/3018/3019/3020/3021/3022** retain their original PIDs. No `.env`, launch configuration, feature flag, schema, grant, permission, backend/API or financial writer changed. Server PDF fonts and all server build files remain byte-identical. [Final delivery/process/served-asset verification](../../output/typography-primary-20261025/delivery.json).

## Local loading and bundle impact

Font faces use **`font-display: swap`**, local same-origin URLs and Latin/Latin Extended ranges. No runtime third-party font dependency, new framework, separate per-weight files or additional weight range was introduced. Both role screen reviews recorded **zero external runtime requests**. Browser font records confirmed the actual loaded families; CSS family declarations alone were not treated as load proof.

| Property | Accepted B2.5 → typography |
|---|---:|
| Font binaries | **0 → 95,116 bytes**, about **92.9 KiB** |
| Complete client assets, including notices/provenance | **1,330,375 → 1,437,835 bytes** |
| Built CSS | **301,627 → 303,878 bytes** |
| CSS gzip observation | **45,160 → 45,601 bytes**, **+441** |
| Built JavaScript | **1,027,796 → 1,027,796 bytes** |

Generated asset references/names change. The accepted comparison finds compiled JavaScript identical after normalizing generated asset-hash references; JavaScript file hashes are not claimed identical. [Accepted bundle measurements](../../output/typography-20261025/bundle-impact.json).

A cold primary Dashboard observation loaded only the two Latin files: **61,768 encoded bytes**, observed **130.6 ms / 18.0 ms** resource durations. A subsequent sample still transferred them, so no cache-hit/speedup claim follows. An explicit `Ññé ₱` probe loaded both Extended subsets, bringing font binaries to 95,116 bytes. These are local development-browser observations, not LAN/concurrency benchmarks.

Deliberately blocking font requests kept fallback text visible without page overflow. The interception was removed and normal font loading restored. These were browser-only font failures, not modified API data or application configuration. [Primary loading/fallback measurements](../../output/typography-primary-20261025/font-loading.json), [fallback capture](../../output/playwright/typography-primary/font-fallback-1440.png).

## Primary screens, accessibility and native zoom

Existing synthetic **Staff and Coordinator** authenticated normally without account/password/role changes. Each reviewed **Dashboard, Registry, Add Scholar, Admission review, document policies, Masterlists, Payroll, Payment Recording, reconciliation, Individual Payments, Graduation Monitoring, Reports, financial reports, Configuration and My access** at **1440/1024/820/375/320 CSS pixels**, height 900.

All reviewed pages passed no-page-horizontal-overflow checks. Names and exact IDs remain available; tables scroll locally. Form labels, buttons, financial figures and badges fit. Headings resolve to Manrope; body/control/badge text resolves to DM Sans. Existing important sizes remain, including Registry headings **25.6 px** and Dashboard heading **26.4 px**. Empty or role-limited screens retain their actual state; no example was created to fill a coverage gap.

Both roles passed School → Course keyboard order, native required-field validation, registration Cancel returning to Add Scholar, **3-pixel** payment/pencil focus and horizontal focus scrolling. Export dialogs fit all five widths, use the correct fonts, close with Escape and restore their triggers. The existing payment-date form displayed **2026-10-24** and was cancelled. No financial confirmation or business save was submitted.

| Width | Staff Registry | Coordinator Payment Recording |
|---|---|---|
| 1440 | [Staff](../../output/playwright/typography-primary/staff-after-registry-1440.png) | [Coordinator](../../output/playwright/typography-primary/coordinator-after-recording-1440.png) |
| 1024 | [Staff](../../output/playwright/typography-primary/staff-after-registry-1024.png) | [Coordinator](../../output/playwright/typography-primary/coordinator-after-recording-1024.png) |
| 820 | [Staff](../../output/playwright/typography-primary/staff-after-registry-820.png) | [Coordinator](../../output/playwright/typography-primary/coordinator-after-recording-820.png) |
| 375 | [Staff](../../output/playwright/typography-primary/staff-after-registry-375.png) | [Coordinator](../../output/playwright/typography-primary/coordinator-after-recording-375.png) |
| 320 | [Staff](../../output/playwright/typography-primary/staff-after-registry-320.png) | [Coordinator](../../output/playwright/typography-primary/coordinator-after-recording-320.png) |

Additional primary captures: [Dashboard](../../output/playwright/typography-primary/coordinator-after-dashboard-1440.png), [Add Scholar](../../output/playwright/typography-primary/staff-after-registration-320.png), [Masterlists](../../output/playwright/typography-primary/coordinator-after-masterlists-1024.png), [Graduation](../../output/playwright/typography-primary/coordinator-after-graduation-820.png), [financial report](../../output/playwright/typography-primary/coordinator-after-financial-report-1440.png), [dialog](../../output/playwright/typography-primary/staff-dialog-320.png). The account banner is masked. The accepted isolated report retains the matched before/after evidence; primary was not reverted for screenshots.

**Native 200% zoom was verified in a normal Chrome window**, in a task-only persistent profile with **viewport emulation disabled**. Chrome's actual Page zoom control was used. At 100%, the native content viewport was **1424×849**, DPR **1**; at 200%, **712×424**, DPR **2**, with browser window **1440×1000**. The focused Staff review covered Dashboard, Registry, Add Scholar, Export dialog and payment-table keyboard focus. No page overflow occurred; the dialog stayed within the viewport and restored focus, and the date pencil remained reachable through local scrolling with a 3-pixel CSS outline.

[Native zoom results](../../output/typography-primary-20261025/native-zoom-review.json), [200% Dashboard](../../output/playwright/typography-primary/native-200-dashboard.png), [200% dialog](../../output/playwright/typography-primary/native-200-dialog.png), [200% payment focus](../../output/playwright/typography-primary/native-200-payment-focus.png). Final native captures use the browser's rendered view, without image resizing. Zoom was restored to **100%**, task sessions signed out and task browser windows closed. The user's separate browser profile/session was not changed. This focused review is not full assistive-technology/WCAG certification.

[Coordinator screens](../../output/typography-primary-20261025/coordinator-review.json), [Coordinator controls](../../output/typography-primary-20261025/coordinator-controls.json), [Staff screens](../../output/typography-primary-20261025/staff-review.json), [Staff controls](../../output/typography-primary-20261025/staff-controls.json). Playwright was used. Browser guards recorded **zero attempted non-GET business requests**. No primary API response was simulated; only cancelled/local drafts and read requests were used.

## Tests and current-data preservation

All final commands exited **0** on the verified matching source. Mutating regressions provisioned **fresh owned disposable schemas**, never primary or retained candidates.

| Check | Result |
|---|---|
| `npm run lint`, `npm run typecheck` | No lint/type errors |
| `npm run build` | Complete normal build; accepted 294-file match |
| `npm test` | **118 files / 753 tests passed** |
| `npm run check:secrets` | Passed |
| Registry, Payment Recording, reconciliation, individual settlement, financial reports | **All five integration suites passed**, including financial guards, retry/atomicity, source distinctions and complete API/XLSX/PDF outputs |
| Primary recovery, source/asset loading, browser and inventory checks | Passed |

[Normal command exits](../../output/typography-primary-20261025/checks-main.json), [unit log](../../output/typography-primary-20261025/test-main.log), [five integration commands/exits](../../output/typography-primary-20261025/regressions-typography-primary/results.json). No validator, test limit or financial source pin was weakened or refreshed to satisfy checks.

Full fresh before/after comparison proves **all business table values/counts, schema objects, 66 migration rows, accounts/password hashes/roles, runtime grants and original audit rows exact**. This includes permanent IDs, registrations/classifications, supplied-text history, academic/standing evidence, original Excel/import sources/bindings, Masterlists, entitlements/allocations, frozen payroll sources, actual payments/dates and individual/closure evidence.

| Primary fact | Fresh before → after |
|---|---|
| Scholars / accounts | **1,000 / 14 → unchanged** |
| Intake roots / academic records | **1,000 / 1,000 → unchanged** |
| Entitlements / allocations | **1,000 / 1,000 → unchanged** |
| Every current payment record | **2 Paid → 2 Paid**, complete original evidence exact, both actual dates **2026-10-24** |
| PAY-001 | **2 Paid / 798 Pending**, `canRecord:true` |
| PAY-002 | **200 Pending**, `canRecord:true` |
| Import bindings | **0 → 0** |

Both full fresh payment previews accept **798 / 200**, with **zero conflicts**; neither was committed. All **10,404 existing audit rows** match. Only two login and two logout events were appended (**10,408 total**); sessions **28→30**, with ordinary revocation/last-seen/rate-limit activity. The native browser reused the task's Staff session rather than creating another account or login. This is qualified authentication activity, not zero database writes. [Preservation](../../output/typography-primary-20261025/preservation.json), [final financial reads](../../output/typography-primary-20261025/readiness-after.json).

## Issues, rollback and stop

Initial Playwright captures clipped at native zoom under viewport emulation. The final check used a separate normal Chrome window with no emulation and direct rendered-view captures. A temporary banner-redaction helper initially queried a hidden element with a visible-only locator; its correction affected only task automation. Neither issue changed accepted application bytes or business safeguards.

Existing narrow-table scrolling, native select clipping/platform rendering, glyph fallback outside the supplied subsets, technical monospace/PDF fonts, the Vite chunk-size warning and earlier unrelated payment-preview focus qualification remain. Full AT/WCAG and office/LAN acceptance are not claimed. No application repair was needed.

Rollback was not needed. Saved **66-compatible B2.5 CSS/client** is under `output/typography-primary-20261025/baseline/`; retained static/server artifacts remain exact. Any future presentation rollback must preserve later legitimate edits and coordinate CSS/client activation. No database restore, migration downgrade, history deletion or stale-data replacement is appropriate. The existing launch command remains `node scripts/localhost-5173-profile.mjs synthetic`.

**Stopped after typography promotion and verification.** Primary 5173 runs the accepted eight-file typography package. No backend/PDF-font change, schema/grant/permission/flag change, scholar/academic/financial operation, Dashboard graph/layout redesign, School/Course storage change, retained-environment restart, LAN/production operation or unrelated enhancement occurred.
