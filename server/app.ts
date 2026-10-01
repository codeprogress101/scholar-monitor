import { RequirementWorkflowService } from "./requirements/workflow-service.js";
import { registerRequirementWorkflow } from "./requirements/workflow-routes.js";
import { RequirementReceiptService } from "./requirements/receipt-service.js";
import { registerRequirementReceipts } from "./requirements/receipt-routes.js";
import { RequirementInstancesService } from "./requirements/instances-service.js";
import { registerRequirementInstances } from "./requirements/instances-routes.js";
import { RequirementService } from "./requirements/service.js";
import { registerRequirements } from "./requirements/routes.js";
import { MasterlistAmendmentService } from "./masterlists/amendment-service.js";
import { registerAmendments } from "./masterlists/amendment-routes.js";
import { MasterlistWorkflowService } from "./masterlists/workflow-service.js";
import { MasterlistService } from "./masterlists/service.js";
import { registerMasterlists } from "./masterlists/routes.js";
import { AcademicChangesService } from "./academic/changes-service.js";
import { registerAcademicChanges } from "./academic/changes-routes.js";
import { AcademicService } from "./academic/service.js";
import { registerAcademic } from "./academic/routes.js";
import { StatusService } from "./status/service.js";
import { registerStatus } from "./status/routes.js";
import { QualificationService } from "./qualification/service.js";
import { registerQualification } from "./qualification/routes.js";
import Fastify, { LogController } from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import type { AppConfig } from "./config.js";
import { createDatabase, type Database } from "./database.js";
import cookie from "@fastify/cookie";
import { AuthService, type AuthApi } from "./auth/service.js";
import { registerAuth, authFailure } from "./auth/routes.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  AuthorizationService,
  type AuthorizationApi,
} from "./authorization/service.js";
import { registerAuthorization } from "./authorization/routes.js";
import { ConfigurationService } from "./configuration/service.js";
import { registerConfiguration } from "./configuration/routes.js";
import { ScholarService } from "./scholars/service.js";
import { registerScholars } from "./scholars/routes.js";

export function buildApp(
  config: AppConfig,
  options: {
    clientRoot?: string;
    logger?: boolean;
    database?: Database;
    auth?: AuthApi;
    authorization?: AuthorizationApi;
  } = {},
) {
  const database = options.database ?? createDatabase(config);
  const app = Fastify({
    logger: options.logger
      ? {
          level: config.LOG_LEVEL,
          redact: [
            "req.headers.authorization",
            "req.headers.cookie",
            'res.headers["set-cookie"]',
          ],
        }
      : false,
    logController: new LogController({ disableRequestLogging: true }),
    bodyLimit: 1024 * 1024,
  });

  app.addHook("onClose", async () => database.close());
  app.register(cookie);
  registerAuth(
    app,
    config,
    options.auth ??
      new AuthService(
        database.pool,
        config.SESSION_IDLE_MINUTES,
        config.SESSION_ABSOLUTE_HOURS,
      ),
  );
  registerAuthorization(
    app,
    options.authorization ?? new AuthorizationService(database.pool),
  );
  registerConfiguration(
    app,
    new ConfigurationService(new AuthorizationService(database.pool)),
  );
  registerRequirements(
    app,
    new RequirementService(new AuthorizationService(database.pool)),
  );
  registerRequirementInstances(
    app,
    new RequirementInstancesService(new AuthorizationService(database.pool)),
  );
  registerRequirementReceipts(
    app,
    new RequirementReceiptService(new AuthorizationService(database.pool)),
  );
  registerRequirementWorkflow(
    app,
    new RequirementWorkflowService(new AuthorizationService(database.pool)),
  );
  registerScholars(
    app,
    new ScholarService(new AuthorizationService(database.pool)),
  );
  registerQualification(
    app,
    new QualificationService(new AuthorizationService(database.pool)),
  );
  registerStatus(
    app,
    new StatusService(new AuthorizationService(database.pool)),
  );
  registerAcademicChanges(
    app,
    new AcademicChangesService(new AuthorizationService(database.pool)),
  );
  registerAmendments(
    app,
    new MasterlistAmendmentService(new AuthorizationService(database.pool)),
  );
  registerMasterlists(
    app,
    new MasterlistService(new AuthorizationService(database.pool)),
    new MasterlistWorkflowService(new AuthorizationService(database.pool)),
  );
  registerAcademic(
    app,
    new AcademicService(new AuthorizationService(database.pool)),
  );
  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Cache-Control", "no-store");
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
  });

  app.get("/api/v1/health", async () => ({
    status: "ok",
    service: "ldss-api",
    release: "0.17.0",
    checkpoint: "F16",
    database: await database.check(),
  }));

  app.get("/api/v1/ready", async (_request, reply) => {
    const status = await database.check();
    return reply.code(status === "connected" ? 200 : 503).send({
      status: status === "connected" ? "ready" : "not_ready",
      database: status,
    });
  });

  app.get(
    "/api/v1/implementation-plan",
    { config: { access: "authenticated" } },
    async (_request, reply) => {
      const plan = await readFile(
        resolve("LDSS_Codex_Function_by_Function_Implementation_Plan.md"),
        "utf8",
      );
      return reply
        .header(
          "Content-Disposition",
          'attachment; filename="LDSS-implementation-plan.md"',
        )
        .type("text/markdown; charset=utf-8")
        .send(plan);
    },
  );
  app.all(
    "/api/*",
    { config: { access: "authenticated" } },
    async (request, reply) =>
      reply.code(404).send({
        error: {
          code: "NOT_FOUND",
          message: "This function has not been implemented yet.",
          request_id: request.id,
        },
      }),
  );

  if (options.clientRoot) {
    if (!existsSync(options.clientRoot))
      throw new Error("Frontend build missing. Run npm run build first.");
    app.register(fastifyStatic, {
      root: options.clientRoot,
      index: ["index.html"],
    });
  }

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        request_id: request.id,
      },
    }),
  );

  app.setErrorHandler((error, request, reply) => {
    if (authFailure(error, request, reply)) return;
    const status = (error as { statusCode?: number }).statusCode;
    if (status && status >= 400 && status < 500) {
      return reply.code(status).send({
        error: {
          code: "INVALID_REQUEST",
          message: "The request could not be processed.",
          request_id: request.id,
        },
      });
    }
    app.log.error({ requestId: request.id }, "Unhandled request failure");
    return reply.code(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        request_id: request.id,
      },
    });
  });

  return app;
}
