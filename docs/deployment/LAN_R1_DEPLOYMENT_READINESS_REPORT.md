# LAN-R1 — Deployment readiness assessment

26 October 2026, Philippine time. **NO-GO for an operational LAN pilot today.** The accepted U1.1 application is a useful tested baseline, but operational bootstrap, account administration, enforced pilot restrictions, dependency remediation and witnessed infrastructure/recovery acceptance remain gates. **Assessment and planning only; nothing was deployed or reconfigured.**

The shortest path is one complete production build, one explicitly approved separate operational database/runtime, one secured entry point and a restricted registration/receiving/academic/Masterlist pilot. This is conditional on the gates below, not permission to start. See the [GO/NO-GO checklist](LAN_R1_GO_NO_GO_CHECKLIST.md) and [unexecuted LAN-R2 plan](LAN_R2_RELEASE_PREPARATION_PLAN.md).

## Evidence and actual baseline

The authoritative baseline is the **actual dirty workspace**, with the accepted [U1.1 three-file package](../uiux/U1_1_PAYROLL_LAYOUT_CORRECTION_REPORT.md), not Git HEAD. All accepted package hashes and preceding protected inputs matched. LAN-R1 captured 1,321 existing source/configuration/document/distribution inputs and a read-only, consistent primary inventory of 149 tables. Credential contents are excluded from evidence.

| Item | Verified locally |
|---|---|
| Host / database engine | DESKTOP-BPLJKRP / MariaDB **10.4.32**, 127.0.0.1:3306 |
| Primary synthetic database | `ldss_primary_test_12676_61497616` |
| Primary restricted runtime | `ldss_primary_12676_61497616@localhost` |
| Frontend / API | Loopback **5173 / 3001**, existing synthetic profile |
| Controller / API / Vite | **47348 / 52532 / 42356** |
| Required schema | **66 journal entries**, matching current SQL SHA-256 checksums |
| Current tools | Node **22.21.0**, npm **10.9.4**; package engine requires Node >=22.12.0 |
| Primary readiness / frontend | Unauthenticated local GETs return **200** |

Fresh evidence: [before capture](../../output/lan-r1-20261026/capture-before.json), [configuration probes](../../output/lan-r1-20261026/config-checks.json), [local HTTP/certificate/backup metadata](../../output/lan-r1-20261026/local-checks.json). Runtime compatibility was observed on this MariaDB version; vendor lifecycle, patch posture and compatibility of any replacement runtime/database version require operator review and rehearsal. The health response's older `0.37.0`/`F36` descriptive labels are **not** schema certification; the 66-entry manifest/journal comparison is authoritative.

Existing regression evidence was reused rather than rerunning mutating drivers: U1.1 lint/typecheck/build/secret checks passed, **124 files / 791 unit tests**, and seven disposable integration groups; [U1](../uiux/U1_ACTION_FIRST_WORKFLOW_SIMPLIFICATION_REPORT.md) adds authentication, RBAC, notifications, academic and intake/import evidence. These prove synthetic capability, not actual office acceptance. No new integration, restore, migration, account login or business operation ran in LAN-R1.

## Existing LAN installation: do not overwrite it

Read-only installed metadata shows an **existing** Caddy listener at **192.168.0.16:3443**, PID **9756**, and Node backend at **127.0.0.1:3002**, PID **6720**. Startup metadata points to `C:/ProgramData/LDSSProduction/release-20261021-payroll20-r1`. Its installed code manifest contains **55 migration filenames through F45**, rather than the current application's 66. This is a **file observation**, not a measurement of the operational database's journal or data.

Its separate environment names `ldss_scholar_monitor_production` / `ldss_production_app`, production mode and `https://monitor.iskolarngdaet.app:3443`, with loopback proxy trust. No operational database connection or request to that LAN application was made. Its real records, schema state, current users, grants, acceptance and intended continued use are **NOT VERIFIED**. [Sanitized metadata and hashes](../../output/lan-r1-20261026/installed-metadata-before.json).

