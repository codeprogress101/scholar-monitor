# F17 delivery - Requirement Waiver

Release 0.18.0, completed 2026-10-01 on XAMPP MariaDB. F00-F16 accepted; F17 implemented and tested, ready for acceptance. Next: F18 payout cycle configuration.

## Delivered behavior

In a scholar's annual record and semester checklist, Coordinators can select **Waive [code] requirement**, provide the effective date, reason and authority reference, and optionally add remarks. The server records the authenticated Coordinator identity/name and timestamp. Staff can read waiver evidence; Staff and System Administrator cannot grant waivers. Existing `requirements.waive` permission is reused without changing account roles.

Not Submitted, Submitted, For Verification, For Correction, Resubmitted and Rejected can become **Waived**. Verified and already-waived decisions cannot be replaced. No waiver rescission or editing endpoint is exposed. Effective dates cannot be future dates or precede the latest receipt/decision. Closed or archived semester/academic-year periods block new waivers.

The checklist clearly labels Waived, prior status, revision, date, Coordinator, reason, authority reference and remarks. Waiver metadata is separate from verification events: no verification event or receipt is fabricated. Original receipts, document reviews, rejections and corrections remain visible and immutable. Initial receiving and F16 workflow commands reject waived records.

Waived satisfies the normal requirement rule. The shared helper `satisfiesNormalRequirement(status, allowWaiver = true)` supports explicit server-side payout policy exclusion; it does not establish full payout eligibility. Payout policy/cycle integration and payout locks remain future F18/F19 work. The browser cannot supply a policy override.

## API, storage and files

`POST /api/v1/requirement-instances/:id/waive` requires Coordinator permission, Origin/CSRF and UUID Idempotency-Key. Strict body: `expectedVersion`, `effectiveOn`, `reason`, `authorityReference`, and nullable `remarks`. Actor, timestamps, result status and definition version are server-controlled.

Migration `20261001130000_f17_requirement_waivers.sql` adds `requirement_waivers` and `requirement_waiver_commands` with SELECT/INSERT-only runtime grants, unique instance/waiver identity, restrictive foreign keys, and source-state/reason/authority checks. Applied earlier migrations are unchanged. Waiver, audit and retry receipt commit atomically under the common writer guard using current locking reads and optimistic revisions. Exact retries preserve the original result, including after period closure; changed retries conflict.

Core files: `server/requirements/waiver-{model,validation,service,routes}.ts`, shared `workflow-state.ts`/`workflow-model.ts`, `src/RequirementWaiverForm.tsx`, checklist integration and corrected Verified banner. Release/readiness, grants, migration checks, README and implementation tracking are updated. Tests: `tests/requirement-waivers.test.ts`, `scripts/test-requirement-waivers-db.ts`.

## Validation

- `npm run check`: lint, 102 portable tests in 20 files, client/server/tool/test typechecks, production build and secret scan passed.
- 50 isolated database scenarios passed: F17 waiver 10, F16 workflow 9, F15 receipt 9, F14 generation 12, RBAC 10. Coverage includes denied roles/forged attribution, missing authority/reason, dates, explicit transitions, preserved receipt/history, retries, stale revisions, receipt-versus-waiver concurrency, atomic rollback on audit failure, immutable grants, CSRF, and semester/year lock/archive guards.
- Browser: Coordinator created a waiver with authority reference; refresh preserved it; Staff could view it with no waiver controls. Verified banners remained separate. Desktop (1440x1000) and mobile (390x844) screenshots visually checked with no horizontal overflow: ignored `output/playwright/f17-waiver-desktop.png` and `f17-waiver-mobile.png`. Disposable browser fixture stopped and cleaned up.
- XAMPP migration applied. `npm run test:db` passed connectivity, all 17 migration checksums and restricted grants. Health reports F17/0.18.0, database connected; readiness passed. Tests used synthetic disposable records; existing accounts and scholarship data were not edited.

To review locally, sign in as Coordinator at `http://127.0.0.1:5173`, open a scholar's annual record and semester checklist, and choose an unsatisfied requirement. Waivers are permanent; use an appropriate authority reference for actual records.
