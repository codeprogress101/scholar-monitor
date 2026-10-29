# P10 — Integration, UAT and Final Technical Verification

Date: **23 October 2026, Philippine time**. Scope: local verification of accepted P01–P09. **P10 ACCEPT — Technical Verification Passed**, with the operational limitations and pending approvals below. No operational activation, LAN/production deployment, P11 or requirements questionnaire is authorized. Automated verification is not office sign-off.

## 1. Authority and preserved baseline

The P10 authorization, implementation plan, P01–P09 reports, actual service/route/constraint/cache implementations and approved test drivers were inspected before testing. Historical phase reports describe their own authorization boundaries; the user's subsequent P10 authorization accepts P01–P09 for local development. It does not approve official individual-payment forms or operational collection policy.

All **683 accepted P09 source inputs, 261 build artifacts and 62 migrations** matched before testing. Existing uncommitted work was inventoried without reset, staging or commit. The initial read-only development snapshot records **137 business tables**, the exact **15 schemas**, **12 LDSS accounts**, per-account grant hashes, migration checksums, table definitions and per-row hashes of prior audits. All four individual-payment flags are false. No actual stipend record is used for consequential testing.

Evidence: [accepted inputs](../../output/p10-integration-20261023/accepted-p09-fingerprints.json), [development baseline](../../output/p10-integration-20261023/development-baseline.json), [working tree inventory](../../output/p10-integration-20261023/git-status-before.txt). Before the gate, **1,779 mutable earlier phase/performance QA files** were copied with hashes; immutable accepted archives remain untouched. Afterwards, 53 changed root QA files were restored and 1,726 already identical files were left in place; all 1,779 saved hashes match. This preservation claim covers the manifest's root files, not every nested mutable sample directory. Fresh P10 measurements/files were separately retained before supplementary fixtures. [Restoration evidence](../../output/p10-integration-20261023/previous-qa-restored.json).

## 2. Code inspection and integration coverage

The actual authorization service takes the configuration guard before actor/financial locks. Read snapshots use Repeatable Read and recheck current permission before returning. Payment writers reuse canonical records, existing correction precedence and entitlement guards. The request-local cache clears ordinary, prepared and computed reads on writes; it does not authorize payment across requests. Document/report rendering occurs outside the publication transaction and repeats fresh permission/source checks before publishing.

The new complete gate passed the following integration boundaries. Browser and native-artifact observations are distinguished from the broader automated assertions below.

| Area | Authoritative integration and required assertions | Existing test drivers |
|---|---|---|
| P01, F00–F36 sources | Registry, permanent identity, Masterlist publication/amendments, academic placement/shifts/history, COR/COG, standing, holds, waivers, overrides, Course pending, historical approval; complete-output parity | Scholar/academic/Masterlist/requirement/status suites, `test-payment-foundation.ts`, Registry/candidate parity |
| Managed payroll | Automatic candidate validation, numbered windows, Staff review, fresh Coordinator finalization, frozen membership, fixed entitlement, Word versions, submission/processing | Main-payroll, managed-release, finalization, treasury, reprocessing and historical-import suites |
| P02 recording | 835 members; ten Unclaimed then 825 Paid; exact amounts; server paging/search; accepted-set validation; retry, duplicate, audit and late-child rollback | `test-payment-recording.ts`, `test-payment-recording-large.ts` |
| P03 verification/closure | Same-recorder verification; actor/time/source; financial changes invalidate, reads do not; discrepancies block even override; Coordinator-only closure; Staff post-closure reporting; corrections preserve Closed and Original | `test-payroll-reconciliation.ts`, ordinary/override and volume suites |
| P04 DV-only | Genuine Unclaimed source; server request time; claimability; one active route; unpaid preparation; cancellation/replacement; original-payment synchronization; cross-route races | `test-individual-payments.ts`, migration/volume suites |
| P05 omission routes | Later same-semester automatic payroll first; no fabricated allocation; closed-preparation OR+DV request and Coordinator approval; one entitlement; reopen/reservation/cancellation constraints | `test-omission-payments.ts`, historical, populated-upgrade and volume suites |
| P06 documents | Editable DV-only or authorized OR+DV; blank unknown accounting/signature fields; integer-centavo words; restricted edits; current version/append-only history; fresh downloads; retry/render/audit/concurrency failures | `test-individual-documents.ts`, backup/upgrade/migration suites |
| P07 settlement | Actual acknowledged single/bulk release; representative single-only physical attestation without personal data; fixed amount; actual date distinct from recording; competing attempts; canonical claims/corrections; atomic accepted set | `test-individual-settlement.ts`, `test-individual-settlement-races.ts`, both route/upgrade/volume suites |
| P08 reports | Provisional/Original/Updated/Individual; outcome filters, historical placement, complete rows/order/amounts; original Unclaimed plus later DV Paid; distinct entitlements; actual XLSX/PDF; permission/source/audit failures | `test-financial-reports.ts`, financial-report unit/volume/omitted suites |
| P09 UI | Four work areas, context/deep links, initially unchecked confirmations, cross-page selection, focus/keyboard/reflow, exact uncertain-response recovery, scoped search refresh | Workspace unit tests and separate actual-browser checks |
| R01–R07 | Registry/candidate/Dashboard parity, scoped detail, SQL report pagination, notification freshness, 200-key preloads, write invalidation and fresh finalization | Registered Registry/candidate/Dashboard/detail/report/notification/snapshot/cache regressions |
| Security/recovery | Sessions/CSRF/current RBAC, pure Administrator restrictions, forged identities, strict input, financial locks, audits, fresh/populated migration, runtime grants, interrupted-DDL refusal, encrypted restore and financial/document hash preservation | Auth/RBAC/audit/concurrency/backup and phase migration/upgrade suites |