Before R2, the technical operator and Scholarship Office data custodian must identify the intended target and disposition of this existing installation. **Do not assume it is empty, obsolete or disposable.** If legitimate records must carry forward, stop the fresh-install branch and prepare a separately reviewed, exact-target upgrade and preservation plan. Never replace them with a UAT clone or silently create a competing operational history.

## Architecture and compatible release requirements

The current application is React/TypeScript with Vite build tooling, a Fastify Node API and mysql2/MariaDB. `npm run build` generates the document-template fingerprint, typechecks, builds the client, compiles the server and copies report assets. `npm start` runs `dist/server/index.js`, which serves **only the built client** and matching API; startup checks schema/configuration readiness before listening and does not migrate automatically. Sources: [package.json](../../package.json), lines 6–26; [server/index.ts](../../server/index.ts), lines 6–20; [schema-readiness.ts](../../server/schema-readiness.ts), lines 4–12.

Use a complete immutable release outside the XAMPP document root, a supervised Node process bound to loopback, and one HTTPS reverse proxy/origin. Reusing the existing Caddy arrangement after explicit target approval is the smallest route. A web server can serve the compiled frontend with equivalent API proxying, security headers and access boundaries, but that alternative adds configuration to prove. **Do not expose Vite 5173 or serve the workspace.** Root `.htaccess` currently denies access; this is not a substitute for a properly scoped release root.

The workspace's **310 retained distribution files intentionally serve older environments** and are not the current release. The U1.1 review ZIP is also **not a complete standalone installer**: its 293 entries contain 17 client files and 276 server JS files, excluding server PDF/font/template assets. R2 must build from the exact current source in an isolated build directory and inventory the full distribution, production dependency closure, required operational helpers and private implementation-plan download dependency. Include existing Noto PDF fonts/notices, document/branding assets and local Manrope/DM Sans assets; do not substitute browser fonts into PDFs. Preserve provenance and licenses.

Configuration must be separate from the repository `.env`: `NODE_ENV=production`, `APP_ENV=production`, loopback `HOST`, an approved non-conflicting `PORT`, exact HTTPS `APP_ORIGIN`, dedicated database host/port/name/user/password, deliberate `TRUST_LOOPBACK_PROXY`, session limits and private `BACKUP_STATUS_FILE`. Explicitly set all six optional flags rather than inheriting UAT values. [server/config.ts](../../server/config.ts), lines 5–71. Pure probes passed valid production configuration and rejected HTTP origin, root credentials, missing password and development mode under production NODE_ENV.

## Readiness matrix and release gates

READY means the stated local capability is evidenced; it does not mean the entire deployment is ready. CONDITIONAL requires specified setup/witnessing; BLOCKED prevents the proposed pilot; DEFERRED can wait within its restricted scope.

| Item | Status | Remaining work / responsible party |
|---|---|---|
| U1.1 source, synthetic schema and core regressions | READY | Preserve exact baseline; technical operator |
| Complete current production package | CONDITIONAL | Full isolated build and asset/dependency manifest; release operator |
| Existing LAN target/data ownership | BLOCKED | Custodian confirms target and preserves any legitimate history; office + operator |
| Empty operational 66-schema bootstrap | BLOCKED | Target-bound installer/preflight support and disposable empty rehearsal; developer + operator |
| Named account/role/recovery operations | BLOCKED | Operational CLI adapter/runbook; technical operator, approved office roster |
| Restricted financial-write boundary | BLOCKED | Enforced server-side pilot boundary, direct API denial tests; developer + approving office authority |
| Dependency disposition | BLOCKED | Resolve production findings and rebuild/retest; developer/release operator |
| HTTPS, DNS, firewall and authorized PCs | CONDITIONAL | Actual remote positive/negative tests; network operator |
| Reboot/crash recovery and unattended tasks | CONDITIONAL | Witness without interactive host login; host operator |
| Operational backup/off-host retrieval/restore | CONDITIONAL | Witness matching release and agree RPO/RTO/key custody; operator + office witness |
| Registration, receiving, academic and Masterlist pilot | CONDITIONAL | Real-source walkthrough, named roles, approved dates/policies; Coordinator/Staff |
| Core financial live writes | BLOCKED | Separate authorization and affected Q28–Q31 disposition; office authority + developer |
| Optional individual/omitted/document/settlement/historical features | DEFERRED | Keep disabled for this pilot; separate release/approval |
| Graduation write workflows | DEFERRED | Use authorized read/review destinations; confirm duration/evidence procedure before writes |
| Actual multi-PC performance/accessibility acceptance | CONDITIONAL | Small witnessed office scenario; Staff + Coordinator + operator |
| Wider optimization/UI cleanup/full AT certification | DEFERRED | Not necessary to prepare the limited pilot |

