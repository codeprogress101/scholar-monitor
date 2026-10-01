import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { applyMigrations, grantAuthRuntime } from "./migration-lib.mjs";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { AuthService } from "../server/auth/service.js";
import { newToken } from "../server/auth/crypto.js";
import { AuthorizationService } from "../server/authorization/service.js";
import type { ScholarResult } from "../server/scholars/model.js";
import type { StatusView } from "../server/status/model.js";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_f07_test_${suffix}`,
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
    code: "STATUS-2026",
    name: "Status workflow fixture",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
  });
  const response = await request("staff", "/api/v1/scholars", {
    expectedVersion: 0,
    reason: "Synthetic status fixture",
    fields: {
      firstName: "Test",
      lastName: "Status",
      academicYearId: year.id,
      contact: {},
    },
  });
  assert.equal(response.statusCode, 200, response.body);
  const person = response.json<ScholarResult>();
  const academicSchool = await config("schools", {
    code: "ACADEMIC-SCHOOL",
    name: "Synthetic academic school",
  });
  const academicCourse = await config("courses", {
    code: "ACADEMIC-COURSE",
    name: "Synthetic academic course",
  });
  const addAcademic = async (academicYearId: string) => {
    const response = await request(
      "staff",
      `/api/v1/scholars/${person.id}/academic-records`,
      {
        academicYearId,
        schoolId: academicSchool.id,
        courseId: academicCourse.id,
        yearLevel: "First year",
        reason: "Verified fixture academic record",
        reference: "Synthetic COR 01",
      },
    );
    assert.equal(response.statusCode, 200, response.body);
  };
  await addAcademic(year.id);

  const annual = await request(
    "staff",
    `/api/v1/scholars/${person.id}/scholarships`,
    {
      academicYearId: year.id,
      expectedVersion: 0,
      effectiveOn: "2026-09-01",
      reason: "Synthetic application",
      reference: "Fixture 01",
    },
  );
  assert.equal(annual.statusCode, 200, annual.body);
  let record = annual.json();
  for (const action of ["exam-passed", "qualify", "select"]) {
    const result = await request(
      "coordinator",
      `/api/v1/scholarships/${record.id}/qualification/${action}`,
      {
        expectedVersion: record.version,
        effectiveOn: "2026-09-01",
        reason: "Verified fixture decision",
        reference: "Fixture decision 02",
      },
    );
    assert.equal(result.statusCode, 200, result.body);
    record = result.json();
  }
  const path = `/api/v1/scholarships/${record.id}/status`;
  const view = async () => {
    const result = await request("staff", path);
    assert.equal(result.statusCode, 200, result.body);
    return result.json<StatusView>();
  };
  const proposal = (
    version: number,
    toStatus = "dropped",
    extra: object = {},
  ) => ({
    expectedVersion: version,
    toStatus,
    kind: "change",
    effectiveOn: "2026-09-02",
    reasonCode: "VERIFIED_CHANGE",
    reason: "Physical record verified",
    reference: "Status register 01",
    ...extra,
  });
  const send = (body: object, role = "staff", key = randomUUID()) =>
    request(role, path + "/requests", body, key);
  const decide = (
    id: string,
    action = "approve",
    role = "coordinator",
    key = randomUUID(),
  ) =>
    request(
      role,
      `/api/v1/status-requests/${id}/${action}`,
      { reason: "Reviewed status decision", reference: "Decision register 02" },
      key,
    );
  expectError(await send(proposal(1)), 409, "MASTERLIST_ACTIVATION_REQUIRED");
  assert.equal((await view()).statusAllowsPayout, false);
  for (const role of ["system_admin", "unassigned"]) {
    expectError(await request(role, path), 403, "PERMISSION_DENIED");
    expectError(await send(proposal(1), role), 403, "PERMISSION_DENIED");
  }
  assert.equal((await app.inject(path)).statusCode, 401);
  pass(
    "Private status endpoints deny technical/unassigned roles and cannot bypass official masterlist activation",
  );
  // ONLY this disposable fixture seeds activation; no production API or seed does this.
  await admin.execute(
    "UPDATE scholarship_records SET operational_status='active',status_version=1,status_effective_on='2026-09-01' WHERE id=?",
    [record.id],
  );
  const pending = await send(proposal(1));
  assert.equal(pending.statusCode, 200, pending.body);
  const requestId = pending.json().requestId;
  assert.equal((await view()).status, "active");
  expectError(
    await decide(requestId, "approve", "staff"),
    403,
    "PERMISSION_DENIED",
  );
  const approved = await decide(requestId);
  assert.equal(approved.statusCode, 200, approved.body);
  let current = await view();
  assert.equal(current.status, "dropped");
  assert.equal(current.statusAllowsPayout, false);
  assert.equal(
    current.requests[0].decision!.actorName,
    "Synthetic coordinator",
  );
  pass(
    "Staff terminal request stays pending until Coordinator approval; Dropped fails the payout status condition",
  );
  expectError(
    await send(proposal(2, "active")),
    409,
    "INVALID_STATE_TRANSITION",
  );
  assert.equal(
    (
      await request(
        "coordinator",
        `/api/v1/scholarships/${record.id}`,
        { operational_status: "active" },
        randomUUID(),
        "PATCH",
      )
    ).statusCode,
    404,
  );
  expectError(
    await send(
      proposal(2, "active", {
        kind: "correction",
        correctsRequestId: randomUUID(),
      }),
    ),
    409,
    "INVALID_CORRECTION",
  );
  const correction = await send(
    proposal(2, "active", { kind: "correction", correctsRequestId: requestId }),
  );
  assert.equal(correction.statusCode, 200, correction.body);
  assert.equal((await view()).status, "dropped");
  assert.equal((await decide(correction.json().requestId)).statusCode, 200);
  current = await view();
  assert.equal(current.status, "active");
  assert.equal(current.requests.length, 2);
  assert.ok(
    current.requests.some(
      (r) => r.id === requestId && r.decision?.action === "approve",
    ),
  );
  pass(
    "Terminal reversal rejects normal PATCH/requests; linked approved correction preserves original history",
  );
  const own = await send(proposal(3, "on_hold"), "coordinator");
  assert.equal(own.statusCode, 200);
  expectError(await decide(own.json().requestId), 403, "SELF_APPROVAL_DENIED");
  expectError(
    await decide(own.json().requestId, "cancel", "staff"),
    403,
    "PERMISSION_DENIED",
  );
  assert.equal((await decide(own.json().requestId, "cancel")).statusCode, 200);
  const rejection = await send(proposal(3, "suspended"));
  assert.equal(
    (await decide(rejection.json().requestId, "reject")).statusCode,
    200,
  );
  assert.equal((await view()).status, "active");
  expectError(
    await decide(rejection.json().requestId),
    409,
    "INVALID_STATE_TRANSITION",
  );
  pass(
    "Self-approval and another actor's cancellation are denied; rejection/cancellation preserve current status",
  );
  const key = randomUUID(),
    payload = proposal(3, "on_hold");
  const retries = await Promise.all([
    send(payload, "staff", key),
    send(payload, "staff", key),
  ]);
  retries.forEach((r) => assert.equal(r.statusCode, 200, r.body));
  assert.deepEqual(retries[0].json(), retries[1].json());
  expectError(
    await send({ ...payload, reason: "Different reason" }, "staff", key),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  const approvalKey = randomUUID();
  const results = await Promise.all([
    decide(retries[0].json().requestId, "approve", "coordinator", approvalKey),
    decide(retries[0].json().requestId, "approve", "coordinator", approvalKey),
  ]);
  results.forEach((r) => assert.equal(r.statusCode, 200, r.body));
  assert.deepEqual(results[0].json(), results[1].json());
  assert.equal((await view()).version, 4);
  pass(
    "Concurrent retries create one request and one decision without duplicate status versions",
  );
  const a = await send(proposal(4, "active")),
    b = await send(proposal(4, "withdrawn"));
  const race = await Promise.all([
    decide(a.json().requestId),
    decide(b.json().requestId),
  ]);
  assert.deepEqual(race.map((r) => r.statusCode).sort(), [200, 409]);
  expectError(
    race.find((r) => r.statusCode === 409)!,
    409,
    "VERSION_CONFLICT",
  );
  // Restore Active using a valid correction if the terminal request won the race.
  current = await view();
  if (current.status !== "active") {
    const last = current.requests.find(
      (r) => r.decision?.resultingVersion === current.version,
    )!;
    const fix = await send(
      proposal(current.version, "on_hold", {
        kind: "correction",
        correctsRequestId: last.id,
      }),
    );
    assert.equal((await decide(fix.json().requestId)).statusCode, 200);
    current = await view();
    const resume = await send(proposal(current.version, "active"));
    assert.equal((await decide(resume.json().requestId)).statusCode, 200);
  }
  pass(
    "Competing approvals have one winner; stale proposals cannot overwrite current status",
  );
  current = await view();
  const rollback = await send(proposal(current.version, "suspended"));
  const before = await view();
  const rollbackKey = randomUUID();
  await admin.query(
    "CREATE TRIGGER fail_status_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='scholarship.status' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (
        await decide(
          rollback.json().requestId,
          "approve",
          "coordinator",
          rollbackKey,
        )
      ).statusCode,
      500,
    );
    assert.equal(
      (await send(proposal(current.version, "on_hold"))).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_status_audit");
  }
  assert.deepEqual(await view(), before);
  assert.equal(
    (
      await decide(
        rollback.json().requestId,
        "approve",
        "coordinator",
        rollbackKey,
      )
    ).statusCode,
    200,
  );
  pass(
    "Audit failure rolls back requests, decisions, current state and retry history",
  );
  current = await view();
  expectError(
    await send(
      proposal(current.version, "active", { effectiveOn: "2026-08-01" }),
    ),
    409,
    "INVALID_EFFECTIVE_DATE",
  );
  expectError(
    await send(
      proposal(current.version, "active", {
        reasonCode: "",
        approvedBy: "forged",
      }),
    ),
    422,
    "VALIDATION_FAILED",
  );
  const active = accounts.get("staff")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: path + "/requests",
        headers: {
          cookie: active.cookie,
          origin,
          "content-type": "application/json",
        },
        payload: proposal(current.version, "active"),
      })
    ).statusCode,
    403,
  );
  for (const sql of [
    "EXPLAIN UPDATE status_change_requests SET reason=reason WHERE 1=0",
    "EXPLAIN DELETE FROM status_change_requests WHERE 1=0",
    "EXPLAIN UPDATE status_change_decisions SET decision=decision WHERE 1=0",
    "EXPLAIN DELETE FROM status_change_decisions WHERE 1=0",
    "EXPLAIN UPDATE status_change_commands SET outcome=outcome WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  pass(
    "Dates, mandatory reasons/references, forged approval fields, CSRF and immutable-history grants are enforced",
  );
  const lockedRequest = await send(proposal(current.version, "active"));
  const locked = await request(
    "system_admin",
    "/api/v1/configuration/academic-years/" + year.id,
    {
      action: "lock",
      expectedVersion: year.version,
      reason: "Finalized fixture year",
    },
  );
  assert.equal(locked.statusCode, 200, locked.body);
  expectError(
    await decide(lockedRequest.json().requestId),
    409,
    "RECORD_LOCKED",
  );
  expectError(
    await send(proposal(current.version, "active")),
    409,
    "RECORD_LOCKED",
  );
  assert.equal(
    (await decide(lockedRequest.json().requestId, "reject")).statusCode,
    200,
  );
  pass(
    "Year locks block requests and approvals while preserving history and allowing rejection",
  );
  if (process.argv.includes("--browser")) {
    // Another active synthetic annual record in an unlocked period for browser verification.
    const browserYear = await config("academic-years", {
      code: "BROWSER-STATUS",
      name: "Status browser fixture",
      startsOn: "2027-01-01",
      endsOn: "2027-12-31",
    });
    await admin.execute(
      "INSERT INTO scholarship_records (id,scholar_id,academic_year_id,status,version,last_effective_on,operational_status,status_version,status_effective_on,created_at,updated_at) VALUES (?,?,?,'selected',4,'2026-09-01','active',1,'2026-09-01',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
      [randomUUID(), person.id, browserYear.id],
    );
  }
  console.log(
    `All ${passed} status scenarios passed in an isolated disposable database.`,
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
      "Disposable status browser fixture ready on port 3003; staff@example.invalid, coordinator@example.invalid and system_admin@example.invalid. Stop at /__fixture/stop.",
    );
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f07_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
