# Workflow changes - Phase 01 baseline

Date: 2026-10-05  
Status: Technically complete; final results recorded 2026-10-06 (client date). Human production acceptance remains pending.  
Tracker: [Implementation plan](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md)

## Preserved starting point

- Git baseline: `d009cf6` (`feat: deliver LDSS through F36`).
- Snapshot folder: `output/baselines/workflow-phase01-20261005T062218Z/`.
- `source.zip` preserves 344 tracked and explicitly included planning/reference files. ZIP integrity and every archived source SHA-256 were verified.
- `manifest.json` records full commit, initial Git status, file hashes, and archive hash.
- `prior-uat/` preserves the earlier acceptance reports and logs before running the gate again.
- Source hashes remained unchanged through testing, before these tracker/report documentation updates.
- The source archive excludes ignored secrets, activation links, dependencies, database contents, and build artifacts. It is not a complete machine-recovery package; the existing private configuration and backup key still require separate secure custody.

## Validation results

| Check | Result |
| --- | --- |
| `npm run check` | Passed |
| Lint | Passed |
| Unit tests | 178 passed across 36 files |
| Client/server/validation TypeScript | Passed |
| Client/server build | Passed; nonblocking large client-chunk warning |
| Secret scan | Passed; 441 source/build files scanned |
| `npm run test:db` | Passed connection, recorded migration checksums, protected writes, and restricted grants |
| Source migration set | 29 existing migrations; no new migration |
| `npm run test:uat` | Final run passed all 35 suites after the repairs described below |
| Full database workflow regression | Passed in disposable databases as part of the final gate |

Standalone checks were initially run after recovery preflight failed. The subsequent complete gate now supplies recovery/integration evidence for the corrected candidate, but does not establish human acceptance.

Machine-readable results and build hashes: `output/baselines/workflow-phase01-20261005T062218Z/phase01-results.json`.

## Initial backup and recovery blocker (resolved)

Encrypted application archive: `output/backups/ldss-1791181344582-a14ab4c1.ldssbackup` (76 tables, 152100 bytes).

Backup creation initially succeeded, but the UAT restore and a direct retry both failed at creation of the disposable restore user with `ER_KEY_NOT_FOUND` / error 1032. A read-only `CHECK TABLE` reported a page bitmap inconsistency and `Corrupt` for `mysql.global_priv`. Checks of `mysql.db`, `mysql.tables_priv`, and `mysql.columns_priv` reported OK. Recovery was subsequently verified after the repair described below.

This table belongs to XAMPP's shared MariaDB account system, not the scholarship schema. An application backup does not back up MariaDB system accounts/grants. Existing application connections and grant checks can succeed while creation of isolated testing accounts fails.

The failed restore targets are generated disposable names; the restore code cleans up its created database in its failure path. No live restore or cutover was attempted. The initial baseline attempt performed no system-table repair; the subsequent separately authorized repair is recorded below.

Failed gate evidence is preserved as `phase01-uat-failed.json` inside the baseline folder; the gate also wrote its normal current and timestamped reports under `output/uat/`.

## Authorized recovery performed

The user authorized proceeding with shared account-table recovery. An encrypted recovery copy preserved the affected physical table files and the six readable grant tables before repair. Encryption/decryption round-trip verification passed; credentials and authentication hashes were not printed or written as plaintext recovery files.

Online repair initially returned OK but failed a subsequent account-creation probe. Extended checks also identified corruption in `mysql.proxies_priv`. The server stopped listening after graceful shutdown was requested but did not exit after waiting. The exact non-listening XAMPP process was verified by executable path and terminated before offline file access.

With MariaDB stopped, a second encrypted recovery archive preserved 81 system-table/Aria files. Offline `aria_chk --recover` repaired only `global_priv` and `proxies_priv`. After restart, a server `REPAIR` normalized their table metadata. No system database was replaced and no unrelated accounts were deleted. See MariaDB's [REPAIR TABLE documentation](https://mariadb.com/docs/server/reference/sql-statements/table-statements/repair-table) and [offline Aria repair guidance](https://github.com/mariadb-corporation/mariadb-docs/blob/main/server/clients-and-utilities/aria-clients-and-utilities/aria_chk.md).

