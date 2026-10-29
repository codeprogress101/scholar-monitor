import {ActionButton} from "./ActionProgress";
import RoutineEvidence from "./RoutineEvidence";
import { academicYears, newRecordYear } from "./academic-year-options";
import { receivingToday } from "./receiving-selection";
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
  ADMISSION_LABELS,
  type QualificationAction,
  type QualificationDetail,
  type QualificationResult,
  type ScholarshipRecord,
} from "../server/qualification/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
const labels: Record<QualificationAction | "create", string> = {
  create: "Create annual record",
  validate: "Validate scholar",
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
  initialYearId = "",
  registrationYearId = "",
  onYearChange,
  showRequirements = true,
  graduated = false,
}: {
  scholarId: string;
  session: Session;
  access: Access;
  years: ConfigRecord[];
  initialYearId?: string;
  registrationYearId?: string;
  onYearChange?: (yearId: string) => void;
  showRequirements?: boolean;
  graduated?: boolean;
}) {
  const [records, setRecords] = useState<ScholarshipRecord[]>([]),
    [detail, setDetail] = useState<QualificationDetail | null>(null);
  const [currentYears, setCurrentYears] = useState(years);
  const formRef = useRef<HTMLFormElement>(null);
  const restoredYear = useRef(false);
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
    Promise.all([request<{ items: ScholarshipRecord[] }>(
      `scholars/${scholarId}/scholarships`,
      { signal: controller.signal },
    ), academicYears(controller.signal)])
      .then(async ([data, freshYears]) => {
        if (active) {
          setRecords(data.items);
          setCurrentYears(freshYears);
          setError("");
          if (!restoredYear.current && initialYearId) {
            const selected = data.items.find(r => r.academicYearId === initialYearId);
            if (selected) {
              const row = await request<QualificationDetail>(`scholarships/${selected.id}`, { signal: controller.signal });
              if (active) setDetail(row);
            }
          }
          if (active) restoredYear.current = true;
        }
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
  }, [scholarId, revision, invalidateOpen, initialYearId]);
  useEffect(() => {
    if (action) { formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); formRef.current?.querySelector<HTMLSelectElement | HTMLInputElement>("select, input")?.focus({ preventScroll: true }); }
  }, [action]);
  async function open(id: string) {
    const token = ++generation.current;
    setLoading(true);
    setError("");
    setNotice("");
    setAction(null);
    try {
      const row = await request<QualificationDetail>("scholarships/" + id);
      if (token === generation.current) { setDetail(row); onYearChange?.(row.academicYearId); }
    } catch (error) {
      if (token === generation.current) setError(failureMessage(error));
    } finally {
      if (token === generation.current) setLoading(false);
    }
  }
  function begin(next: QualificationAction | "create") {
    generation.current++;
    if (next === "create") setDetail(null);
    setAction(next);
    setReason("");
    setReference("");
    setYearId(newRecordYear(currentYears, records.map(r => r.academicYearId), initialYearId, registrationYearId));
    setError("");
    setNotice("");
    pending.current = null;
    setEffectiveOn(receivingToday());
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
      ...(action === "validate" ? { priorQualificationConfirmed: true } : {}),
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
      onYearChange?.(action === "create" ? yearId : detail!.academicYearId);
      setAction(null);
      setNotice(`${ADMISSION_LABELS[result.status]} recorded.`);
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
  const choices = currentYears.filter(
    (year) =>
      year.working !== false &&
      !year.archived &&
      !year.locked &&
      !records.some((record) => record.academicYearId === year.id),
  );
  const commands: QualificationAction[] = [];
  if (detail && !detail.periodUnavailable) {
    if (canPrepare && ["applicant", "exam_passed"].includes(detail.status))
      commands.push("validate");
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
          <h3>Scholarship validation & selection</h3>
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
      <details className="u1-context-help"><summary>Validation, selection &amp; publication</summary><p>Validation precedes Coordinator selection. Masterlist publication and semester compliance remain separate.</p></details>
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
            disabled={loading || saving || Boolean(action)}
            onClick={() => open(row.id)}
          >
            {row.yearCode}: {ADMISSION_LABELS[row.status]}
          </button>
        ))}
        {canPrepare && !error && (
          <button
            type="button"
            className="btn configuration-primary"
            disabled={loading || saving || Boolean(action) || !choices.length}
            onClick={() => begin("create")}
          >
            Add academic year record
          </button>
        )}
      </div>
      {!loading && !error && !choices.length && <p className="alert alert-info">No additional academic year is available. Open an existing record above; a scholar can have only one scholarship record per year.</p>}
      {!loading && !error && !records.length && (
        <p>
          No annual qualification records yet. A permanent scholar profile does
          not establish qualification.
        </p>
      )}
      {detail && (
        <div className="mb-3">
          <h4>
            {detail.yearCode}: {ADMISSION_LABELS[detail.status]}
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
          {detail.status === "selected" && !graduated && (
            <p className="alert alert-info">
              Selected for masterlist preparation. Add this scholar to a draft for {detail.yearCode}, then complete review and publication to activate the scholarship.
              {" "}<a href="#masterlists">Open Masterlists</a>
            </p>
          )}
          {detail.status === "continuing" && <p className="alert alert-info">
            {detail.continuingFromScholarshipId ? "Continuing from the prior academic year. Admission does not need to be repeated." : "Continuing admission accepted from a reviewed roster."}
            {" "}Confirm this year's academic details and complete official masterlist publication before payroll.
          </p>}
          {detail.status === "not_selected" && (
            <p className="alert alert-info">
              Not Selected is terminal for this academic year. Normal commands
              cannot reverse it.
            </p>
          )}
          {!canApprove &&
            detail.status === "qualified" && (
              <p className="alert alert-warning"><strong>Coordinator action required: Select scholar.</strong> <a href="#admissions">Open Admission review</a> to review multiple scholars.</p>
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
                  {labels[command]}{["qualify", "select", "not-select"].includes(command) ? " · Coordinator" : " · Staff / Coordinator"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {action && (
        <form ref={formRef} onSubmit={submit} className="border rounded p-3 mb-3">
          <fieldset disabled={saving || loading}>
            <legend className="h5">{labels[action]}</legend>
            {action === "create" && <p>Add this already-qualified scholar for validation. School, course and year level are recorded under Academic records.</p>}
            {action === "validate" && <label className="d-block mb-3"><input type="checkbox" required /> I checked that this scholar already passed the LGU qualifying examination and completed qualification outside this system.</label>}
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
              <RoutineEvidence routine={action !== "not-select"}><div className="col-12">
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
              </div></RoutineEvidence>
            </div>
            <div className="d-flex gap-2 mt-3">
              <ActionButton pending={saving} className="btn configuration-primary" type="submit">
                {saving ? "Saving..." : labels[action]}
              </ActionButton>
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
      {detail && showRequirements && (
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
        <details className="secondary-details">
          <summary>Qualification history ({detail.events.length})</summary>
          <ol className="ps-3">
            {detail.events.map((event) => (
              <li key={event.id} className="mb-3">
                <strong>{event.action === "validate" ? "Validated — prior qualification confirmed" : STATUS_LABELS[event.toStatus]}</strong> —{" "}
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
        </details>
      )}
    </section>
  );
}
