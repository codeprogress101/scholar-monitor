# PAY-NEW-2 — Approval and new payroll workflow correction

26 October 2026, Philippine time. **Implemented and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/). All 835 existing prior approvals are usable under a narrowly verified initial-publication compatibility rule. New scholars are shown as unassigned to a new payroll; historical ownership and payment protections remain. No primary draft, approval renewal, payment or deadline-extension command was submitted by this task. Stopped after verification and reporting.**

**Important intervening state:** the deadline was 23 October at the starting checkpoint. A separate Coordinator session recorded **31 October / revision 3** at **07:39:03.484 Philippine time** during this work. Its history and command were preserved. The final UI therefore offers authorized Coordinators the existing new-window form under that recorded configuration; task automation only opened and cancelled it. This report verifies the recorded operation, **not its underlying office approval**. It does not authorize financial processing or certify a free-text reason as sufficient authority.

This follows the explicit PAY-NEW-2 authorization and [PAY-NEW-1 investigation](PAY_NEW_1_CONSOLIDATED_AUDIT.md), preserving accepted [ML-1.2](ML_1_2_BULK_CONFLICT_REMOVAL_REPORT.md) and [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md). LAN-R2A remains paused.

## Target, checkpoints and activation

| Item | Verified result |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Application | Existing **synthetic / loopback 5173 / 3001** |
| Current Masterlist | Batch 1, **`a6f45315-4b8b-46f8-b91d-bedc58cd6cc2`**, **Published / v415 / 835 members** |
| Working year / semester | **TWO-BATCH-YEAR / TWO-FIRST** |
| Schema | **149 tables / 66 accepted migrations**, original SQL hashes and applied timestamps unchanged |
| Starting controller / API / Vite | **31364 / 53844 / 56828** |
| Final controller / API / Vite | **34892 / 53616 / 60116** |

The actual dirty workspace supplied isolated staging at `C:/xampp/htdocs/ldss_paynew2_primary_stage_20261026`. A checkpoint protects **1,345 existing inputs**; Git HEAD and older data were not substituted. Accepted ML-1/ML-1.1/ML-1.2 hashes matched. [Inspection](../../output/pay-new-2-primary-20261026/inspection.json), [preflight](../../output/pay-new-2-primary-20261026/preflight.json), [starting file hashes](../../output/pay-new-2-primary-20261026/files-before.json).

BACKUP-1 encrypted capture and complete newly owned isolated restoration passed before source work and before each coordinated installation:

| Checkpoint | SQL bytes / encrypted bytes | Result |
|---|---:|---|
| Starting state | **91,004,390 / 20,389,641** | Complete restore passed |
| First installation, primary ports quiet | **91,008,308 / 20,391,696** | Complete restore passed |
| Final context-wording installation, ports quiet | **91,008,308 / 20,391,732** | Complete restore passed |

Each verified all 149 tables, complete values/counts/checksums, migration journal, schema inventory, indexes, foreign keys/checks, triggers, executable views and rejection probes. Recovery schemas/accounts were removed. Nothing was restored over primary. Source-schema READ locks were used by the existing backup tool; no server-wide global read lock was added. Existing **128 MiB SQL / 192 MiB decoded envelope / 96 MiB archive / 100,000 rows per table / 120-second tool** bounds remain unchanged. Distinct live snapshots are not asserted to have identical SQL hashes. Keys and archives remain private. [Starting recovery](../../output/pay-new-2-primary-20261026/recovery.json), [first activation recovery](../../output/pay-new-2-primary-20261026/activation-recovery.json), [final recovery](../../output/pay-new-2-primary-20261026/final-context-recovery.json).

Only the verified primary controller tree was stopped, and matching source was installed with 3001/5173 quiet. Both activations used the unchanged `node scripts/localhost-5173-profile.mjs synthetic` launcher. The second completed a diagnostic distinction between current-year COR and prior-year COG placement; it changed no writer or data. All **310 starting distribution files** remain exact for retained servers. The compatible build is archived separately. Temporary fixture/preview services are stopped. [First maintenance](../../output/pay-new-2-primary-20261026/maintenance.json), [final maintenance](../../output/pay-new-2-primary-20261026/maintenance-final-context.json), [final installed hashes](../../output/pay-new-2-primary-20261026/promoted-final-context-files.json), [delivery](../../output/pay-new-2-primary-20261026/delivery.json).

