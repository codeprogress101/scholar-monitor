# PAY-TIME-1 — 5:00 PM payroll batch cutoff

27 October 2026, Philippine time. **Investigation and verification completed. The 5:00 PM implementation is stopped under the request's explicit contract boundary.** Existing windows store dates only; their commands, eligibility sources and finalization guard enforce complete Manila days. A prospective per-batch time policy requires reviewed persisted semantics and command/eligibility changes. Physical receipts do not record a time of receipt. No application change was made or promoted.

**PAY-003 remains Review / revision 3 / 834 included / one deferred / zero awaiting review. Its 27 October whole-day cutoff remains authoritative, with normal finalization from 28 October at 12:00 AM PHT, subject to all existing checks.** All 800 Paid records and their original dates remain exact. No primary business command, cutoff amendment, finalization or payment was submitted. LAN-R2A remains paused.

This follows the accepted [PAY-FLOW-2 implementation](PAY_FLOW_2_FINALIZATION_AND_PROGRESS_REPORT.md), PAY-PERF-2, PAY-UX-2 and earlier packages. The installed [AGENTS.md](../../AGENTS.md), relevant workflow guidance, ui-ux-pro-max and Playwright skills were read and applied. Historical reports were not substituted for fresh records.

## Fresh primary, activity and recovery

| Item | Fresh verification |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306 |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Profile / frontend / API | Existing synthetic / loopback 5173 / 3001 |
| Controller / API / Vite | **63232 / 59864 / 8080**, unchanged; commands, ancestry and owners checked |
| Schema | **149 tables / 66 accepted migrations**; SQL checksums and applied timestamps exact |
| Working year / batch semester | **TWO-BATCH-YEAR / TWO-FIRST**, available; cycle TWO-BATCH-CYCLE remains open |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Review / revision 3**, 834 saved entries, one existing deferral, zero allocations/payments |
| Its window | Revision **1**, opens **26 October**, cutoff **27 October**, unchanged |
| Assessment, both roles | **834 included + one deferred + 1,000 blocked + zero awaiting review = 1,835**; API excluded count 1,001 includes the deferred member |
| PAY-001 | Processed / revision **805**, **800 Paid / zero Pending**, cutoff 21 October |
| PAY-002 | Processed / revision **5**, **zero Paid / 200 Pending**, cutoff 23 October |
| Official Batch 1 | Published / version **415 / 835 active members**, 167 retained removed entries |

One separate user login occurred after the preceding task's final checkpoint and before this task's baseline. Its original audit/session evidence was retained. No subsequent payment or payroll change was found during this investigation. Current payment evidence is **two Paid dates of 2026-10-24 and 798 of 2026-10-26**, rather than the much older two-Paid checkpoint. [Fresh inventory](../../output/pay-time-1-primary-20261027/inspection.json), [payroll/schema/receipt inventory](../../output/pay-time-1-primary-20261027/timing-inventory.json), [working-year confirmation](../../output/pay-time-1-primary-20261027/calendar.json), [both-role API reads](../../output/pay-time-1-primary-20261027/read-oracles.json).

Accepted package hashes, including PAY-FLOW-2, matched. **1,367 existing inputs**, including AGENTS.md and all **310 retained distribution files**, were checkpointed. Isolated staging at `C:/xampp/htdocs/ldss_paytime1_primary_stage_20261027` and an external baseline used the actual dirty workspace. Private configuration was not copied; Git HEAD and older builds were not substituted. Builds ran in staging and did not replace retained distribution. [Preflight/processes/listeners](../../output/pay-time-1-primary-20261027/preflight.json), [starting hashes](../../output/pay-time-1-primary-20261027/files-before.json).

Installed BACKUP-1 captured **99,297,769 SQL bytes / 22,617,195 encrypted bytes**, archive SHA-256 `313cae5d0c5cc439df8893735257cdf01a2eac82f370a4b853e7b4f396f5e4df`. Complete restoration into a newly owned isolated target passed all 149 tables' values/counts/checksums, journal, schema objects, indexes, constraints, triggers, executable views and rejection probes. The recovery target/accounts were removed; nothing was restored over primary. Existing finite bounds, source-schema READ locks and restricted archive/key custody remain. No service restart was needed. [Recovery proof](../../output/pay-time-1-primary-20261027/recovery.json).

