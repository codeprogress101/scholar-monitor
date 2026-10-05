import { useRef, useState, type FormEvent } from "react";
import type { ImportPreview, ImportResult } from "../server/imports/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
const message = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Could not confirm the result. Retry safely.";
export default function ScholarImport({
  session,
  onImported,
}: {
  session: Session;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const stageKey = useRef(crypto.randomUUID()),
    confirmKey = useRef(crypto.randomUUID()),
    inFlight = useRef(false);
  async function stage(e: FormEvent) {
    e.preventDefault();
    if (!file || inFlight.current) return;
    if (file.size > 2 * 1024 * 1024 || !/\.xlsx$/i.test(file.name)) {
      setError("Choose an .xlsx workbook no larger than 2 MB.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setConfirmed(false);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("File could not be read"));
        reader.readAsDataURL(file);
      });
      const result = await request<ImportPreview>("imports/stage", {
        body: { fileName: file.name, base64 },
        csrf: session.csrfToken,
        key: stageKey.current,
      });
      setPreview(result);
      stageKey.current = crypto.randomUUID();
      confirmKey.current = crypto.randomUUID();
    } catch (e) {
      setError(message(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function confirm() {
    if (!preview || !confirmed || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await request<ImportResult>(
        `imports/${preview.id}/confirm`,
        {
          body: { hash: preview.hash, confirm: true },
          csrf: session.csrfToken,
          key: confirmKey.current,
        },
      );
      setPreview({ ...preview, result });
      onImported();
    } catch (e) {
      setError(message(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="card p-3 my-3" aria-label="Excel scholar import">
      <h2>Import scholars from Excel</h2>
      <p>
        Upload, review, then confirm. Nothing enters the scholar registry until
        confirmation.
      </p>
      <p>
        <a href="/api/v1/imports/template" download>
          Download Excel template
        </a>{" "}
        · Up to 200 rows / 2 MB.
      </p>
      <details className="mb-3">
        <summary>How to fill in the template</summary>
        <p>
          New scholars: enter firstName, lastName and academicYearCode. Leave
          scholarId blank; the system assigns it. Other personal fields are
          optional. Use YYYY-MM-DD for birth dates and text format for phone
          numbers.
        </p>
        <p>
          To include academic placement, enter schoolCode, courseCode and
          yearLevel together. For an existing scholar, enter scholarId,
          academicYearCode and placement fields only. Existing personal
          information and academic records cannot be overwritten.
        </p>
        <p>
          Use codes from Configuration. Keep one sheet named Scholars and the
          original headings. Formulas and hyperlinks are not supported. Resolve
          duplicate warnings in the registry before uploading again. Import does
          not approve, activate or pay scholars.
        </p>
      </details>
      <form onSubmit={stage} className="d-flex flex-wrap align-items-end gap-3">
        <label className="form-label flex-grow-1">
          Excel workbook
          <input
            className="form-control"
            type="file"
            accept=".xlsx"
            required
            disabled={busy}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setError("");
              setConfirmed(false);
              stageKey.current = crypto.randomUUID();
            }}
          />
        </label>
        <button
          className="btn configuration-primary mb-2"
          disabled={busy || !file}
        >
          {busy ? "Working..." : "Review import"}
        </button>
      </form>
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}{" "}
          {error.includes("Upload again")
            ? "Click Review import again to create a fresh preview."
            : ""}
        </p>
      )}
      {preview && (
        <>
          <h3>Review: {preview.fileName}</h3>
          <p>
            {preview.rows.length} rows.{" "}
            {preview.ready
              ? "All rows passed validation."
              : "Fix all errors and resolve duplicate warnings before confirmation."}
          </p>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Scholar</th>
                  <th>Action</th>
                  <th>Year / placement</th>
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>
                      {r.existingName ||
                        `${r.cells.lastName}, ${r.cells.firstName}`}
                      <br />
                      {r.cells.scholarId}
                    </td>
                    <td>
                      {r.cells.scholarId
                        ? "Add academic record"
                        : r.academic
                          ? "Create scholar + academic record"
                          : "Create scholar"}
                    </td>
                    <td>
                      {r.cells.academicYearCode}
                      <br />
                      {[
                        r.cells.schoolCode,
                        r.cells.courseCode,
                        r.cells.yearLevel,
                      ]
                        .filter(Boolean)
                        .join(" / ")}
                    </td>
                    <td>
                      {!r.errors.length && !r.warnings.length ? (
                        "Ready"
                      ) : (
                        <ul>
                          {r.errors.map((m, i) => (
                            <li className="text-danger" key={`e${i}`}>
                              {m}
                            </li>
                          ))}
                          {r.warnings.map((m, i) => (
                            <li key={`w${i}`}>{m}</li>
                          ))}
                        </ul>
                      )}
                      <details>
                        <summary>Row details</summary>
                        <dl>
                          {Object.entries(r.cells)
                            .filter(([, value]) => value)
                            .map(([key, value]) => (
                              <div key={key}>
                                <dt>{key}</dt>
                                <dd>{value}</dd>
                              </div>
                            ))}
                        </dl>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.result ? (
            <div role="status" className="alert alert-success">
              <p>Import complete: {preview.result.items.length} rows saved.</p>
              <ul>
                {preview.result.items.map((r) => (
                  <li key={r.row}>
                    Row {r.row}: {r.scholarId}
                    {r.academicRecordId ? " — academic record saved" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            preview.ready && (
              <>
                <label className="form-check my-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={confirmed}
                    disabled={busy}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I reviewed every row and want to save this import.
                </label>
                <button
                  className="btn configuration-primary"
                  disabled={busy || !confirmed}
                  onClick={() => void confirm()}
                >
                  Confirm import ({preview.rows.length} rows)
                </button>
              </>
            )
          )}
        </>
      )}
    </section>
  );
}
