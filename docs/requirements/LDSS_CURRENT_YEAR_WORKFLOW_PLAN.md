# LDSS current-year workflow plan

24 October 2026, Philippine time. **Planning only; no implementation, migration, data operation, flag change, P11 or deployment is authorized.** This is the evidence and requirements anchor for the seven-document integrated plan. The latest user request supplements the completed questionnaire; it does not create Q46 or retrospectively alter Q1–Q45.

Companion plans: [annual classification/rollover](LDSS_ANNUAL_CLASSIFICATION_AND_ROLLOVER_PLAN.md), [graduation](LDSS_GRADUATION_MONITORING_PLAN.md), [UI/UX](../uiux/LDSS_INTEGRATED_UI_UX_SIMPLIFICATION_PLAN.md), [performance](../performance/LDSS_OPTIMIZATION_ROADMAP.md), [batch backlog](LDSS_INTEGRATED_ENHANCEMENT_BACKLOG.md), [phases and acceptance](LDSS_PHASED_IMPLEMENTATION_PLAN.md).

## Authority and evidence

| Category | Treatment in this plan |
|---|---|
| Confirmed new office requirement, N01–N12 below | Expressly supplied in the current attached request; business intent confirmed, implementation not authorized |
| Confirmed questionnaire answer | [Q1–Q45](COMPLETE_SYSTEM_WORKFLOW_DECISIONS.md); retain custom answers and clarifications |
| Historical approved requirement | B01–B19 in that decision log; preserve their scope and later specific decisions |
| Implemented behavior | Current dirty-worktree source and later accepted delivery reports; Git HEAD is not the baseline |
| Implementation proposal | All new endpoints, schemas, UI arrangements and performance work below; separately approvable |
| Unresolved authority | PB1/Q28, PB2/Q30, PB6, actual office references and substantive policy remain explicit; neither a recommendation nor a code guard supplies legal authority |

Required files were available. The UI guide is at **`C:/Users/ADMIN/Downloads/LDSS_CODEX_UI_UX_GUIDE.md`**, not the repository root. R01's report is [output/r01-registry-20261021/REPORT.md](../../output/r01-registry-20261021/REPORT.md); R02–R07 are in `docs/performance`. The original screenshot ZIP was not found at the checked Downloads path; the existing [167-screen inventory](../audits/LDSS_COMPLETE_UI_SCREENSHOT_INVENTORY.md), [visual assessment](../audits/LDSS_UI_UX_VISUAL_REVIEW.md) and their saved image links are available. No contents of an absent original ZIP, ordinance or historical Q1–Q103 transcript are reconstructed.

Read the [initial coverage](COMPLETE_SYSTEM_WORKFLOW_COVERAGE.md), [issue register](COMPLETE_SYSTEM_WORKFLOW_ISSUES.md), [gap analysis](LDSS_COMPLETE_GAP_ANALYSIS.md), [earlier backlog](LDSS_PRIORITIZED_IMPLEMENTATION_BACKLOG.md) and [targeted plan](LDSS_TARGETED_ENHANCEMENT_PLAN.md) as dated records. Their initial questionnaire status and default-disabled/local-blocker statements are not current completion claims. This plan consolidates them without editing their history.

