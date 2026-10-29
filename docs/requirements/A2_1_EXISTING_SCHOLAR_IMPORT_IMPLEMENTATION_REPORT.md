# A2.1 — Existing-scholar matching and import source binding

25 October 2026, Philippine time. **Implemented and verified in the isolated candidate; stopped after A2.1. Primary 5173 has not been upgraded or changed.** Scope follows the authorized [focused A2 review](A2_EXISTING_SCHOLAR_IMPORT_READINESS_REVIEW.md).

## Result and access

The candidate is `C:/xampp/htdocs/ldss_a21_candidate_20261025`, served only at [http://127.0.0.1:3016](http://127.0.0.1:3016). Its owned database is **`ldss_import_binding_test_43180_dd034c13`**, runtime **`ldss_ib_43180_dd034c13@localhost`**, with **65 migrations**. It was copied from the current synthetic primary, including its two existing Paid records, then upgraded only in isolation. Existing source account identities/password hashes/roles were retained; copied sessions, reset tokens and rate limits were excluded. Synthetic browser credentials and recovery keys remain in the candidate's restricted task-private directory; none is included in the review archives.

The browser scenario registered two distinct, similarly named people individually, then imported those two people alongside one new person through the unchanged eight-column Excel template. The existing permanent IDs were reused. The copy now has **1,003 scholars, 1,003 annual intake roots, two immutable bindings, 1,000 entitlements/allocations and the original two payment records**. Import confirmation added no payment or entitlement. Both original payrolls remain recordable: PAY-001 **2 Paid / 798 Pending**, PAY-002 **200 Pending**. [Copy verification](../../output/a2-1-implementation-20261025/evidence/copy-final-verification.json).

## Implementation and exact boundary

There are **12 modified and 10 new code/test/schema files**, entirely in the external candidate. The [file inventory](../../output/a2-1-implementation-20261025/candidate-files.json) records every path and SHA-256.

| Files | Change |
|---|---|
| `server/imports/model.ts`, `service.ts`; new `intake-binding.ts`, `confirmed-scope.ts` | Strict reviewed row resolutions, structured duplicate candidates, current intake/person checks, binding orchestration, versioned confirmed results and shared source validation |
| `server/requirements/prior-approval-service.ts`; `server/payouts/historical-append.ts`, `historical-context.ts` | Validate binding-aware membership before prior review, historical append and fresh historical-source assessment, including the initial historical root |
| `server/scholars/annual-intake-service.ts`; `src/AnnualIntakePanel.tsx`, `ScholarImport.tsx` | Bounded linked-source history; permanent-ID match review; compact counts; explicit unchecked identity acknowledgment; exact confirm recovery across reload |
| New `db/migrations/20261025010000_f55_import_intake_bindings.sql`, `scripts/import-intake-preflight.mjs`; `scripts/migration-lib.mjs`, generated `server/schema-manifest.ts` | One immutable binding table, restrictive FKs/uniqueness, SELECT/INSERT-only runtime grants and guarded 65-entry readiness |
| `scripts/test-import-db.ts`; new `test-import-bindings.ts`, `test-import-intake-upgrade-db.mjs`, `test-import-intake-recovery-db.mjs`; new `tests/import-intake-bindings.test.ts`, `import-intake-preflight.test.ts`, `import-recovery.test.tsx`; `package.json` | Binding/legacy/concurrency/rollback/source tests, populated upgrade/recovery and three reproducible package commands |

No workbook/parser, financial writer, academic writer, policy, permission mapping, dependency, main configuration or accepted migration was edited. The candidate's Apache access denial is an isolation measure and is excluded from the promotion patch. Builds changed only candidate artifacts.

## Identity and evidence ownership

Each reviewed match pins the actual worksheet row, permanent person/version, manual intake ID/revision/hash, current F05 duplicate snapshot, explicit same-person confirmation and reference. A changed choice requires a new immutable staged job. No name match automatically chooses an identity. Two already registered, separately reviewed identities can remain distinct despite similar names; an unmatched new person retains the existing duplicate safeguards and has no import-level create-separate bypass.

Reuse requires the working-year manual intake, matching effective classification and consistent known initial placement. Current-year academic/annual records or existing participation block this first release. Old remains normalized to Continuing. Unknown original school/course/year values stay unknown in the manual intake; the authorized import separately creates supported academic facts.

Confirmation reuses the existing transaction/authorization adapter. It does not call the profile writer for reused people, consume another ID, change their first-entry year/contact/version, or insert a second intake. It appends the binding and runs the existing approved-import academic, qualification and continuing operations atomically. Continuing receives the person's actual reviewed version, including versions above one. Failure rolls back all new effects.

F55 enforces unique job/row and job/intake ownership, restrictive references and no-update/no-delete triggers. It adds **no business permission**. Approved staging/confirmation still require the existing Coordinator permissions and underlying operation permissions. Staff can inspect candidates; they cannot approve the list. Jobs remain account-private: cross-account preview transfer is not introduced, so the Coordinator restages and reviews their own upload.

New `bound-import/v1` results identify every row's import root or binding. The shared resolver checks raw/preview/result membership, permanent identifiers, historical intake pins, binding hashes and one-to-one ownership. Missing, malformed, extra or downgraded binding evidence fails closed. Legacy JSON/fingerprints remain untouched; saved pre-A2.1 previews retain their original validation/hash interpretation. Later controlled intake corrections remain visible without silently replacing the import's historical pin or adding a current-intake-head dependency to legacy payments.

Candidate intake metadata is loaded as sets, with at most 1,500 people per query chunk; revisions and established-record checks are batched. The existing F05 duplicate pipeline remains. This is no SQL speedup or broader optimization claim.

## Verification

Final accepted command results are recorded in [normal checks](../../output/a2-1-implementation-20261025/evidence/checks-final/results.json). The existing Vite chunk-size warning remains; no limit, lint rule, TypeScript strictness or financial safeguard was weakened.

| Check | Evidence |
|---|---|
| `npm run lint`, `typecheck`, `build`, `npm test`, `check:secrets` | **All exit 0; 111 files / 703 tests passed.** Normal complete build; zero lint/type errors |
| `npm run test:import-intake-bindings-db` | **Exit 0.** Manual New/Continuing, mixed identities, actual person version, strict/stale/conflicting mappings, denied roles, six forced rollback points, concurrent/exact retries, established-record rejection, immutable roots/bindings, later correction with original pin retained, legacy saved preview and actual prior-review/publication/historical finalization/omission integration. [Log](../../output/a2-1-implementation-20261025/evidence/bindings-accepted.log) |
| `node --import tsx scripts/test-import-db.ts --prior-quick --large-approved` | **Exit 0; 14 scenario groups.** 1,500-row exact roster, full rollback, safe retry, ordinary existing guards and unchanged limits. [Log](../../output/a2-1-implementation-20261025/evidence/large-accepted.log) |
| Populated 64 → 65 upgrade | Fresh encrypted source/pre-upgrade/upgraded backups and verified isolated restores; all 64 earlier checksums and protected records exact; new table initially empty; runtime INSERT/SELECT allowed, UPDATE/DELETE/DDL/cross-schema access denied. [Upgrade](../../output/a2-1-implementation-20261025/evidence/upgrade.json), [recovery checkpoints](../../output/a2-1-implementation-20261025/evidence/backups.json) |
| F55 partial DDL | Forced interruption retains the committed prefix; blind retry stops. Exact empty-fixture prefix verification and reviewed forward repair pass. [Evidence](../../output/a2-1-implementation-20261025/evidence/partial-ddl.json) |
| Existing regression drivers | Twelve suites passed: RBAC, academic, approved academic changes, standing, Registry, historical omission, recording, reconciliation, individual settlement, financial reports, individual documents and omitted settlement. Six relevant shared-reader/financial suites were rerun after source refinements and passed. [Initial matrix](../../output/a2-1-implementation-20261025/evidence/regressions-a-two-one/results.json), [final matrix](../../output/a2-1-implementation-20261025/evidence/regressions-a-two-one-final/results.json) |

Mutating financial tests used owned disposable schemas. No retained primary or earlier fixture was used for a payment, correction, standing or graduation command. This is synthetic acceptance, not a new P10/office/release certification.

## Browser checks

Coordinator review showed **1 new / 2 existing / 0 unresolved / 3 ready / 0 correction rows** after explicit resolution. Both same-person acknowledgments began unchecked; edited mappings disabled confirmation until restaging. At 1440/1024/820/375/320 CSS pixels, labels and permanent IDs remained available, native keyboard focus showed a 3-pixel outline, and no page-level overflow occurred. The existing table scrolls locally.

An actual import committed in the owned copy before its response was deliberately dropped. The saved key/body survived reload and the intercepted retry matched exactly; only one confirmation and two bindings exist. The browser tool yielded at beforeunload while the original check continued; its completion screenshot was written after the exact-retry assertion. A follow-up probe found recovery already completed, and sent no further confirmation. Staff could inspect candidates, saw approved-list authority disabled and could cancel an unconfirmed draft. Source history shows the original manual reference/unknown fields beside the later filename, row, reviewed revision, actor/time and hashes.

Screens: ready [1440](../../output/playwright/a2-1/ready-1440.png), [1024](../../output/playwright/a2-1/ready-1024.png), [820](../../output/playwright/a2-1/ready-820.png), [375](../../output/playwright/a2-1/ready-375.png), [320](../../output/playwright/a2-1/ready-320.png); [uncertain response](../../output/playwright/a2-1/uncertain.png), [completed import](../../output/playwright/a2-1/completed.png), [linked history](../../output/playwright/a2-1/linked-history-1024.png), [Staff review](../../output/playwright/a2-1/staff-review-820.png). [Keyboard/count results](../../output/a2-1-implementation-20261025/browser-resolve.log), [history results](../../output/a2-1-implementation-20261025/browser-history.log), [Staff results](../../output/a2-1-implementation-20261025/browser-staff.log). Native 200% zoom/full assistive-technology certification is not claimed. UI/UX and Playwright skills were used for these bounded checks.

## Preservation and review package

Primary read-only before/after inventories matched **all business data, definitions, 64 migrations, accounts/roles/password hashes, runtime grants and original audit rows**. No primary authentication event was added. It remains **1,000 scholars, 14 accounts, 1,000 entitlements/allocations and exactly two Paid records with their original evidence/dates**. API/Vite remain on their original loopback processes; only the owned 3016 server was restarted. [Primary preservation](../../output/a2-1-implementation-20261025/preservation.json).

All **1,242 checkpointed main source/configuration/test/document/build files** matched their starting hashes. Earlier UAT helpers/artifacts were not repointed or run against retained fixtures. Original 212-person, 3011/3012/3015, A–F/V1/V2 and LAN/production were not migration or mutation targets. This task's full live inventory claim concerns primary 5173; it does not claim a new exhaustive inventory of every other database. [File preservation](../../output/a2-1-implementation-20261025/files-preservation.json).

The copy's final comparison checked 144 source tables: all original protected rows remain exact. Only its identity sequence advanced by three for the declared test people; new registration/import/authentication evidence is additive. Existing financial/frozen records remain exact, and fresh source validation/payment summaries passed.

Review deliverables: [candidate patch](../../output/a2-1-implementation-20261025/A2_1_CANDIDATE.patch), [candidate source](../../output/a2-1-implementation-20261025/candidate-source.zip), [65-compatible build](../../output/a2-1-implementation-20261025/compatible-build.zip), [baseline source/build](../../output/a2-1-implementation-20261025/baseline-source-build.zip). Archives exclude credentials/keys and `.env`; hashes are in the file inventory. `git apply --check` passed against the actual dirty main baseline; the patch was **not applied**.

## Proposed primary-5173 operation — not executed

The next separately approvable operation is promotion to **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`**, on **DESKTOP-BPLJKRP, 127.0.0.1:3306**, with frontend/API **5173/3001**.

1. Recheck actual listener ancestry, runtime/server identity, current dirty source/build/manifest and all 64 accepted checksums. Compare the reviewed candidate hashes; inspect later legitimate edits instead of overwriting them. Capture the current business, account, grant, audit and frozen-source inventory, including every payment recorded since this report.
2. During explicitly approved maintenance, take a **fresh encrypted backup**, verify it through a new isolated restoration/constraint comparison, remove only that owned restore, and bind its hashes/current inventory to a fresh exact-target proof. Today's isolated-copy checkpoint is not authorization or sufficient proof for a later primary upgrade.
3. Prepare and review a narrowly target-bound F55 preflight adapter for that proof. The delivered preflight intentionally rejects primary/retained targets; there is no generic force switch. Verify partial-DDL status before proceeding.
4. Promote the reviewed source and **exact F55 SQL bytes**, regenerate/check the 65 manifest and build compatibility. Apply only F55 plus SELECT/INSERT on the one new table for the exact runtime; verify denial of UPDATE/DELETE/DDL/cross-schema access. Change no role, password, financial flag, prior checksum or old row.
5. Restart only the verified primary profile into the compatible 65 build. Recheck original account access, registration/import/history reads, exact old source/frozen/payment hashes, and both payroll summaries. Run matching mutations on an explicitly owned test copy unless separate primary synthetic writes are approved. Source binding must not refresh frozen financial pins or make an incomplete person payable.
6. Before DDL, rollback can retain the unchanged 64 profile. After F55 or binding evidence exists, retain 65-compatible readers and pause new binding writes through a reviewed compatible build while investigating/forward-repairing. Do not run a 64-only binary against 65, delete links/history, blindly rerun partial DDL, or restore a stale backup over valid later transactions. Any actual restore/disposition needs its own reviewed current recovery operation.

No primary exception, promotion, restart, grant, migration or activation from this proposal has run. The isolated candidate may be restarted from its directory with `node --import tsx output/a2-1-implementation-20261025/serve.ts`; it performs no startup migration/reset.

## Limits and stop

A2.1 intentionally blocks already established academic/annual/participation histories, unresolved identities and conflicting supplied facts. It does not absorb them through an import overwrite. Existing F05 review bounds, current approved-import requirements, Course pending, physical receipt assertions and separate COR/COG/prior-review/publication/financial guards remain. Real source evidence is still required; fictional packets supply no production authority.

No full A2 presentation redesign, A4/B1/B2, graduation, performance remediation, financial-policy change, feature activation on retained UAT, LAN deployment or P11 was performed. **Stop after isolated acceptance, this report and the upgrade proposal; await separate primary authorization.**
