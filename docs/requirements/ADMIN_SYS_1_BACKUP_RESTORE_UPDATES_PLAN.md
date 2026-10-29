# ADMIN-SYS-1 — Backup, Restore & Updates plan

28 October 2026, Philippine time. **Specification only.** No backup/restore/update web writer, upload handler, migration, policy or destructive recovery is authorized or implemented by this document. ADMIN-UX-1 continues on 5181 only; primary 5173 and operational LAN are protected. LAN-R2A remains paused.

## Navigation and action-first screen

Reserve the fourth position in **Setup & administration**, after **Accounts → Document Signatories → Program Settings**, for **Backup, Restore & Updates**. Until working guarded capabilities exist, show no empty destination, placeholder page or fake controls. Keep business navigation separate.

Proposed working screen: exact environment/release/database identity at top; **Create encrypted backup** as the primary action; a compact verified-backup inventory directly below. Secondary actions are **Inspect backup** and **Inspect update package**. Selecting an inventory item opens metadata, verification evidence and the supported operator action. Restoration and update activation appear only after their prerequisites are verified and explicitly authorized. No decorative totals or lengthy instructions.

## Existing foundations and finite limits

The installed dedicated UAT release contains `scripts/backup-lib.mjs`, accepted BACKUP-1 capacity guards and the later reviewed binary SQL transport. These current bytes, rather than old README inventories, are the implementation baseline. See [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md), [ADMIN-ACCT-2](ADMIN_ACCT_2_SECURE_ACCOUNT_MANAGEMENT_REPORT.md), [AUTH-REL-3.1](../security/AUTH_REL_3_1_PRIMARY_ACTIVATION_RETRY_REPORT.md) and the accepted IP-UAT-1 controller/release procedures.

| Existing capability | Exact limit / behavior |
|---|---|
| Raw SQL | **128 MiB / 134,217,728 bytes** |
| Decoded JSON envelope | **192 MiB / 201,326,592 bytes** |
| Encrypted archive | **96 MiB / 100,663,296 bytes** |
| Per-table inventory | **100,000 rows**, reject excess rather than truncate |
| Database child-tool runtime | **120 seconds** |
| Source metadata-lock wait | Session **10 seconds**; failure yields no accepted backup |
| Destination preflight | Current code reserves at least **max(SQL limit, archive limit) = 128 MiB** available space; quota/concurrent consumption can still fail |
| Format | **LDSSB001**, envelope v1; gzip followed by **AES-256-GCM**, random 12-byte nonce, authenticated format header, 16-byte tag |
| Key | Existing **32-byte** local key, created exclusively and kept outside archives; no silent key rotation |
| Binding | Expected source database, SQL SHA-256 and complete inventory validated after ciphertext authentication and bounded decompression |
| Consistency | Context-based capture holds source-schema READ locks across inventory and dump, then releases them; it does not require a server-wide lock |
| Inventory / recovery | Full table counts and canonical values/checksums, journal, columns, indexes, foreign keys/checks, triggers, view definitions/execution and rejection probes |
| Unsupported objects | Stored routines/events reject pending reviewed format support |
| SQL transport | `binary-result-file/v1` requires the explicitly reviewed **MariaDB 11.4.13 native client**, binary mode and local-infile disabled; this is a client prerequisite, not permission to upgrade the database server |
| Restore target | A newly owned `ldss_restore_*` database and scoped disposable definer account; only dump metadata definers are rebound, not inserted business values |
| Cleanup | Default restore removes its own target/account; retention requires an explicit reviewed option. Partial archive files are cleaned up; final archive installation uses rename |

Each independent size, row, time or format boundary can fail. There is no force/skip override. Current complete isolated recovery is proven for the current accepted schema, not every future database, migration or capacity. Do not raise limits through a UI preference.

The CLI/library does **not** already provide an authenticated browser inventory, download authorization, retention policy, durable web job ledger, production restore command, trusted update-signing system or unattended release manager. Its local context accepts trusted operator credentials and executable paths. A browser must never supply those values or invoke it as an arbitrary command runner.

## Distinct operations

