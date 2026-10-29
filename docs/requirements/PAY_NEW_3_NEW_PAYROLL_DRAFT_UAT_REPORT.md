# PAY-NEW-3 — New payroll draft end-to-end UAT

26 October 2026, Philippine time. **Completed: the existing new-payroll workflow passed through Processed on a newly owned 835-person synthetic fixture, with zero payment outcomes. No task-authored primary business change occurred.** No application correction or new financial writer was required. No primary payroll, payment, deadline, approval, academic or Masterlist command was submitted by this task. LAN-R2A remains paused.

**Intervening primary change:** a different Coordinator account recorded **798 PAY-001 Paid outcomes**, actual dates **26 October**, at approximately **09:26:45–09:26:46 Philippine time** during final reporting. Its records were preserved. PAY-001 is now **800 Paid / zero Pending**; PAY-002 remains **200 Pending**. The original two Paid records dated **24 October** remain exact. This is recorded application evidence, not independent certification of release authority.

This verifies the accepted [PAY-NEW-2 application](PAY_NEW_2_CORRECTION_REPORT.md), [ML-1.2](ML_1_2_BULK_CONFLICT_REMOVAL_REPORT.md) and [BACKUP-1 recovery tooling](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md). Fictional cohort results below are acceptance evidence, not a determination that all 835 actual primary scholars are payable.

## Verified primary and recoverable checkpoint

| Item | Starting and final observation |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306 |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Profile / frontend / API | synthetic / loopback 5173 / 3001 |
| Controller / API / Vite | **34892 / 53616 / 60116**, unchanged; no restart |
| Current official Batch 1 | `a6f45315-4b8b-46f8-b91d-bedc58cd6cc2`, **Published / v415 / 835 active members**, 167 retained removals |
| Academic context | TWO-BATCH-YEAR / TWO-FIRST; cycle TWO-BATCH-CYCLE, open / v2 |
| Schema | **149 tables / 66 migrations**, original SQL hashes and applied timestamps |
| Existing payrolls | Both remain processed. PAY-001: **2 Paid / 798 Pending → 800 Paid / zero Pending**, separate Coordinator operation. PAY-002: **200 Pending**, unchanged |

The actual dirty source matched accepted package hashes. Isolated staging at `C:/xampp/htdocs/ldss_paynew3_primary_stage_20261026` used that source, excluding private configuration; neither Git HEAD nor an old distribution was substituted. All **1,349 starting inputs**, including **310 retained distribution files**, remain exact. Configuration, feature flags, launcher, dependencies, permissions and grants are unchanged. [Inspection](../../output/pay-new-3-primary-20261026/inspection.json), [preflight](../../output/pay-new-3-primary-20261026/preflight.json), [starting hashes](../../output/pay-new-3-primary-20261026/files-before.json).

Before mutations on any test fixture, installed BACKUP-1 captured **91,008,878 SQL bytes / 20,391,877 encrypted bytes**, SHA-256 `22f8c7e73b0f66697c6879d5b232e5c0d80e469b0f98c390d32d37169198600b`. Complete restoration into a newly owned isolated target passed all table values/counts/checksums, journal, schema inventory, indexes, foreign keys/checks, triggers, executable views and rejection probes. The recovery target/account were removed. Nothing was restored over primary. Existing source-schema READ locks briefly serialize writes; services remained running. Archive/key custody and finite BACKUP-1 bounds are unchanged. This checkpoint predates the separate 798-payment operation; it must not be restored over those later records. A future primary walkthrough needs a then-current verified checkpoint. [Recovery evidence](../../output/pay-new-3-primary-20261026/recovery.json).

All **1,835** original saved approval hashes reproduce their snapshots; all approvals remain usable, including **835/835** through PAY-NEW-2's initial-publication compatibility proof. Both roles' actual API reads checked all 835: published/Active, requirements Complete, unassigned and not declared payable, with no unrelated historical-source blockers. COR retains its individual verification; COG retains its prior-attestation basis without invented prior-year placement. [Approval comparison](../../output/pay-new-3-primary-20261026/approval-summary.json), [both-role API checks](../../output/pay-new-3-primary-20261026/http-oracles-before.json), [document/source checks](../../output/pay-new-3-primary-20261026/representative-summary.json).

## Deadline authority and actual creation path

