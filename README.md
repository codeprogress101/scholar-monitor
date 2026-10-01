# LDSS Scholarship Monitor

Current release: **F16 - Requirement Verification and Correction Loop (v0.17.0)**. F00 through F15 are accepted. Verification and correction are implemented and tested; F17 requirement waiver is next. Payout-specific integration connects in F18.

React + TypeScript + Bootstrap, Fastify, and **XAMPP MariaDB/MySQL**. XAMPP is the user-authorized amendment to the original PostgreSQL plan.

## Run on this computer

Start MySQL in XAMPP, then run `npm run dev` in this folder. Open **http://127.0.0.1:5173**. The API runs on port 3001. The local database is already provisioned and migrated.

The workspace requires an individual account. Apache is not needed; `.htaccess` blocks this source folder and credentials from Apache access.

## Scholar registry

Open **http://127.0.0.1:5173/#scholars** with a Staff or Coordinator account. Michael retains only System Administrator, so the registry deliberately shows a restricted-access message for his account. No operational role or approval permission was added automatically. Use the existing account/role commands for a separately authorized individual assignment.

Configure at least one active, unlocked academic year before entering scholars. Create a scholar with first/last name and a registration academic year. Middle name, suffix, birth date, barangay, email, phone, and address are optional; leave unknown values empty. Barangays come from Configuration. Every create/edit requires a reason.

The server assigns an internal UUID and `LDSS-YYYY-00001` identity. YYYY is the start year of the academic year selected at first entry. The sequence is independent per first-entry year, protected against concurrent creation, and limited to 99999 IDs per year. The permanent ID and first-entry year never change when the registration year, configured dates, or identity details are edited.

Search by name or permanent ID and filter by registration year. Results omit birth dates, phone, email, and address; open the authorized profile to view those fields. Edits preserve before/after audit history and reject stale versions. Locked/archived registration years block new entries and profile edits, including attempts to move a profile out of a locked year. An unchanged archived barangay can remain on an existing profile but cannot be newly selected.

Registration year is registry context, not a qualification decision or annual academic record. Annual qualification is available below each scholar profile. Operational status changes are available after official activation; academic history is available in the profile. No delete or automatic merge is exposed.

## Academic history

Open a scholar profile and choose **Add academic record**. Select an active, unlocked academic year, an active school and course from Configuration, then record year level, reason, and physical-record reference. Staff and Coordinators can add records; System Administrators maintain reference lists only.

One record is allowed per scholar/year. Adding another year preserves earlier entries and the permanent Scholar ID. Stored school/course/year names reflect their names at entry time, so later reference renaming does not rewrite history. Year level is a required text label (for example First year or Grade 12); no numeric program policy is invented.

Coordinator qualification now requires complete academic data for the same scholar and year. Applicant and Exam Passed records may be prepared first. Existing qualification decisions are retained. Initial academic entries are preserved; placement corrections, transfers and shifts now use the F09 request/approval workflow, with no generic overwrite or hard delete.

See [F08 delivery](docs/F08-delivery.md) for the API and validation details.

## Masterlist drafts

Open **Masterlist drafts** as Staff or Coordinator. Create a named draft for an active, unlocked academic year, then search candidates by name or permanent Scholar ID. Candidates must have a Selected scholarship record and complete academic placement for that same year. Missing data appears as specific validation messages; invalid candidates cannot be added.

Each draft derives its count from included entries. Add, remove, or review/refresh a candidate with a reason and physical-record reference. Award numbers are optional in drafts, distinct from permanent Scholar IDs, and unique within the draft. Removing a candidate preserves audit history and releases its award number. Re-adding restores that scholar's entry without creating a duplicate.

Drafts preserve source snapshots. Subsequent identity, qualification or approved academic changes cause validation to report `SOURCE_CHANGED`; review and refresh the candidate explicitly. Drafts do not activate scholarships. Official verification, approval, publication and locking are available in the selected masterlist. See [F10 historical delivery](docs/F10-delivery.md).

## Official masterlist workflow

