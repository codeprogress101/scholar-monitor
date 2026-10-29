# D1.5 — Global navigation visual polish

25 October 2026, Philippine time. **Completed and verified at [primary localhost:5173](http://127.0.0.1:5173/#dashboard). Notifications now use a circular bell, the sidebar account footer is compact, and the reserved control row above page content is removed. Stopped after verification.**

This follows the direct-primary D1.5 authorization and preserves the accepted [D1.4 Dashboard](D1_4_GLOBAL_NAVIGATION_DASHBOARD_REPORT.md). No permanent candidate was created. No backend, schema, permission, authentication rule, notification resource behavior, financial flag or business record changed.

## Target, recovery and installation

| Item | Fresh verification |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Database | **`ldss_primary_test_12676_61497616`** |
| Restricted runtime | **`ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic / 127.0.0.1:5173 / 3001** |
| Schema | **66 migrations**, all SQL checksums and applied timestamps unchanged |
| Controller / API / Vite, before and after | **39004 / 50408 / 49416**, ancestry, commands and loopback ownership unchanged |

The accepted D1.4 package and protected baseline matched. A fresh checkpoint retained **1,315 existing inputs**, including intervening reports and the existing implementation-plan download dependency. The actual dirty workspace supplied temporary staging; Git HEAD was not substituted. Current business, account, role, grant, audit, frozen-source and every payment/date were inventoried before editing. [Preflight](../../output/d1-5-primary-20261025/preflight.json), [starting files](../../output/d1-5-primary-20261025/files-before.json), [starting financial reads](../../output/d1-5-primary-20261025/readiness-before.json).

Before source edits, a fresh encrypted checkpoint of **149 tables / 13,690,981 bytes** passed restoration into a newly owned isolated schema. Verification covered values/counts, definitions, indexes, foreign keys/checks, triggers, executable views and rejection probes. The temporary schema/account was removed. Primary remained running while the existing backup tool used source read locks. Existing backup limits remained unchanged; credentials, key and archive contents remain restricted. Nothing was restored over primary. [Recovery proof](../../output/d1-5-primary-20261025/recovery.json).

Temporary staging at `C:/xampp/htdocs/ldss_d15_primary_stage_20261025` held the tested changes. After normal checks, disposable regressions, staged-client layout review and recovery verification, the four reviewed files were installed as exact bytes. Existing Vite activated them; **no primary or retained process restart was needed**. All **310 starting distribution files** remain exact, preserving shared static-client/server artifacts for retained environments. The new compatible build is archived separately. No candidate data, sessions or credentials were transferred. [Build/source boundary](../../output/d1-5-primary-20261025/build-verification.json), [installed hashes](../../output/d1-5-primary-20261025/promoted-files.json), [delivery](../../output/d1-5-primary-20261025/delivery.json).

## Exact presentation changes

| File | Change |
|---|---|
| [src/Notifications.tsx](../../src/Notifications.tsx) | Only `NotificationBell` presentation: circular icon, conditional unread badge, full-count accessible name/title |
| [src/WorkspaceControls.tsx](../../src/WorkspaceControls.tsx) | Existing sidebar account becomes avatar, wrapping identity/roles and one icon-only Sign out action |
| [src/styles.css](../../src/styles.css) | Append shared control placement, heading/task-tab clearance, badge and account-footer styling after the exact D1.4 prefix |
| [tests/workspace-controls.test.tsx](../../tests/workspace-controls.test.tsx) | Extend existing tests for zero/positive/capped counts, loading/unavailable, full identity, tooltip, roles and disabled state |

**Four existing files changed; 1,311 of 1,315 existing inputs remain byte-identical**, with none missing. This report and task evidence are additions. `App.tsx`, `DashboardPage.tsx`, all backend files, every other existing test, dependencies, fonts, launchers, `.env`, permissions and flags remain exact. Notifications resource hooks and page logic before/after the Bell function are byte-identical. The original `onLogout` is still passed directly to the button with the same `signingOut` disabled condition. [Four-file SHA-256 inventory](../../output/d1-5-primary-20261025/candidate-files.json), [source preservation](../../output/d1-5-primary-20261025/source-preservation.json).

### Notifications

The original link to `#notifications` is now a **44×44 CSS-pixel** dark neutral circle with a white Lucide bell. A red upper-right badge is hidden at zero, displays exact counts 1–99 and displays **99+** above 99. The accessible name and native title retain the full count. Loading and unavailable have separate neutral indicators and honest accessible wording; neither becomes zero. Decorative icon/badge text is hidden from the accessibility tree to avoid repeating the link name.

Actual primary reads showed **12 unread for Staff** and **1,020 for Coordinator**. The Coordinator screenshot therefore displays a real **99+**, with **“Notifications: 1020 unread”** retained accessibly. No screenshot count was hardcoded or API response substituted. Opening the existing notification interface preserved both counts and read-state tables. Count source, authorization, visibility/event listeners, polling interval, retry behavior and manual refresh are unchanged; no additional hook/request was introduced.

Zero, one, several, 99/100 and larger counts, loading, unavailable and stale-count error behavior passed focused component tests. A separately labelled, static [presentation fixture](../../output/playwright/d1-5-primary/isolated-count-and-long-account-fixture.png) also verifies count rendering and long fictional identities; it sends no API requests and is not primary data. [Fixture results](../../output/d1-5-primary-20261025/component-review.json).

### Account footer and top spacing

The sidebar footer uses a small circular user icon, complete actual account name and role labels, with a compact logout icon on the right. **“Sign out”** is both its native title and accessible name. Long names and multiple roles wrap; signing-out text remains available and the existing disabled state remains. Municipality of Daet/location stays in its separate block above the account. No account menu or authentication handler was added.

The shared control container no longer reserves a full document-flow row. The bell aligns with the upper page-heading area; workspaces with task tabs first use that existing row. CSS reserves space for the bell and mobile navigation control, allowing existing titles/actions/tabs to wrap without overlap. Lower page content retains its existing width. The controls are not fixed to the viewport and do not introduce a full-width header surface.

Dashboard heading tops, at 1440/1024/820/375/320 widths, change **68/68/66/62/62 → 18/18/18/14/14 CSS pixels**. Desktop/tablet page heights fall by **48–50 px**. Narrow Dashboard page heights remain unchanged because the heading/action area reflows while preserving control labels. A universal page-height reduction is not claimed.

The D1.4 Dashboard component is byte-identical: four upper cards, one compact Payment Status section, classification/year-level charts, Pending Tasks behavior, Quick Actions, Official Masterlists and optional detailed assessments retain their content and order. No task-accuracy fix or new statistic was introduced.

## Browser, responsive and accessibility checks

Staff and Coordinator reviewed **Dashboard, Registry, Add Scholar, Admission Review, document policies, Masterlists, Payroll, Payment Recording, reconciliation, Individual Payments, Graduation Monitoring, Reports, financial reports, Configuration and My access** at **1440/1024/820/375/320 CSS pixels**, height 900. All passed no-page-overflow and no-bell/heading/action-overlap checks. Additional Notifications, guide, implementation-plan and status views passed all five widths. Existing titles, Refresh actions, tabs and local table scrolling remain. [Staff modules](../../output/d1-5-primary-20261025/modules-after-staff.json), [Coordinator modules](../../output/d1-5-primary-20261025/modules-after-coordinator.json), [additional shared pages](../../output/d1-5-primary-20261025/shared-pages.json).

Matched primary images use the same role, records, selected period, settled content, default zoom and closed disclosures. Account names are masked. Before images were taken before installation; primary was not reverted for screenshots.

| Width | Staff before / after | Coordinator before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/d1-5-primary/staff-before-1440.png) / [After](../../output/playwright/d1-5-primary/staff-after-1440.png) | [Before](../../output/playwright/d1-5-primary/coordinator-before-1440.png) / [After](../../output/playwright/d1-5-primary/coordinator-after-1440.png) |
| 1024 | [Before](../../output/playwright/d1-5-primary/staff-before-1024.png) / [After](../../output/playwright/d1-5-primary/staff-after-1024.png) | [Before](../../output/playwright/d1-5-primary/coordinator-before-1024.png) / [After](../../output/playwright/d1-5-primary/coordinator-after-1024.png) |
| 820 | [Before](../../output/playwright/d1-5-primary/staff-before-820.png) / [After](../../output/playwright/d1-5-primary/staff-after-820.png) | [Before](../../output/playwright/d1-5-primary/coordinator-before-820.png) / [After](../../output/playwright/d1-5-primary/coordinator-after-820.png) |
| 375 | [Before](../../output/playwright/d1-5-primary/staff-before-375.png) / [After](../../output/playwright/d1-5-primary/staff-after-375.png) | [Before](../../output/playwright/d1-5-primary/coordinator-before-375.png) / [After](../../output/playwright/d1-5-primary/coordinator-after-375.png) |
| 320 | [Before](../../output/playwright/d1-5-primary/staff-before-320.png) / [After](../../output/playwright/d1-5-primary/staff-after-320.png) | [Before](../../output/playwright/d1-5-primary/coordinator-before-320.png) / [After](../../output/playwright/d1-5-primary/coordinator-after-320.png) |

