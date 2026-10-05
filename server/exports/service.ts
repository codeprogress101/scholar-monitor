import { randomUUID, createHash } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { parseScholarExport, parseAuditExport } from "./validation.js";
import { exportWorkbook } from "./workbook.js";
export class ExportService {
  constructor(private authorization: AuthorizationService) {}
  async scholars(actor: string, body: unknown, requestId: string) {
    const input = parseScholarExport(body);
    return this.authorization.withPermission(
      actor,
      "scholars.export",
      async (db, access) => {
        if (!access.permissions.some((p) => p.code === "scholars.read"))
          throw new AuthError(
            403,
            "PERMISSION_DENIED",
            "Scholar read access is required for this export.",
          );
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [years] = await db.execute<RowDataPacket[]>(
          "SELECT code FROM academic_years WHERE id=? LOCK IN SHARE MODE",
          [input.academicYearId],
        );
        if (!years.length)
          throw new AuthError(
            422,
            "REFERENCE_NOT_FOUND",
            "Select an existing registration academic year.",
          );
        const search = "%" + input.q.replace(/[!%_]/g, (v) => "!" + v) + "%";
        const [rows] = await db.execute<RowDataPacket[]>(
          "SELECT i.human_id,s.first_name,s.middle_name,s.last_name,s.suffix FROM scholars s JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE s.academic_year_id=? AND (i.human_id LIKE ? ESCAPE '!' OR CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')) LIKE ? ESCAPE '!' OR CONCAT(s.last_name,', ',s.first_name) LIKE ? ESCAPE '!') ORDER BY s.last_name,s.first_name,s.id LIMIT 5001 LOCK IN SHARE MODE",
          [input.academicYearId, search, search, search],
        );
        if (rows.length > 5000)
          throw new AuthError(
            422,
            "EXPORT_TOO_LARGE",
            "More than 5,000 scholars match. Narrow the search before exporting; no rows were omitted.",
          );
        return this.finish(
          db,
          actor,
          requestId,
          "scholar_registry",
          ["Scholar ID", "Name", "Registration academic year"],
          rows.map((r) => [
            r.human_id,
            [r.last_name + ",", r.first_name, r.middle_name, r.suffix]
              .filter(Boolean)
              .join(" "),
            years[0].code,
          ]),
          { ...input, academicYearCode: years[0].code },
          "Registry review",
        );
      },
    );
  }
  async audit(actor: string, body: unknown, requestId: string) {
    const input = parseAuditExport(body);
    return this.authorization.withPermission(
      actor,
      "audit.export",
      async (db, access) => {
        if (!access.permissions.some((p) => p.code === "audit.view_all"))
          throw new AuthError(
            403,
            "PERMISSION_DENIED",
            "Audit viewing access is required for this export.",
          );
        const [rows] = await db.execute<RowDataPacket[]>(
          "SELECT id,event_type,entity_type,action,actor_id,DATE_FORMAT(occurred_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS occurred,request_id FROM export_audit_metadata WHERE occurred_at>=DATE_SUB(?,INTERVAL 8 HOUR) AND occurred_at<DATE_ADD(DATE_SUB(?,INTERVAL 8 HOUR),INTERVAL 1 DAY) ORDER BY occurred_at,id LIMIT 10001",
          [input.from + " 00:00:00", input.to + " 00:00:00"],
        );
        if (rows.length > 10000)
          throw new AuthError(
            422,
            "EXPORT_TOO_LARGE",
            "More than 10,000 audit events match. Choose a shorter date range; no events were omitted.",
          );
        return this.finish(
          db,
          actor,
          requestId,
          "audit_metadata",
          [
            "Event ID",
            "Event type",
            "Entity type",
            "Action",
            "Actor ID",
            "Occurred at (UTC)",
            "Request ID",
          ],
          rows.map((r) => [
            r.id,
            r.event_type,
            r.entity_type,
            r.action,
            r.actor_id ?? "",
            r.occurred,
            r.request_id ?? "",
          ]),
          { ...input, timeZone: "Asia/Manila" },
          "Technical audit review",
        );
      },
    );
  }
  private async finish(
    db: PoolConnection,
    actor: string,
    requestId: string,
    report: string,
    columns: string[],
    rows: string[][],
    scope: object,
    purpose: string,
  ) {
    const id = randomUUID(),
      generatedAt = new Date().toISOString();
    const buffer = await exportWorkbook(
      report === "scholar_registry" ? "Scholars" : "Audit metadata",
      columns,
      rows,
      {
        "Export ID": id,
        Purpose: purpose,
        "Generated at (UTC)": generatedAt,
        "Requested by (user ID)": actor,
        Scope: JSON.stringify(scope),
        Rows: String(rows.length),
      },
    );
    const hash = createHash("sha256").update(buffer).digest("hex");
    await db.execute(
      "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'data.exported','export',?,'generate',?,'user',UTC_TIMESTAMP(6),?,?,?)",
      [
        randomUUID(),
        id,
        actor,
        requestId,
        purpose,
        JSON.stringify({
          report,
          format: "xlsx",
          scope,
          columns,
          rowCount: rows.length,
          sha256: hash,
          generatedAt,
        }),
      ],
    );
    return { buffer, fileName: `${report}-${id}.xlsx`, id };
  }
}