### Implementation blockers

**B1 — Empty 66-schema operational initialization is not supported by the stock entry points as-is.** `setup:local` creates the fixed development database; `db:migrate` uses the development-only administrator connection. F53–F56 preflights admit PID-owned test schemas or specific reviewed synthetic-primary exceptions. An ordinary empty operational database is not admitted merely because it has no scholars. Sources: [setup-local.mjs](../../scripts/setup-local.mjs), lines 14–51; [migration-lib.mjs](../../scripts/migration-lib.mjs), lines 9–25 and 75–88; [annual-intake-preflight.mjs](../../scripts/annual-intake-preflight.mjs), lines 35–38; [graduation-monitoring-preflight.mjs](../../scripts/graduation-monitoring-preflight.mjs), lines 11–15; [import-intake-preflight.mjs](../../scripts/import-intake-preflight.mjs), lines 8–14; [intake-text-preflight.mjs](../../scripts/intake-text-preflight.mjs), lines 10–15.

R2 needs a narrowly authorized, exact-target **empty-operational bootstrap adapter** preserving accepted SQL bytes/checksums, ownership, partial-DDL detection and grant restrictions. Do not bypass preflights, name operations as a test schema, edit applied migrations or temporarily switch production into development mode. No new business migration is inherently required. An underlying reusable migration library is not proof that the operational entry path has been rehearsed.

**B2 — Optional flags cannot enforce the proposed restricted pilot.** Core payroll, recording, reconciliation, correction and Treasury commands are registered independently of the optional financial switches. Sources: [server/app.ts](../../server/app.ts), lines 231–264, compared with optional constructors at 235–241; [config.ts](../../server/config.ts), lines 31–37. R2 requires a separately approved, tested server-side pilot restriction covering all excluded financial writes, including mixed-purpose routes. Hiding controls, a user memo or setting the six flags false is insufficient. Preserve normal RBAC; do not redesign roles or grant new approval powers.

**B3 — Supported service primitives exist, but operational account administration needs a target-bound procedure.** Existing `account` and `roles` CLIs explicitly require the development database; the authorization routes expose permissions/catalogue reads, not account CRUD. Sources: [scripts/account.ts](../../scripts/account.ts), lines 20–28 and 56–62; [scripts/roles.ts](../../scripts/roles.ts), lines 23–29; [authorization/routes.ts](../../server/authorization/routes.ts), lines 43–54. Provide a reviewed operational CLI adapter using the existing audited services, verified account-owner recovery and separate bootstrap credentials. No full account UI is necessary for the pilot. Never copy/reset UAT users, share credentials or give technical Administrator scholarship/financial approval authority.

## Focused deployment security findings

This is a source/configuration review, not an exploit test or full penetration assessment. Severity describes the finding; the gate column describes this proposed release.

