# PAY-FLOW-1 — Early payroll review and finalization

26 October 2026, Philippine time. **Early Review is implemented and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/#payouts?cycle=829ae3dc-9b49-4d88-9dfe-0a7250b164c0&batch=7f337596-c36d-41d7-b715-368fd4633b1d). Early Finalization remains blocked through the whole cutoff day. PAY-003 remains Draft / revision 2 / 834 included / one deferred / zero awaiting review. No primary workflow transition or financial command was submitted.** LAN-R2A remains paused.

The existing review operation now accepts a complete roster after its window opens, before cutoff. It does not allocate entitlements, freeze financial evidence or record payment. Large concurrent writes can still hit the database lock-wait limit; exact-key recovery and a definitive-conflict refresh path were verified. This is functional acceptance, not a concurrency or latency certification.

This preserves accepted [PAY-NEW-3.2](PAY_NEW_3_2_PREVIEW_DEFERRAL_RELIABILITY_REPORT.md), [PAY-UI-1](../uiux/PAY_UI_1_PAYROLL_ACTION_FIRST_REPORT.md), PAY-NEW-2, ML-1.2 and BACKUP-1.

## Fresh primary and preservation boundary

| Item | Starting and final result |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306 |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Application | Existing synthetic / loopback 5173 / 3001 |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Draft / revision 2**, original deferral retained |
| Current assessment | **834 included / 1 deferred / 1,000 blocked / 0 awaiting review** |
| PAY-003 saved entries / allocations / payments | **0 / 0 / 0**; its draft roster remains a current assessment |
| Working period | TWO-BATCH-YEAR / TWO-FIRST; TWO-BATCH-CYCLE, open / v2 |
| Window / final deadline | Opens **26 October**, cutoff **27 October / window revision 1**; final deadline **31 October / revision 3**, unchanged |
| Official Masterlist Batch 1 | **Published / v415 / 835 active members**, 167 retained removals, unchanged |
| Historical payrolls | PAY-001 **processed / v805 / 800 Paid**; PAY-002 **processed / v5 / 200 Pending**, unchanged |
| Every Paid record | **800 complete rows exact: two dated 2026-10-24 and 798 dated 2026-10-26** |
| Schema | **149 tables / 66 migrations**, SQL hashes and applied timestamps unchanged |

The fresh baseline includes **20,207 audit rows and 76 sessions**, rather than assuming the previous report is current. Consistent read-only inventory protected the current event, command ledger, original deferral and payment evidence. No original command was replayed. Scholar, annual/academic, document/import/prior-approval, official activation, financial-source, account/password/role and grant data remain exact. Names and permanent Scholar IDs are excluded from this report. [Inspection](../../output/pay-flow-1-primary-20261026/inspection.json), [current payroll](../../output/pay-flow-1-primary-20261026/current-payroll.json), [final preservation](../../output/pay-flow-1-primary-20261026/final-preservation.json).

## Cutoff enforcement and root cause

| Location | Actual responsibility |
|---|---|
| `server/ovr/managed-payroll.ts` | Derives `opened` and `cutoffReached` from the SQL Manila calendar day. Cutoff is reached only when the day is **later than** the recorded cutoff. Source calculation is unchanged. |
| Original `server/ovr/service.ts` command guard | Applied the same `CUTOFF_NOT_REACHED` check to both `submit-review` and `finalize`, ahead of the existing state machine. Its stated purpose was avoiding omission of timely applicants. |
| Installed `server/ovr/rules.ts` / service | A shared guard requires an opened window, no unresolved timely candidates and a nonempty included roster. **Only `finalize` requires cutoff reached.** |
| `src/OvrDrafts.tsx` | Removes the cutoff from the numbered Draft review button; uses server review/finalization blockers for availability and adjacent explanation. Legacy payroll writes remain restricted. |
| `src/PayrollDraftRoster.tsx` | Replaces the old “review after cutoff” instruction with the review-versus-freezing distinction. |
| Submission-window and document-timing rules | Keep sequential windows, cutoff within the recorded final deadline, physical receipt timing and existing controlled evidence decisions. No date/validation change. |
| Official processing service | Still requires **Finalized → Submitted**. There is no separate `CUTOFF_NOT_REACHED` check here: ordinary pre-cutoff submission is prevented by the mandatory finalization gate. |

Other occurrences in tests, reason navigation and historical reports do not add a server transition gate. The compatibility candidate component is not the normal numbered PAY-003 view; its older guidance does not control this path.

