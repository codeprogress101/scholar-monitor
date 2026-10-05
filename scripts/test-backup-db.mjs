import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { createBackup, restoreBackup, seal, unseal } from "./backup-lib.mjs";
import { localAdmin } from "./migration-lib.mjs";

const key = randomBytes(32);
const files = [];
let db;
try {
  db = await localAdmin();
  const [[before]] = await db.query("SELECT COUNT(*) AS n FROM users");
  const backup = await createBackup(key);
  files.push(backup.file);
  const bytes = await readFile(backup.file);
  const tampered = Buffer.from(bytes);
  tampered[tampered.length - 1] ^= 1;
  const badFile = `${backup.file}.tampered`;
  files.push(badFile);
  await writeFile(badFile, tampered, { flag: "wx" });
  await assert.rejects(restoreBackup(badFile, key), /authentication/);
  await assert.rejects(restoreBackup(backup.file, randomBytes(32)), /authentication/);
  console.log("PASS Wrong-key and modified backups rejected before restore");
  const restored = await restoreBackup(backup.file, key);
  files.push(restored.reportFile);
  const report = JSON.parse(await readFile(restored.reportFile, "utf8"));
  assert.equal(report.verified, true);
  for (const name of ["audit_logs", "masterlist_versions", "ovr_batches", "schema_migrations"])
    assert.ok(report.tables.some((table) => table.name === name && table.count > 0), `${name} history must be populated for this recovery drill`);
  console.log(`PASS ${report.tables.length} tables, history, schema constraints, triggers and views restored in ${restored.elapsedSeconds}s`);
  assert.equal((await db.query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?", [restored.target]))[0].length, 0);
  const retained = await restoreBackup(backup.file, key, { keep: true });
  files.push(retained.reportFile);
  const retainedReport = JSON.parse(await readFile(retained.reportFile, "utf8"));
  assert.match(retained.target, /^ldss_restore_\d+_[a-f0-9]{8}$/);
  assert.match(retainedReport.definerAccount, /^ldss_r_[a-f0-9]{16}$/);
  try {
    assert.equal(retainedReport.retained, true);
    assert.equal((await db.query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?", [retained.target]))[0].length, 1);
    await db.query(`SELECT * FROM \`${retained.target}\`.audit_event_view LIMIT 0`);
  } finally {
    await db.query(`DROP DATABASE \`${retained.target}\``);
    await db.query(`DROP USER ${db.escape(retainedReport.definerAccount)}@'localhost'`);
  }
  console.log("PASS Retained recovery copy and its view definer remain usable; test copy explicitly cleaned up");
  const payload = unseal(bytes, key);
  payload.sql += "\nSELECT 1 FROM `ldss_scholar_monitor_dev`.`users` LIMIT 1;\n";
  payload.sqlHash = createHash("sha256").update(payload.sql).digest("hex");
  const scopedFile = `${backup.file}.scope-test`;
  files.push(scopedFile);
  await writeFile(scopedFile, seal(payload, key), { flag: "wx" });
  await assert.rejects(restoreBackup(scopedFile, key), /database tool failed/);
  const [[after]] = await db.query("SELECT COUNT(*) AS n FROM users");
  assert.equal(after.n, before.n);
  console.log("PASS Restore account cannot read the source database; successful and failed temporary restores cleaned up");
} catch (error) {
  console.error(error.code ? `Recovery drill failed (${error.code}); SQL withheld.` : error.message);
  process.exitCode = 1;
} finally {
  for (const file of files) await unlink(file).catch(() => {});
  if (db) await db.end();
}
