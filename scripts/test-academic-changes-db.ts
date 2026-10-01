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
import type { AcademicChangeView } from "../server/academic/changes-model.js";
import type { AcademicRecord } from "../server/academic/model.js";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_f09_test_${suffix}`,
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
    "reviewer",
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
        roles: [role === "reviewer" ? "coordinator" : role],
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
  const school = await config("schools", {
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
  const newSchool = await config("schools", {
    code: "TRANSFER-SCHOOL",
    name: "Transfer College",
  });
  const newCourse = await config("courses", {
    code: "SHIFT-COURSE",
    name: "New Degree",
  });
  assert.equal((await request("staff", path, body())).statusCode, 200);
  assert.equal(
    (await request("staff", path, body(nextYear.id))).statusCode,
    200,
  );
  const original = (await list()).find((r) => r.academicYearId === year.id)!;
  const priorYear = (await list()).find(
    (r) => r.academicYearId === nextYear.id,
  )!;
  const changes = `/api/v1/academic-records/${original.id}/changes`;
  const proposal = {
    expectedVersion: 0,
    kind: "course_shift",
    schoolId: school.id,
    courseId: newCourse.id,
    yearLevel: "First year",
    effectiveOn: "2026-09-01",
    reason: "Verified course shift",
    reference: "Change register 01",
    remarks: "Synthetic test evidence",
  };
  const evidence = {
    reason: "Verified Coordinator decision",
    reference: "Decision register 01",
  };
  const view = async () => {
    const response = await request("staff", changes);
    assert.equal(response.statusCode, 200, response.body);
    return response.json<AcademicChangeView>();
  };
  const decide = (
    id: string,
    action = "approve",
    role = "coordinator",
    key = randomUUID(),
  ) => request(role, `/api/v1/academic-changes/${id}/${action}`, evidence, key);
  const createChange = async (p: object = proposal, role = "staff") => {
    const r = await request(role, changes, p);
    assert.equal(r.statusCode, 200, r.body);
    return r.json().requestId as string;
  };
  assert.equal((await app.inject(changes)).statusCode, 401);
  for (const role of ["system_admin", "unassigned"]) {
    expectError(await request(role, changes), 403, "PERMISSION_DENIED");
    expectError(
      await request(role, changes, proposal),
      403,
      "PERMISSION_DENIED",
    );
  }
  expectError(
    await request("staff", changes, {
      ...proposal,
      actorId: accounts.get("coordinator")!.id,
    }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request("staff", changes, { ...proposal, courseId: course.id }),
    409,
    "INVALID_ACADEMIC_CHANGE",
  );
  const first = await createChange();
  assert.equal((await view()).current.courseId, course.id);
  expectError(
    await decide(first, "approve", "staff"),
    403,
    "PERMISSION_DENIED",
  );
  const self = await createChange(proposal, "coordinator");
  expectError(await decide(self), 403, "SELF_APPROVAL_DENIED");
  expectError(
    await decide(first, "cancel", "coordinator"),
    403,
    "CANCEL_DENIED",
  );
  assert.equal((await decide(self, "cancel")).statusCode, 200);
  pass(
    "Permissions, input validation, pending state, separate approval and requester-only cancellation",
  );
  const approveKey = randomUUID();
  const approved = await decide(first, "approve", "coordinator", approveKey);
  assert.equal(approved.statusCode, 200, approved.body);
  assert.deepEqual(
    (await decide(first, "approve", "coordinator", approveKey)).json(),
    approved.json(),
  );
  expectError(
    await decide(first, "reject", "coordinator", approveKey),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  const current = await view();
  assert.equal(current.version, 1);
  assert.equal(current.current.courseId, newCourse.id);
  const history = current.requests.find((q) => q.id === first)!;
  assert.equal(history.before.courseId, course.id);
  assert.equal(history.after.courseId, newCourse.id);
  assert.equal(history.decision!.action, "approve");
  const [base] = await admin.execute<RowDataPacket[]>(
    "SELECT course_id FROM academic_records WHERE id=?",
    [original.id],
  );
  assert.equal(base[0].course_id, course.id);
  const [identity] = await admin.execute<RowDataPacket[]>(
    "SELECT scholar_id FROM academic_records WHERE id=?",
    [original.id],
  );
  assert.equal(identity[0].scholar_id, person.id);
  const profile = await request("staff", `/api/v1/scholars/${person.id}`);
  assert.equal(profile.json().scholarId, person.scholarId);
  assert.deepEqual(
    (await list()).find((r) => r.id === priorYear.id),
    priorYear,
  );
  assert.equal(
    (await list()).find((r) => r.id === original.id)!.courseId,
    newCourse.id,
  );
  pass(
    "Approved course shift preserves original entry, prior years, scholar identity and before/after history; retries are idempotent",
  );
  const transfer = {
    ...proposal,
    kind: "school_transfer",
    expectedVersion: 1,
    schoolId: newSchool.id,
  };
  const left = await createChange(transfer),
    right = await createChange(transfer);
  const results = await Promise.all([decide(left), decide(right, "approve", "reviewer")]);
  assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
  const stale = results[0].statusCode === 409 ? left : right;
  expectError(await decide(stale), 409, "VERSION_CONFLICT");
  assert.equal((await decide(stale, "reject")).statusCode, 200);
  assert.equal((await view()).version, 2);
  pass(
    "Concurrent school-transfer approvals commit once and stale requests remain rejectable",
  );
  const both = await createChange({
    ...proposal,
    kind: "both",
    expectedVersion: 2,
    schoolId: school.id,
    courseId: course.id,
  });
  assert.equal((await decide(both)).statusCode, 200);
  const correction = {
    ...proposal,
    kind: "year_level_correction",
    expectedVersion: 3,
    schoolId: school.id,
    courseId: course.id,
    yearLevel: "Second year",
  };
  const correctionId = await createChange(correction);
  assert.equal((await decide(correctionId)).statusCode, 200);
  assert.equal((await view()).current.yearLevel, "Second year");
  expectError(
    await request("staff", changes, {
      ...correction,
      expectedVersion: 4,
      yearLevel: "Third year",
      effectiveOn: "2026-08-31",
    }),
    409,
    "INVALID_EFFECTIVE_DATE",
  );
  pass(
    "Combined transfer/shift and separate year-level correction preserve a chronological revision chain",
  );
  const rename = await request(
    "system_admin",
    `/api/v1/configuration/courses/${newCourse.id}`,
    {
      action: "update",
      expectedVersion: newCourse.version,
      reason: "Rename synthetic course",
      fields: { code: newCourse.code, name: "Renamed Degree" },
    },
  );
  assert.equal(rename.statusCode, 200, rename.body);
  assert.equal(
    (await view()).requests.find((q) => q.id === first)!.after.course.name,
    "New Degree",
  );
  const archiveId = await createChange({
    ...proposal,
    expectedVersion: 4,
    yearLevel: "Second year",
  });
  const archived = await request(
    "system_admin",
    `/api/v1/configuration/courses/${newCourse.id}`,
    {
      action: "archive",
      expectedVersion: rename.json().version,
      reason: "Archive synthetic course",
    },
  );
  assert.equal(archived.statusCode, 200, archived.body);
  expectError(await decide(archiveId), 409, "REFERENCE_ARCHIVED");
  assert.equal((await decide(archiveId, "reject")).statusCode, 200);
  pass(
    "Renamed references preserve snapshots and references archived after request block approval",
  );
  const retryBody = {
      ...correction,
      expectedVersion: 4,
      yearLevel: "Third year",
    },
    retryKey = randomUUID();
  await admin.query(
    "CREATE TRIGGER fail_change_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type LIKE 'academic.change.%' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  const countBefore = (await view()).requests.length;
  try {
    assert.equal(
      (await request("staff", changes, retryBody, retryKey)).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_change_audit");
  }
  assert.equal((await view()).requests.length, countBefore);
  const retried = await request("staff", changes, retryBody, retryKey);
  assert.equal(retried.statusCode, 200, retried.body);
  const retryId = retried.json().requestId;
  await admin.query(
    "CREATE TRIGGER fail_change_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type LIKE 'academic.change.%' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal((await decide(retryId)).statusCode, 500);
  } finally {
    await admin.query("DROP TRIGGER fail_change_audit");
  }
  assert.equal((await view()).version, 4);
  assert.equal(
    (await view()).requests.find((q) => q.id === retryId)!.decision,
    null,
  );
  pass(
    "Audit failures roll back requests, decisions, current placement and command receipts",
  );
  const annualResponse = await request(
    "staff",
    `/api/v1/scholars/${person.id}/scholarships`,
    {
      expectedVersion: 0,
      academicYearId: year.id,
      effectiveOn: "2026-09-01",
      reason: "Synthetic activation guard",
      reference: "Synthetic register 01",
    },
  );
  assert.equal(annualResponse.statusCode, 200, annualResponse.body);
  await admin.execute(
    "UPDATE scholarship_records SET status='selected',operational_status='active',status_version=1,status_effective_on='2026-09-01' WHERE id=?",
    [annualResponse.json().id],
  );
  expectError(await decide(retryId), 409, "MASTERLIST_AMENDMENT_REQUIRED");
  expectError(
    await request("staff", changes, retryBody),
    409,
    "MASTERLIST_AMENDMENT_REQUIRED",
  );
  assert.equal((await view()).version, 4);
  assert.equal((await decide(retryId, "cancel", "staff")).statusCode, 200);
  pass(
    "Activated official records require amendment and cannot be rewritten; cancellation remains available",
  );
  const nextPath = `/api/v1/academic-records/${priorYear.id}/changes`;
  const pendingResponse = await request("staff", nextPath, {
    ...proposal,
    kind: "school_transfer",
    schoolId: newSchool.id,
    courseId: course.id,
  });
  assert.equal(pendingResponse.statusCode, 200, pendingResponse.body);
  const locked = await request(
    "system_admin",
    `/api/v1/configuration/academic-years/${nextYear.id}`,
    {
      action: "lock",
      expectedVersion: nextYear.version,
      reason: "Lock synthetic academic year",
    },
  );
  assert.equal(locked.statusCode, 200, locked.body);
  expectError(
    await decide(pendingResponse.json().requestId),
    409,
    "RECORD_LOCKED",
  );
  assert.equal(
    (await decide(pendingResponse.json().requestId, "reject")).statusCode,
    200,
  );
  for (const table of [
    "academic_changes",
    "academic_change_decisions",
    "academic_change_commands",
  ]) {
    await assert.rejects(
      runtime.query(`EXPLAIN DELETE FROM ${table} WHERE 1=0`),
    );
  }
  await assert.rejects(
    runtime.query(
      "EXPLAIN UPDATE academic_changes SET remarks=remarks WHERE 1=0",
    ),
  );
  assert.equal(
    (
      await request(
        "staff",
        changes,
        { yearLevel: "Overwrite" },
        randomUUID(),
        "PATCH",
      )
    ).statusCode,
    404,
  );
  const active = accounts.get("staff")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: changes,
        headers: {
          cookie: active.cookie,
          origin,
          "content-type": "application/json",
        },
        payload: proposal,
      })
    ).statusCode,
    403,
  );
  pass(
    "Year lock is rechecked at approval; history grants, no PATCH and CSRF protect commands",
  );
  console.log(
    `All ${passed} academic-change scenarios passed in an isolated disposable database.`,
  );
  if (process.argv.includes("--browser")) {
    const browserYear = await config("academic-years", {
      code: "BROWSER-YEAR",
      name: "Browser academic changes",
      startsOn: "2025-06-01",
      endsOn: "2026-05-31",
    });
    assert.equal(
      (await request("staff", path, body(browserYear.id))).statusCode,
      200,
    );
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
    console.log("Disposable F09 browser fixture ready on port 3003.");
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f09_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