Other matched views: [Registry before](../../output/playwright/d1-5-primary/staff-before-registry-1440.png) / [after](../../output/playwright/d1-5-primary/staff-after-registry-1440.png), [Add Scholar before](../../output/playwright/d1-5-primary/coordinator-before-registration-320.png) / [after](../../output/playwright/d1-5-primary/coordinator-after-registration-320.png), [Recording before](../../output/playwright/d1-5-primary/coordinator-before-recording-1440.png) / [after](../../output/playwright/d1-5-primary/coordinator-after-recording-1440.png). Mobile footers: [Staff](../../output/playwright/d1-5-primary/staff-sidebar-320.png), [Coordinator](../../output/playwright/d1-5-primary/coordinator-sidebar-320.png).

Both roles passed bell keyboard access, actual-count parity, **3-pixel focus**, notification opening, mobile inert-sidebar behavior, menu/Escape focus restoration and keyboard access to the scrolling footer. System Administrator and unassigned accounts retained exact identity/role displays, My access navigation and existing operational restrictions. All four accounts **signed out by keyboard through the mobile footer**: logout returned 204 and subsequent `auth/me` returned 401. Only task sessions were revoked; the user's separate session/profile was untouched. [Staff shell](../../output/d1-5-primary-20261025/shell-staff.json), [Coordinator shell](../../output/d1-5-primary-20261025/shell-coordinator.json), [Administrator](../../output/d1-5-primary-20261025/role-admin.json), [unassigned](../../output/d1-5-primary-20261025/role-unassigned.json), [Staff logout](../../output/d1-5-primary-20261025/signout-staff.json), [Coordinator logout](../../output/d1-5-primary-20261025/signout-coordinator.json), [Administrator revocation](../../output/d1-5-primary-20261025/signout-admin.json), [unassigned revocation](../../output/d1-5-primary-20261025/signout-unassigned.json).

