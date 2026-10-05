import type { FastifyInstance } from "fastify";
import type { AuditService } from "./service.js";
export function registerAudit(app: FastifyInstance, service: AuditService) {
  const config = { config: { access: "authenticated" as const } };
  app.get("/api/v1/audit-events", config, (r, reply) => {
    reply.header("Cache-Control", "no-store");
    return service.list(r.authSession!.user.id, r.query);
  });
  app.get<{ Params: { id: string } }>(
    "/api/v1/audit-events/:id",
    config,
    (r, reply) => {
      reply.header("Cache-Control", "no-store");
      return service.detail(r.authSession!.user.id, r.params.id);
    },
  );
}
