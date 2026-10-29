# ADMIN-ACCT-2 — Secure account management

28 October 2026, Philippine time. **Implemented and installed on the dedicated [5181 UAT](http://127.0.0.1:5181/#accounts), API 3031.** System Administrators can create and maintain accounts through **Setup & administration → Account Management**. A separate, narrowly scoped SQL capability supports the new commands. Existing accounts, credentials, payments, documents and signatory history remain exact. Actual-UAT acceptance used reads and form cancellation; **no account or financial command was submitted there**.

Primary 5173 remains running and unchanged. Operational LAN was not modified; LAN-R2A remains paused. This is UAT acceptance, not operational deployment authority.

## Baseline and evidence reuse

The [ADMIN-ACCT-1 findings](ADMIN_ACCT_1_ACCOUNT_MANAGEMENT_REPORT.md) were reused: existing permissions, account/operator services, reset consumption and accepted startup already existed, but the restricted runtime lacked the required writes and there was no session-authorized web command contract. This task explicitly authorized that missing boundary. It did not expose the old operator methods directly.

The [evidence-reuse/change-impact matrix](../../output/admin-acct-2-20261028/EVIDENCE_REUSE_AND_CHANGE_IMPACT.md) was prepared before implementation. AUTH-REL-3.1/P1/M1 admission and guard ordering, AUTH-REL-2 session binding, SIGN-1/SIGN-UX-1 and IP-UX-2 financial/document acceptance were retained. Shared authentication, authorization and financial implementations remain byte-identical; focused revocation and guarded-financial-callback tests exercise their interaction with the new account commands. No MariaDB upgrade study, dependency repair, full 835-person workflow or unrelated document generation was repeated.

| Verified target | Starting → final |
|---|---|
| Host / server | DESKTOP-BPLJKRP / 127.0.0.1:3306, MariaDB 10.4.32 |
| Dedicated UAT | **5181 / 3031**, database **`ldss_restore_1793167108097_2b47a744`** |
| Main UAT SQL runtime | **`ldss_ipu_cb1da15ff3ac@localhost`**, original grants unchanged |
| Release | **`C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release`** |
| UAT schema | **149 tables / 67 migrations**, checksums/timestamps unchanged |
| UAT controller / API / web | **17060 / 4948 / 32612 → 27200 / 30760 / 32464** |
| UAT payrolls | PAY-001 **processed v11**; PAY-002 **review v3**; PAY-003 **Draft v2**, unchanged |
| Existing application accounts | **Three**, same names, logins, passwords, versions, roles and status |
| Signatories | **19 rows / version 1**, unchanged, including source/history and missing-name state |
| Protected primary | **5173 / 3001**, `ldss_primary_test_12676_61497616`, **150 tables / 67 migrations** |
| Primary controller / API / web | **13108 / 39400 / 19292**, not restarted |

The fresh baseline already contained legitimate activity after earlier reports. Primary has **803 Paid records**, not the older 800 or two-Paid checkpoint: two dated 24 October, 798 dated 26 October and three dated 28 October. Its payrolls remain processed v805, processed v8 and Draft v4. The initial UAT audit count was **340**, including the intervening user login. None was overwritten. [Inspection](../../output/admin-acct-2-20261028/inspection.json).

## Narrow SQL and session boundary

The activated capability is **`ldss_acct_69bae605b8ae@localhost`**, restricted to the exact 5181 database. Its pool is private to the account module: two connections, queue limit 16, no global Fastify capability decorator. Only the dedicated UAT API wrapper registers the new routes. Default application registration and primary registration are unchanged.

This is a module/SQL-identity boundary in the same API process, **not OS process isolation**. Trusted local operators and the API process remain trusted. It is safer than giving every general-runtime route account-table writes: the existing runtime’s grants are unchanged and the new identity cannot read or write financial tables.

Exact authority:

| Tables | Granted operations |
|---|---|
| `users`, `auth_sessions`, `user_roles`, `roles`, `permissions`, `role_permissions`, `password_resets`, `configuration_guard`, `configuration_commands`, `audit_logs` | SELECT |
| `users` | INSERT `id,email,full_name,created_at,updated_at`; UPDATE `full_name,email,disabled_at,version,updated_at` |
| `user_roles` | INSERT `id,user_id,role_code,granted_at`; UPDATE `revoked_at` |
| `password_resets` | INSERT `token_hash,user_id,created_at,expires_at`; UPDATE `consumed_at` |
| `auth_sessions` | UPDATE `revoked_at` |
| `configuration_commands` | INSERT `actor_id,request_id,payload_hash,result,created_at` |
| `audit_logs` | INSERT `id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details` |

There is no password-hash UPDATE, DELETE, session INSERT, schema-wide privilege, DDL, GRANT OPTION, permission-map write or global authority beyond SQL USAGE. Disposable negative probes also reject financial SELECT, settings UPDATE and `mysql.user` SELECT. The actual grants were inventoried without printing password verifiers. [Capability metadata](../../output/admin-acct-2-20261028/capability-boundary.json).

Credentials and a random encryption key are outside the served release, under private `account-administration/`. Windows ACLs allow ADMIN and SYSTEM only; the profile identifies the authorized operator SID. Vite rejects private-profile access with **403**, and client assets contain no capability password. No operator/root credential is placed in the application profile. The existing primary and general UAT grants and `private/UAT_LOGIN.txt` hash remain exact. [Metadata preservation](../../output/admin-acct-2-20261028/metadata-preservation.json).

## Commands, roles and recovery

New bounded routes are GET `admin/accounts`, GET `admin/accounts/:id/activity`, and POST `admin/accounts/commands`, under the existing `/api/v1/` prefix. Reads use the accepted authorized snapshot mechanism. Each command uses session-bound authorization and the existing configuration/user guard ordering inside its transaction. A current **System Administrator** with `users.manage` is required; creation, role assignment and reactivation additionally require `roles.manage`. Staff, Coordinator and stale/revoked sessions cannot use these capabilities. Administrators receive no financial permissions.

Commands accept a validated action, target where applicable, expected account version, reason, explicit confirmation and idempotency key. Existing roles are reused: Staff, Coordinator and System Administrator. Creation normalizes the existing ASCII email contract, rejects duplicate logins and unsupported roles, and creates an account with password setup pending. No default password is assigned. Lists default to 25 rows, maximum 100, offset bounded to 10,000; search is bounded to 160 characters. Commands have an 8 KiB body limit and the UAT account ceiling is 5,000.

Profile edits, role replacement, disable, explicit-role reactivation and reset issuance increment account versions, revoke affected sessions and consume earlier reset credentials atomically. Reactivation does not restore old sessions or obsolete role assignments. A never-activated account remains setup-pending. Reset issuance does not claim that the password has already changed; existing reset consumption performs that change.

All self-account mutations are rejected; another activated Administrator must perform them. Demoting or disabling the last enabled, password-activated Administrator is rejected. Creating a second setup-pending Administrator does not satisfy that safeguard. Existing role rows are retained through revocation, with a new assignment where required.

One transaction writes the complete before/after account projection, reason and action to `account.admin_changed`, together with the durable `account-admin/v1` result in the existing configuration command ledger. Password hashes and reset tokens are excluded from the API/audit projection. Fresh authorization precedes ledger lookup; exact committed retries return their original result, including after later account activation. Changed-payload key reuse and stale versions reject. Audit or ledger failure rolls back the complete database command.

The UI reuses the established pending-command recovery hook. It retains the exact body, key and expected version while an outcome is uncertain, blocks conflicting actions/dismissal/navigation, and offers **Retry Exact Account Change**. Minor edits use in-button feedback; consequential commands use the existing compact progress dialog. Confirmation is never treated as completed issuance before the server confirms it.

## Password setup/reset handoff

Existing token generation, token hashing, password validation/hashing and single-use reset consumption are reused. Setup/reset expiry is **15 minutes**. No email service is invented and no token/password is returned to the ordinary account UI.

For durable recovery, the one-time token is encrypted with AES-256-GCM in a short-lived private artifact, bound to this database and a random reference. The command result contains only reference and expiry. A filesystem artifact can outlive a rolled-back database transaction; **the local handoff client therefore requires the matching committed ledger result and an active, unconsumed reset for the exact account** before displaying anything. An orphan artifact alone is unusable through this delivery path.

The authorized local operator runs the installed helper from the dedicated release:

```powershell
Set-Location 'C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release'
.\bin\node.exe scripts/accounts/handoff.mjs list
.\bin\node.exe scripts/accounts/handoff.mjs show <confirmed-reference>
```

`list` shows reference, login and expiry only. `show` opens a private Windows form identifying the recipient and expiry, with the one-time link. The link is passed over child stdin, not command-line arguments or a plaintext file; there is no automatic clipboard or email delivery. The form clears/closes on expiry. The operator must deliver it privately to the correct owner. **Confirmed issuance is not confirmed delivery.** Missing, expired, corrupt, consumed or uncommitted artifacts fail closed; a separately confirmed new reset is needed if recovery is unavailable.

Cleanup runs at startup, every 30 seconds and on helper use, with 100 encrypted-handoff/300 directory-entry bounds. No plaintext credential file was created. Real token listing/decryption/reset consumption were tested on copies; the native display/auto-close probe used a clearly fictional, non-active link. Real owner delivery was not automated. Actual 5181’s handoff outbox remains empty because no account command was executed there. [Handoff checks](../../output/admin-acct-2-20261028/handoff-check.json), [orphan/private-file checks](../../output/admin-acct-2-20261028/private-boundary-check.json).

## Interface and focused acceptance

The installed navigation is **Setup & administration → Account Management**, alongside the existing Document Signatories and Program Settings pages. Create Account, search and role/status filters precede one paged table. Actions expose Edit Details, Change Role, Disable/Reactivate, Reset Password and View Activity. Own-account rows expose activity only. Last sign-in comes from recorded successful login audits and displays Philippine time. Activity reads the latest 25 account events with readable labels.

The installed Administrator opened and cancelled create/review, edit, role, disable and reset forms without submitting. Escape restores trigger focus. Staff/Coordinator direct navigation returns the actual denial and no Create action. Signatories remain editable in their dedicated page; reserved FIN_SIGN rows remain absent from generic settings. The Coordinator’s original Payment Overview still shows **PHP 10,000.00 / 2 Paid / 1 Payroll / 1 Individual** after explicitly selecting the existing relevant cycle.

| Evidence | Capture |
|---|---|
| Installed desktop / mobile list | [1440](../../output/playwright/admin-acct-2/after-accounts-1440.png), [375](../../output/playwright/admin-acct-2/after-accounts-375.png), [320](../../output/playwright/admin-acct-2/after-accounts-320.png) |
| Installed create / confirmation, cancelled | [Desktop](../../output/playwright/admin-acct-2/after-create-1440.png), [320](../../output/playwright/admin-acct-2/after-create-320.png), [confirmation](../../output/playwright/admin-acct-2/after-confirmation-1440.png) |
| Permission denials | [Staff](../../output/playwright/admin-acct-2/after-staff-denied.png), [Coordinator](../../output/playwright/admin-acct-2/after-coordinator-denied.png) |
| Disposable committed-response loss | [Protected exact-retry state](../../output/playwright/admin-acct-2/stage-lost-response.png) |
| Preserved effective Paid summary | [Actual 5181](../../output/playwright/admin-acct-2/after-payment-overview.png) |

ui-ux-pro-max, Playwright and the security-best-practices skill were applied. Actual CSS viewports were **1440/375/320 × 900, DPR 1**. Keyboard, focused dialogs, cancellation, reduced motion and no page-level horizontal overflow passed. Narrow tables retain local horizontal scrolling. Native browser control failed with OS error 2 and exposed no controllable app/browser: **native 200% zoom is unverified**, with no emulation substituted. Full AT/WCAG certification is not claimed. [Staged browser](../../output/admin-acct-2-20261028/stage-browser.json), [installed browser](../../output/admin-acct-2-20261028/after-browser.json), [native limitation](../../output/admin-acct-2-20261028/native-limit.json).

| Focused check | Result |
|---|---|
| ESLint `server src tests scripts/accounts --max-warnings 0`, plus the edited UAT API wrapper | Both exit **0**; no relaxed rules. Whole-repository lint is not claimed; an inherited controller empty-catch finding was outside this patch. |
| Build, including all three configured TypeScript checks | Exit **0** |
| Eight focused unit files | **56 tests passed** |
| Secrets | Exit **0**, **1,405** source/build files scanned |
| Owned account/RBAC/security integration | **Five groups passed** |
| Actual UAT browser | All three roles passed, **zero business-write attempts** |

The unit set covers account validation/handoff, crypto, authorization, session-bound auth, passive-auth pool, action feedback, import recovery and bulk-command behavior. Integration covers all three account roles and activation; duplicate/invalid input; profile/role/disable/reactivate/reset; self/last-usable protection; expiry/single use; versions and competing Administrator edits; exact/changed-key retries; late audit/ledger rollback; capability negatives; bounded search/pages/activity; and preservation of original security, financial, document and signatory tables. After role, disable or reset issuance invalidated admitted financial principals, the guarded callback count was **zero**, with no financial commit.

The browser lost an actual fixture response **after account creation committed**: two identical requests produced one committed account change and original result. Uncertain dismissal/navigation and repeat submission were blocked. All mutation, race and uncertain-response testing used disposable copies. [Commands/exits](../../output/admin-acct-2-20261028/checks.json), [supplementary lint](../../output/admin-acct-2-20261028/supplementary-checks.json), [unit log](../../output/admin-acct-2-20261028/unit.log), [five groups](../../output/admin-acct-2-20261028/integration.json).

## Files, recovery and installation

**14 source package files: four existing changes and ten additions**, installed in the dedicated UAT release; root workspace application files were not replaced.

| Files | Change |
|---|---|
| New `server/accounts/model.ts`, `validation.ts`, `handoff.ts`, `service.ts`, `register.ts` | Typed bounded account contract, private delivery, authorized reads/atomic commands and UAT registration |
| New `src/AccountManagement.tsx` | Account table, filters, dialogs, activity and retained recovery |
| `src/App.tsx`, `src/prior-command.ts`, `src/styles.css` | Navigation, account-specific recovery classification and appended scoped styles |
| New `scripts/accounts/provision.mjs`, `handoff.mjs`, `private-handoff.ps1` | Trusted local provisioning and short-lived operator delivery |
| `scripts/ip-uat1/api.mjs` | Register capability only in the dedicated UAT wrapper |
| New `tests/account-administration.test.ts` | Focused validation/encryption/cleanup boundaries |

Five compiled account modules and the matching client build were installed. All pre-existing compiled server files, shared authentication/authorization, financial writers/readers/builders, permissions, schema, dependencies, default registration and accepted controller remain exact. Existing CSS is an exact prefix. **21,343 of 21,348 starting release files remain exact**; the other five are four declared source files and the client entry point. Old hashed client assets remain. The final integrity manifest covers **21,372 files**. [14-file hashes](../../output/admin-acct-2-20261028/candidate-files.json), [source preservation](../../output/admin-acct-2-20261028/source-preservation.json), [review source ZIP](../../output/admin-acct-2-20261028/candidate-source.zip).

Private additions are the capability profile, 32-byte handoff key and empty handoff directory under the UAT private root, plus the updated UAT integrity manifest. The private environment, ownership profile and existing credential file are unchanged. One separate exact-database SQL account was added; no application account was created during installation. No migration or dependency installation occurred.

Isolated staging used the actual accepted dirty release at `C:/Users/ADMIN/.ldss/admin-acct-2-20261028-stage`. BACKUP-1 captured **1,930,499 SQL bytes / 486,519 encrypted bytes** at both initial and quiet installation checkpoints. Both complete restorations verified all 149 tables, values/counts/checksums, migration journal and schema objects, including indexes, constraints, triggers and executable-view/rejection checks. Quiet archive SHA-256: `a95ccfd71e5e35ce53ed1056b98c9156f7e9835b1290dbf36a1a2ed2bda89cac`. Existing finite backup bounds, private key/archive custody and source-lock semantics remain unchanged. Nothing was restored over actual UAT or primary. [Initial recovery](../../output/admin-acct-2-20261028/recovery.json), [quiet recovery](../../output/admin-acct-2-20261028/activation-recovery.json).

Fresh preservation, exact source hashes, command quiescence, capability negatives and an application-only fallback preceded installation. Only the verified 5181 controller tree was stopped. Matching source/build and manifest were installed while 3031/5181 were quiet, then the existing accepted control restarted that UAT. Loaded account modules resolve inside its dedicated release; both readiness endpoints return **200**. Fallback preserves data and restores compatible application files/entry/manifest, retaining old hashed assets; it never restores a database. Five disposable schemas and their scoped accounts were removed, along with 46 remaining encrypted test artifacts and their fixture keys. Temporary ports are quiet. [Fallback](../../output/admin-acct-2-20261028/fallback.json), [promotion](../../output/admin-acct-2-20261028/promotion.json), [delivery/cleanup](../../output/admin-acct-2-20261028/delivery.json).

## Preservation, limitations and stop

The final complete comparison preserves all UAT business/account/document values, migration rows/timestamps and schema objects. The original individual Paid transaction, its 28 October date, DV/OR records and all signatory/source/approval history remain exact. The original payroll Paid date is **19 October**. The old NotPaid/Unclaimed source is retained; effective reporting still recognizes its subsequent individual payment. No payment history was rewritten to reconcile display counts.

All **340** original UAT audits match at full database datetime precision. Five task logins and five logouts append **10 authentication events**, for **350** total; session/rate-limit activity is qualified separately. All account, reset, role and command-ledger rows remain exact. Each task session logged out with **204**, followed by **401**. The user's separate session was not revoked.

Primary preserves **all 150 tables**, 67 migration rows, all 803 Paid records/dates and **20,319 audits**, with no table delta. Its **21,258-file release manifest and every covered file** match exactly. Primary 3001/5173 readiness remains 200 and its owners are unchanged. Retained LAN listeners 3002/3443 retain PIDs **8620/14816**; this is listener preservation, not a new exhaustive inventory of operational databases. [Full preservation](../../output/admin-acct-2-20261028/final-preservation.json), [full-precision audit prefixes](../../output/admin-acct-2-20261028/audit-prefix.json).

Test-helper corrections are retained in evidence. An early expiry probe violated the existing reset-expiry constraint; the corrected fixture uses an ordered past creation/expiry without weakening it. **Its original SQL diagnostic printed a disposable reset-token verifier hash.** That entire owned schema and scoped accounts were removed; no actual-UAT/primary token, plaintext password or live credential was involved. Subsequent helper failures emit sanitized codes/locations. Other corrections addressed scoped lint findings, the correct disabled-session denial, accessible select labels, concurrent cleanup ENOENT, fixture pagination/activity selection, and expiring orphan artifacts. Installed browser refinements focused the action select before testing return focus and explicitly chose the existing Dashboard cycle. A loaded-module check was corrected to exclude the type-only model module. None changed a financial guard or bypassed a failed application check.

Remaining limits: native 200% and full assistive-technology acceptance are unverified; the existing large-client-chunk warning remains. SQL isolation does not protect against compromise of the trusted API process/local operator. Delivery requires the authorized local operator and recipient; no mail delivery or automated real-token handoff is supplied. Credentials/keys are not part of the review ZIP. A SQL restore alone cannot recover a lost private handoff; missing private artifacts require separately confirmed reset issuance. Any future authorized UAT database reset/replacement must review and rebind this exact-database capability and private profile before startup; the existing reset command was not exercised or extended here. Complete operating-system/service failure, load capacity and operational LAN release acceptance are outside this task. No desktop launcher feature was added.

The review source ZIP independently extracted to the exact 14 reviewed source hashes. All report links resolve, and public task text was checked against known live credentials without disclosure. [Deliverable checks](../../output/admin-acct-2-20261028/deliverable-check.json).

The smallest next step is an authorized operator-led account setup exercise in **5181**, using the new UI and private handoff, if desired. Primary or LAN adoption requires its own scoped security, recovery and deployment authorization. This report does not initiate it.

**Stopped after verified ADMIN-ACCT-2 installation on 5181 and reporting. No actual-UAT account command, new payroll, payment, document/signatory change, primary restart or operational LAN modification occurred.**
