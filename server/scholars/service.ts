import {registryYearAssociation} from "./registry-year.js";
import {schoolId as placementSchoolId,courseId as placementCourseId} from "./registry-placement.js";
import { registryEligibility } from "./registry-eligibility.js";
import {intakeColumns,projectedIntake} from "./annual-intake-source.js";
import { placementJoinsForYear, placementJoins, placementColumns, registryPlacement, school, yearLevelSort, classification } from "./registry-placement.js";
import { checkDuplicates } from "./duplicates.js";
import { graduationFor, graduationRecords } from "../status/graduation.js";
import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import {
  parseScholarInput,
  parseScholarQuery,
  parseDuplicateCheck,
} from "./validation.js";
import type {
  ScholarDetail,
  ScholarSummary,
  ScholarResult,
  ScholarFields,
  ScholarList,
} from "./model.js";

const summaryColumns =
  "s.id,s.first_name,s.middle_name,s.last_name,s.suffix,i.human_id,i.entry_year,y.id AS year_id,y.code AS year_code,y.name AS year_name,b.id AS barangay_id,b.name AS barangay_name";
const joins =
  "FROM scholars s JOIN scholar_identifiers i ON i.scholar_id=s.id JOIN academic_years y ON y.id=s.academic_year_id LEFT JOIN barangays b ON b.id=s.barangay_id";
