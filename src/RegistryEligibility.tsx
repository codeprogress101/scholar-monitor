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
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
  void Promise.resolve().then(() => { if (!controller.signal.aborted) setState({ data: null, error: "", loading: true }); });
  request<RegistryEligibility>(`scholars/eligibility?ids=${encodeURIComponent(ids)}${period ? `&periodId=${period}` : ""}${academicYearId?`&academicYearId=${academicYearId}`:""}${semesterId?`&semesterId=${semesterId}`:""}`, { signal }).then(data => { if (!controller.signal.aborted) setState({ data, error: "", loading: false }); }).catch(() => { if (!controller.signal.aborted) setState({ data: null, error: "Eligibility could not be loaded. Refresh to retry.", loading: false }); });
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
export function compactRegistryLabel(label:string){return ({"Already on payroll":"On payroll","Academic eligibility recorded at payroll approval":"At payroll approval","Academic assessment needed":"Review academics"} as Record<string,string>)[label]??label;}
export default function RegistryEligibilityCell({ state, scholarId, mode = "academic", compact=false, scholarLabel }: { state: State; scholarId: string; mode?: "academic" | "requirements" | "payout";compact?:boolean;scholarLabel?:string }) {
 const [reasonsOpen,setReasonsOpen]=useState(false);
 if (state.loading) return <>Checking...</>;
 if (state.error) return <>Unavailable</>;
 const row = state.data?.items.find(r => r.scholarId === scholarId), period = state.data?.periods.find(p => p.id === state.data?.periodId);
 if (!row) return <>Choose period</>;
 const reasons=mode==="payout" ? row.payout?.reasons ?? row.reasons : row.reasons;
 const label=mode==="requirements" ? row.requirements?.label ?? "Choose semester" : mode==="payout" ? row.payout?.status ?? row.inclusion ?? "Not assessed" : row.academicBasis === "payroll_approval" ? "Academic eligibility recorded at payroll approval" : row.academicEligible ? "Academically eligible" : "Academic assessment needed";
 return <>{compact?<span className="registry-status" title={label}><span aria-hidden="true">{compactRegistryLabel(label)}</span><span className="visually-hidden">{label}</span></span>:<span>{label}</span>}{mode!=="requirements" && (!!reasons.length || !!row.links?.length) && <button type="button" className="registry-reasons" aria-label={compact?`${mode==="payout"?"Payout":"Academic"} details for ${scholarLabel??scholarId}`:undefined} onClick={()=>setReasonsOpen(true)}>{compact?"Details":"View reasons"}</button>}
 {reasonsOpen && <FocusedDialog title={mode==="payout"?"Payout details":"Academic assessment"} onClose={()=>setReasonsOpen(false)}>
 <p>{label}</p>{mode==='payout'&&row.payout?.context&&<><p>{row.payout.context.year} / {row.payout.context.semester} · {row.payout.context.batchCode?`Assessing ${row.payout.context.batchCode}`:'No payroll batch selected for this scholar'}</p>{row.payout.publishedActive&&<p>Published and Active. Official membership does not establish payment eligibility.</p>}</>}
 <ul>{reasons.filter(r=>!['NOT_ELIGIBLE','INCOMPLETE_REQUIREMENTS'].includes(r.code)||reasons.length===1).map(r=>{const action=period?scholarIssueAction(r.code,scholarId,period.academicYearId,period.semesterId,period.id):null;return <li key={[r.code,r.requirementCode,r.message].join(':')}>{r.message}{r.details?.length?<ul>{r.details.map(detail=><li key={detail}>{detail}</li>)}</ul>:null}{action&&<><p className="mt-1 mb-1">{action.href?<a href={action.href}>{action.label}</a>:<span>{action.label}</span>}</p>{action.explanation&&<p>{action.explanation}</p>}</>}</li>;})}</ul>
 {reasons.length>1&&reasons.some(r=>['NOT_ELIGIBLE','INCOMPLETE_REQUIREMENTS'].includes(r.code))&&<details><summary>Assessment summary</summary><ul>{reasons.filter(r=>['NOT_ELIGIBLE','INCOMPLETE_REQUIREMENTS'].includes(r.code)).map(r=><li key={r.code}>{r.code==='NOT_ELIGIBLE'&&mode==='payout'&&row.payout?.context&&!row.payout.context.batchId?'Payment eligibility has not been assessed for a new batch.':r.message}</li>)}</ul></details>}
 {row.links?.map(link=><p key={link.href+link.label}><a href={link.href}>{link.label}</a></p>)}
 </FocusedDialog>}</>;
}
