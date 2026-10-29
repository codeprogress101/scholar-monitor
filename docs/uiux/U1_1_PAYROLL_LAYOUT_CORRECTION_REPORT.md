# U1.1 — Final Payroll layout and action simplification

26 October 2026, Philippine time. **Completed and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/#payouts).** Secondary Payroll sections now precede the saved roster; redundant opened-batch payment shortcuts are removed; roster search uses an aligned icon button. No permanent candidate, backend change, migration, permission, financial flag or financial-record change was introduced. This follows the explicit U1.1 authorization and the [accepted U1 baseline](U1_ACTION_FIRST_WORKFLOW_SIMPLIFICATION_REPORT.md).

## Verified target, recovery and activation

| Item | Fresh result |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Database | **`ldss_primary_test_12676_61497616`** |
| Restricted runtime | **`ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic / 127.0.0.1:5173 / 3001** |
| Schema | **66 accepted migrations**, checksums and applied timestamps unchanged |
| Controller / API / Vite, before and after | **47348 / 52532 / 42356**, ancestry, commands and loopback ownership unchanged |

All accepted U1 hashes and protected inputs matched. A fresh checkpoint covers **1,320 existing files**, including the intervening report. The actual dirty source supplied staging; Git HEAD was not substituted. Current business/account/grant/audit/payment evidence was captured before editing. No newer unrelated source was overwritten. [Preflight](../../output/u1-1-payroll-primary-20261026/preflight.json), [starting files](../../output/u1-1-payroll-primary-20261026/files-before.json), [before financial reads](../../output/u1-1-payroll-primary-20261026/readiness-before.json).

Before modifying primary source, a fresh encrypted checkpoint of **149 tables / 13,692,144 bytes** passed a newly owned isolated restoration. Verification covered values/counts, definitions, indexes, foreign keys/checks, triggers, executable views and rejection probes. The temporary restore schema/account was removed. Primary remained running while the existing backup tool used source read locks. Nothing was restored over primary. Existing **64 MiB SQL / 96 MiB archive / 100,000 rows per table** limits remain; archive and key contents remain restricted. [Recovery proof](../../output/u1-1-payroll-primary-20261026/recovery.json).

Temporary staging at `C:/xampp/htdocs/ldss_u11_primary_stage_20261026` held the tested three-file presentation package. A task browser replayed its compiled static client against the actual GET-only primary API reads; no API data was substituted and no additional application database/server was provisioned. Normal checks, seven disposable integration groups and staged interaction checks passed before installation. Source and business inventories were rechecked immediately before atomic activation. Existing Vite served the changes; **no primary or retained process restart was needed**. [Activation inventory](../../output/u1-1-payroll-primary-20261026/activation-inventory.json), [installed hashes](../../output/u1-1-payroll-primary-20261026/promoted-files.json).

## Final layout and exact changes

The opened frozen batch now follows this order:

1. Compact Back to batches and Refresh, batch identifier/name, actual status and recorded scholar count.
2. Original **Open official payroll** and **Download Word** actions.
3. **Payments & Treasury → Changes & deferrals → History & sources** navigation.
4. The selected group's existing controls and evidence.
5. **Saved payroll roster**, total count, search, 25-row table and Previous/Next.

Submission/finalization provenance moves into History & sources. The redundant “Selected payroll” heading, separator spacing and oversized search layout are removed. The passed-target warning remains above the batch. Draft/review actions, submission-window restrictions, financial blockers and source-validation messages remain accessible through their existing components. Only the selected secondary group is visible; loaded command/recovery components stay mounted and expensive evidence still loads on demand.

| File | Final change |
|---|---|
| [src/OvrDrafts.tsx](../../src/OvrDrafts.tsx) | Reorder existing sections, move provenance into History & sources, remove two redundant header links, compact headings, show roster total and restore Back focus to the corresponding Open Payroll button |
| [src/PayrollPagedDetails.tsx](../../src/PayrollPagedDetails.tsx) | Roster-only Lucide Search icon, placeholder, tooltip and accessible name; existing search handler/effect and other page modes retained |
| [src/styles.css](../../src/styles.css) | Append opened-Payroll-only spacing, compact roster rows and aligned 44-pixel search rules after the exact U1 CSS prefix |

**Three existing files changed; no new application file.** No Dashboard, Registry, sidebar, global notifications, Payment Recording, reconciliation/correction component, document template, backend writer, endpoint, dependency, font, permission or configuration changed. Original CRLF endings are retained in the two edited TSX files. The source archive/patch round trip reproduces the final hashes. [Three-file inventory](../../output/u1-1-payroll-primary-20261026/candidate-files.json), [source boundary](../../output/u1-1-payroll-primary-20261026/source-preservation.json), [build/handler verification](../../output/u1-1-payroll-primary-20261026/build-verification.json).

## Payment access and official documents

Before removing the shortcuts, their actual destinations and handlers were inspected. **Record payments** opened `view=recording`; **Review payments** opened the existing reconciliation reader. Both remain reachable through the unchanged top-level **Payment Recording** workspace. Its existing navigation preserves the selected cycle and batch. **Verify Returned Payroll** opens reconciliation for that same batch; the established recording/review permissions remain enforced.

Staff and Coordinator each verified this path for **PAY-001 and PAY-002**, then returned through Payroll Batches and compact Back to batches. Back restores focus to the appropriate batch's Open button. The separate actions inside the actual recording/reconciliation workflows remain; no batch-specific financial capability was deleted. Original official-document link targets, handlers and availability rules are unchanged.

Both roles fetched the actual official HTML and Word outputs for both payrolls before/after. All four HTML comparisons are **byte-identical**. Word document XML and media are exact; differences are limited to normal generation timestamps and drawing IDs in package metadata/header XML. Whole DOCX binary equality is not claimed. The original document titles remain **Payroll - Batch 1 / Batch 2**; documents were not relabelled. [Output comparisons](../../output/u1-1-payroll-primary-20261026/document-preservation.json).

Official document GETs use the existing `payroll.export` audit behavior. Verification generated **17 export audit entries**—nine HTML and eight Word, including an initial successful HTML fetch whose title assertion was corrected. All identify the task actors, reviewed frozen batches, approved source hashes and **`paymentReleased:false`**. These ordinary export audits are recorded separately from authentication; no audit was suppressed or deleted. [Export audit proof](../../output/u1-1-payroll-primary-20261026/export-audit-proof.json).

## Search, state and accessibility

The saved-roster search keeps its visible **Find scholar** label and adds **Search scholar name or ID**. A Lucide magnifying glass has both tooltip and accessible name **Search payroll scholars**; its decorative SVG is hidden from the accessibility tree. Input and button align at **44×44-pixel height**, with an 8-pixel gap. The input takes the remaining width; the button cannot stretch vertically.

The existing submit handler still trims the submitted query, resets pagination and preserves the selected batch. Typing sends no request. Enter and icon-click use the same bounded server-side reader. The reader continues to return **25 saved rows** with original names, permanent IDs, frozen membership and frozen assessment labels. No current academic/eligibility projection is substituted and no all-person fetch was introduced.

For both roles and both payrolls, acceptance covered name search, exact permanent ID, empty query, no match, searched pagination, Previous/Next, unchanged batch context and all three groups. PAY-001 pages show **1–25 / 26–50 of 800**; PAY-002 **1–25 / 26–50 of 200**. Loaded evidence remains mounted across group changes. A real correction draft retained its reference and reason across groups and was cancelled without submission.

A browser-only delayed roster request verified loading/disabled search. A network-aborted read displayed an error and **Retry page** restored actual rows. No API payload was simulated. Existing source/permission restrictions, payment-date correction and confirmation implementations remain unchanged. [Staff controls](../../output/u1-1-payroll-primary-20261026/controls-after-staff.json), [Coordinator controls](../../output/u1-1-payroll-primary-20261026/controls-after-coordinator.json), [loading/error/retry and draft retention](../../output/u1-1-payroll-primary-20261026/states-primary.json).

Both roles passed **1440/1024/820/375/320 CSS pixels**, height 900, on the batch list and opened PAY-001/PAY-002. Search dimensions are measured together in one rendered frame. Buttons have accessible names, keyboard traversal reaches search/section/table controls, and search retains a **3-pixel focus outline**. No page-level horizontal overflow occurs; saved tables scroll locally. Manrope/DM Sans and the approved colors remain.

Focused **native 200% Chrome** passed on both payrolls under Coordinator, with viewport emulation disabled: **712×424 CSS pixels / DPR 2**. Section order, search alignment/focus and table keyboard access passed without page overflow. Direct rendered-view captures were not resized. Zoom was restored to 100%, task windows closed and both task sessions signed out; the user's separate profile/session was untouched. [Native proof](../../output/u1-1-payroll-primary-20261026/native-zoom-review.json), [200% batch heading](../../output/playwright/u1-1-primary/native-200-pay-001-top.png), [200% search focus](../../output/playwright/u1-1-primary/native-200-pay-001-search.png). The ui-ux-pro-max and Playwright workflows were used; full AT/WCAG certification is not claimed.

## Matched screenshots and scroll distance

Before/after captures use the same primary records, role, selected period/batch, default zoom, settled 25-row roster, height 900 and closed secondary disclosures. Account footer names are masked. Primary was not reverted for images.

| Width | Staff PAY-001: before / after | Coordinator PAY-002: before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/u1-1-primary/staff-before-pay001-1440.png) / [After](../../output/playwright/u1-1-primary/staff-after-pay001-1440.png) | [Before](../../output/playwright/u1-1-primary/coordinator-before-pay002-1440.png) / [After](../../output/playwright/u1-1-primary/coordinator-after-pay002-1440.png) |
| 1024 | [Before](../../output/playwright/u1-1-primary/staff-before-pay001-1024.png) / [After](../../output/playwright/u1-1-primary/staff-after-pay001-1024.png) | [Before](../../output/playwright/u1-1-primary/coordinator-before-pay002-1024.png) / [After](../../output/playwright/u1-1-primary/coordinator-after-pay002-1024.png) |
| 820 | [Before](../../output/playwright/u1-1-primary/staff-before-pay001-820.png) / [After](../../output/playwright/u1-1-primary/staff-after-pay001-820.png) | [Before](../../output/playwright/u1-1-primary/coordinator-before-pay002-820.png) / [After](../../output/playwright/u1-1-primary/coordinator-after-pay002-820.png) |
| 375 | [Before](../../output/playwright/u1-1-primary/staff-before-pay001-375.png) / [After](../../output/playwright/u1-1-primary/staff-after-pay001-375.png) | [Before](../../output/playwright/u1-1-primary/coordinator-before-pay002-375.png) / [After](../../output/playwright/u1-1-primary/coordinator-after-pay002-375.png) |
| 320 | [Before](../../output/playwright/u1-1-primary/staff-before-pay001-320.png) / [After](../../output/playwright/u1-1-primary/staff-after-pay001-320.png) | [Before](../../output/playwright/u1-1-primary/coordinator-before-pay002-320.png) / [After](../../output/playwright/u1-1-primary/coordinator-after-pay002-320.png) |

Batch list: [Staff before](../../output/playwright/u1-1-primary/staff-before-list-1440.png) / [after](../../output/playwright/u1-1-primary/staff-after-list-1440.png), [Coordinator before](../../output/playwright/u1-1-primary/coordinator-before-list-1440.png) / [after](../../output/playwright/u1-1-primary/coordinator-after-list-1440.png). Both payrolls and roles have complete five-width captures in the evidence folder.

At 1440, secondary navigation moves **2,005.9→487.6 px**, about **1,518 px earlier**. The roster moves **655.8→795.6 px**, intentionally below the four closed evidence disclosures. Staff no longer crosses 25 rows to reach those sections. The former search input/button heights **44.2 / 67.4 px** become **44 / 44 px**. Full page heights, shared by these matched roles/batches, change:

| Width | Before → after, CSS pixels |
|---|---:|
| 1440 | 2,519 → 2,233 |
| 1024 | 2,571 → 2,285 |
| 820 | 3,175 → 2,889 |
| 375 | 3,397 → 3,119 |
| 320 | 3,664 → 3,317 |

These are closed-default measurements; opening financial evidence legitimately adds content. Information was reorganized, not deleted. [Layout and performance evidence](../../output/u1-1-payroll-primary-20261026/performance.json).

## Performance, build and tests

Matched actual-primary Vite samples use the same role/data/period, **1440×900**, cache disabled, one warm-up and three sequential measured navigations per batch. A DOM MutationObserver timestamps populated batch heading/status and the populated 25-row roster; API byte collection follows network idle. “Roster ready” means rendered and available to scroll into view, not an assertion that it is above the mobile fold. No builds/regressions ran during samples.

| Role / batch | First useful content, before → after ms | Roster ready, before → after ms |
|---|---|---|
| Staff PAY-001 | 438 / 435 / 441 → **418 / 385 / 378** | 517 / 505 / 513 → **506 / 466 / 452** |
| Staff PAY-002 | 400 / 422 / 406 → **374 / 349 / 371** | 445 / 480 / 451 → **413 / 391 / 410** |
| Coordinator PAY-001 | 479 / 422 / 418 → **370 / 401 / 368** | 563 / 521 / 515 → **471 / 496 / 455** |
| Coordinator PAY-002 | 463 / 420 / 422 → **384 / 430 / 376** | 506 / 486 / 463 → **428 / 498 / 434** |

API requests remain **10 Staff / 11 Coordinator**. Body totals are exact before/after: PAY-001 **109,478 / 116,861 bytes**, PAY-002 **108,436 / 115,819 bytes**. No `/sections/` evidence read occurs on measured default entry; existing explicit task links can still open their requested section. Backend queries/readers are byte-identical; there is no new initial SQL or endpoint. These small local observations show no material loading regression and are not a guaranteed speedup, cold-start, concurrency or LAN-capacity result.

Client assets change **1,482,811→1,484,337 bytes**, **+1,526**. JavaScript changes **1,043,670→1,043,705**, CSS **332,980→334,471**, observed CSS gzip **50,226→50,485**. Fonts/dependencies are unchanged. All **276 compiled server JS files** match the accepted U1 archive; all **310 starting shared distribution files** remain untouched. [Bundle comparison](../../output/u1-1-payroll-primary-20261026/bundle-impact.json), [build verification](../../output/u1-1-payroll-primary-20261026/build-verification.json).

| Final check | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | All exit **0**, complete normal build on matching staged source |
| `npm test` | **124 files / 791 tests passed** |
| Historical/omitted batches, Registry/Payroll/Treasury parity, Payment Recording, reconciliation, individual settlement, financial reports, Masterlist workflow | **All seven fresh disposable integration groups exit 0** |
| Primary browser, document/source, recovery and preservation checks | Passed |

Financial suites retain R01–R07, frozen-source validation, retry/atomicity and complete API/XLSX/PDF output checks. Mutations used newly owned disposable schemas. The final Back-focus and line-ending qualifications then repeated the complete normal checks; backend/financial logic stayed exact. No validation, authorization, source pin or output bound was weakened. [Normal commands](../../output/u1-1-payroll-primary-20261026/checks-main.json), [unit log](../../output/u1-1-payroll-primary-20261026/test-final.log), [seven commands/exits](../../output/u1-1-payroll-primary-20261026/regressions-final.json).

## Primary preservation, issues and stop

Fresh comparison preserves every business table/value/count, schema object, migration row, account/password hash/role, grant and original audit row. This includes identities/permanent IDs, annual classification, academic/standing history, supplied text/import sources and bindings, Masterlists, frozen payroll sources, entitlements/allocations, every payment/date and individual/closure evidence.

| Primary fact | Before → final |
|---|---|
| Scholars / accounts | **1,000 / 14**, unchanged |
| Intake roots / academic records | **1,000 / 1,000**, unchanged |
| Entitlements / allocations | **1,000 / 1,000**, unchanged |
| Every payment | **2 Paid → 2 Paid**, complete original evidence exact; both dates **2026-10-24** |
| PAY-001 / PAY-002 | **2 Paid / 798 Pending** and **200 Pending**, both recordable |
| Bindings / supplied-text events | **0 / 0**, unchanged |

Full before/after payment previews accept **798 / 200**, zero conflicts; neither was committed. All **10,441 starting audit rows** remain exact. Two task logins/two logouts and **17 existing official-export audits** bring the total to **10,462**; sessions **48→50**, with normal last-seen/revocation/rate-limit activity. No payment, correction, reconciliation, closure, Masterlist or source-changing command was submitted. Export audit behavior is explicitly qualified rather than claiming zero database writes. [Preservation](../../output/u1-1-payroll-primary-20261026/preservation.json), [financial reads](../../output/u1-1-payroll-primary-20261026/readiness-after.json).

**1,317 of 1,320 protected inputs remain exact**, with no missing file. Only the three declared existing presentation files differ; the report and task evidence are additions. Primary/retained listener owners and the unchanged launcher remain. Both task accounts signed out with **204**, then `auth/me` returned **401**; all task windows closed. [Staff revocation](../../output/u1-1-payroll-primary-20261026/signout-staff.json), [Coordinator revocation](../../output/u1-1-payroll-primary-20261026/signout-coordinator.json), [delivery verification](../../output/u1-1-payroll-primary-20261026/delivery.json).

Staged automation initially sampled asynchronous name-search/layout changes too early and reused an older static client after a hash-only navigation. Final checks use settled data, atomic geometry and full document navigation. Back-focus restoration was corrected before final acceptance. Word comparison accounts only for existing generation metadata; an initially auth-only audit comparison was corrected to verify the exact source-backed export events too. A task-only helper encoding issue stopped before database access. No financial component or safeguard was changed to satisfy a check.

Remaining limits: the review data has two processed batches, no closed batch and no genuine unavailable frozen source. Closed/historical/failed-source rules remain covered by existing disposable integrations; actual network-error UI was checked without invented payloads. Narrow tables require local scrolling, expanded evidence adds ordinary vertical scrolling, and existing correction-component focus behavior outside the compact Back action remains unchanged. The Vite chunk warning, full AT/WCAG, cold-start/max-load and office/LAN acceptance remain unverified.

Review/recovery artifacts: [three-file hashes](../../output/u1-1-payroll-primary-20261026/candidate-files.json), [patch](../../output/u1-1-payroll-primary-20261026/U1_1_PRIMARY.patch), [source archive](../../output/u1-1-payroll-primary-20261026/candidate-source.zip), [compatible build](../../output/u1-1-payroll-primary-20261026/compatible-build.zip). Archives exclude credentials, keys, `.env`, fixtures and server PDF/template assets. Saved **66-compatible U1 source** is under `output/u1-1-payroll-primary-20261026/baseline/`; the [accepted U1 build](../../output/u1-workflows-primary-20261026/compatible-build.zip) remains available. Rollback was not needed. Any presentation rollback must preserve later legitimate edits; no database restore, downgrade or history deletion is appropriate. Startup remains `node scripts/localhost-5173-profile.mjs synthetic`.

**Stopped after U1.1 implementation, verification and reporting.** No permanent candidate, financial-policy change, annual rollover, unrelated UI change, retained-environment restart or LAN/production operation occurred.
