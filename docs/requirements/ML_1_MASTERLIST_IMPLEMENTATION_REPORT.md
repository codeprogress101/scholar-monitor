# ML-1 — Cross-page eligible selection and early activation conflict detection

26 October 2026, Philippine time. **Implemented and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/#masterlists). Stopped after ML-1 verification and reporting.** Ordinary new-activation drafts now support a reviewed atomic addition across matching pages. Existing activations block preparation and forward review earlier. **The current approved Batch 1 remains approved, version 408, with all 400 members unchanged.** Nothing was published, amended, removed, returned to Draft or activated on primary.

This follows the explicit ML-1 resume/implementation authorization, the [completed investigation](ML_1_MASTERLIST_BULK_SELECTION_AND_CONFLICT_REPORT.md), accepted [U1.1 application](../uiux/U1_1_PAYROLL_LAYOUT_CORRECTION_REPORT.md) and installed [BACKUP-1 tooling](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md). LAN-R2A remains paused. No migration, runtime grant, role, dependency, configuration, launcher or financial rule changed.

## Target, recovery and coordinated activation

| Item | Fresh verification |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Primary database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic / 127.0.0.1:5173 / 3001** |
| Schema | **66 accepted migrations**, SQL checksums and applied timestamps unchanged |
| Starting controller / API / Vite | **47348 / 52532 / 42356** |
| Final controller / API / Vite | **21972 / 51068 / 59796** |

Accepted U1.1 and BACKUP-1 hashes matched before work. A fresh checkpoint protects **1,327 existing inputs**, including intervening legitimate documents. Temporary staging at `C:/xampp/htdocs/ldss_ml1_implementation_stage_20261026` used the actual dirty source; Git HEAD was not substituted. Private configuration was not copied into staging. The paused LAN-R2A inventory and earlier ML-1 evidence were rechecked. [Preflight](../../output/ml-1-implementation-20261026/preflight.json), [starting hashes](../../output/ml-1-implementation-20261026/files-before.json).

Before source work, BACKUP-1 captured **85,558,844 SQL bytes / 19,332,340 encrypted bytes** and passed a complete isolated restoration. A second fresh checkpoint with primary ports quiet passed another complete restoration before installation: **85,559,762 SQL bytes / 19,333,038 encrypted bytes**, archive SHA-256 `33a3fe00d93ebabcc68697d8c366f9daf68f8906e4c34416efe096a227f1bf41`. Both covered **149 tables**, complete values/counts/checksums, schema inventory, executable views, triggers, indexes, foreign keys/checks and rejection probes. Newly owned restore schemas/accounts were removed. Neither backup was restored over primary. The small size difference includes the two intervening task logins; distinct snapshots are not claimed to have identical hashes. Archives and keys remain restricted. [Initial recovery](../../output/ml-1-implementation-20261026/recovery.json), [activation recovery](../../output/ml-1-implementation-20261026/activation-recovery.json).

All applicable gates passed before promotion. Only the freshly reverified primary controller tree was stopped. Matching API and frontend source were installed while 3001/5173 were quiet, then started through the unchanged `node scripts/localhost-5173-profile.mjs synthetic` launcher. All **310 starting distribution files** remain exact for retained environments; the matching build is archived separately. The temporary primary-data preview at 3027 rejected command methods. The temporary 3026 browser fixture used only a newly owned fictional database. Both servers are stopped and the fictional schema/account removed. Retained listeners, including LAN 3002/3443 and the retained candidates through 3025, keep their starting owners. [Maintenance](../../output/ml-1-implementation-20261026/maintenance.json), [installed package](../../output/ml-1-implementation-20261026/promoted-files.json), [delivery](../../output/ml-1-implementation-20261026/delivery.json).

## Corrected defect and preserved evidence

The investigation's distinction remains:

| Finding | Verified interpretation |
|---|---|
| Approved Batch 1 | **400 members: 167 already activated, 233 without that conflict** |
| Existing official references | The 167 conflicts belong to the earlier same-year published Masterlists: **160 / 7** |
| Latest approved import | **835 Selected scholars**, without Masterlist activation |
| Duplicates | No duplicate identities/permanent IDs, duplicate annual records or duplicate activation rows established by the investigation |
| Publication error | Correct final duplicate-activation protection; the defect was allowing the overlap to remain selectable and pass earlier review |