| Evidence ID | Accepted reference and current implication |
|---|---|
| E1 | [Decision log](COMPLETE_SYSTEM_WORKFLOW_DECISIONS.md): 45 answers, B01–B19, Q28 intentional requirements/implementation difference; no new questionnaire needed |
| E2 | Earlier three requirements documents above: verified gaps, UG01–UG24, B-O/B-U/B-F/B-P/B-S identifiers retained in the new backlog |
| E3 | [V1/V2 investigation](../testing/LDSS_TWO_BATCH_BLOCKER_ANALYSIS.md) and [fix proposal](../testing/LDSS_TWO_BATCH_FIX_PLAN.md): original wrong-root/source and cutoff limitations are historical. [Implemented multi-batch report](../testing/LDSS_HISTORICAL_MULTI_BATCH_IMPLEMENTATION_REPORT.md): independent historical source ownership now supported, with date/evidence limits retained |
| E4 | [Individual activation report](../testing/LDSS_LOCALHOST_INDIVIDUAL_PAYMENTS_ACTIVATION_REPORT.md): four individual flags enabled only in owned loopback UAT; original 3011 remains 800/200 Pending; separate 3012 copy has four original Unclaimed and three later individual Paid |
| E5 | [Maintenance report](../maintenance/LDSS_LINT_TYPESCRIPT_CLEANUP_REPORT.md): 206 lint/six TS issues resolved; normal build, lint/typecheck and 603 tests passed. E4 reconfirms clean checks; these errors are completed work, not new backlog |
| E6 | [P10 integration](../payroll/P10_INTEGRATION_UAT_REPORT.md) and [readiness](../payroll/P10_OPERATIONAL_READINESS.md): accepted P01–P10 functionality, historical 81-suite gate, operational/form/policy/capacity qualifications |
| E7 | R01–R07 reports, E3 loading evidence, E4 regressions: preserve bounded reads, request-local reuse and fresh write checks; historical timings are not current measurements |
| E8 | Available screenshot guide and visual inventory/review: layout evidence and recommendations, not independent policy or present WCAG certification |

## Confirmed office clarifications

| ID | Confirmed requirement | Implementation boundary |
|---|---|---|
| N01 | Digital scholarship recordkeeping begins with the current working academic year; the user identifies AY 2026–2027 and an ongoing first semester | Resolve actual working context from existing configuration. Do not rename synthetic `TWO-BATCH-YEAR` or assert an operational database inspection occurred |
| N02 | Continuing beneficiaries can enter directly this year without reconstructed pre-LDSS years; legitimately stored earlier history remains | Preceding-semester COG and other current eligibility evidence still apply |
| N03 | New/Continuing is academic-year-specific; New means first selected that year, Continuing means prior beneficiary confirmed for that year | Permanent identity, college entrant category, standing, admission, membership and payment are different facts |
| N04 | Manual Add Scholar needs a required New Scholar/Continuing Scholar choice near its annual context | Current API does not accept this field; plan a validated annual write, not an unsupported select or permanent person column |
| N05 | Mixed-classification imports and two simple processed/incomplete descriptions are required | Mixed imports exist; the two review labels do not. Staff describes scope, Coordinator alone accepts applicable prior-review evidence |
| N06 | Unknown school/course/year level and optional personal details may remain unknown at initial registration | Completeness for annual publication and payout remains separately enforced; later completion cannot rewrite frozen placement |
| N07 | Next-year continuation is reviewed, not universal calendar automation | Existing year advance already prepares some Continuing rows; reconcile it explicitly before replacing behavior |
| N08 | Registry has All Scholars, Continuing Roster and Graduation Monitoring | Reuse existing Registry shell/two links; no separate application module |
| N09 | Potential graduation uses current placement plus authoritative program duration | Fixture duration constants/course names are not production duration evidence |
| N10 | Expected/delayed monitoring requires supported review; Graduated is the existing formal standing decision | No monitoring action changes status, eligibility, membership, entitlement or payment automatically |
| N11 | Several current-semester payroll batches may mix New/Continuing; plan a separate 3–5 batch UAT | Actual office count is approximately 3–5 and unverified. Do not invent real batch records, dates or overlapping-window exceptions |
| N12 | Simplify existing screens; investigate measurable performance, accessibility, security and readiness | Retain React/Bootstrap/dark green, source scopes, limits, R01–R07 and P01–P10 safeguards; no speed/security certification from this planning |

## Office lifecycle and source ownership