| Operation | Scope and preservation boundary |
|---|---|
| Database backup | Encrypted database state plus its schema/inventory/journal; not executable application or secret-key custody |
| Full recovery set | Matching application/runtime/dependencies/templates/fonts, release manifests, private environment references, approved grants/account capabilities, key custody and recovery instructions, in separately protected components |
| Database restoration | Reconstruct verified database state in an owned target; later activation is a separate destructive recovery decision |
| Application update patch | Reviewed matching API/UI/runtime artifact with manifest, exact baseline requirements and allowed files; does not imply data/schema updates |
| Database migration | Separately reviewed ordered schema transition with accepted checksums and rehearsal; not an incidental update step |
| Application-only fallback | Restore a compatible application pointer/files without restoring data, downgrading schema or deleting history |

A database archive cannot recover a missing encryption key, private reset-handoff artifact, runtime, TLS configuration or named-account grants by itself. The 5181 account capability is bound to an exact database; replacement requires reviewed reprovisioning/rebinding and private-profile verification. Do not reactivate historical sessions or reset credentials implicitly during recovery.

## Permission and operator boundaries

Administrator-only UI access is required, but current System Administrator or `configuration.manage` authority is **not** authorization for destructive restoration, production maintenance, arbitrary SQL, migrations or release activation. Define separately reviewed capabilities for backup creation, inventory, verification, restricted export, recovery request and update request. Do not add permissions under ADMIN-UX-1.

Use an authenticated, session-bound request with CSRF, reason/reference, exact environment/release/database/schema versions and bounded inputs. A narrowly scoped local worker owns backup/tool access; no root/password/key reaches browser state, responses, command arguments, screenshots or logs. Capture workers need only reviewed source-schema authority; restore rehearsal workers receive authority only over newly owned targets. Never extend the account-administration SQL identity into recovery or financial tables.

Destructive recovery and controlled updates require a named authorized operator, documented maintenance/release approval and policy-required independent review. The approving role/person and whether dual authorization is mandatory remain office/security decisions. Application permission and successful software execution are not financial-policy authority.

## Backup inventory, retention and export

Inventory records should show an opaque backup ID, environment, source database label, created time with explicit timezone, schema/journal identity, release compatibility, encrypted/SQL sizes, archive hash, verification date/result, isolated-recovery evidence, retention/hold state and creator/approval reference. Never show filesystem paths, credentials, raw SQL or key material. Paginate server-side and distinguish unavailable, unverified, failed and verified states.

Retention duration/count, storage quota, legal/financial holds and off-host custody require documented decisions. Until approved, do not automatically delete or rotate accepted backups. Protect at least the then-current pre-change and verified compatible recovery points; a retention worker must prove ownership and exact allowed paths before any deletion and audit the decision. Metadata alone does not establish archive health; reverify authenticated bytes when used.

Secure export requires a fresh scoped authorization tied to one immutable archive ID/hash, an expiring one-use download authorization, private response headers and an audit. Keys/configuration remain separate. Do not serve a backup directory statically or accept a caller-supplied path. Download expiry, concurrent export limits and office-approved destinations need review. Avoid large raw archive bodies in ordinary JSON/API logs.

## Manual creation and isolated verification

After a deliberate Create action, preflight exact ownership, schema objects, storage, executable hashes and worker availability. Establish bounded source capture using the existing lock/format/size guards. A pending operation must have an observable durable job identity; success means encrypted artifact written, authenticated, inventoried and audited, not merely a button click.

Uploads enter a private non-executable quarantine with finite request/decoded/storage limits. Never execute uploaded code or arbitrary ZIP contents. Authenticate/decompress/validate the archive within existing bounds, bind the expected environment/database and compare trusted origin metadata. Valid encryption proves possession of the key, not independent office approval or safe release authority. Reject unknown format, corrupt tag, wrong source or unsupported schema.

Complete rehearsal restores only into a new owned database with isolated credentials and no source/LAN access. Repeat the existing whole-inventory, migration-journal, constraint and view probes. Record and retain the result; clean up only verified task-owned targets/accounts. Uploaded SQL never runs against the current target merely because decryption or a checksum succeeded.

## Destructive restoration and financial preservation

Use a side-by-side verified target and separately authorized activation strategy. Before any real recovery decision, show **current versus backup capture time**, schema/release identities and the financial/audit delta. Identify all later payrolls, payments, dates, corrections, approvals, documents, account changes and command results. **Never overwrite later legitimate data with a stale snapshot.** If continuity/reconciliation cannot be proven, stop for a reviewed recovery plan.

