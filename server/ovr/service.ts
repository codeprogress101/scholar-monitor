import {cutoffPolicy,windowCutoffReached} from "../payouts/cutoff-policy.js";
import { readCompleteOvrDetail } from "./complete-detail.js";
import { cachedReads } from "../read-cache.js";
import { payrollSummary, candidatePage, entryPage, historyPage, readOvrSection, batchMetadata } from "./detail-reads.js";
import type { OvrSections } from "./detail-model.js";
import { cohortReads } from "../eligibility/cohort-reads.js";
import { candidateReads } from "./candidate-reads.js";
import {encodeStoredJson,decodeStoredJson} from "../stored-json.js";
import { hydratePaymentEvents } from "../payments/processing-evidence.js";
import { requireNumberedPayroll } from "./legacy-boundary.js";
import { assertPayrollRoster, amendFrozenForm } from "./amended-form.js";
import { claimDeadline, requireClaimOpen, assertNoPaidClaim, draftDeferral, writeDeferral, reprocessingQueue, retryEvidence, assignRetry, queueUnclaimed, UNPAID_REASONS } from "./reprocessing.js";
import { assertNoIndividualRoute } from "../payments/individual-writes.js";
import { automaticDraft } from "./automatic-draft.js";
import {requirePreparationOpen} from '../payouts/preparation.js';
import { managedCandidates, candidateEntries, allocatePayroll } from "./managed-payroll.js";
import { renderPayrollWord } from "./payroll-word.js";
import { payrollSignatories, renderPayroll } from "./payroll-form.js";
import { validationDetails } from "../validation-details.js";
import { paymentCorrections } from "./payment-correction-state.js";
import { effectiveRoster } from "./amendment-state.js";
import { paymentRecords } from "./processing-state.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { requireManagedReview } from "./rules.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { parseRequirementList } from "../requirements/validation.js";
import { currentPayout, requireOpenPayout } from "../payouts/service.js";
import type { PayoutCycle } from "../payouts/model.js";
import { eligibilityView } from "../eligibility/service.js";
import {
  ovrEligibilityIssues,
  ovrEvidence,
  requireDraft,
  ovrWorkflowState,
} from "./rules.js";
import type {
  OvrBatch,
  OvrDetail,
  OvrEntry,
  OvrValidation,
  OvrEvidence,
  OvrFinalization,
} from "./model.js";
const decode = <T>(v: string | T): T =>
  decodeStoredJson<T>(v);
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^\P{Cc}*$/u);
const common = {
  expectedRevision: z.number().int().min(0),
  expectedSourceHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  reason: text(5, 500),
  reference: text(3, 300),
};
const schemas = {
  create: z
    .object({
      ...common,
      code: text(1, 60)
        .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
        .transform((s) => s.toUpperCase()),
      name: text(2, 160),
      expectedCycleVersion: z.number().int().positive(),
    })
    .strict(),
  add: z.object({ ...common, scholarshipId: z.string().uuid() }).strict(),
  remove: z.object({ ...common, scholarshipId: z.string().uuid() }).strict(),
  validate: z.object(common).strict(),
  "submit-review": z.object(common).strict(),
  "return-to-draft": z.object(common).strict(),
  finalize: z.object(common).strict(),
  defer: z.object({ ...common, reference: text(3,300).default("Coordinator draft deferral"), scholarshipId: z.uuid() }).strict(),
  restore: z.object({ ...common, reference: text(3,300).default("Coordinator draft restoration"), scholarshipId: z.uuid() }).strict(),
};
export type OvrAction = keyof typeof schemas;
export function parseOvr(action: OvrAction, raw: unknown) {
  const r = schemas[action].safeParse(raw);
  if (!r.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Provide the current Payroll revision, reason, reference and required command fields.",
      validationDetails(r.error),
    );
  return r.data;
}
export async function ovrHistory(
  db: PoolConnection,
  id: string,
): Promise<OvrBatch[]> {
  const [r] = await db.execute<RowDataPacket[]>(
    "SELECT snapshot FROM ovr_batch_events WHERE batch_id=? ORDER BY revision DESC LOCK IN SHARE MODE",
    [id],
  );
  if (!r.length)
    throw new AuthError(404, "OVR_NOT_FOUND", "Payroll batch not found.");
  return hydratePaymentEvents(r.map((v) => decode<OvrBatch>(v.snapshot)));
}
export async function ovrEntries(
  db: PoolConnection,
  id: string,
): Promise<OvrEntry[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT * FROM ovr_entries WHERE batch_id=? ORDER BY batch_revision DESC LOCK IN SHARE MODE",
    [id],
  );
  // Project only current locking reads; a nested MAX can use an older MVCC snapshot.
  const seen = new Set<string>();
  return rows
    .filter((r) => {
      if (seen.has(r.scholarship_id)) return false;
      seen.add(r.scholarship_id);
      return r.action === "add";
    })
    .reverse()
    .map((r) => ({
      scholarshipId: r.scholarship_id,
      addedRevision: r.batch_revision,
      evidence: decode<OvrEvidence>(r.evidence),
    }));
}
async function duplicate(
  db: PoolConnection,
  cycleId: string,
  annualId: string,
  exclude: string | null,
) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT e.batch_id,e.action FROM ovr_entries e JOIN ovr_batches b ON b.id=e.batch_id WHERE b.cycle_id=? AND e.scholarship_id=? AND (? IS NULL OR e.batch_id<>?) ORDER BY e.batch_revision DESC LOCK IN SHARE MODE",
    [cycleId, annualId, exclude, exclude],
  );
  const seen = new Set<string>();
  return rows.some((r) => {
    if (seen.has(r.batch_id)) return false;
    seen.add(r.batch_id);
    return r.action === "add";
  });
}
export async function validateOvr(
  db: PoolConnection,
  batch: OvrBatch,
  cycle: PayoutCycle,
  entries: OvrEntry[],
): Promise<OvrValidation> {
  db = await cohortReads(db, cycle.academicYearId, cycle.semesterId, cycle.id);
  const result: OvrValidation = {
    valid: false,
    checkedAt: new Date().toISOString(),
    issues: [],
    entries: [],
  };
  if (!entries.length)
    result.issues.push({
      code: "EMPTY_BATCH",
      message: "Add at least one eligible scholar.",
    });
  if (cycle.state !== "open" || cycle.periodUnavailable)
    result.issues.push({
      code: "PAYOUT_UNAVAILABLE",
      message:
        "The payout cycle and academic period must be open and available.",
    });
  if ((await claimDeadline(db, cycle.semesterId)).expired) result.issues.push({code:"CLAIM_PERIOD_ENDED",message:"The semester claim period has ended."});
  for (const entry of entries) {
    if ((await draftDeferral(db,batch.id,entry.scholarshipId))?.current) result.issues.push({code:"DRAFT_ENTRY_DEFERRED",message:"Restore the deferred scholar before submitting this draft."});
    if (entry.evidence.reprocessing) {
      const issues: OvrValidation["issues"] = [];
      let evidence = entry.evidence;
      try { const retry = await retryEvidence(db,batch,cycle,entry); evidence = retry.evidence; if(evidence.fingerprint!==entry.evidence.fingerprint) issues.push({code:"OVR_ENTRY_STALE",message:"Reprocessing evidence changed; return to Draft."}); }
      catch(e) { if(e instanceof AuthError) issues.push({code:e.code,message:e.message}); else throw e; }
      result.entries.push({scholarshipId:entry.scholarshipId,evidence,issues});result.issues.push(...issues);continue;
    }
    const view = await eligibilityView(db, cycle, entry.scholarshipId, batch.id),
      evidence = ovrEvidence(view),
      issues = ovrEligibilityIssues(view);
    if (evidence.fingerprint !== entry.evidence.fingerprint)
      issues.push({
        code: "OVR_ENTRY_STALE",
        message:
          "Entry sources changed. Review, remove and re-add the entry to capture current evidence.",
        scholarshipId: entry.scholarshipId,
      });
    if (await duplicate(db, cycle.id, entry.scholarshipId, batch.id))
      issues.push({
        code: "DUPLICATE_ENTRY",
        message: "Scholar already belongs to another batch for this cycle.",
        scholarshipId: entry.scholarshipId,
      });
    result.entries.push({
      scholarshipId: entry.scholarshipId,
      evidence,
      issues,
    });
    result.issues.push(...issues);
  }
  result.valid = result.issues.length === 0;
  return result;
}
export class OvrService {
  constructor(private authorization: AuthorizationService) {}
  private readProjection<T>(actor: string, rawId: unknown, run: (db: PoolConnection, id: string, access: import("../authorization/policy.js").Access) => Promise<T>) {
    const id = parseId(rawId);
    return this.authorization.readSnapshot(actor, "ovr.prepare", async (connection, access) => {
      const db = cachedReads(connection);
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      return run(db, id, access);
    });
  }
  summary(actor: string, id: unknown) { return this.readProjection(actor, id, (db, id, access) => payrollSummary(db, id, access)); }
  candidatePage(actor: string, id: unknown, raw: unknown) { return this.readProjection(actor, id, (db, id) => candidatePage(db, id, raw)); }
  entryPage(actor: string, id: unknown, raw: unknown) { return this.readProjection(actor, id, async (db, id) => { await batchMetadata(db, id); return entryPage(db, id, raw); }); }
  historyPage(actor: string, id: unknown, raw: unknown) { return this.readProjection(actor, id, async (db, id) => { await batchMetadata(db, id); return historyPage(db, id, raw); }); }
  paymentPage(actor: string, id: unknown, raw: unknown) {
    const q = parseRequirementList(raw);
    return this.readProjection(actor, id, async (db, id) => {
      await batchMetadata(db, id);
      const [[count]] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM payment_records WHERE batch_id=?", [id]);
      const [ids] = await db.execute<RowDataPacket[]>(`SELECT scholarship_id FROM payment_records WHERE batch_id=? ORDER BY batch_revision LIMIT ${q.limit} OFFSET ${q.offset}`, [id]);
      const selected = ids.map(r => String(r.scholarship_id));
      const [names] = selected.length ? await db.execute<RowDataPacket[]>(`SELECT r.id,i.human_id,CONCAT_WS(' ',s.first_name,NULLIF(s.middle_name,''),s.last_name,NULLIF(s.suffix,'')) AS name FROM scholarship_records r JOIN scholars s ON s.id=r.scholar_id JOIN scholar_identifiers i ON i.scholar_id=s.id WHERE r.id IN (${selected.map(() => "?").join(",")})`, selected) : [[]];
      return { items: await paymentRecords(db, id, false, selected), identities: names.map(n => ({scholarshipId:String(n.id),humanId:String(n.human_id),name:String(n.name)})), total: Number(count.n), offset: q.offset, limit: q.limit };
    });
  }
  section(actor: string, id: unknown, raw: unknown) {
    const parsed = z.enum(["candidates", "processing", "corrections", "amendments", "reconciliation", "reprocessing", "validation"]).safeParse(raw);
    if (!parsed.success) throw new AuthError(422, "VALIDATION_FAILED", "Choose a supported payroll detail section.");
    return this.readProjection(actor, id, (db, id) => readOvrSection(db, id, parsed.data as keyof OvrSections));
  }
  async summaries(actor: string, rawCycle: unknown, rawQuery: unknown) {
    const cycleId = parseId(rawCycle), q = parseRequirementList(rawQuery);
    return this.authorization.readSnapshot(actor, "ovr.prepare", async db => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const cycle = await currentPayout(db, cycleId);
      const [[count]] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM ovr_batches WHERE cycle_id=? AND (LOCATE(?,code)>0 OR LOCATE(?,name)>0)", [cycleId,q.q,q.q]);
      const [rows] = await db.execute<RowDataPacket[]>(`SELECT id FROM ovr_batches WHERE cycle_id=? AND (LOCATE(?,code)>0 OR LOCATE(?,name)>0) ORDER BY code LIMIT ${q.limit} OFFSET ${q.offset}`, [cycleId,q.q,q.q]);
      const items = []; for (const row of rows) items.push(await batchMetadata(db, row.id));
      return { cycle, managed: Boolean((await db.execute<RowDataPacket[]>("SELECT cycle_id FROM regular_payout_periods WHERE cycle_id=?", [cycle.id]))[0].length), items, total: Number(count.n), offset:q.offset, limit:q.limit };
    });
  }
  async list(actor: string, rawCycle: unknown, rawQuery: unknown) {
    const cycleId = parseId(rawCycle),
      q = parseRequirementList(rawQuery);
    return this.authorization.readSnapshot(
      actor,
      "ovr.prepare",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const cycle = await currentPayout(db, cycleId);
        const [rows] = await db.execute<RowDataPacket[]>(
          "SELECT id FROM ovr_batches WHERE cycle_id=? AND (LOCATE(?,code)>0 OR LOCATE(?,name)>0) ORDER BY code LOCK IN SHARE MODE",
          [cycleId, q.q, q.q],
        );
        const items: OvrBatch[] = [];
        for (const row of rows.slice(q.offset, q.offset + q.limit))
          items.push((await ovrHistory(db, row.id))[0]);
        return {
          cycle,
          managed: Boolean((await db.execute<RowDataPacket[]>("SELECT cycle_id FROM regular_payout_periods WHERE cycle_id=?", [cycle.id]))[0].length),
          items,
          total: rows.length,
          offset: q.offset,
          limit: q.limit,
        };
      },
    );
  }
  async read(actor: string, rawId: unknown): Promise<OvrDetail> {
    const id = parseId(rawId);
    return this.authorization.readSnapshot(
      actor,
      "ovr.prepare",
      async (connection) => {
        return readCompleteOvrDetail(connection,id);
      },
    );
  }
  async form(actor: string, rawId: unknown, requestId: string, draft = false, format: "html" | "docx" = "html", original = false) {
    const id = parseId(rawId);
    const prepared = await this.authorization.readSnapshot(actor, "ovr.prepare", async connection => {
      const db = cachedReads(connection);
      const [[frozen]] = await db.execute<RowDataPacket[]>("SELECT snapshot,snapshot_hash FROM ovr_finalizations WHERE batch_id=? LOCK IN SHARE MODE", [id]);
      const effective = await effectiveRoster(db, id);
      const snapshot = original && frozen ? decode<OvrFinalization>(frozen.snapshot) : effective ? amendFrozenForm(effective.snapshot) : null;
      const batch = (await ovrHistory(db, id))[0];
      const cycle = await currentPayout(db, batch.cycleId);
      const form = snapshot?.payrollForm ?? snapshot?.legacyPayrollForm ?? (draft && !frozen ? ((await managedCandidates(db, batch, cycle))?.form ?? (await automaticDraft(db, batch, cycle))?.form) : null);
      if (!form) throw new AuthError(409, "PAYROLL_FORM_UNAVAILABLE", "Finalize a numbered payroll for its official form, or preview its current draft candidates.");
      if (snapshot) assertPayrollRoster(form, snapshot);
      form.signatories ??= payrollSignatories;
      if (!form.rows.length) throw new AuthError(409, "EMPTY_PAYROLL", "No eligible candidates are available for this form.");
      return { form, draft: !snapshot, audit: { snapshotHash: original ? frozen?.snapshot_hash : effective?.hash ?? null, original, count: form.rows.length, format, layout: "daet-payroll-v2", paymentReleased: false } };
    });
    await this.authorization.withPermission(actor, "ovr.prepare", async db => {
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'payroll.export','ovr_batches',?,?,?,'user',UTC_TIMESTAMP(6),?,'Payroll form generated',?)", [randomUUID(), id, prepared.draft ? "draft" : "official", actor, requestId, JSON.stringify(prepared.audit)]);
    });
    return format === "docx" ? renderPayrollWord(prepared.form, prepared.draft) : renderPayroll(prepared.form, prepared.draft);
  }
  async reprocessingCommand(actor: string, rawId: unknown, action: "assign-reprocessing" | "classify-unpaid", rawKey: unknown, raw: unknown, requestId: string) {
    const id=parseId(rawId), key=parseKey(rawKey);
    const base={expectedRevision:z.number().int().positive(),reason:text(5,500)};
    const schema=action==="assign-reprocessing" ? z.object({...base,reprocessingId:z.uuid(),expectedQueueRevision:z.number().int().min(0)}).strict() : z.object({...base,paymentId:z.uuid(),unpaidReason:z.enum(Object.keys(UNPAID_REASONS) as [keyof typeof UNPAID_REASONS,...(keyof typeof UNPAID_REASONS)[]])}).strict();
    const parsed=schema.safeParse(raw);if(!parsed.success)throw new AuthError(422,"VALIDATION_FAILED","Provide current revisions and the unpaid classification or reprocessing entry.");
    const input=parsed.data, hash=digest(JSON.stringify({id,action,input}));
    return this.authorization.withPermission(actor,"ovr.finalize",async db=>{
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [[retry]]=await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=?",[actor,key]);
      if(retry){if(retry.payload_hash!==hash)throw new AuthError(409,"IDEMPOTENCY_CONFLICT","This command key was already used.");return decode<OvrBatch>(retry.result);}
      const previous=(await ovrHistory(db,id))[0],cycle=await currentPayout(db,previous.cycleId);
      if(previous.revision!==input.expectedRevision)throw new AuthError(409,"VERSION_CONFLICT","Refresh the payroll before continuing.");
      if("reprocessingId" in input){
        await requireNumberedPayroll(db,id);requireDraft(previous.state);requireOpenPayout(cycle);await requireClaimOpen(db,cycle.semesterId);
        const item=(await reprocessingQueue(db,cycle)).find(q=>q.id===input.reprocessingId);
        if(!item||item.revision!==input.expectedQueueRevision)throw new AuthError(409,"SOURCE_CHANGED","The reprocessing queue changed. Refresh it.");
        await assignRetry(db,item,id,actor,input.reason);
      }else{
        const payments=await paymentRecords(db,id),payment=payments.find(p=>p.id===input.paymentId);
        if(!payment||payment.outcome!=="not_paid")throw new AuthError(409,"UNPAID_RECORD_REQUIRED","Only an unpaid outcome can be classified.");
        if((await paymentCorrections(db,id)).some(c=>c.state==="pending"&&c.paymentId===payment.id))throw new AuthError(409,"PAYMENT_CORRECTION_PENDING","Resolve the payment correction first.");
        const [[latest]]=await db.execute<RowDataPacket[]>("SELECT revision FROM payroll_unpaid_classifications WHERE payment_id=? ORDER BY revision DESC LIMIT 1",[payment.id]);
        await db.execute("INSERT INTO payroll_unpaid_classifications(id,payment_id,revision,unpaid_reason,reason,actor_id,recorded_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",[randomUUID(),payment.id,Number(latest?.revision??0)+1,input.unpaidReason,input.reason,actor]);
        if(previous.state==="closed"){const frozen=await effectiveRoster(db,id);if(frozen)await queueUnclaimed(db,frozen.snapshot,await paymentRecords(db,id),actor);}
      }
      const [[user]]=await db.execute<RowDataPacket[]>("SELECT full_name FROM users WHERE id=?",[actor]);
      const result:OvrBatch={...previous,revision:previous.revision+1,action,actorId:actor,actorName:user.full_name,recordedAt:new Date().toISOString(),reason:input.reason,reference:"Coordinator payroll decision"};
      await db.execute("INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",[id,result.revision,result.state,action,encodeStoredJson(result),actor]);
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'payroll.reprocessing','ovr_batches',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",[randomUUID(),id,action,actor,requestId,input.reason,JSON.stringify(input)]);
      await db.execute("INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",[actor,key,hash,encodeStoredJson(result)]);
      return result;
    });
  }
  async command(
    actor: string,
    rawId: unknown,
    action: OvrAction,
    rawKey: unknown,
    raw: unknown,
    requestId: string,
  ) {
    const target = parseId(rawId),
      key = parseKey(rawKey),
      input = parseOvr(action, raw),
      hash = digest(JSON.stringify({ target, action, input }));
    return this.authorization.withPermission(
      actor,
      action === "finalize" || action === "return-to-draft" || (action === "defer" || action === "restore")
        ? "ovr.finalize"
        : "ovr.prepare",
      async (db) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const [retry] = await db.execute<RowDataPacket[]>(
          "SELECT payload_hash,result FROM ovr_commands WHERE actor_id=? AND command_id=? FOR UPDATE",
          [actor, key],
        );
        if (retry.length) {
          if (retry[0].payload_hash !== hash)
            throw new AuthError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This Payroll command key was used with different data.",
            );
          return decode<OvrBatch>(retry[0].result);
        }
        const previous =
          action === "create" ? null : (await ovrHistory(db, target))[0];
        if (previous?.state === "closed")
          throw new AuthError(
            423,
            "OVR_ALREADY_CLOSED",
            "This Payroll is closed. Ordinary changes are not permitted.",
          );
        const cycle = await currentPayout(db, previous?.cycleId ?? target);
        requireOpenPayout(cycle);
        if(['create','add','restore','submit-review','finalize'].includes(action))await requirePreparationOpen(db,cycle.id);
        if (["submit-review","finalize","add","restore"].includes(action)) await requireClaimOpen(db,cycle.semesterId);
        const [[managed]] = await db.execute<RowDataPacket[]>(
          action === "create" ? "SELECT cycle_id FROM regular_payout_periods WHERE cycle_id=? LOCK IN SHARE MODE" : "SELECT batch_id FROM payroll_submission_windows WHERE batch_id=? LOCK IN SHARE MODE",
          [action === "create" ? cycle.id : target],
        );
        if (!managed) throw new AuthError(409, "LEGACY_PAYROLL_READ_ONLY", "Legacy payroll is read-only. Use reviewed conversion into numbered payroll; historical corrections remain available.");
        if (managed && action === "create") throw new AuthError(409, "MANAGED_PAYROLL_SETUP_ONLY", "Use Coordinator submission-window setup to open a numbered payroll batch.");
        if (managed && ["add", "remove"].includes(action)) throw new AuthError(409, "AUTOMATIC_PAYROLL_MEMBERSHIP", "Numbered payrolls use automatic candidates. Defer a candidate with a recorded Coordinator reason instead.");

        const candidates = managed && previous ? await managedCandidates(db, previous, cycle) : null;
        // Source-hash submission opts older API clients into the automatic projection.
        // Once submitted this way, approval must recheck the same roster and form.
        const automatic = !managed && previous && (input.expectedSourceHash || previous.automaticSourceHash)
          ? await automaticDraft(db, previous, cycle) : null;
        if (automatic && ["submit-review", "finalize"].includes(action) && input.expectedSourceHash !== automatic.sourceHash)
          throw new AuthError(409, "SOURCE_CHANGED", "Eligible scholars or payroll details changed. Refresh and review the current draft.");
        if (automatic && action === "finalize" && previous?.automaticSourceHash !== automatic.sourceHash)
          throw new AuthError(409, "PAYROLL_REVIEW_STALE", "Payroll changed since submission. Return to Draft and review it again.");
        if (candidates && ["submit-review", "finalize", "defer"].includes(action) && input.expectedSourceHash !== candidates.sourceHash) throw new AuthError(409, "SOURCE_CHANGED", "Candidates or their evidence changed. Refresh and review the current payroll.");
        if (candidates && (action === "submit-review" || action === "finalize")) {
          requireManagedReview(action, candidates);
        }
        const workflow =
          action === "submit-review" ||
          action === "return-to-draft" ||
          action === "finalize";
        const nextState = workflow
          ? ovrWorkflowState(action, previous!.state)
          : "draft";
        if (previous && !workflow) requireDraft(previous.state);
        if (input.expectedRevision !== (previous?.revision ?? 0))
          throw new AuthError(
            409,
            "VERSION_CONFLICT",
            "Payroll membership or validation changed. Refresh before continuing.",
          );
        const create = input as z.infer<typeof schemas.create>;
        if (action === "create") {
          if (create.expectedCycleVersion !== cycle.version)
            throw new AuthError(
              409,
              "VERSION_CONFLICT",
              "The payout cycle changed. Refresh it before creating a batch.",
            );
          const [existing] = await db.execute<RowDataPacket[]>(
            "SELECT id FROM ovr_batches WHERE cycle_id=? AND code=? LOCK IN SHARE MODE",
            [cycle.id, create.code],
          );
          if (existing.length)
            throw new AuthError(
              409,
              "OVR_CODE_EXISTS",
              "This batch code already exists in the payout cycle.",
            );
        }
        const annualId = (input as z.infer<typeof schemas.add>).scholarshipId;
        let entryEvidence: OvrEvidence | undefined;
        if (action === "add") {
          if (await duplicate(db, cycle.id, annualId, null))
            throw new AuthError(
              409,
              "OVR_DUPLICATE_ENTRY",
              "This scholarship is already in a Payroll batch for this payout cycle.",
            );
          const view = await eligibilityView(db, cycle, annualId),
            issues = ovrEligibilityIssues(view);
          if (issues.length)
            throw new AuthError(
              409,
              "OVR_ENTRY_INELIGIBLE",
              issues.map((r) => `${r.code}: ${r.message}`).join(" "),
            );
          entryEvidence = ovrEvidence(view);
        }
        if (action === "remove") {
          const existing = (await ovrEntries(db, target)).find(
            (e) => e.scholarshipId === annualId,
          );
          if (!existing)
            throw new AuthError(
              409,
              "OVR_ENTRY_NOT_FOUND",
              "This scholarship is not an active entry in this batch.",
            );
          entryEvidence = existing.evidence;
        }
        const [users] = await db.execute<RowDataPacket[]>(
          "SELECT full_name FROM users WHERE id=?",
          [actor],
        );
        const batch: OvrBatch = {
          id: previous?.id ?? randomUUID(),
          cycleId: cycle.id,
          code: previous?.code ?? create.code,
          name: previous?.name ?? create.name,
          revision: input.expectedRevision + 1,
          state: nextState,
          action,
          actorName: users[0].full_name,
          actorId: actor,
          recordedAt: new Date().toISOString(),
          reason: input.reason,
          reference: input.reference,
        };
        if (automatic && ["submit-review", "finalize"].includes(action)) batch.automaticSourceHash = automatic.sourceHash;
        if (action === "submit-review")
          batch.submission = {
            actorId: actor,
            actorName: batch.actorName,
            submittedAt: batch.recordedAt,
            revision: batch.revision,
          };
        if (action === "finalize") {
          if (!previous?.submission)
            throw new AuthError(
              409,
              "OVR_REVIEW_REQUIRED",
              "A recorded review submission is required before finalization.",
            );
          batch.submission = previous.submission;
        }
        let frozenSnapshot: OvrFinalization | undefined;
        if (action === "defer" || action === "restore") {
          const [[record]] = await db.execute<RowDataPacket[]>("SELECT id FROM scholarship_records WHERE id=? AND academic_year_id=?",[annualId,cycle.academicYearId]);
          if (!record) throw new AuthError(409,"CANDIDATE_UNAVAILABLE","Select a scholar from this academic year.");
          await writeDeferral(db,batch.id,annualId,action,actor,input.reason);

        }
        const automaticEntries = action === "submit-review" ? (candidates ? candidateEntries(candidates, batch.revision) : automatic?.entries.map(e => ({ ...e, addedRevision: batch.revision })) ?? null) : null;
        if (action === "submit-review" || action === "finalize") {
          const entries = automaticEntries ?? await ovrEntries(db, batch.id);
          if (candidates && action === "finalize") {
            const current = candidateEntries(candidates, batch.revision);
            if (current.length !== entries.length || current.some(i => !entries.some(e => e.scholarshipId === i.scholarshipId && e.evidence.fingerprint === i.evidence.fingerprint))) throw new AuthError(409, "PAYROLL_REVIEW_STALE", "Candidates changed since submission. Return to Draft and review the current list.");
          }
          // Share the existing bounded raw-source/index adapter only during the
          // read-only finalization checks under the unchanged financial guard.
          // Every decision still runs; no cache survives this command or a write.
          const validationDb = action === "finalize"
            ? await candidateReads(db, entries.map(entry => entry.scholarshipId), cycle.semesterId)
            : db;
          for (const entry of entries) {
            await assertNoIndividualRoute(validationDb,entry.scholarshipId,cycle.semesterId);
            await assertNoPaidClaim(validationDb,entry.scholarshipId,cycle.semesterId);
            if (entry.evidence.reprocessing && action === "submit-review") {
              const retry = await retryEvidence(db,previous!,cycle,entry);
              await assignRetry(db,retry,batch.id,actor,"Automatic inclusion submitted for Coordinator review");
            }
          }
          const validation = await validateOvr(validationDb, batch, cycle, entries);
          if (!validation.valid)
            throw new AuthError(
              409,
              "OVR_VALIDATION_FAILED",
              "The entire roster must pass current validation. Return to Draft and resolve the listed issues.",
              { validation },
            );
          batch.validation = validation;
          if (action === "finalize") {
            if(candidates&&candidates.cutoffPolicy!=="whole_day_v1"){
              const [[stamp]]=await db.query<RowDataPacket[]>("SELECT DATE_FORMAT(UTC_TIMESTAMP(6),'%Y-%m-%dT%H:%i:%s.%fZ') AS now");
              if(!windowCutoffReached(candidates.cutoffOn,cutoffPolicy(candidates.cutoffPolicy),String(stamp.now),candidates.cutoffLocalTime??undefined))throw new AuthError(409,"CUTOFF_NOT_REACHED","The recorded cutoff instant has not passed.");
              batch.recordedAt=String(stamp.now);
            }
            frozenSnapshot = {
              ...(candidates ? { payrollForm: candidates.form } : {}),
              ...(automatic ? { legacyPayrollForm: automatic.form } : {}),
              batchId: batch.id,
              revision: batch.revision,
              code: batch.code,
              name: batch.name,
              cycle,
              entries: entries.map((e) => ({
                ...e,
                evidence: validation.entries.find(
                  (v) => v.scholarshipId === e.scholarshipId,
                )!.evidence,
              })),
              validation,
              submission: batch.submission!,
              finalizedBy: actor,
              finalizedByName: batch.actorName,
              finalizedAt: batch.recordedAt,
              reason: input.reason,
              reference: input.reference,
            };
            batch.finalizationHash = digest(JSON.stringify(frozenSnapshot));
          }
        }
        if (entryEvidence)
          batch.entry = {
            scholarshipId: annualId,
            humanId: entryEvidence.current.sources.scholarship.humanId,
            name: entryEvidence.current.sources.scholarship.name,
            fingerprint: entryEvidence.fingerprint,
          };
        if (action === "validate")
          batch.validation = await validateOvr(
            db,
            batch,
            cycle,
            await ovrEntries(db, batch.id),
          );
        if (action === "create")
          await db.execute(
            "INSERT INTO ovr_batches(id,cycle_id,code,name,created_by,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",
            [batch.id, cycle.id, batch.code, batch.name, actor],
          );
        await db.execute(
          "INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",
          [
            batch.id,
            batch.revision,
            batch.state,
            action,
            encodeStoredJson(batch),
            actor,
          ],
        );
        if (action === "defer") {
          const existing = (await ovrEntries(db,batch.id)).find(e=>e.scholarshipId === annualId);
          if(existing) await db.execute("INSERT INTO ovr_entries(batch_id,batch_revision,scholarship_id,action,evidence) VALUES(?,?,?,'remove',?)",[batch.id,batch.revision,annualId,JSON.stringify(existing.evidence)]);
        }
        if (automaticEntries) {
          const oldEntries = await ovrEntries(db, batch.id);
          for (const old of oldEntries.filter(e => !automaticEntries.some(n => n.scholarshipId === e.scholarshipId))) await db.execute("INSERT INTO ovr_entries(batch_id,batch_revision,scholarship_id,action,evidence) VALUES(?,?,?,'remove',?)", [batch.id, batch.revision, old.scholarshipId, JSON.stringify(old.evidence)]);
          for (const entry of automaticEntries) await db.execute("INSERT INTO ovr_entries(batch_id,batch_revision,scholarship_id,action,evidence) VALUES(?,?,?,'add',?)", [batch.id, batch.revision, entry.scholarshipId, JSON.stringify(entry.evidence)]);
        }
        if (entryEvidence)
          await db.execute(
            "INSERT INTO ovr_entries(batch_id,batch_revision,scholarship_id,action,evidence) VALUES(?,?,?,?,?)",
            [
              batch.id,
              batch.revision,
              annualId,
              action,
              JSON.stringify(entryEvidence),
            ],
          );
        if (frozenSnapshot)
          await db.execute(
            "INSERT INTO ovr_finalizations(batch_id,batch_revision,snapshot,snapshot_hash,entry_count,finalized_by,finalized_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            [
              batch.id,
              batch.revision,
              encodeStoredJson(frozenSnapshot),
              batch.finalizationHash!,
              frozenSnapshot.entries.length,
              actor,
            ],
          );
        if (frozenSnapshot?.payrollForm) await allocatePayroll(db, frozenSnapshot, actor);
        for (const entry of frozenSnapshot?.entries ?? []) if(entry.evidence.reprocessing) await db.execute("INSERT INTO payroll_reprocessing_attempts(reprocessing_id,batch_id,scholarship_id,actor_id,recorded_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))",[entry.evidence.reprocessing.id,batch.id,entry.scholarshipId,actor]);
        await db.execute(
          "INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'ovr.draft','ovr_batches',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            batch.id,
            action,
            actor,
            requestId,
            input.reason,
            encodeStoredJson({
              revision: batch.revision,
              cycleId: cycle.id,
              scholarshipId: annualId ?? null,
              fingerprint: entryEvidence?.fingerprint ?? null,
              validation: batch.validation ?? null,
              state: batch.state,
              submission: batch.submission ?? null,
              finalizationHash: batch.finalizationHash ?? null,
              reference: input.reference,
              idempotency_key: key,
            }),
          ],
        );
        await db.execute(
          "INSERT INTO ovr_commands(actor_id,command_id,payload_hash,result) VALUES(?,?,?,?)",
          [actor, key, hash, encodeStoredJson(batch)],
        );
        return batch;
      },
    );
  }
}
