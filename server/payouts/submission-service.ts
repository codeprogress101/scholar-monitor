import { semesterIdentity } from "../continuing/regular-coverage.js";
import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { parseId, parseKey } from "../configuration/validation.js";
import { currentPayout } from "./service.js";
import { deadlineBoundary, localDayStart, parseWindowAction, submissionState, validateWindow, type WindowAction } from "./submission-rules.js";

const decode = <T>(v: T | string): T => typeof v === "string" ? JSON.parse(v) as T : v;
async function clock(db: PoolConnection) {
  const [[r]] = await db.query<RowDataPacket[]>("SELECT DATE_FORMAT(UTC_TIMESTAMP(6),'%Y-%m-%dT%H:%i:%s.%fZ') AS now,DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR),'%Y-%m-%d') AS today");
  return { now: String(r.now), today: String(r.today) };
}
async function context(db: PoolConnection, cycleId: string) {
  const cycle = await currentPayout(db, cycleId);
  const [[period]] = await db.execute<RowDataPacket[]>("SELECT s.version AS semesterVersion,y.version AS yearVersion,DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS startsOn,DATE_FORMAT(s.ends_on,'%Y-%m-%d') AS endsOn FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=? LOCK IN SHARE MODE", [cycle.semesterId]);
  const [mappings] = await db.execute<RowDataPacket[]>("SELECT p.*,s.version AS current_semester_version,y.version AS current_year_version,s.locked_at,s.archived_at,y.locked_at AS year_locked,y.archived_at AS year_archived,DATE_FORMAT(s.starts_on,'%Y-%m-%d') AS starts,DATE_FORMAT(s.ends_on,'%Y-%m-%d') AS ends FROM regular_payout_periods p JOIN semesters s ON s.id=p.semester_id JOIN academic_years y ON y.id=p.academic_year_id WHERE p.academic_year_id=? ORDER BY p.term_number LOCK IN SHARE MODE", [cycle.academicYearId]);
  const mapping = mappings.find((m) => m.cycle_id === cycleId);
  const [deadlines] = await db.execute<RowDataPacket[]>("SELECT revision,action,DATE_FORMAT(deadline_on,'%Y-%m-%d') AS deadlineOn,DATE_FORMAT(previous_deadline_on,'%Y-%m-%d') AS previousDeadlineOn,reason,actor_id AS actorId,DATE_FORMAT(recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recordedAt FROM semester_submission_versions WHERE cycle_id=? ORDER BY revision DESC LOCK IN SHARE MODE", [cycleId]);
  const [rows] = await db.execute<RowDataPacket[]>("SELECT w.batch_id AS batchId,w.batch_number AS batchNumber,b.code,v.revision,v.semester_deadline_revision AS semesterDeadlineRevision,DATE_FORMAT(v.opens_on,'%Y-%m-%d') AS opensOn,DATE_FORMAT(v.cutoff_on,'%Y-%m-%d') AS cutoffOn,DATE_FORMAT(v.previous_cutoff_on,'%Y-%m-%d') AS previousCutoffOn,v.action,v.reason,v.actor_id AS actorId,DATE_FORMAT(v.recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS recordedAt FROM payroll_submission_windows w JOIN ovr_batches b ON b.id=w.batch_id JOIN payroll_submission_window_versions v ON v.batch_id=w.batch_id WHERE w.cycle_id=? ORDER BY w.batch_number,v.revision DESC LOCK IN SHARE MODE", [cycleId]);
  const windows = rows.filter((r, i) => rows.findIndex((v) => v.batchId === r.batchId) === i);
  for (const w of windows) {
    const [[latest]] = await db.execute<RowDataPacket[]>("SELECT state FROM ovr_batch_events WHERE batch_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE", [w.batchId]);
    w.processingState = latest?.state ?? "unknown";
  }
  const [[legacy]] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) AS count FROM ovr_batches b WHERE b.cycle_id=? AND NOT EXISTS(SELECT 1 FROM payroll_submission_windows w WHERE w.batch_id=b.id)", [cycleId]);
  const [[siblings]] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) AS count FROM payout_cycles WHERE semester_id=?", [cycle.semesterId]);
  const stale = mappings.some((m) => m.semester_version !== m.current_semester_version || m.year_version !== m.current_year_version || m.locked_at || m.archived_at || m.year_locked || m.year_archived);
  return { cycle, period, mappings, mapping, deadlines, windows, history: rows, legacyCount: Number(legacy.count), ambiguous: Number(siblings.count) !== 1, stale };
}

