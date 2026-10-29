# Home-development snapshot — ADMIN-SYS-1A.3

29 October 2026. **Unfinished source only. Not an installation or release package.**

The user requested GitHub upload and a conversation handoff to continue work at home during office renovation.

- [Conversation / exact resume point](../../docs/handoff/CONVERSATION_HANDOFF_2026_10_29.md)
- [Current implementation checkpoint](../../docs/requirements/ADMIN_SYS_1A_3_BACKUP_MANAGEMENT_REPORT.md)
- [Original request](ADMIN_SYS_1A_3_REQUEST.md)
- [929-file staged source snapshot](admin-sys-1a-3-source.zip)
- [Per-file source/baseline manifest](source-manifest.json)
- [SHA-256 checksums](SHA256SUMS.txt)

## Extract safely

Use a new directory outside any accepted release or running application. Example, after cloning the repository:

```powershell
Get-FileHash -LiteralPath .\handoff\2026-10-29\admin-sys-1a-3-source.zip -Algorithm SHA256
# Expected: bc66268264a017793ad47d035346155361f10668dba188d881ee73766e94f618
Expand-Archive -LiteralPath .\handoff\2026-10-29\admin-sys-1a-3-source.zip -DestinationPath C:\LDSS-home-development\admin-sys-1a-3
```

Do not extract over an existing working directory. `stage/` contains the actual accepted 5181 source baseline with the unfinished backup changes. It intentionally differs from repository root; no deployed source was replaced during this upload.

Dependencies, executable runtimes, private environment files, passwords, SQL copies/dumps, sessions, backup archives, keys, PFX certificates and private evidence are **not included**. Home development needs its own separately configured disposable synthetic environment. This GitHub upload is not a database/system backup and does not recreate the office UAT or Windows foundation.

Do not run `scripts/manual-backup/Prepare-Worker.ps1` or its installer. The bootstrap still contains an unsealed manifest placeholder. Actual service/ACL verification, operator handoff and 5181 activation are pending. Do not run office-specific integration/launcher scripts against office services or substitute a new identity/account. Read the handoff before testing.

The archive was reopened, all 929 entries verified against the manifest, and reviewed for known local/disposable credentials and private-key content. No such material was found. The actual worker-only backup key was never read for this transfer.
