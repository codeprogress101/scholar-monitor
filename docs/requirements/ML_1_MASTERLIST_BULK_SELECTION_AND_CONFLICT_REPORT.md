# ML-1 — Masterlist selection and publication conflict investigation

26 October 2026, Philippine time. **Read-only investigation completed; implementation stopped at the required recovery gate. No ML-1 application change was installed.** Primary remains on the accepted U1.1 source. The user's additional duplicate-investigation priority is included in this same report. LAN-R2A remains stopped.

The current approved **Batch 1** contains **400 scholars**, of whom **167 already have an annual activation through a published Masterlist for the same academic year**. The remaining **233 have no existing Masterlist activation**. The new 835-person import did not create duplicate activation rows. Publication is correctly preventing a second activation; candidate selection and pre-publication review do not explain that conflict adequately.

## Mandatory recovery stop

The ML-1 instruction explicitly says: **“If exact-target verification or recovery fails, STOP before modifying source.”** Exact-target checks passed, but the fresh backup failed in `scripts/backup-lib.mjs:69`: its `mysqldump` output exceeded the existing **64 MiB SQL limit (67,108,864 bytes)**. This was the size-limit branch, not an inferred authentication failure or restore mismatch.

No valid new encrypted archive was produced, so no isolated restoration was attempted. The stage directory was never created. No backup limit, source, schema or grant was changed; the existing 96 MiB archive and 100,000-row-per-table limits also remain. The backup connection's cleanup releases its source-schema read locks. No backup was restored over primary. Older successful U1.1 recovery evidence was not substituted for a fresh recovery check of today's larger database.

Only read-only diagnosis and this report continued. Cross-page UI/API implementation, source activation and mutation acceptance remain **blocked**, not completed. A reviewed recovery method supporting the current database size must first produce a fresh encrypted checkpoint and pass an isolated restore. This report does not authorize raising limits or changing the backup format. [Recovery blocker](../../output/ml-1-primary-20261026/recovery-blocker.json).

## Verified current target and checkpoint

| Item | Verified result |
|---|---|
| Host / MariaDB | `DESKTOP-BPLJKRP` / `127.0.0.1:3306` |
| Database | `ldss_primary_test_12676_61497616` |
| Runtime | `ldss_primary_12676_61497616@localhost` |
| Profile / frontend / API | Existing synthetic / loopback 5173 / 3001 |
| Controller / API / Vite | **47348 / 52532 / 42356**, unchanged ownership and parent relationships |
| Schema | **66 migrations**, accepted SQL checksums verified; final journal and schema definitions exact |
| Protected existing files | **1,324**, all byte-identical at final comparison |
| Paused LAN-R2A checkpoint | **76 inventoried files**, all byte-identical; no LAN work resumed |

The current dirty workspace and actual database were inventoried, rather than assuming the older 1,000-person checkpoint was current. Current primary has **1,835 scholars**, not 1,000. The accepted three-file U1.1 package matched before investigation. Credentials and detailed identity evidence remain in restricted private storage; reports contain no passwords or source workbook contents. [Starting file hashes](../../output/ml-1-primary-20261026/files-before.json), [paused-artifact checkpoint](../../output/ml-1-primary-20261026/lan-r2a-paused-inventory.json), [final verification](../../output/ml-1-primary-20261026/preservation.json).

## Exact conflict relationships

All three lists use **TWO-BATCH-YEAR**. References below are stable masked record references, not new business IDs.

| Record | Masked reference | Current state / members | Members of approved Batch 1 already activated here |
|---|---|---|---:|
| Batch 1 under investigation | `5a10bf5b1088` | **approved**, version **408**, 400 members | **167 total conflicts** |
| Synthetic official prior payroll 1 | `bcc2c277d61b` | **published**, version **805**, 800 members | **160** |
| Synthetic official prior payroll 2 | `9e35e92a4e7c` | **published**, version **205**, 200 members | **7** |

The two official records are **Masterlists**, despite “payroll” in their titles. Their publications and activations are dated **2026-10-24**. Every one of the 167 conflicting people:

- Has the same permanent identity in the current approved list and the existing official list.
- Has a selected-year annual scholarship record matching the approved list's stored scholarship ID.
- Has that same annual record already marked operationally **active**, with an existing `masterlist_activations` reference to one of the two publications above.
- Is present in both that official list's current membership and its frozen publication snapshot.

