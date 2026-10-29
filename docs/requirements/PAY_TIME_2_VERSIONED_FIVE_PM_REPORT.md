# PAY-TIME-2 — Versioned, Coordinator-selected payroll cutoff

27 October 2026, Philippine time. **Prospective technical foundation implemented and tested only in isolated staging. PRIMARY PROMOTION IS BLOCKED.** New staged forms default to **5:00 PM Philippine Standard Time**, and accept another time only from the recorded rule’s permitted set. The **3:00 / 5:00 / 6:00 PM** test rule is explicitly fictional. No office-approved cutoff-time policy or approval reference has been supplied. Nothing in this task activates those times on primary or operational LAN.

**Intervening primary activity is preserved:** a separate Coordinator returned PAY-003 from **Review / revision 3 → Draft / revision 4** at **08:29:38.642714 Philippine time** today. Its original **27 October whole-day cutoff**, existing deferral, source evidence and financial records remain. The task did not submit that operation. All **800 Paid records** remain exact: two dated **24 October**, 798 dated **26 October**.

This follows [PAY-TIME-1](PAY_TIME_1_FIVE_PM_CUTOFF_REPORT.md), the accepted [PAY-FLOW-2](PAY_FLOW_2_FINALIZATION_AND_PROGRESS_REPORT.md), PAY-PERF-2 and earlier accepted work. It implements the user’s subsequent configurable-time requirements within the expressly authorized staging boundary. **No primary source, migration, runtime grant, cutoff policy or window was installed or amended. LAN-R2A remains paused.**

## Verified target and isolated boundary

| Item | Fresh result |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Primary database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Accepted application | **synthetic / loopback 5173 / 3001** |
| Controller / API / Vite | **63232 / 59864 / 8080**, commands, ancestry and listeners unchanged |
| Primary schema | **149 tables / 66 accepted migrations**, checksums and original applied timestamps unchanged |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Review v3 → Draft v4**, separate user action |
| PAY-003 timing and sources | Opens **26 October**, cutoff **27 October / window revision 1 / whole Manila day**; original deferral and 834 saved review entries retained |
| PAY-001 / PAY-002 | **Processed v805 / 800 Paid**, and **Processed v5 / 200 Pending** |
| Official Batch 1 | **Published v415 / 835 active members / 167 retained removals**, unchanged |
| Semester deadline / target | Recorded **31 October / revision 3**; planned target **24 October**, unchanged |

The recorded semester extension’s supporting office authority remains a separate unresolved matter; this task supplies none. Neither permission nor a free-text database reference establishes office policy.

The actual dirty source supplied staging at **`C:/xampp/htdocs/ldss_paytime2_primary_stage_20261027`**, with baseline at **`C:/xampp/htdocs/ldss_paytime2_baseline_20261027`**. Private configuration was excluded. Git HEAD and older builds were not substituted. All **1,368 protected primary inputs**, including **310 retained distribution files**, remain exact. The candidate is an external staged package, not the application currently served on 5173. [Preflight](../../output/pay-time-2-primary-20261027/preflight.json), [starting hashes](../../output/pay-time-2-primary-20261027/files-before.json), [current starting payroll](../../output/pay-time-2-primary-20261027/current-payroll.json).

## Versioned contract and authority

| Policy identity | Meaning |
|---|---|
| `whole_day_v1` | Existing full-day behavior. Old date-only creation requests keep this path. |
| `manila_1700_v1` | Explicit fixed-17:00 identity supported by the foundation; cannot represent another time. |
| `manila_time_v1` | New staged selector’s configurable policy. The actual selected time is explicit and must be permitted by its pinned authority rule. |

No policy is inferred from creation date, current settings or a batch code. Existing windows acquire only explicit legacy metadata during the isolated additive migration; their original dates, revisions, actors and historical values are retained.

Each prospective timed window revision records the **local cutoff date, actual local time, Asia/Manila timezone policy, canonical UTC instant, policy identity, immutable rule revision and rule hash**. Time selection has minute granularity (`HH:mm:00`); comparison and stored UTC boundaries have **microsecond precision**. The pure conversion uses explicit UTC+8 and never workstation-local time.