Export dialogs fit all five widths and restore focus after Escape. School→Course order, required validation and registration Cancel focus remain. Payment tables/badges and date-pencil focus pass; actual-date forms were cancelled without saving. Dashboard counts, selected-period destinations, disclosures, pending-list focus and seven optional assessment cards remain. Browser guards recorded **zero attempted non-GET business requests**. [Staff controls](../../output/d1-5-primary-20261025/controls-staff.json), [Coordinator controls](../../output/d1-5-primary-20261025/controls-coordinator.json), [Staff dialogs](../../output/d1-5-primary-20261025/dialogs-staff.json), [Coordinator dialogs](../../output/d1-5-primary-20261025/dialogs-coordinator.json).

Focused **native 200% Chrome** passed with viewport emulation disabled: **712×424 CSS pixels / DPR 2**. Bell clearance, overview, payment/charts, disclosures, pending-list focus and keyboard access to the sidebar footer passed without page overflow. Captures use the actual rendered view without resizing. Zoom returned to 100%; all task windows closed. [Native proof](../../output/d1-5-primary-20261025/native-zoom-review.json), [200% overview](../../output/playwright/d1-5-primary/native-200-overview.png), [200% footer focus](../../output/playwright/d1-5-primary/native-200-sidebar-account.png). White bell/background contrast is **11.87:1**; unread badge text is **6.51:1**. [Contrast calculations](../../output/d1-5-primary-20261025/contrast.json). The ui-ux-pro-max and Playwright workflows were used; full assistive-technology/WCAG certification is not claimed.

## Performance and tests

Matched actual-primary Vite observations used the same role/data/period, **1440×900**, cache disabled, one warm-up and three sequential measured navigations. MutationObserver timestamps record rendered readiness. No builds/regressions ran during samples. Final checks used real primary assets/API, without response simulation.

| Readiness | Before, ms | After, ms |
|---|---|---|
| Staff: cards / Pending Tasks / full initial Dashboard | 554 / 554 / 547 | **592 / 630 / 651** |
| Staff: both scholarship charts | 471 / 466 / 456 | **574 / 565 / 564** |
| Coordinator: cards / Pending Tasks / full initial Dashboard | 542 / 557 / 536 | **720 / 579 / 608** |
| Coordinator: both scholarship charts | 466 / 485 / 463 | **637 / 507 / 515** |

Full readiness includes payment/current lists. Median full readiness increases **76 ms Staff / 66 ms Coordinator**; the isolated 720 ms after observation is retained. Default loading remains below one second in these samples, with **10 API requests** and unchanged body totals **9,399 / 13,814 bytes**. No new query, polling or expensive initial reader exists. This small local increase is not treated as a speedup or proof of zero performance cost; cold-start, concurrency and LAN capacity are unverified. [Complete samples and layout metrics](../../output/d1-5-primary-20261025/performance.json).

Client assets change **1,465,850→1,470,380 bytes**, **+4,530**: JavaScript **+912**, CSS **+3,618**; observed CSS gzip **48,735→49,300**. Existing fonts/dependencies are unchanged. [Bundle comparison](../../output/d1-5-primary-20261025/bundle-impact.json).

