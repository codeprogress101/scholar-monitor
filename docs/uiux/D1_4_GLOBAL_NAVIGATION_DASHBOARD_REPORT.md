# D1.4 — Global navigation and Dashboard refinement

25 October 2026, Philippine time. **Completed and verified at [primary localhost:5173](http://127.0.0.1:5173/#dashboard). The global top bar is removed, Notifications remain upper-right, account/Sign Out are in the sidebar footer, and the Dashboard has four upper cards. Stopped after verification.**

This follows the direct-primary D1.4 authorization and uses the accepted [D1.3 primary](D1_3_PRIMARY_DASHBOARD_CONTENT_REFINEMENT_REPORT.md). No permanent candidate or new application database was created. No backend, schema, permission, authentication rule, notification business logic, financial flag or business record changed. Existing Pending Tasks selection/action behavior remains unchanged.

## Verified target and recovery

| Item | Fresh result |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP**, **127.0.0.1:3306** |
| Database | **`ldss_primary_test_12676_61497616`** |
| Restricted runtime | **`ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic**, **127.0.0.1:5173 / 3001** |
| Schema | **66 migrations**, SQL checksums and applied timestamps unchanged |
| Controller / API / Vite, before and after | **39004 / 50408 / 49416**, commands, ancestry and loopback ownership unchanged |

The protected D1.3 baseline and all nine accepted package hashes matched. Its intervening report and newer legitimate files were retained. A fresh file checkpoint covers **1,312 existing inputs**, including the unchanged root implementation-plan document used by the authentication/download regression. Current accounts, roles, scholars, academic/import/Masterlist records, grants, audits, frozen financial evidence and every payment/date were inventoried rather than assumed from the earlier report. [Preflight](../../output/d1-4-primary-20261025/preflight.json), [starting files](../../output/d1-4-primary-20261025/files-before.json), [starting financial reads](../../output/d1-4-primary-20261025/readiness-before.json).

Before source refinement, a fresh encrypted primary backup of **149 tables / 13,689,859 bytes** passed restoration into a newly owned isolated schema. Verification covered values/counts, definitions, indexes, foreign keys/checks, triggers, executable views and rejection probes. The temporary restore schema/account was removed. Primary remained running; the existing tool used source read locks. No backup was restored over primary. Existing backup limits remained unchanged; archives, credentials and keys remain restricted. [Verified recovery](../../output/d1-4-primary-20261025/recovery.json).

Temporary staging at `C:/xampp/htdocs/ldss_d14_primary_stage_20261025` held the actual dirty baseline and the tested presentation changes. It was not another served candidate. Exact final bytes were installed only after tests and recovery passed, with new controls published before their parent component. Existing Vite served the changes; **no primary or retained process restart was needed**. All **310 starting distribution files** remain exact, including older shared static-client/server assets. No `.env`, launcher, feature flag or retained environment was changed. [Build/source checks](../../output/d1-4-primary-20261025/build-verification.json), [activation](../../output/d1-4-primary-20261025/promoted-files.json), [delivery](../../output/d1-4-primary-20261025/delivery.json).

## Exact changes

| File | Final change |
|---|---|
| [src/App.tsx](../../src/App.tsx) | Remove the shared top-bar/breadcrumb markup; mount compact workspace controls and the sidebar account footer |
| [src/WorkspaceControls.tsx](../../src/WorkspaceControls.tsx) — new | Reuse the original NotificationBell and mobile-menu action; display the original account/roles and direct existing logout handler |
| [src/DashboardPage.tsx](../../src/DashboardPage.tsx) | Move the two existing review cards into the upper group; remove their lower wrapper; preserve their destinations/permissions |
| [src/styles.css](../../src/styles.css) | Append necessary shell/footer/main-spacing and four-card responsive rules after the exact D1.3 CSS prefix |
| [tests/workspace-controls.test.tsx](../../tests/workspace-controls.test.tsx) — new | Escaped full identity/combined roles, unassigned role, signing-out disabled state, notification count/zero/unavailable semantics and accessible mobile-menu controls |

There are **three existing-file changes and two additions**. **1,309 of 1,312 existing inputs remain byte-identical**, with none missing. The report and task-local evidence are additional deliverables. Every backend file and existing test remains exact. The existing `Notifications.tsx`, `AuthGate.tsx` and `auth-api.ts` are unchanged; App/Dashboard state, effects and handler bodies preceding presentation are exact. No dependency, route, query, business rule or new account menu was introduced. [Five-file SHA-256 inventory](../../output/d1-4-primary-20261025/candidate-files.json), [source comparison](../../output/d1-4-primary-20261025/source-preservation.json).

### Shared navigation

The full-width header, Workspace/current-page breadcrumbs, account block and top-bar Sign Out are removed in the shared App shell. Existing page titles, module tabs, contextual Back controls, sidebar logo/menu/icons and page-specific actions remain. Unused historical CSS is retained in the protected prefix; there is no rendered `.topbar` element.

A transparent compact control group keeps the original Notifications link upper-right and relocates the **existing mobile navigation button**. Normal document flow reserves the controls' actual height, so they do not cover headings, primary actions or dialogs. No floating overlay or full-width header surface is added. Main content starts higher: Dashboard title top changes **114→68 px** at 1440 and **131→62 px** at 375/320.

The sidebar footer retains the workspace/location identity, followed by the exact account display name, current role labels and Sign Out. Names/roles wrap without an ellipsis. Sidebar widths and its existing scrolling/mobile mechanism remain. Sign Out receives the original `onLogout` directly and preserves `signingOut`/disabled presentation; no authentication handler was replaced.

The Notifications resource is still created once by the existing App hook and passed into the unchanged NotificationBell. Its actual unread count, accessible name, destination, manual refresh, existing visibility/event/poll behavior and read/unread semantics remain. No new count hook, query, refresh event or polling interval is added. Both roles opened the existing notification interface without changing unread state. Read/unread mutation, personal ownership, role revocation and concurrent resolution were tested in the disposable notification suite, not by changing primary reads.

### Four-card Dashboard

Immediately after the unchanged period banner, the cards are **Total Scholars → Pending Tasks → Graduation Monitoring → Admission & Requirements**. They use four columns at 1440, two at 1024/820 and one at 375/320, without fixed card heights.

The two existing review cards retain their icons, short descriptions, one action each, permission conditions and selected-year/semester destinations. They appear only in this group. Pending Tasks retains the same R06 count and focus/scroll action to Needs attention. Payment Status remains **one compact full-width section immediately below all four cards**, followed by the unchanged classification/year-level charts, Needs attention/Quick Actions, Official Masterlists and collapsed detailed assessments.

Manrope/DM Sans, status meanings/colors, chart geometry and all data sources remain. Actual primary values are still **1,000 associated scholars; 250 New / 750 Continuing / 0 Unknown; year levels 250/250/250/200/50; 2 Staff / 4 Coordinator pending tasks; 2 Paid / 998 Pending / 0 Unclaimed / 0 Needs resolution**. No graduation or requirements totals were invented. Payment rows retain their effective Recording interpretation; On payroll and Masterlist membership do not become Paid.

## Browser, mobile and accessibility verification

Existing **Staff, Coordinator, System Administrator and unassigned** accounts authenticated through the ordinary flow. Account names/role labels matched actual session/access responses. Administrator/unassigned retained their existing navigation and operational-summary restrictions; no permission was inferred from placement of the controls.

Staff and Coordinator reviewed **Dashboard, Registry, Add Scholar, Admission Review, document policies, Masterlists, Payroll, Payment Recording, reconciliation, Individual Payments, Graduation Monitoring, Reports, financial reports, Configuration and My access** at **1440/1024/820/375/320 CSS pixels**, height 900. All 15 workspaces passed no-page-overflow and no-notification-overlap checks for both roles. Page headings, controls and local table scrolling remain. [Staff modules](../../output/d1-4-primary-20261025/modules-after-staff.json), [Coordinator modules](../../output/d1-4-primary-20261025/modules-after-coordinator.json).

Full Dashboard comparisons use the same primary data, role, period, settled content, default zoom and closed disclosures. Names are masked; role/Sign Out and notification controls remain visible where the sidebar is open. Before captures were taken before installation, without reverting primary later.

| Width | Staff before / after | Coordinator before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/d1-4-primary/staff-before-1440.png) / [After](../../output/playwright/d1-4-primary/staff-after-1440.png) | [Before](../../output/playwright/d1-4-primary/coordinator-before-1440.png) / [After](../../output/playwright/d1-4-primary/coordinator-after-1440.png) |
| 1024 | [Before](../../output/playwright/d1-4-primary/staff-before-1024.png) / [After](../../output/playwright/d1-4-primary/staff-after-1024.png) | [Before](../../output/playwright/d1-4-primary/coordinator-before-1024.png) / [After](../../output/playwright/d1-4-primary/coordinator-after-1024.png) |
| 820 | [Before](../../output/playwright/d1-4-primary/staff-before-820.png) / [After](../../output/playwright/d1-4-primary/staff-after-820.png) | [Before](../../output/playwright/d1-4-primary/coordinator-before-820.png) / [After](../../output/playwright/d1-4-primary/coordinator-after-820.png) |
| 375 | [Before](../../output/playwright/d1-4-primary/staff-before-375.png) / [After](../../output/playwright/d1-4-primary/staff-after-375.png) | [Before](../../output/playwright/d1-4-primary/coordinator-before-375.png) / [After](../../output/playwright/d1-4-primary/coordinator-after-375.png) |
| 320 | [Before](../../output/playwright/d1-4-primary/staff-before-320.png) / [After](../../output/playwright/d1-4-primary/staff-after-320.png) | [Before](../../output/playwright/d1-4-primary/coordinator-before-320.png) / [After](../../output/playwright/d1-4-primary/coordinator-after-320.png) |

Representative other-module comparisons: [Registry before](../../output/playwright/d1-4-primary/staff-before-registry-1440.png) / [after](../../output/playwright/d1-4-primary/staff-after-registry-1440.png), [Add Scholar before](../../output/playwright/d1-4-primary/coordinator-before-registration-320.png) / [after](../../output/playwright/d1-4-primary/coordinator-after-registration-320.png), [Payment Recording before](../../output/playwright/d1-4-primary/coordinator-before-recording-1440.png) / [after](../../output/playwright/d1-4-primary/coordinator-after-recording-1440.png), [Configuration before](../../output/playwright/d1-4-primary/coordinator-before-configuration-1024.png) / [after](../../output/playwright/d1-4-primary/coordinator-after-configuration-1024.png).

Both roles passed notification keyboard access/actual count parity, **3-pixel focus**, four-card ordering, absence of lower duplicate cards, payment placement, full cycle/source disclosures and period clearing/restoration. Graduation and Admission links retain context. All seven detailed assessment cards load only when requested. Existing actual-date forms were opened and cancelled. [Staff Dashboard](../../output/d1-4-primary-20261025/controls-staff.json), [Coordinator Dashboard](../../output/d1-4-primary-20261025/controls-coordinator.json).

At 375/320, the closed sidebar remains inert; the relocated menu button opens it, keyboard traversal reaches Sign Out, and Escape restores focus to the menu button. The account footer scrolls into view within the existing sidebar. Notifications remain unobscured when navigation is closed. [Staff shell](../../output/d1-4-primary-20261025/shell-staff.json), [Coordinator shell](../../output/d1-4-primary-20261025/shell-coordinator.json), [Staff mobile footer](../../output/playwright/d1-4-primary/staff-sidebar-320.png), [Coordinator mobile footer](../../output/playwright/d1-4-primary/coordinator-sidebar-320.png).

**All four test accounts signed out by keyboard through the mobile sidebar footer.** Their logout requests succeeded, the ordinary sign-in destination appeared and subsequent `auth/me` returned **401**. Only task sessions were revoked; the user's separate browser/session was untouched. [Staff logout](../../output/d1-4-primary-20261025/signout-staff.json), [Coordinator logout](../../output/d1-4-primary-20261025/signout-coordinator.json), [Administrator shell/logout](../../output/d1-4-primary-20261025/role-admin.json), [Administrator revocation](../../output/d1-4-primary-20261025/signout-admin.json), [unassigned shell](../../output/d1-4-primary-20261025/role-unassigned.json), [unassigned revocation](../../output/d1-4-primary-20261025/signout-unassigned.json).

Export dialogs fit all five widths and restore their triggers after Escape. Registration validation, School→Course order, Cancel focus, payment-table/pencil focus and existing correction cancellation pass. [Staff dialog/control checks](../../output/d1-4-primary-20261025/dialogs-staff.json), [Coordinator checks](../../output/d1-4-primary-20261025/dialogs-coordinator.json).

Focused **native 200% Chrome** passed in a task-only normal profile with viewport emulation disabled, **712×424 CSS pixels / DPR 2**. Four-card reflow, notification clearance, payment/charts, disclosures, Pending Tasks focus and keyboard access to the scrolling account footer passed without page overflow. Captures use the actual rendered browser view without resizing. Zoom was restored to 100% and task windows closed. [Native proof](../../output/d1-4-primary-20261025/native-zoom-review.json), [200% overview](../../output/playwright/d1-4-primary/native-200-overview.png), [200% sidebar footer](../../output/playwright/d1-4-primary/native-200-sidebar-account.png). The ui-ux-pro-max and Playwright workflows were used; full AT/WCAG certification is not claimed.

## Performance and complete validation

Matched before/after samples used actual primary Vite, the same role/data/period, **1440×900**, cache disabled, one warm-up and three sequential measured navigations. MutationObserver timestamps record rendered content, not HTML load or locator polling intervals. No builds/regressions ran concurrently; no assets or API data were simulated.

| Readiness | Before, ms | After, ms |
|---|---|---|
| Staff: top cards / Pending Tasks / full initial Dashboard | 542 / 536 / 521 | **592 / 582 / 591** |
| Staff: both scholarship charts | 456 / 439 / 438 | **507 / 504 / 515** |
| Coordinator: top cards / Pending Tasks / full initial Dashboard | 552 / 567 / 575 | **483 / 561 / 558** |
| Coordinator: both scholarship charts | 470 / 464 / 494 | **469 / 497 / 464** |

Full readiness also waits for payment/current lists. The Staff median increases about 55 ms; Coordinator's is slightly lower. These small local samples show no consistent material regression and do not establish a speedup or capacity guarantee. **10 API requests** remain, with identical measured body totals **9,399 Staff / 13,814 Coordinator bytes**. Notification count requests retain the same initial behavior; existing notification hooks/timers are byte-identical. No expensive detailed reader is requested on entry. [Measurements and layout metrics](../../output/d1-4-primary-20261025/performance.json).

Desktop full-page height falls **1,991→1,793 px** for both roles. In width order 1440/1024/820/375/320, Staff final heights are **1,793 / 2,348 / 2,545 / 3,527 / 3,859 px**; Coordinator **1,793 / 2,413 / 2,610 / 3,549 / 3,907 px**. Every matched Dashboard capture is shorter; cards use natural content/grid sizing.

Client assets change **1,464,092→1,465,850 bytes**, **+1,758**: JavaScript **+29**, CSS **+1,729**; observed CSS gzip **48,427→48,735 bytes**. Fonts and dependencies are unchanged. Frontend/readiness return 200 and all four local font binaries retain their hashes. [Bundle comparison](../../output/d1-4-primary-20261025/bundle-impact.json).

| Final command/check | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | All exit **0**, complete normal build |
| `npm test` | **123 files / 780 tests passed** |
| Authentication, notifications, RBAC, Dashboard, Registry, Payment Recording, reconciliation, individual settlement, financial reports | **All nine disposable integration suites exit 0** |
| Primary source/data/grant/recovery/browser checks | Passed |

Authentication covers all 15 existing scenarios, including session/logout security, disabled/expired accounts, rate limits and audit-failure rollback. Notifications retain personal read state, bounded pages, role/type/period scope, concurrent source resolution and revocation. Financial suites retain retry/atomicity, Original/current distinctions, source guards, R01–R07 and full API/XLSX/PDF checks. All mutations used new owned disposable schemas. No validator, permission, limit or financial source pin was weakened. [Final normal exits](../../output/d1-4-primary-20261025/checks-main.json), [unit log](../../output/d1-4-primary-20261025/test-final.log), [nine exact commands/exits](../../output/d1-4-primary-20261025/regressions-d-one-shell/results.json).

Initial staging omitted the existing root implementation-plan document, causing the authentication suite's download check to return 500. Copying that unchanged dependency into staging fixed the exact driver; all 15 scenarios then passed. The new test also needed Vite client types and a correctly typed resource stub. A mobile helper initially sampled inert state before React completed resize; settled-state checks passed. A restarted task-native browser needed its existing test cookie restored before the final footer check. These were staging/test-automation issues; no application security rule or business behavior was changed to satisfy them. Initial logs are retained.

## Primary preservation, limitations and stop

Full fresh comparison proves all business values/counts, schema objects, 66 journal rows, accounts/password hashes/roles, runtime grants and original audit rows exact. It includes IDs/registrations/classifications, academic/graduation/standing evidence, supplied text and imports/bindings, Masterlists, entitlements/allocations, frozen financial sources, every payment/date and individual/closure history. Notification business/read-state tables also remain exact.

| Fresh primary fact | Before → final |
|---|---|
| Scholars / application accounts | **1,000 / 14**, unchanged |
| Intake roots / academic records | **1,000 / 1,000**, unchanged |
| Entitlements / allocations | **1,000 / 1,000**, unchanged |
| Every payment record | **2 Paid → 2 Paid**, exact complete evidence; both actual dates **2026-10-24** |
| PAY-001 / PAY-002 | **2 Paid / 798 Pending** and **200 Pending**, both recordable |
| Import bindings / text events | **0 / 0**, unchanged |

The current payment inventory was freshly established. Full before/after previews include every finalized primary batch and accept **798 / 200**, zero conflicts; neither was committed. All **10,421 starting audit rows** match. Four task logins/four logouts were appended (**10,429 total**); sessions **38→42**, with ordinary revocation/last-seen/rate-limit activity. There were no experimental business-changing requests; normal authentication is explicitly qualified rather than called zero database writes. [Final preservation](../../output/d1-4-primary-20261025/preservation.json), [final financial reads](../../output/d1-4-primary-20261025/readiness-after.json).

Primary and retained listener owners are unchanged. Retained environments were not reset, migrated or used for mutations; this is not an exhaustive new inventory of every retained database. Saved 66-compatible D1.3 source/build inputs remain under `output/d1-4-primary-20261025/baseline/` and in the [accepted D1.3 build](../../output/d1-3-primary-20261025/compatible-build.zip). Any future presentation rollback must preserve later legitimate source edits; no database restore, downgrade or history deletion is appropriate.

Review artifacts: [five-file hashes](../../output/d1-4-primary-20261025/candidate-files.json), [review patch](../../output/d1-4-primary-20261025/D1_4_PRIMARY.patch), [source archive](../../output/d1-4-primary-20261025/candidate-source.zip), [compatible build](../../output/d1-4-primary-20261025/compatible-build.zip). Patch checking against the actual dirty starting workspace and an independent byte-exact apply round trip passed. Archives exclude credentials, keys, `.env`, fixtures and server PDF/template assets.

Remaining issues: **the reported Pending Tasks concern about entries with no obvious next action is deliberately deferred**. Its task selection, scope, destinations and business logic were not corrected or hidden. Costly detailed assessments remain optional. Narrow pages retain ordinary vertical scrolling and destination tables retain local scrolling. The existing Vite chunk warning remains; native platform differences, full AT/WCAG and office/LAN acceptance are not certified.

**Stopped after D1.4 implementation, verification and reporting.** No Pending Tasks business-logic correction, Scholar Profile simplification, financial/academic policy change, School/Course storage change, new workflow authority, rollover, other-module redesign, retained-environment restart, LAN or production operation occurred.
