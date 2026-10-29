# DM-A — Annual intake data model specification

24 October 2026, Philippine time. **Technical design only; not implementation or migration approval.** This specification and the [implementation contract](DM_A_REGISTRATION_IMPLEMENTATION_CONTRACT.md) finalize the proposed prerequisites for A1 and A5. The attached DM-A request is the authority for this review. No application, schema, scholar, annual record, permission, fixture, flag or server configuration was changed or queried operationally.

## Recommendation and approval boundary

**Implement A1 and A5 together**, using the existing `scholar_intakes` as the immutable person/year intake root. Add manual provenance and nullable *initial* placement, an append-only revision table and an exact-command receipt table. Keep registration separate from academic/admission/import orchestration. Use a new strict registration endpoint so existing identity-only callers and imports keep their contracts.

The concrete schema/grant proposal below requires implementation approval. **One specific office-authority decision remains:** approve a new `scholars.intakes.correct` permission, granted only to Coordinator, for source-backed annual classification corrections. Existing permissions do not clearly cover that operation. This recommendation is not an existing grant. The rest of the design makes engineering choices rather than reopening confirmed business questions. Closed/archived-year corrections are excluded from the initial release; no new exception authority is proposed.

A1/A5 do not implement A4/DM-R, B1's default, B2, A2's new import labels, graduation monitoring, policy changes or another financial batch. B3a is completed historical context, as recorded in its [report](../uiux/B3a_PAYMENT_RECORDING_UI_REPORT.md); older plans' B3a-first wording is not a new instruction to repeat it.

## Confirmed business facts and distinct records

Read together: [current-year requirements N01–N07](LDSS_CURRENT_YEAR_WORKFLOW_PLAN.md), [annual classification/rollover plan](LDSS_ANNUAL_CLASSIFICATION_AND_ROLLOVER_PLAN.md), [backlog A1/A3/A5](LDSS_INTEGRATED_ENHANCEMENT_BACKLOG.md), [phased plan](LDSS_PHASED_IMPLEMENTATION_PLAN.md), [Q1–Q15 and B01–B19](COMPLETE_SYSTEM_WORKFLOW_DECISIONS.md), and [Registry/form guidance](../uiux/LDSS_INTEGRATED_UI_UX_SIMPLIFICATION_PLAN.md). These confirmed requirements authorize a design, not software changes.

| Record/fact | Contract |
|---|---|
| Permanent identity | One person and permanent LDSS ID across years. An existing identity is reused after actual identity review. |
| First LDSS entry | `scholar_identifiers.entry_year`/human ID and the person's registration context; not a universal participation-year filter. No DM-A operation rewrites these on reuse. |
| Annual supplied classification | Required `new` or `continuing` for a newly supplied intake in the selected academic year. New: first-time beneficiary selected that year. Continuing: beneficiary before it. Neither means college Year I. |
| First digital year | May be the current year with Continuing classification. No previous digital year, fictitious exam, grade, enrollment, membership or payment is required to record that fact. Existing earlier history remains. |
| Academic placement | Separate authoritative academic record and controlled approved changes. Initial supplied school/course/year can all be unknown. |
| Participation/admission | Existing selection, reviewed baseline and later reviewed-continuation sources. A Continuing intake does not create or accept these decisions. |
| Official membership/semester compliance/payment | Existing distinct workflows and safeguards; intake creates none of them. |

For example, a supplied New intake in year N remains New when year N+1 is opened. Later reviewed continuation can establish Continuing in N+1 through its approved annual workflow. DM-A never rewrites N, synthesizes N−1 or makes calendar advancement a business decision. The current automatic `scholarship_records` preparation remains an explicit A4/DM-R reconciliation dependency, not work silently done here.

## Current implementation and exact gap

