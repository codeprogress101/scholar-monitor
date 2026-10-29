import type { FastifyInstance } from "fastify";
import type { NotificationService } from "./service.js";
export function registerNotifications(app: FastifyInstance, service: NotificationService) {
  const headers = { "Cache-Control": "no-store", Vary: "Cookie" };
  app.get("/api/v1/notifications/count", { config: { access: "authenticated" } }, async (r, reply) => {
    reply.headers(headers); return service.count(r.authSession!.user.id);
  });
  app.get("/api/v1/notifications/page", { config: { access: "authenticated" } }, async (r, reply) => {
    reply.headers(headers); return service.page(r.authSession!.user.id, r.query);
  });
  app.get("/api/v1/notifications/pending", { config: { access: "authenticated" } }, async (r, reply) => {
    reply.headers(headers); return service.pending(r.authSession!.user.id);
  });
  app.get("/api/v1/notifications/periods", { config: { access: "authenticated" } }, async (r, reply) => {
    reply.headers(headers); return service.periods(r.authSession!.user.id, r.query);
  });
  app.get("/api/v1/notifications", { config: { access: "authenticated" } }, async (r, reply) => {
    reply.header("Cache-Control", "no-store").header("Vary", "Cookie");
    return service.read(r.authSession!.user.id, r.query);
  });
  app.post<{ Params: { id: string } }>("/api/v1/notifications/:id/read", { config: { access: "authenticated" } }, async r => service.mark(r.authSession!.user.id, r.params.id, r.body));
}
