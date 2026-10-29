import { MasterlistWorkflowService } from "./workflow-service.js";
import { MASTERLIST_ACTIONS } from "./workflow-model.js";
import { workflowPermission } from "./workflow-validation.js";
import { AuthError } from "../auth/service.js";
import type { MasterlistConflictRemovalService } from "./conflict-removal-service.js";
import type { MasterlistSelectionService } from "./selection-service.js";
import type { FastifyInstance } from "fastify";
import { DraftValidationError, type MasterlistService } from "./service.js";
export function registerMasterlists(
  app: FastifyInstance,
  service: MasterlistService,
  workflow: MasterlistWorkflowService,
  selection: MasterlistSelectionService,
  removal: MasterlistConflictRemovalService,
) {
  app.get<{ Params: { id: string } }>("/api/v1/masterlists/:id/conflict-removal-review", { config: { permission: "masterlists.prepare" } }, r => removal.review(r.authSession!.user.id, r.params.id, r.query));
  app.post<{ Params: { id: string } }>("/api/v1/masterlists/:id/remove-conflicts", { bodyLimit: 16384, config: { permission: "masterlists.prepare" } }, r => removal.remove(r.authSession!.user.id, r.params.id, r.headers["idempotency-key"], r.body, r.id));
  app.get<{ Params: { id: string } }>("/api/v1/masterlists/:id/selection-review", { config: { permission: "masterlists.prepare" } }, r => selection.review(r.authSession!.user.id, r.params.id, r.query));
  app.get<{ Params: { id: string } }>("/api/v1/masterlists/:id/activation-conflicts", { config: { permission: "masterlists.prepare" } }, r => selection.conflicts(r.authSession!.user.id, r.params.id, r.query));
  app.post<{ Params: { id: string } }>("/api/v1/masterlists/:id/add-scope", { bodyLimit: 8192, config: { permission: "masterlists.prepare" } }, r => selection.add(r.authSession!.user.id, r.params.id, r.headers["idempotency-key"], r.body, r.id));
  app.get<{ Params: { id: string } }>(
    "/api/v1/masterlists/:id/workflow",
    { config: { permission: "masterlists.prepare" } },
    (r) => workflow.view(r.authSession!.user.id, r.params.id),
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/masterlists/:id/publication",
    { config: { permission: "masterlists.prepare" } },
    async (r, reply) => {
      const view = await workflow.view(r.authSession!.user.id, r.params.id);
      if (!view.publication)
        throw new AuthError(
          404,
          "PUBLICATION_NOT_FOUND",
          "Masterlist has not been published.",
        );
      return reply
        .header(
          "Content-Disposition",
          `attachment; filename="masterlist-${r.params.id}.json"`,
        )
        .send(view.publication);
    },
  );
  for (const action of MASTERLIST_ACTIONS)
    app.post<{ Params: { id: string } }>(
      `/api/v1/masterlists/:id/${action}`,
      { bodyLimit: 4096, config: { permission: workflowPermission(action) } },
      async (r, reply) => {
        try {
          return await workflow.command(
            r.authSession!.user.id,
            r.params.id,
            action,
            r.headers["idempotency-key"],
            r.body,
            r.id,
          );
        } catch (e) {
          if (e instanceof DraftValidationError)
            return reply
              .code(e.status)
              .send({
                error: {
                  code: e.code,
                  message: e.message,
                  request_id: r.id,
                  issues: e.issues,
                  details: { issues: e.issues },
                },
              });
          throw e;
        }
      },
    );
  const config = { permission: "masterlists.prepare" as const };
  app.get("/api/v1/masterlists", { config }, (r) =>
    service.list(r.authSession!.user.id, r.query),
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/masterlists/:id",
    { config },
    (r) => service.detail(r.authSession!.user.id, r.params.id),
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/masterlists/:id/validation",
    { config },
    async (r) =>
      (await service.detail(r.authSession!.user.id, r.params.id)).validation,
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/masterlists/:id/candidates",
    { config },
    (r) => service.candidates(r.authSession!.user.id, r.params.id, r.query),
  );
  for (const path of ["/api/v1/masterlists", "/api/v1/masterlists/:id/entries"])
    app.post<{ Params: { id?: string } }>(
      path,
      { config, bodyLimit: 4096 },
      async (r, reply) => {
        try {
          return await service.command(
            r.authSession!.user.id,
            r.params.id,
            r.headers["idempotency-key"],
            r.body,
            r.id,
          );
        } catch (e) {
          if (e instanceof DraftValidationError)
            return reply.code(e.status).send({
              error: {
                code: e.code,
                message: e.message,
                request_id: r.id,
                issues: e.issues,
                details: { issues: e.issues },
              },
            });
          throw e;
        }
      },
    );
}
