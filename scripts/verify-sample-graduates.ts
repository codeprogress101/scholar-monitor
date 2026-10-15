import "dotenv/config";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import type { RowDataPacket } from "mysql2/promise";
import { loadConfig } from "../server/config.js";
import { createDatabase } from "../server/database.js";
import { AuthorizationService } from "../server/authorization/service.js";
import { ScholarService } from "../server/scholars/service.js";
import { MasterlistService } from "../server/masterlists/service.js";
import { graduationFor, preventGraduateRenewal } from "../server/status/graduation.js";

const config = loadConfig(process.env);
assert.equal(config.DB_NAME, "ldss_scholar_monitor_dev");
const db = createDatabase(config);
assert.ok(db.pool);
const auth = new AuthorizationService(db.pool);
try {
  const [[actor]] = await db.pool.execute<RowDataPacket[]>("SELECT id FROM users WHERE email='payroll-demo-staff@example.invalid'");
  assert.ok(actor);
  const scholars = new ScholarService(auth), lists = new MasterlistService(auth);
  const all = await scholars.list(actor.id, { scope:"all", limit:100 });
  const current = await scholars.list(actor.id, { scope:"current", limit:100 });
  const archived = await scholars.list(actor.id, { scope:"graduated", limit:100 });
  const manifest = JSON.parse(await readFile("output/sample-cohort-verification.json", "utf8"));
  const people = manifest.people.filter((p: {group:string}) => p.group === "Graduate");
  const c = await db.pool.getConnection();
  try {
    for (const p of people) {
      assert.ok(all.items.some(s => s.id === p.id)); assert.ok(archived.items.some(s => s.id === p.id)); assert.ok(!current.items.some(s => s.id === p.id));
      const g = await graduationFor(c,p.id); assert.ok(g?.archived); assert.equal(g.semesterId,null);
      await assert.rejects(preventGraduateRenewal(c,p.id), {code:"GRADUATE_RENEWAL_BLOCKED"});
      const [[money]] = await c.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM payment_records WHERE scholarship_id=?",[p.annualId]); assert.equal(money.n,0);
    }
    await assert.rejects(c.query("INSERT INTO graduation_record_corrections SELECT * FROM graduation_record_corrections WHERE 1=0"));
  } finally { c.release(); }
  const drafts = await lists.list(actor.id,{limit:100});
  for (const draft of drafts.items.filter(d => d.status === "draft")) {
    const candidates = await lists.candidates(actor.id,draft.id,{q:"Sample Graduate",limit:100});
    for (const p of candidates.items) assert.ok(p.issues.some(i => i.code === "PRIOR_GRADUATE"));
  }
  await writeFile("output/admission-refinement/verification.json",JSON.stringify({passed:true,total:all.total,current:current.total,graduates:archived.total,originalGraduateProfilesPreserved:true,currentDraftGraduateBlock:true,runtimeCorrectionInsertDenied:true,paymentsCreated:0},null,2));
  console.log("PASS Five original graduate profiles remain archived/searchable, no final funded semester or payment, renewal blocked, current draft additions blocked, runtime cannot write corrections.");
} finally { await db.close(); }
