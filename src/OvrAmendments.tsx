import { useActionForm } from "./use-action-form";
import { useState, useRef, useEffect, type FormEvent } from "react";
import type { OvrDetail } from "../server/ovr/model";
import type { EligibilityView } from "../server/eligibility/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
export default function OvrAmendments({
  detail,
  session,
  permissions,
  onSaved,
}: {
  detail: OvrDetail;
  session: Session;
  permissions: string[];
  onSaved: () => void;
}) {
  const [action, setAction] = useState(""),
    [change, setChange] = useState("remove"),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [query, setQuery] = useState(""),
    [candidates, setCandidates] = useState<EligibilityView[]>([]),
    [loading, setLoading] = useState(false);
  const busy = useRef(false),
    retry = useRef<{ signature: string; key: string } | null>(null);
  const pending = detail.amendments.find((a) => a.state === "pending"),
    roster = detail.effectiveFinalization!.snapshot;
  const allowed =
    ["finalized", "submitted"].includes(detail.batch.state) &&
    detail.cycle.state === "open" &&
    !detail.cycle.periodUnavailable;
  const actionForm = useActionForm(action);
  useEffect(() => {
    if (action !== "request" || change !== "add") return;
    const c = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setCandidates([]);
      request<{ items: EligibilityView[] }>(
        `payout-cycles/${detail.cycle.id}/eligibility?q=${encodeURIComponent(query)}&limit=25`,
        { signal: c.signal },
      )
        .then((r) => {
          if (active) setCandidates(r.items);
        })
        .catch((e) => {
          if (active)
            setError(
              e instanceof ApiError ? e.message : "Could not load candidates.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timer);
    };
  }, [action, change, query, detail.cycle.id]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    const f = new FormData(e.currentTarget);
    const body = {
      expectedRevision: detail.batch.revision,
      reason: String(f.get("reason")),
      reference: String(f.get("reference")),
      ...(action === "request"
        ? {
            change,
            ...(change === "rename"
              ? { name: String(f.get("name")) }
              : { scholarshipId: String(f.get("scholarshipId")) }),
          }
        : { amendmentId: pending!.id }),
    };
    const path = `ovr-batches/${detail.batch.id}/amendments/${action}`,
      signature = JSON.stringify({ path, body });
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await request(path, {
        body,
        key: retry.current.key,
        csrf: session.csrfToken,
      });
      retry.current = null;
      onSaved();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not confirm the result. Retry the same command safely.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const member = (id: string) => {
    const s = roster.entries.find((e) => e.scholarshipId === id)?.evidence
      .current.sources.scholarship;
    return s ? `${s.humanId} — ${s.name}` : id;
  };
  return (
    <section className="border rounded p-3 my-3" aria-label="Payroll amendments">
      <h4>Payroll amendments</h4>
      <p>
        The original frozen roster is retained. The Coordinator must
        approve corrections. Approval creates a new roster version and requires
        administrative resubmission. Amendments stop when processing starts or
        the cycle is locked or closed.
      </p>
      <details>
        <summary>
          Effective roster: {roster.name} ({roster.entries.length} members)
        </summary>
        <ul>
          {roster.entries.map((e) => (
            <li key={e.scholarshipId}>{member(e.scholarshipId)}</li>
          ))}
        </ul>
        <p>Version hash: {detail.effectiveFinalization!.hash}</p>
      </details>
      {pending && (
        <p className="alert alert-warning" role="status">
          An amendment is pending. Processing is paused until it is approved or
          rejected.
        </p>
      )}
      {detail.amendments.map((a) => (
        <article id={`request-${a.id}`} className="border-top my-3 pt-2" key={a.id}>
          <h5>
            {a.change} — {a.state}
          </h5>
          <p>
            Requested by {a.requestedByName},{" "}
            {new Date(a.requestedAt).toLocaleString()}. {a.reason} (
            {a.reference})
          </p>
          <details>
            <summary>Before and proposed roster</summary>
            <p>Before: {a.before.name}</p>
            <ul>
              {a.before.entries.map((e) => (
                <li key={e.scholarshipId}>
                  {e.evidence.current.sources.scholarship.humanId} —{" "}
                  {e.evidence.current.sources.scholarship.name}
                </li>
              ))}
            </ul>
            <p>Proposed: {a.proposed.name}</p>
            <ul>
              {a.proposed.entries.map((e) => (
                <li key={e.scholarshipId}>
                  {e.evidence.current.sources.scholarship.humanId} —{" "}
                  {e.evidence.current.sources.scholarship.name}
                </li>
              ))}
            </ul>
          </details>
          {a.decidedBy && (
            <p>
              {a.state} by {a.decidedByName},{" "}
              {new Date(a.decidedAt!).toLocaleString()}. {a.decisionReason} (
              {a.decisionReference})
            </p>
          )}
        </article>
      ))}
      {allowed && (
        <div className="d-flex flex-wrap gap-2">
          {!pending && permissions.includes("ovr.amendments.request") && (
            <button
              className="btn btn-outline-primary"
              disabled={saving}
              onClick={() => setAction("request")}
            >
              Request Payroll amendment
            </button>
          )}
          {pending &&
            permissions.includes("ovr.amendments.approve") &&
             (
              <>
                <button
                  className="btn btn-success"
                  disabled={saving}
                  onClick={() => setAction("approve")}
                >
                  Approve Payroll amendment
                </button>
                <button
                  className="btn btn-outline-danger"
                  disabled={saving}
                  onClick={() => setAction("reject")}
                >
                  Reject Payroll amendment
                </button>
              </>
            )}
        </div>
      )}
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {action && allowed && (
        <form ref={actionForm}
          aria-label="Payroll amendment command"
          onSubmit={submit}
          className="mt-3"
          key={action}
        >
          <fieldset disabled={saving}>
            <legend>{action} amendment</legend>
            {action === "request" && (
              <>
                <label className="form-label d-block">
                  Correction type
                  <select
                    className="form-select"
                    value={change}
                    onChange={(e) => setChange(e.target.value)}
                  >
                    <option value="remove">Remove a member</option>
                    <option value="add">Add a member</option>
                    <option value="rename">Correct batch name</option>
                  </select>
                </label>
                {change === "rename" ? (
                  <label className="form-label d-block">
                    Corrected batch name
                    <input
                      className="form-control"
                      name="name"
                      required
                      minLength={2}
                      maxLength={160}
                      defaultValue={roster.name}
                    />
                  </label>
                ) : (
                  <>
                    {change === "add" && (
                      <label className="form-label d-block">
                        Find scholar by name or ID
                        <input
                          className="form-control"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                    )}
                    <label className="form-label d-block">
                      Amendment member
                      <select
                        className="form-select"
                        name="scholarshipId"
                        required
                        defaultValue=""
                        key={`${change}-${query}-${candidates.length}`}
                        disabled={loading && change === "add"}
                      >
                        <option value="">Select a member</option>
                        {change === "remove"
                          ? roster.entries.map((e) => (
                              <option
                                key={e.scholarshipId}
                                value={e.scholarshipId}
                              >
                                {member(e.scholarshipId)}
                              </option>
                            ))
                          : candidates.map((c) => (
                              <option
                                key={c.current.sources.scholarship.id}
                                value={c.current.sources.scholarship.id}
                              >
                                {c.current.sources.scholarship.humanId} —{" "}
                                {c.current.sources.scholarship.name}
                              </option>
                            ))}
                      </select>
                    </label>
                    {change === "add" && (
                      <p>
                        {loading
                          ? "Loading candidates..."
                          : "Showing up to 25 matches. Search by Scholar ID to narrow results."}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            <label className="form-label d-block">
              Amendment reason
              <input
                className="form-control"
                name="reason"
                required
                minLength={5}
                maxLength={500}
              />
            </label>
            <label className="form-label d-block">
              Amendment reference
              <input
                className="form-control"
                name="reference"
                required
                minLength={3}
                maxLength={300}
              />
            </label>
            <div className="d-flex gap-2">
              <button
                className="btn configuration-primary"
                disabled={change === "add" && action === "request" && loading}
              >
                Confirm amendment action
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setAction("")}
              >
                Cancel amendment
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
