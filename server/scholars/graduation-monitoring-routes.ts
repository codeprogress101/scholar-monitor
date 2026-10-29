import type { FastifyInstance } from "fastify";
import type { GraduationMonitoringService } from "./graduation-monitoring.js";
export function registerGraduationMonitoring(app: FastifyInstance, service: GraduationMonitoringService) {
  app.get('/api/v1/scholars/graduation-monitoring/context',{config:{permission:'scholars.read'}},r=>service.context(r.authSession!.user.id));
  app.get('/api/v1/scholars/graduation-monitoring',{config:{permission:'scholars.read'}},r=>service.list(r.authSession!.user.id,r.query));
}
