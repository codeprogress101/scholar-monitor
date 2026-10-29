# P06 — Editable OR/DV Document Generation

Date: **22 October 2026, Philippine time**. Scope: local implementation and disposable verification only. **Technical verification passed; ready for P06 acceptance review. Draft templates still require Scholarship Office approval.** P07–P10, LAN deployment and production changes are not authorized.

## A. Implementation

Unclaimed stipends produce **DV only**. An eligible omitted scholar requires the existing Coordinator-authorized prepared transaction and produces **OR + DV**. Staff uses **Individual Payments → Review → Prepare Documents → Download Word**. The payee starts blank; Office, payee address and an additional explanation are optional under Additional Details. Authoritative identity, semester, amount, entitlement, route and original approval are not editable through this form.

The new `server/payments/document-{model,source,word,service,routes,brand,template-fingerprint}.ts` modules and `scripts/generate-document-template.mjs` implement the source contract, bounded editable fields, integer-centavo words, versioned renderer, metadata history and protected downloads. `src/IndividualDocuments.tsx` is lazy-loaded from the existing Unclaimed/Omitted workspaces. Existing retry handling is extended through `src/document-command-conflicts.ts`; an uncertain submission retains its exact payload/key across reload.

`server/app.ts`, `server/config.ts`, the two existing individual-payment services, runtime grant generator, schema manifest and build registration are extended additively. The P04/P05 services expose narrow document-review helpers that reuse their existing consequential checks. The official payroll Word renderer is unchanged. The accepted P05 fingerprint comparison records every changed/new source file separately from pre-existing uncommitted work.

New API routes under `/api/v1/individual-payments`: `GET documents/availability`, `GET transactions/:id/documents`, `GET transactions/:id/documents/history`, `POST transactions/:id/documents/generate`, and `GET transactions/:id/documents/:kind/word` (`OR` or `DV` only). The shared generation command publishes both omitted forms atomically; there is no independent financial or per-file mutation endpoint. [Frozen file inventory](../../output/p06-documents-20261022/candidate-fingerprints.json) distinguishes the new modules and approved changes from the accepted P05 baseline. Test additions include document unit/retry cases, shared route lifecycle/backup/upgrade checks and five registered integration suites; existing fixture migration-count assertions advance to 61 without changing their business expectations.

F51 adds two tables and one supporting composite unique index:

| Structure | Why existing storage is insufficient |
|---|---|
| `individual_document_versions` | Existing financial events describe transaction/route decisions, not immutable per-kind generation provenance, permitted field revisions and exact file hashes. Financial history is not repurposed as a document ledger. |
| `individual_document_contents` | Holds only the latest OR or DV bytes. Separating mutable latest content from append-only generation evidence permits regeneration without rewriting history or indefinitely duplicating binary history. |
| Header `(id, source_kind)` unique index | Supports a composite foreign key enforcing ownership and the rule that an Unclaimed transaction cannot have an OR. It creates no new entitlement or payment identity. |

Current content references its exact immutable version/hash. MariaDB checks decoded size/hash and route kind. Runtime access cannot update/delete version history or change current-file identity. No existing business rows are backfilled; generation is disabled by default through `INDIVIDUAL_DOCUMENTS_ENABLED` and also requires the existing route activation.

## B. Document results and field mapping

The user subsequently supplied native Publisher samples, inspected read-only with macros disabled:

- `C:/Users/ADMIN/Downloads/DV.pub`
- `C:/Users/ADMIN/Downloads/OBR.pub` — the form title is **OBLIGATION REQUEST**.

Both are one-page **612 × 792-point Letter portrait** samples. Original hashes, read-only copies, shape/field inventories and native page images are retained privately under `output/p06-documents-20261022/references/`. They are payroll-level samples, not approval of an individual-payment form. The original editable Word forms remain unavailable; this did not block prototype creation.

