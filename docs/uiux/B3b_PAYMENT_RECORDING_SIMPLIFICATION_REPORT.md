# B3b — Payment Recording simplification

24 October 2026, Philippine time. **Implemented after AP5 passed; both tasks are complete.** Payment Recording has a compact summary, earlier search and roster, grouped actions and name-first rows. Financial command code and state remain unchanged. The primary retains the user's **two Paid records**, their dates and evidence.

Authorization: the current AP5/B3b request, accepted [B3a](B3a_PAYMENT_RECORDING_UI_REPORT.md), and verified `C:/Users/ADMIN/Downloads/LDSS_CODEX_UI_UX_GUIDE.md`. The local ui-ux-pro-max and Playwright skills were used. The supplied attachment contained the written screenshot requirements; fresh captures of the actual primary supplied the matched baseline. [AP5's sequential acceptance gate](../../output/ap5-b3b-20261024/ap5-acceptance.json) passed before any B3b edit.

## Files and layout

| File | Presentation change |
|---|---|
| [PayoutCyclesPage.tsx](../../src/PayoutCyclesPage.tsx) | Keep one Payment Recording title; place setup/administration and semester-document disclosures below the recording workspace. Refresh payroll setup remains inside its disclosure. Ordinary workspace order/header refresh are retained |
| [OvrDrafts.tsx](../../src/OvrDrafts.tsx) | Retain guarded Back, Refresh batch and selected context. Remove the redundant current-task Record Payments / Review Payments button row in recording view; reconciliation remains reachable through Verify Returned Payroll and workspace navigation |
| [PaymentRecording.tsx](../../src/PaymentRecording.tsx) | Five compact count/amount groups; search before grouped date/outcome actions; selection count beside actions; less prominent Mark All Remaining Paid; name above exact permanent ID; school retained; right-aligned amounts; review/refresh below roster; explicit horizontal-scroll help |
| [styles.css](../../src/styles.css) | Scoped compact spacing, responsive summary/actions, readable rows and selected state. Intentional 850-pixel table with local scrolling; visible focus and scroll margins. No sticky element |

All amounts remain available with explicit labels: Approved total, Paid amount, Unclaimed value and Pending amount. Needs resolution remains a visible count with its existing warning when nonzero. Current blockers, complete-recording instructions, error/recovery notices and unavailable-period explanations remain visible. Paid and Unclaimed retain separate reviewed actions; Mark All Remaining Paid uses an outline style and still requires its original review.

The hooks/command code before PaymentRecording's JSX return are **byte-identical** to the B3b starting copy. All pre-existing unique event-handler expressions in the three components match. The sole new handler is local table `onFocusCapture`, which scrolls a focused row control into view without touching selection or command state. Component keys, requests/effect dependencies, payloads, idempotency, invalidation and backend APIs are unchanged. [Source comparison](../../output/ap5-b3b-20261024/source-preservation.json).

## Matched captures and measurements

Before/after captures use **the same synthetic Staff account, primary database, batch, first page of 25, empty search, zero selection, closed setup disclosures, default zoom and 900-pixel viewport height**. PAY-001 is 2 Paid/798 Pending; PAY-002 is 200 Pending throughout. No outcome was reset for screenshots.

Positions are rounded document coordinates. Both batches give the same positions.

| CSS width | Summary before → after | Search before → after | Roster before → after | Roster raised |
|---|---:|---:|---:|---:|
| 1440 | 552 → 330 | 844 → 435 | 955 → 650 | **305 px** |
| 1024 | 596 → 374 | 943 → 499 | 1,053 → 760 | **293 px** |
| 820 | 666 → 419 | 1,013 → 644 | 1,124 → 906 | **218 px** |
| 375 | 792 → 497 | 1,345 → 783 | 1,456 → 1,178 | **278 px** |
| 320 | 945 → 558 | 1,568 → 844 | 1,679 → 1,289 | **390 px** |

| View | Before | After |
|---|---|---|
| PAY-001 / 1440 | [Before](../../output/playwright/b3b/before-batch1-1440.png) | [After](../../output/playwright/b3b/after-batch1-1440.png) |
| PAY-001 / 1024 | [Before](../../output/playwright/b3b/before-batch1-1024.png) | [After](../../output/playwright/b3b/after-batch1-1024.png) |
| PAY-001 / 820 | [Before](../../output/playwright/b3b/before-batch1-820.png) | [After](../../output/playwright/b3b/after-batch1-820.png) |
| PAY-001 / 375 | [Before](../../output/playwright/b3b/before-batch1-375.png) | [After](../../output/playwright/b3b/after-batch1-375.png) |
| PAY-001 / 320 | [Before](../../output/playwright/b3b/before-batch1-320.png) | [After](../../output/playwright/b3b/after-batch1-320.png) |
| PAY-002 / 1440 | [Before](../../output/playwright/b3b/before-batch2-1440.png) | [After](../../output/playwright/b3b/after-batch2-1440.png) |
| PAY-002 / 1024 | [Before](../../output/playwright/b3b/before-batch2-1024.png) | [After](../../output/playwright/b3b/after-batch2-1024.png) |
| PAY-002 / 820 | [Before](../../output/playwright/b3b/before-batch2-820.png) | [After](../../output/playwright/b3b/after-batch2-820.png) |
| PAY-002 / 375 | [Before](../../output/playwright/b3b/before-batch2-375.png) | [After](../../output/playwright/b3b/after-batch2-375.png) |
| PAY-002 / 320 | [Before](../../output/playwright/b3b/before-batch2-320.png) | [After](../../output/playwright/b3b/after-batch2-320.png) |

B3a already left one primary title and no unnecessary repeated visible heading; those counts remain **one / zero**. B3b removes redundant task buttons and introductory copy, rather than claiming another heading reduction. Raw geometry sampling sometimes included headings inside closed setup details; those hidden headings are excluded from this visible-heading statement. [Before measurements/requests](../../output/ap5-b3b-20261024/browser-before.log), [after measurements/requests](../../output/ap5-b3b-20261024/browser-after.log).

Recording entry still uses selected summary, payment summary and bounded 25-row roster reads. No eager complete-detail read was observed. Development-mode duplicate reads were present; initial-shell versus already-loaded navigation request counts are not presented as comparable timing samples. Request effects and refresh handlers are unchanged. No SQL/API speed improvement is claimed from reduced spacing.

## Controls, accessibility and recovery

- Staff and Coordinator passed selection across pages and ID search, exact two-person Paid review, initially unchecked receipt/review acknowledgments, separate Unclaimed review, Back and reconciliation navigation, and access to payroll history/corrections.
- All three distinct refresh handlers remain: **Refresh batch** beside context, **Refresh payments** below the roster, **Refresh payroll setup** inside setup. None was merged or removed. Setup remains mounted as normal JSX; no new eager read or state-storage format was introduced.
- The two existing Paid rows remain visible with their actual dates and existing date-correction action; their selection checkboxes remain disabled by the original outcome rule. No date correction was saved.
- Payment preview Escape closes the dialog. Its existing disabled-trigger focus issue still returns focus to BODY; this batch does not change the shared dialog or claim restoration passed.
- A simulated failed commit was intercepted **before reaching the server**. The exact key/body survived reload; Back and route changes stayed locked; the intercepted retry matched exactly. A simulated definitive `PAYMENT_REVIEW_CHANGED` released the lock. No financial request was committed to the primary.
- At all five widths, Back → Refresh batch and Search input → Search button follow native keyboard order. Table focus can reach right-hand date-correction actions with a **3-pixel outline**, full viewport visibility and no page overflow. At 1024/820/375/320, the roster scrolls horizontally to keep that action visible. The local focus handler and 8-pixel scroll margin address clipping found during testing.

Evidence: [Staff controls](../../output/ap5-b3b-20261024/browser-controls.log), [Coordinator controls](../../output/ap5-b3b-20261024/coordinator-controls.log), [intercepted uncertain request](../../output/ap5-b3b-20261024/uncertain-start.log), [reload/exact retry](../../output/ap5-b3b-20261024/uncertain-retry.log), [focus results](../../output/ap5-b3b-20261024/focus.log), [focused 320 view](../../output/playwright/b3b/focus-320.png).

## Final verification

| Check | Result |
|---|---|
| `npm run lint` | Exit 0, zero errors/warnings |
| `npm run typecheck` | Exit 0, all projects |
| `npm run build` | Exit 0, normal complete command; existing Vite chunk-size warning remains |
| `npm test` | Exit 0, **107 files / 686 tests** |
| `npm run check:secrets` | Exit 0 |
| Focused recording/workspace/detail/reconciliation/correction/conflict tests | **7 files / 59 tests**, exit 0 |
| Final recording, reconciliation, financial reports and individual-settlement DB drivers | All exit 0; exact retry/conflict/atomicity, both reconciliation branches, immutable Original/current reports, settlement/correction races and complete API/XLSX/PDF outputs |
| AP5 broad regression matrix | Twelve DB suites passed before B3b; financial/backend implementations unchanged by B3b |
| Integrity and grants | 372 foreign-key groups, zero orphans/duplicate entitlements; new tables immutable; runtime UPDATE/DELETE/cross-schema denied |

[Final five commands](../../output/ap5-b3b-20261024/verified/results.json), [focused test log](../../output/ap5-b3b-20261024/focused-tests.log), [final financial drivers](../../output/ap5-b3b-20261024/regressions-bthree-final/results.json), [AP5 regressions](../../output/ap5-b3b-20261024/regressions-apfive/results.json), [integrity](../../output/ap5-b3b-20261024/integrity.json).

All state-changing financial scenarios used owned disposable schemas. Existing output guards remained; reports were isolated under task-specific directories. The primary's browser tests used reads/previews/cancelled drafts and intercepted commits. Existing `.env`, financial flags, accounts/passwords, standing, membership, academic sources, frozen payrolls and payment records remain preserved under the separate AP5 schema change. [All-schema comparison](../../output/ap5-b3b-20261024/preservation-final.json), [final primary comparison](../../output/ap5-b3b-20261024/preservation-completed.json), [final authoritative summaries](../../output/ap5-b3b-20261024/readiness-completed.json).

## Remaining limits and stop

The narrow roster intentionally scrolls horizontally; full names and IDs remain in its cells, rather than being truncated or replaced. It still requires vertical scrolling on tablet/small screens; summary amounts wrap into readable lines. Verification/reconciliation and payments Refresh follow the 25-row page, while setup/documents remain below them. Exact 200% native zoom, full assistive-technology acceptance and WCAG certification are not claimed. The existing preview-focus issue and build chunk warning remain explicit.

No backend performance remediation, financial-policy/API change, new permission, migration or feature activation was introduced by B3b. AP5's approved additive schema/permission/graduation activation is reported separately. No retained fixture reset, LAN deployment, automatic graduation, primary payment commit, A2/A4/B1/B2/P11 or unrelated batch occurred.

**Stopped after AP5 and B3b, verification and these two reports.** The same synthetic primary remains running at 5173 with PAY-001 2 Paid/798 Pending and PAY-002 200 Pending, both recordable.
