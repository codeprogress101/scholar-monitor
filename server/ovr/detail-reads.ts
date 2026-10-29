import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { Access } from "../authorization/policy.js";
import { AuthError } from "../auth/service.js";
import { cachedReads } from "../read-cache.js";
import { requireManagedReview } from "./rules.js";
import { requirePreparationOpen } from "../payouts/preparation.js";
import { requireOpenPayout } from "../payouts/service.js";
import { requireClaimOpen } from "./reprocessing.js";
import { currentPayout } from "../payouts/service.js";
import type { PayoutCycle } from "../payouts/model.js";
import { parseRequirementList } from "../requirements/validation.js";
import { candidateReads } from "./candidate-reads.js";
import { ovrEntries, validateOvr } from "./service.js";
import { decodeStoredJson } from "../stored-json.js";
import { amendments, effectiveRoster } from "./amendment-state.js";
import { paymentRecords, reconcilePayments } from "./processing-state.js";
import { paymentCorrections } from "./payment-correction-state.js";
import {individualClaims} from '../payments/settlement-reads.js';
import { managedCandidates } from "./managed-payroll.js";
import { automaticDraft } from "./automatic-draft.js";
import { managedRelease, managedAllocationIds } from "./managed-release.js";
import { claimDeadline, draftDeferral, reprocessingQueue, retryCandidates, semesterClaim } from "./reprocessing.js";
import { treasuryEvidence, historicalReceipts } from "./treasury-state.js";
import type { OvrBatch } from "./model.js";
import type { OvrSummary, OvrBase, OvrSections, OvrCandidatePage, OvrEntryPage, OvrHistoryRow } from "./detail-model.js";
import {historicalRoster} from '../payouts/historical-context.js';

// Compressed envelopes retain scalar metadata. Never expand their evidence just
// to display a heading, and never describe this metadata as validated evidence.
const lightSnapshot = "JSON_REMOVE(snapshot,'$.data','$.encoding','$.sha256','$.references','$.validation','$.entry')";
const json = <T>(v: string | T): T => typeof v === "string" ? JSON.parse(v) : v;
export async function batchMetadata(db: PoolConnection, id: string): Promise<OvrBatch> {
  const [[row]] = await db.execute<RowDataPacket[]>(`SELECT ${lightSnapshot} AS snapshot FROM ovr_batch_events WHERE batch_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE`, [id]);
  if (!row) throw new AuthError(404, "OVR_NOT_FOUND", "Payroll batch not found.");
  const batch = json<OvrBatch>(row.snapshot);
  if (!batch.submission && ["review", "finalized", "submitted", "processed", "closed"].includes(batch.state)) {
    const [[submitted]] = await db.execute<RowDataPacket[]>(`SELECT ${lightSnapshot} AS snapshot FROM ovr_batch_events WHERE batch_id=? AND action='submit-review' AND revision<=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE`, [id, batch.revision]);
    if (submitted) {
      const source = json<OvrBatch>(submitted.snapshot);
      if (source.actorId) batch.submission = { actorId: source.actorId, actorName: source.actorName, submittedAt: source.recordedAt, revision: source.revision };
    }
  }
  return batch;
}
export async function detailBase(db: PoolConnection, id: string): Promise<OvrBase & { managedBatch: boolean }> {
  const batch = await batchMetadata(db, id), cycle = await currentPayout(db, batch.cycleId);
  const [[window]] = await db.execute<RowDataPacket[]>("SELECT batch_id FROM payroll_submission_windows WHERE batch_id=?", [id]);
  return { batch, cycle, managedBatch: Boolean(window), canEdit: Boolean(window) && batch.state === "draft" && cycle.state === "open" && !cycle.periodUnavailable };
}
export async function payrollSummary(db: PoolConnection, id: string, access: Access): Promise<OvrSummary> {
  const base = await detailBase(db, id);
  const [[counts]] = await db.execute<RowDataPacket[]>(`SELECT
    (SELECT COUNT(*) FROM scholarship_records WHERE academic_year_id=?) AS annuals,
    (SELECT COUNT(*) FROM ovr_entries e WHERE e.batch_id=? AND e.action='add' AND NOT EXISTS(SELECT 1 FROM ovr_entries newer WHERE newer.batch_id=e.batch_id AND newer.scholarship_id=e.scholarship_id AND newer.batch_revision>e.batch_revision)) AS saved`, [base.cycle.academicYearId, id]);
  const [[frozen]] = await db.execute<RowDataPacket[]>(`SELECT f.entry_count,f.snapshot_hash,
    JSON_UNQUOTE(JSON_EXTRACT(f.snapshot,'$.finalizedAt')) AS finalized,
    JSON_UNQUOTE(JSON_EXTRACT(f.snapshot,'$.finalizedByName')) AS actor_name,
    CASE WHEN a.id IS NULL THEN f.entry_count ELSE JSON_LENGTH(a.snapshot,'$.after.entries') END AS current_count
    FROM ovr_finalizations f LEFT JOIN ovr_amendments a ON a.batch_id=f.batch_id AND a.state='approved'
      AND NOT EXISTS(SELECT 1 FROM ovr_amendments newer WHERE newer.batch_id=a.batch_id AND newer.state='approved' AND newer.batch_revision>a.batch_revision)
    WHERE f.batch_id=?`, [id]);
  const can = (permission: string) => access.permissions.some(p => p.code === permission);
  const available = base.cycle.state === "open" && !base.cycle.periodUnavailable;
  return { ...base, annualScopeCount: Number(counts.annuals), savedEntryCount: Number(counts.saved),
    frozen: frozen ? { count: frozen.current_count === null ? null : Number(frozen.current_count), originalCount: Number(frozen.entry_count), hash: String(frozen.snapshot_hash), finalizedAt: frozen.finalized ?? null, finalizedByName: frozen.actor_name ?? null } : null,
    sourceValidation: "not_loaded", actions: {
      submitReview: can("ovr.prepare") && base.canEdit,
      finalize: can("ovr.finalize") && available && base.batch.state === "review",
      process: can("ovr.process") && ["open", "locked"].includes(base.cycle.state) && !base.cycle.periodUnavailable,
      close: can("ovr.close") && ["open", "locked"].includes(base.cycle.state) && !base.cycle.periodUnavailable,
    } };
}