Open **Masterlists**, open a draft, and use **Verification and official release**. Staff/Coordinators submit for verification, record completion of verification with a reference, then submit for approval. A different Coordinator approves the submission. Coordinators may return an unpublished list to Draft with a reason; entries remain read-only outside Draft.

The ordered workflow is Draft -> For Verification -> Submitted for Approval -> Approved -> Published -> Locked. Each command requires the current revision, a reason and decision/verification reference. Approval and publication revalidate every candidate and its source snapshot. Resolve stale data by returning to Draft and reviewing/refreshing the affected entry.

**Publish and activate scholars** saves an immutable official snapshot and activates included Selected annual records atomically. Supply an activation effective date no earlier than the latest qualification or approved academic change. Existing activations cannot be overwritten or repeated through another list. Publication is an internal official release, not a public website or message to recipients.

**Lock official masterlist** permanently closes the published record. Published/locked lists cannot return to Draft, and approved/official membership blocks direct academic placement changes. Download the preserved snapshot as JSON; later source changes do not alter it. Corrections to official records require the F12 amendment workflow. See [F11 delivery](docs/F11-delivery.md).

## Official amendments and versions

Open a locked masterlist and choose **Request official amendment** under **Amendments and official versions**. Staff or Coordinators can request a course shift, school transfer, both, year-level correction, award-number correction, or refresh of the name from the authoritative registry. Select one scholar and provide an effective date, reason and physical-record reference. Correct the registry first when refreshing a name.

A different Coordinator approves or rejects the request. Approval preserves the current official record; **Publish approved amendment** creates a new locked version such as 1.1, with links to earlier releases. Academic amendments also append approved academic history in the same transaction. Scholarship activation and operational status remain unchanged.

Requests and publication require the latest locked version and an active, unlocked academic year. Superseded requests cannot publish; submit a new request against the latest version. Only the requester can cancel a pending request. Original snapshots, before/after values, requester and decision attribution remain preserved. This checkpoint corrects existing entries; roster additions/removals are not exposed. See [F12 delivery](docs/F12-delivery.md).

## Academic placement changes

Open a scholar profile and choose **Request academic change** under the relevant annual record. Select course shift, school transfer, both, or year-level correction; provide the new placement, effective date, reason, physical-record reference and optional remarks. Submit year-level corrections separately from school/course changes.

Requests preserve the current placement until a different Coordinator approves them. Coordinators can reject requests; requesters can cancel their own. Before/after values and attributed decisions remain visible. Stale requests must be rejected/cancelled and resubmitted against the current revision. System Administrators have no approval authority.

Locked/archived years, activated scholarship records and approved/official masterlist membership block direct placement changes. Use the F12 official amendment workflow for corrections to locked official lists; F09 cannot bypass this boundary. See [F09 delivery](docs/F09-delivery.md) for the API and integration requirements.

## Annual qualification

Open a scholar profile and use **Add academic year record**. Each scholar has at most one record per academic year, separate from their permanent identity and registration year. Staff and Coordinators can create Applicant records and record Exam Passed. Coordinators alone confirm Qualified, select scholars, or record Not Selected. Every command requires an effective date, reason, and physical-record/decision reference; history preserves the actor and recorded time.

Applicant -> Exam Passed -> Qualified -> Selected. Not Selected is terminal for that year and can be recorded before selection. Selected is not Active and does not establish payout eligibility. Activation occurs only through publication of an approved official masterlist. Locked/archived years remain readable but cannot receive new commands. Refresh stale records before trying a changed decision.

Effective dates cannot be future dates or precede the last event. They may fall outside academic-year dates because applications/exams can occur before a year starts and late recording is possible. No exam cutoff, qualification threshold, or selection quota is invented; the Coordinator records a referenced decision.

See [F06 delivery](docs/F06-delivery.md) for transition rules, endpoints, and verification. Michael remains System Administrator only and has no qualification authority.

## Operational status changes

Open a scholar profile, select an annual record, and see **Operational status**. Qualification and operational status are separate. Records remain **Not activated** until a Coordinator publishes their approved official masterlist; status commands provide no activation shortcut.

