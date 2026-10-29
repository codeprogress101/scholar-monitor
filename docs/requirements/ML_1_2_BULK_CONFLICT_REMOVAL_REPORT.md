# ML-1.2 — Bulk Masterlist conflict removal

26 October 2026, Philippine time. **Implemented and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/#masterlists). Stopped after installation, verification and reporting. Batch 1 remains Draft / version 410 / 1,002 members / 167 conflicts. No primary membership was removed.**

This implements the explicitly authorized selected-set write contract deferred in [ML-1.1](ML_1_1_MASTERLIST_CONFLICT_RESOLUTION_REPORT.md). It preserves accepted ML-1 selection, conflict detection and individual removal. No migration, permission expansion, financial rule, configuration, dependency or operational LAN change occurred. LAN-R2A remains paused.

## Fresh target and recovery

| Item | Verified result |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | **synthetic / 127.0.0.1:5173 / 3001**, loopback |
| Current Masterlist | **Batch 1**, `a6f45315-4b8b-46f8-b91d-bedc58cd6cc2` |
| Working academic year | **TWO-BATCH-YEAR**, `36d55426-f578-418d-a942-3596a68f65e2` |
| Starting and final list | **Draft / v410 / 1,002 active members / 167 conflicts** |
| Schema | **66 accepted migrations**, checksums and applied timestamps unchanged |
| Starting controller / API / Vite | **21972 / 51068 / 59796** |
| Final controller / API / Vite | **31364 / 53844 / 56828** |

The accepted ML-1 and ML-1.1 source hashes matched. A fresh checkpoint protects **1,337 existing inputs**. Staging at `C:/xampp/htdocs/ldss_ml12_primary_stage_20261026` used the actual dirty workspace, preserving later legitimate files rather than substituting Git HEAD. The 1,002-member draft was not replaced with the earlier 400-member state. [Preflight](../../output/ml-1-2-primary-20261026/preflight.json), [starting files](../../output/ml-1-2-primary-20261026/files-before.json), [current-list inspection](../../output/ml-1-2-primary-20261026/inspection.json).

Installed BACKUP-1 tooling captured and completely restored two fresh checkpoints into newly owned isolated recovery targets:

| Checkpoint | Raw SQL bytes | Encrypted bytes | Result |
|---|---:|---:|---|
| Before staging | **86,543,694** | **19,565,382** | Complete isolated restore passed |
| Before promotion, primary ports quiet | **86,544,612** | **19,565,861** | Complete isolated restore passed |

Both verified all **149 tables**, full values/counts/checksums, migration journal, columns, indexes, foreign keys/checks, triggers, executable views and rejection probes. Recovery schemas/accounts were removed; nothing was restored over primary. Source-schema READ locks briefly serialize writes during capture; no server-wide global lock was used. The two snapshots include intervening ordinary authentication activity and are not asserted to have identical SQL hashes. Existing finite backup bounds and key custody remain unchanged. Archives remain private. [Initial recovery](../../output/ml-1-2-primary-20261026/recovery.json), [activation recovery](../../output/ml-1-2-primary-20261026/activation-recovery.json).

After staging acceptance, source/business preservation and recovery gates passed, only the freshly verified primary controller tree was stopped. Matching backend/frontend source was installed while 3001/5173 were quiet, then started with the unchanged `node scripts/localhost-5173-profile.mjs synthetic` launcher. All **310 starting distribution files** remain byte-identical for retained servers; the new compatible review build is separate. Temporary 3026/3027/3028 services are stopped and owned fixture databases/accounts removed. Retained/LAN listeners keep their starting owners. [Maintenance](../../output/ml-1-2-primary-20261026/maintenance.json), [installed hashes](../../output/ml-1-2-primary-20261026/promoted-files.json), [delivery](../../output/ml-1-2-primary-20261026/delivery.json).

## Selection and confirmation

An editable unpublished ordinary Draft now offers checkboxes in **Review Conflicts**, with **Select This Page**, **Select All Conflicts**, **Clear Selection** and **Review Removal**. Opening the dialog selects nothing. Manual selection persists across pages; page selection adds that page's IDs to the explicit selection. Selecting all obtains the server-reviewed complete conflict scope, including all seven pages of the current 167-member example. It does not invoke individual-removal endpoints repeatedly.

Review Removal displays the exact Masterlist title/ID, year and draft version, selected count, confirmed selected conflicts, all current conflicts and expected remaining membership. For current Batch 1, reviewing all shows **167 selected / 167 confirmed / 835 expected remaining of 1,002**. Staff and Coordinator seven-page responses matched every existing conflict identity, permanent ID and official reference: **160 / 7** from the two earlier published records. A 25-member manual review correctly shows **977** expected remaining. Actual scholar names/IDs are excluded from this report. [Final primary read parity](../../output/ml-1-2-primary-20261026/read-oracles-3001.json).

