import { useEffect, useState } from "react";
import { ArrowRight, Search, FileInput, ClipboardCheck, Wallet, RefreshCw } from "lucide-react";
import { configurationRequest as request } from "./configuration-api";
import { ApiError } from "./auth-api";
import type { Access, PermissionCode } from "../server/authorization/policy";
import type { PayoutCycle } from "../server/payouts/model";
import type { Dashboard } from "../server/dashboard/service";
import type { NoticeList } from "../server/notifications/service";
import { REPORTS, type ReportKind } from "../server/reports/model";
import type { Masterlist } from "../server/masterlists/model";
import AdminGuide from "./AdminGuide";

type Card = Dashboard["cards"][number];
const units: Record<ReportKind,string> = { scholars:"annual scholar records", missing:"documents", verification:"documents", eligibility:"annual scholar assessments", ovr:"batches", payments:"processing entries", masterlists:"masterlist versions" };
const labels: Record<string,string> = {not_generated:"Not Generated",ovr_blocked:"Payroll checks blocked",ovr_passed:"Payroll checks passed",not_paid:"Not paid",pending:"No recorded outcome"};
const label = (value:string) => labels[value] ?? value.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase());
const failure = (e:unknown) => e instanceof ApiError ? e.code === "REPORT_SCOPE_TOO_LARGE" ? e.message : e.message : "Could not load this information. Refresh to try again.";
const reportLink = (cycleId:string,kind:ReportKind) => `#reports?cycleId=${cycleId}&kind=${kind}`;

