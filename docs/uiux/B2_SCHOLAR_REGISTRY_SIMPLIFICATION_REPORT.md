# B2 — Scholar Registry and Add Scholar simplification

25 October 2026, Philippine time. **Presentation implemented and verified in an isolated candidate only. Free-text School/Course was stopped at the existing data-contract boundary. Primary 5173 is unchanged and has not been restarted or promoted.**

Review at [localhost:3019](http://127.0.0.1:3019/#scholars), using the existing copied account identities/passwords. Candidate: `C:/xampp/htdocs/ldss_b2_candidate_20261025`. Owned database: **`ldss_registry_ui_test_41756_ded913bd`**, runtime **`ldss_ru_41756_ded913bd@localhost`**, **65 migrations**. No application migration, permission, financial flag or academic/import ownership change was introduced.

## Baseline and UI changes

The accepted [B1 AP1 primary source](../requirements/B1_AP1_PRIMARY_UAT_PROMOTION_REPORT.md) was verified against its nine promoted hashes. A fresh checkpoint protects **1,265 existing main-workspace files**, the actual primary runtime/profile, schema/checksums, business data, accounts, grants and audit evidence. A fresh encrypted source backup passed isolated restore/constraint verification before the owned copy was populated. Copied sessions, reset tokens and rate limits were excluded. Keys and credentials remain restricted and are absent from the review archives. [Preflight](../../output/b2-registry-20261025/preflight.json), [recovery](../../output/b2-registry-20261025/backup.json).

- **Registry:** Add Scholar is the main header action. Name/ID search, Scholar status and B1 current/history access remain prominent. Secondary filters stay under More filters, with the active indication and a new Clear filters action that retains year and scholar-status scope.
- **Table:** full wrapped names lead each row, with the exact permanent ID beneath. School/year, classification, requirements, payout and existing actions remain. Short labels such as **On payroll** retain the original full accessible label and existing Details dialog; membership is never relabelled Paid. View/Receive keep their guarded handlers, with scholar-specific accessible action names.
- **Workflow separation:** Excel files and document/prior-approval actions form separate secondary groups. Registration hides the unrelated search/table/task controls. Existing command/dialog components and recovery formats remain; no prior approval is implied by saving a scholar.
- **Add Scholar:** labels are **Scholar Type**, **School (Optional)**, **Course (Optional)**, **Year Level**, **Registration Reference** and **Save Scholar**. First/middle/last/suffix, explicit initially unselected New/Continuing, identity review, source/reference and required reason remain. Longer definitions move to About registration; optional personal/contact details retain their disclosure.
- **Text:** malformed dash, ellipsis and separator sequences in annual registration/history were corrected. The affected historical-year option separator was corrected. No application-wide text rewrite was performed.

The LDSS green-and-white design, Continuing Roster and Graduation Monitoring tabs remain. B1 membership, metadata resolution, saved preferences, pagination, routes and selected-year profile context are unchanged.

## School/Course free text — not implemented

The requested office preference is understood: optional raw School/Course values, with abbreviations preserved. It cannot be represented safely by the current contracts:

| Inspected contract | Concrete obstacle |
|---|---|
| `server/scholars/annual-intake-validation.ts` | Initial placement is a strict object with nullable **UUID** `schoolId`/`courseId`; raw strings and extra label fields reject |
| `annual-intake-service.ts`; F36/F53 intake storage | Supplied placement uses reference foreign keys. `manual-intake/v1` JSON is server-built from validated facts; it is not a free-form extension field |
| `annual-intake-source.ts`; root/revision history | Effective placement and snapshot hashes project the reference IDs; revisions store the same ID fields. An unprojected JSON note would not provide a reliable school/course display or correction history |
| Academic model/service | Authoritative academic placement validates existing references separately. A supplied abbreviation cannot be promoted into that ownership |
| Excel import and A2.1 binding | Excel preserves original row values separately while resolving supported references. Reuse compares known manual placement and pins intake history. Raw manual labels require an explicit mapping/conflict rule before this handoff can claim compatibility |

Accordingly, this portion was stopped under the user's instruction to stop if it needs schema/ownership or material importer changes. **The selectors remain optional; there is no misleading free-text control, fake ID, automatic catalog entry, abbreviation expansion or approximate match.** Staff can leave an unavailable exact school/course blank and still register.

**Smallest safe follow-on proposal:** approve an intake-only model for nullable **original supplied school/course labels**, stored separately from authoritative IDs, with bounded text/control-character validation, exact spelling, append-only history and versioned snapshot/retry coverage. Preserve existing v1/import sources and hashes. Explicitly define how a later academic/import review maps or disputes those labels; never infer CNSC's expansion or course equivalence. This needs a focused additive storage/read/API and A2.1 mapping review before implementation. No new business permission is presumed. It is not part of the delivered B2 patch.

## Exact candidate file boundary

Four existing UI files and one new test file constitute the review package, entirely outside primary:

| Candidate path | Change |
|---|---|
| `src/ScholarsPage.tsx` | Header/action grouping, full-name/ID table, compact presentation, Clear filters and specific Receive names |
| `src/AnnualIntakePanel.tsx` | Registration labels/help/grouping and directly related encoding fixes; existing ID-based selectors retained |
| `src/RegistryEligibility.tsx` | Optional compact table labels and specific Details names; profile defaults and underlying source labels unchanged |
| `src/styles.css` | Scoped Registry/form spacing, wrapping, action sizing and intentional local table scrolling |
| `tests/registry-presentation.test.tsx` — new | Full-label preservation, payroll-membership versus Paid distinction, and strict deferred-text boundary |

All existing event-handler attributes in the three components remain: **37 / 60 / 3**. The only new handler clears secondary view filters. Registration and Registry command/hook bodies are unchanged after newline normalization. All backend, API, schema, configuration, permission, existing tests and command-storage code match the baseline. Candidate-only generated client files and the Apache access-denial isolation file are excluded from the source patch. [Source comparison](../../output/b2-registry-20261025/source-preservation.json), [exact hashes](../../output/b2-registry-20261025/candidate-files.json).

## Matched screenshots and accessibility

Final comparisons use the **same Coordinator, 1,002-person owned copy, working year, first page of 25, empty search, default status, closed help/filters, zero horizontal table scroll, default zoom and 900-pixel height**. The accepted B1 static client was replayed through browser-only static-asset interception against the same compatible real API for the final before captures. The after captures explicitly reloaded the new client. Initial baseline captures preceded the two registrations; the final matched captures replace them with the same 1,002-person state. No source or database was reverted for screenshots.

| CSS width | Registry before / after | Add Scholar before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/b2/before-registry-1440.png) / [After](../../output/playwright/b2/after-coordinator-registry-1440.png) | [Before](../../output/playwright/b2/before-registration-1440.png) / [After](../../output/playwright/b2/after-coordinator-registration-1440.png) |
| 1024 | [Before](../../output/playwright/b2/before-registry-1024.png) / [After](../../output/playwright/b2/after-coordinator-registry-1024.png) | [Before](../../output/playwright/b2/before-registration-1024.png) / [After](../../output/playwright/b2/after-coordinator-registration-1024.png) |
| 820 | [Before](../../output/playwright/b2/before-registry-820.png) / [After](../../output/playwright/b2/after-coordinator-registry-820.png) | [Before](../../output/playwright/b2/before-registration-820.png) / [After](../../output/playwright/b2/after-coordinator-registration-820.png) |
| 375 | [Before](../../output/playwright/b2/before-registry-375.png) / [After](../../output/playwright/b2/after-coordinator-registry-375.png) | [Before](../../output/playwright/b2/before-registration-375.png) / [After](../../output/playwright/b2/after-coordinator-registration-375.png) |
| 320 | [Before](../../output/playwright/b2/before-registry-320.png) / [After](../../output/playwright/b2/after-coordinator-registry-320.png) | [Before](../../output/playwright/b2/before-registration-320.png) / [After](../../output/playwright/b2/after-coordinator-registration-320.png) |

