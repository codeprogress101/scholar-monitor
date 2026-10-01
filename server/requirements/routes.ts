import type { FastifyInstance } from "fastify";
import type { RequirementService } from "./service.js";
export function registerRequirements(
  app: FastifyInstance,
  service: RequirementService,
) {
  app.get(
    "/api/v1/requirement-definitions",
    { config: { permission: "configuration.read" } },
    (r) => service.list(r.authSession!.user.id, r.query),
  );
  app.get(
    "/api/v1/requirement-definitions/applicable",
    { config: { permission: "configuration.read" } },
    (r) => service.applicable(r.authSession!.user.id, r.query),
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/requirement-definitions/:id",
    { config: { permission: "configuration.read" } },
    (r) => service.history(r.authSession!.user.id, r.params.id),
  );
  app.post(
    "/api/v1/requirement-definitions",
    { bodyLimit: 8192, config: { permission: "configuration.manage" } },
    (r) =>
      service.command(
        r.authSession!.user.id,
        undefined,
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
  app.post<{ Params: { id: string } }>(
    "/api/v1/requirement-definitions/:id",
    { bodyLimit: 8192, config: { permission: "configuration.manage" } },
    (r) =>
      service.command(
        r.authSession!.user.id,
        r.params.id,
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
}