/** Full detail is an explicit compatibility/evidence read. Its raw source cache
 * belongs to this snapshot only; financial commands never call this projection. */
export async function detailConnection(connection: PoolConnection, cycle: PayoutCycle) {
  const [annuals] = await connection.execute<RowDataPacket[]>("SELECT id,scholar_id FROM scholarship_records WHERE academic_year_id=? ORDER BY id", [cycle.academicYearId]);
  const groups: string[][] = [], membership = new Map<string, number>();
  for (let offset = 0; offset < annuals.length; offset += 100) {
    const rows = annuals.slice(offset, offset + 100), index = groups.length;
    groups.push(rows.map(r => String(r.id)));
    for (const row of rows) { membership.set(String(row.id), index); membership.set(String(row.scholar_id), index); }
  }
  let active = -1, scoped = cachedReads(connection);
  // Full evidence reads still use the original validators. Retain only one raw
  // source window at a time, rather than the whole cohort's bulk source graphs.
  // Unknown identities/query shapes fall through through the existing adapter.
  return new Proxy(connection, {get(target, method) {
    if (method !== "execute" && method !== "query") { const value = Reflect.get(target, method); return typeof value === "function" ? value.bind(target) : value; }
    return async (sql: string, values?: unknown[]) => {
      const group = values?.flatMap(v => typeof v === "string" && membership.has(v) ? [membership.get(v)!] : [])[0];
      if (group !== undefined && group !== active) {
        scoped = await candidateReads(cachedReads(connection), groups[group], cycle.semesterId); active = group;
      }
      const run = scoped[method].bind(scoped) as (sql: string, values?: unknown[]) => Promise<unknown>;
      return run(sql, values);
    };
  }});
}

/** Same claim projection as semesterClaim, with shared semester payment/history
 * reads and bounded identity lookups instead of re-decoding them per member. */
