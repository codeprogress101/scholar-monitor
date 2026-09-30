import type { FastifyInstance } from "fastify";
import { AuthError } from "../auth/service.js";
import { isPermission, type PermissionCode } from "./policy.js";
import type { AuthorizationApi } from "./service.js";

declare module "fastify" {
  interface FastifyContextConfig {
    access?: "authenticated";
    permission?: PermissionCode;
  }
}
export function registerAuthorization(
  app: FastifyInstance,
  authorization: AuthorizationApi,
) {
  app.addHook("preHandler", async (request) => {
    const path = request.routeOptions.url ?? request.url;
    if (!path.startsWith("/api/") || !request.authSession) return;
    const config = request.routeOptions.config;
    if (config.access === "authenticated" && config.permission === undefined)
      return;
    if (!isPermission(config.permission))
      throw new AuthError(
        403,
        "PERMISSION_DENIED",
        "Access to this action has not been granted.",
      );
    const access = await authorization.access(request.authSession.user.id);
    if (
      !access.permissions.some(
        (permission) => permission.code === config.permission,
      )
    )
      throw new AuthError(
        403,
        "PERMISSION_DENIED",
        "Your account does not have permission for this action.",
      );
  });
  app.get(
    "/api/v1/me/permissions",
    { config: { access: "authenticated" } },
    async (request) => authorization.access(request.authSession!.user.id),
  );
  app.get(
    "/api/v1/admin/role-catalog",
    { config: { permission: "roles.manage" } },
    async () => authorization.catalog(),
  );
}
