import { workingYear } from "../configuration/calendar.js";
import { MAX_IMPORT_ROWS } from "../imports/model.js";
import { rolloverAdmission } from "../masterlists/continuing-admission.js";
import { randomUUID } from "node:crypto";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey, parseQuery } from "../configuration/validation.js";
import { validationDetails } from "../validation-details.js";
import { today } from "../scholars/validation.js";
import type { Roster, RosterDetail, RosterEntry } from "./model.js";
const createSchema = z.object({
  sourceReference: z.string().trim().min(3).max(500),
  entries: z.array(z.object({ scholarId: z.uuid(), version: z.number().int().positive(), sourceRow: z.number().int().positive(), originalName: z.string().trim().min(2).max(300) }).strict()).min(1).max(MAX_IMPORT_ROWS),
}).strict().superRefine((v, ctx) => {
  if (new Set(v.entries.map((e) => e.scholarId)).size !== v.entries.length || new Set(v.entries.map((e) => e.sourceRow)).size !== v.entries.length)
    ctx.addIssue({ code: "custom", message: "Use each scholar and source row only once." });
});
const decisionSchema = z.object({
  expectedRevision: z.literal(0),
  decision: z.enum(["accepted", "rejected"]),
  effectiveOn: z.iso.date().refine((s) => s >= "1900-01-01" && s <= today(), "Use a valid non-future decision date."),
  issuer: z.string().trim().min(3).max(200),
  reference: z.string().trim().min(3).max(300),
  reviewed: z.literal(true),
  reason: z.string().trim().max(500).default(""),
}).strict().superRefine((v, ctx) => {
  if (v.decision === "rejected" && v.reason.length < 5) ctx.addIssue({ code: "custom", path: ["reason"], message: "Give a reason for rejection." });
});
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new AuthError(422, "VALIDATION_FAILED", "Check the roster information.", validationDetails(result.error));
  return result.data;
}
const decode = <T>(v: T | string): T => typeof v === "string" ? JSON.parse(v) as T : v;
const fail = (code: string, message: string): never => { throw new AuthError(409, code, message); };
async function detail(db: PoolConnection, id: string): Promise<RosterDetail> {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT id,code,source_reference,actor_id FROM continuing_roster_batches WHERE id=? LOCK IN SHARE MODE", [id]);
  if (!rows[0]) throw new AuthError(404, "ROSTER_NOT_FOUND", "Roster not found.");
  const [decisions] = await db.execute<RowDataPacket[]>("SELECT d.revision,d.decision,d.reason,DATE_FORMAT(d.effective_on,'%Y-%m-%d') AS effective_on,a.issuer,a.reference_text,u.full_name FROM continuing_roster_decisions d JOIN workflow_authority_versions a ON a.id=d.authority_version_id JOIN users u ON u.id=d.actor_id WHERE d.batch_id=? ORDER BY d.revision DESC LIMIT 1 LOCK IN SHARE MODE", [id]);
  const [entries] = await db.execute<RowDataPacket[]>("SELECT scholar_id,source_row,original_name,identity_evidence FROM continuing_roster_entries WHERE batch_id=? ORDER BY source_row LOCK IN SHARE MODE", [id]);
  const d = decisions[0];
  return { id, code: rows[0].code, sourceReference: rows[0].source_reference, actorId: rows[0].actor_id, state: d?.decision ?? "pending", revision: d?.revision ?? 0,
    entries: entries.map((e) => ({ ...decode<Omit<RosterEntry, "sourceRow" | "originalName">>(e.identity_evidence), sourceRow: e.source_row, originalName: e.original_name })),
    decision: d ? { reason: d.reason, effectiveOn: d.effective_on, issuer: d.issuer, reference: d.reference_text, actorName: d.full_name } : null };
}
export class ContinuingService {
  private authorization: Pick<AuthorizationService, "withPermission">;
  constructor(pool: Pool | undefined, authorization?: Pick<AuthorizationService, "withPermission">) { this.authorization = authorization ?? new AuthorizationService(pool); }
  list(actor: string, query: unknown) {
    const { limit, offset } = parseQuery(query);
    return this.authorization.withPermission(actor, "continuing.prepare", async (db) => {
      const [ids] = await db.query<RowDataPacket[]>("SELECT id FROM continuing_roster_batches ORDER BY recorded_at DESC,id DESC LIMIT ? OFFSET ?", [limit, offset]);
      const [count] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM continuing_roster_batches");
      const items: Roster[] = [];
      for (const row of ids) { const { entries: _entries, decision: _decision, ...item } = await detail(db, row.id); void _entries; void _decision; items.push(item); }
      return { items, total: Number(count[0].n), offset, limit };
    });
  }
  view(actor: string, id: string) { parseId(id); return this.authorization.withPermission(actor, "continuing.prepare", (db) => detail(db, id)); }
  participation(actor: string, scholarId: string) {
    parseId(scholarId);
    return this.authorization.withPermission(actor, "continuing.prepare", async (db) => {
      const [rows] = await db.execute<RowDataPacket[]>("SELECT p.id,e.batch_id FROM participations p JOIN continuing_roster_entries e ON e.id=p.roster_entry_id WHERE p.scholar_id=? AND p.entry_basis='continuing_baseline'", [scholarId]);
      const year = await workingYear(db);
      const rollover = year ? await rolloverAdmission(db, scholarId, year.yearId) : null;
      return { rollover, baseline: rows[0] ? { participationId: rows[0].id as string, batchId: rows[0].batch_id as string } : null };
    });
  }
  async command(actor: string, id: string | null, keyInput: unknown, raw: unknown, requestId: string) {
    const key = parseKey(keyInput); if (id) parseId(id);
    const input = id ? parse(decisionSchema, raw) : parse(createSchema, raw);
    const hash = digest(JSON.stringify({ id, input }));
    return this.authorization.withPermission(actor, id ? "continuing.approve" : "continuing.prepare", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [prior] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? LOCK IN SHARE MODE", [actor, key]);
      if (prior[0]) { if (prior[0].payload_hash !== hash) fail("IDEMPOTENCY_CONFLICT", "This retry key was used for another command."); return decode<{ id: string; revision: number }>(prior[0].result); }
      const target = id ?? randomUUID();
      let reason = "Continuing-scholar roster prepared", action = "prepared", revision = 0;
      if ("entries" in input) {
        const entries: RosterEntry[] = [];
        for (const entry of input.entries) {
          const [people] = await db.execute<RowDataPacket[]>("SELECT s.id,s.version,s.first_name,s.middle_name,s.last_name,s.suffix,i.human_id FROM scholars s JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE s.id=? LOCK IN SHARE MODE", [entry.scholarId]);
          const p = people[0];
          if (!p || p.version !== entry.version) fail("SOURCE_CHANGED", "A selected scholar changed or is unavailable. Refresh and prepare the roster again.");
          const [accepted] = await db.execute<RowDataPacket[]>("SELECT id FROM participations WHERE scholar_id=? LOCK IN SHARE MODE", [entry.scholarId]);
          if (accepted.length) fail("PARTICIPATION_EXISTS", "A selected scholar already has a participation record.");
          entries.push({ ...entry, humanId: p.human_id, name: [p.last_name, p.first_name, p.middle_name, p.suffix].filter(Boolean).join(" ") });
        }
        await db.execute("INSERT INTO continuing_roster_batches (id,code,source_reference,actor_id,recorded_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))", [target, `CR-${target}`, input.sourceReference, actor]);
        for (const e of entries) await db.execute("INSERT INTO continuing_roster_entries (id,batch_id,scholar_id,source_row,original_name,identity_evidence,actor_id,recorded_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [randomUUID(), target, e.scholarId, e.sourceRow, e.originalName, JSON.stringify(e), actor]);
      } else {
        const before = await detail(db, target);
        if (before.revision !== input.expectedRevision) fail("VERSION_CONFLICT", "This roster has already been reviewed. Refresh it.");
        if (input.decision === "accepted") for (const e of before.entries) {
          const [people] = await db.execute<RowDataPacket[]>("SELECT version FROM scholars WHERE id=? LOCK IN SHARE MODE", [e.scholarId]);
          if (people[0]?.version !== e.version) fail("SOURCE_CHANGED", "A scholar changed after preparation. Reject this roster and prepare a refreshed replacement.");
          const [existing] = await db.execute<RowDataPacket[]>("SELECT id FROM participations WHERE scholar_id=? LOCK IN SHARE MODE", [e.scholarId]);
          if (existing.length) fail("PARTICIPATION_EXISTS", "A roster member was already accepted elsewhere. Reject this roster and prepare a replacement.");
        }
        const authority = randomUUID(), decisionId = randomUUID();
        reason = input.reason || "Prior participation accepted from reviewed baseline roster";
        action = input.decision; revision = 1;
        // This is evidence for this recorded decision only, not a reusable grant of power.
        await db.execute("INSERT INTO workflow_authority_versions (id,code,revision,issuer,reference_text,scope,valid_from,valid_until,source_location,actor_id,recorded_at) VALUES (?,?,1,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [authority, `CR-${target}`, input.issuer, input.reference, JSON.stringify({ kind: "continuing_roster_decision", batchId: target, decision: action }), input.effectiveOn, input.effectiveOn, before.sourceReference, actor]);
        await db.execute("INSERT INTO continuing_roster_decisions (id,batch_id,revision,decision,authority_version_id,snapshot,reason,effective_on,actor_id,recorded_at) VALUES (?,?,1,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [decisionId, target, action, authority, JSON.stringify(before.entries), reason, input.effectiveOn, actor]);
        if (action === "accepted") {
          const [entries] = await db.execute<RowDataPacket[]>("SELECT id,scholar_id FROM continuing_roster_entries WHERE batch_id=? LOCK IN SHARE MODE", [target]);
          for (const e of entries) {
            const participation = randomUUID();
            await db.execute("INSERT INTO participations (id,scholar_id,entry_basis,roster_entry_id,actor_id,recorded_at) VALUES (?,?,'continuing_baseline',?,?,UTC_TIMESTAMP(6))", [participation, e.scholar_id, e.id, actor]);
            await db.execute("INSERT INTO participation_events (id,participation_id,revision,action,authority_version_id,effective_on,snapshot,reason,actor_id,recorded_at) VALUES (?,?,1,'accepted',?,?,?,?,?,UTC_TIMESTAMP(6))", [randomUUID(), participation, authority, input.effectiveOn, JSON.stringify({ batchId: target, decisionId, priorAdmission: "accepted_baseline", historicalDocuments: "not_recorded", priorShiftCount: null, programCategory: "unknown" }), reason, actor]);
          }
        }
      }
      await db.execute("INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,'continuing.roster','continuing_roster',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), target, action, actor, requestId, reason, JSON.stringify({ revision, idempotencyKey: key })]);
      const result = { id: target, revision };
      await db.execute("INSERT INTO workflow_commands (actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))", [actor, key, `continuing.${action}`, hash, JSON.stringify(result)]);
      return result;
    });
  }
}