All 400 stored annual references match their selected-year annual records. There are no standing-only conflicts without an activation reference among these members. No addition-target or consolidation proposal exists in the current database; Batch 1 is an ordinary new-activation list.

The exact **167 names, permanent Scholar IDs, annual-record IDs, official-list IDs, source-row references and activation dates** are available to the authorized local operator in the [restricted conflict CSV](../../output/ml-1-primary-20261026/private/conflicting-scholars.csv). Keep that file private; it is not a public review archive. The [masked per-scholar roster](../../output/ml-1-primary-20261026/masked-conflicts.json) provides a unique masked scholar reference and corresponding official record for each conflict. The complete relationship evidence is retained privately. [Sanitized investigation](../../output/ml-1-primary-20261026/investigation.json).

### Distinguishing the suspected duplicates

| Check | Actual result | Interpretation |
|---|---:|---|
| Repeated permanent Scholar IDs | **0 groups** | No duplicated permanent-ID value found |
| More than one annual scholarship record per scholar/year | **0 groups** | No duplicate annual-record pair found |
| More than one activation row per annual record | **0 groups** | No duplicate activation row found; the publication guard is preventing another attempt |
| Repeated active membership within the same list | **0 groups** | No duplicate member within a single list |
| Approved Batch 1 membership overlapping existing same-year official membership | **167 scholars** | This is the actual conflict |
| Matching trimmed/case-folded first name + last name + birth-date groups | **0 groups** | This limited identity-collision check found no candidate groups; it does not prove that every possible real-world identity duplication is absent |

The database and read-only checks establish repeated **membership/activation attempts involving existing identities**. They do not support deleting people or merging identities.

## The actual import-to-publication workflow

Three imports are confirmed:

| Confirmed import, masked reference | People / Selected created | In approved Batch 1 | Current annual activation |
|---|---:|---:|---|
| Earlier import `c76cf22ea2f3` | **800 / 800** | **160** | Already active through first official Masterlist |
| Earlier import `e0fe0477b723` | **200 / 200** | **7** | Already active through second official Masterlist |
| Latest import `b442f53ef11a` | **835 / 835** | **233** | All **835 have no Masterlist activation** |

The latest import confirmed at **03:27:38 on 26 October Philippine time**. It contains **385 New / 450 Continuing**, all currently Selected with no operational activation. Its 835 annual `select` events were independently checked for the matching import reference. Its prior-batch approval contains **835 members**, recorded at **03:31:01**, with supplied approval date **2026-10-20**.

Batch 1 was created at **03:35:34**, after that import and prior approval. Its 400 members combine **167 earlier, already-activated scholars** with **233 from the new import**; **602 of the latest import's people are not on this list**. The approved list's classification mix is **139 New / 261 Continuing**. Its history records submission, approval, return to draft, and renewed submission/approval, ending at version 408. No successful publication event exists for it. The failed Publish request itself was not replayed on primary.

The code explains this result:

1. [Excel confirmation](../../server/imports/service.ts) uses the existing qualification service to **create → validate → select** annual records when the approved-selection option is supported and Coordinator-authorized. Selection is distinct from operational activation. It does not insert `masterlist_activations`.
2. [Prior-batch approval](../../server/requirements/prior-approval-service.ts) records source-backed document and semester-review evidence. It does not create a Masterlist activation or override one. This investigation verified retained approval membership and source checksums; it did not certify a new COR/COG decision or infer physical receipt from the generic workflow title.
3. [Candidate eligibility](../../server/masterlists/service.ts), function `candidate`, checks Selected/accepted Continuing and academic evidence, but does **not** exclude an already-activated annual record. Those earlier scholars remain Selected as well as operationally active, so they can still appear selectable.
4. Ordinary draft validation reuses that candidate projection. [Addition review](../../server/masterlists/additions.ts) checks activation only after an addition target exists; it returns early for this ordinary list. The repeated membership can consequently pass submission and approval.
5. [Final publication](../../server/masterlists/workflow-service.ts) separately checks annual operational standing and `masterlist_activations` and rejects the second activation with `ALREADY_ACTIVATED`. That guard is correct and must remain.

**Finding:** correct final duplicate protection combined with an earlier selection/review defect and an unhelpfully generic final message. The approved Excel option is not demonstrated to be wrong. Repeating verification or prior approval will not resolve these 167 existing activations.