The recorded extension is still **23 October → 31 October / revision 3**. The deadline row is timestamped **07:39:03.482**, with concluding audit **07:39:03.484**, 26 October Philippine time. Its separate actor has Coordinator authority; matching history, audit and durable `payroll.submission.extend-semester` command exist. The recorded reason is **“Mayor said.”** No supporting signed/source office authorization was supplied or established by this UAT. A successful authorized software command establishes the recorded configuration, not independent office-policy approval. **31 October remains an unapproved operational assumption for this assessment.** No primary extension or backdating occurred. [Authority finding](../../output/pay-new-3-primary-20261026/deadline-authority.json); exact account/command details remain in restricted evidence.

The existing path works:

**Payroll → Period, submission windows & administration → Create New Payroll Draft & semester submission windows → Create New Payroll Draft.**

It uses the unchanged Coordinator-only `POST /api/v1/payout-cycles/:id/submission-windows/open-window`. It atomically creates the numbered batch, initial Draft event, submission window/version, audit and retry result. The UI distinguishes this from **Set up previously approved payroll batch**, the processed batch status, **Payment Recording** and **Individual Payments**. Primary's read-only availability permits prospective window setup under its recorded configuration; the next number would follow the existing two batches. No primary form was submitted.

## Disposable cohort and exact assessment counts

The owned fixture reproduced Excel import → batch COR verification → prior-batch approval → official Masterlist publication for **835 fictional scholars**, including New/Continuing classifications and **380 supported course-pending exceptions**. Genuine primary identities, records and credentials were not copied into it. Its two normal semester mappings and explicitly **fictional authorized deadline** were fixture configuration, not a change to primary's one-term historical exception.

| Tested state | Matching | Eligible | Blocked | Already allocated |
|---|---:|---:|---:|---:|
| New independent PAY-001 Draft, original fixture sources | **835** | **835** | **0** | **0** |
| One deliberately changed fictional identity source | **835** | **834** | **1** | **0** |
| Second Draft PAY-002 after first-batch allocations | **835** | **0** | **835** | **835** |

Blocked and already allocated overlap in the last row; these are not additive categories. The source-change probe was restored exactly. No historical setup/ownership was attached to the new cohort. Its own window, official membership, original approval and current sources supplied assessment. Separate historical/omitted and main-payroll regressions prove old source ownership, omission rules, already-paid and allocation reservations remain enforced. Primary PAY-001/PAY-002 retain their original 1,000-person frozen/source history; the later external payment operation is qualified below. [Initial cohort](../../output/pay-new-3-primary-20261026/cohort-assessment.json), [source-change counts](../../output/pay-new-3-primary-20261026/negative-cohort-assessment.json), [second-batch protection](../../output/pay-new-3-primary-20261026/second-batch-protection.json).

A Coordinator browser created the additional fictional **PAY-002** with exactly one existing open-window POST. The form used the next non-overlapping opening/cutoff; cancelling at all five widths made no change. Creation did not process a batch or record payment. Repeated/concurrent creation commands returned one result; a reused key with changed input and a stale sequence rejected. A late audit failure rolled back the batch, window and window version. [Browser creation](../../output/pay-new-3-primary-20261026/browser-results/browser-fixture-window.json).

## Forward transitions, failures and financial integrity

The full 835-person fixture completed **Draft → candidate preparation → Review → Finalized → Submitted → Processed**. Revision advanced **1→2→3→4→5**. Finalization created exactly **835 entitlements / 835 allocations / one frozen roster**; processing retained **835 Pending / zero Paid / zero payment records**, totaling **PHP 4,175,000.00 pending**. The additional PAY-002 remained Draft. No payment outcome was recorded in this forward UAT. Existing regression suites exercise payment outcomes only on their own disposable targets.

The whole-day cutoff also gates **Submit Payroll for review**, not only later financial submission. The server returns **`CUTOFF_NOT_REACHED`** on the cutoff day and the UI explains preview now / review after cutoff. This corrects the earlier PAY-NEW-1 description that review could precede cutoff. Preparation is the existing automatic candidate review; there is no invented Prepare or additional approval endpoint.

The fixture advanced **only its Node Date and connection-local SQL timestamp** to the following Manila day, then authenticated fresh fictional sessions. The machine/database-global clock, receipts, submission windows, approvals and sources were not backdated or rewritten to bypass the guard. This is controlled time simulation, not proof of an actual overnight office run.