| ID / severity | Evidence and impact | Pilot disposition |
|---|---|---|
| SEC-01 **High** | Production lock includes Zod 4.6.5, fast-uri 4.2.1 plus nested 3.1.8, and Fastify 5.12.5. Audit reports 1 high / 1 moderate / 1 low affected package entry. `package-lock.json` lines 6185, 3306, 2080, 3322. | BLOCKED pending compatible remediation/retest or a documented, evidence-based accepted disposition. Existing limits reduce exposure but do not prove non-reachability. |
| SEC-02 **Critical tooling severity**, conditional exposure | Full lock audit also flags the dev-only shell-quote/concurrently chain, Vite, source-map-js and Vitest/mocker. Lock lines 5303, 2614, 5783, 5325, 5861. Full audit: 2 critical / 3 high / 3 moderate / 1 low package entries; these are not nine independent vulnerabilities. | Keep development/test servers off LAN; remediate build-tool findings before freezing the fresh release. Production `--omit=dev` audit has **zero critical** entries. |
| SEC-03 **High scope-control gap** | B2: existing Staff/Coordinator permissions still authorize core financial operations when optional flags are off. | BLOCKED for a nonfinancial pilot until server enforcement is demonstrated; this is not a claim that the normal financial workflow is inherently broken. |
| SEC-04 **Medium, verification gap** | MariaDB listens on `::3306`; an inbound LocalSubnet block exists. HTTPS allow rule covers the entire 192.168.0.0/24, not a named-PC allowlist. Live remote enforcement is untested. | CONDITIONAL: prove approved-PC access and unauthorized/network DB/API denial before admission. No claim of public Internet exposure. |
| SEC-05 **Medium, operational gap** | Application/HTTPS process owner and command details were unavailable in this inspection. Visible backup/renewal tasks use ADMIN/Interactive logon. Local staging metadata does not prove unattended off-host delivery. | CONDITIONAL: verify least-privilege identities, ACLs, supervised reboot/crash restart, log rotation and off-host restoration. Do not infer absent supervision solely from limited visibility. |

The Zod issue concerns oversized collection validation; the upstream fix adds early bounds checking. Fast-uri findings concern specific URI normalization cases; Fastify's issue concerns case-sensitive header `propertyNames` validation. These do **not** establish that LDSS origin/CSRF checks are bypassed. Audit remediation candidates are Zod **4.6.6**, fast-uri **3.1.9 / 4.2.3**, and Fastify **5.12.6**, subject to compatible resolution and retesting. Sources: [Zod fix](https://github.com/colinhacks/zod/pull/6652), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [fast-uri advisory](https://github.com/fastify/fast-uri/security/advisories/GHSA-w74x-v6f9-j3xg), [Fastify advisory](https://github.com/fastify/fastify/security/advisories/GHSA-389g-gv7q-r4x8). The dev-only shell-quote issue is addressed upstream in 1.11.0; no update ran here. [Maintainer advisory](https://github.com/ljharb/shell-quote/security/advisories/GHSA-pqg4-j6r4-53mv).

Raw [full audit](../../output/lan-r1-20261026/dependency-audit.log) and [production-only audit](../../output/lan-r1-20261026/dependency-audit-production.log) are retained. They exited **1 because of findings**, not passed checks. `npm ls --depth=0`, runtime version reads and the secret scanner exited 0. No install, audit fix, dependency upgrade or lockfile refresh was performed.

### Existing controls and remaining infrastructure proof

Production config requires HTTPS origin and non-root credentials. Authentication uses Secure/HttpOnly/SameSite Strict `__Host-ldss_session`, path `/`, no Domain; mutations require the exact origin, JSON and the authenticated CSRF token, rejecting cross-site fetch context. Session defaults are 30-minute idle/8-hour absolute, with revocation and logout covered by existing regressions. Passwords use scrypt; owner activation/reset is one-time and expires in 15 minutes. Sources: [auth/routes.ts](../../server/auth/routes.ts), lines 19–85; [auth/service.ts](../../server/auth/service.ts), lines 217–243 and 328–375. Staff/Coordinator retain existing distinct authorities; Administrator is technical, and unassigned accounts have no operational permission. Revalidate these through the actual proxy, including role revocation and recovery.

Fastify has a 1 MiB default body limit/30-second request timeout; import accepts a 3 MiB transport body for a **2 MiB XLSX / 1,500-row** workbook, with 100 ZIP entries/10 MiB expanded bound and additional format rejection. Sources: [app.ts](../../server/app.ts), lines 130–147; [imports/routes.ts](../../server/imports/routes.ts), line 22; [workbook.ts](../../server/imports/workbook.ts), lines 5–94. Keep limits and complete output/source guards. Runtime grants use table-specific privileges, including append-only evidence/audit restrictions; provisioning credentials must remain separate and unavailable to the app process. [migration-lib.mjs](../../scripts/migration-lib.mjs), lines 101–315.

