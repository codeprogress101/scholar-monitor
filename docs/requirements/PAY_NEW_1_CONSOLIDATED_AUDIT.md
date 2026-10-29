# PAY-NEW-1 — Consolidated payroll workflow and eligibility audit

26 October 2026, Philippine time. **Read-only investigation completed. The 835-member Masterlist is Published / version 415. Both document-review actions were completed. Publication subsequently invalidated all 835 prior approvals through a standing dependency; Registry also evaluates these new scholars against historical PAY-001 when no new draft is selected. No correction, new payroll, verification, renewed approval or deployment was performed.**

The additional TWO-COG evidence is included below. This audit follows the accepted [ML-1.2 application](ML_1_2_BULK_CONFLICT_REMOVAL_REPORT.md) and installed [BACKUP-1 tooling](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md). The earlier Draft / v410 / 1,002-member report is a historical checkpoint, not the current state. LAN-R2A remains paused.

## Verified current primary and publication

| Item | Fresh observation |
|---|---|
| Host / database server | DESKTOP-BPLJKRP / 127.0.0.1:3306 |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Application | Existing synthetic, loopback 5173 / 3001 |
| Controller / API / Vite | **31364 / 53844 / 56828**, unchanged throughout this audit |
| Working year | TWO-BATCH-YEAR, `36d55426-f578-418d-a942-3596a68f65e2` |
| Batch 1 | `a6f45315-4b8b-46f8-b91d-bedc58cd6cc2`, **Published / v415 / 835 active members** |
| Retained removed entries / current activation overlap | **167 / 0** |
| Publication | **835 authoritative activations**, effective **2026-10-26** |
| Schema | **149 tables / 66 accepted migrations**, SQL hashes and applied timestamps preserved |

The actual intervening user workflow removed 167 conflicts at 06:57:53.292, submitted for verification at 06:57:58.211, submitted for approval at 06:58:00.991, obtained approval at 06:58:03.168, then published. Those operations advanced versions 411–415. Publication snapshot time is **06:58:08.890**, activation-row timestamps span **06:58:08.898–06:58:09.613**, and its concluding publication audit is **06:58:09.624**, all on 26 October Philippine time. These are recorded operation timestamps, not separately measured transaction-commit instants.

The publication hash is `62951585d7a2cd107d4ec9a1248a19c2b0d749e5e312fbb1a48d9f6e94a089da`. Both earlier published official lists remain: 800 members / v805 and 200 members / v205. No earlier official activation was replaced. [Current inspection](../../output/pay-new-1-primary-20261026/inspection.json), [audit timeline](../../output/pay-new-1-primary-20261026/timeline.json), [activation and date confirmations](../../output/pay-new-1-primary-20261026/confirmations.json).

## Completed verification, approval and exact invalidation

The latest confirmed import is `1b02dfa2-542a-4249-a4db-061a330f51d1`. Its prior approval is `fa217112-0732-446e-a8b6-e070e76a7701`, revision 1, covering **835 members / 1,670 documents**. Its attested approval date is **2026-10-20** and attested deadline **2026-10-26**. These supplied dates are distinct from when the application recorded the action.

| Recorded operation, 26 October Philippine time | Evidence |
|---|---|
| Verify Batch Documents, audit **03:29:17.270** | **835** successful individual document verifications; all are COR in this cohort |
| Prior-Batch Approval, row timestamp **03:31:01.864**, concluding audit **03:31:18.837** | All **835** members included; their **835 COR** individual verifications retained and **835 COG** decisions recorded on the prior-approval basis |
| Masterlist publication, approximately **06:58:09** | Same-year annual records become operationally Active and acquire their initial standing version/date |

All **1,835** saved approval-member snapshots reproduce their stored source hashes. The earlier **1,000** remain valid. All **835** newly published members are now reported stale. Deep comparison of each new member's saved snapshot with the exact current `priorMemberSource` projection found only these three changed leaves:

| Authoritative field | At approval → current |
|---|---|
| `standing.0.operational_status` | `NULL` → `active` |
| `standing.0.status_version` | `0` → `1` |
| `standing.0.status_on` | `NULL` → `2026-10-26` |

