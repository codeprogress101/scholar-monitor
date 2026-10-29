# LDSS UI/UX visual review

Date: **23 October 2026, Philippine time**. **Initial visual assessment complete. No fixes implemented.** Evidence: 167 named screens/subviews, 173 role/state views and 527 selected PNGs. Read with the [screen inventory](LDSS_COMPLETE_UI_SCREENSHOT_INVENTORY.md), especially its conditional coverage gaps. This is neither a security audit nor production/office acceptance.

## Method and positive observations

Applied existing `ui-ux-pro-max` textual guidance to hierarchy, forms, tables, labels, states and responsive presentation. Explicitly applied `vercel-react-best-practices` only to existing React frontend rendering/request observations; no server caching recommendation, new library, framework change or automatic remediation was applied. Existing Playwright infrastructure drove a fresh named Chrome profile against owned loopback fixtures. No skill directory or installed helper was changed.

The LDSS green/cream identity is coherent across sign-in, navigation, cards and primary actions. Active navigation combines text with a selected background; financial states use explicit labels. Searchable queues, paged tables, role explanations, disclosure panels and optional details help keep the core task visible. Historical approval clearly states that missing grades/dates are not invented. DV drafts visibly say they await office approval. Omitted routing explains the payroll-first option and the later Coordinator decision. Payment previews show exact counts/amounts and initially unchecked receipt/review confirmations. Original Unclaimed and later individual Paid remain separate in the captured history/report views. These are observed UI properties, not a rerun of every financial invariant.

## Confirmed visual issues

| ID | Observed issue / evidence | Effect and proposed review direction | Qualification |
|---|---|---|---|
| V01 | Global Operational Reports repeats “Reports” as outer and inner page headings. [Administrator restriction example](../../output/uiux-system-review/screenshots/10-reports/reports-access-restriction-system-admin-desktop-permission-restriction.png) and [authorized Operational Reports](../../output/uiux-system-review/screenshots/10-reports/operational-reports-staff-desktop-populated.png) | Competing page hierarchy and redundant introduction. Consider one workspace heading and a clearly subordinate selected-report title. | Confirmed presentation duplication at both requested widths; not by itself an accessibility violation. |
| V02 | In the tablet standing-request form, three fields share the narrow content area; the Reason category selected placeholder is visibly truncated. [Full form](../../output/uiux-system-review/screenshots/06-eligibility/standing-change-request-coordinator-desktop-form-full.png) | Inspect container-width-based stacking and input sizing while keeping labels/options complete. | Minor visual constraint; label remains visible and no lost option/failed submission is established. |

No application page-level horizontal overflow was detected in the measured ordinary workspace captures. The sole measured exception is the intentionally fixed landscape official print form: tablet document width **1268 px** at **820 px** viewport. **46** viewport observations had a table wider than its immediate container; these are scroll affordances, not 46 unique defects. Mask bars and sticky-sidebar full-page artifacts are documented capture effects, not visual bugs.

## Usability preferences and candidates for validation

| Area | Observation | Potential improvement to evaluate; not authorization to change |
|---|---|---|
| Navigation | Payroll and Individual Payments are reachable through both the sidebar and payroll workspace links. | Test whether users understand these as the same workspace and retain selected context; avoid hiding either route without evidence. |
| Hierarchy / scrolling | Payroll and profile screens repeat workspace, selected-record and section headings. In long forms, the actual command can be below the first viewport; full-page links show it. | Reduce repeated introductory spacing or add a contextual jump link. Preserve legal explanations and complete financial evidence. |
| Labels | “Save payout cycle command”, “Confirm processing action” and “Close status command” coexist with plain “Prepare Documents” and “Mark Paid”. | Review action-specific, routine Staff wording. Confirmation, concurrency and retry safeguards must remain intact. |
| Tablet density | The persistent sidebar leaves a narrow work area; table scrolling is intentional and some screens already give sideways-scroll hints. | Evaluate a user-controlled compact navigation mode and consistent scroll hints. Keep all names, amounts, action columns and access to full records. |
| Typography / spacing | Small help text, dense historical lists and repeated bordered cards create a large scan burden. | Test text size, grouping and compact spacing with actual Staff tasks; no font-size/contrast failure is asserted without measurement. |
| Empty / blocked states | No annual qualification, missing reset token, calendar source-change and unprocessed payment restrictions are truthful, distinct states. | Keep the actionable reason prominent and test whether the next authorized action is understandable. Do not convert genuine blockers into loading indicators or eligibility exceptions. |
| Search / context | The same synthetic browser retains a Registry search across fixture reloads; clearing it restores imported rows. | Consider visibility of retained filters/clear controls. This harness observation is not an account-isolation or caching vulnerability finding. |
| Status | Active standing and “Selected for masterlist preparation” can coexist because they describe different authority stages. | Test wording/context with users while preserving both distinct facts and authoritative eligibility checks. |

## Accessibility and interaction limits

Visible labels, explicit status text, native inputs and Enter search are present. Existing `FocusedDialog.tsx` supplies a titled native dialog/focus handling; source inspection is not proof that every modal meets every assistive-technology requirement. No missing-label conclusion is drawn from a capture-harness locator failure. Full keyboard journeys, screen readers, contrast ratios, target-size metrics, reduced motion, real touch hardware, 400% zoom and browsers other than Chrome remain unverified. The required desktop/tablet screenshots do not establish WCAG compliance.

