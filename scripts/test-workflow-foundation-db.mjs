import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { prepareRestoredNotificationSchema, localAdmin, applyMigrations, grantAuthRuntime } from "./migration-lib.mjs";
import { loadKey, createBackup, restoreBackup, inventory } from "./backup-lib.mjs";

const migration = "20261006010000_f36_workflow_foundation.sql";
const sql = await readFile(new URL(`../db/migrations/${migration}`, import.meta.url), "utf8");
const tables = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]);
const report = { phase: "04", passed: false, checks: [], backup: null, restore: null };
let db, runtime, restored, definer, runtimeUser;
const pass = (message) => { report.checks.push(message); console.log("PASS " + message); };
try {
  db = await localAdmin();
  const key = await loadKey();
  report.backup = await createBackup(key);
  restored = await restoreBackup(report.backup.file, key, { keep: true });
  report.restore = restored;
  definer = JSON.parse(await readFile(restored.reportFile, "utf8")).definerAccount;
  assert.match(restored.target, /^ldss_restore_\d+_[a-f0-9]{8}$/);
  await db.changeUser({ database: restored.target });
  await prepareRestoredNotificationSchema(db);
  const before = await inventory(db);
  const [oldMigrations] = await db.query("SELECT * FROM schema_migrations ORDER BY version");
  const hadFoundation = oldMigrations.some((m) => m.version === migration);
  if (!hadFoundation) {
    // Simulate interruption after initial DDL, before the migration checksum is recorded.
    for (const statement of sql.split(/\r?\n-- statement-break\r?\n/).slice(0, 3)) await db.query(statement);
  }
  assert.deepEqual(await applyMigrations(db), hadFoundation ? [] : [migration]);
  assert.deepEqual(await applyMigrations(db), []);
  const after = await inventory(db);
  for (const prior of before.tables.filter((t) => t.name !== "schema_migrations"))
    assert.deepEqual(after.tables.find((t) => t.name === prior.name), prior);
  for (const section of ["columns", "indexes", "constraints", "foreignKeys", "rules", "checks", "triggers", "views"])
    assert.deepEqual(after[section].filter((r) => !tables.includes(r.TABLE_NAME)), before[section].filter((r) => !tables.includes(r.TABLE_NAME)));
  const [migrations] = await db.query("SELECT * FROM schema_migrations ORDER BY version");
  assert.deepEqual(migrations.filter((m) => m.version !== migration), oldMigrations.filter((m) => m.version !== migration));
  if (!hadFoundation) for (const name of tables) assert.equal(after.tables.find((t) => t.name === name)?.count, 0);
  pass("Restored migration/retry preserves existing data, schema and migration history; newly created additions start empty");

  runtimeUser = `ldss_wf_${randomBytes(6).toString("hex")}`;
  const password = randomBytes(24).toString("hex");
  await db.query(`CREATE USER ${db.escape(runtimeUser)}@'localhost' IDENTIFIED BY ${db.escape(password)}`);
  await grantAuthRuntime(db, restored.target, runtimeUser);
  runtime = await mysql.createConnection({ host: "127.0.0.1", port: Number(process.env.DB_PORT ?? 3306), user: runtimeUser, password, database: restored.target });
  for (const name of tables) {
    const onboarded = ["continuing_roster_batches", "continuing_roster_entries", "continuing_roster_decisions", "participations", "participation_events", "workflow_authority_versions", "workflow_commands", "workflow_policy_versions", "workflow_scope_versions", "scholar_semesters", "scholar_semester_revisions", "requirement_coverage", "semester_review_events", "semester_entitlements", "semester_entitlement_events", "entitlement_release_links"].includes(name);
    const readable = onboarded || ["scholar_semesters", "scholar_semester_revisions", "requirement_coverage", "workflow_scope_versions", "semester_review_events", "semester_entitlements"].includes(name);
    if (readable) await runtime.query(`SELECT * FROM ${name} LIMIT 0`);
    for (const query of [...(readable ? [] : [`SELECT * FROM ${name} LIMIT 0`]), `EXPLAIN DELETE FROM ${name} WHERE 1=0`])
      await assert.rejects(runtime.query(query), (e) => e.code === "ER_TABLEACCESS_DENIED_ERROR");
    const column = after.columns.find((c) => c.TABLE_NAME === name).COLUMN_NAME;
    await assert.rejects(runtime.query(`EXPLAIN UPDATE ${name} SET ${column}=${column} WHERE 1=0`), (e) => e.code === "ER_TABLEACCESS_DENIED_ERROR");
    if (!onboarded) await assert.rejects(runtime.query(`INSERT INTO ${name} (${column}) VALUES (NULL)`), (e) => e.code === "ER_TABLEACCESS_DENIED_ERROR");
  }
  pass("Roster, policy/scope, semester/coverage and review append-only access verified; all workflow tables deny overwrite/delete; entitlement writers are append-only");
  const [[user]] = await db.query("SELECT id FROM users LIMIT 1");
  const [[seedScholar]] = await db.query("SELECT academic_year_id FROM scholars LIMIT 1");
  const [periods] = await db.query("SELECT id FROM semesters ORDER BY id LIMIT 2");
  assert.ok(user && seedScholar && periods.length === 2, "Recovery fixture needs existing identity and two semesters");
  const audit = { actor_id: user.id, recorded_at: "2026-10-06 00:00:00" };
  const insert = async (table, fields) => {
    assert.ok(tables.includes(table));
    const data = { ...fields, ...audit };
    await db.execute(`INSERT INTO ${table} (${Object.keys(data).join(",")}) VALUES (${Object.keys(data).map(() => "?").join(",")})`, Object.values(data));
  };
  const invalid = (promise, code) => assert.rejects(promise, (e) => e.code === code || (code === "ER_CONSTRAINT_FAILED" && e.errno === 4025));
  await db.beginTransaction();
  // Do not reuse a real scholar: all continuing scholars may already be onboarded.
  const scholar = { id: randomUUID() };
  await db.execute("INSERT INTO scholars (id,first_name,last_name,academic_year_id,created_at,updated_at) VALUES (?,'Synthetic','Foundation probe',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [scholar.id, seedScholar.academic_year_id]);
  const authority = randomUUID(), policy = randomUUID(), scope = randomUUID(), participation = randomUUID(), semester = randomUUID(), review = randomUUID(), entitlement = randomUUID();
  await insert("workflow_authority_versions", { id: authority, code: "SYNTHETIC", revision: 1, issuer: "Synthetic test authority", reference_text: "FIXTURE ONLY", scope: "{}", valid_from: "2026-01-01", source_location: "Disposable fixture" });
  await insert("workflow_policy_versions", { id: policy, code: "SYNTHETIC", revision: 1, authority_version_id: authority, source_reference: "Synthetic policy", effective_from: "2026-01-01", rules: "{}" });
  await insert("workflow_scope_versions", { id: scope, semester_id: periods[0].id, cohort_code: "SYNTHETIC", revision: 1, policy_version_id: policy });
  const [[scopeRow]] = await db.query("SELECT mode FROM workflow_scope_versions WHERE id=?", [scope]);
  assert.equal(scopeRow.mode, "disabled");
  const person = { id: participation, scholar_id: scholar.id, entry_basis: "new_applicant" };
  await insert("participations", person);
  await invalid(insert("participations", { ...person, id: randomUUID() }), "ER_DUP_ENTRY");
  await invalid(insert("participations", { ...person, id: randomUUID(), scholar_id: randomUUID() }), "ER_NO_REFERENCED_ROW_2");
  const term = { id: semester, scholar_id: scholar.id, semester_id: periods[0].id, participation_id: participation, scope_version_id: scope };
  await invalid(insert("scholar_semesters", { ...term, semester_id: periods[1].id }), "ER_NO_REFERENCED_ROW_2");
  await insert("scholar_semesters", term);
  await invalid(insert("scholar_semesters", { ...term, id: randomUUID() }), "ER_DUP_ENTRY");
  await insert("scholar_semester_revisions", { scholar_semester_id: semester, revision: 1, placement_snapshot: "{}" });
  const [[placement]] = await db.query("SELECT program_category,normalized_year_level,enrolled,full_load FROM scholar_semester_revisions WHERE scholar_semester_id=?", [semester]);
  assert.deepEqual({ ...placement }, { program_category: "unknown", normalized_year_level: null, enrolled: null, full_load: null });
  await insert("semester_review_events", { id: review, scholar_semester_id: semester, revision: 1, semester_revision: 1, policy_version_id: policy, result: "pending", source_snapshot: "{}", source_hash: "0".repeat(64) });
  const benefit = { id: entitlement, scholar_semester_id: semester, scholar_id: scholar.id, semester_id: periods[0].id, benefit_type: "degree_stipend", amount_centavos: 500000, currency: "PHP" };
  await invalid(insert("semester_entitlements", { ...benefit, amount_centavos: 250000 }), "ER_CONSTRAINT_FAILED");
  await invalid(insert("semester_entitlements", { ...benefit, currency: "USD" }), "ER_CONSTRAINT_FAILED");
  await insert("semester_entitlements", benefit);
  await invalid(insert("semester_entitlements", { ...benefit, id: randomUUID() }), "ER_DUP_ENTRY");
  await invalid(insert("semester_entitlement_events", { id: randomUUID(), entitlement_id: entitlement, scholar_semester_id: semester, revision: 1, action: "approved", review_event_id: review, snapshot: "{}", reason: "Fixture" }), "ER_CONSTRAINT_FAILED");
  await invalid(db.query("DELETE FROM participations WHERE id=?", [participation]), "ER_ROW_IS_REFERENCED_2");
  await db.rollback();
  pass("Period/identity foreign keys, uniqueness, unknown values, disabled scope, full PHP amount and required approval authority enforced");
  assert.deepEqual(await inventory(db), after);
  pass("Synthetic probes rolled back with all restored records unchanged");
  report.passed = true;
} catch (error) {
  if (error.code === "ERR_ASSERTION") console.error(error.message.slice(0, 500));
  console.error(error.code ? `Foundation validation failed (${error.code}); SQL withheld.` : error.message);
  process.exitCode = 1;
} finally {
  if (runtime) await runtime.end();
  if (db) {
    await db.rollback().catch(() => {});
    if (restored) {
      assert.match(restored.target, /^ldss_restore_\d+_[a-f0-9]{8}$/);
      await db.query(`DROP DATABASE \`${restored.target}\``);
    }
    if (definer) { assert.match(definer, /^ldss_r_[a-f0-9]{16}$/); await db.query(`DROP USER ${db.escape(definer)}@'localhost'`); }
    if (runtimeUser) { assert.match(runtimeUser, /^ldss_wf_[a-f0-9]{12}$/); await db.query(`DROP USER IF EXISTS ${db.escape(runtimeUser)}@'localhost'`); }
    await db.end();
  }
  await mkdir("output/workflow-phase04", { recursive: true });
  await writeFile("output/workflow-phase04/foundation-validation.json", JSON.stringify(report, null, 2) + "\n");
}
