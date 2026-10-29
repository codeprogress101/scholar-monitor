# LDSS populated UAT dataset verification

Verified **24 October 2026, Philippine time**. The six retained synthetic fixtures are usable for controlled requirements, functional and UI testing. The environment is not an operational release or named office acceptance. Setup and rebuild instructions are in [the environment report](LDSS_POPULATED_UAT_ENVIRONMENT.md); [the LAN import plan](LDSS_LAN_ROSTER_IMPORT_PLAN.md) remains pending explicit source/field approval.

## Isolation and preservation

| Check | Result and evidence |
|---|---|
| Accepted application/build/migrations | **1,006 inputs match P10:** 683 source inputs, 261 build artifacts, 62 migrations. `.env` hash and four false development flags match. No application, dependency, schema-migration or permission-rule change. |
| Existing development data | All **138 table definitions and row counts** match the initial snapshot; **137 table fingerprints match exactly**, including financial/business histories and audit logs. **`auth_sessions` differs at the same 187-row count.** Initial table hashes cannot establish which session fields changed or the cause. No whole-development zero-change claim is made, and no session/audit data was reset. |
| Schemas and database identities | All original **15 schemas / 12 LDSS accounts** retained. Exactly six owned UAT schemas and six matching restricted runtime identities were added; canonical privileges of original LDSS accounts match. No LAN schema was queried for scholar records. |
| Prior QA files | The three existing main-payroll sample files touched by the reused fixture were archived and restored byte-for-byte. |
| Destructive operations | No populated UAT, development or LAN database was reset. A newly created, failed **empty** provisioning allocation was rolled back only after confirming zero tables/accounts/records and absence from the initial schema inventory. |
| Privacy | Fictional identities only; no original Scholar IDs, real identity map, actual COR/COG, financial documents, cheque data, credentials or representative identities imported. Private UAT credentials/backup key have local Windows ACL restrictions. |

Evidence: `output/populated-uat-20261024/preservation-before.json`, `preservation-after.json`, `empty-allocation-rollback.json`, `previous-fixture-artifacts.json`. The first strict whole-table comparison failed on `auth_sessions`; the final preservation result retains that qualification rather than hiding it. No financial-integrity or role restriction was relaxed to obtain a pass.

## Dataset and financial checks

| Fixture | Synthetic profiles / unique IDs | Payroll Paid / Unclaimed / Pending | Retained state |
|---|---:|---|---|
| A | **866 / 866** | **0 / 0 / 835** | Processed; ready for recording |
| B | **858 / 858** | **825 / 10 / 0** | Recording complete |
| C | **858 / 858** | **825 / 10 / 0** | Staff returned verification complete |
| D | **858 / 858** | **825 / 10 / 0** | Closed Original reconciliation |
| E | **858 / 858** | **826 / 9 / 0 Updated** | Original remains **825 / 10**; individual activity is separate |
| F | **4 / 4** | Separate small source fixture | Frozen two-member source and later omitted OR + DV settlement |

Every fixture passes **62 migration checksum checks**, **341 composite/simple foreign-key relationships with zero orphan rows**, and enabled foreign-key/check enforcement. A separate read-only comparison confirms all application metadata matches the accepted development schema: **1,098 column entries, 702 index-column entries, 767 constraints, 791 key-column entries and 172 checks**, excluding only the UAT ownership marker. Each fixture has 139 base tables including that marker. Each standard frozen payroll has exactly 835 members and PHP 4,175,000 approved. No frozen membership was fabricated or modified to demonstrate another scenario.

B–D show PHP 4,125,000 Paid and PHP 50,000 Unclaimed. D/E have exactly one Original closure; its stored hash and Original 825/10 totals remain unchanged. E's Coordinator correction produces 826/9 Updated outcomes, plus three independently acknowledged later DV payments. Individual reports count distinct entitlements and effective payment attempts; verified reports have **zero duplicate Paid conflicts**. The pending discrepancy examples do not create additional Paid records.

E's Individual Payment Settlement Information covers **eight transactions/entitlements, three Paid attempts for PHP 15,000**, not all 835 payroll members. One source remains without a request. Do not interpret this activity report's outstanding subtotal as the whole payroll's outstanding amount. Original, Updated, individual activity and current settlement remain different report bases.

F's eligible omitted scholar uses the existing later-editable-payroll route before preparation closure, then genuine Coordinator authorization for OR + DV. Cancellation/replacement preserves the frozen source. Its acknowledged PHP 5,000 individual release and later Coordinator date correction remain separate from payroll membership. Staff correction approval is denied. No official receipt number, actual cheque or real person is invented.

Per-schema evidence: `verification-A.json` through `verification-F.json`, `inventory-A.json` through `inventory-F.json`, `schema-comparison.json`, `summary.json`, `addition-and-correction.json`, `cancelled-original-conflict.json`, and action records under `output/populated-uat-20261024`.

## Workflow coverage

