import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { workingYear } from "../configuration/calendar.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { validationDetails } from "../validation-details.js";
import { header } from "./service.js";
import { loadCandidateSources, projectCandidate, MAX_SCOPE_ADDITIONS, MAX_SCOPE_MATCHES } from "./candidate-source.js";
import { activationReferences, ordinaryNewActivation, candidateFrom, candidateParams, excludeActivation } from "./activation-review.js";
import type { Access } from "../authorization/policy.js";
import type { SelectionCounts, SelectionItem, SelectionReview, SelectionScope, SelectionResult, ActivationConflictPage } from "./selection-model.js";

const reviewSecret = randomBytes(32); // No persistence/cache: restart requires fresh review; exact committed retries use the ledger.
const text = (min: number, max: number) => z.string().trim().min(min).max(max).regex(/^\P{Cc}*$/u);
const scopeSchema = z.object({ mode: z.enum(["all", "page"]), q: text(0, 100), scholarIds: z.array(z.uuid()).max(100) }).strict()
  .refine(s => new Set(s.scholarIds).size === s.scholarIds.length && (s.mode === "all" ? s.scholarIds.length === 0 : s.scholarIds.length > 0), "Select a unique page selection or the whole matching scope.")
  .transform(s => ({ ...s, scholarIds: [...s.scholarIds].sort() }));
const pageSchema = z.object({ offset: z.coerce.number().int().min(0).max(MAX_SCOPE_MATCHES).default(0), limit: z.coerce.number().int().min(1).max(100).default(25) });
const reviewQuery = pageSchema.extend({ mode: z.enum(["all", "page"]).default("all"), q: text(0, 100).default(""), ids: z.string().max(3699).default("") }).strict();
const commandSchema = z.object({ expectedVersion: z.number().int().positive(), expectedAdditions: z.number().int().min(1).max(MAX_SCOPE_ADDITIONS),
  selection: scopeSchema, fingerprint: z.string().regex(/^[a-f0-9]{64}$/), confirm: z.literal(true), reason: text(5, 500), reference: text(3, 300) }).strict();
const parse = <T>(schema: z.ZodType<T>, raw: unknown): T => { const r = schema.safeParse(raw); if (!r.success) throw new AuthError(422, "VALIDATION_FAILED", "Review the selection and provide its current version, confirmation and evidence.", validationDetails(r.error)); return r.data; };
const stale = (): never => { throw new AuthError(409, "SELECTION_CHANGED", "The draft, selection or its source evidence changed. Review the selection again; nothing was added."); };

async function loadState(db: PoolConnection, actor: Access, id: string, scope: SelectionScope) {
  const row = await header(db, id), working = await workingYear(db);
  if (!await ordinaryNewActivation(db, row)) throw new AuthError(409, "ORDINARY_DRAFT_REQUIRED", "Whole-scope preparation is available only for ordinary new-activation drafts.");
  if (row.status !== "draft" || row.locked_at || row.archived_at) throw new AuthError(423, "RECORD_LOCKED", "Review an editable draft in an unlocked academic year.");
  if (!working || working.yearId !== row.academic_year_id) throw new AuthError(409, "WORKING_YEAR_REQUIRED", "Whole-scope preparation uses the current working academic year. Review the draft year.");
  const [matching] = await db.execute<RowDataPacket[]>(`SELECT s.id ${candidateFrom} ORDER BY s.last_name,s.first_name,s.id LIMIT ${MAX_SCOPE_MATCHES + 1}`, candidateParams(scope.q, row.academic_year_id));
  if (matching.length > MAX_SCOPE_MATCHES) throw new AuthError(409, "SELECTION_CAPACITY", "More than 5,000 scholars match. Narrow the search before selecting.");
  const ids = matching.map(r => String(r.id)), sources = await loadCandidateSources(db, ids, row.academic_year_id), activations = await activationReferences(db, row.academic_year_id, ids);
  const [entries] = await db.execute<RowDataPacket[]>(`SELECT id,scholar_id,removed_at FROM masterlist_entries WHERE masterlist_id=? ORDER BY scholar_id LIMIT ${MAX_SCOPE_MATCHES + 1}`, [id]);
  if (entries.length > MAX_SCOPE_MATCHES) throw new AuthError(409, "SELECTION_CAPACITY", "This draft exceeds the supported membership review capacity.");
  const active = new Set(entries.filter(e => !e.removed_at).map(e => String(e.scholar_id))), counts: SelectionCounts = { matching: ids.length, eligible: 0, alreadyOnDraft: 0, activated: 0, blocked: 0 };
  const candidates = ids.map(id => excludeActivation(projectCandidate(id, sources.get(id) ?? { graduated: false }), activations.get(id)));
  const items: SelectionItem[] = candidates.map(c => {
    const category = active.has(c.scholarId) ? "alreadyOnDraft" : c.activationConflict?.masterlistId ? "activated" : c.issues.length || !c.snapshot ? "blocked" : "eligible";
    counts[category]++;
    return { scholarId: c.scholarId, humanId: c.humanId, name: c.name, category, reasons: c.issues.map(i => i.message), official: c.activationConflict ?? null };
  });
  const requested = new Set(scope.scholarIds);
  if (scope.mode === "page" && scope.scholarIds.some(id => !items.some(i => i.scholarId === id && i.category === "eligible"))) stale();
  const selected = items.filter(i => i.category === "eligible" && (scope.mode === "all" || requested.has(i.scholarId)));
  // Include the complete matching scope, not just still-addable IDs. A newly
  // eligible person, resolved blocker, membership or actor change invalidates it.
  const fingerprint = createHmac("sha256", reviewSecret).update(JSON.stringify({ actor: actor.userId, actorVersion: actor.version,
    draft: [row.id, row.academic_year_id, row.version, row.status], working, scope, entries, sources: ids.map(id => [id, sources.get(id)]), items })).digest("hex");
  return { row, sources, entries, counts, items, selected, fingerprint, candidates };
}

