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
}: {
  scholarId: string;
  session: Session;
  access: Access;
  years: ConfigRecord[];
}) {
  const [records, setRecords] = useState<AcademicRecord[]>([]),
    [schools, setSchools] = useState<ConfigRecord[]>([]),
    [courses, setCourses] = useState<ConfigRecord[]>([]);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [editing, setEditing] = useState(false),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [fields, setFields] = useState({
    academicYearId: "",
    schoolId: "",
    courseId: "",
    yearLevel: "",
    reason: "",
    reference: "",
  });
  const pending = useRef<{ signature: string; key: string } | null>(null),
    busy = useRef(false);
  const editable = access.permissions.some((p) => p.code === "academic.edit");
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
    ])
      .then(([list, s, c]) => {
        if (active) {
          setRecords(list.items);
          setSchools(s);
          setCourses(c);
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
  }, [scholarId, revision]);
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
        body: fields,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setEditing(false);
      setNotice("Academic record saved. Earlier years are preserved.");
      setLoading(true);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const available = years.filter(
    (y) =>
      !y.archived &&
      !y.locked &&
      !records.some((r) => r.academicYearId === y.id),
  );
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
          }}
        >
          Refresh academic history
        </button>
      </div>
      <p>
        One school, course and year-level record per academic year. Earlier
        years remain unchanged. Placement changes and corrections are requested
        below and require Coordinator approval.
      </p>
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
      {!loading && (!schools.length || !courses.length) && (
        <p className="alert alert-info">
          A System Administrator must configure active schools and courses
          before academic records can be added.
        </p>
      )}
      {!editing && editable && (
        <button
          type="button"
          className="btn configuration-primary mb-3"
          disabled={
            loading ||
            saving ||
            !available.length ||
            !schools.length ||
            !courses.length
          }
          onClick={() => {
            setFields({
              academicYearId: "",
              schoolId: "",
              courseId: "",
              yearLevel: "",
              reason: "",
              reference: "",
            });
            pending.current = null;
            setEditing(true);
            setError("");
            setNotice("");
          }}
        >
          Add academic record
        </button>
      )}
      {editing && (
        <form className="border rounded p-3 mb-3" onSubmit={submit}>
          <fieldset disabled={saving || loading}>
            <legend className="h5">Add academic record</legend>
            <div className="row g-3">
              {(
                [
                  {
                    key: "academicYearId",
                    label: "Academic record year",
                    items: available,
                  },
                  { key: "schoolId", label: "School", items: schools },
                  { key: "courseId", label: "Course", items: courses },
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
              {(
                [
                  { key: "yearLevel", label: "Year level", min: 1, max: 60 },
                  {
                    key: "reference",
                    label: "Academic physical record reference",
                    min: 3,
                    max: 300,
                  },
                  {
                    key: "reason",
                    label: "Academic entry reason",
                    min: 5,
                    max: 500,
                  },
                ] as const
              ).map(({ key, label, min, max }) => (
                <div
                  className={key === "yearLevel" ? "col-md-4" : "col-12"}
                  key={key}
                >
                  <label className="form-label" htmlFor={"academic-" + key}>
                    {label}
                  </label>
                  <input
                    id={"academic-" + key}
                    className="form-control"
                    required
                    minLength={min}
                    maxLength={max}
                    value={fields[key]}
                    onChange={(e) =>
                      setFields({ ...fields, [key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
            <p className="mt-3">
              Check the placement before saving. This annual entry is retained
              as history.
            </p>
            <div className="d-flex gap-2">
              <button type="submit" className="btn configuration-primary">
                {saving ? "Saving..." : "Save academic record"}
              </button>
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
      {!loading && !records.length && (
        <p>
          No academic records yet. Qualification requires an entry for its
          academic year.
        </p>
      )}
      {records.map((r) => (
        <article className="border rounded p-3 mb-3" key={r.id}>
          <h4>
            {r.academicYear.code} - {r.academicYear.name}
          </h4>
          <dl className="scholar-detail-grid">
            <div>
              <dt>School</dt>
              <dd>
                {r.school.name} ({r.school.code})
              </dd>
            </div>
            <div>
              <dt>Course</dt>
              <dd>
                {r.course.name} ({r.course.code})
              </dd>
            </div>
            <div>
              <dt>Year level</dt>
              <dd>{r.yearLevel}</dd>
            </div>
          </dl>
          <p>
            Reference: {r.reference}
            <br />
            {r.reason}
          </p>
          <small>
            Initial entry recorded by {r.actorName} -{" "}
            {new Date(r.createdAt).toLocaleString()}
          </small>
          <AcademicChanges
            id={r.id}
            session={session}
            access={access}
            schools={schools}
            courses={courses}
            onSaved={() => setRevision((n) => n + 1)}
          />
          {r.periodUnavailable && (
            <p className="mt-2 mb-0">Historical period: locked or archived.</p>
          )}
        </article>
      ))}
    </section>
  );
}
