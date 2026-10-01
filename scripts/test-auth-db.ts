import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { applyMigrations, grantAuthRuntime } from "./migration-lib.mjs";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { AuthService } from "../server/auth/service.js";
import { digest, newToken } from "../server/auth/crypto.js";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

assert.equal(process.env.APP_ENV, "development");
assert.equal(process.env.DB_NAME, "ldss_scholar_monitor_dev");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.DB_HOST ?? ""));
const suffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
const database = `ldss_f01_test_${suffix}`;
const runtimeUser = `ldss_test_${suffix}`;
const runtimePassword = newToken();
const origin = "http://127.0.0.1:5173";
const email = "individual@example.invalid";
const password = "A long synthetic testing passphrase!";
const adminConfig = {
  host: "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: "root",
  password: process.env.LDSS_SETUP_ADMIN_PASSWORD ?? "",
  timezone: "Z",
};
const admin = await mysql.createConnection(adminConfig);
let rootPool: mysql.Pool | undefined,
  runtime: mysql.Pool | undefined,
  app: ReturnType<typeof buildApp> | undefined;
let createdDatabase = false,
  createdUser = false,
  passed = 0;
const pass = (name: string) => {
  passed++;
  console.log(`PASS ${name}`);
};
try {
  await admin.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  createdDatabase = true;
  await admin.changeUser({ database });
  assert.equal((await applyMigrations(admin)).length, 16);
  assert.deepEqual(await applyMigrations(admin), []);
  pass("Ordered migrations apply once and verify checksums on rerun");
  await admin.query(
    `CREATE USER ${admin.escape(runtimeUser)}@'localhost' IDENTIFIED BY ${admin.escape(runtimePassword)}`,
  );
  createdUser = true;
  await grantAuthRuntime(admin, database, runtimeUser);
  rootPool = mysql.createPool({ ...adminConfig, database, connectionLimit: 4 });
  runtime = mysql.createPool({
    ...adminConfig,
    user: runtimeUser,
    password: runtimePassword,
    database,
    connectionLimit: 4,
  });
  const accountAdmin = new AuthService(rootPool);
  const config = loadConfig({ APP_ENV: "test", APP_ORIGIN: origin });
  const db = {
    pool: runtime,
    check: async () => "connected" as const,
    close: async () => {},
  };
  app = buildApp(config, { database: db });
  const post = (
    url: string,
    body: object,
    cookie?: string,
    csrf?: string,
    requestOrigin = origin,
  ) =>
    app!.inject({
      method: "POST",
      url,
      headers: {
        origin: requestOrigin,
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      payload: body,
    });
  const login = () => post("/api/v1/auth/login", { email, password });
  const cookieOf = (response: Awaited<ReturnType<typeof login>>) =>
    String(response.headers["set-cookie"]).split(";")[0];
  const me = (cookie?: string) =>
    app!.inject({
      url: "/api/v1/auth/me",
      headers: {
        ...(cookie ? { cookie } : {}),
        "x-user-id": "forged-user",
        "x-role": "coordinator",
      },
    });
  const ageLimits = () =>
    admin.query(
      "UPDATE auth_rate_limits SET window_started_at=UTC_TIMESTAMP(6)-INTERVAL 16 MINUTE",
    );

  assert.equal((await me()).statusCode, 401);
  assert.equal(
    (await me("ldss_session=invalid")).json().error.code,
    "SESSION_EXPIRED",
  );
  assert.equal(
    (await app.inject("/api/v1/implementation-plan")).statusCode,
    401,
  );
  pass("Anonymous, invalid-session, and plan-download access denied");

  const id = await accountAdmin.createAccount(
    "Synthetic Individual",
    email,
    "test-operator",
  );
  assert.equal((await login()).statusCode, 401);
  await assert.rejects(
    accountAdmin.createAccount(
      "Duplicate",
      email.toUpperCase(),
      "test-operator",
    ),
  );
  const activation = await accountAdmin.issueReset(
    email,
    "test-operator",
    "Synthetic activation",
  );
  assert.equal(
    (
      await post("/api/v1/auth/reset-password", {
        token: activation,
        password: "short",
      })
    ).statusCode,
    422,
  );
  assert.equal(
    (await post("/api/v1/auth/reset-password", { token: activation, password }))
      .statusCode,
    204,
  );
  assert.equal(
    (
      await post("/api/v1/auth/reset-password", { token: activation, password })
    ).json().error.code,
    "RESET_INVALID",
  );
  pass(
    "Unique individual account requires activation; reset is strong-password-only and single-use",
  );

  const logged = await login();
  assert.equal(logged.statusCode, 200);
  const cookie = cookieOf(logged);
  const csrf = logged.json().csrfToken;
  assert.match(String(logged.headers["set-cookie"]), /HttpOnly/);
  assert.match(String(logged.headers["set-cookie"]), /SameSite=Strict/i);
  assert.equal(logged.json().token, undefined);
  assert.equal(logged.json().user.id, id);
  const [stored] = await admin.query<RowDataPacket[]>(
    "SELECT token_hash FROM auth_sessions",
  );
  assert.equal(stored[0].token_hash, digest(cookie.split("=")[1]));
  assert.equal((await me(cookie)).json().user.email, email);
  assert.equal((await me(cookie)).json().user.role, undefined);
  assert.equal(
    (
      await app.inject({
        url: "/api/v1/implementation-plan",
        headers: { cookie },
      })
    ).statusCode,
    200,
  );
  pass(
    "Active login establishes an HttpOnly cookie; stored token is hashed; actor is server-derived",
  );

  const [before] = await admin.query<RowDataPacket[]>(
    "SELECT last_seen_at FROM auth_sessions WHERE token_hash=?",
    [digest(cookie.split("=")[1])],
  );
  await me(cookie);
  const [after] = await admin.query<RowDataPacket[]>(
    "SELECT last_seen_at FROM auth_sessions WHERE token_hash=?",
    [digest(cookie.split("=")[1])],
  );
  assert.equal(
    before[0].last_seen_at.getTime(),
    after[0].last_seen_at.getTime(),
  );
  pass("Background identity checks do not extend idle expiry");

  assert.equal(
    (await post("/api/v1/auth/logout", {}, cookie)).json().error.code,
    "CSRF_INVALID",
  );
  assert.equal(
    (
      await post(
        "/api/v1/auth/logout",
        {},
        cookie,
        csrf,
        "https://hostile.example",
      )
    ).statusCode,
    403,
  );
  assert.equal(
    (await post("/api/v1/auth/logout", {}, cookie, "é".repeat(43))).statusCode,
    403,
  );
  assert.equal((await me(cookie)).statusCode, 200);
  assert.equal(
    (
      await post(
        "/api/v1/auth/login",
        { email, password },
        undefined,
        undefined,
        "https://hostile.example",
      )
    ).statusCode,
    403,
  );
  assert.equal(
    (await post("/api/v1/auth/login", { email, password, role: "coordinator" }))
      .statusCode,
    422,
  );
  pass(
    "CSRF, cross-origin login/logout, malformed token, and browser role injection blocked",
  );

  const rotated = await post("/api/v1/auth/login", { email, password }, cookie);
  assert.equal(rotated.statusCode, 200);
  assert.notEqual(cookieOf(rotated), cookie);
  assert.equal((await me(cookie)).statusCode, 401);
  assert.equal(
    (
      await post(
        "/api/v1/auth/logout",
        {},
        cookieOf(rotated),
        rotated.json().csrfToken,
      )
    ).statusCode,
    204,
  );
  assert.equal((await me(cookieOf(rotated))).statusCode, 401);
  pass("Login rotates prior session and logout revokes it persistently");

  const active = await login();
  const pending = await accountAdmin.issueReset(
    email,
    "test-operator",
    "Pending before disable",
  );
  await accountAdmin.setDisabled(
    email,
    true,
    "test-operator",
    "Synthetic disable test",
  );
  assert.equal(
    (await me(cookieOf(active))).json().error.code,
    "ACCOUNT_DISABLED",
  );
  assert.equal((await login()).json().error.code, "ACCOUNT_DISABLED");
  await accountAdmin.setDisabled(
    email,
    false,
    "test-operator",
    "Synthetic enable test",
  );
  assert.equal(
    (await me(cookieOf(active))).json().error.code,
    "SESSION_EXPIRED",
  );
  assert.equal(
    (
      await post("/api/v1/auth/reset-password", { token: pending, password })
    ).json().error.code,
    "RESET_INVALID",
  );
  const [identities] = await admin.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE email=?",
    [email],
  );
  assert.equal(identities[0].id, id);
  pass(
    "Disable blocks new/existing sessions, invalidates reset links, and preserves identity",
  );

  await ageLimits();
  for (const kind of ["absolute", "idle"]) {
    const expiring = await login();
    const hash = digest(cookieOf(expiring).split("=")[1]);
    await admin.execute(
      kind === "absolute"
        ? "UPDATE auth_sessions SET created_at=UTC_TIMESTAMP(6)-INTERVAL 2 DAY, expires_at=UTC_TIMESTAMP(6)-INTERVAL 1 DAY WHERE token_hash=?"
        : "UPDATE auth_sessions SET last_seen_at=UTC_TIMESTAMP(6)-INTERVAL 31 MINUTE WHERE token_hash=?",
      [hash],
    );
    assert.equal(
      (await me(cookieOf(expiring))).json().error.code,
      "SESSION_EXPIRED",
    );
  }
  pass("Absolute and idle session expiry are enforced by the server");

  const a = await login(),
    b = await login();
  const reset = await accountAdmin.issueReset(
    email,
    "test-operator",
    "Revoke all sessions test",
  );
  assert.equal(
    (await post("/api/v1/auth/reset-password", { token: reset, password }))
      .statusCode,
    204,
  );
  assert.equal((await me(cookieOf(a))).statusCode, 401);
  assert.equal((await me(cookieOf(b))).statusCode, 401);
  const racing = await accountAdmin.issueReset(
    email,
    "test-operator",
    "Concurrent reset test",
  );
  const raceResults = await Promise.all([
    post("/api/v1/auth/reset-password", { token: racing, password }),
    post("/api/v1/auth/reset-password", { token: racing, password }),
  ]);
  assert.deepEqual(
    raceResults.map((response) => response.statusCode).sort(),
    [204, 400],
  );
  pass(
    "Password reset revokes all sessions and concurrent token reuse has one winner",
  );

  const staleReset = await accountAdmin.issueReset(
    email,
    "test-operator",
    "Expired reset test",
  );
  await admin.execute(
    "UPDATE password_resets SET created_at=UTC_TIMESTAMP(6)-INTERVAL 2 DAY,expires_at=UTC_TIMESTAMP(6)-INTERVAL 1 DAY WHERE token_hash=?",
    [digest(staleReset)],
  );
  assert.equal(
    (await post("/api/v1/auth/reset-password", { token: staleReset, password }))
      .statusCode,
    400,
  );
  pass("Expired password reset links are rejected");

  const [sessionsBefore] = await admin.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM auth_sessions",
  );
  await admin.query(
    "CREATE TRIGGER test_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic audit failure'",
  );
  const rollback = await login();
  assert.equal(rollback.statusCode, 500);
  assert.ok(!rollback.body.includes("synthetic audit failure"));
  const [sessionsAfter] = await admin.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM auth_sessions",
  );
  assert.equal(sessionsAfter[0].total, sessionsBefore[0].total);
  await assert.rejects(
    accountAdmin.createAccount(
      "Rollback Test",
      "rollback@example.invalid",
      "test-operator",
    ),
  );
  const [rolled] = await admin.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE email=?",
    ["rollback@example.invalid"],
  );
  assert.equal(rolled.length, 0);
  await admin.query("DROP TRIGGER test_fail_audit");
  pass(
    "Audit failure rolls back login/session and account creation atomically",
  );

  for (const sql of [
    "EXPLAIN DELETE FROM users WHERE 1=0",
    "EXPLAIN UPDATE users SET disabled_at=NULL WHERE 1=0",
    "EXPLAIN UPDATE audit_logs SET action=action WHERE 1=0",
    "EXPLAIN DELETE FROM audit_logs WHERE 1=0",
    "SELECT User FROM mysql.user LIMIT 1",
  ]) {
    await assert.rejects(runtime.query(sql));
  }
  const [audit] = await admin.query<RowDataPacket[]>(
    "SELECT event_type,details,actor_id FROM audit_logs",
  );
  assert.ok(
    audit.some((row) => row.event_type === "auth.login" && row.actor_id === id),
  );
  assert.ok(audit.some((row) => row.event_type === "account.disabled"));
  assert.ok(!JSON.stringify(audit).includes(password));
  pass(
    "Runtime cannot delete identities, disable users, rewrite audits, or read system tables",
  );

  await ageLimits();
  for (let i = 0; i < 10; i++)
    assert.equal(
      (
        await post("/api/v1/auth/login", {
          email: "unknown@example.invalid",
          password,
        })
      ).statusCode,
      401,
    );
  const limited = await post("/api/v1/auth/login", {
    email: "unknown@example.invalid",
    password,
  });
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.headers["retry-after"], "900");
  const secondInstance = new AuthService(runtime);
  await assert.rejects(
    secondInstance.login(
      "unknown@example.invalid",
      password,
      "127.0.0.1",
      "restart-check",
    ),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "AUTH_RATE_LIMITED",
  );
  pass(
    "Login throttling survives another service instance and returns Retry-After",
  );

  await ageLimits();
  const production = buildApp(
    loadConfig({
      APP_ENV: "production",
      APP_ORIGIN: "https://ldss.example",
      DB_USER: runtimeUser,
      DB_PASSWORD: runtimePassword,
    }),
    { database: db },
  );
  try {
    const response = await production.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: {
        origin: "https://ldss.example",
        "content-type": "application/json",
      },
      payload: { email, password },
    });
    assert.equal(response.statusCode, 200);
    assert.match(
      String(response.headers["set-cookie"]),
      /^__Host-ldss_session=/,
    );
    assert.match(String(response.headers["set-cookie"]), /Secure/);
    assert.match(String(response.headers["set-cookie"]), /HttpOnly/);
  } finally {
    await production.close();
  }
  pass("Production sessions use Secure __Host- cookies");
  console.log(
    `All ${passed} MariaDB authentication scenarios passed in an isolated disposable database.`,
  );
  if (process.argv.includes("--browser")) {
    await ageLimits();
    const token = await accountAdmin.issueReset(
      email,
      "test-operator",
      "Browser reset workflow",
    );
    await mkdir("output/playwright", { recursive: true });
    await writeFile(
      "output/playwright/reset-fixture-url.txt",
      `http://127.0.0.1:3003/#reset-password?token=${token}`,
    );
    const fixture = buildApp(
      loadConfig({
        APP_ENV: "test",
        PORT: "3003",
        APP_ORIGIN: "http://127.0.0.1:3003",
      }),
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
      "Disposable browser fixture ready on http://127.0.0.1:3003. Stop at /__fixture/stop after browser checks.",
    );
    await finished;
    await fixture.close();
  }
} finally {
  if (app) await app.close();
  if (runtime) await runtime.end();
  if (rootPool) await rootPool.end();
  // Only exact, uniquely created fixture identities are removed; never the development database.
  assert.match(database, /^ldss_f01_test_\d+_[a-f0-9]{8}$/);
  assert.match(runtimeUser, /^ldss_test_\d+_[a-f0-9]{8}$/);
  if (createdUser)
    await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);
  if (createdDatabase) await admin.query(`DROP DATABASE \`${database}\``);
  await admin.end();
}
