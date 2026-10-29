# DOC-FORM-1 — Signatories, OR/DV source population and payroll pagination

28 October 2026, Philippine time. **Supported document changes are installed only on [Individual Payments UAT 5181](http://127.0.0.1:5181/), API 3031. New payroll template v3 places the existing complete four-signatory section after each group of up to 20 scholars, including the final partial group. OR now uses the verified source payee and requested town address, as DV already did. Unified persistent signatory management is NOT implemented: it requires a new explicitly authorized guarded configuration/source contract and approved form-role mappings.** No actual UAT document was generated or regenerated, no payment or payroll command was submitted, and primary 5173/LAN were not promoted.

This follows [IP-UAT-1](../acceptance/IP_UAT_1_INDIVIDUAL_PAYMENTS_TEST_ENVIRONMENT_REPORT.md), [IP-UX-2](IP_UX_2_INDIVIDUAL_PAYMENTS_AND_DV_REPORT.md), [P06 document generation](../payroll/P06_DOCUMENT_GENERATION_REPORT.md), the [main payroll contract](../LDSS_MAIN_PAYROLL_DELIVERY.md) and accepted BACKUP-1 safeguards. AGENTS.md, ui-ux-pro-max, Playwright and the document/PDF render guidance were used. Earlier security, migration and financial evidence was reused where the underlying contracts remained exact.

## Verified target and preservation boundary

| Item | Fresh result |
|---|---|
| Frontend / API | **127.0.0.1:5181 / 3031**, dedicated loopback UAT |
| Database / runtime | **`ldss_restore_1793167108097_2b47a744` / `ldss_ipu_cb1da15ff3ac@localhost`** |
| Host / server | DESKTOP-BPLJKRP / 127.0.0.1:3306 / MariaDB 10.4.32 |
| Physical release | `C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release`, own Node/dependencies and isolated cookie namespace |
| Schema | **149 tables / 67 migrations**, original journal and schema unchanged; no F58 |
| Existing UAT payrolls | PAY-001 processed **v11**, PAY-002 Review **v3**, PAY-003 Draft **v2**, unchanged |
| Period | IP-UAT-YEAR / IP-FIRST |
| Controller / API / Vite | **58304 / 10748 / 59752 → 57796 / 22456 / 4300**, only the verified UAT tree restarted |

The user's original individual Paid transaction **8b20c2a7-74b8-4276-859b-3dc3906760aa**, actual date **2026-10-28**, remains exact. All three raw payment rows remain: one original payroll Not Paid/Unclaimed, one payroll Paid dated **2026-10-19**, and the later individual Paid. Both roles' current Dashboard reads still return **2 Paid / PHP 10,000.00**. Payment history, documents, approvals, command ledgers, deferrals and frozen sources are preserved. [Inventory](../../output/doc-form-1-20261028/inspection.json), [final database comparison](../../output/doc-form-1-20261028/final-preservation.json).

Fresh BACKUP-1 capture included that existing settlement: **1,910,221 SQL bytes / 480,629 encrypted bytes**, archive SHA-256 `829814e6773903960f4da64f57b41ba912a05d65d3eba6376b101dd2919cd1f8`. Complete restoration into a newly owned copy passed all **149 tables**, values/counts/checksums, schema/journal, indexes, constraints, triggers, executable views and rejection probes. The restored copy supplied mutation tests and was removed with its scoped runtime/definer accounts. Nothing was restored over 5181 or primary. Private key/archive custody and finite backup limits were unchanged. [Recovery](../../output/doc-form-1-20261028/recovery.json), [cleanup](../../output/doc-form-1-20261028/cleanup.json).

## Existing signatory contract and the stopped portion

The current **PAYROLL_SIGNATORIES** setting is **version 1**, exactly four strict ordered **name/title** pairs. Its existing generic configuration command reauthorizes **configuration.manage**, checks expected version, serializes configuration changes, records before/after audit and a durable configuration-command retry result atomically. Only **System Administrator** has that permission in the actual UAT. Staff and Coordinator have configuration.read and ovr.process; neither receives configuration.manage here.

The four present payroll certification slots remain **grantee certification / approval for payment / Treasurer certification / disbursing-officer certification**. They currently name the existing Chair, Mayor, Treasurer and Disbursing Officer. **There is no explicitly configured Scholarship Coordinator name.** The Disbursing Officer was not relabelled as that Coordinator, and the signed-in Coordinator account was not used as a document official. Current payroll readers return both the names/titles and signatoryRevision; managed candidate source hashes include that configuration and template version. Finalization freezes the form/signatories in its existing immutable snapshot.

Individual documents instead use the IP-UX-2 optional UAT renderer. Its existing fictional DV preset is snapshotted into each generation's template metadata/hash by the unchanged document writer; it is not a centrally editable or office-approved setting. The default production renderer is unchanged.

The request expressly says: **“If persistent configuration requires a new schema, permission or guarded writer, document the minimal contract and implement only after explicit authorization.”** Extending the four-name payroll setting to effective-dated shared officials and new document-role semantics changes its guarded write/source contract. **That portion is stopped.** No new setting, writer, endpoint, permission, Manage Signatories UI, office-policy record or database migration was added. Authorized-edit/stale-config/rollback acceptance for a new unified writer therefore remains future work, not a claimed feature.

| Proposed shared official | Prospective mapping / required decision |
|---|---|
| CAROLINE MAISIE J. ROBLES / Municipal Accountant | Existing fictional DV A reference; future Payroll capacity requires approved certification mapping |
| RODANTE V. FORBES / Municipal Treasurer | Existing fictional DV B reference; future Payroll mapping must retain actual certification meaning |
| ROSSANO C. VALENCIA / Municipal Mayor | Existing fictional DV C reference; prospective Payroll approval role |
| Scholarship Coordinator | **Name and authorized certification capacity still required**; Payroll only |
| OR | **Do not force the above names into incompatible blocks.** Retained reference A/B uses Municipal Administrator and Budget Officer capacities; approved OR mapping is required |

The minimum separate authorization should approve: a strictly bounded typed shared-official record and document/block mapping; printed name/position/capacity; effective-on date and version; reason plus authority reference; a specifically authorized business role; and one scoped guarded update operation with expected version, idempotency, audit and rollback. Do not grant generic configuration.manage to Coordinators as a shortcut. An existing narrow business permission may be reused only after that authority is explicitly decided; otherwise a new scoped permission needs approval. Every document review/source hash and immutable template/payroll snapshot must bind the selected configuration version/content and revalidate it at commit. Missing required officials must block the relevant new form, with no guessed name or account-based fallback.

Existing settings, audit and document snapshots may suffice for an immediately effective prospective record; **no schema change is demonstrated as necessary yet**. Scheduled effective versions or an independently queryable immutable registry require a separate storage decision before promising that behaviour. No schema/permission/write approval is inferred from this design finding.

## DV and OR mapping and references

The retained **OBR.pub** reference and [its rendered OR page](../../output/p06-documents-20261022/references/OBR-page-1.png) were found and visually inspected. P06 records SHA-256 **6b7b76fcf032d7ad55f8c5dbb346f7acabe5b2242c881a6a09381694ac4f43b6** for that source. It has Administrator and Budget Officer A/B certification capacities. It is a prior sample, **not approval of a current individual-payment OR or its incumbents**. IP-UX-2's inspected DV photograph remains the DV-only reference; its accepted DV structure is retained.

| Field | Current treatment |
|---|---|
| Payee on OR and DV | Verified full name from the existing DocumentSource; optional client payee text cannot override either form |
| Address | Requested **DAET, CAMARINES NORTE** form text; no Registry address was changed |
| Year / semester / programme / amount | Existing authorized source, route explanation and exact integer centavos/amount words |
| Optional office / explanation | Existing bounded fields retained; they cannot alter identity, source eligibility or amount |
| Official OR/DV numbers, TIN, actual dates/signatures | Blank without authoritative evidence. The current DocumentSource exposes an **internal LDSS reference**, not an assigned official voucher/obligation number; it remains labelled internal in the footer |
| DV printed officials | Retained **fictional UAT preset**, not a new approved configuration or appointment claim |
| OR printed officials | Remain blank pending approved form-specific mapping; no new certification role was inferred |

The optional renderer is now **ip-uat-source-forms/v2**. It retains distinct OR and DV layouts, logos and blank receipt evidence. Its version, allowed fields, source identity, OR treatment and unchanged fictional DV preset are bound into template metadata/hash. The existing generation service still checks source hash, expected document revision and current template before and after rendering, and commits required OR+DV together with their metadata, audit and retry result. No business writer body changed.

The document UI removes the now-inapplicable optional OR payee/address editors. Office and additional explanation remain available. It explains verified source population and the unresolved OR role mapping. Original generation metadata is append-only. A future permitted regeneration must be explicitly requested through existing review/version rules; new renderer metadata may mark an older pending draft as needing review/regeneration. **This task generated no document on actual 5181, including no already-Paid/signed DV or issued OR.**

The existing document tables retain append-only generation metadata but only the **current** binary content. They are not an archive of every superseded DOCX. All starting actual bytes remain exact here because no actual regeneration occurred. Before any future authorized replacement that must retain the original file itself, establish its approved byte-archive/storage procedure; metadata alone must not be described as retaining every historical document binary. No new archive writer or storage schema was added.

## Versioned payroll groups and print results

New forms use **daet-sample-v3**. The existing 20-row slicing, ordering, sequential presentation numbering, authoritative row amounts, page totals, period/batch title, blank recipient fields and draft warning remain. Each group gets the full **existing** four-certification/signatory section immediately after its total. This does **not** activate the requested new four-official mapping.

HTML keeps the last scholar row, group total and complete signature section in one unbreakable table body. Word uses non-splittable rows and keep-with-next links from the final scholar through the total and signature rows. The existing 13 × 8.5-inch landscape paper, column widths and branding remain. Export audit reports **daet-payroll-v3** for v3; its guarded audit insertion and authorization are unchanged.

Frozen **v1/v2** forms retain their original layout and final-only signatory policy. Independent comparison against the installed pre-change renderer proved **byte-identical HTML and all 18 Word parts** for both legacy versions, apart from normal generated drawing IDs. No old form was converted to v3, no finalized/submitted payroll was regenerated, and no source snapshot was rehashed or replaced. [Sample/group and legacy parity proof](../../output/doc-form-1-20261028/document-samples.json).

| Scholars | Signed groups | Final group | Word PDF / Chromium HTML PDF pages |
|---:|---:|---:|---:|
| 1 | 1 | 1 | 1 / 1 |
| 19 | 1 | 19 | 1 / 1 |
| 20 | 1 | 20 | 1 / 1 |
| 21 | 2 | 1 | 2 / 2 |
| 40 | 2 | 20 | 2 / 2 |
| 41 | 3 | 1 | 3 / 3 |
| 834 | **42** | **14** | **42 / 42** |

The 834-person fictional sample totals **PHP 4,170,000.00**: 41 full groups of PHP 100,000 plus PHP 70,000. Every rendered page in both 834 PDFs was checked for exact scholar sequence, four officials, draft warning and last-row-before-signatures. The same checks cover all seven requested sample sizes. All text stayed within the page bounds. A separate long-surname/school/reprocessing 20-row stress sample fits one page in both engines. Word page contact sheets and representative full-page images were visually inspected. [PDF checks](../../output/doc-form-1-20261028/documents/pdf-checks.json), [Word print results](../../output/doc-form-1-20261028/word-print-results.json), [HTML print results](../../output/doc-form-1-20261028/html-print-results.json).

The packaged document renderer could not run because LibreOffice soffice.exe is absent. Native Word opened only task-owned sample DOCX files **read-only**, exported PDFs, closed its own documents/application, and the PDFs were rasterized with PyMuPDF. Playwright used Chromium print-to-PDF for the HTML samples. These are print/export checks, **not a new PDF API or office-printer certification**. Arbitrarily longer source text, other printer margins/fonts and other Word versions remain unverified. If a real record cannot fit this paper with its signature section, stop that print release for review; the proposed smallest print-safe alternative is smaller explicitly signed groups under an approved layout revision, rather than clipping, shrinking illegibly or silently accepting a split. No such alternate grouping rule was activated here.

## Before and after evidence

| Evidence | Before | After |
|---|---|---|
| Payroll, 21 scholars | [Word PDF](../../output/doc-form-1-20261028/documents/before-payroll-21.pdf), first group lacks signatures | [Word PDF](../../output/doc-form-1-20261028/documents/payroll-21.pdf), both groups signed; [first page](../../output/doc-form-1-20261028/documents/payroll-21-page-1.png) / [last partial page](../../output/doc-form-1-20261028/documents/payroll-21-page-2.png) |
| HTML payroll | [Before](../../output/playwright/doc-form-1/before-payroll-21.png) | [After](../../output/playwright/doc-form-1/payroll-21.png) |
| OR source fields | [Before PDF](../../output/doc-form-1-20261028/documents/before-OR.pdf) | [After PDF](../../output/doc-form-1-20261028/documents/after-OR.pdf), verified payee/town; certification names still blank |
| DV | [Before PDF](../../output/doc-form-1-20261028/documents/before-DV.pdf) | [After PDF](../../output/doc-form-1-20261028/documents/after-DV.pdf); accepted DV design and fictional preset retained |
| 834 final group | — | [Page 42, fourteen scholars with signatures](../../output/doc-form-1-20261028/documents/payroll-834-page-42.png) |
| Actual 5181 document UI | [Desktop](../../output/playwright/doc-form-1/before-coordinator-document-1440.png) / [mobile](../../output/playwright/doc-form-1/before-coordinator-document-320.png) | [Desktop](../../output/playwright/doc-form-1/after-coordinator-document-1440.png) / [mobile](../../output/playwright/doc-form-1/after-coordinator-document-320.png) |

The generated comparison documents use explicitly fictional sample identities and source values; they are not regenerated user payment records. Owned-copy HTTP-generated OR/DV samples separately exercise the real document writer with copied fictional UAT sources. The 834 renderer test did not repeat intake, approval, payment or migration workflows.

## Files and focused acceptance

**Seven source/test files in the isolated release: six existing changes and one new test.** No repository-root application file was edited.

| File | Change |
|---|---|
| server/ovr/payroll-form.ts | Prospective v3; signed group tail; explicit legacy v1/v2 layout paths |
| server/ovr/payroll-word.ts | Prospective per-group signatures and keep-with-next; legacy parts unchanged |
| server/ovr/service.ts | **Only** the export layout label selects v3; all other source bytes exact |
| server/payments/document-uat-preset.ts | Versioned OR source payee/address; distinct layouts and DV preset retained |
| src/IndividualDocuments.tsx | Remove optional OR identity/address editors; source/mapping explanation |
| tests/payroll-form.test.ts | Current-template expectations require signatures on every group; legacy assertions retained |
| tests/doc-form-1.test.ts **new** | Seven requested sizes, exact totals/order, v2 protection, source override rejection and existing-setting boundary |

Only **four compiled server files** changed. All configuration/permission/schema files, document generation/settlement/correction writers, financial eligibility and allocations, default production document renderer, authentication, dependency and launcher source remain exact. **21,294** starting UAT runtime files remain exact; the current **21,324-file** dedicated integrity manifest passes. Existing hashed assets are retained. Matching source/build was installed after gates with only the verified UAT services stopped. No primary or LAN process was restarted. [Seven-file/compiled inventory](../../output/doc-form-1-20261028/candidate-files.json), [installation](../../output/doc-form-1-20261028/promotion.json), [source/owner proof](../../output/doc-form-1-20261028/source-final.json), [review source ZIP](../../output/doc-form-1-20261028/candidate-source.zip).

| Focused validation | Result |
|---|---|
| Application lint, server/src/tests | Exit **0** |
| npm run typecheck; npm run build | Exit **0**; matching isolated source |
| npm run check:secrets | Exit **0**, **1,385** source/build files scanned |
| Document/payroll/IP-UX-2 focused units | **4 files / 49 tests passed** |
| Existing configuration/recovery contract units | **2 files / 13 tests passed** |
| Owned-copy document integration | **3 groups passed**: authenticated roles / unauthenticated denial / stale source/template; atomic OR+DV / exact retry / changed request / original snapshots; late audit rollback / Coordinator generation / financial/configuration preservation |
| Staged and actual 5181 browser | Staff and Coordinator, **1440 / 1024 / 820 / 375 / 320 CSS px**, keyboard, reduced-motion and authoritative Paid read; **zero business-command attempts** |
| Print | All seven sizes, both engines; 834 gives 42 signed pages; long-text sample passed |

**Full npm run lint is not clean:** the untouched inherited isolated operator file **scripts/ip-uat1/controller.mjs:3** has one no-empty error. Its baseline bytes were preserved; the issue is not in this package. Focused application lint passed without relaxing any rule. [Full lint finding](../../output/doc-form-1-20261028/lint.log), [application lint](../../output/doc-form-1-20261028/lint-application.log), [build](../../output/doc-form-1-20261028/build.log), [49 tests](../../output/doc-form-1-20261028/focused.log), [13 contract tests](../../output/doc-form-1-20261028/authorization-contract-tests.log), [integration](../../output/doc-form-1-20261028/integration.json), [actual browser](../../output/doc-form-1-20261028/after-browser.json).

Native 200% was **not newly verified** in this task; IP-UX-2 records the earlier native-tool/foreground limitation. Responsive/keyboard/print checks above are the new evidence, not a substitute claim of native zoom or full AT/WCAG acceptance. No unrelated security/dependency repair, MariaDB compatibility study, 835-person intake or broad financial workflow was repeated.

Early helpers used an incorrect role-permission join and old table names; actual schema inspection corrected them before mutation. A browser assertion initially counted only visible OR fields while the address was in a closed disclosure; accepted checks count hidden controls too. One additional task login replaced the failed helper's session. Fixture startup initially exceeded a short readiness observation, then its genuine ready response was confirmed without restarting it. The initial browser file-protocol restriction was respected by serving only allowlisted fictional HTML from a temporary loopback server. No validation, source guard or transaction rule was bypassed.

## Final preservation and next authorized task

Primary **ldss_primary_test_12676_61497616** remains exact across **150 tables**, schema/journal, account/role data, business evidence and all **803 Paid records**: **2 dated 24 October, 798 dated 26 October, 3 dated 28 October**. PAY-001 remains processed **v805**, PAY-002 processed **v8**, PAY-003 Draft **v4**. Its **20,319 audit rows remain exact with no additions** during this task. Primary's **21,258-file** release, **1,402 protected existing root inputs**, and retained primary/LAN listener owners pass. No primary app, template, database, session or financial command was changed by this task.

Actual 5181 preserves every starting business-table value and original schema/journal/audit row, including **1 document versions / 1 current contents**, all command ledgers and its user-recorded payment. Its audit count is **309 → 318**, comprising **5 task logins and 4 logouts**, plus ordinary session/rate-limit activity. The failed helper's earlier session was superseded by its replacement login; accepted role sessions signed out with **204**, followed by **401**. Both original audit prefixes match at complete datetime precision. [Full preservation](../../output/doc-form-1-20261028/final-preservation.json), [audit-prefix proof](../../output/doc-form-1-20261028/audit-prefix.json), [scope/acceptance](../../output/doc-form-1-20261028/acceptance.json).

The owned restored schema, scoped accounts and temporary 3032/5182/5183 services were removed. Actual 5181/3031 remains available with the same database; primary 5173 and operational LAN are preserved. No reset, F58, policy activation, signatory setting update, document-history repair or payment was performed. LAN-R2A remains paused.

**Next smallest task:** explicitly authorize the proposed scoped shared-signatory write/source contract and its business role, provide the named Scholarship Coordinator/capacity and approved OR/Payroll block mappings plus authority reference, then implement and test that configuration/editor on a disposable copy before any 5181 activation. Office form/signatory approval, future exact official-number assignment, maximum-length/printer review, and the inherited operator-lint issue remain separate decisions. No primary/LAN deployment authority follows from this UAT package.

**Stopped after the permitted isolated installation, focused verification and reporting. Unified signatory management and the requested new four-official Payroll mapping remain unimplemented pending explicit authorization and missing form/official decisions.**
