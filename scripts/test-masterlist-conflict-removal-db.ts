import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import ExcelJS from "exceljs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { schemaManifest } from "../server/schema-manifest.js";
import { applyMigrations, grantAuthRuntime } from "./migration-lib.mjs";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { AuthService } from "../server/auth/service.js";
import { newToken } from "../server/auth/crypto.js";
import { AuthorizationService } from "../server/authorization/service.js";
import type { ConfigRecord } from "../server/configuration/model.js";
import type { ImportPreview, ImportResult } from "../server/imports/model.js";
import { SIMPLE_COLUMNS } from "../server/imports/model.js";
import type { ConflictRemovalReview, ConflictRemovalResult } from "../server/masterlists/conflict-removal-model.js";
import { inventory } from "./backup-lib.mjs";
import type { SelectionReview } from "../server/masterlists/selection-model.js";
const measurements: object[] = [];
const probe = { active: false, selects: 0, writes: 0, rows: 0, bytes: 0 };
const timedPool = (pool: mysql.Pool): mysql.Pool => new Proxy(pool, { get(target, property) {
  if (property === "getConnection") return async () => new Proxy(await target.getConnection(), { get(connection, field) {
    if (field === "query" || field === "execute") return async (...args: unknown[]) => {
      const result = await Reflect.apply(Reflect.get(connection, field), connection, args);
      if (probe.active && typeof args[0] === "string") {
        if (/^\s*SELECT/i.test(args[0])) { probe.selects++; if (Array.isArray(result[0])) { probe.rows += result[0].length; probe.bytes += Buffer.byteLength(JSON.stringify(result[0])); } }
        else if (/^\s*(INSERT|UPDATE|DELETE)/i.test(args[0])) probe.writes++;
      }
      return result;
    };
    const value = Reflect.get(connection, field); return typeof value === "function" ? value.bind(connection) : value;
  } });
  const value = Reflect.get(target, property); return typeof value === "function" ? value.bind(target) : value;
} });

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_ml12_test_${suffix}`,
  runtimeUser = `ldss_test_${suffix}`,
  runtimePassword = newToken();
const origin = "http://127.0.0.1:3026",
  password = "A long synthetic testing passphrase!";
const adminConfig = {
  host: "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: "root",
  password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "",
  timezone: "Z",
};
const admin = await mysql.createConnection(adminConfig);
let root: mysql.Pool | undefined,
  runtime: mysql.Pool | undefined,
  app: ReturnType<typeof buildApp> | undefined;
let createdDatabase = false,
  createdUser = false,
  passed = 0;
const pass = (name: string) => {
  passed++;
  console.log("PASS " + name);
};
try {
  await admin.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  createdDatabase = true;
  await admin.changeUser({ database });
  assert.equal((await applyMigrations(admin)).length, schemaManifest.length);
  assert.deepEqual(await applyMigrations(admin), []);
  await admin.query(
    `CREATE USER ${admin.escape(runtimeUser)}@'localhost' IDENTIFIED BY ${admin.escape(runtimePassword)}`,
  );
  createdUser = true;
  await grantAuthRuntime(admin, database, runtimeUser);
  root = mysql.createPool({ ...adminConfig, database, connectionLimit: 4 });
  runtime = mysql.createPool({
    ...adminConfig,
    database,
    user: runtimeUser,
    password: runtimePassword,
    connectionLimit: 8,
  });
  const auth = new AuthService(root),
    roles = new AuthorizationService(root);
  const db = {
    pool: timedPool(runtime),
    check: async () => "connected" as const,
    close: async () => {},
  };
  app = buildApp(
    loadConfig({ APP_ENV: "test", PORT: "3026", APP_ORIGIN: origin }),
    { database: db },
  );
  const accounts = new Map<
    string,
    { id: string; cookie: string; csrf: string }
  >();
  for (const role of [
    "system_admin",
    "staff",
    "coordinator",
    "reviewer",
    "unassigned",
  ] as const) {
    const email = role + "@example.invalid",
      id = await auth.createAccount(
        "Synthetic " + role,
        email,
        "test-operator",
      );
    const reset = await auth.issueReset(
      email,
      "test-operator",
      "Synthetic fixture activation",
    );
    await auth.resetPassword(reset, password, "127.0.0.1", randomUUID());
    if (role !== "unassigned")
      await roles.setRoles({
        email,
        roles: [role === "reviewer" ? "coordinator" : role],
        expectedVersion: 2,
        requestId: randomUUID(),
        operator: "test-operator",
        reason: "Synthetic fixture role",
      });
    const response: LightMyRequestResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin, "content-type": "application/json" },
      payload: { email, password },
    });
    assert.equal(response.statusCode, 200);
    accounts.set(role, {
      id,
      cookie: String(response.headers["set-cookie"]).split(";")[0],
      csrf: response.json().csrfToken,
    });
  }
  const request = (
    role: string,
    url: string,
    body?: object,
    key: string = randomUUID(),
    method: "GET" | "POST" | "PATCH" = body ? "POST" : "GET",
  ) => {
    const account = accounts.get(role)!;
    return app!.inject({
      method,
      url,
      headers: {
        cookie: account.cookie,
        origin,
        "x-role": "coordinator",
        ...(body
          ? {
              "content-type": "application/json",
              "x-csrf-token": account.csrf,
              "idempotency-key": key,
            }
          : {}),
      },
      ...(body ? { payload: body } : {}),
    });
  };
  const expectError = (
    response: LightMyRequestResponse,
    status: number,
    code: string,
  ) => {
    assert.equal(response.statusCode, status, response.body);
    assert.equal(response.json().error.code, code);
  };
  const config = async (kind: string, fields: object) => {
    const response = await request(
      "system_admin",
      "/api/v1/configuration/" + kind,
      {
        action: "create",
        expectedVersion: 0,
        reason: "Synthetic scholar fixture",
        fields,
      },
    );
    assert.equal(response.statusCode, 200, response.body);
    return response.json<ConfigRecord>();
  };
  const ok = async <T>(response: Promise<LightMyRequestResponse>) => { const r = await response; assert.equal(r.statusCode, 200, r.body); return r.json<T>(); };
  const day = new Date().toISOString().slice(0, 10), evidence = { reason: "Declared fictional ML-1 acceptance evidence", reference: "FICTIONAL-ML1-ONLY" };
  const year = await config("academic-years", { code: "ML1-YEAR", name: "Fictional ML-1 year", startsOn: "2026-01-01", endsOn: "2026-12-31" });
  await config("academic-years", { code: "ML1-OTHER", name: "Fictional other year", startsOn: "2025-01-01", endsOn: "2025-12-31" });
  const school = await config("schools", { code: "ML1-SCHOOL", name: "Fictional ML-1 College" });
  const course = await config("courses", { code: "ML1-COURSE", name: "Fictional ML-1 Course" });
  await config("settings", { code: "LDSS_WORKING_ACADEMIC_YEAR", name: "Working year", valueType: "text", value: year.id });
  const workbook = async (rows: (string | number)[][]) => {
    const book = new ExcelJS.Workbook(), sheet = book.addWorksheet("Declared fictional scholars"); sheet.addRow(SIMPLE_COLUMNS); rows.forEach(r => sheet.addRow(r));
    return { fileName: "fictional-ml1.xlsx", base64: Buffer.from(await book.xlsx.writeBuffer()).toString("base64") };
  };
  const packet = await workbook(Array.from({ length: 835 }, (_, n) => ["ML1Cohort" + String(n).padStart(4, "0"), (n < 25 ? "Group25" : n < 425 ? "Group400" : "GroupRest") + randomBytes(12).toString("hex"), "", "", school.code, n % 2 ? 2 : 1, n % 2 ? "Continuing" : "New", n % 10 ? course.code : ""]));
  const imported = await ok<ImportPreview>(request("coordinator", "/api/v1/imports/stage", { ...packet, approvedSelection: { reference: "Declared fictional approved source packet; not office approval", effectiveOn: day } }));
  assert.equal(imported.ready, true, JSON.stringify(imported.rows.filter(r => r.errors.length || r.warnings.length).slice(0, 5).map(r => ({row:r.row, errors:r.errors, warnings:r.warnings})))); assert.equal(imported.rows.length, 835);
  const importedResult = await ok<ImportResult>(request("coordinator", `/api/v1/imports/${imported.id}/confirm`, { hash: imported.hash, confirm: true, coursePendingConfirmed: true }));
  assert.equal(importedResult.selectedCount, 835);
  const originEvidence = (await root.query<RowDataPacket[]>("SELECT id,file_hash,raw_rows,preview FROM import_jobs WHERE id=?", [imported.id]))[0][0];
  const createDraft = (title: string, academicYearId = year.id) => ok<{ id: string; version: number }>(request("staff", "/api/v1/masterlists", { academicYearId, title, ...evidence }));
  const review = (id: string, q = "ML1Cohort", role = "staff", ids: string[] = []) => ok<SelectionReview>(request(role, `/api/v1/masterlists/${id}/selection-review?mode=${ids.length ? "page" : "all"}&q=${encodeURIComponent(q)}&ids=${ids.join(",")}`));
  const body = (v: SelectionReview) => ({ expectedVersion: v.version, expectedAdditions: v.selectedAddable, selection: v.scope, fingerprint: v.fingerprint, confirm: true as const, ...evidence });
  const add = (v: SelectionReview, role = "staff", key = randomUUID()) => request(role, `/api/v1/masterlists/${v.draftId}/add-scope`, body(v), key);
  const members = async (id: string) => Number((await root!.query<RowDataPacket[]>("SELECT COUNT(*) n FROM masterlist_entries WHERE masterlist_id=? AND removed_at IS NULL", [id]))[0][0].n);
  const version = async (id: string) => Number((await root!.query<RowDataPacket[]>("SELECT version FROM masterlist_versions WHERE id=?", [id]))[0][0].version);

  const ids = importedResult.items.map(i => i.id), cleanId = ids[500];
  const fill = async (title: string, selected: string[]) => {
    const d = await createDraft(title);
    for (let n = 0; n < selected.length; n += 100) await ok(add(await review(d.id, "ML1Cohort", "staff", selected.slice(n,n+100))));
    return d;
  };
  const transition = async (id: string, action: string, role = action === "approve" || action === "publish" || action === "return-draft" ? "coordinator" : "staff") => ok<{id:string;version:number}>(request(role, `/api/v1/masterlists/${id}/${action}`, { expectedVersion: await version(id), ...evidence, ...(action === "publish" ? { effectiveOn: day } : {}) }));
  const officialA = await fill("Fictional official A", ids.slice(0,100)), officialB = await fill("Fictional official B", ids.slice(100,201));
  const one = await fill("Fictional one conflict", [ids[0],cleanId]), page25 = await fill("Fictional 25 conflicts", [...ids.slice(0,25),cleanId]);
  const all167 = await fill("Fictional all 167 conflicts", [...ids.slice(0,167),cleanId]);
  const standingDraft = await fill("Fictional standing-only conflict",[ids[501],cleanId]);
  const browserDraft = await fill("Fictional browser 167 conflicts", [...ids.slice(0,167),cleanId]);
  const manual = await fill("Fictional manual selection", [...ids.slice(0,167),cleanId]);
  const capacity = await fill("Fictional 200 conflict boundary", ids.slice(0,200)), excess = await fill("Fictional 201 conflicts", ids.slice(0,201));
  const race = await fill("Fictional racing removals", [...ids.slice(0,167),cleanId]), retry = await fill("Fictional exact removal retry", [...ids.slice(0,167),cleanId]);
  const blocked = await fill("Fictional approved removal denied", ids.slice(0,25));
  for (const action of ["submit-verification","submit-approval","approve"]) await transition(blocked.id,action);
  for (const d of [officialA,officialB]) for (const action of ["submit-verification","submit-approval","approve","publish"]) await transition(d.id,action);
  const reviewRemoval = (id: string, role = "staff", selected?: string[], offset = 0) => ok<ConflictRemovalReview>(request(role, `/api/v1/masterlists/${id}/conflict-removal-review?mode=${selected ? "selected" : "all"}&ids=${selected?.join(",") ?? ""}&offset=${offset}&limit=25`));
  const removalBody = (v: ConflictRemovalReview) => ({ expectedVersion:v.version, expectedRemovals:v.selectedCount, expectedRemaining:v.remainingCount, selection:v.scope, fingerprint:v.fingerprint, confirm:true, ...evidence });
  const remove = (v: ConflictRemovalReview, role = "staff", key = randomUUID()) => request(role, `/api/v1/masterlists/${v.draftId}/remove-conflicts`, removalBody(v), key);
  await root.query("UPDATE scholarship_records SET operational_status='active',status_version=1,status_effective_on=? WHERE scholar_id=? AND academic_year_id=?",[day,ids[501],year.id]);
  const before = await inventory(admin);
  const standing = await reviewRemoval(standingDraft.id); assert.equal(standing.selectedCount,1); assert.equal(standing.items[0].official?.masterlistId,null);
  await root.query("UPDATE scholarship_records SET operational_status='on_hold',status_version=2 WHERE scholar_id=? AND academic_year_id=?",[ids[501],year.id]);
  expectError(await remove(standing),409,"CONFLICT_SELECTION_CHANGED");
  await root.query("UPDATE scholarship_records SET operational_status='active',status_version=1 WHERE scholar_id=? AND academic_year_id=?",[ids[501],year.id]);
  await ok(remove(await reviewRemoval(standingDraft.id))); assert.equal(await members(standingDraft.id),1);
  pass("Standing-only conflicts are removable without an invented official reference; changed standing evidence rejects stale proof");
  const r167 = await reviewRemoval(all167.id); assert.equal(r167.selectedCount,167); assert.equal(r167.remainingCount,1); assert.equal(r167.selectedIds.length,167);
  const paged: ConflictRemovalReview["items"] = [];
  for (let offset = 0; offset < 167; offset += 25) { const p = await reviewRemoval(all167.id,"staff",undefined,offset); assert.equal(p.fingerprint,r167.fingerprint); paged.push(...p.items); }
  assert.equal(new Set(paged.map(p=>p.scholarId)).size,167); assert.equal(paged.filter(p=>p.official?.masterlistId===officialA.id).length,100); assert.equal(paged.filter(p=>p.official?.masterlistId===officialB.id).length,67);
  assert.equal(await members(all167.id),168); // Review and cancel have no membership effects.
  const start = performance.now(); const success167 = await ok<ConflictRemovalResult>(remove(r167));
  measurements.push({label:"167 atomic removal",elapsedMs:performance.now()-start,requestBytes:Buffer.byteLength(JSON.stringify(removalBody(r167))),result:success167});
  assert.deepEqual(success167,{id:all167.id,version:r167.version+1,removedCount:167,remainingCount:1}); assert.equal(await members(all167.id),1);
  const [[audit]] = await root.query<RowDataPacket[]>("SELECT details FROM audit_logs WHERE entity_id=? AND event_type='masterlist.remove-conflicts'",[all167.id]);
  const details = typeof audit.details === "string" ? JSON.parse(audit.details) : audit.details;
  assert.equal(details.before.length,167); assert.equal(details.after.length,167); assert.ok(details.after.every((r: RowDataPacket)=>r.removed_at && r.award_number===null));
  for (const item of details.after) assert.equal(item.snapshot,details.before.find((r: RowDataPacket)=>r.entry_id===item.id).snapshot);
  pass("All 167 across seven pages and two published sources remove atomically; complete before/after audit and snapshots retained");
  for (const [d,n,role] of [[one,1,"staff"],[page25,25,"coordinator"],[capacity,200,"coordinator"]] as const) {
    const v = await reviewRemoval(d.id,role); assert.equal(v.selectedCount,n);
    const result = await ok<ConflictRemovalResult>(remove(v,role)); assert.equal(result.removedCount,n); assert.equal(await members(d.id),v.remainingCount);
  }
  expectError(await request("staff",`/api/v1/masterlists/${excess.id}/conflict-removal-review?mode=all`),409,"CONFLICT_REMOVAL_CAPACITY");
  expectError(await request("staff",`/api/v1/masterlists/${excess.id}/conflict-removal-review?mode=selected&ids=${ids.slice(0,201).join(",")}`),422,"VALIDATION_FAILED");
  const manual200 = await reviewRemoval(excess.id,"staff",ids.slice(0,200)); assert.equal(manual200.selectedCount,200);
  expectError(await request("staff",`/api/v1/masterlists/${excess.id}/remove-conflicts`,{...removalBody(manual200),reason:"x".repeat(17000)}),413,"PAYLOAD_TOO_LARGE");
  assert.equal(await members(excess.id),201);
  pass("Staff and Coordinator remove 1, 25 and 200; 201 and oversized requests reject without truncation; 200-ID GET review works");
  const [[largeSource]] = await root.query<RowDataPacket[]>("SELECT id,snapshot FROM masterlist_entries WHERE masterlist_id=? AND scholar_id=?",[manual.id,ids[0]]);
  await root.execute("UPDATE masterlist_entries SET snapshot=? WHERE id=?",[JSON.stringify({...JSON.parse(largeSource.snapshot),fictionalCapacityProbe:"x".repeat(361*1024)}),largeSource.id]);
  expectError(await request("staff",`/api/v1/masterlists/${manual.id}/conflict-removal-review?mode=selected&ids=${ids[0]}`),409,"CONFLICT_REMOVAL_CAPACITY");
  await root.execute("UPDATE masterlist_entries SET snapshot=? WHERE id=?",[largeSource.snapshot,largeSource.id]);
  assert.equal(await members(manual.id),168);
  pass("Oversized selected evidence rejects before confirmation without membership changes");
  const partial = await reviewRemoval(manual.id,"staff",[ids[0],ids[101]]); assert.equal(partial.selectedCount,2);
  for (const role of ["system_admin","unassigned"]) {
    expectError(await request(role,`/api/v1/masterlists/${manual.id}/conflict-removal-review?mode=all`),403,"PERMISSION_DENIED");
    expectError(await remove(partial,role),403,"PERMISSION_DENIED");
  }
  expectError(await remove(partial,"coordinator"),409,"CONFLICT_SELECTION_CHANGED");
  expectError(await request("staff",`/api/v1/masterlists/${manual.id}/remove-conflicts`,{...removalBody(partial),expectedVersion:partial.version+1}),409,"CONFLICT_SELECTION_CHANGED");
  expectError(await request("staff",`/api/v1/masterlists/${manual.id}/remove-conflicts`,{...removalBody(partial),fingerprint:"0".repeat(64)}),409,"CONFLICT_SELECTION_CHANGED");
  expectError(await request("staff",`/api/v1/masterlists/${manual.id}/conflict-removal-review?mode=selected&ids=${cleanId}`),409,"CONFLICT_SELECTION_CHANGED");
  expectError(await request("staff",`/api/v1/masterlists/${manual.id}/conflict-removal-review?mode=selected&ids=${ids[0]},${ids[0]}`),422,"VALIDATION_FAILED");
  for (const d of [blocked,officialA]) expectError(await request("staff",`/api/v1/masterlists/${d.id}/conflict-removal-review?mode=all`), d===blocked?423:409,d===blocked?"RECORD_LOCKED":"ORDINARY_DRAFT_REQUIRED");
  await root.query("UPDATE masterlist_activations SET effective_on=DATE_SUB(effective_on,INTERVAL 1 DAY) WHERE scholarship_id=(SELECT id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?)",[ids[0],year.id]);
  expectError(await remove(partial),409,"CONFLICT_SELECTION_CHANGED"); assert.equal(await members(manual.id),168);
  await root.query("UPDATE masterlist_activations SET effective_on=? WHERE scholarship_id=(SELECT id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?)",[day,ids[0],year.id]);
  pass("Actor, version, selection, evidence, duplicate/nonconflicting IDs and approved/official-state protections reject whole operation");
  const rollback = await reviewRemoval(manual.id);
  await root.query("CREATE TRIGGER fail_ml12_ledger BEFORE INSERT ON masterlist_commands FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Declared ML12 rollback probe'");
  try {
    assert.equal((await remove(rollback)).statusCode,500); assert.equal(await members(manual.id),168); assert.equal(await version(manual.id),rollback.version);
    assert.equal(Number((await root.query<RowDataPacket[]>("SELECT COUNT(*) n FROM audit_logs WHERE entity_id=? AND event_type='masterlist.remove-conflicts'",[manual.id]))[0][0].n),0);
  } finally { await root.query("DROP TRIGGER fail_ml12_ledger"); }
  const partialResult = await ok<ConflictRemovalResult>(remove(await reviewRemoval(manual.id,"staff",[ids[0],ids[101]]))); assert.equal(partialResult.removedCount,2); assert.equal(await members(manual.id),166);
  expectError(await remove(rollback),409,"CONFLICT_SELECTION_CHANGED");
  expectError(await request("staff",`/api/v1/masterlists/${manual.id}/conflict-removal-review?mode=selected&ids=${ids[0]}`),409,"CONFLICT_SELECTION_CHANGED");
  const staffRace = await reviewRemoval(race.id), coordRace = await reviewRemoval(race.id,"coordinator");
  const results = await Promise.all([remove(staffRace),remove(coordRace,"coordinator")]); assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,409]); assert.equal(await members(race.id),1);
  const retryReview = await reviewRemoval(retry.id), key = randomUUID();
  const repeated = await Promise.all([remove(retryReview,"staff",key),remove(retryReview,"staff",key)]); assert.ok(repeated.every(r=>r.statusCode===200)); assert.deepEqual(repeated[0].json(),repeated[1].json());
  assert.deepEqual(await ok(remove(retryReview,"staff",key)),repeated[0].json()); assert.equal(await members(retry.id),1);
  expectError(await request("staff",`/api/v1/masterlists/${retry.id}/remove-conflicts`,{...removalBody(retryReview),reason:"Different evidence reason"},key),409,"IDEMPOTENCY_CONFLICT");
  expectError(await remove(retryReview),409,"CONFLICT_SELECTION_CHANGED");
  pass("Late-ledger failure rolls back 167 entries/audit/version; partial selection, already-removed, concurrent removal, double-confirm and exact retry are safe");
  const individualVersion = await version(manual.id);
  await ok(request("staff",`/api/v1/masterlists/${manual.id}/entries`,{action:"remove",scholarId:ids[1],awardNumber:null,expectedVersion:individualVersion,...evidence})); assert.equal(await members(manual.id),165);
  expectError(await request("staff",`/api/v1/masterlists/${manual.id}/submit-verification`,{expectedVersion:await version(manual.id),...evidence}),422,"CANDIDATE_INVALID");
  for (const action of ["approve","publish"]) assert.notEqual((await request("coordinator",`/api/v1/masterlists/${all167.id}/${action}`,{expectedVersion:await version(all167.id),...evidence,...(action==="publish"?{effectiveOn:day}:{})})).statusCode,200);
  for (const action of ["submit-verification","submit-approval","approve"]) await transition(all167.id,action);
  const [[approved]] = await root.query<RowDataPacket[]>("SELECT status FROM masterlist_versions WHERE id=?",[all167.id]); assert.equal(approved.status,"approved");
  assert.equal(Number((await root.query<RowDataPacket[]>("SELECT COUNT(*) n FROM masterlist_activations"))[0][0].n),201);
  const after = await inventory(admin), expected = new Set(["masterlist_entries","masterlist_versions","masterlist_workflow_events","masterlist_commands","audit_logs","auth_sessions","auth_rate_limits","notification_events"]);
  for (const table of before.tables) if (!expected.has(table.name)) assert.deepEqual(after.tables.find((t: {name:string})=>t.name===table.name),table,table.name+" changed");
  for (const k of (Object.keys(before) as (keyof typeof before)[]).filter(k=>k!=="tables")) assert.deepEqual(after[k],before[k]);
  const [officialRows] = await root.query<RowDataPacket[]>("SELECT masterlist_id,COUNT(*) n FROM masterlist_entries WHERE masterlist_id IN (?,?) AND removed_at IS NULL GROUP BY masterlist_id ORDER BY masterlist_id",[officialA.id,officialB.id]); assert.equal(officialRows.reduce((n,r)=>n+Number(r.n),0),201);
  assert.deepEqual((await root.query<RowDataPacket[]>("SELECT id,file_hash,raw_rows,preview FROM import_jobs WHERE id=?",[imported.id]))[0][0],originEvidence);
  pass("Individual removal remains; remaining conflicts block review; corrected draft must resubmit and reapprove; all official/import/annual/financial records preserved");
  const output = process.env.ML1_EVIDENCE_DIR;
  if (output) { await mkdir(output,{recursive:true}); await writeFile(resolve(output,"removal-integration.json"),JSON.stringify({passed:true,scenarios:passed,measurements,ownedDatabase:database,conflicts:167,pages:7,officialSources:[100,67],bounds:{removals:200,bodyBytes:16384},allOtherTablesAndSchemaExact:true},null,2)); }
  if (process.argv.includes("--browser")) {
    await transition(blocked.id,"return-draft");
    const fixture = buildApp(loadConfig({APP_ENV:"test",PORT:"3026",APP_ORIGIN:origin}),{database:db,clientRoot:resolve("dist/client")});
    let stop:()=>void=()=>{}; const finished=new Promise<void>(resolve=>{stop=resolve;});
    fixture.get("/__fixture/stop",async()=>{setTimeout(stop,50);return{stopping:true};}); await fixture.listen({host:"127.0.0.1",port:3026});
    if(output) await writeFile(resolve(output,"browser-fixture.json"),JSON.stringify({origin,database,conflictDraft:browserDraft.id,official:officialA.id,excessDraft:excess.id,approved:all167.id},null,2));
    console.log("Owned fictional removal browser fixture ready."); await finished; await fixture.close();
  }
} finally {
  if (app) await app.close(); if (runtime) await runtime.end(); if (root) await root.end();
  assert.match(database, /^ldss_ml12_test_\d+_[a-f0-9]{8}$/); assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser) await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``); await admin.end();
}