| Inspected source | Implemented behavior / consequence |
|---|---|
| [F36 intake migration](../../db/migrations/20261008030000_f36_scholar_intake.sql) | Unique `(scholar_id,academic_year_id)`; required classification, school, year level, import job/source row; nullable course; original cells JSON; actor/time; no-update/no-delete triggers. Annual structure is suitable, provenance and initial completeness are not. |
| [Scholar model/validation](../../server/scholars/model.ts), [validation](../../server/scholars/validation.ts), [service](../../server/scholars/service.ts), [routes](../../server/scholars/routes.ts) | Manual create writes person, identifier, contacts, audit and `scholar_commands`, but no intake. Strict validation rejects an added classification field today. Unknown DOB/barangay and empty optional contacts already work. No school/course/year fields exist on the identity form contract. |
| Scholar service update | Permanent identifier is insert-only, but the existing profile update can change `scholars.academic_year_id`. Do not describe that column as already technically immutable. New annual registration must not use that update to associate an existing person with another year. Existing legacy profile behavior is not redesigned in DM-A. |
| [Import validation/confirmation](../../server/imports/service.ts), [model](../../server/imports/model.ts), [workbook](../../server/imports/workbook.ts), [normalization](../../server/imports/normalization.ts) | Mixed simple rows already accept New/Continuing/Old; Old normalizes to Continuing. Full approved import requires school/year and complete academic data or the existing reviewed Course pending exception. Confirmation inserts intake, and separately runs its authorized academic/qualification/baseline/receiving operations. Do not reuse that whole orchestration for manual initial registration. |
| [Registry placement](../../server/scholars/registry-placement.ts) | Current classification precedence is annual `status='continuing'`, intake, person-level baseline, then annual-row New fallback. Some labels are inferred; an annual status can obscure the supplied intake. Placement falls back to initial intake. New readers need explicit source and completeness, not inference presented as confirmed fact. |
| Scholar list | `scholarshipYearId` selects only `scholarship_records`; `academicYearId` filters the person's registration year. An intake-only person can be excluded by the former. |
| [Academic service](../../server/academic/service.ts), [changes](../../server/academic/changes-service.ts), [Masterlist checks](../../server/masterlists/service.ts) | Authoritative placement remains required; controlled Course pending is separate. Intake completeness alone cannot satisfy qualification or publication. |
| [Qualification validation](../../server/qualification/validation.ts), [service](../../server/qualification/service.ts) | Existing `validate` accepts an explicit `priorQualificationConfirmed:true` attestation and records outside-system qualification evidence without a fabricated exam-score event. It still requires complete applicable academic evidence and its real reference/authority; manual New classification must not call it automatically. |
| [Continuing admission](../../server/masterlists/continuing-admission.ts), [rollover](../../server/configuration/rollover.ts) | Reviewed prior-beneficiary participation exists without invented exams; calendar advance already prepares some annual Continuing rows. Those are not new intake events or proof of the proposed annual review. |
| [Runtime grants](../../scripts/migration-lib.mjs), [grant checks](../../scripts/check-database.mjs) | Runtime has SELECT/INSERT on intake, no UPDATE/DELETE. New append-only tables require narrowly reviewed SELECT/INSERT grants. |

Source inspection found direct intake consumers in Registry placement and Payment Recording's [school-name fallback](../../server/payments/recording-reads.ts). Prior-review and historical source validation instead pin actual import preview/result, owner, academic, document, participation, publication and source evidence; see [prior source](../../server/requirements/prior-approval-source.ts), [prior approval](../../server/requirements/prior-approval-service.ts), [historical context](../../server/payouts/historical-context.ts). This is a source finding, not a live data/grant inspection.

## Designs compared

| Option | Assessment |
|---|---|
| Permanent identity classification | Reject: cannot preserve New in N and Continuing in N+1 or separate annual provenance. |
| Parallel manual registration roots unrelated to intake | Reject: two competing person/year owners; every reader needs conflict reconciliation and import bridging. |
| Change intake rows in place | Reject: destroys immutable evidence and requires prohibited update grants/trigger changes. |
| **Extend intake root; append revisions and receipts** | **Recommended:** existing unique ownership and import FKs remain; manual unknowns are isolated; corrections and exact retries have durable evidence. Two small supporting tables avoid a mutable current-state row. |

