import FocusedDialog from "./FocusedDialog";
import { useEffect, useState } from "react";
import type { RegistryEligibility } from "../server/scholars/registry-eligibility";
import { configurationRequest as request } from "./configuration-api";
import { scholarIssueAction } from "./scholar-issue-navigation";
type State = { data: RegistryEligibility | null; error: string; loading: boolean };
export function useRegistryEligibility(ids: string, period: string, revision: number, allowed: boolean, academicYearId = "", semesterId = "") {
 const [state, setState] = useState<State>({ data: null, error: "", loading: false });
 useEffect(() => {
  if (!allowed) return;
  const controller = new AbortController();
  void Promise.resolve().then(() => { if (!controller.signal.aborted) setState({ data: null, error: "", loading: true }); });
  request<RegistryEligibility>(`scholars/eligibility?ids=${encodeURIComponent(ids)}${period ? `&periodId=${period}` : ""}${academicYearId?`&academicYearId=${academicYearId}`:""}${semesterId?`&semesterId=${semesterId}`:""}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setState({ data, error: "", loading: false }); }).catch(() => { if (!controller.signal.aborted) setState({ data: null, error: "Eligibility could not be loaded. Refresh to retry.", loading: false }); });
  return () => controller.abort();
 }, [ids, period, revision, allowed, academicYearId, semesterId]);
 return state;
}
export function RegistryPeriodPicker({ state, value, onChange }: { state: State; value: string; onChange: (v: string) => void }) {
 if (state.error) return <p role="alert">{state.error}</p>;
 if (!state.data) return null;
 if (!state.data.periods.length) return <p>No payroll period available</p>;
 if (state.data.periods.length === 1) return <p>Payroll eligibility: {state.data.periods[0].name}</p>;
 return <label>Payroll period<select className="form-select" value={value} onChange={e => onChange(e.target.value)}><option value="">Choose period (including history)</option>{state.data.periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>;
}
export default function RegistryEligibilityCell({ state, scholarId, mode = "academic" }: { state: State; scholarId: string; mode?: "academic" | "requirements" | "payout" }) {
 const [reasonsOpen,setReasonsOpen]=useState(false);
 if (state.loading) return <>Checking...</>;
 if (state.error) return <>Unavailable</>;
 const row = state.data?.items.find(r => r.scholarId === scholarId), period = state.data?.periods.find(p => p.id === state.data?.periodId);
 if (!row) return <>Choose period</>;
 const reasons=mode==="payout" ? row.payout?.reasons ?? row.reasons : row.reasons;
 const label=mode==="requirements" ? row.requirements?.label ?? "Choose semester" : mode==="payout" ? row.payout?.status ?? row.inclusion ?? "Not assessed" : row.academicBasis === "payroll_approval" ? "Academic eligibility recorded at payroll approval" : row.academicEligible ? "Academically eligible" : "Academic assessment needed";
 return <><span>{label}</span>{mode!=="requirements" && (!!reasons.length || !!row.links?.length) && <button type="button" className="registry-reasons" onClick={()=>setReasonsOpen(true)}>View reasons</button>}
 {reasonsOpen && <FocusedDialog title={mode==="payout"?"Payout details":"Academic assessment"} onClose={()=>setReasonsOpen(false)}>
 <p>{label}</p><ul>{reasons.map(r=>{const action=period?scholarIssueAction(r.code,scholarId,period.academicYearId,period.semesterId,period.id):null;return <li key={r.code}>{r.message}{action&&<> <a href={action.href}>{action.label}</a></>}</li>;})}</ul>
 {row.links?.map(link=><p key={link.href+link.label}><a href={link.href}>{link.label}</a></p>)}
 </FocusedDialog>}</>;
}
