# Backup foundation v2 — operator-gated correction

**Prepared, not installed.** See the [guarded recovery and provisioning handoff](../../../docs/requirements/ADMIN_SYS_1A_2_GUARDED_RECOVERY_AND_V2_HANDOFF.md) for the exact hash-verified commands and limitations.

The original v1 source, protected package and ownership evidence are not replaced. First inspect the current failed foundation using the separate recovery script. Its Cleanup mode accepts only the exact account-absent, empty-root early failure. It preserves the original ownership record in protected recovery storage before nonrecursive removal. Unexpected ownership, contents, ACLs or timing stop cleanup.

Only after cleanup succeeds and the operator approves a new attempt, use the separately sealed v2 bootstrap. It stages to `C:/ProgramData/LDSS-IPUAT-BackupProvisioning-v2`, verifies all payload hashes and retains the existing elevation, real-token, target, ACL and isolation checks. The account marker is `LDSS IPUAT ` plus the complete ownership GUID (47 characters). Registry ACL reading/deletion uses explicit 64-bit .NET Registry handles. Completed v2 replay still reaches the existing verification path; partial/foreign registrations refuse.

The machine-bound `provision-profile.json` remains private and ignored by Git. Its version is v2; all host/release/database/configuration bindings remain identical to the original reviewed profile. A clone alone is not a provisioning package. Never invent a replacement profile or change hashes to bypass a mismatch.

No worker service, SQL capability, backup job, API or UI is installed by this handoff. Live elevated provisioning and real token-isolation acceptance remain operator gates. Do not use these scripts for primary or operational LAN.
