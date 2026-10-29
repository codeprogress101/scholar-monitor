# Localhost 800 + 200 prior-processed payroll UAT

Prepared 24 October 2026, Philippine time. This is a **separate synthetic localhost fixture**, applying the user's clarification to preparation only. The preceding A–F fixtures retain their identities and purpose. No LAN roster, identifiable scholar record, new verification policy or application permission is imported or changed.

The target is two imports of 800 and 200 in one academic year/semester, separate official masterlists and payrolls, accepted prior reviews, all outcomes Pending and Payment Recording available for both. **Do not describe that target as achieved until both payment summaries report `canRecord: true`.** The existing second-window timing guard is an identified preparation constraint; final observed state and evidence are recorded below.

## Classification and review procedure

| Staff description | Existing controlled procedure | What it does not establish |
|---|---|---|
| **Already Processed — Requirements Previously Checked** | Identify the actual import and semester and supporting prior-review reference. Coordinator reviews coverage, conflicts and selected scholars, then records the existing scoped prior-batch approval. Document verification, prior academic approval and deadline compliance require separate supported attestations. | A designation or checkbox is not eligibility, a second entitlement or a payment. Previously processed outside LDSS does not mean Paid in LDSS. |
| **Requirements Still Incomplete** | Record only documents actually received. Leave missing documents pending and use normal receiving/verification later. Resolve academic concerns through the applicable review. | Never use prior-batch approval for incomplete or unreviewed requirements. Neither of the requested 800/200 groups belongs to this classification. |

For a legitimate reviewed batch, the existing **Record prior batch approval** dialog supports selecting all ready scholars, source/reference, optional original approval date, explicit review confirmations, per-scholar coverage, current approvals and unresolved issues. Staff need not repeat ordinary per-person COR/COG verification. Coordinator authority remains unchanged. This fixture uses those same application commands, not direct verification/financial inserts.

**Current UI gap:** the import screen has “already approved for the working academic year” and physical-receipt controls; that means selection, not prior COR/COG review. It does not yet expose the two requested classification labels as a Staff import choice. The prior-review dialog is a separate Coordinator workflow. The labels above document the requested distinction; no new selector, permission or blanket approval was implemented. Relevant source: [ScholarImport.tsx](../../src/ScholarImport.tsx), [PriorBatchApproval.tsx](../../src/PriorBatchApproval.tsx), [prior-approval-service.ts](../../server/requirements/prior-approval-service.ts).

## Synthetic evidence and unknown information

The new fixture uses the existing prior-batch scenario pattern with two new, explicitly fictional source packets and workbooks. Every packet is marked synthetic and is not an official approval. Known school and second-year placement are explicit test facts. One quarter of courses are left unknown using the existing Coordinator-confirmed **Course pending** path. Birth dates, contact/address, grades, original approval dates and original historical physical-receipt dates are not invented.

Each generated synthetic packet is received on the actual setup day through the import receiving command. That is **current synthetic custody**, not an invented earlier physical receipt. Historical timeliness is separately supported by the synthetic prior-review attestation, as the existing mechanism permits. Original receipt dates and approval dates remain unknown in the supporting packet; approval date is null in the accepted review. No backdated receipt updates, fake five-check findings, guessed grades or direct approval inserts are used.

**Existing profile boundary:** initial person registration permits unknown placement and optional details; it does not establish annual academic readiness. The approved simple import requires school and year level, with a controlled exception for Course pending. Unknown school/year level cannot currently be forced through that path. Do not fill them with placeholders or silently change a published/frozen placement. Later completion must use its applicable controlled correction/amendment process. Source: [scholar validation](../../server/scholars/validation.ts), [import validation and confirmation](../../server/imports/service.ts).

## Two-payroll timing constraint

The existing historical setup creates **one** reviewed historical root batch. Reusing it when mappings/batches already exist returns `HISTORICAL_SETUP_REVIEW_REQUIRED`; it does not add a second historical batch. The supported subsequent numbered-window path cannot open before today, cannot overlap the first cutoff, and cannot submit/finalize until its whole cutoff day has ended. Attempting submission earlier returns `CUTOFF_NOT_REACHED`.

There is also an independent **source restriction**. A historical cycle requires prior approval from its original import. A later destination uses the existing reviewed omission-origin link **and still requires that same original import**. The second, separate 200-scholar import has valid prior document/academic approval, but cannot satisfy that historical cycle condition. Its payroll preview excludes all 200 with `HISTORICAL_BATCH_APPROVAL_REQUIRED`. It would be false to relabel these separately processed batch members as omissions solely to force inclusion, and an omission link alone would not remove the import mismatch.

The preparation uses a fictional first historical cutoff, then a normally authorized second window on the real setup day to demonstrate the supported path and its guards. It does not edit window history, advance a database/system clock, widen limits, insert allocations or force finalization. The synthetic deadline extension belongs only to this new fixture, through the Coordinator window command; it changes no real financial policy/date.

These are precise limitations for **two separately imported, already processed historical payrolls in one semester**. A future separately approved scope would need to handle additional historical imports/batches with their actual source/date reviews and all current protections. It is not implemented by this task. **Waiting for the cutoff alone does not resolve the second import's source restriction.**

Source: [historical setup](../../server/payouts/historical-setup.ts), [numbered windows](../../server/payouts/submission-service.ts), [cutoff enforcement](../../server/ovr/service.ts), [historical import/source guard](../../server/eligibility/semester-sources.ts), [same-import omission example](../../scripts/test-omission-historical.ts).

## Local operation and evidence

