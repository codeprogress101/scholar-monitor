# PAY-NEW-3.2 — Payroll preview, deferral and connection reliability

26 October 2026, Philippine time. **Implemented and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/#payouts?cycle=829ae3dc-9b49-4d88-9dfe-0a7250b164c0&batch=7f337596-c36d-41d7-b715-368fd4633b1d). PAY-003 remains Draft / revision 2, with 834 included, 1 deferred, 1,000 blocked and zero awaiting review. Its existing deferral committed before this task; it was not replayed or changed. All 800 Paid records and dates remain exact.** LAN-R2A remains paused.

The included roster is now the default bounded table. Defer opens a focused modal and retains the exact command during an uncertain response. Preview generation no longer holds the shared mutation/user locks throughout its expensive assessment. Large previews still take time; this is not an instant-generation or concurrency-capacity claim.

## Actual PAY-003 and the attempted deferral

| Verified item | Result |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306 |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Application | Existing synthetic, loopback 5173 / 3001 |
| PAY-003 ID | `7f337596-c36d-41d7-b715-368fd4633b1d` |
| Workflow | **Draft / revision 2**, unchanged |
| Window | Opens **26 October**; cutoff **27 October / window revision 1**, unchanged |
| Recorded final deadline | **31 October / revision 3**, unchanged; this task supplies no new office authority |
| Current assessment | **834 included + 1 deferred + 1,000 blocked + 0 awaiting review = 1,835** |
| PAY-003 stored entries / allocations / payment records | **0 / 0 / 0**; its draft roster is a current assessment, not frozen membership |
| Published Masterlist | Batch 1, **Published / v415 / 835 active members**, unchanged |
| Existing payrolls | PAY-001 **processed / v805 / 800 Paid**; PAY-002 **processed / v5 / 200 Pending**, unchanged |
| Schema | **149 tables / 66 accepted migrations**, original SQL checksums and applied timestamps |

The separate Coordinator created PAY-003 at **10:31:01.323**. The deferral row was recorded at **10:41:02.918**, its Draft revision-2 event at **10:41:02.920**, and its concluding audit at **10:41:02.929**, all Philippine time. The existing command ledger contains command `0dd1877a-db64-4339-ac8f-91338e463208` and its successful revision-2 result. These independent records establish a **committed deferral**, rather than a rejection or rollback. The reported 835-included screen predates that current result.

The exact name, permanent Scholar ID, Registry/annual IDs, deferral, audit/request and command references are in the restricted [attempted-deferral CSV](../../output/pay-new-3-2-primary-20261026/private/attempted-deferral.csv). Names and IDs are not reproduced here. **Do not repeat the original command to investigate it.** Its recorded reason does not establish individual-payment authority. [Commit evidence](../../output/pay-new-3-2-primary-20261026/deferral-result.json), [PAY-003 stored counts](../../output/pay-new-3-2-primary-20261026/pay003-counts.json).

## Causes and measured preview behavior

The original **Preview payroll (draft)** control is a link to `GET /api/v1/ovr-batches/:id/payroll-form?draft=true`, opening a separate HTML document. Word uses that same endpoint with `format=docx`. The handler reauthorizes, reads the batch and current sources, builds the managed roster, records `payroll.export`, then renders HTML or Word. It does **not** invoke payroll preparation, finalization, processing, allocation or payment commands. **It is an audited export, not a database-write-free GET.**

Three concrete contributors were found:

1. The old export held the shared configuration and actor locks while evaluating the entire cohort. On the isolated copy, a concurrent `/auth/me` for the same actor waited **50,556 ms** and returned **500**. Its browser timeout is 15 seconds. This reproduces account-connection failure without an invalid password or revoked role.
2. Semester-claim checks repeatedly loaded/cloned the same batch payment collection for individual scholars. The CPU profile attributed about **7.9 seconds** of cloning to that raw payment query. Initial-publication compatibility also cloned an entire official membership map per scholar.
3. Complete review sent approximately **10.1 MB / 1,835 candidate records** to the browser, alongside a second candidate-page table. The old Defer form was below that roster. Its request used the generic **15-second** timeout and did not preserve an uncertain body against edits or navigation.

The original browser response delivery cannot be reconstructed from the ledger alone. Its successful commit is certain; a lost/timed-out response is consistent with the implementation and measured workload. It is not claimed that the original browser trace was recovered.

