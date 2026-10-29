# PAY-TIME-4 — Primary synthetic configurable cutoff activation

27 October 2026, Philippine time. **Activated for controlled synthetic UAT only on [localhost:5173](http://127.0.0.1:5173/#payouts?cycle=829ae3dc-9b49-4d88-9dfe-0a7250b164c0). One immutable revision permits 12:00, 15:00, 17:00 (default), 19:00 and 23:59 Asia/Manila. No primary payroll was created. PAY-001, PAY-002 and PAY-003 retain their original whole-day cutoffs. All 800 Paid records and dates remain exact.**

This is the user's explicit **synthetic testing authorization, not Scholarship Office financial-policy approval**. The stored reference and displayed rule say **SYNTHETIC UAT ONLY / NO office approval**. Accepted [PAY-TIME-3](PAY_TIME_3_PRIMARY_INSTALLATION_REPORT.md), PAY-TIME-2 and earlier implementations remain intact. LAN-R2A remains paused; operational LAN was not changed.

## Fresh target and preserved starting state

| Item | Verified observation |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306 |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Application | Existing synthetic / loopback 5173 and 3001 |
| Controller / API / Vite | **44080 / 24684 / 55872**, commands and ancestry unchanged; no restart |
| Schema | **150 tables / 67 migrations**, all original SQL hashes and applied timestamps unchanged |
| F57 SHA-256 | `b818ddafd1a38b91b421b6df0bcef9d1b8f7453b97635502afa8dd460946b71e` |
| Working context | TWO-BATCH-YEAR / TWO-FIRST; TWO-BATCH-CYCLE, open / v2 |
| Cycle ID | `829ae3dc-9b49-4d88-9dfe-0a7250b164c0` |
| Existing deadline | **31 October / revision 3**, unchanged; its independent office authority is not established by this task |
| Starting cutoff rules | **Zero** |
| PAY-001 | Processed / v805 / **800 Paid, zero Pending**; whole-day **21 October** cutoff |
| PAY-002 | Processed / v5 / **200 Pending**; whole-day **23 October** cutoff |
| PAY-003 | **Draft / v4 / 834 included, 1 deferred, 1,000 blocked, zero awaiting review**; whole-day **27 October** cutoff |
| Official Batch 1 | Published / v415 / 835 active members, 167 retained removals |

PAY-003 is `7f337596-c36d-41d7-b715-368fd4633b1d`; its earliest finalization remains **28 October 00:00 PHT**, subject to all other guards. No allocation or payment was created for it. The baseline includes a separate Coordinator login at **10:02:24.227 PHT**, after PAY-TIME-3 completion. It was preserved; no intervening business delta was found. [Inspection](../../output/pay-time-4-primary-20261027/inspection.json), [preflight](../../output/pay-time-4-primary-20261027/preflight.json), [starting hashes](../../output/pay-time-4-primary-20261027/files-before.json).

## Recovery and isolation

The actual dirty workspace supplied staging at `C:/xampp/htdocs/ldss_paytime4_primary_stage_20261027`, with a saved baseline beside it. Private configuration was excluded. Git HEAD and older builds were not substituted. All **1,374 starting protected files**, including **310 retained distribution files**, remain byte-identical.

Installed BACKUP-1 completed three encrypted captures and complete isolated restorations:

| Checkpoint | SQL bytes | Encrypted bytes | Result |
|---|---:|---:|---|
| Before source work and mutation tests | 99,309,519 | 22,621,453 | Passed |
| Immediately before primary activation | 99,310,437 | 22,621,887 | Passed |
| After activation and task signout | 99,316,058 | 22,624,463 | Passed, including the populated rule/audit/ledger |

Each restored all **150 tables**, complete values/counts/checksums, journal, columns, indexes, foreign keys/checks, triggers, executable views and rejection probes. Newly owned recovery targets/accounts were removed. Nothing was restored over primary. Existing finite BACKUP-1 bounds, source-schema READ locks and restricted key/archive custody remain. No global lock, limit increase, migration or service restart was used. Distinct snapshots include the expected authentication/configuration events and are not claimed identical.

The final archive SHA-256 is `c7ba37a00e678b5da18ca4366c373c0ee3d88b963fdddb8c2f8999a5cf95056f`. [Initial recovery](../../output/pay-time-4-primary-20261027/recovery.json), [activation recovery](../../output/pay-time-4-primary-20261027/activation-recovery.json), [final recovery](../../output/pay-time-4-primary-20261027/final-recovery.json).

## Truthful synthetic rule and operator procedure

F57's generic authority-reference/source/actor/time fields can represent this delegated synthetic configuration without asserting an office-issued policy. No office-type enum or signed-policy claim is required by the schema. The immutable reference is:

`SYNTHETIC UAT ONLY / PAY-TIME-4 user authorization / NO office approval / default 17:00`

The source location retains the [exact user authorization](../../output/pay-time-4-primary-20261027/authorization.txt) and its SHA-256, `7f9a4080914646064a7511c9190cbc039e0f2da1fa743c13b2af85581f6323f4`. The audit and durable result explicitly record `kind: synthetic_uat_test` and `officeApproval: false`.

| Installed rule | Value |
|---|---|
| Revision / scope | **1**, exact current UAT cycle; **27–31 October 2026**, inclusive local dates |
| Permitted local times | **12:00:00, 15:00:00, 17:00:00, 19:00:00, 23:59:00** |
| Default | **17:00:00**, retained in the existing form, confirmed request, immutable reference, audit and result |
| Timezone / boundary | `Asia/Manila` / `inclusive_microsecond_v1` |
| Actual recording time | **27 October 10:37:14.378280 PHT**, `2026-10-27T02:37:14.378280Z` |
| Immutable rule hash | `828cb0cc87fd2f90a492f9e0a893af4ac72e2305aff626381266c6107bcea49c` |

The validity range deliberately ends at the existing deadline; no deadline extension or indefinite activation was inferred. The recording operator is the actual Windows principal **`desktop-bpljkrp\admin`**, with its verified SID and database account retained in restricted command/audit evidence. A freshly authenticated task Coordinator supplied the existing `payroll.windows.manage` authority. The user's separate Coordinator account was not impersonated.

The schema's `approved_by` identifies that authenticated **recording actor**, not a Scholarship Office approver. `approved_at` and `recorded_at` contain the actual database-clock time when delegated configuration authorization was recorded. The audit explicitly says that the original user-decision timestamp was **not independently supplied**. It does not invent an earlier signature or decision time. The full operator identity, source hash, exact request and this interpretation are retained atomically.

The new [operator procedure](../../scripts/record-synthetic-cutoff-rule.ts) is a local administrative CLI, not an HTTP issuance route. It accepts only the exact primary synthetic identity or a verified task-owned disposable restore. It validates the real operator, its own reviewed source hash, authorization-file hash, runtime database/account, accepted schema/F57, SELECT-only policy grant, active authenticated session and fresh Coordinator authority. Inside the existing configuration/user transaction it checks the actor version, cycle, deadline, window sequence, validity scope and absence of any previous rule.

It then inserts **one immutable rule, one complete before/after audit and one existing command-ledger result in the same transaction**. A late failure rolls back all three. Same actor/key/body returns the original committed result; changed-payload reuse, new-key duplicate/overlap and stale sources reject. The private command file retains the exact body/key for supported recovery. The CLI uses restricted credential/session files; credentials are not command-line arguments. It grants no runtime write access and bypasses no trigger or constraint.

Invocation is `node --import tsx scripts/record-synthetic-cutoff-rule.ts --command <restricted command file>`. **Do not rerun with a new key or repurpose it as an office-policy issuance tool.** An existing rule or a different target/scope requires separate review. [Reviewed nonsecret command](../../output/pay-time-4-primary-20261027/primary-reviewed-command.json), [activation and audit verification](../../output/pay-time-4-primary-20261027/activation-result.json).

## Time and physical-receipt semantics

For a future selected local cutoff date, the canonical UTC times are:

| PHT | UTC on that same calendar date |
|---|---|
| 12:00 | 04:00:00.000000Z |
| 15:00 | 07:00:00.000000Z |
| 17:00 | 09:00:00.000000Z |
| 19:00 | 11:00:00.000000Z |
| 23:59 | 15:59:00.000000Z |

The exact instant is inclusive; finalization becomes time-eligible **one microsecond later**, with every other financial/source guard still required. **23:59 means 23:59:00.000000**, not the end of that minute. Workstation timezone does not select the canonical boundary. The existing creation command binds local date/time, timezone, rule revision/hash, expected UTC and current versions in its request, audit, window evidence and durable result.

Before-date and after-date receipts retain existing source/timing checks. A date-only receipt on the cutoff date has **unknown physical time** and remains subject to review. Encoding/import/approval/verification times are not substituted. No receipt-time writer, waiver, invented attestation or automatic inclusion/exclusion was introduced. Such unresolved mandatory uncertainty prevents finalization even after the time gate passes.

## Rehearsal, regressions and acceptance

All mutation/failure tests used newly owned protected synthetic copies. The complete operator rehearsal passed **six groups**: target/session/authority/source denials; late audit rollback and concurrent exact commands; immutable rules and runtime denials; four permitted-time Draft creations; same-day receipt uncertainty; and complete other-source/payment preservation. The fifth choice, **23:59**, was created through the real browser on a separate owned copy.

The browser deliberately lost the first success response **after commit**. The progress dialog retained the command, blocked Escape and outside focus, then recovered one original Draft through exact retry. Its retry's parsed payload hash and result matched the original durable ledger; there was **one creation command and one new Draft**, not two. No fixture payment was recorded. [Rehearsal](../../output/pay-time-4-primary-20261027/rehearsal-fixture.json), [browser-copy configuration](../../output/pay-time-4-primary-20261027/rehearsal-browser.json), [lost-response recovery](../../output/pay-time-4-primary-20261027/browser-results/browser-recover.json), [independent ledger/preservation proof](../../output/pay-time-4-primary-20261027/browser-proof.json).

Additional actual API negatives reject stale rule/hash, wrong UTC, stale window/deadline versions, nonzero seconds, wrong timezone and a date outside the deadline. Staff cannot record a rule or create a window. Duplicate/overlapping rules, changed-key payloads and immutable UPDATE/DELETE attempts reject. The runtime remains SELECT-only on `payroll_cutoff_rule_versions`. The owned receipt-date probe restored the original date exactly; its future window correctly reported `WINDOW_NOT_OPEN` first, while the independent finalization-guard probe retained the actual pending count and rejected unresolved uncertainty after the time/opening prerequisites. No clock or primary receipt was changed. [Eight source/boundary negatives](../../output/pay-time-4-primary-20261027/negative-windows.json).

| Final validation | Result |
|---|---|
| Lint, typecheck, build, secrets | All exit **0** on matching isolated staged source |
| Unit suite | **135 files / 920 tests passed**, one worker; includes 17 new operator/boundary cases |
| Existing disposable regressions | Eight groups passed: Masterlist drafts/workflow/amendments, Registry/main payroll/Treasury, historical/omitted, Recording, reconciliation, financial reports |
| Existing source parity | All **1,835 / 200 / 1,835** assessed records for PAY-001/002/003: decisions, fingerprints, form rows and source hashes exact before/after activation |
| Both-role financial GETs | Four payment summaries byte-identical before/after |

The first financial-reports run hit the existing outer `paidIdentity` assertion after its reconciliation race. The unchanged suite passed on a fresh rerun; both results are retained. No pin/assertion was weakened. Early helper issues included the operator's decimal-string sequence comparison, unordered grant inventory, a future-window blocker expectation, a cross-copy cookie filename and an initial check for an explicit `inert` attribute instead of native dialog modality. They were corrected and the affected gates repeated before primary activation. A baseline dependency junction and persistent Chrome profile were needed for source parity/native zoom. [Normal commands](../../output/pay-time-4-primary-20261027/checks-main.json), [unit log](../../output/pay-time-4-primary-20261027/unit-final.log), [initial eight regression results](../../output/pay-time-4-primary-20261027/regressions-masterlist-drafts-masterlist-workflow-masterlist-amendments-registry-historical-recording-reconciliation-financial-reports-latest.json), [unchanged financial rerun](../../output/pay-time-4-primary-20261027/regressions-financial-reports-latest.json), [before source oracle](../../output/pay-time-4-primary-20261027/primary-source-parity-before.json), [after source oracle](../../output/pay-time-4-primary-20261027/primary-source-parity-after.json), [financial parity](../../output/pay-time-4-primary-20261027/financial-after.json).

## Primary UI and screenshots

**Payroll Batches → Create New Payroll Draft** opens the existing single form. All five times are listed and accepted by its native time input; **17:00** is the default. Unsupported **16:00** disables Save. Real date, policy, role and source restrictions remain; browser-required date validation also remains. The label identifies **PHT / UTC+8**. Automation filled valid prospective dates, checked each choice, and **cancelled every primary form**. No primary creation POST was attempted.

Coordinator and Staff passed **1440 / 1024 / 820 / 375 / 320 CSS pixels**, height 900, without page overflow. Staff has the role explanation and no creation action. Coordinator's Enter/Escape/Cancel and focus restoration passed. Native Chrome **200%**, viewport emulation disabled, passed for both roles on the disposable copy and primary at **712×424 CSS pixels / DPR 2**, including the 44-pixel time field and keyboard cancellation. Captures use the rendered viewport without resizing; zoom returned to 100% and task browsers closed. The installed ui-ux-pro-max and Playwright workflows were used. Full assistive-technology/WCAG certification is not claimed.

| Width | Coordinator before / after | Staff after |
|---|---|---|
| 1440 | [Before](../../output/playwright/pay-time-4-primary/before-coordinator-1440.png) / [After](../../output/playwright/pay-time-4-primary/after-coordinator-1440.png) | [Restriction](../../output/playwright/pay-time-4-primary/after-staff-1440.png) |
| 1024 | [Before](../../output/playwright/pay-time-4-primary/before-coordinator-1024.png) / [After](../../output/playwright/pay-time-4-primary/after-coordinator-1024.png) | [Restriction](../../output/playwright/pay-time-4-primary/after-staff-1024.png) |
| 820 | [Before](../../output/playwright/pay-time-4-primary/before-coordinator-820.png) / [After](../../output/playwright/pay-time-4-primary/after-coordinator-820.png) | [Restriction](../../output/playwright/pay-time-4-primary/after-staff-820.png) |
| 375 | [Before](../../output/playwright/pay-time-4-primary/before-coordinator-375.png) / [After](../../output/playwright/pay-time-4-primary/after-coordinator-375.png) | [Restriction](../../output/playwright/pay-time-4-primary/after-staff-375.png) |
| 320 | [Before](../../output/playwright/pay-time-4-primary/before-coordinator-320.png) / [After](../../output/playwright/pay-time-4-primary/after-coordinator-320.png) | [Restriction](../../output/playwright/pay-time-4-primary/after-staff-320.png) |

Before captures show missing-rule rejection, not an older release substituted onto primary. Account names/table cells are masked. [Coordinator checks](../../output/pay-time-4-primary-20261027/browser-results/ui-after-coordinator.json), [Staff checks](../../output/pay-time-4-primary-20261027/browser-results/ui-after-staff.json), [native Coordinator](../../output/pay-time-4-primary-20261027/browser-results/native-primary-coordinator.json), [200% form](../../output/playwright/pay-time-4-primary/native-primary-coordinator-form.png), [native Staff](../../output/pay-time-4-primary-20261027/browser-results/native-primary-staff.json). PAY-003's unchanged whole-day tracker and 834-included roster passed all five widths: [checks](../../output/pay-time-4-primary-20261027/browser-results/tracker-coordinator.json), [desktop](../../output/playwright/pay-time-4-primary/tracker-coordinator-1440.png), [mobile](../../output/playwright/pay-time-4-primary/tracker-coordinator-320.png).

## Exact files, preservation and stop

**Two package additions, zero existing application changes:**

| File | Purpose |
|---|---|
| [scripts/record-synthetic-cutoff-rule.ts](../../scripts/record-synthetic-cutoff-rule.ts) | Reviewed target-bound administrative recording procedure |
| [tests/synthetic-cutoff-operator.test.ts](../../tests/synthetic-cutoff-operator.test.ts) | Authority/target parsing and all five exact UTC/microsecond/receipt-uncertainty boundaries |

This report and task-local evidence/helpers are additional deliverables. All **1,374 protected existing files** remain exact, including every application reader/writer/UI component, migration, permission mapping, financial pin, BACKUP-1 input, dependency, font, private configuration, launcher and retained distribution. The two additions match the verified stage. No UI/server source promotion or runtime restart was needed to display the recorded rule. [Exact package hashes](../../output/pay-time-4-primary-20261027/candidate-files.json), [installation](../../output/pay-time-4-primary-20261027/promoted-files.json).

The final complete comparison preserves all original business values, schema objects, 67 migration rows/timestamps, accounts/password hashes/roles and grants. This includes **1,835 scholars**, **14 accounts**, annual/academic/import/document/prior-approval evidence, official Masterlists/activations, all original windows, PAY-003's deferral/history, frozen payroll sources, entitlements/allocations, reconciliation and complete payment rows. All **800 Paid** records remain exact: **two dated 24 October and 798 dated 26 October**.

The only authorized configuration delta is **one rule + one policy audit + one durable command result**. Every original command row and **20,252 starting audits** remain exact at full datetime precision. Two task logins/two logouts add four ordinary authentication events: **20,257 final audits** including the policy audit. Sessions change **102→104**; all **102 original session rows** also remain exact. Normal task session/rate-limit activity is qualified, not described as zero writes.

Both task logouts returned **204**, subsequent `auth/me` and original saved cookies **401**. The separate user's session was not revoked. Owned fixture/browser/recovery targets and technical accounts were removed; temporary port 3026 is quiet. Primary/retained/LAN listener owners and process ancestry remain exact. The **76 paused LAN-R2A artifacts and 16 earlier ML-1 investigation files** remain exact. This is not a new exhaustive inventory of every retained database. [Final preservation](../../output/pay-time-4-primary-20261027/final-preservation.json), [delivery/revocation](../../output/pay-time-4-primary-20261027/delivery.json), [Coordinator signout](../../output/pay-time-4-primary-20261027/browser-results/signout-coordinator.json), [Staff signout](../../output/pay-time-4-primary-20261027/browser-results/signout-staff.json).

Remaining limits: this bounded rule expires with the recorded 31 October scope. It supplies no office approval, receipt-time evidence, waiver, deadline-extension authority or payment authority. The existing reader checks recorded proof consistency; it does not independently authenticate an external office document. Operational use still requires documented policy/source approval, a supported physical-receipt uncertainty decision, separately authorized complete packaging/pilot classification, target recovery and witnessed office acceptance. No new physical-time writer is authorized here. Load/concurrency, full accessibility and operational recovery certification remain outside this acceptance; the existing build chunk warning and financial race-test limitation remain.

Because the rule/audit/ledger are immutable history, rollback is not deletion or restoration over later records. Any future policy revision, scope change or operational issuance requires separate authorization and a reviewed recording contract. The retained command/source hashes and restricted recovery artifacts provide review evidence, not permission to alter history.

**Stopped after controlled PAY-TIME-4 synthetic configuration, verification and reporting. No new primary payroll, existing cutoff amendment, PAY-003 roster/deferral change, payment, source repair, deadline change, LAN-R2A resumption or operational LAN modification occurred.**