1. **Register selected people.** Staff receives the approved selection list (Q1–Q3); search/duplicate review first, reuse a confirmed existing identity, otherwise assign one permanent ID. Capture current-year New/Continuing and real source reference. Unknown personal/academic facts stay absent. This records intent/provenance, not a new admission decision.
2. **Establish this year's participation and placement.** New selection and accepted continuing-baseline/annual-review evidence follow their applicable existing paths. Do not force continuing beneficiaries through fictional exams or earlier-year annual records. Placement completion/correction uses academic workflows and published-version protections.
3. **Prepare/publish the annual Masterlist.** Both classes may be members. Coordinator publication and existing per-operation separation remain. Publish ready scholars; later approved additions preserve earlier versions. Multiple payroll source groups do not create multiple annual scholarship programs. A published version, a group contribution and a consolidated current view must be labelled distinctly; do not assume all published lists are disjoint or sum version counts as unique people.
4. **Receive/review semester evidence.** Current COR, preceding completed-semester COG or supported entrant alternative retain real coverage. Receipt, verification, timeliness and academic assessment remain separate. Partial/outage receipt and individual follow-up follow Q12/Q36/Q37. Academic concerns go to Coordinator; no automatic termination or generic waiver.
5. **Record already processed groups.** Staff identifies **Already Processed — Requirements Previously Checked** with the actual import/semester/reference. Coordinator reviews current coverage and exceptions through `PriorBatchApproval`. Previously accepted review removes repetitive ordinary checks only for covered current evidence. **Requirements Still Incomplete** remains pending. Selection approval and physical receiving toggles are not substitutes for prior COR/COG review.
6. **Prepare same-semester payrolls.** One cycle/mapping, each batch's actual confirmed source, publication evidence, current scoped prior approvals and supported dates. Each finalization reserves only its own eligible entitlement scope. Do not create another cycle or fabricate an omission to fit another import. Historical overlapping windows or unknown required reported batch release remain unsupported, even if the real office processed those groups.
7. **Record outcomes and reconcile.** Q22 returned-payroll evidence supports actual outcomes/dates. External processing or batch-level reported release is not individual Paid. Use reviewed recording, actual acknowledgment, returned verification, discrepancy/correction and immutable Original closure. Eligibility is rechecked where current commands require it.
8. **Handle individual routes.** Unclaimed uses actual request → DV only. Eligible omitted uses a later editable same-semester payroll first, then Coordinator-authorized OR + DV when preparation is closed. Documents Ready/Forwarded remain unpaid. Preserve personal/representative attestations, exclusive routes and original versus later settlement facts.
9. **Monitor graduation and the next year.** Supported monitoring feeds human review, never standing/payment automation. Review unresolved candidates in rollover; retain final-semester benefits and existing graduation corrections. Only reviewed continuation establishes the new year's participation; previous-year New stays New historically.

### Three different annual scopes

`scholars.academic_year_id` is the person's first-entry/identifier year. `scholar_intakes.academic_year_id` is supplied annual intake context. `scholarship_records.academic_year_id` is the annual admission/participation record. Current `scholarshipYearId` filtering in `server/scholars/service.ts` checks **only the third**. It therefore cannot yet prove that every newly registered, incomplete current-year person is visible. B1 must test these cases before making a default claim; A1/A5 must establish truthful annual registration linkage. Never solve that gap by changing permanent first-entry year or inventing membership.

## Complete questionnaire traceability

Test families T01–T12 are specified in the [phased plan](LDSS_PHASED_IMPLEMENTATION_PLAN.md). Source paths below are current inspected implementations; a mapping is not a statement of full parity. Historical B references remain requirements, not answers. Rows distinguish new work from existing safeguards to preserve.

