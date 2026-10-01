import RequirementInstances from "./RequirementInstances";
import StatusPanel from "./StatusPanel";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { Access } from "../server/authorization/policy";
import type { ConfigRecord } from "../server/configuration/model";
import {
  STATUS_LABELS,
  type QualificationAction,
  type QualificationDetail,
  type QualificationResult,
  type ScholarshipRecord,
} from "../server/qualification/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
const labels: Record<QualificationAction | "create", string> = {
  create: "Create annual record",
  "exam-passed": "Record exam passed",
  qualify: "Confirm qualification",
  select: "Select scholar",
  "not-select": "Mark Not Selected",
  activate: "Activate",
};
const failureMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "The result could not be confirmed. Retry the same command safely or refresh the annual records.";
export default function QualificationPanel({
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
  const [records, setRecords] = useState<ScholarshipRecord[]>([]),
    [detail, setDetail] = useState<QualificationDetail | null>(null);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0),
    [action, setAction] = useState<QualificationAction | "create" | null>(null);
  const [yearId, setYearId] = useState(""),
    [effectiveOn, setEffectiveOn] = useState(""),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState("");
  const pending = useRef<{ signature: string; key: string } | null>(null),
    busy = useRef(false),
    generation = useRef(0);
  const invalidateOpen = useCallback(() => {
    generation.current++;
  }, []);
  const canPrepare = access.permissions.some(
    (permission) => permission.code === "scholarship.status.request",
  );
  const canApprove = access.permissions.some(
    (permission) => permission.code === "scholarship.status.approve",
  );
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    request<{ items: ScholarshipRecord[] }>(
      `scholars/${scholarId}/scholarships`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (active) setRecords(data.items);
      })
      .catch((error) => {
        if (active) setError(failureMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
      invalidateOpen();
    };
  }, [scholarId, revision, invalidateOpen]);
  async function open(id: string) {
    const token = ++generation.current;
    setLoading(true);
    setError("");
    setNotice("");
    setAction(null);
    try {
      const row = await request<QualificationDetail>("scholarships/" + id);
      if (token === generation.current) setDetail(row);
    } catch (error) {
      if (token === generation.current) setError(failureMessage(error));
    } finally {
      if (token === generation.current) setLoading(false);
    }
  }
  function begin(next: QualificationAction | "create") {
    setAction(next);
    setReason("");
    setReference("");
    setYearId("");
    setError("");
    setNotice("");
    pending.current = null;
    setEffectiveOn(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current || !action) return;
    const path =
      action === "create"
        ? `scholars/${scholarId}/scholarships`
        : `scholarships/${detail!.id}/qualification/${action}`;
    const body = {
      expectedVersion: action === "create" ? 0 : detail!.version,
      effectiveOn,
      reason,
      reference,
      ...(action === "create" ? { academicYearId: yearId } : {}),
    };
    const signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await request<QualificationResult>(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setAction(null);
      setNotice(`${STATUS_LABELS[result.status]} recorded.`);
      setDetail(null);
      try {
        setDetail(
          await request<QualificationDetail>("scholarships/" + result.id),
        );
      } catch {
        setError(
          "The command was saved. Refresh annual records to see its history.",
        );
      }
      setLoading(true);
      setRevision((value) => value + 1);
    } catch (error) {
      setError(failureMessage(error));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const choices = years.filter(
    (year) =>
      !year.archived &&
      !year.locked &&
      !records.some((record) => record.academicYearId === year.id),
  );
  const commands: QualificationAction[] = [];
  if (detail && !detail.periodUnavailable) {
    if (canPrepare && detail.status === "applicant")
      commands.push("exam-passed");
    if (canApprove && detail.status === "exam_passed") commands.push("qualify");
    if (canApprove && detail.status === "qualified") commands.push("select");
    if (
      canApprove &&
      ["applicant", "exam_passed", "qualified"].includes(detail.status)
    )
      commands.push("not-select");
  }
  return (
    <section
      className="mt-4 border-top pt-4"
      aria-label="Annual scholarship qualification"
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">ANNUAL SCHOLARSHIP</div>
          <h3>Qualification records</h3>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={saving || loading}
          onClick={() => {
            setLoading(true);
            setAction(null);
            setDetail(null);
            setError("");
            setRevision((value) => value + 1);
          }}
        >
          Refresh annual records
        </button>
      </div>
      <p>
        Applicant → Exam Passed → Qualified → Selected. Selection does not make
        a scholar Active or eligible for payout.
      </p>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {loading && <p role="status">Loading annual records...</p>}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {records.map((row) => (
          <button
            type="button"
            key={row.id}
            className="btn btn-outline-secondary"
            disabled={loading || saving}
            onClick={() => open(row.id)}
          >
            {row.yearCode}: {STATUS_LABELS[row.status]}
          </button>
        ))}
        {canPrepare && (
          <button
            type="button"
            className="btn configuration-primary"
            disabled={loading || saving || !choices.length}
            onClick={() => begin("create")}
          >
            Add academic year record
          </button>
        )}
      </div>
      {!loading && !records.length && (
        <p>
          No annual qualification records yet. A permanent scholar profile does
          not establish qualification.
        </p>
      )}
      {detail && (
        <div className="mb-3">
          <h4>
            {detail.yearCode}: {STATUS_LABELS[detail.status]}
          </h4>
          <p>
            Effective {detail.lastEffectiveOn} · Version {detail.version}
          </p>
          {detail.periodUnavailable && (
            <p className="alert alert-warning">
              This academic year is locked or archived. History is readable;
              changes are blocked.
            </p>
          )}
          {detail.status === "selected" && (
            <p className="alert alert-info">
              Selection alone does not activate this record. See operational
              status below.
            </p>
          )}
          {detail.status === "not_selected" && (
            <p className="alert alert-info">
              Not Selected is terminal for this academic year. Normal commands
              cannot reverse it.
            </p>
          )}
          {!canApprove &&
            ["exam_passed", "qualified"].includes(detail.status) && (
              <p>A Coordinator must record the next qualification decision.</p>
            )}
          {!action && (
            <div className="d-flex flex-wrap gap-2">
              {commands.map((command) => (
                <button
                  type="button"
                  key={command}
                  className="btn btn-outline-secondary"
                  disabled={saving || loading}
                  onClick={() => begin(command)}
                >
                  {labels[command]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {action && (
        <form onSubmit={submit} className="border rounded p-3 mb-3">
          <fieldset disabled={saving || loading}>
            <legend className="h5">{labels[action]}</legend>
            {action === "not-select" && (
              <p className="alert alert-warning">
                This ends qualification for this academic year. It cannot be
                reversed through normal commands.
              </p>
            )}
            <div className="row g-3">
              {action === "create" && (
                <div className="col-md-6">
                  <label className="form-label" htmlFor="qualification-year">
                    Academic year
                  </label>
                  <select
                    id="qualification-year"
                    className="form-select"
                    required
                    value={yearId}
                    onChange={(event) => setYearId(event.target.value)}
                  >
                    <option value="">Select academic year</option>
                    {choices.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.code} - {year.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-md-6">
                <label className="form-label" htmlFor="qualification-date">
                  Effective date
                </label>
                <input
                  id="qualification-date"
                  type="date"
                  className="form-control"
                  required
                  value={effectiveOn}
                  onChange={(event) => setEffectiveOn(event.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="qualification-reference">
                  Physical record / decision reference
                </label>
                <input
                  id="qualification-reference"
                  className="form-control"
                  required
                  minLength={3}
                  maxLength={300}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="qualification-reason">
                  Qualification reason
                </label>
                <input
                  id="qualification-reason"
                  className="form-control"
                  required
                  minLength={5}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button className="btn configuration-primary" type="submit">
                {saving ? "Saving..." : labels[action]}
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setAction(null)}
              >
                Cancel qualification command
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {detail && (
        <RequirementInstances
          key={`requirements-${detail.id}`}
          id={detail.id}
          yearId={detail.academicYearId}
          session={session}
          access={access}
        />
      )}
      {detail && (
        <StatusPanel
          key={detail.id}
          id={detail.id}
          session={session}
          access={access}
        />
      )}
      {detail && (
        <div>
          <h4>Qualification history</h4>
          <ol className="ps-3">
            {detail.events.map((event) => (
              <li key={event.id} className="mb-3">
                <strong>{STATUS_LABELS[event.toStatus]}</strong> —{" "}
                {event.effectiveOn}
                <div>
                  {event.actorName} ·{" "}
                  {new Date(event.occurredAt).toLocaleString()}
                </div>
                <div>{event.reason}</div>
                <div>Reference: {event.reference}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
