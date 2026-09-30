# F00 delivery — 2026-09-29

**Implemented and tested. Acceptance pending.** This is the first runnable foundation release, not yet the operational scholar-registry MVP. The source plan requires acceptance after each function, so F01–F36 remain unimplemented.

## Delivered behavior

- Responsive React/TypeScript/Bootstrap workspace with overview, 37-checkpoint searchable/filterable roadmap, downloadable plan, system status, and guide.
- Fastify API behind `/api/v1`, validated environment configuration, consistent error envelopes, and closed business-route access.
- XAMPP MariaDB connection, baseline migration metadata, and a dedicated database identity that can only SELECT the metadata table.
- Live connection check with unavailable/retry behavior; no invented scholar records, counts, account sessions, or payout data.
- Reproducible npm lockfile, clean install, lint, typecheck, test, build, source/bundle secret scan, and live database verification commands.
- Local/staging/production configuration templates and migration/seed conventions.

## Architecture decision

The user instructed “Use XAMPP first as database.” XAMPP MariaDB 10.4.32 is running at `127.0.0.1:3306`. This overrides PostgreSQL for local development. The editable plan records the amendment while preserving the original requirements.

MariaDB does not supply PostgreSQL RLS. Future functions must explicitly enforce server-side default-deny authorization and restricted database grants/constraints/controlled routines. No scholarship approval, audit, or immutable-history rule was relaxed. No account or business mutation endpoint is exposed in F00.

## Changed files

| Area | Files |
| --- | --- |
| Project tooling | `package.json`, `package-lock.json`, `.gitignore`, `.htaccess`, `index.html`, `eslint.config.js`, `tsconfig.json`, `tsconfig.server.json`, `vite.config.ts`, `vitest.config.ts` |
| Environment templates | `.env.example`, `config/staging.env.example`, `config/production.env.example` |
| Frontend | `src/main.tsx`, `src/App.tsx`, `src/api.ts`, `src/styles.css`, `src/roadmap.json`, `public/favicon.svg`, `public/implementation-plan.md` |
| Server | `server/index.ts`, `server/app.ts`, `server/config.ts`, `server/database.ts` |
| Database | `db/migrations/20260929000000_f00_baseline.sql`, `db/migrations/README.md`, `db/seeds/README.md` |
| Local tools | `scripts/setup-local.mjs`, `scripts/check-database.mjs`, `scripts/check-secrets.mjs` |
| Automated tests | `tests/app.test.ts`, `tests/config.test.ts`, `tests/client-api.test.ts` |
| Documentation | `README.md`, this report, amended `LDSS_Codex_Function_by_Function_Implementation_Plan.md` |

Also generated locally: ignored `.env`, `node_modules/`, `dist/`, and browser evidence under `output/playwright/`. A Git repository was initialized on `main`; no commits or remote publication were made. The original PDF is unchanged.

## Migration and permissions

Applied `20260929000000_f00_baseline.sql` to the newly created `ldss_scholar_monitor_dev` database. It creates only `schema_migrations` and records its version/checksum. No seed data or business tables exist.

The bootstrap used XAMPP administrator access to create the database and `ldss_monitor_local@localhost`. The runtime receives only SELECT on `schema_migrations`, with a random password stored in ignored `.env`. No runtime CREATE, ALTER, DROP, INSERT, UPDATE, DELETE, GRANT, or system-table access was granted. Application startup never performs migrations.

## Endpoints

| Endpoint | Result |
| --- | --- |
| `GET /api/v1/health` | HTTP 200 with API identity/version and a real database probe result; no credentials or records |
| `GET /api/v1/ready` | HTTP 200 for successful database probe; HTTP 503 for unavailable/unconfigured database |
| Other `/api/*` requests | HTTP 401 `AUTH_REQUIRED` |
| Unexpected failures | HTTP 500 `INTERNAL_ERROR`, without stack traces or sensitive values |

## Verification results

| Check | Result |
| --- | --- |
| `npm ci` | Passed from lockfile; 0 reported dependency vulnerabilities |
| `npm run lint` | Passed, zero warnings |
| `npm run typecheck` | Passed for client and server |
| `npm test` | 23 passed across 3 test files |
| `npm run build` | Passed, generated React and server production artifacts |
| `npm run check:secrets` | Passed for source/build artifacts, including absence of generated local password in the frontend bundle |
| `npm run test:db` | Passed: actual connection, migration checksum, denied writes/system-table access, restricted grants |
| Git ignore | `.env`, `node_modules`, and `dist` excluded |
| Apache privacy | Direct `http://127.0.0.1/scholar_monitor/.env` request returned 403 |
| Production build | Root/readiness 200; scholar API 401; `.env` and server source 404 |
| Browser desktop | Rendered at 1440×1080; normal runtime had no console errors or warnings |
| Browser mobile | Rendered at 390×844; no horizontal overflow; menu opens and closes through navigation |
| Roadmap | F04 search returned 1 match; incompatible phase returned empty state; clear restored 37; download succeeded |
| Service recovery | Simulated HTTP 503 displayed unavailable; removing the simulation and retrying restored connected status |

The deliberate browser 503 simulation produced the expected failed-request console entry. The production browser session had zero console errors and warnings. Screenshots: `output/playwright/overview-desktop.png` and `output/playwright/overview-mobile.png`.

## Manual review

1. Start MySQL in XAMPP if it is stopped. Local setup has already been completed on this computer.
2. Run `npm run dev` in the project folder, or use the already running development server.
3. Open http://127.0.0.1:5173 and review the overview at desktop and mobile widths.
4. Open System status: the service and XAMPP database should both show Connected. Click Check again.
5. Open Implementation plan, search `F04`, change phase, clear filters, and download the plan.
6. Open Workspace guide. Verify that scholar operations and authentication are clearly marked as future work.
7. Run `npm run check` and `npm run test:db` for repeatable verification.
8. For a production-build preview, stop development, run `npm run build` then `npm start`, and open http://127.0.0.1:3001.

## Remaining scope and limits

- No individual accounts, RBAC engine, scholar registry, masterlist, requirements, eligibility, payout, reporting, or business audit workflow exists yet. F01 is next after acceptance.
- The preview is intentionally accessible on loopback; it contains no private scholar data. It is not ready for public or production deployment.
- Only local MariaDB has been tested. Staging/production configuration templates are supplied but not deployed.
- The bootstrap applies the one F00 migration. A general versioned migration runner and application schema belong to subsequent checkpoints. MariaDB DDL can implicitly commit; partial bootstrap recovery is documented.
- No restore drill or UAT signoff has occurred. Those remain F35/F36.
- SB Admin Pro licensed assets were not supplied; this release uses Bootstrap and custom styles.

Acceptance is left unchecked in the implementation plan. The applicable checkpoint instruction is: “stop for acceptance before moving to the next function.”
