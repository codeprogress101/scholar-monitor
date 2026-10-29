# Targeted plan: independently imported historical payroll batches

24 October 2026, Philippine time. **Proposal only.** The user's authorization allows synthetic fixture generation and investigation, and expressly withholds approval to change historical authorization, eligibility guards, deadline policies, migrations or financial services. This document is the reviewable implementation scope; none of its application/UI changes has started. Findings and fixture results: [blocker analysis](LDSS_TWO_BATCH_BLOCKER_ANALYSIS.md).

## Intended result and invariants

One existing academic year, semester and payout cycle can contain two separately imported, previously processed historical payrolls. Each payroll binds its own confirmed import, approved annual members, current scoped prior approvals and supported historical submission dates. Coordinator finalizes each payroll separately; Staff/Coordinator records later supported outcomes independently. Both initially contain only Pending outcomes. No repeated individual COR/COG verification is required when the existing prior review applies.

Keep one permanent identity and one PHP 5,000 degree entitlement per scholar/semester/benefit. Preserve Batch 1's original setup, published membership, finalization bytes, allocations, outcomes and history. Prior review, historical processing, entitlement approval and actual release remain distinct. Keep available-period checks, claim limits, current-source validation, mandatory academic restrictions, actual-release evidence, source hashes, exact retries, transactions, audit and database uniqueness constraints. No generic verification/eligibility override, competing cycle or fabricated omission is part of this solution.

## Smallest supported design

### 1. Resolve historical context by payroll batch

Prefer reusing the existing append-oriented `historical_payout_setups` structure: it already has `(cycle_id, revision)` as primary key, a unique `batch_id`, `import_job_id`, source snapshot, historical dates and actor. This permits an additive second setup record **without updating revision 1**. Confirm runtime grants and migration compatibility in implementation before relying on it. No migration is presently proposed merely to rename the table.

Introduce one authoritative historical-context resolver used by eligibility, timing and release validation:

- **Direct historical batch:** resolve by the selected `batch_id` and verify its actual cycle/semester, bound confirmed import, reviewed member scope and current pinned prior approvals.
- **Genuine later omission destination:** retain the existing reviewed origin/destination relationship to the original historical source and that source import. It remains a separate route; do not invent this relationship for independently imported Batch 2.
- **Ordinary batch:** retain existing ordinary candidate, window and receipt rules.

Keep the legacy cycle root deterministic and stable. Existing cycle-level `ORDER BY revision DESC LIMIT 1` readers must not reinterpret a new append record as a replacement root. Return the original root for legacy context and a separate collection of historical batches for batch selection. Batch-specific readers must never default to the newest cycle-wide import. For cycle-only eligibility views, require an explicit batch or clearly indicate that batch context is needed for historical-source assessment; do not present the wrong root's source restriction as missing scholar documents.

The setup snapshot must pin the confirmed import hash/result, the exact source scholar-semester IDs, accepted prior approval IDs/revisions/source hashes, supported cutoff/processing references and applicable publication versions. Stored review scope is an allowlist, not a request for automatic membership insertion. Reject missing, stale, wrong-semester, conflicting or already reserved members. The existing review evidence remains authoritative and must be revalidated before finalization and payment.

The latest review for an owner must not be accepted solely because it exists. Require that the review belongs to the selected batch's import and pinned authority/source. If current source facts change, use the existing controlled review/correction rules; do not silently re-adopt or replace frozen evidence. Cross-import duplicate scholars must not gain a second financial route.

### 2. Add a narrow Coordinator historical-append command

Extend the historical setup family with an explicitly reviewed **additional historical payroll** operation, sharing validation with initial setup. This is an authorized historical recording path, not a relaxation of the normal open-window endpoint.

The command should:

1. Require existing `payroll.windows.manage` and `payouts.operate` authority, an available draft/open cycle, open preparation, current academic/calendar versions and one canonical semester mapping/cycle.
2. Lock the existing configuration guard and cycle ledger. Require the expected historical revision and next batch sequence, reviewed source/reference and an idempotency key. A retry returns the same batch, not another setup.
3. Verify the new confirmed import's exact scope, annual publication and current prior document/academic/deadline approvals. Verify all identities, pending courses, academic/standing restrictions, protected evidence and competing financial routes. No first-root import substitution is allowed.
4. Record actual supported historical opening/cutoff and processing dates within the semester, ordered and no later than today. Missing facts stay unresolved; never infer receipt dates from a deadline, assume the setup day was an old release, or insert an invented earlier cutoff to satisfy finalization.
5. Create the next numbered payroll and its new historical window/setup records atomically, retaining the first root and all earlier records. Do not update the current V1 second draft into historical status as an implicit migration. Prefer a new controlled batch; any transition of an existing draft needs explicit review of its existing entries, versions and history, and cannot rewrite frozen data.
6. Append the audit/command result and bind the new batch to its approved source scope. Do not finalize, allocate, mark Paid or produce release evidence as a side effect of setup.

