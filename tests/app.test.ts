import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";

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
  it("reports an unconfigured database honestly, without credentials", async () => {
    const response = await makeApp().inject("/api/v1/health");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "ldss-api",
      release: "0.7.0",
      checkpoint: "F06",
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
