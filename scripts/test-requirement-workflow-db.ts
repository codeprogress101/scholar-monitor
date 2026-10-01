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
const database = `ldss_f16_test_${suffix}`,
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
          lastName: "Verification",
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
  const actionPath = (code: string, action: string) =>
    `/api/v1/requirement-instances/${instance(code).id}/${action}`;
  const command = (
    action: string,
    expectedVersion: number,
    extra: object = {},
  ) => ({
    action,
    expectedVersion,
    effectiveOn: day,
    reason: "Reviewed physical requirement evidence",
    reference: "DECISION-001",
    remarks: "Physical document review recorded.",
    ...extra,
  });
  const current = async (code: string) =>
    (await list())
      .find((c) => c.id === checklist.id)!
      .items.find((i) => i.code === code)!;
  for (const code of ["COR", "COG", "ROLLBACK", "PERIOD", "BROWSER"])
    await ok(request("staff", receiptPath(code), body));
  for (const role of ["system_admin", "unassigned"]) {
    expectError(
      await request(
        role,
        actionPath("COR", "send-for-verification"),
        command("send-for-verification", 1),
      ),
      403,
      "PERMISSION_DENIED",
    );
    expectError(
      await request(role, actionPath("COR", "verification-context")),
      403,
      "PERMISSION_DENIED",
    );
  }
  assert.equal(
    (await app.inject(actionPath("COR", "verification-context"))).statusCode,
    401,
  );
  expectError(
    await request("staff", actionPath("COR", "verification-context")),
    409,
    "ACADEMIC_RECORD_REQUIRED",
  );
  pass(
    "Verification is restricted to authorized operational roles and requires annual academic data",
  );
  const school = await config("schools", {
      code: "VERIFY-SCHOOL",
      name: "Verification College",
    }),
    course = await config("courses", {
      code: "VERIFY-COURSE",
      name: "Verification Degree",
    });
  await ok(
    request("staff", `/api/v1/scholars/${person.id}/academic-records`, {
      academicYearId: year.id,
      schoolId: school.id,
      courseId: course.id,
      yearLevel: "First year",
      reason: "Verified initial academic record",
      reference: "ACADEMIC-001",
    }),
  );
  const ctx = async (code: string) =>
    (
      await ok(request("staff", actionPath(code, "verification-context")))
    ).json<VerificationContext>();
  const evidence = (c: VerificationContext) => ({
    document: {
      scholarId: c.scholarId,
      scholarVersion: c.scholarVersion,
      academicYearId: c.academicYearId,
      semesterId: c.semesterId,
      schoolId: c.schoolId,
      courseId: c.courseId,
      academicVersion: c.academicVersion,
      definitionVersionId: c.definitionVersionId,
    },
    checks: {
      identity: true,
      period: true,
      placement: true,
      applicability: true,
      validity: true,
    },
  });
  const corContext = await ctx("COR"),
    corEvidence = evidence(corContext);
  expectError(
    await request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 1, corEvidence),
    ),
    409,
    "INVALID_STATE_TRANSITION",
  );
  expectError(
    await request("staff", actionPath("COR", "send-for-verification"), {
      ...command("send-for-verification", 1),
      actorId: accounts.get("coordinator")!.id,
    }),
    422,
    "VALIDATION_FAILED",
  );
  const sendKey = randomUUID();
  const sent = (
    await ok(
      request(
        "staff",
        actionPath("COR", "send-for-verification"),
        command("send-for-verification", 1),
        sendKey,
      ),
    )
  ).json<{ id: string; version: number }>();
  assert.equal(sent.version, 2);
  assert.deepEqual(
    (
      await ok(
        request(
          "staff",
          actionPath("COR", "send-for-verification"),
          command("send-for-verification", 1),
          sendKey,
        ),
      )
    ).json(),
    sent,
  );
  expectError(
    await request(
      "staff",
      actionPath("COR", "send-for-verification"),
      command("send-for-verification", 1, { reference: "DIFFERENT" }),
      sendKey,
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  expectError(
    await request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 1, corEvidence),
    ),
    409,
    "VERSION_CONFLICT",
  );
  pass(
    "Ordered submission, current versions, immutable attribution and exact command retries are enforced",
  );
  for (const changed of [
    { academicYearId: randomUUID() },
    { semesterId: randomUUID() },
  ])
    expectError(
      await request(
        "staff",
        actionPath("COR", "verify"),
        command("verify", 2, {
          ...corEvidence,
          document: { ...corEvidence.document, ...changed },
        }),
      ),
      409,
      "REQUIREMENT_WRONG_PERIOD",
    );
  expectError(
    await request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 2, {
        ...corEvidence,
        document: { ...corEvidence.document, scholarId: randomUUID() },
      }),
    ),
    409,
    "REQUIREMENT_WRONG_SCHOLAR",
  );
  expectError(
    await request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 2, {
        ...corEvidence,
        document: { ...corEvidence.document, courseId: randomUUID() },
      }),
    ),
    409,
    "REQUIREMENT_WRONG_PLACEMENT",
  );
  expectError(
    await request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 2, {
        ...corEvidence,
        document: {
          ...corEvidence.document,
          scholarVersion: corContext.scholarVersion + 1,
        },
      }),
    ),
    409,
    "SOURCE_CHANGED",
  );
  expectError(
    await request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 2, {
        ...corEvidence,
        document: {
          ...corEvidence.document,
          academicVersion: corContext.academicVersion + 1,
        },
      }),
    ),
    409,
    "SOURCE_CHANGED",
  );
  expectError(
    await request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 2, {
        ...corEvidence,
        document: {
          ...corEvidence.document,
          definitionVersionId: randomUUID(),
        },
      }),
    ),
    409,
    "REQUIREMENT_NOT_APPLICABLE",
  );
  expectError(
    await request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 2, {
        ...corEvidence,
        checks: { ...corEvidence.checks, validity: false },
      }),
    ),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 2, { ...corEvidence, effectiveOn: later(-1) }),
    ),
    409,
    "INVALID_EFFECTIVE_DATE",
  );
  pass(
    "Wrong period, scholar, placement, stale identity/academic context and incomplete validity checks cannot verify",
  );
  const originalReceipt = (await current("COR")).receipt;
  const verified = (
    await ok(
      request(
        "coordinator",
        actionPath("COR", "verify"),
        command("verify", 2, corEvidence),
      ),
    )
  ).json<{ id: string; version: number }>();
  let cor = await current("COR");
  assert.equal(cor.status, "verified");
  assert.equal(cor.satisfiesNormalRequirement, true);
  assert.equal(cor.history.at(-1)!.actorName, "Synthetic coordinator");
  assert.equal(
    cor.history.at(-1)!.details.verification!.schoolName,
    school.name,
  );
  const [rawVerified] = await admin.execute<RowDataPacket[]>(
    "SELECT * FROM requirement_workflow_events WHERE id=?",
    [verified.id],
  );
  expectError(
    await request("staff", receiptPath("COR"), body),
    409,
    "REQUIREMENT_ALREADY_RECEIVED",
  );
  pass(
    "Verified records satisfy the normal requirement rule and preserve verifier/date/source evidence; initial receiving cannot overwrite them",
  );
  expectError(
    await request(
      "staff",
      actionPath("COR", "return-for-correction"),
      command("return-for-correction", 3, { correctionOf: null }),
    ),
    409,
    "CORRECTION_REFERENCE_REQUIRED",
  );
  expectError(
    await request(
      "staff",
      actionPath("COR", "return-for-correction"),
      command("return-for-correction", 3, { correctionOf: randomUUID() }),
    ),
    409,
    "CORRECTION_REFERENCE_REQUIRED",
  );
  await ok(
    request(
      "staff",
      actionPath("COR", "return-for-correction"),
      command("return-for-correction", 3, {
        correctionOf: verified.id,
        reason: "Correct discrepancy found in verified document",
        reference: "CORRECTION-001",
      }),
    ),
  );
  cor = await current("COR");
  assert.equal(cor.satisfiesNormalRequirement, false);
  assert.equal(cor.status, "for_correction");
  assert.equal(cor.history.at(-1)!.correctionOf, verified.id);
  expectError(
    await request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 4, corEvidence),
    ),
    409,
    "INVALID_STATE_TRANSITION",
  );
  await ok(
    request(
      "staff",
      actionPath("COR", "resubmit"),
      command("resubmit", 4, {
        physicalReference: "CORRECTED-COR-001",
        storageLocation: "Cabinet C / Corrected folder",
      }),
    ),
  );
  assert.equal((await current("COR")).status, "resubmitted");
  assert.equal((await current("COR")).satisfiesNormalRequirement, false);
  expectError(
    await request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 5, corEvidence),
    ),
    409,
    "INVALID_STATE_TRANSITION",
  );
  await ok(
    request(
      "staff",
      actionPath("COR", "send-for-verification"),
      command("send-for-verification", 5),
    ),
  );
  await ok(
    request(
      "staff",
      actionPath("COR", "verify"),
      command("verify", 6, evidence(await ctx("COR"))),
    ),
  );
  cor = await current("COR");
  assert.equal(cor.history.length, 6);
  assert.equal(cor.satisfiesNormalRequirement, true);
  assert.deepEqual(cor.receipt, originalReceipt);
  assert.equal(
    cor.history.find((e) => e.action === "resubmit")!.details.receipt!
      .storageLocation,
    "Cabinet C / Corrected folder",
  );
  const [afterVerified] = await admin.execute<RowDataPacket[]>(
    "SELECT * FROM requirement_workflow_events WHERE id=?",
    [verified.id],
  );
  assert.deepEqual(afterVerified, rawVerified);
  pass(
    "Controlled reopening links the original verification; correction/resubmission/reverification retains all prior decisions and custody",
  );
  await ok(
    request(
      "staff",
      actionPath("COG", "send-for-verification"),
      command("send-for-verification", 1),
    ),
  );
  await ok(
    request(
      "staff",
      actionPath("COG", "return-for-correction"),
      command("return-for-correction", 2, { correctionOf: null }),
    ),
  );
  await ok(
    request(
      "coordinator",
      actionPath("COG", "resubmit"),
      command("resubmit", 3, {
        physicalReference: null,
        storageLocation: "Correction intake folder",
      }),
    ),
  );
  await ok(
    request(
      "staff",
      actionPath("COG", "send-for-verification"),
      command("send-for-verification", 4),
    ),
  );
  await ok(
    request(
      "staff",
      actionPath("COG", "reject"),
      command("reject", 5, {
        reason: "Document remains invalid after correction",
      }),
    ),
  );
  assert.equal((await current("COG")).status, "rejected");
  assert.equal((await current("COG")).satisfiesNormalRequirement, false);
  expectError(
    await request(
      "staff",
      actionPath("COG", "resubmit"),
      command("resubmit", 6, {
        physicalReference: null,
        storageLocation: "New folder",
      }),
    ),
    409,
    "INVALID_STATE_TRANSITION",
  );
  pass(
    "Ordinary correction loop and rejection follow explicit transitions; rejected requirements do not satisfy the rule",
  );
  const competing = await Promise.all([
    request(
      "staff",
      actionPath("ROLLBACK", "send-for-verification"),
      command("send-for-verification", 1),
    ),
    request(
      "coordinator",
      actionPath("ROLLBACK", "send-for-verification"),
      command("send-for-verification", 1),
    ),
  ]);
  assert.deepEqual(competing.map((r) => r.statusCode).sort(), [200, 409]);
  const verifyBody = command("verify", 2, evidence(await ctx("ROLLBACK"))),
    rollbackKey = randomUUID();
  await admin.query(
    "CREATE TRIGGER fail_verification_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='requirements.workflow' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (
        await request(
          "staff",
          actionPath("ROLLBACK", "verify"),
          verifyBody,
          rollbackKey,
        )
      ).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_verification_audit");
  }
  assert.equal((await current("ROLLBACK")).status, "for_verification");
  assert.equal((await current("ROLLBACK")).history.length, 1);
  await ok(
    request("staff", actionPath("ROLLBACK", "verify"), verifyBody, rollbackKey),
  );
  pass(
    "Concurrent transitions have one winner and audit failures roll back event/state/receipt before safe retry",
  );
  for (const sql of [
    "EXPLAIN UPDATE requirement_workflow_events SET to_status=to_status WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_workflow_events WHERE 1=0",
    "EXPLAIN UPDATE requirement_workflow_commands SET result=result WHERE 1=0",
    "EXPLAIN DELETE FROM requirement_workflow_commands WHERE 1=0",
  ])
    await assert.rejects(runtime.query(sql));
  const actor = accounts.get("staff")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: actionPath("PERIOD", "send-for-verification"),
        headers: { cookie: actor.cookie, origin },
        payload: command("send-for-verification", 1),
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await request(
        "staff",
        actionPath("COR", "verify"),
        verifyBody,
        randomUUID(),
        "PATCH",
      )
    ).statusCode,
    404,
  );
  const [audit] = await admin.execute<RowDataPacket[]>(
    "SELECT details FROM audit_logs WHERE event_type='requirements.workflow' AND entity_id=?",
    [instance("COR").id],
  );
  assert.equal(audit.length, 6);
  pass(
    "Append-only grants, explicit audited commands and CSRF protect verification history",
  );
  if (!process.argv.includes("--browser")) {
    await ok(
      request("system_admin", "/api/v1/configuration/semesters/" + sem.id, {
        action: "lock",
        expectedVersion: sem.version,
        reason: "Close verification period",
      }),
    );
    expectError(
      await request(
        "staff",
        actionPath("PERIOD", "send-for-verification"),
        command("send-for-verification", 1),
      ),
      423,
      "RECORD_LOCKED",
    );
    expectError(
      await request("staff", actionPath("BROWSER", "verification-context")),
      423,
      "RECORD_LOCKED",
    );
    assert.deepEqual(
      (
        await ok(
          request(
            "staff",
            actionPath("COR", "send-for-verification"),
            command("send-for-verification", 1),
            sendKey,
          ),
        )
      ).json(),
      sent,
    );
    assert.equal((await current("COR")).history.length, 6);
  }
  pass(
    "Closed periods block new decisions/context while historical reads and completed retries remain safe",
  );
  console.log(
    `All ${passed} verification scenarios passed in an isolated disposable database.`,
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
    console.log("Disposable F16 browser fixture ready on port 3003.");
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f16_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
