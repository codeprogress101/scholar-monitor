# F34 — Security Hardening and RLS Review

Implemented and verified in v0.35.0. F33 is accepted by the request to proceed. F34 awaits acceptance; next checkpoint is F35 backup, restore and disaster recovery.

## Changes

Closed the production/test environment bypass, validated browser origins, denied Apache access to the source workspace, and hardened HTTP request IDs, proxy trust, request receipt timeout and browser permissions. The [security review](F34-security-review.md) records severity, source evidence, existing protections and deployment limits. There is no migration or account/demo reset.

## Validation

- `npm run check`: lint, 175 tests across 35 files, complete type checking, client/server production build and source/bundle secret scan passed.
- `npm run test:auth-db`: 15 groups passed, including session expiry, CSRF, account disable/reset, persistent throttling and Secure production cookies.
- `npm run test:rbac-db`: 10 groups passed, including 148 direct API permission decisions, anonymous/default-deny access, role revocation and restricted SQL grants.
- `npm run test:exports-db`: four groups passed for role separation, minimal PII, scoped disclosure and audit rollback.
- `npm run test:audit-db`: passed scoped audit evidence/grant checks and the underlying eligibility, finalization and payment scenarios.
- `npm run test:db`: live connection, all 29 migration checksums and runtime grant checks passed.
- `npm audit --omit=dev --json`: zero reported production dependency vulnerabilities.
- XAMPP Apache configuration syntax passed. A temporary loopback Apache instance verified HTTP 403 for source, environment and activation-output HEAD requests, then was stopped. The normal Apache service was not started or changed.

XAMPP MariaDB was initially stopped. It was started and the database suites then completed successfully in disposable databases; the live application database was checked without resetting user/demo records. No visual layout changed, so this checkpoint used HTTP and automated coverage rather than another screenshot run. Production TLS/network isolation and MFA remain deployment work, as explicitly recorded in the review.
