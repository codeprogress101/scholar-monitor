# B3a — Payment Recording composition

24 October 2026, Philippine time. **B3a implemented and verified; stopped after this batch.** One primary Payment Recording title, compact batch context and smaller navigation/spacing bring the existing roster higher. No financial command, policy, permission, schema or feature configuration changed. No LAN connection, deployment or P11 work was performed.

Scope follows the [phased plan](../requirements/LDSS_PHASED_IMPLEMENTATION_PLAN.md), [B3 backlog](../requirements/LDSS_INTEGRATED_ENHANCEMENT_BACKLOG.md), [UI/UX plan](LDSS_INTEGRATED_UI_UX_SIMPLIFICATION_PLAN.md) and the verified guide at `C:/Users/ADMIN/Downloads/LDSS_CODEX_UI_UX_GUIDE.md`. The local ui-ux-pro-max and Playwright skills were used. Other enhancement batches remain unstarted.

## Files and layout changes

| File | B3a change |
|---|---|
| [PayoutCyclesPage.tsx](../../src/PayoutCyclesPage.tsx) | Recording-context primary title becomes **Payment Recording**; suppress the unrelated candidate-preparation introduction. Keep setup disclosures and its Refresh handler; label it **Refresh payroll setup**. |
| [OvrDrafts.tsx](../../src/OvrDrafts.tsx) | Replace the redundant selected-payroll heading/instruction with a compact **Back to Payroll Batches** text control and **Refresh batch**. Show one semantic context list: reference/name, academic year, semester and current payroll status. Remove the repeated batch heading/count in recording view. Other workspace views retain their existing composition. |
| [PaymentRecording.tsx](../../src/PaymentRecording.tsx) | Remove the nested Payment Recording heading and repeated batch/year/semester paragraph; retain the named recording section, summary, notices and every command control. |
| [styles.css](../../src/styles.css) | Scoped recording spacing, an intrinsic-width Back control with visible focus, wrapping context and a denser responsive summary grid. Preserve dark green colors, readable controls and normal document scrolling. |

These are the only four application files changed from this task's dirty-worktree baseline. The normal build also replaced generated client artifacts. No dependency/configuration, backend, test fixture helper, migration or financial-service file changed. Existing command components and keys remain in place. There is no sticky toolbar or toolbar/state rewrite.

Back remains a button styled as an underlined text link so it uses the existing selection/navigation callback, pending-command guard and disabled condition. It does not introduce an unguarded URL shortcut.

## Matched screenshots and measured position

Both payrolls were captured as the same synthetic Staff account on **3011**, with their original 800/200 Pending state, first page of 25 scholars, empty search, no selection and closed setup disclosures. Viewports were **1440 × 900, 1024 × 900 and 820 × 900 CSS pixels**, at default browser zoom. Screenshots are full-page captures. Top positions below are rounded document coordinates (`getBoundingClientRect().top + scrollY`), measured against the same page origin.

| Width | Summary top, before → after | Roster top, before → after | Roster raised |
|---|---:|---:|---:|
| 1440 | 819 → 552 | 1,324 → 955 | **369 px** |
| 1024 | 863 → 596 | 1,368 → 1,053 | **315 px** |
| 820 | 882 → 666 | 1,497 → 1,124 | **373 px** |

Both batches produced these same top positions. The roster is closer to entry but still requires vertical scrolling in a 900-pixel-high viewport. This is a layout improvement, not a claim of faster SQL/API execution or a guarantee that the roster fits above every fold.

| Payroll / width | Before | After |
|---|---|---|
| PAY-001 / 1440 | [Before](../../output/playwright/b3a/before-batch1-1440.png) | [After](../../output/playwright/b3a/after-batch1-1440.png) |
| PAY-001 / 1024 | [Before](../../output/playwright/b3a/before-batch1-1024.png) | [After](../../output/playwright/b3a/after-batch1-1024.png) |
| PAY-001 / 820 | [Before](../../output/playwright/b3a/before-batch1-820.png) | [After](../../output/playwright/b3a/after-batch1-820.png) |
| PAY-002 / 1440 | [Before](../../output/playwright/b3a/before-batch2-1440.png) | [After](../../output/playwright/b3a/after-batch2-1440.png) |
| PAY-002 / 1024 | [Before](../../output/playwright/b3a/before-batch2-1024.png) | [After](../../output/playwright/b3a/after-batch2-1024.png) |
| PAY-002 / 820 | [Before](../../output/playwright/b3a/before-batch2-820.png) | [After](../../output/playwright/b3a/after-batch2-820.png) |