Use the dedicated fixture helper; it never repoints `.env` or resets A–F:

```powershell
node --max-old-space-size=4096 --import tsx scripts/uat-two-batch.ts progress
node --max-old-space-size=4096 --import tsx scripts/uat-two-batch.ts verify
node --max-old-space-size=4096 --import tsx scripts/uat-two-batch.ts controls
node --max-old-space-size=4096 --import tsx scripts/uat-two-batch.ts serve
```

The server binds only [127.0.0.1:3009](http://127.0.0.1:3009). Synthetic roles use `staff@example.invalid`, `coordinator@example.invalid`, `system_admin@example.invalid` and `unassigned@example.invalid`. Random passwords are confined to the ACL-restricted `output/localhost-two-batch-20261024/private/credentials.json`; do not paste them into reports or screenshots. The runtime identity is restricted to its owned new schema. Individual-payment feature flags remain false in this server; Payment Recording uses the existing payroll workflow.

No automatic continuation, timer or unattended payment action is scheduled. The second payroll remains blocked for a separately scoped resolution; there is no “resume after cutoff” command pretending to solve the source mismatch. `create` refuses an existing manifest; this helper exposes no drop/reset command. Existing A–F cleanup procedures remain separate and were not invoked.

Evidence is under `output/localhost-two-batch-20261024/`: ownership manifest `T.json`, two synthetic workbooks, `prior-evidence-1.json` / `prior-evidence-2.json`, setup log, verification, focused controls and preservation snapshots. Those outputs are local UAT artifacts, not official financial evidence. The preceding six-fixture reports remain unchanged.

## Observed result

**Preparation is retained with a verified existing-functionality blocker; the full target is not achieved.** Dedicated database: `ldss_twobatch_test_43720_2d6d56c4`. Both groups use `TWO-BATCH-YEAR` / `TWO-FIRST` and have separate published official masterlists. Neither is classified as incomplete.

| Result | Batch 1 | Batch 2 |
|---|---:|---:|
| Imported scholars | 800 | 200 |
| Current accepted prior reviews | 800 | 200 |
| Covered COR/COG documents | 1,600 | 400 |
| Course pending, preserved truthfully | 200 | 50 |
| LDSS payroll state | Processed | Draft |
| Eligible rows in prepared payroll | 800 frozen | 0: historical source mismatch excludes the intended 200 |
| Reserved entitlements / allocations | 800 | 0 |
| Payment records | 0 | 0 |
| Payment Recording | Available; 800 Pending, 0 Paid, 0 Unclaimed, 0 Needs review | Unavailable: `OVR_FINALIZATION_REQUIRED`; no finalized payment roster exists |

The second historical-setup attempt returned `HISTORICAL_SETUP_REVIEW_REQUIRED`. Its 200 intended members each have `HISTORICAL_BATCH_APPROVAL_REQUIRED` in the second payroll's candidate assessment. Attempting submission on its cutoff day also returned `CUTOFF_NOT_REACHED`. These are preserved controls, not missing COR/COG verification. No ordinary manual rechecking will solve the import/source mismatch. Details: [second-batch-source-issues.json](../../output/localhost-two-batch-20261024/second-batch-source-issues.json), [verification.json](../../output/localhost-two-batch-20261024/verification.json).

Focused checks passed: all 62 migration checksums match, all 341 foreign-key groups have zero orphans, no duplicate scholar/semester/benefit entitlement exists, and the runtime account has no global business grants or other-schema access. Prior adoption created no ordinary five-check attestations or numeric/adverse grade findings. Staff can read the accepted prior-approval reference for both groups. A read-only payment preview accepts all 800 first-batch recipients without conflicts; no payment commit occurred. The first payroll's frozen evidence hash still matches its checkpoint taken before the second review. See [controls.json](../../output/localhost-two-batch-20261024/controls.json).

Preservation rechecked the local development database and all six preceding UAT schemas: **all existing table data, definitions and row counts matched this task's starting snapshots**, including authentication data. All **1,006 accepted P10 inputs**, `.env`, preceding UAT helper files and three preceding UAT documents also match. Existing account privileges match; exactly one owned schema and runtime account were added. No LAN connection or operation was used. See [preservation-after.json](../../output/localhost-two-batch-20261024/preservation-after.json). These results concern this task's starting baseline, not a claim about unrelated earlier session changes.

Browser verification used a separate Staff session at localhost port 3009. It confirmed the first batch's Payment Recording screen and 800 Pending summary, and a second-batch member's historical import/source restriction; no outcome buttons were committed. Screenshots: [payment workspace](../../output/playwright/two-batch/batch1-payment.png), [800 Pending summary](../../output/playwright/two-batch/batch1-summary.png), [second-batch source blocker](../../output/playwright/two-batch/batch2-source-blocker.png). The initial signed-out `/auth/me` 401 is expected. A browser wait initially watched the full-detail endpoint; the actual paged-candidate endpoint was then checked successfully. This is a focused preparation check, not new whole-system UAT or policy approval.

The initial fixture assertion expected 200 eligible second-batch rows and stopped when the source guard correctly produced zero. The owned database was retained, not reset. Follow-up inspection recorded the guard failures, verified the retained data and completed preservation checks. The helper now reports this unsupported case explicitly instead of asserting a false successful setup.

The requested two-label import choice, unknown-school/year-level approved import support, and a supported second historical-import payroll path remain precisely identified gaps. Application code, migrations, financial controls, accepted build and permissions were not modified. Only a new fixture helper, synthetic output artifacts and this report were added.