Approved Excel import selection is not official Masterlist activation. ML-1 leaves the import, its document/prior-approval evidence and existing annual Selected records intact. An ordinary draft now displays already-activated candidates with a concise reason and the existing official reference, disables their selection, and rejects direct single-add/refresh attempts. Existing operational standing without an activation reference is an explicit review blocker, rather than an invented official reference.

The same check applies before **submission for verification, submission for approval, approval and publication**. Current Batch 1 therefore shows **Review Conflicts (167)** and publication is disabled. Conflict details contain the affected name, permanent Scholar ID, actual official reference/year/effective date and next-action explanation, in pages of 25. Both roles' complete seven-page responses matched all 167 identities, IDs and official references from the original private investigation. The existing restricted CSV remains unchanged; names and IDs are not reproduced in this public report. [Actual API parity](../../output/ml-1-implementation-20261026/api-conflict-parity.json), [source oracles](../../output/ml-1-implementation-20261026/primary-read-oracles.json).

The installed batch source projection also matched the unmodified saved U1.1 candidate reader for **all 1,835 current scholars**, including its original eligibility issues and complete snapshots before the deliberate activation exclusion. This source-only oracle used the existing read-only snapshot adapter; authorization is checked separately by the actual API and disposable role tests. [Original-source parity](../../output/ml-1-implementation-20261026/original-source-parity.json).

No conflict is resolved automatically. Retain the existing activation and review its official record. A supported official correction uses the established amendment workflow with its locked-publication prerequisites. Any decision to return the approved draft, change its membership or include the missing 602 imported scholars remains a separate authorized Staff/Coordinator workflow. ML-1 performs none of those actions.

**`server/masterlists/workflow-service.ts` remains byte-identical**, including its independent final publication duplicate-activation guard. Published/locked history, authorized additions, amendments and consolidation retain their existing paths and safeguards; the new ordinary-draft exclusions are not applied to those carry-forward workflows.

## Selection review and atomic addition contract

The ordinary editable draft offers **Select This Page → Select All Eligible → Review Selection → Add to Draft**. Page selection uses the displayed addable IDs. All-eligible selection covers every addable match in the current working academic year and submitted name/permanent-ID search, across candidate pages. Paging does not reduce that scope to the visible 25 rows.

The review shows matching, eligible, already on the draft, activated outside the draft and other blocked counts. The last four are **mutually exclusive and sum to matching**: existing draft membership takes precedence, then an actual activation reference, then other blockers. Thus an existing member with a later activation is counted as already on the draft; its blocker remains available in row reasons and the separate conflict review. Operational standing with no official activation is counted under other blocked candidates. The displayed addition count includes only reviewed eligible people, and explicitly excludes existing members and blockers.

The current-year pool includes existing associations and initial registry-year matches so incomplete candidates remain diagnosable. Initial registry/ID year alone never confers eligibility. Eligibility retains the existing Selected, accepted Continuing or supported rollover interpretation, selected-year canonical academic placement, approved corrections, supported course-pending exceptions, permanent-ID and prior-graduate checks. Missing or another year's placement cannot supply the selected year's fact.

| Boundary | Implemented contract |
|---|---|
| Matching review scope | At most **5,000** people; excess rejects and requires narrowing the search |
| Atomic addition | **1–1,500** reviewed eligible people; no silent truncation |
| Page selection / returned review details | At most **100** explicit IDs / details per page; UI uses **25** |
| Source reads | Seven set-based current-evidence reads, each bounded to 5,000 decoded rows / 32 MiB; oversized/unavailable approved-placement evidence requires review |
| Request | One **8 KiB-bounded POST** to `/api/v1/masterlists/:id/add-scope` |
| Existing authority | `masterlists.prepare`, fresh actor authorization and existing shared configuration/user/draft transaction locks |
| Confirmation | Exact draft/version, normalized scope, actor-bound HMAC fingerprint, exact addition count, explicit checkbox, reason and reference |
| Staleness | Recompute the complete matching source/category/membership scope at commit; changed draft, actor version, working year, filter, membership or relevant source facts reject |
| Retry | Existing `masterlist_commands` actor/key/hash ledger; same committed key/body returns the original result, different payload rejects |
| Commit | Batched member writes of 100, one draft version increment, complete addition audit and command result in **one transaction** |

