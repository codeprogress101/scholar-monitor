# B2 AP1 — Presentation primary UAT promotion

25 October 2026, Philippine time. **Completed and verified at [localhost:5173](http://127.0.0.1:5173/#scholars). Stopped after B2 promotion.** Primary runs the accepted Registry/Add Scholar presentation package. School and Course remain functional optional dropdowns. No free-text storage, migration, grant, permission, feature flag or business-data change was introduced.

Authorization covers the five-file package in the [accepted B2 report](B2_SCHOLAR_REGISTRY_SIMPLIFICATION_REPORT.md). No candidate scholar, fixture or credential was transferred.

## Target and recovery

| Item | Verified result |
|---|---|
| Server | **DESKTOP-BPLJKRP**, MariaDB at **127.0.0.1:3306** |
| Primary database | **`ldss_primary_test_12676_61497616`** |
| Runtime | **`ldss_primary_12676_61497616@localhost`** |
| Profile / frontend / API | Existing **synthetic** profile, **127.0.0.1:5173 / 3001** |
| Schema | **65 migrations**, unchanged SQL checksums and applied timestamps |
| Before controller / API / Vite | **29536 / 30132 / 48428** |
| Final controller / API / Vite | **48432 / 43076 / 44740** |

All **1,265 files** protected by the isolated B2 checkpoint matched before promotion. The candidate's five source hashes, reviewed patch and two archives also matched; `git apply --check` passed. The intervening B2 report was retained. A fresh inventory protected **1,266 existing files** and the current database/account/grant/audit/financial state, rather than assuming earlier counts were still current. [Preflight](../../output/b2-primary-20261025/preflight.json).

Only the verified primary process tree was stopped, after rechecking listener ownership, commands and parent PIDs. With both primary ports quiet, a fresh encrypted backup of **148 tables** passed a new isolated restore: data checksums, schema, indexes, foreign keys/checks, triggers, executable views and rejection probes. The temporary restore schema/account was removed. The archive is **13,682,647 bytes**; existing **64 MiB SQL / 96 MiB archive / 100,000 rows per table** limits were unchanged. Archive/key contents remain restricted. [Recovery checkpoint](../../output/b2-primary-20261025/recovery.json).

## Exact promotion and activation

| File | Promoted behavior |
|---|---|
| [ScholarsPage.tsx](../../src/ScholarsPage.tsx) | Prominent Add Scholar; full names and permanent IDs; grouped workflows; existing search/status/history controls; More filters and Clear filters |
| [AnnualIntakePanel.tsx](../../src/AnnualIntakePanel.tsx) | Short registration labels, contextual help, separate registration presentation and character fixes; existing optional reference selectors |
| [RegistryEligibility.tsx](../../src/RegistryEligibility.tsx) | Compact table labels with full accessible source wording and existing Details dialogs |
| [styles.css](../../src/styles.css) | Accepted scoped Registry/form layout, wrapping, action sizing and focus styles |
| [registry-presentation.test.tsx](../../tests/registry-presentation.test.tsx) — new | Status-meaning/accessibility and strict deferred-text boundary tests |

All five files match their reviewed hashes exactly. There was no promotion-specific application edit. Of **1,266 existing files, 1,262 match unchanged**; the four differences are the authorized UI files. No existing file is missing. The new test, this report and task-local evidence are additional deliverables. Backend, API, schema, configuration, dependencies, existing tests, financial command code and recovery formats remain exact. [Promoted hashes](../../output/b2-primary-20261025/promoted-files.json), [file/data comparison](../../output/b2-primary-20261025/preservation.json).

The complete normal build passed before activation. **All ten production-client files match the accepted candidate build byte-for-byte.** The new build is [archived](../../output/b2-primary-20261025/compatible-build.zip). Starting shared static-client files were restored exactly for older retained servers; primary 5173 uses the promoted current Vite source with the existing compatible API. Readiness returns **200**. [Client comparison](../../output/b2-primary-20261025/client-compatibility.json), [build preservation](../../output/b2-primary-20261025/build-preservation.json).

Listeners at **3011/3012/3013/3015/3016/3018/3019** retain their starting PIDs. None was restarted or used for mutations. `.env`, launch configuration, runtime grants and all established feature flags remain unchanged. [Final process/package evidence](../../output/b2-primary-20261025/delivery.json).

## Actual primary browser acceptance

Existing synthetic Staff and Coordinator accounts authenticated normally, without changing accounts, passwords or roles. Both passed:

- B1 current-year entry, **1,000** supported identities, one scoped initial list request, explicit All Years (**1,000**) and the honest empty earlier-year view (**0**).
- Permanent-ID search, New classification (**250**), school/status filters, Clear filters, pagination, year-scoped profiles, Back/Forward and reload.
- Add Scholar's required initially unselected Scholar Type, separate registration workspace, first/middle/last/suffix fields, mandatory reference/reason and shorter help.
- School and Course dropdowns: **six school choices / nine course choices including the blank option**, actual existing UUID selection, then clearing both to unknown. Year Level retained its existing text entry. No fake ID or free-text field was added.
- Native validation blocked empty required fields and a two-character registration reference. All drafts were cancelled; **no registration, duplicate-check, import staging or other business write was submitted**. Primary guards recorded zero attempted non-GET business requests.
- Visible keyboard focus, accessible action names, local table scrolling, registration Cancel restoring Add Scholar, and Escape restoring Payout details/Export triggers. Coordinator's prior-approval dialog also restored its trigger.

Staff's prior-approval action remains absent and its approved-import option disabled. Coordinator's approved-import option is available and initially unchecked. No upload was staged. Both test sessions were signed out; the user's separate session was not signed out.

Both roles passed **1440/1024/820/375/320 CSS pixels**, at 900-pixel height: no page-level overflow and **3-pixel** focus outlines. Screenshots exclude the account banner. Full names wrap; narrow tables intentionally scroll locally.

| Width | Staff Registry | Coordinator Registry | Add Scholar |
|---|---|---|---|
| 1440 | [Staff](../../output/playwright/b2-primary/staff-registry-1440.png) | [Coordinator](../../output/playwright/b2-primary/coordinator-registry-1440.png) | [Form](../../output/playwright/b2-primary/coordinator-registration-1440.png) |
| 1024 | [Staff](../../output/playwright/b2-primary/staff-registry-1024.png) | [Coordinator](../../output/playwright/b2-primary/coordinator-registry-1024.png) | [Form](../../output/playwright/b2-primary/coordinator-registration-1024.png) |
| 820 | [Staff](../../output/playwright/b2-primary/staff-registry-820.png) | [Coordinator](../../output/playwright/b2-primary/coordinator-registry-820.png) | [Form](../../output/playwright/b2-primary/coordinator-registration-820.png) |
| 375 | [Staff](../../output/playwright/b2-primary/staff-registry-375.png) | [Coordinator](../../output/playwright/b2-primary/coordinator-registry-375.png) | [Form](../../output/playwright/b2-primary/coordinator-registration-375.png) |
| 320 | [Staff](../../output/playwright/b2-primary/staff-registry-320.png) | [Coordinator](../../output/playwright/b2-primary/coordinator-registry-320.png) | [Form](../../output/playwright/b2-primary/staff-registration-320.png) |

[Staff layout/dropdowns/validation](../../output/b2-primary-20261025/staff-browser.log), [Staff navigation/permissions](../../output/b2-primary-20261025/staff-interactions.log), [Coordinator layout/dropdowns/validation](../../output/b2-primary-20261025/coordinator-browser.log), [Coordinator navigation/permissions](../../output/b2-primary-20261025/coordinator-interactions.log), [historical screen](../../output/playwright/b2-primary/coordinator-historical.png). Playwright was used for these bounded checks.

Primary has no manual-intake examples; none was added to manufacture coverage. Actual registration saves, duplicate/source protections and retries were exercised in newly owned disposable scenarios, with the accepted isolated B2 saved-record checks retaining their own scope. [Current primary source coverage](../../output/b2-primary-20261025/primary-reads.json).

## Current tests and preservation

Every final command below exited **0** on the promoted source. Mutating regressions used new owned disposable schemas.

| Command/check | Observed result |
|---|---|
| `npm run lint` / `npm run typecheck` | No lint/type errors |
| `npm run build` | Complete normal build passed; existing chunk-size warning remains |
| `npm test` | **114 files / 713 tests passed** |
| `npm run check:secrets` | Passed |
| `npm run test:import-intake-bindings-db` | **13 import groups plus A2.1 assertions**: manual registration/reuse, original source evidence, permissions, rollback/retry/concurrency and publication/historical integration |
| Registry parity / recording / reconciliation / financial reports | Four existing drivers passed, including R01/R07 parity, financial retry/atomicity, Original/current evidence and complete API/XLSX/PDF outputs |
| Primary read-only source checks | Complete membership/page/filter parity and both full payment previews passed |

[Package command exits](../../output/b2-primary-20261025/checks-main.json), [unit log](../../output/b2-primary-20261025/test-main.log), [import command](../../output/b2-primary-20261025/integration/results.json), [four regression commands/exits](../../output/b2-primary-20261025/regressions-registry-presentation-primary/results.json).

Final comparison confirms **all business table values/counts, schema objects, 65 migration rows, accounts/password hashes/roles, runtime grants and original audit rows unchanged**. Permanent IDs, annual classifications, approved import cells/bindings, Masterlists, academic/standing records, frozen payroll/source bytes, entitlements, allocations, payments/dates and closure/individual evidence remain intact.

| Current primary fact | Fresh before → after |
|---|---|
| Scholars / accounts | **1,000 / 14 → unchanged** |
| Annual intake roots / academic records | **1,000 / 1,000 → unchanged** |
| Entitlements / allocations | **1,000 / 1,000 → unchanged** |
| Payments | **2 Paid → 2 Paid**, complete original evidence exact, both actual dates **2026-10-24** |
| PAY-001 | **2 Paid / 798 Pending**, `canRecord:true` |
| PAY-002 | **200 Pending**, `canRecord:true` |
| Import bindings | **0 → 0** |

Fresh full previews accept **798 / 200**, with zero conflicts; neither was committed. All **10,390 pre-existing audit rows** match. Only two login and two logout events were appended (**10,394** total), with sessions **20→22** and normal revocation/last-seen/rate-limit activity. This is qualified authentication activity, not a claim of zero database writes. [Preservation](../../output/b2-primary-20261025/preservation.json), [before financial reads](../../output/b2-primary-20261025/readiness-before.json), [after financial reads](../../output/b2-primary-20261025/readiness-after.json).

## Issues, rollback and stop

Browser helpers initially assumed a closed More filters disclosure and an active Registry route. Corrected checks explicitly establish those states before assertions; failed attempts are retained in task logs. No application source, validation or safeguard was changed to satisfy them. The expected signed-out authentication 401 is not a business failure.

School/Course remain optional reference dropdowns until a separately approved supplied-text model is implemented. Existing narrow-table scrolling, native-select clipping, vertical scrolling and build warning remain. Native 200% zoom, full assistive-technology/WCAG certification and office/LAN acceptance are not claimed.

Saved B1 source is under `output/b2-primary-20261025/baseline/`; the [accepted 65-compatible B1 build](../../output/b1-primary-20261025/compatible-build.zip) and new B2 build remain available. Any future rollback should coordinate source/frontend activation while preserving later legitimate edits. No database rollback, F55 downgrade, record deletion or stale-data restoration is appropriate. The normal startup remains `node scripts/localhost-5173-profile.mjs synthetic`.

**Stopped after B2 presentation promotion, verification and this report.** Primary 5173 is running the accepted B2 code. No candidate data copy, free-text enhancement, payment-status color change, Dashboard refinement, annual rollover, financial-policy change, migration, new grant/flag, LAN/production operation or unrelated implementation occurred.
