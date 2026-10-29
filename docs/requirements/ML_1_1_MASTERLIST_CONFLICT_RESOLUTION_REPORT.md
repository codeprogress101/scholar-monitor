# ML-1.1 — Existing Masterlist conflict resolution

26 October 2026, Philippine time. **The existing individual-removal workflow is now easier to reach and is verified on [primary localhost:5173](http://127.0.0.1:5173/#masterlists). The requested selected-set, conflict-revalidated atomic removal is NOT implemented: it requires a new write contract, and that portion is stopped under the user's instruction.** No primary member was removed or workflow transition submitted during this task.

The current screen is the **same Batch 1**, legitimately advanced since the [ML-1 report](ML_1_MASTERLIST_IMPLEMENTATION_REPORT.md): **Draft / version 410 / 1,002 members / 167 activation conflicts**. All those facts remain unchanged at final verification. LAN-R2A and the operational LAN installation remain untouched.

## Actual list and intervening history

| Item | Fresh result |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | **synthetic / 127.0.0.1:5173 / 3001** |
| Masterlist ID | **`a6f45315-4b8b-46f8-b91d-bedc58cd6cc2`** |
| Academic year | **TWO-BATCH-YEAR**, `36d55426-f578-418d-a942-3596a68f65e2` |
| Current workflow | **Draft, version 410**, year unlocked and unarchived |
| Current active membership | **1,002**, with **zero** previously removed entries at task start |
| Controller / API / Vite, before and after | **21972 / 51068 / 59796**, commands and ancestry unchanged |
| Schema | **66 accepted migrations**, SQL checksums and applied timestamps unchanged |

The audit explains the difference from the earlier report; this is not a different list or an invented replacement checkpoint:

| Philippine time, 26 October 2026 | Recorded action | Result |
|---|---|---|
| 03:44:12 | Coordinator approval | Approved **v408 / 400 members**, the earlier ML-1 evidence |
| **05:35:53** | Existing `masterlist.return-draft` | Approved → Draft, **v409 / 400 members** |
| **05:37:53** | Existing `masterlist.add-scope` | Explicit addition of **602**, **v410 / 1,002 members** |

The later actions identify a Coordinator account and have their existing audit/command evidence. The 602 recorded added IDs match the 602 additional current members exactly. All original 400 entry identities and annual-record relationships remain present. The added people are Selected annual records without existing activation. Together with the original 233 unactivated members, they account for the latest 835 imported scholars now on this draft. These records are preserved as legitimate intervening state, not overwritten with the old 400-member checkpoint. [Inspection and audit timeline](../../output/ml-1-1-primary-20261026/inspection.json), [membership/audit relationship checks](../../output/ml-1-1-primary-20261026/relationships.json).

The same 167 original overlaps remain:

| Existing same-year official record | Actual ID | Conflicting current draft members |
|---|---|---:|
| Synthetic official prior payroll 1 | `a69b0f81-e839-46c6-b45b-7eadeb418b1f` | **160** |
| Synthetic official prior payroll 2 | `3d889086-4b03-4c2c-aafe-4697c42b8487` | **7** |

Their official activation relationships match the original investigation. The two official lists remain published, with 800 / 200 members and versions 805 / 205. No new duplicate-identity conclusion is inferred from the larger membership count. Exact member/annual relationships are restricted evidence; scholar names and permanent IDs are not printed in this report.

## Existing functionality and actual UI gap

| Question | Finding |
|---|---|
| Is Return to Draft available and authorized? | **Yes**, for review/approval states in an unlocked year, under existing **`masterlists.approve`** authority. Coordinator-only enforcement was verified. It already happened at v409. Because the current list is now Draft, there is no further Return to Draft action to perform. |
| Is approved-list editing intentionally restricted? | **Yes.** Existing entry writes require Draft and an available academic year. Direct approved editing is rejected. Return to Draft bypasses candidate-validation blockers so conflicts do not prevent the authorized return itself. |
| Can the existing draft editor remove members? | **Yes, one member per confirmation.** Both roles had 25 enabled Remove controls on the visible first member page before this change. Searching an actual conflicting permanent ID, opening its original removal form and cancelling worked. |
| Was an existing action hidden from conflict review? | **Yes.** Review Conflicts was read-only and directed attention toward official amendments, without connecting users to the already-supported draft-removal form. The original removal confirmation also kept the selected identity in a visually hidden legend rather than visible confirmation text. |
| Is there an atomic selected-set conflict-removal command? | **No.** The existing entry endpoint accepts one `scholarId`. ML-1's `add-scope` contract only adds members. A loop of single removals would not be an all-or-nothing selected-set operation. |

The cause is therefore **a discoverability/confirmation gap plus a separate missing bulk contract**, not a need to permit approved-list editing or delete duplicate Registry records. On narrow screens the member table also uses local horizontal scrolling; its existing Actions column remains available. [Before-control proof](../../output/ml-1-1-primary-20261026/before-coordinator.json), [existing entry writer](../../server/masterlists/service.ts), [workflow authority and state transitions](../../server/masterlists/workflow-validation.ts).

## Implemented: access to the existing individual correction

In an editable unpublished ordinary Draft, each conflict row now offers **Review draft removal**. It closes conflict review and opens the **existing** single-member removal form. The form visibly names the selected scholar and permanent ID, requires its existing reason/evidence handling, and retains explicit **Remove from draft** and Cancel controls. The new shortcut is absent when the list is in review/approval or its year is unavailable. Published/locked records retain their existing amendment rules.

The action only opens a form. It does not preselect all conflicts, submit a command, change workflow state or alter membership. Keyboard focus returns to Review Conflicts after cancellation; the two dialogs are not left open together. The shortcut has a 44-pixel minimum height and a 3-pixel keyboard focus outline.

The writer remains the unchanged existing endpoint:

`POST /api/v1/masterlists/:id/entries`, with `action: "remove"`, one exact `scholarId`, `expectedVersion`, existing reason/reference and idempotency key.

It rechecks fresh authority, Draft/year availability, draft version and active membership, then soft-removes that one draft entry, clears its draft award number, increments the draft version, and records its before/after audit and command ledger in one transaction. Failures roll back that operation. Scholar identities, annual scholarship records, source documents, prior approvals and official activations are not deleted or changed.

**This generic single-member command does not revalidate that the member remains an activation conflict at commit. It supports authorized removal of any chosen draft member. It must not be described as the requested conflict-only selected-set write contract.** There is no checkbox selection of multiple members and no new bulk removal command in this delivery.

For the current list, an authorized user may open Review Conflicts, choose **one specific member's Review draft removal**, inspect the visible identity and official reference, supply their own reason and explicitly confirm if that is their intended correction. The current list is already Draft. After changes, the existing verification → submission for approval → Coordinator approval sequence remains required. Remaining conflicts still block forward review/publication. **This task performed none of those primary corrections or transitions.**

## Stopped portion: minimum new contract required

The user's boundary is explicit: **“If safe removal requires a new write contract, migration or permission expansion, report the minimum required change and STOP that portion.”** The requested multi-member atomic operation with fresh conflict revalidation requires a new write contract. It has not been coded, exposed, simulated as an existing feature, or activated.

The minimum separately reviewable extension would be one conflict-specific removal operation, for example a **proposed** `/api/v1/masterlists/:id/remove-conflicts` POST:

1. Accept an explicit bounded ID set, exact draft/version, confirmation, reason/reference and idempotency key. A conservative initial proposal is **1–100 unique selected IDs within an 8 KiB body**, reusing existing page-selection bounds; reject excess rather than truncate. Any larger bound needs its own approval and tests. There must be no default “remove all 167.”
2. Bind review to actor, draft/version, selected IDs and the reviewed activation/standing relationships, using a tamper-resistant fingerprint or equivalent stale-review check.
3. Inside the existing guarded transaction, reauthorize; require an editable unpublished ordinary draft; re-read each selected active member and its same-year conflict. Reject changed/resolved conflicts, foreign members, duplicate IDs, stale versions and protected official workflows without removing anything.
4. Soft-remove only the confirmed set, retain membership/source history, increment the draft version once, and write a complete selected-set audit and existing command-ledger result atomically. Exact retries must return the original confirmed count; failed/concurrent operations must roll back fully.
5. Keep the list Draft and require resubmission/reapproval. Leave publication's independent guard, official activations and all financial evidence unchanged.

Source inspection indicates the existing `masterlists.prepare` permission, tables and command ledger are suitable foundations; **no schema migration or permission expansion has been shown necessary**. That is a design finding, not implementation or acceptance of this new contract. Selected-set stale-conflict, concurrency, rollback and retry acceptance remains future work. A client-side loop or an extension of `add-scope` to silently remove members would not satisfy this requirement.

## Source boundary, checkpoint and installation

Only **three existing presentation files** changed; no application file was added:

| File | Change |
|---|---|
| [src/MasterlistConflicts.tsx](../../src/MasterlistConflicts.tsx) | Draft-only per-member shortcut, accurate draft-versus-official explanation, safe dialog handoff |
| [src/MasterlistsPage.tsx](../../src/MasterlistsPage.tsx) | Reuse `openForm("remove", ...)`, show the exact selected identity, restore the conflict trigger after cancellation |
| [src/styles.css](../../src/styles.css) | One scoped minimum-height rule after the exact accepted ML-1 CSS prefix |

Every backend file, route, writer, validator, authorization mapping and migration remains exact. The original Return to Draft, single-remove and final-publication implementations are unchanged. No new endpoint, financial query, polling, dependency, font, flag, `.env`, launcher or global dialog implementation changed. **1,333 of 1,336 protected existing inputs remain exact**, with none missing; the report and task-local evidence are additions. All **310 starting distribution files** remain exact. All **280 compiled server JavaScript files** match the accepted ML-1 review build. [Source boundary](../../output/ml-1-1-primary-20261026/source-preservation.json), [three-file hashes](../../output/ml-1-1-primary-20261026/candidate-files.json), [compiled-server comparison](../../output/ml-1-1-primary-20261026/build-verification.json).

Temporary staging at `C:/xampp/htdocs/ldss_ml11_primary_stage_20261026` used the freshly verified actual dirty ML-1 source. A new BACKUP-1 checkpoint passed complete isolated restoration before source changes: **149 tables, 86,542,206 SQL bytes / 19,564,402 encrypted bytes**, SHA-256 `9dbe679c6bf7cc8733230c3a8a162b526818b24fa7547758e09a47572ec3a29e`. Values/counts/checksums, journal, schema objects, constraints, indexes, triggers, executable views and rejection probes passed. The newly owned recovery target/account were removed; nothing was restored over primary. Existing finite backup bounds, key custody and private archive restrictions remain. [Preflight](../../output/ml-1-1-primary-20261026/preflight.json), [recovery](../../output/ml-1-1-primary-20261026/recovery.json).

Normal checks, disposable regressions and staged browser checks preceded installation. A fresh source/business check protected the current 1,002-member version. Exact reviewed frontend files were installed atomically, with the optional child control before its parent. Final focus corrections repeated normal checks and were tested in isolated Vite delivery before final installation. Existing primary Vite served the changes; **no primary or retained process restart occurred**. Temporary compiled preview 3027, isolated Vite 3028 with its own cache, and fictional fixture 3026 are stopped. [Installed hashes](../../output/ml-1-1-primary-20261026/promoted-files.json), [delivery/process verification](../../output/ml-1-1-primary-20261026/delivery.json).

Client assets change **1,499,324→1,500,680 bytes**, **+1,356**: JavaScript **+1,277**, CSS **+79**; observed CSS gzip **50,829→50,841 bytes**. Backend requests/readers are unchanged; opening the shortcut reuses the existing form. No new load or capacity benchmark is claimed. [Bundle inventory](../../output/ml-1-1-primary-20261026/bundle-impact.json).

## Tests, responsive and keyboard acceptance

| Final check | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | All exit **0** on final matching staging |
| `npm test -- --maxWorkers=1` | **126 files / 805 tests passed** |
| Existing disposable regressions | **Nine groups exit 0**: Masterlist drafts, workflow/approval, amendments/additions/consolidation, intake/import, historical/omitted payroll, Recording, reconciliation, individual settlement and financial reports |
| Task-only owned integration | **Eight groups passed**: six ML-1 selection/source groups plus two individual-removal/approval-preservation groups |
| Final primary browser | Staff and Coordinator, five widths, current 167-conflict review, exact identity, required reason, Cancel/Escape and focus restoration passed; no business command attempted |

The removal drill proves approved removal denied, Staff return denied, Coordinator return with genuine conflicts allowed, stale-version and technical/unassigned-role denials, a deliberately failed removal audit with complete rollback, exact retry/idempotency conflict, and one explicit removal leaving the other **24** conflicts. Remaining conflicts still reject submission. After individually correcting the fictional draft and adding a supported unactivated member, the complete resubmission/reapproval sequence is required. Direct return/removal of the published fixture remains denied. Original scholar, annual, import, official publication/activation and financial-source tables match exactly around that correction drill.

All mutation acceptance used newly owned fictional databases. The actual browser confirmed **one** fictional member's removal through the existing command, changing its fixture's 25 conflicts to 24; its one POST used the expected draft version. This was not primary data or a selected-set operation. Both owned fixture attempts and their technical accounts were removed. Existing financial suites retain source guards, R01–R07, retry/atomicity and complete output checks. The final subsequent changes concerned only focus/display; normal checks and actual primary browser acceptance were repeated, with backend bytes unchanged. [Final normal checks](../../output/ml-1-1-primary-20261026/checks-main.json), [unit log](../../output/ml-1-1-primary-20261026/unit-final.log), [nine exact regression commands/exits](../../output/ml-1-1-primary-20261026/regressions-final.json), [eight-group result](../../output/ml-1-1-primary-20261026/selection-integration.json), [fictional browser removal](../../output/ml-1-1-primary-20261026/browser-results/fixture-removal.json), [review/published UI restrictions](../../output/ml-1-1-primary-20261026/browser-results/fixture-restrictions.json).

Both primary roles passed **1440/1024/820/375/320 CSS pixels**, height 900, in conflict review and the existing removal form without page/dialog horizontal overflow. Tables retain local horizontal scrolling. The action measures **44 pixels high**, with **3-pixel** keyboard focus; the selected ID matches the form, only one modal remains open, and cancellation returns focus correctly. Names/IDs are masked in actual-data captures. Before images were taken before installation; primary was not reverted.

| Width | Original read-only conflict dialog | Final conflict shortcut / named confirmation |
|---|---|---|
| 1440 | [Before](../../output/playwright/ml11-primary/before-conflicts-1440.png) | [Conflict review](../../output/playwright/ml11-primary/coordinator-after-conflicts-1440.png) / [Form](../../output/playwright/ml11-primary/coordinator-after-removal-1440.png) |
| 1024 | [Before](../../output/playwright/ml11-primary/before-conflicts-1024.png) | [Conflict review](../../output/playwright/ml11-primary/coordinator-after-conflicts-1024.png) / [Form](../../output/playwright/ml11-primary/coordinator-after-removal-1024.png) |
| 820 | [Before](../../output/playwright/ml11-primary/before-conflicts-820.png) | [Conflict review](../../output/playwright/ml11-primary/coordinator-after-conflicts-820.png) / [Form](../../output/playwright/ml11-primary/coordinator-after-removal-820.png) |
| 375 | [Before](../../output/playwright/ml11-primary/before-conflicts-375.png) | [Conflict review](../../output/playwright/ml11-primary/coordinator-after-conflicts-375.png) / [Form](../../output/playwright/ml11-primary/coordinator-after-removal-375.png) |
| 320 | [Before](../../output/playwright/ml11-primary/before-conflicts-320.png) | [Conflict review](../../output/playwright/ml11-primary/coordinator-after-conflicts-320.png) / [Form](../../output/playwright/ml11-primary/staff-after-removal-320.png) |

Focused **native Chrome 200%**, viewport emulation disabled, passed at **712×424 CSS pixels / DPR 2** on actual primary. Keyboard access to the conflict action, the named form and reason field, cancellation and reflow passed. Captures use the rendered browser view without resizing. Zoom returned to 100%; task windows closed. The ui-ux-pro-max and Playwright workflows were used. [Staff acceptance](../../output/ml-1-1-primary-20261026/browser-results/after-staff.json), [Coordinator acceptance](../../output/ml-1-1-primary-20261026/browser-results/after-coordinator.json), [native evidence](../../output/ml-1-1-primary-20261026/browser-results/native-review.json), [200% form](../../output/playwright/ml11-primary/native-200-removal-form.png). Full assistive-technology/WCAG certification is not claimed.

## Preservation, limitations and stop

The final 149-table comparison proves all starting business values/counts, schema objects, 66 migration rows/timestamps, application account/password/role data, runtime grants and original audit rows exact. It covers the current draft's complete 1,002-member state, official Masterlists/activations, prior approvals, imports/documents, academic/annual records, frozen payroll sources, payments/dates and financial history.

| Current fact | Before → final |
|---|---|
| Batch 1 | **Draft / v410 / 1,002 members**, unchanged |
| Its conflicts / removed entries | **167 / 0**, unchanged |
| Scholars / application accounts | **1,835 / 14**, unchanged |
| Masterlists / stored entries / activations | **3 / 2,002 / 1,000**, unchanged |
| Every payment | **2 Paid**, complete rows/evidence exact; both actual dates **2026-10-24** |

All **18,523 starting audit rows**, including the user's return/addition, remain exact. Only two ordinary task logins and two logouts were appended (**18,527 total**); sessions **55→57**, with ordinary revocation/last-seen/rate-limit activity. No primary removal, return, approval, publication, amendment or financial command was submitted. Both task sessions signed out with **204**, followed by `auth/me` **401**. Primary browser business-write guards recorded zero attempts. The user's separate profile/session was untouched. [Final preservation](../../output/ml-1-1-primary-20261026/final-preservation.json), [Staff signout](../../output/ml-1-1-primary-20261026/browser-results/signout-staff.json), [Coordinator signout](../../output/ml-1-1-primary-20261026/browser-results/signout-coordinator.json).

The **76 paused LAN-R2A artifacts and 16 earlier investigation evidence files** remain exact. Operational LAN services/configuration/database were not changed. Retained listener preservation is not an exhaustive new inventory of every retained database.

Staging caught a 38-pixel inherited button height and dialog-handoff focus behavior. The scoped rule and explicit trigger restoration corrected them; final tests cover both compiled and actual Vite delivery. An intermediate effect-based implementation failed the existing lint rule and was replaced without relaxing that rule. The first task-only preservation assertion correctly observed four ordinary workflow notification events during the fictional return/resubmission/reapproval sequence; the helper now asserts exactly those four additions and preserves all original notification rows. The restricted runtime correctly denied direct audit-table inventory, so privileged read-only inventory used the established separate operator connection; no runtime grant was expanded. These issues did not justify primary data repair or weaker tests.

Review/recovery artifacts: [three-file hashes](../../output/ml-1-1-primary-20261026/candidate-files.json), [patch](../../output/ml-1-1-primary-20261026/ML_1_1_PRIMARY.patch), [source archive](../../output/ml-1-1-primary-20261026/candidate-source.zip), [compatible build](../../output/ml-1-1-primary-20261026/compatible-build.zip). Patch checking and an independent exact-byte apply round trip passed against the saved actual dirty baseline. Archives exclude credentials, keys, `.env`, database records and private evidence; the review build omits server PDF/template assets and is not a complete LAN release. Saved ML-1 inputs are under `output/ml-1-1-primary-20261026/baseline/`. Any future UI rollback must preserve later legitimate source/data; no database restoration, activation reversal, downgrade or history deletion is appropriate.

**Stopped after the permitted UI correction, existing-workflow verification and reporting. Selected-set atomic conflict removal remains unimplemented pending a separately authorized new write contract. Primary still has all 1,002 members and all 167 conflicts. No LAN-R2A resumption or operational LAN change occurred.**