| Area | Verified examples and limits |
|---|---|
| Registry and import | 835 reviewed selected New/Continuing identities, unique permanent IDs, missing details, varied names/placement, duplicate rejection and explicit separate-person review. No production mapping. |
| Calendar and history | Three synthetic years/six semesters in A–E; A has academic placement evidence across all three years. F preserves the established smaller main-payroll fixture calendar and continuing admission flow. A future live annual rollover is not performed against the preserved Pending fixture. |
| Masterlists | Draft, for-verification, submitted-for-approval, approved and published lists; genuine course-completion amendment and later controlled addition. Earlier publication versions retained; Staff submits and Coordinator approves. |
| Documents | 835 COR + 455 COG ordinary verification in the bulk fixture; 380 unknown historical courses remain truthful. Scoped Coordinator prior-batch adoption supports the accepted payroll source without fictional grades. Smaller cases retain missing/partial, submitted, for-verification, verified, rejected and corrected/resubmitted evidence. Physical receiving dates/references remain separate from server entry timestamps. |
| Academics and standing | Failed-subject and INC findings produce noncompliance without automatic termination. Approved transfer, holds, suspension, graduation/final-semester confirmation and pending leave decision use existing controls. Unknown facts are not filled in to make scholars eligible. |
| Payroll and recording | All five standard payrolls use import, publication, source validation, Staff review, Coordinator finalization, submission and processing. Reviewed ten-Unclaimed and remaining-825-Paid operations use existing preview/commit commands and exact retries. |
| Individual payments | Request/preparation/documents/forwarding, personal and representative acknowledged single release, reviewed two-payment bulk release, cancellation, replacement, discrepancy reporting and Coordinator correction. Representative evidence stores only the approved synthetic attestation. Some intermediate states are in histories, not separate current transactions. |
| Reporting | Provisional, Original, Updated and individual settlement bases, Paid/Unclaimed filters, pending rows, omitted settlement, current/historical placement and corrections. Download totals and unique entitlement accounting verified. |
| Authority gaps | Current Q28/PB1 post-semester settlement guards remain operative; no new late-release policy is implemented. Q30/PB2 evidence scope and PB6 official form approval are not resolved by a synthetic fixture. |

This is a populated environment and representative verification, not exhaustive coverage of every permutation. Additional simultaneous blocked/unassessed omitted cases, future rollover variants, multi-user sustained LAN workloads and office-specific late-period authority cases can be added as separately scoped fixture variants without resetting these baselines.

## Authorization and recovery

Required Staff, Coordinator and pure Administrator accounts are isolated per schema. An unassigned account supports denial checks. Normal Staff receiving/recording succeeds; Coordinator authorization/closure/correction succeeds; unauthorized Staff approvals and pure Administrator financial/Registry access fail. Browser navigation also hides operational links from the pure Administrator.

The reused drivers exercise malformed imports, duplicate warnings, forged roles, CSRF, stale source hashes, exact retry, transactional audit rollback, exclusive routes and protected history writes. Runtime probes reject protected DELETE/UPDATE operations and confirm no global or other-schema privileges. **44 tests in five files passed**: `read-cache`, `payment-recording`, `payroll-reconciliation`, `individual-settlement` and `financial-reports`. This is not a fresh 81-suite P10 gate or a new dependency/exploit scan. Inherited dependency advisories remain separately tracked.

Guard checks reject unknown/path-traversal scenario names, existing-manifest overwrite, missing destructive confirmation and a development-name confirmation. Dry-run inventories perform no deletion. Cleanup additionally binds the exact runtime identity to the generated schema suffix, rechecks table counts/names and rejects a shared/privileged account. No populated destructive cleanup was executed.

Encrypted F backup: **985,051 bytes / 139 tables**. Existing tooling restored it to a newly allocated isolated schema in **3.016 seconds**, verified data/schema/constraint inventories and rejection probes, then removed only that temporary restore schema/account. No development restore, global read lock, off-host drill or Coordinator office validation is claimed. Current backup limits remain 64 MiB raw SQL / 96 MiB archive.

## UI and exported artifacts

Fresh Chromium checks use fictional populated data at **1440×900 desktop** and **820×1180 tablet** widths. Home, Registry, Masterlists, Payroll, Individual Payments and Reports loaded without page-wide horizontal overflow or visible alerts in the checked states. Payment Recording displayed 25 rows and the correct A Pending/B 825/10 totals. Long names remain visible in wrapped table cells; the dense tablet hierarchy remains an enhancement candidate.

Registry search returned the expected single fictional scholar and pagination changed the visible set. Documents, Academic records, Scholarship and History profile tabs opened without page overflow. The skip link focused `main-content`. The 835-Paid preview opened, Escape cancelled it and focus returned; **no payments were committed to A**. A browser-local simulated read-only 503 displayed an error and recovered after removing the interception. It is an injected test, not a production defect.

