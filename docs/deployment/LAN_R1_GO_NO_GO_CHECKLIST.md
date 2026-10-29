# LAN-R1 — GO / NO-GO checklist

26 October 2026, Philippine time. **Current decision: NO-GO.** This checklist records assessment status, not deployment authorization. Evidence and qualifications are in the [readiness report](LAN_R1_DEPLOYMENT_READINESS_REPORT.md); implementation steps are in the [LAN-R2 plan](LAN_R2_RELEASE_PREPARATION_PLAN.md).

Checked means the specifically described local assessment passed. Unchecked means the future release gate is open. Office-PC access, operational restore and live workflow acceptance are **NOT VERIFIED**.

## Verified assessment baseline — READY

- [x] Actual dirty U1.1 source and accepted three-file hashes checked; no Git HEAD substitution.
- [x] Synthetic primary identity verified: DESKTOP-BPLJKRP, `ldss_primary_test_12676_61497616`, `ldss_primary_12676_61497616@localhost`, loopback 5173/3001.
- [x] Current 66-entry migration journal/checksums and read-only primary inventory captured; primary health/readiness and frontend GETs return 200.
- [x] Existing U1/U1.1 regression evidence reviewed, including 791 U1.1 unit tests; no mutating regression rerun on retained data.
- [x] Safe configuration probes and secret scanner pass. Dependency audits ran and **reported findings**, not a clean result.
- [x] Existing older LAN installation identified without connecting to its database. Installed code has a 55-entry manifest; its actual database journal/data is unknown.

## Required technical work — BLOCKED

| Gate | Owner | Required acceptance evidence |
|---|---|---|
| [ ] B1: empty operational initialization | Developer + deployment operator | Reviewed exact-target adapter; fresh disposable empty install with all 66 unchanged SQL checksums, constraints/views/triggers, correct grants and no synthetic business data; no weakened UAT preflight. |
| [ ] B2: restricted pilot enforcement | Developer; scope approved by office | Finite operation inventory including mixed imports/historical paths; server rejects all excluded financial writes for Staff, Coordinator and direct API callers; permitted pilot actions still pass. Flags/UI hiding alone do not qualify. |
| [ ] B3: named account/role/recovery setup | Technical operator; office approves roster | Target-bound audited CLI using existing services, private owner activation/reset, disable/revoke/role-change tests; no copied users, shared password or technical-Admin approval powers. |
| [ ] Dependency findings resolved/disposition accepted | Developer + release operator | Compatible production fixes for Zod/fast-uri/Fastify; build-tool disposition, full and production audits, normal checks and relevant disposable regressions on the final lock/build. No automatic audit fix. |
| [ ] Complete compatible release | Release operator | Full isolated build and hashes including server fonts/templates/assets, required private download document and runtime dependency closure. Neither retained main dist nor review ZIP is a complete current operational installer. |

## Required target, configuration and recovery — CONDITIONAL

- [ ] **Office data custodian + operator:** identify the existing LAN target and legitimate history before any overwrite. Confirm separate empty-start plan or stop for a populated-target upgrade proposal. No assumed-empty `ldss_scholar_monitor_production`.
- [ ] **Operator:** approve exact new database/runtime/release/origin/ports, isolated from synthetic 5173/3001 and retained environments; no UAT clone or root runtime.
- [ ] **Network operator:** verify hostname resolution, served trusted certificate/chain and renewal; actual approved-PC access; unauthorized-host denial; direct backend/database denial; no Vite/workspace exposure. Current /24 firewall rule is not proof of named-PC restriction.
- [ ] **Host operator:** verify process identities/ACLs, supervised startup without interactive login, crash restart, logs/rotation, disk capacity, database recovery and non-conflicting listeners. Existing limited task visibility is not a reboot test.
- [ ] **Operator + office witness:** scheduled backup and actual off-host delivery/retrieval, protected separate key custody, isolated matching-version restore, agreed RPO/RTO and measured result. Desktop `pending:0` is insufficient.
- [ ] **Operator:** measure raw SQL/archive/largest-table headroom against 64 MiB / 96 MiB / 100,000 rows; include audit/import/document growth and alert ownership. Do not infer headroom from compressed size.
- [ ] **Staff + Coordinator:** two-PC HTTPS/session/origin/CSRF/logout/revocation walkthrough and small concurrent source-backed workflow acceptance, with recorded failures/timings. No synthetic localhost result replaces this.

## Required office decisions — CONDITIONAL / affected finance BLOCKED

- [ ] Approve designated first digital academic year, semester dates/working year, legitimate reference data, document/source requirements, physical-record custody and named role roster.
- [ ] Confirm current signatories. Existing migration-seeded names are not current authorization; do not edit migration bytes.
- [ ] Approve the actual small first source packet/workbook and duplicate/New/Continuing review procedure. Abbreviations and course-pending values require supported explicit evidence, not automatic equivalence.
- [ ] Specify whether already-approved-selection import actions belong in pilot scope; they perform substantive annual/Continuing decisions and need their existing authority.
- [ ] Approve restricted registration, receiving, academic review and Masterlist scope **only after** the technical boundary is proven.
- [ ] Keep affected live financial actions unavailable. Resolve Q28 continuation, Q29 physical timeliness evidence, Q30 written confirmation and Q31 approved OR/DV adapters in a separate financial proposal/acceptance. No release approval follows from technical tests.

## Deferred from restricted pilot

- [ ] Keep individual, omitted, draft-document, individual settlement and historical-multibatch flags false; graduation writes initially false. These defaults do not replace B2.
- [ ] Wider optimization, new UI, rollover, optional expensive assessments, maximum-load and full assistive-technology certification may wait, subject to actual pilot findings.

## Decision and stop rule

**GO requires every applicable blocker resolved, each conditional control witnessed, named owners' acceptance recorded and separate deployment authorization.** Any unknown target history, missing server restriction, failed restore, untrusted HTTPS, exposed database/backend or unsupported account bootstrap remains NO-GO. Financial workflows retain their own later gate even if the restricted pilot is approved.

LAN-R1 created reports/evidence only. LAN-R2 has not been executed. [Fresh preservation comparison](../../output/lan-r1-20261026/preservation.json).
