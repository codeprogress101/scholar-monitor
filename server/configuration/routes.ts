import type { FastifyInstance } from "fastify";
import type { ConfigurationService } from "./service.js";
export function registerConfiguration(
  app: FastifyInstance,
  service: ConfigurationService,
) {
  app.get<{ Params: { kind: string } }>(
    "/api/v1/configuration/:kind",
    { config: { permission: "configuration.read" } },
    (request) =>
      service.list(
        request.authSession!.user.id,
        request.params.kind,
        request.query,
      ),
  );
  app.get<{ Params: { kind: string; id: string } }>(
    "/api/v1/configuration/:kind/:id",
    { config: { permission: "configuration.read" } },
    (request) =>
      service.detail(
        request.authSession!.user.id,
        request.params.kind,
        request.params.id,
      ),
  );
  app.post<{ Params: { kind: string } }>(
    "/api/v1/configuration/:kind",
    { bodyLimit: 8192, config: { permission: "configuration.manage" } },
    (request) =>
      service.command(
        request.authSession!.user.id,
        request.params.kind,
        undefined,
        request.headers["idempotency-key"],
        request.body,
        request.id,
      ),
  );
  app.post<{ Params: { kind: string; id: string } }>(
    "/api/v1/configuration/:kind/:id",
    { bodyLimit: 8192, config: { permission: "configuration.manage" } },
    (request) =>
      service.command(
        request.authSession!.user.id,
        request.params.kind,
        request.params.id,
        request.headers["idempotency-key"],
        request.body,
        request.id,
      ),
  );
}
