import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { localAdmin } from "./migration-lib.mjs";
import { loadKey, createBackup, restoreBackup } from "./backup-lib.mjs";

// One explicitly authorized local cleanup, not a general reset command.
// Preserve accounts, audit, working-year setup, identifiers and non-sample rows.
const apply = process.argv.includes("--apply");
assert.ok(process.argv.slice(2).every(a => a === "--apply"), "Only --apply is supported; default rehearses and rolls back");
const folder = "output/sample-cleanup";
await mkdir(folder, { recursive: true });
const manifestPaths = ["output/demo-data-manifest.json", "output/payroll-demo-manifest.json"];
const manifests = await Promise.all(manifestPaths.map(async file => JSON.parse(await readFile(file, "utf8"))));
for (const m of manifests) { assert.equal(m.database, "ldss_scholar_monitor_dev"); assert.equal(m.complete, true); }
const additionallyConfirmed = new Map([
  ["1f588bf6-1a84-45fc-8c42-53a5c95124b1", "LDSS-2026-00001"],
  ["f1b6006e-8fd9-47dc-b4b9-9e6066b66836", "LDSS-2026-00041"],
]);
const quote = name => { assert.match(name, /^[a-zA-Z0-9_]+$/); return `\`${name}\``; };
const canonical = rows => rows.map(r => JSON.stringify(r)).sort();
const db = await localAdmin();
let backup, restore;
try {
  assert.equal((await db.query("SELECT GET_LOCK('ldss_demo_seed',0) AS acquired"))[0][0].acquired, 1);
  if (apply) {
    const key = await loadKey(); backup = await createBackup(key); restore = await restoreBackup(backup.file, key);
    for (const file of manifestPaths) await copyFile(file, `${folder}/${file.split('/').at(-1)}.before.json`);
    await writeFile(`${folder}/recovery.json`, JSON.stringify({ backup, restore }, null, 2));
    console.log("Encrypted backup restored and verified before cleanup.");
  }
  await db.beginTransaction();
  const [tables] = await db.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  const data = new Map(), selected = new Map(), keys = new Map(), roots = new Map();
  for (const { TABLE_NAME: t } of tables) {
    data.set(t, (await db.query(`SELECT * FROM ${quote(t)} FOR UPDATE`))[0]); selected.set(t, new Set());
    keys.set(t, (await db.query("SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME='PRIMARY' ORDER BY ORDINAL_POSITION", [t]))[0].map(r => r.COLUMN_NAME));
  }
  const root = (table, id) => {
    assert.ok(data.has(table), `Unknown manifest table ${table}`);
    const row = data.get(table).find(r => r.id === id);
    if (!row) return; // Older seed was already removed; only matching retained IDs qualify.
    selected.get(table).add(row);
    if (!roots.has(table)) roots.set(table, new Set()); roots.get(table).add(id);
  };
  for (const m of manifests) for (const [name, step] of Object.entries(m.steps)) {
    if (/^person-\d+$/.test(name)) root("scholars", step.result.id);
    if (step.url.startsWith("/api/v1/configuration/") && step.body.action === "create") {
      assert.match(step.body.fields.code, /^DEMO-/);
      const table = step.url.split("/").at(-1).replaceAll("-", "_");
      const row = data.get(table)?.find(r => r.id === step.result.id);
      if (row) assert.equal(row.code, step.body.fields.code);
      root(table, step.result.id);
    }
    if (step.url === "/api/v1/requirement-definitions") {
      assert.match(step.body.code, /^DEMO-/);
      const version = data.get("requirement_definition_versions").find(r => r.id === step.result.id);
      if (version) { assert.equal(data.get("requirement_definitions").find(r => r.id === version.definition_id)?.code, step.body.code); root("requirement_definitions", version.definition_id); }
    }
    if (step.url === "/api/v1/payout-cycles" && step.body.action === "create") {
      assert.match(step.body.code, /^DEMO-/); root("payout_cycles", step.result.id);
    }
  }
  for (const [id, humanId] of additionallyConfirmed) {
    assert.equal(data.get("scholar_identifiers").find(r => r.scholar_id === id)?.human_id, humanId, "Confirmed sample is missing or changed; refuse repeated cleanup");
    root("scholars", id);
  }
  assert.equal(roots.get("scholars").size, 13, "Expected exactly the 11 manifest samples plus the two user-confirmed samples");
  const [columns] = await db.query("SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION");
  const grouped = new Map();
  for (const col of columns) { const key = col.TABLE_NAME + "/" + col.CONSTRAINT_NAME; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(col); }
  const relations = [...grouped.values()];
  let changed = true;
  while (changed) {
    changed = false;
    for (const rel of relations) {
      const child = rel[0].TABLE_NAME, parent = rel[0].REFERENCED_TABLE_NAME;
      for (const row of data.get(child)) if (!selected.get(child).has(row) && [...selected.get(parent)].some(p => rel.every(c => row[c.COLUMN_NAME] != null && row[c.COLUMN_NAME] === p[c.REFERENCED_COLUMN_NAME]))) {
        selected.get(child).add(row); changed = true;
      }
    }
  }
  for (const t of ["users", "user_roles", "roles", "permissions", "role_permissions", "audit_logs", "schema_migrations", "scholar_id_sequences", "system_settings"]) {
    if (selected.has(t)) assert.equal(selected.get(t).size, 0, `Protected table ${t}`);
  }
  for (const [t, rows] of selected) for (const row of rows) {
    if (row.scholar_id) assert.ok(roots.get("scholars").has(row.scholar_id), `Non-sample scholar dependency in ${t}`);
    if (["scholars", "academic_years", "semesters", "schools", "courses", "requirement_definitions", "payout_cycles"].includes(t)) assert.ok(roots.get(t)?.has(row.id), `Non-sample root in ${t}`);
  }
  const workingYear = data.get("academic_years").find(r => r.code === "AY2026-2027");
  assert.ok(workingYear && !selected.get("academic_years").has(workingYear));
  const counts = Object.fromEntries([...selected].filter(([,v]) => v.size).map(([k,v]) => [k,v.size]));
  const removedKeys = Object.fromEntries([...selected].filter(([,v]) => v.size).map(([t,rows]) => [t,[...rows].map(r => Object.fromEntries(keys.get(t).map(k => [k,r[k]])))]));
  console.log("Confirmed sample removal:", JSON.stringify(counts));
  // Keep every FK enabled. Delete children first; any unknown dependency aborts.
  let pending = [...selected].flatMap(([t,rows]) => [...rows].map(row => ({t,row})));
  while (pending.length) {
    const next = [];
    for (const item of pending) {
      const {t,row} = item, pk = keys.get(t); assert.ok(pk.length, `No primary key in ${t}`);
      try {
        const [result] = await db.query(`DELETE FROM ${quote(t)} WHERE ${pk.map(c => `${quote(c)} <=> ?`).join(" AND ")}`, pk.map(c => row[c]));
        assert.equal(result.affectedRows, 1);
      } catch (e) { if (e.errno !== 1451) throw e; next.push(item); }
    }
    assert.ok(next.length < pending.length, "Unresolved dependency; rollback required"); pending = next;
  }
  for (const [t,rows] of data) assert.deepEqual(canonical((await db.query(`SELECT * FROM ${quote(t)}`))[0]), canonical(rows.filter(r => !selected.get(t).has(r))), `Non-sample rows changed: ${t}`);
  const report = { applied: apply, checkedAt: new Date().toISOString(), counts, removedKeys, preservedNonSampleRows: true, backup, restore };
  await writeFile(`${folder}/prepared-${apply ? "apply" : "rehearsal"}.json`, JSON.stringify(report,null,2));
  if (apply) {
    await db.query("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_kind,operator_reference,occurred_at,request_id,reason,details) VALUES(?,?,?,?,?,'operator',?,UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), "demo.cleanup", "demo_dataset", manifests[1].steps.masterlist.result.id, "remove_samples", "Authorized local sample cleanup", randomUUID(), "User requested all sample data removed, explicitly including Juan Dela Cruz and James Patrick Villanueva", JSON.stringify({ counts, backup: backup.file, manifests: manifestPaths, preservedNonSampleRows: true })]);
    await db.commit();
  } else await db.rollback();
  await writeFile(`${folder}/${apply ? "applied" : "rehearsal"}.json`, JSON.stringify(report,null,2));
  console.log(apply ? "Sample cleanup committed; all other rows and historical audits preserved." : "Rehearsal passed; all deletions rolled back.");
} catch (e) { await db.rollback(); throw e; }
finally { await db.query("SELECT RELEASE_LOCK('ldss_demo_seed')"); await db.end(); }