export class MasterlistSelectionService {
  constructor(private authorization: AuthorizationService) {}
  review(actor: string, rawId: unknown, rawQuery: unknown): Promise<SelectionReview> {
    const id = parseId(rawId), query = parse(reviewQuery, rawQuery), scope = parse(scopeSchema, { mode: query.mode, q: query.q, scholarIds: query.ids ? query.ids.split(",") : [] });
    return this.authorization.readSnapshot(actor, "masterlists.prepare", async (db, access) => {
      const state = await loadState(db, access, id, scope);
      const details = scope.mode === "page" ? state.items.filter(i => scope.scholarIds.includes(i.scholarId)) : state.items;
      return { draftId: id, academicYearId: state.row.academic_year_id, yearCode: state.row.year_code, version: state.row.version, scope,
        fingerprint: state.fingerprint, counts: state.counts, selectedAddable: state.selected.length,
        canAdd: state.selected.length > 0 && state.selected.length <= MAX_SCOPE_ADDITIONS,
        items: details.slice(query.offset, query.offset + query.limit), total: details.length, offset: query.offset, limit: query.limit,
        limits: { matching: MAX_SCOPE_MATCHES, additions: MAX_SCOPE_ADDITIONS } };
    });
  }

  add(actor: string, rawId: unknown, rawKey: unknown, rawBody: unknown, requestId: string): Promise<SelectionResult> {
    const id = parseId(rawId), key = parseKey(rawKey), input = parse(commandSchema, rawBody), hash = digest(JSON.stringify({ operation: "masterlist.add-scope", id, input }));
    return this.authorization.withPermission(actor, "masterlists.prepare", async (db, access) => {
      const [[prior]] = await db.execute<RowDataPacket[]>("SELECT payload_hash,masterlist_id,resulting_version FROM masterlist_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (prior) {
        if (prior.payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This request key belongs to another command.");
        return { id: prior.masterlist_id, version: prior.resulting_version, addedCount: input.expectedAdditions };
      }
      const state = await loadState(db, access, id, input.selection);
      if (state.row.version !== input.expectedVersion || state.fingerprint !== input.fingerprint) stale();
      if (state.selected.length > MAX_SCOPE_ADDITIONS) throw new AuthError(409, "SELECTION_CAPACITY", "Add at most 1,500 reviewed scholars in one operation. Narrow the search.");
      if (state.selected.length !== input.expectedAdditions) stale();
      const additions = state.selected.map(i => {
        const source = state.sources.get(i.scholarId)!;
        return { scholarId: i.scholarId, source, snapshot: projectCandidate(i.scholarId, source).snapshot!, entryId: state.entries.find(e => e.scholar_id === i.scholarId)?.id ?? randomUUID(), restoring: state.entries.some(e => e.scholar_id === i.scholarId) };
      });
      // Preserve accepted Continuing preparation, including its original audit
      // meaning, in batches inside this same transaction. Nothing is selected,
      // activated or published by creating a Continuing annual record.
      for (let n = 0; n < additions.length; n += 100) {
        const chunk = additions.slice(n, n + 100), missing = chunk.filter(a => !a.source.annual);
        if (missing.length) {
          const values: (string | number | null)[] = [], audit: (string | number | null)[] = [];
          for (const item of missing) {
            const annualId = randomUUID(), baseline = item.source.baseline!;
            if (!baseline || item.source.sourceIssue) stale();
            values.push(annualId, item.scholarId, state.row.academic_year_id, baseline.effective_on, baseline.id);
            audit.push(randomUUID(), annualId, actor, requestId, JSON.stringify({ scholarId: item.scholarId, academicYearId: state.row.academic_year_id, participationId: baseline.id, admissionEventId: baseline.event_id }));
            item.source.annual = { id: annualId, status: "continuing", version: 1, continuing_participation_id: baseline.id } as RowDataPacket;
            item.snapshot = projectCandidate(item.scholarId, item.source).snapshot!;
          }
          await db.execute(`INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,version,last_effective_on,continuing_participation_id,created_at,updated_at) VALUES ${missing.map(() => "(?,?,?,'continuing',1,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))").join(",")}`, values);
          await db.execute(`INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES ${missing.map(() => "(?,'scholarship.continuing-prepared','scholarship_record',?,'prepare',?,'user',UTC_TIMESTAMP(6),?,'Accepted continuing roster used for annual masterlist review',?)").join(",")}`, audit);
        }
        const fresh = chunk.filter(i => !i.restoring);
        if (fresh.length) await db.execute(`INSERT INTO masterlist_entries(id,masterlist_id,scholar_id,snapshot,award_number,created_at,updated_at) VALUES ${fresh.map(() => "(?,?,?,?,NULL,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))").join(",")}`, fresh.flatMap(i => [i.entryId, id, i.scholarId, JSON.stringify(i.snapshot)]));
        const restored = chunk.filter(i => i.restoring);
        if (restored.length) await db.execute(`UPDATE masterlist_entries SET snapshot=CASE id ${restored.map(() => "WHEN ? THEN ?").join(" ")} END,award_number=NULL,removed_at=NULL,updated_at=UTC_TIMESTAMP(6) WHERE masterlist_id=? AND id IN (${restored.map(() => "?").join(",")})`, [...restored.flatMap(i => [i.entryId, JSON.stringify(i.snapshot)]), id, ...restored.map(i => i.entryId)]);
      }
      const version = state.row.version + 1;
      await db.execute("UPDATE masterlist_versions SET version=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?", [version, id]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES (?,'masterlist.add-scope','masterlist',?,'add-scope',?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), id, actor, requestId, input.reason,
        JSON.stringify({ selection: input.selection, reference: input.reference, fingerprint: input.fingerprint, counts: state.counts, addedCount: additions.length, version,
          added: additions.map(i => ({ scholarId: i.scholarId, entryId: i.entryId, sourceHash: digest(JSON.stringify(i.snapshot)) })), idempotency_key: key })]);
      await db.execute("INSERT INTO masterlist_commands(actor_id,command_id,payload_hash,masterlist_id,resulting_version) VALUES(?,?,?,?,?)", [actor, key, hash, id, version]);
      return { id, version, addedCount: additions.length };
    });
  }

