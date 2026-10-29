# FLOW-3 — Payroll finalization reliability and lock optimization

27 October 2026, Philippine time. **Implemented and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/). The reproduced 834-member race changes from 200/500 to 200/409; observed winning lock hold falls from 66.23 to 29.75 seconds. The complete reviewed source bundle and frozen payroll JSON remain byte-exact. PAY-003 remains Draft / revision 4 / 834 included / one deferred. No primary finalization, payment or other business command was submitted.** LAN-R2A remains paused.

This is a narrowly scoped finalization read optimization, following [FLOW-2](FLOW_2_FINAL_OFFICE_UAT_REPORT.md). It does not certify unrestricted office concurrency or live finance. **A same-account authentication read still waited 20.96 seconds on the required actor lock.** The 50-second database lock-wait setting, authorization and transaction semantics remain unchanged.

## Verified primary baseline

| Item | Starting → final |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Database / runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Application | Existing **synthetic / loopback 5173 / 3001** |
| Controller / API / Vite | **64684 / 9520 / 63928 → 61556 / 29024 / 57228** |
| Schema | **150 tables / 67 migrations**, including F57; hashes and applied timestamps exact |
| PAY-001 | **Processed / v805 / 800 Paid / zero Pending**, unchanged |
| PAY-002 | **Processed / v5 / 200 Pending**, unchanged |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Draft / v4 / 834 included / one deferred / 1,000 blocked / zero awaiting review**, unchanged |
| PAY-003 persisted financial state | **834 proposed entries / zero finalizations / zero allocations / zero payments**, unchanged |
| Current official Masterlist | Batch 1, **Published / v415 / 835 active / 167 retained removals**, unchanged |
| Existing windows | PAY-001 **21 October**, PAY-002 **23 October**, PAY-003 **27 October**, all original whole-day semantics |
| Final deadline / cutoff rule | **31 October / revision 3**; immutable PAY-TIME-4 synthetic rule, unchanged |

The five synthetic timed choices, proposed default, source authority and historical window evidence remain exact. This task supplies no missing office approval. Accepted PAY-PERF-3 hashes and the FLOW-2 test-fixture correction matched. Staging at `C:/xampp/htdocs/ldss_flow3_primary_stage_20261027` and its saved baseline used the **actual dirty workspace**, excluding private configuration, rather than Git HEAD or an older release package. The checkpoint protects **1,390 existing inputs**, including 310 retained distribution files. [Inspection](../../output/flow-3-primary-20261027/inspection.json), [preflight](../../output/flow-3-primary-20261027/preflight.json), [starting hashes](../../output/flow-3-primary-20261027/files-before.json), [FLOW-2 correction preservation](../../output/flow-3-primary-20261027/flow2-baseline.json).

## Reproduced cause and transaction measurements

On a newly owned protected copy of synthetic UAT, two distinct-key requests attempted the same reviewed 834-member finalization. The original code produced:

- Winner **HTTP 200 / 66,267.8 ms**; one frozen roster and 834 allocations.
- Competitor **HTTP 500 / 50,061.0 ms**, captured MariaDB **`ER_LOCK_WAIT_TIMEOUT` / 1205 / HY000** at `SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE`.
- Winning exact retry returned the original result; the losing original request/key later returned **409**, with no additional financial rows.

The winning request acquired the guard in **0.571 ms**. Its long **hold**, rather than intrinsically slow acquisition by that winner, made the competitor exhaust the unchanged **50-second** wait. [Original reproduction](../../output/flow-3-primary-20261027/before-834.json), [runtime settings before/after](../../output/flow-3-primary-20261027/runtime-inventory.json).

Tracing the original guarded path found two avoidable read costs. The separate claim-guard loop had no projection-local cache, rebuilding historical payment/correction collections for each member. The subsequent `validateOvr` pass used partial cohort preloads but lacked the existing candidate source adapter, repeating document, prior-approval and related point reads. In the winning sample, the raw batch-payment query ran **1,670 times** and the individual document-context query **834 times**.