Replacing only that standing array in an **in-memory comparison** reproduces the current source hash for **835/835**. No database snapshot was rewritten. Every other saved component matches: identity, owner/scope, semester revision, document/receipt/coverage evidence, policy, academic records and approved changes, non-prior reviews/events, other evidence, reconciliation bindings and entrant evidence. The current raw source validator reports zero issues for these 835. There is no demonstrated changed-document or changed-academic-source explanation for their staleness.

The dependency is explicit in [prior-approval-source.ts](../../server/requirements/prior-approval-source.ts:51): the fingerprint includes annual standing. The unchanged publication writer [inserts official activations and updates standing](../../server/masterlists/workflow-service.ts:231). The approval reader rejects any different hash. Therefore the exact-hash safeguard is operating as written, but the completed **approval → healthy official activation** workflow invalidates its own approved evidence. This is a verified workflow compatibility defect, not proof that the user skipped review or that the documents changed.

It does **not** justify ignoring standing changes generally. Holds, adverse decisions, changed documents/placement or unavailable authority must continue to invalidate evidence. The immutable original approval and its sources must remain; blindly renewing it or replacing stored hashes would obscure the cause. [Complete aggregate comparison](../../output/pay-new-1-primary-20261026/approval-summary.json). Exact identity/hash comparisons remain in the restricted [private source comparison](../../output/pay-new-1-primary-20261026/private/source-comparisons.json).

## TWO-COG verification context: answers to the additional evidence

No Scholar ID accompanied the additional screen description, so this report does not attribute that screenshot to a guessed person. The actual N1 representative reproduces the same messages, and the cohort-wide read verifies the relevant conditions for **all 835** published members.

| Question | Verified answer |
|---|---|
| Does the correct academic-year placement exist? | **Current receiving year: yes, 835/835.** All have a school; 455 have a course and 380 have a supported course-pending exception. **COG-covered preceding year: no, 0/835 academic records.** These are different years. |
| Was verification previously successful? | **Yes.** All 835 latest COG events remain `verified`, recorded **03:31:01.891–03:31:18.836** during prior approval. Their evidence basis is `prior_batch_approval`; none stores an individual `details.verification` school/course context. This was an attested batch decision, not 835 separately reconstructed historical placement checks. |
| What changed, when and how? | Only the three standing leaves above, during the **06:58:08.898–06:58:09.613 publication activation operation**. COG receipt, coverage and academic-source data did not change between saved approval and current comparison. |
| Is the stale approval justified by changed document evidence? | **No such change was found.** The fingerprint changed because healthy publication activated the annual records. Its broad dependency creates the workflow defect described above. |
| Why is Verify disabled now? | The ordinary individual-context loader requires placement for the **COG-covered year**. All 835 return **`ACADEMIC_RECORD_REQUIRED`** for that missing year. Without context, the quick-review control cannot enable verification. The source check itself is correct for an individual verification; the unexpected fallback follows the approval invalidation. |
| Is this an incorrect period selection? | Receiving period TWO-FIRST is correctly selected. Its explicitly recorded predecessor is TWO-PRIOR-SECOND. No evidence establishes that this predecessor mapping is incorrect. The generic phrase “this academic year” conceals that the missing year is the **covered prior year**, not the selected receiving year. |
| Extent | **835/835** COG context loads fail for the missing covered-year record; **835/835** current COR context loads succeed. This is a cohort-wide issue, not one lost scholar record. |

The recorded coverage is:

| Document | Covered year / semester | Dates |
|---|---|---|
| COR | TWO-BATCH-YEAR / TWO-FIRST | **2026-10-04–2027-02-21** |
| TWO-COG | TWO-PRIOR-YEAR / TWO-PRIOR-SECOND | **2026-02-26–2026-08-24** |

Both document kinds have actual receipts dated **2026-10-26**, encoded around 03:26–03:27 that morning. Publication did not erase the verification events. The [document state reader](../../server/requirements/workflow-state.ts:55) retains their history; [compliance evaluation](../../server/continuing/semester-compliance.ts:60) distinguishes recorded status from currently usable verification. A valid prior approval supplies the attested compliance basis. Once invalid, individual context becomes necessary. The [coverage resolver](../../server/requirements/semester-context.ts:73) selects the COG's preceding year, and the [verification loader](../../server/requirements/workflow-service.ts:93) finds no academic record there.

