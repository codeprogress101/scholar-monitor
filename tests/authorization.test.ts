import { afterEach, expect, it, vi } from "vitest";
import { buildApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { AuthError } from "../server/auth/service.js";
import type { Access } from "../server/authorization/policy.js";

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
function fixture() {
  const access: Access = {
    userId: "trusted-user",
    version: 1,
    roles: [],
    permissions: [],
  };
  const authorization = {
    access: vi.fn(async () => access),
    catalog: vi.fn(async () => ({ roles: [], permissions: [], grants: [] })),
  };
  const app = buildApp(loadConfig({ APP_ENV: "test" }), {
    auth: {
      session: vi.fn(async () => ({
        user: {
          id: "trusted-user",
          email: "test@example.invalid",
          fullName: "Test User",
        },
        csrfToken: "synthetic",
        expiresAt: "2099-01-01",
      })),
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    },
    authorization,
  });
  app.get("/api/v1/_test/forgotten", async () => ({ allowed: true }));
  apps.push(app);
  return { app, authorization, access };
}
it("denies newly declared API routes without an explicit access policy", async () => {
  const { app } = fixture();
  const response = await app.inject("/api/v1/_test/forgotten");
  expect(response.statusCode).toBe(403);
  expect(response.json().error.code).toBe("PERMISSION_DENIED");
});
it("derives the current user from the session regardless of forged actor inputs", async () => {
  const { app, authorization } = fixture();
  const response = await app.inject({
    url: "/api/v1/me/permissions?userId=forged",
    headers: { "x-user-id": "forged", "x-role": "system_admin" },
  });
  expect(response.statusCode).toBe(200);
  expect(authorization.access).toHaveBeenCalledWith("trusted-user");
});
it("does not trust role names alone or expose the catalog to unprivileged users", async () => {
  const { app, access, authorization } = fixture();
  access.roles = [
    {
      code: "system_admin",
      label: "System Administrator",
      description: "Test",
    },
  ];
  expect((await app.inject("/api/v1/admin/role-catalog")).statusCode).toBe(403);
  expect(authorization.catalog).not.toHaveBeenCalled();
});
it("uses fresh effective permissions on every request", async () => {
  const { app, access, authorization } = fixture();
  access.permissions = [
    { code: "roles.manage", label: "Manage roles", category: "Administration" },
  ];
  expect((await app.inject("/api/v1/admin/role-catalog")).statusCode).toBe(200);
  access.permissions = [];
  expect((await app.inject("/api/v1/admin/role-catalog")).statusCode).toBe(403);
  expect(authorization.catalog).toHaveBeenCalledTimes(1);
});
it("fails closed when the permission service is unavailable", async () => {
  const { app, authorization } = fixture();
  authorization.access.mockRejectedValue(
    new AuthError(503, "AUTHORIZATION_UNAVAILABLE", "Temporarily unavailable."),
  );
  expect((await app.inject("/api/v1/admin/role-catalog")).statusCode).toBe(503);
  expect(authorization.catalog).not.toHaveBeenCalled();
});
