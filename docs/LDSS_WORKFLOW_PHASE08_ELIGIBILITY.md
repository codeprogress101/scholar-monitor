# Phase 08 - Semester eligibility and entitlements

Date: 2026-10-07  
Status: In progress. First increment delivers a read-only eligibility preview; entitlement creation remains disabled. Human acceptance is pending.

Scheduling update: this report preserves the first increment's delivery evidence. The [single workflow tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md) now orders the remaining work as A -> B1 -> B2 -> C; its schedule supersedes the original entitlement-only next-step paragraph below. [Checkpoint A delivery](LDSS_WORKFLOW_PHASE08_WINDOWS.md) records the later submission-window increment.

## Delivered first increment

In **Scholar registry -> Receive requirements -> Academic compliance**, expand **Payout readiness (preview)** and select **Check payout readiness**. The panel stays collapsed until needed and requires no reason, reference or repeated academic entry. When several legacy cycles cover the semester, choose the cycle to compare.

The new assessment uses accepted continuing participation, the current semester setup and authority, program category, exact academic/document evidence, current review and correction links, and recorded standing. It proposes PHP 5,000 only for degree scholars. A stale, missing, noncompliant or academic-only review cannot establish readiness for an initial entitlement. It reads the existing legacy calculation directly and distinguishes normal rules, applicable override results and the last saved calculation.

This is a preview of conditions for **creating an initial entitlement**, not an entitlement balance or release decision. An existing entitlement is reported as requiring use of the existing record, never cancelled or treated as forfeited. The response always returns `paymentAuthorized: false` and `entitlementCreationEnabled: false`. No POST command is provided.

## Differences established on synthetic records

| Situation | New preview | Legacy comparison / implication |
| --- | --- | --- |
| Accepted continuing scholar with compliant current evidence, no annual admission record | Conditions can be met | Not comparable. The annual-record-based legacy calculation cannot run; do not fabricate exam/selection history. |
| Current evidence compliant, legacy masterlist/checklist missing | Conditions can be met | Legacy normal result is ineligible. Investigate ownership/evidence differences before rollout. |
| Both paths have their respective required evidence | Conditions met | Both normal results agree. |
| An unresolved INC is recorded after legacy documents were verified | Review needed | Legacy normal rules and the saved legacy result can still say Eligible. The new path explicitly checks academic compliance. |
| Several legacy cycles cover the semester | One semester assessment | Compare a selected cycle; do not silently choose the first cycle. |
| A legacy override exists | New assessment remains independent | Display the legacy effective result separately; no exception transfers into the new assessment. Existing override suites remain part of regression. |

## Preserved boundaries and remaining work

- No schema migration, runtime grant, permission change, operational enablement, entitlement insertion or payment command in this increment.
- Accepted names-only continuing baselines do not require manufactured annual admission histories. Existing annual standing, where present, is considered conservatively; conflicting, unknown or future-dated decisions require reconciliation.
- Graduation and ended semesters require semester-specific reconciliation before a new entitlement. Existing earned or paid records are preserved. Automatic final-semester entitlement handling is still open Phase 08 work.
- Any legacy batch/payment history for the scholar and semester, including removed entries or nonpayment outcomes, requires reconciliation. This is intentionally conservative pending a controlled financial linkage workflow.
- Locked/closed payroll also requires reconciliation before new entitlement creation. Preview reads never reopen it, recalculate its saved history or replace approved amounts.
- Unknown/non-degree categories cannot enter automatic degree processing. Retroactive INC payments and undecided supplemental/non-degree policy remain restricted.
- A missing current review, changed evidence, unresolved failed/dropped findings, unavailable authority or academic-only review prevents a positive candidate result.
- Staff and Coordinator use the existing `scholars.read` permission. Technical System Administrator access alone is denied. Preview requests do not append audit or command records because no business decision is made; command-level atomic audit remains required for the next increment.

Next: finish validating standing/financial reconciliation rules, implement controlled creation of one PHP 5,000 degree entitlement per eligible semester, then prove duplicate protections across financial paths and preservation of earned final-semester entitlements. Phase 09 will connect approvals and actual release. Do not treat this preview as permission to pay.

## Source map

| Files | Responsibility |
| --- | --- |
| `server/continuing/semester-eligibility-engine.ts` | Pure candidate assessment with explicit reason codes and financial boundaries. |
| `server/continuing/semester-eligibility-preview.ts` | Authorized transaction, authoritative inputs, actual legacy comparison and deterministic source hash. |
| `server/continuing/semester-compliance.ts` | Reused compliance loader; existing review behavior retained. |
| `server/continuing/semester-receiving-routes.ts`, `server/app.ts` | GET `.../semester-requirements/:semester/compliance/eligibility-preview`; no mutation route. |
| `src/SemesterEligibilityPreview.tsx`, `src/SemesterCompliance.tsx` | Collapsed preview with progressive detail, optional legacy cycle selection and separate comparison results. |
| `tests/semester-eligibility.test.ts` | Candidate, stale/adverse/academic-only, category, standing, graduation, period and duplicate-history boundaries. |
| `scripts/test-semester-eligibility-scenarios.ts`, `scripts/test-semester-compliance-scenarios.ts` | Database integration through the existing disposable roster fixture. |

## Validation

- Focused application checks: 254 unit tests across 44 files, lint, type checking, build and secrets scan passed.
- Disposable database: accepted baseline without annual history; permission denial; malformed queries; wrong-semester cycle; absent mutation route; corrected/current evidence; locked period; existing entitlement; actual legacy matches/differences; saved calculation; cycle selection; graduation and legacy financial boundaries passed.
- Repeated/concurrent Staff and Coordinator preview reads preserved exact rows across 22 business/audit tables and returned stable hashes. Synthetic legacy fixtures were created only in the disposable test database and were removed with fixture cleanup.
- Browser: Coordinator opened the preview, chose an explicit legacy cycle and saw new academic blockers alongside legacy normal/saved Eligible results. No new financial action was offered. Evidence: `output/playwright/phase08/check.js` and `eligibility-preview.png`. Only the expected unauthenticated `/auth/me` 401 appeared; browser and fixture were closed.
- Full regression passed: all 38 suites, including 254 unit tests and encrypted backup/restore. All 465 recorded source/build hashes independently verified; 33 migration checksums unchanged. Frozen evidence: `output/workflow-phase08/preview-uat/F36-report.json`. The existing frontend bundle-size advisory remains. Human production acceptance is pending.

## Recovery

Disable the preview entry point or revert this increment's code as a coordinated release if needed. This increment creates no business records and requires no schema/grant rollback. Preserve all prior participation, review, policy, financial and audit history. Do not restore a database backup over subsequent operational work to remove a read-only panel.
