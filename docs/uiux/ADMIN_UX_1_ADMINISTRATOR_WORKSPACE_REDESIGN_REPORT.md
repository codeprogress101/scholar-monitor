# ADMIN-UX-1 — Administrator workspace redesign

28 October 2026, Philippine time. **Installed and verified on [5181 UAT](http://127.0.0.1:5181/#accounts), API 3031.** Administration now has three direct working destinations: **Accounts, Document Signatories and Program Settings**. Reads have scoped loading/Retry/freshness states; consequential actions retain guarded progress and exact recovery. No actual-UAT account, signatory, setting, payment or document command was submitted during acceptance.

**Backup, Restore & Updates is specification-only**, reserved as the fourth destination in [ADMIN-SYS-1](../requirements/ADMIN_SYS_1_BACKUP_RESTORE_UPDATES_PLAN.md). There is no empty page, upload handler or backup/restore/update web writer. Primary source/services and operational LAN were not changed. One concurrent primary login and a refinement gate-ordering error are qualified below; primary database activity is not described as zero.

## Target, reuse and current data

| Item | Verified result |
|---|---|
| Host / database server | DESKTOP-BPLJKRP / 127.0.0.1:3306, MariaDB 10.4.32 |
| UAT database | **`ldss_restore_1793167108097_2b47a744`**, 149 tables / 67 migrations |
| Release | **`C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release`** |
| Main / account SQL identities | **`ldss_ipu_cb1da15ff3ac@localhost` / `ldss_acct_69bae605b8ae@localhost`**, grants unchanged |
| Controller / API / web | **27200 / 30760 / 32464 → 30244 / 7264 / 4136** |
| Fictional payrolls | PAY-001 **processed v11**; PAY-002 **Review v3**; PAY-003 **Draft v2**, unchanged |
| Accounts / signatories | Original **three accounts** and credentials exact; **19 signatory rows / version 1** exact |
| Effective Paid | **2 / PHP 10,000.00**, one Payroll and one Individual |
| Protected primary | **5173/3001**, `ldss_primary_test_12676_61497616`, 150 tables / 67 migrations; 803 Paid records retained |

The actual dirty accepted release supplied staging at `C:/Users/ADMIN/.ldss/admin-ux-1-20261028-stage`; Git HEAD and old review ZIPs were not substituted. The new baseline includes **351 UAT audits**, rather than ADMIN-ACCT-2's earlier 350. [Inspection](../../output/admin-ux-1-20261028/inspection.json).

The [reuse/change-impact matrix](../../output/admin-ux-1-20261028/EVIDENCE_REUSE_AND_CHANGE_IMPACT.md) preceded application edits. Reused evidence includes [ADMIN-ACCT-2](../requirements/ADMIN_ACCT_2_SECURE_ACCOUNT_MANAGEMENT_REPORT.md), SIGN-1/SIGN-UX-1, IP-UX-2, PAY-UX-2 and BACKUP-1. Account authorization/private handoff, financial output builders, document pagination and historical financial acceptance were not redesigned or broadly rerun. ui-ux-pro-max and Playwright were applied; the local design-system search was adapted to existing LDSS colors, Manrope/DM Sans, Bootstrap, Lucide and native dialogs. Its unrelated hero/new-font suggestions were not adopted. [Design decisions and audit](../../output/admin-ux-1-20261028/DESIGN_SYSTEM_AND_AUDIT.md).

## Inventory and information architecture

The actual before-state Administration disclosure contained **11 links**: Account Management, Document Signatories, Program Settings, My access, About the workspace, Document policies, Payroll, Audit events, Configuration, Implementation plan and System status. Generic Configuration duplicated access to Program Settings. Accounts overflowed the page at 820px; mobile actions required horizontal traversal. Signatories presented all eight officials before a lengthy capacity disclosure. Program Settings exposed a legacy Payroll row as an edit even though the server correctly rejected it under active central signatories.

The audit also inspected Home, access, workspace overview, document policies, audits, status, implementation plan and academic-year/semester/barangay reference views. They are existing global/reference utilities, not new administrative destinations. [Actual before inventory](../../output/admin-ux-1-20261028/before-browser.json).

**Setup & administration** now exposes the three working pages directly, without an extra landing route or disclosure. Existing reference/access/diagnostic utilities remain in a separate **Reference & system tools** group with their routes and permissions retained. Business navigation is separate; Payroll is not inside Administration. Home remains the existing global Home. No decorative counters, duplicate signatory editor, fake notifications or backup controls were introduced. The planned fourth position and its security/implementation stages are documented only in ADMIN-SYS-1.

## Working pages and command safety

**Accounts.** Create Account remains the primary action. One server-paged table combines name/login identity, with role, status, last sign-in in Philippine time and a concise action select. Mobile rows expose status and actions directly rather than clipping them off-screen. Search/role/status filters remain bounded, and activity is a separate focused read. Cancelling activity aborts/ignores its pending response, preventing a late response from reopening the dialog. Changed filters never present the earlier list as the newly confirmed result.

Create, edit, role, disable/reactivate, reset and activity remain the accepted functions. Own-account restrictions, last usable/activated Administrator checks, role/session invalidation, private token handoff and all SQL authority remain unchanged. Disabled rows exclude role/reset actions and require an explicit role in the reactivation form. The original Account submit/body/recovery function is byte-identical; only its read/presentation surroundings changed.

**Document Signatories.** A DV / OR / Payroll selector shows the applicable sections, printed names, positions and capacities together. Shared Mayor/Treasurer data is one draft, not duplicate persisted entries. All eight officials and ten capacities remain in the unchanged saved contract, including the five-role Payroll mapping and **RANNEL V. FARAON**. Missing OR names remain blank with a visible warning. Certification functions, actual recipient acknowledgment, fixed DAET, CAMARINES NORTE form address and historical snapshots are unchanged. The source version is retained with edits; a refresh does not silently rebase old edits onto a newer version. Discard & Refresh is explicit.

The original reason/reference and review confirmation remain. Saving now uses the existing compact `FocusedDialog` progress view and retained command hook, with the actual configuration identity/version and eight officials. No fake percentage or additional approval step was added. An owned test changed only DV A's capacity; all other capacities and every official stayed unchanged.

**Program Settings.** A dedicated search/archived/page view replaces the technical category screen for this destination. Names and value summaries lead; code/type/version are in Details. Long values have an explicit full-value disclosure. Ordinary edits keep the stored type and omit its selector; creating a new generic setting still needs the existing required code/type fields. No setting was renamed, deleted or rewritten for presentation.

FIN_SIGN rows remain excluded by the server. The historical `PAYROLL_SIGNATORIES` row is human-readable and protected, with no generic edit/archive/restore. Its raw JSON is not shown in the normal list. Existing reserved-key guards remain independently enforced. Generic reference categories no longer provide a second interactive Settings editor. The current actual database has only the protected historical row in this list; ordinary editable examples and pagination used fictional copy-only records.

**Loading/recovery.** Reads share a small keyed hook: initial skeleton/status, named Retry, abort/ignore stale responses, and last-confirmed labels during refresh or a transport error. Permission/session denial hides the retained read data. Empty results are distinct from unavailable data. No blocking dialog or polling was added to GETs.

Minor edits retain in-button feedback. Consequential account changes, signatories and setting add/archive/restore use existing blocking progress; unresolved outcomes prevent dismissal, repeated submission and conflicting navigation. Exact body/key/version are retained in the existing actor store and browser recovery storage. The settings page uses the established hook with its **original 15-second request bound**; other callers keep their original default. No global timeout was increased, backend command-state service added, or writer contract changed. Unavailable browser storage leaves in-memory recovery; forced termination is not a delivery/recovery guarantee.

## Before/after and accessibility

Matched actual-UAT captures use the same three accounts, signatory version and settings data, 900px viewport height and normal zoom. Successful-login timestamps naturally change. No actual records were changed for screenshots.

| Width | Accounts | Document Signatories | Program Settings |
|---|---|---|---|
| 1440 | [Before](../../output/playwright/admin-ux-1/before-accounts-1440.png) / [After](../../output/playwright/admin-ux-1/after-accounts-1440.png) | [Before](../../output/playwright/admin-ux-1/before-signatories-1440.png) / [After](../../output/playwright/admin-ux-1/after-signatories-1440.png) | [Before](../../output/playwright/admin-ux-1/before-settings-1440.png) / [After](../../output/playwright/admin-ux-1/after-settings-1440.png) |
| 1024 | [Before](../../output/playwright/admin-ux-1/before-accounts-1024.png) / [After](../../output/playwright/admin-ux-1/after-accounts-1024.png) | [Before](../../output/playwright/admin-ux-1/before-signatories-1024.png) / [After](../../output/playwright/admin-ux-1/after-signatories-1024.png) | [Before](../../output/playwright/admin-ux-1/before-settings-1024.png) / [After](../../output/playwright/admin-ux-1/after-settings-1024.png) |
| 820 | [Before](../../output/playwright/admin-ux-1/before-accounts-820.png) / [After](../../output/playwright/admin-ux-1/after-accounts-820.png) | [Before](../../output/playwright/admin-ux-1/before-signatories-820.png) / [After](../../output/playwright/admin-ux-1/after-signatories-820.png) | [Before](../../output/playwright/admin-ux-1/before-settings-820.png) / [After](../../output/playwright/admin-ux-1/after-settings-820.png) |
| 375 | [Before](../../output/playwright/admin-ux-1/before-accounts-375.png) / [After](../../output/playwright/admin-ux-1/after-accounts-375.png) | [Before](../../output/playwright/admin-ux-1/before-signatories-375.png) / [After](../../output/playwright/admin-ux-1/after-signatories-375.png) | [Before](../../output/playwright/admin-ux-1/before-settings-375.png) / [After](../../output/playwright/admin-ux-1/after-settings-375.png) |
| 320 | [Before](../../output/playwright/admin-ux-1/before-accounts-320.png) / [After](../../output/playwright/admin-ux-1/after-accounts-320.png) | [Before](../../output/playwright/admin-ux-1/before-signatories-320.png) / [After](../../output/playwright/admin-ux-1/after-signatories-320.png) | [Before](../../output/playwright/admin-ux-1/before-settings-320.png) / [After](../../output/playwright/admin-ux-1/after-settings-320.png) |

Signatories page height changed **1,465→931px** at 1440 and **2,458→1,964px** at 320. Accounts remains 931px desktop; at 320 it grows **950→1,239px**, a deliberate tradeoff for showing all statuses/actions instead of requiring horizontal traversal. Lists remain paged at 25; a 25-account mobile page is still long. Wide settings/table content uses local horizontal scrolling. A final isolated/actual check confirms at least 240px readable value columns without page overflow; the earlier fragmented-word capture was replaced.

All three changed pages passed **1440/1024/820/375/320 CSS px**, keyboard form opening/cancellation, focus restoration, reduced motion and no page-level horizontal overflow. New controls/summary targets use 44px sizing and visible 3px focus. Staff/Coordinator actual denials were tested; no administrative write control was offered to them. [Staged acceptance](../../output/admin-ux-1-20261028/stage-browser.json), [installed acceptance](../../output/admin-ux-1-20261028/after-browser.json), [final settings readability](../../output/admin-ux-1-20261028/final-settings-browser.json).

Native control returned **OS error 2**, no available apps/browsers: **native 200% remains unverified**. Emulated viewport checks are not a substitute or full AT/WCAG certification. [Native limitation](../../output/admin-ux-1-20261028/native-limit.json).

## Read performance and bundle cost

No demonstrated slow SQL path justified a backend change. Actual page-read observations were Accounts **82→50ms**, Signatories **52→62ms**, Settings **45→58ms**. These are individual warm local observations, not a claimed general speedup. Navigation-related API calls remain one for Accounts and Signatories; Settings drops **two→one**, removing its repeated `me/permissions` read. The shell snapshot controls presentation only; every server call retains authorization.

| Actual 5181 read, three warm samples | Median | Response bytes |
|---|---:|---:|
| Account list / search | **10.89 / 9.73ms** | **665 / 258** |
| Account activity | **11.26ms** | **3,463** |
| Signatories | **9.12ms** | **1,313** |
| Settings list / search | **7.16 / 8.37ms** | **604 / 604** |
| Settings offset 25 | **7.64ms** | **45**, truthfully empty for the actual one-row list |

On the owned 30-account/27-visible-setting fixture, instrumented account list/search/activity each used **30 mysql2 query/transaction calls** including authorization, with median SQL elapsed **6.95 / 6.07 / 6.12ms**. Signatories used **29 calls / 6.05ms**, Settings **24 / 5.35ms**. The extra permission read cost **7 calls / 1.39ms**; removing it avoids that read, not the authorization inside Settings. Observed API medians were 6.74–9.39ms. A concurrent account/auth pair returned 200 in **8.23ms**. Observed process RSS reached **137.12 MiB** in that sequence, not a worst-case bound. No per-account HTTP reads or cross-request security cache was added.

Client JS/CSS changes **1,498,437→1,514,507 bytes**, **+16,070**: JS **+10,919**, CSS **+5,151**. No dependency/font/polling change. Host load, cache state and datasets limit comparison; no maximum-account, cold-start, concurrency-capacity or latency SLA is supplied. [Owned measurements](../../output/admin-ux-1-20261028/performance.json), [actual reads](../../output/admin-ux-1-20261028/actual-read-performance.json), [summary](../../output/admin-ux-1-20261028/measurement-summary.json), [bundle](../../output/admin-ux-1-20261028/bundle-impact.json).

## Tests, source and activation

| Final check | Result |
|---|---|
| Scoped ESLint `server src tests scripts/accounts --max-warnings 0` | Exit **0**; no rule relaxed. Whole-repository lint is not claimed because of inherited unchanged controller findings. |
| Build and its three TypeScript checks | Exit **0**; final CSS readability build repeated without JavaScript changes |
| Focused units | **11 files / 80 tests passed** |
| Secrets | Exit **0**, **1,408** source/build files scanned |
| Focused copy integration | **Four groups passed**: role denials, reserved/stale/self protections, one commit for each UI retry, full original security/financial/document/schema preservation |
| Browser recovery | Failed-read Retry, skeletons, stale-search cancellation, closed activity, three post-commit lost responses, exact keys/bodies, double-click and Escape/navigation blocking passed |
| Disabled account | Restricted action menu, explicit reactivation role, mobile action target and Cancel passed on a copy |

An actual copy-only account create, signatory save and ordinary setting edit each lost its first committed response. **Two identical requests returned one commit** for each operation. Only selected DV A capacity changed. Mutation/fault tests used owned disposable databases; actual acceptance recorded **zero business-write attempts**. Server authorization, ledger and rollback tests from ADMIN-ACCT-2/SIGN-1 remain applicable because those backend bytes are exact; unchanged large payroll/financial/document suites were reused, not rerun. [Commands](../../output/admin-ux-1-20261028/checks.json), [final build](../../output/admin-ux-1-20261028/final-build.json), [integration](../../output/admin-ux-1-20261028/integration.json), [recovery browser](../../output/admin-ux-1-20261028/recovery-browser.json), [disabled UI](../../output/admin-ux-1-20261028/disabled-ui.json).

**Nine source package files: six existing changes, three additions**, installed only in the dedicated release:

| Files | Scope |
|---|---|
| New `src/AdminReadState.tsx` | Keyed mounted-view reads, skeleton/status/Retry and refresh control |
| New `src/ProgramSettings.tsx` | Protected human-readable list, ordinary forms and existing command recovery |
| `src/AccountManagement.tsx`, `src/DocumentSignatories.tsx` | Compact presentation, read handling, document grouping and progress |
| `src/App.tsx`, `src/ConfigurationPage.tsx` | Direct Administration navigation, separate utilities, dedicated Settings route/recovery |
| `src/prior-command.ts` | Optional timeout argument; existing default unchanged, Settings retains 15 seconds |
| `src/styles.css` | Append scoped responsive/focus/readability rules after the exact accepted prefix |
| New `tests/admin-workspace.test.tsx` | Seven read/initial-state/accessibility boundary cases |

All backend source/compiled files, command writers, SQL grants, authentication, migrations, permissions, dependencies, runtime/launcher files, financial readers/builders and private profiles remain exact. **21,365 of 21,372 starting release files** remain exact; differences are the six declared existing sources and client entry. Old hashed assets remain. The final manifest covers **21,393 files**. Root application files were not replaced; the two requested reports and task evidence are additions. [Final hashes](../../output/admin-ux-1-20261028/candidate-files.json), [source preservation](../../output/admin-ux-1-20261028/source-preservation.json), [source ZIP](../../output/admin-ux-1-20261028/candidate-source.zip).

BACKUP-1 complete isolated recovery passed before mutations and with UAT ports quiet before installation:

| Checkpoint | SQL / encrypted bytes |
|---|---:|
| Initial | **1,934,704 / 487,811** |
| Quiet installation | **1,935,919 / 488,098** |

Both verified all 149 tables, complete values/checksums, migration journal, schema, constraints, triggers, views and rejection probes. Quiet archive SHA-256: `105b117df95a62ec52878154705b4dae83c81514b4908275fe2a700ea094a347`. A second retained copy supported the final CSS-only visual check. Both copies, their scoped accounts and the quiet recovery target were removed. Existing finite limits/key custody remain. **No backup was restored over actual UAT or primary.** [Initial recovery](../../output/admin-ux-1-20261028/recovery.json), [quiet recovery](../../output/admin-ux-1-20261028/activation-recovery.json).

Command quiescence, source integrity and application-only fallback preceded the coordinated 5181 installation. Only its verified controller tree was stopped/restarted. The later one-file CSS refinement and matching assets used atomic file replacement with no second restart. Current UAT/API and primary readiness are 200. [Installation](../../output/admin-ux-1-20261028/promotion.json), [CSS refinement](../../output/admin-ux-1-20261028/visual-promotion.json), [fallback](../../output/admin-ux-1-20261028/fallback.json), [delivery](../../output/admin-ux-1-20261028/delivery.json).

## Preservation, incident and stop

Actual UAT retains all original accounts/passwords/roles, private credential file, capability/key/profile hashes, all 19 signatory rows/version/hash, configuration ledger and financial/document/source values. The original individually Paid transaction, its **28 October** date and original DV/OR remain exact. The payroll Paid date remains **19 October**; effective Dashboard remains **2 Paid / PHP 10,000**, checked in the installed Coordinator browser. [Dashboard](../../output/playwright/admin-ux-1/after-payment-overview.png), [private/grant preservation](../../output/admin-ux-1-20261028/private-boundary-preservation.json).

All **351** starting UAT audit rows match at full datetime precision. Seven task logins/seven logouts and one additional recorded Administrator login bring the total to **366**. Original audit history remains; normal last-seen/revocation/rate-limit changes are qualified. The unchanged replacement-login policy can supersede earlier sessions for the same account; this task did not perform a blanket session reset or change that policy. Task logouts returned 204 and subsequent probes 401. [Authentication summary](../../output/admin-ux-1-20261028/authentication-summary.json).

**Gate-ordering incident:** the final refinement's fresh preservation command rejected a new primary authentication delta. Its shell sequence nevertheless continued and installed the already-staged CSS before that delta was qualified. This was an execution error, reported during work. Further installation stopped. A separate comparison then proved exactly **one appended primary `auth.login`**, with session/rate-limit table activity, and **every other table value/schema unchanged**. The operator is not independently attributed; the task made no primary authentication request. The helper now executes its preservation gate internally and stops on failure. Final preservation pins the exact qualified audit addition rather than allowing arbitrary primary deltas. No database repair/restoration or weakened financial assertion was used.

Primary preserves all **803 Paid records/dates**, accounts and business tables, 67 migrations, original **20,319 audits**, and all **21,258 covered release files**. Its qualified final audit count is **20,320**. Original primary session-field deltas cannot be reconstructed from this task's initial aggregate snapshot and are not claimed exact. Primary API/web owners **39400/19292** remain; no primary restart occurred. LAN listeners 3002/3443 retain **8620/14816**. No operational LAN change or exhaustive new LAN database inventory is claimed. [Qualified primary activity](../../output/admin-ux-1-20261028/primary-concurrent-activity.json), [complete preservation](../../output/admin-ux-1-20261028/final-preservation.json), [full-precision audit prefixes](../../output/admin-ux-1-20261028/audit-prefix.json).

Other staged/helper corrections covered an inherited mobile table minimum width overriding the new card layout, the final narrow Settings value width, stale-filter test state, login payload extra fields, a missing JSON logout header and a filtered account-total collector. A capacity-field mapping typo was corrected before mutation acceptance; the final drill proves only DV A changes. No writer, validator, constraint or security expectation was relaxed.

Remaining limits: native 200%, full AT/WCAG, maximum-account/load/cold-start acceptance remain unverified. Long mobile account pages and local scrolling for wide settings persist. The existing large-chunk build warning remains. Older reference/system utility forms retain their existing local-recovery limitations outside these three pages. The smallest next optimization is measured route-level loading of administration code, with pending-command recovery preserved; it is not started here. ADMIN-SYS-1 remains a separate specification requiring its own security/operator/policy authorizations.

**Stopped after verified 5181 redesign, preservation and reporting. No actual-UAT account/configuration/signatory/financial command, migration, update-package execution, primary source/service change or operational LAN modification occurred. LAN-R2A remains paused.**