| Isolated source-copy observation, 834 included | Original | Revised observation |
|---|---:|---:|
| Draft HTML API | **49.45 s / 17,225 SQL calls** | **29.18 s / 4,048 SQL calls**, including concurrent account probe |
| Concurrent same-actor `/auth/me` | **50.56 s / HTTP 500** | **6.4 ms / HTTP 200** |
| HTML bytes | **4,757,830** | **4,757,830** |
| Word API / bytes | **44.79 s / 184,743** | **35.34 s / 184,742** before the additional claim-index refinement |
| Included-page response | Whole review **10,128,995 bytes** | **106,328 bytes / 25 returned rows** in the profiled page |

These are local observations, not matched maximum-load benchmarks; host contention, garbage collection and the profiling sequence varied. Word ZIP bytes are not asserted identical across generation times. The original and revised **form rows and every candidate fingerprint/decision** matched independently for all **1,835** records. Renderers, fonts, branding and financial output builders are unchanged.

Instrumented aggregate SQL elapsed time for the HTML samples was **19.58 s originally / 14.94 s revised**, the latter including the small account probe. This is not CPU time. Observed process RSS reached about **1,162 MiB** in the original HTML sequence, **1,656 MiB** in its later Word run and **874 MiB** in the revised HTML/concurrent-account run. The sequences and preceding allocations differ; these observations establish neither a paired memory improvement nor a worst-case memory bound.

The final real-primary browser preview returned **200**, **834 student rows / 42 pages / 13,137 DOM nodes**, all marked **DRAFT — NOT FOR PAYMENT**. It loaded in **16.37 s**; the complete browser collector took **16.58 s**. Request-to-first-byte was about **16.12 s**, transfer about **143 ms**, and response-end to DOM ready about **75 ms**. The dominant wait is server assessment, not subsequent HTML DOM construction. This generated one expected task export audit and no financial command. [Actual preview evidence](../../output/pay-new-3-2-primary-20261026/browser-results/primary-preview.json), [masked preview](../../output/playwright/pay-new-3-2-primary/primary-draft-preview.png), [original measurements](../../output/pay-new-3-2-primary-20261026/performance-before.json), [lock reproduction](../../output/pay-new-3-2-primary-20261026/performance-old-concurrency.json), [revised concurrent read](../../output/pay-new-3-2-primary-20261026/performance-new-concurrency.json).

The separate “Please sign in” report is not attributed to timeout alone. Authentication returns 401 for an unavailable/expired/revoked token; a temporary 500 does not clear the retained workspace. Recorded session metadata shows a previous user session was revoked by the **10:36:16** replacement login, followed by another login at **10:36:34**. Without the original browser/token trace, the particular sign-in screen cannot be tied conclusively to one session. Expiry and revocation checks remain unchanged.

## Implemented correction

Preview assessment now uses the existing consistent **READ ONLY snapshot** and its post-read authorization check. A separate, fresh `ovr.prepare` authorization guards the **same export audit insertion** before returning the generated document. Audit failure still prevents delivery. No financial command was moved outside its guarded transaction.

Request-local indexes select only the relevant payment/official-publication member from the unchanged authoritative readers. Payment/correction ordering, duplicate-stipend reservations and compatibility checks remain. No result cache survives a projection; existing write invalidation remains. No SQL/history was pruned and no safety limit was raised.

The managed unfrozen draft now shows batch/status, year/semester, included and awaiting-review counts, cutoff, next action and preview above **one included roster**. Search and pagination run on the server, returning **25 rows**, using the existing **160-character search / maximum 100-row page / bounded offset** contract. Preview is disabled until the current roster read is available, avoiding an immediate duplicate expensive request.

**Review Excluded Scholars** explicitly replaces that table with paged blocked/deferred/review records and complete existing reasons/destinations. Its summary separates the counts. Back restores included view. No historical/already-allocated scholar is inserted into the normal roster. History, source checks, deferrals/restoration, finalization, processing, corrections and financial navigation remain available under existing permissions. Frozen/legacy workflows keep their established paths.

The existing candidates GET accepts optional `view=included|excluded`. Those views **still assess the complete authoritative scope on the server before pagination**, returning current summary and the complete source hash; the browser does not fetch/render all 1,835 DTOs. The original partial annual-page contract remains available. No “eligible by SQL shortcut” or stale cross-request eligibility cache was introduced. Full server assessment remains a cost of each such read.

