import type { FastifyInstance } from "fastify";
import type { ContinuingService } from "./service.js";
export function registerContinuing(app: FastifyInstance, service: ContinuingService) {
  const config = { permission: "continuing.prepare" as const };
  app.get<{ Params: { id: string } }>("/api/v1/scholars/:id/continuing-baseline", { config }, (r) => service.participation(r.authSession!.user.id, r.params.id));
  app.get("/api/v1/continuing-rosters", { config }, (r) => service.list(r.authSession!.user.id, r.query));
  app.get<{ Params: { id: string } }>("/api/v1/continuing-rosters/:id", { config }, (r) => service.view(r.authSession!.user.id, r.params.id));
  app.post("/api/v1/continuing-rosters", { config, bodyLimit: 128000 }, (r) => service.command(r.authSession!.user.id, null, r.headers["idempotency-key"], r.body, r.id));
  app.post<{ Params: { id: string } }>("/api/v1/continuing-rosters/:id/decision", { config: { permission: "continuing.approve" }, bodyLimit: 4096 }, (r) => service.command(r.authSession!.user.id, r.params.id, r.headers["idempotency-key"], r.body, r.id));
}