Confirmation requires a reason, reference and explicit checkbox before **Remove Selected from Draft**. It states that official Masterlists/activations, Registry, annual records and source documents remain unchanged. Cancel makes no membership change. The existing **Review draft removal** individual option remains and opens its original named confirmation form. Bulk controls are absent in review/approved/official UI; the server independently rejects unavailable years, non-Draft states and official/addition/consolidation workflows.

After removal, the list stays Draft. Existing verification, submission for approval and Coordinator approval remain required; remaining conflicts still block forward review. There is no automatic return, approval, publication or activation. The actual user must choose whether to execute a primary correction; automation only reviewed and cancelled there.

## Bounded server contract

The new read-only **GET `/api/v1/masterlists/:id/conflict-removal-review`** accepts an explicit unique ID selection or the complete all-conflicts scope. The new **POST `/api/v1/masterlists/:id/remove-conflicts`** performs one confirmed atomic command.

| Boundary | Installed contract |
|---|---|
| Selected memberships | **1–200 unique conflicts**; excess rejects without truncation |
| Command body | **16 KiB**; accommodates 200 UUIDs plus confirmation/evidence fields |
| Explicit review IDs | At most **200**, bounded to **7,399 decoded characters** |
| Returned review rows | **25 per page**; full selected-ID set remains bounded to 200 |
| Selected evidence | **360 KiB** decoded JSON; larger evidence requires a smaller selection |
| Complete audit details | **768 KiB**; excess rejects and rolls back |
| Existing authority | Fresh **`masterlists.prepare`** authorization |

The evidence limits account for the observed **1 MiB database packet limit**, retaining room for the complete before/after audit and statement overhead without changing server configuration. The actual primary 167-member selection passes the conservative review bound. These independent byte limits can reject a smaller count with unusually large snapshots; 200 is a count ceiling, not an unconditional payload guarantee.

Review runs through the existing consistent read-only snapshot adapter. Its process-private HMAC binds actor identity/version, exact draft/title/year/state/version, working-year configuration, selection scope, membership/conflict counts and every selected entry's saved snapshot, award number, annual standing/version and actual activation/official publication evidence. All-scope review binds every selected conflict, across pages. Paging must retain the same fingerprint. Restarting expires an uncommitted review; committed exact retries remain durable.

The command uses the existing shared configuration/user/draft guard and transaction. It reauthorizes and recomputes the review before writing. Stale versions, changed membership, changed activation/standing evidence, invalid fingerprints, foreign/nonconflicting/already removed IDs and protected workflows reject the entire operation. Explicit IDs cannot be replaced silently with another set.

One set-based soft-removal updates only the selected active draft entries, preserves their IDs/snapshots/source references and clears their draft award numbers. It increments the draft version **once**, writes one complete selected-set before/after audit with exact persisted removal timestamps and the supplied reason/reference, and inserts the existing actor/key/hash command-ledger result in the **same transaction**. Any later failure rolls back entries, version, audit and ledger together. No scholar, annual, import, activation or financial writer is called.

Exact committed retries return the original version/counts, including after a lost response. Reusing the key with another request rejects. During an uncertain browser result, the exact body/key are retained; evidence edits, dismissal and navigation are blocked and **Retry Exact Removal** is offered. Confirmed stale/conflicting results require a fresh review. The existing individual entry writer, add-scope service and independent final publication writer remain byte-identical. [Build/writer checks](../../output/ml-1-2-primary-20261026/build-verification.json).

## Tests and browser acceptance

| Final validation | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | All exit **0** on final matching staged source |
| `npm test -- --maxWorkers=1` | **127 files / 811 tests passed** |
| New disposable removal integration | **Seven scenario groups passed** |
| Existing disposable regressions | **Nine groups exit 0**: drafts, workflow/approval, amendments/additions/consolidation, intake/import, historical/omitted payroll, Recording, reconciliation, individual settlement and financial reports |
| Primary | Both roles' read-only seven-page review/cancel, responsive/keyboard, native zoom, preservation and delivery passed |

The new integration tests **1, 25, 167 and 200** removals, 201-member/body/evidence rejection, partial selection and cancelled review, standing-only conflicts without invented official references, two published sources (**100 / 67** for the 167 fixture), actor/version/fingerprint/evidence changes, duplicate/nonconflicting/already removed IDs, approved/official restrictions, concurrent competing removals and repeated confirmation. Staff and Coordinator both commit allowed fixture operations; technical Administrator/unassigned accounts are denied.

