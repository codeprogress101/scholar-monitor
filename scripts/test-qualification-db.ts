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
import type {
  QualificationDetail,
  QualificationResult,
} from "../server/qualification/model.js";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_f06_test_${suffix}`,
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
  const personResponse = await request("staff", "/api/v1/scholars", {
    expectedVersion: 0,
    reason: "Synthetic qualification fixture",
    fields: {
      firstName: "Test",
      lastName: "Qualification",
      academicYearId: year.id,
      contact: {},
    },
  });
  assert.equal(personResponse.statusCode, 200, personResponse.body);
  const person = personResponse.json<ScholarResult>();
  const listPath = `/api/v1/scholars/${person.id}/scholarships`;
  const creation = (academicYearId = year.id) => ({
    academicYearId,
    expectedVersion: 0,
    effectiveOn: "2026-09-01",
    reason: "Verified annual application",
    reference: "Physical applicant register 01",
  });
  const detail = async (id: string) => {
    const response = await request("staff", "/api/v1/scholarships/" + id);
    assert.equal(response.statusCode, 200, response.body);
    return response.json<QualificationDetail>();
  };
  const command = (
    row: QualificationResult,
    action: string,
    role = "coordinator",
    key = randomUUID(),
    extra: object = {},
  ) =>
    request(
      role,
      `/api/v1/scholarships/${row.id}/qualification/${action}`,
      {
        expectedVersion: row.version,
        effectiveOn: "2026-09-02",
        reason: "Verified qualification decision",
        reference: "Physical decision register 02",
        ...extra,
      },
      key,
    );
  assert.equal((await app.inject(listPath)).statusCode, 401);
  for (const role of ["system_admin", "unassigned"]) {
    expectError(await request(role, listPath), 403, "PERMISSION_DENIED");
    expectError(
      await request(role, listPath, creation()),
      403,
      "PERMISSION_DENIED",
    );
  }
  const initial = await request("staff", listPath, creation());
  assert.equal(initial.statusCode, 200, initial.body);
  let record = initial.json<QualificationResult>();
  assert.equal(record.status, "applicant");
  for (const action of ["qualify", "select", "not-select", "activate"])
    expectError(
      await command(record, action, "staff"),
      403,
      "PERMISSION_DENIED",
    );
  expectError(
    await request("system_admin", "/api/v1/scholarships/" + record.id),
    403,
    "PERMISSION_DENIED",
  );
  pass(
    "Annual records are private; Staff cannot invoke Coordinator commands despite forged role headers",
  );
  expectError(await command(record, "select"), 409, "INVALID_STATE_TRANSITION");
  expectError(
    await command(record, "qualify"),
    409,
    "INVALID_STATE_TRANSITION",
  );
  assert.equal(
    (
      await request(
        "coordinator",
        "/api/v1/scholarships/" + record.id,
        { status: "active" },
        randomUUID(),
        "PATCH",
      )
    ).statusCode,
    404,
  );
  expectError(
    await command(record, "exam-passed", "staff", randomUUID(), {
      status: "active",
    }),
    422,
    "VALIDATION_FAILED",
  );
  record = (await command(record, "exam-passed", "staff")).json();
  assert.equal(record.status, "exam_passed");
  record = (await command(record, "qualify")).json();
  assert.equal(record.status, "qualified");
  record = (await command(record, "select")).json();
  assert.equal(record.status, "selected");
  expectError(
    await command(record, "activate"),
    409,
    "MASTERLIST_ACTIVATION_REQUIRED",
  );
  expectError(
    await command(record, "not-select"),
    409,
    "INVALID_STATE_TRANSITION",
  );
  const history = await detail(record.id);
  assert.deepEqual(
    history.events.map((event) => event.toStatus),
    ["applicant", "exam_passed", "qualified", "selected"],
  );
  assert.deepEqual(
    history.events.map((event) => event.version),
    [1, 2, 3, 4],
  );
  assert.equal(history.events[1].actorName, "Synthetic staff");
  assert.equal(history.events[2].actorName, "Synthetic coordinator");
  assert.ok(
    history.events.every(
      (event) =>
        event.reason &&
        event.reference &&
        event.effectiveOn &&
        event.occurredAt,
    ),
  );
  pass(
    "Valid ordered commands append attributed history; generic updates, skipped states and activation are blocked",
  );
  expectError(
    await request("staff", listPath, creation()),
    409,
    "DUPLICATE_SCHOLARSHIP_YEAR",
  );
  await assert.rejects(
    admin.execute(
      "INSERT INTO scholarship_records (id,scholar_id,academic_year_id,status,last_effective_on,created_at,updated_at) VALUES (?,?,?,'applicant','2026-09-01',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
      [randomUUID(), person.id, year.id],
    ),
    (error: unknown) =>
      Boolean(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ER_DUP_ENTRY",
      ),
  );
  await assert.rejects(
    admin.execute("UPDATE scholarship_records SET status='active' WHERE id=?", [
      record.id,
    ]),
  );
  pass(
    "Database uniqueness enforces one annual record and the F06 state constraint excludes Active",
  );
  const concurrent = await Promise.all([
    request("staff", listPath, creation(nextYear.id)),
    request("coordinator", listPath, creation(nextYear.id)),
  ]);
  assert.deepEqual(
    concurrent.map((response) => response.statusCode).sort(),
    [200, 409],
  );
  let other = concurrent
    .find((response) => response.statusCode === 200)!
    .json<QualificationResult>();
  const [count] = await admin.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM qualification_events WHERE scholarship_id=?",
    [other.id],
  );
  assert.equal(count[0].total, 1);
  const identity = await request("staff", "/api/v1/scholars/" + person.id);
  assert.equal(identity.json().scholarId, person.scholarId);
  assert.equal(identity.json().academicYearId, year.id);
  pass(
    "Concurrent same-year creation has one winner; later-year records preserve person identity and registration year",
  );
  const race = await Promise.all([
    command(other, "exam-passed", "staff"),
    command(other, "not-select"),
  ]);
  assert.deepEqual(
    race.map((response) => response.statusCode).sort(),
    [200, 409],
  );
  expectError(
    race.find((response) => response.statusCode === 409)!,
    409,
    "VERSION_CONFLICT",
  );
  other = race.find((response) => response.statusCode === 200)!.json();
  if (other.status !== "not_selected")
    other = (await command(other, "not-select")).json();
  assert.equal(other.status, "not_selected");
  expectError(
    await command(other, "exam-passed", "staff"),
    409,
    "INVALID_STATE_TRANSITION",
  );
  expectError(await command(other, "qualify"), 409, "INVALID_STATE_TRANSITION");
  pass(
    "Concurrent transitions have one winner; Not Selected is terminal for that academic year",
  );
  const retryYear = await config("academic-years", {
    code: "RETRY",
    name: "Retry fixture",
    startsOn: "2028-06-01",
    endsOn: "2029-05-31",
  });
  const key = randomUUID(),
    retryBody = creation(retryYear.id);
  const retries = await Promise.all([
    request("staff", listPath, retryBody, key),
    request("staff", listPath, retryBody, key),
  ]);
  retries.forEach((response) =>
    assert.equal(response.statusCode, 200, response.body),
  );
  assert.deepEqual(retries[0].json(), retries[1].json());
  const retryRecord = retries[0].json<QualificationResult>();
  expectError(
    await request(
      "staff",
      listPath,
      { ...retryBody, reason: "Different request reason" },
      key,
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  const commandKey = randomUUID();
  const passedExam = await command(
    retryRecord,
    "exam-passed",
    "staff",
    commandKey,
  );
  assert.equal(passedExam.statusCode, 200, passedExam.body);
  assert.deepEqual(
    (await command(retryRecord, "exam-passed", "staff", commandKey)).json(),
    passedExam.json(),
  );
  assert.equal((await detail(retryRecord.id)).events.length, 2);
  pass(
    "Creation and transition retries return one result without duplicate history; key reuse with different input conflicts",
  );
  const beforeRollback = await detail(retryRecord.id);
  await admin.query(
    "CREATE TRIGGER fail_qualification_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='qualification.changed' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  const rollbackKey = randomUUID();
  try {
    assert.equal(
      (await command(beforeRollback, "qualify", "coordinator", rollbackKey))
        .statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_qualification_audit");
  }
  assert.deepEqual(await detail(retryRecord.id), beforeRollback);
  const succeeded = await command(
    beforeRollback,
    "qualify",
    "coordinator",
    rollbackKey,
  );
  assert.equal(succeeded.statusCode, 200, succeeded.body);
  const [audits] = await admin.execute<RowDataPacket[]>(
    "SELECT details,actor_id FROM audit_logs WHERE entity_type='scholarship' AND entity_id=? ORDER BY occurred_at",
    [retryRecord.id],
  );
  assert.equal(audits.length, 3);
  assert.equal(audits[2].actor_id, accounts.get("coordinator")!.id);
  assert.equal(JSON.parse(audits[2].details).after.status, "qualified");
  pass(
    "Audit failure rolls back projection, qualification history and retry record; retry then succeeds atomically",
  );
  const qualified = succeeded.json<QualificationResult>();
  expectError(
    await command(qualified, "select", "coordinator", randomUUID(), {
      effectiveOn: "2026-08-01",
    }),
    409,
    "INVALID_EFFECTIVE_DATE",
  );
  expectError(
    await command(qualified, "select", "coordinator", randomUUID(), {
      reference: "",
    }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await command(qualified, "select", "coordinator", randomUUID(), {
      academicYearId: year.id,
    }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request(
      "staff",
      `/api/v1/scholars/${randomUUID()}/scholarships`,
      creation(),
    ),
    404,
    "SCHOLAR_NOT_FOUND",
  );
  expectError(
    await request("staff", listPath, creation(randomUUID())),
    422,
    "REFERENCE_NOT_FOUND",
  );
  pass(
    "Effective-date order, references, immutable year and missing person/year guards are enforced",
  );
  const locked = await request(
    "system_admin",
    "/api/v1/configuration/academic-years/" + retryYear.id,
    {
      action: "lock",
      expectedVersion: retryYear.version,
      reason: "Final fixture academic year",
    },
  );
  assert.equal(locked.statusCode, 200, locked.body);
  expectError(await command(qualified, "select"), 409, "RECORD_LOCKED");
  assert.equal((await detail(qualified.id)).periodUnavailable, true);
  assert.deepEqual(
    (await command(retryRecord, "exam-passed", "staff", commandKey)).json(),
    passedExam.json(),
  );
  const archive = await request(
    "system_admin",
    "/api/v1/configuration/academic-years/" + nextYear.id,
    {
      action: "archive",
      expectedVersion: nextYear.version,
      reason: "Retain fixture historical year",
    },
  );
  assert.equal(archive.statusCode, 200, archive.body);
  expectError(await command(other, "qualify"), 409, "REFERENCE_ARCHIVED");
  assert.equal(
    (await detail(other.id)).events.at(-1)!.toStatus,
    "not_selected",
  );
  pass(
    "Locked/archived years preserve readable history while blocking new commands; completed retries remain safe",
  );
  const active = accounts.get("staff")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: listPath,
        headers: {
          cookie: active.cookie,
          origin,
          "content-type": "application/json",
          "idempotency-key": randomUUID(),
        },
        payload: creation(),
      })
    ).statusCode,
    403,
  );
  for (const sql of [
    "EXPLAIN DELETE FROM scholarship_records WHERE 1=0",
    "EXPLAIN UPDATE scholarship_records SET scholar_id=scholar_id WHERE 1=0",
    "EXPLAIN UPDATE scholarship_records SET academic_year_id=academic_year_id WHERE 1=0",
    "EXPLAIN UPDATE qualification_events SET reason=reason WHERE 1=0",
    "EXPLAIN DELETE FROM qualification_events WHERE 1=0",
    "EXPLAIN UPDATE qualification_commands SET resulting_status=resulting_status WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  pass(
    "CSRF and restricted database grants protect annual identity, append-only events and retry history",
  );
  console.log(
    `All ${passed} qualification scenarios passed in an isolated disposable database.`,
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
      "Disposable qualification browser fixture ready on port 3003; staff@example.invalid, coordinator@example.invalid and system_admin@example.invalid. Stop at /__fixture/stop.",
    );
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f06_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
