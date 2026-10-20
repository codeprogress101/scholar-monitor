import { OFFICIAL_COHORT } from "../server/continuing/official-cohort";
import { receivingToday } from "./receiving-selection";
import FocusedDialog from "./FocusedDialog";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { SemesterSetup, SemesterSetupOptions } from "../server/continuing/semester-setup";
import { configurationRequest as request } from "./configuration-api";
import { ApiError, type Session } from "./auth-api";
import ErrorNotice from "./ErrorNotice";
import SemesterAvailability from "./SemesterAvailability";


function SetupSurface({compact,busy,onClose,children}:{compact:boolean;busy:boolean;onClose:()=>void;children:ReactNode}) {
  return compact ? <FocusedDialog title="Semester documents" busy={busy} onClose={onClose}>{children}</FocusedDialog> : <div><h3>Semester documents</h3>{children}</div>;
}

export default function ContinuingSemesterSetup({ batchId, session, canConfigure, canManagePolicies=false, compact=false, initialSemesterId="", onEnabled }: { batchId: string; session: Session; canConfigure: boolean; canManagePolicies?:boolean; compact?:boolean; initialSemesterId?:string; onEnabled?:()=>void }) {
  const [data, setData] = useState<SemesterSetupOptions | null>(null), [semesterId, setSemester] = useState(()=>initialSemesterId || sessionStorage.getItem(`continuing-semester:${batchId}`) || ""), [revision, setRevision] = useState(0);
  const [policyOn, setPolicyOn] = useState(receivingToday);
  const shared = batchId === OFFICIAL_COHORT;
  const [reuse, setReuse] = useState<{id:string; revision:number} | null>(null);
  const [revising, setRevising] = useState(false);
  const [form, setForm] = useState({ predecessorSemesterId: "", corDefinitionVersionId: "", cogDefinitionVersionId: "", issuer: "", reference: "", sourceReference: "", reviewed: false, coverageReason: "" });
  const [error, setError] = useState<string | ApiError>(""), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [open,setOpen]=useState(!compact),[uncertain,setUncertain]=useState(false),[childPending,setChildPending]=useState(false);
  const pending = useRef<{ signature: string; key: string; body:object } | null>(null), working = useRef(false);
  const path = `continuing-rosters/${batchId}/semester-setup`;
  useEffect(() => {
    const c = new AbortController();
    request<SemesterSetupOptions>(`${path}${semesterId ? `?semesterId=${semesterId}&policyDate=${policyOn}` : ""}`, { signal: c.signal })
      .then((v) => { if (!c.signal.aborted) { setData(v); setError(""); } })
      .catch((e) => { if (!c.signal.aborted) { setData(null); setError(e instanceof ApiError ? e : "Could not load semester setup. Retry."); } });
    return () => c.abort();
  }, [path, semesterId, policyOn, revision]);
  useEffect(()=>{sessionStorage.setItem(`continuing-semester:${batchId}`,semesterId);},[semesterId,batchId]);
  const period = data?.periods.find((p) => p.id === semesterId);
  const exists = data?.setups.some((s) => s.semesterId === semesterId);
  async function save(e: FormEvent) {
    e.preventDefault(); if (!period || working.current) return;
    working.current = true; setBusy(true); setError(""); setNotice("");
    const currentSetup = data?.setups.find(s => s.current && s.semesterId === semesterId);
    const {coverageReason,...setupFields}=form;
    const body = { ...setupFields, ...(coverageReason.trim()?{coverageReason}:{}), ...(reuse ? {reuseScopeId:reuse.id,reuseScopeRevision:reuse.revision} : {}), policyDate: policyOn, ...(revising && currentSetup ? { expectedScopeId: currentSetup.id, expectedScopeRevision: currentSetup.revision } : {}), semesterId, expectedSemesterVersion: period.version, predecessorSemesterId: data?.coverage?.predecessorId ?? form.predecessorSemesterId, ...(data?.coverage?.sourceHash ? { expectedCoverageHash: data.coverage.sourceHash } : {}) };
    const signature = JSON.stringify(body);
    if (!uncertain && pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID(), body:JSON.parse(JSON.stringify(body)) };
    try {
      await request(path, { body:pending.current!.body, csrf: session.csrfToken, key: pending.current!.key });
      pending.current=null;setUncertain(false);setRevising(false);setForm(f=>({...f,reviewed:false}));setNotice("Saved as disabled. Review before enabling.");
      setRevision((v) => v + 1);
    } catch (e) { setUncertain(!(e instanceof ApiError)||e.status>=500);setError(e instanceof ApiError ? e : "Result unconfirmed. Retry the same setup safely."); }
    finally { working.current = false; setBusy(false); }
  }
  function renderSetup(s: SemesterSetup) {
    const availability = s.current && canConfigure && <SemesterAvailability key={`${s.id}:${s.revision}`} setup={s} periods={data!.periods} batchId={batchId} session={session} blocked={childPending||busy||uncertain} onPending={setChildPending} onSaved={() => { if(s.mode === "disabled") onEnabled?.(); setData(null); setNotice("Setup availability saved. Historical revisions are preserved."); setRevision((v) => v + 1); }} />;
    return <div key={s.id} className="alert alert-info"><strong>{s.semesterName}: {s.mode}</strong><br />COR coverage: {s.semesterName}<br />COG coverage: {data!.periods.find((p) => p.id === s.predecessorSemesterId)?.name ?? "Period unavailable"}<br />Policy date: {s.policyDate ?? "Recorded semester start"}<details><summary>Authority &amp; record details</summary>Revision {s.revision}<br />Authority: {s.issuer} / {s.reference}<br />Source: {s.sourceReference}</details>
        {s.current && s.coverage.issue && <p role="alert" className="alert alert-warning mt-2">{s.coverage.issue}</p>}
        {s.current && s.coverage.predecessorId && s.coverage.predecessorId !== s.predecessorSemesterId && <p role="alert" className="alert alert-warning mt-2">The configured regular calendar requires {s.coverage.predecessorName}. Review this saved coverage; documents have not been moved.</p>}
        {availability && (s.mode === "enabled" ? <details><summary>Pause receiving</summary>{availability}</details> : availability)}
      </div>;
  }
  const current=data?.setups.filter(s=>s.current && (!semesterId || s.semesterId===semesterId))??[];
  const missing=!!period && !exists && (!data?.definitions.some(d=>d.documentKind==="enrollment") || !data?.definitions.some(d=>d.documentKind==="grades"));
  const problem=period && !period.available?"This semester is read only. Choose the current receiving semester.":missing?"Applicable enrollment and grades policies are required. Ask the Administrator to review document kinds and dates.":data?.coverage?.issue;
  return <section className="continuing-setup" aria-label={shared ? "Shared semester setup" : "Continuing semester setup"}>
    {compact && <div className="continuing-setup-bar"><div><strong>{shared ? "Shared semester documents" : "Semester documents"}</strong><span>{!data?"Checking setup...":current.length?`${current.length} semester setup${current.length===1 ? "" : "s"}`:(shared ? "One setup for selected new scholars" : "Not configured")}</span></div><button className="btn configuration-primary" onClick={()=>{setForm(f=>({...f,reviewed:false}));setOpen(true);}}>{current.length?"Manage semester documents":canConfigure?(shared ? "Set up once for new scholars" : "Set up semester documents"):"View semester setup"}</button></div>}
    {problem && <p role="alert" className="alert alert-warning">{problem} {canManagePolicies && <a href="#requirements">Open document policies</a>}</p>}
    {!open && <ErrorNotice error={error}/>}
    {open && <SetupSurface compact={compact} busy={busy||uncertain||childPending} onClose={()=>{setOpen(false);setForm(f=>({...f,reviewed:false}));}}>
    <p>{shared ? "Approve once. Selected new scholars inherit this setup automatically; dedicated cohort setups stay unchanged." : "Receive once. Use the verified documents for payroll."}</p>
    <ErrorNotice error={error}/>
    <button className="btn btn-outline-secondary mb-2" disabled={busy||uncertain||childPending} onClick={()=>{setForm(f=>({...f,reviewed:false}));setData(null);setRevision(v=>v+1);}}>Refresh setup</button>
    {notice && <p role="status">{notice}</p>}
    {!data ? <p>{error ? "Semester setup unavailable." : "Loading semester setup..."}</p> : <>
        <label className="form-label d-block">Receiving semester<select className="form-select" disabled={busy||uncertain||childPending} value={semesterId} onChange={(e) => { setSemester(e.target.value); setReuse(null); setRevising(false); setData(null); setNotice(""); setForm({ ...form, predecessorSemesterId: "", corDefinitionVersionId: "", cogDefinitionVersionId: "", reviewed: false, coverageReason: "" }); }}><option value="">Choose semester</option>{semesterId && !data.periods.some(p=>p.id===semesterId) && <option value={semesterId}>Saved semester unavailable ? choose another</option>}{data.periods.map((p) => <option key={p.id} value={p.id}>{p.name}{p.available ? "" : " (read only)"}</option>)}</select></label>
      {data.setups.filter((s) => s.current && s.semesterId===semesterId).map(renderSetup)}
      {data.setups.some((s) => !s.current && s.semesterId===semesterId) && <details className="mb-3"><summary>Setup history</summary>{data.setups.filter((s) => !s.current && s.semesterId===semesterId).map(renderSetup)}</details>}
      {canConfigure && period?.available && <form className="semester-setup-editor" onSubmit={(e) => void save(e)}><fieldset disabled={busy||uncertain||childPending}>

        {exists && !revising ? <button type="button" className="btn btn-outline-secondary" onClick={()=>{setRevising(true);setForm(f=>({...f,reviewed:false,corDefinitionVersionId:"",cogDefinitionVersionId:""}));}}>Revise document setup</button> : period && <>
          {shared && !!data.reusableSetups?.length && <label className="form-label d-block">Reuse existing settings<select className="form-select" value={reuse?.id ?? ""} onChange={e=>{
            const source=data.reusableSetups?.find(s=>s.id===e.target.value);
            setReuse(source ? {id:source.id,revision:source.revision} : null);
            setForm(f=>({...f,reviewed:false,corDefinitionVersionId:source?.corDefinitionVersionId??"",cogDefinitionVersionId:source?.cogDefinitionVersionId??"",predecessorSemesterId:source?.predecessorSemesterId??"",sourceReference:source?.sourceReference??"",issuer:"",reference:""}));
            if(source) setPolicyOn(source.policyDate);
          }}><option value="">Choose settings or configure below</option>{data.reusableSetups.map(s=><option key={s.id} value={s.id}>{s.sourceReference} - revision {s.revision}</option>)}</select><small>Settings only. Confirm authority for shared use below.</small></label>}
          <label className="form-label d-block">Policy applicability date<input type="date" className="form-control" required min={period.startsOn} max={period.endsOn} value={policyOn} onChange={e=>{setPolicyOn(e.target.value);setData(null);setForm(f=>({...f,reviewed:false,corDefinitionVersionId:"",cogDefinitionVersionId:""}));}} /></label>
          {data.coverage?.mode === "regular" ? <div className={data.coverage.issue ? "alert alert-warning" : "alert alert-info"} role={data.coverage.issue ? "alert" : "status"}>
            {data.coverage.issue ?? `COG coverage: ${data.coverage.predecessorName}. Selected from the configured regular semester sequence; confirm it with the document policy below.`}
          </div> : <label className="form-label d-block">Grades cover (preceding completed semester)<select className="form-select" required value={form.predecessorSemesterId} onChange={(e) => setForm({ ...form, reviewed:false, predecessorSemesterId: e.target.value })}><option value="">Choose coverage</option>{data.periods.filter((p) => p.endsOn < period.startsOn).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
          {data.coverage?.mode === "legacy" && <label className="form-label d-block">Preceding-semester review reason<input className="form-control" required minLength={5} maxLength={500} value={form.coverageReason} onChange={e=>setForm({...form,coverageReason:e.target.value,reviewed:false})}/></label>}
          <h3>Document policies</h3>{(["corDefinitionVersionId", "cogDefinitionVersionId"] as const).map((key) => <label className="form-label d-block" key={key}>{key === "corDefinitionVersionId" ? "COR policy (required for receiving semester)" : "COG policy (required for receiving semester)"}<select className="form-select" required value={form[key]} onChange={(e) => setForm({ ...form, reviewed:false, [key]: e.target.value })}><option value="">Choose document definition</option>{form[key] && !data.definitions.some(d=>d.id===form[key]) && <option value={form[key]}>Saved version unavailable - review policy</option>}{data.definitions.filter(d=>d.documentKind===(key==="corDefinitionVersionId"?"enrollment":"grades")).map((d) => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}</select></label>)}
          {!data.definitions.length && <p role="alert">Choose applicable enrollment and grades policies. Unclassified legacy policies need Administrator review.</p>}
          <h3>Approval evidence</h3>{(["issuer", "reference", "sourceReference"] as const).map((key) => <label className="form-label d-block" key={key}>{({ issuer: "Authorizing office / issuer", reference: "Authority reference", sourceReference: "Document-policy source" })[key]}<input className="form-control" required minLength={3} maxLength={key === "issuer" ? 200 : key === "reference" ? 300 : 500} value={form[key]} onChange={(e) => setForm({ ...form, reviewed:false, [key]: e.target.value })} /></label>)}
          <label className="d-block my-2"><input type="checkbox" required checked={form.reviewed} onChange={(e) => setForm({ ...form, reviewed: e.target.checked })} /> {shared ? "I reviewed authority for shared use and confirmed COR/COG coverage for selected new scholars." : "I reviewed the authority and confirmed the COR/COG coverage for this scholar group."}</label>
          <button className="btn btn-primary" disabled={!form.reviewed || ![form.corDefinitionVersionId,form.cogDefinitionVersionId].every(id=>data.definitions.some(d=>d.id===id)) || Boolean(data.coverage?.issue)}>Save setup</button>
        </>}
      </fieldset></form>}
    </>}{uncertain && <div role="alert"><p>Result unconfirmed. Retry before leaving.</p><button className="btn configuration-primary" disabled={busy} onClick={()=>void save({preventDefault:()=>{}} as FormEvent)}>Retry the same action</button></div>}
    </SetupSurface>}
  </section>;
}