For an activated record, Staff or Coordinator requests a change with effective date, uppercase reason code, explanation, and physical-record/decision reference. The current status stays unchanged until a different Coordinator approves. Coordinators may reject; only the requester may cancel. Locked/archived years block new requests and approvals but allow rejection/cancellation.

Active can move to On Hold, Suspended, Graduated, Dropped, Withdrawn, Disqualified, or Not Renewed. On Hold/Suspended can resume Active or reach a terminal outcome with approval. A terminal reversal requires **Request controlled correction**, referencing the latest approved terminal decision and restoring its immediately prior state. The original history is retained.

Only Active passes the status prerequisite for normal payout. This is not a complete eligibility calculation; the F19 engine remains future work. See [F07 delivery](docs/F07-delivery.md) for contracts and limitations.

## Duplicate review

Creating a scholar checks existing records across all registration years. Exact or similar names, matching email/phone, and birth date with supporting name/address evidence trigger review. Missing values do not count as matches. Shared family contacts and matching names are warnings, not proof of identity.

Use **Check and create scholar**. When matches appear, cancel or open an existing profile, or enter a separate-person reason and explicitly confirm that all listed matches were reviewed. Staff and Coordinators can resolve warnings. Creation then rechecks the candidates inside the transaction; changed inputs or candidate records require a fresh review. The decision, reason, candidate IDs/versions, and matching evidence are audited with creation. Records never merge automatically.

The preview includes names, permanent IDs and match labels, not raw contact/birth-date values. More than 100 matches blocks creation rather than permitting an incomplete review. Matching is conservative and cannot establish legal identity or guarantee every duplicate is detected. F05 applies to creation; ordinary profile edits retain the F04 workflow. Import is planned for F27 and must use the same guarded creation service.

## Scholar requirement checklists

As Staff or Coordinator, open **Scholar registry -> profile -> annual scholarship record -> Semester requirement checklists**. Choose an active, unlocked semester in the same academic year. Review its start date, enter a generation reason and physical policy reference, then choose **Generate semester checklist**.

The server generates applicable semester requirements effective on the semester start date, all **Not Submitted**. Each obligation preserves its exact definition version. Repeating generation returns the existing checklist; later policy or semester changes do not rewrite or add to it. No applicable policy produces an error without saving an empty checklist. Configure the actual policies before generating.

System Administrators cannot generate individual checklists. Generation does not activate scholarships, receive documents or establish payout eligibility. Closed periods remain readable. Payout-specific obligations connect in F18 when authoritative payout periods exist; Physical receiving is now available on each Not Submitted obligation. See [F14 delivery](docs/F14-delivery.md).

## Physical requirement receiving

In a scholar's semester checklist, Staff or Coordinator chooses **Receive [code] hard copy**. Enter received date, folder/box/storage location and receipt reason; physical reference and remarks are optional. Your individual account is recorded as receiver. Saving changes the displayed state to **Submitted** and preserves the custody record.

Receipt is separate from verification and payout eligibility. Duplicate initial receipts are rejected; exact retries are safe. Receipt details cannot be overwritten. Closed/archived periods block receiving but preserve history. No file upload is required or exposed. Verification and controlled correction are available below each requirement; payout-backed lock integration follows F18. See [F15 delivery](docs/F15-delivery.md).

## Requirement verification and correction

In a scholar's semester checklist, use **Send for verification** after receipt or resubmission. **Verify document** loads authoritative identity, academic year/semester, school/course and the pinned requirement policy. Compare the hard copy and confirm all five document checks, then record the effective date, reason, reference and optional remarks. Missing academic data or changed review context blocks verification; wrong period returns `REQUIREMENT_WRONG_PERIOD`.

For Verification may become Verified, For Correction or Rejected. **Reopen verified requirement** requires a controlled correction linked to its latest verification, preserving the original decision. Record corrected physical custody with **Record resubmission**, then send for verification again. Rejected is terminal in this checkpoint. Staff and Coordinators have verification authority; System Administrators do not.

Verified satisfies the normal requirement rule; correction or rejection does not. Other payout eligibility checks remain separate. Open **Decision history** to see every attributed transition, verification snapshot and resubmission receipt. See [F16 delivery](docs/F16-delivery.md).

## Requirement definitions

