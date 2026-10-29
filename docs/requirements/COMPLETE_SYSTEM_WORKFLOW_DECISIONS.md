# Complete system workflow decisions

Started: **23 October 2026, Philippine time**. This is a new Codex questionnaire, starting at Q1. **Q1 confirmed as C; Q2-Q20 confirmed as A; Q21 confirmed with a custom answer; Q22-Q23 confirmed as A; Q24 confirmed as B; Q25 confirmed as A; Q26 confirmed as C with clarification B; Q27 confirmed as B; Q28 confirmed as A with confirmation A; Q29 confirmed as A; Q30 confirmed as B; Q31 confirmed as B; Q32 confirmed as B; Q33 confirmed with a custom answer and clarification A; Q34 confirmed as B; Q35 confirmed as A; Q36 confirmed as A; Q37 confirmed as A; Q38 confirmed as A; Q39 confirmed as B; Q40 confirmed as C; Q41 confirmed as A; Q42 confirmed as A; Q43 confirmed as A; Q44 confirmed as A; Q45 confirmed as A.**

**New-questionnaire answers confirmed:** 45. **Focused consistency reviews:** Q1-Q10, Q11-Q20, Q21-Q30 and Q31-Q40 completed below, followed by the Q41-Q45 completion review. **Questionnaire status: Complete for the scoped requirements proposal, 24 October 2026, Philippine time.** No question awaits an answer. The final cross-module gap analysis and prioritized phased proposal appear below; unresolved authority, implementation checks and operational acceptance remain explicit.

This is a new, comprehensive one-question-at-a-time review of the whole LDSS application, separate from earlier ChatGPT requirements discussions. It does not authorize P11, remediation, implementation, database access/mutations, permission changes, financial activation or deployment. The user's current instructions authorize this discussion and replace the earlier instruction to continue at Q104; older documents retain their historical meaning.

Related records:

- [Lifecycle coverage and evidence checklist](COMPLETE_SYSTEM_WORKFLOW_COVERAGE.md).
- [Separate issue register](COMPLETE_SYSTEM_WORKFLOW_ISSUES.md).
- [P10 operational readiness](../payroll/P10_OPERATIONAL_READINESS.md).
- [Existing payment plan](../payroll/PAYMENT_PROCESSING_IMPLEMENTATION_PLAN.md).
- [System-wide visual review](../audits/LDSS_UI_UX_VISUAL_REVIEW.md).

## Evidence and decision rules

Keep these categories separate in every answer and later proposal:

| Category | Meaning |
|---|---|
| Historical approved requirement | An express earlier instruction or traceable prior office decision. It remains reference material and the current implementation baseline, but is not an answer to this new questionnaire or independent proof of a legal provision. |
| Confirmed new-questionnaire answer | An answer explicitly supplied and confirmed during this Codex questionnaire, with its new Q number. No historical requirement, recommendation or implemented behavior may be entered as that answer automatically. |
| Implemented behavior | What the current accepted source actually permits. A code restriction is not automatically office policy or law. |
| Proposed improvement | A suggestion awaiting a decision and separate implementation approval. |
| Unresolved authority | A controlling instruction, delegation, legal provision or official form approval not yet supplied/confirmed for its affected scope. |
| Technical defect / investigation | An observed failure or discrepancy requiring technical work; neither a workflow preference nor an instruction to weaken a safeguard. |

When interpreting historical descriptions, use later specific office decisions and accepted implementation evidence over historical planning statements. Preserve that reference history. Ask about actual office operations in this new questionnaire without assuming the historical answer. If a new answer differs from a historical requirement or current code, identify the exact conflict and confirm whether the change is intentional before marking a replacement rule confirmed. Preserve both versions; do not silently choose or patch one.

The local P10 gate's **683 source inputs, 261 build artifacts and 62 migrations** were rehashed successfully against the current files during the initial review, before the numbering correction. The dirty worktree is the reviewed baseline; Git HEAD alone is not that baseline. Evidence index: [review-inputs.json](../../output/workflow-review-20261023/review-inputs.json). This is an input-preservation check, not a new UAT run, security scan or operational database inspection.

## Historical ChatGPT numbering and evidence gap

The complete numbered Q1-Q103 transcript was **not found** in the inspected repository documentation, original implementation-plan Markdown or the available legacy chat-history Markdown. Do not manufacture its wording, answers, sequence or exact number-to-rule associations. No search of private credentials, account-activation files, database records or unrelated external conversations was performed.

There are verified later summaries and explicit instructions. Preserve them as historical references with their own sources, without assigning invented historical Q numbers. The missing transcript does not block this fresh questionnaire and does not prefill any answers. The payment plan's local blocker names **Q1, Q2 and Q6** are another numbering scheme; below they are called **PB1, PB2 and PB6** so they cannot be mistaken for this questionnaire's Q1, Q2 or Q6.

## Historical approved requirements — reference only

B01-B19 preserve the historical implementation/requirements baseline. **None is an answer provided by the user to this new questionnaire.** They inform conflict checks and prevent loss of accepted evidence; they do not determine what the user's new answers must be. Existing application behavior stays unchanged throughout questioning. These entries are not a verbatim reconstruction of the earlier ChatGPT Q1-Q103 history.

| ID | Established requirement / boundary | Available evidence |
|---|---|---|
| B01 | Internal office system; physical scholarship documents. Do not assume or add an online scholar application portal. | [Full process scope](../LDSS_FULL_PROCESS.md), [original source/provenance register](../LDSS_WORKFLOW_PHASE03_SPECIFICATION.md), current `src/App.tsx` routing. |
| B02 | One permanent scholar identity; duplicate review, annual academics/qualification, participation, official membership, semester compliance, eligibility and payment are distinct. Unknown historical facts remain unknown. | F04-F12 delivery records; [workflow specification](../LDSS_WORKFLOW_PHASE03_SPECIFICATION.md); current scholar/academic/qualification services. |
| B03 | Continuing scholars do not repeat new admission. A reviewed continuing roster can establish prior participation; publication and semester/payment checks remain separate. | [Recorded 7 October decisions](../LDSS_WORKFLOW_PHASE08_RECEIPT_EVIDENCE.md), [continuing delivery](../LDSS_WORKFLOW_PHASE05_CONTINUING.md). |
| B04 | Current-semester COR and preceding completed-semester COG remain separate. Applicable entrant alternatives depend on evidence; no blanket freshman exemption. Custody, verification, timing and academic assessment are different facts. | Workflow specification R04-R06; shared-semester/entrant implementation in F41-F43; `server/eligibility/semester-sources.ts`. |
| B05 | Recorded academic maintenance rules, transfer/shift rules, formal standing decisions and final-semester graduation protections remain. A failed subject does not automatically terminate scholarship; generic waivers/overrides do not erase mandatory academic restrictions. Do not invent ordinance wording or missing shift/grade history. | [Workflow specification policy register](../LDSS_WORKFLOW_PHASE03_SPECIFICATION.md); later compliance/graduation and accepted P10 evidence. |
| B06 | Previously approved imports can receive one explicit Coordinator prior-batch review, scoped to the actual import/semester and current evidence. Preserve individual verification, Course pending truth, original waivers/corrections and frozen evidence. This is not automatic approval during installation. | Current prior-approval services; F44/F45 migrations; the user's Batch 1 instructions; [screenshot inventory](../audits/LDSS_COMPLETE_UI_SCREENSHOT_INVENTORY.md). |
| B07 | Official annual masterlists and payout rosters stay separate. Published/frozen evidence is not directly edited; amendments and corrections retain earlier versions. Follow each existing approval rule; do not infer a new two-person rule for every operation. | F10-F12/F21-F25, [payment plan conflict register](../payroll/PAYMENT_PROCESSING_IMPLEMENTATION_PLAN.md). |
| B08 | One full approved degree stipend per permanent scholar/semester/benefit, currently PHP 5,000. Membership, standing, academic/document rules, active routes and duplicate-payment checks remain authoritative. Opening/finalizing/printing is not payment. | Workflow specification R08/R10-R12; payment plan financial invariants; current entitlement/payment schema and settlement checks. |
| B09 | Routine Staff workflow: find ten Unclaimed, review/mark them, then review/confirm the other 825 Paid together. Keep locks, retries and validation internal. Actual payment date differs from recording time. Ordinary open-period Staff date correction with reason is settled authority. | [P02 report](../payroll/P02_PAYMENT_RECORDING_REPORT.md), payment plan mandatory standards and date-correction boundary. |
| B10 | Returned-payroll verification is distinct from initial actual-release recording. Staff can report discrepancies after closure. Coordinator corrections do not reopen payroll or rewrite the Original closure; unresolved discrepancies block closure, including an override. | [P03 report](../payroll/P03_RECONCILIATION_CORRECTIONS_REPORT.md), P10 readiness. |
| B11 | Historically approved new Unclaimed processing is **DV only**. Omitted scholars use an eligible later editable same-semester payroll first, then authorized **OR + DV** when preparation is closed. Existing historical route conflicts need controlled resolution. A differing new answer requires explicit conflict confirmation; no route changes during questioning. | [P04](../payroll/P04_UNCLAIMED_STIPEND_REPORT.md), [P05](../payroll/P05_OMITTED_SCHOLAR_REPORT.md), payment plan's resolved blocker list. |
| B12 | Prepared/generated/downloaded/forwarded documents or cheque issuance alone are not Paid. Acknowledged actual release is required. Representative collection uses the agreed single-payment physical authorization/ID attestation, not bulk representative release or stored representative IDs/scans. | [P06](../payroll/P06_DOCUMENT_GENERATION_REPORT.md), [P07](../payroll/P07_INDIVIDUAL_PAYMENT_REPORT.md). This later authorization supersedes older representative-deferred descriptions only within its approved scope. |
| B13 | Coordinator-confirmed original payroll Paid automatically cancels an unpaid internal DV where the established guards permit. Preserve forwarding history; do not claim external cheque cancellation. A conflicting effective Paid replacement remains a blocker. | P04/P07 reports and existing payment-correction/individual services. |
| B14 | Preserve original payroll Unclaimed and later DV Paid as different facts. Current settlement totals use distinct entitlements; Original/Updated/individual reports and audit/history must not double-count or fabricate original snapshots. | [P08 report](../payroll/P08_RECONCILIATION_REPORTS_REPORT.md). |
| B15 | Historically, Financial/Releasing Office handles the claiming period. No new three-working-day/holiday workflow, automatic forfeiture or assumed entitlement extension was approved. The controlling instruction and timely-request effect remain PB1. | Payment plan claimability section; P04/P05/P07 reports; P10 readiness. Historical ownership is recorded; it is not a supplied answer to this new questionnaire. |
| B16 | Ordinary Staff date authority is preserved. Only additional closed/expired/unavailable-period evidence/approval remains PB2; existing restricted reviewed paths and immutable closure continue meanwhile. | Payment plan date-correction section; P03/P07/P10 reports. |
| B17 | Supplied screenshots/Publisher samples are references, not official individual-form approval. Editable draft DOCX adapters are implemented; missing original Word files do not block P01-P05 or prototype work. Official approval/mappings/signatories remain PB6. | User's explicit template instructions; P06/P10 reports. |
| B18 | Staff/Coordinator operational authority and technical-only System Administrator access remain. Preserve current authorization, audit, locks, transactions, exact retries, constraints and R01-R07 performance improvements. | F02/F31-F35; current authorization/read-cache source; R01-R07 reports; accepted P10 baseline. |
| B19 | New payroll template v2 uses 20 scholars/page except the remainder; earlier frozen renderer stays. No reapproval or payment is implied by a layout correction. | User's pagination instruction; current payroll renderer and P02/P09/P10 compatibility evidence. |

Not every older presentation/PDF proposal is an approved historical office requirement. Interview scoring/ranking, application scheduling, committees/delegation, non-degree benefit rules and unresolved ordinance interpretations must be distinguished from actual office practice. Use historical sources to explain conflicts, not to assume new answers or require every proposed feature.

## Questionnaire correction history

- The earlier request instructed continuation at Q104, and an Unclaimed claiming-instruction question was presented. **It received no answer.** Its exact question/options remain archived below; it creates no confirmed rule.
- The user's subsequent **Correct Questionnaire Numbering** instruction restarts this as a new Codex questionnaire at **Q1**, with historical requirements as reference only. The user prefers Intake and Registration first, followed by Registry, Masterlist, Academic Monitoring, Eligibility, Payroll, Payment Processing, Reporting and Administration.
- Q1 below replaces the unanswered former Q104 as the first active question. The claiming-instruction topic is deferred to the relevant payment-processing review, without reserving a new question number.
- This correction is a questionnaire administration instruction, **not an answer to Q1** or approval to change any financial/application rule. Pre-correction copies of these three questionnaire documents are preserved in `output/workflow-review-20261023/numbering-reset-before/`; accepted implementation evidence is unchanged.

## Discussion protocol

1. Start at Q1 and number subsequent questions sequentially, without reserving numbers for modules. Ask exactly one question in the user-facing response and wait for the answer.
2. Use realistic office scenarios and A-D/Other choices where useful. Recommend a practical choice with a brief reason, without treating it as the user's answer.
3. Immediately append the actual selected answer, date, reason and confirmed meaning to this log when the user replies. Confirm that interpretation in the next response before asking the next single question. Never write a recommendation into the selected-answer field.
4. Historical requirements and implemented behavior are reference material, never assumed answers. If the new answer is ambiguous, resolve only that same question. If it contradicts a historical requirement, cite that requirement and ask whether the change is intentional before marking a replacement confirmed. Keep the earlier decision and any supersession link. A clarification does not advance the question number.
5. A description of current office practice is not automatic permission to change the software, override legal authority, activate modules or implement a proposal. Record those boundaries separately.
6. Stop when material decisions are sufficient. Minor cosmetics and engineering choices belong in recommendations/investigation, not question-count inflation. Produce the final cross-module gap/prioritized phased proposal only after the meaningful questionnaire is complete.
7. Cover the full lifecycle systematically: Intake and Registration → Registry → Masterlist → Academic Monitoring → Eligibility/Standing → Payroll → Payment Processing/Individual Payments → Reporting → Administration. Include rollover, graduation, notifications, recovery and other actual office handoffs within the relevant modules. Do not limit the review to Payroll.
8. **Lightweight questioning, per the user's response-speed instruction:** confirm the answer, briefly update only this decision log, then ask one next question. Reuse the initial inspection/coverage baseline. Every 10 answered questions, perform a focused documentation/requirements consistency review; do not repeat the full inventory or technical baseline. Note ordinary conflicts here for that review, but identify a clear critical financial, authorization or legal-policy contradiction immediately. No routine tests, benchmarks, database queries, browser sessions, security scans or implementation planning.