Roster top in document CSS pixels: **725→755 / 760→744 / 879→842 / 1,234→1,189 / 1,310→1,235**, in width order above. The first sampled row is **52→54 px**; long names now wrap instead of truncating. Explicit workflow grouping costs 30 pixels at desktop while the smaller widths improve. This is a clarity/readability change, not a claim that every row or viewport became shorter or that SQL became faster. [Matched measurements](../../output/b2-registry-20261025/matched-final.log).

Both Staff and Coordinator passed all five widths: no page-level overflow, visible **3-pixel** search/table/input focus, keyboard-local table scrolling and registration Cancel returning to Add Scholar. Escape from Payout details and Export restored their triggers; Coordinator's prior-approval dialog also restored focus. B1 entry still issued **one scoped list request**, with no all-year flash. Clear filters, current/history access and nullable manual discovery passed. Staff's prior-approval control remains absent and approved-import choice disabled; Coordinator's choice remains available and initially unchecked. Both test sessions were signed out.

[Coordinator layout/focus](../../output/b2-registry-20261025/after-coordinator.log), [Staff layout/focus](../../output/b2-registry-20261025/after-staff.log), [Staff filters/history/permissions](../../output/b2-registry-20261025/staff-finish.log), [Staff 320](../../output/playwright/b2/after-staff-registry-320.png). The ui-ux-pro-max and Playwright workflows were used. Native 200% zoom and full assistive-technology/WCAG acceptance are not certified.