A deliberately late ledger failure rolls back all **167** removed entries, audit and version. Exact retries return the same result and changed-payload reuse rejects. Individual removal still works, remaining conflicts still prevent submission, and the corrected fictional list must complete resubmission/reapproval. All other inventoried tables/schema—including official activations/publications, annual/import records and financial evidence—match around that drill. All mutations used newly owned fictional databases. [Seven-group evidence](../../output/ml-1-2-primary-20261026/removal-integration.json), [integration command/exit](../../output/ml-1-2-primary-20261026/selection-integration-exit.json), [direct approved/published command denials](../../output/ml-1-2-primary-20261026/protected-write-denials.json).

The final fictional browser explicitly removed **167 of 168** memberships. Its first success response was deliberately lost **after commit**. The UI retained the exact body/key, prevented Escape/edits, retried once and confirmed **one** removal with **one** member remaining. This was not primary data. [Final lost-response browser proof](../../output/ml-1-2-primary-20261026/browser-results/fixture-bulk.json). Existing financial tests retain their original source pins, retry/atomicity, R01–R07 and output assertions. No validator or safeguard was relaxed. [Normal commands](../../output/ml-1-2-primary-20261026/checks-main.json), [unit log](../../output/ml-1-2-primary-20261026/unit-final.log), [nine regression commands/exits](../../output/ml-1-2-primary-20261026/regressions-final.json).

Staff and Coordinator passed **1440/1024/820/375/320 CSS pixels**, height 900. Manual selection across two pages counted 50; all selection and confirmation each retained **25/25/25/25/25/25/17** rows. There was no page/dialog horizontal overflow; data tables scroll locally. Keyboard cancellation restores focus, the individual dialog handoff remains correct, and actions retain **44-pixel** height and **3-pixel** focus. Primary write guards recorded **zero business-command attempts**. [Staff](../../output/ml-1-2-primary-20261026/browser-results/review-staff.json), [Coordinator](../../output/ml-1-2-primary-20261026/browser-results/review-coordinator.json).

Representative masked actual-primary captures: [desktop selection](../../output/playwright/ml12-primary/coordinator-5173-selection-1440.png), [desktop confirmation](../../output/playwright/ml12-primary/coordinator-5173-confirmation-1440.png), [320-pixel selection](../../output/playwright/ml12-primary/coordinator-5173-selection-320.png), [320-pixel confirmation](../../output/playwright/ml12-primary/coordinator-5173-confirmation-320.png). Both roles have all five widths in the evidence folder.

Focused **native Chrome 200%** passed with viewport emulation disabled: **712×424 CSS pixels / DPR 2**, including selection, confirmation, reason-field keyboard access and cancellation without overflow. Accepted images use Chrome's direct rendered-viewport capture without resizing; initial Playwright native clipping was unreliable and its exploratory images are not the accepted visual evidence. Zoom returned to 100% and task windows closed. The ui-ux-pro-max and Playwright workflows were used. [Native checks](../../output/ml-1-2-primary-20261026/browser-results/native-review.json), [200% review](../../output/playwright/ml12-primary/native-direct-review.png), [200% confirmation](../../output/playwright/ml12-primary/native-direct-confirmation.png). Full assistive-technology/WCAG certification is not claimed.

## Source boundary and preservation

**11 package files: five existing changes and six additions.**

| Files | Change |
|---|---|
| New `server/masterlists/conflict-removal-model.ts`, `conflict-removal-service.ts` | Bounded review, proof and atomic conflict-only removal |
| `server/masterlists/routes.ts`, `server/app.ts` | Register the two routes and service |
| New `src/MasterlistConflictRemoval.tsx`, `MasterlistConflictTable.tsx` | Selection, review, confirmation, paging and exact retry; shared conflict table |
| `src/MasterlistConflicts.tsx`, `MasterlistsPage.tsx` | Integrate bulk controls, pending-state protection and result refresh while retaining individual removal |
| `src/styles.css` | Append scoped control/confirmation rules after the exact ML-1.1 prefix |
| New `scripts/test-masterlist-conflict-removal-db.ts`, `tests/masterlist-conflict-removal.test.tsx` | Owned integration and focused selection/confirmation boundaries |

**1,332 of 1,337 starting inputs remain byte-identical**, with none missing. Every other backend file, migration, permission mapping, financial reader/writer/builder, authentication module, BACKUP-1 file, dependency, font, flag, launcher and private configuration remains exact. All existing tests are unchanged. The report/task evidence are additional deliverables. [Exact hashes](../../output/ml-1-2-primary-20261026/candidate-files.json), [source boundary](../../output/ml-1-2-primary-20261026/source-preservation.json).