The adapter `daet-individual-draft/v1` records provenance, mapping version, allowed fields and a reproducible source/asset/library fingerprint. Replacements belong behind the renderer contract; an office-approved replacement needs a new stable template version and its own verification, not changes to payment logic. No arbitrary template upload or execution endpoint exists. The originals remained byte-for-byte unchanged: DV SHA-256 `00f0f163146d00199a20a48210f550cb4bf319f7a4b5b216b37c6cbe92e9834a`; OBR SHA-256 `6b7b76fcf032d7ad55f8c5dbb346f7acabe5b2242c881a6a09381694ac4f43b6`.

| Area | Population |
|---|---|
| Identity/year/semester/amount/purpose | Fresh server-side transaction and existing financial review. Original payroll and clearly labelled LDSS internal reference are retained. |
| Peso words | Exact integer centavos; PHP 5,000.00 becomes **Five Thousand Pesos Only**. Unit cases include centavos, singular values and invalid monetary input; the existing entitlement amount constraint remains unchanged. |
| Payee/office/address/additional note | Explicit permitted draft entries, with actor/revision history. The scholar is not assumed to be the official payee; an unverified address is not auto-filled. |
| Official OR/DV numbers, TIN, fund/account/FPP/responsibility codes | Blank when unknown. LDSS internal references do not occupy official-number fields. |
| Mode-of-payment ticks, certification ticks, signatures, officials, cheque/bank details and receipt dates | Blank/unchecked. Nothing acknowledges payment, certifies a finding or copies sample officials. |

Editable samples: [OR](../../output/p06-documents-20261022/visual/or-default.docx), [DV](../../output/p06-documents-20261022/visual/dv-default.docx), [long OR](../../output/p06-documents-20261022/visual/or-long.docx), [long DV](../../output/p06-documents-20261022/visual/dv-long.docx). Actual authorized HTTP/browser downloads are retained separately in the private `samples/` evidence directory.

## C. Security and financial integrity

All endpoints use existing `ovr.process` authorization, sessions and CSRF protections. Pure Administrator access is denied. Source identity, ownership, current prepared/unpaid route, approval, claimability, standing and conflicting financial evidence are revalidated through existing services. Guessing another/unavailable transaction, changing kind/route/financial fields or supplying a template/path is rejected.

Generation first pins current source, authorization, document revision and allowed template. DOCX rendering occurs **outside** the pooled SQL transaction. Publication obtains the existing configuration/entitlement locks and repeats authorization, journal and source/template checks. The files, version evidence, current pointers, audit and retry receipt commit together. Failure retains the previous current files. Download rechecks current financial/template validity and exact stored bytes/hash, audits access, and returns an attachment with `no-store` and `nosniff`.

Disposable tests cover exact/lost-response retries, changed-key conflicts, concurrent one-winner generation, audit rollback, interrupted rendering, permission revocation, source/template changes during rendering, restricted grants and cancellation blocking. Original payment, entitlement, route, allocation, closure and frozen-evidence hashes are compared across document operations. No individual Paid transition or cheque-release feature is added.

## D. Performance and storage

| Fixture / operation | Samples | Median ms (single writes observed once) | SELECTs | Response bytes | SQL client ms |
|---|---:|---:|---|---|---:|
| unclaimed / Initial document review | 3 | 39.45 | 96 | 1214 | 30.86 |
| unclaimed / Generate | 1 | 151.50 | 184 | 151 | 76.87 |
| unclaimed / Download DV | 3 | 43.61 | 93 | 204865 | 32.06 |
| unclaimed / Regenerate | 1 | 153.48 | 184 | 151 | 84.42 |
| omitted / Initial document review | 3 | 49.41 | 124 | 1892 | 40.18 |
| omitted / Generate | 1 | 211.03 | 240 | 180 | 97.13 |
| omitted / Download OR | 3 | 55.51 | 121 | 204621 | 44.00 |
| omitted / Download DV | 3 | 53.50 | 121 | 204886 | 42.04 |
| omitted / Regenerate | 1 | 182.18 | 240 | 180 | 81.87 |
| unclaimed-835 / Initial document review | 3 | 118.34 | 96 | 1231 | 51.23 |
| unclaimed-835 / Generate | 1 | 335.21 | 184 | 151 | 114.98 |
| unclaimed-835 / Download DV | 3 | 117.85 | 93 | 204890 | 50.68 |
| unclaimed-835 / Regenerate | 1 | 354.51 | 184 | 151 | 173.24 |

