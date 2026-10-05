import { useEffect, useState } from "react";
import { configurationRequest as request } from "./configuration-api";
import { ApiError } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { PayoutCycle } from "../server/payouts/model";
import type { Dashboard } from "../server/dashboard/service";
import { REPORTS } from "../server/reports/model";

export default function DashboardPage() {
  const [cycles, setCycles] = useState<PayoutCycle[]>([]),
    [cycleId, setCycleId] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null),
    [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => c.abort(), 60000);
    (async () => {
      const access = await request<Access>("me/permissions", {
        signal: c.signal,
      });
      const canRead = Object.values(REPORTS).some((r) =>
        access.permissions.some((p) => p.code === r.permission),
      );
      if (!active) return;
      setAllowed(canRead);
      if (!canRead) return;
      const all: PayoutCycle[] = [];
      for (let offset = 0; ;) {
        const result = await request<{ items: PayoutCycle[]; total: number }>(
          `payout-cycles?limit=100&offset=${offset}`,
          { signal: c.signal },
        );
        all.push(...result.items);
        offset += result.items.length;
        if (offset >= result.total || !result.items.length) break;
      }
      if (!active) return;
      setCycles(all);
      const open = all.filter(
        (p) => p.state === "open" && !p.periodUnavailable,
      );
      const selected = cycleId || (open.length === 1 ? open[0].id : "");
      if (!selected) return;
      if (!cycleId) {
        setCycleId(selected);
        return;
      }
      const dashboard = await request<Dashboard>(
        `dashboard?cycleId=${selected}`,
        { signal: c.signal },
      );
      if (active) setData(dashboard);
    })()
      .catch((e) => {
        if (active)
          setError(
            e instanceof ApiError
              ? e.message
              : "Dashboard unavailable. Please refresh.",
          );
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timer);
    };
  }, [cycleId, reload]);
  const refresh = () => {
    setData(null);
    setError("");
    setReload((n) => n + 1);
  };
  return (
    <section aria-labelledby="dashboard-title">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
        <div>
          <p className="eyebrow">Scholarship operations</p>
          <h1 id="dashboard-title">Dashboard</h1>
          <p>See the workload, then open a card to review its records.</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={refresh}>
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      {allowed === false ? (
        <div className="card p-3">
          <h2>System administration</h2>
          <p>Your account manages users, roles and configuration.</p>
          <div className="d-flex gap-3">
            <a href="#access">Manage access</a>
            <a href="#configuration">Configuration</a>
            <a href="#status">System status</a>
          </div>
        </div>
      ) : allowed === null ? (
        !error && <p role="status">Loading dashboard...</p>
      ) : (
        <>
          <div className="card p-3 mb-4">
            <label className="form-label" htmlFor="dashboard-cycle">
              Payout cycle
            </label>
            <select
              id="dashboard-cycle"
              className="form-select"
              value={cycleId}
              onChange={(e) => {
                setData(null);
                setError("");
                setCycleId(e.target.value);
              }}
            >
              <option value="">Choose a cycle</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.yearCode} / {c.semesterCode} / {c.code} ({c.state})
                </option>
              ))}
            </select>
          </div>
          {!cycleId ? (
            <p>
              {cycles.length
                ? "Choose the cycle you want to review. Historical cycles are also available."
                : "No payout cycles are available. Configure a cycle to start using operational metrics."}
            </p>
          ) : !data ? (
            !error && <p role="status">Reading current records...</p>
          ) : (
            <>
              <p>
                <strong>
                  {data.context.yearCode} · {data.context.semesterCode} ·{" "}
                  {data.context.cycleCode}
                </strong>{" "}
                — {data.context.state}. Payout date: {data.context.targetDate}.
              </p>
              <p className="text-muted">
                Updated {new Date(data.generatedAt).toLocaleString()}. Refresh
                to include later changes.
              </p>
              <div className="row g-3">
                {data.cards.map((card) => (
                  <div className="col-md-6 col-xl-4" key={card.kind}>
                    <a
                      className="card h-100 p-3 text-decoration-none text-reset"
                      href={`#reports?cycleId=${data.context.cycleId}&kind=${card.kind}`}
                      aria-label={`Open ${card.label}: ${card.total} rows`}
                    >
                      <h2 className="h5">{card.label}</h2>
                      <strong className="display-6">{card.total}</strong>
                      <p>
                        {card.kind === "missing" || card.kind === "verification"
                          ? "documents"
                          : card.kind === "ovr"
                            ? "batches"
                            : card.kind === "masterlists"
                              ? "versions"
                              : card.kind === "payments"
                                ? "finalized roster entries"
                                : "annual scholar records"}
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        {Object.entries(card.counts).map(([key, value]) => (
                          <span
                            className="badge text-bg-light border"
                            key={key}
                          >
                            {key.replaceAll("_", " ")}: {value}
                          </span>
                        ))}
                      </div>
                      <span className="mt-3">View records →</span>
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