Defer opens the existing native modal component at the viewport, names the selected person, focuses the reason, requires confirmation and restores focus on Cancel/Escape. It reuses the unchanged Coordinator-only POST and standard **300-second bounded command/recovery hook**. Unknown responses retain the exact body/key, disable edits/dismissal/navigation, and offer **Retry Exact Deferral**. A confirmed operation reloads the current counts. Revision/source/role revalidation, audit, transaction and command-ledger behavior remain server enforced.

Failed period reads now say the count is **unconfirmed**, with Retry; they are not displayed as zero configured periods. Transient account failure retains the workspace. A genuine fixture logout/401 still requires sign-in. No global timeout, session expiry, cookie, CSRF, role or grant was weakened. [Read/connection checks](../../output/pay-new-3-2-primary-20261026/browser-results/fixture-read-states.json), [real 401 acceptance](../../output/pay-new-3-2-primary-20261026/browser-results/fixture-auth-state.json).

## Source, recovery and acceptance

**11 package files: nine existing changes and two additions.**

| Files | Scope |
|---|---|
| `server/requirements/prior-approval-compatibility.ts` | Selective request-local official-proof lookup; original proof conditions retained |
| `server/ovr/reprocessing.ts` | Semester-claim read index; deferral/financial writers unchanged |
| `server/ovr/detail-model.ts`, `detail-reads.ts` | Bounded included/excluded read projection and metadata |
| `server/ovr/service.ts` | Preview read/export-audit transaction separation; command implementations unchanged |
| New `src/PayrollDraftRoster.tsx` | Paged roster, secondary exclusions and focused exact-retry deferral |
| `src/OvrDrafts.tsx`, `PayoutCyclesPage.tsx`, `PayrollSubmissionWindows.tsx`, `styles.css` | Integrate draft context/actions and accurate read failures; retain batch-list setup/navigation |
| New `tests/payroll-draft-review.test.tsx` | Nine focused read-boundary/presentation cases |

**1,342 of 1,351 starting inputs remain exact**, with none missing. All **310 retained distribution files** remain exact. The prior CSS prefix is byte-exact. Server command/deferral writer bytes are preserved; **279 of 283 compiled server files** are unchanged. No migration, dependency, permission, flag, launcher, private configuration or financial output builder changed. Client assets grow **1,515,624 → 1,527,796 bytes**, **+12,172**; CSS gzip **51,141 → 51,361**. [Hashes](../../output/pay-new-3-2-primary-20261026/candidate-files.json), [source boundary](../../output/pay-new-3-2-primary-20261026/source-preservation.json), [writer/build proof](../../output/pay-new-3-2-primary-20261026/build-verification.json), [bundle](../../output/pay-new-3-2-primary-20261026/bundle-impact.json).

Staging at `C:/xampp/htdocs/ldss_paynew32_primary_stage_20261026` used the actual dirty accepted source, preserving PAY-UI-1/PAY-NEW-2/ML-1.2/BACKUP-1 and later legitimate files. The first backup lock acquisition timed out behind a long read, accepted no archive and closed its connection. A later capture passed; no backup limit or lock requirement was bypassed.

| Fresh BACKUP-1 checkpoint | Raw SQL / encrypted bytes | Complete isolated recovery |
|---|---:|---|
| Before fixture mutations | **93,888,653 / 20,735,000** | Passed; target/account removed |
| Before promotion, primary ports quiet | **93,889,571 / 20,735,350** | Passed; target/account removed |

Both restored all **149 tables**, complete values/counts/checksums, 66-journal inventory, columns/indexes/foreign keys/checks/triggers/executable views and rejection probes. The final archive SHA-256 is `43ec7f366c9bc3edb8e945c17c8948c834ffd1da4a80f7958f71732fde5100a4`. Keys/archives remain private; finite BACKUP-1 bounds and source-schema READ-lock semantics are unchanged. Nothing was restored over primary. [Initial recovery](../../output/pay-new-3-2-primary-20261026/recovery.json), [quiet recovery](../../output/pay-new-3-2-primary-20261026/activation-recovery.json).

