import type { FastifyInstance } from "fastify";
import type { NotificationService } from "./service.js";
export function registerNotifications(app: FastifyInstance, service: NotificationService) {
  app.get("/api/v1/notifications", { config: { access: "authenticated" } }, async (r, reply) => {
    reply.header("Cache-Control", "no-store").header("Vary", "Cookie");
    return service.read(r.authSession!.user.id, r.query);
  });
  app.post<{ Params: { id: string } }>("/api/v1/notifications/:id/read", { config: { access: "authenticated" } }, async r => service.mark(r.authSession!.user.id, r.params.id, r.body));
}
