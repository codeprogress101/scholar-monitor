import type { FastifyInstance } from "fastify";
import type { AcademicChangesService } from "./changes-service.js";
export function registerAcademicChanges(
  app: FastifyInstance,
  service: AcademicChangesService,
) {
  app.get<{ Params: { id: string } }>(
    "/api/v1/academic-records/:id/changes",
    { config: { permission: "scholars.read" } },
    (r) => service.view(r.authSession!.user.id, r.params.id),
  );
  for (const action of ["request", "approve", "reject", "cancel"] as const) {
    app.post<{ Params: { id: string } }>(
      action === "request"
        ? "/api/v1/academic-records/:id/changes"
        : `/api/v1/academic-changes/:id/${action}`,
      {
        bodyLimit: 8192,
        config: {
          permission:
            action === "approve" || action === "reject"
              ? "academic.changes.approve"
              : "academic.edit",
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
}
