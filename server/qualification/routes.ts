import type { FastifyInstance } from "fastify";
import { QUALIFICATION_ACTIONS } from "./model.js";
import {
  qualificationPermission,
  type QualificationService,
} from "./service.js";
export function registerQualification(
  app: FastifyInstance,
  service: QualificationService,
) {
  app.get<{ Params: { id: string } }>(
    "/api/v1/scholars/:id/scholarships",
    { config: { permission: "scholars.read" } },
    (request) => service.list(request.authSession!.user.id, request.params.id),
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/scholarships/:id",
    { config: { permission: "scholars.read" } },
    (request) =>
      service.detail(request.authSession!.user.id, request.params.id),
  );
  app.post<{ Params: { id: string } }>(
    "/api/v1/scholars/:id/scholarships",
    {
      bodyLimit: 4096,
      config: { permission: qualificationPermission("create") },
    },
    (request) =>
      service.command(
        request.authSession!.user.id,
        request.params.id,
        "create",
        request.headers["idempotency-key"],
        request.body,
        request.id,
      ),
  );
  for (const action of QUALIFICATION_ACTIONS)
    app.post<{ Params: { id: string } }>(
      `/api/v1/scholarships/:id/qualification/${action}`,
      {
        bodyLimit: 4096,
        config: { permission: qualificationPermission(action) },
      },
      (request) =>
        service.command(
          request.authSession!.user.id,
          request.params.id,
          action,
          request.headers["idempotency-key"],
          request.body,
          request.id,
        ),
    );
}