Supplemental already-ready DV metadata reads used the existing small disposable P04 fixture in a separate disposable fixture: three sequential HTTP reads measured **52.00 ms median**, **2050 response bytes**, **96 measured SELECTs**, and **32.09 ms SQL client time**. The server-hook and HTTP measurements are retained separately; this is not a before/after speed claim.

| Fixture | Post-GC read repetitions | Heap first → last MiB | Heap range MiB | Sampled retained RSS peak MiB | Pool first → last |
|---|---:|---|---|---:|---|
| unclaimed | 20 | 59.93 → 59.77 | 59.75–59.93 | 196.61 | 2 → 2 |
| omitted | 20 | 57.94 → 57.79 | 57.77–57.94 | 193.33 | 2 → 2 |
| unclaimed-835 | 20 | 150.37 → 150.13 | 150.12–150.37 | 826.28 | 3 → 3 |

All 20-read samples returned every pooled connection and left no queued waiters. No out-of-memory error occurred. These are repeated metadata-read observations, not a 20-generation soak or a production capacity test. The full-cohort fixture inherits memory retained by the existing financial regression; its RSS is not attributed solely to document generation.

The largest measured populated fixture backup used **54,953,936 raw SQL bytes**, leaving **12,154,928 bytes** below the unchanged 64 MiB limit. This is measured fixture headroom, not a guarantee for an arbitrarily large operational document collection. Each current DOCX adds its base64 storage and version metadata to subsequent backups.

 Benchmarks use actual authorized HTTP/service calls, three warm read/download observations and single write observations. SQL time is measured client roundtrip, not database CPU. Unpaired timings and GC/RSS samples are observations, not a capacity guarantee.

Opening the workspace checks bounded availability and never generates a file. The document view loads selected-transaction metadata; history is requested only when opened and is paginated. Binary content is fetched only by an explicit download. Existing request-scoped caching, source validation, query batching and invalidation remain in place. No cross-request eligibility cache, full Registry refresh or cohort-wide eligibility calculation is added to show the document button. Canonical validation still reads necessary original frozen evidence; its cost is not hidden by a loading indicator.

Each file is capped at 262,144 decoded bytes. Only current content is stored; generation metadata remains append-only. Existing database packet and encrypted backup limits are not increased. The raw SQL backup cap remains **64 MiB**, so large document collections require capacity monitoring and a separately reviewed storage/backup change before exceeding that limit. Populated backup/restore measurements and exact headroom are retained with recovery evidence.

Equivalent existing-path observations from the final frozen rerun (three warm reads; single write observations):

| Existing path | Before ms | After ms | SELECTs before → after | Response size |
|---|---:|---:|---|---|
| P04 Unclaimed queue, actual 835-member payroll | 24.52 | 40.01 | 8 → 8 | Unchanged |
| P04 nonempty next page | 24.85 | 28.11 | 8 → 8 | Unchanged |
| P02 summary | 25.68 | 29.68 | 13 → 13 | Unchanged |
| P03 reconciliation | 20.11 | 23.10 | 20 → 20 | Unchanged |
| P05 first search page | 13.78 | 16.09 | 15 → 15 | Unchanged |
| P05 next search page | 13.99 | 16.70 | 15 → 15 | Unchanged |
| P05 prepare OR + DV, one observation | 96.66 | 113.93 | 246 → 246 | Unchanged |
| P04 cancellation, one observation | 8.19 | 9.54 | 9 → 9 | Unchanged |

