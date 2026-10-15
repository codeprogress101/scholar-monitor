import QuickDocumentReview from "./QuickDocumentReview";
import { useEffect, useState } from "react";
import type { Session } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { RequirementChecklist } from "../server/requirements/instances-model";
import { configurationRequest as request } from "./configuration-api";
import RequirementWorkflow from "./RequirementWorkflow";
export default function NotificationDocument({ scholarId, instanceId, session, access }: { scholarId: string; instanceId: string; session: Session; access: Access }) {
  const [checklist,setChecklist] = useState<RequirementChecklist | null>(null), [error,setError] = useState(""), [revision,setRevision] = useState(0), [busy,setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const annuals = await request<{ items: { id: string; academicYearId: string }[] }>(`scholars/${scholarId}/scholarships`,{signal:controller.signal});
      const year = new URLSearchParams(window.location.hash.split("?")[1]).get("academicYear");
      const results = await Promise.all(annuals.items.filter(a => !year || a.academicYearId === year).map(a => request<{items:RequirementChecklist[]}>(`scholarships/${a.id}/requirements`,{signal:controller.signal})));
      let found = results.flatMap(r => r.items).find(c => c.items.some(i => i.id===instanceId));
      if (!found) found = (await request<{items:RequirementChecklist[]}>(`scholars/${scholarId}/semester-requirements`,{signal:controller.signal})).items.find(c => c.items.some(i => i.id===instanceId));
      if (!found) throw new Error("Document unavailable. Return to notifications and refresh.");
      if (!controller.signal.aborted) { setChecklist(found); setError(""); }
    }
    void load().catch(e => { if(!controller.signal.aborted) setError(e instanceof Error ? e.message : "Document unavailable."); });
    return () => controller.abort();
  },[scholarId,instanceId,revision]);
  const instance=checklist?.items.find(i => i.id===instanceId);
  return <section aria-label="Document from notification"><h3>Document review</h3>{error && <p role="alert" className="alert alert-warning">{error}</p>}{!instance && !error && <p>Loading saved document...</p>}{instance && checklist && <><h4>{instance.name}</h4><p>{checklist.yearCode} / {checklist.semesterName} / {instance.status.replaceAll("_"," ")}</p><QuickDocumentReview key={`${instance.id}-${instance.version}`} instance={instance} session={session} canVerify={access.permissions.some(p=>p.code==="requirements.verify")} canReceive={access.permissions.some(p=>p.code==="requirements.receive")} disabled={busy || !!error} closed={checklist.periodUnavailable} onBusy={setBusy} onChanged={()=>setRevision(v=>v+1)} /><details><summary>Corrections and history</summary><RequirementWorkflow instance={instance} session={session} canVerify={access.permissions.some(p=>p.code==="requirements.verify")} canReceive={access.permissions.some(p=>p.code==="requirements.receive")} disabled={busy || !!error} closed={checklist.periodUnavailable} onBusy={setBusy} onChanged={()=>setRevision(v=>v+1)} /></details></>}<a className="btn btn-outline-secondary mt-3" href={`#scholars?scholar=${scholarId}&section=requirements`}>Return to receiving</a></section>;
}
