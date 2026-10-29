# A6.1 — Read-only Graduation Monitoring

24 October 2026, Philippine time. **Implemented and verified on the existing synthetic primary at [localhost:5173](http://127.0.0.1:5173/#scholars?task=graduation). Stopped after A6.1.** The Registry now includes Graduation Monitoring, with bounded reads, search, filters, pagination and year-scoped profile links. No schema, permission, account, feature flag, academic, standing or financial rule changed. A6.2 is not implemented.

## Screen, routing and scope

Registry navigation is **All Scholars | Continuing Roster | Graduation Monitoring**, using the existing workspace, dark-green controls and hash navigation. There is no new sidebar module or Dashboard count. Existing `#continuing`, roster, Registry, profile and receiving routes remain.

The supported route is **`#scholars?task=graduation`**. Committed academic-year, semester, search, category, school/course, sorting and page parameters stay in the URL. Browser reload and Back/Forward restore the selected page/context. Search and filters apply together; editing a form does not launch a request for every keystroke. Refresh reloads current authorized sources.

The default is the configured working academic year and **Final-Year Review Candidates (Years IV / V)**. This is a review filter, not an automatic graduation finding. Other filters include All associated scholars, the five requested indicator categories, school and course. Page sizes are 25/50/100; names and permanent IDs remain readable. Profiles open through the existing `scholarAddress` helper with the explicit selected year. Authorized Staff/Coordinator standing links open the existing Scholarship section; they do not approve anything.

Semester selection validates the semester/year relationship and displays review context. Placement is the current approved **annual** placement; the screen explicitly says it does not reconstruct a past semester snapshot. Historical-year selection reads that year's annual sources rather than the working year's placement.

## Files changed

| File | Work |
|---|---|
| [server/app.ts](../../server/app.ts) | Wire the two authorized read endpoints |
| [graduation-monitoring-model.ts](../../server/scholars/graduation-monitoring-model.ts) — new | Read contracts, labels, conservative year normalization and duration derivation |
| [graduation-monitoring.ts](../../server/scholars/graduation-monitoring.ts) — new | Strict bounded query validation, reference context, matching COUNT/page reads and formal graduation source projection |
| [graduation-monitoring-routes.ts](../../server/scholars/graduation-monitoring-routes.ts) — new | GET list/context routes requiring `scholars.read` |
| [ScholarWorkspace.tsx](../../src/ScholarWorkspace.tsx) | Third Registry destination and the requested navigation labels |
| [GraduationMonitoring.tsx](../../src/GraduationMonitoring.tsx) — new | Read-only filters/table, loading/error/empty/retry states, navigation and pagination |
| [styles.css](../../src/styles.css) | Scoped filter reflow, wrapping table content, intentional table scrolling and visible focus |
| [graduation-monitoring.test.tsx](../../tests/graduation-monitoring.test.tsx) — new | Evidence boundaries, strict validation and accessible, permission-aware table destinations |
| [test-graduation-monitoring-db.ts](../../scripts/test-graduation-monitoring-db.ts) — new | Runtime/API integration checks in an owned disposable schema |

Nine application/test/helper files comprise the implementation. This report and task evidence are additional deliverables. No migration, dependency, package command, global style system, financial service, existing fixture helper or prior report was edited. No lint suppression or weaker validation was introduced.

## Indicator sources and honest unknowns

| Indicator | A6.1 source and behavior |
|---|---|
| Potentially Graduating | Requires approved placement and an authoritative applicable program-duration reference. **No such live source exists in the current schema**, so current records cannot receive this derived indicator. The filter correctly returns zero |
| Expected to Graduate | No existing authoritative expected-completion source was found. No record is invented; filter remains empty |
| Graduation Delayed / Continue Monitoring | No existing supported monitoring-review ledger was found. Neither year level nor elapsed time creates a delayed finding; filter remains empty |
| Graduated | Approved formal graduation request/current standing revision, including the supported historical no-outstanding correction semantics from `status/graduation.ts`. The bounded projection respects the selected year's date boundary. A reversed incorrect graduation is not retained as current |
| Cannot Determine Automatically | Missing duration, pending/missing course, missing/provisional academic placement or unrecognized year level is explained in the row. Initial intake facts never become approved placement merely by appearing here |

The list reuses `registry-placement.ts` selected-year joins and latest approved academic-change precedence. Pending changes do not alter the displayed placement. Formal graduation is projected without loading payment/settlement history; the existing profile remains responsible for final-semester, correction and stipend details. Standing labels alone are not used as proof of a formal graduation decision.

No production duration can be inferred from a course name, a fictional fixture constant, fourth-year status or the presence of a fifth-year record. The live list therefore shows **Unknown — reference needed** for duration. Unit acceptance exercises explicitly supplied applicable official duration inputs: IV/4 → potential; IV/5 → not in final year; V/5 → potential; beyond duration, unknown level/duration or unapproved placement → cannot determine. These are isolated derivation tests, **not evidence that official duration records were added or that those live classifications are available**. Expected/Delayed source writing and applicability review remain A6.2 work.

## Primary UAT results

Before editing, the live listeners, launch profile and actual database were rechecked: frontend **127.0.0.1:5173**, API **127.0.0.1:3001**, database **`ldss_primary_test_12676_61497616`**, **63 migrations**. The starting baseline had **1,000 scholars, 14 accounts, two publications, two payrolls, 1,000 entitlements/allocations and zero payment records**. Role assignments were inventoried without exposing credentials. Existing dirty source/build inputs were recorded before the patch.

The same synthetic launch profile was restarted to load the new read endpoints; it was never switched to the original database. Recorded controller/API/Vite PIDs after restart are **37768 / 38280 / 21584**. `.env`, the restricted runtime account and all five established synthetic feature overrides remain unchanged. No retained 3011/3012 server was restarted.

| Checked fact | Observed result |
|---|---:|
| All associated scholars | 1,000 |
| Year I / II / III / IV / V | 250 / 250 / 250 / **200 / 50** |
| Final-Year Review Candidates | **250** |
| Known authoritative duration records | 0 |
| Course pending | **95**, including 20 fourth-year cases |
| Potential / Expected / Delayed / formal Graduated | 0 / 0 / 0 / 0 |
| Historical prior-year associated results | 0; an honest empty result |
| PAY-001 / PAY-002 | **800 / 200 Pending; both `canRecord:true`** |
| Payment records | **0** |

The fourth-year fictional Architecture example remains unknown despite “five-year” appearing in its name. Sorting year level descending makes the 50 fifth-year cases readily accessible; their fictional Engineering/Architecture names also do not establish official duration. Annual New/Continuing facts, Masterlists, prior approvals, source scopes and frozen payrolls remain unchanged. [Read and readiness evidence](../../output/a6-1-graduation-20261024/primary-read-checks.json).

## Browser, accessibility and role checks

The preserved original Coordinator session was reused on the primary. Staff, pure Administrator and unassigned checks used the existing synthetic fixture accounts, authenticated through the ordinary login endpoint with credentials retained only in a restricted local directory. Those three test sessions were signed out. No account, password or role was changed.

- Staff and Coordinator see the third Registry tab and current data. The monitor contains no save, approval or graduation command.
- Pure Administrator and unassigned viewers see the access explanation, no monitoring tab/table, and receive **403** from the API. Anonymous API access is **401**. Authorization is checked again after the read snapshot.
- Search by permanent ID returned one exact scholar. School filtering returned 50 review candidates for the selected fictional school; school/course server filtering also passed integration checks. Pagination, stable nonoverlapping pages, sort, reload, profile year context, Back and Forward passed. An out-of-range URL shows the real total and “No scholars on this page,” with a first-page recovery instruction, rather than an inverted range.
- Loading and empty states are explicit. A browser-only simulated **503 read failure** showed Retry monitoring; removing interception and retrying restored the real 250-record result. This was not a failed payment command or forged source record.
- Screens were checked at **1440, 1024, 820, 375 and 320 CSS pixels**, with semantic row/column headers, a named keyboard-focusable table region and full wrapped names. There was no page-level horizontal overflow at these widths; only the table scrolls horizontally.
- Native Tab traversal showed a **3-pixel** focus outline and visible focused links at all five widths. At 820/320, tabbing to the right-hand standing link scrolled the table horizontally and kept that action within the viewport. The first exploratory focus sample was taken before scrolling settled; corrected checks await actual visibility.
- Native zoom keyboard shortcuts did not change browser metrics in this automation session. **Exact 200% native zoom was not verified**; no CSS zoom substitute or WCAG certification is claimed.

| View | Screenshots |
|---|---|
| Coordinator | [1440](../../output/playwright/a6-1/coordinator-1440.png), [1024](../../output/playwright/a6-1/coordinator-1024.png), [820](../../output/playwright/a6-1/coordinator-820.png) |
| Small-width reflow | [375](../../output/playwright/a6-1/coordinator-375.png), [320](../../output/playwright/a6-1/coordinator-320.png) |
| Staff | [1440](../../output/playwright/a6-1/staff-1440.png), [1024](../../output/playwright/a6-1/staff-1024.png), [820](../../output/playwright/a6-1/staff-820.png) |
| Keyboard / restricted roles | [820 focused row](../../output/playwright/a6-1/coordinator-keyboard-820.png), [Administrator denied](../../output/playwright/a6-1/denied-system_admin.png), [unassigned denied](../../output/playwright/a6-1/denied-unassigned.png) |

Screenshots use synthetic scholar content and exclude the original account banner. Detailed evidence: [Coordinator](../../output/a6-1-graduation-20261024/browser-coordinator.log), [Staff](../../output/a6-1-graduation-20261024/browser-staff.log), [focus](../../output/a6-1-graduation-20261024/browser-focus.log), [horizontal keyboard scroll](../../output/a6-1-graduation-20261024/browser-scroll.log), [Administrator](../../output/a6-1-graduation-20261024/browser-admin.log), [unassigned](../../output/a6-1-graduation-20261024/browser-unassigned.log), [zoom limitation](../../output/a6-1-graduation-20261024/browser-zoom.log). The ui-ux-pro-max and Playwright skill workflows were used.

## Bounded read and performance observations

Endpoints are **`GET /api/v1/scholars/graduation-monitoring/context`** and **`GET /api/v1/scholars/graduation-monitoring`**. Query validation is strict: explicit valid year, matching optional semester, bounded text, whitelisted category/sort/direction and at most 100 rows. COUNT and page share the same predicate within an authorized read snapshot. Initial registration, intake, academic and annual associations do not duplicate identities. Stable ordering includes permanent person ID as a tie-breaker.

Context choices are bounded to 100 each, with a visible limitation notice if truncated. No full profiles, academic histories, eligibility calculations or financial-history queries are loaded per row. No cross-request authorization cache or financial write path was added.

Three sequential local samples per page size, including fresh authorization:

| Requested rows | SELECTs each | Elapsed milliseconds |
|---|---:|---|
| 25 | **9** | 36 / 30 / 31 |
| 50 | **9** | 30 / 29 / 29 |
| 100 | **9** | 30 / 71 / 37 |

These are read-service observations against this 1,000-person fixture, not HTTP/browser latency, a before/after speedup, concurrency or LAN capacity certification. Reference context uses five bounded data queries separately. R01–R07 and existing fresh financial source checks are unchanged. [Measurements](../../output/a6-1-graduation-20261024/primary-read-checks.json).

## Verification results

| Command | Final result |
|---|---|
| `npm run lint` | **Exit 0**, no errors/warnings |
| `npm run typecheck` | **Exit 0**, all configured projects |
| `npm run build` | **Exit 0**, complete normal build; existing Vite chunk-size warning remains |
| `npm test` | **Exit 0; 101 files, 654 tests passed**, including the new 15 monitoring tests and existing academic/Registry/graduation/financial tests |
| `npm run check:secrets` | **Exit 0**, 1,213 source/build files checked |
| `node --import tsx scripts/test-graduation-monitoring-db.ts` | **Exit 0; 37 successful API setup/read calls plus assertions**: real guarded graduation/approval/correction, pending versus approved placement changes, unknown/name-only duration, absent placement, bounded pages, literal search, school/course, historical context, roles, strict query rejection and zero unintended business/audit changes |
| `npm run test:status-db` | **Exit 0; 11 scenario groups** |
| `npm run test:academic-changes-db` | **Exit 0; 8 scenario groups** |
| `npm run test:registry-db` | **Exit 0; 12 eligibility groups plus R02/R07 complete-output/parity checks** |

[TypeScript/regression exits](../../output/a6-1-graduation-20261024/checks-lint-typecheck-test-status-db-test-academic-changes-db-test-registry-db.json), [final lint/build/unit exits](../../output/a6-1-graduation-20261024/checks-lint-build-test.json), [unit log](../../output/a6-1-graduation-20261024/test.log), [new DB assertions](../../output/a6-1-graduation-20261024/db-tests.json), [secrets](../../output/a6-1-graduation-20261024/checks-check-secrets.json). The final normal build includes all TypeScript checks. The new driver creates a PID-owned disposable schema/runtime account and removes only those exact identities in `finally`; [cleanup](../../output/a6-1-graduation-20261024/disposable-cleanup.json). Mutation tests never used the retained primary.

Initial development checks caught an unused import, an effect-state lint issue and test-helper type annotations; these were corrected without suppressions. Early fixture attempts correctly hit duplicate review and strict graduation-field placement validation. The read-only test comparison was qualified for ordinary session last-seen updates while keeping business tables and audit exact. Windows command/path quoting and log-filename issues in task-only tooling were corrected before the successful recorded reruns. No safeguard was weakened to make tests pass.

## Data, build and financial preservation

Starting and final inventories cover **18 retained schemas**, including the primary, original 212-person development database, A–F, V1/V2, 3011/3012 and earlier annual-registration/upgrade fixtures. **All business table data/counts, definitions, constraints, triggers, views, migration checksums and existing grants matched.** Accounts, passwords and roles matched. All pre-existing primary audit rows also matched exactly: **10,364 original rows**, with only **three login and three logout** events appended for the synthetic role checks. Session last-seen/revocation and rate-limit changes are expected authentication activity, not monitoring/financial writes.

Fresh authoritative payment summaries reconfirmed **800/200 Pending**, zero Paid/Unclaimed/Needs review and both `canRecord:true`. Frozen membership/snapshot bytes, prior reviews, historical setup/window dates, publications, entitlements, allocations, individual history, corrections and Original evidence remain intact. No stipend was cancelled or scholar excluded because of monitoring.

[Database comparison](../../output/a6-1-graduation-20261024/preservation.json), [audit comparison](../../output/a6-1-graduation-20261024/audit-preservation.json), [starting inventory](../../output/a6-1-graduation-20261024/database-before.json), [final inventory](../../output/a6-1-graduation-20261024/database-after.json).

Of **1,139 pre-existing file inputs**, **1,135** matched; changes were the three declared source files (`server/app.ts`, `src/ScholarWorkspace.tsx`, `src/styles.css`) and generated `dist/server/app.js`. No starting file is missing. New implementation/generated files are additional declared outputs. The new compiled client is retained under `output/a6-1-graduation-20261024/built-client`; original static client files were restored for the older-schema retained servers. The live 5173 Vite frontend uses the new source. [File comparison](../../output/a6-1-graduation-20261024/files-after.json).

Rollback for this read-only slice is to revert only the declared source/wiring/styles and rebuild/restart the same synthetic profile. No database restore, intake/history deletion, data conversion, feature flag change or switch to the original database is needed. Preserve unrelated dirty work. Existing startup remains `node scripts/localhost-5173-profile.mjs synthetic`.

## A6.2 focused design handoff — not implemented

| Contract | Recommendation requiring separate approval |
|---|---|
| **DM-G1 authoritative duration** | Versioned school/program/curriculum/cohort applicability, duration, effective scope and traceable issuer/source. Staff collects the source; Coordinator reviews applicability under an explicitly approved permission contract. Unknown, conflicting, stale or out-of-scope references remain unresolved. Do not seed from these test-program names/constants |
| **DM-G2 Expected evidence/history** | Append-only supported completion-period review tied to person, year/optional semester and approved placement/reference revisions, with source, actor, recording time, reason, expected revision, audit and exact retry. Do not misuse formal standing requests to store expectation |
| **Delayed follow-up** | Record the actual supported follow-up/outcome and next action. A passed expected date or year beyond duration requests review; it does not automatically declare delay, failure or termination |
| **Permissions** | Keep read access under scholar visibility. Propose distinct source preparation/review and monitoring recording/correction operations for explicit approval. Existing `scholarship.status.request/approve` remain formal-standing authority, not an assumed new duration-maintenance delegation. Administrator remains technical only |
| **Corrections/history** | Append/supersede with scope and reason; retain all earlier evidence. Placement/duration changes require applicability re-review, not silent reuse of an old Expected/Delayed result. Formal graduation correction continues through the existing process |
| **Continuing Roster handoff** | Surface unresolved review/evidence to the existing roster/profile handoff with the correct year. Pending monitoring alone neither approves nor denies continuation; reviewed N+1 continuation persistence remains separately approved A4/DM-R work |

A6.2 needs concrete schema/index/grant/API and permission approval, actual applicable office evidence, version/freshness/retry/rollback tests and its own acceptance. Read-only unknowns need not block current registration, documents or valid final-semester payments. No new write endpoint, monitoring ledger, duration table or graduation policy was introduced here.

## Remaining limits and stop

All live program durations remain unknown until authoritative applicable references are supplied through an approved model. Expected/Delayed filters remain empty; there is no control pretending to record those facts. Reference choice menus have an explicit 100-item bound. Long native select values can be visually clipped; full selected year/semester and row values are shown in the result context/table. Narrow tables intentionally require horizontal scrolling. Exact native 200% zoom and full assistive-technology/WCAG acceptance remain unverified. The existing Vite bundle warning remains; no performance remediation began.

Browser console qualifications are the expected signed-out 401, deliberately requested restricted-role 403 and simulated read-failure 503. No unexpected monitoring endpoint error was observed after the final checks. The previous transition report's unrelated empty-year profile-history issue remains historical and was not broadened into this patch.

**Stopped after A6.1, verification and this report.** The primary stays on the same isolated 1,000-scholar synthetic database at 5173. No A6.2/A2/A4/B1/B2, schema/account/permission change, financial-policy change, feature activation, LAN/production operation, deployment or P11 was started.
