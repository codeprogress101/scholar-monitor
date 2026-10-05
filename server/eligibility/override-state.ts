import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { EligibilityAssessment } from "./model.js";
import type {
  EligibilityOverride,
  EffectiveEligibility,
} from "./override-model.js";
export async function overrideHistory(
  db: PoolConnection,
  cycleId: string,
  annualId: string,
): Promise<EligibilityOverride[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT e.snapshot FROM eligibility_overrides o JOIN eligibility_override_events e ON e.override_id=o.id WHERE o.cycle_id=? AND o.scholarship_id=? ORDER BY e.sequence DESC LOCK IN SHARE MODE",
    [cycleId, annualId],
  );
  return rows.map((r) =>
    typeof r.snapshot === "string" ? JSON.parse(r.snapshot) : r.snapshot,
  );
}
export function currentOverrides(history: EligibilityOverride[]) {
  const seen = new Set<string>();
  return history.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
export function effectiveEligibility(
  current: EligibilityAssessment,
  history: EligibilityOverride[],
): EffectiveEligibility {
  // Never fall back to an older approval when the newest approval is stale.
  const approved = history.find((r) => r.state === "approved");
  const stale =
    !!approved && approved.calculation.sourceHash !== current.sourceHash;
  const applies = !!approved && !stale;
  const eligible = applies ? approved.requestedEligible : current.eligible;
  return {
    eligible,
    label: `${eligible ? "Eligible" : "Not Eligible"}${applies ? " - Override Approved" : " - Normal Rules"}`,
    overrideId: approved?.id ?? null,
    overrideStale: stale,
  };
}
