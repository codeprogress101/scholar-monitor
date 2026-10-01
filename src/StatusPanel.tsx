import { useEffect, useState, useRef, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import {
  OPERATIONAL_LABELS,
  OPERATIONAL_STATUSES,
  TERMINAL_STATUSES,
  type OperationalStatus,
  type StatusView,
  type StatusResult,
} from "../server/status/model";
import { configurationRequest as request } from "./configuration-api";
const message = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "Result unconfirmed. Retry the same command safely, or refresh status history.";
export default function StatusPanel({
  id,
  session,
  access,
}: {
  id: string;
  session: Session;
  access: Access;
}) {
  const [view, setView] = useState<StatusView | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [revision, setRevision] = useState(0);
  const [mode, setMode] = useState<{
    action: "request" | "approve" | "reject" | "cancel";
    id: string;
  } | null>(null);
  const [to, setTo] = useState<OperationalStatus>("on_hold"),
    [effectiveOn, setEffectiveOn] = useState(""),
    [code, setCode] = useState(""),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState("");
  const pending = useRef<{ signature: string; key: string } | null>(null),
    busy = useRef(false);
  const canRequest = access.permissions.some(
      (p) => p.code === "scholarship.status.request",
    ),
    canApprove = access.permissions.some(
      (p) => p.code === "scholarship.status.approve",
    );
  const terminal = Boolean(
    view?.status && TERMINAL_STATUSES.includes(view.status),
  );
  const original = view?.requests.find(
    (r) =>
      r.decision?.action === "approve" &&
      r.decision.resultingVersion === view.version &&
      r.toStatus === view.status,
  );
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    request<StatusView>(`scholarships/${id}/status`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (active) setView(data);
      })
      .catch((error) => {
        if (active) setError(message(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, revision]);
  function begin(
    action: "request" | "approve" | "reject" | "cancel",
    target = id,
  ) {
    setMode({ action, id: target });
    setError("");
    setNotice("");
    setReason("");
    setReference("");
    setCode("");
    setTo(
      terminal && original
        ? original.fromStatus
        : view?.status === "active"
          ? "on_hold"
          : "active",
    );
    setEffectiveOn(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    );
    pending.current = null;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!mode || !view || busy.current) return;
    const path =
      mode.action === "request"
        ? `scholarships/${id}/status/requests`
        : `status-requests/${mode.id}/${mode.action}`;
    const body =
      mode.action === "request"
        ? {
            expectedVersion: view.version,
            toStatus: to,
            kind: terminal ? "correction" : "change",
            ...(terminal ? { correctsRequestId: original?.id } : {}),
            effectiveOn,
            reasonCode: code,
            reason,
            reference,
          }
        : { reason, reference };
    const signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await request<StatusResult>(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setMode(null);
      setNotice(
        result.outcome === "pending"
          ? "Request submitted. Current status is unchanged until approval."
          : `Decision recorded: ${result.outcome}.`,
      );
      setLoading(true);
      setRevision((n) => n + 1);
    } catch (error) {
      setError(message(error));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const options = terminal
    ? original
      ? [original.fromStatus]
      : []
    : OPERATIONAL_STATUSES.filter((s) =>
        view?.status === "active"
          ? s !== "active"
          : s === "active" || TERMINAL_STATUSES.includes(s),
      );
  return (
    <section
      className="border-top mt-4 pt-4"
      aria-label="Scholarship status changes"
    >
      <div className="section-heading">
        <h4>Operational status</h4>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={saving || loading}
          onClick={() => {
            setLoading(true);
            setMode(null);
            setError("");
            setRevision((n) => n + 1);
          }}
        >
          Refresh status
        </button>
      </div>
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
      {loading && <p role="status">Loading status history...</p>}
      {view && (
        <>
          <p>
            <strong>
              {view.status ? OPERATIONAL_LABELS[view.status] : "Not activated"}
            </strong>
            {view.effectiveOn && ` - effective ${view.effectiveOn}`}
          </p>
          {!view.status ? (
            <p className="alert alert-info">
              Status changes become available after official masterlist
              activation. Qualification alone does not activate this record.
            </p>
          ) : (
            <p>
              {view.statusAllowsPayout
                ? "Active status alone does not establish payout eligibility; other eligibility checks remain required."
                : "This status does not permit normal payout eligibility."}
            </p>
          )}
          {view.periodUnavailable && (
            <p className="alert alert-warning">
              This year is locked or archived. New requests and approvals are
              blocked; pending requests may still be rejected or cancelled.
            </p>
          )}
          {terminal && (
            <p className="alert alert-warning">
              Terminal state. Reversal requires a correction linked to the
              original approved decision, a reason/reference, and a different
              Coordinator's approval.
            </p>
          )}
          {!mode && view.status && canRequest && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={
                saving ||
                loading ||
                view.periodUnavailable ||
                (terminal && !original)
              }
              onClick={() => begin("request")}
            >
              {terminal
                ? "Request controlled correction"
                : "Request status change"}
            </button>
          )}
          {mode && (
            <form className="border rounded p-3 my-3" onSubmit={submit}>
              <fieldset disabled={saving || loading}>
                <legend className="h5">
                  {mode.action === "request"
                    ? terminal
                      ? "Request controlled correction"
                      : "Request status change"
                    : `${mode.action[0].toUpperCase() + mode.action.slice(1)} status request`}
                </legend>
                {mode.action === "approve" && (
                  <p>
                    Approval applies the requested state and effective date.
                    Review the request below before confirming.
                  </p>
                )}
                {mode.action === "request" && (
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="status-target">
                        Requested status
                      </label>
                      <select
                        id="status-target"
                        className="form-select"
                        value={to}
                        onChange={(e) =>
                          setTo(e.target.value as OperationalStatus)
                        }
                      >
                        {options.map((s) => (
                          <option key={s} value={s}>
                            {OPERATIONAL_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="status-date">
                        Status effective date
                      </label>
                      <input
                        id="status-date"
                        type="date"
                        required
                        className="form-control"
                        value={effectiveOn}
                        onChange={(e) => setEffectiveOn(e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="status-code">
                        Reason code
                      </label>
                      <input
                        id="status-code"
                        className="form-control"
                        required
                        minLength={2}
                        maxLength={60}
                        pattern="[A-Z][A-Z0-9_]+"
                        placeholder="e.g. VERIFIED_WITHDRAWAL"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                )}
                <label className="form-label" htmlFor="status-reason">
                  Status reason
                </label>
                <input
                  id="status-reason"
                  className="form-control mb-3"
                  required
                  minLength={5}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <label className="form-label" htmlFor="status-reference">
                  Status decision / physical record reference
                </label>
                <input
                  id="status-reference"
                  className="form-control"
                  required
                  minLength={3}
                  maxLength={300}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <div className="d-flex gap-2 mt-3">
                  <button type="submit" className="btn configuration-primary">
                    {saving
                      ? "Saving..."
                      : mode.action === "request"
                        ? "Submit status request"
                        : `Confirm ${mode.action}`}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setMode(null)}
                  >
                    Close status command
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          <h5 className="mt-4">Status requests and decisions</h5>
          {!view.requests.length && <p>No status changes recorded.</p>}
          <ol className="ps-3">
            {view.requests.map((r) => (
              <li className="mb-4" key={r.id}>
                <strong>
                  {OPERATIONAL_LABELS[r.fromStatus]} →{" "}
                  {OPERATIONAL_LABELS[r.toStatus]}
                </strong>{" "}
                ({r.kind})
                <div>
                  Effective {r.effectiveOn} · {r.reasonCode}
                </div>
                <div>
                  Requested by {r.actorName} ·{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </div>
                <div>{r.reason}</div>
                <div>Reference: {r.reference}</div>
                {r.correctsRequestId && (
                  <div className="text-break">
                    Corrects request: {r.correctsRequestId}
                  </div>
                )}
                {r.decision ? (
                  <div className="mt-2">
                    <strong>{r.decision.action}</strong> —{" "}
                    {r.decision.actorName} ·{" "}
                    {new Date(r.decision.occurredAt).toLocaleString()}
                    <div>{r.decision.reason}</div>
                    <div>Reference: {r.decision.reference}</div>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 mb-2">
                      Pending approval
                      {r.expectedVersion !== view.version
                        ? " — source state changed; reject or cancel and submit a fresh request."
                        : ""}
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      {canApprove && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm configuration-primary"
                            disabled={
                              loading ||
                              saving ||
                              view.periodUnavailable ||
                              r.actorId === access.userId ||
                              r.expectedVersion !== view.version
                            }
                            onClick={() => begin("approve", r.id)}
                          >
                            Approve request
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={loading || saving}
                            onClick={() => begin("reject", r.id)}
                          >
                            Reject request
                          </button>
                        </>
                      )}
                      {canRequest && r.actorId === access.userId && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={loading || saving}
                          onClick={() => begin("cancel", r.id)}
                        >
                          Cancel my request
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
