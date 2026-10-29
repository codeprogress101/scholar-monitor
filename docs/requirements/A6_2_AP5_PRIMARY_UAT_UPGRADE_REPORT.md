# A6.2 AP5 — Primary synthetic UAT upgrade

24 October 2026, Philippine time. **AP5 passed before B3b began.** The existing synthetic primary at http://127.0.0.1:5173 uses the accepted A6.2 implementation and 64 migrations. Its two manually recorded Paid outcomes were preserved. No primary duration source or monitoring evidence was created.

## Target and recovery

Fresh verification identified `ldss_primary_test_12676_61497616`, runtime `ldss_primary_12676_61497616@localhost`, MariaDB 10.4.32 on DESKTOP-BPLJKRP/127.0.0.1:3306, frontend 5173 and API 3001. The original `ldss_scholar_monitor_dev` was not the upgrade target. Main listener ancestry was verified before stopping only its controller/API/Vite tree.

The starting inventory covered **27 existing schemas**. The primary had 1,000 scholars, 14 accounts, two Processed payrolls, 1,000 entitlements/allocations and **two Paid payment records**. PAY-001 was 2 Paid/798 Pending; PAY-002 was 200 Pending. These current contents supersede earlier all-Pending counts.

A fresh encrypted backup of all **142 tables**, **53,524,536 SQL bytes / 13,672,213 encrypted bytes**, passed isolated restoration, matching logical data, definitions, indexes, triggers, views, constraints and rejection probes. Its temporary restore schema/account were removed. Existing bounds remain 64 MiB SQL, 96 MiB archive and 100,000 rows/table. Keys/archive are in the restricted task-private directory; their contents are withheld. [Recovery proof](../../output/ap5-b3b-20261024/recovery.json), [starting inventory](../../output/ap5-b3b-20261024/database-before.json).

## Promotion and migration

All three accepted package hashes, 61 candidate source paths and compatible-build archive entries were checked. The review patch applied against the actual dirty-worktree baseline; no Git reset or blind directory replacement occurred. Starting source/build copies are retained under the task's baseline directories.

Added `scripts/primary-graduation-preflight.mjs` and a narrow branch in `graduation-monitoring-preflight.mjs`. The AP5 proof requires this exact database/runtime/host/port/ownership manifest, stopped main ports, PID, 63-entry journal, exact source/environment hashes and fresh verified recovery/inventory. Original, unrelated, unknown and partial-DDL targets remain blocked. No generic force flag exists.

The first preflight stopped **before DDL** because Git's Windows line-ending conversion changed the promoted SQL bytes. Thirty promoted paths had only line-ending differences; they were checked against the candidate and restored to its exact bytes. Final F54 SHA-256 remains `31f507ee9ca5358ec6a64bb667ba6ef4055abb8d83bd486a67b7bdd23a0d8d66`. No accepted migration checksum was changed.

Only `20261024020000_f54_graduation_monitoring.sql` applied. The result has **64 matching migration checksums / 147 tables**, five empty immutable tables, four permission rows and six approved Staff/Coordinator mappings. Existing accounts, password hashes, user roles and every old business table remained exact. Only SELECT/INSERT grants were added on those five tables for the primary runtime. [Upgrade evidence](../../output/ap5-b3b-20261024/upgrade.json), [proof used](../../output/ap5-b3b-20261024/preflight-used.json).

## Launch and activation

The synthetic profile first ran with graduation writes **off**. Registry, Masterlists, Reports, Individual Payments, both Payment Recording workspaces and Graduation Monitoring loaded through normal authenticated reads. After compatibility passed, `primary-activation.json` enabled graduation writes only for this exact synthetic profile. The five existing financial feature settings and `.env` remain unchanged.

`localhost-5173-api.ts` reads the target-bound activation record. `localhost-5173-profile.mjs` retains the original-profile option using archived schema-63 API/frontend source; the original database is not migrated. The synthetic profile uses current source. Schema-63 binaries must not run against the upgraded primary. For compatible rollback, set the task activation record's `writesEnabled` to false and restart the synthetic profile; retain 64-compatible readers and all evidence. Do not restore an old backup over later valid activity.

## Acceptance before B3b

