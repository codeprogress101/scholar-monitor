import { testAutomaticPayroll } from "./test-automatic-payroll-scenarios.js";
import { testMainPayroll } from "./test-main-payroll-scenarios.js";
import { testAudit } from "./test-audit-scenarios.js";
import { testDashboard } from "./test-dashboard-scenarios.js";
import type { Dashboard } from "../server/dashboard/service.js";
import { createDatabase } from "../server/database.js";
import { testReports } from "./test-report-scenarios.js";
import { testProfile } from "./test-profile-scenarios.js";
import { testClosedPaymentCorrection } from "./test-payment-correction-scenarios.js";
import { testAmendments } from "./test-ovr-amendment-scenarios.js";
import { testProcessing } from "./test-ovr-processing-scenarios.js";
import { testFinalization } from "./test-ovr-finalization-scenarios.js";
import { testOvrScenarios, testChangedOvr } from "./test-ovr-scenarios.js";
import type { EligibilityOverride } from "../server/eligibility/override-model.js";
import { testOverrideScenarios } from "./test-override-scenarios.js";
import type {
  EligibilityView,
  EligibilitySnapshot,
} from "../server/eligibility/model.js";
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
const database = `ldss_f19_test_${suffix}`,
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
  runtime = createDatabase(
    loadConfig({
      APP_ENV: "test",
      PORT: "3003",
      APP_ORIGIN: origin,
      DB_HOST: "127.0.0.1",
      DB_PORT: String(adminConfig.port),
      DB_NAME: database,
      DB_USER: runtimeUser,
      DB_PASSWORD: runtimePassword,
    }),
  ).pool!;
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
    ...(process.argv.includes("--snapshot-performance") ? ["performance_1","performance_2","performance_3","performance_4","performance_5"] : []),
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
        roles: [role.startsWith("performance_") ? "staff" : role as "system_admin" | "staff" | "coordinator"],
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
          lastName: "Eligibility",
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
  const evidence = {
    reason: "Review authoritative eligibility sources",
    reference: "ELIGIBILITY-019",
  };
  const definitions: Record<string, string> = {};
  for (const code of ["COR", "COG"]) {
    definitions[code] = (
      await ok(
        request("system_admin", "/api/v1/requirement-definitions", {
          action: "create",
          code,
          expectedVersion: 0,
          ...evidence,
          fields: {
            name: code + " requirement",
            instructions: "Present the physical document",
            appliesTo: "payout",
            semesterId: null,
            effectiveFrom: day,
            effectiveUntil: null,
          },
        }),
      )
    ).json().id;
  }
  const cycleFields = {
    name: "Eligibility payout",
    targetDate: day,
    requirements: Object.entries(definitions).map(
      ([code, definitionVersionId]) => ({
        definitionVersionId,
        allowWaiver: code === "COG",
      }),
    ),
  };
  let cycle = (
    await ok(
      request("system_admin", "/api/v1/payout-cycles", {
        action: "create",
        code: "ELIGIBILITY",
        semesterId: sem.id,
        expectedSemesterVersion: sem.version,
        expectedVersion: 0,
        fields: cycleFields,
        ...evidence,
      }),
    )
  ).json<PayoutCycle>();
  cycle = (
    await ok(
      request("coordinator", `/api/v1/payout-cycles/${cycle.id}/open`, {
        action: "open",
        expectedVersion: cycle.version,
        ...evidence,
      }),
    )
  ).json<PayoutCycle>();
  const path = `/api/v1/payout-cycles/${cycle.id}/scholarships/${annual.id}/eligibility`;
  const view = async () =>
    (await ok(request("staff", path))).json<EligibilityView>();
  if (process.argv.includes("--dashboard")) {
    const [before] = await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM requirement_instances");
    const initial = (await ok(request("staff", `/api/v1/dashboard?cycleId=${cycle.id}`))).json<Dashboard>();
    assert.equal(initial.cards.find(c => c.kind === "missing")?.counts.not_generated, cycle.requirements.length);
    const sources = (await view()).current.sources;
    assert.equal(sources.checklist, null);
    assert.ok(sources.requirements.every(r => r.instanceId === null && r.status === null));
    const [after] = await root.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM requirement_instances");
    assert.deepEqual(after, before, "Reading Not Generated must not provision document instances");
    pass("Dashboard Not Generated traces missing checklist/instances without provisioning records");
  }
  const payload = (v: EligibilityView) => ({
    expectedRevision: v.latest?.revision ?? 0,
    expectedSourceHash: v.current.sourceHash,
    ...evidence,
  });
  const save = async () => {
    const v = await view();
    return (
      await ok(request("staff", path + "/calculate", payload(v)))
    ).json<EligibilitySnapshot>();
  };
  for (const role of ["system_admin", "unassigned"]) {
    expectError(await request(role, path), 403, "PERMISSION_DENIED");
    expectError(
      await request(role, path + "/calculate", payload(await view())),
      403,
      "PERMISSION_DENIED",
    );
    expectError(
      await request(role, `/api/v1/payout-cycles/${cycle.id}/eligibility`),
      403,
      "PERMISSION_DENIED",
    );
  }
  assert.equal((await app.inject(path)).statusCode, 401);
  expectError(
    await request("staff", path + "/calculate", {
      ...payload(await view()),
      eligible: true,
    }),
    422,
    "VALIDATION_FAILED",
  );
  pass(
    "Eligibility sources, reports and calculation commands are private to operational roles; browser results cannot be forged",
  );
  const initial = await view();
  assert.equal(initial.current.eligible, false);
  assert.ok(
    initial.current.reasons.some((r) => r.code === "CHECKLIST_MISSING"),
  );
  assert.ok(
    initial.current.reasons.some(
      (r) => r.code === "OFFICIAL_MEMBERSHIP_REQUIRED",
    ),
  );
  const first = await save();
  assert.equal(first.revision, 1);
  assert.equal((await view()).stale, false);
  const requirementsPath = `/api/v1/scholarships/${annual.id}/requirements`;
  await ok(
    request("staff", requirementsPath + "/generate", {
      semesterId: sem.id,
      expectedSemesterVersion: sem.version,
      payoutCycleId: cycle.id,
      expectedPayoutVersion: cycle.version,
      ...evidence,
    }),
  );
  const checklist = (await ok(request("staff", requirementsPath))).json<{
    items: RequirementChecklist[];
  }>().items[0];
  const requirement = (code: string) =>
    checklist.items.find((i) => i.code === code)!;
  const documentPath = (code: string, action: string) =>
    `/api/v1/requirement-instances/${requirement(code).id}/${action}`;
  const school = await config("schools", {
      code: "ELIGIBILITY-SCHOOL",
      name: "Eligibility College",
    }),
    course = await config("courses", {
      code: "ELIGIBILITY-COURSE",
      name: "Eligibility Degree",
    });
  await ok(
    request("staff", `/api/v1/scholars/${person.id}/academic-records`, {
      academicYearId: year.id,
      schoolId: school.id,
      courseId: course.id,
      yearLevel: "First year",
      ...evidence,
    }),
  );
  const receipt = {
    expectedVersion: 0,
    receivedOn: day,
    physicalReference: null,
    storageLocation: "Eligibility Cabinet",
    remarks: null,
    reason: evidence.reason,
  };
  await ok(request("staff", documentPath("COR", "receive"), receipt));
  const workflow = (
    action: string,
    expectedVersion: number,
    extra: object = {},
  ) => ({
    action,
    expectedVersion,
    effectiveOn: day,
    ...evidence,
    remarks: null,
    ...extra,
  });
  await ok(
    request(
      "staff",
      documentPath("COR", "send-for-verification"),
      workflow("send-for-verification", 1),
    ),
  );
  const c = (
    await ok(request("staff", documentPath("COR", "verification-context")))
  ).json<VerificationContext>();
  await ok(
    request(
      "staff",
      documentPath("COR", "verify"),
      workflow("verify", 2, {
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
      }),
    ),
  );
  let state = await view();
  assert.equal(state.stale, true);
  assert.equal(state.current.eligible, false);
  assert.ok(state.current.reasons.some((r) => r.requirementCode === "COG"));
  assert.ok(!state.current.reasons.some((r) => r.requirementCode === "COR"));
  expectError(
    await request("staff", path + "/calculate", {
      ...payload(initial),
      expectedRevision: first.revision,
    }),
    409,
    "SOURCE_CHANGED",
  );
  pass(
    "COR verified and COG missing is Not Eligible; generated/changed documents mark saved sources stale and reject stale calculations",
  );
  for (const [index, action] of ["exam-passed", "qualify", "select"].entries()) {
    await ok(
      request(
        action === "exam-passed" ? "staff" : "coordinator",
        `/api/v1/scholarships/${annual.id}/qualification/${action}`,
        { expectedVersion: index + 1, effectiveOn: day, ...evidence },
      ),
    );
    if (action === "exam-passed") {
      const incomplete = await view();
      assert.equal(incomplete.current.eligible, false);
      assert.ok(incomplete.current.reasons.some((reason) => reason.requirementCode === "COG"));
      pass("F36 Exam passed with missing grades remains not payout eligible");
    }
  }
  const official = (
    await ok(
      request("staff", "/api/v1/masterlists", {
        academicYearId: year.id,
        title: "Eligibility official masterlist",
        ...evidence,
      }),
    )
  ).json<{ id: string; version: number }>();
  await ok(
    request("staff", `/api/v1/masterlists/${official.id}/entries`, {
      action: "add",
      expectedVersion: 1,
      scholarId: person.id,
      awardNumber: "ELIG-001",
      ...evidence,
    }),
  );
  for (const [i, action] of [
    "submit-verification",
    "submit-approval",
    "approve",
    "publish",
    "lock",
  ].entries())
    await ok(
      request(
        i < 2 ? "staff" : "coordinator",
        `/api/v1/masterlists/${official.id}/${action}`,
        {
          expectedVersion: i + 2,
          ...evidence,
          ...(action === "publish" ? { effectiveOn: day } : {}),
        },
      ),
    );
  const waiver = {
    expectedVersion: 0,
    effectiveOn: day,
    reason: evidence.reason,
    authorityReference: "WAIVER-019",
    remarks: null,
  };
  await ok(request("coordinator", documentPath("COG", "waive"), waiver));
  state = await view();
  assert.equal(state.current.eligible, true);
  assert.equal(state.current.sources.official.masterlistId, official.id);
  assert.equal(state.current.sources.scholarship.status, "active");
  assert.deepEqual(state.current.reasons, []);
  const eligible = await save();
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.revision, 2);
  assert.deepEqual((await view()).history.at(-1), first);
  pass(
    "Active official membership with Verified COR and policy-accepted Waived COG is Eligible; saved earlier negative evidence is immutable",
  );
  const ovrContext = {
    request,
    view,
    admin,
    runtime,
    path,
    cycleId: cycle.id,
    cycleVersion: cycle.version,
    annualId: annual.id,
  };
  if (process.argv.includes("--automatic-payroll")) await testAutomaticPayroll(ovrContext);
  if (process.argv.includes("--main-payroll")) await testMainPayroll({ admin, runtime, actor: accounts.get("coordinator")!.id, request });
  if (!process.argv.includes("--browser-release")) {
  const ovrTests = process.argv.includes("--ovr")
    ? await testOvrScenarios(ovrContext)
    : null;
  if (process.argv.includes("--reports")) {
    await testReports(ovrContext);
    pass("F29 reports reconcile to sources and shared OVR eligibility checks");
  }
  const report = (
    await ok(
      request("coordinator", `/api/v1/payout-cycles/${cycle.id}/eligibility`),
    )
  ).json<{ items: EligibilityView[]; total: number }>();
  assert.equal(report.total, 1);
  assert.deepEqual(report.items[0].current, (await view()).current);
  assert.equal(report.items[0].stale, false);
  const nextYear = await config("academic-years", {
    code: "OTHER-YEAR",
    name: "Another year",
    startsOn: later(365),
    endsOn: later(700),
  });
  const wrongAnnual = (
    await ok(
      request("staff", `/api/v1/scholars/${person.id}/scholarships`, {
        academicYearId: nextYear.id,
        expectedVersion: 0,
        effectiveOn: day,
        ...evidence,
      }),
    )
  ).json<{ id: string }>();
  expectError(
    await request(
      "staff",
      `/api/v1/payout-cycles/${cycle.id}/scholarships/${wrongAnnual.id}/eligibility`,
    ),
    409,
    "WRONG_ACADEMIC_YEAR",
  );
  pass(
    "Cycle report uses the exact individual server assessment and rejects cross-year assessment targets",
  );
  const amendment = (
    await ok(
      request("staff", `/api/v1/masterlists/${official.id}/amendments`, {
        expectedVersion: 7,
        scholarId: person.id,
        kind: "award_number",
        awardNumber: "ELIG-AMENDED",
        effectiveOn: day,
        ...evidence,
      }),
    )
  ).json<{ amendmentId: string }>();
  await ok(
    request(
      "coordinator",
      `/api/v1/masterlist-amendments/${amendment.amendmentId}/approve`,
      evidence,
    ),
  );
  await ok(
    request(
      "coordinator",
      `/api/v1/masterlist-amendments/${amendment.amendmentId}/publish`,
      evidence,
    ),
  );
  state = await view();
  assert.equal(state.current.eligible, true);
  assert.equal(state.stale, true);
  assert.equal(state.current.sources.official.amendmentRevision, 1);
  assert.notEqual(state.current.sources.official.masterlistId, official.id);
  assert.equal(state.latest!.sources.official.masterlistId, official.id);
  pass(
    "Latest approved official amendment is authoritative and invalidates prior source fingerprints without overwriting snapshots",
  );
  const drop = (
    await ok(
      request("staff", `/api/v1/scholarships/${annual.id}/status/requests`, {
        expectedVersion: 1,
        toStatus: "dropped",
        kind: "change",
        effectiveOn: day,
        reasonCode: "VERIFIED_CHANGE",
        ...evidence,
      }),
    )
  ).json<{ requestId: string }>();
  await ok(
    request(
      "coordinator",
      `/api/v1/status-requests/${drop.requestId}/approve`,
      evidence,
    ),
  );
  state = await view();
  assert.equal(state.current.eligible, false);
  assert.ok(state.current.reasons.some((r) => r.code === "STATUS_NOT_ACTIVE"));
  const dropped = await save();
  assert.equal(dropped.eligible, false);
  assert.equal(dropped.sources.scholarship.statusVersion, 2);
  const restore = (
    await ok(
      request("staff", `/api/v1/scholarships/${annual.id}/status/requests`, {
        expectedVersion: 2,
        toStatus: "active",
        kind: "correction",
        correctsRequestId: drop.requestId,
        effectiveOn: day,
        reasonCode: "CORRECTED_RECORD",
        ...evidence,
      }),
    )
  ).json<{ requestId: string }>();
  await ok(
    request(
      "coordinator",
      `/api/v1/status-requests/${restore.requestId}/approve`,
      evidence,
    ),
  );
  assert.equal((await view()).current.eligible, true);
  assert.equal((await view()).stale, true);
  pass(
    "Dropped overrides complete documents; controlled status correction requires recalculation and preserves negative history",
  );
  const body = payload(await view()),
    key = randomUUID();
  await admin.query(
    "CREATE TRIGGER fail_eligibility_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='eligibility.calculated' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (await request("staff", path + "/calculate", body, key)).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_eligibility_audit");
  }
  assert.equal((await view()).latest!.revision, dropped.revision);
  const [missing] = await admin.execute<RowDataPacket[]>(
    "SELECT command_id FROM payout_eligibility_commands WHERE command_id=?",
    [key],
  );
  assert.equal(missing.length, 0);
  const recovered = (
    await ok(request("staff", path + "/calculate", body, key))
  ).json<EligibilitySnapshot>();
  assert.deepEqual(
    (await ok(request("staff", path + "/calculate", body, key))).json(),
    recovered,
  );
  expectError(
    await request(
      "staff",
      path + "/calculate",
      { ...body, reference: "CHANGED" },
      key,
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  const raceBody = payload(await view()),
    race = await Promise.all([
      request("staff", path + "/calculate", raceBody),
      request("coordinator", path + "/calculate", raceBody),
    ]);
  assert.deepEqual(race.map((r) => r.statusCode).sort(), [200, 409]);
  pass(
    "Calculation, audit and retry receipt are atomic; exact retries are stable and concurrent calculations have one revision winner",
  );
  let strict = (
    await ok(
      request("system_admin", "/api/v1/payout-cycles", {
        action: "create",
        code: "STRICT",
        semesterId: sem.id,
        expectedSemesterVersion: sem.version,
        expectedVersion: 0,
        fields: {
          ...cycleFields,
          requirements: [
            { definitionVersionId: definitions.COG, allowWaiver: false },
          ],
        },
        ...evidence,
      }),
    )
  ).json<PayoutCycle>();
  strict = (
    await ok(
      request("coordinator", `/api/v1/payout-cycles/${strict.id}/open`, {
        action: "open",
        expectedVersion: strict.version,
        ...evidence,
      }),
    )
  ).json<PayoutCycle>();
  await ok(
    request("staff", requirementsPath + "/generate", {
      semesterId: sem.id,
      expectedSemesterVersion: sem.version,
      payoutCycleId: strict.id,
      expectedPayoutVersion: strict.version,
      ...evidence,
    }),
  );
  const strictChecklist = (await ok(request("staff", requirementsPath)))
    .json<{ items: RequirementChecklist[] }>()
    .items.find((c) => c.payoutCycleId === strict.id)!;
  await ok(
    request(
      "coordinator",
      `/api/v1/requirement-instances/${strictChecklist.items[0].id}/waive`,
      waiver,
    ),
  );
  const strictView = (
    await ok(
      request(
        "staff",
        `/api/v1/payout-cycles/${strict.id}/scholarships/${annual.id}/eligibility`,
      ),
    )
  ).json<EligibilityView>();
  assert.equal(strictView.current.eligible, false);
  assert.ok(
    strictView.current.reasons.some((r) => r.code === "WAIVER_EXCLUDED"),
  );
  pass(
    "Same scholar's separate cycle can exclude waivers without borrowing another payout's satisfied documents",
  );
  for (const table of ["payout_eligibility", "payout_eligibility_commands"]) {
    await assert.rejects(
      runtime.query(`EXPLAIN DELETE FROM ${table} WHERE 1=0`),
    );
    await assert.rejects(
      runtime.query(`EXPLAIN UPDATE ${table} SET actor_id=actor_id WHERE 1=0`),
    );
  }
  const [audits] = await admin.execute<RowDataPacket[]>(
    "SELECT id FROM audit_logs WHERE event_type='eligibility.calculated'",
  );
  assert.equal(audits.length, (await view()).history.length);
  const staff = accounts.get("staff")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: path + "/calculate",
        headers: { cookie: staff.cookie, origin },
        payload: payload(await view()),
      })
    ).statusCode,
    403,
  );
  pass(
    "Append-only grants, source evidence audit and CSRF protect eligibility calculations",
  );
  const dashboardBefore = process.argv.includes("--dashboard")
    ? await testDashboard(ovrContext)
    : null;
  const beforeCorrection = await view();
  const corSource = beforeCorrection.current.sources.requirements.find(
    (r) => r.code === "COR",
  )!;
  await ok(
    request(
      "staff",
      documentPath("COR", "return-for-correction"),
      workflow("return-for-correction", corSource.version, {
        correctionOf: corSource.latestEventId,
      }),
    ),
  );
  const afterCorrection = await view();
  if (dashboardBefore) {
    const after = await testDashboard(ovrContext);
    assert.equal(
      after.cards.find((c) => c.kind === "missing")!.total,
      dashboardBefore.cards.find((c) => c.kind === "missing")!.total + 1,
    );
    assert.notEqual(
      after.cards.find((c) => c.kind === "eligibility")!.sourceHash,
      dashboardBefore.cards.find((c) => c.kind === "eligibility")!.sourceHash,
    );
    pass(
      "F30 dashboard matches reports and refreshes after document reopening",
    );
  }
  assert.equal(afterCorrection.current.eligible, false);
  assert.equal(afterCorrection.stale, true);
  assert.equal(afterCorrection.latest!.eligible, true);
  assert.ok(
    afterCorrection.current.reasons.some(
      (r) =>
        r.requirementCode === "COR" && r.code === "REQUIREMENT_UNSATISFIED",
    ),
  );
  const correctedReport = (
    await ok(request("staff", `/api/v1/payout-cycles/${cycle.id}/eligibility`))
  ).json<{ items: EligibilityView[] }>();
  assert.deepEqual(correctedReport.items[0].current, afterCorrection.current);
  assert.equal(correctedReport.items[0].stale, true);
  pass(
    "Document reopening invalidates saved eligibility while report and individual assessment agree on the new negative result",
  );
  if (ovrTests) {
    ovrTests.batch = await testChangedOvr(ovrContext, ovrTests.batch);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: ovrTests.base,
          headers: { cookie: staff.cookie, origin },
          payload: ovrTests.body,
        })
      ).statusCode,
      403,
    );
  }
  const overrideTests = process.argv.includes("--overrides")
    ? await testOverrideScenarios({
        request,
        path,
        view,
        save,
        admin,
        runtime,
        changeSource: async () => {
          const v = await view(),
            r = v.current.sources.requirements.find((r) => r.code === "COR")!;
          await ok(
            request(
              "staff",
              documentPath("COR", "resubmit"),
              workflow("resubmit", r.version, {
                physicalReference: "RESUBMIT-020",
                storageLocation: "Eligibility Cabinet",
              }),
            ),
          );
        },
        changeSourceAgain: async () => {
          const v = await view(),
            r = v.current.sources.requirements.find((r) => r.code === "COR")!;
          await ok(
            request(
              "staff",
              documentPath("COR", "send-for-verification"),
              workflow("send-for-verification", r.version),
            ),
          );
        },
      })
    : null;
  if (overrideTests) {
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: path + "/overrides",
          headers: { cookie: staff.cookie, origin },
          payload: overrideTests.body,
        })
      ).statusCode,
      403,
    );
  }
  const finalizationTests =
    process.argv.includes("--finalization") ||
    process.argv.includes("--processing") ||
    process.argv.includes("--amendments") ||
    process.argv.includes("--payments")
      ? await testFinalization(ovrContext)
      : null;
  if (finalizationTests && process.argv.includes("--reports")) {
    await testReports(ovrContext);
    pass("F29 pending payment outcomes match finalized rosters");
  }
  if (finalizationTests && process.argv.includes("--amendments"))
    await testAmendments(
      ovrContext,
      finalizationTests.batch,
      finalizationTests,
    );
  if (
    finalizationTests &&
    (process.argv.includes("--processing") ||
      process.argv.includes("--payments"))
  )
    await testProcessing(ovrContext, finalizationTests.batch);
  if (finalizationTests && process.argv.includes("--payments"))
    await testClosedPaymentCorrection(ovrContext, finalizationTests.batch.id);
  if (finalizationTests && process.argv.includes("--dashboard")) {
    await testDashboard(ovrContext);
    pass("F30 payment and roster metrics match corrected source reports");
  }
  if (finalizationTests && process.argv.includes("--profile"))
    await testProfile(ovrContext, finalizationTests.batch.id);
  if (finalizationTests && process.argv.includes("--reports")) {
    await testReports(ovrContext);
    pass("F29 reports reconcile after finalization and approved corrections");
  }
  if (finalizationTests) {
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/ovr-batches/${finalizationTests.batch.id}/finalize`,
          headers: { cookie: staff.cookie, origin },
          payload: {
            expectedRevision: finalizationTests.batch.revision,
            ...evidence,
          },
        })
      ).statusCode,
      403,
    );
  }
  if (!process.argv.includes("--browser")) {
    await ok(
      request("coordinator", `/api/v1/payout-cycles/${cycle.id}/lock`, {
        action: "lock",
        expectedVersion: cycle.version,
        ...evidence,
      }),
    );
    expectError(
      await request("staff", path + "/calculate", payload(await view())),
      423,
      "PAYOUT_NOT_OPEN",
    );
    assert.deepEqual(
      (await ok(request("staff", path + "/calculate", body, key))).json(),
      recovered,
    );
    assert.equal((await view()).canCalculate, false);
    assert.equal((await view()).stale, true);
    pass(
      "Locked cycle preserves read/history and exact completed retries while refusing new calculation snapshots",
    );
  }
  if (overrideTests && !process.argv.includes("--browser")) {
    const commandPath =
      path + "/overrides/" + overrideTests.review.id + "/approve";
    expectError(
      await request("coordinator", commandPath, {
        expectedRevision: overrideTests.review.revision,
        ...evidence,
      }),
      423,
      "PAYOUT_NOT_OPEN",
    );
    await ok(
      request("coordinator", `/api/v1/payout-cycles/${cycle.id}/close`, {
        action: "close",
        expectedVersion: cycle.version + 1,
        ...evidence,
      }),
    );
    expectError(
      await request("staff", path + "/overrides", overrideTests.body),
      423,
      "PAYOUT_NOT_OPEN",
    );
    expectError(
      await request("coordinator", commandPath, {
        expectedRevision: overrideTests.review.revision,
        ...evidence,
      }),
      423,
      "PAYOUT_NOT_OPEN",
    );
    assert.deepEqual(
      (
        await ok(
          request(
            "staff",
            path + "/overrides",
            overrideTests.body,
            overrideTests.key,
          ),
        )
      ).json(),
      overrideTests.first,
    );
    pass(
      "F20 CSRF, locked/closed cycle commands and immutable completed retries remain protected",
    );
  }
  if (ovrTests && !process.argv.includes("--browser")) {
    expectError(
      await request("staff", ovrTests.base, {
        ...ovrTests.body,
        code: "LOCKED-021",
      }),
      423,
      "PAYOUT_NOT_OPEN",
    );
    for (const action of ["entries/add", "entries/remove", "validate"]) {
      expectError(
        await request(
          "staff",
          `/api/v1/ovr-batches/${ovrTests.batch.id}/${action}`,
          {
            expectedRevision: ovrTests.batch.revision,
            ...evidence,
            ...(action === "validate" ? {} : { scholarshipId: annual.id }),
          },
        ),
        423,
        "PAYOUT_NOT_OPEN",
      );
    }
    assert.deepEqual(
      (
        await ok(
          request("staff", ovrTests.base, ovrTests.body, ovrTests.createKey),
        )
      ).json(),
      ovrTests.created,
    );
    expectError(
      await request("coordinator", `/api/v1/payout-cycles/${cycle.id}/close`, {
        action: "close",
        expectedVersion: cycle.version + 1,
        ...evidence,
      }),
      409,
      "PAYOUT_CYCLE_UNFINISHED",
    );
    expectError(
      await request("staff", ovrTests.base, {
        ...ovrTests.body,
        code: "CLOSED-021",
      }),
      423,
      "PAYOUT_NOT_OPEN",
    );
    pass(
      "F21 locked payout guards, unfinished-batch closure protection and exact historical retries are enforced",
    );
  }
  if (ovrTests && process.argv.includes("--browser")) {
    let v = await view(),
      r = v.current.sources.requirements.find((r) => r.code === "COR")!;
    await ok(
      request(
        "staff",
        documentPath("COR", "resubmit"),
        workflow("resubmit", r.version, {
          physicalReference: "OVR-RESUBMIT",
          storageLocation: "Eligibility Cabinet",
        }),
      ),
    );
    v = await view();
    r = v.current.sources.requirements.find((r) => r.code === "COR")!;
    await ok(
      request(
        "staff",
        documentPath("COR", "send-for-verification"),
        workflow("send-for-verification", r.version),
      ),
    );
    const context = (
      await ok(request("staff", documentPath("COR", "verification-context")))
    ).json<VerificationContext>();
    v = await view();
    r = v.current.sources.requirements.find((r) => r.code === "COR")!;
    await ok(
      request(
        "staff",
        documentPath("COR", "verify"),
        workflow("verify", r.version, {
          document: {
            scholarId: context.scholarId,
            scholarVersion: context.scholarVersion,
            academicYearId: context.academicYearId,
            semesterId: context.semesterId,
            schoolId: context.schoolId,
            courseId: context.courseId,
            academicVersion: context.academicVersion,
            definitionVersionId: context.definitionVersionId,
          },
          checks: {
            identity: true,
            period: true,
            placement: true,
            applicability: true,
            validity: true,
          },
        }),
      ),
    );
    await save();
    v = await view();
    let o = (
      await ok(
        request("staff", path + "/overrides", {
          expectedRevision: 0,
          calculationId: v.latest!.id,
          expectedSourceHash: v.current.sourceHash,
          requestedEligible: true,
          reasonCode: "CURRENT_REVIEW",
          justification:
            "Synthetic current evidence for OVR browser validation",
          authorityReference: "BROWSER-021",
          ...evidence,
        }),
      )
    ).json<EligibilityOverride>();
    o = (
      await ok(
        request("staff", path + `/overrides/${o.id}/submit-review`, {
          expectedRevision: o.revision,
          ...evidence,
        }),
      )
    ).json<EligibilityOverride>();
    await ok(
      request("coordinator", path + `/overrides/${o.id}/approve`, {
        expectedRevision: o.revision,
        ...evidence,
      }),
    );
  }
  if (
    finalizationTests &&
    !process.argv.includes("--browser") &&
    !process.argv.includes("--processing") &&
    !process.argv.includes("--amendments") &&
    !process.argv.includes("--payments")
  ) {
    expectError(
      await request(
        "coordinator",
        `/api/v1/ovr-batches/${finalizationTests.batch.id}/finalize`,
        { expectedRevision: finalizationTests.batch.revision, ...evidence },
      ),
      423,
      "PAYOUT_NOT_OPEN",
    );
    pass("F22 finalization observes CSRF and payout locks");
  }
  if (process.argv.includes("--audit")) {
    await testAudit(ovrContext);
    pass(
      "F31 role scope, evidence, grants and transactional audit rollback verified",
    );
  }
  if (finalizationTests && process.argv.includes("--payments")) {
    const batchPath = `/api/v1/ovr-batches/${finalizationTests.batch.id}`;
    const before = (await ok(request("staff", batchPath))).json();
    const nextSemester = await config("semesters", {
      code: "UAT-NEXT-SEM", name: "UAT next semester",
      academicYearId: year.id, startsOn: later(101), endsOn: later(200),
    });
    await ok(request("system_admin", "/api/v1/requirement-definitions", {
      action: "create", code: "UAT-NEXT-COR", expectedVersion: 0, ...evidence,
      fields: { name: "New semester COR", instructions: "Present the physical COR",
        appliesTo: "semester", semesterId: nextSemester.id,
        effectiveFrom: later(101), effectiveUntil: null },
    }));
    await ok(request("staff", requirementsPath + "/generate", {
      semesterId: nextSemester.id, expectedSemesterVersion: nextSemester.version,
      ...evidence,
    }));
    const after = (await ok(request("staff", batchPath))).json();
    // Live eligibility validation may change with new policy. Frozen financial
    // and official evidence must not change with it.
    for (const field of ["batch", "history", "payments", "originalPayments", "paymentCorrections",
      "amendments", "effectiveFinalization", "reconciliation", "finalization"]) {
      assert.notEqual(before[field], undefined);
      assert.deepEqual(after[field], before[field], `Previous semester ${field} changed`);
    }
    pass("F36 New semester checklist preserves previous paid roster, outcomes, corrections and finalization history");
  }
  }
  console.log(
    `All ${passed} eligibility scenarios passed in an isolated disposable database.`,
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
    console.log("Disposable F19 browser fixture ready on port 3003.");
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f19_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
