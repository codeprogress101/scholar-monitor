import { validationDetails } from "../validation-details.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { scholarFieldsSchema } from "../scholars/validation.js";
import { checkDuplicates, duplicateEvidence } from "../scholars/duplicates.js";
import { ScholarService } from "../scholars/service.js";
import { AcademicService, parseAcademic } from "../academic/service.js";
import { parseWorkbook } from "./workbook.js";
import type {
  ImportPreview,
  ImportPreviewRow,
  ImportResult,
  ImportRow,
} from "./model.js";
const evidence = {
  reason: "Confirmed reviewed Excel import",
  reference: "Excel import",
};
async function validate(
  db: PoolConnection,
  rows: ImportRow[],
): Promise<ImportPreviewRow[]> {
  const preview: ImportPreviewRow[] = [];
  for (const raw of rows) {
    const r: ImportPreviewRow = {
        ...raw,
        errors: [...raw.errors],
        warnings: [],
        references: [],
      },
      c = raw.cells;
    const reference = async (
      table: "academic_years" | "barangays" | "schools" | "courses",
      code: string,
      field: string,
    ) => {
      if (!code) {
        r.errors.push(`${field}: required.`);
        return null;
      }
      const [found] = await db.execute<RowDataPacket[]>(
        `SELECT id,version,archived_at${table === "academic_years" ? ",locked_at" : ""} FROM ${table} WHERE code=? LOCK IN SHARE MODE`,
        [code],
      );
      if (!found.length || found[0].archived_at || found[0].locked_at) {
        r.errors.push(`${field}: use an active, unlocked configuration code.`);
        return null;
      }
      r.references.push({ id: found[0].id, version: found[0].version });
      return found[0].id as string;
    };
    const yearId = await reference(
      "academic_years",
      c.academicYearCode,
      "academicYearCode",
    );
    const barangayId = c.barangayCode
      ? await reference("barangays", c.barangayCode, "barangayCode")
      : null;
    if (c.scholarId) {
      const [found] = await db.execute<RowDataPacket[]>(
        "SELECT s.id,s.version,s.first_name,s.last_name FROM scholar_identifiers i JOIN scholars s ON s.id=i.scholar_id WHERE i.human_id=? LOCK IN SHARE MODE",
        [c.scholarId],
      );
      if (!found.length)
        r.errors.push(
          "scholarId: not found. Leave blank for a new scholar; the system assigns permanent IDs.",
        );
      else {
        r.existingId = found[0].id;
        r.existingVersion = found[0].version;
        r.existingName = `${found[0].last_name}, ${found[0].first_name}`;
      }
      if (
        [
          c.firstName,
          c.middleName,
          c.lastName,
          c.suffix,
          c.birthDate,
          c.barangayCode,
          c.email,
          c.phone,
          c.addressLine,
        ].some(Boolean)
      )
        r.errors.push(
          "For an existing Scholar ID, leave personal/contact fields blank. Use profile editing for corrections.",
        );
      if (
        rows.filter(
          (x) => x.cells.scholarId.toUpperCase() === c.scholarId.toUpperCase(),
        ).length > 1
      )
        r.errors.push("Duplicate Scholar ID in this workbook.");
    } else {
      const parsed = scholarFieldsSchema.safeParse({
        firstName: c.firstName,
        middleName: c.middleName,
        lastName: c.lastName,
        suffix: c.suffix,
        birthDate: c.birthDate || null,
        academicYearId: yearId ?? "00000000-0000-4000-8000-000000000000",
        barangayId,
        contact: { email: c.email, phone: c.phone, addressLine: c.addressLine },
      });
      if (!parsed.success)
        r.errors.push(
          ...parsed.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      else {
        r.fields = parsed.data;
        const matches = await checkDuplicates(db, parsed.data);
        if (matches.total)
          r.warnings.push(
            `Possible existing person: ${matches.candidates.map((m) => `${m.scholarId} (${m.displayName})`).join("; ")}. Resolve in Scholar registry before importing.`,
          );
      }
    }
    const hasAcademic = [c.schoolCode, c.courseCode, c.yearLevel].some(Boolean);
    if (c.scholarId && !hasAcademic)
      r.errors.push("An existing scholar row must add an academic record.");
    if (hasAcademic) {
      const schoolId = await reference("schools", c.schoolCode, "schoolCode"),
        courseId = await reference("courses", c.courseCode, "courseCode");
      try {
        const parsed = parseAcademic({
          academicYearId: yearId,
          schoolId,
          courseId,
          yearLevel: c.yearLevel,
          ...evidence,
        });
        r.academic = {
          academicYearId: parsed.academicYearId,
          schoolId: parsed.schoolId,
          courseId: parsed.courseId,
          yearLevel: parsed.yearLevel,
        };
      } catch {
        r.errors.push(
          "Academic record requires valid year, school, course and year level (1-60 characters).",
        );
      }
      if (r.existingId && yearId) {
        const [existing] = await db.execute<RowDataPacket[]>(
          "SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=? LOCK IN SHARE MODE",
          [r.existingId, yearId],
        );
        if (existing.length)
          r.errors.push(
            "Academic record already exists for this year. Use the controlled academic-change workflow.",
          );
      }
    }
    preview.push(r);
  }
  for (let i = 0; i < preview.length; i++)
    for (let j = i + 1; j < preview.length; j++) {
      const a = preview[i],
        b = preview[j];
      if (a.fields && b.fields && duplicateEvidence(a.fields, b.fields)) {
        a.warnings.push(`Possible duplicate person in row ${b.row}.`);
        b.warnings.push(`Possible duplicate person in row ${a.row}.`);
      }
    }
  return preview;
}
const ready = (rows: ImportPreviewRow[]) =>
  rows.every((r) => !r.errors.length && !r.warnings.length);
export class ImportService {
  constructor(private authorization: AuthorizationService) {}
  async stage(
    actor: string,
    rawKey: unknown,
    body: unknown,
    requestId: string,
  ): Promise<ImportPreview> {
    const key = parseKey(rawKey);
    const parsed = z
      .object({
        fileName: z
          .string()
          .trim()
          .min(1)
          .max(160)
          .regex(/^[^\\/]+\.xlsx$/i)
          .regex(/^\P{Cc}+$/u),
        base64: z
          .string()
          .min(4)
          .max(2796204)
          .regex(/^[A-Za-z0-9+/]+={0,2}$/),
      })
      .strict()
      .safeParse(body);
    if (!parsed.success)
      throw new AuthError(
        422,
        "INVALID_WORKBOOK",
        "Upload the .xlsx template, at most 2 MB.",
      validationDetails(parsed.error),
      );
    // Check authorization before spending work on an untrusted archive.
    await this.authorization.withPermission(
      actor,
      "scholars.create",
      async () => {},
    );
    const buffer = Buffer.from(parsed.data.base64, "base64"),
      fileHash = digest(buffer.toString("base64"));
    const rows = await parseWorkbook(buffer);
    return this.authorization.withPermission(
      actor,
      "scholars.create",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT * FROM import_jobs WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (prior.length) {
          if (
            prior[0].file_hash !== fileHash ||
            prior[0].file_name !== parsed.data.fileName
          )
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This upload key belongs to a different workbook.",
            );
          return this.view(db, actor, prior[0].id);
        }
        const preview = await validate(db, rows),
          hash = digest(JSON.stringify(preview)),
          id = randomUUID();
        await db.execute(
          "INSERT INTO import_jobs(id,actor_id,command_id,file_name,file_hash,raw_rows,preview,preview_hash,created_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            id,
            actor,
            key,
            parsed.data.fileName,
            fileHash,
            JSON.stringify(rows),
            JSON.stringify(preview),
            hash,
          ],
        );
        await this.audit(db, actor, id, "stage", requestId, {
          fileHash,
          rows: rows.length,
          ready: ready(preview),
        });
        return {
          id,
          fileName: parsed.data.fileName,
          hash,
          rows: preview,
          ready: ready(preview),
          result: null,
        };
      },
    );
  }
  private async view(
    db: PoolConnection,
    actor: string,
    id: string,
  ): Promise<ImportPreview> {
    const [jobs] = await db.execute<RowDataPacket[]>(
      "SELECT * FROM import_jobs WHERE id=? AND actor_id=? FOR UPDATE",
      [id, actor],
    );
    if (!jobs.length)
      throw new AuthError(
        404,
        "IMPORT_NOT_FOUND",
        "Import preview not found for your account.",
      );
    const j = jobs[0],
      rows = JSON.parse(j.preview as string) as ImportPreviewRow[];
    const [confirmed] = await db.execute<RowDataPacket[]>(
      "SELECT result FROM import_confirmations WHERE job_id=?",
      [id],
    );
    return {
      id,
      fileName: j.file_name,
      hash: j.preview_hash,
      rows,
      ready: ready(rows),
      result: confirmed.length
        ? (JSON.parse(confirmed[0].result as string) as ImportResult)
        : null,
    };
  }
  async read(actor: string, rawId: unknown) {
    const id = parseId(rawId);
    return this.authorization.withPermission(actor, "scholars.create", (db) =>
      this.view(db, actor, id),
    );
  }
  async confirm(
    actor: string,
    rawId: unknown,
    rawKey: unknown,
    body: unknown,
    requestId: string,
  ): Promise<ImportResult> {
    const id = parseId(rawId),
      key = parseKey(rawKey);
    const input = z
      .object({
        hash: z.string().regex(/^[a-f0-9]{64}$/),
        confirm: z.literal(true),
      })
      .strict()
      .safeParse(body);
    if (!input.success)
      throw new AuthError(
        422,
        "VALIDATION_FAILED",
        "Review the preview and explicitly confirm this import.",
      validationDetails(input.error),
      );
    return this.authorization.withPermission(
      actor,
      "scholars.create",
      async (db, access) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const staged = await this.view(db, actor, id);
        if (input.data.hash !== staged.hash)
          throw new AuthError(
            409,
            "PREVIEW_CHANGED",
            "Reload and review this import preview.",
          );
        const [other] = await db.execute<RowDataPacket[]>(
          "SELECT job_id FROM import_confirmations WHERE actor_id=? AND command_id=?",
          [actor, key],
        );
        if (other.length && other[0].job_id !== id)
          throw new AuthError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "This confirmation key belongs to another import.",
          );
        if (staged.result) return staged.result;
        if (!staged.ready)
          throw new AuthError(
            409,
            "IMPORT_HAS_ERRORS",
            "Correct errors and resolve duplicate warnings, then upload the corrected workbook.",
          );
        const [raw] = await db.execute<RowDataPacket[]>(
          "SELECT raw_rows FROM import_jobs WHERE id=?",
          [id],
        );
        const fresh = await validate(
          db,
          JSON.parse(raw[0].raw_rows as string) as ImportRow[],
        );
        if (!ready(fresh) || digest(JSON.stringify(fresh)) !== staged.hash)
          throw new AuthError(
            409,
            "IMPORT_STALE",
            "Records or configuration changed since preview. Upload again to review current validation.",
          );
        // Reuse the original F04/F05/F08 services on this exact transaction.
        const scoped: Pick<AuthorizationService, "withPermission"> = {
          withPermission: async (user, permission, run) => {
            if (
              user !== actor ||
              !access.permissions.some((p) => p.code === permission)
            )
              throw new AuthError(
                403,
                "PERMISSION_DENIED",
                "Your account cannot perform this import action.",
              );
            return run(db, access);
          },
        };
        const scholars = new ScholarService(scoped),
          academic = new AcademicService(scoped),
          result: ImportResult = { items: [] };
        for (const row of fresh) {
          const person = row.existingId
            ? { id: row.existingId, scholarId: row.cells.scholarId }
            : await scholars.write(
                actor,
                undefined,
                randomUUID(),
                {
                  expectedVersion: 0,
                  reason: evidence.reason,
                  fields: row.fields,
                },
                requestId,
              );
          const record = row.academic
            ? await academic.create(
                actor,
                person.id,
                randomUUID(),
                {
                  ...row.academic,
                  ...evidence,
                  reference: `Import ${id}, row ${row.row}`,
                },
                requestId,
              )
            : null;
          result.items.push({
            row: row.row,
            id: person.id,
            scholarId: person.scholarId,
            ...(record ? { academicRecordId: record.id } : {}),
          });
        }
        await db.execute(
          "INSERT INTO import_confirmations(job_id,actor_id,command_id,result,confirmed_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))",
          [id, actor, key, JSON.stringify(result)],
        );
        await this.audit(db, actor, id, "confirm", requestId, {
          rows: result.items.length,
          previewHash: staged.hash,
        });
        return result;
      },
    );
  }
  private async audit(
    db: PoolConnection,
    actor: string,
    id: string,
    action: string,
    requestId: string,
    details: object,
  ) {
    await db.execute(
      "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'scholars.import','import_job',?, ?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
      [
        randomUUID(),
        id,
        action,
        actor,
        requestId,
        action === "stage"
          ? "Stage Excel workbook for review"
          : evidence.reason,
        JSON.stringify(details),
      ],
    );
  }
}
