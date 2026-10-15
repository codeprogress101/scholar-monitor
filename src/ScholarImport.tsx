import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ImportPreview, ImportResult, ReferenceMapping } from "../server/imports/model";
import { MAX_IMPORT_ROWS } from "../server/imports/model";
import type { Access } from "../server/authorization/policy";
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
  const [mappings, setMappings] = useState<ReferenceMapping[]>([]);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [alreadyApproved, setAlreadyApproved] = useState(false);
  const [approvalReference, setApprovalReference] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const stageKey = useRef(crypto.randomUUID()),
    confirmKey = useRef(crypto.randomUUID()),
    inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    request<Access>("me/permissions", { signal: controller.signal }).then(a => setCanApprove(["scholarship.status.approve", "continuing.approve"].every(code => a.permissions.some(p => p.code === code)))).catch(() => {});
    return () => controller.abort();
  }, []);
  function invalidatePreview() {
    setPreview(null); setConfirmed(false); stageKey.current = crypto.randomUUID();
  }
  useEffect(() => {
    const id = new URLSearchParams(window.location.hash.split("?")[1]).get("importJob");
    if (!id) return;
    const controller = new AbortController();
    request<ImportPreview>(`imports/${id}`, { signal: controller.signal }).then(setPreview).catch(e => { if (!controller.signal.aborted) setError(message(e)); });
    return () => controller.abort();
  }, []);
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
        body: { fileName: file.name, base64, mappings, ...(alreadyApproved ? { approvedSelection: { reference: approvalReference, effectiveOn: approvalDate } } : {}) },
        csrf: session.csrfToken,
        key: stageKey.current,
        signal: AbortSignal.timeout(180000),
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
          signal: AbortSignal.timeout(180000),
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
        · Up to {MAX_IMPORT_ROWS.toLocaleString("en-US")} rows / 2 MB.
      </p>
      <details className="mb-3">
        <summary>How to fill in the template</summary>
        <p>Use Last name, First name, Middle Name, Name Extension, School, Year Level, Status and Course. Status accepts New, Continuing or Old. Middle name, extension and course may be blank.</p>
        <p>The working academic year is chosen automatically. Type school and course names directly; existing names or codes are reused. New names are saved when you confirm. Missing courses can be completed later; approval and payroll still require complete academic details.</p>
        <p>Use one worksheet with up to {MAX_IMPORT_ROWS.toLocaleString("en-US")} scholars. The older template is also accepted. Resolve duplicate names before confirmation; no names are merged automatically.</p>
      </details>
      <form onSubmit={stage} className="d-flex flex-wrap align-items-end gap-3">
        <fieldset className="w-100" disabled={busy}>
          <legend className="fs-6">Scholarship selection</legend>
          <label className="form-check">
            <input className="form-check-input" type="checkbox" disabled={!canApprove} checked={alreadyApproved} onChange={e => { setAlreadyApproved(e.target.checked); invalidatePreview(); }} />
            This list is already approved for the working academic year — create Selected records
          </label>
          <p>{canApprove ? "Confirming this option records your Coordinator approval for every imported scholar. Complete academic details are required. Masterlist publication and semester payment requirements remain separate." : "A Coordinator can use this option to confirm an already-approved list once, instead of selecting each scholar individually."}</p>
          {alreadyApproved && <div className="d-flex flex-wrap gap-3">
            <label>Approval/list reference<input className="form-control" required minLength={3} maxLength={200} value={approvalReference} onChange={e => { setApprovalReference(e.target.value); invalidatePreview(); }} /></label>
            <label>Approval effective date<input className="form-control" type="date" required value={approvalDate} onChange={e => { setApprovalDate(e.target.value); invalidatePreview(); }} /></label>
          </div>}
        </fieldset>
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
              setMappings([]);
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
          {preview.workingYear && <p><strong>Working academic year: {preview.workingYear}</strong></p>}
          {preview.rows[0]?.approvedSelection && <p className="alert alert-info">Already-approved list: confirmation will mark {preview.rows.length} scholars Selected for {preview.workingYear}. Reference: {preview.rows[0].approvedSelection.reference}; effective date: {preview.rows[0].approvedSelection.effectiveOn}. This does not mark anyone Paid or publish a masterlist.</p>}
          {!!preview.unresolved?.length && <section className="card p-3"><h4>Match references once</h4><p>Choose existing references, then click Review import again. Resolve ambiguous names by choosing the correct existing entry. New school/course names do not require Administrator setup.</p>{preview.unresolved.map(r => <label key={`${r.kind}:${r.supplied}`} className="form-label">{r.kind}: {r.supplied}<select className="form-select" value={mappings.find(m => m.kind === r.kind && m.supplied === r.supplied)?.id ?? ""} onChange={e => { setConfirmed(false); setMappings(old => [...old.filter(m => m.kind !== r.kind || m.supplied !== r.supplied), ...e.target.value ? [{ kind: r.kind, supplied: r.supplied, id: e.target.value }] : []]); }}><option value="">Choose reference</option>{r.choices.map(c => <option value={c.id} key={c.id}>{c.name} ({c.code})</option>)}</select></label>)}</section>}

          <p>
            {preview.rows.length} rows.{" "}
            {preview.ready
              ? "All rows passed validation."
              : "Fix all errors and resolve duplicate warnings before confirmation."}
          </p>
          {!preview.result && <section aria-label="Confirm import" className="mb-3">
            {!preview.ready && <div role="status" className="alert alert-warning">
              <strong>Import cannot be saved yet.</strong>{" "}
              {preview.rows.filter(r => r.errors.length).length} rows have errors;{" "}
              {preview.rows.filter(r => r.warnings.length).length} rows have duplicate warnings. A row may have both.
              <p className="mb-0">Correct the flagged information in Excel and click Review import again. Resolve duplicate warnings in Scholar registry. All rows must pass before this import can be confirmed.</p>
            </div>}
            <label className="form-check my-2">
              <input className="form-check-input" type="checkbox" checked={issuesOnly} onChange={e => setIssuesOnly(e.target.checked)} />
              Show only rows with errors or duplicate warnings
            </label>
            <label className="form-check my-2">
              <input className="form-check-input" type="checkbox" checked={confirmed} disabled={busy || !preview.ready} onChange={e => setConfirmed(e.target.checked)} />
              I reviewed every row and want to save this import.
            </label>
            <button className="btn configuration-primary" disabled={busy || !preview.ready || !confirmed} onClick={() => void confirm()}>
              Confirm import ({preview.rows.length} rows)
            </button>
          </section>}
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
                {preview.rows.filter(r => !issuesOnly || !!preview.result || r.errors.length || r.warnings.length).map((r) => (
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
                      {r.notices?.map(n => <p key={n}>{n}</p>)}
                      {r.intake && <small>{r.approvedSelection ? "Selected after Coordinator confirms this import" : r.intake.classification === "new" ? "New - validation required" : "Continuing - roster review required"}</small>}
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
              {!!preview.result.selectedCount && <p>{preview.result.selectedCount} annual records are Selected. Prepare and publish the masterlist separately.</p>}
              {preview.result.continuingRosterId && <p>{preview.result.selectedCount ? "Continuing baseline roster accepted with this Coordinator confirmation." : "Continuing roster is pending Coordinator review in Scholar registry / Continuing roster review."}</p>}
              <ul>
                {preview.result.items.map((r) => (
                  <li key={r.row}>
                    Row {r.row}: {r.scholarId}
                    {r.academicRecordId ? " — academic record saved" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
