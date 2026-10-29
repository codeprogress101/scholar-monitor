# BACKUP-1 — Recovery capacity remediation

26 October 2026, Philippine time. **Completed and verified. The current primary synthetic database now passes encrypted backup and complete isolated restoration using bounded, backward-compatible tooling. ML-1 and LAN-R2A remain stopped.**

Primary application source remains the accepted U1.1 baseline at [localhost:5173](http://127.0.0.1:5173/). Only one existing backup-tooling file and one new test file were installed after isolated staging and verification. No application restart, migration, business-rule change or primary business command occurred.

## Failure and measured growth

The [ML-1 blocker](../../output/ml-1-primary-20261026/recovery-blocker.json) was the stdout capacity branch in the original backup library, not a credential failure or a failed restore. The original **64 MiB / 67,108,864-byte raw SQL ceiling** rejected the current dump, measured as **85,558,844 bytes / 81.6 MiB**. The diagnostic streamed the complete dump through counters, hashing and compression without saving plaintext SQL. Its independent diagnostic ceiling was 256 MiB; that was not installed as a backup limit.

| Measurement | Earlier valid U1.1 archive | Current verified checkpoint |
|---|---:|---:|
| Raw SQL | **53,587,230 bytes** | **85,558,844 bytes** |
| Encrypted archive | **13,692,144 bytes** | **19,332,340 bytes** |
| Scholars / prior-batch members | **1,000 / 1,000** | **1,835 / 1,835** |
| Audit rows | **10,441** | **18,517** |
| Tables / applied migrations | **149 / 66** | **149 / 66** |

Raw SQL grew **31,971,614 bytes**. The largest contributors are retained evidence, not simply the scholar count:

| Table | Current rows | Current INSERT SQL bytes | Growth since U1.1, bytes |
|---|---:|---:|---:|
| `audit_logs` | 18,517 | 22,629,389 | 10,887,073 |
| `prior_batch_members` | 1,835 | 13,641,825 | 7,199,965 |
| `masterlist_workflow_events` | 15 | 5,382,595 | 2,282,767 |
| `requirement_workflow_events` | 7,340 | 4,807,550 | 2,243,397 |
| `semester_entitlement_events` | 1,000 | 4,543,753 | No new cohort entitlement assumed |
| `ovr_entries` | 1,000 | 4,208,673 | Existing frozen payroll evidence retained |

These are measured INSERT-statement bytes; schema statements and other tables also contribute to the complete dump. Audit history is the largest table by row count, at **18,517**, well below the unchanged row ceiling. [Complete measurements, row counts and physical table estimates](../../output/backup-1-20261026/measurement.json), [old/current growth comparison](../../output/backup-1-20261026/growth.json).

The actual confirmed 835-person import, prior-batch/document evidence, qualification events and the subsequent Masterlist preparation/review history explain the observed growth. ML-1 already established their source relationships through read-only inspection. This task preserved those records rather than pruning snapshots or removing scholars to make the old cap pass. This is a technical provenance finding, not independent certification of the underlying office approvals. No missing history was invented.

## Implemented bounds and exact file changes

| Independent limit | Before | Installed | Reason |
|---|---:|---:|---|
| Raw SQL | 64 MiB | **128 MiB / 134,217,728 bytes** | Current 81.6 MiB dump plus **56.9% byte headroom**, with a finite rejection boundary |
| Decoded JSON envelope | 192 MiB, previously expressed as `MAX_SQL * 3` | **192 MiB / 201,326,592 bytes** | Explicit constant prevents doubling this memory boundary implicitly |
| Encrypted archive | 96 MiB | **96 MiB / 100,663,296 bytes** | Current encrypted archive is only 18.4 MiB; no increase needed |
| Rows per table | 100,000 | **100,000** | No evidence justifies raising this separate guard |
| Database-tool timeout | 120 seconds | **120 seconds** | Actual backup/restore observations are well below it |

128 MiB is a measured capacity allowance, not a promise of a particular future scholar count. Source snapshots, audit volume and compression vary. Any one of the SQL, decoded-envelope, archive, row or time limits can reject an operation independently. There is no force/skip option or environment override to remove these limits.

| Installed file | Change |
|---|---|
| [scripts/backup-lib.mjs](../../scripts/backup-lib.mjs) | Raise only SQL capacity; name and expose immutable independent bounds; enforce SQL/envelope/archive bounds before accepting a new archive; check archive-directory free space before opening the source; avoid repeated tool-failure handling |
| [tests/backup-capacity.test.ts](../../tests/backup-capacity.test.ts) — new | Seven tests covering independent limits, archive-size rejection, storage preflight, interrupted tool output, failed archive-write cleanup and stream boundaries |

The free-space check requires room for one complete **96 MiB bounded archive** in its destination before source locks are taken. Quota or concurrent disk consumption can still cause a write failure; the existing `.partial` cleanup and final rename remain. The filesystem free-space check does not certify available database restore space or protect against other processes filling the disk later.

No archive format, encryption algorithm, expected-source binding, restore target naming/ownership, permission requirement, grant policy or application schema changed. AES-256-GCM with fresh nonce and authenticated `LDSSB001` version 1 remains; SQL SHA-256, inventory completeness and bounded authenticated decompression remain. No plaintext SQL file was introduced.

Temporary staging was `C:/xampp/htdocs/ldss_backup1_stage_20261026`, copied from the actual dirty primary workspace. **1,324 of 1,325 starting protected inputs remain exact**; only the declared existing backup module differs. The new test and this report are additions. All **310 starting distribution files** remain exact. [Source hashes](../../output/backup-1-20261026/source-files.json), [installed hashes](../../output/backup-1-20261026/installed-files.json), [review patch](../../output/backup-1-20261026/BACKUP_1.patch), [two-file tooling source ZIP](../../output/backup-1-20261026/source-package.zip). Patch checking against the actual dirty workspace and an independent byte-exact apply round trip passed. The ZIP contains no credentials, keys, database archive, configuration or private records.

## Fresh backup and complete isolated restoration

The source was freshly reverified as **DESKTOP-BPLJKRP**, MariaDB **127.0.0.1:3306**, database **`ldss_primary_test_12676_61497616`**, restricted runtime **`ldss_primary_12676_61497616@localhost`**, synthetic profile, loopback **5173/3001**, with all **66 accepted SQL checksums**. Controller/API/Vite remain **47348 / 52532 / 42356**, with unchanged commands, ancestry and listener ownership.

The staged tool captured a new consistent checkpoint using the existing **source-schema READ locks** around inventory and dump. These briefly serialize source writes; primary services remained running. No server-wide global read lock was used, and no operational LAN database was backed up, queried or restored by this task.

| Fresh checkpoint fact | Result |
|---|---|
| Created, Philippine time | **26 October 2026, 04:10:42** |
| Raw SQL / authenticated JSON payload | **85,558,844 / 96,327,561 bytes** |
| Encrypted archive | **19,332,340 bytes** |
| SHA-256 | `f8394036bd3d3533c45b2809ae16c94e7acf5f4256c2640cf2fdbddc4bae1007` |
| Complete isolated restore | **149 tables**, all values/counts/checksums matched the captured inventory |
| Schema comparison | **1,232 columns, 788 index parts, 868 constraints, 871 foreign-key parts, 31 triggers, 3 executable views** |
| Rejection probes | Unique, foreign-key and check violations rejected; probe transaction rolled back |
| Recovery target/account | Newly owned isolated names; removed after verification |

The per-table value comparison covers the complete migration journal, application accounts/password hashes/roles, scholar identities and annual registrations, academic/standing/source histories, imports and confirmations, Masterlist drafts/publications/activations, entitlements/allocations, frozen payroll sources, every payment/date and audit history. No table or current row was excluded. The two Paid records retain actual dates **2026-10-24**.

Application accounts are backed up as application data. MariaDB system accounts/grants are not copied into another environment; the existing restore design creates only a disposable technical account with rights on its newly owned schema. Source-runtime grants were separately compared before/after and remain exact.

The source session checksum changed between the sizing measurement and the later backup, so their SQL hashes differ despite identical byte counts. The archive has its own authenticated SQL hash and internally consistent inventory; its isolated restore matched that inventory. No hash equality across two different live snapshots is claimed. [Authenticated archive metadata](../../output/backup-1-20261026/archive-metadata.json), [full restore evidence](../../output/backup-1-20261026/current-restore.json).

Archive and detailed capture metadata remain beneath the restricted `output/backup-1-20261026/private/` tree. The existing key was used without rotation; neither key nor archive contents are included in the review package.

## Compatibility, failure and interruption acceptance

The revised reader fully restored the **existing U1.1 encrypted archive**, hash `432603c9708ce8e8329708a25266df330f8e54236a7ba0a7db62a86b47b8bcea`, using that archive's original protected key. All 149-table and schema checks passed, and its disposable target/account were removed. Old archives do not require conversion. An initial helper attempt used the current default key for this older separately keyed archive and was correctly rejected before restore; using its actual original key passed. No key was changed. [Legacy restore proof](../../output/backup-1-20261026/legacy-restore.json).

Backward compatibility means **new readers accept existing valid archives**. An unchanged old 64 MiB reader still rejects today's larger SQL payload. All future operator/backup-watch/recovery copies must therefore carry the matching revised module before being expected to recover new larger checkpoints.

| Deliberate failure | Verified behavior |
|---|---|
| SQL exactly 128 MiB / plus one byte | Exact boundary round-trips; excess rejected |
| SQL under its cap but escaped envelope above 192 MiB | Rejected before sealing; separately authenticated oversize gzip rejected during bounded decompression |
| Poorly compressible SQL producing an archive above 96 MiB | Rejected by unchanged encrypted-archive cap |
| 100,001 rows in an owned synthetic fixture table | Existing row cap rejects the inventory |
| Corruption, truncation, wrong key | Rejected before target creation |
| Wrong expected source database | Rejected before database access |
| Validly sealed source-access probe | Disposable restore account denied access to primary; failed target/account cleaned up |
| Interrupted dump / over-cap 129 MiB dump | No accepted archive or `.partial` file; independent write-lock acquisition on the owned fixture proves source locks released |
| Forced backup-worker termination | Database disconnect releases its read locks; no archive published |
| Insufficient free storage | Mocked filesystem-space test rejects before any database connection or source lock |
| Disk-full write after creating `.partial` | Fault-injection test removes the file, never renames to an accepted archive, and closes/unlocks the source path |

Capacity and interruption mutations used newly owned synthetic fixture schemas, not primary or retained databases. The source-access probe only attempted a SELECT; it did not attempt a primary write. No physical production disk was filled and no power-loss test was performed. The existing atomic rename prevents a partial write from being accepted as a final archive; sudden OS/power loss during filesystem persistence is not certified by these tests. [Database/failure evidence](../../output/backup-1-20261026/failures-database.json), [SQL boundaries](../../output/backup-1-20261026/failures-sql-boundary.json), [envelope boundaries](../../output/backup-1-20261026/failures-payload-boundary.json), [archive boundary](../../output/backup-1-20261026/failures-archive-boundary.json).

## Time, memory and storage

| Observation | Result |
|---|---:|
| Complete sizing pass / dump portion | **11.56 / 2.89 seconds** |
| Fresh encrypted backup | **11.62 seconds**, peak process RSS **929,644,544 bytes / 887 MiB** |
| Complete current isolated restore and cleanup | **11.86 seconds**, peak process RSS **813,940,736 bytes / 776 MiB** |
| Older archive restore and cleanup | **8.18 seconds** |
| Measured isolated restored-schema files | **384,521,585 bytes** |
| Observed free-disk reduction with that target present | **385,507,328 bytes** |
| Source InnoDB data/index estimates | **126,058,496 / 49,987,584 bytes** |
| Disk free at initial capture / final preservation | **16,271,560,704 / 15,752,704,000 bytes** |

Physical restored files include allocation overhead and differ from logical table estimates. Database engine/shared-file growth and other host activity can persist after a disposable schema is dropped; deletion does not promise restoration of an earlier exact free-space value. All task-owned recovery targets/accounts were removed. [Storage drill](../../output/backup-1-20261026/storage.json).

The host has about **15.9 GiB physical RAM**. Free physical memory before the measured backup was about **1.46 GiB**; the observed backup completed within it. Boundary/failure workers ran separately; the largest observed process peak among them was about **1.05 GiB**, not a certified worst-case memory bound. The library still buffers SQL/JSON and uses synchronous compression; it is intended for a single trusted operator process, not concurrent unattended large jobs. No streaming format or new heap setting was introduced.

For today's recovery, allow at least the measured roughly **386 MB temporary database footprint plus the retained archive**, with additional engine/log/workspace headroom. **1 GiB free working disk is a planning allowance for this dataset, not a general maximum or a new restore guarantee.** Re-measure the exact intended target before operational scheduling or witness recovery. The unchanged 96 MiB archive limit means no larger archive-storage contract was activated; retention count and off-host copies still multiply storage needs. Reassess memory and storage before approaching any ceiling. This local drill does not establish office RPO/RTO, concurrency capacity or off-host recoverability.

## Tests, installation and primary preservation

| Final validation | Result |
|---|---|
| `npm run lint` | Exit **0** |
| `npm run typecheck` | Exit **0** |
| `npm test -- --maxWorkers=1` | **125 files / 798 tests passed**; one worker used to limit concurrent test memory |
| `npm run check:secrets` | Exit **0** |
| Backup, Drive-backup and new capacity tests after installation | **3 files / 22 tests passed** |
| Current/legacy full restores, capacity, corruption, source-boundary and interruption drills | Passed |
| Patch check / exact round trip / installed-staged hashes | Passed |

All normal checks ran on final matching staged source before installation. No application build was needed or substituted: client/server source and retained compiled outputs were unchanged. [Exact commands/exits](../../output/backup-1-20261026/checks-main.json), [unit log](../../output/backup-1-20261026/unit-final.log).

Final comparison proves all business table values/counts, schema objects, 66 journal entries, application accounts/roles, runtime grants and original audit rows exact. Current facts remain **1,835 scholars**, **14 accounts**, **1,835 annual intakes/academic/annual scholarship records**, **3 Masterlists / 1,400 entries / 1,000 activations**, and **2 Paid records** with their complete original evidence and dates **2026-10-24**. The current approved 400-member Masterlist remains untouched; no duplicate conflict was repaired or bypassed.

All **18,517 starting audit rows** remain exact, with **zero appended audit events**. Only existing `auth_sessions` values changed, retaining **53 rows**, from concurrent session activity. This task performed **zero application logins and zero business commands**; it does not claim zero database activity. Temporary restore schemas and technical accounts were created only for the authorized drills and removed.

Primary and retained/LAN listener owners are unchanged. The **76 inventoried paused LAN-R2A artifacts** and **16 ML-1 evidence files** remain byte-identical; their work was not resumed or edited. These checkpoints are not a fresh full inventory of every operational file/database. [Final preservation and process evidence](../../output/backup-1-20261026/final-preservation.json).

## ML-1 and LAN disposition; stop

**The ML-1 recovery-capacity blocker is resolved.** A fresh current-data encrypted archive has passed complete isolated restoration. ML-1 can proceed within its authorized boundaries after rechecking then-current state; it has **not** resumed here. Its separately identified atomic whole-scope bulk-write contract still needs the decision described in the ML-1 report. BACKUP-1 grants no new Masterlist, financial or account authority.

The paused LAN release preparation can reuse this revised tooling after a separate controlled inclusion/review: carry the matching module and tests into its complete operator/release package, verify its actual database size and available resources, and repeat target-specific backup/off-host/witnessed recovery acceptance. No migration, dependency, business permission or archive conversion is needed for this tooling change. Do not assume an old deployed reader supports the larger payload merely because the envelope remains version 1. Existing LAN-R1/R2 documents retain their historical 64 MiB findings; this report records the new tooling boundary without editing paused LAN artifacts. No operational LAN service/configuration/package was changed.

Saved original tooling is under `output/backup-1-20261026/baseline/`. Returning to the old 64 MiB reader would restore the current capacity failure; it is not a recovery solution for today's larger checkpoint. Preserve the compatible reader, original keys, archive hash and source inventory together. No stale database restoration or history deletion is appropriate.

**Stopped after BACKUP-1 implementation, verification and reporting.** No ML-1 implementation, Masterlist mutation, LAN-R2A resumption or deployment occurred.
