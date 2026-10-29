# DM-A — Registration implementation contract

24 October 2026, Philippine time. **Proposed implementation contract; no implementation authorized or started.** Use with the [data-model specification](DM_A_ANNUAL_INTAKE_DATA_MODEL_SPEC.md). The current request authorizes only these two documents and focused design review. All API names, tables, permissions and UI additions below are proposals, not presently callable features.

## Exact next batch and gates

Recommend **DM-A implementation: coordinated A1+A5, with only the A3 compatibility checks and source/read changes required by those two features**. Deliver the schema, registration command, initial completion, explicit annual source/history and bounded discovery together. Include classification corrections only after the permission decision below is approved. Do not bundle reviewed rollover, Registry default changes, import redesign, graduation, optimization, further B3 work or release activation.

| Approval item | Concrete recommendation / consequence |
|---|---|
| Schema and runtime grants | Approve F53 as specified: extend immutable intake root, add revision/receipt tables, narrow SELECT/INSERT grants and generated manifest update. Old migration checksums/triggers stay. This needs explicit implementation/schema authorization, not another business questionnaire. |
| Classification correction authority | Approve **`scholars.intakes.correct`, Coordinator only**, for append-only source-backed corrections. Existing `scholars.update` is routine profile authority; `academic.changes.approve` concerns placement; `continuing.approve` concerns baseline participation; `scholarship.status.approve` concerns formal standing. None explicitly delegates both New and Continuing intake-fact correction. Do not silently repurpose them. |
| Without correction approval | Registration, history and safe initial supplements can be a bounded first release; correction endpoint/control remains absent, original facts remain visible and disagreements are escalated. Do not ship a Staff correction fallback. Prefer approving the complete contract together. |
| Specific real source conflict | A list/reference must identify actual office evidence. A contradictory or unsupported particular case stays unresolved for its applicable authority; it does not require reconfirming New/Continuing definitions for everyone. |

The origin owner, NULL behavior, new endpoint shape, idempotency, indexes, revision scheme and separate import lane are recommended engineering decisions finalized here. No general new selection authority, legal delegation, closed-period correction right or historical import promotion is assumed.

## HTTP and typed contracts

Use JSON with existing same-origin session/CSRF protection, strict Zod objects, UUID parsing, current authorization and existing error envelope. Reject unknown keys; never accept a classification that a legacy parser discards. New registration routes have the existing scholar mutation body limit **8,192 bytes**; references are text, not document uploads.

### 1. New public registration command

**`POST /api/v1/scholar-registrations`**, `Idempotency-Key: UUID`, permission **`scholars.create`** for both new and explicitly reused identities. Reuse creates an annual intake, not a profile edit; it does not require or exercise permission to change personal details. Both Staff and Coordinator currently have scholar creation authority; pure Administrator/unassigned do not.

Illustrative new-person body (UUID placeholders must be replaced by real selected context values):

```json
{
  "identity": {
    "mode": "new",
    "fields": {
      "firstName": "Ana", "middleName": "", "lastName": "Synthetic",
      "suffix": "", "birthDate": null,
      "academicYearId": "<selected-year-uuid>", "barangayId": null,
      "contact": {"email": "", "phone": "", "addressLine": ""}
    }
  },
  "workingContext": {
    "settingId": "<working-setting-uuid>", "settingVersion": 3,
    "academicYearVersion": 1
  },
  "annualIntake": {
    "academicYearId": "<selected-year-uuid>",
    "classification": "continuing",
    "sourceReference": "Synthetic reviewed office intake list 01",
    "initialPlacement": {"schoolId": null, "courseId": null, "yearLevel": null}
  },
  "reason": "Initial current-year digital registration"
}
```

`identity.mode='new'` reuses the existing validated `ScholarFields` and F05 duplicate protocol. Permit optional `identity.duplicateResolution` with exactly the existing snapshot, `decision:'create_separate'` and 10–500-character reason; no new duplicate bypass. Internally pass `expectedVersion:0` to the existing writer. Client-supplied ID/entry-year/actor/import/approval/payment fields are rejected.

Existing-person variant replaces the entire identity object with:

