# Workspace UI simplification

Delivered: 2026-10-07. Technical validation completed; user acceptance pending.

This is delivery evidence for the [single workflow tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md), not another implementation plan. The user's request covers navigation and everyday usability across the workspace, including the long payroll, document-policy and masterlist screens.

## What changed

| Area | Current behavior |
| --- | --- |
| Navigation | Home, Scholar registry, Masterlists, Payroll and Reports appear according to the user's existing permissions. Setup and administration are grouped separately. Duplicate placeholder navigation is removed. |
| Home | Login opens Home. Staff and Coordinators have direct shortcuts to receive documents, find a scholar and prepare payroll. Technical administrators keep their administration view. |
| Scholar workspace | Opening a profile hides the registry list and search controls. Year, school and course remain visible. Receive COR / COG opens receiving directly. Payroll review links open the selected scholar's document workspace. |
| Receiving | Receive documents, Verify or correct documents, and Academic compliance are numbered sections. Evidence, instructions and historical details are expandable. COR and COG remain separate records. |
| Payroll | Choose a semester, then a batch. Other semesters and batch lists no longer remain stacked above the selected work. Candidate totals, cutoff, preview, status filters, name search and ten-row pages replace the long unfiltered list. School/course details and blocking reasons are expandable; each candidate has a direct review link. |
| Masterlists | Opening a list hides the saved-list browser. Members appear in a searchable, paginated table. Published lists do not show draft entry editing or candidate-add controls. Amendments, publication metadata and history remain accessible in expandable sections. Failed validation stays visible. |
| Document policies | Compact policy summaries replace repeated instructions and version paragraphs. Details, history and applicability preview expand when needed. Staff have a link to scholar receiving. |
| Continuing rosters | Saved rosters and the selected roster are shown separately, with a back action. |
| Shared layout | Consistent headings, form sizing, button spacing, readable tables and status badges apply across the workspace. Mobile tables scroll within their region; mobile navigation supports keyboard dismissal and focus restoration. |

## Preserved behavior

This delivery changes the interface, not the scholarship rules. Backend permissions, cutoff rules, authoritative eligibility, separate receiving and verification, Coordinator decisions, audit history, version checks, immutable published records and frozen official payroll forms are preserved. Printing still does not record a payment. No schema migration, live demo replacement or account change was performed for this UI work.

Advanced actions remain available to authorized users. Routine views hide their explanations until requested; genuine validation errors and pending decisions remain visible. This delivery does not remove required evidence for exceptional decisions.

## Validation

- `npm run check`: ESLint, 283 tests in 50 files, TypeScript/client/server build and secret scan passed. Vite still reports its existing large-bundle advisory; the build succeeds.
- Disposable database: `npx tsx scripts/test-eligibility-db.ts --main-payroll --browser` passed the 11 eligibility scenarios and main-payroll A-H scenarios. Browser checks used this isolated fixture, not live scholar records.
- Staff: Home shortcuts, payroll navigation and filtering, direct scholar receiving, searchable published masterlists and compact document policies checked.
- Coordinator: operational navigation and authorized deferral controls checked; payroll draft preview opened with the expected scholar and draft watermark; cutoff still disables premature submission.
- System Administrator: login opens administration Home; operational scholar navigation and receiving shortcuts are absent.
- Desktop and 390px mobile views checked, including contained table scrolling, menu opening/dismissal and focus behavior.

Screenshots and browser assertions are under `output/playwright/`, including `ui-home-desktop.png`, `ui-payroll-desktop.png`, `ui-payroll-mobile.png`, `ui-masterlist-desktop.png`, `ui-policies-mobile.png` and `ui-admin-home.png`.

## User walkthrough

1. Refresh the workspace and sign in as Staff or Coordinator. Home offers the three daily tasks.
2. Choose **Receive documents**, find a scholar and open their profile. Receive COR or COG, then expand verification and academic compliance as needed.
3. Choose **Payroll**, open a semester and its batch. Filter **Needs review**, use **Review scholar**, or preview the current payroll.
4. Open **Masterlists**, select a saved list and search a member. Expand official history or amendments only when needed.
5. Use **Setup & administration** for document policies, configuration, audit and technical tools permitted by your account.

These checks do not constitute human operational acceptance or advance the broader paused workflow phases. Specialized exception, configuration and reporting screens retain their existing forms, with the shared layout improvements applied.

## Receiving defaults and reload follow-up (2026-10-07)