## Current authoritative timing contract

| Consumer | Current behavior |
|---|---|
| Window creation / extension | Strict date-only `opensOn` / `cutoffOn`; unknown time/policy fields and datetime values reject. Windows remain sequential through the entire cutoff day. |
| Persistence | `opens_on`, `cutoff_on`, `previous_cutoff_on` are **DATE**. Window history permits `open` or `extend`; its constraint requires a later cutoff date for extension. No persisted per-window time/policy discriminator exists. |
| Draft preparation / early Review | Current sources are assessed; an opened window, a nonempty roster and no unresolved timely candidates are required. Review can precede cutoff and creates no allocations. |
| Coordinator finalization | `managedCandidates` reads the database's current Manila date and requires **current day > cutoff date**. Current hash/revision, saved reviewed membership/fingerprints, permission, preparation and financial guards still apply. Finalization reserves entitlements/allocations atomically. |
| Official submission / processing | Existing Finalized → Submitted → Processed transitions, effective dates, frozen roster and allocation checks apply. These paths do not independently turn a window cutoff into a time-of-day rule. Processing does not mean Paid. |
| COR/COG timing | Physical received date is compared with the selected batch cutoff. Encoding after that complete day's boundary requires the existing evidence review. An approved late-encoding decision is source-bound; it does not backdate physical receipt or waive genuinely late receipt. |
| Timely candidates | Semester sources use receipt dates/window timing; unresolved timely applicants block forward review/finalization. A time-policy change must update this dependency as well as the freeze clock. |
| Historical / omission routes | Historical approval/import/deadline pins and supported source ownership remain exact. Omission assessment uses the original frozen source and current eligibility/timing. A new window does not authorize a historical transfer or override document timing. |
| Reports / progress | Window API derives `cutoffExclusiveUtc` from the date. The tracker validates that whole-day boundary and formats explicitly in Asia/Manila. Payroll form generation consumes assessed/frozen rows; printing does not grant eligibility or record payment. |

The main sources are [window parsing and boundary calculation](../../server/payouts/submission-rules.ts), [window service](../../server/payouts/submission-service.ts), [schema](../../db/migrations/20261007010000_f36_payroll_submission_windows.sql), [candidate timing/hash](../../server/ovr/managed-payroll.ts), [review guard](../../server/ovr/rules.ts), [review/finalization transaction](../../server/ovr/service.ts), [processing](../../server/ovr/processing-service.ts), [receipt timing](../../server/requirements/timing-service.ts), [semester sources](../../server/eligibility/semester-sources.ts), [historical append](../../server/payouts/historical-append.ts), [omission assessment](../../server/payments/omission-service.ts) and [tracker](../../src/payroll-progress.ts). The [line-level source inventory](../../output/pay-time-1-primary-20261027/source-trace.json) records the traced references.

`deadlineBoundary(day)` currently returns the **exclusive start of the following Manila day**. For PAY-003 that is **2026-10-27T16:00:00.000Z = 28 October 00:00:00 PHT**. All instants before it remain within the cutoff day, including 23:59:59.999 at JavaScript millisecond precision and that final second's remaining microseconds in database timestamps. The UI's “11:59:59 PM” names that final second; it does not truncate the day at its first millisecond.

These separate dates retain separate meanings:

- **Batch cutoff:** PAY-003's 27 October full day.
- **Semester final submission deadline:** recorded 31 October / revision 3, also date-only. Its separately recorded office-authority limitation remains as reported in PAY-NEW-3; this task supplies no new authority.
- **Planned payout target:** 24 October, a target rather than the freeze boundary.
- **Receipt:** physical received date and separate encoding timestamp; document coverage periods are distinct again.
- **Payment:** each actual effective date, preserved independently; semester claim expiry remains tied to 21 February 2027.

Database system timezone reports Asia/Singapore, but these timing readers use `UTC_TIMESTAMP` plus explicit UTC+8 conversion and API UTC instants. No host/session timezone was changed. Replacing the shared `deadlineBoundary` with 5:00 PM would also change semester-deadline and receipt interpretation, including historical windows. It is not a safe presentation correction.