After gates and write-quiescence checks, only the verified primary controller tree was stopped. Matching source was installed while 3001/5173 were quiet, then started through the unchanged synthetic launcher. Controller/API/Vite changed **34892 / 53616 / 60116 → 54372 / 58724 / 31108**. Retained/LAN listeners kept their owners. [Maintenance](../../output/pay-new-3-2-primary-20261026/maintenance.json), [installation](../../output/pay-new-3-2-primary-20261026/promoted-files.json).

| Validation | Final result |
|---|---|
| Lint, typecheck, build, secrets | Exit **0** on matching staged code; final newline-only preservation repeated lint/build with identical reviewed client output |
| Unit tests | **129 files / 838 tests passed**, one worker |
| Existing disposable regressions | **13 groups exit 0**: Masterlist drafts/workflow/amendments, academic/approved changes, notifications, Registry/main payroll/Treasury, intake/import, historical/omitted, Recording, reconciliation, individual settlement, financial reports |
| Additional owned-copy integration | **Six groups passed**: all-1,835 source parity; bounded first/last/search/excluded pages; Staff denial; late-audit rollback; exact retry/stale/changed-input rejection; count refresh and 835-person fixture |
| Browser lost response | Real first deferral committed; response deliberately lost. **Two identical requests / one revision increment**, protected modal/navigation, **834 included / 1 deferred / 1,000 blocked** afterward, only on the owned copy |
| Actual primary | Both roles, five widths, modal cancel/focus, paged exclusions, real preview, native zoom and preservation passed; **zero business-command attempts** |

All mutation tests used a newly owned protected copy of synthetic UAT, never primary or LAN. Its two fixture-only restorations supplied an **835-included** draft for acceptance; its later deliberate deferral is unrelated to the preserved primary attempt. All other financial/source tables and schema matched, including the 800 payments. The copy, its definer/runtime accounts and port 3026 server were removed. [Six groups](../../output/pay-new-3-2-primary-20261026/integration.json), [lost-response browser proof](../../output/pay-new-3-2-primary-20261026/browser-results/fixture-lost-response.json), [copy preservation](../../output/pay-new-3-2-primary-20261026/fixture-final-preservation.json), [cleanup](../../output/pay-new-3-2-primary-20261026/cleanup-fixture.json), [normal checks](../../output/pay-new-3-2-primary-20261026/checks-main.json), [unit log](../../output/pay-new-3-2-primary-20261026/unit-final.log), [13 regressions](../../output/pay-new-3-2-primary-20261026/regressions-all-latest.json).

## Before/after and keyboard evidence

Actual-primary captures use the same 834-included state, role, period, default zoom and 900-pixel height. Names/IDs are masked. Before images include the old opened complete review and redundant lower candidate table; primary was not reverted.

| CSS width | Coordinator before / after | Staff before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/pay-new-3-2-primary/coordinator-before-1440.png) / [After](../../output/playwright/pay-new-3-2-primary/primary-coordinator-after-1440.png) | [Before](../../output/playwright/pay-new-3-2-primary/staff-before-1440.png) / [After](../../output/playwright/pay-new-3-2-primary/primary-staff-after-1440.png) |
| 1024 | [Before](../../output/playwright/pay-new-3-2-primary/coordinator-before-1024.png) / [After](../../output/playwright/pay-new-3-2-primary/primary-coordinator-after-1024.png) | [Before](../../output/playwright/pay-new-3-2-primary/staff-before-1024.png) / [After](../../output/playwright/pay-new-3-2-primary/primary-staff-after-1024.png) |
| 820 | [Before](../../output/playwright/pay-new-3-2-primary/coordinator-before-820.png) / [After](../../output/playwright/pay-new-3-2-primary/primary-coordinator-after-820.png) | [Before](../../output/playwright/pay-new-3-2-primary/staff-before-820.png) / [After](../../output/playwright/pay-new-3-2-primary/primary-staff-after-820.png) |
| 375 | [Before](../../output/playwright/pay-new-3-2-primary/coordinator-before-375.png) / [After](../../output/playwright/pay-new-3-2-primary/primary-coordinator-after-375.png) | [Before](../../output/playwright/pay-new-3-2-primary/staff-before-375.png) / [After](../../output/playwright/pay-new-3-2-primary/primary-staff-after-375.png) |
| 320 | [Before](../../output/playwright/pay-new-3-2-primary/coordinator-before-320.png) / [After](../../output/playwright/pay-new-3-2-primary/primary-coordinator-after-320.png) | [Before](../../output/playwright/pay-new-3-2-primary/staff-before-320.png) / [After](../../output/playwright/pay-new-3-2-primary/primary-staff-after-320.png) |

