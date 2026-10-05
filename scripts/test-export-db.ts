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

import ExcelJS from "exceljs";

import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_export_test_${suffix}`,
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
    code: "EXPORT-YEAR",
    name: "Export year",
    startsOn: later(-60),
    endsOn: later(300),
  });
  const otherYear = await config("academic-years", {
    code: "OTHER-YEAR",
    name: "Other year",
    startsOn: later(-400),
    endsOn: later(-100),
  });
  const ok = async <T>(promise: Promise<LightMyRequestResponse>) => {
    const r = await promise;
    assert.equal(r.statusCode, 200, r.body);
    return r.json<T>();
  };
  await ok(
    request("staff", "/api/v1/scholars", {
      expectedVersion: 0,
      reason: "Synthetic export test",
      fields: {
        firstName: "Formula",
        lastName: "=HYPERLINK(1)",
        academicYearId: year.id,
        birthDate: "2003-01-02",
        contact: {
          email: "private-export@example.invalid",
          phone: "09171234567",
          addressLine: "PRIVATE ADDRESS MARKER",
        },
      },
    }),
  );
  await ok(
    request("staff", "/api/v1/scholars", {
      expectedVersion: 0,
      reason: "Synthetic other year",
      fields: {
        firstName: "Different",
        lastName: "Elsewhere",
        academicYearId: otherYear.id,
        contact: {},
      },
    }),
  );
  const body = { academicYearId: year.id, q: "" },
    path = "/api/v1/exports/scholars",
    auditPath = "/api/v1/exports/audit";
  for (const role of ["system_admin", "unassigned"])
    expectError(await request(role, path, body), 403, "PERMISSION_DENIED");
  for (const role of ["staff", "coordinator", "unassigned"])
    expectError(
      await request(role, auditPath, { from: day, to: day }),
      403,
      "PERMISSION_DENIED",
    );
  assert.equal(
    (await app.inject({ method: "POST", url: path, payload: body })).statusCode,
    401,
  );
  expectError(
    await request("staff", path, { ...body, includeContacts: true }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request("staff", path, { ...body, actorId: randomUUID() }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request("staff", path, { q: "" }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request("system_admin", auditPath, { from: later(-40), to: day }),
    422,
    "VALIDATION_FAILED",
  );
  const noCsrf = await app.inject({
    method: "POST",
    url: path,
    headers: { origin, cookie: accounts.get("staff")!.cookie },
    payload: body,
  });
  assert.equal(noCsrf.statusCode, 403);
  await admin.query(
    "DELETE FROM role_permissions WHERE role_code='staff' AND permission_code='scholars.export'",
  );
  try {
    expectError(await request("staff", path, body), 403, "PERMISSION_DENIED");
  } finally {
    await admin.query(
      "INSERT INTO role_permissions(role_code,permission_code) VALUES('staff','scholars.export')",
    );
  }
  pass(
    "Export-specific grants, role separation, session/CSRF, strict PII fields and mandatory bounded scopes enforced",
  );
  const response = await request("staff", path, body);
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.match(String(response.headers["content-type"]), /spreadsheetml/);
  const load = async (r: LightMyRequestResponse) => {
    const w = new ExcelJS.Workbook();
    await w.xlsx.load(
      r.rawPayload as unknown as Parameters<typeof w.xlsx.load>[0],
    );
    return w;
  };
  const w = await load(response),
    sheet = w.getWorksheet("Scholars")!;
  assert.equal(sheet.rowCount, 2);
  assert.deepEqual((sheet.getRow(1).values as ExcelJS.CellValue[]).slice(1), [
    "Scholar ID",
    "Name",
    "Registration academic year",
  ]);
  assert.match(String(sheet.getCell("B2").value), /^'=HYPERLINK/);
  assert.equal(sheet.getCell("C2").value, "EXPORT-YEAR");
  const values = JSON.stringify(w.worksheets.map((s) => s.getSheetValues()));
  for (const secret of [
    "private-export@example.invalid",
    "09171234567",
    "PRIVATE ADDRESS MARKER",
    "2003-01-02",
    "Elsewhere",
  ])
    assert.ok(!values.includes(secret), secret);
  const [events] = await root.query<RowDataPacket[]>(
    "SELECT actor_id,reason,details FROM audit_logs WHERE event_type='data.exported' AND entity_id=?",
    [response.headers["x-export-id"]],
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].actor_id, accounts.get("staff")!.id);
  const details = JSON.parse(events[0].details as string);
  assert.equal(details.rowCount, 1);
  assert.equal(details.report, "scholar_registry");
  assert.deepEqual(details.scope, { ...body, academicYearCode: "EXPORT-YEAR" });
  assert.match(details.sha256, /^[a-f0-9]{64}$/);
  pass(
    "Workbook contains only minimal year-filtered registry data, escaped names and a complete authenticated disclosure audit",
  );
  const coordinator = await request("coordinator", path, body);
  assert.equal(coordinator.statusCode, 200);
  const literal = await request("staff", path, { ...body, q: "%" });
  assert.equal(literal.statusCode, 200);
  assert.equal((await load(literal)).getWorksheet("Scholars")!.rowCount, 1);
  const searched = await request("staff", path, { ...body, q: "Formula" });
  assert.equal((await load(searched)).getWorksheet("Scholars")!.rowCount, 2);
  const audit = await request("system_admin", auditPath, {
    from: day,
    to: day,
  });
  assert.equal(audit.statusCode, 200, audit.body);
  const aw = await load(audit),
    as = aw.getWorksheet("Audit metadata")!;
  assert.ok(as.rowCount > 1);
  assert.deepEqual((as.getRow(1).values as ExcelJS.CellValue[]).slice(1), [
    "Event ID",
    "Event type",
    "Entity type",
    "Action",
    "Actor ID",
    "Occurred at (UTC)",
    "Request ID",
  ]);
  assert.ok(
    as
      .getSheetValues()
      .some((row) => Array.isArray(row) && row.includes("data.exported")),
  );
  const auditText = JSON.stringify(
    aw.worksheets.map((s) => s.getSheetValues()),
  );
  for (const secret of [
    "private-export@example.invalid",
    "PRIVATE ADDRESS MARKER",
    "Synthetic export test",
    "HYPERLINK",
  ])
    assert.ok(!auditText.includes(secret));
  pass(
    "Coordinator registry access, literal search and System Administrator-only audit metadata export exclude raw PII payloads",
  );
  await admin.query(
    "CREATE TRIGGER fail_export_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='data.exported' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic export audit failure'; END IF; END",
  );
  try {
    const failed = await request("staff", path, body);
    assert.equal(failed.statusCode, 500);
    assert.match(String(failed.headers["content-type"]), /json/);
    assert.equal(failed.headers["content-disposition"], undefined);
    assert.equal(failed.headers["x-export-id"], undefined);
  } finally {
    await admin.query("DROP TRIGGER fail_export_audit");
  }
  assert.equal((await request("staff", path, body)).statusCode, 200);
  for (const sql of [
    "SELECT details FROM export_audit_metadata LIMIT 1",
    "SELECT reason FROM export_audit_metadata LIMIT 1",
    "SELECT * FROM audit_logs LIMIT 1",
    "UPDATE export_audit_metadata SET action=action WHERE 1=0",
    "DELETE FROM export_audit_metadata WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  pass(
    "Audit failure releases no attachment; narrow view and runtime grants prevent raw audit access or history mutation",
  );
  if (process.argv.includes("--browser")) {
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
    console.log("Disposable F28 fixture ready on port 3003.");
    await finished;
    await fixture.close();
  }
  console.log(`All ${passed} F28 export scenario groups passed.`);
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_export_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
