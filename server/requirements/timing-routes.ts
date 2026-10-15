import type { FastifyInstance } from "fastify";
import type { RequirementTimingService } from "./timing-service.js";
export function registerRequirementTiming(app: FastifyInstance, service: RequirementTimingService) {
  app.get<{ Params: { id: string } }>("/api/v1/requirement-instances/:id/timing", { config: { permission: "scholars.read" } }, r => service.read(r.authSession!.user.id, r.params.id));
  app.post<{ Params: { id: string } }>("/api/v1/requirement-instances/:id/timing/decide", { bodyLimit: 4096, config: { permission: "payroll.windows.manage" } }, r => service.decide(r.authSession!.user.id, r.params.id, r.headers["idempotency-key"], r.body, r.id));
}