## Supported next action for each group

| Group | Authorized review path; no action performed by this task |
|---|---|
| 160 conflicting members of first official list | Open that existing official Masterlist and retain its identity, annual activation and frozen membership. Review the intended new-list membership with the responsible Coordinator. |
| 7 conflicting members of second official list | Same review against the second official Masterlist. They cannot be activated again through Batch 1. |
| A genuine correction to an existing official member | Use the existing official-version/amendment workflow for a supported correction. Both current official lists are **published**, not locked; amendment prerequisites require a locked latest publication and the appropriate permissions. No list was locked and no amendment was requested. The generic error is not blanket authorization to amend unchanged membership. |
| 233 new-import members without an activation | Review intended membership and all remaining source/eligibility checks. “No activation conflict” is **not** a certification that every publication requirement currently passes. |
| Intent is a Masterlist for all 835 newly imported people | The present mixed 400-member list does not represent that scope. The Coordinator must decide how to use the existing Return to Draft and preparation/reapproval workflow. Do not automatically remove the 167, add the missing 602, preserve a stale approval, or publish. |

No current draft was edited, returned, published, locked or amended. No scholar, date, classification, approval or verification was changed.

## Cross-page implementation status and smallest bulk-write proposal

**Not implemented because fresh recovery failed.** The current “Select all eligible” remains page-scoped. Source inspection also identifies a separate authorization boundary: `parseEntry` accepts one `scholarId` and one `expectedVersion`; the current UI constructs sequential commands through `runBulkJobs`. Each successful command is committed independently, and a later failure stops the remaining jobs. Exact single-command retry exists, but that is not a whole-scope atomic add or an all-sources stale-preview contract.

The ML-1 instruction explicitly requires stopping a whole-scope addition that needs a new business-write contract beyond the approved scope. Do not extend the existing sequential helper to 835 candidates and claim complete atomic success.

After the recovery gate is satisfied, the smallest proposal for separate approval is:

1. A strictly authorized, bounded **read-only scope review** tied to actor, draft ID/year/version and normalized current search/filter values. Reuse the existing eligibility/source meaning, including accepted Continuing evidence and approved academic precedence. Distinguish already-on-draft, official activation conflicts, other unresolved sources and final addable candidates. Define overlapping-count semantics explicitly. Keep paginated names/IDs and authoritative official destinations separate from compact counts; fail closed above an explicitly reviewed capacity.
2. A new **single atomic add-scope command**, requiring explicit confirmation, the exact review fingerprint, current draft version, reason/reference and an idempotency key. Recompute the same scope under existing authorization/configuration and draft/source concurrency conventions; reject changed filters, draft state, identities, academic/annual sources or activations. Add every reviewed addable member or none, retaining existing single-person preparation semantics and audit evidence. Exact retry must return the original committed result; a reused key with a different request must fail. No silent conflict omission or partially successful whole-scope result.
3. Prefer the existing command/audit ledger and existing preparation permission; justify any insufficient result-storage contract separately. **No schema or permission change is assumed or authorized by this proposal.** Preserve all publication and unique-activation guards. Explicitly handle addition/consolidation lineage so frozen carried-forward official members are not wrongly treated as new activations.
4. Then deliver Select This Page / Select All Eligible / Review Selection / Add to Draft, cancel/focus behavior and paginated Review Conflicts. UI review must not itself add, activate or publish.

Stale review, concurrent requests, lost response/exact retry, rollback and large-scope mutation tests remain required on newly owned disposable synthetic targets. No new command, endpoint or business status was created during this investigation.

## Measurements and acceptance actually performed

The diagnostic used a read-only transaction through the verified primary runtime, with bounded result guards. It did not fetch a full history or eligibility profile per scholar. These are **single observations of a diagnostic**, not application endpoint benchmarks:

| Read | SQL elapsed | Returned rows / decoded JSON bytes |
|---|---:|---:|
| Masterlist metadata | **28.6 ms** | **3 / 1,090** |
| Current-list identity/annual/activation/source relationships | **91.9 ms** | **400 / 340,025** |
| Confirmed import result references | **14.8 ms** | **3 / 290,488** |
| Prior-approval batch counts | **145.7 ms** | **3 / 699** |
| Imported annual-state aggregate | **36.5 ms** | **6 / 1,160** |

