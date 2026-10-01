import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type Session } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { DraftDetail, DraftEntry } from "../server/masterlists/model";
import {
  AMENDMENT_KINDS,
  type AmendmentKind,
  type AmendmentView,
  type AmendmentResult,
} from "../server/masterlists/amendment-model";
import type { ConfigList, ConfigRecord } from "../server/configuration/model";
import { configurationRequest as request } from "./configuration-api";
const labels: Record<AmendmentKind, string> = {
  school_transfer: "School transfer",
  course_shift: "Course shift",
  both: "School and course change",
  year_level_correction: "Year-level correction",
  award_number: "Award number correction",
  identity_refresh: "Refresh name from registry",
};
const describe = (e: DraftEntry) =>
  `${e.snapshot.humanId} - ${e.snapshot.name}; ${e.snapshot.placement.school.name}; ${e.snapshot.placement.course.name}; ${e.snapshot.placement.yearLevel}; Award: ${e.awardNumber ?? "Not assigned"}`;
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
export default function MasterlistAmendments({
  detail,
  session,
  access,
  onOpen,
}: {
  detail: DraftDetail;
  session: Session;
  access: Access;
  onOpen: (id: string) => void;
}) {
  const [view, setView] = useState<AmendmentView | null>(null),
    [schools, setSchools] = useState<ConfigRecord[]>([]),
    [courses, setCourses] = useState<ConfigRecord[]>([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [form, setForm] = useState<null | {
    action: "request" | "approve" | "reject" | "cancel" | "publish";
    id: string;
  }>(null);
  const [fields, setFields] = useState({
    scholarId: "",
    kind: "year_level_correction" as AmendmentKind,
    schoolId: "",
    courseId: "",
    yearLevel: "",
    awardNumber: "",
    effectiveOn: "",
    reason: "",
    reference: "",
  });
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  const can = (permission: string) =>
    access.permissions.some((p) => p.code === permission);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    Promise.all([
      request<AmendmentView>(`masterlists/${detail.id}/amendments`, {
        signal: controller.signal,
      }),
      choices("schools", controller.signal),
      choices("courses", controller.signal),
    ])
      .then(([v, s, c]) => {
        if (active) {
          setView(v);
          setSchools(s);
          setCourses(c);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof ApiError
              ? e.message
              : "Unable to load amendment history.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [detail.id, detail.version, revision]);
  function open(action: NonNullable<typeof form>["action"], id = detail.id) {
    setForm({ action, id });
    setFields({
      scholarId: "",
      kind: "year_level_correction",
      schoolId: "",
      courseId: "",
      yearLevel: "",
      awardNumber: "",
      effectiveOn: "",
      reason: "",
      reference: "",
    });
    pending.current = null;
    setError("");
    setNotice("");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form || busy.current) return;
    const specific =
      fields.kind === "school_transfer"
        ? { schoolId: fields.schoolId }
        : fields.kind === "course_shift"
          ? { courseId: fields.courseId }
          : fields.kind === "both"
            ? { schoolId: fields.schoolId, courseId: fields.courseId }
            : fields.kind === "year_level_correction"
              ? { yearLevel: fields.yearLevel }
              : fields.kind === "award_number"
                ? { awardNumber: fields.awardNumber.trim() || null }
                : {};
    const body =
      form.action === "request"
        ? {
            expectedVersion: detail.version,
            scholarId: fields.scholarId,
            kind: fields.kind,
            ...specific,
            effectiveOn: fields.effectiveOn,
            reason: fields.reason,
            reference: fields.reference,
          }
        : { reason: fields.reason, reference: fields.reference };
    const path =
        form.action === "request"
          ? `masterlists/${detail.id}/amendments`
          : `masterlist-amendments/${form.id}/${form.action}`,
      signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await request<AmendmentResult>(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setForm(null);
      setNotice(
        result.masterlistId
          ? "New locked official version published. Open it below to inspect the amendment."
          : "Amendment command saved.",
      );
      setLoading(true);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Result unconfirmed. Retry the same command safely or refresh history.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const selected = detail.entries.find((e) => e.scholarId === fields.scholarId),
    target = view?.requests.find((q) => q.id === form?.id);
  return (
    <section
      className="border rounded p-3 my-3"
      aria-label="Official amendments"
    >
      <h3 className="h5">Amendments and official versions</h3>
      <p>
        Correct one scholar per amendment. A different Coordinator approves
        before publication creates a new locked version. Original releases and
        scholarship status remain unchanged.
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
      {loading && <p role="status">Loading amendment history...</p>}
      {view && (
        <>
          <p>
            <strong>Official version {view.versionLabel}</strong>
            {view.latestId !== detail.id &&
              " - Historical version; a newer release exists."}
          </p>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {view.versions.map((v) => (
              <button
                key={v.id}
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={saving || loading || !!form || v.id === detail.id}
                onClick={() => onOpen(v.id)}
              >
                Open version {v.label}
              </button>
            ))}
          </div>
          {!view.canRequest && view.latestId === detail.id && (
            <p>
              Amendment requests require the latest locked publication and an
              open academic year.
            </p>
          )}
          <div className="d-flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={saving || loading}
              onClick={() => {
                setForm(null);
                setError("");
                setLoading(true);
                setRevision((n) => n + 1);
              }}
            >
              Refresh amendments
            </button>
            {can("masterlists.amendments.request") && (
              <button
                type="button"
                className="btn btn-sm configuration-primary"
                disabled={saving || loading || !!form || !view.canRequest}
                onClick={() => open("request")}
              >
                Request official amendment
              </button>
            )}
          </div>
          {form && (
            <form onSubmit={submit} className="border rounded p-3 mb-3">
              <fieldset disabled={saving || loading}>
                <legend className="h6">
                  {form.action === "request"
                    ? "Request official amendment"
                    : `${form.action[0].toUpperCase() + form.action.slice(1)} amendment`}
                </legend>
                {form.action === "request" ? (
                  <>
                    <label
                      className="form-label"
                      htmlFor={`amend-scholar-${detail.id}`}
                    >
                      Amendment scholar
                    </label>
                    <select
                      id={`amend-scholar-${detail.id}`}
                      className="form-select mb-3"
                      required
                      value={fields.scholarId}
                      onChange={(e) =>
                        setFields({ ...fields, scholarId: e.target.value })
                      }
                    >
                      <option value="">Select official entry</option>
                      {detail.entries.map((e) => (
                        <option key={e.scholarId} value={e.scholarId}>
                          {e.snapshot.humanId} - {e.snapshot.name}
                        </option>
                      ))}
                    </select>
                    {selected && (
                      <p>
                        <strong>Original:</strong> {describe(selected)}
                      </p>
                    )}
                    <label
                      className="form-label"
                      htmlFor={`amend-kind-${detail.id}`}
                    >
                      Amendment type
                    </label>
                    <select
                      className="form-select mb-3"
                      id={`amend-kind-${detail.id}`}
                      value={fields.kind}
                      onChange={(e) =>
                        setFields({
                          ...fields,
                          kind: e.target.value as AmendmentKind,
                        })
                      }
                    >
                      {AMENDMENT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {labels[k]}
                        </option>
                      ))}
                    </select>
                    {(
                      [
                        {
                          key: "schoolId",
                          label: "Amended school",
                          items: schools,
                          show: ["school_transfer", "both"].includes(
                            fields.kind,
                          ),
                        },
                        {
                          key: "courseId",
                          label: "Amended course",
                          items: courses,
                          show: ["course_shift", "both"].includes(fields.kind),
                        },
                      ] as const
                    )
                      .filter((f) => f.show)
                      .map(({ key, label, items }) => (
                        <div key={key} className="mb-3">
                          <label
                            className="form-label"
                            htmlFor={`amend-${key}-${detail.id}`}
                          >
                            {label}
                          </label>
                          <select
                            className="form-select"
                            id={`amend-${key}-${detail.id}`}
                            required
                            value={fields[key]}
                            onChange={(e) =>
                              setFields({ ...fields, [key]: e.target.value })
                            }
                          >
                            <option value="">Select active reference</option>
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
                      <>
                        <label
                          className="form-label"
                          htmlFor={`amend-level-${detail.id}`}
                        >
                          Amended year level
                        </label>
                        <input
                          className="form-control mb-3"
                          id={`amend-level-${detail.id}`}
                          required
                          maxLength={60}
                          value={fields.yearLevel}
                          onChange={(e) =>
                            setFields({ ...fields, yearLevel: e.target.value })
                          }
                        />
                      </>
                    )}
                    {fields.kind === "award_number" && (
                      <>
                        <label
                          className="form-label"
                          htmlFor={`amend-award-${detail.id}`}
                        >
                          Amended award number (blank to clear)
                        </label>
                        <input
                          className="form-control mb-3"
                          id={`amend-award-${detail.id}`}
                          maxLength={60}
                          value={fields.awardNumber}
                          onChange={(e) =>
                            setFields({
                              ...fields,
                              awardNumber: e.target.value,
                            })
                          }
                        />
                      </>
                    )}
                    {fields.kind === "identity_refresh" && (
                      <p>
                        Correct the scholar's name in the registry first. This
                        request will capture the current registry name for
                        review; the permanent Scholar ID remains unchanged.
                      </p>
                    )}
                    <label
                      className="form-label"
                      htmlFor={`amend-date-${detail.id}`}
                    >
                      Amendment effective date
                    </label>
                    <input
                      className="form-control mb-3"
                      type="date"
                      id={`amend-date-${detail.id}`}
                      required
                      value={fields.effectiveOn}
                      onChange={(e) =>
                        setFields({ ...fields, effectiveOn: e.target.value })
                      }
                    />
                  </>
                ) : (
                  target && (
                    <p>
                      <strong>Before:</strong> {describe(target.before)}
                      <br />
                      <strong>After:</strong> {describe(target.after)}
                      <br />
                      Effective {target.effectiveOn}
                    </p>
                  )
                )}
                {form.action === "publish" && (
                  <p>
                    Publish a new locked official version and apply its approved
                    academic correction, if any. Existing activation and
                    operational status will be preserved.
                  </p>
                )}
                {(
                  [
                    {
                      key: "reason",
                      label: "Amendment reason",
                      min: 5,
                      max: 500,
                    },
                    {
                      key: "reference",
                      label: "Amendment decision reference",
                      min: 3,
                      max: 300,
                    },
                  ] as const
                ).map(({ key, label, min, max }) => (
                  <div className="mb-3" key={key}>
                    <label
                      className="form-label"
                      htmlFor={`amend-${key}-${detail.id}`}
                    >
                      {label}
                    </label>
                    <input
                      className="form-control"
                      id={`amend-${key}-${detail.id}`}
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
                <div className="d-flex flex-wrap gap-2">
                  <button type="submit" className="btn configuration-primary">
                    {saving ? "Saving..." : "Save amendment command"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setForm(null)}
                  >
                    Close amendment form
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          {view.requests.map((q) => (
            <article className="border rounded p-3 mb-3" key={q.id}>
              <h4 className="h6">
                {labels[q.kind]} -{" "}
                {q.publishedId
                  ? "Published"
                  : (q.decision?.action ?? "Pending approval")}
              </h4>
              <p>
                <strong>Before:</strong> {describe(q.before)}
                <br />
                <strong>After:</strong> {describe(q.after)}
              </p>
              <p>
                Effective {q.effectiveOn} - {q.reason}
                <br />
                Reference: {q.reference}
                <br />
                Requested by {q.actorName} -{" "}
                {new Date(q.createdAt).toLocaleString()}
              </p>
              {q.decision && (
                <p>
                  {q.decision.action} by {q.decision.actorName} -{" "}
                  {new Date(q.decision.occurredAt).toLocaleString()}
                  <br />
                  {q.decision.reason}
                  <br />
                  Reference: {q.decision.reference}
                </p>
              )}
              <div className="d-flex flex-wrap gap-2">
                {q.publishedId ? (
                  <button
                    type="button"
                    className="btn btn-sm configuration-primary"
                    disabled={saving || loading || !!form}
                    onClick={() => onOpen(q.publishedId!)}
                  >
                    Open amended official version
                  </button>
                ) : q.decision?.action === "approve" ? (
                  can("masterlists.publish") && (
                    <button
                      type="button"
                      className="btn btn-sm configuration-primary"
                      disabled={saving || loading || !!form || !view.canRequest}
                      onClick={() => open("publish", q.id)}
                    >
                      Publish approved amendment
                    </button>
                  )
                ) : (
                  !q.decision && (
                    <>
                      {can("masterlists.amendments.approve") && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm configuration-primary"
                            disabled={
                              saving ||
                              loading ||
                              !!form ||
                              !view.canRequest ||
                              q.actorId === access.userId
                            }
                            onClick={() => open("approve", q.id)}
                          >
                            Approve amendment
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={saving || loading || !!form}
                            onClick={() => open("reject", q.id)}
                          >
                            Reject amendment
                          </button>
                        </>
                      )}
                      {can("masterlists.amendments.request") &&
                        q.actorId === access.userId && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={saving || loading || !!form}
                            onClick={() => open("cancel", q.id)}
                          >
                            Cancel amendment request
                          </button>
                        )}
                    </>
                  )
                )}
              </div>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