Require command quiescence, maintenance authority, a fresh current-state encrypted backup and complete isolated recovery evidence, compatible application/runtime and explicit confirmation naming the exact environment and target. Preserve immutable source and audit evidence. DDL/import work is not one atomic transaction; do not promise whole-database rollback from a database transaction.

Retain the original database and current recovery evidence during activation. A return to the old database is forbidden once later legitimate writes exist unless a separately reviewed reconciliation preserves them. Never silently downgrade migration rows/checksums, erase history, reverse payments, reuse old reset tokens or backdate financial evidence. Secure session/key handling after a genuine disaster requires its own reviewed recovery procedure.

## Update-package verification and staging

First inspect a manifest without executing package code: package ID/version, target environment, required source release hashes, allowed file inventory, file sizes/hashes, API/UI compatibility, dependency/runtime provenance, template/assets completeness, schema range, migrations and fallback requirements. Verify a trusted signer and signed integrity policy. An unsigned hash supplied alongside an upload is not a trusted signature; signer enrollment/key custody/revocation are unimplemented and require authorization.

Reject absolute/traversal paths, drive/UNC escapes, symlinks/reparse points, collisions, unexpected files, embedded credentials/private configuration, oversized expansion and archive bombs. Define finite package file/count/expanded-byte limits from measured accepted releases before implementation. Never allow arbitrary npm/install scripts, shell commands or executable paths from uploaded metadata. Untrusted inspection is data-only; any later execution in isolated staging requires explicit trusted-package approval.

Show file changes grouped by presentation, backend, dependencies/runtime, templates, private configuration references and schema. No private settings are silently overwritten. Rehearse the complete matching package against a newly owned compatible database, with mandatory security, authorization, source/financial integrity and focused regression gates. A UI-only package must not acquire an implicit migration. Schema incompatibility or a failed migration rehearsal blocks activation.

## Reversible application activation and recovery states

Use reviewed dedicated-runtime integrity checks, not `npm run dev`. Verify the exact process/port owners, matching API/UI/dependencies, current environment and command quiescence. Prepare an application-only fallback compatible with the current schema and preserve later source edits. Stop only the authorized controller tree, atomically select/install the reviewed package and manifest, then verify loaded modules and readiness before reopening commands. Do not restart primary, retained or LAN services under UAT authority.

Progress may show **actual worker-reported states** such as queued, preflight running, capture complete, isolated restore verified, awaiting approval, activation running or readiness failed. These names become UI states only when backed by persisted worker evidence. Existing BACKUP-1 has no percentage contract: show indeterminate progress, no percentages or fictitious completion stages. Reads/inventory use inline skeleton/Retry.

Durable job/command recovery must bind actor, exact request/hash, environment, baseline versions and resulting artifact. Lost responses require query-by-original-ID or a proven exact retry, never a fresh destructive command. A failed file write, full disk, worker exit, timeout, authorization expiry, lock conflict, mismatched baseline or readiness failure must retain explicit recovery state. Do not retry restore/import/activation automatically. A retry after expiry still requires current authority while preserving the original command result.

## Smallest safe implementation stages

1. **Read-only local inventory:** separately authorize private inventory indexing and inspection; verify identity and metadata without serving archives or keys. Agree retention/export authority and finite limits.
2. **Controlled manual backup:** build a narrow authenticated request/local worker contract around accepted capture; add durable status/audit/recovery and isolated test-only failures. No restore/update activation.
3. **Quarantined verification/rehearsal:** authorize bounded uploads, trusted provenance checks and newly owned isolated restoration only. Prove cleanup and rejection cases.
4. **Signed update inspection/staging:** establish signer policy and complete release format; data-only change review, isolated execution only after trusted approval, compatibility/fallback evidence. No automatic migrations.
5. **Separately approved activation/recovery:** only after maintenance/operator/office approval, current-state preservation and witnessed go/no-go. Production/LAN requires its own target-specific release approval, least-privilege/HTTPS/network/recovery acceptance.

ADMIN-UX-1 implements none of these writers or permissions. Its only related deliverable is this planned fourth navigation position and specification. Remaining office decisions and security/recovery contracts must remain explicit.
