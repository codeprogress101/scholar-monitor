import type { FastifyInstance } from "fastify";
import type { ScholarService } from "./service.js";
export function registerScholars(
  app: FastifyInstance,
  service: ScholarService,
) {
  app.get(
    "/api/v1/scholars",
    { config: { permission: "scholars.read" } },
    (request) => service.list(request.authSession!.user.id, request.query),
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/scholars/:id",
    { config: { permission: "scholars.read" } },
    (request) =>
      service.detail(request.authSession!.user.id, request.params.id),
  );
  app.post(
    "/api/v1/scholars/duplicate-check",
    { bodyLimit: 8192, config: { permission: "scholars.create" } },
    (request) => service.duplicates(request.authSession!.user.id, request.body),
  );
  app.post(
    "/api/v1/scholars",
    { bodyLimit: 8192, config: { permission: "scholars.create" } },
    (request) =>
      service.write(
        request.authSession!.user.id,
        undefined,
        request.headers["idempotency-key"],
        request.body,
        request.id,
      ),
  );
  app.patch<{ Params: { id: string } }>(
    "/api/v1/scholars/:id",
    { bodyLimit: 8192, config: { permission: "scholars.update" } },
    (request) =>
      service.write(
        request.authSession!.user.id,
        request.params.id,
        request.headers["idempotency-key"],
        request.body,
        request.id,
      ),
  );
}
