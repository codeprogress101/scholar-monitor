import { useEffect, useState } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { EligibilityView } from "../server/eligibility/model";
import EligibilityPanel, { EligibilityResult } from "./EligibilityPanel";
export default function EligibilityReport({
  cycleId,
  session,
  canCalculate,
  permissions,
}: {
  cycleId: string;
  session: Session;
  canCalculate: boolean;
  permissions: string[];
}) {
  const [data, setData] = useState<{
      items: Pick<
        EligibilityView,
        "current" | "latest" | "stale" | "effective"
      >[];
      total: number;
      cycle: { code: string };
    } | null>(null),
    [offset, setOffset] = useState(0),
    [reload, setReload] = useState(0),
    [selected, setSelected] = useState<string | null>(() => new URLSearchParams(window.location.hash.split("?")[1]).get("annual")),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    request<{
      items: Pick<
        EligibilityView,
        "current" | "latest" | "stale" | "effective"
      >[];
      total: number;
      cycle: { code: string };
    }>(`payout-cycles/${cycleId}/eligibility?limit=25&offset=${offset}`, {
      signal: c.signal,
    })
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof ApiError
              ? e.message
              : "Could not load the eligibility report.",
          );
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [cycleId, offset, reload]);
  function refresh() {
    setData(null);
    setError("");
    setSelected(null);
    setReload((n) => n + 1);
  }
  return (
    <section className="card p-3 my-3" aria-label="Cycle eligibility report">
      <div className="d-flex justify-content-between gap-2 flex-wrap">
        <h2>Cycle eligibility report{data ? `: ${data.cycle.code}` : ""}</h2>
        <button className="btn btn-outline-secondary" onClick={refresh}>
          Refresh eligibility report
        </button>
      </div>
      <p>
        All annual scholarship records for this cycle's academic year. Results
        use the same current server assessment as individual calculations.
      </p>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p>Loading report...</p>
      ) : !selected ? (
        <>
          <p>{data.total} annual records</p>
          {data.items.map((row) => (
            <article
              className="border-top py-3"
              key={row.current.sources.scholarship.id}
            >
              <h3>
                {row.current.sources.scholarship.humanId} -{" "}
                {row.current.sources.scholarship.name}
              </h3>
              <p>
                <strong>{row.effective.label}</strong>
              </p>
              {row.effective.overrideStale && (
                <p className="text-danger">
                  Approved override is stale and is not applied.
                </p>
              )}
              <details><summary>Eligibility checks</summary><EligibilityResult assessment={row.current} />
              <p>
                {row.latest
                  ? `Saved revision ${row.latest.revision}: ${row.stale ? "stale" : "matches sources"}`
                  : "Not yet saved"}
              </p></details>
              <button
                className="btn btn-outline-secondary"
                onClick={() => setSelected(row.current.sources.scholarship.id)}
              >
                Review eligibility {row.current.sources.scholarship.humanId}
              </button>
            </article>
          ))}
          <div className="d-flex gap-3">
            <button
              className="btn btn-outline-secondary"
              disabled={!offset}
              onClick={() => {
                setOffset((n) => Math.max(0, n - 25));
                refresh();
              }}
            >
              Previous records
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={offset + 25 >= data.total}
              onClick={() => {
                setOffset((n) => n + 25);
                refresh();
              }}
            >
              Next records
            </button>
          </div>
        </>
      ) : null}
      {selected && <button type="button" className="btn btn-outline-secondary mb-3" onClick={() => setSelected(null)}>Back to eligibility list</button>}
      {selected && (
        <EligibilityPanel
          key={selected}
          id={selected}
          cycleId={cycleId}
          session={session}
          canCalculate={canCalculate}
          permissions={permissions}
          onSaved={() => {
            setData(null);
            setError("");
            setReload((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}
