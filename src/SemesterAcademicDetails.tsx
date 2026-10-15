import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SemesterAcademicView } from "../server/continuing/semester-academic";
import { configurationRequest as request } from "./configuration-api";
import { ApiError, type Session } from "./auth-api";
import ErrorNotice from "./ErrorNotice";
import SemesterCategoryCorrection from "./SemesterCategoryCorrection";

const categories = { unknown: "Not recorded", degree: "Degree", non_degree: "Non-degree / technical-vocational" };
export default function SemesterAcademicDetails({ scholarId, semesterId, session, canEdit, canCorrect, onAcademicSetup, onChanged, onReady }: {
  scholarId: string; semesterId: string; session: Session; canEdit: boolean; canCorrect: boolean;
  onAcademicSetup?: (yearId?: string) => void; onChanged: () => void;
  onReady?: (ready: boolean) => void;
}) {
  const [data, setData] = useState<SemesterAcademicView | null>(null), [error, setError] = useState<string | ApiError>("");
  const [category, setCategory] = useState<SemesterAcademicView["category"]>("unknown"), [busy, setBusy] = useState(false), [reload, setReload] = useState(0), [notice, setNotice] = useState("");
  const pending = useRef<{ signature: string; key: string } | null>(null), saving = useRef(false);
  const path = `scholars/${scholarId}/semester-requirements/${semesterId}/academic-context`;
  useEffect(() => {
    const c = new AbortController();
    request<SemesterAcademicView>(path, { signal: c.signal }).then((v) => { if (!c.signal.aborted) { setData(v); setCategory(v.category); setError(""); } })
      .catch((e: unknown) => { if (!c.signal.aborted) { setData(null); setError(e instanceof ApiError ? e : "Could not load semester academic details."); } });
    return () => c.abort();
  }, [path, reload]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving.current || !data?.current || data.blocker) return;
    saving.current = true; setBusy(true); setError(""); setNotice("");
    const body = { expectedRevision: data.revision, academicRecordId: data.current.id, expectedAcademicVersion: data.current.version, category };
    const signature = JSON.stringify(body);
    if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await request<{ changed: boolean }>(path, { body, csrf: session.csrfToken, key: pending.current.key });
      pending.current = null; setNotice(result.changed ? "Semester academic details saved. Earlier revisions are preserved." : "These details are already recorded.");
      setReload((n) => n + 1); onChanged();
    } catch (e) { setError(e instanceof ApiError ? e : "Could not confirm saving. Retry safely or reload."); }
    finally { saving.current = false; setBusy(false); }
  }
  const academicSaved = Boolean(data?.current && data.saved.version === data.current.version && data.category !== "unknown");
  useEffect(() => { onReady?.(academicSaved); }, [academicSaved, onReady]);
  return <details className="border rounded p-3 my-3" open={!academicSaved}>
    <summary>Semester academic details{data ? ` · ${categories[data.category]}` : ""}</summary>
    <ErrorNotice error={error} />
    {notice && <p role="status">{notice}</p>}
    <button type="button" className="btn btn-outline-secondary my-2" disabled={busy} onClick={() => { setData(null); setReload((n) => n + 1); }}>Reload semester details</button>
    {data && <>
      {!academicSaved && data.blocker && <p className="alert alert-info">{data.blocker}</p>}
      {data.saved.categorySource && <p>Program category carried forward from the preceding semester for the same course.</p>}
      {!data.current && onAcademicSetup && <button className="btn btn-outline-secondary" onClick={() => onAcademicSetup(data.academicYearId)}>Add academic record</button>}
      {data.current && (academicSaved || !canEdit ? <p><strong>{data.current.placement.yearLevel}</strong> / {data.current.placement.school.name} / {data.current.placement.course.name}. Category: {categories[data.category]}.{academicSaved && " Already recorded for this semester."}</p> : <form onSubmit={save} aria-label="Semester academic details">
        <p>From the academic record: <strong>{data.current.placement.yearLevel}</strong> · {data.current.placement.school.name} · {data.current.placement.course.name}</p>
        <p>School, course and year level are reused here. Changes use the Academic records workflow.</p>
        <fieldset disabled={busy || !canEdit || Boolean(data.blocker)}>
          <label className="form-label d-block">Program category<select className="form-select" value={category} disabled={data.category !== "unknown"} onChange={(e) => setCategory(e.target.value as SemesterAcademicView["category"])}>
            {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <button className="btn configuration-primary" disabled={category === "unknown"}>{busy ? "Saving..." : "Save semester details"}</button>
        </fieldset>
      </form>)}
      <p className="mt-2">Recording these details does not verify enrollment, grades or payout eligibility.</p>
      {data.category !== "unknown" && (canCorrect ? <SemesterCategoryCorrection key={data.revision} data={data} path={path} session={session} onBusy={setBusy} onSaved={() => { setNotice("Category corrected. The original record remains in history."); setReload((n) => n + 1); onChanged(); }} /> : <p>For a category recording error, ask the Coordinator to open this semester's academic details.</p>)}
      <details><summary>Academic context history ({data.history.length})</summary>{data.history.map((r) => <div key={r.revision}><p>Revision {r.revision}: {r.snapshot.placement ? `${r.snapshot.placement.yearLevel} · ${r.snapshot.placement.school.name} · ${r.snapshot.placement.course.name}` : "Placement not recorded"} · {categories[r.category]} · {r.actorName} · {r.recordedAt}</p>{r.snapshot.categoryCorrection && <p>Correction from {categories[r.snapshot.categoryCorrection.previousCategory]}: {r.snapshot.categoryCorrection.reason}. Evidence: {r.snapshot.categoryCorrection.reference}.</p>}</div>)}</details>
    </>}
  </details>;
}