The additional warnings are therefore consistent: **“Verification recorded”** refers to retained history; **“Current context is unavailable”** refers to an unsuccessful present individual-context read; **“Prior batch approval needs review”** refers to the changed fingerprint. They do not establish that the original decision failed. In addition, [the checklist badge](../../server/requirements/instances-service.ts:84) treats any invalid prior approval as needing review, including retained COR decisions whose individual contexts are still current. Its broad badge should not be mistaken for proof that COR placement also disappeared.

Do not copy current placement into the prior year, invent earlier annual participation, repeat verification or renew approval to silence these warnings. If a separately approved correction retains the prior-attestation basis, its provenance must remain explicit. If an individual historical verification is genuinely required instead, it needs actual covered-year source evidence and the authorized academic workflow. [All 1,670 document/context results, aggregate](../../output/pay-new-1-primary-20261026/cog-context-summary.json), [reproduced UI checks](../../output/pay-new-1-primary-20261026/browser-results/browser-cog.json), [masked TWO-COG screen](../../output/playwright/pay-new-1-primary/two-cog-context.png). Exact record mapping is restricted in [private context evidence](../../output/pay-new-1-primary-20261026/private/cog-contexts.json).

## Actual Registry payroll context and remaining blockers

Registry automatically chooses the sole current matching cycle: **TWO-BATCH-CYCLE**, `829ae3dc-9b49-4d88-9dfe-0a7250b164c0`, named **Synthetic 800 + 200 semester payout**, open / v2, for TWO-FIRST. The year/semester match the new publication. There are **zero Draft payroll batches** and only two processed historical batches:

| Batch | Actual batch ID | Historical cohort | Submission cutoff |
|---|---|---:|---|
| PAY-001 | `608d5a04-34e1-4eeb-8c00-5fd40ad2d44b` | 800 | **2026-10-21** |
| PAY-002 | `9cc2e740-061e-4667-98cc-bc1532032408` | 200 | **2026-10-23** |

[Registry projection](../../server/scholars/registry-eligibility.ts:97) passes a draft ID only when exactly one draft exists. Without one, [semester sources](../../server/eligibility/semester-sources.ts:29) choose the scholar's historical owner batch, otherwise the cycle's first historical root. New representatives N1/N2/N3 have no own historical batch and resolve to **PAY-001**. Its import differs from their 835-person import. The Registry shows the cycle name but does not identify this effective batch in Payout Details.

| Representative | Actual result and interpretation |
|---|---|
| N1 / N2 / N3, new published cohort | Active, valid official membership, no allocation/payment, **Needs review** against the PAY-001 fallback; prior approval stale |
| H1, existing PAY-001 paid scholar | **Paid this semester**; prior approval valid, documents usable; ordinary allocation prevents a second stipend |
| H2, existing PAY-002 scholar | **Already on payroll**, pending outcome; own batch resolves to PAY-002; prior approval and documents valid |

Both roles' actual API DTOs matched independent source-reader results for all five representatives. No response was simulated. [API parity and window data](../../output/pay-new-1-primary-20261026/api-oracles.json), [representative assessment](../../output/pay-new-1-primary-20261026/representative-summary.json), [actual Payout Details](../../output/pay-new-1-primary-20261026/browser-results/browser-registry.json), [masked Registry screen](../../output/playwright/pay-new-1-primary/registry-needs-review.png).

The blockers have separate meanings:

| Reason | Finding / appropriate disposition |
|---|---|
| Historical source approval / omission link | Correct protection **for PAY-001/PAY-002**, whose saved imports are different. Misleading as an unexplained new-cohort readiness result. Publication does not authorize appending the 835 to either historical payroll. |
| Prior approval stale / academic compliance | Verified standing-dependency defect. The long fallback also exposes individual category, grading rule, average and subject/enrollment/load findings. Their absence is not proof that batch review was skipped. |
| PHP 5,000 degree category | All 835 raw semester revisions are `unknown`; valid prior attestation normally supplies the degree/compliant basis. If the approved path instead requires individual review, actual category/grade authority is required. Course wording alone is insufficient. |
| COG identity/placement/coverage | Recorded verification exists, but current individual context lacks preceding-year placement after prior approval becomes unusable. Current-year placement is present. |
| COR/COG late | Physical receipt **26 October** is after **21 / 23 October** historical cutoffs. Correct for those batches; not evidence of eligibility for an uncreated new batch. |
| Normal eligibility / incomplete requirements | Summary outcomes. They do not identify an additional missing action beyond the underlying checks. |

Even a correct approval-dependency fix would **not** make these scholars eligible for old PAY-001/PAY-002. [Timing acceptance](../../server/requirements/timing-service.ts:46) requires the valid approval's own import and matching historical deadline/window. Their attested **26 October** deadline matches neither historical import/cutoff. It does not create a new window or extend the semester deadline. Physically late receiving is also distinct from timely physical receipt encoded later; the latter has a controlled evidence path, not permission to backdate a late receipt.

There is a second source-contract limitation: even with an explicit future ordinary batch, `direct historical source ?? supported omission source ?? root` still falls back to the old root. This is verified source behavior, **not a claim that a new batch was created or tested by mutation here**. A separate implementation must distinguish a fresh regular batch from a historical source-bound batch without loosening old source pins.

## New, unprocessed payroll workflow: implemented parts and gaps

The genuine new-draft operation already exists under **Payroll → Period, submission windows & administration → Semester submission windows → Open next batch window**. Its [Coordinator service](../../server/payouts/submission-service.ts:102) creates a new numbered `ovr_batches` record, initial Draft event and submission window atomically. It does not mark it processed or record a payment. The generic batch-create route intentionally directs managed cycles to this window setup; **Set up previously approved payroll batch** is a different historical-source workflow.

| Stage | Existing implementation / current disposition |
|---|---|
| Published membership | Present: 835 authoritative activations. It establishes official participation, not financial readiness or Paid status. |
| New numbered Draft | Backend exists, **`payroll.windows.manage`**, Coordinator. No literal “Create New Payroll Draft” action is currently shown. |
| Eligibility review | Managed candidate assessment exists with current source validation and controlled deferrals. The historical fallback must be separated for fresh batches. |
| Preparation / review / approval | Existing Draft → Review under `ovr.prepare`, then Finalized under `ovr.finalize`. Finalization is the guarded Coordinator stage; there is no invented separate approval endpoint. |
| Submission | Finalized → Submitted under `ovr.submit`, subject to the recorded cutoff and preparation/source guards. Review can precede cutoff; submission waits until the cutoff day has ended. |
| Processing / payment | Submitted → Processed, then explicit outcome recording under `ovr.process`; reconciliation and closure retain their own guards. Processing, printing and Masterlist membership never imply Paid. |

The actual UI's **Open next batch window is visible but disabled**. [Its condition](../../src/PayrollSubmissionWindows.tsx:58) requires exactly two mapped regular terms. The actual API reports one first-term mapping, not stale or ambiguous. [The backend](../../server/payouts/submission-service.ts:89) permits this reviewed/finalized/confirmed historical first-semester setup without inventing a second term. Its required historical root exists. This is a **verified frontend/backend prerequisite mismatch**. Do not manufacture an unrelated semester to enable the control. [Actual window UI](../../output/playwright/pay-new-1-primary/coordinator-submission-windows.png), [browser results](../../output/pay-new-1-primary-20261026/browser-results/browser-windows.json).

There is also an independent, correct date restriction:

| Date | Meaning |
|---|---|
| **24 October 2026** | Payout target; the displayed passed-target warning directs window review. It is not the semester-end date. |
| **23 October 2026**, deadline revision 2 | Actual final submission deadline. Its whole Manila day ended at **2026-10-23 16:00:00 UTC**. |
| **26 October 2026** | Audit day / actual new-cohort receipts. A new window cannot open before today and cannot have cutoff after the final deadline. No prospective window currently fits. |
| **21 February 2027** | Current semester end; semester claim expiry must not be confused with the earlier submission deadline. |

