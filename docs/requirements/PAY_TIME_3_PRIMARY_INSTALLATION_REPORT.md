# PAY-TIME-3 — Controlled primary synthetic installation

27 October 2026, Philippine time. **Installed and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/#payouts). F57 and the matching accepted PAY-TIME-2 source are active. Timed-policy activation remains disabled: the rule table has zero rows, and timed Save is unavailable without documented authority.** No timed payroll, policy approval, financial outcome or payroll workflow command was submitted on primary.

**PAY-003 remains Draft / revision 4**, with **834 included, one existing deferral, 1,000 blocked and zero awaiting review**. Its original **27 October whole-day cutoff** is unchanged. All **800 Paid records** retain their complete evidence: **two dated 24 October / 798 dated 26 October**. PAY-002 retains **200 Pending** outcomes. The published 835-member Masterlist is unchanged. LAN-R2A remains paused.

The user separately proposed **12 PM, 3 PM, 5 PM (default), 7 PM and 11:59 PM**, Asia/Manila. Those choices are recorded below and in a task-local proposal artifact only. They were **not inserted as an office-approved rule** and did not expand this installation.

## Actual baseline and installation boundary

This follows the explicit PAY-TIME-3 primary technical-installation authorization and the accepted [PAY-TIME-2 foundation](PAY_TIME_2_VERSIONED_FIVE_PM_REPORT.md). Office-policy approval, physical receipt-time authority and operational financial decisions remain separate.

| Item | Before → final |
|---|---| 
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Primary database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic / loopback 5173 / 3001** |
| Controller / API / Vite | **63232 / 59864 / 8080 → 44080 / 24684 / 55872** |
| Schema | **149 tables / 66 migrations → 150 tables / 67 migrations** |
| PAY-001 | **Processed v805 / 800 Paid / zero Pending**, unchanged |
| PAY-002 | **Processed v5 / 200 Pending**, unchanged |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Draft v4**, unchanged |
| Official Batch 1 | **Published v415 / 835 active members / 167 retained removals**, unchanged |
| Semester deadline | Recorded **31 October / revision 3**, unchanged |

The earlier user return from Review v3 to Draft v4 at **08:29:38 on 27 October** was already part of this task’s starting state. Its audit, durable command, notification and saved review evidence were retained. No later business delta was found during PAY-TIME-3. The original 834 saved review entries and existing deferral were preserved; Draft’s displayed included roster remains an authoritative assessment, not a newly frozen payroll. The recorded 31 October deadline remains application evidence; this task does not establish its underlying office authority.

Every protected application source input matched the saved PAY-TIME-2 baseline. All **22 candidate files** matched their reviewed hashes. No installed PAY-NEW-4 source difference required merging, and no newer source was overwritten. Isolated staging at **`C:/xampp/htdocs/ldss_paytime3_primary_stage_20261027`** used the actual dirty workspace, with fresh baseline at **`C:/xampp/htdocs/ldss_paytime3_baseline_20261027`**. Private configuration was excluded; Git HEAD and old review builds were not substituted. [Inspection](../../output/pay-time-3-primary-20261027/inspection.json), [preflight](../../output/pay-time-3-primary-20261027/preflight.json), [1,369 starting hashes](../../output/pay-time-3-primary-20261027/files-before.json).

## Recovery, migration and coordinated activation

Installed BACKUP-1 passed three fresh encrypted captures and complete restorations into newly owned isolated targets:

| Checkpoint | SQL bytes | Encrypted bytes | Complete restore |
|---|---:|---:|---|
| Before staging/mutation acceptance | **99,301,763** | **22,618,335** | **149 tables / 66 migrations** |
| Immediately before installation, primary ports quiet | **99,302,681** | **22,618,880** | **149 tables / 66 migrations** |
| Installed primary schema after acceptance/signout | **99,309,057** | **22,621,220** | **150 tables / 67 migrations** |

