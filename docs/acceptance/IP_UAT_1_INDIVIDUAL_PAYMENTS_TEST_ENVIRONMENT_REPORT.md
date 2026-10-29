# IP-UAT-1 — Dedicated Individual Payments test environment

28 October 2026, Philippine time. **Available for manual testing at [http://127.0.0.1:5181/](http://127.0.0.1:5181/), with API on loopback port 3031.** The dedicated instance has 16 fictional scholars covering the 15 requested scenarios plus a Review anchor. Actual Coordinator/Staff browser login, the four workspaces, focused financial workflows, complete fictional-baseline recovery and guarded reset passed. The instance is left running with its fictional business baseline restored.

**Login: `uat_coordinator@example.invalid`; account name: `uat_coordinator`.** The user confirmed the email login because the existing application requires an email address. The requested password has 14 characters and fails the unchanged 15-character minimum. A generated UAT-only password works through the actual browser. It and the optional Staff credential are in the restricted [private credential handoff](C:/Users/ADMIN/.ldss/ip-uat-1-20261028/private/UAT_LOGIN.txt), not in this report or application assets.

Start with the [one-page scenario index](http://127.0.0.1:5181/IP_UAT_1_SCENARIOS.html) and [office walkthrough](IP_UAT_1_USER_WALKTHROUGH.md). Confirm the yellow **SYNTHETIC UAT — NOT REAL PAYMENTS** banner before operating. Port 5173 remains primary and must not be used for these exercises. LAN-R2A remains paused.

## Environment and isolation

| Item | Verified UAT result |
|---|---|
| Frontend / API | **127.0.0.1:5181 / 127.0.0.1:3031**, strict loopback listeners |
| Active database after tested reset | **`ldss_restore_1793167108097_2b47a744`** |
| Restricted runtime account | **`ldss_ipu_cb1da15ff3ac@localhost`** |
| Private root / dedicated application | `C:/Users/ADMIN/.ldss/ip-uat-1-20261028/` / its `release/` directory |
| Controller / API / frontend PIDs | **55368 / 62016 / 66772**, freshly verified |
| Schema | **67 accepted migrations / 149 inventoried tables**, including the UAT ownership marker, plus three views; F58 absent |
| Accounts | One requested Coordinator, one Staff, one setup System Administrator; genuine existing roles |
| Browser session namespace | **`ldss_ip_uat1_session`**, HttpOnly / SameSite Strict |
| Business baseline | **16 scholars; three numbered payrolls; two unpaid individual transactions** |

This is a separate logical database on the existing **MariaDB 10.4.32 / port 3306**, not a separate database engine or machine. It shares neither writable business tables, sessions nor mutable application directories with primary. Its restricted SQL account is denied access to primary and cannot rewrite its ownership marker. Startup checks the exact configured database/account, hostname, ownership token/purpose, schema count, private release hashes and loopback ports. Primary identities and unknown ownership are rejected.

The runtime is a physical copy of the active accepted AUTH-REL-3 release, including its own Node/dependencies. All **21,258 accepted source/runtime files** match both primary and the UAT copy. No dependency installation or application rebuild was needed. A small UAT transport adapter separates cookies and rejects foreign browser origins; the unchanged authentication, CSRF, P1/M1, authorization and financial services still execute every request. The dedicated controller, API and frontend have separate logs/state. Setup material is restricted to ADMIN/SYSTEM outside the Apache workspace. [Source identity](../../output/ip-uat-1-20261028/source-integrity.json), [final preservation and ownership](../../output/ip-uat-1-20261028/final-preservation.json).

## Fictional scenario roster and usable actions

All people, authority packets, documents and financial evidence were created for this exercise. Scholar and financial business records were established through supported services/API commands, including approved selection import, document review, prior approval, official publication, numbered windows, review/finalization, processing, outcomes and omissions. Direct SQL was limited to schema/grants/ownership setup, reads and an isolated rollback trigger; it was not used to fabricate a payment action. Only the builder's Node Date and its own SQL connections progressed through fictional dates. Machine and database-global clocks were not changed.

| Case / fictional name | ID suffix | Restored starting condition |
|---|---:|---|
| A — Aster Unassigned | 00015 | Active, no assignment; evidence needs review |
| B — Birch Complete | 00012 | Requirements complete, no frozen assignment |
| C — Cedar DraftDeferred | 00013 | Deferred from editable PAY-003 |
| D — Dahlia ReviewDeferred | 00010 | Deferred from PAY-002 in Review; requires Return to Draft |
| E — Elm Frozen | 00001 | PAY-001 frozen member; direct editing/restoration blocked |
| F — Fern LaterEligible | 00014 | Eligible ordinary candidate in later PAY-003 |
| G — Ginkgo Reserved | 00002 | Existing PAY-001 reservation blocks another stipend |
| H — Hazel Omitted | 00003 | Genuine omission from numbered finalized source, recorded |
| I — Iris AwaitingApproval | 00004 | OR+DV request awaiting Coordinator decision |
| J — Juniper UnpaidORDV | 00005 | Authorized, prepared, unpaid OR+DV transaction |
| K — Kestrel Unclaimed | 00006 | Original processed-payroll Unclaimed outcome |
| L — Laurel Pending | 00007 | Processed-payroll Pending outcome |
| M — Maple Paid | 00008 | Already Paid; duplicate payment rejected |
| N — Nettle Incomplete | 00016 | Incomplete requirements; no payable shortcut |
| O — Orchid Cheque | 00009 | Authorized, prepared, unpaid cheque-route transaction |
| R — Rowan ReviewAnchor | 00011 | Additional PAY-002 Review member |

The complete fictional IDs are `LDSS-2026-` plus the suffixes above. Exact navigation links and names as searched are in the walkthrough/index. [Scenario identifiers](../../output/ip-uat-1-20261028/scenarios.json).

Restored **PAY-001 is Processed / v11**, with five frozen members: **one Paid, one Unclaimed, three Pending**. **PAY-002 is Review / v3** and **PAY-003 is Draft / v2**. The two prepared individual transactions remain unpaid; there is **zero individual Paid outcome** after reset. Documents have not been pre-generated in the restored baseline, allowing manual OR/DV preparation.

Preparation starts **Closed** so Iris/Juniper/Orchid's omission routes are usable. A Coordinator must explicitly reopen preparation for Draft restoration or later-payroll preparation, then close it again for OR+DV approval/preparation. This is an existing semester-wide business restriction, not a fixture bypass. Staff cannot restore, Return to Draft or approve an omission. Deferred is not individually payable; Pending is not Unclaimed; Prepared/Forwarded/Processed is not Paid.

Both-role discovery checks find **All 6 / Deferred 6 / Needs Review 4 / On payroll or reserved 10**. These scopes overlap and must not be summed. Every discovery row retains `payable=false`; the original payment route supplies authority. Search, bounded nonempty server pages, an empty next page and excess-limit rejection passed. [Scenario API checks](../../output/ip-uat-1-20261028/scenario-api-baseline.json), [post-reset readiness](../../output/ip-uat-1-20261028/final-manual-readiness.json).

## Focused acceptance and evidence reuse

| Check | Result |
|---|---|
| Focused existing Individual Payments units | **9 files / 83 tests passed**, one worker, dedicated accepted runtime |
| New focused workflow integration | **Nine groups passed**, only owned fictional data mutated |
| Coordinator/Staff browser | Actual form login, four workspaces, desktop/mobile, dedicated cookie, keyboard dialog and logout passed |
| Recovery/reset | Complete baseline restoration, explicit reset, before-reset evidence and fresh credentials/scenario verification passed |
| Reset refusal | Missing confirmation, primary identity, ownership and runtime-account mismatches rejected; UAT remained available |
| Primary preservation | Full 150-table/schema/journal/grant comparison and original process/listener owners exact |
| Syntax/secrets | Task JavaScript checked; secrets scan passed; no application source change required a rebuild |

The integration proves ordinary Draft restoration, Review return/restoration, Staff denials, a late-audit failure with complete rollback, exact committed retry and changed-payload rejection. It exercises omission request/Coordinator approval/unpaid preparation, draft OR and DV generation/download with exact retry, Unclaimed request/DV-only preparation, actual cheque forwarding and an acknowledged fictional Paid command. A new duplicate rejects; exact retry returns the existing settlement. Original payroll Pending/Paid/Unclaimed outcomes remain distinct. Those mutations were subsequently removed from the active UAT by the verified baseline reset, with their before-reset archive retained privately. [Nine groups](../../output/ip-uat-1-20261028/integration.json), [83 tests](../../output/ip-uat-1-20261028/focused-unit-tests.json), [refusal tests](../../output/ip-uat-1-20261028/reset-refusals.json).

Security checks deny primary SQL access, owner-marker modification, cross-environment cookie authentication, foreign origin and missing CSRF without a business change. Actual browser login preserves a pre-existing primary-named cookie sentinel. Both roles' logout returns **204**, followed by **401** for the saved session cookie. No credentials are sent to primary login; the primary cross-authentication probe is a passive GET with an unrelated token.

Playwright used real Chrome at **1440 and 375 CSS pixels**, with no page-level horizontal overflow. Recovery-dialog focus stays inside; Escape returns focus to its trigger. The installed ui-ux-pro-max guidance informed the visible environment marker, existing LDSS layouts and keyboard review. Relevant unchanged full responsive/native-200% evidence was reused rather than repeated; this is not a new full accessibility certification. Screenshots: [Coordinator desktop](../../output/playwright/ip-uat-1/coordinator-discovery-1440.png), [Coordinator mobile](../../output/playwright/ip-uat-1/coordinator-discovery-375.png), [mobile recovery](../../output/playwright/ip-uat-1/coordinator-recovery-modal-375.png), [Staff mobile](../../output/playwright/ip-uat-1/staff-discovery-375.png), [omissions](../../output/playwright/ip-uat-1/coordinator-omitted-scholars.png), [cheques](../../output/playwright/ip-uat-1/coordinator-cheque-payments.png). [Browser results](../../output/ip-uat-1-20261028/browser.json).

The [reuse matrix](../../output/ip-uat-1-20261028/EVIDENCE_REUSE_AND_CHANGE_IMPACT.md) preceded environment work. AUTH-REL-3.1's exact application, accepted **970-test / 18-suite** security/financial evidence and unchanged browser recovery evidence were reused. No SEC-3 repair, F54/F58 research, full 835-person workflow, database upgrade rehearsal or unrelated financial suite was repeated.

## Recovery and operator controls

BACKUP-1 captured the approved fictional baseline: **1,608,695 SQL bytes / 266,049 encrypted bytes**, SHA-256 **`e519505253f78fdc39060c6050c88f300ec76f8536c9d17a1be5ac94fbeac068`**. Complete isolated restoration verified all **149 tables**, values/counts/checksums, migration history, columns/indexes, foreign keys/checks, triggers, executable views and rejection probes. Its temporary schema/account were removed. The rehashed reviewed MariaDB 11.4.13 client handled binary transport; the server stayed 10.4.32. Keys, archives and detailed evidence remain restricted. No primary backup lock, restore or migration occurred. [Recovery](../../output/ip-uat-1-20261028/recovery.json).

Run these commands from `C:/xampp/htdocs/scholar_monitor`:

```powershell
node output/ip-uat-1-20261028/control.mjs start
node output/ip-uat-1-20261028/control.mjs verify
node output/ip-uat-1-20261028/control.mjs stop
node output/ip-uat-1-20261028/control.mjs reset --confirm-reset-ip-uat-1
```

Finish/recover pending commands before stopping or resetting. Reset checks ownership and deliberate confirmation, blocks new UAT mutations, refuses active transactions and stops only the freshly verified UAT controller tree. It saves an encrypted before-reset checkpoint, verifies the approved baseline hash, completely restores into a newly owned schema and scoped definer account, regrants only the dedicated restricted runtime, updates only private UAT configuration and restarts it. The old fictional schema is removed only after successful restoration; baseline identities and credentials remain stable. A failed reset requires operator review while the UAT is stopped, never a primary restore.

Two tested reset cycles cleaned up the previous owned schema/definer and restored the same business baseline. The latest reset changed the UAT database name to the current name above. Future resets will change it again; use private ownership metadata and `verify`, not an old name or PID. Startup and reset accept only their explicit owned-schema patterns plus matching ownership proof. Pre-reset test evidence was retained. A working instance is left running after final acceptance.

## Exact changes, primary preservation and limitations

**No existing repository application, test, schema, configuration or dependency file changed.** New repository deliverables are the two requested acceptance documents and task-local drivers/evidence under `output/ip-uat-1-20261028/`. The added drivers are `inspect.mjs`, `prepare.mjs`, `seed.mjs`, `cleanup-undelivered.mjs`, `diagnose.mjs`, `baseline.mjs`, `control.mjs`, `browser.mjs`, `integration.mjs`, `verify-final.mjs`, `final-reads.mjs` `write-walkthrough.mjs` and `final-browser.mjs`.

Outside the workspace, only the owned UAT root was created: a physical accepted release copy; **three new `scripts/ip-uat1/{controller,api,web}.mjs` launch adapters**; **`public/IP_UAT_1_SCENARIOS.html`**; private ownership/environment/integrity/credential files; baseline archives; and runtime state/logs. The app's original files remain exact. No new financial endpoint, writer, permission or authentication-policy exception was introduced.

Fresh primary verification retains **MariaDB 10.4.32, 150 tables, 67 migrations, F57 present/F58 absent**, original grants/accounts, Masterlists, approvals, sources, command ledgers, cutoff evidence, PAY-003 Draft/v4/834-included/one-deferred state and all payment rows. **All 800 Paid records remain exact: two dated 24 October / 798 dated 26 October. All 20,310 starting primary audits remain exact. No primary authentication or business command was submitted.** All **1,402 scoped existing workspace inputs**, including 310 retained distribution files, remain exact. Primary **56248/24928/28900** and all inventoried retained/LAN listener owners remain unchanged. [Final preservation](../../output/ip-uat-1-20261028/final-preservation.json).

Initial fixture attempts exposed an unrecognized disposable-schema name, strict payload fields, an unnecessary unsatisfied payout obligation, premature finalization and a verification date preceding receipt. The builder was corrected using existing contracts; no safeguard was relaxed. Only verified undelivered owned schemas were removed, with failure inventories retained. Cookie acceptance caught the framework's late cookie serialization; the UAT-only final-response adapter was corrected and both-role isolation retested. Browser locator/mobile navigation and a logout helper's missing JSON body were corrected. A primary-grant comparison normalized unordered inventory rows; actual grants did not change. These were setup/test corrections, not primary repairs.

Remaining limits: this is compact fictional UAT, not certification of office policy, actual financial authority, official form acceptance, performance/capacity or physical machine isolation. The new Unclaimed exercise verifies request/DV preparation; broader canonical settlement/race coverage is reused from the exact accepted release. No actual external cheque or financial-office acceptance is established by forwarding. Full responsive/native zoom sweeps were not rerun. Keep fixtures on loopback; no operational data should be imported here.

Final checks passed for **16 task JavaScript files**, all **24 local documentation links**, and **1,445 source/build files** in the secrets scan. A real Vite filesystem request for the private ownership file returned **403**. [Document/source checks](../../output/ip-uat-1-20261028/document-and-source-checks.json), [final post-reset browser login](../../output/ip-uat-1-20261028/final-browser-readiness.json).

The walkthrough's feedback checklist covers status clarity, role controls, restoration, history, source restrictions and usability. **Recommended next task: manual office testing of this scenario index, recording case IDs, results and confusing messages before an intentional UAT-only reset.** No primary promotion, financial-policy change, MariaDB/XAMPP upgrade, F58 application, LAN-R2A resumption or operational LAN work is authorized by this delivery.

**Stopped after delivering the working isolated UAT, verified reset, focused acceptance, preservation and documentation. Primary and operational LAN data remain unchanged.**