| Check | Result |
|---|---|
| Lint / typecheck / normal build / secrets | All exit 0; existing Vite chunk warning remains |
| Unit tests | 107 files, **686 tests passed** |
| New monitoring DB suite | Exit 0; 54 setup/read calls plus guarded source/role/retry/rollback assertions in an owned disposable schema |
| Twelve shared/financial DB regressions | All exit 0: RBAC, academic, academic changes, standing, Registry parity, historical omission/multi-batch routing, recording/retry, reconciliation, individual settlement/races, reports, individual documents/recovery and omitted settlement |
| Staff / Coordinator browser | Correct two/four graduation permissions; source-preparation panel available, no save submitted |
| Pure Administrator / unassigned | No graduation permissions; monitoring context API 403 |
| Main business preservation | All old business tables and original audit rows exact; only four ordinary synthetic-role login events added at AP5 acceptance |
| Current payment summaries | PAY-001 **2 Paid / 798 Pending**; PAY-002 **200 Pending**; both `canRecord:true`; two payment records / 1,000 unique entitlements and allocations |

Evidence: [quality commands](../../output/ap5-b3b-20261024/ap5/results.json), [financial regressions](../../output/ap5-b3b-20261024/regressions-apfive/results.json), [browser navigation](../../output/ap5-b3b-20261024/ap5-navigation.log), [Staff](../../output/ap5-b3b-20261024/role-staff.log), [Coordinator](../../output/ap5-b3b-20261024/role-coordinator.log), [Administrator](../../output/ap5-b3b-20261024/role-system_admin.log), [unassigned](../../output/ap5-b3b-20261024/role-unassigned.log), [preservation](../../output/ap5-b3b-20261024/preservation-ap5-accepted.json), [payment readiness](../../output/ap5-b3b-20261024/readiness-ap5-accepted.json), [sequential acceptance gate](../../output/ap5-b3b-20261024/ap5-acceptance.json).

Mutation-heavy checks used owned disposable schemas. Browser primary source/assessment drafts were not saved. No fictional official reference, automatic graduation, financial/source pin refresh, payment outcome, actual-date correction or Masterlist change was made.

## Limits

The primary's live duration/Expected/Delayed evidence remains unknown/empty until actual authorized sources are recorded. A6.2's measured extra read cost and native-zoom qualification remain documented in its [isolated implementation report](A6_2_GRADUATION_IMPLEMENTATION_REPORT.md); this upgrade claims no performance speedup, office acceptance, WCAG certification or LAN/production release. The following B3b report records its own UI acceptance separately.

## Final cross-task preservation

After B3b, all **26 other inventoried local schemas** remained exact, including original/reference/older UAT data and grants. The upgraded primary's old business data and definitions remain exact; only F54's five tables, four permission/six mapping rows, migration journal entry and ten SELECT/INSERT table privileges were added. Its five evidence tables remain empty. All original audit rows match; four ordinary synthetic-role login events and associated authentication session/rate-limit activity are the qualified differences. No original user's password or role was changed.

All **372 foreign-key groups have zero orphans**; no duplicate semester entitlement exists. Runtime SELECT works and UPDATE/DELETE/cross-schema access is denied. [Final all-schema preservation](../../output/ap5-b3b-20261024/preservation-final.json), [primary audit/business comparison](../../output/ap5-b3b-20261024/preservation-completed.json), [integrity](../../output/ap5-b3b-20261024/integrity.json).

The upgraded **147-table** database also passed a second fresh encrypted backup and isolated restore: **53,554,799 SQL bytes / 13,680,308 encrypted bytes**, unchanged limits, temporary restore removed. This preserves the two actual Paid records in a 64-compatible recovery checkpoint. It is not permission to overwrite later valid activity. [Post-F54 recovery](../../output/ap5-b3b-20261024/post-f54-recovery.json).

Final controller/API/Vite PIDs are **19332 / 35720 / 40460**, loopback only. Existing 3011/3012/3015 listeners retained their original PIDs. Start the same primary with `node scripts/localhost-5173-profile.mjs synthetic`; its target-bound graduation activation record is `output/ap5-b3b-20261024/primary-activation.json`. The final package checks and B3b evidence are in the [separate B3b report](../uiux/B3b_PAYMENT_RECORDING_SIMPLIFICATION_REPORT.md). Both authorized tasks are complete; no further batch is started.
