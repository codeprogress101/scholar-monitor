import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type Session } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { ConfigRecord } from "../server/configuration/model";
import type {
  AcademicChangeView,
  Placement,
} from "../server/academic/changes-model";
import { configurationRequest as request } from "./configuration-api";
const kinds = {
  course_shift: "Course shift",
  school_transfer: "School transfer",
  both: "School and course change",
  year_level_correction: "Year-level correction",
};
const placement = (p: Placement) =>
  `${p.school.name} (${p.school.code}) / ${p.course.name} (${p.course.code}) / ${p.yearLevel}`;
export default function AcademicChanges({
  id,
  session,
  access,
  schools,
  courses,
  onSaved,
}: {
  id: string;
  session: Session;
  access: Access;
  schools: ConfigRecord[];
  courses: ConfigRecord[];
  onSaved: () => void;
}) {
  const [view, setView] = useState<AcademicChangeView | null>(null),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [form, setForm] = useState<null | {
    action: "request" | "approve" | "reject" | "cancel";
    target: string;
  }>(null);
  const [fields, setFields] = useState({
    kind: "course_shift",
    schoolId: "",
    courseId: "",
    yearLevel: "",
    effectiveOn: "",
    reason: "",
    reference: "",
    remarks: "",
  });
  const pending = useRef<{ signature: string; key: string } | null>(null),
    saving = useRef(false);
  const canEdit = access.permissions.some((p) => p.code === "academic.edit"),
    canApprove = access.permissions.some(
      (p) => p.code === "academic.changes.approve",
    );
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    request<AcademicChangeView>(`academic-records/${id}/changes`, {
      signal: controller.signal,
    })
      .then((v) => {
        if (active) setView(v);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof ApiError
              ? e.message
              : "Could not load academic changes.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, revision]);
  function open(
    action: "request" | "approve" | "reject" | "cancel",
    target = id,
  ) {
    if (!view) return;
    setFields({
      kind: "course_shift",
      schoolId: view.current.schoolId,
      courseId: view.current.courseId,
      yearLevel: view.current.yearLevel,
      effectiveOn: "",
      reason: "",
      reference: "",
      remarks: "",
    });
    setForm({ action, target });
    setError("");
    setNotice("");
    pending.current = null;
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form || !view || saving.current) return;
    const body =
      form.action === "request"
        ? { ...fields, expectedVersion: view.version }
        : { reason: fields.reason, reference: fields.reference };
    const path =
      form.action === "request"
        ? `academic-records/${id}/changes`
        : `academic-changes/${form.target}/${form.action}`;
    const signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setForm(null);
      setNotice("Academic change command saved.");
      setLoading(true);
      setRevision((n) => n + 1);
      onSaved();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Result unconfirmed. Retry the same command safely or refresh history.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="border-top mt-3 pt-3">
      <h5>Placement changes</h5>
      <p>
        A different Coordinator approves each request. Year-level corrections
        are recorded separately from transfers and shifts.
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
      {loading && <p role="status">Loading changes...</p>}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          type="button"
          disabled={busy || loading}
          onClick={() => {
            setError("");
            setForm(null);
            setLoading(true);
            setRevision((n) => n + 1);
            onSaved();
          }}
        >
          Refresh placement changes
        </button>
        {canEdit && (
          <button
            className="btn btn-sm configuration-primary"
            type="button"
            disabled={busy || loading || !view || view.unavailable || !!form}
            onClick={() => open("request")}
          >
            Request academic change
          </button>
        )}
      </div>
      {view?.unavailable && (
        <p>
          Placement changes are unavailable for this locked, archived, or
          official record. Changes to approved or published membership require a
          masterlist amendment.
        </p>
      )}
      {view && (
        <p>
          Approved revision: {view.version}
          {view.effectiveOn
            ? ` · Effective ${view.effectiveOn}`
            : " · Initial entry"}
        </p>
      )}
      {form && view && (
        <form onSubmit={submit} className="border rounded p-3 mb-3">
          <fieldset disabled={busy || loading}>
            <legend className="h6">
              {form.action === "request"
                ? "Request academic change"
                : `${form.action[0].toUpperCase() + form.action.slice(1)} academic change`}
            </legend>
            {form.action !== "request" &&
              (() => {
                const q = view.requests.find((q) => q.id === form.target);
                return q ? (
                  <p>
                    Review: {placement(q.before)} → {placement(q.after)} ·
                    Effective {q.effectiveOn}
                  </p>
                ) : null;
              })()}
            <div className="row g-3">
              {form.action === "request" && (
                <>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor={`kind-${id}`}>
                      Change type
                    </label>
                    <select
                      id={`kind-${id}`}
                      className="form-select"
                      value={fields.kind}
                      onChange={(e) =>
                        setFields({
                          ...fields,
                          kind: e.target.value,
                          schoolId: view.current.schoolId,
                          courseId: view.current.courseId,
                          yearLevel: view.current.yearLevel,
                        })
                      }
                    >
                      {Object.entries(kinds).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(
                    [
                      {
                        key: "schoolId",
                        label: "New school",
                        items: schools,
                        enabled: ["school_transfer", "both"].includes(
                          fields.kind,
                        ),
                      },
                      {
                        key: "courseId",
                        label: "New course",
                        items: courses,
                        enabled: ["course_shift", "both"].includes(fields.kind),
                      },
                    ] as const
                  )
                    .filter((f) => f.enabled)
                    .map(({ key, label, items }) => (
                      <div className="col-md-6" key={key}>
                        <label className="form-label" htmlFor={`${key}-${id}`}>
                          {label}
                        </label>
                        <select
                          id={`${key}-${id}`}
                          className="form-select"
                          required
                          value={fields[key]}
                          onChange={(e) =>
                            setFields({ ...fields, [key]: e.target.value })
                          }
                        >
                          <option value="">Select {label.toLowerCase()}</option>
                          {!items.some((i) => i.id === view.current[key]) && (
                            <option value={view.current[key]}>
                              Current historical reference
                            </option>
                          )}
                          {items
                            .filter((i) => !i.archived)
                            .map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.code} - {i.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    ))}
                  {fields.kind === "year_level_correction" && (
                    <div className="col-md-6">
                      <label className="form-label" htmlFor={`level-${id}`}>
                        Correct year level
                      </label>
                      <input
                        id={`level-${id}`}
                        className="form-control"
                        required
                        maxLength={60}
                        value={fields.yearLevel}
                        onChange={(e) =>
                          setFields({ ...fields, yearLevel: e.target.value })
                        }
                      />
                    </div>
                  )}
                  <div className="col-md-6">
                    <label className="form-label" htmlFor={`effective-${id}`}>
                      Effective date
                    </label>
                    <input
                      id={`effective-${id}`}
                      type="date"
                      className="form-control"
                      required
                      value={fields.effectiveOn}
                      onChange={(e) =>
                        setFields({ ...fields, effectiveOn: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor={`remarks-${id}`}>
                      Remarks (optional)
                    </label>
                    <textarea
                      id={`remarks-${id}`}
                      className="form-control"
                      maxLength={1000}
                      value={fields.remarks}
                      onChange={(e) =>
                        setFields({ ...fields, remarks: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
              {(
                [
                  {
                    key: "reason",
                    label: "Change or decision reason",
                    min: 5,
                    max: 500,
                  },
                  {
                    key: "reference",
                    label: "Physical-record reference",
                    min: 3,
                    max: 300,
                  },
                ] as const
              ).map(({ key, label, min, max }) => (
                <div className="col-12" key={key}>
                  <label className="form-label" htmlFor={`${key}-${id}`}>
                    {label}
                  </label>
                  <input
                    id={`${key}-${id}`}
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
            <div className="d-flex gap-2 mt-3">
              <button className="btn configuration-primary" type="submit">
                {busy
                  ? "Saving..."
                  : form.action === "request"
                    ? "Submit change request"
                    : "Save decision"}
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setForm(null)}
              >
                Close form
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {view?.requests.length === 0 && <p>No academic changes recorded.</p>}
      {view?.requests.map((q) => (
        <article className="border rounded p-3 mb-2" key={q.id}>
          <h6>
            {kinds[q.kind as keyof typeof kinds]} ·{" "}
            {q.decision?.action ?? "Pending approval"}
          </h6>
          <p>
            <strong>Before:</strong> {placement(q.before)}
            <br />
            <strong>After:</strong> {placement(q.after)}
          </p>
          <p>
            Effective {q.effectiveOn} · {q.reason}
            <br />
            Reference: {q.reference}
            {q.remarks && (
              <>
                <br />
                Remarks: {q.remarks}
              </>
            )}
          </p>
          <p>
            Requested by {q.actorName} ·{" "}
            {new Date(q.createdAt).toLocaleString()}
          </p>
          {q.decision ? (
            <p>
              {q.decision.action} by {q.decision.actorName} ·{" "}
              {new Date(q.decision.occurredAt).toLocaleString()}
              <br />
              {q.decision.reason} · Reference: {q.decision.reference}
            </p>
          ) : (
            <>
              {q.expectedVersion !== view.version && (
                <p>
                  This request is stale; reject or cancel it and submit against
                  the current placement.
                </p>
              )}
              <div className="d-flex flex-wrap gap-2">
                {canApprove && (
                  <>
                    <button
                      className="btn btn-sm configuration-primary"
                      disabled={
                        busy ||
                        loading ||
                        !!form ||
                        view.unavailable ||
                        q.expectedVersion !== view.version ||
                        q.actorId === access.userId
                      }
                      onClick={() => open("approve", q.id)}
                    >
                      Approve change
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      disabled={busy || loading || !!form}
                      onClick={() => open("reject", q.id)}
                    >
                      Reject change
                    </button>
                  </>
                )}
                {canEdit && q.actorId === access.userId && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={busy || loading || !!form}
                    onClick={() => open("cancel", q.id)}
                  >
                    Cancel request
                  </button>
                )}
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
