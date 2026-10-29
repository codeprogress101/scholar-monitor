# Localhost:5173 synthetic primary transition

24 October 2026, Philippine time. **Transition and bounded local acceptance completed; stopped after this task.** The existing URL [http://127.0.0.1:5173/](http://127.0.0.1:5173/) now uses a separately owned copy of the verified 1,000-scholar fixture. Database preparation, F53 upgrade, exact account transfer, compatibility checks, original-password Staff and Coordinator browser checks, and final preservation passed. Remaining UI qualifications appear below; no LAN or operational release is implied.

## Connection map and preserved original

| Item | Verified identity/state |
|---|---|
| Original database | **`ldss_scholar_monitor_dev`**, retained with all 212 scholars, 10 accounts, six publications, six payrolls, five finalizations and 52 payment records |
| Reference fixture | **`ldss_hmulti_test_33804_f28b9d67`**, retained unchanged at its existing port 3011 |
| New synthetic primary | **`ldss_primary_test_12676_61497616`**, created only for this authorized transition |
| Restricted runtime | **`ldss_primary_12676_61497616@localhost`**; no original/reference-schema access |
| Local server | MariaDB **10.4.32**, **127.0.0.1:3306**, hostname **DESKTOP-BPLJKRP**, matching this Windows host |
| Frontend | Current Vite source, application **0.37.0**, **127.0.0.1:5173** |
| API | **127.0.0.1:3001**, current source with the explicit synthetic launch profile |
| Final profile process IDs | Controller **32884**, API **27128**, Vite **35080** at the recorded switch |
| Schema | **63 migrations**, including F53; all 62 earlier checksums preserved |

The actual runtime connection, source database ownership, processes and loopback bindings were rechecked. The earlier main API had restarted under its existing development watcher during build; the initial profile stop therefore verified current listener ancestry rather than blindly terminating an earlier API PID. Only the exact main `npm run dev` tree was stopped. Retained 3011/3012/3013 processes and MariaDB were excluded.

No LAN connection was used. No original scholar, academic, Masterlist, payroll, payment or unrelated audit record was copied to the synthetic primary. The original business history remains in the preserved original database; it is not merged into the synthetic UI.

## Backup, isolated recovery and F53

Four fresh encrypted backups were created and verified with the existing isolated restore/constraint tooling:

| Checkpoint | Tables | SQL bytes | Encrypted bytes |
|---|---:|---:|---:|
| Original primary | 140 | 11,468,104 | 2,170,151 |
| Retained synthetic reference | 139 | 53,482,412 | 13,661,260 |
| New populated copy before F53 | 139 | 53,475,612 | 13,659,698 |
| Upgraded copy with transferred accounts | 142 | 53,509,166 | 13,665,726 |

All restorations matched data checksums, definitions, indexes, foreign keys/checks, triggers and executable views; rejection probes passed. Temporary restore databases/accounts were removed. The unchanged limits remain **64 MiB SQL, 96 MiB encrypted archive and 100,000 rows/table**. No limit was increased. Archive hashes and restricted recovery locations are recorded in [backup evidence](../../output/5173-synthetic-primary-20261024/backups.json); passwords and key contents are withheld.

The permanent new copy was restored under a generated definer account restricted to that new schema. All source actor IDs and non-authentication data were preserved. Session, password-reset and rate-limit INSERT statements were omitted from the restore so no copied authentication token became usable. Their definitions and the source's immutable audit history remain. [Copy verification](../../output/5173-synthetic-primary-20261024/copy-verification.json).

The existing F53 preflight accepted **1,000 legacy import roots** on the exact new PID-owned schema after its populated backup was restored successfully. Only F53 was applied there. No retained fixture was migrated and no previous checksum was edited. Original intake columns and every other protected source/financial table remained exact. Both new annual tables were initially empty. Runtime grants use the existing narrow table/column policy, including SELECT/INSERT-only intake revision/receipt tables; UPDATE/DELETE/DDL and other-schema access remain denied. [Upgrade evidence](../../output/5173-synthetic-primary-20261024/upgrade.json).

## Account identity transition

The account schema, supported roles, account IDs, login identifiers, role-row IDs, foreign keys and fixture actor references were inspected before mutation. There were **zero ID/login conflicts** between the original **10** accounts and the fixture's **four** accounts. The final database has **14** account rows.

The original ten users were appended in one audited transaction with exact IDs, login identifiers, password hashes, enabled/disabled states, versions and timestamps. Original supported role rows were copied exactly, excluding their generated column from INSERT. The post-F53 role-permission policy matches the original database exactly. No additional role authority was granted.

All four fixture actors were retained unchanged; no synthetic login needed renaming or disabling. Their immutable payroll, approval and audit references were not remapped. No `INSERT IGNORE`, REPLACE, cascading deletion or arbitrary UUID substitution was used. Ten destination-only local-operator transfer audit events explain the transition. Original active sessions, reset tokens, rate limits and unrelated audit/business rows were not transferred.

[Conflict/foreign-key plan](../../output/5173-synthetic-primary-20261024/account-plan.json), [exact transfer comparison](../../output/5173-synthetic-primary-20261024/account-transfer.json). These records expose no password hashes or session tokens. Hash equivalence proves credential preservation, while interactive original-password acceptance remains separately recorded below. An account that had no configured password remains unconfigured; no password was invented or reset.

## Synthetic cohort and financial readiness

| Result | PAY-001 | PAY-002 |
|---|---:|---:|
| Distinct imported/published scholars | **800** | **200** |
| Current scoped prior-reviewed members | **800** | **200** |
| Frozen members / allocations | **800 / 800** | **200 / 200** |
| Payroll state | **Processed** | **Processed** |
| Approved total | **PHP 4,000,000** | **PHP 1,000,000** |
| Pending | **800** | **200** |
| Paid / Unclaimed / Needs review | **0 / 0 / 0** | **0 / 0 / 0** |
| Payment Recording `canRecord` | **true** | **true** |
| Full current-source read-only preview | **800 accepted, zero conflicts** | **200 accepted, zero conflicts** |

There are exactly **1,000 scholars, unique permanent IDs, distinct entitled people, entitlements and allocations**, at **PHP 5,000 each**, with **zero payment records and zero individual transactions**. Both batches use the copied **TWO-BATCH-YEAR / TWO-FIRST** context and one canonical cycle. Two confirmed imports, two valid publication records, their exact original/frozen memberships, 1,000 scoped prior-review memberships, and historical windows/cutoffs remain unchanged.

| Year level | Batch 1 | Batch 2 | Total |
|---|---:|---:|---:|
| I | 200 | 50 | 250 |
| II | 200 | 50 | 250 |
| III | 200 | 50 | 250 |
| IV | 160 | 40 | 200 |
| V | 40 | 10 | 50 |

Annual intake facts remain **250 New / 750 Continuing**. All 50 fifth-year examples retain their declared five-year fictional program sources. The copied variety includes five fictional schools, varied programs, 95 truthful Course pending cases and unknown optional personal details. Existing entrant grading-card alternatives remain distinct from college COG; no grades, historical receipts or approval dates were fabricated during this transition. These copied source facts retain the evidence described in the [historical implementation report](LDSS_HISTORICAL_MULTI_BATCH_IMPLEMENTATION_REPORT.md); the transition did not introduce a duration or graduation feature.

Fresh summaries and complete read-only payment previews revalidated the new database through current authorization/eligibility services. No preview was committed. [Verification](../../output/5173-synthetic-primary-20261024/verification.json).

## Local feature activation and financial verification

The synthetic profile alone supplies `true` for **INDIVIDUAL_PAYMENTS_ENABLED, OMITTED_PAYMENTS_ENABLED, INDIVIDUAL_DOCUMENTS_ENABLED, INDIVIDUAL_SETTLEMENT_ENABLED and HISTORICAL_MULTIBATCH_ENABLED**. `.env` and the original profile retain the reviewed default-off configuration. No production gate was removed.

Fresh authenticated checks in the copied database returned all four Individual Payments/omission/document/settlement availability values enabled. Unclaimed, omitted and cheque-payment queues returned zero, as expected for the untouched all-Pending cohort. The fixture-only pre-switch authentication created a new destination session; it was not a copied source session or proof of an original user's password.

Actual request/DV, omitted OR+DV, generation/download, forwarding, cancellation/replacement, personal/representative settlement, corrections, duplicate/exclusive routes, retry/race/audit rollback and report behavior passed in **owned disposable schemas** before activation. No Paid/Unclaimed outcome or individual request was added to the retained primary for demonstration. OR/DV files remain drafts; existing claimability and restricted-date rules remain unchanged.

## Browser acceptance — Staff and Coordinator passed

The user signed into the actual visible 5173 browser with the original Staff account/password. Its authenticated user ID matches the transferred original Staff identity, its role is Staff and `scholars.intakes.correct` is absent. No password was supplied to automation.

- Add Scholar shows the synthetic working year, initially unselected required New/Continuing, required source/reference and optional blank school/course/year level. Both classifications were selectable; the draft was cancelled. Actual nullable registration/reuse/supplement/correction saves passed in disposable integration tests, preserving the primary's exact 1,000-person baseline.
- Registry displays **1,000 records**, including through explicit working-year annual association. Original import/row/classification and bounded history are visible; the Staff correction control is absent.
- Masterlists displays **800 and 200**, both published. Both processed payrolls load Payment Recording with a single primary title, compact context, **800/200 Pending**, correct totals and all three Refresh controls.
- Cross-page selection retained two scholars in review; searching a selected ID kept it checked. Back returned to the batch list. Native Tab/Shift+Tab produced Back's **3-pixel** focus outline at all three widths. No payment preview/confirmation/outcome action was submitted in the browser.
- Enabled Unclaimed, Omitted and Cheque Payments views load their correct empty states. Masterlist and individual views were captured at 1440/820; registration and both recording views at **1440/1024/820 × 900 CSS pixels**. Captures use the main/registration regions, excluding the real account banner.

| Width | Summary top | Roster top, both batches |
|---|---:|---:|
| 1440 | 552 px | 955 px |
| 1024 | 596 px | 1,053 px |
| 820 | 666 px | 1,124 px |

Positions are document coordinates and match the accepted B3a composition. The roster still requires scrolling in a 900-pixel-high viewport; narrow table wrapping remains.

Screenshots: registration [1440](../../output/playwright/5173-synthetic-primary/staff-registration-1440.png), [1024](../../output/playwright/5173-synthetic-primary/staff-registration-1024.png), [820](../../output/playwright/5173-synthetic-primary/staff-registration-820.png); PAY-001 [1440](../../output/playwright/5173-synthetic-primary/PAY-001-1440.png), [1024](../../output/playwright/5173-synthetic-primary/PAY-001-1024.png), [820](../../output/playwright/5173-synthetic-primary/PAY-001-820.png); PAY-002 [1440](../../output/playwright/5173-synthetic-primary/PAY-002-1440.png), [1024](../../output/playwright/5173-synthetic-primary/PAY-002-1024.png), [820](../../output/playwright/5173-synthetic-primary/PAY-002-820.png); [Registry](../../output/playwright/5173-synthetic-primary/staff-registry-1000.png), [history](../../output/playwright/5173-synthetic-primary/staff-history.png), [published lists](../../output/playwright/5173-synthetic-primary/masterlists-1440.png), [Unclaimed](../../output/playwright/5173-synthetic-primary/unclaimed-1440.png), [Omitted](../../output/playwright/5173-synthetic-primary/omitted-1440.png), [Cheques](../../output/playwright/5173-synthetic-primary/cheques-1440.png).

[Staff registration/history evidence](../../output/5173-synthetic-primary-20261024/staff-browser.log), [Recording/focus/selection evidence](../../output/5173-synthetic-primary-20261024/recording-browser.log), [Individual/Masterlist evidence](../../output/5173-synthetic-primary-20261024/individual-browser.log).

After Staff signed out through the normal UI, the user signed into the same browser with the original Coordinator account/password. Its authenticated ID matches the transferred original Coordinator identity and its current permissions include `scholars.intakes.correct`. The Coordinator saw the 1,000-record Registry, original import/classification history and the correction control that Staff could not access. Source/reference and reason are required; the required review acknowledgment starts unchecked. Established academic, membership and entitlement context remains disclosed separately. Native Tab moves from the source field to the reason field. No correction was submitted. The browser remains signed in on Home at 1440 × 900.

Coordinator screenshots: [1440](../../output/playwright/5173-synthetic-primary/coordinator-history-1440.png), [1024](../../output/playwright/5173-synthetic-primary/coordinator-history-1024.png), [820](../../output/playwright/5173-synthetic-primary/coordinator-history-820.png); [role/control evidence](../../output/5173-synthetic-primary-20261024/coordinator-browser.log). Only these two existing accounts were interactively signed in; all ten transferred accounts and role rows were compared exactly, without reading or resetting plaintext passwords.

## Tests

| Check | Final observed result |
|---|---|
| `npm run lint` | Exit 0, no errors/warnings |
| `npm run typecheck` | Exit 0, all configured projects |
| `npm run build` | Exit 0, complete normal command; existing Vite chunk-size warning remains |
| `npm test` | **100 files, 639 tests passed** |
| `npm run check:secrets` | Exit 0 |
| Annual intake DB driver | DA01–DA13, populated 62→63 upgrade/recovery, nullable registration, reuse, supplement/correction, source/history, concurrency/retry/rollback and privileges passed |
| Authentication / RBAC DB drivers | **15 / 10 scenario groups passed**, including **172** role/permission decisions |
| Scholar / academic / continuing / Masterlist drivers | **17 / 9 / 8 / 11 scenario groups passed** |
| Historical import driver | **13 groups passed**, including mixed classes, prior review, Course pending, publication, fresh sources and genuine same-import omission routing |
| Recording/reconciliation/report/Registry driver | Passed complete source/role/transaction/retry, immutable Original/current evidence, Registry parity and API/XLSX/PDF checks |
| Unclaimed document driver | Passed DV-only workflow, drafts/download/history, current-source/retry/cancellation and populated document recovery |
| Omitted document driver | Passed authorized OR+DV, later-payroll routing, preparation controls and source preservation |
| Unclaimed / omitted settlement drivers | Passed release/forwarding, required attestations, personal/representative and bulk boundaries, corrections, unique routes, reports and recovery |
| Settlement race driver | Passed original-payroll Paid correction versus cheque-release race; one effective Paid claim and unchanged original/frozen evidence |
| Copied independent 800/200 fixture | Both exact rosters and full current-source previews passed after F53/account transfer; relevant historical ownership/date/permission unit suites also passed |

[Package command results](../../output/5173-synthetic-primary-20261024/package-checks.json), [regression commands/exits](../../output/5173-synthetic-primary-20261024/regressions.json), [activation compatibility gate](../../output/5173-synthetic-primary-20261024/compatibility.json). Drivers created/removed only their owned disposable schemas. Financial artifacts were isolated; P06/P07 recovery outputs use new task-specific subdirectories allowed by their existing path guards. Existing reports were not overwritten.

One initial RBAC run correctly found that its expected Coordinator matrix omitted the already-approved F53 permission. The test expectation was updated by one line; application policy/grants were not weakened. The failed run remains in the ledger with a successful rerun. A new read-only probe initially used `benefit_code`; it was corrected to the actual `benefit_type` schema field. The startup guard also caught a new metadata digest representation mismatch: `.env` bytes matched the independent starting checkpoint, and only the proof's Buffer-JSON digest was corrected to a raw-byte SHA-256. No database data or environment value was repaired.

## Files, preservation and startup/revert

Repository changes are limited to new [API profile](../../scripts/localhost-5173-api.ts), new [profile controller](../../scripts/localhost-5173-profile.mjs), the one-line [RBAC expectation](../../scripts/test-rbac-db.ts), and this report. Task ownership, copy/upgrade/account verification, encrypted recovery, regression and preservation artifacts are under `output/5173-synthetic-primary-20261024/`. No financial/application UI service, migration, dependency or `.env` implementation was changed. B3a/A1+A5 and P01–P10/R01–R07 are reused.

The normal build's current client was retained in this task's `built-client`; original static client inputs were restored for the unchanged older-schema retained servers. Main 5173 uses current Vite source.

The final comparison after both role checks passed: **all original database table values/counts/definitions and all retained reference data matched their starting snapshots**, including original accounts/passwords/audit/authentication. New synthetic business/source rows also matched preparation exactly, including both frozen payrolls, all 1,000 Pending entitlements/allocations and zero payment records. All **10,349** source synthetic audit rows remained exact. Ten destination account-transfer audits were recorded during preparation; afterward, **four** new authentication audit rows explain the fixture precheck login, user Staff login/logout and user Coordinator login (**10,359 → 10,363** total audit rows). New sessions/rate limits reflect this authentication activity. Runtime cross-schema access and protected DELETE operations were denied. [Final preservation evidence](../../output/5173-synthetic-primary-20261024/final-preservation.json).

All **16 other retained schemas** matched their starting full inventories and existing grants, including 3011/3012, A–F, V1/V2 and earlier annual/upgrade fixtures. [Comparison](../../output/5173-synthetic-primary-20261024/preservation-after.json). Of **1,138 checkpointed existing inputs**, **1,137 matched**, with only the declared one-line RBAC expectation changed and no missing input. The checkpoint was taken after adding the two new profile launchers; they are declared additions. Application/UI/financial source, configuration, old migrations and restored static build inputs remain exact. [File verification](../../output/5173-synthetic-primary-20261024/files-final.json).

From the workspace, start or switch to the synthetic primary:

```powershell
node scripts/localhost-5173-profile.mjs synthetic
```

Return the same 5173 frontend/API to the preserved original database:

```powershell
node scripts/localhost-5173-profile.mjs original
```

The controller stops only its recorded, verified process tree, checks both loopback ports and starts the selected source profile. It rejects unrelated occupied ports and changed identities/configuration. The two profiles use distinct restricted database accounts and cannot bind the same API port simultaneously. The original profile was launched and its readiness verified before the automatic replacement with synthetic. No database restore/delete is involved in a profile switch. The browser must sign in again when changing databases; sessions are not transferred.

To recheck an archive using a **new isolated temporary restore**, without overwriting either database:

```powershell
node output/5173-synthetic-primary-20261024/recover.mjs original
node output/5173-synthetic-primary-20261024/recover.mjs prepared
```

Keep the restricted archive/key directory together for recovery. These commands validate archive hashes, use the existing authenticated restore tooling, verify constraints and remove the temporary copy. Replacing a damaged live database or disposing of a retained schema is a separate reviewed operation; no stale backup should overwrite later valid activity.

## Remaining issues and stop boundary

An annual-history request with an empty `academicYearId` was observed while leaving an unfiltered profile; the API correctly rejected it with **422**. The selected-year history read completed correctly. This existing UI read issue was documented, not fixed by weakening validation or broadening the transition scope. The initial signed-out `/auth/me` **401** is expected. One Coordinator login attempt had a browser `ERR_NO_BUFFER_SPACE`; the subsequent login returned 200 and the original Coordinator identity/role was verified. An initial Coordinator script changed filters during loading and timed out; reload restored the Registry, and the corrected script awaited its loaded state before interacting. These are recorded qualifications, not a claim of error-free browser operation or UI remediation.

Existing official-form, claiming/late-release, overlapping historical-window, operational recovery/security and build chunk-size qualifications retain their own scope. No A2/A4/A6/B1/B2 implementation, policy change, LAN activation/deployment or P11 was started. Automated mutation acceptance used disposable schemas; browser registration/correction drafts on this primary were cancelled or left unsaved to retain exactly 1,000 scholars.

**Stopped after the completed synthetic transition, verification and this report.** Staff and Coordinator original-password checks and final preservation passed. The synthetic profile remains running at 5173 with both payrolls Pending and Payment Recording available; the original database is preserved and recoverable. No primary payment outcome was recorded, no LAN deployment occurred and no further enhancement batch was started.
