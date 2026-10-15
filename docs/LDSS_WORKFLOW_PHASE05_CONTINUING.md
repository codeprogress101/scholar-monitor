# Phase 05 - Continuing-scholar baseline rosters

Date: 2026-10-06. Roster workflow implemented and technically validated. Semester/category and shift-policy integrations remain assigned to Phases 06 and 10. Human production acceptance remains pending.

## Daily workflow

1. Open **Continuing scholars** in the sidebar. Use **Add or import scholar names** for new identities; existing registry duplicate review remains the identity-creation path.
2. Choose **Prepare roster**, record its physical source/location once, and search for the existing Scholar IDs. Add the matching names. Source rows and original-name fields are prefilled; adjust them only when the hard copy differs.
3. **Save for review** freezes the roster. Up to 200 members can be prepared in one batch; use additional batches for larger source lists. Duplicate Scholar IDs or source rows within a batch are rejected.
4. A separate Coordinator checks the hard-copy names against the linked identities, records the actual issuing authority/reference and decision date once, and accepts or rejects the roster. Acceptance notes are optional; rejection requires a meaningful reason. Self-approval is blocked.
5. Accepted members have continuing-baseline participation records. Their profile shows accepted prior admission, with historical documents and prior shift count explicitly Not recorded.

No exam, selection, signed agreement, verified requirement, grade, shift count, annual activation or payment is fabricated. Acceptance is not semester compliance or payout eligibility. The semester workspace that uses this baseline is Phase 06; until then the existing legacy qualification/receiving path is not automatically converted.

School, course and year level continue to use the existing academic-record workflow when supporting documents arrive. Missing historical information remains unknown. Program category and shift-history-dependent decisions are not inferred from a name or accepted roster.

## Implementation and controls

- Migration `20261006020000_f36_continuing_rosters.sql` adds `continuing.prepare` to Staff and Coordinator and `continuing.approve` to Coordinator. System Administrator gains neither permission. Total migration count: 31.
- Runtime gets SELECT/INSERT only on seven onboarding tables: `continuing_roster_batches`, `continuing_roster_entries`, `continuing_roster_decisions`, `participations`, `participation_events`, `workflow_authority_versions`, and `workflow_commands`. UPDATE/DELETE remains denied. Other Phase 04 tables remain dormant.
- `server/continuing/service.ts` checks permissions, source identity versions, prior participation and separate approval inside the existing shared transaction/lock mechanism. Cross-roster acceptance is serialized; an already accepted member blocks another acceptance.
- Command receipts, roster/participation events, authority evidence and `continuing.roster` audit records commit atomically. Exact retries return the recorded response; changed payloads conflict. Each member links to the one batch authority record and acceptance snapshot.
- The recorded authority is limited to this batch decision and effective date. It is user-attested evidence of the actual decision, not automatic verification of a legal delegation or a reusable application permission grant.
- Read endpoints require operational access. POST endpoints require CSRF and an idempotency key. Client-supplied actor or status fields are rejected by strict schemas.
- A changed identity blocks acceptance. The Coordinator can reject the stale roster and Staff can prepare a corrected replacement. Frozen entries are not edited or deleted. Correcting an already accepted mistaken baseline needs a separately designed controlled correction; direct database edits are not an ordinary workflow.

## API and screens

| Endpoint | Purpose |
| --- | --- |
| GET/POST `/api/v1/continuing-rosters` | Paginated list or prepare a frozen roster |
| GET `/api/v1/continuing-rosters/:id` | Linked identity snapshots and recorded decision |
| POST `/api/v1/continuing-rosters/:id/decision` | Separate Coordinator acceptance/rejection |
| GET `/api/v1/scholars/:id/continuing-baseline` | Profile baseline indicator |

Screens: `src/ContinuingRostersPage.tsx`, `src/ContinuingBaseline.tsx`; navigation in `src/App.tsx`, profile integration in `src/ScholarsPage.tsx`. Existing Excel import remains the supported bulk identity-ingestion path; this phase does not introduce an automatic raw-name-to-person matching importer.

Batch history is available on the roster screen and in the audit viewer. The profile's existing timeline does not yet expand shared roster events; it displays the separate baseline notice instead.

## Validation

- `test:continuing-rosters-db`: isolated synthetic records test authentication, role separation, CSRF, required real-reference fields, duplicate rows, retries/conflicts, self-approval denial, stale identities, concurrent cross-roster acceptance, audit-failure rollback, unknown-history preservation and immutable grants.
- Browser walkthrough: Staff searched Dora, saved a roster, and a separate Coordinator accepted it with synthetic authority evidence and no optional note. The scholar profile displayed accepted baseline and unknown history correctly. Fixture stopped and disposable database cleaned up. Evidence: `output/playwright/phase05/accepted-roster.yml`, `scholar-baseline.yml`, `scholar-baseline.png`.
- Browser retry regression: deliberately aborted the detail GET after a successful save, then pressed Save again. Both POSTs used the same retry key and the roster count increased by exactly one. Evidence: `output/playwright/phase05/retry-regression.js` and `retry-success.yml`. The expected injected network failure was visible; retry recovered successfully.
- The restored-copy foundation test now preserves populated onboarding tables and creates its probe scholar only inside a rolled-back transaction. It no longer assumes every continuing scholar is unregistered or all foundation tables remain empty.
- Local permission migration followed encrypted backup and verified isolated restore. Business data and schemas remained unchanged; only the expected migration row, two permission rows and three role-permission rows were added. Evidence: `output/workflow-phase05/local-migration.json`.
- Standalone lint, 188 unit tests, type checks, build and secret scan passed. Final full regression gate: **37 suites passed**, including the latest retry fix and updated recovery fixture. All recorded source/build hashes verified. Frozen evidence: `output/workflow-phase05/validated-uat/F36-report.json` and adjacent logs. Application readiness remained ready / database connected. Build retains the existing non-blocking bundle-size advisory.

## Recovery and next step

Preserve the encrypted backup identified in the migration report and its external key. The migration is forward-only; do not change the previous 30 migration files or delete accepted baselines.

For an application rollback, disable onboarding entry points and retain evidence. Any privilege rollback must be explicit and retain historical records. Do not restore an old database over later work. Once new records exist, prefer a forward fix with reconciliation.

Next: Phase 06 - the simple semester workspace, individual document coverage, and automatic requirement preparation for accepted continuing scholars. This phase does not yet enable new stipend eligibility or release rules.


## Integration update - 2026-10-07

Phase 06 now connects accepted continuing baselines to semester receiving and missing academic/category capture. Initial school/course/year data uses the existing academic form; semester revisions reuse authoritative placement, preserve unknown findings and carry a known category only across the same course. No fabricated annual admission records are needed. Unknown prior course-shift enforcement remains Phase 10 work. See [Phase 06 evidence and limitations](LDSS_WORKFLOW_PHASE06_WORKSPACE.md); this update does not claim full new-policy eligibility or release support.
