import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { localAdmin, applyMigrations, grantAuthRuntime } from "./migration-lib.mjs";
import { inventory, loadKey, createBackup, restoreBackup } from "./backup-lib.mjs";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
const apply = process.argv.includes("--apply"), folder = "output/admission-refinement";
await mkdir(folder, { recursive: true });
const manifest = JSON.parse(await readFile("output/sample-cohort-verification.json", "utf8"));
const people = manifest.people.filter(p => p.group === "Graduate");
assert.equal(people.length, 5);
const db = await localAdmin();
try {
  if (apply) {
    const key = await loadKey(), backup = await createBackup(key), restore = await restoreBackup(backup.file, key);
    await writeFile(`${folder}/recovery.json`, JSON.stringify({ backup, restore }, null, 2));
    const before = await inventory(db);
    const migrations = await applyMigrations(db);
    await grantAuthRuntime(db, process.env.DB_NAME, process.env.DB_USER);
    const after = await inventory(db);
    for (const table of before.tables.filter(t => t.name !== "schema_migrations" && t.name !== "auth_sessions")) {
      const current = after.tables.find(t => t.name === table.name);
      assert.equal(current?.checksum, table.checksum, `Migration changed ${table.name}`);
    }
    await writeFile(`${folder}/migration.json`, JSON.stringify({ migrations, preservedTables: before.tables.length - 1 }, null, 2));
  }
  await db.beginTransaction();
  await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
  const [[year]] = await db.query("SELECT id FROM academic_years WHERE code='AY2026-2027'");
  assert.ok(year);
  const report = [];
  for (const p of people) {
    const [[person]] = await db.execute("SELECT s.id,s.middle_name,r.id AS annual_id,r.operational_status,g.request_id,g.semester_id FROM scholars s JOIN scholarship_records r ON r.scholar_id=s.id JOIN graduation_confirmations g ON g.scholarship_id=r.id WHERE s.id=? AND r.id=? FOR UPDATE", [p.id,p.annualId]);
    assert.ok(person); assert.equal(person.middle_name, "Sample Graduate"); assert.equal(person.operational_status, "graduated");
    const [[financial]] = await db.execute("SELECT (SELECT COUNT(*) FROM payment_records WHERE scholarship_id=?) + (SELECT COUNT(*) FROM semester_entitlements WHERE scholar_id=?) AS n", [p.annualId,p.id]);
    assert.equal(Number(financial.n), 0, "Stop: financial history requires separate review");
    const [prior] = await db.execute("SELECT * FROM graduation_record_corrections WHERE request_id=?", [person.request_id]);
    if (!prior.length) {
      await db.execute("INSERT INTO graduation_record_corrections(request_id,graduated_before_year_id,no_outstanding_stipend,operator_reference,reason,recorded_at) VALUES(?,?,1,?,?,UTC_TIMESTAMP(6))", [person.request_id,year.id,"User-confirmed correction of five sample graduates", "Sample graduated before AY2026-2027 with no stipend due; supersedes erroneous seeded first-semester funding confirmation"]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_kind,operator_reference,occurred_at,request_id,reason,details) VALUES(?,'graduation.sample_corrected','scholar',?,'correct','operator',?,UTC_TIMESTAMP(6),?,?,?)", [randomUUID(),p.id,"Explicit user instruction: prior graduates, no stipend due",randomUUID(),"Correct sample classification without overwriting original graduation or inventing payment",JSON.stringify({ originalRequestId:person.request_id,originalSemesterId:person.semester_id,graduatedBeforeYearId:year.id,noOutstandingStipend:true })]);
    } else { assert.equal(prior[0].graduated_before_year_id, year.id); assert.equal(Number(prior[0].no_outstanding_stipend), 1); }
    report.push({ id:p.id,scholarId:p.scholarId,originalRequestId:person.request_id,archived:true,noStipendDue:true });
  }
  if (apply) await db.commit(); else await db.rollback();
  await writeFile(`${folder}/${apply ? "applied" : "rehearsal"}.json`, JSON.stringify({ applied:apply,scholars:report,paymentsCreated:0,originalRecordsPreserved:true }, null, 2));
  console.log(`${apply ? "Applied" : "Rehearsed"}: five prior graduates, no stipend due; original history retained, zero payments created.`);
} catch (error) { await db.rollback(); throw error; }
finally { await db.end(); }