No new table, permission, grant or authorization cache was needed. The fingerprint secret is process-private and is not persisted; restarting requires a fresh uncommitted review. Exact retries of already committed commands still use the durable ledger. A failed operation rolls back membership, any supported Continuing annual preparation, audit, command and version changes together.

Accepted Continuing preparation retains the original behavior when its annual record is absent: prepare the supported Continuing annual record and its original audit meaning inside the same transaction. This is not a new Selected decision or activation. No financial, publication or approval command is invoked by bulk addition.

An uncertain browser response pins the exact command body/key, disables evidence edits, dismissal and navigation, and offers **Retry Exact Addition**. A confirmed stale/conflicting response requires a new review. Cancel before submission makes no change. The existing sequential helper remains available only on its previous addition paths; ordinary cross-page selection uses the new atomic operation.

## Exact source boundary

**17 files: nine existing changes and eight additions.** The exact path/hash inventory is authoritative.

| Files | Change |
|---|---|
| `server/masterlists/candidate-source.ts` — new | Shared candidate projection and bounded set-based current sources |
| `server/masterlists/activation-review.ts` — new | Ordinary-workflow classification, current-year matching and actual activation references |
| `server/masterlists/selection-model.ts`, `selection-service.ts` — new | Bounded review, paginated conflicts and atomic actor-bound add-scope operation |
| `server/masterlists/service.ts`, `model.ts`, `routes.ts`; `server/app.ts` | Integrate early checks, shared source projection, response metadata and three routes |
| `src/MasterlistSelection.tsx`, `MasterlistConflicts.tsx` — new | Cross-page selection/confirmation, exact retry and paginated conflict dialogs |
| `src/MasterlistsPage.tsx`, `src/styles.css` | Scoped integration, disabled activated rows, concise conflict summary and responsive dialog/controls |
| `scripts/test-masterlist-selection-db.ts`, `tests/masterlist-selection.test.tsx` — new | Owned 835-person integration scenarios and seven focused unit cases |
| `scripts/test-masterlist-workflow-db.ts`, `test-main-payroll-scenarios.ts`, `test-notifications-db.ts` | Adapt fixtures to the intentionally earlier rejection while preserving original workflow/financial assertions |

**1,318 of 1,327 starting inputs remain exact**, with none missing. The report and task evidence are additional deliverables. The CSS begins with the exact U1.1 prefix. Dashboard, Registry, global navigation/notifications presentation, financial writers/readers/builders, authentication, role mappings, all migration SQL, BACKUP-1, dependencies, local fonts, `.env`, flags and launchers remain exact. The final publication module is unchanged. [17-file hashes](../../output/ml-1-implementation-20261026/candidate-files.json), [source boundary](../../output/ml-1-implementation-20261026/source-preservation.json), [patch](../../output/ml-1-implementation-20261026/ML_1_PRIMARY.patch), [source archive](../../output/ml-1-implementation-20261026/candidate-source.zip), [compatible build](../../output/ml-1-implementation-20261026/compatible-build.zip).

Patch checking and an independent byte-exact apply round trip passed against the saved actual dirty baseline. Archives exclude credentials, keys, `.env`, database records and private evidence. The compatible review build omits server PDF/template assets as explicitly inventoried; it is **not a complete operational LAN release**.

## Tests and browser acceptance

| Validation | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | All exit **0** on final matching staging |
| `npm test -- --maxWorkers=1` | **126 files / 805 tests passed** |
| New owned integration | **Six scenario groups passed**, including 25 / 400 / 835 people |
| Existing disposable integrations | **13 groups with final exit 0**: Masterlist drafts, workflow, amendments/additions/consolidation, academic, approved academic changes, notifications, Registry/Treasury, intake/import, historical/omitted payroll, Recording, reconciliation, individual settlement and financial reports |
| Primary acceptance | Both roles' read-only conflicts, source parity, layouts, native zoom, complete financial previews and preservation passed |