## Registration and regression acceptance

The fictional packet was declared before commands. Staff saved **LDSS-2026-01001**, New; Coordinator saved **LDSS-2026-01002**, first-digital Continuing. Both have NULL school/course/year, truthful missing-field display and the original supplied references. Required empty classification/identity and short-reference checks prevented submission. Re-entering the Staff identity opened duplicate review and produced no second person without review.

Direct requests containing `schoolId:'CNSC'`, `courseId:'BSIT'`, or unsupported raw-label keys returned **422**. This demonstrates the preserved boundary, **not successful free-text support**. No abbreviation was normalized or discarded by a successful save. The copy has **1,002 people/intakes**, unchanged **1,000 academic records/entitlements/allocations**, and its original two payments. Business additions are the two declared identities and their registration receipts/audits; ordinary test authentication is additional. The ID sequence advanced by two. No automatic admission, academic approval, participation or financial record arose.

[Staff save/invalid/duplicate checks](../../output/b2-registry-20261025/staff-save.log), [saved New](../../output/playwright/b2/staff-saved-new.png), [duplicate review](../../output/playwright/b2/duplicate-review.png), [settled Coordinator result](../../output/b2-registry-20261025/coordinator-settled.log), [saved Continuing](../../output/playwright/b2/coordinator-saved-continuing.png).