## Stopped implementation and minimum prospective contract

The request states: **“If enforcing the new time requires changing persisted window semantics, financial eligibility rules or business-write contracts, STOP that implementation portion.”** All three boundaries are implicated. No schema, command, source reader, financial rule or UI was changed to introduce 5:00 PM.

The minimum separately reviewable design is:

1. **Persist an immutable policy on each window revision.** A reviewed migration could distinguish `whole_day_v1` from `manila_1700_v1`, preserving every existing window's whole-day interpretation. Derive and expose a canonical UTC boundary from that versioned policy and its recorded cutoff date. Do not infer policy from creation date, current configuration or browser timezone.
2. **Extend the strict creation contract explicitly.** Future authorized window creation must specify the reviewed policy and bind it to expected cycle/deadline/sequence versions, command payload/hash, audit and durable exact-retry result. Existing payloads retain whole-day behavior. Existing Coordinator permission appears sufficient; no permission expansion has been demonstrated. This is nevertheless a new write-contract/schema proposal, not implemented acceptance.
3. **Bind all affected source contracts.** Candidate/timing fingerprints, current review checks, saved/frozen evidence, historical readers and window DTOs must include the applicable policy/boundary. Revalidate inside existing guarded transactions. Preserve unresolved-timely-candidate protection, allocation uniqueness, source-change rejection and atomic rollback. Keep semester deadlines and historical pins independent.
4. **Resolve physical-time evidence before same-day eligibility.** Require genuine source-backed receiving-time precision/provenance, or a separately approved handling path for date-only same-day evidence. Do not treat unknown time as automatically timely, late or safely excludable. The existing late-encoding command does not establish this new policy.
5. **Then update UI and acceptance together.** The tracker must consume the authoritative policy/boundary and display the actual finalization rule; its present whole-day validator intentionally rejects an unsupported 5:00 PM boundary. No UI-only switch is appropriate.

The smallest prospective scope can leave all existing batches unchanged and add no Review-state amendment at all. If PAY-003 must also change, that requires its own separately authorized design described below.

## Proposed exact boundary — arithmetic only

For separate review, one precise interpretation of “after 5:00 PM” is **an inclusive instant at 17:00:00.000 PHT, with finalization requiring server time strictly greater than that instant**. Under a proposed millisecond-precision contract, the first representable eligible instant is **17:00:00.001**, subject to every other guard. This does not include the entire 17:00 minute or second. Office approval must explicitly choose this inclusion/precision rule; the current application has no such contract. A future implementation must reconcile database microsecond storage with that chosen precision rather than let JavaScript truncation decide it.

| Example instant, 27 October 2026 PHT | UTC | Proposed strict-after check | Actual unchanged PAY-003 |
|---|---|---|---|
| 16:59:59.999 | 08:59:59.999Z | Blocked | Blocked |
| 17:00:00.000 | 09:00:00.000Z | Blocked at the boundary | Blocked |
| 17:00:00.001 | 09:00:00.001Z | Time check could pass | Blocked until midnight |
| 28 October 00:00:00.000 | 27 October 16:00:00.000Z | Already after proposed boundary | Existing time check can pass |

Task-only arithmetic and existing-rule probes cover the sample day, month-end, year-end and leap day under UTC, America/New_York and Asia/Tokyo. Existing whole-day finalization remains blocked around 5:00 PM and changes only at midnight; pending timely candidates still reject afterward. Strict commands reject proposed time/policy fields. These are **not tests of an installed 5:00 PM business workflow**. [Probe source](../../output/pay-time-1-primary-20261027/boundary-probes.mjs), [UTC](../../output/pay-time-1-primary-20261027/boundary-UTC.json), [New York](../../output/pay-time-1-primary-20261027/boundary-America-New_York.json), [Tokyo](../../output/pay-time-1-primary-20261027/boundary-Asia-Tokyo.json).

## PAY-003 and physical receipts

**There is no supported cutoff-time amendment while PAY-003 is Review.** `extend-window` requires Draft, otherwise `WINDOW_FROZEN`; it only moves to a later date and its database constraint enforces that direction. A same-day move from midnight to 5:00 PM would shorten the window, not extend it. Supplying a new field fails strict parsing. No primary amendment was attempted to demonstrate these source-established restrictions.