User testing exposed overlapping live/demo academic years, older open payroll periods competing with the current semester, and receiving selections held only in React memory. Different legacy semester and payroll checklists looked interchangeable, so reopening another context made saved work appear absent.

Delivered:

- Default to a current, unlocked academic year. If current calendars overlap, use the scholar's registration year only when that year is current; unresolved ambiguity still requires an explicit choice. An old registration year never displaces a uniquely current year.
- Prefer an open payroll period only when its semester is current. Older open cycles remain available through explicit selection; closed history stays protected.
- Show year and period as context labels; reveal selectors through **Change year / history** and **Change period / history**.
- Preserve scholar, receiving year and period in the URL, restoring the same records on browser reload. Invalid saved selections are not silently redirected.
- Distinguish legacy **Semester documents** from **Payroll documents** and provide **Other saved document records** with recorded statuses and a direct open action. No receipt or verification is copied between checklists.
- Explain the missing scholarship approval on receiving screens for applicants without published membership or an accepted continuing baseline, with a direct scholarship-review action.

Read-only diagnosis confirmed that the reported receipts were saved. Juan's real-year COG was verified, but his scholarship remained Exam Passed and inactive. Jessa remained Applicant, outside the published masterlist; her semester COG was verified while its separate payroll instance was For Verification, and her COR receipts were saved. These findings describe the inspection time, not permanent demo state. No scholarship approval, receipt, verification, schema or account was changed by the diagnosis.

Validation: 287 unit tests, lint, type/build and secret checks passed; all eight disposable receiving scenarios and 12 eligibility scenarios plus main-payroll A-H passed. Browser tests received individual COR/COG, reloaded to the same saved Submitted records, preserved an explicitly selected alternate period, reopened the original receipts through Other saved document records, and verified Back to registry cleared the profile URL. Evidence: `output/playwright/receiving-reload-preserved.png` and the receiving reload/context assertion scripts.

## Annual-record and published-masterlist follow-up (2026-10-07)

The user identified Scholarship records > Add academic year record and adding Jessa to DEMO Published Payroll Scholars. Read-only inspection found Jessa had since reached Selected, with same-year academic data. The target masterlist was Published, not Draft; its unlocked academic year did not permit overwriting the published membership. A separate empty draft named ANOTHER already existed for the same year. No live membership or qualification decision was changed during diagnosis.

Changes:

- Scholarship/academic record forms refresh their academic-year choices from the server, rather than relying only on the registry's earlier list.
- New record forms preselect the current year when identifiable, honor an explicit year context, and never prefill a year already recorded or unavailable.
- Starting a new annual scholarship entry clears the previously opened detail and focuses the form. Existing-record navigation is disabled while a command is being entered. When every available year already has a record, the UI explains that users should open an existing record.
- Scholar tab and selected scholarship year are preserved in the URL. Reload restores Scholarship records or Academic records instead of silently returning to another tab. Selecting a scholarship year also carries that context into Academic records.
- Selected records point to masterlist preparation. Published lists explain their immutable membership and offer **Create additional draft for [year]**, using the existing same-year draft workflow. The original publication remains unchanged. Review/approval states explain that the list must return to Draft for entry changes.
- Empty drafts expose Add candidates immediately. Missing selection or academic details link directly to the scholar and matching year.

Validation: 289 unit tests in 51 files and lint/type/build/secret checks passed. Isolated database checks passed 11 qualification, eight academic and nine official-masterlist scenarios; main-payroll fixture checks also passed. Browser testing created a synthetic scholar, created the annual scholarship record with blank optional evidence, reloaded that year, saved academic placement, recorded exam/qualification/selection, opened a published list's additional-draft action, created a same-year draft and added the selected scholar. The member persisted after reload. Duplicate year choices were excluded and the old detail was absent while creating another record. Evidence includes `output/playwright/selected-scholar-added-to-draft.png` and the workflow browser assertions.

These are the fixes and paths verified in this follow-up, not a claim that every possible workflow has passed human acceptance. Backend approval rules, permissions, existing live data and historical publications were preserved.

## Open semesters only in receiving (2026-10-07)

- Receiving choices use the existing API's current/open scope flag. Ended semesters are excluded even if their financial payout cycle remains open. An existing open checklist stays available without needing to be generated again.
- One open choice is selected automatically. Multiple current document contexts remain explicitly labeled; closed and past contexts never appear in the receiving dropdown.
- Other saved documents are available in a separate, collapsed **Document history** section with individual statuses, receipt evidence, decisions and waivers. Historical views have no editing actions. A saved link to a now-closed period displays an explanation and requires an explicit open-period choice rather than silently changing the receipt destination.
- No schema, backend authorization, eligibility or historical-data changes. To reverse this increment, restore its receiving selection/component changes together; no database recovery is needed.

