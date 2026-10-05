import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { AuthError } from "../server/auth/service.js";

const apps: ReturnType<typeof buildApp>[] = [];
const folders: string[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  );
});
function makeApp(options: Parameters<typeof buildApp>[1] = {}) {
  const app = buildApp(loadConfig({ APP_ENV: "test" }), options);
  apps.push(app);
  return app;
}

describe("service boundary", () => {
  it("ignores forged request IDs and proxy addresses", async () => {
    const app = makeApp();
    app.get("/boundary-test", (request) => ({ id: request.id, ip: request.ip }));
    const response = await app.inject({
      url: "/boundary-test",
      headers: { "request-id": "forged", "x-forwarded-for": "203.0.113.99" },
    });
    expect(response.json().id).toMatch(/^[a-f0-9-]{36}$/);
    expect(response.json().ip).not.toBe("203.0.113.99");
    expect(response.headers["content-security-policy"]).toContain("object-src 'none'");
    expect(response.headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
  });
  it.each([
    [401, "AUTH_REQUIRED"],
    [403, "PERMISSION_DENIED"],
    [404, "SCHOLAR_NOT_FOUND"],
    [409, "VERSION_CONFLICT"],
    [409, "INVALID_STATE_TRANSITION"],
    [409, "IDEMPOTENCY_CONFLICT"],
    [422, "VALIDATION_FAILED"],
    [423, "RECORD_LOCKED"],
  ] as const)("preserves domain status/code %s %s", async (status, code) => {
    const app = makeApp();
    app.get("/domain-failure", () => {
      throw new AuthError(status, code, "Public guidance", {
        issues: [{ path: ["items", 0], message: "Review this row" }],
      });
    });
    const response = await app.inject("/domain-failure");
    expect(response.statusCode).toBe(status);
    expect(response.json().error).toMatchObject({
      code,
      message: "Public guidance",
      request_id: expect.any(String),
      details: { issues: [{ path: ["items", 0], message: "Review this row" }] },
    });
    expect(response.body).not.toContain("stack");
  });
  it("reports an unconfigured database honestly, without credentials", async () => {
    const response = await makeApp().inject("/api/v1/health");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "ldss-api",
      release: "0.37.0",
      checkpoint: "F36",
      database: "not_configured",
    });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });
  it("returns 503 readiness when database is not configured", async () => {
    const response = await makeApp().inject("/api/v1/ready");
    expect(response.statusCode).toBe(503);
    expect(response.json().status).toBe("not_ready");
  });
  it.each(["connected", "unavailable"] as const)(
    "reflects a real probe outcome: %s",
    async (status) => {
      const close = vi.fn(async () => {});
      const app = makeApp({ database: { check: async () => status, close } });
      const response = await app.inject("/api/v1/ready");
      expect(response.statusCode).toBe(status === "connected" ? 200 : 503);
      expect(response.json().database).toBe(status);
      await app.close();
      expect(close).toHaveBeenCalledOnce();
    },
  );
  it.each(["GET", "POST", "PATCH", "DELETE"] as const)(
    "denies anonymous %s business access",
    async (method) => {
      const response = await makeApp().inject({
        method,
        url: "/api/v1/scholars",
        headers: { authorization: "Bearer forged", "x-role": "coordinator" },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("AUTH_REQUIRED");
      expect(response.json().error.request_id).toBeTruthy();
    },
  );
  it("never exposes internal error messages", async () => {
    const app = makeApp();
    app.get("/failure", () => {
      throw new Error("private-database-password");
    });
    const response = await app.inject("/failure");
    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe("INTERNAL_ERROR");
    expect(response.body).not.toContain("private-database-password");
  });
  it("returns structured malformed input errors", async () => {
    const response = await makeApp().inject({
      method: "POST",
      url: "/api/v1/scholars",
      headers: { "content-type": "application/json" },
      payload: "{bad",
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_REQUEST");
  });
  it("serves only the client build, with business API access still denied", async () => {
    const folder = await mkdtemp(join(tmpdir(), "ldss-static-test-"));
    folders.push(folder);
    await writeFile(join(folder, "index.html"), "<h1>LDSS preview</h1>");
    const app = makeApp({ clientRoot: folder });
    const response = await app.inject("/");
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("LDSS preview");
    expect((await app.inject("/api/v1/scholars")).statusCode).toBe(401);
    expect((await app.inject("/.env")).statusCode).toBe(404);
    expect((await app.inject("/server/config.ts")).statusCode).toBe(404);
  });
});
