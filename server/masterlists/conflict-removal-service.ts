import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { z } from "zod";
import { AuthorizationService } from "../authorization/service.js";
import type { Access } from "../authorization/policy.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { workingYear } from "../configuration/calendar.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { validationDetails } from "../validation-details.js";
import { header } from "./service.js";
import { ordinaryNewActivation } from "./activation-review.js";
import type { ConflictRemovalScope, ConflictRemovalReview, ConflictRemovalResult } from "./conflict-removal-model.js";

export const MAX_CONFLICT_REMOVALS = 200;
const secret = randomBytes(32); // Uncommitted reviews expire on restart. Committed retries use the durable ledger.
const text = (min: number, max: number) => z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
const scopeSchema = z.object({ mode: z.enum(["all", "selected"]), scholarIds: z.array(z.uuid()).max(MAX_CONFLICT_REMOVALS) }).strict()
  .refine(s => new Set(s.scholarIds).size === s.scholarIds.length && (s.mode === "all" ? !s.scholarIds.length : !!s.scholarIds.length), "Choose unique members or the entire conflict scope.")
  .transform(s => ({ ...s, scholarIds: [...s.scholarIds].sort() }));
const querySchema = z.object({ mode: z.enum(["all", "selected"]), ids: z.string().max(7399).default(""), offset: z.coerce.number().int().min(0).max(200).default(0), limit: z.coerce.number().int().min(1).max(25).default(25) }).strict();
const commandSchema = z.object({ expectedVersion: z.number().int().positive(), expectedRemovals: z.number().int().min(1).max(MAX_CONFLICT_REMOVALS),
  expectedRemaining: z.number().int().min(0), selection: scopeSchema, fingerprint: z.string().regex(/^[a-f0-9]{64}$/), confirm: z.literal(true), reason: text(5, 500), reference: text(3, 300) }).strict();
const parse = <T>(schema: z.ZodType<T>, raw: unknown): T => { const result = schema.safeParse(raw); if (!result.success) throw new AuthError(422, "VALIDATION_FAILED", "Review the selected conflicts, confirmation and evidence.", validationDetails(result.error)); return result.data; };
const stale = (): never => { throw new AuthError(409, "CONFLICT_SELECTION_CHANGED", "The draft, selected membership or conflict evidence changed. Review removal again; nothing was removed."); };

async function loadState(db: PoolConnection, actor: Access, id: string, scope: ConflictRemovalScope) {
  const row = await header(db, id), working = await workingYear(db);
  if (!await ordinaryNewActivation(db, row)) throw new AuthError(409, "ORDINARY_DRAFT_REQUIRED", "Use the existing official amendment, addition or consolidation workflow.");
  if (row.status !== "draft" || row.locked_at || row.archived_at) throw new AuthError(423, "RECORD_LOCKED", "Conflict removal requires an editable unpublished Draft in an available year.");
  if (!working || working.yearId !== row.academic_year_id) throw new AuthError(409, "WORKING_YEAR_REQUIRED", "Review the draft in the current working academic year.");
  const from = `FROM masterlist_entries e JOIN scholars s ON s.id=e.scholar_id LEFT JOIN scholar_identifiers i ON i.scholar_id=s.id
    JOIN scholarship_records r ON r.id=JSON_UNQUOTE(JSON_EXTRACT(e.snapshot,'$.scholarshipId')) AND r.scholar_id=e.scholar_id AND r.academic_year_id=?
    LEFT JOIN masterlist_activations a ON a.scholarship_id=r.id LEFT JOIN masterlist_versions m ON m.id=a.masterlist_id
    LEFT JOIN masterlist_publications p ON p.masterlist_id=a.masterlist_id
    WHERE e.masterlist_id=? AND e.removed_at IS NULL AND (a.scholarship_id IS NOT NULL OR r.operational_status IS NOT NULL)`;
  const [[counts]] = await db.execute<RowDataPacket[]>(`SELECT COUNT(*) conflicts,(SELECT COUNT(*) FROM masterlist_entries WHERE masterlist_id=? AND removed_at IS NULL) members ${from}`, [id, row.academic_year_id, id]);
  const conflictCount = Number(counts.conflicts), membershipCount = Number(counts.members);
  if (scope.mode === "all" && conflictCount > MAX_CONFLICT_REMOVALS) throw new AuthError(409, "CONFLICT_REMOVAL_CAPACITY", "Select at most 200 specific conflicts per operation. No members were removed.");
  const [selected] = await db.execute<RowDataPacket[]>(`SELECT e.id entry_id,e.scholar_id,e.snapshot,e.award_number,e.created_at,e.updated_at,e.removed_at,
    i.human_id,CONCAT_WS(' ',s.last_name,s.first_name,s.middle_name,s.suffix) name,
    r.id scholarship_id,r.status,r.version annual_version,r.operational_status,r.status_version,r.status_effective_on,
    a.masterlist_id,a.effective_on,a.activated_at,m.title,m.status official_status,m.version official_version,p.snapshot_hash
    ${from} ${scope.mode === "selected" ? `AND e.scholar_id IN (${scope.scholarIds.map(() => "?").join(",")})` : ""}
    ORDER BY e.scholar_id LIMIT ${MAX_CONFLICT_REMOVALS + 1}`, [row.academic_year_id, id, ...(scope.mode === "selected" ? scope.scholarIds : [])]);
  if (!selected.length || (scope.mode === "selected" && selected.length !== scope.scholarIds.length) || selected.length > MAX_CONFLICT_REMOVALS) stale();
  // Complete selected snapshots are bounded too; oversized evidence fails closed.
  const evidence = JSON.stringify(selected);
  if (Buffer.byteLength(evidence) > 360 * 1024) throw new AuthError(409, "CONFLICT_REMOVAL_CAPACITY", "Selected source evidence exceeds the bounded review size. Review a smaller selection.");
  const fingerprint = createHmac("sha256", secret).update(JSON.stringify({ actor: [actor.userId, actor.version], draft: [row.id,row.title,row.academic_year_id,row.status,row.version], working, scope, membershipCount, conflictCount, selected })).digest("hex");
  return { row, selected, membershipCount, conflictCount, fingerprint };
}

