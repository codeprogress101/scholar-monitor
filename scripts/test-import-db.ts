import "dotenv/config";
import { testDocumentBatches } from "./test-document-batch-scenarios.js";
import {testPriorBatchApproval,testPriorBatchCorrections} from "./test-prior-batch-scenarios.js";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { applyMigrations, grantAuthRuntime } from "./migration-lib.mjs";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { AuthService } from "../server/auth/service.js";
import { newToken } from "../server/auth/crypto.js";
import { AuthorizationService } from "../server/authorization/service.js";
import { today } from "../server/scholars/validation.js";
import { ImportService } from "../server/imports/service.js";
import { requirementState } from "../server/requirements/workflow-state.js";
import type { ImportPreview, ImportResult } from "../server/imports/model.js";
import { IMPORT_COLUMNS, SIMPLE_COLUMNS } from "../server/imports/model.js";
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_import_test_${suffix}`,
  runtimeUser = `ldss_test_${suffix}`,
  runtimePassword = newToken();
const browserPort=Number(process.env.LDSS_TEST_BROWSER_PORT??3003);
assert.ok(Number.isInteger(browserPort)&&browserPort>=3003&&browserPort<=3010,"Use an explicit isolated test port from 3003 through 3010");
const origin = `http://127.0.0.1:${browserPort}`,
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
  assert.equal((await applyMigrations(admin)).length, 55);
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
    pool: runtime,
    check: async () => "connected" as const,
    close: async () => {},
  };
  app = buildApp(
    loadConfig({ APP_ENV: "test", PORT: String(browserPort), APP_ORIGIN: origin }),
    { database: db },
  );
  if(process.argv.includes("--prior-debug"))app.addHook("onError",(r,_reply,error,done)=>{if(r.url.includes("historical-setup")||r.url.includes("ovr-batches"))console.error("Disposable prior-batch diagnostic:",error.code,error.message);done();});
  const accounts = new Map<
    string,
    { id: string; cookie: string; csrf: string }
  >();
  for (const role of [
    "system_admin",
    "staff",
    "coordinator",
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
        roles: [role],
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

  const day = today(),
    later = (n: number) =>
      new Date(Date.parse(day + "T00:00:00Z") + n * 86400000)
        .toISOString()
        .slice(0, 10);
  const year = await config("academic-years", {
    code: "IMPORT-YEAR",
    name: "Import year",
    startsOn: later(-60),
    endsOn: later(300),
  });
  const school = await config("schools", {
    code: "IMPORT-SCHOOL",
    name: "Import school",
  });
  await config("courses", { code: "IMPORT-COURSE", name: "Import course" });
  const ok = async <T>(promise: Promise<LightMyRequestResponse>) => {
    const r = await promise;
    assert.equal(r.statusCode, 200, r.body);
    return r.json<T>();
  };
  const workbook = async (rows: Record<string, string>[]) => {
    const w = new ExcelJS.Workbook(),
      s = w.addWorksheet("Scholars");
    s.addRow([...IMPORT_COLUMNS]);
    for (const r of rows) s.addRow(IMPORT_COLUMNS.map((c) => r[c] ?? ""));
    return Buffer.from(await w.xlsx.writeBuffer());
  };
  const first = {
    firstName: "Luna",
    lastName: "Santiago",
    academicYearCode: "IMPORT-YEAR",
    schoolCode: "IMPORT-SCHOOL",
    courseCode: "IMPORT-COURSE",
    yearLevel: "First year",
  };
  const second = {
    firstName: "Victor",
    lastName: "Ramos",
    academicYearCode: "IMPORT-YEAR",
  };
  const payload = async (rows: Record<string, string>[]) => ({
    fileName: "scholars.xlsx",
    base64: (await workbook(rows)).toString("base64"),
  });
  const stage = async (rows: Record<string, string>[]) =>
    ok<ImportPreview>(
      request("staff", "/api/v1/imports/stage", await payload(rows)),
    );
  const confirm = (p: ImportPreview, key = randomUUID()) =>
    request(
      "staff",
      `/api/v1/imports/${p.id}/confirm`,
      { hash: p.hash, confirm: true },
      key,
    );
  const count = async () => {
    const [r] = await root!.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS n FROM scholars",
    );
    return r[0].n as number;
  };
  const invalid = await stage([
    { ...first, birthDate: "2026-02-30" },
    { ...second, lastName: "", academicYearCode: "MISSING" },
  ]);
  assert.equal(invalid.ready, false);
  assert.ok(invalid.rows.every((r) => r.errors.length));
  expectError(await confirm(invalid), 409, "IMPORT_HAS_ERRORS");
  assert.equal(await count(), 0);
  const mixed = await stage([first, { ...second, lastName: "" }]);
  assert.equal(mixed.rows[0].errors.length, 0);
  expectError(await confirm(mixed), 409, "IMPORT_HAS_ERRORS");
  assert.equal(await count(), 0);
  const duplicate = await stage([first, { ...first }]);
  assert.ok(duplicate.rows.every((r) => r.warnings.length));
  expectError(await confirm(duplicate), 409, "IMPORT_HAS_ERRORS");
  pass(
    "Staging malformed/missing fields and within-file duplicate people reports row errors/warnings without production writes",
  );
  const data = await payload([first, second]),
    stageKey = randomUUID();
  const good = await ok<ImportPreview>(
    request("staff", "/api/v1/imports/stage", data, stageKey),
  );
  assert.equal(good.ready, true);
  assert.equal(await count(), 0);
  assert.deepEqual(
    await ok(request("staff", "/api/v1/imports/stage", data, stageKey)),
    good,
  );
  expectError(
    await request(
      "staff",
      "/api/v1/imports/stage",
      { ...data, fileName: "other.xlsx" },
      stageKey,
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  for (const role of ["system_admin", "unassigned"]) {
    expectError(
      await request(role, "/api/v1/imports/stage", data),
      403,
      "PERMISSION_DENIED",
    );
    expectError(
      await request(role, `/api/v1/imports/${good.id}`),
      403,
      "PERMISSION_DENIED",
    );
    expectError(
      await request(role, `/api/v1/imports/${good.id}/confirm`, {
        hash: good.hash,
        confirm: true,
      }),
      403,
      "PERMISSION_DENIED",
    );
  }
  expectError(
    await request("coordinator", `/api/v1/imports/${good.id}`),
    404,
    "IMPORT_NOT_FOUND",
  );
  expectError(
    await request("staff", `/api/v1/imports/${good.id}/confirm`, {
      hash: good.hash,
      confirm: false,
    }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request("staff", `/api/v1/imports/${good.id}/confirm`, {
      hash: good.hash,
      confirm: true,
      actorId: randomUUID(),
    }),
    422,
    "VALIDATION_FAILED",
  );
  const noCsrf = await app.inject({
    method: "POST",
    url: `/api/v1/imports/${good.id}/confirm`,
    headers: { origin, cookie: accounts.get("staff")!.cookie },
    payload: { hash: good.hash, confirm: true },
  });
  assert.equal(noCsrf.statusCode, 403);
  pass(
    "Preview is owner-private; roles, CSRF, explicit confirmation, forged actors and upload retry keys are enforced",
  );
  await admin.query(
    "CREATE TRIGGER fail_import_confirm BEFORE INSERT ON import_confirmations FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic final import failure'",
  );
  const key = randomUUID();
  try {
    assert.equal((await confirm(good, key)).statusCode, 500);
  } finally {
    await admin.query("DROP TRIGGER fail_import_confirm");
  }
  assert.equal(await count(), 0);
  for (const table of [
    "scholar_contacts",
    "scholar_identifiers",
    "academic_records",
    "scholar_commands",
    "academic_commands",
    "import_confirmations",
  ]) {
    const [r]: [RowDataPacket[], unknown] = await root.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS n FROM ${table}`,
    );
    assert.equal(r[0].n, 0, table);
  }
  const [audits] = await root.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM audit_logs WHERE event_type IN ('scholar.changed','academic.created')",
  );
  assert.equal(audits[0].n, 0);
  const saved = await ok<ImportResult>(confirm(good, key));
  assert.equal(saved.items.length, 2);
  assert.equal(await count(), 2);
  assert.deepEqual(await ok(confirm(good, key)), saved);
  const restarted = new ImportService(new AuthorizationService(runtime));
  assert.deepEqual(
    await restarted.confirm(
      accounts.get("staff")!.id,
      good.id,
      key,
      { hash: good.hash, confirm: true },
      randomUUID(),
    ),
    saved,
  );
  const [actorRows] = await root.query<RowDataPacket[]>(
    "SELECT actor_id FROM import_confirmations WHERE job_id=?",
    [good.id],
  );
  assert.equal(actorRows[0].actor_id, accounts.get("staff")!.id);
  pass(
    "Injected final failure rolls back every scholar, ID, contact, academic record and audit; exact retry and service restart return one durable result",
  );
  const existingDup = await stage([first]);
  assert.ok(
    existingDup.rows[0].warnings.some((w) =>
      w.includes(saved.items[0].scholarId),
    ),
  );
  const existingAcademic = {
    scholarId: saved.items[1].scholarId,
    academicYearCode: "IMPORT-YEAR",
    schoolCode: "IMPORT-SCHOOL",
    courseCode: "IMPORT-COURSE",
    yearLevel: "Second year",
  };
  const repeatedIds = await stage([existingAcademic, existingAcademic]);
  assert.ok(
    repeatedIds.rows.every((r) =>
      r.errors.some((e) => e.includes("Duplicate Scholar ID")),
    ),
  );
  const existing = await stage([existingAcademic]);
  assert.equal(existing.ready, true);
  await ok(confirm(existing));
  assert.equal(await count(), 2);
  assert.equal((await stage([existingAcademic])).ready, false);
  assert.equal(
    (await stage([{ ...existingAcademic, firstName: "Overwrite" }])).ready,
    false,
  );
  pass(
    "Existing Scholar IDs add only missing academic records; repeated IDs, possible existing people and overwrite attempts are blocked",
  );
  const race = await stage([
    {
      firstName: "Orion",
      lastName: "Mercado",
      academicYearCode: "IMPORT-YEAR",
    },
  ]);
  await ok(
    request("staff", "/api/v1/scholars", {
      expectedVersion: 0,
      reason: "Concurrent individual registration",
      fields: {
        firstName: "Orion",
        lastName: "Mercado",
        academicYearId: year.id,
        contact: {},
      },
    }),
  );
  expectError(await confirm(race), 409, "IMPORT_STALE");
  assert.equal(await count(), 3);
  const changing = await stage([
    {
      firstName: "Camila",
      lastName: "Reyes",
      academicYearCode: "IMPORT-YEAR",
      schoolCode: "IMPORT-SCHOOL",
      courseCode: "IMPORT-COURSE",
      yearLevel: "First year",
    },
  ]);
  await ok(
    request("system_admin", `/api/v1/configuration/schools/${school.id}`, {
      action: "archive",
      expectedVersion: school.version,
      reason: "Test reference change after preview",
    }),
  );
  expectError(await confirm(changing), 409, "IMPORT_STALE");
  assert.equal(await count(), 3);
  for (const sql of [
    "UPDATE import_jobs SET file_name=file_name WHERE 1=0",
    "DELETE FROM import_jobs WHERE 1=0",
    "UPDATE import_confirmations SET result=result WHERE 1=0",
    "DELETE FROM import_confirmations WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  pass(
    "Confirmation revalidates current duplicate/reference state; no partial import and runtime history stays append-only",
  );
  const final = await stage([
    {
      firstName: "Solange",
      lastName: "Villanueva",
      academicYearCode: "IMPORT-YEAR",
    },
  ]);
  const concurrent = await Promise.all([confirm(final), confirm(final)]);
  for (const r of concurrent) assert.equal(r.statusCode, 200, r.body);
  assert.deepEqual(concurrent[0].json(), concurrent[1].json());
  assert.equal(await count(), 4);
  pass("Concurrent confirmations serialize and create one set of records");
  const [finalCommand] = await admin.execute<RowDataPacket[]>(
    "SELECT command_id FROM import_confirmations WHERE job_id=?",
    [final.id],
  );
  expectError(
    await confirm(good, finalCommand[0].command_id),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  expectError(await confirm(final, key), 409, "IDEMPOTENCY_CONFLICT");
  const repeated = await Promise.all([
    confirm(good, key),
    confirm(good, key),
    confirm(good, key),
  ]);
  for (const response of repeated) {
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json(), saved);
  }
  pass(
    "F32 completed imports reject cross-job retry keys while simultaneous exact retries preserve the original result",
  );
  const simpleSchool = await config("schools", { code: "SIMPLE-SCHOOL", name: "Simple Training College" });
  const working = await config("settings", { code: "LDSS_WORKING_ACADEMIC_YEAR", name: "Working year", valueType: "text", value: year.id });
  const simpleWorkbook = async (rows: (string | number)[][]) => {
    const w = new ExcelJS.Workbook(), s = w.addWorksheet("Any worksheet name");
    s.addRow(SIMPLE_COLUMNS.map(h => ` ${h.toUpperCase()} `));
    rows.forEach(r => s.addRow(r));
    return Buffer.from(await w.xlsx.writeBuffer());
  };
  const simplePayload = async (rows: (string | number)[][]) => ({ fileName: "simple.xlsx", base64: (await simpleWorkbook(rows)).toString("base64") });
  const simpleData = await simplePayload([
    ["IntakeAlpha", "One", "", "", "Simple Training College", 2, "OLD SCHOLAR", ""],
    ["IntakeBeta", "Two", "", "", "SIMPLE-SCHOOL", "First Year", "NEW SCHOLAR", ""],
    ["IntakeGamma", "Three", "", "", "Simple Training College", "3rd Year", "Continuing", "Import course"],
  ]);
  const simplePreview = await ok<ImportPreview>(request("staff", "/api/v1/imports/stage", simpleData));
  assert.equal(simplePreview.ready, true, JSON.stringify(simplePreview));
  assert.equal(simplePreview.workingYear, "IMPORT-YEAR");
  assert.equal(simplePreview.rows[0].intake?.classification, "continuing");
  assert.equal(simplePreview.rows[1].intake?.yearLevel, "1");
  assert.ok(simplePreview.rows[0].notices?.some(n => n.includes("Course not recorded")));
  const beforeSimple = await count();
  await root.query("CREATE TRIGGER fail_simple_confirmation BEFORE INSERT ON import_confirmations FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Test rollback'");
  assert.equal((await confirm(simplePreview)).statusCode, 500);
  assert.equal(await count(), beforeSimple);
  const [[intakeCount]] = await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM scholar_intakes");
  assert.equal(intakeCount.n, 0);
  await root.query("DROP TRIGGER fail_simple_confirmation");
  const simpleResult = await ok<ImportResult>(confirm(simplePreview));
  assert.ok(simpleResult.continuingRosterId);
  assert.deepEqual(await ok(confirm(simplePreview)), simpleResult);
  const [pendingEntries] = await root.execute<RowDataPacket[]>("SELECT scholar_id FROM continuing_roster_entries WHERE batch_id=?", [simpleResult.continuingRosterId]);
  assert.equal(pendingEntries.length, 2);
  const [[decisions]] = await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM continuing_roster_decisions");
  assert.equal(decisions.n, 0);
  const incompleteId = simpleResult.items[1].id;
  const incomplete = await ok<import("../server/scholars/model.js").ScholarDetail>(request("staff", `/api/v1/scholars/${incompleteId}`));
  assert.equal(incomplete.placement?.provisional, true); assert.equal(incomplete.placement?.course, null); assert.equal(incomplete.placement?.school, "Simple Training College");
  const [[annual]] = await root.execute<RowDataPacket[]>("SELECT id,status,operational_status FROM scholarship_records WHERE scholar_id=?", [incompleteId]);
  assert.equal(annual.status, "applicant"); assert.equal(annual.operational_status, null);
  const [[events]] = await root.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM qualification_events WHERE scholarship_id=? AND action<>'create'", [annual.id]);
  assert.equal(events.n, 0);
  const rejectedValidation = await request("coordinator", `/api/v1/scholarships/${annual.id}/qualification/validate`, { expectedVersion: 1, effectiveOn: day, priorQualificationConfirmed: true });
  assert.equal(rejectedValidation.statusCode, 409, rejectedValidation.body);
  assert.equal(rejectedValidation.json().error.code, "ACADEMIC_RECORD_REQUIRED");
  const [[stillIncomplete]] = await root.execute<RowDataPacket[]>("SELECT status FROM scholarship_records WHERE id=?", [annual.id]);
  assert.equal(stillIncomplete.status, "applicant");
  const ambiguousSchool = await config("schools", { code: "AMBIGUOUS-A", name: "Ambiguous College" });
  await config("schools", { code: "AMBIGUOUS-B", name: "Ambiguous College" });
  const ambiguousData = await simplePayload([["AmbiguousPerson", "Six", "", "", "Ambiguous College", "First Year", "New", ""]]);
  const ambiguous = await ok<ImportPreview>(request("staff", "/api/v1/imports/stage", ambiguousData));
  assert.equal(ambiguous.ready, false); assert.ok(ambiguous.rows[0].errors.some(e => e.includes("ambiguous")));
  const mappedAmbiguous = await ok<ImportPreview>(request("staff", "/api/v1/imports/stage", { ...ambiguousData, mappings: [{ kind: "schools", supplied: "Ambiguous College", id: ambiguousSchool.id }] }));
  assert.equal(mappedAmbiguous.ready, true);
  const secondUpload = await ok<ImportPreview>(request("staff", "/api/v1/imports/stage", simpleData)); assert.equal(secondUpload.ready, false); assert.ok(secondUpload.rows.some(r => r.warnings.length));
  const unresolvedData = await simplePayload([["ResolveOnly", "Four", "", "", "Unknown college", 1, "New", "Typed Import Degree"], ["ResolveAgain", "Five", "", "", "Unknown college", 1, "New", ""]]);
  const unmatched = await ok<ImportPreview>(request("staff", "/api/v1/imports/stage", unresolvedData));
  assert.equal(unmatched.unresolved?.length, 0); assert.equal(unmatched.ready, true);
  assert.ok(unmatched.rows[0].notices?.some(n=>n.includes("will be saved")));
  const typedResult=await ok<ImportResult>(confirm(unmatched));
  assert.equal(typedResult.items.length,2);
  assert.deepEqual(await ok(confirm(unmatched)),typedResult);
  const [[typedSchool]]=await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM schools WHERE name='Unknown college'");
  assert.equal(typedSchool.n,1);
  const resolved = await ok<ImportPreview>(request("staff", "/api/v1/imports/stage", { ...await simplePayload([["MappedNewPerson", "Seven", "", "", "Unknown college", 1, "New", ""]]), mappings: [{ kind: "schools", supplied: "Unknown college", id: simpleSchool.id }] }));
  assert.equal(resolved.ready, true);
  await root.execute("UPDATE system_settings SET version=version+1 WHERE id=?", [working.id]);
  expectError(await confirm(resolved), 409, "IMPORT_STALE");
  const registry = await ok<import("../server/scholars/model.js").ScholarList>(request("staff", "/api/v1/scholars?sort=yearLevel&direction=asc&limit=1"));
  assert.equal(registry.items[0].placement?.yearLevel, "1");
  const nextPage = await ok<import("../server/scholars/model.js").ScholarList>(request("staff", "/api/v1/scholars?sort=yearLevel&direction=asc&limit=1&offset=1"));
  assert.notEqual(registry.items[0].id, nextPage.items[0].id);
  const bySchool = await ok<import("../server/scholars/model.js").ScholarList>(request("staff", "/api/v1/scholars?sort=school&direction=desc"));
  assert.equal(bySchool.items.at(-1)?.placement?.school, null);
  const eligibility = await ok<import("../server/scholars/registry-eligibility.js").RegistryEligibility>(request("staff", `/api/v1/scholars/eligibility?ids=${incompleteId}`));
  assert.equal(eligibility.periodId, null); assert.equal(eligibility.periods.length, 0);
  expectError(await request("system_admin", `/api/v1/scholars/eligibility?ids=${incompleteId}`), 403, "PERMISSION_DENIED");
  pass("Simple import preserves incomplete intake, creates New validation and pending Continuing roster atomically; reference resolution, retries, working-year fencing, registry sorting and no-period permissions pass");
  {
    const approvedSelection = { reference: "Synthetic approved AY list", effectiveOn: day };
    const approvedPayload = { ...await simplePayload([
      ["ApprovedIntake", "Freshperson", "", "", "SIMPLE-SCHOOL", 1, "NEW SCHOLAR", "Import course"],
      ["ApprovedIntake", "Returningperson", "", "", "SIMPLE-SCHOOL", 2, "OLD SCHOLAR", "Import course"],
    ]), approvedSelection };
    expectError(await request("staff", "/api/v1/imports/stage", approvedPayload), 403, "PERMISSION_DENIED");
    expectError(await request("system_admin", "/api/v1/imports/stage", approvedPayload), 403, "PERMISSION_DENIED");
    const stageKey = randomUUID();
    const approvedPreview = await ok<ImportPreview>(request("coordinator", "/api/v1/imports/stage", approvedPayload, stageKey));
    assert.equal(approvedPreview.ready, true);
    assert.deepEqual(approvedPreview.rows[0].approvedSelection, approvedSelection);
    expectError(await request("coordinator", "/api/v1/imports/stage", { ...approvedPayload, approvedSelection: { ...approvedSelection, reference: "Different approval" } }, stageKey), 409, "IDEMPOTENCY_CONFLICT");
    const missingCourse = await ok<ImportPreview>(request("coordinator", "/api/v1/imports/stage", { ...await simplePayload([["IncompleteApproved", "Person", "", "", "SIMPLE-SCHOOL", 2, "Old", ""]]), approvedSelection }));
    assert.equal(missingCourse.ready, true);
    assert.equal(missingCourse.rows[0].coursePending, true);
    const invalidLevel=await ok<ImportPreview>(request("coordinator","/api/v1/imports/stage",{...await simplePayload([["InvalidLevel","Fictional","","","SIMPLE-SCHOOL","Third\nYear","New",""]]),approvedSelection}));
    assert.equal(invalidLevel.ready,false);assert.ok(invalidLevel.rows[0].errors.some(e=>e.startsWith("Year Level:")));
    expectError(await request("coordinator", `/api/v1/imports/${missingCourse.id}/confirm`, {hash:missingCourse.hash,confirm:true}),422,"COURSE_PENDING_CONFIRMATION_REQUIRED");
    const pendingKey=randomUUID();
    const pendingBody={hash:missingCourse.hash,confirm:true,coursePendingConfirmed:true};
    await root.query("CREATE TRIGGER fail_pending_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='academic.course_pending' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Injected course pending audit failure'; END IF; END");
    const beforePending=await count();
    assert.equal((await request("coordinator", `/api/v1/imports/${missingCourse.id}/confirm`,pendingBody,pendingKey)).statusCode,500);
    assert.equal(await count(),beforePending);
    await root.query("DROP TRIGGER fail_pending_audit");
    const pendingSaved=await ok<ImportResult>(request("coordinator", `/api/v1/imports/${missingCourse.id}/confirm`,pendingBody,pendingKey));
    assert.equal(pendingSaved.coursePendingCount,1);assert.equal(pendingSaved.selectedCount,1);
    assert.deepEqual(await ok(request("coordinator", `/api/v1/imports/${missingCourse.id}/confirm`,pendingBody,pendingKey)),pendingSaved);
    const [[partial]]=await root.execute<RowDataPacket[]>("SELECT course_id,course_code,course_name,course_pending_exception_id FROM academic_records WHERE id=?",[pendingSaved.items[0].academicRecordId!]);
    assert.equal(partial.course_id,null);assert.equal(partial.course_name,null);assert.ok(partial.course_pending_exception_id);
    pass("Approved missing-course import requires explicit confirmation, records partial placement and selection, rolls back audit failure and retries exactly");
    const pendingPerson=pendingSaved.items[0];
    const evidence={reason:"Synthetic pending-course lifecycle",reference:"Synthetic approved import"};
    const draft=await ok<{id:string;version:number}>(request("staff","/api/v1/masterlists",{academicYearId:year.id,title:"Course pending lifecycle",...evidence}));
    await ok(request("staff",`/api/v1/masterlists/${draft.id}/entries`,{action:"add",expectedVersion:1,scholarId:pendingPerson.id,awardNumber:null,...evidence}));
    for(const [action,expectedVersion,role] of [["submit-verification",2,"staff"],["submit-approval",3,"staff"],["approve",4,"coordinator"],["publish",5,"coordinator"],["lock",6,"coordinator"]] as const) await ok(request(role,`/api/v1/masterlists/${draft.id}/${action}`,{expectedVersion,...evidence,...(action==="publish"?{effectiveOn:day}:{})}));
    const [[original]]=await root.execute<RowDataPacket[]>("SELECT snapshot,snapshot_hash FROM masterlist_publications WHERE masterlist_id=?",[draft.id]);
    assert.ok(JSON.parse(original.snapshot).entries[0].snapshot.placement.coursePending);
    const [[realCourse]]=await root.query<RowDataPacket[]>("SELECT id FROM courses WHERE code='IMPORT-COURSE'");
    const proposal=await ok<{amendmentId:string}>(request("staff",`/api/v1/masterlists/${draft.id}/amendments`,{expectedVersion:7,scholarId:pendingPerson.id,kind:"course_completion",courseId:realCourse.id,effectiveOn:day,...evidence}));
    await ok(request("coordinator",`/api/v1/masterlist-amendments/${proposal.amendmentId}/approve`,{...evidence}));
    const amended=await ok<{masterlistId:string}>(request("coordinator",`/api/v1/masterlist-amendments/${proposal.amendmentId}/publish`,{...evidence}));
    const [[preserved]]=await root.execute<RowDataPacket[]>("SELECT snapshot,snapshot_hash FROM masterlist_publications WHERE masterlist_id=?",[draft.id]);
    assert.deepEqual(preserved,original);
    const [[completed]]=await root.execute<RowDataPacket[]>("SELECT action FROM course_pending_events WHERE exception_id=? ORDER BY revision DESC LIMIT 1",[partial.course_pending_exception_id]);assert.equal(completed.action,"completed");
    assert.ok(amended.masterlistId);
    pass("Course-pending member publishes with explicit provenance; reviewed course-completion amendment preserves original official bytes");

    const confirmationKey = randomUUID();
    const confirmApproved = () => request("coordinator", `/api/v1/imports/${approvedPreview.id}/confirm`, { hash: approvedPreview.hash, confirm: true }, confirmationKey);
    const countBefore = await count();
    const [[priorBaseline]] = await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM participations");
    await root.query("CREATE TRIGGER fail_approved_confirmation BEFORE INSERT ON import_confirmations FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Test approved rollback'");
    assert.equal((await confirmApproved()).statusCode, 500);
    assert.equal(await count(), countBefore);
    const [[afterBaseline]] = await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM participations");
    assert.equal(afterBaseline.n, priorBaseline.n);
    await root.query("DROP TRIGGER fail_approved_confirmation");
    const selected = await ok<ImportResult>(confirmApproved());
    assert.equal(selected.selectedCount, 2);
    assert.deepEqual(await ok(confirmApproved()), selected);
    assert.equal(await count(), countBefore + 2);
    for (const item of selected.items) {
      const [annualRows]: [RowDataPacket[], unknown] = await root.execute<RowDataPacket[]>("SELECT id,status,version,operational_status FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?", [item.id, year.id]);
      const approvedAnnual: RowDataPacket = annualRows[0];
      assert.equal(approvedAnnual.status, "selected"); assert.equal(approvedAnnual.version, 3); assert.equal(approvedAnnual.operational_status, null);
      const [approvedEvents]: [RowDataPacket[], unknown] = await root.execute<RowDataPacket[]>("SELECT action,reference_text FROM qualification_events WHERE scholarship_id=? ORDER BY resulting_version", [approvedAnnual.id]);
      assert.deepEqual(approvedEvents.map(e => e.action), ["create", "validate", "select"]);
      assert.ok(approvedEvents.every(e => e.reference_text === approvedSelection.reference));
    }
    const [[decision]] = await root.execute<RowDataPacket[]>("SELECT decision FROM continuing_roster_decisions WHERE batch_id=?", [selected.continuingRosterId!]);
    assert.equal(decision.decision, "accepted");
    pass("Coordinator approved-list import selects New and Old scholars with audited provenance; Staff/Admin denied, incomplete records blocked, rollback and retry preserved");
  }
  {
    const semester=await config("semesters",{code:"IMPORT-CURRENT",name:"Current import semester",academicYearId:year.id,startsOn:later(-20),endsOn:later(120)});
    const [[workingCalendar]]=await root.query<RowDataPacket[]>("SELECT version FROM system_settings WHERE code='LDSS_WORKING_ACADEMIC_YEAR'");
    const historical=await ok<{yearId:string;semesterId:string}>(request("system_admin","/api/v1/configuration/historical-calendar",{workingYearId:year.id,expectedWorkingYearVersion:year.version,expectedSettingVersion:workingCalendar.version,year:{code:"IMPORT-PRIOR-YEAR",name:"Prior import year",startsOn:later(-420),endsOn:later(-61)},semester:{code:"IMPORT-PREVIOUS",name:"Previous completed import semester",startsOn:later(-240),endsOn:later(-61),termKind:"second"},reason:"Reviewed synthetic cross-year COG coverage",reference:"TEST-HISTORICAL-CALENDAR",reviewed:true}));
    const previous={id:historical.semesterId,name:"Previous completed import semester",version:1};
    for(const [code,documentKind] of [["IMPORT-COR","enrollment"],["IMPORT-COG","grades"]]) await ok(request("system_admin","/api/v1/requirement-definitions",{action:"create",code,expectedVersion:0,reason:"Synthetic import receipt policy",reference:"TEST-POLICY",fields:{documentKind,name:code,instructions:"Synthetic physical paper",appliesTo:"semester",semesterId:semester.id,effectiveFrom:later(-20),effectiveUntil:null}}));
    const setupPath="/api/v1/continuing-rosters/00000000-0000-4000-8000-000000000001/semester-setup";
    const options=await ok<{definitions:{id:string;code:string}[]}>(request("coordinator",`${setupPath}?semesterId=${semester.id}`));
    const setup=await ok<{id:string}>(request("coordinator",setupPath,{semesterId:semester.id,expectedSemesterVersion:semester.version,policyDate:day,predecessorSemesterId:previous.id,coverageReason:"Synthetic reviewed preceding semester",corDefinitionVersionId:options.definitions.find(d=>d.code==="IMPORT-COR")!.id,cogDefinitionVersionId:options.definitions.find(d=>d.code==="IMPORT-COG")!.id,issuer:"Synthetic scholarship committee",reference:"TEST-SETUP",sourceReference:"Synthetic semester documents",reviewed:true}));
    const payload={...await simplePayload([["ReceiptImport", "NewPerson", "", "", "SIMPLE-SCHOOL", 2, "New", ""],["ReceiptImport", "ContinuingPerson", "", "", "SIMPLE-SCHOOL", 3, "Continuing", "Import course"]]),approvedSelection:{reference:"Batch 1 verified approval",effectiveOn:day},receipts:{periodId:semester.id,cor:true,cog:true}};
    const disabled=await ok<ImportPreview>(request("coordinator","/api/v1/imports/stage",payload));assert.equal(disabled.ready,false);assert.ok(disabled.rows.every(r=>r.errors.some(e=>e.startsWith("Document receipts:"))));
    assert.equal(disabled.receiptBlockers?.length,1);assert.deepEqual(disabled.receiptBlockers?.[0].rows,[2,3]);
    await ok(request("coordinator",setupPath+"/availability",{scopeId:setup.id,expectedRevision:1,mode:"enabled",expectedSemesterVersion:semester.version,expectedPredecessorVersion:previous.version,reviewed:true}));
    const preview=await ok<ImportPreview>(request("coordinator","/api/v1/imports/stage",payload));assert.equal(preview.ready,true,JSON.stringify(preview.rows));
    assert.equal(preview.rows[0].receiptContext?.cog,previous.name);
    assert.deepEqual(preview.receiptGroups,[{cor:semester.name,cog:previous.name,corCount:2,cogCount:2,exemptCount:0}]);
    const key=randomUUID(),body={hash:preview.hash,confirm:true,coursePendingConfirmed:true,receiptsConfirmed:true};
    expectError(await request("coordinator",`/api/v1/imports/${preview.id}/confirm`,{...body,receiptsConfirmed:undefined}),422,"RECEIPT_CONFIRMATION_REQUIRED");
    const before=await count();
    await root.query("CREATE TRIGGER fail_import_receipt_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='requirements.received' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Injected receipt audit failure'; END IF; END");
    const attempt=await request("coordinator",`/api/v1/imports/${preview.id}/confirm`,body,key);
    assert.equal(attempt.statusCode,500,attempt.body);assert.equal(await count(),before);
    await root.query("DROP TRIGGER fail_import_receipt_audit");
    const result=await ok<ImportResult>(request("coordinator",`/api/v1/imports/${preview.id}/confirm`,body,key));assert.equal(result.receivedCount,4);assert.equal(result.selectedCount,2);
    assert.deepEqual(await ok(request("coordinator",`/api/v1/imports/${preview.id}/confirm`,body,key)),result);
    const [papers]=await root.execute<RowDataPacket[]>("SELECT i.id,r.id AS receipt_id,cov.document_kind,cov.coverage_semester_id,cov.scholar_semester_id FROM requirement_instances i JOIN requirement_receipts r ON r.instance_id=i.id JOIN requirement_coverage cov ON cov.requirement_instance_id=i.id JOIN scholar_semesters ss ON ss.id=cov.scholar_semester_id WHERE ss.scholar_id IN (?,?)",result.items.map(i=>i.id));
    assert.equal(papers.length,4);assert.ok(papers.every(p=>p.receipt_id));
    assert.ok(papers.every(p=>p.coverage_semester_id===(p.document_kind==="cor"?semester.id:previous.id)));
    const pendingId=result.items[0].id;
    const [[corPaper]]=await root.execute<RowDataPacket[]>("SELECT i.id FROM requirement_instances i JOIN requirement_coverage c ON c.requirement_instance_id=i.id JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id WHERE ss.scholar_id=? AND c.document_kind='cor'",[pendingId]);
    const context=await ok<import("../server/requirements/workflow-model.js").VerificationContext>(request("staff",`/api/v1/requirement-instances/${corPaper.id}/verification-context`));assert.ok(context.coursePending);assert.equal(context.courseId,null);
    const document={scholarId:context.scholarId,scholarVersion:context.scholarVersion,academicYearId:context.academicYearId,semesterId:context.semesterId,schoolId:context.schoolId,courseId:null,academicVersion:context.academicVersion,definitionVersionId:context.definitionVersionId,coverageId:context.coverageId,semesterRevision:context.semesterRevision,coursePendingId:context.coursePending!.id,coursePendingRevision:context.coursePending!.revision};
    const verify={action:"verify",expectedVersion:1,reason:"Physical paper reviewed with course deferred",reference:"TEST-COR-PAPER",remarks:null,document,attestation:"course-comparison-deferred"};
    expectError(await request("staff",`/api/v1/requirement-instances/${corPaper.id}/verify`,{...verify,attestation:"all-five-checked"}),409,"COURSE_PENDING_REVIEW_REQUIRED");
    await ok(request("staff",`/api/v1/requirement-instances/${corPaper.id}/verify`,verify));
    const [[event]]=await root.execute<RowDataPacket[]>("SELECT details FROM requirement_workflow_events WHERE instance_id=? AND action='verify'",[corPaper.id]);const detail=JSON.parse(event.details);assert.equal(detail.checks.placement,false);assert.equal(detail.attestation,"course-comparison-deferred");
    pass("Mixed import receives COR/COG atomically with actual coverage, explicit attestations, no auto verification, audit rollback and exact retry; deferred COR check remains truthful");
    for(const kind of ["cor","cog"] as const){
      const onePayload={...await simplePayload([[`Only${kind}`,randomBytes(12).toString("hex"),"","","SIMPLE-SCHOOL",2,"Old",""]]),approvedSelection:payload.approvedSelection,receipts:{periodId:semester.id,cor:kind==="cor",cog:kind==="cog"}};
      const one=await ok<ImportPreview>(request("coordinator","/api/v1/imports/stage",onePayload));assert.equal(one.ready,true,JSON.stringify(one.rows));
      const saved=await ok<ImportResult>(request("coordinator",`/api/v1/imports/${one.id}/confirm`,{hash:one.hash,confirm:true,coursePendingConfirmed:true,receiptsConfirmed:true}));assert.equal(saved.receivedCount,1);
    }
    const volumeCount=process.argv.includes("--prior-quick")?3:835,pendingCount=Math.min(380,volumeCount);
    const volumePayload={...await simplePayload(Array.from({length:volumeCount},(_,i)=>[`ReceiptVolume${i}`,randomBytes(12).toString("hex"),"","","SIMPLE-SCHOOL",i===0?1:2,i%2?"Old":"New",i<380?"":"Import course"])),approvedSelection:payload.approvedSelection,receipts:{periodId:semester.id,cor:true,cog:true}};
    const start=performance.now(),volume=await ok<ImportPreview>(request("coordinator","/api/v1/imports/stage",volumePayload));
    assert.equal(volume.ready,true,JSON.stringify(volume.rows.filter(r=>r.errors.length||r.warnings.length).slice(0,2)));assert.equal(volume.receiptGroups?.[0].cogCount,volumeCount);assert.equal(volume.receiptGroups?.[0].exemptCount,0);
    const stagedMs=Math.round(performance.now()-start),volumeKey=randomUUID(),volumeBody={hash:volume.hash,confirm:true,coursePendingConfirmed:true,receiptsConfirmed:true},confirmStart=performance.now();
    const savedVolume=await ok<ImportResult>(request("coordinator",`/api/v1/imports/${volume.id}/confirm`,volumeBody,volumeKey));
    const confirmMs=Math.round(performance.now()-confirmStart);assert.equal(savedVolume.selectedCount,volumeCount);assert.equal(savedVolume.coursePendingCount,pendingCount);assert.equal(savedVolume.receivedCount,volumeCount*2);assert.deepEqual(await ok(request("coordinator",`/api/v1/imports/${volume.id}/confirm`,volumeBody,volumeKey)),savedVolume);
    const [volumePapers]=await root.execute<RowDataPacket[]>("SELECT i.id FROM requirement_instances i JOIN requirement_receipts r ON r.instance_id=i.id JOIN requirement_checklists c ON c.id=i.checklist_id JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id JOIN scholars s ON s.id=ss.scholar_id WHERE s.last_name LIKE 'ReceiptVolume%'");assert.equal(volumePapers.length,volumeCount*2);
    const stateDb=await root.getConnection();try{for(const paper of [volumePapers[0],volumePapers.at(-1)!])assert.equal((await requirementState(stateDb,paper.id)).status,"submitted");}finally{stateDb.release();}
    pass(`${volumeCount}-row mixed approved import: ${pendingCount} Course pending, ${volumeCount*2} Submitted receipts, no inferred freshman exception, exact retry; stage=${stagedMs}ms confirm=${confirmMs}ms; COR-only and COG-only passed`);
    if(!process.argv.includes("--prior-quick"))await testDocumentBatches(request,root,volume.id,semester.id,day);
    if(!process.argv.includes("--prior-browser-ready")){
      await testPriorBatchApproval(request,root,volume.id,semester.id,day);
      await testPriorBatchCorrections(request,root,preview.id,semester.id,day);
    }else{
      assert.ok(process.argv.includes("--browser"),"Unreviewed browser preparation is only available with the disposable fixture server");
      console.log(`Browser fixture: ${volumeCount} imported scholars intentionally await prior batch approval; lifecycle assertions are reserved for the normal acceptance run.`);
    }
  }
  if (process.argv.includes("--large") || process.argv.includes("--large-approved")) {
    const approvedMode = process.argv.includes("--large-approved");
    const largeRole = approvedMode ? "coordinator" : "staff";
    const largeStart = performance.now();
    const largePayload = { ...await simplePayload(Array.from({ length: 1500 }, (_, i) =>
      [`VolumeSurname${i}`, `Synthetic${randomBytes(12).toString("hex")}`, "", "", "SIMPLE-SCHOOL", 2, "Old", "Import course"])), ...(approvedMode ? { approvedSelection: { reference: "Synthetic approved volume roster", effectiveOn: day } } : {}) };
    const largePreview = await ok<ImportPreview>(request(largeRole, "/api/v1/imports/stage", largePayload));
    const largeKey = randomUUID();
    const confirmLarge = () => request(largeRole, `/api/v1/imports/${largePreview.id}/confirm`, { hash: largePreview.hash, confirm: true }, largeKey);
    assert.equal(largePreview.rows.length, 1500);
    assert.equal(largePreview.ready, true, JSON.stringify(largePreview.rows.filter(r => r.errors.length || r.warnings.length).slice(0, 2)));
    const stageMs = Math.round(performance.now() - largeStart);
    const beforeLarge = await count();
    await root.query("CREATE TRIGGER fail_large_confirmation BEFORE INSERT ON import_confirmations FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Test rollback'");
    const rollbackStart = performance.now();
    assert.equal((await confirmLarge()).statusCode, 500);
    assert.equal(await count(), beforeLarge);
    const [[rolledBack]] = await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM scholars WHERE last_name LIKE 'VolumeSurname%'");
    assert.equal(rolledBack.n, 0);
    await root.query("DROP TRIGGER fail_large_confirmation");
    const rollbackMs = Math.round(performance.now() - rollbackStart);
    const confirmStart = performance.now();
    const largeResult = await ok<ImportResult>(confirmLarge());
    if (approvedMode) {
      assert.equal(largeResult.selectedCount, 1500);
      const [[selected]] = await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id WHERE s.last_name LIKE 'VolumeSurname%' AND r.status='selected' AND r.operational_status IS NULL");
      assert.equal(selected.n, 1500);
    }
    assert.equal(largeResult.items.length, 1500);
    assert.ok(largeResult.continuingRosterId);
    assert.ok(largeResult.items.every(i => i.academicRecordId));
    assert.equal(await count(), beforeLarge + 1500);
    const [[largeRoster]] = await root.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM continuing_roster_entries WHERE batch_id=?", [largeResult.continuingRosterId]);
    assert.equal(largeRoster.n, 1500);
    const confirmMs = Math.round(performance.now() - confirmStart);
    assert.deepEqual(await ok(confirmLarge()), largeResult);
    assert.equal(await count(), beforeLarge + 1500);
    pass(`1500-row ${approvedMode ? "approved" : "ordinary"} import: academic records and roster, full rollback and safe retry; stage=${stageMs}ms rollback=${rollbackMs}ms confirm=${confirmMs}ms`);
  }
  if (process.argv.includes("--browser")) {
    writeFileSync(
      "output/playwright/import-good.xlsx",
      await simpleWorkbook([["BrowserImport", "New", "", "", "Simple Training College", 1, "New", ""], ["BrowserImport", "Continuing", "", "", "Simple Training College", "2nd Year", "Old", ""]]),
    );
    writeFileSync(
      "output/playwright/import-bad.xlsx",
      await workbook([
        { firstName: "Browser", lastName: "", academicYearCode: "MISSING" },
      ]),
    );
    const fixture = buildApp(
        loadConfig({ APP_ENV: "test", PORT: String(browserPort), APP_ORIGIN: origin }),
      { database: db, clientRoot: resolve("dist/client") },
    );
    let stop: () => void = () => {};
    const finished = new Promise<void>((r) => {
      stop = r;
    });
    fixture.get("/__fixture/stop", async () => {
      setTimeout(stop, 50);
      return { stopping: true };
    });
      await fixture.listen({ host: "127.0.0.1", port: browserPort });
      console.log(`Disposable F27 fixture ready on port ${browserPort}.`);
    await finished;
    await fixture.close();
  }
  console.log(`All ${passed} F27 import scenario groups passed.`);
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_import_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
