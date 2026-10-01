import type { FastifyInstance } from "fastify";
import type { StatusService } from "./service.js";
export function registerStatus(app: FastifyInstance, service: StatusService) {
  app.get<{ Params: { id: string } }>(
    "/api/v1/scholarships/:id/status",
    { config: { permission: "scholars.read" } },
    (r) => service.view(r.authSession!.user.id, r.params.id),
  );
  app.post<{ Params: { id: string } }>(
    "/api/v1/scholarships/:id/status/requests",
    { bodyLimit: 4096, config: { permission: "scholarship.status.request" } },
    (r) =>
      service.command(
        r.authSession!.user.id,
        r.params.id,
        "request",
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
  for (const action of ["approve", "reject", "cancel"] as const)
    app.post<{ Params: { id: string } }>(
      `/api/v1/status-requests/:id/${action}`,
      {
        bodyLimit: 4096,
        config: {
          permission:
            action === "cancel"
              ? "scholarship.status.request"
              : "scholarship.status.approve",
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
