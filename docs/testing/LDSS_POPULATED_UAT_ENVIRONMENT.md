# LDSS populated synthetic UAT environment

Prepared and verified **24 October 2026, Philippine time**. Six independent local fixtures are retained for reuse. Five contain separately finalized **835-member payrolls**; the sixth contains the smaller omitted-scholar workflow. All identities and evidence are synthetic. **No LAN scholar records were accessed or copied.**

This task adds test tooling and documentation. Existing application code, build artifacts, migrations, development configuration and operational feature flags remain unchanged. It does not implement B-O1, UI enhancements, Q28/PB1 changes, P11 or deployment. Verification results and qualifications are in [the dataset report](LDSS_UAT_DATASET_VERIFICATION.md); identifiable import remains gated by [the import plan](LDSS_LAN_ROSTER_IMPORT_PLAN.md).

## Retained environments

| Scenario | Exact local database | Profiles, including extra cases | Retained payroll state |
|---|---|---:|---|
| A | `ldss_import_test_38548_5a6b5d39` | 866 | Processed; **835 Pending**, zero Paid/Unclaimed. Main Registry, documents, academic, standing and masterlist examples. |
| B | `ldss_import_test_33116_c0e12c7c` | 858 | Processed; **825 Paid / 10 Unclaimed / 0 Pending**; recording complete, returned verification pending. |
| C | `ldss_import_test_30788_99ccdd89` | 858 | Same 825/10; returned payroll **Verified**, ready for Coordinator closure. |
| D | `ldss_import_test_33180_dee9e37a` | 858 | **Closed**; immutable Original 825/10 reconciliation. |
| E | `ldss_import_test_37552_dac869b7` | 858 | Closed Original **825/10**, Updated **826/9**; separate DV lifecycle, three acknowledged individual releases and pending discrepancy examples. |
| F | `ldss_f19_test_2244_24e96a94` | 4 | Two-member frozen payroll plus an eligible omitted scholar; later editable-payroll route, preparation closure, OR + DV authorization, forwarding, cancellation/replacement, actual individual Paid and Coordinator correction. |

Each standard payroll approves **PHP 5,000 × 835 = PHP 4,175,000**. B–D preserve PHP 4,125,000 original Paid and PHP 50,000 Unclaimed. E intentionally differs in Updated reconciliation; it must not be mistaken for the unchanged standard B fixture. Physical profiles are repeated independently across databases for scenario isolation; do not merge them or treat the sum as a real office population.

Each schema has **139 base tables: the unchanged 138-table application schema plus `_ldss_uat_owner`**, a fixture ownership marker. All **62 existing migration checksums** match. The marker is test metadata, not an application migration or financial table.

## Starting and selecting a fixture

Run commands from `C:\xampp\htdocs\scholar_monitor`, using the existing local development setup credentials already consumed by the approved test infrastructure. Do not edit `.env` or point a default application process at UAT.

```powershell
node --import tsx scripts/uat-environment.mjs serve A 3003
```

The server verifies the exact owned schema and manifest before binding to **127.0.0.1**. It serves the existing accepted `dist/client` and application services through a dedicated restricted runtime pool. Ports must be 3003–3010. There are no fixture stop/reset HTTP endpoints.

At delivery, the following servers are available:

| URL | Fixture |
|---|---|
| [http://127.0.0.1:3003](http://127.0.0.1:3003) | A: Pending payroll and extended office examples |
| [http://127.0.0.1:3004](http://127.0.0.1:3004) | B: Completed 825/10 recording |
| [http://127.0.0.1:3005](http://127.0.0.1:3005) | F: Omitted OR + DV examples |

C, D and E can be started independently, for example `serve C 3006`, `serve D 3007` or `serve E 3008`. Stop an owned server with Ctrl+C in its terminal before cleanup. Prefer one server during measurements to reduce contention. A process restart retains its database; it does not recreate the dataset.

The selected cycle/batch links are recorded in each manifest under `output/populated-uat-20261024/A.json` through `F.json`. A payroll link uses the manifest's **own** cycle and batch IDs:

```text
http://127.0.0.1:3003/#payouts?cycle=MANIFEST_CYCLE_ID&batch=MANIFEST_BATCH_ID&view=recording
```

Do not reuse A's UUIDs on B's server. Initial Home may select the separate deliberately unconfigured cycle; choose the intended synthetic period when testing its dashboard or payroll.

## Accounts and isolation

Each schema has independent synthetic accounts:

- `staff@example.invalid`
- `coordinator@example.invalid`
- `system_admin@example.invalid`
- `unassigned@example.invalid`, for forbidden-access checks

Passwords are randomly generated per fixture and are not documented here. Account and runtime credentials are in the ignored `output/populated-uat-20261024/private/SCENARIO-credentials.json`. The private directory's Windows ACL grants access to the current Windows user and SYSTEM; do not commit or distribute it. No real account password, token, session or representative identity was copied.

Runtime users are the exact generated `ldss_test_PID_SUFFIX@localhost` identity corresponding to each database. The unchanged `grantAuthRuntime` tool grants the existing table/column permissions within that schema. They have no global privileges beyond USAGE, no privileges on another schema and no write access to protected histories outside the approved append paths. Pure Administrator business restrictions, CSRF, role checks and audit attribution remain active.

The four individual-payment flags are enabled **only in the explicitly constructed UAT app instances**. The main `.env` flags remain false. No environment variable overrides redirect the development application or connect to LAN.

## Calendar and office cases

Dates below are explicit **synthetic fixture dates**, not official school calendars. They follow the existing fixture generator's relative-date convention, anchored to 24 October 2026 in this build. Rebuilding later generates a new valid test calendar from that convention; it does not determine office policy or extend these existing periods.

| Academic year | Year dates | First semester | Second semester |
|---|---|---|---|
| `UAT-EARLIER-YEAR` | 2024-09-04–2025-08-29 | 2024-09-14–2025-03-03 | 2025-03-13–2025-08-29 |
| `IMPORT-PRIOR-YEAR` | 2025-08-30–2026-08-24 | 2025-09-09–2026-02-25 | 2026-02-26–2026-08-24 |
| `IMPORT-YEAR`, working year | 2026-08-25–2027-08-20 | 2026-10-04–2027-02-21 | 2027-02-22–2027-07-31 |

A–E have these six semesters. F retains the independent established main-payroll fixture calendar, documented in its verification JSON. A includes academic placement records across all three years, reviewed New/Continuing imports, different institutions/courses/year levels, long and short names, compound surnames, incomplete profiles and explicit duplicate review. Unknown prior grades/course facts remain unknown.

A's eight additional office cases provide partial/missing documents, verification, rejection, resubmission, failed-subject and INC findings, an approved transfer, holds, suspension, graduation and a pending leave decision. Draft, verification, approval and publication states use separate lists. A controlled later addition and an earlier course-completion amendment preserve prior published versions. Main payroll membership remains exactly 835.

E retains Unclaimed request, preparation, documents-ready, forwarding, representative single release, reviewed two-payment bulk release, cancellation/replacement and discrepancy histories. A cancelled original's reported release blocks another replacement release pending Coordinator review; it does not manufacture a second Paid record. F retains the corresponding omitted route and a reviewed individual-payment date correction. Documents/cheque preparation and forwarding alone never set Paid.

Some lifecycle states are retained in their audited histories rather than as a separate simultaneously current transaction for every label. Recreate a fresh owned fixture to repeat its transitions. The dataset is not proof that every possible ineligible omission, late-period policy variant or concurrency workload has an interactive fixture.

## Recreate the dataset without resetting existing databases

The adapter reuses `test-import-db.ts`, the document/prior-approval fixtures, `test-eligibility-db.ts`, main-payroll/omission fixtures, `applyMigrations`, existing runtime grants and normal authenticated APIs. It supplies the current semester coverage hashes required by the accepted services. It retains databases after generation instead of the historical runner's automatic teardown. Application source and historical test expectations are preserved.

For a scenario letter with **no existing manifest**, create a new owned schema:

```powershell
node scripts/uat-environment.mjs create A
node scripts/uat-environment.mjs create B
node scripts/uat-environment.mjs create C
node scripts/uat-environment.mjs create D
node scripts/uat-environment.mjs create E
node scripts/uat-environment.mjs create F
```

These commands **currently refuse**, because all six manifests already exist. They are not reset commands. Each new creation uses a unique disposable database/user name, applies and rechecks the 62 migrations, stages reviewed synthetic imports and obtains genuine publication/finalization/processing decisions. No frozen payroll is inserted directly and no financial constraint is disabled for seeding. The small inherited fixture includes deliberately isolated legacy/placeholder rejection probes; these are not operational waivers.

On freshly created fixtures, add the extended examples once, in this order:

```powershell
node --import tsx scripts/uat-extended.ts
node --import tsx scripts/uat-academic-examples.ts
node --import tsx scripts/uat-addition-and-correction.ts
node --import tsx scripts/uat-conflict-example.ts
```

These preparation commands are not a general idempotent reset API. Do not rerun completed transitions against a modified office UAT session. `uat-resume.ts` is an investigation tool for an interrupted owned setup, not a command to reset a ready scenario.

Verify an owned fixture and inspect its inventory:

```powershell
node --import tsx scripts/uat-verify.ts A
node scripts/uat-environment.mjs reset-dry-run A
```

The inventory displays the exact schema, runtime account, every base table and its record count. It performs no deletion. A future cleanup requires **both** the exact schema confirmation and the SHA-256 of the reviewed inventory file. Stop the owned server first, review the output, and obtain the user's explicit destructive authorization before running a cleanup command. The tool rechecks ownership, matching account identity, table names/counts and absence of shared account privileges. It rejects unknown names, development/LAN identities, stale inventories and missing confirmation.

```powershell
# Example syntax only — destructive cleanup was NOT executed for any populated fixture.
node scripts/uat-environment.mjs cleanup A --confirm-drop=EXACT_OWNED_DATABASE --inventory-sha256=REVIEWED_INVENTORY_HASH
# After a separately confirmed cleanup only:
node scripts/uat-environment.mjs create A --new-after-confirmed-cleanup
```

Cleanup retains the removed ownership manifest as history before any new allocation. It never targets another schema/account or changes default development configuration. A failed first provisioning allocation that contained **zero tables, accounts or records** was rolled back separately; all populated fixtures are retained.

## Recovery, resources and artifacts

The F fixture has an encrypted backup and a verified isolated restore using existing recovery tooling. Recovery checked all 139 tables, data checksums, indexes, foreign keys, checks, views and constraint rejection probes. Only F's source tables were read-locked; no global backup lock or development restore was used. The temporary restore database/account were removed normally. This is technical synthetic recovery, not an off-host or witnessed office recovery acceptance. See `output/populated-uat-20261024/recovery-check.json`.

The backup archive/key and credentials remain in the ACL restricted private directory. To reproduce recovery on a fresh setup use `node scripts/uat-recovery-check.mjs`; an existing recovery key causes a refusal rather than silent overwrite. Keep key values out of reports. The 64 MiB SQL and 96 MiB archive limits remain unchanged.

The verified databases allocate approximately **569 MiB combined**, excluding server logs, temporary work and artifacts. This Windows host uses Node 22.21.0/MariaDB 10.4.32. Seed commands allow a 4 GiB Node heap and should normally run sequentially. These are observed conditions, not minimum hardware or sustained LAN capacity certification.

Evidence lives under `output/populated-uat-20261024`: manifests, inventories, verification JSON, action records, benchmarks and generated exports. Fictional screenshots are under `output/playwright/populated-uat`. Generated Excel/PDF/DOCX files are test evidence, including historical cancelled drafts; they are not official payment documents. Synthetic fixtures remain until an explicitly confirmed cleanup; there is no scheduled deletion job.

The environment supports B-O1 and targeted UI testing now. Native browser zoom and fresh native Word rendering remain qualified in the verification report. PB1/PB2/PB6 and office acceptance remain separate; no real-name import or unrelated enhancement starts automatically.
