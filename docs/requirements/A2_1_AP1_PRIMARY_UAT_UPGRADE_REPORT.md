# A2.1 AP1 — Primary synthetic UAT upgrade

25 October 2026, Philippine time. **Completed and verified at [localhost:5173](http://127.0.0.1:5173/). Stopped after AP1.** The reviewed A2.1 implementation is promoted, F55 is applied, and the primary runs the compatible 65-migration source. Its **1,000 scholars, 14 accounts, 1,000 entitlements/allocations and two existing Paid records remain unchanged**. No primary import binding, registration, payment, correction or graduation command was committed.

This operation follows the explicit A2.1 AP1 authorization and the [accepted candidate report](A2_1_EXISTING_SCHOLAR_IMPORT_IMPLEMENTATION_REPORT.md). It does not implement another enhancement.

## Environment and promotion

| Item | Verified result |
|---|---|
| Host / database server | **DESKTOP-BPLJKRP**, MariaDB at **127.0.0.1:3306** |
| Exact primary | **`ldss_primary_test_12676_61497616`** |
| Runtime | **`ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic** profile, **127.0.0.1:5173 / 3001** |
| Schema | **64 → 65**, applying only `20261025010000_f55_import_intake_bindings.sql` |
| Final controller / API / Vite PIDs | **43348 / 29804 / 36944**, verified ancestry and loopback listeners |
| Retained A2.1 candidate | Original **3016**, PID **45476**, unchanged |

Preflight proved the actual runtime connection, ownership manifest, selected launch profile and process ancestry. All **64 accepted migration checksums** matched. All **1,242 files protected by the preceding A2.1 checkpoint** matched; the only intervening documentation addition was its completion report. Candidate files and review archives matched their recorded hashes, and `git apply --check` passed against the actual dirty baseline. No later source edit was overwritten. Fresh authorized financial previews accepted **798 / 200 remaining Pending scholars with zero conflicts** before maintenance.

The exact **22 accepted code/test/schema files** were promoted from the verified candidate through a separate staging checkout. The only additional implementation support is a narrowly scoped **[primary preflight adapter](../../scripts/primary-import-intake-preflight.mjs)**, its hook in the accepted F55 preflight, and **[three rejection tests](../../tests/primary-import-intake-preflight.test.ts)**. The adapter pins this database/runtime/host/workspace, maintenance ports, ownership, migration journal, fresh recovery proof, `.env` hash and promoted file hashes. It supplies no generic force/skip option. The F55 SQL bytes remain exact: SHA-256 **`2208ea4522899c666ac6f2c475c1098a86a34a496a593d1bbbb0297b7c0e5f1e`**.

No workbook/parser, business permission, role mapping, dependency, financial writer, academic writer, launch setting or feature flag was changed. `.env` and unrelated dirty work remain exact. Of **1,243 starting inputs**, **1,225 matched unchanged**; differences are the twelve declared existing code files and six generated server files. New files are recorded separately. [Preflight](../../output/a2-1-ap1-primary-20261025/preflight.json), [promoted files and support delta](../../output/a2-1-ap1-primary-20261025/promoted-package.json), [final file comparison](../../output/a2-1-ap1-primary-20261025/files-final.json).

## Recovery, migration and grants

The verified primary controller tree alone was stopped. Fresh encrypted primary checkpoints were restored into newly owned isolated recovery schemas and compared with the existing recovery tooling, including table values, definitions, indexes, constraints, triggers and executable views. Temporary restore identities were removed. The successful pre-DDL proof was created while the primary was stopped and its inventory was rechecked immediately before F55. No old candidate backup was used as the primary recovery point.

A further **post-F55 primary backup and isolated restore passed**: **148 tables**, **53,561,232 SQL bytes**, **13,681,916 encrypted bytes**, with the new binding table empty. The unchanged **64 MiB SQL / 96 MiB archive / 100,000 rows per table** bounds were retained. Keys, credentials and encrypted archives remain in restricted task-private paths; their contents are withheld. [Pre-DDL recovery proof](../../output/a2-1-ap1-primary-20261025/primary-recovery-proof.json), [post-F55 verification](../../output/a2-1-ap1-primary-20261025/post-f55-backup.json).

F55 ran **once**, after the complete normal build passed. All old schema objects and migration rows, including their applied timestamps, remained exact. The new table has the reviewed ownership uniqueness, restrictive foreign keys and two no-update/no-delete triggers. Its primary row count is **zero**.

Only **SELECT and INSERT on `import_intake_bindings`**, without grant option, were added to the exact runtime. All prior global/schema/table/column grants matched. Real runtime probes passed SELECT/INSERT authorization and denied UPDATE, DELETE, CREATE TABLE and original-development-schema access. No original development data was read by the denied cross-schema probe. [Migration, trigger and grant evidence](../../output/a2-1-ap1-primary-20261025/upgrade.json).

The compatible server/client build is retained in [the build archive](../../output/a2-1-ap1-primary-20261025/compatible-build.zip). Its SHA-256 is **`ca91ed52df2c5609a4ee110e834f00b77b08321c06b1462ea109decef94e08c5`**. Starting shared static client files were restored byte-for-byte for retained older-schema servers; **5173 uses the promoted current Vite source**. The API's exact 65-entry readiness check passes. The existing launch command remains:

```powershell
node scripts/localhost-5173-profile.mjs synthetic
```

After F55, retain 65-compatible readers and investigate/forward-repair any failure. Do not start a 64-only binary, remove bindings, blindly rerun partial DDL or restore a stale archive over later activity. To verify a checkpoint through another **new isolated restore**, without replacing the primary:

```powershell
node output/a2-1-ap1-primary-20261025/recover.mjs pre-f55
node output/a2-1-ap1-primary-20261025/recover.mjs post-f55
```

## Acceptance tests and browser results

New mutations used a fresh owned copy, **`ldss_import_binding_test_8504_64b6224b`**, served temporarily at **3017** from the staging source. Its source was the current primary; copied authentication sessions/reset tokens/rate limits were excluded. Fresh source, pre-upgrade and upgraded-copy backups all passed isolated recovery. The copy's 64→65 upgrade preserved old records/checksums and verified empty-table/narrow-grant behavior. The original 3016 candidate was not reused for mutations.

The declared fictional browser packet registered two distinct similarly named people, then imported those two plus one new person through the unchanged eight-column template. Coordinator review showed **1 new / 2 existing / 0 unresolved / 3 ready / 0 correction rows**. Both identity acknowledgments began unchecked; changed matches required restaging. Confirmation reused both permanent IDs and retained their original manual facts beside immutable linked import evidence. The copy ended with **1,003 people/intakes, two bindings, 1,000 entitlements/allocations and its original two payment records**. No binding created a payment or entitlement. Staff inspected candidates but approved-list authority and confirmation remained disabled.

The copy committed an import whose response was deliberately dropped. The exact key/body was verified in saved storage; reload recovery completed and removed the saved request. A timing assertion initially inspected the retry status before the response settled; the settled UI and single-commit database state were then verified. Exact concurrent/lost-response and changed-key/body assertions also passed in the real integration driver. [Copy preservation/source verification](../../output/a2-1-ap1-primary-20261025/copy-evidence/copy-final-verification.json), [ready/review results](../../output/a2-1-ap1-primary-20261025/copy-resolve.log), [settled recovery](../../output/a2-1-ap1-primary-20261025/copy-settled.log), [Staff restrictions](../../output/a2-1-ap1-primary-20261025/copy-staff.log).

On **primary 5173**, existing synthetic Staff and Coordinator accounts authenticated normally, without password/account/role changes. Both saw the correct import authority, bounded payroll rosters and Graduation Monitoring. Coordinator also read original annual history and the **800/200 published Masterlists**. Browser interception rejected unexpected non-GET business requests; **none was attempted**. No upload was staged or confirmed on primary. Both test sessions were signed out; the user's separate session was not altered.

Copy review passed **1440/1024/820/375/320 CSS-pixel** checks, with no page overflow and a 3-pixel native focus outline. Primary recording was captured at **1440/1024/820**, preserving the compact B3b layout, dates and controls. Narrow tables intentionally scroll locally. Native 200% zoom/full assistive-technology certification is not claimed.

Screens: copy ready [1440](../../output/playwright/a2-1-ap1/ready-1440.png), [820](../../output/playwright/a2-1-ap1/ready-820.png), [320](../../output/playwright/a2-1-ap1/ready-320.png); [copy history](../../output/playwright/a2-1-ap1/linked-history-1024.png); primary [Staff import](../../output/playwright/a2-1-ap1/primary-staff-import.png), [Coordinator recording](../../output/playwright/a2-1-ap1/primary-coordinator-recording-1440.png), [Graduation Monitoring](../../output/playwright/a2-1-ap1/primary-coordinator-graduation.png), [original intake history](../../output/playwright/a2-1-ap1/primary-original-intake-history.png), [published Masterlists](../../output/playwright/a2-1-ap1/primary-masterlists-loaded.png). [Staff results](../../output/a2-1-ap1-primary-20261025/primary-staff-browser.log), [Coordinator results](../../output/a2-1-ap1-primary-20261025/primary-coordinator-browser.log).

| Current check | Result |
|---|---|
| `npm run lint`, `npm run typecheck` | **Exit 0**, no lint/type errors |
| `npm run build` | **Exit 0**, normal complete main command; generated manifest matched the reviewed 65-entry hash |
| `npm test` | **Exit 0; 112 files / 706 tests passed**, including the three primary-scope rejection tests |
| `npm run check:secrets` | **Exit 0** |
| `npm run test:import-intake-bindings-db` in matching staging source | **Exit 0; 13 import scenario groups** plus binding assertions: new/reused/Continuing identities, actual person versions, stale/conflicting/forged mappings, permissions, six rollback points, exact/concurrent retries, immutable provenance and prior-review/publication/historical/omission integration |
| Six targeted DB suites in matching staging source | **All exit 0:** historical omission, Payment Recording, Registry parity, reconciliation, individual settlement and financial reports, including complete API/XLSX/PDF checks |
| Fresh populated-copy upgrade/recovery | **Passed**, original records and checksums exact, narrow grants and initially empty bindings |
| Partial-DDL rehearsal in a new disposable schema | **Passed:** interruption retained the committed prefix, blind retry rejected, exact empty-prefix verification and reviewed forward repair succeeded |
| Primary source/readiness/preservation | **Passed**, full fresh payment previews have zero conflicts; binding table empty |

[Main command exits](../../output/a2-1-ap1-primary-20261025/checks-main.json), [normal build log](../../output/a2-1-ap1-primary-20261025/build-main.log), [unit log](../../output/a2-1-ap1-primary-20261025/test-main.log), [binding driver](../../output/a2-1-ap1-primary-20261025/copy-evidence/bindings.log), [six DB suite exits](../../output/a2-1-ap1-primary-20261025/copy-evidence/regressions-primary-promotion/results.json), [partial-DDL evidence](../../output/a2-1-ap1-primary-20261025/copy-evidence/partial-ddl.json). Tests used the promoted source hashes; no financial validator or safeguard was replaced.

## Final preservation and qualifications

| Primary fact | Before → after |
|---|---|
| Scholars / accounts | **1,000 / 14 → 1,000 / 14**, exact identities, contact data, password hashes, versions and roles |
| Annual intake roots / academic records | **1,000 / 1,000 → unchanged**, original source/history exact |
| Entitlements / allocations | **1,000 / 1,000 → unchanged** |
| Existing payments | **2 → 2**, exact Paid records, actual dates and evidence |
| PAY-001 | **2 Paid / 798 Pending**, `canRecord:true` |
| PAY-002 | **200 Pending**, `canRecord:true` |
| Import bindings | New empty table: **0**, still **0** after acceptance |

All original business tables, frozen payroll/source bytes, Masterlists, prior reviews, individual/closure evidence, schema objects and existing grants matched the starting inventory, with only the explicit F55 additions. All **10,381 existing audit rows** matched. Final audit count **10,386** comprises three logins and two logouts: four events for the synthetic role checks and one concurrent login by an existing non-fixture account. Session/rate-limit activity is the qualified authentication difference; this is not a claim of zero database writes. Password-reset data also matched exactly. [Final preservation](../../output/a2-1-ap1-primary-20261025/preservation.json), [authentication qualification](../../output/a2-1-ap1-primary-20261025/authentication-events.json), [authoritative financial reads](../../output/a2-1-ap1-primary-20261025/readiness-after.json), [running profile](../../output/a2-1-ap1-primary-20261025/final-processes.json).

Task-helper development encountered an empty parent path for `package.json`, a Windows build-command invocation error and path-separator comparison differences. Each stopped **before DDL**; exact 64-migration/no-partial-table state was checked and fresh recovery verification repeated. No application error or safety check was suppressed. Browser history probes initially expected a linked-source heading on an unbound primary row, then toggled an already-open disclosure; corrected read-only probes passed. These are recorded helper/assertion issues, not data repairs.

The existing Vite chunk-size warning, narrow-table scrolling and earlier payment-preview focus qualification remain. A2.1 still excludes already established academic/annual/participation histories, unresolved identities and conflicting supplied facts. Real reviewed source evidence and all existing document/publication/financial checks remain necessary. Synthetic acceptance is not office, LAN or production acceptance.

The new copy server was stopped after acceptance; its owned data/evidence remain available without reset. Original development and retained UAT/candidate environments were not migration, mutation or restart targets. No LAN/production connection, financial activation, new policy/permission, unrelated enhancement or P11 occurred.

**Stopped after AP1 promotion, verification and this report.** Primary 5173 remains running on the compatible A2.1 source with both existing Paid records preserved and no primary bindings created.
