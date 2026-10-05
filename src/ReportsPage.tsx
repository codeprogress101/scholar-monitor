import { useEffect, useState } from "react";
import { ApiError } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { Access } from "../server/authorization/policy";
import type { PayoutCycle } from "../server/payouts/model";
import {
  REPORTS,
  type ReportKind,
  type OperationalReport,
} from "../server/reports/model";

export default function ReportsPage() {
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [cycles, setCycles] = useState<PayoutCycle[]>([]);
  const [cycleId, setCycleId] = useState(
    () =>
      new URLSearchParams(window.location.hash.split("?")[1]).get("cycleId") ??
      "",
  );
  const [kind, setKind] = useState<ReportKind>("scholars");
  const [offset, setOffset] = useState(0),
    [reload, setReload] = useState(0);
  const [data, setData] = useState<OperationalReport | null>(null);
  const [error, setError] = useState("");
  const failure = (e: unknown) =>
    e instanceof ApiError ? e.message : "Could not load reports. Please retry.";
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    (async () => {
      const access = await request<Access>("me/permissions", {
        signal: controller.signal,
      });
      const codes = access.permissions.map((p) => p.code);
      if (!active) return;
      setPermissions(codes);
      const allowed = (Object.keys(REPORTS) as ReportKind[]).filter((k) =>
        codes.includes(REPORTS[k].permission),
      );
      if (!allowed.length) return;
      const requested = new URLSearchParams(
        window.location.hash.split("?")[1],
      ).get("kind") as ReportKind | null;
      setKind(
        requested && allowed.includes(requested) ? requested : allowed[0],
      );
      const all: PayoutCycle[] = [];
      for (let start = 0; ;) {
        const page = await request<{ items: PayoutCycle[]; total: number }>(
          `payout-cycles?limit=100&offset=${start}`,
          { signal: controller.signal },
        );
        all.push(...page.items);
        start += page.items.length;
        if (start >= page.total || !page.items.length) break;
      }
      if (active) {
        setCycles(all);
        const open = all.filter(
          (c) => c.state === "open" && !c.periodUnavailable,
        );
        if (open.length === 1) setCycleId((current) => current || open[0].id);
      }
    })().catch((e) => {
      if (active) setError(failure(e));
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  useEffect(() => {
    if (!cycleId) return;
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => controller.abort(), 60000);
    request<OperationalReport>(
      `reports/operational?kind=${kind}&cycleId=${cycleId}&offset=${offset}&limit=25`,
      { signal: controller.signal },
    )
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(failure(e));
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [cycleId, kind, offset, reload]);
  const reset = () => {
    setData(null);
    setError("");
    setOffset(0);
  };
  const allowed = (Object.keys(REPORTS) as ReportKind[]).filter((k) =>
    permissions?.includes(REPORTS[k].permission),
  );
  return (
    <section aria-labelledby="reports-title">
      <header className="mb-4">
        <p className="eyebrow">Scholarship operations</p>
        <h1 id="reports-title">Reports</h1>
        <p>Choose a cycle and the information you need.</p>
      </header>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {permissions === null ? (
        <p>Loading access...</p>
      ) : !allowed.length ? (
        <p className="alert alert-info">
          Operational reports require scholarship access. Your account manages
          system administration.
        </p>
      ) : (
        <>
          <div className="card p-3 mb-3">
            <div className="row g-3 align-items-end">
              <div className="col-md-5">
                <label htmlFor="report-cycle" className="form-label">
                  Payout cycle
                </label>
                <select
                  id="report-cycle"
                  className="form-select"
                  value={cycleId}
                  onChange={(e) => {
                    reset();
                    setCycleId(e.target.value);
                  }}
                >
                  <option value="">Choose a cycle</option>
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-5">
                <label htmlFor="report-kind" className="form-label">
                  Report
                </label>
                <select
                  id="report-kind"
                  className="form-select"
                  value={kind}
                  onChange={(e) => {
                    reset();
                    setKind(e.target.value as ReportKind);
                  }}
                >
                  {allowed.map((k) => (
                    <option key={k} value={k}>
                      {REPORTS[k].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <button
                  className="btn btn-outline-secondary"
                  disabled={!cycleId}
                  onClick={() => {
                    reset();
                    setReload((n) => n + 1);
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
          {!cycleId ? (
            <p>
              Select a payout cycle to view its reports, including historical
              cycles.
            </p>
          ) : !data ? (
            !error && <p role="status">Preparing report...</p>
          ) : (
            <article className="card p-3">
              <h2>
                {REPORTS[data.kind].label} — {data.cycle.code}
              </h2>
              <p>{data.scope}</p>
              <p>
                <strong>{data.total} rows</strong> · Generated{" "}
                {new Date(data.generatedAt).toLocaleString()}
              </p>
              <div
                className="d-flex flex-wrap gap-2 mb-3"
                aria-label="Report counts"
              >
                {Object.entries(data.counts).map(([label, count]) => (
                  <span className="badge text-bg-light border" key={label}>
                    {label.replaceAll("_", " ")}: {count}
                  </span>
                ))}
              </div>
              {!data.total ? (
                <p>No matching records in this scope.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ minWidth: 720 }}>
                    <caption>
                      {REPORTS[data.kind].label}; rows {data.offset + 1}–
                      {Math.min(data.offset + data.limit, data.total)} of{" "}
                      {data.total}
                    </caption>
                    <thead>
                      <tr>
                        {data.columns.map((c) => (
                          <th scope="col" key={c}>
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((row) => (
                        <tr key={row.id}>
                          {row.values.map((value, i) => (
                            <td
                              key={i}
                              style={{
                                overflowWrap: "anywhere",
                                maxWidth: 360,
                                minWidth: 120,
                              }}
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary"
                  disabled={!offset}
                  onClick={() => {
                    setData(null);
                    setError("");
                    setOffset((n) => Math.max(0, n - 25));
                  }}
                >
                  Previous
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={offset + 25 >= data.total}
                  onClick={() => {
                    setData(null);
                    setError("");
                    setOffset((n) => n + 25);
                  }}
                >
                  Next
                </button>
              </div>
              <details className="mt-3">
                <summary>Report details</summary>
                <p className="text-break">
                  Cycle revision {data.cycle.version}. Content fingerprint:{" "}
                  {data.sourceHash}. Refreshing reads current records; this is
                  not an archived report.
                </p>
                <p>Counts cover the whole report, not just this page.</p>
              </details>
            </article>
          )}
        </>
      )}
    </section>
  );
}
