import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import { paymentRecords } from "../ovr/processing-state.js";

export type Graduation = { scholarshipId?: string; requestId: string | null; semesterId: string | null; semesterName: string | null; archived: boolean; label: string };
export async function graduationRecords(db: PoolConnection, scholarId?: string): Promise<Map<string, Graduation>> {
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT r.id AS scholarship_id,r.scholar_id,g.request_id,g.semester_id,s.name AS semester_name,x.no_outstanding_stipend,y.code AS graduated_before_year
    FROM scholarship_records r LEFT JOIN status_change_requests q ON q.scholarship_id=r.id AND q.to_status='graduated'
      AND EXISTS(SELECT 1 FROM status_change_decisions d WHERE d.request_id=q.id AND d.decision='approve'
        AND (d.resulting_version=r.status_version OR EXISTS(SELECT 1 FROM graduation_record_corrections gc WHERE gc.request_id=q.id AND gc.no_outstanding_stipend=1 AND EXISTS(SELECT 1 FROM status_change_requests cq JOIN status_change_decisions cd ON cd.request_id=cq.id WHERE cq.scholarship_id=r.id AND cq.reason_code='GRADUATION' AND cq.to_status<>'graduated' AND cd.decision='approve' AND cd.resulting_version=r.status_version))))
    LEFT JOIN graduation_confirmations g ON g.request_id=q.id LEFT JOIN semesters s ON s.id=g.semester_id
    LEFT JOIN graduation_record_corrections x ON x.request_id=g.request_id LEFT JOIN academic_years y ON y.id=x.graduated_before_year_id
    WHERE (r.operational_status='graduated' OR x.no_outstanding_stipend=1) ${scholarId ? "AND r.scholar_id=?" : ""} ORDER BY r.status_effective_on DESC`, scholarId ? [scholarId] : []);
  const result = new Map<string, Graduation>();
  const paymentCache = new Map<string, Awaited<ReturnType<typeof paymentRecords>>>();
  for (const r of rows) {
    if (result.has(r.scholar_id)) continue;
    if (r.no_outstanding_stipend) {
      result.set(r.scholar_id, { scholarshipId: r.scholarship_id, requestId: r.request_id, semesterId: null, semesterName: null, archived: true,
        label: `Graduated before ${r.graduated_before_year} — Archived; no stipend due` });
      continue;
    }
    let paid = false;
    if (r.semester_id) {
      const [batches] = await db.execute<RowDataPacket[]>("SELECT DISTINCT p.batch_id,p.scholarship_id FROM payment_records p JOIN scholarship_records a ON a.id=p.scholarship_id JOIN payout_cycles c ON c.id=p.cycle_id WHERE a.scholar_id=? AND c.semester_id=?", [r.scholar_id, r.semester_id]);
      for (const b of batches) {
        if (!paymentCache.has(b.batch_id)) paymentCache.set(b.batch_id, await paymentRecords(db, b.batch_id));
        paid ||= paymentCache.get(b.batch_id)!.some(p => p.scholarshipId === b.scholarship_id && p.outcome === "paid" && p.amount === "5000.00");
      }
    }
    const [[entitlement]] = await db.execute<RowDataPacket[]>("SELECT id FROM semester_entitlements WHERE scholar_id=? AND semester_id=? LIMIT 1 LOCK IN SHARE MODE", [r.scholar_id, r.semester_id ?? null]);
    result.set(r.scholar_id, { scholarshipId: r.scholarship_id, requestId: r.request_id ?? null, semesterId: r.semester_id ?? null, semesterName: r.semester_name ?? null, archived: paid,
      label: !r.semester_id ? "Graduated — final semester requires review" : paid ? "Graduated / Archived — final stipend received" : entitlement ? "Graduated — Final stipend pending" : "Graduated — no approved final stipend; review eligibility" });
  }
  return result;
}
export async function graduationFor(db: PoolConnection, scholar: string) { return (await graduationRecords(db, scholar)).get(scholar) ?? null; }
export async function preventGraduateRenewal(db: PoolConnection, scholar: string, semester?: string) {
  const graduation = await graduationFor(db, scholar);
  if (graduation && (graduation.archived || !semester || graduation.semesterId !== semester)) throw new AuthError(409, "GRADUATE_RENEWAL_BLOCKED", "Graduation is confirmed. Document receiving is closed except for an unpaid, explicitly confirmed final funded semester; retain this scholar's history.");
}

/** Annual reports must agree with the corrected graduation view without rewriting prior years. */
export function annualOperationalStatus(annualId: string, storedStatus: string | null, graduation?: Graduation) {
  return graduation?.scholarshipId === annualId ? "graduated" : storedStatus;
}
