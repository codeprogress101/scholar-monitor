import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { parseStatusDecision } from "../status/validation.js";
import { academicCurrent } from "../academic/changes-service.js";
import {
  validatePlacementChange,
  parseAcademicChange,
} from "../academic/changes-validation.js";
import { header } from "./service.js";
import { parseAmendment } from "./amendment-validation.js";
import type { DraftEntry } from "./model.js";
import type { OfficialSnapshot } from "./workflow-model.js";
import type { AmendmentResult, AmendmentView } from "./amendment-model.js";
const decode = <T>(v: string | T): T =>
  typeof v === "string" ? (JSON.parse(v) as T) : v;
function fail(code: string, message: string): never {
  throw new AuthError(409, code, message);
}
async function lineage(db: PoolConnection, id: string) {
  const [own] = await db.execute<RowDataPacket[]>(
    "SELECT root_id,revision FROM masterlist_amendment_versions WHERE masterlist_id=? FOR UPDATE",
    [id],
  );
  const rootId = (own[0]?.root_id ?? id) as string;
  const [versions] = await db.execute<RowDataPacket[]>(
    "SELECT v.masterlist_id,v.revision,DATE_FORMAT(p.published_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS published_at FROM masterlist_amendment_versions v JOIN masterlist_publications p ON p.masterlist_id=v.masterlist_id WHERE v.root_id=? ORDER BY v.revision DESC FOR UPDATE",
    [rootId],
  );
  return {
    rootId,
    revision: Number(own[0]?.revision ?? 0),
    latestId: (versions[0]?.masterlist_id ?? rootId) as string,
    versions,
  };
}
async function base(db: PoolConnection, id: string) {
  const row = await header(db, id),
    chain = await lineage(db, id);
  const [pub] = await db.execute<RowDataPacket[]>(
    "SELECT snapshot,DATE_FORMAT(effective_on,'%Y-%m-%d') AS effective_on FROM masterlist_publications WHERE masterlist_id=? FOR UPDATE",
    [id],
  );
  if (row.status !== "locked" || !pub.length)
    fail(
      "LOCKED_PUBLICATION_REQUIRED",
      "Amendments require a locked published masterlist.",
    );
  if (chain.latestId !== id)
    fail(
      "VERSION_CONFLICT",
      "A newer official version exists. Open it before requesting or publishing an amendment.",
    );
  if (row.locked_at || row.archived_at)
    throw new AuthError(
      423,
      "RECORD_LOCKED",
      "The academic year is locked or archived.",
    );
  return {
    row,
    chain,
    snapshot: decode<OfficialSnapshot>(pub[0].snapshot),
    effectiveOn: pub[0].effective_on as string,
  };
}
async function source(db: PoolConnection, entry: DraftEntry) {
  const academic = await academicCurrent(db, entry.snapshot.academicRecordId);
  const [people] = await db.execute<RowDataPacket[]>(
    "SELECT first_name,middle_name,last_name,suffix,version FROM scholars WHERE id=? FOR UPDATE",
    [entry.scholarId],
  );
  if (!people.length)
    fail("SOURCE_CHANGED", "Scholar registry record is unavailable.");
  const p = people[0];
  return {
    personVersion: p.version as number,
    name: [p.last_name, p.first_name, p.middle_name, p.suffix]
      .filter(Boolean)
      .join(" "),
    academicVersion: academic.version,
    placement: academic.placement,
    academicEffectiveOn: academic.effectiveOn,
  };
}
const isAcademic = (kind: string) =>
  !["award_number", "identity_refresh"].includes(kind);
