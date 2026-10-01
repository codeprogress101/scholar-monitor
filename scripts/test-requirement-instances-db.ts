import { applicableRequirements } from "../server/requirements/service.js";
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
import type {
  RequirementChecklist,
  GenerationResult,
} from "../server/requirements/instances-model.js";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_f14_test_${suffix}`,
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
  const day = today(),
    later = (n: number) =>
      new Date(Date.parse(day + "T00:00:00Z") + n * 86400000)
        .toISOString()
        .slice(0, 10);
  const year = await config("academic-years", {
    code: "CHECKLIST-YEAR",
    name: "Checklist academic year",
    startsOn: later(-60),
    endsOn: later(400),
  });
  const otherYear = await config("academic-years", {
    code: "OTHER-YEAR",
    name: "Other academic year",
    startsOn: later(-60),
    endsOn: later(400),
  });
  const sem = await config("semesters", {
    code: "CHECKLIST-SEM",
    name: "Checklist semester",
    academicYearId: year.id,
    startsOn: day,
    endsOn: later(100),
  });
  const second = await config("semesters", {
    code: "NEXT-SEM",
    name: "Next checklist semester",
    academicYearId: year.id,
    startsOn: later(120),
    endsOn: later(230),
  });
  const other = await config("semesters", {
    code: "WRONG-YEAR",
    name: "Other year semester",
    academicYearId: otherYear.id,
    startsOn: day,
    endsOn: later(100),
  });
  const ok = async (r: Promise<LightMyRequestResponse>) => {
    const v = await r;
    assert.equal(v.statusCode, 200, v.body);
    return v;
  };
  const person = (
    await ok(
      request("staff", "/api/v1/scholars", {
        expectedVersion: 0,
        reason: "Synthetic requirement scholar",
        fields: {
          firstName: "Ada",
          lastName: "Checklist",
          academicYearId: year.id,
          contact: {},
        },
      }),
    )
  ).json<{ id: string }>();
  const annual = (
    await ok(
      request("staff", `/api/v1/scholars/${person.id}/scholarships`, {
        academicYearId: year.id,
        expectedVersion: 0,
        effectiveOn: day,
        reason: "Synthetic annual application",
        reference: "APPLICATION-001",
      }),
    )
  ).json<{ id: string }>();
  const path = `/api/v1/scholarships/${annual.id}/requirements`,
    generate = path + "/generate";
  const body = {
    semesterId: sem.id,
    expectedSemesterVersion: sem.version,
    reason: "Generate referenced physical checklist",
    reference: "CHECKLIST-001",
  };
  const list = async () =>
    (await ok(request("staff", path))).json<{ items: RequirementChecklist[] }>()
      .items;
  for (const role of ["system_admin", "unassigned"]) {
    expectError(await request(role, path), 403, "PERMISSION_DENIED");
    expectError(await request(role, generate, body), 403, "PERMISSION_DENIED");
  }
  assert.equal((await app.inject(path)).statusCode, 401);
  assert.deepEqual(await list(), []);
  pass(
    "Only Staff and Coordinator can access scholar checklists and generate obligations",
  );
  expectError(
    await request("staff", generate, body),
    409,
    "NO_APPLICABLE_REQUIREMENTS",
  );
  assert.deepEqual(await list(), []);
  const define = async (code: string, extra: object = {}) =>
    (
      await ok(
        request("system_admin", "/api/v1/requirement-definitions", {
          action: "create",
          code,
          expectedVersion: 0,
          reason: "Approved synthetic policy",
          reference: "POLICY-001",
          fields: {
            name: code + " physical requirement",
            instructions: "Present physical " + code + " document.",
            appliesTo: "semester",
            semesterId: null,
            effectiveFrom: day,
            effectiveUntil: null,
            ...extra,
          },
        }),
      )
    ).json<{ id: string; definitionId: string }>();
  const cor = await define("COR");
  const cog = await define("COG", { semesterId: sem.id });
  await define("PAYOUT-ONLY", { appliesTo: "payout" });
  await define("WRONG-PERIOD", { semesterId: other.id });
  await define("FUTURE", { effectiveFrom: later(1) });
  await define("EXPIRED", { effectiveFrom: later(-10), effectiveUntil: day });
  const withdrawn = await define("WITHDRAWN", { effectiveFrom: later(-10) });
  await ok(
    request(
      "system_admin",
      "/api/v1/requirement-definitions/" + withdrawn.definitionId,
      {
        action: "archive",
        expectedVersion: 1,
        effectiveFrom: day,
        reason: "Withdraw before semester begins",
        reference: "WITHDRAW-001",
      },
    ),
  );
  pass(
    "No-policy generation fails without freezing an empty checklist; applicability fixtures configured",
  );
  expectError(
    await request("staff", generate, { ...body, semesterId: other.id }),
    409,
    "WRONG_ACADEMIC_YEAR",
  );
  expectError(
    await request("staff", generate, { ...body, semesterId: randomUUID() }),
    422,
    "REFERENCE_NOT_FOUND",
  );
  expectError(
    await request(
      "staff",
      `/api/v1/scholarships/${randomUUID()}/requirements/generate`,
      body,
    ),
    404,
    "SCHOLARSHIP_NOT_FOUND",
  );
  expectError(
    await request("staff", generate, { ...body, expectedSemesterVersion: 99 }),
    409,
    "VERSION_CONFLICT",
  );
  for (const forged of [
    { effectiveOn: later(1) },
    { definitionVersionIds: [cor.id] },
    { actorId: accounts.get("coordinator")!.id },
    { status: "verified" },
    { appliesTo: "payout" },
  ])
    expectError(
      await request("staff", generate, { ...body, ...forged }),
      422,
      "VALIDATION_FAILED",
    );
  pass(
    "Wrong-year, missing/stale references and forged policy date, versions, actor or status are rejected",
  );
  const [beforeAnnual] = await admin.execute<RowDataPacket[]>(
    "SELECT * FROM scholarship_records WHERE id=?",
    [annual.id],
  );
  const key = randomUUID();
  const first = (
    await ok(request("staff", generate, body, key))
  ).json<GenerationResult>();
  assert.equal(first.created, true);
  assert.equal(first.count, 2);
  const checklist = (await list())[0];
  assert.equal(checklist.policyDate, day);
  assert.equal(checklist.actorName, "Synthetic staff");
  assert.deepEqual(
    checklist.items.map((i) => i.code),
    ["COG", "COR"],
  );
  assert.ok(checklist.items.every((i) => i.status === "not_submitted"));
  assert.deepEqual(
    new Set(checklist.items.map((i) => i.definitionVersionId)),
    new Set([cor.id, cog.id]),
  );
  const [afterAnnual] = await admin.execute<RowDataPacket[]>(
    "SELECT * FROM scholarship_records WHERE id=?",
    [annual.id],
  );
  assert.deepEqual(afterAnnual, beforeAnnual);
  pass(
    "Generation uses server semester date, includes only applicable definitions and leaves qualification/status unchanged",
  );
  assert.deepEqual(
    (await ok(request("staff", generate, body, key))).json(),
    first,
  );
  const repeated = (
    await ok(request("coordinator", generate, body))
  ).json<GenerationResult>();
  assert.equal(repeated.id, first.id);
  assert.equal(repeated.created, false);
  assert.equal(repeated.count, 2);
  expectError(
    await request("staff", generate, { ...body, reference: "CHANGED" }, key),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  assert.deepEqual((await list())[0], checklist);
  const [audit] = await admin.execute<RowDataPacket[]>(
    "SELECT actor_id,details FROM audit_logs WHERE event_type='requirements.generated' AND entity_id=?",
    [first.id],
  );
  assert.equal(audit.length, 1);
  assert.equal(audit[0].actor_id, accounts.get("staff")!.id);
  assert.equal(JSON.parse(audit[0].details).policyDate, day);
  pass(
    "Same-key retries and different-actor generation preserve IDs, counts, attribution and one generation audit",
  );
  await ok(
    request(
      "system_admin",
      "/api/v1/requirement-definitions/" + cor.definitionId,
      {
        action: "revise",
        expectedVersion: 1,
        reason: "Future policy meaning changed",
        reference: "POLICY-002",
        fields: {
          name: "Future registration policy",
          instructions: "New future instructions.",
          appliesTo: "semester",
          semesterId: null,
          effectiveFrom: later(1),
          effectiveUntil: null,
        },
      },
    ),
  );
  await define("LATE-ADDITION");
  const updatedSem = (
    await ok(
      request("system_admin", "/api/v1/configuration/semesters/" + sem.id, {
        action: "update",
        expectedVersion: sem.version,
        reason: "Adjust reference semester start",
        fields: {
          code: sem.code,
          name: "Renamed semester",
          academicYearId: year.id,
          startsOn: later(2),
          endsOn: later(100),
        },
      }),
    )
  ).json<ConfigRecord>();
  assert.deepEqual(
    (
      await ok(
        request("coordinator", generate, {
          ...body,
          expectedSemesterVersion: updatedSem.version,
        }),
      )
    ).json<GenerationResult>(),
    repeated,
  );
  assert.deepEqual((await list())[0], checklist);
  pass(
    "Later policy additions/revisions and semester edits never reinterpret or append to an existing checklist",
  );
  const concurrent = await Promise.all([
    request("staff", generate, {
      ...body,
      semesterId: second.id,
      expectedSemesterVersion: second.version,
    }),
    request("coordinator", generate, {
      ...body,
      semesterId: second.id,
      expectedSemesterVersion: second.version,
    }),
  ]);
  assert.ok(
    concurrent.every((r) => r.statusCode === 200),
    concurrent.map((r) => r.body).join("\n"),
  );
  const results = concurrent.map((r) => r.json<GenerationResult>());
  assert.equal(results[0].id, results[1].id);
  assert.deepEqual(results.map((r) => r.created).sort(), [false, true]);
  const nextList = (await list()).find((c) => c.semesterId === second.id)!;
  assert.equal(nextList.items.find((i) => i.code === "COR")!.revision, 2);
  assert.ok(!nextList.items.some((i) => i.code === "COG"));
  pass(
    "Concurrent generation creates one complete checklist; another semester independently selects its applicable versions",
  );
  const snapshotPolicy = await define("SNAPSHOT-POLICY");
  await new AuthorizationService(runtime).withPermission(
    accounts.get("staff")!.id,
    "requirements.generate",
    async (dbConnection) => {
      // withPermission has already established the authorization read snapshot.
      await ok(
        request(
          "system_admin",
          "/api/v1/requirement-definitions/" + snapshotPolicy.definitionId,
          {
            action: "revise",
            expectedVersion: 1,
            reason: "Policy committed while generator waits",
            reference: "SNAPSHOT-002",
            fields: {
              name: "Current committed policy",
              instructions: "Current physical policy.",
              appliesTo: "semester",
              semesterId: null,
              effectiveFrom: later(1),
              effectiveUntil: null,
            },
          },
        ),
      );
      await dbConnection.query(
        "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
      );
      const applicable = await applicableRequirements(dbConnection, {
        semesterId: second.id,
        appliesTo: "semester",
        effectiveOn: later(120),
      });
      assert.equal(
        applicable.find((v) => v.definitionId === snapshotPolicy.definitionId)!
          .revision,
        2,
      );
    },
  );
  pass(
    "Policy resolution sees committed versions even when authorization established an older read snapshot",
  );
  const rollbackSem = await config("semesters", {
      code: "ROLLBACK-SEM",
      name: "Rollback semester",
      academicYearId: year.id,
      startsOn: day,
      endsOn: later(100),
    }),
    rollbackBody = {
      ...body,
      semesterId: rollbackSem.id,
      expectedSemesterVersion: rollbackSem.version,
    },
    rollbackKey = randomUUID();
  await admin.query(
    "CREATE TRIGGER fail_generation_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='requirements.generated' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (await request("staff", generate, rollbackBody, rollbackKey)).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_generation_audit");
  }
  const [missing] = await admin.execute<RowDataPacket[]>(
    "SELECT id FROM requirement_checklists WHERE semester_id=?",
    [rollbackSem.id],
  );
  assert.equal(missing.length, 0);
  await ok(request("staff", generate, rollbackBody, rollbackKey));
  pass(
    "Audit failure rolls back checklist, all instances and receipt; exact retry can succeed",
  );
  for (const sql of [
    "EXPLAIN UPDATE requirement_checklists SET policy_date=policy_date WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_checklists WHERE 1=0",
    "EXPLAIN UPDATE requirement_instances SET definition_version_id=definition_version_id WHERE 1=0",
    "EXPLAIN UPDATE requirement_instances SET status=status WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_instances WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_generation_commands WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  await assert.rejects(
    runtime.execute(
      "INSERT INTO requirement_instances(id,checklist_id,definition_version_id,status,created_at) VALUES(?,?,?,'not_submitted',UTC_TIMESTAMP(6))",
      [randomUUID(), first.id, cor.id],
    ),
    (e: unknown) => (e as { code: string }).code === "ER_DUP_ENTRY",
  );
  const actor = accounts.get("staff")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: generate,
        headers: { cookie: actor.cookie, origin },
        payload: body,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (await request("staff", path, body, randomUUID(), "PATCH")).statusCode,
    404,
  );
  pass(
    "Database uniqueness, immutable grants, absent generic writes and CSRF protect generated obligations",
  );
  await ok(
    request("system_admin", "/api/v1/configuration/semesters/" + sem.id, {
      action: "lock",
      expectedVersion: updatedSem.version,
      reason: "Close semester checklist period",
    }),
  );
  expectError(
    await request("staff", generate, {
      ...body,
      expectedSemesterVersion: updatedSem.version + 1,
    }),
    423,
    "RECORD_LOCKED",
  );
  assert.deepEqual(
    (await ok(request("staff", generate, body, key))).json(),
    first,
  );
  const locked = (await list()).find((c) => c.id === first.id)!;
  assert.equal(locked.periodUnavailable, true);
  assert.deepEqual(locked.items, checklist.items);
  pass(
    "Locked periods block new commands, preserve historical reads and allow exact completed-command retries",
  );
  const archivedSem = await config("semesters", {
    code: "ARCHIVED-SEM",
    name: "Archived semester",
    academicYearId: year.id,
    startsOn: day,
    endsOn: later(100),
  });
  await ok(
    request(
      "system_admin",
      "/api/v1/configuration/semesters/" + archivedSem.id,
      {
        action: "archive",
        expectedVersion: archivedSem.version,
        reason: "Withdraw unused semester",
      },
    ),
  );
  expectError(
    await request("staff", generate, { ...body, semesterId: archivedSem.id }),
    409,
    "REFERENCE_ARCHIVED",
  );
  if (!process.argv.includes("--browser")) {
    await ok(
      request(
        "system_admin",
        "/api/v1/configuration/academic-years/" + year.id,
        {
          action: "lock",
          expectedVersion: year.version,
          reason: "Close academic year records",
        },
      ),
    );
    expectError(
      await request("staff", generate, { ...body, semesterId: second.id }),
      423,
      "RECORD_LOCKED",
    );
  }
  pass(
    "Archived semesters and locked academic years block generation without hiding history",
  );
  console.log(
    `All ${passed} requirement generation scenarios passed in an isolated disposable database.`,
  );
  if (process.argv.includes("--browser")) {
    await config("semesters", {
      code: "BROWSER-SEM",
      name: "Browser checklist semester",
      academicYearId: year.id,
      startsOn: day,
      endsOn: later(100),
    });
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
    console.log("Disposable F14 browser fixture ready on port 3003.");
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f14_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