Open **Requirement definitions** at **http://127.0.0.1:5173/#requirements**. System Administrators configure hard-copy policies such as COR or COG/Grades; Staff and Coordinators can read policies and history. Choose each semester or each payout, optionally scope to a specific semester, and record instructions, effective dates, reason and policy reference. No assumed policy or requirement is seeded.

**Revise**, **Archive** and **Restore** append immutable versions. Start dates are inclusive; optional end dates are exclusive. A new version supersedes its predecessor from its start date, even when its scope changes. An inactive/expired version never falls back to an earlier policy. Subsequent versions must start after the latest version and cannot be backdated; use a later corrective version for a scheduled policy. The list displays the latest recorded version; use **Preview applicable requirements** to check a particular semester, purpose and date.

Generated semester obligations pin an immutable definition version. Semester generation is available in scholar profiles; payout-specific generation connects to F18 payout configuration. The preview creates no obligations and does not assess eligibility. No document upload is available. See [F13 delivery](docs/F13-delivery.md) for the effective-date and generation integration contract.

## Configure the program

Open **http://127.0.0.1:5173/#configuration** after signing in. Your System Administrator account can create and edit academic years, semesters, barangays, schools, courses, and program settings. Staff and Coordinator accounts can read these lists.

Create academic years before their semesters. Enter the program's actual dates; no guessed dates or reference lists are seeded. Semester codes are unique across years, so use a year-qualified code such as `AY2026-S1`. Codes and semester/year associations are permanent. Names and dates can be edited while the period is active and unlocked.

Every change requires a reason. Archive removes entries from active choices while keeping their identity and history. Enable **Include archived** to find and restore them. A year with active semesters cannot be archived. Restore an archived year before restoring its semesters.

Lock only a confirmed period: locking blocks further configuration edits and archiving. A year lock also blocks creating or changing its semesters. Once a semester is locked, its year's dates cannot change. There is no unlock action in this checkpoint.

Program settings support text and calendar-date values, readable by the scholarship team. They do not change login/database configuration or automatically enforce rules for future workflows. Academic dates are stored as DATE values, not hard-coded application constants.

## Individual account and activation

The requested individual account is activated and has the System Administrator role. Open **http://127.0.0.1:5173/#access** after signing in to review permissions. System Administrator has no scholarship approval authority.

For newly created accounts, open the private `output/account-activation.txt` link locally and set a 15–128 character password. Links expire after 15 minutes and work once. Generate another link with the reset command below if needed. No email is sent. Neither passwords nor reset links belong in Git.

## Fresh installation

Requirements: Node.js 22.12+, npm, and local XAMPP MariaDB on port 3306.

```powershell
npm ci
npm run setup:local
npm run db:migrate
npm run account -- create --name "Your Full Name" --email you@example.com --private-link
npm run dev
```

`setup:local` refuses existing resources and creates the database, restricted runtime identity, and ignored `.env`. `db:migrate` verifies applied checksums, applies pending migrations in order under an advisory lock, and adds narrow F01-F16 grants. New accounts have no roles until explicitly assigned.

Local maintenance commands use XAMPP root on loopback. If root has a password, supply `LDSS_SETUP_ADMIN_PASSWORD` privately in the shell environment, never in command arguments or source. These commands refuse non-development configurations.

## Account maintenance

```powershell
npm run account -- create --name "Full Name" --email person@example.com --private-link
npm run account -- reset --email person@example.com --reason "Verified account owner requested recovery" --private-link
npm run account -- disable --email person@example.com --reason "Staff access ended"
npm run account -- enable --email person@example.com --reason "Staff access restored"
```

Verify the individual’s identity before issuing a reset. With `--private-link`, the command writes `output/account-activation.txt`, replacing the previous local link file. Without it, the link is printed in your terminal. Deliver only to the account owner.

The audit records the local OS operator and reason. There is no public registration or default/shared password. Creating an account grants no scholarship approval authority. Web account and role editing remain later work; use the local commands below.

## Roles and permissions

Open **My access** to see effective permissions. Staff prepares records, Coordinator approves scholarship decisions, and System Administrator manages technical administration. The role directory is visible only with `roles.manage`; both API and service checks enforce authority independently of the UI.

