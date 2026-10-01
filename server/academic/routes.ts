import type { FastifyInstance } from "fastify";
import type { AcademicService } from "./service.js";
export function registerAcademic(
  app: FastifyInstance,
  service: AcademicService,
) {
  app.get<{ Params: { id: string } }>(
    "/api/v1/scholars/:id/academic-records",
    { config: { permission: "scholars.read" } },
    (r) => service.list(r.authSession!.user.id, r.params.id),
  );
  app.post<{ Params: { id: string } }>(
    "/api/v1/scholars/:id/academic-records",
    { bodyLimit: 4096, config: { permission: "academic.edit" } },
    (r) =>
      service.create(
        r.authSession!.user.id,
        r.params.id,
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
}