```json
{
  "mode": "reuse",
  "scholarId": "<internal-person-uuid>",
  "expectedVersion": 4,
  "identityConfirmed": true,
  "identityReference": "Compared the existing ID and office identity evidence"
}
```

The UI displays the existing permanent human ID/name and requires deliberate identity confirmation. Recheck current person version and availability; do not silently choose a name match. This variant contains no personal/contact patch fields. Its reference is identity review evidence, not a new source of birth dates or earlier scholarship history. Ambiguous identity means stop/draft, not automatic create/reuse/merge.

Validation choices:

- New and reuse require an explicit academic year, `new|continuing`, real source reference 3–300 characters and reason 5–500. Manual API does not accept `Old`; Excel keeps that compatibility. No default New from ID creation date or Year I.
- New `fields.academicYearId` must equal intake year. Reuse must not change the person's registration year/ID to make it match. Expected working-setting ID/version, actual setting value and academic-year version must all match current available configuration. Missing/invalid/stale working context blocks; do not fall back to a different unlocked year.
- Normalize omitted initial-placement members/empty optional form entries to NULL before hashing. School/course are existing active UUID references when present. Year level is NULL or trimmed nonblank 1–60-character text without control characters; retain supported labels, do not infer academic progression. Optional personal fields retain current validation/empty-string/NULL representation.
- Stored root origin, actor, timestamps and supplied-details format are built by the server. Use `supplied_details` format **`manual-intake/v1`**, containing only the reviewed annual/class/initial/source facts and identity-review reference; avoid a second full copy of optional contact/PII. Original classification/reference remain in this immutable JSON/root even after correction.
- A person/year with an existing intake returns **409 `ANNUAL_INTAKE_EXISTS`** with readable root/current revision/class/source context, whether its class matches or differs. An independent new key is not an instruction to attach a second source or overwrite the first. Same successful key returns the original receipt.
- Detect genuine conflicts with explicit existing intake/admission sources and return **409 `ANNUAL_CLASSIFICATION_REVIEW_REQUIRED`** with the actual source IDs/reason. Do not treat first-entry year, an ordinary Selected stage, a missing past year or a Year I academic level as proof of beneficiary class. Conflicting real office evidence requires controlled review, never automated reclassification.

The conflict check is scoped to the selected person, using existing accepted continuing-baseline and valid earlier official-membership sources. A reviewed prior-beneficiary baseline or valid earlier official membership conflicts with a new first-time-beneficiary claim; return the exact source and require controlled disposition rather than converting the submitted class. Earlier supplied intake facts are displayed as source context, **not independently promoted into proof of admission/beneficiary status**. Mere existence of an earlier intake, applicant/Selected status or person record cannot itself force Continuing or block New. No earlier rows is a valid digital-start case, not a rejection. This check does not inspect/rebuild old grades or payment histories or grant eligibility from the absence of a conflict. Use set-based existing membership/source readers for this person's stored scope; do not run eligibility for every prior year.

Response: existing identity result `{id,scholarId,version}` plus `annualIntake:{id,academicYearId,revision:1,snapshotHash,classification,sourceKind:'manual',sourceReference,recordedAt,initialPlacement,missingInitialFields}`, and `registrationOnly:true`. `missingInitialFields` names actual absent school/course/year values; no `eligible:true` or invented `academicApproved:false` claim about an existing person's unrelated records. A successful create/reuse returns **201**, including an exact replay of its stored response. Current detail can be loaded separately if the receipt is older than later corrections.

Keep **`POST /api/v1/scholars`**, PATCH, duplicate-check and `ScholarService.write` legacy identity-only contracts strict and compatible. The new Add Scholar UI uses the new registration endpoint. Legacy/import/service callers continue their explicit contracts; they do not get implicit manual intakes or inferred classes. Sending `annualIntake` to a legacy endpoint still fails strict validation. This is compatibility for existing identity operations, not permission for the new form to omit annual data.

### 2. Initial detail supplements

**`POST /api/v1/scholar-intakes/:id/supplements`**. Require **both `scholars.update` and `academic.edit`** on the same current access snapshot. Body:

```text
expectedRevision: positive integer
expectedSnapshotHash: SHA-256
academicYearVersion: positive integer
workingContext: same selected setting ID/version contract
initialPlacement: complete requested effective nullable snapshot
sourceReference: text 3..300
reason: text 5..500
```

Reject import roots, no-op requests, replacement/deletion of known values, class/year/origin changes, unavailable periods, stale revisions and any existing academic or scholarship annual record for that year. Fill only unknown initial fields. Append a `supplement_initial_details` revision, linked audit and command receipt; keep person version and all academic/admission rows unchanged. Response **200** includes updated intake revision/hash/current snapshot and actual missing fields. Full or corrected placement goes through the existing academic command separately.

### 3. Classification corrections

**`POST /api/v1/scholar-intakes/:id/classification-corrections`**, only if the new Coordinator permission is approved. Body: `expectedRevision`, `expectedSnapshotHash`, `academicYearVersion`, `classification:'new'|'continuing'`, `sourceReference`, `reason`, **`reviewed:true`**. No placement, period, origin, effective payment date or imported-source mutation is accepted. Reject no-op and unavailable year; keep original root/source and append `correct_classification` snapshot. Return **200** with original/current values, new revision/hash and audit/source identity. Role label alone is not backend authorization.

Before committing, disclose any already-established academic/admission/publication/financial context for this person/year with links to its existing authorized workflows. The action confirms an intake-fact correction only. Store that reviewed context in the audit; do not invent a universal new approval layer, claim old approvals were revoked, or rewrite any frozen source. Changes to underlying approval/eligibility remain their separate guarded operations.

### 4. Read and discovery APIs

- Add selected-year `annualIntake` and provenance/completeness to `ScholarSummary`/`ScholarDetail` as specified in the model. Explicit `contextAcademicYearId` controls historical detail; never display the working year's intake in a different selected year.
- **`GET /api/v1/scholars/:id/annual-intakes?academicYearId=...&offset=0&limit=25`**, `scholars.read`: current supplied snapshots, no fabricated missing-year rows. If year omitted, bounded roots ordered academic year then ID; no full-history-per-person list read.
- **`GET /api/v1/scholar-intakes/:id/history?offset=0&limit=25`**, `scholars.read`: root and append events in revision order, current/replaced values, source, actor and recorded time. Max page 100. Omitted old events in a page are not permission to skip integrity validation for commands.
- Extend list validation with **`associatedYearId`**. Forbid combining it with `academicYearId` or `scholarshipYearId`; if `contextAcademicYearId` is also supplied, require it to match. Resolve classification/placement for that year. Existing selectors keep their meanings. Query COUNT and page with the same set-based predicate, no duplicate identity rows, stable order and existing 25/50/100 limits.
- Preserve existing class filter/enum compatibility, but use the shared source-first current intake expression for displayed values/count/sort. Explicit annual fact takes priority; existing inferred values are tagged `legacy_derived`, not silently treated as supplied. No stored classification backfill and no Registry fresh-default/B1 implementation.

## Transaction, concurrency and exact retry algorithm

Use `AuthorizationService.withPermission` as the outer transaction so `configuration_guard` is acquired **before** user/source locks, consistent with existing writers. Do not open nested independent transactions when calling the identity service. Reuse the importer's scoped same-connection authorization pattern, not its qualification/receiving side effects.

