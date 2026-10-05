# F34 security review

Reviewed 2026-10-04 for v0.35.0: React frontend, Fastify API and XAMPP MariaDB. This is a targeted repository and local-runtime review, not a production penetration test. No schema changes were needed.

## Findings and fixes

1. **High, conditional exposure — fixed: Apache source workspace access.** The repository resides inside XAMPP's document root and previously had no access-denial rule. If Apache served this directory, private configuration and activation output could be downloadable. Apache on port 80 was unreachable during review; actual prior disclosure was not established. `.htaccess:3` now denies all access. An isolated loopback Apache process with the real repository and AuthConfig overrides returned HTTP 403 to HEAD requests for README, `.env`, activation output and server source. No sensitive response bodies were fetched. Production should keep the source workspace outside any public document root. This protection depends on Apache honoring `.htaccess`; it does not configure other web servers.

2. **Medium — fixed: production runtime could select test-mode security.** `server/config.ts:61` previously rejected only development mode under `NODE_ENV=production`. Selecting test mode bypassed deployed HTTPS/credential checks and selected non-Secure local session cookies. Production Node runtimes now accept only staging or production application modes. Regression coverage includes the test-mode bypass; existing database integration verifies Secure `__Host-` cookies.

3. **Low — fixed: ambiguous origin configuration.** `server/config.ts:13` now rejects credentials, non-HTTP(S) schemes, paths, queries and fragments, and normalizes a trailing slash. This prevents invalid browser-origin configuration from silently breaking the mutation origin boundary. Error messages expose field names only.

4. **Defense in depth — implemented: HTTP boundary.** `server/app.ts:95` sets a 30-second request-receipt timeout, explicitly disables proxy trust, and generates server UUID request IDs. `server/app.ts:225` disables camera, microphone and geolocation permissions and adds `object-src 'none'` to CSP. Client request IDs and forwarded addresses cannot replace correlation IDs or the client address used by authentication throttling. This timeout limits receiving requests, not transaction execution. Existing inline styles remain permitted for the UI; scripts remain restricted to self.

## Verified existing controls

- Default-deny API authorization and transactional permission checks (`server/authorization/service.ts:99`). Role revocation serializes with commands. Staff, Coordinator and System Administrator retain distinct authority; browser role labels and actor IDs do not grant access.
- Server sessions, HttpOnly/SameSite cookies, mutation origin/CSRF checks (`server/auth/routes.ts:19`), idle/absolute expiry, reset token consumption and session revocation. Database-backed login/reset throttling survives service instances (`server/auth/service.ts:114`). Passwords use salted scrypt; stored session/reset tokens are hashed.
- Restricted runtime SQL grants, protected identity/role writes, append-only audit evidence, scoped audit views and denied system-table access. Per-person roles are application roles; they are not separate MariaDB login accounts. Anyone holding runtime SQL credentials is within the trusted server boundary.
- Minimal registry list/export fields, bounded export scope, privileged audit metadata export, formula neutralization and fail-closed disclosure auditing. Profile details remain available to authorized operational users. Free-text reasons and audit payloads remain sensitive: only scoped authorized views should expose them; raw payloads do not belong in application logs or generic exports.
- Safe public errors, log redaction, compiled-client-only Node static serving, and source/bundle secret scanning. No unsafe HTML/eval or browser token-storage usage found by the targeted source search.

## Deployment requirements and limits

The user-authorized MariaDB implementation replaces PostgreSQL RLS with application authorization and narrow SQL grants; it does **not** provide database row-level isolation per human user. Existing privileged migration tools remain outside the browser and runtime account. Host/database administrators can bypass application policy.

Production TLS termination and firewall rules were not configured or verified. Local XAMPP reported a wildcard database listener; loopback application connections and restricted database accounts do not prove network isolation. Keep this development instance off public networks; deploy with database network access restricted to the application host and separate migration credentials. If a reverse proxy is later introduced, configure trust for its exact addresses and recheck throttling rather than trusting arbitrary forwarded headers.

MFA is not implemented. Add an evaluated MFA or identity-provider flow before any deployment requiring it. Dependency scanning reported zero known production-package vulnerabilities at review time; this is not an assessment of the XAMPP binaries or future advisories. Backup/restore validation belongs to F35.

## References

- [Apache access control](https://httpd.apache.org/docs/2.4/howto/access.html): `Require all denied` access rule.
- [Fastify server options](https://fastify.dev/docs/latest/Reference/Server/): request timeout, proxy trust and request ID configuration.
- [Validation evidence](F34-delivery.md).