| Decision | Confirmed intent / related N and historical basis | Current source / parity or gap | Proposed batch → future acceptance / existing evidence |
|---|---|---|---|
| Q1 | Post-selection first entry; N01/N02; B01/B02 | `scholars/service.ts`, `qualification/service.ts`; earlier applicant capability remains | A1/A3 → T01; E1/E2 |
| Q2 | Approved paper/Excel selection list; B01 | `imports/service.ts`; list-origin authority not independently supplied | A1/A2 source reference → T01/T02; E2 |
| Q3 | Names-only initial registration; N06; B02 | `scholars/validation.ts` allows absent optional details; approved simple import restricts placement | A5 → T01/T02; E2 |
| Q4 | Resolve duplicates/reuse identity; B02 | `scholars/duplicates.ts`, importer preview | A1/A2 preserve → T01; E4/E5 |
| Q5 | Reviewed Excel group entry preferred; N05 | `imports/{workbook,service}.ts`; mixed support already exists | A2 → T02; E3 |
| Q6 | Permanent ID after duplicate review; B02 | `scholars/service.ts` sequence/id transaction | A1 preserve → T01/T04; E5 |
| Q7 | Staff/Coordinator audited contact updates | `scholars/service.ts`; not general authority to change placement/classification | B4 preserve → T01/T10; E2 |
| Q8 | Working-year-linked default; N01; B02 | `ScholarsPage.tsx` defaults empty; annual predicate excludes some initial registrations | B1 with A1/A5 visibility contract → T03; E2 |
| Q9 | Review prior roster then continue; N07; B03 | `configuration/rollover.ts` auto-prepares qualifying annual rows; baseline roster is one-time participation | A4 reconcile → T04; E1/E2 |
| Q10 | Coordinator annual publication; B07 | `masterlists/workflow-service.ts`; existing submitter/approver separation retained | B4/A3 preserve → T02/T07; E6 |
| Q11 | Publish ready, controlled additions; B07 | `masterlists/amendment-service.ts`, publication history | B4 → T02/T07; E3 |
| Q12 | Truthful partial receiving; B04 | `requirements/receipt-service.ts`, `receipt-evidence.ts`, semester receiving | A5/B4 preserve → T02; E2/E6 |
| Q13 | Routine verification by Staff/Coordinator; B04/B18 | `requirements/workflow-service.ts`, prior approval authority distinct | A2/B4 preserve → T02/T09; E6 |
| Q14 | Staff findings → Coordinator review; B05 | `continuing/semester-compliance.ts`, generic standing requests; dedicated referral parity partial | A3 evidence mapping/B4 → T06; E2 |
| Q15 | Placement request before approved change; B05/B07 | `academic/changes-service.ts` controlled decisions | A5/A6 preserve → T05/T06; E2 |
| Q16 | Official school evidence before Graduated; N10; B05 | `status/service.ts`, `status/graduation.ts`; typed evidence mapping needs review | A6 → T06; E2 |
| Q17 | Targeted follow-up/escalation; B04/B05 | Registry issue links, `notifications`, receiving; no automatic clearance | B2/B4 → T10; E2 |
| Q18 | Written leave request to Staff for review; B05 | Generic `status` request/reference; no new leave entitlement | A3 mapping/B4 → T06; E1/E2 |
| Q19 | Coordinator starts preparation; B18 | `payouts/submission-service.ts`, cycle/window operations distinct | B3 preserve → T07/T08; E3/E6 |
| Q20 | Eligible group now, later authorized batch where available; B08/B11 | Managed automatic candidates and windows | A2/C4 preserve → T07; E3 |
| Q21 | Either prepares/reviews; only Coordinator approves | `ovr/service.ts`, existing per-operation authority, no universal two-person rule | B3 preserve → T08; E1/E6 |
| Q22 | Returned payroll supports actual outcomes; B09/B12 | `payments/recording-service.ts` | B3 → T08; E4/E6 |
| Q23 | Staff discrepancy, Coordinator controlled correction; B10 | Reconciliation and payment correction services | B3/B5 preserve → T08/T09; E4 |
| Q24 | Verbal Financial/Releasing instruction; B15 | Communication is office evidence, not a new stored cutoff authority | D3 dependency → T09; E1/E2 |
| Q25 | Batch-specific regular-payout deadline | Separate regular-window/DV semantics | D3 preserve distinction → T09; E1 |
| Q26 | Earlier deadline regular payout only; clarification B | `payouts/submission-service.ts`, existing claim guards | D3 no blanket date change → T07/T09; E1 |
| Q27 | Unclaimed DV request limit: semester end | `ovr/reprocessing.ts`, `payments/individual-service.ts` | D3 retain guard → T09; E4 |
| Q28 | Timely original request may continue to later actual release; B15/B16 | Current settlement still blocks after end; confirmed difference remains | D3 separate future financial proposal, not this plan's implementation → T09; E1/E2/E4 |
| Q29 | Dated receiving log/ack establishes timeliness | Current server request time does not fully model physical receipt | D3 evidence design before any Q28 change → T09; E2 |
| Q30 | Late encoding of earlier release needs signed evidence, Coordinator review, written releasing-office confirmation | Treasury/correction paths exist; exact two-source requirement partial | D3/PB2 affected scope → T09; E2/E4 |
| Q31 | Coordinator supplies office-approved forms; B17 | Existing DOCX adapters remain drafts | D3/PB6 approved adapter dependency → T09; E4/E6 |
| Q32 | Separate payroll and individual reports; B14 | `payments/report-{reads,service}.ts` bases already available | B5 preserve → T09; E4 |
| Q33 | Internal records; Coordinator authorizes requested external copies | Audited download exists; no routine external-send feature required | B5 documentation, add log only if needed → T09/T12; E1/E2 |
| Q34 | Administrator authorizes/creates Staff access; B18 | Existing local account/role commands; no missing browser editor assumed | D2/D4 operating procedure → T12; E2/E6 |
| Q35 | Administrator recovery, Coordinator validates records | `scripts/backup-lib.mjs`, F35 recovery runbook | D2 → T12; E4/E6 |
| Q36 | Paper receiving during outage; later entry separate | Existing receipt evidence separates actual receiving/recording; parity case-specific | A5/B4 preserve → T02; E2 |
| Q37 | Individual contact and follow-up record | Internal notifications do not establish external message/contact history | A3 map existing paper/notes first; B4 → T10; E2 |
| Q38 | Written return request/current enrollment for review | Generic standing requests; evidence contract partial | A3/B4 mapping → T06; E2 |
| Q39 | Coordinator case-specific leave conditions within mandatory rules | Existing formal standing controls, no fixed duration invented | A3 mapping → T06; E1/E2 |
| Q40 | Administrator confirms supplied official dates | `configuration/service.ts`; technical entry is not policy origination | D4/C4 calendar provenance → T07/T12; E1/E3 |
| Q41 | Staff investigates missing payroll before supported omission | `payments/omission-service.ts`, source checks | B5 preserve → T09; E4 |
| Q42 | Coordinator ends preparation after reviewing cases | `payouts/preparation.ts`, not payroll closure/claim deadline | B3/B5 preserve → T07/T09; E4 |
| Q43 | Coordinator promptly notifies Administrator on Staff departure | Account revocation/session controls exist; office handoff remains | D2/D4 procedure → T12; E1 |
| Q44 | Coordinator approvals wait during absence | Preserve role checks; no acting role, proxy or shared account | All batches, D4 → T12; E1 |
| Q45 | No further material workflow reported then | Interview complete, not defect-free certification | Seven coordinated plans; no question inflation; E1 |

