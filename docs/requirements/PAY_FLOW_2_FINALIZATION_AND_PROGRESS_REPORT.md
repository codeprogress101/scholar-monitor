# PAY-FLOW-2 — Finalization timing and payroll progress

27 October 2026, Philippine time. **Implemented and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/#payouts?cycle=829ae3dc-9b49-4d88-9dfe-0a7250b164c0&batch=7f337596-c36d-41d7-b715-368fd4633b1d): a read-only payroll progress tracker and exact cutoff-time display. Early finalization is NOT implemented; its office-policy and safe-write prerequisites remain unestablished. The server's `CUTOFF_NOT_REACHED` guard is unchanged.**

Primary PAY-003 remains **Review / revision 3 / 834 included / one deferred / zero awaiting review**. All **800 Paid records and original dates** remain exact. No primary review, return, finalization, submission, processing, deferral, payment or deadline command was submitted. LAN-R2A remains paused. Stopped after verification and reporting.

This preserves [PAY-UX-2](../uiux/PAY_UX_2_HYBRID_LOADING_REPORT.md), [PAY-PERF-2](PAY_PERF_2_PAYROLL_LOADING_REPORT.md), [PAY-FLOW-1](PAY_FLOW_1_EARLY_REVIEW_REPORT.md) and [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md).

## Fresh primary inventory

| Item | Starting → final |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Application / controller / API / Vite | Existing synthetic, loopback **5173 / 3001**; **63232 / 59864 / 8080**, unchanged |
| PAY-003 | **`7f337596-c36d-41d7-b715-368fd4633b1d`**, Review / revision **3**, unchanged |
| Current assessment | **834 included / one deferred / 1,000 blocked / zero awaiting review** |
| PAY-003 stored review entries / allocations / payments | **834 / 0 / 0**, unchanged |
| Batch window | Opens **26 October**, cutoff **27 October / revision 1**, unchanged |
| Semester final deadline / planned target | **31 October / revision 3**, and **24 October**, unchanged |
| PAY-001 / PAY-002 | **Processed v805 / 800 Paid**, and **Processed v5 / 200 Pending**, unchanged |
| Official Batch 1 | **Published / v415 / 835 active members**, 167 retained removals, unchanged |
| Schema | **149 tables / 66 migrations**, original SQL checksums and applied timestamps |

The baseline protects **20,232 original audit rows and 91 sessions**, including intervening legitimate state rather than reverting to an older Draft or two-Paid checkpoint. All accepted package hashes matched. [Inspection](../../output/pay-flow-2-primary-20261027/inspection.json), [event inventory](../../output/pay-flow-2-primary-20261027/current-payroll.json), [exact PAY-003 stored counts](../../output/pay-flow-2-primary-20261027/primary-facts.json).

## Early-finalization finding and stopped portion

Existing **Draft → Review → Finalized → Submitted → Processed** remains intact. Early Review is reversible and does not reserve financial entitlement or freeze the roster. Finalization freezes current evidence and creates unique semester entitlements/allocations. The current [managed guard](../../server/ovr/rules.ts) allows Review after opening but requires the Manila day to be later than the batch cutoff for Finalize. The [writer](../../server/ovr/service.ts) also checks fresh sources, the saved review, revision, authority and claim uniqueness. None changed.

**No documented, approved general early-freeze authority was established.** Coordinator `ovr.finalize` is application permission, not an office exception. The prior [PAY-FLOW-1 disposition](PAY_FLOW_1_EARLY_REVIEW_REPORT.md) already deferred this issue. Recorded deadline revision 3 also does not supply authority to freeze before an individual batch cutoff.

Existing routes do not resolve the missing policy automatically:

| Contract | Actual boundary |
|---|---|
| Return to Draft | Available from Review under existing Coordinator authority; not a general reopening of a finalized numbered roster. |
| Numbered payroll amendments | Frozen ordinary semester allocation is explicitly protected; [amendment service](../../server/ovr/amendment-service.ts) rejects the unsupported managed release/amendment path. |
| Later numbered batch | [Window rules](../../server/payouts/submission-rules.ts) require sequential, non-overlapping windows. A later window cannot silently cover the still-open original cutoff period. Eligibility and original-source/timing proof remain required. |
| Omitted scholar | [Omission service](../../server/payments/omission-service.ts) revalidates origin and destination, current eligibility and reservations. A later eligible automatic payroll is preferred while preparation is open. Individual OR + DV requires closed preparation and its own recorded approval; it is not automatic payment or a general early-freeze exception. |
| Financial corrections / reconciliation | Preserve actual outcomes and controlled history; do not authorize silent additions to an already frozen roster. |

