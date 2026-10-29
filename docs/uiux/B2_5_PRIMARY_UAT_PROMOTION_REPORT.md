# B2.5 — Payment status primary UAT promotion

25 October 2026, Philippine time. **Completed and verified at [localhost:5173](http://127.0.0.1:5173/). Primary serves the accepted B2.5 presentation package. Stopped after promotion and verification.** Actual Paid records display green badges; Pending displays neutral gray. Existing payment amounts, dates, selection guards and the pencil correction control remain intact.

Authorization covers only the six-file package in the [accepted isolated report](B2_5_PAYMENT_STATUS_COLORS_REPORT.md). It was promoted unchanged, without reimplementation. No candidate records, accounts, sessions or simulated responses were transferred.

## Exact target and recovery

| Item | Freshly verified result |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP**, **127.0.0.1:3306** |
| Primary database | **`ldss_primary_test_12676_61497616`** |
| Runtime | **`ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic**, **127.0.0.1:5173 / 3001** |
| Schema | **66 migrations**, SQL checksums and applied timestamps unchanged |
| Controller / API / Vite, before and after | **49912 / 32832 / 41884**, commands, parents and loopback ownership unchanged |

All **1,286 inputs** protected by the candidate checkpoint still matched. The intervening B2.5 report was preserved; a fresh checkpoint protected **1,287 existing files**. The accepted six hashes, patch/source/build archive hashes and `git apply --check` passed against the actual dirty workspace. No newer source edit was overwritten. Current complete business/payment inventories and full payment previews were obtained before promotion, rather than assuming the previous payment count. [Preflight](../../output/b2-5-primary-20261025/preflight.json), [starting file inventory](../../output/b2-5-primary-20261025/files-before.json), [starting financial reads](../../output/b2-5-primary-20261025/readiness-before.json).

A fresh encrypted backup of **149 tables**, **13,685,943 encrypted bytes**, passed restoration into a newly owned isolated recovery schema. Verification covered values/counts, definitions, indexes, foreign keys/checks, triggers, executable views and rejection probes. The temporary restore schema/account was removed. The existing backup tool used its source-schema read locks while primary remained running; no primary restore or process stop occurred. Existing **64 MiB SQL / 96 MiB archive / 100,000 rows per table** limits remain. Archive/key contents remain restricted. [Recovery proof](../../output/b2-5-primary-20261025/recovery.json).

## Exact promotion and activation

| File | Reviewed presentation change |
|---|---|
| [PaymentStatusBadge.tsx](../../src/PaymentStatusBadge.tsx) — new | Noninteractive shared outcome badge, visible label and contextual accessible name |
| [PaymentRecording.tsx](../../src/PaymentRecording.tsx) | Summary and row badges; existing dates, pencil, selection and financial dialogs retained |
| [PayrollReconciliation.tsx](../../src/PayrollReconciliation.tsx) | Matching outcome badges and accepted wrapping action row |
| [FinancialReports.tsx](../../src/FinancialReports.tsx) | Separate original/effective outcomes and current-entitlement presentation; special wording retained |
| [styles.css](../../src/styles.css) | Scoped compact badge colors, wrapping and contrast |
| [payment-status-badge.test.tsx](../../tests/payment-status-badge.test.tsx) — new | Outcome mapping, accessible labels and report distinctions |

All six files match their accepted SHA-256 hashes. Exclusive temporary files followed by atomic replacement avoided partially written source reads. **1,283 of 1,287 existing files remain exact**; the four differences are the authorized existing UI files. No starting file is missing. The two new reviewed files, this report and task-local evidence are additional outputs. [Exact promoted hashes](../../output/b2-5-primary-20261025/promoted-files.json), [file/data preservation](../../output/b2-5-primary-20261025/preservation.json).

The complete normal build and checks ran in the verified **3021 candidate source directory**, whose **821 application/configuration/test/schema inputs match the promoted primary**. All **287 rebuilt distribution files** match the accepted compatible build. This execution location preserved primary's **33 shared static-client files and 277 server outputs byte-for-byte**. The fresh compatible build is [archived](../../output/b2-5-primary-20261025/compatible-build.zip); it was not copied over retained static assets. [Build comparison](../../output/b2-5-primary-20261025/build-verification.json).

Primary uses the existing Vite frontend, which loaded the promoted source with the unchanged compatible API. Browser rendering, served component/styles, frontend and API readiness **200**, exact source hashes and unchanged process ownership verify activation. **No frontend or API restart was needed.** Retained listeners **3011/3012/3013/3015/3016/3018/3019/3020/3021** retain their original PIDs. Backend/API code, financial writers, handlers/dialogs, `.env`, launch configuration, dependencies, schema, grants, permissions and flags remain unchanged. [Final delivery/source/process verification](../../output/b2-5-primary-20261025/delivery.json).

## Mapping and actual primary browser checks

| Supported outcome | Presentation |
|---|---|
| Paid | Green, `#14532d` on `#eaf7ee` |
| Pending | Neutral gray, `#374151` on `#f1f3f5` |
| Unclaimed | Amber, `#854d0e` on `#fff6db` |
| Needs resolution | Red, `#991b1b` on `#fef0ef`; reports retain **Withheld / Review** where applicable |

Labels remain visible; badges are spans, add no tab stops and infer no action or state. The accepted contrast calculations are **8.26 / 9.27 / 6.35 / 7.49**, respectively. On payroll, Masterlist approval, released state, document/academic eligibility and unsupported workflow labels are not converted to Paid or new payment states. The accepted package preserves command/hook bodies, all handler/disabled/checked attributes and financial-dialog subtrees. [Accepted source/contrast comparison](../../output/b2-5-payment-status-20261025/source-preservation.json).

Existing synthetic **Staff and Coordinator** authenticated normally without account/password/role changes. Each passed actual primary checks for:

- PAY-001: **2 Paid / 798 Pending**, approved total **PHP 4,000,000.00**, Paid amount **PHP 10,000.00**. Row amounts remain **PHP 5,000.00**, and both Paid dates remain **2026-10-24**. Paid selections stay disabled; Pending selection enables the existing Mark Paid action and clearing selection disables it. No outcome action was submitted.
- The existing pencil opens the correction form through Enter and displays the stored actual date. **Cancel saves nothing.** No correction handler or confirmation dialog was altered.
- PAY-002: **200 Pending**, with no fabricated Paid row. Zero-count Unclaimed and Needs resolution summary labels remain visible in their respective colors.
- Reconciliation: actual Paid/Pending outcomes retain labels, dates and existing actions. Reports keep **Original: Not closed**, effective Paid/Pending, and current entitlement Paid or **Unpaid** distinct. Unpaid is not relabelled Pending; later-settlement and source-only wording remains governed by the accepted mapping.
- **1440/1024/820/375/320 CSS pixels**, 900-pixel height: no page-level horizontal overflow, visible **3-pixel** keyboard focus, locally scrollable tables and reachable pencil controls. Sampled Paid row heights remain approximately **64 px at 1440 / 62 px at the other widths**.

Business non-GET requests were blocked during acceptance: **zero business attempts**. Only read requests and local selection/draft/cancel actions were used. No primary response was simulated or replaced. Both task sessions were signed out; the user's separate session was not signed out. [Staff recording](../../output/b2-5-primary-20261025/staff-browser.log), [Staff reconciliation/reports](../../output/b2-5-primary-20261025/staff-shared-accepted.log), [Coordinator recording](../../output/b2-5-primary-20261025/coordinator-browser.log), [Coordinator reconciliation/reports](../../output/b2-5-primary-20261025/coordinator-shared.log).

| Width | Staff Payment Recording | Coordinator Payment Recording |
|---|---|---|
| 1440 | [Staff](../../output/playwright/b2-5-primary/staff-recording-1440.png) | [Coordinator](../../output/playwright/b2-5-primary/coordinator-recording-1440.png) |
| 1024 | [Staff](../../output/playwright/b2-5-primary/staff-recording-1024.png) | [Coordinator](../../output/playwright/b2-5-primary/coordinator-recording-1024.png) |
| 820 | [Staff](../../output/playwright/b2-5-primary/staff-recording-820.png) | [Coordinator](../../output/playwright/b2-5-primary/coordinator-recording-820.png) |
| 375 | [Staff](../../output/playwright/b2-5-primary/staff-recording-375.png) | [Coordinator](../../output/playwright/b2-5-primary/coordinator-recording-375.png) |
| 320 | [Staff](../../output/playwright/b2-5-primary/staff-recording-320.png) | [Coordinator](../../output/playwright/b2-5-primary/coordinator-recording-320.png) |

Additional actual screens: [reconciliation](../../output/playwright/b2-5-primary/coordinator-reconciliation-1440.png), [financial report](../../output/playwright/b2-5-primary/coordinator-reports-1440.png), [pending-only batch](../../output/playwright/b2-5-primary/coordinator-pending-batch.png). Captures use real primary data, first 25 rows, empty search, zero selection and default zoom. The accepted isolated report retains the matched before/after comparison; primary was not reverted for screenshots. Playwright was used for these checks.

Primary currently has no Unclaimed/Needs resolution outcome rows or later individual settlements. Their positive/special-wording browser coverage remains the explicitly simulated **isolated** candidate evidence, supplemented by current disposable integration regressions. No artificial primary outcome was created to fill that gap.

## Tests and current-record preservation

All commands below exited **0**, using the verified matching candidate source. Mutating financial drivers provisioned fresh owned disposable schemas; primary and retained environments were not mutation targets.

| Check | Result |
|---|---|
| `npm run lint`, `npm run typecheck` | No lint/type errors |
| `npm run build` | Complete normal command; accepted 287-file output match |
| `npm test` | **118 files / 753 tests passed** |
| `npm run check:secrets` | Passed |
| Payment Recording integration | Passed, including selection/outcome guards, retry and atomicity |
| Reconciliation integration | Passed, including guarded reconciliation and closure paths |
| Individual settlement integration | Passed, including settlement/correction and concurrency safeguards |
| Financial-report integration | Passed, including Original/current source distinctions and complete API/XLSX/PDF outputs |

[Five normal command exits](../../output/b2-5-primary-20261025/checks-main.json), [unit log](../../output/b2-5-primary-20261025/test-main.log), [four integration commands/exits](../../output/b2-5-primary-20261025/regressions-b-two-five-primary/results.json). No validator, limit or financial-source pin was weakened or refreshed to satisfy acceptance.

Fresh before/after comparison proves **all business table values/counts, schema definitions, 66 migration rows, accounts/password hashes/roles, grants and original audit rows exact**. This includes identities, registrations/classifications, supplied-text history, original Excel/import sources and bindings, Masterlists, academic/standing history, entitlements, allocations, frozen payroll/source bytes, payments/actual dates and individual/closure evidence.

| Primary fact | Fresh before → after |
|---|---|
| Scholars / accounts | **1,000 / 14 → unchanged** |
| Intake roots / academic records | **1,000 / 1,000 → unchanged** |
| Entitlements / allocations | **1,000 / 1,000 → unchanged** |
| All current payment records | **2 Paid → 2 Paid**, complete rows/evidence exact, both dates **2026-10-24** |
| PAY-001 | **2 Paid / 798 Pending**, `canRecord:true` |
| PAY-002 | **200 Pending**, `canRecord:true` |
| Import bindings | **0 → 0** |

Full fresh payment previews accept **798 / 200**, with **zero conflicts**; neither was committed. All **10,400 existing audit rows** match. Only two login and two logout events were appended (**10,404 total**); sessions **26→28**, with normal authentication/rate-limit activity. This is qualified authentication activity, not zero database writes. [Preservation](../../output/b2-5-primary-20261025/preservation.json), [final financial reads](../../output/b2-5-primary-20261025/readiness-after.json).

## Issues, recovery and stop

A browser helper initially removed the wrong route pattern before sign-out, so its own request guard blocked logout and the application displayed a connection alert. The exact guard was removed, checks were repeated successfully and each task session signed out normally. This was helper cleanup, not a financial request or application repair. No accepted package byte was changed.

Narrow tables intentionally scroll locally. Native 200% zoom, full assistive-technology/WCAG certification and office/LAN acceptance are not claimed. The existing Vite chunk-size warning and earlier unrelated payment-preview focus limitation remain.

Saved 66-compatible B2.2 source is under `output/b2-5-primary-20261025/baseline/`; starting static/server artifacts remain exact. Rollback was not needed. A future presentation rollback must preserve legitimate later edits and coordinate the saved UI source with its compatible API. It needs no database restore, migration downgrade, history deletion or stale-data replacement. The existing launch command remains `node scripts/localhost-5173-profile.mjs synthetic`.

**Stopped after B2.5 promotion and verification.** Primary 5173 runs the accepted six-file B2.5 package. No schema/grant/permission/flag/API change, payment command, candidate-data transfer, retained-server restart, Dashboard, system-wide font change, annual rollover, LAN/production operation or unrelated enhancement occurred.
