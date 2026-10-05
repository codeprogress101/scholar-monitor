import { useEffect, useState } from "react";
import type { AcademicRecord } from "../server/academic/model";
import type { ConfigRecord } from "../server/configuration/model";
import { configurationRequest as request } from "./configuration-api";
import { receivingToday } from "./receiving-selection";

export function defaultAcademicYear(years: ConfigRecord[], records: AcademicRecord[], day: string) {
  const current = years.filter((year) => year.startsOn && year.endsOn && year.startsOn <= day && year.endsOn >= day);
  if (current.length === 1) return current[0].id;
  if (current.length > 1) return "";
  return records.length === 1 ? records[0].academicYearId : "";
}

export default function ScholarAcademicSummary({ scholarId, years, refreshKey, onEdit }: {
  scholarId: string; years: ConfigRecord[]; refreshKey: string; onEdit: (yearId: string) => void;
}) {
  const [records, setRecords] = useState<AcademicRecord[] | null>(null);
  const [yearId, setYearId] = useState("");
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    request<{ items: AcademicRecord[] }>(`scholars/${scholarId}/academic-records`, { signal: controller.signal })
      .then(({ items }) => {
        if (!active) return;
        setRecords(items); setError(false);
        setYearId((previous) => years.some((year) => year.id === previous) ? previous : defaultAcademicYear(years, items, receivingToday()));
      }).catch(() => { if (active) { setRecords(null); setError(true); } });
    return () => { active = false; controller.abort(); };
  }, [scholarId, years, refreshKey, retry]);
  const academic = records?.find((record) => record.academicYearId === yearId);
  return <section className="border rounded p-3 my-3" aria-label="Student year level">
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <h3 className="h5 mb-0">Student year level</h3>
      <label>Academic year
        <select className="form-select" value={yearId} onChange={(event) => setYearId(event.target.value)}>
          <option value="">Choose academic year</option>
          {years.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}
        </select>
      </label>
    </div>
    {error ? <p role="alert">Academic details could not be loaded. <button className="btn btn-outline-secondary" onClick={() => setRetry((value) => value + 1)}>Retry</button></p>
      : records === null ? <p role="status">Loading academic details...</p>
      : !yearId ? <p>Choose an academic year to see the recorded year level.</p>
      : academic ? <><p className="h4 mt-3">{academic.yearLevel}</p><p className="mb-1">{academic.school.name} · {academic.course.name}</p><small>Recorded for {academic.academicYear.name}. Earlier years are preserved.</small></>
      : <p className="mt-3">Year level, school and course have not been recorded for this academic year.</p>}
    {yearId && records !== null && !error && <button className="btn btn-outline-secondary mt-2" onClick={() => onEdit(yearId)}>{academic ? "View academic record" : "Add academic record"}</button>}
  </section>;
}