## Proposed migration: F53, additive metadata and supporting tables

Proposed new file **`db/migrations/20261024010000_f53_annual_intake_registration.sql`**, subject to rechecking that timestamp/feature number is still unused at implementation. Do not create it during this design task. Existing 62 migration bytes/checksums and immutable intake triggers remain unchanged. Generate the updated schema manifest with the repository generator after a separately approved implementation; never hand-edit old checksums.

### Existing `scholar_intakes`

| Change | Exact intended definition |
|---|---|
| `origin_kind` | `ENUM('import','manual') NOT NULL DEFAULT 'import'`. Default preserves existing import insert column lists. Existing rows acquire the mechanical origin implied by their real import FK, not an inferred scholarship classification. |
| `source_reference` | `VARCHAR(300) NULL DEFAULT NULL`. Required nonblank for manual roots. Legacy imports may remain NULL; display their actual import ID/row/filename as a derived source description. No invented approving office or original approval date. |
| Nullable initial fields | `school_id`, `year_level`, `import_job_id`, `source_row` become nullable, retaining their existing types, FKs and collations. Course remains nullable. Classification stays NOT NULL, with only `new`/`continuing`. |
| Existing uniqueness/keys | Keep root PK and `uq_intake_year(scholar_id,academic_year_id)`, all FKs and immutable triggers. Add `(academic_year_id,scholar_id)` for bounded annual association reads. |

The migration must add a database CHECK with explicitly non-null operands:

```sql
CHECK (
 (origin_kind='import'
  AND import_job_id IS NOT NULL
  AND source_row IS NOT NULL AND source_row >= 2
  AND school_id IS NOT NULL
  AND year_level IS NOT NULL AND CHAR_LENGTH(TRIM(year_level)) BETWEEN 1 AND 60)
 OR
 (origin_kind='manual'
  AND import_job_id IS NULL AND source_row IS NULL
  AND source_reference IS NOT NULL
  AND CHAR_LENGTH(TRIM(source_reference)) BETWEEN 3 AND 300)
)
```

Also enforce `classification IN ('new','continuing')` and `year_level IS NULL OR CHAR_LENGTH(TRIM(year_level)) BETWEEN 1 AND 60`. Explicit NULL checks prevent an unknown SQL expression from accidentally accepting an invalid provenance branch. Application validation additionally rejects control characters and malformed references. A manual reference never stands in for an import FK. An import cannot omit school/year merely because storage now permits manual NULLs.

Migration preflight must inspect actual target rows before adding these checks: valid FKs, unique person/year, valid labels, school/year and source rows for legacy imports. **Stop on incompatible legacy data; do not repair it by guessing, disabling triggers or reclassifying scholars.** No database was inspected here, so universal legacy constraint compliance is not certified.

### New `scholar_intake_revisions`

Root is virtual **revision 1**. Each later row is a full supplied-fact snapshot, not an academic decision.

| Column / key | Proposed definition |
|---|---|
| `intake_id`, `revision` | Root FK with RESTRICT, `INT UNSIGNED`, PK `(intake_id,revision)`, CHECK `revision>=2`. |
| `action` | ENUM `supplement_initial_details`, `correct_classification`. |
| `classification` | NOT NULL ENUM New/Continuing codes; effective supplied value after this event. |
| `school_id`, `course_id`, `year_level` | Nullable initial-fact snapshot; same types/FKs as root. Unknown is NULL. No fake reference creation or academic approval. |
| `before_hash` | ASCII binary `CHAR(64)`, lowercase SHA-256 of the preceding canonical intake snapshot. |
| `reason`, `source_reference` | Required `VARCHAR(500)` / `VARCHAR(300)`; application bounds 5–500 / 3–300 and no control characters. DB nonblank checks. |
| `actor_id`, `command_id`, `recorded_at` | User FK, UUID command key, UTC `DATETIME(6)`, server assigned. UNIQUE `(actor_id,command_id)`. |
| Protection | No-update/no-delete triggers. No mutable head pointer. Lock root, compare expected revision/hash, then append the next contiguous revision. |