## Exact approval compatibility contract

Original approvals, timestamps, reference/source evidence, member snapshots and stored hashes are immutable. Exact matching sources retain their existing path. A different hash is accepted only when all of the following are proven:

1. The saved snapshot reproduces its original hash. Exactly one standing row differs, and restoring that row reproduces the complete original source hash.
2. That row retains the same annual ID, qualification status/version and all other fields. Its only changes are **Selected with NULL operational standing / version 0 / no standing date → initial Active / version 1 / activation date**.
3. The actual activation belongs to the same scholar and receiving academic year; its effective date matches standing, and its recorded activation follows the original recorded approval.
4. The linked Masterlist is Published or Locked in that year. Its publication hash matches the publication snapshot and the recorded **Approved → Published** workflow snapshot, actor and resulting version.
5. Its published entry identifies the exact scholar/annual record and the unchanged person and scholarship versions. Publication timing/effective date agree with the activation.
6. Current source checks pass, including available receiving authority/policy, participation and absence of adverse evidence. The prior-approval authority must also remain applicable to its exact import and semester.

This is not a general standing exclusion. Changed documents, receipts, identity, academic placement, qualification, adverse standing, subsequent standing versions, unrelated publication, wrong year/member, invalid hash or unavailable authority reject compatibility. Caches are scoped to the existing read context; there is no persisted authorization exception or new grant.

The actual original **835/835** approvals pass, with their **original stored source hashes**. The earlier **1,000** approvals remain valid too. The public read projection can explain the compatible publication relationship without replacing original evidence. [Complete source comparison](../../output/pay-new-2-primary-20261026/approval-summary.json), [both-role final API verification](../../output/pay-new-2-primary-20261026/http-oracles-final.json). Exact private identity/hash mappings remain in [restricted comparison evidence](../../output/pay-new-2-primary-20261026/private/source-comparisons.json).

COG remains explicitly **Verified — prior batch approval**. Its usable attestation does not claim an individual school/course or grade verification against a nonexistent preceding-year academic record. Current COR individual verifications remain retained. No prior-year academic record, GPA, category revision or individual finding was manufactured. The quick-review component no longer requests unnecessary individual context for an already usable prior approval. When individual verification is actually required, its error names the document-covered year/semester and distinguishes prior-year COG from current-year COR placement.

## Registry and regular-versus-historical source context

The existing Registry API now supplies the effective batch, semester/year and published/Active status. New published scholars without an applicable newly prepared batch show **“Not yet assigned to a new payroll”**, with payout eligibility **false**. Academic/document readiness remains separate. The 835 are not silently assessed against PAY-001.

Historical sources are resolved through the requested batch, a supported omission origin or the scholar's recorded historical ownership. For older first batches without explicit member-scope snapshots, ownership is established from their recorded prior-approval membership; a newer approval cannot erase it. The cycle root alone is insufficient. A sole historical draft is not treated as an unrelated scholar's ordinary new draft.

A genuinely independent ordinary batch uses its own window and existing source-backed ordinary assessment. A scholar who belongs to a historical source still needs the established omission-origin contract before transfer to a later batch. No new financial write contract was introduced. The independent finalization, allocation, source pin, omission, duplicate-stipend and payment guards remain.

| Actual representative | Final behavior |
|---|---|
| New 835-member cohort | Published and Active; complete usable document basis; **unassigned**, no assessed batch, not declared payable |
| Existing paid PAY-001 member | **Paid this semester**, explicit **PAY-001 / TWO-FIRST** context; original reservation preserved |
| Existing PAY-002 member | **Already on payroll**, explicit **PAY-002 / TWO-FIRST** context; pending outcome remains pending |

Both roles' final authenticated checks cover **all 835**, not only screenshots. Four actual payment-summary comparisons—both roles, both payrolls—are byte-identical before/staged/after. [Final API checks](../../output/pay-new-2-primary-20261026/http-oracles-final.json), [payment comparisons](../../output/pay-new-2-primary-20261026/financial-after.json), [existing-payroll browser checks](../../output/pay-new-2-primary-20261026/browser-results/browser-existing-payrolls.json).

