# B2.2 — Supplied School/Course text implementation contract

25 October 2026, Philippine time. **Focused design only; implementation and primary promotion are not authorized by this document.** Recommend one coordinated intake-text and A2.1 compatibility package, developed in a new isolated candidate. Add Scholar will accept optional School and Course text exactly as supplied, including `CNSC` and `BSIT`. These are supplied statements, not verified academic references.

This closes the specific boundary recorded in [B2](../uiux/B2_SCHOLAR_REGISTRY_SIMPLIFICATION_REPORT.md#schoolcourse-free-text--not-implemented), now promoted through [B2 AP1](../uiux/B2_AP1_PRIMARY_UAT_PROMOTION_REPORT.md), and uses the accepted [A2.1 identity/source binding](A2_1_EXISTING_SCHOLAR_IMPORT_IMPLEMENTATION_REPORT.md). No whole-system review is repeated. The reported 65-migration primary and its two Paid records are **dated accepted evidence**, not fresh observations from this design task.

## Recommended solution and fixed boundaries

Keep the existing immutable annual intake and reference IDs. Add **one append-only supplied-text event table**, linked to that intake, with an independent text revision/hash. Record the first text event atomically with a versioned registration command, even when both optional values are unknown. Extend existing annual command receipts with two operation names for later completion/correction. Version the A2.1 review/binding snapshot to pin the independently reviewed text.

This is smaller in compatibility impact than changing the meaning of existing intake revisions. [Annual intake hashes](../../server/scholars/annual-intake-source.ts) already participate in [A2.1 binding validation](../../server/imports/confirmed-scope.ts). Rewriting those snapshots or making text edits change their meaning would disturb accepted historical sources. A separate text chain leaves all `annual-intake/v1` hashes, original intake columns, F53 revisions and F55 bindings intact. Unvalidated JSON notes alone would not supply current-state, correction or retry guarantees.

| Fact | Owner and behavior |
|---|---|
| Supplied school/course wording | New intake text history; exact accepted wording and its source, actor, reason and recording time |
| Initial reference IDs and Year Level | Existing annual intake contract, unchanged; older selected IDs remain visible separately |
| Canonical academic school/course | Existing academic records and approved changes, unchanged |
| Original Excel source | Existing workbook/raw-row/job evidence, unchanged; later review links it to supplied text without rewriting either source |
| Annual New/Continuing | Existing intake root/revisions, including Old compatibility in imports; text commands cannot change classification |
| Annual association and financial readiness | Existing B1 and financial readers; neither supplied text nor a text correction creates participation, eligibility or payment authority |

No directory entry, catalog ID, academic record, enrollment, selection, rollover, source approval or equivalence is created by typing text. School and Course are independent: either may be known while the other is unknown. Do not expand abbreviations, case-fold names, merge spelling variants or infer course duration. No directory-management screen, importer format redesign, Dashboard or unrelated UI batch is included.

## Input, display and validation

New Add Scholar uses two single-line text inputs labelled **School (Optional)** and **Course (Optional)**. Keep supported Year Level entry, initially unselected Scholar Type, identity fields/duplicate review, registration reference/reason and the existing working-year rules. One short explanation suffices: “Enter the wording supplied. Leave unknown details blank. Academic details are reviewed separately.”

Define one shared server/client scalar validator:

- Omitted, explicit NULL, empty string and otherwise valid Unicode-whitespace-only strings mean NULL. Reject prohibited characters before applying the blank rule; a tab/newline is not a successful blank submission.
- A nonblank value contains at most **300 Unicode scalar values**. Preserve its exact sequence, including case, punctuation, accents and any leading/trailing ordinary spaces. Do not trim, collapse spaces, normalize Unicode, expand abbreviations or truncate. `CNSC`, `cnsc` and a full name remain distinct supplied strings.
- Reject non-string values, unpaired surrogates, Unicode control characters (`Cc`), and bidirectional override/embedding/isolate controls U+202A–U+202E and U+2066–U+2069. Ordinary legitimate Unicode letters/marks and punctuation remain supported. Render as escaped text, never HTML.
- Use character-count validation rather than JavaScript UTF-16 length as the server limit. Client feedback must agree; a native maxlength must not reject a valid supplementary-character value prematurely. Keep the existing **8,192-byte registration/mutation body limit**; oversize requests fail visibly, without dropping fields or increasing the limit.

Blank-to-NULL is the only value canonicalization. Exactness applies to every accepted nonblank value, not the user's abandoned blank keystrokes. JSON transport escapes do not change the stored Unicode string. Use binary/canonical string comparison for source checks; the database's case-insensitive catalog collation must not define text equality.

The annual panel shows **Supplied at registration**, **Current supplied wording** and expandable corrections with exact previous values. Show NULL as “Not supplied,” never a guessed school or course. Preserve spaces in the evidence display with appropriate wrapping. Existing initial IDs and canonical academic placement remain separately labelled. Non-NULL text does not fill the existing `missingInitialFields` reference-ID fields; expose separate missing-text information.

Keep Registry placement, school/course ID filters, sorting and exports under their existing contracts. A text-only registration remains discoverable by B1 annual association even when its Registry academic cells are unknown. This batch adds the supplied-text display to the registration result/annual panel, not a raw-label fallback to canonical Registry, academic, graduation or payroll projections. Any future supplied-text Registry search/filter is separate work.

## Proposed F56 storage, constraints and grants

Static inspection finds F55 as the latest SQL migration. Reserve **`20261025020000_f56_intake_supplied_text.sql`** only if still unused at implementation. Proposed readiness is **65 → 66**. No migration file is created by this design.

One new table: **`scholar_intake_text_events`**.

| Columns | Contract |
|---|---|
| `intake_id`, `revision` | PK `(intake_id,revision)`, revision ≥1; restrictive intake FK. Intake determines person/year/origin; do not duplicate competing ownership columns |
| `previous_revision`, `before_hash` | Both NULL for revision 1; otherwise previous_revision = revision−1 and before_hash is its canonical hash. Restrictive self-FK `(intake_id,previous_revision)` prevents cross-intake predecessors |
| `action` | ENUM `registered`, `completed`, `corrected`; `registered` only revision 1, in the transaction creating a new versioned manual intake |
| `school_text`, `course_text` | Nullable `VARCHAR(300)`, utf8mb4 with binary collation; exact accepted strings, no uniqueness or catalog FK |
| `basis_intake_revision`, `basis_intake_hash` | The validated historical F53 intake revision/hash when recording this text event. Not a dependency on the future intake head |
| `source_reference`, `reason` | Existing annual evidence bounds: 3–300 and 5–500 characters after the existing evidence validator. These describe the text assertion/correction, not verification of academic placement |
| `snapshot`, `snapshot_hash` | Valid JSON and canonical SHA-256; complete semantic text state, not a partial patch |
| `actor_id`, `command_id`, `recorded_at` | Restrictive user FK, UUID command, actual UTC DATETIME(6). Unique `(actor_id,command_id)` in this table |

Add CHECKs for action/revision/predecessor shape, nonblank bounded stored values, positive basis revision and valid JSON; enforce the full validator in services too. Add no-update/no-delete triggers. The PK supports current-head and paged history lookups; no school/course text index is justified because this batch does not search the raw labels.

Canonical snapshot format **`intake-supplied-text/v1`** has fixed keys: `format`, `intakeId`, `scholarId`, `academicYearId`, `revision`, `previousRevision`, `beforeHash`, `action`, `schoolText`, `courseText`, `basisIntakeRevision`, `basisIntakeHash`, `sourceReference`, `reason`. Build it on the server using deterministic key ordering and exact strings/NULLs; hash the canonical UTF-8 JSON. Actor/time/command remain immutable columns and linked audit metadata. Validate snapshot/column equality, owner, predecessor and transitions, not merely JSON validity. Highest revision is current; never select an older convenient nonblank value after a correction clears it.

A new registration's existing `supplied_details` is server-built **`manual-intake/v2`**, retaining the existing facts/identity review and declaring `suppliedText: {format:'intake-supplied-text/v1', initialRevision:1, initialHash:<hash>}`. It need not duplicate the text. Its required revision-1 event, including a both-NULL state, is in the same transaction. Missing/mismatched initial evidence is integrity failure, not a legacy NULL fallback. Existing manual/import JSON is never rewritten.

Older manual roots may acquire a first text event through an explicit later command; their root stays v1. No event means a typed absence `{revision:0, snapshotHash:null, schoolText:null, courseText:null}`. An imported root cannot receive manual text events: its source wording remains in its original Excel evidence. A deliberately cleared newer value is distinguishable from legacy absence and from a registration that supplied no value.

The only old-table DDL is to append **`record_supplied_text`** and **`correct_supplied_text`** to the `annual_intake_commands.operation` ENUM. Preserve the four existing values, receipts, hashes, constraints and triggers. For these two operations only, `resulting_revision` is the resulting **text** revision; the stored result explicitly names `textRevision` and `basisIntakeRevision`. Existing operations keep their original intake-revision meaning. Require service-level receipt/event/owner/audit consistency in the one transaction.

Runtime addition: **SELECT/INSERT only** on the new table for the exact owned application identity, without grant option. Existing receipt INSERT grants suffice for the two new operations. No UPDATE/DELETE/DDL, broad schema grant or runtime permission-maintenance grant is added. The migration operator may update the correction permission's descriptive label as approved below; no new permission code or role mapping is proposed. Generate the schema manifest with the existing generator; no old SQL/checksum/trigger is edited.

## HTTP, versioning, transactions and authority

Use existing sessions, CSRF/origin checks, strict Zod objects, UUID parsing, error envelope, read snapshots and annual pending-command guard. The following names are **proposed**.

### Registration

Extend `POST /api/v1/scholar-registrations` with an explicitly discriminated strict body: existing unversioned body is v1; new body requires top-level **`format:'scholar-registration/v2'`**, retains identity/workingContext/reason, and adds `annualIntake.suppliedText:{schoolText:string|null,courseText:string|null}`. In v2 require `initialPlacement.schoolId` and `courseId` NULL; retain supported nullable `yearLevel`. Reject a combined text-and-selected-ID registration instead of silently discarding either. Older v1 clients and saved commands keep the existing optional-ID contract.

Both identity modes still require `scholars.create`; reuse retains identity confirmation/version checks and does not edit the person. V2 uses the existing registration receipt operation names, but hashes an explicitly versioned canonical command. Branch on the body format **before** constructing/defaulting input. Never add text defaults or a version marker to an old command's canonical hash. A same-key v1/v2 change conflicts; an old successful uncertain retry returns its original stored response.

Allocate IDs after successful receipt lookup. Atomically create/reuse identity, create exactly one manual annual root, append text revision 1, write linked registration/text audit and save one registration receipt. Text-event or audit failure rolls back the entire registration, including identity/ID allocation under existing semantics. Return **201**, identity and unchanged v1 intake snapshot fields plus a separate `suppliedText` result. Both NULLs are a valid registration. No academic/profile version, annual selection or participation is advanced by the text event.

### Later text completion and correction

Propose two **POST** routes, each limited to 8,192 bytes with `Idempotency-Key: UUID`:

| Route | Permission and transitions |
|---|---|
| `/api/v1/scholar-intakes/:id/supplied-text/completions` | Existing `scholars.update` **and** `academic.edit` on the same access snapshot. Staff/Coordinator may fill NULL text only, with no established academic/annual/publication/entitlement evidence, mirroring the safe initial-supplement boundary. At least one NULL becomes non-NULL; no known value is replaced/cleared |
| `/api/v1/scholar-intakes/:id/supplied-text/corrections` | Existing `scholars.intakes.correct`, Coordinator only, **subject to the explicit authority extension below**. May replace/clear text or record a first reviewed assertion when routine completion is protected. Requires `reviewed:true`, source, reason and disclosure of established context; no no-op |

Common strict body: `format:'intake-supplied-text-command/v1'`, `expectedTextRevision` (0 allowed), `expectedTextHash` (NULL exactly for 0), `expectedIntakeRevision`, `expectedIntakeHash`, existing `workingContext` including year version, complete `suppliedText:{schoolText,courseText}`, `sourceReference`, `reason`; correction additionally requires `reviewed:true`. Reject actor, state, classification, person/year, academic-ID and payment fields. Return **200** with intake identity/basis and explicit text result. All initial event kinds and successor transitions must be validated; a legacy first event can be `completed` or `corrected`.

Fresh writes require a manual root in the available current working year. Locked/archived/historical years remain read-only; no closed-period correction authority is assumed. Initial-ID supplement and classification routes retain their existing rules and **do not reset or reinterpret text**. Text correction after establishment records a disagreement only; it does not correct a canonical academic record, withdraw an approval or update an import. Show that separate workflow plainly.

**Permission recommendation requiring approval:** extend `scholars.intakes.correct` from supplied classification to these tightly scoped supplied School/Course text corrections. Retain its Coordinator-only mapping and all existing classification guards. Update its descriptive permission label to “Correct supplied annual intake facts” through migration authority. This is a bounded new use of existing authority, not a claim that it was already delegated. Do not repurpose academic approval, configuration management or formal-standing authority; do not add a Staff correction fallback. Pure Administrator/unassigned gain no business power. Routine source collection is not a new approval requirement.

For every command, use the existing authorization/configuration guard and same connection. Check successful receipt under actor/key **before** mutable period/head/source checks; current authorization and CSRF still apply. Exact retry returns the stored result after later corrections or closure; changed operation/path/normalized body conflicts. For fresh commands lock intake first, then its text head, using the same order in text writes and import confirmation. Serialize the absent-head case by the intake lock. Recheck intake/text hashes and ownership; append one complete state, immutable audit and receipt; commit once. Any insert/audit/receipt/source/constraint failure rolls back completely. No nested independent service transaction, upsert, UPDATE or history deletion.

Use audit actions `scholar.intake.supplied-text.recorded` and `scholar.intake.supplied-text.corrected`, with actor/request/command IDs, before/after text pins, historical intake basis, source and reason. The existing registration audit also identifies the initial text event. These do not impersonate academic approval; no automatic notification behavior is claimed. GETs create no evidence/audit approval.

### Reads and pending recovery

Add separate `suppliedText` metadata to annual-intake list/detail results, leaving the v1 intake hash object intact. Use **`GET /api/v1/scholar-intakes/:id/supplied-text/history?limit=25&offset=0`**, existing `scholars.read`, strict limit 1–100, offset 0–1,000,000. History returns complete event states, original/current distinctions, source, reason, actor/time, pins and honest total. Read legacy absence as absence; malformed chain/marker is an integrity error. Validate complete chains in bounded chunks for history/integrity checks, not per Registry row.

Extend `src/annual-intake-api.ts`'s approved-path validator to the two new routes. Reuse its actor-scoped `ldss-annual-intake-command:<actor>` storage and shared `prior-command` exclusion; preserve all old path/body/key formats. Restore saved v1 registration into its original ID-based controls and resend its exact body. New v2 drafts restore text; never convert an uncertain old request to v2. Timeout/network/5xx retains the exact path/key/body; conflict/integrity errors are not an invitation to submit a second command. Successful save followed by a failed read retains the saved result and offers read retry, not another registration. Financial pending-command formats remain unchanged.

## A2.1 approved-import handoff

Keep the eight-column template, workbook parser, original stored cells, reference resolution, approved-selection checks and registration-only reuse boundary. Text is not an alternative academic key. Continue rejecting known initial-ID/classification/year conflicts and established academic/annual/participation histories under existing A2.1 guards.

The existing importer can propose a name that the academic reference resolver saves only during confirmation. Do not demand a fabricated UUID at preview or accidentally remove this existing path. Pin a typed per-field target: `existing_reference` with ID/version, `named_reference` with the exact validated preview name input, or `course_pending` only where already supported. These target descriptors are server-built and part of the staged review/hash. Existing importer normalization/reference creation remains confined to its current authorized workflow; none is applied to the original manual text. At confirm, rerun the existing resolution on the same connection and retain both the reviewed descriptor and actual resulting reference ID in the v2 binding. A changed/ambiguous/archived target fails under existing rules. Manual text commands never call this resolver or create catalog entries.

The academic named-reference validator currently permits 2–160 characters. The new 300-scalar supplied-text allowance does not enlarge that limit or make a long manual label an acceptable academic reference. Review the actual import source/target through the existing supported path, or leave the conflict unresolved; never truncate the original label to make an import pass.

New identity resolutions use **`format:'intake-match/v2'`** and retain every current row/person/version/intake/duplicate/identity-confirmation pin. Add `suppliedTextReview` containing:

- `textRevision` and `textHash`, including explicit 0/NULL absence; server validates the corresponding complete text state.
- Per-field decision: `not_supplied`, `literal_same`, or `reviewed_correspondence`. The server, not the client, determines which decisions are available from the pinned text and actual stored Excel row strings before reference resolution.
- For every `reviewed_correspondence`, an initially unchecked acknowledgment, an actual source/reference (3–300) and explanation (5–500) that the supplied wording and this particular import row concern the reviewed placement. The Coordinator explicitly reviews the proposed reference target or supported unresolved Course pending state. It is a decision for this row, not an alias/directory entry.

`not_supplied` requires the manual value NULL; it makes no contrary assertion about the Excel field. `literal_same` requires exact Unicode equality with that stored Excel field, with no new trimming/case/abbreviation rule. It reports wording agreement, **not verified institutional identity**; existing identity acknowledgment and approved-import confirmations remain mandatory. If a supplied value differs or Excel is blank, it cannot use either shortcut. `reviewed_correspondence` requires Coordinator approved-import authority and source-backed justification. An unexplained contradiction remains blocked. This does not override known-ID, classification, year, source/receipt or established-record guards, nor waive mandatory school/academic validation. Existing Course pending confirmation is still separately required when applicable.

For example, manual `CNSC` and a longer Excel school name require a specific reviewed correspondence; the software never expands `CNSC`. Manual `BSIT` versus another course must not be treated as equivalent because both look plausible. If the manual entry is actually wrong, correct it through the text-correction command, then restage/review; do not use correspondence as an undocumented correction. If evidence cannot resolve the disagreement, do not confirm that row. No import-level create-separate bypass is introduced.

Staff may inspect differences and collect the proposed evidence, but approved imports remain Coordinator-owned/account-private under existing permissions. Editing a choice, source or decision requires a **new immutable staged job**. Preview displays exact supplied/Excel wording, resolved targets, unknowns and created/reused/unresolved counts. Hash the full versioned resolution with the existing workbook/preview context. The workbook file hash and existing raw-row hash remain unchanged; do not claim that a parser's stored cell representation is a new byte-for-byte extraction of the original XLSX.

Confirm locks/rechecks person, intake and text head under the existing shared guard, then verifies the pinned state and per-field decisions on that same connection before inserting any import effects. Source correction/completion after preview causes `IMPORT_STALE` and restaging, including an absence→known change. Batch head/source loading in existing ≤1,500-person chunks; no per-person history/eligibility fan-out.

New confirmations containing reused people emit **`bound-import/v2`**. Store **`import-intake-binding/v2`** in the existing F55 binding `snapshot`/`binding_hash`: all v1 binding facts plus a `suppliedTextReview` with historical revision/hash, exact compared manual/Excel strings, reviewed target descriptors and actual resolved IDs or explicit Course pending, decisions, review sources/reasons and confirming actor. Actor and row ownership must match existing columns/job authority. Existing F55 columns already accommodate this JSON; no F55 column or old binding is updated. Rows created as new people retain their existing import-root source. Result item IDs/row ownership and all prior-review/publication semantics remain unchanged.

Extend the shared confirmed-scope resolver to validate complete v2 raw/preview/result/binding/text-pin ownership, canonical hashes and allowed decisions; wrong, missing, extra, malformed or downgraded evidence fails closed. Verify historical text revision/absence, **not the current text head**, for an already confirmed job. Revision 0 is an immutable binding assertion that the server checked absence under the intake lock, allowed only for a legacy manual root with no required initial-event marker. It has NULL text/hash and no correspondence claim; later completion does not invalidate that historical assertion. Nonzero pins must resolve the exact event and chain. Do not try to reconstruct absence from mutable display state or timestamp ordering. Never silently interpret a v2 marker as v1.

Compatibility rules are explicit:

1. Existing confirmed legacy and `bound-import/v1` sources, receipts, hashes, prior reviews and frozen financial pins remain exact and retain their old interpretation. They do not acquire a dependency on a new text head.
2. A saved unconfirmed v1 match may proceed under its original preview/hash interpretation only if the manual intake still has **no** text events/required v2 marker. Newly present text must reject it as stale, not disappear through an old schema. New previews with reuse always use v2, even when the text state is absent.
3. Old successful confirmation retries use their committed result before fresh source validation, as today. They are not restaged or retroactively enriched.
4. Later text corrections remain visible alongside historical import pins. They do not rewrite a binding, raw Excel row, prior adoption, frozen source or financial source hash. A later new import must review the then-current text. An academic dispute continues through its existing controlled workflow.

The existing prior-approval/historical consumers continue through this one resolver. Do not refactor eligibility/payment writers, refresh frozen pins to conceal a failure, manufacture omissions or invent a second entitlement route.

## Exact isolated implementation boundary

Names below are concrete recommendations, not files created by this task. Present any necessary shared-writer delta before extending this boundary.

| Files | Intended change |
|---|---|
| New F56 SQL; new `scripts/intake-text-preflight.mjs`; `scripts/migration-lib.mjs`; generated `server/schema-manifest.ts` | One event table/triggers, receipt ENUM extension, approved permission-label clarification, exact own-schema grant and owned-target preflight |
| New `server/scholars/intake-text-{model,validation,source,service}.ts` | Strict strings, chain/transition validation, canonical hashes, batched current/historical lookup and same-connection command helpers |
| `server/scholars/annual-intake-{model,validation,service}.ts`; `server/scholars/routes.ts` | Versioned registration orchestration, separate text DTOs/history/routes/receipts/audits; preserve v1 hash builder in `annual-intake-source.ts` |
| `src/AnnualIntakePanel.tsx`, `src/annual-intake-api.ts`, scoped `src/styles.css` | Optional text controls, legacy pending-form recovery, supplied-history/correction UI and keyboard/focus behavior |
| `server/imports/{model,service,intake-binding,confirmed-scope}.ts`; `src/ScholarImport.tsx` | Strict v2 match review, batched pins, new immutable binding snapshot format and old-source compatibility |
| New `tests/intake-supplied-text.test.ts`, `tests/intake-text-preflight.test.ts`, `tests/intake-text-registration.test.tsx`; extend `tests/annual-intakes.test.ts`, `tests/import-intake-bindings.test.ts`, `tests/import-recovery.test.tsx`, `tests/registry-presentation.test.tsx` | Actual validators/transitions/retry/roles/source/navigation contracts; replace only the B2 deferred-text expectation, retain unrelated assertions |
| New `scripts/test-intake-supplied-text-db.ts`, `scripts/test-intake-text-upgrade-db.mjs`; extend `scripts/test-import-bindings.ts`; `package.json` scripts only | Owned integration, populated upgrade/recovery/grants/partial-DDL checks and versioned import scenarios |

Read/regression dependencies: academic/status/continuing, B1 Registry membership, duplicate review, prior approval, historical readers, payments/reconciliation/individual settlement/reports, `src/prior-command.ts` and shared dialogs. Reuse their interfaces; no changes to their business powers or financial/academic writers are proposed. The workbook/parser, directory model, legacy identity endpoint, permissions/role mappings, feature flags, `.env`, launchers and old migrations stay outside the implementation change boundary, except the explicitly approved permission **label** in F56.

Fresh-schema drivers should already use generated manifest length where appropriate. Change an additional hardcoded assertion only if its actual fresh-schema boundary is affected, with a declared mechanical delta. Do not replace intentional 63/64/65 historical-stage checks or modify the original-development checker to accept a different database. Existing primary/retained launch manifests remain untouched during isolated work.

## Acceptance required before promotion is proposed

All mutations use new owned synthetic schemas/copies, with fictional source packets declared before commands. Do not seed retained primary/3011/3012/A–F/V1/V2 or earlier candidates for examples.

| Family | Positive and negative evidence |
|---|---|
| Exact values/unknowns | New and first-digital Continuing with NULL/omitted/empty/space-only values; one known/one unknown; `CNSC`, `BSIT`, case/punctuation/accents, combining versus composed Unicode and preserved surrounding spaces; 300/301 scalar boundary, supplementary characters, controls/bidi/unpaired surrogates, body overflow, strict unknown keys. Readback/history and escaped display agree exactly |
| Identity/classification | New/reused identities, versions above one, duplicate safeguards, initially unselected class, no duplicate person/root, unchanged permanent IDs/contact/first-entry year/class/source. V2 non-NULL IDs reject; valid v1 ID registration and legacy identity endpoint remain compatible |
| Corrections | NULL-only completion; replacing/clearing known wording; first reviewed legacy assertion; no-op/stale/wrong-owner/import-root rejection; correction after establishment has zero academic/financial effects. Both-NULL latest state does not resurrect old text. Class/initial-ID corrections leave text intact and text edits leave v1 hashes/revisions intact |
| Permissions/periods | Staff collect/complete; Coordinator correction/review; pure Admin/unassigned denied; supported combined-role union, current role revocation, CSRF/forged actor and unavailable working year. No closed-period right or Staff correction fallback |
| Atomicity/recovery | Force identity/root/text/audit/receipt/import failures; no orphan event/root or partial import/ID allocation. Concurrent first text event, competing corrections/imports, same-key lost response/exact retry and cross-version/operation conflicts. Old pending v1 registration and saved import retry survive reload unchanged; uncertainty blocks a second command |
| A2.1 handoff | Mixed new/reused New/Continuing rows, 0/NULL absence, both-NULL recorded state, literal agreement, abbreviations versus full labels, genuinely conflicting courses, wrong/missing review and forged pins. Existing-ID and named-reference targets, actual confirm-time creation, ambiguity/archive changes and unchanged 160-character academic-name bounds. Staff cannot confirm. Source-backed correspondence is row-specific; stale text requires restage; known-ID/year/class conflicts and established-record guards still block |
| Immutable sources | v2 one-to-one raw/preview/result/binding ownership, missing/extra/tampered/downgraded evidence, historical text pins and later corrections. Legacy confirmed imports/frozen hashes unchanged. Real separate COR/COG/prior review, Course pending, publication, historical multi-batch/omission and fresh-source validation remain necessary; text/binding alone creates no benefit |
| Upgrade/recovery | New owned populated 65→66 copy; all old rows/checksums/triggers, accounts/password hashes and role mappings exact, except the approved permission label/receipt ENUM definition. New table empty; SELECT/INSERT success and UPDATE/DELETE/DDL/cross-schema denial. Fresh encrypted backup, isolated restore including executable views/constraints, absent/orphan chain probes, wrong-target/proof rejection, partial-DDL stop and reviewed forward repair |
| UI/accessibility | Staff/Coordinator enter unknowns/abbreviations and read exact saved/history values; validation/source/correction permissions and cancel. Keyboard labels/error summary/announcements, modal Escape/trigger focus after remount, 1440/1024/820/375/320 reflow and local scrolling, source review, exact uncertain-body reload/retry. Report native zoom limitations honestly; no CSS substitute or screenshot-based WCAG claim |
| Preservation/performance | Snapshot protected identity/academic/admission/intake/import/Masterlist/prior-review/frozen entitlement/allocation/payment/date/individual evidence before/after text commands and prove byte equality. Text events/audits/receipts are the only intended additions. Compare 25/50/100 annual reads and full 1,500-row import preview/confirm with matched source/role: SELECT counts, rows/bytes, sequential timings and exact outputs. Set-based text heads, no one-query-per-scholar growth, unchanged R01–R07 and complete-output limits |

Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run check:secrets`, new text/upgrade tests, `npm run test:import-intake-bindings-db`, and relevant existing academic, Registry parity, historical independent-batch/omission, recording, reconciliation, individual settlement/correction and financial-report drivers. Use isolated artifact directories and record exact commands/exits, source/fixture ownership/versions and protected hashes. Broaden recovery coverage where the new schema affects it; do not replace financial validators or weaken guards/limits. Recheck the copied original payroll summaries and full fresh previews without committing them. Distinguish legitimate setup effects in disposable formal-standing/payment scenarios from the zero-side-effect assertions for text commands.

## Approvals and delivery gates

| Gate | Concrete recommendation |
|---|---|
| **FT1 — Storage/API** | Approve F56's one append-only table, constraints/triggers, two receipt ENUM values, SELECT/INSERT-only grant, generated 66 manifest, versioned registration/text routes and separate bounded reads |
| **FT2 — Authority** | Approve the bounded extension of Coordinator-only `scholars.intakes.correct` to source-backed supplied-text corrections and its descriptive label; retain current roles and Staff completion restrictions. No new business permission/mapping |
| **FT3 — Import review** | Approve the explicit row-specific correspondence decision, required source/reason/acknowledgment and v2 pins, with all hard academic/identity/source guards and old confirmed-source interpretation intact |
| **FT4 — Implementation/testing** | Authorize only the declared isolated candidate, new owned schemas/copies, fictional examples and failure/concurrency/upgrade/browser/regression work. This design request itself does not authorize that implementation |
| **FT5 — Later primary operation** | Separate exact-target source/schema/grant promotion, fresh verified recovery, coordinated maintenance and read-only primary acceptance after isolated evidence is reviewable. Primary synthetic example writes, if wanted, require separate explicit scope |

Before future code writes, preserve the actual dirty B2 AP1 baseline, build/schema/launch artifacts and retained fixture manifests; do not substitute Git HEAD. Develop in a new external candidate copied from that baseline, with exact server/schema/runtime ownership and verified encrypted copy recovery. Exclude copied sessions/reset tokens/rate limits. Keep credentials/keys private. New preflight must run before F56 and reject retained/original/primary/LAN targets by default; a later primary exception needs its separately reviewed exact-target proof, never a force switch or reused F55 checkpoint.

DDL is not assumed transactional. On partial F56, keep the candidate unavailable for writes, retain the exact applied prefix, and use reviewed forward repair or a newly restored owned copy; no blind rerun/drop of populated history. Existing backup limits, grants and migration checksums remain. No `.env` repoint, startup migration, financial flag change or retained server restart is part of isolated development.

After FT1–FT4 acceptance, a primary proposal must freshly verify `ldss_primary_test_12676_61497616`, its exact restricted runtime, host/listeners/profile, then-current source and all accepted checksums. Preserve all intervening transactions, not an assumed two-Paid checkpoint. Take a fresh encrypted primary backup and verify isolated recovery before maintenance; promote only the reviewed candidate and exact F56 bytes/grant, without candidate people or credentials. Coordinate compatible API/frontend activation, recheck both roles read-only and prove current identity/classification/Masterlist/payment/date/frozen-source preservation. Original development and other retained environments are not upgrade targets.

Before DDL, retain the saved 65-compatible B2 profile. After 66 or text evidence exists, a 65-only binary is not a safe rollback: exact schema readiness rejects it and it lacks text readers. Prepare/test a **66-compatible rollback package retaining text/v2-import evidence readers and old retries, while withholding new text commands/controls**. Coordinate UI/API rollback or forward repair; never delete text/bindings, downgrade F55/F56 or restore stale data over later valid activity. This does not require a new financial or global feature flag.

## Design verification and stop

Reviewed only the B2/A2.1 findings and directly relevant annual registration/validation/source/history/receipt/routes, duplicate/import binding/confirmed-scope contracts, F53/F55 storage, runtime grant/preflight conventions and pending-command recovery. No applicable `AGENTS.md` was found in the checked workspace/document paths and ancestors. No new school authority or real equivalence is asserted by this contract.

This task creates **this one design document** and task-local file-only preservation/link evidence. No application code, migration, permission, account or existing document is changed. No database connection/query, test/build, browser, benchmark, fixture mutation, backup/restore, server restart or localhost command was run. Documentation checks are not operational acceptance. All **1,275 protected existing inputs** match their starting hashes, and local links pass file verification; [starting file manifest](../../output/b2-2-free-text-design-20261025/preservation-before.json) and [documentation verification](../../output/b2-2-free-text-design-20261025/documentation-checks.json) record the file-only scope.

**Stop after this focused design.** Next executable recommendation: approve FT1–FT4 for coordinated B2.2 intake text and A2.1 compatibility in a new isolated candidate. Keep primary 5173 on its accepted B2 source until a separately authorized FT5 promotion.
