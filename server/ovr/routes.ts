import { z } from "zod";
import { AuthError } from "../auth/service.js";
import type { FastifyInstance } from "fastify";
import type { OvrService } from "./service.js";
export function registerOvr(app: FastifyInstance, service: OvrService) {
  const config = { config: { permission: "ovr.prepare" as const } };
  app.get<{Params:{cycleId:string}}>("/api/v1/payout-cycles/:cycleId/ovr-batch-summaries", config, r => service.summaries(r.authSession!.user.id,r.params.cycleId,r.query));
  app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/summary", config, r => service.summary(r.authSession!.user.id,r.params.id));
  app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/candidates", config, r => service.candidatePage(r.authSession!.user.id,r.params.id,r.query));
  app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/roster", config, r => service.entryPage(r.authSession!.user.id,r.params.id,r.query));
  app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/history", config, r => service.historyPage(r.authSession!.user.id,r.params.id,r.query));
  app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/payment-history", config, r => service.paymentPage(r.authSession!.user.id,r.params.id,r.query));
  app.get<{Params:{id:string;section:string}}>("/api/v1/ovr-batches/:id/sections/:section", config, r => service.section(r.authSession!.user.id,r.params.id,r.params.section));
  app.get<{ Params: { cycleId: string } }>(
    "/api/v1/payout-cycles/:cycleId/ovr-batches",
    config,
    (r) => service.list(r.authSession!.user.id, r.params.cycleId, r.query),
  );
  app.post<{ Params: { cycleId: string } }>(
    "/api/v1/payout-cycles/:cycleId/ovr-batches",
    { ...config, bodyLimit: 4096 },
    (r) =>
      service.command(
        r.authSession!.user.id,
        r.params.cycleId,
        "create",
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
  app.get<{ Params: { id: string } }>("/api/v1/ovr-batches/:id", config, (r) =>
    service.read(r.authSession!.user.id, r.params.id),
  );
  app.get<{ Params: { id: string } }>("/api/v1/ovr-batches/:id/payroll-form", config, async (r, reply) => {
    const query = z.object({ original:z.enum(["true","false"]).optional(), draft:z.enum(["true","false"]).optional(), format:z.enum(["html","docx"]).default("html") }).strict().safeParse(r.query);
    if(!query.success) throw new AuthError(422,"VALIDATION_FAILED","Choose HTML preview or Word download.");
    const word = query.data.format === "docx";
    const output = await service.form(r.authSession!.user.id, r.params.id, r.id, query.data.draft === "true", query.data.format, query.data.original === "true");
    return reply.header("Content-Type", word ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "text/html; charset=utf-8").header("Cache-Control", "no-store").header("Content-Disposition", word ? `attachment; filename="payroll-${r.params.id}.docx"` : "inline; filename=payroll.html").send(output);
  });
  app.post<{ Params: { id: string } }>("/api/v1/ovr-batches/:id/defer", { config: { permission: "ovr.finalize" }, bodyLimit: 4096 }, r => service.command(r.authSession!.user.id, r.params.id, "defer", r.headers["idempotency-key"], r.body, r.id));
  app.post<{Params:{id:string}}>("/api/v1/ovr-batches/:id/restore",{config:{permission:"ovr.finalize"},bodyLimit:4096},r=>service.command(r.authSession!.user.id,r.params.id,"restore",r.headers["idempotency-key"],r.body,r.id));
  for(const action of ["assign-reprocessing","classify-unpaid"] as const) app.post<{Params:{id:string}}>(`/api/v1/ovr-batches/:id/${action}`,{config:{permission:"ovr.finalize"},bodyLimit:4096},r=>service.reprocessingCommand(r.authSession!.user.id,r.params.id,action,r.headers["idempotency-key"],r.body,r.id));
  for (const action of ["add", "remove", "validate"] as const)
    app.post<{ Params: { id: string } }>(
      `/api/v1/ovr-batches/:id/${action === "validate" ? "validate" : `entries/${action}`}`,
      { ...config, bodyLimit: 4096 },
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
  for (const action of [
    "submit-review",
    "return-to-draft",
    "finalize",
  ] as const)
    app.post<{ Params: { id: string } }>(
      `/api/v1/ovr-batches/:id/${action}`,
      {
        bodyLimit: 4096,
        config: {
          permission:
            action === "submit-review" ? "ovr.prepare" : "ovr.finalize",
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
