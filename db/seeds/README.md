# Seed convention

F00 has no database seed. No scholar records, accounts, passwords, or historical counts have been invented.

Future seeds must use synthetic data, be repeatable and transactional, and live in environment-specific folders. Production reference data must be explicitly reviewed. Never seed shared or default-password user accounts. Provision the first individual administrator through a server-side bootstrap command, with credentials supplied privately at execution time.

Development/test seeds must refuse production and staging execution. A seed must not replace, truncate, or overwrite historical scholarship, audit, masterlist, requirement, or payout records. Keep actual scholar data out of the repository and test fixtures.
