import { useEffect, useState } from "react";
import type { ScholarDetail, RegistryPlacement } from "../server/scholars/model";
import type { AcademicRecord } from "../server/academic/model";
import type { ConfigRecord } from "../server/configuration/model";
import { configurationRequest as request } from "./configuration-api";
import { receivingToday } from "./receiving-selection";

export function yearLevelLabel(value: string | number | null | undefined) {
  const text = String(value ?? "").trim();
  const words = ["first", "second", "third", "fourth", "fifth", "sixth"];
  const word = words.findIndex(w=>text.toLowerCase()===w || text.toLowerCase()===`${w} year`);
  const numeric=text.match(/^([1-6])(?:st|nd|rd|th)?(?: year)?$/i);
  const n = numeric ? Number(numeric[1]) : word>=0 ? word+1 : NaN;
  return Number.isFinite(n) ? `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"} Year` : text || "Year level needed";
}

export function defaultAcademicYear(years: ConfigRecord[], records: AcademicRecord[], day: string) {
  const current = years.filter((year) => year.startsOn && year.endsOn && year.startsOn <= day && year.endsOn >= day);
  if (current.length === 1) return current[0].id;
  if (current.length > 1) return "";
  return records.length === 1 ? records[0].academicYearId : "";
}

export default function ScholarAcademicSummary({ scholarId, years, refreshKey, onEdit, academicYearId, suppliedPlacement }: {
  scholarId: string; years: ConfigRecord[]; refreshKey: string; onEdit?: (yearId: string) => void; academicYearId?: string; suppliedPlacement?: RegistryPlacement;
}) {
  const [records, setRecords] = useState<AcademicRecord[] | null>(null);
  const [placement, setPlacement] = useState<RegistryPlacement | null>(null);
  const [yearId, setYearId] = useState("");
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    Promise.all([
      request<{ items: AcademicRecord[] }>(`scholars/${scholarId}/academic-records`, { signal: controller.signal }),
      suppliedPlacement && (!academicYearId || suppliedPlacement.academicYearId===academicYearId) ? Promise.resolve({placement:suppliedPlacement}) : request<ScholarDetail>(`scholars/${scholarId}${academicYearId?`?contextAcademicYearId=${academicYearId}`:""}`, { signal: controller.signal }),
    ]).then(([{ items }, scholar]) => {
        if (!active) return;
        setRecords(items); setPlacement(scholar.placement ?? null); setError(false);
        setYearId((previous) => years.some((year) => year.id === previous) ? previous : defaultAcademicYear(years, items, receivingToday()));
      }).catch(() => { if (active) { setRecords(null); setError(true); } });
    return () => { active = false; controller.abort(); };
  }, [scholarId, years, refreshKey, retry, suppliedPlacement, academicYearId]);
  const selectedYear = academicYearId ?? yearId;
  const academic = records?.find((record) => record.academicYearId === selectedYear);
  const provisional = placement?.provisional && placement.academicYearId === selectedYear ? placement : null;
  return <section className="border-bottom py-2 my-2" aria-label="Student year level">
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <h3 className="h5 mb-0">Student year level</h3>
      {academicYearId !== undefined ? <span>{years.find((year) => year.id === academicYearId)?.name ?? "Selected academic year"}</span> : <label>Academic year
        <select className="form-select" value={yearId} onChange={(event) => setYearId(event.target.value)}>
          <option value="">Choose academic year</option>
          {years.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}
        </select>
      </label>}
    </div>
    {error ? <p role="alert">Academic details could not be loaded. <button className="btn btn-outline-secondary" onClick={() => setRetry((value) => value + 1)}>Retry</button></p>
      : records === null ? <p role="status">Loading academic details...</p>
      : !selectedYear ? <p>Choose an academic year to see the recorded year level.</p>
      : academic ? <><p className="mb-1">{yearLevelLabel(academic.yearLevel)} · {academic.school.name} · {academic.course.name}</p></>
      : provisional ? <><p>{yearLevelLabel(provisional.yearLevel)} · {provisional.school ?? "School needed"} / {provisional.course ?? "Course needed"}</p><small>Provisional import details. Confirm against the current COR.</small></>
      : <p className="mt-3">Year level, school and course have not been recorded for this academic year.</p>}
    {selectedYear && placement?.academicYearId === selectedYear && <p className="small mb-1">Scholarship: {placement.scholarshipStanding ?? "Not recorded"}</p>}
    {selectedYear && records !== null && !error && onEdit && <button className="btn btn-outline-secondary mt-2" onClick={() => onEdit(selectedYear)}>{academic ? "View academic record" : provisional ? "Complete academic details" : "Add academic record"}</button>}
  </section>;
}
