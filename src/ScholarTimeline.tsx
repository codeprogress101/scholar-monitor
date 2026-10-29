import { useEffect, useState } from "react";
import type { ScholarProfile } from "../server/scholars/profile-model";
import { ApiError } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
export default function ScholarTimeline({ scholarId }: { scholarId: string }) {
  const [data, setData] = useState<ScholarProfile | null>(null),
    [error, setError] = useState(""),
    [offset, setOffset] = useState(0),
    [category, setCategory] = useState("all"),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    request<ScholarProfile>(
      `scholars/${scholarId}/profile?offset=${offset}&limit=25&category=${category}`,
      { signal: c.signal },
    )
      .then((r) => {
        if (active) {
          setData(r);
          setError("");
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof ApiError
              ? e.message
              : "Could not load the profile timeline. Refresh to retry.",
          );
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [scholarId, offset, category, reload]);
  return (
    <section
      className="border rounded p-3 my-3"
      aria-label="Scholar profile timeline"
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="d-flex flex-wrap gap-2 justify-content-between">
        <h3>Profile and timeline</h3>
        <button
          className="btn btn-outline-secondary"
          onClick={() => {
            setData(null);
            setReload((n) => n + 1);
          }}
        >
          Refresh profile timeline
        </button>
      </div>
      <details className="u1-context-help"><summary>History scope</summary><p>Current records and historical versions remain separate. Make authorized changes in their workflow tabs.</p></details>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">
          {error ? "Timeline unavailable." : "Loading profile timeline..."}
        </p>
      ) : (
        <>
          <p>
            As of {new Date(data.asOf).toLocaleString()}.{" "}
            {data.totals.scholarshipYears} scholarship years;{" "}
            {data.totals.requirements} requirement instances;{" "}
            {data.totals.payments} payment outcomes. Effective paid total:{" "}
            {data.totals.paidTotal}; not paid: {data.totals.notPaid}.
          </p>
          <h4>Records by area</h4>
          {[
            "scholarship",
            "academic",
            "masterlist",
            "requirements",
            "payout",
          ].map((area) => (
            <details key={area} className="my-2">
              <summary>
                {area} ({data.items.filter((i) => i.category === area).length})
              </summary>
              {data.items
                .filter((i) => i.category === area)
                .map((i) => (
                  <article className="border-top p-2" key={`${area}-${i.id}`}>
                    <strong>{i.label}</strong>
                    <p>
                      {i.current ? "Current / effective" : "Historical version"}{" "}
                      · version {i.version}
                      {i.at ? ` · ${i.at.slice(0, 10)}` : ""}
                    </p>
                    <p>{i.detail}</p>
                  </article>
                ))}
            </details>
          ))}
          <h4 className="mt-3">Historical timeline</h4>
          <p>
            Audit visibility:{" "}
            {data.auditScope === "all"
              ? "all permitted scholar-specific audit entries"
              : data.auditScope === "own"
                ? "your own scholar-specific audit entries"
                : "not permitted"}
            . Shared batch audit payloads are excluded.
          </p>
          <label className="form-label d-block">
            Timeline category
            <select
              className="form-select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setOffset(0);
                setData(null);
              }}
            >
              {[
                "all",
                "academic",
                "scholarship",
                "status",
                "requirements",
                "masterlist",
                "payout",
                "audit",
              ].map((c) => (
                <option value={c} key={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <p>{data.timeline.total} matching historical events.</p>
          <ol className="ps-3">
            {data.timeline.items.map((e) => (
              <li key={e.id} className="mb-3">
                <strong>{e.label}</strong>
                <p>
                  {new Date(e.at).toLocaleString()} · {e.actor}
                  {e.version !== null
                    ? ` · recorded version ${e.version}`
                    : ""}{" "}
                  · {e.category}
                </p>
                <p>{e.detail}</p>
              </li>
            ))}
          </ol>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              disabled={!offset}
              onClick={() => {
                setOffset((n) => Math.max(0, n - 25));
                setData(null);
              }}
            >
              Previous timeline events
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={offset + 25 >= data.timeline.total}
              onClick={() => {
                setOffset((n) => n + 25);
                setData(null);
              }}
            >
              Next timeline events
            </button>
          </div>
        </>
      )}
    </section>
  );
}