The diagnostic made **12 measured SELECTs**, including identity verification and duplicate checks; subsequent independent preservation/frozen-snapshot checks are separate. No browser payload, new initial page query or API response was added. The private diagnostic result is not a proposed browser response. [All measured reads](../../output/ml-1-primary-20261026/investigation.json).

| Requested acceptance | Status |
|---|---|
| Actual 400-member conflict investigation / exact 167 identities / frozen official membership | **Verified read-only** |
| Latest 835-person import / Selected events / activation separation | **Verified read-only** |
| Original records, source, grant, migration and paused-artifact comparison | **Verified with concurrent-activity qualification below** |
| Cross-page candidate counts/review/atomic bulk add | **Not implemented or benchmarked** |
| Disposable 25 / multi-page / 835 add, concurrency, retry and rollback scenarios | **Not run; no new writer exists** |
| Staff/Coordinator browser, five widths, native 200%, before/after screenshots | **Not performed for ML-1; no UI change exists** |
| Lint/typecheck/build/unit/secrets and relevant integration suites | **Not run for ML-1; implementation stopped before staging/source edits** |

No prior U1.1 screenshots or test counts are relabelled as ML-1 acceptance. Full UI/API/SQL performance and regression acceptance remain outstanding.

## Current-record preservation

All **1,324 starting protected files**, including all application source and shared distribution assets, remain byte-identical. No existing file was missing. Application files changed: **none**. Additions are this report and task-local checkpoint/read-only diagnostic helpers and evidence under `output/ml-1-primary-20261026/`; the private evidence directory has restricted ACLs.

| Current primary fact | Starting → checked state |
|---|---|
| Scholars / accounts | **1,835 / 14**, unchanged |
| Annual intakes / academic records / scholarship records | **1,835 / 1,835 / 1,835**, exact |
| Masterlist versions / entries / activations | **3 / 1,400 / 1,000**, exact |
| Approved Batch 1 | **400 members, approved version 408**, exact |
| Confirmed imports / prior-batch members | **3 / 1,835**, exact |
| Entitlements | **1,000**, exact; all other unchanged financial tables also compared |
| Payments | **2 Paid**, complete rows exact, both effective dates **2026-10-24** |
| Migration journal / definitions / runtime grants / account and role tables | Exact |

The full 149-table comparison found changes only in `audit_logs`, `auth_sessions` and `notification_events`. All **18,516 original audit rows** remain exact; one concurrent **`data.exported`** event brought the checked total to **18,517**. Notification-event count changed **4,544→4,545**; its row-level history was not separately captured, so this report does not claim every original notification row was independently matched. Existing session activity also changed its checksum, with **53 sessions** at final check. **This investigation performed no login, export or business command**; these concurrent application changes are recorded rather than attributed to the task or erased. [Preservation](../../output/ml-1-primary-20261026/preservation.json), [activity qualification](../../output/ml-1-primary-20261026/activity-qualification.json).

A first audit-qualification read through the restricted runtime was correctly denied. The existing administrative read-only inventory context was used for that comparison; no runtime grant was expanded. Read-only diagnostic connections were closed. No service was restarted, source installed, `.env` repointed or retained database used for mutations.

## Paused LAN-R2A compatibility and remaining work

LAN-R2A was not resumed or deployed. The **76 files in the ML-1 paused-artifact checkpoint** remain exact, including the inventoried staged source package; this is not a new full inventory of every protected LAN file or database. Existing LAN and retained listener owners were observed without restarting them. No operational database query was part of this ML-1 investigation.

There is currently **no implemented ML-1 API/client package** to include in LAN. A later approved implementation must include matching read-only review API, UI, atomic command only if separately authorized, and its source/permission/concurrency/performance tests in the paused release's reviewed baseline. Reassess its restricted-pilot command classification before inclusion; do not infer allowance from a route name or copy only client files. No migration or new permission is presently established as necessary. Dependency, build and operational acceptance from paused LAN-R2A remain separate and unfinished.

**Stopped at the required fresh-recovery failure. Actual conflict diagnosis is complete; ML-1 application implementation and acceptance remain incomplete.** Resolve the current-size recovery gate first, then obtain the explicitly required decision on the proposed whole-scope write contract. Preserve the approved draft and all current legitimate records throughout. No deletion, activation correction, guard bypass, automatic publication or LAN operation occurred.
