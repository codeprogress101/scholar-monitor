# LDSS project instructions

Applies throughout the LGU Daet Scholarship Monitoring System repository. Follow higher-priority instructions and the current task's explicit scope. These standards do not authorize business writes, financial-policy changes, migrations or deployment.

## Priorities and existing guidance

Use this order: **data/financial integrity → security/authorization → correct business workflow → reliability/recovery → performance → usability/accessibility → visual polish**. UI/UX remains required; it must preserve the higher priorities.

- Preserve valid existing instructions, architecture and accepted implementations. Read relevant implementation reports before changing their workflows; reports and older README checkpoints are not current environment inventories or deployment authority.
- Start with [README.md](README.md) for orientation and the [current-year workflow plan](docs/requirements/LDSS_CURRENT_YEAR_WORKFLOW_PLAN.md) for applicable policy boundaries. Verify current code and authoritative records when facts may have changed.
- Retain React/TypeScript/Bootstrap, Fastify and MariaDB/MySQL conventions. The UI calls payouts **Payroll**; preserve compatible internal `ovr` identifiers.

## UI/UX and interaction

- For every frontend, interface, navigation, layout, form, dashboard, workflow or user-interaction task, **read and apply [ui-ux-pro-max](.agents/skills/ui-ux-pro-max/SKILL.md)** and applicable references. Use the installed Playwright skill for relevant visual/interaction verification; on this host it is at `C:/Users/ADMIN/.codex/skills/playwright/SKILL.md`. Report an unavailable skill; never claim to have applied it.
- Follow established LDSS layouts, colors, hierarchy, Manrope/DM Sans typography, tables, dialogs, search controls and buttons. Do not introduce a competing design system or redesign working screens outside the task.
- Use the smallest effective change: action-first layouts, visible primary actions, meaningful concise text, balanced compact spacing, simple navigation, clear status/next actions and efficient keyboard/mobile flows.
- Avoid excessive collapsibles, repeated headings/explanations, duplicate tables, oversized search/action panels, controls buried below long tables, unnecessary confirmations and decorative UI without operational value. Preserve required evidence/approval forms and operational controls.
- Derive deadlines and exact timezone information from authoritative server contracts. Explicitly identify Philippine Standard Time/UTC+8 where applicable; never rely on browser-local time or hardcoded dates as authority.
- For relevant changes verify **1440, 1024, 820, 375 and 320 CSS px**, plus native browser **200% zoom when available**. Check actual CSS viewport/zoom, accessible labels, readable status text, visible focus, appropriate touch targets, keyboard operation, dialog focus restoration, reduced motion and responsive table containers. Prevent unnecessary page-level horizontal overflow. Use Playwright before/after screenshots where relevant; do not claim full accessibility certification from these checks alone.

## Loading, outcomes and recovery

- **Individual actions:** small in-button spinner, concise active label and affected action disabled while pending; keep unrelated operations available where safe.
- **Batch/consequential actions:** reuse the compact blocking progress dialog after existing confirmation. Show operation identity and real reviewed counts when available, with an indeterminate spinner. Block conflicting actions, repeated submission, dismissal and navigation while unresolved; do not add confirmation steps, fabricate percentages/stages or alter backend locking.
- **Read-only loading:** inline spinner/skeleton, not a blocking command dialog. Retain confirmed summaries with freshness labels; provide a working Retry. Unavailable data is not zero or an empty result. Avoid unnecessary polling and timeout increases used to conceal poor performance.
- Distinguish pending, authoritative success, definitive rejection and uncertain outcome. Do not announce success before confirmation; refresh authoritative status/counts after confirmed success and show the actual rejection reason.
- Reuse existing pending-command, idempotency, ledger and recovery contracts. While unresolved, preserve the **exact body, key and expected version**; never silently create a replacement command or claim an unsupported action is retry-safe. Offer only supported exact retry/recovery, retain committed results and prevent duplicate financial/Masterlist operations.
- Preserve session expiry, CSRF and permissions during recovery. Distinguish unauthorized access/expired sessions from transport failures, aborted reads and temporary server errors.

## Performance and read design

- For a slow existing feature: **reproduce → measure baseline → identify bottleneck → make the smallest justified change → measure comparably → prove exact functional/source-data parity**. Never claim an improvement without evidence.
- Treat API response time, SQL volume/database time, memory, payload size and browser rendering as engineering requirements. Report those measurements and concurrent account-request behavior where relevant; qualify cache state, workload and measurement limits.
- Use bounded set-based reads, appropriate indexes and server pagination. Fetch only visible-task data, defer nonessential content and prevent duplicate initial requests where appropriate. Avoid N+1 queries, full-cohort browser downloads, expensive synchronous initial rendering and repeated eligibility assessments that can safely share request-local sources.
- Keep memory, payload, query and concurrency limits explicit. Do not silently truncate requests/results. Do not introduce cross-request caches of mutable financial eligibility or authorization without separately reviewed invalidation/correctness guarantees.
- Give immediate action feedback; keep ordinary navigation, search/pagination and authenticated requests responsive. Large document generation must not unnecessarily block authentication or unrelated reads. Avoid long-held shared locks for expensive read-only work when a proven safe snapshot approach exists.
- These are engineering goals, not unconditional latency guarantees. Set numerical budgets only after measuring the real workload. Never trade source checks, audit integrity, transaction safety or authentication for speed, or solve slowness solely by increasing a timeout.

