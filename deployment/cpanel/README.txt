LDSS Namecheap hosting candidate

Target: monitor.iskolarngdaet.app
Application root: /home/iskotwfh/ldss-monitor (outside the domain document root)
Node: 22.12 or newer; target observed 22.23.3
Startup: app.js; cPanel application mode: Production

This is a deployment candidate, not a verified live installation. It contains
the built client/server and a Passenger launcher, but no database contents,
accounts, passwords, .env files, recovery keys or Windows node_modules.
Extract files directly into the application root, not the public document root.
Preserve cPanel's node_modules symlink, public and tmp directories. Do not replace
the existing iskolarngdaet.app application.

Activate the cPanel Node environment before installation:
source /home/iskotwfh/nodevenv/ldss-monitor/22/bin/activate
cd /home/iskotwfh/ldss-monitor
npm install --omit=dev --no-audit --no-fund

Do not initialize the database or restart LDSS yet. A read-only compatibility
probe is supplied. In the terminal, enter (password entry is hidden):
export DB_HOST=localhost DB_NAME=iskotwfh_ldss_monitor DB_USER=iskotwfh_monitor
read -rsp 'Database setup password: ' DB_PASSWORD
echo
export DB_PASSWORD
node hosting/preflight.mjs
unset DB_PASSWORD

Only sanitized capability results are printed. Do not paste passwords, .env,
SHOW GRANTS output or access tokens into chat. Missing GRANT OPTION may require
Namecheap support to provision table-specific runtime permissions. Do not use
the setup user's broad privileges as the application's operational credentials.

Remaining before application startup:
- Verify migration/trigger/view support and restricted runtime grants.
- Initialize only the explicitly named empty database with reviewed migrations;
  the local development migration command must not be repointed at this host.
- Configure APP_ENV=staging, APP_ORIGIN=https://monitor.iskolarngdaet.app and
  separate restricted DB credentials in private hosting configuration.
- Verify HTTPS and the Passenger proxy boundary before trusting proxy headers.
- Provision authorized accounts without copying test users or sample records.
- Adapt scheduled backup/recovery to Linux hosting; Windows tasks are not moved.
- Test roles, payments, exports, expiry, restart and restore on this target.

The launcher uses a CommonJS entry point with dynamic import of ESM code.
Under Passenger it disables automatic port binding and listens on the Passenger
socket after Fastify is ready. Standalone validation uses the configured host/port.
Reference: https://www.phusionpassenger.com/docs/advanced_guides/in_depth/node/reverse_port_binding.html
