import {useCallback,useEffect,useRef,useState} from 'react';
import {ApiError,type Session} from './auth-api';
import {configurationRequest as request} from './configuration-api';
import {pendingPrior,usePriorCommand} from './prior-command';
import ErrorNotice from './ErrorNotice';
import type {DocumentDetail,DocumentFields,DocumentKind} from '../server/payments/document-model';
type History={items:{kind:DocumentKind;recordedAt:string;actor:string;fields:DocumentFields}[];total:number};
export default function IndividualDocuments({session,transactionId,onBack,onLockChange}:{session:Session;transactionId:string;onBack:()=>void;onLockChange:(locked:boolean)=>void}){
 const base=`individual-payments/transactions/${transactionId}/documents`,storage=`ldss-document-command:${session.user.id}`;
 const command=usePriorCommand(session,base+'/generate'),[detail,setDetail]=useState<DocumentDetail|null>(null),[fields,setFields]=useState<DocumentFields>({payee:'',office:'',address:'',additionalExplanation:''}),[error,setError]=useState<unknown>(''),[notice,setNotice]=useState(''),[downloading,setDownloading]=useState<DocumentKind|null>(null),[historyOpen,setHistoryOpen]=useState(false),[history,setHistory]=useState<History|null>(null),[offset,setOffset]=useState(0),[refresh,setRefresh]=useState(0);
 const controller=useRef<AbortController|null>(null),downloadController=useRef<AbortController|null>(null),urls=useRef(new Set<string>()),locked=command.locked||downloading!==null;
 useEffect(()=>onLockChange(locked),[locked,onLockChange]);
 useEffect(()=>{const ownedUrls=urls.current;return()=>{controller.current?.abort();downloadController.current?.abort();for(const url of ownedUrls)URL.revokeObjectURL(url);};},[]);
 const load=useCallback(async()=>{controller.current?.abort();const c=new AbortController();controller.current=c;try{const d=await request<DocumentDetail>(base,{signal:c.signal});if(!c.signal.aborted){setDetail(d);setFields(d.fields);setRefresh(n=>n+1);}}catch(e){if(!c.signal.aborted)setError(e);}},[base]);
 useEffect(()=>{const c=new AbortController();controller.current=c;request<DocumentDetail>(base,{signal:c.signal}).then(d=>{if(!c.signal.aborted){setDetail(d);setFields(d.fields);}}).catch(e=>{if(!c.signal.aborted)setError(e);});return()=>c.abort();},[base]);
 useEffect(()=>{if(!historyOpen)return;const c=new AbortController();request<History>(`${base}/history?limit=25&offset=${offset}`,{signal:c.signal}).then(v=>{if(!c.signal.aborted)setHistory(v);}).catch(e=>{if(!c.signal.aborted)setError(e);});return()=>c.abort();},[base,historyOpen,offset,refresh]);
 async function generate(retry=false){
  if(!detail&&!retry)return;setError('');setNotice('');
  const body=detail?{transactionId,sourceKind:detail.sourceKind,sourceHash:detail.sourceHash,expectedRevision:detail.revision,templateVersion:detail.templates[0].version,fields}:{};
  const promise=command.run(body,'individual-payments',retry),saved=pendingPrior(session.user.id);
  if(saved)try{sessionStorage.setItem(storage,JSON.stringify(saved));}catch{setError('Keep this tab open until the saved document request is confirmed.');}
  const result=await promise;
  if(!pendingPrior(session.user.id))try{sessionStorage.removeItem(storage);}catch{/* Resolved in memory. */}
  if(result){setNotice('Draft documents are ready. Download Word below. No payment was recorded.');await load();}
 }
 async function download(kind:DocumentKind){
  if(locked)return;setDownloading(kind);setError('');setNotice('');
  const c=new AbortController();downloadController.current=c;const timeout=setTimeout(()=>c.abort(),300000);
  try{
   const response=await fetch(`/api/v1/${base}/${kind}/word`,{credentials:'same-origin',cache:'no-store',signal:c.signal});
   if(!response.ok){const body=await response.json().catch(()=>null);throw new ApiError(response.status,body?.error?.code??'DOCUMENT_DOWNLOAD_FAILED',body?.error?.message??'Could not download this draft. Review the transaction and try again.');}
   const blob=await response.blob(),url=URL.createObjectURL(blob);urls.current.add(url);const link=document.createElement('a');link.href=url;link.download=`DRAFT-${kind}-${transactionId}.docx`;document.body.append(link);link.click();link.remove();setTimeout(()=>{URL.revokeObjectURL(url);urls.current.delete(url);},20000);
   setNotice('Draft Word document downloaded. External edits do not change LDSS records.');await load();
  }catch(e){if(!c.signal.aborted)setError(e);}finally{clearTimeout(timeout);downloadController.current=null;setDownloading(null);}
 }
 const ready=Boolean(detail?.documents.length),blocked=Boolean(detail?.blockers.length),stale=Boolean(detail?.documents.some(d=>!d.current));
 return <section aria-labelledby="individual-document-title"><header className="d-flex justify-content-between align-items-start gap-3"><div><h1 id="individual-document-title">Prepare Documents</h1><p>Individual scholarship stipend</p></div><button className="btn btn-outline-secondary" disabled={locked} onClick={onBack}>Back to Individual Payments</button></header>
 <ErrorNotice error={error instanceof ApiError?error:error instanceof Error?error.message:typeof error==='string'?error:''}/><ErrorNotice error={command.error}/>{notice&&<p className="alert alert-success" role="status">{notice}</p>}
 {command.uncertain&&<div className="alert alert-warning" role="alert"><p>The response was not confirmed. Retry the saved document request before another action.</p><button className="btn configuration-primary" disabled={command.saving} onClick={()=>void generate(true)}>Retry saved request</button></div>}
 <p className="alert alert-warning"><strong>Draft — Pending Office Approval.</strong> These prototypes are for Scholarship Office review. They are not approved payment forms.</p><button className="btn btn-outline-secondary mb-3" disabled={locked} onClick={()=>{setError('');void load();}}>Refresh document details</button>
 {!detail&&!error&&<p role="status">Loading document details…</p>}
 {detail&&<><section className="border rounded p-3 my-3" aria-label="Reviewed payment details"><h2>{detail.humanId} — {detail.name}</h2><p>{detail.semester} · {detail.academicYear}<br/>PHP {detail.amount} · Original payroll: {detail.sourceBatch}</p><p><strong>{blocked?'Blocked / Needs Review':stale?'Needs Regeneration':ready?'Document Ready':'Transaction Prepared'}</strong> · {detail.sourceKind==='omitted'?'OR + DV':'DV only'}</p><p>LDSS internal reference: {detail.reference}</p>{detail.blockers.map(b=><p className="alert alert-warning" key={b}>{b}</p>)}</section>
 <form onSubmit={e=>{e.preventDefault();void generate();}}><fieldset disabled={locked||blocked}><label className="d-block mb-2">Payee <span className="text-muted">(optional for this draft)</span><input className="form-control" value={fields.payee} onChange={e=>setFields(v=>({...v,payee:e.target.value}))} maxLength={180} aria-describedby="draft-payee-help"/></label><p id="draft-payee-help" className="form-text">Leave blank until the office confirms the payee. The scholar’s identity is included automatically in the explanation.</p>
 <details className="my-3"><summary>Additional Details</summary><label className="d-block my-2">Office<input className="form-control" value={fields.office} maxLength={180} onChange={e=>setFields(v=>({...v,office:e.target.value}))}/></label><label className="d-block my-2">Payee address<textarea className="form-control" value={fields.address} maxLength={300} onChange={e=>setFields(v=>({...v,address:e.target.value}))}/></label><label className="d-block my-2">Additional explanation<textarea className="form-control" value={fields.additionalExplanation} maxLength={1200} rows={4} onChange={e=>setFields(v=>({...v,additionalExplanation:e.target.value}))}/></label><p className="form-text">The approved amount, scholar identity and financial authorization stay in their controlled workflows. Unknown official numbers, accounting codes and signature fields remain blank.</p></details>
 <button className="btn configuration-primary" disabled={!detail.sourceHash} type="submit">{command.saving?'Preparing documents…':ready?'Regenerate Documents':detail.sourceKind==='omitted'?'Prepare OR + DV Documents':'Prepare DV Document'}</button></fieldset></form>
 {ready&&<section className="my-4" aria-labelledby="word-download-title"><h2 id="word-download-title">Download Word <small className="text-muted">Draft</small></h2><p>Only the current draft for each form is downloadable. Regeneration preserves previous generation history.</p><div className="d-flex flex-wrap gap-3">{detail.documents.map(d=><div key={d.kind}><button className="btn btn-outline-secondary" disabled={locked||blocked||!d.current} onClick={()=>void download(d.kind)}>{downloading===d.kind?'Downloading…':`Download ${d.kind} Word — Draft`}</button><p className="form-text">{!d.current&&<>Needs regeneration from the current reviewed source.<br/></>}Prepared {new Date(d.recordedAt).toLocaleString()} by {d.actor}{d.lastDownloadedAt&&<><br/>Last downloaded {new Date(d.lastDownloadedAt).toLocaleString()}</>}</p></div>)}</div></section>}
 <details className="my-4" open={historyOpen} onToggle={e=>setHistoryOpen(e.currentTarget.open)}><summary>Document generation history</summary>{history?.items.map((v,index)=><article className="border-bottom py-2" key={`${offset}-${index}`}><strong>Draft {v.kind} generated</strong><p>{new Date(v.recordedAt).toLocaleString()} · {v.actor}</p></article>)}{history&&<nav className="d-flex gap-3" aria-label="Document history pages"><button className="btn btn-outline-secondary" disabled={locked||!offset} onClick={()=>setOffset(n=>Math.max(0,n-25))}>Previous history</button><span>{history.total} entries</span><button className="btn btn-outline-secondary" disabled={locked||offset+25>=history.total} onClick={()=>setOffset(n=>n+25)}>Next history</button></nav>}</details>
 </>}
 </section>;
}
