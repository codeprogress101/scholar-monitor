import type { FastifyInstance } from "fastify";
import type { ExportService } from "./service.js";
export function registerExports(app: FastifyInstance, service: ExportService) {
  for (const [path, permission, method] of [
    ["scholars", "scholars.export", "scholars"],
    ["audit", "audit.export", "audit"],
  ] as const)
    app.post(
      `/api/v1/exports/${path}`,
      { bodyLimit: 4096, config: { permission } },
      async (r, reply) => {
        const file = await service[method](
          r.authSession!.user.id,
          r.body,
          r.id,
        );
        return reply
          .header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          )
          .header(
            "Content-Disposition",
            `attachment; filename="${file.fileName}"`,
          )
          .header("Cache-Control", "no-store")
          .header("X-Export-ID", file.id)
          .send(file.buffer);
      },
    );
}
