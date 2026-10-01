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
import type { ScholarResult } from "../server/scholars/model.js";
import type { AcademicRecord } from "../server/academic/model.js";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_f08_test_${suffix}`,
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
  assert.equal((await applyMigrations(admin)).length, 16);
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
  const year = await config("academic-years", {
    code: "AY2026",
    name: "Academic year 2026",
    startsOn: "2026-06-01",
    endsOn: "2027-05-31",
  });
  const nextYear = await config("academic-years", {
    code: "AY2027",
    name: "Academic year 2027",
    startsOn: "2027-06-01",
    endsOn: "2028-05-31",
  });
  let school = await config("schools", {
    code: "TEST-SCHOOL",
    name: "Synthetic College",
  });
  const course = await config("courses", {
    code: "TEST-COURSE",
    name: "Synthetic degree",
  });
  const created = await request("staff", "/api/v1/scholars", {
    expectedVersion: 0,
    reason: "Synthetic academic fixture",
    fields: {
      firstName: "Test",
      lastName: "Academic",
      academicYearId: year.id,
      contact: {},
    },
  });
  assert.equal(created.statusCode, 200, created.body);
  const person = created.json<ScholarResult>();
  const path = `/api/v1/scholars/${person.id}/academic-records`;
  const body = (academicYearId = year.id) => ({
    academicYearId,
    schoolId: school.id,
    courseId: course.id,
    yearLevel: "First year",
    reason: "Verified physical academic record",
    reference: "Synthetic COR register 01",
  });
  const list = async () => {
    const response = await request("staff", path);
    assert.equal(response.statusCode, 200, response.body);
    return response.json<{ items: AcademicRecord[] }>().items;
  };
  assert.equal((await app.inject(path)).statusCode, 401);
  for (const role of ["system_admin", "unassigned"]) {
    expectError(await request(role, path), 403, "PERMISSION_DENIED");
    expectError(await request(role, path, body()), 403, "PERMISSION_DENIED");
  }
  expectError(
    await request("staff", path, { ...body(), schoolId: "" }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request("staff", path, { ...body(), yearLevel: "" }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request("staff", path, { ...body(), courseId: randomUUID() }),
    422,
    "REFERENCE_NOT_FOUND",
  );
  pass(
    "Only operational roles can access academic records; required references and year level are enforced",
  );
  const application = await request(
    "staff",
    `/api/v1/scholars/${person.id}/scholarships`,
    {
      academicYearId: year.id,
      expectedVersion: 0,
      effectiveOn: "2026-09-01",
      reason: "Verified fixture application",
      reference: "Application register 01",
    },
  );
  assert.equal(application.statusCode, 200, application.body);
  const annual = application.json();
  const command = {
    expectedVersion: 1,
    effectiveOn: "2026-09-01",
    reason: "Verified fixture decision",
    reference: "Decision register 01",
  };
  assert.equal(
    (
      await request(
        "staff",
        `/api/v1/scholarships/${annual.id}/qualification/exam-passed`,
        command,
      )
    ).statusCode,
    200,
  );
  expectError(
    await request(
      "coordinator",
      `/api/v1/scholarships/${annual.id}/qualification/qualify`,
      { ...command, expectedVersion: 2 },
    ),
    409,
    "ACADEMIC_RECORD_REQUIRED",
  );
  const initial = await request("staff", path, body());
  assert.equal(initial.statusCode, 200, initial.body);
  const first = (await list())[0];
  const qualified = await request(
    "coordinator",
    `/api/v1/scholarships/${annual.id}/qualification/qualify`,
    { ...command, expectedVersion: 2 },
  );
  assert.equal(qualified.statusCode, 200, qualified.body);
  pass(
    "Qualification is blocked without the same-year academic record and succeeds once complete data is recorded",
  );
  const second = await request("coordinator", path, {
    ...body(nextYear.id),
    yearLevel: "Second year",
  });
  assert.equal(second.statusCode, 200, second.body);
  let items = await list();
  assert.equal(items.length, 2);
  assert.deepEqual(
    items.find((r) => r.academicYearId === year.id),
    first,
  );
  assert.equal(
    (await request("staff", "/api/v1/scholars/" + person.id)).json().scholarId,
    person.scholarId,
  );
  expectError(
    await request("staff", path, body()),
    409,
    "DUPLICATE_ACADEMIC_YEAR",
  );
  await assert.rejects(
    admin.execute(
      "INSERT INTO academic_records SELECT ?,scholar_id,academic_year_id,school_id,course_id,year_level,year_code,year_name,school_code,school_name,course_code,course_name,reason,reference_text,actor_id,actor_name,created_at FROM academic_records WHERE id=?",
      [randomUUID(), first.id],
    ),
    (e: unknown) =>
      Boolean(
        e && typeof e === "object" && "code" in e && e.code === "ER_DUP_ENTRY",
      ),
  );
  pass(
    "New academic years preserve prior records and permanent ID; API and database reject duplicate scholar/year entries",
  );
  const renamed = await request(
    "system_admin",
    "/api/v1/configuration/schools/" + school.id,
    {
      action: "update",
      expectedVersion: school.version,
      reason: "Correct current reference name",
      fields: { code: school.code, name: "Renamed Synthetic College" },
    },
  );
  assert.equal(renamed.statusCode, 200, renamed.body);
  school = renamed.json();
  assert.deepEqual(
    (await list()).find((r) => r.id === first.id),
    first,
  );
  pass("Historical reference snapshots survive later school name changes");
  const raceYear = await config("academic-years", {
    code: "AY2028",
    name: "Concurrent academic fixture",
    startsOn: "2028-06-01",
    endsOn: "2029-05-31",
  });
  const race = await Promise.all([
    request("staff", path, body(raceYear.id)),
    request("coordinator", path, body(raceYear.id)),
  ]);
  assert.deepEqual(race.map((r) => r.statusCode).sort(), [200, 409]);
  const retryYear = await config("academic-years", {
    code: "AY2029",
    name: "Retry academic fixture",
    startsOn: "2029-06-01",
    endsOn: "2030-05-31",
  });
  const key = randomUUID(),
    payload = body(retryYear.id);
  const retries = await Promise.all([
    request("staff", path, payload, key),
    request("staff", path, payload, key),
  ]);
  retries.forEach((r) => assert.equal(r.statusCode, 200, r.body));
  assert.deepEqual(retries[0].json(), retries[1].json());
  expectError(
    await request("staff", path, { ...payload, yearLevel: "Third year" }, key),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  const [audits] = await admin.execute<RowDataPacket[]>(
    "SELECT details,actor_id FROM audit_logs WHERE entity_type='academic_record' AND entity_id=?",
    [retries[0].json().id],
  );
  assert.equal(audits.length, 1);
  assert.equal(audits[0].actor_id, accounts.get("staff")!.id);
  assert.equal(JSON.parse(audits[0].details).after.yearLevel, "First year");
  pass(
    "Concurrent entries have one winner; exact retries return one record and audit while changed retries conflict",
  );
  const rollbackYear = await config("academic-years", {
    code: "AY2030",
    name: "Rollback academic fixture",
    startsOn: "2030-06-01",
    endsOn: "2031-05-31",
  });
  const rollbackKey = randomUUID(),
    before = await list();
  await admin.query(
    "CREATE TRIGGER fail_academic_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='academic.created' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (await request("staff", path, body(rollbackYear.id), rollbackKey))
        .statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_academic_audit");
  }
  assert.deepEqual(await list(), before);
  assert.equal(
    (await request("staff", path, body(rollbackYear.id), rollbackKey))
      .statusCode,
    200,
  );
  pass(
    "Failed audit rolls back academic record and retry history; the same command can then succeed",
  );
  const lock = await request(
    "system_admin",
    "/api/v1/configuration/academic-years/" + year.id,
    {
      action: "lock",
      expectedVersion: year.version,
      reason: "Confirmed historical period",
    },
  );
  assert.equal(lock.statusCode, 200, lock.body);
  expectError(await request("staff", path, body()), 409, "RECORD_LOCKED");
  const archive = await request(
    "system_admin",
    "/api/v1/configuration/schools/" + school.id,
    {
      action: "archive",
      expectedVersion: school.version,
      reason: "Retain historical school",
    },
  );
  assert.equal(archive.statusCode, 200, archive.body);
  expectError(
    await request("staff", path, body(nextYear.id)),
    409,
    "REFERENCE_ARCHIVED",
  );
  items = await list();
  assert.equal(
    items.find((r) => r.id === first.id)!.school.name,
    "Synthetic College",
  );
  assert.equal(items.find((r) => r.id === first.id)!.periodUnavailable, true);
  await assert.rejects(
    admin.execute("DELETE FROM schools WHERE id=?", [school.id]),
  );
  await assert.rejects(
    admin.execute("DELETE FROM courses WHERE id=?", [course.id]),
  );
  pass(
    "Locked years and archived references block new entries while snapshots and restricted foreign keys preserve history",
  );
  assert.equal(
    (
      await request(
        "staff",
        path + "/" + first.id,
        { yearLevel: "Overwrite" },
        randomUUID(),
        "PATCH",
      )
    ).statusCode,
    404,
  );
  for (const sql of [
    "EXPLAIN UPDATE academic_records SET year_level=year_level WHERE 1=0",
    "EXPLAIN DELETE FROM academic_records WHERE 1=0",
    "EXPLAIN UPDATE academic_commands SET payload_hash=payload_hash WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  const active = accounts.get("staff")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: path,
        headers: {
          cookie: active.cookie,
          origin,
          "content-type": "application/json",
        },
        payload: body(),
      })
    ).statusCode,
    403,
  );
  pass(
    "No generic history overwrite/delete, runtime mutation grants, or CSRF bypass exists",
  );
  if (process.argv.includes("--browser"))
    await config("schools", {
      code: "BROWSER-SCHOOL",
      name: "Browser Synthetic College",
    });
  console.log(
    `All ${passed} academic scenarios passed in an isolated disposable database.`,
  );
  if (process.argv.includes("--browser")) {
    await config("academic-years", {
      code: "BROWSER-2025",
      name: "Browser workflow fixture",
      startsOn: "2025-06-01",
      endsOn: "2026-05-31",
    });
    const fixture = buildApp(
      loadConfig({ APP_ENV: "test", PORT: "3003", APP_ORIGIN: origin }),
      { database: db, clientRoot: resolve("dist/client") },
    );
    let stop: () => void = () => {};
    const finished = new Promise<void>((resolve) => {
      stop = resolve;
    });
    fixture.get("/__fixture/stop", async () => {
      setTimeout(stop, 50);
      return { stopping: true };
    });
    await fixture.listen({ host: "127.0.0.1", port: 3003 });
    console.log(
      "Disposable academic browser fixture ready on port 3003; staff@example.invalid, coordinator@example.invalid and system_admin@example.invalid. Stop at /__fixture/stop.",
    );
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f08_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