Validation after the completed repair:

- Extended integrity checks passed for all seven account/grant tables examined.
- The six readable grant tables exactly matched their pre-repair logical hashes.
- Five successive disposable account creation/deletion probes succeeded, followed by passing integrity checks.
- All 76 application tables and schema inventory sections matched the initial encrypted application backup: no changed data tables or schema sections.
- The original application backup restored successfully in 1.551 seconds. Evidence: `output/backups/restore-1791196345995_8e48f060.json`. The disposable recovery database was removed.

**Limit:** `global_priv` was unreadable before repair, so exact before/after authentication-row equality cannot be proved. Repair reported row counts changing from 7 to 8 to 9 across failed online account creation and offline recovery; failed probes may have left recovered account rows. No unknown account was deleted to force a count match. The physical recovery copies preserve the earlier evidence. Grant-table equality and application checks do not claim that every unrelated application's login was exercised.

Evidence in `output/baselines/workflow-phase01-20261005T062218Z/`:

- `mysql-account-recovery.enc.json` and `mysql-account-recovery-manifest.json`
- `mysql-offline-recovery.enc.json` (encrypted system files; uses the existing private backup key)
- `mysql-repair-report.json`
- `post-repair-application-comparison.json`
- Original source archive, earlier test evidence, and failed initial gate report

These system-recovery archives have their own AES-GCM JSON envelope and are not application `.ldssbackup` files. Do not pass them to the application restore command. The private key remains outside the repository.

Full UAT was restarted after repair. Its final results must be recorded before closing the technical baseline gate. Production and human acceptance remain separate.

## Baseline defect found by the recovered gate

The first post-repair UAT run passed application checks, database checks, receiving, authentication, RBAC, configuration, and academic suites, then failed the status concurrency scenario. When a terminal status request won a race, the losing stale approval returned `INVALID_STATE_TRANSITION` rather than the required `VERSION_CONFLICT`. Data remained protected, but the error depended on which competing request won.

`server/status/service.ts` now checks the expected version of an activated record before validating its transition against the newly changed status. Unactivated records retain their existing activation-required error, locked periods remain blocked, and fresh invalid terminal reversals still fail normally. No scholarship policy or permissions changed.

`scripts/test-status-db.ts` adds a deterministic terminal-winner scenario, covering stale approval, stale submission, unchanged history, invalid fresh reversal, and valid linked correction. All 10 status database scenarios passed in isolation. Original random-concurrency coverage remains.

The failed gate and log were preserved as `phase01-status-race-failed.json` and `phase01-status-race-failed.log` in the baseline folder. The original source remains in `source.zip`. A new complete gate was started after the fix; this section does not claim its result in advance.

The following run passed the status suite but exposed an outdated qualification assertion: it expected an empty routine reference to fail, although the already-existing simplification supplies internal evidence for that action. `scripts/test-qualification-db.ts` now tests rejection of an explicitly invalid `null` reference and adds positive API coverage for blank routine evidence, attributed decision history, idempotent replay without duplicate events, and mandatory reasons for Not Selected. All 11 qualification scenarios passed in isolation. No qualification policy/service was changed. The failed gate is retained as `phase01-old-qualification-expectation.json`; full UAT was restarted with the corrected coverage.

## Final technical gate

- All **35 suites passed**, including 178 unit tests, builds, database workflows, concurrency, permissions, audit, reports, exports, and recovery.
- All **390 recorded source/build hashes** matched after completion. The 29 migration files remain unchanged.
- Final backup: `output/backups/ldss-1791196671858-ab3346a5.ldssbackup`.
- Verified 76-table restore: `output/backups/restore-1791196671871_50ec2061.json`, 1.418 seconds, disposable target removed.
- Post-suite extended checks on both repaired account tables returned OK.
- API health, readiness, and the existing frontend returned HTTP 200 after recovery.
- Evidence is preserved under the baseline folder as `validated-uat/` and `phase01-final-verification.json`, so later runs cannot replace it.

The original source archive and failed checks are retained separately from this corrected candidate. Machine-generated timestamps reflect the execution host; this final documentation entry uses the client date, 2026-10-06. Phase 02 can proceed from this technical baseline. Coordinator/technical-owner production acceptance is not inferred.