| Final check | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run check:secrets` | **All exit 0; 114 files / 713 tests passed**. Complete normal candidate build; existing chunk-size warning remains |
| `npm run test:import-intake-bindings-db` | **Exit 0; 13 import groups plus A2.1 assertions**, including manual registration/reuse, original source pins, mixed imports, permissions, rollback/retry/concurrency and actual publication/historical integration |
| Existing academic / Registry / recording / reconciliation / financial-report drivers | **All five exit 0**, covering academic rules, R01/R07 parity, exact retry/atomicity, immutable Original/current evidence and full API/XLSX/PDF outputs |
| Fresh primary and candidate source previews | **798 / 200 accepted, zero conflicts**, matching payroll summaries and current original records |

[Final package exits](../../output/b2-registry-20261025/checks-main.json), [unit log](../../output/b2-registry-20261025/test-main.log), [import command](../../output/b2-registry-20261025/integration/results.json), [five DB commands/exits](../../output/b2-registry-20261025/regressions-registry-ui/results.json), [readiness/no-side-effects](../../output/b2-registry-20261025/readiness.json). DB mutation regressions used newly owned disposable schemas. No retained fixture was reset or migrated. The historical 62→63 annual-upgrade helper was not repointed; current registration/import integration is covered by the binding driver.

## Primary preservation and remaining limits

All **1,265 protected primary source/configuration/test/document/build files** match. The primary profile and actual loopback listener PIDs remain **29536 / 30132 / 48428**. All business data, definitions, migration checksums, accounts/password hashes/roles, runtime grants and **10,390 existing audit rows** match the fresh starting inventory. **No primary authentication event was added.** Only the existing `auth_sessions` checksum changed, with **20 rows before and after**, qualified as existing session activity; this task performed no primary login or business write.

Primary remains **1,000 scholars, 14 accounts, 1,000 entitlements/allocations and two Paid records dated 2026-10-24**. PAY-001 remains **2 Paid/798 Pending**, PAY-002 **200 Pending**, both `canRecord:true`. Copied original rows/audits also remain exact, including annual classifications, original Excel cells, A2.1 evidence, Masterlists, academic/standing history, frozen financial sources and payment dates. No backend or eligibility source was rewritten to make a test pass. [Preservation](../../output/b2-registry-20261025/preservation.json).

Free-text School/Course remains the explicit deferred portion. Narrow tables scroll locally; full selected names and IDs remain present. Native selects can clip long options. The roster still requires vertical scrolling, and the existing build warning remains. These are synthetic checks, not office/LAN acceptance.

Helper development encountered a path/CWD assertion, expected replacement of old generated assets, unsupported dynamic import in the CLI sandbox and an operator-only audit count attempted with the restricted runtime. Corrected helpers used supported static-file replay and the existing operator read connection; **no runtime grant was broadened**. A Coordinator assertion sampled the import control before its permissions finished loading; the successful registration was read back once, the settled permission was checked, and no second create was sent. Initial native-error log redirection was replaced by an explicit exit-code runner. No application validation or accepted financial safeguard was weakened.

## Review package and proposed primary promotion

[Five-file hashes](../../output/b2-registry-20261025/candidate-files.json), [candidate patch](../../output/b2-registry-20261025/B2_CANDIDATE.patch), [source archive](../../output/b2-registry-20261025/candidate-source.zip), [compatible build](../../output/b2-registry-20261025/compatible-build.zip). Archives exclude credentials, keys and `.env`. `git apply --check` passed against the actual primary baseline; **the patch was not applied**. Restart the owned candidate from its directory with `node --import tsx output/b2-registry-20261025/serve.ts`; it performs no migration/reset.

After separate authorization for the **presentation-only package**:

1. Recheck exact primary profile/runtime/listeners, schema 65, current files and reviewed five-file hashes. Review later changes and preserve all then-current transactions, rather than assuming this report's two-payment checkpoint remains current.
2. Take fresh file/data/account/grant/frozen-source inventories and an appropriate current recovery checkpoint. Do not transfer the two candidate people, credentials or task fixtures.
3. Promote only the reviewed UI/test package during coordinated frontend/build maintenance. No SQL, grant, permission, financial flag or environment change is needed. Preserve older retained static artifacts.
4. Check both roles, current/history, filters/profiles, form validation/focus and existing financial-source preservation read-only on primary. Keep registration saves in owned copies unless primary examples receive separate authorization.
5. Roll back presentation to the saved **65-compatible B1** UI/source if necessary, preserving unrelated later edits. No database restore, schema downgrade or deletion of any source/history is appropriate.

**Stopped after isolated B2 presentation implementation, verification and this report.** No primary promotion/restart, free-text storage change, Dashboard, A4, financial policy, LAN/production operation or unrelated enhancement was performed.
