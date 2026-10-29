import {ActionButton} from "./ActionProgress";
import PlacementInput, {placementValue} from "./PlacementInput";
import type { ScholarDetail } from "../server/scholars/model";
import { useActionForm } from "./use-action-form";
import RoutineEvidence from "./RoutineEvidence";
import { academicYears, newRecordYear } from "./academic-year-options";
import AcademicChanges from "./AcademicChanges";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type Session } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { ConfigList, ConfigRecord } from "../server/configuration/model";
import type { AcademicRecord } from "../server/academic/model";
import { configurationRequest as request } from "./configuration-api";
async function choices(kind: string, signal: AbortSignal) {
  const items: ConfigRecord[] = [];
  while (true) {
    const page = await request<ConfigList>(
      `configuration/${kind}?limit=100&offset=${items.length}`,
      { signal },
    );
    items.push(...page.items);
    if (items.length >= page.total || !page.items.length) return items;
  }
}
const message = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Result unconfirmed. Refresh academic history or retry the same entry safely.";
export default function AcademicPanel({
  scholarId,
  session,
  access,
  years,
  initialYearId = "",
  registrationYearId = "",
  onSaved,
}: {
  scholarId: string;
  session: Session;
  access: Access;
  years: ConfigRecord[];
  initialYearId?: string;
  registrationYearId?: string;
  onSaved?: () => void;
}) {
  const [intake, setIntake] = useState<ScholarDetail["placement"]>(null);
  const [records, setRecords] = useState<AcademicRecord[]>([]),
    [schools, setSchools] = useState<ConfigRecord[]>([]),
    [courses, setCourses] = useState<ConfigRecord[]>([]);
  const [currentYears, setCurrentYears] = useState(years);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [editing, setEditing] = useState(false),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [fields, setFields] = useState({
    academicYearId: initialYearId,
    schoolId: "",
    courseId: "",
    yearLevel: "",
    reason: "",
    reference: "",
  });
  const pending = useRef<{ signature: string; key: string } | null>(null),
    busy = useRef(false);
  const editable = access.permissions.some((p) => p.code === "academic.edit");
  const actionForm = useActionForm(editing);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    Promise.all([
      request<{ items: AcademicRecord[] }>(
        `scholars/${scholarId}/academic-records`,
        { signal: controller.signal },
      ),
      choices("schools", controller.signal),
      choices("courses", controller.signal),
      academicYears(controller.signal),
      request<ScholarDetail>(`scholars/${scholarId}${initialYearId?`?contextAcademicYearId=${initialYearId}`:""}`, { signal: controller.signal }),
    ])
      .then(([list, s, c, freshYears, scholar]) => {
        if (active) {
          setIntake(scholar.placement);
          setError("");
          setRecords(list.items);
          setSchools(s);
          setCourses(c);
          setCurrentYears(freshYears);
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [scholarId, revision, initialYearId]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    const signature = JSON.stringify(fields);
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request(`scholars/${scholarId}/academic-records`, {
        body: {...fields, ...placementValue(fields.schoolId,schools,"school"), ...placementValue(fields.courseId,courses,"course")},
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setEditing(false);
      setNotice("Academic record saved. Earlier years are preserved.");
      onSaved?.();
      setLoading(true);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const available = currentYears.filter(
    (y) =>
      !y.archived &&
      !y.locked &&
      !records.some((r) => r.academicYearId === y.id),
  );
  const previousAcademic = records.find(r => {
    const previousYear = currentYears.find(y => y.id === r.academicYearId);
    const targetYear = currentYears.find(y => y.id === fields.academicYearId);
    return previousYear?.endsOn && targetYear?.startsOn && previousYear.endsOn < targetYear.startsOn;
  });
  return (
    <section className="border-top mt-4 pt-4" aria-label="Academic history">
      <div className="section-heading">
        <h3>Academic history</h3>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={loading || saving}
          onClick={() => {
            setLoading(true);
            setEditing(false);
            setError("");
            setRevision((n) => n + 1);
            onSaved?.();
          }}
        >
          Refresh academic history
        </button>
      </div>
      <details className="u1-context-help"><summary>Academic record rules</summary><p>One placement per year. Earlier years remain unchanged; placement corrections require Coordinator approval.</p></details>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}
      {loading && <p role="status">Loading academic history...</p>}
      {!loading && !error && !available.length && <p>There is already an academic record for every available year. To correct this year's details, use Placement changes below.</p>}
      {!editing && !error && editable && (
        <button
          type="button"
          className="btn configuration-primary mb-3"
          disabled={
            loading ||
            saving ||
            !available.length
          }
          onClick={() => {
            const targetYear = newRecordYear(currentYears, records.map(r => r.academicYearId), initialYearId, registrationYearId);
            const supplied = intake?.academicYearId === targetYear && intake.provisional ? intake : null;
            setFields({
              academicYearId: targetYear,
              schoolId: supplied?.school ?? "",
              courseId: supplied?.course ?? "",
              yearLevel: supplied?.yearLevel ?? "",
              reason: "",
              reference: "",
            });
            pending.current = null;
            setEditing(true);
            setError("");
            setNotice("");
          }}
        >
          {intake?.provisional && intake.schoolId ? "Complete academic details" : "Add academic record"}
        </button>
      )}
      {intake?.provisional && intake.school && <p>Provisional import: {intake.school} / Year {intake.yearLevel} / {intake.course ?? "Course needed"}. Confirm against the current COR.</p>}
      {editing && (
        <form ref={actionForm} className="border rounded p-3 mb-3" onSubmit={submit}>
          <fieldset disabled={saving || loading}>
            <legend className="h5">Add academic record</legend>
            {previousAcademic && <aside className="alert alert-info">
              <strong>Previous academic details - suggestions only</strong>
              <p>{previousAcademic.school.name}; {previousAcademic.course.name}; {previousAcademic.yearLevel}</p>
              <p>Confirm school, course and year level against the new COR. Year level does not increase automatically.</p>
            </aside>}
            <div className="row g-3">
              {(
                [
                  {
                    key: "academicYearId",
                    label: "Academic record year",
                    items: available,
                  },
                ] as const
              ).map(({ key, label, items }) => (
                <div className="col-md-4" key={key}>
                  <label className="form-label" htmlFor={"academic-" + key}>
                    {label}
                  </label>
                  <select
                    className="form-select"
                    id={"academic-" + key}
                    required
                    value={fields[key]}
                    onChange={(e) =>
                      setFields({ ...fields, [key]: e.target.value })
                    }
                  >
                    <option value="">Select {label.toLowerCase()}</option>
                    {items.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.code} - {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {([{key:"schoolId",label:"School",items:schools},{key:"courseId",label:"Course",items:courses}] as const).map(({key,label,items})=><div className="col-md-4" key={key}><PlacementInput id={"academic-"+key} label={label} items={items} value={fields[key]} onChange={value=>setFields({...fields,[key]:value})}/></div>)}
              <div className="col-md-4"><label className="form-label" htmlFor="academic-year-level">Year level</label><input id="academic-year-level" className="form-control" list="academic-year-levels" required maxLength={60} value={fields.yearLevel} onChange={(e) => setFields({...fields, yearLevel:e.target.value})} /><datalist id="academic-year-levels">{["First Year", "Second Year", "Third Year", "Fourth Year", "Fifth Year", "Sixth Year"].map((level)=><option key={level} value={level}/>)}</datalist></div>
<RoutineEvidence>{(["reason", "reference"] as const).map((key)=><label className="form-label d-block" key={key}>{key === "reason" ? "Additional note" : "Supporting reference"}<input className="form-control" name={key} value={fields[key]} maxLength={key === "reason" ? 500 : 300} onChange={(e)=>setFields({...fields,[key]:e.target.value})}/></label>)}</RoutineEvidence>
            </div>
            <p className="mt-3">
              Check the placement before saving. This annual entry is retained
              as history.
            </p>
            <div className="d-flex gap-2">
              <ActionButton pending={saving} type="submit" className="btn configuration-primary">
                {saving ? "Saving..." : "Save academic record"}
              </ActionButton>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setEditing(false)}
              >
                Cancel academic entry
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {!loading && !error && !records.length && (
        <p>
          No academic records yet. Qualification requires an entry for its
          academic year.
        </p>
      )}
      {[...records].sort((a,b)=>Number(b.academicYearId===initialYearId)-Number(a.academicYearId===initialYearId)).map((r) => (
        <article className="border rounded p-3 mb-3" key={r.id}>
          <h4>
            {r.academicYear.code} - {r.academicYear.name}
          </h4>
          <dl className="scholar-detail-grid">
            <div>
              <dt>School</dt>
              <dd>
                {r.school.name}
              </dd>
            </div>
            <div>
              <dt>Course</dt>
              <dd>
                {r.course.name}
              </dd>
            </div>
            <div>
              <dt>Year level</dt>
              <dd>{r.yearLevel}</dd>
            </div>
          </dl>
          <details><summary>Original entry details</summary><p>
            Reference: {r.reference}
            <br />
            {r.reason}
          </p>
          <small>
            Initial entry recorded by {r.actorName} -{" "}
            {new Date(r.createdAt).toLocaleString()}
          </small></details>
          <AcademicChanges
            id={r.id}
            session={session}
            access={access}
            schools={schools}
            courses={courses}
            onSaved={() => { setRevision((n) => n + 1); onSaved?.(); }}
          />
          {r.periodUnavailable && (
            <p className="mt-2 mb-0">Historical period: locked or archived.</p>
          )}
        </article>
      ))}
    </section>
  );
}