## New question register

### Q1 — First entry of a new scholarship applicant

**Status: Confirmed — C, 23 October 2026.** Module: Scholarship Intake and Registration.

**Scenario:** A person applies for the scholarship for the first time. Establish the point in the office's process when Staff should first create their LDSS record. This question concerns entry timing only, not automatic qualification, permanent-ID allocation policy, the intake channel or a new online application system.

**Question:** For a first-time scholarship applicant, at what stage should Staff first create their LDSS record?

| Option | Available answer |
|---|---|
| A | When the office receives their initial application. **Recommended:** allows Staff to track the application, missing requirements and later outcome without treating the applicant as an approved scholar. |
| B | Only after they pass the qualifying examination. |
| C | Only after they are selected for the scholarship. |
| D | At another stage — describe the actual office process. |

**Selected answer:** **C — Only after they are selected for the scholarship.** User's exact reply: `C`.

**Confirmed operational rule:** Staff first creates a first-time applicant's LDSS record after the person has been selected for the scholarship. This confirms recording timing only; it does not automatically establish admission, official masterlist membership or payout eligibility.

**Reason supplied by user:** Not supplied.

**Impact on existing workflows:** The intended office entry point is after selection. Current software also supports earlier applicant entries; retain that workflow/history and record the sequencing difference for the next focused review. No application or financial rule changes now.

**Potential implementation changes:** None approved; any post-selection onboarding adjustment belongs to later analysis.

**Dependencies / unresolved authority:** Selection-confirmation handoff and first-entry information remain to be discussed. No permission to bypass qualification, evidence or approval checks is inferred.

**Answer / conflict / supersession history:** Recorded the user's C answer; the assistant's A recommendation was not accepted. The existing software's earlier-entry capability is a workflow difference for batch review, not evidence that the office must encode before selection. No historical record or financial safeguard is superseded by this answer.

### Q2 — Handoff of selected applicants to Staff

**Status: Confirmed — A, 23 October 2026.** Module: Scholarship Intake and Registration.

**Scenario / question:** How does Staff receive confirmation of which applicants have been selected?

| Option | Available answer |
|---|---|
| A | An approved list of selected applicants, on paper or in Excel. **Recommended:** gives Staff a clear basis for registering the selected group. |
| B | An individual written selection notice for each applicant. |
| C | Verbal confirmation from the Coordinator. |
| D | Another method — describe the actual office process. |

**Selected answer:** **A — An approved list of selected applicants, on paper or in Excel.** User's exact reply: `A`.

**Confirmed operational rule:** Staff uses the approved selection list received on paper or in Excel as the basis for registering selected applicants.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the selection-list handoff supporting Q1. Does not automatically publish a masterlist, approve eligibility or record payment; no implementation change approved.

**Dependencies / unresolved authority:** The person/office authorizing the list and minimum first-entry information are not established by this answer. Paper and Excel are both accepted handoff formats; no mandatory conversion or new approval step is inferred.

**Answer / conflict / supersession history:** Recorded A; no critical financial, authorization or legal-policy contradiction identified from this handoff choice.

### Q3 — Minimum information for initial registration

**Status: Confirmed — A, 23 October 2026.** Module: Scholarship Intake and Registration.

**Scenario / question:** If the approved selection list contains only names, should Staff be able to register those selected applicants before their other details are complete?

| Option | Available answer |
|---|---|
| A | Yes — register from the approved list, flag missing details and complete them later. **Recommended:** avoids delaying initial entry; duplicate review and later eligibility checks still apply. |
| B | No — require full name, birth date and address/barangay before initial registration. |
| C | No — require the complete scholar information form before initial registration. |
| D | Another minimum requirement — describe it. |

**Selected answer:** **A — Register from the approved list, flag missing details and complete them later.** User's exact reply: `A`.

**Confirmed operational rule:** Names on the approved selection list can support initial registration while other details remain explicitly incomplete. Duplicate review and later eligibility checks still apply; missing facts must not be fabricated.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Incomplete personal details alone do not delay initial entry from the approved list. This does not approve automatic admission, membership or payment; no code change approved.

**Dependencies / unresolved authority:** Missing details must not be fabricated. This does not decide duplicate resolution, admission, official membership or payment eligibility.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified from initial registration with truthful missing details.

### Q4 — Possible duplicate during registration

**Status: Confirmed — A, 23 October 2026.** Module: Scholarship Intake and Registration.

**Scenario / question:** When a selected applicant's name matches an existing LDSS record, how should Staff handle it before creating another record?

| Option | Available answer |
|---|---|
| A | Compare available identifying details; reuse the existing record if it is the same person, and leave unresolved matches pending. **Recommended:** avoids duplicate identities without assuming matching names mean the same person. |
| B | Refer every possible match to the Coordinator for a decision. |
| C | Obtain confirmation directly from the applicant for every possible match before proceeding. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Compare identifying details, reuse a confirmed matching record and leave uncertain matches pending.** User's exact reply: `A`.

**Confirmed operational rule:** Staff compares available identifying details before creating another record. Reuse the existing record when it is the same person; unresolved matches remain pending rather than being automatically linked or duplicated.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Routine identity review can be handled by Staff without referring every match automatically. Existing identity/history and duplicate safeguards remain; no implementation change approved.

**Dependencies / unresolved authority:** A name match alone does not prove identity. No automatic merge, deletion, payment or bypass of duplicate safeguards is proposed.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified from this duplicate-review procedure.

### Q5 — Initial entry of a selected group

**Status: Confirmed — A, 23 October 2026.** Module: Scholarship Intake and Registration.

**Scenario / question:** When Staff receives an approved selection list with many names, what should be the normal way to enter the group into LDSS?

| Option | Available answer |
|---|---|
| A | Import an Excel list, review flagged rows and duplicates, then confirm the group. **Recommended:** reduces repeated typing; paper lists can first be encoded into the import template. |
| B | Register each person individually using the registration form. |
| C | Let Staff choose Excel import or individual registration, with neither treated as the default. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Import Excel, review flagged rows and duplicates, then confirm the group.** User's exact reply: `A`.

**Confirmed operational rule:** Excel import is the preferred routine for entering an approved selected group. Staff reviews flagged rows and possible duplicates before confirmation; paper lists can first be encoded into the import template. This does not prohibit individual registration.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Prioritize group entry with review rather than repeated individual typing. No automatic approval or implementation change authorized.

**Dependencies / unresolved authority:** Q1-Q4 still apply. Importing does not automatically approve admission, official membership, document verification or payment.

**Answer / conflict / supersession history:** Recorded A. Q1-Q4 and existing safeguards remain; no critical financial, authorization or legal-policy contradiction identified.

### Q6 — Timing of permanent Scholar ID assignment

**Status: Confirmed — A, 23 October 2026.** Module: Scholar Registry.

**Scenario / question:** When should a newly registered selected applicant receive their permanent LDSS Scholar ID?

| Option | Available answer |
|---|---|
| A | At initial registration, once duplicate review is resolved, even if other details are incomplete. **Recommended:** provides one stable reference for completing the record and tracking documents. |
| B | After their personal information is complete. |
| C | After inclusion in the published official masterlist. |
| D | At another stage — describe it. |

**Selected answer:** **A — At initial registration, after duplicate review is resolved, even if other details are incomplete.** User's exact reply: `A`.

**Confirmed operational rule:** Assign a new selected applicant's permanent Scholar ID at initial registration after resolving duplicate review. Other incomplete details do not delay assignment. Reuse an existing person's identity under Q4 rather than assigning another ID.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Use the permanent ID as the stable reference while completing the record and tracking documents. No implementation change approved.

**Dependencies / unresolved authority:** Reuse an existing person's identity under Q4. ID assignment does not itself establish admission, official membership, document approval or payment eligibility.

**Answer / conflict / supersession history:** Recorded A. ID assignment does not approve admission, official membership, documents or payment; no critical financial, authorization or legal-policy contradiction identified.

### Q7 — Routine contact-information updates

**Status: Confirmed — A, 23 October 2026.** Module: Scholar Registry.

**Scenario / question:** Who should handle routine updates to a scholar's phone number or address?

| Option | Available answer |
|---|---|
| A | Staff or Coordinator can save the update directly, with change history retained. **Recommended:** keeps routine corrections quick and traceable. |
| B | Only the Coordinator can save updates. |
| C | Staff prepares the update; Coordinator approval is required before it takes effect. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Staff or Coordinator can save routine contact updates directly, with change history retained.** User's exact reply: `A`.

**Confirmed operational rule:** Staff and Coordinator may directly update a scholar's phone number or address without a separate routine approval step. Retain the change history and existing validation.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Avoid unnecessary approval for routine contact corrections. No implementation change approved; identity merges, academic changes, qualification and payment decisions remain outside this answer.

**Dependencies / unresolved authority:** This question does not decide identity merges, school/course changes, residency qualification or payment approval. Existing history and relevant validation remain protected.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this limited contact-update scope.

### Q8 — Default Registry list

**Status: Confirmed — A, 23 October 2026.** Module: Scholar Registry.

**Scenario / question:** When Staff opens the Scholar Registry, which group should appear first?

| Option | Available answer |
|---|---|
| A | All scholars linked to the current academic year, with other years accessible through filters. **Recommended:** focuses daily work while keeping history available. |
| B | All registered scholars across every academic year. |
| C | Only the most recently imported group. |
| D | Another default view — describe it. |

**Selected answer:** **A — All scholars linked to the current academic year, with other years accessible through filters.** User's exact reply: `A`.

**Confirmed operational rule:** The Registry initially shows scholars linked to the current academic year. Staff can access other academic years through filters; linkage refers to the relevant year, not the person's original registration year.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the default viewing scope only. Historical records remain accessible; no implementation change approved.

**Dependencies / unresolved authority:** This does not delete historical records, change scholarship standing or determine eligibility. Current-year linkage must not be confused with the scholar's original registration year.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this viewing preference.

### Q9 — Preparing the continuing-scholar group for a new academic year

**Status: Confirmed — A, 23 October 2026.** Module: Scholar Registry / Annual Rollover.

**Scenario / question:** At the start of a new academic year, how should Staff establish which existing scholars are continuing that year?

| Option | Available answer |
|---|---|
| A | Review the previous year's roster, confirm who is continuing and update their annual details. **Recommended:** reduces re-entry while allowing departures and changes to be checked. |
| B | Start from a newly approved continuing-scholar list and match it to existing records. |
| C | Add each continuing scholar individually when they submit their new-year documents. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Review the previous year's roster, confirm who is continuing and update their annual details.** User's exact reply: `A`.

**Confirmed operational rule:** Staff starts with the previous year's roster, reviews who is continuing and updates the relevant annual details. Prior-year inclusion alone does not automatically establish current-year continuation.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the annual continuing-roster preparation process while reusing existing identities. No implementation change approved.

**Dependencies / unresolved authority:** Retain permanent identities and prior-year history. Preparing a continuing group does not automatically publish the official masterlist, approve academic/document compliance or authorize payment.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this roster-preparation scope.

### Q10 — Authority to publish the official annual masterlist

**Status: Confirmed — A, 23 October 2026.** Module: Masterlist.

**Scenario / question:** Once the draft annual masterlist is ready, who should authorize its publication as the official list?

| Option | Available answer |
|---|---|
| A | The Coordinator, after reviewing the draft. **Recommended:** gives official publication a clear accountable approver. |
| B | Staff, after completing their own review, without separate Coordinator approval. |
| C | Another office or committee must approve it before Staff or Coordinator publishes it. |
| D | Another arrangement — describe it. |

**Selected answer:** **A — The Coordinator, after reviewing the draft.** User's exact reply: `A`.

**Confirmed operational rule:** The Coordinator reviews the draft and authorizes publication as the official annual masterlist. This is an office workflow answer, not independent evidence of legal delegation.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the office publication-approval responsibility. Existing verification, submission, approval, publication and locking controls remain; no implementation change approved.

**Dependencies / unresolved authority:** This does not determine who selects new scholars, impose a distinct-person preparation/approval rule or approve payment. Existing publication checks and frozen-history protections remain unchanged during questioning.

**Answer / conflict / supersession history:** Recorded A. Consistent with documented Coordinator masterlist approval/publication. Existing per-operation separation remains, including the F11 restriction that the approver differs from the actor who submitted for approval; Q10 does not remove that restriction.

### Focused consistency review — Q1-Q10

**Completed: 23 October 2026.** Ten explicit answers reviewed against historical B01-B19, the initial lifecycle/issue mapping and targeted delivery documentation. Only this decision log was updated. No source inventory, baseline rehash, application test, benchmark, database query, browser session or security scan was performed.

| Scope | Result / follow-up |
|---|---|
| Q1-Q2: post-selection entry and approved-list handoff | Q1 differs from the earlier-entry qualification journey documented in [F06](../F06-delivery.md). Preserve this workflow difference for later analysis. Do not fabricate exam/qualification events, infer selection authority from Q2 or bypass admission/publication checks. No replacement implementation is approved. |
| Q3-Q7: incomplete details, identity and routine corrections | These answers are internally consistent: unresolved identity matches remain pending; confirmed existing identities are reused; other unknown details remain incomplete. [F04](../F04-delivery.md) documents optional birth/contact details, permanent IDs and audited profile changes. This is not verification that every names-only import or proposed first-entry case already works. |
| Q8: Registry scope | The intended default uses current-year linkage, not original registration year. F04's historical registration-year filter is a different concept. Exact support for the requested default remains a later targeted implementation check; no defect or completed change is claimed. |
| Q9: annual continuation | Reviewing last year's roster is preparation, not automatic acceptance or publication. Preserve the scoped approval and unknown-history protections documented in [continuing onboarding](../LDSS_WORKFLOW_PHASE05_CONTINUING.md) and the [later membership decision](../LDSS_WORKFLOW_PHASE08_RECEIPT_EVIDENCE.md). No reapplication or fictional selection history is inferred. |
| Q10: official publication | Consistent with [F11](../F11-delivery.md) and [F12](../F12-delivery.md): Coordinator authority, existing per-operation approval separation and protected official versions remain. The office answer does not establish statutory or committee delegation. |

