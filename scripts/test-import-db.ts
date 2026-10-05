import "dotenv/config";
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
import type { ImportPreview, ImportResult } from "../server/imports/model.js";
import { IMPORT_COLUMNS } from "../server/imports/model.js";
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
const origin = "http://127.0.0.1:3003",
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
  assert.equal((await applyMigrations(admin)).length, 29);
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
    loadConfig({ APP_ENV: "test", PORT: "3003", APP_ORIGIN: origin }),
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
  if (process.argv.includes("--browser")) {
    writeFileSync(
      "output/playwright/import-good.xlsx",
      await workbook([
        {
          firstName: "Browser",
          lastName: "Import",
          academicYearCode: "IMPORT-YEAR",
        },
      ]),
    );
    writeFileSync(
      "output/playwright/import-bad.xlsx",
      await workbook([
        { firstName: "Browser", lastName: "", academicYearCode: "MISSING" },
      ]),
    );
    const fixture = buildApp(
      loadConfig({ APP_ENV: "test", PORT: "3003", APP_ORIGIN: origin }),
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
    await fixture.listen({ host: "127.0.0.1", port: 3003 });
    console.log("Disposable F27 fixture ready on port 3003.");
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