export async function semesterClaims(db: PoolConnection, ids: readonly string[], semester: string) {
  type Claim = Awaited<ReturnType<typeof semesterClaim>>;
  const result = new Map<string, Claim>(ids.map(id => [id, { attempts: [], paid: null, pending: [] }]));
  if (!ids.length) return result;
  const selected = [...new Set(ids)];
  const aliases = new Map<string, string[]>();
  for (let offset = 0; offset < selected.length; offset += 200) {
    const chunk = selected.slice(offset, offset + 200);
    const [rows] = await db.execute<RowDataPacket[]>(`SELECT origin.id AS target_id,r.id AS annual_id FROM scholarship_records r JOIN scholarship_records origin ON origin.scholar_id=r.scholar_id WHERE origin.id IN (${chunk.map(() => "?").join(",")})`, chunk);
    for (const row of rows) { const group = aliases.get(row.annual_id) ?? []; group.push(row.target_id); aliases.set(row.annual_id, group); }
  }
  // Keep the original query/order: first paid attempt remains the same one.
  const [batches] = await db.execute<RowDataPacket[]>("SELECT DISTINCT b.id FROM ovr_batches b JOIN payout_cycles c ON c.id=b.cycle_id JOIN ovr_finalizations f ON f.batch_id=b.id WHERE c.semester_id=?", [semester]);
  for (const b of batches) {
    const [[batch]] = await db.execute<RowDataPacket[]>("SELECT cycle_id,code FROM ovr_batches WHERE id=?", [b.id]);
    for (const payment of await paymentRecords(db, b.id)) for (const id of aliases.get(payment.scholarshipId) ?? []) {
      const claim = result.get(id)!;
      const attempt = { ...payment, batchId: b.id as string, cycleId: String(batch.cycle_id), batchCode: String(batch.code) };
      claim.attempts.push(attempt); if (!claim.paid && payment.outcome === "paid") claim.paid = attempt;
    }
    for (const correction of await paymentCorrections(db, b.id)) if (correction.state === "pending")
      for (const id of aliases.get(correction.before.scholarshipId) ?? []) result.get(id)!.pending.push(correction);
  }
  const individual=await individualClaims(db,selected,semester);
  for(const id of selected){const claim=result.get(id)!;for(const p of individual.attempts.get(id)??[]){const attempt={...p,batchCode:'Individual '+(p.sourceKindDetail==='unclaimed'?'DV':'OR + DV')};claim.attempts.push(attempt);if(!claim.paid&&p.outcome==='paid')claim.paid=attempt;}claim.pending.push(...individual.pending.get(id)??[]);}
  return result;
}
export async function semesterPaymentRows(db: PoolConnection, ids: readonly string[], semester: string) {
  const claims = await semesterClaims(db, ids, semester);
  return ids.map(scholarshipId => { const claim = claims.get(scholarshipId)!; return { scholarshipId, paidBatchId: claim.paid?.batchId ?? null, paidCycleId: claim.paid?.cycleId ?? null, paymentId: claim.paid?.id ?? null, pendingCorrection: claim.pending.length > 0,...(claim.paid&&'individualTransactionId' in claim.paid?{paidTransactionId:claim.paid.individualTransactionId}:{}) }; });
}

/** Latest modern decision wins, including Restore; legacy rows apply only when
 * no modern event exists. Writes keep using the original single-record guard. */