## Observed frontend request behavior and timing

| Observed flow | Action-to-settle ms | API responses | Decoded body bytes | Conditions |
|---|---:|---:|---:|---|
| Home (Staff) | 890 | 8 | 9,797 | Initial Home; no selected cycle |
| Processed payroll (Staff) | 76 | 6 | 19,075 | Warm in-app selected payroll |
| Payment recording (Staff) | 54 | 2 | 969 | Warm in-app Payment Recording |
| Registry search (Staff) | 86 | 6 | 5,902 | Enter search, one matching synthetic scholar |
| Omitted queue (Staff) | 650 | 10 | 3,364 | Fresh document Omitted queue |
| Finalized payroll — pending payment recording restriction (Staff) | 667 | 11 | 11,066 | Fresh document; finalized, not yet Processed |
| Imported registry (Coordinator) | 743 | 16 | 42,706 | Fresh document plus clearing retained search; 19 profiles |

These are **single observations**, not medians, before/after benchmarks, paint timings or production latency targets. Early captures used warm hash navigation; later captures force a fresh document. Action clocks include the helper's load/font/two-frame settle where applicable; request observations can continue through desktop screenshot capture, so they are not the identical timing window. Search typing is excluded when the clock was reset before Enter. API body sizes are decoded response bytes, not compressed wire transfer, and no SQL/CPU/heap profiler was run. Fixture cohorts are small (up to 19 profiles), not the real 835 scholars. Deliberately held/injected loading/error examples are excluded. These results neither reproduce nor disprove P10's previously reported full-cohort costs.

The fresh Home observation includes **two GET responses from `/api/v1/me/permissions`**; the finalized Payment Recording navigation also includes two. `src/App.tsx` and `src/DashboardPage.tsx` each load that permission endpoint. This confirms repeated frontend access reads in these flows. Whether consolidating them is worthwhile, and how fresh authorization/revocation would be preserved, requires separately approved work. No request or authorization check was removed. Repeated `/scholars/:id` or eligibility paths elsewhere are **not** automatically classified as redundant: IDs/query strings are redacted/omitted by the observer and different scopes may be necessary.

The largest decoded API body among the selected recorded desktop observations was **64,784 bytes**, from the **three-member candidate-section** response; the observer recorded **141 ms** for that response. Full metadata is in [performance-observations.json](../../output/uiux-system-review/performance-observations.json). This is not a full-cohort payload benchmark. No new prolonged loading defect or optimization benefit is established from these small synthetic captures. Render waterfalls, React commit counts and memory-retention attribution need dedicated profiling rather than screenshot timing alone.

## Execution problems and unverified boundaries

Capture-harness errors included overly broad/mismatched labels, repeated “View event” buttons, substring matching the wrong payroll disclosure, attempts to activate disabled pre-Processed controls and a before-unload prompt after immediate navigation from successful setup. Where relevant, selectors were corrected and actual saved images reviewed; no application code was changed. The before-unload observation needs ordinary-operator reproduction before calling it a product defect. The genuine calendar-source invalidation remains a documented blocker. Several interrupted batches saved their images before a later selector error; their saved capture metadata was recovered. Four omitted-cancellation views have inspected images but no reconstructed timing values. The browser tool blocked direct `file:` access to the delivery index; the identical index was tested on an allowlisted loopback static server instead. Its first server run returned a missing favicon 404; a self-contained empty favicon was added to this documentation artifact. No application failure was inferred from either packaging-tool issue.

Coverage is intentionally honest: pending admission decisions, actionable new deferrals/reprocessing, legacy conversion variants, valid-token reset, browser account provisioning (not present), next-year creation behind calendar closure, exhaustive rejection/conflict paths, screen-reader behavior and full-volume performance are not certified here. This task did not run the full UAT/lint/TypeScript/build gate or official Word/PDF render verification. It preserved their accepted source/build/migration fingerprints and did not claim screenshot collection as those tests.

## Privacy, preservation and delivery

Every operational example uses fictional records in disposable databases. Internal identifiers are masked; no password, cookie, CSRF value, environment file, DB backup, raw response body or real scholar/payment record is included in the sharing archive. Public form branding/labels are retained. Private scripts/logs/session material and unrelated QA archives are excluded by an explicit package allowlist. No external scanner received LDSS data.

The final snapshot confirms **zero changes in all 138 development tables**, unchanged earlier audit rows/definitions, **683 accepted source inputs**, **261 build artifacts**, **62 migrations**, original schemas/accounts/configuration/disabled flags and **384 existing skill files**. Owned fixture schemas/accounts and the named screenshot browser were removed/closed normally. No user browser or external session was closed. See [preservation summary](../../output/uiux-system-review/preservation-summary.json).

Open [index.html](../../output/uiux-system-review/index.html) after extracting `LDSS_UI_UX_SCREENSHOTS.zip`. Full-resolution screenshots, all contact sheets, CSV inventory and SHA-256 manifests are included. Numbered ZIP parts group complete modules and each contain their own manifest; extracting all parts into one folder restores the same index paths. The exact archive sizes/checksums are recorded separately in `DELIVERY_SUMMARY.md` beside the ZIP files; that external delivery receipt is intentionally outside the archives. No generated screenshot was committed.

**Stop: documentation and collection only. No remediation, redesign, Q104 questionnaire, P11 or deployment.**