The P05 search fixture contains three genuine source scholars and 832 deliberately unassessed search rows; it does not establish 835 eligible omitted scholars. Its before measurement was collected before P06 edits; P04 comparisons use the immutable accepted P05 archive. The after copies were captured immediately following the corresponding R2 suites. Application/build/migration hashes match R1; only two fixture files changed between runs.

Measured latency increases are retained: P04 queue 24.52 → 40.01 ms (63.2%), with instrumented SELECT client time 22.11 → 37.53 ms. The earlier passed R1 suite measured 26.43 ms for that queue. P05 preparation also varied (96.66 ms before, 134.95 ms in R1, 113.93 ms in R2). These are unpaired observations on a shared Windows/MariaDB host, not proof of a specific cause. Query counts, response sizes and financial results match, and no improvement is claimed. Sustained latency/capacity remains a rollout check; no unrelated optimization or weakened source validation was introduced.

The known R07 full-detail peak-memory and larger-roster evidence-size limitations remain separate; this phase does not claim to fix them.

## E. Visual verification

Native Publisher page images were inspected, and Word 16 rendered four editable prototypes into actual PDFs. Every representative page was viewed. Standard OR and DV and the long OR each use one page; the extreme long DV uses two pages, with its complete final certification/receipt block intact. All five physical pages are Letter portrait. Automated PDF checks compare every editable DOCX text run with extracted PDF text, verify page/text bounds, and require the draft notice and internal reference on every page.

Side-by-side Publisher comparisons: [OR](../../output/p06-documents-20261022/visual/or-publisher-comparison.png), [DV](../../output/p06-documents-20261022/visual/dv-publisher-comparison.png). Rendered pages: [standard OR](../../output/p06-documents-20261022/visual/or-default-contact.png), [standard DV](../../output/p06-documents-20261022/visual/dv-default-contact.png), [long OR](../../output/p06-documents-20261022/visual/or-long-contact.png), [long DV, both pages](../../output/p06-documents-20261022/visual/dv-long-contact.png). Browser examples: [document review](../../output/playwright/p06-document-review.png), [tablet](../../output/playwright/p06-document-tablet-final.png), [Unclaimed DV](../../output/playwright/p06-unclaimed-ready.png).

These are Word table reconstructions, not pixel-exact or officially approved forms. Draft notices, individual narrative, blank officials and internal-reference footer are deliberate adaptations. Typography, row spacing, logo positioning and simplified border treatment differ from the samples; exceptionally long fields can create a continuation page. The existing municipality/LDSS logos and a proportionally resized supplied Maogmang image are used without redrawing the marks. No document is flattened into a screenshot.

LibreOffice was unavailable; its packaged render attempt failed and is not counted as a pass. The first Word automation connection also stalled on an independent one-paragraph control. A separately verified COM connection to the **owned** test instance rendered successfully; no user Word session was attached or closed. Publisher PDF export stalled, while native read-only page-image export succeeded. These automation failures concern the QA environment; runtime DOCX generation uses the existing Node `docx` library and does not automate Office.

## F. Quality gates and recovery

**Passed:** the complete approved UAT runner finished all **73 suites**, including all 68 existing suites and five P06 additions. It ran from 2026-10-22T11:09:22.267Z to 2026-10-22T12:13:39.296Z (UTC) with unchanged frozen source. Lint, **568 unit tests across 92 files**, TypeScript, production build and secret scan passed. [Full gate evidence](../../output/p06-documents-20261022/uat-r2/F36-report.json).

The actual 835-scholar P06 fixture passed with 10 Unclaimed and 825 Paid, current draft generation/downloads, retry/concurrency/source validation and populated backup/restore. The omitted route and populated upgrade/recovery suites also passed. The full-volume fixture writes a distinct 835-member measurement file, so the later small upgrade fixture does not overwrite its results. The first gate stopped at a disabled-fixture availability assertion after 69 passing suites; its failure evidence is retained. The only correction was forwarding the explicit test flag and fixing volume labelling in two test files. R1/R2 application/build/migration hashes are identical; no financial rule, permission or database constraint was changed to pass the tests. Existing finalization, closures, corrections, waivers/overrides, masterlist membership, academic history, payments and R01–R07 parity/cache/pagination suites passed. No individual cheque settlement or P07 behavior was simulated as implemented.