All UUID FKs use the existing `CHAR(36) CHARACTER SET ascii COLLATE ascii_bin` convention; use utf8mb4 for human text. No cascading deletion. Gap/missing-predecessor/hash inconsistency fails closed as an intake integrity error; readers must not silently fall back to revision 1.

### New `annual_intake_commands`

Columns: `actor_id` user FK; `command_id` UUID; `operation` ENUM `register_new_identity`, `register_existing_identity`, `supplement_initial_details`, `correct_classification`; `payload_hash CHAR(64)`; `intake_id` root FK; `resulting_revision INT UNSIGNED >=1`; `result JSON NOT NULL`; `recorded_at DATETIME(6)`. PK `(actor_id,command_id)`. Add no-update/no-delete triggers. The receipt references its root after insertion; avoid a circular root→receipt FK. The root's actor plus this receipt and the linked audit supply exact manual command ownership.

Store the original successful response, not a reconstructed current response. Hash the normalized operation, target and complete validated payload, excluding CSRF/session tokens and transport trace ID. A key reused for another target/operation/payload conflicts. Do not broaden or replace `scholar_commands`; the legacy identity receipt remains compatible.

### Grants and release compatibility

Keep existing root SELECT/INSERT rights. Add **SELECT, INSERT only** on the two new tables to the existing restricted application identity, via `grantAuthRuntime`. Add corresponding allow/deny checks and schema-manifest coverage. No runtime UPDATE/DELETE, DDL, RBAC write, global grant or cross-schema privilege is needed. Permission catalog/Coordinator mapping, if approved, is deployment-time migration data; the runtime cannot assign itself authority.

This is a real schema transition, not a UI-only patch. On a new owned test schema, test upgrade from the accepted 62-migration baseline and verify all old-column values and protected snapshots. Retained 3011/3012 remain on their existing schema/app versions; do not migrate them to make this test pass. Future test setup needs version-matched server/client artifacts on a separate owned loopback port. A hard-coded migration count in an older fixture launcher is not permission to edit its manifest or upgrade its database.

## Source, revision and completion rules

1. **One root per person/year.** New manual registration inserts `origin_kind='manual'`; import confirmation continues inserting import roots. Origin, root actor/time, import link/row, original supplied JSON, identity and year never change. There is no claim of separate manual and import roots for the same person/year.
2. **Source reference is required.** New uses the real selected-list reference; Continuing uses the actual prior-beneficiary/current intake reference. This records who supplied what, not legal approval of a form/list, acceptance of prior COR/COG review or a physical receipt date. No prior digital history is demanded.
3. **Unknown fields are honest.** Initial school/course/year can independently be NULL; known IDs must resolve to active configuration entries. The current catalog has independent school/course references: do not invent a school/program affiliation rule. No typed placeholder or automatic reference-catalog creation in the initial lane. Keep optional person/contact representation as currently implemented.
4. **Partial completion remains provisional.** A supplement may fill only currently NULL initial placement fields on a **manual** root; classification and already supplied values must be unchanged. Require expected intake revision/hash, `scholars.update` **and** `academic.edit`. Allow only while no academic record or scholarship annual record exists for that person/year. It creates no such record. This conservative boundary prevents a late initial fact from overriding approved Course pending or other placement.
5. **Authoritative completion remains existing academic work.** When complete evidence is available, use `AcademicService.create`/controlled changes for that year; it is a separate command and permission. If an academic/annual record already exists, or an original known initial value needs replacement, the supplement path refuses and directs to the controlled academic process. Completing next year's placement does not fill or overwrite last year's intake. Current COR/prior completed-semester COG/entrant evidence stays separate.
6. **Correction changes classification only.** Coordinator's proposed permission permits an append event with explicit source, reason, expected revision/hash and `reviewed:true`. It must preserve every initial placement field, root ownership and every original source. Staff can report a problem through office review; no new Staff approval queue or universal different-person rule is invented. A later correction of a correction is another event.
7. **Published/frozen evidence remains as recorded.** A classification correction does not edit admission, participation, imported cells, publication snapshots, pinned prior approvals, financial source hashes, entitlements or outcomes. Show “Originally supplied …; corrected to …” with history. An actual conflict needing an admission/academic/financial change remains a separate blocked/reviewed workflow. Do not silently refresh a pin to match the corrected display fact.
8. **Year guards apply.** New intake and supplementation target only the explicit, available working year and require its expected setting/year versions. Corrections may target an existing available year, with its expected year version; locked/archived years stay read-only. Exact successful retries are returned after fresh authorization and receipt lookup even if the year later closes; they perform no new write.
9. **No automatic renewal.** A supplied Continuing fact is not reviewed continuation. A4 must later link its actual annual-review evidence without relabeling old roots or pretending the current calendar automation supplied a class. Contradictory explicit source facts require review; person age, ID year, school year level and mere system presence never choose classification.

