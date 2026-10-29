# P08 — Reconciliation Reports and Excel/PDF Exports

Date: **23 October 2026, Philippine time**. Scope: P08 local development and disposable verification only. **Technical verification passed; ready for P08 local acceptance review.** P09–P10, LAN/production deployment and operational payment changes are not authorized.

## A. Implementation

P01–P07 are accepted by the user's P08 authorization. The accepted implementation plan, completion reports, actual P03 closure/correction readers, P04/P05 route evidence, P07 canonical settlements, existing Excel/audit infrastructure, permissions and R01–R07 read paths were inspected. Before editing, all **666 accepted P07 source inputs, 251 build artifacts and 62 migrations** matched. The initial read-only development inventory recorded **137 business tables, 15 schemas and 12 LDSS database accounts**. Existing uncommitted work is preserved separately from P08 changes.

`server/payments/report-{model,reads,export,service,routes}.ts` provide one read-only report projection and download service. `src/FinancialReports.tsx` is lazy-loaded in the new Payroll **Reports** tab and the global `ReportsWorkspace.tsx`; the existing Operational Reports page remains available. Normal workflow: **Choose Payroll → Choose Report → Download Excel or PDF**. Opening Reports loads a paged batch selector; selecting a payroll loads a compact summary and 25-row preview. Search affects the preview, while downloads include the complete selected outcome filter. Section counts and financial subtotals, scope explanations, historical authority and generation time are displayed without technical hashes.

Existing integration changes are limited to `server/app.ts`, `src/App.tsx`, `src/OvrDrafts.tsx`, package/build registration and focused test hooks. `scripts/test-financial-reports.ts` checks the actual protected APIs and files on the existing financial fixtures; three registered suites extend the approved gate. `tests/financial-reports.test.ts` adds seven focused unit cases. The frozen source/build comparison is linked below.

The frozen candidate contains **680 source inputs, 261 build artifacts and the same 62 migrations**. Its [P07-to-P08 inventory](../../output/p08-reports-20261023/candidate-fingerprints.json) identifies 14 additions and eight modifications; no accepted source is deleted and no protected financial/performance module changes. In addition to the application entry points and package files, the modified test hooks are `scripts/test-payment-recording.ts`, `scripts/test-payroll-reconciliation.ts` and `scripts/test-individual-settlement.ts`. Documentation changes are this report and the phase-status updates in the existing plan.

API additions:

| Route | Purpose |
|---|---|
| GET `/api/v1/reports/payrolls` | Searchable, server-paged supported finalized payroll choices |
| GET `/api/v1/ovr-batches/:id/financial-report` | auto/provisional/original/updated/settlement basis, outcome/search/page and source token |
| POST `/api/v1/ovr-batches/:id/reconciliation/exports` | Explicit XLSX/PDF request with expected source token and outcome filter |

**No migration, table, index, grant or financial rule is added or changed.** Report generation writes only its successful download-preparation audit. Existing payment, entitlement, allocation, route, correction, closure, receipt and finalization evidence remain authoritative.

