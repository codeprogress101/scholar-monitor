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
import type { RequirementVersion } from "../server/requirements/model.js";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_f13_test_${suffix}`,
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
  const day = today();
  const later = (n: number) =>
    new Date(Date.parse(day + "T00:00:00Z") + n * 86400000)
      .toISOString()
      .slice(0, 10);
  const year = await config("academic-years", {
    code: "TEST-YEAR",
    name: "Synthetic year",
    startsOn: later(-60),
    endsOn: later(400),
  });
  const sem = await config("semesters", {
    code: "TEST-SEMESTER",
    name: "Synthetic semester",
    academicYearId: year.id,
    startsOn: later(-30),
    endsOn: later(150),
  });
  const other = await config("semesters", {
    code: "OTHER-SEMESTER",
    name: "Other semester",
    academicYearId: year.id,
    startsOn: later(151),
    endsOn: later(300),
  });
  const path = "/api/v1/requirement-definitions";
  const fields = {
    name: "Certificate of Registration",
    instructions: "Submit the original physical COR to the records desk.",
    appliesTo: "semester",
    semesterId: null,
    effectiveFrom: day,
    effectiveUntil: null,
  };
  const body = {
    action: "create",
    expectedVersion: 0,
    code: "COR",
    fields,
    reason: "Approved physical document policy",
    reference: "POLICY-001",
  };
  const result = async (r: Promise<LightMyRequestResponse>) => {
    const v = await r;
    assert.equal(v.statusCode, 200, v.body);
    return v.json<RequirementVersion>();
  };
  for (const role of ["staff", "coordinator", "unassigned"])
    expectError(await request(role, path, body), 403, "PERMISSION_DENIED");
  assert.equal(
    (await app.inject({ method: "GET", url: path })).statusCode,
    401,
  );
  expectError(await request("unassigned", path), 403, "PERMISSION_DENIED");
  for (const role of ["staff", "coordinator", "system_admin"])
    assert.equal((await request(role, path)).statusCode, 200);
  pass(
    "Only System Administrators configure; Staff/Coordinators read and unassigned users are denied",
  );
  const key = randomUUID();
  const first = await result(request("system_admin", path, body, key));
  assert.equal(first.revision, 1);
  assert.equal(first.actorName, "Synthetic system_admin");
  assert.deepEqual(
    await result(request("system_admin", path, body, key)),
    first,
  );
  expectError(
    await request(
      "system_admin",
      path,
      { ...body, reason: "Changed request reason" },
      key,
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  expectError(await request("system_admin", path, body), 409, "DUPLICATE_CODE");
  const detail = path + "/" + first.definitionId;
  const resolveFor = async (
    date: string,
    purpose = "semester",
    semesterId = sem.id,
  ) => {
    const r = await request(
      "staff",
      path +
        "/applicable?" +
        new URLSearchParams({
          effectiveOn: date,
          appliesTo: purpose,
          semesterId,
        }),
    );
    assert.equal(r.statusCode, 200, r.body);
    return r.json<{ items: RequirementVersion[] }>().items;
  };
  assert.equal((await resolveFor(day))[0].id, first.id);
  assert.equal((await resolveFor(later(-1))).length, 0);
  pass(
    "Creation has one immutable version, authenticated attribution and stable idempotent retries",
  );
  const revision = {
    action: "revise",
    expectedVersion: 1,
    fields: {
      ...fields,
      name: "Revised COR",
      instructions: "Present the revised physical COR checklist.",
      effectiveFrom: later(10),
    },
    reason: "Policy updated for future submissions",
    reference: "POLICY-002",
  };
  const next = await result(request("system_admin", detail, revision));
  assert.equal(next.revision, 2);
  assert.deepEqual((await resolveFor(day))[0], first);
  assert.equal((await resolveFor(later(9)))[0].id, first.id);
  assert.equal((await resolveFor(later(10)))[0].id, next.id);
  const history = (await request("coordinator", detail)).json<{
    items: RequirementVersion[];
  }>().items;
  assert.deepEqual(history[1], first);
  // This fixture models F14's required immutable version foreign key without implementing generation.
  await admin.query(
    "CREATE TABLE pinned_requirement_fixture (version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY, FOREIGN KEY(version_id) REFERENCES requirement_definition_versions(id) ON DELETE RESTRICT) ENGINE=InnoDB",
  );
  await admin.execute("INSERT INTO pinned_requirement_fixture VALUES(?)", [
    first.id,
  ]);
  const [pinned] = await admin.query<RowDataPacket[]>(
    "SELECT v.name,v.instructions FROM pinned_requirement_fixture i JOIN requirement_definition_versions v ON v.id=i.version_id",
  );
  assert.equal(pinned[0].name, fields.name);
  assert.equal(pinned[0].instructions, fields.instructions);
  pass(
    "Future changes preserve original version content and pinned historical references; boundaries resolve correctly",
  );
  expectError(
    await request("system_admin", detail, revision),
    409,
    "VERSION_CONFLICT",
  );
  expectError(
    await request("system_admin", detail, {
      ...revision,
      expectedVersion: 2,
      fields: { ...fields, effectiveFrom: later(10) },
    }),
    409,
    "EFFECTIVE_DATE_CONFLICT",
  );
  expectError(
    await request("system_admin", detail, {
      ...revision,
      expectedVersion: 2,
      fields: { ...fields, effectiveFrom: later(-1) },
    }),
    409,
    "EFFECTIVE_DATE_CONFLICT",
  );
  expectError(
    await request("system_admin", path, {
      ...body,
      actorId: accounts.get("coordinator")!.id,
    }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request("system_admin", path, {
      ...body,
      fields: { ...fields, effectiveUntil: day },
    }),
    422,
    "VALIDATION_FAILED",
  );
  pass(
    "Stale revisions, backdating, overlapping start dates, invalid intervals and forged attribution are rejected",
  );
  const archived = await result(
    request("system_admin", detail, {
      action: "archive",
      expectedVersion: 2,
      effectiveFrom: later(20),
      reason: "Policy withdrawn after review",
      reference: "WITHDRAW-001",
    }),
  );
  assert.equal(archived.active, false);
  assert.equal((await resolveFor(later(20))).length, 0);
  assert.equal((await resolveFor(later(19)))[0].id, next.id);
  const restored = await result(
    request("system_admin", detail, {
      ...revision,
      expectedVersion: 3,
      fields: {
        ...fields,
        effectiveFrom: later(30),
        effectiveUntil: later(35),
      },
    }),
  );
  assert.equal(restored.active, true);
  assert.equal((await resolveFor(later(30)))[0].id, restored.id);
  assert.equal((await resolveFor(later(35))).length, 0);
  assert.equal((await resolveFor(later(40))).length, 0);
  assert.deepEqual(
    (await request("staff", detail))
      .json<{ items: RequirementVersion[] }>()
      .items.at(-1),
    first,
  );
  pass(
    "Archive and restoration append versions; expired/inactive policy never falls back to an old version",
  );
  const scoped = await result(
    request("system_admin", path, {
      ...body,
      code: "COG",
      fields: {
        ...fields,
        name: "Grades",
        appliesTo: "payout",
        semesterId: sem.id,
      },
    }),
  );
  assert.equal((await resolveFor(day, "payout")).length, 1);
  assert.equal((await resolveFor(day, "payout", other.id)).length, 0);
  assert.equal((await resolveFor(day, "semester")).length, 1);
  await result(
    request("system_admin", path + "/" + scoped.definitionId, {
      ...revision,
      fields: {
        ...fields,
        appliesTo: "payout",
        semesterId: other.id,
        effectiveFrom: later(5),
      },
    }),
  );
  assert.equal((await resolveFor(later(5), "payout", sem.id)).length, 0);
  assert.equal((await resolveFor(later(5), "payout", other.id)).length, 1);
  pass(
    "Semester and payout policies resolve independently; moving scope never revives a superseded version",
  );
  const concurrent = await Promise.all([
    request("system_admin", detail, {
      ...revision,
      expectedVersion: 4,
      fields: { ...fields, effectiveFrom: later(40), name: "Concurrency A" },
    }),
    request("system_admin", detail, {
      ...revision,
      expectedVersion: 4,
      fields: { ...fields, effectiveFrom: later(40), name: "Concurrency B" },
    }),
  ]);
  assert.deepEqual(concurrent.map((r) => r.statusCode).sort(), [200, 409]);
  pass("Concurrent revision commands serialize with exactly one winner");
  const rollbackKey = randomUUID(),
    rollbackBody = { ...body, code: "ROLLBACK" };
  await admin.query(
    "CREATE TRIGGER fail_requirement_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='requirement.definition.changed' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (await request("system_admin", path, rollbackBody, rollbackKey))
        .statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_requirement_audit");
  }
  const [missing] = await admin.query<RowDataPacket[]>(
    "SELECT id FROM requirement_definitions WHERE code='ROLLBACK'",
  );
  assert.equal(missing.length, 0);
  await result(request("system_admin", path, rollbackBody, rollbackKey));
  const [audits] = await admin.execute<RowDataPacket[]>(
    "SELECT actor_id,details FROM audit_logs WHERE event_type='requirement.definition.changed' AND entity_id=?",
    [first.definitionId],
  );
  assert.equal(audits.length, 5);
  assert.equal(audits[0].actor_id, accounts.get("system_admin")!.id);
  pass(
    "Audit failure rolls back definition, version and receipt; retry succeeds atomically",
  );
  for (const sql of [
    "EXPLAIN UPDATE requirement_definitions SET code=code WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_definition_versions WHERE 1=0",
    "EXPLAIN UPDATE requirement_definition_versions SET instructions=instructions WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_definition_commands WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  const account = accounts.get("system_admin")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: path,
        headers: { cookie: account.cookie, origin },
        payload: body,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (await request("system_admin", detail, revision, randomUUID(), "PATCH"))
      .statusCode,
    404,
  );
  pass(
    "Runtime cannot rewrite/delete policies and requests require CSRF protection",
  );
  const page = (await request("staff", path + "?q=COR&limit=1&offset=0")).json<{
    items: RequirementVersion[];
    total: number;
  }>();
  assert.equal(page.items.length, 1);
  assert.equal(page.total, 1);
  expectError(
    await request("staff", path + "?limit=9999"),
    422,
    "VALIDATION_FAILED",
  );
  pass(
    "Definition search and pagination validate bounds and return latest versions",
  );
  const closed = await config("semesters", {
    code: "CLOSED",
    name: "Closed test semester",
    academicYearId: year.id,
    startsOn: later(-30),
    endsOn: later(150),
  });
  await request(
    "system_admin",
    "/api/v1/configuration/semesters/" + closed.id,
    {
      action: "lock",
      expectedVersion: closed.version,
      reason: "Closed physical records policy period",
    },
  );
  expectError(
    await request("system_admin", path, {
      ...body,
      code: "CLOSED-POLICY",
      fields: { ...fields, semesterId: closed.id },
    }),
    423,
    "RECORD_LOCKED",
  );
  expectError(
    await request(
      "staff",
      path +
        "/applicable?" +
        new URLSearchParams({
          semesterId: closed.id,
          appliesTo: "semester",
          effectiveOn: day,
        }),
    ),
    423,
    "RECORD_LOCKED",
  );
  const archivedSem = await config("semesters", {
    code: "ARCHIVED",
    name: "Archived semester",
    academicYearId: year.id,
    startsOn: later(-30),
    endsOn: later(150),
  });
  await request(
    "system_admin",
    "/api/v1/configuration/semesters/" + archivedSem.id,
    {
      action: "archive",
      expectedVersion: archivedSem.version,
      reason: "Withdraw unused synthetic semester",
    },
  );
  expectError(
    await request("system_admin", path, {
      ...body,
      code: "ARCHIVED-POLICY",
      fields: { ...fields, semesterId: archivedSem.id },
    }),
    409,
    "REFERENCE_ARCHIVED",
  );
  expectError(
    await request("system_admin", path, {
      ...body,
      code: "MISSING",
      fields: { ...fields, semesterId: randomUUID() },
    }),
    422,
    "REFERENCE_NOT_FOUND",
  );
  pass(
    "Closed, archived and missing semester scopes cannot create new obligations or enabled policy versions",
  );
  console.log(
    `All ${passed} requirement definition scenarios passed in an isolated disposable database.`,
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
    console.log("Disposable F13 browser fixture ready on port 3003.");
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f13_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