Negative cases cover role denial, cutoff/deadline rejection, changed identity/academic/receipt/publication/standing/authority evidence, stale revision/hash, changed-key payloads and competing finalizations. Technical Administrator and unassigned users cannot use business authority. Staff cannot manage windows, finalize or submit; Staff may submit a prepared roster for review and mark a submitted payroll processed. Coordinator retains existing finalization/submission authority.

A deliberately late finalization-audit failure rolls back allocations, entitlements, frozen snapshot and command result. Competing finalizations permit one winner; its exact retry returns the original result. The second batch cannot obtain another ordinary stipend claim for these scholars. Original approval-member snapshots remain exact. Official HTML and Word generation succeed on the fictional processed batch; existing financial-report suites retain their XLSX/PDF and source/retry/atomicity assertions. No financial pin, source restriction or permission was relaxed.

## Interface acceptance and tests

Staff and Coordinator passed **1440 / 1024 / 820 / 375 / 320 CSS pixels**, height 900, for primary window controls and the fictional 835-candidate Draft. The loaded review shows batch identity, year/semester, Draft state, cutoff, 835 included / zero awaiting review, paged candidates and the disabled-until-cutoff next action. Narrow tables scroll locally; no page-level horizontal overflow occurred. Keyboard opening, filters, Cancel and focus restoration passed. The new-draft trigger retains **44-pixel height / 3-pixel outline**.

Both roles also passed native Chrome **200%**, viewport emulation disabled: **712×424 CSS pixels / DPR 2**, in primary window controls and fictional Draft review. Images use direct rendered-viewport captures without resizing. Zoom returned to 100%; task browser windows closed. Primary browser guards recorded zero business-command attempts. The ui-ux-pro-max and Playwright workflows were used; full AT/WCAG, load, cold-start and office concurrency certification is not claimed.

Representative captures: [primary Coordinator controls](../../output/playwright/pay-new-3-primary/after-window-coordinator-1440.png), [primary Staff mobile restriction](../../output/playwright/pay-new-3-primary/after-window-staff-320.png), [fictional Draft desktop](../../output/playwright/pay-new-3-primary/fixture-draft-coordinator-1440.png), [fictional Draft mobile](../../output/playwright/pay-new-3-primary/fixture-draft-staff-320.png), [native 200% Draft](../../output/playwright/pay-new-3-primary/native-fixture-draft-coordinator.png). Complete role/width results: [Coordinator](../../output/pay-new-3-primary-20261026/browser-results/fixture-draft-coordinator.json), [Staff](../../output/pay-new-3-primary-20261026/browser-results/fixture-draft-staff.json), [native Coordinator](../../output/pay-new-3-primary-20261026/browser-results/native-draft-coordinator.json), [native Staff](../../output/pay-new-3-primary-20261026/browser-results/native-draft-staff.json).

| Validation | Result |
|---|---|
| Lint, typecheck, build, secrets | All exit **0**, normal commands on matching isolated source |
| `npm test -- --maxWorkers=1` | **128 files / 829 tests passed** |
| New owned forward UAT | **Six groups passed**, full **835-person** run and a separate **25-person** preliminary run |
| Additional historical-context test | **Five groups passed** on a fresh owned 25-person historical cohort plus one independent new scholar; expired final deadline, historical ownership and omission protection retained |
| Existing disposable integrations | **13 groups exit 0**: Masterlist drafts/workflow/amendments, academic/approved changes, notifications, Registry/Treasury, intake/import/receiving, historical/omitted payroll, Recording, reconciliation, individual settlement, financial reports |
| Primary recovery, source/approval reads, UI and preservation | Passed |

[Normal commands](../../output/pay-new-3-primary-20261026/checks-main.json), [unit log](../../output/pay-new-3-primary-20261026/unit-final.log), [13 regression commands/exits](../../output/pay-new-3-primary-20261026/regressions-all-latest.json), [full forward evidence](../../output/pay-new-3-primary-20261026/forward-uat.json), [driver exit](../../output/pay-new-3-primary-20261026/integration-latest.json), [additional historical-context evidence](../../output/pay-new-3-primary-20261026/correction-integration.json), [its exit](../../output/pay-new-3-primary-20261026/historical-context-exit.json).

