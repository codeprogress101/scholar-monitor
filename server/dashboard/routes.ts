import type { FastifyInstance } from "fastify";
import type { DashboardService } from "./service.js";
export function registerDashboard(
  app: FastifyInstance,
  service: DashboardService,
) {
  app.get(
    "/api/v1/dashboard",
    { config: { permission: "configuration.read" } },
    async (r, reply) => {
      reply.header("Cache-Control", "no-store").header("Vary", "Cookie");
      return service.read(r.authSession!.user.id, r.query);
    },
  );
}
