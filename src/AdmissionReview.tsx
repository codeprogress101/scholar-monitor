import { useEffect, useRef, useState } from "react";
import type { Session } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { ConfigRecord } from "../server/configuration/model";
import { ADMISSION_LABELS, type AdmissionReviewPage, type AdmissionStage } from "../server/qualification/model";
import { academicYears, newRecordYear } from "./academic-year-options";
import { configurationRequest as request } from "./configuration-api";
import { scholarAddress } from "./scholar-navigation";
import { receivingToday } from "./receiving-selection";
import { runBulkJobs, type BulkJob } from "./bulk-commands";
import BulkReview from "./BulkReview";
import { admissionAddress, admissionRoute } from "./admission-navigation";

const stages = {
  for_validation: { action: "validate", label: "Validate scholars", owner: "Staff or Coordinator" },
  qualified: { action: "select", label: "Select scholars", owner: "Coordinator" },
} as const;
export default function AdmissionReview({ session }: { session: Session }) {
  const [route] = useState(() => admissionRoute(window.location.hash));
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<Access | null>(null), [years, setYears] = useState<ConfigRecord[]>([]);
  const [year, setYear] = useState(""), [stage, setStage] = useState<AdmissionStage>(!route.stage || ["applicant", "exam_passed"].includes(route.stage) ? "for_validation" : route.stage);
  const [query, setQuery] = useState(route.search), [search, setSearch] = useState(route.search), [offset, setOffset] = useState(route.offset), [revision, setRevision] = useState(0);
  const [data, setData] = useState<AdmissionReviewPage | null>(null), [selected, setSelected] = useState<string[]>([]);
  const [jobs, setJobs] = useState<BulkJob[]>([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const [date, setDate] = useState(receivingToday), [reference, setReference] = useState("");
  const busy = useRef(false);
  const canRead = access?.permissions.some(p => p.code === "scholars.read");
  const step = stage in stages ? stages[stage as keyof typeof stages] : null;
  const canAct = access?.permissions.some(p => p.code === (stage === "for_validation" ? "scholarship.status.request" : "scholarship.status.approve"));
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const a = await request<Access>("me/permissions", { signal: controller.signal });
      setAccess(a);
      if (!a.permissions.some(p => p.code === "scholars.read")) { setLoading(false); return; }
      const options = await academicYears(controller.signal);
      if (controller.signal.aborted) return;
      setYears(options);
      const chosenYear = route.year ? (options.some(y => y.id === route.year) ? route.year : "") : newRecordYear(options, [], "", "");
      setYear(chosenYear);
      if (route.year && !chosenYear) setError("The saved academic year is unavailable. Choose a year to continue.");
      setLoading(Boolean(chosenYear)); setReady(true);
    })().catch(e => { if (!controller.signal.aborted) { setError(e.message); setLoading(false); } });
    return () => controller.abort();
  }, [route]);
  useEffect(() => {
    if (ready) window.history.replaceState(null, "", admissionAddress(year, stage, query, offset));
  }, [ready, year, stage, query, offset]);
  useEffect(() => {
    if (!canRead || !year || !ready) return;
    const controller = new AbortController();
    request<AdmissionReviewPage>(`scholarships/review?academicYearId=${year}&status=${stage}&q=${encodeURIComponent(query)}&offset=${offset}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); }).catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [canRead, year, stage, query, offset, revision, ready]);
  function reset() { setSelected([]); setData(null); setError(""); setLoading(true); }
  function review() {
    if (!step || !canAct || !data || busy.current) return;
    setJobs(data.items.filter(row => selected.includes(row.id) && !row.periodUnavailable).map(row => ({
      id: row.id, label: `${row.name} (${row.humanId})`, key: crypto.randomUUID(),
      path: `scholarships/${row.id}/qualification/${step.action}`,
      body: { expectedVersion: row.version, effectiveOn: date, reason: "", reference: reference.trim(), ...(step.action === "validate" ? { priorQualificationConfirmed: true } : {}) },
    })));
  }
  async function run() {
    if (busy.current) return;
    busy.current = true; setSaving(true);
    try { await runBulkJobs(jobs, job => request(job.path, { body: job.body, key: job.key, csrf: session.csrfToken }), setJobs); }
    finally { busy.current = false; setSaving(false); }
  }
  const available = data?.items.filter(row => !row.periodUnavailable) ?? [];
  const finished = jobs.length > 0 && jobs.every(job => job.saved);
  const nextStage: AdmissionStage | null = stage === "for_validation" ? "qualified" : null;
  function continueReview() {
    if (!nextStage || saving) return;
    setJobs([]); reset(); setOffset(0); setStage(nextStage); setRevision(r => r + 1);
  }
  return <section className="scholars-page">
    <div className="section-heading"><h1>Admission review</h1><button className="btn btn-outline-secondary" disabled={!canRead || !year || loading || saving || jobs.length > 0} onClick={() => { reset(); setRevision(r=>r+1); }}>Refresh</button></div>
    <p>Validate already-qualified scholars, then submit them for Coordinator selection.</p>
    <p className="next-step">Examination and qualification are completed before names are entered here. Staff validates the records; the Coordinator selects scholars. <a href="#masterlists">Masterlist approval</a> follows separately.</p>
    {error && <p role="alert" className="alert alert-danger">{error}</p>}
    {access && !canRead && <p>This workspace requires scholarship operations access.</p>}
    {canRead && <>
      <fieldset disabled={saving || jobs.length > 0}>
        <div className="row g-3 mb-3">
          <label className="col-md-5">Academic year<select className="form-select" value={year} onChange={e => { reset(); setLoading(Boolean(e.target.value)); setYear(e.target.value); setOffset(0); }}><option value="">Choose academic year</option>{years.map(y => <option key={y.id} value={y.id}>{y.code}{y.locked || y.archived ? " (read only)" : ""}</option>)}</select></label>
          <label className="col-md-5">Admission stage<select className="form-select" value={stage} disabled={!year} onChange={e => { reset(); setStage(e.target.value as AdmissionStage); setOffset(0); }}>{(["for_validation", "qualified", "selected", "not_selected"] as const).map(value => <option key={value} value={value}>{ADMISSION_LABELS[value]}</option>)}</select></label>
        </div>
        <form className="d-flex gap-2 mb-3" onSubmit={e => { e.preventDefault(); reset(); setQuery(search); setOffset(0); setRevision(r => r+1); }}><input className="form-control" aria-label="Find applicant" value={search} maxLength={100} onChange={e => setSearch(e.target.value)} /><button className="btn btn-outline-secondary" disabled={!year}>Search</button></form>
      </fieldset>
      {loading && <p role="status">Loading admission records…</p>}
      {!year && !loading && <p>Choose the year for the admission decisions.</p>}
      {data && !loading && !jobs.length && <>
        {step && <p className="alert alert-info"><strong>Next: {step.label} · {step.owner}</strong>{!canAct && " — Ask a Coordinator to open this queue using their own account."}</p>}
        <div className="table-responsive"><table className="table"><thead><tr><th>{step && canAct && <input type="checkbox" aria-label="Select all available applicants on this page" checked={available.length > 0 && selected.length === available.length} disabled={!available.length} onChange={e => setSelected(e.target.checked ? available.map(r => r.id) : [])} />}</th><th>Scholar</th><th>Stage</th><th>Review</th></tr></thead><tbody>{data.items.map(row => <tr key={row.id}><td>{step && canAct && <input type="checkbox" aria-label={`Select ${row.name}`} disabled={row.periodUnavailable} checked={selected.includes(row.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev,row.id] : prev.filter(id => id !== row.id))} />}</td><td>{row.name}<small className="d-block">{row.humanId}</small></td><td>{ADMISSION_LABELS[row.status]}{row.periodUnavailable && " · Year locked/archived"}</td><td><a href={scholarAddress(row.scholarId, "scholarship", year)}>Review record</a></td></tr>)}</tbody></table></div>
        {!data.items.length && <p>{offset ? "No records remain on this page. Use Previous or search again." : query ? "No matching applicants at this stage. Clear the search or choose another stage." : "No applicants at this stage. Newly registered people need an annual scholarship record in their profile."}</p>}
        <p>{data.total} records · Selection applies to this page only (up to 25).</p>
        <div className="d-flex gap-2"><button className="btn btn-outline-secondary" disabled={!offset} onClick={() => { reset(); setOffset(Math.max(0,offset-25)); }}>Previous</button><button className="btn btn-outline-secondary" disabled={offset+25>=data.total} onClick={() => { reset(); setOffset(offset+25); }}>Next</button></div>
        {step && canAct && selected.length > 0 && <form className="border rounded p-3 mt-3" onSubmit={e => { e.preventDefault(); review(); }}>
          <p><strong>{step.label}: {selected.length} selected</strong>.</p>
          {step.action === "validate" && <label className="d-block mb-3"><input type="checkbox" required /> All selected scholars already passed the LGU qualifying examination and completed qualification outside this system.</label>}
          <label className="form-label">Effective date<input className="form-control" type="date" required max={receivingToday()} value={date} onChange={e => setDate(e.target.value)} /></label>
          <details className="mb-3"><summary>Shared decision reference (optional)</summary><input className="form-control" aria-label="Shared decision reference" minLength={3} maxLength={300} value={reference} onChange={e => setReference(e.target.value)} /></details>
          <button className="btn configuration-primary">Review selected applicants</button>
        </form>}
      </>}
      {jobs.length > 0 && <BulkReview jobs={jobs} busy={saving} title={step?.label ?? "Review decisions"} context={`${years.find(y => y.id === year)?.code ?? ""} · Effective ${date}${reference.trim() ? ` · Reference: ${reference.trim()}` : ""}`} onRun={() => void run()} onClose={() => { setJobs([]); reset(); setRevision(r=>r+1); }} />}
      {finished && <div className="alert alert-success"><strong>All selected records saved.</strong>{nextStage ? <><p>Next: Coordinator selection.</p><button className="btn configuration-primary" onClick={continueReview}>Open selection queue</button></> : <p>Selected scholars can now be reviewed for masterlist entry. <a href="#masterlists">Open Masterlists</a></p>}</div>}
    </>}
  </section>;
}