## Current and historical readers

Create one set-based current-intake source helper: root joined to its highest valid revision, one row per person/year. Root revision 1 is selected only when no revision exists. Validate selected history/hash chains on detail/write; list projections are bounded and never load every person's full history.

Expose an `annualIntake` object on the selected-year scholar projection: intake ID/year, original/effective classification, revision/hash, origin/reference, current initial fields, missing initial fields, and `basis:'supplied'`. No root means `annualIntake:null`, not a fabricated New intake. Actual academic readiness is a separate read from authoritative academic records.

Define the snapshot hash with the existing SHA-256 `digest(JSON.stringify(value))` over this **fixed-key-order** normalized object, using UUID strings and explicit NULLs rather than omitted keys:

```text
{
 format: "annual-intake/v1",
 intakeId, scholarId, academicYearId, originKind, revision,
 classification,
 initialPlacement: { schoolId, courseId, yearLevel },
 source: { rootReference, currentReference, importJobId, sourceRow }
}
```

`rootReference` stays NULL for a legacy import without that column value; never hash a dynamically formatted filename/name as its replacement. `currentReference` is the last revision reference, otherwise the root reference. Import FK/row identify legacy import provenance. Record actor/time separately as immutable audit/history metadata. `before_hash` equals the preceding revision's hash under this same format; command bodies supply expected revision **and** hash. This is an intake-local concurrency contract, not a replacement financial/import fingerprint.

For Registry display/filter/sort, prefer **effective supplied class before annual-status fallbacks**. Retain the old derived label only with explicit `classificationBasis:'legacy_derived'` and a separate `legacyClassification`; it is not a newly confirmed annual fact. Canonical `annualIntake.classification` is NULL/absent in that case. Use the same displayed-class expression for list, count, filter and sort; preserve the existing query/enum shape and deterministic tie-breaking. Label legacy-derived values so Staff cannot mistake them for a supplied intake. This is a deliberate read-precedence/source-label change to test, not a migration that reclassifies old rows. A legacy derived value must never override an explicit New fact for a historical year.

Initial placement is provisional and secondary to `academicCurrent`. For manual roots, use initial facts only if **no authoritative academic record exists for that year**; do not COALESCE a supplied course into an approved academic Course pending NULL. Keep existing imported/frozen placement sources unchanged. No financial reader is switched to the new provisional revision projection.

Add an explicit **`associatedYearId`** list predicate for Registry discovery:

```sql
EXISTS (SELECT 1 FROM scholar_intakes iy
        WHERE iy.scholar_id=s.id AND iy.academic_year_id=:year)
OR EXISTS (SELECT 1 FROM scholarship_records ry
           WHERE ry.scholar_id=s.id AND ry.academic_year_id=:year)
OR s.academic_year_id=:year
```

