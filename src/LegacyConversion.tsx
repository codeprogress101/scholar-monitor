import { useRef,useState,type FormEvent } from "react";
import type { Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { legacyConversionReview } from "../server/ovr/legacy-conversion";
type Review=Awaited<ReturnType<typeof legacyConversionReview>>;
export default function LegacyConversion({id,session,onSaved}:{id:string;session:Session;onSaved:()=>void}){
  const [view,setView]=useState<Review|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const pending=useRef<{signature:string;key:string}|null>(null),saving=useRef(false);
  async function load(){setBusy(true);try{setView(await request<Review>(`ovr-batches/${id}/conversion`));setMessage("");}catch(e){setMessage(e instanceof Error ? e.message : "Could not load conversion review.");}finally{setBusy(false);}}
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!view || saving.current)return;const f=new FormData(e.currentTarget);
    const body={sourceHash:view.sourceHash,destinationBatchId:String(f.get("destination")),reviewed:f.get("reviewed")==="on",reason:String(f.get("reason")),dispositions:view.frozen.snapshot.entries.map(m=>({scholarshipId:m.scholarshipId,disposition:String(f.get(m.scholarshipId))}))};
    const signature=JSON.stringify(body);if(pending.current?.signature!==signature)pending.current={signature,key:crypto.randomUUID()};
    saving.current=true;setBusy(true);try{await request(`ovr-batches/${id}/conversion`,{body,key:pending.current.key,csrf:session.csrfToken});pending.current=null;setView(null);setMessage("Reviewed conversion recorded. Original evidence is preserved. Reprocessing still requires current compliance and numbered-payroll approval.");onSaved();}catch(e){setMessage(e instanceof Error ? e.message : "Result unknown. Retry the same conversion.");}finally{saving.current=false;setBusy(false);}
  }
  return <details className="border rounded p-3"><summary>Coordinator: reviewed legacy conversion</summary><p>Legacy operational commands are read-only. Conversion preserves historical payments and records an explicit disposition for every frozen member.</p><button type="button" disabled={busy} onClick={()=>void load()}>Load current conversion review</button>
    {view?.converted ? <p>Conversion already recorded. Historical source remains read-only.</p> : view && <form onSubmit={submit}><fieldset disabled={busy}>
      <label className="d-block">Numbered destination in the same semester<select name="destination" required defaultValue=""><option value="">Select destination</option>{view.destinations.map(d=><option key={d.id} value={d.id}>{d.code}</option>)}</select></label>
      {view.frozen.snapshot.entries.map(m=>{const paid=view.payments.find(p=>p.scholarshipId===m.scholarshipId);return <label className="d-block my-2" key={m.scholarshipId}>{m.evidence.current.sources.scholarship.humanId} — {m.evidence.current.sources.scholarship.name}<select name={m.scholarshipId} required defaultValue=""><option value="">Choose disposition</option>{paid?.outcome === "paid" ? <option value="preserve_paid">Preserve Paid — no new entitlement</option> : <><option value="retain_unpaid">Retain unpaid / unresolved historical outcome</option>{paid?.unpaidReason === "did_not_claim" && <option value="reprocess_unclaimed">Reprocess explicit unclaimed outcome</option>}</>}</select></label>;})}
      <label className="d-block">Reconciliation reference and reason<textarea name="reason" required minLength={5} maxLength={500}/></label><label className="d-block"><input type="checkbox" name="reviewed" required/> I reconciled payments, allocations and every unpaid disposition against the historical source.</label><button className="btn btn-primary">Record reviewed conversion</button>
    </fieldset></form>}{message && <p role="status">{message}</p>}
  </details>;
}
