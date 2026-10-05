import type { FastifyInstance } from "fastify";
import { OvrAmendmentService } from "./amendment-service.js";
export function registerOvrAmendments(
  app: FastifyInstance,
  service: OvrAmendmentService,
) {
  for (const action of ["request", "approve", "reject"] as const)
    app.post<{ Params: { id: string } }>(
      `/api/v1/ovr-batches/:id/amendments/${action}`,
      {
        bodyLimit: 4096,
        config: {
          permission:
            action === "request"
              ? "ovr.amendments.request"
              : "ovr.amendments.approve",
        },
      },
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
