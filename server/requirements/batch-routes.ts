import type { FastifyInstance } from "fastify";
import type { DocumentBatchService } from "./batch-service.js";
export function registerDocumentBatches(app: FastifyInstance, service: DocumentBatchService) {
  app.get("/api/v1/document-batches", { config: { permission: "requirements.verify" } }, r => service.batches(r.authSession!.user.id));
  app.get("/api/v1/document-batches/preview", { config: { permission: "requirements.verify" } }, r => service.preview(r.authSession!.user.id, r.query));
  app.post("/api/v1/document-batches/verify", { bodyLimit: 1024 * 1024, config: { permission: "requirements.verify" } }, r => service.verify(r.authSession!.user.id, r.headers["idempotency-key"], r.body, r.id));
  app.post("/api/v1/document-batches/historical-placement", { bodyLimit: 512 * 1024, config: { permission: "semesters.configure" } }, r => service.reviewHistoricalPlacement(r.authSession!.user.id, r.headers["idempotency-key"], r.body, r.id));
}
