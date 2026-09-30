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
  DuplicateCheck,
  ScholarDetail,
  ScholarFields,
  ScholarResult,
} from "../server/scholars/model.js";
import type { ConfigRecord } from "../server/configuration/model.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_f04_test_${suffix}`,
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
  let barangay = await config("barangays", {
    code: "TEST-BRGY",
    name: "Synthetic barangay",
  });
  const fields: ScholarFields = {
    firstName: "Synthetic",
    middleName: "",
    lastName: "Student",
    suffix: "",
    birthDate: "2005-03-15",
    academicYearId: year.id,
    barangayId: barangay.id,
    contact: {
      email: "synthetic@example.invalid",
      phone: "+63 900 000 0000",
      addressLine: "Synthetic address only",
    },
  };
  const createBody = (data = fields) => ({
    expectedVersion: 0,
    reason: "Verified synthetic scholar entry",
    fields:
      data.firstName === fields.firstName
        ? data
        : {
            ...data,
            lastName: data.firstName + " Family",
            birthDate: null,
            contact: { email: "", phone: "", addressLine: "" },
          },
  });
  const profile = async (id: string) => {
    const response = await request("staff", "/api/v1/scholars/" + id);
    assert.equal(response.statusCode, 200, response.body);
    return response.json<ScholarDetail>();
  };
  const editFields = (row: ScholarDetail): ScholarFields => ({
    firstName: row.firstName,
    middleName: row.middleName,
    lastName: row.lastName,
    suffix: row.suffix,
    birthDate: row.birthDate,
    academicYearId: row.academicYearId,
    barangayId: row.barangayId,
    contact: row.contact,
  });
  const edit = (
    row: ScholarDetail,
    changes: Partial<ScholarFields>,
    role = "staff",
  ) =>
    request(
      role,
      "/api/v1/scholars/" + row.id,
      {
        expectedVersion: row.version,
        reason: "Verified identity correction",
        fields: { ...editFields(row), ...changes },
      },
      randomUUID(),
      "PATCH",
    );
  assert.equal((await app.inject("/api/v1/scholars")).statusCode, 401);
  for (const role of ["system_admin", "unassigned"]) {
    expectError(
      await request(role, "/api/v1/scholars"),
      403,
      "PERMISSION_DENIED",
    );
    expectError(
      await request(role, "/api/v1/scholars", createBody()),
      403,
      "PERMISSION_DENIED",
    );
  }
  pass(
    "Anonymous access and System Administrator/unassigned read/create are denied despite forged role headers",
  );
  const concurrent = await Promise.all([
    request("staff", "/api/v1/scholars", createBody()),
    request(
      "coordinator",
      "/api/v1/scholars",
      createBody({ ...fields, firstName: "Another" }),
    ),
  ]);
  concurrent.forEach((response) =>
    assert.equal(response.statusCode, 200, response.body),
  );
  const created = concurrent.map((response) => response.json<ScholarResult>());
  assert.equal(new Set(created.map((item) => item.scholarId)).size, 2);
  assert.deepEqual(created.map((item) => item.scholarId).sort(), [
    "LDSS-2026-00001",
    "LDSS-2026-00002",
  ]);
  created.forEach((item) => assert.match(item.id, /^[a-f0-9-]{36}$/));
  let person = await profile(created[0].id);
  pass(
    "Concurrent creates by two different actors receive distinct permanent IDs and internal UUIDs",
  );
  const results = await request("staff", "/api/v1/scholars?q=Synthetic");
  assert.equal(results.statusCode, 200);
  const summary = results.json().items[0];
  assert.deepEqual(Object.keys(summary).sort(), [
    "academicYear",
    "barangay",
    "displayName",
    "entryYear",
    "id",
    "scholarId",
  ]);
  assert.ok(!results.body.includes(fields.contact.email));
  assert.ok(!results.body.includes(fields.birthDate!));
  assert.equal(
    (
      await request(
        "staff",
        "/api/v1/scholars?q=" + encodeURIComponent(fields.contact.phone),
      )
    ).json().total,
    0,
  );
  assert.equal(
    (await request("staff", "/api/v1/scholars?q=" + person.scholarId)).json()
      .items[0].id,
    person.id,
  );
  expectError(
    await request("system_admin", "/api/v1/scholars/" + person.id),
    403,
    "PERMISSION_DENIED",
  );
  expectError(
    await edit(person, { firstName: "Forbidden" }, "system_admin"),
    403,
    "PERMISSION_DENIED",
  );
  pass(
    "Search returns minimal PII; contact/birth-date fields are confined to authorized profiles",
  );
  await admin.beginTransaction();
  try {
    const duplicate = randomUUID();
    await admin.execute(
      "INSERT INTO scholars (id,first_name,last_name,academic_year_id,created_at,updated_at) VALUES (?,'Duplicate','Fixture',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
      [duplicate, year.id],
    );
    await assert.rejects(
      admin.execute(
        "INSERT INTO scholar_identifiers (scholar_id,entry_year,sequence_no) SELECT ?,entry_year,sequence_no FROM scholar_identifiers WHERE scholar_id=?",
        [duplicate, person.id],
      ),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ER_DUP_ENTRY",
    );
  } finally {
    await admin.rollback();
  }
  pass("Database uniqueness rejects a duplicate human ID/year sequence");
  const originalId = person.scholarId,
    originalEntry = person.entryYear;
  const updated = await edit(person, {
    firstName: "Corrected",
    birthDate: "2005-03-16",
    academicYearId: nextYear.id,
    contact: { ...person.contact, phone: "+63 900 111 1111" },
  });
  assert.equal(updated.statusCode, 200, updated.body);
  const stale = person;
  person = await profile(person.id);
  assert.equal(person.scholarId, originalId);
  assert.equal(person.entryYear, originalEntry);
  assert.equal(person.academicYearId, nextYear.id);
  assert.equal(person.contact.phone, "+63 900 111 1111");
  const [audit] = await admin.execute<RowDataPacket[]>(
    "SELECT details,actor_id,reason FROM audit_logs WHERE entity_id=? AND action='update' ORDER BY occurred_at DESC",
    [person.id],
  );
  assert.equal(JSON.parse(audit[0].details).before.birthDate, "2005-03-15");
  assert.equal(JSON.parse(audit[0].details).after.birthDate, "2005-03-16");
  assert.equal(audit[0].actor_id, accounts.get("staff")!.id);
  const yearChange = await request(
    "system_admin",
    "/api/v1/configuration/academic-years/" + year.id,
    {
      action: "update",
      expectedVersion: year.version,
      reason: "Correct fixture year start",
      fields: {
        code: year.code,
        name: year.name,
        startsOn: "2025-06-01",
        endsOn: year.endsOn,
      },
    },
  );
  assert.equal(yearChange.statusCode, 200, yearChange.body);
  assert.equal((await profile(created[1].id)).scholarId, created[1].scholarId);
  pass(
    "Identity/contact corrections are audited; academic-year reassignment and configured date edits preserve permanent IDs",
  );
  expectError(
    await edit(stale, { lastName: "Stale edit" }),
    409,
    "VERSION_CONFLICT",
  );
  const edits = await Promise.all([
    edit(person, { firstName: "Concurrent A" }),
    edit(person, { firstName: "Concurrent B" }, "coordinator"),
  ]);
  assert.deepEqual(
    edits.map((response) => response.statusCode).sort(),
    [200, 409],
  );
  person = await profile(person.id);
  pass(
    "Concurrent cross-user edits have one winner; stale versions cannot overwrite a profile",
  );
  const retryKey = randomUUID(),
    retryBody = createBody({
      ...fields,
      firstName: "Retry",
      academicYearId: nextYear.id,
    });
  const retries = await Promise.all([
    request("staff", "/api/v1/scholars", retryBody, retryKey),
    request("staff", "/api/v1/scholars", retryBody, retryKey),
  ]);
  retries.forEach((response) =>
    assert.equal(response.statusCode, 200, response.body),
  );
  assert.deepEqual(retries[0].json(), retries[1].json());
  expectError(
    await request("staff", "/api/v1/scholars", createBody(), retryKey),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  const [retryAudit] = await admin.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM audit_logs WHERE entity_id=?",
    [retries[0].json().id],
  );
  assert.equal(retryAudit[0].total, 1);
  pass("Repeated create requests return one scholar and one audit event");
  const beforeFailedEdit = await profile(person.id);
  const [counterBefore] = await admin.query<RowDataPacket[]>(
    "SELECT entry_year,last_number FROM scholar_id_sequences ORDER BY entry_year",
  );
  await admin.query(
    "CREATE TRIGGER fail_scholar_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='scholar.changed' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  const rollbackKey = randomUUID();
  try {
    assert.equal(
      (
        await request(
          "staff",
          "/api/v1/scholars",
          createBody({ ...fields, firstName: "Rollback" }),
          rollbackKey,
        )
      ).statusCode,
      500,
    );
    assert.equal(
      (
        await edit(person, {
          contact: { ...person.contact, addressLine: "Must roll back" },
        })
      ).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_scholar_audit");
  }
  assert.deepEqual(await profile(person.id), beforeFailedEdit);
  const [counterAfter] = await admin.query<RowDataPacket[]>(
    "SELECT entry_year,last_number FROM scholar_id_sequences ORDER BY entry_year",
  );
  assert.deepEqual(counterAfter, counterBefore);
  assert.equal(
    (
      await request(
        "staff",
        "/api/v1/scholars",
        createBody({ ...fields, firstName: "Rollback" }),
        rollbackKey,
      )
    ).statusCode,
    200,
  );
  pass(
    "Audit failure rolls back scholar/contact data, counter allocation, and retry history",
  );
  const checkFor = async (data: ScholarFields, role = "staff") => {
    const response = await request(role, "/api/v1/scholars/duplicate-check", {
      fields: data,
    });
    assert.equal(response.statusCode, 200, response.body);
    return response.json<DuplicateCheck>();
  };
  for (const role of ["system_admin", "unassigned"])
    expectError(
      await request(role, "/api/v1/scholars/duplicate-check", { fields }),
      403,
      "PERMISSION_DENIED",
    );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/scholars/duplicate-check",
        payload: { fields },
      })
    ).statusCode,
    401,
  );
  const exactFields = editFields(person);
  const exactCheck = await checkFor(exactFields);
  assert.ok(
    exactCheck.candidates.some(
      (candidate) =>
        candidate.id === person.id && candidate.likelihood === "likely",
    ),
  );
  assert.ok(!JSON.stringify(exactCheck).includes(person.contact.email));
  const rawCreate = (data: ScholarFields) => ({
    expectedVersion: 0,
    reason: "Synthetic duplicate test",
    fields: data,
  });
  expectError(
    await request("staff", "/api/v1/scholars", rawCreate(exactFields)),
    409,
    "DUPLICATE_REVIEW_REQUIRED",
  );
  pass(
    "Duplicate checks deny unauthorized users, flag exact likely matches, minimize PII, and block unreviewed creation",
  );

  const similarFields = {
    ...exactFields,
    firstName: exactFields.firstName + "x",
    birthDate: null,
    barangayId: null,
    contact: { email: "", phone: "", addressLine: "" },
  };
  const similarCheck = await checkFor(similarFields);
  assert.ok(
    similarCheck.candidates.some(
      (candidate) =>
        candidate.id === person.id && candidate.likelihood === "possible",
    ),
  );
  const resolution = (check: DuplicateCheck) => ({
    snapshot: check.snapshot,
    decision: "create_separate",
    reason: "Verified two distinct people against physical records",
  });
  const separateBody = {
    ...rawCreate(similarFields),
    duplicateResolution: resolution(similarCheck),
  };
  const separateKey = randomUUID();
  const separate = await request(
    "coordinator",
    "/api/v1/scholars",
    separateBody,
    separateKey,
  );
  assert.equal(separate.statusCode, 200, separate.body);
  assert.notEqual(separate.json().id, person.id);
  assert.notEqual(separate.json().scholarId, person.scholarId);
  assert.deepEqual(
    (
      await request(
        "coordinator",
        "/api/v1/scholars",
        separateBody,
        separateKey,
      )
    ).json(),
    separate.json(),
  );
  const [decisionAudit] = await admin.execute<RowDataPacket[]>(
    "SELECT details,actor_id FROM audit_logs WHERE entity_id=?",
    [separate.json().id],
  );
  assert.equal(decisionAudit.length, 1);
  const decision = JSON.parse(decisionAudit[0].details).duplicate_resolution;
  assert.equal(decision.decision, "create_separate");
  assert.equal(decision.reason, separateBody.duplicateResolution.reason);
  assert.ok(
    decision.candidates.some(
      (candidate: { id: string }) => candidate.id === person.id,
    ),
  );
  assert.equal(decisionAudit[0].actor_id, accounts.get("coordinator")!.id);
  pass(
    "Similar names warn without merging; explicit resolution is audited and retries preserve distinct permanent IDs",
  );

  const fresh = await checkFor(exactFields);
  const reviewedBody = {
    ...rawCreate(exactFields),
    duplicateResolution: resolution(fresh),
  };
  expectError(
    await request("staff", "/api/v1/scholars", {
      ...reviewedBody,
      fields: { ...exactFields, suffix: "Jr" },
    }),
    409,
    "DUPLICATE_REVIEW_REQUIRED",
  );
  assert.equal((await edit(person, { suffix: "Sr" })).statusCode, 200);
  person = await profile(person.id);
  expectError(
    await request("staff", "/api/v1/scholars", reviewedBody),
    409,
    "DUPLICATE_REVIEW_REQUIRED",
  );
  expectError(
    await request("staff", "/api/v1/scholars", {
      ...reviewedBody,
      duplicateResolution: { ...resolution(fresh), reason: " " },
    }),
    422,
    "VALIDATION_FAILED",
  );
  pass(
    "Changed inputs or candidate versions invalidate review; blank override reasons are rejected",
  );

  const raceFields = {
    ...fields,
    firstName: "UniqueRacing",
    lastName: "IdenticalPerson",
    birthDate: null,
    contact: { email: "", phone: "", addressLine: "" },
  };
  assert.equal((await checkFor(raceFields)).total, 0);
  const race = await Promise.all([
    request("staff", "/api/v1/scholars", rawCreate(raceFields)),
    request("coordinator", "/api/v1/scholars", rawCreate(raceFields)),
  ]);
  assert.deepEqual(
    race.map((response) => response.statusCode).sort(),
    [200, 409],
  );
  expectError(
    race.find((response) => response.statusCode === 409)!,
    409,
    "DUPLICATE_REVIEW_REQUIRED",
  );
  pass(
    "Concurrent identical-person creates have one winner and one review warning",
  );

  const overrideCheck = await checkFor(exactFields);
  const overrideBody = {
    ...rawCreate(exactFields),
    duplicateResolution: resolution(overrideCheck),
  };
  const [beforeCounts] = await admin.query<RowDataPacket[]>(
    "SELECT (SELECT COUNT(*) FROM scholars) AS people,(SELECT COUNT(*) FROM scholar_commands) AS commands,(SELECT COUNT(*) FROM audit_logs) AS audits",
  );
  await admin.query(
    "CREATE TRIGGER fail_duplicate_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='scholar.changed' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (await request("staff", "/api/v1/scholars", overrideBody)).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_duplicate_audit");
  }
  const [afterCounts] = await admin.query<RowDataPacket[]>(
    "SELECT (SELECT COUNT(*) FROM scholars) AS people,(SELECT COUNT(*) FROM scholar_commands) AS commands,(SELECT COUNT(*) FROM audit_logs) AS audits",
  );
  assert.deepEqual(afterCounts, beforeCounts);
  pass(
    "Failed duplicate-resolution audit rolls back person creation and retry history",
  );
  barangay = (
    await request(
      "system_admin",
      "/api/v1/configuration/barangays/" + barangay.id,
      {
        action: "archive",
        expectedVersion: barangay.version,
        reason: "Retain historic barangay",
      },
    )
  ).json();
  expectError(
    await request("staff", "/api/v1/scholars", createBody()),
    409,
    "REFERENCE_ARCHIVED",
  );
  assert.equal(
    (await edit(person, { lastName: "Retained reference" })).statusCode,
    200,
  );
  person = await profile(person.id);
  const invalidReference = await request(
    "staff",
    "/api/v1/scholars",
    createBody({ ...fields, barangayId: randomUUID() }),
  );
  expectError(invalidReference, 422, "REFERENCE_NOT_FOUND");
  const locked = await request(
    "system_admin",
    "/api/v1/configuration/academic-years/" + nextYear.id,
    {
      action: "lock",
      expectedVersion: nextYear.version,
      reason: "Finalized fixture period",
    },
  );
  assert.equal(locked.statusCode, 200, locked.body);
  expectError(
    await edit(person, { academicYearId: year.id }),
    409,
    "RECORD_LOCKED",
  );
  expectError(
    await request(
      "coordinator",
      "/api/v1/scholars",
      createBody({ ...fields, academicYearId: nextYear.id, barangayId: null }),
    ),
    409,
    "RECORD_LOCKED",
  );
  assert.equal((await profile(person.id)).periodUnavailable, true);
  await assert.rejects(
    admin.execute("DELETE FROM barangays WHERE id=?", [barangay.id]),
  );
  pass(
    "Archived references remain readable; unavailable references and locked periods block prohibited writes",
  );
  const fullYear = await config("academic-years", {
    code: "AY2035",
    name: "Sequence boundary fixture",
    startsOn: "2035-01-01",
    endsOn: "2035-12-31",
  });
  await admin.execute(
    "INSERT INTO scholar_id_sequences (entry_year,last_number) VALUES (2035,99999)",
  );
  expectError(
    await request(
      "staff",
      "/api/v1/scholars",
      createBody({
        ...fields,
        firstName: "Exhausted",
        academicYearId: fullYear.id,
        barangayId: null,
      }),
    ),
    409,
    "SCHOLAR_ID_EXHAUSTED",
  );
  expectError(
    await request("staff", "/api/v1/scholars", {
      ...createBody(),
      fields: { ...fields, scholarId: "LDSS-2026-99999" },
    }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request("staff", "/api/v1/scholars", createBody(), "invalid-key"),
    422,
    "VALIDATION_FAILED",
  );
  pass("ID exhaustion and browser-supplied identifiers are rejected");
  assert.equal(
    (await request("staff", "/api/v1/scholars?limit=1&offset=1")).json().items
      .length,
    1,
  );
  const filtered = (
    await request("staff", "/api/v1/scholars?academicYearId=" + nextYear.id)
  ).json();
  assert.ok(filtered.total > 0);
  assert.ok(
    filtered.items.every(
      (row: { academicYear: { id: string } }) =>
        row.academicYear.id === nextYear.id,
    ),
  );
  const active = accounts.get("staff")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/scholars",
        headers: {
          cookie: active.cookie,
          origin,
          "content-type": "application/json",
          "idempotency-key": randomUUID(),
        },
        payload: createBody(),
      })
    ).statusCode,
    403,
  );
  for (const sql of [
    "EXPLAIN UPDATE scholar_identifiers SET entry_year=entry_year WHERE 1=0",
    "EXPLAIN DELETE FROM scholars WHERE 1=0",
    "EXPLAIN UPDATE scholars SET id=id WHERE 1=0",
    "EXPLAIN UPDATE scholar_contacts SET scholar_id=scholar_id WHERE 1=0",
    "EXPLAIN UPDATE scholar_commands SET resulting_version=resulting_version WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  pass(
    "Pagination, academic-year filtering, CSRF and immutable-ID/runtime grants are verified",
  );
  console.log(
    `All ${passed} scholar scenarios passed in an isolated disposable database.`,
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
      "Disposable scholar browser fixture ready on port 3003; staff@example.invalid and system_admin@example.invalid. Stop at /__fixture/stop.",
    );
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f04_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
