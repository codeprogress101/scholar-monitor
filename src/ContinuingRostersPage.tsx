import FocusedDialog from "./FocusedDialog";
import { useEffect, useRef, useState } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { Access } from "../server/authorization/policy";
import type { ScholarDetail, ScholarList } from "../server/scholars/model";
import type { Roster, RosterDetail } from "../server/continuing/model";
import { receivingToday } from "./receiving-selection";
import ErrorNotice from "./ErrorNotice";
import ContinuingSemesterSetup from "./ContinuingSemesterSetup";
import { PagedTable } from "./WorkspaceUI";

type Pick = { scholarId: string; version: number; sourceRow: number; originalName: string; humanId: string };
export default function ContinuingRostersPage({ session }: { session: Session }) {
  const [access, setAccess] = useState<Access | null>(null), [revision, setRevision] = useState(0);
  const [items, setItems] = useState<Roster[]>([]), [total, setTotal] = useState(0), [offset, setOffset] = useState(()=>Number(sessionStorage.getItem("continuing-list-offset"))||0);
  const [reviewOpen,setReviewOpen]=useState(false),[uncertain,setUncertain]=useState(false);
  const [selected, setSelected] = useState<RosterDetail | null>(null), [preparing, setPreparing] = useState(false);
  const [source, setSource] = useState(""), [query, setQuery] = useState(""), [people, setPeople] = useState<ScholarList | null>(null), [picks, setPicks] = useState<Pick[]>([]);
  const [error, setError] = useState<string | ApiError>(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState({ decision: "accepted", effectiveOn: receivingToday(), issuer: "", reference: "", reason: "", reviewed: false });
  const pending = useRef<{ signature: string; key: string; path:string; body:object } | null>(null), working = useRef(false);
  const canPrepare = access?.permissions.some((p) => p.code === "continuing.prepare");
  const canApprove = access?.permissions.some((p) => p.code === "continuing.approve");
  const failure = (e: unknown) => setError(e instanceof ApiError ? e : "Result unconfirmed. Retry the same action safely or refresh.");
  useEffect(() => {
    const controller = new AbortController();
    request<Access>("me/permissions", { signal: controller.signal }).then(setAccess).catch((e) => { if (!controller.signal.aborted) failure(e); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!canPrepare) return;
    const controller = new AbortController();
    request<{ items: Roster[]; total: number }>(`continuing-rosters?limit=20&offset=${offset}`, { signal: controller.signal }).then((v) => { setItems(v.items); setTotal(v.total); }).catch((e) => { if (!controller.signal.aborted) failure(e); });
    return () => controller.abort();
  }, [canPrepare, revision, offset]);
  useEffect(() => {
    if(!canPrepare)return;let controller=new AbortController();
    const load=()=>{controller.abort();controller=new AbortController();const signal=controller.signal;const id=new URLSearchParams(window.location.hash.split("?")[1]).get("roster");if(!id){setSelected(null);return;}request<RosterDetail>(`continuing-rosters/${id}`,{signal}).then(v=>{if(!signal.aborted)setSelected(v);}).catch(e=>{if(!signal.aborted)failure(e);});};
    load();window.addEventListener("popstate",load);window.addEventListener("hashchange",load);return()=>{controller.abort();window.removeEventListener("popstate",load);window.removeEventListener("hashchange",load);};
  },[canPrepare]);
  useEffect(()=>{sessionStorage.setItem("continuing-list-offset",String(offset));},[offset]);
  useEffect(()=>{const save=()=>sessionStorage.setItem(`continuing-scroll:${selected?.id??"list"}`,String(window.scrollY));window.addEventListener("scroll",save);const frame=requestAnimationFrame(()=>window.scrollTo(0,Number(sessionStorage.getItem(`continuing-scroll:${selected?.id??"list"}`))||0));return()=>{cancelAnimationFrame(frame);window.removeEventListener("scroll",save);};},[selected?.id]);
  function back(){setSelected(null);setPreparing(false);setNotice("");window.history.pushState(null,"","#scholars?task=continuing");}
  async function run(work: () => Promise<void>) {
    if (working.current) return;
    working.current = true; setBusy(true); setError("");
    try { await work(); } catch (e) { failure(e); } finally { working.current = false; setBusy(false); }
  }
  async function open(id: string) {
    const d = await request<RosterDetail>(`continuing-rosters/${id}`);
    setSelected(d); setPreparing(false); setNotice("");
    if(new URLSearchParams(window.location.hash.split("?")[1]).get("roster")!==id)window.history.pushState(null,"",`#scholars?task=continuing&roster=${id}`);
    setDecision({ decision: "accepted", effectiveOn: receivingToday(), issuer: "", reference: "", reason: "", reviewed: false });
  }
  async function send(path: string, body: object) {
    if(!uncertain) {const signature=JSON.stringify({path,body});if(pending.current?.signature!==signature)pending.current={signature,key:crypto.randomUUID(),path,body:JSON.parse(JSON.stringify(body))};}
    const command=pending.current!;let recorded=false;
    try {const result=await request<{id:string}>(command.path,{body:command.body,key:command.key,csrf:session.csrfToken});recorded=true;await open(result.id);pending.current=null;setUncertain(false);setReviewOpen(false);setRevision(v=>v+1);}
    catch(e){if(recorded || !(e instanceof ApiError) || e.status>=500){setUncertain(true);}else{pending.current=null;setUncertain(false);}throw e;}
  }

  if (!access) return <><ErrorNotice error={error} /><p>{error ? "Reopen this workspace to retry." : "Loading continuing-scholar workspace..."}</p></>;
  if (!canPrepare) return <p>Your account does not have continuing-scholar roster access.</p>;
  return <section className="continuing-workspace">
    <h1>Continuing roster review</h1>
    {!selected && <p>Prepare names for Coordinator review.</p>}
    <ErrorNotice error={error} />
    {notice && <p role="status" className="alert alert-success">{notice}</p>}
    {!selected && !preparing && <div className="d-flex flex-wrap gap-2 mb-3">
      <button className="btn btn-primary" disabled={busy} onClick={() => { setPreparing(true); setSelected(null); setError(""); }}>Prepare roster</button>
      <button className="btn btn-outline-secondary" disabled={busy} onClick={() => void run(async () => { setRevision((v) => v + 1); })}>Refresh</button>
      <a className="btn btn-outline-secondary" href="#scholars">Add or import scholar names</a>
    </div>}
    {(selected || preparing) && <button className="btn btn-outline-secondary back-link" disabled={busy} onClick={back}>Back to rosters</button>}
    {preparing && <FocusedDialog title="Prepare roster" busy={busy||uncertain} onClose={()=>setPreparing(false)}><ErrorNotice error={error}/><fieldset disabled={busy||uncertain}>
      <h2>Prepare roster</h2>
      <p>Use the registry to add/import names and resolve duplicates first. Match each hard-copy name to its permanent Scholar ID below. School, course and year level can be recorded when documents arrive.</p>
      <label>Roster source or location<input className="form-control" maxLength={500} value={source} onChange={(e) => setSource(e.target.value)} placeholder="For example: Continuing scholars list, page 1, cabinet A" /></label>
      <form className="d-flex flex-wrap gap-2 my-3" onSubmit={(e) => { e.preventDefault(); void run(async () => setPeople(await request<ScholarList>(`scholars?q=${encodeURIComponent(query)}&limit=20&offset=0`))); }}>
        <input aria-label="Find scholar" className="form-control" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or Scholar ID" />
        <button className="btn btn-outline-primary" disabled={busy}>Search</button>
      </form>
      {people && <><p>{people.total} matches. {people.total > 20 ? "Narrow the search to see the relevant names." : ""}</p>{people.items.map((p) => <div key={p.id} className="d-flex justify-content-between border-bottom py-2"><span>{p.displayName} — {p.scholarId}</span><button className="btn btn-sm btn-outline-primary" disabled={busy || picks.some((v) => v.scholarId === p.id) || picks.length >= 200} onClick={() => void run(async () => {
        const person = await request<ScholarDetail>(`scholars/${p.id}`);
        setPicks((v) => [...v, { scholarId: person.id, version: person.version, humanId: person.scholarId, originalName: person.displayName, sourceRow: Math.max(0, ...v.map((x) => x.sourceRow)) + 1 }]);
      })}>Add {p.scholarId}</button></div>)}</>}
      <h3 className="h5 mt-3">Selected names ({picks.length}/200)</h3>
      {picks.map((p, index) => <div className="border-bottom py-2" key={p.scholarId}>
        <div className="d-flex justify-content-between gap-2"><strong>{p.originalName}</strong><button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => setPicks(picks.filter((v) => v.scholarId !== p.scholarId))}>Remove {p.humanId}</button></div>
        <small>{p.humanId} / Source row {p.sourceRow}</small>
        <details><summary>Adjust roster spelling or row</summary><div className="row g-2">
        <label className="col-md-2">Source row<input className="form-control" type="number" min={1} value={p.sourceRow} onChange={(e) => setPicks(picks.map((v, i) => i === index ? { ...v, sourceRow: Number(e.target.value) } : v))} /></label>
        <label className="col-md-7">Name as written on roster<input className="form-control" maxLength={300} value={p.originalName} onChange={(e) => setPicks(picks.map((v, i) => i === index ? { ...v, originalName: e.target.value } : v))} /><small>{p.humanId}</small></label>
        </div></details>
      </div>)}
      <p className="small">Saving freezes this roster for review. A rejected roster stays in history; prepare a corrected replacement if needed.</p>
      <button className="btn btn-primary" disabled={busy || !picks.length || source.trim().length < 3} onClick={() => void run(async () => {
        await send("continuing-rosters", { sourceReference: source, entries: picks.map(({ humanId: _id, ...p }) => { void _id; return p; }) });
        setPicks([]); setSource(""); setPeople(null); setNotice("Roster saved for Coordinator review.");
      })}>Save for review</button>
    </fieldset>{uncertain && <button className="btn configuration-primary" disabled={busy} onClick={()=>void run(()=>send(pending.current!.path,pending.current!.body))}>Retry the same action</button>}</FocusedDialog>}
    {selected && <section className="card p-3 mb-3" aria-label="Roster review">
      <header className="continuing-header"><div><h2>{selected.sourceReference.match(/^Import [0-9a-f-]+: (.+)$/i)?.[1] ?? "Continuing roster"}</h2><p>{selected.entries.length} {selected.entries.length===1?"scholar":"scholars"} <span className="status-label">{selected.state}</span></p><p className="text-muted">{selected.sourceReference.match(/^Import [0-9a-f-]+: /i)?"Old/Continuing scholars from this import.":selected.sourceReference}</p></div>{selected.state==="pending" && canApprove && <button className="btn configuration-primary" onClick={()=>{setDecision(d=>({...d,reviewed:false}));setReviewOpen(true);setError("");}}>Review roster</button>}</header>
      <PagedTable key={`roster-${selected.id}`} storageKey={`continuing-members:${session.user.id}:${selected.id}`} pageSizes={[25,50,100]} items={selected.entries} label="Roster members" columns={["Scholar ID", "Name", "Source row", "Open"]} searchText={e => `${e.originalName} ${e.name} ${e.humanId}`} row={e => <tr key={e.scholarId}><td className="text-nowrap">{e.humanId}</td><td>{e.name}<details><summary>Original spelling</summary>{e.originalName}</details></td><td>{e.sourceRow}</td><td><a className="btn btn-sm btn-outline-secondary" href={`#scholars?scholar=${e.scholarId}`}>Open</a></td></tr>} />
      {selected.state === "accepted" && <ContinuingSemesterSetup compact key={selected.id} batchId={selected.id} session={session} canConfigure={access.permissions.some((p) => p.code === "semesters.configure")} canManagePolicies={access.permissions.some(p=>p.code==="configuration.manage")} />}
      <details><summary>Details &amp; approval history</summary><p>{selected.code}</p><p>Source: {selected.sourceReference}</p>
      <p>Historical admission documents and prior shift count: <strong>Not recorded</strong>. Acceptance does not establish semester compliance or payout eligibility.</p>
      {selected.decision && <p>Recorded by {selected.decision.actorName}, effective {selected.decision.effectiveOn}. Authority: {selected.decision.issuer} — {selected.decision.reference}. {selected.decision.reason}</p>}
      </details>
      {selected.state === "pending" && canApprove && reviewOpen && <FocusedDialog title="Review roster" busy={busy||uncertain} onClose={()=>{setReviewOpen(false);setDecision(d=>({...d,reviewed:false}));}}><ErrorNotice error={error}/><form onSubmit={(e) => { e.preventDefault(); void run(async () => { await send(`continuing-rosters/${selected.id}/decision`, { ...decision, expectedRevision: selected.revision }); setNotice(""); }); }}><fieldset disabled={busy||uncertain}>
        <label className="d-block mb-2">Decision<select className="form-select" value={decision.decision} onChange={(e) => setDecision({ ...decision, decision: e.target.value,reviewed:false })}><option value="accepted">Accept prior participation</option><option value="rejected">Reject roster</option></select></label>
        <label className="d-block mb-2">Decision date<input type="date" className="form-control" required max={receivingToday()} value={decision.effectiveOn} onChange={(e) => setDecision({ ...decision, effectiveOn: e.target.value,reviewed:false })} /></label>
        <label className="d-block mb-2">Issuing authority<input className="form-control" required minLength={3} maxLength={200} value={decision.issuer} onChange={(e) => setDecision({ ...decision, issuer: e.target.value })} /></label>
        <label className="d-block mb-2">Actual approval / delegation reference<input className="form-control" required minLength={3} maxLength={300} value={decision.reference} onChange={(e) => setDecision({ ...decision, reference: e.target.value })} /></label>
        <small>Recorded once for this roster, shared by its members. Do not enter a made-up authority.</small>
        <label className="d-block my-2">{decision.decision === "rejected" ? "Reason for rejection" : "Note (optional)"}<input className="form-control" required={decision.decision === "rejected"} minLength={decision.decision === "rejected" ? 5 : undefined} maxLength={500} value={decision.reason} onChange={(e) => setDecision({ ...decision, reason: e.target.value })} /></label>
        <label className="d-block my-3"><input type="checkbox" required checked={decision.reviewed} onChange={(e) => setDecision({ ...decision, reviewed: e.target.checked })} /> I checked the hard-copy roster, identity matches, and the authority for this decision.</label>
        <button className="btn btn-primary" disabled={busy}>Record decision</button>
      </fieldset></form>{uncertain && <div role="alert"><p>Result unconfirmed. Retry before leaving.</p><button className="btn configuration-primary" disabled={busy} onClick={()=>void run(()=>send(pending.current!.path,pending.current!.body))}>Retry the same action</button></div>}</FocusedDialog>}
      {selected.state === "pending" && !canApprove && <p>The Coordinator must review this roster.</p>}
    </section>}
    <div hidden={!!selected || preparing}><h2 className="h4">Saved rosters</h2>
    {items.map((r) => <div key={r.id} className="border-bottom py-2"><button className="btn btn-link" disabled={busy} onClick={() => void run(() => open(r.id))}>{r.sourceReference}</button> — {r.state}</div>)}
    {!items.length && <p>No rosters saved yet.</p>}
    <div className="d-flex gap-2 mt-3"><button className="btn btn-outline-secondary" disabled={busy || offset === 0} onClick={() => setOffset(offset - 20)}>Previous</button><button className="btn btn-outline-secondary" disabled={busy || offset + 20 >= total} onClick={() => setOffset(offset + 20)}>Next</button></div>
    </div>
  </section>;
}
