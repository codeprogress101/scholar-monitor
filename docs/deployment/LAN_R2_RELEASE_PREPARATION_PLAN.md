# LAN-R2 — Release preparation plan (not executed)

26 October 2026, Philippine time. **Planning only. Separate authorization is required before implementation, provisioning or deployment.** Current recommendation remains [NO-GO](LAN_R1_DEPLOYMENT_READINESS_REPORT.md). This plan prepares one restricted operational pilot while preserving U1.1 synthetic UAT and any legitimate existing LAN records.

## Scope and target contract

Proposed pilot: named Staff/Coordinator registration, source-backed New/Continuing intake, document receiving/verification, annual academic review, Admission and authorized Masterlist work, with bounded profiles/reports. Financial writes remain unavailable; graduation writes are initially deferred. No rollover, UI redesign or synthetic data transfer.

Before commands exist, complete and approve this target record:

| Required value | Decision / invariant |
|---|---|
| Existing LAN installation/data | Custodian identifies current use and records; **unknown is a stop**. If history is retained, replace the empty-start branch with a separately reviewed upgrade plan. |
| Operational database/runtime | New approved names and unique credentials; localhost-only, separate from UAT, no global/DDL privileges in runtime. Do not assume the currently configured production database is empty. |
| Release directory/identity | One immutable release outside webroot, manifest hash, dedicated supervisor identity, read/write ACL map. |
| HTTPS entry/backend | One approved trusted hostname/origin and secured entry; loopback backend on a reverified free port. Existing 3443/3002 and retained listeners are occupied, not free defaults. |
| Office acceptance owners | Named Staff/Coordinator participants, technical/network operator, data custodian and responsible financial-policy authority. |
| Backup/recovery | Separate private key custody, local + verified off-host destination, operators/alternate, office-approved RPO/RTO and rollback stop point. |

The exact protected synthetic target remains `ldss_primary_test_12676_61497616`, runtime `ldss_primary_12676_61497616@localhost`, 5173/3001. Do not repoint its `.env`, change its launcher, stop it or use its accounts/data for operational setup.

## Phase 1 — Small required development package

Use the freshly reverified dirty U1.1 baseline in a temporary isolated build/rehearsal directory. Preserve overlapping later legitimate edits. Do not use the intentionally retained workspace distribution or promote an older review archive as a complete release.

1. **Empty bootstrap adapter (B1).** Add an explicit operational-empty target contract to the supported provisioning path. Verify host, schema name, ownership, absence of pre-existing objects/accounts, exact accepted 66 SQL hashes, lock/journal semantics and partial-DDL rejection. Preserve F53–F56 test/primary safeguards. Reuse the migration/grant library with reviewed target-specific preflights; do not add `--force`, skip validation, rename operations as `_test_`, edit applied SQL or weaken existing callers. Provisioning administrator credentials are transient and separate from runtime. If existing legitimate data is found, stop without mutation.
2. **Account operations (B3).** Provide a compiled or otherwise packaged target-bound trusted-operator CLI wrapping existing audited AuthService/AuthorizationService operations. Support create/activate, reset, disable/enable, roles/version/reason and revocation. Check production target/origin, authorized OS operator and private activation delivery. No development-mode workaround, browser account UI, default password, shared account or UAT credential copy. Audit bootstrap operator identity; technical Administrator remains technical.
3. **Restricted pilot boundary (B2).** Inventory every command and classify allowed, excluded and mixed-purpose behavior. Implement a separately approved server-enforced pilot mode/operation boundary that fails closed independently of UI and existing optional flags. Cover payroll finalization/processing, payment recording/corrections, reconciliation closure/Treasury, individual/omitted settlement/documents, historical conversion/setup/append and any mixed route with excluded effects. Evaluate approved-selection/prior-approval imports explicitly: they can record annual selection and Continuing acceptance. Preserve allowed receiving/academic/Masterlist actions and original RBAC. Do not create new office authority or claim an HTTP GET is necessarily non-auditing.
4. **Dependency remediation.** Resolve compatible production Zod, both fast-uri branches and Fastify findings; review/fix dev tooling findings in the controlled build environment. Capture lock diff, full/prod audits and rationale; no blind major upgrade or automatic audit fix. Use the validated runtime/database versions or rehearse a deliberately selected patched alternative; assess vendor lifecycle before freeze.

No new business-schema migration is presently justified by these gates. If implementation discovers a real schema requirement, stop and submit the specific change separately rather than silently changing the 66-compatible contract.

