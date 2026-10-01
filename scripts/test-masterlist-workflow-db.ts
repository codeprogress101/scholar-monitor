import type { WorkflowView } from "../server/masterlists/workflow-model.js";
import { digest } from "../server/auth/crypto.js";
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
const database = `ldss_f11_test_${suffix}`,
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
  assert.equal((await command()).statusCode, 200);
  assert.equal((await detail()).count, 1);
  const move = (
    action: string,
    expectedVersion: number,
    role = "staff",
    id = draft.id,
    key = randomUUID(),
    extra: object = {},
  ) =>
    request(
      role,
      `/api/v1/masterlists/${id}/${action}`,
      {
        expectedVersion,
        ...evidence,
        ...(action === "publish" ? { effectiveOn: "2026-09-03" } : {}),
        ...extra,
      },
      key,
    );
  const workflow = async (id = draft.id) => {
    const response = await request(
      "staff",
      `/api/v1/masterlists/${id}/workflow`,
    );
    assert.equal(response.statusCode, 200, response.body);
    return response.json<WorkflowView>();
  };
  const ok = async (response: Promise<LightMyRequestResponse>) => {
    const value = await response;
    assert.equal(value.statusCode, 200, value.body);
    return value.json() as { id: string; version: number };
  };
  for (const action of ["approve", "publish", "lock", "return-draft"])
    expectError(await move(action, 2), 403, "PERMISSION_DENIED");
  expectError(
    await move("approve", 2, "system_admin"),
    403,
    "PERMISSION_DENIED",
  );
  expectError(
    await move("publish", 2, "coordinator"),
    409,
    "INVALID_STATE_TRANSITION",
  );
  expectError(await move("submit-verification", 1), 409, "VERSION_CONFLICT");
  expectError(
    await move("submit-verification", 2, "staff", draft.id, randomUUID(), {
      actorId: accounts.get("coordinator")!.id,
    }),
    422,
    "VALIDATION_FAILED",
  );
  const verificationKey = randomUUID();
  const verified = await ok(
    move("submit-verification", 2, "staff", draft.id, verificationKey),
  );
  assert.equal(verified.version, 3);
  assert.deepEqual(
    (
      await move("submit-verification", 2, "staff", draft.id, verificationKey)
    ).json(),
    verified,
  );
  expectError(
    await move("submit-approval", 3, "staff", draft.id, verificationKey),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  expectError(await command("remove", 3), 423, "RECORD_LOCKED");
  await assert.rejects(
    runtime.execute(
      "UPDATE masterlist_entries SET award_number='ILLEGAL' WHERE masterlist_id=?",
      [draft.id],
    ),
  );
  await ok(move("submit-approval", 3));
  pass(
    "Official commands enforce permissions, order, revision, safe retries and submitted-entry protection",
  );
  const academic = (await list())[0];
  const academicInput = {
    expectedVersion: 0,
    kind: "year_level_correction",
    schoolId: school.id,
    courseId: course.id,
    yearLevel: "Second year",
    effectiveOn: "2026-09-02",
    remarks: "",
    ...evidence,
  };
  const change = await ok(
    request(
      "staff",
      `/api/v1/academic-records/${academic.id}/changes`,
      academicInput,
    ),
  );
  const changeId = (change as unknown as { requestId: string }).requestId;
  await ok(
    request(
      "coordinator",
      `/api/v1/academic-changes/${changeId}/approve`,
      evidence,
    ),
  );
  const stale = await move("approve", 4, "coordinator");
  expectError(stale, 422, "CANDIDATE_INVALID");
  assert.equal(stale.json().error.issues[0].code, "SOURCE_CHANGED");
  await ok(move("return-draft", 4, "coordinator"));
  await ok(command("refresh", 5));
  await ok(move("submit-verification", 6));
  await ok(move("submit-approval", 7, "coordinator"));
  expectError(
    await move("approve", 8, "coordinator"),
    403,
    "SELF_APPROVAL_DENIED",
  );
  const pending = await request(
    "staff",
    `/api/v1/academic-records/${academic.id}/changes`,
    { ...academicInput, expectedVersion: 1, yearLevel: "Third year" },
  );
  assert.equal(pending.statusCode, 200, pending.body);
  await ok(move("approve", 8, "reviewer"));
  expectError(
    await request(
      "coordinator",
      `/api/v1/academic-changes/${pending.json().requestId}/approve`,
      evidence,
    ),
    409,
    "MASTERLIST_AMENDMENT_REQUIRED",
  );
  expectError(
    await request("staff", `/api/v1/academic-records/${academic.id}/changes`, {
      ...academicInput,
      expectedVersion: 1,
      yearLevel: "Fourth year",
    }),
    409,
    "MASTERLIST_AMENDMENT_REQUIRED",
  );
  pass(
    "Approval requires fresh source snapshots and a different actor; approved membership blocks pending and new academic changes",
  );
  // A legitimate profile revision after approval must also be caught before publication.
  await admin.execute(
    "UPDATE scholars SET first_name='Updated',version=version+1 WHERE id=?",
    [person.id],
  );
  expectError(
    await move("publish", 9, "coordinator"),
    422,
    "CANDIDATE_INVALID",
  );
  await ok(move("return-draft", 9, "coordinator"));
  await ok(command("refresh", 10));
  await ok(move("submit-verification", 11));
  await ok(move("submit-approval", 12));
  await ok(move("approve", 13, "coordinator"));
  expectError(
    await move("publish", 14, "coordinator", draft.id, randomUUID(), {
      effectiveOn: "2026-08-01",
    }),
    409,
    "INVALID_EFFECTIVE_DATE",
  );
  expectError(
    await move("publish", 14, "coordinator", draft.id, randomUUID(), {
      effectiveOn: "2026-09-01",
    }),
    409,
    "INVALID_EFFECTIVE_DATE",
  );
  const publishKey = randomUUID();
  await admin.query(
    "CREATE TRIGGER fail_publication_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='masterlist.publish' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (await move("publish", 14, "coordinator", draft.id, publishKey))
        .statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_publication_audit");
  }
  let state = await workflow();
  assert.equal(state.status, "approved");
  assert.equal(state.publication, null);
  const [rollbackAnnual] = await admin.execute<RowDataPacket[]>(
    "SELECT operational_status FROM scholarship_records WHERE id=?",
    [annual.json().id],
  );
  assert.equal(rollbackAnnual[0].operational_status, null);
  const [rollbackActivation] = await admin.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM masterlist_activations",
  );
  assert.equal(Number(rollbackActivation[0].n), 0);
  pass(
    "Publication revalidates approved sources/dates and audit failures roll back snapshot, activation and workflow atomically",
  );
  const published = await ok(
    move("publish", 14, "coordinator", draft.id, publishKey),
  );
  assert.equal(published.version, 15);
  assert.deepEqual(
    (await move("publish", 14, "coordinator", draft.id, publishKey)).json(),
    published,
  );
  state = await workflow();
  assert.equal(state.status, "published");
  assert.equal(
    state.publication!.snapshot.entries[0].snapshot.placement.yearLevel,
    "Second year",
  );
  const publicationBytes = JSON.stringify(state.publication);
  assert.equal(
    state.publication!.hash,
    digest(JSON.stringify(state.publication!.snapshot)),
  );
  const [active] = await admin.execute<RowDataPacket[]>(
    "SELECT operational_status,status_version FROM scholarship_records WHERE id=?",
    [annual.json().id],
  );
  assert.equal(active[0].operational_status, "active");
  assert.equal(active[0].status_version, 1);
  const statusResponse = await request(
    "staff",
    `/api/v1/scholarships/${annual.json().id}/status`,
  );
  assert.equal(statusResponse.statusCode, 200, statusResponse.body);
  assert.equal(statusResponse.json().status, "active");
  const download = await request("staff", endpoint + "/publication");
  assert.equal(download.statusCode, 200);
  assert.match(String(download.headers["content-disposition"]), /attachment/);
  assert.deepEqual(download.json(), state.publication);
  expectError(await command("remove", 15), 423, "RECORD_LOCKED");
  expectError(
    await move("return-draft", 15, "coordinator"),
    409,
    "INVALID_STATE_TRANSITION",
  );
  pass(
    "Publication stores a verifiable immutable snapshot, activates once, and exposes the official download and Active status",
  );
  const locks = await Promise.all([
    move("lock", 15, "coordinator"),
    move("lock", 15, "reviewer"),
  ]);
  assert.deepEqual(locks.map((x) => x.statusCode).sort(), [200, 409]);
  state = await workflow();
  assert.equal(state.status, "locked");
  assert.equal(JSON.stringify(state.publication), publicationBytes);
  expectError(await command("refresh", 16), 423, "RECORD_LOCKED");
  expectError(
    await move("return-draft", 16, "coordinator"),
    423,
    "RECORD_LOCKED",
  );
  await assert.rejects(
    runtime.execute(
      "UPDATE masterlist_entries SET snapshot='{}' WHERE masterlist_id=?",
      [draft.id],
    ),
  );
  await assert.rejects(
    runtime.execute(
      "UPDATE masterlist_versions SET status='draft' WHERE id=?",
      [draft.id],
    ),
  );
  for (const table of [
    "masterlist_publications",
    "masterlist_workflow_events",
    "masterlist_activations",
  ])
    await assert.rejects(
      runtime.query(`EXPLAIN DELETE FROM ${table} WHERE 1=0`),
    );
  await assert.rejects(
    runtime.query(
      "EXPLAIN UPDATE masterlist_publications SET snapshot=snapshot WHERE 1=0",
    ),
  );
  pass(
    "Concurrent locks have one winner; locked entries/state and publication bytes remain immutable",
  );
  const duplicate = await createDraft(year.id, "Duplicate activation attempt");
  await ok(
    request("staff", `/api/v1/masterlists/${duplicate.id}/entries`, {
      action: "add",
      expectedVersion: 1,
      scholarId: person.id,
      awardNumber: null,
      ...evidence,
    }),
  );
  await ok(move("submit-verification", 2, "staff", duplicate.id));
  await ok(move("submit-approval", 3, "staff", duplicate.id));
  await ok(move("approve", 4, "coordinator", duplicate.id));
  expectError(
    await move("publish", 5, "coordinator", duplicate.id),
    409,
    "ALREADY_ACTIVATED",
  );
  assert.equal((await workflow(duplicate.id)).publication, null);
  const sessionAccount = accounts.get("coordinator")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: `/api/v1/masterlists/${duplicate.id}/publish`,
        headers: {
          cookie: sessionAccount.cookie,
          origin,
          "content-type": "application/json",
        },
        payload: { expectedVersion: 5, effectiveOn: "2026-09-03", ...evidence },
      })
    ).statusCode,
    403,
  );
  pass("A second official list cannot reactivate a scholar or bypass CSRF");
  const fresh = await createDraft(year.id, "Browser official workflow");
  const secondResponse = await request("staff", "/api/v1/scholars", {
    expectedVersion: 0,
    reason: "Synthetic fresh publication candidate",
    fields: {
      firstName: "Fresh",
      lastName: "Official",
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
  for (const [index, action] of ["exam-passed", "qualify", "select"].entries())
    await ok(
      request(
        action === "exam-passed" ? "staff" : "coordinator",
        `/api/v1/scholarships/${secondAnnual.json().id}/qualification/${action}`,
        { expectedVersion: index + 1, effectiveOn: "2026-09-01", ...evidence },
      ),
    );
  await ok(
    request("staff", `/api/v1/masterlists/${fresh.id}/entries`, {
      action: "add",
      expectedVersion: 1,
      scholarId: second.id,
      awardNumber: "OFFICIAL-002",
      ...evidence,
    }),
  );
  if (!process.argv.includes("--browser")) {
    await ok(move("submit-verification", 2, "staff", fresh.id));
    await ok(move("submit-approval", 3, "staff", fresh.id));
    await ok(move("approve", 4, "coordinator", fresh.id));
    await ok(move("publish", 5, "coordinator", fresh.id));
    const lockedYear = await request(
      "system_admin",
      `/api/v1/configuration/academic-years/${year.id}`,
      {
        action: "lock",
        expectedVersion: year.version,
        reason: "Close synthetic year",
      },
    );
    assert.equal(lockedYear.statusCode, 200, lockedYear.body);
    await ok(move("lock", 6, "coordinator", fresh.id));
    assert.equal((await workflow(fresh.id)).status, "locked");
    pass(
      "An already-published snapshot can be locked after its academic year closes",
    );
  }
  console.log(
    `All ${passed} official-masterlist scenarios passed in an isolated disposable database.`,
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
    console.log("Disposable F11 browser fixture ready on port 3003.");
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f11_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