export class SubmissionWindowService {
  constructor(private authorization: AuthorizationService) {}
  read(actor: string, rawId: string) {
    const id = parseId(rawId);
    return this.authorization.withPermission(actor, "configuration.read", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const c = await context(db, id), time = await clock(db);
      return {
        cycle: c.cycle, period: { semesterVersion: Number(c.period.semesterVersion), yearVersion: Number(c.period.yearVersion), startsOn: String(c.period.startsOn), endsOn: String(c.period.endsOn) },
        termNumber: c.mapping ? Number(c.mapping.term_number) : null, mappedTerms: c.mappings.map((m) => ({ termNumber: Number(m.term_number), cycleId: String(m.cycle_id) })),
        mappingStale: c.stale, ambiguous: c.ambiguous, legacyBatchesWithUnknownDeadline: c.legacyCount,
        deadlines: c.deadlines.map((d) => ({ revision: Number(d.revision), deadlineOn: String(d.deadlineOn), previousDeadlineOn: d.previousDeadlineOn as string | null, reason: String(d.reason), actorId: String(d.actorId), recordedAt: String(d.recordedAt), cutoffExclusiveUtc: deadlineBoundary(d.deadlineOn) })),
        windows: c.windows.map((w) => ({ batchId: String(w.batchId), batchNumber: Number(w.batchNumber), code: String(w.code), revision: Number(w.revision), opensOn: String(w.opensOn), cutoffOn: String(w.cutoffOn), semesterDeadlineRevision: Number(w.semesterDeadlineRevision), processingState: String(w.processingState), submissionState: submissionState(w.opensOn, w.cutoffOn, time.now), opensAtUtc: localDayStart(w.opensOn), cutoffExclusiveUtc: deadlineBoundary(w.cutoffOn), history: c.history.filter((h) => h.batchId === w.batchId).map((h) => ({ revision: Number(h.revision), cutoffOn: String(h.cutoffOn), previousCutoffOn: h.previousCutoffOn as string | null, reason: String(h.reason), actorId: String(h.actorId), recordedAt: String(h.recordedAt), semesterDeadlineRevision: Number(h.semesterDeadlineRevision) })) })),
        timeZone: "Asia/Manila" as const, asOf: time.now, today: time.today, financialActivationEnabled: true as const, receiptDeadlineEnforcementEnabled: true as const,
      };
    });
  }
  command(actor: string, rawId: string, action: WindowAction, rawKey: unknown, raw: unknown, requestId: string) {
    const id = parseId(rawId), key = parseKey(rawKey), input = parseWindowAction(action, raw);
    const hash = digest(JSON.stringify({ id, action, input }));
    return this.authorization.withPermission(actor, "payroll.windows.manage", async (db) => {
      await db.query("SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE");
      const [[retry]] = await db.execute<RowDataPacket[]>("SELECT payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE", [actor, key]);
      if (retry) {
        if (retry.payload_hash !== hash) throw new AuthError(409, "IDEMPOTENCY_CONFLICT", "This command key was used with different window details.");
        return decode<{ id: string; revision: number }>(retry.result);
      }
      const c = await context(db, id), time = await clock(db);
      if (c.cycle.version !== input.expectedCycleVersion) throw new AuthError(409, "VERSION_CONFLICT", "The payout cycle changed. Refresh before continuing.");
      if (c.cycle.periodUnavailable || !["draft", "open"].includes(c.cycle.state)) throw new AuthError(423, "PERIOD_UNAVAILABLE", "Window changes require an available draft/open payout period.");
      if (c.stale || c.ambiguous) throw new AuthError(409, "PERIOD_MAPPING_REVIEW", "Academic configuration changed or multiple cycles cover this semester. Review the mapping before changing windows.");
      let result = { id, revision: 1 }, before: unknown = null;
      const reason = "reason" in input ? input.reason : "Payroll submission setup recorded";
      if (action === "configure" && "termNumber" in input) {
        const identity = await semesterIdentity(db, c.cycle.semesterId);
        if (identity.conflict || (identity.term !== null && identity.term !== input.termNumber)) throw new AuthError(409, "PERIOD_MAPPING_REVIEW", "Payout term must match the reviewed calendar semester identity.");
        if (c.mapping || c.mappings.some((m) => m.term_number === input.termNumber)) throw new AuthError(409, "PERIOD_ALREADY_MAPPED", "This semester or regular term is already mapped. Existing mappings are preserved.");
        if (c.period.semesterVersion !== input.expectedSemesterVersion || c.period.yearVersion !== input.expectedYearVersion) throw new AuthError(409, "VERSION_CONFLICT", "Academic period configuration changed. Refresh first.");
        if (input.deadlineOn < time.today || input.deadlineOn < c.period.startsOn) throw new AuthError(422, "INVALID_DEADLINE", "Choose a final deadline on or after today and the semester start. Historical deadlines are not inferred.");
        if (c.mappings.some((m) => input.termNumber === 1 ? c.period.endsOn >= m.starts : c.period.startsOn <= m.ends)) throw new AuthError(409, "REGULAR_TERM_ORDER", "First and second semester must be distinct, sequential academic periods.");
        await db.execute("INSERT INTO regular_payout_periods(cycle_id,semester_id,academic_year_id,term_number,semester_version,year_version,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [id, c.cycle.semesterId, c.cycle.academicYearId, input.termNumber, input.expectedSemesterVersion, input.expectedYearVersion, actor]);
        await db.execute("INSERT INTO semester_submission_versions(cycle_id,revision,deadline_on,action,reason,actor_id,recorded_at) VALUES(?,1,?,'configure',?,?,UTC_TIMESTAMP(6))", [id, input.deadlineOn, reason, actor]);
      } else {
        if (!c.mapping || !c.deadlines[0]) throw new AuthError(409, "PERIOD_NOT_MAPPED", "Configure this regular semester payout period first.");
        const deadline = c.deadlines[0];
        if (action === "extend-semester" && "deadlineOn" in input && "expectedRevision" in input) {
          if (input.expectedRevision !== deadline.revision) throw new AuthError(409, "VERSION_CONFLICT", "The semester deadline changed. Refresh first.");
          if (input.deadlineOn <= deadline.deadlineOn || input.deadlineOn < time.today) throw new AuthError(422, "EXTENSION_REQUIRED", "An extension must move the deadline later and cannot end in the past.");
          result.revision = deadline.revision + 1; before = deadline;
          await db.execute("INSERT INTO semester_submission_versions(cycle_id,revision,deadline_on,previous_deadline_on,action,reason,actor_id,recorded_at) VALUES(?,?,?,?,'extend',?,?,UTC_TIMESTAMP(6))", [id, result.revision, input.deadlineOn, deadline.deadlineOn, reason, actor]);
        } else if ("expectedDeadlineRevision" in input) {
          if (c.mappings.length !== 2) throw new AuthError(409, "REGULAR_PERIODS_INCOMPLETE", "Map both first and second semester payout periods before opening submission windows.");
          if (c.cycle.state !== "open") throw new AuthError(423, "PAYOUT_NOT_OPEN", "Open the payout cycle before setting its batch windows.");
          if (deadline.revision !== input.expectedDeadlineRevision) throw new AuthError(409, "VERSION_CONFLICT", "The semester deadline changed. Refresh first.");
          let batchId: string, revision: number, opens: string;
          if (action === "open-window" && "opensOn" in input) {
            const sequence = Math.max(0, ...c.windows.map((w) => Number(w.batchNumber)));
            if (sequence !== input.expectedSequence) throw new AuthError(409, "VERSION_CONFLICT", "Another batch was opened. Refresh before opening the next one.");
            if (input.opensOn < time.today || input.opensOn < c.period.startsOn) throw new AuthError(422, "INVALID_OPENING", "A new window cannot open before today or the semester start.");
            if (c.windows.some((w) => w.cutoffOn >= input.opensOn)) throw new AuthError(409, "WINDOW_OVERLAP", "The next batch must open after all previous submission cutoffs.");
            opens = input.opensOn;
            validateWindow(opens, input.cutoffOn, deadline.deadlineOn, c.windows as { opensOn: string; cutoffOn: string }[]);
            let number = sequence + 1, code: string;
            for (;;) {
              code = `PAY-${String(number).padStart(3, "0")}`;
              const [[exists]] = await db.execute<RowDataPacket[]>("SELECT id FROM ovr_batches WHERE cycle_id=? AND code=? LOCK IN SHARE MODE", [id, code]);
              if (!exists) break;
              number++;
            }
            batchId = randomUUID(); revision = 1;
            const [[user]] = await db.execute<RowDataPacket[]>("SELECT full_name FROM users WHERE id=?", [actor]);
            const snapshot = { id: batchId, cycleId: id, code, name: `Payroll batch ${String(number).padStart(3, "0")}`, revision: 1, state: "draft", action: "create", actorId: actor, actorName: user.full_name, recordedAt: time.now, reason, reference: "Submission window setup" };
            await db.execute("INSERT INTO ovr_batches(id,cycle_id,code,name,created_by,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [batchId, id, code, snapshot.name, actor]);
            await db.execute("INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,1,'draft','create',?,?,UTC_TIMESTAMP(6))", [batchId, JSON.stringify(snapshot), actor]);
            await db.execute("INSERT INTO payroll_submission_windows(batch_id,cycle_id,batch_number,actor_id,recorded_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))", [batchId, id, number, actor]);
          } else if (action === "extend-window" && "batchId" in input) {
            const w = c.windows.find((w) => w.batchId === input.batchId);
            if (!w || w.revision !== input.expectedRevision) throw new AuthError(409, "VERSION_CONFLICT", "The selected batch window changed or belongs to another semester.");
            if (w.processingState !== "draft") throw new AuthError(423, "WINDOW_FROZEN", "Reviewed/finalized payroll window history cannot be extended.");
            if (input.cutoffOn <= w.cutoffOn || input.cutoffOn < time.today) throw new AuthError(422, "EXTENSION_REQUIRED", "Choose a cutoff later than the existing one and not in the past.");
            opens = w.opensOn; before = w; batchId = w.batchId; revision = w.revision + 1;
            validateWindow(opens, input.cutoffOn, deadline.deadlineOn, c.windows.filter((v) => v.batchId !== batchId) as { opensOn: string; cutoffOn: string }[]);
          } else throw new AuthError(422, "VALIDATION_FAILED", "Unknown window command.");
          await db.execute("INSERT INTO payroll_submission_window_versions(batch_id,cycle_id,revision,semester_deadline_revision,opens_on,cutoff_on,previous_cutoff_on,action,reason,actor_id,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", [batchId, id, revision, deadline.revision, opens, input.cutoffOn, (before as { cutoffOn?: string } | null)?.cutoffOn ?? null, revision === 1 ? "open" : "extend", reason, actor]);
          result = { id: batchId, revision };
        } else throw new AuthError(422, "VALIDATION_FAILED", "Unknown submission command.");
      }
      await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'payroll.submission','payout_cycle',?,?,?,'user',UTC_TIMESTAMP(6),?,?,?)", [randomUUID(), id, action, actor, requestId, reason, JSON.stringify({ before, input, result, timeZone: "Asia/Manila", precision: "date", financialActivationEnabled: true, idempotency_key: key })]);
      await db.execute("INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))", [actor, key, `payroll.submission.${action}`, hash, JSON.stringify(result)]);
      return result;
    });
  }
}
export type SubmissionWindowView = Awaited<ReturnType<SubmissionWindowService["read"]>>;