Validation: 290 unit tests across 51 files; lint, typecheck, build and secret scan passed. Eight receiving database scenarios passed against a disposable database. Browser checks verified actual closed-payout exclusion and receipt reload, then simulated ended/closed API availability to verify historical-link protection, read-only receipt history, automatic sole-open selection and the no-open state. Assertions: `output/playwright/open-periods-check.js`; screenshot: `output/playwright/open-periods-history.png`. Fixture cleanup completed. Human acceptance remains pending.

## Masterlist simplicity and repeated-panel fix (2026-10-07)

The workflow component and entries table previously used the same sibling React key (`detail.id`). That identity collision could leave duplicate workflow panels during updates. They now have distinct identities and separate layout positions. Browser regression checks repeatedly refresh, search, switch tasks and open/cancel entry editing to verify that only one panel remains.

Daily workflow: open a draft, choose **Add scholars**, search, then click **Add to list**. The row changes to **Added** and the member count updates. Choose **Scholars on list** to review entries, then use the single **Review & approval** panel. Empty drafts open Add scholars automatically. Candidate results use ten-row server pagination; missing-data explanations expand only when needed and retain links to the relevant scholar record. Only one work table is shown at a time.

Routine additions no longer require an extra form or award number. Optional award details remain under **Edit entry / Review / refresh**. The existing entry API still validates selection, academic data, permissions and versions, records automatic audit evidence, and supports idempotent retry. A rapid repeated click sends one command. Removal keeps its reason form. Empty/invalid lists explain why submission is unavailable; server review, approval, publication and historical protections are unchanged. Entry editing temporarily hides the unrelated list/workflow content.

Validation: all 290 unit tests, lint, typecheck, build and secret scan passed. All nine masterlist database scenarios passed in a disposable database. Browser checks passed repeated refresh/search, single-panel rendering, two direct additions, double-click protection, persistence after reload/reopening, blocked-candidate links, optional award editing, repeated edit/cancel and submission to verification. Desktop and 390px mobile views were inspected; the mobile table scrolls within its container. Evidence: `output/playwright/masterlist-simplicity-check.js`, `masterlist-details-check.js`, `masterlist-simple-desktop.png` and `masterlist-simple-mobile.png`. No live records or schema were changed. Human acceptance remains pending.

## Workflow-wide simplification review (2026-10-07)

The user's subsequent request covers every existing workflow. This increment reviews the operational, exception, reporting and administration screens together, and removes repeated entry or unnecessary navigation where the stored context is sufficient. It does not advance the paused broader policy phases.

| Workflow | Delivered behavior / preserved control |
| --- | --- |
| Registration and imports | New registration defaults to an unambiguous current year. Optional personal/contact details are collapsed for new registrations and expanded for editing. Existing import validation remains. |
| Annual qualification and selection | Current-year scholarship detail opens directly when identifiable. Qualification history is collapsed; examination, qualification and selection decisions remain explicit. |
| Academic placement and year level | Current-year context carries into academic records. Original evidence is expandable. Saved year level remains visible in the profile and survives reload. |
| Continuing roster | Selected names and row numbers are reused automatically. Optional spelling/row corrections expand on demand. Saved members use a searchable paginated table. Independent Coordinator review remains. |
| Semester receiving | Open-period selection and saved receipt context from the preceding increment remain. Already-recorded semester academic details show a summary rather than another save form. Legacy single-document receiving now also allows blank storage/reference/notes and supplies routine receipt evidence automatically. COR and COG remain individual records. |
| Verification, correction and waivers | Explicit actions focus and scroll to their form. Decision/waiver history stays accessible. Exceptional decisions still require their existing reasons and authority evidence. |
| Compliance and eligibility | Selecting an eligibility detail displays one scholar instead of the full list plus detail. Detailed checks expand on demand. Academic findings, verified documents and authoritative eligibility rules remain separate. |
| Masterlists and publication | Earlier one-click additions and single-table layout remain. Workflow action forms receive focus. Approval, publication, versions and amendments retain their controls. |
| Payroll, financial processing and release | Processing, amendment and payment-correction panels have distinct React identities, preventing duplicate panel reconciliation. Action forms receive focus; processing dates default to today's Philippine date and remain editable. Amounts, approvals and actual payment outcomes are not inferred. |
| School/course changes and scholarship standing | Completed requests are collapsed while pending decisions remain visible. Status requests offer reason categories instead of mandatory manual code typing; a custom code option remains. Detailed reasons and authority references remain mandatory. Graduation is still an authorized status decision. |
| Reports and dashboards | Selected report/cycle is retained in the URL across reload. Existing dashboard summaries and exports remain. |
| Configuration, access and audits | Permission catalogs are collapsed by category. Administrative forms and audit evidence remain available to authorized roles. Technical administration does not gain scholarship approval. |
| Navigation and help | A sidebar destination resets the previous profile even after in-profile URL updates. Profile summary/qualification keys are unique. The guide links directly to six task-oriented workflow sections. |