**Outcome:** No critical financial, authorization or legal-policy contradiction was identified within these ten answers. Q1's sequencing difference and Q8's implementation check remain open for later analysis. This is a focused documentation/requirements review, not whole-system validation. Coverage and issue documents remain initial mapping snapshots; current questionnaire progress and batch findings are recorded here. No historical evidence was deleted or superseded, and no implementation or financial change was authorized.

### Q11 — Incomplete information when the masterlist is ready

**Status: Confirmed — A, 23 October 2026.** Module: Masterlist.

**Scenario / question:** If some selected scholars still lack information required for the annual masterlist, how should the office proceed with scholars whose information is complete?

| Option | Available answer |
|---|---|
| A | Publish the ready scholars, then process approved additions once the remaining scholars' required information is complete. **Recommended:** avoids delaying the ready group while keeping additions controlled. |
| B | Wait until every selected scholar's required information is complete before publishing the group. |
| C | Let the Coordinator decide whether to wait or publish the ready group for each case. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Publish the ready scholars, then process approved additions once the remaining scholars' required information is complete.** User's exact reply: `A`.

**Confirmed operational rule:** Incomplete entries do not delay publication of the ready group. Remaining selected scholars can be considered through controlled, approved additions after their required masterlist information is complete.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes publication timing for a partially ready selected group. No automatic addition, backdating or implementation change is approved.

**Dependencies / unresolved authority:** Required masterlist information is distinct from semester payout compliance. Existing membership criteria, Coordinator authorization, controlled additions and frozen-version history remain. This question does not approve publishing incomplete entries or treating publication as payment eligibility.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this publication-timing scope.

### Q12 — Receipt of an incomplete semester-document submission

**Status: Confirmed — A, 23 October 2026.** Module: Academic Monitoring / Document Receiving.

**Scenario / question:** When a scholar submits only some of their required semester documents, how should Staff record the submission?

| Option | Available answer |
|---|---|
| A | Record each document when received and leave the outstanding documents marked missing. **Recommended:** keeps receipt and follow-up accurate without waiting for the complete set. |
| B | Wait until the complete set is submitted before recording any receipt in LDSS. |
| C | Record partial submissions in a separate receiving log, then encode them into LDSS in batches. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Record each document when received and leave the outstanding documents marked missing.** User's exact reply: `A`.

**Confirmed operational rule:** Staff records the documents actually received without waiting for the complete semester set. Outstanding documents remain explicitly missing until received; receipt does not establish verification or academic compliance.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes immediate recording of partial submissions and truthful outstanding-document tracking. No implementation change approved.

**Dependencies / unresolved authority:** Receipt, verification, academic assessment and payout eligibility remain distinct. Record only documents actually received, preserve their actual coverage and receipt evidence, and do not infer missing documents or change cutoff rules.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this receipt-recording scope.

### Q13 — Routine semester-document verification

**Status: Confirmed — A, 23 October 2026.** Module: Academic Monitoring / Document Verification.

**Scenario / question:** Who should check submitted semester documents and mark them verified in routine cases?

| Option | Available answer |
|---|---|
| A | Staff or Coordinator can verify routine cases; unclear cases go to the Coordinator. **Recommended:** keeps routine work moving with a clear escalation path. |
| B | Only the Coordinator checks and verifies documents. |
| C | Staff checks the documents, but the Coordinator must confirm every verification. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Staff or Coordinator can verify routine cases; unclear cases go to the Coordinator.** User's exact reply: `A`.

**Confirmed operational rule:** Staff and Coordinator may perform routine semester-document verification after the actual checks. Unclear cases are referred to the Coordinator rather than automatically verified.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes routine verification responsibility and escalation without requiring separate Coordinator confirmation for every routine case. No implementation or permission change approved.

**Dependencies / unresolved authority:** Verification requires actual document checks and correct semester coverage. Receipt, academic assessment and payment approval remain separate. Existing permissions and any per-operation separation stay unchanged during questioning; no automatic verification or exception authority is inferred.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this routine-verification scope; this does not grant new exception or financial authority.

### Q14 — Handling academic concerns found in a COG

**Status: Confirmed — A, 23 October 2026.** Module: Academic Monitoring / Academic Review.

**Scenario / question:** When a COG shows a failed subject, INC or another academic concern, who should handle the case?

| Option | Available answer |
|---|---|
| A | Staff records the finding and refers the case to the Coordinator for review. **Recommended:** keeps the evidence and review responsibility clear. |
| B | The Coordinator handles both recording the finding and reviewing the case. |
| C | Staff handles routine follow-up under established rules and refers only unclear cases to the Coordinator. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Staff records the finding and refers the case to the Coordinator for review.** User's exact reply: `A`.

**Confirmed operational rule:** When a COG shows a failed subject, INC or another academic concern, Staff records the actual finding and refers the case to the Coordinator for review. Referral does not itself resolve the finding or change scholarship standing.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the recording and review handoff for academic concerns. No implementation, academic-policy or financial change approved.

**Dependencies / unresolved authority:** Record actual findings without inventing grades or resolutions. Academic compliance, formal scholarship standing and payment decisions remain distinct. Referral does not waive a mandatory academic rule, authorize payment or automatically terminate a scholarship; existing safeguards and decision authority remain unchanged.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this academic-review handoff.

### Q15 — School or course change requests

**Status: Confirmed — A, 23 October 2026.** Module: Academic Monitoring / Academic Changes.

**Scenario / question:** How should the office handle a school or course change reported by a scholar?

| Option | Available answer |
|---|---|
| A | Staff records the request and supporting documents; the Coordinator reviews it before the change takes effect. **Recommended:** gives the request a clear handoff and preserves the previous placement. |
| B | The Coordinator handles both recording the request and reviewing it. |
| C | Staff starts recording the change only after receiving an already approved written decision. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Staff records the request and supporting documents; the Coordinator reviews it before the change takes effect.** User's exact reply: `A`.

**Confirmed operational rule:** Staff records a reported school or course change as a request with supporting documents. The Coordinator reviews the request before the change takes effect through the applicable controlled process; reporting or receiving documents alone does not change approved placement.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the Staff-to-Coordinator handoff for placement changes. No implementation, permission or academic-policy change approved.

**Dependencies / unresolved authority:** A reported change or newly received COR does not itself approve a transfer or shift. Preserve applicable academic restrictions, existing approval/separation checks, effective dates, prior placement and official masterlist amendment history. No automatic approval, retrospective financial change or new legal authority is inferred.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this request/review handoff.

### Q16 — Evidence confirming graduation

**Status: Confirmed — A, 23 October 2026.** Module: Academic Monitoring / Graduation and Standing.

**Scenario / question:** What should normally confirm a scholar's graduation before LDSS records them as graduated?

| Option | Available answer |
|---|---|
| A | An official school document or official graduation list. **Recommended:** gives the office a traceable basis for recording completion. |
| B | A written notification from the scholar. |
| C | Direct confirmation obtained by the Coordinator from the school. |
| D | Another procedure — describe it. |

**Selected answer:** **A — An official school document or official graduation list.** User's exact reply: `A`.

**Confirmed operational rule:** Use an official school document or official graduation list as the normal evidence confirming graduation before recording graduated status through the existing controlled process.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the usual graduation evidence source. No new document subtype, implementation, standing-rule or financial change approved.

**Dependencies / unresolved authority:** Existing status approval, effective-date and history controls remain. Do not infer graduation from year level or calendar rollover. Graduation evidence does not erase prior membership, documents or payments, or cancel an otherwise valid final-semester entitlement; existing final-semester protections remain unchanged.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this graduation-evidence scope.

### Q17 — Follow-up when a scholar is not ready for payout

**Status: Confirmed — A, 23 October 2026.** Module: Eligibility / Operational Follow-up.

**Scenario / question:** If LDSS shows a scholar as not ready for payout, what should Staff normally do first?

| Option | Available answer |
|---|---|
| A | Review the reasons, follow up missing or incorrect information, and refer cases requiring a decision to the Coordinator. **Recommended:** directs follow-up to the actual blocker. |
| B | Refer every case to the Coordinator for initial review before Staff follows up. |
| C | Give the scholar a list of outstanding issues and wait for them to return before further follow-up. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Review the reasons, follow up missing or incorrect information, and refer cases requiring a decision to the Coordinator.** User's exact reply: `A`.

**Confirmed operational rule:** Staff first reviews the actual reasons a scholar is not ready for payout, follows up missing or incorrect information and refers cases requiring a decision to the Coordinator. Academic concerns retain the Q14 referral process.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes targeted Staff follow-up and decision escalation. No implementation, eligibility-rule or financial change approved.

**Dependencies / unresolved authority:** Preserve Q14's referral of academic concerns and existing authority for formal decisions. Follow-up or referral does not itself make a scholar eligible. Correct source facts through their controlled workflows; do not force eligibility, waive mandatory rules, alter receipt timing or bypass fresh finalization checks.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this follow-up scope.

### Q18 — First step for a temporary-leave request

**Status: Confirmed — A, 23 October 2026.** Module: Scholarship Standing / Temporary Leave.

**Scenario / question:** For a scholar who wants to pause studies temporarily, what should be the normal first step with your office?

| Option | Available answer |
|---|---|
| A | Submit a written request to Staff for Coordinator review. **Recommended:** gives the office a traceable request and clear review handoff. |
| B | Approach the Coordinator directly to discuss the request. |
| C | Notify Staff verbally; Staff records the request for Coordinator review. |
| D | Another procedure, or no established leave process yet — describe it. |

**Selected answer:** **A — Submit a written request to Staff for Coordinator review.** User's exact reply: `A`.

**Confirmed operational rule:** A scholar seeking to pause studies temporarily submits a written request to Staff, who routes it to the Coordinator for review. This establishes the request channel, not approval of leave or its conditions.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes a traceable leave-request handoff. No implementation, standing-policy or financial change approved.

**Dependencies / unresolved authority:** A request does not itself approve leave, change status or establish a right to reinstatement, continued payments or an extended scholarship period. Applicable leave authority, conditions and formal decision controls remain separate; do not infer leave from missing documents or non-enrollment alone.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this request-entry scope. Leave conditions and return/reinstatement requirements remain unresolved for later review.

### Q19 — Trigger for semester-payroll preparation

**Status: Confirmed — A, 23 October 2026.** Module: Payroll Preparation.

**Scenario / question:** What should normally signal Staff to begin preparing the semester payroll?

| Option | Available answer |
|---|---|
| A | The Coordinator confirms the payout period and schedule, then instructs Staff to prepare it. **Recommended:** gives Staff a clear operational starting point. |
| B | A written instruction from the Financial/Releasing Office. |
| C | Staff begins once the eligibility review is ready, without a separate instruction to start. |
| D | Another procedure — describe it. |

**Selected answer:** **A — The Coordinator confirms the payout period and schedule, then instructs Staff to prepare it.** User's exact reply: `A`.

**Confirmed operational rule:** Staff normally begins semester-payroll preparation following the Coordinator's instruction after the payout period and schedule are confirmed. This is the preparation handoff, not financial activation or payment approval.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the routine Coordinator-to-Staff preparation trigger. No implementation or financial activation approved.

**Dependencies / unresolved authority:** An instruction to prepare does not open a financial cycle, approve funds, finalize a payroll or record payment. Preserve existing cycle/window authority, candidate eligibility, review/finalization checks and financial controls. A planned payout schedule does not establish the Financial/Releasing Office's claiming cutoff or resolve PB1.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this preparation-trigger scope.

### Q20 — Payroll preparation while some scholars are not ready

**Status: Confirmed — A, 23 October 2026.** Module: Payroll Preparation / Batch Timing.

**Scenario / question:** If some scholars still have unresolved requirements when payroll is being prepared, how should Staff proceed?

| Option | Available answer |
|---|---|
| A | Prepare the eligible group and follow up the others for a later authorized same-semester batch, where available. **Recommended:** avoids delaying ready scholars without bypassing requirements. |
| B | Wait until all intended scholars are ready before preparing the payroll. |
| C | Let the Coordinator decide case by case whether to wait or proceed with the eligible group. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Prepare the eligible group and follow up the others for a later authorized same-semester batch, where available.** User's exact reply: `A`.

**Confirmed operational rule:** Unresolved requirements for some scholars do not delay preparation for the eligible group. Staff follows up the remaining scholars for a later authorized same-semester batch only where one is available and applicable requirements are met.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes batch timing and follow-up for a partly ready group. No new batch, implementation or financial-rule change approved.

**Dependencies / unresolved authority:** Inclusion still requires current eligibility and existing candidate/route checks. A later batch must actually be authorized and available within the applicable preparation period; no new batch, claiming extension, reopening or individual-payment route is preapproved. Preserve one entitlement per scholar/semester/benefit and fresh finalization checks.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this batch-timing scope. The scheduled Q11-Q20 focused consistency review follows this answer.

### Focused consistency review — Q11-Q20

**Completed: 23 October 2026.** Reviewed these ten answers against the earlier questionnaire answers, historical B01-B19 and targeted verification/standing documentation. Only this decision log was changed. No source inventory, baseline rehash, source-code analysis, tests, benchmarks, database queries, browser sessions or security scans were performed.

