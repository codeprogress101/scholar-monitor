import { testSubmissionWindows } from "./test-submission-window-scenarios.js";
import { currentPayout } from "../server/payouts/service.js";
import type { PayoutCycle } from "../server/payouts/model.js";
import type { VerificationContext } from "../server/requirements/workflow-model.js";
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
const database = `ldss_f18_test_${suffix}`,
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
  assert.equal((await applyMigrations(admin)).length, 53);
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
          lastName: "Payout",
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
  const definitions: Record<string, { id: string; definitionId: string }> = {};
  for (const code of ["PAY", "STRICT", "RECEIVE", "RACE", "SEMESTER"]) {
    definitions[code] = (
      await ok(
        request("system_admin", "/api/v1/requirement-definitions", {
          action: "create",
          code,
          expectedVersion: 0,
          reason: "Configure payout policy",
          reference: "POLICY-018",
          fields: {
            name: code + " requirement",
            instructions: "Present the physical document.",
            appliesTo: code === "SEMESTER" ? "semester" : "payout",
            semesterId: null,
            effectiveFrom: day,
            effectiveUntil: null,
          },
        }),
      )
    ).json();
  }
  const fields = {
    name: "Semester payout",
    targetDate: day,
    requirements: [
      { definitionVersionId: definitions.PAY.id, allowWaiver: true },
      { definitionVersionId: definitions.STRICT.id, allowWaiver: false },
      { definitionVersionId: definitions.RECEIVE.id, allowWaiver: true },
      { definitionVersionId: definitions.RACE.id, allowWaiver: true },
    ],
  };
  const create = {
    action: "create",
    expectedVersion: 0,
    code: "PAYOUT-A",
    semesterId: sem.id,
    expectedSemesterVersion: sem.version,
    fields,
    reason: "Configure target payout date",
    reference: "CALENDAR-018",
  };
  const path = "/api/v1/payout-cycles";
  const command = (
    action: string,
    expectedVersion: number,
    extra: object = {},
  ) => ({
    action,
    expectedVersion,
    reason: "Record authorized payout command",
    reference: "AUTH-018",
    ...extra,
  });
  const mutate = (
    c: PayoutCycle,
    action: string,
    extra: object = {},
    role = action === "configure" ? "system_admin" : "coordinator",
    key = randomUUID(),
  ) =>
    request(
      role,
      `${path}/${c.id}/${action}`,
      command(action, c.version, extra),
      key,
    );
  for (const role of ["staff", "coordinator", "unassigned"])
    expectError(await request(role, path, create), 403, "PERMISSION_DENIED");
  const aKey = randomUUID();
  let a = (
    await ok(request("system_admin", path, create, aKey))
  ).json<PayoutCycle>();
  assert.deepEqual(
    (await ok(request("system_admin", path, create, aKey))).json(),
    a,
  );
  expectError(
    await request("system_admin", path, { ...create, code: "CHANGED" }, aKey),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  for (const role of ["staff", "system_admin"])
    expectError(await mutate(a, "open", {}, role), 403, "PERMISSION_DENIED");
  for (const role of ["staff", "coordinator", "system_admin"])
    await ok(request(role, path));
  assert.equal((await app.inject(path)).statusCode, 401);
  pass(
    "Configuration and operations have separate authority; reads, exact retries and changed retry conflicts are enforced",
  );
  for (const extra of [
    { fields: { ...fields, targetDate: "" } },
    {
      fields: {
        ...fields,
        requirements: [fields.requirements[0], fields.requirements[0]],
      },
    },
    { actorId: accounts.get("system_admin")!.id },
    { expectedVersion: 2 },
  ])
    expectError(
      await request("system_admin", path, {
        ...create,
        code: "INVALID",
        ...extra,
      }),
      422,
      "VALIDATION_FAILED",
    );
  expectError(
    await request("system_admin", path, { ...create, code: "NO-SHARED-SETUP", fields: { ...fields, requirements: [] } }),
    409,
    "SOURCE_CHANGED",
  );
  expectError(
    await request("system_admin", path, {
      ...create,
      code: "WRONG-POLICY",
      fields: {
        ...fields,
        requirements: [
          { definitionVersionId: randomUUID(), allowWaiver: true },
        ],
      },
    }),
    409,
    "SOURCE_CHANGED",
  );
  expectError(
    await request("system_admin", path, {
      ...create,
      code: "STALE-SEM",
      expectedSemesterVersion: 99,
    }),
    409,
    "VERSION_CONFLICT",
  );
  expectError(
    await request("system_admin", path, create),
    409,
    "PAYOUT_CODE_EXISTS",
  );
  pass(
    "Explicit dates, nonempty distinct policy selections, scope, stale semester and unique cycle codes validated",
  );
  let b = (
    await ok(
      request("system_admin", path, {
        ...create,
        code: "PAYOUT-B",
        fields: { ...fields, targetDate: later(5) },
      }),
    )
  ).json<PayoutCycle>();
  const firstA = a;
  a = (
    await ok(
      mutate(a, "configure", { fields: { ...fields, targetDate: later(2) } }),
    )
  ).json<PayoutCycle>();
  const history = async (c: PayoutCycle) =>
    (await ok(request("staff", `${path}/${c.id}/history`))).json<{
      items: PayoutCycle[];
    }>().items;
  assert.equal((await history(a))[0].targetDate, day);
  assert.equal((await history(b))[0].targetDate, later(5));
  expectError(
    await mutate(firstA, "configure", { fields }),
    409,
    "VERSION_CONFLICT",
  );
  a = (await ok(mutate(a, "configure", { fields }))).json<PayoutCycle>();
  const scholarshipPath = `/api/v1/scholarships/${annual.id}/requirements`;
  const generation = {
    semesterId: sem.id,
    expectedSemesterVersion: sem.version,
    payoutCycleId: a.id,
    expectedPayoutVersion: a.version,
    reason: "Generate payout obligation checklist",
    reference: "CHECKLIST-018",
  };
  expectError(
    await request("staff", scholarshipPath + "/generate", generation),
    423,
    "PAYOUT_NOT_OPEN",
  );
  pass(
    "Changing one draft preserves all earlier dates and other cycles; draft cycles cannot generate obligations",
  );
  a = (await ok(mutate(a, "open"))).json<PayoutCycle>();
  expectError(
    await mutate(a, "configure", {
      fields: { ...fields, targetDate: later(20) },
    }),
    409,
    "INVALID_STATE_TRANSITION",
  );
  expectError(
    await request("staff", scholarshipPath + "/generate", generation),
    409,
    "VERSION_CONFLICT",
  );
  const gen = { ...generation, expectedPayoutVersion: a.version },
    genKey = randomUUID();
  const generated = (
    await ok(request("staff", scholarshipPath + "/generate", gen, genKey))
  ).json();
  assert.equal(generated.count, 4);
  assert.deepEqual(
    (
      await ok(request("staff", scholarshipPath + "/generate", gen, genKey))
    ).json(),
    generated,
  );
  assert.equal(
    (
      await ok(request("coordinator", scholarshipPath + "/generate", gen))
    ).json().created,
    false,
  );
  await ok(
    request("staff", scholarshipPath + "/generate", {
      semesterId: sem.id,
      expectedSemesterVersion: sem.version,
      reason: "Generate separate semester obligations",
      reference: "SEMESTER-018",
    }),
  );
  const lists = async () =>
    (await ok(request("staff", scholarshipPath))).json<{
      items: RequirementChecklist[];
    }>().items;
  const checklist = async () =>
    (await lists()).find((c) => c.payoutCycleId === a.id)!;
  const item = async (code: string) =>
    (await checklist()).items.find((i) => i.code === code)!;
  assert.equal((await lists()).length, 2);
  assert.equal((await checklist()).policyDate, a.targetDate);
  assert.equal((await checklist()).payoutVersionId, a.versionId);
  pass(
    "Opening freezes policy; payout and semester checklist uniqueness coexist, with idempotent generation and pinned cycle versions",
  );
  const laterRevision = (
    await ok(
      request(
        "system_admin",
        `/api/v1/requirement-definitions/${definitions.PAY.definitionId}`,
        {
          action: "revise",
          expectedVersion: 1,
          reason: "Future policy revision",
          reference: "POLICY-019",
          fields: {
            name: "Future payout policy",
            instructions: "Future policy details",
            appliesTo: "payout",
            semesterId: null,
            effectiveFrom: later(1),
            effectiveUntil: null,
          },
        },
      ),
    )
  ).json();
  assert.ok(laterRevision.id !== definitions.PAY.id);
  expectError(await mutate(b, "open"), 409, "SOURCE_CHANGED");
  assert.equal((await item("PAY")).definitionVersionId, definitions.PAY.id);
  pass(
    "Opening rejects superseded draft policy while previously opened cycles retain their exact requirement versions",
  );
  const itemPath = async (code: string, action: string) =>
    `/api/v1/requirement-instances/${(await item(code)).id}/${action}`;
  const waiver = {
    expectedVersion: 0,
    effectiveOn: day,
    reason: "Documented authorized exception",
    authorityReference: "WAIVER-018",
    remarks: null,
  };
  await ok(request("coordinator", await itemPath("PAY", "waive"), waiver));
  await ok(request("coordinator", await itemPath("STRICT", "waive"), waiver));
  assert.equal((await item("PAY")).satisfiesPayoutRequirement, true);
  assert.equal((await item("STRICT")).satisfiesPayoutRequirement, false);
  assert.equal((await item("STRICT")).satisfiesNormalRequirement, true);
  const receipt = {
    expectedVersion: 0,
    receivedOn: day,
    physicalReference: null,
    storageLocation: "Payout Cabinet",
    remarks: null,
    reason: "Physical custody recorded for payout",
  };
  await ok(request("staff", await itemPath("RECEIVE", "receive"), receipt));
  const workflow = (
    action: string,
    expectedVersion: number,
    extra: object = {},
  ) => ({
    action,
    expectedVersion,
    effectiveOn: day,
    reason: "Review payout requirement document",
    reference: "REVIEW-018",
    remarks: null,
    ...extra,
  });
  await ok(
    request(
      "staff",
      await itemPath("RECEIVE", "send-for-verification"),
      workflow("send-for-verification", 1),
    ),
  );
  const school = await config("schools", {
      code: "PAYOUT-SCHOOL",
      name: "Payout College",
    }),
    course = await config("courses", {
      code: "PAYOUT-COURSE",
      name: "Payout Degree",
    });
  await ok(
    request("staff", `/api/v1/scholars/${person.id}/academic-records`, {
      academicYearId: year.id,
      schoolId: school.id,
      courseId: course.id,
      yearLevel: "First year",
      reason: "Record annual academic placement",
      reference: "ACADEMIC-018",
    }),
  );
  const context = (
    await ok(
      request("staff", await itemPath("RECEIVE", "verification-context")),
    )
  ).json<VerificationContext>();
  const document = {
    scholarId: context.scholarId,
    scholarVersion: context.scholarVersion,
    academicYearId: context.academicYearId,
    semesterId: context.semesterId,
    schoolId: context.schoolId,
    courseId: context.courseId,
    academicVersion: context.academicVersion,
    definitionVersionId: context.definitionVersionId,
  };
  const verify = workflow("verify", 2, {
    document,
    checks: {
      identity: true,
      period: true,
      placement: true,
      applicability: true,
      validity: true,
    },
  });
  const verifyKey = randomUUID();
  const verified = (
    await ok(
      request("staff", await itemPath("RECEIVE", "verify"), verify, verifyKey),
    )
  ).json();
  assert.equal((await item("RECEIVE")).status, "verified");
  pass(
    "Payout documents support receiving and full verification; explicit cycle policy excludes waivers without changing their normal satisfaction",
  );
  const lockKey = randomUUID();
  await admin.query(
    "CREATE TRIGGER fail_payout_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payouts.cycle' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (await mutate(a, "lock", {}, "coordinator", lockKey)).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_payout_audit");
  }
  assert.equal((await history(a)).at(-1)!.state, "open");
  const [retryRows] = await admin.execute<RowDataPacket[]>(
    "SELECT command_id FROM payout_cycle_commands WHERE command_id=?",
    [lockKey],
  );
  assert.equal(retryRows.length, 0);
  pass(
    "Audit failure rolls back cycle revision, requirement snapshot and retry receipt together",
  );
  if (!process.argv.includes("--browser")) {
    const races = await Promise.all([
      mutate(a, "lock", {}, "coordinator", lockKey),
      request("coordinator", await itemPath("RACE", "waive"), waiver),
    ]);
    assert.equal(races[0].statusCode, 200);
    assert.ok([200, 423].includes(races[1].statusCode));
    a = races[0].json<PayoutCycle>();
    assert.equal((await checklist()).periodUnavailable, true);
    for (const [action, body] of [
      ["receive", receipt],
      ["waive", waiver],
      ["send-for-verification", workflow("send-for-verification", 1)],
      ["verify", verify],
      [
        "return-for-correction",
        workflow("return-for-correction", 3, { correctionOf: verified.id }),
      ],
      [
        "resubmit",
        workflow("resubmit", 1, {
          physicalReference: null,
          storageLocation: "Folder",
        }),
      ],
    ] as const)
      expectError(
        await request(
          action === "waive" ? "coordinator" : "staff",
          await itemPath("RACE", action),
          body,
        ),
        423,
        "PAYOUT_NOT_OPEN",
      );
    expectError(
      await request("staff", await itemPath("RECEIVE", "verification-context")),
      423,
      "PAYOUT_NOT_OPEN",
    );
    expectError(
      await request("staff", scholarshipPath + "/generate", gen),
      423,
      "PAYOUT_NOT_OPEN",
    );
    assert.deepEqual(
      (
        await ok(
          request(
            "staff",
            await itemPath("RECEIVE", "verify"),
            verify,
            verifyKey,
          ),
        )
      ).json(),
      verified,
    );
    assert.deepEqual(
      (
        await ok(request("staff", scholarshipPath + "/generate", gen, genKey))
      ).json(),
      generated,
    );
    a = (await ok(mutate(a, "close"))).json<PayoutCycle>();
    expectError(await mutate(a, "open"), 409, "INVALID_STATE_TRANSITION");
    pass(
      "Cycle lock serializes with document commands, blocks all mutation paths, preserves exact retries and permits permanent close",
    );
  }
  for (const table of [
    "payout_cycles",
    "payout_cycle_versions",
    "payout_requirements",
    "payout_cycle_commands",
  ]) {
    await assert.rejects(
      runtime.query(`EXPLAIN DELETE FROM ${table} WHERE 1=0`),
    );
    const column =
      table === "payout_requirements"
        ? "allow_waiver"
        : table === "payout_cycle_commands"
          ? "command_id"
          : "id";
    await assert.rejects(
      runtime.query(
        `EXPLAIN UPDATE ${table} SET ${column}=${column} WHERE 1=0`,
      ),
    );
  }
  const [audit] = await admin.execute<RowDataPacket[]>(
    "SELECT id FROM audit_logs WHERE event_type='payouts.cycle' AND entity_id=?",
    [a.id],
  );
  assert.equal(audit.length, (await history(a)).length);
  for (const table of ["semesters", "academic_years"]) {
    const periodId = table === "semesters" ? sem.id : year.id;
    for (const column of ["locked_at", "archived_at"]) {
      await admin.execute(
        `UPDATE ${table} SET ${column}=UTC_TIMESTAMP(6) WHERE id=?`,
        [periodId],
      );
      try {
        expectError(
          await mutate(b, "configure", { fields }),
          column === "locked_at" ? 423 : 409,
          column === "locked_at" ? "RECORD_LOCKED" : "REFERENCE_ARCHIVED",
        );
      } finally {
        await admin.execute(`UPDATE ${table} SET ${column}=NULL WHERE id=?`, [
          periodId,
        ]);
      }
    }
  }
  pass(
    "Append-only grants and audits preserve revisions; semester/year locks and archives block configuration",
  );
  const otherSemester = await config("semesters", {
    code: "OTHER-SEM",
    name: "Another semester",
    academicYearId: year.id,
    startsOn: day,
    endsOn: later(100),
  });
  let other = (
    await ok(
      request("system_admin", path, {
        ...create,
        code: "OTHER-CYCLE",
        semesterId: otherSemester.id,
        expectedSemesterVersion: otherSemester.version,
      }),
    )
  ).json<PayoutCycle>();
  other = (await ok(mutate(other, "open"))).json<PayoutCycle>();
  expectError(
    await request("staff", scholarshipPath + "/generate", {
      ...gen,
      payoutCycleId: other.id,
      expectedPayoutVersion: other.version,
    }),
    409,
    "WRONG_ACADEMIC_YEAR",
  );
  const coordinator = accounts.get("coordinator")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: `${path}/${other.id}/lock`,
        headers: { cookie: coordinator.cookie, origin },
        payload: command("lock", other.version),
      })
    ).statusCode,
    403,
  );
  expectError(
    await request(
      "coordinator",
      `${path}/${other.id}/lock`,
      command("close", other.version),
    ),
    422,
    "VALIDATION_FAILED",
  );
  pass(
    "Payout generation rejects mismatched semester context; commands require CSRF and matching endpoint actions",
  );
  const staleConnection=await runtime.getConnection();
  try {
      const db=staleConnection;
      await db.beginTransaction();
      await db.query("SELECT id FROM payout_cycles LIMIT 1");
      b = (await ok(mutate(b, "configure", { fields }))).json<PayoutCycle>();
      await db.query(
        "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
      );
      const observed = await currentPayout(db, b.id);
      assert.equal(observed.version, b.version);
      assert.equal(observed.targetDate, day);
  } finally {await staleConnection.rollback();staleConnection.release();}
  const configRace = await Promise.all([
    mutate(b, "configure", {
      fields: { ...fields, name: "Concurrent name one" },
    }),
    mutate(b, "configure", {
      fields: { ...fields, name: "Concurrent name two" },
    }),
  ]);
  assert.deepEqual(configRace.map((r) => r.statusCode).sort(), [200, 409]);
  b = configRace.find((r) => r.statusCode === 200)!.json<PayoutCycle>();
  const listed = (await ok(request("staff", path))).json<{
    items: PayoutCycle[];
  }>().items;
  assert.equal(listed.filter((c) => c.id === b.id).length, 1);
  assert.equal(listed.find((c) => c.id === b.id)!.version, b.version);
  pass(
    "Current locking reads overcome older authorization snapshots; concurrent configuration has one revision winner and one current list entry",
  );
  await ok(
    request("system_admin", path, {
      ...create,
      code: "BROWSER",
      fields: { ...fields, name: "Browser payout cycle" },
    }),
  );
  await testSubmissionWindows({ admin, runtime, actor: accounts.get("coordinator")!.id, staffId: accounts.get("staff")!.id, request });
  console.log(
    `All ${passed} payout scenarios passed in an isolated disposable database.`,
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
    console.log("Disposable F18 browser fixture ready on port 3003.");
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f18_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
