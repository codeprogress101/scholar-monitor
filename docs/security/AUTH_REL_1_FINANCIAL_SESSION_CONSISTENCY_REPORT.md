# AUTH-REL-1 — Safe authentication during financial operations

28 October 2026, Philippine time. **Investigation and isolated diagnostics completed; authentication correction remains unresolved. Application implementation stopped at the request's explicit new-contract boundary. No authentication candidate, primary activation, schema change, timeout increase or financial writer change was made.** LAN-R2A remains paused.

The account-lock timeout is reproduced. A second ordering gap is independently demonstrated on both database engines: a real deferral request already through its request hooks can commit after logout, password-reset consumption or session expiry, because its later guarded service receives only the actor ID. Fresh requests with those invalid sessions are correctly rejected. Disable and role removal are rechecked by the guarded service and reject the queued operation.

Section 6 of the request states: **“If it requires a new session/authorization transaction contract or fundamentally changes security semantics, STOP implementation and document the proposed contract for separate approval.”** A responsive passive snapshot changes ordering with concurrent security writers; meeting the requested financial revocation guarantee also requires session identity at guarded authorization. Neither is a source-equivalent query optimization. This report and the [precise contract proposal](../../output/auth-rel-1-20261028/CONSISTENCY_CONTRACT_PROPOSAL.md) provide the concrete next review. They do not represent an implemented fix.

## Current primary and fresh encrypted recovery

The actual dirty workspace and live SEC-3 environment were reverified, rather than substituted with Git HEAD or an older financial checkpoint. No later audit activity or business change was found during this task.

| Verified primary fact | Starting → final |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306 / **10.4.32** |
| Schema / restricted account | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Active release | `C:/Users/ADMIN/.ldss/primary-runtime/releases/sec3-20261028` |
| Controller / API / Vite | **65812 / 62376 / 31768**, exact commands/ancestry; no restart |
| Tables / migration journal | **150 / 67**, F57 present, F58 absent; original SQL hashes/timestamps exact |
| PAY-001 / PAY-002 | Processed **v805 / 800 Paid**; processed **v5 / 200 Pending** |
| PAY-003 | **Draft v4 / 834 included / one deferred / 1,000 blocked / zero awaiting review** |
| PAY-003 persisted financial state | **834 proposed entries / zero frozen rosters, allocations or payments** |
| Official Batch 1 | Published **v415 / 835 active**, 167 retained removals |
| Existing cutoffs / deadline | Original whole-day **21 / 23 / 27 October**; **31 October revision 3**, unchanged |
| Synthetic timed policy | Existing F57 five-choice synthetic rule, unchanged; no office authority added |
| Audit rows / sessions | **20,306 / 132**, unchanged |

The current roster was read through the **unchanged active SEC-3 compiled reader**, its existing READ ONLY snapshot adapter and authorization. No primary login, export or business command was used. [Inspection](../../output/auth-rel-1-20261028/inspection.json), [current assessment](../../output/auth-rel-1-20261028/current-state.json), [immutable runtime hashes](../../output/auth-rel-1-20261028/active-runtime-integrity.json).

Installed BACKUP-1 captured **99,335,300 SQL bytes / 22,630,406 encrypted bytes**, archive SHA-256 `7959682ce259f488da2bae7cfe66ea2fdf1b9aa106c5cd49c4bc142896252152`. Complete newly owned isolated restoration passed all 150 table values/counts/checksums, original journal, structural inventory, executable views and constraint rejection probes; target/account were removed. Nothing was restored over primary. Source-schema READ locks, archive/key custody and finite **128 MiB SQL / 192 MiB envelope / 96 MiB archive / 100,000 rows per table / 120-second tool** bounds remain unchanged. Archives and exact records remain restricted. [Recovery](../../output/auth-rel-1-20261028/recovery.json).

## Existing security ordering and the stop decision

Reviewed sources include [AuthService](../../server/auth/service.ts) (`user`, line 98; `session`, line 198), [authentication hooks](../../server/auth/routes.ts) (line 44), [AuthorizationService](../../server/authorization/service.ts) (`snapshot`, line 48; `withPermission`, line 127), [payroll routes](../../server/ovr/routes.ts) (line 42), [guarded payroll commands](../../server/ovr/service.ts) (line 342) and the [15-second browser client](../../src/auth-api.ts) (line 14). The complete staged application retains the accepted DB-COMPAT-2 baseline and DB-REL-1 prior-approval optimization.