Concatenated academic explanations become a concise lead with separate underlying conditions. Document-specific timing reasons retain separate references; generic duplicates are consolidated. Normal/incomplete summaries remain accessible in a disclosure, with unassigned payment assessment described honestly. Links lead to existing payroll preparation or semester assessment/document review. No genuine blocker is made eligible through presentation.

## New-draft entry point and the changed deadline

**Payroll → Period, submission windows & administration → Create New Payroll Draft & semester submission windows** reuses the existing Coordinator `open-window` operation. It creates neither a draft nor payment on publication. The new read-only availability projection explains configuration, cycle availability, preparation closure, sequencing and deadline restrictions.

The frontend now recognizes the backend's existing supported configuration: two normal mapped terms **or the reviewed finalized historical first-semester exception**. Primary still has its original one-term configuration; no second semester was manufactured there. Staff receives an explicit role explanation. The server's existing `payroll.windows.manage` authorization and command validation remain unchanged.

At the starting checkpoint, the final deadline was **23 October / revision 2**, and no prospective window fit. During this work a **different Coordinator actor**, outside the task's two accounts, used the existing extension operation to record **31 October / revision 3**, with a matching audit and durable command-ledger result. Two other non-task logins and two logouts were also recorded. Original rows were compared at full precision after excluding precisely that new deadline row, its command and appended audit events; no other business delta was found. The installation checkpoint was refreshed to preserve this intervening state. [Intervening preservation](../../output/pay-new-2-primary-20261026/intervening-preservation.json); exact recorded input remains in [restricted audit evidence](../../output/pay-new-2-primary-20261026/private/intervening-audit.json).

Consequently the final Coordinator form is **available under recorded revision 3** and enforces a cutoff no later than **31 October**. Automation opened and cancelled it at five widths, submitting no primary command. The expired-deadline rejection remains proven on owned fixtures; no exception, backdating or automatic extension was added. The **24 October target-date warning remains separate**, and the semester still ends **21 February 2027**. Office authority for the recorded extension must be reviewed before a separately authorized new-payroll walkthrough. This task does not establish it from the record's free-text reason.

## Files, tests and browser acceptance

**16 package files: 13 existing changes and three additions.** The hash inventory is authoritative.

| Files | Scope |
|---|---|
| New `server/requirements/prior-approval-compatibility.ts`; `prior-approval-source.ts` | Strict compatibility proof and live approval-authority checks; original evidence retained |
| `server/eligibility/semester-sources.ts`, `model.ts` | Correct source ownership/context; structured academic and distinct document-timing explanations |
| `server/scholars/registry-eligibility.ts` | Applicable draft selection, effective context and unassigned status |
| `server/payouts/submission-service.ts` | **Read projection only**: availability reasons matching existing command prerequisites |
| `server/requirements/workflow-service.ts` | Covered-year diagnostic wording; workflow class/writer unchanged |
| `src/RegistryEligibility.tsx`, `scholar-issue-navigation.ts` | Explicit context, concise reasons and existing destinations |
| `src/PayrollSubmissionWindows.tsx`, `styles.css` | Existing action's clear entry point, restrictions, Cancel focus and scoped 44-pixel / 3-pixel focus styling |
| `src/QuickDocumentReview.tsx`, `ReceivingRequirements.tsx` | Truthful retained/prior-attestation presentation and avoid unnecessary context lookup |
| `scripts/test-registry-parity.ts`; new `test-pay-new-corrections-db.ts`; new `tests/pay-new-compatibility.test.tsx` | Independent original-field parity plus intended metadata checks; owned workflow and negative proof tests |

All Masterlist modules, financial business writers, output builders/report readers, prior-approval creation writer, schema SQL, permissions, dependencies, fonts, flags, `.env`, launcher and global navigation remain exact. The submission-window command body and individual-document workflow class are byte-identical. The CSS retains the exact starting prefix. [Source boundary](../../output/pay-new-2-primary-20261026/source-preservation.json), [16-file hashes](../../output/pay-new-2-primary-20261026/candidate-files.json), [writer/build verification](../../output/pay-new-2-primary-20261026/build-verification.json).

