# F36 — Release and rollback procedure

## Current procedure - 19 October 2026

**Installed at 09:38 Asia/Manila:** `release-20261019-daytime`, 53 matching migrations, supervised startup and preserved LAN business values. The user explicitly authorized daytime maintenance and confirmed sign-out; the default after-hours restriction was retained with a separately tested explicit exception. [Actual installation/verification evidence](../output/go-live-20261019-daytime/REPORT.md). Restricted pilot is available; office-wide, reboot/client and off-host backup acceptance remain pending. The 48-migration baseline described below is the pre-cutover state, not the current database.

The authoritative execution procedure is [Supervised office release](../deployment/office-release/README.md). Older sections below are historical and must not be used to deploy the current candidate. In particular, their migration counts and claim of no schema change are obsolete.

The live baseline is `release-20261012`, with 48 applied migrations and matching historical checksums. The candidate contains 53 migrations: F39 additions, F40 consolidation, F41 shared semester documents, F42 entrant grading cards and F43 policy consistency are pending. Keep LAN records/accounts authoritative. Preserve the installed supervisors and `https://monitor.iskolarngdaet.app:3443`; do not rerun the old direct-action release installer.

Build/stage an immutable artifact outside the web root, rehearse target backup/upgrade/recovery on restored copies, then bind it to a fresh successful unchanged-source gate. Capture operators, two PCs and an approved after-hours window of at most two hours before cutover. Use the reviewed elevated supervised installer, fresh verified backup, preservation checks and restricted runtime grants.

Reboot acceptance from two PCs before host Windows sign-in, a full working-day pilot, approved official configuration, independent backup retrieval/restoration and separate recovery-key custody precede office-wide sign-off. The old runtime rejects the new schema; application-only rollback is not assumed safe. Restore into a separate database and reconcile post-backup writes before any reviewed recovery cutover. Target four operating hours maximum lost work and recovery within one working day. See the linked procedure and pilot checklist for monitoring and exact commands.

## Historical F36 procedure

Historical status: candidate preparation only. Human acceptance and production configuration were outstanding at that checkpoint.

## Freeze the candidate

1. Finish code changes, then run `npm run test:uat`. Require every suite to pass. Keep the generated report, logs, encrypted backup and restore report together in the private release evidence store; preserve the encryption key separately.
2. Match all migration names/checksums (40 in the current candidate) and the dependency-lock/build/source hashes in the report. No schema change is introduced by v0.37.0. Do not edit historical migrations, regenerate dependencies or rebuild under a changed source tree and reuse the old acceptance report.
3. Retain an immutable copy of the accepted application artifact, lockfile, source and deployment configuration in the administrator's release store. Keep `.env` and secrets outside the public artifact. This repository's accumulated working changes must be reviewed and committed/tagged through the owner's normal release process; no commit or production tag is created automatically.
4. Preserve the exact prior working artifact/configuration before a real deployment. A mutable local `dist/` directory is not a rollback archive. This checkpoint does not claim a previously deployed production artifact exists.

## Deploy only after sign-off

1. Complete the [acceptance checklist](F36-acceptance-checklist.md), name the operators and approve a maintenance window. Stage the exact frozen candidate in a production-equivalent environment.
2. Stop new writes and take a fresh verified backup immediately before deployment. The F35 commands support local recovery only; use the reviewed production backup procedure for the actual production host. Do not bypass the local safeguards by relabeling a production database as development.
3. Keep the application source and private configuration outside public document roots. Serve only the built application through the approved HTTPS endpoint. Use dedicated restricted SQL runtime credentials, separate migration credentials and correct `APP_ENV`/`APP_ORIGIN` settings.
4. Apply only reviewed pending migrations with the migration administrator. Compare the deployed schema to the validated 40-migration manifest; do not infer that no migration is needed from the application version alone. Never grant the web runtime schema-administration privileges to make startup work.
5. Start the frozen artifact, verify health/readiness, and repeat separate Staff/Coordinator/System Administrator smoke tests: login, receiving, scoped reports, approval restrictions and audit evidence. Release traffic only when the named owners accept the results.
6. Record deployment time, exact candidate/report hash, migration state and backup ID. Monitor failures, database readiness and backup completion.

## Rollback decision and execution

Trigger rollback or isolate writes for failed critical workflows, authorization regressions, inconsistent financial/official records or persistent readiness failure. The technical owner coordinates rollback with the Coordinator; preserve incident logs and record the time writes were stopped.

- **Application-only failure, schema compatible:** stop the candidate, restore the verified previous application artifact and configuration, then check readiness and all three roles before resuming writes. v0.37.0 introduces no migration, but compatibility with the actual previous production artifact must still be verified.
- **Suspected data corruption or incompatible schema:** preserve the affected database, recover the last verified backup to a new isolated database, compare records and audit history, estimate lost/new transactions and obtain operational approval for reconciliation/cutover. Use the F35 recovery procedure; never overwrite the only current database or run reverse SQL against official history casually.
- **Writes occurred after the backup:** restoring that backup loses newer transactions. Reconcile these with the Coordinator before cutover; do not silently accept the loss or delete audit evidence.
- **No verified prior artifact or usable backup/key:** stop rollout and repair the missing recovery capability. Do not declare rollback ready.

After rollback, preserve both versions and evidence, open a defect record, rerun the acceptance gate after the fix and obtain fresh sign-off. A successful automated gate never authorizes production launch by itself.