A closure override is restricted to verification. It does not waive incomplete outcomes, unresolved discrepancies, pending corrections, claims or historical conflicts. Prepared/generated/downloaded/forwarded documents do not establish Paid. Original payroll Unclaimed and a later individual Paid remain separate attempt facts for one entitlement.

## 3. Complete quality gate

**Passed: all 81 approved UAT suites**, including lint, **593 unit tests across 96 files**, TypeScript, production build, secret scanning, database/authorization/concurrency tests, financial regressions, cumulative migrations, populated recovery, documents/reports and R01–R07 parity/cache/pagination assertions. The unchanged approved procedure was `LDSS_UAT_OUTPUT=output/p10-integration-20261023/uat-r1` followed by `npm run test:uat`. It ran **2026-10-23T04:57:54.732Z–06:25:08.181Z UTC** (**12:57:54–14:25:08 Philippine time**, 87 minutes 13 seconds). Every registered suite passed in this single frozen run; no partial runs were combined. [Complete gate](../../output/p10-integration-20261023/uat-r1/F36-report.json), [runner log](../../output/p10-integration-20261023/uat-r1.log), [checks](../../output/p10-integration-20261023/uat-r1/check.log).

The gate reports `automated_passed_awaiting_signoff`, with Coordinator and technical-owner sign-offs pending and `productionAuthorized: false`. Those fields were not changed to simulate office approval. The existing Vite chunk warning remains: the main client chunk is approximately 853 kB minified. No warning threshold or dependency was changed.

**P10 changed no application source, test driver, dependency, migration, schema, grant generator or deployment configuration.** Documentation changes are these two reports and the plan's authorization/status text. Additional probes, screenshots and evidence are private under `output/p10-integration-20261023/`. No financial safeguard was relaxed to obtain a pass.

## 4. Independent browser and financial workflow checks

Actual built clients ran against two owned disposable databases with synthetic Staff/Coordinator/Administrator accounts. Only those disposable servers enabled the test routes. Development flags stayed off. Both fixture servers and all owned browser sessions were closed normally; their harnesses removed their owned schemas/accounts.

### 835-member payroll

The fixture used genuine prior-approved import, eligibility, managed finalization and processing services. Staff selected five Unclaimed scholars through separate searches and five on a subsequent server page, then reviewed ten Unclaimed once. Staff selected **Mark All Remaining Paid**, reviewed **825**, and confirmed once. A deliberately injected post-commit 503 produced an uncertain response; navigation was guarded, reload retained the exact request/key, and retry recovered the saved receipt without duplicating payments. Independent final API and browser checks confirmed the retry state cleared.

