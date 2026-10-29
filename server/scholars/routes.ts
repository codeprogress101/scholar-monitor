import type { FastifyInstance } from "fastify";
import type { ScholarService } from "./service.js";
import type { AnnualIntakeService } from "./annual-intake-service.js";
export function registerScholars(
  app: FastifyInstance,
  service: ScholarService,
  annual: AnnualIntakeService,
) {
  const text=annual.text;
  app.get<{Params:{id:string}}>("/api/v1/scholar-intakes/:id/supplied-text/history",{config:{permission:"scholars.read"}},r=>text.history(r.authSession!.user.id,r.params.id,r.query));
  for(const correction of [false,true])app.post<{Params:{id:string}}>(`/api/v1/scholar-intakes/:id/supplied-text/${correction?'corrections':'completions'}`,{bodyLimit:8192,config:{permission:correction?'scholars.intakes.correct':'scholars.update'}},r=>text.revise(r.authSession!.user.id,r.params.id,r.headers['idempotency-key'],r.body,correction,r.id));
  app.get("/api/v1/scholar-registrations/context",{config:{permission:"scholars.create"}},r=>annual.context(r.authSession!.user.id));
  app.post("/api/v1/scholar-registrations",{bodyLimit:8192,config:{permission:"scholars.create"}},async(r,reply)=>reply.code(201).send(await annual.register(r.authSession!.user.id,r.headers["idempotency-key"],r.body,r.id)));
  app.get<{Params:{id:string}}>("/api/v1/scholars/:id/annual-intakes",{config:{permission:"scholars.read"}},r=>annual.list(r.authSession!.user.id,r.params.id,r.query));
  app.get<{Params:{id:string}}>("/api/v1/scholar-intakes/:id/history",{config:{permission:"scholars.read"}},r=>annual.history(r.authSession!.user.id,r.params.id,r.query));
  app.post<{Params:{id:string}}>("/api/v1/scholar-intakes/:id/supplements",{bodyLimit:8192,config:{permission:"scholars.update"}},r=>annual.revise(r.authSession!.user.id,r.params.id,r.headers["idempotency-key"],r.body,false,r.id));
  app.post<{Params:{id:string}}>("/api/v1/scholar-intakes/:id/classification-corrections",{bodyLimit:8192,config:{permission:"scholars.intakes.correct"}},r=>annual.revise(r.authSession!.user.id,r.params.id,r.headers["idempotency-key"],r.body,true,r.id));
  app.get("/api/v1/scholars/eligibility", { config: { permission: "scholars.read" } }, r => service.eligibility(r.authSession!.user.id, r.query));
  app.get(
    "/api/v1/scholars",
    { config: { permission: "scholars.read" } },
    (request) => service.list(request.authSession!.user.id, request.query),
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/scholars/:id",
    { config: { permission: "scholars.read" } },
    (request) =>
      service.detail(request.authSession!.user.id, request.params.id, request.query),
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
