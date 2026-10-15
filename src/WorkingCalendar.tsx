import { useEffect, useRef, useState } from "react";
import type { Session } from "./auth-api";
import type { ConfigRecord } from "../server/configuration/model";
import type { calendarState } from "../server/configuration/calendar";
import { configurationRequest as request } from "./configuration-api";
type Calendar = Awaited<ReturnType<typeof calendarState>>;
export default function WorkingCalendar({ session, years, canManage, revision, onReady, onSaved }: {
  session: Session; years: ConfigRecord[]; canManage: boolean; revision: number; onReady: (ready: boolean) => void; onSaved: () => void;
}) {
  const [data, setData] = useState<Calendar | null>(null), [year, setYear] = useState("");
  const [error, setError] = useState(""), [saving, setSaving] = useState(false);
  const pending = useRef<{ year: string; key: string } | null>(null), busy = useRef(false);
  useEffect(() => {
    const c = new AbortController();
    request<Calendar>("academic-calendar", { signal: c.signal }).then(value => {
      if (c.signal.aborted) return;
      setData(value); setError(""); onReady(value.readyForNext || (!value.setting && years.length === 0));
    }).catch(e => { if (!c.signal.aborted) { setError(e.message); onReady(false); } });
    return () => c.abort();
  }, [revision, years, onReady]);
  async function chooseYear() {
    if (!year || busy.current || data?.setting) return;
    busy.current = true; setSaving(true); setError("");
    if (pending.current?.year !== year) pending.current = { year, key: crypto.randomUUID() };
    try {
      await request("configuration/settings", { csrf: session.csrfToken, key: pending.current.key, body: {
        action: "create", expectedVersion: 0, reason: "Adopt the selected working academic year; preserve other years for history",
        fields: { code: "LDSS_WORKING_ACADEMIC_YEAR", name: "Working academic year", valueType: "text", value: year },
      } });
      pending.current = null; onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not confirm the working year. Retry safely."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <section className="admin-calendar" aria-label="Working academic year">
    <h2 className="h5">Working academic year</h2>
    {error && <p role="alert" className="alert alert-danger">{error}</p>}
    {!data ? <p>Loading calendar…</p> : data.setting ? <>
      <strong>{years.find(y => y.id === data.setting!.yearId)?.code ?? "Configured working year"}</strong>
      <p>{data.readyForNext ? "Both semesters' payroll cycles are closed. You can add the next academic year." : "Finish both semesters and close their payroll cycles before adding the next year."}</p>
      <ul>{data.semesters.map(s => <li key={s.id}>{s.code} — {s.complete ? "Payroll closed" : !s.cycles.length ? "Payroll cycle not configured" : s.cycles.filter(c => c.state !== "closed").map(c => `${c.code}: ${c.state}`).join(", ")}</li>)}</ul>
      {!data.semesters.length && <a href="#configuration?category=semesters">Set up the first and second semesters</a>}
      {data.semesters.length === 1 && <a href="#configuration?category=semesters">Set up the remaining semester</a>}
    </> : <>
      <p>{years.length ? "Choose the one year to use for daily work. Other years and their records are retained." : "Add your first academic year, then select it here for daily work."}</p>
      {canManage && years.length > 0 && <><label>Working year<select className="form-select" value={year} disabled={saving} onChange={e => setYear(e.target.value)}><option value="">Choose year</option>{years.filter(y => !y.archived && !y.locked).map(y => <option key={y.id} value={y.id}>{y.code} — {y.name}</option>)}</select></label><button className="btn configuration-primary mt-2" disabled={saving || !year} onClick={() => void chooseYear()}>Use this academic year</button></>}
    </>}
    {data?.rollover && <section aria-label="Annual rollover results" className="border-top pt-3">
      <h3 className="h6">Continuing scholars for this year</h3>
      <p>{data.rollover.totals.created} created; {data.rollover.totals.alreadyPresent} already present; {data.rollover.totals.excluded} excluded; {data.rollover.totals.needsReview} need review</p>
      <p>Confirm academic details from the new COR, then prepare the official masterlist. Payroll eligibility is assessed separately.</p>
      <details><summary>View scholars and next steps</summary><ul>{data.rollover.scholars.map(s => <li key={s.scholarId}>
        <a href={`#scholars?scholar=${s.scholarId}&section=academic`}>{s.name} ({s.humanId})</a>: {s.reason}
      </li>)}</ul></details>
    </section>}
  </section>;
}