| Original payroll result | Count / PHP |
|---|---:|
| Scholars | 835 |
| Paid / Unclaimed / Pending | 825 / 10 / 0 |
| Approved | 4,175,000.00 |
| Payroll Paid | 4,125,000.00 |
| Original Unclaimed entitlement | 50,000.00 |

The original recorder verified the returned payroll; Staff had no Close Payroll action. Coordinator closure required initially unchecked confirmations, created supported Original evidence and preserved the exact frozen finalization. A Staff discrepancy could still be reported after closure. Coordinator dismissal with a reason left the payroll Closed and the Original source/items/totals exact. The complete gate additionally exercises financial-change invalidation, ordinary/override closure blocking, date/outcome corrections, post-closure Updated evidence and historical unsupported-Original rejection.

A genuine source Unclaimed stipend was requested and prepared through the UI. DV Word generation/download and **Mark as Forwarded** both left it unpaid. **Mark Paid** required the initially unchecked acknowledged-release confirmation. Its later canonical Paid did not rewrite original Unclaimed, the closure, or frozen membership. A second genuine DV was prepared for a race between **two distinct authenticated Staff actors**: one 200 success and one 409 `SETTLEMENT_REVIEW_CHANGED`; exact winner retry returned the same receipt. Final distinct settlement was **827 Paid entitlements / PHP 4,135,000.00**, **PHP 40,000.00 outstanding**, zero conflicting Paid attempts; original payroll remained 825/10. This two-DV browser state is distinct from the gate's ten-DV report fixture.

Evidence: [recording verification](../../output/p10-integration-20261023/recording-final-verification.log), [835 closure](../../output/p10-integration-20261023/browser-close-835.json), [DV lifecycle](../../output/p10-integration-20261023/browser-dv-835-r2.json), [two-Staff race](../../output/p10-integration-20261023/browser-two-staff-race.json), [final Original/current parity](../../output/p10-integration-20261023/browser-final-835.json). Screens: [835 recording complete](../../output/playwright/p10-recording-complete-835.png), [closure review](../../output/playwright/p10-close-review-835.png), [later DV Paid](../../output/playwright/p10-dv-paid-original-unclaimed.png).

### Omitted scholar and individual routes

The separate three-source-scholar fixture had two genuine original payroll members and one eligible omitted scholar. Staff **Record Omission → Add to Payroll** selected the existing automatic payroll-review route without changing the original frozen roster. The complete gate verifies eventual same-semester Coordinator finalization, current eligibility, allocation uniqueness and cross-route exclusion; the browser observation covers route selection, not a second browser finalization claim.

Coordinator then closed preparation with a reason. Staff requested OR + DV, could not approve it, and a separate Coordinator approved it with a reason. Staff prepared the unpaid transaction, generated and downloaded **both editable draft Word files**, and explicitly acknowledged actual release before Paid. Independent authoritative reads confirmed one PHP 5,000.00 canonical settlement, zero conflicts, `member: false`, retained omission provenance and unchanged original frozen payroll. No fabricated original membership or payroll batch was created. [Preparation evidence](../../output/p10-integration-20261023/browser-omitted-prepare.json), [final canonical/report verification](../../output/p10-integration-20261023/browser-omitted-verify-final.json), [authorized route](../../output/playwright/p10-omitted-authorized.png), [Paid view](../../output/playwright/p10-omitted-paid.png).

The gate also passed DV cancellation/replacement lineage, forwarded history, Coordinator-confirmed original-payment synchronization, conflicting Paid replacement protection, claimability/expiry, representative single-only attestation without personal data, accepted-set bulk atomic rollback, role revocation, render/source conflicts and exact lost-response retries. These are automated financial assertions, not claims that every destructive conflict was repeated manually in a browser.

### Usability, accessibility and authority

All four work areas, batch context, Back/Forward, server search, cross-page selection, initially unchecked confirmations, empty/error/loading states and scoped refresh were exercised. Keyboard Enter downloaded actual XLSX/PDF files. A discrepancy dialog kept focus through 16 Tab presses; Escape closed it and returned focus to its trigger. Document width stayed within the viewport at **1440, 1024, 820 and 720 CSS pixels**. Native Google Chrome zoom, operated on the owned test window, passed **100%, 125%, 150% and 200%** reflow checks; 200% measured a 464-CSS-pixel viewport and 457-pixel document. Zoom was reset to 100% before closing that window. This is browser/keyboard/reflow evidence, not screen-reader or complete WCAG certification.