All ordinary mapping/duplicate-cycle protections stay. If an audit write, source check or allocation transaction fails, roll back the entire command. Creation and finalization remain separate decisions under existing operation-specific authority; no new universal two-person rule is invented.

The current historical schema also requires `reported_release_on`. A processing date must not be substituted for an unknown actual release date merely to fill this column. Keep its supported batch-level meaning separate from each scholar's acknowledged actual release and Pending outcome. If the actual office source cannot supply the date this contract requires, report that case as unresolved and submit any nullable/separate processing-date schema change explicitly. It is not permission to invent a release date or an unannounced migration. Synthetic test dates must be explicitly declared scenario facts and never copied onto real records.

### 3. Resolve the cutoff independently

Retain `SubmissionWindowService.open-window`'s prohibition on opening a normal live-intake window in the past. Retain the whole-Manila-day cutoff check in review/finalization.

The new historical command may record an **already elapsed**, evidenced historical window, like the existing initial historical setup. Its real cutoff then satisfies the unchanged `cutoffReached` test. A recorded cutoff today still requires waiting until the next Manila day; a future cutoff cannot be declared completed. An accepted import or review never substitutes for this boundary.

The selected historical batch's prior approved deadline must equal its recorded cutoff. The existing batch-specific timing acceptance in [timing-service.ts:45](../../server/requirements/timing-service.ts#L45) is the model: current matching import/review, exact deadline, available mapping and no unresolved timing decision. Preserve actual receipt dates and original/replacement histories. An independent historical batch must gain its own validated timing context; the source-match fix alone does not provide that.

Use the existing semester final deadline when it covers the supported new historical cutoff. If a later **past** historical cutoff needs a new deadline version, record its separately reviewed historical authority/reference atomically through the historical operation; the ordinary extension endpoint must keep its normal date rules. Preserve previous versions. Never silently extend the claiming period, semester end or a current live-intake deadline. An unavailable period remains blocked under existing rules.

For the first implementation, preserve sequential, nonoverlapping numbered windows and validate them against their actual historical evidence. If office evidence instead gives identical or overlapping historical windows, report that as a separate historical-window modeling decision. Do not assign fictitious dates, assume an overlap exception, or claim that the current minimal scope handles it. Synthetic acceptance examples can use two explicitly defined, nonoverlapping past windows in one available semester. This qualification is independent of import ownership and must remain visible when approving implementation.

### 4. Preserve automatic candidates and finalization

For an independently imported historical batch, restrict the automatic candidate source to its pinned import members, then run the existing complete eligibility pipeline on every covered scholar. This prevents Batch 1 from absorbing Batch 2 or vice versa, without manually inserting `ovr_entries` or forcing eligibility. Each claimed member needs approved annual membership for that academic year and supported current placement/academic/receipt sources.

Keep source-hash review/finalization, unresolved timely-submission checks, deferrals where legitimate, exclusive-route checks and allocation uniqueness. A deferral is not a substitute for a falsely claimed original historical roster. Show any difference between source roster and proposed payroll before review. Finalization must freeze each batch's approved evidence and reserve its exact entitlements atomically.

Continue existing Coordinator submission and Staff processing actions. Payment Recording becomes available only through those legitimate states and its existing allocation/period checks. Keep Pending as absence of a recorded outcome; external historic payroll processing is not Paid. After adding/finalizing Batch 2, recheck that Batch 1 still permits its intended recording and that its frozen bytes and Original history did not change.

## Proposed error and navigation behavior

Keep a short cause, the responsible role and an actionable destination only where a supported action exists. Use reason codes and structured context, not matching English text or assigning every problem to the scholar profile. Do not offer an approval button without a backend operation.