export async function draftDeferrals(db: PoolConnection, batchId: string, ids: readonly string[]) {
  const result = new Map<string, Awaited<ReturnType<typeof draftDeferral>>>();
  const selected = [...new Set(ids)];
  for (let offset = 0; offset < selected.length; offset += 200) {
    const chunk = selected.slice(offset, offset + 200), marks = chunk.map(() => "?").join(",");
    const [modern] = await db.execute<RowDataPacket[]>(`SELECT scholarship_id,revision,action,reason,actor_id,recorded_at FROM payroll_draft_deferrals WHERE batch_id=? AND scholarship_id IN (${marks}) ORDER BY revision DESC`, [batchId, ...chunk]);
    const [legacy] = await db.execute<RowDataPacket[]>(`SELECT scholarship_id,revision,reason,actor_id,recorded_at FROM payroll_deferrals WHERE batch_id=? AND scholarship_id IN (${marks}) ORDER BY revision DESC`, [batchId, ...chunk]);
    for (const row of [...modern, ...legacy]) if (!result.has(row.scholarship_id)) result.set(row.scholarship_id, {revision:Number(row.revision),reason:String(row.reason),actorId:String(row.actor_id),recordedAt:new Date(row.recorded_at).toISOString(),current:row.action!=="restore"});
  }
  return result;
}

export async function readOvrSection<K extends keyof OvrSections>(connection: PoolConnection, id: string, section: K): Promise<OvrSections[K]> {
  let db = cachedReads(connection);
  const { managedBatch, ...base } = await detailBase(db, id), { batch, cycle } = base;
  let result: OvrSections[keyof OvrSections];
  if (section === "candidates") {
    const effective = await effectiveRoster(db, id);
    result = { ...base, finalization: effective, entries: effective?.snapshot.entries ?? await ovrEntries(db, id), managed: effective ? null : await managedCandidates(db, batch, cycle), automatic: effective ? null : await automaticDraft(db, batch, cycle) };
  } else if (section === "validation") {
    db = await detailConnection(db, cycle);
    const entries = (await effectiveRoster(db, id))?.snapshot.entries ?? await ovrEntries(db, id);
    result = { ...base, entries, validation: await validateOvr(db, batch, cycle, entries) };
  } else if (section === "reprocessing") {
    // Actual deferrals only; no full-year empty-event probes for this section.
    const [annuals] = await db.execute<RowDataPacket[]>(`SELECT DISTINCT r.id,s.first_name,s.last_name FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id WHERE r.academic_year_id=? AND (EXISTS(SELECT 1 FROM payroll_draft_deferrals d WHERE d.batch_id=? AND d.scholarship_id=r.id) OR EXISTS(SELECT 1 FROM payroll_deferrals d WHERE d.batch_id=? AND d.scholarship_id=r.id)) ORDER BY r.id`, [cycle.academicYearId, id, id]);
    const deferrals = [];
    const decisions = await draftDeferrals(db,id,annuals.map(a=>String(a.id)));
    for (const a of annuals) { const d = decisions.get(a.id); if (d?.current) deferrals.push({ scholarshipId: String(a.id), name: `${a.last_name}, ${a.first_name}`, reason: d.reason }); }
    result = { ...base, entries: await ovrEntries(db, id), automatic: managedBatch ? null : await automaticDraft(db, batch, cycle), managed: null, deferrals, payments: await paymentRecords(db, id), reprocessing: await reprocessingQueue(db, cycle) };
  } else {
    const effectiveFinalization = await effectiveRoster(db, id);
    if (section === "amendments") result = { ...base, effectiveFinalization, amendments: await amendments(db, id) };
    else {
      const payments = await paymentRecords(db, id), reconciliation = reconcilePayments(effectiveFinalization?.snapshot ?? null, payments);
      if (section === "reconciliation") result = { ...base, reconciliation };
      else {
        const deadline = await claimDeadline(db, cycle.semesterId);
        if (section === "corrections") result = { ...base, effectiveFinalization, managedRelease: Boolean(effectiveFinalization && (managedBatch || (await managedAllocationIds(db,id)).length)), payments, reconciliation, claimDeadline: deadline, originalPayments: await paymentRecords(db, id, true), paymentCorrections: await paymentCorrections(db, id) };
        else {
          db = await detailConnection(db, cycle);
          const releases = effectiveFinalization ? await managedRelease(db, id) : null;
          result = { ...base, effectiveFinalization, releases, payments, reconciliation, claimDeadline: deadline, amendments: await amendments(db, id), treasuryEvidence: await treasuryEvidence(db, id), historicalReceipts: await historicalReceipts(db, id), semesterPayments: await semesterPaymentRows(db, (effectiveFinalization?.snapshot.entries ?? await ovrEntries(db,id)).map(e => e.scholarshipId), cycle.semesterId) };
        }
      }
    }
  }
  return result as OvrSections[K];
}

