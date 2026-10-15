import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { header, entries, validate } from "./service.js";
import { lineage } from "./revisions.js";
import { consolidationSource } from "./consolidation.js";
import type { DraftEntry, DraftIssue } from "./model.js";
import type { OfficialSnapshot } from "./workflow-model.js";
export type AdditionPreview = {
  targetId: string | null;
  targetTitle?: string;
  existing: DraftEntry[];
  additions: number;
  issues: DraftIssue[];
  incorporated: boolean;
  consolidation?: {sourceId:string;title:string};
};
export async function additionPreview(
  db: PoolConnection,
  row: RowDataPacket,
  items: DraftEntry[],
): Promise<AdditionPreview> {
  const [events] = await db.execute<RowDataPacket[]>(
    "SELECT target_id FROM masterlist_addition_events WHERE draft_id=? ORDER BY resulting_version DESC LIMIT 1",
    [row.id],
  );
  const targetId = events[0]?.target_id ?? null;
  const result: AdditionPreview = {
    targetId,
    existing: [],
    additions: items.length,
    issues: [],
    incorporated: ["published", "locked"].includes(row.status) && !!targetId,
  };
  const consolidation=await consolidationSource(db,row.id);
  if(consolidation)result.consolidation={sourceId:consolidation.source_id,title:consolidation.title};
  if (!targetId) return result;
  const target = await header(db, targetId);
  result.targetTitle = target.title;
  const chain = await lineage(db, targetId);
  const [pubs] = await db.execute<RowDataPacket[]>(
    "SELECT snapshot FROM masterlist_publications WHERE masterlist_id=?",
    [targetId],
  );
  const issue = (
    code: string,
    message: string,
    scholarId: string | null = null,
  ) => result.issues.push({ code, message, scholarId });
  if (!pubs.length || !["published", "locked"].includes(target.status))
    issue("PUBLICATION_REQUIRED", "Choose a published official masterlist.");
  if (chain.latestId !== targetId && !result.incorporated)
    issue(
      "TARGET_CHANGED",
      "A newer official revision exists. Return to Draft and choose the latest revision.",
    );
  if (target.academic_year_id !== row.academic_year_id)
    issue(
      "WRONG_ACADEMIC_YEAR",
      "Both lists must belong to the same academic year.",
    );
  if (pubs.length)
    result.existing = (
      JSON.parse(pubs[0].snapshot) as OfficialSnapshot
    ).entries;
  if (result.incorporated) {
    result.additions = items.filter(
      (e) => !result.existing.some((old) => old.scholarId === e.scholarId),
    ).length;
    return result;
  }
  for (const entry of items) {
    if (result.existing.some((e) => e.scholarId === entry.scholarId))
      issue(
        "DUPLICATE_ENTRY",
        `Scholar ${entry.snapshot.humanId} is already in the official list.`,
        entry.scholarId,
      );
    if (entry.awardNumber) {
      const [award] = await db.execute<RowDataPacket[]>(
        "SELECT scholar_id FROM masterlist_entries WHERE masterlist_id=? AND award_number=? AND removed_at IS NULL",
        [targetId, entry.awardNumber],
      );
      if (award.length)
        issue(
          "AWARD_NUMBER_CONFLICT",
          `Award number ${entry.awardNumber} is already assigned.`,
          entry.scholarId,
        );
    }
    const [active] = await db.execute<RowDataPacket[]>(
      "SELECT scholarship_id FROM masterlist_activations WHERE scholarship_id=?",
      [entry.snapshot.scholarshipId],
    );
    if (active.length && !consolidation)
      issue(
        "ALREADY_ACTIVATED",
        `Scholar ${entry.snapshot.humanId} already has an official activation.`,
        entry.scholarId,
      );
  }
  return result;
}
export class MasterlistAdditionService {
  constructor(private authorization: AuthorizationService) {}
  async view(actor: string, rawId: unknown) {
    const id = parseId(rawId);
    return this.authorization.withPermission(
      actor,
      "masterlists.prepare",
      async (db) => {
        const row = await header(db, id),
          items = await entries(db, id);
        const preview = await additionPreview(db, row, items);
        const [targets] = await db.execute<RowDataPacket[]>(
          "SELECT m.id,m.title,m.version FROM masterlist_versions m JOIN masterlist_publications p ON p.masterlist_id=m.id WHERE m.academic_year_id=? AND m.status IN ('published','locked') AND m.id<>? AND NOT EXISTS(SELECT 1 FROM masterlist_revisions r WHERE r.parent_id=m.id) AND NOT EXISTS(SELECT 1 FROM masterlist_consolidation_links l WHERE l.source_id=m.id) ORDER BY m.created_at,m.id",
          [row.academic_year_id, id],
        );
        const report = preview.incorporated
          ? { issues: [] }
          : await validate(db, row, items);
        return {
          ...preview,
          issues: report.issues,
          latestId: ["published","locked"].includes(row.status)?(await lineage(db,id)).latestId:null,
          targets: targets.map((t) => ({
            id: t.id as string,
            title: t.title as string,
            version: t.version as number,
          })),
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
    const id = parseId(rawId),
      key = parseKey(rawKey);
    const parsed = z
      .object({
        expectedVersion: z.number().int().positive(),
        targetId: z.uuid().nullable(),
        targetVersion: z.number().int().positive().optional(),
        reason: z.string().trim().min(5).max(500),
        reference: z.string().trim().min(3).max(300),
      })
      .strict()
      .safeParse(body);
    if (!parsed.success)
      throw new AuthError(
        422,
        "VALIDATION_FAILED",
        "Provide the current draft version, target version, reason and reference.",
      );
    const input = parsed.data;
    const hash = digest(
      JSON.stringify({ id, operation: "addition-target", input }),
    );
    return this.authorization.withPermission(
      actor,
      "masterlists.prepare",
      async (db) => {
        const [prior] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,masterlist_id,resulting_version FROM masterlist_commands WHERE actor_id=? AND command_id=?",
          [actor, key],
        );
        if (prior.length) {
          if (prior[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This retry key belongs to another command.",
            );
          return {
            id: prior[0].masterlist_id,
            version: prior[0].resulting_version,
          };
        }
        const row = await header(db, id);
        if(await consolidationSource(db,id))throw new AuthError(409,"FROZEN_CONSOLIDATION","Create a new consolidation proposal to select different publications.");
        if (row.version !== input.expectedVersion)
          throw new AuthError(409, "VERSION_CONFLICT", "Refresh the draft.");
        if (row.status !== "draft" || row.locked_at || row.archived_at)
          throw new AuthError(
            409,
            "RETURN_TO_DRAFT_REQUIRED",
            "Return to Draft in an open academic year before changing the target.",
          );
        if (input.targetId) {
          const target = await header(db, input.targetId),
            chain = await lineage(db, input.targetId);
          if (
            input.targetId === id ||
            target.academic_year_id !== row.academic_year_id ||
            !["published", "locked"].includes(target.status) ||
            chain.latestId !== input.targetId ||
            target.version !== input.targetVersion
          )
            throw new AuthError(
              409,
              "INVALID_ADDITION_TARGET",
              "Select the latest published revision for this academic year and refresh its version.",
            );
        }
        const version = row.version + 1;
        await db.execute(
          "INSERT INTO masterlist_addition_events(id,draft_id,resulting_version,target_id,action,actor_id,reason,reference_text,recorded_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            randomUUID(),
            id,
            version,
            input.targetId,
            input.targetId ? "attach" : "detach",
            actor,
            input.reason,
            input.reference,
          ],
        );
        await db.execute(
          "UPDATE masterlist_versions SET version=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
          [version, id],
        );
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'masterlist.addition','masterlist',?,'target',?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            id,
            actor,
            requestId,
            input.reason,
            JSON.stringify(input),
          ],
        );
        await db.execute(
          "INSERT INTO masterlist_commands(actor_id,command_id,payload_hash,masterlist_id,resulting_version) VALUES(?,?,?,?,?)",
          [actor, key, hash, id, version],
        );
        return { id, version };
      },
    );
  }
}