Before a separately authorized design can proceed, the office must decide:

1. The named approving authority, supporting policy/reference, permitted scope and evidence required for each early freeze.
2. How every otherwise eligible applicant received before the original cutoff retains consideration, including unresolved timely applications and notice/review responsibilities.
3. The valid later route, source/window/deadline binding, funding/release timing and approval for those applicants. Neither an overlapping window nor an invented omission may be assumed.
4. Whether frozen membership may ever be reopened; if so, the approved correction, reservation, audit, source revalidation and reconciliation rules.
5. Any required signed forms, exception records, oversight and acceptance criteria before processing or payment.

These decisions are missing. **Early-finalization implementation is stopped under the request's explicit boundary.** No bypass flag, exception command, permission expansion, migration or new financial write contract was introduced. This report does not establish legal or office acceptance of an existing omission route as that exception.

## Exact timing and tracker behavior

The panel reuses the existing submission-window response. Its `cutoffExclusiveUtc` comes from the server's [whole-day boundary](../../server/payouts/submission-rules.ts); the eligibility reader's SQL Manila-day comparison agrees with it. Formatting explicitly uses **Asia/Manila**, independent of browser locale or workstation timezone.

| PAY-003 display | Authoritative meaning |
|---|---|
| **Batch submission cutoff: October 27, 2026 at 11:59:59 PM** | The entire last second is included. |
| **Normal finalization available from: October 28, 2026 at 12:00 AM** | Exclusive boundary **2026-10-27T16:00:00.000Z**; earliest ordinary time, still subject to every source/authority check. |
| **Semester final submission deadline: October 31, 2026 at 11:59:59 PM** | Current recorded deadline revision 3; not an office-authority finding or a new processing rule. |
| **Planned payout target: October 24, 2026** | Planning date, distinct from all submission/finalization boundaries. |

Missing, malformed, foreign-cycle, duplicate-window or unavailable timing data produces **Unavailable**, not a guessed date. Loading is identified separately. The display is a read snapshot, not a live clock or an automatic transition; existing refresh/source checks remain necessary. No date is hardcoded in the product.

The compact ordered tracker sits above the roster in payroll detail and Payment Recording. It shows **Completed / Current / Pending** in text and `aria-current="step"`, without clickable stages, percentages or command handlers. Return to Draft resets subsequent stages to Pending. Closed payrolls show the five stages completed; unknown workflow states show an unavailable explanation while existing status/controls remain.

| Current stage | Next-action explanation |
|---|---|
| Draft | Authorized preparation → Submit for Coordinator Review after current roster checks. |
| Review, Coordinator | Finalize Payroll, with the exact pre-cutoff restriction or current server blocker; source checks still required. |
| Review, Staff | Awaiting Coordinator finalization, with the same timing facts. |
| Finalized | Coordinator → Submit Official Payroll; Staff → Awaiting Coordinator submission. |
| Submitted | Authorized processor → Process Payroll after existing evidence checks. |
| Processed | Payment Recording remains the separate destination for actual outcomes. **Processed never means Paid.** |

Actual Paid/Pending summaries remain in the existing Payment Recording component immediately below the tracker when loaded. The tracker does not fetch a financial summary merely to decorate its stages. Both roles verified **PAY-001: 800 Paid / zero Pending** and **PAY-002: zero Paid / 200 Pending**, with selected-batch navigation retained. Treasury, reconciliation, corrections, Individual Payments and Reports remain accessible through their original controls.

The simplified 25-row roster, server search/pagination, excluded-scholar view, deferral modal, previews, source/audit disclosures and all required workflow controls remain. No Candidate pages section or full-cohort browser download was added. PAY-UX-2 button feedback, blocking dialogs and exact-retry mechanisms are unchanged.

## Source boundary and recovery

**Seven package files: four existing changes and three additions.**

| File | Change |
|---|---|
| New [src/payroll-progress.ts](../../src/payroll-progress.ts) | Read context, fixed-Manila timing validation/formatting and state/permission explanations. |
| New [src/PayrollProgress.tsx](../../src/PayrollProgress.tsx) | Read-only accessible tracker, timing panel and payment distinction. |
| [src/PayrollSubmissionWindows.tsx](../../src/PayrollSubmissionWindows.tsx) | Share existing metadata with batch detail; load it on direct Payment Recording entry too. |
| [src/OvrDrafts.tsx](../../src/OvrDrafts.tsx) | Mount the tracker without changing command handlers. |
| [src/PayrollDraftRoster.tsx](../../src/PayrollDraftRoster.tsx) | Remove the duplicate date-only cutoff and repetitive static explanation; preserve actions and server reasons. |
| [src/styles.css](../../src/styles.css) | Append scoped styles; fit stage columns to available content width, including native zoom with a sidebar. |
| New [tests/payroll-progress.test.tsx](../../tests/payroll-progress.test.tsx) | Nineteen cases covering states, permissions, unavailable sources and date/time boundaries. |