1. Strict-parse and canonicalize input; build operation/target/payload hash. Authorize current actor/permissions on the outer guarded transaction.
2. Read `annual_intake_commands(actor,key)` under lock **before** validating mutable year/source versions. Existing same operation/hash returns stored successful result without reapplying; changed operation/target/body gives `IDEMPOTENCY_CONFLICT`. Authorization/CSRF remain required even for a completed retry. Hash a fixed-key-order normalized envelope `{format:'annual-intake-command/v1',operation,target,input}`; new-identity target is NULL, existing-identity/revision target is the actual person/intake UUID. Normalize the entire discriminated input with fixed constructed keys before hashing; optional NULL/empty initial values follow the rules above. Do not hash raw HTTP JSON property order.
3. On a fresh command, lock working setting/year and relevant references, then selected existing person/root in stable order. Check expected versions and available period. Root rows are serialized with `FOR UPDATE`; global configuration guard also prevents a missing-root phantom race among supported writers.
4. New person: invoke existing `ScholarService.write` through the scoped same-connection adapter, preserving duplicate snapshot and sequence locking. Generate its **internal child request UUID only after parent receipt lookup**; it is a distinct namespace from the caller's parent key, so a legacy `scholar_commands` key cannot accidentally satisfy the parent. Identity, contacts, identifier, inner audit/receipt remain in this transaction. Reuse: do not invoke profile write or increment the person version.
5. Insert the manual root, or validate expected current root/revision/hash and append one permitted revision. Apply DB uniqueness as a final fence; translate its race into the relevant source/existing/version conflict, never `INSERT IGNORE`, REPLACE or overwrite.
6. Insert linked `scholar.intake.registered`, `scholar.intake.supplemented` or `scholar.intake.classification-corrected` audit with original/current snapshot/source, actor, parent key, request trace and reason. Persist the exact result receipt in `annual_intake_commands` in the same transaction.
7. Commit once. On failure of source, audit, receipt, constraint or command, roll back everything, including any ID sequence/person created in this transaction. Lost response retries the same key/body. It does not allocate another ID or root. Do not dispatch a success UI notification until the server confirms.

Two independent actors racing to register the same existing person/year produce one root and an explicit existing/version conflict for the loser. Exact concurrent same-key requests produce one committed response. New identity races retain the existing duplicate review: another creation changes the match snapshot, not an automatic merge. A DB identity uniqueness constraint cannot prove two same-name people are the same person.

Do not increment `scholars.version` merely for an intake revision: financial prior-review sources pin person versions, and these separate supplied facts do not change identity. Use intake revision/hash for its own concurrency. Genuine profile/academic/admission changes continue their existing version/source invalidation rules.

## Form and operational flow

Add Scholar displays the explicit selected working year with required, initially unselected **New Scholar / Continuing Scholar** choice and their definitions. Retain existing required name/duplicate review, optional personal details and permanent-ID allocation. School, course and year level are independently optional initial facts, visibly “Not yet supplied”; no hidden required academic form. State: “Registration records this year's supplied information. Scholarship approval, Masterlist and payment checks are separate.”

On a duplicate, show actual candidate ID/details, let Staff open/review and explicitly reuse, or use the current justified create-separate path. Leave ambiguous cases uncommitted. Do not parse an ambiguous one-field name into invented first/last names merely to satisfy the existing identity validator.

Persist classification/context/initial fields as part of the same reviewed request and exact pending body. Editing while an uncertain request is unresolved cannot produce a second registration; reload recovery must retain exact operation/key/body and appropriate navigation locks. Reuse existing request/recovery patterns, with a registration-specific storage namespace that cannot overwrite a retained payroll/individual request. Apply the existing shared pending-command guard; no new financial command format or recovery refactor.

After confirmed save, open `scholarAddress(id, ..., selectedYear)` using actual supported profile sections; use the existing academic section for full placement and scholarship/continuing sections for their reviews. Include initial intake/history within the selected-year profile; do not invent a receiving deep link that bypasses missing annual ownership. If the detail read fails, retain the successful result/ID and offer a read retry; never encourage a second create. Keep existing list preferences and default unchanged; explicit associated-year discovery makes the newly registered row searchable without fabricating participation.

## Exact implementation file boundary

Proposed new filenames are engineering choices, not files created by this task.