| Winning 834-member observation | Original | Revised |
|---|---:|---:|
| HTTP finalization latency | **66.27 s** | **29.79 s** |
| Transaction duration, begin through commit acknowledgement | **66.23 s** | **29.75 s** |
| Financial guard hold | **66.23 s** | **29.75 s** |
| Driver SQL calls within that transaction | **94,071** | **22,444** |
| Aggregate client-observed SQL elapsed time | **57.07 s** | **21.63 s** |
| Candidate-assessment SQL phase span | **13.72 s / 13,865 calls** | **21.16 s / 13,865 calls** |
| Claim-guard SQL phase span | **11.68 s / 15,848 calls** | **0.48 s / 901 calls** |
| Roster-validation SQL phase span | **39.43 s / 61,838 calls** | **6.73 s / 5,158 calls** |
| Entitlement/event/allocation writes | **2,502 / 0.89 s span** | **2,502 / 0.86 s span** |
| Audit SQL / ledger SQL | **16.9 / 6.0 ms** | **16.8 / 6.4 ms** |
| Competing request | **50.06 s / 500** | **43.62 s / 409 `OVR_INVALID_STATE`** |

The financial inserts were a small part of the original duration; no replacement allocation writer or batched financial-write contract was justified. Finalization materializes the frozen JSON/form sources; it does **not** render HTML or Word. Document generation is not the cause of this finalization lock wait.

These are local profiled samples with retained services running, consistent test clocks and fresh owned copies. No physical cold reset, matched garbage collection or capacity certification was performed. SQL counts include driver query/execute calls, excluding begin/commit controls. SQL elapsed time includes round-trip/result handling, not database CPU. Phase spans run from their first to last observed SQL statement and exclude some between-phase application work. Process CPU and SQL wall time overlap and must not be added. The unchanged candidate phase varied substantially between runs; no improvement is claimed for it.

Across the paired two-request/probe sequences, observed CPU was **26.8 / 21.0 seconds**, peak process RSS **1,115.5 / 752.5 MiB**. These are observations, not paired memory guarantees or worst-case bounds. Raw SQL grouping and CPU profiles remain restricted. [Complete measurements and definitions](../../output/flow-3-primary-20261027/performance-summary.json).

## Implemented change and financial boundary

**One existing production file changed:** [server/ovr/service.ts](../../server/ovr/service.ts).

Immediately before finalization's claim/validation loop, it creates the **existing `candidateReads` adapter** for the exact reviewed entry IDs and semester. Both individual-route/paid-claim guards and the following validation pass use that local connection. Other actions retain their previous connection path.

The adapter retains its established **200-key source chunks**, original predicates/order/per-key limits and locking suffixes, immutable raw-source handling, isolated returned rows and live fallback for unsupported query shapes. It shares request-local indexes and decoding only. It does not cache an eligibility decision across commands, omit checks, infer eligibility from an empty preload or retain mutable sources on a pooled connection. Clock reads remain live. This read adapter is no longer used when the command proceeds to its financial writes.

Everything remains **inside the original authorized guarded transaction**. No source decision moved outside it. The configuration/user locks, isolation, role reauthorization, expected revision/hash checks, current review comparison, duplicate-claim/individual-route guards, cutoff checks, validation decisions and unique constraints remain. Entitlement/event/allocation, frozen snapshot, audit and ledger SQL and arguments are unchanged; failure still rolls them back together.

The ledger-first retry path still precedes expensive assessment, after fresh actor authorization. A committed exact retry returns its original result. A different key/payload does not become an automatic replacement command. The losing contender's 409 is an authoritative existing workflow-state rejection **after the winning commit**. No new busy response, polling, automatic retry, timeout increase or backend command-state system was introduced. An unknown transport/500 result must still use the supported original body/key recovery.

No financial transaction restructuring, schema, permission, policy, endpoint or write-contract change was needed. [Exact file hash](../../output/flow-3-primary-20261027/candidate-files.json), [pre-promotion source boundary](../../output/flow-3-primary-20261027/source-boundary.json), [compiled/client comparison](../../output/flow-3-primary-20261027/build-verification.json).

