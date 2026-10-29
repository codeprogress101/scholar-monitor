# PAY-UI-1 — Payroll page action-first layout

26 October 2026, Philippine time. **Implemented and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/#payouts). Create New Payroll Draft is visible beside or immediately below the Payroll Batches heading. The existing form, command, permissions and financial safeguards are retained. No primary payroll was created or financial command submitted.** LAN-R2A remains paused.

This follows [PAY-NEW-3 UAT](../requirements/PAY_NEW_3_NEW_PAYROLL_DRAFT_UAT_REPORT.md), preserving PAY-NEW-2, ML-1.2 and BACKUP-1. The fresh baseline includes the separate Coordinator's subsequent payment activity: **800 Paid records**, comprising **two dated 24 October and 798 dated 26 October**. All remain exact; the old two-Paid checkpoint was not used as current data.

## Target, recovery and installation

| Item | Fresh result |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Primary database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Application | Existing **synthetic / loopback 5173 / 3001** |
| Controller / API / Vite | **34892 / 53616 / 60116**, unchanged; no restart |
| Schema | **149 tables / 66 accepted migrations**, original SQL hashes and applied timestamps |
| Current Masterlist | Batch 1, **Published / v415 / 835 members**, unchanged |
| PAY-001 / PAY-002 | Both **processed**; **800 Paid / zero Pending**, and **200 Pending**, unchanged |
| Recorded submission deadline | **31 October / revision 3**, unchanged |

Accepted source hashes matched. A checkpoint protects **1,350 existing inputs**. Isolated staging at `C:/xampp/htdocs/ldss_payui1_primary_stage_20261026` used the actual dirty workspace, excluding private configuration; Git HEAD and older review builds were not substituted. [Inspection](../../output/pay-ui-1-primary-20261026/inspection.json), [preflight](../../output/pay-ui-1-primary-20261026/preflight.json), [starting hashes](../../output/pay-ui-1-primary-20261026/files-before.json).

Before source changes or fixture mutations, installed BACKUP-1 captured **93,880,099 SQL bytes / 20,732,987 encrypted bytes**, archive SHA-256 `7067ac146ecee3ca2677e04c25ddad0b1fd8cf82cb90abb552368ecefa5f4add`. Complete newly owned isolated restoration passed all 149 tables' values/counts/checksums, migration journal, schema inventory, indexes, foreign keys/checks, triggers, executable views and rejection probes. The recovery schema/account were removed. Nothing was restored over primary. Existing source-schema READ locks briefly serialize writes; no server-wide lock, format change, capacity increase or key rotation occurred. Archive/key material remains private. [Recovery proof](../../output/pay-ui-1-primary-20261026/recovery.json).

Normal checks, staged browser acceptance, disposable restrictions and fresh source/business preservation preceded installation. Four reviewed files were installed by atomic per-file rename, with the compatible child components first and parent last. Existing Vite served the changes; primary and retained processes were not stopped. A final read-error wording refinement repeated normal checks and read-state acceptance before its one-file installation. All **310 retained distribution files** remain exact; the compatible review build is separate. [Installed hashes](../../output/pay-ui-1-primary-20261026/promoted-files.json), [delivery](../../output/pay-ui-1-primary-20261026/delivery.json).

## Final layout and preserved workflow

The selected Payroll Batches page now presents:

1. **Payroll Batches** and the single prominent **Create New Payroll Draft** action for an authorized Coordinator.
2. Current academic year/semester, cycle/state, relevant passed-target warning and recorded submission deadline.
3. A short restriction when creation is unavailable, or the Staff explanation **“Draft creation requires Coordinator access.”**
4. The existing batch list, actual statuses, Open Payroll and payment-recording controls.
5. **Payroll setup & history**, containing submission windows/history, deadline administration, semester document administration, historical setup and period configuration.

The main page removes the duplicate batch heading and routine instructional paragraph. The target date is no longer repeated in both cycle context and warning. The whole-Manila-day cutoff and **draft creation does not record payment** distinction remain visible. On narrow batch-page layouts, the existing Payroll workspace links use two columns; labels, order, destinations and handlers remain. Sidebar/global navigation is unchanged.

