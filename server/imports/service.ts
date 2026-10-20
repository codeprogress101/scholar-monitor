import {resolvePlacementReferences} from "../academic/references.js";
import { receiptPreview } from "./receipt-preview.js";
import { createCoursePending } from "../academic/course-pending.js";
import { scopeRows, receivingScopes, participation, available, provisionSemesterRecords } from "../continuing/semester-receiving.js";
import { OFFICIAL_COHORT } from "../continuing/official-cohort.js";
import { pinnedSemesterDefinitions } from "../requirements/semester-policy.js";
import { semesterRequirementContext } from "../requirements/semester-context.js";
import { RequirementReceiptService } from "../requirements/receipt-service.js";
import { parseReceipt } from "../requirements/receipt-validation.js";
import { workingYear } from "../configuration/calendar.js";
import { QualificationService } from "../qualification/service.js";
import { ContinuingService } from "../continuing/service.js";
import { today } from "../scholars/validation.js";
import { normalizeReference, normalizeYearLevel, normalizeIntakeStatus } from "./normalization.js";
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
import { MAX_IMPORT_ROWS } from "./model.js";
import { encodeImportRows, decodeImportRows } from "./storage.js";
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
      const mapping = raw.mappings?.find(m => m.kind === table && normalizeReference(m.supplied) === normalizeReference(code));
      const simpleReference = raw.format === "simple" && (table === "schools" || table === "courses");
      const [all] = await db.execute<RowDataPacket[]>(
        `SELECT id,code,name,version,archived_at${table === "academic_years" ? ",locked_at" : ""} FROM ${table} ${simpleReference ? "" : "WHERE code=?"} LOCK IN SHARE MODE`,
        simpleReference ? [] : [code],
      );
      const found = simpleReference ? all.filter(x => mapping ? x.id === mapping.id : [x.code, x.name].some(v => normalizeReference(v) === normalizeReference(code))) : all;
      if (found.length > 1) { r.errors.push(`${field}: ambiguous name. Choose the matching reference.`); return null; }
      if (!found.length && simpleReference && !mapping && code.trim().length >= 2 && code.trim().length <= 160 && /^\P{Cc}*$/u.test(code)) {
        r.notices = [...(r.notices ?? []), `${field}: ${code.trim()} will be saved with the scholar details.`];
        return "";
      }
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
    const hasAcademic = raw.format === "simple" || [c.schoolCode, c.courseCode, c.yearLevel].some(Boolean);
    if (c.scholarId && !hasAcademic)
      r.errors.push("An existing scholar row must add an academic record.");
    if (hasAcademic) {
      const schoolId = await reference("schools", c.schoolCode, "schoolCode"),
        courseId = raw.format === "simple" && !c.courseCode ? null : await reference("courses", c.courseCode, "courseCode");
      if (raw.format === "simple") {
        const status = normalizeIntakeStatus(raw.status ?? "");
        if (!["new", "old", "continuing"].includes(status)) r.errors.push("Status: choose New, Continuing or Old.");
        if (!c.yearLevel || c.yearLevel.length > 60 || !/^\P{Cc}*$/u.test(c.yearLevel)) r.errors.push("Year Level: required, up to 60 characters, without control characters.");
        if (!c.courseCode) r.notices = [...(r.notices ?? []), "Course not recorded — complete later."];
        if (schoolId !== null && yearId && ["new", "old", "continuing"].includes(status)) r.intake = { ...(schoolId === "" ? {schoolName:c.schoolCode}:{}), ...(courseId === "" ? {courseName:c.courseCode}:{}), academicYearId: yearId, schoolId, courseId, yearLevel: normalizeYearLevel(c.yearLevel), classification: status === "new" ? "new" : "continuing" };
      }
      if (raw.format !== "simple" || c.courseCode) try {
        const parsed = parseAcademic({
          academicYearId: yearId,
          schoolId,
          courseId,
          ...(schoolId === "" ? {schoolName:c.schoolCode}:{}),
          ...(courseId === "" ? {courseName:c.courseCode}:{}),
          yearLevel: normalizeYearLevel(c.yearLevel),
          ...evidence,
        });
        r.academic = {
          ...(parsed.schoolName ? {schoolName:parsed.schoolName}:{}),
          ...(parsed.courseName ? {courseName:parsed.courseName}:{}),
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
    if (raw.approvedSelection && raw.format === "simple" && !c.courseCode && r.intake) r.coursePending = true;
    if (raw.approvedSelection && ((!r.academic && !r.coursePending) || !r.intake || raw.format !== "simple"))
      r.errors.push("Already-approved import requires the eight-column template and complete academic details, including course.");
    if (raw.receipts) {
      try {
        let scopes=await scopeRows(db,OFFICIAL_COHORT);
        if(r.existingId) {
          try { const member=await participation(db,r.existingId); scopes=await receivingScopes(db,r.existingId,member.batch_id); }
          catch(e) { if(!(e instanceof AuthError && e.code === "ACCEPTED_BASELINE_REQUIRED")) throw e; }
        }
        const scope=scopes.find(s=>s.semester_id===raw.receipts!.periodId);
        if(!scope || !available(scope) || scope.academic_year_id!==yearId) throw new AuthError(409,"SEMESTER_WORKFLOW_UNAVAILABLE","Enable approved semester documents for this scholar's working year before importing receipts.");
        const definitions=await pinnedSemesterDefinitions(db,scope.semester_id,scope.rules,scope.starts,scope.ends);
        const rules=typeof scope.rules === "string" ? JSON.parse(scope.rules) : scope.rules;
        const [[previous]]=await db.execute<RowDataPacket[]>("SELECT name FROM semesters WHERE id=?",[rules.predecessorSemesterId]);
        let cogExempt = false;
        if (r.existingId) {
          const [papers] = await db.execute<RowDataPacket[]>("SELECT i.id,c.scholar_semester_id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id JOIN scholar_semesters ss ON ss.id=c.scholar_semester_id JOIN requirement_coverage cov ON cov.requirement_instance_id=i.id WHERE ss.scholar_id=? AND ss.semester_id=? AND cov.document_kind='cog' ORDER BY cov.revision DESC LIMIT 1 LOCK IN SHARE MODE", [r.existingId,scope.semester_id]);
          if (papers[0]) cogExempt = (await semesterRequirementContext(db,papers[0].id,papers[0].scholar_semester_id))?.entrantCard?.mode === "initial_requirements";
        }
        r.receiptContext={sourceHash:digest(JSON.stringify({scope,definitions,cogExempt})),cor:scope.name,cog:previous?.name ?? "Coverage needs review",cogExempt};
      } catch(e) { if(!(e instanceof AuthError)) throw e; r.receiptIssue={code:e.code,message:e.message};r.errors.push(`Document receipts: ${e.message}`); }
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
async function unresolved(db: PoolConnection, rows: ImportPreviewRow[]): Promise<NonNullable<ImportPreview["unresolved"]>> {
 const result: NonNullable<ImportPreview["unresolved"]> = [];
 for (const [kind, field] of [["schools", "schoolCode"], ["courses", "courseCode"]] as const) {
  const names = new Set(rows.filter(r => r.format === "simple" && r.errors.some(e => e.startsWith(`${field}:`))).map(r => r.cells[field]).filter(Boolean));
  if (!names.size) continue;
  const [choices] = await db.query<RowDataPacket[]>(`SELECT id,code,name FROM ${kind} WHERE archived_at IS NULL ORDER BY name,id`);
  for (const supplied of names) if (!result.some(r => r.kind === kind && normalizeReference(r.supplied) === normalizeReference(supplied))) result.push({ kind, supplied, choices: choices.map(c => ({ id: c.id, code: c.code, name: c.name })) });
 }
 return result;
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
        receipts: z.object({periodId:z.uuid(),cor:z.boolean(),cog:z.boolean(),receivedOn:z.iso.date().refine(d=>d>="1900-01-01"&&d<=today()).optional()}).strict().refine(v=>v.cor||v.cog).optional(),
        approvedSelection: z.object({ reference: z.string().trim().min(3).max(200).regex(/^\P{Cc}+$/u), effectiveOn: z.iso.date().refine(d => d >= "1900-01-01" && d <= today(), "Use a valid non-future approval date.") }).strict().optional(),
        mappings: z.array(z.object({ kind: z.enum(["schools", "courses"]), supplied: z.string().trim().min(1).max(1000), id: z.uuid() }).strict()).max(MAX_IMPORT_ROWS * 2).default([]),
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
      fileHash = digest(JSON.stringify({ base64: buffer.toString("base64"), mappings: parsed.data.mappings, ...(parsed.data.receipts ? {receipts:parsed.data.receipts}:{}), ...(parsed.data.approvedSelection ? { approvedSelection: parsed.data.approvedSelection } : {}) }));
    const rows = await parseWorkbook(buffer);
    return this.authorization.withPermission(
      actor,
      "scholars.create",
      async (db, access) => {
        if(parsed.data.receipts && (!parsed.data.approvedSelection || !["requirements.receive","requirements.generate"].every(c=>access.permissions.some(p=>p.code===c)))) throw new AuthError(403,"PERMISSION_DENIED","Import receipts require an already-approved list and receiving/preparation permissions.");
        if (parsed.data.approvedSelection && !["scholarship.status.approve", "continuing.approve"].every(code => access.permissions.some(p => p.code === code)))
          throw new AuthError(403, "PERMISSION_DENIED", "A Coordinator must import an already-approved scholar list.");
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
        if (rows.some(r => r.format === "simple")) {
          const working = await workingYear(db);
          if (!working) throw new AuthError(409, "WORKING_YEAR_REQUIRED", "Set the working academic year before importing scholars.");
          const [years] = await db.execute<RowDataPacket[]>("SELECT code FROM academic_years WHERE id=?", [working.yearId]);
          for (const row of rows) { row.working = { ...working, code: years[0].code }; row.cells.academicYearCode = years[0].code; row.mappings = parsed.data.mappings; }
        }
        if (parsed.data.approvedSelection) for (const row of rows) row.approvedSelection = parsed.data.approvedSelection;
        if (parsed.data.receipts) for (const row of rows) row.receipts=parsed.data.receipts;
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
            encodeImportRows(rows),
            encodeImportRows(preview),
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
          ...receiptPreview(preview),
          ready: ready(preview),
          result: null,
          workingYear: rows[0].working?.code,
          unresolved: await unresolved(db, preview),
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
      rows = decodeImportRows<ImportPreviewRow>(j.preview as string);
    const [confirmed] = await db.execute<RowDataPacket[]>(
      "SELECT result FROM import_confirmations WHERE job_id=?",
      [id],
    );
    return {
      id,
      fileName: j.file_name,
      hash: j.preview_hash,
      rows,
      ...receiptPreview(rows),
      ready: ready(rows),
      workingYear: rows[0].working?.code,
      unresolved: await unresolved(db, rows),
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
        coursePendingConfirmed:z.literal(true).optional(),
        receiptsConfirmed:z.literal(true).optional(),
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
        const approved = staged.rows[0]?.approvedSelection;
        if (approved && !["scholarship.status.approve", "continuing.approve"].every(code => access.permissions.some(p => p.code === code)))
          throw new AuthError(403, "PERMISSION_DENIED", "A Coordinator must confirm an already-approved scholar list.");
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
        if(staged.rows.some(r=>r.coursePending) && !input.data.coursePendingConfirmed) throw new AuthError(422,"COURSE_PENDING_CONFIRMATION_REQUIRED","Confirm the listed missing-course exceptions before importing.");
        if(staged.rows[0]?.receipts && (!input.data.receiptsConfirmed || !["requirements.receive","requirements.generate"].every(c=>access.permissions.some(p=>p.code===c)))) throw new AuthError(422,"RECEIPT_CONFIRMATION_REQUIRED","Confirm physical receipt for every applicable scholar and retain receiving/preparation permissions.");
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
        if (staged.rows[0].working) {
          const working = await workingYear(db), before = staged.rows[0].working;
          if (!working || working.id !== before.id || working.version !== before.version || working.yearId !== before.yearId) throw new AuthError(409, "IMPORT_STALE", "Working academic year changed. Upload again to review the new year.");
        }
        const fresh = await validate(
          db,
          decodeImportRows<ImportRow>(raw[0].raw_rows as string),
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
        const scholars = new ScholarService({...scoped, readSnapshot: (user,permission,run) => scoped.withPermission(user,permission ?? "scholars.read",run)}),
          academic = new AcademicService(scoped),
          qualification = new QualificationService(scoped, approved ? id : undefined),
          result: ImportResult = { items: [] };
        const continuing: { scholarId: string; version: number; sourceRow: number; originalName: string }[] = [];
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
          let record = row.academic
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
          if (row.intake) {
            const intake = row.intake;
            const resolved = await resolvePlacementReferences(db,{...intake,courseId:intake.courseId ?? ""},actor,requestId);
            intake.schoolId=resolved.schoolId; intake.courseId=resolved.courseId || null;
            await db.execute("INSERT INTO scholar_intakes(id,scholar_id,academic_year_id,school_id,course_id,year_level,classification,supplied_details,import_job_id,source_row,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [randomUUID(), person.id, intake.academicYearId, intake.schoolId, intake.courseId, intake.yearLevel, intake.classification, JSON.stringify(row.cells), id, row.row, actor]);
            if(row.coursePending && approved) {
              record=await createCoursePending(db,actor,requestId,{scholarId:person.id,academicYearId:intake.academicYearId,schoolId:intake.schoolId,yearLevel:intake.yearLevel,importId:id,sourceRow:row.row,reference:approved.reference,effectiveOn:approved.effectiveOn});
              result.coursePendingCount=(result.coursePendingCount??0)+1;
            }
            if (approved) {
              const selectionEvidence = { effectiveOn: approved.effectiveOn, reference: approved.reference, reason: `Already approved for working year; import ${id}, row ${row.row}` };
              const annual = await qualification.command(actor, person.id, "create", randomUUID(), { expectedVersion: 0, academicYearId: intake.academicYearId, ...selectionEvidence }, requestId);
              const qualified = await qualification.command(actor, annual.id, "validate", randomUUID(), { expectedVersion: annual.version, priorQualificationConfirmed: true, ...selectionEvidence }, requestId);
              await qualification.command(actor, annual.id, "select", randomUUID(), { expectedVersion: qualified.version, ...selectionEvidence }, requestId);
              result.selectedCount = (result.selectedCount ?? 0) + 1;
            } else if (intake.classification === "new") await qualification.command(actor, person.id, "create", randomUUID(), { expectedVersion: 0, academicYearId: intake.academicYearId, effectiveOn: today(), ...evidence }, requestId);
            if (intake.classification === "continuing") continuing.push({ scholarId: person.id, version: 1, sourceRow: row.row, originalName: `${row.cells.lastName}, ${row.cells.firstName}` });
          }
          result.items.push({
            row: row.row,
            id: person.id,
            scholarId: person.scholarId,
            ...(record ? { academicRecordId: record.id } : {}),
          });
        }
        if (continuing.length) {
          const roster = await new ContinuingService(undefined, scoped).command(actor, null, randomUUID(), { sourceReference: `Import ${id}: ${staged.fileName}`, entries: continuing }, requestId);
          result.continuingRosterId = roster.id;
          if (approved) {
            const [actors] = await db.execute<RowDataPacket[]>("SELECT full_name FROM users WHERE id=?", [actor]);
            await new ContinuingService(undefined, scoped).command(actor, roster.id, randomUUID(), { expectedRevision: 0, decision: "accepted", effectiveOn: approved.effectiveOn, issuer: actors[0].full_name, reference: approved.reference, reviewed: true, reason: `Already-approved scholar import ${id}` }, requestId);
          }
        }
        const receipts=fresh[0]?.receipts;
        if(receipts) {
          // Roster acceptance, provisioning and receipt events share this transaction.
          const receiver=new RequirementReceiptService(scoped as AuthorizationService);
          const routineDay=receipts.receivedOn ?? today();
          for(const person of result.items) {
            const prepared=await provisionSemesterRecords(db,access,actor,person.id,randomUUID(),{periodId:receipts.periodId},requestId);
            const [instances]=await db.execute<RowDataPacket[]>("SELECT i.id,i.status,c.scholar_semester_id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id WHERE i.checklist_id=? FOR UPDATE",[prepared.id]);
            for(const instance of instances) {
              const context=await semesterRequirementContext(db,instance.id,instance.scholar_semester_id);
              if(!context || !(context.documentKind==='cor'?receipts.cor:receipts.cog) || context.entrantCard?.mode==='initial_requirements') continue;
              if(instance.status!=='not_submitted') throw new AuthError(409,"IMPORT_RECEIPT_EXISTS",`Row ${person.row}: document already has evidence; use its existing receiving workflow.`);
              await receiver.record(db,actor,instance.id,parseReceipt({expectedVersion:0,receivedOn:routineDay,physicalReference:`Import ${id}, row ${person.row}`,storageLocation:null,remarks:null,...(context.entrantCard?{entrantCardId:context.entrantCard.id,documentType:'shs_grading_card'}:{})}),requestId,key);
              result.receivedCount=(result.receivedCount??0)+1;
            }
          }
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
