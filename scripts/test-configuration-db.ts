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
import type {
  ConfigKind,
  ConfigRecord,
  ConfigFields,
  ConfigCommand,
} from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_f03_test_${suffix}`,
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
  assert.equal((await applyMigrations(admin)).length, 6);
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
    body?: unknown,
    key: string = randomUUID(),
  ) => {
    const account = accounts.get(role)!;
    return app!.inject({
      method: body === undefined ? "GET" : "POST",
      url,
      headers: {
        cookie: account.cookie,
        origin,
        "x-role": "system_admin",
        ...(body === undefined
          ? {}
          : {
              "content-type": "application/json",
              "x-csrf-token": account.csrf,
              "idempotency-key": key,
            }),
      },
      ...(body === undefined ? {} : { payload: body as object }),
    });
  };
  const path = (kind: ConfigKind, id?: string) =>
    "/api/v1/configuration/" + kind + (id ? "/" + id : "");
  const createBody = (fields: ConfigFields) => ({
    action: "create",
    expectedVersion: 0,
    reason: "Initial fixture configuration",
    fields,
  });
  const command = (
    kind: ConfigKind,
    row: ConfigRecord,
    action: ConfigCommand["action"],
    fields?: ConfigFields,
    role = "system_admin",
  ) =>
    request(role, path(kind, row.id), {
      action,
      expectedVersion: row.version,
      reason: "Fixture configuration change",
      ...(fields ? { fields } : {}),
    });
  const create = async (kind: ConfigKind, fields: ConfigFields) => {
    const response = await request(
      "system_admin",
      path(kind),
      createBody(fields),
    );
    assert.equal(response.statusCode, 200, response.body);
    return response.json<ConfigRecord>();
  };
  const errorCode = (
    response: LightMyRequestResponse,
    status: number,
    code: string,
  ) => {
    assert.equal(response.statusCode, status, response.body);
    assert.equal(response.json().error.code, code);
  };
  assert.equal((await app.inject(path("schools"))).statusCode, 401);
  assert.equal((await request("unassigned", path("schools"))).statusCode, 403);
  for (const role of ["staff", "coordinator"]) {
    assert.equal((await request(role, path("schools"))).statusCode, 200);
    errorCode(
      await request(
        role,
        path("schools"),
        createBody({ code: "FORGED", name: "Forbidden school" }),
      ),
      403,
      "PERMISSION_DENIED",
    );
  }
  pass(
    "Anonymous/unassigned access denied; Staff and Coordinator can read but cannot create configuration",
  );
  let year = await create("academic-years", {
    code: "AY2026",
    name: "Academic year 2026–2027",
    startsOn: "2026-06-01",
    endsOn: "2027-05-31",
  });
  const semester = await create("semesters", {
    code: "AY2026-S1",
    name: "First semester",
    startsOn: "2026-06-01",
    endsOn: "2026-10-31",
    academicYearId: year.id,
  });
  let school = await create("schools", {
    code: "TEST-SCHOOL",
    name: "Synthetic school",
  });
  const course = await create("courses", {
    code: "TEST-COURSE",
    name: "Synthetic course",
  });
  await create("barangays", { code: "TEST-BRGY", name: "Synthetic barangay" });
  const setting = await create("settings", {
    code: "APPLICATION_DEADLINE",
    name: "Application deadline",
    valueType: "date",
    value: "2026-08-31",
  });
  assert.equal(setting.value, "2026-08-31");
  assert.equal(
    (await request("staff", path("academic-years", year.id))).json().startsOn,
    "2026-06-01",
  );
  pass("All six reference kinds persist, with calendar dates stored as data");
  errorCode(
    await request(
      "system_admin",
      path("academic-years"),
      createBody({
        code: "ay2026",
        name: "Duplicate year",
        startsOn: "2027-06-01",
        endsOn: "2028-05-31",
      }),
    ),
    409,
    "DUPLICATE_REFERENCE_CODE",
  );
  errorCode(
    await request(
      "system_admin",
      path("semesters"),
      createBody({
        code: "AY2026-S1",
        name: "Duplicate semester",
        startsOn: "2026-06-01",
        endsOn: "2026-10-31",
        academicYearId: year.id,
      }),
    ),
    409,
    "DUPLICATE_REFERENCE_CODE",
  );
  errorCode(
    await request(
      "system_admin",
      path("semesters"),
      createBody({
        code: "OUTSIDE",
        name: "Invalid semester",
        startsOn: "2025-01-01",
        endsOn: "2026-10-31",
        academicYearId: year.id,
      }),
    ),
    422,
    "PERIOD_OUTSIDE_YEAR",
  );
  errorCode(
    await command("academic-years", year, "update", {
      code: year.code,
      name: year.name,
      startsOn: "2026-08-01",
      endsOn: "2027-05-31",
    }),
    422,
    "PERIOD_OUTSIDE_YEAR",
  );
  errorCode(
    await request(
      "system_admin",
      path("settings"),
      createBody({
        code: "BAD-DATE",
        name: "Invalid date",
        valueType: "date",
        value: "2026-02-30",
      }),
    ),
    422,
    "VALIDATION_FAILED",
  );
  pass(
    "Duplicate periods, invalid dates, out-of-year semesters, and year shrinkage are rejected",
  );
  for (const action of ["update", "archive", "lock"] as const)
    errorCode(
      await command(
        "academic-years",
        year,
        action,
        action === "update"
          ? {
              code: year.code,
              name: "Forbidden update",
              startsOn: year.startsOn!,
              endsOn: year.endsOn!,
            }
          : undefined,
        "staff",
      ),
      403,
      "PERMISSION_DENIED",
    );
  errorCode(
    await command("academic-years", year, "archive"),
    409,
    "REFERENCE_IN_USE",
  );
  await assert.rejects(
    admin.execute("DELETE FROM academic_years WHERE id=?", [year.id]),
  );
  pass(
    "Staff mutations are denied and referenced academic years cannot be deleted or archived over active semesters",
  );
  school = (await command("schools", school, "archive")).json();
  assert.equal(school.archived, true);
  assert.equal((await request("staff", path("schools"))).json().total, 0);
  assert.equal(
    (await request("staff", path("schools") + "?includeArchived=true")).json()
      .items[0].id,
    school.id,
  );
  assert.equal(
    (await request("staff", path("schools", school.id))).json().name,
    school.name,
  );
  errorCode(
    await request(
      "system_admin",
      path("schools"),
      createBody({ code: school.code, name: "Reused code" }),
    ),
    409,
    "DUPLICATE_REFERENCE_CODE",
  );
  errorCode(
    await command("schools", school, "update", {
      code: school.code,
      name: "Changed archived",
    }),
    409,
    "INVALID_STATE_TRANSITION",
  );
  school = (await command("schools", school, "restore")).json();
  assert.equal(school.archived, false);
  pass(
    "Archive preserves history and code uniqueness; restore returns entries to active choices",
  );
  const stale = school;
  school = (
    await command("schools", school, "update", {
      code: school.code,
      name: "Renamed synthetic school",
    })
  ).json();
  errorCode(
    await command("schools", stale, "archive"),
    409,
    "VERSION_CONFLICT",
  );
  errorCode(
    await command("schools", school, "update", {
      code: "NEW-CODE",
      name: school.name,
    }),
    422,
    "VALIDATION_FAILED",
  );
  pass("Stale versions fail and permanent reference codes cannot be changed");
  const key = randomUUID(),
    body = createBody({ code: "RETRY", name: "Retry-safe course" });
  const retries = await Promise.all([
    request("system_admin", path("courses"), body, key),
    request("system_admin", path("courses"), body, key),
  ]);
  retries.forEach((response) =>
    assert.equal(response.statusCode, 200, response.body),
  );
  assert.deepEqual(retries[0].json(), retries[1].json());
  errorCode(
    await request(
      "system_admin",
      path("courses"),
      createBody({ code: "OTHER", name: "Other course" }),
      key,
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  const [audits] = await admin.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM audit_logs WHERE entity_id=?",
    [retries[0].json().id],
  );
  assert.equal(audits[0].total, 1);
  pass(
    "Concurrent identical retries return one record and one audit; conflicting key reuse is rejected",
  );
  const updates = await Promise.all(
    ["First edit", "Second edit"].map((name) =>
      command("courses", course, "update", { code: course.code, name }),
    ),
  );
  assert.deepEqual(
    updates.map((response) => response.statusCode).sort(),
    [200, 409],
  );
  pass("Concurrent edits have one winner and a version conflict");
  const rollbackKey = randomUUID(),
    rollbackBody = createBody({ code: "ROLLBACK", name: "Atomic reference" });
  await admin.query(
    "CREATE TRIGGER fail_configuration_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='configuration.changed' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (
        await request(
          "system_admin",
          path("schools"),
          rollbackBody,
          rollbackKey,
        )
      ).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_configuration_audit");
  }
  const [rollback] = await admin.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM schools WHERE code='ROLLBACK'",
  );
  assert.equal(rollback[0].total, 0);
  assert.equal(
    (await request("system_admin", path("schools"), rollbackBody, rollbackKey))
      .statusCode,
    200,
  );
  pass(
    "Audit failure rolls back data and retry history; the same key can safely retry",
  );
  const lockedSemester = (
    await command("semesters", semester, "lock")
  ).json<ConfigRecord>();
  assert.equal(lockedSemester.locked, true);
  errorCode(
    await command("semesters", lockedSemester, "archive"),
    409,
    "RECORD_LOCKED",
  );
  errorCode(
    await command("academic-years", year, "update", {
      code: year.code,
      name: year.name,
      startsOn: "2026-05-01",
      endsOn: year.endsOn!,
    }),
    409,
    "RECORD_LOCKED",
  );
  const second = await create("semesters", {
    code: "AY2026-S2",
    name: "Second semester",
    startsOn: "2026-11-01",
    endsOn: "2027-05-31",
    academicYearId: year.id,
  });
  year = (await command("academic-years", year, "lock")).json();
  assert.equal(year.locked, true);
  errorCode(
    await command("academic-years", year, "archive"),
    409,
    "RECORD_LOCKED",
  );
  errorCode(
    await command("semesters", second, "update", {
      code: second.code,
      name: "Blocked edit",
      startsOn: second.startsOn!,
      endsOn: second.endsOn!,
      academicYearId: year.id,
    }),
    409,
    "RECORD_LOCKED",
  );
  errorCode(
    await request(
      "system_admin",
      path("semesters"),
      createBody({
        code: "LOCKED-NEW",
        name: "Blocked semester",
        startsOn: "2026-06-01",
        endsOn: "2026-07-01",
        academicYearId: year.id,
      }),
    ),
    409,
    "RECORD_LOCKED",
  );
  assert.equal(
    (await request("staff", path("semesters", second.id))).json()
      .parentUnavailable,
    true,
  );
  pass(
    "Period locks block edits/archive; year locks block child creation and edits while preserving reads",
  );
  let oldYear = await create("academic-years", {
    code: "AY2025",
    name: "Prior year",
    startsOn: "2025-06-01",
    endsOn: "2026-05-31",
  });
  let oldSemester = await create("semesters", {
    code: "AY2025-S1",
    name: "Prior semester",
    startsOn: "2025-06-01",
    endsOn: "2025-10-31",
    academicYearId: oldYear.id,
  });
  oldSemester = (await command("semesters", oldSemester, "archive")).json();
  oldYear = (await command("academic-years", oldYear, "archive")).json();
  errorCode(
    await command("semesters", oldSemester, "restore"),
    409,
    "INVALID_STATE_TRANSITION",
  );
  oldYear = (await command("academic-years", oldYear, "restore")).json();
  assert.equal(
    (await command("semesters", oldSemester, "restore")).statusCode,
    200,
  );
  pass(
    "Archived parent periods block child restoration until the parent is restored",
  );
  const page = await request("staff", path("courses") + "?limit=1&offset=1");
  assert.equal(page.json().items.length, 1);
  assert.equal(page.json().total, 2);
  assert.equal(
    (await request("staff", path("schools") + "?q=%25")).json().total,
    0,
  );
  assert.equal(
    (await request("staff", path("schools") + "?q=renamed")).json().items[0].id,
    school.id,
  );
  pass(
    "Pagination and literal search return database-backed reference choices",
  );
  const account = accounts.get("system_admin")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: path("schools"),
        headers: {
          cookie: account.cookie,
          origin,
          "content-type": "application/json",
          "idempotency-key": randomUUID(),
        },
        payload: createBody({ code: "NO-CSRF", name: "Invalid request" }),
      })
    ).statusCode,
    403,
  );
  errorCode(
    await request(
      "system_admin",
      path("schools"),
      createBody({ code: "NO-KEY", name: "Invalid request" }),
      "bad-key",
    ),
    422,
    "VALIDATION_FAILED",
  );
  assert.equal(
    (
      await app.inject({
        method: "DELETE",
        url: path("schools", school.id),
        headers: {
          cookie: account.cookie,
          origin,
          "content-type": "application/json",
          "x-csrf-token": account.csrf,
        },
        payload: {},
      })
    ).statusCode,
    404,
  );
  for (const sql of [
    "EXPLAIN DELETE FROM schools WHERE 1=0",
    "EXPLAIN UPDATE schools SET code=code WHERE 1=0",
    "EXPLAIN UPDATE semesters SET academic_year_id=academic_year_id WHERE 1=0",
    "EXPLAIN DELETE FROM configuration_commands WHERE 1=0",
    "EXPLAIN UPDATE audit_logs SET action=action WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  pass(
    "CSRF, valid request keys, absent DELETE endpoints, and restricted grants protect configuration",
  );
  console.log(
    `All ${passed} configuration scenarios passed in an isolated disposable database.`,
  );
  if (process.argv.includes("--browser")) {
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
      "Disposable configuration fixture at http://127.0.0.1:3003; system_admin@example.invalid and staff@example.invalid. Stop at /__fixture/stop.",
    );
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f03_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