The rebuilt bundle was explicitly reloaded before final after captures; changing only a URL hash did not load the new bundle. [Structured browser evidence](../../output/b3a-payment-recording-20261024/browser-evidence.json) contains all six comparisons and interaction results.

## Controls and workflows preserved

- **Refresh payroll setup**, **Refresh batch** and **Refresh payments** retain their distinct handlers and invalidation scopes. Submission-window and other disclosed Refresh actions also remain; no Refresh was merged or removed.
- Search, pagination, exact scholar IDs, cross-page selection and selected-scholar review remain. Browser checks selected scholars on separate pages, searched a selected ID and confirmed both remained in the two-person review.
- Actual Payment Date, additional reference/note fields, Mark All Remaining Paid, Mark Paid, Mark Unclaimed, counts and full amounts remain. Paid review still starts with both required acknowledgments unchecked; Unclaimed retains its distinct confirmation. No new filter or action was added.
- Setup and semester-document disclosures remain accessible. Payroll workspace navigation still reaches batch details, history, corrections, Individual Payments and reports. Verify Returned Payroll reaches the existing Review Payments/reconciliation view. Original evidence and closure logic were not edited.
- Browser fault interception blocked the initial commit **before it reached the server**. The exact key/payload was saved, route changes were blocked and Back was disabled. After reload the recovery control and lock returned; the intercepted retry matched the saved key/payload. A simulated definitive `PAYMENT_REVIEW_CHANGED` response released the lock. No retained-fixture financial commit occurred. This browser simulation is separate from the real mutation/retry tests in disposable schemas.
- Recording entry fetched the selected summary, payment summary and bounded payment roster; no eager complete-detail request was observed. No data reader or performance limit changed.

PaymentRecording's hooks and command code before its JSX return are **byte-identical** to the starting copy. AST comparisons also found the same unique event-handler attributes in all three changed components, including the guarded Back handler reused in the new conditional composition. [Source preservation evidence](../../output/b3a-payment-recording-20261024/source-preservation.json).

Keyboard checks confirmed Back's 3-pixel visible focus outline, logical Tab order to Refresh batch, table-region/row keyboard access and a focused first-row checkbox visible after native scrolling at all three widths. No page-level horizontal overflow was observed at those widths. [Focus/scroll evidence](../../output/b3a-payment-recording-20261024/focus-scroll.log), [820-pixel focused roster](../../output/playwright/b3a/roster-focus-820.png), [uncertain request](../../output/playwright/b3a/uncertain-request.png).

## Verification

Every command below exited **0**. Existing package commands and disposable financial drivers were used; no rule, check or safety limit was disabled.

| Check | Result / evidence |
|---|---|
| Focused recording/workspace/detail/reconciliation/correction/conflict suites | **7 files, 59 tests passed.** [Log](../../output/b3a-payment-recording-20261024/focused-tests.log). |
| `npm run lint` | Zero errors/warnings. [Log](../../output/b3a-payment-recording-20261024/lint.log). |
| `npm run typecheck` | All configured TypeScript projects passed. [Log](../../output/b3a-payment-recording-20261024/typecheck.log). |
| `npm run build` | Complete normal build passed. Existing Vite chunk-size warning remains. [Log](../../output/b3a-payment-recording-20261024/build.log). |
| `npm test` | **98 files, 603 tests passed.** [Log](../../output/b3a-payment-recording-20261024/tests.log). |
| `npm run check:secrets` | Passed; 1,176 source/build files checked. [Log](../../output/b3a-payment-recording-20261024/secrets.log). |
| `npm run test:payment-recording-db` | Four isolated scenarios; exact retry/recovery, stale review, accepted-set conflicts, concurrent one-winner, role/date/period safeguards and existing full-detail compatibility passed. [Log](../../output/b3a-payment-recording-20261024/payment-recording-db.log). |
| `npm run test:payroll-reconciliation-db` | Both normal and override branches passed, 12 scenarios each; discrepancy/closure rules, audit rollback, races and immutable Original/current distinctions covered. [Log](../../output/b3a-payment-recording-20261024/payroll-reconciliation-db.log). |
| `npm run test:payroll-reconciliation-volume-db` | All 13 import scenario groups passed, including **835 scholars: ten Unclaimed, reviewed remaining 825 Paid**, exact lost-response retry, atomic rollback and 835-member reconciliation. [Log](../../output/b3a-payment-recording-20261024/volume-db.log). |
| Browser, 3011 and 3012 | Matched layouts; selection/review/navigation/recovery checks above. 3012 recording retained 198 Pending/two Unclaimed in PAY-002 and still reached Individual Payments. [Demo recording](../../output/playwright/b3a/demo-3012-recording.png), [Individual Payments](../../output/playwright/b3a/demo-3012-individual.png). |