Pure Administrator financial recording/report requests returned 403 and no payment action. Missing CSRF returned 403. A SQL-like search was treated literally and returned zero matches. Existing gate checks cover expired/revoked sessions, strict/forged financial inputs, role revocation during commands, permissions at download/publication, audit failure rollback and restricted runtime access. No unrestricted LAN penetration test was run. [Browser smoke](../../output/p10-integration-20261023/browser-final-smoke.json), [native 200% metrics](../../output/p10-integration-20261023/native-zoom-200.log), [tablet](../../output/playwright/p10-reports-tablet.png), [native zoom](../../output/playwright/p10-native-zoom-200.png).

## 5. Word, Excel and PDF verification

Fresh gate files were copied before supplementary fixtures could overwrite mutable sample paths. Native **Microsoft Word 16** exported three representative API-generated editable prototypes to actual PDFs: Unclaimed DV, omitted OR and a long-field omitted DV. Each current example was one Letter-portrait page; all original editable text, draft notices, internal references, amounts and complete certification/receipt areas were present and within page bounds. The DOCX files remained byte-for-byte unchanged. The earlier P06 extreme two-page case is historical evidence, not a claim that this different long sample had two pages. Unknown official numbers/codes/signatures/certifications remained blank/unchecked. These are draft reconstructions, with spacing/typography differences from Publisher; no official form approval is inferred.

Both supplied Publisher page images were compared with the representative reconstructed pages. Original `DV.pub` and `OBR.pub` still match their accepted SHA-256 values (`00f0f163…e9834a` and `6b7b76fc…4f43b6`). No sample official/signatory or sample accounting authority was copied into a synthetic transaction.

All seven fresh financial server-PDF examples passed row/text/bounds checks. Native **Excel 16** printed three matching workbooks. The **835-member Updated report** contained all 835 scholar IDs exactly once, complete names, historical placement, dates, references and subtotals: **46 A3-landscape server-PDF pages** and **25 A3-landscape native Excel pages**. Headers and page numbers repeat, and no blank overflow page or clipped tested field was found. PDF/Excel/API agree on **825 original Paid / ten original Unclaimed**, original Paid PHP 4,125,000.00, separate later ten-DV settlement PHP 50,000.00, **835 distinct settled entitlements / PHP 4,175,000.00**, outstanding zero. The independent browser fixture settled only two DVs and is labelled separately above. Reconciliation export pagination is separate from the unchanged 20-per-page official payroll renderer and its historical-version tests. No new 42-page native Word payroll print certification is claimed.

Evidence: [artifact checks](../../output/p10-integration-20261023/visual-verification.json), [Word DV](../../output/p10-integration-20261023/visual/unclaimed-DV-default-page-1.png), [server PDF final page](../../output/p10-integration-20261023/visual/server-unclaimed-settled-835-page-46.png), [native Excel final page](../../output/p10-integration-20261023/visual/excel-unclaimed-settled-835-page-25.png), [all server pages](../../output/p10-integration-20261023/visual/server-unclaimed-settled-835-contact.png), [all Excel pages](../../output/p10-integration-20261023/visual/excel-unclaimed-settled-835-contact.png).

## 6. Performance, caching and memory

P09 and P10 gates used **identical source/build/migration inputs and fixture drivers**, sequentially on the shared Windows host (Node **22.21.0**, MariaDB **10.4.32**, Windows/16-GB deployment class). Warm reads use three-sample medians; writes below are single observations. These are **unpaired** runs, not causal before/after speed claims. SQL time is client roundtrip, not database CPU. Service/HTTP/session instrumentation is kept in its original scope. All **69 compared operations retain their SELECT counts**. Complete financial outputs, ordering, fingerprints, pagination and invalidation assertions pass; file-byte variations from generation metadata are not presented as financial changes.