The new integration proves mixed New/Continuing, course-pending support, multiple pages, a filtered 400-person scope, all 835 eligible imports, existing draft members, actor binding, role denial, changed approved academic evidence, filter/fingerprint tampering, stale versions, concurrent competing additions, exact retry and idempotency conflicts. A deliberately late command-ledger failure rolls back all 400 inserted members, the audit and version. A separate failure rolls back accepted Continuing annual preparation. Fictional guarded publication establishes 25 actual activations; competing drafts are rejected at all forward boundaries while original official membership survives. All such mutations use newly owned synthetic databases, never primary or retained data. Financial source pins, R01–R07, output, retry and atomicity checks remain. [Normal checks](../../output/ml-1-implementation-20261026/checks-main.json), [unit log](../../output/ml-1-implementation-20261026/unit-final.log), [new scenarios and measurements](../../output/ml-1-implementation-20261026/selection-integration.json), [13 final regression commands/exits](../../output/ml-1-implementation-20261026/regressions-final.json).

Both roles passed **1440/1024/820/375/320 CSS pixels**, height 900, with no page-level horizontal overflow in the current approved draft and conflict dialog. Fictional selection reviews passed the same widths, including the 835-member existing-draft category. Tables retain local horizontal scrolling on narrow screens. Dialog paging, Cancel/Escape, trigger focus restoration, exact official link targets and **3-pixel keyboard focus** passed.

| Width | Staff primary before / final | Coordinator primary before / final |
|---|---|---|
| 1440 | [Before](../../output/playwright/ml1-primary/staff-before-1440.png) / [Final](../../output/playwright/ml1-primary/staff-after-1440.png) | [Before](../../output/playwright/ml1-primary/coordinator-before-1440.png) / [Final](../../output/playwright/ml1-primary/coordinator-after-1440.png) |
| 1024 | [Before](../../output/playwright/ml1-primary/staff-before-1024.png) / [Final](../../output/playwright/ml1-primary/staff-after-1024.png) | [Before](../../output/playwright/ml1-primary/coordinator-before-1024.png) / [Final](../../output/playwright/ml1-primary/coordinator-after-1024.png) |
| 820 | [Before](../../output/playwright/ml1-primary/staff-before-820.png) / [Final](../../output/playwright/ml1-primary/staff-after-820.png) | [Before](../../output/playwright/ml1-primary/coordinator-before-820.png) / [Final](../../output/playwright/ml1-primary/coordinator-after-820.png) |
| 375 | [Before](../../output/playwright/ml1-primary/staff-before-375.png) / [Final](../../output/playwright/ml1-primary/staff-after-375.png) | [Before](../../output/playwright/ml1-primary/coordinator-before-375.png) / [Final](../../output/playwright/ml1-primary/coordinator-after-375.png) |
| 320 | [Before](../../output/playwright/ml1-primary/staff-before-320.png) / [Final](../../output/playwright/ml1-primary/staff-after-320.png) | [Before](../../output/playwright/ml1-primary/coordinator-before-320.png) / [Final](../../output/playwright/ml1-primary/coordinator-after-320.png) |

Primary pictures use the same current records, role, period, default zoom and settled 25-row table. Identities are masked. Before images were captured before activation; primary was not reverted. Conflict reasons add useful content, so page height is not claimed to decrease: Staff at 1440 changes **2,433→2,509 px**, Coordinator **2,467→2,543 px**. [Actual conflict dialog](../../output/playwright/ml1-primary/actual-conflict-dialog-1440.png), [320-pixel dialog](../../output/playwright/ml1-primary/actual-conflict-dialog-320.png), [Staff acceptance](../../output/ml-1-implementation-20261026/browser-results/review-after-staff.json), [Coordinator acceptance](../../output/ml-1-implementation-20261026/browser-results/review-after-coordinator.json).

The labelled fictional browser scenario filtered to **835 matches / 810 eligible / 25 activated**, reviewed across pages, and explicitly added 810. Its first success response was deliberately lost after commit; the browser retained the exact body/key and the retry confirmed the single addition. No duplicate was inserted. A separate page selection contained 24 addable rows, rather than pretending the blocked row was eligible. The unfiltered fictional fixture additionally contains one accepted Continuing example and one blocked example (**837** total); those additional examples are not primary data or part of the 835-person filtered result. [Fictional browser proof](../../output/ml-1-implementation-20261026/browser-results/fixture-actions.json), [selection review](../../output/playwright/ml1-primary/fictional-selection-review-1440.png), [confirmation](../../output/playwright/ml1-primary/fictional-review-confirm.png), [existing-member categories](../../output/ml-1-implementation-20261026/browser-results/coordinator-fixture.json).

