# SIGN-1 — Administrator-managed financial document signatories

28 October 2026, Philippine time. **Installed and activated only on the existing [5181 Individual Payments UAT](http://127.0.0.1:5181/). Setup & Administration → Document Signatories now provides the guarded Administrator editor. Configuration version 1 is active; RANNEL V. FARAON is the additional Payroll Scholarship Coordinator. The existing individually Paid transaction and its original DV remain exact. No financial command or document regeneration was performed on actual UAT.**

Two preservation qualifications require attention: Windows restarted after the starting checkpoint, and primary 3001/5173 is currently offline; three root reports also differ from the older checkpoint, including two containing only one or two bytes. SIGN-1 did not restart primary/LAN or write those report paths. Their cause/author is not established. Database and physical primary-release preservation passed; process availability must not be described as unchanged. Details appear below. LAN-R2A remains paused.

## Verified target, recovery and activation

| Item | Verified result |
|---|---|
| Host / database server | DESKTOP-BPLJKRP / 127.0.0.1:3306, MariaDB 10.4.32 |
| Frontend / API | **127.0.0.1:5181 / 3031**, dedicated IP-UAT-1 cookie namespace |
| Actual UAT database | **`ldss_restore_1793167108097_2b47a744`** |
| Restricted runtime | **`ldss_ipu_cb1da15ff3ac@localhost`**, intended schema only |
| Installed release | `C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release` |
| Isolated staging | `C:/Users/ADMIN/.ldss/sign-1-20261028-stage`, copied from the actual accepted UAT release |
| Schema | **149 tables / 67 migrations**, original checksums and timestamps exact; no F58 applied |
| Final controller / API / frontend | **12216 / 12132 / 7764**, verified owned UAT ancestry |
| Current signatories | **Version 1**, effective **2026-10-28 Asia/Manila** |

The installed BACKUP-1 tool captured **1,914,121 SQL bytes / 481,904 encrypted bytes**, archive SHA-256 `7f74acd7d2dca95e4582efa9bc7f355487af08fae6c052e789abb136bdca16e1`. Complete isolated restoration verified the 149-table values/counts/checksums, journal and schema objects using the established restore safeguards. The same accepted archive supported two separately owned restore targets; both targets and their runtime/definer accounts were removed. Existing backup bounds and restricted archive/key custody remain. Nothing was restored over actual UAT or primary. [Recovery](../../output/sign-1-20261028/recovery.json), [cleanup](../../output/sign-1-20261028/cleanup.json).

Staging acceptance preceded installation. Only the verified UAT control path was used for installation/start; obsolete pre-reboot PIDs were not treated as authority to terminate unrelated processes. Matching source, compiled server and client assets were installed. The final runtime manifest verifies **21,339 files**, with **21,293 starting files unchanged**; older hashed client assets remain available. [Installation and hashes](../../output/sign-1-20261028/promotion.json), [final source verification](../../output/sign-1-20261028/source-final.json).

## Administrator account and private credentials

The UAT already contained a valid fictional System Administrator. It was reused rather than creating another account:

- Login: **`system_admin@example.invalid`**; display name **IP UAT system_admin**.
- Existing System Administrator role and administrative permission mapping retained. Staff and Coordinator received no configuration authority.
- A strong, distinct UAT-only password was activated through the existing reset/password-hashing mechanism. No database password or primary account changed.
- Its login information was appended once to the existing restricted **`C:/Users/ADMIN/.ldss/ip-uat-1-20261028/private/UAT_LOGIN.txt`**. The original **362-byte** Coordinator/Staff prefix remains byte-exact. Access was verified for the local operator and SYSTEM only; the generated password differs from both existing UAT passwords.

Administrator, Coordinator and Staff login/logout checks passed. Administrator access does not supply financial transaction authority: the financial-document availability probe still returns **403** for this account. Passwords are absent from this report, public screenshots and the review archive. [Account inventory](../../output/sign-1-20261028/account-inventory.json), [append/ACL proof](../../output/sign-1-20261028/credential-append.json).

## Configuration and authorization contract

The existing generic setting writer could not safely represent the complete versioned registry in one `VARCHAR(1000)` value. The explicitly authorized narrow extension uses **19 bounded existing `system_settings` rows**: one header, eight officials and ten document-section capacities. No schema, grant or permission expansion was needed.

`GET/POST /api/v1/document-signatories` require fresh **`configuration.manage` and System Administrator role** checks. POST is bounded to **16 KiB**. Names are limited to 80 characters, positions to 100 and capacities to 120; each stored row is bounded to the existing 1,000-character value contract. Reads require the complete known row set, common version, valid schema and reconstructed hash; malformed or partial settings fail closed.

Saving requires the existing review confirmation, reason, exact expected version and idempotency key. The shared guarded configuration transaction reauthorizes, checks the request hash and version, writes all rows, one complete before/after audit and the durable command result atomically. Exact retries return the committed result; changed-payload key reuse and competing stale versions reject. A deliberately late audit failure proved complete setting/ledger rollback. The generic writer rejects reserved `FIN_SIGN_*` writes and editing the legacy Payroll setting while central configuration is active.

Activation is immediate using the server's **Asia/Manila** day; future/backdated scheduling is not exposed. The effective configuration date is not an appointment date. Version 1 has hash `7ae479a468b9d07f12334272b7bdfd0aac286e6679acb4ce70f149a3fd2d1f71`, with reference **“SIGN-1 user-provided fictional UAT configuration; not office appointment authority.”** [Actual activation](../../output/sign-1-20261028/configuration-activation.json).

The page reuses the pending-command recovery convention. An unresolved save retains the exact body/key/version, prevents edits, dismissal and conflicting navigation, and offers exact retry. Confirmed success refreshes the authoritative version. Rejections display the actual reason. No new confirmation or recovery backend was added to financial operations.

## Document roles and output

| Form / section | Configured role and name |
|---|---|
| DV A — Certified | Municipal Accountant — **CAROLINE MAISIE J. ROBLES** |
| DV B — Certified | Municipal Treasurer — **RODANTE V. FORBES** |
| DV C — Approved for Payment | Municipal Mayor — **ROSSANO C. VALENCIA** |
| DV D — Received Payment | Actual recipient acknowledgment; no automatically assigned official |
| OR A | Municipal Administrator; **name blank pending supported setup** |
| OR B | Municipal Budget Officer; **name blank pending supported setup** |
| Payroll grantee certification | **ARIANNE ARIKA B. CARRANCEJA**, Chairman, Committee on Education, retained |
| Payroll approval | **ROSSANO C. VALENCIA**, Municipal Mayor |
| Payroll treasury certification | **RODANTE V. FORBES**, Municipal Treasurer |
| Payroll disbursing certification | **WINDILIN H. BARBADO**, Disbursing Officer/Asst.Mun.Tres, retained |
| Payroll additional entry | **RANNEL V. FARAON**, Scholarship Coordinator |

The OBR reference's Municipal Administrator and Budget Officer blocks are preserved. Accountant/Treasurer/Mayor were not substituted into them. The editor and document view identify the missing OR names; unsupported names remain blank. Printed names, positions and section capacities are editable; document sections and distinct certification functions are fixed. The additional Coordinator does not replace the grantee, approval, treasury or disbursing roles.

Both DV and OR retain **DAET, CAMARINES NORTE** as the fixed form address. Optional fields cannot replace it or the verified source payee. Academic context and authorized amounts come from the existing sources. Missing official numbers, signatures/dates, TIN and cheque details remain blank when unsupported; no Registry address or financial source was changed.

Future generation binds the configuration version/hash, full official snapshot, document mapping and existing template/source fingerprint. Request-scoped renderer resolution and before/after source checks reject a changed configuration between review and generation. DOCX core metadata and configured Payroll HTML/Word metadata carry the configuration identity. The default production renderer remains exact; only the isolated UAT preset consumes its optional configured context.

**Historical protection is qualified:** the existing document storage retains the current binary and append-only generation metadata, not an archive of every prior DOCX binary. Changing settings does not regenerate existing files. Actual UAT's original Paid DV and its generation/content rows remain exact. On owned copies, explicit regeneration retained original metadata and saved the replaced current binaries privately before replacement. A future replacement of an issued/signed document requires an approved original-byte preservation procedure; generation metadata alone is not that archive. [Generation/retry preservation](../../output/sign-1-20261028/document-retest.json).

The accepted `daet-sample-v3` keeps the full five-role section after every group of up to 20. HTML and native Word print-to-PDF produced:

| Fictional sample | Signed groups / pages | Amount |
|---|---:|---:|
| 20 scholars | **1** | PHP 100,000.00 |
| 21 scholars | **2**, final group 1 | PHP 105,000.00 |
| 834 scholars | **42**, final group 14 | PHP 4,170,000.00 |

All pages were checked for row order, totals, draft markings, five names, signature placement and page bounds; all 42 Word pages were visually inspected in contact sheets with representative full-page review. Frozen unconfigured v1/v2/v3 HTML and all 18 compared Word parts match their starting outputs, normalizing generated drawing identifiers only. Configured print samples use owned-copy **version 4**, including a clearly fictional additional capacity; they are not documents generated on actual UAT version 1. [Sample/parity results](../../output/sign-1-20261028/document-samples.json), [PDF checks](../../output/sign-1-20261028/documents/pdf-checks.json).

Representative outputs: [21-person Word PDF](../../output/sign-1-20261028/documents/payroll-21.pdf), [834-person Word PDF](../../output/sign-1-20261028/documents/payroll-834.pdf), [834-person HTML PDF](../../output/sign-1-20261028/documents/payroll-834-html.pdf), [last partial group](../../output/sign-1-20261028/documents/payroll-834-page-42.png), [DV](../../output/sign-1-20261028/documents/after-DV-page-1.png), [OR](../../output/sign-1-20261028/documents/after-OR-page-1.png). Native Word exported DOCX read-only; Chromium printed HTML. No new PDF route or office software installation was introduced.

## Focused verification and evidence reuse

The [reuse/impact matrix](../../output/sign-1-20261028/EVIDENCE_REUSE_AND_TEST_IMPACT.md) reuses accepted DOC-FORM-1/IP-UX-2/IP-UAT-1 source, layout, payment and runtime evidence. It adds only the configuration, authorization, regeneration, pagination and preservation acceptance affected here. No 835-person intake, dependency repair, MariaDB upgrade or unrelated broad financial suite was repeated.

| Check | Result |
|---|---|
| Strict application lint: `eslint server src tests --max-warnings 0` | **Exit 0** |
| Build, including TypeScript check | **Exit 0** |
| Focused unit tests | **6 files / 60 tests passed** |
| Secrets check | **Exit 0** |
| Owned database integration | **3 groups passed**: role/version/retry; bypass/invalid/rollback/race; template changes/generation/history |
| Owned document retest | Current OR/DV downloads, exact retry, source metadata and original Paid preservation passed |
| Lost response after commit | Real owned-copy commit, first response lost, two identical requests / one version increment; modal and navigation protected |
| Actual 5181 acceptance | All three roles; Administrator confirmation/cancel only; **zero acceptance business-command attempts** |

Focused tests cover configuration, DOC-FORM-1, Payroll form, individual documents, document-command conflicts and existing configuration behavior. Full repository lint was not claimed: DOC-FORM-1 had already recorded an inherited empty-catch lint issue in untouched `scripts/ip-uat1/controller.mjs`; this task ran strict application lint without relaxing the rule. [Commands](../../output/sign-1-20261028/checks.json), [unit log](../../output/sign-1-20261028/unit.log), [integration](../../output/sign-1-20261028/integration.json), [owned browser](../../output/sign-1-20261028/stage-browser.json).

ui-ux-pro-max and the installed Playwright workflow were applied. Actual headed Chrome acceptance covers **1440/1024/820/375/320 CSS pixels**, keyboard confirmation/cancellation/focus restoration, reduced motion and no page overflow. Controls retain scoped 44-pixel touch targets and 3-pixel focus. Staff/Coordinator cannot access the editor; the API independently denies them. All task acceptance sessions logged out with **204**, followed by `auth/me` **401**. [Actual browser results](../../output/sign-1-20261028/after-browser.json).

Actual 5181 screenshots: [Administrator desktop](../../output/playwright/sign-1/after-administrator-1440.png), [320-pixel editor](../../output/playwright/sign-1/after-administrator-320.png), [confirmation](../../output/playwright/sign-1/after-administrator-confirmation-320.png), [Coordinator denied](../../output/playwright/sign-1/after-coordinator-denied.png), [Staff denied](../../output/playwright/sign-1/after-staff-denied.png). This new page had no existing Administrator-editor counterpart; no fabricated before screen is supplied. Accepted prior document/layout evidence remains in [DOC-FORM-1](DOC_FORM_1_SIGNATORIES_AND_PAYROLL_PAGINATION_REPORT.md).

**Native 200% zoom remains unverified.** The native computer-use pipe was unavailable (OS error 2), so no zoom keys were sent and responsive widths/headed Chrome are not presented as substitutes. Full assistive-technology/WCAG, maximum-content, all-printer and other Word-version acceptance are not claimed. [Native limitation](../../output/sign-1-20261028/native-limit.json).

## Exact source boundary

**17 package source files: four additions and 13 existing changes, installed in the dedicated release only.** Repository-root application sources and primary physical release were not promoted. The [hash inventory](../../output/sign-1-20261028/candidate-files.json) and [source ZIP](../../output/sign-1-20261028/candidate-source.zip) identify the reviewed bytes.

| Paths relative to dedicated release | Change |
|---|---|
| New `server/configuration/document-signatory-model.ts`, `document-signatories.ts` | Shared typed model, bounded registry, guarded specialized contract |
| `server/configuration/payroll-signatories.ts`, `routes.ts`, `service.ts`; `server/app.ts` | Central lookup, route/service registration and generic-writer bypass protection |
| `server/payments/document-service.ts`, `document-uat-preset.ts` | Fresh renderer context, mapping/version metadata, OR/DV official fields |
| `server/ovr/payroll-form.ts`, `payroll-word.ts` | Optional configuration snapshot and five-role signed groups |
| New `src/DocumentSignatories.tsx` | Administrator editor, confirmation and exact-retry presentation |
| `src/ConfigurationPage.tsx`, `App.tsx`, `IndividualDocuments.tsx`, `styles.css` | Existing navigation integration, missing-name warning, scoped responsive styles |
| `src/prior-command.ts` | Type-only addition of the configuration route; recovery implementation retained |
| New `tests/document-signatories.test.ts` | Seven configuration/pagination cases |

Ten compiled server files change. The prior CSS prefix, default production document renderer, financial payment writers, permission maps, schema SQL, dependency files, private configuration and primary launchers remain exact. Review ZIP excludes credentials, database records and private evidence; it is a source review package, not an operational LAN release.

## Data preservation and qualified environmental differences

The full comparison preserves all existing UAT financial/source/document tables, original audits, schema, migrations, roles and grants. The authorized actual-UAT changes are limited to the existing Administrator's password activation/version, **19 initial signatory settings**, **one configuration command**, and ordinary authentication records.

| Actual UAT fact | Before → final |
|---|---|
| User's original individual transaction | **Paid / PHP 5,000 / 2026-10-28**, exact |
| All three raw payment rows | Exact: one original payroll Not Paid/unclaimed, one payroll Paid 19 October, one individual Paid 28 October |
| Effective payment totals | **2 Paid / PHP 10,000**, one Payroll and one Individual; no new release |
| Original generated DV/version/content | Exact; **no actual document regeneration** |
| PAY-001 / PAY-002 / PAY-003 | **Processed v11 / Review v3 / Draft v2**, exact |
| Starting audits | All **319** exact; **330** final |

The 11 appended audits comprise four logins/four logouts, reset issuance/password reset and the single configuration change. These are authorized configuration/authentication changes, not zero database writes. All other UAT account rows remain exact. [Complete preservation](../../output/sign-1-20261028/final-preservation.json), [full-precision audit prefix](../../output/sign-1-20261028/audit-prefix.json).

Primary read-only preservation verifies **150 tables / 67 migrations**, **20,319 unchanged audit rows**, and **803 Paid records**: two dated 24 October, 798 dated 26 October, three dated 28 October. PAY-001 remains Processed v805, PAY-002 Processed v8 and PAY-003 Draft v4. All **21,258 physical primary-release files** remain exact. No primary account, financial, document, schema or setting command was submitted.

**Process exception:** Windows reports a boot at **18:05:18.500 Philippine time**, after the starting checkpoint. Final inventory finds no listeners on primary **3001/5173**. LAN port **3002** has PID **8620** instead of 6720, and **3443** has PID **14816** instead of 9756; their process creation times are after boot. The restart trigger/actor is not established, and the protected processes' full launch configuration was unavailable. SIGN-1 issued no primary/LAN stop/start or configuration changes and leaves primary offline for operator attention. These observations do not certify unchanged LAN availability or independently establish that Windows services restarted them. [Process evidence](../../output/sign-1-20261028/process-differences.json).

**Root-report exception:** comparison with the older 1,402-input IP-UAT checkpoint finds **1,399 exact** and these three existing differences, with modification times **17:48:37 Philippine time**, before SIGN-1's approximately 17:52 source checkpoint:

- `docs/testing/LDSS_5173_CONSOLIDATED_UAT_REPORT.md`: **2 bytes**, containing `ww`.
- `docs/requirements/LDSS_TARGETED_ENHANCEMENT_PLAN.md`: **1 byte**, containing `a`.
- `docs/requirements/PAY_TIME_3_PRIMARY_INSTALLATION_REPORT.md`: **23,112 bytes**, a full report with a different hash; it is not one of the two short files.

SIGN-1 did not write or restore those paths. Author/cause is unknown. Current copies were preserved in task evidence; recovery must be separately reviewed so later legitimate content is not overwritten. This older-checkpoint comparison is not proof that SIGN-1 truncated them. [Hashes/timestamps](../../output/sign-1-20261028/root-checkpoint-differences.json). No exhaustive new operational LAN database inventory is claimed.

## Outstanding decisions and stop

Next required document task: obtain supported Municipal Administrator/Budget Officer names and approved capacities/appointment references, then use the Administrator editor with a reason and reviewed expected version. The user-supplied officials are UAT values, not independently verified office authority. Before replacing any issued document, approve preservation of its original binary and follow explicit source-checked regeneration. Native 200% acceptance also remains outstanding.

Separately review the two short root reports and the changed PAY-TIME report, and arrange operator review of primary availability after the observed reboot. SIGN-1 does not authorize repairing those reports, restarting primary/LAN, financial processing, an office-policy change or operational release.

**Stopped after isolated SIGN-1 implementation, 5181 activation and focused verification/reporting. Actual UAT payments and original DV are preserved; primary data and physical release are exact, with the process/report exceptions above. No primary deployment, MariaDB upgrade, F58 migration, operational LAN modification or LAN-R2A resumption occurred.**