**1,358/1,362 protected existing inputs remain exact**, with none missing; only the four declared files differ. All backend, migration, permission, financial writer/reader/output, authentication, BACKUP-1, dependency, font, flag, launcher and private configuration inputs remain exact. All **283 compiled server JavaScript files** match PAY-UX-2. Existing frontend command blocks compare exactly after newline normalization, retaining endpoint/body/version/key/evidence handling. The original CSS prefix is byte-exact. [Hashes and artifacts](../../output/pay-flow-2-primary-20261027/candidate-files.json), [source boundary](../../output/pay-flow-2-primary-20261027/source-preservation.json), [writer/build comparison](../../output/pay-flow-2-primary-20261027/build-verification.json).

Actual dirty source supplied `C:/xampp/htdocs/ldss_payflow2_primary_stage_20261027`, excluding private configuration. The full baseline stayed outside the watched workspace; four original presentation files are also saved under task-local `baseline/`. Git HEAD and older builds were not substituted. All **310 retained distribution files** remain exact.

BACKUP-1 passed four fresh encrypted captures and complete isolated restorations:

| Checkpoint | Raw SQL / encrypted bytes | Result |
|---|---:|---|
| Before source work | **99,294,331 / 22,615,552** | Passed; target/account removed |
| Before initial installation | **99,295,249 / 22,615,922** | Passed; target/account removed |
| Before direct-recording refinement | **99,295,249 / 22,615,932** | Passed; target/account removed |
| Before final responsive CSS | **99,296,737 / 22,616,708** | Passed; target/account removed |

Each verified all **149 tables**, full values/counts/checksums, migration journal, columns, indexes, foreign keys/checks, triggers, executable views and rejection probes. Nothing was restored over primary. Existing finite bounds, encryption/key custody and source-schema READ-lock semantics remain unchanged. Distinct snapshots/archives are not claimed to have identical hashes. Final archive SHA-256: `1398a96d9cdad979fe6ed55a936e0bdb4c7111b50db889fab3161b7a2bdd1dd3`. [Initial recovery](../../output/pay-flow-2-primary-20261027/recovery.json), [first installation](../../output/pay-flow-2-primary-20261027/first-installation-recovery.json), [recording refinement](../../output/pay-flow-2-primary-20261027/recording-installation-recovery.json), [final CSS recovery](../../output/pay-flow-2-primary-20261027/activation-recovery.json).

Reviewed files were installed by atomic per-file rename, dependencies before their parent. Direct-entry metadata and final responsive CSS refinements were independently checked before their limited installations. Existing Vite served the changes; **no primary or retained service restart occurred**. The final GET-only preview at 3027 rejected unsafe methods and used the matching staged build with actual primary read responses. It is stopped. [Installed files](../../output/pay-flow-2-primary-20261027/promoted-files.json), [delivery](../../output/pay-flow-2-primary-20261027/delivery.json).

Client assets: **1,539,544 → 1,545,521 bytes (+5,977)**; JavaScript **+4,741**, CSS **+1,236**; observed CSS gzip **51,989 → 52,263**. There is no new endpoint, polling or candidate/financial reader. Direct Payment Recording entry now makes its existing small window-metadata GET on entry, instead of waiting for setup to open. Development effect replay can repeat a read. No latency/load claim follows from this asset comparison.

## Tests, visual acceptance and preservation

| Validation | Result |
|---|---|
| Lint, typecheck, build, secrets | All exit **0** on matching staging. Normal checks repeated after the direct-entry refinement; final CSS-only checks repeated lint/build/secrets. |
| Unit tests | **133 files / 879 tests passed**, one worker. |
| Existing disposable integrations | **13 groups exit 0**: Masterlist drafts/workflow/amendments, academic/approved changes, notifications, Registry/main payroll/Treasury/parity, intake/import, historical/omitted, Recording, reconciliation, individual settlement and financial reports. |
| Owned workflow copy | Early rejection, Return to Draft, 835-person early Review, post-cutoff finalization, submission and processing passed. |
| Primary | Both roles, exact PAY-003 timing, PAY-001/PAY-002 navigation/counts, five CSS widths, keyboard/native zoom and preservation; **zero business-command attempts**. |