Local API responses showed CSP, nosniff, DENY, no-referrer, restrictive device permissions and no-store. Vite HTML does not carry those production API headers; do not publish it. Logs redact authorization/cookies, avoid routine request logging and return generic internal failures with request IDs. Source [app.ts](../../server/app.ts), lines 130–147; live results are in local-checks.json. Production root, private config, keys, backups, logs and generated-document handling need actual ACL/proxy acceptance. Authenticated exports can append audit events even for GETs; they are not zero-write probes.

Public certificate metadata matches `monitor.iskolarngdaet.app`, valid **9 October 2026–7 January 2027 UTC**. This proves neither the served chain nor office-PC trust/DNS/renewal. Office access, LAN performance, external port denial and native office browser behavior remain **NOT VERIFIED**. `LDSSMariaDB` is observed Running/Automatic; reboot, power-loss recovery and automatic app/proxy restart were not tested. [Firewall evidence](../../output/lan-r1-20261026/firewall-details.json), [visible tasks](../../output/lan-r1-20261026/all-ldss-tasks.json), [process-visibility limitations](../../output/lan-r1-20261026/lan-process-metadata.json).

## Office workflow readiness and initial data

| Capability | Implemented evidence / office condition |
|---|---|
| New/Continuing registration; permanent IDs | Guarded identity allocation, duplicate review and retries exist. Office approves designated first digital year and genuine source evidence; do not reconstruct fictitious earlier annual records. |
| Optional School/Course wording | Exact supplied text/NULL/history remains separate from verified academic references and provisional placement. Do not automatically equate abbreviations or turn manual Year IV into canonical placement. |
| Excel and reuse of registered people | Approved simple/legacy formats and reviewed identity/text bindings are implemented. Actual office workbook has **not** been supplied/tested. Preview mixed classifications, descriptions, abbreviations and course-pending exceptions; resolve each exact mismatch through supported evidence, not aliases or truncation. |
| Annual academic records; COR/COG | Receiving and verification are separate guarded operations. Demonstrate correct year, document policy, physical reference/storage and authorized review. Course pending is distinct from absent year-level evidence. |
| Admission / Masterlists | Existing review, publication/locking and permission checks pass synthetic tests. Office must accept the source/approval procedure. Registration, review candidacy and published membership do not mean Paid. |
| Graduation | Existing review distinguishes final-year filters, verified duration/program context, monitoring evidence and formally approved graduation. No Year IV/V assumption; pilot writes deferred pending accepted procedure. |
| Profiles/history/reports | Existing bounded readers and export guards are implemented. Verify selected-year/source meaning and actual output custody; an export is not an approval or release. |
| Payroll / Payment Recording | Technically implemented and tested; **outside the recommended restricted live-write scope** until separately approved. Preserve frozen amounts/sources and actual dates. |

Imports are not all equivalent operations: the `approvedSelection` path can create/validate/select annual scholarship records and accept Continuing rosters, with specific Coordinator authority and evidence. It is not merely file intake. [imports/service.ts](../../server/imports/service.ts), lines 464–576 and following Continuing confirmation. R2 must classify this and historical/prior-batch actions explicitly; a financial pilot restriction must not accidentally admit excluded writes through a mixed route.

Start with an **empty** operational business dataset only after the existing-target gate. Do not clone UAT schools/courses, people, approvals, users/passwords, sessions, imports or financial data. Structural role/permission seeds are expected. A migration also seeds named `PAYROLL_SIGNATORIES`; these historical defaults are **not** current office approval. Validate them with the office through the existing authorized configuration, preserving migration bytes. [Signatory migration](../../db/migrations/20261010010000_f36_payroll_signatories.sql), lines 2–4.

Bootstrap approved named accounts first so the responsible office roles can establish official year/semester dates, working-year choice, legitimate reference data and requirements/source policies. Then preview the authorized first real workbook, resolve duplicates and New/Continuing identity reuse, confirm reviewed intake, receive/verify COR/COG and prepare/review/publish Masterlists. No live intake occurs in R1. Financial enablement is a later explicit gate, not the automatic next step after Masterlist publication.

## Financial policy boundary

