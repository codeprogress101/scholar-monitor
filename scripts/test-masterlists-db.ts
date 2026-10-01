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
  DraftDetail,
  DraftCandidate,
} from "../server/masterlists/model.js";
import type { AcademicRecord } from "../server/academic/model.js";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_f10_test_${suffix}`,
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
  const evidence = {
    reason: "Verified masterlist draft",
    reference: "Masterlist register 01",
  };
  const createDraft = async (
    academicYearId = year.id,
    title = "Synthetic masterlist",
  ) => {
    const r = await request("staff", "/api/v1/masterlists", {
      academicYearId,
      title,
      ...evidence,
    });
    assert.equal(r.statusCode, 200, r.body);
    return r.json() as { id: string; version: number };
  };
  const draft = await createDraft();
  const endpoint = `/api/v1/masterlists/${draft.id}`;
  const detail = async () => {
    const r = await request("staff", endpoint);
    assert.equal(r.statusCode, 200, r.body);
    return r.json<DraftDetail>();
  };
  const command = (
    action = "add",
    version = 1,
    scholarId = person.id,
    awardNumber: string | null = null,
    role = "staff",
    key = randomUUID(),
  ) =>
    request(
      role,
      endpoint + "/entries",
      { action, expectedVersion: version, scholarId, awardNumber, ...evidence },
      key,
    );
  assert.equal((await app.inject(endpoint)).statusCode, 401);
  for (const role of ["system_admin", "unassigned"]) {
    expectError(await request(role, endpoint), 403, "PERMISSION_DENIED");
    expectError(
      await request(role, "/api/v1/masterlists", {
        academicYearId: year.id,
        title: "Forbidden",
        ...evidence,
      }),
      403,
      "PERMISSION_DENIED",
    );
    expectError(
      await request(role, endpoint + "/candidates"),
      403,
      "PERMISSION_DENIED",
    );
  }
  pass(
    "Masterlist drafts and candidate data are private to Staff and Coordinators",
  );
  let r = await command();
  expectError(r, 422, "CANDIDATE_INVALID");
  assert.ok(
    r
      .json()
      .error.issues.some(
        (i: { code: string }) => i.code === "ACADEMIC_RECORD_REQUIRED",
      ),
  );
  assert.ok(
    r
      .json()
      .error.issues.some(
        (i: { code: string }) => i.code === "SCHOLARSHIP_RECORD_REQUIRED",
      ),
  );
  const suggestions = (await request("staff", endpoint + "/candidates")).json<{
    items: DraftCandidate[];
  }>();
  assert.equal(suggestions.items[0].snapshot, null);
  const annual = await request(
    "staff",
    `/api/v1/scholars/${person.id}/scholarships`,
    {
      expectedVersion: 0,
      academicYearId: year.id,
      effectiveOn: "2026-09-01",
      ...evidence,
    },
  );
  assert.equal(annual.statusCode, 200, annual.body);
  assert.equal((await request("staff", path, body())).statusCode, 200);
  assert.ok(
    (await command())
      .json()
      .error.issues.some(
        (i: { code: string }) => i.code === "SELECTION_REQUIRED",
      ),
  );
  let version = 1;
  for (const action of ["exam-passed", "qualify", "select"]) {
    const decision = await request(
      action === "exam-passed" ? "staff" : "coordinator",
      `/api/v1/scholarships/${annual.json().id}/qualification/${action}`,
      { expectedVersion: version, effectiveOn: "2026-09-01", ...evidence },
    );
    assert.equal(decision.statusCode, 200, decision.body);
    version++;
  }
  const otherDraft = await createDraft(nextYear.id, "Another year");
  r = await request("staff", `/api/v1/masterlists/${otherDraft.id}/entries`, {
    action: "add",
    expectedVersion: 1,
    scholarId: person.id,
    awardNumber: null,
    ...evidence,
  });
  expectError(r, 422, "CANDIDATE_INVALID");
  pass(
    "Structured validation reports missing same-year academic/scholarship data and requires Selected status",
  );
  const key = randomUUID();
  r = await command("add", 1, person.id, null, "staff", key);
  assert.equal(r.statusCode, 200, r.body);
  assert.deepEqual(
    (await command("add", 1, person.id, null, "staff", key)).json(),
    r.json(),
  );
  expectError(
    await command("remove", 2, person.id, null, "staff", key),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  expectError(await command("add", 2), 409, "DUPLICATE_ENTRY");
  let current = await detail();
  assert.equal(current.count, 1);
  assert.equal(current.validation.valid, true);
  assert.equal(current.entries[0].snapshot.humanId, person.scholarId);
  assert.equal(current.entries[0].awardNumber, null);
  const lists = (await request("staff", "/api/v1/masterlists")).json<{
    items: DraftDetail[];
  }>();
  assert.equal(lists.items.find((d) => d.id === draft.id)!.count, 1);
  await assert.rejects(
    admin.execute(
      "INSERT INTO masterlist_entries (id,masterlist_id,scholar_id,snapshot,created_at,updated_at) VALUES (?,?,?,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
      [randomUUID(), draft.id, person.id],
    ),
  );
  pass(
    "Eligible candidates produce clean snapshots, computed counts, database uniqueness and idempotent commands",
  );
  expectError(await command("remove", 1), 409, "VERSION_CONFLICT");
  assert.equal((await command("remove", 2)).statusCode, 200);
  current = await detail();
  assert.equal(current.count, 0);
  assert.equal(current.validation.issues[0].code, "EMPTY_DRAFT");
  const race = await Promise.all([
    command("add", 3, person.id, null, "staff"),
    command("add", 3, person.id, null, "coordinator"),
  ]);
  assert.deepEqual(race.map((x) => x.statusCode).sort(), [200, 409]);
  current = await detail();
  assert.equal(current.count, 1);
  assert.equal(current.version, 4);
  pass(
    "Removal preserves history and cross-user concurrent additions have one winner with correct counts",
  );
  const academic = (await list())[0];
  const change = await request(
    "staff",
    `/api/v1/academic-records/${academic.id}/changes`,
    {
      expectedVersion: 0,
      kind: "year_level_correction",
      schoolId: school.id,
      courseId: course.id,
      yearLevel: "Second year",
      effectiveOn: "2026-09-02",
      remarks: "",
      ...evidence,
    },
  );
  assert.equal(change.statusCode, 200, change.body);
  const approval = await request(
    "coordinator",
    `/api/v1/academic-changes/${change.json().requestId}/approve`,
    evidence,
  );
  assert.equal(approval.statusCode, 200, approval.body);
  current = await detail();
  assert.equal(current.entries[0].snapshot.placement.yearLevel, "First year");
  assert.equal(current.validation.issues[0].code, "SOURCE_CHANGED");
  expectError(
    await command("refresh", 4, person.id, person.scholarId),
    422,
    "CANDIDATE_INVALID",
  );
  assert.equal(
    (await command("refresh", 4, person.id, "AWARD-001")).statusCode,
    200,
  );
  current = await detail();
  assert.equal(current.entries[0].snapshot.placement.yearLevel, "Second year");
  assert.equal(current.entries[0].awardNumber, "AWARD-001");
  assert.equal(current.entries[0].snapshot.humanId, person.scholarId);
  assert.equal(current.validation.valid, true);
  pass(
    "Approved F09 changes flag stale draft snapshots; explicit refresh retains permanent IDs and separate award numbers",
  );
  const secondResponse = await request("staff", "/api/v1/scholars", {
    expectedVersion: 0,
    reason: "Synthetic second candidate",
    fields: {
      firstName: "Another",
      lastName: "Candidate",
      academicYearId: year.id,
      contact: {},
    },
  });
  assert.equal(secondResponse.statusCode, 200, secondResponse.body);
  const second = secondResponse.json<ScholarResult>();
  const secondAnnual = await request(
    "staff",
    `/api/v1/scholars/${second.id}/scholarships`,
    {
      expectedVersion: 0,
      academicYearId: year.id,
      effectiveOn: "2026-09-01",
      ...evidence,
    },
  );
  assert.equal(secondAnnual.statusCode, 200, secondAnnual.body);
  assert.equal(
    (
      await request(
        "staff",
        `/api/v1/scholars/${second.id}/academic-records`,
        body(),
      )
    ).statusCode,
    200,
  );
  for (const [index, action] of [
    "exam-passed",
    "qualify",
    "select",
  ].entries()) {
    const result = await request(
      action === "exam-passed" ? "staff" : "coordinator",
      `/api/v1/scholarships/${secondAnnual.json().id}/qualification/${action}`,
      { expectedVersion: index + 1, effectiveOn: "2026-09-01", ...evidence },
    );
    assert.equal(result.statusCode, 200, result.body);
  }
  expectError(
    await command("add", 5, second.id, "AWARD-001"),
    409,
    "DUPLICATE_AWARD_NUMBER",
  );
  assert.equal(
    (await command("add", 5, second.id, "AWARD-002")).statusCode,
    200,
  );
  assert.equal((await detail()).count, 2);
  const search = (
    await request(
      "staff",
      endpoint + `/candidates?q=${person.scholarId}&limit=1`,
    )
  ).json();
  assert.equal(search.total, 1);
  assert.equal(search.items[0].humanId, person.scholarId);
  assert.equal(
    (await request("staff", endpoint + "/candidates?q=%25")).json().total,
    0,
  );
  pass(
    "Award numbers remain unique within a draft; candidate search and pagination use literal matching",
  );
  const before = await detail(),
    rollbackKey = randomUUID();
  await admin.query(
    "CREATE TRIGGER fail_masterlist_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type LIKE 'masterlist.%' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (await command("remove", 6, second.id, null, "staff", rollbackKey))
        .statusCode,
      500,
    );
    assert.equal(
      (
        await request("staff", "/api/v1/masterlists", {
          academicYearId: year.id,
          title: "Must rollback",
          ...evidence,
        })
      ).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_masterlist_audit");
  }
  assert.deepEqual(await detail(), before);
  assert.equal(
    (await request("staff", "/api/v1/masterlists?q=Must%20rollback")).json()
      .total,
    0,
  );
  assert.equal(
    (await command("remove", 6, second.id, null, "staff", rollbackKey))
      .statusCode,
    200,
  );
  const [audit] = await admin.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM audit_logs WHERE entity_type='masterlist' AND entity_id=? AND action='remove'",
    [draft.id],
  );
  assert.equal(Number(audit[0].n), 2);
  pass(
    "Audit failure rolls back draft creation, entries, counts, revisions and retry receipts",
  );
  const lock = await request(
    "system_admin",
    `/api/v1/configuration/academic-years/${year.id}`,
    {
      action: "lock",
      expectedVersion: year.version,
      reason: "Lock synthetic year",
    },
  );
  assert.equal(lock.statusCode, 200, lock.body);
  expectError(await command("remove", 7), 423, "RECORD_LOCKED");
  expectError(
    await request("staff", "/api/v1/masterlists", {
      academicYearId: year.id,
      title: "Locked draft",
      ...evidence,
    }),
    423,
    "RECORD_LOCKED",
  );
  assert.equal(
    (await detail()).validation.issues[0].code,
    "PERIOD_UNAVAILABLE",
  );
  pass(
    "Academic-year locking blocks new drafts and mutations while preserving readable validation and history",
  );
  for (const sql of [
    "EXPLAIN DELETE FROM masterlist_versions WHERE 1=0",
    "EXPLAIN DELETE FROM masterlist_entries WHERE 1=0",
    "EXPLAIN UPDATE masterlist_entries SET scholar_id=scholar_id WHERE 1=0",
    "EXPLAIN UPDATE masterlist_publications SET snapshot=snapshot WHERE 1=0",
    "EXPLAIN UPDATE masterlist_commands SET resulting_version=resulting_version WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  for (const action of ["approve", "publish", "lock", "activate"]) {
    assert.equal(
      (await request("staff", endpoint + "/" + action, evidence)).statusCode,
      action === "activate" ? 404 : 403,
    );
  }
  assert.equal(
    (await request("staff", endpoint, { count: 769 }, randomUUID(), "PATCH"))
      .statusCode,
    404,
  );
  const account = accounts.get("staff")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: endpoint + "/entries",
        headers: {
          cookie: account.cookie,
          origin,
          "content-type": "application/json",
        },
        payload: {
          action: "remove",
          expectedVersion: 7,
          scholarId: person.id,
          awardNumber: null,
          ...evidence,
        },
      })
    ).statusCode,
    403,
  );
  pass(
    "Staff cannot publish or activate records; generic overwrite, restricted grants and CSRF protect drafts",
  );
  console.log(
    `All ${passed} masterlist scenarios passed in an isolated disposable database.`,
  );
  if (process.argv.includes("--browser")) {
    // Restore only the synthetic year using the fixture owner so browser users can prepare drafts.
    await admin.execute("UPDATE academic_years SET locked_at=NULL WHERE id=?", [
      year.id,
    ]);
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
    console.log("Disposable F10 browser fixture ready on port 3003.");
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f10_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