const readableYear=(value:string)=>value.replace(/^AY/,"Academic year ");
const readableSemester=(value:string)=>/1ST$/i.test(value)?"First semester":/2ND$/i.test(value)?"Second semester":value;
const dateLabel=(value:string)=>new Date(`${value}T12:00:00+08:00`).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric",timeZone:"Asia/Manila"});
function Counts({card}:{card:Card}) {return <dl className="desk-counts">{Object.entries(card.counts).map(([key,value])=><div key={key}><dt>{label(key)}</dt><dd>{value.toLocaleString()}</dd></div>)}</dl>;}
export default function DashboardPage() {
 const [access,setAccess]=useState<Access|null>(null),[cycles,setCycles]=useState<PayoutCycle[]>([]),[cycleId,setCycleId]=useState("");
 const [metadataReady,setMetadataReady]=useState(false),[metadataError,setMetadataError]=useState("");
 const [data,setData]=useState<Dashboard|null>(null),[error,setError]=useState("");
 const [pending,setPending]=useState<NoticeList|null>(null),[pendingError,setPendingError]=useState("");
 const [reload,setReload]=useState(0),[metricsLoading,setMetricsLoading]=useState(false),[pendingLoading,setPendingLoading]=useState(true);
 const [selectionMessage,setSelectionMessage]=useState("");
 const [official,setOfficial]=useState<Masterlist[]|null>(null),[officialError,setOfficialError]=useState("");
 const can=(code:PermissionCode)=>!!access?.permissions.some(p=>p.code===code);
 const masterlistAccess=!!access?.permissions.some(p=>p.code==="masterlists.prepare");
 const operational=!!access && Object.values(REPORTS).some(r=>access.permissions.some(p=>p.code===r.permission));
 useEffect(()=>{
  const controller=new AbortController(); const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(60000)]);
  (async()=>{
   const a=await request<Access>("me/permissions",{signal});if(controller.signal.aborted)return;setAccess(a);
   if(!Object.values(REPORTS).some(r=>a.permissions.some(p=>p.code===r.permission)))return;
   const all:PayoutCycle[]=[];
   for(let offset=0;;){const result=await request<{items:PayoutCycle[];total:number}>(`payout-cycles?limit=100&offset=${offset}`,{signal});all.push(...result.items);offset+=result.items.length;if(offset>=result.total || !result.items.length)break;}
   if(controller.signal.aborted)return;setCycles(all);
   const saved=sessionStorage.getItem(`home-cycle:${a.userId}`);
   const open=all.filter(c=>c.state==="open"&&!c.periodUnavailable);
   if(saved && all.some(c=>c.id===saved)){setCycleId(saved);setSelectionMessage("");}
   else if(saved){setCycleId("");setSelectionMessage("Your saved cycle is no longer available. Choose a period to continue.");}
   else {setCycleId(open.length===1?open[0].id:"");setSelectionMessage("");}
  })().catch(e=>{if(!controller.signal.aborted)setMetadataError(failure(e));}).finally(()=>{if(!controller.signal.aborted)setMetadataReady(true);});
  return ()=>controller.abort();
 },[reload]);
 useEffect(()=>{
  if(!metadataReady || metadataError || !operational || !cycleId)return;
  const controller=new AbortController();
  request<Dashboard>(`dashboard?cycleId=${cycleId}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(60000)])})
   .then(value=>{if(!controller.signal.aborted)setData(value);}).catch(e=>{if(!controller.signal.aborted)setError(failure(e));}).finally(()=>{if(!controller.signal.aborted)setMetricsLoading(false);});
  return ()=>controller.abort();
 },[cycleId,metadataReady,metadataError,operational]);
 useEffect(()=>{
  if(!operational)return;
  const controller=new AbortController();
  request<NoticeList>("notifications?mode=pending",{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])})
   .then(value=>{if(!controller.signal.aborted)setPending(value);}).catch(e=>{if(!controller.signal.aborted)setPendingError(failure(e));}).finally(()=>{if(!controller.signal.aborted)setPendingLoading(false);});
  return ()=>controller.abort();
 },[operational,reload]);
 useEffect(()=>{
  if(!masterlistAccess)return;
  const controller=new AbortController();
  (async()=>{const all:Masterlist[]=[];for(let offset=0;;){const result=await request<{items:Masterlist[];total:number}>(`masterlists?scope=current&offset=${offset}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});all.push(...result.items);offset+=result.items.length;if(offset>=result.total||!result.items.length)break;}if(!controller.signal.aborted){setOfficial(all.filter(m=>["published","locked"].includes(m.status)));setOfficialError("");}})().catch(e=>{if(!controller.signal.aborted)setOfficialError(failure(e));});
  return ()=>controller.abort();
 },[masterlistAccess,reload]);
 const selected=cycles.find(c=>c.id===cycleId);
 const current=data?.context.cycleId===cycleId && metadataReady && !metadataError ? data : null;
 const card=(kind:ReportKind)=>current?.cards.find(c=>c.kind===kind);
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const overdue=selected?.state==="open" && selected.targetDate && selected.targetDate<today;
 const value=(kind:ReportKind,key:string)=>card(kind)?.counts[key]??0;
 const kpis:[ReportKind,string,string,string][]=[["scholars","active","Active scholars","Annual standing"],["missing","not_submitted","Not submitted","Document records"],["eligibility","ovr_passed","Payroll checks passed","Before batch validation"],["payments","paid","Confirmed paid entries","Effective recorded outcomes"]];
 function choose(id:string){setMetricsLoading(Boolean(id));setCycleId(id);setData(null);setError("");setSelectionMessage("");if(access)sessionStorage.setItem(`home-cycle:${access.userId}`,id);}

 return <section className="operations-desk" aria-labelledby="dashboard-title">
  <header className="desk-heading"><div><h1 id="dashboard-title">Home</h1><p className="desk-subtitle">{operational?"Scholarship operations desk":"LDSS workspace"}</p></div><button className="btn btn-outline-secondary" disabled={!metadataReady||(operational&&(metricsLoading||pendingLoading))} onClick={()=>{setData(null);setError("");setMetadataError("");setMetadataReady(false);setPending(null);setPendingError("");setOfficial(null);setOfficialError("");setPendingLoading(true);setReload(n=>n+1);}}><RefreshCw size={16}/> Refresh</button></header>
  {metadataError && <p role="alert" className="alert alert-danger">{metadataError}</p>}
  {!access ? !metadataError && <p role="status">Loading workspace...</p> : !operational ? can("configuration.manage") ? <div className="desk-admin"><AdminGuide/></div> : <p>Your account has no operational dashboard access. <a href="#access">Review my permissions</a>.</p> : <>
   <section className="desk-period" aria-label="Selected period"><div><span className="desk-overline">{selected?readableYear(selected.yearCode):"Semester overview"}</span><h2>{selected?readableSemester(selected.semesterCode):"Choose your working period"}</h2><p>{selected?label(selected.state):"Select a payout cycle"}{selected?.periodUnavailable && " / Operations unavailable"}</p></div><div className="desk-target"><span>Target payout</span><strong>{selected?.targetDate?dateLabel(selected.targetDate):selected?"Not configured":"Select a cycle"}</strong>{overdue && <span className="desk-overdue">Target date passed / cycle open</span>}</div><label>Payout cycle<select className="form-select" aria-label="Payout cycle" disabled={!metadataReady} value={cycleId} onChange={e=>choose(e.target.value)}><option value="">Choose a cycle</option>{cycles.map(c=><option key={c.id} value={c.id}>{c.name}{cycles.filter(other=>other.name===c.name).length>1?` / ${c.code}`:""} ({c.state})</option>)}</select></label></section>
   <nav className="desk-actions" aria-label="Common tasks">
    {can("scholars.read")&&<a className="btn configuration-primary" href="#scholars"><Search size={17}/> Find Scholar</a>}
    {can("requirements.receive")&&<a className="btn btn-outline-secondary" href="#scholars?task=receive"><FileInput size={17}/> Receive Documents</a>}
    {can("scholars.read")&&<a className="btn btn-outline-secondary" href="#admissions"><ClipboardCheck size={17}/> Admission Review</a>}
    {can("ovr.prepare")&&<a className="btn btn-outline-secondary" href="#payouts"><Wallet size={17}/> Prepare Payroll</a>}
   </nav>
   {!metadataReady ? <p role="status">Loading periods...</p> : !cycleId ? <p>{selectionMessage || (cycles.length?"Choose a cycle to view its records. Historical cycles remain available.":"No payout cycles are configured. Ask the Administrator to prepare the semester setup.")}</p> : error ? <p className="alert alert-danger" role="alert">{error}</p> : !current ? <p role="status">Reading current records...</p> : <div className="desk-grid">
    <div className="desk-kpis">{kpis.filter(([kind])=>card(kind)).map(([kind,key,title,note])=><a key={kind} className="desk-kpi" href={reportLink(cycleId,kind)} aria-label={`${title}: ${value(kind,key)}. Open ${card(kind)?.label} report`}><span>{title}<ArrowRight size={16}/></span><strong>{value(kind,key).toLocaleString()}</strong><small>{note}</small></a>)}</div>
    <section className="desk-panel desk-documents"><header><h2>Document workload</h2><a href={reportLink(cycleId,"missing")}>View report <ArrowRight size={15}/></a></header><div className="desk-workload">{[["Not submitted",card("missing")?value("missing","not_submitted"):null,"missing"],["Awaiting verification",card("verification")?.total??null,"verification"],["For correction",card("missing")?value("missing","for_correction"):null,"missing"],["Rejected",card("missing")?value("missing","rejected"):null,"missing"]].map(([title,n,kind])=><a key={String(title)} href={reportLink(cycleId,kind as ReportKind)}><span>{title}</span><strong>{n===null?"Unavailable":Number(n).toLocaleString()}</strong></a>)}</div>{card("missing") && value("missing","not_generated")>0 && <div className="desk-initialization"><strong>{value("missing","not_generated").toLocaleString()} Not Generated</strong><span>No resolved checklist document status.</span><details><summary>What to check</summary><p>Review checklist initialization, coverage and policy version. This count does not establish that a physical document is missing.</p></details></div>}</section>
   <aside className="desk-queue" aria-labelledby="pending-title"><h2 id="pending-title">Pending across periods</h2>{pendingError?<p role="alert">{pendingError}</p>:!pending?<p role="status">Reading pending work...</p>:pending.total===0?<p className="text-muted">No pending work for your account.</p>:<><p className="desk-queue-count">{pending.total} awaiting action <span>Oldest first</span></p><ol>{pending.items.slice(0,3).map(n=><li key={n.id}><a href={n.href}><strong>{n.title}</strong><ArrowRight size={16}/></a><span>{[n.year,n.semester,label(n.state)].filter(Boolean).join(" / ")}</span></li>)}</ol><a className="desk-all" href="#notifications?mode=pending">View all pending work <ArrowRight size={16}/></a></>}</aside>
    <section className="desk-panel desk-payroll"><header><h2>Payroll &amp; payments</h2><a href={reportLink(cycleId,"ovr")}>View report <ArrowRight size={15}/></a></header>{card("ovr") && <><p className="desk-panel-total"><strong>{card("ovr")!.total}</strong> payroll batches</p><Counts card={card("ovr")!}/></>}{card("payments") && <><h3>Payment entries</h3>{card("payments")!.total===0?<p className="desk-zero">No payment entries in this cycle.</p>:<Counts card={card("payments")!}/>}</>}<details><summary>Assessment &amp; payment scope</summary>{card("eligibility") && <Counts card={card("eligibility")!}/>}<p>Academic assessment and payroll checks are separate. Batch validation still applies. Payment entries include processing attempts, not additional entitlements.</p></details></section>
    <section className="desk-panel desk-masterlists"><header><h2>Official masterlists <small className="desk-working-year">Working year</small></h2><a href="#masterlists?scope=current">Open current lists <ArrowRight size={15}/></a></header>{officialError?<p role="alert">{officialError}</p>:!can("masterlists.prepare")?<p>Current membership is available to authorized masterlist users.</p>:!official?<p role="status">Reading current lists...</p>:official.length===0?<p>No current official lists in the working year.</p>:<ul className="desk-official">{official.map(m=><li key={m.id}><a href={`#masterlists?scope=current&draft=${m.id}`}><strong>{m.title}</strong><span>{m.count} {m.count===1?"scholar":"scholars"} / {readableYear(m.yearCode)}</span></a></li>)}</ul>}{card("masterlists") && <details><summary>{card("masterlists")!.total} historical and current versions in selected year</summary><Counts card={card("masterlists")!}/><a href={reportLink(cycleId,"masterlists")}>View version report</a></details>}</section>
    <footer className="desk-foot"><span>Updated {new Date(current.generatedAt).toLocaleString("en-PH",{timeZone:"Asia/Manila"})} (Manila)</span><details><summary>Report definitions</summary><p>Links open the corresponding cycle report, not a status-filtered list.</p>{current.cards.map(c=><p key={c.kind}><strong>{c.label} ({units[c.kind]}): </strong>{c.scope}</p>)}</details></footer>
   </div>}
  </>}
 </section>;
}
