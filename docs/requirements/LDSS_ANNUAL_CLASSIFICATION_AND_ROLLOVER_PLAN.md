# Annual classification and rollover

24 October 2026, Philippine time. **Proposal only.** Requirements N01–N07 and Q1–Q11 are defined in the [current-year plan](LDSS_CURRENT_YEAR_WORKFLOW_PLAN.md). This document specifies Track A1–A5 for later approval. No existing classification, scholar, year or annual record is changed.

## One identity, annual facts

| Fact | Meaning / authoritative scope |
|---|---|
| Permanent Scholar ID | One person across all years, semesters and batches; reuse after identity review |
| First-entry year | Existing `scholars.academic_year_id` and identifier year; never rewritten during rollover |
| New Scholar | First selected for the scholarship in the **specified academic year**, even if already in Year II/III academically |
| Continuing Scholar | Beneficiary before that year, with participation confirmed for that year; may first enter LDSS this year |
| Intake classification | Supplied annual office fact. It is not independently approved admission, continuation, official membership or eligibility |
| College entrant/evidence basis | Separate current COR/prior completed-semester COG or applicable entrant alternative; scholarship “New” is not a blanket freshman/COG exemption |
| Admission/standing | Existing annual qualification and formal operational status; do not overload either to represent every registration or monitoring label |

Example: the same ID has New in AY 2026–2027, then Continuing in AY 2027–2028 **following reviewed continuation**, and Continuing again only if confirmed for AY 2028–2029. Semester changes and PAY-002/PAY-003 do not change classification. A pre-LDSS beneficiary can first register in AY 2026–2027 as Continuing without any AY 2025–2026 digital record.

## What is implemented and what is missing

| Source | Current evidence | Consequence |
|---|---|---|
| `src/ScholarsPage.tsx`, `server/scholars/{model,validation,service}.ts` | Manual registration saves identity, first-entry year, optional contact/birth/barangay and duplicate resolution; no classification input or annual intake write | A1 is **not** merely adding a frontend select |
| `server/imports/{model,workbook,service}.ts` | Eight-column simple workbook accepts New, Continuing or Old per row; Old normalizes to Continuing; mixed cohorts are supported | A2 keeps the existing parser/review, uses plain display labels and tests genuine mixed scope; do not rebuild the importer |
| `db/migrations/20261008030000_f36_scholar_intake.sql` | `scholar_intakes` has unique person/year, annual classification, immutable provenance, required school/year level and required import job/source row; course may be null | Existing structure is annual, but import-only and insufficient for manual names-only intake; no permanent class column is needed |
| `server/scholars/registry-placement.ts` | Classification currently prefers annual `status='continuing'`, then intake, then global continuing-baseline participation, then an annual-row New fallback | This is a read projection, not an explicit confirmed annual-classification ledger for every row. Avoid treating fallback inference as a supplied fact or as proof of next-year approval |
| `server/continuing/service.ts`, `server/masterlists/continuing-admission.ts` | Reviewed baseline participation establishes a pre-existing beneficiary without invented selection/exam history; participation is person-level, not a fresh annual application | Reuse for first digital onboarding; do not create a second baseline participation every year |
| `server/configuration/{service,rollover}.ts` | Year advance calls `rolloverYear` inside the configuration transaction; qualifying active, officially admitted members can receive new `status='continuing'` annual rows and source/audit links automatically | Already implemented, but preparation must not be described as the new requirement's explicit yearly review/confirmation |
| `src/ScholarWorkspace.tsx` / `ContinuingRostersPage.tsx` | All Scholars and Continuing roster review already exist, with bounded roster-list reads and reviewed commands | Extend/reuse this shell; baseline roster API cannot automatically serve as an annual-review API because accepted person participation already exists |

## A1/A5: minimal annual intake contract

Recommended design for review: **extend the existing annual intake model**, preserving all imported rows and immutable triggers, rather than add a conflicting person classification. This is a proposed additive/compatible migration, not a claim that the existing endpoint accepts it.