async function destinations(
  db: PoolConnection,
  before: DraftEntry,
  after: DraftEntry,
) {
  for (const [table, key] of [
    ["schools", "schoolId"],
    ["courses", "courseId"],
  ] as const) {
    if (before.snapshot.placement[key] === after.snapshot.placement[key])
      continue;
    const [refs] = await db.execute<RowDataPacket[]>(
      `SELECT code,name,archived_at FROM ${table} WHERE id=? FOR UPDATE`,
      [after.snapshot.placement[key]],
    );
    if (!refs.length || refs[0].archived_at)
      fail(
        "REFERENCE_UNAVAILABLE",
        "Amended school and course must be active controlled references.",
      );
  }
}
async function prepare(
  db: PoolConnection,
  state: Awaited<ReturnType<typeof base>>,
  input: ReturnType<typeof parseAmendment>,
) {
  if (state.row.version !== input.expectedVersion)
    fail("VERSION_CONFLICT", "Original masterlist revision changed.");
  const before = state.snapshot.entries.find(
    (e) => e.scholarId === input.scholarId,
  );
  if (!before)
    fail(
      "ENTRY_NOT_FOUND",
      "Scholar is not a member of this official version.",
    );
  const current = await source(db, before),
    after = structuredClone(before);
  if (
    input.effectiveOn < state.effectiveOn ||
    (isAcademic(input.kind) &&
      current.academicEffectiveOn &&
      input.effectiveOn < current.academicEffectiveOn)
  )
    fail(
      "INVALID_EFFECTIVE_DATE",
      "Effective date cannot precede the original release or latest academic change.",
    );
  if (isAcademic(input.kind)) {
    if (
      current.academicVersion !== before.snapshot.academicVersion ||
      JSON.stringify(current.placement) !==
        JSON.stringify(before.snapshot.placement)
    )
      fail(
        "SOURCE_CHANGED",
        "Academic source differs from the official version. Resolve the prior change before amending placement.",
      );
    const placement = {
      ...current.placement,
      schoolId: input.schoolId ?? current.placement.schoolId,
      courseId: input.courseId ?? current.placement.courseId,
      yearLevel: input.yearLevel ?? current.placement.yearLevel,
    };
    validatePlacementChange(
      current.placement,
      parseAcademicChange({
        schoolId: placement.schoolId,
        courseId: placement.courseId,
        yearLevel: placement.yearLevel,
        expectedVersion: current.academicVersion,
        kind: input.kind,
        effectiveOn: input.effectiveOn,
        reason: input.reason,
        reference: input.reference,
        remarks: "",
      }),
    );
    // Only the supported fields are changed; preserved reference labels remain historical.
    after.snapshot.placement = placement;
    await destinations(db, before, after);
    for (const [table, key, snapshotKey] of [
      ["schools", "schoolId", "school"],
      ["courses", "courseId", "course"],
    ] as const)
      if (current.placement[key] !== placement[key]) {
        const [refs] = await db.execute<RowDataPacket[]>(
          `SELECT code,name FROM ${table} WHERE id=?`,
          [placement[key]],
        );
        after.snapshot.placement[snapshotKey] = {
          code: refs[0].code,
          name: refs[0].name,
        };
      }
    after.snapshot.academicVersion = current.academicVersion + 1;
  } else if (input.kind === "award_number") {
    if (input.awardNumber === before.awardNumber)
      fail("NO_CHANGE", "Award number is unchanged.");
    if (input.awardNumber && /^LDSS-\d{4}-\d{5}$/i.test(input.awardNumber))
      fail(
        "INVALID_AWARD_NUMBER",
        "Award numbers are separate from permanent Scholar IDs.",
      );
    if (input.awardNumber) {
      const [duplicates] = await db.execute<RowDataPacket[]>(
        "SELECT id FROM masterlist_entries WHERE masterlist_id=? AND award_number=? AND scholar_id<>? FOR UPDATE",
        [state.row.id, input.awardNumber, input.scholarId],
      );
      if (duplicates.length)
        fail(
          "DUPLICATE_AWARD_NUMBER",
          "Another scholar already has this award number.",
        );
    }
    after.awardNumber = input.awardNumber!;
  } else {
    if (
      current.name === before.snapshot.name &&
      current.personVersion === before.snapshot.personVersion
    )
      fail(
        "NO_CHANGE",
        "The official identity snapshot already matches the registry.",
      );
    after.snapshot.name = current.name;
    after.snapshot.personVersion = current.personVersion;
  }
  return { before, after, current };
}
async function recheck(db: PoolConnection, q: RowDataPacket) {
  const state = await base(db, q.masterlist_id),
    before = decode<DraftEntry>(q.before_value),
    after = decode<DraftEntry>(q.after_value);
  const original = state.snapshot.entries.find(
    (e) => e.scholarId === q.scholar_id,
  );
  if (!original || JSON.stringify(original) !== JSON.stringify(before))
    fail(
      "VERSION_CONFLICT",
      "The original official entry no longer matches this request.",
    );
  if (
    JSON.stringify(await source(db, before)) !==
    JSON.stringify(decode(q.source_value))
  )
    fail(
      "SOURCE_CHANGED",
      "Authoritative source changed since the request. Submit a new amendment for review.",
    );
  await destinations(db, before, after);
  return { state, before, after };
}
export class MasterlistAmendmentService {
  constructor(private authorization: AuthorizationService) {}
  async view(actor: string, rawId: unknown): Promise<AmendmentView> {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "masterlists.prepare",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const row = await header(db, id),
          chain = await lineage(db, id);
        const [roots] = await db.execute<RowDataPacket[]>(
          "SELECT DATE_FORMAT(published_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS published_at FROM masterlist_publications WHERE masterlist_id=?",
          [chain.rootId],
        );
        const [requests] = await db.execute<RowDataPacket[]>(
          "SELECT q.*,DATE_FORMAT(q.effective_on,'%Y-%m-%d') AS effective_date,DATE_FORMAT(q.created_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS created_time,d.decision,d.actor_name AS decider,d.reason AS decision_reason,d.reference_text AS decision_reference,DATE_FORMAT(d.occurred_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS decision_time,v.masterlist_id AS published_id FROM masterlist_amendments q LEFT JOIN masterlist_amendment_decisions d ON d.amendment_id=q.id LEFT JOIN masterlist_amendment_versions v ON v.amendment_id=q.id WHERE q.masterlist_id=? ORDER BY q.created_at DESC,q.id",
          [id],
        );
        return {
          versionLabel: `1.${chain.revision}`,
          rootId: chain.rootId,
          latestId: chain.latestId,
          canRequest:
            row.status === "locked" &&
            chain.latestId === id &&
            !row.locked_at &&
            !row.archived_at,
          versions: [
            ...(roots.length
              ? [
                  {
                    id: chain.rootId,
                    label: "1.0",
                    publishedAt: roots[0].published_at,
                  },
                ]
              : []),
            ...chain.versions
              .slice()
              .reverse()
              .map((v) => ({
                id: v.masterlist_id,
                label: `1.${v.revision}`,
                publishedAt: v.published_at,
              })),
          ],
          requests: requests.map((q) => ({
            id: q.id,
            scholarId: q.scholar_id,
            kind: q.kind,
            before: decode(q.before_value),
            after: decode(q.after_value),
            effectiveOn: q.effective_date,
            reason: q.reason,
            reference: q.reference_text,
            actorId: q.actor_id,
            actorName: q.actor_name,
            createdAt: q.created_time,
            decision: q.decision
              ? {
                  action: q.decision,
                  actorName: q.decider,
                  reason: q.decision_reason,
                  reference: q.decision_reference,
                  occurredAt: q.decision_time,
                }
              : null,
            publishedId: q.published_id ?? null,
          })),
        };
      },
    );
  }
  async command(
    actor: string,
    rawId: unknown,
    action: "request" | "approve" | "reject" | "cancel" | "publish",
    rawKey: unknown,
    body: unknown,
    requestId: string,
  ): Promise<AmendmentResult> {
    const id = parseId(rawId),
      key = parseKey(rawKey),
      proposal = action === "request" ? parseAmendment(body) : null,
      input = proposal ?? parseStatusDecision(body),
      hash = digest(JSON.stringify({ id, action, input }));
    return this.authorization.withPermission(
      actor,
      action === "publish"
        ? "masterlists.publish"
        : action === "approve" || action === "reject"
          ? "masterlists.amendments.approve"
          : "masterlists.amendments.request",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM masterlist_amendment_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            fail(
              "IDEMPOTENCY_CONFLICT",
              "Command key already used for different amendment data.",
            );
          return decode<AmendmentResult>(prior[0].result);
        }
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        let target = id,
          publishedId: string | null = null;
        let details: object;
        if (proposal) {
          const state = await base(db, id),
            data = await prepare(db, state, proposal);
          target = randomUUID();
          await db.execute(
            "INSERT INTO masterlist_amendments (id,masterlist_id,scholar_id,kind,before_value,after_value,source_value,effective_on,reason,reference_text,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            [
              target,
              id,
              proposal.scholarId,
              proposal.kind,
              JSON.stringify(data.before),
              JSON.stringify(data.after),
              JSON.stringify(data.current),
              proposal.effectiveOn,
              proposal.reason,
              proposal.reference,
              actor,
              users[0].full_name,
            ],
          );
          details = {
            originalMasterlistId: id,
            ...data,
            effectiveOn: proposal.effectiveOn,
          };
        } else {
          const [requests] = await db.execute<RowDataPacket[]>(
            "SELECT *,DATE_FORMAT(effective_on,'%Y-%m-%d') AS effective_date FROM masterlist_amendments WHERE id=? FOR UPDATE",
            [id],
          );
          const q = requests[0];
          if (!q)
            throw new AuthError(
              404,
              "AMENDMENT_NOT_FOUND",
              "Amendment request not found.",
            );
          const [decisions] = await db.execute<RowDataPacket[]>(
            "SELECT * FROM masterlist_amendment_decisions WHERE amendment_id=? FOR UPDATE",
            [id],
          );
          const decision = decisions[0];
          if (action !== "publish") {
            if (decision)
              fail(
                "INVALID_STATE_TRANSITION",
                "This amendment already has a decision.",
              );
            if (action === "approve") {
              if (q.actor_id === actor)
                throw new AuthError(
                  403,
                  "SELF_APPROVAL_DENIED",
                  "A different Coordinator must approve this amendment.",
                );
              await recheck(db, q);
            }
            if (action === "cancel" && q.actor_id !== actor)
              throw new AuthError(
                403,
                "CANCEL_DENIED",
                "Only the requester may cancel.",
              );
            await db.execute(
              "INSERT INTO masterlist_amendment_decisions (amendment_id,decision,actor_id,actor_name,reason,reference_text,occurred_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))",
              [
                id,
                action,
                actor,
                users[0].full_name,
                input.reason,
                input.reference,
              ],
            );
            details = {
              originalMasterlistId: q.masterlist_id,
              decision: action,
            };
          } else {
            if (decision?.decision !== "approve")
              fail(
                "APPROVAL_REQUIRED",
                "A Coordinator must approve the amendment before publication.",
              );
            const [published] = await db.execute<RowDataPacket[]>(
              "SELECT masterlist_id FROM masterlist_amendment_versions WHERE amendment_id=? FOR UPDATE",
              [id],
            );
            if (published.length)
              fail(
                "ALREADY_PUBLISHED",
                "This amendment has already been published.",
              );
            const { state, before, after } = await recheck(db, q);
            publishedId = randomUUID();
            let academicChangeId: string | null = null;
            if (isAcademic(q.kind)) {
              academicChangeId = randomUUID();
              await db.execute(
                "INSERT INTO academic_changes (id,academic_record_id,expected_version,kind,before_value,after_value,school_id,course_id,effective_on,reason,reference_text,remarks,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
                [
                  academicChangeId,
                  before.snapshot.academicRecordId,
                  before.snapshot.academicVersion,
                  q.kind,
                  JSON.stringify(before.snapshot.placement),
                  JSON.stringify(after.snapshot.placement),
                  after.snapshot.placement.schoolId,
                  after.snapshot.placement.courseId,
                  q.effective_date,
                  q.reason,
                  q.reference_text,
                  `Official amendment ${id}`,
                  q.actor_id,
                  q.actor_name,
                ],
              );
              await db.execute(
                "INSERT INTO academic_change_decisions (request_id,academic_record_id,decision,resulting_version,actor_id,actor_name,reason,reference_text,occurred_at) VALUES (?,?,'approve',?,?,?,?,?,UTC_TIMESTAMP(6))",
                [
                  academicChangeId,
                  before.snapshot.academicRecordId,
                  after.snapshot.academicVersion,
                  decision.actor_id,
                  decision.actor_name,
                  decision.reason,
                  decision.reference_text,
                ],
              );
            }
            const revision = state.chain.revision + 1,
              label = `1.${revision}`;
            const [roots] = await db.execute<RowDataPacket[]>(
              "SELECT title FROM masterlist_versions WHERE id=?",
              [state.chain.rootId],
            );
            const title = `${String(roots[0].title).slice(0, 130)} - v${label}`;
            await db.execute(
              "INSERT INTO masterlist_versions (id,academic_year_id,title,status,version,actor_id,created_at,updated_at) VALUES (?,?,?,'draft',1,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
              [publishedId, state.row.academic_year_id, title, actor],
            );
            const newEntries: DraftEntry[] = [];
            for (const old of state.snapshot.entries) {
              const e = structuredClone(
                old.scholarId === q.scholar_id ? after : old,
              );
              e.id = randomUUID();
              newEntries.push(e);
              await db.execute(
                "INSERT INTO masterlist_entries (id,masterlist_id,scholar_id,snapshot,award_number,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
                [
                  e.id,
                  publishedId,
                  e.scholarId,
                  JSON.stringify(e.snapshot),
                  e.awardNumber,
                ],
              );
            }
            const snapshot = {
              ...state.snapshot,
              masterlistId: publishedId,
              title,
              publicationVersion: 2,
              entries: newEntries,
              lineage: {
                rootId: state.chain.rootId,
                parentId: q.masterlist_id,
                amendmentId: id,
                versionLabel: label,
              },
            };
            const bytes = JSON.stringify(snapshot);
            await db.execute(
              "INSERT INTO masterlist_publications (masterlist_id,snapshot,snapshot_hash,effective_on,actor_id,actor_name,published_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))",
              [
                publishedId,
                bytes,
                digest(bytes),
                q.effective_date,
                actor,
                users[0].full_name,
              ],
            );
            await db.execute(
              "INSERT INTO masterlist_amendment_versions (masterlist_id,parent_id,root_id,amendment_id,revision,academic_change_id) VALUES (?,?,?,?,?,?)",
              [
                publishedId,
                q.masterlist_id,
                state.chain.rootId,
                id,
                revision,
                academicChangeId,
              ],
            );
            await db.execute(
              "INSERT INTO masterlist_workflow_events (id,masterlist_id,action,from_status,to_status,resulting_version,actor_id,actor_name,reason,reference_text,snapshot,occurred_at) VALUES (?,?,'amendment-publish','approved_amendment','locked',2,?,?,?,?,?,UTC_TIMESTAMP(6))",
              [
                randomUUID(),
                publishedId,
                actor,
                users[0].full_name,
                input.reason,
                input.reference,
                bytes,
              ],
            );
            await db.execute(
              "UPDATE masterlist_versions SET status='locked',version=2,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
              [publishedId],
            );
            details = {
              originalMasterlistId: q.masterlist_id,
              newMasterlistId: publishedId,
              versionLabel: label,
              academicChangeId,
              before,
              after,
            };
          }
        }
        const result: AmendmentResult = {
          amendmentId: target,
          masterlistId: publishedId,
          outcome: action,
        };
        await db.execute(
          "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,?, 'masterlist_amendment',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            `masterlist.amendment.${action}`,
            target,
            action,
            actor,
            requestId,
            input.reason,
            JSON.stringify({
              ...details,
              reference: input.reference,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO masterlist_amendment_commands (actor_id,command_id,payload_hash,amendment_id,result) VALUES (?,?,?,?,?)",
          [actor, key, hash, target, JSON.stringify(result)],
        );
        return result;
      },
    );
  }
}
