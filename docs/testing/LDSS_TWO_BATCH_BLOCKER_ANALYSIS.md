# Two historical payroll batches: blocker analysis

24 October 2026, Philippine time. Scope: the user's attached **Correct UAT Academic Variety and Investigate Batch 2 Historical Payroll Blocker** request. Financial workflow and navigation changes are **analysis/design only**. The permitted implementation is a new isolated synthetic fixture; existing finalized data must remain intact. Implementation proposal: [targeted fix plan](LDSS_TWO_BATCH_FIX_PLAN.md).

## Finding

Batch 2 is a separate historical import whose accepted prior COR/COG and academic reviews remain current. Its exclusion is a **payroll batch/source limitation**, not an individual missing-document problem. There are three distinct implementation boundaries:

1. Historical setup creates one root batch and refuses a second setup after a mapping/batch exists.
2. Historical eligibility reads one cycle-wide import/root and requires that import even for later payrolls. The existing later-payroll exception is for a genuine omission from that same original import.
3. A normally created second window cannot start in the past or be submitted/finalized before its cutoff day ends. Valid prior review does not override that clock guard.

The retained V1 evidence demonstrates these independently: [200 excluded members](../../output/localhost-two-batch-20261024/second-batch-source-issues.json), [prior review/payment verification](../../output/localhost-two-batch-20261024/verification.json), [Staff-visible source blocker](../../output/playwright/two-batch/batch2-source-blocker.png). No real release or payment was inferred from historical processing. Waiting for the second cutoff does not remove the import mismatch.

## Exact affected code and safeguards