| Files | Intended work |
|---|---|
| `db/migrations/20261024010000_f53_annual_intake_registration.sql` | Root alterations/checks/index; revision/receipt tables and immutable triggers; approved permission seed only if authorized. No old migration edits. |
| `scripts/generate-schema-manifest.mjs` → `server/schema-manifest.ts` | Run existing generator for the approved new migration; no generator rewrite presumed. |
| `scripts/migration-lib.mjs`, `scripts/check-database.mjs` | Add exact new-table SELECT/INSERT allow checks, UPDATE/DELETE denials and approved schema compatibility checks. No global privilege change. |
| New `server/scholars/annual-intake-model.ts`, `annual-intake-validation.ts`, `annual-intake-source.ts`, `annual-intake-service.ts` | Typed strict commands/results, canonical source/revision readers, orchestration, source guards, audits/receipts. Helpers share current intake SQL and canonical hashing. |
| `server/scholars/routes.ts`, `server/app.ts` | Register/wire new endpoints without changing existing identity/import public routes. |
| `server/scholars/{model,validation,service,registry-placement}.ts` | Add annual read projection, source labels, explicit association query and matching count/page/sort; reuse identity writer without implicit intake. Manual provisional placement cannot override approved placement. |
| `server/authorization/policy.ts` | Add proposed correction permission to recognized codes **only after approval**; do not infer role power from UI labels. Permission seed lives in the new migration. |
| `src/ScholarsPage.tsx`, new `src/AnnualIntakePanel.tsx`, new `src/annual-intake-api.ts` | Required year/class/source registration, explicit identity reuse, honest unknowns, initial completion/history/correction where authorized; strict new API and pending-request recovery. No Registry toolbar/default redesign or global CSS rewrite. |
| `tests/{scholars,imports,academic,scholar-navigation,registry-eligibility}.test.ts`, new `tests/annual-intakes.test.ts` | Contract/source/provenance/validation and relevant existing read-path regressions. Preserve legacy parser tests. |
| New `scripts/test-annual-intakes-db.ts`, `scripts/test-annual-intakes-upgrade-db.mjs`; `package.json` only for their scripts | Real guarded atomic registration/upgrade tests in owned disposable schemas; isolated output artifacts, exact ownership and cleanup. Existing retained fixture helpers remain unchanged. |

Review-only regression dependencies, **not proposed edits**: `server/imports/*`, `server/academic/*`, `server/continuing/*`, `server/configuration/{calendar,rollover}.ts`, `server/masterlists/*`, `server/eligibility/*`, `server/requirements/prior-approval-*`, `server/payouts/historical-*`, `server/payments/*`, export/report readers and B3a files. If implementation proves an unlisted shared/schema/permission change necessary, present the concrete delta before broadening scope.

## Import and downstream acceptance boundary

Run the existing mixed import unchanged: New/Continuing/Old labels, preview rows, duplicates, hash/retry/source checks, legitimate approved selection, prior review and Course pending still work. Full approved import remains complete; manual registration is a separate lane. Do not relax the workbook's school/year/academic requirements or add fake selection, receipts or approvals.

A manual root is never reassigned to an import. Duplicate/source conflicts must appear before confirmation where practicable, with transaction rollback as final protection. A source conflict does not justify new financial source hashes, an omitted-scholar relabel, a second entitlement or an upsert over original intake. Current simple imports cannot transparently absorb an existing manually registered person; the data-model specification records that precise A2 boundary. Do not advertise manual initial registration as Already-approved historical payroll import support.

No class or initial-detail command creates/changes academic approvals, scholarship annual records, baseline acceptance, official Masterlists, requirement instances/verification, calendar/semester dates, historical setups, allocations, entitlements, payments, corrections or Original closure. Existing routes remain responsible for all those decisions. A new class root can make someone discoverable; it cannot make them payable.

## Future test specification — not executed here

