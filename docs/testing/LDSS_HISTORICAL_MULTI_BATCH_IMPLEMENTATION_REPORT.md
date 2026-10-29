# Historical multi-batch payroll implementation and isolated UAT

24 October 2026, Philippine time. **Implemented and verified for the authorized synthetic scenario. No LAN deployment or operational activation.** This report follows the user's explicit implementation authorization and the [targeted plan](LDSS_TWO_BATCH_FIX_PLAN.md). The earlier [V1 result](LDSS_LOCALHOST_TWO_BATCH_UAT.md) and [V2 investigation](LDSS_TWO_BATCH_BLOCKER_ANALYSIS.md) remain historical records.

## Result and local access

The new owned fixture is `ldss_hmulti_test_33804_f28b9d67`, served only at [http://127.0.0.1:3011](http://127.0.0.1:3011). It uses one academic year, semester and cycle, with two independent confirmed imports and published annual Masterlists.

| Verified result | PAY-001 | PAY-002 |
|---|---:|---:|
| Imported distinct scholars | 800 | 200 |
| Current scoped prior approvals | 800 | 200 |
| Published annual members | 800 | 200 |
| Frozen payroll members / allocations | 800 | 200 |
| Payroll state | Processed | Processed |
| Payment Recording `canRecord` | true | true |
| Pending outcomes | 800 | 200 |
| Paid / Unclaimed / Needs review | 0 / 0 / 0 | 0 / 0 / 0 |
| Read-only payment preview | 800, zero conflicts | 200, zero conflicts |

There are **1,000 unique scholars, 1,000 semester entitlements, 1,000 allocations and zero payment records**. Setup, prior review, finalization and processing did not mark anyone Paid. See [verification](../../output/historical-multi-batch-20261024/verification.json), [controls](../../output/historical-multi-batch-20261024/controls.json) and [fresh payment checks](../../output/historical-multi-batch-20261024/post-finalization-checks.json).

Synthetic account names remain `staff@example.invalid`, `coordinator@example.invalid`, `system_admin@example.invalid` and `unassigned@example.invalid`. Random passwords are confined to the restricted local file `output/historical-multi-batch-20261024/private/credentials.json`; they are not reproduced here. Individual-payment flags remain false. Only this fixture enables the new historical-append gate.

## Application and schema changes

| Files | Change |
|---|---|
| [historical-context.ts](../../server/payouts/historical-context.ts), [historical-append.ts](../../server/payouts/historical-append.ts) — new | Shared batch/source indexes and the controlled additional historical Draft command. |
| [app.ts](../../server/app.ts), [config.ts](../../server/config.ts) | Authorized preview/append endpoints and optional `HISTORICAL_MULTIBATCH_ENABLED`, effective default **off**. |
| [submission-service.ts](../../server/payouts/submission-service.ts) | Preserve the earliest cycle root; expose a separate ordered historical-batch collection and current ledger revision. Ordinary window date rules remain. |
| [semester-sources.ts](../../server/eligibility/semester-sources.ts), [managed-payroll.ts](../../server/ovr/managed-payroll.ts), [detail-reads.ts](../../server/ovr/detail-reads.ts) | Resolve actual historical ownership and pin the automatic/paged candidate scope to that import. Run the existing complete eligibility pipeline on covered members. |
| [managed-release.ts](../../server/ovr/managed-release.ts) | Fresh bound-batch payment checks also validate confirmed import hash, pinned prior approval and approved annual membership. |
| [HistoricalPayrollAppend.tsx](../../src/HistoricalPayrollAppend.tsx) — new; [HistoricalPayrollSetup.tsx](../../src/HistoricalPayrollSetup.tsx), [PayoutCyclesPage.tsx](../../src/PayoutCyclesPage.tsx) | Separate reviewed append dialog, evidence/date fields, source preview and retained exact-retry handling. |
| [scholar-issue-navigation.ts](../../src/scholar-issue-navigation.ts), [ScholarIssueAction.tsx](../../src/ScholarIssueAction.tsx), [RegistryEligibility.tsx](../../src/RegistryEligibility.tsx) | Explanation-only source/cutoff/entitlement/unknown restrictions; valid existing destinations for supported actions. Academic and prior-review links respect the supplied permissions. |
| [PayrollCandidates.tsx](../../src/PayrollCandidates.tsx), [PayrollPagedDetails.tsx](../../src/PayrollPagedDetails.tsx), [OvrDrafts.tsx](../../src/OvrDrafts.tsx) | Pass actual viewer permissions through the same issue renderer in full and paged views. |
| [historical-multi-batch.test.ts](../../tests/historical-multi-batch.test.ts), [historical-issue-permissions.test.tsx](../../tests/historical-issue-permissions.test.tsx) — new; existing navigation/detail tests | Ownership, caching, date boundaries, fail-closed formats and permission-aware explanations; update the detail mock for the added source read. |
| [fixture generator](../../scripts/historical-multi-batch-uat.mjs), [append checks](../../scripts/historical-multi-batch-checks.inc), [payment checks](../../scripts/historical-multi-batch-postchecks.inc), [loading observer](../../scripts/historical-multi-batch-performance.mjs) — new | New owned fixture and evidence. Existing V1/V2 helpers are reused as generation references without editing them. |
| [test-financial-reports.ts](../../scripts/test-financial-reports.ts) | Optional test-only output directory prevents this regression run from replacing earlier P08 report artifacts. Its default remains unchanged. |

**No migration, table, constraint, entitlement-schema or runtime-grant change was needed.** The existing `historical_payout_setups` primary key `(cycle_id, revision)` and unique `batch_id` support the append. The original runtime grants permitted the required inserts. All 62 migration checksums match; all 341 foreign-key groups have zero orphans. The new runtime identity has no global business grants or access to other schemas.

## Source ownership, command authority and dates

Each additional historical setup pins its confirmed import fingerprint, exact scholar/semester owner and annual-record IDs, current prior approval IDs/revisions/source hashes, approved Masterlist publication IDs/versions/hashes and historical dates/reference. These are server-built from current evidence, not client-supplied eligibility assertions. The scope is an allowlist, with fresh full eligibility checks before finalization. A designation or checkbox alone supplies no verification or entitlement.

The earliest historical row remains the legacy cycle root. A selected independent historical batch uses its own import; cycle-only assessment can resolve a bound owner to its batch. Genuine omission destinations continue using the reviewed origin and its source import. Batch 2 was **not** relabeled as an omission. Changed/unconfirmed sources, stale approvals, wrong membership or existing semester reservations remain blockers.

The append requires `payroll.windows.manage` **and** `payouts.operate`, the enabled gate, an available draft/open cycle, open preparation, current calendar/mapping versions, a finalized existing root, expected ledger revision and batch sequence, supported dates and reference, source hash and reviewed confirmation. Staff, pure Administrator and unassigned roles are denied. Existing configuration locking and transaction handling serialize the command; the historical ledger is locked before append. Audit and command receipt are in the same transaction. Exact retries return the original batch, and changed-payload retries conflict.

The command creates only a Draft/window/source record. Coordinator finalization, submission and Staff processing remain separate ordinary commands. Before Batch 2 finalization there were still only 800 entitlements and zero payments.

The fixture declared these **fictional scenario facts before importing** in [historical-scenario-facts.json](../../output/historical-multi-batch-20261024/historical-scenario-facts.json):

| Batch | Historical opening | Historical cutoff | Supported reported batch release |
|---|---|---|---|
| 1 | 4 October 2026 | 21 October 2026 | 22 October 2026 |
| 2 | 22 October 2026 | 23 October 2026 | 23 October 2026 |

These are synthetic batch-level facts, not individual actual payment dates. Original historical physical receipt/approval dates remain unknown. The fictional packets were physically received in the fixture on the actual setup day; separate scoped prior document/academic/deadline attestations supply the supported review history. There are no ordinary fabricated five-check attestations or numeric/adverse grade findings.

The append recorded a reviewed historical submission-deadline version covering the second past cutoff and retained the earlier version. It did not change semester end, claimability or a live intake deadline. Ordinary past-window creation remains prohibited. Windows must remain sequential/nonoverlapping, within the available semester and no later than today; reported release cannot precede cutoff. A cutoff today still cannot pass the unchanged whole-Manila-day submission check. Missing reported release dates/references are rejected; processing dates do not fill unknown release dates. Q28 and individual-payment policy are unchanged.

## Academic variety and preserved evidence

The verified distribution is **250 Year I, 250 Year II, 250 Year III, 200 Year IV and 50 Year V**, across five fictional schools/eight programs. Each batch retains its proportional distribution. All 50 Year V scholars have an explicitly known five-year fictional program. **95 courses remain truthfully pending** (76 + 19); optional personal details and numeric grades are not invented.

There are 1,000 COR sources, 750 preceding completed-semester COG sources and 250 explicitly reviewed first-entrant SHS grading-card alternatives. No blanket freshman exemption or fabricated college COG was used. Source imports, annual academic records, intake classifications, approved Masterlist snapshots and both frozen payroll forms agree. See [academic verification](../../output/historical-multi-batch-20261024/academic-verification.json).

Batch 1's root setup, frozen stored bytes, allocations, payment ledger and approved publication hashes matched checkpoints after append **and after Batch 2 finalization**. Its frozen stored-value SHA-256 remains `ad56fbf6a4fc18c7ae61d17b83bd8588e71be81ba89a93aa5c0c3d8c417676ef`. The post-finalization evidence contains hashes for all five compared record sets. No Original closure existed in this all-Pending fixture; existing Original/Updated reconciliation behavior was exercised separately by regression tests.

Before/after preservation compared development, A–F, V1 and V2: **all nine existing schemas matched their starting table data, definitions and row counts, including authentication data**. Existing account grants and `.env` matched. Exactly one new owned schema/runtime account remains. See [preservation result](../../output/historical-multi-batch-20261024/preservation-after.json). No LAN connection was used.

The 1,006 accepted P10 inputs were archived before editing under `output/historical-multi-batch-20261024/baseline/`. Eighteen existing source/test files changed within the declared scope, alongside the new files above and rebuilt local artifacts. All migrations and sampled earlier helper/report inputs remain unchanged. The archive preserves original build artifacts removed/replaced by the new Vite build. This is **not** a new P10 acceptance or operational release certification.

## Verification results

| Command / evidence | Result |
|---|---|
| `npm test` | **98 files, 603 tests passed.** Includes new source index/date/permission tests and existing financial/unit coverage. |
| `node scripts/historical-multi-batch-uat.mjs create` / `verify` | Two independent processed payrolls; exact 800/200 rosters, 1,000 entitlements, both `canRecord: true`, zero payments. |
| Append integration checks | Permission/default-off rejection; missing reference/source/release; future/reversed/overlap dates; wrong calendar/source/root import; exact prior deadline; forced audit failure with complete rollback; concurrent exact retries committing one Draft; lost-response retry; conflicting payload and stale sequence; full/paged import scope; source invalidation; first-root preservation. [Details](../../output/historical-multi-batch-20261024/append-checks.json). |
| `node scripts/historical-multi-batch-uat.mjs controls` | Integrity/grants/migration checks; 800/200 read-only payment previews; changed person and changed confirmed-import hash block fresh payment previews; probes restored in `finally`; no approval, frozen or financial evidence directly inserted/altered. |
| `npm run test:payment-recording-db` | Passed ordinary payroll/payment recording, stale/retry/concurrency/role safeguards. |
| `npm run test:payroll-reconciliation-db` | Both driver branches passed, including closed/Original evidence and correction controls. |
| `npm run test:omitted-payments-historical-db` | Passed all 13 import scenario groups, including genuine same-import omission destination, source changes and original frozen evidence preservation; rerun against final application code. |
| `node --expose-gc --import tsx scripts/test-eligibility-db.ts --main-payroll --payment-recording --payroll-reconciliation --financial-reports` | Passed, rerun against final application code. P08 pending/provisional/review/Original/Updated API and XLSX/PDF outputs, unique-entitlement totals, permissions and rollback covered. Test output isolated via `LDSS_TEST_REPORT_OUTPUT`. |
| Focused ESLint over all changed application/test/JS helper files | Passed. |
| `npx tsc --noEmit`, `npx tsc -p tsconfig.server.json --noEmit` | Production client/server checks passed. |
| `npm run lint` | **Not green:** 206 pre-existing errors before and after; no additional lint errors. Existing UAT helper typing/style issues were not broadened into this implementation. |
| `npm run typecheck` | **Not green:** the same six validation-helper diagnostics before and after, with no changed diagnostics. They involve `uat-resume.ts` request-key types, `uat-two-batch-variety.ts` inferred arrays and `uat-two-batch.ts` role typing. |
| `npm run build` | Ran and stopped at those existing validation-helper type errors. The declared production stages `vite build`, server TypeScript emit and `copy-report-assets.mjs` were then run successfully; the rebuilt client is what the browser checked. Vite retains its chunk-size warning. No check was disabled. |
| `npm run check:secrets` | Passed. |
| Browser via Playwright CLI | Staff saw both processed payrolls and 800/200 Pending summaries with Payment Recording controls. No outcome button was committed. Coordinator saw the separate append dialog, labeled date/reference/review fields and disabled submission without evidence; Escape closed it and restored launch-button focus. The initial signed-out `/auth/me` 401 was expected; no later console error was observed. |

Unit/date tests include the exact Manila midnight boundary and fail-closed malformed scopes. Existing regression drivers retain incomplete documents, mandatory academic restrictions, duplicate identities/entitlements, competing payment routes, ordinary payroll, audit/transaction failures and correction/report coverage. These focused tests are not exhaustive fault injection for every possible office history or target host. No full `test:uat` rerun or office acceptance is claimed.

Browser evidence: [800-member workspace](../../output/playwright/historical-multi-batch/batch1-recording.png), [200-member workspace](../../output/playwright/historical-multi-batch/batch2-recording.png), [200 Pending summary](../../output/playwright/historical-multi-batch/batch2-summary.png), [append dialog](../../output/playwright/historical-multi-batch/append-dialog.png). Role/navigation render tests cover Staff, Coordinator, pure Administrator and unassigned viewers. Unsupported historical-source problems have explanations, not a misleading profile-repair link; both candidate views use the same renderer. The local ui-ux-pro-max and Playwright skill workflows were used for this bounded interface work.

## Loading and SQL observations

[Measurements](../../output/historical-multi-batch-20261024/loading-observations.json) compare the archived accepted source and new source against the **same unchanged V2 data**, using read services without logging into or changing that fixture. These are single local observations, not load-test guarantees or speedup claims.

| Read | Before | After |
|---|---:|---:|
| V2 legacy candidate page, 25 rows | 198 SELECTs; 870 ms | 198 SELECTs; 588 ms |
| V2 legacy candidate page, 50 rows | 238 SELECTs; 1,323 ms | 238 SELECTs; 795 ms |
| Historical reads within those pages | 3 | 3 |

The new V3 bound-source assessment used **four historical SELECTs** at **25, 50 and 200 members** (188/231/500 total existing-pipeline SELECTs; approximately 998/1,362/3,005 ms). Thus historical source ownership does not add a per-member query loop. Request-local indexes share source metadata and clone selected pins rather than repeatedly cloning the whole roster. Existing authoritative pipeline queries remain; no unrelated optimization is claimed.

V3 frozen 25/50-row pages used 11 SELECTs each. Payment summaries used 14 SELECTs each, approximately 83 ms for 800 and 37 ms for 200. Frozen reads differ from live candidate assessment and are not used as a before/after improvement comparison. Paged browser navigation did not request full-detail eligibility merely to display Payment Recording. R01–R07, fresh write validation, frozen evidence bounds and database limits were retained.

## Remaining limits and stop point

- Required actual historical dates/references must exist. Unknown reported batch release, overlapping historical windows, an unavailable period, stale prior evidence or incorrect official membership remains blocked. This implementation does not invent dates or support overlapping-window exceptions.
- A changed pinned source needs its applicable controlled review/correction. There is no automatic re-adoption or command to rewrite a frozen scope. Reverting code after new records exist must preserve compatible read support; disable new appends rather than delete the ledger.
- Existing legacy root behavior remains compatible; newly appended batches receive the explicit pinned format. No silent conversion of V1/V2 second drafts or historical frozen records occurred.
- The earlier broad import classification selector and unknown-school/year approved-import gaps are not implemented here. Existing prior-review and Course pending controls are used; no new verification policy, portal, bulk waiver, benefit or academic exception is introduced.
- This fixture has no acknowledged actual releases or closure. Payment/reconciliation mutation regressions ran in separate disposable test schemas. Named office acceptance, financial activation, P11, LAN packaging and deployment remain outside this authorization.
- Repository-wide lint/typecheck/build are still qualified by the unchanged baseline failures above. Production compilation, focused lint, unit/integration checks and browser results are reported separately.

To revisit this retained fixture, use `node scripts/historical-multi-batch-uat.mjs progress`, `verify`, `controls` or `serve`. The helper refuses an existing manifest on `create` and exposes no destructive reset/drop command. It does not repoint `.env`, schedule payment actions or modify preceding fixtures.

**Stopped after implementation, verification and this report. The new localhost fixture is available with both batches Pending and ready for Payment Recording; no operational activation or deployment was performed.**
