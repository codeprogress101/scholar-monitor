import { useRef, useState } from "react";
import type { SemesterEligibilityPreview as Preview } from "../server/continuing/semester-eligibility-preview";
import { configurationRequest as request } from "./configuration-api";
import { ApiError } from "./auth-api";
import ErrorNotice from "./ErrorNotice";

export default function SemesterEligibilityPreview({ path }: { path: string }) {
  const [data, setData] = useState<Preview | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | ApiError>("");
  const loading = useRef(false);
  async function load(cycleId?: string) {
    if (loading.current) return;
    loading.current = true; setBusy(true); setError(""); setData(null);
    try { setData(await request<Preview>(`${path}/eligibility-preview${cycleId ? `?cycleId=${encodeURIComponent(cycleId)}` : ""}`)); }
    catch (e) { setError(e instanceof ApiError ? e : "Could not check payout readiness."); }
    finally { loading.current = false; setBusy(false); }
  }
  return <details className="border rounded p-3 my-3"><summary>Payout readiness (preview)</summary>
    <p>Payroll eligibility includes the selected batch cutoff and existing allocations. Open <a href="#payouts">Payout cycles → Payroll drafts</a> to review automatic candidates and preview the form.</p>
    <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => void load(data?.selectedCycleId ?? undefined)}>{busy ? "Checking..." : "Check payout readiness"}</button>
    <ErrorNotice error={error} />
    {data?.managedPayroll ? <p>Use this semester's numbered payroll batch for the current authoritative result. Its candidate list shows the specific blockers and already-allocated scholars. This earlier comparison does not approve a new allocation.</p> : data && <section aria-label="Semester payout readiness result">
      <h6 className="mt-3">{data.candidate ? "Semester conditions met (preview)" : "Review needed before a new entitlement"}</h6>
      {data.proposedAmountCentavos !== null && <p>Degree benefit under the proposed calculation: PHP 5,000 per eligible semester. This is not an approved amount or payment record.</p>}
      {data.reasons.length > 0 && <ul>{data.reasons.map((r) => <li key={r.code}>{r.message}</li>)}</ul>}
      {data.sources.compliance.blockers.length > 0 && <details><summary>Academic conditions to resolve</summary><ul>{data.sources.compliance.blockers.map((r) => <li key={r}>{r}</li>)}</ul></details>}
      <p>Admission basis: {data.sources.participation.basis === "continuing_baseline" ? "Reviewed continuing-scholar roster" : "Requires review"}. Academic review: {data.sources.compliance.stale ? "Evidence changed" : data.sources.compliance.result.replaceAll("_", " ")}.{data.sources.compliance.academicOnly && " Academic only; no retroactive payment authorization."}</p>
      {data.sources.financial.cycles.length > 1 && <label className="form-label d-block">Legacy payout cycle<select className="form-select" value={data.selectedCycleId ?? ""} disabled={busy} onChange={(e) => void load(e.target.value)}><option value="" disabled>Choose a cycle to compare</option>{data.sources.financial.cycles.map((c) => <option key={c.id} value={c.id}>{c.code} ({c.state})</option>)}</select></label>}
      <h6>Legacy comparison</h6>
      <p>{data.comparison.message}</p>
      {data.comparison.kind !== "not_comparable" && <>
        <p>{data.comparison.kind === "matches" ? "Normal-rule results agree." : "Normal-rule results differ; review their reasons before rollout."} Cycle state: {data.comparison.cycleState}. {data.comparison.canCalculate ? "Cycle permits legacy calculations." : "Cycle is not open for legacy calculations."}</p>
        <table className="table table-sm"><thead><tr><th scope="col">Calculation</th><th scope="col">Result</th></tr></thead><tbody>
          <tr><th scope="row">Semester initial-entitlement conditions</th><td>{data.candidate ? "Met (preview)" : "Needs review"}</td></tr>
          <tr><th scope="row">Legacy normal rules</th><td>{data.comparison.normalEligible ? "Eligible" : "Not eligible"}</td></tr>
          <tr><th scope="row">Legacy with applicable override</th><td>{data.comparison.effective.label}{data.comparison.effective.overrideStale && " (older override is stale)"}</td></tr>
          <tr><th scope="row">Last saved legacy calculation</th><td>{data.comparison.saved ? `${data.comparison.saved.eligible ? "Eligible" : "Not eligible"}${data.comparison.saved.stale ? "; current evidence differs" : ""}` : "None saved"}</td></tr>
        </tbody></table>
        {data.comparison.normalReasons.length > 0 && <details><summary>Legacy reasons</summary><ul>{data.comparison.normalReasons.map((r, i) => <li key={`${r.code}:${i}`}>{r.message}</li>)}</ul></details>}
      </>}
      <p>Existing entitlements: {data.sources.financial.entitlementIds.length}. Legacy batches: {data.sources.financial.batchIds.length}. Legacy payment records: {data.sources.financial.paymentIds.length}. Existing records retain their own approval and release status.</p>
    </section>}
  </details>;
}