The existing [current-year workflow plan](../requirements/LDSS_CURRENT_YEAR_WORKFLOW_PLAN.md), lines 99–102, already identifies the decisions; no replacement questionnaire is needed.

| Subject | Actual difference / affected action | Required disposition |
|---|---|---|
| Q28 | The agreed timely-request continuation differs from current post-deadline settlement behavior; `requireClaimOpen` still applies. | Separately approve and implement the exact continuation contract; do not extend deadlines informally. |
| Q29 | Server encoding time does not fully establish dated physical receiving/timeliness. | Accept evidence/acknowledgment design before relaxing Q28. |
| Q30 | Treasury/correction paths exist, but signed evidence plus Coordinator review plus written releasing-office confirmation is only partially represented. | Keep late/historical release encoding out of pilot until its exact two-source contract is accepted. |
| Q31 | Current individual OR/DV document adapters are explicitly drafts and reject non-draft templates. | Coordinator-supplied approved forms plus reviewed adapter/source/hash implementation and output acceptance; changing a label/flag is insufficient. |

Sources: [settlement-source.ts](../../server/payments/settlement-source.ts), lines 26–31; [individual-service.ts](../../server/payments/individual-service.ts), relevant claim checks; [document-service.ts](../../server/payments/document-service.ts), lines 31–33. This is not new payment policy or authority.

For the proposed pilot, explicitly keep `INDIVIDUAL_PAYMENTS_ENABLED`, `OMITTED_PAYMENTS_ENABLED`, `INDIVIDUAL_DOCUMENTS_ENABLED`, `INDIVIDUAL_SETTLEMENT_ENABLED` and `HISTORICAL_MULTIBATCH_ENABLED` **false**. Keep `GRADUATION_MONITORING_WRITES_ENABLED` false initially; it is not a universal block on every standing/status operation. Existing read/report capabilities can remain subject to RBAC and output custody. **No financial write is certified for live use by this assessment**; this is a pilot restriction, not a claim that every core payment scenario violates Q28–Q31. Restrict payroll finalization/processing, recording, correction, reconciliation closure/Treasury and individual/historical release paths with the separately tested boundary in B2.

## Backup, recovery and reliability

The existing backup library encrypts a compressed SQL/inventory payload with AES-256-GCM and verifies hashes, data and schema on a newly owned restore target. Bounds remain **64 MiB SQL / 96 MiB archive / 100,000 rows per table**. U1.1's 149-table encrypted checkpoint was **13,692,144 bytes** and passed isolated restoration. That is UAT evidence, not an operational recovery witness. [backup-lib.mjs](../../scripts/backup-lib.mjs), lines 11–39, 113 and 182 onward; [U1.1 recovery](../../output/u1-1-payroll-primary-20261026/recovery.json).

Encrypted size cannot establish raw-SQL headroom. Early-pilot suitability is **conditional on measuring** actual dump bytes, largest table counts, audit/import growth and generated-document blobs. Successful bounded UAT restore establishes then-current fit only. Retain limits; establish alerts and a reviewed capacity decision before approaching them. Backups include database-stored generated document content, not a complete archive of physical COR/COG papers. Physical storage references require the office's separate custody process.

Existing production backup metadata uses desktop staging to `C:/LDSS-Drive-Sync`, local archives under `C:/ProgramData/LDSSBackup/archives`, and a separately configured key. The inspected status has lastBackup/lastStaged values, `pending:0`, but **lastUpload and lastRestore are null**; a file-restore timestamp is older. Desktop staging is not proof of off-host delivery or of restoration with this 66-compatible release. Key contents were not read. The default local backup CLI is development-bound; use the reviewed explicit production-context path, not an `.env` repoint.

R2 must witness retrieval from the actual off-host destination with separate key custody, restore into a **new isolated database**, verify journal/checksums/schema/data/constraints/views/triggers and matching application behavior, record elapsed recovery time/data-loss interval, then remove only the owned rehearsal target. Agree RPO/RTO and operator/alternate responsibilities; do not invent them from historical guides. Back up the matching full release, configuration and protected keys separately. Test unattended schedule, failure reporting, disk-full behavior and reboot/crash supervision without host interactive login. MariaDB DDL is not an all-or-nothing transaction: partial migration detection means stop for reviewed forward recovery, never blind rerun, downgrade or overwrite newer records.