Date cases cover one millisecond before and exactly at Manila midnight, month/year rollover, leap day and UTC/Los Angeles/Auckland local zones. The unchanged server guard still rejects early finalization, while early Review remains available. A failed actual metadata request shows unavailable timing. No clock, deadline or record was changed on primary.

The newly owned protected synthetic copy first rejected Coordinator early finalization with **`CUTOFF_NOT_REACHED`** and Staff finalization/return with **403**. Its supported return and restoration supplied a genuine **835-included** Draft for acceptance. Only its Node Date and connection-local SQL timestamp advanced to 28 October. Normal finalization reserved **835 allocations/entitlements**; subsequent processing retained **835 Pending / zero Paid**. No new payment outcome was recorded. All original **1,000** entitlement/allocation rows and **800** Paid records remained exact on that copy.

Negative tests rejected **`VERSION_CONFLICT`** and **`SOURCE_CHANGED`**. A deliberately late finalization-audit failure rolled back membership/finalization, version, entitlements, allocations and ledger. Browser tests deliberately lost committed Review, Finalize, Submit and Process responses; each recovered with **two identical requests / one commit**, preserving the same body/key, blocking double-click/dismissal/navigation and retaining reduced-motion support. All mutation tests were confined to the owned copy; its schema/runtime/definer accounts are removed. Five expected workflow notifications were verified individually, with all **4,551** original notification rows exact. [Early/return proof](../../output/pay-flow-2-primary-20261027/fixture-early.json), [negative/rollback proof](../../output/pay-flow-2-primary-20261027/fixture-negative.json), [copy preservation](../../output/pay-flow-2-primary-20261027/fixture-preservation.json), [original financial/notification rows](../../output/pay-flow-2-primary-20261027/fixture-original-row-proofs.json), [cleanup](../../output/pay-flow-2-primary-20261027/cleanup-fixture.json).

Matched actual-primary before/after images use the same Review revision 3, roles, closed secondary sections and 900-pixel height. Scholar identities/account names are masked. Primary was not reverted.

| CSS width | Coordinator before / after | Staff before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/pay-flow-2-primary/primary-before-coordinator-1440.png) / [After](../../output/playwright/pay-flow-2-primary/primary-coordinator-review-1440.png) | [Before](../../output/playwright/pay-flow-2-primary/primary-before-staff-1440.png) / [After](../../output/playwright/pay-flow-2-primary/primary-staff-review-1440.png) |
| 1024 | [Before](../../output/playwright/pay-flow-2-primary/primary-before-coordinator-1024.png) / [After](../../output/playwright/pay-flow-2-primary/primary-coordinator-review-1024.png) | [Before](../../output/playwright/pay-flow-2-primary/primary-before-staff-1024.png) / [After](../../output/playwright/pay-flow-2-primary/primary-staff-review-1024.png) |
| 820 | [Before](../../output/playwright/pay-flow-2-primary/primary-before-coordinator-820.png) / [After](../../output/playwright/pay-flow-2-primary/primary-coordinator-review-820.png) | [Before](../../output/playwright/pay-flow-2-primary/primary-before-staff-820.png) / [After](../../output/playwright/pay-flow-2-primary/primary-staff-review-820.png) |
| 375 | [Before](../../output/playwright/pay-flow-2-primary/primary-before-coordinator-375.png) / [After](../../output/playwright/pay-flow-2-primary/primary-coordinator-review-375.png) | [Before](../../output/playwright/pay-flow-2-primary/primary-before-staff-375.png) / [After](../../output/playwright/pay-flow-2-primary/primary-staff-review-375.png) |
| 320 | [Before](../../output/playwright/pay-flow-2-primary/primary-before-coordinator-320.png) / [After](../../output/playwright/pay-flow-2-primary/primary-coordinator-review-320.png) | [Before](../../output/playwright/pay-flow-2-primary/primary-before-staff-320.png) / [After](../../output/playwright/pay-flow-2-primary/primary-staff-review-320.png) |

All five stages were exercised on the owned 835-person workflow for both roles and **1440 / 1024 / 820 / 375 / 320** layouts. The final shared CSS was rechecked on both roles at all five widths and native zoom before installation. Final primary width checks explicitly verify actual CSS width and **DPR 1**, rather than only requested viewport settings. Tables retain local scrolling; no page/panel overflow was found.