Focused **native Chrome 200%** passed with viewport emulation disabled: **712×424 CSS pixels / DPR 2**. Fictional selection, scrolled confirmation fields and actual-primary conflict paging/keyboard focus passed without page overflow. Captures use the browser's rendered view without resizing. Zoom returned to 100%; all task windows closed. The ui-ux-pro-max and Playwright workflows were used; full assistive-technology/WCAG certification is not claimed. [Native selection](../../output/ml-1-implementation-20261026/browser-results/native-selection.json), [actual native conflicts](../../output/ml-1-implementation-20261026/browser-results/native-conflicts.json), [200% confirmation](../../output/playwright/ml1-primary/native-200-confirmation.png), [200% conflict focus](../../output/playwright/ml1-primary/native-200-conflict-focus.png).

## Performance and loading boundaries

Set-based source reads replace per-person review queries on ordinary drafts. Service-only measurements use the same actual primary records/runtime, one warm-up then three sequential samples per method/role, with no builds or regression suites concurrently. They exclude HTTP middleware, TCP and browser delivery.

| Read / role | Before, ms | After, ms | Service SELECTs before → after |
|---|---|---|---:|
| 400-member detail, Staff | 957 / 1,128 / 934 | **36 / 35 / 37** | **3,741 → 26** |
| 400-member detail, Coordinator | 908 / 914 / 924 | **36 / 37 / 37** | **3,741 → 26** |
| 25 candidates, Staff | 71 / 71 / 69 | **14 / 14 / 14** | **237 → 17** |
| 25 candidates, Coordinator | 66 / 65 / 65 | **14 / 14 / 14** | **237 → 17** |

The new conflict page uses **10 service SELECTs**, about **11–12 ms**, and **9,622 response bytes** for 25 rows. Detail grows **294,923→334,168 bytes** because its existing validation result now includes the 167 genuine blockers. Candidate output grows **18,004→27,046 bytes** for the profiled first page with actual official references. Existing complete draft snapshots remain in the original detail response; ML-1 does not claim that legacy response was converted to a paginated detail contract. New selection/conflict details are paginated. [All service samples/counts/bytes](../../output/ml-1-implementation-20261026/read-performance.json).

The final controlled owned 835-person drill measured review **52.7 / 48.4 / 48.7 ms**, **25 SELECTs**, 3,835 decoded rows / 931,487 decoded bytes, and **5,161 response bytes** for 25 details. Atomic addition measured **130.7 ms**, **24 SELECTs**, 13 write statements and a **74-byte result**; the 400-person filtered addition measured **66.3 ms**, 24 SELECTs and eight write statements. These full Fastify injection counts include authentication middleware and its ordinary session touch; the review's one write is that session activity, not a business mutation. There is no per-scholar HTTP request, full-history download or new financial reader.

Final actual-primary Vite observations at 1440×900 use one warm-up and three full document reloads with cache disabled. A DOM observer waits for the populated 400-member heading, actual 167-blocker summary and 25 stored rows. Staff readiness is **533 / 547 / 533 ms**; Coordinator **489 / 472 / 482 ms**. Each sample has **11 successful API GETs**, body totals **409,670 / 413,718 bytes**. Selection review and conflict-detail requests occur only on demand. These are after-only browser observations; no matched old-browser speedup is claimed. [Staff samples](../../output/ml-1-implementation-20261026/browser-performance-staff.json), [Coordinator samples](../../output/ml-1-implementation-20261026/browser-results/browser-performance-coordinator.json).

Client assets change **1,484,337→1,499,324 bytes**, **+14,987**: JavaScript **+12,938**, CSS **+2,049**; observed CSS gzip **50,485→50,829 bytes**. Fonts/dependencies remain unchanged. The 1,500-addition and 5,000-match limits are rejection boundaries, not maximum-load certification. These local samples do not establish office concurrency, cold-start or LAN capacity. [Bundle inventory](../../output/ml-1-implementation-20261026/bundle-impact.json).

