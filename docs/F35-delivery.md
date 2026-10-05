# F35 — Backup, Restore and Disaster Recovery

Implemented in v0.36.0. F34 is accepted by the request to proceed. F35 awaits acceptance; next is F36 UAT and production go-live preparation.

Local administrator commands now create authenticated encrypted backups, verify them in disposable databases, and optionally retain a verified recovery copy. No public API, migration, live restore, production cutover or account reset was added. The [runbook](F35-recovery-runbook.md) defines retention, ownership, proposed RPO/RTO, key custody and recovery steps, and identifies scheduling/offsite work still required for production.

## Validation

- `npm run test:backup-db`: all 76 tables restored; audit/masterlist/OVR/migration history populated and preserved; wrong-key/tamper failures occur before import; the restore SQL account cannot read the live database; temporary success/failure databases and accounts removed.
- A retained encrypted archive was verified through the actual CLI. All table counts and SHA-256 logical data digests, schema objects, executable views and unique/FK/check rejection probes passed. A JSON recovery report was saved locally.
- `npm run check`: lint, 178 tests in 36 files, TypeScript checks, production client/server build and secret scan passed.
- `npm run test:db`: live migration checksums and restricted runtime grants passed; no migration or grant changes were needed.
- The Windows key ACL was inspected: current OS account and SYSTEM only.

An initial physical checksum comparison differed for the generated-column `user_roles` table despite equal logical values. The final verifier hashes actual row values, preserves full date precision and compares generation expressions, rather than weakening the recovery gate.

This proves recovery for the present local dataset, not production-scale RTO or offsite disaster resilience. The local archive and key still need separate operator-controlled recovery copies, and daily scheduling/retention need operational setup. No backup has been uploaded or sent anywhere.