Native Chrome **200%**, viewport emulation disabled, passed for both roles at **712×424 CSS pixels / DPR 2**. Keyboard search and permitted form open/Escape cancellation passed without submission. Final stage labels fit their columns instead of splitting mid-word. Captures use the rendered viewport without resizing. Zoom returned to 100%; task windows closed. The ui-ux-pro-max and Playwright workflows were used. Full assistive-technology/WCAG certification is not claimed. [Coordinator native](../../output/pay-flow-2-primary-20261027/browser-results/native-primary-coordinator.json), [Staff native](../../output/pay-flow-2-primary-20261027/browser-results/native-primary-staff.json), [200% Coordinator image](../../output/playwright/pay-flow-2-primary/native-primary-coordinator-tracker.png), [200% Staff image](../../output/playwright/pay-flow-2-primary/native-primary-staff-tracker.png).

[Normal commands](../../output/pay-flow-2-primary-20261027/checks-main.json), [unit log](../../output/pay-flow-2-primary-20261027/unit-final.log), [13 regression commands/exits](../../output/pay-flow-2-primary-20261027/regressions-all-latest.json), [Review recovery](../../output/pay-flow-2-primary-20261027/browser-results/review-progress.json), [Finalize recovery](../../output/pay-flow-2-primary-20261027/browser-results/finalize-progress.json), [Submit recovery](../../output/pay-flow-2-primary-20261027/browser-results/submit-progress.json), [Process recovery](../../output/pay-flow-2-primary-20261027/browser-results/process-progress.json), [both-role current payment summaries](../../output/pay-flow-2-primary-20261027/financial-comparison.json).

Staging caught a missing test-fixture field, direct Payment Recording's deferred metadata read, and stage-label wrapping in narrow content at native zoom. A late headed capture had unintended 50% zoom and was excluded; final responsive captures were repeated with explicit CSS-width/DPR assertions. An exploratory settings navigation was rejected in an isolated context; native zoom used the dedicated persistent task profile. The first copy comparison detected legitimate workflow notifications; it was replaced with exact expected-action/source/actor checks and original-row preservation, not a blanket table exemption. No validator, financial pin, permission, timeout or test bound was weakened.

Final comparison preserves all starting business values/counts, schema objects, 66 journal rows/timestamps, accounts/password hashes/roles, runtime grants, original commands and all original audits at full datetime precision. This includes all academic/annual/import/document/prior-approval evidence, official Masterlists/activations, the original PAY-003 deferral/review, financial sources, frozen payrolls, allocations, Treasury and reconciliation history.

Every **800 Paid row** remains exact: **two dated 2026-10-24 and 798 dated 2026-10-26**. PAY-003 remains Review v3 with **834 saved entries / zero allocations / zero payments**. All **20,232 original audits** remain exact; four task logins/four logouts append only eight authentication events (**20,240 total**); sessions **91 → 95**, with ordinary last-seen/revocation/rate-limit activity. This is qualified authentication activity, not zero database writes. All four task sessions and original saved cookies are revoked; logout returned **204**, subsequent probes **401**. The user's separate sessions were untouched. [Full preservation](../../output/pay-flow-2-primary-20261027/final-preservation.json), [delivery/revocation](../../output/pay-flow-2-primary-20261027/delivery.json).

The **76 paused LAN-R2A artifacts and 16 earlier ML-1 investigation files** remain exact. Retained/LAN listeners preserve their starting owners; no operational LAN database, service or configuration changed. This is not an exhaustive fresh inventory of every retained database.

Review artifacts: [patch](../../output/pay-flow-2-primary-20261027/PAY_FLOW_2_PRIMARY.patch), [source ZIP](../../output/pay-flow-2-primary-20261027/candidate-source.zip), [compatible review build](../../output/pay-flow-2-primary-20261027/compatible-build.zip). Patch checking and an independent exact-byte apply round trip passed against the actual dirty baseline. Archives exclude credentials, keys, `.env` and records; the build omits server PDF/template assets and is not a complete LAN release. Any rollback must preserve later legitimate edits/data; no database restoration, downgrade or history deletion is appropriate for this UI change.

Remaining limits: the tracker is a read snapshot and does not certify readiness, office policy, actual payment or automatic post-midnight finalization. Unknown/legacy timing remains unavailable. Positive transitions and failures were proven only on the disposable copy. Long reviews/financial operations and narrow tables retain their existing loading/recovery/scroll behavior. Full AT/WCAG, cold-start/load/concurrency, overnight office acceptance and operational recovery remain outside this task; the existing chunk warning remains. LAN-R2A may consider this UI package only through separately authorized release inclusion/recovery/office acceptance. No financial-policy acceptance follows from the display.

**Stopped after PAY-FLOW-2 read-only implementation, primary verification and reporting. Early finalization remains blocked pending approved policy and a separately authorized safe contract. No primary payroll, payment, approval, Masterlist, source record or deadline was changed; no LAN-R2A resumption occurred.**