### Browser evidence

Checks ran against the disposable main-payroll fixture on port 3003, using synthetic accounts and records. No live scholarship decisions, receipts, payments, accounts or schema were edited.

- Staff and Coordinator: all 11 principal routes opened without page/console errors or alert messages. Administrator: six relevant routes opened without alerts; operational scholar navigation remained absent.
- Created a synthetic scholar, added an annual record and academic placement, repeatedly switched tabs, and verified that Second Year persisted after reload.
- Verified current-year scholarship detail opens automatically, registry navigation clears the previous profile, correction/status forms receive focus, and choosing Graduation does not require a typed code. The authority-reference field remains required; the test cancelled the decision.
- Confirmed verified COR/COG stay separate and previously saved semester details do not ask for another save.
- Confirmed report/cycle selection survives reload, the payroll Eligible filter isolates the expected scholar, and the draft payroll preview contains that scholar and the draft watermark.
- Saved a synthetic continuing roster with automatic name/row values. Its searchable member table displayed the saved evidence and required a different Coordinator for review.

Evidence: `output/playwright/workflow-screen-walk.js`, `all-register-check.js`, `all-profile-check.js`, `all-academic-save.js`, `all-receiving-open.js`, `all-status-navigation.js`, `all-report-reload.js`, `all-payroll-review.js`, `all-admin-check.js`, and `all-roster-saved.yml`. Screenshots include `workflow-status-simplified.png` and `workflow-payroll-simple.png`.

### Verification and recovery

The final frozen-source release gate passed all 43 suites, including 291 unit tests across 51 files, lint, TypeScript/build, secret scanning, database workflows, concurrency, audit, migrations and encrypted backup/restore. Database receipt coverage verifies optional routine input, automatic audit evidence, authenticated actor attribution and concurrent duplicate protection. Evidence: `output/workflow-ui/F36-report.json` (archived from `output/uat/F36-report.json`). Earlier two runs completed their suites but correctly rejected release certification because source fixes were still being made during execution. The final run passed the source fingerprint check. The browser fixture stopped normally and its disposable database was cleaned up.

This is automated regression and selected browser coverage, not a claim that every possible role/state combination has undergone human acceptance. Existing exception forms retain deliberate evidence requirements. The build retains its existing large-bundle advisory.

No migration is required. Recovery consists of reverting this UI increment together with the single-receipt validator/test adjustment; existing empty receipt locations are already supported by batch receiving. Do not restore a database or discard unrelated earlier work to reverse these presentation changes.

### Candidate label follow-up (2026-10-07)

The screenshot for LDSS-2026-00041 showed `SELECTION_REQUIRED` as its blocker. Candidate snapshots are withheld whenever any admission check fails; the table incorrectly described every withheld snapshot as "Details incomplete." It now says "Academic details required" only for an actual academic-record issue, otherwise explains that the displayed details await successful checks. Selection authorization and live records were not changed. Typecheck and targeted ESLint passed; this subsequent presentation-only change is newer than the archived 43-suite release fingerprint.

## Role guidance, direct verification and bulk work (2026-10-07)

The user requested visible account responsibilities, removal of the extra document-routing click, and multi-select admission/masterlist actions.

### Daily operation