Client assets change **1,500,680 → 1,509,850 bytes**, **+9,170**: JavaScript **+8,633**, CSS **+537**; observed CSS gzip **50,841 → 50,927 bytes**. New removal readers run on explicit selection/review, not default entry. No new polling or financial reader is introduced. One final owned 167-member command measured about **30 ms** locally; this is not a concurrency, cold-start, maximum-load or LAN benchmark. [Bundle inventory](../../output/ml-1-2-primary-20261026/bundle-impact.json), [owned measurements](../../output/ml-1-2-primary-20261026/removal-integration.json).

The final complete 149-table comparison preserves all starting business values/counts, schema objects, 66 migration rows/timestamps, application accounts/password hashes/roles, runtime grants and original audit rows. This covers the whole current draft, official lists/activations, prior approvals, Excel/import/document sources, annual/academic/standing evidence, PAY-001/PAY-002, frozen payroll sources and every payment/date/history.

| Primary fact | Before → final |
|---|---|
| Batch 1 | **Draft / v410 / 1,002 members / 167 conflicts**, unchanged |
| Scholars / application accounts | **1,835 / 14**, unchanged |
| Intake / academic / annual scholarship records | **1,835 / 1,835 / 1,835**, unchanged |
| Masterlists / stored entries / activations | **3 / 2,002 / 1,000**, unchanged |
| Payments | **2 Paid**, complete evidence exact; both actual dates **2026-10-24** |

All **18,527** original audit rows remain exact. Two ordinary task logins/two logouts add four authentication events (**18,531 total**); sessions **57 → 59**, with ordinary last-seen/revocation/rate-limit activity. This is qualified authentication activity, not zero database writes. Both task sessions signed out through the keyboard/mobile footer with **204**, followed by `auth/me` **401**; the user's separate session/profile was untouched. [Final preservation](../../output/ml-1-2-primary-20261026/final-preservation.json), [Staff revocation](../../output/ml-1-2-primary-20261026/browser-results/signout-staff.json), [Coordinator revocation](../../output/ml-1-2-primary-20261026/browser-results/signout-coordinator.json).

The **76 paused LAN-R2A artifacts and 16 earlier investigation evidence files** remain exact. No operational database/service/configuration was changed. Retained-listener preservation is not a fresh exhaustive inventory of every retained database.

Early test-helper issues included the API's normalized payload error code, the existing individual endpoint's required `awardNumber:null`, and an outdated cleanup-name assertion. The first owned leftover target/account were explicitly removed; final cleanup checks pass. A render-prop approach triggered the existing React lint rule and was replaced by a shared table component. Unicode-safe pager assertions, settled document navigation and direct native capture corrected automation issues. The packet-size review added explicit byte guards and repeated final normal/integration/regression checks. No application validation or permission was weakened.

## Recovery artifacts, limitations and stop

Review artifacts: [11-file source hashes](../../output/ml-1-2-primary-20261026/candidate-files.json), [patch](../../output/ml-1-2-primary-20261026/ML_1_2_PRIMARY.patch), [source archive](../../output/ml-1-2-primary-20261026/candidate-source.zip), [compatible build](../../output/ml-1-2-primary-20261026/compatible-build.zip). Patch checking and an independent exact-byte apply round trip passed against the saved actual dirty ML-1.1 baseline. Archives exclude private credentials, keys, `.env` and database records. The review build omits server PDF/template assets and is **not a complete operational LAN release**.

LAN-R2A may consider this package only through separate authorized inclusion/rehearsal: carry matching API/UI, classify the new command in its pilot boundary, verify actual packet/evidence limits, and repeat target-specific recovery and office acceptance. Existing schema/grants suffice. No paused artifact was updated and no deployment acceptance is supplied here.

Remaining limits: positive removals/races/failures are proven on owned fictional targets; primary was intentionally review/cancel only. More than 200 conflicts require explicit smaller operations, each with a fresh version/review; oversized evidence can require fewer than 200. Narrow tables retain local scrolling and long reviews ordinary vertical scrolling. Full accessibility, maximum-load, concurrency, cold-start and office/LAN acceptance remain unverified; the existing build chunk warning remains.

Saved accepted ML-1.1 inputs remain under `output/ml-1-2-primary-20261026/baseline/`. Any rollback must coordinate compatible backend/frontend source and preserve legitimate later data/edits and BACKUP-1 capability. No database restoration, activation reversal, schema downgrade or history deletion is appropriate for this application change.

**Stopped after ML-1.2 installation, verification and reporting. No actual primary conflict was removed, no workflow transition was submitted, and no LAN-R2A resumption or LAN operation occurred. The user's explicit review and confirmation remain necessary to correct the draft.**
