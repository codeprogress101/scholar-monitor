# F01 delivery — Authentication and Individual Accounts

**Implemented and tested; acceptance pending.** F00 was accepted when the user requested the next step. F02 role permissions have not been implemented.

## Result

The workspace now opens at a sign-in screen. An active individual account can log in, retain its server session across page reloads, and log out. Every protected API request loads current identity, account status, and session validity from MariaDB. Anonymous requests are denied. Disabled accounts cannot log in or continue a session; their historical identity remains intact.

The requested first account is Michael Opiana (`nievamichael00@gmail.com`). No password is invented or shared. The account requires password activation through the private, single-use link in ignored `output/account-activation.txt`. The link expires after 15 minutes. `npm run account -- reset` can issue a replacement after verifying the account owner.

The local database remains XAMPP MariaDB as instructed. No mail was sent, no external service was provisioned, and no production deployment occurred.

## Files

| Area | Created or modified |
| --- | --- |
| Schema | `db/migrations/20260929010000_f01_authentication.sql`; migration conventions updated; F00 SQL unchanged |
| Backend | New `server/auth/crypto.ts`, `service.ts`, `routes.ts`; updated `server/app.ts`, `config.ts`, `database.ts` |
| Frontend | New `src/AuthGate.tsx`, `src/auth-api.ts`; updated `src/main.tsx`, `App.tsx`, `styles.css` |
| Administration | New `scripts/migration-lib.mjs`, `migrate.mjs`, `account.ts` |
| Verification | New `scripts/test-auth-db.ts`, `tests/auth-crypto.test.ts`, `tsconfig.validation.json`; updated API tests and `scripts/check-database.mjs` |
| Configuration | `package.json`, lockfile, `.env.example`, staging/production examples |
| Documentation | `README.md`, this report, implementation-plan amendment/checklist |
| Plan download | Removed `public/implementation-plan.md`; now served by authenticated API |

F01 adds `@fastify/cookie`. Runtime authentication data and credentials are not embedded in source. Build artifacts, browser evidence, and activation files remain ignored.

## Migration and grants

Applied `20260929010000_f01_authentication.sql` to `ldss_scholar_monitor_dev`. It adds:

- `users`: UUID, unique normalized email, full name, password hash, disabled timestamp, version and timestamps.
- `auth_sessions`: hashed opaque token, user FK, idle/absolute timestamps, revocation timestamp.
- `password_resets`: hashed token, user FK, expiry and consumption timestamps.
- `auth_rate_limits`: hashed buckets and persisted counters.
- `audit_logs`: append-only material account/session events with actor or local operator, request ID, reason and details.

Migration checksums are verified before new DDL. An advisory lock serializes migration runs. Rerunning the command applied no duplicate migration and successfully revalidated checksums. MariaDB DDL can implicitly commit; partial recovery and forward correction requirements are documented.

Runtime grants allow only the reads and field-specific updates required by authentication, session creation/revocation, reset consumption, rate limiting, and audit inserts. No runtime identity-delete, account-provisioning/disable, reset-issuance, audit-update/delete, schema mutation, or privilege grants are allowed. Administrative terminal commands use local XAMPP administrator access, record the local OS operator and a reason, and refuse non-development configurations.

## Endpoints and permissions

| Endpoint | Rule |
| --- | --- |
| `POST /api/v1/auth/login` | Credentials, allowed Origin and JSON; active account; persistent throttle |
| `GET /api/v1/auth/me` | Valid stored session and active account; server-derived identity |
| `POST /api/v1/auth/logout` | Valid session, Origin and CSRF token; stored session revoked |
| `POST /api/v1/auth/reset-password` | Valid unexpired single-use token, Origin and JSON; all sessions revoked |
| `GET /api/v1/implementation-plan` | Valid session and active account |
| Health/readiness | Explicit public operational exceptions, no private records |
| Other `/api/*` | Anonymous 401; authenticated 404 until the relevant function exists |