Early task-helper attempts tried configuring an ordinary deadline in the past and entering review before cutoff; the unchanged guards rejected both. The helper now uses supported prospective configuration and explicit test-only time progression. An allocation observer initially waited too briefly for the large transaction and was rerun with a finite longer observation period. A native-browser sample inspected controls before asynchronous loading settled; only the later role-specific settled checks are accepted. A payment-read collector ran after Staff logout and correctly received 401; the accepted Coordinator comparison matches both earlier payroll summaries, while full table preservation independently covers every payment. These were test-orchestration corrections, not application fixes or weakened safeguards.

## Primary preservation, readiness and stop

An earlier complete comparison, before the separate payment operation, preserved every starting business value. The final recheck correctly rejected a blanket unchanged-business assertion. A new consistent read then verified the exact external append: **798 payment records, 798 entitlement-release links, 798 PAY-001 processing events, one payment command and 799 financial audits**, all identifying the separate Coordinator actor. The bulk audit's 798 scholar references match the new payment rows exactly. No task actor submitted them; both task sessions had already signed out.

Full-precision canonical comparisons preserve **all original rows in each changed financial table**, including the original two Paid records and their **2026-10-24** dates. All other business tables and schema objects, migration rows/timestamps, accounts/roles/passwords and runtime grants remain exact. This covers **1,835 scholars**, **14 accounts**, imports/receipts/approvals/academic records, **3 official Masterlists / 2,002 stored entries / 1,835 activations**, the published 835-member list, frozen payrolls, original entitlements and allocations. No new primary payroll exists. Current PAY-001 remains processed, revision **805**, with **800 Paid / zero Pending**; PAY-002 remains processed, revision **5**, with **200 Pending**.

All **19,385 starting audit rows** match at full datetime precision. The four task authentication events plus **799 separate financial audits** bring the total to **20,188**. Sessions remain **66→68**, with ordinary last-seen/revocation/rate-limit activity. This is qualified concurrent activity, not a claim of zero database writes or unchanged payment counts. [Earlier preservation checkpoint](../../output/pay-new-3-primary-20261026/final-preservation.json), [final qualified preservation](../../output/pay-new-3-primary-20261026/intervening-preservation.json), [payroll-summary comparison before the external operation](../../output/pay-new-3-primary-20261026/financial-comparison.json).

Both task sessions signed out with **204**, followed by **401**; their saved original cookies also return 401. The user's separate sessions were not revoked. Owned fixture/recovery databases/accounts and temporary services were removed. Primary/retained process commands, ancestry and listener owners remain unchanged. **76 paused LAN-R2A artifacts and 16 earlier ML-1 investigation files** remain exact. This is not a fresh inventory of every retained or operational database. [Cleanup, revocation and delivery](../../output/pay-new-3-primary-20261026/delivery.json).

**Files changed:** no existing application, test, configuration or deployment file. This report and task-local UAT drivers/evidence are additions; the fixture driver ran only in isolated staging. No source promotion, migration, new write contract, permission expansion or financial-policy change was needed. The staged build did not replace retained workspace distribution. The existing Vite chunk warning remains.

**Primary payroll creation remains conditional on separate authorization**, review of the actual supporting deadline authority and the intended opening/cutoff. Review the then-current real candidates; the fictional 835/835 result is not automatic eligibility or payment authority for primary. Respect whole-day cutoff, finalization, submission and processing decisions; printing/processing never means Paid. Existing Q28–Q31 source/forms/policy gates remain separate.

LAN-R2A may reuse this UAT evidence only through separately authorized inclusion of matching PAY-NEW-2 API/UI and operator tooling, actual-target recovery, pilot-boundary classification, policy/source review and office acceptance. This task supplies no operational LAN activation or release approval. Full 835-person operations are exercised locally; their elapsed time includes browser inspection and test contention and is not a service-capacity benchmark. An actual overnight run, office concurrency, power loss and off-host recovery remain outside this UAT.

**Stopped after PAY-NEW-3 testing and reporting. No task-authored primary new payroll, payment, deadline change, approval renewal or historical reclassification occurred. The separate Coordinator's 798 payments remain preserved. No LAN-R2A resumption or operational LAN modification occurred.**
