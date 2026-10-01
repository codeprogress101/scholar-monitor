import type { FastifyInstance } from "fastify";
import { REQUIREMENT_ACTIONS } from "./workflow-model.js";
import {
  workflowPermission,
  type RequirementWorkflowService,
} from "./workflow-service.js";
export function registerRequirementWorkflow(
  app: FastifyInstance,
  service: RequirementWorkflowService,
) {
  app.get<{ Params: { id: string } }>(
    "/api/v1/requirement-instances/:id/verification-context",
    { config: { permission: "requirements.verify" } },
    (r) => service.context(r.authSession!.user.id, r.params.id),
  );
  for (const action of REQUIREMENT_ACTIONS)
    app.post<{ Params: { id: string } }>(
      `/api/v1/requirement-instances/:id/${action}`,
      { bodyLimit: 8192, config: { permission: workflowPermission(action) } },
      (r) =>
        service.command(
          r.authSession!.user.id,
          r.params.id,
          action,
          r.headers["idempotency-key"],
          r.body,
          r.id,
        ),
    );
}
