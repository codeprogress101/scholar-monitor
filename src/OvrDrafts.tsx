import RoutineEvidence from "./RoutineEvidence";
import ErrorNotice from "./ErrorNotice";
import PaymentCorrections from "./PaymentCorrections";
import OvrAmendments from "./OvrAmendments";
import OvrProcessingPanel from "./OvrProcessingPanel";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { OvrBatch, OvrDetail } from "../server/ovr/model";
import type { PayoutCycle } from "../server/payouts/model";
import type { EligibilityView } from "../server/eligibility/model";
type Candidates = {
  items: Pick<EligibilityView, "current" | "effective">[];
  total: number;
};
export default function OvrDrafts({
  cycleId,
  session,
  permissions,
}: {
  cycleId: string;
  session: Session;
  permissions: string[];
}) {
  const [list, setList] = useState<{
      cycle: PayoutCycle;
      items: OvrBatch[];
      total: number;
    } | null>(null),
    [offset, setOffset] = useState(0),
    [reload, setReload] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [detail, setDetail] = useState<OvrDetail | null>(null),
    [error, setError] = useState<string | ApiError>(""),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState(false);
  const [action, setAction] = useState<
      | "create"
      | "add"
      | "remove"
      | "validate"
      | "submit-review"
      | "return-to-draft"
      | "finalize"
      | null
    >(null),
    [removeId, setRemoveId] = useState(""),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [candidateOffset, setCandidateOffset] = useState(0),
    [candidates, setCandidates] = useState<Candidates | null>(null);
  const [issues, setIssues] = useState<
    { code: string; message: string; scholarshipId?: string }[]
  >([]);
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  const message = (e: unknown) =>
    e instanceof ApiError
      ? e
      : "Could not confirm the OVR result. Refresh or retry the same command safely.";
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    request<{ cycle: PayoutCycle; items: OvrBatch[]; total: number }>(
      `payout-cycles/${cycleId}/ovr-batches?offset=${offset}&limit=25`,
      { signal: c.signal },
    )
      .then((r) => {
        if (active) setList(r);
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [cycleId, offset, reload]);
  useEffect(() => {
    if (!selected) return;
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    request<OvrDetail>(`ovr-batches/${selected}`, { signal: c.signal })
      .then((r) => {
        if (active) setDetail(r);
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [selected, reload]);
  useEffect(() => {
    if (action !== "add") return;
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    request<Candidates>(
      `payout-cycles/${cycleId}/eligibility?q=${encodeURIComponent(search)}&offset=${candidateOffset}&limit=25`,
      { signal: c.signal },
    )
      .then((r) => {
        if (active) setCandidates(r);
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [action, cycleId, search, candidateOffset, reload]);
  function refresh() {
    setDetail(null);
    setList(null);
    setError("");
    setIssues([]);
    setReload((n) => n + 1);
  }
  function choose(a: typeof action, id = "") {
    setAction(a);
    setRemoveId(id);
    setError("");
    setIssues([]);
    setNotice("");
    setCandidates(null);
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!action || !list || busy.current || (action !== "create" && !detail))
      return;
    const f = new FormData(e.currentTarget),
      body = {
        expectedRevision: action === "create" ? 0 : detail!.batch.revision,
        reason: String(f.get("reason")),
        reference: String(f.get("reference")),
        ...(action === "create"
          ? {
              code: String(f.get("code")),
              name: String(f.get("name")),
              expectedCycleVersion: list.cycle.version,
            }
          : {}),
        ...(action === "add"
          ? { scholarshipId: String(f.get("scholarshipId")) }
          : {}),
        ...(action === "remove" ? { scholarshipId: removeId } : {}),
      };
    const path =
        action === "create"
          ? `payout-cycles/${cycleId}/ovr-batches`
          : `ovr-batches/${selected}/${action === "add" || action === "remove" ? `entries/${action}` : action}`,
      signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    setIssues([]);
    try {
      const r = await request<OvrBatch>(path, {
        body,
        key: pending.current.key,
        csrf: session.csrfToken,
      });
      pending.current = null;
      setSelected(r.id);
      setAction(null);
      setNotice(
        action === "validate"
          ? r.validation?.valid
            ? "Draft validation passed. This batch is not finalized."
            : "Draft validation recorded issues. Review the roster below."
          : action === "finalize"
            ? "OVR finalized. Membership and source evidence are frozen."
            : action === "submit-review"
              ? "OVR submitted for Coordinator review."
              : action === "return-to-draft"
                ? "OVR returned to Draft for corrections."
                : "OVR draft change saved.",
      );
      refresh();
    } catch (e) {
      setError(message(e));
      if (e instanceof ApiError && e.code === "OVR_VALIDATION_FAILED")
        setIssues(
          (e.details as { validation?: { issues?: typeof issues } })?.validation
            ?.issues ?? [],
        );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <section
      className="card p-3 my-3"
      aria-label="OVR draft batches"
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="d-flex justify-content-between flex-wrap gap-2">
        <h2>OVR batches{list ? `: ${list.cycle.code}` : ""}</h2>
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={() => {
            setAction(null);
            refresh();
          }}
        >
          Refresh OVR drafts
        </button>
      </div>
      <p>
        Build a payout roster from current eligible records. Documents, status,
        official membership and unresolved overrides are checked again when
        adding and validating entries. Draft validation does not finalize a
        batch or authorize payment.
      </p>
      <ErrorNotice error={error} />
      {!!issues.length && (
        <ul aria-label="OVR validation errors">
          {issues.map((i, n) => (
            <li key={n}>
              {i.scholarshipId
                ? `${detail?.entries.find((e) => e.scholarshipId === i.scholarshipId)?.evidence.current.sources.scholarship.humanId ?? i.scholarshipId}: `
                : ""}
              {i.message} ({i.code})
            </li>
          ))}
        </ul>
      )}
      {notice && <p role="status">{notice}</p>}
      {!list ? (
        <p>Loading OVR batches...</p>
      ) : (
        <>
          {list.cycle.state === "open" && !list.cycle.periodUnavailable && (
            <button
              className="btn configuration-primary align-self-start"
              disabled={saving}
              onClick={() => choose("create")}
            >
              Create OVR draft
            </button>
          )}
          <ul className="my-3">
            {list.items.map((b) => (
              <li key={b.id}>
                <button
                  className="btn btn-link"
                  disabled={saving}
                  onClick={() => {
                    setSelected(b.id);
                    setDetail(null);
                    setAction(null);
                    setError("");
                    setIssues([]);
                    setReload((n) => n + 1);
                  }}
                >
                  Open OVR {b.code}
                </button>{" "}
                — {b.name} ({b.state}, revision {b.revision})
              </li>
            ))}
          </ul>
          {!list.items.length && <p>No OVR batches for this cycle.</p>}
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              disabled={!offset || saving}
              onClick={() => {
                setOffset((n) => Math.max(0, n - 25));
                setList(null);
              }}
            >
              Previous batches
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={offset + 25 >= list.total || saving}
              onClick={() => {
                setOffset((n) => n + 25);
                setList(null);
              }}
            >
              Next batches
            </button>
          </div>
        </>
      )}
      {selected && !detail && <p>Loading selected batch...</p>}
      {detail && (
        <section
          className="border-top mt-3 pt-3"
          aria-label="Selected OVR draft"
        >
          <h3>
            {detail.batch.code} — {detail.batch.name}
          </h3>
          <p>
            {detail.batch.state} · revision {detail.batch.revision} ·{" "}
            {detail.entries.length}{" "}
            {detail.entries.length === 1 ? "entry" : "entries"}
          </p>
          <p
            className={`alert ${detail.validation.valid ? "alert-success" : "alert-warning"}`}
          >
            {detail.validation.valid
              ? "Current source validation passed."
              : "Current sources need attention."}{" "}
            Checked {new Date(detail.validation.checkedAt).toLocaleString()}.
          </p>
          {!!detail.validation.issues.length && (
            <ul>
              {detail.validation.issues.map((i, n) => (
                <li key={n}>
                  {i.scholarshipId
                    ? `${detail.entries.find((e) => e.scholarshipId === i.scholarshipId)?.evidence.current.sources.scholarship.humanId ?? "Entry"}: `
                    : ""}
                  {i.message} ({i.code})
                </li>
              ))}
            </ul>
          )}
          {detail.canEdit ? (
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="btn configuration-primary"
                disabled={saving}
                onClick={() => choose("submit-review")}
              >
                Submit OVR for review
              </button>
              <button
                className="btn btn-outline-primary"
                disabled={saving}
                onClick={() => choose("add")}
              >
                Add OVR entry
              </button>
              <button
                className="btn btn-outline-primary"
                disabled={saving}
                onClick={() => choose("validate")}
              >
                Record draft validation
              </button>
            </div>
          ) : (
            <p>
              Membership changes require a Draft batch and an open, available
              payout cycle.
            </p>
          )}
          {detail.batch.state === "review" && (
            <section aria-label="OVR review">
              <p>
                Submitted by {detail.batch.submission?.actorName}. Membership is
                locked during review.
              </p>
              {permissions.includes("ovr.finalize") &&
                detail.cycle.state === "open" &&
                !detail.cycle.periodUnavailable && (
                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="btn btn-outline-secondary"
                      disabled={saving}
                      onClick={() => choose("return-to-draft")}
                    >
                      Return OVR to Draft
                    </button>
                    <button
                      className="btn btn-success"
                      disabled={
                        saving ||
                        detail.batch.submission?.actorId === session.user.id
                      }
                      onClick={() => choose("finalize")}
                    >
                      Finalize OVR
                    </button>
                  </div>
                )}
            </section>
          )}
          {detail.finalization && (
            <section
              className="alert alert-info"
              aria-label="Finalized OVR snapshot"
            >
              <h4>Original finalized roster</h4>
              <p>
                {detail.finalization.snapshot.entries.length} frozen entries,
                finalized by {detail.finalization.snapshot.finalizedByName} at{" "}
                {new Date(
                  detail.finalization.snapshot.finalizedAt,
                ).toLocaleString()}
                .
              </p>
              <p>
                The current source check may change; the finalized snapshot
                remains unchanged.
              </p>
              <details>
                <summary>Frozen roster and evidence</summary>
                <p>Snapshot hash: {detail.finalization.hash}</p>
                <ul>
                  {detail.finalization.snapshot.entries.map((e) => (
                    <li key={e.scholarshipId}>
                      {e.evidence.current.sources.scholarship.humanId} -{" "}
                      {e.evidence.current.sources.scholarship.name}:{" "}
                      {e.evidence.effective.label}
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}
          {detail.finalization && (
            <OvrProcessingPanel
              key={`${detail.batch.id}-${detail.batch.revision}`}
              detail={detail}
              session={session}
              permissions={permissions}
              onSaved={refresh}
            />
          )}
          {detail.finalization && (
            <OvrAmendments
              key={`${detail.batch.id}-${detail.batch.revision}`}
              detail={detail}
              session={session}
              permissions={permissions}
              onSaved={refresh}
            />
          )}
          {!!detail.payments.length && (
            <PaymentCorrections
              key={`${detail.batch.id}-${detail.batch.revision}`}
              detail={detail}
              session={session}
              permissions={permissions}
              onSaved={refresh}
            />
          )}
          {detail.entries.map((entry) => (
            <article
              className="border rounded p-3 my-3"
              key={entry.scholarshipId}
            >
              <h4>
                {entry.evidence.current.sources.scholarship.humanId} —{" "}
                {entry.evidence.current.sources.scholarship.name}
              </h4>
              <p>
                Added at revision {entry.addedRevision}:{" "}
                {entry.evidence.effective.label}.
              </p>
              <p>
                Current assessment:{" "}
                {
                  detail.validation.entries.find(
                    (r) => r.scholarshipId === entry.scholarshipId,
                  )?.evidence.effective.label
                }
              </p>
              {detail.canEdit && (
                <button
                  className="btn btn-outline-danger"
                  disabled={saving}
                  onClick={() => choose("remove", entry.scholarshipId)}
                >
                  Remove {entry.evidence.current.sources.scholarship.humanId}{" "}
                  from draft
                </button>
              )}
            </article>
          ))}
          <details>
            <summary>OVR draft history</summary>
            {detail.history.map((h) => (
              <p key={h.revision}>
                Revision {h.revision}: {h.action}, {h.actorName},{" "}
                {new Date(h.recordedAt).toLocaleString()}. {h.reason} (
                {h.reference})
                {h.entry && ` — ${h.entry.humanId}: ${h.entry.name}`}
                {h.validation
                  ? ` — Recorded validation: ${h.validation.valid ? "passed" : "issues found"}`
                  : ""}
              </p>
            ))}
          </details>
        </section>
      )}
      {action && (
        <form
          onSubmit={submit}
          className="border-top mt-3 pt-3"
          aria-label="OVR draft command"
          key={`${action}-${removeId}`}
        >
          <fieldset
            disabled={saving || !list || (action !== "create" && !detail)}
          >
            <legend>
              {action === "create"
                ? "Create OVR draft"
                : action === "add"
                  ? "Add OVR entry"
                  : action === "remove"
                    ? "Remove OVR entry"
                    : action === "submit-review"
                      ? "Submit OVR for review"
                      : action === "return-to-draft"
                        ? "Return OVR to Draft"
                        : action === "finalize"
                          ? "Finalize OVR"
                          : "Record draft validation"}
            </legend>
            {action === "create" && (
              <>
                <label className="form-label d-block">
                  OVR batch code
                  <input
                    name="code"
                    className="form-control"
                    required
                    maxLength={60}
                    pattern="[A-Za-z0-9][A-Za-z0-9._\-]*"
                  />
                </label>
                <label className="form-label d-block">
                  OVR batch name
                  <input
                    name="name"
                    className="form-control"
                    required
                    minLength={2}
                    maxLength={160}
                  />
                </label>
              </>
            )}
            {action === "add" && (
              <>
                <label className="form-label d-block">
                  Find scholar by name or ID
                  <input
                    className="form-control"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-outline-secondary mb-2"
                  onClick={() => {
                    setSearch(query);
                    setCandidateOffset(0);
                    setCandidates(null);
                    setReload((n) => n + 1);
                  }}
                >
                  Search OVR candidates
                </button>
                <label className="form-label d-block">
                  Scholarship record
                  <select
                    className="form-select"
                    name="scholarshipId"
                    required
                    defaultValue=""
                    key={`${search}-${candidateOffset}-${reload}`}
                  >
                    <option value="">Select a record</option>
                    {candidates?.items.map((r) => (
                      <option
                        key={r.current.sources.scholarship.id}
                        value={r.current.sources.scholarship.id}
                      >
                        {r.current.sources.scholarship.humanId} —{" "}
                        {r.current.sources.scholarship.name} —{" "}
                        {r.effective.label}
                      </option>
                    ))}
                  </select>
                </label>
                {!candidates ? (
                  <p>Loading candidates...</p>
                ) : (
                  <p>
                    {candidates.total} matching records. Adding always rechecks
                    the OVR rules.
                  </p>
                )}
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={!candidateOffset}
                    onClick={() => {
                      setCandidateOffset((n) => Math.max(0, n - 25));
                      setCandidates(null);
                    }}
                  >
                    Previous candidates
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={
                      !candidates || candidateOffset + 25 >= candidates.total
                    }
                    onClick={() => {
                      setCandidateOffset((n) => n + 25);
                      setCandidates(null);
                    }}
                  >
                    Next candidates
                  </button>
                </div>
              </>
            )}
            <RoutineEvidence routine={action !== "return-to-draft"}><label className="form-label d-block">
              OVR action reason
              <input
                name="reason"
                className="form-control"
                required
                minLength={5}
                maxLength={500}
              />
            </label>
            <label className="form-label d-block">
              OVR action reference
              <input
                name="reference"
                className="form-control"
                required
                minLength={3}
                maxLength={300}
              />
            </label></RoutineEvidence>
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn configuration-primary">
                {action === "finalize"
                  ? "Confirm OVR finalization"
                  : "Confirm OVR action"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setAction(null)}
              >
                Dismiss OVR form
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
