import type { FastifyInstance } from "fastify";
import type { ReportService } from "./service.js";
export function registerReports(app: FastifyInstance, service: ReportService) {
  app.get(
    "/api/v1/reports/operational",
    { config: { access: "authenticated" } },
    async (r, reply) => {
      // Specific permission is checked transactionally in the service.
      reply.header("Cache-Control", "no-store").header("Vary", "Cookie");
      return service.read(r.authSession!.user.id, r.query);
    },
  );
}
