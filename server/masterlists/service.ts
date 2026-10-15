import { workingYear } from "../configuration/calendar.js";
import { randomUUID } from "node:crypto";
import { additionPreview } from "./additions.js";
import { consolidationSource, consolidationIssues, publicationSource } from "./consolidation.js";
import { lineage } from "./revisions.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { academicCurrent } from "../academic/changes-service.js";
import { graduationFor } from "../status/graduation.js";
import { continuingAdmission, prepareContinuingAnnual, rolloverAdmission } from "./continuing-admission.js";
import { parseDraft, parseEntry, parsePage } from "./validation.js";
import type {
  DraftCandidate,
  DraftDetail,
  DraftEntry,
  DraftIssue,
  DraftValidation,
  Masterlist,
} from "./model.js";
const fail = (code: string, message: string): never => {
  throw new AuthError(409, code, message);
};
const guard = (db: PoolConnection) =>
  db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
const decode = <T>(s: string | T): T =>
  typeof s === "string" ? (JSON.parse(s) as T) : s;
export class DraftValidationError extends AuthError {
  constructor(public issues: DraftIssue[]) {
    super(422, "CANDIDATE_INVALID", issues.map((i) => i.message).join(" "));
  }
}
async function candidate(
  db: PoolConnection,
  id: string,
  year: string,
): Promise<DraftCandidate> {
  const issues: DraftIssue[] = [];
  const issue = (code: string, message: string) =>
    issues.push({ scholarId: id, code, message });
  const [people] = await db.execute<RowDataPacket[]>(
    "SELECT s.*,i.human_id FROM scholars s LEFT JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE s.id=? FOR UPDATE",
    [id],
  );
  const person = people[0];
  if (!person)
    return {
      scholarId: id,
      humanId: null,
      name: "Unknown scholar",
      snapshot: null,
      issues: [
        {
          scholarId: id,
          code: "SCHOLAR_NOT_FOUND",
          message: "Scholar does not exist.",
        },
      ],
    };
  const name = [
    person.last_name,
    person.first_name,
    person.middle_name,
    person.suffix,
  ]
    .filter(Boolean)
    .join(" ");
  const graduation = await graduationFor(db, id);
  if (graduation)
    issue("PRIOR_GRADUATE", "Graduated scholar. Keep the historical record; do not add to a new masterlist. Any approved final stipend remains on its existing payroll.");
  if (!/^LDSS-\d{4}-\d{5}$/.test(person.human_id ?? ""))
    issue("SCHOLAR_ID_REQUIRED", "A valid permanent Scholar ID is required.");
  const [annual] = await db.execute<RowDataPacket[]>(
    "SELECT id,status,version,continuing_participation_id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=? FOR UPDATE",
    [id, year],
  );
  const baseline = await continuingAdmission(db, id);
  const rollover = await rolloverAdmission(db, id, year);
  if (!annual.length && !baseline)
    issue(
      "SCHOLARSHIP_RECORD_REQUIRED",
      "A scholarship record for the draft academic year is required.",
    );
  else if (annual.length && annual[0].status !== "selected" && !(annual[0].status === "continuing" && (baseline?.id === annual[0].continuing_participation_id || rollover)))
    issue(
      "SELECTION_REQUIRED",
      "Scholar must be Selected for the draft academic year.",
    );
  const [academic] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=? FOR UPDATE",
    [id, year],
  );
  const current = academic.length
    ? await academicCurrent(db, academic[0].id)
    : null;
  if (
    !current ||
    !current.placement.schoolId ||
    !current.placement.courseId ||
    !current.placement.yearLevel.trim()
  )
    issue(
      "ACADEMIC_RECORD_REQUIRED",
      "Complete school, course and year level for the draft academic year are required.",
    );
  return {
    scholarId: id,
    humanId: person.human_id,
    name,
    issues,
    snapshot: issues.length
      ? null
      : {
          scholarId: id,
          humanId: person.human_id,
          name,
          personVersion: person.version,
          scholarshipId: annual[0]?.id ?? baseline!.id,
          scholarshipVersion: annual[0]?.version ?? 0,
          ...(baseline && (!annual.length || annual[0].status === "continuing") ? { continuingAdmission: { participationId: baseline.id as string, eventId: baseline.event_id as string } } : {}),
          ...(rollover ? { continuingRollover: rollover } : {}),
          academicRecordId: academic[0].id,
          academicVersion: current!.version,
          placement: current!.placement,
        },
  };
}
export async function header(db: PoolConnection, id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT m.*,y.code AS year_code,y.locked_at,y.archived_at FROM masterlist_versions m JOIN academic_years y ON y.id=m.academic_year_id WHERE m.id=? FOR UPDATE",
    [id],
  );
  if (!rows.length)
    throw new AuthError(
      404,
      "MASTERLIST_NOT_FOUND",
      "Masterlist draft not found.",
    );
  return rows[0];
}
function usable(row: RowDataPacket) {
  if (row.status !== "draft" || row.locked_at)
    throw new AuthError(
      423,
      "RECORD_LOCKED",
      "Only drafts in unlocked academic years can be edited.",
    );
  if (row.archived_at)
    fail("REFERENCE_ARCHIVED", "The academic year is archived.");
}
export async function entries(
  db: PoolConnection,
  id: string,
): Promise<DraftEntry[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT id,scholar_id,snapshot,award_number FROM masterlist_entries WHERE masterlist_id=? AND removed_at IS NULL ORDER BY created_at,id FOR UPDATE",
    [id],
  );
  return rows.map((r) => ({
    id: r.id,
    scholarId: r.scholar_id,
    awardNumber: r.award_number,
    snapshot: decode(r.snapshot),
  }));
}
const summary = (row: RowDataPacket, count: number): Masterlist => ({
  id: row.id,
  academicYearId: row.academic_year_id,
  yearCode: row.year_code,
  title: row.title,
  status: row.status,
  version: row.version,
  count,
  unavailable: Boolean(
    row.locked_at || row.archived_at || row.status !== "draft",
  ),
});
export async function validate(
  db: PoolConnection,
  row: RowDataPacket,
  items: DraftEntry[],
): Promise<DraftValidation> {
  const issues: DraftIssue[] = [];
  if (row.locked_at || row.archived_at)
    issues.push({
      scholarId: null,
      code: "PERIOD_UNAVAILABLE",
      message: "Academic year is locked or archived.",
    });
  if (!items.length)
    issues.push({
      scholarId: null,
      code: "EMPTY_DRAFT",
      message: "Add at least one eligible candidate.",
    });
  const consolidation = await consolidationSource(db,row.id);
  if(consolidation) {
    issues.push(...await consolidationIssues(db,row,items));
    issues.push(...(await additionPreview(db,row,items)).issues);
    return {version:row.version,count:items.length,valid:issues.length===0,issues};
  }
  for (const entry of items) {
    const source = await candidate(db, entry.scholarId, row.academic_year_id);
    issues.push(...source.issues);
    if (
      source.snapshot &&
      JSON.stringify(source.snapshot) !== JSON.stringify(entry.snapshot)
    )
      issues.push({
        scholarId: entry.scholarId,
        code: "SOURCE_CHANGED",
        message:
          "Source record changed. Review and refresh this candidate snapshot.",
      });
  }
  issues.push(...(await additionPreview(db,row,items)).issues);
  return {
    version: row.version,
    count: items.length,
    valid: issues.length === 0,
    issues,
  };
}
export class MasterlistService {
  constructor(private authorization: AuthorizationService) {}
  async list(actor: string, query: unknown) {
    const page = parsePage(query);
    return this.authorization.withPermission(
      actor,
      "masterlists.prepare",
      async (db) => {
        const filter = `%${page.q.replace(/[!%_]/g, "!$&")}%`;
        const calendar = await workingYear(db);
        const current = `NOT EXISTS(SELECT 1 FROM masterlist_revisions r WHERE r.parent_id=m.id)
          AND NOT EXISTS(SELECT 1 FROM masterlist_consolidation_links l WHERE l.source_id=m.id)
          AND y.archived_at IS NULL AND y.locked_at IS NULL
          ${calendar ? "AND m.academic_year_id=?" : ""}`;
        const scope = page.scope === "all" ? "" : ` AND ${page.scope === "history" ? "NOT" : ""} (${current})`;
        const params = [filter, ...(page.scope !== "all" && calendar ? [calendar.yearId] : [])];
        const from = `FROM masterlist_versions m JOIN academic_years y ON y.id=m.academic_year_id WHERE m.title LIKE ? ESCAPE '!'${scope}`;
        const [rows] = await db.execute<RowDataPacket[]>(
          `SELECT m.*,y.code AS year_code,y.locked_at,y.archived_at,(SELECT COUNT(*) FROM masterlist_entries e WHERE e.masterlist_id=m.id AND e.removed_at IS NULL) AS entry_count ${from} ORDER BY ${page.scope === "current" ? "(m.status IN ('published','locked')) DESC," : ""} m.created_at DESC,m.id LIMIT ? OFFSET ?`,
          [...params, page.limit, page.offset],
        );
        const [counts] = await db.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS n ${from}`, params,
        );
        return {
          items: await Promise.all(rows.map(async (r) => {
            const chain=await lineage(db,r.id);
            const [kind]=await db.execute<RowDataPacket[]>("SELECT kind FROM masterlist_revisions WHERE masterlist_id=?",[r.id]);
            return {...summary(r,Number(r.entry_count)),latestId:chain.latestId,revisionKind:kind[0]?.kind??(["published","locked"].includes(r.status)?"original":"draft")};
          })),
          total: Number(counts[0].n),
          offset: page.offset,
          limit: page.limit,
        };
      },
    );
  }
  async detail(actor: string, rawId: unknown): Promise<DraftDetail> {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "masterlists.prepare",
      async (db) => {
        await guard(db);
        const row = await header(db, id),
          items = await entries(db, id);
        return {
          ...summary(row, items.length),
          unavailable:Boolean(row.locked_at || row.archived_at || row.status!=="draft" || await consolidationSource(db,id)),
          latestId:(await lineage(db,id)).latestId,
          proposalKind:await consolidationSource(db,id)?"consolidation":(await additionPreview(db,row,items)).targetId?"addition":"standalone",
          entries: items,
          validation: await validate(db, row, items),
        };
      },
    );
  }
  async candidates(actor: string, rawId: unknown, query: unknown) {
    const id = parseId(rawId),
      page = parsePage(query);
    return this.authorization.withPermission(
      actor,
      "masterlists.prepare",
      async (db) => {
        await guard(db);
        const row = await header(db, id),
          filter = `%${page.q.replace(/[!%_]/g, "!$&")}%`;
        const from =
          "FROM scholars s LEFT JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE CONCAT_WS(' ',i.human_id,s.first_name,s.middle_name,s.last_name) LIKE ? ESCAPE '!'";
        const [rows] = await db.execute<RowDataPacket[]>(
          `SELECT s.id ${from} ORDER BY s.last_name,s.first_name,s.id LIMIT ? OFFSET ? FOR UPDATE`,
          [filter, page.limit, page.offset],
        );
        const [counts] = await db.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS n ${from}`,
          [filter],
        );
        const items: DraftCandidate[] = [];
        for (const r of rows)
          items.push(await candidate(db, r.id, row.academic_year_id));
        return {
          items,
          total: Number(counts[0].n),
          offset: page.offset,
          limit: page.limit,
        };
      },
    );
  }
  async command(
    actor: string,
    rawId: unknown,
    rawKey: unknown,
    body: unknown,
    requestId: string,
  ) {
    const id = rawId === undefined ? null : parseId(rawId),
      key = parseKey(rawKey);
    const input = id ? parseEntry(body) : parseDraft(body),
      hash = digest(JSON.stringify({ id, input }));
    return this.authorization.withPermission(
      actor,
      "masterlists.prepare",
      async (db) => {
        await guard(db);
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,masterlist_id,resulting_version FROM masterlist_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            fail(
              "IDEMPOTENCY_CONFLICT",
              "Request key already used for another command.",
            );
          return {
            id: prior[0].masterlist_id as string,
            version: prior[0].resulting_version as number,
          };
        }
        let target = id ?? randomUUID(),
          version = 1,
          action = "create";
        let details: object;
        if ("academicYearId" in input) {
          const [years] = await db.execute<RowDataPacket[]>(
            "SELECT locked_at,archived_at FROM academic_years WHERE id=? FOR UPDATE",
            [input.academicYearId],
          );
          if (!years.length)
            throw new AuthError(
              422,
              "REFERENCE_NOT_FOUND",
              "Select an existing academic year.",
            );
          usable({ ...years[0], status: "draft" } as RowDataPacket);
          if(input.targetId) {
            const parent=await publicationSource(db,input.targetId);
            if(parent.academic_year_id!==input.academicYearId || parent.version!==input.targetVersion || (await lineage(db,input.targetId)).latestId!==input.targetId) fail("INVALID_ADDITION_TARGET","Select the latest same-year official revision and refresh its version.");
          }
          const source=input.sourceId?await publicationSource(db,input.sourceId):null;
          if(source && (input.sourceId===input.targetId || source.academic_year_id!==input.academicYearId || source.version!==input.sourceVersion || (await lineage(db,input.sourceId!)).latestId!==input.sourceId)) fail("INVALID_CONSOLIDATION_SOURCE","Select a different latest publication in the same academic year.");
          await db.execute(
            "INSERT INTO masterlist_versions (id,academic_year_id,title,status,version,actor_id,created_at,updated_at) VALUES (?,?,?,'draft',1,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
            [target, input.academicYearId, input.title, actor],
          );
          if(input.targetId) await db.execute("INSERT INTO masterlist_addition_events(id,draft_id,resulting_version,target_id,action,actor_id,reason,reference_text,recorded_at) VALUES(?,?,1,?,'attach',?,?,?,UTC_TIMESTAMP(6))",[randomUUID(),target,input.targetId,actor,input.reason,input.reference]);
          if(source) {
            const parent=await publicationSource(db,input.targetId!);
            await db.execute("INSERT INTO masterlist_consolidations(draft_id,source_id,source_version,source_hash,target_version,target_hash) VALUES(?,?,?,?,?,?)",[target,input.sourceId!,input.sourceVersion!,source.snapshot_hash,input.targetVersion!,parent.snapshot_hash]);
            for(const entry of source.snapshot.entries)await db.execute("INSERT INTO masterlist_entries(id,masterlist_id,scholar_id,snapshot,award_number,created_at,updated_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),target,entry.scholarId,JSON.stringify(entry.snapshot),entry.awardNumber]);
          }
          details = { after: input };
        } else {
          target = id!;
          const row = await header(db, target);
          usable(row);
          if(await consolidationSource(db,target))fail("FROZEN_CONSOLIDATION","Consolidation preserves the frozen source membership. Create a new proposal to change its sources.");
          if (row.version !== input.expectedVersion)
            fail("VERSION_CONFLICT", "Draft changed. Refresh before editing.");
          const [existing] = await db.execute<RowDataPacket[]>(
            "SELECT * FROM masterlist_entries WHERE masterlist_id=? AND scholar_id=? FOR UPDATE",
            [target, input.scholarId],
          );
          const old = existing[0],
            active = old && !old.removed_at;
          action = input.action;
          if (action === "add" && active)
            fail("DUPLICATE_ENTRY", "Scholar is already in this draft.");
          if (action !== "add" && !active)
            fail(
              "ENTRY_NOT_FOUND",
              "Candidate is not currently in this draft.",
            );
          let after: object | null = null;
          if (action === "remove")
            await db.execute(
              "UPDATE masterlist_entries SET removed_at=UTC_TIMESTAMP(6),award_number=NULL,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
              [old.id],
            );
          else {
            await prepareContinuingAnnual(db, input.scholarId, row.academic_year_id, actor, requestId);
            const source = await candidate(
              db,
              input.scholarId,
              row.academic_year_id,
            );
            if (source.issues.length)
              throw new DraftValidationError(source.issues);
            if (input.awardNumber === source.humanId)
              throw new DraftValidationError([
                {
                  scholarId: input.scholarId,
                  code: "AWARD_NUMBER_IS_SCHOLAR_ID",
                  message:
                    "Award number is separate from the permanent Scholar ID.",
                },
              ]);
            if (input.awardNumber) {
              const [duplicates] = await db.execute<RowDataPacket[]>(
                "SELECT id FROM masterlist_entries WHERE masterlist_id=? AND award_number=? AND scholar_id<>? FOR UPDATE",
                [target, input.awardNumber, input.scholarId],
              );
              if (duplicates.length)
                fail(
                  "DUPLICATE_AWARD_NUMBER",
                  "Award number is already used in this draft.",
                );
            }
            after = {
              snapshot: source.snapshot,
              awardNumber: input.awardNumber,
            };
            if (old)
              await db.execute(
                "UPDATE masterlist_entries SET snapshot=?,award_number=?,removed_at=NULL,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
                [JSON.stringify(source.snapshot), input.awardNumber, old.id],
              );
            else
              await db.execute(
                "INSERT INTO masterlist_entries (id,masterlist_id,scholar_id,snapshot,award_number,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
                [
                  randomUUID(),
                  target,
                  input.scholarId,
                  JSON.stringify(source.snapshot),
                  input.awardNumber,
                ],
              );
          }
          version = row.version + 1;
          await db.execute(
            "UPDATE masterlist_versions SET version=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
            [version, target],
          );
          details = {
            scholarId: input.scholarId,
            before: old
              ? {
                  snapshot: decode(old.snapshot),
                  awardNumber: old.award_number,
                  removed: Boolean(old.removed_at),
                }
              : null,
            after,
            reference: input.reference,
          };
        }
        await db.execute(
          "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,?, 'masterlist',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            `masterlist.${action}`,
            target,
            action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({ ...details, version, idempotency_key: key }),
          ],
        );
        await db.execute(
          "INSERT INTO masterlist_commands (actor_id,command_id,payload_hash,masterlist_id,resulting_version) VALUES (?,?,?,?,?)",
          [actor, key, hash, target, version],
        );
        return { id: target, version };
      },
    );
  }
}
