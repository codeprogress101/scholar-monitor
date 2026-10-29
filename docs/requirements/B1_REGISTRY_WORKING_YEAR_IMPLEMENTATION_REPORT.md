# B1 — Registry working-year default

25 October 2026, Philippine time. **Implemented and verified in an isolated candidate only. Primary 5173 is unchanged; promotion is not authorized or performed.** Review the candidate at [http://127.0.0.1:3018](http://127.0.0.1:3018/#scholars).

Candidate source: `C:/xampp/htdocs/ldss_b1_candidate_20261025`. Owned copy: **`ldss_registry_test_21260_cf36b8f6`**, runtime **`ldss_rg_21260_cf36b8f6@localhost`**. It retains the same **65 migrations**. **No migration, change to existing grants/business permissions, financial-policy change or A4/B2 implementation was needed.** The new copy's technical accounts use the existing own-schema provisioning policy. Scope follows the authorized B1 request and [B1 backlog](LDSS_INTEGRATED_ENHANCEMENT_BACKLOG.md#b1--registry-working-year-default--p2-confirmed-gap-with-source-dependency).

## Exact membership definition

For a selected academic year, a person is associated when **at least one existing record** establishes that year:

- A `scholar_intakes` root for that person/year, including a manual intake with unknown school/course/year level or an import-owned root.
- An `academic_records` row for that person/year.
- A `scholarship_records` annual row for that person/year, at its actual recorded admission stage.
- A `scholar_semesters` row whose semester belongs to that year.

The predicate uses indexed **EXISTS**, so overlapping evidence produces one identity, one count and one roster row. Approved imports are covered by their recorded intake/academic/annual ownership, including A2.1 manual-root bindings. Official Masterlist membership already has its annual scholarship owner; it does not require a separate duplicating join. A staged workbook, name match, global participation identity, first-entry year, permanent-ID year or New/Continuing class **alone does not establish annual membership**.

Association is discovery evidence, **not approval, enrollment, document verification, publication or payment readiness**. The existing Current / Graduated-Archived / All status filter remains a separate filter. No class, standing, academic record, annual record or participation is created by a read.

The older `associatedYearId` API deliberately includes initial registration year. Its accepted compatibility contract remains unchanged. B1 uses a separate strict **`registryYearId`** selector, rejecting mixtures with the old year selectors or a different context year. Existing selected-year source-first classification and placement projections remain; supplied annual facts take priority, with legacy-derived/unknown labels retaining their existing meaning.

**Conservative ambiguity handling:** a legacy identity with only a registration year remains discoverable in **All Years**, without being assigned to the working year. A manual annual intake with an explicit year is included even when its academic details are incomplete. A person recorded digitally this year but with only an earlier-year academic record belongs to that earlier-year view, not automatically to the current cohort. No missing association is backfilled.

## Files and behavior

Exactly **five existing and four new code/test files**, all in the external candidate:

| Candidate file | Change |
|---|---|
| `server/scholars/service.ts` | B1 annual membership and school/course predicates shared by COUNT and page; legacy selectors retained |
| `server/scholars/validation.ts` | Strict `registryYearId`, school/course UUIDs and incompatible-context rejection |
| `server/scholars/registry-placement.ts` | Expose the existing placement-ID expressions for matching filters; existing returned values unchanged |
| `server/scholars/registry-year.ts` — new | Annual evidence predicate, without first-entry-year fallback |
| `src/ScholarsPage.tsx` | Resolve metadata before the initial list; explicit current/history modes; compact filters; selected-year profile/receiving context; local keyboard focus scrolling |
| `src/registry-view.ts` — new | Safe saved-preference parsing and explicit working/historical resolution |
| `src/styles.css` | Scoped year/filter reflow and visible table focus; no global redesign |
| `tests/registry-working-year.test.ts` — new | Missing/ambiguous/stale metadata, preference migration, working-year changes and strict query contracts |
| `scripts/test-registry-working-year-db.ts` — new | Read-only acceptance against the expressly owned B1 copy; primary targets rejected |

The Registry now opens with **Current academic year**, name/ID search, **Scholar status**, **More filters** and explicit **All Years / Historical** access. Classification, sorting, school and course remain available under More filters, with an active indicator. Inspection found school/course sorting/projection but no existing dedicated school/course selectors on this screen; the new selectors use the same selected-year placement IDs.

Historical mode offers **All Years** or a specific year. All Years lists identities; its unfiltered placement/classification uses the existing working-year context. The screen explains that selecting a year shows that year's annual facts. Explicit All/Historical preferences survive reload; older nonempty saved years remain historical. An unversioned empty-year preference cannot distinguish a deliberate All choice from the former fresh default, so it initializes to working year; All Years remains one explicit action away.

There is **one correctly scoped initial list request**, with no all-year flash. Missing/ambiguous/failed working metadata blocks the default list and offers Refresh or explicit historical access. Refresh/re-entry obtains fresh metadata. A changed working year resets a stale page to the first page. It does not advance the calendar or roll anyone over.

Pagination, search, exports, source/classification history, profile sections, receiving context, Add Scholar, Import Excel, document verification and prior-review actions retain their existing permissions and command handlers. The table/columns and financial recovery formats were not redesigned. The only added table handler scrolls a keyboard-focused item locally into view, following the existing Payment Recording/Graduation pattern.

## Owned scenario and browser acceptance

The starting source was the actual dirty **A2.1 AP1 primary baseline**, with accepted package hashes verified, 65 checksum matches and a preservation checkpoint for **1,258 existing files**. A fresh encrypted source backup passed isolated restore/constraint verification before the new copy was created. Copied authentication sessions, reset tokens and rate-limit rows were excluded. Credentials/keys remain restricted and are absent from review archives. [Preflight](../../output/b1-registry-20261025/preflight.json), [backup](../../output/b1-registry-20261025/backup.json).

Six fictional examples were declared before commands: nullable manual New and Continuing; an identity without annual facts; current academic-only and earlier-year academic-only identities; and a normal approved Excel import using Old → Continuing compatibility. Creation/import used existing guarded APIs on the copy. The earlier-year academic example retains its current permanent ID and real recording time; no receiving/approval date or grade was fabricated.

| View on the same 1,006-person copy | Result |
|---|---:|
| Earlier fresh Registry default, unfiltered | **1,006** |
| B1 working-year association | **1,004** |
| Explicit All Years | **1,006** |
| Selected earlier academic year | **1**, the actual earlier-year academic record |
| New / Continuing manual intakes with NULL placement | Both visible in their supplied year |
| First-entry-only identity | All Years only; no invented annual participation |

Staff and Coordinator passed combined search/classification, name/ID discovery, pagination, nullable-profile facts, explicit profile year, Back/reload and historical access. Browser Back/Forward also retained profile context. Backend checks denied pure Administrator/unassigned readers. Working-year metadata switching was tested with a **browser-only response simulation** against the two existing copy years: the request used the new year and offset zero. Missing metadata issued **zero** list requests; explicit All Years recovered. A simulated 503 read failure recovered through Refresh. These simulations did not change database calendar settings. The existing configuration DB driver separately passed its actual guarded calendar-transition/closure tests in a disposable schema; B1 introduces no rollover path.

Both roles were checked at **1440, 1024, 820, 375 and 320 CSS pixels**. Native keyboard search/disclosure/table navigation passed, with no page-level overflow. A 320-pixel focus check initially found a clipped focused name; the local focus-scroll correction passed all widths, with a **3-pixel** outline and local scroll at 375/320. Long tables intentionally scroll horizontally. Native 200% zoom and full assistive-technology/WCAG certification are not claimed.

Matched Coordinator captures use the same account, six-example copy, empty search, first 25 rows, default status and closed secondary filters. The before client is the verified AP1 build; the after client is the candidate build. Initial captures used the baseline server mode; final settled captures also replayed the exact baseline static client through browser interception while using the same real legacy API contract. Eligibility cells were allowed to settle before final captures. No primary browser was used.

| Width | Before | After |
|---|---|---|
| 1440 | [Before](../../output/playwright/b1/before-1440.png) | [After](../../output/playwright/b1/after-1440.png) |
| 1024 | [Before](../../output/playwright/b1/before-1024.png) | [After](../../output/playwright/b1/after-1024.png) |
| 820 | [Before](../../output/playwright/b1/before-820.png) | [After](../../output/playwright/b1/after-820.png) |
| 375 | [Before](../../output/playwright/b1/before-375.png) | [After](../../output/playwright/b1/after-375.png) |
| 320 | [Before](../../output/playwright/b1/before-320.png) | [After](../../output/playwright/b1/after-320.png) |

Additional evidence: [Staff keyboard at 320](../../output/playwright/b1/staff-320.png), [historical year](../../output/playwright/b1/historical-year.png), [missing working year](../../output/playwright/b1/missing-working-year.png), [initial request/width results](../../output/b1-registry-20261025/browser-final-settled.log), [Staff interactions](../../output/b1-registry-20261025/staff-interactions.log), [Coordinator interactions](../../output/b1-registry-20261025/coordinator-interactions-final.log), [metadata/error recovery](../../output/b1-registry-20261025/metadata-recovery.log), [Back/Forward](../../output/b1-registry-20261025/history-navigation.log).

## Queries and measurements

COUNT and page use the same predicate, existing stable ordering and unchanged 25/50/100 UI page sizes, with API maximum 100. EXPLAIN shows indexed lookups for intake, academic, annual scholarship and semester association. There are no new per-person profile/history/eligibility calls. Existing R01–R07 readers, authoritative financial writes and complete-output checks remain unchanged.

Three sequential direct-service samples used the **same 752-person Continuing cohort**, role, year, ordering, projection and database state. This excludes the deliberately different legacy-association edge cases, allowing exact before/after output parity and full requested pages. Every sample used **nine SELECTs**, including fresh authorization. Returned JSON matched exactly, including totals and all row fields.

| Page | Before milliseconds | After milliseconds | Response bytes, both |
|---|---|---|---:|
| 25 | 91 / 45 / 41 | 57 / 50 / 50 | 36,379 |
| 50 | 42 / 42 / 41 | 47 / 47 / 51 | 72,792 |
| 100 | 41 / 43 / 48 | 55 / 51 / 87 | 145,754 |

The additional association checks have some local elapsed-time cost; this is **not a speedup claim**. Existing indexes support the new bounded SQL, with no extra SQL round trip per scholar and no migration justified by these observations. Measurements include SQL time/rows/decoded bytes and query plans in [structured evidence](../../output/b1-registry-20261025/performance.json). They are not HTTP/browser, concurrency or LAN-capacity measurements. Exploratory name searches matched fewer than 100 rows; the final Continuing samples above replaced those as the full-page comparison.

Reference metadata is separate: paged year/barangay choices are retained, with school/course choices added for the new filters, 100 rows per request. The existing receiving/eligibility UI still assesses only the displayed page. No cross-request authorization cache, larger data limit, approximate count, output truncation or financial-source shortcut was introduced.

## Validation and preservation

| Check on the candidate | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run check:secrets` | **All exit 0; 113 files / 710 tests passed**. Normal complete build; no suppressed rule or weakened type setting |
| New Registry DB driver | **Passed:** actual membership, legacy exclusion, historical context, NULL manual facts, class/filter/count/page/search parity, Staff/Coordinator and denied roles; exact zero data/schema changes from its reads |
| `npm run test:import-intake-bindings-db` | **Exit 0; 13 import groups plus A2.1 assertions**, including annual registration/reuse/source history, stale/identity guards, six rollback points, retry/concurrency and prior-review/publication/historical integration |
| Registry parity, Payment Recording, reconciliation and financial-report drivers | **All four exit 0**, including existing R01/R07 output parity, financial retry/atomicity, Original/current evidence and complete API/XLSX/PDF checks |
| `npm run test:configuration-db` | **Exit 0; 15 isolated scenarios**, including actual controlled working-year changes, closure guards, concurrency/retry/audit rollback and preserved destination records |
| Copied payroll source previews | **Passed**, PAY-001 2 Paid/798 Pending and PAY-002 200 Pending, both recordable, zero fresh-source conflicts |

[Normal command exits](../../output/b1-registry-20261025/evidence/checks-main.json), [new DB results](../../output/b1-registry-20261025/registry-db.json), [import/annual integration](../../output/b1-registry-20261025/evidence/import-annual.log), [four DB suite exits](../../output/b1-registry-20261025/evidence/regressions-b-one/results.json), [calendar regression](../../output/b1-registry-20261025/evidence/configuration-db.log).

The copy-specific read driver was run from the candidate with `node --import tsx scripts/test-registry-working-year-db.ts C:/xampp/htdocs/scholar_monitor/output/b1-registry-20261025`. The standalone historical annual-upgrade helper was not run against any retained fixture; current annual registration/reuse/source acceptance is covered by the binding driver above.

All **1,258 protected main-workspace files** match their starting hashes. Primary business data, definitions, all 65 migration checksums, accounts/password hashes/roles, runtime grants and existing audit rows match. Primary remains **1,000 scholars, 14 accounts, 1,000 entitlements/allocations and exactly two Paid records with their original dates**. Its controller/API/Vite PIDs remain **43348 / 29804 / 36944**. The only full-inventory difference is the existing **`auth_sessions`** table checksum, with **18 rows before and after** and **zero appended audit events**. This task performed no primary login or business command; session activity is explicitly qualified rather than claimed as zero database change.

The copy retains every original protected row and original audit row. Only its ID sequence advanced by six for the declared test people; their registration/academic/import/authentication evidence is additive. Existing Masterlists, frozen payroll/source bytes, entitlements, allocations, payment records/dates and annual classifications remain exact. No payment or entitlement arose from the six examples. [Preservation and copy row comparisons](../../output/b1-registry-20261025/preservation.json).

Helper development initially expected HTTP 201 from the legacy identity route, which correctly returns 200; the already-created owned example was read back before the remaining seed resumed. A new test-helper nullability diagnostic was fixed. Browser assertions were corrected for duplicate zero-count labels and asynchronous focus/loading. No business guard was relaxed. UI/UX and Playwright skills were used; the local search did not provide a relevant filter-disclosure guideline, so More filters follows the existing native disclosure pattern and direct keyboard checks.

## Review package, limits and primary promotion plan

[Candidate file hashes](../../output/b1-registry-20261025/candidate-files.json), [promotion patch](../../output/b1-registry-20261025/B1_CANDIDATE.patch), [source archive](../../output/b1-registry-20261025/candidate-source.zip), [compatible build](../../output/b1-registry-20261025/compatible-build.zip). Archives exclude credentials, keys and `.env`. `git apply --check` passed against the actual dirty main baseline; **the patch was not applied**. The owned candidate remains available at 3018 and can be restarted from its directory using `node --import tsx output/b1-registry-20261025/serve.ts`; that launcher performs no migration or reset.

Remaining limits: metadata changes appear on Refresh/re-entry, not automatic polling. Ambiguous legacy identities require their real annual source through an existing authorized workflow. All Years uses working-year placement/classification unless a year is selected. The existing table still uses its name disclosure/truncation and horizontal scrolling; B2 remains separate. The existing Vite chunk-size warning remains. These synthetic results are not office or LAN acceptance.

**Proposed separately authorized primary operation:**

1. Recheck exact primary runtime, listeners, 65 checksums and current dirty source against the reviewed nine-file package. Review later edits; preserve all legitimate new payments and dates rather than resetting to this report's two-record checkpoint.
2. Capture fresh business/account/grant/frozen-source and file inventories, with a current recovery checkpoint appropriate to the maintenance. Do not copy the six candidate examples or candidate credentials into primary.
3. Promote only the reviewed source/build during coordinated frontend/API maintenance. No SQL, runtime grant, permission, flag or environment change is needed. Restart only the verified primary profile; do not briefly pair the new UI query with an old API that rejects it.
4. Verify working/history/manual/import discovery and both roles read-only on primary, plus current financial source/record preservation. Keep new mutation tests in owned copies. Preserve retained fixture launchers and static artifacts.
5. Rollback is a coordinated return to the saved **65-compatible A2.1** source/UI, retaining saved history access. It requires no data rollback, schema downgrade, association backfill, record deletion or stale database restore.

**Stopped after isolated B1 implementation, verification and this report.** No primary promotion, migration, retained-UAT reset/restart, LAN/production operation, new financial activation, A4/B2/Dashboard redesign or unrelated enhancement was performed.