Each verified complete values/counts/checksums, migration journal, columns, indexes, constraints, foreign keys, triggers, executable views and rejection probes. Restore schemas/accounts were removed. Nothing was restored over primary. Existing source-schema READ locks briefly serialize writes during capture; no server-wide global lock, key rotation, format change or finite-bound increase occurred. Keys and archives remain restricted. Different snapshots include ordinary authentication/schema changes and are not claimed byte-identical. [Initial recovery](../../output/pay-time-3-primary-20261027/recovery.json), [quiet recovery](../../output/pay-time-3-primary-20261027/activation-recovery.json), [installed-schema recovery](../../output/pay-time-3-primary-20261027/post-install-recovery.json).

Fresh isolated F57 application preserved every original window field and all original journal rows/timestamps. Repeated application was a no-op; invalid policy evidence was rejected. It inserted no rule. [Migration rehearsal](../../output/pay-time-3-primary-20261027/migration-rehearsal.json).

The installed migration is **`20261027010000_f57_payroll_cutoff_policy.sql`**, SHA-256:

`b818ddafd1a38b91b421b6df0bcef9d1b8f7453b97635502afa8dd460946b71e`

It was applied at **09:11:49.854869 Philippine time** through the existing migration function and its database migration lock, after verifying the exact target and all 66 preceding checksums. Only F57 was pending. It adds the immutable `payroll_cutoff_rule_versions` table, six window timing/authority columns, checks, foreign key and rule update/delete rejection triggers. Existing window versions receive **`whole_day_v1` / Asia/Manila**, with selected-time, stored timed-UTC and rule fields NULL. Original dates, versions, actors, reasons and timestamps remain exact. No existing window revision was rewritten as a timed cutoff. [Application and checksum](../../output/pay-time-3-primary-20261027/migration-application.json).

The only runtime grant addition is **SELECT on `payroll_cutoff_rule_versions`**, without grant option, for the existing restricted runtime. Every pre-existing grant remains exact. No business permission or application account changed. Runtime cannot issue policy approvals through this new grant; no policy-writing endpoint exists.

All normal checks, disposable regressions, source parity, browser checks and fresh preservation gates preceded promotion. Two quiescence samples found no modifying/locking primary transaction. Only the freshly verified synthetic controller tree was stopped. After both ports were confirmed quiet, the second recovery gate passed, F57 and the minimum grant were applied, and the matching **22 source files** were installed by atomic per-file rename. The unchanged **`node scripts/localhost-5173-profile.mjs synthetic`** launcher restarted the primary. Both 3001 and 5173 pass strict schema/configuration readiness. Configuration, flags, dependencies and launcher bytes remain unchanged. [Maintenance](../../output/pay-time-3-primary-20261027/maintenance.json), [quiet preservation](../../output/pay-time-3-primary-20261027/quiet-preservation.json), [installed hashes](../../output/pay-time-3-primary-20261027/promoted-files.json), [startup](../../output/pay-time-3-primary-20261027/startup.json).

## Preserved legacy behavior and inactive timed policy

| Existing window | Original cutoff | Normal finalization from, Philippine time |
|---|---|---|
| PAY-001 | **21 October, whole day** | **22 October 00:00** |
| PAY-002 | **23 October, whole day** | **24 October 00:00** |
| PAY-003 | **27 October, whole day** | **28 October 00:00** |

PAY-003’s boundary remains **27 October 16:00 UTC** for normal finalization. Its Tracker displays the accepted whole-day presentation, not 5 PM. Early review, finalization, official submission, processing and actual payment retain their independent guards.

The installed configurable identity is `manila_time_v1`; the fixed `manila_1700_v1` alias and legacy `whole_day_v1` remain distinct. The new form proposes **17:00**, but shows **“Documented office cutoff rules are required before timed creation.”** Save remains disabled even after valid prospective dates are entered. The actual rule reader returns NULL, and direct database inventory confirms **zero rules**. On the disposable target, the real Coordinator timed request returned **409 / `CUTOFF_RULE_UNAVAILABLE`**; Staff returned **403**. No primary command was used to demonstrate rejection.

Existing date-only API commands retain their old whole-day semantics for compatibility. This installation does not claim that all legacy creation contracts were disabled or that an office policy was activated. No new batch was created by this task.

