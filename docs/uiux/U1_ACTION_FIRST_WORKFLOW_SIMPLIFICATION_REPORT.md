# U1 — Action-first workflow simplification

26 October 2026, Philippine time. **Completed and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/). Stopped after U1 verification and reporting.** Pending work now explains its next action; Registry, all five Scholar Profile tabs and Payroll use a compact action-first presentation. This follows the explicit U1 authorization and preserves the accepted [D1.5 baseline](D1_5_GLOBAL_NAVIGATION_VISUAL_POLISH_REPORT.md). No permanent candidate or operational LAN environment was created.

## Target, recovery and activation

| Item | Verified target |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Database | **`ldss_primary_test_12676_61497616`** |
| Restricted runtime | **`ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic / 127.0.0.1:5173 / 3001** |
| Schema | **66 migrations**, original SQL/checksums/applied timestamps preserved |
| Before controller / API / Vite | **39004 / 50408 / 49416** |
| Activated controller / API / Vite | **47348 / 52532 / 42356** |

The actual dirty source supplied the baseline, including intervening legitimate files. A fresh checkpoint protects **1,316 existing inputs**. Accounts, roles, scholars, annual/academic/import/Masterlist evidence, grants, audits, frozen sources and every payment/date were freshly inventoried. Git HEAD and older payment totals were not substituted for current state. [Preflight](../../output/u1-workflows-primary-20261026/preflight.json), [starting files](../../output/u1-workflows-primary-20261026/files-before.json), [starting financial reads](../../output/u1-workflows-primary-20261026/readiness-before.json).

Before editing primary source, a fresh encrypted checkpoint passed a new owned isolated restore. Another current checkpoint passed a second isolated restore with primary ports quiet before installation. Each covered **149 tables**, data, definitions, indexes, foreign keys/checks, triggers, executable views and rejection probes. Encrypted sizes were **13,691,854 / 13,691,997 bytes**. Temporary restore schemas/accounts were removed. Existing **64 MiB SQL / 96 MiB archive / 100,000 rows per table** bounds remain; archives, credentials and keys remain restricted. Nothing was restored over primary. [Initial recovery](../../output/u1-workflows-primary-20261026/recovery.json), [activation recovery](../../output/u1-workflows-primary-20261026/activation-recovery.json).

Temporary staging at `C:/xampp/htdocs/ldss_u1_primary_stage_20261026` held the combined source and complete normal build. A temporary GET/HEAD-only preview exercised that actual staged API/client with the verified restricted primary runtime; no command endpoint was available there. It was stopped after review. Only the reverified primary controller tree was stopped for coordinated API/frontend activation through the unchanged launcher. A later DOM-only correction moved the existing payment action links outside the provenance disclosure; normal checks/build and final browser acceptance were repeated before atomically updating that one file. No second API restart was needed.

All **310 starting distribution files** remain exact for retained older servers. The new compatible build is archived separately; primary uses current TypeScript API and Vite source. No `.env`, launcher, dependency, font, schema, grant, permission or financial flag changed. Retained listeners through 3025 retain their original owners. [Maintenance](../../output/u1-workflows-primary-20261026/maintenance.json), [build verification](../../output/u1-workflows-primary-20261026/build-verification.json), [installed hashes](../../output/u1-workflows-primary-20261026/promoted-files.json).

## Pending Tasks: cause and supported correction

The named examples were investigated independently of their titles:

| Entry | Actual unfinished workflow | Correction |
|---|---|---|
| Synthetic official prior payroll 1 / 2 | These are **published Masterlists**, not payments. Existing `masterlists.lock` authority and the existing transition allow a Coordinator to lock them. The parent page previously suppressed the workflow for every published list, hiding its existing Lock control. | Expose the existing locking workflow in a compact disclosure, retain its permission/confirmation checks, and preserve the `workflow=1` destination hint during URL normalization. |
| PAY-002 — Previously approved payroll batch 2 | Processed numbered payroll with **200 missing payment outcomes**. Processed does not mean Paid. | Explain the outstanding recording work and open its existing Payment Recording destination. |
| PAY-001 | Processed numbered payroll with **798 missing outcomes**. | Open its existing Recording or reconciliation destination according to the existing pending permission. |

Both Masterlist confirmation dialogs were cancelled. No list was locked and no payment was recorded. Staff still has **2** genuine tasks; Coordinator has **4**. Counts were not reduced cosmetically. No title filter, invented state or additional authority was introduced. [Original inspection](../../output/u1-workflows-primary-20261026/pending-inspection-before.json), [independent parity/profile](../../output/u1-workflows-primary-20261026/pending-profile.json).

R06 source selection, ownership, counts and ordering remain exact. `server/notifications/sources.ts` is unchanged. Only bounded selected-item details gain a numbered-payroll `EXISTS` flag, a concise next-action label and destination metadata. Count/key/group projections do not gain that flag. No new round trip, endpoint, polling or authorization cache exists. Ordinary notification history retains its original meaning; the D1.5 bell and notification resource hooks are exact. Dashboard changes are limited to the task-row explanation, preserving its accepted layout, cards, charts and loading behavior.

## Registry and complete Scholar Profile

Registry keeps the working year, name/permanent-ID search, scholar status, Add Scholar and relevant actions prominent. Secondary filters, file/document tools and guidance share compact disclosures. Excel import/export, verification, historical/All Years views, Continuing Roster and Graduation Monitoring retain their existing destinations and permissions.

The profile leads with the scholar's name, permanent ID and early tab navigation. A shared selected-year facts component shows classification, supported school/course/year level and actual standing. Missing/provisional placement is labelled honestly; another year's academic record cannot supply the selected year's facts. Course pending remains distinct from missing year level. **Active, Selected and On payroll do not mean Paid.**

| Profile area | Final presentation and retained actions |
|---|---|
| Overview | Essential facts, actual requirements/academic/payout assessment and current action first; personal/contact information is secondary. |
| Annual registration and supplied facts | Original registration, completion/correction, source/history and recovery components remain accessible in an Overview disclosure. Exact wording, NULLs, revisions and authority remain separate from verified academic placement. |
| Documents | Requirements and their existing receiving/review controls focus on document work, without repeated annual/academic introductions. |
| Academic records | Current evidence, blockers and authorized controls stay available; technical context/revisions move into help. |
| Scholarship | Existing qualification, standing and scholarship actions retain their guards; source explanation becomes contextual help. |
| History | Original chronology, source records, paging and permissions remain; repeated introductory prose is compacted. |

Disclosure containers keep command/recovery components mounted. Pending keys, exact retries and save restrictions remain; profile navigation remains disabled during saves. No import, registration, academic or financial writer changed. Scoped wrapping also corrects the observed pre-existing narrow Academic/Scholarship/History overflow.

## Payroll and opened batch

Period and batch selection now precede secondary administration. Essential year/semester, cycle state and **passed-target warning** remain visible; semester/window/setup information stays accessible below the working area.

An opened batch leads with compact Back to batches, name/status, saved scholar count, visible authorized **Record payments / Review payments**, and official payroll/download actions. Its saved roster is a searchable **25-row paginated table**, retaining exact permanent IDs and frozen assessments. It uses the existing bounded reader; no live eligibility substitution or new bulk scholar fetch occurs.

Secondary sections group **Payments & Treasury**, **Changes & deferrals**, and **History & sources**. Existing reconciliation, corrections, amendments, deferrals, payment history, Treasury evidence and validation remain available. Mounted hidden sections preserve loaded forms and retry state; existing lazy evidence readers remain lazy. Payment Recording, reconciliation/correction components, finalization, entitlements and financial backend writers are unchanged.

## Exact source boundary

**19 files: 16 existing changes and three additions.** The full path/hash inventory is authoritative; helpers and generated artifacts are recorded separately.

| Files | Change |
|---|---|
| `server/notifications/queries.ts`, `service.ts`; new `pending-action.ts` | Bounded pending-item action metadata and existing destinations; selection/authority unchanged |
| `src/Notifications.tsx`, `DashboardPage.tsx`, `MasterlistsPage.tsx` | Explain next work, route to it, expose existing authorized published-list locking workflow |
| `src/ScholarsPage.tsx`; new `ScholarProfileFacts.tsx` | Compact Registry/profile shell and honest selected-year facts |
| `src/AnnualIntakePanel.tsx`, `AcademicPanel.tsx`, `QualificationPanel.tsx`, `ScholarTimeline.tsx` | Concise subject-specific context and accessible detailed evidence |
| `src/PayoutCyclesPage.tsx`, `OvrDrafts.tsx`, `PayrollDetailBoundary.tsx`, `PayrollPagedDetails.tsx` | Action-first batch layout, grouped evidence, bounded saved-roster table |
| `src/styles.css` | Scoped compact layout, wrapping, table and focus rules after the exact D1.5 CSS prefix |
| `scripts/test-notification-parity.ts`; new `tests/workflow-action-first.test.tsx` | Independent legacy-source parity and new action/facts/presentation contracts |

`App.tsx`, `WorkspaceControls.tsx`, all migrations, role mappings, backend business writers and financial source builders remain exact. [19-file hashes](../../output/u1-workflows-primary-20261026/candidate-files.json), [source boundary](../../output/u1-workflows-primary-20261026/source-preservation.json), [patch](../../output/u1-workflows-primary-20261026/U1_PRIMARY.patch), [source archive](../../output/u1-workflows-primary-20261026/candidate-source.zip), [compatible build](../../output/u1-workflows-primary-20261026/compatible-build.zip). The patch check and independent exact-byte apply round trip use the saved actual dirty D1.5 baseline. Archives exclude `.env`, credentials, keys, fixtures and server PDF/template assets.

## Screenshots, layout and accessibility

Staff and Coordinator passed **1440/1024/820/375/320 CSS pixels**, height 900, on Pending Tasks, Registry, all five profile tabs, batch list and opened batch. Final screens have no page-level horizontal overflow; narrow data tables scroll locally. Images use the same primary people, role, period, settled records, default zoom and closed secondary disclosures. Account footer names are masked. Before images were captured before activation; primary was not reverted for pictures.

| Width | Staff Registry: before / after | Coordinator opened Payroll: before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/u1-primary/staff-before-registry-1440.png) / [After](../../output/playwright/u1-primary/staff-after-registry-1440.png) | [Before](../../output/playwright/u1-primary/coordinator-before-payroll-open-1440.png) / [After](../../output/playwright/u1-primary/coordinator-after-payroll-open-1440.png) |
| 1024 | [Before](../../output/playwright/u1-primary/staff-before-registry-1024.png) / [After](../../output/playwright/u1-primary/staff-after-registry-1024.png) | [Before](../../output/playwright/u1-primary/coordinator-before-payroll-open-1024.png) / [After](../../output/playwright/u1-primary/coordinator-after-payroll-open-1024.png) |
| 820 | [Before](../../output/playwright/u1-primary/staff-before-registry-820.png) / [After](../../output/playwright/u1-primary/staff-after-registry-820.png) | [Before](../../output/playwright/u1-primary/coordinator-before-payroll-open-820.png) / [After](../../output/playwright/u1-primary/coordinator-after-payroll-open-820.png) |
| 375 | [Before](../../output/playwright/u1-primary/staff-before-registry-375.png) / [After](../../output/playwright/u1-primary/staff-after-registry-375.png) | [Before](../../output/playwright/u1-primary/coordinator-before-payroll-open-375.png) / [After](../../output/playwright/u1-primary/coordinator-after-payroll-open-375.png) |
| 320 | [Before](../../output/playwright/u1-primary/staff-before-registry-320.png) / [After](../../output/playwright/u1-primary/staff-after-registry-320.png) | [Before](../../output/playwright/u1-primary/coordinator-before-payroll-open-320.png) / [After](../../output/playwright/u1-primary/coordinator-after-payroll-open-320.png) |

Matched desktop profile evidence: [Overview before](../../output/playwright/u1-primary/coordinator-before-profile-overview-1440.png) / [after](../../output/playwright/u1-primary/coordinator-after-profile-overview-1440.png), [Documents before](../../output/playwright/u1-primary/coordinator-before-profile-requirements-1440.png) / [after](../../output/playwright/u1-primary/coordinator-after-profile-requirements-1440.png), [Academic before](../../output/playwright/u1-primary/coordinator-before-profile-academic-1440.png) / [after](../../output/playwright/u1-primary/coordinator-after-profile-academic-1440.png), [Scholarship before](../../output/playwright/u1-primary/coordinator-before-profile-scholarship-1440.png) / [after](../../output/playwright/u1-primary/coordinator-after-profile-scholarship-1440.png), [History before](../../output/playwright/u1-primary/coordinator-before-profile-timeline-1440.png) / [after](../../output/playwright/u1-primary/coordinator-after-profile-timeline-1440.png). Also [Pending before](../../output/playwright/u1-primary/coordinator-before-pending-1440.png) / [after](../../output/playwright/u1-primary/coordinator-after-pending-1440.png), [batch list before](../../output/playwright/u1-primary/coordinator-before-payroll-list-1440.png) / [after](../../output/playwright/u1-primary/coordinator-after-payroll-list-1440.png). Complete five-width measurements for both roles accompany the captures.

| Staff closed-default page | Height at 1440, before → after | Height at 320, before → after |
|---|---:|---:|
| Registry | 2,282 → 2,199 | 2,905 → 2,752 |
| Profile Overview | 1,472 → 951 | 2,791 → 1,567 |
| Documents | 1,711 → 1,594 | 3,772 → 2,703 |
| Academic records | 2,029 → 1,421 | 3,799 → 2,424 |
| Scholarship | 1,882 → 1,366 | 3,501 → 2,255 |
| History | 3,013 → 2,504 | 5,837 → 4,448 |
| Payroll list | 912 → 900 | 1,537 → 1,282 |
| Opened payroll | 2,761 → 2,519 | 4,353 → 3,750 |

Registry's desktop roster begins **685.4 → 627.7 px**, about 58 px higher. Staff Overview's initially visible main text changes **1,502 → 601 characters**, with evidence accessible through disclosures. These measurements describe closed-default presentation, not deleted information or fewer historical records. Some widths grow: the opened batch at 820 is **2,863 → 3,190 px**, and task reasons can increase Dashboard height. A universal scroll reduction is not claimed. [Complete layout comparison](../../output/u1-workflows-primary-20261026/layout-comparison.json).

Both roles verified every current pending destination, published-list Lock cancellation, existing Registry tools, profile tabs/facts/annual history, exact-ID roster search, Next **26–50 of 800**, Previous **1–25**, secondary payroll groups and visible header actions. Export dialogs fit all five widths, Escape restores focus, required registration validation and School → Course order remain. Payment tables/date pencils retain **3-pixel focus**; actual **2026-10-24** date forms were cancelled. No business save was submitted. [Staff controls](../../output/u1-workflows-primary-20261026/controls-primary-staff.json), [Coordinator controls](../../output/u1-workflows-primary-20261026/controls-primary-coordinator.json), [Staff dialogs](../../output/u1-workflows-primary-20261026/dialogs-staff.json), [Coordinator dialogs](../../output/u1-workflows-primary-20261026/dialogs-coordinator.json).

Focused **native 200% Chrome** passed with viewport emulation disabled: **712×424 CSS pixels / DPR 2**. Dashboard, Registry, all five profile tabs and opened Payroll reflowed without page overflow; roster keyboard access and 3-pixel search focus passed. Captures use the rendered browser view without resizing. Zoom was restored to 100% and the task window closed. [Native proof](../../output/u1-workflows-primary-20261026/native-zoom-review.json), [200% Overview](../../output/playwright/u1-primary/native-200-profile-overview.png), [200% Payroll](../../output/playwright/u1-primary/native-200-payroll.png). The ui-ux-pro-max and Playwright workflows were used. Full AT/WCAG and office/LAN certification are not claimed.

## Performance and tests

The pending reader was measured against the same primary records/runtime, with one warm-up and three sequential service samples per role. Staff changes **92.0/94.3/109.5 → 92.5/91.7/88.8 ms**; Coordinator **87.1/84.7/80.6 → 83.9/88.9/86.7 ms**. Both retain **9 SELECTs**, **53 / 95 decoded rows**. Added metadata changes decoded bytes **6,511→6,547 / 11,169→11,223** and three-item response bytes **1,064→1,192 / 1,431→1,605**. Selection, ordering and all original fields match. These service observations exclude HTTP middleware/browser work. [SQL/service profile](../../output/u1-workflows-primary-20261026/pending-profile.json).

Initial actual-primary Vite measurements use the same roles/data, 1440×900, cache disabled, one warm-up and three samples, with settled-content waits before network-idle collection. Median readiness changes are below; raw samples and response counts remain available.

| Workspace | Staff median ms, before → after | Coordinator median ms, before → after |
|---|---:|---:|
| Registry | 2,183 → 2,288 | 2,202 → 2,055 |
| Profile Overview | 855 → 1,278 | 1,009 → 913 |
| Payroll list | 466 → 485 | 561 → 564 |
| Opened Payroll | 507 → 1,281 | 677 → 621 |

The slower Staff samples are retained and are not called zero-cost. Existing response sets remain bounded: Registry **12–13**, Profile **18–19**, Payroll list **8–9**, opened batch **10–11** API responses depending on role/session refresh. Opened-batch body totals remain **109,478 Staff / 116,861 Coordinator bytes**; its visible roster remains 25 rows. Registry still uses its existing assessment reader; this batch does not optimize it.

Dashboard uses DOM MutationObserver timestamps: full readiness changes **590/687/558 → 578/592/584 ms Staff**, **652/593/565 → 687/704/717 ms Coordinator**. Its **10 requests** remain; body totals change **9,399→9,527 / 13,814→13,988 bytes**, entirely the pending metadata addition. No expensive initial detailed-assessment read was added. [Actual Vite samples and layout data](../../output/u1-workflows-primary-20261026/performance.json).

Because Vite delivery and locator waits varied, a separate alternating compiled-client comparison uses the **accepted D1.5 and final U1 client archives against the same actual primary API**, role, data and 1440×900 conditions. Only static assets are replayed in the task browser; no primary source or API response is replaced. A DOM MutationObserver timestamps actual populated content, with one warm-up and three measured samples per client/workspace. This isolates presentation from Vite module delivery and wait polling; it does not reconstruct the old pending API payload.

| Compiled median readiness | Staff D1.5 → U1, ms | Coordinator D1.5 → U1, ms |
|---|---:|---:|
| Registry | 239 → 243 | 233 → 233 |
| Profile Overview | 572 → 578 | 577 → 577 |
| Payroll list | 123 → 129 | 131 → 125 |
| Opened Payroll | 222 → 226 | 231 → 251 |
| Dashboard | 297 → 271 | 296 → 291 |

Each matched client pair has the same API request count and body total for its role/workspace. No consistent material presentation regression appears in these small alternating samples. They do not establish a speedup, eliminate the slower actual-Vite observations or certify cold-start delivery. [All alternating samples/counts/bytes](../../output/u1-workflows-primary-20261026/matched-performance-summary.json), [Staff raw results](../../output/u1-workflows-primary-20261026/matched-performance-staff.json), [Coordinator raw results](../../output/u1-workflows-primary-20261026/matched-performance-coordinator.json).

Client bytes change **1,470,380→1,482,811**, **+12,431**: JavaScript **1,036,852→1,043,670**, CSS **327,367→332,980**, observed CSS gzip **49,300→50,226**. Fonts/dependencies are unchanged. Local samples are not cold-start, maximum-load, concurrency or LAN-capacity certification.

| Final validation | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | All exit **0**, complete normal build in matching staging |
| `npm test` | **124 files / 791 tests passed** |
| Authentication, notifications, RBAC, academic, approved academic changes, Dashboard, Registry, Payment Recording, reconciliation, individual settlement, financial reports, Masterlist workflow, annual intake/import | **All 13 disposable integration groups exit 0** |
| Primary read-only action, source, layout, recovery and financial preview checks | Passed |

The intake/import driver includes all 13 existing F27 groups and registration/text/source/retry assertions. Masterlist tests exercise actual guarded publication/locking. Financial suites retain source distinctions, R01–R07, retry/atomicity and complete API/XLSX/PDF outputs. Mutations provision new owned disposable schemas, never primary/retained fixtures. The 13 integrations ran before the final DOM-only payment-action placement correction; backend and financial components remained exact, then the complete normal checks and primary browser/zoom acceptance were repeated. No guard, source pin or limit was relaxed. [Normal commands](../../output/u1-workflows-primary-20261026/checks-main.json), [unit log](../../output/u1-workflows-primary-20261026/test-final.log), [13 exact commands/exits](../../output/u1-workflows-primary-20261026/regressions-final.json).

## Current-record preservation and delivery

Fresh final comparison proves all business table values/counts, schema objects, 66 journal entries, accounts/password hashes/roles, runtime grants and starting audit rows exact. It includes permanent IDs, annual registrations/classifications, academic/graduation/standing evidence, exact supplied-text/import histories and bindings, Masterlists, entitlements/allocations, frozen financial sources, every payment/date, individual/closure evidence and notification read-state tables.

| Fresh primary fact | Before → final |
|---|---|
| Scholars / application accounts | **1,000 / 14**, unchanged |
| Intake roots / academic records | **1,000 / 1,000**, unchanged |
| Entitlements / allocations | **1,000 / 1,000**, unchanged |
| Every payment record | **2 Paid → 2 Paid**, complete original rows/evidence exact; both dates **2026-10-24** |
| PAY-001 / PAY-002 | **2 Paid / 798 Pending** and **200 Pending**, both recordable |
| Import bindings / supplied-text events | **0 / 0**, unchanged |

Full before/after previews cover every finalized primary batch and accept **798 / 200**, zero conflicts; none was committed. All **10,437 starting audit rows** remain exact. Only two ordinary task logins and two logouts were appended (**10,441 total**); sessions **46→48**, with ordinary last-seen/revocation/rate-limit activity. Read-only previews, profiling and staging reused those sessions. This is qualified authentication activity, not zero database writes.

Both roles signed out by keyboard through the existing mobile footer; logout returned **204** and subsequent `auth/me` returned **401**. Task browser windows closed; the user's separate session/profile was untouched. All browser business-write guards recorded **zero attempts**. [Staff revocation](../../output/u1-workflows-primary-20261026/signout-staff.json), [Coordinator revocation](../../output/u1-workflows-primary-20261026/signout-coordinator.json), [final preservation](../../output/u1-workflows-primary-20261026/preservation.json), [full financial reads](../../output/u1-workflows-primary-20261026/readiness-after.json).

**1,300 of 1,316 starting inputs remain exact**, with no missing file. The 16 declared existing changes, three new package files, report and task evidence are the only application/document additions in scope. All starting distribution files and retained listener owners remain exact. Frontend/readiness return **200**, installed/staged source and reviewed archives match their hashes, and all four served local font binaries match source. The temporary preview at 3026 is stopped; retained environments were neither reset nor used for mutations. This is not an exhaustive new inventory of every retained database. [Final running-package verification](../../output/u1-workflows-primary-20261026/delivery.json).

## Restricted LAN pilot: findings only

No LAN target was configured, populated, started or operationally verified. Historical deployment guides are source documentation, not current deployment proof; some refer to older 48/53-migration releases. This synthetic UAT must not be treated as an operational release.

| Gate | Finding and required separate action |
|---|---|
| Release/network | Verify the actual office host, current compatible release/66 checksums, HTTPS certificate/origin, firewall, loopback backend, trusted-proxy boundary, supervision/reboot and office-PC access. Current 5173/3001 is loopback development synthetic UAT. |
| Database separation | Verify a dedicated operational database/runtime and genuine authorized intake. Never transfer synthetic people, accounts, passwords, payrolls or payments. No operational database was provisioned here; this is not an inventory of whether another already exists. |
| Roles/security/sessions | Existing RBAC/auth regressions pass. Operational accounts must be unique, named and independently reviewed; technical Administrator is not financial authority. Staging/production configuration requires HTTPS and dedicated non-root credentials, with Secure/HttpOnly/SameSite Strict sessions. Witness logout/revocation, idle/absolute expiry, CSRF/origin and proxy behavior in the actual office environment. |
| Recovery | Synthetic encrypted restore passed twice. Separately witness a current operational backup/restore, protected off-host storage/key access, operator procedure and recovery-time expectations. UAT evidence alone is insufficient. |
| Year/intake/import | Approve actual working-year/semester dates and genuine source packets. Office acceptance must verify New/Continuing identity reuse, exact supplied wording versus verified academic placement, source review and duplicate/retry behavior. |
| Masterlists | Preserve Coordinator review/publication/lock authority and genuine evidence. Exposing Lock does not delegate approval; published membership is not Paid. |
| Financial policy/flags | Existing synthetic financial flags are unchanged and are not operational approval. Resolve or explicitly restrict affected workflows for Q28 timely individual-DV continuation after semester end, Q29 physical receiving/timeliness evidence, Q30 late encoding of an earlier release with two-source written confirmation, and Q31 Coordinator-approved official forms. Existing guards must remain until separately approved changes. |
| Office acceptance | D2 witnessed recovery, D3 financial policy/forms and D4 named office acceptance remain separate gates. Verify actual office concurrency, representative load, assistive technology and LAN behavior. These local synthetic tests certify none of them. |

The policy gaps are documented in the [current-year workflow plan](../requirements/LDSS_CURRENT_YEAR_WORKFLOW_PLAN.md) and [phased implementation plan](../requirements/LDSS_PHASED_IMPLEMENTATION_PLAN.md). A restricted registration/receiving pilot can be considered only under separate authorization after its operational gates are met; affected financial workflows require their own approved disposition.

## Issues, recovery and stop

Staging caught JSX grouping, a dropped Masterlist workflow query hint and the hidden payment action group; final checks cover the corrected source. Browser helpers needed settled nested-profile reads, task-only preference resets, Unicode-safe pager matching and corrected timing collection. Exploratory tooling failures remain in logs. No application safeguard, role, validator, source hash or test bound was weakened to make acceptance pass.

No current primary manual intake/text history or additional cycle was manufactured for coverage. Their positive mutation/retry/source cases remain in fresh disposable integration tests. Native platform behavior, ordinary vertical/local-table scrolling, costly optional detailed assessments, the existing Vite chunk warning, cold-start/max-load and full accessibility/LAN acceptance remain limitations.

Saved **66-compatible D1.5 source** is under `output/u1-workflows-primary-20261026/baseline/`; the [accepted D1.5 compatible build](../../output/d1-5-primary-20261025/compatible-build.zip) remains available. Rollback must coordinate compatible API/client/source and preserve later legitimate edits. No stale database restoration, migration downgrade or history deletion is appropriate. Normal startup remains `node scripts/localhost-5173-profile.mjs synthetic`.

**Stopped after U1 implementation, verification and reporting.** Primary 5173 serves the verified 19-file package. No schema/policy decision, business-record mutation, permanent candidate, operational LAN/production deployment or unrelated Dashboard/navigation redesign occurred.
