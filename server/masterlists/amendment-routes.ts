import type { FastifyInstance } from "fastify";
import type { MasterlistAmendmentService } from "./amendment-service.js";
export function registerAmendments(
  app: FastifyInstance,
  service: MasterlistAmendmentService,
) {
  app.get<{ Params: { id: string } }>(
    "/api/v1/masterlists/:id/amendments",
    { config: { permission: "masterlists.prepare" } },
    (r) => service.view(r.authSession!.user.id, r.params.id),
  );
  for (const action of [
    "request",
    "approve",
    "reject",
    "cancel",
    "publish",
  ] as const)
    app.post<{ Params: { id: string } }>(
      action === "request"
        ? "/api/v1/masterlists/:id/amendments"
        : `/api/v1/masterlist-amendments/:id/${action}`,
      {
        bodyLimit: 4096,
        config: {
          permission:
            action === "publish"
              ? "masterlists.publish"
              : action === "approve" || action === "reject"
                ? "masterlists.amendments.approve"
                : "masterlists.amendments.request",
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