export class MasterlistConflictRemovalService {
  constructor(private authorization: AuthorizationService) {}
  review(actor: string, rawId: unknown, rawQuery: unknown): Promise<ConflictRemovalReview> {
    const id = parseId(rawId), query = parse(querySchema, rawQuery), scope = parse(scopeSchema, { mode: query.mode, scholarIds: query.ids ? query.ids.split(",") : [] });
    return this.authorization.readSnapshot(actor, "masterlists.prepare", async (db, access) => {
      const state = await loadState(db, access, id, scope);
      return { draftId: id, title: state.row.title, academicYearId: state.row.academic_year_id, yearCode: state.row.year_code, version: state.row.version, scope,
        fingerprint: state.fingerprint, membershipCount: state.membershipCount, conflictCount: state.conflictCount, selectedIds: state.selected.map(r => String(r.scholar_id)), selectedCount: state.selected.length,
        remainingCount: state.membershipCount - state.selected.length, limit: MAX_CONFLICT_REMOVALS, total: state.selected.length, offset: query.offset, pageSize: query.limit,
        items: state.selected.slice(query.offset, query.offset + query.limit).map(r => ({ scholarId: r.scholar_id, humanId: r.human_id ?? null, name: r.name,
          official: { masterlistId: r.masterlist_id ?? null, title: r.title ?? null, yearCode: state.row.year_code, effectiveOn: r.effective_on ? new Date(r.effective_on).toISOString().slice(0,10) : null },
          reason: r.masterlist_id ? "Existing official activation; remove only this draft membership." : "Existing operational standing; remove only this draft membership." })) };
    });
  }
  remove(actor: string, rawId: unknown, rawKey: unknown, rawBody: unknown, requestId: string): Promise<ConflictRemovalResult> {
    const id = parseId(rawId), key = parseKey(rawKey), input = parse(commandSchema, rawBody), hash = digest(JSON.stringify({ operation: "masterlist.remove-conflicts", id, input }));
    return this.authorization.withPermission(actor, "masterlists.prepare", async (db, access) => {
      const [[prior]] = await db.execute<RowDataPacket[]>("SELECT payload_hash,masterlist_id,resulting_version FROM masterlist_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor,key]);
      if (prior) {
        if (prior.payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This request key belongs to another command.");
        return { id: prior.masterlist_id, version: prior.resulting_version, removedCount: input.expectedRemovals, remainingCount: input.expectedRemaining };
      }
      const state = await loadState(db, access, id, input.selection);
      if (state.row.version !== input.expectedVersion || state.fingerprint !== input.fingerprint || state.selected.length !== input.expectedRemovals || state.membershipCount - state.selected.length !== input.expectedRemaining) stale();
      const [result] = await db.execute<ResultSetHeader>(`UPDATE masterlist_entries SET removed_at=UTC_TIMESTAMP(6),award_number=NULL,updated_at=UTC_TIMESTAMP(6) WHERE masterlist_id=? AND removed_at IS NULL AND id IN (${state.selected.map(() => "?").join(",")})`, [id,...state.selected.map(r => r.entry_id)]);
      if (result.affectedRows !== state.selected.length) stale();
      // Read the exact persisted soft-removal timestamps for complete audit evidence.
      const [after] = await db.execute<RowDataPacket[]>(`SELECT id,scholar_id,snapshot,award_number,removed_at,updated_at FROM masterlist_entries WHERE masterlist_id=? AND id IN (${state.selected.map(() => "?").join(",")}) ORDER BY scholar_id`, [id,...state.selected.map(r => r.entry_id)]);
      const version = state.row.version + 1;
      await db.execute("UPDATE masterlist_versions SET version=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?", [version,id]);
      const auditDetails = JSON.stringify({ selection: input.selection, reference: input.reference, fingerprint: input.fingerprint, academicYearId: state.row.academic_year_id, previousVersion: state.row.version, version,
        removedCount: state.selected.length, membershipBefore: state.membershipCount, membershipAfter: input.expectedRemaining, conflictsBefore: state.conflictCount, before: state.selected, after, idempotency_key: key });
      if (Buffer.byteLength(auditDetails) > 768 * 1024) throw new AuthError(409, "CONFLICT_REMOVAL_CAPACITY", "Complete audit evidence exceeds the bounded command size. Review a smaller selection; nothing was removed.");
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,'masterlist.remove-conflicts','masterlist',?,'remove-conflicts',?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(),id,actor,requestId,input.reason,
        auditDetails]);
      await db.execute("INSERT INTO masterlist_commands(actor_id,command_id,payload_hash,masterlist_id,resulting_version) VALUES(?,?,?,?,?)", [actor,key,hash,id,version]);
      return { id, version, removedCount: state.selected.length, remainingCount: input.expectedRemaining };
    });
  }
}