The defect was applying the anti-omission **freeze** condition to a reversible review step. Review saves versioned proposed membership and audit evidence; only finalization writes the immutable finalization and reserves entitlements/allocations. Existing source checks and the existing return/review path can protect review without prematurely freezing candidates.

[Shared guard](../../server/ovr/rules.ts), [command](../../server/ovr/service.ts), [read availability](../../server/ovr/detail-reads.ts), [unchanged window rules](../../server/payouts/submission-rules.ts), [unchanged processing transitions](../../server/ovr/processing-service.ts).

## Accepted workflow and deferred early Finalization

| Stage | Authority and resulting behavior |
|---|---|
| Draft preparation | Existing current-source assessment, bounded roster, exclusions and Coordinator deferral; no payment authority. |
| **Submit for Coordinator Review** | Existing `ovr.prepare`, including Staff and Coordinator. Allowed before cutoff once the window opens and all mandatory review conditions pass. Saves reviewed entries, one workflow revision, audit, notifications and ledger result atomically; **no new entitlement, allocation, finalization or payment**. |
| Return Payroll to Draft | Existing Coordinator `ovr.finalize` authority, from Review. Required to revise the proposed roster before renewed review. |
| **Finalize Payroll** | Existing explicit Coordinator `ovr.finalize` decision; still blocked through **27 October**, including that entire Manila day. On/after **28 October**, fresh source/roster validation and all existing claim/reservation guards remain required. |
| **Submit Official Payroll** | Existing `ovr.submit`, Finalized → Submitted; separate decision and recorded date/reference. |
| **Process Payroll** | Existing `ovr.process`, Submitted → Processed. Processing does not create a Paid outcome. |
| Record Payments | Existing separate recording, actual-receipt/Treasury, duplicate-stipend, correction and reconciliation protections. |

**Early Finalization is deferred.** The existing state machine permits returning Review to Draft, but makes finalized batches immutable and uses controlled amendments/omission routes afterward. No established office rule was found that makes those routes an approved general way to freeze early and accommodate subsequent timely applicants. The user's condition for early freezing therefore was not met. No new status, approval role, reopening command or financial write contract was invented.

Receiving/source work can change during Review. Finalization compares the freshly assessed included IDs/fingerprints with the saved review and rejects a changed scope with `PAYROLL_REVIEW_STALE`. An owned test restored a previously deferred member, making **835 current versus 834 reviewed**; finalization rejected it. Existing Coordinator return-to-Draft and renewed review then worked. No automatic exclusion or forced freeze was introduced.

**31 October's office authorization remains unestablished**, as in PAY-NEW-3. Its complete recorded history is preserved. The existing window service constrains cutoff/window setup against that deadline; the processing `submit` handler has no independent “current day no later than final deadline” check. This task neither adds such a rule nor certifies the existing handler as an office deadline policy. Any additional official-submission deadline enforcement or early-finalization/reopening policy needs a separately established decision. Early Review is not authorization for official submission or payment.

## UI and uncertain-result recovery

Both permitted roles now see **Submit for Coordinator Review** above the included roster. Loading, period/preparation/claim restrictions, unresolved timely candidates and an empty roster keep it unavailable with the server reason nearby. Review states explain Coordinator-only return/finalization; the Coordinator's pre-cutoff Finalize control displays the whole-day cutoff reason.

The accepted short roster, 25-row server pagination/search, explicit excluded view, source/history controls and focused Defer modal remain. No redundant Candidate pages table or full-cohort browser download was restored. Preview and its audited export implementation remain unchanged. Two existing processing labels become **Submit Official Payroll** and **Process Payroll**; their handlers/bodies are unchanged.

On the large owned copy, competing review and finalization requests each produced **one HTTP 200 and one HTTP 500**. The captured technical error was **`ER_LOCK_WAIT_TIMEOUT`**. After the winning transaction completed, the losing request's exact retry returned a definitive conflict; original committed retries returned their stored result. Original rows, rollback boundaries and one-commit counts were verified. **The lock-wait limit was not increased and long financial transactions were not moved outside their authorization/transaction guards.**

The existing recovery hook now recognizes `OVR_INVALID_STATE` as definitive **only for review/finalization paths**, after exact retry reaches their ledger-first command handler. A committed key returns its original result before state validation. A state rejection therefore confirms that this key did not commit. The recovery dialog offers **Refresh payroll** after that confirmed rejection. Network/500 uncertainty, permission revocation, changed-key payloads and unrelated payment commands retain their protections.

