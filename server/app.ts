import {registerGraduationEvidence} from './graduation/routes.js';
import {DurationService} from './graduation/duration-service.js';
import {MonitoringEvidenceService} from './graduation/monitoring-service.js';
import { DocumentBatchService } from "./requirements/batch-service.js";
import { registerDocumentBatches } from "./requirements/batch-routes.js";
import { PriorBatchApprovalService } from "./requirements/prior-approval-service.js";
import { HistoricalPayoutSetupService } from "./payouts/historical-setup.js";
import { HistoricalAppendService } from "./payouts/historical-append.js";
import { SharedSemesterDocumentsService } from "./requirements/shared-semester-documents.js";
import { EntrantGradingCardService } from "./requirements/entrant-grading-card.js";
import { LegacyConversionService } from "./ovr/legacy-conversion.js";
import { PlacementPolicyService } from "./academic/placement-policy-service.js";
import { TreasuryService } from "./ovr/treasury-service.js";
import { registerBackupStatus } from "./backup-status.js";
import { NotificationService } from "./notifications/service.js";
import { registerNotifications } from "./notifications/routes.js";
import { SubmissionWindowService } from "./payouts/submission-service.js";
import { registerSubmissionWindows } from "./payouts/submission-routes.js";
import { publicFailure } from "./error-response.js";
import { ContinuingService } from "./continuing/service.js";
import { SemesterSetupService } from "./continuing/semester-setup.js";
import { SemesterReceivingService } from "./continuing/semester-receiving.js";
import { SemesterAcademicService } from "./continuing/semester-academic.js";
import { SemesterEligibilityPreviewService } from "./continuing/semester-eligibility-preview.js";
import { SemesterComplianceService } from "./continuing/semester-compliance.js";
import { registerSemesterReceiving } from "./continuing/semester-receiving-routes.js";
import { registerSemesterSetup } from "./continuing/semester-setup-routes.js";
import { registerContinuing } from "./continuing/routes.js";
import { routineEvidence } from "./routine-evidence.js";
import { AuditService } from "./audit/service.js";
import { registerAudit } from "./audit/routes.js";
import { ScholarProfileService } from "./scholars/profile-service.js";
import { DashboardService } from "./dashboard/service.js";
import { registerDashboard } from "./dashboard/routes.js";
import { ReportService } from "./reports/service.js";
import { registerReports } from "./reports/routes.js";
import { ImportService } from "./imports/service.js";
import { ExportService } from "./exports/service.js";
import { registerExports } from "./exports/routes.js";
import { registerImports } from "./imports/routes.js";
import { PaymentCorrectionService } from "./ovr/payment-correction-service.js";
import { registerPaymentCorrections } from "./ovr/payment-correction-routes.js";
import { OvrAmendmentService } from "./ovr/amendment-service.js";
import { registerOvrAmendments } from "./ovr/amendment-routes.js";
import { OvrProcessingService } from "./ovr/processing-service.js";
import { registerOvrProcessing } from "./ovr/processing-routes.js";
import { registerPaymentRecording } from "./payments/recording-routes.js";
import { IndividualPaymentService } from "./payments/individual-service.js";
import { registerIndividualPayments } from "./payments/individual-routes.js";
import {OmissionPaymentService} from './payments/omission-service.js';
import {DeferredRecoveryService} from './payments/deferred-recovery.js';
import {IndividualDiscoveryService} from './payments/discovery-service.js';
import {IndividualDocumentService} from './payments/document-service.js';
import {registerIndividualDocuments} from './payments/document-routes.js';
import {IndividualSettlementService} from './payments/settlement-service.js';
import {registerIndividualSettlement} from './payments/settlement-routes.js';
import {registerOmissionPayments} from './payments/omission-routes.js';
import {PayrollPreparationService} from './payouts/preparation.js';
import { PaymentRecordingService } from "./payments/recording-service.js";
import { PayrollReconciliationService } from "./payments/reconciliation-service.js";
import { registerPayrollReconciliation } from "./payments/reconciliation-routes.js";
import {FinancialReportService} from './payments/report-service.js';
import {registerFinancialReports} from './payments/report-routes.js';
import { OvrService } from "./ovr/service.js";
import { registerOvr } from "./ovr/routes.js";
import { EligibilityOverrideService } from "./eligibility/override-service.js";
import { registerEligibilityOverrides } from "./eligibility/override-routes.js";
import { EligibilityService } from "./eligibility/service.js";
import { registerEligibility } from "./eligibility/routes.js";
import { PayoutService } from "./payouts/service.js";
import { registerPayouts } from "./payouts/routes.js";
import { RequirementWaiverService } from "./requirements/waiver-service.js";
import { registerRequirementWaiver } from "./requirements/waiver-routes.js";
import { RequirementWorkflowService } from "./requirements/workflow-service.js";
import { registerRequirementWorkflow } from "./requirements/workflow-routes.js";
import { RequirementReceiptService } from "./requirements/receipt-service.js";
import { RequirementTimingService } from "./requirements/timing-service.js";
import { registerRequirementTiming } from "./requirements/timing-routes.js";
import { registerRequirementReceipts } from "./requirements/receipt-routes.js";
import { RequirementInstancesService } from "./requirements/instances-service.js";
import { registerRequirementInstances } from "./requirements/instances-routes.js";
import { RequirementService } from "./requirements/service.js";
import { registerRequirements } from "./requirements/routes.js";
import { MasterlistAmendmentService } from "./masterlists/amendment-service.js";
import { registerAmendments } from "./masterlists/amendment-routes.js";
import { MasterlistWorkflowService } from "./masterlists/workflow-service.js";
import { MasterlistService } from "./masterlists/service.js";
import { MasterlistConflictRemovalService } from "./masterlists/conflict-removal-service.js";
import { MasterlistSelectionService } from "./masterlists/selection-service.js";
import { registerMasterlists } from "./masterlists/routes.js";
import { MasterlistAdditionService } from "./masterlists/additions.js";
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
import { randomUUID } from "node:crypto";
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
import { registerGraduationMonitoring } from "./scholars/graduation-monitoring-routes.js";
import { GraduationMonitoringService } from "./scholars/graduation-monitoring.js";
import { AnnualIntakeService } from "./scholars/annual-intake-service.js";

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
    requestTimeout: 30_000,
    trustProxy: config.TRUST_LOOPBACK_PROXY ? ["127.0.0.1", "::1"] : false,
    requestIdHeader: false,
    genReqId: () => randomUUID(),
  });

  app.addHook("onClose", async () => database.close());
  app.addHook("preValidation", async (request) => {
    if (["POST", "PATCH"].includes(request.method))
      request.body = routineEvidence(request.routeOptions.url ?? request.url, request.body);
  });
  app.register(cookie);
  registerDocumentBatches(app, new DocumentBatchService(new AuthorizationService(database.pool)));
  const priorBatches = new PriorBatchApprovalService(new AuthorizationService(database.pool));
  app.get("/api/v1/document-batches/prior-approval-preview", {config:{permission:"academic.changes.approve"}}, r=>priorBatches.preview(r.authSession!.user.id,r.query));
  app.post("/api/v1/document-batches/prior-approval", {bodyLimit:512*1024,config:{permission:"academic.changes.approve"}}, r=>priorBatches.record(r.authSession!.user.id,r.headers["idempotency-key"],r.body,r.id));
  const historicalPayouts = new HistoricalPayoutSetupService(new AuthorizationService(database.pool));
  const historicalAppend = new HistoricalAppendService(new AuthorizationService(database.pool),config.HISTORICAL_MULTIBATCH_ENABLED==='true');
  app.get<{Params:{id:string};Querystring:{importId?:string}}>("/api/v1/payout-cycles/:id/historical-append-preview",{config:{permission:"payroll.windows.manage"}},r=>historicalAppend.preview(r.authSession!.user.id,r.params.id,r.query.importId));
  app.post<{Params:{id:string}}>("/api/v1/payout-cycles/:id/historical-append",{bodyLimit:16384,config:{permission:"payroll.windows.manage"}},r=>historicalAppend.record(r.authSession!.user.id,r.params.id,r.headers['idempotency-key'],r.body,r.id));
  app.post<{Params:{id:string}}>("/api/v1/payout-cycles/:id/historical-setup",{config:{permission:"payroll.windows.manage"}},r=>historicalPayouts.record(r.authSession!.user.id,r.params.id,r.headers["idempotency-key"],r.body,r.id));
  registerSubmissionWindows(app, new SubmissionWindowService(new AuthorizationService(database.pool),config.HISTORICAL_MULTIBATCH_ENABLED==='true'));
  registerContinuing(app, new ContinuingService(database.pool));
  registerSemesterSetup(app, new SemesterSetupService(database.pool));
  const sharedDocuments = new SharedSemesterDocumentsService(database.pool);
  const entrantCards = new EntrantGradingCardService(database.pool);
  app.get<{Params:{id:string}}>("/api/v1/requirement-instances/:id/entrant-card",{config:{permission:"scholars.read"}},r=>entrantCards.read(r.authSession!.user.id,r.params.id));
  app.post<{Params:{id:string}}>("/api/v1/requirement-instances/:id/entrant-card",{config:{permission:"semesters.configure"},bodyLimit:4096},r=>entrantCards.command(r.authSession!.user.id,r.params.id,r.headers["idempotency-key"],r.body,r.id));
  app.get<{ Params: { id: string; semester: string } }>("/api/v1/scholars/:id/semester-requirements/:semester/shared-documents", { config: { permission: "scholars.read" } }, r => sharedDocuments.read(r.authSession!.user.id, r.params.id, r.params.semester));
  app.post<{ Params: { id: string; semester: string } }>("/api/v1/scholars/:id/semester-requirements/:semester/shared-documents/reconcile", { config: { permission: "semesters.configure" }, bodyLimit: 4096 }, r => sharedDocuments.reconcile(r.authSession!.user.id, r.params.id, r.params.semester, r.headers["idempotency-key"], r.body, r.id));
  app.post<{ Params: { id: string; semester: string } }>("/api/v1/scholars/:id/semester-requirements/:semester/shared-documents/reuse", { config: { permission: "semesters.configure" }, bodyLimit: 4096 }, r => sharedDocuments.reuse(r.authSession!.user.id, r.params.id, r.params.semester, r.headers["idempotency-key"], r.body, r.id));
  registerSemesterReceiving(app, new SemesterReceivingService(database.pool), new SemesterAcademicService(database.pool), new SemesterComplianceService(database.pool), new SemesterEligibilityPreviewService(database.pool));
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
  registerAudit(app, new AuditService(new AuthorizationService(database.pool)));
  registerBackupStatus(app, config.BACKUP_STATUS_FILE, config.DB_NAME, config.APP_ENV);
  registerNotifications(app, new NotificationService(new AuthorizationService(database.pool)));
  registerDashboard(
    app,
    new DashboardService(new AuthorizationService(database.pool)),
  );
  registerConfiguration(
    app,
    new ConfigurationService(new AuthorizationService(database.pool)),
  );
  registerImports(
    app,
    new ImportService(new AuthorizationService(database.pool)),
  );
  registerExports(
    app,
    new ExportService(new AuthorizationService(database.pool)),
  );
  registerReports(
    app,
    new ReportService(new AuthorizationService(database.pool)),
  );
  registerRequirements(
    app,
    new RequirementService(new AuthorizationService(database.pool)),
  );
  registerRequirementInstances(
    app,
    new RequirementInstancesService(new AuthorizationService(database.pool)),
  );
  registerRequirementTiming(app, new RequirementTimingService(new AuthorizationService(database.pool)));
  registerRequirementReceipts(
    app,
    new RequirementReceiptService(new AuthorizationService(database.pool)),
  );
  const placementPolicy = new PlacementPolicyService(new AuthorizationService(database.pool));
  app.post<{Params:{id:string}}>("/api/v1/academic-records/:id/policy-reviews",{bodyLimit:8192,config:{permission:"academic.changes.approve"}},r=>placementPolicy.record(r.authSession!.user.id,r.params.id,r.headers["idempotency-key"],r.body,r.id));
  const conversion = new LegacyConversionService(new AuthorizationService(database.pool));
  app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/conversion",{config:{permission:"ovr.finalize"}},r=>conversion.read(r.authSession!.user.id,r.params.id));
  app.post<{Params:{id:string}}>("/api/v1/ovr-batches/:id/conversion",{bodyLimit:131072,config:{permission:"ovr.finalize"}},r=>conversion.convert(r.authSession!.user.id,r.params.id,r.headers["idempotency-key"],r.body,r.id));
  const treasury = new TreasuryService(new AuthorizationService(database.pool));
  app.post<{Params:{id:string}}>("/api/v1/ovr-batches/:id/treasury-evidence", {bodyLimit:4096, config:{permission:"ovr.process"}}, r => treasury.record(r.authSession!.user.id,r.params.id,r.headers["idempotency-key"],r.body,r.id));
  for(const action of ["request","approve","reject"] as const) app.post<{Params:{id:string}}>(`/api/v1/ovr-batches/:id/historical-receipts/${action}`, {bodyLimit:8192, config:{permission:action === "request" ? "ovr.process" : "payments.corrections.approve"}}, r => treasury.historical(r.authSession!.user.id,r.params.id,action,r.headers["idempotency-key"],r.body,r.id));
  registerPaymentRecording(app,new PaymentRecordingService(new AuthorizationService(database.pool)));
  const individualPayments=new IndividualPaymentService(new AuthorizationService(database.pool),config.INDIVIDUAL_PAYMENTS_ENABLED==="true");
  registerIndividualPayments(app,individualPayments);
  const individualDiscovery=new IndividualDiscoveryService(new AuthorizationService(database.pool),config.INDIVIDUAL_PAYMENTS_ENABLED==='true');
  const deferredRecovery=new DeferredRecoveryService(new AuthorizationService(database.pool),config.INDIVIDUAL_PAYMENTS_ENABLED==='true');
  app.get('/api/v1/individual-payments/discovery/recovery',{config:{permission:'ovr.process'}},r=>deferredRecovery.review(r.authSession!.user.id,r.query));
  app.get('/api/v1/individual-payments/discovery/context',{config:{permission:'ovr.process'}},r=>individualDiscovery.context(r.authSession!.user.id));
  app.get('/api/v1/individual-payments/discovery',{config:{permission:'ovr.process'}},r=>individualDiscovery.page(r.authSession!.user.id,r.query));
  const omittedEnabled=config.INDIVIDUAL_PAYMENTS_ENABLED==='true'&&config.OMITTED_PAYMENTS_ENABLED==='true';
  const omissionPayments=new OmissionPaymentService(new AuthorizationService(database.pool),omittedEnabled);
  registerOmissionPayments(app,omissionPayments,new PayrollPreparationService(new AuthorizationService(database.pool),omittedEnabled));
  registerIndividualDocuments(app,new IndividualDocumentService(new AuthorizationService(database.pool),{individual:individualPayments,omitted:omissionPayments},config.INDIVIDUAL_PAYMENTS_ENABLED==='true'&&config.INDIVIDUAL_DOCUMENTS_ENABLED==='true'));
  registerIndividualSettlement(app,new IndividualSettlementService(new AuthorizationService(database.pool),{individual:individualPayments,omitted:omissionPayments},config.INDIVIDUAL_PAYMENTS_ENABLED==='true'&&config.INDIVIDUAL_SETTLEMENT_ENABLED==='true'));
  registerPayrollReconciliation(app,new PayrollReconciliationService(new AuthorizationService(database.pool)));
  registerFinancialReports(app,new FinancialReportService(new AuthorizationService(database.pool)));
  registerOvrProcessing(
    app,
    new OvrProcessingService(new AuthorizationService(database.pool)),
  );
  registerOvrAmendments(
    app,
    new OvrAmendmentService(new AuthorizationService(database.pool)),
  );
  registerPaymentCorrections(
    app,
    new PaymentCorrectionService(new AuthorizationService(database.pool)),
  );
  const scholarProfile = new ScholarProfileService(
    new AuthorizationService(database.pool),
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/scholars/:id/profile",
    { config: { permission: "scholars.read" } },
    (r) => scholarProfile.read(r.authSession!.user.id, r.params.id, r.query),
  );
  registerOvr(app, new OvrService(new AuthorizationService(database.pool)));
  registerEligibilityOverrides(
    app,
    new EligibilityOverrideService(new AuthorizationService(database.pool)),
  );
  registerEligibility(
    app,
    new EligibilityService(new AuthorizationService(database.pool)),
  );
  registerPayouts(
    app,
    new PayoutService(new AuthorizationService(database.pool)),
  );
  registerRequirementWaiver(
    app,
    new RequirementWaiverService(new AuthorizationService(database.pool)),
  );
  registerRequirementWorkflow(
    app,
    new RequirementWorkflowService(new AuthorizationService(database.pool)),
  );
  registerScholars(
    app,
    new ScholarService(new AuthorizationService(database.pool)),
    new AnnualIntakeService(new AuthorizationService(database.pool)),
  );
  registerGraduationEvidence(app,new DurationService(new AuthorizationService(database.pool),config.GRADUATION_MONITORING_WRITES_ENABLED==='true'),new MonitoringEvidenceService(new AuthorizationService(database.pool),config.GRADUATION_MONITORING_WRITES_ENABLED==='true'));
  registerGraduationMonitoring(app, new GraduationMonitoringService(new AuthorizationService(database.pool),config.GRADUATION_MONITORING_WRITES_ENABLED==='true'));
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
  const additions = new MasterlistAdditionService(new AuthorizationService(database.pool));
  app.get<{ Params: { id: string } }>("/api/v1/masterlists/:id/addition", { config: { permission: "masterlists.prepare" } }, r => additions.view(r.authSession!.user.id, r.params.id));
  app.post<{ Params: { id: string } }>("/api/v1/masterlists/:id/addition", { config: { permission: "masterlists.prepare" }, bodyLimit: 4096 }, r => additions.command(r.authSession!.user.id, r.params.id, r.headers["idempotency-key"], r.body, r.id));
  registerMasterlists(
    app,
    new MasterlistService(new AuthorizationService(database.pool)),
    new MasterlistWorkflowService(new AuthorizationService(database.pool)),
    new MasterlistSelectionService(new AuthorizationService(database.pool)),
    new MasterlistConflictRemovalService(new AuthorizationService(database.pool)),
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
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
  });

  app.get("/api/v1/health", async () => ({
    status: "ok",
    service: "ldss-api",
    release: "0.37.0",
    checkpoint: "F36",
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
    const failure = publicFailure(error);
    if (failure.status === 500)
      app.log.error({ requestId: request.id }, "Unhandled request failure");
    return reply
      .code(failure.status)
      .send({
        error: {
          code: failure.code,
          message: failure.message,
          request_id: request.id,
        },
      });
  });

  return app;
}