function summary(row: RowDataPacket): ScholarSummary {
  return {
    annualIntake: projectedIntake(row),
    placement: registryPlacement(row),
    id: row.id,
    scholarId: row.human_id,
    displayName: [
      row.last_name + ",",
      row.first_name,
      row.middle_name,
      row.suffix,
    ]
      .filter(Boolean)
      .join(" "),
    entryYear: row.entry_year,
    academicYear: { id: row.year_id, code: row.year_code, name: row.year_name },
    barangay: row.barangay_id
      ? { id: row.barangay_id, name: row.barangay_name }
      : null,
  };
}
export async function detail(
  db: PoolConnection,
  id: string,
  contextYear?: string,
): Promise<ScholarDetail> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT ${summaryColumns},${placementColumns},${intakeColumns},s.version,DATE_FORMAT(s.birth_date,'%Y-%m-%d') AS birth_date,y.archived_at,y.locked_at,c.email,c.phone,c.address_line ${joins} ${placementJoinsForYear(contextYear)} JOIN scholar_contacts c ON c.scholar_id=s.id WHERE s.id=? LOCK IN SHARE MODE`,
    [...(contextYear ? [contextYear] : []), id],
  );
  const row = rows[0];
  if (!row)
    throw new AuthError(
      404,
      "SCHOLAR_NOT_FOUND",
      "The scholar record was not found.",
    );
  return {
    ...summary(row),
    graduation: await graduationFor(db, id),
    version: row.version,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    suffix: row.suffix,
    birthDate: row.birth_date,
    academicYearId: row.year_id,
    barangayId: row.barangay_id,
    contact: {
      email: row.email,
      phone: row.phone,
      addressLine: row.address_line,
    },
    periodUnavailable: Boolean(row.locked_at || row.archived_at),
  };
}
async function period(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT YEAR(starts_on) AS entry_year,archived_at,locked_at FROM academic_years WHERE id=? FOR UPDATE",
    [id],
  );
  const row = rows[0];
  if (!row)
    throw new AuthError(
      422,
      "REFERENCE_NOT_FOUND",
      "Select an existing academic year.",
    );
  if (row.locked_at)
    throw new AuthError(
      409,
      "RECORD_LOCKED",
      "The registration academic year is locked.",
    );
  if (row.archived_at)
    throw new AuthError(
      409,
      "REFERENCE_ARCHIVED",
      "The registration academic year is archived.",
    );
  return row.entry_year as number;
}
async function references(
  db: PoolConnection,
  fields: ScholarFields,
  before: ScholarDetail | null,
) {
  if (before && before.academicYearId !== fields.academicYearId)
    await period(db, before.academicYearId);
  const year = await period(db, fields.academicYearId);
  if (fields.barangayId) {
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT id,archived_at FROM barangays WHERE id=? FOR UPDATE",
      [fields.barangayId],
    );
    if (!rows[0])
      throw new AuthError(
        422,
        "REFERENCE_NOT_FOUND",
        "Select an existing barangay.",
      );
    if (rows[0].archived_at && before?.barangayId !== fields.barangayId)
      throw new AuthError(
        409,
        "REFERENCE_ARCHIVED",
        "Select an active barangay.",
      );
  }
  return year;
}
export class ScholarService {
  constructor(
    private authorization: Pick<AuthorizationService, "withPermission" | "readSnapshot">,
  ) {}
  async eligibility(actor: string, raw: unknown) {
    return this.authorization.readSnapshot(actor, "scholars.read", db => registryEligibility(db, raw));
  }
  async list(actor: string, rawQuery: unknown): Promise<ScholarList> {
    const query = parseScholarQuery(rawQuery);
    return this.authorization.readSnapshot(
      actor,
      "scholars.read",
      async (db) => {
        const graduates = await graduationRecords(db);
        const ids = [...graduates].filter(([, g]) => query.scope === "graduated" || g.archived).map(([id]) => id);
        const scopeFilter = query.scope === "all" ? "" : ids.length ? ` AND s.id ${query.scope === "current" ? "NOT " : ""}IN (${ids.map(() => "?").join(",")})` : query.scope === "graduated" ? " AND 1=0" : "";
        const search =
          "%" + query.q.replace(/[!%_]/g, (value) => "!" + value) + "%";
        const contextYear = query.contextAcademicYearId ?? query.registryYearId ?? query.associatedYearId ?? query.scholarshipYearId;
        const selectedPlacementJoins = placementJoinsForYear(contextYear);
        const association=query.associatedYearId?" AND (s.academic_year_id=? OR EXISTS(SELECT 1 FROM scholar_intakes iy WHERE iy.scholar_id=s.id AND iy.academic_year_id=?) OR EXISTS(SELECT 1 FROM scholarship_records ry WHERE ry.scholar_id=s.id AND ry.academic_year_id=?))":"";
        const where = `(i.human_id LIKE ? ESCAPE '!' OR CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')) LIKE ? ESCAPE '!' OR CONCAT(s.last_name,', ',s.first_name) LIKE ? ESCAPE '!')${query.academicYearId ? " AND s.academic_year_id=?" : ""}${query.scholarshipYearId ? " AND EXISTS(SELECT 1 FROM scholarship_records sy WHERE sy.scholar_id=s.id AND sy.academic_year_id=?)" : ""}${association}${query.registryYearId?registryYearAssociation:""}${query.schoolId?` AND (${placementSchoolId})=?`:""}${query.courseId?` AND (${placementCourseId})=?`:""}${query.classification === "all" ? "" : query.classification === "unknown" ? ` AND (${classification}) IS NULL` : ` AND (${classification})=?`}`;
        const params = [
          ...(contextYear ? [contextYear] : []),
          search,
          search,
          search,
          ...(query.academicYearId ? [query.academicYearId] : []),
          ...(query.scholarshipYearId ? [query.scholarshipYearId] : []),
          ...(query.associatedYearId ? [query.associatedYearId,query.associatedYearId,query.associatedYearId] : []),
          ...(query.registryYearId ? Array(4).fill(query.registryYearId) as string[] : []),
          ...(query.schoolId ? [query.schoolId] : []),...(query.courseId ? [query.courseId] : []),
          ...(["new", "continuing"].includes(query.classification) ? [query.classification] : []),
        ];
        const [count] = await db.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS total ${joins} ${selectedPlacementJoins} WHERE ${where}${scopeFilter}`,
          [...params, ...(query.scope !== "all" ? ids : [])],
        );
        const sort = { name: "s.last_name", scholarId: "i.human_id", school, yearLevel: yearLevelSort, classification }[query.sort];
        const direction = query.direction === "desc" ? "DESC" : "ASC";
        const [rows] = await db.execute<RowDataPacket[]>(
          `SELECT ${summaryColumns},${placementColumns},${intakeColumns} ${joins} ${selectedPlacementJoins} WHERE ${where}${scopeFilter} ORDER BY (${sort} IS NULL) ASC,${sort} ${direction},s.last_name ${direction},s.first_name ${direction},s.id ASC LIMIT ? OFFSET ?`,
          [...params, ...(query.scope !== "all" ? ids : []), query.limit, query.offset],
        );
        return {
          items: rows.map(row => ({ ...summary(row), graduation: graduates.get(row.id) ?? null })),
          total: Number(count[0].total),
          offset: query.offset,
          limit: query.limit,
        };
      },
    );
  }
  async detail(actor: string, rawId: unknown, rawQuery: unknown = {}) {
    const id = parseId(rawId);
    return this.authorization.readSnapshot(actor, "scholars.read", (db) =>
      detail(db, id, parseScholarQuery(rawQuery).contextAcademicYearId),
    );
  }
  async duplicates(actor: string, body: unknown) {
    const { fields } = parseDuplicateCheck(body);
    return this.authorization.readSnapshot(
      actor,
      "scholars.create",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        return checkDuplicates(db, fields);
      },
    );
  }
  async write(
    actor: string,
    rawId: unknown,
    rawKey: unknown,
    body: unknown,
    requestId: string,
  ): Promise<ScholarResult> {
    const create = rawId === undefined,
      id = create ? undefined : parseId(rawId),
      key = parseKey(rawKey),
      input = parseScholarInput(body, create);
    const hash = digest(JSON.stringify({ id: id ?? null, input }));
    return this.authorization.withPermission(
      actor,
      create ? "scholars.create" : "scholars.update",
      async (db) => {
        // Share F03's reference lock so archive/date/lock commands cannot race reference validation.
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT c.payload_hash,c.scholar_id,c.resulting_version,i.human_id FROM scholar_commands c JOIN scholar_identifiers i ON i.scholar_id=c.scholar_id WHERE c.actor_id=? AND c.request_id=?",
          [actor, key],
        );
        if (prior[0]) {
          if (prior[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This request key was already used for different scholar changes.",
            );
          return {
            id: prior[0].scholar_id,
            scholarId: prior[0].human_id,
            version: prior[0].resulting_version,
          };
        }
        let before: ScholarDetail | null = null;
        if (id) {
          const [rows] = await db.execute<RowDataPacket[]>(
            "SELECT version FROM scholars WHERE id=? FOR UPDATE",
            [id],
          );
          if (!rows[0])
            throw new AuthError(
              404,
              "SCHOLAR_NOT_FOUND",
              "The scholar record was not found.",
            );
          if (rows[0].version !== input.expectedVersion)
            throw new AuthError(
              409,
              "VERSION_CONFLICT",
              "This scholar changed. Refresh and review the latest profile before saving.",
            );
          // Use a current locking read for all profile fields after the writer mutex.
          const [current] = await db.execute<RowDataPacket[]>(
            `SELECT ${summaryColumns},${placementColumns},s.version,DATE_FORMAT(s.birth_date,'%Y-%m-%d') AS birth_date,y.archived_at,y.locked_at,c.email,c.phone,c.address_line ${joins} ${placementJoins} JOIN scholar_contacts c ON c.scholar_id=s.id WHERE s.id=? FOR UPDATE`,
            [id],
          );
          const row = current[0];
          before = {
            ...summary(row),
            version: row.version,
            firstName: row.first_name,
            middleName: row.middle_name,
            lastName: row.last_name,
            suffix: row.suffix,
            birthDate: row.birth_date,
            academicYearId: row.year_id,
            barangayId: row.barangay_id,
            contact: {
              email: row.email,
              phone: row.phone,
              addressLine: row.address_line,
            },
            periodUnavailable: Boolean(row.locked_at || row.archived_at),
          };
        }
        const year = await references(db, input.fields, before),
          target = id ?? randomUUID(),
          fields = input.fields;
        const values = [
          fields.firstName,
          fields.middleName,
          fields.lastName,
          fields.suffix,
          fields.birthDate,
          fields.academicYearId,
          fields.barangayId,
        ];
        let duplicateReview = null;
        if (create) {
          const check = await checkDuplicates(db, fields);
          const resolution = input.duplicateResolution;
          if (check.total > 100)
            throw new AuthError(
              409,
              "DUPLICATE_REVIEW_LIMIT",
              "More than 100 possible matches. Check the entered details and contact the Coordinator before creating a record.",
            );
          if (
            (check.total && !resolution) ||
            (resolution && resolution.snapshot !== check.snapshot)
          )
            throw new AuthError(
              409,
              "DUPLICATE_REVIEW_REQUIRED",
              "Possible existing scholars were found or changed. Review the current matches before creating a separate person.",
            );
          if (check.total && resolution)
            duplicateReview = { ...check, ...resolution, algorithm: "f05-v1" };
          const [rows] = await db.execute<RowDataPacket[]>(
            "SELECT last_number FROM scholar_id_sequences WHERE entry_year=? FOR UPDATE",
            [year],
          );
          if (!rows[0])
            await db.execute(
              "INSERT INTO scholar_id_sequences (entry_year,last_number) VALUES (?,0)",
              [year],
            );
          const number = Number(rows[0]?.last_number ?? 0) + 1;
          if (number > 99999)
            throw new AuthError(
              409,
              "SCHOLAR_ID_EXHAUSTED",
              "The Scholar ID sequence for this first-entry year is full.",
            );
          await db.execute(
            "UPDATE scholar_id_sequences SET last_number=? WHERE entry_year=?",
            [number, year],
          );
          await db.execute(
            "INSERT INTO scholars (id,first_name,middle_name,last_name,suffix,birth_date,academic_year_id,barangay_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
            [target, ...values],
          );
          await db.execute(
            "INSERT INTO scholar_identifiers (scholar_id,entry_year,sequence_no) VALUES (?,?,?)",
            [target, year, number],
          );
          await db.execute(
            "INSERT INTO scholar_contacts (scholar_id,email,phone,address_line) VALUES (?,?,?,?)",
            [
              target,
              fields.contact.email,
              fields.contact.phone,
              fields.contact.addressLine,
            ],
          );
        } else {
          await db.execute(
            "UPDATE scholars SET first_name=?,middle_name=?,last_name=?,suffix=?,birth_date=?,academic_year_id=?,barangay_id=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
            [...values, target],
          );
          await db.execute(
            "UPDATE scholar_contacts SET email=?,phone=?,address_line=? WHERE scholar_id=?",
            [
              fields.contact.email,
              fields.contact.phone,
              fields.contact.addressLine,
              target,
            ],
          );
        }
        // Identifier is insert-only; the current year never recalculates it.
        const [identifiers] = await db.execute<RowDataPacket[]>(
          "SELECT human_id FROM scholar_identifiers WHERE scholar_id=?",
          [target],
        );
        const result = {
          id: target,
          scholarId: identifiers[0].human_id as string,
          version: (before?.version ?? 0) + 1,
        };
        await db.execute(
          "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,'scholar.changed','scholar',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            target,
            create ? "create" : "update",
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              before,
              after: { ...fields, ...result },
              idempotency_key: key,
              ...(duplicateReview
                ? { duplicate_resolution: duplicateReview }
                : {}),
            }),
          ],
        );
        await db.execute(
          "INSERT INTO scholar_commands (actor_id,request_id,payload_hash,scholar_id,resulting_version) VALUES (?,?,?,?,?)",
          [actor, key, hash, target, result.version],
        );
        return result;
      },
    );
  }
}