```powershell
npm run roles -- show --email person@example.com
npm run roles -- set --email person@example.com --roles staff --expected-version 2 --reason "Staff assignment authorized"
```

Use the version printed by `show`. `set` replaces all active roles: `staff`, `coordinator`, `system_admin`, an explicitly authorized comma-separated combination, or `none` to revoke all. Role changes take effect on existing sessions. The local command uses the maintenance identity; the web database identity can only read role tables. Role assignments, version changes, and their audit event commit together. Revoked assignments are retained. An optional `--request-id UUID` makes identical retries replay the recorded result; reuse with different data returns a conflict.

Every new `/api/*` route requires permission metadata or an explicit authenticated-only policy. Missing permission metadata defaults to 403. Future business mutations must also use `AuthorizationService.withPermission` with the same transaction connection for authorization, data changes, and audit writes. This serializes role revocation with the mutation. Domain rules and record-level access still belong in each future service.

## Authentication behavior

- Normalized unique email and permanent UUID identify each account. Disable retains the identity.
- Passwords use salted scrypt: N=32768, r=8, p=3. New accounts cannot sign in before password activation.
- Sessions use random 256-bit opaque cookies; MariaDB stores only their SHA-256 digest. JavaScript receives a separate CSRF token.
- Cookies are HttpOnly and SameSite=Strict. Staging/production also use Secure and a `__Host-` cookie name.
- Every authenticated request checks current account status and session validity. Default limits: 30 minutes idle, 8 hours absolute. Background identity checks do not extend idle expiry.
- Login rotates the presented session for the same user. Logout revokes it. Disable and password reset revoke all sessions; re-enable does not restore them.
- Mutations require an allowed Origin and JSON. Authenticated mutations additionally require a CSRF token. Browser identity/role claims are never trusted.
- Persistent login limits: 10 attempts per email and 50 per IP per 15 minutes. Reset completion: 20 attempts per IP per 15 minutes. HTTP 429 includes Retry-After.
- Reset tokens are hash-only in storage, expire after 15 minutes, and are single-use. A new link supersedes prior links. Password reset does not sign the user in automatically.
- Material account/session mutations and audit events share one InnoDB transaction.
- MFA and email delivery are not configured. Recovery uses the local operator after independent identity verification.

## API