1. **Home / Admission review:** choose the admission stage, search applicants, and select individuals or all available applicants on the current page (25 maximum). Staff or Coordinator records exam passes; Coordinator confirms qualification and selects scholars. Review the selected names and effective date, then confirm one step. A shared physical decision reference is optional; existing routine audit defaults remain. No stage is silently skipped. Existing continuing scholars use their roster workflow, not fictional exam decisions.
2. **Masterlists / Add scholars:** select individual eligible candidates or all eligible candidates on the displayed page, then **Add selected**. Review the names and confirm. Blocked/already-added candidates cannot be selected. The existing single-add action remains available. Changing the page/search or refreshing clears the selection.
3. **Receive requirements:** receive each actual COR/COG as before. Open document review and click **Verify document** directly. There is no separate Send for verification button. Staff and Coordinator can verify, return or reject received/resubmitted documents, subject to the existing checks. Each document must still be reviewed individually.
4. **Approval handoffs:** the signed-in role appears beside the user's name. Qualification, masterlist approval/publication, payroll finalization and status/placement changes identify Coordinator responsibilities. Existing masterlist and payroll approval actions already cover their complete list/batch; independent-review requirements remain.

### Preservation and failure handling

- Bulk actions reuse the existing per-record command APIs, permissions, versions, audits and idempotency keys. They are sequential individual saves, not an all-or-nothing transaction. The confirmation panel shows Saved/Pending/Needs review per person and stops at the first error or unconfirmed response. Retry preserves the exact payload/key, skips confirmed saves and cannot silently revise a decision against a newer record. A stale record requires close/refresh/review. Selection is deliberately page-scoped; no unseen records are approved by Select all.
- Direct document review validates receipt state, academic/document context, dates and all five checks before writing. To preserve the existing database transition constraint, the service appends an explicitly automatic routing event and the decision in one transaction, with an audit linking the routing event. Failure rolls back both events. Existing historical statuses and the legacy routing endpoint remain compatible; no schema migration is required.
- The For verification report includes Submitted and Resubmitted documents as well as the legacy For Verification state, so removing the manual routing click does not hide documents from the queue.
- No automatic qualification, selection, scholarship activation, waiver, eligibility override or payout release was introduced. Waivers, exceptional corrections and physical payment outcomes retain individual evidence and review.
- New read-only API: `GET /api/v1/scholarships/review`, scoped by year and admission stage, with bounded search and 25-record pages. Access requires `scholars.read`; technical administrators do not inherit it.

### Evidence

- Unit coverage checks the allowed direct-review transitions and bulk interruption/retry behavior. Qualification database checks cover queue privacy, year/stage/search filters and pagination. Verification database checks cover direct initial/replacement review, automatic-event rollback, idempotent retry, permissions, immutable history and existing context protections.
- Disposable browser fixture: three synthetic applicants advanced through separately confirmed examination, qualification and selection batches. Staff saw the Coordinator handoff without qualification/selection checkboxes.
- Three synthetic scholars were added together to a draft. The browser intentionally lost the second response after the server saved it: the UI stopped, retried the same key/payload, and ended with three unique entries at revision 4. Reload preserved the list. The initial script's final navigation selector was corrected to include the visible member count; the follow-up assertion confirmed the persisted results.
- Browser received a COR, opened Verify directly, explicitly confirmed its five checks, saved and reloaded the Verified record. COR/COG remained separate. Setup/publication used synthetic fixture API calls; the receipt and verification themselves used the actual UI.
- Evidence scripts/screenshots are under `output/playwright/bulk-*` and `output/playwright/direct-*`. No live business records or approvals were changed. The final frozen-source gate passed all 43 suites, including 292 unit tests across 52 files, lint/type/build/secret checks, isolated database workflows, migration/preservation checks and encrypted backup/restore. Archived result: `output/bulk-workflow/F36-report.json`. Desktop and 390px mobile views were checked; the disposable browser fixture was cleaned up. The existing large-bundle advisory remains. Human operational acceptance is pending.

Recovery: revert this increment's frontend, admission queue and direct-review service/report changes together. Existing automatic routing events conform to the old persisted transitions and remain readable; no historical-event deletion or database rollback is needed.

## Navigation and document review refinement (2026-10-07)

The user requested continued refinement while their operational review is pending. This follow-up stays within the existing daily workflows.

- Admission review restores its year, stage, search and page after reload. Checked names and commands are never restored. Invalid saved years require a new choice; empty later pages explain how to return. Staff defaults to Applicant/examination recording; Coordinator defaults to Exam Passed/qualification review. Explicit saved stages remain readable according to existing permissions.
- Completed bulk admission decisions offer **Open next admission stage**, with a Coordinator handoff where needed. Final selection links to **Open Masterlists**. Each stage still requires a fresh selection and explicit confirmation. Sidebar navigation starts a fresh queue.
- Bulk confirmation identifies the academic year/effective date/shared reference or the masterlist title/year, so the destination is visible before saving.
- Successful receiving opens document review. A visible pending-document count and **Review received documents** action guide the next step, including after reload. That action opens the section and moves keyboard focus to it. COR and COG remain separate; receiving never automatically verifies a document or grants eligibility.

