import "dotenv/config";
import {
  localAdmin,
  applyMigrations,
  grantAuthRuntime,
} from "./migration-lib.mjs";
let db;
try {
  db = await localAdmin();
  const applied = await applyMigrations(db);
  await grantAuthRuntime(db, process.env.DB_NAME, process.env.DB_USER);
  console.log(
    applied.length
      ? `Applied ${applied.join(", ")}`
      : "All migrations already applied; checksums verified.",
  );
  console.log(
    "F16 runtime grants applied. Scholar and annual identities and history remain protected; no delete privileges granted.",
  );
} catch (error) {
  console.error(
    error instanceof Error && !("code" in error)
      ? error.message
      : "Migration failed. Inspect local database state; credentials and SQL values were withheld.",
  );
  process.exitCode = 1;
} finally {
  if (db) await db.end();
}
