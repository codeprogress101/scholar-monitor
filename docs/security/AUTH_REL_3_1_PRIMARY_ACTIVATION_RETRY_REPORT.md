# AUTH-REL-3.1 — Recovery-client correction and primary activation

28 October 2026, Philippine time. **Activated the unchanged, reviewed AUTH-REL-3 P1/M1 release on primary synthetic [localhost:5173](http://127.0.0.1:5173/). Fresh complete isolated recovery passed before primary maintenance. Both-role authentication, business reads, logout/revocation and preservation passed. All 800 Paid records and dates remain exact.** No primary business command, migration, MariaDB/XAMPP upgrade or operational LAN change occurred. LAN-R2A remains paused.

This completes the separately authorized retry of [AUTH-REL-3](AUTH_REL_3_PRIMARY_SECURITY_ACTIVATION_REPORT.md), using [AUTH-REL-2](AUTH_REL_2_SESSION_BOUND_AUTHENTICATION_REPORT.md) and the reviewed [DB-COMPAT-2 operator tooling](../database/DB_COMPAT_2_MIGRATION_OPERATOR_READINESS_REPORT.md). Earlier blocked activation evidence remains historical and was not rewritten. The new [final acceptance](../../output/auth-rel-3-1-20261028/FINAL_ACCEPTANCE.json) records successful activation and post-activation acceptance.

## Fresh primary and activated runtime

| Item | Verified starting → final state |
|---|---|
| Host / database server | **DESKTOP-BPLJKRP / 127.0.0.1:3306 / MariaDB 10.4.32**, unchanged |
| Database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`**, unchanged |
| Schema | **150 tables / 67 migrations**, original SQL hashes and timestamps exact; **F58 absent** |
| Dedicated release | `sec3-20261028` → **`authrel3-20261028`**, under `C:/Users/ADMIN/.ldss/primary-runtime/releases/` |
| Controller / API / frontend PIDs | Freshly verified **4880 / 49352 / 63228 → 56248 / 24928 / 28900** |
| Final profile / ports | **`synthetic-isolated-authrel3` / loopback 5173 and 3001** |
| PAY-001 | **Processed / v805 / 800 Paid**, unchanged |
| PAY-002 | **Processed / v5 / 200 Pending**, unchanged |
| PAY-003 | **Draft / v4 / 834 included / 1 deferred / 1,000 blocked / 0 awaiting review**, unchanged |
| Official Batch 1 | **Published / v415 / 835 active members / 167 retained removals**, unchanged |

PAY-003 retains 834 saved proposed entries, no frozen roster, allocations or payments, and its original 27 October **whole-day** cutoff. PAY-001/PAY-002 windows, the recorded 31 October semester deadline/revision 3, and existing synthetic F57 configuration remain exact. No new office-policy authority is inferred. Fresh inspection found no intervening business delta requiring an exception to preservation. [Starting inspection](../../output/auth-rel-3-1-20261028/inspection.json), [current source assessment](../../output/auth-rel-3-1-20261028/current-state.json), [final delivery](../../output/auth-rel-3-1-20261028/delivery.json).

## Confirmed client-binding defect and correction

The previous runner selected `C:/xampp/mysql/bin/mysql.exe` for restoration of a **`binary-result-file/v1`** archive. That transport requires the reviewed MariaDB 11.4.13 client; the accepted version guard correctly rejected the legacy client. The defect was the runner binding, not a demonstrated primary schema defect or a requirement to upgrade the server.

The retry explicitly binds **both `binaryMysqlTool` and `mysqlTool`** to:

`C:/Users/ADMIN/.ldss/db-compat-2-20261028/vendor/mariadb-11.4.13-winx64/bin/mariadb.exe`

| Client verification | Result |
|---|---|
| Executable version | **11.4.13-MariaDB, client 15.2, Win64 AMD64** |
| SHA-256 | `db4bde74fc1e7a8e644bc3eda7128515d12f3b3c31c86932784f1cbbfba2dd3d` |
| Owner | **`DESKTOP-BPLJKRP\ADMIN`** |
| Approved directory | **66 bin files rehashed** against the retained vendor manifest |
| Path and transport | Approved physical path; no symlink/junction; binary transport asserted; **no legacy-client fallback** |

No executable was downloaded, replaced or reinstalled. Backup format, version guard, finite bounds and key custody remain unchanged. **A newer restore client is not a database-server upgrade:** both primary and the owned recovery server remained 10.4.32. [Client verification](../../output/auth-rel-3-1-20261028/client-verification.json).

## Complete fresh recovery before stopping primary

BACKUP-1 captured **99,330,824 SQL bytes / 22,629,949 encrypted bytes**, archive SHA-256 **`38330938305a4a75fa2accc58af245850fe31d0f9d5a4d8dcf1a6b1c5cbafba2`**. The verified client completely restored it into a newly owned isolated MariaDB 10.4.32 target on port 3338, while the original primary application remained running.

Acceptance covered all **150 tables' values/counts/checksums**, all **67 journal records**, columns/indexes, foreign keys/checks, trigger definitions, view definitions/execution, and unique/FK/CHECK rejection probes. Native restoration took **10.22 seconds**, excluding capture and the surrounding verification work. Primary runtime grants were independently compared before/after; this does not claim that primary accounts/grants were cloned into the scoped restore target.

The restoration library removed its owned target and definer account. Independent checks confirmed **zero remaining owned application schemas/accounts**. Full 150-table freshness comparisons passed again before maintenance and with primary ports quiet. Nothing was restored over primary. Source-schema READ locks briefly serialize writes during capture; no server-wide read lock or backup-bound increase was introduced. Archives, keys and detailed recovery data remain restricted. [Recovery proof](../../output/auth-rel-3-1-20261028/recovery.json), [before-maintenance preservation](../../output/auth-rel-3-1-20261028/before-preservation.json), [quiet-state preservation](../../output/auth-rel-3-1-20261028/quiet-preservation.json).

One evidence collector failed **after successful native restoration and cleanup**, because it expected a nonexistent `inventory` property in the returned report. The collector was corrected to read the actual `tables` report and independently verify archive binding, table inventory, advertised checks and cleanup. Restoration was not repeated, and no recovery assertion was weakened. The original collector error remains in the task log; primary was not stopped until the completed restoration proof had been independently accepted.

## Exact candidate and evidence reuse

The **21,258-file** AUTH-REL-3 candidate was freshly rehashed before activation and afterward. Its file list and hashes match the reviewed inactive candidate. It retains the accepted SEC-3 dependency graph, own Node/runtime dependencies, P1/M1 implementation, DB-REL-1 prior-approval optimization, compiled backend and unchanged frontend. Private primary configuration is unchanged. Only manifest activation metadata changed: `mode`, `primaryActivationAllowed` and `environmentHash`.

Relative to SEC-3, the reviewed candidate contains eight changed and two new production server modules; 284 other server source files, 148 frontend source files and 18 built client files remain exact. These are **previously accepted release differences**, not new application edits in this retry. [Candidate verification](../../output/auth-rel-3-1-20261028/candidate-integrity.json), [active integrity](../../output/auth-rel-3-1-20261028/active-runtime-integrity.json), [activation metadata](../../output/auth-rel-3-1-20261028/runtime-manifest-primary.json).

| Evidence | Treatment in this task |
|---|---|
| Accepted lint/typecheck/build/secrets, **140 files / 970 tests**, **18/18 regression suites**, dependency/security acceptance | Reused; unchanged application/package/build identities freshly verified |
| P1/M1 security races, 25/835-person concurrency, rollback, source/frozen-output parity, 835-person prior-approval concurrency | Reused accepted isolated evidence |
| Browser authentication during large finalization, lost-response reauthentication/exact retry and expiry | Reused accepted evidence; focused real-primary browser checks added |
| Client identity, fresh recovery, primary state/grants/payments/audits, runtime ownership and retained environments | Newly executed |
| Primary login, passive identity/permissions, business GET parity and revocation | Newly executed with task-owned sessions |
| Package repair, migration research/rehearsals, full financial workflows and responsive/200% sweeps | Not repeated; no new application/UI change justified them |

The pre-release acceptance remains [AUTH-REL-3's passing record](../../output/auth-rel-3-20261028/PRE_RELEASE_ACCEPTANCE.json). The [change-impact matrix](../../output/auth-rel-3-1-20261028/EVIDENCE_REUSE_AND_CHANGE_IMPACT.md) records this reuse explicitly. No new build or primary financial workflow is claimed.

The retained original 835-person review-error disposition remains qualified: disk-full evidence overlaps its fixture window, but no request-to-database-thread mapping proves causation. Independent later instrumented 835-person acceptance passed. This retry found no new correctness defect and does not claim to have reconstructed or conclusively resolved that original error. [Retained disposition](../../output/auth-rel-3-20261028/retained-error-disposition.json).

## Controlled activation and focused acceptance

After recovery, exact-candidate, ownership, quiescence and freshness gates passed, only the verified SEC-3 controller tree was stopped. Ports 3001/5173 were verified quiet. The dedicated AUTH-REL-3 controller started at **13:06:24.552 Philippine time**, using its own Node, dependencies and unchanged private primary environment. Both direct API and frontend-proxied readiness returned **200**. Retained services were not restarted. [Maintenance](../../output/auth-rel-3-1-20261028/maintenance.json), [loaded-module proof](../../output/auth-rel-3-1-20261028/active-module-proof.json).

Actual loaded paths prove P1/M1 is active, rather than the SEC-3 fallback: compiled request context, authentication service, authorization service/access rows, database adapter, application, readiness and optimized prior-approval reader all resolve inside the AUTH-REL-3 release. All **1,323 API / 39 web loaded paths** remain inside that release.

Staff and Coordinator authenticated successfully with their current permissions. Eight passive identity/permission GETs returned **200** and preserved the exact tested session tuple, including last-seen state. Observed calls took about **4.5–33.1 ms**; actual browser account checks took **8.7 / 8.4 ms**. These small local samples are not a load or latency guarantee; the existing 15-second browser deadline was unchanged. [Passive checks](../../output/auth-rel-3-1-20261028/primary-passive.json), [browser checks](../../output/auth-rel-3-1-20261028/primary-browser.json).

Both roles' actual GETs matched the fresh pre-activation source oracle and accepted financial evidence: PAY-003's first 25 fingerprints and complete 1,835-person scope hash, both payroll summaries, Registry context, Published/v415/835-member Masterlist and one deferred scholar with **payable=false**. No roster, approval, export or financial command was submitted. Browser business-write guards recorded **zero attempts**. Both task logouts returned **204**; original saved cookies subsequently returned **401** for identity and permissions, proving server-side revocation. The user's separate sessions were untouched. [HTTP parity](../../output/auth-rel-3-1-20261028/http-post.json), [revocation](../../output/auth-rel-3-1-20261028/revocation.json).

## Preservation, exact changes and fallback

Final complete comparison preserves all starting business values/counts, schema/journal, accounts/passwords/roles, runtime grants, original command ledgers, approvals/documents/sources, Masterlists, draft/deferral evidence, frozen financial evidence and payments. All **800 Paid records** remain exact: **two dated 2026-10-24 / 798 dated 2026-10-26**. All **20,306 original audit rows** remain exact at full datetime precision. Only two task logins and two logouts were appended: **20,310 audits / sessions 132→134**, with ordinary session/rate-limit activity. This is qualified authentication activity, not zero database writes. [Final preservation](../../output/auth-rel-3-1-20261028/final-preservation.json).

All **1,409 protected existing workspace inputs**, including **310 retained distribution files**, remain exact. Fresh comparisons preserve **15,438 retained files / 20,094 shared files**, dependency junction targets, original retained listener owners, **76 paused LAN-R2A artifacts** and **16 earlier ML-1 evidence files**. The immutable SEC-3 fallback's **21,394 files** and private configuration also remain exact. This is not an exhaustive new inventory of every retained database. [Retained inventory](../../output/auth-rel-3-1-20261028/retained-final.json), [fallback integrity](../../output/auth-rel-3-1-20261028/fallback-runtime-integrity.json).

**Existing repository application/test/configuration files changed: none.** Deliverables are this report and task-local drivers/evidence under `output/auth-rel-3-1-20261028/`. The added driver files are:

`inspect.mjs`, `prepare-verify.mjs`, `client-verify.mjs`, `runtime-start.mjs`, `recovery-gate.mjs`, `collect-recovery.mjs`, `preserve.mjs`, `authorize-manifest.mjs`, `activate.mjs`, `start-runtime.mjs`, `current-primary.mjs`, `primary-module-proof.mjs`, `primary-http.mjs`, `primary-passive.mjs`, `primary-browser.mjs`, `primary-logout.mjs`, `final-runtime-proof.mjs`, `retained-inventory.mjs`, `active-runtime-verify.mjs`, `cleanup-final.mjs` and `complete-delivery.mjs`.

Outside the repository, the candidate's existing `runtime-manifest.json` received only the three activation metadata changes described above; normal task-owned runtime state/logs were created. The runner correction is explicit client selection and recovery-before-maintenance sequencing. No new application patch, dependency installation, schema SQL or financial writer was introduced.

**Fallback was not needed.** The prepared application-only path verifies the immutable SEC-3 release/configuration, current controller ownership and command quiescence; stops only the verified active primary tree; checks quiet ports; launches SEC-3 through its dedicated controller; then checks readiness and current business preservation. Any future use requires fresh ownership/source/data checks. Never restore this checkpoint over later legitimate records or downgrade/delete history.

Owned recovery schemas/accounts were removed and the verified task-owned port-3338 server was stopped. Its private initialized datadir/logs remain restricted; no Windows service was installed. Temporary listener checks passed. [Cleanup](../../output/auth-rel-3-1-20261028/cleanup.json), [final delivery](../../output/auth-rel-3-1-20261028/delivery.json).

## Remaining limits and stop

The accepted finite connection pools/queues and financial serialization remain; these focused reads do not certify office concurrency, power-loss/off-host recovery or a latency SLA. The unchanged frontend's responsive/200% evidence was reused. No policy approval or financial release authority follows from authentication acceptance.

The smallest next task is separately authorized operator/office acceptance of the active authentication release. MariaDB 11.4 migration, F58, complete LAN packaging/recovery and LAN activation remain separate approvals and tasks. **No MariaDB/XAMPP upgrade, F58 application, role/grant/policy change or LAN-R2A resumption occurred.**

Report verification confirmed all **28 local link targets** exist. The dependency-free secrets check passed for **1,443 source/build files**. No build or expensive regression suite was rerun for the report.

**Stopped after controlled primary AUTH-REL-3 activation, focused acceptance, preservation, cleanup and reporting. No primary business record or operational LAN installation was changed.**