Validation: `npm run check` passed 294 unit tests across 53 files, lint, typecheck, build and secret scanning. Disposable main-payroll fixture checks passed A-H and 11 eligibility scenarios. Browser checks passed saved admission context, empty-page recovery, fresh selections between three admission stages, Staff approval restrictions, bulk masterlist retry after a lost response (three unique entries at revision 4), and receiving/verification persistence. A verified COR and a submitted COG remained distinct after reload; the pending-review action opened and focused the correct section.

Evidence: `output/playwright/refine-admission-context.js`, `bulk-staff-check.js`, `bulk-masterlist-check.js`, `refine-receiving.js`; screenshots `refine-next-stage.png` and `refine-receiving-saved.png`. Browser work used synthetic records on disposable port 3003; no live approvals or business records were edited. The prior 43-suite report remains evidence for the preceding delivery, not a new frozen-source certification for these UI refinements. The existing bundle-size advisory remains. Human acceptance is pending.

No migration or backend/permission change is required. Recovery consists of reverting this increment's frontend navigation/context/handoff changes and its navigation tests together, preserving earlier bulk/direct-verification functionality and stored history.

## Visible masterlist removal (2026-10-07)

The subsequent payroll period navigation delivery is recorded below.

Draft members now show **Remove scholar** directly beside View scholar, instead of hiding it inside Edit entry. Confirmation names the scholar, permanent ID, masterlist and year. The existing removal reason remains required, with suggested reasons; physical reference is explicitly optional. **Confirm removal** and Cancel make the outcome clear. The saved notice explains that the scholar profile remains unchanged. Existing membership-removal, version, idempotency, audit and read-only protections are reused; no schema or permission changes.

Validation: targeted ESLint and the full type/build command passed; all nine isolated masterlist database scenarios passed, including removal history, counts, concurrency, audit rollback and locked records. Browser checks verified visible action, cancellation, missing-reason validation, removal with blank optional reference, zero-member count after reload, and the retained profile. The script's final profile-name selector initially used reversed names; it was corrected, and a separate profile assertion passed. Evidence: `output/playwright/remove-scholar-check.js`, `remove-profile-check.js`, `remove-scholar-saved.png`. This small presentation change is later than the previous 294-test check; that full check was not repeated. Disposable fixture cleanup completed; live records were untouched. Human acceptance remains pending.

## Current payroll and past-period access (2026-10-07)

- Payroll starts at **Current periods**. Classification uses inclusive configured semester start/end dates and today's Philippine date; cycle state and target payment date do not turn an old semester into a current one. Overlapping current calendars remain explicit choices.
- **Past periods & batches** shows ended semesters. Open payroll leads to the existing batch list, saved batch details and authorized previews. Back navigation returns to the chosen period view. Historical records and ongoing financial processing retain their existing controls.
- **Upcoming periods** appears when applicable. **All periods** includes records whose semester dates are unavailable. An empty current view explains where to find other periods instead of silently selecting an old semester.
- All cycle API pages are fetched before filtering; the visible view is paginated at 25 periods. This prevents older records on the first API page from hiding current work. No API/schema, permission, eligibility or saved payroll change.

Validation: `npm run check` passed 297 tests across 54 files, lint, type/build and secret scan. The disposable main-payroll fixture passed A-H and 11 eligibility scenarios. Browser checks verified real current/past classification, an open old cycle in Past, batch-list navigation, and a finalized two-member batch reachable after simulated calendar rollover. Simulated read responses containing 100 extra older cycles verified fetching later API pages, past-view pagination and page reset between views. Desktop and 390px mobile layouts checked without page overflow. Evidence: `output/playwright/payroll-period-check.js`, `payroll-period-pagination.js`, `payroll-current-first.png`, `payroll-period-mobile.png`. The database was never altered for calendar/volume simulations; the disposable fixture was stopped and cleaned up. Live records remain untouched. Human acceptance and the broader frozen-source release gate remain pending for this UI increment.

Recovery: revert this increment's PayoutCyclesPage, payroll-periods helper and associated unit tests together. No database rollback is needed.
