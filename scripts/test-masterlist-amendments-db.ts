import type {
  AmendmentView,
  AmendmentResult,
} from "../server/masterlists/amendment-model.js";
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
const database = `ldss_f12_test_${suffix}`,
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
  const original = (await workflow()).publication!;
  const originalJSON = JSON.stringify(original);
  const [originalBytesRows] = await admin.execute<RowDataPacket[]>(
    "SELECT snapshot FROM masterlist_publications WHERE masterlist_id=?",
    [draft.id],
  );
  const originalBytes = originalBytesRows[0].snapshot;
  const hold = await request(
    "staff",
    `/api/v1/scholarships/${annual.json().id}/status/requests`,
    {
      expectedVersion: 1,
      toStatus: "on_hold",
      kind: "change",
      effectiveOn: "2026-09-03",
      reasonCode: "VERIFIED_HOLD",
      ...evidence,
    },
  );
  assert.equal(hold.statusCode, 200, hold.body);
  const held = await request(
    "coordinator",
    `/api/v1/status-requests/${hold.json().requestId}/approve`,
    evidence,
  );
  assert.equal(held.statusCode, 200, held.body);
  const [originalStatusRows] = await admin.execute<RowDataPacket[]>(
    "SELECT operational_status,status_version,status_effective_on FROM scholarship_records WHERE id=?",
    [annual.json().id],
  );
  const originalStatus = originalStatusRows[0];
  const amendmentBody = {
    expectedVersion: 16,
    scholarId: person.id,
    kind: "year_level_correction",
    yearLevel: "Third year",
    effectiveOn: "2026-09-04",
    ...evidence,
  };
  const amendmentView = async (id = draft.id) => {
    const response = await request(
      "staff",
      `/api/v1/masterlists/${id}/amendments`,
    );
    assert.equal(response.statusCode, 200, response.body);
    return response.json<AmendmentView>();
  };
  const propose = async (
    body: object = amendmentBody,
    id = draft.id,
    role = "staff",
    key = randomUUID(),
  ) => request(role, `/api/v1/masterlists/${id}/amendments`, body, key);
  const decision = (
    id: string,
    action: string,
    role = "coordinator",
    key = randomUUID(),
  ) =>
    request(
      role,
      `/api/v1/masterlist-amendments/${id}/${action}`,
      evidence,
      key,
    );
  const result = async (response: Promise<LightMyRequestResponse>) => {
    const r = await response;
    assert.equal(r.statusCode, 200, r.body);
    return r.json<AmendmentResult>();
  };
  for (const role of ["system_admin", "unassigned"]) {
    expectError(
      await propose(amendmentBody, draft.id, role),
      403,
      "PERMISSION_DENIED",
    );
    expectError(
      await request(role, endpoint + "/amendments"),
      403,
      "PERMISSION_DENIED",
    );
  }
  expectError(
    await propose({
      ...amendmentBody,
      approverId: accounts.get("coordinator")!.id,
    }),
    422,
    "VALIDATION_FAILED",
  );
  expectError(
    await propose({ ...amendmentBody, expectedVersion: 15 }),
    409,
    "VERSION_CONFLICT",
  );
  const key = randomUUID(),
    first = await result(propose(amendmentBody, draft.id, "staff", key));
  assert.deepEqual(
    (await propose(amendmentBody, draft.id, "staff", key)).json(),
    first,
  );
  expectError(
    await propose(
      { ...amendmentBody, yearLevel: "Fourth year" },
      draft.id,
      "staff",
      key,
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  expectError(
    await decision(first.amendmentId, "approve", "staff"),
    403,
    "PERMISSION_DENIED",
  );
  expectError(
    await decision(first.amendmentId, "publish"),
    409,
    "APPROVAL_REQUIRED",
  );
  const self = await result(
    propose(
      { ...amendmentBody, yearLevel: "Fourth year" },
      draft.id,
      "coordinator",
    ),
  );
  expectError(
    await decision(self.amendmentId, "approve"),
    403,
    "SELF_APPROVAL_DENIED",
  );
  await result(decision(self.amendmentId, "cancel"));
  pass(
    "Amendment requests enforce roles, typed changes, current revisions, retry keys and separate approval",
  );
  const rejected = await result(
    propose({ ...amendmentBody, yearLevel: "Fourth year" }),
  );
  await result(decision(rejected.amendmentId, "reject"));
  assert.equal(JSON.stringify((await workflow()).publication), originalJSON);
  assert.equal((await list())[0].yearLevel, "Second year");
  const competing = await result(
    propose({ ...amendmentBody, yearLevel: "Fifth year" }),
  );
  await result(decision(competing.amendmentId, "approve"));
  await result(decision(first.amendmentId, "approve"));
  assert.equal((await list())[0].yearLevel, "Second year");
  expectError(
    await decision(first.amendmentId, "publish", "staff"),
    403,
    "PERMISSION_DENIED",
  );
  pass(
    "Rejected and merely approved amendments leave official snapshots and authoritative placement unchanged",
  );
  const amendmentPublishKey = randomUUID();
  await admin.query(
    "CREATE TRIGGER fail_amendment_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='masterlist.amendment.publish' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END",
  );
  try {
    assert.equal(
      (
        await decision(
          first.amendmentId,
          "publish",
          "coordinator",
          amendmentPublishKey,
        )
      ).statusCode,
      500,
    );
  } finally {
    await admin.query("DROP TRIGGER fail_amendment_audit");
  }
  assert.equal((await amendmentView()).versions.length, 1);
  assert.equal((await list())[0].yearLevel, "Second year");
  assert.equal(JSON.stringify((await workflow()).publication), originalJSON);
  const amended = await result(
    decision(first.amendmentId, "publish", "coordinator", amendmentPublishKey),
  );
  assert.ok(amended.masterlistId);
  const v11 = amended.masterlistId!;
  assert.deepEqual(
    (
      await decision(
        first.amendmentId,
        "publish",
        "coordinator",
        amendmentPublishKey,
      )
    ).json(),
    amended,
  );
  const amendedOfficial = (await workflow(v11)).publication!;
  assert.equal((await workflow(v11)).status, "locked");
  assert.equal(
    amendedOfficial.snapshot.entries[0].snapshot.placement.yearLevel,
    "Third year",
  );
  assert.equal(amendedOfficial.snapshot.lineage!.versionLabel, "1.1");
  assert.equal(
    amendedOfficial.hash,
    digest(JSON.stringify(amendedOfficial.snapshot)),
  );
  assert.equal((await list())[0].yearLevel, "Third year");
  assert.equal(JSON.stringify((await workflow()).publication), originalJSON);
  const [statusAfter] = await admin.execute<RowDataPacket[]>(
    "SELECT operational_status,status_version,status_effective_on FROM scholarship_records WHERE id=?",
    [annual.json().id],
  );
  assert.deepEqual(statusAfter[0], originalStatus);
  const [activations] = await admin.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM masterlist_activations",
  );
  assert.equal(Number(activations[0].n), 1);
  pass(
    "Amendment publication rolls back atomically on audit failure; retry creates locked 1.1 and academic history without reactivation",
  );
  expectError(
    await decision(competing.amendmentId, "publish"),
    409,
    "VERSION_CONFLICT",
  );
  expectError(await propose(), 409, "VERSION_CONFLICT");
  assert.deepEqual(
    (await amendmentView()).versions.map((v) => v.label),
    ["1.0", "1.1"],
  );
  const awardBody = {
    expectedVersion: 2,
    scholarId: person.id,
    kind: "award_number",
    awardNumber: "AMENDED-AWARD",
    effectiveOn: "2026-09-04",
    ...evidence,
  };
  const award = await result(propose(awardBody, v11));
  await result(decision(award.amendmentId, "approve"));
  const awardPub = await result(decision(award.amendmentId, "publish"));
  let latest = awardPub.masterlistId!;
  assert.equal(
    (await workflow(latest)).publication!.snapshot.entries[0].awardNumber,
    "AMENDED-AWARD",
  );
  assert.equal(
    (await workflow(v11)).publication!.snapshot.entries[0].awardNumber,
    null,
  );
  assert.equal((await list())[0].yearLevel, "Third year");
  pass(
    "Latest-version checks prevent forks; 1.2 preserves earlier releases and corrects only the award number",
  );
  const destination = await config("courses", {
    code: "AMEND-COURSE",
    name: "Amendment destination",
  });
  const courseRequest = await result(
    propose(
      {
        expectedVersion: 2,
        scholarId: person.id,
        kind: "course_shift",
        courseId: destination.id,
        effectiveOn: "2026-09-04",
        ...evidence,
      },
      latest,
    ),
  );
  const archived = await request(
    "system_admin",
    `/api/v1/configuration/courses/${destination.id}`,
    {
      action: "archive",
      expectedVersion: destination.version,
      reason: "Archive synthetic destination",
    },
  );
  assert.equal(archived.statusCode, 200, archived.body);
  expectError(
    await decision(courseRequest.amendmentId, "approve"),
    409,
    "REFERENCE_UNAVAILABLE",
  );
  await result(decision(courseRequest.amendmentId, "cancel", "staff"));
  const newSchool = await config("schools", {
      code: "AMEND-SCHOOL",
      name: "Amended College",
    }),
    newCourse = await config("courses", {
      code: "AMEND-COURSE-2",
      name: "Amended Degree",
    });
  const both = await result(
    propose(
      {
        expectedVersion: 2,
        scholarId: person.id,
        kind: "both",
        schoolId: newSchool.id,
        courseId: newCourse.id,
        effectiveOn: "2026-09-04",
        ...evidence,
      },
      latest,
    ),
  );
  await result(decision(both.amendmentId, "approve"));
  latest = (await result(decision(both.amendmentId, "publish"))).masterlistId!;
  assert.equal(
    (await workflow(latest)).publication!.snapshot.entries[0].snapshot.placement
      .schoolId,
    newSchool.id,
  );
  assert.equal((await list())[0].courseId, newCourse.id);
  pass(
    "Destinations are rechecked at approval; combined school/course amendments synchronize approved academic history",
  );
  await admin.execute(
    "UPDATE scholars SET first_name='Corrected',version=version+1 WHERE id=?",
    [person.id],
  );
  const identityBody = {
    expectedVersion: 2,
    scholarId: person.id,
    kind: "identity_refresh",
    effectiveOn: "2026-09-04",
    ...evidence,
  };
  const identity = await result(propose(identityBody, latest));
  await result(decision(identity.amendmentId, "approve"));
  await admin.execute(
    "UPDATE scholars SET first_name='Latest',version=version+1 WHERE id=?",
    [person.id],
  );
  expectError(
    await decision(identity.amendmentId, "publish"),
    409,
    "SOURCE_CHANGED",
  );
  const freshIdentity = await result(propose(identityBody, latest));
  await result(decision(freshIdentity.amendmentId, "approve"));
  latest = (await result(decision(freshIdentity.amendmentId, "publish")))
    .masterlistId!;
  const identitySnapshot = (await workflow(latest)).publication!.snapshot
    .entries[0].snapshot;
  assert.match(identitySnapshot.name, /Latest/);
  assert.equal(identitySnapshot.humanId, person.scholarId);
  pass(
    "Identity refresh uses the authoritative registry and rejects intervening source changes without altering Scholar ID",
  );
  const left = await result(
      propose({ ...awardBody, awardNumber: "RACE-LEFT" }, latest),
    ),
    right = await result(
      propose({ ...awardBody, awardNumber: "RACE-RIGHT" }, latest),
    );
  await result(decision(left.amendmentId, "approve"));
  await result(decision(right.amendmentId, "approve"));
  const raced = await Promise.all([
    decision(left.amendmentId, "publish", "coordinator"),
    decision(right.amendmentId, "publish", "reviewer"),
  ]);
  assert.deepEqual(raced.map((r) => r.statusCode).sort(), [200, 409]);
  latest = raced
    .find((r) => r.statusCode === 200)!
    .json<AmendmentResult>().masterlistId!;
  assert.deepEqual(
    (await amendmentView()).versions.map((v) => v.label),
    ["1.0", "1.1", "1.2", "1.3", "1.4", "1.5"],
  );
  const [currentOriginal] = await admin.execute<RowDataPacket[]>(
    "SELECT snapshot FROM masterlist_publications WHERE masterlist_id=?",
    [draft.id],
  );
  assert.equal(currentOriginal[0].snapshot, originalBytes);
  pass(
    "Concurrent approved publications create exactly one next version and preserve the original snapshot bytes",
  );
  for (const table of [
    "masterlist_amendments",
    "masterlist_amendment_decisions",
    "masterlist_amendment_versions",
    "masterlist_amendment_commands",
  ])
    await assert.rejects(
      runtime.query(`EXPLAIN DELETE FROM ${table} WHERE 1=0`),
    );
  await assert.rejects(
    runtime.query(
      "EXPLAIN UPDATE masterlist_amendments SET reason=reason WHERE 1=0",
    ),
  );
  await assert.rejects(
    runtime.execute(
      "UPDATE masterlist_entries SET award_number='OVERWRITE' WHERE masterlist_id=?",
      [latest],
    ),
  );
  const account = accounts.get("staff")!;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: `/api/v1/masterlists/${latest}/amendments`,
        headers: {
          cookie: account.cookie,
          origin,
          "content-type": "application/json",
        },
        payload: {
          ...amendmentBody,
          expectedVersion: 2,
          yearLevel: "Fourth year",
        },
      })
    ).statusCode,
    403,
  );
  pass(
    "Amendment history, published entries and command receipts retain immutable grants and CSRF protection",
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
      "Disposable F12 fixture ready; open the latest v1.5 masterlist on port 3003.",
    );
    await finished;
    await fixture.close();
  } else {
    const pendingClose = await result(
      propose(
        { ...amendmentBody, expectedVersion: 2, yearLevel: "Fourth year" },
        latest,
      ),
    );
    await result(decision(pendingClose.amendmentId, "approve"));
    const locked = await request(
      "system_admin",
      `/api/v1/configuration/academic-years/${year.id}`,
      {
        action: "lock",
        expectedVersion: year.version,
        reason: "Close synthetic academic year",
      },
    );
    assert.equal(locked.statusCode, 200, locked.body);
    expectError(
      await decision(pendingClose.amendmentId, "publish"),
      423,
      "RECORD_LOCKED",
    );
    pass(
      "Period locks are rechecked before publishing an already-approved amendment",
    );
  }
  console.log(
    `All ${passed} amendment and prerequisite scenarios passed in an isolated disposable database.`,
  );
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f12_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
