# D1.2 — Balanced Scholarship Dashboard

25 October 2026, Philippine time. **Implemented and verified in a new isolated candidate only. Primary 5173 remains on accepted D1; D1.1 and D1.2 have not been promoted.**

Review at [localhost:3025](http://127.0.0.1:3025/#dashboard). Candidate: **`C:/xampp/htdocs/ldss_d12_candidate_20261025`**. Owned copy: **`ldss_dashboard_balance_test_36724_4f2151ba`**, runtime **`ldss_db_36724_4f2151ba@localhost`**, **66 migrations**. The accepted [D1.1 candidate](D1_1_PREMIUM_DASHBOARD_VISUAL_POLISH_REPORT.md) supplies the visual baseline. The [accepted D1 primary](D1_PRIMARY_UAT_PROMOTION_REPORT.md) supplies the compatible application/data baseline.

## Baseline and isolation

All seven accepted D1 application hashes and all four reviewed D1.1 hashes matched before copying. A fresh checkpoint protects **1,305 existing main-workspace inputs**. The new candidate copies the actual dirty primary baseline and then the exact D1.1 package; Git HEAD is not substituted. Primary host/runtime verification confirmed **DESKTOP-BPLJKRP**, MariaDB **127.0.0.1:3306**, database **`ldss_primary_test_12676_61497616`**, runtime **`ldss_primary_12676_61497616@localhost`**, synthetic **5173/3001**, and all **66 accepted migration checksums**. Primary controller/API/Vite remain **49300 / 54124 / 2480**. [Preflight](../../output/d1-2-dashboard-20261025/preflight.json), [verified visual baseline](../../output/d1-2-dashboard-20261025/visual-baseline.json), [process evidence](../../output/d1-2-dashboard-20261025/primary-processes.json).

A fresh encrypted source checkpoint of **149 tables / 13,688,572 encrypted bytes** passed a new isolated restoration, including values, definitions, indexes, foreign keys/checks, triggers, executable views and rejection probes. The temporary restore schema/account was removed. Existing backup bounds remain unchanged. Copied sessions, reset tokens and rate limits were excluded. Credentials and keys remain restricted and are absent from review archives. Technical copy accounts use the existing own-schema provisioning policy. [Recovery proof](../../output/d1-2-dashboard-20261025/backup.json).

No primary login, business command, source installation, migration, grant, feature-flag change, `.env` repoint or restart was performed. D1.1 source hashes and its listener at 3024 remain unchanged. Other retained listeners through 3024 retain their starting owners. The temporary comparison server at 3026 used this new owned copy and was stopped after measurements; it did not use the primary database.

## Visual and data changes

The four compact summary cards now cover **associated scholars**, **New/Continuing**, **recorded year levels**, and **account-authorized pending work**. D1.1's compact period banner, full-cycle disclosure, warnings, number alignment, typography and spacing remain.

**Scholar classification** is a principal chart, with a proportionate donut and exact New/Continuing/Unknown legend. **Scholars by year level** uses a common total-cohort scale and exact counts, including zeros and Unknown. The two former payment charts are replaced by **one smaller Payment status section**, preserving B2.5 labels/colors and the existing Recording totals. Its disclosure links to every actual batch; Payment Recording remains in Quick Actions. No financial functionality was removed from its workspace.

Graduation Monitoring and Admission & requirements each have a balanced panel of supported review destinations. Graduation links carry the exact selected year and semester; Admission carries the selected year. Receiving/verification opens the existing Registry workspace, with an explicit instruction to choose its period there. Current Masterlists, genuine Needs attention, permission-aware Quick Actions and optional detailed assessments remain. No other page changed.

| Statistic or area | Source and exact meaning | Actual review-copy value |
|---|---|---:|
| Scholars in selected year | Existing B1 intake, academic record, annual scholarship or scholar-semester association; all scholar statuses. No first-entry/ID-year fallback | **1,000** |
| Classification | Existing selected-year, source-first intake classification, including accepted legacy-derived interpretation; not admission approval | **250 New / 750 Continuing / 0 Unknown** |
| Recorded year levels | Associated people with a recognized level in an actual selected-year academic record or its latest approved correction | **1,000 recognized / 0 Unknown** |
| Year-level distribution | Same annual cohort; canonical academic level only. Missing/unrecognized values are Unknown | **Year 1: 250; 2: 250; 3: 250; 4: 200; 5: 50; 6: 0; 7+: 0; Unknown: 0** |
| Work requiring attention | Existing account-authorized R06 pending-work total, across periods; not a requirements-completeness count | **2 Staff / 4 Coordinator** |
| Payment status | Existing current effective Recording outcomes of finalized numbered payroll rows in the selected year/semester, across cycles | **2 Paid / 998 Pending / 0 Unclaimed / 0 Needs resolution** |
| Official Masterlists | Existing published/locked current-working-year metadata, independently of a historical cycle selection | **800 / 200 members** |
| Graduation, Admission, requirements | Authorized destinations and source explanations; no new numerical total or approval inference | **No invented count** |

Year levels reuse the existing `normalizedMonitoringLevel` vocabulary, supporting recognized levels 1–100. Display buckets are 1–6, **7+** for 7–100, and **Unknown / unrecognized**. Original strings are never rewritten. Manual initial Year IV, supplied School/Course text, or a registration-only root does **not** become canonical academic placement. A course-pending record is not automatically missing its otherwise supported year level. Placement is the latest approved annual record, not a historical semester snapshot.

Graduation shortcuts distinguish final-year review candidates, potentially graduating, expected monitoring, delayed monitoring and formally Graduated. The contextual explanation states that Year IV/V is only a review filter; potentially graduating needs confirmed duration/program context, expected/delayed needs separate monitoring evidence, and formal graduation needs approved formal evidence. The Dashboard makes no decision.

Payment interpretation remains **effective payroll rows/attempts**, including approved corrections. It is not a unique-entitlement total, original closure outcome or later individual DV settlement. **On payroll and Masterlist inclusion are not Paid.** Full source wording remains accessible beside the compact section. Both original payrolls still feed the same unchanged Recording reader.

## Small read-only backend boundary

Only `server/dashboard/overview.ts` changes on the backend. The existing annual aggregate now groups by classification and canonical academic level in **one SQL statement** using the existing selected-year joins and approved-correction precedence. It deliberately does not use Registry's provisional initial-placement fallback for academic level.

Binary grouping preserves raw distinctions before applying the existing level vocabulary. The read returns at most **5,001 groups**, then applies the existing **5,000-associated-person guard**, failing instead of returning a partial scope. The response contains eight fixed distribution buckets, not scholar rows or histories. There is no per-scholar application query or new index/migration.

The existing `/api/v1/dashboard/annual` response gains additive `academic: {known, unknown, levels}` metadata. All original annual fields match the old reader exactly; the payroll response is byte-equivalent in the service comparisons. Routes, strict cycle query parsing, authorization, configuration snapshot/guard, `no-store`/Cookie headers and financial readers remain unchanged. There is no new endpoint, request, polling, cache, financial rule or permission. Existing old clients can ignore the added field. A new-client probe with an old D1 response preserves classification and displays unavailable academic data rather than inventing zero or crashing. [Source/oracle acceptance](../../output/d1-2-dashboard-20261025/summary-read-acceptance.json).

### Deferred for accuracy and performance

- **Graduation counts:** no small existing summary exposes the complete duration, curriculum/cohort, monitoring-review and formal-standing interpretation. The existing row reader remains at its destination. D1.2 does not create a partial substitute or fetch it on entry.
- **Requirements completeness, eligibility and admission-stage totals:** no new initial aggregate is added. The existing detailed assessments include expensive per-owner evidence work; they remain optional. The panel offers authorized actions, while the general work queue retains its genuine R06 count.
- No recent-activity reader, new chart library, business-state decision, automatic rollover or cross-page redesign is included.

## Exact file boundary

The **combined D1.1 + D1.2 package has eight files: five existing and three new relative to current primary D1**. Relative to the D1.1 visual baseline, six files change and two are new.

| File | Change |
|---|---|
| `server/dashboard/overview.ts` | Add bounded canonical academic-level grouping to the existing annual read |
| `src/DashboardPage.tsx` | Balanced cards/sections, period-aware review links, compact payment placement; existing effects and selection behavior retained |
| `src/DashboardCharts.tsx` | Replace redundant financial graphs with compact exact outcomes and batch destinations |
| `src/DashboardScholarCharts.tsx` — new | Proportionate classification donut, academic-level bars and accessible exact HTML counts |
| `src/styles.css` | Dashboard-only additions after the byte-identical D1.1 CSS prefix |
| `tests/dashboard-overview.test.tsx` | Additive annual result and revised payment-presentation expectations; original source/authority/bounds tests retained |
| `tests/dashboard-polish.test.tsx` — new relative to primary | Retain D1.1 cycle wording tests; adapt payment-chart expectations to the compact section |
| `tests/dashboard-balanced.test.tsx` — new | Academic source/grouping/Unknown/empty/bounds, chart counts, legacy response and selected-context links |

All other existing non-generated files match the main baseline, except the candidate's excluded Apache access-denial rule. No academic/financial writer, graduation decision, registration/import workflow, old migration, schema manifest, role mapping, permission, dependency, font, feature flag, configuration or other page changed. Builds and task-local verification helpers are separate artifacts. [Source preservation](../../output/d1-2-dashboard-20261025/source-preservation.json), [eight exact hashes](../../output/d1-2-dashboard-20261025/candidate-files.json).

## Screenshots, keyboard and responsive checks

Images use the same 1,000-person copy, role, actual period, settled data, closed disclosures, 900-pixel height and default zoom. Account banners are masked. Accepted D1/D1.1 clients were served against the accepted D1 API on the temporary owned comparison server; D1.2 uses its actual extended reader. No primary source/data was reverted for images.

| CSS width | Staff: D1 / D1.1 / D1.2 | Coordinator: D1 / D1.1 / D1.2 |
|---|---|---|
| 1440 | [D1](../../output/playwright/d1-2/staff-d1-1440.png) / [D1.1](../../output/playwright/d1-2/staff-d11-1440.png) / [D1.2](../../output/playwright/d1-2/staff-d12-1440.png) | [D1](../../output/playwright/d1-2/coordinator-d1-1440.png) / [D1.1](../../output/playwright/d1-2/coordinator-d11-1440.png) / [D1.2](../../output/playwright/d1-2/coordinator-d12-1440.png) |
| 1024 | [D1](../../output/playwright/d1-2/staff-d1-1024.png) / [D1.1](../../output/playwright/d1-2/staff-d11-1024.png) / [D1.2](../../output/playwright/d1-2/staff-d12-1024.png) | [D1](../../output/playwright/d1-2/coordinator-d1-1024.png) / [D1.1](../../output/playwright/d1-2/coordinator-d11-1024.png) / [D1.2](../../output/playwright/d1-2/coordinator-d12-1024.png) |
| 820 | [D1](../../output/playwright/d1-2/staff-d1-820.png) / [D1.1](../../output/playwright/d1-2/staff-d11-820.png) / [D1.2](../../output/playwright/d1-2/staff-d12-820.png) | [D1](../../output/playwright/d1-2/coordinator-d1-820.png) / [D1.1](../../output/playwright/d1-2/coordinator-d11-820.png) / [D1.2](../../output/playwright/d1-2/coordinator-d12-820.png) |
| 375 | [D1](../../output/playwright/d1-2/staff-d1-375.png) / [D1.1](../../output/playwright/d1-2/staff-d11-375.png) / [D1.2](../../output/playwright/d1-2/staff-d12-375.png) | [D1](../../output/playwright/d1-2/coordinator-d1-375.png) / [D1.1](../../output/playwright/d1-2/coordinator-d11-375.png) / [D1.2](../../output/playwright/d1-2/coordinator-d12-375.png) |
| 320 | [D1](../../output/playwright/d1-2/staff-d1-320.png) / [D1.1](../../output/playwright/d1-2/staff-d11-320.png) / [D1.2](../../output/playwright/d1-2/staff-d12-320.png) | [D1](../../output/playwright/d1-2/coordinator-d1-320.png) / [D1.1](../../output/playwright/d1-2/coordinator-d11-320.png) / [D1.2](../../output/playwright/d1-2/coordinator-d12-320.png) |

Both roles passed all five widths without page-level horizontal overflow. Counts/labels wrap, cards stack and the D1.1 cycle details remain keyboard-accessible. Refresh → cycle → full-details order and **3-pixel** focus pass. Academic, graduation and financial scope disclosures work by keyboard. Actual Graduation and Admission destinations retain selected context; Payment Recording and its date pencil remain available. All seven detailed assessments load only after opening their existing disclosure. Manrope/DM Sans roles remain. [Staff controls](../../output/d1-2-dashboard-20261025/staff-controls.json), [Coordinator controls](../../output/d1-2-dashboard-20261025/coordinator-controls.json), [complete Dashboard](../../output/playwright/d1-2/actual-balanced-dashboard.png).

Candidate-browser-only probes covered Unknown classification/academic values, an empty supported cohort/payroll scope, old D1 metadata, failed annual/payment reads, delayed response after clearing a period and stale saved selection. Unknown/empty/unavailable remain distinct; failures do not draw fabricated zeros. Probes were removed and actual data restored. These are rendering probes, not committed example outcomes. [State evidence](../../output/d1-2-dashboard-20261025/states.json), [labelled Unknown probe](../../output/playwright/d1-2/simulated-unknown.png), [actual balanced Dashboard](../../output/playwright/d1-2/actual-balanced-dashboard.png).

**Native 200% Chrome** passed a focused Coordinator review with viewport emulation disabled: **712×424 CSS pixels, DPR 2**. Summary, cycle details, classification, levels, actions and source disclosure passed with no page overflow and visible keyboard focus. Rendered-view captures were not resized. Zoom was restored to 100%, task sessions signed out and task windows closed. The user's separate browser was not changed. [Native proof](../../output/d1-2-dashboard-20261025/native-zoom-review.json), [200% overview](../../output/playwright/d1-2/native-200-overview.png), [200% classification](../../output/playwright/d1-2/native-200-donut.png). Full AT/WCAG and office/LAN certification are not claimed. The ui-ux-pro-max and Playwright workflows were used.

## Performance and loading protection

The proposed academic SQL was measured **before adding it to the application**: **61.6 / 17.5 / 16.0 ms**, returning **five groups / 298 decoded JSON bytes** for 1,000 people. EXPLAIN retains indexed annual/owner/approved-revision lookups. This observation justified using the shared aggregate, without a migration or additional reader. [Proposal, SQL and plan](../../output/d1-2-dashboard-20261025/academic-proposal-profile.json).

Final browser comparisons use the same copy, actor, period, **1440×900**, cache disabled, one unmeasured warm-up navigation per client, then three sequential measured navigations. No builds/regressions ran concurrently. D1 and D1.1 use their actual old annual response; D1.2 uses the extended response. The temporary baseline API at 3026 was then stopped.

| Role / settled-content measurement | D1 ms | D1.1 ms | D1.2 ms |
|---|---|---|---|
| Staff, all four cards / full initial Dashboard | 392 / 283 / 270 | 286 / 264 / 253 | **270 / 366 / 377** |
| Staff, both principal graphs | 283 / 283 / 270 | 286 / 264 / 253 | **270 / 259 / 272** |
| Coordinator, all four cards / full initial Dashboard | 284 / 270 / 376 | 270 / 376 / 377 | **257 / 267 / 364** |
| Coordinator, both principal graphs | 283 / 270 / 266 | 269 / 252 / 268 | **256 / 267 / 259** |

D1/D1.1 graphs are the former two payment charts; D1.2 graphs are classification and academic levels. Their readiness uses the applicable populated source, not HTML load. D1.2 four-card readiness includes annual/academic and attention data; full readiness additionally waits for the payment section and current lists. The work is not identical, and no rendering speedup is claimed.

Warm observations remain within about **0.25–0.39 seconds**. Staff's three-sample card median is about 102 ms above D1.1, while graph readiness is similar and Coordinator card times are lower; attention completion varies with the unchanged R06 path. There is no consistent material regression across these local samples. Initial exploratory startup samples were noisier: the first D1 Staff sample was **1,122 ms**, and the first D1.2 Staff sample **1,939 ms**. A first new-service query also had a transient delay. These were investigated with warmed matched navigation and full-request SQL profiling rather than hidden or presented as a speedup. **Cold-start latency is not certified by this task.** Raw exploratory logs remain.

| Read / role | Before service ms, three samples | After service ms, three samples | SELECTs before → after |
|---|---|---|---:|
| Annual, Staff | 19.2 / 19.4 / 19.0 | 26.1 / 24.4 / 32.8 | **12 → 12** |
| Payroll, Staff | 24.1 / 25.6 / 23.5 | 25.1 / 25.6 / 25.3 | **26 → 26** |

The service profile includes fresh authorization, excluding HTTP middleware. Annual SQL decoded rows change **54→57 Staff / 94→97 Coordinator**; decoded bytes change **6,463→6,687 / 10,497→10,721**. Full Fastify injection, with one warm-up per role/method, independently measures **18 SELECTs annual / 32 payroll before and after**, including middleware. Annual request observations change roughly **21–24→26–35 ms**; payroll stays roughly **25–28 ms**. Only ordinary candidate authentication-session touches accompany the request reads. Injection excludes TCP, browser and startup. [Full endpoint profile](../../output/d1-2-dashboard-20261025/endpoint-profile.json).

API requests stay **10**. Annual response bytes change **156→546**, payroll stays **1,052**; total measured API bytes change **9,009→9,399 Staff / 13,424→13,814 Coordinator**. Original annual fields and complete payroll outputs match exactly. No expensive initial assessment, graduation-row or per-person requirements call was added. [Combined performance evidence](../../output/d1-2-dashboard-20261025/performance.json).

Client bytes change **1,456,893→1,464,161** from D1.1: **+7,268 bytes**. JavaScript changes **1,034,005→1,038,147**; CSS **316,727→319,853**; observed CSS gzip **47,660→48,098**. Fonts/dependencies are unchanged. These are local observations, not concurrency, maximum-5,000-cohort, LAN-capacity or production benchmarks. [Three-build comparison](../../output/d1-2-dashboard-20261025/bundle-impact.json).

## Tests and record preservation

| Final check | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | All exit 0; complete normal build |
| `npm test` | **121 files / 772 tests passed** |
| Dashboard, academic, approved academic changes, Payment Recording, reconciliation, individual settlement, financial reports | **All seven existing integration suites exit 0** |
| New task-only academic integration | Actual guarded correction/year isolation; unsupported label; manual New/Continuing without canonical academic placement; identity-only exclusion; empty year — passed |
| Registry/academic/Recording oracles and original-output parity | Passed for both roles; pure Administrator/unassigned denied |
| Fresh complete payment previews, recovery and preservation | Passed; no preview committed |

Mutation suites provisioned new owned disposable schemas and used declared fictional facts. The task-only academic helper retains the existing academic-change driver's guarded workflows and cleanup. It proves that an approved correction changes the selected year's distribution while another year's original level remains; a legitimate unsupported academic label stays Unknown; manual supplied Year IV is not promoted; an identity-only row is excluded; an empty year stays zero. None of those examples was copied into the review copy or primary. [Helper command/result](../../output/d1-2-dashboard-20261025/academic-integration-result.json), [accepted log](../../output/d1-2-dashboard-20261025/academic-integration-accepted.log).

Financial regressions retain retry/atomicity, Original/current distinctions, source guards, R01–R07 and complete API/XLSX/PDF outputs. No safeguard or test bound was weakened. [Normal exits](../../output/d1-2-dashboard-20261025/checks-main.json), [unit log](../../output/d1-2-dashboard-20261025/test-final.log), [seven exact regression commands/exits](../../output/d1-2-dashboard-20261025/regressions-d-one-balanced/results.json), [fresh financial reads](../../output/d1-2-dashboard-20261025/readiness.json).

Fresh before/after comparisons prove **all 1,305 protected primary inputs exact**, unchanged business values/counts, schema objects, 66 journal rows, accounts/password hashes/roles and runtime grants. This includes permanent IDs, annual registrations/classifications, academic/standing evidence, supplied-text/import histories and A2.1 bindings, Masterlists, entitlements/allocations, frozen payroll evidence, actual payment dates and individual/closure history.

| Current primary fact | Fresh before → after |
|---|---|
| Scholars / accounts | **1,000 / 14**, unchanged |
| Intake roots / academic records | **1,000 / 1,000**, unchanged |
| Entitlements / allocations | **1,000 / 1,000**, unchanged |
| Every payment | **2 Paid → 2 Paid**, complete original evidence exact, both actual dates **2026-10-24** |
| PAY-001 / PAY-002 | **2 Paid / 798 Pending** and **200 Pending**, both recordable |

Full previews accept **798 / 200**, zero conflicts; none was committed. All **10,414 starting primary audit rows** match, with **zero appended events**. Only the existing `auth_sessions` checksum changed, with **34 rows before and after**. This task performed no primary authentication; existing session activity is qualified rather than described as zero database activity.

The review copy's original business/schema/source/payment rows also remain exact. Its only appended audit events are two task logins and two logouts (**10,414→10,418**), with ordinary sessions/rate limits. Browser guards recorded zero attempted business writes. Primary profile/PIDs, retained listeners and reviewed D1.1 hashes remain exact. This is not an exhaustive new inventory of every retained database. [Preservation](../../output/d1-2-dashboard-20261025/preservation.json), [delivery verification](../../output/d1-2-dashboard-20261025/delivery.json).

## Review package, issues and combined primary proposal

[Eight-file hashes](../../output/d1-2-dashboard-20261025/candidate-files.json), [combined D1.1+D1.2 patch](../../output/d1-2-dashboard-20261025/D1_1_D1_2_COMBINED.patch), [source archive](../../output/d1-2-dashboard-20261025/candidate-source.zip), [compatible 66 build](../../output/d1-2-dashboard-20261025/compatible-build.zip). Archives exclude `.env`, credentials, keys, fixtures and the Apache isolation rule. Patch check against the actual primary baseline passed with automatic line-ending conversion disabled; an independent apply round trip reproduced all eight hashes. **No patch was applied to primary.**

The new candidate remains running at **3025**, PID **41812**, with compatible UI/API and 66-entry readiness. Restart only from its directory using `node --import tsx output/d1-2-dashboard-20261025/serve.ts`; it performs no startup migration/reset. D1.1 at 3024 and primary at 5173 remain available separately.

Initial helper work encountered a wrong launch directory and a task-helper import path; both stopped before that helper connected. Lint found an unused payment-card variable after the redesign. A disposable calendar test correctly rejected creating another year after starting a working year; the empty future fixture was then declared before that setup. Graduation navigation assertions initially sampled selects before their options loaded; settled checks passed with the actual context intact. The donut's secondary label was shortened to fit its center. No other page or business guard was changed to satisfy a test.

Remaining limits: graduation/requirements totals are intentionally deferred; the existing detailed reader remains costly and optional. The review copy has one payout cycle and no manual examples; positive manual/unknown/historical evidence comes from the fresh disposable integration, while UI simulations are labelled. Native selects and narrow layouts retain ordinary platform rendering/vertical scrolling. Cold-start, maximum-load, full AT/WCAG and office/LAN acceptance remain unverified. The existing Vite chunk warning remains.

After **separate combined D1.1+D1.2 promotion authorization**:

1. Freshly verify the exact synthetic host/database/runtime/profile/listeners, all 66 checksums and then-current dirty source against this eight-file package. Inspect overlapping later edits rather than overwriting them; preserve all current legitimate transactions, not an assumed two-payment checkpoint.
2. Capture current file/business/account/grant/audit/frozen-source inventories and a fresh encrypted recovery checkpoint verified through a new isolated restore. Preserve the accepted 66-compatible D1 source/client and retained static/server artifacts. Transfer no candidate people, sessions, fixtures or credentials.
3. Promote only the reviewed combined source/test package and verify the compatible build. Coordinate the matching annual reader/API and frontend activation through the verified primary profile. No migration, grant, permission, financial flag or launcher change is needed.
4. Verify both roles read-only: annual/classification/academic oracle parity, explicit Unknown, period-aware destinations, actual payment outcomes/dates, responsive/keyboard/zoom behavior and fresh preservation. Keep mutations in disposable copies.
5. If activation fails, coordinate return to the saved **66-compatible D1 source/UI/API**, preserving legitimate later edits. No database restore, schema downgrade, association backfill or history deletion is appropriate.

**Stopped after isolated D1.2 implementation and verification.** Neither D1.1 nor D1.2 is installed on primary 5173. No D2, new workflow authority, graduation decision, financial operation, schema/policy change, rollover, other-page redesign, retained-environment restart or LAN/production operation occurred.