The creation control opens the **same single Submission window form** in `PayrollSubmissionWindows`. Its save function is byte-equivalent to the starting source, including the existing `open-window` endpoint, body, expected cycle/deadline/sequence versions, CSRF handling, idempotency key and retry behavior. No new route or replacement writer exists. Cancel and Escape close the form and restore trigger focus; opening focuses the form without submitting it.

Availability comes from the existing server projection. Creation remains disabled while loading, after a failed availability read, or when backend restrictions exist. The first restriction is shown briefly; additional reasons remain accessible. A failed read now says **“Submission deadline unavailable.”** Retry uses a real GET. The existing availability/window metadata reader runs on entry so deadline and action state can be shown; development effect replay can repeat that read. Document/setup components defer mounting until the secondary section is first opened, then remain mounted when it closes. No new endpoint, polling or scholar-wide fetch was added.

The displayed **31 October** is recorded application configuration. This presentation task neither establishes its supporting office authority nor changes the disposition recorded in PAY-NEW-3. It does not authorize a deadline extension, draft creation or payment.

## Exact source boundary

**Four existing presentation files changed; no new application file.**

| File | Change |
|---|---|
| [src/PayrollSubmissionWindows.tsx](../../src/PayrollSubmissionWindows.tsx) | Surface the existing action/form, deadline and availability; place administration/history below batch content; loading/error/retry and keyboard focus handling |
| [src/PayoutCyclesPage.tsx](../../src/PayoutCyclesPage.tsx) | Mount the shared component around the existing batches; provide current context and secondary administration; remove the old duplicate placement and repetitive page text |
| [src/OvrDrafts.tsx](../../src/OvrDrafts.tsx) | Optional compact heading presentation; retain existing batch table, navigation, commands and financial components |
| [src/styles.css](../../src/styles.css) | Append scoped spacing, action sizing/focus and narrow Payroll workspace link layout after the exact accepted prefix |

**1,346 of 1,350 protected starting inputs remain exact**, with none missing. The four declared files are the only existing changes. Every backend, migration, permission mapping, financial writer/reader/output builder, authentication module, BACKUP-1 file, dependency, font, flag, launcher and private configuration remains exact. All **676 protected backend/migration/script/test inputs** and **283 compiled server JavaScript files** match the accepted baseline. Existing tests were not changed. [Four-file hashes](../../output/pay-ui-1-primary-20261026/candidate-files.json), [source boundary](../../output/pay-ui-1-primary-20261026/source-preservation.json), [handler/server comparison](../../output/pay-ui-1-primary-20261026/build-verification.json).

Final client assets change **1,513,099 → 1,515,624 bytes**, **+2,525**: JavaScript **+1,354**, CSS **+1,171**; observed CSS gzip **50,955 → 51,141 bytes**. Fonts and dependencies are unchanged. This is an asset comparison, not a cold-start or LAN performance claim. [Bundle inventory](../../output/pay-ui-1-primary-20261026/bundle-impact.json).

## Before/after screenshots and visibility

Matched primary captures use the same roles, period, two processed batches, default zoom, height 900 and closed administration. Footer account names are masked. Before images were captured before installation; primary was not reverted.

| Width | Coordinator before / after | Staff before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/pay-ui-1-primary/coordinator-before-1440.png) / [After](../../output/playwright/pay-ui-1-primary/coordinator-after-1440.png) | [Before](../../output/playwright/pay-ui-1-primary/staff-before-1440.png) / [After](../../output/playwright/pay-ui-1-primary/staff-after-1440.png) |
| 1024 | [Before](../../output/playwright/pay-ui-1-primary/coordinator-before-1024.png) / [After](../../output/playwright/pay-ui-1-primary/coordinator-after-1024.png) | [Before](../../output/playwright/pay-ui-1-primary/staff-before-1024.png) / [After](../../output/playwright/pay-ui-1-primary/staff-after-1024.png) |
| 820 | [Before](../../output/playwright/pay-ui-1-primary/coordinator-before-820.png) / [After](../../output/playwright/pay-ui-1-primary/coordinator-after-820.png) | [Before](../../output/playwright/pay-ui-1-primary/staff-before-820.png) / [After](../../output/playwright/pay-ui-1-primary/staff-after-820.png) |
| 375 | [Before](../../output/playwright/pay-ui-1-primary/coordinator-before-375.png) / [After](../../output/playwright/pay-ui-1-primary/coordinator-after-375.png) | [Before](../../output/playwright/pay-ui-1-primary/staff-before-375.png) / [After](../../output/playwright/pay-ui-1-primary/staff-after-375.png) |
| 320 | [Before](../../output/playwright/pay-ui-1-primary/coordinator-before-320.png) / [After](../../output/playwright/pay-ui-1-primary/coordinator-after-320.png) | [Before](../../output/playwright/pay-ui-1-primary/staff-before-320.png) / [After](../../output/playwright/pay-ui-1-primary/staff-after-320.png) |