Staff, Coordinator and pure Administrator browser sessions were checked independently. The Administrator had zero Payroll, Individual Payments or Registry navigation links. API denial checks complement these visibility observations.

The attempted Ctrl+Plus shortcut left `devicePixelRatio` and viewport width unchanged. **Native browser zoom is not verified.** These viewport/keyboard checks are not a screen-reader, contrast, cross-engine or complete accessibility certification. Screenshots and machine-readable browser results are under `output/playwright/populated-uat` and `output/populated-uat-20261024/ui-*.log`.

Generated artifacts verified: **12 Excel workbooks, 12 PDFs and 11 draft DOCX files**. All 835 B payroll IDs occur exactly once in its workbook and PDF. Excel workbooks contain no formula cells. PDF text blocks remain within page bounds; the long-name B sample is 55 A3-landscape pages, unlike P10's different-name 46-page sample. Representative pages were rendered and inspected. DOCX ZIP/XML structures and draft notices, including headers/footers, pass; preparing or downloading did not record payment.

Native Word automation did not complete and produced no PDF. Only the automation instance created by this task was stopped; source DOCX files were opened read-only. **No fresh native Word or native Excel print-layout acceptance is claimed.** PB6 remains open. Existing P10 native Office evidence retains its historical meaning. Evidence: `export-structure-verification.json`, `pdf-verification.json`, `native-word-limitation.json`, generated exports and representative PNGs.

## Performance observations

No optimization, cache framework, authoritative-read bypass or safety-limit change was made. Direct service measurements use restricted runtime connections, explicit GC and instrumented SQL round trips. Reads have three sequential observations including first-use overhead; legacy detail and exports have one observation. Fixture setup HTTP timings include authentication/session work. Other workstation activity and some concurrent integrity reads limit latency comparisons; SQL timing is client round trip, not MariaDB CPU.

The closest P10 comparison uses **A's same 835-member Pending state and direct service methods**:

| Operation | P10 ms | New ms | P10 / new SELECTs |
|---|---:|---:|---:|
| Recording summary, three-read medians | 18.41 | 18.33 | **14 / 14** |
| Roster page, three-read medians | 21.43 | 23.91 | **10 / 10** |
| Scholar-ID search, three-read medians | 20.46 | 20.61 | **10 / 10** |
| Full payroll detail | 15,211.89, prior three-read median | **22,492.93, one new observation** | **3,188 / 3,188** |

Full-detail payloads differ, approximately 36.49 MB new versus 36.11 MB P10, because fictional presentation differs. The longer observation is retained; neither matching counts nor unchanged source proves an acceptable response time or establishes a cause for the timing difference.

Other new B observations: Registry median **79.74 ms / 9 SELECTs**, scholar search **18.67 ms / 9**, individual queue **31.27 ms / 8**, reconciliation summary **29.39 ms / 20**, report preview **169.85 ms / 31**. Dashboard median is **14,186.91 ms / 580 SELECTs**, compared with the historical isolated P10 **7,435.44 ms / 580** observation. The expensive derived-count path remains a material investigation item; these shared-host samples do not establish a causal code regression or a capacity pass.

C's 825-Paid preview/commit observations were **4,161.33 / 5,360.60 ms** through injected HTTP, compared with P10's differently scoped direct-service **4,437.29 / 5,400.22 ms**. New B XLSX/PDF exports were **679.03 / 1,585.87 ms**, but B has no later-DV activity while the P10 comparison exports include ten later settlements. These export timings/query counts are not an equivalent settlement workload comparison. E/F action metrics separately record Word generation and individual release costs.

Sampled full-detail process RSS was about **407 MiB in A / 444 MiB in B** in these short separate benchmark processes. P10's approximately 1,523 MiB observation had different allocation history. A 20 ms sampler can miss synchronous peaks; **no memory improvement or sustained-capacity claim follows**. R07 transient peaks, the 800,000-byte compressed finalization envelope, the historical oversized-payroll limitation and backup/document/report bounds remain tracked. No 1,200-member bypass, evidence truncation or larger safety cap was introduced.

Sources: `benchmark-pending.json`, `benchmark.json`, `metrics-C.json`, `metrics-E.json`, `metrics-F.json`, and historical `output/p10-integration-20261023/performance-summary.json`.

## Readiness and next steps

The retained fixtures support **B-O1 and targeted UI enhancement testing now**. No enhancement batch has started. Use A to verify the current-year Registry default and preserve its 835 Pending payroll; use B/C/D/E for their distinct recording/reconciliation states and F for omitted payments. Run fresh verification after deliberate UAT mutations before claiming a scenario still matches its baseline.

Identifiable LAN import still requires approval of the completed source-specific plan. Remaining qualifications are the development `auth_sessions` fingerprint difference, native zoom/Word rendering, additional scenario permutations, PB1/PB2/PB6, dependency exposure, sustained LAN capacity and witnessed office recovery/acceptance. None is silently closed by preparing this environment. No deployment, operational feature activation or destructive reset is authorized or started by these reports.
