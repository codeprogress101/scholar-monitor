# Phase 08 / B1 - Receipt evidence foundation

Date: 2026-10-07. Focused validation complete. This is a read-only evidence increment, not completion of B1 or activation of cutoff eligibility.

The [single implementation tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md) remains authoritative.

## Delivered

The existing checklist read APIs now return `receiptEvidence` for each individual requirement. It identifies the original receipt or latest physical replacement by immutable source ID/version, actual document type when recorded, physical receipt date, automatic server recording timestamp and recording officer.

Physical dates remain date-only; no midnight or other receipt time is invented. The original UTC recording timestamp retains database precision in the API. The UI displays it in Asia/Manila to seconds, separately from the physical receipt date. Subsequent verification, rejection and waiver dates never become receipt dates. A later resubmission uses its own evidence, never an earlier valid receipt's timing. Missing or invalid replacement timing returns an explicit review message rather than falling back to the original paper.

Staff sees this in **Receive requirements -> Verification, corrections and document history**. The existing section stays collapsed initially; no input or receiving step was added. Original receipts and full decision history remain visible and unchanged. Separate COR/enrollment and COG records remain intact.

This projection describes custody only. It does not determine deadline eligibility, approve a backdated claim, override rejection/waiver status, create an entitlement or reopen payroll. No migration, permission, operational data or write-command change was made.

## Source map

| Source | Responsibility |
| --- | --- |
| `server/requirements/receipt-evidence.ts` | Current physical evidence projection with explicit date precision and no fallback to older receipt timing |
| `server/requirements/instances-model.ts`, `instances-service.ts` | Add evidence to existing checklist responses from unchanged receipt/workflow records |
| `src/ReceiptTimingEvidence.tsx`, `ReceivingRequirements.tsx` | Separate physical receipt and Manila entry time within existing collapsed history |
| `tests/receipt-evidence.test.tsx` | Original/replacement selection, missing evidence, preservation, timezone rollover and no added inputs |
| `scripts/test-requirement-workflow-db.ts` | Assert real API evidence preserves original receipt and selects replacement after reverification |

Existing data sources: `requirement_receipts.received_on` / `recorded_at`; resubmission `requirement_workflow_events.details.receipt` / `recorded_at`; original type evidence from `requirement_document_evidence`. No new data is backfilled.

## Validation and boundaries

- `npm run check` passed: lint, 276 tests across 48 files, typecheck, production build and secrets scan. Existing bundle-size advisory remains. Lint/typecheck were repeated after the database assertion additions and passed.
- `npm run test:requirement-workflow-db` passed all nine scenarios, including receipt/replacement API evidence, immutable history, authorization, rollback, concurrency, retries and locked-period behavior.
- `npm run test:continuing-rosters-db -- --browser` passed all eight main scenarios and its academic/compliance/coverage integration scenarios in a disposable MariaDB database.
- Playwright Staff check passed for two separate evidence panels: latest COG replacement and initial COR, explicit date-only precision, Manila entry time and no input controls. Screenshots were inspected: `output/playwright/phase08/receipt-replacement.png`, `receipt-initial.png`. Browser and fixture were closed; only the expected pre-login authentication 401 appeared.
- Scoped evidence manifest: `output/workflow-phase08/receipt-evidence-validation.json`. All 35 migration checksums remain equal to the preceding coverage release.
- The full 40-suite UAT archive in `coverage-uat` belongs to the preceding regular-coverage increment. It is not claimed as a full UAT run for this read-only projection. B1 integration and human acceptance remain open.

## Confirmed decisions and next work

The user confirmed all three previously pending decisions on 2026-10-07:

1. Coordinator may approve a claimed on-time physical receipt entered after cutoff using a receiving log or dated acknowledgment, with evidence and a recorded decision. This approval does not verify the document or approve payment.
2. Staff may record custody after cutoff; that entry must not qualify automatically for the closed cutoff. Later-batch consideration is allowed only where permitted. Existing final locks still apply until their explicit custody handling is integrated.
3. Accepted continuing rosters may support Coordinator-reviewed, published official membership without fictional exam or selection records. Publication and formal membership controls remain necessary.

Next: additive timing evidence/decision storage and API, Coordinator review, enforcement across individual/batch receipt and resubmission, then the official-membership bridge and shared eligibility integration. Reuse the current receipt source identity; a replacement cannot inherit timing approval for an earlier paper. Preserve original date claims and decision history. Managed financial creation remains disabled until B1/B2/C safeguards are complete.

Recovery: the read projection/display can be corrected or withdrawn without changing stored documents. Preserve original receipt and workflow events; no migration rollback or historical rewrite is required.