The new immutable rule table bounds permitted times to **1–48 unique minute values**, JSON to **2 KiB**, and retains the cycle, applicable date range, boundary rule, approval actor/time, authority reference and source location. Update/delete triggers reject mutation. Reads validate the complete typed rule and hash. The migration seeds **no office policy**.

The staged form proposes **17:00** by default. A Coordinator can choose another permitted minute; the fictional tests allow **15:00, 17:00 and 18:00**. An unpermitted value or absent rule disables Save; the server independently rejects it. The immutable source record is a technical prerequisite, not proof that its reference is genuine. There is **no rule-issuance, approval or revocation endpoint** in this delivery. Fictional rule rows were provisioned only in verified task-owned databases. Operational authority ingestion and any revocation/supersession treatment require a reviewed procedure or separately authorized audited contract.

The existing `submission-windows/open-window` operation is extended in staging, without a parallel creation route. Its timed request confirms policy, local time, timezone, expected rule revision/hash and expected canonical UTC, alongside the original cycle/deadline/sequence versions and opening/cutoff dates. The guarded transaction checks the current rule, approval timing, applicability, canonical instant, permissions, period, sequencing and final semester deadline. It then atomically records the batch, initial Draft event, window/version, timing-aware audit and durable command result. The timed result retains the actual cutoff evidence. Exact committed retries return that result before source checks; changed-key payload reuse rejects.

Existing date-only request normalization and hashes retain their established path. A Draft window’s existing later-date extension pins its original selected time/rule and revalidates the new date; it cannot silently change the time or amend Review/official history. Existing next-day sequencing remains: this work does not add multiple same-day windows or a cutoff-time amendment command.

## Exact boundary and receipt uncertainty

The proposed rule treats the selected instant as inclusive for receipt timing and permits normal finalization **strictly after** it. For a 29 October 5 PM window:

| Philippine time | Canonical UTC | Normal finalization time condition |
|---|---|---|
| 16:59:59.999999 | `2026-10-29T08:59:59.999999Z` | Blocked |
| **17:00:00.000000** | **`2026-10-29T09:00:00.000000Z`** | **Blocked** |
| **17:00:00.000001** | **`2026-10-29T09:00:00.000001Z`** | May pass; all other guards still apply |

The server compares integer microseconds rather than JavaScript `Date` fractions. Managed assessment uses the database’s `UTC_TIMESTAMP(6)`. After source/version and ordinary finalization checks, a timed finalization takes a **fresh database timestamp**, rechecks the boundary, and preserves that six-digit timestamp in the batch/frozen evidence. This closes a precision mismatch where JavaScript milliseconds would collapse the exact instant and its first permitted microsecond.

Legacy PAY-003 still permits normal finalization from **28 October 00:00:00 PHT**, or **27 October 16:00:00 UTC**. Its full-day cutoff is not replaced with 17:00. Early review and the existing separately guarded financial workflow remain distinct from finalization and payment.

Physical receipts currently establish a **date**, not a verified physical time. For a timed cutoff, a same-day date-only receipt is **`physical_time_review_required`**. It is neither automatically timely nor automatically late, regardless of encoding, verification, import, approval or publication timestamp. It keeps the relevant unallocated, nondeferred scholar awaiting review, so finalization cannot silently omit that uncertainty. Existing late-encoding approval cannot authorize this different uncertainty. Prior-date receipts retain the existing recording/evidence checks; later-date receipts remain late.

**Verified physical-time acceptance is intentionally unsupported.** No receipt time was invented, backfilled or accepted as an extra uncontracted field. A future source-backed path needs a separately approved append-only attestation/evidence contract identifying the exact receipt/document, actual physical date/time and precision, timezone, authoritative source/reference, authorized decision maker, expected source version and correction/supersession history. Its authority, audit, fingerprints, idempotency, rollback and effect on prior reviews must be reviewed. Office policy must decide admissible evidence and same-day uncertainty handling. No schema or writer for that decision is included here.

## Isolated schema and source package