| Final validation | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | All exit **0**, complete normal build |
| `npm test` | **123 files / 786 tests passed** |
| Authentication, notifications, RBAC, Dashboard, Registry, Recording, reconciliation, individual settlement, financial reports | **All nine final disposable integration results exit 0** |
| Primary recovery, source/grant/data, browser and delivery checks | Passed |

Authentication retains all 15 scenarios, including logout/session security and audit rollback. Notifications retain personal read state, bounded scope, concurrent resolution and role revocation. Financial drivers retain retry/atomicity, Original/current distinctions, source guards, R01–R07 and full API/XLSX/PDF outputs. Mutations used new owned disposable databases. No guard, test bound or validator changed. [Normal commands](../../output/d1-5-primary-20261025/checks-main.json), [unit log](../../output/d1-5-primary-20261025/test-final.log), [nine final commands/exits](../../output/d1-5-primary-20261025/regressions-final.json).

The first financial-report run passed its report output checks but failed the existing final `paidIdentity` fixture postcondition. The unchanged driver passed on a fresh owned repeat; both original failure and repeat are retained. No financial source or test was edited. [Initial results](../../output/d1-5-primary-20261025/regressions-d-one-nav-polish/results.json), [repeat](../../output/d1-5-primary-20261025/regressions-d-one-nav-polish-report-repeat/results.json).

## Preservation, recovery and stop

Fresh final comparison proves every business table/value/count, schema object, all 66 migration rows, accounts/password hashes/roles, runtime grants and original audit rows exact. This includes permanent IDs, annual registrations/classifications, academic/graduation/standing evidence, supplied-text/import histories, Masterlists, entitlements/allocations, frozen financial sources, every payment/date, individual/closure evidence and notification business/read-state tables.

| Fresh primary fact | Before → after |
|---|---|
| Scholars / accounts | **1,000 / 14**, unchanged |
| Intake roots / academic records | **1,000 / 1,000**, unchanged |
| Entitlements / allocations | **1,000 / 1,000**, unchanged |
| Every payment record | **2 Paid → 2 Paid**, exact complete evidence; both dates **2026-10-24** |
| PAY-001 / PAY-002 | **2 Paid / 798 Pending** and **200 Pending**, both recordable |
| Import bindings / supplied-text events | **0 / 0**, unchanged |

These current counts were freshly established. Full previews for every finalized batch accept **798 / 200**, zero conflicts; none was committed. All **10,429 starting audit rows** remain exact. Four task logins/four logouts added eight authentication events (**10,437 total**); sessions **42→46**, with ordinary revocation/last-seen/rate-limit activity. This is qualified authentication activity, not zero database writes. [Final preservation](../../output/d1-5-primary-20261025/preservation.json), [final financial reads](../../output/d1-5-primary-20261025/readiness-after.json).

Primary and retained listener owners through 3025 remain unchanged. No retained environment was reset, migrated or used for mutations; this is not an exhaustive new inventory of every retained database. Frontend/readiness return 200; served font hashes remain exact.

Review artifacts: [four-file hashes](../../output/d1-5-primary-20261025/candidate-files.json), [patch](../../output/d1-5-primary-20261025/D1_5_PRIMARY.patch), [source archive](../../output/d1-5-primary-20261025/candidate-source.zip), [compatible build](../../output/d1-5-primary-20261025/compatible-build.zip). Patch checking and an independent byte-exact apply round trip passed against the saved actual dirty baseline. Archives exclude credentials, keys, `.env`, fixtures and server PDF/template assets. Saved 66-compatible D1.4 inputs remain under `output/d1-5-primary-20261025/baseline/`; the [D1.4 compatible build](../../output/d1-4-primary-20261025/compatible-build.zip) remains available. Rollback was not needed; future presentation rollback must preserve later legitimate edits, without database restoration, downgrade or history deletion.

Staged review caught a mobile task-tab collision, corrected in shared CSS before activation. A geometry helper initially treated a padded heading's full box as visible text; final overlap checks use rendered heading text. Preview automation also needed fresh asset mappings after a rebuild. Task-only rendering helpers needed their correct import path/JSX runtime and explicit Unicode encoding. These did not change application handlers or safeguards. Browser guards expected signed-out 401s; task windows and sessions are closed.

Remaining limits: native tooltip/platform rendering, ordinary narrow-screen vertical scrolling and destination-table scrolling remain. The existing Vite chunk warning remains. Pending Tasks accuracy, Scholar Profile cleanup, full AT/WCAG, cold-start/max-load and office/LAN acceptance are outside this task.

**Stopped after D1.5 implementation, verification and reporting.** No Pending Tasks fix, Scholar Profile cleanup, rollover, Dashboard content change, new business authority, financial/academic rule, schema/flag change, retained-environment restart or LAN/production operation occurred.