export async function candidatePage(connection: PoolConnection, id: string, raw: unknown): Promise<OvrCandidatePage> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AuthError(422,"VALIDATION_FAILED","Provide a bounded payroll page query.");
  const supplied = raw as Record<string, unknown>;
  const {view, ...pagination} = supplied;
  if (view !== undefined && view !== "included" && view !== "excluded") throw new AuthError(422, "VALIDATION_FAILED", "Choose included or excluded scholars.");
  const q = parseRequirementList(pagination), db = cachedReads(connection), base = await detailBase(db, id);
  if ((await db.execute<RowDataPacket[]>("SELECT batch_id FROM ovr_finalizations WHERE batch_id=?", [id]))[0].length)
    throw new AuthError(409, "PAYROLL_FROZEN", "This payroll has frozen membership. Open the saved roster instead of current candidates.");
  if (view) {
    // Assess authoritative sources in this request's consistent snapshot. Only
    // the requested bounded page leaves the server; no cached eligibility or
    // client-side whole-cohort table is used. Commands still revalidate in full.
    const assessed = await managedCandidates(db, base.batch, base.cycle);
    if (!assessed) throw new AuthError(409,"MANAGED_PAYROLL_REQUIRED","Open the existing complete review for this payroll.");
    const included = (item: typeof assessed.items[number]) => item.eligible && !item.deferred?.current;
    const members = assessed.items.filter(item => view === "included" ? included(item) : !included(item));
    const matches = members.filter(item => `${item.evidence.current.sources.scholarship.name} ${item.evidence.current.sources.scholarship.humanId}`.toLocaleLowerCase().includes(q.q.toLocaleLowerCase()));
    const includedCount = assessed.form.rows.length;
    return {batchRevision:base.batch.revision,items:matches.slice(q.offset,q.offset+q.limit),total:matches.length,offset:q.offset,limit:q.limit,scope:"annual_records",fullReviewRequired:false,view,
      review:{reviewBlocker:await reviewBlocker(db,base,assessed,"submit-review"),finalizeBlocker:await reviewBlocker(db,base,assessed,"finalize"),sourceHash:assessed.sourceHash,includedCount,pendingCount:assessed.pendingCount,excludedCount:assessed.items.length-includedCount,deferredCount:assessed.items.filter(i=>i.deferred?.current).length,matchingCount:assessed.items.length,cutoffOn:assessed.cutoffOn,cutoffPolicy:assessed.cutoffPolicy,cutoffLocalTime:assessed.cutoffLocalTime,cutoffAtUtc:assessed.cutoffAtUtc,finalizationFromUtc:assessed.finalizationFromUtc,cutoffReached:assessed.cutoffReached}};
  }
  const historical=await historicalRoster(db,base.cycle.id,id);
  const where = "r.academic_year_id=? AND (LOCATE(?,CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')))>0 OR LOCATE(?,i.human_id)>0)"+(historical?` AND r.scholar_id IN (${historical.map(()=>'?').join(',')})`:'');
  const from = "FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id LEFT JOIN scholar_identifiers i ON i.scholar_id=s.id";
  const values = [base.cycle.academicYearId, q.q, q.q,...historical??[]];
  const [[count]] = await db.execute<RowDataPacket[]>(`SELECT COUNT(*) AS n ${from} WHERE ${where}`, values);
  const [annuals] = await db.execute<RowDataPacket[]>(`SELECT r.id ${from} WHERE ${where} ORDER BY ${base.managedBatch ? "r.id" : "s.last_name,s.first_name,r.id"} LIMIT ${q.limit} OFFSET ${q.offset}`, values);
  // Preserve append-only retry membership from other annual years as well.
  const [outside] = await db.execute<RowDataPacket[]>("SELECT DISTINCT q.scholarship_id FROM payroll_reprocessing q JOIN scholarship_records r ON r.id=q.scholarship_id WHERE q.semester_id=? AND r.academic_year_id<>?", [base.cycle.semesterId, base.cycle.academicYearId]);
  const outsideRetries = historical?[]:await retryCandidates(db, base.batch, base.cycle, outside.map(r => String(r.scholarship_id)));
  const extras = new Map(outsideRetries.filter(r => `${r.evidence.current.sources.scholarship.name} ${r.evidence.current.sources.scholarship.humanId}`.toLocaleLowerCase().includes(q.q.toLocaleLowerCase())).map(r => [r.scholarshipId, r]));
  const extraPage = [...extras.values()].slice(Math.max(0, q.offset - Number(count.n)), Math.max(0, q.offset + q.limit - Number(count.n)));
  const ids = [...annuals.map(r => String(r.id)), ...extraPage.map(r => r.scholarshipId)];
  const partial = await managedCandidates(db, base.batch, base.cycle, ids);
  let items: OvrCandidatePage["items"];
  if (partial) items = partial.items;
  else {
    const automatic = await automaticDraft(db, base.batch, base.cycle, ids);
    items = automatic?.entries.map(e => ({ scholarshipId: e.scholarshipId, evidence: e.evidence, eligible: true, pending: false, deferred: null, issues: [], row: automatic.form.rows.find(r => r.scholarshipId === e.scholarshipId) ?? null })) ?? [];
  }
  return { batchRevision: base.batch.revision, items, total: Number(count.n) + extras.size, offset: q.offset, limit: q.limit, scope: "annual_records", fullReviewRequired: true };
}