A real owned browser test committed review, lost its response and retried **two identical requests / one revision increment**. Another first request was deliberately stopped before reaching the server; a different Coordinator then committed review, and the retained original retry received **409 `OVR_INVALID_STATE`**, allowing explicit Refresh. These are fixture operations, not primary operations. [Committed-response recovery](../../output/pay-flow-1-primary-20261026/browser-results/fixture-lost-review.json), [definitive rejection](../../output/pay-flow-1-primary-20261026/browser-results/fixture-definitive-refresh.json), [pending-action explanation](../../output/pay-flow-1-primary-20261026/browser-results/fixture-pending-ui.json).

## Recovery, staging and installation

Actual dirty source supplied staging at `C:/xampp/htdocs/ldss_payflow1_primary_stage_20261026`, excluding private configuration. Git HEAD and old distributions were not substituted. **1,354 starting inputs** were protected. Installed BACKUP-1 passed fresh encrypted capture and complete newly owned isolated restoration twice:

| Checkpoint | Raw SQL / encrypted bytes | Result |
|---|---:|---|
| Before fixture mutations | **93,891,022 / 20,736,081** | All 149 tables and complete restoration passed |
| Before coordinated promotion, primary ports quiet | **93,891,940 / 20,736,479** | All 149 tables and complete restoration passed |

Both verified full values/counts/checksums, 66-migration journal, schema objects, columns/indexes/foreign keys/checks/triggers, executable views and rejection probes. Recovery targets/accounts were removed. Nothing was restored over primary. BACKUP-1's finite limits, encrypted format, keys and source-schema READ-lock semantics are unchanged. Final checkpoint SHA-256: `a85fc2aecf85262dcf9826d28d2912acbb22f8869d7cdaa799e07e28c23cd0e5`. Archives and keys remain restricted. [Initial recovery](../../output/pay-flow-1-primary-20261026/recovery.json), [quiet recovery](../../output/pay-flow-1-primary-20261026/activation-recovery.json).

Fresh source/data, tests and transaction-quiescence gates preceded stopping only the verified primary controller tree. Matching API/UI source was installed with 3001/5173 quiet and started through unchanged `node scripts/localhost-5173-profile.mjs synthetic`. Controller/API/Vite changed **54372 / 58724 / 31108 → 38080 / 27808 / 29256**. A final CSS specificity correction was checked in a GET-only staged preview, then installed atomically without another restart. All **310 starting distribution files** remain exact. [Maintenance](../../output/pay-flow-1-primary-20261026/maintenance.json), [installed files](../../output/pay-flow-1-primary-20261026/promoted-files.json), [delivery](../../output/pay-flow-1-primary-20261026/delivery.json).

## Tests and before/after acceptance

| Verification | Result |
|---|---|
| Lint, typecheck, build, secrets | Final matching staging commands all exit **0** |
| `npm test -- --maxWorkers=1` | **130 files / 846 tests passed** |
| Existing disposable regressions | **13 groups exit 0**: Masterlist drafts/workflow/amendments, academic/approved changes, notifications, Registry/main payroll/Treasury/parity, intake/import, historical/omitted payroll, Recording, reconciliation, individual settlement, financial reports |
| Additional owned workflow evidence | **Seven verified groups**, including 834 included/one deferred; 835-person browser review; source/version/role/time restrictions; late failures; retry/concurrency; frozen allocation and full preservation |
| Actual primary | Both roles, five widths, open/cancel, excluded paging, Defer cancellation, keyboard focus, native zoom and preservation; **zero business-command attempts** |

The owned tests cover before-opening rejection; early Review; the whole cutoff day; post-cutoff Review and finalization; expired semester claim period; unresolved timely candidates; changed identity, actual receipt date, academic placement and official publication; stale versions; Staff finalization/submission denial; exact retries/changed payloads; concurrent attempts; complete review/finalization rollback. Existing regressions retain technical/unassigned-role denial, invalid window/deadline setup, historical ownership/omission, duplicate stipend, processing, receipt, reconciliation and financial-output assertions.

The 834-person flow froze **834 entries / 834 allocations**, retained the original deferred member outside that scope and reached Submitted on the owned copy. It created **zero payment records**. All original financial rows remained present at full precision, including the 800 existing payments and earlier frozen payrolls. Exactly **seven** expected workflow notifications appended; all original notification rows remained exact. Browser-copy review/return tests made no finalization or allocation. All mutation tests used newly owned protected **copies of synthetic UAT** or the existing suites' newly owned synthetic targets; no operational database was used. The Node Date/connection-local SQL timestamp controls were test-only; primary dates and machine/database-global time were not changed. [Seven-group evidence](../../output/pay-flow-1-primary-20261026/integration.json), [complete original-row preservation](../../output/pay-flow-1-primary-20261026/fixture-preservation.json), [browser-copy preservation](../../output/pay-flow-1-primary-20261026/browser-copy-preservation.json), [13 regressions](../../output/pay-flow-1-primary-20261026/regressions-all-latest.json), [normal checks](../../output/pay-flow-1-primary-20261026/checks-main.json), [unit log](../../output/pay-flow-1-primary-20261026/unit-final.log).

