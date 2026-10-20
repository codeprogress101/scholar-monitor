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
import type { RequirementChecklist } from "../server/requirements/instances-model.js";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_receiving_test_${suffix}`,
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
  const ok = async <T>(
    response: Promise<LightMyRequestResponse>,
  ): Promise<T> => {
    const r = await response;
    assert.equal(r.statusCode, 200, r.body);
    return r.json<T>();
  };
  const evidence = {
    reason: "Synthetic automatic receiving test",
    reference: "AUTO-RECEIVE",
  };
  const year = await config("academic-years", {
    code: "AUTO-YEAR",
    name: "Automatic receiving year",
    startsOn: later(-30),
    endsOn: later(300),
  });
  const sem = await config("semesters", {
    code: "AUTO-SEM",
    name: "Current semester",
    academicYearId: year.id,
    startsOn: day,
    endsOn: later(100),
  });
  const person = await ok<{ id: string }>(
    request("staff", "/api/v1/scholars", {
      expectedVersion: 0,
      reason: evidence.reason,
      fields: {
        firstName: "Automatic",
        lastName: "Receiving",
        academicYearId: year.id,
        contact: {},
      },
    }),
  );
  const annual = await ok<{ id: string }>(
    request("staff", `/api/v1/scholars/${person.id}/scholarships`, {
      academicYearId: year.id,
      expectedVersion: 0,
      effectiveOn: day,
      ...evidence,
    }),
  );
  const path = `/api/v1/scholarships/${annual.id}/requirements`;
  const defs: { id: string; definitionId: string; version: number }[] = [];
  for (const code of ["COR", "COG", "EXTRA"])
    defs.push(
      await ok(
        request("system_admin", "/api/v1/requirement-definitions", {
          action: "create",
          code,
          expectedVersion: 0,
          ...evidence,
          fields: {
            name: code,
            instructions: "Physical test document",
            appliesTo: "payout",
            semesterId: sem.id,
            effectiveFrom: day,
            effectiveUntil: null,
          },
        }),
      ),
    );
  await ok(
    request("system_admin", "/api/v1/requirement-definitions", {
      action: "create",
      code: "SEMESTER",
      expectedVersion: 0,
      ...evidence,
      fields: {
        name: "Semester document",
        instructions: "Semester only",
        appliesTo: "semester",
        semesterId: sem.id,
        effectiveFrom: day,
        effectiveUntil: null,
      },
    }),
  );
  const payoutBody = {
    action: "create",
    code: "AUTO-PAYOUT",
    semesterId: sem.id,
    expectedSemesterVersion: sem.version,
    expectedVersion: 0,
    ...evidence,
    fields: {
      name: "Automatic payout",
      targetDate: day,
      requirements: defs
        .slice(0, 2)
        .map((d) => ({ definitionVersionId: d.id, allowWaiver: false })),
    },
  };
  let cycle = await ok<{ id: string; version: number }>(
    request("system_admin", "/api/v1/payout-cycles", payoutBody),
  );
  cycle = await ok(
    request("coordinator", `/api/v1/payout-cycles/${cycle.id}/open`, {
      action: "open",
      expectedVersion: cycle.version,
      ...evidence,
    }),
  );
  const list = () =>
    ok<{ items: RequirementChecklist[] }>(request("staff", path));
  const periods = () =>
    ok<{
      items: import("../server/requirements/instances-model.js").ReceivingPeriod[];
    }>(request("staff", path + "/receiving-periods"));
  const provision = (periodId = cycle.id, key = randomUUID()) =>
    request("staff", path + "/provision", { periodId }, key);
  assert.equal((await list()).items.length, 0);
  const choices = await periods();
  assert.equal(
    choices.items.filter((p) => p.preferred && p.payoutCycleId).length,
    1,
  );
  const first = await ok(provision());
  // An open financial cycle can outlive its semester. It stays available for
  // explicit historical work, but must not displace current receiving.
  try {
    await root.execute("UPDATE semesters SET starts_on=?,ends_on=? WHERE id=?", [later(-25), later(-1), sem.id]);
    const historical = (await periods()).items.find(p => p.id === cycle.id);
    assert.ok(historical);
    assert.equal(historical.preferred, false);
    assert.equal(historical.canProvision, true);
  } finally {
    await root.execute("UPDATE semesters SET starts_on=?,ends_on=? WHERE id=?", [day, later(100), sem.id]);
  }
  assert.equal((await periods()).items.find(p => p.id === cycle.id)?.preferred, true);
  pass("Open payout in an ended semester stays accessible but is not the default receiving period");
  const repeated = await Promise.all([provision(), provision(), provision()]);
  for (const response of repeated)
    assert.equal(response.statusCode, 200, response.body);
  const checklist = (await list()).items[0];
  assert.equal((first as { id: string }).id, checklist.id);
  assert.deepEqual(
    checklist.items.map((i) => i.code),
    ["COG", "COR"],
  );
  assert.deepEqual(
    new Set(checklist.items.map((i) => i.definitionVersionId)),
    new Set(defs.slice(0, 2).map((d) => d.id)),
  );
  assert.equal((await list()).items.length, 1);
  pass(
    "Automatic provisioning reuses F14, concurrent reopening creates no duplicates, payout policy excludes unrelated definitions",
  );
  // New policy revisions must not replace the payout's pinned definitions or old instances.
  const [definitionRows] = await root.query<RowDataPacket[]>(
    "SELECT definition_id FROM requirement_definition_versions WHERE id=?",
    [defs[0].id],
  );
  await ok(
    request(
      "system_admin",
      `/api/v1/requirement-definitions/${definitionRows[0].definition_id}`,
      {
        action: "revise",
        expectedVersion: 1,
        ...evidence,
        fields: {
          name: "Changed COR",
          instructions: "Changed policy",
          appliesTo: "payout",
          semesterId: sem.id,
          effectiveFrom: later(1),
          effectiveUntil: null,
        },
      },
    ),
  );
  await ok(provision());
  assert.deepEqual((await list()).items[0], checklist);
  pass(
    "Policy revision and reopening preserve historical instance IDs and exact definition versions",
  );
  const receivePath = `/api/v1/requirement-checklists/${checklist.id}/receive`;
  const body = {
    items: checklist.items.map((i) => ({
      id: i.id,
      expectedVersion: i.version,
    })),
    receivedOn: day,
    physicalReference: null,
    storageLocation: null,
    remarks: null,
  };
  const invalidRow = await request("staff", receivePath, {
    ...body,
    items: [{ id: body.items[0].id, expectedVersion: -1 }],
  });
  expectError(invalidRow, 422, "VALIDATION_FAILED");
  assert.ok(invalidRow.json().error.request_id);
  assert.ok(
    invalidRow
      .json()
      .error.details.issues.some(
        (issue: { path: unknown[] }) =>
          JSON.stringify(issue.path) ===
          JSON.stringify(["items", 0, "expectedVersion"]),
      ),
  );
  for (const role of ["system_admin", "unassigned"]) {
    expectError(
      await request(role, receivePath, body),
      403,
      "PERMISSION_DENIED",
    );
    expectError(
      await request(role, path + "/provision", { periodId: cycle.id }),
      403,
      "PERMISSION_DENIED",
    );
  }
  assert.equal(
    (await app.inject({ method: "POST", url: receivePath, payload: body }))
      .statusCode,
    401,
  );
  expectError(
    await request("staff", receivePath, {
      ...body,
      actorId: accounts.get("coordinator")!.id,
    }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request("staff", path + "/provision", {
      periodId: cycle.id,
      actorId: randomUUID(),
    }),
    422,
    "VALIDATION_FAILED",
  );
  pass(
    "Session authentication and server permissions enforced; forged actor fields rejected",
  );
  const sorted = [...body.items].sort((a, b) => a.id.localeCompare(b.id));
  expectError(
    await request("staff", receivePath, {
      ...body,
      items: [sorted[0], { ...sorted[1], expectedVersion: 99 }],
    }),
    409,
    "VERSION_CONFLICT",
  );
  assert.ok(
    (await list()).items[0].items.every(
      (i) => i.status === "not_submitted" && !i.receipt,
    ),
  );
  const [emptyAudit] = await root.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM audit_logs WHERE event_type='requirements.received' AND entity_id IN (?,?)",
    sorted.map((i) => i.id),
  );
  assert.equal(emptyAudit[0].n, 0);
  await admin.query(
    `CREATE TRIGGER fail_second_receipt BEFORE INSERT ON requirement_receipts FOR EACH ROW BEGIN IF NEW.instance_id=${admin.escape(sorted[1].id)} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic second receipt failure'; END IF; END`,
  );
  const receiptKey = randomUUID();
  try {
    assert.equal(
      (await request("staff", receivePath, body, receiptKey)).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_second_receipt");
  }
  assert.ok(
    (await list()).items[0].items.every(
      (i) => i.status === "not_submitted" && !i.receipt,
    ),
  );
  pass(
    "Stale second item and injected second-insert failure roll back receipts and audit atomically",
  );
  const received = await ok(request("staff", receivePath, body, receiptKey));
  assert.deepEqual(
    await ok(request("staff", receivePath, body, receiptKey)),
    received,
  );
  const submitted = (await list()).items[0];
  assert.ok(
    submitted.items.every(
      (i) => i.status === "submitted" && i.version === 1 && i.receipt,
    ),
  );
  const [receiptRows] = await root.query<RowDataPacket[]>(
    "SELECT actor_id,storage_location FROM requirement_receipts WHERE instance_id IN (?,?)",
    sorted.map((i) => i.id),
  );
  assert.equal(receiptRows.length, 2);
  assert.ok(
    receiptRows.every(
      (r) =>
        r.actor_id === accounts.get("staff")!.id && r.storage_location === "",
    ),
  );
  expectError(
    await request("staff", receivePath, body),
    409,
    "REQUIREMENT_ALREADY_RECEIVED",
  );
  pass(
    "Batch succeeds with optional custody fields; exact retry is safe; documents are Submitted, never Verified, with authenticated actor",
  );
  await ok(provision(sem.id));
  const semesterChecklist = (await list()).items.find((c) => !c.payoutCycleId)!;
  expectError(
    await request("staff", receivePath, {
      ...body,
      items: [{ id: semesterChecklist.items[0].id, expectedVersion: 0 }],
    }),
    422,
    "WRONG_CHECKLIST",
  );
  // A second open payout must require an explicit selection in the UI.
  let secondCycle = await ok<{ id: string; version: number }>(
    request("system_admin", "/api/v1/payout-cycles", {
      ...payoutBody,
      code: "SECOND-PAYOUT",
    }),
  );
  secondCycle = await ok(
    request("coordinator", `/api/v1/payout-cycles/${secondCycle.id}/open`, {
      action: "open",
      expectedVersion: secondCycle.version,
      ...evidence,
    }),
  );
  assert.equal(
    (await periods()).items.filter((p) => p.preferred && p.payoutCycleId)
      .length,
    2,
  );
  await ok(provision(secondCycle.id));
  const secondChecklist = (await list()).items.find(
    (c) => c.payoutCycleId === secondCycle.id,
  )!;
  for (const action of ["lock", "close"]) {
    secondCycle = await ok(
      request(
        "coordinator",
        `/api/v1/payout-cycles/${secondCycle.id}/${action}`,
        { action, expectedVersion: secondCycle.version, ...evidence },
      ),
    );
    expectError(await provision(secondCycle.id), 423, "PERIOD_UNAVAILABLE");
    expectError(
      await request(
        "staff",
        `/api/v1/requirement-checklists/${secondChecklist.id}/receive`,
        {
          ...body,
          items: secondChecklist.items.map((i) => ({
            id: i.id,
            expectedVersion: 0,
          })),
        },
      ),
      423,
      "PAYOUT_NOT_OPEN",
    );
    assert.ok(
      (await list()).items
        .find((c) => c.id === secondChecklist.id)!
        .items.every((i) => !i.receipt),
    );
  }
  pass(
    "Multiple open periods exposed for explicit selection; locked and closed payout history stays viewable and cannot receive",
  );
  if (process.argv.includes("--browser")) {
    // Leave one fresh payout available for the real browser acceptance flow.
    const browserPerson = await ok<{ id: string }>(
      request("staff", "/api/v1/scholars", {
        expectedVersion: 0,
        reason: evidence.reason,
        fields: {
          firstName: "Browser",
          lastName: "Receiving",
          academicYearId: year.id,
          contact: {},
        },
      }),
    );
    await ok(
      request("staff", `/api/v1/scholars/${browserPerson.id}/scholarships`, {
        academicYearId: year.id,
        expectedVersion: 0,
        effectiveOn: day,
        ...evidence,
      }),
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
    console.log("Disposable receiving browser fixture ready on port 3003.");
    await finished;
    await fixture.close();
  }
  const retained = (await list()).items;
  const newWorking = await config("academic-years", { code: "WORKING-OTHER", name: "Working year for navigation", startsOn: day, endsOn: later(300) });
  await config("settings", { code: "LDSS_WORKING_ACADEMIC_YEAR", name: "Working academic year", valueType: "text", value: newWorking.id });
  assert.equal((await periods()).items.some(p => p.preferred || p.canProvision), false);
  assert.deepEqual((await list()).items, retained);
  pass("Designated working year excludes other calendars from daily receiving while saved document history remains intact");
  await ok(
    request("system_admin", `/api/v1/configuration/academic-years/${year.id}`, {
      action: "lock",
      expectedVersion: year.version,
      reason: evidence.reason,
    }),
  );
  expectError(await provision(sem.id), 423, "PERIOD_UNAVAILABLE");
  expectError(
    await request(
      "staff",
      `/api/v1/requirement-checklists/${semesterChecklist.id}/receive`,
      {
        ...body,
        items: semesterChecklist.items.map((i) => ({
          id: i.id,
          expectedVersion: 0,
        })),
      },
    ),
    423,
    "RECORD_LOCKED",
  );
  assert.deepEqual(
    (await list()).items.find((c) => c.id === checklist.id)!.items,
    submitted.items,
  );
  pass(
    "Locked academic year prevents provisioning and receipt without altering history",
  );
  console.log(`All ${passed} automatic/batch receiving scenarios passed.`);
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_receiving_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
