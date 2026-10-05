import type { FastifyInstance } from "fastify";
import type { ImportService } from "./service.js";
import { importTemplate } from "./workbook.js";
export function registerImports(app: FastifyInstance, service: ImportService) {
  app.get(
    "/api/v1/imports/template",
    { config: { permission: "scholars.create" } },
    async (_r, reply) =>
      reply
        .header(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .header(
          "Content-Disposition",
          'attachment; filename="scholar-import-template.xlsx"',
        )
        .send(await importTemplate()),
  );
  app.post(
    "/api/v1/imports/stage",
    { bodyLimit: 3 * 1024 * 1024, config: { permission: "scholars.create" } },
    (r) =>
      service.stage(
        r.authSession!.user.id,
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/imports/:id",
    { config: { permission: "scholars.create" } },
    (r) => service.read(r.authSession!.user.id, r.params.id),
  );
  app.post<{ Params: { id: string } }>(
    "/api/v1/imports/:id/confirm",
    { bodyLimit: 4096, config: { permission: "scholars.create" } },
    (r) =>
      service.confirm(
        r.authSession!.user.id,
        r.params.id,
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
}