Actual-primary before/after captures use the same **834-included state**, roles, period, default zoom and 900-pixel height. Identities are masked. Before images were captured before installation; primary was not reverted.

| CSS width | Staff before / after | Coordinator before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/pay-flow-1-primary/staff-before-1440.png) / [After](../../output/playwright/pay-flow-1-primary/primary-staff-after-1440.png) | [Before](../../output/playwright/pay-flow-1-primary/coordinator-before-1440.png) / [After](../../output/playwright/pay-flow-1-primary/primary-coordinator-after-1440.png) |
| 1024 | [Before](../../output/playwright/pay-flow-1-primary/staff-before-1024.png) / [After](../../output/playwright/pay-flow-1-primary/primary-staff-after-1024.png) | [Before](../../output/playwright/pay-flow-1-primary/coordinator-before-1024.png) / [After](../../output/playwright/pay-flow-1-primary/primary-coordinator-after-1024.png) |
| 820 | [Before](../../output/playwright/pay-flow-1-primary/staff-before-820.png) / [After](../../output/playwright/pay-flow-1-primary/primary-staff-after-820.png) | [Before](../../output/playwright/pay-flow-1-primary/coordinator-before-820.png) / [After](../../output/playwright/pay-flow-1-primary/primary-coordinator-after-820.png) |
| 375 | [Before](../../output/playwright/pay-flow-1-primary/staff-before-375.png) / [After](../../output/playwright/pay-flow-1-primary/primary-staff-after-375.png) | [Before](../../output/playwright/pay-flow-1-primary/coordinator-before-375.png) / [After](../../output/playwright/pay-flow-1-primary/primary-coordinator-after-375.png) |
| 320 | [Before](../../output/playwright/pay-flow-1-primary/staff-before-320.png) / [After](../../output/playwright/pay-flow-1-primary/primary-staff-after-320.png) | [Before](../../output/playwright/pay-flow-1-primary/coordinator-before-320.png) / [After](../../output/playwright/pay-flow-1-primary/primary-coordinator-after-320.png) |

Both roles passed **1440 / 1024 / 820 / 375 / 320 CSS pixels**, bounded 25-row rendering, open/dismiss/Escape and trigger-focus restoration. The final scoped rule fixes the inherited **38-pixel** workspace override: actual review actions measure **44 pixels**, with **3-pixel keyboard outlines**, at all five widths. Excluded explanations and the Coordinator Defer modal remain accessible; Staff's absence of Defer is preserved. Tables retain local scrolling, without page-level horizontal overflow. [Staff](../../output/pay-flow-1-primary-20261026/browser-results/primary-layout-staff.json), [Coordinator](../../output/pay-flow-1-primary-20261026/browser-results/primary-layout-coordinator.json).

Both roles also passed native Chrome **200%**, viewport emulation disabled, **712×424 CSS pixels / DPR 2**, including review-form cancellation, focus, Defer and excluded access. Captures use the rendered viewport without resizing. Zoom returned to 100% and task windows closed. The ui-ux-pro-max and Playwright workflows were used; full assistive-technology/WCAG certification is not claimed. [Native Staff](../../output/pay-flow-1-primary-20261026/browser-results/native-primary-staff.json), [Native Coordinator](../../output/pay-flow-1-primary-20261026/browser-results/native-primary-coordinator.json), [200% action](../../output/playwright/pay-flow-1-primary/native-primary-coordinator-top.png), [focused modal](../../output/playwright/pay-flow-1-primary/native-primary-coordinator-defer.png).

## Exact files, preservation and stop

**11 package files: ten existing changes and one addition.**

| Files | Change |
|---|---|
| `server/ovr/rules.ts`, `service.ts` | Shared opened/pending/nonempty guard; cutoff applies to finalization, not review |
| `server/ovr/detail-model.ts`, `detail-reads.ts` | Read-only blocker metadata using the same period/preparation/claim/readiness guards |
| `src/OvrDrafts.tsx`, `PayrollDraftRoster.tsx` | Direct action, accurate blockers, review-versus-freeze wording and cancellation focus |
| `src/OvrProcessingPanel.tsx` | Two action labels only |
| `src/prior-command.ts`, `PayoutCommandRecovery.tsx` | Scoped definitive-state classification and explicit refresh after a noncommitted rejection |
| `src/styles.css` | Append one scoped touch-size rule after the exact accepted prefix |
| New `tests/payroll-early-review.test.ts` | Five readiness boundaries and three exact-recovery cases |