| Scope | Result / follow-up |
|---|---|
| Q11: partly ready masterlist | Consistent with Q10's Coordinator authority and controlled additions. Publication readiness remains distinct from payout compliance; no incomplete membership or automatic later addition is approved. Implementation parity is not established by this discussion. |
| Q12-Q13: receipt and verification | Partial receipt does not mark the whole set complete. Staff/Coordinator verification is consistent with [F16](../F16-delivery.md), which requires actual identity, period, placement, policy and physical-document checks. Unclear cases are escalated; verification is not a waiver or full eligibility approval. |
| Q14-Q15: academic concerns and placement | Referral and review preserve the [workflow specification's](../LDSS_WORKFLOW_PHASE03_SPECIFICATION.md) separation of academic findings, formal standing and approved placement changes. No mandatory academic restriction, prior-permission rule or official amendment control is waived. |
| Q16: graduation | Official school evidence supports recording completion through existing status controls. It does not infer an effective date, erase history or cancel a valid final-semester entitlement. |
| Q17-Q18: follow-up and leave requests | Staff follow-up does not force eligibility. Q18 establishes only a written request channel; leave authority, conditions, duration and return/reinstatement requirements remain unresolved. No leave status or payment right follows automatically. |
| Q19-Q20: payroll preparation | Coordinator instruction is an operational trigger, not financial activation. Preparing the eligible group is consistent with later-batch consideration only where authorized and available. Preserve current eligibility, exclusive payment routes, preparation windows and duplicate-entitlement checks; no claiming extension or reopening is inferred. |

**Outcome:** No critical financial, authorization or legal-policy contradiction identified within Q11-Q20. Q1's sequencing difference and Q8's implementation check remain open. Leave conditions and PB1/PB2/PB6 remain unresolved; none is answered by these operational handoffs. This focused documentation review does not establish complete implementation coverage or authorize changes. Next review: after 30 confirmed answers.

### Q21 — Review handoff for a prepared payroll draft

**Status: Confirmed — custom answer, 23 October 2026.** Module: Payroll Preparation / Review.

**Scenario / question:** After Staff prepares the payroll draft, how should the office conduct its review before forwarding?

| Option | Available answer |
|---|---|
| A | Staff submits it to the Coordinator for review; any corrections return to Staff. **Recommended:** provides a clear review and correction handoff. |
| B | Staff and Coordinator review the draft together. |
| C | Another office or committee reviews it first. |
| D | Another procedure — describe it. |

**Selected answer:** **Custom — Staff or Coordinator can prepare and review the draft; only the Coordinator can approve it.** User's exact reply: `Q21. A staff or a coordinator can prepare it and review it, but only coordinator can approve the payroll draft`.

**Confirmed operational rule:** Staff and Coordinator may both prepare and review payroll drafts. Payroll-draft approval is reserved to the Coordinator. Preparation or review alone does not constitute approval.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Clarifies the role allocation beyond the offered Staff-to-Coordinator handoff: Coordinator preparation and review are also permitted. No application or permission change authorized; approval, finalization, forwarding and actual payment remain distinct operations.

**Dependencies / unresolved authority:** Preserve existing per-operation preparation, review, finalization and forwarding authority. Draft corrections remain subject to current source/eligibility checks; frozen or finalized records cannot be directly edited. Joint review or referral does not bypass formal approval, create a new universal distinct-person rule or record payment.

**Answer / conflict / supersession history:** Recorded the user's custom wording rather than treating it as an unqualified selection of option A. It allows either operational role to prepare/review and reserves approval to Coordinator, consistent with historical role boundaries. No critical contradiction identified; existing per-operation separation checks remain.

### Q22 — Evidence used to record payout outcomes

**Status: Confirmed — A, 23 October 2026.** Module: Payment Processing / Payment Recording.

**Scenario / question:** What should Staff normally use as the main basis for recording Paid and Unclaimed after a payout?

| Option | Available answer |
|---|---|
| A | The returned payroll showing recipient acknowledgments, Unclaimed entries and actual payment dates. **Recommended:** links recorded outcomes to the payout evidence. |
| B | An official Paid/Unclaimed report supplied by the Financial/Releasing Office. |
| C | Staff's record of acknowledged actual releases made during the payout. |
| D | Another procedure — describe it. |

**Selected answer:** **A — The returned payroll showing recipient acknowledgments, Unclaimed entries and actual payment dates.** User's exact reply: `A`.

**Confirmed operational rule:** Staff normally uses the returned payroll's recipient acknowledgments, Unclaimed entries and actual payment dates as the main evidence for recording payout outcomes. Record the supported outcome and actual date; do not infer payment from preparation or approval.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the main payout-evidence handoff. No implementation or financial-rule change approved.

**Dependencies / unresolved authority:** Paid still requires acknowledged actual release; preparation, approval, forwarding or cheque issuance alone is insufficient. Actual payment date remains distinct from recording time. This does not decide returned-payroll verification/closure, alter the established bulk-recording safeguards or authorize payment without evidence.

**Answer / conflict / supersession history:** Recorded A. No critical financial, authorization or legal-policy contradiction identified within this evidence-source choice.

### Q23 — Paid/Unclaimed discrepancy on a returned payroll

**Status: Confirmed — A, 23 October 2026.** Module: Payment Processing / Reconciliation and Corrections.

**Scenario / question:** If the returned payroll's Paid/Unclaimed status differs from an outcome already recorded in LDSS, how should the office handle it?

| Option | Available answer |
|---|---|
| A | Staff records the discrepancy with supporting evidence; the Coordinator reviews any needed correction. **Recommended:** keeps the discrepancy and correction decision traceable. |
| B | The Coordinator handles both recording the discrepancy and reviewing it. |
| C | Staff first obtains written clarification from the Financial/Releasing Office before submitting the discrepancy for review. |
| D | Another procedure — describe it. |

**Selected answer:** **A — Staff records the discrepancy with supporting evidence; the Coordinator reviews any needed correction.** User's exact reply: `A`.

**Confirmed operational rule:** When returned-payroll evidence differs from a Paid/Unclaimed outcome already recorded in LDSS, Staff records the discrepancy and supporting evidence. The Coordinator reviews any required correction through the existing controlled process; reporting alone does not change the payment outcome.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the discrepancy-reporting and correction-review handoff. No implementation or financial-rule change approved.

**Dependencies / unresolved authority:** This concerns Paid/Unclaimed status discrepancies, not ordinary open-period Staff date corrections. Preserve original outcomes, correction history, existing decision/separation checks and duplicate-payment guards. Reporting a discrepancy does not approve a correction or reopen a closed payroll; unresolved discrepancies retain their existing closure-blocking effect.

**Answer / conflict / supersession history:** Recorded A. Consistent with historical B10's distinction between Staff reporting and Coordinator correction review; no critical contradiction identified within this handoff.

### Q24 — Communication of the Unclaimed claiming instruction

**Status: Confirmed — B, 23 October 2026.** Module: Individual Payments / Unclaimed; authority dependency PB1.

**Scenario / question:** Before Staff prepares a DV for an Unclaimed stipend, how does the Financial/Releasing Office tell Staff whether claiming is still allowed?

| Option | Available answer |
|---|---|
| A | A written notice or instruction for the relevant payout/batch. **Recommended:** gives Staff a traceable source; this does not assume such a notice already exists. |
| B | A verbal instruction giving the claiming date for the relevant payout/batch. |
| C | Case-by-case confirmation for each scholar's request. |
| D | Another procedure, or no established instruction yet — describe the actual practice. |

**Selected answer:** **B — A verbal instruction giving the claiming date for the relevant payout/batch.** User's exact reply: `b`.

**Confirmed operational rule:** The Financial/Releasing Office communicates whether claiming is still allowed through a verbal instruction giving the claiming date for the relevant payout/batch. This confirms the communication method only; the exact cutoff rule and its scope remain to be established.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Documents the verbal handoff without substituting the assistant's written-notice recommendation. No implementation, financial-period or route change approved.

**Dependencies / unresolved authority:** Communication method alone does not determine the cutoff, its controlling authority, its relationship to the existing semester-end guard or the effect of a timely request after a cutoff. Preserve DV-only Unclaimed processing and current claimability checks; do not infer an extension, automatic forfeiture or payment authority.

**Answer / conflict / supersession history:** Recorded B from the user's lowercase reply. The written-notice recommendation was not selected. No critical contradiction identified from the communication method alone; PB1 remains only partially described. Former Q104 remains historically unanswered; this answer belongs to new Q24.

### Q25 — Deadline specified by the verbal claiming instruction

**Status: Confirmed — A, 23 October 2026.** Module: Individual Payments / Unclaimed; authority dependency PB1.

**Scenario / question:** What deadline does the Financial/Releasing Office normally give in that verbal instruction?

| Option | Available answer |
|---|---|
| A | A specific claiming deadline for the payout/batch. |
| B | The semester's end date. |
| C | An individual deadline for each scholar. |
| D | Another rule, or no definite deadline — describe it. |

**Selected answer:** **A — A specific claiming deadline for the payout/batch.** User's exact reply: `a`.

**Confirmed operational rule:** The Financial/Releasing Office's verbal instruction specifies a claiming deadline for the relevant payout/batch. No actual date or relationship to the semester end has been supplied.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes payout/batch scope for the communicated deadline. Existing LDSS claimability uses the configured semester end; compatibility depends on how the dates relate, to be clarified in Q26. No replacement financial rule or implementation change approved.

**Dependencies / unresolved authority:** The specific date, issuing authority, relationship to the configured semester end and effect of a timely request remain separate unless explicitly answered. Identify any material conflict before confirming a replacement financial rule. Existing claimability guards, historical evidence and entitlement protections remain unchanged during questioning.

**Answer / conflict / supersession history:** Recorded A from the user's lowercase reply. A batch-specific deadline is not assumed equal to, earlier than or later than the configured semester end. Flagged this compatibility question immediately; no confirmed contradictory date or replacement authority is inferred.

### Q26 — Relationship between the claiming deadline and semester end

**Status: Confirmed — C with clarification B, 23 October 2026.** Module: Individual Payments / Unclaimed; authority dependency PB1.

**Scenario:** LDSS currently uses the configured semester end as its claiming limit. Q25 establishes that the office communicates a payout/batch deadline; its relationship to semester end is not yet answered.

**Question:** How does that payout/batch claiming deadline normally relate to the semester's end date?

| Option | Available answer |
|---|---|
| A | It can fall after the semester ends. |
| B | It is always the semester's end date. |
| C | It sometimes falls earlier, but never after the semester ends. |
| D | Another arrangement, or the relationship is not established — describe it. |

**Selected answer:** **C — It sometimes falls earlier, but never after the semester ends.** User's exact reply: `c`.

**Confirmed operational rule:** The regular payout/batch deadline sometimes precedes semester end and never extends beyond it. That deadline covers regular payout only. Staff may still prepare a new Unclaimed DV request after that regular-payout cutoff subject to the separate instruction governing DV requests; the DV claiming limit has not yet been supplied.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** The initial C answer raised a conditional compatibility concern because a semester-end check alone cannot enforce an earlier cutoff. Clarification B establishes that the earlier cutoff is for regular payout, so that concern is not a confirmed Unclaimed-DV control gap. Assess compatibility only after the separate DV instruction is established. No implementation or financial rule changed.

**Dependencies / unresolved authority:** Record any confirmed conflict explicitly before treating an office answer as a replacement software requirement. No financial-period changes, overrides, forfeiture, entitlement extension or policy implementation authorized. The effect of a timely request before a cutoff remains separate.

**Answer / conflict / supersession history:** Initially recorded `c` and held Q26 open to clarify scope. The user's subsequent `B` confines the discussed earlier deadline to regular payout and distinguishes the DV instruction. Preserve Q24-Q25 and the original C answer as history, read with this later clarification; do not apply the regular-payout date automatically to DV requests. No replacement software rule or permission to bypass the semester-end guard is confirmed.

**Q26 clarification:** After an earlier payout/batch deadline, may Staff still prepare a new Unclaimed DV request?

| Option | Clarification choice |
|---|---|
| A | No — the earlier deadline also applies to new Unclaimed DV requests. |
| B | Yes — that deadline covers regular payout only; DV requests follow a separate instruction. |
| C | Staff must obtain case-by-case confirmation from the Financial/Releasing Office. |
| D | Another procedure, or this has not been established — describe it. |

**Clarification answer:** **B — Yes, that deadline covers regular payout only; DV requests follow a separate instruction.** User's exact reply: `B`. Recorded 23 October 2026. Q26 is complete and counted once. No actual DV cutoff, late-request exception or effect of a timely request is inferred.

### Q27 — Claiming limit under the separate DV instruction

**Status: Confirmed — B, 23 October 2026.** Module: Individual Payments / Unclaimed; authority dependency PB1.

**Scenario / question:** What claiming limit does the separate instruction for Unclaimed DV requests use?

| Option | Available answer |
|---|---|
| A | A separate fixed DV deadline for the relevant payout/batch. |
| B | The semester's end date. |
| C | The Financial/Releasing Office confirms whether claiming is allowed for each request. |
| D | Another rule, or no established DV instruction yet — describe it. |

**Selected answer:** **B — The semester's end date.** User's exact reply: `b`.

**Confirmed operational rule:** The separate instruction for Unclaimed DV requests uses the semester's end date as the claiming limit. The earlier regular-payout cutoff discussed in Q26 does not replace that DV limit.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the DV claiming-limit basis, consistent with the existing semester-end guard. No deadline, implementation or financial-period change approved. The effect of an on-time request awaiting release remains separate.

**Dependencies / unresolved authority:** Do not transfer the regular-payout deadline to DV requests or infer unlimited claiming. Preserve current claimability guards until any difference is explicitly reconciled and separately approved for implementation. Issuing authority, actual dates and timely-request effects remain separate where not supplied.

**Answer / conflict / supersession history:** Recorded B from the user's lowercase reply. Read Q24-Q27 together: regular payout may have an earlier cutoff; Unclaimed DV claiming uses semester end. No critical contradiction identified in that deadline distinction. PB1 is not fully resolved until the timely-request effect is established.

### Q28 — Timely DV request awaiting release after semester end

**Status: Confirmed — A with confirmation A, 23 October 2026.** Module: Individual Payments / Unclaimed Settlement; authority dependency PB1.

**Scenario / question:** A scholar submits an Unclaimed DV request by the semester-end deadline, but actual release is delayed until after semester end. What does the Financial/Releasing Office allow?

| Option | Available answer |
|---|---|
| A | The timely request can continue through processing and actual payment after semester end. |
| B | Actual payment must also occur by the semester-end deadline. |
| C | The Financial/Releasing Office must confirm whether the delayed case may proceed. |
| D | Another procedure, or this has not been established — describe it. |

**Selected answer:** **A — The timely request can continue through processing and actual payment after semester end.** User's exact reply: `a`.

**Confirmed operational rule / requirements intent:** Preserve an Unclaimed DV request submitted by the semester-end deadline for continued processing and actual release after semester end, subject to all other eligibility, approval and actual-release checks. The user expressly confirmed this intended difference for the later requirements proposal after the current settlement block was explained. Implementation and individual payments remain unauthorized by this discussion.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Confirmed requirements/implementation difference: existing LDSS claimability checks block settlement after semester end even when the request was received before cutoff, whereas the confirmed office requirement permits delayed actual release for a timely request. Preserve both facts for the later proposal. No guard, period, schema, payment record or application code is changed now.

**Dependencies / unresolved authority:** Timely receipt, DV preparation, actual release and recording time remain distinct. This concerns the original timely request and entitlement; it does not authorize new requests after cutoff, a new semester benefit, reopening, backdating or bypassing currently operative guards. Actual authority, acceptable timely-request evidence and any processing limits remain to be established; Paid still requires acknowledged actual release.

**Answer / conflict / supersession history:** Initially recorded lowercase `a` and held Q28 open because it differed from the current settlement block. After that conflict was presented, the user replied `a` to confirmation A. The intended requirements difference is now explicit and confirmed; Q28 is counted once. Existing implementation and historical evidence remain unchanged. The answer does not independently prove legal authority, establish unlimited delay or approve an individual release.

**Q28 confirmation:** Should the later requirements proposal preserve an on-time DV request for processing and actual release after semester end, despite the current settlement block?

| Option | Confirmation choice |
|---|---|
| A | Yes — subject to all other eligibility, approval and actual-release checks. |
| B | Only with case-specific approval from the Financial/Releasing Office. |
| C | Leave this unresolved pending official confirmation. |
| D | Another rule — describe it. |

**Confirmation answer:** **A — Yes, subject to all other eligibility, approval and actual-release checks.** User's exact reply: `a`. Recorded 23 October 2026. This confirms requirements intent only; it does not authorize implementation or any payment. Actual authority, timely-request evidence and any processing limits must remain explicit in the later proposal.

### Q29 — Evidence of an on-time Unclaimed DV request

**Status: Confirmed — A, 23 October 2026.** Module: Individual Payments / Unclaimed; authority dependency PB1.

**Scenario / question:** What should the office use to establish that an Unclaimed DV request was received by the deadline?

| Option | Available answer |
|---|---|
| A | A dated receiving-log entry or acknowledgment for the request. **Recommended:** preserves evidence of receipt separately from later DV preparation or payment. |
| B | The date the DV was prepared or approved. |
| C | Confirmation from the Financial/Releasing Office that the request was received on time. |
| D | Another procedure, or no established evidence yet — describe it. |

**Selected answer:** **A — A dated receiving-log entry or acknowledgment for the request.** User's exact reply: `a`.

**Confirmed operational rule:** Use a dated receiving-log entry or acknowledgment for the Unclaimed DV request to establish receipt by the deadline. Timeliness is evidenced separately from subsequent DV preparation, approval or actual payment.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes acceptable receipt evidence for Q28's timely-request condition. No receipt record, implementation or financial action created or changed.

**Dependencies / unresolved authority:** Preserve actual receipt evidence without fabricated dates or historical backfill. Request receipt, document generation, approval, release and recording timestamps remain distinct. This evidence question does not approve an individual request, change other eligibility checks or resolve unspecified processing limits.

**Answer / conflict / supersession history:** Recorded A from the user's lowercase reply. No new critical contradiction identified by this evidence choice. Q28's explicitly confirmed requirements/implementation difference remains recorded for the later proposal.

### Q30 — Late recording of a payment actually released on time

**Status: Confirmed — B, 23 October 2026.** Module: Payment Recording / Restricted-Period Evidence; authority dependency PB2.

**Scenario / question:** A payment actually occurred before semester end, but Staff receives the evidence afterward. What should support recording it late?

| Option | Available answer |
|---|---|
| A | Dated, signed evidence of actual release, reviewed by the Coordinator. **Recommended:** supports the actual payment date through a reviewed evidence trail. |
| B | The same release evidence and Coordinator review, plus written confirmation from the Financial/Releasing Office. |
| C | Case-specific instructions from the Financial/Releasing Office before deciding how to record it. |
| D | Another procedure, or this has not been established — describe it. |

**Selected answer:** **B — The same release evidence and Coordinator review, plus written confirmation from the Financial/Releasing Office.** User's exact reply: `b`.

**Confirmed operational rule:** When actual payment occurred before semester end but Staff receives its evidence afterward, late recording requires dated, signed evidence of actual release, Coordinator review and written confirmation from the Financial/Releasing Office. Retain the supported actual payment date separately from the recording timestamp.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes additional evidence and review for this restricted-period late-recording scenario. Exact support for the written-confirmation requirement remains a later implementation check; no completed change is claimed. No implementation, period reopening or financial action approved.

**Dependencies / unresolved authority:** This differs from Q28's actual release after semester end. Preserve ordinary open-period Staff date-correction authority, actual payment versus recording dates, restricted reviewed paths, applicable period/record locks and immutable original closure. No new unrestricted Staff write, false date, automatic correction or bypass of current guards is inferred.

**Answer / conflict / supersession history:** Recorded B from the user's lowercase reply; the simpler A recommendation was not selected. No new critical contradiction identified within this evidence/review choice. This answer does not replace Q28's separately confirmed timely-request rule or extend the evidence requirement to ordinary open-period Staff date corrections. Q30 brings the total to 30 confirmed answers; the scheduled focused review follows.

### Focused consistency review — Q21-Q30

**Completed: 23 October 2026.** Reviewed these ten explicit answers against earlier questionnaire decisions, historical B01-B19 and targeted payment-plan/P03/P04/P06/P07/P10 documentation. Only this decision log was changed. Reused the initial coverage and evidence baseline; no source inventory, baseline rehash, source-code analysis, tests, benchmarks, database queries, browser sessions or security scans were performed.

| Scope | Result / follow-up |
|---|---|
| Q21: payroll preparation, review and approval | Preserve the custom answer: either Staff or Coordinator may prepare/review; only Coordinator approves. Approval, finalization, forwarding and payment remain distinct. Historical B18 and the [payment plan](../payroll/PAYMENT_PROCESSING_IMPLEMENTATION_PLAN.md) retain current per-operation authority; no universal distinct-person rule or removal of an existing separation check is inferred. |
| Q22-Q23: outcome evidence and discrepancies | Returned-payroll evidence supports actual outcomes and dates. Consistent with [P03](../payroll/P03_RECONCILIATION_CORRECTIONS_REPORT.md), Staff reports discrepancies and Coordinator reviews controlled outcome corrections. Ordinary open-period Staff date correction remains separate; unresolved discrepancies still block closure and later corrections preserve Original closure evidence. |
| Q24-Q27: communication and two different deadlines | Read the answers together with Q26's clarification: the Financial/Releasing Office communicates the payout/batch instruction verbally; the regular-payout cutoff can precede semester end, while the separate Unclaimed-DV limit is semester end. The earlier regular cutoff is not a confirmed missing DV control. [P04](../payroll/P04_UNCLAIMED_STIPEND_REPORT.md) documents the existing semester-end guard; no actual batch date or new request after that DV cutoff is approved. |
| Q28-Q29: timely request and delayed actual release | Q28 is an explicit, already confirmed requirements/implementation difference: the office permits continued processing and actual release after semester end for a request submitted on time; existing settlement controls block after semester end. Q29 supplies dated receiving-log/acknowledgment evidence for timely receipt. Preserve both the requested behavior and current guard for the later proposal. Do not reconfirm Q28, infer unlimited delay or treat receipt evidence as payment authority. Supporting authority/reference and any processing limits remain unresolved. |
| Q30: late recording of an earlier actual release | Dated signed release evidence, Coordinator review and written Financial/Releasing Office confirmation are required for the stated scenario. This is separate from Q28's later actual release. [P03](../payroll/P03_RECONCILIATION_CORRECTIONS_REPORT.md) and [P07](../payroll/P07_INDIVIDUAL_PAYMENT_REPORT.md) retain restricted reviewed handling and immutable closure; the additional written-confirmation requirement has not been verified in implementation. No unrestricted Staff write, reopening, unknown-date invention or new late-collection authority follows. |
| Remaining dependencies and lifecycle coverage | PB1 is substantially described but not closed merely by these answers; PB2 now has evidence/review requirements for Q30's scenario, not every closed/expired/unavailable-period case. [P06](../payroll/P06_DOCUMENT_GENERATION_REPORT.md) and [P10 readiness](../payroll/P10_OPERATIONAL_READINESS.md) still distinguish draft OR/DV prototypes from approved forms (PB6). Reporting, Administration and remaining cross-module handoffs still require questioning; leave/return conditions and earlier Q1/Q8 follow-ups remain open. |

**Outcome:** Retained Q28's confirmed material difference for the later requirements proposal. No additional critical financial, authorization or legal-policy contradiction was identified in this focused documentation review. No claim of full implementation coverage, policy/legal verification, operational acceptance or implementation approval is made. Existing controls and historical evidence remain unchanged. Coverage and issue documents remain initial mapping snapshots; current progress and review findings are recorded here. Next review: after 40 confirmed answers.

### Q31 — Source of approved individual-payment forms

**Status: Confirmed — B, 23 October 2026.** Module: Individual Payments / Official Documents; authority dependency PB6.

**Scenario / question:** How does Staff obtain the approved OR/DV format and signatory details for individual payments?

| Option | Available answer |
|---|---|
| A | The Financial/Releasing Office supplies the approved forms and instructions. **Recommended:** gives Staff a traceable source for the required format and signatories; this does not assume the handoff already exists. |
| B | The Coordinator supplies the office-approved copies and instructions. |
| C | Staff uses the most recent completed OR/DV as the reference. |
| D | Another procedure, or this has not been established — describe it. |

**Selected answer:** **B — The Coordinator supplies the office-approved copies and instructions.** User's exact reply: `b`.

**Confirmed operational rule:** Staff obtains the office-approved OR/DV copies and instructions, including the required format and signatory details, from the Coordinator. This establishes the form/instruction handoff, not who originally approved the forms.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the Coordinator-to-Staff handoff for individual-payment forms. No particular template, field mapping, signatory, implementation or financial action approved.

**Dependencies / unresolved authority:** Historical B17 and the P06/P10 records identify current DOCX adapters as drafts requiring office approval. Identifying a source does not itself approve those drafts or independently establish legal approval authority, official numbering, accounting values or named signatories. Preserve template provenance/version history; preparing or forwarding documents is not payment.

**Answer / conflict / supersession history:** Recorded B from the user's lowercase reply; the Financial/Releasing Office handoff recommendation was not selected. No critical contradiction identified within this handoff choice. PB6 remains open for actual form approval and mappings; supplying approved copies does not imply that the Coordinator alone has approval authority or that current draft adapters are approved.

### Q32 — Scope of the regular semester payment report

**Status: Confirmed — B, 23 October 2026.** Module: Reporting / Payment Reconciliation.

**Scenario / question:** For the regular semester payment report, what should the office receive?

| Option | Available answer |
|---|---|
| A | One consolidated report covering all payroll batches and individual payments, with scholar details and totals. **Recommended:** supports a complete semester reconciliation. |
| B | Separate reports for each payroll batch and for individual-payment activity. |
| C | Semester summary totals only, without scholar-level details. |
| D | Another report or arrangement — describe it. |

**Selected answer:** **B — Separate reports for each payroll batch and for individual-payment activity.** User's exact reply: `b`.

**Confirmed operational rule:** The regular semester payment-reporting arrangement uses separate reports for each payroll batch and for individual-payment activity. A single consolidated semester report is not the selected routine output; this answer does not prohibit other authorized reports.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the routine reporting arrangement. No report implementation or financial action approved; exact implementation coverage remains a later check.

**Dependencies / unresolved authority:** Historical B14 remains the implementation baseline: retain original payroll outcomes and later individual releases as separate facts, preserve Original/Updated history and avoid double-counting entitlements. Report scope does not change payment status, approve a release or establish an accounting-period rule for Q28's later releases. Do not assume exact implementation support or erase missing historical evidence.

**Answer / conflict / supersession history:** Recorded B from the user's lowercase reply; the consolidated-report recommendation was not selected. No critical contradiction identified within this reporting-scope choice. Separate report outputs do not change historical B14's preservation or distinct-entitlement accounting requirements.

### Q33 — Authorization to release reports to another office

**Status: Confirmed — custom answer with clarification A, 23 October 2026.** Module: Reporting / Office Records and Requested Reports.

**Scenario / question:** Before a report is sent to another office, who should authorize its release?

| Option | Available answer |
|---|---|
| A | The Coordinator, after reviewing it. **Recommended:** gives the official handoff a clear accountable reviewer. |
| B | Staff or Coordinator may release routine reports without separate approval. |
| C | Approval depends on the report and recipient — describe the arrangement. |
| D | Another procedure, or this has not been established — describe it. |

**Selected answer:** **Custom — Payment reports are kept as office records and are not routinely forwarded; the user mentioned a possible report request.** User's exact reply: `WE kept that as a record, but we don't forward it. Maybe when someone ask for a report`.

**Confirmed operational rule:** The Q32 per-payroll-batch and individual-payment reports are retained as office records, without routine forwarding to another office. When another office requests one of these payment reports, the Coordinator reviews the request and authorizes whether to provide it. A request alone does not authorize release.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Removes routine forwarding as an assumed office workflow. Preserve Q32's separate reporting arrangement and internal recordkeeping. No mandatory forwarding, new approval feature, permission change, report transmission or implementation approved.

**Dependencies / unresolved authority:** The assistant clarified before this reply that Q33 concerns Q32's payment reports: per-payroll Paid/Unclaimed outcomes, counts and amounts, plus individual-payment activity and outcomes. This does not cover every LDSS report, internal view, working export or layout correction. Preserve existing access controls, report history and permitted scope. Do not infer a new distinct-person rule, legal delegation, requester entitlement, recipient list or permission to send reports from this discussion.

**Answer / conflict / supersession history:** The user first asked which reports were meant; no answer was recorded for that question. Following the assistant's scope explanation, the user supplied the custom practice above instead of selecting A-D. The initial scenario assumed an outward handoff; the user corrected that assumption. The subsequent reply `a` selects clarification A for requested copies only. Preserve the initial question/options and custom reply; do not reinterpret this as routine forwarding or an unqualified selection of the original A. Q33 is complete and counted once. No critical financial, authorization or legal-policy contradiction identified within this recordkeeping/requested-copy scope.

**Q33 clarification:** When another office requests one of these payment reports, who decides whether to provide it?

| Option | Clarification choice |
|---|---|
| A | The Coordinator reviews the request and authorizes providing the report. **Recommended:** gives requested disclosure a clear accountable decision-maker. |
| B | Staff or Coordinator may provide routine requested reports without separate approval, within existing permissions. |
| C | It depends on the requesting office and report — describe the arrangement. |
| D | Another procedure, or this has not been established — describe it. |

**Clarification answer:** **A — The Coordinator reviews the request and authorizes providing the report.** User's exact reply: `a`. Recorded 23 October 2026. This concerns an actual request only; it does not create routine forwarding or authorize sending any report during this questionnaire.

### Q34 — Authorizing access for a new Staff user

**Status: Confirmed — B, 23 October 2026.** Module: Administration / User Access.

**Scenario / question:** When a new Staff member needs LDSS access, who should authorize it and arrange the account?

| Option | Available answer |
|---|---|
| A | The Coordinator authorizes access; the System Administrator creates the account with the approved role. **Recommended:** gives authorization and account setup clear owners. |
| B | The System Administrator both authorizes access and creates the account. |
| C | Another designated officer authorizes access; the System Administrator creates the account. |
| D | Another procedure, or this has not been established — describe it. |

**Selected answer:** **B — The System Administrator both authorizes access and creates the account.** User's exact reply: `b`.

**Confirmed operational rule:** The System Administrator handles both authorization of LDSS access and creation of a new Staff account with the appropriate Staff role. A separate Coordinator authorization step is not selected for this routine account-administration scenario.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the intended account-administration responsibility. No account creation, role assignment, permission change or implementation approved; exact implementation support is not verified by this discussion.

**Dependencies / unresolved authority:** Historical B18 preserves operational Staff/Coordinator authority and technical-only System Administrator access. Technical account setup does not itself authorize scholarship or payment decisions. This question does not appoint a Coordinator, grant broader permissions, approve an existing account or decide emergency access; retain current authorization and audit controls.

**Answer / conflict / supersession history:** Recorded B from the user's lowercase reply; the Coordinator-authorization recommendation was not selected. Account-access authorization is an administrative responsibility distinct from operational scholarship and payment decisions. No critical contradiction identified with historical B18 within this new-Staff-account scope; no operational decision permission is granted to a pure System Administrator.

### Q35 — Responsibility for backups and recovery

**Status: Confirmed — A, 23 October 2026.** Module: Administration / Backup and Recovery.

**Scenario / question:** Who should handle LDSS backups and coordinate recovery if records must be restored?

| Option | Available answer |
|---|---|
| A | The System Administrator handles backups and technical recovery; the Coordinator checks the restored office records before work resumes. **Recommended:** gives technical recovery and office validation clear owners. |
| B | The municipal IT office handles backups and technical recovery, with Coordinator validation. |
| C | Staff manages backups and arranges technical assistance when recovery is needed. |
| D | Another arrangement, or this has not been established — describe it. |

**Selected answer:** **A — The System Administrator handles backups and technical recovery; the Coordinator checks the restored office records before work resumes.** User's exact reply: `a`.

**Confirmed operational rule:** The System Administrator is responsible for LDSS backups and technical recovery. The Coordinator checks the restored office records before operational work resumes.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes backup/recovery responsibility and the technical-to-office validation handoff. No backup execution, database access, restore, configuration or implementation approved.

**Dependencies / unresolved authority:** Existing backup/recovery safeguards and preserved evidence remain unchanged. Responsibility alone does not establish backup frequency, retention, off-host storage, key custody, recovery targets or readiness of an actual backup. Do not infer permission for a live restore or loss of post-backup transactions; technical recovery and validation of office records remain distinct responsibilities.

**Answer / conflict / supersession history:** Recorded A from the user's lowercase reply. No critical contradiction identified within this responsibility assignment; technical recovery remains distinct from operational record validation. Existing recovery evidence does not prove that an actual backup or restored office dataset has been checked under this newly confirmed handoff.

### Q36 — Receiving documents during an LDSS outage

**Status: Confirmed — A, 23 October 2026.** Module: Administration / Continuity and Document Receiving.

**Scenario / question:** If LDSS is temporarily unavailable, how should Staff handle incoming scholarship documents?

| Option | Available answer |
|---|---|
| A | Receive them using a dated paper log, then enter them in LDSS after service returns. **Recommended:** preserves evidence of actual receipt while receiving continues. |
| B | Receive them using a temporary Excel log, then enter them in LDSS after service returns. |
| C | Suspend receiving until LDSS is available again. |
| D | Another procedure, or this has not been established — describe it. |

**Selected answer:** **A — Receive them using a dated paper log, then enter them in LDSS after service returns.** User's exact reply: `a`.

**Confirmed operational rule:** Staff continues receiving scholarship documents during an LDSS outage using a dated paper receiving log. Staff subsequently enters the received documents in LDSS when service returns, retaining evidence of actual physical receipt separately from the later entry timestamp.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the paper receiving fallback and later encoding handoff. No offline feature, implementation or operational action approved; exact support for later receipt encoding remains a later implementation check.

**Dependencies / unresolved authority:** Actual physical receipt and subsequent LDSS entry remain separate facts. Preserve receipt evidence and existing timing/approval controls for later encoding; do not fabricate earlier dates or assume fallback logging automatically satisfies every cutoff. This question does not establish offline document verification, eligibility approval or payment authority.

**Answer / conflict / supersession history:** Recorded A from the user's lowercase reply. No critical contradiction identified within this receiving fallback. Q12's truthful partial-receipt recording and the existing timing/approval controls still apply; an outage log does not automatically verify documents or override a cutoff.

### Q37 — Contacting scholars about missing semester requirements

**Status: Confirmed — A, 23 October 2026.** Module: Notifications / Academic Follow-up.

**Scenario / question:** How does Staff normally contact scholars about missing semester requirements?

| Option | Available answer |
|---|---|
| A | Contact each scholar by phone, text or messaging, and record the follow-up. **Recommended:** makes the reminder specific and traceable. |
| B | Use general group or public announcements; scholars contact the office for their outstanding requirements. |
| C | Ask school or barangay contacts to relay reminders. |
| D | Another procedure, or this has not been established — describe it. |

**Selected answer:** **A — Contact each scholar by phone, text or messaging, and record the follow-up.** User's exact reply: `a`.

**Confirmed operational rule:** Staff follows up missing semester requirements by contacting the affected scholar individually through phone, text or messaging and recording the follow-up. The answer does not require using every channel for each scholar.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes individual contact and follow-up recording in support of Q17. No notification integration, message transmission or implementation approved; exact support for follow-up records remains a later implementation check.

**Dependencies / unresolved authority:** Contact or acknowledgment of a reminder does not establish document receipt, verification, academic compliance or payout eligibility. No automated delivery, particular platform, new scholar portal or change to deadlines is inferred. Existing internal notifications are not assumed to provide this external follow-up workflow.

**Answer / conflict / supersession history:** Recorded A from the user's lowercase reply. No critical contradiction identified within this communication practice. Staff's contact does not resolve the outstanding requirement; Q12-Q14 and Q17 retain actual receipt, verification, academic review and escalation controls.

### Q38 — Starting a return review after temporary leave

**Status: Confirmed — A, 23 October 2026.** Module: Scholarship Standing / Return from Leave; follow-up to Q18.

**Scenario / question:** For a scholar returning from approved temporary leave, what should start the office's return review?

| Option | Available answer |
|---|---|
| A | A written return request and current enrollment evidence, submitted to Staff for Coordinator review. **Recommended:** documents the request and enrollment with a clear review handoff. |
| B | Current enrollment evidence only, submitted to Staff for Coordinator review. |
| C | Direct discussion with the Coordinator, who determines the required evidence for the case. |
| D | Another procedure, or this has not been established — describe it. |

**Selected answer:** **A — A written return request and current enrollment evidence, submitted to Staff for Coordinator review.** User's exact reply: `a`.

**Confirmed operational rule:** A scholar seeking to return from approved temporary leave submits a written return request and current enrollment evidence to Staff for Coordinator review. Submission starts the review; it does not itself approve the return.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the return-review entry point left open by Q18. No return decision, standing change, implementation or financial action approved; implementation coverage remains unverified by this discussion.

**Dependencies / unresolved authority:** A return request or enrollment evidence does not itself reinstate scholarship standing, publish membership or approve payout. Preserve the original leave decision, applicable conditions, status history and current academic/document/eligibility checks. This does not establish leave duration, an automatic right to return, a new admission requirement, retroactive benefits or an extended scholarship period.

**Answer / conflict / supersession history:** Recorded A from the user's lowercase reply. No critical contradiction identified within this request/evidence handoff. Q18's initial leave-request process remains separate; applicable leave duration and return conditions have not been supplied by either handoff answer.

### Q39 — Basis for leave duration and return conditions

**Status: Confirmed — B, 23 October 2026.** Module: Scholarship Standing / Leave Conditions; follow-up to Q18 and Q38.

**Scenario / question:** What determines the allowed leave duration and conditions for returning to the scholarship?

| Option | Available answer |
|---|---|
| A | An existing written scholarship policy or official instruction. **Recommended:** gives the office a consistent, traceable basis; this does not assume such a rule already exists. |
| B | The Coordinator determines and records the conditions for each case. |
| C | The office follows the school's approved leave period and return conditions. |
| D | Another basis, or this has not been established — describe it. |

**Selected answer:** **B — The Coordinator determines and records the conditions for each case.** User's exact reply: `b`.

**Confirmed operational rule:** The Coordinator determines and records the allowed leave duration and conditions for returning for each case, subject to applicable mandatory rules and existing formal standing controls. Q18 and Q38 remain the request/review handoffs.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes case-by-case Coordinator responsibility for leave duration and return conditions. No fixed duration or standard set of conditions was supplied. No leave policy, status change, implementation or financial action approved.

**Dependencies / unresolved authority:** Q18 and Q38 establish request/review handoffs, not substantive leave entitlement. Identifying a policy source or decision-maker does not supply the rule's actual contents or independently establish legal authority. Preserve mandatory academic restrictions, formal standing controls and history; do not infer automatic reinstatement, benefits during leave, retroactive payments or an extended scholarship period.

**Answer / conflict / supersession history:** Recorded B from the user's lowercase reply; the written-policy recommendation was not selected. This does not establish that no applicable written rule exists or authorize overriding one. No critical contradiction identified within this case-review scope; the actual case conditions and supporting authority remain separate from the confirmed operational responsibility.

### Q40 — Confirming semester calendar dates

**Status: Confirmed — C, 24 October 2026, Philippine time.** Module: Administration / Academic Calendar.

**Scenario / question:** Who confirms the semester start and end dates that LDSS should use?

| Option | Available answer |
|---|---|
| A | The Coordinator, using official calendars and office instructions. **Recommended:** gives the dates a clear operational owner and source. |
| B | Staff, using official calendars and office instructions. |
| C | The System Administrator, using official dates supplied to them. |
| D | Another arrangement, or this has not been established — describe it. |

**Selected answer:** **C — The System Administrator, using official dates supplied to them.** User's exact reply: `c`.

**Confirmed operational rule:** The System Administrator confirms the semester start and end dates used by LDSS using official dates supplied to them. This does not authorize independently choosing policy dates or extending a claiming period.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the calendar-confirmation responsibility and reliance on supplied official dates. No actual date or supplying authority was identified. No date, configuration, permission, financial-period or implementation change approved.

**Dependencies / unresolved authority:** Date confirmation is separate from technical entry, opening or locking a financial period and authorizing payment. Preserve Q26-Q29's distinction between regular payout, DV request cutoff and delayed release of a timely request. This question does not establish actual dates, resolve differing school calendars, change claimability or prove legal authority for an extension.

**Answer / conflict / supersession history:** Recorded C from the user's lowercase reply on 24 October 2026, Philippine time; the Coordinator recommendation was not selected. No critical contradiction identified within confirmation of supplied official dates. The existing Administrator configuration role is distinct from originating policy or granting financial exceptions. Q40 brings the total to 40 confirmed answers; the scheduled focused review follows.

### Focused consistency review — Q31-Q40

**Completed: 24 October 2026, Philippine time.** Reviewed these ten explicit answers against earlier decisions, historical B01-B19, the initial lifecycle mapping and targeted role/configuration, standing, receipt, backup and payment-report documentation. Only this decision log was changed. Reused the initial evidence baseline; no full inventory, baseline rehash, source-code analysis, tests, benchmarks, database queries, browser sessions or security scans were performed.

| Scope | Result / follow-up |
|---|---|
| Q31: approved form handoff | Coordinator supplies office-approved copies/instructions. [P06](../payroll/P06_DOCUMENT_GENERATION_REPORT.md) still identifies current adapters as drafts; this handoff does not approve those drafts, supply actual mappings/signatories or settle original approval authority. PB6 remains open at that boundary. |
| Q32-Q33: payment reports and requested copies | Separate per-payroll and individual-activity reports remain office records, without routine forwarding. Coordinator reviews requests before copies are provided. Preserve the custom Q33 answer and clarification A; this is not a universal approval requirement for every report view/export. [P08](../payroll/P08_RECONCILIATION_REPORTS_REPORT.md) retains distinct Original/Updated/settlement bases and entitlement accounting. Exact coverage of the selected report arrangement is not newly verified. |
| Q34: new Staff accounts | System Administrator both authorizes access and creates the account. [F02](../F02-delivery.md) documents audited local role administration, rather than a browser account editor, and preserves technical-only Administrator business access. The office answer grants no scholarship/payment decision authority to that role and does not prove a new provisioning interface exists. |
| Q35: backups and recovery | Administrator technical responsibility aligns with [F35](../F35-delivery.md); Coordinator validates restored office records before work resumes. The [recovery runbook](../F35-recovery-runbook.md) contains proposed targets and operator procedures, not newly confirmed questionnaire answers for retention, scheduling, off-host copies or key custody. No live recovery or operational readiness is certified. |
| Q36: outage receiving | Dated paper receipt evidence and later LDSS entry remain separate. [Receipt-evidence delivery](../LDSS_WORKFLOW_PHASE08_RECEIPT_EVIDENCE.md) distinguishes physical dates from recording timestamps and preserves original/replacement history. This supports the distinction, not proof that every outage-entry case is implemented; timing/approval controls remain, without automatic verification or cutoff bypass. |
| Q37: scholar follow-up | Individual phone/text/messaging follow-up with a record supports Q17. This does not equate to automatic external notifications or prove that current internal notifications support contact tracking. Receipt, verification, academic findings and eligibility remain separate. |
| Q38-Q39: return and leave conditions | Written return request/current enrollment evidence starts Coordinator review; duration and return conditions are determined and recorded per case. [F07](../F07-delivery.md) and the [workflow specification](../LDSS_WORKFLOW_PHASE03_SPECIFICATION.md) preserve formal standing, history and academic/eligibility controls. No fixed leave duration, automatic reinstatement, entitlement extension or authority to override mandatory policy has been supplied. |
| Q40: calendar confirmation | Administrator confirms official dates supplied to them. [F03](../F03-delivery.md) documents Administrator configuration of academic dates with validation and locks; confirmation from supplied dates does not originate financial policy, remove a lock or approve a claiming extension. Actual dates, their supplying authority and differing school calendars remain separate. |
| Earlier differences and remaining material handoffs | Q28's already confirmed timely-request/later-release difference remains for the later proposal, without reconfirmation or a change to current guards. Q1's entry-sequence difference, Q8's Registry check, Q30's additional written evidence and PB1/PB2/PB6 boundaries remain. The initial coverage map and [P05](../payroll/P05_OMITTED_SCHOLAR_REPORT.md) identify omission discovery/review as a remaining material handoff: Q20 answered partly ready batch timing, not how Staff investigates a missing scholar. Historical B11's routes are preserved, not treated as a new answer. |

**Outcome:** No additional critical financial, authorization or legal-policy contradiction identified within Q31-Q40. Forty answers do not by themselves establish complete lifecycle coverage; continue only with material unresolved office decisions. This focused documentation review does not establish full implementation support, legal authority, operational acceptance or permission to implement. Coverage and issue documents remain initial mapping snapshots; current progress and findings are recorded here. Next focused review: after 50 confirmed answers if the questionnaire remains necessary; stop earlier when material decisions are sufficient.

### Q41 — Initial review when a scholar is missing from a payroll

**Status: Confirmed — A, 24 October 2026, Philippine time.** Module: Payment Processing / Omitted Scholars.

**Scenario / question:** When a scholar reports being missing from a payroll, what should Staff do first?

| Option | Available answer |
|---|---|
| A | Check the scholar's records, eligibility and payroll/payment history, then record a supported omission. **Recommended:** establishes whether this is an omission or an existing payment/Unclaimed case. |
| B | Refer the report to the Coordinator for the initial investigation. |
| C | Ask the Financial/Releasing Office to investigate first. |
| D | Another procedure, or this has not been established — describe it. |

**Selected answer:** **A — Check the scholar's records, eligibility and payroll/payment history, then record a supported omission.** User's exact reply: `a`.

**Confirmed operational rule:** Staff initially investigates a reported missing payroll entry by checking the scholar's records, eligibility and payroll/payment history. Staff records an omission when the evidence supports it; a reported missing name alone is not enough.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the initial omission-investigation procedure left open by Q20's batch-timing answer. No omission record, entitlement, payroll change, implementation or financial action approved.

**Dependencies / unresolved authority:** A missing name alone does not establish eligibility or an unpaid entitlement. Preserve historical B11's later eligible editable same-semester payroll route and authorized OR + DV route when preparation is closed, with current source, approval and duplicate-payment safeguards. Recording an omission does not insert frozen membership, reopen preparation or equate omitted with Unclaimed.

**Answer / conflict / supersession history:** Recorded A from the user's lowercase reply on 24 October 2026, Philippine time. No critical contradiction identified within this investigation procedure. Historical B11's route and approval requirements remain; recording a supported omission does not itself approve inclusion or individual payment.

### Q42 — Authority to end semester payroll preparation

**Status: Confirmed — A, 24 October 2026, Philippine time.** Module: Payroll Preparation / Preparation Closure.

**Scenario / question:** Who authorizes the point when the office stops preparing further payroll batches for the semester?

| Option | Available answer |
|---|---|
| A | The Coordinator, after reviewing outstanding cases. **Recommended:** gives the preparation cutoff a clear operational owner. |
| B | The Financial/Releasing Office instructs the office to stop preparation. |
| C | Staff decides once routine preparation is complete. |
| D | Another arrangement, or this has not been established — describe it. |

**Selected answer:** **A — The Coordinator, after reviewing outstanding cases.** User's exact reply: `a`.

**Confirmed operational rule:** The Coordinator reviews outstanding cases and authorizes when the office stops preparing further payroll batches for the semester. This establishes preparation-closure responsibility, not a requirement to resolve every case before closure or permission to discard unresolved cases.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the office handoff for ending further semester-payroll preparation. No preparation closure, financial-period change, permission change or implementation approved.

**Dependencies / unresolved authority:** Ending preparation is distinct from closing an individual payroll, locking an academic/financial period or ending claiming. Preserve Q26-Q29's separate regular-payout and DV limits and the existing controlled routes for eligible omissions. No automatic OR + DV approval, reopened preparation, cancelled entitlement or blocked legitimate ongoing payment is inferred from this question.

**Answer / conflict / supersession history:** Recorded A from the user's lowercase reply on 24 October 2026, Philippine time. No critical contradiction identified within this preparation-closure responsibility. Q19's start instruction and Q42's closure authorization are separate answers; historical B11's controlled omitted-scholar routes and claiming safeguards remain unchanged.

### Q43 — Trigger for removing a departing Staff member's access

**Status: Confirmed — A, 24 October 2026, Philippine time.** Module: Administration / Account Offboarding.

**Scenario / question:** When a Staff member leaves or transfers out, what should trigger disabling their LDSS access?

| Option | Available answer |
|---|---|
| A | The Coordinator promptly notifies the System Administrator. **Recommended:** gives access removal a clear, timely handoff. |
| B | The System Administrator receives an official personnel/HR notice. |
| C | The System Administrator identifies the change during a periodic account review. |
| D | Another procedure, or this has not been established — describe it. |

**Selected answer:** **A — The Coordinator promptly notifies the System Administrator.** User's exact reply: `a`.

**Confirmed operational rule:** When a Staff member leaves or transfers out, the Coordinator promptly notifies the System Administrator to disable the departing member's LDSS access. This establishes the departure handoff; it does not delete the person's historical actor identity or records.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the routine offboarding notification/trigger. No account disabling, role revocation, permission change or implementation approved.

**Dependencies / unresolved authority:** Preserve the account's historical actor identity, audit and business records when access is removed. Existing authorization, session and revocation controls remain unchanged. Q34 established new-Staff-account responsibility, not this departure handoff. Temporary absence, reassignment of outstanding work and emergency access response remain separate; do not infer deletion or shared-account use.

**Answer / conflict / supersession history:** Recorded A from the user's lowercase reply on 24 October 2026, Philippine time. No critical contradiction identified within this departure-notification handoff. Q34's System Administrator account-administration responsibility remains; the Coordinator's notification does not grant operational decision authority to the Administrator or authorize any actual account change during this discussion.

### Q44 — Coordinator approval during temporary absence

**Status: Confirmed — A, 24 October 2026, Philippine time.** Module: Administration / Operational Continuity.

**Scenario / question:** When the Coordinator is temporarily unavailable, how does the office handle work requiring their approval?

| Option | Available answer |
|---|---|
| A | Keep it pending until the Coordinator returns. **Recommended if no acting arrangement exists:** preserves the confirmed approval responsibility. |
| B | A formally designated acting Coordinator handles it within their authorized scope. |
| C | The regular Coordinator reviews and approves remotely. |
| D | Another arrangement, or this has not been established — describe it. |

**Selected answer:** **A — Keep it pending until the Coordinator returns.** User's exact reply: `a`.

**Confirmed operational rule:** During temporary Coordinator absence, work requiring the Coordinator's approval remains pending until the Coordinator returns. This does not prevent Staff from continuing work already within their own authority.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Establishes the office's approval-continuity arrangement during temporary Coordinator absence. No delegation, account or role assignment, permission change, remote-access setup or implementation approved.

**Dependencies / unresolved authority:** Preserve each operation's existing approval and separation controls, including Q10's masterlist responsibility and Q21's Coordinator-only payroll approval. An acting arrangement requires its actual scope and authority to be established; this question does not grant that authority or permit shared accounts, proxy signatures or System Administrator business approval. Pending work does not itself change a cutoff or entitlement. Technical access and formal operational delegation remain separate.

**Answer / conflict / supersession history:** Recorded A from the user's lowercase reply on 24 October 2026, Philippine time. No critical contradiction identified within this pending-approval arrangement. Acting-Coordinator and remote-approval options were not selected; no substitute, new approval permission or extension of a deadline is inferred. Q43's departing-Staff handoff remains separate.

### Q45 — Remaining office workflows or recurring difficulties

**Status: Confirmed — A, 24 October 2026, Philippine time.** Module: Cross-module / Coverage Check.

**Scenario / question:** Is there an important office workflow or recurring problem that this questionnaire has not covered?

| Option | Available answer |
|---|---|
| A | No additional material workflow or recurring problem comes to mind. |
| B | There is another important workflow — describe it. |
| C | There is recurring repeated work, delay or confusion — describe it. |
| D | Both an additional workflow and a recurring problem — describe them. |

**Recommendation:** If something remains, give a concrete office example so it can be assessed without inventing a requirement. If nothing comes to mind, A is sufficient; no answer is assumed.

**Selected answer:** **A — No additional material workflow or recurring problem comes to mind.** User's exact reply: `a`.

**Confirmed meaning:** The user has no additional material office workflow or recurring problem to report at this point. This is a coverage-check response, not certification that the system has no defects or that every possible workflow has been implemented.

**Reason supplied by user:** Not supplied.

**Impact / potential implementation changes:** Supports a completion review using the recorded answers and existing coverage baseline. No feature, priority, implementation or operational action approved.

**Dependencies / unresolved authority:** This check does not establish complete implementation coverage, close PB1/PB2/PB6 or erase previously recorded differences and authority gaps. A reported difficulty must be distinguished from a confirmed technical defect and from a proposed solution. Do not turn minor cosmetics or engineering choices into additional office-policy questions. Any new material scenario receives only the necessary follow-up before the final cross-module gap and phased proposal.

**Answer / conflict / supersession history:** Recorded A from the user's lowercase reply on 24 October 2026, Philippine time. No critical contradiction identified in this coverage-check response. Existing differences, unresolved authority and implementation checks remain; no Q46 is opened merely to reach 50 answers.

### Completion review — Q41-Q45 and lifecycle coverage

**Completed: 24 October 2026, Philippine time.** Reviewed the remaining five answers against Q1-Q40, historical B01-B19, the existing [coverage map](COMPLETE_SYSTEM_WORKFLOW_COVERAGE.md), [issue register](COMPLETE_SYSTEM_WORKFLOW_ISSUES.md) and [P10 readiness assessment](../payroll/P10_OPERATIONAL_READINESS.md). Reused the initial evidence and earlier focused reviews. Only this decision log was changed. No new inventory, baseline rehash, source-code analysis, application test, benchmark, database access, browser session, security scan or operational action was performed.

| Scope | Result |
|---|---|
| Q41: omission investigation | Staff checks records, eligibility and payment history before recording a supported omission. This supplies the discovery handoff left open by Q20. Historical B11's routes remain reference requirements, not newly selected answers or automatic payment authority. |
| Q42: preparation closure | Coordinator reviews outstanding cases and authorizes ending further batches. This supplies the remaining H2 closure handoff; preparation closure, payroll closure, period locks and claiming limits remain distinct. |
| Q43-Q44: departure and absence | Coordinator notifies Administrator of departing Staff; Coordinator-only approvals wait during temporary absence. These complement Q34 without granting Administrator business authority, deleting actor history, creating an acting role or changing per-operation separation. |
| Q45: coverage check | No additional material process or recurring problem was reported. This does not prove absence of defects or certify every implemented path. |
| Lifecycle A-L in the initial map | Intake/Registry Q1-Q9; Masterlist Q10-Q11; academic documents and follow-up Q12-Q17/Q36-Q37; standing/graduation/leave Q14-Q16/Q18/Q38-Q39; Payroll Q19-Q21/Q42; payment recording and individual cases Q22-Q31/Q41; Reporting Q32-Q33; Administration/recovery/calendar Q34-Q36/Q40/Q43-Q44. Rollover Q9 and continuity/follow-up are included. This is decision coverage, not a claim that every implementation or legal dependency is resolved. |

**Outcome:** No additional critical financial, authorization or legal-policy contradiction identified in Q41-Q45. Q28 remains the explicitly confirmed requirements/implementation difference, without reconfirmation or a guard change. The material office interview is sufficient for a scoped proposal; stop at 45 rather than create questions to reach another batch review. The remaining unknowns can be stated as targeted verification or authority/readiness dependencies before the affected work. No Q46 is opened. Coverage and issue documents retain their initial-snapshot status; this log records current completion and the proposal.

## Final cross-module gap analysis and prioritized phased proposal

**Prepared: 24 October 2026, Philippine time. Status: Proposed work only; implementation and operational activation are not approved.** Forty-five explicit answers establish the office workflow described above. They do not replace statutory authority, approve existing draft forms, certify implementation parity or authorize P11. The historical B01-B19 baseline and current controls remain in force unless a separately approved change is made. Earlier reviews and the original evidence index remain the technical basis; the following is a requirements synthesis, not a new technical audit.

### Cross-module findings

| Area / new answers | Confirmed office intent | Gap or later verification |
|---|---|---|
| Intake and first registration: Q1-Q6 | Enter after selection from an approved paper/Excel list; reviewed group import is routine; missing details remain truthful; duplicate resolution precedes a new permanent ID. | Q1 differs from the earlier applicant qualification journey in [F06](../F06-delivery.md). Check whether the existing approved paths can register a selected person without fabricating exam/qualification events or bypassing admission checks. Names-only import support is not certified by these answers. The selection list's originating approval authority remains unspecified. |
| Registry and rollover: Q4/Q6-Q9 | Reuse permanent identities; Staff/Coordinator can update routine contact details with history; default to current-year linkage; review prior-year scholars before confirming continuation. | Check current-year linkage rather than registration-year filtering. Preserve historical years and reviewed continuing participation; do not create a second identity or infer academic progression or current membership from last year's roster. [F04](../F04-delivery.md) and [continuing onboarding](../LDSS_WORKFLOW_PHASE05_CONTINUING.md) are the comparison basis. |
| Masterlist: Q10-Q11 | Coordinator authorizes official publication; publish the ready group and use controlled additions for the rest. | Retain [F11](../F11-delivery.md)/[F12](../F12-delivery.md) approval, amendment and frozen-version controls. Verify the selected workflow using existing functions before proposing changes; incomplete details, annual membership and semester payout compliance remain separate. |
| Documents, academics and follow-up: Q12-Q15/Q17/Q36-Q37 | Record partial receipts, verify actual documents, escalate academic concerns, review placement requests, use paper receipt evidence during outages and record individual follow-up. | Check operational support for later outage encoding and follow-up records; neither is automatically supplied by internal notifications. Preserve current COR/prior completed-semester COG coverage, source history, timing and mandatory academic restrictions. No receipt, contact or referral itself resolves compliance. |
| Standing, leave and graduation: Q16/Q18/Q38-Q39 | Official school evidence confirms graduation; written leave/return requests go through Staff to Coordinator; leave duration and return conditions are recorded per case. | Verify request/decision/history coverage within existing standing controls. No fixed leave rule, automatic reinstatement, benefit during leave or scholarship extension was supplied. Applicable mandatory policy and actual case authority remain dependencies; preserve valid final-semester entitlements. |
| Payroll preparation and omissions: Q19-Q21/Q41-Q42 | Coordinator starts and ends preparation; either operational role may prepare/review, only Coordinator approves; prepare eligible scholars while following up others; Staff investigates reported omissions. | Verify handoff clarity and existing preparation controls. Preserve automatic eligible candidates, fresh source checks, locked membership and B11's eligible later same-semester editable payroll before authorized OR + DV when preparation is closed. Do not add a universal distinct-person rule or infer that closure resolves outstanding cases. |
| Payment evidence and corrections: Q22-Q23/Q30 | Returned payroll supports actual outcomes/dates; Staff reports discrepancies; Coordinator reviews controlled outcome corrections. Q30's late-recording scenario additionally needs signed release evidence and written Financial/Releasing Office confirmation. | Verify the additional written-confirmation requirement and scope of restricted handling. Preserve ordinary open-period Staff date authority, Original closure, post-closure reporting and duplicate-payment safeguards. Q30 is not permission for later actual release or unrestricted expired-period writes. |
| Individual payments and forms: Q24-Q29/Q31 | Regular payout and DV request limits differ; DV requests use semester end. Timely requests can proceed to later actual release, supported by dated receipt evidence. Coordinator supplies approved form copies/instructions. | **Q28 is a confirmed difference:** current settlement blocks release after semester end. PB1's controlling authority and processing limits remain unresolved. PB6 still needs actual approved formats, mappings, numbering/accounting sources and signatories; current adapters remain drafts. Preserve B11's DV-only Unclaimed route and all actual-release/cancellation protections. |
| Reporting: Q32-Q33 | Separate batch and individual-activity reports stay as office records; Coordinator authorizes requested copies for another office. | Verify existing outputs and requested-copy practice. Preserve [P08](../payroll/P08_RECONCILIATION_REPORTS_REPORT.md) Original/Updated/settlement distinctions and unique-entitlement accounting. No mandatory consolidated report, routine forwarding or universal approval for internal views/exports is requested. |
| Administration and continuity: Q34-Q36/Q40/Q43-Q44 | Administrator authorizes/creates Staff accounts, handles technical backup/recovery and confirms supplied official dates; Coordinator validates restored records and initiates Staff offboarding; approvals wait during Coordinator absence. | Existing local account administration is not proof of a missing browser editor. Actual dates/supplying authority, backup retention/off-host storage/key custody, recovery objectives and witnessed recovery remain readiness dependencies. No policy date, substitute approver or new business permission for Administrator is established. |

### Priorities and evidence classifications

**Critical:** No new critical financial-integrity or authorization defect was demonstrated by this requirements review. This is not a system-wide safety certification. The inherited dependency advisories include critical severity ratings; exploitability and current exposure have not been assessed here.

The priorities below order proposed work. An implementation check is not a confirmed missing feature; an authority dependency is not a code defect. Referenced D/E/T/S/L identifiers belong to the initial issue register, which remains unchanged.

| ID / priority | Classification and basis | Proposed disposition |
|---|---|---|
| G01 — High | **Confirmed requirements/implementation difference:** Q28-Q29; PB1/L01. Timely DV requests may reach actual release after semester end; current settlement blocks it. | Define the supported timely-request evidence, governing authority and processing limits, then propose a narrowly scoped change. Preserve the original entitlement, all other checks and acknowledged actual release; never use a blanket calendar extension. |
| G02 — High at affected restricted cases | **Confirmed evidence requirement plus unresolved scope/parity:** Q30; PB2/L02. | Check signed release evidence, Coordinator review and written Financial/Releasing Office confirmation for the stated late-recording case. Resolve other closed/expired/unavailable-period cases separately only if needed; do not reopen ordinary Staff date authority or Original closure. |
| G03 — High before official form use | **Unresolved official approval:** Q31; PB6/L03. | Obtain the approved copies/instructions through the confirmed Coordinator handoff and verify actual mappings/signatories/accounting sources. Prototype implementation does not establish official approval. |
| G04 — Medium; High if actual post-selection registration is blocked | **Workflow sequencing difference / implementation check:** Q1-Q6; E03. | Validate supported registration/import from the approved selected list without fictional upstream events. Make only the changes demonstrated necessary; do not add application/exam/interview modules from older proposals. |
| G05 — Medium | **Implementation check:** Q8-Q9 current-year Registry view and reviewed continuation. | Confirm annual linkage and historical access; adjust only a proven gap. Preserve permanent identity, unknown facts and publication/eligibility separation. |
| G06 — Medium; raise for a demonstrated essential-workflow blocker | **Implementation checks:** Q12-Q18/Q36-Q39; E06. | Verify receipt, academic/placement referrals, follow-up and leave/return case records through existing paths. Distinguish an absent function from an unclear operator handoff; no reminder integration or policy exception is preapproved. |
| G07 — Medium | **Operational acceptance / parity checks:** Q19-Q23/Q41-Q42. | Verify preparation start/closure, review/approval, omission investigation and evidence-based recording with existing controls. Preserve B09's reviewed bulk recording and B11's routes rather than redesign settled operations. |
| G08 — Medium | **Report/access practice check:** Q32-Q33; E04. | Verify separate office records, actual requested-copy authorization and report bases. No automatic external transmission or new universal export approval feature is assumed. |
| G09 — High before operational activation | **Operational readiness:** Q35; S03 and coverage J2. Q34/Q40/Q43-Q44 supply administrative responsibilities, not proof of readiness. | Assign the remaining operational details and incident escalation, agree recovery objectives, off-host retention and key custody, and demonstrate a witnessed restore with Coordinator record validation. Keep credential/key values out of these documents. |
| G10 — High at relevant workload/growth | **Inherited technical investigation:** T01-T05 and P10 Home/full-detail latency, memory, finalization evidence limits, backup/storage growth and sustained LAN capacity. | Scope profiling and target-host load/recovery work separately before activation. Preserve R01-R07, authoritative financial checks, full evidence and current bounds; no cache, heap, schema or limit change follows from the questionnaire. Historical measurements are not current benchmarks. |
| G11 — High review priority | **Inherited security investigation:** S01, seven pre-existing advisories including two critical in P10. | Assess current versions and runtime/build exposure in a separately authorized task, then target remediation and validation. No claim of an exploit, harmlessness or completed fix is made here. |
| G12 — Medium | **Documentation/evidence qualification and technical candidates:** D03/D04, S02, T06, E01/E02. | Clarify conflicting historical descriptions without rewriting history; retain the missing transcript and grant-baseline qualifications. Review repeated permission reads and usability candidates only against actual freshness/access/task needs. Do not invent historical Q numbers or an account-editor requirement. |
| G13 — Low | **Previously observed visual defects:** D01 duplicated Reports heading and D02 narrow placeholder truncation. | Group small presentation fixes after higher-priority work. Preserve readable values/actions and verify the affected layouts if changes are separately approved; no further office-policy questionnaire is needed. |

### Proposed phases and completion evidence

| Phase | Proposed scope / order | Evidence needed before proceeding |
|---|---|---|
| **1 — Reconcile requirements and affected authority** | Build a targeted Q-to-existing-function matrix for the checks above, recording supported, partial, missing or unverified status with specific evidence. Resolve PB1 authority/processing limits, PB2's affected evidence scope and PB6's actual forms before their dependent changes. Preserve Q28's already confirmed intent. | A bounded change proposal showing which gaps actually require software work, applicable office references and acceptance examples. This phase does not require a repeated whole-source inventory or another arbitrary question round. New questions arise only for a genuinely blocking ambiguity. |
| **2 — Address approved High-priority gaps and readiness risks** | Prioritize G01-G03 and the relevant G09-G11 investigations under separately approved scopes. Implement a financial-boundary change only after its dependencies and acceptance criteria are established. Evaluate performance/capacity, dependency exposure and disaster recovery before deciding readiness. | For Q28: timely request and later actual release supported, new late requests still controlled, duplicate/effective-route and immutable-history protections intact. For Q30: actual date versus entry time and required evidence/review retained. For forms: approved content/version renders correctly without inventing official values. Technical risks need measured, scoped evidence and an explicit disposition. None of this activates a financial feature. |
| **3 — Align only verified workflow gaps** | Address G04-G08 and administrative handoff/documentation gaps that Phase 1 proves necessary. Use existing functions where adequate. Group G12/G13 cleanup after essential work; do not add a portal, browser account editor, automated messaging, new approval layer or reporting product without a demonstrated requirement. | Representative scenarios show selected-list entry/duplicate review, annual rollover, controlled publication/additions, partial/outage receipt, academic/placement escalation, leave/return/graduation, eligible batches/omission handling, payment discrepancies and separate office reports. Staff retains routine authority; Coordinator approvals remain distinct and pending during absence. |
| **4 — Office acceptance and a separately authorized release** | Named Staff/Coordinator review the complete office handoffs, actual official forms, reporting and exception handling; Administrator demonstrates provisioning/offboarding and recovery responsibilities. Train the distinctions recorded in this log. Assess readiness against resolved High-priority items and the remaining explicit qualifications. | Office acceptance is distinct from historical synthetic P10 success. Any future release needs its own approval, reviewed package/canonical baselines, fresh verified backup, agreed maintenance window and controlled updater process. P11, deployment, permission changes and each feature activation require their own explicit authorization; they are not started by this proposal. |

### Preserved controls and unresolved boundaries

- Retain one permanent identity and one full approved stipend per scholar/semester/benefit, fresh eligibility/source checks, exclusive routes, actual-release evidence, locks, transactions, exact retries, audit/history, immutable Original records and current per-operation approval rules. No generic waiver or Administrator role erases mandatory academic or financial restrictions.
- Keep regular-payout cutoff, DV request deadline, timely receipt, preparation closure, payroll closure, period locks, actual release and recording time separate. Q28 is scoped requirements intent, not permission for new late requests, unlimited delay, another benefit, reopening or backdating.
- Preserve graduation/final-semester protections, reviewed continuing history and honest unknown grades/placement. No fixed leave duration, automatic return or missing legal provision has been invented. Non-degree benefits and older committee/interview proposals are not added to scope without an actual requirement.
- Remaining authority/readiness dependencies include PB1/PB2/PB6 at their stated boundaries; the selection list's originating approval authority; supplied calendar dates and their source; applicable mandatory policy and case authority; operational backup/retention/key custody/recovery objectives and sign-offs. These are not silently closed by Q45, and they need not block unrelated verified improvements.
- This review changed only this decision log. Initial coverage/issue registers remain historical mapping snapshots. Current code/configuration, financial periods, data, permissions and feature flags were not changed or inspected operationally; P10 records the individual flags as disabled, and no activation is authorized here. No new UAT, security scan, benchmark, database inspection or full implementation certification is claimed.

**Completion:** The questionnaire ends with 45 confirmed answers and this reviewable proposal. No answer or implementation approval is assumed for any proposed improvement. The next implementation scope must be chosen and explicitly authorized separately; no further action is automatically started.

## Archived pre-restart prompt — former Q104

**Status: Unanswered; withdrawn from the active queue after the numbering correction.** Module: Individual Payments / Payment Recording; authority dependency PB1. Retained as history only. It is not new Q1 and is not awaiting a second simultaneous answer.

**Scenario:** A scholar's original stipend is Unclaimed. Staff must determine whether the Financial/Releasing Office still allows claiming before preparing the DV. The Financial/Releasing Office's ownership is already agreed. Current code uses the configured semester end and blocks missing/expired periods; the authoritative office instruction available to Staff is not identified in the repository.

**Question:** Before Staff prepares an Unclaimed stipend's DV, how does the Financial/Releasing Office currently tell your office whether claiming is still allowed?

| Option | Available answer |
|---|---|
| A | A written notice or instruction for the relevant payout/batch. **Recommended:** gives Staff one traceable source and avoids guessing. This recommendation does not imply that such a notice currently exists. |
| B | A verbal instruction giving the claiming date for the relevant payout/batch. |
| C | Case-by-case confirmation from the Financial/Releasing Office for each scholar's request. |
| D | Another procedure, or no established instruction yet — describe the actual practice. |

**Selected answer:** Not supplied.

**Confirmed operational rule:** No answer was received. B15 records historical Financial/Releasing Office ownership; it is not a new-questionnaire answer.

**Reason supplied by user:** Not supplied.

**Impact on existing workflows:** To be determined from the answer. Do not change Staff authority, routes, financial periods, source checks or payment decisions while discussing it.

**Potential implementation changes:** None approved. A later proposal may need a clear reference to the office's instruction or a route for unresolved cases; do not design a new calendar/approval step merely from this question.

**Dependencies / unresolved authority:** Actual source, scope and authority of any claiming instruction; its relationship to the existing semester-end guard; any effect of a timely request after a cutoff. Q104 asks only how the instruction is communicated. It does not decide dates, late collection rights or exceptions. These narrower follow-ups are not answered or preapproved.

**Answer / conflict / supersession history:** No answer was received. The user's numbering correction replaces this prompt with the Intake and Registration Q1 above. The claiming topic remains on the lifecycle checklist for later review; no future question number or answer is assigned.