| Validation | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | Final normal commands exit **0** on matching staging |
| `npm test -- --maxWorkers=1` | **128 files / 829 tests passed** |
| New owned integration | **Five groups passed**, full **835-person** ordered workflow plus independent import; final smaller repeat passed after the diagnostic refinement |
| Existing owned integrations | **13 groups exit 0**: Masterlist drafts/workflow/amendments, academic/approved changes, notifications, Registry/Treasury, intake/import, historical/omitted payroll, Recording, reconciliation, individual settlement and financial reports |
| Actual primary | Both-role 835 checks, five-width UI/keyboard checks, existing payroll context, financial summaries, recovery and preservation passed |

Mutation cases cover approval before publication, original-snapshot preservation through all 835 activations, COG attestation versus missing individual context, changed identity/academic/receipt evidence, adverse/subsequent standing, unavailable authority and corrupted official proof. They exercise no-payroll context, independent ordinary sources, historical ownership, expired windows, role denials, late audit rollback, concurrent exact retries and changed-payload rejection. All mutations use newly owned fictional schemas. Primary has **no new batch or financial entry** from this task.

The existing Registry oracle still compares original eligibility, requirements, reasons and links independently. Its adapter removes only intended new presentation metadata and accounts for documented label/document-reason changes; batch identity is independently checked against SQL. Financial pins, validators and source protections were not relaxed. [Final commands](../../output/pay-new-2-primary-20261026/checks-main.json), [unit log](../../output/pay-new-2-primary-20261026/unit-final.log), [835-person integration](../../output/pay-new-2-primary-20261026/full-correction-integration.json), [final repeat](../../output/pay-new-2-primary-20261026/correction-integration.json), [13 final results](../../output/pay-new-2-primary-20261026/regressions-final.json).

Staff and Coordinator passed **1440 / 1024 / 820 / 375 / 320 CSS pixels**, height 900, for Registry details, COG provenance and payroll-window controls. No page/dialog overflow occurred; tables retain local scrolling. Escape/Cancel, keyboard opening, focus restoration and the new trigger's **44-pixel height / 3-pixel outline** passed. Primary write guards recorded **zero business-command attempts**. A fictional browser created a draft through the single existing window command; no payment operation was invoked. [Fictional form/keyboard proof](../../output/pay-new-2-primary-20261026/browser-results/browser-fixture-window.json), [Staff window checks](../../output/pay-new-2-primary-20261026/browser-results/browser-primary-window-staff.json), [Coordinator checks](../../output/pay-new-2-primary-20261026/browser-results/browser-primary-window-coordinator.json).

Representative masked captures: [Registry before](../../output/playwright/pay-new-2-primary/before-registry-1440.png) / [after](../../output/playwright/pay-new-2-primary/after-coordinator-registry-1440.png), [320-pixel Registry](../../output/playwright/pay-new-2-primary/after-staff-registry-320.png), [usable COG attestation](../../output/playwright/pay-new-2-primary/after-coordinator-cog-1440.png), [Coordinator draft controls](../../output/playwright/pay-new-2-primary/after-window-coordinator-1440.png), [Staff restriction](../../output/playwright/pay-new-2-primary/after-window-staff-320.png). Actual identities are masked; mutation images are fictional. The ui-ux-pro-max and Playwright workflows were used. Full assistive-technology/WCAG or office acceptance is not claimed.

Client assets change **1,509,850 → 1,513,099 bytes**, **+3,249**: JavaScript **+3,112**, CSS **+137**; observed CSS gzip **50,927 → 50,955**. Fonts/dependencies remain unchanged. No new polling or HTTP endpoint exists. These observations do not certify cold-start, maximum load, concurrency or LAN capacity. [Bundle inventory](../../output/pay-new-2-primary-20261026/bundle-impact.json).

## Preservation, limitations, recovery and stop

**1,332 of 1,345 starting inputs remain exact**, with none missing. Only the 13 declared existing files differ; the three new package files, this report and task evidence are additions. All 310 retained distribution files remain exact. Final comparison against the refreshed pre-install checkpoint preserves all business values/counts, 66 migration rows/timestamps, schema objects, account/password/role data, runtime grants and original audits. It covers imports, every prior approval and document event, academic/annual evidence, official publications/activations, frozen payroll sources and all payments/dates.

