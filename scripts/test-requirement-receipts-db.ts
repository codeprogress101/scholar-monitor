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
const database = `ldss_f15_test_${suffix}`,
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
    code: "RECEIPT-YEAR",
    name: "Receipt academic year",
    startsOn: later(-60),
    endsOn: later(300),
  });
  const sem = await config("semesters", {
    code: "RECEIPT-SEM",
    name: "Receipt semester",
    academicYearId: year.id,
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
        reason: "Synthetic physical receiving scholar",
        fields: {
          firstName: "Ada",
          lastName: "Receipt",
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
  const definitions: Record<string, string> = {};
  for (const code of [
    "COR",
    "COG",
    "ROLLBACK",
    "PERIOD",
    "ARCHIVE",
    "BROWSER",
  ]) {
    const d = (
      await ok(
        request("system_admin", "/api/v1/requirement-definitions", {
          action: "create",
          code,
          expectedVersion: 0,
          reason: "Configure synthetic physical requirement",
          reference: "POLICY-001",
          fields: {
            name: code + " physical requirement",
            instructions: "Present the physical " + code + " document.",
            appliesTo: "semester",
            semesterId: null,
            effectiveFrom: day,
            effectiveUntil: null,
          },
        }),
      )
    ).json<{ definitionId: string }>();
    definitions[code] = d.definitionId;
  }
  const path = `/api/v1/scholarships/${annual.id}/requirements`;
  const generation = {
    semesterId: sem.id,
    expectedSemesterVersion: sem.version,
    reason: "Generate physical checklist",
    reference: "CHECKLIST-001",
  };
  await ok(request("staff", path + "/generate", generation));
  const list = async () =>
    (await ok(request("staff", path))).json<{ items: RequirementChecklist[] }>()
      .items;
  const checklist = (await list())[0],
    instance = (code: string) => checklist.items.find((i) => i.code === code)!;
  const receiptPath = (code: string) =>
    `/api/v1/requirement-instances/${instance(code).id}/receive`;
  const body = {
    expectedVersion: 0,
    receivedOn: day,
    physicalReference: "RECEIPT-REGISTER-001",
    storageLocation: "Records room / Cabinet A / Folder 01",
    remarks: "Original hard copy received.",
    reason: "Record physical custody at receiving desk",
  };
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: receiptPath("COR"),
        payload: body,
      })
    ).statusCode,
    401,
  );
  for (const role of ["system_admin", "unassigned"])
    expectError(
      await request(role, receiptPath("COR"), body),
      403,
      "PERMISSION_DENIED",
    );
  expectError(
    await request(
      "staff",
      `/api/v1/requirement-instances/${randomUUID()}/receive`,
      body,
    ),
    404,
    "REQUIREMENT_NOT_FOUND",
  );
  pass(
    "Receiving is limited to Staff/Coordinator and existing instances; anonymous and technical administration are denied",
  );
  for (const change of [
    { receivedOn: later(1) },
    { receivedOn: "2026-02-30" },
    { storageLocation: " " },
    { reason: "x" },
    { actorId: accounts.get("coordinator")!.id },
    { receivedBy: "Someone else" },
    { status: "verified" },
    { uploadUrl: "https://example.invalid/file" },
    { definitionVersionId: randomUUID() },
  ])
    expectError(
      await request("staff", receiptPath("COR"), { ...body, ...change }),
      422,
      "VALIDATION_FAILED",
    );
  expectError(
    await request("staff", receiptPath("COR"), {
      ...body,
      expectedVersion: 99,
    }),
    409,
    "VERSION_CONFLICT",
  );
  pass(
    "Dates, required storage/reason, stale revisions and forged identity/status/upload fields are rejected",
  );
  const [original] = await admin.execute<RowDataPacket[]>(
    "SELECT * FROM requirement_instances WHERE id=?",
    [instance("COR").id],
  );
  const key = randomUUID(),
    first = (await ok(request("staff", receiptPath("COR"), body, key))).json<{
      id: string;
      status: string;
      version: number;
    }>();
  assert.equal(first.status, "submitted");
  assert.equal(first.version, 1);
  const cor = (await list())[0].items.find((i) => i.code === "COR")!;
  assert.equal(cor.status, "submitted");
  assert.equal(cor.version, 1);
  assert.equal(cor.receipt!.receiverName, "Synthetic staff");
  assert.equal(cor.receipt!.receivedOn, day);
  assert.equal(cor.receipt!.storageLocation, body.storageLocation);
  assert.equal(cor.receipt!.physicalReference, body.physicalReference);
  assert.equal(cor.receipt!.remarks, body.remarks);
  assert.equal(cor.definitionVersionId, instance("COR").definitionVersionId);
  const [after] = await admin.execute<RowDataPacket[]>(
    "SELECT * FROM requirement_instances WHERE id=?",
    [instance("COR").id],
  );
  assert.deepEqual(after, original);
  const [audits] = await admin.execute<RowDataPacket[]>(
    "SELECT actor_id,reason,details FROM audit_logs WHERE event_type='requirements.received' AND entity_id=?",
    [instance("COR").id],
  );
  assert.equal(audits.length, 1);
  assert.equal(audits[0].actor_id, accounts.get("staff")!.id);
  assert.equal(JSON.parse(audits[0].details).after.status, "submitted");
  pass(
    "Receipt records custody, authenticated receiver and audit atomically while preserving immutable generation and policy links",
  );
  assert.deepEqual(
    (await ok(request("staff", receiptPath("COR"), body, key))).json(),
    first,
  );
  expectError(
    await request(
      "staff",
      receiptPath("COR"),
      { ...body, storageLocation: "Different storage" },
      key,
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  expectError(
    await request("coordinator", receiptPath("COR"), body),
    409,
    "REQUIREMENT_ALREADY_RECEIVED",
  );
  expectError(
    await request("staff", receiptPath("COR"), { ...body, expectedVersion: 1 }),
    409,
    "REQUIREMENT_ALREADY_RECEIVED",
  );
  assert.deepEqual(
    (await list())[0].items.find((i) => i.code === "COR"),
    cor,
  );
  pass(
    "Exact retry preserves one receipt/audit; changed retry and duplicate initial receipts are clearly rejected",
  );
  const concurrent = await Promise.all([
    request("staff", receiptPath("COG"), {
      ...body,
      physicalReference: null,
      remarks: null,
      receivedOn: later(-1),
    }),
    request("coordinator", receiptPath("COG"), {
      ...body,
      physicalReference: null,
      remarks: null,
      receivedOn: later(-1),
    }),
  ]);
  assert.deepEqual(concurrent.map((r) => r.statusCode).sort(), [200, 409]);
  const cog = (await list())[0].items.find((i) => i.code === "COG")!;
  assert.equal(cog.receipt!.physicalReference, null);
  assert.equal(cog.receipt!.remarks, null);
  assert.equal(cog.receipt!.receivedOn, later(-1));
  pass(
    "Concurrent receivers have one winner; optional reference/remarks and historical receipt dates are supported",
  );
  const rollbackKey = randomUUID();
  await admin.query(
    "CREATE TRIGGER fail_receipt_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='requirements.received' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (await request("staff", receiptPath("ROLLBACK"), body, rollbackKey))
        .statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_receipt_audit");
  }
  assert.equal(
    (await list())[0].items.find((i) => i.code === "ROLLBACK")!.status,
    "not_submitted",
  );
  const [missing] = await admin.execute<RowDataPacket[]>(
    "SELECT id FROM requirement_receipts WHERE instance_id=?",
    [instance("ROLLBACK").id],
  );
  assert.equal(missing.length, 0);
  await ok(request("staff", receiptPath("ROLLBACK"), body, rollbackKey));
  pass(
    "Audit failure rolls back custody and retry receipt; the same command succeeds afterward",
  );
  await ok(
    request(
      "system_admin",
      "/api/v1/requirement-definitions/" + definitions.PERIOD,
      {
        action: "archive",
        expectedVersion: 1,
        effectiveFrom: later(1),
        reason: "Retire future policy definition",
        reference: "ARCHIVE-001",
      },
    ),
  );
  await ok(request("staff", receiptPath("PERIOD"), body));
  const period = (await list())[0].items.find((i) => i.code === "PERIOD")!;
  assert.equal(period.revision, 1);
  assert.equal(period.status, "submitted");
  await ok(request("coordinator", path + "/generate", generation));
  assert.deepEqual(
    (await list())[0].items.find((i) => i.code === "COR"),
    cor,
  );
  pass(
    "Later policy retirement and repeated checklist generation do not erase or reinterpret receipt history",
  );
  for (const sql of [
    "EXPLAIN UPDATE requirement_receipts SET storage_location=storage_location WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_receipts WHERE 1=0",
    "EXPLAIN UPDATE requirement_receipt_commands SET result=result WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_receipt_commands WHERE 1=0",
    "EXPLAIN UPDATE requirement_instances SET status=status WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  await assert.rejects(
    admin.execute(
      "INSERT INTO requirement_receipts(id,instance_id,received_on,physical_reference,storage_location,remarks,reason,actor_id,actor_name,recorded_at) SELECT ?,instance_id,received_on,physical_reference,storage_location,remarks,reason,actor_id,actor_name,recorded_at FROM requirement_receipts WHERE id=?",
      [randomUUID(), first.id],
    ),
    (e: unknown) => (e as { code: string }).code === "ER_DUP_ENTRY",
  );
  const actor = accounts.get("staff")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: receiptPath("ARCHIVE"),
        headers: { cookie: actor.cookie, origin },
        payload: body,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (await request("staff", receiptPath("COR"), body, randomUUID(), "PATCH"))
      .statusCode,
    404,
  );
  pass(
    "Immutable grants, unique initial receipt, CSRF and absent generic update endpoints protect custody history",
  );
  const archivedSem = await config("semesters", {
    code: "ARCHIVED-SEM",
    name: "Archived receipt semester",
    academicYearId: year.id,
    startsOn: day,
    endsOn: later(100),
  });
  await ok(
    request("staff", path + "/generate", {
      ...generation,
      semesterId: archivedSem.id,
    }),
  );
  const archivedInstance = (await list()).find(
    (c) => c.semesterId === archivedSem.id,
  )!.items[0];
  await ok(
    request(
      "system_admin",
      "/api/v1/configuration/semesters/" + archivedSem.id,
      {
        action: "archive",
        expectedVersion: archivedSem.version,
        reason: "Close archived physical records period",
      },
    ),
  );
  expectError(
    await request(
      "staff",
      `/api/v1/requirement-instances/${archivedInstance.id}/receive`,
      body,
    ),
    409,
    "REFERENCE_ARCHIVED",
  );
  if (!process.argv.includes("--browser")) {
    await ok(
      request("system_admin", "/api/v1/configuration/semesters/" + sem.id, {
        action: "lock",
        expectedVersion: sem.version,
        reason: "Lock semester custody records",
      }),
    );
    expectError(
      await request("staff", receiptPath("ARCHIVE"), body),
      423,
      "RECORD_LOCKED",
    );
    assert.deepEqual(
      (await ok(request("staff", receiptPath("COR"), body, key))).json(),
      first,
    );
    assert.deepEqual(
      (await list())
        .find((c) => c.id === checklist.id)!
        .items.find((i) => i.code === "COR"),
      cor,
    );
    const yearSem = await config("semesters", {
      code: "YEAR-LOCK",
      name: "Year lock test semester",
      academicYearId: year.id,
      startsOn: day,
      endsOn: later(100),
    });
    await ok(
      request("staff", path + "/generate", {
        ...generation,
        semesterId: yearSem.id,
      }),
    );
    const yearInstance = (await list()).find(
      (c) => c.semesterId === yearSem.id,
    )!.items[0];
    await ok(
      request(
        "system_admin",
        "/api/v1/configuration/academic-years/" + year.id,
        {
          action: "lock",
          expectedVersion: year.version,
          reason: "Lock academic year receiving",
        },
      ),
    );
    expectError(
      await request(
        "staff",
        `/api/v1/requirement-instances/${yearInstance.id}/receive`,
        body,
      ),
      423,
      "RECORD_LOCKED",
    );
  }
  pass(
    "Archived semesters and locked semester/year periods block new receipt commands while history and completed retries remain safe",
  );
  console.log(
    `All ${passed} physical receiving scenarios passed in an isolated disposable database.`,
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
    console.log("Disposable F15 browser fixture ready on port 3003.");
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f15_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