## Cohort, concurrency and integrity acceptance

All positive/mutating tests used newly owned synthetic targets. Copy tests retain the full **1,835-person authoritative scope**; fixture-only exclusion/restoration setup varies the included cohort. These changes never touched primary. Each revised race produced **one frozen roster, one entitlement/allocation per included person, 200/409**, no unexpected SQL timeout, an unchanged committed exact retry and definitive losing retry.

| Included members | Winning request | Guard hold | Winning SQL calls | Competing request |
|---|---:|---:|---:|---:|
| 25 | 15.92 s | 15.91 s | 14,299 | 36.21 s / **409** |
| 200 | 18.73 s | 18.71 s | 15,988 | 39.95 s / **409** |
| 834 | 29.79 s | 29.75 s | 22,444 | 43.62 s / **409** |
| 835 | 22.47 s | 22.44 s | 22,450 | 42.37 s / **409** |

Cohort timings are individual observations, not a monotonic latency model. An additional original-code 200-member run completed in **28.59 seconds**, versus **18.73 seconds** revised. [Matrix execution/cleanup](../../output/flow-3-primary-20261027/matrix-results.json), [original 200-member run](../../output/flow-3-primary-20261027/before-200-results.json).

For **834 members**, the captured full-scope source hash and every stored review entry match, and the **complete 6,733,274-byte frozen JSON is byte-exact** before/after, including order, evidence, fingerprints, validation, form, amounts and hash. For **200 members**, stored review entries, frozen JSON and normalized source-linked entitlement/allocation/event rows match exactly. Generated UUIDs are excluded from that child-row normalization; joins verify their actual entitlement/approved-event relationships, with all 200 expected rows present. The two 200-member exclusion fixtures were seeded at separate actual SQL times, which enter their full-scope hash; **equal full-scope hashes are not claimed for that pair**. [200-member financial parity](../../output/flow-3-primary-20261027/financial-parity-200.json).

The 25-member negative drill proves Staff denial; stale revision/hash and actual changed-identity rejection; complete late **audit and ledger** failure rollback of financial rows, frozen record, batch revision, audit and command result; and **403 after actual Coordinator-role revocation while queued behind the guard**. Role removal/restoration used the existing operator service on the copy, followed by fresh authentication. [Negative acceptance](../../output/flow-3-primary-20261027/negative-acceptance.json).

The response-recovery drill deliberately discards a committed application response, then repeats the exact original body/key and compares the durable result. This is application-level lost-response acceptance, not a new browser/network-loss simulation. All 800 original payment rows and official activations remain exact around the copy drills. The existing deferral remains excluded in the 834-member case.

A separate **fresh fictional 835-person** schema completes import → COR verification/prior COG attestation → approved Masterlist/publication → new Draft → early Review/return → post-cutoff finalization → Submitted → Processed. The original concurrent `Promise.all` race is retained, with strict **200/409** and **16.45 seconds for both responses**; no serial workaround replaces it. Late audit rollback, stale/source changes, technical/unassigned/Staff denials, exact retry, duplicate reservation and original approval preservation pass. Final state has **835 entitlements / 835 allocations / one frozen roster / 835 Pending / zero payment records**. HTML/Word generation succeeds. Only its Node Date and connection-local SQL timestamp advance for the cutoff test; no machine/global clock, receipt or primary date changes. [Seven-group workflow](../../output/flow-3-primary-20261027/workflow-summary.json), [driver exit](../../output/flow-3-primary-20261027/fresh-835-exit.json).

## Authenticated reads and retained UI recovery

During the paired 834-member races, unrelated Staff account probes all return **200**, maximum **12.54 ms originally / 12.35 ms revised**. These in-process probes do not establish external network/office capacity. In the 835-member revised race, a **same-Coordinator `/auth/me`** probe returns 200 after **20,964 ms** because finalization holds the original actor lock. That can exceed the unchanged **15-second** browser authentication-read timeout. It is a remaining connection-feedback risk, not an expired-role or invalid-password finding.

