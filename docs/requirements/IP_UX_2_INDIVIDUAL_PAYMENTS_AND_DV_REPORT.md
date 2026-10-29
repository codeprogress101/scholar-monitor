# IP-UX-2 — Individual Payments usability, DV and unified Paid reporting

28 October 2026, Philippine time. **Implemented only in the existing fictional [IP-UAT-1 at 5181](http://127.0.0.1:5181/), API 3031. The user's original individual Paid transaction is preserved. One compact Payment Overview now shows PHP 10,000.00 with the authoritative breakdown **2 Paid · 1 Payroll · 1 Individual**, and four current outcome cards: 2 Paid / 5 Pending / 0 Unclaimed / 0 Needs Resolution.** Primary 5173 and operational LAN received no application or business changes. Persistent DV signatory editing remains a separately scoped contract proposal below.

This continues the existing work and the [IP-UAT-1 environment](../acceptance/IP_UAT_1_INDIVIDUAL_PAYMENTS_TEST_ENVIRONMENT_REPORT.md). It does not substitute primary or an unrelated empty fixture for the reported issue. No UAT reset, database upgrade, F58 migration, new financial writer, permission expansion or eligibility-policy change occurred.

## Actual reported environment and original transaction

| Item | Fresh verification |
|---|---|
| Frontend / API | **127.0.0.1:5181 / 3031**, loopback |
| Database / server | **`ldss_restore_1793167108097_2b47a744`**, DESKTOP-BPLJKRP / 127.0.0.1:3306 / MariaDB 10.4.32 |
| Restricted runtime | `ldss_ipu_cb1da15ff3ac@localhost`; grants confined to this UAT schema |
| Physical release | `C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release`, dedicated Node/dependencies and cookie namespace |
| Controller / API / Vite | **55368 / 62016 / 66772 -> 58304 / 10748 / 59752**; only the verified IP-UAT tree restarted |
| Schema | **149 inventoried base tables / 67 accepted migrations**; original checksums/timestamps preserved |
| Selected reporting period | **IP-UAT-YEAR / IP-FIRST**, cycle `42c2b091-ccba-4dc2-9e34-0beb7d040646` |
| Existing payrolls | PAY-001 processed **v11**; PAY-002 Review **v3**; PAY-003 Draft **v2**, unchanged |

The user's actual Unclaimed transaction is **`8b20c2a7-74b8-4276-859b-3dc3906760aa`**, reference **`LDSS-DV-8B20C2A7-74B8-4276-859B-3DC3906760AA`**. It belongs to fictional case K, Kestrel, and has a retained **Paid / 2026-10-28 / PHP 5,000.00** individual settlement. The other effective Paid obligation is fictional case M's ordinary payroll payment dated **2026-10-19**. There are three raw payment records: those two Paid records and the original Not Paid/Unclaimed payroll record. The latter remains Unclaimed after later individual settlement; it must not be rewritten as payroll Paid.

The 5181 browser's original Dashboard GET returned **1 Paid / 3 Pending / 1 Unclaimed** across five frozen payroll rows. Its own Cheque Payments data contained the separate Paid settlement. That discrepancy is reproduced in the same database. The fresh owned copies retained this exact transaction before tests. [Target inspection](../../output/ip-ux-2-20261028/inspection.json), [actual before Dashboard response](../../output/ip-ux-2-20261028/before-browser.json), [final actual responses, both roles](../../output/ip-ux-2-20261028/overview-after-browser.json).

## Causes and action-first discovery

The original Dashboard deliberately summarized finalized **payroll attempt rows** through `recordingSummary`. It did not include later Individual Payment settlements. Adding those transaction counts directly to payroll attempt counts would mix counting units. The final **Payment Overview** combines the Paid summary and current obligation counters in one section. The old separate panels are no longer rendered; retained payroll outcomes remain in a compact history disclosure.

Not Yet on Payroll previously used broad labels such as Additional review required and Review Recovery Options. The existing read-only recovery service already enforced role, preparation, period, source and Draft/Review restrictions. Presentation now names the condition and exposes the supported next review without introducing a command.

| Condition | Visible route and retained restriction |
|---|---|
| No assignment, complete requirements | **Not assigned to payroll / Review Payroll** |
| Missing or unresolved requirements | **Requirements incomplete / needs review / Review Requirements**; no duplicated link to the same destination |
| Draft deferral | **Deferred — Draft payroll / Review Recovery Routes**; **Restore to Payroll** appears only when the fresh backend recovery response supplies its authorized link |
| Review deferral | **Deferred — Review payroll**; authorized **Return Payroll to Draft** first, then the existing restoration command |
| Frozen source | **Finalized source — omission review**; no direct restoration of finalized/submitted/processed membership |
| Reservation or Paid evidence | **Already on payroll / reserved**, or **Paid this semester / View Restriction**; existing financial source remains authoritative |

Recovery retains **Original Payroll**, **Review Another Payroll** and **Review Individual Payment** destinations. Staff receives the existing Coordinator restriction. Closed preparation, unavailable/expired periods and missing finalized sources retain their actual explanations. Complete source reasons remain accessible in compact disclosures. The four workspaces, name/ID search, 25-row pages, server bounds and review filter remain. Needs Review still rejects more than 100 matching unassigned scholars rather than omitting matches.

**Deferral does not authorize an individual payment.** A later payroll still needs genuine destination eligibility and source ownership. Individual processing still requires the existing finalized-source omission assessment, preparation/claim rules, permission, approval and OR/DV path. Finalization alone is insufficient. Any proposed pre-finalization individual-payment route needs separate office policy and a separately reviewed source/authorization design; none was added.

## Payment Overview reference and the missing Unclaimed scholar

**Opened and visually inspected:** `C:/Users/ADMIN/Downloads/Payment Overview Dashboard.png`. It controls the final visual hierarchy: one heading/context/action row, prominent Paid peso amount, compact source breakdown and four actionable status counters and one proportional status bar. Existing LDSS typography, green theme, components and focus conventions are retained. Mockup numbers were not treated as financial authority.

The actual 5181 investigation traced the original allocation, semester entitlement, payroll payment, later individual transaction, current corrections and the existing Unclaimed queue. All point to **IP-UAT-YEAR / IP-FIRST / PAY-001**, not a different academic period.

| Same fictional scholar K | Authoritative fact |
|---|---|
| Original finalized allocation | Retained in PAY-001 for the same stipend entitlement |
| Original payroll payment | **Not Paid / `did_not_claim`**, no Paid date; retained as Unclaimed in payroll history |
| Later individual transaction | **`8b20c2a7-74b8-4276-859b-3dc3906760aa`**, Unclaimed route |
| Current individual settlement | **Paid / PHP 5,000.00 / actual date 2026-10-28** |
| Existing original-source DTO | Reports **Paid**, because its same-scholar/semester Paid-elsewhere check finds that settlement |
| Actionable Unclaimed queue | **0**; its existing `paid_elsewhere=0` condition correctly excludes the already-settled obligation |

**No missing-scholar or roster-filter defect was found.** The discrepancy came from displaying the retained payroll outcome as though it were current unpaid settlement. The original Unclaimed row must remain evidence. It is no longer counted as a current Unclaimed obligation. [Actual 5181 trace, raw original/later payments, allocation and API responses](../../output/ip-ux-2-20261028/unclaimed-investigation.json).

The same database also contains **two other prepared, unpaid individual transactions**, fictional J and O. The final counters use unique obligations across finalized payrolls and prepared/recorded individual routes:

| Final current figure | Reconciled source |
|---|---|
| **Paid 2 / PHP 10,000.00** | M: one payroll Paid; K: one later individual Paid |
| **2 unique Paid scholars / 2 effective Paid transactions** | Distinct scholar IDs / current effective payment-record IDs, not correction events |
| **Payroll Paid 1 / Individual Paid 1** | Disjoint channels of those same Paid obligations |
| **Pending 5** | Three unpaid payroll allocations plus J/O's two prepared individual transactions |
| **Unclaimed 0** | K is already Paid individually; no other current Unclaimed obligation exists |
| **Needs Resolution 0** | No effective reversed/ambiguous payment in the actual current scope |
| **7 current obligations** | Five finalized payroll obligations plus two prepared omitted-individual obligations; K's original/later sources count once |

Pending is a reporting status, **not payment eligibility or release authority**. The UI states its **3 payroll + 2 prepared individual** basis. It does not copy the mockup's payroll-only Pending 3 into a broader scope. If a genuinely unpaid Unclaimed source exists, it remains Unclaimed; existing financial restrictions remain visible through source review. An approved individual outcome reversal appears in Needs Resolution rather than silently granting a new payment route. Ambiguous multiple unpaid payroll attempts also require review instead of guessing source ownership.

**Source history** retains the five payroll rows: **1 Paid / 3 Pending / 1 Unclaimed**. Its source view identifies K as **Original Unclaimed; now Paid individually**, with separate links to the original Payroll Recording batch and the exact Individual Cheque transaction. Current Unclaimed opens a truthful empty result; it does not hide a failed read as zero.

### Read contract and drill-down

The new **GET `/api/v1/dashboard/paid`** remains a read-only, freshly authorized snapshot under existing `configuration.read` plus **`ovr.process`** authority. Its additive read projection uses existing effective-payment correction SQL, finalized allocation/reprocessing membership and the existing prepared-individual queue scope. No recording endpoint, entitlement calculation, financial source authority or write contract changed.

- Total Paid counts distinct stipend **entitlement IDs** with one current effective Paid record. Paid scholars and effective transactions are counted separately.
- Paid pesos use exact integer centavos checked against the approved entitlement. Duplicate Paid claims, missing relationships or amount mismatches stop the total for review.
- Applied/approved corrections replace effective outcomes; pending corrections are flagged and do not change the effective count. Original rows remain immutable.
- Source scope is bounded to **50 finalized payrolls**, **5,000 unique obligations**, and **5,000 rows per source projection**. Excess rejects without truncation. Frozen membership counts are revalidated; unsupported amended sources reject.
- Records use server pages of **1–100** (UI **25**), bounded offset **100,000**. Only a bounded page reaches the browser. Four bounded set-based source reads replace per-scholar eligibility hydration; this is not a maximum-load benchmark.

Paid, Pending, Unclaimed, Needs Resolution, Payroll Paid and Individual Paid each open matching records. **View Payment Records** opens all current obligations and retains the period totals for unique Paid scholars and effective Paid transactions. Those technical statistics are absent from the main Dashboard. Each row shows current status, source evidence, approved amount and actual Paid date where one exists. K's Paid link opens **that exact transaction**, not the unrelated Pending queue. Original Unclaimed history is separately selectable. Keyboard cancellation restores the same trigger; confirmed summaries remain available during a filtered read.

On an owned copy containing K's original settlement, a second omitted Paid operation changed current counts **2/5/0/0 → 3/4/0/0** and pesos **10,000→15,000**. Exact retry added nothing. A pending reversal retained 3 Paid; independent Coordinator approval changed counts to **2/4/0/1** and pesos back to **10,000**, retaining the original Paid record and all protected source/document tables. [Final focused count tests](../../output/ip-ux-2-20261028/overview-integration.json). Earlier exact-retry, restoration and document proof remains in [the six-group integration](../../output/ip-ux-2-20261028/integration.json).

## DV reference, mapping and document history

The actual downloaded 5181 file `DRAFT-DV-8b20c2a7-74b8-4276-859b-3dc3906760aa.docx` was compared with the supplied **`C:/Users/ADMIN/Downloads/DV-Reference.jpg`**. The old DV had blank address and certification names and a generic individual-route explanation. Its current numbering/receipt blanks and draft warning were appropriate and remain protected.

The optional **`ip-uat-dv-reference/v1`** renderer reconstructs the photo's form structure: LGU header and existing logos; DV title/blank number; payment-mode boxes; payee/TIN/OR fields; address and responsibility center; explanation/amount; A/B certification above C approval and D receipt. Letter portrait, editable Word tables and clean one-page print/PDF output are retained. The draft/UAT warning, separate date rows and internal-source footer are deliberate fidelity differences. No signature or official number is copied from the photograph.

| DV field | Source / treatment |
|---|---|
| Payee | Verified full name from the existing authorized `DocumentSource`; optional OR payee text cannot override it |
| Address | Requested form text **DAET, CAMARINES NORTE**, not an invented Registry address change |
| Explanation | Requested stipend-release wording using the actual source semester, academic year and approved centavos; supported additional explanation retained |
| Amount | `documentMoney` / `pesoWords` from the approved source; a separate **PHP 5,010.25** renderer test proves 5,000 is not hardcoded in the layout |
| Office/unit | Existing bounded optional document field; code stays blank without evidence |
| DV no., TIN/employee no., OR no. | Blank where no supported official value exists |
| Payment mode, signature/date, cheque/bank/receipt fields | Blank for actual authorized completion; no payment fact inferred from document generation |

The proposed **fictional UAT preset** contains the requested Caroline Maisie J. Robles / Municipal Accountant, Rodante V. Forbes / Municipal Treasurer, and Rossano C. Valencia / Municipal Mayor, with the requested capacities. It is explicitly labelled **fictional UAT proposal**, not current office appointment authority. Its full preset, layout/version and template fingerprint are saved through the **unchanged existing document-generation writer** in each immutable template snapshot, audit and command result. The default production renderer remains unchanged; only the dedicated UAT API adapter injects this optional formatter.

**Persistent signatory editing is stopped.** Existing `PAYROLL_SIGNATORIES` settings supply four ordinary-payroll roles, which do not map to DV A/B/C. There is no dedicated audited DV-settings contract. The minimum separate extension is a strictly validated A/B/C preset setting with version, actor, reason/approval reference and existing appropriate operator/Coordinator authority explicitly decided; its version/hash must enter document review, stale-source revalidation and the already-supported generated template snapshot. No new schema requirement has been demonstrated, but that setting/source and authorized editing contract must be reviewed before implementation. This task added no settings UI, write endpoint, permission or office-policy record.

Current 5181 documents were **not regenerated or rewritten**. The user's already Paid K transaction and downloaded original DV remain historical evidence. The new format applies to future authorized generations of prepared unpaid transactions. Existing documents may need explicit regeneration when their template differs; no automatic command runs. The existing prepared/unpaid document boundary was not relaxed to regenerate a Paid transaction.

Owned-copy samples: [J draft DV Word](../../output/ip-ux-2-20261028/documents/J-DV.docx), [J PDF](../../output/ip-ux-2-20261028/documents/J-DV.pdf), [O PDF](../../output/ip-ux-2-20261028/documents/O-DV.pdf). [Old rendered DV](../../output/ip-ux-2-20261028/documents/before-DV-page-1.png) / [new rendered DV](../../output/ip-ux-2-20261028/documents/J-DV-page-1.png). These compare form layouts using different clearly fictional scholars; they do not claim the user's Paid K document was regenerated.

The packaged `render_docx.py` failed because LibreOffice is absent. Installed native Word exported the actual DOCX files read-only to PDF; all **three one-page** PDFs were rasterized and visually inspected. New samples show no clipped cells, overlapping logos or split certification/receipt blocks. Maximum-length supplementary text, other Word versions and office printer acceptance remain unverified. [Render evidence](../../output/ip-ux-2-20261028/documents/render-results.json).

## Exact source boundary and UAT-only installation

The original staging work was retained. The final package has **15 source/test files: nine existing changes and six additions**, plus **one UAT API-adapter wiring change**. Repository-root application files and primary's physical release were not promoted or replaced.

| File, relative to the isolated release | Scope |
|---|---|
| `server/dashboard/paid-settlements.ts`, `payment-overview.ts` **new** | Effective Paid and unique current obligations, bounded source checks, status/source filters and conflict rejection |
| `server/dashboard/service.ts`, `routes.ts` | Existing snapshot/role checks and new GET registration |
| `src/DashboardPaid.tsx` **new** | One reference-led Payment Overview, counters, source breakdown and matching-record dialog |
| `src/DashboardPage.tsx`, `DashboardCharts.tsx` | Mount only the combined overview; retain the labelled legacy chart implementation for compatible tests, without rendering it as a second panel |
| `src/discovery-presentation.ts` **new** | Conditions and action labels without granting authority |
| `src/IndividualPaymentDiscovery.tsx`, `DeferredRecoveryDialog.tsx` | Clear actions, correct requirements destination and existing role-aware recovery routes |
| `server/payments/document-uat-preset.ts` **new** | Optional fictional DV formatter and snapshot metadata |
| `server/app.ts` | Optional renderer dependency, default unchanged |
| `src/IndividualDocuments.tsx` | Explain verified DV fields/preset; label and limit optional payee/address editing to the OR form |
| `tests/ip-ux-2.test.ts` **new** | Nine focused count, bounds, permission, label and DV cases |
| `src/styles.css` | Append scoped overview, touch/focus and responsive rules after the exact accepted CSS prefix |
| `scripts/ip-uat1/api.mjs` | Inject the optional renderer only in 5181's dedicated API |

Only **six compiled server JavaScript files** change/add. Financial/deferral/restoration/omission/settlement/correction/document business writers, original document renderer, SQL migrations, permission maps, dependencies, financial output builders and branding assets remain exact. The separate reviewed source and matching client/server build were installed while only the verified UAT services were quiet; the dedicated integrity manifest was updated to the reviewed hashes. UI-only refinements suppress a duplicated Requirements link and remove the Dashboard’s separate scholar/transaction statistics and source tiles. The final hero shows only the amount and dynamic Paid / Payroll / Individual line; View Payment Records retains the technical totals. Its scoped controls preserve 44-pixel targets. The two-file final refinement changed no backend bytes and required no restart. The final combined-reader/UI installation used another coordinated UAT-only restart; primary was not restarted. Old hashed client assets remain retained.

[15-file hashes and compiled boundary](../../output/ip-ux-2-20261028/candidate-files.json), [installation](../../output/ip-ux-2-20261028/promotion.json), [source/runtime proof](../../output/ip-ux-2-20261028/source-final.json). Saved pre-change inputs and manifest are under `output/ip-ux-2-20261028/baseline/`; review source is under `candidate/`. A rollback must preserve subsequent UAT records, coordinate the optional formatter/API/UI and update the UAT integrity manifest. It must not reset the UAT database or restore the original seed over the user's settlement.

## Recovery, focused acceptance and screenshots

Accepted BACKUP-1 captured the **current 5181 database**, including the user's Paid transaction: **1,901,293 SQL bytes / 477,785 encrypted bytes**, SHA-256 **`f52264ff5e7d699e7b5c8da9642cd3417f5cd2fda20aef505042faa8af41ecfe`**. Complete isolated restoration verified all **149 tables**, values/counts/checksums, schema/journal, constraints, views and rejection probes. Newly owned copies supplied unchanged browser cases after each mutation acceptance; four owned copies were used and removed across the continued task. None was restored over 5181 or primary. Archives and credentials remain restricted; accepted finite bounds and reviewed native binary import client were retained. [Recovery](../../output/ip-ux-2-20261028/recovery.json).

| Newly executed validation | Result |
|---|---|
| Lint, typecheck/build, secrets | Exit **0** on final isolated source |
| Earlier full unit checkpoint | **141 files / 977 tests passed** before the final combined-overview extension |
| Combined-overview focused unit checks | **Six files / 60 tests passed** for Dashboard, discovery/recovery, documents and settlement, including the two additional current-obligation cases |
| Final compact UI refinement | Lint, typecheck/build and secrets exit **0**; **three relevant tests in two files passed**, with 14 unrelated cases intentionally skipped. Both-role five-width, dynamic counts, technical-details placement and source-link acceptance repeated on actual 5181. No financial mutation suites were repeated for this presentation-only change. |
| Earlier owned current-state integration | **Six groups passed**: exact original count, both-role pages, all discovery filters, versioned documents/retry/history, omitted Paid/duplicate checks, approved reversal, existing Draft/Review recovery and frozen restriction |
| Final combined-count integration | **Three groups passed**: all filtered pages/roles, Paid + exact retry, reviewed reversal + original evidence preservation |
| Relevant unchanged financial suites | **Three command groups exit 0**: financial reports/Recording/reconciliation; individual settlement including races; omitted settlement plus reports/documents |
| Actual 5181 acceptance | Staff and Coordinator; four workspaces, exact original payment/count, direct source links, form display, modal keyboard/focus, **zero business-command attempts** |
| Responsive | Both roles at **1440 / 1024 / 820 / 375 / 320 CSS px**, height 900; local table scrolling, no page overflow |
| Print/document | Two new Word samples and the original downloaded DV each render to one PDF page; all page images inspected |
| Native zoom | New combined section **not certified at native 200%**; unavailable runtime/focus prevented a valid new sample |

Native 200% of the **new combined Dashboard remains unverified**. Both installed computer-use entry points returned a kernel-assets initialization error. A fresh headed Chrome attempt with viewport emulation disabled could not obtain foreground focus; the verified foreground check therefore sent **no zoom keys**. UI Automation exposed no usable zoom/menu controls. No DPR-1 or simulated CSS zoom image is presented as native acceptance. Earlier Coordinator native **464×458 / DPR 2** proof applies only to the earlier layout and unchanged recovery flow. The final five-width, keyboard, modal focus and source-navigation checks passed for both roles. [Native limitation](../../output/ip-ux-2-20261028/overview-native-limit.json). Full AT/WCAG and office printer certification are not claimed.

[Final compact checks](../../output/ip-ux-2-20261028/compact-verification.json), [focused unit log](../../output/ip-ux-2-20261028/compact-focused.log), [final build/typecheck](../../output/ip-ux-2-20261028/compact-build.log), [review source ZIP](../../output/ip-ux-2-20261028/candidate-source.zip).

The broader accepted security, migration and large-cohort evidence is reused where its contracts are unchanged, as recorded in [IP-UAT-1's impact inventory](../../output/ip-uat-1-20261028/EVIDENCE_REUSE_AND_CHANGE_IMPACT.md). No repeated full 835-person workflow or MariaDB upgrade research was performed.

The supplied mockup was inspected before the combined redesign. The before images below are **actual 5181's intermediate two-panel layout**, captured before combining it; Paid already reconciled to 2 there, but the payroll-only Unclaimed counter still showed 1. The final images use the same database, period and financial records, with current settlement counts and one section. Primary was never used as a substitute or reverted for pictures.

| Actual 5181 view | Before combination | Final |
|---|---|---|
| Dashboard, 1440 | [Before](../../output/playwright/ip-ux-2/payment-overview-before-coordinator-1440.png) | [After page](../../output/playwright/ip-ux-2/payment-overview-after-coordinator-1440.png) / [overview](../../output/playwright/ip-ux-2/payment-overview-after-coordinator-section-1440.png) |
| Dashboard, 320 | [Before](../../output/playwright/ip-ux-2/payment-overview-before-coordinator-320.png) | [After page](../../output/playwright/ip-ux-2/payment-overview-after-coordinator-320.png) / [overview](../../output/playwright/ip-ux-2/payment-overview-after-coordinator-section-320.png) |
| Matching individual Paid | Same original settlement retained | [Direct source view](../../output/playwright/ip-ux-2/payment-overview-after-coordinator-individual-320.png) |
| Original Unclaimed history | Retained original payroll outcome | [Original → current Paid](../../output/playwright/ip-ux-2/payment-overview-after-coordinator-source-history-320.png) |
| Actionable Unclaimed queue | Correctly excludes already-Paid K | [Actual empty queue](../../output/playwright/ip-ux-2/payment-overview-after-coordinator-empty-unclaimed.png) |
| Discovery | [Before](../../output/playwright/ip-ux-2/before-discovery-1440.png) | [Action-first](../../output/playwright/ip-ux-2/after-coordinator-discovery-1440.png) |

The user’s final compact refinement removes the separate Unique Paid scholars and Effective Paid transactions statistics from the main page, reduces the hero and history text, and retains those counts only in View Payment Records. It uses the same live source counts; no fixture values are hardcoded.

The final overview passed both roles at all five widths, all six current/source filters, original-source history, the exact transaction link and empty Unclaimed queue, without business-command attempts. [Final actual 5181 browser results](../../output/ip-ux-2-20261028/overview-after-browser.json), [earlier four-workspace/document UI checks](../../output/ip-ux-2-20261028/after-browser.json). Images contain fictional identities only.

Early helper failures were not bypassed: a historical table-name assumption was corrected before mutation; JSON Date/string normalization corrected preservation comparison; the first regression invocation lacked the required development guard environment, and the next required the already-reviewed native binary restore client. Final regressions retained their assertions and passed. An existing discovery-warning assertion led to retaining the concise payment-authority warning. A cramped 320px counter label was corrected with scoped mobile rules; final images retain whole words. A browser helper initially expected the Scholar ID as a standalone text node; the actual direct link had correctly opened its combined ID/name heading, and the final check asserts that heading. Native focus failure is qualified above. No financial guard or test bound was weakened.

## Preservation, limits and stop

The final complete comparisons preserve primary's **150 inventoried tables**, original schema and **67** migration rows/timestamps, original audits and all business values. **803 Paid records** remain exact: **two dated 24 October, 798 dated 26 October and three dated 28 October**. PAY-001 remains processed **v805**, PAY-002 processed **v8**, PAY-003 Draft **v4**. All **20,318 starting audit rows** remain exact. A separate non-task **`auth.login` at 16:23:47.160353 Philippine time** appended one row (**20,319 total**) with ordinary session/rate-limit activity. No other primary table changed. The task issued no primary authentication or export command and did not revoke that session. Its running release's **21,258** files, all **1,402** protected repository inputs, and primary/LAN listener owners remain exact.

In the **actual 5181 database**, every starting business value remains exact, including the original individual Paid settlement, all raw payments/dates, document bytes/version/source history, command ledgers, deferrals, approvals, official membership, allocations and frozen payroll evidence. Only 12 ordinary task logins/12 logouts and related session/rate-limit activity differ: **285→309 audits**. Both targets’ original audit prefixes independently match the accepted inventory checksum at complete datetime precision. [Full-precision audit-prefix proof](../../output/ip-ux-2-20261028/audit-prefix.json). No UAT payment, correction, document generation, restoration, approval or preparation command was submitted during actual-instance acceptance. [Final database preservation](../../output/ip-ux-2-20261028/final-preservation.json), [source/owner proof](../../output/ip-ux-2-20261028/source-final.json).

All four owned-copy databases, their runtime/scoped-definer accounts and temporary 3032/5182 services were removed after acceptance. Existing IP-UAT-1 remains available on **5181/3031** with its original database and dedicated account. [Cleanup](../../output/ip-ux-2-20261028/cleanup.json). No operational LAN database, service or configuration was used or changed; LAN-R2A remains paused.

Remaining decisions are persistent DV signatory configuration/approval, current office form/signatory authority, any proposed early deferred-scholar individual-payment policy, and office printer/maximum-length document acceptance. Unified reporting intentionally rejects conflicting/excessive source scopes and flags ambiguous unpaid attempts; it does not reconcile them. Native 200% of the final combined section remains an acceptance limitation. Existing build chunk warnings remain. Primary installation, broader load/concurrency acceptance and operational release require separate authorization.

**Stopped after IP-UX-2's permitted UAT-only corrections, focused acceptance and reporting. The user's original 5181 Paid transaction and DV history are preserved. No primary or LAN application activation, payment/history repair or financial-policy change occurred.**
