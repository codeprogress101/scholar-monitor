# P06 document generation design

22 October 2026. Local implementation only; P01–P05 accepted. No P07–P10, actual individual payment, or deployment is authorized.

The accepted P05 manifest was verified before editing: 631 source inputs, 237 artifacts and 60 migrations. Initial DEV inventory: 135 business tables, 15 schemas and 12 LDSS accounts. Existing uncommitted work is retained.

## Reuse and authorization

Use the installed `docx` library and existing verified payroll seal/LDSS assets without changing the payroll renderer. Extend P04/P05 with narrow prepared-source validation helpers that call their existing canonical checks. Existing `ovr.process`, CSRF, current account authorization, configuration guard, transaction locks, command journals and audits protect generation, regeneration and downloads. Omitted records still require their recorded Coordinator approval. No extra routine approval for Unclaimed.

Render from a reviewed, immutable data contract outside the SQL transaction. Reacquire the established locks and recheck permission, financial state, source fingerprint, template identity and current document revision before publishing both files atomically. Journal replay checks current permission first and returns the original receipt. Audit failure keeps the previous current files. Rendering uses bounded memory buffers, not publicly reachable or orphanable private files.

## Storage justification before DDL

* `individual_document_versions`: append-only transaction/kind/revision metadata with template/provenance, source revision/fingerprint, permitted field edits, generated hash/size, actor and timestamp. P04/P05 event tables have fixed financial transition semantics; altering those transitions to represent Word regeneration would stale financial workflows. Audits/journals alone cannot enforce document identity, revisions and latest-content foreign keys. No binary or new payment ledger is added here.
* `individual_document_contents`: one current content row per transaction/kind, linked by revision/hash to immutable version metadata. Existing payment headers and frozen financial JSON cannot safely hold mutable files or separate latest OR/DV pointers. Store bounded base64 content in SQL text for the existing encrypted SQL backup/restore path; no external storage service or filesystem publication protocol. Runtime updates are restricted to the content/revision/hash columns; no DELETE grant. Validate decoded bytes/hash and generated artifact limits. Retain previous metadata and historical backups.
* A header identity index and composite source FKs bind document kind to the existing Unclaimed/Omitted transaction source. DV-only remains enforced for Unclaimed. All 60 applied migration files/checksums remain unchanged; F51 introduces only these structures/indexes, without backfill.

MariaDB DDL implicitly commits. Rehearse fresh/populated/interrupted upgrades on owned restored copies. Do not discard nonempty structures, disable FKs, edit old checksums or implement an automatic destructive downgrade. Rehearse a populated document backup/restore; existing backup size limits remain applicable and require disclosed capacity measurements.

## Prototype boundary and mapping

Updated reference evidence: the user supplied `DV.pub` and `OBR.pub` during implementation. Original/copy hashes match. Publisher read-only inspection with macros forced off confirms both are one-page Letter portrait (612 × 792 points); OBR is titled **Obligation Request**. Native page-image exports and shape metadata are retained under `output/p06-documents-20261022/references/`. These Publisher files replace the screenshots as the primary layout references, while remaining unapproved for individual-payment use. PDF export stalled in the owned Publisher instance; its page-image export succeeded. Typography and Word reconstruction remain prototype adaptations rather than exact original Word specifications.

The actual two supplied screenshots remain visible in this conversation. No original screenshot bitmaps were found in the current attachment directory; do not claim a pixel-diff against a local reference. Use their observed header, bordered fields, OR A/B and DV A/B/C/D certification/signature sections. Letter portrait dimensions, Arial sizes, margins and spacing are inferred prototype settings, subject to office review.

Existing payroll assets provide the municipal seal and LDSS logo. The locally supplied `maogmang daet logo.png` was visually inspected and matches the reference branding; any proportional downsampling is recorded with original/derived hashes. Do not redraw branding or import sample payee/signatory/accounting entries.

Every page and download label identifies a draft pending office approval. Template definitions contain kind/version/status/provenance/hash, allowed fields and an adapter. A future official adapter can replace the prototype without changing entitlement/payment logic. There is no upload/template-management UI or client-selected arbitrary executable/path. Official use stays disabled pending office approval of layout/payee/signatories/mappings.

Authoritative scholar identity, semester/year, approved integer-centavo amount and source/internal references are immutable. Put scholar identity in the explanation; do not assume the scholar is the official Payee. Default payee/address/office blank; permit concise optional corrections and an additional explanatory note. Keep official OR/DV numbers, accounting codes, TIN, cheque/bank/receipt, certifications, signatures and unapproved signatories blank. Numeric and peso-word amounts come from the same approved centavos.

## UI and validation

Lazy selected-transaction document view: Review → Prepare Documents → Download Word. No generation/binaries on queue load. Separate current OR and DV downloads; one reviewed action publishes a pair for an omission. Corrections use regeneration and retain the transaction/entitlement. Restore exact unresolved payload/key after reload and block conflicting navigation until resolved. Existing paged queues/scoped refresh/request caches remain.

Test both routes, long/missing fields, peso words/centavos, unknown fields, template changes, auth/CSRF/revocation, stale/current/cancelled sources, concurrent/exact retries, interrupted render/audit rollback, latest-file replacement, populated upgrade/backup and byte/hash preservation. Visually inspect all representative rendered pages and actual Word output where available. Run the full frozen UAT gate and report actual performance, memory, failures and remaining R07 limits.