| Representative operation / 835 fixture | Accepted P09 ms | P10 ms | SELECTs before = after | P10 response bytes |
|---|---:|---:|---:|---:|
| Payment Recording summary | 17.02 | 18.41 | 14 | 412 |
| Recording roster page | 23.15 | 21.43 | 10 | 6,185 |
| Recording scholar search | 19.40 | 20.46 | 10 | 288 |
| Review remaining 825, one write-path observation | 4,277.26 | 4,437.29 | 462 | 137,078 |
| Commit remaining 825, one observation | 5,299.82 | 5,400.22 | 469 | 499 |
| Existing Unclaimed queue | 24.69 | 25.75 | 8 | 4,744 |
| Existing reconciliation summary | 17.87 | 17.72 | 20 | 925 |
| Individual settlement queue | 9.64 | 10.89 | 14 | 608 |
| Omitted search page | 15.15 | 14.54 | 15 | 10,395 |
| Omitted Prepare OR + DV, one observation | 121.68 | 105.42 | 251 | 231 |
| DV generation, one observation | 335.36 | 409.36 | 188 | 151 |
| DV download | 137.90 | 157.39 | 95 | 204,891 |
| Updated report summary/preview | 312.55 | 323.55 | 45 | 19,830 |
| 835 XLSX export | 760.67 | 768.18 | 82 | 71,095 |
| 835 PDF export | 1,928.35 | 1,934.08 | 82 | 254,701 |
| Existing legacy full detail | 14,443.82 | 15,211.89 | 3,188 | 36,110,257 |

Latency increases are retained, including DV generation **+22.1%** in one observation and the same Unclaimed queue measured later in another fixture state **28.57 → 38.74 ms**. Those observations do not establish a reproducible implementation regression: the P10 application, query text, predicates, builds and test drivers are byte-identical to P09 and query counts/results match. They are also not evidence of improved capacity. Full-detail sampled maximum RSS was **1,497.61 → 1,522.52 MiB**; this expensive path remains a limitation. No cache or financial guard was changed to conceal it.

| Twenty sequential post-GC read samples | Heap first → last MiB | Heap range MiB | Sampled retained RSS max MiB | Pool first → last |
|---|---|---|---:|---|
| Individual settlement, 835 source members | 160.20 → 160.03 | 160.01–160.20 | 940.89 | 3 → 3 |
| Document metadata, 835 source members | 158.30 → 158.14 | 158.13–158.30 | 783.85 | 3 → 3 |
| Financial report, 835 members | 172.23 → 172.08 | 172.05–172.23 | 951.52 | 3 → 3 |
| Reconciliation, 835 members | 160.62 → 160.63 | 160.62–160.64 | 807.50 | 3 → 3 |
| Omitted paged search fixture | 86.27 → 86.07 | 86.06–86.27 | 246.59 | 2 → 2 |

Retained heap stabilizes in these short samples; connections return and no queued waiter/OOM is reported by the corresponding tests. RSS includes prior fixture allocations and is not a true per-operation peak. This is not a multi-day soak, maximum-200 individual-write capacity test or production concurrency certification. The omitted volume search has three genuine source scholars plus unassessed search rows; it does not prove 835 eligible omitted transactions. [Full measurements/conditions](../../output/p10-integration-20261023/performance-summary.json), [fresh gate metrics inventory](../../output/p10-integration-20261023/gate-metrics-manifest.json). Static copied files are not automatically counted as newly measured results; the P05 comparison uses the fresh `after-835.json`, not the unchanged archived P07 copy.

### Remaining Home/Registry loading costs

Actual browser navigation after original 825/10 recording measured **Home 7,002 ms median**, **Registry 1,885 ms median to 25 real rows** (three completed navigations each). Recording opened in approximately 250 ms and a recording search in 50 ms in the separate initial browser probe; Reports opened in approximately 1,666 ms. These UI observations include request scheduling/rendering and differ from isolated service timing. The first premature Registry observation (99 ms with zero rows) is rejected, not reported as a load-time success. [Completed loading checks](../../output/p10-integration-20261023/browser-loading-focused.json), [initial scoped probe](../../output/p10-integration-20261023/browser-loads.json).