## Business writes and financial integrity

- Preserve referential integrity, migration checksums, unique constraints, immutable sources, historical snapshots, atomicity and audited before/after changes. Never bypass integrity constraints for convenience.
- Use existing transaction/command-ledger conventions: reauthorize inside the applicable transaction, revalidate current sources and expected versions, prevent duplicates, retain idempotency/exact retry and roll back all related writes on failure. Keep queries/write payloads bounded; partial success must not be presented as complete.
- Keep identity, annual registration/classification, academic/document verification, prior-batch approval, official Masterlist membership/activation, payroll eligibility, review/finalization, official submission/processing, payment recording and reconciliation/reporting distinct.
- **Never equate:** Selected with Activated; published Masterlist with Payable; Finalized with Submitted; Processed with Paid; Deferred with Individually Payable; Unassigned with Unclaimed. Application permission or a successful command does not establish office financial authority.
- Preserve source pins, payment dates, entitlements, allocations, approval history and audit evidence. Never fabricate grades, school/course history, physical receipts, approval/payment dates, amounts or financial authorization. Financial-policy changes require explicit approval; missing office decisions must remain unresolved, not become invented rules.

## Security, environments and preservation

- Enforce least privilege and server-side authorization, including Staff/Coordinator separation; technical Administrator access alone supplies no business approval authority. Disabled frontend controls are never the sole protection.
- Preserve session expiry, CSRF, secure cookies, access controls, credential handling and read/write boundaries. Keep private scholar/payment records, identifiers, passwords, keys and database credentials out of public reports, screenshots and logs; mask shared evidence and restrict private artifacts.
- Before protected environment changes verify the exact host, database, runtime, application profile, source baseline, process/port owners, current records and legitimate concurrent activity. Distinguish historical console output from the current running environment. Default development startup may differ from an accepted synthetic launcher.
- For readiness failures inspect actual configuration and migration journal; do not bypass readiness, run migrations merely to silence a warning, start conflicting launchers or restart unrelated services.
- Use isolated staging and the accepted [BACKUP-1 tooling and safeguards](docs/deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md). Verify complete isolated restoration when required by the task/release gates; preserve bounds and restricted archive/key custody. **All mutation and uncertain-response tests use newly owned disposable synthetic databases.** Clean up only verified task-owned targets.
- Never reset primary synthetic UAT, overwrite newer legitimate records with an old snapshot, copy synthetic scholar data into operational LAN, reset migration/payment history or use credential resets as a workaround. Preserve later source/data during promotion and rollback; do not substitute an outdated ZIP or Git HEAD for the actual dirty baseline.
- Preserve retained builds/environments; build in isolation when a build could overwrite their distribution. Inspect relevant handlers before assuming a GET is mutation-free. Qualify authentication/export audit activity rather than claiming zero database writes.

## Implementation and verification

- Prefer existing architecture, small reviewable patches, typed interfaces, validated inputs, explicit errors, reusable components, clear naming and separation of read projections from business writers.
- Avoid unnecessary dependencies, duplicated business logic, broad unrelated refactors, unbounded loops/queries, swallowed errors, hardcoded deadlines/roles/business amounts and unreviewed schema changes.
- Verify proportionally. For executable changes, where applicable run `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` and `npm run check:secrets`, plus relevant existing database integration and financial/Masterlist regressions.
- Cover authorized/unauthorized roles, normal/failure paths, stale sources/versions, concurrency, rollback, exact retry/lost responses, historical-data preservation, realistic large datasets and relevant responsive/keyboard/reduced-motion behavior. Do not weaken tests, safeguards or bounds to make checks pass; claim only checks actually executed and passed.
- Instructions/documentation-only tasks normally need content, path, link and scope verification; do not touch databases/services or rebuild runtime artifacts without a task reason.

## Release and reporting

- Operational LAN changes require separate authorization. Keep **LAN-R2A paused** unless explicitly resumed; synthetic UAT is not live financial or upgrade authority.
- Before an authorized release verify schema compatibility/migration path, a complete package, dependency/security findings, exact configuration, backup/isolated recovery, named accounts/least privilege, HTTPS/CSRF/sessions/network access and server-side restricted financial pilot boundaries. Rehearse on an authorized isolated copy and obtain documented go/no-go approval. Protect the existing LAN installation and history.
- For significant work report what/why, exact files, tests/results, comparable performance and screenshots where relevant, primary preservation, limitations and LAN implications. Separate confirmed defects, improvements, unresolved policy and deferred work. Never claim full success when a required gate failed.
- Stop at the authorized task boundary. These instructions are ongoing engineering standards, not permission to resume paused work or make unrelated changes.