| Operation | Existing authoritative ordering |
|---|---|
| Login / session creation | Verify password outside account lock; lock account, recheck password hash/disabled state; insert session, optionally revoke supplied replacement token, audit and commit. Commit publishes the session. A login without a replacement token does not revoke all other sessions. |
| Session admission | Read token owner; lock account; check account; lock/read session; check revocation and absolute/idle expiry using backend time. Touch when required, then commit and release locks **before** route service authorization. `/auth/me` does not touch last-seen but still locks both rows. |
| Logout | Lock account; revoke selected session and audit; commit publishes revocation. |
| Account disable / password reset | Lock account; update account and revoke its sessions atomically with audit. Issuing a reset link alone does not consume it or revoke sessions; successful reset consumption does. |
| Role replacement | Lock account, change assignments, increment account version when changed, audit and operator ledger; commit publishes the change. |
| Financial authorization | Lock configuration guard, then current account; check disabled state and current permissions; retain locks through source checks, ledger and business transaction. **Presented-session revocation/expiry is not rechecked here.** |
| In-flight command | A security writer needing the account lock waits behind a command that already holds it. Existing code does not cancel a previously authorized transaction mid-commit. |

**AUTH-REL-1-01 — reliability defect:** passive account validation unnecessarily shares the long financial account lock even with `touch=false`. Its actual browser deadline can expire while the session is still valid.

**AUTH-REL-1-02 — security consistency gap against the requested contract:** request admission and financial authorization have separate transactions. Actor-ID-only reauthorization checks current account/roles but cannot distinguish the session invalidated while waiting. An already-admitted request may mutate the draft after logout/reset/expiry and before its financial authorization; this contradicts the requested authorization-point guarantee. This is a consequential security boundary, not proof that a fresh revoked-token request can bypass authentication, nor evidence of exploitation on primary.

Removing only `FOR UPDATE`, calling the existing projection adapter, increasing a timeout or caching permissions does not close both findings. That adapter's post-read check still locks the account. No such shortcut was implemented.

## Proposed consistency contract, not implementation

The [written proposal](../../output/auth-rel-1-20261028/CONSISTENCY_CONTRACT_PROPOSAL.md) was created before any authentication application edit; no such edit followed. It separates two decisions:

1. **P1: passive committed snapshot.** Explicitly scoped account/permission routes read one fresh committed token/account/session/role/permission tuple, without dirty reads or a cross-request cache. The tuple's snapshot establishment is its ordering point. Backend-time expiry is checked immediately before producing validation. A security change committed before snapshot establishment must be seen. A concurrent change committed afterward may overlap an earlier read: its response may arrive after that commit. Subsequent reads establish new snapshots. This overlap behavior requires approval; it must not be silently described as identical to lock-wait ordering. Do not generalize every `touch=false` caller to this path.
2. **M1: session-bound guarded mutation.** Carry server-derived session identity alongside the actor into guarded authorization. Retain configuration → account → session locking, then check current ownership, revocation, expiry, account and permissions before protected result delivery or business work. Security changes committed before this point deny the request. A financial transaction authorized first may complete while the later security writer waits. Current valid authority remains necessary before exact retry returns a protected durable result. Do not alter command bodies, keys, ledger hashes, source checks, financial writers or atomic rollback.

The proposal also specifies login/replacement, idle touch, reset issue versus consumption, disabled/role results, CSRF/origin/cookie preservation, commit visibility and deterministic race acceptance. No request-local account-read success supplies financial permission. No migration or grant expansion has been demonstrated necessary, but the service principal/authorization transaction contract requires explicit review before coding.

