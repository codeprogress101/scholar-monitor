# AUTH-REL-3 — Security review and controlled primary activation

28 October 2026, Philippine time. **Independent review and isolated acceptance passed. Primary activation is BLOCKED: the mandatory quiet recovery gate rejected the activation runner's restore-client binding. The AUTH-REL-3 application never started on primary. The verified, immutable SEC-3 application-only fallback is running on localhost 3001/5173.** No primary database restoration, migration, authentication action or business command occurred. LAN-R2A remains paused.

The runner supplied `C:/xampp/mysql/bin/mysql.exe` to a newly captured `binary-result-file/v1` archive. The accepted DB-COMPAT-2 transport requires the reviewed **MariaDB 11.4.13 client**, even when restoring into a **10.4.32 server**. Its version check rejected the runner before target creation or import. This was a task-runner configuration error; it does not demonstrate a defective authentication candidate or corrupt backup. **The user's mandatory stop condition was honored; no corrected-client activation retry was attempted.** [Blocked gate](../../output/auth-rel-3-20261028/PRIMARY_ACTIVATION_GATE.json), [failure](../../output/auth-rel-3-20261028/maintenance-failure.json), [fallback](../../output/auth-rel-3-20261028/fallback.json).

## Current primary and preservation

| Item | Fresh initial → final result |
|---|---|
| Host / database server | **DESKTOP-BPLJKRP / 127.0.0.1:3306 / MariaDB 10.4.32**, unchanged |
| Database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`**, unchanged |
| Active release | **`C:/Users/ADMIN/.ldss/primary-runtime/releases/sec3-20261028`**, retained |
| Primary controller / API / Vite | **65812 / 62376 / 31768 → 4880 / 49352 / 63228**, verified SEC-3 fallback |
| Readiness | API and frontend-proxied **`/api/v1/ready` = 200** |
| Schema | **150 tables / 67 migrations**; F57 installed, **F58 not applied**; original checksums/timestamps exact |
| PAY-001 | **Processed / v805 / 800 Paid**, unchanged |
| PAY-002 | **Processed / v5 / 200 Pending**, unchanged |
| PAY-003 | **Draft / v4 / 834 included / one deferred / 1,000 blocked / zero awaiting review**, unchanged |
| Official Batch 1 | **Published / v415 / 835 active members / 167 retained removals**, unchanged |
| Dates/policy | Existing PAY-001/002/003 **whole-day** cutoffs and **31 October final deadline / revision 3**, unchanged |

Fresh inventory matched the accepted checkpoint; no intervening user business or authentication activity was found. Final complete comparison preserves **every table value/count**, schema object, migration, application account/password/role, runtime grant, approval/document source, Masterlist, deferral, command ledger, entitlement, allocation, frozen payroll, correction and reconciliation record. All **800 Paid records** remain exact: **two dated 2026-10-24 and 798 dated 2026-10-26**. All **20,306 audits** and **132 sessions** remain exact. There were **no primary task logins, exports or business commands**.

All **1,408 protected workspace inputs**, including **310 retained distribution files**, remain exact. The **21,394 immutable SEC-3 runtime files**, **15,438 retained inputs**, **20,094 shared dependency files**, dependency junction targets, retained/LAN listener owners, **76 paused LAN-R2A artifacts** and **16 earlier ML-1 investigation files** remain exact. Only the verified primary process tree was stopped; the fallback changes its PIDs and mutable launcher state, not its application/dependency files. This is not an exhaustive new inventory of operational or retained databases. [Initial inspection](../../output/auth-rel-3-20261028/inspection.json), [current roster read](../../output/auth-rel-3-20261028/current-state.json), [full preservation](../../output/auth-rel-3-20261028/final-preservation.json), [SEC-3 integrity](../../output/auth-rel-3-20261028/active-runtime-integrity.json), [retained integrity](../../output/auth-rel-3-20261028/retained-final.json), [final delivery](../../output/auth-rel-3-20261028/delivery.json).

## Independent P1/M1 review

The exact [AUTH-REL-2 ten-file candidate](AUTH_REL_2_SESSION_BOUND_AUTHENTICATION_REPORT.md) and its [consistency contract](../../output/auth-rel-2-20261028/IMPLEMENTED_CONSISTENCY_CONTRACT.md) were reviewed against the actual source, not applied incrementally to SEC-3.

**P1:** Only the exact passive identity/permissions GET routes use the independent pool. Each reads a fresh UTC, REPEATABLE READ, READ ONLY account/session/role/permission snapshot. Backend time is checked after assembly before return. There are no dirty reads, last-seen touches or cross-request permission caches. The passive pool is bounded at **two connections / 16 queued requests**; the business pool stays **four / 100**. Both pools close through the existing lifecycle. Failure supplies no fallback authority.

**M1:** HTTP service construction captures fail-closed mode. Every request initializes its own scope; only authoritative server authentication admits the immutable actor/token-hash/account-version/idle-limit principal. Guarded authorization retains **configuration → account → session** locking, current owner/revocation/expiry/version checks, fresh roles/permissions and a second backend-time expiry check. Missing/lost scope fails before the business callback or protected ledger replay. Default/nested constructors and parent-transaction adapters were traced; separately constructed trusted local/operator services retain their existing boundary without a web bypass.

Ordering remains explicit: security committed before authorization denies the command; a transaction authorized first may finish before a later security writer. P1 may return its coherent earlier snapshot when a security change overlaps it; the following request observes the committed change. Logout does not retroactively cancel an already authorized financial transaction. Exact retry still requires current authority.

Independent AST inspection reproduced **195 guarded calls across 65 files**. **19 unaffected authentication/authorization methods** and financial business writers remain exact. No source/security correctness blocker was identified. This is a bounded review and acceptance result, not a formal proof. [Review notes](../../output/auth-rel-3-20261028/INDEPENDENT_SECURITY_REVIEW.md), [entry-point inventory](../../output/auth-rel-3-20261028/guarded-entrypoints.json), [source/method checks](../../output/auth-rel-3-20261028/source-preservation.json).

## Retained initial 835-review error

The original uninstrumented AUTH-REL-2 submit-review returned HTTP 500, request `cb06e438-7ded-4a48-a635-879b6fee80c2`, before finalization. Its SQL exception/connection mapping was not retained and that fixture was removed.

New inspection found a relevant original database-console event at **11:02:14 Philippine time**: thread 140 reported **Disk full / errno 28** for a C: temporary Aria table and waited for space. The failed fixture was created at **11:00:48**; the subsequent accepted fixture at **11:04:09**. The event is correlated with the failed run, but **no retained mapping proves that this request used thread 140**. The original request's exact cause therefore remains qualified; a later pass alone is not its explanation.

New first-request error instrumentation, full source/frozen parity, rollback tests and the supported 835-person run found **zero SQL exceptions** in that profile and no disk-full event in the new owned runtime. Six browser probes were independently mapped to intervals after real financial session-lock acquisition and before transaction completion. A task-only resource observer retained a **4 GiB stop reserve**; sampled free space stayed at least **30,478,577,664 bytes**, with sampled SQL temporary files up to **26,616 bytes**. Sampling is not a peak/capacity bound; disk exhaustion was not induced.

The original uncertainty is an availability/recovery risk, not demonstrated source corruption or unauthorized payment. The independent acceptance supports the candidate's isolated release-risk disposition; it does **not** override the separate failed recovery gate. [Investigation](../../output/auth-rel-3-20261028/RETAINED_ERROR_INVESTIGATION.md), [disposition and console hash](../../output/auth-rel-3-20261028/retained-error-disposition.json), [resource observations](../../output/auth-rel-3-20261028/resource-monitor.json).

## Complete candidate and exact source boundary

The complete candidate remains outside webroot at:

**`C:/Users/ADMIN/.ldss/primary-runtime/releases/authrel3-20261028`**

It uses the actual dirty workspace, the reviewed DB-COMPAT-2 operator/readiness package, DB-REL-1 prior-approval reader, exact AUTH-REL-2 P1/M1 package, and SEC-3's own Node, repaired package/lock and physical dependency tree. No Git HEAD, old distribution, shared dependency replacement or primary migration was substituted. The primary environment is an exact private copy of effective SEC-3 configuration, outside the release.

Relative to immutable SEC-3, the only production server source differences are:

| Files | Accepted purpose |
|---|---|
| `server/app.ts`; `server/auth/service.ts`, `routes.ts`; `server/authorization/service.ts`, `routes.ts` | AUTH-REL-2 request admission, P1 and M1 |
| `server/database.ts` | Accepted connection compatibility and bounded passive pool |
| `server/schema-readiness.ts` | Reviewed schema compatibility; current 67-migration configuration supported |
| `server/requirements/prior-approval-service.ts` | Accepted DB-REL-1 read optimization |
| New `server/auth/request-context.ts`; `server/authorization/access-rows.ts` | Server-owned request principal and existing access-row projection |

Thus **eight existing / two new production server files**, with **284 other server files exact**. The AUTH-REL-2 two new unit files are retained. The reviewed DB-COMPAT-2 70-file manifest supplies compatible operator/test tooling; overlapping overlays are not counted as distinct new changes. SEC-3's four launcher files are carried, with only the controller's profile identifier changed to `synthetic-isolated-authrel3`. Temporary test/bootstrap adapters were retained outside the final release; provision tooling matches accepted DB-COMPAT-2 and intake preflight matches the starting workspace.

All **148 frontend files**, all schema-source files and the complete production server source match the accepted AUTH-REL-2 application. All **18 client build files** remain byte-identical to SEC-3. Compiled server JavaScript is **280 unchanged / eight changed / two added = 290**. Required NotoSans report assets/license and the renderer-derived template fingerprint are included. Financial renderers/writers, permissions, policies, flags and primary configuration are unchanged.

The final manifest covers **21,258 files**, with no symlinks/junctions and a dedicated physical dependency tree. **20,073 non-cache dependency files** match the accepted tree. Known Vite/Vitest development caches are excluded from immutable comparisons. Full and production npm audits and `npm ls --all` exit **0**; the SEC-3 package/lock hashes remain exact. This does not claim the preserved shared/root graph is security-clean.

**The candidate is inactive and its current manifest has `primaryActivationAllowed: false`.** [Composition](../../output/auth-rel-3-20261028/composition.json), [eight/two source inventory](../../output/auth-rel-3-20261028/release-change-inventory.json), [complete parity](../../output/auth-rel-3-20261028/complete-runtime-parity.json), [compiled/assets proof](../../output/auth-rel-3-20261028/build-verification.json), [operator boundary](../../output/auth-rel-3-20261028/operator-package-boundary.json), [dependency checks](../../output/auth-rel-3-20261028/security.json), [current manifest descriptor](../../output/auth-rel-3-20261028/runtime-manifest-rehearsal.json).

## Newly executed acceptance and reused evidence

The [evidence-reuse matrix](../../output/auth-rel-3-20261028/EVIDENCE_REUSE_AND_CHANGE_IMPACT.md) preceded execution. Matching AUTH-REL-2 11.4 security/financial evidence, F54/F58 research, completed migration research, SEC-3 package repair and unchanged UI sweeps were reused. No new 11.4 database server or migration rehearsal was run. Shared authorization justified **one complete 18-suite impacted acceptance run**, not repeated full financial runs.

| Newly executed check | Result |
|---|---|
| Lint, typecheck, build, secrets | **All exit 0** on proposed release; final lint/secrets and restored operator-file checks also pass |
| Unit tests, one worker | **140 files / 970 tests passed** |
| Deterministic security | **12 queued/order cases + nine authorization-first cases + four P1 coherence cases**, passed against compiled candidate on owned MariaDB 10.4 |
| Full impacted regressions | **18/18 exit 0**: graduation, auth, RBAC, requirements, 835-person prior approval, Masterlist drafts/workflow/amendments, academic/approved changes, notifications, Registry/main payroll/Treasury, intake/import, historical/omitted payroll, Recording, reconciliation, Individual Settlement and financial reports |
| Representative finalization | **25 and 835**: one 200 / one 409, one frozen payroll, exact winning retry and losing-key rejection; no original payment/activation changes |
| Negative financial cases | Role/source/version denial, queued revocation, deliberately late audit/ledger rollback, passed |
| Deferred restoration/discovery | **Four groups passed**, including Staff denial, Review return, rollback, exact retry and all other source/financial tables exact |
| Dedicated release rehearsal | Actual controller/API/Vite, own module-resolution paths, 67-schema readiness, both-role login/permissions/logout/revoked-cookie rejection, passed on owned copy |

The 835-person prior-approval shared-key test remains in the single full run: concurrent exact requests yield one durable result and changed input rejects. At finalization, allocations are exactly **25 / 835**, respectively; original payments are unchanged. Complete new **25/835 frozen JSON, financial children, review entries/fingerprints and source wrappers** match AUTH-REL-2. For 835, frozen JSON is **6,741,385 bytes**, SHA-256 `da9991d4aa1848720e44ec601b14c032044ff9d44018e0f6a2faac5c52834688`; children are **4,231,438 bytes**, hash `8c27ef097c5eda0cb510a0de47ff912de7591f054b8baa0a3e6cdfbdab84cfb3`. Sources were not rewritten to obtain parity.

[Normal commands](../../output/auth-rel-3-20261028/checks-main.json), [unit log](../../output/auth-rel-3-20261028/unit-final.log), [18 regression results](../../output/auth-rel-3-20261028/regressions-original-extra-latest.json), [queued races](../../output/auth-rel-3-20261028/security-races-3338.json), [authorization-first races](../../output/auth-rel-3-20261028/security-after-authorization-3338.json), [P1 races](../../output/auth-rel-3-20261028/passive-races-3338.json), [25-person negatives](../../output/auth-rel-3-20261028/negative-acceptance.json), [835-person result](../../output/auth-rel-3-20261028/candidate-835.json), [financial parity](../../output/auth-rel-3-20261028/financial-parity.json), [deferred results](../../output/auth-rel-3-20261028/deferred-original.json), [complete rehearsal](../../output/auth-rel-3-20261028/dedicated-rehearsal.json).

## Focused real-browser security and recovery

Installed Chrome and the actual unchanged authentication client passed during 835-person finalization. Coordinator identity requests measured **5.6–7.5 ms**, Staff **4.2–6.2 ms**; all returned **200** during verified financial guard intervals. The browser deadline stays **15 seconds**. These local samples are not a concurrency/load SLA.

The actual React command hook/recovery component passed a deliberately lost response **after a real owned-copy deferral committed**. Repeated Enter made one initial POST; Escape/navigation stayed blocked, focus remained in the dialog, logout returned 204 and the revoked token returned 401. An attempted retry under that token remained uncertain and preserved the command. Fresh authentication then allowed the **identical body/key** to return its durable success: **three exact requests / one deferral / one revision event / one ledger result**, with all 800 payment rows and protected financial tables exact. A separate real-browser expiry probe returned **200 → 401**.

The security-best-practices review and installed ui-ux-pro-max/Playwright workflows were used for the affected recovery acceptance. Frontend/assets are unchanged, so the user-directed reuse of five-width/native-zoom evidence applies; no new full visual/accessibility sweep is claimed. [Browser authentication](../../output/auth-rel-3-20261028/browser-auth-candidate.json), [actual guard overlap](../../output/auth-rel-3-20261028/browser-financial-overlap.json), [lost-response recovery](../../output/auth-rel-3-20261028/browser-recovery.json), [financial preservation around recovery](../../output/auth-rel-3-20261028/browser-recovery-preservation.json), [focused recovery capture](../../output/playwright/auth-rel-3/owned-recovery.png), [expiry](../../output/auth-rel-3-20261028/browser-expiry.json).

## Recovery gate, stop and fallback verification

Before fixture mutations, the prior accepted encrypted checkpoint was freshly hash-checked and matched the current complete 150-table inventory, journal and grants. It contains **99,335,300 SQL bytes / 22,630,406 archive bytes**, SHA-256 `7959682ce259f488da2bae7cfe66ea2fdf1b9aa106c5cd49c4bc142896252152`. **Six new complete owned-copy restorations** passed during this task, including full values/counts/checksums, schema and existing rejection probes. All owned schemas/accounts were removed. [Checkpoint reuse](../../output/auth-rel-3-20261028/checkpoint-reuse.json), [delivery/restore count](../../output/auth-rel-3-20261028/delivery.json).

The fresh quiet capture at **12:41:53 Philippine time** contains **99,330,824 SQL bytes / 22,629,949 encrypted bytes**, SHA-256 `d53228b741a3ea76a77edb52316fd6aa94541029c0bdc92bd8da4c5026a679e1`. Archive authentication, SQL hash and complete inventory parity pass. **Its required isolated restoration did not run:** accepted `restoreBackup` rejected the legacy client version before opening the restore target connection. Distinct dump transports/snapshots are not asserted to have identical SQL bytes. The archive remains restricted and must not be represented as having passed complete restoration. Backup bounds, key custody and source-schema READ-lock semantics were not relaxed. [Fresh capture and failed restore qualification](../../output/auth-rel-3-20261028/activation-checkpoint.json).

Fresh source/business/retained checks, process/listener ownership and three quiescence samples passed before stopping the verified SEC-3 tree. The runner then encountered the native-client gate above and invoked the verified SEC-3 fallback. API/frontend readiness, release path, child ancestry, original module/dependency/configuration identity and current PAY-003 sources were reverified afterward. **New P1/M1 primary post-activation testing is not applicable: that release never started on primary, so its primary responsiveness remains unaccepted.** The old SEC-3 backend remains active, including its previously documented limitations.

The candidate was returned to a non-primary-enabled manifest and the final activation gate remains failed. Temporary 3026/3028/3338 services, owned copies/definer/runtime accounts and task browser windows were removed/stopped; initialized private lab files and restricted evidence remain. No retained service, operational LAN installation or database was restarted or modified. [Stop/fallback](../../output/auth-rel-3-20261028/fallback.json), [cleanup](../../output/auth-rel-3-20261028/cleanup.json), [final gate](../../output/auth-rel-3-20261028/FINAL_ACCEPTANCE.json), [separately retained passed isolated acceptance](../../output/auth-rel-3-20261028/PRE_RELEASE_ACCEPTANCE.json).

Task-only orchestration issues are retained: an initial dependency copy filter excluded nested package `dist` folders and was repaired by completing the new physical copy before final checks; cache-only differences were separated from immutable package files; an ordering probe hit its 45-second harness bound under concurrent acceptance workload and its instrumented serialized repeat passed without changing production/authentication/SQL timeouts; a collector initially read the wrong diagnostic field and stopped before primary shutdown. The decisive primary stop was the later native-client binding error. No application permission, financial assertion, transport version guard or recovery bound was weakened.

## Exact next step and application-only fallback boundary

**Smallest next task:** separately authorize correction of the activation runner's **client binding** and repetition of the failed recovery/activation gate. Use the reviewed hash-verified **11.4.13 `mariadb.exe` client** explicitly as `binaryMysqlTool` for this binary transport. This is not a MariaDB server upgrade. Reverify the then-current primary state and immutable candidate; provision a new owned restore target, capture or freshly validate the then-current checkpoint and complete restoration before promotion. Preserve any later activity. Reopen the candidate's activation gate only after that acceptance, then perform the required both-role primary read/authentication/revocation validation. No repeat of the unchanged full 18-suite/835 matrix is justified unless source, environment or new evidence requires it.

Fallback in this task was application-only: start the immutable SEC-3 release with **`C:/Users/ADMIN/.ldss/primary-runtime/private/sec3-20261028/primary.json`**, using its own `bin/node.exe` and `scripts/isolated-primary/controller.mjs`, after verifying its manifest/configuration and primary ownership/quiescence. Stop only a freshly verified conflicting primary controller tree, verify ports quiet, and verify readiness/new ancestry. The task's [start helper](../../output/auth-rel-3-20261028/start-runtime.mjs) records fallback separately. **SEC-3 is already running; no further fallback action is currently needed.** A later release needs its own fresh ownership and compatibility review. Never restore this or an older database checkpoint over newer primary activity.

No MariaDB/XAMPP upgrade, F58 application, permission/grant expansion, office-policy change or operational LAN authority follows from this review. A future 11.4/F58 cutover requires separate database/deployment authorization, a compatible complete package/startup guard, current recovery and target-specific acceptance. Exact-code 11.4 lab evidence is useful evidence, not primary upgrade approval. Shared financial serialization, expensive operations, finite pools, disk/resource exhaustion and the qualified original error remain availability limits; no worst-case capacity, full accessibility or office/LAN readiness certification is supplied.

**Stopped after independent review, isolated acceptance, failed mandatory primary recovery gate, verified SEC-3 application-only fallback, cleanup and reporting. AUTH-REL-3 is NOT active on primary. All primary records remain exact. LAN-R2A was not resumed; operational LAN was not modified.**
