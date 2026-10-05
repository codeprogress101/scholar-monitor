# F36 — Release and rollback procedure

Status: candidate preparation only. The local application remains on loopback/XAMPP. Human acceptance and production configuration are outstanding.

## Freeze the candidate

1. Finish code changes, then run `npm run test:uat`. Require every suite to pass. Keep the generated report, logs, encrypted backup and restore report together in the private release evidence store; preserve the encryption key separately.
2. Match all 29 migration names/checksums and the dependency-lock/build/source hashes in the report. No schema change is introduced by v0.37.0. Do not edit historical migrations, regenerate dependencies or rebuild under a changed source tree and reuse the old acceptance report.
3. Retain an immutable copy of the accepted application artifact, lockfile, source and deployment configuration in the administrator's release store. Keep `.env` and secrets outside the public artifact. This repository's accumulated working changes must be reviewed and committed/tagged through the owner's normal release process; no commit or production tag is created automatically.
4. Preserve the exact prior working artifact/configuration before a real deployment. A mutable local `dist/` directory is not a rollback archive. This checkpoint does not claim a previously deployed production artifact exists.

## Deploy only after sign-off

1. Complete the [acceptance checklist](F36-acceptance-checklist.md), name the operators and approve a maintenance window. Stage the exact frozen candidate in a production-equivalent environment.
2. Stop new writes and take a fresh verified backup immediately before deployment. The F35 commands support local recovery only; use the reviewed production backup procedure for the actual production host. Do not bypass the local safeguards by relabeling a production database as development.
3. Keep the application source and private configuration outside public document roots. Serve only the built application through the approved HTTPS endpoint. Use dedicated restricted SQL runtime credentials, separate migration credentials and correct `APP_ENV`/`APP_ORIGIN` settings.
4. Apply only reviewed pending migrations with the migration administrator. This candidate has no new migration. Never grant the web runtime schema-administration privileges to make startup work.
5. Start the frozen artifact, verify health/readiness, and repeat separate Staff/Coordinator/System Administrator smoke tests: login, receiving, scoped reports, approval restrictions and audit evidence. Release traffic only when the named owners accept the results.
6. Record deployment time, exact candidate/report hash, migration state and backup ID. Monitor failures, database readiness and backup completion.

## Rollback decision and execution

Trigger rollback or isolate writes for failed critical workflows, authorization regressions, inconsistent financial/official records or persistent readiness failure. The technical owner coordinates rollback with the Coordinator; preserve incident logs and record the time writes were stopped.

- **Application-only failure, schema compatible:** stop the candidate, restore the verified previous application artifact and configuration, then check readiness and all three roles before resuming writes. v0.37.0 introduces no migration, but compatibility with the actual previous production artifact must still be verified.
- **Suspected data corruption or incompatible schema:** preserve the affected database, recover the last verified backup to a new isolated database, compare records and audit history, estimate lost/new transactions and obtain operational approval for reconciliation/cutover. Use the F35 recovery procedure; never overwrite the only current database or run reverse SQL against official history casually.
- **Writes occurred after the backup:** restoring that backup loses newer transactions. Reconcile these with the Coordinator before cutover; do not silently accept the loss or delete audit evidence.
- **No verified prior artifact or usable backup/key:** stop rollout and repair the missing recovery capability. Do not declare rollback ready.

After rollback, preserve both versions and evidence, open a defect record, rerun the acceptance gate after the fix and obtain fresh sign-off. A successful automated gate never authorizes production launch by itself.
