# Primary UAT — Compact monitoring and payment actions

24 October 2026, Philippine time. **Completed on http://127.0.0.1:5173; stopped after this refinement.** Graduation Monitoring is shorter and easier to scan. Payment Recording retains its actions and amounts, with compact date-edit icons replacing the large row buttons. No business rule, permission, request payload or backend implementation changed.

## Exact files changed

| File | Change |
|---|---|
| [GraduationMonitoring.tsx](../../src/GraduationMonitoring.tsx) | Keep year, semester, search and status filters visible; put secondary filters under **More filters**, marked when active. Combine year/duration into one column. Use short status badges, expandable **Status details**, and **Review / Academic / Standing** actions with specific accessible names. Retain full status names for screen readers and all original destinations/permission checks |
| [PaymentRecording.tsx](../../src/PaymentRecording.tsx) | Shorten routine help; use the new pencil button beside actual dates. Preserve the exact `setDateTarget(row)` action, disabled guard, correction form, search, selection, reviews and confirmations |
| [CompactEditButton.tsx](../../src/CompactEditButton.tsx) — new | Reusable 32 × 32 secondary edit action using the existing Lucide pencil, native tooltip, explicit accessible name, keyboard button semantics and caller-supplied handler/disabled guard |
| [styles.css](../../src/styles.css) | Tighter summary/row spacing, compact action groups, responsive filters, intentional table scrolling and visible focus. Contain hidden accessible status text within its badge |
| [compact-edit-button.test.tsx](../../tests/compact-edit-button.test.tsx) — new | Accessible name, tooltip, non-submit semantics and disabled guard |
| [graduation-monitoring.test.tsx](../../tests/graduation-monitoring.test.tsx) | Verify compact actions retain full accessible names, source explanation and permission-aware standing destination |

Primary actions keep labels. Monitoring’s secondary navigation keeps short labels because the destinations have different purposes; it does not become an ambiguous icon menu. Source/evidence panels and unrelated pages retain their existing controls. **How indicators work** remains available as a disclosure, including annual-placement and financial/standing boundaries.

The original hooks, reads, commands and permission expressions in both screens match the baseline. All existing event handlers match; Graduation Monitoring additionally reuses the local focus-scroll pattern already used by Payment Recording. It keeps keyboard-focused actions inside the horizontally scrollable table. [Source comparison](../../output/primary-ui-refinement-20261024/source-preservation.json).

## Before and after

Matched captures use the same synthetic Coordinator account, database, default filters, first 25 rows, empty search, no selection, closed disclosures, default zoom and 900-pixel viewport height. Payment captures use PAY-001 with its existing **2 Paid / 798 Pending**. No data was reset.

| CSS width | Graduation roster top | Graduation first-row height | Payment roster top | Payment first-row height |
|---|---:|---:|---:|---:|
| 1440 | 656 → 522 | 175 → 98 | 650 → 634 | 93 → 64 |
| 1024 | 764 → 635 | 198 → 98 | 760 → 744 | 111 → 62 |
| 820 | 915 → 654 | 198 → 98 | 906 → 882 | 111 → 62 |
| 375 | 1,479 → 995 | 198 → 98 | 1,178 → 1,103 | 111 → 62 |
| 320 | 1,499 → 1,019 | 198 → 98 | 1,289 → 1,215 | 111 → 62 |

Values are rounded CSS pixels in document coordinates. The sampled payment row is an existing Paid row with a date edit; these are layout measurements, not API/SQL performance claims.