Coordinator page height changes **4,661 → 2,803 px** at 1440 and **9,442 → 4,248 px** at 320. The old opened deferral form started about **1,580 px below the viewport top** in its reproduction. The new modal stays in view, contains focus, visibly identifies the selected scholar and restores trigger focus. Tables retain local horizontal scrolling; no page overflow was found. [Primary Coordinator](../../output/pay-new-3-2-primary-20261026/browser-results/primary-layout-coordinator.json), [Staff](../../output/pay-new-3-2-primary-20261026/browser-results/primary-layout-staff.json), [320-pixel modal](../../output/playwright/pay-new-3-2-primary/primary-coordinator-modal-320.png).

Both roles passed **native Chrome 200%**, viewport emulation disabled, **712×424 CSS pixels / DPR 2**, on both the 835-person copy and actual primary. Captures use the rendered viewport without resizing. Zoom returned to 100%; task windows closed. The ui-ux-pro-max and Playwright workflows were used. Full assistive-technology/WCAG certification is not claimed. [Native Coordinator](../../output/pay-new-3-2-primary-20261026/browser-results/native-primary-coordinator.json), [Native Staff](../../output/pay-new-3-2-primary-20261026/browser-results/native-primary-staff.json), [200% modal](../../output/playwright/pay-new-3-2-primary/native-primary-coordinator-defer.png).

## Preservation, limitations and stop

The final 149-table comparison preserves every starting business value, schema object, migration row/timestamp, account/password/role and runtime grant. PAY-003 remains **Draft v2**, with its exact original deferral and command evidence. Published membership, annual/academic records, imports, documents, approvals, entitlements, frozen payrolls and reconciliation remain exact. Every one of the **800 Paid records** remains exact: **two dated 2026-10-24 / 798 dated 2026-10-26**. No primary roster, amount, deadline, approval, new payroll or payment command was submitted.

All **20,200 starting audit rows** remain exact. One in-flight user preview completed during initial inspection and its export audit was retained. Two task logins, one real preview export and two task logouts add five task events: **20,206 total**. The refreshed **20,203-row prefix** also matches at full datetime precision. Sessions **73 → 75**, with ordinary last-seen/revocation/rate-limit activity. Both task logouts returned **204**, subsequent probes and saved original cookies **401**. The user's separate sessions were not revoked by this task. [Final preservation](../../output/pay-new-3-2-primary-20261026/final-preservation.json), [delivery/revocation](../../output/pay-new-3-2-primary-20261026/delivery.json).

The **76 paused LAN-R2A artifacts and 16 earlier ML-1 investigation files** remain exact. No operational LAN service, configuration or database was changed. This is not a fresh exhaustive inventory of every retained database.

Review artifacts: [patch](../../output/pay-new-3-2-primary-20261026/PAY_NEW_3_2_PRIMARY.patch), [11-file source ZIP](../../output/pay-new-3-2-primary-20261026/candidate-source.zip), [compatible review build](../../output/pay-new-3-2-primary-20261026/compatible-build.zip). Patch checking and an independent byte-exact apply round trip passed against the saved dirty baseline. Archives exclude credentials, keys, `.env` and database records. The review build omits server PDF/template assets and is **not a complete LAN release**. Any rollback must preserve later legitimate source/data and BACKUP-1 capability; no database restore or history deletion is appropriate.

Remaining limits: complete eligibility assessment still runs on the server for each included/excluded read and export. The 42-page preview remains a multi-second operation; this task does not certify maximum load, concurrent office use or a latency SLA. Financial writes still retain their required serialization, and genuinely lost command responses require exact retry. Narrow tables scroll locally. The original browser's missing response/token trace cannot be reconstructed. Existing build chunk warnings and separate office financial-policy/release gates remain.

**Stopped after PAY-NEW-3.2 implementation, coordinated primary activation, verification and reporting. The original primary deferral was not repeated or changed. No primary financial outcome, Masterlist, approval, source record or deadline changed; no LAN-R2A resumption occurred.**
