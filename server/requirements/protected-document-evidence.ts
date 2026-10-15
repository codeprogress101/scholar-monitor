import type { PoolConnection, RowDataPacket } from "mysql2/promise";

type ObjectValue = Record<string, unknown>;
const object = (v: unknown): v is ObjectValue => !!v && typeof v === "object" && !Array.isArray(v);
const decode = (v: unknown): unknown => typeof v === "string" ? JSON.parse(v) : v;

/** Read explicit instance references, never names or definition codes. */
export function evidenceDocumentIds(raw: unknown): string[] | null {
  try {
    const evidence = decode(raw);
    if (!object(evidence) || !object(evidence.current) || !object(evidence.current.sources)) return null;
    const requirements = evidence.current.sources.requirements;
    if (!Array.isArray(requirements)) return null;
    if (requirements.some(r => !object(r) || !(r.instanceId === null || typeof r.instanceId === "string"))) return null;
    const ids = new Set<string>();
    const visit = (v: unknown) => {
      if (Array.isArray(v)) { v.forEach(visit); return; }
      if (!object(v)) return;
      for (const [key, value] of Object.entries(v)) {
        if (key === "documents" && Array.isArray(value)) {
          for (const document of value) if (object(document) && typeof document.id === "string") ids.add(document.id);
        }
        if (["instanceId", "requirementInstanceId", "sourceInstanceId", "targetId", "legacyId"].includes(key) && typeof value === "string") ids.add(value);
        else visit(value);
      }
    };
    visit(evidence);
    return [...ids];
  } catch { return null; }
}

export async function protectedDocumentEvidence(db: PoolConnection, scholar: string, semester: string) {
  const ids = new Set<string>();
  let incomplete = false;
  const add = (value: unknown) => {
    const references = evidenceDocumentIds(value);
    if (references === null) incomplete = true;
    else references.forEach(id => ids.add(id));
  };
  const [events] = await db.execute<RowDataPacket[]>(`SELECT e.snapshot,e.revision,e.action,e.review_event_id,
    approved.review_event_id AS approved_review,approved.snapshot AS approved_snapshot
    FROM semester_entitlements t
    LEFT JOIN semester_entitlement_events e ON e.entitlement_id=t.id
    LEFT JOIN payroll_allocations allocation ON allocation.entitlement_id=t.id
    LEFT JOIN semester_entitlement_events approved ON approved.id=allocation.approved_event_id
    WHERE t.scholar_id=? AND t.semester_id=? LOCK IN SHARE MODE`, [scholar, semester]);
  for (const event of events) {
    try {
      const value = decode(event.snapshot);
      if (object(value) && "evidence" in value) add(value.evidence);
      // Release/hold events reference the allocation's reviewed evidence; they
      // intentionally do not duplicate document snapshots.
      else if (object(value) && Number(event.revision) > 1 &&
        ["withheld", "approved", "unclaimed", "correction"].includes(event.action) &&
        typeof value.sourceHash === "string" && /^[a-f0-9]{64}$/.test(value.sourceHash) &&
        event.review_event_id === event.approved_review) {
        const approved = decode(event.approved_snapshot);
        add(object(approved) ? approved.evidence : null);
      } else incomplete = true;
    }
    catch { incomplete = true; }
  }
  const [frozen] = await db.execute<RowDataPacket[]>(`SELECT f.snapshot,a.id AS annual_id FROM ovr_finalizations f
    JOIN ovr_batches b ON b.id=f.batch_id JOIN payout_cycles p ON p.id=b.cycle_id
    JOIN semesters s ON s.id=p.semester_id
    JOIN scholarship_records a ON a.scholar_id=? AND a.academic_year_id=s.academic_year_id
    WHERE p.semester_id=? AND EXISTS(SELECT 1 FROM ovr_entries e WHERE e.batch_id=b.id AND e.scholarship_id=a.id
      AND e.action='add' AND e.batch_revision<=f.batch_revision AND NOT EXISTS
      (SELECT 1 FROM ovr_entries newer WHERE newer.batch_id=e.batch_id AND newer.scholarship_id=e.scholarship_id
        AND newer.batch_revision>e.batch_revision AND newer.batch_revision<=f.batch_revision))
    LOCK IN SHARE MODE`, [scholar, semester]);
  for (const row of frozen) {
    try {
      const value = decode(row.snapshot);
      if (!object(value) || !Array.isArray(value.entries)) { incomplete = true; continue; }
      let found = false;
      for (const entry of value.entries) {
        if (!object(entry) || typeof entry.scholarshipId !== "string") { incomplete = true; continue; }
        if (entry.scholarshipId === row.annual_id) { found = true; add(entry.evidence); }
      }
      if (!found) incomplete = true;
    } catch { incomplete = true; }
  }
  const [legacy] = await db.execute<RowDataPacket[]>(`SELECT e.evidence FROM payment_records paid
    JOIN ovr_batches b ON b.id=paid.batch_id JOIN payout_cycles p ON p.id=b.cycle_id
    JOIN scholarship_records a ON a.id=paid.scholarship_id
    LEFT JOIN ovr_entries e ON e.batch_id=b.id AND e.scholarship_id=a.id
    WHERE a.scholar_id=? AND p.semester_id=? AND NOT EXISTS
    (SELECT 1 FROM ovr_finalizations f WHERE f.batch_id=b.id) LOCK IN SHARE MODE`, [scholar, semester]);
  legacy.forEach(row => add(row.evidence));
  return { ids, issue: incomplete ? "Stored payroll document references are incomplete. Review the protected historical evidence." : null };
}