Original source functions and installed functions were compared within the same consistent read-only primary snapshot, using the restricted runtime and fresh authorization. All decisions, fingerprints, source hashes and form projections matched for **1,835 PAY-001 assessments, 200 PAY-002 assessments and 1,835 PAY-003 assessments**. These counts overlap across batches and are not frozen roster sizes. Both roles’ four existing payment-summary responses are byte-identical before/after. [Actual primary source parity](../../output/pay-time-3-primary-20261027/primary-source-parity.json), [financial comparison](../../output/pay-time-3-primary-20261027/financial-after.json).

## Tests and interface acceptance 

| Validation | Result |
|---|---|
| Lint, typecheck, build, secrets | All normal staged commands exit **0** |
| Unit suite, one worker | **134 files / 903 tests passed** |
| Existing disposable regressions | **Eight groups passed:** Masterlist drafts/workflow/amendments; Registry/main payroll/Treasury/parity; historical/omitted payroll/import; Recording; reconciliation; financial reports |
| Current-copy acceptance | **Four groups passed:** original-source parity, no-rule/role rejection, both-role payment reads and full business preservation |
| Staged and primary UI | Both roles, five widths, keyboard/cancel/focus and native 200% passed |

The first financial-report run passed its output, source, rollback and reconciliation checks but then failed the existing `paidIdentity` assertion in the outer helper. The preceding closure/correction race permits an Unclaimed correction to win; a later unconditional assumption that a current Paid row remains is inconsistent with that branch. An **unchanged fresh rerun passed**. Both logs are retained. No test assertion, financial pin or production safeguard was changed. Repeatability of this existing helper remains a limitation; this task did not expand into repairing it. [Qualified regression results and original failure](../../output/pay-time-3-primary-20261027/regressions-qualified.json), [normal commands](../../output/pay-time-3-primary-20261027/checks-main.json), [unit log](../../output/pay-time-3-primary-20261027/unit-final.log), [four owned-copy groups](../../output/pay-time-3-primary-20261027/fixture-acceptance.json).

Both Staff and Coordinator passed **1440 / 1024 / 820 / 375 / 320 CSS pixels**, height 900, on staging and actual primary. PAY-003 shows its existing roster and whole-day timing. Coordinator can open/cancel the single existing creation form; default 17:00 is visible and timed Save stays disabled without authority. Staff sees its role explanation and no creation action. No page/tracker/form horizontal overflow occurred; tables retain local scrolling. Keyboard opening, Escape/Cancel, focus restoration and reduced-motion acceptance passed. Primary business-write guards recorded **zero attempts**; audited preview/export links were not invoked.

Both roles also passed **native Chrome 200%**, viewport emulation disabled, **712×424 CSS pixels / DPR 2**, before promotion on the copy and after installation on primary. The time field measures **44.2 CSS pixels**, has its existing visible focus treatment and a PHT/UTC+8 label. Captures use the direct rendered viewport without resizing. Zoom returned to 100% and task windows closed. The installed **ui-ux-pro-max and Playwright skills** were used. Full AT/WCAG certification is not claimed.

| Actual-primary evidence | Before / after |
|---|---|
| Coordinator, desktop | [Before](../../output/playwright/pay-time-3-primary/before-coordinator-1440.png) / [After](../../output/playwright/pay-time-3-primary/after-coordinator-1440.png) |
| Coordinator, 320 px | [Before](../../output/playwright/pay-time-3-primary/before-coordinator-320.png) / [After](../../output/playwright/pay-time-3-primary/after-coordinator-320.png) |
| Existing form / new inactive time selector | [Before](../../output/playwright/pay-time-3-primary/before-form-1440.png) / [After](../../output/playwright/pay-time-3-primary/after-form-1440.png) |
| Staff, desktop | [Before](../../output/playwright/pay-time-3-primary/before-staff-1440.png) / [After](../../output/playwright/pay-time-3-primary/after-staff-1440.png) |
| Native 200% | [Legacy Tracker](../../output/playwright/pay-time-3-primary/native-primary-coordinator-tracker.png) / [Disabled timed Save](../../output/playwright/pay-time-3-primary/native-primary-coordinator-no-rule.png) |