PAY-003 was not returned to Draft, reopened, re-reviewed or finalized. Any future Review-state policy amendment needs separate approval of its permitted states and timely-applicant impact, an append-only policy/window revision, expected batch/window/source versions, explicit authority/reason/reference, fresh impact review, handling of the now-stale reviewed basis, and atomic audit/ledger behavior. It must preserve the original window and reviewed roster evidence. No such contract was added here.

[Receipt schema](../../db/migrations/20261001110000_f15_requirement_receiving.sql) stores `received_on DATE` and `recorded_at DATETIME(6)`. The [evidence model](../../server/requirements/receipt-evidence.ts) explicitly returns **`physicalPrecision: "date"`**; receipt and resubmission inputs accept dates. Encoding time is not a physical receipt timestamp. Verification, approval, import and publication timestamps cannot replace it either.

Fresh inventory finds **3,670 initial receipts**: 2,000 dated 24 October and 1,670 dated 26 October; there are **zero resubmission events**. Those dates precede PAY-003's cutoff day. This does not establish an authorized 5:00 PM assessment for the cohort or supply a time for future same-day receipts. A date-only receipt on a future cutoff day cannot establish whether it arrived before, exactly at or after 5:00 PM. That time-sensitive eligibility portion is stopped. Current receipts, timeliness decisions and prior approvals remain unchanged.

## UI, screenshots and verification

**No UI change or before/after implementation comparison is claimed.** Current-primary screenshots verify that the accepted tracker still displays its real whole-day cutoff, midnight finalization, separate semester deadline and payout target. Actual identities/account labels are masked. Both roles passed **1440 / 1024 / 820 / 375 / 320 CSS px**, height 900, DPR 1, with no page/tracker horizontal overflow; tables retain local scrolling.

| View | Coordinator | Staff |
|---|---|---|
| Desktop, 1440 | [Current tracker](../../output/playwright/pay-time-1-primary/primary-coordinator-review-1440.png) | [Current tracker](../../output/playwright/pay-time-1-primary/primary-staff-review-1440.png) |
| Tablet, 820 | [Current tracker](../../output/playwright/pay-time-1-primary/primary-coordinator-review-820.png) | [Current tracker](../../output/playwright/pay-time-1-primary/primary-staff-review-820.png) |
| Mobile, 320 | [Current tracker](../../output/playwright/pay-time-1-primary/primary-coordinator-review-320.png) | [Current tracker](../../output/playwright/pay-time-1-primary/primary-staff-review-320.png) |
| Native Chrome 200% | [Direct viewport](../../output/playwright/pay-time-1-primary/native-primary-coordinator-tracker.png) | [Direct viewport](../../output/playwright/pay-time-1-primary/native-primary-staff-tracker.png) |

Native zoom used no viewport emulation: **712×424 CSS px / DPR 2**. Keyboard search, no-match/restore, Coordinator form opening and Escape cancellation passed without submission; Staff has no finalization control. Reduced-motion inspection retained static semantic stages, one `aria-current` step and no fabricated progress. Zoom returned to 100%, task windows closed. Full assistive-technology/WCAG certification is not claimed. [Coordinator widths](../../output/pay-time-1-primary-20261027/browser-results/primary-coordinator-review.json), [Staff widths](../../output/pay-time-1-primary-20261027/browser-results/primary-staff-review.json), [native Coordinator](../../output/pay-time-1-primary-20261027/browser-results/native-primary-coordinator.json), [native Staff](../../output/pay-time-1-primary-20261027/browser-results/native-primary-staff.json).

Actual browser timezone overrides to **UTC / America/New_York / Asia/Tokyo** retained identical Manila cutoff/finalization text after navigation. Guards recorded **zero business-command attempts**. Neither preview/export nor a command was invoked on primary. [Browser timezone evidence](../../output/pay-time-1-primary-20261027/browser-results/browser-timezones.json).