| Problem category | Current legitimate destination | Proposed display and permission behavior |
|---|---|---|
| Missing school/year/placement | `scholarAddress(id, "academic", year)` | “Complete academic record”; show the action only to the role allowed to make that change. Course pending completion must respect its controlled process and frozen/publication constraints. Other viewers receive a read-only explanation. |
| Documents not received/verified, academic findings or receipt timing needing review | Existing `receivingScholarAddress(id, year, semester, cycle)` | “Receive / review documents”; Staff receiving and the actual verification/review authority remain distinct. Do not label every case “missing documents.” For mandatory academic concerns, describe the decision needed and its authorized owner. |
| Missing annual membership/decision | `#masterlists` or the existing scholarship section, according to the specific code | Identify Coordinator responsibility; preserve publication and operation-specific approvals. The link opens an existing review page and grants no authority. |
| Prior review genuinely missing/stale for the correct import | Scholar Registry list at `#scholars`, where the existing “Record prior batch approval” dialog is available | Only show the approval action/instruction when `academic.changes.approve`, `requirements.verify` and `semesters.configure` are present and prerequisites permit adoption. There is currently no verified import-prefilled dialog URL; use the real page and clear instructions. Do not invent a deep link that is ignored. Staff sees the escalation explanation and supported read-only evidence. |
| `CUTOFF_NOT_REACHED` | Existing payroll context, `#payouts?cycle=…&batch=…` | State the actual cutoff and earliest eligible Manila day; identify the whole-day rule. A context link is informational. No “verify scholar” or “approve now” action. |
| Current independent-import `HISTORICAL_BATCH_APPROVAL_REQUIRED` | **No supported resolution exists today** | “This payroll is linked to another historical import. The batch needs a supported historical-source workflow; editing this scholar or repeating document checks cannot resolve it.” Optionally offer “View payroll context” to viewers with `ovr.prepare`. This is not a fix link. |
| Duplicate entitlement/active individual route | Existing relevant payroll/payment history, if the viewer can read it | Explain the reservation and correct route. No profile correction, duplicate allocation or automatic cancellation button. If the route cannot be identified safely, show an explanation and controlled escalation. |
| Generic `NOT_ELIGIBLE` or unknown code | No guessed corrective route | Present it as a summary of specific reasons. Avoid duplicate “View scholar” links; unknown reasons require investigation, not a misleading promised repair. |

Change the shared resolver to return a union such as `explanation` or `link` with label, context and required permissions. Pass the selected batch/import and the actual viewer permissions into its renderer; current role-label strings do not enforce visibility. Both paged and complete candidate views must use the same result. Backend authorization remains mandatory on every action. For any future supported historical append UI, display the reference, covered import/member count, unresolved exceptions, source date scope and Coordinator authority before committing.

For this historical code, a minimal immediate presentation change after approval can suppress the incorrect profile action and show the explanation without first delivering multi-batch financial support. A genuinely missing approval and an unsupported import mismatch should become separate structured reasons when sufficient context is available. Never render “Record prior approval” for the present already-approved-but-wrong-root case.

This review applied the local ui-ux-pro-max guidance on clear recovery paths and predictable navigation. No new design system, component styling or interface implementation is required for this proposal.

## Bounded implementation and verification

Suggested change set, after explicit approval:

| Scope | Required change |
|---|---|
| `server/payouts/historical-setup.ts` | Shared first/additional historical validation; atomic append of new batch, source scope and supported past window. |
| `server/eligibility/semester-sources.ts` and a small historical-context resolver | Per-batch ownership and scoped historical candidates; preserve legacy root and genuine omission-destination semantics. |
| `server/payouts/submission-service.ts`, relevant models/UI | Stable legacy root plus historical batch list; no normal-window time-rule weakening. |
| `server/requirements/timing-service.ts`, `prior-approval-source.ts` | Reuse exact batch/import/deadline approval context and fresh authoritative hashes; never broaden prior adoption. |
| `server/ovr/managed-payroll.ts`, release readers and cohort/candidate batching | Apply scoped members and identical current decisions in full, paged and payment reads. Preserve R01–R07 and fall through safely for unsupported query shapes. |
| `src/scholar-issue-navigation.ts`, `ScholarIssueAction.tsx`, paged/complete candidate views | Accurate, permission-aware actions and explanation-only unsupported cases. |
| `src/HistoricalPayrollSetup.tsx`, `PayrollSubmissionWindows.tsx`, `PayoutCyclesPage.tsx` | After backend support, distinguish first setup from append; show actual evidence/member/date scope. No reapproval or payment implied by displaying a historical batch. |

