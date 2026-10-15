import { useCallback, useEffect, useState } from "react";
import type { Access } from "../server/authorization/policy";
import type { ScholarshipRecord } from "../server/qualification/model";
import { ADMISSION_LABELS } from "../server/qualification/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import ReceivingRequirements from "./ReceivingRequirements";
import type { ConfigList, ConfigRecord } from "../server/configuration/model";
import type { ReceivingPeriod } from "../server/requirements/instances-model";
import { receivingToday, selectedReceivingContext, type ReceivingContext } from "./receiving-selection";
import { receivingYears, receivingAdmission, type ReceivingAvailability } from "./receiving-workspace";

async function allYears(signal: AbortSignal) {
  const items: ConfigRecord[] = [];
  for (let offset = 0; ;) {
    const page = await request<ConfigList>(`configuration/academic-years?includeArchived=true&limit=100&offset=${offset}`, { signal });
    items.push(...page.items); offset += page.items.length;
    if (offset >= page.total || !page.items.length) return items;
  }
}
export default function ScholarRequirements({ scholarId, scholarLabel, registrationYearId, session, access, onSetup, onAcademicSetup, savedContext, onContextChange }: {
  scholarId: string; scholarLabel: string; registrationYearId: string; session: Session; access: Access;
  onSetup: () => void; onAcademicSetup?: (yearId: string) => void;
  savedContext?: ReceivingContext;
  onContextChange?: (scholarId: string, context: ReceivingContext) => void;
}) {
  const [data, setData] = useState<{ records: ScholarshipRecord[]; years: ConfigRecord[]; availability: ReceivingAvailability } | null>(null);
  const [error, setError] = useState(""), [reload, setReload] = useState(0);
  const [history, setHistory] = useState<boolean | null>(null), [historyYear, setHistoryYear] = useState("");
  const rememberPeriod = useCallback((ownerId: string, period: ReceivingPeriod, explicit = false) => onContextChange?.(scholarId, selectedReceivingContext(ownerId, scholarId, period, savedContext, explicit)), [onContextChange, scholarId, savedContext]);
  useEffect(() => {
    let active = true;
    const c = new AbortController(), timeout = window.setTimeout(() => c.abort(), 15000);
    Promise.all([
      request<{ items: ScholarshipRecord[] }>(`scholars/${scholarId}/scholarships`, { signal: c.signal }),
      allYears(c.signal),
      request<ReceivingAvailability>(`scholars/${scholarId}/semester-receiving-availability`, { signal: c.signal }),
    ]).then(([r, years, availability]) => { if (active && !c.signal.aborted) { setData({ records: r.items, years, availability }); setError(""); } })
      .catch(e => { if (active) setError(e instanceof ApiError ? e.message : "Could not load receiving. Refresh to retry."); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; c.abort(); window.clearTimeout(timeout); };
  }, [scholarId, reload]);
  const { current, previous } = receivingYears(data?.years ?? [], registrationYearId, receivingToday());
  const requestedYear = savedContext?.academicYearId ?? data?.records.find(r => r.id === savedContext?.annualId)?.academicYearId;
  const showingHistory = history ?? Boolean(requestedYear && previous.some(y => y.id === requestedYear));
  const invalidYear = history === null && requestedYear && requestedYear !== current?.id && !previous.some(y => y.id === requestedYear);
  const year = showingHistory ? previous.find(y => y.id === (historyYear || requestedYear)) ?? previous[0] : current;
  const context = savedContext;
  const annual = data?.records.find(r => r.academicYearId === year?.id);
  const semester = Boolean(year && data?.availability.supported);
  const published = data?.availability.memberships.find(m => m.academicYearId === year?.id)?.published ?? false;
  const admission = receivingAdmission(annual, published);
  const ownerId = semester ? scholarId : annual?.id;
  return <section aria-label="Receive scholar requirements">
    <p className="visually-hidden">Scholar: {scholarLabel}</p>
    <div className="list-toolbar">
      <button className="btn btn-outline-secondary" onClick={() => { const next = showingHistory ? current : previous[0]; setHistory(!showingHistory); if (next) { setHistoryYear(next.id); onContextChange?.(scholarId, {academicYearId: next.id}); } }}>{showingHistory ? "Back to current semester" : "Earlier academic years"}</button>
    </div>
    {error ? <p role="alert" className="alert alert-danger">{error} <button onClick={()=>{setData(null);setError("");setReload(n=>n+1);}}>Retry</button></p> : !data ? <p role="status">Loading requirements…</p> : invalidYear ? <p role="alert">The requested academic year is unavailable for receiving. Use Back to current semester to choose the working year.<button className="btn btn-outline-secondary" onClick={() => { setHistory(false); if (current) onContextChange?.(scholarId, {academicYearId: current.id}); }}>Back to current semester</button></p> : showingHistory ? <>
      {!previous.length ? <p>No earlier academic years are recorded.</p> : <>
        <label className="form-label d-block">Earlier academic year<select className="form-select" value={year?.id ?? ""} onChange={e => { setHistoryYear(e.target.value); onContextChange?.(scholarId, {academicYearId: e.target.value}); }}>{previous.map(y => <option key={y.id} value={y.id}>{y.code}</option>)}</select></label>
        <p>Saved documents from previous academic years. This view does not receive or change documents.</p>
        {annual && <ReceivingRequirements key={`history-annual-${annual.id}`} id={annual.id} session={session} access={access} readOnly academicYearId={year?.id} />}
        {data.availability.supported && <ReceivingRequirements key={`history-semester-${year?.id}`} id={scholarId} continuing session={session} access={access} readOnly academicYearId={year?.id} />}
        {!annual && !data.availability.supported && <p>No saved requirements for this academic year.</p>}
      </>}
    </> : data.availability.graduation?.archived || (data.availability.graduation && !data.availability.graduation.semesterId) ? <p className="alert alert-info">This scholar has graduated. Document receiving is closed. Use Earlier academic years to view saved documents.</p> : !current ? <p className="alert alert-info">No working academic year is configured. Ask the System Administrator to check the academic calendar.</p> : <>
      {admission && <p role="status" className="small">{admission}{!published && <> Receiving documents does not require repeating selection. <a href="#masterlists">View masterlists</a></>}</p>}
      {!admission && annual && <p>Admission: {ADMISSION_LABELS[annual.status]}. <button className="btn btn-outline-secondary" onClick={onSetup}>View scholarship record</button></p>}

      {ownerId ? <ReceivingRequirements key={`${ownerId}-${semester}-${reload}`} id={ownerId} continuing={semester} session={session} access={access} academicYearId={current.id}
        setupCohort={data.availability.cohort ?? undefined}
        allowedSemesterId={data.availability.graduation?.semesterId ?? undefined} receivingContext={context} onPeriodChange={rememberPeriod} onAcademicSetup={yearId => onAcademicSetup?.(yearId ?? current.id)} />
        : <div className="alert alert-info"><p>No scholarship record exists for this academic year.</p><button className="btn configuration-primary" onClick={onSetup}>Set up scholarship year</button></div>}
    </>}
  </section>;
}