| Validation | Result |
|---|---|
| Lint, typecheck, build, secrets | All exit **0** on matching isolated staging |
| `npm test -- --maxWorkers=1` | **133 files / 879 tests passed** |
| Existing disposable integrations | **Six groups exit 0**: Masterlist workflow; Registry/main payroll/Treasury/parity; historical/omitted import/payroll; Recording; reconciliation; financial reports |
| Boundary/source probes | Existing whole-day midnight rules, early Review, pending candidates, strict payload rejection and explicit Manila conversion passed; proposed 5:00 PM arithmetic only |
| Actual primary | Both-role bounded API assessment, all three window boundaries, payment summaries, responsive/native/keyboard checks, recovery and preservation passed |

Disposable suites retain role denials, changed source/roster and stale hashes, exact retries, concurrent finalization, late audit rollback, entitlement/allocation integrity, historical ownership, omission protection, receipt timing, R01–R07 and generated financial outputs. No financial test pin or safeguard was relaxed. A real 5:00 PM creation/amendment/receipt workflow, its races and retries **remain unimplemented and unaccepted**. They must be tested on disposable targets after the new contract is authorized. [Normal commands](../../output/pay-time-1-primary-20261027/checks-main.json), [unit log](../../output/pay-time-1-primary-20261027/unit-final.log), [six exact commands/exits](../../output/pay-time-1-primary-20261027/regressions-masterlist-workflow-registry-historical-recording-reconciliation-financial-reports-latest.json).

## Preservation, files and stop

The final complete 149-table comparison preserves every starting business value/count, schema object, all 66 migration rows/timestamps, accounts/password hashes/roles, runtime grants, original audit rows and all payment evidence at full datetime precision. PAY-003 remains Review / revision 3 with its exact 834 entries, deferral and command history. Its source hash and counts matched between roles. Masterlists, annual standing, imports, documents, original approvals, frozen payrolls, entitlements, allocations, reconciliation and all deadlines remain exact.

Both roles' PAY-001/PAY-002 payment summaries match one another and the preserved **800 Paid / 200 Pending** state. All 800 payment rows and actual dates remain exact. All **20,241 starting audit rows** match; two task logins and two logouts append four authentication events, yielding **20,245**. Sessions **96→98**, with ordinary last-seen/revocation/rate-limit activity. This is qualified authentication activity, not zero database writes. Both keyboard logouts returned **204**; subsequent probes and saved original task cookies return **401**. Other users' sessions were untouched. [Full preservation](../../output/pay-time-1-primary-20261027/final-preservation.json), [financial reads](../../output/pay-time-1-primary-20261027/financial-reads.json), [delivery/revocation/readiness](../../output/pay-time-1-primary-20261027/delivery.json).

**Exact existing files changed: none.** The requested report is added at `docs/requirements/PAY_TIME_1_FIVE_PM_CUTOFF_REPORT.md`; task-only inventory, recovery, probes, browser drivers/results and screenshots are additions under `output/pay-time-1-primary-20261027/` and `output/playwright/pay-time-1-primary/`. All **1,367 protected existing inputs**, including every application/backend/test/migration/configuration file, AGENTS.md and all 310 retained distribution files, remain byte-identical. No application package, patch, migration or runtime promotion was produced.

There is no application asset, query, locking or performance change. Builds and disposable regressions are acceptance checks of unchanged source, not a new performance benchmark. Existing capacity, office-policy, accessibility and recovery-location limitations remain. The build's existing chunk warning remains.

Primary processes and listener ancestry remain unchanged; readiness returns **200** through both 3001 and 5173. Retained/LAN listener owners, **76 paused LAN-R2A artifacts and 16 earlier ML-1 investigation files** remain exact. No temporary application server was started. Recovery/disposable targets were cleaned up by their existing tools. This is not a new exhaustive inventory of retained/operational databases.

Outstanding office decisions are the prospective policy authority/applicability, exact boundary inclusion and timestamp precision, genuine physical-time evidence and date-only same-day handling, and whether a separately reviewed amendment to an existing Review batch is desired. A future package needs separately authorized contract/migration rehearsal, compatibility tests and target recovery; synthetic findings do not supply operational LAN or payment authority.

**Stopped after investigation, recovery, existing-rule verification and reporting. The requested 5:00 PM implementation remains stopped pending a separately authorized persisted policy/write/eligibility contract. PAY-003 and historical windows retain whole-day semantics. No primary financial/source/deadline change or LAN-R2A resumption occurred.**