## Historical requirements coverage

| Historical register | Obligations carried into proposed work |
|---|---|
| B01–B03 | Internal office entry, permanent identity, continuing baseline without new admission/history reconstruction: A1–A5 |
| B04–B06 | Document coverage, mandatory academic decisions and scoped current prior review: A2/A3/A5/A6, T02/T05/T07 |
| B07 | Annual official publication and immutable versions distinct from payout: A2/A4/B4, T07 |
| B08–B10 | One full PHP 5,000 degree entitlement; reviewed payment recording, actual date, discrepancy/closure controls: B3/B5/C4, T08/T09 |
| B11–B14 | Correct individual routes, actual release, guarded cancellation and separate Original/later Paid: B5/D3, T09 |
| B15–B17 | Claim authority, restricted-period evidence and draft-form approval gaps remain separate: D3 |
| B18–B19 | Existing authorization/audit/transactions/performance and frozen renderer/20-per-page template: all batches; no reapproval/payment from layout |

## Scope of this review

Focused source inspection covered registration, annual intake/classification, Registry queries, continuing baseline/rollover, course references, graduation/standing, dashboard/read paths and current historical/individual sources. No database connection, browser login, migration, benchmark, lint/build/test or UAT fixture command was required or run for planning. The previous 603-test and financial results are reused with their dates/qualifications. Existing screenshots are evidence, not newly measured screens. File-preservation evidence is in [the planning inventory](../../output/integrated-planning-20261024/preservation-before.json); final verification is recorded in the phased plan.
