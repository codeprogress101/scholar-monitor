import "dotenv/config";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { prepareRestoredNotificationSchema, localAdmin, applyMigrations, grantAuthRuntime } from "./migration-lib.mjs";
import { createBackup, restoreBackup, loadKey, inventory } from "./backup-lib.mjs";

const migration = "20261007020000_f36_enrollment_document_evidence.sql";
const table = "requirement_document_evidence";
const report = { passed: false, appliedLocally: false, preservedTables: 0 };
let db, restored, definer;
async function preserve(before, after) {
  for (const t of before.tables.filter((r) => r.name !== "schema_migrations"))
    assert.deepEqual(after.tables.find((r) => r.name === t.name), t, `Preserve ${t.name}`);
  for (const section of ["columns", "indexes", "constraints", "foreignKeys", "rules", "checks", "triggers", "views"])
    assert.deepEqual(after[section].filter((r) => r.TABLE_NAME !== table), before[section].filter((r) => r.TABLE_NAME !== table));
}
try {
  db = await localAdmin();
  const key = await loadKey(), backup = await createBackup(key);
  restored = await restoreBackup(backup.file, key, { keep: true });
  const verification = JSON.parse(await readFile(restored.reportFile, "utf8"));
  assert.equal(verification.verified, true); definer = verification.definerAccount;
  await db.changeUser({ database: restored.target });
  await prepareRestoredNotificationSchema(db);
  const before = await inventory(db);
  const [applied] = await db.query("SELECT version FROM schema_migrations");
  const had = applied.some((m) => m.version === migration);
  await db.query(await readFile(new URL(`../db/migrations/${migration}`, import.meta.url), "utf8"));
  assert.deepEqual(await applyMigrations(db), had ? [] : [migration]);
  assert.deepEqual(await applyMigrations(db), []);
  await preserve(before, await inventory(db));
  report.preservedTables = before.tables.filter((r) => r.name !== "schema_migrations").length;
  if (process.argv.includes("--apply-local")) {
    await db.changeUser({ database: process.env.DB_NAME });
    const localBefore = await inventory(db);
    assert.deepEqual(await applyMigrations(db), had ? [] : [migration]);
    await grantAuthRuntime(db, process.env.DB_NAME, process.env.DB_USER);
    await preserve(localBefore, await inventory(db));
    assert.equal((await db.query(`SELECT COUNT(*) AS n FROM ${table}`))[0][0].n, 0);
    report.appliedLocally = true;
  }
  report.passed = true;
  console.log("PASS Document evidence migration: encrypted restore, DDL retry, historical rows/schema and permissions preserved; no backfill");
} finally {
  if (db && restored && definer) {
    assert.match(restored.target, /^ldss_restore_\d+_[a-f0-9]{8}$/);
    assert.match(definer, /^ldss_r_[a-f0-9]{16}$/);
    await db.query(`DROP DATABASE \`${restored.target}\``);
    await db.query(`DROP USER ${db.escape(definer)}@'localhost'`);
  }
  if (db) await db.end();
  await mkdir("output/workflow-phase08/checkpoint-b1", { recursive: true });
  await writeFile(`output/workflow-phase08/checkpoint-b1/documents-migration${process.argv.includes("--apply-local") ? "-local" : ""}.json`, JSON.stringify(report, null, 2));
}