The contender still assesses current candidates after acquiring the guard before its existing workflow-state rejection. Its total response can exceed the winner's latency. The shared guard still serializes unrelated business writes; larger/heavier queues may still time out. These constraints were not hidden by timeout changes or an unsupported “failed” outcome.

Every frontend source and compiled client file is exact. PAY-UX-2's immediate blocking finalization spinner, payroll identity, conflicting-action/navigation protection, exact unresolved body/key, authoritative success refresh and supported exact retry remain. No form, confirmation, fake percentage, progress stage or UI polling was added. Client JS/CSS/fonts remain **1,561,059 bytes**, unchanged. This backend-only task did not rerun browser visual/native-zoom acceptance or claim new ui-ux-pro-max/Playwright screenshots; the accepted FLOW-2 UI evidence remains its baseline.

## Checks, recovery and installation

| Final check | Result |
|---|---|
| Lint, typecheck, build, secrets | All exit **0**, matching isolated source |
| `npm test -- --maxWorkers=1` | **137 files / 949 tests passed** |
| Existing disposable integration suites | **13 / 13 exit 0** |
| Owned finalization matrix / fresh workflow | **25, 200, 834, 835** single-winner acceptance; fresh **seven-group 835** workflow passed |
| Actual primary read acceptance | Both roles; full 1,835-scope hash, 25 fingerprints, counts and four financial summaries identical before/after |

The 13 suites cover Masterlist drafts/workflow/amendments, academic/approved changes, notifications, Registry/main payroll/Treasury/parity, intake/import, historical/omitted payroll, Recording, reconciliation, individual settlement and financial reports. Existing source pins, positive Paid witness, retry, rollback, reconciliation and generated-output assertions remain. **No existing test or financial guard changed.** [Normal checks](../../output/flow-3-primary-20261027/checks-main.json), [unit log](../../output/flow-3-primary-20261027/unit-final.log), [13 exact commands/exits](../../output/flow-3-primary-20261027/regressions-all-latest.json), [ordered execution](../../output/flow-3-primary-20261027/pipeline-results.json).

Installed BACKUP-1 passed fresh encrypted capture and complete isolated restoration at both gates:

| Checkpoint | SQL bytes | Encrypted bytes | Result |
|---|---:|---:|---|
| Before fixture mutations/source promotion | **99,326,646** | **22,627,467** | Complete restore passed |
| Before installation, primary ports quiet | **99,327,564** | **22,627,628** | Complete restore passed |

Both cover all **150 tables**, full values/counts/checksums, journal, columns/indexes/foreign keys/checks/triggers, executable views and rejection probes. The final archive SHA-256 is `0fcb346500029e9fd90bfce78ef61f82ed22a3d40a8f88d94a5b24c8d8525c6d`. The snapshots include ordinary intervening authentication and are not asserted identical. Owned recovery schemas/accounts were removed. No restore occurred over primary. Existing schema-scoped READ locks, private key/archive custody and **128 MiB SQL / 192 MiB decoded / 96 MiB archive / 100,000 rows per table / 120-second tool** bounds remain; no global lock or capacity increase was introduced. [Initial recovery](../../output/flow-3-primary-20261027/recovery.json), [quiet recovery](../../output/flow-3-primary-20261027/activation-recovery.json).

All gates and fresh source/business checks preceded promotion. Two primary-transaction quiescence samples passed. Only the freshly reverified controller tree was stopped; 3001/5173 were quiet during recovery and atomic installation of the one source file. The unchanged synthetic launcher restarted matching source with the byte-identical frontend. Only **`ovr/service.js` among 288 compiled server modules** differs; all other 287 and all client files match the accepted build. Root retained distribution was never built/overwritten. [Maintenance](../../output/flow-3-primary-20261027/maintenance.json), [installed hash](../../output/flow-3-primary-20261027/promoted-files.json), [delivery](../../output/flow-3-primary-20261027/delivery.json).

