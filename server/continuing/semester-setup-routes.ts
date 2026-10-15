import type { FastifyInstance } from "fastify";
import type { SemesterSetupService } from "./semester-setup.js";
export function registerSemesterSetup(app: FastifyInstance, service: SemesterSetupService) {
  app.post<{ Params: { id: string } }>("/api/v1/continuing-rosters/:id/semester-setup/recover", { config: { permission: "semesters.configure" }, bodyLimit: 4096 }, (r) => service.transition(r.authSession!.user.id, r.params.id, r.headers["idempotency-key"], r.body, r.id, true));
  app.post<{ Params: { id: string } }>("/api/v1/continuing-rosters/:id/semester-setup/availability", { config: { permission: "semesters.configure" }, bodyLimit: 4096 }, (r) => service.transition(r.authSession!.user.id, r.params.id, r.headers["idempotency-key"], r.body, r.id));
  app.get<{ Params: { id: string }; Querystring: { semesterId?: string; policyDate?: string } }>("/api/v1/continuing-rosters/:id/semester-setup", { config: { permission: "continuing.prepare" } }, (r) => service.options(r.authSession!.user.id, r.params.id, r.query.semesterId, r.query.policyDate));
  app.post<{ Params: { id: string } }>("/api/v1/continuing-rosters/:id/semester-setup", { config: { permission: "semesters.configure" }, bodyLimit: 4096 }, (r) => service.command(r.authSession!.user.id, r.params.id, r.headers["idempotency-key"], r.body, r.id));
}