The staged migration is **`20261027010000_f57_payroll_cutoff_policy.sql`**, SHA-256 **`b818ddafd1a38b91b421b6df0bcef9d1b8f7453b97635502afa8dd460946b71e`**. It adds `payroll_cutoff_rule_versions` and six timing/authority columns on `payroll_submission_window_versions`, with bounded JSON, timezone, precision, canonical-instant and foreign-key checks. Staging becomes **150 tables / 67 migrations**. All original 66 SQL files, journal values and existing window fields remain protected.

Fresh application, repeated no-op application and partial-DDL recovery were rehearsed on owned targets. An initial foreign-key clause used unsupported syntax; it was corrected to the separate `ADD FOREIGN KEY IF NOT EXISTS` form and re-rehearsed. No integrity check was bypassed. [MariaDB ALTER TABLE reference](https://mariadb.com/docs/server/reference/sql-statements/data-definition/alter/alter-table), [rehearsal](../../output/pay-time-2-primary-20261027/migration-rehearsal.json), [fresh rehearsal](../../output/pay-time-2-primary-20261027/fresh-migration-rehearsal.json).

The runtime helper adds **SELECT only** on the new rule table when the new migration is present. There is no new business role or permission. This prospective database grant is still a deployment change requiring review; **primary grants remain exact**.

**22 staged package files: 18 existing changes and four additions.** Exact bytes are listed in the [candidate manifest](../../output/pay-time-2-primary-20261027/candidate-files.json).

| Files | Scope |
|---|---|
| New migration above; `scripts/migration-lib.mjs`; `server/schema-manifest.ts` | Additive schema, accepted checksum and conditional rule-reader grant |
| New `server/payouts/cutoff-policy.ts`, `cutoff-source.ts` | Pure exact timing, rule evidence and recorded-window validation |
| `server/payouts/submission-rules.ts`, `submission-service.ts` | Explicit timed creation contract, pinned extension, authoritative metadata/audit/result |
| `server/requirements/timing-rules.ts`, `timing-service.ts` | Date-only uncertainty and timing-aware source projection |
| `server/eligibility/semester-sources.ts` | Preserve unresolved receipt-time cases in assessment |
| `server/ovr/managed-payroll.ts`, `rules.ts`, `service.ts`, `detail-model.ts`, `detail-reads.ts` | Timing-aware source hash/detail, pending protection and exact database-clock finalization |
| `src/payroll-progress.ts`, `PayrollProgress.tsx`, `PayrollCandidates.tsx`, `RequirementTimingPanel.tsx` | Actual chosen-time/first-permitted-instant display and receipt explanation |
| `src/PayrollSubmissionWindows.tsx`, `prior-command.ts` | Existing form’s defaulted time input and narrowly classified post-ledger policy rejections |
| New `tests/payroll-cutoff-policy.test.tsx` | Boundary, legacy, confirmation, receipt and recovery tests |

No CSS, font, dependency, authentication, business permission mapping, payment writer or output renderer changed. The finalization service has an intentional timed-path change; it is not claimed byte-identical. All **1,039 other protected non-distribution staged inputs** match baseline. Of **283** existing compiled server JavaScript files, **10** change and **273** remain exact; two modules are added. Primary’s retained distribution is untouched. [Source/package proof](../../output/pay-time-2-primary-20261027/source-boundary.json).

## Recovery and acceptance

Installed BACKUP-1 retained its finite bounds and restricted key/archive custody. Neither checkpoint was restored over primary.

| Checkpoint | SQL / encrypted bytes | Complete isolated restoration |
|---|---:|---|
| Fresh primary, before source work | **99,299,257 / 22,617,593** | All **149 tables / 66 migrations** verified |
| Expanded owned schema with fictional timed windows | **99,318,387 / 22,624,005** | All **150 tables / 67 migrations** verified |

Both checked complete values/counts/checksums, journal, schema objects, indexes, constraints, triggers, executable views and rejection probes. Recovery targets/accounts were removed. Expanded recovery proves technical recoverability of the candidate schema, not approval to install it. [Initial recovery](../../output/pay-time-2-primary-20261027/recovery.json), [expanded recovery](../../output/pay-time-2-primary-20261027/expanded-schema-recovery.json).

| Validation | Result |
|---|---|
| Lint, typecheck, build, secrets | Normal staged commands exit **0**; final audit/recovery refinements additionally checked |
| Unit suite, one worker | **134 files / 903 tests passed** |
| Existing disposable regressions | Masterlist drafts, workflow and amendments; Registry/main payroll/Treasury/parity; historical/omitted import/payroll; Recording; reconciliation; financial reports, all exit **0** |
| New owned integration | **Four groups passed**, including a full **835-person** timed Review/finalization |
| Calendar/timezone probes | Midnight UTC crossing, month/year end, leap day; UTC/New York/Tokyo agree |
| UI | Both roles, five widths, native 200%, lost-response exact retry and definitive stale-rule rejection passed |

The unchanged source reader independently matched candidate decisions, fingerprints, source hashes and form rows for **1,835 PAY-001 assessments, 200 PAY-002 assessments and 1,835 PAY-003 assessments**. These are per-batch assessment counts with overlapping people, not distinct scholars or historical roster sizes. The original 800/200 frozen financial cohorts were not reclassified.

Creation tests cover the fictional default/alternatives, missing authority, invalid time/timezone/canonical instant, stale rule, Staff denial, immutable rules, exact retry, changed payload and competing commands. Same-day unknown physical time remains pending; a fabricated “verified time” attribute supplies no authority. Before/exact/first-microsecond finalization, stale version/source, late-audit rollback and unique allocations are covered. An owned 835-person finalization created **835 unique allocations**, one frozen roster and **no new payment outcomes**. Its HTML and Word exports contain **835 rows**, **4,756,425 HTML bytes / 184,825 Word bytes**. Existing financial-output and payment safeguards remain exercised by the regressions.

Concurrent duplicate finalizations returned **500 and 200**, not two immediate successes: the competing connection hit the existing lock-wait timeout. The original exact body/key then recovered the committed result. No timeout, locking requirement or duplicate guard was raised or relaxed. One committed result and unique allocations were verified.

The copied PAY-003’s existing Review correctly blocked a competing roster initially. For the positive independent-batch drill only, the owned integration target returned its copied PAY-003 to Draft and appended fixture-only removal history for its 834 competing review entries. No original history was deleted. Primary was never used for this setup. Separate browser targets retained their copied PAY-003 Review/whole-day state. All inventoried original identity, annual, receipt, document, prior-approval, official activation, historical-source, semester-deadline and payment tables remained exact around the integration. The representative copy contains synthetic UAT data; private identities and financial artifacts remain restricted. [Four integration groups](../../output/pay-time-2-primary-20261027/integration.json), [outputs](../../output/pay-time-2-primary-20261027/financial-outputs.json), [normal checks](../../output/pay-time-2-primary-20261027/checks-main.json), [unit log](../../output/pay-time-2-primary-20261027/unit-final.log), [six payroll/workflow regression exits](../../output/pay-time-2-primary-20261027/regressions-masterlist-workflow-registry-historical-recording-reconciliation-financial-reports-latest.json), [additional Masterlist exits](../../output/pay-time-2-primary-20261027/regressions-masterlist-drafts-masterlist-amendments-latest.json).

## Interface and recovery evidence

The existing single creation form gains one native time input, default **17:00**, with a visible **PHT / UTC+8** label and recorded permitted-rule explanation. Tracker, detail, receipt review and window history display the actual selected time. Missing authority cannot be bypassed by enabling a browser control. Existing command progress/exact retry remains in use; no new confirmation step or fake percentage is added.

Both roles passed **1440 / 1024 / 820 / 375 / 320 CSS px**, height 900, including an 835-included draft. There was no page/tracker horizontal overflow; tables retain local scrolling. Coordinator form opening/cancellation, unpermitted 16:00 rejection, actual 15:00/17:00/18:00 displays and Staff’s absence of creation authority passed. The native time field has a visible focus outline and measured **44.2 CSS px** height.

Native Chrome **200%**, viewport emulation disabled, passed for both roles at **712×424 CSS px / DPR 2**. Direct rendered-viewport captures were not resized. Keyboard entry, Tab, Cancel/Escape and trigger-focus restoration passed; primary was not opened to submit a command. Zoom returned to 100% and task browsers closed. The installed **ui-ux-pro-max and Playwright skills** were applied. Full AT/WCAG certification is not claimed.

| Evidence | Capture |
|---|---|
| Accepted legacy whole-day tracker, historical PAY-FLOW-2 checkpoint | [Legacy](../../output/playwright/pay-flow-2-primary/primary-coordinator-review-1440.png) |
| Staged Coordinator / Staff timed tracker, desktop | [Coordinator](../../output/playwright/pay-time-2-primary/coordinator-timed-1440.png) / [Staff](../../output/playwright/pay-time-2-primary/staff-timed-1440.png) |
| New form default / narrow layout | [Desktop](../../output/playwright/pay-time-2-primary/creation-form-1440.png) / [320 px](../../output/playwright/pay-time-2-primary/creation-form-320.png) |
| Missing documented rule | [Disabled save](../../output/playwright/pay-time-2-primary/missing-office-rule.png) |
| Native 200% actual selected time / input | [Tracker](../../output/playwright/pay-time-2-primary/native-coordinator-timed-tracker.png) / [Keyboard field](../../output/playwright/pay-time-2-primary/native-coordinator-cutoff-time.png) |
| Native 200% Staff restriction | [Staff](../../output/playwright/pay-time-2-primary/native-staff-creation-restriction.png) |

These compare policy presentation across an identified historical checkpoint and isolated prospective examples; they are not matched current-primary before/after activation screenshots. No primary “5 PM after” screen exists.

The actual browser created three fictional Drafts through the existing operation. Its first successful 17:00 response was deliberately lost **after commit**. The dialog retained the exact body/key, blocked Escape and recovered the same single batch on retry; two additional commands selected 15:00 and 18:00. A separate noncommitted request was aborted before server delivery, then a new fictional rule revision was appended. Exact retry received real **`CUTOFF_RULE_UNAVAILABLE` / 409**, unlocked and allowed cancellation without creating another batch. Only the three new post-ledger policy codes, scoped to supported window operations, gained definitive-rejection handling; transport, server, authentication and changed-payload uncertainty remain protected. [Creation/lost response](../../output/pay-time-2-primary-20261027/browser-results/browser-create.json), [stale-rule retry](../../output/pay-time-2-primary-20261027/browser-results/browser-stale-retry.json).

Fresh browser contexts actually configured for UTC, New York and Tokyo retained the same Manila display. Their timing-only probes intentionally aborted candidate loading; the real 835-roster acceptance was performed separately. Earlier orchestration attempts reused a signed-out hash document or navigated before large reads settled. Accepted runs use full navigation and verified actor/settled content, with no timeout or authentication change. [Coordinator widths](../../output/pay-time-2-primary-20261027/browser-results/browser-layout-coordinator.json), [Staff widths](../../output/pay-time-2-primary-20261027/browser-results/browser-layout-staff.json), [native Coordinator](../../output/pay-time-2-primary-20261027/browser-results/native-coordinator.json), [native Staff](../../output/pay-time-2-primary-20261027/browser-results/native-staff.json), [UTC](../../output/pay-time-2-primary-20261027/browser-results/browser-zone-utc.json), [New York](../../output/pay-time-2-primary-20261027/browser-results/browser-zone-ny.json), [Tokyo](../../output/pay-time-2-primary-20261027/browser-results/browser-zone-tokyo.json).

## Performance, preservation and release gates

One instrumented owned 835-person page returned **25 rows / 106,752 bytes**, with **3,348 SQL calls**, including **two cutoff-rule reads**, in **14.69 seconds** under local test contention. This task does not remove the full authoritative assessment cost or claim a matched performance improvement. A fresh timestamp query is added to timed finalization only. Client assets change **1,545,521 → 1,549,383 bytes**, **+3,862 JavaScript bytes**; CSS **343,786** and observed CSS gzip **52,263** remain exact. Fonts/dependencies are unchanged. These are workload/asset observations, not latency, cold-start, concurrency or LAN capacity certification. [Bundle inventory](../../output/pay-time-2-primary-20261027/bundle-impact.json).

The final primary check correctly rejected an unconditional unchanged-business claim after the separate Coordinator operation. Read-only comparison against a freshly restored starting checkpoint then proved **all original rows in the changed business tables remain exact**. Precisely **one `ovr_batch_events` row, one `ovr_commands` row, one notification and two audits** were appended for the separate login/return. Its durable result identifies PAY-003 **Draft revision 4**. There was normal session/rate-limit activity: **98 → 99 sessions**. All **20,245 original audit rows** remain exact at full precision; final count **20,247**. **This task created no primary authenticated session, export audit or business command.**

Every other primary table’s full values/counts, all schema objects, 66 journal rows/timestamps, application accounts/password/roles and runtime grants remain exact. This includes **1,835 scholars / 14 accounts**, annual/academic/import/document/prior-approval evidence, **3 Masterlists / 2,002 stored entries / 1,835 activations**, all original payroll entries/deferral evidence, frozen sources, entitlements, allocations, payments and dates. PAY-003’s cutoff remains its original whole day; no timed metadata exists on primary. All **800 Paid records** retain their complete original evidence and date split. A subsequent completion recheck found no further audit/workflow append and again verified all other business tables/schema. [Qualified final preservation](../../output/pay-time-2-primary-20261027/final-preservation.json), [completion recheck](../../output/pay-time-2-primary-20261027/completion-recheck.json).

All task browser sessions were confined to owned copies and signed out with **204**, followed by **401**. The port-3026 server is stopped, owned test/recovery schemas and runtime/definer accounts removed. Primary/retained/LAN listener owners and process commands remain exact. The **76 paused LAN-R2A artifacts and 16 earlier ML-1 evidence files** remain exact. This is not a fresh exhaustive inventory of every retained database. [Creation-copy preservation](../../output/pay-time-2-primary-20261027/creation-browser-preservation.json), [native-copy preservation](../../output/pay-time-2-primary-20261027/native-browser-preservation.json), [browser cleanup](../../output/pay-time-2-primary-20261027/cleanup-browser.json), [final restore-copy cleanup](../../output/pay-time-2-primary-20261027/cleanup-fixture.json), [server stopped](../../output/pay-time-2-primary-20261027/browser-stopped.json).

Review artifacts: [22-file manifest](../../output/pay-time-2-primary-20261027/candidate-files.json), [staged patch](../../output/pay-time-2-primary-20261027/PAY_TIME_2_STAGED.patch), [source ZIP](../../output/pay-time-2-primary-20261027/candidate-source.zip), [compatible review build](../../output/pay-time-2-primary-20261027/compatible-review-build.zip). Patch checking and an independent **byte-exact application round trip**, plus source-ZIP byte verification, passed against the actual dirty baseline. Archives exclude credentials, keys, `.env`, scholar/database rows and private evidence. The review build is **not a complete LAN release**. No rollback of primary is required because nothing was promoted; a future release must preserve subsequent legitimate source/data, including the user’s revision-4 return.

**Outstanding before any activation:**

1. Documented office authority must approve the default, permitted alternatives, validity/scope, exact inclusive/strict-after microsecond interpretation, and any exception/revocation procedure. The fictional 3/5/6 PM values are not policy.
2. Approve the receipt-evidence/uncertainty disposition. A verified physical-time or same-day attestation route requires its own reviewed source/write contract; it remains unimplemented.
3. Separately authorize and rehearse **schema 67, the new runtime SELECT grant, and matching API/UI source promotion** against the then-current target. Preserve all legacy whole-day windows; do not automatically amend PAY-003. Repeat current-state recovery and preservation.
4. Establish actual semester-deadline authority and conduct separately authorized office acceptance. Source-backed eligibility, review, finalization, submission, processing and actual payment decisions retain their independent gates.
5. For operational LAN, separately authorize complete packaging, migration/least-privilege rehearsal, target recovery, pilot boundary and witnessed office acceptance. No LAN readiness or deployment approval follows from this local staging result.

**Stopped after isolated implementation, acceptance, preservation and reporting. The technical foundation is reviewable in staging; policy/source-evidence/schema/grant/deployment gates block primary promotion. No primary cutoff, payment, receipt, approval, Masterlist or deadline was changed by this task. The separate user’s PAY-003 Draft revision 4 is preserved. No LAN-R2A resumption occurred.**
