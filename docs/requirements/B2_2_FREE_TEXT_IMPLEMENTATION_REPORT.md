# B2.2 — Supplied School/Course text implementation

25 October 2026, Philippine time. **Implemented and verified in a new isolated candidate only. Primary 5173 remains on B2 AP1, unchanged and not restarted. No primary promotion is authorized or performed.** Scope follows the explicit FT1–FT4 authorization of the [accepted contract](B2_2_SCHOOL_COURSE_FREE_TEXT_CONTRACT.md).

Review at [localhost:3020](http://127.0.0.1:3020/#scholars). Candidate source: `C:/xampp/htdocs/ldss_b22_candidate_20261025`. Owned database: **`ldss_intake_text_test_42932_a808c7a6`**, runtime **`ldss_it_42932_a808c7a6@localhost`**, **66 migrations**. Existing copied account identities/password hashes/roles are retained. Credentials and recovery keys remain restricted and are excluded from the review package.

## Result and compatibility

Add Scholar now accepts optional **School** and **Course** text. `CNSC`, `BSIT`, case, punctuation, accents and accepted surrounding spaces are preserved exactly. Either field can be unknown. Blank-to-NULL is the only value canonicalization; no abbreviation is expanded and no registration creates a catalog entry or verified academic placement.

The shared validator counts **Unicode scalar values**, with a 300-scalar limit. It rejects controls, prohibited bidirectional controls and unpaired surrogates. Inputs support supplementary characters without a premature UTF-16 maxlength rejection. A multiline paste is rejected visibly rather than silently changed by the single-line control. The existing **8,192-byte mutation limit** remains. Supplied wording is rendered as escaped, wrapping text, preserving spaces in evidence displays.

The versioned registration creates an independent text revision, including when both values are NULL. Annual history distinguishes **Supplied at registration**, **Current supplied wording** and corrections, with source, reason, actor and recording time. Initial reference IDs and canonical academic placement stay separate. B1 annual membership and Registry academic projections/ID filters remain unchanged; text does not become an academic fallback or financial source.

Existing `annual-intake/v1` snapshots, F53 revision hashes, F55 bindings, old receipt bodies and unversioned registration hashes are preserved. New registration uses `scholar-registration/v2` and `manual-intake/v2`; initial school/course IDs must be NULL. Saved v1 commands restore their original reference controls and exact body. The pending-command guard, actor namespace, CSRF/origin checks and receipt-before-mutable-source retry order remain. An uncertain request cannot become a second registration.

## Storage, authority and recovery

Only the owned copy was upgraded **65→66**, using **`20261025020000_f56_intake_supplied_text.sql`**. Reviewed SQL SHA-256: **`d130f15172bf6f02cc4ec0ff6da5922564ebd671870f16534782fe0504fa350e`**.

- New `scholar_intake_text_events` stores complete immutable states, independent revisions/hashes, same-intake predecessors, historical intake basis and source/actor/command/time. Restrictive FKs, checks and no-update/no-delete triggers protect ownership/history. Highest revision is current; cleared wording cannot resurrect an older value.
- The existing receipt ENUM gains only `record_supplied_text` and `correct_supplied_text`. Existing values and receipts retain their meaning. New results explicitly name the text revision and intake basis.
- Runtime gains **SELECT/INSERT only** on the new table, without grant option. UPDATE/DELETE/DDL/cross-schema denials passed. Old grants remain exact.
- The approved descriptive label becomes **Correct supplied annual intake facts**. There is no new permission code or role mapping. Coordinator-only `scholars.intakes.correct` now covers source-backed supplied-text corrections. Pure Administrator/unassigned gain no business authority.

Routine completion requires existing `scholars.update` and `academic.edit`, fills NULLs only, and retains the protected-establishment boundary. Reviewed corrections require Coordinator authority, explicit review, source and reason; they may replace or clear wording without altering academic or financial records. Fresh commands require the available current working year and a manual intake. Historical/closed years remain read-only. Imports retain their original Excel source and cannot receive manual text events.

New POST completion/correction routes and bounded GET history use the existing annual-intake infrastructure. Intake locking serializes an absent text head; event, audit and receipt commit once on the same connection. Full-chain validation uses bounded 500-row reads for history/writes. Current and pinned source reads load owner sets in chunks of at most 1,500; no per-person history round trip was added.

Fresh encrypted source/pre-upgrade/post-upgrade checkpoints passed isolated restoration, including executable views, constraints and triggers. The upgraded table was initially empty; all 65 old journal rows/checksums/timestamps and protected rows matched. A separate populated 65-copy rehearsal used the actual accepted old registration service to create a genuine v1 receipt, then verified its exact retry after F56 and later text completion. A backup with populated new text history also restored successfully. Temporary rehearsal/restore identities were removed. Existing **64 MiB SQL / 96 MiB archive / 100,000 rows per table** bounds remain. [Upgrade](../../output/b2-2-implementation-20261025/upgrade.json), [old-receipt and populated-history recovery](../../output/b2-2-implementation-20261025/receipt-upgrade.json).

Preflight rejects primary/retained/original targets by default. Populated copies require exact ownership/runtime/source and fresh verified recovery/grant proof. A forced partial-DDL interruption retained its committed prefix; blind retry stopped, the exact empty prefix was inspected, and reviewed forward repair passed in the disposable rehearsal. [Partial-DDL evidence](../../output/b2-2-implementation-20261025/partial-ddl.json).

## Exact candidate files

**17 modified and 11 new code/test/schema files**, entirely in the external candidate. The [file inventory](../../output/b2-2-implementation-20261025/candidate-files.json) records every SHA-256.

| Candidate paths | Change |
|---|---|
| New `db/migrations/20261025020000_f56_intake_supplied_text.sql`; new `scripts/intake-text-preflight.mjs`; `scripts/migration-lib.mjs`; generated `server/schema-manifest.ts` | F56 storage, guarded upgrade, narrow grants and 66-entry readiness |
| New `server/scholars/intake-text-model.ts`, `intake-text-validation.ts`, `intake-text-source.ts`, `intake-text-service.ts` | Exact strings, versioned state, chain/source validation, reads and same-connection commands |
| `server/scholars/annual-intake-model.ts`, `annual-intake-validation.ts`, `annual-intake-service.ts`, `routes.ts` | V2 registration, separate text DTOs/history/routes, receipts and audits |
| `server/imports/model.ts`, `service.ts`, `intake-binding.ts`, `confirmed-scope.ts` | V2 reviewed correspondence, historical pins and backward-compatible source validation |
| `src/AnnualIntakePanel.tsx`, `src/annual-intake-api.ts`, `src/ScholarImport.tsx`, `src/styles.css` | Text controls/history/review, exact old-command recovery, scoped wrapping/focus and a directly affected pager character fix |
| New `tests/intake-supplied-text.test.ts`, `intake-text-preflight.test.ts`, `intake-text-registration.test.tsx`; `tests/registry-presentation.test.tsx` | Validators, transitions, source/retry/role/UI contracts; replace the deferred-text assertion |
| New `scripts/test-intake-supplied-text-db.ts`, `scripts/test-intake-text-upgrade-db.mjs`; `scripts/test-import-bindings.ts`; `package.json` scripts only | Owned integration/upgrade/recovery and compatibility scenarios |

No workbook/parser, academic/standing/financial writer, permission mapping, dependency, feature flag, `.env`, retained launcher, old migration or `annual-intake-source.ts` hash builder changed. No extra mechanical fresh-schema assertion change was needed. Task-local helpers, fixtures, generated builds and the read-compatible rollback variant are separately retained evidence, not extra normal application edits.

## A2.1 Excel handoff

The eight-column template and original stored Excel cells remain unchanged. New reuse previews use `intake-match/v2`, pinning the exact text revision/hash and each field's decision: **not supplied**, **literal same**, or **reviewed correspondence**. Literal comparison is exact Unicode equality, including spaces. A difference requires an initially unchecked acknowledgment and actual source/reason for that specific row. It creates no alias or general equivalence.

Preview shows supplied wording, stored Excel wording and the actual proposed reference target. Existing and named-reference targets remain supported; actual resolution stays inside the existing authorized importer. The academic **2–160-character name limit** is unchanged by the 300-scalar supplied-text allowance. Course pending, known-ID/classification/year conflicts, registration-only reuse, receipt/document checks and Coordinator account-private approval remain enforced.

Confirmation locks/rechecks the current text and rejects stale previews, including absence→known. New reused sources are `bound-import/v2` / `import-intake-binding/v2`. The shared resolver verifies one-to-one row/result/binding ownership, canonical hashes, reviewed targets and historical text pins. Later corrections do not rewrite confirmed bindings, old prior reviews or frozen financial hashes. Legacy confirmed sources retain their original interpretation; a saved unconfirmed v1 match becomes stale if text has since appeared. Old successful retries still return their committed result.

## Fictional browser scenario and accessibility

The source packet was declared before commands. Staff registered **LDSS-2026-01001**, New, with `CNSC` / `BSIT`. Coordinator registered **LDSS-2026-01002**, first-digital Continuing, with both values NULL, then completed them to ` OLLCF ` / `BSIT`, and reviewed a correction clearing only the unconfirmed course. All three text states remain visible, including exact surrounding spaces and original NULLs.

A later approved three-row Excel import reused both IDs and created **LDSS-2026-01003**. Its review showed **1 new / 2 existing / 0 unresolved**, with three explicit correspondence reviews: two abbreviations versus full labels and one whitespace difference. Confirmation committed once and created two bindings. Original manual wording remains beside linked Excel evidence and separate academic placement. The import's normal approved academic/annual/Continuing effects are distinct from text commands; it created no payment or entitlement. [Accepted import](../../output/b2-2-implementation-20261025/import-commit-accepted.log), [linked history](../../output/playwright/b2-2/coordinator-linked-source.png).

Staff's repeated same-year identity attempt reached duplicate review and was rejected with `ANNUAL_INTAKE_EXISTS`; no second identity/root was made. Staff could not correct established wording or confirm an approved import. Coordinator's required review acknowledgments began unchecked. Empty classification/identity/reference, short reference, 301-scalar and prohibited-paste checks prevented invalid saves. Both test sessions were signed out; no primary account authenticated for this task.

Coordinator registration also exercised a real lost response: the server committed, the browser response was aborted, and reload retried the exact saved UUID key/body. The retry returned 201, loaded the saved profile and cleared recovery storage; only one registration exists. Network evidence independently verifies the matching bodies/keys. [Recovery proof](../../output/b2-2-implementation-20261025/browser-recovery-verified.json).

Both roles passed **1440/1024/820/375/320 CSS pixels**, at 900-pixel height, with no page-level overflow. School→Course keyboard order, 3-pixel visible focus, validation, duplicate-review focus and Cancel returning to Add Scholar passed. Supplied history and import review wrap locally; narrow existing tables intentionally scroll. Matched before/after registration captures use the same Coordinator, copy, 1,001-person state, blank form and default zoom. The accepted B2 client was replayed only through candidate static-asset interception; no database or primary source was reverted.

| Width | Registration before / after | Supplied history | Import review |
|---|---|---|---|
| 1440 | [Before](../../output/playwright/b2-2/before-registration-1440.png) / [After](../../output/playwright/b2-2/after-coordinator-registration-1440.png) | [History](../../output/playwright/b2-2/coordinator-history-1440.png) | [Review](../../output/playwright/b2-2/import-ready-1440.png) |
| 1024 | [Before](../../output/playwright/b2-2/before-registration-1024.png) / [After](../../output/playwright/b2-2/after-coordinator-registration-1024.png) | [History](../../output/playwright/b2-2/coordinator-history-1024.png) | [Review](../../output/playwright/b2-2/import-ready-1024.png) |
| 820 | [Before](../../output/playwright/b2-2/before-registration-820.png) / [After](../../output/playwright/b2-2/after-coordinator-registration-820.png) | [History](../../output/playwright/b2-2/coordinator-history-820.png) | [Review](../../output/playwright/b2-2/import-ready-820.png) |
| 375 | [Before](../../output/playwright/b2-2/before-registration-375.png) / [After](../../output/playwright/b2-2/after-coordinator-registration-375.png) | [History](../../output/playwright/b2-2/coordinator-history-375.png) | [Review](../../output/playwright/b2-2/import-ready-375.png) |
| 320 | [Before](../../output/playwright/b2-2/before-registration-320.png) / [After](../../output/playwright/b2-2/after-coordinator-registration-320.png) | [History](../../output/playwright/b2-2/coordinator-history-320.png) | [Review](../../output/playwright/b2-2/import-ready-320.png) |

[Staff acceptance](../../output/b2-2-implementation-20261025/staff-acceptance.log), [matched layout checks](../../output/b2-2-implementation-20261025/browser-layouts-accepted.log), [final history checks](../../output/b2-2-implementation-20261025/coordinator-history-final.log). The local ui-ux-pro-max and Playwright skills were used. Native 200% zoom/full assistive-technology/WCAG acceptance is not claimed.

## Tests and measurements

| Final command/check | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run check:secrets` | **All exit 0; 117 files / 748 tests passed**. Complete normal build; existing Vite chunk-size warning remains |
| `node --import tsx scripts/test-intake-supplied-text-db.ts` | **Exit 0**, new text/compatibility assertions plus all **13 existing F27 import groups** and actual prior-review/publication/historical integration |
| `node --import tsx scripts/test-import-db.ts --prior-quick --large-approved` | **Exit 0; 14 groups**, genuine 1,500-row roster, full rollback and safe retry |
| Owned upgrade/recovery and partial-DDL rehearsals | Passed; genuine old receipt, populated new history, immutable constraints and narrow grants |
| Twelve existing DB suites | **All exit 0:** RBAC, academic, approved academic changes, standing, Registry, historical omission, recording, reconciliation, individual settlement, financial reports, individual documents and omitted settlement |
| Final six shared-reader/financial repeats | **All exit 0:** historical omission, Registry, recording, reconciliation, individual settlement and financial reports |
| 66-compatible read/retry rollback build | Build and acceptance passed; old/v2 committed retries and evidence readable, fresh v2/text/binding commands paused; not activated |

The new DB driver covers exact Unicode/unknowns/New/Continuing, legacy ID registration, permissions, duplicate/stale/conflicting sources, five forced registration rollback points, concurrent/lost-response/closed-period retries, protected-source equality, correspondence/literal decisions and later correction with historical pins retained. Existing A2.1 scenarios retain six import rollback points, actual person versions and complete source integration. Financial drivers retain R01/R07 parity, exact retry/atomicity and complete API/XLSX/PDF output checks. No safeguard, limit, lint rule or strictness setting was weakened. [Normal exits](../../output/b2-2-implementation-20261025/checks-main.json), [unit log](../../output/b2-2-implementation-20261025/test-main.log), [new DB log](../../output/b2-2-implementation-20261025/intake-db-delivery.log), [large import](../../output/b2-2-implementation-20261025/large-approved.log), [twelve suites](../../output/b2-2-implementation-20261025/regressions-intake-text/results.json), [six final repeats](../../output/b2-2-implementation-20261025/regressions-intake-text-delivery/results.json).

Three sequential matched service samples per case used the same owned copy and Staff role. Measurement mutations were rolled back. Annual reads requested 25/50/100 but actually returned **one annual root**, not full histories. Core annual/import outputs matched after excluding explicitly added text/version metadata.

| Measured operation | SELECTs before→after | Before milliseconds | After milliseconds | Response bytes before→after |
|---|---:|---|---|---:|
| Annual list, requested 25 | 9→11 | 15 / 4 / 3 | 7 / 4 / 4 | 931→1,044 |
| Annual list, requested 50 | 9→11 | 4 / 4 / 4 | 4 / 4 / 6 | 931→1,044 |
| Annual list, requested 100 | 9→11 | 3 / 4 / 3 | 4 / 4 / 4 | 932→1,045 |
| Rolled-back registration, v1→v2 added fact | 18→18 | 66 / 23 / 19 | 31 / 22 / 21 | 839→991 |
| 1,500-row staging, unmatched new rows | 6,012→6,012 | 18,069 / 18,318 / 16,389 | 16,193 / 18,601 / 12,955 | 4,098,530→4,154,030 |

The two new annual metadata reads are set-based. A 1,501-owner unit scenario needs four text-source queries, two per chunk. The existing per-row F05/reference pipeline accounts for the large staging query count; this batch neither introduced that count nor optimized it. These 1,500-row samples do **not** benchmark 1,500 reviewed matches. The separate real 1,500-row integration run measured stage **4,440 ms**, forced rollback **42,112 ms**, confirmation **39,990 ms**. No speedup, HTTP/concurrency/LAN-capacity certification or full-page annual-history claim follows. SQL rows/decoded bytes and scopes are retained in [measurements](../../output/b2-2-implementation-20261025/performance.json).

## Preservation and review package

All **1,276 protected main-workspace inputs** match their starting hashes. Primary remains **65 migrations**, database **`ldss_primary_test_12676_61497616`**, runtime **`ldss_primary_12676_61497616@localhost`**, controller/API/Vite **48432 / 43076 / 44740**. No task primary login, migration, restart, business command, source promotion or `.env` repoint occurred. Retained listeners at 3011/3012/3013/3015/3016/3018/3019 retain their owning PIDs. This is not a new exhaustive inventory of every retained database. [Final file/link/package verification](../../output/b2-2-implementation-20261025/documentation-checks.json).

Fresh primary business values/definitions, migration checksums/timestamps, accounts/password hashes/roles and grants match. Scholar IDs/contact/version, annual classification, approved imports/bindings, Masterlists, academic/standing sources, frozen financial evidence and payment dates remain exact.

| Primary fact | Fresh before→after |
|---|---|
| Scholars / accounts | **1,000 / 14 → unchanged** |
| Annual intake roots / academic records | **1,000 / 1,000 → unchanged** |
| Entitlements / allocations | **1,000 / 1,000 → unchanged** |
| Payments | **2 Paid → 2 Paid**, exact original rows/evidence, both dates **2026-10-24** |
| PAY-001 / PAY-002 | **2 Paid / 798 Pending** and **200 Pending**, both `canRecord:true` |

Full fresh payment previews on primary and copy accept **798 / 200**, with zero conflicts; none was committed. All **10,395 starting primary audit rows** remain exact. One concurrent authentication event was appended (**10,396 total**), with sessions **23→24** and ordinary rate-limit/session activity. This task used no primary authentication endpoint; the difference is explicitly qualified rather than claiming zero database activity. [Preservation](../../output/b2-2-implementation-20261025/preservation.json), [authoritative financial reads](../../output/b2-2-implementation-20261025/readiness.json).

The copy ends with **1,003 people/intakes/academic records, four text events, two bindings**, original **1,000 entitlements/allocations and two payments**. Original protected rows remain exact except the declared sequence advance by three and approved permission label. Added academic/qualification/Continuing evidence came from the declared approved import, not typing text. A labelled unconfirmed rollback-probe import job is retained as test evidence; it created no identity, text, binding or financial outcome. Copied sessions/reset tokens/rate limits were excluded at provisioning. All mutating regressions used newly owned environments, never primary/retained fixtures.

Review deliverables: [28-file hashes](../../output/b2-2-implementation-20261025/candidate-files.json), [candidate patch](../../output/b2-2-implementation-20261025/B2_2_CANDIDATE.patch), [source archive](../../output/b2-2-implementation-20261025/candidate-source.zip), [normal 66 build](../../output/b2-2-implementation-20261025/compatible-build.zip), [66 read/retry rollback build](../../output/b2-2-implementation-20261025/read-compatible-build.zip), [rollback acceptance](../../output/b2-2-implementation-20261025/rollback-acceptance.json). Archives exclude `.env`, credentials, keys and the candidate Apache isolation rule. `git apply --check` passed against the actual dirty main baseline; **the patch was not applied**. A separate staging round trip reproduced all 28 hashes.

**Exact-byte installation qualification:** use archive-byte copying or `git -c core.autocrlf=false apply`, then verify every hash. Plain Windows autocrlf handling changed a new SQL file's line endings in the first staging probe. Those changed bytes were never migrated; accepted F56 bytes remain unchanged. Do not regenerate SQL line endings or edit an applied checksum.

The candidate is running PID **30588** on loopback 3020; startup verified all 28 reviewed source hashes. Frontend and exact 66-entry readiness both return 200. Restart only this candidate from its directory with `node --import tsx output/b2-2-implementation-20261025/serve.ts`; it performs no startup migration/reset. [Running package](../../output/b2-2-implementation-20261025/server.json).

## Limits and separately approvable FT5

Supplied wording asserts no institutional identity or equivalence. Unsupported academic names remain subject to existing 160-character/reference rules. A2.1 still rejects established histories and unresolved hard conflicts. Fresh text commands remain current-working-year only. Registry academic filters do not search raw wording. Narrow tables intentionally scroll; native zoom/full AT/WCAG and office/LAN acceptance remain unverified. The existing build warning remains.

Development checks exposed a migration-journal assertion that initially counted the intended F56 addition as a difference, legacy-fixture/DTO/query assertions, and a narrow history pager overflow. These were corrected before final acceptance; completed DDL was verified rather than rerun. The browser tool yielded during beforeunload, so settled UI/database and captured exact requests were checked before any further mutation. The rollback variant initially lacked an unchanged deployment dependency in its isolated build copy; its complete rebuild and acceptance then passed. No runtime grant, source guard or financial validation was relaxed.

The next separately authorizable operation is **FT5**, not another implementation batch:

1. Freshly verify the exact primary host/runtime/profile/listener ancestry, 65 accepted checksums, current dirty source and reviewed package. Preserve every intervening legitimate transaction; do not assume this report's payment count remains current.
2. Capture current file/business/account/grant/audit/frozen-source inventory and a fresh encrypted recovery checkpoint, verified by a new isolated restore. Preserve the accepted 65-compatible B2 build and retained static-client artifacts. No candidate people, credentials or probe jobs move to primary.
3. Prepare a narrowly target-bound F56 primary preflight adapter with current proof. The delivered default preflight rejects primary; no force switch or old F55/candidate proof is sufficient. Promote only reviewed exact bytes, generated 66 manifest, the approved receipt/label change and SELECT/INSERT on the one table. No new role, financial flag, policy or academic migration follows.
4. Coordinate maintenance and compatible 66 API/frontend activation; verify both roles and current financial/source preservation read-only. Keep synthetic saves/imports in owned copies unless separately authorized on primary.
5. Before DDL, retain the saved 65 B2 profile. After F56/text evidence, use the tested **66-compatible read/retry package** to pause fresh commands while investigating or forward-repairing. Do not start a 65-only reader, delete history/bindings, downgrade F55/F56 or restore stale data over later activity.

**Stopped after isolated implementation, verification and this report.** Primary 5173 remains on its accepted B2 source. No FT5 promotion, directory management, Dashboard, payment-status colors, typography batch, rollover, financial-policy change, retained-environment reset/restart, LAN/production operation or unrelated enhancement was performed.
