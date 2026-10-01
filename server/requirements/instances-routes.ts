import type { FastifyInstance } from "fastify";
import type { RequirementInstancesService } from "./instances-service.js";
export function registerRequirementInstances(
  app: FastifyInstance,
  service: RequirementInstancesService,
) {
  app.get<{ Params: { id: string } }>(
    "/api/v1/scholarships/:id/requirements",
    { config: { permission: "scholars.read" } },
    (r) => service.list(r.authSession!.user.id, r.params.id),
  );
  app.post<{ Params: { id: string } }>(
    "/api/v1/scholarships/:id/requirements/generate",
    { bodyLimit: 4096, config: { permission: "requirements.generate" } },
    (r) =>
      service.generate(
        r.authSession!.user.id,
        r.params.id,
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
}