Matched before/after images use the same Draft-v4 state, role and whole-day window; scholar identities are masked. [Coordinator five-width results](../../output/pay-time-3-primary-20261027/browser-results/browser-after-coordinator.json), [Staff results](../../output/pay-time-3-primary-20261027/browser-results/browser-after-staff.json), [native Coordinator](../../output/pay-time-3-primary-20261027/browser-results/native-primary-coordinator.json), [native Staff](../../output/pay-time-3-primary-20261027/browser-results/native-primary-staff.json).

An early financial GET sampled the frontend before startup completed and received connection-refused; accepted reads followed the explicit readiness gate. An exploratory native run reached sign-in while switching saved state between the copied database and primary; the original primary task token still returned authorized reads. Accepted runs start from a blank page before importing the target’s state. A native collector initially saved new task images in the preceding task’s directory; those uniquely named images were moved to this task’s folder and its collector corrected. These were acceptance-orchestration corrections, not authentication, timeout or application changes.

## Proposed five-time configuration: subsequent authorization required

The following is **the user’s proposal**, not a recorded or independently verified Scholarship Office approval:

| Proposed choice | Canonical local value | UTC time on the same date |
|---|---|---|
| **12:00 PM** | `12:00:00` | `04:00:00Z` |
| **3:00 PM** | `15:00:00` | `07:00:00Z` |
| **5:00 PM — default** | `17:00:00` | `09:00:00Z` |
| **7:00 PM** | `19:00:00` | `11:00:00Z` |
| **11:59 PM** | `23:59:00` | `15:59:00Z` |

All use **Asia/Manila / UTC+8**. [Proposal record](../../output/pay-time-3-primary-20261027/proposed-office-configuration.json). None of the earlier fictional 3/5/6 PM test rules was carried into primary.

Under the installed contract, a chosen minute is an **inclusive instant at second zero**. In particular, **11:59 PM means 23:59:00.000000**, not the end of that minute or an old whole-day cutoff. Normal finalization’s time condition can pass from **23:59:00.000001**. The office must explicitly approve that interpretation. A different end-of-minute rule would need a reviewed contract change before configuration.

To configure the proposal on primary synthetic UAT in a subsequent task:

1. **Obtain explicit, separately recorded configuration authorization.** Identify the exact synthetic target/cycle, purpose, five permitted values, default, validity dates, source location, approval reference, named approving authority and approval timestamp. Actual financial use requires documented applicable office authority; a technical permission, this proposal or a correctly shaped row is insufficient. Any purely synthetic policy simulation must be separately authorized and unmistakably labelled, without claiming office approval.
2. **Approve the policy semantics and evidence disposition.** Confirm inclusive instant/strict-after microseconds, timezone, semester-deadline interaction, supersession/revocation and same-day date-only receipts. Encoding time is not physical receipt time. The current foundation keeps uncertain same-day receipts awaiting review; a source-backed receipt-time/attestation writer remains a separate, unimplemented contract.
3. **Authorize a reviewed policy-recording procedure.** There is currently no application policy-issuance endpoint, and the runtime intentionally has only SELECT. A separately reviewed bounded operator procedure or new audited command must validate the authority/source, exact cycle and next immutable revision; record these five `HH:mm:00` values, validity range, `Asia/Manila`, `inclusive_microsecond_v1`, approval identity/time and reference/location; provide durable audit and recovery evidence. Do not improvise an unaudited manual INSERT, expand runtime policy-write grants or infer approval from Coordinator access.
4. **Rehearse on a fresh disposable copy first.** Verify those exact five choices, default 17:00, invalid choices, rule/source/version races, canonical UTC, strict boundaries, date-only receipt uncertainty, rollback, audit and exact retry. Confirm all existing whole-day windows remain pinned. Obtain the separate go/no-go decision, fresh backup/complete restoration and then-current preservation inventory before any authorized primary rule write.
5. **Verify the configured read projection before creating anything.** Confirm rule revision/hash/source and actual Save availability. Recording a rule does not authorize a payroll, deadline extension, finalization or payment. Creation requires its own explicit batch/date/time confirmation and current source/version checks. PAY-001/PAY-002/PAY-003 must keep their original policies; no automatic amendments are permitted.