**1,344 of 1,354 starting files remain exact**, with none missing. All other existing tests, financial writers/readers/output builders, source resolution, eligibility, finalization/allocation persistence, deferral, processing, amendment, reconciliation, authentication, roles/grants, migration SQL, BACKUP-1, dependencies, fonts, flags, private configuration and launcher remain exact. The command persistence section from state transition onward is byte-identical. **280 of 283 compiled server files** remain exact; only OVR rules, service and detail reads differ. [11-file hashes](../../output/pay-flow-1-primary-20261026/candidate-files.json), [source boundary](../../output/pay-flow-1-primary-20261026/source-preservation.json), [writer/build proof](../../output/pay-flow-1-primary-20261026/build-verification.json).

Client assets change **1,527,796 → 1,528,910 bytes**, **+1,114**; JS **+1,042**, CSS **+72**, observed CSS gzip **51,361 → 51,370**. No polling, new endpoint, cross-request eligibility cache or financial reader was added. [Bundle inventory](../../output/pay-flow-1-primary-20261026/bundle-impact.json).

Final full comparison preserves every starting business value/count and schema object, 66 migration rows/timestamps, account/password/role data, grants, original audit rows and all payment evidence. **PAY-003 remains Draft v2 with the original deferral, no frozen roster and no allocations/payments.** All **20,207** starting audits remain exact at full precision. Six task logins and four logouts append **ten authentication events (20,217 total)**; sessions **76 → 82**. The first pair correctly reached the unchanged 30-minute idle limit during isolated testing and was replaced through ordinary login. Further short sessions verified the final touch-size correction. All six task sessions are now revoked; saved initial/final cookies return 401. No expiry, password, permission or session safeguard was weakened, and the user's separate sessions were not revoked. This is qualified authentication activity, not zero database writes.

All owned test/recovery schemas and technical accounts were removed; temporary services are stopped. Primary and retained/LAN listener owners are preserved after the documented primary restart. **76 paused LAN-R2A artifacts and 16 earlier ML-1 investigation files** remain exact. This is not a new exhaustive inventory of every retained/operational database or generated development cache. [Final preservation](../../output/pay-flow-1-primary-20261026/final-preservation.json), [cleanup/revocation](../../output/pay-flow-1-primary-20261026/delivery.json).

Test orchestration findings are retained: a receipt annotation outside the authoritative projection was initially used as a negative probe, then replaced with actual received-date evidence; a TypeScript union needed explicit narrowing; large-race expectations needed ledger-confirmed handling of lock timeout rather than assuming every loser is HTTP 409; the final preservation helper was corrected to assert exactly the expected notification additions and preserve every original row. Workflow stages were resumed on the owned target after those harness assertions, and the terminal full-inventory/prefix check passed. Initial idle-session browser attempts were excluded from accepted screenshots. The final touch-size specificity issue was corrected in a GET-only preview with an isolated cache, then normal checks and primary acceptance were repeated. No financial validation or assertion was removed to make a business operation pass.

Review artifacts: [patch](../../output/pay-flow-1-primary-20261026/PAY_FLOW_1_PRIMARY.patch), [source ZIP](../../output/pay-flow-1-primary-20261026/candidate-source.zip), [compatible review build](../../output/pay-flow-1-primary-20261026/compatible-build.zip). Exact-byte patch/apply round trip passed against the actual dirty baseline under `output/pay-flow-1-primary-20261026/baseline/`. Archives exclude credentials, keys, `.env` and private records. The review build omits server PDF/template assets and is **not a complete LAN release**. Future rollback must coordinate source/API/UI and preserve later legitimate records; no database restore, history deletion or activation reversal is appropriate.

Remaining limits: long full-scope assessment and serialized financial writes remain; concurrent large commands can produce recoverable lock-timeout uncertainty. No office concurrency, latency SLA, maximum-load, cold-start or full accessibility certification is supplied. Early Finalization and any new reopening/deadline policy remain separate decisions. The existing build chunk warning remains. LAN-R2A may consider matching API/UI only through separate complete packaging, pilot-boundary/policy review, target recovery and witnessed acceptance; it was not resumed or deployed.

**Stopped after PAY-FLOW-1 installation, verification and reporting. No primary review, finalization, official submission, processing, payment, new draft, deferral, deadline, Masterlist, approval or source-record command occurred. No operational LAN service/configuration/database changed.**
