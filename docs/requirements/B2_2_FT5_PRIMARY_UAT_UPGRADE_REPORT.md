# B2.2 FT5 — Primary UAT upgrade

25 October 2026, Philippine time. **Completed and verified at [localhost:5173](http://127.0.0.1:5173/#scholars). Primary runs the accepted 66-compatible B2.2 UI/API. Stopped after FT5.** School and Course are optional textboxes in Add Scholar. No primary registration, text completion/correction, import confirmation or financial command was committed.

This operation follows the explicit FT5 authorization and the [accepted isolated implementation](B2_2_FREE_TEXT_IMPLEMENTATION_REPORT.md). Its 28-file package was promoted unchanged. No candidate people, workbook rows, credentials or probe jobs were transferred.

## Target, baseline and maintenance

| Item | Freshly verified result |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP**, **127.0.0.1:3306** |
| Exact database | **`ldss_primary_test_12676_61497616`** |
| Runtime | **`ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic**, **127.0.0.1:5173 / 3001** |
| Schema | **65→66**, only F56 applied |
| Before controller / API / Vite | **48432 / 43076 / 44740** |
| Final controller / API / Vite | **49912 / 32832 / 41884** |

All **1,276 previously protected baseline inputs** matched before promotion. All 28 candidate hashes and four patch/source/build/rollback archive hashes also matched. `git apply --check` passed against the actual dirty workspace. The intervening B2.2 implementation report was preserved; a fresh checkpoint covered **1,277 unique existing files**. No newer source change was overwritten. Current records and payment previews were captured before maintenance rather than assumed from an earlier report. [Preflight](../../output/b2-2-ft5-primary-20261025/preflight.json), [starting files](../../output/b2-2-ft5-primary-20261025/files-before.json), [starting financial reads](../../output/b2-2-ft5-primary-20261025/readiness-before.json).

Process commands, parent PIDs and loopback listener ownership were rechecked immediately before stopping only the primary controller tree. The accepted package was copied as exact bytes after recovery passed. No patch conversion or SQL newline rewriting was used. The complete normal build passed before F56 and activation.

## Fresh recovery and F56 evidence

With 5173/3001 quiet, a fresh encrypted checkpoint passed restoration into a new isolated recovery schema. Verification covered table values/counts, executable views, columns/indexes, foreign keys/checks, triggers and rejection probes. The temporary restore identity/schema was removed. A second checkpoint after F56 also passed isolated recovery before activation.

| Checkpoint | Tables | Encrypted bytes | Result |
|---|---:|---:|---|
| Current primary before F56 | 148 | **13,684,106** | Verified; temporary restore removed |
| Current primary after F56 | 149 | **13,685,250** | Verified; temporary restore removed |

Existing **64 MiB SQL / 96 MiB archive / 100,000 rows per table** limits remain. Archives and keys remain in restricted task-private storage; no key or credential is included in review artifacts. [Pre-F56 proof](../../output/b2-2-ft5-primary-20261025/pre-f56-recovery.json), [post-F56 proof](../../output/b2-2-ft5-primary-20261025/post-f56-recovery.json).

Only **`20261025020000_f56_intake_supplied_text.sql`** ran, once. Exact SHA-256: **`d130f15172bf6f02cc4ec0ff6da5922564ebd671870f16534782fe0504fa350e`**. All 65 old migration checksums and applied timestamps remain exact. F56 adds:

- Immutable `scholar_intake_text_events`, with restrictive ownership/predecessor FKs, constraints and two no-update/no-delete triggers.
- Only the two approved annual receipt ENUM values, `record_supplied_text` and `correct_supplied_text`.
- The approved permission description **Correct supplied annual intake facts**. There is no new permission code, role assignment or role-permission mapping.
- Only **SELECT/INSERT** on the new table for the exact primary runtime, without grant option. All previous grants remain exact.

Runtime SELECT and INSERT authorization were verified with SELECT/EXPLAIN, without inserting a primary text event. UPDATE/DELETE, DDL and cross-schema access were denied. No original-development data was read by the denied probe. Old schema definitions, triggers and business rows match except the declared receipt ENUM/permission-label additions. The new primary text table remains **empty**. [Migration](../../output/b2-2-ft5-primary-20261025/migration.json), [grant/schema/data verification](../../output/b2-2-ft5-primary-20261025/preservation.json).

The delivered application preflight remains byte-identical and still rejects primary by default. This authorized maintenance used a **task-only exact-target adapter** and a task-local copy of the accepted migration runner. The copy changes only import locations, the migration directory location and F56's adapter binding; it retains checksum validation, migration locking, statement execution and journal insertion. The adapter pins host/database/runtime/workspace, primary ownership/profile, quiet ports, current schema/journal/grants/inventory, `.env`, all reviewed files/archives and fresh verified recovery hashes. It offers no force/skip option. Three authorization/target/runtime rejection checks passed before database access. These maintenance helpers are outside the promoted 28-file application package. [Adapter](../../output/b2-2-ft5-primary-20261025/primary-preflight.mjs), [runner](../../output/b2-2-ft5-primary-20261025/reviewed-migration-driver.mjs), [rejections](../../output/b2-2-ft5-primary-20261025/adapter-rejections.json).

## Promoted package and activation

Exactly **17 existing and 11 new code/test/schema files** match their accepted hashes. Full path/SHA-256 pairs are in the [promoted inventory](../../output/b2-2-ft5-primary-20261025/promoted-files.json); the exact pairs are also reproduced below. No promotion-specific application edit was made.

| Area | Accepted files |
|---|---|
| Storage/readiness | New F56 SQL; new `scripts/intake-text-preflight.mjs`; `scripts/migration-lib.mjs`; generated `server/schema-manifest.ts` |
| Text state and commands | New `server/scholars/intake-text-{model,validation,source,service}.ts`; `annual-intake-{model,validation,service}.ts`; `routes.ts` |
| Import compatibility | `server/imports/{model,service,intake-binding,confirmed-scope}.ts` |
| UI/recovery | `src/AnnualIntakePanel.tsx`, `annual-intake-api.ts`, `ScholarImport.tsx`, scoped `styles.css` |
| Acceptance | New text/preflight/registration tests; `tests/registry-presentation.test.tsx`; new text/upgrade DB drivers; `scripts/test-import-bindings.ts`; package scripts only |

All **287 files** in the newly built distribution match the accepted compatible build byte-for-byte. The new complete distribution is [archived separately](../../output/b2-2-ft5-primary-20261025/compatible-build.zip). The **33 starting shared static-client files** were restored exactly for retained older servers; primary 5173 uses current promoted Vite source and matching API. Frontend and exact 66-entry API readiness return **200**. [Build comparison](../../output/b2-2-ft5-primary-20261025/build-compatibility.json), [static preservation](../../output/b2-2-ft5-primary-20261025/build-preservation.json).

Of **1,277 existing inputs**, **1,253 remain exact**. Differences are the 17 authorized existing package files and seven corresponding generated server outputs. No starting file is missing. The 11 new package files, four new compiled text modules, this report and task evidence are additional outputs. No workbook/parser, academic/standing/financial writer, dependency, feature flag, `.env`, launcher, role mapping, old migration or previous report changed.

Retained listeners **3011/3012/3013/3015/3016/3018/3019/3020** retain their original owning PIDs. They were not restarted or used for mutations. This is not a new exhaustive inventory of every retained database. [Final running-package/process evidence](../../output/b2-2-ft5-primary-20261025/delivery.json), [report/file/link verification](../../output/b2-2-ft5-primary-20261025/documentation-checks.json).

## Actual primary acceptance

Existing synthetic Staff and Coordinator authenticated normally without account/password/role changes. Both passed:

- Add Scholar displays optional School/Course **textboxes**, initially blank, while Scholar Type remains unselected. Exact draft ` CNSC ` / `BSIT` could be entered and cleared; Year Level and identity/reference/reason controls remain.
- Empty required fields and a two-character reference were blocked by native validation. Drafts were cancelled; no duplicate-check or registration was submitted.
- B1 current working year shows **1,000** associated people, All Years **1,000**, and the earlier year an honest **0**. Each fresh default made one scoped initial list request.
- Name/ID search, school/status/classification filters, Clear filters, pagination, year-scoped profiles, annual history, Back/Forward and reload work. SQL membership and complete paged results match for both roles. Pure Administrator/unassigned reads remain denied.
- Staff's approved-import choice remains disabled and prior-approval action absent. Coordinator's choice remains available and initially unchecked. Import UI was opened and closed without staging/uploading anything.
- Keyboard search/table/form access, visible **3-pixel focus**, School→Course order and Cancel restoring Add Scholar pass. Escape restores Payout details/Export triggers; Coordinator's prior-approval dialog also restores its trigger.

Browser guards blocked non-GET business requests during acceptance and recorded **zero attempts**. Both test sessions were signed out; the user's separate session was not signed out. All five widths passed without page-level overflow, at 900-pixel height. Screenshots exclude the account banner.

| CSS width | Staff Add Scholar | Coordinator Add Scholar | Coordinator Registry |
|---|---|---|---|
| 1440 | [Staff](../../output/playwright/b2-2-ft5/staff-registration-1440.png) | [Coordinator](../../output/playwright/b2-2-ft5/coordinator-registration-1440.png) | [Registry](../../output/playwright/b2-2-ft5/coordinator-registry-1440.png) |
| 1024 | [Staff](../../output/playwright/b2-2-ft5/staff-registration-1024.png) | [Coordinator](../../output/playwright/b2-2-ft5/coordinator-registration-1024.png) | [Registry](../../output/playwright/b2-2-ft5/coordinator-registry-1024.png) |
| 820 | [Staff](../../output/playwright/b2-2-ft5/staff-registration-820.png) | [Coordinator](../../output/playwright/b2-2-ft5/coordinator-registration-820.png) | [Registry](../../output/playwright/b2-2-ft5/coordinator-registry-820.png) |
| 375 | [Staff](../../output/playwright/b2-2-ft5/staff-registration-375.png) | [Coordinator](../../output/playwright/b2-2-ft5/coordinator-registration-375.png) | [Registry](../../output/playwright/b2-2-ft5/coordinator-registry-375.png) |
| 320 | [Staff](../../output/playwright/b2-2-ft5/staff-registration-320.png) | [Coordinator](../../output/playwright/b2-2-ft5/coordinator-registration-320.png) | [Registry](../../output/playwright/b2-2-ft5/coordinator-registry-320.png) |

[Staff form/layout](../../output/b2-2-ft5-primary-20261025/staff-browser.log), [Staff navigation/permissions](../../output/b2-2-ft5-primary-20261025/staff-interactions.log), [Coordinator form/layout](../../output/b2-2-ft5-primary-20261025/coordinator-browser.log), [Coordinator navigation/permissions](../../output/b2-2-ft5-primary-20261025/coordinator-interactions.log), [primary source reads](../../output/b2-2-ft5-primary-20261025/primary-reads.json). The Playwright skill was used for these checks.

Primary has **1,000 import-owned intakes and no manual intakes/text events**. Actual primary save/correction or matched-import mutations therefore are not claimed. Positive text history and reviewed correspondence were exercised by the current fresh disposable integration driver and the accepted isolated browser packet; no candidate example was copied to fill this coverage gap. Current primary approved-source compatibility is additionally supported by both complete fresh payroll previews and the existing profile/history reads.

## Current validation and financial preservation

All commands below passed on the promoted source. Mutation drivers provisioned new owned disposable environments; none targeted primary or retained candidates.

| Command/check | Result |
|---|---|
| `npm run lint`, `npm run typecheck` | **Exit 0**, no lint/type errors |
| `npm run build` | **Exit 0**, complete normal command; accepted 287-file build match |
| `npm test` | **Exit 0; 117 files / 748 tests** |
| `npm run check:secrets` | **Exit 0** |
| `node --import tsx scripts/test-intake-supplied-text-db.ts` | **Exit 0**; new exact-text, registration, completion/correction, role/source/atomicity/concurrency/retry assertions plus all **13 existing F27 import groups** and A2.1 binding assertions |
| Eight existing DB suites | **All exit 0:** RBAC, academic, Registry parity, historical omission, Payment Recording, reconciliation, individual settlement and financial reports |
| Primary recovery, source/grant/data and browser checks | Passed; empty new table, exact old rows/frozen sources and full authorized payment previews |

The fresh text/import driver verifies New/Continuing, unknown/abbreviated/Unicode values, old v1 registration and saved import compatibility, duplicate/established-record guards, source-backed correspondence, stale previews, historical pins after later clearing, forced registration/import rollback and concurrent/lost-response/closed-period exact retries. Prior-review/publication/historical finalization and omission integration remain real guarded workflows. Financial suites retain R01/R07 parity, retry/atomicity, Original/current evidence and complete API/XLSX/PDF output checks. No validator, output bound or financial source pin was weakened/refreshed to make tests pass. [Normal exits](../../output/b2-2-ft5-primary-20261025/checks-main.json), [unit log](../../output/b2-2-ft5-primary-20261025/test-main.log), [text/import driver](../../output/b2-2-ft5-primary-20261025/intake-db.log), [driver exit](../../output/b2-2-ft5-primary-20261025/intake-db-result.json), [eight suites/commands/exits](../../output/b2-2-ft5-primary-20261025/regressions-b-two-two-ft-five/results.json).

Final preservation proves all old business values/definitions, accounts/password hashes/roles and grants exact, except the approved label/receipt/grant/schema additions. This includes permanent IDs/contact/version, annual classifications, original Excel/import sources, A2.1 bindings, Masterlists, academic/standing history, frozen payroll evidence, entitlements/allocations, individual/closure history and payments/dates.

| Current primary fact | Fresh before→after |
|---|---|
| Scholars / accounts | **1,000 / 14 → unchanged** |
| Annual intake roots / academic records | **1,000 / 1,000 → unchanged** |
| Entitlements / allocations | **1,000 / 1,000 → unchanged** |
| Payments | **2 Paid → 2 Paid**, complete original evidence exact, both actual dates **2026-10-24** |
| PAY-001 | **2 Paid / 798 Pending**, `canRecord:true` |
| PAY-002 | **200 Pending**, `canRecord:true` |
| Import bindings / new text events | **0 / 0 → 0 / 0** |

Both full fresh previews still accept **798 / 200**, with zero conflicts; neither was committed. All **10,396 starting audit rows** remain exact. Only **two logins and two logouts** were appended for role acceptance (**10,400 total**); sessions **24→26**, with normal revocation/last-seen/rate-limit activity. This is qualified authentication activity, not a claim of zero database writes. [Final preservation](../../output/b2-2-ft5-primary-20261025/preservation.json), [final financial reads](../../output/b2-2-ft5-primary-20261025/readiness-after.json).

## Recovery, limits and stop

Saved pre-DDL source/build inputs are under `output/b2-2-ft5-primary-20261025/baseline/`; the accepted 65-compatible B2 build remains available from the preceding B2 promotion. The [accepted 66 read/retry rollback archive](../../output/b2-2-implementation-20261025/read-compatible-build.zip), its [acceptance proof](../../output/b2-2-implementation-20261025/rollback-acceptance.json) and the new normal build remain hash-verified. Rollback was not needed or activated. After F56, any coordinated recovery must retain 66-compatible text/v2-import evidence readers and committed retries while withholding fresh commands as needed. Do not run a 65-only application, delete history, downgrade F55/F56, blindly rerun partial DDL or restore stale data over later transactions. The normal primary launch remains `node scripts/localhost-5173-profile.mjs synthetic`.

Supplied wording does not establish academic equivalence. Existing 160-character academic-reference limits, registration-only A2.1 reuse and hard source/classification/year guards remain. Fresh text writes remain limited to the available working year. Raw wording does not become a Registry academic-filter fallback. Narrow tables scroll locally; native 200% zoom/full AT/WCAG and office/LAN acceptance remain unverified. The existing Vite bundle warning remains.

No application repair or acceptance-driven source change was required. A task-only file inventory initially counted both slash forms of Windows paths; it was normalized to 1,277 unique paths before maintenance. Browser sign-out/reload produced expected signed-out 401s. Neither changed application behavior or data safeguards.

**Stopped after FT5 promotion and verification.** Primary 5173 runs the accepted 66-compatible B2.2 implementation. No primary synthetic save/import/correction, payment operation, candidate-data transfer, directory management, payment-status colors, typography batch, Dashboard refinement, annual rollover, financial-policy change, retained-environment reset/restart, LAN/production deployment or unrelated enhancement occurred.

## Exact promoted SHA-256 inventory

The following are the accepted application/test/schema files; maintenance helpers and generated outputs are recorded separately above.

| File | SHA-256 |
|---|---|
| `db/migrations/20261025020000_f56_intake_supplied_text.sql` | `d130f15172bf6f02cc4ec0ff6da5922564ebd671870f16534782fe0504fa350e` |
| `package.json` | `9aa33afa465cb2fe1eb268d51c1b0d1b093b3483f3a14433bd3f79b7ceb804d5` |
| `scripts/intake-text-preflight.mjs` | `91a1ba010fabdb10845b428d9bcbddcfcf3b4c6d23fc315f543611739b6f4632` |
| `scripts/migration-lib.mjs` | `f40a87bfd56d166a217941dc9eda7ab108c2fede57015be5ff9026d0ffed9328` |
| `scripts/test-import-bindings.ts` | `29b873dc0256f34eede83e16b83b05af0560cb44fa39025b5348df030a200a63` |
| `scripts/test-intake-supplied-text-db.ts` | `0997f2b69ea506ffb054a0fc52b35cbab2400b6783261ee14e06f0ef0442a453` |
| `scripts/test-intake-text-upgrade-db.mjs` | `c713d90333042154d3c1de7adb7198db7e2f9492065aef780a92bdefc348ac1b` |
| `server/imports/confirmed-scope.ts` | `d4536a1495f122af07a17185ea46c0fa0841deff407faf8f640bb54cba13b6b1` |
| `server/imports/intake-binding.ts` | `3f7cec20a2b3116f3813ee0d54296062dee09a52f74318aadb44f76ae127a854` |
| `server/imports/model.ts` | `537e0b41d7027e1a945052f1fc60b83212aa2a32928f9a97f8325b31f0b382f4` |
| `server/imports/service.ts` | `28f19baea225acb7bc279cd857c9f7ccb20bad94bd20cc935085a01c3acad650` |
| `server/schema-manifest.ts` | `2f4ebc4ce244eaba9b0eed0893d5ff089dbc3ad3deef76bad583834015346b8f` |
| `server/scholars/annual-intake-model.ts` | `55bee4989bf1a909c25716ebfdb0555a40c1f59bbaea96157ebff04a60c418ad` |
| `server/scholars/annual-intake-service.ts` | `45bdb020dba55fba2e4e48f84629db828a25e9972f2c8b01560481e419fa5d21` |
| `server/scholars/annual-intake-validation.ts` | `b556fa269a3bf4b3797eca12912296a71bb976b8244632bad813ceb663b919ae` |
| `server/scholars/intake-text-model.ts` | `6a1c4566e66c40ef20213ba0f8e2ee069379cc5c2cab0baee8092db4bf303f50` |
| `server/scholars/intake-text-service.ts` | `f39a86db31e9fd7b59fb40e5a15f09c6e755c1a2b6f2cb5dd336d27b9d25046a` |
| `server/scholars/intake-text-source.ts` | `e08d9d1d385cbb0b32f1f58508cd0e773f78f9f97d7c9d6b870edbae69f7fdc5` |
| `server/scholars/intake-text-validation.ts` | `bfa015c8075f0a8a0e9f0cc856ec3aa2c4342b90e68faba9d907e5f5bd414b96` |
| `server/scholars/routes.ts` | `38c5525765b83c42790721884fdf0440e5466521e885116f84ac11b23847f9e4` |
| `src/annual-intake-api.ts` | `df25206c6225940759777f69ba7a4f58d4b01b01b8bb35c2d1da36982dc1e5b7` |
| `src/AnnualIntakePanel.tsx` | `9c5e04c6ac1b8e502cffbc6e6530e6ad90f57fcacb5d4b8fd8c6ad2cf68219e2` |
| `src/ScholarImport.tsx` | `a956cdea2878f868f7c7b5af6bc5478c9fce7402a81df84f9510c497ebae328b` |
| `src/styles.css` | `cd8fee04870507b79094288658644e4878a23ab21d97b37e59d0640c8559e58f` |
| `tests/intake-supplied-text.test.ts` | `47a11a2def04cce0a7600a4a14ca74cb0889a99a639c8c741ee6f91321288085` |
| `tests/intake-text-preflight.test.ts` | `d05b269a0d1bc45ed44df6faff4a2480afafce2b682b32518aa839c2cd748fc8` |
| `tests/intake-text-registration.test.tsx` | `de59d1b7e74a5a4ef4a140ccca39f5804afb9b587c9545d770d4ea3b3e504315` |
| `tests/registry-presentation.test.tsx` | `0457be7188ab6dad3ba276efda5d2d28a52aa070b070e1eee1eeae377c5f9eff` |

