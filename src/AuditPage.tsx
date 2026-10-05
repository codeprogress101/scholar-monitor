import { useEffect, useRef, useState } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { AuditList, AuditDetail } from "../server/audit/service";
import { configurationRequest as request } from "./configuration-api";
import { receivingToday } from "./receiving-selection";
import ExcelExport from "./ExcelExport";
const defaults = () => ({
  from: receivingToday().slice(0, 8) + "01",
  to: receivingToday(),
  eventType: "",
  action: "",
  entityId: "",
  actorId: "",
  requestId: "",
});
export default function AuditPage({ session }: { session: Session }) {
  const [filters, setFilters] = useState(defaults),
    [applied, setApplied] = useState(defaults);
  const [offset, setOffset] = useState(0),
    [reload, setReload] = useState(0);
  const [access, setAccess] = useState<Access | null>(null),
    [data, setData] = useState<AuditList | null>(null),
    [detail, setDetail] = useState<AuditDetail | null>(null);
  const [error, setError] = useState(""),
    [detailError, setDetailError] = useState(""),
    [selected, setSelected] = useState("");
  const generation = useRef(0);
  const detailPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selected) {
      detailPanel.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      detailPanel.current?.focus({ preventScroll: true });
    }
  }, [selected]);
  const canRead = access?.permissions.some(
    (p) => p.code === "audit.view_all" || p.code === "audit.view_limited",
  );
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    request<Access>("me/permissions", { signal: c.signal })
      .then((a) => {
        if (active) setAccess(a);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof ApiError ? e.message : "Could not load access.",
          );
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [reload]);
  useEffect(() => {
    if (!canRead) return;
    const c = new AbortController();
    let active = true;
    const query = new URLSearchParams({
      ...applied,
      offset: String(offset),
      limit: "25",
    });
    request<AuditList>(`audit-events?${query}`, { signal: c.signal })
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof ApiError ? e.message : "Could not load audit events.",
          );
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [applied, offset, reload, canRead]);
  function clear() {
    generation.current++;
    setData(null);
    setDetail(null);
    setSelected("");
    setError("");
    setDetailError("");
  }
  async function open(id: string) {
    const current = ++generation.current;
    setSelected(id);
    setDetail(null);
    setDetailError("");
    try {
      const d = await request<AuditDetail>(`audit-events/${id}`);
      if (current === generation.current) setDetail(d);
    } catch (e) {
      if (current === generation.current)
        setDetailError(
          e instanceof ApiError ? e.message : "Could not load this event.",
        );
    }
  }
  return (
    <section aria-labelledby="audit-title">
      <header className="d-flex justify-content-between gap-3 mb-4">
        <div>
          <p className="eyebrow">Accountability</p>
          <h1 id="audit-title">Audit events</h1>
          <p>
            Review who changed a record and the evidence recorded with the
            action.
          </p>
        </div>
        <button
          className="btn btn-outline-secondary align-self-start"
          onClick={() => {
            clear();
            setReload((n) => n + 1);
          }}
        >
          Refresh
        </button>
      </header>
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      {access && !canRead ? (
        <p className="alert alert-info">
          Your account does not have audit viewing access.
        </p>
      ) : canRead ? (
        <>
          <form
            className="card p-3 mb-3"
            onSubmit={(e) => {
              e.preventDefault();
              clear();
              setOffset(0);
              setApplied({ ...filters });
            }}
          >
            <div className="row g-3 align-items-end">
              {(["from", "to"] as const).map((k) => (
                <div className="col-md-4" key={k}>
                  <label className="form-label" htmlFor={`audit-${k}`}>
                    {k === "from" ? "From" : "Through"} (Manila date)
                  </label>
                  <input
                    required
                    type="date"
                    max={receivingToday()}
                    className="form-control"
                    id={`audit-${k}`}
                    value={filters[k]}
                    onChange={(e) =>
                      setFilters({ ...filters, [k]: e.target.value })
                    }
                  />
                </div>
              ))}
              <div className="col-md-4">
                <button className="btn btn-primary">Apply filters</button>
              </div>
            </div>
            <details className="mt-3">
              <summary>More filters</summary>
              <p>Exact matches. Date range: up to 31 days.</p>
              <div className="row g-3">
                {(
                  [
                    ["eventType", "Event type"],
                    ["action", "Action"],
                    ["entityId", "Record ID"],
                    ["actorId", "Actor ID"],
                    ["requestId", "Request ID"],
                  ] as const
                ).map(([key, label]) => (
                  <div className="col-md-6" key={key}>
                    <label className="form-label" htmlFor={`audit-${key}`}>
                      {label}
                    </label>
                    <input
                      className="form-control"
                      id={`audit-${key}`}
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters({ ...filters, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            </details>
          </form>
          <p>
            {data?.scope === "own"
              ? "Showing events performed by your account."
              : "Program-wide audit access."}{" "}
            Dates filter by Manila time. Event details are read-only.
          </p>
          {!data ? (
            !error && <p role="status">Loading events...</p>
          ) : (
            <div className="card p-3">
              <p>
                <strong>{data.total} events</strong>
              </p>
              <div className="table-responsive">
                <table className="table" style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th scope="col">Time</th>
                      <th scope="col">Event</th>
                      <th scope="col">Action</th>
                      <th scope="col">Actor role at event</th>
                      <th scope="col">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((e) => (
                      <tr key={e.id}>
                        <td>{new Date(e.occurredAt).toLocaleString()}</td>
                        <td>{e.eventType}</td>
                        <td>{e.action}</td>
                        <td>
                          {e.actorRoles === null
                            ? "Not recorded"
                            : e.actorRoles.join(", ") || e.actorKind}
                        </td>
                        <td>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => void open(e.id)}
                          >
                            View event
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.total && <p>No events match these filters.</p>}
              <div className="d-flex gap-3">
                <button
                  className="btn btn-outline-secondary"
                  disabled={!offset}
                  onClick={() => {
                    clear();
                    setOffset((n) => Math.max(0, n - 25));
                  }}
                >
                  Previous
                </button>
                <span>
                  {data.total ? offset + 1 : 0}–
                  {Math.min(offset + 25, data.total)} of {data.total}
                </span>
                <button
                  className="btn btn-outline-secondary"
                  disabled={offset + 25 >= data.total}
                  onClick={() => {
                    clear();
                    setOffset((n) => n + 25);
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {selected && (
            <article
              ref={detailPanel}
              tabIndex={-1}
              className="card p-3 mt-3"
              aria-label="Audit event details"
            >
              <div className="d-flex justify-content-between">
                <h2>Event details</h2>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    generation.current++;
                    setSelected("");
                    setDetail(null);
                  }}
                >
                  Close details
                </button>
              </div>
              {detailError ? (
                <p role="alert" className="alert alert-danger">
                  {detailError}
                </p>
              ) : !detail ? (
                <p>Loading event...</p>
              ) : (
                <>
                  <dl className="text-break">
                    {Object.entries({
                      Event: detail.eventType,
                      Action: detail.action,
                      Time: new Date(detail.occurredAt).toLocaleString(),
                      "Actor ID": detail.actorId ?? detail.actorKind,
                      "Roles at event":
                        detail.actorRoles?.join(", ") ??
                        "Not recorded for historical event",
                      "Record type": detail.entityType,
                      "Record ID": detail.entityId,
                      "Request ID": detail.requestId,
                      Reason: detail.reason ?? "Not recorded",
                      "From state": detail.context.fromState ?? "Not recorded",
                      "To state": detail.context.toState ?? "Not recorded",
                      "Academic year ID":
                        detail.context.academicYearId ?? "Not recorded",
                      "Semester ID":
                        detail.context.semesterId ?? "Not recorded",
                      "Payout cycle ID":
                        detail.context.payoutCycleId ?? "Not recorded",
                      Reference: detail.context.reference ?? "Not recorded",
                      Remarks: detail.context.remarks ?? "Not recorded",
                    }).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v || "None"}</dd>
                      </div>
                    ))}
                  </dl>
                  <details>
                    <summary>Recorded change and supporting evidence</summary>
                    <p>
                      Fields vary by event. Absent historical context is not
                      reconstructed from current records.
                    </p>
                    <pre
                      className="p-3 bg-light"
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {JSON.stringify(detail.details, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </article>
          )}
          {access?.permissions.some((p) => p.code === "audit.export") && (
            <ExcelExport session={session} kind="audit" />
          )}
        </>
      ) : (
        !error && <p>Loading access...</p>
      )}
    </section>
  );
}
