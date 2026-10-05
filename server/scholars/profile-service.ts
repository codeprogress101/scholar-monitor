import { validationDetails } from "../validation-details.js";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../authorization/service.js";
import { AuthError } from "../auth/service.js";
import { parseId } from "../configuration/validation.js";
import { detail as scholarDetail } from "./service.js";
import { academicCurrent } from "../academic/changes-service.js";
import type { Placement } from "../academic/changes-model.js";
import { requirementState } from "../requirements/workflow-state.js";
import type { OfficialSnapshot } from "../masterlists/workflow-model.js";
import { paymentRecords } from "../ovr/processing-state.js";
import { paymentCorrections } from "../ovr/payment-correction-state.js";
import { ovrHistory } from "../ovr/service.js";
import { effectiveRoster } from "../ovr/amendment-state.js";
import type {
  ScholarProfile,
  ProfileItem,
  ProfileEvent,
} from "./profile-model.js";
const querySchema = z
  .object({
    offset: z.coerce.number().int().min(0).max(100000).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    category: z
      .enum([
        "all",
        "academic",
        "scholarship",
        "status",
        "requirements",
        "masterlist",
        "payout",
        "audit",
      ])
      .default("all"),
  })
  .strict();
export function parseProfileQuery(raw: unknown) {
  const p = querySchema.safeParse(raw);
  if (!p.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Choose a valid timeline category and page.",
      validationDetails(p.error),
    );
  return p.data;
}
const decode = <T>(v: string | T): T =>
  typeof v === "string" ? JSON.parse(v) : v;
const iso = (v: Date | string) => new Date(v).toISOString();
const day = (v: Date | string | null) => (v ? iso(v).slice(0, 10) : null);
const placement = (p: Placement) =>
  `${p.school.name} / ${p.course.name} / ${p.yearLevel}`;
