import type { FastifyInstance } from "fastify";
import type { RequirementWaiverService } from "./waiver-service.js";
export function registerRequirementWaiver(
  app: FastifyInstance,
  service: RequirementWaiverService,
) {
  app.post<{ Params: { id: string } }>(
    "/api/v1/requirement-instances/:id/waive",
    {
      bodyLimit: 4096,
      config: { permission: "requirements.waive" },
    },
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