MariaDB documents [consistent snapshot establishment](https://mariadb.com/docs/server/reference/sql-statements/transactions/start-transaction); that database property alone does not define application revocation semantics. OWASP requires [server-side session expiry and invalidation](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). The concrete LDSS overlap and mutation rules must be independently tested after approval.

## Deterministic isolated security diagnostics

New, independent MariaDB **10.4.32 / 3338** and **11.4.13 / 3337** processes used owned binaries, datadirs, credentials and loopback configuration. Primary settings were unchanged. Both tests retain REPEATABLE READ, 50-second lock wait and 1 MiB packet limits. Test pools are 128 MiB; primary remains 16 MiB. New schema restoration and actual F58 forward/resume/no-op preserved all original values/67 historical rows; native binary-safe transfer produced 150-table / 68-row owned 11.4 copies. Explicit JSON-text behavior and the five corrected expressions remain the DB-COMPAT-2 design. No F58 entered primary. [Runtime proof](../../output/auth-rel-1-20261028/database-runtime-proof.json), [forward recovery](../../output/auth-rel-1-20261028/forward-recovery.json), [transfer](../../output/auth-rel-1-20261028/target-transfer.json), [vendor identity](../../output/auth-rel-1-20261028/vendor-verification.json).

The diagnostic server executes unchanged Fastify routes over **real HTTP**. A test-only hook pauses one request **after the existing session and permission hooks, before the real payroll service**. The security operation then completes through its real service/route; fresh reads verify the result before releasing the queued operation. It does not replace authorization or fabricate an HTTP success.

| Committed change before financial service entry | Fresh `/auth/me` | Queued real deferral, both engines | Fresh deferral |
|---|---:|---:|---:|
| Logout | **401** | **200**, one deferral/command committed | **401** |
| Consume password reset | **401** | **200**, one deferral/command committed | **401** |
| Remove Coordinator roles | **200**, permissions removed | **403**, no draft change | **403** |
| Disable account | **403** | **403**, no draft change | **403** |
| Session absolute expiry | **401** | **200**, one deferral/command committed | **401** |

Expiry in that drill is an explicit owned-fixture session-expiry mutation, not a change to primary or an assertion of an actual overnight run. Issuing a reset alone leaves authentication valid, as expected. An uncommitted disable held the account lock: same-account read waited, unrelated Staff completed, rollback allowed 200. A separate guarded **SELECT callback** obtained account authorization first; logout waited, then committed, and subsequent account validation returned 401. This last probe establishes lock ordering only; it is not labelled a payment/finalization test.

Seven diagnostic cases per engine completed. The original 800 payments, allocations, entitlements/events, frozen rosters, approval-member evidence, official activations and document events compared around the deferral drills remain exact. Each permitted diagnostic deferral has one command result; denied cases have no deferral/command delta. All such mutations were confined to disposable copies. These are **reproductions of existing behavior, not successful acceptance of a new security contract**. [10.4 results](../../output/auth-rel-1-20261028/security-races-3338.json), [11.4 results](../../output/auth-rel-1-20261028/security-races-3337.json), [test driver](../../output/auth-rel-1-20261028/security-races.mjs).

## Actual finalization contention and browser timeout

Fresh full-source copies restored the fixture's one deferral to exercise **835 fictional included memberships**. Two distinct-key finalizations on each engine returned **one 200 / one 409**. Each created one frozen roster and exactly 835 allocations, no additional payment records, preserved all original 800 payments/activations, returned the winner's original exact retry and rejected the losing original request. The collector discards the initial committed result before exact retry; this is service-level lost-result recovery, separate from a deliberately dropped browser response.

| Existing implementation observation | 10.4.32 | 11.4.13 |
|---|---:|---:|
| Financial transaction / guard hold | **24.53 / 24.53 s** | **23.40 / 23.40 s** |
| Financial account-lock hold | **24.53 s** | **23.40 s** |
| Same-Coordinator account request | **23.03 s / eventual 200** | **21.93 s / eventual 200** |
| Unrelated Staff maximum sampled request | **10.9 ms** | **11.8 ms** |
| Winning financial SQL calls / summed driver elapsed | **22,450 / 13.80 s** | **22,450 / 12.61 s** |
| Two-request/probe CPU / sampled peak RSS | **28.11 s / 1,084 MB** | **29.06 s / 983 MB** |
| Maximum measured event-loop delay | **226 ms** | **174 ms** |

Financial authorization held the **account** lock, not a session-row lock. Passive session-row lock holds through commit were approximately **0.17–3.73 ms / 0.14–23.75 ms**; their long wait occurred earlier on the account row. Client SQL timing includes driver/round-trip handling, not database CPU. CPU and wall-time overlap. Host checks and other diagnostic work ran concurrently; these are not matched quiet performance tests, before/after improvement evidence or an office SLA. **There is no “after correction” measurement because no correction was implemented.** [Full baseline and lock sequence](../../output/auth-rel-1-20261028/finalization-baseline.json).

The unchanged actual `auth-api.ts` was compiled as a test module and executed by Playwright/installed Chrome against the owned Fastify server. During a controlled **20-second guard/account lock**, Coordinator timed out at **15,012 ms**; Staff returned 200 in **6.5 ms**. Coordinator returned 200 in **4.8 ms** after release with the same token. Both owned browser sessions then logged out with 204 and saved tokens returned 401. This controlled browser hold is **not** described as an actual financial finalization; real financial waits are measured separately above. No historical primary failure/token trace is claimed recovered. [Browser evidence](../../output/auth-rel-1-20261028/browser-auth-timeout.json), [browser-copy preservation](../../output/auth-rel-1-20261028/auth-browser-preservation.json).

## Source parity, checks and explicit unexecuted gates

The complete **6,741,385-byte frozen payroll JSON** matches byte for byte across engines, SHA-256 `da9991d4aa1848720e44ec601b14c032044ff9d44018e0f6a2faac5c52834688`. The **4,231,438-byte joined financial-child source projection** is also byte-exact. All saved review entries and individual fingerprints match.

The wrapper containing those review entries plus the **whole-scope source hash is not byte-identical**: exactly its `sourceHash` leaf differs. Independent fixture setup restores a deferral using the administrative connection's live SQL timestamp, whereas application connections use the fixed fixture time; the source includes deferral `recordedAt`. This is consistent with different setup times. It was not normalized, rehashed into agreement or treated as full source-file parity. The first aggregation assertion rejected the blanket equality claim; the report retains this qualified limit. No authentication/source implementation change needs equivalence acceptance in this stopped task. [Raw comparison](../../output/auth-rel-1-20261028/raw-parity-diagnostic.json).

| Executed final verification | Result |
|---|---|
| Lint / typecheck / build / secrets, independently installed canonical stage | **All exit 0** |
| Unit suite | **138 files / 954 tests passed** |
| Existing authentication and RBAC integrations | **Two groups per engine, all exit 0**, repeated with own installed dependencies |
| 835-person finalization races | **Both pass existing 200/409 and exact-retry assertions**; account latency remains a failed reliability requirement |
| Security-ordering diagnostics | **Seven cases per engine completed**; three invalidated-session queued admissions reproduced per engine |
| SEC-3 package/lock identity, tree and full/production audits | Exact accepted manifests; **all exit 0 / zero dated known-advisory findings** |
| Compiled source boundary | **291 server files / 18 client files byte-exact** against accepted DB-REL-1 build |
| Primary and retained preservation / cleanup | Passed |

An initial dependency junction to the previous isolated task's tree caused `npm ls` to report missing/extraneous paths; it was not accepted as clean installation proof. A new task-owned install used the exact SEC-3 lock and a new cache. Final normal checks, audits/tree and both-engine auth/RBAC reruns use that independent installation. Neither shared nor primary dependencies were replaced. The first source overlay also correctly refused two task-adapted operator hashes; the harness now verifies the accepted base before applying only its own port/datadir path adaptation. These are recorded test setup issues, not suppressed security failures. [Final checks](../../output/auth-rel-1-20261028/checks-main.json), [unit log](../../output/auth-rel-1-20261028/unit-final.log), [dependency proof](../../output/auth-rel-1-20261028/security.json), [10.4 integration commands](../../output/auth-rel-1-20261028/regressions-original-auth-rbac-latest.json), [11.4 commands](../../output/auth-rel-1-20261028/regressions-target-auth-rbac-latest.json).

**Not rerun as new-contract acceptance:** the complete 25/200/834 matrix, 835-person prior-approval concurrency, all Masterlist/import/processing/Payment Recording/deferred recovery/Individual Payments/correction/reconciliation/report/cutoff suites, and all requested financial disable/reset/revocation combinations. Their prior [DB-REL-1 acceptance](../database/DB_REL_1_MARIADB_FINANCIAL_CONCURRENCY_REPORT.md) is retained, not represented as freshly executed here. Those changed-contract gates are deferred because implementation stopped. Browser recovery/no-false-sign-out under a fixed contract, long queued expiry/touch behavior and primary promotion are likewise unpassed. No frontend change occurred, so conditional five-width/native-200% visual acceptance was not triggered; no new accessibility or pending-dialog certification is claimed.

## Exact files, preservation and next authorization

**Zero existing application/test/configuration/deployment files changed.** This report and task-local drivers, proposal and evidence under `output/auth-rel-1-20261028/` are additions. Isolated staging uses the actual dirty source plus verified DB-COMPAT-2 and DB-REL-1 baselines. Its only further existing-file adaptations are task-specific port/datadir paths in `scripts/database-compat/provision.mjs` and `scripts/intake-text-preflight.mjs`; neither is installed in the workspace or primary. There is no authentication candidate patch or installable release. [Exact source boundary](../../output/auth-rel-1-20261028/source-preservation.json), [scope disposition](../../output/auth-rel-1-20261028/scope-disposition.json), [exact added-file hashes](../../output/auth-rel-1-20261028/task-files.json).

All **1,406 protected starting inputs**, including **310 retained distribution files**, remain exact. The active SEC-3 **21,394 immutable files** and actual effective environment hash match. **15,438 retained files / 20,094 shared-dependency/profile files / 76 paused LAN-R2A artifacts / 16 earlier ML-1 evidence files** remain exact. No source promotion, grant expansion or unrelated service restart occurred.

Complete final comparison preserves all 150 primary tables, schema objects, 67 migrations/timestamps, accounts/passwords/roles, grants, original audit rows and command ledgers. This covers all 1,835 scholars and annual/academic/import/document/prior-approval evidence, three Masterlists/2,002 stored entries/1,835 activations, frozen payrolls, original entitlements/allocations and every payment. All **800 Paid rows** remain exact: **two dated 2026-10-24 / 798 dated 2026-10-26**. PAY-003 remains Draft v4 with its original deferral and cutoff. **20,306 audits / 132 sessions remain unchanged; zero primary task logins, exports or business commands.** The user's sessions were untouched. [Complete preservation](../../output/auth-rel-1-20261028/final-preservation.json), [retained proof](../../output/auth-rel-1-20261028/retained-final.json).

Only verified owned schemas/accounts were removed; both new database processes and browser service were stopped. Restricted raw backup scratch is empty. Private stopped system datadirs remain; secure erasure is not claimed. Primary/retained listener owners, launcher ancestry, settings and readiness remain exact. This is not a fresh exhaustive inventory of operational LAN databases. [Cleanup](../../output/auth-rel-1-20261028/cleanup.json), [delivery](../../output/auth-rel-1-20261028/delivery.json).

The smallest next authorized task is **review and explicitly approve P1/M1**, including the overlap rule, mutation authorization point, expiry/touch behavior, denied-session exact retry and service/operator entry points. Then implement the minimal passive reader and session-bound authorization plumbing in isolation, independently test all race orderings and the complete financial/source/frozen parity matrix on both engines, and repeat actual-browser contention/recovery acceptance. No schema change is currently proven necessary. Primary installation remains a separate authorization after those gates pass.

MariaDB upgrade remains NO-GO pending accepted authentication semantics, complete changed-contract financial regression, migration/operator package review, witnessed recovery, maintenance/rollback and operational security/policy acceptance. The database compatibility and binary-safe transport limitations in [DB-COMPAT-2](../database/DB_COMPAT_2_MIGRATION_OPERATOR_READINESS_REPORT.md) remain. A dated clean dependency audit or local synthetic test is not office financial authority.

**Stopped after isolated investigation, diagnostics, cleanup and reporting under the explicit contract boundary. Authentication latency and queued-session authorization remain unresolved. No primary activation, F58 application, MariaDB upgrade, financial-policy change, LAN-R2A resumption or operational LAN change occurred.**