export class ScholarProfileService {
  constructor(private authorization: AuthorizationService) {}
  async read(
    actor: string,
    rawId: unknown,
    rawQuery: unknown,
  ): Promise<ScholarProfile> {
    const id = parseId(rawId),
      query = parseProfileQuery(rawQuery);
    return this.authorization.withPermission(
      actor,
      "scholars.read",
      async (db, access) => {
        await db.query(
          "SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE",
        );
        const person = await scholarDetail(db, id),
          items: ProfileItem[] = [],
          events: ProfileEvent[] = [];
        const has = (code: string) =>
          access.permissions.some((p) => p.code === code);
        const auditScope = has("audit.view_all")
          ? "all"
          : has("audit.view_limited")
            ? "own"
            : "none";
        const rows = async (sql: string, params: string[] = [id]) =>
          (await db.execute<RowDataPacket[]>(sql, params))[0];
        const add = (
          category: string,
          key: string,
          label: string,
          detail: string,
          at: Date | string,
          actorName: string,
          version: number | null = null,
        ) =>
          events.push({
            id: `${category}:${key}`,
            category,
            label,
            detail,
            at: iso(at),
            actor: actorName,
            version,
          });
        const annual = await rows(
          "SELECT r.*,y.code AS year_code FROM scholarship_records r JOIN academic_years y ON y.id=r.academic_year_id WHERE r.scholar_id=? ORDER BY y.starts_on DESC LOCK IN SHARE MODE",
        );
        for (const r of annual)
          items.push({
            id: r.id,
            category: "scholarship",
            label: r.year_code,
            detail: `Qualification: ${r.status}; operational status: ${r.operational_status ?? "Not activated"}`,
            version: r.version,
            current: true,
            at: day(r.status_effective_on ?? r.last_effective_on),
          });
        const qualification = await rows(
          "SELECT e.* FROM qualification_events e JOIN scholarship_records r ON r.id=e.scholarship_id WHERE r.scholar_id=? LOCK IN SHARE MODE",
        );
        for (const r of qualification)
          add(
            "scholarship",
            r.id,
            r.action,
            `${r.from_status ?? "New"} → ${r.to_status}; effective ${day(r.effective_on)}. ${r.reason} (${r.reference_text})`,
            r.occurred_at,
            r.actor_name,
            r.resulting_version,
          );
        const status = await rows(
          "SELECT q.*,d.decision,d.actor_name AS decider,d.occurred_at AS decided_at,d.resulting_version FROM status_change_requests q JOIN scholarship_records r ON r.id=q.scholarship_id LEFT JOIN status_change_decisions d ON d.request_id=q.id WHERE r.scholar_id=? LOCK IN SHARE MODE",
        );
        for (const r of status) {
          add(
            "status",
            r.id,
            "Status request",
            `${r.from_status ?? "None"} → ${r.to_status}; effective ${day(r.effective_on)}. ${r.reason} (${r.reference_text})`,
            r.created_at,
            r.actor_name,
          );
          if (r.decision)
            add(
              "status",
              r.id + "-decision",
              `Status ${r.decision}`,
              `${r.to_status}; request ${r.id}`,
              r.decided_at,
              r.decider,
              r.resulting_version,
            );
        }
        const academics = await rows(
          "SELECT id FROM academic_records WHERE scholar_id=? LOCK IN SHARE MODE",
        );
        for (const r of academics) {
          const current = await academicCurrent(db, r.id);
          items.push({
            id: r.id,
            category: "academic",
            label: current.row.year_code,
            detail: placement(current.placement),
            version: current.version,
            current: true,
            at: current.effectiveOn,
          });
          add(
            "academic",
            r.id,
            "Original academic placement",
            `${current.row.school_name} / ${current.row.course_name} / ${current.row.year_level}`,
            current.row.created_at,
            current.row.actor_name,
            0,
          );
        }
        const changes = await rows(
          "SELECT q.*,d.decision,d.actor_name AS decider,d.occurred_at AS decided_at,d.resulting_version FROM academic_changes q JOIN academic_records a ON a.id=q.academic_record_id LEFT JOIN academic_change_decisions d ON d.request_id=q.id WHERE a.scholar_id=? LOCK IN SHARE MODE",
        );
        for (const r of changes) {
          add(
            "academic",
            r.id,
            r.kind,
            `${placement(decode<Placement>(r.before_value))} → ${placement(decode<Placement>(r.after_value))}; effective ${day(r.effective_on)}. ${r.reason} (${r.reference_text})`,
            r.created_at,
            r.actor_name,
          );
          if (r.decision)
            add(
              "academic",
              r.id + "-decision",
              `Academic change ${r.decision}`,
              `Request ${r.id}`,
              r.decided_at,
              r.decider,
              r.resulting_version,
            );
        }
        const requirements = await rows(
          "SELECT i.id,i.created_at,v.name,v.revision,d.code,c.year_code,c.semester_code,c.payout_cycle_id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id JOIN scholarship_records r ON r.id=c.scholarship_record_id JOIN requirement_definition_versions v ON v.id=i.definition_version_id JOIN requirement_definitions d ON d.id=v.definition_id WHERE r.scholar_id=? LOCK IN SHARE MODE",
        );
        for (const r of requirements) {
          const state = await requirementState(db, r.id);
          const label = `${r.year_code} / ${r.semester_code} / ${r.code}${r.payout_cycle_id ? " (payout)" : " (semester)"}`;
          items.push({
            id: r.id,
            category: "requirements",
            label,
            detail: `${r.name}: ${state.status}; policy version ${r.revision}`,
            version: state.version,
            current: true,
            at: state.lastEffectiveOn,
          });
          add(
            "requirements",
            r.id,
            "Checklist requirement generated",
            label,
            r.created_at,
            "System",
            0,
          );
          for (const e of state.history)
            add(
              "requirements",
              e.id,
              e.action,
              `${label}: ${e.fromStatus} → ${e.toStatus}; effective ${e.effectiveOn}. ${e.reason} (${e.reference})`,
              e.recordedAt,
              e.actorName,
              e.version,
            );
          if (state.waiver) {
            const w = state.waiver;
            add(
              "requirements",
              w.id,
              "Waiver",
              `${label}: ${w.reason} (${w.authorityReference})`,
              w.recordedAt,
              w.actorName,
              w.version,
            );
          }
        }
        const receipts = await rows(
          "SELECT x.*,d.code FROM requirement_receipts x JOIN requirement_instances i ON i.id=x.instance_id JOIN requirement_checklists c ON c.id=i.checklist_id JOIN scholarship_records r ON r.id=c.scholarship_record_id JOIN requirement_definition_versions v ON v.id=i.definition_version_id JOIN requirement_definitions d ON d.id=v.definition_id WHERE r.scholar_id=? LOCK IN SHARE MODE",
        );
        for (const r of receipts)
          add(
            "requirements",
            r.id,
            "Physical document received",
            `${r.code}; received ${day(r.received_on)}. ${r.physical_reference ?? "No physical reference"}; ${r.storage_location}`,
            r.recorded_at,
            r.actor_name,
            1,
          );
        // Read publication snapshots internally; return only this person's membership, never the full roster.
        if (has("masterlists.prepare")) {
          const publications = await rows(
            "SELECT p.*,m.title,m.version,m.academic_year_id FROM masterlist_publications p JOIN masterlist_versions m ON m.id=p.masterlist_id WHERE m.academic_year_id IN (SELECT academic_year_id FROM scholarship_records WHERE scholar_id=?) LOCK IN SHARE MODE",
          );
          const activations = await rows(
            "SELECT a.masterlist_id FROM masterlist_activations a JOIN scholarship_records r ON r.id=a.scholarship_id WHERE r.scholar_id=? LOCK IN SHARE MODE",
          );
          const effectiveIds = new Set<string>();
          for (const a of activations) {
            const chain = await rows(
              "SELECT masterlist_id FROM masterlist_amendment_versions WHERE root_id=? ORDER BY revision DESC LIMIT 1 LOCK IN SHARE MODE",
              [a.masterlist_id],
            );
            effectiveIds.add(chain[0]?.masterlist_id ?? a.masterlist_id);
          }
          for (const r of publications) {
            const snapshot = decode<OfficialSnapshot>(r.snapshot),
              entry = snapshot.entries.find((e) => e.scholarId === id);
            if (!entry && !effectiveIds.has(r.masterlist_id)) continue;
            const label = `${snapshot.yearCode}: ${r.title}`,
              detail = entry
                ? `Member; award ${entry.awardNumber ?? "not recorded"}`
                : "Not a member of the effective published version";
            items.push({
              id: r.masterlist_id,
              category: "masterlist",
              label,
              detail,
              version: snapshot.publicationVersion,
              current: effectiveIds.has(r.masterlist_id),
              at: day(r.effective_on),
            });
            add(
              "masterlist",
              r.masterlist_id,
              "Published membership version",
              `${label}: ${detail}`,
              r.published_at,
              r.actor_name,
              snapshot.publicationVersion,
            );
          }
        }
        let cents = 0n,
          paymentCount = 0,
          notPaid = 0;
        if (has("ovr.prepare")) {
          const batches = await rows(
            "SELECT DISTINCT b.id,b.code FROM ovr_batches b JOIN ovr_entries e ON e.batch_id=b.id JOIN scholarship_records r ON r.id=e.scholarship_id WHERE r.scholar_id=? LOCK IN SHARE MODE",
          );
          const annualIds = new Set(annual.map((r) => r.id));
          for (const b of batches) {
            const batchHistory = await ovrHistory(db, b.id);
            for (const h of batchHistory)
              add(
                "payout",
                `${b.id}-${h.revision}`,
                `OVR ${h.action}`,
                `${b.code}: ${h.state} (batch lifecycle event)`,
                h.recordedAt,
                h.actorName,
                h.revision,
              );
            const batch = batchHistory[0],
              frozen = await effectiveRoster(db, b.id),
              member =
                frozen?.snapshot.entries.some((e) =>
                  annualIds.has(e.scholarshipId),
                ) ?? false;
            items.push({
              id: b.id,
              category: "payout",
              label: b.code,
              detail: `OVR ${batch.state}; ${member ? "in effective frozen roster" : "historical or draft membership"}`,
              version: batch.revision,
              current: member,
              at: batch.recordedAt,
            });
            const original = (await paymentRecords(db, b.id, true)).filter(
              (p) => annualIds.has(p.scholarshipId),
            );
            for (const p of original)
              add(
                "payout",
                p.id,
                "Original payment",
                `${b.code}: ${p.outcome} ${p.amount}; effective ${p.effectiveOn}. ${p.reference} — ${p.remarks}`,
                p.recordedAt,
                p.actorName,
                p.revision,
              );
            for (const p of (await paymentRecords(db, b.id)).filter((p) =>
              annualIds.has(p.scholarshipId),
            )) {
              paymentCount++;
              if (p.outcome === "paid")
                cents += BigInt(p.amount.replace(".", ""));
              else notPaid++;
              items.push({
                id: p.id,
                category: "payout",
                label: `${b.code}: effective payment`,
                detail: `${p.outcome} ${p.amount}; ${p.reference} — ${p.remarks}`,
                version: p.revision,
                current: true,
                at: p.effectiveOn,
              });
            }
            for (const c of (await paymentCorrections(db, b.id)).filter((c) =>
              annualIds.has(c.before.scholarshipId),
            )) {
              add(
                "payout",
                c.id,
                "Payment correction " + c.state,
                `${b.code}: ${c.before.outcome} ${c.before.amount} → ${c.proposed.outcome} ${c.proposed.amount}. ${c.reason} (${c.reference})`,
                c.requestedAt,
                c.requestedByName,
                c.before.revision,
              );
              if (c.decidedAt)
                add(
                  "payout",
                  c.id + "-decision",
                  "Correction " + c.state,
                  c.decisionReference ?? "",
                  c.decidedAt,
                  c.decidedByName ?? "",
                  c.revision,
                );
            }
          }
        }
        // Audit metadata is scoped to this person/annual/academic/requirement IDs. Shared batch audit payloads are excluded.
        if (auditScope !== "none") {
          const ids = [
            id,
            ...annual.map((r) => r.id),
            ...academics.map((r) => r.id),
            ...requirements.map((r) => r.id),
            ...status.map((r) => r.id),
            ...changes.map((r) => r.id),
          ];
          const audit = await rows(
            `SELECT l.id,l.event_type,l.action,l.occurred_at,u.full_name FROM scholar_profile_audit l LEFT JOIN users u ON u.id=l.actor_id WHERE l.entity_id IN (${ids.map(() => "?").join(",")})${auditScope === "own" ? " AND l.actor_id=?" : ""} LOCK IN SHARE MODE`,
            [...ids, ...(auditScope === "own" ? [actor] : [])],
          );
          for (const r of audit)
            add(
              "audit",
              r.id,
              r.event_type,
              r.action,
              r.occurred_at,
              r.full_name ?? "System",
            );
        }
        const filtered = events
          .filter(
            (e) => query.category === "all" || e.category === query.category,
          )
          .sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
        return {
          person,
          asOf: new Date().toISOString(),
          items,
          totals: {
            scholarshipYears: annual.length,
            requirements: requirements.length,
            payments: paymentCount,
            paidTotal: `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`,
            notPaid,
          },
          timeline: {
            items: filtered.slice(query.offset, query.offset + query.limit),
            total: filtered.length,
            offset: query.offset,
            limit: query.limit,
          },
          auditScope,
        };
      },
    );
  }
}