## Current-record preservation and stop

The final full comparison preserves every business-table value/count, all schema objects, 66 migration rows/timestamps, application accounts/password hashes/roles, runtime grants and starting audit rows. This includes scholar identities/permanent IDs, annual registrations and Selected/Continuing evidence, academic/standing histories, exact import/source/document/prior-approval records, Masterlist membership/approval/activation history, entitlements/allocations, frozen payroll sources and every payment/date.

| Primary fact | Before → final |
|---|---|
| Scholars / application accounts | **1,835 / 14**, unchanged |
| Annual intakes / academic / annual scholarship records | **1,835 / 1,835 / 1,835**, unchanged |
| Masterlists / stored entries / activations | **3 / 1,400 / 1,000**, unchanged |
| Current Batch 1 | **approved / version 408 / 400 members**, unchanged |
| Every payment | **2 Paid**, complete original evidence exact; both actual dates **2026-10-24** |
| PAY-001 / PAY-002 | **2 Paid / 798 Pending** and **200 Pending**, both recordable |

Complete before/after payment summaries and previews are exact: **798 / 200** accepted, zero conflicts, no preview committed. All **18,517 original audit rows** remain exact. Only two task logins and two logouts were appended (**18,521 total**); sessions **53→55**, with normal revocation/last-seen/rate-limit activity. This is qualified authentication activity, not zero database writes. Both task sessions signed out with **204**, then `auth/me` returned **401**. The user's separate session/profile was untouched. Primary browser business-write guards recorded **zero attempts**. [Final preservation](../../output/ml-1-implementation-20261026/final-preservation.json), [financial reads](../../output/ml-1-implementation-20261026/readiness-after.json), [Staff signout](../../output/ml-1-implementation-20261026/signout-staff.json), [Coordinator signout](../../output/ml-1-implementation-20261026/signout-coordinator.json).

The **76 paused LAN-R2A artifacts and 16 prior ML-1 evidence files** remain exact. No operational database was used for this work. Retained source/distribution/listener preservation is not a new exhaustive inventory of every retained database.

Initial automation issues are retained and qualified: fixture names first triggered the unchanged similarity validator, test helper typing needed correction, and old fixtures attempted post-activation preparation. The financial graduation-removal fixture now prepares its competing draft before official activation; the notification fixture starts ordinary review without pre-existing standing; addition-specific duplicate tests attach their real addition target first. Their original downstream assertions pass. A preservation helper initially compared JSON date strings with Date objects; normalization corrected the comparison without changing stored values. The first maintenance quiet check sampled sockets immediately after verified tree termination; it stopped before recovery/source installation, and a fresh check confirmed both ports quiet before continuing. A browser timing attempt reused a hash navigation; only subsequent actual document-reload samples are reported. No application safeguard, financial pin, permission or test bound was weakened.

Remaining limits: current primary has no editable ordinary draft used for positive bulk-add acceptance, so positive additions, races and failures are demonstrated only on owned fictional databases. Expanded review and conflict reasons add legitimate scrolling; narrow tables scroll locally. Full assistive-technology, maximum-capacity, cold-start, concurrency and office/LAN acceptance remain unverified. The existing Vite chunk warning remains. The approved Batch 1 still requires an explicit authorized human decision; implementation does not make its conflicting membership publishable.

Saved accepted U1.1 source is under `output/ml-1-implementation-20261026/baseline/`; the [U1.1 compatible build](../../output/u1-1-payroll-primary-20261026/compatible-build.zip) remains available. Any future rollback must coordinate compatible API/frontend/source while preserving later legitimate edits and BACKUP-1 recovery capability. No database restore, schema downgrade, activation reversal or history deletion is appropriate for this source change.

LAN-R2A can consider this package only through a separately authorized, complete release inclusion/rehearsal. Matching API/UI, existing grants and exact 66-schema compatibility are required; no migration or new permission is needed. This task neither updates paused artifacts nor supplies operational deployment acceptance, financial authority, office recovery certification or a complete production package.

**Stopped after ML-1 implementation, primary activation, verification and reporting. No primary Masterlist membership, approval, activation, account, payment or historical evidence was changed. No LAN-R2A resumption or LAN deployment occurred.**