| Final primary fact | Preserved value |
|---|---|
| Scholars / application accounts | **1,835 / 14** |
| Intake / academic / annual scholarship records | **1,835 / 1,835 / 1,835** |
| Masterlists / stored entries / activations | **3 / 2,002 / 1,835** |
| Current Batch 1 | **Published / v415 / 835 active members**, 167 retained removals |
| PAY-001 / PAY-002 | **2 Paid / 798 Pending** and **200 Pending** |
| Every Paid record | Complete evidence exact; both actual dates **2026-10-24** |
| New primary payroll batches | **0**; existing two processed batches remain |

All **19,376** starting audits remain exact. The independently recorded deadline extension and four non-task authentication events were retained. Two task logins/two logouts add four task authentication events: **19,385 total**. Sessions change **62 → 66**, accounting for the two separate user logins and two task logins, with ordinary last-seen/revocation activity. All **19,383 pre-install audits** also pass a full-precision original-prefix checksum after the two task logouts. These are qualified changes, not a claim of zero database writes or a claim that the deadline never changed. [Intervening proof](../../output/pay-new-2-primary-20261026/intervening-preservation.json), [full-precision audit proof](../../output/pay-new-2-primary-20261026/audit-prefix.json), [final preservation](../../output/pay-new-2-primary-20261026/final-preservation.json).

Both task accounts signed out by keyboard: **204**, then **401**. Their originally saved cookies also return **401**, proving server-side revocation. Task browser windows closed; the user's separate sessions were not revoked. Temporary services and owned test/recovery targets were removed. Unrelated retained accounts/environments were not reset. The **76 paused LAN-R2A artifacts and 16 earlier ML-1 investigation files** remain exact; retained/LAN listeners retain their original owners. This is not a fresh exhaustive inventory of every retained database. [Revocation](../../output/pay-new-2-primary-20261026/revocation.json), [final delivery](../../output/pay-new-2-primary-20261026/delivery.json).

Staging caught an over-broad standing comparison, the historical omission-owner regression, and presentation-specific Registry parity differences; final checks cover the corrected behavior. Test automation also needed the actual calendar-coverage hash, applicable second-period policy, a valid authority-scope rejection probe, settled document navigation and absolute browser API URLs. One exploratory fictional window creation committed before its result collector failed; it was retained in that disposable target, not repeated with the same uncertain action on primary. Final accepted browser evidence uses a fresh owned target. Scoped CSS specificity corrected the inherited 38-pixel trigger. Initial failures/logs remain; no safeguard was weakened.

Review artifacts: [patch](../../output/pay-new-2-primary-20261026/PAY_NEW_2_PRIMARY.patch), [source archive](../../output/pay-new-2-primary-20261026/candidate-source.zip), [compatible build](../../output/pay-new-2-primary-20261026/compatible-build.zip). Patch checking and an independent exact-byte apply round trip passed against the actual dirty baseline. Archives exclude credentials, keys, `.env` and private records. The review build omits server PDF/template assets and is **not a complete LAN release**. Saved starting inputs remain under `output/pay-new-2-primary-20261026/baseline/`. Rollback must coordinate compatible API/UI and preserve later legitimate data, the recorded deadline history and BACKUP-1 capability; no database restoration, downgrade or history deletion is appropriate for this source change.

No new write contract, migration or permission expansion was required. Before new primary payroll UAT, separately verify the office authority/source for the recorded 31 October deadline, authorize the intended draft/window, review actual candidates and retain all existing finalization/submission/processing and actual-payment decisions. No payment authority follows from this technical acceptance. Existing Q28–Q31 policy/forms gates remain separate. LAN-R2A may consider these matching API/UI changes only through separately authorized complete packaging, target recovery, source-policy review and office acceptance; it was not resumed here.

**Stopped after PAY-NEW-2 installation, verification and reporting. No primary approval renewal, academic backfill, Masterlist mutation, new payroll, payment, historical reclassification or task-authored deadline extension occurred. No LAN service/configuration/database was changed.**