  conflicts(actor: string, rawId: unknown, rawQuery: unknown): Promise<ActivationConflictPage> {
    const id = parseId(rawId), page = parse(pageSchema.strict(), rawQuery);
    return this.authorization.readSnapshot(actor, "masterlists.prepare", async (db) => {
      const row = await header(db, id);
      if (!await ordinaryNewActivation(db, row)) return { applicable: false, draftId: id, yearCode: row.year_code, total: 0, items: [], ...page };
      const from = `FROM masterlist_entries e JOIN scholars s ON s.id=e.scholar_id LEFT JOIN scholar_identifiers i ON i.scholar_id=s.id
        JOIN scholarship_records r ON r.id=JSON_UNQUOTE(JSON_EXTRACT(e.snapshot,'$.scholarshipId')) AND r.scholar_id=e.scholar_id AND r.academic_year_id=?
        LEFT JOIN masterlist_activations a ON a.scholarship_id=r.id LEFT JOIN masterlist_versions m ON m.id=a.masterlist_id
        WHERE e.masterlist_id=? AND e.removed_at IS NULL AND (a.scholarship_id IS NOT NULL OR r.operational_status IS NOT NULL)`;
      const [[count]] = await db.execute<RowDataPacket[]>(`SELECT COUNT(*) n ${from}`, [row.academic_year_id, id]);
      const [rows] = await db.execute<RowDataPacket[]>(`SELECT e.scholar_id,i.human_id,CONCAT_WS(' ',s.last_name,s.first_name,s.middle_name,s.suffix) name,a.masterlist_id,m.title,DATE_FORMAT(a.effective_on,'%Y-%m-%d') effective_on ${from} ORDER BY s.last_name,s.first_name,s.id LIMIT ? OFFSET ?`, [row.academic_year_id, id, page.limit, page.offset]);
      return { applicable: true, draftId: id, yearCode: row.year_code, total: Number(count.n), ...page, items: rows.map(r => ({ scholarId: r.scholar_id, humanId: r.human_id, name: r.name,
        official: { masterlistId: r.masterlist_id ?? null, title: r.title ?? null, yearCode: row.year_code, effectiveOn: r.effective_on ?? null },
        reason: r.masterlist_id ? "Already activated. Review the existing official Masterlist; do not activate again." : "Operational standing requires review before a new activation." })) };
    });
  }
}