No rewrite of document verification, masterlist publication, payment recording, scholarship policy, actual payment dates or the entitlement schema is proposed. If an actual schema constraint or grant prevents the append design, report it and submit a narrowly additive migration/grant proposal before implementing; do not silently grant broader access.

Tests needed **for the future implementation** (not claimed as run here):

- Separate 800/200 imports with distinct prior approvals, published annual members and two supported past windows: exact scoped candidate rosters; two independent Coordinator finalizations; 1,000 distinct entitlements; both processed and `canRecord: true`; all 1,000 Pending and zero payment records.
- Wrong import, wrong semester, unconfirmed import, scope/hash changes, missing/stale approval, conflicting document history and adverse academic/standing facts must remain blocked. A checkbox alone must never authorize eligibility.
- Source fixed with cutoff today/future remains blocked. Elapsed cutoff with wrong import remains blocked. Correct batch/import/deadline evidence plus an elapsed supported cutoff passes. Test the exact Manila midnight boundary, ordinary past-window rejection, overlap rejection and unavailable periods.
- Overlapping scholar in two imports, existing Paid, Unclaimed/reprocessing, active individual route and concurrent allocations must preserve one entitlement and correct original route. A valid same-import omission/destination still works without reclassifying independent batches.
- Concurrent append with the same expected sequence, lost-response exact retry, conflicting retry payload and forced audit failure: one committed result or complete rollback, no duplicate window, approval, allocation or partial setup.
- Capture Batch 1's setup, masterlist publication, frozen snapshot/hash, allocations, outcome ledger and Original closure if any. Appending and paying Batch 2 must leave them unchanged; batch-specific recording/reconciliation and distinct-entitlement reports must remain correct.
- Full/paged candidate and fresh payment checks must agree for both batches, including invalidated sources and controlled corrections. Verify build/schema contracts and keep finalization evidence within current bounds; no larger limit or evidence truncation.
- Navigation tests for all four problem classes, Staff/Coordinator/pure Administrator/unassigned viewers, missing batch context, unknown codes, generic summary reasons and valid deep links. Both candidate views must suppress the misleading scholar repair link for historical mismatch. Keyboard and screen-reader text must communicate the same cause, owner and next step.
- First-year grading-card alternatives, Course pending and all fifth-year known-five-year fixture combinations retain truthful evidence; no blanket entrant exemption or guessed grade history.

Existing direct same-import historical omission coverage is in [test-omission-historical.ts](../../scripts/test-omission-historical.ts); extend it alongside new independent-import coverage. Keep legacy P01–P10 and ordinary payroll/receipt/role paths in regression scope, then run the repository's required validation for the approved changes. Present synthetic checks separately from named office acceptance; neither authorizes activation or deployment.

## Preservation, rollback and stop point

The permitted fixture work creates V2 under `output/localhost-two-batch-v2-20261024/`, binds a separate server to 127.0.0.1:3010 and retains private random credentials. It does not repoint `.env`, mutate V1 or rebuild any frozen evidence in place. The generator refuses an existing V2 manifest; partial data is retained for diagnosis rather than automatically dropped. There is no automatic destructive reset.

Before/after preservation checks cover development, A–F, V1, existing schema/account privileges, accepted source/build/migration inputs and existing fixture helpers/reports. Stop a V2 server only by its known owned process if needed; switching back to V1 at port 3009 needs no data restore. Any future cleanup must first verify the exact owned schema/account and inventory, and remain separate from this task.

For an approved application implementation, stage the additive path behind an explicit default-off release gate and validate in a new isolated fixture. Roll back uncommitted commands transactionally. After any new approved batch/finalization exists, reverting code must not delete it or make it unreadable: disable new appends, preserve compatible read support and retain the ledger for controlled disposition. Do not drop schema/history or restore a stale backup over later valid transactions. Releasing/activating the change needs its own reviewed backup, maintenance and approval process.

**Stop after verified V2 fixture changes and these two documents.** The present Batch 2 remains blocked under unchanged application rules. Do not implement the historical append, change deadline/eligibility authorization, alter migrations, deploy, activate features or begin unrelated enhancements on the strength of this proposal.