This is a display association, not an eligibility cohort. Deduplicate by person; identify which association(s) exist. The last branch keeps legacy registration-only people discoverable and is labelled **registration-year association**, not confirmed participation. Preserve existing `scholarshipYearId` (annual-record-only), `academicYearId` (person registration context) and explicit `contextAcademicYearId` semantics. Reject mixing the new association selector with the old cohort selectors rather than guessing their intersection. Keep count/page identical, bounded pages, current/historical/All choices and direct profile context. **Do not change the fresh-view default in DM-A; that remains B1.** After save, open the known person/year detail so an active unrelated list filter cannot hide successful registration.

## Downstream compatibility and import ownership

| Consumer | Required compatibility |
|---|---|
| Registry/profile | Supplied class, revision/source, honest missing facts and annual association; separate first-entry, academic and admission facts. No unfiltered default change. |
| Continuing roster | Existing prepare/Coordinator acceptance still establishes prior participation. Manual Continuing intake alone does not accept a roster or create participation. |
| Annual rollover | Per-year root/history supports N/N+1 without rewriting N. No changes to calendar automation or reviewed annual continuation in A1/A5; DM-R remains required. |
| Masterlist/admission | Existing complete academic, selection/reviewed continuing, standing, approval/separation and publication rules. Intake alone cannot provide an annual scholarship ID or member snapshot. |
| COR/COG receiving | Existing owner/coverage/setup/receipt/verification/timing requirements. No document generation or review as a registration side effect; no freshman exemption from class/year level. |
| Academic placement | Existing full creation, changes, prior-permission checks and published/frozen protections. Supplemented initial facts are never approved placement. |
| Eligibility/historical payroll | Existing annual record, confirmed import, current scoped prior approval, real semester/date/publication/source ownership and duplicate-entitlement rules. Never substitute a manual command ID for an import ID. |
| Payment Recording/Individual Payments | No command/read contract change. Existing school fallback continues reading immutable base intake where used; the new provisional revisions do not alter frozen financial evidence or payment amounts. |
| Reports | Existing financial bases, full rows/precision and unique entitlement totals remain. Any future registration export must label supplied versus legacy-derived class; no new financial report is included. |

**Import compatibility is not automatic promotion.** Leave the eight-column parser, normalization, row previews, duplicate review, stored preview/result hashes, Coordinator approved-selection/prior-review controls and full academic requirements intact. Existing imported roots default to import origin without changing original values. No generic insert-then-ignore/upsert on `uq_intake_year`.

If a new import encounters a person/year with an intake, retain that root and fail with a reviewed source-conflict result; do not overwrite manual ownership or create another person. The current simple template has no Scholar ID column and warns on existing identities. The existing legacy template can reference an ID for its supported academic-addition workflow, but does **not** thereby become an Already-approved simple import or qualify for prior-batch adoption. The prior-review service explicitly requires approved-selection preview rows and `selectedCount`. A1/A5 do not promise a new manual-intake→approved-historical-import promotion path. Complete manual registrations through existing academic/admission/baseline workflows; any later supported import binding belongs to a separately scoped A2 source-ownership change, preserving both sources. This is a known bounded integration limit, not an unresolved request to weaken imports.

## Data preservation and validation status

Future migration acceptance must preserve every existing root's original columns, all import previews/results and hashes, all previously approved/frozen sources, audit/history and financial records. Added metadata is qualified separately from old-column byte/value equality. Runtime grants are compared before/after against exactly the approved additions. DDL is not assumed transactional; follow the repository's reviewed backup/forward-recovery process. After new roots/revisions exist, disabling new writes must retain compatible readers/history; do not delete evidence, reassign origin, fill NULLs or restore a stale database over later transactions.

This design task read source, migrations, plans and tests only. It ran no application test/build, database query/migration, browser login, benchmark, fixture, permission or activation command. The 3011/3012 and P01–P10 results remain evidence in their dated reports, not a new acceptance claim. Documentation/preservation checks are recorded in the companion contract.