| Screen / width | Before | After |
|---|---|---|
| Graduation / 1440 | [Before](../../output/playwright/primary-ui-refinement/before-graduation-1440.png) | [After](../../output/playwright/primary-ui-refinement/after-graduation-1440.png) |
| Graduation / 1024 | [Before](../../output/playwright/primary-ui-refinement/before-graduation-1024.png) | [After](../../output/playwright/primary-ui-refinement/after-graduation-1024.png) |
| Graduation / 820 | [Before](../../output/playwright/primary-ui-refinement/before-graduation-820.png) | [After](../../output/playwright/primary-ui-refinement/after-graduation-820.png) |
| Graduation / 375 | [Before](../../output/playwright/primary-ui-refinement/before-graduation-375.png) | [After](../../output/playwright/primary-ui-refinement/after-graduation-375.png) |
| Graduation / 320 | [Before](../../output/playwright/primary-ui-refinement/before-graduation-320.png) | [After](../../output/playwright/primary-ui-refinement/after-graduation-320.png) |
| Payment / 1440 | [Before](../../output/playwright/primary-ui-refinement/before-payment-1440.png) | [After](../../output/playwright/primary-ui-refinement/after-payment-1440.png) |
| Payment / 1024 | [Before](../../output/playwright/primary-ui-refinement/before-payment-1024.png) | [After](../../output/playwright/primary-ui-refinement/after-payment-1024.png) |
| Payment / 820 | [Before](../../output/playwright/primary-ui-refinement/before-payment-820.png) | [After](../../output/playwright/primary-ui-refinement/after-payment-820.png) |
| Payment / 375 | [Before](../../output/playwright/primary-ui-refinement/before-payment-375.png) | [After](../../output/playwright/primary-ui-refinement/after-payment-375.png) |
| Payment / 320 | [Before](../../output/playwright/primary-ui-refinement/before-payment-320.png) | [After](../../output/playwright/primary-ui-refinement/after-payment-320.png) |

[Before measurements](../../output/primary-ui-refinement-20261024/browser-before.log), [after measurements](../../output/primary-ui-refinement-20261024/browser-after.log). Automated text counts also include hidden accessible text and are not treated as a precise visible-word metric.

## Validation and preservation

- **Staff and Coordinator:** filters apply through the unchanged URL contract; active secondary filters stay indicated; Review opens the existing evidence dialog; Escape returns focus to its row and preserves filters. Status details expose the original explanation.
- The date pencil has a specific tooltip/accessible name and opens the existing audited correction form using Enter. Cancel saves nothing. Selection survives pagination and ID search; two-person Paid review retains both initially unchecked acknowledgments; Unclaimed retains its separate unchecked confirmation. Browser interception guarded against unexpected writes; none was attempted. [Coordinator](../../output/primary-ui-refinement-20261024/interactions.log), [Staff](../../output/primary-ui-refinement-20261024/staff-interactions.log).
- All five widths passed no-page-overflow and keyboard checks. Full names, exact IDs, date icons, Status details and all three monitoring actions remain reachable with **3-pixel focus outlines** and local horizontal scrolling. [Focus evidence](../../output/primary-ui-refinement-20261024/focus.log).
- `npm run lint`, `npm run typecheck`, `npm test` (**108 files / 688 tests**), isolated Vite production-client build and `npm run check:secrets` all exited **0**. Focused monitoring/navigation/recording/workspace/icon tests passed (**6 files / 48 tests**). [Commands](../../output/primary-ui-refinement-20261024/checks.json), [focused tests](../../output/primary-ui-refinement-20261024/focused.log).
- The client build was written only to the task output directory. No shared `dist`, dependency, backend, migration, configuration, feature flag, retained launcher or prior report was edited. No database integration driver was run because those drivers create other schemas, which this request excludes. Existing financial unit coverage passed; primary previews were cancelled, never committed.
- Fresh read-only inventories targeted only **`ldss_primary_test_12676_61497616`** and its exact runtime. All business data/definitions, 64 migration checksums, accounts, roles, runtime grants and original audit rows match. There remain **1,000 scholars, 14 accounts, 1,000 entitlements/allocations and exactly two Paid records**, including their original dates. No audit event was added; existing session last-seen activity is the qualified authentication difference. [Preservation](../../output/primary-ui-refinement-20261024/preservation.json).

The existing API/Vite processes **35720 / 40460** remained running on loopback; no restart, environment switch, migration, feature activation, source confirmation, payment/date save, or standing change occurred. No other localhost schema, LAN or production connection was used.

## Remaining UI work

The existing payment-preview Escape focus issue still returns focus to the document body; the shared dialog was not changed. Evidence/correction forms retain their fuller required guidance and can receive a separate copy/layout review. Narrow tables intentionally scroll horizontally, and native selects can clip long choices while the full selected context remains shown below. Native 200% zoom/full assistive-technology acceptance is not certified. The existing Vite chunk-size warning remains.

**Stopped after this batch for user review.** The primary 5173 UI is updated; existing records and all business/financial behavior remain intact.
