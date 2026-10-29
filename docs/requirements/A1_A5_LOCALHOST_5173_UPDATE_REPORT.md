# A1 + A5 — existing localhost:5173 UAT update

24 October 2026, Philippine time. **Completed on the existing main UAT at [http://127.0.0.1:5173/](http://127.0.0.1:5173/).** The existing database was upgraded from 62 to 63 migrations with F53 and the required narrow runtime grants. The previously implemented A1+A5 application code was reused. Existing accounts, passwords, role assignments and business records remain intact. No synthetic scholars were copied into this UAT.

This is now the primary target for future separately approved LDSS enhancements. No additional demonstration server was created. Other enhancement batches, financial activation, P11 and LAN deployment were not started.

## Verified target and startup

| Layer | Actual mapping |
|---|---|
| Frontend | Vite source in `C:/xampp/htdocs/scholar_monitor`, version **0.37.0**, bound to **127.0.0.1:5173** |
| API proxy | Existing `vite.config.ts`: `/api` → **http://127.0.0.1:3001** |
| Backend | Existing `tsx watch server/index.ts`, bound to **127.0.0.1:3001**, development configuration |
| MariaDB | **127.0.0.1:3306**, version **10.4.32**, server hostname **DESKTOP-BPLJKRP**, matching this Windows host |
| Database | **`ldss_scholar_monitor_dev`** |
| Runtime identity | **`ldss_monitor_local@localhost`**, verified through the actual connection |
| Migration state | **62 → 63**, adding only `20261024010000_f53_annual_intake_registration.sql`; every earlier checksum matches its existing file |
| Working year | Existing **AY2026-2027**, unchanged |

Neither main listener was running initially. Configuration, source and the actual runtime database connection were verified before schema work; the database was not inferred from the frontend port. After the update, the existing `npm run dev` command started Vite PID **37368** and API PID **8272**. The proxied `/api/v1/ready` returned `status: ready`, `database: connected`.

When these main processes are stopped, start them from the workspace:

```powershell
Set-Location -LiteralPath 'C:\xampp\htdocs\scholar_monitor'
npm run dev
```

Open **http://127.0.0.1:5173/** and use the existing accounts. No password reset, account recreation, `.env` repointing or port-3013 database substitution occurred. [Starting target evidence](../../output/a1-a5-localhost-5173-20261024/target-before.json).

## Backup, preflight and exact update

An encrypted pre-update backup was created and restored into an isolated temporary database. All **138 original tables**, data checksums, definitions, indexes, foreign keys, checks, triggers and views matched; constraint rejection checks passed. The isolated restore and its generated account were removed. Archive/report hashes and verification metadata are in [backup verification](../../output/a1-a5-localhost-5173-20261024/backup-verified.json). The archive and key remain in the restricted task-private directory; their contents are not reproduced here.

The F53 preflight accepted **162 existing intake roots** with no incompatible references, duplicate person/year ownership or missing immutable intake triggers. It verified that the current database inventory still matched the recoverable backup before DDL. No automatic data repair or reclassification was performed. [Preflight](../../output/a1-a5-localhost-5173-20261024/preflight.json).

The update applied the existing F53 migration: nullable manual-intake support, revision/command tables, immutable protections, the `scholars.intakes.correct` permission and its **Coordinator-only** role-permission seed. Existing intake origins use F53's import default; original columns and imported evidence are unchanged. Both new tables remain empty in the main UAT.

Only **SELECT and INSERT** were granted on `scholar_intake_revisions` and `annual_intake_commands` to the existing runtime account. SELECT/INSERT access and UPDATE/DELETE denial were checked without committing test data. Existing global, schema, table and column grants were otherwise preserved. [Applied result](../../output/a1-a5-localhost-5173-20261024/apply.json), [runtime grants](../../output/a1-a5-localhost-5173-20261024/runtime-grants-after.json).

The migration runner checks the exact local target, old checksums, verified recovery evidence and quiet main ports before first application. MariaDB DDL is not assumed to roll back transactionally. No blind retry, old-checksum edit, broad runtime grant or financial-source rewrite was used.

## Repository changes

| File | This task's change |
|---|---|
| [annual-intake-preflight.mjs](../../scripts/annual-intake-preflight.mjs) | Add the explicitly authorized main-UAT review path, pinned to the exact local database/runtime identity and verified backup inventory. Default disposable-schema ownership checks remain. |
| [migration-lib.mjs](../../scripts/migration-lib.mjs) | Pass the explicit review evidence to F53 preflight. Its other dirty-worktree changes predate this task. |
| [update-localhost-5173-a1-a5.mjs](../../scripts/update-localhost-5173-a1-a5.mjs) | New bounded preflight/apply/verify runner for this target, original-data comparison and narrow grants. No reset or arbitrary-target operation. |
| [annual-intake-preflight.test.ts](../../tests/annual-intake-preflight.test.ts) | Eight tests covering default denial, owned schemas and mismatched/incomplete target/recovery evidence. |
| This report | Target, upgrade, browser, regression and preservation evidence. |

No A1+A5 UI/service implementation was rewritten. Application source, existing migrations, schema manifest, financial code, dependencies, configuration and flags were reused unchanged. Task-only evidence scripts and logs are under `output/a1-a5-localhost-5173-20261024/`.

The normal build passed. Its new client artifacts were copied into this task's `built-client` directory, then the prior static client inputs were restored for the unchanged schema-62 retained servers. Main 5173 serves the current Vite source against its upgraded schema. Servers **3011, 3012 and 3013** kept their existing processes and data.

## Browser verification on the actual main UAT

The user signed in directly with existing Staff and Coordinator accounts in the visible test browser. No credentials were supplied to the automation and no account changes were made.

- **Staff:** Add Scholar displays AY2026-2027, an initially unselected required New/Continuing choice, required source/reference and identity fields. School, course and year level are independently optional and blank. Both classifications can be selected. The draft was cancelled without saving.
- **Provenance/history:** An existing imported Continuing scholar displays its actual import/row, original classification, recorded actor/time and bounded history. Existing academic, annual and Masterlist context remains visible. Staff has no classification-correction control.
- **Coordinator:** The same existing record exposes the authorized correction control. Source and reason are required, and the required review acknowledgment starts unchecked. Tab moves from source to reason. No correction was submitted. Established placement remains directed to the existing academic workflow.
- **Discovery:** Selecting the existing working year and including initial registrations/annual associations works without changing the Registry default. New/reuse/supplement/correction writes, source conflicts and search/count parity were exercised in disposable integration tests instead of adding test people to the main database.
- **Existing workflows:** Existing scholars, Masterlists, payroll and saved roster/history pages load. The existing `TEST1-1` payroll retains its legacy read-only containment; new financial recording still requires its existing controlled numbered-payroll conversion. This update does not convert it or claim it became newly payable.
- **Individual Payments:** The existing disabled-configuration message remains. All five optional individual/omission/document/settlement/historical-append flags remain at their effective default **false**. No feature was activated.

Screenshots: Staff registration at [1440](../../output/playwright/a1-a5-5173/staff-registration-1440.png), [1024](../../output/playwright/a1-a5-5173/staff-registration-1024.png) and [820](../../output/playwright/a1-a5-5173/staff-registration-820.png) CSS pixels; Coordinator history/correction at [1440](../../output/playwright/a1-a5-5173/coordinator-history-1440.png), [1024](../../output/playwright/a1-a5-5173/coordinator-history-1024.png) and [820](../../output/playwright/a1-a5-5173/coordinator-history-820.png); [existing payroll](../../output/playwright/a1-a5-5173/staff-existing-payroll.png); [Individual Payments disabled](../../output/playwright/a1-a5-5173/coordinator-individual-disabled.png). [Staff form evidence](../../output/a1-a5-localhost-5173-20261024/staff-form.log), [Staff read evidence](../../output/a1-a5-localhost-5173-20261024/staff-read.log), [Coordinator evidence](../../output/a1-a5-localhost-5173-20261024/coordinator-read.log).

The initial signed-out `/auth/me` 401 was expected; no later browser console error was recorded. Browser testing saved no registration, supplement, correction, import, publication or financial command in the main UAT. Screenshots are local evidence containing existing UAT records, not synthetic fixture replacements.

## Verification results

Every check below exited **0** on this candidate. No rule, strictness setting or safety limit was disabled.

| Check | Result |
|---|---|
| `npm run lint` | Zero errors/warnings. [Log](../../output/a1-a5-localhost-5173-20261024/lint.log) |
| `npm run typecheck` | Client, server and validation projects passed. [Log](../../output/a1-a5-localhost-5173-20261024/typecheck.log) |
| `npm run build` | Complete normal build passed; existing Vite chunk-size warning remains. [Log](../../output/a1-a5-localhost-5173-20261024/build.log) |
| `npm test` | **100 files, 639 tests passed**, including the eight new target/recovery guard tests. [Log](../../output/a1-a5-localhost-5173-20261024/tests.log) |
| `npm run check:secrets` equivalent `node scripts/check-secrets.mjs` | **1,205 source/build files** checked; passed. [Log](../../output/a1-a5-localhost-5173-20261024/secrets.log) |
| `node --import tsx scripts/test-annual-intakes-db.ts create` | DA01–DA13 families: nullable placement, first-digital Continuing, explicit reuse, duplicate/race/retry/rollback, supplements, Coordinator corrections, provenance/history, bounded association reads, import compatibility, populated 62→63 backup/upgrade and narrow privileges. [Log](../../output/a1-a5-localhost-5173-20261024/annual-intakes-db.log) |
| Scholar / academic / continuing / Masterlist workflow DB drivers | **17 / 9 / 8 / 11 scenario groups passed**, respectively. [Scholar](../../output/a1-a5-localhost-5173-20261024/scholars-db.log), [academic](../../output/a1-a5-localhost-5173-20261024/academic-db.log), [continuing](../../output/a1-a5-localhost-5173-20261024/continuing-db.log), [Masterlist](../../output/a1-a5-localhost-5173-20261024/masterlist-workflow-db.log) |
| Import driver `--prior-quick --omitted-historical` | **13 import groups** passed, including mixed New/Continuing/Old, scoped prior review, Course pending, publication, exact retry and genuine same-import historical omission ownership. [Log](../../output/a1-a5-localhost-5173-20261024/historical-import-db.log) |
| Eligibility driver `--main-payroll --payment-recording --payroll-reconciliation --financial-reports --registry-parity` | **12 base scenarios**, Registry comparisons and payment/reconciliation/report subchecks passed, including stale sources, permission/CSRF, transaction rollback, exact retries, immutable Original/current distinctions and XLSX/PDF totals. [Log](../../output/a1-a5-localhost-5173-20261024/financial-registry-db.log) |
| `node scripts/check-database.mjs` | Actual main connection, all 63 migration checksums, protected writes and restricted grants passed. [Log](../../output/a1-a5-localhost-5173-20261024/database-check.log) |

The [command ledger](../../output/a1-a5-localhost-5173-20261024/regressions.json) records exact integration arguments and exits. Mutating automated scenarios used newly owned disposable schemas. The annual test's exact PID/schema/owner marker was verified before removing only that new schema and account; no server was started for it. Other drivers removed their own disposable databases. Financial report artifacts were isolated under this task's output directory. No retained fixture reset/resume/control command was used.

## Data and environment preservation

| Protected main-UAT records | Before → after |
|---|---:|
| Accounts | **10 → 10** |
| Scholars / permanent identities | **212 → 212** |
| Original annual intake roots | **162 → 162** |
| Academic records | **237 → 237** |
| Masterlist versions / publications | **6 / 6 → 6 / 6** |
| Payroll batches / finalizations | **6 / 5 → 6 / 5** |
| Entitlements / allocations | **0 / 0 → 0 / 0** |
| Payment records | **52 → 52** |
| Individual-payment transactions | **0 → 0** |
| New intake revisions / command receipts | **Absent → 0 / 0** |

These are complete original-value/checksum comparisons, not only equal counts. All original business rows, passwords/account fields, user-role assignments, financial frozen evidence and pre-existing audit rows match. Unaffected definitions also match. The only expected data additions from migration are its journal and permission seeds; F53 did not manufacture manual intakes or academic/financial approvals. [Immediate migration comparison](../../output/a1-a5-localhost-5173-20261024/apply.json), [final main preservation](../../output/a1-a5-localhost-5173-20261024/main-preservation.json).

Browser handoff/sign-in activity appended **eight authentication audit events** and **five sessions**; rate-limit state also changed. All pre-existing audit rows and existing session identities remain exact, with no existing session updates in the final comparison. Authentication changes are reported separately from migration/business data. A second isolated restore of the original encrypted backup enabled exact old-audit/session comparison and was removed afterward. The comparison helper initially assumed sessions had an `id`; it was corrected to use their actual `token_hash` key. No session or business data was repaired.

All **16 other retained schemas** match their starting complete inventories, including accounts, definitions, rows and counts. Existing account grants match except the four intended main-UAT table/privilege additions. This includes A–F, V1/V2, 3011's 800+200 Pending fixture, 3012's individual-payment demonstration and earlier annual/upgrade fixtures. [Preservation before](../../output/a1-a5-localhost-5173-20261024/preservation-before.json), [after](../../output/a1-a5-localhost-5173-20261024/preservation-after.json).

All **1,132 checkpointed existing files** matched at completion, including application/configuration, existing documentation, migrations and restored original build inputs. This checkpoint was taken **after** the two scoped migration-helper edits; it is not a claim that those two edits predated the task. New runner/test/report files and additional build artifacts are separately declared above. [File comparison](../../output/a1-a5-localhost-5173-20261024/files-final.json).

## Limits and stop point

The existing legacy-payroll restriction and disabled individual-payment flags remain intentional boundaries. Manual initial registration does not make a scholar eligible, publish membership, verify COR/COG or turn the record into an approved historical import. Existing academic completion, source correction, publication and payment controls remain responsible for those steps. Browser acceptance here was read-only/draft; actual mutation acceptance ran in disposable schemas. No broad office acceptance, security certification or performance improvement is claimed.

**Stopped after the main 5173 update, verification and this report.** No LAN operation, fixture replacement, account/password reset, financial-policy change, new feature activation or unrelated enhancement was performed. The main application remains running at **http://127.0.0.1:5173/** with the existing data and accounts.
