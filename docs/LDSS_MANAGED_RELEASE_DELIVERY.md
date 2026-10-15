# Managed payroll release and final-stipend graduation

Delivered: 2026-10-07. This is supporting evidence and an operating guide; [the workflow change tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md) remains the only working plan. Human operational acceptance is pending.

## Result

A numbered, finalized payroll can now proceed through financial processing to actual receipt. Its reserved semester entitlement is reused throughout. Each entry separately shows approved for release, withheld, unclaimed or released. Graduation preserves only the explicitly confirmed final funded semester, subject to all other eligibility checks.

Neither printing nor financial processing marks a scholar paid. The original payroll roster, official form, allocation and audit history remain unchanged when a hold, later finding or payment correction occurs.

## Staff and Coordinator walkthrough

1. Coordinator opens the reviewed payroll, finalizes it, then submits it for administration. Staff records processing when completed.
2. Staff selects **Record payment outcome**, chooses the scholar and records actual receipt with the payment reference and full-receipt confirmation. Managed degree payments are fixed at PHP 5,000. Use **Unclaimed / not received** and an explanation when no receipt occurred.
3. Coordinator can **Hold payment** for an unpaid entry. The reason and reference are recorded. **Clear hold** requires current restrictions to be resolved; it is not a waiver or reconsideration approval. These controls also work on a closed payroll without reopening it. The allocated entitlement remains reserved.
4. Newly discovered academic facts after finalization use the Coordinator's controlled academic review in the scholar's semester workspace. Failed/dropped/INC safeguards still apply. Current adverse evidence withholds unpaid release; already recorded receipt is not silently reversed.
5. Coordinator reconciles all outcomes and closes the payroll. For a later actual claim or correction, Staff uses **Request correction** and a different Coordinator approves. Pending requests do not change payment totals. Original outcomes and closure totals remain visible alongside effective corrected totals.
6. Staff requests graduation under **Scholar registry → profile → Scholarship records**. A different Coordinator approves and explicitly confirms the final funded semester. It must belong to the annual record and cannot begin after graduation's effective date.
7. The profile shows **Graduated — Final stipend pending** until full receipt is recorded for that semester. Explicit graduation plus full receipt shows **Graduated / Archived**, removing it from the current list. **Registry view → Graduated / Archived** and **All records** retain searchable profiles and history. Graduation after payment gives the same result without duplicating payment.

System Administrators retain technical access only. No scholarship approval permission was added. Existing Coordinator permissions also include operational processing; the expected daily handoff remains Coordinator approval and Staff receipt entry.

## Controls and limits

- Current COR and prior-semester COG remain distinct verified records. Academic findings, identity, placement, standing and source versions are rechecked before release.
- An already approved entitlement does not disappear when its period closes. A later claim can use the unchanged, retained compliant assessment and verified evidence. This does not reopen document editing or create a supplemental/retroactive entitlement.
- New annual/semester renewal is refused for a confirmed graduate, except processing the explicitly confirmed final semester. No course-duration or fourth-year assumption is used.
- Legacy graduation decisions without final-semester evidence remain flagged for review. No historical confirmation is invented. Existing controlled status correction is required where applicable; locked-period historical remediation is not automated.
- Archival is derived from effective approved payment outcomes; a formally approved payment correction can change the pending/archive result. No profile is deleted.
- Reconsideration letters do not bypass failed/dropped/INC, document or timing restrictions. Authorizing policy and decision scope still need clarification. Previously approved benefits after voluntary withdrawal remain reserved and held pending policy.
- Managed membership amendments remain guarded. This release does not rewrite finalized membership or free an allocation for another batch.
- Representative collection, arbitrary partial payments and new retroactive entitlements are not enabled.

## Implementation and database safety

Migration `20261007050000_f36_graduation_confirmation.sql` adds append-only `graduation_confirmations`, linking the existing approved status decision to its final semester. It grants runtime SELECT/INSERT on that table and INSERT on existing `entitlement_release_links`. No role permission changes, historical backfill or destructive schema operations occur.

The migration was first tested against an encrypted, restored copy, then applied locally. Existing rows and schemas in 99 business tables were preserved; UPDATE/DELETE on the append-only records remain denied. Evidence: `output/managed-release/migration-local.json`. No synthetic business payments or graduation decisions were written to the live database.

| Component | Relevant sources |
| --- | --- |
| Reserved allocation and release checks | `server/ovr/managed-release.ts`, `processing-service.ts`, `processing-routes.ts` |
| Controlled payment correction and release links | `server/ovr/payment-correction-service.ts`, existing payment correction/state services |
| Final-semester confirmation and archive derivation | `server/status/graduation.ts`, `status/service.ts`, `status/validation.ts` |
| Eligibility and renewal safeguards | `server/eligibility/engine.ts`, `semester-sources.ts`, `server/ovr/rules.ts`, `server/qualification/service.ts`, `server/continuing/semester-receiving.ts` |
| Controlled academic findings and historical read context | `server/continuing/semester-compliance.ts`, `server/requirements/workflow-service.ts` |
| Screens | `src/OvrProcessingPanel.tsx`, `PaymentCorrections.tsx`, `StatusPanel.tsx`, `SemesterCompliance.tsx`, `ScholarsPage.tsx` |

Existing API paths remain compatible. Added operations are `POST /api/v1/ovr-batches/:id/hold`, `/release-hold` and `POST /api/v1/scholars/:id/semester-requirements/:semesterId/compliance/allocated-review`. Graduation approval adds `finalSemesterId`; initial managed paid outcomes require `receiptConfirmed: true`. Registry listing accepts `scope=current|graduated|all` with filtering before pagination/counts.

## Validation

- `test:main-payroll-db`: full receipt and partial-payment rejection; distinct approved/released states; post-finalization academic blocks; held reservations and duplicate exclusion; Staff/Admin role denial; stale hold decisions; unclaimed outcomes; holds and later claims after closure; separately approved corrections; immutable roster and closure; audit-failure rollback; concurrent payment/retry; graduation before/after receipt; archive search and renewal refusal.
- `test:managed-release-migration-db`: backup/restore, preserved tables/data, additive migration and repeatability. The live application used the explicit `--apply-local` path after these checks.
- Browser: Staff actual receipt with fixed amount and optional routine reason; Coordinator clear hold; required final-semester approval; pending graduation preserved on reload; graduate removed from current results only after full payment; archived profile reopening/reload; 390px mobile width and visual check. All browser business actions used disposable port 3003.
- Browser artifacts: `output/playwright/managed-release-coordinator.png`, `graduation-confirmation.png`, `graduated-archive-mobile.png` and adjacent replay scripts. The script's initial exact-label wait was corrected to account for the semester suffix and to wait for profile loading before reload; this was an automation issue, not lost data.
- Final frozen-source regression gate: **44 suites passed**, including **301 unit tests in 54 files**, lint, TypeScript, production build, secret checks, database workflows, migration preservation and encrypted recovery checks. Archived report and logs: `output/managed-release/F36-report.json`. It does not constitute human acceptance or production launch.

The final gate was rerun after the closed-payroll hold case was added and passed against the unchanged source/build fingerprints. The disposable browser database was removed; live API/database and frontend health checks passed.