Previously the default page did not render the creation action until two disclosures were opened. At 1440, its position in that expanded view was **1,555.6 px** from document top; it is now **95 px** in the closed-default layout. This compares access states, not identical disclosure expansion. It needs **zero disclosures** now. At 320 the action is at **230.3 px**, wholly within the initial viewport. Coordinator batch-list top moves **404.5 → 356 px** at 1440 and **782.1 → 630.3 px** at 320. Closed-default page heights at 320 change **1,267 → 1,111 px** for Coordinator and **1,267 → 1,126 px** for Staff. [Before controls](../../output/pay-ui-1-primary-20261026/browser-results/before-coordinator.json), [Coordinator final](../../output/pay-ui-1-primary-20261026/browser-results/after-coordinator.json), [Staff final](../../output/pay-ui-1-primary-20261026/browser-results/after-staff.json).

## Acceptance and regressions

| Final validation | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | All exit **0** on final matching staged source |
| `npm test -- --maxWorkers=1` | **128 files / 829 tests passed** |
| Relevant disposable integrations | **Seven groups exit 0**: Masterlist workflow, Registry/main payroll/Treasury, intake/import/receiving, historical/omitted payroll, Recording, reconciliation and financial reports |
| Existing correction fixture | **Five groups passed** on a newly owned fictional target; original role, deadline, retry, rollback and source restrictions retained |
| Primary | Both roles, five widths, form open/cancel, native zoom, navigation, financial reads and preservation passed |

Both roles passed **1440 / 1024 / 820 / 375 / 320 CSS pixels** without page-level horizontal overflow. Tables scroll locally. Coordinator has one action and one opened form, using the original date bounds. Enter opens it; Cancel/Escape restore focus without a command. Staff has the role explanation and no creation action. The action retains **44-pixel height / 3-pixel focus outline**. Opening secondary setup does not duplicate it.

Both roles opened PAY-001/PAY-002 and their original Payment Recording views, preserving selected batch context. Return through the Payroll Batches workspace link and compact Back restores focus. Individual Payments and Reports link targets remain exact. No payment form was submitted. [Coordinator navigation](../../output/pay-ui-1-primary-20261026/browser-results/navigation-coordinator.json), [Staff navigation](../../output/pay-ui-1-primary-20261026/browser-results/navigation-staff.json).

On the owned fixture, actual backend responses produced disabled creation for stale period mapping and an expired final deadline. No payload was substituted. Delayed and aborted browser reads proved fail-closed loading/error states and keyboard Retry against real responses; primary repeated this read-only acceptance. Fault probes affected only the newly owned fixture and were restored before cleanup. Financial regressions retain their source pins, R01–R07, output, retry and atomicity assertions. [Restrictions](../../output/pay-ui-1-primary-20261026/browser-results/fixture-blocked-stale.json), [expired deadline](../../output/pay-ui-1-primary-20261026/browser-results/fixture-blocked-expired.json), [primary read states](../../output/pay-ui-1-primary-20261026/browser-results/primary-read-states.json).

Native Chrome **200%**, viewport emulation disabled, passed for both roles at **712×424 CSS pixels / DPR 2**, including creation-form date controls, keyboard cancellation/focus and secondary access. Accepted captures use the direct rendered viewport without resizing. Zoom returned to 100% and task windows closed. The ui-ux-pro-max and Playwright workflows were used; full assistive-technology/WCAG certification is not claimed. [Coordinator native proof](../../output/pay-ui-1-primary-20261026/browser-results/native-coordinator.json), [Staff native proof](../../output/pay-ui-1-primary-20261026/browser-results/native-staff.json), [200% heading/action](../../output/playwright/pay-ui-1-primary/native-coordinator-after-top.png), [200% existing form](../../output/playwright/pay-ui-1-primary/native-coordinator-after-form.png), [settled field/cancellation proof](../../output/pay-ui-1-primary-20261026/browser-results/native-form-settled.json).