There are no Staff/Coordinator/System Administrator authority claims yet. Identity does not grant scholarship approvals. F02 must implement those permissions.

## Session and recovery controls

Passwords use salted scrypt (N=32768, r=8, p=3). Activation/reset accepts 15–128 characters. Session cookies are random 256-bit opaque values, HttpOnly, SameSite=Strict, and Secure with a `__Host-` prefix in staging/production. Only token hashes are stored in the database.

Default expiry is 30 minutes idle and 8 hours absolute. Background identity checks do not renew idle expiry. A fresh login rotates the presented same-user session; logout revokes it. Disable and successful password reset revoke every session. Re-enabling an account never restores old sessions or reset links.

Mutations check Origin and JSON content type; authenticated mutations additionally require a session-derived CSRF token. Login is limited to 10 attempts per email and 50 per IP per 15 minutes; reset completion is limited to 20 per IP per 15 minutes. Counters persist across process instances.

Reset links expire after 15 minutes, are single-use, and are issued only by the local operator after identity verification. They are not logged by the server or committed. The browser removes the reset token from its URL and keeps it in memory only while the form is open. There is no email delivery, public registration, default password, or automatic login after reset.

## Verification

| Check | Result |
| --- | --- |
| Portable tests | 26 passed across 4 files |
| MariaDB authentication integration | 15 scenarios passed in a uniquely named disposable database |
| Typecheck | Client, server, scripts, and tests passed |
| Lint | Passed, zero warnings |
| Production build | Passed |
| Source/bundle secret scan | Passed |
| Real local DB checks | Both migration checksums and grant restrictions passed |
| Migration repeat | No new migration; checksums verified |
| Browser login/reload/logout | Passed with synthetic identity against the real API and MariaDB |
| Browser reset | One-time link form succeeded; old password rejected; new password accepted |
| Desktop/mobile | Login rendered at 1440×1000 and 390×844; mobile had no horizontal overflow |

Integration tests cover active/anonymous/disabled/expired sessions; cookie rotation; CSRF and cross-origin rejection; forged role claims; reset expiry/reuse/concurrent consumption; all-session revocation; login throttling across service instances; production cookie flags; database-denied privileged mutations; and transaction rollback when audit writing fails.

The browser fixture used an isolated disposable database and a synthetic identity. It was stopped through its test-only shutdown endpoint and cleaned up. No test account or test password was added to the real development database. Expected 401 responses occurred while checking anonymous access and incorrect passwords; these were handled by the UI.

Browser evidence is under `output/playwright/f01-login-desktop.png` and `output/playwright/f01-login-mobile.png`.

## Manual acceptance

1. Keep MySQL running in XAMPP and open http://127.0.0.1:5173.
2. Open `output/account-activation.txt` locally, follow the link, and set your own password.
3. Sign in using the requested email. Confirm your full name appears in the workspace header.
4. Refresh the page, navigate the workspace, and download the implementation plan.
5. Sign out; direct workspace hash routes must still show sign-in.
6. Run `npm run check`, `npm run test:db`, and `npm run test:auth-db` to repeat verification.

If the initial activation link expired, run:

```powershell
npm run account -- reset --email nievamichael00@gmail.com --reason "Account owner requested activation" --private-link
```

This replaces the private link file and invalidates earlier links. It does not reveal or change the password until the account owner completes the form.

## Remaining limits

F02 RBAC, scholar operations, MFA, email recovery delivery, production deployment, backup/restore drills, and UAT remain future work. Staging/production cookie behavior was tested through the API, but no hosted environment was deployed. Local administrative commands are deliberately restricted to development. MariaDB does not provide the PostgreSQL RLS layer from the original plan; F02 must enforce the amended server/database authorization design.

The implemented foundation supports audit writes transactionally; it is not the full F31 audit viewer. The plan is marked F00 accepted and F01 implemented/tested, with F01 acceptance left for the user.
