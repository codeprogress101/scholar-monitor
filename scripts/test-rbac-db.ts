import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import type { LightMyRequestResponse } from "fastify";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { applyMigrations, grantAuthRuntime } from "./migration-lib.mjs";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { AuthService, AuthError } from "../server/auth/service.js";
import { newToken } from "../server/auth/crypto.js";
import { AuthorizationService } from "../server/authorization/service.js";
import {
  PERMISSION_CODES,
  type PermissionCode,
  type RoleCode,
} from "../server/authorization/policy.js";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_f02_test_${suffix}`;
const runtimeUser = `ldss_test_${suffix}`;
const runtimePassword = newToken();
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
  console.log(`PASS ${name}`);
};
const hasCode = (code: string) => (error: unknown) =>
  error instanceof AuthError && error.code === code;
const password = "A long synthetic testing passphrase!";
const origin = "http://127.0.0.1:3003";
// Expected authority is independent of the seeded SQL; assert every permission for every role.
const staff: PermissionCode[] = [
  "scholars.read",
  "scholars.create",
  "scholars.update",
  "academic.edit",
  "requirements.receive",
  "requirements.verify",
  "masterlists.prepare",
  "masterlists.amendments.request",
  "scholarship.status.request",
  "eligibility.overrides.request",
  "ovr.prepare",
  "configuration.read",
  "audit.view_limited",
];
const expected: Record<RoleCode | "unassigned", PermissionCode[]> = {
  staff,
  coordinator: [
    ...staff.filter((code) => code !== "audit.view_limited"),
    "requirements.waive",
    "masterlists.approve",
    "masterlists.publish",
    "masterlists.lock",
    "masterlists.amendments.approve",
    "scholarship.status.approve",
    "eligibility.overrides.approve",
    "ovr.finalize",
    "ovr.close",
    "audit.view_all",
  ],
  system_admin: [
    "users.manage",
    "roles.manage",
    "configuration.read",
    "configuration.manage",
    "audit.view_all",
    "audit.export",
  ],
  unassigned: [],
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
    connectionLimit: 4,
  });
  const auth = new AuthService(root);
  const operator = new AuthorizationService(root);
  const permissions = new AuthorizationService(runtime);
  const db = {
    pool: runtime,
    check: async () => "connected" as const,
    close: async () => {},
  };
  app = buildApp(
    loadConfig({ APP_ENV: "test", PORT: "3003", APP_ORIGIN: origin }),
    { database: db },
  );
  for (const permission of PERMISSION_CODES)
    app.post(
      `/api/v1/_test/${permission}`,
      { config: { permission } },
      async (request) =>
        permissions.withPermission(
          request.authSession!.user.id,
          permission,
          async () => ({ authorized: true }),
        ),
    );
  app.get("/api/v1/_test/unclassified", async () => ({ shouldNeverRun: true }));
  const accounts = new Map<
    string,
    { id: string; email: string; cookie: string; csrf: string }
  >();
  for (const role of Object.keys(expected) as (RoleCode | "unassigned")[]) {
    const email = `${role}@example.invalid`;
    const id = await auth.createAccount(
      `Synthetic ${role}`,
      email,
      "test-operator",
    );
    const token = await auth.issueReset(
      email,
      "test-operator",
      "Synthetic activation",
    );
    await auth.resetPassword(token, password, "127.0.0.1", randomUUID());
    if (role !== "unassigned") {
      const account = await operator.inspectByEmail(email);
      await operator.setRoles({
        email,
        roles: [role],
        expectedVersion: account.version,
        requestId: randomUUID(),
        reason: "Fixture role assignment",
        operator: "test-operator",
      });
    }
    const response: LightMyRequestResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin, "content-type": "application/json" },
      payload: { email, password },
    });
    assert.equal(response.statusCode, 200);
    accounts.set(role, {
      id,
      email,
      cookie: String(response.headers["set-cookie"]).split(";")[0],
      csrf: response.json().csrfToken,
    });
  }
  const request = (role: string, url: string, mutate = false) => {
    const account = accounts.get(role)!;
    return app!.inject({
      method: mutate ? "POST" : "GET",
      url,
      headers: {
        cookie: account.cookie,
        origin,
        "x-role": "coordinator",
        "x-user-id": accounts.get("coordinator")!.id,
        ...(mutate
          ? { "content-type": "application/json", "x-csrf-token": account.csrf }
          : {}),
      },
      ...(mutate
        ? { payload: { role: "coordinator", permissions: PERMISSION_CODES } }
        : {}),
    });
  };
  assert.equal((await app.inject("/api/v1/me/permissions")).statusCode, 401);
  for (const role of Object.keys(expected) as (RoleCode | "unassigned")[]) {
    const response = await request(
      role,
      "/api/v1/me/permissions?userId=forged",
    );
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().userId, accounts.get(role)!.id);
    assert.deepEqual(
      response
        .json()
        .permissions.map((item: { code: string }) => item.code)
        .sort(),
      [...expected[role]].sort(),
    );
    for (const permission of PERMISSION_CODES) {
      const result = await request(role, `/api/v1/_test/${permission}`, true);
      assert.equal(
        result.statusCode,
        expected[role].includes(permission) ? 200 : 403,
        `${role}: ${permission}: ${result.body}`,
      );
      if (result.statusCode === 403)
        assert.equal(result.json().error.code, "PERMISSION_DENIED");
    }
    assert.equal(
      (await request(role, "/api/v1/_test/unclassified")).statusCode,
      403,
    );
    assert.equal(
      (await request(role, "/api/v1/admin/role-catalog")).statusCode,
      role === "system_admin" ? 200 : 403,
    );
  }
  pass(
    "108 direct API permission decisions match the complete role matrix; forged browser roles and actor IDs have no authority",
  );
  pass(
    "Staff cannot approve masterlists; Coordinator can; System Administrator cannot finalize OVR",
  );
  pass(
    "Anonymous access, unassigned accounts, missing route policy, and unauthorized role catalog are denied",
  );
  const target = accounts.get("coordinator")!;
  const current = await operator.inspectByEmail(target.email);
  const command = {
    email: target.email,
    roles: [] as RoleCode[],
    expectedVersion: current.version,
    requestId: randomUUID(),
    operator: "test-operator",
    reason: "Revoke fixture authority",
  };
  const changed = await operator.setRoles(command);
  assert.equal(changed.version, current.version + 1);
  assert.equal(
    (await request("coordinator", "/api/v1/_test/masterlists.approve", true))
      .statusCode,
    403,
  );
  assert.equal(
    (await request("coordinator", "/api/v1/auth/me")).statusCode,
    200,
  );
  assert.deepEqual(await operator.setRoles(command), {
    version: changed.version,
    replayed: true,
  });
  await assert.rejects(
    operator.setRoles({ ...command, roles: ["coordinator"] }),
    hasCode("IDEMPOTENCY_CONFLICT"),
  );
  await assert.rejects(
    operator.setRoles({ ...command, requestId: randomUUID() }),
    hasCode("VERSION_CONFLICT"),
  );
  pass(
    "Role revocation affects the existing session immediately; stale versions and conflicting retries are rejected",
  );
  const assign = async (roles: RoleCode[]) =>
    operator.setRoles({
      ...command,
      roles,
      expectedVersion: (await operator.inspectByEmail(target.email)).version,
      requestId: randomUUID(),
    });
  await assign(["staff", "system_admin"]);
  const union = await permissions.access(target.id);
  assert.deepEqual(
    union.permissions.map((item) => item.code).sort(),
    [...new Set([...expected.staff, ...expected.system_admin])].sort(),
  );
  assert.equal(
    (await request("coordinator", "/api/v1/_test/masterlists.approve", true))
      .statusCode,
    403,
  );
  await assert.rejects(
    admin.execute(
      "INSERT INTO user_roles (id,user_id,role_code,granted_at) VALUES (?,?,?,UTC_TIMESTAMP(6))",
      [randomUUID(), target.id, "staff"],
    ),
  );
  const [history] = await admin.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM user_roles WHERE user_id=? AND revoked_at IS NOT NULL",
    [target.id],
  );
  assert.equal(history[0].total, 1);
  const [audit] = await admin.execute<RowDataPacket[]>(
    "SELECT * FROM audit_logs WHERE request_id=?",
    [command.requestId],
  );
  assert.equal(audit.length, 1);
  assert.deepEqual(JSON.parse(audit[0].details).before, ["coordinator"]);
  pass(
    "Explicit roles combine without implicit approval rights; duplicate active assignments are rejected and revoked history is retained",
  );
  const beforeFailure = await operator.inspectByEmail(target.email);
  await admin.query(
    "CREATE TRIGGER fail_role_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='account.roles_changed' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic audit failure'; END IF; END",
  );
  try {
    await assert.rejects(assign(["coordinator"]));
  } finally {
    await admin.query("DROP TRIGGER fail_role_audit");
  }
  assert.deepEqual(await operator.inspectByEmail(target.email), beforeFailure);
  pass(
    "Audit failure rolls back role assignments and account version atomically",
  );
  await assert.rejects(
    permissions.withPermission(
      accounts.get("staff")!.id,
      "masterlists.approve",
      async () => {
        throw new Error("Callback must not run");
      },
    ),
    hasCode("PERMISSION_DENIED"),
  );
  const priorVersion = (await operator.inspectByEmail(target.email)).version;
  await assert.rejects(
    permissions.withPermission(
      target.id,
      "users.manage",
      async (connection) => {
        await connection.execute(
          "UPDATE users SET version=version+1 WHERE id=?",
          [target.id],
        );
        throw new Error("Synthetic rollback");
      },
    ),
  );
  assert.equal(
    (await operator.inspectByEmail(target.email)).version,
    priorVersion,
  );
  pass(
    "Guarded service mutations deny unauthorized callbacks and roll back failed transactions",
  );
  // Prove a revoke waits until an already authorized transaction releases the shared user lock.
  let enter: () => void = () => {},
    release: () => void = () => {};
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const guarded = permissions.withPermission(
    target.id,
    "users.manage",
    async () => {
      enter();
      await released;
    },
  );
  await entered;
  let revoked = false;
  const revocation = assign([]).then(() => {
    revoked = true;
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(revoked, false);
  } finally {
    release();
  }
  await guarded;
  await revocation;
  await assert.rejects(
    permissions.withPermission(target.id, "users.manage", async () => {}),
    hasCode("PERMISSION_DENIED"),
  );
  pass(
    "Permission checks and mutations serialize with role revocation on the same user lock",
  );
  for (const sql of [
    "EXPLAIN UPDATE user_roles SET revoked_at=NULL WHERE 1=0",
    "EXPLAIN DELETE FROM role_permissions WHERE 1=0",
    "EXPLAIN UPDATE roles SET label=label WHERE 1=0",
    "SELECT * FROM role_change_commands LIMIT 1",
  ])
    await assert.rejects(runtime.query(sql));
  pass(
    "Restricted runtime cannot edit RBAC policy, role assignments, or local command history",
  );
  await auth.setDisabled(
    accounts.get("staff")!.email,
    true,
    "test-operator",
    "Disabled fixture access",
  );
  await assert.rejects(
    permissions.access(accounts.get("staff")!.id),
    hasCode("ACCOUNT_DISABLED"),
  );
  const disabled = await request("staff", "/api/v1/_test/scholars.read", true);
  assert.equal(disabled.statusCode, 403);
  assert.equal(disabled.json().error.code, "ACCOUNT_DISABLED");
  pass(
    "Disabled users lose API access and cannot use the authorization service",
  );
  console.log(
    `All ${passed} MariaDB RBAC scenarios passed in an isolated disposable database.`,
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
      "Disposable browser fixture ready at http://127.0.0.1:3003. Account: system_admin@example.invalid. Stop at /__fixture/stop.",
    );
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (root) await root.end();
  assert.match(database, /^ldss_f02_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