| ID | Positive and negative acceptance |
|---|---|
| DA01 — Atomic initial New | Explicit working-year New, minimum valid identity and all initial placement NULL produce one person/ID/root/receipt with exact source. Missing/invalid class/year/reference, forged identity/import/actor/approval fields and extra keys reject. No auto academic/admission/member/document/entitlement/payment. |
| DA02 — First digital Continuing | Current-year Continuing succeeds with no N−1 configured/digital rows. No exam, previous-year registration, COG history reconstruction or baseline acceptance is manufactured. Existing admission/publication/eligibility remain blocked until their real requirements are met. |
| DA03 — Unknown versus known initial facts | All eight known/unknown school/course/year combinations; absent optional contacts/DOB/barangay; blank normalization; active/malformed/archived references, year text/control characters and long values. No placeholder references or Course pending exception created. |
| DA04 — Identity reuse/ambiguity | Same person returns same ID and untouched first-entry/person/contact fields; expected-version conflict rejects. Same-name different person uses current justified duplicate snapshot; stale candidate snapshot, >100 matches and unresolved identity stay blocked. No auto merge. |
| DA05 — Unique root and source ownership | Manual/manual and manual/import concurrency, both directions; existing same/different class, changed source and cross-year inputs. One root per person/year; second source is explicit conflict, never rewrite/origin promotion. Existing supported legacy-ID academic import remains its own lane. |
| DA06 — Retry/failure | Exact/lost-response/concurrent same-key retry returns stored response once; changed key payload/operation/target conflicts. Force failure after identity/root/revision/child audit/parent audit/receipt stages: complete rollback and no sequence/root leak. After later source change/period close, a completed authorized retry still returns its original result without reapplying. Role revocation/CSRF failure still denies. |
| DA07 — Supplement | Fill one then remaining NULL manual facts with source history; no-op, known-value replacement, import root, missing either permission, wrong year or existing authoritative academic/annual record rejects. Revision/hash races have one winner. Zero academic/financial changes; person version unchanged. |
| DA08 — Correction | Approved Coordinator-only permission, reason/reference/review and expected snapshot append a correction; original/import cells remain exact, detail/filter/count agree on effective class and history. Staff/pure Admin/unassigned, missing permission, wrong source, no-op, stale revision, period lock and forged placement reject. Correct a correction by another event; tampered/gapped history fails closed. No frozen/source-pin rewrites. |
| DA09 — Annual history/rollover boundary | Supplied N New remains New after a destination annual record/calendar change. No automatic intake/class root from old rollover. A future separately approved reviewed N+1 Continuing operation must preserve N and ID. DM-A tests must not claim A4's review replacement is already implemented. Selected old-year profile displays old-year source, not current global baseline. |
| DA10 — Registry discovery | Intake-only, registration-only legacy, annual-only, overlapping associations and just-created incomplete person: exact one row/count, correct context and bounded 25/50/100 pages. Explicit associated year, existing annual-only selector, historical/All, q/ID search, class/sort/count parity, missing working metadata, wrong combinations, cancel/error/read retry and Back/reload. No fresh-default/B1 change. |
| DA11 — Import regression | Existing mixed New/Continuing/Old preview/confirm and raw hashes/results unchanged; missing school/year/full approved academic data still reject; accepted prior review remains scoped to real import/semester. No class checkbox as eligibility. Test wrong/stale import/source, protected evidence, Course pending and actual entrant alternatives. |
| DA12 — Academic/Masterlist/financial preservation | Register/supplement/correct while snapshotting all academic/annual/member/document/finalization/entitlement/allocation/outcome/Original rows: zero unintended changes. Incomplete people fail existing academic/admission/publication/payroll prerequisites. Existing manual completion/baseline path passes only with real applicable checks. Read-only 800/200 and individual demo remain unchanged in retained baselines. |
| DA13 — Upgrade/grants/rollback | Upgrade new owned copy from accepted 62 migrations; all old intake columns and all protected financial/source hashes exact. Invalid legacy constraints stop visibly. New-table runtime SELECT/INSERT succeeds, UPDATE/DELETE/DDL/other-schema operations deny. Trigger/audit/receipt failures and partial-DDL forward-recovery procedure are exercised. No old checksum edited. |

Existing anchors: [scholar contracts](../../tests/scholars.test.ts), [duplicate algorithm](../../tests/duplicates.test.ts), [import contracts](../../tests/imports.test.ts), [academic prerequisites](../../tests/academic.test.ts), [Registry draft safety](../../tests/registry-drafts.test.ts), [navigation](../../tests/scholar-navigation.test.ts), `scripts/test-scholars-db.ts`, `test-import-db.ts`, `test-continuing-rosters-db.ts`, and historical/payment regressions already registered in `package.json`. Extend the actual validators/services; do not add cosmetic tests that only mirror class names.

### Representative browser acceptance