export async function entryPage(db: PoolConnection, id: string, raw: unknown): Promise<OvrEntryPage> {
  const q = parseRequirementList(raw);
  const roster = await effectiveRoster(db, id);
  if (roster) {
    const entries = roster.snapshot.entries.filter(e => `${e.evidence.current.sources.scholarship.name} ${e.evidence.current.sources.scholarship.humanId}`.toLocaleLowerCase().includes(q.q.toLocaleLowerCase()));
    return { entries: entries.slice(q.offset, q.offset + q.limit), total: entries.length, offset: q.offset, limit: q.limit, frozenHash: roster.hash };
  }
  const entries = (await ovrEntries(db, id)).filter(e => `${e.evidence.current.sources.scholarship.name} ${e.evidence.current.sources.scholarship.humanId}`.toLocaleLowerCase().includes(q.q.toLocaleLowerCase()));
  return { entries: entries.slice(q.offset, q.offset + q.limit), total: entries.length, offset: q.offset, limit: q.limit, frozenHash: null };
}

export async function historyPage(db: PoolConnection, id: string, raw: unknown) {
  const q = parseRequirementList(raw);
  const [[count]] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM ovr_batch_events WHERE batch_id=?", [id]);
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT snapshot FROM ovr_batch_events WHERE batch_id=? ORDER BY revision DESC LIMIT ${q.limit} OFFSET ${q.offset}`, [id]);
  // Decode only the requested history page, then return its metadata rather
  // than expanding every historical validation in the HTTP response.
  const items: OvrHistoryRow[] = rows.map(r => {
    const { validation, ...batch } = decodeStoredJson<OvrBatch>(r.snapshot);
    return { ...batch, ...(validation ? {validation:{valid:validation.valid,checkedAt:validation.checkedAt}} : {}) };
  });
  return { items, total: Number(count.n), offset: q.offset, limit: q.limit };
}

// Availability uses the same source/period guards as the command. Authorization
// and version/hash checks are always repeated in the guarded write transaction.
async function reviewBlocker(db:PoolConnection,base:OvrBase,candidates:NonNullable<Awaited<ReturnType<typeof managedCandidates>>>,action:"submit-review"|"finalize") {
  try {
    requireOpenPayout(base.cycle);
    await requirePreparationOpen(db,base.cycle.id);
    await requireClaimOpen(db,base.cycle.semesterId);
    requireManagedReview(action,candidates);
    return null;
  } catch(e) {
    if (!(e instanceof AuthError)) throw e;
    return {code:e.code,message:e.message};
  }
}