[Final commands](../../output/pay-ui-1-primary-20261026/checks-main.json), [unit log](../../output/pay-ui-1-primary-20261026/unit-final.log), [seven command/exits](../../output/pay-ui-1-primary-20261026/regressions-masterlist-workflow-registry-intake-import-historical-recording-reconciliation-financial-reports-latest.json), [owned fixture](../../output/pay-ui-1-primary-20261026/correction-integration.json).

Staging caught excessive narrow-screen text and the read-error deadline label; both were corrected and final normal checks repeated. Final artifact review also caught a native form capture before scrolling settled; it was replaced with a direct capture showing both date fields and Cancel, using a brief additional Coordinator session. A baseline Staff capture initially reused a cached document after changing cookies; accepted captures use distinct full navigation and actor verification. A navigation probe retained a recording-view URL; final checks use the explicit Payroll Batches workspace destination. The first expired-fixture probe was rejected by the existing deadline-history check; ordered past fixture values were used without disabling constraints, then restored. Primary Vite development effect replay required aborting all initial availability reads in the error probe. These were presentation/test corrections, not weaker financial guards.

## Primary preservation, artifacts and stop

Final complete comparison preserves all business values/counts, schema objects, 66 journal entries/timestamps, application account/password/role data, runtime grants and original audit rows. This includes **1,835 scholars**, **14 accounts**, all annual/academic/import/document/prior-approval evidence, **3 Masterlists / 2,002 stored entries / 1,835 activations**, the published 835-member list, frozen payrolls, entitlements, allocations, reconciliation and all payment evidence.

All **800 Paid rows** remain exact: **two dated 2026-10-24 and 798 dated 2026-10-26**. PAY-001 remains processed **v805 / 800 Paid**; PAY-002 remains processed **v5 / 200 Pending**. Both roles' four payment summaries are byte-equivalent before/after. No primary new batch, deadline change or financial command occurred. All **20,188 starting audit rows** remain exact at full datetime precision. Three task logins/three logouts add six ordinary authentication events (**20,194 total**); sessions **68→71**, with normal last-seen/revocation/rate-limit activity. This is qualified authentication activity, not zero database writes. [Full preservation](../../output/pay-ui-1-primary-20261026/final-preservation.json), [financial comparisons](../../output/pay-ui-1-primary-20261026/financial-after.json).

All three task sessions signed out with **204**, followed by **401**; original saved cookies also return 401. The user's separate sessions were untouched. Temporary GET-only preview and fixture services were stopped; owned fixture/recovery schemas/accounts were removed. Primary/retained listener owners remain unchanged. The **76 paused LAN-R2A artifacts and 16 earlier ML-1 investigation files** remain exact. This is not a fresh inventory of every retained or operational database. [Cleanup and revocation](../../output/pay-ui-1-primary-20261026/delivery.json).

Review/recovery artifacts: [four-file hashes](../../output/pay-ui-1-primary-20261026/candidate-files.json), [patch](../../output/pay-ui-1-primary-20261026/PAY_UI_1_PRIMARY.patch), [source ZIP](../../output/pay-ui-1-primary-20261026/candidate-source.zip), [compatible review build](../../output/pay-ui-1-primary-20261026/compatible-build.zip). Patch checking and an independent exact-byte apply round trip passed against the saved dirty baseline under `output/pay-ui-1-primary-20261026/baseline/`. Archives exclude credentials, keys, `.env` and database records; the review build omits server PDF/template assets and is not a complete LAN release. Rollback must preserve later legitimate edits and records; no database restoration or history deletion is appropriate for this presentation change.

Remaining limits: primary has only the two processed batches; restriction faults and ordinary Draft examples use owned fictional data. The existing table pagination/row mapping is unchanged; no newer primary batch was invented for screenshots. Narrow tables require local horizontal scrolling. Full AT/WCAG, cold-start/load/concurrency and office/LAN acceptance remain unverified; the existing build chunk warning remains. LAN-R2A may consider the presentation package only through separate release review and acceptance; it was not resumed.

**Stopped after PAY-UI-1 installation, verification and reporting. No primary payroll creation, financial-policy change, payment/audit-history repair, Masterlist mutation or operational LAN change occurred.**