1. Add explicit provenance kind `import` or `manual`, a source reference and manual command/source identity. Keep existing `import_job_id`/`source_row` mandatory for import-origin records; allow them absent only for a properly sourced manual-origin record. Existing imported provenance can be mechanically marked import because its actual import FK exists; this is not inferred scholarship history.
2. Permit absent school/year level **in initial intake facts only**, with explicit completeness. Do not weaken required authoritative academic records, publication criteria, prior-review adoption or payroll validation. Course pending remains its existing separately approved academic exception when relevant; an empty registration field does not grant it.
3. Keep annual classification required for newly supplied manual/simple intake facts. Existing records with no supplied fact remain unknown; no mass New/Continuing backfill from ID creation date, payroll or global participation alone.
4. The manual command uses the existing creation/update authorization, duplicate protocol, configuration locks, transactional audit and exact retry. Identity and its supplied annual intake commit atomically. A retry cannot create another ID or another person/year row. Adding a year for an existing person is a separate annual operation, not another person creation.
5. Registration creates no academic approval, admission, standing, publication, entitlement, prior document review or payment as a side effect. Existing already-approved import operations retain their own explicit authorization and separate review evidence.
6. Intake provenance is immutable. A correction must append a source-linked revision/event and retain original value, reason, actor and timing. Before implementation, approve its role/decision contract using existing annual-review authority; do not give a broad permanent classification editor to Staff or infer a universal two-person rule. If the existing immutable model cannot represent a correction safely, the change proposal must include the smallest separate correction-event structure and readers.

**Data-model decision gate DM-A:** approve exact manual/import ownership constraints, nullable initial facts, correction semantics, grants and backward-compatible projection. Reuse `scholar_intakes` only if these conditions fit safely; otherwise present a narrowly scoped annual-registration-event alternative before coding. Do not silently choose a new table, disable immutable triggers or modify historical migration checksums. No mandatory school/course values are invented to avoid this gate.

### Manual form behavior

On **Add Scholar**, show selected working academic year and required **New Scholar / Continuing Scholar** choice together. Explain “Classification for this academic year; this does not approve scholarship or payment.” Retain names, duplicate review, permanent-ID assignment and optional details. Known placement can be entered through an explicitly separate current academic task; unknown values must not be required by a hidden control.

On an existing person's identity edit, keep first-entry year and permanent ID protected. Current-year classification belongs in the annual context, not that identity field. Show “Participation review pending” separately from a supplied Continuing classification. If year/source is missing or ambiguous, ask for the missing fact in the form and retain an uncommitted draft; do not default a first-time LDSS record to New.

### Import behavior

Retain per-row New/Continuing with preview counts by class, missing data, duplicate matches and unresolved rows. Preserve legacy Old input compatibility while displaying Continuing. A malformed/missing label is actionable, never guessed from spelling, year level or prior database presence. A mixed import can feed one payroll if all independent annual/semester/financial requirements pass.

Add the two requested processing descriptions as **review intent**, not proof. Staff may record the intended scope/reference; the existing Coordinator prior-review workflow accepts actual document/academic/deadline coverage. “Already approved for the working year” remains selection approval, not “requirements previously checked.” For incomplete initial intake, preserve the identity/provenance-only lane and skip academic/admission/receipt automation that requires missing fields. Never relax the full approved import to force a finalizable payroll.

## A3: current digital start

Use existing continuing-baseline review for beneficiaries whose earlier digital years do not exist. Record current known placement, review/source reference and truthful unknown history. Do not fabricate a selection date, last-year membership, prior shifts, grades or payment. Required previous completed-semester grade evidence is a **current eligibility source**, not a demand to reconstruct every past year. If a current restriction needs an unknown fact, show a controlled evidence/review blocker; no blanket approval follows from digital-start status.

Keep existing ordinary New admission capability for its legitimate cases; align the normal Staff entry route with Q1 without deleting accepted history or pretending every imported Continuing row must undergo a new application. Masterlist admission readers already accept reviewed continuing provenance. Verify all supported combinations before changing their precedence.

## A4: reviewed annual rollover

Proposed workflow:

1. Open Continuing Roster for source year and destination year. Preview prior-year people using bounded identity/annual data; show destination records already present. Do not run a full browser eligibility request per row.
2. Show Graduated and existing terminal/restricted/ambiguous-standing cases with their actual exclusion/review reason. Current code excludes graduates/dropped/disqualified/not-renewed, and routes other non-active/future/conflicting cases to review; do not falsely report them all as the same state.
3. Staff reviews potential continuing participants and known current-year changes. Pending graduation or delayed completion is a follow-up signal, not an automatic exclusion or renewal approval.
4. Coordinator confirms continuation through existing `continuing.approve` authority and the approved annual-review operation. Reject or leave unresolved cases explicitly; do not create a second person-level baseline roster.
5. Create/link the destination annual record as Continuing only through the approved result; preserve the old year's intake/classification and original first-entry year. Record genuine current placement through academic workflows; do not increment year level, copy a changed course, manufacture enrollment or silently reactivate standing.
6. Prepare the new annual Masterlist and semester compliance separately. Accepted annual participation alone does not publish, approve payout, reopen periods or create benefits.

**Required reconciliation of current automation:** split calendar advance from confirmation, or make automatic rows explicitly **prepared candidates** until the new annual review confirms them. The preferred future path is preview → reviewed annual command → create/confirm, while configuration remains technical calendar administration. Do not let a System Administrator's year change become business approval. Current rollovers already stored remain readable with their actual audit provenance; do not retroactively erase them, relabel old publications unapproved or change frozen payrolls.

**DM-R gate:** baseline roster decisions are not annual-scoped. First prove whether existing annual source/audit links plus an append-only review event suffice. If not, propose minimal annual review header/entries/decision events scoped to source/destination years, versioned source pins and expected revisions, reusing authorization/audit/command infrastructure. Add a unique person/destination-year decision fence and single-winner transactions. No new permission or migration is presumed approved.

Year transition must respect current closure/period checks. UI should report readiness and outstanding cases before an unavailable transition, not change the clock or silently close payrolls. Any staged approval that becomes stale must fail safely and allow fresh review.

## Working-year Registry visibility

B1 must specify and test **registered this year**, **supplied intake this year**, and **annual participant this year** separately. Current `scholarshipYearId` covers only annual rows. Prefer a bounded explicit working-year association projection over reusing first-entry year as a universal annual filter. New manual intake links from DM-A can supply incomplete registration association; registration-only legacy rows need a truthful labelled pending-association view/search rather than hidden automatic approval. Explicit historical/All choices remain available and retained across reload/back navigation. Do not silently broaden a financial cohort when improving a display list.

## Acceptance, tests and rollback

| Family | Required future result |
|---|---|
| T01 | Manual New and pre-LDSS Continuing, each with missing optional/academic facts; one ID, no fake years, unresolved duplicate pending; exact retry/rollback and role denial |
| T02 | Mixed import, Old compatibility, malformed class, class/year mismatch, missing school/course/year, source hash changes; incomplete never auto-verified/selected/paid; existing fully approved import preserved |
| T03 | Fresh working year, saved All/historical choice, incomplete just-created person, intake-only and annual-only links; no unfiltered flash or duplicate first request; unknown class remains unknown |
| T04 | N New → N+1 reviewed Continuing without N−1 history; class unchanged in N; declined/pending/restricted/graduate do not renew; prepared legacy rows and existing destination records preserved; concurrent/exact retries create one annual result |

Extend actual `tests/{scholars,imports,academic,configuration,scholar-navigation}.test.ts`, Registry/receiving tests, `scripts/test-{continuing-rosters,configuration,imports}-db` equivalents as registered in package scripts, and existing import/continuing drivers. New annual-review tests must exercise real state/source/transaction boundaries. Browser evidence covers Staff and Coordinator manual/import/review/reload/error paths and 1440/1024/820/320 CSS-pixel contexts as applicable. Preserve bounded 25/50/100 Registry pages and current import limits; any annual command chunking must retain complete approved scope and atomicity or an explicitly reviewed resumable contract.

Rollback before data writes can revert isolated code. After new intake/review evidence exists, disable new writes and keep compatible readers/history; use forward repair for mistakes. Never delete people, classification events, original intake rows, publications or financial history, and never restore an old database over subsequent valid transactions.
