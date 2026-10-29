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
import { candidate } from "../server/masterlists/service.js";
import { loadCandidateSources, projectCandidate } from "../server/masterlists/candidate-source.js";
import type { ConfigRecord } from "../server/configuration/model.js";
import type { ImportPreview, ImportResult } from "../server/imports/model.js";
import { SIMPLE_COLUMNS } from "../server/imports/model.js";
import type { SelectionReview, SelectionResult } from "../server/masterlists/selection-model.js";
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
const database = `ldss_ml1_test_${suffix}`,
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
  const otherYear = await config("academic-years", { code: "ML1-OTHER", name: "Fictional other year", startsOn: "2025-01-01", endsOn: "2025-12-31" });
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
  const measure = async <T extends LightMyRequestResponse>(label: string, fn: () => Promise<T>) => {
    Object.assign(probe, { active: true, selects: 0, writes: 0, rows: 0, bytes: 0 }); const start = performance.now();
    try { const r = await fn(); assert.equal(r.statusCode, 200, r.body); const metric = { label, elapsedMs: performance.now() - start, selects: probe.selects, writeStatements: probe.writes, decodedRows: probe.rows, decodedBytes: probe.bytes, responseBytes: Buffer.byteLength(r.body) }; measurements.push(metric); assert.ok(probe.selects < 60, "Scope reads must remain set-based"); return r.json<SelectionResult>(); }
    finally { probe.active = false; }
  };
  const pageDraft = await createDraft("Fictional page selection");
  const first = await review(pageDraft.id); assert.deepEqual(first.counts, { matching: 835, eligible: 835, alreadyOnDraft: 0, activated: 0, blocked: 0 }); assert.equal(first.items.length, 25);
  const last = await ok<SelectionReview>(request("staff", `/api/v1/masterlists/${pageDraft.id}/selection-review?mode=all&q=ML1Cohort&offset=825&limit=25`)); assert.equal(last.items.length, 10); assert.equal(last.fingerprint, first.fingerprint);
  for (const role of ["system_admin", "unassigned"]) {
    expectError(await request(role, `/api/v1/masterlists/${pageDraft.id}/selection-review?mode=all`), 403, "PERMISSION_DENIED");
    expectError(await request(role, `/api/v1/masterlists/${pageDraft.id}/activation-conflicts`), 403, "PERMISSION_DENIED");
    expectError(await add(first, role), 403, "PERMISSION_DENIED");
  }
  expectError(await add(first, "coordinator"), 409, "SELECTION_CHANGED");
  const pageIds = first.items.map(i => i.scholarId), pageReview = await review(pageDraft.id, "ML1Cohort", "staff", pageIds); assert.equal(pageReview.selectedAddable, 25);
  const pageKey = randomUUID(), added25 = await ok<SelectionResult>(add(pageReview, "staff", pageKey)); assert.equal(added25.addedCount, 25); assert.equal(added25.version, 2); assert.equal(await members(pageDraft.id), 25);
  assert.deepEqual(await ok(add(pageReview, "staff", pageKey)), added25);
  expectError(await request("staff", `/api/v1/masterlists/${pageDraft.id}/add-scope`, { ...body(pageReview), reason: "Different declared reason" }, pageKey), 409, "IDEMPOTENCY_CONFLICT");
  const already = await review(pageDraft.id); assert.equal(already.counts.alreadyOnDraft, 25); assert.equal(already.selectedAddable, 810);
  pass("25-row page preparation, disjoint existing-member counts, actor binding, role denial and exact retry");

  const filtered = await createDraft("Fictional 400-person filter"), filterReview = await review(filtered.id, "Group400"); assert.equal(filterReview.counts.matching, 400);
  await measure("400 filtered add", () => add(filterReview)); assert.equal(await members(filtered.id), 400);
  const full = await createDraft("Fictional whole 835-person draft");
  for (let n = 0; n < 3; n++) await measure("835 review " + (n + 1), () => request("staff", `/api/v1/masterlists/${full.id}/selection-review?mode=all&q=ML1Cohort`));
  const fullReview = await review(full.id); await measure("835 atomic add", () => add(fullReview)); assert.equal(await members(full.id), 835);
  const originalAfter = (await root.query<RowDataPacket[]>("SELECT id,file_hash,raw_rows,preview FROM import_jobs WHERE id=?", [imported.id]))[0][0]; assert.deepEqual(originalAfter, originEvidence);
  pass("400 filtered and 835 cross-page additions use one transaction and preserve original import evidence");

  const staleDraft = await createDraft("Fictional stale review"), beforeChange = await review(staleDraft.id);
  const academicId = importedResult.items[1].academicRecordId!;
  const change = await ok<{ requestId: string }>(request("staff", `/api/v1/academic-records/${academicId}/changes`, { expectedVersion: 0, kind: "year_level_correction", schoolId: school.id, courseId: course.id, yearLevel: "3", effectiveOn: day, remarks: "Declared fictional corrected COR", ...evidence }));
  await ok(request("coordinator", `/api/v1/academic-changes/${change.requestId}/approve`, evidence));
  expectError(await add(beforeChange), 409, "SELECTION_CHANGED"); assert.equal(await members(staleDraft.id), 0);
  const freshReview = await review(staleDraft.id);
  expectError(await request("staff", `/api/v1/masterlists/${staleDraft.id}/add-scope`, { ...body(freshReview), selection: { ...freshReview.scope, q: "Group25" } }), 409, "SELECTION_CHANGED");
  expectError(await request("staff", `/api/v1/masterlists/${staleDraft.id}/add-scope`, { ...body(freshReview), fingerprint: "0".repeat(64) }), 409, "SELECTION_CHANGED");
  const authOracle = new AuthorizationService(runtime);
  await authOracle.withPermission(accounts.get("staff")!.id, "masterlists.prepare", async db => {
    const ids = importedResult.items.slice(0, 25).map(i => i.id), sources = await loadCandidateSources(db, ids, year.id);
    for (const id of ids) assert.deepEqual(projectCandidate(id, sources.get(id)!), await candidate(db, id, year.id));
  });
  pass("Approved academic corrections, forged fingerprints and changed filters invalidate reviews; point-source parity holds");

  const rollback = await createDraft("Fictional rollback"), rollbackReview = await review(rollback.id, "Group400");
  await root.query("CREATE TRIGGER fail_ml1_ledger BEFORE INSERT ON masterlist_commands FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Declared ML1 rollback probe'");
  try { assert.equal((await add(rollbackReview)).statusCode, 500); assert.equal(await members(rollback.id), 0); assert.equal(await version(rollback.id), 1); assert.equal(Number((await root.query<RowDataPacket[]>("SELECT COUNT(*) n FROM audit_event_view WHERE entity_id=? AND event_type='masterlist.add-scope'", [rollback.id]))[0][0].n), 0); }
  finally { await root.query("DROP TRIGGER fail_ml1_ledger"); }
  await ok(add(rollbackReview)); assert.equal(await members(rollback.id), 400);
  const raced = await createDraft("Fictional concurrent whole-scope"), staffReview = await review(raced.id, "Group400"), coordinatorReview = await review(raced.id, "Group400", "coordinator");
  const races = await Promise.all([add(staffReview), add(coordinatorReview, "coordinator")]); assert.deepEqual(races.map(r => r.statusCode).sort(), [200, 409]); assert.equal(await members(raced.id), 400);
  const exact = await createDraft("Fictional lost-response retry"), exactReview = await review(exact.id, "Group25"), exactKey = randomUUID();
  const retries = await Promise.all([add(exactReview, "staff", exactKey), add(exactReview, "staff", exactKey)]); assert.ok(retries.every(r => r.statusCode === 200)); assert.deepEqual(retries[0].json(), retries[1].json()); assert.equal(await members(exact.id), 25);
  expectError(await add(exactReview, "staff", randomUUID()), 409, "SELECTION_CHANGED");
  pass("Late ledger failure rolls back all 400 members/audit/version; concurrent scopes and repeated exact responses are safe");

  const unapproved = await ok<ImportPreview>(request("staff", "/api/v1/imports/stage", await workbook([["ML1AcceptedBaseline", "DeclaredFictional", "", "", school.code, 2, "Continuing", course.code]])));
  const baselineResult = await ok<ImportResult>(request("staff", `/api/v1/imports/${unapproved.id}/confirm`, { hash: unapproved.hash, confirm: true }));
  const baselinePerson = baselineResult.items[0].id;
  await ok(request("coordinator", `/api/v1/continuing-rosters/${baselineResult.continuingRosterId}/decision`, { expectedRevision: 0, decision: "accepted", effectiveOn: day, issuer: "Declared fictional committee", reviewed: true, ...evidence }));
  const records = await ok<{ items: { id: string }[] }>(request("staff", `/api/v1/scholars/${baselinePerson}/academic-records`));
  if (!records.items.length) await ok(request("staff", `/api/v1/scholars/${baselinePerson}/academic-records`, { academicYearId: year.id, schoolId: school.id, courseId: course.id, yearLevel: "2", ...evidence }));
  const baselineDraft = await createDraft("Fictional accepted Continuing preparation"), baselineReview = await review(baselineDraft.id, "ML1AcceptedBaseline"); assert.equal(baselineReview.selectedAddable, 1);
  await root.query("CREATE TRIGGER fail_ml1_baseline BEFORE INSERT ON masterlist_commands FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Declared baseline rollback probe'");
  try { assert.equal((await add(baselineReview)).statusCode, 500); assert.equal(Number((await root.query<RowDataPacket[]>("SELECT COUNT(*) n FROM scholarship_records WHERE scholar_id=?", [baselinePerson]))[0][0].n), 0); }
  finally { await root.query("DROP TRIGGER fail_ml1_baseline"); }
  await ok(add(baselineReview));
  const [[continuingAnnual]] = await root.query<RowDataPacket[]>("SELECT status,operational_status FROM scholarship_records WHERE scholar_id=?", [baselinePerson]); assert.equal(continuingAnnual.status, "continuing"); assert.equal(continuingAnnual.operational_status, null);
  const incomplete = await ok<{ id: string }>(request("staff", "/api/v1/scholars", { expectedVersion: 0, reason: evidence.reason, fields: { firstName: "Blocked", lastName: "ML1Ineligible", academicYearId: year.id, contact: {} } }));
  const blocked = await review(staleDraft.id, "ML1Ineligible"); assert.deepEqual(blocked.counts, { matching: 1, eligible: 0, alreadyOnDraft: 0, activated: 0, blocked: 1 }); assert.equal(blocked.canAdd, false);
  await ok(request("staff", `/api/v1/scholars/${incomplete.id}/academic-records`, { academicYearId: otherYear.id, schoolId: school.id, courseId: course.id, yearLevel: "4", ...evidence }));
  const stillBlocked = await review(staleDraft.id, "ML1Ineligible"); assert.equal(stillBlocked.items[0].category, "blocked"); assert.ok(stillBlocked.items[0].reasons.some(r => r.includes("draft academic year")));
  pass("Accepted Continuing annual preparation and its rollback preserve admission meaning; incomplete/other-year evidence remains blocked");

  const transition = async (id: string, action: string, role: string) => ok<{ id: string; version: number }>(request(role, `/api/v1/masterlists/${id}/${action}`, { expectedVersion: await version(id), ...evidence, ...(action === "publish" ? { effectiveOn: day } : {}) }));
  const prepareBoundary = async (status: number) => { const d = await createDraft("Fictional early conflict boundary " + status); await ok(add(await review(d.id, "Group25"))); for (const action of ["submit-verification", "submit-approval", "approve"].slice(0, status)) await transition(d.id, action, action === "approve" ? "coordinator" : "staff"); return d; };
  const boundaries = [await prepareBoundary(0), await prepareBoundary(1), await prepareBoundary(2), await prepareBoundary(3)];
  await ok(request("staff", `/api/v1/masterlists/${pageDraft.id}/entries`, { action: "refresh", expectedVersion: await version(pageDraft.id), scholarId: importedResult.items[1].id, awardNumber: null, ...evidence }));
  await transition(pageDraft.id, "submit-verification", "staff"); await transition(pageDraft.id, "submit-approval", "staff");
  expectError(await request("staff", `/api/v1/masterlists/${pageDraft.id}/approve`, { expectedVersion: await version(pageDraft.id), ...evidence }), 403, "PERMISSION_DENIED");
  await transition(pageDraft.id, "approve", "coordinator"); await transition(pageDraft.id, "publish", "coordinator");
  for (const [n, action] of ["submit-verification", "submit-approval", "approve", "publish"].entries()) {
    expectError(await request(n < 2 ? "staff" : "coordinator", `/api/v1/masterlists/${boundaries[n].id}/${action}`, { expectedVersion: await version(boundaries[n].id), ...evidence, ...(action === "publish" ? { effectiveOn: day } : {}) }), 422, "CANDIDATE_INVALID");
    assert.equal(await members(boundaries[n].id), 25);
  }
  const conflicts = await ok<{ total: number; items: object[] }>(request("staff", `/api/v1/masterlists/${boundaries[3].id}/activation-conflicts?offset=0&limit=10`)); assert.equal(conflicts.total, 25); assert.equal(conflicts.items.length, 10);
  const activatedDraft = await createDraft("Fictional clean activation scope"), current = await review(activatedDraft.id); assert.deepEqual(current.counts, { matching: 835, eligible: 810, alreadyOnDraft: 0, activated: 25, blocked: 0 });
  expectError(await request("staff", `/api/v1/masterlists/${activatedDraft.id}/entries`, { action: "add", expectedVersion: 1, scholarId: importedResult.items[0].id, awardNumber: null, ...evidence }), 422, "CANDIDATE_INVALID");
  const membership = await review(pageDraft.id).then(() => null, e => e); assert.ok(membership);
  assert.equal(Number((await root.query<RowDataPacket[]>("SELECT COUNT(*) n FROM masterlist_activations"))[0][0].n), 25);
  assert.equal(Number((await root.query<RowDataPacket[]>("SELECT COUNT(*) n FROM payment_records"))[0][0].n), 0);
  pass("Already-activated candidates are blocked at add, submission, approval and publish; original official membership survives");

  const output = process.env.ML1_EVIDENCE_DIR;
  if (output) { await mkdir(output, { recursive: true }); await writeFile(resolve(output, "selection-integration.json"), JSON.stringify({ passed: true, scenarios: passed, measurements, ownedDatabase: database, classifiedImportedPeople: 835, mutationsOnlyOnOwnedTarget: true }, null, 2)); }
  console.log(`All ${passed} ML-1 atomic-selection scenario groups passed on a newly owned disposable schema.`);
  if (process.argv.includes("--browser")) {
    const fixture = buildApp(loadConfig({ APP_ENV: "test", PORT: "3026", APP_ORIGIN: origin }), { database: db, clientRoot: resolve("dist/client") });
    let stop: () => void = () => {}; const finished = new Promise<void>(resolve => { stop = resolve; });
    fixture.get("/__fixture/stop", async () => { setTimeout(stop, 50); return { stopping: true }; });
    await fixture.listen({ host: "127.0.0.1", port: 3026 });
    if (output) await writeFile(resolve(output, "browser-fixture.json"), JSON.stringify({ origin, database, emptyDraft: activatedDraft.id, conflictDraft: boundaries[3].id, official: pageDraft.id, fullDraft: full.id, matching: 835, eligible: 810, activated: 25 }, null, 2));
    console.log("Owned fictional ML-1 browser fixture ready at 127.0.0.1:3026."); await finished; await fixture.close();
  }
} finally {
  if (app) await app.close(); if (runtime) await runtime.end(); if (root) await root.end();
  assert.match(database, /^ldss_ml1_test_\d+_[a-f0-9]{8}$/); assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser) await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``); await admin.end();
}