A read-only diagnostic on the **same 835 fixture, exact source and Staff actor**, using a restricted runtime account, measured Dashboard service **7,435.44 ms / 580 SELECTs / 2,335.29 ms SQL client time / 2,676 bytes** (three warm medians). Inspection confirms that its derived eligibility/document counts still evaluate the year in bounded 200-member chunks through the authoritative shared resolver; other cards use aggregates. Existing R03/R07 batching/parity survives, but those derived whole-year calculations remain costly. No unrelated report/form or automatic draft generation was added. A CPU profile and query timings are retained for a separately authorized investigation; no P10 optimization was made.

Pending-notice HTTP took approximately 3.2 seconds while Home requests overlapped; isolated pending-three notice service reads measured **62.25 ms / nine SELECTs / 59.17 ms SQL client time / 1,791 bytes**. The overlap gap does not prove the notice SQL alone caused three seconds. Dashboard cards/context and complete pending-notice values matched authenticated HTTP results; all diagnostic connections returned. There is no equivalent accepted-P09 Home browser baseline, so these observations cannot establish a new P10 regression or an instant-loading target. **Home's seconds-long latency remains an operational readiness risk.** [Profile](../../output/p10-integration-20261023/slow-read-profile.json), [HTTP parity](../../output/p10-integration-20261023/profile-http-parity.json).

No new index, query-plan hint, cross-request cache, lock ordering or isolation change was introduced. R01–R07 source hashes and their registered parity/cache tests remain exact. Consequential writes/finalization continue fresh authorization/source/entitlement checks.

## 7. Migration, backup, financial and permission preservation

All **62 migration checksums** and existing table definitions match the accepted baseline. P10 added no DDL. The new full gate passed fresh installs, populated historical upgrades through P04–P07, composite ownership/FKs/unique constraints, restricted runtime negative tests, interrupted-DDL rejection and verified restore/reapplication. Populated recoveries preserve canonical payments/corrections, Original closures, route/replacement evidence and current DOCX bytes/append-only metadata. MariaDB DDL remains nontransactional; recovery is verified backup restoration and controlled reapplication, not an unsafe populated downgrade or deletion of financial history.

Fresh encrypted baseline backup: `output/backups/ldss-1792731477329-19c859f7.ldssbackup`, **2,165,821 encrypted bytes / 138 tables including schema_migrations**. Its isolated restore completed in **3.244 seconds**, passed verification and was removed normally. [Restore evidence](../../output/backups/restore-1792731477448_8cf0de22.json). The development backup is not a claim about full-volume fixture size or an off-host disaster-recovery drill.

Final read-only inventory: all **134 non-authentication business tables**, including every authoritative financial record, match the initial hashes. All **2,781 prior audit rows** remain exact. Only `audit_logs`, `auth_rate_limits` and `auth_sessions` differ: one separately recorded `auth.login` at **2026-10-23T05:41:32.624Z / 13:41:32 Philippine time**. It is retained, not reset or described as financial activity. A whole-development zero-difference claim is not made. All **15 original schemas and 12 LDSS accounts** remain; owned fixture/measurement accounts are gone. All four operational flags remain **false**. [Final preservation](../../output/p10-integration-20261023/final-preservation.json).

**Grant-probe limitation:** the initial inventory retained only order-sensitive raw `SHOW GRANTS` hashes. A post-gate equality assertion failed when MariaDB changed the ordering of grant rows/column lists. Controlled creation of only a disposable fixture reproduced another raw-hash change while canonical privilege sets remained identical. The initial semantic grants cannot be reconstructed from hashes alone; exact initial-to-final semantic equality is therefore **not independently established**. No P10 command changed an original account's grants. Current table/column privileges were validated against the existing approved grant generator: current runtime exact, older runtime grants allowed subsets, no unexpected privilege; every credential-bearing global row is explicitly checked as **USAGE only**, rather than silently excluded. Canonical post-gate-to-final privileges match. The failed raw probe, controlled experiment and qualification are retained. This is an evidence limitation, not an invented proof of initial grant equality. [Qualified grants](../../output/p10-integration-20261023/grants-qualified.json), [controlled experiment](../../output/p10-integration-20261023/grants-controlled.json), [failed probe](../../output/p10-integration-20261023/post-gate-preservation.json).

