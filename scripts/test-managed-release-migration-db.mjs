import "dotenv/config";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { prepareRestoredNotificationSchema, localAdmin, applyMigrations, grantAuthRuntime } from "./migration-lib.mjs";
import { createBackup, restoreBackup, loadKey, inventory } from "./backup-lib.mjs";

const migration = "20261007050000_f36_graduation_confirmation.sql";
const changed = new Set(["graduation_confirmations"]);
const report = { passed: false, appliedLocally: false, preservedTables: 0, backup: null, restore: null };
let db, restored, definer;
function preserve(before, after) {
  for (const table of before.tables.filter(t => t.name !== "schema_migrations")) assert.deepEqual(after.tables.find(t => t.name === table.name), table, `Rows preserved: ${table.name}`);
  for (const key of ["columns", "indexes", "constraints", "foreignKeys", "rules", "checks", "triggers", "views"]) assert.deepEqual(after[key].filter(r => !changed.has(r.TABLE_NAME)), before[key].filter(r => !changed.has(r.TABLE_NAME)), key);
}
try {
  db = await localAdmin();
  const key = await loadKey(); report.backup = await createBackup(key);
  restored = await restoreBackup(report.backup.file, key, { keep: true }); report.restore = restored;
  const verified = JSON.parse(await readFile(restored.reportFile, "utf8")); assert.equal(verified.verified, true); definer = verified.definerAccount;
  await db.changeUser({ database: restored.target });
  await prepareRestoredNotificationSchema(db);
  const before = await inventory(db), applied = await applyMigrations(db);
  assert.ok(applied.length === 0 || (applied.length === 1 && applied[0] === migration));
  const ddl = await readFile(new URL(`../db/migrations/${migration}`, import.meta.url), "utf8");
  for (const statement of ddl.split(/\r?\n-- statement-break\r?\n/)) await db.query(statement);
  assert.deepEqual(await applyMigrations(db), []);
  preserve(before, await inventory(db));
  report.preservedTables = before.tables.filter(t => t.name !== "schema_migrations").length;
  if (process.argv.includes("--apply-local")) {
    await db.changeUser({ database: process.env.DB_NAME });
    const localBefore = await inventory(db);
    assert.deepEqual(await applyMigrations(db), applied);
    await grantAuthRuntime(db, process.env.DB_NAME, process.env.DB_USER);
    preserve(localBefore, await inventory(db)); report.appliedLocally = true;
  }
  report.passed = true;
  console.log("PASS Managed release / graduation migration: encrypted verified restore, repeatable DDL, all existing rows preserved, only declared schema extensions, no business backfill");
} finally {
  if (db && restored && definer) {
    assert.match(restored.target, /^ldss_restore_\d+_[a-f0-9]{8}$/); assert.match(definer, /^ldss_r_[a-f0-9]{16}$/);
    await db.query(`DROP DATABASE \`${restored.target}\``); await db.query(`DROP USER ${db.escape(definer)}@'localhost'`);
  }
  if (db) await db.end();
  await mkdir("output/managed-release", { recursive: true });
  await writeFile(`output/managed-release/migration${process.argv.includes("--apply-local") ? "-local" : ""}.json`, JSON.stringify(report, null, 2));
}