Completed focused checks include both actual document routes, populated 60→61 upgrade, exact retry/concurrency/audit/render rollback, current-source download safety, browser preparation/download/regeneration/history, keyboard activation, tablet overflow checks and saved-request reload recovery. The local check command passed lint, **568 unit tests**, TypeScript, production build and secret scan. Existing build-size warnings are retained, not suppressed.

F51 first failed in a disposable restore because a new hash CHECK compared incompatible collations. The new migration was corrected before any development application and then rehearsed successfully. Runtime integration also exposed an unauthorized raw-audit read and an upsert requiring identity-column UPDATE grants. The implementation switched to the existing audit view and explicit insert/restricted-column update; permissions were not broadened. An initial volume test stopped at an overly narrow owned-fixture name guard; the test now accepts both established random disposable fixture prefixes, never production names.

A fresh verified encrypted backup preceded the local F51 application: `output/backups/ldss-1792662896207-bd041707.ldssbackup`. The restored copy passed inventory verification. All **135 existing business tables** and all **60 previous migration checksums** were unchanged across migration; the two new document tables started empty, with no automatic operational activation.

Separate authentication activity changed `audit_logs`, `auth_rate_limits` and `auth_sessions`: one `auth.login` at 16:05:50 Philippine time after the initial baseline, and one at 17:55:52 after migration. The first end-to-end zero-difference probe stopped for inspection. All 132 other existing business tables, including every financial record, still match the immediate pre-migration snapshot. The original 2,776 pre-migration audit rows retain their exact hash; only the later login was appended. Users/roles, financial data and historical evidence remain unchanged. Both authentication events and their session/rate-limit changes were retained. All 135 old tables were unchanged during migration itself; whole-development zero-difference over the full work period is not claimed.

MariaDB DDL is not transactional: interrupted F51 is deliberately rejected as incomplete and is not falsely journalled as applied. Recovery is through the verified pre-update backup and controlled reapplication, not dropping populated evidence. The reverse helper is restricted to owned disposable databases with empty document tables. Populated document backup/restore tests verify current bytes, immutable metadata, financial inventory and constraints.

## G. Follow-up and recommendation

**Recommendation: P06 is ready for local acceptance review.** All 649 frozen source inputs, 245 build artifacts and 61 migrations reconcile. All 60 accepted migration hashes and 33 protected financial/performance modules remain unchanged; the only two protected source changes are the reviewed P04/P05 document helpers. The 15 original schemas and 12 LDSS database accounts remain, including the six pre-existing test databases. No owned fixture schema/account remains. All 132 non-authentication business tables, including every authoritative financial table, match the immediate pre-migration snapshot. The three authentication/audit differences are documented separately, and all prior audit rows remain exact. All 135 existing business tables were unchanged across migration itself. Both new document tables are empty in development and activation remains off. The two original Publisher files retain their supplied hashes. **P07 is not started.**

P07 must separately implement its approved canonical individual-payment/cheque-release evidence and representative checks, retaining the existing transaction/entitlement identifiers, cancellation history and fresh financial guards. A P06 generation or server download audit is **not** evidence of forwarding, external office acceptance, actual claimant receipt or payment. No legal cutoff or entitlement extension is invented here.

The Scholarship Office must review and approve the draft layout, permitted payee/address mapping, official numbering/accounting sources and authorized signatories before official form use. The native Publisher samples do not establish those authorities. Missing official Word files are not a development blocker; an approved later Word adapter can replace the prototypes. Production activation/deployment requires separate authorization.

Before operational activation, review the existing 64 MiB raw-SQL backup budget against the expected document collection and official-template sizes. The measured fixture headroom is not an unlimited-capacity guarantee; the backup cap and financial safeguards were not relaxed.