This is the required follow-up procedure and approval boundary, not an executed policy-write plan. **PAY-TIME-3 ends with zero rules.**

## Preservation, exact source boundary and stop

Exactly the accepted **22-file package** was installed: **18 existing changes / four additions**. It comprises F57; `scripts/migration-lib.mjs`; `server/schema-manifest.ts`; the two new cutoff modules; payout submission rules/service; requirement timing rules/service; semester eligibility sources; OVR managed/rules/service/detail modules; Payroll Progress, Candidates, Submission Windows, Requirement Timing and command-recovery presentation; and the new cutoff tests. The [manifest](../../output/pay-time-3-primary-20261027/candidate-files.json) is authoritative for exact paths and hashes. No PAY-TIME-3 application correction was added.

**1,351 of 1,369 starting inputs remain exact**, with none missing. The 18 declared existing files are the only changes; four package files, this report and task evidence are additions. All **310 retained distribution files** remain exact. The fresh build matches the accepted PAY-TIME-2 compiled build byte-for-byte; archives were not used as installers. No dependency, font, CSS, `.env`, flag, launcher, auth module, role mapping or payment writer changed. [Build/source verification](../../output/pay-time-3-primary-20261027/build-verification.json), [archive verification](../../output/pay-time-3-primary-20261027/package-verification.json).

Final complete comparison proves every original business-table value/count, original window field, schema object and original journal timestamp remains exact. Expected technical additions are F57’s structures/default metadata, its journal row and the single SELECT grant. It covers **1,835 scholars / 14 accounts**, annual/academic/import/document/prior-approval records, the published 835-member list, **3 Masterlists / 2,002 stored entries / 1,835 activations**, frozen payrolls, entitlements, allocations, deferrals, reconciliation and every payment/date.

All **20,247 starting audit rows** remain exact at full datetime precision. Only two task logins and two logouts were appended: **20,251 final audits / sessions 99→101**, with normal session/rate-limit activity. No business command, export audit, approval renewal, receipt modification, payroll creation or deadline change was submitted on primary. Both task accounts signed out with **204**, followed by **401**; their original saved cookies also return 401. No task operation targeted the user’s separate session. [Final preservation](../../output/pay-time-3-primary-20261027/final-preservation.json), [delivery/revocation](../../output/pay-time-3-primary-20261027/delivery.json).

Owned fixture/recovery targets and technical accounts were removed; temporary 3026/3027/3028 ports are quiet. Primary and all retained/LAN listener owners match their expected profiles. **76 paused LAN-R2A artifacts and 16 earlier ML-1 evidence files** remain exact. This is not a new exhaustive inventory of every retained database. [Fixture preservation](../../output/pay-time-3-primary-20261027/fixture-preservation.json), [cleanup](../../output/pay-time-3-primary-20261027/cleanup-fixture.json).

Review artifacts: [source ZIP](../../output/pay-time-3-primary-20261027/candidate-source.zip), [compatible review build](../../output/pay-time-3-primary-20261027/compatible-review-build.zip). They exclude credentials, keys, `.env`, database records and private evidence. The review build is **not a complete LAN installer**. No rollback was needed. A future rollback must coordinate compatible API/UI with the retained **67-schema journal**, preserve later legitimate data and BACKUP-1, and pass strict readiness. Blindly restoring the old 66-manifest source would be incompatible; do not drop F57, rewrite migration history or restore an older database over current records.

The existing build chunk warning, multi-second full eligibility assessment, financial-test race assumption, full assistive-technology/load/concurrency/office acceptance and physical-time evidence contract remain limits. This task supplies no new latency or capacity benchmark. Operational LAN needs separately authorized complete packaging, 66→67 target migration/grant rehearsal, recovery, policy/source review, pilot-boundary classification and witnessed office acceptance. LAN-R2A was not resumed.

**Stopped after primary technical installation, read-only acceptance, preservation and reporting. Timed-policy activation remains disabled. The user’s five choices await separate authorization; PAY-003 remains Draft v4 with its whole-day cutoff, and all financial evidence is preserved. No operational LAN change occurred.**
