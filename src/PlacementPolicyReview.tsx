import { useRef,useState,type FormEvent } from "react";
import type { Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { ConfigRecord } from "../server/configuration/model";
import type { AcademicChangeView } from "../server/academic/changes-model";

export default function PlacementPolicyReview({id,view,schools,courses,session}:{id:string;view:AcademicChangeView;schools:ConfigRecord[];courses:ConfigRecord[];session:Session}){
  const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const pending=useRef<{signature:string;key:string}|null>(null),saving=useRef(false);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(saving.current)return;const f=new FormData(e.currentTarget);
    const body={expectedVersion:view.version,schoolId:String(f.get("schoolName") ?? "").trim() ? "" : String(f.get("school")),courseId:String(f.get("courseName") ?? "").trim() ? "" : String(f.get("course")),schoolName:String(f.get("schoolName") ?? "").trim() || undefined,courseName:String(f.get("courseName") ?? "").trim() || undefined,yearLevel:view.current.yearLevel,effectiveOn:String(f.get("effectiveOn")),priorShiftCount:f.get("shifts")==="" ? null : Number(f.get("shifts")),secondYearBoundaryOn:String(f.get("boundary")) || null,permissionGrantedOn:String(f.get("permissionDate")),permissionReference:String(f.get("permissionRef")),historyReference:String(f.get("historyRef")),sourceCategory:String(f.get("sourceCategory")),destinationCategory:String(f.get("targetCategory")),reviewed:f.get("reviewed")==="on"};
    const signature=JSON.stringify(body);if(pending.current?.signature!==signature)pending.current={signature,key:crypto.randomUUID()};
    saving.current=true;setBusy(true);setMessage("");
    try{await request(`academic-records/${id}/policy-reviews`,{body,key:pending.current.key,csrf:session.csrfToken});pending.current=null;setMessage("Policy evidence recorded for this exact proposal. Submit and approve the placement change through its ordinary or official amendment workflow.");}
    catch(e){setMessage(e instanceof Error ? e.message : "Could not confirm review. Retry the same details.");}finally{saving.current=false;setBusy(false);}
  }
  return <details className="border rounded p-2 my-2"><summary>Coordinator: review transfer / shift policy evidence</summary>
    <p>This review verifies policy evidence; it does not change placement or waive a restriction. Unknown history requires further review.</p>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <label className="d-block">Proposed school<select name="school" defaultValue={view.current.schoolId}>{schools.filter(s=>!s.archived || s.id===view.current.schoolId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="d-block">Proposed course<select name="course" defaultValue={view.current.courseId}>{courses.filter(c=>!c.archived || c.id===view.current.courseId).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="d-block">Or new school name (replaces selected school)<input name="schoolName" minLength={2} maxLength={160}/></label>
      <label className="d-block">Or new course name (replaces selected course)<input name="courseName" minLength={2} maxLength={160}/></label>
      <p>Current year level: {view.current.yearLevel}. Record year-level corrections separately.</p>
      <label className="d-block">Proposed effective date<input type="date" name="effectiveOn" required/></label>
      <label className="d-block">Verified lifetime prior course shifts (blank means unknown)<input type="number" name="shifts" min={0} max={100}/></label>
      <label className="d-block">Verified beginning of first semester of second year<input type="date" name="boundary"/></label>
      <label className="d-block">Prior permission granted on<input type="date" name="permissionDate" required/></label>
      <label className="d-block">Permission evidence reference<input name="permissionRef" required minLength={3} maxLength={300}/></label>
      <label className="d-block">Reviewed history / boundary evidence reference<input name="historyRef" required minLength={5} maxLength={500}/></label>
      {[["sourceCategory","Verified current category"],["targetCategory","Verified proposed category"]].map(([name,label])=><label key={name} className="d-block">{label}<select name={name} required defaultValue=""><option value="">Select verified category</option><option value="degree">Degree</option><option value="non_degree">Non-degree</option></select></label>)}
      <label className="d-block"><input type="checkbox" name="reviewed" required/> I reviewed the authoritative permission and complete history for this exact proposal.</label>
      <button className="btn btn-primary">Record policy evidence</button>
    </fieldset></form>{message && <p role="status">{message}</p>}
  </details>;
}