Excel reuses installed **ExcelJS** and the existing `spreadsheetText` escaping rule. The specialized report sheet adds headings, separate sections, numerical peso cells, subtotals, wrapped text and repeated print headers. **PDFKit 0.20.2**, with development types **0.17.7**, is pinned because the application had no actual server PDF exporter; browser printing is insufficient for the requested audited download. [Official PDFKit documentation](https://pdfkit.org/docs/getting_started.html) and its [font/text API](https://pdfkit.org/docs/text.html) were checked. It renders fixed report data without executing HTML, Office, remote templates or user paths. Unmodified Noto Sans Regular/Bold and their [SIL Open Font License](https://github.com/notofonts/noto-fonts/blob/main/LICENSE) are bundled, subset into PDFs and copied beside the compiled renderer by `scripts/copy-report-assets.mjs`. Runtime font/network discovery is not used. No official logo or certification is added.

The dependency audit reports the **same seven pre-existing advisories** before/after: one low, two moderate, two high and two critical, affecting the existing Fastify/Vite/Vitest/concurrently dependency paths. PDFKit introduces no additional reported advisory. No unrelated dependency upgrade or `npm audit fix` was applied. Private before/after audit evidence is retained.

## B. Reporting accuracy and scope

**Provisional** reports use the existing effective payroll outcome/classification SQL. Pending and Withheld/Review remain distinct and unresolved; they are never silently turned into Unclaimed. **Original** reports verify P03 closure and member hashes, positions, exact membership and row/summary amounts. Identity, placement, outcomes, dates, closure actor and verification/override provenance come only from immutable closure evidence. Unsupported or incomplete original rows fail explicitly; current Registry data does not reconstruct them.

**Updated** reports retain frozen identity/placement and apply existing authorized effective corrections. A later canonical individual settlement also makes the updated presentation available without pretending that a payroll outcome correction occurred. Payroll stays Closed. Auto defaults are Provisional before closure, Original after supported closure without a recorded change, and Updated after an applicable correction/settlement. Missing reliable originals are explained, not fabricated.

An original **Unclaimed** row remains in the payroll Unclaimed section after **Paid via DV**. Separate original outcome, effective payroll outcome, payroll amount/date, individual amount/date/status and current entitlement columns preserve both facts. Omitted OR+DV settlements are shown only in **Individual Payment Settlement Information** and identify the source payroll as an omission reference; no membership is inserted. Historical omitted placement uses the stored Coordinator approval's form row where present; absent fields are labelled not recorded.

Current totals count distinct canonical entitlement IDs, including their permanent scholar/semester/benefit ownership. Other payroll attempts and individual settlements are checked through existing effective correction precedence. Duplicate Paid attempts remain visible as conflicts; deduplication does not certify reconciliation or cancel evidence. Existing batch discrepancy/pending-correction flags remain review notices. Individual correction evidence is pinned, and outcomes follow its existing effective decision; the report does not replace the P07 correction queue or treat a pending request as an approved change. Immutable original Unclaimed totals are never reduced by later settlement.

The conservative combined summary is explicitly **the selected payroll roster's entitlement scope**, or **linked individual entitlement scope** in the individual report. It is not an assertion about every scholar in the whole semester. Payroll batch totals remain separately labelled. Within sections, presentation sorts by last name, first name and permanent Scholar ID without rewriting frozen order. Payroll Paid/Unclaimed filters use payroll outcomes. Individual-report Paid filters use current effective entitlement settlement; its Unclaimed filter preserves source Unclaimed rows, including settled DV rows. Section counts/subtotals describe the complete outcome filter; preview search is labelled separately.

All financial summation uses integer centavos. Decimal conversion validates exact strings; conversion to Excel numeric peso cells is presentation only. No claiming cutoff, eligibility, entitlement extension or payment approval is inferred.

## C. Export and visual verification

Both formats consume the same report projection and filters. Files contain reporting basis, generation time in Philippine time, batch/year/semester, counts, section subtotals, overall payroll totals and separately labelled current settlement totals. Original exports exclude current individual amounts rather than claiming that no later settlement exists. They contain no technical source hashes or database IDs. The established business LDSS transaction reference is retained where applicable.

PDF is a real downloadable PDF, using **A3 landscape** for the fifteen required identity/financial/provenance columns, measured wrapping, repeated headers and page numbers. Exceptionally tall cells continue with all their text. Excel uses the matching A3 landscape print setting, a frozen/repeated header, wrapped cells and numeric PHP formatting; the valid OOXML A3 paper ID is explicitly used because ExcelJS's type enum omits it. Formula-like text remains literal.

All seven financial API PDF examples were rendered and checked; representative XLSX files were printed through native Excel. The full 835-member Updated report uses **46 A3 landscape server-PDF pages**; native read-only Microsoft Excel printed its matching workbook into **25 A3 landscape pages**. Every scholar ID occurs exactly once, and every complete name, historical school/course, payment date, individual reference and summary amount is present. All physical pages in these full-volume outputs passed repeated-header, page-number, orientation and text-bound checks. Contact sheets and representative first/middle/last pages were viewed. Excel and server PDF paginate differently; rows and financial totals agree. This is separate from the unchanged 20-scholars-per-page payroll renderer.

Examples: [835 XLSX](../../output/p08-reports-20261023/unclaimed-settled-835.xlsx), [835 PDF](../../output/p08-reports-20261023/unclaimed-settled-835.pdf), [Original](../../output/p08-reports-20261023/original-2.pdf), [omitted settlement](../../output/p08-reports-20261023/omitted-settled-3.pdf). [All financial PDF checks](../../output/p08-reports-20261023/visual-verification.json), [native Excel checks](../../output/p08-reports-20261023/excel-visual-verification.json), [PDF contact sheet](../../output/p08-reports-20261023/unclaimed-settled-835-contact.png), [Excel contact sheet](../../output/p08-reports-20261023/excel-unclaimed-settled-835-contact.png).

The separate **41-row synthetic long-field fixture** preserves accented full names and complete school/course text: three server-PDF pages and **2 native Excel pages**. It is explicitly labelled visual-only, not an operational financial report. [Long-field PDF](../../output/p08-reports-20261023/long-fields.pdf), [native Excel first page](../../output/p08-reports-20261023/excel-long-fields-first.png), [text verification](../../output/p08-reports-20261023/long-excel-verification.json). The earlier footer-overflow defect was corrected before freezing; no clipped field or empty overflow page remains in these representative checks. Sample file sizes are listed with the measurements below.

## D. Financial integrity, authorization and concurrency

Existing authenticated session, CSRF and `ovr.process` authority apply. Staff/Coordinator downloads require no extra approval; pure System Administrator access is denied. Reads use existing Repeatable Read snapshots and final revocation checks. Rendering occurs **outside** the pooled transaction. Before publication, the existing configuration guard and authorization transaction rebuild the source projection; changed source or revoked authority rejects publication. Original source tokens derive from verified immutable closure evidence and remain stable across subsequent corrections.

Only after successful rendering and source revalidation does `payments.reconciliation_exported` record actor, report/filter, batch, source token, format, generation time, counts, amounts, exact byte length and SHA-256. Audit failure rolls the publication transaction back; no file is returned. Audit history uses existing own-scope/all-scope audit access and no additional grants.

Downloads follow the **existing export convention**: each explicit attempt prepares a separately audited file; there is no payment command or persistent binary cache to replay. A retried download can create another correctly identified export, never another financial outcome. Concurrent exports receive distinct audit identities for their own actual bytes. Audit `prepare_download` establishes delivery preparation, not successful client storage, external acceptance or payment. No success is recorded for a render failure, stale source or failed audit. Responses use attachment, `no-store`, `Vary: Cookie` and `nosniff`; no public static report URL is introduced.

## E. Performance and bounded storage

No cohort-wide eligibility calculation or full Registry read is invoked. SQL uses existing bounded financial joins and correction precedence; cross-request financial caching is not introduced. Report output is server-paged, and source joins are batched in groups of 200. The source is capped at 5,000 report members/linked attempts and the prepared download at 16 MiB; these are report safety boundaries, not permission to bypass existing finalization or packet limits.

Current financial reports must still decode and verify the existing compressed frozen finalization **once per snapshot** to obtain its historical form, because it has no independently stored compact form rows. Compact report rows are then sorted/filtered on the server and only the requested page is returned. This is not claimed as SQL-only page fetching, and source preparation cost remains measurable on every current page/export revalidation. Original reports use their existing compact closure members and do not recalculate current eligibility. No new reporting truth table or unsafe mutable cache was introduced to conceal that cost.

The new financial query projects only the existing canonical reader's financial fields, enabling MariaDB to prune unrelated current-name/school subqueries. Historical report identity, placement and period labels come from frozen evidence. Original members are freshly hash-verified rather than adding a new cross-request cache that could conceal incomplete historical evidence.

The separate current **1,200-scholar probe stopped before P08**, at ordinary payroll finalization. Its diagnostic captured the unchanged `encodeStoredJson` rejection: **“Compressed evidence exceeds the safe database packet budget; use smaller reviewed payroll batches.”** The existing compressed-envelope ceiling is **800,000 bytes**. It is distinct from both the expanded-evidence ceiling and the **64 MiB raw-SQL backup cap**. `server/stored-json.ts` matches accepted P07 byte-for-byte. No ceiling was increased and no fake finalized roster was inserted to reach P08. Consequently, an authoritative 1,200-member P08 report benchmark is unavailable. Both the initial generic HTTP 500 log and the diagnostic rerun are retained privately.

Final measurements use actual authorized disposable HTTP calls. Three warm read/export observations are reported as medians; Open Reports is one observation, and page measurements cover the actual pages rather than repeated reads of one offset. New HTTP counts include session authentication; the equivalent existing service comparisons below exclude HTTP sessions. SQL client roundtrip is not database CPU. Twenty explicit-GC metadata reads measure retained memory and connection return, not repeated-export or multi-day capacity.

| Fixture / operation | Samples | Median ms | SELECTs | SQL client ms | Response bytes |
|---|---:|---:|---:|---:|---:|
| 835 Updated / open_reports | 1 | 166.24 | 14 | 161.61 | 168 |
| 835 Updated / summary_and_preview | 3 | 625.19 | 45 | 448.07 | 19830 |
| 835 Updated / page | 9 | 499.93 | 45 | 389.24 | 74855 |
| 835 Updated / filter_unclaimed | 3 | 550.81 | 45 | 403.63 | 9143 |
| 835 Updated / export_xlsx | 3 | 770.72 | 82 | 475.98 | 71074 |
| 835 Updated / export_pdf | 3 | 1945.79 | 82 | 510.81 | 254639 |
| 2 Original / summary_and_preview | 3 | 12.88 | 20 | 7.75 | 2605 |
| 2 Original / export_xlsx | 3 | 33.37 | 32 | 13.45 | 8630 |
| 2 Original / export_pdf | 3 | 130.96 | 32 | 13.19 | 20776 |
| 2 Updated / summary_and_preview | 3 | 32.11 | 36 | 19.64 | 2714 |
| 2 Updated / export_xlsx | 3 | 54.99 | 64 | 32.46 | 8727 |
| 2 Updated / export_pdf | 3 | 161.54 | 64 | 36.32 | 20849 |
| 1 omitted report / 3 source scholars / summary_and_preview | 3 | 22.92 | 33 | 16.64 | 2240 |
| 1 omitted report / 3 source scholars / export_xlsx | 3 | 54.20 | 58 | 30.76 | 8741 |
| 1 omitted report / 3 source scholars / export_pdf | 3 | 161.80 | 58 | 31.29 | 21381 |

| Fixture / 20 post-GC reads | Heap first → last MiB | Heap range MiB | Sampled retained RSS maximum MiB | Pool connections |
|---|---|---|---:|---|
| omitted-settled-3 | 71.18 → 71.05 | 71.03–71.18 | 211.90 | 2 |
| original-2 | 70.15 → 70.13 | 70.10–70.15 | 222.72 | 2 |
| pending-2 | 67.03 → 66.92 | 66.89–67.03 | 215.61 | 2 |
| provisional-2 | 69.01 → 68.94 | 68.93–69.01 | 220.79 | 2 |
| review-2 | 68.96 → 68.98 | 68.87–69.00 | 224.87 | 2 |
| unclaimed-settled-835 | 172.05 → 171.90 | 171.85–172.05 | 961.93 | 3 |
| updated-2 | 72.36 → 72.32 | 72.28–72.36 | 217.95 | 2 |

| Equivalent existing path | Accepted P07 ms | Final P08 ms | SELECTs before → after | Response bytes before → after |
|---|---:|---:|---|---|
| existing_p04_queue | 29.33 | 38.54 | 8 → 8 | 4815 → 4815 |
| existing_p02_summary | 20.06 | 20.44 | 13 → 13 | 419 → 419 |
| existing_p03_summary | 19.24 | 18.99 | 20 → 20 | 925 → 925 |
| page_835 | 13.95 | 13.85 | 15 → 15 | 10395 → 10395 |
| next_page_835 | 14.23 | 14.16 | 15 → 15 | 10396 → 10396 |
| prepare_or_dv | 104.66 | 110.29 | 251 → 251 | 231 → 231 |

Response sizes above are medians; the retained examples below are individual downloads, whose generation metadata can produce slightly different byte lengths. Their financial rows and totals agree.

| Actual example | Rows | XLSX bytes | Server PDF bytes | Server PDF physical pages |
|---|---:|---:|---:|---:|
| omitted-settled-3 | 1 | 8741 | 21382 | 1 |
| original-2 | 2 | 8630 | 20776 | 1 |
| pending-2 | 2 | 8593 | 20668 | 1 |
| provisional-2 | 2 | 8723 | 21089 | 1 |
| review-2 | 2 | 8748 | 21333 | 1 |
| unclaimed-settled-835 | 835 | 71074 | 254545 | 46 |
| updated-2 | 2 | 8727 | 20849 | 1 |

Native Excel full-volume print: 25 physical pages, 835 rows, all identity/placement/date/reference fields present. Server PDF and Excel paginate differently; financial rows and totals agree. These are reconciliation exports, separate from the unchanged 20-per-page payroll renderer.

The 835-member fixture retains **825 payroll Paid / 10 original Unclaimed**, approved PHP **4,175,000.00**, payroll Paid PHP **4,125,000.00**, and immutable original Unclaimed PHP **50,000.00**. Ten actual synthetic later DV settlements contribute a separate PHP **50,000.00**. Current distinct settlement is **835 entitlements / PHP 4,175,000.00**, outstanding PHP **0.00**, with zero conflicting Paid attempts. This is not an 835-prepared-individual-payment capacity test. The omitted report contains one nonmember settlement from a three-source-scholar fixture with two original payroll members; it is not an 835-eligible-omitted fixture.

The archived P07/current queue observations increased **29.33 → 38.54 ms** (+31.4%, +9.20 ms), with **8 SELECTs and 4,815 bytes unchanged**; SQL client time increased **27.33 → 36.27 ms**. That unpaired increase is retained. A supplementary controlled comparison used the **same live 835-member fixture, authorization, pool, ten Unclaimed rows and byte-identical P07/current service/reader SQL**, two warmups each and ten alternating-order pairs:

| Matched same-fixture service | Samples | Median ms | SELECTs | SQL client ms | Response bytes |
|---|---:|---:|---|---:|---|
| Accepted P07 implementation | 10 | 22.64 | 8 | 21.03 | 4744 |
| Current implementation | 10 | 23.31 | 8 | 21.89 | 4744 |

All twenty complete outputs match, no financial write occurred, and no statistics refresh, index or SQL change was introduced. The 31% gap was not reproduced as a comparable read-path difference in this matched run. Its 4,744-byte queue represents its fixture's transaction state, rather than an exact replay of the archived 4,815-byte observation. [Paired evidence](../../output/p08-reports-20261023/paired-existing-queue-835.json). This controls read-path differences; it does not isolate every host/statistics or process-startup effect. No causal speedup or general production-capacity claim follows from unpaired timings; latency remains an operational rollout check.

A separate observer retained timings for the otherwise-unrecorded rejected export. The real Coordinator correction during rendering rejected publication with REPORT_CHANGED after **278.93 ms**, **167 business-callback SELECTs** and **125.51 ms SQL client time**; no file was published. A representative overlapping XLSX/PDF pair completed in **166.07 ms**, with **96 combined business-callback SELECTs**, **66.12 ms combined SQL time** and **29811 total file bytes**. These are supplementary service observations on the small fixture, not HTTP or 835-member race capacity measurements. Counts exclude session, authorization and pre-callback guard SQL; complete service wall time includes them. A rejected service call has no HTTP body to size. Instrumentation has overhead. [Race evidence and conditions](../../output/p08-reports-20261023/export-race-summary.json).

Every twenty-read sample returned all pooled connections and left no queued waiter. No out-of-memory error occurred. Retained RSS includes earlier financial-fixture allocations; it is not solely attributable to reporting and is not a true peak or capacity guarantee. Gate outputs were copied with hashes before supplementary fixtures and restored byte-for-byte afterwards, so their timings and inputs were not replaced by later runs. [All operations](../../output/p08-reports-20261023/performance-summary.json), [existing-path comparison](../../output/p08-reports-20261023/baseline-comparison.json).

The unchanged 835-member full-detail route still measured **14906.78 ms median, 3188 SELECTs and 36110257 response bytes**, with a sampled maximum RSS of **1490.10 MiB** across those observations. Original Mark All Remaining Paid for 825 members took **5450.11 ms / 469 SELECTs** in one observation. These remaining costs are not hidden or claimed as fixed by P08. [Exact R2 original-path measurements](../../output/p08-reports-20261023/r2-existing-path-metrics/p07-settlement-20261022-existing-p02-835.json).

Report binaries are not stored in SQL, but export audit metadata grows existing backups. The **64 MiB raw-SQL backup cap** is unchanged. The 5,000-row source and 16 MiB download limits are safety boundaries, not a 5,000-scholar capacity certification; no maximum-size export or long-term repeated-export soak is claimed. Operational capacity and document-storage growth remain rollout checks requiring separate authorization.

## F. Final acceptance evidence

**Passed: all 81 approved UAT suites**, including all 78 previous suites and three P08 additions, on frozen inputs. R2 started **2026-10-22T23:58:58.983Z** and finished **2026-10-23T01:22:52.382Z** UTC. [Complete gate](../../output/p08-reports-20261023/uat-r2/F36-report.json). Lint, **583 unit tests across 95 files**, TypeScript, production build and secret scan passed inside the run. Existing Vite large-chunk warnings were retained. No suite was omitted and separate focused runs are not stitched into this pass.

Coverage includes Pending/Provisional/Withheld/Original/Updated/Individual reports, all-row financial parity with P03, exact amounts/dates, historical placement, unsupported/missing closure evidence, distinct settlement and omission ownership, formula protection, real files, permissions, revocation, CSRF, concurrent exports, renderer failure, audit rollback and an actual correction during rendering. P01–P07, F00–F36 and R01–R07 cache/parity/pagination regressions passed, including original 835/10/825 recording, closures, post-closure corrections and canonical settlement protections.

**R1 remains failed evidence:** 79 suites passed before one full-volume concurrent export returned REPORT_CHANGED. A separate diagnostic reproduced the defect: **35 reads had identical financial row values but two SQL sequences**. P08 had hashed an array without an ordering contract. A deterministic reversed-row regression failed before correction. Only P08's raw source array is now copied/sorted by unique scholarship ID before hashing; every value/field stays pinned and alphabetical output is unchanged. Actual financial changes still reject publication. No predicate, cache, permission, financial decision, transaction or lock changed. Corrected small, 835-member and omitted suites passed before the fresh full R2. [Exact failed frozen inputs](../../output/p08-reports-20261023/failed-evidence-r1/manifest.json), [component diagnosis](../../output/p08-reports-20261023/source-debug-analysis.json). Instrumented failure timings are not substituted for final benchmarks.

Other retained development failures include the root/admin fixture typo, incorrect three-scholars/two-payroll-members assertion, a browser locator expecting one Unclaimed node and the preliminary PDF footer overflow. A supplementary timing observer was also stopped because its async wrapper would change a synchronous disabled-feature throw; only that private observer was corrected. Its exact owned process/schema/account were verified, zero active connections/external FKs were checked, and only that disposable fixture was removed. A later observer revision recursed through an existing test Pool Proxy; it was replaced by a separate measurement view, and the failed fixture's cleanup was verified against the original schema/account inventory. [Interruption/cleanup](../../output/p08-reports-20261023/supplementary-observer-interruption.json), [Proxy failure](../../output/p08-reports-20261023/supplementary-paired-queue-proxy-failure.log), [cleanup inventory](../../output/p08-reports-20261023/supplement-fixture-inventory.json). These are private QA-harness failures, not a stitched acceptance pass; neither the application nor a financial expectation was relaxed.

Browser checks used a built local client and owned two-member server fixture. The corrected-source retest passed global Reports, Updated default, actual keyboard XLSX/PDF downloads, Original/Unclaimed filtering, 820×1180 tablet bounds and CSRF rejection. The Payroll Reports tab, one-preview/no-full-detail-or-auto-export opening behavior and injected stale-export recovery were also checked. Initial auth/me 401 and the deliberately injected 409 were expected; no app crash was observed. The browser fixture does not establish full-volume individual-payment browser capacity; actual 835/omitted financial behavior is covered by API/database suites. [Browser evidence](../../output/p08-reports-20261023/browser-results.json), [Updated](../../output/playwright/p08-updated-report.png), [Payroll tab](../../output/playwright/p08-payroll-reports-tab.png), [tablet](../../output/playwright/p08-reports-tablet.png), [stale recovery](../../output/playwright/p08-stale-export.png).

Final verification reconciles **680 source inputs, 261 build artifacts and 62 migrations** with R2. All accepted migration checksums and protected financial/performance modules remain exact. All **134 non-authentication business tables**, including every authoritative financial record, match the initial development baseline. The three authentication tables differ due to one separate auth.login at **07:35:33 Philippine time**; all **2,777 prior audit rows** remain exact. This was before the corrected browser fixture, and its evidence was retained rather than reset. No whole-development zero-difference claim is made. All **15 original schemas, 12 LDSS accounts and four disabled individual-payment feature flags** remain. No operational activation or main-development financial action occurred. [Final inventory/hashes](../../output/p08-reports-20261023/final-verification.json), [authentication evidence](../../output/p08-reports-20261023/authentication-differences.json).

Verified pre-gate local encrypted backup: C:/xampp/htdocs/scholar_monitor/output/backups/ldss-1792713541605-65bb902c.ldssbackup. [Verified restore report](../../output/backups/restore-1792713541712_b444cd28.json). Its temporary restore was removed normally. P08 added no schema or migration, and no live rollback/downgrade was required. Existing populated backup/recovery and unchanged capacity constraints passed in the complete gate. [Frozen local evidence archive](../../output/p08-reports-20261023/frozen-evidence-r2/manifest.json) retains exact inputs, artifacts, reports, logs, measurements, screenshots and failed/interrupted evidence. It is private QA evidence, not a deployment package.


## G. Recommendation and remaining boundaries

P09–P10 are not started. No LAN/production deployment, configuration activation, official document approval or payment record change is authorized. Official OR/DV layout review and previously documented claiming-period questions remain at their existing operational boundaries. Reports expose recorded facts; they do not resolve those policies or authorize collection. Existing financial conflicts stay explicit.

**Recommendation: P08 is ready for local acceptance review. P09–P10 have not started.** P09 may refine cross-workspace terminology, dense-table presentation and narrow-screen navigation while preserving the current three-step workflow and the shared projection. Those are recommendations, not implementation or rollout authorization. Existing full-detail memory/latency, the unchanged evidence/backup limits, dependency advisories and operational claiming-period questions remain separate. Earlier P07 intermittent approval HTTP 500 was not reproduced or fixed by P08; capture its underlying SQL if it recurs. No LAN/production deployment, office form approval or financial activation is implied. **Stop for explicit P08 acceptance before P09.**