Financial-driver artifacts were isolated with `LDSS_P02_OUTPUT` and `LDSS_P03_OUTPUT` under this task's output directory. Their mutation scenarios used owned disposable test schemas; retained environments were not reset or used for outcome commits. Instrumentation emitted by the existing volume driver is regression evidence, not a new optimization or capacity claim. [Command summary](../../output/b3a-payment-recording-20261024/verification-summary.json).

## Preservation

Starting and final read-only snapshots compared **11 retained schemas**: development, A–F, V1, V2, the 3011 historical fixture and the 3012 demonstration copy. **All business table data, definitions, counts and existing grants matched.** This includes setup/source/publication records, frozen payrolls, entitlements, allocations, payment records, individual-payment history and closure evidence.

The only differences were expected authentication activity from one Staff browser login in each of 3011 and 3012: one appended `auth.login` audit and session per environment, plus rate-limit updates. All pre-existing audit rows matched exactly. Database preservation is therefore business-data/definition/grant preservation, not a claim of zero authentication writes. [Before](../../output/b3a-payment-recording-20261024/database-before.json), [after](../../output/b3a-payment-recording-20261024/database-after.json), [qualified preservation result](../../output/b3a-payment-recording-20261024/preservation.json).

Read-only authoritative summaries reconfirmed:

| Environment | PAY-001 | PAY-002 | Financial records |
|---|---|---|---|
| 3011 | 800 Pending; `canRecord:true` | 200 Pending; `canRecord:true` | Zero payment records |
| 3012 | 798 Pending/two Unclaimed; `canRecord:true` | 198 Pending/two Unclaimed; `canRecord:true` | Existing seven payment records: four payroll Unclaimed plus three later individual Paid |

[Readiness evidence](../../output/b3a-payment-recording-20261024/readiness.json). Neither server was listening initially; both were started with their already configured `local-individual-uat.ts` launchers, bound to 127.0.0.1 on their existing ports. Their established fixture flags were reused unchanged. `.env`, application configuration, schemas, migrations, backend financial behavior and runtime grants remain unchanged.

Of 1,104 starting source/test/helper/schema/configuration/documentation/build inputs, 1,091 matched unchanged. Differences comprise the four declared application files and nine changed/replaced generated build inputs. No existing report was rewritten. No LAN operation, retained-fixture reset, permission change or new financial activation occurred.

## Remaining issues and stop point

- Escape closes a payment preview, but focus returned to the document body in this browser check. The existing preview flow disables its trigger during preparation, and the shared dialog focus implementation is unchanged. Automatic trigger restoration needs a separately scoped correction; B3a does not claim it passed. Back/navigation focus checks passed.
- The existing narrow table wraps some identifiers/outcome text at 820 pixels. Full values remain present. The shell/workspace navigation and financial action arrangement are retained; B3a does not perform B6 or a toolbar redesign.
- Multiple Refresh controls remain intentionally scoped. The roster still needs some scrolling, and the build retains its existing chunk-size warning. No WCAG certification, broad office acceptance or performance improvement beyond measured layout position is claimed.
- Exploratory browser assertions initially targeted the wrong individual-page heading and sampled scrolling before it settled; the corrected checks use the actual heading and await focused-row visibility. The first demonstration readiness assertion counted only payroll payment rows; it was corrected to include the three existing individual Paid rows. These were test assumptions, not application or data fixes.

**Stopped after B3a, verification and this report.** Financial commands, dates, acknowledgments, accepted sets, retries, finalization, reconciliation, Original evidence, authorization, CSRF, audit, transactions, historical multi-batch and Individual Payments remain unchanged. No other enhancement batch has started.