| Code | Present behavior | Assessment |
|---|---|---|
| [historical-setup.ts:21](../../server/payouts/historical-setup.ts#L21) | Requires `payroll.windows.manage` and `payouts.operate`, current calendar/cycle revisions, an available period, reviewed source/reference and actual past dates inside the semester. | Correct safeguards. Preserve authority, locks, audit, idempotency and date validation. |
| [historical-setup.ts:34](../../server/payouts/historical-setup.ts#L34) | Existing mapping, batch or competing cycle returns `HISTORICAL_SETUP_REVIEW_REQUIRED`. Creation hardcodes `PAY-001`; setup inserts cycle revision 1. | Single-root restriction prevents the second independently imported historical payroll. Rejecting a competing cycle is still correct; do not create another same-semester cycle as a workaround. |
| [prior-approval-service.ts:33](../../server/requirements/prior-approval-service.ts#L33), [prior-approval-source.ts:19](../../server/requirements/prior-approval-source.ts#L19) | Prior adoption is scoped to a confirmed approved import and semester, with member/source hashes, document/academic/deadline attestations and Coordinator authority. Source changes and adverse findings invalidate or block adoption. | Correct. An accepted review for import B is evidence for B; it does not make B belong to import A. No repeated ordinary COR/COG verification is needed when this evidence is valid. |
| [semester-sources.ts:28](../../server/eligibility/semester-sources.ts#L28) | Selects the latest `historical_payout_setups` row **by cycle**, then checks `priorApproval.importId` against that one import. A non-root destination also needs an unreserved omission-origin link from the root. | `HISTORICAL_BATCH_APPROVAL_REQUIRED` conflates missing approval, wrong import and missing destination origin. The ownership check is correct; resolving it to one cycle-wide import prevents independent historical sources. A destination link alone cannot remove the import inequality. |
| [timing-service.ts:45](../../server/requirements/timing-service.ts#L45) | Prior timing acceptance is already **batch-specific**: that batch's historical import, its approved deadline, window cutoff and current prior approval must agree; existing timing decisions are protected. | Correct pattern to reuse. The current second normal window has no historical setup row, so accepted prior timing is not automatically available there. V1's second receipts happen to be on time for its normal window; do not assume that for arbitrary historical cases. |
| [submission-service.ts:42](../../server/payouts/submission-service.ts#L42), [submission-service.ts:92](../../server/payouts/submission-service.ts#L92) | The read model and historical-root allowance also select the latest cycle setup. | Appending another setup row without fixing these readers could make Batch 2 appear to replace the original root. Preserve deterministic legacy root behavior. |
| [submission-service.ts:102](../../server/payouts/submission-service.ts#L102), [submission-rules.ts:31](../../server/payouts/submission-rules.ts#L31) | Normal windows cannot open before today; windows must be sequential/nonoverlapping and end within the final deadline. | Correct ordinary intake safeguards. A new historical append operation needs explicitly reviewed actual historical dates; do not weaken this normal endpoint. |
| [managed-payroll.ts:19](../../server/ovr/managed-payroll.ts#L19), [service.ts:400](../../server/ovr/service.ts#L400) | Candidates span annual records, use current sources and route/standing checks; review/finalization recheck source hash, require cutoff reached and unresolved timely submissions resolved. | Preserve fresh validation and cutoff checks. A future historical batch also needs a pinned import member scope so one import cannot absorb another historical roster. |
| [rules.ts:38](../../server/ovr/rules.ts#L38) | Emits detailed semester reasons plus generic `NOT_ELIGIBLE`. | Correct exclusion, but the generic label is not a distinct repair action and can duplicate an already explained batch blocker. |
| [managed-payroll.ts:50](../../server/ovr/managed-payroll.ts#L50), [F36 entitlement schema](../../db/migrations/20261006010000_f36_workflow_foundation.sql#L232) | Finalization reserves one full PHP 5,000 degree stipend; the database uniquely constrains permanent scholar + semester + benefit. Allocation, immutable evidence and exclusive financial routes remain authoritative. | Correct. Separate imports do not create a second entitlement for an overlapping person. Keep database constraints and transaction guards. |
| [recording-service.ts:40](../../server/payments/recording-service.ts#L40) | Requires finalization and a legitimately processed batch, correct allocations and an available payment period. | `OVR_FINALIZATION_REQUIRED` for Batch 2 is a downstream consequence. Enabling the Payment Recording screen or inserting payment records would not resolve the cause. |

All five production uses of `historical_payout_setups` were traced: historical creation, eligibility, the submission-window read model, the historical-root allowance, and batch timing. The proposal must address their different cycle-root and per-batch meanings. Merely changing `importId` equality or inserting a second “latest” row would be unsafe.

## Required source relationships

For each proposed historical payroll: one existing cycle/semester; one distinct confirmed import; exactly its reviewed scholar-semester members; valid per-member prior approval for that import; correctly approved annual membership; matching historical cutoff/timing evidence; and a separate Coordinator payroll finalization. Receipt dates, historic approval dates, processing dates, actual release dates and recording timestamps remain separate.

The prior document/academic approval is not itself payroll finalization, an entitlement or Paid. If a person appears in both imports, the second route must fail its duplication/reservation checks. The legitimate omission path must retain its original meaning and origin link; the 200 independently processed scholars must not be fabricated into omissions.

## Misleading navigation

[scholar-issue-navigation.ts:4](../../src/scholar-issue-navigation.ts#L4) has no case for `HISTORICAL_BATCH_APPROVAL_REQUIRED`; its default returns **View scholar**. [ScholarIssueAction.tsx:3](../../src/ScholarIssueAction.tsx#L3) always renders a link and does not receive the viewer's permissions or the selected batch/import. Both [paged candidates:36](../../src/PayrollPagedDetails.tsx#L36) and [complete candidates:43](../../src/PayrollCandidates.tsx#L43) use it. Consequently a batch-wide, unsupported source operation looks like a problem Staff can repair in an individual profile. Generic `NOT_ELIGIBLE` can produce a second unhelpful link.

The proposed replacement distinguishes missing scholar data, pending review, existing Coordinator actions and unsupported batch restrictions. Use only real destinations; show an explanation when no resolution page exists. The existing prior-batch dialog opens from the Scholar Registry list ([ScholarsPage.tsx:519](../../src/ScholarsPage.tsx#L519)); it has no verified import-prefilled URL. A link to a guessed `priorApproval` URL or a new “approve anyway” button is not a resolution. Detailed permission/action mapping is in the fix plan. No UI component was modified in this task.

## Versioned academic fixture

V1 already contains frozen payroll and published masterlist academic snapshots. Replacing its uniform year-II academic data would rewrite approved evidence or make its source stale. A new V2 database, identity namespace, private credentials, outputs and localhost port **3010** are therefore used. V1 stays at port **3009**. The six A–F fixtures and development data are preservation targets, not inputs for modification.

| Year | Batch 1 | Batch 2 | Required total |
|---|---:|---:|---:|
| I | 200 | 50 | 250 |
| II | 200 | 50 | 250 |
| III | 200 | 50 | 250 |
| IV | 160 | 40 | 200 |
| V | 40 | 10 | 50 |
| Total | 800 | 200 | 1,000 |

The new generator defines five fictional schools and eight fictional programs, including two explicitly five-year programs. All 50 fifth-year records must identify one of those five-year programs. Program lengths are test source facts checked by the fixture verifier; no application-wide course-duration policy was added. Some courses remain unknown under the existing controlled Course pending exception; fifth-year program identity is never guessed or left unknown.

Year-I scholars are new first-time entrants, with explicitly reviewed fictional senior-high grading-card alternatives recorded **before** receiving their grades evidence. This avoids inventing completed college semesters or treating freshman year level as an automatic exemption. Other scholars are continuing/Old. Existing scoped Coordinator prior adoption performs the document/academic/deadline review; the helper does not repeat individual verification. Optional contact/birth/address and numeric grades remain unknown, original approval dates stay null, and historical physical-receipt dates remain unknown. Setup-day receipt timestamps describe custody of the synthetic packet only.

The approved generation path uses import, entrant review, receipt, masterlist, prior review and payroll APIs. Direct SQL creates only the owned schema/marker/migrations/runtime identity; business state changes use existing services. A new historical-policy implementation is not part of this fixture.

Tools: [versioned adapter](../../scripts/uat-two-batch-v2.mjs), [fictional catalog and academic verifier](../../scripts/uat-two-batch-variety.ts). Original [V1 helper](../../scripts/uat-two-batch.ts) remains unchanged. V2 evidence lives in `output/localhost-two-batch-v2-20261024/`.

**Verified result:** V2 is retained in `ldss_twobatch_v2_test_21684_17342dc3` and served at [127.0.0.1:3010](http://127.0.0.1:3010). Its source and actual distributions exactly match the table above. All 50 fifth-years identify known five-year programs; all known program/year combinations fit the fictional catalog. There are **95 Course pending** records (76/19 by batch), 250 New and 750 continuing/Old classifications, 1,000 COR receipts, 750 college COG receipts and 250 reviewed senior-high grading-card receipts. No numeric grades or original historical approval/receipt dates were invented.

The verifier joins each confirmed import row to its permanent identity, annual academic record, intake classification and published masterlist entry/snapshot. It checks school, course/pending evidence, year level and fictional name fields against the source. Both annual publications cover exactly their 800/200 import members. The 800 frozen payroll rows match the academic placements and distributions, and all 800 allocations reference matching scholar/semester PHP 5,000 entitlements. Five schools and eight programs are represented.

| V2 payroll | Current prior reviews | Current state | Payment Recording | Outcomes |
|---|---:|---|---|---|
| Batch 1 / 800 | 800 | Processed; 800 frozen rows and allocations | Available; `canRecord: true` | 800 Pending; 0 Paid/Unclaimed/Needs review |
| Batch 2 / 200 | 200 | Draft; all 200 intended members have the historical-source restriction; 0 eligible payroll rows/allocations | Unavailable; `OVR_FINALIZATION_REQUIRED` | No finalized outcome roster and no payment records |

V2 independently reproduced `HISTORICAL_SETUP_REVIEW_REQUIRED`, the 200 source exclusions, and `CUTOFF_NOT_REACHED`. All 1,000 prior reviews are current. There are **zero payment records**, zero fabricated ordinary verification attestations and zero invented grade findings. A read-only payment preview accepts the first 800 without conflicts. The first V2 frozen hash matches its checkpoint taken before the second import/review/window. Both original V1 and V2 remain partial payroll-readiness demonstrations; academic variety does not remove the unchanged financial guards.

Focused integrity checks passed: **62 migration checksums, 341 foreign-key groups with no orphans, zero duplicate entitlements and runtime grants confined to the owned schema**. The original V1 and all six A–F databases, plus development, have unchanged business/evidence fingerprints and unchanged definitions/row counts. All 1,006 accepted P10 source/build/migration inputs, `.env`, original fixture helper/report hashes and existing privileges match. Exactly one new owned schema/runtime identity was added; no LAN access occurred.

**Preservation qualification:** V1's `auth_sessions` fingerprint changed at unchanged row count during this task. The baseline stores table hashes rather than original session rows, so the changed field/cause is not established; do not claim whole-database byte equality or undo authentication state. No new helper logs into V1 or writes its business/financial/history records. Every other existing table matched. This qualification does not affect the separately checked frozen payroll/masterlist preservation.

Evidence: [academic source](../../output/localhost-two-batch-v2-20261024/academic-source.json), [academic verification](../../output/localhost-two-batch-v2-20261024/academic-verification.json), [prior/payroll verification](../../output/localhost-two-batch-v2-20261024/verification.json), [200 source issues](../../output/localhost-two-batch-v2-20261024/second-batch-source-issues.json), [focused controls](../../output/localhost-two-batch-v2-20261024/controls.json), [preservation result](../../output/localhost-two-batch-v2-20261024/preservation-after.json). These are synthetic local checks, not an office UAT sign-off, new security scan or deployment approval.

To inspect V2 without repointing V1:

```powershell
node scripts/uat-two-batch-v2.mjs progress
node scripts/uat-two-batch-v2.mjs academic
node scripts/uat-two-batch-v2.mjs controls
node scripts/uat-two-batch-v2.mjs serve
```

The helper pins a new output/schema/account namespace and refuses recreation of an existing manifest. Random credentials remain in its ACL-restricted `private/credentials.json`, not these documents. No automatic cleanup/reset or historical financial implementation was performed. Stop point reached after the safe fixture and the accompanying proposal.
