# SIGN-UX-1 — Hide internal signatory settings from the generic editor

28 October 2026, Philippine time. **Installed and verified on the existing [5181 UAT](http://127.0.0.1:5181/). Program Settings no longer lists or finds reserved `FIN_SIGN_*` rows. Administrators reach the human-readable editor through Setup & administration → Document Signatories, or Program Settings → Manage Document Signatories. All 19 stored rows remain exact at version 1, with the same hash and configuration ledger.** Existing payments, original DV and signatory history are preserved. No actual-UAT setting change, document generation or financial command was submitted during acceptance.

This is a focused correction to [SIGN-1](../requirements/SIGN_1_ADMINISTRATOR_DOCUMENT_SIGNATORIES_REPORT.md). It does not activate office signatory authority, change permissions or resume LAN-R2A.

## Actual target and root cause

| Item | Fresh verification |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306, MariaDB 10.4.32 |
| Frontend / API | **127.0.0.1:5181 / 3031** |
| Database / restricted runtime | **`ldss_restore_1793167108097_2b47a744` / `ldss_ipu_cb1da15ff3ac@localhost`** |
| Dedicated release | `C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release` |
| Schema | **149 tables / 67 migrations**, unchanged |
| Signatory configuration | **19 rows / version 1**, effective 2026-10-28 Asia/Manila |
| Hash | `7ae479a468b9d07f12334272b7bdfd0aac286e6679acb4ce70f149a3fd2d1f71` |
| Controller / API / frontend | **12216 / 12132 / 7764 → 17060 / 4948 / 32612**, only verified UAT control used |

The actual Administrator browser first opened the dedicated editor, edited unsaved printed-name, position and capacity fields, reviewed confirmation and cancelled/refreshed. It then reproduced **all 19 internal rows** in Program Settings and opened the `FIN_SIGN_HEAD` raw JSON/value-type form without saving. The dedicated editor was installed and accessible; its discoverability did not prevent the generic editor from presenting the same internal storage rows. [Fresh inventory](../../output/sign-ux-1-20261028/inspection.json), [before browser proof](../../output/sign-ux-1-20261028/before-browser.json).

The exact cause was the generic configuration **read projection**: its settings predicate excluded `LDSS_WORKING_ACADEMIC_YEAR`, but not `FIN_SIGN_*`. The normal table therefore rendered Edit/Archive controls from those returned records. SIGN-1's server writer already rejected reserved-key creation and changes with **`SIGNATORY_EDITOR_REQUIRED`**. This was an exposed, misleading editing interface; no successful generic overwrite was demonstrated.

## Smallest correction and navigation

The generic list's shared count/page predicate now excludes the literal reserved prefix, including when searching or requesting archived records. The SQL escapes underscores, so ordinary similarly named codes are not accidentally excluded. Filtering occurs before server pagination; totals and visible pages agree. No rows are deleted, renamed or rewritten.

Program Settings now provides a compact **Manage Document Signatories** link for existing configuration managers. It opens the same dedicated page, with printed names, positions, document sections/capacities, reason and review confirmation. There are no JSON or value-type controls on that editor. Its existing sidebar entry remains. The older `PAYROLL_SIGNATORIES` row is a separate legacy setting and remains under its existing restrictions; its generic writer still rejects changes while central signatories are active.

Existing generic reserved-key write safeguards remain byte-identical. Direct create/update/archive/restore attempts against reserved settings reject; Staff and Coordinator remain denied dedicated signatory changes. Existing authorized detail reads were not converted into a new confidentiality policy. Hiding list/search rows does not replace write authorization.

The dedicated configuration writer, expected-version/hash behavior, `configuration.manage` plus Administrator enforcement, reason/audit transaction, idempotency and exact recovery remain unchanged. No endpoint, schema, permission, financial writer or office-policy contract was added.

## Exact changed files and installation

**Three existing source files**, installed only in the dedicated 5181 release:

| Path relative to dedicated release | Change |
|---|---|
| `server/configuration/service.ts` | Exclude reserved rows in generic list/search count and page queries; command method unchanged |
| `src/ConfigurationPage.tsx` | Concise settings guidance and direct dedicated-editor link |
| `src/styles.css` | Scoped 44-pixel link target and 3-pixel visible keyboard focus |

Staging at `C:/Users/ADMIN/.ldss/sign-ux-1-20261028-stage` used the actual accepted dirty UAT release. Its focused checks and disposable-copy acceptance passed before installation. Only one compiled server file changes: `dist/server/configuration/service.js`. Matching source/client assets were installed through the existing UAT control and runtime manifest. Old hashed assets remain; root application sources and primary release were not promoted. **21,325 starting files remain exact; 21,348 current runtime files verify.** Dedicated editor/writer, document/financial writers, schema, permissions, dependencies and launchers remain exact. [Three-file hashes](../../output/sign-ux-1-20261028/candidate-files.json), [installation](../../output/sign-ux-1-20261028/promotion.json), [final source checks](../../output/sign-ux-1-20261028/source-final.json), [source review ZIP](../../output/sign-ux-1-20261028/candidate-source.zip).

Before testing mutations, BACKUP-1 captured **1,927,044 SQL bytes / 485,747 encrypted bytes**, SHA-256 `a12b9a3ad1ac087ce7e66df3f704c355db1c738606d2d01aecab721190625803`. Complete isolated recovery verified all 149 tables and schema/journal inventory with the accepted bounds and restricted key/archive handling. Two owned copies were restored from that accepted archive; both were removed with their scoped accounts and temporary services. Nothing was restored over actual UAT or primary. [Recovery](../../output/sign-ux-1-20261028/recovery.json), [first cleanup](../../output/sign-ux-1-20261028/cleanup-first.json), [final cleanup](../../output/sign-ux-1-20261028/cleanup.json).

## Focused tests and screenshots

| Check executed | Result |
|---|---|
| Strict application lint, `eslint server src tests --max-warnings 0` | **Exit 0** |
| Build, including TypeScript check | **Exit 0** |
| Focused configuration/document/Payroll unit tests | **6 files / 60 tests passed** |
| Secrets check | **Exit 0** |
| Owned-copy integration | **Four groups passed** |
| Staged and actual browser | Administrator navigation/editor; Staff/Coordinator denial; searches and five widths passed |

The four integration groups verify: all-role list/search/archive results against exact SQL-derived totals; reserved create/update/archive/restore denial with all 19 rows unchanged; ordinary literal-prefix lookalikes and bounded page boundaries; dedicated save of names/positions/capacities with version/hash, stale and changed-payload rejection and exact retry; new source-checked OR/DV output and original document/payment preservation. The actual UAT configuration was not used as a mutation target. [Commands/results](../../output/sign-ux-1-20261028/checks.json), [unit log](../../output/sign-ux-1-20261028/unit.log), [integration](../../output/sign-ux-1-20261028/integration.json).

On the disposable copy, a newly generated DV contains the saved fictional accountant name, position and signing capacity; OR/DV metadata binds the saved version/hash. Both retain **DAET, CAMARINES NORTE**. All original document metadata and binary rows, including the user's original Paid DV, remain exact. Only the new copy-only document received a generation command and durable retry result. No existing binary was replaced. Rendering/layout, 20/21/834-person pagination, audit rollback and lost-response browser evidence from SIGN-1 are reused because those implementations remain byte-identical; unrelated migration, security, large-cohort and broad financial suites were not repeated.

Actual 5181 before/after captures use the same Administrator, Program Settings, 1440 CSS pixels and default zoom:

| View | Evidence |
|---|---|
| Before: internal rows in ordinary list | [Before](../../output/playwright/sign-ux-1/before-administrator-settings-1440.png) |
| Before: raw JSON form, cancelled | [Raw form](../../output/playwright/sign-ux-1/before-raw-editor-1440.png) — initial default browser viewport |
| After: one ordinary legacy record, no internal rows | [Desktop](../../output/playwright/sign-ux-1/after-administrator-settings-1440.png) |
| After: compact direct link | [320 pixels](../../output/playwright/sign-ux-1/after-administrator-settings-320.png) |
| Same dedicated human-readable editor | [Editor](../../output/playwright/sign-ux-1/after-dedicated-editor-1440.png) |

ui-ux-pro-max guidance and the installed Playwright workflow were used. Administrator, Coordinator and Staff each passed **1440/1024/820/375/320 CSS pixels** on actual UAT, without page overflow. Existing table scrolling remains local. Keyboard Enter follows the new link; dedicated confirmation cancels without submission, and refreshing discards unsaved test fields. Reduced-motion checks passed. Actual browser guards recorded **zero business-command attempts**. [Staged browser](../../output/sign-ux-1-20261028/stage-browser.json), [actual browser](../../output/sign-ux-1-20261028/after-browser.json).

Native 200% zoom remains unverified: the computer-use native pipe again returned OS error 2 with no available native browser. Responsive screenshots are not presented as a substitute or full accessibility certification. [Native limitation](../../output/sign-ux-1-20261028/native-limit.json).

Test-helper corrections were limited to using the document table's composite key, handling the legitimate no-results view without assuming a table body, and recognizing document generation's existing `ovr_commands` ledger. The first owned copy was removed; the accepted four-group run used a fresh restore, preserves every original ledger row and asserts exactly one new document-generation result. No application guard or test expectation about financial preservation was relaxed.

## Preservation and stop

The final 149-table UAT comparison preserves all business values, schema objects, 67 migration rows/checksums/timestamps, accounts/roles, all **19 exact signatory rows**, configuration command history, payment evidence and original generated DV. The current user-provided initial signatory configuration remains version 1/hash above; no name, position or capacity was saved on actual UAT.

| Actual 5181 state | Preserved result |
|---|---|
| Payment rows | Three original rows exact: payroll Not Paid/unclaimed; payroll Paid **2026-10-19**; individual Paid **2026-10-28** |
| Effective Paid totals | **2 / PHP 10,000**, one Payroll and one Individual |
| Original individual release | **PHP 5,000 Paid**, exact original date, transaction, DV and sources |
| Payrolls | PAY-001 **Processed v11**; PAY-002 **Review v3**; PAY-003 **Draft v2** |
| Signatory setting/command changes | **Zero** |
| Audits | All **331** starting rows exact; **339** final, with four task logins/four logouts only |

The fresh 331-row baseline includes the intervening authentication activity after SIGN-1. All task sessions signed out with **204**, followed by `auth/me` **401**. Authentication/session/rate-limit activity is qualified database activity, not a claim of zero writes. [Final preservation](../../output/sign-ux-1-20261028/final-preservation.json), [full-precision audit proof](../../output/sign-ux-1-20261028/audit-prefix.json).

Primary read-only verification preserves **150 tables / 67 migrations, all 803 Paid rows/dates, 20,319 audits and 21,258 physical release files**. Primary 3001/5173 was already offline at this task's starting inventory and remains so; it was not restarted. Retained LAN listener owners match this task's starting inventory. No operational LAN change or exhaustive new LAN database inventory is claimed.

The missing OR official names and office appointment/capacity approvals remain as documented in SIGN-1. This UI correction supplies no new authority and no historical DOCX archival capability. Any future source rollback must preserve later legitimate edits and data; no database restoration or signatory history rewrite is appropriate.

**Stopped after the verified three-file correction, isolated 5181 installation and reporting. No primary deployment, schema/permission change, financial writer change, payment/document-history repair or operational LAN modification occurred. LAN-R2A remains paused.**
