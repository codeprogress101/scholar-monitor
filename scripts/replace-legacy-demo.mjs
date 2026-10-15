import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { localAdmin } from "./migration-lib.mjs";
import { loadKey, createBackup, restoreBackup } from "./backup-lib.mjs";

// Local-only removal of an exact seed manifest graph. No schema,
// account, audit, permission or identifier-sequence reset is performed.
const apply = process.argv.includes("--apply");
const payroll = process.argv.includes("--payroll");
assert.ok(process.argv.slice(2).every(a => ["--apply", "--payroll"].includes(a)), "Use --apply and/or --payroll; default is rollback rehearsal");
const prefix = payroll ? "payroll-demo" : "legacy-demo";
const manifestPath = payroll ? "output/payroll-demo-manifest.json" : "output/demo-data-manifest.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(manifest.database, "ldss_scholar_monitor_dev");
assert.equal(manifest.complete, true);
assert.equal(payroll ? manifest.steps["cycle-1"].body.code : manifest.steps.cycle.body.code, payroll ? "DEMO-PAY-2" : "DEMO-PAYOUT", "Unexpected demo manifest");
const entity = payroll ? manifest.steps["cycle-1"].result.id : manifest.steps.cycle.result.id;
const archivePath = `output/${prefix}-manifest-archived-${Date.now()}.json`;
const quote = s => { assert.match(s, /^[a-zA-Z0-9_]+$/); return `\`${s}\``; };
const db = await localAdmin();
let backup;
try {
  assert.equal((await db.query("SELECT GET_LOCK('ldss_demo_seed',0) AS acquired"))[0][0].acquired, 1);
  if (apply) {
    const key = await loadKey();
    backup = await createBackup(key);
    const verified = await restoreBackup(backup.file, key);
    await copyFile(manifestPath, archivePath);
    await writeFile(`output/${prefix}-replacement-backup.json`, JSON.stringify({ backup, verified, archivePath }, null, 2));
    console.log("Encrypted backup restored and verified successfully.");
  }
  await db.beginTransaction();
  const [tableNames] = await db.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  const data = new Map(), selected = new Map(), keys = new Map();
  for (const { TABLE_NAME: t } of tableNames) {
    data.set(t, (await db.query(`SELECT * FROM ${quote(t)} FOR UPDATE`))[0]);
    selected.set(t, new Set());
    keys.set(t, (await db.query("SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME='PRIMARY' ORDER BY ORDINAL_POSITION", [t]))[0].map(r => r.COLUMN_NAME));
  }
  const roots = new Map();
  const addRoot = (table, id) => {
    const row = data.get(table).find(r => r.id === id);
    assert.ok(row, `Missing manifest root ${table}/${id}; refuse a partial or repeated purge`);
    selected.get(table).add(row);
    if (!roots.has(table)) roots.set(table, new Set());
    roots.get(table).add(id);
  };
  for (const [name, step] of Object.entries(manifest.steps)) {
    if (/^person-\d+$/.test(name)) addRoot("scholars", step.result.id);
    if (step.url.startsWith("/api/v1/configuration/") && step.body.action === "create") {
      assert.match(step.body.fields.code, /^DEMO-/);
      addRoot(step.url.split("/").at(-1).replaceAll("-", "_"), step.result.id);
    }
    if (step.url === "/api/v1/requirement-definitions") {
      assert.match(step.body.code, /^DEMO-/);
      const root = data.get("requirement_definitions").find(r => r.code === step.body.code);
      assert.ok(root);
      const version = data.get("requirement_definition_versions").find(r => r.id === step.result.id);
      assert.equal(version?.definition_id, root.id);
      addRoot("requirement_definitions", root.id);
    }
  }
  assert.equal(roots.get("scholars").size, payroll ? 11 : 17);
  // Existing manual records may legitimately reuse demo-created catalog items.
  // Preserve those shared schools/courses, together with their full history.
  for (const record of data.get("academic_records")) if (!roots.get("scholars").has(record.scholar_id)) {
    for (const [table, column] of [["schools", "school_id"], ["courses", "course_id"]]) {
      const shared = data.get(table).find(r => r.id === record[column]);
      if (shared && selected.get(table).delete(shared)) {
        roots.get(table).delete(shared.id);
        console.log(`Preserving shared catalog item: ${table}/${shared.code}`);
      }
    }
  }
  for (const step of Object.values(manifest.steps)) if (step.url === "/api/v1/payout-cycles" && step.body.action === "create") {
    assert.match(step.body.code, /^DEMO-/);
    addRoot("payout_cycles", step.result.id);
  }
  addRoot("masterlist_versions", manifest.steps.masterlist.result.id);
  const [columns] = await db.query("SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION");
  const grouped = new Map();
  for (const col of columns) {
    const key = col.TABLE_NAME + "/" + col.CONSTRAINT_NAME;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(col);
  }
  const relations = [...grouped.values()];
  let changed = true;
  while (changed) {
    changed = false;
    for (const rel of relations) {
      const child = rel[0].TABLE_NAME, parent = rel[0].REFERENCED_TABLE_NAME;
      for (const row of data.get(child)) {
        if (!selected.get(child).has(row) && [...selected.get(parent)].some(p => rel.every(c => row[c.COLUMN_NAME] != null && row[c.COLUMN_NAME] === p[c.REFERENCED_COLUMN_NAME]))) {
          selected.get(child).add(row); changed = true;
        }
      }
    }
  }
  for (const t of ["users", "user_roles", "roles", "permissions", "role_permissions", "audit_logs", "schema_migrations", "scholar_id_sequences"]) assert.equal(selected.get(t).size, 0, `Protected table ${t}`);
  for (const [t, rows] of selected) for (const row of rows) {
    if (roots.has(t)) assert.ok(roots.get(t).has(row.id), `Cross-linked non-demo root ${t}`);
    if (row.scholar_id) assert.ok(roots.get("scholars").has(row.scholar_id), `Non-demo scholar dependency in ${t}`);
    for (const rel of relations.filter(r => r[0].TABLE_NAME === t && roots.has(r[0].REFERENCED_TABLE_NAME) && !["schools", "courses"].includes(r[0].REFERENCED_TABLE_NAME))) {
      if (rel.every(c => row[c.COLUMN_NAME] != null)) assert.ok([...selected.get(rel[0].REFERENCED_TABLE_NAME)].some(p => rel.every(c => row[c.COLUMN_NAME] === p[c.REFERENCED_COLUMN_NAME])), `Shared non-demo parent referenced by ${t}`);
    }
  }
  const counts = Object.fromEntries([...selected].filter(([,v]) => v.size).map(([k,v]) => [k,v.size]));
  console.log("Exact demo removal scope:", counts);
  // Delete child rows first with foreign keys still enabled. No CASCADE or
  // FOREIGN_KEY_CHECKS bypass; a newly discovered dependency aborts the transaction.
  let pending = [...selected].flatMap(([t,rows]) => [...rows].map(row => ({t,row})));
  while (pending.length) {
    const next = [];
    for (const item of pending) {
      const {t,row} = item, pk = keys.get(t);
      assert.ok(pk.length, `Missing primary key: ${t}`);
      try {
        const [result] = await db.query(`DELETE FROM ${quote(t)} WHERE ${pk.map(c => `${quote(c)} <=> ?`).join(" AND ")}`, pk.map(c => row[c]));
        assert.equal(result.affectedRows, 1);
      } catch (e) { if (e.errno !== 1451) throw e; next.push(item); }
    }
    assert.ok(next.length < pending.length, "Unresolved dependencies; nothing committed");
    pending = next;
  }
  const canonical = rows => rows.map(r => JSON.stringify(r)).sort();
  for (const [t, rows] of data) {
    const [actual] = await db.query(`SELECT * FROM ${quote(t)}`);
    assert.deepEqual(canonical(actual), canonical(rows.filter(r => !selected.get(t).has(r))), `Non-demo data changed: ${t}`);
  }
  if (apply) {
    await db.query("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_kind,operator_reference,occurred_at,request_id,reason,details) VALUES(?,?,?,?,?,'operator',?,UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), "demo.replacement", "demo_dataset", entity, "remove_demo", "Local demo replacement command", randomUUID(), "User requested replacement of synthetic demo data", JSON.stringify({ counts, backup: backup.file, manifest: archivePath, preservedNonDemoRows: true })]);
    await db.commit();
  } else await db.rollback();
  await writeFile(`output/${prefix}-removal-${apply ? "applied" : "rehearsal"}.json`, JSON.stringify({ applied: apply, checkedAt: new Date().toISOString(), counts, removedKeys: Object.fromEntries([...selected].filter(([,rows]) => rows.size).map(([t,rows]) => [t, [...rows].map(r => Object.fromEntries(keys.get(t).map(k => [k,r[k]])))])), preservedNonDemoRows: true, backup }, null, 2));
  console.log(apply ? "Demo removed; all other rows preserved. Its archived manifest retains command history." : "Rehearsal passed; every deletion rolled back.");
} catch (e) { await db.rollback(); throw e; }
finally { await db.query("SELECT RELEASE_LOCK('ldss_demo_seed')"); await db.end(); }