A pure call to the unchanged date validator rejects a hypothetical 26 October opening/cutoff under the actual 23 October final deadline. **No command or draft was submitted.** An existing Coordinator deadline-extension mechanism is present; this audit neither authorizes nor invokes it. Fixing the UI gate alone cannot remove the date restriction or the source-contract defects.

Actual Staff has preparation/processing and document-verification permissions. Actual Coordinator also has window management, finalization/submission, semester configuration and approved academic-change authority. No permission expansion is established as necessary. Synthetic financial flags remain as configured; their current availability is not operational LAN authority. [Actual permissions/context](../../output/pay-new-1-primary-20261026/api-oracles.json), [pure date/source confirmations](../../output/pay-new-1-primary-20261026/confirmations.json), [processing transitions](../../server/ovr/processing-service.ts:81).

## Concise messages and minimum future implementation proposal

These are recommendations only; no UI or rule was changed.

| Current presentation | Proposed action-first explanation and destination |
|---|---|
| Unexplained historical source blocker | Show **year, semester, effective batch and source**: “Assessing historical PAY-001. This scholar belongs to another import. No new draft is selected.” Link existing Payroll/window review. |
| Concatenated prior/academic warnings | Lead with “Prior approval recorded; publication changed its activation dependency.” Show the exact changed fields and source review context; do not direct routine repeated verification as a workaround. |
| COG “this academic year” | Name **TWO-PRIOR-YEAR / TWO-PRIOR-SECOND** and distinguish its historical placement from current enrollment. Existing Add academic record navigation carries the missing year, but any entry requires genuine source evidence. |
| Receipt timing | Show each document's actual received date, evaluated batch and cutoff. A later window is conditional on authorized setup. |
| Degree category / individual findings | Explain whether the assessment uses valid prior attestation or the ordinary individual route. Only the latter should request the corresponding source-backed category/grading work. |
| Normal / incomplete summaries | Present once after specific conditions. Keep all independent blockers accessible. |

[Registry currently deduplicates by reason code](../../server/scholars/registry-eligibility.ts:134), so separate COR and COG timing reasons can collapse into one. The academic reason is itself a concatenated list and overlaps other rows. Better grouping must preserve distinct document IDs/conditions, not merely suppress repeated text. Existing [issue navigation](../../src/scholar-issue-navigation.ts) sends source restrictions to Coordinator review and document issues to receiving; the category reason currently has only a generic review explanation. A clear approved category/policy destination is still needed for an ordinary individual path.

Minimum separately authorized sequence:

1. **Correct the approval dependency contract.** Preserve immutable original evidence and historical readers. Recognize only a source-proven compatible same-year activation transition, or an equivalently reviewed dependency design. Continue rejecting changed documents, identity/placement, adverse standing/findings, unavailable authority and genuine stale reviews. Do not blindly rehash or exempt all standing.
2. **Define fresh regular versus historical payroll source context.** Stop inheriting a historical root for an independent new draft; retain explicit historical membership/import/approval/publication pins and supported omission rules. Make Registry context explicit before presenting batch-specific readiness.
3. **Reuse the existing new-window transaction.** Align UI capability with backend prerequisites, expose a clear “Create New Payroll Draft” entry point for authorized Coordinators, and show actual date/preparation blockers. Keep versioning, source revalidation, atomic audit and retries. No replacement financial writer is justified.
4. **Obtain only the outstanding source/policy decisions.** An authorized owner must decide any submission-deadline extension and the legitimate new-cohort assessment basis. If individual grade/category review is required, use the actual covered-year documents and approved grading/category authority. Do not fabricate prior digital participation, backdate physical receipts or infer approval from successful publication.
5. **Verify in newly owned disposable targets before any promotion.** Reproduce the ordered 835-person workflow through publication; prove approval remains valid for compatible activation and becomes stale for adverse/source changes. Test fresh-draft eligibility separately from historical PAY-001/PAY-002, timing, role denials, races, source changes, exact retries, rollback and generated financial outputs. Preserve existing financial pins and protections, then perform authorized recovery and matching API/UI activation gates.

