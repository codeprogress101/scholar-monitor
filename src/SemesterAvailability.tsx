import { useRef, useState, type FormEvent } from "react";
import type { SemesterSetup, SemesterSetupOptions } from "../server/continuing/semester-setup";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import ErrorNotice from "./ErrorNotice";

export default function SemesterAvailability({ setup, periods, batchId, session, onSaved, onPending, blocked=false }: {
  setup: SemesterSetup; periods: SemesterSetupOptions["periods"]; batchId: string; session: Session; onSaved: () => void; onPending?:(pending:boolean)=>void; blocked?:boolean;
}) {
  const [reviewed, setReviewed] = useState(false), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<string | ApiError>("");
  const [uncertain,setUncertain]=useState(false);
  const pending = useRef<{ signature: string; key: string; body:object; path:string } | null>(null), working = useRef(false);
  const enable = setup.mode === "disabled";
  const recover = enable && setup.recordCount > 0 && setup.setupRevision !== setup.revision;
  const semester = periods.find((p) => p.id === setup.semesterId), previous = periods.find((p) => p.id === setup.predecessorSemesterId);
  async function save(e: FormEvent) {
    e.preventDefault(); if (working.current || !semester || !previous) return;
    working.current = true; setBusy(true);onPending?.(true); setError("");
    const body = { scopeId: setup.id, expectedRevision: setup.revision, mode: enable ? "enabled" : "disabled", expectedSemesterVersion: semester.version, expectedPredecessorVersion: previous.version, reviewed, reason, ...(enable && setup.coverage.sourceHash ? { expectedCoverageHash: setup.coverage.sourceHash } : {}), ...(recover ? { expectedRecordCount: setup.recordCount } : {}) };
    const signature = JSON.stringify(body);
    if (!uncertain && pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID(),body:JSON.parse(JSON.stringify(body)),path:`continuing-rosters/${batchId}/semester-setup/${recover ? "recover" : "availability"}` };
    try { await request(pending.current!.path, { body:pending.current!.body, key: pending.current!.key, csrf: session.csrfToken });setUncertain(false);setReviewed(false);onPending?.(false);onSaved(); }
    catch (e) { const unknown=!(e instanceof ApiError)||e.status>=500;setUncertain(unknown);onPending?.(unknown);setError(e instanceof ApiError ? e : "Result unconfirmed. Retry safely or reload setup."); }
    finally { working.current = false; setBusy(false); }
  }
  return <form className="mt-3" onSubmit={(e) => void save(e)}>
    <ErrorNotice error={error} />
    <fieldset disabled={busy||uncertain||blocked}>
      <p className="small">Enabling lets Staff receive documents for scholars covered by this setup. This action creates no receipts, compliance findings or payout eligibility.</p>
      {semester && previous && <p className="small">Receiving: {semester.startsOn} to {semester.endsOn}. COG coverage ends {previous.endsOn}.</p>}
      {recover && <p>{setup.recordCount} existing scholar semester record(s) will be checked against this policy. Recovery preserves documents and history; it does not reopen closed payroll.</p>}
      {(!enable || recover) && <label className="form-label d-block">{recover ? "Reason for recovery" : "Reason for disabling"}<input className="form-control" required minLength={5} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
      <label className="d-block mb-2"><input type="checkbox" required checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> {recover ? "I reviewed the affected records and authorize resuming them under the unchanged document policy." : enable ? "I reviewed the recorded authority and coverage and authorize enabling this semester setup." : "I confirm that new document actions for this setup must stop."}</label>
      <button className={enable ? "btn configuration-primary" : "btn btn-outline-primary"} disabled={!reviewed || !semester || !previous || (enable && Boolean(setup.coverage.issue || (setup.coverage.predecessorId && setup.coverage.predecessorId !== setup.predecessorSemesterId)))}>{recover ? "Recover semester setup" : enable ? "Review and enable" : "Disable semester setup"}</button>
    </fieldset>{uncertain && <button type="submit" className="btn configuration-primary" disabled={busy}>Retry the same action</button>}
  </form>;
}
