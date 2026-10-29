# A6.2 — Graduation Monitoring implementation and isolated acceptance

24 October 2026, Philippine time. **AP1–AP4 implemented and verified in an isolated candidate. AP5 was not executed.** The accepted candidate is available at [localhost:3015](http://127.0.0.1:3015/#scholars?task=graduation). The permanent [5173 UAT](http://127.0.0.1:5173/) retains its existing source, 63-migration database, accounts, financial flags and business records. This report follows the approved [implementation contract](A6_2_GRADUATION_IMPLEMENTATION_CONTRACT.md), [DM-G1](DM_G1_PROGRAM_DURATION_SPEC.md) and [DM-G2](DM_G2_GRADUATION_MONITORING_SPEC.md).

Implementation is deliberately **outside the running primary source directory**, at `C:/xampp/htdocs/ldss_a62_candidate_20261024`. Copying these changes into the primary workspace would hot-replace its Vite source before its database upgrade; that was not authorized. The [review patch](../../output/a6-2-implementation-20261024/candidate-review.patch), [changed-source archive](../../output/a6-2-implementation-20261024/candidate-source-changes.zip), [64-compatible build](../../output/a6-2-implementation-20261024/candidate-64-compatible-build.zip) and [file/hash inventory](../../output/a6-2-implementation-20261024/review-package.json) make the complete implementation reviewable without applying AP5. `git apply --check --whitespace=nowarn` passed against the actual dirty-worktree baseline; the patch was **not applied** there.

## Environment and verified result

| Item | Final identity / result |
|---|---|
| Accepted isolated URL | **http://127.0.0.1:3015/**; Node serves the candidate's compiled client/API on loopback |
| Accepted database | **`ldss_graduation_test_24500_e8abbac3`** |
| Restricted runtime | **`ldss_gra_24500_e8abbac3@localhost`**; own-schema access only |
| Schema | **64 migrations / 147 tables**, including final F54 |
| Source cohort | Separate copy of the existing synthetic primary; **1,000 people**, unchanged permanent IDs, academic/intake/import/publication and frozen financial sources |
| PAY-001 | **800 Pending, `canRecord:true`**, 800 allocations |
| PAY-002 | **200 Pending, `canRecord:true`**, 200 allocations |
| Financial totals | **1,000 distinct semester entitlements / allocations; zero payment records**; existing PHP 5,000 entitlement rules unchanged |
| Graduation write gate | True only in the new owned candidate launcher; effective default remains false |
| Permanent primary | **`ldss_primary_test_12676_61497616`**, still 63 migrations at 5173; API 3001 |

[Readiness evidence](../../output/a6-2-implementation-20261024/verified/readiness.json), [upgrade](../../output/a6-2-implementation-20261024/verified/upgrade.json), [integrity](../../output/a6-2-implementation-20261024/verified/integrity.json), [constraints](../../output/a6-2-implementation-20261024/verified/constraints.json).

The original 212-person database, 3011/3012, A–F, V1/V2 and earlier annual-registration fixtures were not reset, upgraded or repointed. Main `.env` and all five existing financial feature settings remain unchanged. The candidate reuses the synthetic cohort's existing financial configuration; this task introduces only the separately isolated graduation-write gate.

Synthetic Staff/Coordinator logins use the existing fixture actors. Their passwords were neither changed nor printed. Runtime credentials and encrypted recovery keys remain in restricted private directories. Copied sessions, password-reset tokens and rate-limit rows were omitted during restore; browser tests used fresh ordinary authentication. No original user's plaintext password was requested or used.

## Files changed

There are **61 candidate source changes: 25 additions and 36 modified files**. Generated build outputs are additional artifacts. The exact paths, original/current hashes and complete patch are in the [review inventory](../../output/a6-2-implementation-20261024/review-package.json).

| Boundary | Implementation |
|---|---|
| New F54 SQL | `db/migrations/20261024020000_f54_graduation_monitoring.sql`: five tables, constraints/indexes, ten immutable triggers, four permissions and six role mappings |
| Migration/grants | New `scripts/graduation-monitoring-preflight.mjs`; targeted `scripts/migration-lib.mjs` hook and grants; generated `server/schema-manifest.ts` |
| New `server/graduation/` | `duration-model`, `duration-validation`, `duration-source`, `duration-service`, `monitoring-model`, `monitoring-validation`, `monitoring-source`, `monitoring-service`, `commands`, `routes` |
| Existing server wiring | `server/app.ts`, `server/config.ts`, `server/authorization/policy.ts` |
| A6.1 reads | `server/scholars/graduation-monitoring.ts` and `graduation-monitoring-model.ts`: shared source/count/page derivation, capabilities, exact decimal display contract and expanded explicit year normalization |
| UI | Existing `GraduationMonitoring.tsx`; new `GraduationReview.tsx`, `ProgramDurationReview.tsx`, `graduation-api.ts`, `graduation-navigation.ts`; scoped `styles.css` |
| Small wiring delta | `ScholarWorkspace.tsx` passes the existing session to the new forms for CSRF/recovery. Navigation and existing workspaces retain their contracts |
| Unit tests | Six new duration/evidence/command/preflight/navigation/review suites; update the existing monitoring suite to require an explicit final-year mapping |
| DB acceptance | New program-duration, upgrade and owned-check drivers; extend the existing monitoring driver; four package scripts, with no dependency change |
| Fresh-schema compatibility | The 24 approved drivers use `schemaManifest.length` for their all-migrations assertion. RBAC expectations add only the approved codes/mappings. Intentional historical-stage tests remain historical |

`scripts/check-database.mjs` remains unchanged for the preserved original development identity/schema. Financial, academic, status, import, Masterlist, continuing, notification-capture and B3a implementations were not edited. `FocusedDialog.tsx` and financial pending-command formats remain unchanged. No lint rule, TypeScript strictness setting, dependency or output/evidence limit was relaxed.

## F54, permissions, grants and recovery

The final migration creates `program_duration_references`, `program_duration_events`, `graduation_monitoring_cases`, `graduation_monitoring_events` and `graduation_commands`. Roots/events/receipts reject UPDATE and DELETE. Event predecessors and linked origins stay within their owner; nullable annual case scope uses the generated non-NULL key and a unique person/year/scope constraint. Services validate transitions, semantic hashes, current heads, source ownership and linked targets in addition to physical constraints.

| Permission | Staff | Coordinator | Pure Administrator / unassigned |
|---|---:|---:|---:|
| `program.duration.prepare` | Yes | Yes | No |
| `program.duration.confirm` | No | Yes | No |
| `graduation.monitoring.record` | Yes | Yes | No |
| `graduation.monitoring.review` | No | Yes | No |

Every write also checks `scholars.read` in the same current access snapshot. These are **four new permission rows and six role-permission rows**, not new user-role assignments. Coordinator may prepare and confirm their own source or directly record a reviewed correction; no universal separate-person requirement was added. Formal-standing permissions retain their previous meaning.

The new runtime receives **SELECT/INSERT only** on the five new tables. Runtime UPDATE/DELETE/DDL and cross-schema operations were denied. Separate restore-definer identities are confined to their own new schema and are not application roles. Existing runtime identities/grants were preserved.

Preflight admits a fresh PID-owned regression schema, or a populated new owned copy with an exact local server/schema identity, fresh encrypted backup, successful isolated restore, archive/report hashes and unchanged inventory. It rejects original, retained and primary targets; **there is no AP5 exception or generic force flag in this package**. Partial F54 objects stop a blind retry. The disposable partial-DDL test retained the committed two-table prefix, verified it, completed the reviewed remaining statements and preserved every older checksum.

An initial, unaccepted prototype exposed MariaDB CHECK's NULL behavior. Final F54 explicitly rejects NULL predecessors/hashes, missing annual mappings and partial duration pins. The first database, `ldss_graduation_test_25072_756c1f5c`, and its original journal were retained for diagnosis; its 3014 server was stopped. **No applied checksum or immutable prototype row was rewritten.** Final F54 was applied to the second fresh copy above. All 63 accepted earlier migration files/checksums remained exact. Final F54 SHA-256 is `31f507ee9ca5358ec6a64bb667ba6ef4055abb8d83bd486a67b7bdd23a0d8d66`.

Fresh encrypted backup/restore checks covered the source, populated pre-F54 copy, upgraded copy and populated final monitoring state. The final checkpoint restored **147 tables**, **53,746,032 SQL bytes** and **13,718,545 encrypted bytes**; table values, schema objects and constraint probes passed, and the temporary restore was removed. The existing 64 MiB SQL / 96 MiB archive / 100,000-row-per-table bounds were unchanged. [Recovery proof](../../output/a6-2-implementation-20261024/verified/accepted-recovery.json). Recovery files/keys are private; this proof does not authorize restoring over a live database.

## Source workflows and safe indicators

Staff can prepare school/course duration evidence with explicit curriculum/cohort applicability, configured year scope, issuer/reference, optional actual source date/location, nominal duration and a separately evidenced final-year mapping. Coordinator confirmation uses a fresh source/overlap preview. Unknown nominal duration stays NULL; nominal values are exact decimal strings, including `4.50`. No rounding supplies an annual final level. Confirmation rejects overlapping scopes; reads require exactly one applicable confirmed current head. Disputed, retired, rejected or superseded-looking history does not silently revive an older confirmation.

Reference preparation, correction, dispute, withdrawal, rejection and retirement retain immutable history. Decision references are stored separately from the underlying school-source reference. Preview resolves peer scope metadata as a set and shows a bounded first page of cases retaining a source. Confirmation is not academic approval or a financial funding-duration rule.

Monitoring supports source-backed Expected, actual Delayed, follow-up, missing/disputed evidence, proposed material corrections, Coordinator dispositions/revalidation and annual curriculum/cohort binding. Expected precision is academic year, semester or a genuinely supplied exact date. Unconfigured future periods retain their labels and NULL IDs; no calendar is created. Follow-up can retain an actual method/next date without changing assessment facts.

A first missing-evidence flag retains its actual finding. Staff can propose replacement evidence against that review origin; Coordinator can review it or directly resolve it. Missing/stale academic context cannot be confirmed, but Coordinator can reject an unsupported proposal without pretending that placement exists. Pending material review cannot be bypassed with routine reassessment. Earlier facts, flags, sources and review outcomes remain in history.

The resolver uses canonical annual academic placement plus the latest approved change, without borrowing initial-intake values when that canonical course is unknown. It pins semantic academic/change/Course-pending, confirmed program context, duration and calendar facts; contact/profile versions and payment state are excluded. Changed sources withhold current interpretation and require the appropriate review. A newly known duration does not silently reapprove an earlier unresolved expectation.

Formal **Graduated** remains exclusively the existing standing/graduation/correction source. Otherwise, unresolved applicability, missing duration, stale evidence or material review withholds the primary indicator. Fresh supported Expected/Delayed then takes precedence over derived Potential. Potential requires the explicit final-year mapping: IV/4 passes, IV/5 is non-final, V/5 passes; beyond/unknown levels do not become Delayed. Annual and semester cases remain separate. All-semester ambiguity asks for semester context; a stale material semester assessment cannot fall back to annual history.

All packets/examples are explicitly fictional, declared before their commands. Fictional course names were never promoted into official duration evidence. Monitoring did not change formal standing, academic placement, annual participation, official membership, requirements, prior approvals, financial source pins or stipend rights.

## UI and browser evidence

The existing Registry tab and dark-green layout remain. Repeated warnings became compact help plus **How indicators work**. Search/year/semester/filter/sort/page context remains in the URL; UI-only `review`/`duration` fields are removed before strict API query validation. Review panels display current evidence, unresolved causes, history and authorized next actions. Forms start with explicit unselected actions/source types and unchecked review confirmations. Staff cannot see or invoke Coordinator confirmation/review authority.

Staff submitted a source, recorded follow-up, proposed a material correction and used exact uncertain-request recovery. Coordinator confirmed that source, reviewed the correction and resolved a first missing-evidence flag. Pure Administrator/unassigned saw the access explanation and API 403, with no scholar table. CSRF denial, read-error Retry, history, source viewing, keyboard close and actual row-focus restoration passed.

| Evidence | Captures / results |
|---|---|
| Staff list | [1440](../../output/playwright/a6-2/verified/staff-1440.png), [1024](../../output/playwright/a6-2/verified/staff-1024.png), [820](../../output/playwright/a6-2/verified/staff-820.png), [375](../../output/playwright/a6-2/verified/staff-375.png), [320](../../output/playwright/a6-2/verified/staff-320.png) |
| Source preparation / confirmation | [Staff entry](../../output/playwright/a6-2/verified/staff-source-entry-1024.png), [submitted](../../output/playwright/a6-2/verified/staff-source-proposed.png), [Coordinator review](../../output/playwright/a6-2/verified/coordinator-source-confirm.png) |
| Material correction | [Staff pending](../../output/playwright/a6-2/verified/staff-pending-correction.png), [Coordinator 1024](../../output/playwright/a6-2/verified/coordinator-review-1024.png), [320](../../output/playwright/a6-2/verified/coordinator-review-320.png), [saved history](../../output/playwright/a6-2/verified/coordinator-correction-saved.png) |
| Final compiled list | [1440](../../output/playwright/a6-2/verified/final-1440.png), [1024](../../output/playwright/a6-2/verified/final-1024.png), [820](../../output/playwright/a6-2/verified/final-820.png), [320](../../output/playwright/a6-2/verified/final-320.png) |
| Supported Expected | [1440](../../output/playwright/a6-2/verified/coordinator-expected-1440.png), [1024](../../output/playwright/a6-2/verified/coordinator-expected-1024.png), [820](../../output/playwright/a6-2/verified/coordinator-expected-820.png) |
| Recovery / first flag | [Uncertain request](../../output/playwright/a6-2/verified/staff-uncertain.png), [confirmed review](../../output/playwright/a6-2/verified/staff-review-1024.png), [first-flag resolution](../../output/playwright/a6-2/verified/first-flag-resolved.png) |
| Restricted roles | [Administrator](../../output/playwright/a6-2/verified/denied-system-admin.png), [unassigned](../../output/playwright/a6-2/verified/denied-unassigned.png) |
| Keyboard | [820](../../output/playwright/a6-2/verified/keyboard-820.png), [320](../../output/playwright/a6-2/verified/keyboard-320.png); [structured checks](../../output/a6-2-implementation-20261024/verified/browser-keyboard.log) |

No page-level horizontal overflow was observed at the five tested widths. Native Tab reached the Review link with a **3-pixel outline** and scrolled the table horizontally where needed. Escape returned focus after route remount/data reload. A browser-only aborted monitoring request retained its key/body, survived reload, and retried once with the exact saved command. The native before-unload protection appeared; its acknowledgment and recovery were tested. No financial request was submitted in these browsers.

Native zoom shortcuts left width/DPR unchanged. **Exact 200% native zoom remains unverified**; no CSS zoom substitute or accessibility certification is claimed. The local ui-ux-pro-max and Playwright skill workflows were used.

## Verification and G01–G12 coverage

All final package commands exited **0**. [Command/exit ledger](../../output/a6-2-implementation-20261024/quality-results.json).

| Command | Final result |
|---|---|
| `npm run lint` | Zero errors/warnings; [log](../../output/a6-2-implementation-20261024/final-lint.log) |
| `npm run typecheck` | Client/server/validation projects passed; [log](../../output/a6-2-implementation-20261024/final-typecheck.log) |
| `npm run build` | Complete normal build passed; existing Vite chunk-size warning remains; [log](../../output/a6-2-implementation-20261024/final-build.log) |
| `npm test` | **107 files / 685 tests passed**; [log](../../output/a6-2-implementation-20261024/final-test.log) |
| `npm run check:secrets` | Passed; [log](../../output/a6-2-implementation-20261024/final-check-secrets.log) |
| Monitoring disposable driver | **54 successful setup/read calls plus positive/negative assertions**, followed by owned cleanup; [log](../../output/a6-2-implementation-20261024/a62-read-regression-final.log) |
| Independent source/evidence fixture drivers | Source, correction, context, retry, role, transaction and no-side-effect checks passed; [workflow](../../output/a6-2-implementation-20261024/verified/workflow-checks.json), [extended](../../output/a6-2-implementation-20261024/verified/extended-checks.json), [races/rollback](../../output/a6-2-implementation-20261024/verified/rollback-and-races.json) |
| F54 / grants / recovery | Populated 63→64, explicit NULL rejection, 372 orphan-free FK groups, immutable triggers, narrow grants, checksum and isolated recovery checks passed |
| Compiled rollback artifact | Manifest64 readiness, 1,000-person evidence reads, exact old receipt and default-off fresh-write rejection passed; [proof](../../output/a6-2-implementation-20261024/verified/compiled-rollback.json) |

The **final F54 schema** also passed the existing RBAC, academic, academic-change, standing, Registry/R02/R07 parity, historical-omission, Payment Recording, both reconciliation branches, individual settlement/race, individual documents/recovery, omitted settlement and financial-report drivers. These ran in owned disposable schemas, with isolated artifacts. The recording/reconciliation tests retain their retry, date, stale source, accepted-set, role, audit/transaction and Original/current distinctions. Document/settlement tests retain cancellation/replacement, representative, exclusive-route and recovery behavior. API/XLSX/PDF financial checks remain the existing validators. [Exact commands/exits](../../output/a6-2-implementation-20261024/regressions-final/results.json).

| Family | Observed coverage / evidence boundary |
|---|---|
| G01 | Real four/five-year confirmation and IV/4, IV/5, V/5 outcomes; decimal/unmapped/beyond/unknown and explicit 1–100 label unit checks |
| G02 | Disjoint curricula, pre-LDSS cohort context, broad/cohort overlap rejection and concurrent confirmation with one winner; strict IDs/calendar/hash/owner validation |
| G03 | Course pending, absent placement and known-looking manual initial facts remain unknown; latest approved placement used without initial fallback |
| G04 | Year/semester/date precision, unknown future IDs, actual Delayed, follow-up and evidence retained with unresolved duration |
| G05 | Staff proposal, Coordinator application/revalidation, first-flag resolution, unsupported-context rejection and source-retirement/change withholding |
| G06 | Separate annual/semester roots, All-semester ambiguity, bounded history/list/count/filter/search and stable page ordering; URL/focus tests |
| G07 | Actual existing formal graduation/approval/correction in disposable standing tests; final-stipend and financial routes retain their existing protections |
| G08 | Role/CSRF/strict-field denial, concurrent/exact/changed retries, completed retry after closure/gate disable, revoked-role denial and forced event/audit/receipt rollback |
| G09 | Monitoring commands changed no existing academic/intake/participation/publication/document/prior-review/frozen/entitlement/allocation/payment/Original table values |
| G10 | Fresh populated backup/restore, final 63→64 upgrade, immutable grants/constraints, partial-DDL stop and inspected additive forward repair |
| G11 | Staff/Coordinator and denied roles, source/correction/history/recovery/error, five widths, keyboard/table scroll/focus; native zoom qualification above |
| G12 | Financial/academic/status/Registry regressions, actual copied 800/200 fresh-source summaries, compiled rollback and populated recovery |

This is bounded synthetic acceptance, not exhaustive fault injection for every possible office history, named office acceptance, a new P10 certification or LAN capacity approval.

Early checks intentionally remain traceable: SELECT-only snapshot compatibility, SQL collation/literal handling and outer ordering were corrected in the new projection; a missing-source flag's resolution/history and unsupported-context rejection were tested explicitly. Prototype NULL constraints were fixed through a new copy, never a checksum rewrite. Initial financial recovery runs used a folder containing digits and correctly hit the existing path guard; the final runs used valid separate paths. Browser selectors for wrapped selects/textareas and a redundant post-recovery wait were corrected without changing application validation or producing duplicate commands. The final normal checks are green.

## Read cost and bounds

The accepted list shares source resolution for COUNT, category filters and the stable page. Canonical placement, current reference/context/case heads and freshness are resolved in SQL. No per-person full eligibility, academic-history, graduation-settlement or payment-history service is called. History loads only for the selected panel. Reference peers are fetched as a set; reference/case history and affected-case previews are bounded.

[Matched observations](../../output/a6-2-implementation-20261024/verified/performance.json) compare A6.1 and the candidate against the same unchanged synthetic data, actor, year/filter/page, with alternating sequential order and identity/placement/order parity. Source-backed indicator differences are intentional. SELECT counts include fresh authorization.

| Rows | A6.1 SELECTs | A6.2 SELECTs | Local A6.1 / A6.2 sample ranges |
|---|---:|---:|---|
| 25 | 9 | 9 | 32–100 ms / 103–135 ms |
| 50 | 9 | 9 | 32–33 ms / 103–104 ms |
| 100 | 9 | 9 | 31–35 ms / 103–108 ms |

Metadata was measured separately: 11 SELECTs, approximately 7 ms. The source work costs more than A6.1's deliberately unknown-only projection. **Disposition:** query count remains bounded, but AP5 review must consider the added cost; no speedup, HTTP/browser latency, concurrency, production capacity or performance-remediation claim follows. Reference choice menus retain their explicit 100-item bound. No output was truncated to meet a benchmark or evidence limit.

## Preservation

Before/after inventories compared **18 pre-existing retained schemas**, including primary, original, 3011/3012, A–F, V1/V2 and previous annual fixtures. All existing **business table data/counts, definitions, constraints/triggers/views, migration checksums, accounts/password hashes, role assignments and existing grants** matched. Only the two new owned schemas and their scoped runtime/restore identities were added. [Preservation](../../output/a6-2-implementation-20261024/preservation.json), [new grants](../../output/a6-2-implementation-20261024/new-grants.json).

Primary remained online. Its authentication tables show one added ordinary `auth.login`/session and rate-limit changes during the task window. All **10,372 original audit rows** still match exactly; the extra event is authentication, not monitoring or finance. No zero-authentication-write claim is made. [Audit proof](../../output/a6-2-implementation-20261024/primary-audit-preservation.json). No account/password/role update or graduation command was performed on primary.

The accepted copy's existing business tables remain exact to its prepared checkpoint after all monitoring/browser commands. New activity is confined to the five evidence tables, their linked audits and ordinary candidate authentication. Both frozen payrolls, publications, prior approvals, unique entitlements and all Pending outcomes remain intact. The fresh read-only summaries of **both primary and accepted candidate** still report 800/200 Pending and `canRecord:true`; no primary or candidate financial outcome was committed.

All **1,168 protected primary source/build/configuration/document inputs** match their starting SHA-256 hashes. Main Vite/API remain on their original source/processes; builds ran in the candidate. The source-level Apache denial file was also copied to the isolated directory, and private configuration/recovery paths are restricted. No LAN connection, `.env` repointing, financial policy change, retained-fixture reset, external message, deployment, P11 or other enhancement batch was started.

## Proposed AP5 — not executed

The following is the concrete next maintenance scope, requiring separate authorization. The shipped preflight deliberately rejects primary; do not bypass it or run a generic migration command there.

1. **Pin the target and candidate.** Target only `ldss_primary_test_12676_61497616`, runtime `ldss_primary_12676_61497616@localhost`, MariaDB on this verified Windows host at 127.0.0.1:3306, frontend 5173/API 3001. Recheck current listener ancestry, running synthetic profile, 63-entry journal, current account/source/frozen/financial inventory and reviewed source/build hashes. Stop on drift; do not infer the current state from this dated report.
2. **Approve the narrow primary preflight adapter.** Add/review a target-specific AP5 proof path to `preflightGraduationMonitoring`, requiring explicit AP5 identity, current operator/maintenance ownership, host/port/runtime bindings, fresh archive/restore hashes and exact unchanged inventory. Keep the default PID-owned-only path and original/LAN/other-retained rejection. This is a concrete required AP5 code delta, not an existing callable force option.
3. **Take a fresh encrypted primary backup and verify isolated recovery.** Preserve private keys, all 14 accounts/password hashes/roles, original audit, intake/academic/publication/prior-review sources, both frozen payrolls and 1,000 Pending allocations. Verify all schema objects/constraints and remove the temporary restore. Bind proof to the actual maintenance checkpoint. Do not reuse this task's copy/prototype/F53 markers as proof for a later primary operation.
4. **Maintain the exact main process tree.** Stop only the verified 5173 controller/API/Vite tree for the authorized window; leave MariaDB, original database and retained fixture servers alone. Archive the accepted 63-compatible source/build/profile. Recheck the backup checkpoint immediately before DDL.
5. **Promote the reviewed candidate and apply only final F54.** First recheck the patch against the still-matching dirty baseline. Apply the 17-statement additive migration through the reviewed preflight path; do not edit any older checksum. Seed only the four permissions/six mappings. Add only SELECT/INSERT on the five new tables to the exact primary runtime; do not re-grant broad schema power or update user-role rows.
6. **Verify schema64 before restart.** Require exact 64 checksums, empty new evidence tables, approved metadata additions, old business/account/source/frozen hashes unchanged, zero FK orphans and runtime UPDATE/DELETE/DDL/cross-schema denial. MariaDB DDL is not transactional: an unexplained partial prefix stops the operation. Use inspected forward repair or a separately authorized recovered copy, never a blind rerun/drop.
7. **Start the compatible application with graduation writes off.** Use the packaged 64-compatible build/readers and same synthetic primary identity/ports. Verify readiness, authentication, Registry/A1+A5, monitoring unknown/read-only state, Masterlists, B3a, Individual Payments and both 800/200 `canRecord:true` summaries. Preserve the five current financial overrides and main `.env`.
8. **Activate only after the approved local checks.** If AP5 expressly includes it, enable `GRADUATION_MONITORING_WRITES_ENABLED` only in the synthetic primary launcher; restart that verified profile and recheck role/CSRF/retry/readiness. No original/LAN activation follows. Original Staff/Coordinator passwords remain unchanged; use their normal sign-ins for acceptance.
9. **Optional examples need their own explicit inclusion.** Declare exact fictional source packets/selected people before commands. Prepare/confirm sources and record a small number of supported monitoring examples through the application. Keep unknown dates unknown and all 1,000 financial outcomes Pending. Do not copy prototype approvals, infer durations from names, alter academic placement or turn monitoring into formal graduation. Actual office sources remain necessary for any real records.
10. **Compatible rollback / forward recovery.** A 63-only binary is not compatible with schema64. The tested 64-compatible package can keep readers/history and the same financial configuration while disabling new graduation writes. Preserve permission metadata, receipts and evidence already committed. After valid new activity, do not restore a stale 63 backup, delete event history or drop tables. Resolve a partial DDL or later defect through reviewed forward repair/controlled recovery with reconciliation of subsequent activity.

AP5 would be local primary-UAT maintenance only; it would not authorize LAN/production release, actual school authority, new financial activation, A2/A4/B1/B2, automatic graduation/renewal or P11.

## Local reuse, remaining limits and stop

From the isolated candidate directory, the owned accepted server can be started with `node output/a6-2-implementation-20261024/serve-verified.mjs` when its port is free. For read-only integrity checks select `LDSS_GRADUATION_UAT_OUTPUT=output/a6-2-implementation-20261024/verified` and run `node scripts/check-graduation-monitoring-db.mjs`. The create/upgrade helper refuses an existing manifest. One-time generation drivers are not a reset/resume command; do not rerun them against the accepted state to overwrite evidence. The stopped prototype is diagnostic history and is not compatible with the final F54 checksum; retain it rather than rewriting its journal.

Remaining qualifications are the increased measured read cost, 100-choice metadata bound, native 200% zoom/assistive-technology/office acceptance not certified, and the existing Vite chunk-size warning. Real school applicability/evidence and AP5 remain separate boundaries. No performance batch or production policy follows from these tests.

**Stopped after A6.2 implementation, isolated verification, recovery/package evidence and this report. AP5 is not applied. Primary 5173 remains on its accepted 63-migration environment, and no further enhancement is automatically started.**