No schema requirement has been demonstrated by this audit. That does not preapprove a new write contract or business-policy change. Implementation, any financial-policy disposition and primary activation require separate authorization.

## Preservation, checks, LAN implications and stop

The audit used consistent read-only transactions and the existing read-only snapshot adapter for source functions. It did not provision fixtures, acquire backup source READ locks, run a backup/restore or restart services. Authenticated primary calls used actual API GETs; browser guards blocked business command methods. TWO-COG was opened for inspection, then cancelled without verification. Exact records and private account/configuration material remain restricted; public artifacts use representative labels and masked captures.

| Completed verification | Result |
|---|---|
| All approval-member saved/current comparisons | **1,835** stored hashes verified; **1,000 valid / 835 stale**; all new changes standing-only |
| All new document context reads | **835 COR available / 835 COG missing covered-year context**, exact cohort checks |
| Both-role API parity | Five actual representatives matched independent readers; actual windows/permissions confirmed |
| Browser inspection | Historical setup distinguished from new-window action; Registry and TWO-COG warnings reproduced; no business command attempted in recorded guarded checks |
| Pure date checks | Actual deadline rejects prospective 26 October window; no database command |
| Full preservation | **149 tables**, schema/journal/grants/accounts, original audits and complete payments compared |
| Existing inputs | **1,344/1,344** starting files exact, including **310** retained distribution files |
| Report checks | All **40** linked local targets exist; `npm run check:secrets` exits **0**, **1,378** source/build files scanned |

All starting business-table values/counts remain exact, including **1,835 scholars**, **14 application accounts**, **1,835 annual/intake/academic records**, **3 Masterlists / 2,002 stored entries / 1,835 activations**, and Batch 1 **Published / v415 / 835 active members** with its 167 retained removals. Both Paid records retain their full evidence and actual dates **2026-10-24**. All **19,372** starting audit rows match. Two task logins and two logouts append only four authentication events (**19,376 total**); sessions **60→62**, with ordinary session/rate-limit activity. This is qualified authentication activity, not zero database writes.

Both task sessions signed out by keyboard: logout **204**, subsequent `auth/me` **401**; task browsers closed. The user's separate session was not revoked. Primary process commands/ancestry/listeners, retained/LAN listener owners, **76 paused LAN-R2A artifacts** and **16 earlier ML-1 evidence files** remain exact. This is not a new exhaustive inventory of every retained or operational database. [Final preservation](../../output/pay-new-1-primary-20261026/final-preservation.json), [Staff revocation](../../output/pay-new-1-primary-20261026/browser-results/signout-staff.json), [Coordinator revocation](../../output/pay-new-1-primary-20261026/browser-results/signout-coordinator.json), [starting file hashes](../../output/pay-new-1-primary-20261026/files-before.json).

Only this requested report and task-local investigation/evidence files were added. No application code, configuration, schema, role, flag or financial test pin changed. Build/unit/mutation regression suites were not rerun for a report-only audit and are not claimed as new acceptance. The cohort helper initially queried a nonexistent root academic `version` column; it was corrected to read the existing academic projection and reran successfully, without a database mutation. Expected read-only verification-context failures were recorded as evidence, not bypassed.

LAN financial readiness remains **NO-GO**: these observed dependency/source-context defects and the actual deadline require disposition before a new-cohort financial workflow can be accepted. A future package must separately pass complete release/pilot-boundary classification, target-specific recovery, office source/policy approval and witnessed acceptance. Existing Q28–Q31 financial gates in the [current-year plan](LDSS_CURRENT_YEAR_WORKFLOW_PLAN.md) remain; no full requirements questionnaire or operational approval is inferred here. Local synthetic read-only findings do not establish office concurrency, LAN performance, accessibility certification or operational recovery.

**Stopped after PAY-NEW-1 investigation and reporting. No academic record, receipt/date, verification, prior approval, Masterlist, payroll/payment or historical evidence was changed. No new draft was created, deadline extended, feature enabled, LAN-R2A resumed or operational LAN installation modified.**
