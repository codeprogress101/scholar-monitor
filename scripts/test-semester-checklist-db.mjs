import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { prepareRestoredNotificationSchema, localAdmin, applyMigrations } from "./migration-lib.mjs";
import { loadKey, createBackup, restoreBackup, inventory } from "./backup-lib.mjs";

const migration = "20261006030000_f36_semester_checklist_owner.sql";
const sql = await readFile(new URL(`../db/migrations/${migration}`, import.meta.url), "utf8");
const statements = sql.split(/\r?\n-- statement-break\r?\n/);
const report = { passed: false, checks: [], appliedLocally: false };
const pass = (message) => { report.checks.push(message); console.log("PASS " + message); };
let db, restored, definer;
const applyLocal = process.argv.includes("--apply-local");
async function capture(connection) {
  const state = await inventory(connection);
  const columns = state.columns.filter((c) => c.TABLE_NAME === "requirement_checklists" && c.COLUMN_NAME !== "scholar_semester_id").map((c) => `\`${c.COLUMN_NAME}\``);
  const [rows] = await connection.query({ sql: `SELECT ${columns.join(",")} FROM requirement_checklists ORDER BY id`, dateStrings: true });
  return { state, rows };
}
async function preserve(connection, before) {
  const after = await capture(connection);
  assert.deepEqual(after.rows, before.rows, "Historical checklist values must remain unchanged");
  for (const prior of before.state.tables.filter((t) => !["schema_migrations", "requirement_checklists"].includes(t.name)))
    assert.deepEqual(after.state.tables.find((t) => t.name === prior.name), prior);
  assert.equal(after.state.tables.find((t) => t.name === "requirement_checklists").count, before.rows.length);
  for (const section of ["columns", "indexes", "constraints", "foreignKeys", "rules", "checks", "triggers", "views"])
    assert.deepEqual(after.state[section].filter((r) => !["requirement_checklists", "scholar_semesters"].includes(r.TABLE_NAME)), before.state[section].filter((r) => !["requirement_checklists", "scholar_semesters"].includes(r.TABLE_NAME)));
  return after;
}
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
  const before = await capture(db);
  // Exercise interruption after the first DDL and a retry after all DDL.
  await db.query(statements[0]);
  for (const statement of statements) await db.query(statement);
  await applyMigrations(db);
  assert.deepEqual(await applyMigrations(db), []);
  const after = await preserve(db, before);
  pass("Partial DDL and full DDL retries succeed; existing checklist values and unrelated records/schema are preserved");

  await db.beginTransaction();
  const [[actor]] = await db.query("SELECT id FROM users LIMIT 1");
  const [periods] = await db.query("SELECT id,academic_year_id,code,name FROM semesters ORDER BY id LIMIT 2");
  assert.ok(actor && periods.length === 2, "Fixture needs an account and two semesters");
  const insert = async (table, fields) => {
    assert.ok(["scholars", "participations", "workflow_authority_versions", "workflow_policy_versions", "workflow_scope_versions", "scholar_semesters", "requirement_checklists"].includes(table));
    await db.execute(`INSERT INTO ${table} (${Object.keys(fields).join(",")}) VALUES (${Object.keys(fields).map(() => "?").join(",")})`, Object.values(fields));
  };
  const audit = { actor_id: actor.id, recorded_at: "2026-10-06 00:00:00" };
  const scholar = randomUUID(), participation = randomUUID(), authority = randomUUID(), policy = randomUUID(), scope = randomUUID(), term = randomUUID();
  await insert("scholars", { id: scholar, first_name: "Synthetic", last_name: "Semester bridge", academic_year_id: periods[0].academic_year_id, created_at: audit.recorded_at, updated_at: audit.recorded_at });
  await insert("participations", { id: participation, scholar_id: scholar, entry_basis: "new_applicant", ...audit });
  await insert("workflow_authority_versions", { id: authority, code: randomUUID(), revision: 1, issuer: "Synthetic fixture only", reference_text: "TEST", scope: "{}", valid_from: "2026-01-01", source_location: "Disposable restored database", ...audit });
  await insert("workflow_policy_versions", { id: policy, code: randomUUID(), revision: 1, authority_version_id: authority, source_reference: "TEST", effective_from: "2026-01-01", rules: "{}", ...audit });
  await insert("workflow_scope_versions", { id: scope, semester_id: periods[0].id, cohort_code: "TEST", revision: 1, policy_version_id: policy, ...audit });
  await insert("scholar_semesters", { id: term, scholar_id: scholar, semester_id: periods[0].id, participation_id: participation, scope_version_id: scope, ...audit });
  const checklist = { id: randomUUID(), scholarship_record_id: null, scholar_semester_id: term, semester_id: periods[0].id, policy_date: "2026-10-06", year_code: "TEST", year_name: "TEST", semester_code: "TEST", semester_name: "TEST", semester_version: 1, reason: "Synthetic fixture only", reference_text: "TEST", actor_id: actor.id, actor_name: "Synthetic fixture", created_at: audit.recorded_at };
  const invalid = (fields, code) => assert.rejects(insert("requirement_checklists", { ...checklist, id: randomUUID(), ...fields }), (e) => e.code === code || (code === "ER_CONSTRAINT_FAILED" && e.errno === 4025));
  await invalid({ scholar_semester_id: null }, "ER_CONSTRAINT_FAILED");
  await invalid({ scholar_semester_id: randomUUID() }, "ER_NO_REFERENCED_ROW_2");
  await invalid({ semester_id: periods[1].id }, "ER_NO_REFERENCED_ROW_2");
  const [[annual]] = await db.query("SELECT id FROM scholarship_records LIMIT 1");
  assert.ok(annual, "Fixture needs an existing annual record");
  await invalid({ scholarship_record_id: annual.id }, "ER_CONSTRAINT_FAILED");
  await invalid({ payout_cycle_id: randomUUID(), payout_version_id: randomUUID() }, "ER_CONSTRAINT_FAILED");
  await insert("requirement_checklists", checklist);
  await invalid({}, "ER_DUP_ENTRY");
  await db.rollback();
  assert.deepEqual(await capture(db), after);
  pass("Semester ownership accepts no fabricated annual record; missing/dual/wrong-period ownership and duplicates rejected; probes rolled back");
  if (applyLocal) {
    await db.changeUser({ database: process.env.DB_NAME });
    const liveBefore = await capture(db);
    const applied = await applyMigrations(db);
    assert.ok(applied.every((name) => name === migration));
    await preserve(db, liveBefore);
    report.appliedLocally = true;
    pass("Local compatibility migration applied after verified backup/restore; historical values preserved");
  }
  report.passed = true;
} catch (error) {
  console.error(error.code ? `Semester bridge validation failed (${error.code}); SQL/data withheld.` : error.message);
  process.exitCode = 1;
} finally {
  if (db) {
    await db.rollback().catch(() => {});
    if (restored) { assert.match(restored.target, /^ldss_restore_\d+_[a-f0-9]{8}$/); await db.query(`DROP DATABASE \`${restored.target}\``); }
    if (definer) { assert.match(definer, /^ldss_r_[a-f0-9]{16}$/); await db.query(`DROP USER ${db.escape(definer)}@'localhost'`); }
    await db.end();
  }
  await mkdir("output/workflow-phase06", { recursive: true });
  await writeFile(`output/workflow-phase06/semester-bridge${applyLocal ? "-local" : ""}.json`, JSON.stringify(report, null, 2) + "\n");
}
