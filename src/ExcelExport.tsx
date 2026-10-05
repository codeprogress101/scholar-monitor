import { useRef, useState } from "react";
import { receivingToday } from "./receiving-selection";
import type { Session } from "./auth-api";
export default function ExcelExport({
  session,
  kind,
  academicYearId,
  q = "",
  yearLabel,
}: {
  session: Session;
  kind: "scholars" | "audit";
  academicYearId?: string;
  q?: string;
  yearLabel?: string;
}) {
  const [from, setFrom] = useState(() => receivingToday().slice(0, 8) + "01"),
    [to, setTo] = useState(receivingToday),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const pending = useRef(false);
  async function download() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/exports/${kind}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": session.csrfToken,
        },
        body: JSON.stringify(
          kind === "scholars" ? { academicYearId, q } : { from, to },
        ),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error?.message ?? "Export could not be generated. Try again.",
        );
      }
      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download =
        kind === "scholars" ? "scholar-registry.xlsx" : "audit-metadata.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Excel file generated. This export has been recorded in the audit log.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Export could not be confirmed. Retry to generate a newly audited file.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <details className="card p-3 my-3">
      <summary>
        {kind === "scholars"
          ? "Export registry to Excel"
          : "Export audit metadata"}
      </summary>
      {kind === "scholars" ? (
        <>
          <p className="mt-3">
            Includes Scholar ID, name and registration academic year for all
            matching rows (up to 5,000). Contact details and birth dates are
            excluded.
          </p>
          <p>
            Registration year:{" "}
            {yearLabel ||
              "Select an academic year in the registry filter above."}
            {q ? ` · Search: ${q}` : ""}
          </p>
        </>
      ) : (
        <>
          <p className="mt-3">
            Technical event metadata only: event IDs, types, actions, actor IDs
            and timestamps. Raw details and reasons are excluded. Choose up to
            31 days (10,000 events maximum).
          </p>
          <div className="row g-3 mb-3">
            <label className="col-sm-6">
              From (Manila date)
              <input
                type="date"
                className="form-control"
                value={from}
                max={to}
                disabled={busy}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="col-sm-6">
              Through (Manila date)
              <input
                type="date"
                className="form-control"
                value={to}
                min={from}
                max={receivingToday()}
                disabled={busy}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="alert alert-success">
          {notice}
        </p>
      )}
      <div>
        <button
          className="btn btn-outline-secondary"
          disabled={
            busy || (kind === "scholars" ? !academicYearId : !from || !to)
          }
          onClick={() => void download()}
        >
          {busy ? "Preparing Excel..." : "Download Excel"}
        </button>
      </div>
    </details>
  );
}
