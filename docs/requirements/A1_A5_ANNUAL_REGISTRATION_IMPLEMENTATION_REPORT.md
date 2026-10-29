# A1 + A5 — Annual scholar registration

24 October 2026, Philippine time. **Implemented and verified for development and isolated synthetic UAT. Stopped after this batch.** The user's explicit DM-A authorization superseded the earlier design-only stop point. No retained database was migrated, no LAN operation or deployment occurred, and no financial feature was activated.

The implementation follows the [DM-A model](DM_A_ANNUAL_INTAKE_DATA_MODEL_SPEC.md) and [implementation contract](DM_A_REGISTRATION_IMPLEMENTATION_CONTRACT.md). The local ui-ux-pro-max and Playwright workflows were used for the form and browser checks. A2, A4, A6, B1, B2, performance remediation and P11 remain outside this work.

## Result and local access

The independent application is available at **[http://127.0.0.1:3013](http://127.0.0.1:3013)**, bound only to loopback. Its owned schema is `ldss_annual_test_11660_9109ad06`. It contains synthetic import examples, incomplete New and first-digital Continuing registrations, explicit identity reuse, supplements and classification history. It is not a payroll-ready cohort.

Synthetic account emails are `staff@example.invalid`, `coordinator@example.invalid`, `system_admin@example.invalid` and `unassigned@example.invalid`. Random passwords remain in the restricted local file `output/a1-a5-registration-20261024/uat-verified/private/credentials.json`; no credential values appear here. The version-matched client is retained in that fixture's `client` directory.

```powershell
node --import tsx scripts/test-annual-intakes-db.ts serve
```

Use that command only when its owned port is free. It neither migrates nor seeds on startup. `create` refuses an existing manifest, and the helper exposes no reset/drop command. The current server is already running. Existing 3011 and 3012 servers were not restarted.

| Office operation | Implemented result |
|---|---|
| New registration | Required explicit working year, New/Continuing choice, source/reference and valid identity. One permanent ID, person, annual root, audit and exact receipt commit together. |
| First digital Continuing | Succeeds without an earlier LDSS academic year or reconstructed grades, admission or beneficiary history. No class is preselected. |
| Incomplete initial information | School, course and year level independently accept genuine NULL; all eight combinations passed. Optional DOB, barangay and contact information remain unknown when omitted. |
| Existing identity | Deliberate duplicate review and same-person confirmation reuse the existing ID. Personal data, registration year and person version stay unchanged. Ambiguous matches are not automatically merged. |
| Later initial completion | Staff needs both `scholars.update` and `academic.edit`. Only missing manual intake fields can be filled, in the available working year, before an academic or annual scholarship record is established. Known values and import roots cannot be overwritten. |
| Classification correction | New `scholars.intakes.correct` permission belongs only to Coordinator. Source, reason, reviewed confirmation, available year and expected revision/hash are required. Original and corrected facts remain visible. |
| Discovery and history | Explicit associated-year search includes intake, registration and annual associations once per person. Selected-year profiles show supplied facts, missing initial details, provenance and bounded history. Legacy-derived labels are identified. Existing filters/defaults retain their meanings. |

Registration and intake changes create **no** academic approval, continuing acceptance, admission, official membership, requirement verification, payroll allocation, entitlement or payment. After authoritative academic completion, placement changes continue through the existing academic workflow. A manual root is never reassigned to an import.

## Exact implementation changes

**38 existing code files changed; 12 code/schema/test files were added**, plus this report and task-owned evidence. The [file-level evidence](../../output/a1-a5-registration-20261024/source-preservation.json) lists every path and the starting-file comparison.

| Files | Change |
|---|---|
| `db/migrations/20261024010000_f53_annual_intake_registration.sql` — new | Manual/import provenance and nullable initial placement on immutable `scholar_intakes`; provenance checks and annual association index; append-only `scholar_intake_revisions` and `annual_intake_commands`; four immutable triggers; Coordinator-only permission seed. Existing root ownership, foreign keys and no-update/no-delete triggers remain. |
| `scripts/annual-intake-preflight.mjs` — new | Restrict F53 to a new PID-scoped owned test schema; check legacy values, ownership uniqueness and immutable triggers; require a recoverability checkpoint for populated upgrades. Incompatibility stops migration. |
| `scripts/migration-lib.mjs`, `scripts/check-database.mjs` | Preflight before F53, optional explicit migration ceiling, exact new-table SELECT/INSERT runtime grants, mutation/DDL denials and schema-63 checks. No global privilege grant. |
| `server/schema-manifest.ts` | Regenerated using the unchanged schema-manifest generator. All 62 previous migration files/checksums remain exact. |
| `server/scholars/annual-intake-model.ts`, `annual-intake-validation.ts`, `annual-intake-source.ts`, `annual-intake-service.ts` — new | Typed strict commands/results, normalized canonical hashes, immutable source/history, guarded transactions, duplicate/beneficiary-source checks, exact receipts and bounded reads. |
| `server/scholars/routes.ts`, `server/app.ts` | Wire strict registration, context, supplement, correction and annual/history reads. New mutations have the approved 8,192-byte body limit and current session/CSRF/RBAC protection. Legacy identity/import routes remain separate. |
| `server/scholars/model.ts`, `validation.ts`, `service.ts`, `registry-placement.ts` | Explicit annual projection/source labels, source-first classification, matching association count/page/filter/sort and initial placement fallback that cannot replace authoritative academic placement. |
| `server/authorization/policy.ts` | Recognize the specifically approved correction permission. Its role grant is in F53, applied only to owned test schemas. |
| `src/AnnualIntakePanel.tsx`, `src/annual-intake-api.ts` — new | Annual form, explicit identity reuse, initial supplements, source/history/correction controls and a separate exact-request recovery namespace using the existing shared navigation guard. |
| `src/ScholarsPage.tsx` | Add Scholar uses the annual command; explicit association discovery, selected-year panel, successful-ID/read-failure handling, pending locks and focus restoration. No Registry default or toolbar redesign. |
| `src/ScholarAcademicSummary.tsx` | Replace the import-only provisional caption with “Supplied initial details.” The profile refreshes after an annual supplement. No academic decision logic changed. |
| `tests/annual-intakes.test.ts` — new | 28 validation, canonicalization, source/history-integrity, bounded query and classification-provenance tests. |
| `scripts/test-annual-intakes-db.ts`, `test-annual-intakes-extended.ts`, `test-annual-intakes-upgrade-db.mjs` — new | Owned synthetic command/upgrade tests, before-migration backup/restore verification, role/source/failure probes and partial-DDL forward-recovery exercise. |
| `package.json` | Three annual-intake test commands only. No dependency or lockfile change. |
| `scripts/test-scholars-db.ts` | Fresh schema count 63 and the new documented `annualIntake` summary property. Existing privacy/duplicate/identity assertions remain. |
| `scripts/test-individual-documents-migration-db.mjs`, `test-individual-settlement-migration-db.mjs` | Explicitly stop at their existing settlement migration, preserving their original 60→62 and 61→62 test scopes. They do not implicitly adopt F53. These two historical harnesses were inspected, not executed in this task. |

These **22 existing bootstrap assertions only** change the fresh-schema count from 62 to 63: `scripts/test-academic-changes-db.ts`, `test-academic-db.ts`, `test-auth-db.ts`, `test-configuration-db.ts`, `test-continuing-rosters-db.ts`, `test-eligibility-db.ts`, `test-export-db.ts`, `test-import-db.ts`, `test-masterlist-amendments-db.ts`, `test-masterlist-workflow-db.ts`, `test-masterlists-db.ts`, `test-notifications-db.ts`, `test-payout-cycles-db.ts`, `test-qualification-db.ts`, `test-rbac-db.ts`, `test-receiving-db.ts`, `test-requirement-instances-db.ts`, `test-requirement-receipts-db.ts`, `test-requirement-waivers-db.ts`, `test-requirement-workflow-db.ts`, `test-requirements-db.ts`, `test-status-db.ts`. Their executable scenario logic is otherwise byte-identical to the starting copies.

The shared configuration guard remains the outer transaction boundary. A new identity uses the existing writer on the same connection, with a separate internal command UUID generated after parent receipt lookup. Reuse does not invoke a profile write. Audit, root/revision and parent receipt commit once or roll back together. A completed authorized retry returns its original receipt before checking changed mutable context; a different payload/operation conflicts. Intake revisions never increment `scholars.version` or rewrite financial source pins.

## Acceptance evidence

The DA families below have concrete positive/negative evidence. This is bounded synthetic acceptance, not a claim that every possible historical office case or all future rollover behavior was exercised.

| Contract family | Observed evidence |
|---|---|
| DA01–DA02 | Atomic New and first-digital Continuing; explicit class/year/source; invalid/extra inputs reject; exact replay; no prior digital year or approval manufactured. |
| DA03 | Eight NULL/known placement combinations; blank normalization, invalid IDs/text and missing optional personal information. |
| DA04–DA05 | Same permanent ID/version on explicit reuse; current duplicate snapshot for a separate same-name person; stale identity rejection; competing person/year registrations have one winner; existing root returns a source conflict. Existing import duplicate/ownership regression also passed. |
| DA06 | Concurrent same-key and lost-response retries, changed payload conflicts, rollback at identity/root/audit/receipt stages, additional revision-write failure, and original replay after working-setting version changes. Browser retry retained the exact key/body across reload after an actual owned-fixture commit. |
| DA07 | Null-only supplements, known-value replacement/import-root/stale revision rejection, same-snapshot dual permission requirement, concurrent one-winner update and unchanged person version. Actual academic completion subsequently blocks supplements. |
| DA08 | Staff/Admin/unassigned denial; real Coordinator correction; original/current source history and profile hash agree. Unit probes reject gapped/tampered/out-of-scope history. Actual accepted prior-beneficiary evidence blocks an unsupported New claim. |
| DA09 | Explicit annual facts take priority over legacy Continuing fallback; selected other-year reads do not display the working-year intake. No automatic intake or reviewed rollover was implemented. Actual reviewed N→N+1 continuation remains A4. |
| DA10 | Explicit associated-year query, unique identities, matching class/filter/count projections, 25/50/100 limits and ambiguous-selector rejection; browser permanent-ID discovery. Existing 1,500-person Registry/scalar count and pagination checks passed. |
| DA11 | Mixed New/Continuing/Old import through real stage/confirm before and after upgrade; import origin/raw legacy columns retained; import supplements denied. Existing approved-import, prior-review, Course pending and document/entrant guards passed. |
| DA12 | Protected academic/annual/member/document/payroll/entitlement/allocation/payment snapshots unchanged by intake operations. Existing academic, continuing, Masterlist, historical/payment/report regressions passed; all 11 retained schemas stayed exact. |
| DA13 | Populated 62→63 upgrade; original columns and old checksums exact; runtime SELECT/INSERT with UPDATE/DELETE/DDL denied; root/history immutable triggers. Separate partial-DDL fault, visible blind-retry rejection and inspected forward repair passed. |

Evidence: [main acceptance](../../output/a1-a5-registration-20261024/uat-verified/acceptance.json), [additional source/permission checks](../../output/a1-a5-registration-20261024/uat-verified/extended-acceptance.json), [final backed-up upgrade run](../../output/a1-a5-registration-20261024/backed-upgrade-db.log), [before-F53 recoverability](../../output/a1-a5-registration-20261024/upgrade-backed/upgrade-recoverability.json), [partial-DDL recovery](../../output/a1-a5-registration-20261024/upgrade-recovery/verification.json), [populated F53 history/receipt restore](../../output/a1-a5-registration-20261024/post-upgrade-recovery.json).

The final driver verifies an encrypted backup restore **before F53** on the separate populated `upgrade-backed` fixture. Its backup/key remain private. A post-upgrade restore also verified the browser fixture's populated roots, revisions, receipts, complete inventory and constraints. Temporary restore schemas/accounts were removed by the existing owned-restore helper. The earlier browser fixture was created with the initial hash/input checkpoint; the stronger before-migration restore check was added and rerun independently before accepting the final driver.

## Browser results

Real browser work used the new 3013 schema. New/Continuing registration, physical-office source text, duplicate review/reuse, initial supplements, Staff correction absence, Coordinator correction/history, permanent-ID association search and reload recovery passed. No retained-fixture login or financial command was used.

| Capture | Evidence |
|---|---|
| Completed Add Scholar form | [1440](../../output/playwright/a1-a5/add-scholar-1440.png), [1024](../../output/playwright/a1-a5/add-scholar-1024.png), [820](../../output/playwright/a1-a5/add-scholar-820.png), [320](../../output/playwright/a1-a5/add-scholar-320.png) CSS pixels |
| Supplied annual facts | [New](../../output/playwright/a1-a5/new-profile.png), [Continuing](../../output/playwright/a1-a5/continuing-profile.png), [supplement/history](../../output/playwright/a1-a5/supplement-history.png) |
| Identity and recovery | [Explicit reuse review](../../output/playwright/a1-a5/identity-reuse-review.png), [uncertain committed request](../../output/playwright/a1-a5/uncertain-registration.png) |
| Correction and discovery | [Coordinator review](../../output/playwright/a1-a5/coordinator-correction-review.png), [retained original/corrected history](../../output/playwright/a1-a5/coordinator-correction-history.png), [annual association search](../../output/playwright/a1-a5/associated-year-discovery.png) |
| Refreshed placement summary | [Supplied school/course after supplement](../../output/playwright/a1-a5/supplied-summary-refreshed.png) |

Form widths/scroll widths were respectively **1087/1085, 731/729, 551/549 and 269/267 pixels**: no form-level horizontal overflow. Classification initially remained unselected. After context loading, heading→Tab reaches the class selector; Cancel restores Add Scholar focus. Existing dark-green styling and native form controls remain. These checks do not certify whole-application WCAG conformance. [Form/focus evidence](../../output/a1-a5-registration-20261024/browser-final-form.log), [reuse](../../output/a1-a5-registration-20261024/browser-reuse.log), [correction](../../output/a1-a5-registration-20261024/browser-correction-result.log), [final refreshed-summary/focus check](../../output/a1-a5-registration-20261024/browser-final-check.log).

For lost-response testing, the browser forwarded the first registration to the owned server, then discarded its response. The exact request remained locked and survived reload; retry returned the original receipt, not another person/root. The same script subsequently supplemented that Continuing intake. The CLI briefly reported the native beforeunload modal while its accepting handler and script continued; a later explicit modal-accept call found no modal. The completed profile/history and database receipts confirm the continuation.

Exploratory failures were corrected as test assumptions: a label locator included select-option text; keyboard sampling initially ran before context enabled the fieldset; a post-correction text locator matched both the visible value and an option. No extra correction was committed to repair that locator. Initial schema fixture attempts also stopped on a wrong test table name, legitimate similar-name duplicate detection and the existing unfinished-year guard. Those owned diagnostic datasets/logs were retained, without weakening any guard or resetting an environment.

## Commands and regression results

All final checks below exited **0**. The normal build was used; no lint rule, strictness setting, check or financial limit was disabled.

| Command | Result |
|---|---|
| `npm run lint` | Zero errors/warnings. [Log](../../output/a1-a5-registration-20261024/lint.log) |
| `npm run typecheck` | All configured projects passed. [Log](../../output/a1-a5-registration-20261024/typecheck.log) |
| `npm run build` | Normal complete build passed. Existing Vite chunk-size warning remains. [Log](../../output/a1-a5-registration-20261024/build.log) |
| `npm test` | **99 files, 631 tests passed**, including the 28 new annual-intake tests. [Log](../../output/a1-a5-registration-20261024/tests.log) |
| `npm run check:secrets` | Passed, 1,202 source/build files. [Log](../../output/a1-a5-registration-20261024/secrets.log) |
| `node --import tsx scripts/test-annual-intakes-db.ts create` | Main contract suite passed; final driver rerun with `LDSS_ANNUAL_OUTPUT` pointing to a new `upgrade-backed` child. [Log](../../output/a1-a5-registration-20261024/backed-upgrade-db.log) |
| `node --import tsx scripts/test-annual-intakes-extended.ts` | Additional real beneficiary-source, permission, CSRF, context/retry, academic-completion and revision-failure checks passed. [Log](../../output/a1-a5-registration-20261024/extended-db.log) |
| `node scripts/test-annual-intakes-upgrade-db.mjs` | Interrupted-DDL containment/forward repair and incompatible-preflight fault injection passed. [Log](../../output/a1-a5-registration-20261024/upgrade-recovery.log) |
| `npm run test:scholars-db` | All 17 scenarios, including duplicate/ID/privacy/1,500-person Registry checks. [Log](../../output/a1-a5-registration-20261024/test-scholars-db.log) |
| `npm run test:academic-db` | All nine academic scenarios. [Log](../../output/a1-a5-registration-20261024/test-academic-db.log) |
| `npm run test:continuing-rosters-db` | All eight scenario groups, including receiving/timing and reviewed membership bridge. [Log](../../output/a1-a5-registration-20261024/test-continuing-rosters-db.log) |
| `npm run test:masterlist-workflow-db` | All 11 official-masterlist scenarios. [Log](../../output/a1-a5-registration-20261024/test-masterlist-workflow-db.log) |
| `npm run test:imports-db` | Existing 13 import scenario groups, including 835-row mixed approved import. [Log](../../output/a1-a5-registration-20261024/imports-db.log) |
| `npm run test:omitted-payments-historical-db` | All 13 import groups plus genuine same-import historical omission/source/frozen-evidence checks. [Log](../../output/a1-a5-registration-20261024/historical-regression.log) |
| `node --expose-gc --import tsx scripts/test-eligibility-db.ts --main-payroll --payment-recording --payroll-reconciliation --financial-reports --registry-parity` | Passed: eligibility/Registry parity, real recording/retry/conflict checks, reconciliation, immutable Original/Updated, financial API/XLSX/PDF and populated closure backup/restore. [Log](../../output/a1-a5-registration-20261024/financial-regression.log) |
| `npm run test:individual-payments-db` | Passed existing individual route, payment-recording and reconciliation coverage. [Log](../../output/a1-a5-registration-20261024/individual-regression.log) |

Financial-driver artifacts used task-specific `LDSS_P02_OUTPUT`, `LDSS_P03_OUTPUT` and `LDSS_TEST_REPORT_OUTPUT` directories. Mutations ran in their owned disposable schemas. No full `test:uat`, new benchmark, named office acceptance or new P10 certification is claimed. The two bounded historical migration harnesses above were not run against the development database; F53 upgrade/recovery evidence came from newly generated synthetic data.

## Preservation and remaining boundaries

Read-only before/after snapshots matched **all 11 retained schemas**, covering development, A–F, V1, V2, 3011 and 3012: all table data, definitions, counts, original audit rows and existing grants are exact. **There were no authentication differences.** Newly declared task-owned runtime identities are excluded from the existing-grant comparison by their exact names, not a broad wildcard. [Database evidence](../../output/a1-a5-registration-20261024/preservation.json).

Read-only, version-matched service checks reconfirmed **3011: 800/200 Pending, `canRecord:true`, zero payments**; **3012: 798/198 Pending, two Unclaimed per payroll and the same seven payment records including three individual Paid**. The same original processes still listen on 3011/3012. [Readiness evidence](../../output/a1-a5-registration-20261024/readiness.json).

Of **1,107 starting files, 1,062 match unchanged**. Differences are the declared 38 existing code inputs and seven generated server outputs. All 62 old migrations, `.env`, dependency versions/lockfile, lint/TypeScript configuration, prior reports, retained fixture helpers and protected financial/academic/authorization-operation implementations are unchanged, except the explicitly approved policy code and application wiring/read additions listed above. Existing client artifacts were restored for the running schema-62 fixtures; the new client is served from the owned versioned directory. Original source/build copies remain in the task's `baseline` archive. [Source evidence](../../output/a1-a5-registration-20261024/source-preservation.json).

Retained schema-62 fixtures must continue using their matching archived source/client if restarted later; current schema-63 code must not silently migrate or be paired with them. The main configured development database remains unmigrated. F53's current preflight intentionally refuses retained/development schemas. Applying it outside the owned test scope needs a separately reviewed release/migration procedure.

The task retains its declared synthetic diagnostic/acceptance schemas and encrypted private recovery artifacts; none was destructively reset. There is no cleanup timer, payment action or automatic continuation. Normal rollback cannot delete new evidence: preserve compatible readers and stop new writes; inspect partial DDL for forward repair rather than pretending MariaDB DDL is transactional.

Remaining limits: manual registrations do not transparently enter the approved-import lane (A2); reviewed rollover (A4), working-year Registry default (B1), graduation and other enhancement batches are unchanged. Initial supplements stop when authoritative academic/annual evidence exists. Locked/archived years have no correction override. Browser recovery depends on the retained browser session/storage; storage failure is visibly reported and the tab must remain open. History currently identifies actors by stored IDs. No broader financial or legal authority follows from a supplied class/source.

**Stopped after A1+A5 implementation, isolated verification and this report.** Payroll, document verification, Masterlist approval, eligibility, historical multi-batch, Payment Recording, Individual Payments, reconciliation, reports, R01–R07 and P01–P10 safeguards remain intact. No deployment, LAN change, operational activation or next enhancement batch was started.
