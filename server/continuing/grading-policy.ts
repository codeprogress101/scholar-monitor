import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { GradingRule } from "./compliance-engine.js";
import { digest } from "../auth/crypto.js";

export type GradingPolicyHistory = {
  id: string; revision: number; kind: "native" | "equivalent"; rule: GradingRule;
  issuer: string; authorityReference: string; sourceReference: string;
  recoveryOf: string[]; effectiveFrom: string; effectiveUntil: string | null; authorityUntil: string | null;
  replacesId: string | null; reason: string | null; recordedAt: string;
};
export type GradingReplacementContext = {
  policy: GradingPolicyHistory;
  impactHash: string;
  recordCount: number;
  reviewedCount: number;
  blocker: string | null;
};
const decode = <T>(value: string | T): T => typeof value === "string" ? JSON.parse(value) as T : value;
/** One complete lineage, or an explicit recovery covering every outside version; otherwise fail closed. */
export function currentGradingPolicy<T extends { id: string; code: string; revision: number; rules: unknown }>(rows: T[]): T | null {
  const candidates: T[] = [];
  for (const code of new Set(rows.map((r) => r.code))) {
    const ordered = rows.filter((r) => r.code === code).sort((a, b) => a.revision - b.revision);
    const root = decode<{ recoveryOf?: string[]; replacesPolicyId?: string }>(ordered[0].rules as string);
    const outside = rows.filter((r) => r.code !== code).map((r) => r.id).sort();
    if (root.recoveryOf !== undefined) {
      if (!Array.isArray(root.recoveryOf) || !root.recoveryOf.length || new Set(root.recoveryOf).size !== root.recoveryOf.length || JSON.stringify([...root.recoveryOf].sort()) !== JSON.stringify(outside)) continue;
    } else if (outside.length) continue;
    if (ordered.some((row, i) => {
      const rules = decode<{ replacesPolicyId?: string; recoveryOf?: string[] }>(row.rules as string);
      return row.revision !== i + 1 || (i === 0 ? rules.replacesPolicyId !== undefined : rules.replacesPolicyId !== ordered[i - 1].id || rules.recoveryOf !== undefined);
    })) continue;
    candidates.push(ordered.at(-1)!);
  }
  return candidates.length === 1 ? candidates[0] : null;
}
export function gradingHistory(rows: RowDataPacket[]): GradingPolicyHistory[] {
  return rows.map((row) => {
    const rules = decode<{ kind: "native" | "equivalent"; rule: GradingRule; replacesPolicyId?: string; replacementReason?: string; recoveryOf?: string[] }>(row.rules);
    return { id: row.id, revision: row.revision, kind: rules.kind, rule: rules.rule, issuer: row.issuer, authorityReference: row.reference_text, sourceReference: row.source_reference, recoveryOf: rules.recoveryOf ?? [], effectiveFrom: row.starts, effectiveUntil: row.ends, authorityUntil: row.authority_until, replacesId: rules.replacesPolicyId ?? null, reason: rules.replacementReason ?? null, recordedAt: row.recorded };
  }).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.revision - a.revision);
}
export async function gradingReplacementImpact(db: PoolConnection, cohort: string, semester: string, policy: RowDataPacket, sourceHash: string, blocker: string | null): Promise<GradingReplacementContext> {
  // Conservative boundary: any entitlement in the roster/semester freezes shared policy changes.
  const joins = " JOIN scholar_semesters ss ON ss.id=r.scholar_semester_id JOIN workflow_scope_versions w ON w.id=ss.scope_version_id WHERE ss.semester_id=? AND w.cohort_code=?";
  const [owners] = await db.execute<RowDataPacket[]>("SELECT ss.id,ss.scope_version_id FROM scholar_semesters ss JOIN workflow_scope_versions w ON w.id=ss.scope_version_id WHERE ss.semester_id=? AND w.cohort_code=? ORDER BY ss.id FOR UPDATE", [semester, cohort]);
  const [reviews] = await db.execute<RowDataPacket[]>("SELECT r.id,r.scholar_semester_id,p.code FROM semester_review_events r JOIN workflow_policy_versions p ON p.id=r.policy_version_id" + joins + " ORDER BY r.id LOCK IN SHARE MODE", [semester, cohort]);
  const [academics] = await db.execute<RowDataPacket[]>("SELECT r.scholar_semester_id,r.revision FROM scholar_semester_revisions r" + joins + " ORDER BY r.scholar_semester_id,r.revision LOCK IN SHARE MODE", [semester, cohort]);
  const [entitlements] = await db.execute<RowDataPacket[]>("SELECT r.id FROM semester_entitlements r" + joins + " ORDER BY r.id LOCK IN SHARE MODE", [semester, cohort]);
  return {
    policy: gradingHistory([policy])[0],
    impactHash: digest(JSON.stringify({ policyId: policy.id, sourceHash, owners, reviews, academics, entitlements })),
    recordCount: owners.length,
    reviewedCount: new Set(reviews.filter((r) => r.code === policy.code).map((r) => r.scholar_semester_id)).size,
    blocker: blocker ?? (entitlements.length ? "This roster and semester already has an entitlement. Reconcile dependent financial records before replacing its shared grading policy." : null),
  };
}

export type GradingRecoveryContext = {
  policies: GradingPolicyHistory[]; impactHash: string; recordCount: number; reviewedCount: number;
  blocker: string | null; ended: boolean;
};
export async function gradingRecoveryImpact(db: PoolConnection, cohort: string, semester: string, policies: RowDataPacket[], sourceHash: string, blocker: string | null, ended: boolean): Promise<GradingRecoveryContext> {
  const base = await gradingReplacementImpact(db, cohort, semester, policies[0], sourceHash, blocker);
  const [reviewed] = await db.execute<RowDataPacket[]>("SELECT DISTINCT scholar_semester_id FROM semester_review_events WHERE policy_version_id IN (" + policies.map(() => "?").join(",") + ") ORDER BY scholar_semester_id LOCK IN SHARE MODE", policies.map((p) => p.id));
  return { policies: gradingHistory(policies), impactHash: digest(JSON.stringify({ base: base.impactHash, policies })), recordCount: base.recordCount, reviewedCount: reviewed.length, blocker: base.blocker, ended };
}