Fresh dependency audit retains the **same seven existing advisories**: one low, two moderate, two high and two critical in existing Fastify/Vite/Vitest/concurrently paths. They were not introduced or remediated by P10; severity is not suppressed because a path is development tooling. No new third-party security/UI/optimization framework was installed. Exposure/remediation is a separate operational security decision. [Audit](../../output/p10-integration-20261023/dependency-audit.json).

## 8. Defects, failed probes and scope limits

**No reproducible critical financial-integrity or authorization defect was found, and no application correction was necessary.** All 81 UAT suites passed on the first new complete gate. The following supplementary QA failures remain evidence:

| Finding | Resolution / remaining effect |
|---|---|
| Raw grant hash equality failed | Canonical controlled experiment and approved-contract checks completed; initial semantic comparison remains limited as described above. No account privilege was broadened |
| Word COM ownership/open/bind probes stalled; packaged renderer lacked LibreOffice | Owned helper identities were checked before stopping them. Native Word UI then produced the three verified PDFs. No arbitrary user Word session was attached, closed or killed; private test documents were closed without changing the DOCX |
| Initial browser launcher lacked its expected bundled Chromium | Used the already installed Google Chrome; no browser/dependency installation |
| Initial DV selector matched ten Review buttons; initial Registry timing completed before rows | Scoped the private locator and waited for actual rows; no application change or weakened financial expectation |
| Omitted post-payment observer used unsupported `status=paid` and then read an error as queue data | Payment had already succeeded. Did not replay the payment; independent read-only verification used supported `view=paid`, confirmed one canonical row and the nonmember report |
| Private loading-result summarizer expected another probe's `requests` field | Raw completed measurements were retained; area/network-shaped data is summarized independently. This was an observer error, not a browser loading success |
| Before-unload/dialog observer returned before the long recording script finished | Independent final API/storage/screenshot checks established 825/10 and cleared exact-retry state; expected injected 503/401/403/409 are distinguished from crashes |

Known limits remain: **800,000-byte compressed finalization envelope** (content-dependent; the earlier 1,200-member fixture is unsupported at ordinary finalization), unchanged **64 MiB raw-SQL backup cap**, **262,144 decoded bytes per current DOCX**, report **5,000-source / 16-MiB download** safety limits, document/history/audit growth, main bundle warning and expensive full-detail/Home paths. P10 did not repeat an artificial 1,200-member finalization, raise ceilings, truncate evidence or fabricate a finalized roster. No new capacity guarantee follows from these bounds. Previous P07's intermittent prior-approval HTTP 500 did not recur in this gate; P10 does not claim to have fixed its unknown cause.

Screen-reader certification, another browser engine, maximum-size document/report collections, multi-day/concurrent LAN capacity on the operational 16-GB host and off-host disaster recovery remain **Not Yet Tested**. Official forms, legal/operational cutoff authority and any additional closed/expired-period correction evidence remain at their existing approval boundaries. Ordinary open-period Staff date authority is preserved. No claiming extension or accounting authority is invented.

## 9. Final fingerprints and recommendation

Final enumeration and SHA-256 verification reconcile **683 source inputs, 261 build artifacts and 62 migrations** with accepted P09 and the new gate. There are **zero application/build/migration additions, changes or deletions** in P10. The exact gate records per-file hashes; the candidate/final evidence retains gate, schema, report and screenshot hashes separately. [Candidate fingerprints](../../output/p10-integration-20261023/candidate-fingerprints.json), [final verification](../../output/p10-integration-20261023/final-verification.json), [frozen evidence manifest](../../output/p10-integration-20261023/frozen-evidence/manifest.json).

**P10 ACCEPT — Technical Verification Passed.** This recommends acceptance of local integration verification, with the documented grant-baseline evidence limitation and remaining performance/capacity risks. It is not a declaration of production capacity, office workflow sign-off, official template approval or deployment readiness. The [operational readiness assessment](P10_OPERATIONAL_READINESS.md) classifies required decisions and actions. No operational flag, actual payment, production/LAN database, installed release or remote repository was changed. **P11 and the questionnaire have not started. Stop for explicit user approval.**