Use a **new owned synthetic schema/server**, with an unused loopback port confirmed before use and version-matched artifacts. Retain 3011/3012/A–F/V1/V2; do not migrate/reset/reseed them. Record ownership, start-of-task data/grants/frozen/source inventories and private credentials before authorized writes. Synthetic sources are declared before generation; no operational scholar data.

At 1440, 1024 and 820 CSS pixels (plus relevant 320-pixel non-table reflow/keyboard checks), Staff registers New and first-digital Continuing with unknown placement; sees truthful year/class/missing fields; confirms an existing identity after duplicate review; handles stale context, validation and read failure; supplements only initial NULLs. Confirm exact uncertain request survives reload without another person/root. Coordinator views source/history and uses the correction only if its new authority is approved. Staff/pure Administrator/unassigned denial must match backend enforcement. Check focus, full labels, required choice initially unselected, errors, cancel/Back, no hidden academic requirement and no success before confirmation.

Verify current/historical detail, association search and original class after a correction. Complete actual academic placement through existing commands and show that receiving, admission/publication and financial readiness remain separate. Browser financial commits, if any regression requires them, use disposable scenarios; 3011/3012 captures are read-only apart from documented authentication activity and require fresh preservation baselines.

### Proportionate implementation validation

After actual code approval: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run check:secrets`; new annual registration/upgrade drivers; existing scholar, academic, continuing, import/prior-review/Masterlist and Registry parity drivers for affected readers. Because source/provenance reads and a schema transition are involved, include relevant historical multi-batch/omission, Payment Recording/reconciliation and financial report regression/upgrade coverage. Isolate driver artifact outputs. Broaden individual-payment/backup/recovery coverage where the migration/shared-read impact demonstrates it, without rewriting the financial validators or inheriting an old perpetual-green claim.

Record exact commands/exit codes, source/fixture versions and before/after protected hashes. Legacy gates, R01–R07 bounded reads/fresh writes, source-hash checks, unique entitlements and P01–P10 invariants remain. No larger limits, synthetic grade backfill or financial policy workaround.

## Preservation, delivery and rollback

Before future writes, archive the actual dirty-worktree baseline, generated schema/build artifacts, migration/grant inventories and each retained fixture's ownership/current evidence. Do not use Git HEAD as the entire accepted baseline. Preserve old-version fixture launchers/artifacts for their unmodified schemas; new DM-A acceptance runs on a separate owned upgraded schema. No `.env` repointing or global flag change. New code must not silently upgrade a retained fixture when it is opened.

DDL follows inspected repository migration conventions and a reviewed preflight/backup/forward-recovery plan; it is not assumed to roll back with application transactions. After new evidence exists, code rollback must retain compatible reads and disable only new writes. Do not drop intake history, invent school/year placeholders for old code, reassign import ownership or restore a stale database over later valid activity. Deployment/activation/LAN release remains separately authorized.

## Design verification and stop

This task inspected the six requested plans/decision log, actual registration/duplicates/intake/import/academic/Registry/continuing/Masterlist/calendar/prior-review/historical/payment readers, migrations/grants and related tests. Saved synthetic academic verification and the mixed-import test's intake preview/rollback assertions were inspected as dated record evidence; no live intake data is claimed to have been inspected. No applicable `AGENTS.md` was found in the checked workspace/document paths and ancestors. No tests/build, browser, database, migration, fixture, server restart or benchmark was run for this planning task.

A starting file manifest covers **1,115 existing inputs**, including current source/tests/scripts/schema/configuration/build/reports and ten retained fixture manifests. Documentation verification completed: **two documents created, all 1,115 protected existing hashes unchanged, 41 local links valid and no migration created**; see [preservation manifest](../../output/dm-a-design-20261024/preservation-before.json), [final preservation](../../output/dm-a-design-20261024/preservation-after.json) and [documentation checks](../../output/dm-a-design-20261024/documentation-checks.json). These are file/documentation checks, not a fresh operational database/UAT certification. Accepted B3a/603-test/financial evidence retains its own dated scope.

**Stop after these two documents.** Next recommendation: approve the coordinated A1+A5 implementation contract and its explicit schema/grants, and decide the proposed Coordinator-only correction permission. Nothing in this design runs that implementation or authorizes another enhancement batch.