| Endpoint                         | Access / behavior                                                |
| -------------------------------- | ---------------------------------------------------------------- |
| GET /api/v1/health               | Public operational health; no private records                    |
| GET /api/v1/ready                | Public; 200 when the F16 schema is available, otherwise 503      |
| POST /api/v1/auth/login          | Credentials, allowed Origin, JSON                                |
| GET /api/v1/auth/me              | Active session; server-derived user, CSRF token, expiry          |
| POST /api/v1/auth/logout         | Active session, Origin, CSRF; 204                                |
| POST /api/v1/auth/reset-password | One-time token, Origin, JSON; 204                                |
| GET /api/v1/implementation-plan  | Active session; plan download                                    |
| GET /api/v1/me/permissions       | Active session; current user's roles and effective permissions   |
| GET /api/v1/admin/role-catalog   | Requires `roles.manage`; role matrix, no account records         |
| Other /api/*                     | Anonymous: 401; authenticated: 404, function not yet implemented |

The public static shell renders sign-in. Workspace views render only after /me succeeds. Health and recovery entry points are explicit public exceptions. No private data is embedded in the bundle.

Configuration endpoints:

| Endpoint                             | Permission and behavior                                   |
| ------------------------------------ | --------------------------------------------------------- |
| GET /api/v1/configuration/:kind      | configuration.read; search and paginated lists            |
| GET /api/v1/configuration/:kind/:id  | configuration.read; includes archived historical records  |
| POST /api/v1/configuration/:kind     | configuration.manage; create command                      |
| POST /api/v1/configuration/:kind/:id | configuration.manage; update/archive/restore/lock command |

Kinds: `academic-years`, `semesters`, `barangays`, `schools`, `courses`, `settings`. Lists accept `q`, `includeArchived=true`, `offset`, and `limit` (1?100; default 50). Responses include `items`, `total`, `offset`, and `limit`. Future forms must check `archived`, `locked`, and `parentUnavailable` when choosing usable periods; archived detail remains readable for history.

Commands require JSON, Origin, CSRF, an `Idempotency-Key` UUID, and a body containing `action`, `expectedVersion` (0 to create), `reason`, and `fields` for create/update. Stable structured errors include `DUPLICATE_REFERENCE_CODE`, `VERSION_CONFLICT`, `RECORD_LOCKED`, `REFERENCE_IN_USE`, and `PERIOD_OUTSIDE_YEAR`. There is no DELETE or unlock route. See [F03 delivery](docs/F03-delivery.md) for the contract and validation rules.

Scholar endpoints:

| Endpoint                   | Permission / behavior                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| GET /api/v1/scholars       | scholars.read; minimal-PII search, q, academicYearId, offset, limit (default 25, max 100) |
| GET /api/v1/scholars/:id   | scholars.read; full profile including contact details                                     |
| POST /api/v1/scholars      | scholars.create; new person and server-generated ID                                       |
| PATCH /api/v1/scholars/:id | scholars.update; edit profile with current expectedVersion                                |

Writes require JSON, allowed Origin, CSRF, `Idempotency-Key` UUID, `expectedVersion`, `reason`, and `fields`. Creation uses version 0. PATCH supplies the complete editable profile; empty/null values explicitly clear optional fields. Names are required, references use UUIDs, contacts are nested under `contact`. The ID/year are never accepted from the browser. See [F04 delivery](docs/F04-delivery.md) for profile fields and [F05 delivery](docs/F05-delivery.md) for duplicate review.

`POST /api/v1/scholars/duplicate-check` requires `scholars.create`, JSON, allowed Origin, and CSRF; body `{ "fields": <complete scholar fields> }`. It returns `candidates`, `total`, and a review `snapshot`. If creation finds matches, it requires `duplicateResolution: { snapshot, decision: "create_separate", reason }` (reason 10-500 characters). An absent/stale resolution returns `409 DUPLICATE_REVIEW_REQUIRED`. PATCH does not accept duplicate resolutions.

## Verification

```powershell
npm run check
npm run test:db
npm run test:auth-db
npm run test:rbac-db
npm run test:configuration-db
npm run test:scholars-db
npm run test:qualification-db
npm run test:status-db
npm run test:academic-db
npm run test:academic-changes-db
npm run test:masterlists-db
npm run test:masterlist-workflow-db
npm run test:masterlist-amendments-db
npm run test:requirements-db
npm run test:requirement-instances-db
npm run test:requirement-receipts-db
npm run test:requirement-workflow-db
```

`check` runs lint, 99 portable tests, typechecking for client/server/tools/tests, production build, and source/bundle secret scan. `test:db` checks real local connectivity, all sixteen migration checksums, and restricted grants without modifying account data.

`test:auth-db` creates a uniquely named disposable database/user, runs 15 real MariaDB authentication scenarios, and removes only those fixtures. Tests include concurrent reset, audit rollback, persisted throttling, disabled/expired sessions, and production cookies.

Optional: `npm run test:auth-db -- --browser` serves synthetic accounts on port 3003. Finish by requesting `http://127.0.0.1:3003/__fixture/stop` to clean up. This endpoint exists only in the test fixture.

`test:rbac-db` runs 10 isolated MariaDB scenarios, including all 112 permission decisions (28 permissions × 4 account types), direct approval denials, role revocation, retained history, idempotency/version conflicts, transactional audit failure, and runtime grants. Approval probe routes exist only in the tests; real workflow routes separately enforce their permissions. `npm run test:rbac-db -- --browser` serves an isolated System Administrator fixture on port 3003, with the same stop endpoint. Never use fixture credentials for real accounts.

`test:configuration-db` runs 13 isolated MariaDB scenarios covering real API creation, duplicate periods, history, date boundaries, period locks, permissions, retry/concurrency conflicts, audit rollback, pagination, and restricted grants. Add `-- --browser` to serve synthetic admin/staff accounts on port 3003. Stop via `/__fixture/stop` after browser checks; this route is absent from the real app.

`test:scholars-db` runs 16 isolated MariaDB scenarios, including cross-user concurrent ID allocation/edits, duplicate-ID database rejection, minimal-PII search, immutable IDs after year edits, audited corrections, safe retries, failed-audit rollback, reference/period guards, ID exhaustion, restricted grants, duplicate review, stale reviews, concurrent duplicate creation, and resolution audit rollback. `npm run test:scholars-db -- --browser` starts synthetic Staff/System Administrator accounts on port 3003. Stop with `/__fixture/stop` to remove its disposable database/user. No fixture accounts or scholars are created in the real database.

`test:qualification-db` runs 10 isolated MariaDB scenarios for annual uniqueness, ordered transitions, permissions, activation denial, concurrency, retries, audit rollback, dates, references, and immutable history grants. Add `-- --browser` for synthetic Staff/Coordinator browser checks on port 3003; finish via `/__fixture/stop`.

`test:status-db` runs nine isolated MariaDB scenarios for pending/approved status changes, permissions, terminal correction, payout status exclusion, self-approval prevention, concurrency, retries, rollback, dates, period locks, and immutable history. `-- --browser` seeds an Active record only in its disposable fixture, never in the real database. Stop via `/__fixture/stop`.

`test:academic-db` runs eight isolated MariaDB scenarios for permissions, required academic fields, the qualification prerequisite, year preservation, uniqueness, snapshot retention, concurrency/retries, audit rollback, references/locks and immutable grants. Add `-- --browser` for a synthetic fixture on port 3003 and stop via `/__fixture/stop`.

`test:academic-changes-db` runs eight isolated MariaDB scenarios for precise change types, separate approval, cross-Coordinator concurrency, immutable history, retries, rollback, reference guards and official-record protection. `-- --browser` serves a disposable Staff/Coordinator fixture on port 3003; stop via `/__fixture/stop`.

`test:masterlists-db` runs nine isolated MariaDB scenarios covering access, same-year candidate validation, derived counts, duplicate entries, cross-user concurrency, stale snapshots, award numbers, audit rollback, period locks, and restricted grants. `-- --browser` serves a disposable Staff/Coordinator fixture on port 3003; stop via `/__fixture/stop`.

`test:masterlist-workflow-db` runs nine isolated MariaDB scenarios for ordered transitions, permission/version/self-approval checks, source validation, immutable entries, publication/activation rollback, repeat activation prevention, downloads, concurrent locks and closing a published list after its year closes. `-- --browser` runs eight scenarios and leaves one fresh draft for browser verification; stop via `/__fixture/stop`.

## Build preview and environment

Stop development, run `npm run build` then `npm start`, and open **http://127.0.0.1:3001**. Only dist/client is served. This is a local build preview, not a production deployment.

| Variable               | Default / purpose                                                        |
| ---------------------- | ------------------------------------------------------------------------ |
| APP_ENV                | development; also test, staging, production                              |
| HOST / PORT            | 127.0.0.1 / 3001                                                         |
| APP_ORIGIN             | http://127.0.0.1:5173; exact HTTPS origin required in staging/production |
| LOG_LEVEL              | info                                                                     |
| DB_HOST / DB_PORT      | 127.0.0.1 / 3306                                                         |
| DB_NAME                | ldss_scholar_monitor_dev                                                 |
| DB_USER / DB_PASSWORD  | Dedicated runtime credentials, server only                               |
| SESSION_IDLE_MINUTES   | 30; range 1–120                                                          |
| SESSION_ABSOLUTE_HOURS | 8; range 1–24                                                            |

Development permits exact localhost/127.0.0.1 origins at the frontend and configured API ports. Staging/production permit only APP_ORIGIN. Vite’s development proxy targets port 3001; adjust it if changing that port. Environment templates are in config/ and are selected explicitly through deployment variables. No VITE_* secrets are used.

## Database authority and remaining work

Runtime may create/read annual scholarship records, update their current state/version/effective date, and append qualification events and retry records. It cannot rewrite annual scholar/year identity or update/delete qualification history. Runtime may create/read scholars and their contacts, update allowed profile/contact fields, allocate ID sequences, append retry records, create/read reference records and update their allowed fields, read users and role policy/assignments, update password/version fields, manage session activity/revocation and rate limits, consume reset tokens, and append audit events. It cannot rewrite scholar identifiers, delete scholars/contacts/history, delete references, change permanent codes or semester parent IDs, rewrite configuration retry history, edit roles, create/disable accounts, issue reset links, delete identities, rewrite/delete audits, change schema, or grant privileges.

MariaDB does not provide PostgreSQL RLS. F02 uses server-enforced default-deny permissions, restricted grants, and constraints. Future scholarship services must enforce their own record scope and workflow rules. Scholarship approval, immutable-history, and audit rules remain unchanged. F04 provides scholar records and permanent IDs; F05 adds duplicate-person warnings and audited resolution. F06 adds annual qualification with Coordinator decisions; F07 adds status requests and controlled corrections; F08 adds annual academic history and the qualification prerequisite; F09 adds approved placement changes; F10 adds candidate drafts and validation; F11 adds official approval, publication, activation and locking; F12 adds approved amendments and preserved official versions; F13 adds effective-dated requirement policies; F14 adds semester requirement checklists; F15 adds physical receiving; F16 adds verification and controlled correction; F17 waiver is next.

See [migration conventions](db/migrations/README.md), [F00 historical report](docs/F00-delivery.md), [F01 historical report](docs/F01-delivery.md), [F02 historical report](docs/F02-delivery.md), [F03 historical report](docs/F03-delivery.md), [F04 historical report](docs/F04-delivery.md), [F05 historical report](docs/F05-delivery.md), [F06 historical report](docs/F06-delivery.md), [F07 historical report](docs/F07-delivery.md), [F08 historical report](docs/F08-delivery.md), [F09 historical report](docs/F09-delivery.md), [F10 historical report](docs/F10-delivery.md), [F11 historical report](docs/F11-delivery.md), [F12 historical report](docs/F12-delivery.md), [F13 historical report](docs/F13-delivery.md), [F14 historical report](docs/F14-delivery.md), [F15 historical report](docs/F15-delivery.md), [F16 delivery report](docs/F16-delivery.md), and [implementation plan](LDSS_Codex_Function_by_Function_Implementation_Plan.md).

Technical references: [Fastify cookies](https://github.com/fastify/fastify-cookie), [OWASP authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), and [recovery](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

`test:masterlist-amendments-db` runs 16 isolated MariaDB scenarios (including seven official-workflow prerequisites) covering amendment authority, immutable originals, rejection, atomic publication/rollback, academic history, preserved operational status, stale sources, concurrent publication, period locks, retries and restricted grants. `-- --browser` leaves a disposable fixture on port 3003; stop via `/__fixture/stop`.

`test:requirements-db` runs 11 isolated MariaDB scenarios for requirement policy authority, immutable history, effective dates, archive/restore, scope, retry/concurrency, audit rollback, grants, CSRF and period guards. `-- --browser` serves a disposable fixture on port 3003; stop via `/__fixture/stop`.

`test:requirement-instances-db` runs 12 isolated MariaDB scenarios for generation authority, applicability, pinned versions, period guards, idempotency, concurrent requests, current policy reads, rollback and restricted grants. `-- --browser` serves a disposable fixture on port 3003 and leaves its year open for browser generation; stop via `/__fixture/stop`.

`test:requirement-receipts-db` runs nine isolated MariaDB scenarios covering receiver authority, immutable custody/audit, dates and metadata, duplicates/retries/concurrency, rollback, policy preservation, restricted grants and closed-period guards. `-- --browser` leaves its semester/year open on port 3003 for a disposable receiving check; stop via `/__fixture/stop`.

`test:requirement-workflow-db` runs nine isolated MariaDB scenarios covering verifier authority, period/source validation, immutable decisions, normal-rule satisfaction, correction/resubmission, rejection, concurrency/retry/rollback and period locks. `-- --browser` leaves the fixture period open on port 3003; stop via `/__fixture/stop`.
