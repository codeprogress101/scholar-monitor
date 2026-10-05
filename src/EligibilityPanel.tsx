import RoutineEvidence from "./RoutineEvidence";
import EligibilityOverrides from "./EligibilityOverrides";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type {
  EligibilityView,
  EligibilityAssessment,
} from "../server/eligibility/model";
const message = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Could not confirm eligibility. Refresh or retry the same calculation safely.";
export function EligibilityResult({
  assessment,
}: {
  assessment: EligibilityAssessment;
}) {
  return (
    <>
      <p
        className={`alert ${assessment.eligible ? "alert-success" : "alert-warning"} py-2`}
      >
        <strong>{assessment.eligible ? "Eligible" : "Not Eligible"}</strong>{" "}
        under normal payout rules.
      </p>
      {!!assessment.reasons.length && (
        <ul>
          {assessment.reasons.map((r, i) => (
            <li key={i}>
              {r.message} <span className="small">({r.code})</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
export default function EligibilityPanel({
  cycleId,
  id,
  session,
  canCalculate,
  onSaved,
  permissions,
}: {
  cycleId: string;
  id: string;
  session: Session;
  canCalculate: boolean;
  onSaved?: () => void;
  permissions: string[];
}) {
  const [data, setData] = useState<EligibilityView | null>(null),
    [reload, setReload] = useState(0),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState("");
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  const path = `payout-cycles/${cycleId}/scholarships/${id}/eligibility`;
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    request<EligibilityView>(path, { signal: c.signal })
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [path, reload]);
  function refresh() {
    setLoading(true);
    setError("");
    setData(null);
    setReload((n) => n + 1);
  }
  async function calculate(e: FormEvent) {
    e.preventDefault();
    if (!data || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    const body = {
        expectedRevision: data.latest?.revision ?? 0,
        expectedSourceHash: data.current.sourceHash,
        reason,
        reference,
      },
      signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    try {
      await request(path + "/calculate", {
        body,
        key: pending.current.key,
        csrf: session.csrfToken,
      });
      pending.current = null;
      setNotice("Eligibility calculation saved with its source versions.");
      setReason("");
      setReference("");
      refresh();
      onSaved?.();
    } catch (e) {
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <section
      className="border rounded p-3 my-3"
      aria-label="Payout eligibility"
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="d-flex justify-content-between gap-2 flex-wrap">
        <h4>Payout eligibility</h4>
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={refresh}
        >
          Refresh eligibility
        </button>
      </div>
      <p>
        Current assessment uses authoritative records. Saving preserves the
        calculation; it does not authorize payment.
      </p>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {loading ? (
        <p>Loading eligibility...</p>
      ) : (
        data && (
          <>
            <p className="alert alert-info">
              <strong>{data.effective.label}</strong>
            </p>
            <EligibilityResult assessment={data.current} />
            <p>
              {data.current.sources.scholarship.humanId} -{" "}
              {data.current.sources.scholarship.name}
              <br />
              Status:{" "}
              {data.current.sources.scholarship.status ?? "not activated"}{" "}
              (revision {data.current.sources.scholarship.statusVersion}).
              Official list:{" "}
              {data.current.sources.official.valid
                ? `published membership, amendment revision ${data.current.sources.official.amendmentRevision}`
                : "membership not established"}
              .
            </p>
            <ul>
              {data.current.sources.requirements.map((r) => (
                <li key={r.definitionVersionId}>
                  {r.code} v{r.policyRevision}:{" "}
                  {r.status?.replaceAll("_", " ") ?? "missing instance"} -{" "}
                  {r.satisfied ? "satisfied" : "unsatisfied"}
                  {!r.allowWaiver ? "; waivers excluded" : ""}
                </li>
              ))}
            </ul>
            <p>
              {!data.latest
                ? "No saved calculation."
                : data.stale
                  ? `Saved revision ${data.latest.revision} is stale. Its sources have changed; review and recalculate.`
                  : `Saved revision ${data.latest.revision} matches current sources.`}
            </p>
            {canCalculate && data.canCalculate ? (
              <form
                onSubmit={calculate}
                aria-label="Save eligibility calculation"
              >
                <fieldset disabled={saving}>
                  <RoutineEvidence ><label className="form-label d-block">
                    Calculation reason
                    <input
                      className="form-control"
                      required
                      minLength={5}
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <label className="form-label d-block">
                    Calculation reference
                    <input
                      className="form-control"
                      required
                      minLength={3}
                      maxLength={300}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </label></RoutineEvidence>
                  <button className="btn configuration-primary">
                    {data.latest
                      ? "Recalculate and save"
                      : "Calculate and save"}
                  </button>
                </fieldset>
              </form>
            ) : (
              <p>
                New saved calculations require an open cycle and available
                academic period.
              </p>
            )}
            <EligibilityOverrides
              view={data}
              path={path}
              session={session}
              permissions={permissions}
              onSaved={() => {
                refresh();
                onSaved?.();
              }}
            />
            {!!data.history.length && (
              <details className="mt-3">
                <summary>
                  Saved eligibility history (latest {data.history.length})
                </summary>
                {data.history.map((s) => (
                  <article key={s.id} className="border-top pt-2 mt-2">
                    <strong>
                      Revision {s.revision} -{" "}
                      {s.eligible ? "Eligible" : "Not Eligible"}
                    </strong>
                    <p>
                      {s.actorName} -{" "}
                      {new Date(s.calculatedAt).toLocaleString()}
                      <br />
                      {s.reason}
                      <br />
                      Reference: {s.reference}
                    </p>
                    <ul>
                      {s.reasons.map((r, i) => (
                        <li key={i}>{r.message}</li>
                      ))}
                    </ul>
                    <div className="small">
                      Cycle revision {s.sources.cycle.version}; status revision{" "}
                      {s.sources.scholarship.statusVersion}; official amendment
                      revision {s.sources.official.amendmentRevision}. Rule
                      version {s.engineVersion}.
                    </div>
                  </article>
                ))}
              </details>
            )}
          </>
        )
      )}
    </section>
  );
}