Automation qualifications: the first original-code profiling shell treated Node's experimental MockTimers stderr warning as a PowerShell error, although all driver assertions and saved proof completed. Later runners record actual child exit codes; the independent original 200-member run exits 0. The first primary post-install sign-out helper omitted JSON content type and correctly received **415**; explicit JSON headers/body corrected the helper. Repeated read/sign-out acceptance passed with no application safeguard change, new login or primary business command. Initial logs remain.

## Primary preservation, limits and stop

The final complete **150-table** comparison preserves all starting business values/counts, schema objects, **67 migration rows/timestamps**, application accounts/passwords/roles, runtime grants, original audits and every command ledger. It covers annual/academic/document/import/prior-approval sources, official publications/activations, original deferral/review history, frozen payrolls, entitlements, allocations, reconciliation and every financial date/evidence field.

| Primary fact | Before → final |
|---|---|
| Scholars / accounts / annual records | **1,835 / 14 / 1,835**, unchanged |
| Masterlists / stored entries / activations | **3 / 2,002 / 1,835**, unchanged |
| Entitlements / allocations / payment rows | **1,000 / 1,000 / 800**, unchanged |
| PAY-003 | **Draft v4 / 834 proposed / one deferred / zero frozen/allocated/paid**, unchanged |
| All Paid records | **800 exact**: two dated **2026-10-24**, 798 dated **2026-10-26** |

All **20,283** original audit rows match at full datetime precision. Two task logins/two logouts add four ordinary authentication events (**20,287 total**); sessions **120 → 122**, with ordinary last-seen/revocation/rate-limit activity. There is **no task export audit or primary business command**. Both logouts return **204** and saved tokens **401**. This is qualified authentication activity, not zero database writes. Separate user sessions were not targeted. [Full preservation](../../output/flow-3-primary-20261027/final-preservation.json), [both-role read parity/revocation](../../output/flow-3-primary-20261027/http-after.json), [actual final counts](../../output/flow-3-primary-20261027/current-state.json).

**1,389 of 1,390 starting inputs remain exact**, with none missing; only the declared backend file differs. This report and task-local drivers/evidence are additions. The **310 retained distribution files, 76 paused LAN-R2A artifacts and 16 earlier ML-1 evidence files** remain exact. All **nine explicitly recorded owned restore/copy/cohort targets and their recorded technical accounts** are absent; regression helpers also clean their targets in `finally`. Retained/LAN listener owners remain exact. This is not a fresh exhaustive inventory of every retained or operational database. [Cleanup](../../output/flow-3-primary-20261027/cleanup-all.json).

Review artifacts: [one-file patch](../../output/flow-3-primary-20261027/FLOW_3_FINALIZATION.patch), [source ZIP](../../output/flow-3-primary-20261027/candidate-source.zip), [exact-byte apply proof](../../output/flow-3-primary-20261027/artifacts.json). Saved original source is under `output/flow-3-primary-20261027/baseline/`. Artifacts exclude credentials, keys, `.env` and private database records; this is **not a complete LAN release package**. Any rollback must preserve later legitimate source/data and restart a compatible API. No database restore, downgrade, activation reversal or history deletion is appropriate.

Remaining limits: finalization still performs full authoritative assessment under the shared financial guard; candidate acquisition, serialization, same-actor reads and queued contender latency remain material. These samples do not certify sustained load, larger cohorts, many simultaneous actors, cold starts, power loss or office/LAN capacity. Generic unknown failures retain existing exact recovery; no universal busy contract or hard latency guarantee is claimed. Further separation/narrowing of financial locks or staged finalization would require separately reviewed transaction/freshness/recovery semantics and authorization. It was not implemented here.

FLOW-2's timeout blocker is corrected for the tested two-request cohorts. Its other performance, dependency/runtime, office-policy/source/forms, complete 67-schema release/pilot boundary and witnessed recovery gates remain separate. **LAN pilot/live financial readiness remains NO-GO; LAN-R2A was not resumed.** No operational LAN service, configuration or data changed.

**Stopped after FLOW-3 implementation, coordinated primary installation, verification and reporting. No primary finalization, roster/deferral change, new payroll, payment, source/approval mutation or cutoff/deadline change occurred.**