## Phase 2 — Disposable rehearsal and complete release

1. On a newly owned **disposable** target, rehearse the adapter from no database to exact 66-schema readiness. Verify all journal checksums, tables/columns/constraints/indexes/views/triggers and runtime grants. Assert zero scholar, payroll/payment, fake approval, account/session/import data; retain expected structural seeds only. Confirm no synthetic schools/courses or fixture sources. Identify seeded signatory settings for explicit office review.
2. Test wrong host/schema/runtime, existing target, unexpected checksum, partial migration, stale proof and concurrent installation attempts: fail before unauthorized changes. MariaDB DDL may persist on failure; record exact prefix and use reviewed forward/new-target recovery, never blind rerun or downgrade. Never run these probes on retained primary/operations.
3. Test named Staff, Coordinator, technical Administrator and unassigned accounts; private password activation/reset, rate limits, idle/absolute expiry, logout/revocation, fresh role removal, audit-failure rollback. Prove prohibited financial calls fail directly through API even with otherwise authorized Staff/Coordinator credentials. Test allowed workflows and mixed import boundaries independently.
4. Run normal lint/typecheck/build/unit/secrets, full and production audits, and relevant disposable auth/RBAC/notifications/intake/academic/Masterlist/financial regressions. Keep complete source/output checks and bounds. Re-run checks after final package changes; do not adjust financial pins to obtain a pass.
5. Build once from final reviewed source: template generation, Vite client, server compilation and report-asset copy. Package full `dist`, runtime dependencies from the reviewed lock, release metadata/checksums, required private download document and the reviewed operational/backup helpers. Production runtime must not depend on an exposed Vite/tsx watch server. Test the package from a clean directory with development dependencies absent; ensure any operational helper runtime dependencies are deliberately included or run from the separate protected operator toolset.
6. Validate generated XLSX/PDF/HTML/Word, PDF fonts/licenses, branding/template assets and local browser fonts from the package. Confirm private credentials, activation links, backups, real/synthetic fixtures, `.env` and keys are absent. Preserve logs and exact rollback artifacts. The current U1.1 review ZIP omits server assets and cannot replace this full-package rehearsal.

Temporary rehearsal databases/servers are owned and removed after evidence; avoid multiple permanent candidate services.

## Phase 3 — Configuration and office source preparation

Prepare a reviewable private operational configuration and access plan before activation. No actual credentials belong in reports, source control or the client bundle.

| Configuration | Required choice |
|---|---|
| `NODE_ENV`, `APP_ENV` | `production` / `production` |
| `HOST`, `PORT` | `127.0.0.1` and the approved non-conflicting backend port |
| `APP_ORIGIN` | Exact approved HTTPS origin including non-default port, no path/query |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Verified separate target and unique least-privilege runtime; root/setup credentials never in runtime |
| `TRUST_LOOPBACK_PROXY` | `true` only for the verified loopback-only proxy path; do not trust arbitrary forwarded headers |
| `SESSION_IDLE_MINUTES`, `SESSION_ABSOLUTE_HOURS` | Office-approved values within supported limits; defaults 30 minutes / 8 hours, not a new policy decision |
| `BACKUP_STATUS_FILE` | Private target-bound status metadata; scoped ACLs |
| Five optional financial flags | Explicit `false`: individual payments, omitted payments, individual documents, individual settlement, historical multibatch |
| Graduation write flag | Explicit `false` initially; does not disable all formal standing routes |
| New pilot boundary | Exact separately approved implementation/configuration contract from Phase 1; no invented existing flag name |

After approved target provisioning, bootstrap named accounts so authorized users establish official year/semester dates and working year, current signatories, legitimate reference data, requirement definitions and physical receiving/verification policy. Structural migration defaults are not office approval. Technical operators do not invent dates, classifications, forms or approval evidence.

The office then supplies a small genuine first-year packet/workbook. Preserve first digital year policy: a Continuing scholar may have genuine prior participation evidence without fabricated earlier LDSS annual records. Preview exact name/permanent-ID identity reuse, mixed classifications, abbreviations/different descriptions, course-pending exceptions and duplicate conflicts. Require per-row supported resolution and reviewed correspondence; do not normalize incompatible sources into agreement. No import confirmation until the office approves the actual preview. Receiving COR/COG, verification, Admission and Masterlist preparation/review/publication remain separate accountable steps.

## Phase 4 — Secured host, recovery and acceptance

Only after separate implementation/deployment authorization and the target gate:

1. Configure one compiled Node service outside webroot, restricted runtime, trusted same-origin HTTPS proxy and named network access. Preserve the existing LAN installation until its owner approves exact disposition; preserve synthetic/retained ports and artifacts. Do not use Vite or expose MariaDB/backend. Protect config/key/backup/log roots from web serving and unauthorized OS users. Verify served headers and certificate chain from office PCs, not just certificate file dates.
2. Prove unattended app/proxy/database startup after reboot with no interactive ADMIN login, crash restart/backoff and failure alerts. Verify exact supervisor executable/working directory/identity, graceful stop, log redaction/rotation, disk capacity and power-loss handling. Existing task metadata alone is not proof. Do not test power interruption against legitimate transactions.
3. Configure target-specific encrypted scheduled backups and off-host copies. Measure raw SQL/archive bytes, maximum rows/table and document/audit growth against existing limits; define alert owner/headroom response without silently raising limits. Keep encryption key separately recoverable under approved custody; verify ACLs and alternate operator access.
4. **Witness recovery:** retrieve a copy from the actual off-host location, record its hash/age and compatible release; use a separate private key delivery path; restore to a newly owned isolated schema/account. Verify data/counts/schema, exact 66 journal, triggers/views/constraints and appropriate restricted-runtime behavior using the matching package. Exercise representative source/history reads, permission denial and generated outputs on rehearsal data. Measure elapsed time and last recoverable transaction against agreed RPO/RTO. Delete only the witnessed disposable target after approval; retain signed evidence. No restore over primary or operations.
5. **Two-PC acceptance:** approved Staff and Coordinator work concurrently through the actual hostname/HTTPS. Verify secure cookie flags, origin/CSRF failure, logout and role revocation, approved versus unauthorized network access, backend/database denial and browser trust. Walk through 20–50 representative source-backed rows in the authorized pilot rehearsal: registration/duplicate reuse, profile/year context, Excel preview, receiving versus verification, academic review, Admission and Masterlist actions. Record cold and settled timings/errors; no financial release is part of the walkthrough. Keep destructive/error/retry fixtures in a disposable copy.
6. Record named office acceptance, operational operator signoff, recovery evidence, remaining restrictions and exact release/config hashes. If a required test fails, remain NO-GO, diagnose the concrete failure and re-run only affected evidence plus necessary regression checks.

Live real-scholar intake or public access is not implied by writing this plan. It requires the separately authorized activation gate and approved data packet.

## Separate financial gate

Keep excluded writes unavailable after pilot acceptance. Q28 timely-request continuation and Q29 physical timeliness evidence require an exact approved implementation; Q30 late/historical releases require the signed source, Coordinator review and written releasing-office confirmation contract; Q31 requires approved OR/DV forms and compatible reviewed adapters. Existing draft adapters reject non-draft forms, so this is not a config-only enablement.

Bring forward the existing decision log and current-year plan, asking only for specific missing source documents/dispositions. Do not repeat a full requirements questionnaire, infer payment authority from a test, extend deadlines or invent prior histories. Only a separately approved financial release can alter restrictions after source/retry/atomicity/output acceptance. Masterlist publication never establishes Paid status.

## Rollback and disaster recovery

Before activation, capture then-current file/config/data/account/grant/audit evidence and a verified recoverable checkpoint for the exact intended target. Preserve the old compatible complete application, dependency lock and protected configuration. Define a maintenance owner and a point before real intake at which a newly owned empty setup can be abandoned safely.

For a failed presentation/application activation with compatible schema, return atomically to the saved compatible package/configuration, retaining logs and **all legitimate post-checkpoint data**. Never replace operations with the synthetic database or copy stale rows over new transactions. If old code is incompatible with the installed schema, stop and use the tested compatible package/forward recovery; do not downgrade migrations.

For partial DDL/corruption, isolate the affected environment, preserve evidence and last known transaction history, restore the verified backup into a **new** database with its matching app, reconcile legitimate later transactions under authorized review, then authorize a controlled cutover. No blind SQL replay, history deletion or in-place stale restore. A backup is not a substitute for reconciling writes since it was taken.

## Completion criterion

LAN-R2 is complete only when the exact build, empty-target/account/pilot-boundary rehearsal, dependency disposition, host/network controls, off-host recovery and named office acceptance have evidence, followed by separate authorized activation. Use the [GO/NO-GO checklist](LAN_R1_GO_NO_GO_CHECKLIST.md); keep unresolved requirements visible. **None of these implementation or deployment steps was executed in LAN-R1.**