## Performance and small office acceptance

Use existing evidence without treating delivery conditions as interchangeable:

| Workspace | Existing local observation | Meaning |
|---|---|---|
| Dashboard | U1 Vite full readiness Staff **578/592/584 ms**, Coordinator **687/704/717 ms**, 10 requests | Fast bounded summaries; costly detailed assessments remain optional. |
| Registry / Profile | U1 Vite medians Registry **2,288 / 2,055 ms**, Profile **1,278 / 913 ms** Staff/Coordinator | Slower Staff observations retained; actual LAN throughput/concurrency unverified. |
| Opened Payroll | U1.1 roster readiness roughly **391–506 ms Staff / 428–498 ms Coordinator** across samples | Saved 25-row reader; no eager secondary evidence read. |
| Import | Existing 1,500-row synthetic import exercises include tens-of-seconds confirmation/rollback paths | Bound/retry evidence, not office workbook timing or simultaneous-user capacity. |
| Recording / reports | Existing disposable financial suites retain atomicity/source guards and complete API/XLSX/PDF outputs | No new LAN load, physical-printer or live-payment certification. |

Sources: [U1 matched/raw performance](../uiux/U1_ACTION_FIRST_WORKFLOW_SIMPLIFICATION_REPORT.md), [U1.1 measurements](../../output/u1-1-payroll-primary-20261026/performance.json), [B2.2 import evidence](../requirements/B2_2_FT5_PRIMARY_UAT_UPGRADE_REPORT.md). Compiled-client comparisons were faster than Vite; they cannot certify cold start or LAN capacity. The existing Vite bundle warning and expensive optional assessments are **not automatic release blockers**. No speculative optimization or UI work is proposed.

Acceptance should use two authorized office PCs concurrently, named Staff and Coordinator, the proposed compiled release and a separately authorized small source packet: search/permanent-ID reuse, all profile tabs, 20–50 representative rows including abbreviations/course-pending/mixed classification, receiving versus verification and Masterlist review. Prove direct API denial of excluded operations in a disposable rehearsal, actual HTTPS/cookies/origin/logout/revocation through the proxy, restricted ports and a reboot without interactive login. Record settled-content timings and failures; no pass threshold or successful office result is invented here. Destructive/retry/financial examples stay in disposable data.

## Validation, preservation and conclusion

LAN-R1 ran only source/hash/configuration reads, read-only primary SQL inventories, local public health/readiness/frontend GETs, public certificate metadata, selected host configuration metadata, dependency audits and secret checks. It did **not** rebuild the protected main distribution, rerun integration drivers, decrypt/read private keys, connect to the existing operational database or exercise account/business commands.

Final comparison in [LAN-R1 preservation](../../output/lan-r1-20261026/preservation.json) found **all 1,321 starting file hashes exact**, with only these three reports added to the protected input paths. All **149 primary table inventories/checksums**, schema objects, **66 migration rows**, runtime grants, role permissions and payment rows match. This includes accounts/password hashes, permanent IDs, annual/academic/import/source histories, Masterlists, frozen financial evidence and notification state. **1,000 scholars / 14 accounts / 1,000 academic records / 1,000 entitlements / 1,000 allocations** remain unchanged; both Paid records retain **2026-10-24**. Audit rows remain **10,462** and sessions **50**, with no checksum change or appended event in this comparison. Primary process commands/ancestry and all sampled listener owners match. Installed environment/proxy/startup/release metadata hashes are also exact. Task-local evidence/helpers are additional files outside the protected application inputs; no existing source/configuration/distribution file changed.

**NO-GO now; a restricted pilot is achievable after B1–B3 implementation, dependency disposition, target/data approval, and witnessed network/account/recovery/office acceptance.** Full financial enablement additionally depends on its separately approved policy/implementation scope. No operational configuration, data transfer, port opening, runtime restart, feature enablement, annual rollover or UI change was performed. Stop after LAN-R1 reporting; LAN-R2 remains unexecuted.
